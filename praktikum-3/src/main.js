/**
 * Praktikum Grafika Komputer - Pertemuan 3
 * Interactive Transformation & Coordinate System dengan WebGL2
 *
 * Kelompok: Kelompok YOLO
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 *
 * ES Module Source (digunakan untuk Vite dev server / modern bundling)
 */

import { Mat3, degToRad } from "./matrix3.js";

// --- 1. INISIALISASI WEBGL2 CONTEXT & SHADERS ---
const canvas = document.getElementById("glCanvas");
if (!canvas) throw new Error("Canvas #glCanvas tidak ditemukan.");

const gl = canvas.getContext("webgl2", { antialias: true });
if (!gl) {
  const errBox = document.getElementById("webgl-error-box");
  if (errBox) errBox.style.display = "block";
  throw new Error("WebGL2 tidak tersedia.");
}

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;

void main() {
  vec3 transformed = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(transformed.xy, 0.0, 1.0);
  gl_PointSize = 8.0;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = u_color;
}`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compilation error: " + info);
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error("Program link error: " + gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const positionLoc = gl.getAttribLocation(program, "a_position");
const matrixLoc = gl.getUniformLocation(program, "u_matrix");
const colorLoc = gl.getUniformLocation(program, "u_color");

// --- 2. GPU GEOMETRY BUFFERS (LOCAL COORDINATES) ---
const triangleVertices = new Float32Array([
  -0.16, -0.13,
   0.16, -0.13,
   0.00,  0.18,
]);

const axesVertices = new Float32Array([
  -1.0,  0.0,
   1.0,  0.0,
   0.0, -1.0,
   0.0,  1.0,
]);

const pivotVertices = new Float32Array([0.0, 0.0]);

function createBuffer(data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

const triangleBuffer = createBuffer(triangleVertices);
const axesBuffer = createBuffer(axesVertices);
const pivotBuffer = createBuffer(pivotVertices);

function bindBuffer(buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
}

// --- 3. KOMPOSISI MATRIKS ---
function createTRS(o) {
  const t = Mat3.translation(o.x, o.y);
  const r = Mat3.rotation(degToRad(o.rotation));
  const s = Mat3.scaling(o.scaleX, o.scaleY);
  return Mat3.multiply(Mat3.multiply(t, r), s);
}

function createRT(o) {
  const t = Mat3.translation(o.x, o.y);
  const r = Mat3.rotation(degToRad(o.rotation));
  const s = Mat3.scaling(o.scaleX, o.scaleY);
  return Mat3.multiply(Mat3.multiply(r, t), s);
}

// --- 4. STATE SCENE & OBJEK ---
const defaultObjectA = {
  x: -0.38,
  y: 0.0,
  rotation: 0.0,
  scaleX: 1.0,
  scaleY: 1.0,
};
const objectA = { ...defaultObjectA };

const colorA     = new Float32Array([0.20, 0.85, 1.00, 1.00]);
const colorB     = new Float32Array([1.00, 0.40, 0.32, 1.00]);
const colorChild = new Float32Array([1.00, 0.82, 0.28, 1.00]);
const colorOrbit = new Float32Array([0.40, 0.95, 0.60, 1.00]);
const colorAxes  = new Float32Array([0.45, 0.60, 0.75, 0.50]);
const colorPivot = new Float32Array([1.00, 1.00, 1.00, 1.00]);
const colorWorld = new Float32Array([1.00, 0.30, 0.30, 1.00]);

const PRESETS = {
  1: { x: -0.40, y:  0.20, rotation:   0.0, scaleX: 1.00, scaleY: 1.00 },
  2: { x:  0.00, y:  0.00, rotation:  45.0, scaleX: 1.50, scaleY: 1.50 },
  3: { x:  0.30, y: -0.20, rotation:  90.0, scaleX: 1.80, scaleY: 0.60 },
};

let isPaused = false;
let transformOrder = "TRS";
let showAxes = true;
let showPivot = true;
let showAutoB = true;
let showChild = true;
let showOrbit = false;

let accumulatedSeconds = 0.0;
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = performance.now();
let currentFps = 60;
let currentDt = 0.016;

const keys = new Set();

// DOM references
const positionInfoEl = document.getElementById("positionInfo");
const rotationInfoEl = document.getElementById("rotationInfo");
const scaleInfoEl    = document.getElementById("scaleInfo");
const orderInfoEl    = document.getElementById("orderInfo");
const statusInfoEl   = document.getElementById("statusInfo");
const fpsStatEl      = document.getElementById("fps-stat");
const dtStatEl       = document.getElementById("dt-stat");
const resStatEl      = document.getElementById("res-stat");
const orderBadgeEl   = document.getElementById("order-mode-badge");
const livePillEl     = document.getElementById("live-pill");
const coordsDisplayEl= document.getElementById("coords-display");
const matrixTextEl   = document.getElementById("matrixText");

const moveSpeedSlider     = document.getElementById("moveSpeed");
const moveSpeedVal        = document.getElementById("moveSpeedVal");
const rotationSpeedSlider = document.getElementById("rotationSpeed");
const rotationSpeedVal    = document.getElementById("rotationSpeedVal");
const scaleSpeedSlider    = document.getElementById("scaleSpeed");
const scaleSpeedVal       = document.getElementById("scaleSpeedVal");

const pauseBtn       = document.getElementById("btn-pause");
const resetBtn       = document.getElementById("btn-reset");
const toggleOrderBtn = document.getElementById("btn-toggle-order");
const toggleAxesBtn  = document.getElementById("btn-toggle-axes");
const togglePivotBtn = document.getElementById("btn-toggle-pivot");
const toggleAutoBBtn = document.getElementById("btn-toggle-autob");
const toggleChildBtn = document.getElementById("btn-toggle-child");
const toggleOrbitBtn = document.getElementById("btn-toggle-orbit");

const preset1Btn = document.getElementById("preset-1");
const preset2Btn = document.getElementById("preset-2");
const preset3Btn = document.getElementById("preset-3");

function clampObjectA() {
  objectA.x = Math.max(-0.85, Math.min(0.85, objectA.x));
  objectA.y = Math.max(-0.80, Math.min(0.80, objectA.y));
  objectA.scaleX = Math.max(0.20, Math.min(2.50, objectA.scaleX));
  objectA.scaleY = Math.max(0.20, Math.min(2.50, objectA.scaleY));
}

function update(dt) {
  const moveSpeed     = moveSpeedSlider     ? Number(moveSpeedSlider.value)     : 0.65;
  const rotationSpeed = rotationSpeedSlider ? Number(rotationSpeedSlider.value) : 100.0;
  const scaleSpeed    = scaleSpeedSlider    ? Number(scaleSpeedSlider.value)    : 0.80;

  if (keys.has("arrowleft")  || keys.has("a")) objectA.x -= moveSpeed * dt;
  if (keys.has("arrowright") || keys.has("d")) objectA.x += moveSpeed * dt;
  if (keys.has("arrowup")    || keys.has("w")) objectA.y += moveSpeed * dt;
  if (keys.has("arrowdown")  || keys.has("s")) objectA.y -= moveSpeed * dt;

  if (keys.has("q")) objectA.rotation -= rotationSpeed * dt;
  if (keys.has("e")) objectA.rotation += rotationSpeed * dt;
  objectA.rotation = ((objectA.rotation % 360) + 360) % 360;

  if (keys.has("+") || keys.has("=") || keys.has("numpadadd")) {
    objectA.scaleX += scaleSpeed * dt;
    objectA.scaleY += scaleSpeed * dt;
  }
  if (keys.has("-") || keys.has("_") || keys.has("numpadsubtract")) {
    objectA.scaleX -= scaleSpeed * dt;
    objectA.scaleY -= scaleSpeed * dt;
  }

  if (keys.has("z")) objectA.scaleX -= scaleSpeed * dt;
  if (keys.has("x")) objectA.scaleX += scaleSpeed * dt;
  if (keys.has("c")) objectA.scaleY -= scaleSpeed * dt;
  if (keys.has("v")) objectA.scaleY += scaleSpeed * dt;

  clampObjectA();
}

function drawShape(matrix, color, count = 3, mode = gl.TRIANGLES) {
  gl.uniformMatrix3fv(matrixLoc, false, matrix);
  gl.uniform4fv(colorLoc, color);
  gl.drawArrays(mode, 0, count);
}

function drawScene(timeSeconds) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.02, 0.04, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  if (showAxes) {
    bindBuffer(axesBuffer);
    drawShape(Mat3.identity(), colorAxes, 4, gl.LINES);
    bindBuffer(pivotBuffer);
    drawShape(Mat3.identity(), colorWorld, 1, gl.POINTS);
  }

  bindBuffer(triangleBuffer);

  const matrixA = transformOrder === "TRS" ? createTRS(objectA) : createRT(objectA);
  drawShape(matrixA, colorA, 3, gl.TRIANGLES);

  if (showPivot) {
    bindBuffer(pivotBuffer);
    drawShape(matrixA, colorPivot, 1, gl.POINTS);
    bindBuffer(triangleBuffer);
  }

  if (showAutoB) {
    const scaleB = 1.0 + Math.sin(timeSeconds * 2.0) * 0.25;
    const matrixB = createTRS({
      x: 0.42,
      y: 0.12,
      rotation: timeSeconds * 70.0,
      scaleX: scaleB,
      scaleY: scaleB,
    });
    drawShape(matrixB, colorB, 3, gl.TRIANGLES);

    if (showPivot) {
      bindBuffer(pivotBuffer);
      drawShape(matrixB, colorPivot, 1, gl.POINTS);
      bindBuffer(triangleBuffer);
    }

    if (showOrbit) {
      const orbitCenter = Mat3.translation(0.42, 0.12);
      const orbitRotation = Mat3.rotation(degToRad(timeSeconds * 120.0));
      const orbitRadius = Mat3.translation(0.24, 0.0);
      const orbitScale = Mat3.scaling(0.35, 0.35);
      const orbitMatrix = Mat3.multiply(
        Mat3.multiply(Mat3.multiply(orbitCenter, orbitRotation), orbitRadius),
        orbitScale
      );
      drawShape(orbitMatrix, colorOrbit, 3, gl.TRIANGLES);
    }
  }

  if (showChild) {
    const childLocal = Mat3.multiply(Mat3.translation(0.26, 0.0), Mat3.scaling(0.45, 0.45));
    const childWorld = Mat3.multiply(matrixA, childLocal);
    drawShape(childWorld, colorChild, 3, gl.TRIANGLES);

    if (showPivot) {
      bindBuffer(pivotBuffer);
      drawShape(childWorld, colorPivot, 1, gl.POINTS);
      bindBuffer(triangleBuffer);
    }
  }

  updateHUD(matrixA);
}

function updateHUD(matrixA) {
  if (positionInfoEl) positionInfoEl.textContent = `(${objectA.x.toFixed(2)}, ${objectA.y.toFixed(2)})`;
  if (rotationInfoEl) rotationInfoEl.textContent = `${objectA.rotation.toFixed(1)}°`;
  if (scaleInfoEl)    scaleInfoEl.textContent    = `(${objectA.scaleX.toFixed(2)}, ${objectA.scaleY.toFixed(2)})`;
  if (orderInfoEl)    orderInfoEl.textContent    = transformOrder === "TRS" ? "T × R × S (In-Place)" : "R × T × S (Origin Orbit)";
  if (dtStatEl)       dtStatEl.textContent       = `${(currentDt * 1000).toFixed(1)} ms`;

  if (matrixTextEl && matrixA) {
    const m = matrixA;
    matrixTextEl.innerHTML =
      `┌ <span class="matrix-val">${m[0].toFixed(2)}</span>  <span class="matrix-val">${m[3].toFixed(2)}</span>  <span class="matrix-val highlight-trans">${m[6].toFixed(2)}</span> ┐\n` +
      `│ <span class="matrix-val">${m[1].toFixed(2)}</span>  <span class="matrix-val">${m[4].toFixed(2)}</span>  <span class="matrix-val highlight-trans">${m[7].toFixed(2)}</span> │\n` +
      `└ <span class="matrix-val">${m[2].toFixed(2)}</span>  <span class="matrix-val">${m[5].toFixed(2)}</span>  <span class="matrix-val">${m[8].toFixed(2)}</span> ┘`;
  }
}

export function togglePause() {
  isPaused = !isPaused;

  if (pauseBtn) {
    pauseBtn.classList.toggle("paused", isPaused);
    const label = pauseBtn.querySelector(".btn-label");
    if (label) label.textContent = isPaused ? "Resume" : "Pause";
  }

  if (livePillEl) {
    livePillEl.classList.toggle("paused", isPaused);
    livePillEl.innerHTML = isPaused ? "<i></i> PAUSED" : "<i></i> LIVE";
  }

  if (statusInfoEl) {
    statusInfoEl.textContent = isPaused ? "PAUSED" : "RUNNING";
    statusInfoEl.classList.toggle("paused", isPaused);
  }

  if (fpsStatEl && isPaused) {
    fpsStatEl.textContent = "PAUSED";
  }

  if (!isPaused) {
    lastTime = performance.now();
  }
}

function frame(time) {
  let dt = (time - lastTime) * 0.001;
  lastTime = time;

  dt = Math.min(dt, 0.05);
  currentDt = dt;

  if (!isPaused) {
    accumulatedSeconds += dt;
    update(dt);
    drawScene(accumulatedSeconds);

    frameCount++;
    if (time - fpsTimer >= 500) {
      currentFps = Math.round((frameCount * 1000) / (time - fpsTimer));
      if (fpsStatEl) fpsStatEl.textContent = `${currentFps} FPS`;
      fpsTimer = time;
      frameCount = 0;
    }
  }

  requestAnimationFrame(frame);
}

export function resetObjectA() {
  objectA.x = defaultObjectA.x;
  objectA.y = defaultObjectA.y;
  objectA.rotation = defaultObjectA.rotation;
  objectA.scaleX = defaultObjectA.scaleX;
  objectA.scaleY = defaultObjectA.scaleY;
  transformOrder = "TRS";
  updateOrderUI();
  drawScene(accumulatedSeconds);
}

export function applyPreset(id) {
  const p = PRESETS[id];
  if (!p) return;
  objectA.x = p.x;
  objectA.y = p.y;
  objectA.rotation = p.rotation;
  objectA.scaleX = p.scaleX;
  objectA.scaleY = p.scaleY;
  clampObjectA();

  [preset1Btn, preset2Btn, preset3Btn].forEach((btn, idx) => {
    if (btn) btn.classList.toggle("active", idx + 1 === id);
  });

  drawScene(accumulatedSeconds);
}

export function toggleTransformOrder() {
  transformOrder = transformOrder === "TRS" ? "RT" : "TRS";
  updateOrderUI();
  drawScene(accumulatedSeconds);
}

function updateOrderUI() {
  if (orderBadgeEl) {
    orderBadgeEl.textContent = transformOrder === "TRS" ? "Order: T × R × S" : "Order: R × T × S";
  }
  if (toggleOrderBtn) {
    const lbl = toggleOrderBtn.querySelector(".btn-label");
    if (lbl) lbl.textContent = `Mode: ${transformOrder}`;
    toggleOrderBtn.classList.toggle("active", transformOrder === "RT");
  }
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((e.clientX - rect.left) / rect.width) * 2.0 - 1.0;
  const ndcY = 1.0 - ((e.clientY - rect.top) / rect.height) * 2.0;

  objectA.x = Math.max(-0.85, Math.min(0.85, ndcX));
  objectA.y = Math.max(-0.80, Math.min(0.80, ndcY));

  drawScene(accumulatedSeconds);
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const pxX = Math.round(e.clientX - rect.left);
  const pxY = Math.round(e.clientY - rect.top);
  const ndcX = (((e.clientX - rect.left) / rect.width) * 2.0 - 1.0).toFixed(2);
  const ndcY = (1.0 - ((e.clientY - rect.top) / rect.height) * 2.0).toFixed(2);

  if (coordsDisplayEl) {
    coordsDisplayEl.innerHTML = `Pixel: ${pxX}px, ${pxY}px | NDC: <span>(${ndcX}, ${ndcY})</span>`;
  }
});

canvas.addEventListener("pointerleave", () => {
  if (coordsDisplayEl) {
    coordsDisplayEl.innerHTML = `Pixel: 0px, 0px | NDC: <span>(0.00, 0.00)</span>`;
  }
});

window.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
    e.preventDefault();
  }

  keys.add(k);

  if (e.repeat) return;

  if (k === "p") {
    togglePause();
  } else if (k === "r") {
    resetObjectA();
  } else if (k === "t") {
    toggleTransformOrder();
  } else if (k === "j") {
    showChild = !showChild;
    if (toggleChildBtn) toggleChildBtn.classList.toggle("active", showChild);
    drawScene(accumulatedSeconds);
  } else if (k === "o") {
    showOrbit = !showOrbit;
    if (toggleOrbitBtn) toggleOrbitBtn.classList.toggle("active", showOrbit);
    drawScene(accumulatedSeconds);
  } else if (k === "1") {
    applyPreset(1);
  } else if (k === "2") {
    applyPreset(2);
  } else if (k === "3") {
    applyPreset(3);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

if (pauseBtn) pauseBtn.onclick = togglePause;
if (resetBtn) resetBtn.onclick = resetObjectA;
if (toggleOrderBtn) toggleOrderBtn.onclick = toggleTransformOrder;

if (toggleAxesBtn) {
  toggleAxesBtn.onclick = () => {
    showAxes = !showAxes;
    toggleAxesBtn.classList.toggle("active", showAxes);
    drawScene(accumulatedSeconds);
  };
}
if (togglePivotBtn) {
  togglePivotBtn.onclick = () => {
    showPivot = !showPivot;
    togglePivotBtn.classList.toggle("active", showPivot);
    drawScene(accumulatedSeconds);
  };
}
if (toggleAutoBBtn) {
  toggleAutoBBtn.onclick = () => {
    showAutoB = !showAutoB;
    toggleAutoBBtn.classList.toggle("active", showAutoB);
    drawScene(accumulatedSeconds);
  };
}
if (toggleChildBtn) {
  toggleChildBtn.onclick = () => {
    showChild = !showChild;
    toggleChildBtn.classList.toggle("active", showChild);
    drawScene(accumulatedSeconds);
  };
}
if (toggleOrbitBtn) {
  toggleOrbitBtn.onclick = () => {
    showOrbit = !showOrbit;
    toggleOrbitBtn.classList.toggle("active", showOrbit);
    drawScene(accumulatedSeconds);
  };
}

if (preset1Btn) preset1Btn.onclick = () => applyPreset(1);
if (preset2Btn) preset2Btn.onclick = () => applyPreset(2);
if (preset3Btn) preset3Btn.onclick = () => applyPreset(3);

if (moveSpeedSlider && moveSpeedVal) {
  moveSpeedSlider.oninput = () => {
    moveSpeedVal.textContent = Number(moveSpeedSlider.value).toFixed(2);
  };
}
if (rotationSpeedSlider && rotationSpeedVal) {
  rotationSpeedSlider.oninput = () => {
    rotationSpeedVal.textContent = `${rotationSpeedSlider.value}°/s`;
  };
}
if (scaleSpeedSlider && scaleSpeedVal) {
  scaleSpeedSlider.oninput = () => {
    scaleSpeedVal.textContent = Number(scaleSpeedSlider.value).toFixed(2);
  };
}

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  if (resStatEl) {
    resStatEl.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
  }
  drawScene(accumulatedSeconds);
}

window.addEventListener("resize", handleResize);
handleResize();

updateOrderUI();
drawScene(0);
requestAnimationFrame(frame);
