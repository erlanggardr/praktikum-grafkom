import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('C:/Users/erdr5/.gemini/antigravity/brain/e745ecf9-cf47-4136-a321-ea9ff0a819d1/.system_generated/steps/415/output.txt', 'utf8');
const jsonStart = content.indexOf('[');
const jsonEnd = content.lastIndexOf(']') + 1;
const rawData = JSON.parse(content.substring(jsonStart, jsonEnd));

const parsed = rawData.map(d => {
  if (!d.hasPraktikum) {
    return {
      id: d.id,
      meetingTitle: d.meetingTitle || '-',
      meetingSubtitle: d.meetingSubtitle || '-',
      praktikumTitle: '-',
      category: '-',
      hasPraktikum: false,
      desc: '-',
      details: ['-']
    };
  }

  const lines = d.fullText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract praktikum title
  let praktikumTitle = lines[1] || d.meetingTitle;
  if (praktikumTitle.startsWith('Modul Praktikum')) {
    praktikumTitle = lines[1];
  }

  // Extract Deskripsi section
  let desc = '-';
  const descIdx = lines.findIndex(l => l.includes('1. Deskripsi Praktikum') || l.includes('1. Tujuan Praktikum'));
  if (descIdx !== -1 && lines[descIdx + 1]) {
    let descLines = [];
    for (let i = descIdx + 1; i < lines.length && i < descIdx + 6; i++) {
      if (/^\d+\./.test(lines[i]) || lines[i].includes('Capaian') || lines[i].includes('Alur utama')) break;
      descLines.push(lines[i]);
    }
    desc = descLines.join(' ');
  }

  // Extract Capaian / Tujuan points
  let details = [];
  const capIdx = lines.findIndex(l => l.includes('Capaian Praktikum') || l.includes('Tujuan Praktikum'));
  if (capIdx !== -1) {
    for (let i = capIdx + 1; i < lines.length && details.length < 5; i++) {
      if (/^\d+\./.test(lines[i]) && i > capIdx + 2) break;
      if (lines[i].length > 10 && !lines[i].startsWith('Setelah') && !lines[i].startsWith('Mata Kuliah')) {
        details.push(lines[i].replace(/^[-•*]\s*/, ''));
      }
    }
  }

  if (details.length === 0) {
    details = ['-'];
  }

  return {
    id: d.id,
    meetingTitle: d.meetingTitle,
    meetingSubtitle: d.meetingSubtitle,
    praktikumTitle,
    category: d.meetingTitle,
    hasPraktikum: true,
    desc,
    details
  };
});

writeFileSync('scripts/parsed_materi.json', JSON.stringify(parsed, null, 2), 'utf8');
console.log(JSON.stringify(parsed.map(p => ({ id: p.id, title: p.praktikumTitle, has: p.hasPraktikum })), null, 2));
