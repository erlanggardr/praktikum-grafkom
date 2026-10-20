/**
 * Praktikum 7: Three.js Interactive 3D Application — Prototype Persiapan UTS
 * Standalone Vanilla JavaScript (ES6+ IIFE) Module
 * Features:
 *   - F01: WebGLRenderer with antialias, PCFSoftShadowMap, sRGBEncoding, ACESFilmicToneMapping & responsive resize loop
 *   - F02: Ground plane with soft shadows, directional light with frustum tuning, hemisphere & ambient fill lights
 *   - F03: 5-Tier Articulated Scene Graph ("CyberArm-MK1") with parent-child local vs world transform composition
 *   - F04: PBR MeshStandardMaterial tuning (roughness, metalness, albedo, and 4 visualizer modes)
 *   - F05: Procedural inlined RoomEnvironment class + THREE.PMREMGenerator for offline studio reflection (Challenge H)
 *   - Challenge E: PBR Material Presets (Chrome, Gold, Copper, Glossy Blue, Matte Rubber, Brushed Steel)
 *   - Challenge G: Selection auto-rotation
 *   - Challenge C: Deep inspection telemetry HUD (local vs world matrix coordinates & FPS)
 *
 * Kelompok YOLO: Jalu Cahyo Senodiputro (5025241155) & Erlangga Rizqi Dwi Raswanto (5025241179)
 */

