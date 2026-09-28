/**
 * Praktikum 5: Lighting, Shading & Texture pada WebGL
 * Kelompok YOLO
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 *
 * Standalone Script: Universal compatibility (file:/// and http://)
 * Fitur & Tantangan Lengkap:
 * - Vektor Normal Per-Face & Per-Vertex
 * - Normal Matrix (Inverse-Transpose 3x3 dari Model Matrix)
 * - Model Pencahayaan Blinn-Phong: Ambient, Diffuse Lambertian, Specular Blinn
 * - Flat Shading vs Smooth Shading toggle (menggunakan dFdx/dFdy derivatives)
 * - 4 Tekstur Prosedural Canvas (Checkerboard, UV Grid, Circuit Tech, Marble)
 * - Challenge A: Image & Procedural Texture Switcher
 * - Challenge B: Ambient Light Intensity Control
 * - Challenge C: Interactive Camera & Light Position Controls
 * - Challenge D: Non-Uniform Scale Mode & Normal Matrix Test
 * - Challenge E: Light Orbit Animation
 * - Challenge F: Toggle Komponen Cahaya (Ambient, Diffuse, Specular)
 * - Challenge G: Mipmap Filtering Demonstration (Nearest, Linear, Trilinear)
 * - Live HUD Telemetry & Live Normal Matrix Visualizer
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

  // --- 2. SHADERS GLSL ES 3.00 (BLINN-PHONG + UV TEXTURE + DERIVATIVE FLAT SHADING) ---
  const vertexShaderSource = `#version 300 es
  in vec3 a_position;
  in vec3 a_normal;
  in vec2 a_texCoord;

  uniform mat4 u_model;
  uniform mat4 u_view;
  uniform mat4 u_projection;
  uniform mat3 u_normalMatrix;

  out vec3 v_worldPosition;
  out vec3 v_normal;
  out vec2 v_texCoord;

  void main() {
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_worldPosition = worldPos.xyz;
    
    // Transformasi normal menggunakan Normal Matrix (inverse-transpose)
    v_normal = normalize(u_normalMatrix * a_normal);
    v_texCoord = a_texCoord;

    gl_Position = u_projection * u_view * worldPos;
  }`;

  const fragmentShaderSource = `#version 300 es
  precision highp float;

  in vec3 v_worldPosition;
  in vec3 v_normal;
  in vec2 v_texCoord;

  uniform vec3 u_lightPosition;
  uniform vec3 u_cameraPosition;

  uniform vec3 u_lightAmbient;
  uniform vec3 u_lightDiffuse;
  uniform vec3 u_lightSpecular;

  uniform vec3 u_matAmbient;
  uniform vec3 u_matDiffuse;
  uniform vec3 u_matSpecular;
  uniform float u_shininess;

  uniform float u_ambientIntensity;
  uniform bool u_enableAmbient;
  uniform bool u_enableDiffuse;
  uniform bool u_enableSpecular;
  uniform bool u_useFlatShading;

  uniform sampler2D u_texture;

  out vec4 fragColor;

  void main() {
    // Normal: Flat Shading (derivatives) vs Smooth Shading (interpolated)
    vec3 N;
    if (u_useFlatShading) {
      vec3 dX = dFdx(v_worldPosition);
      vec3 dY = dFdy(v_worldPosition);
      N = normalize(cross(dX, dY));
    } else {
      N = normalize(v_normal);
    }

    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 V = normalize(u_cameraPosition - v_worldPosition);
    vec3 H = normalize(L + V); // Blinn-Phong Half-Vector

    // 1. Ambient Component
    vec3 ambient = vec3(0.0);
    if (u_enableAmbient) {
      ambient = u_lightAmbient * u_matAmbient * u_ambientIntensity;
    }

    // 2. Diffuse Component (Lambertian)
    vec3 diffuse = vec3(0.0);
    if (u_enableDiffuse) {
      float diffCoeff = max(dot(N, L), 0.0);
      diffuse = diffCoeff * u_lightDiffuse * u_matDiffuse;
    }

    // 3. Specular Component (Blinn-Phong)
    vec3 specular = vec3(0.0);
    if (u_enableSpecular) {
      float specCoeff = pow(max(dot(N, H), 0.0), u_shininess);
      specular = specCoeff * u_lightSpecular * u_matSpecular;
    }

    // Sample Texture
    vec4 texColor = texture(u_texture, v_texCoord);

    // Total Lighting Composition
    vec3 finalRgb = (ambient + diffuse) * texColor.rgb + specular;
    fragColor = vec4(finalRgb, texColor.a);
  }`;

  // Simple Light Indicator Shader (draws glowing point at light position)
  const lightMarkerVertex = `#version 300 es
  in vec3 a_position;
  uniform mat4 u_model;
  uniform mat4 u_view;
  uniform mat4 u_projection;
  void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
  }`;

  const lightMarkerFragment = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0, 0.95, 0.4, 1.0); // Bright glowing yellow
  }`;

  function compileShader(gl, src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, vsSrc, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fsSrc, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  const mainProgram = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  const lightProgram = createProgram(gl, lightMarkerVertex, lightMarkerFragment);

  // Locations for Main Program
  const loc = {
    aPosition: gl.getAttribLocation(mainProgram, "a_position"),
    aNormal: gl.getAttribLocation(mainProgram, "a_normal"),
    aTexCoord: gl.getAttribLocation(mainProgram, "a_texCoord"),
    uModel: gl.getUniformLocation(mainProgram, "u_model"),
    uView: gl.getUniformLocation(mainProgram, "u_view"),
    uProjection: gl.getUniformLocation(mainProgram, "u_projection"),
    uNormalMatrix: gl.getUniformLocation(mainProgram, "u_normalMatrix"),
    uLightPos: gl.getUniformLocation(mainProgram, "u_lightPosition"),
    uCameraPos: gl.getUniformLocation(mainProgram, "u_cameraPosition"),
    uLightAmbient: gl.getUniformLocation(mainProgram, "u_lightAmbient"),
    uLightDiffuse: gl.getUniformLocation(mainProgram, "u_lightDiffuse"),
    uLightSpecular: gl.getUniformLocation(mainProgram, "u_lightSpecular"),
    uMatAmbient: gl.getUniformLocation(mainProgram, "u_matAmbient"),
    uMatDiffuse: gl.getUniformLocation(mainProgram, "u_matDiffuse"),
    uMatSpecular: gl.getUniformLocation(mainProgram, "u_matSpecular"),
    uShininess: gl.getUniformLocation(mainProgram, "u_shininess"),
    uAmbientIntensity: gl.getUniformLocation(mainProgram, "u_ambientIntensity"),
    uEnableAmbient: gl.getUniformLocation(mainProgram, "u_enableAmbient"),
    uEnableDiffuse: gl.getUniformLocation(mainProgram, "u_enableDiffuse"),
    uEnableSpecular: gl.getUniformLocation(mainProgram, "u_enableSpecular"),
    uUseFlatShading: gl.getUniformLocation(mainProgram, "u_useFlatShading"),
    uTexture: gl.getUniformLocation(mainProgram, "u_texture")
  };

  const lightLoc = {
    aPosition: gl.getAttribLocation(lightProgram, "a_position"),
    uModel: gl.getUniformLocation(lightProgram, "u_model"),
    uView: gl.getUniformLocation(lightProgram, "u_view"),
    uProjection: gl.getUniformLocation(lightProgram, "u_projection")
  };

  // --- 3. GEOMETRI KUBUS 3D DENGAN NORMAL & UV ---
  // Unit cube [-1, 1] dengan normal terdefinisi per face dan UV [0, 1]
  const positions = [];
  const normals = [];
  const texCoords = [];

  function addQuad(p0, p1, p2, p3, n) {
    // Triangle 1
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    texCoords.push(0, 0, 1, 0, 1, 1);

    // Triangle 2
    positions.push(...p0, ...p2, ...p3);
    normals.push(...n, ...n, ...n);
    texCoords.push(0, 0, 1, 1, 0, 1);
  }

  // Front (Z = +1)
  addQuad([-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1]);
  // Back (Z = -1)
  addQuad([1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1]);
  // Top (Y = +1)
  addQuad([-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0]);
  // Bottom (Y = -1)
  addQuad([-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, -1, 0]);
  // Right (X = +1)
  addQuad([1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, 0, 0]);
  // Left (X = -1)
  addQuad([-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, 0]);

  const f32Positions = new Float32Array(positions);
  const f32Normals = new Float32Array(normals);
  const f32TexCoords = new Float32Array(texCoords);

  // VAO Setup
  const mainVao = gl.createVertexArray();
  gl.bindVertexArray(mainVao);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, f32Positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc.aPosition);
  gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);

  const normBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
  gl.bufferData(gl.ARRAY_BUFFER, f32Normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc.aNormal);
  gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);

  const texBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
  gl.bufferData(gl.ARRAY_BUFFER, f32TexCoords, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc.aTexCoord);
  gl.vertexAttribPointer(loc.aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // Light Marker VAO (smaller unit cube)
  const lightVao = gl.createVertexArray();
  gl.bindVertexArray(lightVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(lightLoc.aPosition);
  gl.vertexAttribPointer(lightLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // --- 4. GENERATOR TEKSTUR PROSEDURAL BERBASIS CANVAS 2D ---
  // Menghasilkan 4 tekstur 512x512 secara offline & mandiri:
  const textures = {};

  function createProceduralTexture(generatorFn) {
    const offscreen = document.createElement("canvas");
    offscreen.width = 512;
    offscreen.height = 512;
    const ctx = offscreen.getContext("2d");
    generatorFn(ctx, 512, 512);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
  }

  // 1. Checkerboard: Apple dark-blue & charcoal grid
  textures.checkerboard = createProceduralTexture((ctx, w, h) => {
    const tiles = 8;
    const size = w / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#1c2438" : "#f0f4fc";
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
    // Sub-tile borders
    ctx.strokeStyle = "rgba(0, 122, 255, 0.4)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });

  // 2. UV Calibration Grid
  textures.uvgrid = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = "#0c101c";
    ctx.fillRect(0, 0, w, h);

    const step = 64;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Grid center crosses & text
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("UV (0.5, 0.5)", w / 2, h / 2);
    ctx.font = "bold 20px monospace";
    ctx.fillText("YOLO-GRAFKOM", w / 2, h / 2 + 36);

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  });

  // 3. Cybernetic Circuit Pattern
  textures.circuit = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = "#070c14";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const paths = [
      [[30, 30], [120, 30], [180, 90], [320, 90], [380, 150]],
      [[480, 40], [400, 40], [350, 90], [350, 220]],
      [[60, 460], [180, 460], [240, 400], [240, 280], [310, 210]],
      [[460, 460], [380, 460], [320, 400], [200, 400]],
      [[80, 200], [140, 200], [190, 250], [270, 250]]
    ];

    paths.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();

      // Terminal pads
      const end = pts[pts.length - 1];
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(end[0], end[1], 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(234, 179, 8, 0.12)";
    ctx.fillRect(190, 190, 132, 132);
    ctx.strokeStyle = "#eab308";
    ctx.strokeRect(190, 190, 132, 132);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CHIP-5025", w / 2, h / 2);
  });

  // 4. Marble Sinusoidal Texture
  textures.marble = createProceduralTexture((ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const v = y / h;
        const noise = Math.sin(u * 12.0 + Math.sin(v * 8.0) * 3.0) + Math.cos(v * 15.0);
        const intensity = Math.floor(((noise + 2.0) / 4.0) * 255);
        const idx = (y * w + x) * 4;
        d[idx + 0] = Math.min(255, intensity + 40); // R
        d[idx + 1] = Math.min(255, intensity + 30); // G
        d[idx + 2] = Math.min(255, intensity + 50); // B
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  });

  // --- 5. STATE MANAJEMEN APLIKASI ---
  const state = {
    // Camera Transform
    camera: {
      eye: [0.0, 2.5, 7.5],
      target: [0.0, 0.0, 0.0],
      up: [0.0, 1.0, 0.0],
      orbitRadius: 7.5,
      orbitAngle: Math.PI / 2,
      orbitElevation: 2.5
    },
    // Light Position & Orbit (Challenge C & E)
    light: {
      pos: [3.5, 3.5, 3.5],
      orbitRadius: 4.5,
      orbitAngle: 0.0,
      orbitSpeed: 0.8, // rad/s
      isOrbiting: true,
      elevation: 3.5
    },
    // Lighting Components (Challenge B & F)
    lighting: {
      ambientIntensity: 0.25,
      enableAmbient: true,
      enableDiffuse: true,
      enableSpecular: true,
      shininess: 48.0,
      useNormalMatrix: true // Challenge D test toggle
    },
    // Shading Mode: Smooth vs Flat
    useFlatShading: false,
    // Texture & Mipmap (Challenge A & G)
    activeTexture: "checkerboard", // 'checkerboard' | 'uvgrid' | 'circuit' | 'marble'
    filterMode: "trilinear",       // 'nearest' | 'linear' | 'nearest_mipmap' | 'trilinear'
    // Scale Mode (Challenge D: Non-uniform scaling)
    scale: [1.0, 1.0, 1.0],
    isNonUniformScale: false,
    // Simulation
    isPaused: false,
    cubeAngle: 0.0,
    autoRotateCube: true,
    mouse: {
      isDragging: false,
      lastX: 0,
      lastY: 0
    }
  };

  // Texture Filtering Applicator
  function applyTextureFiltering(tex, mode) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    switch (mode) {
      case "nearest":
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        break;
      case "linear":
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        break;
      case "nearest_mipmap":
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        break;
      case "trilinear":
      default:
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        break;
    }
  }

  // Initial filtering
  Object.values(textures).forEach(tex => applyTextureFiltering(tex, state.filterMode));

  // --- 6. DOM ELEMENTS & CONTROLS ---
  const resStat = document.getElementById("res-stat");
  const fpsStat = document.getElementById("fps-stat");
  const dtStat = document.getElementById("dt-stat");
  const livePill = document.getElementById("live-pill");

  // Telemetry HUD Elements
  const lightPosInfo = document.getElementById("lightPosInfo");
  const camPosInfo = document.getElementById("camPosInfo");
  const shadingModeInfo = document.getElementById("shadingModeInfo");
  const normalMatrixInfo = document.getElementById("normalMatrixInfo");
  const textureInfo = document.getElementById("textureInfo");
  const filterInfo = document.getElementById("filterInfo");
  const matrixText = document.getElementById("matrixText");
  const coordsDisplay = document.getElementById("coords-display");

  // Control Buttons
  const btnShadingFlat = document.getElementById("btn-shading-flat");
  const btnShadingSmooth = document.getElementById("btn-shading-smooth");
  const btnToggleLightOrbit = document.getElementById("btn-toggle-light-orbit");
  const btnToggleNonUniform = document.getElementById("btn-toggle-non-uniform");
  const btnToggleNormalMatrix = document.getElementById("btn-toggle-normal-matrix");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnResetTop = document.getElementById("canvas-reset-btn");
  const btnFullscreen = document.getElementById("canvas-fullscreen-btn");

  // Lighting Component Toggles (Challenge F)
  const toggleAmbient = document.getElementById("toggle-ambient");
  const toggleDiffuse = document.getElementById("toggle-diffuse");
  const toggleSpecular = document.getElementById("toggle-specular");

  // Texture Picker Buttons
  const texBtns = {
    checkerboard: document.getElementById("tex-checkerboard"),
    uvgrid: document.getElementById("tex-uvgrid"),
    circuit: document.getElementById("tex-circuit"),
    marble: document.getElementById("tex-marble")
  };

  // Mipmap Filter Buttons
  const filterBtns = {
    nearest: document.getElementById("filter-nearest"),
    linear: document.getElementById("filter-linear"),
    nearest_mipmap: document.getElementById("filter-mipmap-nearest"),
    trilinear: document.getElementById("filter-trilinear")
  };

  // Sliders
  const ambientSlider = document.getElementById("ambientSlider");
  const ambientVal = document.getElementById("ambientVal");
  const shininessSlider = document.getElementById("shininessSlider");
  const shininessVal = document.getElementById("shininessVal");
  const lightElevationSlider = document.getElementById("lightElevationSlider");
  const lightElevationVal = document.getElementById("lightElevationVal");
  const lightOrbitSpeedSlider = document.getElementById("lightOrbitSpeedSlider");
  const lightOrbitSpeedVal = document.getElementById("lightOrbitSpeedVal");
  const scaleXSlider = document.getElementById("scaleXSlider");
  const scaleXVal = document.getElementById("scaleXVal");
  const scaleYSlider = document.getElementById("scaleYSlider");
  const scaleYVal = document.getElementById("scaleYVal");
  const scaleZSlider = document.getElementById("scaleZSlider");
  const scaleZVal = document.getElementById("scaleZVal");

  function updateUIControls() {
    if (btnShadingFlat && btnShadingSmooth) {
      btnShadingFlat.classList.toggle("active", state.useFlatShading);
      btnShadingSmooth.classList.toggle("active", !state.useFlatShading);
    }
    if (btnToggleLightOrbit) {
      btnToggleLightOrbit.classList.toggle("active", state.light.isOrbiting);
    }
    if (btnToggleNonUniform) {
      btnToggleNonUniform.classList.toggle("active", state.isNonUniformScale);
    }
    if (btnToggleNormalMatrix) {
      btnToggleNormalMatrix.classList.toggle("active", state.lighting.useNormalMatrix);
    }

    if (toggleAmbient) toggleAmbient.classList.toggle("active", state.lighting.enableAmbient);
    if (toggleDiffuse) toggleDiffuse.classList.toggle("active", state.lighting.enableDiffuse);
    if (toggleSpecular) toggleSpecular.classList.toggle("active", state.lighting.enableSpecular);

    Object.keys(texBtns).forEach(k => {
      if (texBtns[k]) texBtns[k].classList.toggle("active", state.activeTexture === k);
    });

    Object.keys(filterBtns).forEach(k => {
      if (filterBtns[k]) filterBtns[k].classList.toggle("active", state.filterMode === k);
    });

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

    // Sliders
    if (ambientSlider && ambientVal) {
      ambientSlider.value = state.lighting.ambientIntensity.toFixed(2);
      ambientVal.textContent = state.lighting.ambientIntensity.toFixed(2);
    }
    if (shininessSlider && shininessVal) {
      shininessSlider.value = state.lighting.shininess;
      shininessVal.textContent = state.lighting.shininess;
    }
    if (lightElevationSlider && lightElevationVal) {
      lightElevationSlider.value = state.light.elevation.toFixed(1);
      lightElevationVal.textContent = state.light.elevation.toFixed(1);
    }
    if (lightOrbitSpeedSlider && lightOrbitSpeedVal) {
      lightOrbitSpeedSlider.value = state.light.orbitSpeed.toFixed(2);
      lightOrbitSpeedVal.textContent = state.light.orbitSpeed.toFixed(2) + " rad/s";
    }
    if (scaleXSlider && scaleXVal) {
      scaleXSlider.value = state.scale[0].toFixed(2);
      scaleXVal.textContent = state.scale[0].toFixed(2);
    }
    if (scaleYSlider && scaleYVal) {
      scaleYSlider.value = state.scale[1].toFixed(2);
      scaleYVal.textContent = state.scale[1].toFixed(2);
    }
    if (scaleZSlider && scaleZVal) {
      scaleZSlider.value = state.scale[2].toFixed(2);
      scaleZVal.textContent = state.scale[2].toFixed(2);
    }

    // HUD Telemetry Badges
    if (shadingModeInfo) {
      shadingModeInfo.textContent = state.useFlatShading ? "FLAT SHADING" : "SMOOTH (PHONG)";
      shadingModeInfo.className = state.useFlatShading ? "hud-item-val highlight" : "hud-item-val active-mode";
    }
    if (normalMatrixInfo) {
      normalMatrixInfo.textContent = state.lighting.useNormalMatrix ? "ACTIVE (Inverse-Transpose M^-1T)" : "BYPASS (Identity/Distorted)";
      normalMatrixInfo.className = state.lighting.useNormalMatrix ? "hud-item-val active-mode" : "hud-item-val highlight";
    }
    if (textureInfo) {
      textureInfo.textContent = state.activeTexture.toUpperCase();
    }
    if (filterInfo) {
      filterInfo.textContent = state.filterMode.toUpperCase();
    }
  }

  // Shading toggles
  if (btnShadingFlat) {
    btnShadingFlat.addEventListener("click", () => {
      state.useFlatShading = true;
      updateUIControls();
    });
  }
  if (btnShadingSmooth) {
    btnShadingSmooth.addEventListener("click", () => {
      state.useFlatShading = false;
      updateUIControls();
    });
  }

  // Light orbit toggle (Challenge E)
  if (btnToggleLightOrbit) {
    btnToggleLightOrbit.addEventListener("click", () => {
      state.light.isOrbiting = !state.light.isOrbiting;
      updateUIControls();
    });
  }

  // Non-uniform scale toggle (Challenge D)
  if (btnToggleNonUniform) {
    btnToggleNonUniform.addEventListener("click", () => {
      state.isNonUniformScale = !state.isNonUniformScale;
      if (state.isNonUniformScale) {
        state.scale = [2.2, 0.6, 1.4];
      } else {
        state.scale = [1.0, 1.0, 1.0];
      }
      updateUIControls();
    });
  }

  // Normal matrix test toggle (Challenge D)
  if (btnToggleNormalMatrix) {
    btnToggleNormalMatrix.addEventListener("click", () => {
      state.lighting.useNormalMatrix = !state.lighting.useNormalMatrix;
      updateUIControls();
    });
  }

  // Component toggles (Challenge F)
  if (toggleAmbient) {
    toggleAmbient.addEventListener("click", () => {
      state.lighting.enableAmbient = !state.lighting.enableAmbient;
      updateUIControls();
    });
  }
  if (toggleDiffuse) {
    toggleDiffuse.addEventListener("click", () => {
      state.lighting.enableDiffuse = !state.lighting.enableDiffuse;
      updateUIControls();
    });
  }
  if (toggleSpecular) {
    toggleSpecular.addEventListener("click", () => {
      state.lighting.enableSpecular = !state.lighting.enableSpecular;
      updateUIControls();
    });
  }

  // Texture buttons
  Object.keys(texBtns).forEach(k => {
    if (texBtns[k]) {
      texBtns[k].addEventListener("click", () => {
        state.activeTexture = k;
        updateUIControls();
      });
    }
  });

  // Filter buttons
  Object.keys(filterBtns).forEach(k => {
    if (filterBtns[k]) {
      filterBtns[k].addEventListener("click", () => {
        state.filterMode = k;
        Object.values(textures).forEach(tex => applyTextureFiltering(tex, k));
        updateUIControls();
      });
    }
  });

  // Slider events
  if (ambientSlider) {
    ambientSlider.addEventListener("input", (e) => {
      state.lighting.ambientIntensity = parseFloat(e.target.value);
      if (ambientVal) ambientVal.textContent = state.lighting.ambientIntensity.toFixed(2);
    });
  }
  if (shininessSlider) {
    shininessSlider.addEventListener("input", (e) => {
      state.lighting.shininess = parseFloat(e.target.value);
      if (shininessVal) shininessVal.textContent = state.lighting.shininess;
    });
  }
  if (lightElevationSlider) {
    lightElevationSlider.addEventListener("input", (e) => {
      state.light.elevation = parseFloat(e.target.value);
      state.light.pos[1] = state.light.elevation;
      if (lightElevationVal) lightElevationVal.textContent = state.light.elevation.toFixed(1);
    });
  }
  if (lightOrbitSpeedSlider) {
    lightOrbitSpeedSlider.addEventListener("input", (e) => {
      state.light.orbitSpeed = parseFloat(e.target.value);
      if (lightOrbitSpeedVal) lightOrbitSpeedVal.textContent = state.light.orbitSpeed.toFixed(2) + " rad/s";
    });
  }

  // Scale sliders
  function onScaleSliderChange() {
    state.scale[0] = parseFloat(scaleXSlider.value);
    state.scale[1] = parseFloat(scaleYSlider.value);
    state.scale[2] = parseFloat(scaleZSlider.value);
    state.isNonUniformScale = (state.scale[0] !== state.scale[1] || state.scale[1] !== state.scale[2]);
    updateUIControls();
  }
  if (scaleXSlider) scaleXSlider.addEventListener("input", onScaleSliderChange);
  if (scaleYSlider) scaleYSlider.addEventListener("input", onScaleSliderChange);
  if (scaleZSlider) scaleZSlider.addEventListener("input", onScaleSliderChange);

  // Reset
  function resetAll() {
    state.camera.eye = [0.0, 2.5, 7.5];
    state.camera.orbitRadius = 7.5;
    state.camera.orbitAngle = Math.PI / 2;
    state.camera.orbitElevation = 2.5;

    state.light.pos = [3.5, 3.5, 3.5];
    state.light.orbitAngle = 0.0;
    state.light.orbitSpeed = 0.8;
    state.light.isOrbiting = true;
    state.light.elevation = 3.5;

    state.lighting.ambientIntensity = 0.25;
    state.lighting.enableAmbient = true;
    state.lighting.enableDiffuse = true;
    state.lighting.enableSpecular = true;
    state.lighting.shininess = 48.0;
    state.lighting.useNormalMatrix = true;

    state.useFlatShading = false;
    state.activeTexture = "checkerboard";
    state.filterMode = "trilinear";
    state.scale = [1.0, 1.0, 1.0];
    state.isNonUniformScale = false;

    state.cubeAngle = 0.0;
    state.isPaused = false;

    Object.values(textures).forEach(tex => applyTextureFiltering(tex, state.filterMode));
    updateUIControls();
  }

  if (btnReset) btnReset.addEventListener("click", resetAll);
  if (btnResetTop) btnResetTop.addEventListener("click", resetAll);

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      state.isPaused = !state.isPaused;
      updateUIControls();
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        canvas.parentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyP") {
      state.isPaused = !state.isPaused;
      updateUIControls();
    } else if (e.code === "KeyR") {
      resetAll();
    } else if (e.code === "KeyF") {
      state.useFlatShading = !state.useFlatShading;
      updateUIControls();
    } else if (e.code === "KeyL") {
      state.light.isOrbiting = !state.light.isOrbiting;
      updateUIControls();
    } else if (e.code === "KeyN") {
      state.lighting.useNormalMatrix = !state.lighting.useNormalMatrix;
      updateUIControls();
    } else if (e.code === "Digit1") {
      state.activeTexture = "checkerboard";
      updateUIControls();
    } else if (e.code === "Digit2") {
      state.activeTexture = "uvgrid";
      updateUIControls();
    } else if (e.code === "Digit3") {
      state.activeTexture = "circuit";
      updateUIControls();
    } else if (e.code === "Digit4") {
      state.activeTexture = "marble";
      updateUIControls();
    }
  });

  // Mouse interaction
  canvas.addEventListener("mousedown", (e) => {
    state.mouse.isDragging = true;
    state.mouse.lastX = e.clientX;
    state.mouse.lastY = e.clientY;
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
      state.camera.orbitElevation = Math.max(-5.0, Math.min(8.0, state.camera.orbitElevation));
      state.camera.eye[1] = state.camera.orbitElevation;
      state.camera.eye[0] = state.camera.orbitRadius * Math.cos(state.camera.orbitAngle);
      state.camera.eye[2] = state.camera.orbitRadius * Math.sin(state.camera.orbitAngle);
      updateUIControls();
    }
  });

  window.addEventListener("mouseup", () => {
    state.mouse.isDragging = false;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.camera.orbitRadius += e.deltaY * 0.005;
    state.camera.orbitRadius = Math.max(3.0, Math.min(18.0, state.camera.orbitRadius));
    state.camera.eye[0] = state.camera.orbitRadius * Math.cos(state.camera.orbitAngle);
    state.camera.eye[2] = state.camera.orbitRadius * Math.sin(state.camera.orbitAngle);
    updateUIControls();
  }, { passive: false });

  // Matrix Formatter for 3x3 Normal Matrix
  function formatMatrix3(m) {
    function f(val) {
      const s = val.toFixed(3);
      return (val >= 0 ? " " : "") + s;
    }
    return [
      `┌ ${f(m[0])}  ${f(m[3])}  ${f(m[6])} ┐`,
      `│ ${f(m[1])}  ${f(m[4])}  ${f(m[7])} │`,
      `└ ${f(m[2])}  ${f(m[5])}  ${f(m[8])} ┘`
    ].join("\n");
  }

  // --- 7. RENDER LOOP DENGAN DELTA TIME ---
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  const mat4 = window.mat4 || window.Math3D.mat4;
  const mat3 = window.mat3 || window.Math3D.mat3;

  const mModel = mat4.create();
  const mView = mat4.create();
  const mProjection = mat4.create();
  const mNormal3 = mat3.create();
  const mLightModel = mat4.create();

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

    if (!state.isPaused) {
      // Rotate object
      if (state.autoRotateCube) {
        state.cubeAngle += (25.0 * Math.PI / 180) * dt;
      }

      // Orbit Light (Challenge E)
      if (state.light.isOrbiting) {
        state.light.orbitAngle += state.light.orbitSpeed * dt;
        state.light.pos[0] = state.light.orbitRadius * Math.cos(state.light.orbitAngle);
        state.light.pos[2] = state.light.orbitRadius * Math.sin(state.light.orbitAngle);
        state.light.pos[1] = state.light.elevation;
      }
    }

    // Canvas resize
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.round(canvas.clientWidth * dpr);
    const dh = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
      if (resStat) resStat.textContent = `${canvas.clientWidth} × ${canvas.clientHeight} px`;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.03, 0.05, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    const aspect = canvas.width / canvas.height;
    mat4.perspective(mProjection, (55.0 * Math.PI) / 180, aspect, 0.1, 100.0);
    mat4.lookAt(mView, state.camera.eye, state.camera.target, state.camera.up);

    // 1. Calculate Model Matrix for 3D Cube
    mat4.identity(mModel);
    mat4.rotateY(mModel, mModel, state.cubeAngle);
    mat4.rotateX(mModel, mModel, state.cubeAngle * 0.4);
    mat4.scale(mModel, mModel, state.scale);

    // 2. Calculate Normal Matrix (Challenge D)
    if (state.lighting.useNormalMatrix) {
      mat3.normalFromMat4(mNormal3, mModel);
    } else {
      // Fallback: bypass normal matrix (identity/un-inverted) to illustrate distorted lighting
      mat3.identity(mNormal3);
    }

    // --- DRAW MAIN CUBE WITH LIGHTING & TEXTURE ---
    gl.useProgram(mainProgram);

    // Matrices
    gl.uniformMatrix4fv(loc.uModel, false, mModel);
    gl.uniformMatrix4fv(loc.uView, false, mView);
    gl.uniformMatrix4fv(loc.uProjection, false, mProjection);
    gl.uniformMatrix3fv(loc.uNormalMatrix, false, mNormal3);

    // Camera & Light Positions
    gl.uniform3fv(loc.uCameraPos, state.camera.eye);
    gl.uniform3fv(loc.uLightPos, state.light.pos);

    // Light Colors (Crisp White Key Light)
    gl.uniform3f(loc.uLightAmbient, 0.9, 0.9, 0.95);
    gl.uniform3f(loc.uLightDiffuse, 1.0, 1.0, 1.0);
    gl.uniform3f(loc.uLightSpecular, 1.0, 1.0, 1.0);

    // Material Properties
    gl.uniform3f(loc.uMatAmbient, 1.0, 1.0, 1.0);
    gl.uniform3f(loc.uMatDiffuse, 1.0, 1.0, 1.0);
    gl.uniform3f(loc.uMatSpecular, 1.0, 1.0, 1.0);
    gl.uniform1f(loc.uShininess, state.lighting.shininess);

    // Lighting toggles & modifiers
    gl.uniform1f(loc.uAmbientIntensity, state.lighting.ambientIntensity);
    gl.uniform1i(loc.uEnableAmbient, state.lighting.enableAmbient ? 1 : 0);
    gl.uniform1i(loc.uEnableDiffuse, state.lighting.enableDiffuse ? 1 : 0);
    gl.uniform1i(loc.uEnableSpecular, state.lighting.enableSpecular ? 1 : 0);
    gl.uniform1i(loc.uUseFlatShading, state.useFlatShading ? 1 : 0);

    // Active Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[state.activeTexture] || textures.checkerboard);
    gl.uniform1i(loc.uTexture, 0);

    // Draw Cube
    gl.bindVertexArray(mainVao);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // --- DRAW LIGHT POSITION INDICATOR ---
    gl.useProgram(lightProgram);
    mat4.identity(mLightModel);
    mat4.translate(mLightModel, mLightModel, state.light.pos);
    mat4.scale(mLightModel, mLightModel, [0.15, 0.15, 0.15]);
    gl.uniformMatrix4fv(lightLoc.uModel, false, mLightModel);
    gl.uniformMatrix4fv(lightLoc.uView, false, mView);
    gl.uniformMatrix4fv(lightLoc.uProjection, false, mProjection);

    gl.bindVertexArray(lightVao);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    gl.bindVertexArray(null);

    // Update Telemetry Displays
    if (lightPosInfo) {
      const lp = state.light.pos;
      lightPosInfo.textContent = `(${lp[0].toFixed(2)}, ${lp[1].toFixed(2)}, ${lp[2].toFixed(2)})`;
    }
    if (camPosInfo) {
      const cp = state.camera.eye;
      camPosInfo.textContent = `(${cp[0].toFixed(2)}, ${cp[1].toFixed(2)}, ${cp[2].toFixed(2)})`;
    }
    if (matrixText) {
      matrixText.textContent = formatMatrix3(mNormal3);
    }
  }

  // Initial trigger
  updateUIControls();
  requestAnimationFrame(render);
})();
