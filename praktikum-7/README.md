# Praktikum 7: Three.js Interactive 3D Application — Prototype Persiapan UTS

> **Mata Kuliah:** Grafika Komputer (Kelas B) — Semester 5  
> **Institusi:** Departemen Teknik Informatika, Institut Teknologi Sepuluh Nopember (ITS)  
> **Kelompok:** YOLO  

### Anggota Kelompok
1. **Jalu Cahyo Senodiputro** — NRP: `5025241155`
2. **Erlangga Rizqi Dwi Raswanto** — NRP: `5025241179`

---

## 1. Judul & Deskripsi Prototype
* **Judul Prototype:** *Interactive Cybernetics & Articulated Kinematics 3D Workbench*
* **Deskripsi Aplikasi:**  
  Aplikasi grafika 3D berbasis web interaktif yang dikembangkan menggunakan Three.js (r128). Aplikasi ini mengintegrasikan struktur hierarkis **Scene Graph (Parent-Child & THREE.Group)** pada lengan robot artikulasi (*CyberArm-MK1*), pemuatan model karakter 3D eksternal (**GLTF/GLB**) secara asinkron dengan kontrol **AnimationMixer** (14 skeletal animation clips), sistem pencahayaan realistis berbasis **Physically Based Rendering (PBR)** dengan refleksi **RoomEnvironment (PMREM)**, serta interaksi kursor 3D penuh menggunakan **THREE.Raycaster** (hover visual feedback, selection state locking, dan dynamic telemetry inspector).

---

## 2. Struktur Scene Graph & Hierarchy Parent-Child
Sistem mengimplementasikan hirarki kinematika bertingkat 5-tier pada objek *CyberArm-MK1* untuk membuktikan komposisi transformasi affine serta perbedaan mendasar antara *local transform* dan *world transform*:
```text
Scene
└── SceneGraphRoot (THREE.Group)
    └── ArmBaseStand (Pedestal & Dasar Lengan)
        └── TurntableYawNode (THREE.Group - Rotasi Sumbu Y / Azimuth)
            ├── TurntableMesh
            └── ShoulderPitchNode (THREE.Group - Rotasi Sumbu Z / Elevasi Bahu)
                ├── UpperArmMesh
                └── ElbowPitchNode (THREE.Group - Rotasi Sumbu Z / Siku)
                    ├── ForearmMesh
                    └── WristRollNode (THREE.Group - Rotasi Sumbu X / Pergelangan)
                        ├── GripperBaseMesh
                        ├── GripperFingerL & GripperFingerR (Translasi Lokal Penjepit)
                        └── ToolTipBeacon (Marker Titik Efektor Ujung)
```
* **Local vs World Transform:**  
  Ketika parent (`TurntableYawNode` atau `ShoulderPitchNode`) ditransformasikan (rotasi/translasi), nilai koordinat `position` lokal pada child (`ToolTipBeacon`) tetap konstan `(0.00, 0.38, 0.00)`, namun koordinat `worldPosition` (dihitung melalui kaskade perkalian matriks `worldMatrix = parent.worldMatrix * child.localMatrix`) berubah secara kontinyu di ruang 3D global.

---

## 3. Model GLTF / GLB & Animasi Skeletal
* **Model yang Digunakan:** `robot.glb` (RobotExpressive 3D Character Asset).
* **Lokasi Asset:** `praktikum-7/assets/models/robot.glb` (Ukuran: ~464 KB).
* **Pipeline Asinkron & Fallback:**  
  Model dimuat menggunakan `THREE.GLTFLoader`. Tersedia mekanisme otomatis dual-fallback (CDN fallback dan procedural cyber-drone fallback) apabila file diakses via protokol `file:///` tanpa server lokal.
* **Traversal Bayangan:**  
  Menggunakan `model.traverse((child) => { ... })` untuk mengaktifkan `child.castShadow = true` dan `child.receiveShadow = true` pada seluruh mesh dan SkinnedMesh, serta menonaktifkan `frustumCulled` agar bounding box animasi tidak menghilang di sudut kamera.
* **AnimationMixer & Klip Animasi:**  
  Mendukung **14 klip animasi skeletal**:
  * *Locomotion / Base States:* `Idle`, `Walking`, `Running`, `Standing`, `Sitting`, `Dance`, `Death`.
  * *Emotes & Gestures:* `Jump`, `ThumbsUp`, `Wave`, `Yes`, `No`, `Punch`, `WalkJump`.
  * *Fitur Transisi:* Spherical linear crossfading antar animasi (0.35s fade duration), pengatur kecepatan playback (slider 0.1x – 2.5x), dan pencegahan lonjakan delta time (`Math.min(delta, 0.1)`).

