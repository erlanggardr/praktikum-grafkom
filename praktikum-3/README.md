# Praktikum 3 — Interactive Transformation & Coordinate System dengan WebGL

Penugasan Modul Praktikum 3 Mata Kuliah Grafika Komputer (Kelas B 2026) Teknik Informatika, Institut Teknologi Sepuluh Nopember.

---

## Informasi Kelompok

- **Nama Kelompok**: Kelompok YOLO
- **Anggota Kelompok**:
  1. **Jalu Cahyo Senodiputro** (NRP: `5025241155`)
  2. **Erlangga Rizqi Dwi Raswanto** (NRP: `5025241179`)

---

## Deskripsi Aplikasi

Aplikasi ini adalah **Interactive Transformation Playground** berbasis WebGL2 untuk mempelajari konsep sistem koordinat lokal (*local coordinate space*), sistem koordinat dunia (*world coordinate space*), matriks transformasi 2D 3×3 (*translation, rotation, scaling*), komposisi perkalian matriks *affine*, serta pengaruh urutan perkalian matriks (*transform order*).

Geometri primitif segitiga didefinisikan satu kali di sekitar *local origin* $(0, 0)$ dan disimpan di GPU buffer (*VBO*). Objek di kanvas tidak dipindahkan dengan memodifikasi buffer vertex pada CPU setiap frame, melainkan melalui **Model Matrix 3×3** yang dikirimkan ke vertex shader melalui uniform `u_matrix`.

---

## Fitur Utama yang Diimplementasikan

1. **Pipeline WebGL2 & Shaders (GLSL ES 3.00)**:
   - Vertex Shader menggunakan koordinat homogen `vec3(a_position, 1.0)` dan menghitung posisi ter-transformasi $p = \mathbf{M} \times \mathbf{v}$.
   - Fragment Shader menerima uniform `u_color` untuk pewarnaan dinamis per-objek.
2. **Local Geometry & Single Shared GPU Buffer**:
   - Geometri segitiga lokal: `[-0.18, -0.15], [0.18, -0.15], [0.00, 0.22]`.
   - Satu buffer GPU digunakan bersama oleh **Object A**, **Object B**, **Child Object**, dan **Orbiting Satellite**.
3. **Pustaka Matematika Matrix 3×3 Column-Major (`src/matrix3.js`)**:
   - Matriks Identitas 3×3.
   - Matriks Translasi 2D: $\begin{bmatrix} 1 & 0 & t_x \\ 0 & 1 & t_y \\ 0 & 0 & 1 \end{bmatrix}$.
   - Matriks Rotasi 2D: $\begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}$.
   - Matriks Penskalaan Uniform & Non-Uniform: $\begin{bmatrix} s_x & 0 & 0 \\ 0 & s_y & 0 \\ 0 & 0 & 1 \end{bmatrix}$.
   - Perkalian Matriks $A \times B$ berstandar WebGL (Column-Major Float32Array).
4. **Dua Objek Utama**:
   - **Object A (Player)**: Dikontrol interaktif secara halus melalui keyboard atau klik mouse.
   - **Object B (Automated Animation)**: Animasi rotasi otomatis ($70^\circ/\text{s}$) dan pulsasi skala sinusoidal di posisi tetap $(0.42, 0.0)$.
5. **State-Based Input & Delta Time**:
   - Deteksi input keyboard kontinu tanpa *delay* pengulangan bawaan sistem operasi.
   - Pergerakan dikalikan `deltaTime` sehingga kecepatan konsisten di monitor refresh rate berapa pun (60Hz, 120Hz, 144Hz).
   - Dilengkapi batas koordinat tampak (*boundary clamping*) pada rentang NDC.
6. **World Axes & Local Pivot Marker**:
   - Sumbu koordinat X dan Y melintasi origin $(0, 0)$ sebagai acuan posisi global.
   - Titik pivot marker pada local origin $(0,0)$ yang bergerak bersama objek.

---

## Transform Order yang Dibandingkan

Aplikasi menyediakan tombol pengganti (*toggle*) urutan perkalian matriks:

