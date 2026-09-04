/**
 * Praktikum Grafika Komputer - Pertemuan 1
 * Graphics Playground dengan HTML Canvas 2D
 *
 * Kelompok: Kelompok YOLO
 * Anggota :
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 *
 * Fitur & Tantangan yang Diimplementasikan:
 * - Primitif Dasar 2D: Rectangle, Line, Circle, Triangle (Multi-vertex)
 * - Challenge A: Bouncing Object dengan deteksi 4 batas dinding canvas & transisi warna dinamis
 * - Challenge B & 34.1: Follow Mouse & Slingshot Indicator (karet elastis, lintasan bidik putus-putus, gauge power, & peluncuran bola fisika)
 * - Challenge C: Click / C key to Change Color (siklus palet warna player)
 * - Challenge D: Keyboard Movement (WASD & Arrow Keys translasi kontinu state-based + boundary clamp + reset R)
 * - Challenge E: Real-time Mouse Coordinate Display (integrasi HUD & viewport)
 * - Challenge Tambahan 34.2: Trail Mode Selector (No Trail, Fade Trail, Persistent Trail)
 * - Challenge Tambahan 34.3: Multiple Moving Objects (bola kedua independen + kumpulan bola hasil slingshot)
 * - Kontrol Interaktif: Pause/Resume (Space), Reset Posisi (R), Hapus Bola, Fullscreen, dan FPS counter
 */

// 1. INISIALISASI ELEMEN & CONTEXT
const canvas = document.getElementById("grafkom-canvas");
if (!canvas) throw new Error('Canvas #grafkom-canvas was not found.');

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error('Canvas 2D context is unavailable.');

canvas.width = 800;
canvas.height = 500;

const trailModeSelect = document.getElementById("trail_mode");
const btnPause = document.getElementById("btn_pause");
const btnResetPlayer = document.getElementById("btn_reset_player");
const btnClearCircles = document.getElementById("btn_clear_circles");
const btnCycleColor = document.getElementById("btn_cycle_color");
const coordsDisplay = document.getElementById("coords-display");
const fpsDisplay = document.getElementById("fps-stat");
const resDisplay = document.getElementById("res-stat");
const resetViewBtn = document.getElementById("canvas-reset-btn");
const fullscreenBtn = document.getElementById("canvas-fullscreen-btn");

if (resDisplay) {
  resDisplay.textContent = `${canvas.width} × ${canvas.height} px`;
}

// 2. DATA STRUKTUR (Geometri & State Grafika)
const colorPalette = [
  "#0a84ff", // Blue
  "#30d158", // Green
  "#ff9f0a", // Orange
  "#bf5af2", // Purple
  "#ff375f", // Pink
  "#ffd60a", // Yellow
  "#64d2ff", // Cyan
  "#ff453a", // Red
];

const rectangle = {
  x: 60,
  y: 60,
  width: 150,
  height: 90,
  color: "#0a84ff",
  label: "Rectangle",
};

// 2. Primitive: Line
const staticLine = {
  x1: 270,
  y1: 70,
  x2: 470,
  y2: 150,
  color: "#ff453a",
  lineWidth: 5,
};

const staticCircle = {
  x: 630,
  y: 110,
  radius: 55,
  color: "#30d158",
  label: "Circle",
};

const triangle = {
  v0: { x: 135, y: 280 },
  v1: { x: 60, y: 420 },
  v2: { x: 210, y: 420 },
  fillColor: "#ff9f0a",
  strokeColor: "#d48207",
  lineWidth: 3,
  label: "Triangle",
};

let ballColorIndex = 3;
const movingBall = {
  x: 350,
  y: 300,
  radius: 24,
  speedX: 2.8,
  speedY: 2.8,
  color: colorPalette[ballColorIndex],
};

const secondaryBall = {
  x: 250,
  y: 200,
  radius: 16,
  speedX: -2.2,
  speedY: 3.2,
  color: "#64d2ff",
};

let playerColorIndex = 2;
const player = {
  x: 580,
  y: 330,
  width: 52,
  height: 52,
  speed: 5.5,
  color: colorPalette[playerColorIndex],
};

const mouse = { x: 0, y: 0 };
let firstClickX = 0;
let firstClickY = 0;
let isDragging = false;
let hasDragged = false;

let circles = [];

let isPaused = false;
const activeKeys = {};

