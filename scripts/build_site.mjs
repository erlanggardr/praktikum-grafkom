import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PRAKTIKUM_DATA = [
  {
    id: 1,
    slug: 'praktikum-1',
    meetingTitle: 'Pengenalan Grafika Komputer',
    title: 'Graphics Playground dengan HTML Canvas 2D',
    category: 'HTML Canvas 2D',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pengenalan proses paling dasar dalam grafika komputer melalui mini aplikasi Graphics Playground menggunakan HTML, JavaScript, dan HTML Canvas 2D untuk membentuk dan memanipulasi primitif 2D, warna, animasi frame, serta interaksi pengguna.',
    details: [
      'Menjelaskan fungsi HTML Canvas sebagai area gambar.',
      'Memahami sistem koordinat 2D pada canvas.',
      'Menggambar bentuk primitif rectangle, line, circle, dan triangle.',
      'Membuat animasi berbasis frame dengan requestAnimationFrame().',
      'Menangani input interaksi pengguna.'
    ]
  },
  {
    id: 2,
    slug: 'praktikum-2',
    meetingTitle: 'WebGL Fundamental',
    title: 'WebGL Fundamental Playground',
    category: 'WebGL Fundamental',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Implementasi pipeline grafis WebGL2 dasar di browser: inisialisasi context, alokasi vertex data dan buffer pada GPU, penulisan Vertex & Fragment Shader, compiling/linking shader, dan rendering primitif triangle dengan animasi loop.',
    details: [
      'Membuat Canvas dan mendapatkan WebGL2 Context.',
      'Menyiapkan vertex data menggunakan Float32Array dan GPU buffer.',
      'Menulis, compile, dan link Vertex Shader serta Fragment Shader.',
      'Menghubungkan buffer dengan shader attribute dan draw call.',
      'Membuat rendering loop dan interaksi mouse/keyboard.'
    ]
  },
  {
    id: 3,
    slug: 'praktikum-3',
    meetingTitle: 'Transformasi & Sistem Koordinat',
    title: 'Interactive Transformation & Coordinate System dengan WebGL',
    category: 'Transformasi & Sistem Koordinat',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Penerapan sistem koordinat lokal vs world dan transformasi geometri (translasi, rotasi, skala) menggunakan matriks transformasi 3×3 yang dikirimkan ke GPU sebagai uniform pada WebGL.',
    details: [
      'Memahami local coordinate, world coordinate, clip, NDC, dan screen space.',
      'Membuat translation matrix, rotation matrix, dan scaling matrix 3×3.',
      'Komposisi perkalian matriks transformasi affine.',
      'Mengirimkan data matriks ke vertex shader melalui uniform.',
      'Membangun Interactive Transformation Playground dengan kontrol interaktif.'
    ]
  },
  {
    id: 4,
    slug: 'praktikum-4',
    meetingTitle: 'Kamera dan Proyeksi 3D',
    title: 'Camera, Projection & 3D dengan WebGL',
    category: 'Kamera & Proyeksi 3D',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Konstruksi pipeline 3D pada WebGL meliputi pembuatan geometri kubus 3D, View Matrix dengan konsep LookAt (kamera, target, up vector), Perspective & Orthographic Projection Matrix, serta aktivasi Depth Test (Z-buffer).',
    details: [
      'Membuat View Matrix dengan konsep lookAt (position, target, up vector).',
      'Mengimplementasikan Perspective Projection dan Orthographic Projection Matrix.',
      'Mengatur Field of View (FOV), Aspect Ratio, Near Plane, dan Far Plane.',
      'Mengaktifkan dan memahami fungsi Depth Testing (Z-buffer).',
      'Membangun Rotating 3D Cube Camera Playground dengan HUD camera.'
    ]
  },
  {
    id: 5,
    slug: 'praktikum-5',
    meetingTitle: 'Lighting, Shading & Texture',
    title: 'Lighting, Shading & Texture pada WebGL',
    category: 'Lighting, Shading & Texture',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pengembangan permukaan objek 3D di WebGL dengan menambahkan data Vektor Normal permukaan, simulasi pencahayaan (Ambient, Diffuse, Specular), Normal Matrix, perbandingan Flat vs Smooth Shading, dan UV Texture Mapping.',
    details: [
      'Menghitung dan menormalkan vektor normal permukaan (face & vertex normal).',
      'Kalkulasi Ambient, Diffuse (Lambertian dot product), dan Specular lighting.',
      'Transformasi vektor normal menggunakan Normal Matrix.',
      'Pemetaan tekstur UV dengan texture sampling di fragment shader.',
      'Perbandingan Flat Shading dan Smooth (Phong) Shading.'
    ]
  },
  {
    id: 6,
    slug: 'praktikum-6',
    meetingTitle: 'Introduction to Three.js',
    title: 'Introduction to Three.js — Mini 3D Scene',
    category: 'Three.js Fundamental',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pembangunan scene grafika 3D terstruktur menggunakan Three.js sebagai abstraction layer di atas WebGL: inisialisasi Scene, PerspectiveCamera, WebGLRenderer, Mesh (Box, Sphere, Plane), Material, Lighting, Shadow, dan Animation Loop responsif.',
    details: [
      'Inisialisasi Three.js Scene, PerspectiveCamera, dan WebGLRenderer.',
      'Membuat geometri BoxGeometry, SphereGeometry, dan PlaneGeometry.',
      'Menerapkan Material, Transformasi (position, rotation, scale), dan Mesh.',
      'Konfigurasi AmbientLight, DirectionalLight, dan kalkulasi bayangan (shadows).',
      'Mengatur requestAnimationFrame loop dengan kalkulasi delta time.'
    ]
  },
  {
    id: 7,
    slug: 'praktikum-7',
    meetingTitle: 'Three.js Interactive 3D',
    title: 'Three.js Interactive 3D Application — Prototype Persiapan UTS',
    category: 'Three.js Interactive 3D',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pengembangan aplikasi 3D interaktif berbasis Three.js: hirarki Scene Graph (Parent-Child & Group), PBR Material (MeshStandardMaterial), loading asset model 3D (GLTF/GLB), AnimationMixer, raycasting interaksi klik/hover objek, dan environment map.',
    details: [
      'Membuat struktur hirarki Scene Graph dengan THREE.Group.',
      'Menerapkan Physically Based Rendering (PBR) dengan roughness & metalness.',
      'Memuat model 3D (GLTF/GLB) secara asinkron menggunakan GLTFLoader.',
      'Memutar animasi karakter 3D menggunakan AnimationMixer.',
      'Implementasi Raycasting untuk deteksi event hover dan click pada objek 3D.'
    ]
  },
  {
    id: 8,
    slug: 'praktikum-8',
    meetingTitle: 'Evaluasi Tengah Semester',
    title: '-',
    category: '-',
    hasPraktikum: false,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: '-',
    details: ['-']
  },
  {
    id: 9,
    slug: 'praktikum-9',
    meetingTitle: 'Blender Fundamental 3D Modeling',
    title: 'Blender Fundamental & 3D Modeling — Hard-Surface Asset',
    category: 'Blender 3D Modeling',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Workflow pemodelan aset 3D hard-surface di Blender: navigasi 3D Viewport, manipulasi primitif, Edit Mode (Extrude, Inset, Loop Cut, Bevel), modifier (Subdivision Surface, Bevel, Mirror), dan cleanup topologi mesh 3D.',
    details: [
      'Navigasi 3D Viewport dan penggunaan shortcut esensial Blender.',
      'Pemodelan polygon hard-surface dengan Extrude, Inset, Loop Cut, dan Bevel.',
      'Penerapan Non-Destructive Modifiers (Bevel, Mirror, Subdivision).',
      'Manajemen topologi dan pembersihan mesh (topology cleanup).',
      'Ekspor aset 3D siap pakai untuk pipeline tekstur dan game engine.'
    ]
  },
  {
    id: 10,
    slug: 'praktikum-10',
    meetingTitle: 'Blender Materials, UV & Texturing',
    title: 'Blender Materials, UV & Texturing',
    category: 'Blender UV & Texturing',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Proses unwrap UV mapping dan pembuatan material PBR di Blender: penentuan Mark Seam, UV Unwrap, packing UV island, evaluasi texel density & distorsi UV, serta pembuatan material PBR menggunakan Principled BSDF dan Shader Editor.',
    details: [
      'Menentukan seam pada struktur model 3D dan melakukan Mark Seam.',
      'Melakukan UV Unwrap dan packing UV island dengan margin yang optimal.',
      'Evaluasi distorsi UV dan texel density menggunakan Checker Texture.',
      'Penggunaan Shader Editor dan Principled BSDF.',
      'Menghubungkan tekstur Base Color, Roughness, Metallic, dan Normal Map.'
    ]
  },
  {
    id: 11,
    slug: 'praktikum-11',
    meetingTitle: 'Blender Lighting, Camera & Rendering',
    title: 'Blender Lighting, Camera & Rendering',
    category: 'Blender Lighting & Rendering',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Penyajian aset 3D melalui pencahayaan dan rendering di Blender: konfigurasi Point, Sun, Spot, dan Area Light, teknik Three-Point Lighting (Key, Fill, Rim), pengaturan kamera & komposisi (Focal Length, DoF), HDRI environment, dan komparasi render engine EEVEE vs Cycles.',
    details: [
      'Konfigurasi 4 jenis lampu (Point, Sun, Spot, Area Light) dan parameternya.',
      'Implementasi teknik pencahayaan studio Three-Point Lighting.',
      'Pengaturan kamera, focal length, depth of field (DoF), dan komposisi visual.',
      'Pencahayaan lingkungan menggunakan HDRI Environment Map.',
      'Perbandingan performa dan karakteristik render engine EEVEE vs Cycles.'
    ]
  },
  {
    id: 12,
    slug: 'praktikum-12',
    meetingTitle: 'Unity URP',
    title: 'Unity 3D & Real-Time Rendering Pipeline — Unity 6+ / URP',
    category: 'Unity URP',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Integrasi aset 3D ke dalam Unity 6+ dengan Universal Render Pipeline (URP): ekspor FBX dari Blender, import aset ke Unity, setup GameObject & Hierarchy, konfigurasi material URP Lit, pembuatan Prefab, dan penyusunan mini scene real-time.',
    details: [
      'Pembuatan project Unity 6+ berbasis Universal Render Pipeline (URP).',
      'Workflow ekspor FBX dari Blender dan import ke Unity Asset Pipeline.',
      'Setup GameObject, Transform Hierarchy, dan komponen Renderer.',
      'Konfigurasi URP Lit Material dan pembuatan Prefab yang modular.',
      'Penyusunan scene real-time dan pengujian di Play Mode.'
    ]
  },
  {
    id: 13,
    slug: 'praktikum-13',
    meetingTitle: 'Unity Lighting & Post-Processing',
    title: 'Unity Lighting, Material & Post Processing — Unity 6+ / URP',
    category: 'Unity Lighting & Post-Processing',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Look development real-time pada Unity 6+ URP: pengaturan hierarchy tata cahaya (Directional, Point, Spot), shadow tuning, Global Volume post-processing (Bloom, Color Grading, Tonemapping, SSAO), dan studi komparasi scene Siang vs Malam.',
    details: [
      'Pengaturan direct lighting, indirect lighting, dan real-time shadows di URP.',
      'Konfigurasi Global Volume dan profile post-processing terintegrasi.',
      'Penerapan efek visual Bloom, Tonemapping, Color Adjustments, dan SSAO.',
      'Studi pencahayaan variasi Bright/Day vs Dark/Night Look.',
      'Tuning material response terhadap environment lighting.'
    ]
  },
  {
    id: 14,
    slug: 'praktikum-14',
    meetingTitle: 'Unity Shader Graph',
    title: 'Unity Shader Graph — Custom Surface Behavior',
    category: 'Unity Shader Graph',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pembuatan shader visual kustom tanpa coding menggunakan Unity Shader Graph di URP: implementasi Emission Pulse Shader, Dissolve Shader dengan Emissive Edge, Animated Surface Shader, dan manipulasi vertex wave.',
    details: [
      'Pembuatan node-based visual shader dengan URP Lit Shader Graph.',
      'Penggunaan Blackboard properties untuk parameterisasi material.',
      'Implementasi Emission Pulse dan Animated Texture UV panning.',
      'Pembuatan efek Dissolve dengan procedural noise dan emissive edge glow.',
      'Pemrosesan Vertex Stage untuk animasi gelombang permukaan (vertex wave).'
    ]
  },
  {
    id: 15,
    slug: 'praktikum-15',
    meetingTitle: 'VFX, Particle & Optimization',
    title: 'VFX, Particle & Graphics Optimization — Unity 6+ / URP',
    category: 'Unity VFX & Optimization',
    hasPraktikum: true,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: 'Pembuatan efek visual menggunakan Unity Particle System yang diintegrasikan dengan Shader Graph, disertai teknik profiling dan optimasi grafika real-time (Rendering Statistics, GPU Instancing, LOD Group, Occlusion Culling, Mipmapping).',
    details: [
      'Pembuatan efek partikel Burst VFX dan Ambient VFX dengan Particle System.',
      'Integrasi custom material dan shader graph ke dalam sistem partikel.',
      'Analisis performa real-time menggunakan Unity Profiler dan Render Stats.',
      'Penerapan optimasi GPU Instancing, Texture Mipmapping, dan LOD Group.',
      'Pengaturan Occlusion Culling untuk efisiensi render pipeline.'
    ]
  },
  {
    id: 16,
    slug: 'praktikum-16',
    meetingTitle: 'UAS / Final Project',
    title: '-',
    category: '-',
    hasPraktikum: false,
    status: 'progress',
    statusLabel: 'On Progress',
    desc: '-',
    details: ['-']
  }
];

