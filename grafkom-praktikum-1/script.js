/*
Praktikum Grafika Komputer - Pertemuan 1
Graphics Playground

Kelompok : Kelompok YOLO
Anggota  :
1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)

Challenge yang diimplementasikan:
- Challenge A: Bouncing Object (Deteksi batas 4 dinding canvas dengan perubahan warna dinamis saat memantul)
- Challenge B: Follow Mouse & Slingshot Indicator (Mekanik ketapel/slingshot peluncuran bola dengan bidikan)
- Challenge C: Click to Change Color (Klik canvas / tombol C untuk mengganti warna player)
- Challenge D: Keyboard Movement (Translasi kontinu state-based dengan Arrow Keys & WASD + Reset posisi R)
- Challenge E: Real-time Mouse Coordinate Display (Menampilkan posisi x, y pointer pada canvas)
- Challenge Tambahan 1 (34.1): Click to Create Circle (Menambahkan lingkaran baru dengan kecepatan pantul dari slingshot)
- Challenge Tambahan 2 (34.2): Trail Mode Selector (Mode jejak animasi dengan toggle No Trail / Trail)
- Challenge Tambahan 3 (34.3): Multiple Moving Objects (Objek bola kedua dan bola-bola hasil slingshot yang memantul)
*/

// ==================================================
// INITIALIZATION
// ==================================================

const canvas = document.getElementById("graphicsCanvas");
const ctx = canvas.getContext("2d");

const trail_mode = document.getElementById("trail_mode");
const btn_pause = document.getElementById("btn_pause");
const btn_reset_player = document.getElementById("btn_reset_player");
const btn_clear_circles = document.getElementById("btn_clear_circles");

// ==================================================
// DATA (Representasi Geometri & Atribut Grafika)
// ==================================================

// 1. Primitive: Rectangle
const rectangle = {
  x: 80,
  y: 80,
  width: 160,
  height: 100,
  color: "#3498db",
};

// 2. Primitive: Line
const staticLine = {
  x1: 300,
  y1: 80,
  x2: 500,
  y2: 180,
  color: "#e74c3c",
  lineWidth: 5,
};

// 3. Primitive: Circle
const staticCircle = {
  x: 650,
  y: 120,
  radius: 60,
  color: "#2ecc71",
};

// 4. Primitive: Triangle (3 Vertex Coordinates)
const triangle = {
  v0: { x: 150, y: 300 },
  v1: { x: 80, y: 430 },
  v2: { x: 220, y: 430 },
  fillColor: "#f39c12",
  strokeColor: "#8a5705",
  lineWidth: 3,
};

// 5. Objek Bergerak Utama (Moving Ball 1)
const movingBall = {
  x: 350,
  y: 300,
  radius: 25,
  speedX: 2.5,
  speedY: 2.5,
  color: "#9b59b6",
};

// 6. Objek Bergerak Tambahan (Moving Ball 2 - Challenge 34.3)
const secondaryBall = {
  x: 250,
  y: 200,
  radius: 16,
  speedX: -2.0,
  speedY: 3.0,
  color: "#16a085",
};

// 7. Objek Player Terkendali Keyboard
const player = {
  x: 600,
  y: 350,
  width: 50,
  height: 50,
  speed: 5,
  color: "#e67e22",
};

// 8. Data Mouse & Input State
const mouse = {
  x: 0,
  y: 0,
};

const keys = {};

const colors = [
  "#9b59b6",
  "#e74c3c",
  "#2ecc71",
  "#f1c40f",
  "#3498db",
  "#1abc9c",
  "#e67e22",
  "#e84393",
];

let playerColorIndex = 0;
let ballColorIndex = 0;

let firstClickX = 0;
let firstClickY = 0;
let isDragging = false;

// Array penyimpan semua lingkaran hasil tembakan slingshot
let circles = [];
let isPaused = false;

// ==================================================
// CANVAS UTILITIES
// ==================================================

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ==================================================
// DRAW FUNCTIONS (Rendering Primitives & Visuals)
// ==================================================

function drawRectangle() {
  ctx.fillStyle = rectangle.color;
  ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Rectangle", rectangle.x + 10, rectangle.y + 20);
}

