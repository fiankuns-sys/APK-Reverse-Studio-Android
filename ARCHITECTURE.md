# APK Reverse Studio v1.0 — arsitektur saat ini

## Lapisan Android (lokal)

`MainActivity` memuat HTML/JS lokal (WebView), memeriksa APK/ZIP/ZIP64, Manifest biner, DEX, metadata resources, ELF, signature block, CRC, dan kategori arsip APK bersarang sesuai batas parser. Data sumber asli tetap dipertahankan. Workspace JADX dan Apktool menyimpan patch secara terpisah; aplikasi Android **belum** menjalankan decompiler penuh atau signing Android SDK secara lokal.

## Lapisan identitas dan AI langsung (tanpa gateway pribadi)

`ChatGptDirectClient` berjalan native dalam Android, bukan di JavaScript:

- Browser sistem → OAuth `authorization_code` dengan PKCE S256 → loopback `127.0.0.1` dengan state/nonce yang diperiksa.
- Verifikasi JWT identitas terhadap JWKS resmi dan scope `chatgpt.tokens.use.direct`.
- Token disimpan terenkripsi dengan Android Keystore. UI hanya menerima indikator status yang telah disanitasi, tanpa token.
- `GET /v1/models` menampilkan model yang tersedia, `POST /v1/responses` meminta analisis setelah pratinjau data, memakai `store: false`.
- Permintaan AI hanya mengirim kategori metadata terpilih; tidak otomatis mengunggah APK biner, file pribadi, atau seluruh proyek.
- Riwayat AI adalah **data lokal WebView**, bukan riwayat percakapan ChatGPT.

**Tidak ada gateway AI pribadi, server antrean Job Center, atau API key yang dibutuhkan untuk permintaan AI langsung.** Ini bukan sinkronisasi ChatGPT Chats atau Codex Cloud. Kelayakan OSS dan izin pengguna diperlukan. Proses file berat atau build APK tetap terpisah dan dapat dijalankan dengan tool offline di komputer yang dipilih pemilik proyek.

## Build APK Studio & signed output

GitHub Actions (Android SDK 35, AGP 8.7.3, Gradle 8.9) disediakan untuk kompilasi Studio. Workflow signed menggunakan keystore yang dikonfigurasi sendiri lewat GitHub Secrets, menjalankan zipalign, apksigner, dan verify. Pipeline untuk APK hasil patch berjalan terpisah pada komputer yang memiliki Apktool dan Android SDK.

## Status validasi

Pengujian Java source, JS UI, kebijakan OAuth dan pipeline signing tiruan lulus. **Belum ada APK Studio hasil kompilasi, uji otorisasi ChatGPT langsung, atau uji instalasi ponsel dalam sesi ini.**

Baca `DIRECT_CHATGPT_OAUTH.md` untuk detail, privasi, dan batasan.