const ROOT_DIR = process.cwd();

function renderQuickSelectOptions(currentSlug = '') {
  return [
    `<option value="${currentSlug ? '../' : './'}">-- Pilih Praktikum --</option>`,
    ...PRAKTIKUM_DATA.map(p => {
      const selected = p.slug === currentSlug ? ' selected' : '';
      const href = currentSlug ? `../${p.slug}/` : `./${p.slug}/`;
      const label = p.hasPraktikum ? `Praktikum ${p.id}: ${p.title}` : `Praktikum ${p.id}: -`;
      return `<option value="${href}"${selected}>${label}</option>`;
    })
  ].join('\n                ');
}

function renderTeamBanner() {
  return `
      <!-- Team Metadata Banner -->
      <section class="team-banner" aria-label="Informasi Kelompok">
        <div class="team-banner-header">
          <span class="team-tag">Kelompok YOLO</span>
        </div>
        <div class="team-members-grid">
          <div class="member-card">
            <div class="member-info">
              <span class="member-name">JALU CAHYO SENODIPUTRO</span>
              <span class="member-nrp">NRP 5025241155</span>
            </div>
          </div>
          <div class="member-card">
            <div class="member-info">
              <span class="member-name">ERLANGGA RIZQI DWI RASWANTO</span>
              <span class="member-nrp">NRP 5025241179</span>
            </div>
          </div>
        </div>
      </section>`;
}

