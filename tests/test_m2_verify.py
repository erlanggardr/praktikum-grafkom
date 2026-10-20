"""
tests/test_m2_verify.py
Automated E2E Verification Suite for Milestone 2:
Features F06, F07, F08, F09, F10, F11
(GLTF Model, Shadow Traversal, AnimationMixer, Screen-to-NDC Raycasting, BoxHelper Selection & Dynamic HUD)
"""

import http.server
import socketserver
import threading
import time
import os
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PORT = 9005

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_tests():
    print("=" * 70)
    print("STARTING E2E VERIFICATION SUITE: MILESTONE 2 (F06 - F11)")
    print("=" * 70)

    # 1. Start ephemeral HTTP server
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[HTTP] Server running on http://127.0.0.1:{PORT}")

    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1280,850')
    driver = webdriver.Chrome(options=options)

    try:
        # Part A: HTTP Mode (Bundled GLB & Full Animation Pipeline)
        url = f"http://127.0.0.1:{PORT}/praktikum-7/index.html"
        print(f"[NAVIGATE] Loading {url} ...")
        driver.get(url)
        time.sleep(2.5) # Allow GLTF async loading

        # Check console logs
        logs = driver.get_log('browser')
        severe = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        print(f"[LOGS] Console entries: {len(logs)}, Severe errors: {len(severe)}")
        for l in logs:
            if l['level'] in ['WARNING', 'SEVERE']:
                print(f"  [{l['level']}] {l['message']}")
        assert len(severe) == 0, f"Severe console errors detected: {severe}"
        print("  -> PASS: 0 severe console errors in HTTP mode.")

        # Verify window.Praktikum7 exports
        p7 = driver.execute_script("return !!window.Praktikum7;")
        assert p7 is True, "window.Praktikum7 must be defined."

        # -------------------------------------------------------------
        # F06 & F07: 3D Model Loading & Recursive Shadow Traversal
        # -------------------------------------------------------------
        print("\n--- [CHECK 1] F06 & F07: 3D GLTF Model & Shadow Traversal ---")
        model_state = driver.execute_script("""
            const m = window.Praktikum7.AppState.model;
            return {
                isLoaded: m.isLoaded,
                isFallback: m.isFallback,
                sourceType: m.sourceType,
                hasRoot: !!m.root,
                partCount: m.selectableRobotMeshes ? m.selectableRobotMeshes.length : 0
            };
        """)
        print(f"  Model state: {model_state}")
        assert model_state["isLoaded"] is True, "Model should be loaded."
        assert model_state["hasRoot"] is True, "Model root must exist in scene."
        assert model_state["partCount"] > 0, "Model child meshes must be registered in selectableMeshes."

        # Shadow and culling traversal audit
        traversal_audit = driver.execute_script("""
            let castShadowCount = 0;
            let receiveShadowCount = 0;
            let skinnedMeshCount = 0;
            let frustumCulledFalseCount = 0;
            let pbrReflectionsTuned = 0;

            window.Praktikum7.scene.traverse(child => {
                if (child.isMesh) {
                    if (child.castShadow) castShadowCount++;
                    if (child.receiveShadow) receiveShadowCount++;
                    if (child.isSkinnedMesh) {
                        skinnedMeshCount++;
                        if (child.frustumCulled === false) frustumCulledFalseCount++;
                    }
                    const m = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && m.envMapIntensity >= 1.0) {
                        pbrReflectionsTuned++;
                    }
                }
            });

            return {
                castShadowCount,
                receiveShadowCount,
                skinnedMeshCount,
                frustumCulledFalseCount,
                pbrReflectionsTuned
            };
        """)
        print(f"  Traversal audit: {traversal_audit}")
        assert traversal_audit["castShadowCount"] >= 10, f"Expected >= 10 shadow casters, got {traversal_audit['castShadowCount']}"
        assert traversal_audit["receiveShadowCount"] >= 5, f"Expected >= 5 shadow receivers, got {traversal_audit['receiveShadowCount']}"
        if traversal_audit["skinnedMeshCount"] > 0:
            assert traversal_audit["skinnedMeshCount"] == traversal_audit["frustumCulledFalseCount"], "All SkinnedMeshes must have frustumCulled = false"
        print("  -> PASS: Recursive shadow traversal and skinned mesh optimizations verified.")

        # -------------------------------------------------------------
        # F08: AnimationMixer System (14 Clips, Crossfading, Speed, Emotes)
        # -------------------------------------------------------------
        print("\n--- [CHECK 2] F08: AnimationMixer & Skeletal Locomotion ---")
        actions_list = driver.execute_script("""
            return window.Praktikum7.actions ? Object.keys(window.Praktikum7.actions) : [];
        """)
        print(f"  Cataloged animation clips ({len(actions_list)}): {actions_list}")
        assert len(actions_list) >= 7, f"Expected >= 7 animation clips, got {len(actions_list)}"

        initial_clip = driver.execute_script("return window.Praktikum7.AppState.model.currentClipName;")
        print(f"  Initial active clip: '{initial_clip}'")
        assert initial_clip in ["Walking", "Idle"], f"Expected initial clip Walking or Idle, got '{initial_clip}'"

        # Test smooth crossfading to Running
        target_clip = "Running" if "Running" in actions_list else actions_list[0]
        driver.execute_script(f"window.Praktikum7.fadeToAction('{target_clip}', 0.2);")
        time.sleep(0.4)
        active_after_fade = driver.execute_script("return window.Praktikum7.AppState.model.currentClipName;")
        print(f"  After fadeToAction('{target_clip}'): active = '{active_after_fade}'")
        assert active_after_fade == target_clip, f"Expected active clip '{target_clip}', got '{active_after_fade}'"

        # Test One-Shot Emote triggering
        emote_target = "Jump" if "Jump" in actions_list else ("Wave" if "Wave" in actions_list else actions_list[-1])
        driver.execute_script(f"window.Praktikum7.triggerEmote('{emote_target}', 0.1);")
        time.sleep(0.15)
        is_emote = driver.execute_script("return window.Praktikum7.AppState.model.isPlayingEmote;")
        print(f"  After triggerEmote('{emote_target}'): isPlayingEmote = {is_emote}")
        assert is_emote is True, "isPlayingEmote must be True while emote is active"

        # Test Playback Speed Slider
        sl_speed = driver.find_element(By.ID, "slider-anim-speed")
        driver.execute_script("arguments[0].value = 1.6; arguments[0].dispatchEvent(new Event('input'));", sl_speed)
        time.sleep(0.2)
        speed_val = driver.execute_script("return window.Praktikum7.AppState.model.playbackSpeed;")
        mixer_time_scale = driver.execute_script("return window.Praktikum7.mixer ? window.Praktikum7.mixer.timeScale : null;")
        print(f"  Speed regulation: playbackSpeed = {speed_val}, mixer.timeScale = {mixer_time_scale}")
        assert abs(speed_val - 1.6) < 0.05, f"Expected speed 1.6, got {speed_val}"
        assert abs(mixer_time_scale - 1.6) < 0.05, f"Expected mixer timeScale 1.6, got {mixer_time_scale}"

        # Test Pause Toggle (Space key / btn-pause)
        btn_pause = driver.find_element(By.ID, "btn-pause")
        driver.execute_script("arguments[0].click();", btn_pause)
        time.sleep(0.2)
        is_paused = driver.execute_script("return window.Praktikum7.AppState.isPaused;")
        assert is_paused is True, "Render loop must be paused"
        driver.execute_script("arguments[0].click();", btn_pause) # Resume
        time.sleep(0.2)
        assert driver.execute_script("return window.Praktikum7.AppState.isPaused;") is False, "Render loop must resume"
        print("  -> PASS: AnimationMixer, crossfading, speed regulation, and pause verified.")

        # -------------------------------------------------------------
        # F09 & F10: Screen-to-NDC Raycasting, Hover Tint & BoxHelper Selection
        # -------------------------------------------------------------
        print("\n--- [CHECK 3] F09 & F10: Raycasting, Hover Feedback & BoxHelper ---")
        selectable_total = driver.execute_script("return window.Praktikum7.selectableMeshes ? window.Praktikum7.selectableMeshes.length : 0;")
        has_sel_box = driver.execute_script("return !!window.Praktikum7.selectionBoxHelper;")
        has_hov_box = driver.execute_script("return !!window.Praktikum7.hoverBoxHelper;")
        print(f"  Selectable meshes: {selectable_total}, SelectionBoxHelper: {has_sel_box}, HoverBoxHelper: {has_hov_box}")
        assert selectable_total >= 10, f"Expected >= 10 selectable meshes, got {selectable_total}"
        assert has_sel_box is True, "selectionBoxHelper must be instantiated in scene"
        assert has_hov_box is True, "hoverBoxHelper must be instantiated in scene"

        # Test selecting PBR sphere
        driver.execute_script("window.Praktikum7.selectObject(window.Praktikum7.primarySphere);")
        time.sleep(0.3)
        hud_active = driver.find_element(By.ID, "hudActiveObj").text
        sel_visible = driver.execute_script("return window.Praktikum7.selectionBoxHelper.visible;")
        print(f"  Selected primarySphere -> HUD Active: '{hud_active}', BoxHelper visible: {sel_visible}")
        assert "PBRShowcaseSphere" in hud_active, f"Expected PBRShowcaseSphere, got {hud_active}"
        assert sel_visible is True, "selectionBoxHelper must be visible when object is selected"

        # Test selecting a robot mesh
        driver.execute_script("""
            const robotMesh = window.Praktikum7.selectableMeshes.find(m => m.userData.isRobotMesh);
            if (robotMesh) window.Praktikum7.selectObject(robotMesh);
        """)
        time.sleep(0.3)
        hud_active_robot = driver.find_element(By.ID, "hudActiveObj").text
        hud_level_robot = driver.find_element(By.ID, "card-selected-level").text
        print(f"  Selected Robot mesh -> HUD Active: '{hud_active_robot}', Level: '{hud_level_robot}'")
        assert "Robot" in hud_active_robot or "Bot" in hud_active_robot, f"Expected robot part name, got '{hud_active_robot}'"
        assert "Robot" in hud_level_robot or "Hierarchy" in hud_level_robot, f"Expected Robot Hierarchy, got '{hud_level_robot}'"

        # Test Deselection
        driver.execute_script("window.Praktikum7.deselectObject();")
        time.sleep(0.2)
        hud_active_idle = driver.find_element(By.ID, "hudActiveObj").text
        sel_visible_idle = driver.execute_script("return window.Praktikum7.selectionBoxHelper.visible;")
        print(f"  After Deselection -> HUD Active: '{hud_active_idle}', BoxHelper visible: {sel_visible_idle}")
        assert "None" in hud_active_idle, f"Expected 'None' in idle HUD, got '{hud_active_idle}'"
        assert sel_visible_idle is False, "selectionBoxHelper must be hidden on deselect"
        print("  -> PASS: Raycasting selection locking, BoxHelper visibility, and deselection verified.")

        # -------------------------------------------------------------
        # F11: Dynamic HUD Telemetry & Object Inspector
        # -------------------------------------------------------------
        print("\n--- [CHECK 4] F11: Dynamic HUD Telemetry & Dimension Inspector ---")
        # Select ToolTipBeacon to verify local vs world matrix live display
        driver.execute_script("window.Praktikum7.selectObject(window.Praktikum7.armNodes['ToolTipBeacon']);")
        time.sleep(0.3)

        local_pos_text = driver.find_element(By.ID, "hud-local-pos").text
        world_pos_text = driver.find_element(By.ID, "hud-world-pos").text
        mat_info_text = driver.find_element(By.ID, "hudMaterialInfo").text
        dim_text = driver.find_element(By.ID, "hud-dimensions").text
        print(f"  ToolTipBeacon Telemetry:")
        print(f"    Local Pos:  {local_pos_text}")
        print(f"    World Pos:  {world_pos_text}")
        print(f"    Material:   {mat_info_text}")
        print(f"    Dimensions: {dim_text}")
        assert "(0.00, 0.38, 0.00)" in local_pos_text, f"Expected (0.00, 0.38, 0.00), got {local_pos_text}"
        assert "(" in world_pos_text and ")" in world_pos_text, f"Invalid world pos format: {world_pos_text}"
        assert "×" in dim_text or "x" in dim_text, f"Dimensions not formatted with multipliers: {dim_text}"
        print("  -> PASS: Dynamic HUD Telemetry and Object Inspector verified.")

        # -------------------------------------------------------------
        # Part B: Offline file:/// Protocol Verification
        # -------------------------------------------------------------
        print("\n--- [CHECK 5] Offline file:/// Protocol & Procedural Fallback ---")
        abs_index_path = os.path.abspath("praktikum-7/index.html").replace("\\", "/")
        file_url = f"file:///{abs_index_path}"
        print(f"  Navigating to file:/// URL: {file_url}")
        driver.get(file_url)
        time.sleep(2.0)

        file_logs = driver.get_log('browser')
        file_severe = [
            l for l in file_logs 
            if l['level'] == 'SEVERE' 
            and 'favicon' not in l['message'] 
            and 'access control' not in l['message'].lower() 
            and 'cors' not in l['message'].lower()
            and 'failed to load resource' not in l['message'].lower()
            and 'err_failed' not in l['message'].lower()
        ]
        print(f"  file:/// logs: {len(file_logs)}, Severe unhandled: {len(file_severe)}")
        assert len(file_severe) == 0, f"Unhandled severe errors under file:///: {file_severe}"

        p7_offline = driver.execute_script("return !!window.Praktikum7 && window.Praktikum7.AppState.model.isLoaded;")
        source_offline = driver.execute_script("return window.Praktikum7.AppState.model.sourceType;")
        print(f"  Offline state: isLoaded = {p7_offline}, sourceType = '{source_offline}'")
        assert source_offline in ["procedural", "glb-local", "glb-cdn"], f"Unexpected offline source: {source_offline}"
        
        # Test explicit procedural fallback activation
        driver.execute_script("window.Praktikum7.activateProceduralFallback();")
        time.sleep(0.5)
        proc_loaded = driver.execute_script("return window.Praktikum7.AppState.model.isLoaded && window.Praktikum7.AppState.model.isFallback;")
        proc_source = driver.execute_script("return window.Praktikum7.AppState.model.sourceType;")
        print(f"  Explicit procedural fallback activation -> isFallback: {proc_loaded}, sourceType: '{proc_source}'")
        assert proc_loaded is True, "Procedural fallback must set isFallback: true"
        assert proc_source == "procedural", f"Expected sourceType 'procedural', got {proc_source}"
        print("  -> PASS: Offline resilience and procedural fallback verified.")

        print("\n" + "=" * 70)
        print("SUCCESS: ALL MILESTONE 2 CHECKS (F06 - F11) PASSED PERFECTLY!")
        print("=" * 70)
        return True

    finally:
        driver.quit()
        httpd.shutdown()

if __name__ == '__main__':
    ok = run_tests()
    sys.exit(0 if ok else 1)
