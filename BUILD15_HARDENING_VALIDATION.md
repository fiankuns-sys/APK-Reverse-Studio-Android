> **Arsip historis, bukan status terbaru.** Build 16 memakai login ChatGPT langsung tanpa gateway. Baca `TEST_RESULTS.md` untuk status saat ini.

# APK Reverse Studio v1.0 — Build 15 Hardening Validation

Tanggal: 12 November 2026.

## Perubahan yang benar-benar dibuat

1. Token gateway HTTPS yang sebelumnya tersimpan tidak dapat digunakan kembali jika origin/URL gateway berubah, kecuali pengguna memasukkan token baru secara eksplisit.
2. Tujuh tes Java SDK-free untuk pemisahan token antarorigin.
3. Pemeriksaan origin ditambahkan ke tiga workflow GitHub Actions dan skrip validasi lokal.
4. Build workflow mengunggah `build-output/gradle.log` (bila ada), termasuk ketika kompilasi gagal.

## Yang telah diuji secara lokal

- `bash tools/run-local-validation.sh` (parser, editor, backend antrean, UI contract, signing dengan alat tiruan, tes keamanan gateway, back guard).
- Parse YAML tiga workflow GitHub Actions.
- Pemeriksaan integritas arsip source ZIP.

## Yang TIDAK diuji

- Android Gradle build: alat Android SDK/Gradle tidak tersedia, akses ke layanan pengunduhan SDK juga gagal.
- Emulator/perangkat fisik: belum tersedia pada lingkungan ini.
- Login Codex, signing APK produksi, dan file input 40 GB: belum diuji end-to-end.
- Chromium headless screenshot: timeout.

Tidak ada klaim bahwa APK Android sudah siap instal. Ini adalah source v1.0 Build 15 yang diperkeras, tanpa penambahan versi fitur.