function renderSiteFooter(isSubPage = false) {
  const homeLink = isSubPage ? `<a href="../" title="Kembali ke Halaman Utama">Direktori Praktikum</a>` : '';
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-info">
        <span class="footer-team">Kelompok YOLO &bull; Grafika Komputer</span>
        <span>Jalu Cahyo Senodiputro (5025241155) &bull; Erlangga Rizqi Dwi Raswanto (5025241179)</span>
      </div>
      <div class="footer-links">
        ${homeLink}
        <a href="https://github.com/erlanggardr/praktikum-grafkom" target="_blank" rel="noopener noreferrer">GitHub Repository &rarr;</a>
      </div>
    </div>
  </footer>`;
}

// 1. Generate index.html (Dashboard)
function generateIndexHtml() {
  const cardsHtml = PRAKTIKUM_DATA.map(p => `
        <article class="module-card" data-status="${p.status}">
          <div>
            <div class="module-card-top">
              <span class="module-number">Praktikum ${p.id}</span>
              <span class="status-badge ${p.status}">${p.statusLabel}</span>
            </div>
            <h3 class="module-title">${p.title}</h3>
            <p class="module-desc">${p.desc}</p>
          </div>
          <div class="module-footer">
            <span>${p.category}</span>
            <a href="./${p.slug}/" class="module-link-action" aria-label="Buka Praktikum ${p.id}">
              Buka Modul &rarr;
            </a>
          </div>
        </article>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Praktikum Grafika Komputer Kelompok YOLO</title>
  <meta name="description" content="Kompilasi Tugas Praktikum Grafika Komputer 1-16 oleh Kelompok YOLO (Jalu Cahyo Senodiputro & Erlangga Rizqi Dwi Raswanto).">
  <link rel="stylesheet" href="./assets/css/style.css">
</head>
<body>
  <!-- Global Navigation Header -->
  <header class="site-header">
    <div class="container header-inner">
      <div class="brand-group">
        <a href="./" class="brand-title" id="nav-home-link">
          <span>Praktikum Grafika Komputer Kelompok YOLO</span>
        </a>
      </div>
      <nav class="header-nav" aria-label="Navigasi Praktikum">
        <select id="quick-jump-select" class="nav-select" aria-label="Pilih Praktikum Cepat">
          ${renderQuickSelectOptions()}
        </select>
        <button id="theme-toggle" class="btn-icon" title="Toggle Tema (Dark/Light)" aria-label="Toggle Tema">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </nav>
    </div>
  </header>

  <main class="container">
    ${renderTeamBanner()}

    <!-- Hero Introduction -->
    <section class="hero-section">
      <h1 class="hero-title">Daftar Modul Praktikum (1 - 16)</h1>
      <p class="hero-desc">
        Repositori resmi penugasan mata kuliah Grafika Komputer. Pilih modul praktikum di bawah untuk membuka viewport interaktif, melihat demonstrasi kanvas grafika, dan meninjau implementasi kode.
      </p>
    </section>

    <!-- Filter & Search Bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="finished">Finished</button>
        <button class="filter-btn" data-filter="progress">On Progress</button>
      </div>
      <input type="search" id="module-search" class="search-input" placeholder="Cari praktikum atau topik..." aria-label="Cari Praktikum">
    </div>

    <!-- Modules Grid -->
    <section class="modules-grid" aria-label="Grid Praktikum 1-16">
      ${cardsHtml}
    </section>
  </main>

  ${renderSiteFooter(false)}

  <script src="./assets/js/main.js"></script>
</body>
</html>
`;

  writeFileSync(join(ROOT_DIR, 'index.html'), html, 'utf-8');
  console.log('Created: index.html');
}

// 2. Generate praktikum-1/index.html to praktikum-16/index.html
function generatePraktikumPages() {
  PRAKTIKUM_DATA.forEach((p, idx) => {
    const dir = join(ROOT_DIR, p.slug);
    mkdirSync(dir, { recursive: true });

    const prevSlug = idx > 0 ? PRAKTIKUM_DATA[idx - 1].slug : null;
    const nextSlug = idx < PRAKTIKUM_DATA.length - 1 ? PRAKTIKUM_DATA[idx + 1].slug : null;

    const prevBtn = prevSlug
      ? `<a href="../${prevSlug}/" class="nav-btn" id="nav-prev-btn" title="Praktikum Sebelumnya ["><span aria-hidden="true">&larr;</span> Praktikum ${idx}</a>`
      : `<button class="nav-btn" id="nav-prev-btn" disabled aria-disabled="true"><span aria-hidden="true">&larr;</span> Prev</button>`;

    const nextBtn = nextSlug
      ? `<a href="../${nextSlug}/" class="nav-btn" id="nav-next-btn" title="Praktikum Selanjutnya ]">Praktikum ${idx + 2} <span aria-hidden="true">&rarr;</span></a>`
      : `<button class="nav-btn" id="nav-next-btn" disabled aria-disabled="true">Next <span aria-hidden="true">&rarr;</span></button>`;

    const detailsList = p.details.map(d => `<li>${d}</li>`).join('\n              ');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Praktikum ${p.id}: ${p.title} - Kelompok YOLO</title>
  <meta name="description" content="Modul Praktikum ${p.id}: ${p.title} Grafika Komputer oleh Kelompok YOLO.">
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
  <!-- Global Navigation Header -->
  <header class="site-header">
    <div class="container header-inner">
      <div class="brand-group">
        <div class="brand-title">
          <a href="../" id="nav-home-link" class="brand-home-link" title="Kembali ke Daftar Praktikum (H / Esc)">Praktikum Grafika Komputer Kelompok YOLO</a>
          <span class="brand-separator">/</span>
          <span class="brand-current-page">Praktikum ${p.id}</span>
        </div>
      </div>
      <nav class="header-nav" aria-label="Navigasi Praktikum">
        <select id="quick-jump-select" class="nav-select" aria-label="Pilih Praktikum Cepat">
          ${renderQuickSelectOptions(p.slug)}
        </select>
        <button id="theme-toggle" class="btn-icon" title="Toggle Tema" aria-label="Toggle Tema">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </nav>
    </div>
  </header>

  <main class="container">
    ${renderTeamBanner()}

    <!-- Workbench Header -->
    <section class="workbench-header">
      <div>
        <div class="breadcrumb-trail">
          <a href="../">Daftar Modul</a>
          <span>&rsaquo;</span>
          <span>${p.category}</span>
          <span>&rsaquo;</span>
          <span class="status-badge ${p.status}">${p.statusLabel}</span>
        </div>
        <div class="workbench-title-row">
          <h1 class="workbench-title">Praktikum ${p.id}: ${p.title}</h1>
        </div>
      </div>
      <div class="workbench-pagination" aria-label="Navigasi Halaman Praktikum">
        ${prevBtn}
        <a href="../" class="nav-btn" title="Daftar Modul">Daftar</a>
        ${nextBtn}
      </div>
    </section>

    <!-- Interactive Canvas Viewport Workbench -->
    <section class="workbench-viewport" aria-label="Viewport Render Grafika">
      <div class="viewport-toolbar">
        <div class="toolbar-info">
          <div class="toolbar-stat">
            <span>Viewport:</span>
            <span id="res-stat" class="toolbar-stat-val">Loading...</span>
          </div>
          <div class="toolbar-stat">
            <span>FPS:</span>
            <span id="fps-stat" class="toolbar-stat-val">60 FPS</span>
          </div>
          <div class="toolbar-stat">
            <span>Mode:</span>
            <span class="toolbar-stat-val">Canvas 2D / WebGL</span>
          </div>
        </div>
        <div class="toolbar-actions">
          <button id="canvas-reset-btn" class="toolbar-btn" title="Reset Orientasi Kamera/Objek">Reset View</button>
          <button id="canvas-fullscreen-btn" class="toolbar-btn" title="Layar Penuh Viewport">Fullscreen</button>
        </div>
      </div>

      <div class="canvas-wrapper">
        <canvas id="grafkom-canvas" class="canvas-target" aria-label="Kanvas Render Grafika Praktikum ${p.id}"></canvas>
        <div class="canvas-placeholder-hud">
          <span class="placeholder-badge">Praktikum ${p.id}</span>
          <h2 class="placeholder-title">${p.title}</h2>
          <p class="placeholder-subtext">${p.hasPraktikum ? 'Area viewport render interaktif siap diintegrasikan dengan skrip tugas praktikum.' : '-'}</p>
        </div>
        <div id="coords-display" class="canvas-coords-indicator">X: 0pt, Y: 0pt | UV: (0.00, 0.00)</div>
      </div>
    </section>

    <!-- Metadata & Implementation Specs -->
    <section class="workbench-meta-panel">
      <div class="meta-box">
        <h2 class="meta-box-title">Deskripsi &amp; Sasaran Pembelajaran</h2>
        <div class="meta-box-content">
          <p>${p.desc}</p>
          <ul>
            ${detailsList}
          </ul>
        </div>
      </div>

      <div class="meta-box">
        <h2 class="meta-box-title">Spesifikasi Praktikum</h2>
        <table class="tech-specs-table">
          <tbody>
            <tr>
              <th>Nomor Modul</th>
              <td>Praktikum ${p.id}</td>
            </tr>
            <tr>
              <th>Topik / Kategori</th>
              <td>${p.category}</td>
            </tr>
            <tr>
              <th>Status Praktikum</th>
              <td>${p.statusLabel}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  ${renderSiteFooter(true)}

  <script src="../assets/js/main.js"></script>
</body>
</html>
`;

    writeFileSync(join(dir, 'index.html'), html, 'utf-8');
    console.log(`Created: ${p.slug}/index.html`);
  });
}

generateIndexHtml();
generatePraktikumPages();
console.log('Site generation complete!');
