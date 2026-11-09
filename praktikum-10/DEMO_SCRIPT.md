# Skrip Video Demo — Praktikum 10 (± 8–10 menit)

Buka `P10_YOLO_SciFiCrate.blend`. Siapkan 3 tab Blender: **3D Viewport**, **UV Editor**, **Shader Editor**. Total urutan mengikuti rubrik: seam → unwrap → checker → UV layout → node material → texture maps → emission → hasil akhir → challenge.

| Menit | Layar | Yang dikatakan / dilakukan |
|---|---|---|
| 0:00 | Final render (`12_final_scene_composition.png`) | Perkenalan kelompok YOLO (Jalu & Erlangga). Asset = SciFi Crate dari P9 + Damaged Helmet eksternal |
| 0:30 | 3D Viewport, mode Solid | Tunjukkan model P9 (belum bertekstur). Sebut: scale 1.0, normal sudah *Recalculate Outside*, 1 objek `SciFi_Crate`, Bevel masih modifier |
| 1:15 | Edit Mode → seam | Tampilkan seam merah. Jelaskan aturan: seam di perubahan arah normal dominan, edge non-manifold di-seam, island kecil digabung |
| 2:15 | UV Editor | **Unwrap** (`U` → Angle Based). Jelaskan fungsi island utama: body panels, lid, bracket, armor plate, handle/vent, face tersembunyi |
| 3:00 | Material Preview + `crate_checker_test.png` | **Checker test**: kotak seragam di semua sisi. Ceritakan perbaikan: 22 face stretch → 0 |
| 3:45 | UV Editor final | **Layout final**: texel density seragam (spread 1,02), margin 12 px, overlap sub-piksel (angka dari README §4) |
| 4:30 | Shader Editor | **Node graph**: 5 frame. Tunjuk color space tiap node (sRGB vs Non-Color) dan **Normal Map node** |
| 5:30 | Image Editor / 07 | **Texture maps**: Base Color, Roughness (variasi), Metallic (cat vs logam), Normal |
| 6:15 | Close-up plat armor | **Emission**: bar LED oranye, titik cyan; jelaskan emission mask Non-Color × strength |
| 7:00 | Helm | Tugas tambahan: sumber & lisensi Khronos (CC BY-NC 4.0 / CC BY 4.0), 5 map, bandingkan sebelum/sesudah PBR |
| 8:00 | Rendered View → `F12` | **Hasil akhir**: lighting 3 titik, kamera 52 mm, Eevee |
| 8:45 | Ringkasan | Sebut **challenge**: multi-material, metal+painted, custom emission mask, custom roughness variation, normal detail |

## Tips rekam
* Resolusi 1080p, zoom Blender cukup besar agar angka terbaca.
* Siapkan angka dari README §4 di layar kedua agar tidak salah ucap.
* Sebelum merekam: **File ▸ External Data ▸ Report Missing Files** (harus *No missing files*).
