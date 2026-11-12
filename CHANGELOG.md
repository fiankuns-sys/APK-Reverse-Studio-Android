# APK Reverse Studio — Change Log

## v1.0 Build 16 — ChatGPT Direct OAuth (12 November 2026)

- Mengganti seluruh jalur server _Codex Gateway_ dengan **Sign in with ChatGPT** OAuth untuk aplikasi OSS yang memenuhi syarat.
- Menambah native `ChatGptDirectClient`: browser sistem, callback loopback, PKCE, state/nonce, verifikasi JWT via JWKS, penyimpanan terenkripsi Android Keystore, refresh token, daftar model, dan permintaan analisis direct Responses API.
- Menambah `DirectAuthPolicy` serta 13 tes keamanan callback/scope/model.
- Mengubah layar AI Analyst dan Pengaturan dengan status login langsung dan pilihan model; memastikan data yang akan dikirim ditinjau dan disetujui terlebih dahulu.
- Mengganti server Job Center dengan **Riwayat Analisis Lokal**, tidak terhubung dengan riwayat percakapan ChatGPT.
- Menghapus `codex-gateway` dan `AiGatewayClient`, serta mengganti tes/workflow yang sebelumnya membutuhkan gateway.
- Mempertahankan inspeksi APK dan editor patch serta desain UI sebelumnya; `versionCode=16`.

**Batasan:** hanya source dan tes mock yang diverifikasi. Tidak ada akun OAuth sungguhan atau APK terkompilasi yang diuji.

Lihat `DIRECT_CHATGPT_OAUTH.md` dan `RELEASE_READINESS.md`.