1. **Order A: Scale $\to$ Rotate $\to$ Translate ($P' = \mathbf{T} \times \mathbf{R} \times \mathbf{S} \times P$)**
   - Objek diskalakan terlebih dahulu, diputar pada poros origin lokalnya sendiri, kemudian dipindahkan ke posisi target.
   - **Hasil Visual**: Objek berputar di tempat pada poros tengahnya (*in-place rotation*).
2. **Order B: Translate $\to$ Rotate ($P' = \mathbf{R} \times \mathbf{T} \times \mathbf{S} \times P$)**
   - Objek ditranslasikan terlebih dahulu menjauhi origin, kemudian rotasi diterapkan pada seluruh sistem koordinat.
   - **Hasil Visual**: Objek mengorbit mengelilingi titik pusat dunia $(0,0)$ (*orbital motion*).

Hal ini membuktikan secara visual bahwa perkalian matriks bersifat **tidak komutatif** ($\mathbf{T} \times \mathbf{R} \neq \mathbf{R} \times \mathbf{T}$).

---

## Challenge yang Dikerjakan (A–F Lengkap)

- [x] **Challenge A — Reset Transform (`R`)**: Mengembalikan posisi, rotasi, dan skala Object A seketika ke nilai default awal `(-0.35, 0.0, 0°, 1.0, 1.0)`.
- [x] **Challenge B — Transform Presets (`1`, `2`, `3`)**:
  - **Preset 1**: Posisi $(-0.40, 0.20)$, Rotasi $0^\circ$, Skala $(1.0, 1.0)$.
  - **Preset 2**: Posisi $(0.00, 0.00)$, Rotasi $45^\circ$, Skala $(1.4, 1.4)$.
  - **Preset 3**: Posisi $(0.35, -0.25)$, Rotasi $90^\circ$, Skala $(1.8, 0.55)$ (Non-uniform).
- [x] **Challenge C — Toggle Transform Order (`T`)**: Menukar urutan matriks antara mode TRS (*In-Place*) dan RT (*Orbit Origin*), dengan indikator status di HUD.
- [x] **Challenge D — Mouse Click Translation to NDC**: Mengonversi koordinat piksel klik mouse ke NDC rentang $[-1.0, 1.0]$:
  $$\text{ndcX} = \frac{\text{pixelX}}{\text{canvasWidth}} \times 2 - 1, \quad \text{ndcY} = 1 - \frac{\text{pixelY}}{\text{canvasHeight}} \times 2$$
  dan memindahkan Object A ke titik tersebut.
- [x] **Challenge E — Hierarchical Parent & Child (`J`)**: Objek anak hijau terikat pada Object A sebagai parent. Transformasi dunia objek anak dihitung secara hierarkis:
  $$\mathbf{M}_{\text{child\_world}} = \mathbf{M}_{\text{parent\_world}} \times \mathbf{M}_{\text{child\_local}}$$
  Ketika parent bergerak, berputar, atau diskalakan, objek anak mengikuti secara proporsional.
- [x] **Challenge F — Simple Orbit Satellite (`O`)**: Satelit ungu mengorbit mengelilingi Object B melalui rantai komposisi matriks:
  $$\mathbf{M}_{\text{sat}} = \mathbf{M}_{\text{center}} \times \mathbf{R}_{\text{orbit}} \times \mathbf{T}_{\text{radius}} \times \mathbf{S}_{\text{sat}}$$

---

## Daftar Kontrol Interaktif

| Tombol / Aksi | Fungsi |
| :--- | :--- |
| **Arrow Keys / WASD** | Translasi kontinu Object A pada sumbu X dan Y |
| **Q / E** | Rotasi kontinu Object A (berlawanan / searah jarum jam) |
| **+ / -** | Penskalaan Uniform Object A (membesar / mengecil) |
| **Z / X** | Penskalaan Non-Uniform sumbu X |
| **C / V** | Penskalaan Non-Uniform sumbu Y |
| **1 / 2 / 3** | Mengaktifkan Preset Transformasi 1, 2, atau 3 (Challenge B) |
| **T** | Mengganti Transform Order antara TRS dan RT (Challenge C) |
| **Klik Kanvas** | Memindahkan Object A ke posisi kursor mouse dalam NDC (Challenge D) |
| **J** | Menampilkan / menyembunyikan Objek Anak Hierarkis (Challenge E) |
| **O** | Menampilkan / menyembunyikan Objek Satelit Orbit (Challenge F) |
| **P** | Menjeda / melanjutkan animasi (*Pause/Resume* - membekukan rotasi, orbit, & pulsasi) |
| **R** | Mereset transformasi Object A ke kondisi awal (Challenge A) |

---

## Cara Menjalankan Project

Prasyarat: Node.js (v18+) dan package manager (pnpm / npm).

1. Buka terminal di direktori root atau masuk ke folder `praktikum-3/`:
   ```bash
   cd praktikum-3
   ```
2. Jalankan development server dengan Vite:
   ```bash
   pnpm install
   pnpm dev
   ```
   *Atau jika menggunakan `npm`:*
   ```bash
   npm install
   npm run dev
   ```
3. Buka URL lokal yang ditampilkan (misalnya `http://localhost:5173/praktikum-3/` atau `http://localhost:5173/`) pada browser modern yang mendukung WebGL2.

---

## Catatan Teknis & Debugging

- **Format Matriks**: WebGL menggunakan format *Column-Major*. Pada matriks 3×3, elemen indeks array `[6]` dan `[7]` menyimpan translasi $t_x$ dan $t_y$.
- **Sudut Rotasi**: Fungsi trigonometri JavaScript `Math.sin()` dan `Math.cos()` memerlukan input dalam satuan radian. Seluruh sudut derajat dikonversi terlebih dahulu menggunakan $\text{rad} = \text{deg} \times \frac{\pi}{180}$.
- **Pencegahan Glitch / Jump**: Delta time dibatasi maksimal `0.05 detik` (*clamping*) untuk menghindari lompatan posisi ketika pengguna berpindah tab peramban (*idle window*).
- **Zero Console Errors**: Kode telah diuji bebas dari peringatan maupun galat di console browser.
