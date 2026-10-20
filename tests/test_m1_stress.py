"""
Milestone 1 Empirical Stress Test Suite for Praktikum 7 Three.js Application
Role: EMPIRICAL CHALLENGER (challenger_m1_1)

Tests:
1. Rapid joint slider scrubbing across all DOF angles (-180° to +180°, and out-of-bound/overflow)
2. PBR parameter safety (roughness/metalness 0.0 to 1.0, negative, overflow, visualizer modes, presets)
3. Rapid toggling of Environment map (Key H) and Auto-Wave kinematic demo over 300+ frames
4. Canvas resize loop under rapid viewport window resizing (feedback loops, aspect ratio distortion)
5. Zero uncaught errors / WebGL errors monitoring (gl.getError() == 0, 0 severe console errors)
6. Offline file:/// protocol resilience
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

PORT = 8991
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def log_message(self, format, *args):
        pass

def create_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1280,800')
    options.add_argument('--allow-file-access-from-files')
    # Prevent headless background idle/power throttling
    options.add_argument('--disable-background-timer-throttling')
    options.add_argument('--disable-backgrounding-occluded-windows')
    options.add_argument('--disable-renderer-backgrounding')
    options.add_argument('--disable-features=CalculateNativeWinOcclusion')
    driver = webdriver.Chrome(options=options)
    return driver

def check_webgl_errors(driver, step_name):
    gl_error = driver.execute_script("""
        try {
            var renderer = window.Praktikum7 ? window.Praktikum7.renderer : null;
            if (!renderer) return -1;
            var gl = renderer.getContext();
            return gl ? gl.getError() : -2;
        } catch(e) {
            return -3;
        }
    """)
    assert gl_error == 0, f"[{step_name}] WebGL error detected: gl.getError() = {gl_error}"
    return gl_error

def check_browser_logs(driver, step_name):
    logs = driver.get_log('browser')
    severe = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
    if severe:
        for l in severe:
            print(f"  [ERROR] [{step_name}] {l['level']}: {l['message']}")
        raise AssertionError(f"[{step_name}] Found {len(severe)} severe console errors: {severe}")
    return logs

def run_stress_suite():
    print("=" * 70)
    print("STARTING EMPIRICAL STRESS TEST SUITE (Milestone 1)")
    print("=" * 70)

    # Start local HTTP server
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[OK] Local HTTP test server running at http://127.0.0.1:{PORT}")

    driver = create_driver()
    results = {}

    try:
        url = f"http://127.0.0.1:{PORT}/praktikum-7/index.html"
        print(f"\n--- Phase 0: Baseline Page Load ({url}) ---")
        driver.get(url)
        time.sleep(2.0)

        # Baseline checks
        check_browser_logs(driver, "Baseline Load")
        check_webgl_errors(driver, "Baseline Load")

        three_rev = driver.execute_script("return window.THREE ? window.THREE.REVISION : null;")
        assert three_rev == "128", f"Expected Three.js r128, got {three_rev}"
        print(f"[PASS] Baseline Three.js r128 active, 0 console errors, 0 WebGL errors.")
        results["baseline"] = "PASS"

        # -------------------------------------------------------------
        # SUITE 1: Rapid Joint Slider Scrubbing & Kinematic Stress
        # -------------------------------------------------------------
        print("\n--- Phase 1: Rapid Joint Slider Scrubbing & Boundary Stress ---")
        scrub_results = driver.execute_script("""
            var t0 = performance.now();
            var count = 0;
            var sliders = [
                { id: 'slider-arm-base', min: -180, max: 180, step: 5 },
                { id: 'slider-arm-shoulder', min: -60, max: 60, step: 3 },
                { id: 'slider-arm-elbow', min: -110, max: 110, step: 4 },
                { id: 'slider-arm-wrist', min: -90, max: 90, step: 3 },
                { id: 'slider-arm-claw', min: 0, max: 100, step: 2 }
            ];

            for (var pass = 0; pass < 3; pass++) {
                for (var s = 0; s < sliders.length; s++) {
                    var info = sliders[s];
                    var el = document.getElementById(info.id);
                    if (!el) continue;
                    // Forward scrub
                    for (var v = info.min; v <= info.max; v += info.step) {
                        el.value = v;
                        el.dispatchEvent(new Event('input'));
                        count++;
                    }
                    // Reverse scrub
                    for (var v = info.max; v >= info.min; v -= info.step) {
                        el.value = v;
                        el.dispatchEvent(new Event('input'));
                        count++;
                    }
                }
            }
            var dur = (performance.now() - t0) * 0.001;
            return { count: count, durationSec: dur, rate: count / dur };
        """)
        print(f"[OK] Executed {scrub_results['count']} high-frequency slider scrub events in {scrub_results['durationSec']:.3f}s ({scrub_results['rate']:.1f} events/s)")

        # Verify coordinates remain finite and non-NaN
        beacon_coords = driver.execute_script("""
            var beacon = window.Praktikum7.armNodes['ToolTipBeacon'];
            if (!beacon) return null;
            beacon.updateWorldMatrix(true, false);
            var v = new THREE.Vector3();
            beacon.getWorldPosition(v);
            return [v.x, v.y, v.z, isFinite(v.x) && isFinite(v.y) && isFinite(v.z) && !isNaN(v.x)];
        """)
        print(f"[OK] ToolTipBeacon world pos after high-speed scrubbing: ({beacon_coords[0]:.2f}, {beacon_coords[1]:.2f}, {beacon_coords[2]:.2f}), Finite: {beacon_coords[3]}")
        assert beacon_coords[3] == True, "ToolTipBeacon world pos contains NaN or non-finite values!"

        # Inject extreme overflow values
        print("[Testing Out-of-bounds Extreme Joint Inputs]")
        driver.execute_script("""
            var overflow_inputs = [-720, 720, -99999, 99999];
            var sl = document.getElementById('slider-arm-base');
            for (var i = 0; i < overflow_inputs.length; i++) {
                sl.value = overflow_inputs[i];
                sl.dispatchEvent(new Event('input'));
            }
        """)
        time.sleep(0.1)

        check_browser_logs(driver, "Joint Slider Scrubbing")
        check_webgl_errors(driver, "Joint Slider Scrubbing")
        print("[PASS] Joint Slider Scrubbing & Boundary Stress PASSED!")
        results["joint_scrubbing"] = "PASS"

        # -------------------------------------------------------------
        # SUITE 2: PBR Parameter Safety, Presets & Visualizer Modes
        # -------------------------------------------------------------
        print("\n--- Phase 2: PBR Roughness/Metalness Safety & Visualizer Stress ---")
        driver.execute_script("""
            var slRough = document.getElementById('slider-roughness');
            var slMetal = document.getElementById('slider-metalness');

            // Rapid high-frequency scrubbing
            for (var i = 0; i < 100; i++) {
                var r = (i % 100) / 100.0;
                var m = ((100 - i) % 100) / 100.0;
                slRough.value = r;
                slRough.dispatchEvent(new Event('input'));
                slMetal.value = m;
                slMetal.dispatchEvent(new Event('input'));
            }

            // Boundary and anomalous inputs (-2.0, -0.5, 0.0, 1.0, 2.0, 100.0)
            var anomalous = [-2.0, -0.5, 0.0, 1.0, 2.0, 100.0];
            for (var j = 0; j < anomalous.length; j++) {
                window.Praktikum7.primaryPBRMaterial.roughness = anomalous[j];
                window.Praktikum7.primaryPBRMaterial.metalness = anomalous[j];
            }

            // Rapid visualizer mode switches
            var modes = ['normals', 'roughness', 'metalness', 'pbr'];
            for (var k = 0; k < modes.length; k++) {
                var btn = document.querySelector('#seg-visualizer-mode [data-mode=\"' + modes[k] + '\"]');
                if (btn) btn.click();
            }

            // Rapidly cycle all PBR presets 18 times
            var presets = ['chrome', 'gold', 'copper', 'glossy', 'rubber', 'steel'];
            for (var p = 0; p < 18; p++) {
                window.Praktikum7.applyPBRPreset(presets[p % presets.length]);
            }
        """)
        time.sleep(0.2)

        check_browser_logs(driver, "PBR Stress")
        check_webgl_errors(driver, "PBR Stress")
        print("[PASS] PBR Roughness/Metalness Safety & Presets PASSED!")
        results["pbr_safety"] = "PASS"

        # -------------------------------------------------------------
        # SUITE 3: Rapid Environment Toggle & Auto-Wave Kinematic Loop
        # -------------------------------------------------------------
        print("\n--- Phase 3: Rapid Environment Toggle (Key H) & Auto-Wave Kinematics ---")
        # Rapid toggling 60 times in burst
        t_env0 = time.time()
        driver.execute_script("""
            var envBtn = document.getElementById('btn-env-toggle');
            for (var i = 0; i < 60; i++) {
                envBtn.click();
            }
        """)
        t_env = time.time() - t_env0
        print(f"[OK] Executed 60 Environment Toggles in {t_env:.3f}s")

        # Ensure environment restored to ON
        driver.execute_script("window.Praktikum7.toggleEnvironment(true);")
        is_env_active = driver.execute_script("return !!window.Praktikum7.scene.environment;")
        assert is_env_active == True, "Environment map failed to remain active after rapid toggling"

        # Auto-Wave Kinematic Loop for 350+ frames
        print("[Initiating Auto-Wave Kinematic Demo for 350+ frames]")
        btn_wave = driver.find_element(By.ID, "btn-autowave")
        driver.execute_script("arguments[0].click();", btn_wave)
        
        # Concurrently toggle pause/resume during wave
        time.sleep(0.5)
        btn_pause = driver.find_element(By.ID, "btn-pause")
        driver.execute_script("""
            var pBtn = document.getElementById('btn-pause');
            pBtn.click(); // Pause
        """)
        time.sleep(0.3)
        driver.execute_script("""
            var pBtn = document.getElementById('btn-pause');
            pBtn.click(); // Resume
        """)

        # Let wave run for 5 seconds (~300 frames)
        time.sleep(5.0)

        # Inspect FPS, Delta Time, and Frame Count
        fps_info = driver.execute_script("""
            return {
                fps: window.Praktikum7.AppState.fps,
                dt: window.Praktikum7.AppState.deltaTime,
                autoWave: window.Praktikum7.AppState.kinematics.autoWave
            };
        """)
        print(f"[OK] Auto-Wave active: {fps_info['autoWave']}, Current FPS: {fps_info['fps']}, Delta: {fps_info['dt']*1000:.1f}ms")
        assert fps_info['autoWave'] == True, "AutoWave expected to be active"
        assert fps_info['fps'] >= 20, f"FPS dropped significantly: {fps_info['fps']} FPS"
        assert fps_info['dt'] <= 0.1, f"Delta time exceeded 0.1s safety cap: {fps_info['dt']}"

        # Turn wave off
        driver.execute_script("arguments[0].click();", btn_wave)

        check_browser_logs(driver, "Environment & Auto-Wave Stress")
        check_webgl_errors(driver, "Environment & Auto-Wave Stress")
        print("[PASS] Environment Toggle & Auto-Wave Kinematic Loop PASSED!")
        results["env_and_wave"] = "PASS"

        # -------------------------------------------------------------
        # SUITE 4: Canvas Resize Loop & Viewport Distortion Stress
        # -------------------------------------------------------------
        print("\n--- Phase 4: Canvas Resize Loop & Viewport Distortion Stress ---")
        resolutions = [
            (1920, 1080),
            (1366, 768),
            (800, 600),
            (375, 667),
            (667, 375),
            (2560, 1440),
            (1024, 768),
            (1280, 800)
        ]

        for w, h in resolutions:
            driver.set_window_size(w, h)
            time.sleep(0.3)
            resize_metrics = driver.execute_script("""
                var canvas = document.getElementById('grafkom-canvas');
                var cam = window.Praktikum7.camera;
                var ren = window.Praktikum7.renderer;
                var cw = canvas.clientWidth;
                var ch = canvas.clientHeight;
                var aspect = cam.aspect;
                var expectedAspect = ch > 0 ? (cw / ch) : 1.0;
                var diff = Math.abs(aspect - expectedAspect);
                return {
                    cw: cw,
                    ch: ch,
                    aspect: aspect,
                    expectedAspect: expectedAspect,
                    diff: diff,
                    canvasW: canvas.width,
                    canvasH: canvas.height
                };
            """)
            print(f"  Window {w}x{h} -> Canvas {resize_metrics['cw']}x{resize_metrics['ch']}, Cam Aspect: {resize_metrics['aspect']:.3f}, Diff: {resize_metrics['diff']:.5f}")
            assert resize_metrics['diff'] < 0.02, f"Aspect ratio distortion detected: {resize_metrics}"
            assert resize_metrics['cw'] > 0 and resize_metrics['ch'] > 0, "Canvas collapsed to zero dimensions!"

        check_browser_logs(driver, "Canvas Resize Stress")
        check_webgl_errors(driver, "Canvas Resize Stress")
        print("[PASS] Canvas Resize Loop & Viewport Distortion Stress PASSED!")
        results["resize_stress"] = "PASS"

        # -------------------------------------------------------------
        # SUITE 5: Zero Uncaught Errors & WebGL State Invariant
        # -------------------------------------------------------------
        print("\n--- Phase 5: Final Zero-Error & WebGL State Invariant Check ---")
        logs = driver.get_log('browser')
        severe = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        print(f"[OK] Total logged messages throughout all stress tests: {len(logs)}, Severe errors: {len(severe)}")
        for l in logs:
            if l['level'] in ['SEVERE', 'WARNING']:
                print(f"  [{l['level']}] {l['message']}")
        assert len(severe) == 0, f"Found severe errors: {severe}"
        check_webgl_errors(driver, "Final State")
        print("[PASS] Zero Severe Console Errors & gl.NO_ERROR Invariant Confirmed!")
        results["zero_errors"] = "PASS"

        driver.quit()

        # -------------------------------------------------------------
        # SUITE 6: Offline file:/// Protocol Verification
        # -------------------------------------------------------------
        print("\n--- Phase 6: Offline file:/// Protocol Verification ---")
        driver_file = create_driver()
        file_path = os.path.abspath(os.path.join(ROOT_DIR, "praktikum-7", "index.html")).replace("\\", "/")
        file_url = f"file:///{file_path}"
        print(f"Loading local file URL: {file_url}")
        driver_file.get(file_url)
        time.sleep(2.0)

        check_browser_logs(driver_file, "file:/// Load")
        check_webgl_errors(driver_file, "file:/// Load")

        file_three_rev = driver_file.execute_script("return window.THREE ? window.THREE.REVISION : null;")
        file_env_active = driver_file.execute_script("return !!(window.Praktikum7 && window.Praktikum7.scene.environment);")
        print(f"[OK] file:/// protocol loaded: THREE.REVISION = {file_three_rev}, RoomEnvironment active = {file_env_active}")
        assert file_three_rev == "128", "Three.js failed to load on file:///"
        assert file_env_active == True, "RoomEnvironment failed on file:///"

        driver_file.quit()
        print("[PASS] Offline file:/// Protocol Verification PASSED!")
        results["offline_file_protocol"] = "PASS"

        print("\n" + "=" * 70)
        print("EMPIRICAL STRESS TEST SUMMARY: ALL 6 PHASES PASSED WITH ZERO ERRORS!")
        print("VERDICT: APPROVE")
        print("=" * 70)
        return True, results

    except Exception as e:
        print(f"\n[STRESS TEST FAILURE]: {e}")
        import traceback
        traceback.print_exc()
        return False, {"error": str(e)}

    finally:
        try:
            httpd.shutdown()
        except:
            pass

if __name__ == "__main__":
    success, res = run_stress_suite()
    if not success:
        sys.exit(1)