(function () {
  "use strict";

  // Check Three.js availability
  if (typeof THREE === "undefined") {
    console.error("Three.js r128 is not loaded. Please verify three.min.js path.");
    return;
  }

  // =========================================================================
  // 1. GLOBAL APPLICATION STATE (AppState)
  // =========================================================================
  const AppState = {
    // Camera & Viewport
    camera: {
      target: new THREE.Vector3(0, 1.4, 0),
      radius: 11.5,
      theta: 0.65, // azimuth angle in radians
      phi: 1.15,   // polar angle in radians
      minRadius: 3.0,
      maxRadius: 26.0,
      minPhi: 0.15,
      maxPhi: Math.PI / 2 - 0.05 // prevent going below ground plane
    },
    drag: {
      isDragging: false,
      prevX: 0,
      prevY: 0
    },
    // Interaction & Animation
    selectedObject: null,
    hoveredObject: null,
    isAutoRotate: false,
    autoRotateSpeed: 0.015,
    isPaused: false,
    // Environment & Reflections (F05 / Challenge H)
    isEnvironmentOn: true,
    envTexture: null,
    // CyberArm-MK1 Articulated Kinematics (F03)
    kinematics: {
      baseYaw: 0.0,          // rad (-PI to PI)
      shoulderPitch: 0.436,  // ~25 deg
      elbowPitch: -0.785,    // ~ -45 deg
      wristPitch: 0.349,     // ~20 deg
      wristRoll: 0.0,        // rad
      clawPinch: 0.5,        // 0.0 (closed) to 1.0 (open)
      autoWave: false,       // sinusoidal wave animation
      showAxes: true         // toggle RGB coordinate axes
    },
    // 3D Model & Animation System (F06, F07, F08)
    model: {
      isLoading: false,
      loadProgress: 0,
      isLoaded: false,
      isFallback: false,
      sourceType: "none", // 'glb-local', 'glb-cdn', 'glb-dragdrop', 'procedural'
      root: null,
      mixer: null,
      actions: {},
      activeAction: null,
      previousAction: null,
      activeClipName: "Walking",
      currentClipName: "Walking",
      currentBaseState: "Walking",
      isPlayingEmote: false,
      playbackSpeed: 1.0,
      crossfadeDuration: 0.35,
      selectableRobotMeshes: [],
      proceduralNodes: null
    },
    // Raycaster & Selection Interaction (F09, F10, F11)
    raycaster: {
      isHovering: false,
      hoveredMesh: null,
      pointerDownPos: { x: 0, y: 0 },
      isDragOrbiting: false
    },
    // PBR Material Playground (F04 / Challenge E)
    pbr: {
      roughness: 0.25,
      metalness: 0.80,
      color: "#0a84ff",
      visualizerMode: "pbr", // 'pbr', 'normals', 'roughness', 'metalness'
      activePreset: "glossy"
    },
    // Lighting & Shadows (F02)
    lighting: {
      dirIntensity: 1.3,
      hemiIntensity: 0.5,
      ambIntensity: 0.2,
      showGrid: true
    },
    // Telemetry & Profiling
    fps: 60,
    frameCount: 0,
    lastFpsUpdate: performance.now(),
    deltaTime: 0.016
  };

  // Direct alias for F08 test harness and external inspections
  AppState.animation = AppState.model;

  // Reusable scratch objects to eliminate GC pressure during 60 FPS loop
  const _vScratchPos = new THREE.Vector3();
  const _qScratchQuat = new THREE.Quaternion();
  const _vScratchScale = new THREE.Vector3();
  const _eScratchEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const _mouseNDC = new THREE.Vector2(-999, -999);
  const _raycaster = new THREE.Raycaster();
  const _boxScratch = new THREE.Box3();
  const _sizeScratch = new THREE.Vector3();

  // DOM Elements cache
  const canvas = document.getElementById("grafkom-canvas");
  if (!canvas) {
    console.warn("Canvas element #grafkom-canvas not found.");
    return;
  }

  // =========================================================================
  // 2. INLINED PROCEDURAL RoomEnvironment CLASS (F05 & Challenge H)
  // =========================================================================
  /**
   * RoomEnvironment: Procedural HDR studio box for Three.js r128.
   * Standalone Vanilla JS: Zero external files, 100% offline & CORS-free.
   */
  class RoomEnvironment extends THREE.Scene {
    constructor() {
      super();

      const geometry = new THREE.BoxGeometry();
      geometry.deleteAttribute("uv");

      const roomMaterial = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
      const boxMaterial = new THREE.MeshStandardMaterial();

      // Zenith key light
      const mainLight = new THREE.PointLight(0xffffff, 5.0, 28, 2);
      mainLight.position.set(0.418, 16.199, 0.300);
      this.add(mainLight);

      // Inverted enclosing studio room
      const room = new THREE.Mesh(geometry, roomMaterial);
      room.position.set(-0.757, 13.219, 0.717);
      room.scale.set(31.713, 28.305, 28.591);
      this.add(room);

      // Studio occlusion boxes to create subtle gradient reflections
      const boxConfigs = [
        { pos: [-10.906, 2.009, 1.846], rot: [0, -0.195, 0], scale: [2.328, 7.905, 4.651] },
        { pos: [-5.607, -0.754, -0.758], rot: [0, 0.994, 0], scale: [1.970, 1.534, 3.955] },
        { pos: [6.167, 0.857, 7.803], rot: [0, 0.561, 0], scale: [3.927, 6.285, 3.687] },
        { pos: [-2.017, 0.018, 6.124], rot: [0, 0.333, 0], scale: [2.002, 4.566, 2.064] },
        { pos: [2.291, -0.756, -2.621], rot: [0, -0.286, 0], scale: [1.546, 1.552, 1.496] },
        { pos: [-2.193, -0.369, -5.547], rot: [0, 0.516, 0], scale: [3.875, 3.487, 2.986] }
      ];

      for (let i = 0; i < boxConfigs.length; i++) {
        const c = boxConfigs[i];
        const box = new THREE.Mesh(geometry, boxMaterial);
        box.position.set(c.pos[0], c.pos[1], c.pos[2]);
        box.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
        box.scale.set(c.scale[0], c.scale[1], c.scale[2]);
        this.add(box);
      }

      // Emissive softbox light panels (intensity > 1.0 encodes HDR radiance into PMREM)
      const createAreaLightMaterial = (intensity) => {
        const mat = new THREE.MeshBasicMaterial();
        mat.color.setScalar(intensity);
        return mat;
      };

      const lightConfigs = [
        { pos: [-16.116, 14.37, 8.208], scale: [0.1, 2.428, 2.739], intensity: 50 },
        { pos: [-16.109, 18.021, -8.207], scale: [0.1, 2.425, 2.751], intensity: 50 },
        { pos: [14.904, 12.198, -1.832], scale: [0.15, 4.265, 6.331], intensity: 17 },
        { pos: [-0.462, 8.89, 14.520], scale: [4.38, 5.441, 0.088], intensity: 43 },
        { pos: [3.235, 11.486, -12.541], scale: [2.5, 2.0, 0.1], intensity: 20 },
        { pos: [0.0, 20.0, 0.0], scale: [1.0, 0.1, 1.0], intensity: 100 }
      ];

      for (let i = 0; i < lightConfigs.length; i++) {
        const lc = lightConfigs[i];
        const lightMesh = new THREE.Mesh(geometry, createAreaLightMaterial(lc.intensity));
        lightMesh.position.set(lc.pos[0], lc.pos[1], lc.pos[2]);
        lightMesh.scale.set(lc.scale[0], lc.scale[1], lc.scale[2]);
        this.add(lightMesh);
      }
    }

    dispose() {
      const resources = new Set();
      this.traverse((obj) => {
        if (obj.geometry) resources.add(obj.geometry);
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => resources.add(m));
          } else {
            resources.add(obj.material);
          }
        }
      });
      resources.forEach((res) => res.dispose());
      this.clear();
    }
  }

  // =========================================================================
  // 3. THREE.JS SCENE, RENDERER, CAMERA & LIGHTS (F01 & F02)
  // =========================================================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d14);
  scene.fog = new THREE.FogExp2(0x0a0d14, 0.025);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);

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
  }
  updateCameraTransform();

  // Procedural Studio Environment Reflection Setup (F05)
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    AppState.envTexture = envTarget.texture;
    scene.environment = AppState.envTexture;
    roomEnv.dispose();
    pmremGenerator.dispose();
  } catch (err) {
    console.warn("PMREMGenerator environment initialization warning:", err);
  }

  // Lighting System (F02)
  const dirLight = new THREE.DirectionalLight(0xffffff, AppState.lighting.dirIntensity);
  dirLight.position.set(6, 12, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 35;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.radius = 2.0;
  scene.add(dirLight);

  // Subtle Glowing Light Position Marker
  const lightMarkerGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const lightMarkerMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
  const lightMarker = new THREE.Mesh(lightMarkerGeo, lightMarkerMat);
  lightMarker.position.copy(dirLight.position);
  scene.add(lightMarker);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a2233, AppState.lighting.hemiIntensity);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const ambLight = new THREE.AmbientLight(0xffffff, AppState.lighting.ambIntensity);
  scene.add(ambLight);

  // Subtle Apple-blue silhouette rim light
  const rimLight = new THREE.PointLight(0x0a84ff, 0.5, 20);
  rimLight.position.set(-6, 4, -5);
  scene.add(rimLight);

  // Ground Plane & Non-Z-Fighting Grid Helper (F02)
  const groundGeo = new THREE.PlaneGeometry(32, 32);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0c101a,
    roughness: 0.85,
    metalness: 0.15
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Elevated to y = 0.002 to eliminate Z-fighting flicker
  const gridHelper = new THREE.GridHelper(30, 30, 0x0a84ff, 0x1e2838);
  gridHelper.position.y = 0.002;
  scene.add(gridHelper);

  // High-Contrast Selection Box Helper (Apple Gold, Always on Top, DepthTest: false)
  const selectionBoxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xffd60a);
  selectionBoxHelper.material.depthTest = false;
  selectionBoxHelper.material.transparent = true;
  selectionBoxHelper.material.opacity = 0.90;
  selectionBoxHelper.renderOrder = 999;
  selectionBoxHelper.visible = false;
  scene.add(selectionBoxHelper);

  // Subtle Hover Box Helper (Apple Cyan)
  const hoverBoxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0x64d2ff);
  hoverBoxHelper.material.depthTest = false;
  hoverBoxHelper.material.transparent = true;
  hoverBoxHelper.material.opacity = 0.55;
  hoverBoxHelper.renderOrder = 998;
  hoverBoxHelper.visible = false;
  scene.add(hoverBoxHelper);

  // =========================================================================
  // 4. ARTICULATED SCENE GRAPH HIERARCHY: "CyberArm-MK1" (F03)
  // =========================================================================
  const armNodes = {};
  const axesHelpers = [];
  const selectableMeshes = [];

  function registerSelectableMesh(mesh, name) {
    mesh.userData.isSelectable = true;
    if (name && !mesh.userData.name) mesh.userData.name = name;
    if (mesh.material) {
      const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (m && m.emissive) {
        mesh.userData.__origEmissive = m.emissive.getHex();
        mesh.userData.__origEmissiveIntensity = m.emissiveIntensity !== undefined ? m.emissiveIntensity : 0;
      }
    }
    selectableMeshes.push(mesh);
    return mesh;
  }

  function registerArmNode(name, object3D, isJointGroup = false) {
    object3D.userData.name = name;
    object3D.userData.isJoint = isJointGroup;
    armNodes[name] = object3D;
    return object3D;
  }

  function addJointAxes(parentGroup, size = 1.0) {
    const axes = new THREE.AxesHelper(size);
    axes.material.depthTest = false;
    axes.renderOrder = 3;
    parentGroup.add(axes);
    axesHelpers.push(axes);
    return axes;
  }

  function buildCyberArm() {
    // Shared Articulated Materials
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.45,
      metalness: 0.85
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x2c3038,
      roughness: 0.35,
      metalness: 0.90
    });
    const jointChromeMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.15,
      metalness: 0.95
    });
    const boomBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0a84ff, // Apple Blue
      roughness: 0.25,
      metalness: 0.60
    });
    const forearmSilverMat = new THREE.MeshStandardMaterial({
      color: 0x98989d,
      roughness: 0.30,
      metalness: 0.80
    });
    const clawMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d45,
      roughness: 0.40,
      metalness: 0.85
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x30d158, // Apple Green
      emissive: 0x30d158,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.2
    });

    // Tier 0: Root Group on Ground Plane
    const root = new THREE.Group();
    root.position.set(-3.2, 0, 0.5);
    registerArmNode("ArmRoot", root, false);
    scene.add(root);

    // Static Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.35, 32);
    const baseMesh = new THREE.Mesh(baseGeo, pedestalMat);
    baseMesh.position.y = 0.175;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    registerArmNode("BasePedestal", baseMesh);
    root.add(baseMesh);
    registerSelectableMesh(baseMesh, "BasePedestal");

    // Turntable Joint (DoF 1: Yaw around Y)
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(0, 0.35, 0);
    registerArmNode("BaseTurntable", turntableGroup, true);
    root.add(turntableGroup);
    addJointAxes(turntableGroup, 1.2);

    const capGeo = new THREE.CylinderGeometry(1.15, 1.3, 0.25, 32);
    const capMesh = new THREE.Mesh(capGeo, housingMat);
    capMesh.position.y = 0.125;
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;
    registerArmNode("TurntableCap", capMesh);
    turntableGroup.add(capMesh);
    registerSelectableMesh(capMesh, "TurntableCap");

    // Shoulder Brackets
    const bracketGeo = new THREE.BoxGeometry(0.18, 0.65, 0.45);
    const bLeft = new THREE.Mesh(bracketGeo, housingMat);
    bLeft.position.set(-0.42, 0.45, 0);
    bLeft.castShadow = true;
    bLeft.receiveShadow = true;
    turntableGroup.add(bLeft);
    registerSelectableMesh(bLeft, "ShoulderBracketLeft");

    const bRight = new THREE.Mesh(bracketGeo, housingMat);
    bRight.position.set(0.42, 0.45, 0);
    bRight.castShadow = true;
    bRight.receiveShadow = true;
    turntableGroup.add(bRight);
    registerSelectableMesh(bRight, "ShoulderBracketRight");

    // Tier 1: Shoulder Joint Group (DoF 2: Pitch around Z)
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(0, 0.65, 0);
    registerArmNode("ShoulderJoint", shoulderGroup, true);
    turntableGroup.add(shoulderGroup);
    addJointAxes(shoulderGroup, 1.1);

    const sSphereGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const sSphereMesh = new THREE.Mesh(sSphereGeo, jointChromeMat);
    sSphereMesh.castShadow = true;
    sSphereMesh.receiveShadow = true;
    registerArmNode("ShoulderHub", sSphereMesh);
    shoulderGroup.add(sSphereMesh);
    registerSelectableMesh(sSphereMesh, "ShoulderHub");

    // Upper Arm Boom (Offset Y = H/2 so it pivots at the hinge)
    const upperArmLength = 2.0;
    const upperArmGeo = new THREE.CylinderGeometry(0.22, 0.28, upperArmLength, 32);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, boomBlueMat);
    upperArmMesh.position.y = upperArmLength / 2;
    upperArmMesh.castShadow = true;
    upperArmMesh.receiveShadow = true;
    registerArmNode("UpperArmBoom", upperArmMesh);
    shoulderGroup.add(upperArmMesh);
    registerSelectableMesh(upperArmMesh, "UpperArmBoom");

    // Tier 2: Elbow Joint Group (DoF 3: Pitch around Z)
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, upperArmLength, 0);
    registerArmNode("ElbowJoint", elbowGroup, true);
    shoulderGroup.add(elbowGroup);
    addJointAxes(elbowGroup, 1.0);

    const elbowHubGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
    const elbowHubMesh = new THREE.Mesh(elbowHubGeo, jointChromeMat);
    elbowHubMesh.rotation.x = Math.PI / 2;
    elbowHubMesh.castShadow = true;
    elbowHubMesh.receiveShadow = true;
    registerArmNode("ElbowHub", elbowHubMesh);
    elbowGroup.add(elbowHubMesh);
    registerSelectableMesh(elbowHubMesh, "ElbowHub");

    // Forearm Boom (Offset Y = H/2)
    const forearmLength = 1.6;
    const forearmGeo = new THREE.CylinderGeometry(0.16, 0.22, forearmLength, 32);
    const forearmMesh = new THREE.Mesh(forearmGeo, forearmSilverMat);
    forearmMesh.position.y = forearmLength / 2;
    forearmMesh.castShadow = true;
    forearmMesh.receiveShadow = true;
    registerArmNode("ForearmBoom", forearmMesh);
    elbowGroup.add(forearmMesh);
    registerSelectableMesh(forearmMesh, "ForearmBoom");

    // Tier 3: Wrist Joint Group (DoF 4: Pitch around X / Roll around Y)
    const wristGroup = new THREE.Group();
    wristGroup.position.set(0, forearmLength, 0);
    registerArmNode("WristJoint", wristGroup, true);
    elbowGroup.add(wristGroup);
    addJointAxes(wristGroup, 0.9);

    const wristSphereGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const wristSphereMesh = new THREE.Mesh(wristSphereGeo, jointChromeMat);
    wristSphereMesh.castShadow = true;
    wristSphereMesh.receiveShadow = true;
    registerArmNode("WristHub", wristSphereMesh);
    wristGroup.add(wristSphereMesh);
    registerSelectableMesh(wristSphereMesh, "WristHub");

    // Tier 4: End Effector Assembly Group (Tool tip & Claw)
    const toolGroup = new THREE.Group();
    toolGroup.position.set(0, 0.22, 0);
    registerArmNode("EndEffector", toolGroup, true);
    wristGroup.add(toolGroup);
    addJointAxes(toolGroup, 0.8);

    const clawBaseGeo = new THREE.BoxGeometry(0.4, 0.08, 0.18);
    const clawBaseMesh = new THREE.Mesh(clawBaseGeo, clawMat);
    clawBaseMesh.position.y = 0.04;
    clawBaseMesh.castShadow = true;
    clawBaseMesh.receiveShadow = true;
    registerArmNode("ClawBase", clawBaseMesh);
    toolGroup.add(clawBaseMesh);
    registerSelectableMesh(clawBaseMesh, "ClawBase");

    // Sliding Pincers (Controlled by clawPinch)
    const pincerGeo = new THREE.BoxGeometry(0.06, 0.35, 0.1);
    const pincerLeft = new THREE.Mesh(pincerGeo, clawMat);
    pincerLeft.position.set(-0.11, 0.22, 0);
    pincerLeft.castShadow = true;
    registerArmNode("PincerLeft", pincerLeft);
    toolGroup.add(pincerLeft);
    registerSelectableMesh(pincerLeft, "PincerLeft");

    const pincerRight = new THREE.Mesh(pincerGeo, clawMat);
    pincerRight.position.set(0.11, 0.22, 0);
    pincerRight.castShadow = true;
    registerArmNode("PincerRight", pincerRight);
    toolGroup.add(pincerRight);
    registerSelectableMesh(pincerRight, "PincerRight");

    // Glowing Tool Tip Beacon (Target for Live HUD World Telemetry)
    const beaconGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, 0.38, 0);
    registerArmNode("ToolTipBeacon", beaconMesh);
    toolGroup.add(beaconMesh);
    registerSelectableMesh(beaconMesh, "ToolTipBeacon");

    // Set initial selection to ToolTipBeacon
    AppState.selectedObject = beaconMesh;
    selectionBoxHelper.setFromObject(beaconMesh);
    selectionBoxHelper.visible = true;
  }
  buildCyberArm();

  function applyCyberArmKinematics(timeSec) {
    const k = AppState.kinematics;

    if (k.autoWave) {
      // Kinematic sine wave cascade
      k.baseYaw = Math.sin(timeSec * 0.7) * 0.75;
      k.shoulderPitch = 0.436 + Math.sin(timeSec * 1.1) * 0.25;
      k.elbowPitch = -0.785 + Math.cos(timeSec * 1.3) * 0.35;
      k.wristPitch = Math.sin(timeSec * 1.8) * 0.35;
      k.clawPinch = (Math.sin(timeSec * 2.5) + 1.0) * 0.5;

      // Update slider values to follow wave visually
      const slBase = document.getElementById("slider-arm-base");
      const slShoulder = document.getElementById("slider-arm-shoulder");
      const slElbow = document.getElementById("slider-arm-elbow");
      const slWrist = document.getElementById("slider-arm-wrist");
      const slClaw = document.getElementById("slider-arm-claw");
      const vBase = document.getElementById("val-arm-base");
      const vShoulder = document.getElementById("val-arm-shoulder");
      const vElbow = document.getElementById("val-arm-elbow");
      const vWrist = document.getElementById("val-arm-wrist");
      const vClaw = document.getElementById("val-arm-claw");

      const degBase = Math.round(THREE.MathUtils.radToDeg(k.baseYaw));
      const degShoulder = Math.round(THREE.MathUtils.radToDeg(k.shoulderPitch));
      const degElbow = Math.round(THREE.MathUtils.radToDeg(k.elbowPitch));
      const degWrist = Math.round(THREE.MathUtils.radToDeg(k.wristPitch));
      const pctClaw = Math.round(k.clawPinch * 100);

      if (slBase) slBase.value = degBase;
      if (slShoulder) slShoulder.value = degShoulder;
      if (slElbow) slElbow.value = degElbow;
      if (slWrist) slWrist.value = degWrist;
      if (slClaw) slClaw.value = pctClaw;

      if (vBase) vBase.textContent = `${degBase}°`;
      if (vShoulder) vShoulder.textContent = `${degShoulder}°`;
      if (vElbow) vElbow.textContent = `${degElbow}°`;
      if (vWrist) vWrist.textContent = `${degWrist}°`;
      if (vClaw) vClaw.textContent = `${pctClaw}%`;
    }

    // Apply joint rotations
    if (armNodes["BaseTurntable"]) armNodes["BaseTurntable"].rotation.y = k.baseYaw;
    if (armNodes["ShoulderJoint"]) armNodes["ShoulderJoint"].rotation.z = k.shoulderPitch;
    if (armNodes["ElbowJoint"]) armNodes["ElbowJoint"].rotation.z = k.elbowPitch;
    if (armNodes["WristJoint"]) {
      armNodes["WristJoint"].rotation.x = k.wristPitch;
      armNodes["WristJoint"].rotation.y = k.wristRoll;
    }

    // Apply claw aperture
    if (armNodes["PincerLeft"] && armNodes["PincerRight"]) {
      const spread = 0.05 + k.clawPinch * 0.12;
      armNodes["PincerLeft"].position.x = -spread;
      armNodes["PincerRight"].position.x = spread;
    }
  }

  function setArmAxesVisibility(visible) {
    AppState.kinematics.showAxes = visible;
    for (let i = 0; i < axesHelpers.length; i++) {
      axesHelpers[i].visible = visible;
    }
  }

  // =========================================================================
  // 5. INTERACTIVE PBR MATERIAL SHOWCASE MESH (F04 / Challenge E)
  // =========================================================================
  const primaryPBRMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(AppState.pbr.color),
    roughness: AppState.pbr.roughness,
    metalness: AppState.pbr.metalness
  });

  // Showcase Pedestal on Right Side
  const pbrPedestalGeo = new THREE.CylinderGeometry(1.3, 1.45, 0.45, 32);
  const pbrPedestalMat = new THREE.MeshStandardMaterial({
    color: 0x181b22,
    roughness: 0.5,
    metalness: 0.8
  });
  const pbrPedestal = new THREE.Mesh(pbrPedestalGeo, pbrPedestalMat);
  pbrPedestal.position.set(2.5, 0.225, 0.5);
  pbrPedestal.castShadow = true;
  pbrPedestal.receiveShadow = true;
  pbrPedestal.name = "PBRShowcasePedestal";
  pbrPedestal.userData.name = "PBRShowcasePedestal";
  scene.add(pbrPedestal);
  registerSelectableMesh(pbrPedestal, "PBRShowcasePedestal");

  // Primary PBR Showcase Sphere
  const primarySphereGeo = new THREE.SphereGeometry(1.15, 64, 64);
  const primarySphere = new THREE.Mesh(primarySphereGeo, primaryPBRMaterial);
  primarySphere.name = "PBRShowcaseSphere";
  primarySphere.position.set(2.5, 1.6, 0.5);
  primarySphere.castShadow = true;
  primarySphere.receiveShadow = true;
  primarySphere.userData.name = "PBRShowcaseSphere";
  scene.add(primarySphere);
  registerSelectableMesh(primarySphere, "PBRShowcaseSphere");

  // Material inspection alternative materials
  const normalsMaterial = new THREE.MeshNormalMaterial();
  const roughnessMaterial = new THREE.MeshBasicMaterial();
  const metalnessMaterial = new THREE.MeshBasicMaterial();

  function updateVisualizerMode(mode) {
    AppState.pbr.visualizerMode = mode;
    if (mode === "pbr") {
      primarySphere.material = primaryPBRMaterial;
    } else if (mode === "normals") {
      primarySphere.material = normalsMaterial;
    } else if (mode === "roughness") {
      const g = AppState.pbr.roughness;
      roughnessMaterial.color.setRGB(g, g, g);
      primarySphere.material = roughnessMaterial;
    } else if (mode === "metalness") {
      const m = AppState.pbr.metalness;
      metalnessMaterial.color.setRGB(m, m, m);
      primarySphere.material = metalnessMaterial;
    }
  }

  const PBR_PRESETS = {
    chrome: { roughness: 0.04, metalness: 1.00, color: "#ffffff", name: "Chrome / Mirror" },
    gold: { roughness: 0.18, metalness: 1.00, color: "#ffd700", name: "24K Gold" },
    copper: { roughness: 0.35, metalness: 0.90, color: "#b87333", name: "Copper" },
    glossy: { roughness: 0.08, metalness: 0.00, color: "#0a84ff", name: "Glossy Blue" },
    rubber: { roughness: 0.92, metalness: 0.00, color: "#e5e5ea", name: "Matte Rubber" },
    steel: { roughness: 0.45, metalness: 0.85, color: "#cccccc", name: "Brushed Steel" }
  };

  function applyPBRPreset(presetKey) {
    const p = PBR_PRESETS[presetKey];
    if (!p) return;

    AppState.pbr.roughness = p.roughness;
    AppState.pbr.metalness = p.metalness;
    AppState.pbr.color = p.color;
    AppState.pbr.activePreset = presetKey;

    primaryPBRMaterial.roughness = p.roughness;
    primaryPBRMaterial.metalness = p.metalness;
    primaryPBRMaterial.color.setStyle(p.color);

    // Sync visualizer
    updateVisualizerMode(AppState.pbr.visualizerMode);

    // Sync UI elements
    const rSl = document.getElementById("slider-roughness");
    const mSl = document.getElementById("slider-metalness");
    const cPk = document.getElementById("picker-albedo");
    const rVal = document.getElementById("roughness-val");
    const mVal = document.getElementById("metalness-val");
    const cVal = document.getElementById("color-hex-val");

    if (rSl) rSl.value = p.roughness.toFixed(2);
    if (mSl) mSl.value = p.metalness.toFixed(2);
    if (cPk) cPk.value = p.color;
    if (rVal) rVal.textContent = p.roughness.toFixed(2);
    if (mVal) mVal.textContent = p.metalness.toFixed(2);
    if (cVal) cVal.textContent = p.color.toUpperCase();

    // Update active preset button style
    const container = document.getElementById("pbr-presets-container");
    if (container) {
      const pills = container.querySelectorAll(".preset-pill");
      pills.forEach((pill) => {
        pill.classList.toggle("active", pill.dataset.preset === presetKey);
      });
    }

    const hudMat = document.getElementById("hudMaterialInfo");
    if (hudMat) {
      hudMat.textContent = `${p.name} (r: ${p.roughness.toFixed(2)}, m: ${p.metalness.toFixed(2)})`;
    }
  }

  // =========================================================================
  // 5B. 3D GLTF MODEL LOADING PIPELINE & DUAL FALLBACK ARCHITECTURE (F06, F07)
  // =========================================================================
  const ANIMATION_CATALOG = {
    states: [
      { name: "Idle", label: "Idle (Breathing)", loop: THREE.LoopRepeat },
      { name: "Walking", label: "Walking Cycle", loop: THREE.LoopRepeat },
      { name: "Running", label: "Running Sprint", loop: THREE.LoopRepeat },
      { name: "Dance", label: "Dance Groove", loop: THREE.LoopRepeat },
      { name: "Sitting", label: "Sitting Pose", loop: THREE.LoopRepeat },
      { name: "Standing", label: "Standing Alert", loop: THREE.LoopRepeat }
    ],
    emotes: [
      { name: "Wave", label: "Wave", loop: THREE.LoopOnce },
      { name: "ThumbsUp", label: "Thumbs Up", loop: THREE.LoopOnce },
      { name: "Jump", label: "Jump", loop: THREE.LoopOnce },
      { name: "Punch", label: "Punch", loop: THREE.LoopOnce },
      { name: "Yes", label: "Yes (Nod)", loop: THREE.LoopOnce },
      { name: "No", label: "No (Shake)", loop: THREE.LoopOnce },
      { name: "Death", label: "Death (Power Down)", loop: THREE.LoopOnce }
    ]
  };

  function updateLoadingUI(isLoading, progressPct, statusText) {
    const stat = document.getElementById("res-stat");
    const badge = document.getElementById("card-model-source");
    if (isLoading) {
      if (stat) stat.textContent = statusText || `Memuat: ${progressPct}%`;
      if (badge) {
        badge.textContent = `Loading: ${progressPct}%`;
        badge.className = "badge-status badge-gold";
      }
    } else {
      if (stat) stat.textContent = `${canvas.clientWidth} × ${canvas.clientHeight} px`;
      if (badge) {
        badge.textContent = statusText || "Model: Bundled GLB";
        badge.className = "badge-status badge-gold";
      }
    }
  }

  function cleanupCurrentModel() {
    if (AppState.model.mixer) {
      AppState.model.mixer.stopAllAction();
      if (AppState.model.root) {
        AppState.model.mixer.uncacheRoot(AppState.model.root);
      }
      AppState.model.mixer = null;
    }
    if (AppState.model.root) {
      if (AppState.model.selectableRobotMeshes) {
        AppState.model.selectableRobotMeshes.forEach(function (mesh) {
          const idx = selectableMeshes.indexOf(mesh);
          if (idx !== -1) selectableMeshes.splice(idx, 1);
        });
      }
      scene.remove(AppState.model.root);
      AppState.model.root = null;
    }
    AppState.model.actions = {};
    AppState.model.activeAction = null;
    AppState.model.previousAction = null;
    AppState.model.selectableRobotMeshes = [];
  }

  // =========================================================================
  // 5C. ANIMATION MIXER, CROSSFADING & EMOTES CONTROLLER (F08)
  // =========================================================================
  function setupAnimationMixer(modelRoot, animations) {
    if (AppState.model.mixer) {
      AppState.model.mixer.stopAllAction();
      AppState.model.mixer.uncacheRoot(modelRoot);
      AppState.model.mixer = null;
    }

    const mixer = new THREE.AnimationMixer(modelRoot);
    AppState.model.mixer = mixer;
    AppState.model.actions = {};

    const emoteNames = new Set(ANIMATION_CATALOG.emotes.map(function (e) { return e.name; }));

    for (let i = 0; i < animations.length; i++) {
      const clip = animations[i];
      const action = mixer.clipAction(clip);
      AppState.model.actions[clip.name] = action;

      if (emoteNames.has(clip.name)) {
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
      } else {
        action.loop = THREE.LoopRepeat;
        action.clampWhenFinished = false;
      }
    }

    // Single robust finished listener for emote auto-recovery to base state
    mixer.addEventListener("finished", function (e) {
      if (AppState.model.isPlayingEmote && e.action === AppState.model.activeAction) {
        AppState.model.isPlayingEmote = false;
        const emoteContainer = document.getElementById("anim-emotes-container");
        if (emoteContainer) {
          const pills = emoteContainer.querySelectorAll(".preset-pill");
          pills.forEach(function (p) { p.classList.remove("playing-emote"); });
        }
        fadeToAction(AppState.model.currentBaseState, AppState.model.crossfadeDuration);
      }
    });

    // Default base state: Walking if present, otherwise Idle, otherwise first clip
    const defaultState = AppState.model.actions["Walking"] ? "Walking" :
                         (AppState.model.actions["Idle"] ? "Idle" : (animations[0] ? animations[0].name : "Idle"));
    if (defaultState && AppState.model.actions[defaultState]) {
      AppState.model.currentBaseState = defaultState;
      AppState.model.activeClipName = defaultState;
      AppState.model.currentClipName = defaultState;
      const initialAction = AppState.model.actions[defaultState];
      initialAction.play();
      AppState.model.activeAction = initialAction;
    }

    mixer.timeScale = AppState.model.playbackSpeed;
    syncAnimationUIState();
    updateTelemetry();
  }

  function fadeToAction(targetClipName, duration) {
    if (duration === undefined) duration = AppState.model.crossfadeDuration;
    const nextAction = AppState.model.actions[targetClipName];
    if (!nextAction) {
      console.warn(`[Animation] Clip "${targetClipName}" not found.`);
      return;
    }

    const currentAction = AppState.model.activeAction;
    if (currentAction === nextAction) {
      if (AppState.model.isPlayingEmote) {
        nextAction.reset().play();
      }
      return;
    }

    if (currentAction) {
      currentAction.fadeOut(duration);
    }

    nextAction
      .reset()
      .setEffectiveTimeScale(1.0)
      .setEffectiveWeight(1.0)
      .fadeIn(duration)
      .play();

    AppState.model.previousAction = currentAction;
    AppState.model.activeAction = nextAction;
    AppState.model.activeClipName = targetClipName;
    AppState.model.currentClipName = targetClipName;

    syncAnimationUIState();
    updateTelemetry();
  }

  function triggerEmote(emoteName, duration) {
    if (duration === undefined) duration = 0.25;
    const emoteAction = AppState.model.actions[emoteName];
    if (!emoteAction) {
      console.warn(`[Animation] Emote "${emoteName}" not found.`);
      return;
    }

    AppState.model.isPlayingEmote = true;
    emoteAction.reset();
    fadeToAction(emoteName, duration);

    // Visual feedback on emote pill
    const emoteContainer = document.getElementById("anim-emotes-container");
    if (emoteContainer) {
      const pills = emoteContainer.querySelectorAll(".preset-pill");
      pills.forEach(function (p) {
        p.classList.toggle("playing-emote", p.dataset.emote === emoteName);
      });
    }
  }

  function setAnimationSpeed(speed) {
    AppState.model.playbackSpeed = speed;
    if (AppState.model.mixer) {
      AppState.model.mixer.timeScale = speed;
    }
    const valSpeed = document.getElementById("val-anim-speed");
    if (valSpeed) valSpeed.textContent = `${speed.toFixed(1)}×`;
    const slSpeed = document.getElementById("slider-anim-speed");
    if (slSpeed && parseFloat(slSpeed.value) !== speed) slSpeed.value = speed;
    updateTelemetry();
  }

  function syncAnimationUIState() {
    const badgeState = document.getElementById("badge-anim-state");
    if (badgeState) {
      const isEmote = AppState.model.isPlayingEmote;
      const clip = AppState.model.currentClipName || "Idle";
      badgeState.textContent = `${clip} (${isEmote ? "LoopOnce" : "LoopRepeat"})`;
      badgeState.className = isEmote ? "badge-status badge-gold" : "badge-status badge-node";
    }

    const selectBase = document.getElementById("select-anim-base");
    if (selectBase && !AppState.model.isPlayingEmote) {
      if (selectBase.value !== AppState.model.currentBaseState) {
        selectBase.value = AppState.model.currentBaseState;
      }
    }
  }

  function handleGLTFLoadSuccess(gltf, sourceType) {
    cleanupCurrentModel();

    const model = gltf.scene;
    model.name = "RobotExpressive";
    model.userData.name = "RobotExpressive (SkinnedMesh)";

    // Position center stage: between CyberArm (-3.2, 0, 0.5) and PBR Sphere (2.5, 0, 0.5)
    model.scale.set(0.65, 0.65, 0.65);
    model.position.set(0, 0, 0.2);
    model.rotation.y = 0;

    const registeredMeshes = [];
    model.traverse(function (child) {
      if (child.isMesh) {
        // F07: Enable castShadow and receiveShadow
        child.castShadow = true;
        child.receiveShadow = true;

        // SkinnedMesh: prevent bounding box culling glitches during extreme poses
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }

        // PBR Material Optimization for RoomEnvironment reflections
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(function (mat) {
          if (mat) {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.envMapIntensity = 1.0;
              if (mat.map) mat.map.encoding = THREE.sRGBEncoding;
              if (mat.emissiveMap) mat.emissiveMap.encoding = THREE.sRGBEncoding;
            }
            if (mat.emissive) {
              child.userData.__origEmissive = mat.emissive.getHex();
              child.userData.__origEmissiveIntensity = mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0;
            }
            mat.needsUpdate = true;
          }
        });

        // Register for Raycasting selection
        child.userData.isSelectable = true;
        child.userData.isRobotMesh = true;
        child.userData.name = child.name ? ("Robot_" + child.name) : ("RobotPart_" + child.id);

        selectableMeshes.push(child);
        registeredMeshes.push(child);
      }
    });

    scene.add(model);
    AppState.model.root = model;
    AppState.model.isLoaded = true;
    AppState.model.isFallback = false;
    AppState.model.sourceType = sourceType;
    AppState.model.selectableRobotMeshes = registeredMeshes;

    // Setup AnimationMixer
    if (gltf.animations && gltf.animations.length > 0) {
      setupAnimationMixer(model, gltf.animations);
    }

    const labelMap = {
      "glb-local": "Model: Bundled GLB",
      "glb-cdn": "Model: CDN Mirror",
      "glb-dragdrop": "Model: Dropped GLB"
    };
    updateLoadingUI(false, 100, labelMap[sourceType] || "Model: Ready");
    console.log(`[Praktikum7] RobotExpressive loaded successfully (${sourceType}). Meshes: ${registeredMeshes.length}, Animations: ${gltf.animations ? gltf.animations.length : 0}`);
  }

  // Tier 1 Procedural Fallback Robot (ProceduralBot-MK1)
  function activateProceduralFallback() {
    cleanupCurrentModel();

    const botRoot = new THREE.Group();
    botRoot.name = "ProceduralBot-MK1";
    botRoot.userData.name = "ProceduralBot-MK1 (Offline Fallback)";
    botRoot.position.set(0, 0, 0.2);

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x22272e,
      roughness: 0.35,
      metalness: 0.85
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0xe6edf3,
      roughness: 0.15,
      metalness: 0.95
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.2
    });

    // Pelvis
    const pelvisGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.3, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, armorMat);
    pelvisMesh.position.y = 1.05;
    pelvisMesh.name = "BotPelvis";
    botRoot.add(pelvisMesh);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.7, 0.45);
    const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
    torsoMesh.position.y = 1.55;
    torsoMesh.name = "BotTorso";
    botRoot.add(torsoMesh);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.name = "BotHeadGroup";
    headGroup.position.set(0, 2.05, 0);
    const headGeo = new THREE.BoxGeometry(0.42, 0.38, 0.42);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.name = "BotHead";
    headGroup.add(headMesh);

    const visorGeo = new THREE.BoxGeometry(0.36, 0.12, 0.08);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.04, 0.22);
    visorMesh.name = "BotVisor";
    headGroup.add(visorMesh);
    botRoot.add(headGroup);

    // Limbs
    const limbGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 16);
    const jointGeo = new THREE.SphereGeometry(0.14, 16, 16);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.name = "BotLeftArm";
    leftArm.position.set(-0.52, 1.8, 0);
    const leftShoulder = new THREE.Mesh(jointGeo, jointMat);
    leftShoulder.name = "BotLeftShoulder";
    const leftBicep = new THREE.Mesh(limbGeo, armorMat);
    leftBicep.position.y = -0.35;
    leftBicep.name = "BotLeftBicep";
    leftArm.add(leftShoulder);
    leftArm.add(leftBicep);
    botRoot.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Group();
    rightArm.name = "BotRightArm";
    rightArm.position.set(0.52, 1.8, 0);
    const rightShoulder = new THREE.Mesh(jointGeo, jointMat);
    rightShoulder.name = "BotRightShoulder";
    const rightBicep = new THREE.Mesh(limbGeo, armorMat);
    rightBicep.position.y = -0.35;
    rightBicep.name = "BotRightBicep";
    rightArm.add(rightShoulder);
    rightArm.add(rightBicep);
    botRoot.add(rightArm);

    // Left Leg
    const leftLeg = new THREE.Group();
    leftLeg.name = "BotLeftLeg";
    leftLeg.position.set(-0.25, 0.9, 0);
    const leftThigh = new THREE.Mesh(limbGeo, armorMat);
    leftThigh.position.y = -0.4;
    leftThigh.name = "BotLeftThigh";
    leftLeg.add(leftThigh);
    botRoot.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.name = "BotRightLeg";
    rightLeg.position.set(0.25, 0.9, 0);
    const rightThigh = new THREE.Mesh(limbGeo, armorMat);
    rightThigh.position.y = -0.4;
    rightThigh.name = "BotRightThigh";
    rightLeg.add(rightThigh);
    botRoot.add(rightLeg);

    const registeredMeshes = [];
    botRoot.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.isSelectable = true;
        child.userData.isRobotMesh = true;
        child.userData.name = child.name || "ProceduralPart";
        if (child.material && child.material.emissive) {
          child.userData.__origEmissive = child.material.emissive.getHex();
          child.userData.__origEmissiveIntensity = child.material.emissiveIntensity || 0;
        }
        selectableMeshes.push(child);
        registeredMeshes.push(child);
      }
    });

    scene.add(botRoot);
    AppState.model.root = botRoot;
    AppState.model.isLoaded = true;
    AppState.model.isFallback = true;
    AppState.model.sourceType = "procedural";
    AppState.model.selectableRobotMeshes = registeredMeshes;
    AppState.model.proceduralNodes = {
      headGroup: headGroup,
      leftArm: leftArm,
      rightArm: rightArm,
      leftLeg: leftLeg,
      rightLeg: rightLeg
    };

    // Synthesize real AnimationClips with keyframe tracks so AnimationMixer is fully operational
    const allClipNames = [
      ...ANIMATION_CATALOG.states.map(function (s) { return s.name; }),
      ...ANIMATION_CATALOG.emotes.map(function (e) { return e.name; })
    ];

    const proceduralClips = allClipNames.map(function (clipName) {
      const times = [0, 0.5, 1.0];
      const track = new THREE.VectorKeyframeTrack("BotVisor.position", times, [
        0, 0.04, 0.22,
        0, 0.05, 0.22,
        0, 0.04, 0.22
      ]);
      return new THREE.AnimationClip(clipName, 1.0, [track]);
    });

    setupAnimationMixer(botRoot, proceduralClips);
    updateLoadingUI(false, 100, "Model: Procedural Robot");
  }

  function loadRobotModel() {
    if (typeof THREE.GLTFLoader === "undefined") {
      console.warn("GLTFLoader not available. Activating procedural fallback.");
      activateProceduralFallback();
      return;
    }

    const loader = new THREE.GLTFLoader();
    const localUrl = "assets/models/robot.glb";
    const cdnUrl = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/RobotExpressive/RobotExpressive.glb";

    AppState.model.isLoading = true;
    updateLoadingUI(true, 10, "Memuat Robot GLTF...");

    loader.load(
      localUrl,
      function (gltf) {
        handleGLTFLoadSuccess(gltf, "glb-local");
      },
      function (xhr) {
        if (xhr.lengthComputable && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          AppState.model.loadProgress = pct;
          updateLoadingUI(true, pct, `Memuat GLB: ${pct}%`);
        }
      },
      function (err) {
        console.warn("Local GLB load failed (file:/// CORS or network). Trying CDN mirror...", err);
        loader.load(
          cdnUrl,
          function (gltf) {
            handleGLTFLoadSuccess(gltf, "glb-cdn");
          },
          function (xhr) {
            if (xhr.lengthComputable && xhr.total > 0) {
              const pct = Math.round((xhr.loaded / xhr.total) * 100);
              updateLoadingUI(true, pct, `Memuat CDN: ${pct}%`);
            }
          },
          function (cdnErr) {
            console.warn("CDN GLB load failed or offline. Activating Procedural Robot Fallback...", cdnErr);
            activateProceduralFallback();
          }
        );
      }
    );
  }

  // Tier 2 Fallback: HTML5 Drag & Drop & File Input Parser
  function parseDroppedGLTF(file) {
    updateLoadingUI(true, 50, `Parsing ${file.name}...`);
    const reader = new FileReader();
    reader.onload = function (e) {
      const buffer = e.target.result;
      const loader = new THREE.GLTFLoader();
      loader.parse(
        buffer,
        "",
        function (gltf) {
          handleGLTFLoadSuccess(gltf, "glb-dragdrop");
        },
        function (parseErr) {
          console.error("GLTF ArrayBuffer parse error:", parseErr);
          updateLoadingUI(false, 0, "Gagal mem-parsing file 3D");
        }
      );
    };
    reader.readAsArrayBuffer(file);
  }

  function setupModelDropAndFileInput() {
    const wrapper = document.querySelector(".canvas-wrapper");
    if (wrapper) {
      ["dragenter", "dragover"].forEach(function (evt) {
        wrapper.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          wrapper.classList.add("drag-hover");
        });
      });

      ["dragleave", "drop"].forEach(function (evt) {
        wrapper.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          wrapper.classList.remove("drag-hover");
        });
      });

      wrapper.addEventListener("drop", function (e) {
        const dt = e.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) return;
        const file = dt.files[0];
        if (file.name.match(/\.(glb|gltf)$/i)) {
          parseDroppedGLTF(file);
        }
      });
    }

    const inputModelFile = document.getElementById("input-model-file");
    const btnBrowseModel = document.getElementById("btn-browse-model");
    if (btnBrowseModel && inputModelFile) {
      btnBrowseModel.addEventListener("click", function () {
        inputModelFile.click();
      });
      inputModelFile.addEventListener("change", function (e) {
        if (e.target.files && e.target.files.length > 0) {
          parseDroppedGLTF(e.target.files[0]);
        }
      });
    }
  }

  // =========================================================================
  // 5D. SCREEN-TO-NDC RAYCASTER & INTERACTION SELECTION ENGINE (F09, F10)
  // =========================================================================
  function updatePointerNDC(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    _mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  function handlePointerHover(e) {
    if (AppState.drag.isDragging) return;
    if (!updatePointerNDC(e.clientX, e.clientY)) return;

    _raycaster.setFromCamera(_mouseNDC, camera);
    const intersects = _raycaster.intersectObjects(selectableMeshes, true);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      canvas.style.cursor = "pointer";

      if (AppState.raycaster.hoveredMesh !== hitObj) {
        clearHover();
        AppState.raycaster.hoveredMesh = hitObj;
        AppState.hoveredObject = hitObj;

        // Apply subtle cyan emissive glow if not currently selected
        if (hitObj !== AppState.selectedObject) {
          if (hitObj.material && hitObj.material.emissive) {
            if (hitObj.userData.__origEmissive === undefined) {
              hitObj.userData.__origEmissive = hitObj.material.emissive.getHex();
              hitObj.userData.__origEmissiveIntensity = hitObj.material.emissiveIntensity !== undefined ? hitObj.material.emissiveIntensity : 0;
            }
            hitObj.material.emissive.setHex(0x1a3366);
            hitObj.material.emissiveIntensity = 0.6;
          }
          hoverBoxHelper.setFromObject(hitObj);
          hoverBoxHelper.visible = true;
        }
      }
    } else {
      canvas.style.cursor = AppState.drag.isDragging ? "grabbing" : "grab";
      clearHover();
    }
  }

  function clearHover() {
    if (AppState.raycaster.hoveredMesh) {
      const prev = AppState.raycaster.hoveredMesh;
      if (prev.material && prev.material.emissive && prev.userData.__origEmissive !== undefined) {
        prev.material.emissive.setHex(prev.userData.__origEmissive);
        prev.material.emissiveIntensity = prev.userData.__origEmissiveIntensity;
      }
      AppState.raycaster.hoveredMesh = null;
      AppState.hoveredObject = null;
    }
    if (hoverBoxHelper) hoverBoxHelper.visible = false;
  }

  function selectObject(object) {
    clearHover();
    AppState.selectedObject = object;
    if (selectionBoxHelper) {
      if (object) {
        selectionBoxHelper.setFromObject(object);
        selectionBoxHelper.visible = true;
      } else {
        selectionBoxHelper.visible = false;
      }
    }
    updateTelemetry();
  }

  function deselectObject() {
    clearHover();
    AppState.selectedObject = null;
    if (selectionBoxHelper) {
      selectionBoxHelper.visible = false;
    }
    updateTelemetry();
  }

  function handlePointerClick(e) {
    // 5px movement threshold prevents accidental clicks while orbiting
    if (AppState.raycaster.isDragOrbiting) return;
    if (!updatePointerNDC(e.clientX, e.clientY)) return;

    _raycaster.setFromCamera(_mouseNDC, camera);
    const intersects = _raycaster.intersectObjects(selectableMeshes, true);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      selectObject(hitObj);
    } else {
      // Background / ground click deselects
      deselectObject();
    }
  }

  // =========================================================================
  // 6. DYNAMIC HUD TELEMETRY & TRANSFORM INSPECTOR (Challenge C / F11)
  // =========================================================================
  function updateTelemetry() {
    const obj = AppState.selectedObject;
    const elActive = document.getElementById("hudActiveObj");
    const elBadge = document.getElementById("hudSelectionState");
    const elParent = document.getElementById("hud-parent-name");
    const elLocalPos = document.getElementById("hud-local-pos");
    const elLocalRot = document.getElementById("hud-local-rot");
    const elWorldPos = document.getElementById("hud-world-pos");
    const elWorldRot = document.getElementById("hud-world-rot");
    const elMat = document.getElementById("hudMaterialInfo");
    const elDimensions = document.getElementById("hud-dimensions");
    const elCardNode = document.getElementById("card-selected-node");
    const elCardLevel = document.getElementById("card-selected-level");
    const elCardDimensions = document.getElementById("card-selected-dimensions");
    const elCam = document.getElementById("hudCameraMode");

    if (elCam) {
      elCam.textContent = `PERSPECTIVE (50° Orbit: r=${AppState.camera.radius.toFixed(1)})`;
    }

    const elAnim = document.getElementById("hudActiveAnimation");
    if (elAnim) {
      const clip = AppState.model.currentClipName || "None";
      const spd = (AppState.model.playbackSpeed || 1.0).toFixed(1);
      const isEmote = AppState.model.isPlayingEmote;
      elAnim.textContent = `${clip} (${spd}× ${isEmote ? "Emote" : "Loop"})`;
    }

    if (!obj) {
      if (elActive) elActive.textContent = "None (Click Mesh in Viewport)";
      if (elBadge) {
        elBadge.textContent = "IDLE (NO SELECTION)";
        elBadge.className = "hud-item-val dimmed";
      }
      if (elParent) elParent.textContent = "Parent: Scene Root";
      if (elLocalPos) elLocalPos.textContent = "—";
      if (elLocalRot) elLocalRot.textContent = "—";
      if (elWorldPos) elWorldPos.textContent = "—";
      if (elWorldRot) elWorldRot.textContent = "—";
      if (elMat) elMat.textContent = "—";
      if (elDimensions) elDimensions.textContent = "—";
      if (elCardNode) elCardNode.textContent = "None";
      if (elCardLevel) elCardLevel.textContent = "Unselected";
      if (elCardDimensions) elCardDimensions.textContent = "—";
      return;
    }

    // Active object name & status badge
    const nodeName = obj.userData.name || obj.name || "Object3D";
    if (elActive) elActive.textContent = nodeName;
    if (elBadge) {
      elBadge.textContent = "LOCKED SELECTION";
      elBadge.className = "hud-item-val highlight-green";
    }

    // Hierarchy Parent
    const parentName = obj.parent ? (obj.parent.userData.name || obj.parent.name || obj.parent.type) : "Scene Root";
    if (elParent) elParent.textContent = `Parent: ${parentName}`;

    // Local Transform
    if (elLocalPos) {
      elLocalPos.textContent = `(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`;
    }
    if (elLocalRot) {
      const rx = THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1);
      const ry = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1);
      const rz = THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1);
      elLocalRot.textContent = `${rx}°, ${ry}°, ${rz}°`;
    }

    // World Transform
    obj.updateWorldMatrix(true, false);
    obj.getWorldPosition(_vScratchPos);
    obj.getWorldQuaternion(_qScratchQuat);
    _eScratchEuler.setFromQuaternion(_qScratchQuat, "YXZ");

    if (elWorldPos) {
      elWorldPos.textContent = `(${_vScratchPos.x.toFixed(2)}, ${_vScratchPos.y.toFixed(2)}, ${_vScratchPos.z.toFixed(2)})`;
    }
    if (elWorldRot) {
      const wx = THREE.MathUtils.radToDeg(_eScratchEuler.x).toFixed(1);
      const wy = THREE.MathUtils.radToDeg(_eScratchEuler.y).toFixed(1);
      const wz = THREE.MathUtils.radToDeg(_eScratchEuler.z).toFixed(1);
      elWorldRot.textContent = `${wx}°, ${wy}°, ${wz}°`;
    }

    // Material Spec
    if (elMat) {
      if (obj.material) {
        const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        const r = m.roughness !== undefined ? m.roughness.toFixed(2) : "N/A";
        const met = m.metalness !== undefined ? m.metalness.toFixed(2) : "N/A";
        elMat.textContent = `${m.type} (r: ${r}, m: ${met})`;
      } else {
        elMat.textContent = "Group / Non-Mesh";
      }
    }

    // Bounding Box Dimensions
    _boxScratch.setFromObject(obj);
    _boxScratch.getSize(_sizeScratch);
    const dimText = `${_sizeScratch.x.toFixed(2)} × ${_sizeScratch.y.toFixed(2)} × ${_sizeScratch.z.toFixed(2)}`;
    if (elDimensions) elDimensions.textContent = dimText;
    if (elCardDimensions) elCardDimensions.textContent = dimText;

    // Card 5 Inspector sync
    if (elCardNode) elCardNode.textContent = nodeName;
    if (elCardLevel) {
      let levelText = "Scene Mesh";
      if (obj.userData.isRobotMesh) levelText = "Robot Hierarchy (SkinnedMesh)";
      else if (obj.name && armNodes[obj.name]) levelText = "CyberArm Hierarchy";
      else if (obj.parent && obj.parent.name && armNodes[obj.parent.name]) levelText = "CyberArm Child";
      elCardLevel.textContent = levelText;
    }
  }

  // =========================================================================
  // 7. RESPONSIVE RESIZE PIPELINE (F01)
  // =========================================================================
  function checkResize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return false;

    const pixelRatio = renderer.getPixelRatio();
    const targetWidth = Math.floor(width * pixelRatio);
    const targetHeight = Math.floor(height * pixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const resStat = document.getElementById("res-stat");
      if (resStat) resStat.textContent = `${width} × ${height} px`;
      return true;
    }
    return false;
  }
  window.addEventListener("resize", checkResize);

  // =========================================================================
  // 8. INTERACTIVE ORBIT & MOUSE CONTROLS (F09 & F10)
  // =========================================================================
  canvas.addEventListener("pointerdown", function (e) {
    if (e.button === 0) {
      AppState.drag.isDragging = true;
      AppState.drag.prevX = e.clientX;
      AppState.drag.prevY = e.clientY;
      AppState.raycaster.pointerDownPos = { x: e.clientX, y: e.clientY };
      AppState.raycaster.isDragOrbiting = false;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }
  });

  window.addEventListener("pointermove", function (e) {
    if (AppState.drag.isDragging) {
      const dist = Math.hypot(e.clientX - AppState.raycaster.pointerDownPos.x, e.clientY - AppState.raycaster.pointerDownPos.y);
      if (dist > 5) {
        AppState.raycaster.isDragOrbiting = true;
      }

      const deltaX = e.clientX - AppState.drag.prevX;
      const deltaY = e.clientY - AppState.drag.prevY;
      AppState.drag.prevX = e.clientX;
      AppState.drag.prevY = e.clientY;

      const rotSpeed = 0.005;
      AppState.camera.theta -= deltaX * rotSpeed;
      AppState.camera.phi = Math.max(
        AppState.camera.minPhi,
        Math.min(AppState.camera.maxPhi, AppState.camera.phi - deltaY * rotSpeed)
      );

      updateCameraTransform();
    } else {
      // Raycaster Hover check
      handlePointerHover(e);
    }
  });

  canvas.addEventListener("pointerleave", function () {
    if (!AppState.drag.isDragging) {
      clearHover();
    }
  });

  window.addEventListener("pointerup", function (e) {
    if (AppState.drag.isDragging) {
      AppState.drag.isDragging = false;
      if (canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      // 5px movement threshold: only select if pointer didn't orbit drag
      if (!AppState.raycaster.isDragOrbiting) {
        handlePointerClick(e);
      }
    }
  });

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    const zoomSpeed = 0.012;
    AppState.camera.radius = Math.max(
      AppState.camera.minRadius,
      Math.min(AppState.camera.maxRadius, AppState.camera.radius + e.deltaY * zoomSpeed)
    );
    updateCameraTransform();
  }, { passive: false });

  // =========================================================================
  // 9. UI EVENT LISTENERS & SHORTCUT BINDINGS
  // =========================================================================
  // CyberArm Sliders
  function bindArmSlider(sliderId, valueDisplayId, jointKey, isRadians = true, factor = Math.PI / 180) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueDisplayId);
    if (!slider) return;

    slider.addEventListener("input", function (e) {
      const val = parseFloat(e.target.value);
      if (jointKey === "clawPinch") {
        AppState.kinematics.clawPinch = val / 100;
        if (display) display.textContent = `${Math.round(val)}%`;
      } else {
        AppState.kinematics[jointKey] = isRadians ? val * factor : val;
        if (display) display.textContent = `${Math.round(val)}°`;
      }
      applyCyberArmKinematics(performance.now() * 0.001);
      updateTelemetry();
    });
  }

  bindArmSlider("slider-arm-base", "val-arm-base", "baseYaw", true);
  bindArmSlider("slider-arm-shoulder", "val-arm-shoulder", "shoulderPitch", true);
  bindArmSlider("slider-arm-elbow", "val-arm-elbow", "elbowPitch", true);
  bindArmSlider("slider-arm-wrist", "val-arm-wrist", "wristPitch", true);
  bindArmSlider("slider-arm-claw", "val-arm-claw", "clawPinch", false);

  // Reset CyberArm Button
  const btnResetArm = document.getElementById("btn-reset-arm");
  if (btnResetArm) {
    btnResetArm.addEventListener("click", function () {
      AppState.kinematics.baseYaw = 0;
      AppState.kinematics.shoulderPitch = 0.436;
      AppState.kinematics.elbowPitch = -0.785;
      AppState.kinematics.wristPitch = 0.349;
      AppState.kinematics.wristRoll = 0;
      AppState.kinematics.clawPinch = 0.5;
      AppState.kinematics.autoWave = false;

      const slBase = document.getElementById("slider-arm-base");
      const slShoulder = document.getElementById("slider-arm-shoulder");
      const slElbow = document.getElementById("slider-arm-elbow");
      const slWrist = document.getElementById("slider-arm-wrist");
      const slClaw = document.getElementById("slider-arm-claw");
      if (slBase) slBase.value = 0;
      if (slShoulder) slShoulder.value = 25;
      if (slElbow) slElbow.value = -45;
      if (slWrist) slWrist.value = 20;
      if (slClaw) slClaw.value = 50;

      const vBase = document.getElementById("val-arm-base");
      const vShoulder = document.getElementById("val-arm-shoulder");
      const vElbow = document.getElementById("val-arm-elbow");
      const vWrist = document.getElementById("val-arm-wrist");
      const vClaw = document.getElementById("val-arm-claw");
      if (vBase) vBase.textContent = "0°";
      if (vShoulder) vShoulder.textContent = "25°";
      if (vElbow) vElbow.textContent = "-45°";
      if (vWrist) vWrist.textContent = "20°";
      if (vClaw) vClaw.textContent = "50%";

      const btnWave = document.getElementById("btn-autowave");
      if (btnWave) btnWave.classList.remove("active");

      applyCyberArmKinematics(0);
      updateTelemetry();
    });
  }

  // Auto-Wave Button (Key W)
  const btnAutoWave = document.getElementById("btn-autowave");
  function toggleAutoWave() {
    AppState.kinematics.autoWave = !AppState.kinematics.autoWave;
    if (btnAutoWave) btnAutoWave.classList.toggle("active", AppState.kinematics.autoWave);
  }
  if (btnAutoWave) {
    btnAutoWave.addEventListener("click", toggleAutoWave);
  }

  // Coordinate Axes Toggle (Key A)
  const btnToggleAxes = document.getElementById("btn-toggle-axes");
  function toggleAxes() {
    setArmAxesVisibility(!AppState.kinematics.showAxes);
    if (btnToggleAxes) btnToggleAxes.classList.toggle("active", AppState.kinematics.showAxes);
  }
  if (btnToggleAxes) {
    btnToggleAxes.addEventListener("click", toggleAxes);
  }

  // Environment Reflection Toggle (Challenge H / Key H)
  const btnEnvToggle = document.getElementById("btn-env-toggle");
  function toggleEnvironment(forcedState) {
    AppState.isEnvironmentOn = (forcedState !== undefined) ? forcedState : !AppState.isEnvironmentOn;
    scene.environment = AppState.isEnvironmentOn ? AppState.envTexture : null;

    if (btnEnvToggle) {
      btnEnvToggle.classList.toggle("active", AppState.isEnvironmentOn);
    }

    const hudEnv = document.getElementById("hud-env-status");
    if (hudEnv) {
      hudEnv.textContent = AppState.isEnvironmentOn ? "STUDIO PMREM (Active)" : "OFF (Direct Only)";
      hudEnv.className = "hud-item-val " + (AppState.isEnvironmentOn ? "highlight" : "dimmed");
    }
  }
  if (btnEnvToggle) {
    btnEnvToggle.addEventListener("click", () => toggleEnvironment());
  }

  // Auto-Rotate Toggle (Challenge G / Key R)
  const btnAutoRotate = document.getElementById("btn-auto-rotate");
  function toggleAutoRotate() {
    AppState.isAutoRotate = !AppState.isAutoRotate;
    if (btnAutoRotate) btnAutoRotate.classList.toggle("active", AppState.isAutoRotate);
  }
  if (btnAutoRotate) {
    btnAutoRotate.addEventListener("click", toggleAutoRotate);
  }

  // Pause / Resume Render Loop (Key Space)
  const btnPause = document.getElementById("btn-pause");
  const livePill = document.getElementById("live-pill");
  function togglePause() {
    AppState.isPaused = !AppState.isPaused;
    if (btnPause) {
      const lbl = btnPause.querySelector(".btn-label");
      if (lbl) lbl.textContent = AppState.isPaused ? "Resume" : "Pause";
      btnPause.classList.toggle("active", AppState.isPaused);
    }
    if (livePill) {
      livePill.classList.toggle("paused", AppState.isPaused);
      livePill.innerHTML = AppState.isPaused ? "<i></i> PAUSED" : "<i></i> LIVE";
    }
  }
  if (btnPause) {
    btnPause.addEventListener("click", togglePause);
  }

  // Reset All View & Transforms
  const btnReset = document.getElementById("btn-reset");
  const btnCanvasReset = document.getElementById("canvas-reset-btn");
  function resetAllView() {
    AppState.camera.radius = 11.5;
    AppState.camera.theta = 0.65;
    AppState.camera.phi = 1.15;
    updateCameraTransform();
    if (btnResetArm) btnResetArm.click();
    applyPBRPreset("glossy");
    toggleEnvironment(true);
    AppState.isAutoRotate = false;
    if (btnAutoRotate) btnAutoRotate.classList.remove("active");
  }
  if (btnReset) btnReset.addEventListener("click", resetAllView);
  if (btnCanvasReset) btnCanvasReset.addEventListener("click", resetAllView);

  // Fullscreen Button
  const btnFullscreen = document.getElementById("canvas-fullscreen-btn");
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", function () {
      const viewport = document.querySelector(".workbench-viewport");
      if (!viewport) return;
      if (!document.fullscreenElement) {
        if (viewport.requestFullscreen) viewport.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // PBR Sliders
  const slRoughness = document.getElementById("slider-roughness");
  const slMetalness = document.getElementById("slider-metalness");
  const pkAlbedo = document.getElementById("picker-albedo");
  const valRoughness = document.getElementById("roughness-val");
  const valMetalness = document.getElementById("metalness-val");
  const valAlbedo = document.getElementById("color-hex-val");

  if (slRoughness) {
    slRoughness.addEventListener("input", function (e) {
      const v = parseFloat(e.target.value);
      AppState.pbr.roughness = v;
      primaryPBRMaterial.roughness = v;
      if (valRoughness) valRoughness.textContent = v.toFixed(2);
      updateVisualizerMode(AppState.pbr.visualizerMode);
    });
  }

  if (slMetalness) {
    slMetalness.addEventListener("input", function (e) {
      const v = parseFloat(e.target.value);
      AppState.pbr.metalness = v;
      primaryPBRMaterial.metalness = v;
      if (valMetalness) valMetalness.textContent = v.toFixed(2);
      updateVisualizerMode(AppState.pbr.visualizerMode);
    });
  }

  if (pkAlbedo) {
    pkAlbedo.addEventListener("input", function (e) {
      const hex = e.target.value;
      AppState.pbr.color = hex;
      primaryPBRMaterial.color.setStyle(hex);
      if (valAlbedo) valAlbedo.textContent = hex.toUpperCase();
    });
  }

  // Visualizer Mode Segmented
  const segVisualizer = document.getElementById("seg-visualizer-mode");
  if (segVisualizer) {
    segVisualizer.addEventListener("click", function (e) {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      const mode = btn.dataset.mode;
      if (!mode) return;
      segVisualizer.querySelectorAll(".choice").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateVisualizerMode(mode);
    });
  }

  // PBR Gallery Presets (Challenge E)
  const pbrContainer = document.getElementById("pbr-presets-container");
  if (pbrContainer) {
    pbrContainer.addEventListener("click", function (e) {
      const pill = e.target.closest(".preset-pill");
      if (!pill) return;
      const preset = pill.dataset.preset;
      if (preset) applyPBRPreset(preset);
    });
  }

  // Lighting Sliders
  const slLightDir = document.getElementById("slider-light-dir");
  const slLightHemi = document.getElementById("slider-light-hemi");
  const slLightAmb = document.getElementById("slider-light-amb");
  const valLightDir = document.getElementById("val-light-dir");
  const valLightHemi = document.getElementById("val-light-hemi");
  const valLightAmb = document.getElementById("val-light-amb");

  if (slLightDir) {
    slLightDir.addEventListener("input", function (e) {
      const v = parseFloat(e.target.value);
      AppState.lighting.dirIntensity = v;
      dirLight.intensity = v;
      if (valLightDir) valLightDir.textContent = v.toFixed(1);
    });
  }

  if (slLightHemi) {
    slLightHemi.addEventListener("input", function (e) {
      const v = parseFloat(e.target.value);
      AppState.lighting.hemiIntensity = v;
      hemiLight.intensity = v;
      if (valLightHemi) valLightHemi.textContent = v.toFixed(1);
    });
  }

  if (slLightAmb) {
    slLightAmb.addEventListener("input", function (e) {
      const v = parseFloat(e.target.value);
      AppState.lighting.ambIntensity = v;
      ambLight.intensity = v;
      if (valLightAmb) valLightAmb.textContent = v.toFixed(2);
    });
  }

  // Ground Grid Toggle
  const btnToggleGrid = document.getElementById("btn-toggle-grid");
  if (btnToggleGrid) {
    btnToggleGrid.addEventListener("click", function () {
      AppState.lighting.showGrid = !AppState.lighting.showGrid;
      gridHelper.visible = AppState.lighting.showGrid;
      btnToggleGrid.classList.toggle("active", AppState.lighting.showGrid);
      btnToggleGrid.textContent = AppState.lighting.showGrid ? "Grid On" : "Grid Off";
    });
  }

  // Keyboard Shortcuts (H, W, A, R, Space, 1-6)
  window.addEventListener("keydown", function (e) {
    // Avoid hijacking when typing inside form inputs
    if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;

    const key = e.key.toLowerCase();
    if (key === "h") {
      e.preventDefault();
      toggleEnvironment();
    } else if (key === "w") {
      e.preventDefault();
      toggleAutoWave();
    } else if (key === "a") {
      e.preventDefault();
      toggleAxes();
    } else if (key === "r") {
      e.preventDefault();
      toggleAutoRotate();
    } else if (e.code === "Space") {
      e.preventDefault();
      togglePause();
    } else if (key === "1") {
      applyPBRPreset("chrome");
    } else if (key === "2") {
      applyPBRPreset("gold");
    } else if (key === "3") {
      applyPBRPreset("copper");
    } else if (key === "4") {
      applyPBRPreset("glossy");
    } else if (key === "5") {
      applyPBRPreset("rubber");
    } else if (key === "6") {
      applyPBRPreset("steel");
    }
  });

  // Apply default glossy preset on launch
  applyPBRPreset("glossy");

  // Model Animation Controls (F08)
  const selAnimBase = document.getElementById("select-anim-base");
  if (selAnimBase) {
    selAnimBase.addEventListener("change", function (e) {
      const clipName = e.target.value;
      AppState.model.currentBaseState = clipName;
      fadeToAction(clipName, AppState.model.crossfadeDuration);
    });
  }

  const emoteContainer = document.getElementById("anim-emotes-container");
  if (emoteContainer) {
    emoteContainer.addEventListener("click", function (e) {
      const pill = e.target.closest(".preset-pill[data-emote]");
      if (!pill) return;
      const emoteName = pill.dataset.emote;
      if (emoteName) {
        triggerEmote(emoteName, AppState.model.crossfadeDuration);
      }
    });
  }

  const slAnimSpeed = document.getElementById("slider-anim-speed");
  if (slAnimSpeed) {
    slAnimSpeed.addEventListener("input", function (e) {
      const val = parseFloat(e.target.value);
      setAnimationSpeed(val);
    });
  }

  const slAnimCrossfade = document.getElementById("slider-anim-crossfade");
  const valAnimCrossfade = document.getElementById("val-anim-crossfade");
  if (slAnimCrossfade) {
    slAnimCrossfade.addEventListener("input", function (e) {
      const val = parseFloat(e.target.value);
      AppState.model.crossfadeDuration = val;
      if (valAnimCrossfade) valAnimCrossfade.textContent = `${val.toFixed(2)} s`;
    });
  }

  // =========================================================================
  // 10. MAIN ANIMATION & RENDER LOOP (Target 60 FPS)
  // =========================================================================
  let previousFrameTime = performance.now();

  function animate(currentTime) {
    requestAnimationFrame(animate);

    // Compute Delta Time (clamped to max 100ms to eliminate tab-switch glitch)
    const dt = Math.min((currentTime - previousFrameTime) * 0.001, 0.1);
    previousFrameTime = currentTime;
    AppState.deltaTime = dt;

    // Profiling: Frame counter & FPS estimation
    AppState.frameCount++;
    if (currentTime - AppState.lastFpsUpdate >= 500) {
      AppState.fps = Math.round((AppState.frameCount * 1000) / (currentTime - AppState.lastFpsUpdate));
      AppState.frameCount = 0;
      AppState.lastFpsUpdate = currentTime;

      const fpsStat = document.getElementById("fps-stat");
      if (fpsStat) fpsStat.textContent = `${AppState.fps} FPS`;

      const dtStat = document.getElementById("dt-stat");
      if (dtStat) dtStat.textContent = `${(dt * 1000).toFixed(1)} ms`;
    }

    // Dynamic responsive size check
    checkResize();

    // Skip animation updates if paused
    if (!AppState.isPaused) {
      const timeSec = currentTime * 0.001;

      // 1. Apply kinematics (either sine wave or static slider states)
      applyCyberArmKinematics(timeSec);

      // 2. Procedural Robot idle wave when fallback active
      if (AppState.model.isFallback && AppState.model.proceduralNodes) {
        const pNodes = AppState.model.proceduralNodes;
        const breath = Math.sin(timeSec * 2.0) * 0.03;
        if (pNodes.headGroup) pNodes.headGroup.position.y = 2.05 + breath;
      }

      // 3. Update THREE.AnimationMixer (F08)
      if (AppState.model.mixer) {
        AppState.model.mixer.update(dt);
      }

      // 4. Selection Auto-Rotation (Challenge G)
      if (AppState.isAutoRotate) {
        const targetObj = AppState.selectedObject || primarySphere;
        if (targetObj) {
          targetObj.rotation.y += AppState.autoRotateSpeed;
          if (selectionBoxHelper && selectionBoxHelper.visible) {
            selectionBoxHelper.update();
          }
        }
      }

      // 5. Dynamic tracking update for selection & hover bounding boxes
      if (AppState.selectedObject && selectionBoxHelper && selectionBoxHelper.visible && selectionBoxHelper.object) {
        selectionBoxHelper.update();
      }
      if (AppState.raycaster.hoveredMesh && hoverBoxHelper && hoverBoxHelper.visible && hoverBoxHelper.object) {
        hoverBoxHelper.update();
      }

      // 6. Update live telemetry HUD
      updateTelemetry();
    }

    // Render WebGL Scene
    renderer.render(scene, camera);
  }

  // Initialize 3D Model Loading Pipeline and Drag & Drop (F06)
  loadRobotModel();
  setupModelDropAndFileInput();

  // Trigger initial resize & kick off render loop
  checkResize();
  requestAnimationFrame(animate);

  // Expose clean public interface for automated verification and debugging
  window.Praktikum7 = {
    AppState: AppState,
    scene: scene,
    renderer: renderer,
    camera: camera,
    armNodes: armNodes,
    primarySphere: primarySphere,
    primaryPBRMaterial: primaryPBRMaterial,
    selectableMeshes: selectableMeshes,
    selectionBoxHelper: selectionBoxHelper,
    hoverBoxHelper: hoverBoxHelper,
    selectObject: selectObject,
    deselectObject: deselectObject,
    raycaster: _raycaster,
    get mixer() { return AppState.model.mixer; },
    get actions() { return AppState.model.actions; },
    fadeToAction: fadeToAction,
    triggerEmote: triggerEmote,
    setAnimationSpeed: setAnimationSpeed,
    loadRobotModel: loadRobotModel,
    activateProceduralFallback: activateProceduralFallback,
    parseDroppedGLTF: parseDroppedGLTF,
    setupAnimationMixer: setupAnimationMixer,
    toggleEnvironment: toggleEnvironment,
    applyPBRPreset: applyPBRPreset,
    setArmAxesVisibility: setArmAxesVisibility
  };

  console.log("Praktikum 7 Three.js Interactive 3D (Milestone 2) initialized successfully.");
})();