function drawLine() {
  ctx.beginPath();
  ctx.moveTo(staticLine.x1, staticLine.y1);
  ctx.lineTo(staticLine.x2, staticLine.y2);
  ctx.strokeStyle = staticLine.color;
  ctx.lineWidth = staticLine.lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawCircle() {
  ctx.beginPath();
  ctx.arc(
    staticCircle.x,
    staticCircle.y,
    staticCircle.radius,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = staticCircle.color;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Circle", staticCircle.x, staticCircle.y + 4);
  ctx.textAlign = "left";
}

function drawTriangle() {
  ctx.beginPath();
  ctx.moveTo(triangle.v0.x, triangle.v0.y);
  ctx.lineTo(triangle.v1.x, triangle.v1.y);
  ctx.lineTo(triangle.v2.x, triangle.v2.y);
  ctx.closePath();

  ctx.fillStyle = triangle.fillColor;
  ctx.fill();

  ctx.strokeStyle = triangle.strokeColor;
  ctx.lineWidth = triangle.lineWidth;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Triangle", triangle.v1.x + 20, triangle.v1.y - 15);
}

function drawMovingBall() {
  ctx.beginPath();
  ctx.arc(movingBall.x, movingBall.y, movingBall.radius, 0, Math.PI * 2);
  ctx.fillStyle = movingBall.color;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSecondaryBall() {
  ctx.beginPath();
  ctx.arc(
    secondaryBall.x,
    secondaryBall.y,
    secondaryBall.radius,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = secondaryBall.color;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Player", player.x + player.width / 2, player.y + player.height / 2 + 4);
  ctx.textAlign = "left";
}

function drawMouseCoordinate() {
  // Bersihkan area teks koordinat mouse agar tidak bertumpuk/smear saat Trail Mode aktif
  ctx.clearRect(10, 10, 220, 30);

  ctx.fillStyle = "#2c3e50";
  ctx.font = "bold 15px Arial";
  ctx.fillText(
    `Mouse: (${Math.round(mouse.x)}, ${Math.round(mouse.y)})`,
    20,
    30
  );
}

function drawSlingshot() {
  if (!isDragging) return;

  const dx = firstClickX - mouse.x;
  const dy = firstClickY - mouse.y;
  const dist = Math.hypot(dx, dy);

  // 1. Garis lintasan bidikan (Aiming Trajectory) berlawanan dari tarikan
  if (dist > 4) {
    const aimLength = Math.min(dist * 1.6, 220);
    const aimX = firstClickX + (dx / dist) * aimLength;
    const aimY = firstClickY + (dy / dist) * aimLength;

    ctx.beginPath();
    ctx.moveTo(firstClickX, firstClickY);
    ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Karet ketapel elastis dari titik asal (firstClick) ke kursor mouse
  ctx.beginPath();
  ctx.moveTo(firstClickX, firstClickY);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.strokeStyle = "#34495e";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Titik jangkar peluncuran
  ctx.beginPath();
  ctx.arc(firstClickX, firstClickY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#e74c3c";
  ctx.fill();
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. Preview bola yang ditarik pada posisi kursor mouse
  const previewColor = colors[(circles.length + 2) % colors.length];
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
  ctx.fillStyle = previewColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 5. Teks power / kecepatan luncur
  if (dist > 10) {
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 12px Arial";
    ctx.fillText(`Power: ${Math.round(dist)}`, mouse.x + 22, mouse.y - 8);
  }
}

function drawMultipleCircles() {
  for (const c of circles) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawStatusHUD() {
  if (isPaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ANIMASI DI-PAUSE", canvas.width / 2, canvas.height / 2);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Tekan Space atau tombol Pause untuk melanjutkan", canvas.width / 2, canvas.height / 2 + 35);
    ctx.textAlign = "left";
  }
}

// ==================================================
// UPDATE FUNCTIONS (Physics & Movement Logic)
// ==================================================

function updateMovingBall() {
  movingBall.x += movingBall.speedX;
  movingBall.y += movingBall.speedY;

  let bounced = false;

  if (
    movingBall.x + movingBall.radius >= canvas.width ||
    movingBall.x - movingBall.radius <= 0
  ) {
    movingBall.speedX *= -1;
    bounced = true;
  }

  if (
    movingBall.y + movingBall.radius >= canvas.height ||
    movingBall.y - movingBall.radius <= 0
  ) {
    movingBall.speedY *= -1;
    bounced = true;
  }

  if (bounced) {
    ballColorIndex = (ballColorIndex + 1) % colors.length;
    movingBall.color = colors[ballColorIndex];
  }
}

function updateSecondaryBall() {
  secondaryBall.x += secondaryBall.speedX;
  secondaryBall.y += secondaryBall.speedY;

  if (
    secondaryBall.x + secondaryBall.radius >= canvas.width ||
    secondaryBall.x - secondaryBall.radius <= 0
  ) {
    secondaryBall.speedX *= -1;
  }

  if (
    secondaryBall.y + secondaryBall.radius >= canvas.height ||
    secondaryBall.y - secondaryBall.radius <= 0
  ) {
    secondaryBall.speedY *= -1;
  }
}

function updateCircles() {
  // Update posisi dan pantulan semua bola hasil tembakan slingshot
  for (const c of circles) {
    c.x += c.speedX;
    c.y += c.speedY;

    // Pantulan batas horizontal
    if (c.x + c.radius >= canvas.width) {
      c.x = canvas.width - c.radius;
      c.speedX *= -1;
    } else if (c.x - c.radius <= 0) {
      c.x = c.radius;
      c.speedX *= -1;
    }

    // Pantulan batas vertikal
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
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["a"] || keys["A"]) {
    player.x -= player.speed;
  }
  if (keys["ArrowRight"] || keys["KeyD"] || keys["d"] || keys["D"]) {
    player.x += player.speed;
  }
  if (keys["ArrowUp"] || keys["KeyW"] || keys["w"] || keys["W"]) {
    player.y -= player.speed;
  }
  if (keys["ArrowDown"] || keys["KeyS"] || keys["s"] || keys["S"]) {
    player.y += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function resetPlayerPosition() {
  player.x = 600;
  player.y = 350;
}

function cyclePlayerColor() {
  playerColorIndex = (playerColorIndex + 1) % colors.length;
  player.color = colors[playerColorIndex];
}

function togglePause() {
  isPaused = !isPaused;
}

// ==================================================
// INPUT EVENT LISTENERS
// ==================================================

// 1. Mouse Move: Update koordinat kursor relatif terhadap canvas
canvas.addEventListener("mousemove", function (event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
});

// 2. Mouse Click: Ganti warna player jika klik cepat tanpa drag
canvas.addEventListener("click", function () {
  cyclePlayerColor();
});

// 3. Mouse Down: Mulai tarik ketapel (Slingshot)
canvas.addEventListener("mousedown", function () {
  isDragging = true;
  firstClickX = mouse.x;
  firstClickY = mouse.y;
});

// 4. Mouse Up: Lepaskan ketapel dan luncurkan bola memantul
window.addEventListener("mouseup", function (event) {
  if (!isDragging) return;
  isDragging = false;

  const rect = canvas.getBoundingClientRect();
  const mouseCanvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const mouseCanvasY = (event.clientY - rect.top) * (canvas.height / rect.height);

  // Vektor tarikan ketapel (kebalikan dari arah tarik)
  const dx = firstClickX - mouseCanvasX;
  const dy = firstClickY - mouseCanvasY;
  const dist = Math.hypot(dx, dy);

  let vx, vy;
  if (dist < 5) {
    // Jika hanya klik tanpa tarikan jauh, berikan kecepatan acak halus
    vx = (Math.random() - 0.5) * 4;
    vy = (Math.random() - 0.5) * 4;
    if (Math.abs(vx) < 1) vx = 2;
    if (Math.abs(vy) < 1) vy = 2;
  } else {
    // Kecepatan proporsional dengan jarak tarikan ketapel
    const powerFactor = 0.12;
    vx = dx * powerFactor;
    vy = dy * powerFactor;

    // Batasi kecepatan maksimal agar tetap terkontrol
    const maxSpeed = 16;
    const currentSpeed = Math.hypot(vx, vy);
    if (currentSpeed > maxSpeed) {
      vx = (vx / currentSpeed) * maxSpeed;
      vy = (vy / currentSpeed) * maxSpeed;
    }
  }

  const spawnedColor = colors[(circles.length + 2) % colors.length];
  circles.push({
    x: firstClickX,
    y: firstClickY,
    radius: 18,
    speedX: vx,
    speedY: vy,
    color: spawnedColor,
  });
});

// 5. Keyboard KeyDown
window.addEventListener("keydown", function (event) {
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

  if (controlledKeys.includes(event.key) || controlledKeys.includes(event.code)) {
    event.preventDefault();
  }

  keys[event.key] = true;
  keys[event.code] = true;

  if (!event.repeat) {
    if (event.key.toLowerCase() === "r") {
      resetPlayerPosition();
    }
    if (event.key.toLowerCase() === "c") {
      cyclePlayerColor();
    }
    if (event.key === " " || event.code === "Space") {
      togglePause();
    }
  }
});

// 6. Keyboard KeyUp
window.addEventListener("keyup", function (event) {
  keys[event.key] = false;
  keys[event.code] = false;
});

// 7. UI Buttons
if (btn_pause) {
  btn_pause.addEventListener("click", togglePause);
}
if (btn_reset_player) {
  btn_reset_player.addEventListener("click", resetPlayerPosition);
}
if (btn_clear_circles) {
  btn_clear_circles.addEventListener("click", function () {
    circles = [];
    if (trail_mode.value === "trail" || trail_mode.value === "fade_trail") {
      clearCanvas();
    }
  });
}

// ==================================================
// ANIMATION LOOP (Graphics Pipeline Cycle)
// ==================================================

function animate() {
  if (trail_mode.value === "no_trail") {
    clearCanvas();
  } else if (trail_mode.value === "fade_trail") {
    // Sapukan lapisan transparan putih tipis agar jejak memudar halus (Fade Trail)
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Mode "trail" (Persistent Trail): canvas tidak dibersihkan sama sekali

  if (!isPaused) {
    updateMovingBall();
    updateSecondaryBall();
    updateCircles();
    updatePlayer();
  }

  // Render objek
  drawRectangle();
  drawLine();
  drawCircle();
  drawTriangle();
  drawMovingBall();
  drawSecondaryBall();
  drawMultipleCircles();
  drawPlayer();
  drawSlingshot();
  drawMouseCoordinate();

  drawStatusHUD();

  requestAnimationFrame(animate);
}

// Mulai loop animasi
animate();
