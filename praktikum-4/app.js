/**
 * Praktikum 4: Camera, Projection & 3D dengan WebGL
 * Kelompok YOLO
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 *
 * Standalone Script: Universal compatibility (file:/// and http://)
 * Fitur & Tantangan:
 * - WebGL2 Context & GLSL ES 3.00 Shader Pipeline
 * - 3D Cube Geometri (36 vertex) dengan Face Colors
 * - Pustaka Matriks 4x4 Mandiri (math3d.js): Model, View (lookAt), Projection (perspective, ortho)
 * - Depth Test (Z-Buffer) & Multiple Cube Depth Demonstration (Challenge E)
 * - Orbit Camera (polar coordinate r cos theta, r sin theta) (Challenge A)
 * - Camera Height Control (PageUp/PageDown, Space/Shift, Y-slider) (Challenge B)
 * - Dynamic Target Control (LookAt focal target sliders) (Challenge C)
 * - Split-Screen Comparison Mode (Perspective vs Ortho side-by-side) (Challenge D)
 * - FOV Presets 35°, 60°, 90° (Challenge F)
 * - Live Camera HUD & 4x4 Matrix Visualizer
 * - Pause / Resume (P) & Reset View (R)
 */

(function () {
  "use strict";

  // --- 1. INISIALISASI WEBGL2 CONTEXT ---
  const canvas = document.getElementById("grafkom-canvas");
  if (!canvas) {
    console.error("Canvas #grafkom-canvas tidak ditemukan.");
    return;
  }

  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) {
    alert("Browser Anda tidak mendukung WebGL2. Silakan gunakan browser modern.");
    return;
  }

  // --- 2. SHADERS GLSL ES 3.00 ---
  const vertexShaderSource = `#version 300 es
  in vec3 a_position;
  in vec4 a_color;

  uniform mat4 u_model;
  uniform mat4 u_view;
  uniform mat4 u_projection;

  out vec4 v_color;

  void main() {
    // Pipeline Transformasi 3D Standar: Model -> View -> Projection
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    v_color = a_color;
  }`;

  const fragmentShaderSource = `#version 300 es
  precision highp float;

  in vec4 v_color;
  out vec4 fragColor;

  void main() {
    fragColor = v_color;
  }`;

  function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  // Shader locations
  const aPositionLoc = gl.getAttribLocation(program, "a_position");
  const aColorLoc = gl.getAttribLocation(program, "a_color");
  const uModelLoc = gl.getUniformLocation(program, "u_model");
  const uViewLoc = gl.getUniformLocation(program, "u_view");
  const uProjectionLoc = gl.getUniformLocation(program, "u_projection");

  // --- 3. GEOMETRI KUBUS 3D (36 Vertices dengan Warna per Sisi) ---
  // Unit cube dari -1.0 s/d +1.0
  const cubePositions = new Float32Array([
    // Front face (Z = +1)
    -1.0, -1.0,  1.0,   1.0, -1.0,  1.0,   1.0,  1.0,  1.0,
    -1.0, -1.0,  1.0,   1.0,  1.0,  1.0,  -1.0,  1.0,  1.0,
    // Back face (Z = -1)
    -1.0, -1.0, -1.0,  -1.0,  1.0, -1.0,   1.0,  1.0, -1.0,
    -1.0, -1.0, -1.0,   1.0,  1.0, -1.0,   1.0, -1.0, -1.0,
    // Top face (Y = +1)
    -1.0,  1.0, -1.0,  -1.0,  1.0,  1.0,   1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,   1.0,  1.0,  1.0,   1.0,  1.0, -1.0,
    // Bottom face (Y = -1)
    -1.0, -1.0, -1.0,   1.0, -1.0, -1.0,   1.0, -1.0,  1.0,
    -1.0, -1.0, -1.0,   1.0, -1.0,  1.0,  -1.0, -1.0,  1.0,
    // Right face (X = +1)
     1.0, -1.0, -1.0,   1.0,  1.0, -1.0,   1.0,  1.0,  1.0,
     1.0, -1.0, -1.0,   1.0,  1.0,  1.0,   1.0, -1.0,  1.0,
    // Left face (X = -1)
    -1.0, -1.0, -1.0,  -1.0, -1.0,  1.0,  -1.0,  1.0,  1.0,
    -1.0, -1.0, -1.0,  -1.0,  1.0,  1.0,  -1.0,  1.0, -1.0
  ]);

  // Palet Apple HIG: Cyan, Red, Yellow, Magenta, Green, Blue
  const faceColors = [
    [0.20, 0.78, 1.00, 1.0], // Front: Apple Cyan
    [1.00, 0.27, 0.33, 1.0], // Back: Apple Red
    [1.00, 0.84, 0.04, 1.0], // Top: Apple Gold / Yellow
    [0.75, 0.35, 0.95, 1.0], // Bottom: Apple Purple
    [0.19, 0.82, 0.35, 1.0], // Right: Apple Green
    [1.00, 0.62, 0.04, 1.0]  // Left: Apple Orange
  ];

  const cubeColors = new Float32Array(36 * 4);
  for (let face = 0; face < 6; face++) {
    const col = faceColors[face];
    for (let v = 0; v < 6; v++) {
      const idx = (face * 6 + v) * 4;
      cubeColors[idx + 0] = col[0];
      cubeColors[idx + 1] = col[1];
      cubeColors[idx + 2] = col[2];
      cubeColors[idx + 3] = col[3];
    }
  }

  // VAO & Buffers
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

  const colBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aColorLoc);
  gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // --- 4. STATE MANAJEMEN APLIKASI ---
  const state = {
    // Camera Transform
    camera: {
      eye: [0.0, 2.5, 7.5],
      target: [0.0, 0.0, 0.0],
      up: [0.0, 1.0, 0.0],
      orbitRadius: 7.9,
      orbitAngle: Math.PI / 2, // 90 deg (looking from +Z)
      orbitElevation: 2.5,
      isOrbiting: true,
      orbitSpeed: 0.6 // rad/s
    },
    // Projection Settings
    projection: {
      type: "perspective", // 'perspective' | 'ortho'
      fovDeg: 60.0,
      near: 0.1,
      far: 100.0,
      orthoSize: 4.5
    },
    // Features & Challenges
    splitMode: false,        // Challenge D: Split Viewport
    depthTestEnabled: true,  // Challenge E: Depth Test
    multiCubeMode: true,     // Challenge E: 3 Cubes at depth
    autoRotateCube: true,
    cubeRotationSpeed: 30.0, // deg/s
    cubeAngle: 0.0,
    // Dynamics & Simulation
    isPaused: false,
    moveSpeed: 3.5, // unit/s
    keysDown: {},
    mouse: {
      isDragging: false,
      lastX: 0,
      lastY: 0
    }
  };

  // --- 5. DOM ELEMENTS ---
  const resStat = document.getElementById("res-stat");
  const fpsStat = document.getElementById("fps-stat");
  const dtStat = document.getElementById("dt-stat");
  const modeStat = document.getElementById("mode-stat");
  const livePill = document.getElementById("live-pill");

  // HUD Elements
  const eyePosInfo = document.getElementById("eyePosInfo");
  const targetPosInfo = document.getElementById("targetPosInfo");
  const fovInfo = document.getElementById("fovInfo");
  const projModeInfo = document.getElementById("projModeInfo");
  const depthTestInfo = document.getElementById("depthTestInfo");
  const coordsDisplay = document.getElementById("coords-display");
  const matrixText = document.getElementById("matrixText");

  // Split Overlays
  const splitLabels = document.getElementById("split-labels-overlay");
  const splitDivider = document.getElementById("split-divider-line");

  // Toolbar & Buttons
  const btnPerspective = document.getElementById("btn-proj-persp");
  const btnOrtho = document.getElementById("btn-proj-ortho");
  const btnSplit = document.getElementById("btn-toggle-split");
  const btnOrbit = document.getElementById("btn-toggle-orbit");
  const btnDepth = document.getElementById("btn-toggle-depth");
  const btnMulticube = document.getElementById("btn-toggle-multicube");
  const btnRotateCube = document.getElementById("btn-toggle-rot-cube");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnResetTop = document.getElementById("canvas-reset-btn");
  const btnFullscreen = document.getElementById("canvas-fullscreen-btn");

  // FOV Presets
  const preset1 = document.getElementById("preset-1");
  const preset2 = document.getElementById("preset-2");
  const preset3 = document.getElementById("preset-3");

  // Sliders
  const fovSlider = document.getElementById("fovSlider");
  const fovVal = document.getElementById("fovVal");
  const camHeightSlider = document.getElementById("camHeightSlider");
  const camHeightVal = document.getElementById("camHeightVal");
  const orbitSpeedSlider = document.getElementById("orbitSpeedSlider");
  const orbitSpeedVal = document.getElementById("orbitSpeedVal");
  const targetXSlider = document.getElementById("targetXSlider");
  const targetXVal = document.getElementById("targetXVal");
  const targetYSlider = document.getElementById("targetYSlider");
  const targetYVal = document.getElementById("targetYVal");

  // --- 6. EVENT LISTENERS & SHORTCUTS ---
  function updateUIControls() {
    if (btnPerspective && btnOrtho) {
      btnPerspective.classList.toggle("active", state.projection.type === "perspective" && !state.splitMode);
      btnOrtho.classList.toggle("active", state.projection.type === "ortho" && !state.splitMode);
    }
    if (btnSplit) {
      btnSplit.classList.toggle("active", state.splitMode);
      if (splitLabels) splitLabels.classList.toggle("active", state.splitMode);
      if (splitDivider) splitDivider.classList.toggle("active", state.splitMode);
    }
    if (btnOrbit) btnOrbit.classList.toggle("active", state.camera.isOrbiting);
    if (btnDepth) btnDepth.classList.toggle("active", state.depthTestEnabled);
    if (btnMulticube) btnMulticube.classList.toggle("active", state.multiCubeMode);
    if (btnRotateCube) btnRotateCube.classList.toggle("active", state.autoRotateCube);

    if (projModeInfo) {
      projModeInfo.textContent = state.splitMode ? "SPLIT (Persp | Ortho)" : state.projection.type.toUpperCase();
    }
    if (depthTestInfo) {
      depthTestInfo.textContent = state.depthTestEnabled ? "ON (gl.DEPTH_TEST)" : "OFF (Disabled)";
      depthTestInfo.className = state.depthTestEnabled ? "hud-item-val active-mode" : "hud-item-val highlight";
    }

    if (btnPause && livePill) {
      if (state.isPaused) {
        livePill.classList.add("paused");
        livePill.innerHTML = "<i></i> PAUSED";
        btnPause.classList.add("btn-danger-subtle");
      } else {
        livePill.classList.remove("paused");
        livePill.innerHTML = "<i></i> LIVE";
        btnPause.classList.remove("btn-danger-subtle");
      }
    }

    if (fovSlider && fovVal) {
      fovSlider.value = state.projection.fovDeg;
      fovVal.textContent = Math.round(state.projection.fovDeg) + "°";
    }
    if (camHeightSlider && camHeightVal) {
      camHeightSlider.value = state.camera.eye[1].toFixed(2);
      camHeightVal.textContent = state.camera.eye[1].toFixed(2);
    }
    if (orbitSpeedSlider && orbitSpeedVal) {
      orbitSpeedSlider.value = state.camera.orbitSpeed.toFixed(2);
      orbitSpeedVal.textContent = state.camera.orbitSpeed.toFixed(2) + " rad/s";
    }
    if (targetXSlider && targetXVal) {
      targetXSlider.value = state.camera.target[0].toFixed(2);
      targetXVal.textContent = state.camera.target[0].toFixed(2);
    }
    if (targetYSlider && targetYVal) {
      targetYSlider.value = state.camera.target[1].toFixed(2);
      targetYVal.textContent = state.camera.target[1].toFixed(2);
    }

    // FOV preset highlights
    if (preset1 && preset2 && preset3) {
      preset1.classList.toggle("active", Math.abs(state.projection.fovDeg - 35) < 1);
      preset2.classList.toggle("active", Math.abs(state.projection.fovDeg - 60) < 1);
      preset3.classList.toggle("active", Math.abs(state.projection.fovDeg - 90) < 1);
    }
  }

  // Projection toggles
  if (btnPerspective) {
    btnPerspective.addEventListener("click", () => {
      state.projection.type = "perspective";
      state.splitMode = false;
      updateUIControls();
    });
  }
  if (btnOrtho) {
    btnOrtho.addEventListener("click", () => {
      state.projection.type = "ortho";
      state.splitMode = false;
      updateUIControls();
    });
  }
  if (btnSplit) {
    btnSplit.addEventListener("click", () => {
      state.splitMode = !state.splitMode;
      updateUIControls();
    });
  }
  if (btnOrbit) {
    btnOrbit.addEventListener("click", () => {
      state.camera.isOrbiting = !state.camera.isOrbiting;
      updateUIControls();
    });
  }
  if (btnDepth) {
    btnDepth.addEventListener("click", () => {
      state.depthTestEnabled = !state.depthTestEnabled;
      updateUIControls();
    });
  }
  if (btnMulticube) {
    btnMulticube.addEventListener("click", () => {
      state.multiCubeMode = !state.multiCubeMode;
      updateUIControls();
    });
  }
  if (btnRotateCube) {
    btnRotateCube.addEventListener("click", () => {
      state.autoRotateCube = !state.autoRotateCube;
      updateUIControls();
    });
  }

  // Presets
  function setFOV(deg) {
    state.projection.fovDeg = deg;
    state.projection.type = "perspective";
    updateUIControls();
  }
  if (preset1) preset1.addEventListener("click", () => setFOV(35));
  if (preset2) preset2.addEventListener("click", () => setFOV(60));
  if (preset3) preset3.addEventListener("click", () => setFOV(90));

  // Sliders
  if (fovSlider) {
    fovSlider.addEventListener("input", (e) => {
      state.projection.fovDeg = parseFloat(e.target.value);
      if (fovVal) fovVal.textContent = Math.round(state.projection.fovDeg) + "°";
      updateUIControls();
    });
  }
  if (camHeightSlider) {
    camHeightSlider.addEventListener("input", (e) => {
      state.camera.eye[1] = parseFloat(e.target.value);
      state.camera.orbitElevation = state.camera.eye[1];
      if (camHeightVal) camHeightVal.textContent = state.camera.eye[1].toFixed(2);
    });
  }
  if (orbitSpeedSlider) {
    orbitSpeedSlider.addEventListener("input", (e) => {
      state.camera.orbitSpeed = parseFloat(e.target.value);
      if (orbitSpeedVal) orbitSpeedVal.textContent = state.camera.orbitSpeed.toFixed(2) + " rad/s";
    });
  }
  if (targetXSlider) {
    targetXSlider.addEventListener("input", (e) => {
      state.camera.target[0] = parseFloat(e.target.value);
      if (targetXVal) targetXVal.textContent = state.camera.target[0].toFixed(2);
    });
  }
  if (targetYSlider) {
    targetYSlider.addEventListener("input", (e) => {
      state.camera.target[1] = parseFloat(e.target.value);
      if (targetYVal) targetYVal.textContent = state.camera.target[1].toFixed(2);
    });
  }

  function resetCamera() {
    state.camera.eye = [0.0, 2.5, 7.5];
    state.camera.target = [0.0, 0.0, 0.0];
    state.camera.up = [0.0, 1.0, 0.0];
    state.camera.orbitRadius = 7.9;
    state.camera.orbitAngle = Math.PI / 2;
    state.camera.orbitElevation = 2.5;
    state.camera.isOrbiting = true;
    state.camera.orbitSpeed = 0.6;
    state.projection.type = "perspective";
    state.projection.fovDeg = 60.0;
    state.splitMode = false;
    state.depthTestEnabled = true;
    state.multiCubeMode = true;
    state.autoRotateCube = true;
    state.cubeAngle = 0.0;
    updateUIControls();
  }

  if (btnReset) btnReset.addEventListener("click", resetCamera);
  if (btnResetTop) btnResetTop.addEventListener("click", resetCamera);

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      state.isPaused = !state.isPaused;
      updateUIControls();
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        canvas.parentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request error:", err);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    state.keysDown[e.code] = true;

    // Hotkey triggers
    if (e.code === "KeyP") {
      state.isPaused = !state.isPaused;
      updateUIControls();
    } else if (e.code === "KeyR") {
      resetCamera();
    } else if (e.code === "Digit1") {
      setFOV(35);
    } else if (e.code === "Digit2") {
      setFOV(60);
    } else if (e.code === "Digit3") {
      setFOV(90);
    } else if (e.code === "KeyT") {
      state.projection.type = state.projection.type === "perspective" ? "ortho" : "perspective";
      state.splitMode = false;
      updateUIControls();
    } else if (e.code === "KeyO") {
      state.camera.isOrbiting = !state.camera.isOrbiting;
      updateUIControls();
    } else if (e.code === "KeyZ") {
      state.depthTestEnabled = !state.depthTestEnabled;
      updateUIControls();
    } else if (e.code === "KeyM") {
      state.splitMode = !state.splitMode;
      updateUIControls();
    }
  });

  window.addEventListener("keyup", (e) => {
    state.keysDown[e.code] = false;
  });

  // Mouse interaction for Orbit / Look
  canvas.addEventListener("mousedown", (e) => {
    state.mouse.isDragging = true;
    state.mouse.lastX = e.clientX;
    state.mouse.lastY = e.clientY;
    state.camera.isOrbiting = false;
    updateUIControls();
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const u = (x / rect.width).toFixed(2);
      const v = (1.0 - y / rect.height).toFixed(2);
      if (coordsDisplay) coordsDisplay.textContent = `Pixel: ${x}px, ${y}px | UV: (${u}, ${v})`;
    }

    if (state.mouse.isDragging) {
      const dx = e.clientX - state.mouse.lastX;
      const dy = e.clientY - state.mouse.lastY;
      state.mouse.lastX = e.clientX;
      state.mouse.lastY = e.clientY;

      state.camera.orbitAngle -= dx * 0.007;
      state.camera.orbitElevation += dy * 0.02;
      // Clamp elevation
      state.camera.orbitElevation = Math.max(-5.0, Math.min(8.0, state.camera.orbitElevation));
      state.camera.eye[1] = state.camera.orbitElevation;
      updateUIControls();
    }
  });

  window.addEventListener("mouseup", () => {
    state.mouse.isDragging = false;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.camera.orbitRadius += e.deltaY * 0.005;
    state.camera.orbitRadius = Math.max(2.5, Math.min(20.0, state.camera.orbitRadius));
    state.projection.orthoSize = state.camera.orbitRadius * 0.55;
  }, { passive: false });

  // --- 7. MATRIX HELPER FORMATTER ---
  function formatMatrix4(m) {
    function f(val) {
      const s = val.toFixed(2);
      return (val >= 0 ? " " : "") + s;
    }
    return [
      `┌ ${f(m[0])}  ${f(m[4])}  ${f(m[8])}  ${f(m[12])} ┐`,
      `│ ${f(m[1])}  ${f(m[5])}  ${f(m[9])}  ${f(m[13])} │`,
      `│ ${f(m[2])}  ${f(m[6])}  ${f(m[10])}  ${f(m[14])} │`,
      `└ ${f(m[3])}  ${f(m[7])}  ${f(m[11])}  ${f(m[15])} ┘`
    ].join("\n");
  }

  // --- 8. RENDER LOOP DENGAN DELTA TIME ---
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  // Matrices allocation (reused to prevent GC thrashing)
  const mat4 = window.mat4 || window.Math3D.mat4;
  const mModel = mat4.create();
  const mView = mat4.create();
  const mProjection = mat4.create();
  const mModelTemp = mat4.create();

  function render(now) {
    requestAnimationFrame(render);

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      const currentFps = Math.round(frameCount / fpsTimer);
      if (fpsStat) fpsStat.textContent = currentFps + " FPS";
      if (dtStat) dtStat.textContent = (dt * 1000).toFixed(1) + " ms";
      frameCount = 0;
      fpsTimer = 0;
    }

    // Continuous input handling (WASD & PageUp/PageDown)
    if (!state.isPaused) {
      const speed = state.moveSpeed * dt;
      let eyeChanged = false;

      if (state.keysDown["KeyW"]) {
        // Forward
        state.camera.orbitRadius = Math.max(2.5, state.camera.orbitRadius - speed * 1.5);
        eyeChanged = true;
      }
      if (state.keysDown["KeyS"]) {
        // Backward
        state.camera.orbitRadius = Math.min(20.0, state.camera.orbitRadius + speed * 1.5);
        eyeChanged = true;
      }
      if (state.keysDown["KeyA"]) {
        state.camera.orbitAngle += speed;
        eyeChanged = true;
      }
      if (state.keysDown["KeyD"]) {
        state.camera.orbitAngle -= speed;
        eyeChanged = true;
      }
      // Height control (Challenge B)
      if (state.keysDown["KeyE"] || state.keysDown["Space"] || state.keysDown["PageUp"]) {
        state.camera.orbitElevation += speed * 1.5;
        eyeChanged = true;
      }
      if (state.keysDown["KeyQ"] || state.keysDown["ShiftLeft"] || state.keysDown["PageDown"]) {
        state.camera.orbitElevation -= speed * 1.5;
        eyeChanged = true;
      }

      // Orbit animation (Challenge A)
      if (state.camera.isOrbiting) {
        state.camera.orbitAngle += state.camera.orbitSpeed * dt;
        eyeChanged = true;
      }

      // Cube rotation
      if (state.autoRotateCube) {
        state.cubeAngle += (state.cubeRotationSpeed * Math.PI / 180) * dt;
      }

      if (eyeChanged) {
        state.camera.eye[0] = state.camera.target[0] + state.camera.orbitRadius * Math.cos(state.camera.orbitAngle);
        state.camera.eye[2] = state.camera.target[2] + state.camera.orbitRadius * Math.sin(state.camera.orbitAngle);
        state.camera.eye[1] = state.camera.orbitElevation;
        updateUIControls();
      }
    }

    // Canvas resize handling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      if (resStat) resStat.textContent = `${canvas.clientWidth} × ${canvas.clientHeight} px`;
    }

    // Depth test activation (Challenge E)
    if (state.depthTestEnabled) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }

    // Update Live HUD telemetry
    if (eyePosInfo) {
      const e = state.camera.eye;
      eyePosInfo.textContent = `(${e[0].toFixed(2)}, ${e[1].toFixed(2)}, ${e[2].toFixed(2)})`;
    }
    if (targetPosInfo) {
      const t = state.camera.target;
      targetPosInfo.textContent = `(${t[0].toFixed(2)}, ${t[1].toFixed(2)}, ${t[2].toFixed(2)})`;
    }
    if (fovInfo) {
      fovInfo.textContent = `${Math.round(state.projection.fovDeg)}° (Preset)`;
    }
    if (projModeInfo) {
      projModeInfo.textContent = state.splitMode ? "SPLIT (Persp | Ortho)" : state.projection.type.toUpperCase();
    }
    if (depthTestInfo) {
      depthTestInfo.textContent = state.depthTestEnabled ? "ON (Z-Buffer Active)" : "OFF (Z-Fighting / No Test)";
      depthTestInfo.className = state.depthTestEnabled ? "hud-item-val active-mode" : "hud-item-val highlight";
    }

    // --- DRAW SCENE PASS ---
    function renderViewport(vx, vy, vw, vh, projType) {
      gl.viewport(vx, vy, vw, vh);
      gl.scissor(vx, vy, vw, vh);

      const aspect = vw / vh;

      // Projection Matrix
      if (projType === "perspective") {
        const fovRad = (state.projection.fovDeg * Math.PI) / 180;
        mat4.perspective(mProjection, fovRad, aspect, state.projection.near, state.projection.far);
      } else {
        const hSize = state.projection.orthoSize;
        const wSize = hSize * aspect;
        mat4.ortho(mProjection, -wSize, wSize, -hSize, hSize, state.projection.near, state.projection.far);
      }
      gl.uniformMatrix4fv(uProjectionLoc, false, mProjection);

      // View Matrix (LookAt)
      mat4.lookAt(mView, state.camera.eye, state.camera.target, state.camera.up);
      gl.uniformMatrix4fv(uViewLoc, false, mView);

      gl.bindVertexArray(vao);

      // Cube 1: Primary Center Cube (Z = 0)
      mat4.identity(mModel);
      mat4.rotateY(mModel, mModel, state.cubeAngle);
      mat4.rotateX(mModel, mModel, state.cubeAngle * 0.7);
      gl.uniformMatrix4fv(uModelLoc, false, mModel);
      gl.drawArrays(gl.TRIANGLES, 0, 36);

      // Multiple Cubes for Depth Test (Challenge E)
      if (state.multiCubeMode) {
        // Cube 2: Middle Depth Cube (Z = -2.5, scaled down)
        mat4.identity(mModelTemp);
        mat4.translate(mModelTemp, mModelTemp, [-2.2, 0.3, -2.5]);
        mat4.rotateY(mModelTemp, mModelTemp, -state.cubeAngle * 1.2);
        mat4.scale(mModelTemp, mModelTemp, [0.8, 0.8, 0.8]);
        gl.uniformMatrix4fv(uModelLoc, false, mModelTemp);
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        // Cube 3: Far Depth Cube (Z = -5.0, scaled down)
        mat4.identity(mModelTemp);
        mat4.translate(mModelTemp, mModelTemp, [2.2, -0.2, -5.0]);
        mat4.rotateX(mModelTemp, mModelTemp, state.cubeAngle * 0.9);
        mat4.scale(mModelTemp, mModelTemp, [0.9, 0.9, 0.9]);
        gl.uniformMatrix4fv(uModelLoc, false, mModelTemp);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
      }

      gl.bindVertexArray(null);
    }

    // Clear background
    gl.clearColor(0.02, 0.04, 0.08, 1.0);
    gl.enable(gl.SCISSOR_TEST);

    if (state.splitMode) {
      // Split Screen Mode (Challenge D):
      // Left Viewport: Perspective
      const halfW = Math.floor(canvas.width / 2);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.scissor(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      renderViewport(0, 0, halfW, canvas.height, "perspective");
      renderViewport(halfW, 0, canvas.width - halfW, canvas.height, "ortho");
    } else {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.scissor(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      renderViewport(0, 0, canvas.width, canvas.height, state.projection.type);
    }

    gl.disable(gl.SCISSOR_TEST);

    // Live 4x4 View Matrix visualizer output
    if (matrixText) {
      matrixText.textContent = formatMatrix4(mView);
    }
  }

  // Initial trigger
  updateUIControls();
  requestAnimationFrame(render);
})();
