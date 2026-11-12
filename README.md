# APK Reverse Studio v1.0 — Direct ChatGPT OAuth (Build 16)

Proyek **Android source** untuk analisis struktur APK, editor patch Smali/XML/JADX dan pratinjau build/signing offline, dengan login ChatGPT resmi melalui browser sistem. **Belum ada APK yang berhasil dikompilasi, instalasi perangkat, atau koneksi akun ChatGPT nyata yang diverifikasi.**

## Perubahan dari Build 15

- Hilangkan seluruh modul _Codex Gateway_ pribadi (server Node, URL/token gateway, dan Job Center server).
- Tambahkan login **Sign in with ChatGPT** dengan OAuth PKCE, callback loopback, validasi ID JWT JWKS, dan token yang dienkripsi dalam Android Keystore.
- Pemilihan model dari akun yang sudah diberi izin dan analisis langsung memakai Responses API (opt-in, `store: false`).
- **Riwayat Analisis Lokal** menggantikan Job Center remote; hasilnya **tidak** muncul otomatis di percakapan aplikasi ChatGPT.
- Desain dark premium, fitur inspeksi APK, penjelajah DEX, source editor, dan workflow build offline dipertahankan.

[Lihat penjelasan cara kerja, privasi, batasan, dan syarat OSS](DIRECT_CHATGPT_OAUTH.md).

## Cara menggunakan saat APK sudah berhasil dibangun

1. Pasang APK yang dihasilkan GitHub Actions dari **source ini**.
2. Pada **Pengaturan**, pilih **Continue with ChatGPT**, lalu setujui di browser resmi OpenAI.
3. Setelah status akun menunjukkan izin AI aktif, tekan **Muat Model** (atau tunggu katalog selesai diperbarui).
4. Pilih APK yang Anda berhak analisis, tekan **Analisis Struktur APK**.
5. Di **AI Analyst**, masukkan pertanyaan, centang kategori data yang boleh dikirim, lalu **Tinjau & Analisis**.
6. Periksa isi metadata yang akan dibagikan, tekan **Saya setuju**. Hasil tersimpan di **Riwayat AI** pada perangkat.

Login adalah permintaan otorisasi nyata, bukan cara mengakses sesi akun ChatGPT tanpa persetujuan. Ketersediaan direct API bergantung pada kelayakan integrasi dan izin akun. Tidak ada sinkronisasi riwayat ChatGPT.

## Tes source tanpa Android SDK

```bash
bash tools/run-local-validation.sh
```

## Menghasilkan APK dengan GitHub Actions

1. Buat repository GitHub untuk proyek ini dan unggah seluruh isi ZIP ke root repository.
2. Jalankan **Actions → Build Android APK Reverse Studio v1.0**.
3. Apabila `assembleDebug` dan verifikasi APK berhasil, unduh artifact debug. Jika gagal, periksa artifact log diagnostik Gradle.
4. Jalankan **Actions → Android v1.0 device smoke (emulator)** untuk memeriksa launch, restart, orientasi, dan kesiapan WebView.
5. Jika ingin build signed yang dapat diperbarui, gunakan workflow release dengan empat secret `APKR_KEYSTORE_BASE64`, `APKR_KEYSTORE_PASSWORD`, `APKR_KEY_PASSWORD`, `APKR_KEY_ALIAS` **yang Anda konfigurasi sendiri**. Kunci tidak pernah disertakan di source.

## Komponen dan batasan

Inspektor ZIP/ZIP64, Manifest, DEX, resources.arsc, ELF, signing block, dan CRC memberikan metadata sesuai batas parser. Bundle JADX/Apktool diedit sebagai patch terpisah; dekompilasi penuh dan build/signing langsung di Android **belum** terintegrasi. Target file 40 GB **belum** menjalani stres tes di perangkat nyata.

Gunakan proyek ini hanya untuk aplikasi yang Anda miliki atau yang Anda berhak audit dan modifikasi.
