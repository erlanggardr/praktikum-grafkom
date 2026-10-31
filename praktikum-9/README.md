# Praktikum 9: Blender Fundamental & 3D Modeling — Hard-Surface Asset

**Mata Kuliah:** EF234504 — Grafika Komputer  
**Departemen:** Teknik Informatika, Fakultas Teknologi Elektro dan Informatika Cerdas (FTEIC), Institut Teknologi Sepuluh Nopember (ITS)  
**Laboratorium:** Laboratorium GIGA (Graphics, Interaction, and Game Architecture)  
**Dosen Pengampu:** Dr. Darlis Herumurti  

---

## Informasi Kelompok

* **Nama Kelompok:** Kelompok YOLO
* **Anggota Kelompok:**
  1. **Jalu Cahyo Senodiputro** (NRP: `5025241155`)
  2. **Erlangga Rizqi Dwi Raswanto** (NRP: `5025241179`)
* **Repositori:** [https://github.com/erlanggardr/praktikum-grafkom](https://github.com/erlanggardr/praktikum-grafkom)
* **Live Deployment GitHub Pages:** [https://erlanggardr.github.io/praktikum-grafkom/praktikum-9/](https://erlanggardr.github.io/praktikum-grafkom/praktikum-9/)

---

## 1. Identitas & Ringkasan Hasil Praktikum

* **Nama Asset:** `SciFi_Crate` (Modular Military / Industrial Hard-Surface Crate)
* **Kategori:** Hard-Surface 3D Prop (Game-Ready & Interactive Web 3D)
* **Starting Primitive:** `Cube` (Chassis utama peti, tutup, handle) dan `Plane` (Armor plat pelindung)
* **Berkas Hasil Praktikum:**
  * `.blend` Utama: [`P09_YOLO_SciFiCrate.blend`](./P09_YOLO_SciFiCrate.blend)
  * `.glb` Web 3D: [`assets/models/P09_YOLO_SciFiCrate.glb`](./assets/models/P09_YOLO_SciFiCrate.glb) (238 KB)
  * Arsip Pengumpulan: [`P09_YOLO_SciFiCrate.zip`](./P09_YOLO_SciFiCrate.zip)
* **Tangkapan Layar Workflow (Dokumentasi Proses):**
  * Tahap 1 — Blockout & Proporsi: [`screenshot_blockout.png`](./screenshot_blockout.png)
  * Tahap 2 — Modeling Inset & Extrude: [`screenshot_modeling.png`](./screenshot_modeling.png)
  * Tahap 3 — Render Final Evaluasi: [`screenshot_final.png`](./screenshot_final.png)

---

## 2. Struktur Objek & Hirarki Outliner

Struktur scene diatur secara modular dan terorganisir di dalam Collection `SciFi_Crate`:

```text
Scene Collection
└── SciFi_Crate/
    ├── Crate_Body             (Chassis utama dengan recessed panels & Bevel modifier)
    ├── Crate_Lid              (Penutup atas pelindung dengan alur pengunci)
    ├── Front_Armor_Plate      (Panel plat sci-fi tipis dengan Solidify modifier - Challenge C)
    ├── Vent_Grille_Array      (Kisi ventilasi mekanikal berulang dengan Array modifier - Challenge B)
    ├── Modular_Handles        (Gagang angkat simetris dengan Mirror modifier - Challenge A)
    └── Corner_Reinforcements  (Braket pelindung sudut 8 arah dengan Mirror XY modifier)
```

Seluruh objek telah melalui **Apply Scale** (`Ctrl + A` $\to$ Scale), sehingga nilai transform scale berada pada `(1.0, 1.0, 1.0)`. Hal ini menjamin modifier (seperti Bevel dan Solidify) beroperasi dengan ketebalan dan sudut yang seragam tanpa distorsi non-uniform.

---

## 3. Workflow Modeling Step-by-Step

### A. Tahap 1: Blockout & Proporsi Awal
1. Primitive dasar `Cube` dibuat dengan dimensi proporsional $2.0 \times 1.4 \times 1.1$ unit.
2. Penutup atas (`Crate_Lid`) dibentuk sedikit lebih lebar ($2.06 \times 1.46 \times 0.16$) untuk memberikan siluet yang kontras antara badan peti dan tutup.
3. Objek dianalisis dari pandangan ortografis (*Front* `Numpad 1`, *Right* `Numpad 3`, *Top* `Numpad 7`) untuk memastikan bentuk siluet besar terbaca kokoh sebelum menambahkan detail sekunder.

### B. Tahap 2: Operasi Edit Mode (Inset, Extrude, Loop Cut)
1. **Inset (`I`):** Diterapkan pada face depan, belakang, dan samping peti dengan ketebalan `0.14` unit untuk membatasi area bingkai luar (bumper).
2. **Extrude Inward (`E` $\to$ `-0.08` normal):** Mendorong face hasil inset ke arah dalam untuk membentuk *recessed panel*.
3. **Secondary Inset & Extrude Outward:** Menghasilkan alur mekanikal di dalam panel utama untuk menambahkan kedalaman visual sci-fi.
4. **Loop Cut (`Ctrl + R`):** Digunakan untuk membagi permukaan penutup atas dan badan samping secara terstruktur berbasis quad topology.

### C. Tahap 3: Non-Destructive Modifiers (Minimal 2 Modifier)
Praktikum ini menggunakan 4 jenis modifier non-destruktif:
1. **Bevel Modifier (`Angle Limit 35°`, `Width 0.025`, `Segments 2`):** Menghaluskan tepi tajam matematis secara non-destruktif sehingga menangkap highlight pencahayaan secara realistis.
2. **Mirror Modifier (Axis X & XY):** 
   * Axis X digunakan pada `Modular_Handles` dengan objek acuan `Crate_Body`.
   * Axis X dan Y digunakan pada `Corner_Reinforcements` untuk menggandakan braket pengaman ke seluruh 4 sudut secara instan dan simetris.
3. **Array Modifier (`Count 6`, `Relative Offset Z 1.8`):** Menggandakan bilah sirip ventilasi `Vent_Grille_Array` secara parametrik dan presisi.
4. **Solidify Modifier (`Thickness 0.035`):** Memberikan ketebalan volumetrik pada geometri 2D bidang miring `Front_Armor_Plate`.

### D. Tahap 4: Topology Cleanup & Pemeriksaan Kualitas
1. **Remove Doubles / Merge by Distance (`M` $\to$ By Distance):** Memastikan tidak ada vertex ganda akibat kesalahan pembatalan Extrude (0 duplikat).
2. **Recalculate Normals (`Shift + N`):** Memastikan seluruh normal permukaan mengarah ke luar (outside), menghindari shading artifak atau face gelap saat dirender.
3. **Topology Flow:** Menjaga dominansi quad (segiempat) untuk mempermudah transisi ke tahap UV Unwrapping pada Pertemuan 10.

---

## 4. Laporan 8 Eksperimen Wajib (Poin 69–76 Modul)

### Eksperimen 1: Object Mode vs Edit Mode Transform
* **Prosedur:** Cube A diskalakan pada sumbu X (`S X 2`) di Object Mode; Cube B diskalakan pada sumbu X (`S X 2`) di Edit Mode.
* **Hasil Pengamatan:** Secara visual kedua kubus terlihat memanjang 2x pada sumbu X. Namun pada panel Transform Properties:
  * Cube A memiliki Scale `(2.0, 1.0, 1.0)`.
  * Cube B memiliki Scale `(1.0, 1.0, 1.0)` karena transform dilakukan langsung pada data vertex geometri lokal.
* **Analisis:** Mengubah scale di Object Mode tanpa melakukan Apply Scale akan mendistorsi operasi Edit Mode berikutnya (seperti Bevel atau Inset) yang mengasumsikan skala ruang lokal seragam.

### Eksperimen 2: Apply Scale dan Bevel
* **Prosedur:** Kubus diskalakan non-uniform (`S X 3`, `S Z 0.5`). Dilakukan Bevel sebelum Apply Scale, dibandingkan dengan Bevel setelah `Ctrl + A` $\to$ Scale.
* **Hasil Pengamatan:** 
  * Sebelum Apply Scale: Chamfer Bevel terdistorsi elips/lonjong pipih mengikuti faktor skala $3:1:0.5$.
  * Setelah Apply Scale: Chamfer Bevel memiliki sudut $45^\circ$ dan lebar chamfer yang seragam di seluruh sudut geometri.
* **Analisis:** Modifier Bevel menghitung radius dalam ruang objek lokal sebelum matriks transformasi dunia diterapkan. Apply Scale menyatukan matriks tersebut ke dalam koordinat vertex dasar.

### Eksperimen 3: Extrude vs Move
* **Prosedur:** Face 1 dipindahkan menggunakan `G Z 1`; Face 2 diekstrusi menggunakan `E Z 1`.
* **Hasil Pengamatan:** 
  * Perintah `G` (Move) hanya meregangkan face yang ada dan miringkan face-face yang bertetangga tanpa menambah vertex baru.
  * Perintah `E` (Extrude) menduplikasi perimeter vertex, membentuk jajaran face samping baru yang menghubungkan posisi lama dan posisi baru.
* **Analisis:** Extrude menambahkan topologi baru ke dalam mesh, sedangkan Move hanya mengubah posisi topologi yang sudah ada.

### Eksperimen 4: Inset + Extrude Inward
* **Prosedur:** Memilih face, menerapkan `I 0.15`, kemudian `E` ke arah dalam normal.
* **Hasil Pengamatan:** Terbentuk cekungan bertingkat (*recessed panel*) dengan border tegas.
* **Analisis:** Inset membentuk batas pengaman topology (isolasi boundary) sehingga saat diekstrusi ke dalam, tepian luar objek utama tidak mengalami distorsi atau merusak edge loop sekitarnya.

### Eksperimen 5: Loop Cut pada Quad Topology
* **Prosedur:** Menerapkan Loop Cut (`Ctrl + R`) dengan 1 cut vs 3 cuts pada permukaan quad.
* **Hasil Pengamatan:** Edge loop membelah mesh secara bersih mengalir sepanjang lintasan quad berlawanan. Penambahan cut meningkatkan fleksibilitas pembentukan panel lokal, tetapi menambah jumlah poligon.
* **Analisis:** Quad topology memiliki arah aliran (*edge flow*) yang terdefinisi jelas dari dua pasang edge sejajar, sedangkan segitiga (tris) atau n-gon menghentikan perambatan edge loop.

### Eksperimen 6: Jumlah Bevel Segment
* **Prosedur:** Membandingkan Bevel dengan 1 segment (chamfer datar), 3 segments (rounded edge halus), dan 6 segments.
* **Hasil Pengamatan:** 1 segment menghasilkan potongan miring tegas (karakter industri kasar); 3 segment menghasilkan kurva lengkung halus yang menangkap highlight cahaya spekular dengan sangat baik tanpa pemborosan poligon; 6 segment menghasilkan kurva sangat mulus tetapi menambah beban poligon secara eksponensial.
* **Keputusan:** Dipilih 2–3 segment untuk asset hard-surface real-time / game-ready.

### Eksperimen 7: Urutan Modifier Stack
* **Prosedur:** Membandingkan urutan `Mirror → Bevel` dengan `Bevel → Mirror`.
* **Hasil Pengamatan:** 
  * `Mirror → Bevel`: Pusat sambungan simetri disatukan (*merge center*), kemudian edge luar dari objek gabungan di-bevel secara mulus tanpa celah di tengah.
  * `Bevel → Mirror`: Sisi tengah sebelum disatukan terkena bevel terlebih dahulu, menghasilkan parit/alur tak diinginkan di sepanjang garis simetri tengah.
* **Analisis:** Evaluasi modifier stack bersifat sekuensial dari atas ke bawah; modifier pembentuk geometri dasar harus diletakkan sebelum modifier detailing.

### Eksperimen 8: Duplicate Manual vs Array Modifier
* **Prosedur:** Menggandakan kisi kisi pendingin secara manual dengan `Shift + D` berkali-kali vs menggunakan `Array Modifier`.
* **Hasil Pengamatan:** Manual duplikasi menghasilkan banyak objek terpisah yang sulit diedit jarak dan jumlahnya; Array modifier memungkinkan perubahan jumlah kisi (*Count*) dan jarak antar kisi (*Offset*) secara parametrik dan non-destruktif hanya dengan mengubah satu angka.

---

## 5. Implementasi Challenge yang Diselesaikan

* **Challenge A — Symmetric Prop (Mirror Modifier):** Komponen `Modular_Handles` dimodelkan di sisi kanan (+X), lalu dicerminkan ke sisi kiri (-X) menggunakan `Mirror Modifier` dengan acuan pusat `Crate_Body`.
* **Challenge B — Repeated Mechanical Detail (Array Modifier):** Kisi ventilasi pendingin `Vent_Grille_Array` dibuat dari satu bilah sirip miring dan digandakan 6 kali dengan offset Z parametrik.
* **Challenge C — Thin Panel + Solidify Modifier:** Plat pelindung dada depan `Front_Armor_Plate` dibuat dari sebuah bidang datar (Plane 2D) bersudut sci-fi yang kemudian diberi ketebalan solid `0.035` unit secara non-destruktif via `Solidify Modifier`.
* **Challenge D — Advanced Paneling:** Kombinasi Loop Cut, Inset ganda, dan Extrude bertingkat pada dinding samping peti untuk menghasilkan tekstur hard-surface yang dalam dan bervariasi.
* **Challenge G — Modular Hierarchy Asset:** Pembagian komponen menjadi sub-objek yang logis di Outliner (`Crate_Body`, `Crate_Lid`, `Corner_Reinforcements`, `Modular_Handles`, `Front_Armor_Plate`, `Vent_Grille_Array`) di dalam collection `SciFi_Crate`.
* **Challenge H — Precision Modeling:** Penggunaan input numerik pada translasi dan rotasi serta constraints sumbu X, Y, Z untuk menjamin presisi perakitan antar komponen.

---

## 6. Jawaban 50 Pertanyaan Pemahaman (Poin 100 Modul)

1. **Fungsi Blender dalam graphics pipeline:** Alat DCC (Digital Content Creation) utama untuk membuat geometri 3D, unwrapping UV, melukis tekstur, rigging animasi, dan menyiapkan aset sebelum diekspor ke engine real-time (Three.js/Unity).
2. **Fungsi 3D Viewport:** Ruang kerja visual utama untuk melihat, menavigasi, dan memanipulasi objek 3D dalam ruang 3 dimensi.
3. **Fungsi Outliner:** Editor hierarki berbentuk pohon (tree view) untuk mengorganisasi objek, collection, kamera, dan pencahayaan dalam scene.
4. **Fungsi Properties Editor:** Panel untuk mengatur properti mendalam dari objek terpilih, parameter modifier, material, data mesh, kamera, dan pengaturan render scene.
5. **Fungsi MMB (Middle Mouse Button):** Melakukan navigasi rotasi sudut pandang (*Orbit*) mengitari titik fokus di 3D Viewport.
6. **Fungsi `Shift + MMB`:** Menggeser sudut pandang kamera secara planar sejajar layar (*Pan*).
7. **Fungsi Numpad 1, 3, dan 7:** Sudut pandang ortografis standar: Numpad 1 = Front View, Numpad 3 = Right Side View, Numpad 7 = Top View.
8. **Fungsi Numpad 5:** Mengalihkan proyeksi viewport antara Perspektif (memiliki titik hilang) dan Ortografis (garis sejajar tanpa distorsi kedalaman).
9. **Fungsi Numpad `.` (Period):** Melakukan fokus dan pemusatan kamera ke objek atau komponen yang sedang dipilih (*Frame Selected*).
10. **Perbedaan Object Mode dan Edit Mode:** Object Mode memperlakukan mesh sebagai satu kesatuan entitas objek utuh; Edit Mode memungkinkan manipulasi komponen penyusun internal mesh (vertex, edge, dan face).
11. **Apa itu Vertex:** Titik koordinat dasar tunggal $(x, y, z)$ dalam ruang 3 dimensi.
12. **Apa itu Edge:** Garis lurus segmen penghubung antara dua buah vertex.
13. **Apa itu Face:** Permukaan bidang datar tertutup yang dibentuk oleh minimal tiga buah edge yang terhubung.
14. **Apa itu Mesh:** Kumpulan struktur data geometris yang terdiri dari sekumpulan vertex, edge, dan face yang membentuk representasi poligon 3D.
15. **Apa itu Topology:** Pola alur susunan dan hubungan keterhubungan antar vertex, edge, dan poligon pada suatu permukaan mesh.
16. **Mengapa quad nyaman untuk loop-based editing:** Quad (segiempat) memiliki dua pasang edge sejajar berlawanan yang tidak ambigu, memungkinkan algoritma edge loop dan loop cut merambat secara teratur dan dapat diprediksi.
17. **Fungsi `G`, `R`, dan `S`:** Shortcut utama transformasi: `G` = Grab/Move (translasi), `R` = Rotate (rotasi), `S` = Scale (penyekalaan ukuran).
18. **Keuntungan Axis Constraint:** Membatasi pergerakan transformasi hanya pada sumbu tertentu ($X, Y,$ atau $Z$), menjamin perataan dan posisi yang presisi tanpa pergeseran liar di sumbu lain.
19. **Mengapa transform numerik berguna:** Memungkinkan pemberian nilai matematis yang eksak (misal rotasi $90^\circ$ atau translasi $1.5$ unit), krusial untuk pemodelan teknik dan modularitas.
20. **Fungsi `Shift + A`:** Membuka menu pop-up untuk menambahkan objek atau primitif baru ke dalam scene atau node editor.
21. **Fungsi `Shift + D`:** Menduplikasi objek atau komponen terpilih menjadi entitas independen baru.
22. **Fungsi Apply Scale (`Ctrl + A` $\to$ Scale):** Mereset nilai skala objek saat ini menjadi `(1.0, 1.0, 1.0)` tanpa mengubah bentuk geometri fisik, dengan memperbarui koordinat data vertex internal.
23. **Mengapa Apply Scale penting sebelum Bevel:** Agar modifier Bevel menghitung offset radius pemotongan secara seragam dan tidak terdistorsi lonjong akibat perbedaan rasio skala lokal pada sumbu $X, Y, Z$.
24. **Fungsi Snapping:** Mengunci posisi transformasi ke grid, vertex, edge, atau face lain secara magnetik untuk perakitan yang presisi.
25. **Fungsi Proportional Editing (`O`):** Menggerakkan vertex tetangga secara halus mengikuti kurva pengaruh (*falloff radius*), berguna untuk pembentukan kontur organik.
26. **Fungsi Extrude (`E`):** Membuat geometri baru dengan menduplikasi elemen terpilih dan memperpanjang bidang penghubung ke arah tertentu.
27. **Perbedaan Extrude dan Move:** Move (`G`) hanya memindahkan vertex lama tanpa menambah jumlah poligon; Extrude (`E`) melipatgandakan vertex dan membuat dinding face baru di antara posisi lama dan baru.
28. **Fungsi Inset (`I`):** Membuat face baru yang diperkecil di dalam face terpilih dengan batas perimeter yang proporsional.
29. **Manfaat kombinasi Inset + Extrude:** Pola standar industri untuk membuat detail panel tertanam (*recessed panel*) atau bingkai timbul tanpa merusak topologi tepi luar objek.
30. **Fungsi Loop Cut (`Ctrl + R`):** Memotong rangkaian ring quad dengan menambahkan satu atau lebih garis edge loop yang membagi permukaan secara teratur.
31. **Mengapa Loop Cut cocok pada quad topology:** Karena quad memberikan pasangan edge berlawanan yang jelas sehingga algoritma pemotongan dapat melintasi jajaran poligon secara mulus hingga akhir loop tertutup.
32. **Fungsi Bevel (`Ctrl + B`):** Memotong tepian tajam (*sharp edge*) menjadi bidang miring (*chamfer*) atau lengkungan halus (*rounded edge*).
33. **Mengapa Bevel membantu visual hard-surface:** Di dunia nyata tidak ada benda dengan sudut tajam infinitesimal; Bevel menangkap garis kilau spekular (*specular highlight*) yang membuat bentuk dan dimensi objek terbaca jelas di mata dan kamera.
34. **Fungsi Merge (`M`):** Menyatukan dua atau lebih vertex yang terpilih menjadi satu vertex tunggal.
35. **Fungsi Merge by Distance:** Menyatukan secara otomatis seluruh vertex yang berjarak lebih dekat dari batas ambang toleransi tertentu, sangat vital untuk membersihkan vertex duplikat.
36. **Fungsi Fill (`F`):** Membuat face baru yang menutupi ruang kosong di antara vertex atau edge boundary yang dipilih.
37. **Fungsi Knife (`K`):** Tool pemotong bebas yang memungkinkan pembuatan edge dan vertex baru di sembarang lintasan face secara manual.
38. **Fungsi Recalculate Normal (`Shift + N`):** Menyelaraskan arah vektor normal seluruh face agar seragam menghadap ke sisi luar mesh.
39. **Apa itu Modifier:** Operasi pemrosesan geometri prosedural yang mengubah tampilan atau struktur mesh secara otomatis tanpa memodifikasi data vertex mentahnya secara permanen.
40. **Mengapa Modifier disebut non-destructive:** Karena parameter dapat diubah, diurutkan ulang, disembunyikan, atau dihapus kapan saja; geometri asli di Edit Mode tetap utuh sebelum modifier di-Apply.
41. **Fungsi Bevel Modifier:** Menerapkan chamfer atau fillet secara otomatis dan parametrik pada tepi objek berdasarkan sudut batas (*angle*) atau bobot (*weight*).
42. **Fungsi Mirror Modifier:** Menciplak dan mencerminkan setengah model geometri ke sumbu simetri berlawanan secara real-time.
43. **Fungsi Array Modifier:** Menggandakan objek berulang kali dalam pola barisan berjarak konstan atau relatif.
44. **Fungsi Solidify Modifier:** Memberikan ketebalan volumetrik pada permukaan bidang tipis atau lembaran poligon terbuka.
45. **Fungsi Subdivision Surface:** Menghaluskan permukaan secara adaptif dengan membagi setiap poligon menjadi empat poligon yang lebih kecil menggunakan algoritma Catmull-Clark.
46. **Mengapa urutan Modifier Stack penting:** Karena modifier dieksekusi secara berurutan dari atas ke bawah; output dari modifier pertama menjadi input bagi modifier berikutnya.
47. **Apa yang dimaksud Blockout:** Tahap awal pemodelan 3D yang berfokus menyusun proporsi, ukuran, komposisi, dan siluet bentuk besar menggunakan primitif sederhana.
48. **Mengapa detail kecil tidak boleh dibuat terlalu awal:** Karena detail kecil menambah kepadatan poligon yang membuat perubahan proporsi dasar menjadi sangat rumit dan merusak topologi.
49. **Apa yang dimaksud Topology Cleanup:** Proses pembersihan mesh dari vertex ganda, face tersembunyi tak berguna, pembalikan normal yang salah, dan penyelarasan alur edge sebelum masuk tahap lanjut.
50. **Mengapa aset perlu diperiksa sebelum masuk tahap UV:** Karena perubahan geometri setelah proses UV unwrapping akan merusak koordinat pemetaan tekstur dan mengharuskan unwrap ulang dari awal.

---

## 7. Jawaban Pertanyaan Analisis (Poin 101 Modul)

### A — Object Mode vs Edit Mode Transform State
* **Pertanyaan:** Dua kubus tampak sama. Kubus A diperpanjang melalui Object Mode Scale, sedangkan Kubus B diperpanjang melalui Edit Mode. Apa perbedaan state transform kedua object?
* **Jawaban:** Kubus A menyimpan status skala non-uniform pada matriks transformasi objeknya (`Scale X = 2.0, Y = 1.0, Z = 1.0`), sedangkan data vertex lokalnya masih berupa kubus standar $1 \times 1 \times 1$. Sebaliknya, Kubus B menyimpan status skala identitas (`Scale = 1.0, 1.0, 1.0`) karena posisi koordinat lokal vertex-nya yang telah dimodifikasi langsung menjadi panjang 2 unit. Implikasinya, jika kedua kubus diberi Bevel Modifier dengan lebar yang sama, Kubus A akan menghasilkan bevel pipih yang terdistorsi sebesar faktor 2 pada sumbu X, sedangkan Kubus B menghasilkan bevel simetris yang sempurna.

### B — Extrude vs Move
* **Pertanyaan:** Mengapa memindahkan face dengan `G` tidak sama dengan melakukan `E` lalu memindahkan hasil extrusion?
* **Jawaban:** Perintah `G` (Move) hanya mentranslasikan posisi vertex penyusun face yang sedang aktif. Poligon di sekelilingnya yang terhubung akan tertarik dan mengalami deformasi kemiringan tanpa adanya elemen geometri baru yang dibuat. Sebaliknya, perintah `E` (Extrude) menciptakan duplikat dari vertex dan edge boundary face tersebut, kemudian menggenerasi sekumpulan quad penutup baru (*connecting faces*) di sekeliling dinding celah. Struktur topologi hasil Extrude memiliki ketebalan dinding baru yang mandiri.

### C — Bevel pada Hard-Surface Visual
* **Pertanyaan:** Mengapa hard-surface asset sering terlihat lebih baik ketika edge penting diberi bevel kecil?
* **Jawaban:** Sudut tajam tanpa bevel secara matematis hanya memiliki lebar 0 pixel sehingga transisi antar muka terjadi secara diskontinu ekstrem. Dalam dunia nyata, semua tepi benda memiliki radius pembulatan mikro. Bevel menciptakan face transisi bersudut diagonal yang memantulkan cahaya lingkungan (*specular highlight*) ke arah mata atau kamera. Highlight tipis inilah yang mendefinisikan batas tepi volume benda, membedakan bidang depan dan bidang samping, serta memberikan ilusi material fisik yang solid dan berkualitas tinggi.

### D — Non-Destructive Modifier Workflow
* **Pertanyaan:** Apa keuntungan mempertahankan Mirror/Array/Bevel sebagai modifier selama tahap desain dibanding langsung Apply?
* **Jawaban:** Mempertahankan modifier tetap aktif (tidak di-apply) mempertahankan fleksibilitas desain (*non-destructive*). Jika terdapat revisi proporsi bentuk dasar di Edit Mode, pengguna hanya perlu mengedit setengah bagian mesh (Mirror) atau satu elemen tunggal (Array), dan seluruh detail cerminan/pengulangan akan langsung terbarui secara otomatis. Selain itu, parameter seperti lebar bevel atau jumlah kisi dapat disesuaikan kapan saja untuk memenuhi batasan polycount target game engine tanpa perlu mengulang modeling dari nol.

### E — Topology & Loop Cut Discipline
* **Pertanyaan:** Mengapa menambahkan banyak Loop Cut tanpa tujuan bukan workflow yang baik?
* **Jawaban:** Menambahkan edge loop tanpa alasan fungsional mengakibatkan fenomena *density clutter* (kepadatan poligon berlebih). Setiap penambahan loop cut memperbanyak jumlah vertex yang harus dikelola saat hendak memodifikasi bentuk dasar, meningkatkan risiko terjadinya permukaan bergelombang (*uneven shading*), memperberat proses UV Unwrapping dan pengecatan tekstur, serta membuang-buang anggaran poligon (*performance budget*) pada engine game real-time. Prinsip modeling yang benar adalah: *cukup untuk mendefinisikan siluet, cukup untuk shading yang bersih, dan mudah diedit kembali*.

### F — Primitive Decomposition pada Robot Head
* **Pertanyaan:** Jika harus membuat robot head, bagaimana Anda memecah bentuk tersebut menjadi primitive dan component yang lebih sederhana?
* **Jawaban:** Bentuk kepala robot dipecah menjadi beberapa komponen modular berbasis primitif:
  1. *Main Cranium / Tengkorak Kepala:* Dimulai dari primitif **Cube** yang diskalakan, diberi bevel sudut, dan subdivisi untuk membentuk cangkang tempurung utama.
  2. *Visor / Mata Optik:* Dimulai dari primitif **Cylinder** (untuk lensa bundar) atau bidang lengkung **Plane** yang diekstrusi dan diberi Solidify.
  3. *Ear / Audio Receiver Module:* Menggunakan **Cylinder** pipih pada sisi kiri dan kanan yang digandakan menggunakan **Mirror Modifier**.
  4. *Jaw / Mandible Bumper:* Menggunakan **Cube** yang dipotong dengan Loop Cut dan diekstrusi ke bawah membentuk rahang mekanikal.
  5. *Cooling Vents / Leher:* Menggunakan primitif tipis yang disusun dengan **Array Modifier** untuk kisi-kisi dan silinder bersegmen untuk persendian leher.

### G — Pengaruh Non-Uniform Scale pada Operasi Modeling
* **Pertanyaan:** Mengapa non-uniform Object Scale dapat mempengaruhi hasil operasi tertentu?
* **Jawaban:** Blender menghitung kalkulasi matematis alat Edit Mode dan Modifier (seperti Bevel offset, Inset thickness, dan Solidify depth) dalam ruang koordinat lokal (*local object space*). Setelah geometri dihitung, Blender menerapkan matriks transformasi objek (termasuk skala $S_x, S_y, S_z$) untuk menampilkannya di viewport. Jika skala lokal tidak seragam (misal $S_x = 3.0, S_y = 1.0$), jarak pemotongan 0.1 unit pada sumbu X akan diregangkan menjadi 0.3 unit di layar, menghasilkan ketebalan bevel atau dinding yang tidak rata dan terdistorsi.

### H — Hubungan Geometri Pertemuan 9 dengan Tahap UV & Material Pertemuan 10
* **Pertanyaan:** Mengapa geometry yang rapi pada Pertemuan 9 akan membantu pekerjaan UV dan material pada Pertemuan 10?
* **Jawaban:** UV Unwrapping adalah proses memproyeksikan permukaan 3D ke bidang 2D (*flattening*). Geometri yang rapi dengan topologi dominan quad dan aliran edge loop yang konsisten memudahkan penentuan garis keliman (*Mark Seam*) dan menghasilkan *UV islands* yang rata tanpa regangan distorsi (*texture stretching*). Sebaliknya, topologi yang berantakan dengan banyak n-gon, vertex ganda, atau normal terbalik akan menyebabkan tekstur checker terpelintir, pemanggangan peta normal (*normal baking*) rusak, serta artefak bayangan hitam pada shader PBR.

---

## 8. Refleksi Praktikum (Poin 106 Modul)

1. **Shortcut Paling Membantu:** Shortcut `I` (Inset) yang dipadukan langsung dengan `E` (Extrude) merupakan kombo paling efisien dalam pemodelan hard-surface, karena memungkinkan pembuatan alur panel mekanikal dalam hitungan detik.
2. **Perbedaan Fundamental Mode:** Pemahaman bahwa Object Mode memanipulasi container/matriks objek secara keseluruhan sedangkan Edit Mode memanipulasi data titik geometris internal adalah konsep kunci grafika yang mencegah kesalahan distorsi skala.
3. **Operasi Termudah:** Operasi Loop Cut (`Ctrl + R`) dan Bevel non-destruktif berbasis Modifier sangat mudah digunakan dan memberikan kepuasan visual instan terhadap kehalusan tepi aset.
4. **Operasi Paling Menantang:** Menjaga alur topologi quad tetap konsisten di sekitar sudut pertemuan panel tanpa menghasilkan n-gon yang tidak terkontrol.
5. **Manfaat Nyata Modifier:** Penggunaan Mirror dan Array Modifier menghemat waktu modeling hingga lebih dari 60%, karena desainer hanya perlu fokus mematangkan satu unit detail kecil untuk menghasilkan pola repetisi yang sempurna.
6. **Isu Topologi yang Ditemukan:** Potensi munculnya vertex ganda saat membatalkan ekstrusi dengan klik kanan dapat diatasi secara disiplin menggunakan `Merge by Distance`.
7. **Pentingnya Apply Scale:** Menjalankan `Ctrl + A` $\to$ Scale harus menjadi refleks wajib sebelum menambahkan modifier apapun untuk memastikan kalkulasi ketebalan matematis selalu akurat.
8. **Rencana Peningkatan:** Pada pertemuan berikutnya, aset ini siap menerima pemberian Seam yang strategis pada alur chamfer bevel untuk memaksimalkan efisiensi UV texel density.

---

## 9. Checklist Verifikasi Pengumpulan (Poin 105 Modul)

- [x] **File `.blend` tersedia:** [`P09_YOLO_SciFiCrate.blend`](./P09_YOLO_SciFiCrate.blend) tersimpan rapi dan dapat dibuka langsung di Blender.
- [x] **Nama object rapi di Outliner:** `Crate_Body`, `Crate_Lid`, `Modular_Handles`, `Front_Armor_Plate`, `Vent_Grille_Array`, `Corner_Reinforcements`.
- [x] **Asset mempunyai silhouette yang jelas:** Terbaca kokoh dari tampilan Front, Side, Top, dan Perspektif.
- [x] **Dokumentasi blockout tersedia:** [`screenshot_blockout.png`](./screenshot_blockout.png).
- [x] **Dokumentasi modeling Inset/Extrude tersedia:** [`screenshot_modeling.png`](./screenshot_modeling.png).
- [x] **Dokumentasi final render tersedia:** [`screenshot_final.png`](./screenshot_final.png).
- [x] **Object Mode & Edit Mode digunakan secara tepat:** Geometri diedit pada level vertex/face, transform objek terpusat.
- [x] **Extrude & Inset diterapkan:** Recessed panels pada seluruh sisi dinding peti.
- [x] **Loop Cut diterapkan:** Pembagian segmen topologi teratur.
- [x] **Bevel diterapkan:** Non-destructive Bevel Modifier pada seluruh edge tajam.
- [x] **Minimal dua Modifier terpenuhi:** Menerapkan 4 modifier (Bevel, Mirror, Array, Solidify).
- [x] **Apply Scale diaplikasikan:** Seluruh objek memiliki scale `(1.0, 1.0, 1.0)`.
- [x] **Topology bersih:** Dilakukan Merge by Distance (0 duplicate vertices) dan Recalculate Normals (`Shift + N`).
- [x] **Minimal dua Challenge diselesaikan:** 6 challenge terselesaikan (Challenge A, B, C, D, G, H).
- [x] **Aset siap dilanjutkan ke Pertemuan 10:** Topologi quad bersih, siap untuk tahap UV Unwrapping dan PBR Texturing.
