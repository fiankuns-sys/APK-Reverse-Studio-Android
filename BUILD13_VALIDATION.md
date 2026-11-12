> **Arsip historis, bukan status terbaru.** Build 16 memakai login ChatGPT langsung tanpa gateway. Baca `TEST_RESULTS.md` untuk status saat ini.

# APK Reverse Studio v1.0 — Build 13 (validasi)

**Status: release candidate sumber, belum APK siap rilis.** Peningkatan Build 13 memperbaiki dua jalur yang berisiko pada v1.0 Build 12 tanpa memperluas fitur ke v1.1.

## Perbaikan utama

1. **Receipt build dikaitkan dengan proyek**. Metadata binding privat menyimpan `sourceSelectedAt`. Import receipt ditolak saat proyek aktif berubah. Saat pengguna menghapus atau mengganti APK, receipt dan binding dihapus. Receipt yang diimpor sebelum Build 13 perlu diimpor ulang karena sebelumnya tidak mempunyai bukti pengaitan proyek. Receipt tetap **tidak** merupakan bukti kriptografis di ponsel; pemeriksaan sebenarnya memerlukan APK dan `apksigner verify`.
2. **WebView readiness handshake**. Setelah `index.html` selesai dimuat, Android mengecek keberadaan `window.StudioUI` dan konten layar utama, lalu menulis sinyal terbatas `UI_READY=true` atau `UI_READY=false` ke log. Teks berkas APK, kredensial, dan metadata tidak dicatat pada log ini.
3. **Pengujian emulator lebih ketat**. Workflow gagal jika aplikasi hanya hidup tetapi UI JavaScript tidak siap. Ia tetap memeriksa peluncuran portrait, perubahan orientasi, restart, screenshot dan crash. Pengujian emulator belum dijalankan di lingkungan ini.
4. **Artefak debug lebih mudah ditemukan**. Workflow memverifikasi tanda tangan debug dan package ID, lalu membuat artefak berisi `APK-Reverse-Studio-v1.0-build13-debug.apk` dan `SHA256SUMS.txt` langsung pada root ZIP hasil Actions. Tidak ada APK di paket source yang disertakan dalam percakapan.
5. **Versi upgrade**. `versionCode 13`, `versionName 1.0.0-stabilized.3`, package ID `id.reverselab.studio` dipertahankan. Perangkat hanya dapat memperbarui instalasi lama jika signing key kompatibel.

## Hasil pengujian lokal

| Pengujian | Status |
| --- | --- |
| Java inspector ZIP, AXML, DEX, ELF, nested APK, JADX dan Apktool | PASS (7 suite) |
| UI/WebView logic dan kontrak bridge | PASS |
| Gateway dan antrean job | PASS (8 kasus) |
| Signing pipeline dengan alat SDK tiruan | PASS (12 kasus) |
| JADX offline dan Apktool patch workflows | PASS |
| Static Build 13 preflight | PASS (13 pemeriksaan) |
| Syntax Bash dan JavaScript | PASS |
| Gradle `:app:assembleDebug` | **BELUM DIJALANKAN** (Android SDK/Gradle tidak tersedia di lingkungan ini) |
| `apksigner` nyata dan pemeriksaan package | **BELUM DIJALANKAN** |
| Instalasi emulator/Android fisik | **BELUM DIJALANKAN** |
| Codex dengan otorisasi nyata | **BELUM DIJALANKAN** |
| Input 40 GB | **BELUM DIUJI** |

## Cara mendapatkan bukti build Android

1. Buat atau pilih **repository khusus proyek ini**, lalu ekstrak isi ZIP Build 13 ke root repository.
2. Pada GitHub Actions jalankan `Build Android APK Reverse Studio v1.0`.
3. Buka artefak `APK-Reverse-Studio-v1.0-build13-debug`; di dalamnya tersedia APK dan checksum **hanya apabila workflow berhasil**.
4. Jalankan `Android v1.0 device smoke (emulator)` dan buka artefak `v1.0-emulator-smoke-evidence` untuk screenshot serta log `UI_READY=true`.
5. Uji Android fisik menggunakan dokumen `DEVICE_TEST_PLAN.md` (file picker, input keyboard, pembacaan APK, restart, permission, dll.).

## Yang belum diimplementasikan

- Dekomplikasi Java/Smali penuh langsung di ponsel dan pemrosesan backend APK mentah. Jalur JADX/Apktool/build masih offline pada komputer/server.
- Login otomatis memakai sesi ChatGPT pada aplikasi Android. Gateway hanya dapat mengakses Codex bila server telah diotorisasi secara sah.
- Sertifikasi untuk input 40 GB atau proses rebuild hasil modifikasi tanpa komputer/server.

**Catatan:** Status `PASS` pada uji lokal **tidak** membuktikan keberhasilan APK Android; keputusan rilis tetap memerlukan hasil build dan uji emulator yang sebenarnya.
