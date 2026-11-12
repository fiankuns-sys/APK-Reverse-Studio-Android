# Riset Lua PC → Android: Static Analysis untuk APK Reverse Studio v1.0

**Cakupan:** analisis source Lua secara read-only pada proyek yang dimiliki/berizin, peta dependensi, kompatibilitas platform, risiko integrasi, dan peningkatan kecerdasan berbasis bukti. Bukan alat untuk menjalankan skrip cheat, injeksi proses, menghindari proteksi, atau mengubah game daring.

**Status sumber:** tautan forum UnknownCheats yang diberikan pengguna tidak dapat dibuka secara langsung pada sesi riset. Karena itu tidak ada klaim bahwa isi postingan tertentu, kode persisnya, lampiran atau kompatibilitasnya telah diverifikasi. Temuan tentang proyek riset PC lain bersifat *pembanding*, tidak otomatis menggambarkan postingan tersebut.

## Kesimpulan inti

Perpindahan Lua dari Windows ke Android harus dianalisis dalam *empat lapisan* yang terpisah:

1. **Sintaks Lua:** apakah skrip mengikuti versi bahasa yang tersedia pada target?
2. **Modul dan API host:** apakah `require`, tabel global, SDK internal, dan fungsi yang dipanggil benar-benar tersedia pada target? Lua hanyalah bahasa tertanam; host menentukan API dan hak akses.
3. **Arsitektur native:** kode mesin Windows x64/DLL tidak bisa disalin begitu saja menjadi Android ELF `.so` ber-ABI `arm64-v8a`. Titik integrasi native bergantung pada platform dan versi.
4. **Batas runtime dan layanan:** sandbox Android, integritas paket, verifikasi server, serta kebijakan penggunaan game mengubah apa yang dapat berjalan walaupun sintaks Lua sama.

**Tidak ada bukti yang memadai untuk mengklaim satu skrip PC dapat langsung dijalankan pada versi Android Where Winds Meet.**

## Peta komponen yang perlu dikenali aplikasi

| Artefak | Analisis aman | Klaim yang tidak boleh dibuat otomatis |
|---|---|---|
| `.lua` | Baca teks UTF-8, tokenisasi, fungsi, dependensi, simbol, petunjuk path | Skrip kompatibel dengan Android |
| `.luac` / bytecode Lua | Kenali format umum secara read-only, catat bytecode, ukuran/hash jika diizinkan | Bytecode bisa ditransfer lintas runtime atau direkonstruksi sempurna |
| `.dll` / `.exe` | Identifikasi sebagai berkas PE/Windows dalam inventaris | Dapat di-load sebagai Android `.so` |
| `.so` | Identifikasi header ELF, ABI, dependensi native dasar | Kode sumber C/C++ tersedia |
| `.py` / `.js` | Cari dependensi dan peran otomasi pemilik proyek | Dapat berinteraksi dengan semua proses Android |
| APK/DEX | Manifest, permission, struktur, method, library dan resource | Isi runtime game daring sudah sepenuhnya diketahui |

## Temuan berdasarkan referensi resmi

**Lua 5.4.** Lua mempunyai runtime dan API C, tetapi *precompiled chunks* tidak dijamin kompatibel di versi Lua berbeda. Kode biner yang tidak tepercaya juga tidak boleh dieksekusi sebagai bagian dari analisis. Referensi: https://www.lua.org/manual/5.4/manual.html

**Android NDK.** Android menyediakan ABI `arm64-v8a`, `armeabi-v7a`, `x86`, dan `x86_64`. Tiap library native harus cocok dengan ABI target; porting DLL Windows bukan pergantian ekstensi. Referensi: https://developer.android.com/ndk/guides/abis

**APK Analyzer.** Perangkat resmi Android dapat memeriksa Manifest, DEX, resource, dan berkas di paket tanpa menyimpulkan perilaku runtime. Referensi: https://developer.android.com/tools/apkanalyzer

**Tree-sitter.** Untuk peningkatan setelah lexer awal, parser AST dapat dipakai mengidentifikasi konstruksi yang lebih kompleks dan pemulihan dari sintaks rusak. Referensi: https://tree-sitter.github.io/tree-sitter/ dan https://github.com/tree-sitter-grammars/tree-sitter-lua

**Aturan layanan.** Ketentuan Where Winds Meet membatasi penggunaan cheat dan perangkat pihak ketiga yang tidak diizinkan; audit yang diusulkan tidak menyertakan fungsi tersebut. Referensi: https://www.wherewindsmeetgame.com/termsofuse.html

