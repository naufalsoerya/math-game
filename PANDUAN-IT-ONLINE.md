# Panduan Tim IT: Backend Online Adley's Math Farm

**Untuk:** tim IT yang menyiapkan server agar game bisa dimainkan online oleh banyak keluarga dan sekolah
**Paket:** `adley-math-farm-web-v2.1.0.zip`
**Tanggal:** 9 Oktober 2026

Panduan ini membawa Anda dari server kosong sampai game bisa diakses publik di alamat seperti `https://mathfarm.domain-anda.com`, lengkap dengan fitur Friends online (grup teman, leaderboard, chat, dan kunjungan ke pulau teman). Isinya mencakup ukuran server, instalasi, HTTPS, pengaturan untuk banyak pengguna, operasional harian, keamanan, dan perlindungan data anak.

Istilah teknis sengaja dibiarkan dalam bahasa Inggris supaya sama dengan yang Anda temui di terminal dan di file konfigurasi.

---

## Daftar isi

1. [Gambaran sistem](#1-gambaran-sistem)
2. [Kapasitas dan ukuran server](#2-kapasitas-dan-ukuran-server)
3. [Yang perlu disiapkan](#3-yang-perlu-disiapkan)
4. [Instalasi dengan Docker (direkomendasikan)](#4-instalasi-dengan-docker-direkomendasikan)
5. [HTTPS dengan nginx dan Let's Encrypt](#5-https-dengan-nginx-dan-lets-encrypt)
6. [Cloudflare (opsional, disarankan untuk pengguna banyak)](#6-cloudflare-opsional-disarankan-untuk-pengguna-banyak)
7. [Pengaturan untuk banyak pengguna](#7-pengaturan-untuk-banyak-pengguna)
8. [Membuka akses untuk keluarga dan sekolah](#8-membuka-akses-untuk-keluarga-dan-sekolah)
9. [Operasional harian](#9-operasional-harian)
10. [Keamanan](#10-keamanan)
11. [Privasi dan perlindungan data anak](#11-privasi-dan-perlindungan-data-anak)
12. [Troubleshooting](#12-troubleshooting)
13. [Checklist go-live](#13-checklist-go-live)
14. [Ringkasan perintah](#14-ringkasan-perintah)
15. [Lampiran](#15-lampiran)

---

## 1. Gambaran sistem

Seluruh backend adalah **satu aplikasi Node.js** (`server/server.js`) yang mengerjakan dua hal sekaligus: menyajikan file game (HTML, JavaScript, font, gambar) dan menjalankan API Friends online di path `/api`. Datanya disimpan di **satu file database SQLite**. Tidak ada layanan lain yang perlu dipasang: tidak ada Redis, tidak ada database server terpisah, dan tidak perlu `npm install`.

```
 Perangkat anak (iPad / laptop / HP)
        │  HTTPS
        ▼
 [ Cloudflare ]      ← opsional: CDN + perlindungan DDoS
        │
        ▼
 nginx (port 443)    ← sertifikat HTTPS, redirect HTTP ke HTTPS
        │  http://127.0.0.1:8080
        ▼
 Node.js server.js   ← game + /api  (container Docker "mathfarm")
        │
        ▼
 SQLite math-farm.db ← volume Docker "mathfarm_mathfarm-data"
```

**Yang disimpan di server:** nama game anak, level, bintang, trofi, pakaian dan hewan di game, ringkasan peta pulau, isi chat grup, keanggotaan grup, kunci acak per perangkat (dalam bentuk hash), dan PIN orang tua (dalam bentuk hash PBKDF2).

**Yang tetap di perangkat:** progres game lengkap (tersimpan di browser). Server hanya menerima ringkasannya untuk leaderboard dan kunjungan, dan tidak pernah menulis balik ke perangkat. Kalau server mati, anak tetap bisa bermain; hanya fitur teman yang berhenti sementara.

---

## 2. Kapasitas dan ukuran server

### Hasil uji beban

Kami menguji server dengan simulasi anak yang bermain bersamaan. Setiap anak tiruan melakukan hal yang sama dengan game asli:
- cek kabar terbaru setiap 25 detik
- menyimpan progres setiap 60 detik
- membuka leaderboard sesekali
- kira-kira 20% anak membuka chat: cek pesan setiap 4 detik dan mengirim pesan sekitar setiap 45 detik

Mesin uji: 2 vCPU. Alat simulasinya berjalan di mesin yang sama, jadi angka di bawah ini cenderung konservatif.

- **300 anak bersamaan:** 30 request per detik, tanpa error, 99% jawaban di bawah 5 ms, CPU server sekitar 3% dari satu core, memori 70 MB.
- **2.000 anak bersamaan:** 220 request per detik, tanpa error, 99% jawaban di bawah 3 ms, CPU sekitar 12% dari satu core, memori 108 MB.
- **5.000 anak bersamaan:** 590 request per detik, tanpa error, 99% jawaban di bawah 7 ms (paling lambat 44 ms), CPU sekitar 24% dari satu core, memori 115 MB.
- **Download file game:** 50 download paralel menghasilkan sekitar 8.700 file per detik. Dalam praktik, yang membatasi adalah bandwidth jaringan, bukan servernya.
- **Ukuran database:** setelah 7.300 pemain uji dan sekitar 3.700 pesan chat, database berukuran sekitar 22 MB.

**Cara membaca angka ini:**
- Rata-rata satu anak memakai sekitar 7 request per menit. Anak yang sedang membuka chat memakai sampai sekitar 20 request per menit.
- Perangkat yang baru pertama kali membuka game mengunduh sekitar **430 KB**. Kunjungan berikutnya hampir semuanya diambil dari cache browser.
- Contoh: satu kelas berisi 30 anak yang membuka game di menit yang sama butuh sekitar 13 MB. Ini ringan untuk koneksi server biasa.

### Rekomendasi spesifikasi

- **Mulai (sampai sekitar 2.000 anak bermain bersamaan, atau puluhan sekolah):**
  - 2 vCPU, 2 GB RAM, SSD 20 GB, bandwidth minimal 100 Mbps
  - Ubuntu Server 22.04 atau 24.04 LTS
- **Besar (sampai sekitar 10.000 anak bermain bersamaan):**
  - 4 vCPU, 4 GB RAM, SSD 40 GB
  - Cloudflare di depan server supaya file game disajikan dari CDN
  - Angka 10.000 adalah perkiraan dari tren hasil uji (5.000 anak memakai seperempat core). Ukur ulang dengan alat uji di bagian berikut sebelum mengandalkannya.
- **Lokasi server:** pilih data center yang dekat dengan pengguna (misalnya Jakarta atau Singapura). Pertimbangkan juga aturan transfer data ke luar negeri (lihat bagian 11).

### Batas arsitektur (penting)

- **Hanya satu instance.** Server menyimpan batas request di memori dan database SQLite di satu file. Jangan menjalankan dua container atau dua proses bersamaan pada database yang sama, dan jangan memasang load balancer ke beberapa replika. Untuk menambah kapasitas, besarkan servernya (vertical scaling).
- **Belum ada high availability.** Kalau server mati, fitur teman berhenti sampai server hidup lagi atau dipulihkan dari backup. Data yang bisa hilang paling banyak sejauh jarak dari backup terakhir. Jadwalkan backup tiap jam kalau perlu (bagian 9).
- **Di atas sekitar 10.000 anak bersamaan, atau kalau perlu server cadangan otomatis,** dibutuhkan perubahan kode: database server seperti PostgreSQL dan batas request bersama. Hubungi pengembang sebelum mencapai titik ini.

### Mengukur sendiri

Paket menyertakan alat uji beban. Jalankan **hanya pada instance uji**, karena alat ini membuat grup dan pemain uji di database server tersebut.

```bash
cd server
node tools/loadtest.js --url http://127.0.0.1:8080 --host-key "<HOST_KEY instance uji>" --players 1000 --minutes 3
```

Instance uji harus memakai `TRUST_PROXY=1` dan menerima `X-Forwarded-For` dari mesin itu sendiri, karena setiap anak tiruan diberi alamat buatan.

---

## 3. Yang perlu disiapkan

- [ ] **Server Linux** dengan IP publik dan akses SSH (sudo). Disarankan Ubuntu Server 22.04 atau 24.04 LTS.
- [ ] **Domain atau subdomain**, misalnya `mathfarm.domain-anda.com`:
  - DNS record **A** ke IP server
  - record **AAAA** juga, kalau server punya IPv6
- [ ] **Firewall:** port 80 dan 443 terbuka ke internet. Port 8080 **tidak** dibuka. Docker compose sudah mengikatnya ke `127.0.0.1`.
- [ ] **HOST_KEY:** kunci rahasia minimal 12 karakter. Buat dengan `openssl rand -base64 24`.
- [ ] **Penanggung jawab** untuk backup, monitoring, dan permintaan dari orang tua (lupa PIN, hapus data).
- [ ] **Email admin** untuk Let's Encrypt (pemberitahuan sertifikat).

---

## 4. Instalasi dengan Docker (direkomendasikan)

### 4.1 Siapkan server

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install unattended-upgrades          # update keamanan otomatis
sudo ufw allow OpenSSH
sudo ufw --force enable
```

### 4.2 Pasang Docker

Ikuti panduan resmi di docs.docker.com, atau gunakan script resmi berikut:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker compose version                           # pastikan plugin compose terpasang
```

### 4.3 Upload dan ekstrak paket

```bash
# dari komputer Anda
scp adley-math-farm-web-v2.1.0.zip user@server:/tmp/

# di server
sudo apt -y install unzip
sudo mkdir -p /opt && cd /opt
sudo unzip /tmp/adley-math-farm-web-v2.1.0.zip
sudo mv adley-math-farm-web adley-math-farm
cd /opt/adley-math-farm
sha256sum -c SHA256SUMS.txt | grep -v ': OK$' || true   # tidak ada output = semua file utuh
```

### 4.4 Isi konfigurasi

```bash
sudo cp server/.env.example server/.env
sudo nano server/.env
```

Yang **wajib** diisi:
- `HOST_KEY=` diisi hasil `openssl rand -base64 24`. Placeholder `change-me` sengaja ditolak server.
- `TRUST_PROXY=1` kalau nginx ada di depan (setup di panduan ini). Isi `2` kalau ada Cloudflare **dan** nginx.

Pengaturan lain dijelaskan di [bagian 7](#7-pengaturan-untuk-banyak-pengguna). Contoh `.env` lengkap ada di [lampiran](#151-contoh-serverenv-untuk-produksi-docker).

Catatan untuk Docker: `docker-compose.yml` sudah mengatur `HOST=0.0.0.0` (di dalam container), `DATA_DIR`, `SITE_DIR`, dan `TRUSTED_PROXIES` sendiri. Nilai-nilai ini mengalahkan isi `.env`, jadi tidak perlu diubah.

### 4.5 Jalankan

```bash
cd /opt/adley-math-farm
sudo docker compose up -d --build
sudo docker compose ps                           # status "Up ... (healthy)" setelah sekitar 30 detik
curl -s http://127.0.0.1:8080/api/health
# {"ok":true,"app":"adley-math-farm","version":"2.1.0","friends":true,"canCreate":true}
```

Jika `canCreate` bernilai `false`, berarti `HOST_KEY` kosong, terlalu pendek, atau masih placeholder.

Ringkasnya:
- **Image:** dibangun dari `node:22-bookworm-slim`
- **Nama project compose:** `mathfarm`
- **Volume database:** `mathfarm_mathfarm-data`
- **Restart:** otomatis (`restart: unless-stopped`)
- **Log:** dirotasi otomatis, 5 file × 10 MB

### 4.6 Alternatif tanpa Docker

Butuh Node.js 22.13 atau lebih baru (24 LTS juga bisa). Langkah lengkapnya ada di `README.md` paket (bagian A2) dan di `deploy/mathfarm.service`. Ringkasnya:
- jalankan sebagai user sistem `mathfarm` di `/opt/adley-math-farm/server`
- isi `.env` dengan `HOST=127.0.0.1` dan `TRUSTED_PROXIES=127.0.0.1`
- aktifkan dengan `systemctl enable --now mathfarm`

---

## 5. HTTPS dengan nginx dan Let's Encrypt

### 5.1 Pasang nginx dan certbot

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
sudo ufw allow 'Nginx Full'
```

### 5.2 Buat konfigurasi situs

Buat file `/etc/nginx/sites-available/mathfarm` dan ganti domainnya:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mathfarm.domain-anda.com;

    client_max_body_size 100k;          # game hanya mengirim JSON kecil

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mathfarm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 5.3 Pasang sertifikat HTTPS

```bash
sudo certbot --nginx -d mathfarm.domain-anda.com --redirect -m admin@domain-anda.com --agree-tos
sudo certbot renew --dry-run                     # cek perpanjangan otomatis
```

Certbot menambahkan blok HTTPS (port 443) dan redirect dari HTTP ke HTTPS. Perpanjangan sertifikat berjalan otomatis lewat timer systemd.

### 5.4 Tambahkan HSTS (setelah HTTPS terbukti jalan)

Di blok `server` port 443 yang dibuat certbot, tambahkan baris berikut, lalu `sudo nginx -t && sudo systemctl reload nginx`:

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
```

Header keamanan lainnya (Content-Security-Policy, nosniff, dan seterusnya) sudah dikirim oleh server Node, jadi tidak perlu ditambahkan di nginx.

### 5.5 Uji dari luar

```bash
curl -s https://mathfarm.domain-anda.com/api/health
curl -sI https://mathfarm.domain-anda.com/ | grep -i -E "strict-transport|content-security|cache-control"
```

Lalu buka alamatnya di browser. Layar judul "Adley's Math Farm" harus tampil, dan tombol 👫 muncul setelah menekan **Let's play!**

**Game di sub-folder** (misalnya `https://domain-anda.com/mathfarm/`): ganti `location /` menjadi `location /mathfarm/` dan `proxy_pass http://127.0.0.1:8080/;`. Garis miring di akhir keduanya penting.

---

## 6. Cloudflare (opsional, disarankan untuk pengguna banyak)

Cloudflare memberi tiga keuntungan:
- file game disajikan dari CDN yang dekat dengan pengguna
- perlindungan dari serangan DDoS
- IP server tersembunyi

Langkahnya:

1. **DNS:** aktifkan proxy (ikon awan oranye) untuk record domain game.
2. **SSL/TLS mode:** pilih **Full (strict)**.
3. **Sertifikat di server:** gunakan **Cloudflare Origin Certificate**.
   - Buat di dashboard: SSL/TLS → Origin Server.
   - Pasang di nginx pada `ssl_certificate` dan `ssl_certificate_key`.
   - Cara ini lebih sederhana daripada memperpanjang Let's Encrypt di belakang proxy Cloudflare.
4. **Konfigurasi server:** ubah `TRUST_PROXY=2` di `server/.env`, lalu `sudo docker compose up -d --force-recreate`. Rantainya: Cloudflare → nginx → Node.
5. **Cache:**
   - Cloudflare otomatis menyimpan file `.js`, `.css`, `.woff2`, dan `.png` sesuai header `Cache-Control` dari server. Halaman HTML dan `/api` tidak disimpan.
   - Supaya lebih pasti, buat **Cache Rule**: URI path diawali `/api/` → **Bypass cache**.
6. **Opsional, mengunci server:**
   - Izinkan port 443 hanya dari daftar IP Cloudflare (cloudflare.com/ips) di firewall server.
   - Setelah itu, akses langsung ke IP server tidak bisa lagi.

---

## 7. Pengaturan untuk banyak pengguna

Semua pengaturan ada di `server/.env`. Setelah mengubahnya, jalankan `sudo docker compose up -d --force-recreate` (atau `sudo systemctl restart mathfarm` tanpa Docker).

**Wajib dan keamanan:**
- **`HOST_KEY`:** kunci untuk membuat grup baru. Berikan hanya kepada penggagas grup yang dipercaya, misalnya orang tua penggagas atau guru wali kelas.
  - Satu kunci bisa dipakai banyak penggagas.
  - Mengganti kunci tidak memengaruhi grup yang sudah ada.
  - Kosongkan kalau ingin menutup pembuatan grup baru.
- **`TRUST_PROXY`:** jumlah proxy di depan server.
  - `1` = nginx
  - `2` = Cloudflare + nginx
  - `0` = tanpa proxy
- **`TRUSTED_PROXIES`:** alamat proxy yang dipercaya untuk header `X-Forwarded-For`.
  - Docker: biarkan seperti di `docker-compose.yml`.
  - Tanpa Docker: isi `127.0.0.1`.

**Kapasitas per grup:**
- **`MAX_GROUP_SIZE`** (bawaan 40): jumlah pemain per grup. Satu kelas muat dalam satu grup.
- **`MAX_WAITING`** (bawaan 10): anak yang boleh menunggu persetujuan host pada saat yang sama, per grup. **Naikkan ke 40 kalau satu kelas join bersamaan.**

**Batas request (perlindungan dari penyalahgunaan):**
- **`RATE_LIMIT_PER_MINUTE`** (bawaan 600): request per menit dari satu alamat internet.
  - Sekolah atau kantor biasanya memakai satu alamat publik untuk semua perangkat (NAT).
  - Hitung **20 × jumlah anak yang bermain bersamaan dari jaringan itu**. Contoh: satu sekolah dengan 150 anak bermain bersamaan → `3000`.
  - Dengan bawaan 600, sekitar 30 anak bisa membuka chat bersamaan dari satu alamat.
- **`WRONG_CODE_LIMIT`** (bawaan 12): kode undangan salah yang diizinkan per alamat per 15 menit. Ini melindungi kode dari tebakan. Kode yang benar tidak dihitung, jadi satu kelas tetap bisa join dari jaringan sekolah yang sama.

**Data:**
- **`CHAT_RETENTION_DAYS`** (bawaan 180): pesan chat yang lebih lama dari ini dihapus otomatis. Sesuaikan dengan kebijakan privasi Anda.
- **`DATA_DIR`:** folder database. Tidak boleh berada di dalam folder `site`; server akan menolak start.

**Lainnya:**
- `WEEK_TZ_OFFSET_MINUTES=420`: zona waktu leaderboard mingguan (WIB)
- `NOINDEX=1`: minta mesin pencari tidak mengindeks situs
- `LOG_REQUESTS=0`: satu baris log per request API untuk debugging (isi chat tidak pernah ditulis ke log)

**Kalau anak-anak di satu sekolah sering mendapat "Too many requests":**
1. Pertama, pastikan `TRUST_PROXY` benar. Kalau nilainya `0` padahal ada nginx, semua anak di seluruh dunia terhitung sebagai satu alamat (alamat nginx).
2. Baru setelah itu naikkan `RATE_LIMIT_PER_MINUTE`.

---

## 8. Membuka akses untuk keluarga dan sekolah

### Alur

1. **Tim IT** memberikan `HOST_KEY` kepada penggagas lewat jalur aman: diserahkan langsung, password manager, atau pesan yang terhapus otomatis. Jangan dibagikan di grup chat.
2. **Penggagas** (orang tua atau guru) membuat grup dari perangkat anaknya:
   - 👪 → jawab soal perkalian → **👫 Friends settings** → **Start a new friend group**
   - isi nama grup, host key, nama game anak, dan **PIN orang tua** (4–6 angka)
   - game memberi **kode undangan**, misalnya `ABCD-2345`
3. **Penggagas** membagikan kode dan alamat website kepada orang tua lain. Template pesan ada di [lampiran 15.2](#152-template-pesan-untuk-orang-tua).
4. **Setiap orang tua** join dari perangkat anaknya sendiri, dengan PIN mereka sendiri.
5. **Penggagas** menekan **Say yes** untuk setiap anak di menu **Waiting to join**. Sebelum disetujui, anak tidak bisa melihat apa pun dari grup.
6. **Setiap keluarga** mengatur izin anaknya dengan PIN masing-masing: tampil di leaderboard, boleh dikunjungi, dan boleh chat.

### Tips untuk sekolah

- Buat **satu grup per kelas** (maksimal 40 anak). Guru atau perwakilan orang tua bertindak sebagai host.
- Kalau satu kelas join bersamaan, set `MAX_WAITING=40`. Minta orang tua join dalam rentang waktu tertentu, lalu host menyetujui sekaligus.
- Hitung `RATE_LIMIT_PER_MINUTE` untuk jaringan sekolah (bagian 7).
- **Gunakan satu alamat website yang final sejak awal.** Progres anak tersimpan per alamat website. Pindah domain atau dari http ke https membuat progres mulai dari nol.
- Untuk iPad, minta orang tua membuka game di Safari lalu **Share → Add to Home Screen**. Safari bisa menghapus data situs yang lama tidak dibuka, dan ikon di Home Screen mencegah hal itu.

### Layanan untuk orang tua (dikerjakan tim IT)

Semua perintah dijalankan di folder paket. Dengan Docker, awali dengan `sudo docker compose exec mathfarm`.

- **Lupa PIN orang tua:**
  - cari ID pemain dengan `node admin.js members <KODE>`
  - lalu `node admin.js reset-pin <ID> <PIN-baru>`
- **Perangkat host hilang:** `node admin.js make-host <ID pemain lain di grup>`
- **Anak berperilaku tidak pantas:**
  - host bisa menghapus pesan dan mengeluarkan anak dari menu Friends settings
  - tim IT bisa memakai `node admin.js remove <ID>`
- **Membaca chat untuk investigasi:** `node admin.js chat <KODE> 7` menampilkan 7 hari terakhir, termasuk pesan yang terblokir (digit nomor disamarkan).
- **Permintaan hapus data anak:** `node admin.js purge <ID>` menghapus pemain beserta seluruh pesannya secara permanen. Catat tanggal dan pemohonnya.
- **Kode undangan bocor:** `node admin.js new-code <KODE>`. Host juga bisa melakukannya sendiri di game.

---

## 9. Operasional harian

### Monitoring

- **Uptime check:**
  - pasang di layanan monitoring Anda (UptimeRobot, Better Stack, Zabbix, Prometheus blackbox, dan sejenisnya)
  - cek ke `https://mathfarm.domain-anda.com/api/health` setiap 1–5 menit
  - jawaban sehat mengandung `"ok":true`
- **Status container:** `sudo docker compose ps`. Container punya healthcheck sendiri.
- **Log:** `sudo docker compose logs -f --tail 100`. Isi chat tidak pernah ditulis ke log.
- **Disk:** `df -h` dan `sudo docker system df`. Database tumbuh pelan (sekitar 22 MB untuk 7.300 pemain), dan chat lama terhapus otomatis.
- **Sertifikat:** `sudo certbot certificates`. Perpanjangan berjalan otomatis.

### Backup

Paket menyertakan dua script:
- `deploy/backup.sh` membuat salinan yang konsisten **tanpa menghentikan server** (memakai `VACUUM INTO`), lalu mengompresnya dan menghapus salinan lama.
- `deploy/restore.sh` mengembalikan salinan. Server berhenti beberapa detik, dan database saat itu disimpan sebagai `math-farm.db.before-restore`.

Jadwalkan backup harian dengan `sudo crontab -e`:

```cron
15 2 * * *  cd /opt/adley-math-farm && sh deploy/backup.sh /var/backups/mathfarm 30 >> /var/log/mathfarm-backup.log 2>&1
```

- Ganti `15 2 * * *` dengan `15 * * * *` untuk backup **setiap jam**.
- **Salin juga ke luar server** (server lain atau cloud storage) dengan `rsync` atau `rclone`, misalnya setiap hari setelah backup lokal. Backup yang hanya ada di server yang sama tidak menolong kalau server itu rusak.

Cara mengembalikan backup:

```bash
cd /opt/adley-math-farm
sudo sh deploy/restore.sh /var/backups/mathfarm/math-farm-2026-10-09-021500.db.gz
```

**Uji restore sebulan sekali** di server uji. Script backup dan restore ini sudah diuji: data yang dibuat setelah backup memang hilang setelah restore, dan server kembali sehat.

### Update versi

1. Backup dulu: `sudo sh deploy/backup.sh /var/backups/mathfarm 30`.
2. Ekstrak paket baru ke folder baru, misalnya `/opt/adley-math-farm-2.2`.
3. Salin konfigurasi lama ke folder baru: `cp /opt/adley-math-farm/server/.env /opt/adley-math-farm-2.2/server/.env`.
4. Hentikan container lama: `cd /opt/adley-math-farm && sudo docker compose down`.
5. Jalankan dari folder baru: `cd /opt/adley-math-farm-2.2 && sudo docker compose up -d --build`. Volume database tetap sama, karena nama project compose selalu `mathfarm`.
6. Cek `/api/health` (versi baru tampil) dan lakukan uji singkat.

Untuk **rollback**, jalankan langkah 4–5 dengan folder lama. Baca catatan rilis dulu: kalau versi baru mengubah struktur database, kembalikan juga backup dari langkah 1.

Waktu henti saat update hanya beberapa detik, dan anak tetap bisa bermain selama itu.

### Perawatan bulanan

- Bangun ulang image untuk patch keamanan Node.js: `sudo docker compose build --pull && sudo docker compose up -d`.
- Cek log backup dan lakukan uji restore.
- Cek kapasitas: CPU, RAM, dan disk.

---

## 10. Keamanan

Checklist hardening:

- [ ] Hanya port 22 (SSH), 80, dan 443 yang terbuka. Port 8080 hanya di `127.0.0.1`.
- [ ] SSH memakai key. Login dengan password dan login root langsung dimatikan.
- [ ] `unattended-upgrades` aktif. Docker dan image diperbarui berkala.
- [ ] HTTPS dengan redirect dari HTTP, dan HSTS aktif.
- [ ] `HOST_KEY` panjang dan acak, hanya diketahui penggagas, dan diganti kalau bocor.
- [ ] `TRUST_PROXY` dan `TRUSTED_PROXIES` sesuai topologi (bagian 7). Kalau salah:
  - nilai terlalu rendah: semua pengguna terhitung satu alamat
  - nilai terlalu longgar: alamat bisa dipalsukan
- [ ] Backup terenkripsi atau disimpan di lokasi yang aksesnya terbatas, dan ada salinan di luar server.
- [ ] `admin.js` hanya bisa dijalankan lewat SSH. Tidak ada panel admin yang terbuka di web.
- [ ] Header keamanan muncul saat dicek dengan `curl -sI` (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy).

**Yang sudah ada di aplikasi:**
- **Konten dan request:**
  - Content-Security-Policy ketat (tanpa inline script)
  - tanpa cookie, sehingga kebal CSRF
  - semua query database memakai prepared statement
  - batas ukuran request
  - batas request per alamat, per pemain, dan untuk tebakan kode atau kunci yang salah
- **PIN orang tua:**
  - disimpan sebagai hash PBKDF2
  - 5 kali salah → terkunci 15 menit, dan tebakan paralel juga tertahan
- **Pembatasan akses:**
  - grup tertutup satu sama lain
  - header `X-Forwarded-For` hanya dipercaya dari proxy yang dikenal
  - server menolak start kalau `HOST_KEY` masih placeholder atau folder data berada di dalam folder situs
- **Pemeriksaan:** kode server dan filter sudah ditinjau tiga putaran oleh pemeriksa independen untuk celah keamanan dan keselamatan anak.

---

## 11. Privasi dan perlindungan data anak

Para pemain adalah anak-anak. Di Indonesia, **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi** Pasal 25 mengatur bahwa pemrosesan data pribadi anak diselenggarakan secara khusus dan **wajib mendapat persetujuan orang tua dan/atau wali anak**. Masa penyesuaian UU ini berakhir 17 Oktober 2024.

Bagaimana sistem ini mendukung kewajiban tersebut:

- **Persetujuan orang tua:** anak tidak bisa bergabung sendiri. Proses join dilakukan orang tua di balik soal perkalian dan **PIN orang tua**, dan pilihan izin (leaderboard, kunjungan, chat) ditentukan saat itu juga. Tambahkan pemberitahuan privasi singkat untuk orang tua (lihat saran di bawah).
- **Data minimum:**
  - tidak ada nama asli, foto, lokasi, email, atau nomor telepon
  - nama game dipilih orang tua, dengan batas karakter dan filter
- **Chat aman:**
  - filter menolak kata kasar, link, nomor telepon, email, akun media sosial, alamat, nama sekolah, serta permintaan data pribadi dan ajakan bertemu
  - orang tua bisa membaca riwayat chat
  - chat bisa dimatikan per anak
- **Masa simpan otomatis:**
  - chat 180 hari (bisa diubah)
  - notifikasi 30 hari
  - permintaan join yang tidak disetujui 14 hari
  - data pemain yang keluar tanpa pesan 7 hari
- **Hak hapus:** `node admin.js purge <ID>` menghapus data seorang anak secara permanen. Keluarga juga bisa keluar dari grup sendiri lewat menu Friends settings.

**Saran untuk organisasi Anda:**
- Siapkan pemberitahuan privasi singkat untuk orang tua: data apa yang disimpan, untuk apa, berapa lama, siapa yang bisa membaca chat, dan alamat kontak untuk permintaan hapus data.
- Catat siapa yang memegang akses server dan akses ke backup.
- Pertimbangkan lokasi server dan aturan transfer data pribadi ke luar wilayah Indonesia.
- **Bagian ini bukan nasihat hukum.** Konfirmasikan kebutuhan kepatuhan dengan tim legal atau DPO Anda.

---

## 12. Troubleshooting

- **Tombol 👫 tidak muncul di game**
  - Penyebab: browser tidak bisa menjangkau `/api/health` di alamat yang sama dengan game. Misalnya hanya folder `site/` yang di-upload ke hosting statis, proxy belum meneruskan `/api`, atau path sub-folder salah.
  - Cek: buka `https://domain/api/health` di browser. Kalau game ada di sub-folder, cek `https://domain/mathfarm/api/health`.
- **`canCreate: false` di health check**
  - Penyebab: `HOST_KEY` kosong, kurang dari 12 karakter, atau masih placeholder.
  - Solusi: isi `HOST_KEY`, lalu `docker compose up -d --force-recreate`.
- **Banyak "Too many requests. Please wait a minute."**
  - Penyebab: `TRUST_PROXY` salah, atau banyak anak berada di belakang satu alamat sekolah.
  - Solusi: perbaiki `TRUST_PROXY` dulu, lalu naikkan `RATE_LIMIT_PER_MINUTE` (bagian 7).
- **"Many children are already waiting to join this group."**
  - Solusi: host menyetujui dulu permintaan yang menunggu, atau naikkan `MAX_WAITING`.
- **"Too many tries. Please wait 15 minutes…" saat join**
  - Penyebab: terlalu banyak kode salah dari satu alamat.
  - Solusi: periksa kode (huruf I, L, O, angka 0, dan 1 tidak pernah dipakai dalam kode), tunggu 15 menit, atau naikkan `WRONG_CODE_LIMIT`.
- **Orang tua terkunci setelah salah PIN**
  - Penyebab: 5 kali salah PIN.
  - Solusi: tunggu 15 menit, atau gunakan `admin.js reset-pin` kalau PIN benar-benar lupa.
- **502 Bad Gateway dari nginx**
  - Penyebab: container mati atau sedang start.
  - Cek: `sudo docker compose ps` dan `sudo docker compose logs --tail 50`.
- **Server tidak mau start: "DATA_DIR must not be inside SITE_DIR"**
  - Solusi: pindahkan folder data ke luar folder `site`.
- **Server tidak mau start: "made by an early test version"**
  - Penyebab: database berasal dari versi uji awal.
  - Solusi: pindahkan file `math-farm.db` lama, lalu start ulang.
- **Pesan chat seorang anak tidak terkirim**
  - Penyebab: pesan ditolak filter (anak melihat alasannya), chat dimatikan orang tua, atau anak mengirim terlalu cepat.
  - Cek: orang tua membuka riwayat chat dengan PIN untuk melihat pesan yang terblokir.
- **Progres anak hilang setelah pindah alamat website**
  - Penyebab: progres tersimpan per alamat di browser.
  - Solusi: gunakan satu alamat final sejak awal.

---

## 13. Checklist go-live

1. [ ] Server, domain, DNS, dan firewall siap (bagian 3).
2. [ ] `server/.env` terisi: `HOST_KEY`, `TRUST_PROXY`, dan pengaturan kapasitas (bagian 7).
3. [ ] `docker compose up -d --build` berjalan, dan status container `healthy`.
4. [ ] HTTPS aktif dengan redirect, plus HSTS.
5. [ ] `https://domain/api/health` menampilkan `"ok":true` dan `"canCreate":true`.
6. [ ] Uji dua perangkat:
   - buat grup, lalu join dengan perangkat lain
   - host menyetujui
   - leaderboard menampilkan kedua anak
   - pesan "Hi! 👋" sampai ke perangkat lain
   - pesan berisi nomor telepon ditolak
   - kunjungan pulau dan cheer ❤️ berjalan
7. [ ] Uji di iPad asli: Safari, suara, tombol 🔊, dan Add to Home Screen.
8. [ ] Uptime monitoring aktif ke `/api/health`.
9. [ ] Cron backup aktif, salinan ke luar server berjalan, dan satu kali uji restore berhasil.
10. [ ] Pemberitahuan privasi untuk orang tua siap, dan kontak untuk permintaan hapus data jelas.
11. [ ] `HOST_KEY` sudah diserahkan kepada penggagas pertama lewat jalur aman.
12. [ ] Kalau pengguna banyak: Cloudflare aktif dan `TRUST_PROXY=2` (bagian 6).

---

## 14. Ringkasan perintah

```bash
cd /opt/adley-math-farm

# menjalankan dan memantau
sudo docker compose up -d --build                 # start / setelah update
sudo docker compose up -d --force-recreate        # setelah mengubah server/.env
sudo docker compose ps                            # status
sudo docker compose logs -f --tail 100            # log
curl -s http://127.0.0.1:8080/api/health          # health check lokal

# admin (awali dengan: sudo docker compose exec mathfarm)
node admin.js groups                              # semua grup
node admin.js members ABCD-2345                   # anggota grup + ID
node admin.js approve <ID> | remove <ID>          # setujui / keluarkan
node admin.js reset-pin <ID> <PIN>                # lupa PIN orang tua
node admin.js make-host <ID>                      # pindahkan host
node admin.js rename <ID> <nama>                  # ubah nama game
node admin.js chat ABCD-2345 7                    # baca chat 7 hari
node admin.js new-code ABCD-2345                  # kode undangan baru
node admin.js purge <ID>                          # hapus data anak permanen
node admin.js delete-group ABCD-2345              # hapus grup

# backup dan restore
sudo sh deploy/backup.sh /var/backups/mathfarm 30
sudo sh deploy/restore.sh /var/backups/mathfarm/<file>.db.gz

# uji beban (HANYA di instance uji)
node server/tools/loadtest.js --url http://127.0.0.1:8080 --host-key "<kunci uji>" --players 1000
```

---

## 15. Lampiran

### 15.1 Contoh `server/.env` untuk produksi (Docker)

```dotenv
HOST_KEY=hasil-openssl-rand-base64-24-di-sini
PORT=8080
TRUST_PROXY=1                 # 2 jika Cloudflare + nginx
CHAT_RETENTION_DAYS=180
MAX_GROUP_SIZE=40
MAX_WAITING=40                # satu kelas bisa join bersamaan
RATE_LIMIT_PER_MINUTE=3000    # sekolah dengan sampai 150 anak bermain bersamaan dari satu alamat
WRONG_CODE_LIMIT=12
WEEK_TZ_OFFSET_MINUTES=420
NOINDEX=1
HSTS=0                        # HSTS sudah dikirim nginx
LOG_REQUESTS=0
# HOST, DATA_DIR, SITE_DIR dan TRUSTED_PROXIES diatur oleh docker-compose.yml
```

### 15.2 Template pesan untuk orang tua

> Halo Ayah/Bunda 👋
>
> Anak-anak bisa bermain **Adley's Math Farm** bersama teman-teman: game matematika kelas 1 dengan leaderboard, chat yang aman, dan saling mengunjungi pulau.
>
> **Cara bergabung (dilakukan oleh orang tua, sekitar 2 menit):**
> 1. Buka **https://mathfarm.domain-anda.com** di perangkat anak (iPad: Safari → Share → *Add to Home Screen*, lalu buka dari ikon itu).
> 2. Tekan **Let's play!**, lalu tombol **👪** di kanan atas, dan jawab soal perkaliannya.
> 3. Tekan **👫 Friends settings** → **Join a friend group**.
> 4. Masukkan kode undangan: **ABCD-2345**, nama game anak (cukup nama panggilan), dan **PIN orang tua** pilihan Ayah/Bunda (4–6 angka, mohon diingat).
> 5. Pilih izin untuk anak: tampil di leaderboard, boleh dikunjungi teman, dan boleh chat. Semua bisa diubah kapan saja dengan PIN.
> 6. Tunggu saya menyetujui, lalu anak bisa melihat teman-temannya lewat tombol **👫**.
>
> Chat menyaring kata kasar, link, nomor HP, alamat, dan nama sekolah. Ayah/Bunda bisa membaca riwayat chat anak di menu Friends settings dengan PIN.

### 15.3 Isi paket yang relevan untuk tim IT

- `PANDUAN-IT-ONLINE.md`: dokumen ini
- `README.md`: referensi teknis lengkap, termasuk setup tanpa server (hanya game)
- `docker-compose.yml`, `Dockerfile`, `.dockerignore`: deploy dengan Docker
- `server/`: server Node.js
  - `server.js`, `db.js`, `filter.js`, `admin.js`
  - `.env.example`
  - `test/`: 29 tes otomatis, jalankan dengan `npm test`
  - `tools/loadtest.js`: uji beban
- `deploy/`
  - `backup.sh`, `restore.sh`: backup dan restore
  - `nginx-friends.conf.example`: contoh nginx
  - `mathfarm.service`: setup tanpa Docker
  - `static-only/`: setup tanpa fitur teman
- `site/`: file game

### 15.4 Referensi

- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (teks pasal): https://pasal.id/peraturan/uu/uu-no-27-tahun-2022
- Docker Engine di Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Certbot untuk nginx: https://certbot.eff.org/
- Daftar IP Cloudflare: https://www.cloudflare.com/ips/
