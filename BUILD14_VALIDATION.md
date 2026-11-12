> **Arsip historis, bukan status terbaru.** Build 16 memakai login ChatGPT langsung tanpa gateway. Baca `TEST_RESULTS.md` untuk status saat ini.

# APK Reverse Studio v1.0 — Build 14: Verifikasi dan batasan

**Tanggal:** 12 November 2026  
**Status:** source stabilisasi siap CI; Android APK siap-install **belum terverifikasi**.

## Perubahan terhadap Build 13

1. `MainActivity.onBackPressed`: tombol Back sekarang memiliki fallback saat WebView belum siap atau sedang ditutup. Hanya hasil JS `true` yang dianggap berhasil menangani navigasi; selain itu Activity dapat menanganinya.
2. Skrip smoke emulator menolak klaim uji landscape bila screenshot sebenarnya masih portrait. Membaca dimensi PNG asli, tanpa OCR ataupun dependensi gambar.
3. Tes orientasi baru mencakup screenshot portrait+landscape yang benar, orientasi macet, dan PNG rusak.
4. `versionCode` 14, `versionName` 1.0.0-stabilized.4; nama artefak CI kini `APK-Reverse-Studio-v1.0-build14-debug`.
5. Pemeriksaan statis v1.0 bertambah menjadi 15 kondisi. Test baru ditambahkan ke workflow debug dan signed release.

## Verifikasi nyata yang sudah dilakukan dalam sesi ini

- Java 21 tersedia; Android SDK dan Gradle **tidak ditemukan**.
- Percobaan koneksi ke sumber distribusi Gradle/Android SDK gagal karena DNS/jaringan lingkungan ini tidak tersedia. Tidak ada APK yang berhasil dikompilasi.
- 7 suite Java inspector dikompilasi menggunakan `javac` dan lulus.
- 8 pengujian Node job gateway lulus.
- 12 pengujian pipeline signing SDK *tiruan* lulus.
- 2 pengujian peluncur JADX offline lulus.
- Test UI dan kontrak bridge lulus (31 native method calls; 7 callbacks).
- Test Apktool/JADX bundle serta validator screenshot lulus.
- 15 pemeriksaan preflight statis, sintaks Bash dan sintaks JS lulus.

## Gerbang untuk menyebut v1.0 siap rilis

1. Build `:app:assembleDebug` **berhasil** dalam GitHub Actions.
2. Verifikasi `apksigner verify` pada APK debug nyata **berhasil**.
3. Instal, tampil, tutup, buka kembali dan uji portrait/landscape pada emulator **berhasil**.
4. Uji pemilihan berkas APK nyata, izin SAF, dan pemulihan laporan setelah restart pada perangkat **berhasil**.
5. Uji login/otorisasi backend Codex yang memang terkonfigurasi dan isolasi data proyek.
6. Build release dengan signing yang sama dan tes upgrade tanpa kehilangan data.
7. Uji bertahap target berkas besar; batas 40 GB belum terverifikasi.

## Alur GitHub Actions

Unggah isi ZIP ke root repository GitHub milik Anda; buka Actions → **Build Android APK Reverse Studio v1.0** → Run workflow. Bila berhasil, unduh artefak `APK-Reverse-Studio-v1.0-build14-debug` (APK dan checksum). Setelah itu jalankan Actions → **Android v1.0 device smoke (emulator)**. Lampirkan log bila ada gagal.

Jangan menganggap keberadaan workflow sebagai bukti workflow tersebut sudah dijalankan.