let frameCount = 0;
let lastFpsUpdate = performance.now();

// 3. UTILITIES & KOORDINAT
function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 4. RENDERING FUNCTIONS (Menggambar Primitif & Visual)
// Gambar Latar Grid Koordinat Halus
function drawCoordinateGrid() {
  const step = 40;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";

  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRectangle() {
  ctx.save();
  ctx.fillStyle = rectangle.color;
  ctx.shadowColor = "rgba(10, 132, 255, 0.35)";
  ctx.shadowBlur = 12;
  ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);

  ctx.fillStyle = "#ffffff";
  ctx.font =
    '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    rectangle.label,
    rectangle.x + rectangle.width / 2,
    rectangle.y + rectangle.height / 2,
  );
  ctx.restore();
}

function drawLine() {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(staticLine.x1, staticLine.y1);
  ctx.lineTo(staticLine.x2, staticLine.y2);
  ctx.strokeStyle = staticLine.color;
  ctx.lineWidth = staticLine.lineWidth;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 69, 58, 0.4)";
  ctx.shadowBlur = 10;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(staticLine.x1, staticLine.y1, 4, 0, Math.PI * 2);
  ctx.arc(staticLine.x2, staticLine.y2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCircle() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(staticCircle.x, staticCircle.y, staticCircle.radius, 0, Math.PI * 2);
  ctx.fillStyle = staticCircle.color;
  ctx.shadowColor = "rgba(48, 209, 88, 0.35)";
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font =
    '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(staticCircle.label, staticCircle.x, staticCircle.y);
  ctx.restore();
}

function drawTriangle() {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(triangle.v0.x, triangle.v0.y);
  ctx.lineTo(triangle.v1.x, triangle.v1.y);
  ctx.lineTo(triangle.v2.x, triangle.v2.y);
  ctx.closePath();

  ctx.fillStyle = triangle.fillColor;
  ctx.shadowColor = "rgba(255, 159, 10, 0.35)";
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = triangle.strokeColor;
  ctx.lineWidth = triangle.lineWidth;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font =
    '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(triangle.label, triangle.v0.x, triangle.v1.y - 38);
  ctx.restore();
}

function drawMovingBall() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(movingBall.x, movingBall.y, movingBall.radius, 0, Math.PI * 2);
  ctx.fillStyle = movingBall.color;
  ctx.shadowColor = movingBall.color;
  ctx.shadowBlur = 16;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
    movingBall.x - movingBall.radius * 0.3,
    movingBall.y - movingBall.radius * 0.3,
    movingBall.radius * 0.35,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();
  ctx.restore();
}

function drawSecondaryBall() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    secondaryBall.x,
    secondaryBall.y,
    secondaryBall.radius,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = secondaryBall.color;
  ctx.shadowColor = secondaryBall.color;
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 14;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "#ffffff";
  ctx.font =
    '700 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "PLAYER",
    player.x + player.width / 2,
    player.y + player.height / 2,
  );
  ctx.restore();
}

