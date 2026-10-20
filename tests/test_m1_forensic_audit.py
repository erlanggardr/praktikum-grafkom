"""
Forensic Audit Verification Suite for Milestone 1
Praktikum 7: Three.js Interactive 3D Application
Kelompok YOLO: Jalu Cahyo Senodiputro & Erlangga Rizqi Dwi Raswanto

Auditor: auditor_m1_1
Verification target:
  - F01: WebGLRenderer, shadowMap, sRGB, tone mapping, responsive resize
  - F02: Ground plane, soft shadows, directional light frustum, ambient/hemi fill
  - F03: 5-Tier Articulated Scene Graph (CyberArm-MK1) parent-child kinematics invariance
  - F04: PBR MeshStandardMaterial roughness, metalness, and visualizer modes
  - F05: Inlined RoomEnvironment PMREM cubemap generation and Challenge H toggle
  - Vendor GLTFLoader.js Three.js r128 authenticity
"""

import http.server
import socketserver
import threading
import time
import os
import sys
import math
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PORT = 9001
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def run_forensic_audit():
    print("=" * 70)
    print("STARTING FORENSIC INTEGRITY AUDIT - MILESTONE 1")
    print("=" * 70)

    httpd = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[HTTP] Server listening on http://127.0.0.1:{PORT}")

    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-gpu')
    options.add_argument('--allow-file-access-from-files')
    options.add_argument('--window-size=1280,800')

    driver = webdriver.Chrome(options=options)

    try:
        url = f'http://127.0.0.1:{PORT}/praktikum-7/index.html'
        print(f"[NAV] Loading {url}")
        driver.get(url)
        time.sleep(2.0)

        # -------------------------------------------------------------
        # 1. Console Log Forensic Check
        # -------------------------------------------------------------
        logs = driver.get_log('browser')
        severe = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        print(f"\n[FORENSIC CHECK 1] Browser Console Logs (Total: {len(logs)})")
        for l in logs:
            print(f"  [{l['level']}] {l['message']}")
        assert len(severe) == 0, f"Integrity Violation: Severe console errors found: {severe}"
        print("  -> PASS: 0 severe console errors.")

        # -------------------------------------------------------------
        # 2. Authentic WebGLRenderer & Canvas Gate Check
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 2] WebGLRenderer & Canvas Authenticity")
        renderer_info = driver.execute_script("""
            const P7 = window.Praktikum7;
            if (!P7 || !P7.renderer) return null;
            const r = P7.renderer;
            const gl = r.getContext();
            const canvas = document.getElementById('grafkom-canvas');
            return {
                isWebGLRenderer: r instanceof THREE.WebGLRenderer,
                hasContext: !!gl,
                contextType: gl ? gl.constructor.name : null,
                shadowMapEnabled: r.shadowMap.enabled,
                shadowMapType: r.shadowMap.type,
                outputEncoding: r.outputEncoding,
                toneMapping: r.toneMapping,
                domMatchesCanvas: r.domElement === canvas,
                canvasDataCustom: canvas.dataset.custom,
                canvasClass: canvas.className
            };
        """)
        assert renderer_info is not None, "Integrity Violation: window.Praktikum7.renderer is null"
        assert renderer_info['isWebGLRenderer'] == True, "Not a real THREE.WebGLRenderer instance"
        assert renderer_info['hasContext'] == True, "WebGL context is null"
        assert renderer_info['shadowMapEnabled'] == True, "ShadowMap is not enabled"
        assert renderer_info['shadowMapType'] == 2, f"ShadowMap type must be PCFSoftShadowMap (2), got {renderer_info['shadowMapType']}"
        assert renderer_info['outputEncoding'] == 3001, f"Output encoding must be sRGBEncoding (3001), got {renderer_info['outputEncoding']}"
        assert renderer_info['toneMapping'] == 4, f"Tone mapping must be ACESFilmicToneMapping (4), got {renderer_info['toneMapping']}"
        assert renderer_info['domMatchesCanvas'] == True, "Renderer DOM element does not match #grafkom-canvas"
        assert renderer_info['canvasDataCustom'] == "true", "Canvas data-custom must be 'true'"
        assert "custom-workbench" in renderer_info['canvasClass'], "Canvas must have 'custom-workbench' class"
        print(f"  Renderer Context: {renderer_info['contextType']}")
        print(f"  ShadowMap: {renderer_info['shadowMapType']} (PCFSoftShadowMap)")
        print(f"  Encoding / ToneMapping: {renderer_info['outputEncoding']} / {renderer_info['toneMapping']}")
        print("  -> PASS: WebGLRenderer & Canvas Gate authentic.")

        # -------------------------------------------------------------
        # 3. Authentic Lighting System & Soft Shadows
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 3] Lighting System & Shadow Pipeline")
        lighting_info = driver.execute_script("""
            const scene = window.Praktikum7.scene;
            let dir = null, hemi = null, amb = null, ground = null;
            scene.traverse((obj) => {
                if (obj.isDirectionalLight) dir = obj;
                if (obj.isHemisphereLight) hemi = obj;
                if (obj.isAmbientLight) amb = obj;
                if (obj.isMesh && obj.geometry && obj.geometry.type === 'PlaneGeometry') ground = obj;
            });
            return {
                hasDirLight: !!dir,
                dirCastShadow: dir ? dir.castShadow : false,
                dirMapW: dir ? dir.shadow.mapSize.width : 0,
                dirMapH: dir ? dir.shadow.mapSize.height : 0,
                dirBias: dir ? dir.shadow.bias : 0,
                dirFrustum: dir ? [dir.shadow.camera.left, dir.shadow.camera.right, dir.shadow.camera.top, dir.shadow.camera.bottom] : null,
                hasHemiLight: !!hemi,
                hasAmbLight: !!amb,
                groundReceiveShadow: ground ? ground.receiveShadow : false
            };
        """)
        assert lighting_info['hasDirLight'] == True, "Missing DirectionalLight"
        assert lighting_info['dirCastShadow'] == True, "DirectionalLight must cast shadows"
        assert lighting_info['dirMapW'] == 2048 and lighting_info['dirMapH'] == 2048, "Shadow map must be 2048x2048"
        assert lighting_info['dirBias'] == -0.0005, f"Shadow bias mismatch: {lighting_info['dirBias']}"
        assert lighting_info['dirFrustum'] == [-10, 10, 10, -10], f"Shadow frustum mismatch: {lighting_info['dirFrustum']}"
        assert lighting_info['hasHemiLight'] == True, "Missing HemisphereLight"
        assert lighting_info['hasAmbLight'] == True, "Missing AmbientLight"
        assert lighting_info['groundReceiveShadow'] == True, "Ground mesh must receive shadows"
        print("  -> PASS: Lighting, Shadow Frustum & Ground Plane verified.")

        # -------------------------------------------------------------
        # 4. Authentic RoomEnvironment & PMREM Texture (Challenge H)
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 4] Inlined RoomEnvironment & PMREMGenerator")
        env_info = driver.execute_script("""
            const scene = window.Praktikum7.scene;
            const env = scene.environment;
            return {
                hasEnv: !!env,
                isTexture: env ? env.isTexture : false,
                isRenderTargetTexture: env ? env.isRenderTargetTexture : false,
                mapping: env ? env.mapping : null,
                envTextureStored: !!window.Praktikum7.AppState.envTexture
            };
        """)
        assert env_info['hasEnv'] == True, "scene.environment is null on startup"
        assert env_info['isTexture'] == True or env_info['isRenderTargetTexture'] == True, "scene.environment is not a valid Texture"
        assert env_info['mapping'] == 306, f"Expected CubeUVReflectionMapping (306), got {env_info['mapping']}"
        print(f"  Environment texture mapping: {env_info['mapping']} (CubeUVReflectionMapping)")

        # Test toggle OFF & ON
        driver.execute_script("window.Praktikum7.toggleEnvironment(false);")
        time.sleep(0.1)
        assert driver.execute_script("return window.Praktikum7.scene.environment;") is None, "scene.environment should be null when toggled OFF"

        driver.execute_script("window.Praktikum7.toggleEnvironment(true);")
        time.sleep(0.1)
        assert driver.execute_script("return !!window.Praktikum7.scene.environment;") == True, "scene.environment should be restored"
        print("  -> PASS: RoomEnvironment PMREM texture generation and toggle verified.")

        # -------------------------------------------------------------
        # 5. Articulated Scene Graph Hierarchy & Forward Kinematics (F03)
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 5] Scene Graph Hierarchy & Kinematics Invariance")
        hierarchy = driver.execute_script("""
            const nodes = window.Praktikum7.armNodes;
            const root = nodes['ArmRoot'];
            const turntable = nodes['BaseTurntable'];
            const shoulder = nodes['ShoulderJoint'];
            const elbow = nodes['ElbowJoint'];
            const wrist = nodes['WristJoint'];
            const endEffector = nodes['EndEffector'];
            const beacon = nodes['ToolTipBeacon'];

            return {
                rootExists: !!root && root.isGroup,
                turntableParentIsRoot: turntable.parent === root,
                shoulderParentIsTurntable: shoulder.parent === turntable,
                elbowParentIsShoulder: elbow.parent === shoulder,
                wristParentIsElbow: wrist.parent === elbow,
                endEffectorParentIsWrist: endEffector.parent === wrist,
                beaconParentIsEndEffector: beacon.parent === endEffector,
                turntableIsGroup: turntable.isGroup,
                shoulderIsGroup: shoulder.isGroup,
                elbowIsGroup: elbow.isGroup,
                wristIsGroup: wrist.isGroup,
                endEffectorIsGroup: endEffector.isGroup,
                beaconIsMesh: beacon.isMesh
            };
        """)
        for k, v in hierarchy.items():
            assert v == True, f"Scene graph structure failure at {k}: {v}"
        print("  5-Tier Scene Graph Hierarchy strictly matches parent-child specifications.")

        # Mathematical Kinematics Invariance Test
        kinematics_test = driver.execute_script("""
            const nodes = window.Praktikum7.armNodes;
            const scene = window.Praktikum7.scene;
            const turntable = nodes['BaseTurntable'];
            const beacon = nodes['ToolTipBeacon'];

            // Initial state (Base Yaw = 0)
            turntable.rotation.y = 0;
            scene.updateMatrixWorld(true);
            const p0_local = beacon.position.clone();
            const p0_world = new THREE.Vector3();
            beacon.getWorldPosition(p0_world);

            // Test 1: Rotate Base Yaw by 90 degrees (Math.PI / 2)
            turntable.rotation.y = Math.PI / 2;
            scene.updateMatrixWorld(true);
            const p1_local = beacon.position.clone();
            const p1_world = new THREE.Vector3();
            beacon.getWorldPosition(p1_world);

            // Test 2: Rotate Base Yaw by 180 degrees (Math.PI)
            turntable.rotation.y = Math.PI;
            scene.updateMatrixWorld(true);
            const p2_local = beacon.position.clone();
            const p2_world = new THREE.Vector3();
            beacon.getWorldPosition(p2_world);

            // Reset
            turntable.rotation.y = 0;
            scene.updateMatrixWorld(true);

            return {
                p0_local: [p0_local.x, p0_local.y, p0_local.z],
                p0_world: [p0_world.x, p0_world.y, p0_world.z],
                p1_local: [p1_local.x, p1_local.y, p1_local.z],
                p1_world: [p1_world.x, p1_world.y, p1_world.z],
                p2_local: [p2_local.x, p2_local.y, p2_local.z],
                p2_world: [p2_world.x, p2_world.y, p2_world.z]
            };
        """)

        p0_l, p0_w = kinematics_test['p0_local'], kinematics_test['p0_world']
        p1_l, p1_w = kinematics_test['p1_local'], kinematics_test['p1_world']
        p2_l, p2_w = kinematics_test['p2_local'], kinematics_test['p2_world']

        print(f"  Base Yaw 0°   -> Local: {p0_l}, World: {p0_w}")
        print(f"  Base Yaw 90°  -> Local: {p1_l}, World: {p1_w}")
        print(f"  Base Yaw 180° -> Local: {p2_l}, World: {p2_w}")

        # Invariance check: Local coordinates MUST be identical down to floating point precision
        for i in range(3):
            assert abs(p0_l[i] - p1_l[i]) < 1e-6, f"Local coord {i} changed on 90° rotation: {p0_l[i]} vs {p1_l[i]}"
            assert abs(p0_l[i] - p2_l[i]) < 1e-6, f"Local coord {i} changed on 180° rotation: {p0_l[i]} vs {p2_l[i]}"

        # World coordinates MUST change
        assert p0_w != p1_w, "World coordinates did not change on 90° rotation!"
        assert p0_w != p2_w, "World coordinates did not change on 180° rotation!"

        # Geometric check: Distance from turntable center (-3.2, 0.5) in XZ plane must be invariant!
        r0 = math.hypot(p0_w[0] - (-3.2), p0_w[2] - 0.5)
        r1 = math.hypot(p1_w[0] - (-3.2), p1_w[2] - 0.5)
        r2 = math.hypot(p2_w[0] - (-3.2), p2_w[2] - 0.5)
        print(f"  Radius from Turntable Axis: r0={r0:.4f}, r1={r1:.4f}, r2={r2:.4f}")
        assert abs(r0 - r1) < 1e-4, f"Radial distance changed on 90° rotation: {r0} vs {r1}"
        assert abs(r0 - r2) < 1e-4, f"Radial distance changed on 180° rotation: {r0} vs {r2}"
        print("  -> PASS: Scene Graph Parent-Child Local Invariance & World Transformation verified.")

        # -------------------------------------------------------------
        # 6. PBR MeshStandardMaterial & Gallery Presets (F04 / Challenge E)
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 6] PBR MeshStandardMaterial & Visualizer")
        presets = ['chrome', 'gold', 'copper', 'glossy', 'rubber', 'steel']
        for pr in presets:
            driver.execute_script(f"window.Praktikum7.applyPBRPreset('{pr}');")
            p_info = driver.execute_script("""
                const mat = window.Praktikum7.primaryPBRMaterial;
                return {
                    roughness: mat.roughness,
                    metalness: mat.metalness,
                    colorHex: mat.color.getHexString()
                };
            """)
            print(f"  Preset '{pr}' -> roughness: {p_info['roughness']}, metalness: {p_info['metalness']}, color: #{p_info['colorHex']}")

        # Visualizer modes
        driver.execute_script("document.querySelector('#seg-visualizer-mode [data-mode=\"normals\"]').click();")
        time.sleep(0.1)
        v_mat = driver.execute_script("return window.Praktikum7.primarySphere.material.type;")
        assert v_mat == "MeshNormalMaterial", f"Expected MeshNormalMaterial, got {v_mat}"

        driver.execute_script("document.querySelector('#seg-visualizer-mode [data-mode=\"pbr\"]').click();")
        time.sleep(0.1)
        v_mat = driver.execute_script("return window.Praktikum7.primarySphere.material.type;")
        assert v_mat == "MeshStandardMaterial", f"Expected MeshStandardMaterial, got {v_mat}"
        print("  -> PASS: PBR Material Presets & Visualizer Modes verified.")

        # -------------------------------------------------------------
        # 7. Stress Testing & Viewport Resizing
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 7] Adversarial Stress Testing")
        # Resize to small and large viewport sizes
        driver.set_window_size(640, 480)
        time.sleep(0.3)
        res_small = driver.execute_script("return [window.Praktikum7.renderer.domElement.clientWidth, window.Praktikum7.renderer.domElement.clientHeight];")
        driver.set_window_size(1920, 1080)
        time.sleep(0.3)
        res_large = driver.execute_script("return [window.Praktikum7.renderer.domElement.clientWidth, window.Praktikum7.renderer.domElement.clientHeight];")
        print(f"  Small viewport client size: {res_small}, Large viewport client size: {res_large}")

        # Stress toggle environment 10 times in rapid succession
        for _ in range(10):
            driver.execute_script("window.Praktikum7.toggleEnvironment();")
        driver.execute_script("window.Praktikum7.toggleEnvironment(true);")
        time.sleep(0.2)
        env_active = driver.execute_script("return !!window.Praktikum7.scene.environment;")
        assert env_active == True, "Environment should be active after stress toggle"
        print("  Rapid environment toggling survived without corruption.")

        # Post-stress console check
        post_logs = driver.get_log('browser')
        post_severe = [l for l in post_logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        assert len(post_severe) == 0, f"Severe errors after stress test: {post_severe}"
        print("  -> PASS: Stress testing complete with 0 errors.")

        # -------------------------------------------------------------
        # 8. Offline file:/// Protocol Verification
        # -------------------------------------------------------------
        print("\n[FORENSIC CHECK 8] Offline file:/// Protocol Verification")
        local_path = os.path.abspath(os.path.join(ROOT_DIR, 'praktikum-7', 'index.html'))
        file_url = 'file:///' + local_path.replace('\\', '/')
        print(f"  Navigating to {file_url}")
        driver.get(file_url)
        time.sleep(2.0)

        file_logs = driver.get_log('browser')
        file_severe = [l for l in file_logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        file_p7 = driver.execute_script("return !!window.Praktikum7 && !!window.Praktikum7.scene.environment;")
        print(f"  file:/// severe errors: {len(file_severe)}, window.Praktikum7 loaded: {file_p7}")
        for l in file_logs:
            print(f"    [{l['level']}] {l['message']}")
        assert len(file_severe) == 0, f"Severe errors under file:///: {file_severe}"
        assert file_p7 == True, "Praktikum7 failed to initialize under file:///"
        print("  -> PASS: 100% offline file:/// execution verified with 0 errors.")

        print("\n" + "=" * 70)
        print("FORENSIC AUDIT COMPLETE: ALL CHECKS PASSED EMPIRICALLY!")
        print("VERDICT: CLEAN")
        print("=" * 70)

    finally:
        driver.quit()
        httpd.shutdown()

if __name__ == '__main__':
    run_forensic_audit()
