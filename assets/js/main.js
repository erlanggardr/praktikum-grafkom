/**
 * Praktikum Grafika Komputer - Apple HIG-Inspired Client Script
 * Kelompok: Kelompok Yolo
 * Anggota: Jalu Cahyo Senodiputro (5025241155), Erlangga Rizqi Dwi Raswanto (5025241179)
 */

(function () {
  'use strict';

  // --- Apple Adaptive Theme Management ---
  const THEME_KEY = 'grafkom_apple_theme';
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'dark'); // Default dark
    document.documentElement.setAttribute('data-theme', theme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
      });
    }

    // Auto adapt if system changes and user hasn't hardcoded a theme
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // --- Quick Jump Navigation ---
  function initNavigation() {
    const navSelect = document.getElementById('quick-jump-select');
    if (navSelect) {
      navSelect.addEventListener('change', (e) => {
        const target = e.target.value;
        if (target) {
          window.location.href = target;
        }
      });
    }

    // Keyboard navigation: [ / ← (Prev), ] / → (Next), Esc / H (Home)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const prevBtn = document.getElementById('nav-prev-btn');
      const nextBtn = document.getElementById('nav-next-btn');
      const homeLink = document.getElementById('nav-home-link');

      if ((e.key === 'ArrowLeft' || e.key === '[') && prevBtn && !prevBtn.disabled) {
        prevBtn.click();
      } else if ((e.key === 'ArrowRight' || e.key === ']') && nextBtn && !nextBtn.disabled) {
        nextBtn.click();
      } else if ((e.key === 'h' || e.key === 'H') && homeLink) {
        homeLink.click();
      }
    });
  }

  // --- Dashboard Search & Filter ---
  function initDashboardFilter() {
    const searchInput = document.getElementById('module-search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.module-card');

    if (!cards.length) return;

    let activeFilter = 'all';
    let searchQuery = '';

    function filterCards() {
      cards.forEach((card) => {
        const status = card.getAttribute('data-status') || 'ready';
        const title = (card.querySelector('.module-title')?.textContent || '').toLowerCase();
        const num = (card.querySelector('.module-number')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('.module-desc')?.textContent || '').toLowerCase();

        const matchesStatus = activeFilter === 'all' || status === activeFilter;
        const matchesSearch = !searchQuery || title.includes(searchQuery) || num.includes(searchQuery) || desc.includes(searchQuery);

        if (matchesStatus && matchesSearch) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        filterCards();
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        filterCards();
      });
    });
  }

  // --- Interactive Canvas Workbench Placeholder ---
  function initCanvasWorkbench() {
    const canvas = document.getElementById('grafkom-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coordsDisplay = document.getElementById('coords-display');
    const fpsDisplay = document.getElementById('fps-stat');
    const resDisplay = document.getElementById('res-stat');
    const resetBtn = document.getElementById('canvas-reset-btn');
    const fullscreenBtn = document.getElementById('canvas-fullscreen-btn');

    let animId = null;
    let isRunning = true;
    let angleX = 0;
    let angleY = 0;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    // 3D Cube Vertices
    const vertices = [
      [-1, -1, -1],
      [ 1, -1, -1],
      [ 1,  1, -1],
      [-1,  1, -1],
      [-1, -1,  1],
      [ 1, -1,  1],
      [ 1,  1,  1],
      [-1,  1,  1]
    ];

    // Cube Edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (resDisplay) {
        resDisplay.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} pt`;
      }
    }

    window.addEventListener('resize', resize);
    resize();

    // Coordinates indicator
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const u = ((e.clientX - rect.left) / rect.width).toFixed(3);
      const v = ((e.clientY - rect.top) / rect.height).toFixed(3);

      if (coordsDisplay) {
        coordsDisplay.textContent = `X: ${x}pt, Y: ${y}pt | UV: (${u}, ${v})`;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (coordsDisplay) {
        coordsDisplay.textContent = `X: 0pt, Y: 0pt | UV: (0.00, 0.00)`;
      }
    });

    function project(p, width, height, fov = 420, distance = 4.2) {
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const x1 = p[0] * cosY + p[2] * sinY;
      const y1 = p[1];
      const z1 = -p[0] * sinY + p[2] * cosY;

      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX + distance;

      const scale = fov / Math.max(z2, 0.1);
      const projX = x2 * scale + width / 2;
      const projY = y2 * scale + height / 2;

      return [projX, projY, z2];
    }

    function drawCoordinateGrid(width, height, dpr) {
      const step = 48 * dpr; // 8pt Apple grid multiple
      const cx = width / 2;
      const cy = height / 2;

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';

      ctx.beginPath();
      for (let x = cx % step; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = cy % step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Main X and Y Axes (Apple System Blue)
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = 'rgba(10, 132, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      // Axis Arrowheads
      const arrowSize = 6 * dpr;
      ctx.fillStyle = '#0a84ff';
      
      // X-axis arrow
      ctx.beginPath();
      ctx.moveTo(width - 4 * dpr, cy);
      ctx.lineTo(width - 4 * dpr - arrowSize, cy - arrowSize / 2);
      ctx.lineTo(width - 4 * dpr - arrowSize, cy + arrowSize / 2);
      ctx.fill();

      // Y-axis arrow
      ctx.beginPath();
      ctx.moveTo(cx, 4 * dpr);
      ctx.lineTo(cx - arrowSize / 2, 4 * dpr + arrowSize);
      ctx.lineTo(cx + arrowSize / 2, 4 * dpr + arrowSize);
      ctx.fill();
    }

    function render(now) {
      frameCount++;
      if (now - lastFpsUpdate >= 1000) {
        if (fpsDisplay) {
          fpsDisplay.textContent = `${frameCount} FPS`;
        }
        frameCount = 0;
        lastFpsUpdate = now;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      drawCoordinateGrid(width, height, dpr);

      const projected = vertices.map(v => project(v, width, height, 220 * dpr, 4.2));

      // Draw Edges (Apple System Blue with smooth glow)
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = '#0a84ff';
      ctx.shadowColor = 'rgba(10, 132, 255, 0.45)';
      ctx.shadowBlur = 10 * dpr;

      edges.forEach(([i, j]) => {
        const [x1, y1] = projected[i];
        const [x2, y2] = projected[j];

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw Vertices
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#64d2ff'; // Apple systemCyan
      projected.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      });

      if (isRunning) {
        angleX += 0.008;
        angleY += 0.012;
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        angleX = 0;
        angleY = 0;
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const wrapper = canvas.closest('.canvas-wrapper');
        if (!wrapper) return;
        if (!document.fullscreenElement) {
          wrapper.requestFullscreen().catch(err => console.error(err));
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  // --- DOM Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initDashboardFilter();
    initCanvasWorkbench();
  });
})();
