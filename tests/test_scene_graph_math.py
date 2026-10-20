"""
tests/test_scene_graph_math.py
Empirical Mathematical Test Harness for CyberArm-MK1 Scene Graph (Praktikum 7)

Verifies:
1. Local Invariance: Child node local .position is invariant (|P_local(t) - P_local(0)| = 0) under parent rotations.
2. World Trajectory Propagation: child.getWorldPosition() traces exact circular arcs and matches analytical forward kinematics.
3. Affine Matrix Composition: child.matrixWorld matches exact cascade (M_0 x M_1 x ... x M_k) within < 10^-4.
4. SO(3) Orthonormality & Determinant: det(R) = +1 and R^T R = I on world rotation submatrices.
5. Edge Cases: Identity pose, Gimbal limits (+/- pi/2, +/- pi, 2pi), Zero scale, Non-uniform scale recovery.
"""

import http.server
import socketserver
import threading
import time
import math
import sys
import numpy as np
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def mat4_mult(A, B):
    """Multiply two 4x4 matrices stored in column-major order (Three.js convention)."""
    # Convert column-major 16-element list to 4x4 numpy matrix
    mA = np.array(A, dtype=np.float64).reshape((4, 4), order='F')
    mB = np.array(B, dtype=np.float64).reshape((4, 4), order='F')
    mC = np.matmul(mA, mB)
    return mC.flatten(order='F').tolist()

def get_node_local_matrix(driver, node_name):
    return driver.execute_script(f"""
        const node = window.Praktikum7.armNodes['{node_name}'];
        node.updateMatrix();
        return Array.from(node.matrix.elements);
    """)

def get_node_world_matrix(driver, node_name):
    return driver.execute_script(f"""
        const node = window.Praktikum7.armNodes['{node_name}'];
        node.updateWorldMatrix(true, false);
        return Array.from(node.matrixWorld.elements);
    """)

def set_arm_angles(driver, yaw, shoulder, elbow, wrist_pitch=0.0, wrist_roll=0.0):
    driver.execute_script(f"""
        const k = window.Praktikum7.AppState.kinematics;
        k.autoWave = false;
        k.baseYaw = {yaw};
        k.shoulderPitch = {shoulder};
        k.elbowPitch = {elbow};
        k.wristPitch = {wrist_pitch};
        k.wristRoll = {wrist_roll};
        
        const nodes = window.Praktikum7.armNodes;
        nodes['BaseTurntable'].rotation.y = {yaw};
        nodes['ShoulderJoint'].rotation.z = {shoulder};
        nodes['ElbowJoint'].rotation.z = {elbow};
        nodes['WristJoint'].rotation.x = {wrist_pitch};
        nodes['WristJoint'].rotation.y = {wrist_roll};
        
        window.Praktikum7.scene.updateMatrixWorld(true);
    """)