function drawSlingshotCircles() {
  ctx.save();
  for (const c of circles) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSlingshot() {
  if (!isDragging) return;

  const dx = firstClickX - mouse.x;
  const dy = firstClickY - mouse.y;
  const dist = Math.hypot(dx, dy);

  ctx.save();

  if (dist > 4) {
    const aimLength = Math.min(dist * 1.8, 260);
    const aimX = firstClickX + (dx / dist) * aimLength;
    const aimY = firstClickY + (dy / dist) * aimLength;

    ctx.beginPath();
    ctx.moveTo(firstClickX, firstClickY);
    ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = "#ff453a";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(aimX, aimY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff453a";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(firstClickX, firstClickY);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(firstClickX, firstClickY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ff453a";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const previewColor = colorPalette[(circles.length + 4) % colorPalette.length];
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = previewColor;
  ctx.shadowColor = previewColor;
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (dist > 10) {
    const power = Math.min(Math.round(dist), 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = '600 12px "SF Mono", monospace';
    ctx.fillText(`Power: ${power}%`, mouse.x + 22, mouse.y - 10);
  }

  ctx.restore();
}

function drawMouseCoordinate() {
  if (coordsDisplay) {
    const u = (mouse.x / canvas.width).toFixed(2);
    const v = (mouse.y / canvas.height).toFixed(2);
    coordsDisplay.textContent = `X: ${Math.round(mouse.x)}px, Y: ${Math.round(mouse.y)}px | UV: (${u}, ${v})`;
  }
}

function drawPauseHUD() {
  if (!isPaused) return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff9f0a";
  ctx.font =
    '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("ANIMASI DI-PAUSE", canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = "rgba(235, 235, 245, 0.8)";
  ctx.font =
    '14px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText(
    "Tekan Spacebar atau klik tombol Pause untuk melanjutkan animasi.",
    canvas.width / 2,
    canvas.height / 2 + 25,
  );
  ctx.restore();
}

// 5. UPDATE FUNCTIONS
function updateMovingBall() {
  movingBall.x += movingBall.speedX;
  movingBall.y += movingBall.speedY;

  let bounced = false;

  if (movingBall.x + movingBall.radius >= canvas.width) {
    movingBall.x = canvas.width - movingBall.radius;
    movingBall.speedX *= -1;
    bounced = true;
  } else if (movingBall.x - movingBall.radius <= 0) {
    movingBall.x = movingBall.radius;
    movingBall.speedX *= -1;
    bounced = true;
  }

  if (movingBall.y + movingBall.radius >= canvas.height) {
    movingBall.y = canvas.height - movingBall.radius;
    movingBall.speedY *= -1;
    bounced = true;
  } else if (movingBall.y - movingBall.radius <= 0) {
    movingBall.y = movingBall.radius;
    movingBall.speedY *= -1;
    bounced = true;
  }

  if (bounced) {
    ballColorIndex = (ballColorIndex + 1) % colorPalette.length;
    movingBall.color = colorPalette[ballColorIndex];
  }
}

function updateSecondaryBall() {
  secondaryBall.x += secondaryBall.speedX;
  secondaryBall.y += secondaryBall.speedY;

  if (secondaryBall.x + secondaryBall.radius >= canvas.width) {
    secondaryBall.x = canvas.width - secondaryBall.radius;
    secondaryBall.speedX *= -1;
  } else if (secondaryBall.x - secondaryBall.radius <= 0) {
    secondaryBall.x = secondaryBall.radius;
    secondaryBall.speedX *= -1;
  }

  if (secondaryBall.y + secondaryBall.radius >= canvas.height) {
    secondaryBall.y = canvas.height - secondaryBall.radius;
    secondaryBall.speedY *= -1;
  } else if (secondaryBall.y - secondaryBall.radius <= 0) {
    secondaryBall.y = secondaryBall.radius;
    secondaryBall.speedY *= -1;
  }
}

function updateSlingshotCircles() {
  for (const c of circles) {
    c.x += c.speedX;
    c.y += c.speedY;

    if (c.x + c.radius >= canvas.width) {
      c.x = canvas.width - c.radius;
      c.speedX *= -1;
    } else if (c.x - c.radius <= 0) {
      c.x = c.radius;
      c.speedX *= -1;
    }

    if (c.y + c.radius >= canvas.height) {
      c.y = canvas.height - c.radius;
      c.speedY *= -1;
    } else if (c.y - c.radius <= 0) {
      c.y = c.radius;
      c.speedY *= -1;
    }
  }
}

function updatePlayer() {
  if (
    activeKeys["ArrowLeft"] ||
    activeKeys["KeyA"] ||
    activeKeys["a"] ||
    activeKeys["A"]
  ) {
    player.x -= player.speed;
  }
  if (
    activeKeys["ArrowRight"] ||
    activeKeys["KeyD"] ||
    activeKeys["d"] ||
    activeKeys["D"]
  ) {
    player.x += player.speed;
  }
  if (
    activeKeys["ArrowUp"] ||
    activeKeys["KeyW"] ||
    activeKeys["w"] ||
    activeKeys["W"]
  ) {
    player.y -= player.speed;
  }
  if (
    activeKeys["ArrowDown"] ||
    activeKeys["KeyS"] ||
    activeKeys["s"] ||
    activeKeys["S"]
  ) {
    player.y += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function cyclePlayerColor() {
  playerColorIndex = (playerColorIndex + 1) % colorPalette.length;
  player.color = colorPalette[playerColorIndex];
}

function resetPlayerPosition() {
  player.x = 580;
  player.y = 330;
}

function togglePause() {
  isPaused = !isPaused;
  if (btnPause) {
    btnPause.textContent = isPaused ? "Resume (Space)" : "Pause (Space)";
    btnPause.setAttribute("aria-pressed", isPaused ? "true" : "false");
  }
}

// 6. EVENT LISTENERS
canvas.addEventListener("mousemove", (e) => {
  const coords = getCanvasCoords(e);
  mouse.x = coords.x;
  mouse.y = coords.y;

  if (isDragging) {
    const dist = Math.hypot(coords.x - firstClickX, coords.y - firstClickY);
    if (dist > 6) {
      hasDragged = true;
    }
  }
  drawMouseCoordinate();
});

canvas.addEventListener("mousedown", (e) => {
  const coords = getCanvasCoords(e);
  isDragging = true;
  hasDragged = false;
  firstClickX = coords.x;
  firstClickY = coords.y;
});

window.addEventListener("mouseup", (e) => {
  if (!isDragging) return;
  isDragging = false;

  const coords = getCanvasCoords(e);
  const dx = firstClickX - coords.x;
  const dy = firstClickY - coords.y;
  const dist = Math.hypot(dx, dy);

  if (hasDragged && dist >= 8) {
    const powerFactor = 0.12;
    let vx = dx * powerFactor;
    let vy = dy * powerFactor;

    const maxSpeed = 16;
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    const spawnColor = colorPalette[(circles.length + 4) % colorPalette.length];
    circles.push({
      x: firstClickX,
      y: firstClickY,
      radius: 16,
      speedX: vx,
      speedY: vy,
      color: spawnColor,
    });
  } else {
    cyclePlayerColor();
  }
});

window.addEventListener("keydown", (e) => {
  const controlledKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    " ",
    "Space",
  ];

  if (controlledKeys.includes(e.key) || controlledKeys.includes(e.code)) {
    if (
      document.activeElement === document.body ||
      document.activeElement === canvas
    ) {
      e.preventDefault();
    }
  }

  activeKeys[e.key] = true;
  activeKeys[e.code] = true;

  if (!e.repeat) {
    if (e.key.toLowerCase() === "r") {
      resetPlayerPosition();
    }
    if (e.key.toLowerCase() === "c") {
      cyclePlayerColor();
    }
    if (e.key === " " || e.code === "Space") {
      togglePause();
    }
  }
});

window.addEventListener("keyup", (e) => {
  activeKeys[e.key] = false;
  activeKeys[e.code] = false;
});

if (btnPause) {
  btnPause.addEventListener("click", togglePause);
}

if (btnResetPlayer) {
  btnResetPlayer.addEventListener("click", resetPlayerPosition);
}

if (btnClearCircles) {
  btnClearCircles.addEventListener("click", () => {
    circles = [];
    const mode = trailModeSelect ? trailModeSelect.value : "no_trail";
    if (mode === "trail" || mode === "fade_trail") {
      clearCanvas();
    }
  });
}

if (btnCycleColor) {
  btnCycleColor.addEventListener("click", cyclePlayerColor);
}

if (resetViewBtn) {
  resetViewBtn.addEventListener("click", () => {
    resetPlayerPosition();
    circles = [];
    movingBall.x = 350;
    movingBall.y = 300;
    movingBall.speedX = 2.8;
    movingBall.speedY = 2.8;
    clearCanvas();
  });
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", () => {
    const wrapper = canvas.closest(".canvas-wrapper") || canvas;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  });
}

// 7. ANIMATION LOOP
function animate(now) {
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    if (fpsDisplay) {
      fpsDisplay.textContent = `${frameCount} FPS`;
    }
    frameCount = 0;
    lastFpsUpdate = now;
  }

  const mode = trailModeSelect ? trailModeSelect.value : "no_trail";
  if (mode === "no_trail") {
    clearCanvas();
  } else if (mode === "fade_trail") {
    // Lapisan semi-transparan untuk efek trail memudar
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (!isPaused) {
    updateMovingBall();
    updateSecondaryBall();
    updateSlingshotCircles();
    updatePlayer();
  }

  drawCoordinateGrid();
  drawRectangle();
  drawLine();
  drawCircle();
  drawTriangle();
  drawMovingBall();
  drawSecondaryBall();
  drawSlingshotCircles();
  drawPlayer();
  drawSlingshot();

  drawPauseHUD();

  requestAnimationFrame(animate);
}

animate();
