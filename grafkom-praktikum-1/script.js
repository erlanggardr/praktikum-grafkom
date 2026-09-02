const canvas = document.getElementById("graphicsCanvas");
const ctx = canvas.getContext("2d");

const trail_mode = document.getElementById("trail_mode")

// --------------------------------------------------
// DATA
// --------------------------------------------------

const rectangle = {
  x: 80,
  y: 80,
  width: 160,
  height: 100,
  color: "#3498db",
};

const movingBall = {
  x: 350,
  y: 300,
  radius: 25,
  speedX: 2,
  speedY: 2,
  color: "#9b59b6",
};

const player = {
  x: 600,
  y: 350,
  width: 50,
  height: 50,
  speed: 5,
  color: "#e67e22",
};

const mouse = {
  x: 0,
  y: 0,
};

const keys = {};

const colors = ["#9b59b6", "#e74c3c", "#2ecc71", "#f1c40f", "#3498db"];

let colorIndex = 0;

let firstClickX, firstClickY;

let isDragging = false;

let circles = [];

// --------------------------------------------------
// CANVAS
// --------------------------------------------------

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --------------------------------------------------
// DRAW
// --------------------------------------------------

function drawRectangle() {
  ctx.fillStyle = rectangle.color;

  ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
}

function drawLine() {
  ctx.beginPath();

  ctx.moveTo(300, 80);
  ctx.lineTo(500, 180);

  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 5;

  ctx.stroke();
}

function drawCircle() {
  ctx.beginPath();

  ctx.arc(650, 120, 60, 0, Math.PI * 2);

  ctx.fillStyle = "#2ecc71";
  ctx.fill();
}

function drawTriangle() {
  ctx.beginPath();

  ctx.moveTo(150, 300);
  ctx.lineTo(80, 430);
  ctx.lineTo(220, 430);

  ctx.closePath();

  ctx.fillStyle = "#f39c12";
  ctx.fill();

  ctx.strokeStyle = "#8a5705";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawMovingBall() {
  ctx.beginPath();

  ctx.arc(movingBall.x, movingBall.y, movingBall.radius, 0, Math.PI * 2);

  ctx.fillStyle = movingBall.color;
  ctx.fill();
}

function drawPlayer() {
  ctx.fillStyle = player.color;

  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawMouseCoordinate() {
  ctx.fillStyle = "#222";
  ctx.font = "16px Arial";

  ctx.fillText(
    `Mouse: (${Math.round(mouse.x)}, ${Math.round(mouse.y)})`,
    20,
    30,
  );
}

function drawLineToMouse(startX, startY) {
  if (!isDragging) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  let distX = startX - mouse.x;
  let distY = startY - mouse.y;
  let reverseX = mouse.x + distX * 2;
  let reverseY = mouse.y + distY * 2;

  ctx.lineTo(reverseX, reverseY);
  ctx.closePath();

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawCircleOnMouse(mouseX, mouseY) {
  if (!isDragging) {
    return;
  }
  ctx.beginPath();

  ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#2ecc71";
  ctx.fill();
}

function drawMultipleCircles() {
  if (circles.length === 0) {
    return;
  }
  for (const c of circles) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = c.color;
    ctx.fill();
  }
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

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
    colorIndex = (colorIndex + 1) % colors.length;
    movingBall.color = colors[colorIndex];
  }
}

function updatePlayer() {
  if (keys["ArrowLeft"]) {
    player.x -= player.speed;
  }
  function drawCircle() {
    ctx.beginPath();

    ctx.arc(650, 120, 60, 0, Math.PI * 2);

    ctx.fillStyle = "#2ecc71";
    ctx.fill();
  }

  if (keys["ArrowRight"]) {
    player.x += player.speed;
  }

  if (keys["ArrowUp"]) {
    player.y -= player.speed;
  }

  if (keys["ArrowDown"]) {
    player.y += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------

canvas.addEventListener("mousemove", function (event) {
  const rect = canvas.getBoundingClientRect();

  mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);

  mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener("click", function () {
  colorIndex = (colorIndex + 1) % colors.length;
  player.color = colors[colorIndex];
});

canvas.addEventListener("mousedown", function (e) {
  isDragging = true;
});

canvas.addEventListener("mouseup", function (e) {
  isDragging = false;

  colorIndex = (colorIndex + 1) % colors.length;
  let circle = {
    x: mouse.x,
    y: mouse.y,
    radius: 20,
    color: colors[colorIndex],
  };
  circles.push(circle);

  clearCanvas();
});

window.addEventListener("keydown", function (event) {
  const controlledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

  if (controlledKeys.includes(event.key)) {
    event.preventDefault();
  }

  // State-based:
  // simpan status tombol untuk translasi kontinu.
  keys[event.key] = true;

  // Event-based:
  // contoh aksi diskrit sekali tekan.
  if (event.key.toLowerCase() === "r" && !event.repeat) {
    player.x = 600;
    player.y = 350;
  }
});

window.addEventListener("keyup", function (event) {
  keys[event.key] = false;
});

// --------------------------------------------------
// ANIMATION LOOP
// --------------------------------------------------

function animate() {
  if (trail_mode.value === "no_trail") {
    clearCanvas();
  }

  updateMovingBall();
  updatePlayer();

  drawRectangle();
  drawLine();
  drawCircle();
  drawTriangle();
  drawMovingBall();
  drawPlayer();
  drawMouseCoordinate();
  drawCircleOnMouse(mouse.x, mouse.y);
  drawMultipleCircles();

  requestAnimationFrame(animate);
}

animate();