/**
 * Praktikum 6: Introduction to Three.js — Mini 3D Scene
 * Kelompok YOLO
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 *
 * Standalone Script: Universal compatibility (file:/// and http://)
 * Fitur & Tantangan Lengkap:
 * - Three.js Modular Architecture (Scene, Perspective & Orthographic Camera, WebGLRenderer)
 * - Multi-Geometry Showcase: Box, Sphere, Torus, Cylinder, Cone, Ground Plane (Challenge A)
 * - Material Gallery: Basic, Lambert, Phong, Standard, Physical (Challenge B)
 * - Dynamic Toggle Orthographic vs Perspective Camera (Challenge C)
 * - DirectionalLight Orbit Animation & Visual Light Marker (Challenge D)
 * - Shadow Map Resolution Tuning: 512, 1024, 2048 & PCFSoftShadowMap (Challenge E)
 * - Live Scene Inspector HUD: Triangles, Vertices, Draw Calls, Camera Position (Challenge F)
 * - Animation Play / Pause Toggle (Key P) (Challenge G)
 * - Interactive Object Selection & Controller: WASD Move, Q/E Rotate (Challenge H)
 */

(function () {
  "use strict";

  // Check Three.js availability
  if (typeof THREE === "undefined") {
    console.error("Three.js tidak ditemukan.");
    return;
  }

  const canvas = document.getElementById("grafkom-canvas");
  if (!canvas) {
    console.error("Canvas #grafkom-canvas tidak ditemukan.");
    return;
  }

  // --- 1. RENDERER SETUP ---
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // --- 2. SCENE SETUP ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060913);
  scene.fog = new THREE.FogExp2(0x060913, 0.035);

  // --- 3. CAMERAS (PERSPECTIVE & ORTHOGRAPHIC) (Challenge C) ---
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const perspCamera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
  perspCamera.position.set(0, 7.5, 13.5);
  perspCamera.lookAt(0, 0.8, 0);

  const orthoSize = 8;
  const orthoCamera = new THREE.OrthographicCamera(
    -orthoSize * aspect,
    orthoSize * aspect,
    orthoSize,
    -orthoSize,
    0.1,
    100
  );
  orthoCamera.position.set(0, 8.5, 14.5);
  orthoCamera.lookAt(0, 0.8, 0);

  let activeCamera = perspCamera;

  // --- 4. LIGHTING SYSTEM & SHADOWS (Challenge D & E) ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(6, 10, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Point light for subtle warm fill
  const pointLight = new THREE.PointLight(0x007aff, 0.8, 20);
  pointLight.position.set(-6, 4, -4);
  scene.add(pointLight);

  // Glowing sphere marker for Directional Light (Challenge D)
  const lightOrbGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const lightOrbMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const lightOrb = new THREE.Mesh(lightOrbGeo, lightOrbMat);
  scene.add(lightOrb);

  // --- 5. MATERIAL FACTORY (Challenge B) ---
  const materialType = { current: "standard" };
  const materialParams = {
    roughness: 0.35,
    metalness: 0.15,
    shininess: 45,
    clearcoat: 0.4
  };

  const objectPalette = [
    0x0a84ff, // Apple Blue (Box)
    0x30d158, // Apple Green (Sphere)
    0xff9f0a, // Apple Orange (Torus)
    0xbf5af2, // Apple Purple (Cylinder)
    0xff375f  // Apple Pink / Red (Cone)
  ];

  function createMaterialForIndex(idx, type) {
    const col = objectPalette[idx];
    switch (type) {
      case "basic":
        return new THREE.MeshBasicMaterial({ color: col });
      case "lambert":
        return new THREE.MeshLambertMaterial({ color: col });
      case "phong":
        return new THREE.MeshPhongMaterial({
          color: col,
          shininess: materialParams.shininess,
          specular: 0x444444
        });
      case "physical":
        return new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: materialParams.roughness,
          metalness: materialParams.metalness,
          clearcoat: materialParams.clearcoat,
          clearcoatRoughness: 0.1
        });
      case "standard":
      default:
        return new THREE.MeshStandardMaterial({
          color: col,
          roughness: materialParams.roughness,
          metalness: materialParams.metalness
        });
    }
  }

  // --- 6. GEOMETRI MULTI-OBJEK (Challenge A) ---
  const showcaseObjects = [];

  // Ground Plane
  const planeGeo = new THREE.PlaneGeometry(28, 28);
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x111624,
    roughness: 0.7,
    metalness: 0.2
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  // Grid Helper on floor
  const gridHelper = new THREE.GridHelper(28, 28, 0x1f293d, 0x141c2c);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Geometries list
  const geometries = [
    { name: "Box", geo: new THREE.BoxGeometry(1.6, 1.6, 1.6), pos: [-4.4, 0.8, 0] },
    { name: "Sphere", geo: new THREE.SphereGeometry(1.0, 32, 32), pos: [-2.2, 1.0, 1.4] },
    { name: "Torus", geo: new THREE.TorusGeometry(0.9, 0.35, 24, 48), pos: [0, 1.25, 0] },
    { name: "Cylinder", geo: new THREE.CylinderGeometry(0.75, 0.75, 1.8, 32), pos: [2.2, 0.9, 1.4] },
    { name: "Cone", geo: new THREE.ConeGeometry(0.9, 2.0, 32), pos: [4.4, 1.0, 0] }
  ];

  geometries.forEach((g, idx) => {
    const mat = createMaterialForIndex(idx, materialType.current);
    const mesh = new THREE.Mesh(g.geo, mat);
    mesh.position.set(...g.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: idx, name: g.name, basePosY: g.pos[1] };
    scene.add(mesh);
    showcaseObjects.push(mesh);
  });

  // Selection Wireframe Indicator (Challenge H)
  const selectionBox = new THREE.BoxHelper(showcaseObjects[2], 0x64d2ff);
  selectionBox.visible = false;
  scene.add(selectionBox);

  // --- 7. APPLICATION STATE ---
  const state = {
    selectedIdx: 2, // Selected object (default Torus)
    isPaused: false,
    cameraOrbiting: false,
    cameraAngle: Math.PI / 2,
    cameraRadius: 15.5,
    cameraElevation: 7.5,
    light: {
      isOrbiting: true,
      orbitRadius: 9.0,
      orbitAngle: 0.0,
      orbitSpeed: 0.75,
      elevation: 9.5
    },
    shadowRes: 1024,
    keysDown: {},
    mouse: {
      isDragging: false,
      lastX: 0,
      lastY: 0
    }
  };

  // --- 8. DOM ELEMENTS ---
  const resStat = document.getElementById("res-stat");
  const fpsStat = document.getElementById("fps-stat");
  const dtStat = document.getElementById("dt-stat");
  const livePill = document.getElementById("live-pill");

  // HUD Elements
  const polyStat = document.getElementById("polyStat");
  const vertStat = document.getElementById("vertStat");
  const callsStat = document.getElementById("callsStat");
  const activeObjName = document.getElementById("activeObjName");
  const activeObjPos = document.getElementById("activeObjPos");
  const activeMaterialName = document.getElementById("activeMaterialName");
  const activeCameraType = document.getElementById("activeCameraType");
  const shadowQualityInfo = document.getElementById("shadowQualityInfo");
  const coordsDisplay = document.getElementById("coords-display");

  // Controls
  const btnPersp = document.getElementById("btn-cam-persp");
  const btnOrtho = document.getElementById("btn-cam-ortho");
  const btnLightOrbit = document.getElementById("btn-toggle-light-orbit");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnResetTop = document.getElementById("canvas-reset-btn");
  const btnFullscreen = document.getElementById("canvas-fullscreen-btn");

  // Material Gallery Buttons
  const matButtons = {
    basic: document.getElementById("mat-basic"),
    lambert: document.getElementById("mat-lambert"),
    phong: document.getElementById("mat-phong"),
    standard: document.getElementById("mat-standard"),
    physical: document.getElementById("mat-physical")
  };

  // Object Switcher Buttons
  const objButtons = [
    document.getElementById("sel-box"),
    document.getElementById("sel-sphere"),
    document.getElementById("sel-torus"),
    document.getElementById("sel-cylinder"),
    document.getElementById("sel-cone")
  ];

  // Shadow Map Resolution Buttons
  const shadowButtons = {
    512: document.getElementById("shadow-512"),
    1024: document.getElementById("shadow-1024"),
    2048: document.getElementById("shadow-2048")
  };

  // Sliders
  const roughnessSlider = document.getElementById("roughnessSlider");
  const roughnessVal = document.getElementById("roughnessVal");
  const metalnessSlider = document.getElementById("metalnessSlider");
  const metalnessVal = document.getElementById("metalnessVal");
  const lightIntensitySlider = document.getElementById("lightIntensitySlider");
  const lightIntensityVal = document.getElementById("lightIntensityVal");
  const lightSpeedSlider = document.getElementById("lightSpeedSlider");
  const lightSpeedVal = document.getElementById("lightSpeedVal");

  // --- 9. EVENT LISTENERS & LOGIC ---
  function selectObject(idx) {
    state.selectedIdx = idx;
    const mesh = showcaseObjects[idx];
    selectionBox.setFromObject(mesh);
    selectionBox.visible = true;
    updateUI();
  }

  function setMaterialType(type) {
    materialType.current = type;
    showcaseObjects.forEach((mesh, idx) => {
      mesh.material = createMaterialForIndex(idx, type);
    });
    updateUI();
  }

  function setShadowResolution(res) {
    state.shadowRes = res;
    dirLight.shadow.mapSize.width = res;
    dirLight.shadow.mapSize.height = res;
    if (dirLight.shadow.map) {
      dirLight.shadow.map.dispose();
      dirLight.shadow.map = null;
    }
    updateUI();
  }

  function updateUI() {
    if (btnPersp && btnOrtho) {
      btnPersp.classList.toggle("active", activeCamera === perspCamera);
      btnOrtho.classList.toggle("active", activeCamera === orthoCamera);
    }
    if (btnLightOrbit) {
      btnLightOrbit.classList.toggle("active", state.light.isOrbiting);
    }

    // Material buttons
    Object.keys(matButtons).forEach(k => {
      if (matButtons[k]) matButtons[k].classList.toggle("active", materialType.current === k);
    });

    // Object buttons
    objButtons.forEach((btn, idx) => {
      if (btn) btn.classList.toggle("active", state.selectedIdx === idx);
    });

    // Shadow buttons
    Object.keys(shadowButtons).forEach(k => {
      if (shadowButtons[k]) shadowButtons[k].classList.toggle("active", state.shadowRes === parseInt(k));
    });

    // Live Pill
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
    if (roughnessSlider && roughnessVal) {
      roughnessSlider.value = materialParams.roughness.toFixed(2);
      roughnessVal.textContent = materialParams.roughness.toFixed(2);
    }
    if (metalnessSlider && metalnessVal) {
      metalnessSlider.value = materialParams.metalness.toFixed(2);
      metalnessVal.textContent = materialParams.metalness.toFixed(2);
    }
    if (lightIntensitySlider && lightIntensityVal) {
      lightIntensitySlider.value = dirLight.intensity.toFixed(1);
      lightIntensityVal.textContent = dirLight.intensity.toFixed(1);
    }
    if (lightSpeedSlider && lightSpeedVal) {
      lightSpeedSlider.value = state.light.orbitSpeed.toFixed(2);
      lightSpeedVal.textContent = state.light.orbitSpeed.toFixed(2) + " rad/s";
    }

    // Telemetry
    if (activeCameraType) {
      activeCameraType.textContent = activeCamera === perspCamera ? "PERSPECTIVE (55°)" : "ORTHOGRAPHIC";
    }
    if (activeMaterialName) {
      activeMaterialName.textContent = materialType.current.toUpperCase();
    }
    if (shadowQualityInfo) {
      shadowQualityInfo.textContent = `${state.shadowRes} × ${state.shadowRes} (PCFSoft)`;
    }
    if (activeObjName && activeObjPos && showcaseObjects[state.selectedIdx]) {
      const cur = showcaseObjects[state.selectedIdx];
      activeObjName.textContent = cur.userData.name;
      activeObjPos.textContent = `(${cur.position.x.toFixed(2)}, ${cur.position.y.toFixed(2)}, ${cur.position.z.toFixed(2)})`;
    }
  }

  // Camera buttons
  if (btnPersp) {
    btnPersp.addEventListener("click", () => {
      activeCamera = perspCamera;
      updateUI();
    });
  }
  if (btnOrtho) {
    btnOrtho.addEventListener("click", () => {
      activeCamera = orthoCamera;
      updateUI();
    });
  }

  if (btnLightOrbit) {
    btnLightOrbit.addEventListener("click", () => {
      state.light.isOrbiting = !state.light.isOrbiting;
      updateUI();
    });
  }

  // Material gallery button clicks
  Object.keys(matButtons).forEach(k => {
    if (matButtons[k]) {
      matButtons[k].addEventListener("click", () => setMaterialType(k));
    }
  });

  // Object selector button clicks
  objButtons.forEach((btn, idx) => {
    if (btn) {
      btn.addEventListener("click", () => selectObject(idx));
    }
  });

  // Shadow resolution clicks
  Object.keys(shadowButtons).forEach(k => {
    if (shadowButtons[k]) {
      shadowButtons[k].addEventListener("click", () => setShadowResolution(parseInt(k)));
    }
  });

  // Sliders
  if (roughnessSlider) {
    roughnessSlider.addEventListener("input", (e) => {
      materialParams.roughness = parseFloat(e.target.value);
      if (roughnessVal) roughnessVal.textContent = materialParams.roughness.toFixed(2);
      showcaseObjects.forEach(mesh => {
        if (mesh.material.roughness !== undefined) mesh.material.roughness = materialParams.roughness;
      });
    });
  }
  if (metalnessSlider) {
    metalnessSlider.addEventListener("input", (e) => {
      materialParams.metalness = parseFloat(e.target.value);
      if (metalnessVal) metalnessVal.textContent = materialParams.metalness.toFixed(2);
      showcaseObjects.forEach(mesh => {
        if (mesh.material.metalness !== undefined) mesh.material.metalness = materialParams.metalness;
      });
    });
  }
  if (lightIntensitySlider) {
    lightIntensitySlider.addEventListener("input", (e) => {
      dirLight.intensity = parseFloat(e.target.value);
      if (lightIntensityVal) lightIntensityVal.textContent = dirLight.intensity.toFixed(1);
    });
  }
  if (lightSpeedSlider) {
    lightSpeedSlider.addEventListener("input", (e) => {
      state.light.orbitSpeed = parseFloat(e.target.value);
      if (lightSpeedVal) lightSpeedVal.textContent = state.light.orbitSpeed.toFixed(2) + " rad/s";
    });
  }

  // Reset
  function resetAll() {
    activeCamera = perspCamera;
    perspCamera.position.set(0, 7.5, 13.5);
    perspCamera.lookAt(0, 0.8, 0);

    geometries.forEach((g, idx) => {
      showcaseObjects[idx].position.set(...g.pos);
      showcaseObjects[idx].rotation.set(0, 0, 0);
    });

    state.isPaused = false;
    state.light.isOrbiting = true;
    state.light.orbitAngle = 0;
    materialParams.roughness = 0.35;
    materialParams.metalness = 0.15;
    dirLight.intensity = 1.2;

    setMaterialType("standard");
    setShadowResolution(1024);
    selectObject(2);
  }

  if (btnReset) btnReset.addEventListener("click", resetAll);
  if (btnResetTop) btnResetTop.addEventListener("click", resetAll);

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      state.isPaused = !state.isPaused;
      updateUI();
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

  // Keyboard Navigation & Object Controller (Challenge H)
  window.addEventListener("keydown", (e) => {
    state.keysDown[e.code] = true;

    if (e.code === "KeyP") {
      state.isPaused = !state.isPaused;
      updateUI();
    } else if (e.code === "KeyR") {
      resetAll();
    } else if (e.code === "KeyC") {
      activeCamera = (activeCamera === perspCamera) ? orthoCamera : perspCamera;
      updateUI();
    } else if (e.code === "KeyL") {
      state.light.isOrbiting = !state.light.isOrbiting;
      updateUI();
    } else if (e.code === "Digit1") {
      selectObject(0);
    } else if (e.code === "Digit2") {
      selectObject(1);
    } else if (e.code === "Digit3") {
      selectObject(2);
    } else if (e.code === "Digit4") {
      selectObject(3);
    } else if (e.code === "Digit5") {
      selectObject(4);
    }
  });

  window.addEventListener("keyup", (e) => {
    state.keysDown[e.code] = false;
  });

  // Raycasting for Click Selection
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseVec, activeCamera);
    const intersects = raycaster.intersectObjects(showcaseObjects);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      selectObject(hit.userData.id);
    }
  });

  // Mouse drag for camera orbit
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

      state.cameraAngle -= dx * 0.007;
      state.cameraElevation += dy * 0.025;
      state.cameraElevation = Math.max(1.0, Math.min(18.0, state.cameraElevation));

      const cx = state.cameraRadius * Math.cos(state.cameraAngle);
      const cz = state.cameraRadius * Math.sin(state.cameraAngle);
      perspCamera.position.set(cx, state.cameraElevation, cz);
      perspCamera.lookAt(0, 0.8, 0);

      orthoCamera.position.set(cx, state.cameraElevation, cz);
      orthoCamera.lookAt(0, 0.8, 0);
    }
  });

  window.addEventListener("mouseup", () => {
    state.mouse.isDragging = false;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.cameraRadius += e.deltaY * 0.008;
    state.cameraRadius = Math.max(6.0, Math.min(26.0, state.cameraRadius));

    const cx = state.cameraRadius * Math.cos(state.cameraAngle);
    const cz = state.cameraRadius * Math.sin(state.cameraAngle);
    perspCamera.position.set(cx, state.cameraElevation, cz);
    perspCamera.lookAt(0, 0.8, 0);

    const zoomFactor = state.cameraRadius / 15.5;
    const currentAspect = canvas.clientWidth / canvas.clientHeight;
    orthoCamera.left = -orthoSize * currentAspect * zoomFactor;
    orthoCamera.right = orthoSize * currentAspect * zoomFactor;
    orthoCamera.top = orthoSize * zoomFactor;
    orthoCamera.bottom = -orthoSize * zoomFactor;
    orthoCamera.updateProjectionMatrix();
  }, { passive: false });

  // --- 10. RENDER LOOP DENGAN DELTA TIME ---
  const clock = new THREE.Clock();
  let frameCount = 0;
  let fpsTimer = 0;

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      const currentFps = Math.round(frameCount / fpsTimer);
      if (fpsStat) fpsStat.textContent = currentFps + " FPS";
      if (dtStat) dtStat.textContent = (dt * 1000).toFixed(1) + " ms";
      frameCount = 0;
      fpsTimer = 0;
    }

    // Responsive Canvas
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      const curAspect = width / height;

      perspCamera.aspect = curAspect;
      perspCamera.updateProjectionMatrix();

      orthoCamera.left = -orthoSize * curAspect;
      orthoCamera.right = orthoSize * curAspect;
      orthoCamera.top = orthoSize;
      orthoCamera.bottom = -orthoSize;
      orthoCamera.updateProjectionMatrix();

      if (resStat) resStat.textContent = `${width} × ${height} px`;
    }

    if (!state.isPaused) {
      // Rotate idle objects
      showcaseObjects.forEach((mesh, idx) => {
        mesh.rotation.y += 0.5 * dt;
        if (idx === 2) {
          // Torus extra rotation on X
          mesh.rotation.x += 0.4 * dt;
        }
      });

      // Directional Light Orbit (Challenge D)
      if (state.light.isOrbiting) {
        state.light.orbitAngle += state.light.orbitSpeed * dt;
        const lx = state.light.orbitRadius * Math.cos(state.light.orbitAngle);
        const lz = state.light.orbitRadius * Math.sin(state.light.orbitAngle);
        dirLight.position.set(lx, state.light.elevation, lz);
        lightOrb.position.copy(dirLight.position);
      }

      // Keyboard Object Controller (Challenge H)
      const curSelected = showcaseObjects[state.selectedIdx];
      if (curSelected) {
        const moveDist = 4.0 * dt;
        if (state.keysDown["KeyW"] || state.keysDown["ArrowUp"]) curSelected.position.z -= moveDist;
        if (state.keysDown["KeyS"] || state.keysDown["ArrowDown"]) curSelected.position.z += moveDist;
        if (state.keysDown["KeyA"] || state.keysDown["ArrowLeft"]) curSelected.position.x -= moveDist;
        if (state.keysDown["KeyD"] || state.keysDown["ArrowRight"]) curSelected.position.x += moveDist;
        if (state.keysDown["KeyQ"]) curSelected.rotation.y -= 2.0 * dt;
        if (state.keysDown["KeyE"]) curSelected.rotation.y += 2.0 * dt;

        selectionBox.setFromObject(curSelected);
        if (activeObjPos) {
          activeObjPos.textContent = `(${curSelected.position.x.toFixed(2)}, ${curSelected.position.y.toFixed(2)}, ${curSelected.position.z.toFixed(2)})`;
        }
      }
    }

    // Render Scene
    renderer.render(scene, activeCamera);

    // Update Inspector Telemetry (Challenge F)
    if (polyStat) polyStat.textContent = renderer.info.render.triangles.toLocaleString();
    if (callsStat) callsStat.textContent = renderer.info.render.calls;
    if (vertStat) vertStat.textContent = (renderer.info.render.triangles * 3).toLocaleString();
  }

  // Initial trigger
  selectObject(2);
  updateUI();
  animate();
})();
