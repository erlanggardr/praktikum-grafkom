import http.server
import socketserver
import threading
import time
import os
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PORT = 8999
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_test():
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1280,800')
    driver = webdriver.Chrome(options=options)

    try:
        url = f'http://127.0.0.1:{PORT}/praktikum-7/index.html'
        print(f"Navigating to {url}")
        driver.get(url)
        time.sleep(2.0)

        # 1. Console logs check
        logs = driver.get_log('browser')
        severe_errors = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        print(f"Total console logs: {len(logs)}, Severe errors: {len(severe_errors)}")
        for l in logs:
            print(f"  [{l['level']}] {l['message']}")
        if severe_errors:
            print("FAILURE: Severe console errors detected!")
            sys.exit(1)

        # 2. Check Three.js revision and GLTFLoader presence
        three_rev = driver.execute_script("return window.THREE ? window.THREE.REVISION : null;")
        gltf_type = driver.execute_script("return (window.THREE && window.THREE.GLTFLoader) ? typeof window.THREE.GLTFLoader : null;")
        p7_loaded = driver.execute_script("return !!window.Praktikum7;")
        print(f"THREE.REVISION: {three_rev}, THREE.GLTFLoader: {gltf_type}, Praktikum7: {p7_loaded}")
        assert three_rev == "128", f"Expected Three.js revision 128, got {three_rev}"
        assert gltf_type == "function", f"Expected GLTFLoader function, got {gltf_type}"
        assert p7_loaded == True, "Expected window.Praktikum7 to be defined"

        # 3. Canvas verification
        canvas = driver.find_element(By.ID, "grafkom-canvas")
        data_custom = canvas.get_attribute("data-custom")
        class_name = canvas.get_attribute("class")
        print(f"Canvas attributes: data-custom='{data_custom}', class='{class_name}'")
        assert data_custom == "true", "Canvas must have data-custom='true'"
        assert "custom-workbench" in class_name, "Canvas must have class 'custom-workbench'"

        # 4. Telemetry initial values
        local_pos_init = driver.find_element(By.ID, "hud-local-pos").text
        world_pos_init = driver.find_element(By.ID, "hud-world-pos").text
        print(f"Initial HUD - Local: {local_pos_init}, World: {world_pos_init}")
        assert "(" in local_pos_init and ")" in local_pos_init, "Local position text format invalid"
        assert "(" in world_pos_init and ")" in world_pos_init, "World position text format invalid"

        # 5. Scene Graph Forward Kinematics verification
        slider_base = driver.find_element(By.ID, "slider-arm-base")
        driver.execute_script("arguments[0].value = 90; arguments[0].dispatchEvent(new Event('input'));", slider_base)
        time.sleep(0.4)

        local_pos_after = driver.find_element(By.ID, "hud-local-pos").text
        world_pos_after = driver.find_element(By.ID, "hud-world-pos").text
        print(f"After Base Yaw 90° - Local: {local_pos_after}, World: {world_pos_after}")
        assert local_pos_init == local_pos_after, f"Local position changed from {local_pos_init} to {local_pos_after}! Must be invariant to parent rotation."
        assert world_pos_init != world_pos_after, f"World position did not change from {world_pos_init}! Must change when parent rotates."
        print("PASS: Scene Graph Parent-Child Affine Transform Composition Verified!")

        # 6. Environment Map Toggle verification (Challenge H)
        env_btn = driver.find_element(By.ID, "btn-env-toggle")
        is_env_on = driver.execute_script("return !!window.Praktikum7.scene.environment;")
        print(f"Initial scene.environment active: {is_env_on}")
        assert is_env_on == True, "scene.environment should be initialized with RoomEnvironment PMREM"

        # Click toggle to turn OFF
        driver.execute_script("arguments[0].click();", env_btn)
        time.sleep(0.3)
        is_env_off = driver.execute_script("return !!window.Praktikum7.scene.environment;")
        print(f"After toggle, scene.environment active: {is_env_off}")
        assert is_env_off == False, "scene.environment should be null when toggled OFF"

        # Click toggle to turn ON
        driver.execute_script("arguments[0].click();", env_btn)
        time.sleep(0.3)
        is_env_restored = driver.execute_script("return !!window.Praktikum7.scene.environment;")
        print(f"After second toggle, scene.environment active: {is_env_restored}")
        assert is_env_restored == True, "scene.environment should be restored when toggled back ON"
        print("PASS: Environment Toggle (Challenge H) Verified!")

        # 7. PBR Material Presets verification (Challenge E)
        driver.execute_script("window.Praktikum7.applyPBRPreset('gold');")
        time.sleep(0.3)
        r_gold = driver.execute_script("return window.Praktikum7.primaryPBRMaterial.roughness;")
        m_gold = driver.execute_script("return window.Praktikum7.primaryPBRMaterial.metalness;")
        print(f"Gold Preset - roughness: {r_gold}, metalness: {m_gold}")
        assert r_gold == 0.18 and m_gold == 1.0, f"Expected roughness 0.18, metalness 1.0; got {r_gold}, {m_gold}"

        driver.execute_script("window.Praktikum7.applyPBRPreset('chrome');")
        time.sleep(0.3)
        r_chrome = driver.execute_script("return window.Praktikum7.primaryPBRMaterial.roughness;")
        m_chrome = driver.execute_script("return window.Praktikum7.primaryPBRMaterial.metalness;")
        print(f"Chrome Preset - roughness: {r_chrome}, metalness: {m_chrome}")
        assert r_chrome == 0.04 and m_chrome == 1.0, f"Expected roughness 0.04, metalness 1.0; got {r_chrome}, {m_chrome}"
        print("PASS: PBR Gallery Presets (Challenge E) Verified!")

        # 8. Visualizer mode verification
        driver.execute_script("document.querySelector('#seg-visualizer-mode [data-mode=\"normals\"]').click();")
        time.sleep(0.3)
        mat_type = driver.execute_script("return window.Praktikum7.scene.getObjectByName('PBRShowcaseSphere').material.type;")
        print(f"Normals visualizer mode material type: {mat_type}")
        assert mat_type == "MeshNormalMaterial", f"Expected MeshNormalMaterial, got {mat_type}"
        print("PASS: Surface Normals Visualizer Mode Verified!")

        # 9. Frame rate & Delta time
        fps_text = driver.find_element(By.ID, "fps-stat").text
        dt_text = driver.find_element(By.ID, "dt-stat").text
        print(f"Performance Stats - FPS: {fps_text}, Delta Time: {dt_text}")

        print("\n==============================================")
        print("SUCCESS: ALL MILESTONE 1 VERIFICATION TESTS PASSED!")
        print("==============================================")

    finally:
        driver.quit()
        httpd.shutdown()

if __name__ == '__main__':
    run_test()
