# Praktikum 2 — WebGL Fundamental Playground

## Identitas Mahasiswa

| Nama | NRP |
| --- | --- |
| Jalu Cahyo Senodiputro | 5025241155 |
| Erlangga Rizqi Dwi Raswanto | 5025241179 |

## Deskripsi Aplikasi

Aplikasi ini adalah playground WebGL2 interaktif untuk mengeksplorasi primitive, vertex color, draw mode, animasi, serta input mouse dan keyboard. Pengguna dapat memilih bentuk dan warna, lalu membuat object baru dengan klik pada canvas.

## Primitive yang Digunakan

- Triangle
- Rectangle
- Circle
- Lines
- Points

Data vertex untuk Lines, Points, dan Circle dibangun secara prosedural menggunakan perulangan JavaScript.

## Draw Mode

- **Dynamic colour:** bentuk dirender terisi dengan warna per-vertex.
- **Wireframe:** Triangle, Rectangle, dan Circle dirender sebagai garis tepi.

## Fitur Animasi

- Rendering loop memakai `requestAnimationFrame`.
- Minimal tiga object bergerak dengan posisi, kecepatan, dan arah awal berbeda.
- Object memantul ketika mencapai batas canvas.
- Object utama dapat digerakkan secara kontinu menggunakan state-based keyboard input.

## Fitur Interaksi

- Tombol memilih primitive: Triangle, Rectangle, Circle, Lines, atau Points.
- Tombol memilih warna: merah, hijau, biru, cyan, atau acak.
- Klik canvas mengonversi koordinat mouse dari pixel ke NDC, kemudian membuat primitive baru di lokasi tersebut.
- Tombol mode mengganti render antara warna dinamis dan wireframe.
- Tombol panah atau `W`, `A`, `S`, `D` menggerakkan object utama.

## Challenge yang Dikerjakan

- **A — Primitive Selector**
- **B — Color Control**
- **C — Spawn Primitive**
- **D — Multiple Moving Objects**
- **E — Procedural Pattern**
- **F — Simple HUD**: FPS, jumlah object, mode aktif, dan koordinat mouse NDC.

## Cara Menjalankan Project

Prasyarat: Node.js dan pnpm.

```bash
cd praktikum-2
pnpm install --frozen-lockfile
pnpm dev
```

Buka URL yang ditampilkan oleh Vite di browser dengan dukungan WebGL2.

Untuk membuat build produksi:

```bash
pnpm build
pnpm preview
```