---

## 4. Physically Based Rendering (PBR) & Environment
* **Material:** `THREE.MeshStandardMaterial` dengan pipeline gamma `sRGBEncoding` dan `ACESFilmicToneMapping`.
* **Roughness & Metalness Tuning:**  
  Disediakan slider real-time untuk mengatur kekasaran permukaan (*roughness*: 0.0 – 1.0) dan tingkat metalik (*metalness*: 0.0 – 1.0).
* **PBR Preset Presets (Challenge E):**  
  *Chrome*, *Gold*, *Copper*, *Glossy Blue*, *Matte Rubber*, dan *Brushed Steel*.
* **Environment Map (Challenge H):**  
  Pencahayaan berbasis lingkungan dihasilkan menggunakan `RoomEnvironment` dan `PMREMGenerator` untuk menghasilkan pantulan specular berbasis fisik (*Image-Based Lighting*). Dilengkapi tombol pintas keyboard `H` untuk mematikan/menyalakan environment guna membandingkan respons material secara visual.

---

## 5. Sistem Interaksi & Raycasting
* **Konversi Layar ke NDC:**  
  Koordinat kursor mouse dipetakan secara presisi ke Normalized Device Coordinates:
  $$\text{NDC}_x = \frac{x - \text{rect.left}}{\text{rect.width}} \times 2 - 1, \quad \text{NDC}_y = -\left(\frac{y - \text{rect.top}}{\text{rect.height}}\right) \times 2 + 1$$
* **Hover Feedback:** Kursor mouse berubah menjadi `pointer`, dan objek yang ditunjuk mendapatkan highlight visual / border box sementara.
* **Click Selection State:** Objek yang diklik dikunci status seleksinya (*selection lock*), ditandai dengan bounding box kustom (`BoxHelper` berwarna emas), dan datanya diumpankan ke panel inspeksi.
* **Information Panel HUD (Challenge C):**  
  Menampilkan metadata objek secara real-time: Nama Objek, Hierarki Induk, Posisi Lokal vs World, Rotasi Euler, Skala, Tipe Material, serta Dimensi Geometri ($W \times H \times D$).
* **Selection Auto-Rotation (Challenge G):**  
  Objek seleksi non-karakter dapat berputar otomatis secara perlahan saat sedang dipilih.

---

## 6. Challenge yang Diimplementasikan
1. **Challenge A:** Multiple Animation Clips (14 klip dengan transisi crossfade mulus).
2. **Challenge B:** Interactive Action Trigger (Trigger emote animasi via tombol & klik interaktif).
3. **Challenge C:** Comprehensive Information Panel (Live telemetry HUD untuk transformasi & material).
4. **Challenge E:** PBR Material Gallery & Presets (Preset material logam mulia, plastik, dan karet).
5. **Challenge G:** Selection Auto-Rotation (Rotasi otomatis objek terpilih).
6. **Challenge H:** Environment Lighting Toggle (Pintas keyboard `H` untuk mengaktifkan/menonaktifkan environment lighting).

---

## 7. Cara Menjalankan Aplikasi
Aplikasi didesain sepenuhnya *standalone* dan universal, dapat dijalankan dengan dua cara:

### Cara 1: Menggunakan Local Web Server (Direkomendasikan)
Gunakan server lokal berbasis Node.js / Python / Live Server agar loading model GLB berjalan optimal tanpa hambatan CORS:
```bash
# Opsi Python
python -m http.server 8080

# Atau opsi npx
npx serve .
```
Lalu buka browser pada alamat:
`http://localhost:8080/praktikum-7/`

### Cara 2: Langsung Buka File HTML (Offline file:///)
Cukup klik ganda (double-click) file `praktikum-7/index.html` pada File Explorer. Script memiliki *built-in offline fallback* yang secara otomatis tetap merender scene, material, dan avatar 3D secara penuh.

---

## 8. Catatan Pengujian & Debugging
Seluruh fungsionalitas telah divalidasi melalui automated headless Chrome test suites:
* `tests/test_m1_verify.py` & `tests/test_m2_verify.py`: 100% PASS (0 console errors, 60 FPS render loop).
* `tests/test_scene_graph_math.py`: Validasi matematika analitis transformasi affine parent-child lolos dengan galat numerik $\approx 0$ ($< 10^{-15}$).
* `tests/test_m1_stress.py` & `test_m1_forensic_audit.py`: Lolos 1.692 uji stress scrubbing dan audit integritas (Status: CLEAN).
