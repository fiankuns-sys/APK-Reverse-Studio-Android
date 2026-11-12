# Pembaruan Build 16 — Login ChatGPT langsung

Sesudah menguji UI dan berkas APK, uji Pengaturan → Continue with ChatGPT dengan akun yang secara eksplisit mengizinkan akses. Pastikan browser resmi terbuka, callback berfungsi, model asli termuat, laporan yang disetujui dapat dianalisis, dan token tidak terlihat dalam WebView/log. Tutup dan buka kembali aplikasi, uji sesi terenkripsi, logout, izin dicabut, dan penolakan koneksi. **Jangan** menjalankan pengujian OAuth nyata menggunakan kredensial dari paket source.

---

## Catatan pengujian versi sebelumnya (arsip)

# Tambahan Build 15 — ketahanan tombol Back

Pada emulator Android 35 dan HP fisik: uji Back saat modal terbuka, saat layar Explorer/Job Center aktif, saat halaman baru dibuka dan masih memuat, serta segera setelah aplikasi direstart. Pastikan hanya satu aksi Back terjadi meskipun WebView lambat; bila tidak ada respons dari JavaScript dalam 1,5 detik, Activity tidak boleh tertahan. Catat logcat dan screenshot. Uji regresi lokal `BackNavigationGuardTest.java` telah lulus, tetapi pengujian perangkat **belum dijalankan**.

---

# Tambahan Build 14 — bukti screenshot

Workflow emulator akan gagal bila screenshot portrait masih mendatar, landscape masih tegak, atau screenshot tidak memiliki header PNG yang valid. Ini melengkapi pemeriksaan WebView `UI_READY=true`, bukan menggantikannya. Tes pemrosesan APK sungguhan di emulator masih harus dijalankan terpisah.

---

# Rencana Pengujian Perangkat v1.0

Tujuan: memverifikasi build + perilaku real device, bukan hanya tes mock.

## Build & UI

1. Jalankan GitHub Action `Build Android APK Reverse Studio v1.0`. Pastikan `:app:assembleDebug` berhasil dan artifact benar ada.
2. Install `app-debug.apk` pada perangkat Android 10+ (min SDK 26). Uji portrait, landscape, layar kecil dan 7 tab navigasi bawah tanpa tumpang tindih.
3. Pilih APK latihan milik sendiri. Analisis -> Explorer -> Simbol DEX -> Editor review -> Build receipt. Hasil dan status benar serta tanpa crash.
4. Tutup paksa aplikasi, buka ulang. Catatan, laporan, tampilan Job Center dan patch tetap ada; tidak ada unggah otomatis.
5. Cabut jaringan lalu buka Job Center. Tampilkan data cache lama dan error sinkronisasi dengan jujur.

## Gateway Job

6. Deploy gateway dengan HTTPS + token panjang acak. Otorisasi Codex pada server dengan izin pengguna. Jangan memakai akun atau sesi orang lain.
7. Dari AI Analyst pilih kategori metadata dan buka pratinjau. Batalkan -> tidak ada permintaan jaringan ke `/jobs`.
8. Setujui job -> ID tercatat di server -> Job Center -> status `queued/running/completed` -> Detail hasil dan bukti.
9. Tutup aplikasi sebelum job selesai; buka lagi -> daftar disinkronkan tanpa memulai job baru.
10. Matikan/restart backend di tengah proses dengan fixture Codex tiruan; pastikan running menjadi `interrupted`, queued dapat dilanjutkan.
11. Batalkan job queued; pastikan tidak memanggil Codex. Untuk running, pembatalan hanya akan berlaku setelah runner selesai; UI jangan menyatakan pemanggilan Codex langsung dihentikan.
12. Ubah gateway, putuskan dan hapus data lokal; pastikan cache Android tidak memaparkan job dari gateway lama. Perhatikan job server tidak dihapus dengan tombol lokal.

## Keamanan + skala

13. Uji nama file berisi markup HTML/JS. Semua teks harus ter-escape.
14. Uji token tidak valid, sertifikat TLS tidak valid, redirect, payload terlalu besar dan auth expired; semua gagal aman.
15. Uji puluhan job, batas antrean, DB penuh, storage read-only, dan recovery tanpa kehilangan laporan tersimpan.
16. Uji APK valid beberapa ukuran (100 MB, 1 GB, kemudian lebih besar) pada perangkat yang punya ruang dan memori cukup. Target 40 GB belum dianggap lulus sampai stress test selesai.
17. Lakukan signing nyata dengan Android SDK pada APK latihan terpisah, jalankan `apksigner verify`, dan uji install/launch. Receipt impor di Android bukan bukti verifikasi sendiri.


## Gate tambahan sebelum v1.0 boleh dinyatakan siap perangkat

1. Build debug APK pada GitHub Actions hingga status SUCCESS dan lampiran APK valid.
2. Instal pada Android yang didukung; uji pemilih berkas, izin URI, tampilan portrait/landscape, keyboard, back, Explorer, pindah proyek, dan pemulihan setelah aplikasi ditutup paksa.
3. Konfigurasi gateway HTTPS pada server yang dikelola pengguna, uji autentikasi serta pembaruan token pada URL sama; daftar pekerjaan lama tidak boleh muncul sebelum sinkronisasi ulang.
4. Simulasikan restart server saat job berjalan; metadata input yang terputus tidak boleh tertinggal dalam data job.
5. Lakukan release signing dengan keystore milik pengguna yang tetap; verifikasi `apksigner verify`; instal, ubah data lokal, build pembaruan versionCode yang lebih tinggi dengan kunci sama, dan periksa data tetap ada.
6. Uji APK kecil yang sah milik sendiri dan file besar bertahap; target 40 GB tidak boleh dinyatakan lulus sampai diuji dengan file sesungguhnya.
7. Pastikan tidak ada file `codex-gateway/private-state/jobs.json`, keystore, credential, atau secret dalam ZIP distribusi dan repository.


## Build 12 — pengujian emulator sebelum rilis

Jalankan workflow Actions **Android v1.0 device smoke (emulator)**. Tinjau `portrait.png`, `landscape.png`, `launch-portrait.txt`, `launch-restart.txt`, serta `logcat.txt`. PASS pada workflow dasar tidak membuktikan keyboard, penyimpanan file, analisis APK sungguhan, AI, atau signing berfungsi. Tes pada HP tetap wajib.

Uji transisi proyek: impor APK A, buat catatan, buka receipt A bila tersedia, kemudian pilih APK B. Pastikan catatan dan receipt A tidak muncul pada B. Tutup aplikasi dan buka kembali: proyek B harus tetap proyek aktif selama izin berkas masih valid.

### Fokus Build 13
- Pilih APK A, impor receipt hasil build, lalu buka UI build untuk memastikan catatan terkait A. Ganti ke APK B; receipt A tidak boleh tampil. Impor receipt saat pengguna mengganti proyek; harus ditolak bila impor tertunda.
- Pasang lewat emulator smoke dan periksa `UI_READY=true` setelah launch serta setelah force-stop/restart.
- Periksa folder artifact GitHub: APK debug berada pada root ZIP dan SHA256SUMS.txt cocok dengan file.