## Sistem kecerdasan yang diimplementasikan

**Build 18: Lua Static Inspector**
- Impor berkas `.lua` atau `.txt` lewat Android Storage Access Framework atau input browser lokal.
- Batas baca 256 KiB dan panjang source 80.000 karakter; validasi UTF-8 dan penolakan NUL/bytecode.
- Lexer terbatas: komentar panjang/satu baris, string, identifier, dan tanda baca.
- Pencarian deklarasi fungsi, modul literal `require`, indikasi API pemuatan dinamis, I/O, dan referensi native **tanpa mengeksekusinya**.
- Bukti jalur Windows dan Unix/Android hanya sebagai indikator, bukan diagnosis portabilitas.
- Tampilan baris/jenis temuan, batasan dan pesan ketidakpastian.
- Pratinjau sebelum mengirim ringkasan terpilih ke ChatGPT. Sumber penuh **tidak otomatis dikirim**.
- Profil `Lua Script Engineering` menjadi skill ke-14; sumber asli dibiarkan tidak berubah.

**Bukan** AST lengkap, debugger runtime, bytecode decompiler, interpreter Lua, pengimpor arsip game proprietary, reverse engineering engine khusus, atau alat pembuat cheat Android.

## Desain analisis yang lebih dalam (roadmap)

1. Parser AST Lua, terisolasi, dengan informasi lokasi sumber dan error recovery.
2. **Symbol graph:** definisi, parameter, fungsi anonim, lexical scope dan penggunaan global.
3. **Module graph:** literal `require` → modul yang ada → modul tidak ditemukan → dependensi dinamis. Tandai ketidakpastian pada pemanggilan tidak langsung.
4. **API surface diff:** inventaris API pada source PC dan dokumen target Android yang diperoleh secara sah; hasil `cocok`, `tidak ditemukan`, `tidak dapat dipastikan`.
5. **Version/bytecode detector:** kenali teks vs bytecode tanpa mengeksekusi atau mencoba menguraikan bytecode tak dikenal.
6. **Cross-language inventory:** hubungan *yang terbukti* antara aset Lua, Java/Kotlin DEX, JNI, ELF, dan konfigurasi. Jangan menyimpulkan relasi hanya karena berkas berada dalam APK yang sama.
7. **AI evidence report:** tiap klaim memerlukan `artifact_path`, `line`, `observed_fact`, `hypothesis`, `limitation`, `test_to_validate`. Cegah klaim palsu tentang sukses porting.
8. **Sumber dan keamanan:** cek lisensi/izin akses, isolasi input, batas sumber, hash dan identitas proyek, sanitasi HTML, serta tanpa koneksi eksternal sebelum consent.
9. **Pengujian:** dataset Lua 5.1–5.4 dari kode yang boleh dipakai, contoh sintaks rusak, komentar yang memuat teks menipu, path Windows, file Unicode, dan input besar.
10. **Performa:** streaming dan hashing untuk file besar, pemrosesan blok terbatas, pembatalan, dan indeks hasil tanpa ekstraksi tidak terkendali.

## Keputusan kompatibilitas PC → Android

Gunakan matriks tri-state:
- **Sesuai pada tingkat sintaks:** hanya jika versi Lua dan grammar sudah diperiksa secara sah.
- **Belum terbukti:** dependensi atau API target belum tersedia sebagai bukti.
- **Tidak kompatibel pada tingkat platform:** Windows PE/DLL dan API Windows tertentu tidak dapat dijalankan langsung pada Android sebagai library native.

Ketika ditemukan referensi khusus engine/game proprietari, tampilkan *membutuhkan dokumentasi/izin dan bukti target*, bukan mengajarkan penambalan runtime ataupun penghindaran proteksi.

## Uji rilis

- `node --check app/src/main/assets/skill-intelligence.js`
- `node --check app/src/main/assets/lua-static-inspector.js`
- `node tools/skill-intelligence.test.js`
- `node tools/lua-static.test.js`
- `node tools/smoke-test.js`
- `node tools/bridge-contract.test.js`
- GitHub Actions `:app:assembleDebug`, `apksigner verify`, pemeriksaan file APK dan checksum.
- Uji perangkat fisik, impor SAF dan login AI nyata **belum diklaim selesai** hanya dari pengujian source/CI.

### Catatan hukum dan etika
Aplikasi tidak mengoperasikan game, tidak mengubah APK Where Winds Meet dan tidak mengotomatisasi cheat. Gunakan kode yang dimiliki atau izin tertulis untuk diaudit.
