# Integrasi ChatGPT langsung — v1.0 Build 16 (prototipe)

**Perubahan:** APK Reverse Studio sekarang menyiapkan otorisasi **Sign in with ChatGPT** untuk aplikasi open-source yang memenuhi syarat. Ini menggantikan seluruh antarmuka dan kode _Codex Gateway_ pribadi dari build sebelumnya. Tidak ada URL gateway, token gateway, ataupun API key dalam aplikasi.

## Cara kerjanya

1. Di Android, buka **Pengaturan → Continue with ChatGPT**. Browser sistem membuka halaman otorisasi OpenAI (bukan form tiruan di WebView).
2. Native Android membuat PKCE S256, `state`, `nonce` acak, dan menerima callback lewat loopback `http://127.0.0.1:<port>/auth/callback` dari browser yang sama pada perangkat. Callback diverifikasi, dengan batas waktu.
3. Kode ditukar dengan token di endpoint resmi. Identitas JWT diperiksa menggunakan kunci publik JWKS OpenAI, algoritme RS256, issuer, audience, nonce, dan masa berlaku.
4. Kredensial terenkripsi AES-GCM menggunakan **Android Keystore**; token tidak disalurkan ke UI JavaScript atau disimpan di source.
5. Aplikasi memuat daftar model yang memang tersedia untuk sesi terotorisasi, lalu mengirim analisis menggunakan endpoint resmi `POST /v1/responses` dengan `stream: true` dan `store: false` setelah pengguna melihat dan menyetujui konteks. Pembaruan token dilakukan lewat refresh token jika diizinkan.
6. Hasil ringkas dan pertanyaan bisa disimpan **lokal** pada perangkat. Tombol putuskan akun menghapus token dari penyimpanan aplikasi; ini bukan mekanisme penghapusan akun atau riwayat ChatGPT.

## Apa yang tersinkron, dan apa yang tidak?

- **Bisa:** akses/izin model ChatGPT yang memenuhi ketentuan untuk digunakan oleh aplikasi secara langsung melalui OpenAI; memakai akun yang dipilih pada browser resmi.
- **Tidak otomatis:** daftar obrolan aplikasi ChatGPT, ChatGPT Memory, file ChatGPT, Codex Cloud workspace, perubahan repo GitHub, atau proyek APK di perangkat lain. Riwayat AI APK Reverse Studio disimpan pada `localStorage` WebView sehingga tidak otomatis dicadangkan atau terenkripsi khusus.
- Pengguna harus meninjau dan **menyetujui setiap konteks** yang dikirim; APK/ZIP 40 GB **tidak** dikirim langsung ke AI.

## Batasan verifikasi

- Implementasi ini **belum diuji** dengan akun ChatGPT sungguhan, server OpenAI OAuth langsung, maupun instalasi APK pada perangkat fisik.
- Mekanisme ini ditujukan bagi **aplikasi open-source lokal yang memenuhi syarat**; ketersediaan dan persyaratan pendaftaran dapat berubah. Aplikasi yang tidak memenuhi syarat atau akun tanpa izin yang diperlukan harus menampilkan kesalahan.
- Proyek ini belum otomatis dipublikasikan sebagai repositori publik atau diberi lisensi open-source yang disepakati pemiliknya.
- Untuk beban reverse engineering besar, kemampuan pemrosesan lokal berbeda dengan kemampuan AI; tidak ada backend remote baru yang dibangun pada perubahan ini.
- Logout **menghapus token dari perangkat**; belum dibuktikan melakukan pencabutan token di sisi server secara permanen.
- Hindari memasukkan password, kunci signing, token, atau data pribadi dalam APK/metadata yang dipilih. Pilih hanya data yang memang boleh dibagikan.

## Pengujian

`bash tools/run-local-validation.sh`

Pengujian source meliputi status UI, model sintetis, persetujuan pengiriman, tidak adanya token di JS, regresi parser/editor, serta 13 pengujian policy OAuth native pure-Java. Tes ini **tidak setara** dengan instalasi, kompilasi Gradle, tes jaringan, atau akun riil.

## Rujukan resmi

- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/codex/sdk
