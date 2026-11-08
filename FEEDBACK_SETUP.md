# Feedback system: setup (Vercel)

Dua project Vercel dari repo yang sama, plus satu database Redis (Upstash) di Vercel Marketplace.

| Bagian | Root Directory di Vercel | Isi |
|---|---|---|
| Website utama (game) | `moncade` | game, dan backend di `/api/feedback` (publik) dan `/api/admin-feedback` (butuh token) |
| Admin privat | `moncade/admin` | dashboard feedback. Tidak ada link dari website utama, dan path `/admin` di website utama diblokir (404) |
| Penyimpanan | — | Upstash Redis, dipasang lewat Vercel Marketplace ke project website utama |

Kode backend ada di `api/` (fungsi Vercel) dan `lib/` (logika bersama). Tidak ada dependency npm, jadi tidak perlu `npm install`.

## 1. Database (Upstash Redis)
1. Di dashboard Vercel, buka project **website utama** → **Storage** → **Create/Connect** → **Upstash (Redis)**.
2. Connect ke project website utama. Vercel otomatis mengisi `KV_REST_API_URL` dan `KV_REST_API_TOKEN`. Kode juga menerima `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` kalau kamu pasang langsung.

## 2. Project website utama
1. **Add New → Project**, pilih repo, **Root Directory = `moncade`**.
2. Di **Settings → Environment Variables**, isi:
   - `ADMIN_TOKEN`: minimal 32 karakter acak. Buat dengan `openssl rand -base64 48`. Jangan pernah dikirim lewat chat atau dicommit.
   - `ALLOWED_ORIGINS`: URL project admin, contoh `https://moca-ops-7f3k9q.vercel.app`. Pisahkan dengan koma kalau lebih dari satu.
   - `FEEDBACK_WEBHOOK_URL` (opsional): webhook Discord/Slack. Setiap feedback baru dikirim notifikasi ke sini.
   - `IP_HASH_SALT` (opsional): salt untuk hash IP di rate limit. Kalau kosong, pakai `ADMIN_TOKEN`.
3. Deploy. Cek `https://<website-utama>/api/feedback` dengan GET: harus 405 (berarti fungsi hidup).

## 3. Project admin (privat)
1. **Add New → Project** lagi dari repo yang sama, **Root Directory = `moncade/admin`**. Pilih nama yang tidak gampang ditebak.
2. Edit `admin/config.js`: isi `apiBase` dengan URL website utama (tanpa slash di akhir).
3. Edit `admin/vercel.json`: ganti `YOUR-MAIN-SITE.vercel.app` di `connect-src` dengan domain website utama. Lalu commit dan deploy ulang.
4. Balik ke website utama, pastikan `ALLOWED_ORIGINS` berisi URL admin ini.
5. Disarankan: aktifkan **Deployment Protection / Vercel Authentication** untuk project admin (cek fitur dan batasannya di plan kamu). Dengan begitu ada dua lapis: login Vercel + token admin.

## 4. Pakai
- Buka URL admin, masukkan `ADMIN_TOKEN`. Token hanya disimpan di sessionStorage (hilang saat tab ditutup).
- Dashboard refresh otomatis tiap 30 detik. Judul tab menampilkan jumlah feedback baru.
- Status: **Baru → Dibaca → Selesai**. Feedback bisa dihapus permanen.

## 5. Ganti token
Ganti `ADMIN_TOKEN` di Environment Variables, lalu redeploy. Token lama langsung tidak berlaku.

## Keamanan
- Token dicek dengan perbandingan constant-time (SHA-256 + `timingSafeEqual`), dan token yang kurang dari 32 karakter ditolak.
- Setelah 10 token salah dalam 10 menit dari satu IP, IP itu diblokir sementara (termasuk kalau token-nya benar).
- Endpoint publik: batas ukuran body 8 KB, content-type JSON wajib, honeypot anti-bot, rate limit 5 kiriman / 10 menit per IP, input dibersihkan dari karakter kontrol.
- Rate limit disimpan di Redis, jadi berlaku lintas instance. IP dipakai dalam bentuk hash, tidak pernah disimpan mentah.
- IP diambil dari `x-real-ip` (diisi Vercel), bukan dari entri pertama `x-forwarded-for` yang bisa dipalsukan.
- Memory store ditolak kalau `VERCEL_ENV=production`, jadi data tidak bisa jatuh ke penyimpanan sementara.
- Admin hanya menerima request dari origin di `ALLOWED_ORIGINS` (CORS).
- Dashboard admin render teks pakai `textContent`, jadi isi feedback tidak bisa menjalankan script.
- Admin dikirim `noindex`, `robots.txt` Disallow, CSP ketat, `X-Frame-Options: DENY`.

## Batasan yang perlu tahu
- Daftar feedback di dashboard menampilkan 500 yang terbaru. Angka "semua" juga dihitung dari 500 itu.
- Kode backend (`lib/`, `api/`) bisa dibaca publik, tapi tidak ada rahasia di dalamnya. Rahasia hanya ada di Environment Variables.
- Backend ini dites lokal (17 tes unit, termasuk storage Upstash lewat fake REST). Belum dites di Vercel asli. Setelah deploy pertama, cek: `/api/feedback` GET → 405, kirim feedback dari website, login admin dengan token salah → ditolak, `/admin` di website utama → 404.

## Tes lokal
```
npm test
```
