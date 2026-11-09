/**
 * Praktikum 10: Blender Materials, UV & Texturing
 * Standalone Vanilla JavaScript (ES6+ IIFE) Module
 * Features:
 *   - F01: WebGLRenderer with antialias, PCFSoftShadowMap, ACESFilmicToneMapping
 *   - F02: Studio Lighting Setup with ground reflections & shadow maps
 *   - F03: Spherical Orbit Camera with pointer drag & wheel zoom
 *   - F04: GLTF/GLB Loader loading P10_YOLO_Scene.glb (SciFi Crate + DamagedHelmet PBR)
 *   - F05: Visualizer Modes: Lit PBR, Wireframe (UV & Topology), Normal Vector
 *   - F06: Live Telemetry HUD (FPS, polycount, camera coordinates, color spaces)
 *
 * Kelompok YOLO: Jalu Cahyo Senodiputro (5025241155) & Erlangga Rizqi Dwi Raswanto (5025241179)
 */

(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.error("Three.js r128 is not loaded.");
    return;
  }

  // Application State
  const AppState = {
    camera: {
      target: new THREE.Vector3(0, 0.4, 0),
      radius: 5.2,
      theta: 0.85, // azimuth angle
      phi: 1.12,   // polar angle
      minRadius: 1.5,
      maxRadius: 16.0,
      minPhi: 0.1,
      maxPhi: Math.PI / 2 - 0.05
    },
    drag: {
      isDragging: false,
      prevX: 0,
      prevY: 0
    },
    isAutoRotate: false,
    viewMode: "pbr", // 'pbr', 'wire', 'normals'
    model: null,
    originalMaterials: new Map(),
    normalMaterial: new THREE.MeshNormalMaterial({ wireframe: false }),
    polyCount: { tris: 0, verts: 0 }
  };

  // DOM Elements
  const canvas = document.getElementById("grafkom-canvas");
  const fpsStatEl = document.getElementById("fps-stat");
  const resStatEl = document.getElementById("res-stat");
  const coordsDisplayEl = document.getElementById("coords-display");

  const hudPolyCountEl = document.getElementById("hud-polycount");
  const hudViewModeEl = document.getElementById("hud-viewmode");
  const hudModelStatusEl = document.getElementById("hud-model-status");
  const hudCamOrbitEl = document.getElementById("hud-cam-orbit");

  const btnReset = document.getElementById("canvas-reset-btn");
  const btnFullscreen = document.getElementById("canvas-fullscreen-btn");
  const btnPbr = document.getElementById("mode-pbr-btn");
  const btnWire = document.getElementById("mode-wire-btn");
  const btnNormals = document.getElementById("mode-normals-btn");
  const btnRotate = document.getElementById("toggle-rotate-btn");

  // Three.js Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);

  const container = canvas.parentElement;
  let width = container.clientWidth || 800;
  let height = container.clientHeight || 600;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  // Camera Orbit Function
  function updateCameraTransform() {
    const r = AppState.camera.radius;
    const phi = AppState.camera.phi;
    const theta = AppState.camera.theta;
    const tgt = AppState.camera.target;

    const x = tgt.x + r * Math.sin(phi) * Math.sin(theta);
    const y = tgt.y + r * Math.cos(phi);
    const z = tgt.z + r * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(tgt);

    if (hudCamOrbitEl) {
      hudCamOrbitEl.innerText = `R: ${r.toFixed(1)} | θ: ${(theta * 180 / Math.PI).toFixed(0)}° | φ: ${(phi * 180 / Math.PI).toFixed(0)}°`;
    }
  }
  updateCameraTransform();

  // Studio Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xddeeff, 0.7);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff6eb, 2.4);
  keyLight.position.set(6, 9, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7bc4ff, 1.2);
  fillLight.position.set(-6, 4, -4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x4df3ff, 1.6);
  rimLight.position.set(0, 6, -6);
  scene.add(rimLight);

  // Ground Grid
  const gridHelper = new THREE.GridHelper(10, 20, 0x1f4e78, 0x112940);
  gridHelper.position.y = -0.58;
  scene.add(gridHelper);

  // Load Combined GLB Model
  function loadSceneModel() {
    if (typeof THREE.GLTFLoader === "undefined") {
      console.warn("GLTFLoader not found, using procedural fallback.");
      createFallbackScene();
      return;
    }

    const loader = new THREE.GLTFLoader();
    const modelUrl = "./assets/models/P10_YOLO_Scene.glb";

    loader.load(
      modelUrl,
      function (gltf) {
        AppState.model = gltf.scene;
        let totalVerts = 0;
        let totalTris = 0;

        AppState.model.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            AppState.originalMaterials.set(child, child.material);

            if (child.geometry) {
              const pos = child.geometry.attributes.position;
              if (pos) totalVerts += pos.count;
              if (child.geometry.index) {
                totalTris += child.geometry.index.count / 3;
              } else if (pos) {
                totalTris += pos.count / 3;
              }
            }
          }
        });

        scene.add(AppState.model);

        AppState.polyCount.tris = Math.round(totalTris);
        AppState.polyCount.verts = totalVerts;

        if (hudPolyCountEl) hudPolyCountEl.innerText = `${AppState.polyCount.tris} Tris (${AppState.polyCount.verts} Verts)`;
        if (hudModelStatusEl) {
          hudModelStatusEl.innerText = "P10_YOLO_Scene.glb (Active)";
          hudModelStatusEl.className = "hud-item-val highlight-green";
        }
      },
      function (xhr) {
        if (hudModelStatusEl && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          hudModelStatusEl.innerText = `Loading: ${pct}%`;
        }
      },
      function (err) {
        console.error("Gagal memuat GLB, mencoba fallback:", err);
        createFallbackScene();
      }
    );
  }

  function createFallbackScene() {
    const geo = new THREE.BoxGeometry(2.0, 1.2, 1.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x223a54,
      roughness: 0.3,
      metalness: 0.7
    });
    AppState.model = new THREE.Mesh(geo, mat);
    scene.add(AppState.model);

    AppState.originalMaterials.set(AppState.model, mat);
    if (hudPolyCountEl) hudPolyCountEl.innerText = "12 Tris (Fallback)";
    if (hudModelStatusEl) {
      hudModelStatusEl.innerText = "Procedural Box (Fallback)";
      hudModelStatusEl.className = "hud-item-val highlight-gold";
    }
  }

  loadSceneModel();

  // Mode Switcher (Lit PBR, Wireframe, Normal Vector)
  function setViewMode(mode) {
    AppState.viewMode = mode;
    [btnPbr, btnWire, btnNormals].forEach(function (b) {
      if (b) b.classList.remove("active");
    });

    if (mode === "pbr") {
      if (btnPbr) btnPbr.classList.add("active");
      if (hudViewModeEl) hudViewModeEl.innerText = "LIT PBR (Materials)";
      if (AppState.model) {
        AppState.model.traverse(function (child) {
          if (child.isMesh && AppState.originalMaterials.has(child)) {
            child.material = AppState.originalMaterials.get(child);
            child.material.wireframe = false;
          }
        });
      }
    } else if (mode === "wire") {
      if (btnWire) btnWire.classList.add("active");
      if (hudViewModeEl) hudViewModeEl.innerText = "WIREFRAME (UV & Topology)";
      if (AppState.model) {
        AppState.model.traverse(function (child) {
          if (child.isMesh && AppState.originalMaterials.has(child)) {
            child.material = AppState.originalMaterials.get(child);
            child.material.wireframe = true;
          }
        });
      }
    } else if (mode === "normals") {
      if (btnNormals) btnNormals.classList.add("active");
      if (hudViewModeEl) hudViewModeEl.innerText = "NORMAL VECTOR";
      if (AppState.model) {
        AppState.model.traverse(function (child) {
          if (child.isMesh) {
            child.material = AppState.normalMaterial;
          }
        });
      }
    }
  }

  if (btnPbr) btnPbr.addEventListener("click", () => setViewMode("pbr"));
  if (btnWire) btnWire.addEventListener("click", () => setViewMode("wire"));
  if (btnNormals) btnNormals.addEventListener("click", () => setViewMode("normals"));

  if (btnRotate) {
    btnRotate.addEventListener("click", function () {
      AppState.isAutoRotate = !AppState.isAutoRotate;
      btnRotate.classList.toggle("active", AppState.isAutoRotate);
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", function () {
      AppState.camera.radius = 5.2;
      AppState.camera.theta = 0.85;
      AppState.camera.phi = 1.12;
      AppState.camera.target.set(0, 0.4, 0);
      updateCameraTransform();

      AppState.isAutoRotate = false;
      if (btnRotate) btnRotate.classList.remove("active");
      setViewMode("pbr");
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((e) => console.warn(e));
      } else {
        document.exitFullscreen().catch((e) => console.warn(e));
      }
    });
  }

  // Pointer Interaction (Orbit & Zoom)
  canvas.addEventListener("pointerdown", function (e) {
    AppState.drag.isDragging = true;
    AppState.drag.prevX = e.clientX;
    AppState.drag.prevY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", function (e) {
    if (AppState.drag.isDragging) {
      const dx = e.clientX - AppState.drag.prevX;
      const dy = e.clientY - AppState.drag.prevY;
      AppState.drag.prevX = e.clientX;
      AppState.drag.prevY = e.clientY;

      AppState.camera.theta -= dx * 0.007;
      AppState.camera.phi = Math.max(
        AppState.camera.minPhi,
        Math.min(AppState.camera.maxPhi, AppState.camera.phi - dy * 0.007)
      );
      updateCameraTransform();
    }

    if (coordsDisplayEl) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const u = (x / rect.width).toFixed(2);
      const v = (1.0 - y / rect.height).toFixed(2);
      coordsDisplayEl.innerText = `X: ${x}px, Y: ${y}px | UV: (${u}, ${v})`;
    }
  });

  function stopDrag(e) {
    if (AppState.drag.isDragging) {
      AppState.drag.isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);

  canvas.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      const factor = e.deltaY * 0.0025;
      AppState.camera.radius = Math.max(
        AppState.camera.minRadius,
        Math.min(AppState.camera.maxRadius, AppState.camera.radius + factor)
      );
      updateCameraTransform();
    },
    { passive: false }
  );

  // Resize Handler
  function onResize() {
    width = container.clientWidth || 800;
    height = container.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (resStatEl) resStatEl.innerText = `${width} × ${height}`;
  }
  window.addEventListener("resize", onResize);
  onResize();

  // Animation Loop & FPS Telemetry
  let lastTime = performance.now();
  let frameCount = 0;

  function animate(now) {
    requestAnimationFrame(animate);

    frameCount++;
    if (now - lastTime >= 1000) {
      if (fpsStatEl) fpsStatEl.innerText = `${frameCount} FPS`;
      frameCount = 0;
      lastTime = now;
    }

    if (AppState.isAutoRotate && AppState.model) {
      AppState.model.rotation.y += 0.008;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();