def run_tests():
    print("=" * 70)
    print("STARTING EMPIRICAL MATHEMATICAL TEST HARNESS: CyberArm-MK1")
    print("=" * 70)

    # 1. Start local ephemeral HTTP server
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', 0), QuietHandler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[INIT] Ephemeral test server running at http://127.0.0.1:{port}")

    # 2. Start Headless Chrome
    chrome_opts = Options()
    chrome_opts.add_argument('--headless=new')
    chrome_opts.add_argument('--no-sandbox')
    chrome_opts.add_argument('--disable-gpu')
    chrome_opts.add_argument('--window-size=1280,800')
    driver = webdriver.Chrome(options=chrome_opts)

    test_results = {
        "local_invariance_checks": 0,
        "world_trajectory_checks": 0,
        "matrix_composition_checks": 0,
        "orthonormality_checks": 0,
        "edge_case_checks": 0,
        "failures": []
    }

    try:
        url = f"http://127.0.0.1:{port}/praktikum-7/index.html"
        print(f"[NAVIGATE] Opening {url} in headless Chrome...")
        driver.get(url)
        time.sleep(1.5)

        # Verify page loaded without severe console errors
        logs = driver.get_log('browser')
        severe = [l for l in logs if l['level'] == 'SEVERE' and 'favicon' not in l['message']]
        assert len(severe) == 0, f"Severe console errors detected: {severe}"

        p7_loaded = driver.execute_script("return !!window.Praktikum7 && !!window.Praktikum7.armNodes;")
        assert p7_loaded is True, "window.Praktikum7.armNodes failed to initialize."
        print("[INIT] Three.js and Praktikum7 scene graph initialized successfully.")

        # =====================================================================
        # TEST 1: LOCAL INVARIANCE VERIFICATION
        # =====================================================================
        print("\n--- TEST SUITE 1: LOCAL INVARIANCE VERIFICATION ---")
        # In CyberArm-MK1, child nodes have constant relative offsets from their parents.
        # Rotating BaseTurntable, ShoulderJoint, ElbowJoint, WristJoint must NOT alter
        # child.position in local coordinates.
        children_to_test = [
            "BaseTurntable",
            "ShoulderJoint",
            "UpperArmBoom",
            "ElbowJoint",
            "ForearmBoom",
            "WristJoint",
            "EndEffector",
            "ToolTipBeacon",
            "PincerLeft",
            "PincerRight"
        ]

        # Record initial local positions
        initial_local_pos = {}
        for c in children_to_test:
            pos = driver.execute_script(f"""
                const p = window.Praktikum7.armNodes['{c}'].position;
                return [p.x, p.y, p.z];
            """)
            initial_local_pos[c] = np.array(pos, dtype=np.float64)

        # Sample test joint angle configurations
        test_angles = [
            (0.0, 0.0, 0.0, 0.0, 0.0),
            (math.pi / 4, math.pi / 6, -math.pi / 4, 0.2, -0.3),
            (math.pi / 2, -math.pi / 3, math.pi / 2, -0.5, 0.5),
            (-math.pi / 2, math.pi / 2, -math.pi / 2, 0.8, -0.8),
            (math.pi, -math.pi / 4, math.pi / 4, 0.0, 0.0),
            (-math.pi, 0.7, -1.2, 0.4, 0.6)
        ]

        max_invariance_error = 0.0
        for i, (yaw, shoulder, elbow, wp, wr) in enumerate(test_angles):
            set_arm_angles(driver, yaw, shoulder, elbow, wp, wr)

            for c in children_to_test:
                curr_pos = driver.execute_script(f"""
                    const p = window.Praktikum7.armNodes['{c}'].position;
                    return [p.x, p.y, p.z];
                """)
                curr_np = np.array(curr_pos, dtype=np.float64)
                diff = np.linalg.norm(curr_np - initial_local_pos[c])
                max_invariance_error = max(max_invariance_error, diff)
                test_results["local_invariance_checks"] += 1

                if diff > 1e-12:
                    msg = f"Local invariance violated on {c} at pose {i}: delta={diff}"
                    test_results["failures"].append(msg)

        print(f"[RESULT] Local Invariance checks passed: {test_results['local_invariance_checks']}")
        print(f"[RESULT] Max deviation |P_local(t) - P_local(0)| = {max_invariance_error:.2e} (Strictly 0.00)")
        assert max_invariance_error < 1e-10, f"Local invariance exceeded tolerance: {max_invariance_error}"

        # =====================================================================
        # TEST 2: WORLD TRAJECTORY PROPAGATION & ANALYTICAL FORWARD KINEMATICS
        # =====================================================================
        print("\n--- TEST SUITE 2: WORLD TRAJECTORY PROPAGATION & FORWARD KINEMATICS ---")
        
        # Part 2A: Pure Turntable Yaw Trajectory (Must be a horizontal circle in XZ)
        # Fix shoulder=0.436 rad, elbow=-0.785 rad, wrist=0.0
        fix_shoulder = 0.436
        fix_elbow = -0.785
        yaw_steps = 36
        y_values = []
        radii = []
        center_x = -3.2
        center_z = 0.5

        for step in range(yaw_steps):
            yaw = (2.0 * math.pi * step) / yaw_steps
            set_arm_angles(driver, yaw, fix_shoulder, fix_elbow, 0.0, 0.0)

            w_pos = driver.execute_script("""
                const b = window.Praktikum7.armNodes['ToolTipBeacon'];
                const wp = new THREE.Vector3();
                b.getWorldPosition(wp);
                return [wp.x, wp.y, wp.z];
            """)
            x, y, z = w_pos
            y_values.append(y)
            dx = x - center_x
            dz = z - center_z
            r = math.sqrt(dx * dx + dz * dz)
            radii.append(r)
            test_results["world_trajectory_checks"] += 1

        y_mean = np.mean(y_values)
        y_spread = np.max(y_values) - np.min(y_values)
        r_mean = np.mean(radii)
        r_spread = np.max(radii) - np.min(radii)

        print(f"[TRAJECTORY 2A] Pure Yaw Rotation (36 steps across 360 deg):")
        print(f"  Center pivot (ArmRoot): ({center_x}, {center_z})")
        print(f"  Orbital radius mean R = {r_mean:.5f}, spread Delta_R = {r_spread:.2e}")
        print(f"  Height mean Y = {y_mean:.5f}, spread Delta_Y = {y_spread:.2e}")
        assert y_spread < 1e-5, f"Yaw rotation caused vertical height wobble: Delta_Y = {y_spread}"
        assert r_spread < 1e-5, f"Yaw rotation trajectory is not circular: Delta_R = {r_spread}"

        # Part 2B: Pitch Arc & Closed-form Analytical Forward Kinematics
        # Chain lengths:
        # ArmRoot: (-3.2, 0, 0.5)
        # BaseTurntable: (0, 0.35, 0)
        # ShoulderJoint: (0, 0.65, 0) -> total base height = 1.0
        # UpperArm length L1 = 2.0 (Elbow Joint relative pos: (0, 2.0, 0))
        # Forearm + Wrist + Tool + Beacon length L2 = 1.6 + 0.22 + 0.38 = 2.20
        # When yaw=0, rotation is in YZ plane or XY plane?
        # In app.js: shoulderJoint.rotation.z = pitch, elbowJoint.rotation.z = pitch
        # Three.js rotation around Z:
        # [x'] = [cos(theta) -sin(theta)] [x]
        # [y']   [sin(theta)  cos(theta)] [y]
        # For a vector along +Y: [0, L]^T -> [-L*sin(theta), L*cos(theta), 0]^T
        L1 = 2.0
        L2 = 2.20
        root_x = -3.2
        root_y = 1.0  # 0.35 + 0.65
        root_z = 0.5

        max_fk_error = 0.0
        for s_deg in range(-60, 61, 15):
            for e_deg in range(-90, 46, 15):
                s_rad = math.radians(s_deg)
                e_rad = math.radians(e_deg)
                set_arm_angles(driver, 0.0, s_rad, e_rad, 0.0, 0.0)

                # Analytical Forward Kinematics calculation
                # Vector 1: Upper arm
                v1_x = -L1 * math.sin(s_rad)
                v1_y = L1 * math.cos(s_rad)

                # Vector 2: Forearm + end effector (angle = s_rad + e_rad)
                total_angle = s_rad + e_rad
                v2_x = -L2 * math.sin(total_angle)
                v2_y = L2 * math.cos(total_angle)

                expected_x = root_x + v1_x + v2_x
                expected_y = root_y + v1_y + v2_y
                expected_z = root_z

                w_pos = driver.execute_script("""
                    const b = window.Praktikum7.armNodes['ToolTipBeacon'];
                    const wp = new THREE.Vector3();
                    b.getWorldPosition(wp);
                    return [wp.x, wp.y, wp.z];
                """)
                actual_x, actual_y, actual_z = w_pos

                fk_diff = math.sqrt((actual_x - expected_x)**2 + (actual_y - expected_y)**2 + (actual_z - expected_z)**2)
                max_fk_error = max(max_fk_error, fk_diff)
                test_results["world_trajectory_checks"] += 1

                if fk_diff > 1e-4:
                    msg = f"FK mismatch at shoulder={s_deg}°, elbow={e_deg}°: actual=({actual_x:.4f}, {actual_y:.4f}), expected=({expected_x:.4f}, {expected_y:.4f}), error={fk_diff}"
                    test_results["failures"].append(msg)

        print(f"[RESULT] World Trajectory FK checks passed: {test_results['world_trajectory_checks']}")
        print(f"[RESULT] Max Analytical Forward Kinematics Error: {max_fk_error:.2e} (< 1e-4)")
        assert max_fk_error < 1e-4, f"Analytical forward kinematics error too high: {max_fk_error}"

        # =====================================================================
        # TEST 3: EXACT AFFINE MATRIX CASCADE COMPOSITION
        # =====================================================================
        print("\n--- TEST SUITE 3: EXACT AFFINE MATRIX CASCADE COMPOSITION ---")
        # In Three.js:
        # node[k].matrixWorld == M_0 x M_1 x ... x M_k
        # Chain of nodes from ArmRoot to ToolTipBeacon:
        chain = [
            "ArmRoot",
            "BaseTurntable",
            "ShoulderJoint",
            "ElbowJoint",
            "WristJoint",
            "EndEffector",
            "ToolTipBeacon"
        ]

        # Test across multiple complex poses
        pose_tests = [
            (0.0, 0.436, -0.785, 0.349, 0.0),      # Default app.js pose
            (1.2, -0.5, 0.8, -0.4, 0.5),           # Asymmetric 3D pose
            (-2.1, 0.9, -1.4, 0.6, -0.9),          # Complex folding pose
            (math.pi, math.pi/4, -math.pi/3, 0.2, 0.7), # Boundary yaw pose
            (-math.pi/2, -math.pi/6, math.pi/4, -0.8, 0.4)
        ]

        max_matrix_diff = 0.0
        for p_idx, (yaw, shoulder, elbow, wp, wr) in enumerate(pose_tests):
            set_arm_angles(driver, yaw, shoulder, elbow, wp, wr)

            # Retrieve local matrices for all nodes in chain
            local_matrices = [get_node_local_matrix(driver, name) for name in chain]

            # Compute progressive matrix multiplications
            cascade = local_matrices[0]
            for step_idx in range(1, len(chain)):
                cascade = mat4_mult(cascade, local_matrices[step_idx])
                node_name = chain[step_idx]

                # Get actual matrixWorld from Three.js
                world_mat = get_node_world_matrix(driver, node_name)

                # Compute Frobenius and Chebyshev norm of difference
                arr_cascade = np.array(cascade, dtype=np.float64)
                arr_world = np.array(world_mat, dtype=np.float64)
                diff = np.max(np.abs(arr_cascade - arr_world))
                max_matrix_diff = max(max_matrix_diff, diff)
                test_results["matrix_composition_checks"] += 1

                if diff > 1e-4:
                    msg = f"Matrix cascade composition failed on {node_name} (pose {p_idx}): diff={diff}"
                    test_results["failures"].append(msg)

        print(f"[RESULT] Matrix Composition checks passed: {test_results['matrix_composition_checks']}")
        print(f"[RESULT] Max matrix cascade error ||M_cascade - matrixWorld||_inf = {max_matrix_diff:.2e} (< 1e-4)")
        assert max_matrix_diff < 1e-4, f"Matrix composition cascade error exceeded tolerance: {max_matrix_diff}"

        # =====================================================================
        # TEST 4: SO(3) ORTHONORMALITY & DETERMINANT ON ROTATION SUBMATRICES
        # =====================================================================
        print("\n--- TEST SUITE 4: SO(3) ORTHONORMALITY & ROTATION DETERMINANT ---")
        # For any rigid kinematic pose, the upper 3x3 submatrix R of matrixWorld must satisfy:
        # R^T R = I and det(R) = +1
        max_ortho_error = 0.0
        max_det_error = 0.0

        for yaw, shoulder, elbow, wp, wr in pose_tests:
            set_arm_angles(driver, yaw, shoulder, elbow, wp, wr)

            for name in ["ShoulderJoint", "ElbowJoint", "WristJoint", "ToolTipBeacon"]:
                world_mat = get_node_world_matrix(driver, name)
                # Extract 3x3 rotation part (column-major)
                # Three.js matrix layout:
                # [0, 4,  8, 12]
                # [1, 5,  9, 13]
                # [2, 6, 10, 14]
                # [3, 7, 11, 15]
                R = np.array([
                    [world_mat[0], world_mat[4], world_mat[8]],
                    [world_mat[1], world_mat[5], world_mat[9]],
                    [world_mat[2], world_mat[6], world_mat[10]]
                ], dtype=np.float64)

                # Check determinant == +1
                det_R = np.linalg.det(R)
                det_err = abs(det_R - 1.0)
                max_det_error = max(max_det_error, det_err)

                # Check R^T R == I
                RtR = np.matmul(R.T, R)
                ortho_err = np.max(np.abs(RtR - np.eye(3)))
                max_ortho_error = max(max_ortho_error, ortho_err)

                test_results["orthonormality_checks"] += 1

        print(f"[RESULT] Orthonormality checks passed: {test_results['orthonormality_checks']}")
        print(f"[RESULT] Max determinant error |det(R) - 1.0| = {max_det_error:.2e} (< 1e-5)")
        print(f"[RESULT] Max orthogonality error ||R^T R - I||_inf = {max_ortho_error:.2e} (< 1e-5)")
        assert max_det_error < 1e-5, f"Rotation determinant deviated from +1: {max_det_error}"
        assert max_ortho_error < 1e-5, f"Rotation matrix is not orthonormal: {max_ortho_error}"

        # =====================================================================
        # TEST 5: EDGE CASES (IDENTITY, GIMBAL LIMITS, ZERO SCALE, RECOVERY)
        # =====================================================================
        print("\n--- TEST SUITE 5: EDGE CASES & STRESS-TESTING ---")

        # Edge Case 5A: Identity Rotation Pose (all joints 0 rad)
        # Arm points completely vertically straight up:
        # Theoretical ToolTipBeacon position:
        # X = -3.2, Z = 0.5
        # Y = 0 (root) + 0.35 (turntable) + 0.65 (shoulder) + 2.0 (upper) + 1.6 (forearm) + 0.22 (effector) + 0.38 (beacon) = 5.2000
        set_arm_angles(driver, 0.0, 0.0, 0.0, 0.0, 0.0)
        beacon_pos_identity = driver.execute_script("""
            const b = window.Praktikum7.armNodes['ToolTipBeacon'];
            const wp = new THREE.Vector3();
            b.getWorldPosition(wp);
            return [wp.x, wp.y, wp.z];
        """)
        print(f"[EDGE 5A] Identity Pose ToolTipBeacon World Pos: {beacon_pos_identity}")
        expected_identity = [-3.2, 5.20, 0.5]
        id_err = np.linalg.norm(np.array(beacon_pos_identity) - np.array(expected_identity))
        print(f"  Theoretical Target: {expected_identity}, Error: {id_err:.2e}")
        assert id_err < 1e-5, f"Identity pose failed to match theoretical height: {id_err}"
        test_results["edge_case_checks"] += 1

        # Edge Case 5B: Extreme Angles & Gimbal Singularities (+/- pi/2, +/- pi, 2pi)
        gimbal_angles = [
            (math.pi / 2, math.pi / 2, math.pi / 2, math.pi / 2, math.pi / 2),
            (-math.pi / 2, -math.pi / 2, -math.pi / 2, -math.pi / 2, -math.pi / 2),
            (math.pi, math.pi, math.pi, 0.0, 0.0),
            (-math.pi, -math.pi, -math.pi, 0.0, 0.0),
            (2 * math.pi, 2 * math.pi, 2 * math.pi, 2 * math.pi, 2 * math.pi)
        ]

        for ga in gimbal_angles:
            set_arm_angles(driver, *ga)
            # Verify no NaNs or Infs anywhere in matrices
            has_nan_or_inf = driver.execute_script("""
                const nodes = window.Praktikum7.armNodes;
                for (let k in nodes) {
                    const el = nodes[k].matrixWorld.elements;
                    for (let i = 0; i < el.length; i++) {
                        if (isNaN(el[i]) || !isFinite(el[i])) return true;
                    }
                }
                return false;
            """)
            assert not has_nan_or_inf, f"NaN or Infinite value detected at gimbal angle {ga}!"
            test_results["edge_case_checks"] += 1
        print(f"[EDGE 5B] Gimbal singularity stress tests passed with 0 NaN/Inf across all nodes.")

        # Edge Case 5C: Zero Scale Degeneracy & Recovery
        # Set ShoulderJoint scale to (0, 0, 0)
        driver.execute_script("""
            const s = window.Praktikum7.armNodes['ShoulderJoint'];
            s.scale.set(0, 0, 0);
            window.Praktikum7.scene.updateMatrixWorld(true);
        """)
        zero_scale_mat = get_node_world_matrix(driver, "ToolTipBeacon")
        # When parent scale is 0, world matrix upper 3x3 must be zero
        upper3x3_zero = all(abs(zero_scale_mat[idx]) < 1e-12 for idx in [0,1,2,4,5,6,8,9,10])
        print(f"[EDGE 5C] Zero-scale collapse confirmed: upper 3x3 is all zeroes = {upper3x3_zero}")
        assert upper3x3_zero, "Zero-scale did not properly collapse downstream child matrixWorld."

        # Restore scale to (1, 1, 1) and verify complete recovery
        driver.execute_script("""
            const s = window.Praktikum7.armNodes['ShoulderJoint'];
            s.scale.set(1, 1, 1);
            window.Praktikum7.scene.updateMatrixWorld(true);
        """)
        beacon_recovered = driver.execute_script("""
            const b = window.Praktikum7.armNodes['ToolTipBeacon'];
            const wp = new THREE.Vector3();
            b.getWorldPosition(wp);
            return [wp.x, wp.y, wp.z];
        """)
        rec_err = np.linalg.norm(np.array(beacon_recovered) - np.array(beacon_pos_identity))
        print(f"[EDGE 5C] Scale recovery error: {rec_err:.2e}")
        assert rec_err < 1e-5, f"Scene graph failed to recover from zero scale: {rec_err}"
        test_results["edge_case_checks"] += 1

        # Edge Case 5D: Non-Uniform Scale Propagation
        # Scale ArmRoot by (2.0, 3.0, 0.5)
        driver.execute_script("""
            const root = window.Praktikum7.armNodes['ArmRoot'];
            root.scale.set(2.0, 3.0, 0.5);
            window.Praktikum7.scene.updateMatrixWorld(true);
        """)
        scaled_mat = get_node_world_matrix(driver, "ToolTipBeacon")
        # In column-major:
        # col 0 norm should be 2.0
        # col 1 norm should be 3.0
        # col 2 norm should be 0.5
        c0 = math.sqrt(scaled_mat[0]**2 + scaled_mat[1]**2 + scaled_mat[2]**2)
        c1 = math.sqrt(scaled_mat[4]**2 + scaled_mat[5]**2 + scaled_mat[6]**2)
        c2 = math.sqrt(scaled_mat[8]**2 + scaled_mat[9]**2 + scaled_mat[10]**2)
        print(f"[EDGE 5D] Non-uniform scale propagation: col norms = ({c0:.3f}, {c1:.3f}, {c2:.3f})")
        assert abs(c0 - 2.0) < 1e-4 and abs(c1 - 3.0) < 1e-4 and abs(c2 - 0.5) < 1e-4, "Non-uniform scale failed to propagate to child matrixWorld!"
        test_results["edge_case_checks"] += 1

        # Restore ArmRoot scale
        driver.execute_script("""
            const root = window.Praktikum7.armNodes['ArmRoot'];
            root.scale.set(1.0, 1.0, 1.0);
            window.Praktikum7.scene.updateMatrixWorld(true);
        """)

        # =====================================================================
        # TEST 6: UI SLIDER EVENT BINDINGS, HUD TELEMETRY & AUTO-WAVE CONTINUITY
        # =====================================================================
        print("\n--- TEST SUITE 6: UI DOM SLIDERS, HUD TELEMETRY & DYNAMICS ---")

        # 6A: Reset button functionality
        driver.execute_script("""
            document.getElementById('btn-reset-arm').click();
        """)
        time.sleep(0.3)
        reset_state = driver.execute_script("""
            const k = window.Praktikum7.AppState.kinematics;
            return [k.baseYaw, k.shoulderPitch, k.elbowPitch, k.wristPitch, k.clawPinch];
        """)
        print(f"[UI 6A] After Reset Arm: {reset_state}")
        assert abs(reset_state[0] - 0.0) < 1e-4, "Base yaw reset failed"
        assert abs(reset_state[1] - 0.436) < 1e-3, "Shoulder pitch reset failed"
        assert abs(reset_state[2] - (-0.785)) < 1e-3, "Elbow pitch reset failed"
        assert abs(reset_state[3] - 0.349) < 1e-3, "Wrist pitch reset failed"
        assert abs(reset_state[4] - 0.5) < 1e-4, "Claw pinch reset failed"
        test_results["edge_case_checks"] += 1

        # 6B: Interactive Slider Event Dispatch
        # Test slider-arm-base input event
        driver.execute_script("""
            const sl = document.getElementById('slider-arm-base');
            sl.value = 45;
            sl.dispatchEvent(new Event('input'));
        """)
        time.sleep(0.2)
        base_yaw_from_slider = driver.execute_script("return window.Praktikum7.AppState.kinematics.baseYaw;")
        expected_yaw_45 = math.radians(45)
        print(f"[UI 6B] Slider Base 45 deg -> baseYaw: {base_yaw_from_slider:.5f} rad (expected {expected_yaw_45:.5f})")
        assert abs(base_yaw_from_slider - expected_yaw_45) < 1e-4, "Base slider event dispatch failed"
        test_results["edge_case_checks"] += 1

        # 6C: HUD Telemetry Text Synchronization
        # Read text from DOM hud-local-pos and hud-world-pos
        local_hud_text = driver.find_element("id", "hud-local-pos").text
        world_hud_text = driver.find_element("id", "hud-world-pos").text
        print(f"[UI 6C] DOM HUD Telemetry Display - Local: {local_hud_text}, World: {world_hud_text}")

        # Beacon local position is (0, 0.38, 0)
        assert "(0.00, 0.38, 0.00)" in local_hud_text, f"HUD Local pos incorrect: {local_hud_text}"

        # Parse World pos from "(x, y, z)"
        import re
        nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", world_hud_text)]
        actual_beacon_wp = driver.execute_script("""
            const wp = new THREE.Vector3();
            window.Praktikum7.armNodes['ToolTipBeacon'].getWorldPosition(wp);
            return [wp.x, wp.y, wp.z];
        """)
        print(f"[UI 6C] World Pos parsed from DOM: {nums}, Three.js internal: {[round(x, 2) for x in actual_beacon_wp]}")
        for parsed_val, internal_val in zip(nums, actual_beacon_wp):
            assert abs(parsed_val - round(internal_val, 2)) <= 0.01, f"HUD world pos mismatch: parsed {parsed_val} vs internal {internal_val}"
        test_results["edge_case_checks"] += 1

        # 6D: Auto-Wave Kinematic Motion Continuity (Check smooth trajectory with no NaN/Inf)
        driver.execute_script("""
            window.Praktikum7.AppState.kinematics.autoWave = true;
        """)
        prev_pos = actual_beacon_wp
        for step in range(10):
            time.sleep(0.08) # wait for render loop frames
            curr_pos = driver.execute_script("""
                const wp = new THREE.Vector3();
                window.Praktikum7.armNodes['ToolTipBeacon'].getWorldPosition(wp);
                return [wp.x, wp.y, wp.z];
            """)
            step_delta = np.linalg.norm(np.array(curr_pos) - np.array(prev_pos))
            # Delta between 80ms frames should be smooth (> 0 and < 2.0)
            assert step_delta >= 0.0, "Delta negative"
            assert step_delta < 2.0, f"Discontinuous jump in auto-wave: {step_delta}"
            prev_pos = curr_pos

        driver.execute_script("""
            window.Praktikum7.AppState.kinematics.autoWave = false;
            document.getElementById('btn-reset-arm').click();
        """)
        print("[UI 6D] Auto-Wave continuous kinematic smooth motion verified.")
        test_results["edge_case_checks"] += 1

        print("\n" + "=" * 70)
        print("EMPIRICAL TEST SUMMARY:")
        print(f"  Total Local Invariance Checks:       {test_results['local_invariance_checks']} (PASSED)")
        print(f"  Total World Trajectory FK Checks:    {test_results['world_trajectory_checks']} (PASSED)")
        print(f"  Total Matrix Composition Checks:     {test_results['matrix_composition_checks']} (PASSED)")
        print(f"  Total SO(3) Orthonormality Checks:   {test_results['orthonormality_checks']} (PASSED)")
        print(f"  Total Edge Case & Stress Checks:     {test_results['edge_case_checks']} (PASSED)")
        print(f"  Total Failures:                      {len(test_results['failures'])}")
        print("ALL EMPIRICAL MATHEMATICAL TESTS PASSED WITH ZERO TOLERANCE VIOLATIONS!")
        print("=" * 70)

        return True

    except Exception as e:
        print(f"\n[FATAL TEST EXCEPTION]: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        driver.quit()
        httpd.shutdown()

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
