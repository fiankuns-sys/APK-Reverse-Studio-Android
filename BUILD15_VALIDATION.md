> **Arsip historis, bukan status terbaru.** Build 16 memakai login ChatGPT langsung tanpa gateway. Baca `TEST_RESULTS.md` untuk status saat ini.

# APK Reverse Studio v1.0 — Build 15: hasil audit dan verifikasi

**Tanggal:** 12 November 2026  
**Status:** revisi source v1.0; **belum** menjadi rilis APK yang terbukti dapat diinstal.

## Perubahan terhadap Build 14

1. Menambahkan watchdog **1.500 ms** pada tombol Back Android: bila callback JavaScript dari WebView sama sekali tidak dipanggil, Activity tetap menerima fallback navigasi.
2. Memindahkan keputusan eksekusi Back satu kali ke `BackNavigationGuard`, modul Java kecil yang diuji terpisah. Callback JavaScript dan watchdog tidak dapat melakukan navigasi ganda.
3. Permintaan lama menjadi tidak aktif ketika ada Back baru atau Activity dihancurkan.
4. Menambah `BackNavigationGuardTest` dengan skenario callback duluan, timeout duluan, request kedaluwarsa, Activity hancur, dan **250 percobaan concurrent race**.
5. Mengintegrasikan uji BackGuard ke workflow build debug, build signed, dan smoke emulator. Menambahkan script `tools/run-local-validation.sh` agar tes source dapat diulang satu perintah.
6. `versionCode 15`, `versionName 1.0.0-stabilized.5` serta nama artefak debug `APK-Reverse-Studio-v1.0-build15-debug`.

## Pengujian yang benar-benar dijalankan

| Pengujian | Hasil |
| --- | --- |
| Preflight sumber/kontrak dasar | 17/17 PASS |
| Uji Java parser ZIP/Manifest/DEX/JADX/Apktool | 7 suite PASS |
| BackNavigationGuard (termasuk race 250 kali) | PASS |
| UI smoke + bridge | PASS — 31 pemanggilan native, 7 callback |
| Gateway API/queue | 8/8 PASS |
| Signing pipeline dengan alat SDK tiruan | 12/12 PASS |
| JADX launcher | 2/2 PASS |
| Workflow Apktool, bundle JADX, orientasi PNG | PASS |
| Sintaks JavaScript & shell | PASS |
| Integritas ZIP final | Diperiksa pada proses pengemasan |

**Tidak dilakukan / belum dapat diklaim:** build `:app:assembleDebug` dengan Android SDK, instalasi pada emulator/HP, `apksigner verify` terhadap APK sungguhan, koneksi akun Codex yang sesungguhnya, penandatanganan kunci nyata, serta stress test berkas 40 GB.

## Mengapa APK belum dihasilkan di sesi ini?

Lingkungan pembuatan saat ini memiliki JDK tetapi **tidak mempunyai Android SDK, Gradle executable, `aapt2`, atau `apksigner`**. Permintaan HTTP ke distribusi Gradle gagal karena DNS/network tidak tersedia (`Could not resolve host: services.gradle.org`). Oleh karena itu kami **tidak** menyebut tes Java biasa sebagai tes kompilasi Android.

## Langkah rilis berikutnya yang bisa dibuktikan

1. Masukkan seluruh isi ZIP Build 15 ke root repository khusus APK Reverse Studio.
2. Jalankan workflow `Build Android APK Reverse Studio v1.0` di GitHub Actions; periksa `:app:assembleDebug`, `apksigner verify`, serta checksum. Jika gagal, gunakan log kompilasi untuk memperbaiki source.
3. Jalankan `Android v1.0 device smoke (emulator)` dan unduh screenshot portrait/landscape, `UI_READY=true`, serta logcat.
4. Uji APK nyata dengan sistem SAF di ponsel, editor dan penyimpanan setelah restart, serta jaringan gateway yang sudah diotorisasi secara terpisah.
5. Pastikan signed release memakai keystore tetap dan verifikasi peningkatan versi tanpa menghapus data, serta uji input besar secara bertahap.

**Syarat untuk menyatakan v1.0 selesai:** build APK + instalasi emulator + uji utama perangkat berhasil. Belum terpenuhi.
