# Adley's Math Farm — website package (version 2.1, with Friends online)

A 3D math adventure game for Grade 1 (JISMO Grade 1 topics, 50 island levels, 18 math farms, 7 bonus games), now with **Friends online**: a friend group with invite codes, a leaderboard, island visits with cheer stickers, and a filtered group chat.

---

## Ringkasan singkat (Bahasa Indonesia)

1. Paket ini berisi **game** (folder `site/`) dan **server teman** (folder `server/`) untuk fitur Friends online: leaderboard, chat, dan kunjungan ke pulau teman.
2. Cara paling mudah: **Docker** di server Linux/VPS: `docker compose up -d --build`, lalu **nginx** (atau Apache/Caddy) untuk HTTPS di depannya. Tanpa Docker juga bisa: Node.js 22.13+ dan systemd. Tidak perlu `npm install`.
3. Sebelum mulai, salin `server/.env.example` menjadi `server/.env` dan isi **HOST_KEY** (rahasia, minimal 12 karakter). HOST_KEY hanya diberikan ke orang tua yang membuat grup (Ibu G!).
4. Kalau hanya meng-upload folder `site/` ke hosting statis, game tetap bisa dimainkan, tapi tombol 👫 Friends tidak muncul.
5. Data grup dan chat tersimpan di database SQLite (volume Docker `mathfarm-data` atau folder `server/data`). **Backup rutin.**
6. Setelah deploy, jalankan **checklist tes** di bagian [After deploying: test checklist](#after-deploying-test-checklist).
7. Panduan lengkap untuk membuka game ke banyak keluarga dan sekolah (kapasitas, HTTPS, Cloudflare, backup, operasional) ada di **PANDUAN-IT-ONLINE.md**.

---

## What is in this package

```
adley-math-farm-web/
├── README.md                 this guide
├── VERSION.txt               version and build id
├── SHA256SUMS.txt            checksums of every shipped file
├── Dockerfile                container for the game + friends server
├── docker-compose.yml        one-command start with Docker
├── .dockerignore
├── site/                     the game itself (HTML, CSS, JavaScript, fonts, icons, three.js)
├── server/                   the friends server (Node.js, no npm packages needed)
│   ├── server.js             web server: game files + /api for friends
│   ├── db.js                 SQLite database (built into Node.js)
│   ├── filter.js             chat and name filter (English + Indonesian)
│   ├── admin.js              command-line tool for the IT team
│   ├── package.json          "npm test" runs the server tests
│   ├── .env.example          settings: copy to .env and fill in
│   └── test/                 automated tests
└── deploy/
    ├── nginx-friends.conf.example   nginx (HTTPS) in front of the friends server
    ├── mathfarm.service             systemd service (set-up without Docker)
    └── static-only/                 settings for set-up B (game only, no friends)
```

- No external requests at runtime: three.js and the fonts are included. No cookies, analytics or ads.
- The friends server needs **no npm packages**: it uses Node.js's built-in HTTP server and SQLite.

---

## Choose a set-up

| | A. Game + Friends online (recommended) | B. Game only |
|---|---|---|
| What runs | The Node.js server serves the game **and** the friends API | Any static web hosting serves `site/` |
| Needs | A Linux server or VPS with Docker, or Node.js 22.13+ (24 LTS fine) | Any web hosting, cPanel, S3, Netlify… |
| Friends online | Yes: leaderboard, chat, island visits | No: the 👫 button stays hidden |
| Follow | Section A | Section B |

---

## A. Game + Friends online

### A1. With Docker (simplest)

```bash
# on the server, in the unzipped package folder
cp server/.env.example server/.env
nano server/.env                      # set HOST_KEY (and check TRUST_PROXY, see the settings table)
docker compose up -d --build
curl -s http://127.0.0.1:8080/api/health   # -> {"ok":true,"app":"adley-math-farm",...,"canCreate":true}
```

The container listens only on `127.0.0.1:8080`. Put nginx in front for HTTPS (A3). The database lives in the Docker volume `mathfarm-data`.

### A2. Without Docker (Node.js + systemd)

```bash
# Node.js 22.13 or newer (node -v). No npm install is needed.
sudo mkdir -p /opt/adley-math-farm && sudo cp -r site server /opt/adley-math-farm/
sudo useradd --system --home /opt/adley-math-farm --shell /usr/sbin/nologin mathfarm
sudo mkdir -p /opt/adley-math-farm/server/data && sudo chown -R mathfarm: /opt/adley-math-farm/server/data
sudo cp /opt/adley-math-farm/server/.env.example /opt/adley-math-farm/server/.env && sudo nano /opt/adley-math-farm/server/.env
sudo cp deploy/mathfarm.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now mathfarm
curl -s http://127.0.0.1:8080/api/health
```

Optional self-test before going live: `cd /opt/adley-math-farm/server && npm test` (uses a temporary database; 29 tests).

### A3. HTTPS in front (nginx)

Use `deploy/nginx-friends.conf.example`: it forwards everything (game files and `/api`) to `127.0.0.1:8080`. Change the domain and certificate paths, then `nginx -t && systemctl reload nginx`. Apache or Caddy work the same way (reverse proxy to port 8080, pass `X-Forwarded-For`).

The game can also live in a sub-folder (`https://example.com/mathfarm/`); the example file shows the two lines to change.

### Settings (`server/.env`)

| Setting | Default | What it does |
|---|---|---|
| `HOST_KEY` | *(empty: new groups off)* | Secret needed once by the grown-up who **starts** a friend group. At least 12 characters; the placeholder is refused on purpose. Give it only to that grown-up. |
| `PORT` / `HOST` | `8080` / `127.0.0.1` | Where the server listens. Keep `127.0.0.1` when nginx is on the same machine. (Docker sets `0.0.0.0` inside the container and still only opens `127.0.0.1:8080`.) |
| `TRUST_PROXY` | `1` in the example | Number of proxies in front: 0 none, 1 nginx/Apache/Caddy, 2 Cloudflare + nginx. Needed so limits use each visitor's real address. |
| `TRUSTED_PROXIES` | *(empty)* | Exact proxy addresses whose `X-Forwarded-For` is believed. Empty = only this machine or a private network. |
| `DATA_DIR` | `data` | Database folder (`math-farm.db`). Must not be inside the `site` folder (the server refuses to start). **Back it up.** |
| `SITE_DIR` | `../site` | The game files. |
| `CHAT_RETENTION_DAYS` | `180` | Chat messages older than this are deleted automatically. |
| `MAX_GROUP_SIZE` | `40` | Players per friend group. |
| `MAX_WAITING` | `10` | Children waiting for the host's yes at the same time, per group (40 when a whole class joins at once). |
| `RATE_LIMIT_PER_MINUTE` | `600` | Requests per minute from one internet address. Allow about 20 per child when many children share one school or office address. |
| `WRONG_CODE_LIMIT` | `12` | Wrong invite codes per address per 15 minutes (protects codes from guessing). |
| `WEEK_TZ_OFFSET_MINUTES` | `420` | Time zone for the weekly leaderboard (Jakarta = 420). |
| `NOINDEX` | `1` | Ask search engines not to index the site (recommended for a family game). |
| `HSTS` | `0` | Send Strict-Transport-Security from Node (the nginx example already sends it). |
| `LOG_REQUESTS` | `0` | One log line per API request (chat text is never logged). |

### Starting the friend group (for the family)

1. The IT team gives the **HOST_KEY** to the grown-up who starts the group.
2. On that child's device: **👪 → answer the question → 👫 Friends settings → Start a new friend group**. Fill in the group name, the host key, the child's game name and a **grown-up PIN** (4 to 6 numbers). The game shows an **invite code** like `ABCD-2345`.
3. Share the invite code only with families you know. Each family opens the game on **their own child's device**, goes to **👪 → 👫 Friends settings → Join a friend group**, and types the code, a game name and their own grown-up PIN.
4. The host sees each request under **Waiting to join** and taps **Say yes**. Nobody can see the group before that.
5. Each family chooses for their own child: show on the leaderboard, friends can visit the island, chat with friends. These settings, the chat history and leaving the group need that family's grown-up PIN.

### Running it day to day

- **Health check** for monitoring: `GET /api/health` returns `{"ok":true,...}`.
- **Logs**: `docker compose logs -f` or `journalctl -u mathfarm -f`.
- **Backups** (the database is small):
  - Docker: `sh deploy/backup.sh /var/backups/mathfarm 30` makes a consistent copy while the server keeps running and keeps 30 days (put it in cron). `sh deploy/restore.sh <file>` puts a copy back. The database volume is called `mathfarm_mathfarm-data`.
  - Without Docker: `cd /opt/adley-math-farm/server && node admin.js backup /var/backups/mathfarm/math-farm-$(date +%F).db`.
- **Admin tool** (run in the `server` folder, or `docker compose exec mathfarm node admin.js …`):

  | Command | Use it when |
  |---|---|
  | `node admin.js groups` | See all friend groups |
  | `node admin.js members ABCD-2345` | See the players of a group (with their ids) |
  | `node admin.js reset-pin <id> <PIN>` | A family forgot their grown-up PIN |
  | `node admin.js make-host <id>` | The host's device was lost; make another player the host |
  | `node admin.js approve <id>` / `remove <id>` | Approve or remove a player |
  | `node admin.js rename <id> <name>` | Change a game name |
  | `node admin.js chat ABCD-2345 7` | Read the last 7 days of a group's chat, including blocked attempts |
  | `node admin.js new-code ABCD-2345` | Make a new invite code |
  | `node admin.js delete-group ABCD-2345` | Delete a group and everything in it |
  | `node admin.js purge <id>` | A family asks for their child's data to be deleted (player and all messages) |
  | `node admin.js backup [file]` | Make a consistent copy of the database |

- **Extra blocked words**: put words or phrases, one per line, in `DATA_DIR/extra-blocked-words.txt` and restart the server.
- **Updating**: unzip the new package next to the old one, copy `server/.env` across, then `docker compose up -d --build` in the new folder (the fixed project name `mathfarm` keeps the same database volume) or `systemctl restart mathfarm`.
- **Capacity test**: `node server/tools/loadtest.js --url http://127.0.0.1:8080 --host-key … --players 1000` simulates many children on a *test* instance (it creates test groups).

### Child safety and security, in short

- **Nobody joins by accident**: a group needs the host key to start, an invite code to ask, and the host's "yes" to enter. Codes are 8 random characters; guessing is rate-limited. Groups are sealed from each other.
- **Grown-up controls** (per child, protected by that family's PIN; 5 wrong tries lock the settings for 15 minutes): leaderboard on/off, island visits on/off, chat on/off, chat history, leaving the group. The host approves, removes and renames players and can remove any message.
- **Chat filter** (server side, so it cannot be skipped): unkind and rude words in English and Indonesian (also with look-alike letters, symbols, spaces or stretched letters), links, phone numbers (also in pieces or written as words), emails, usernames and social media handles, home addresses and school names, and **asking** another child for these, for a photo or to meet up. A blocked message is never shown to other children; the child sees a friendly reason; the child's own grown-up can see the attempt (digits hidden). Messages are limited in length and speed. Everyday game talk stays allowed: sums like "6 + 6 = 12", scores, "aku punya anjing".
- **Visits are look-only**: a visitor cannot take coins, open chests, play puzzles or change anything. A visit only shows the friend's island map, farms, outfit and animals.
- **Data kept**: game name, level, stars, trophies, outfit, animals, island map summary, the chat (180 days by default), and each device's random key. No real names, photos, location, email or phone. Grown-up PINs are stored only as salted PBKDF2 hashes.
- **Web security**: strict Content-Security-Policy (no inline scripts), no cookies, all API requests carry a device key in a header (no CSRF), prepared SQL statements, request size and rate limits, safe handling of `X-Forwarded-For`.
- **Please be aware** (known limits): no filter is perfect; for example a made-up username typed after a platform name without "@" or numbers ("tiktok rinacute") can still get through. A lone Indonesian animal swear word ("anjing!") is blocked even when a child means the pet. A child who types 5 wrong grown-up PINs locks the settings for 15 minutes. That is why grown-ups can read the chat history, switch chat off per child, and the host can remove messages and players.

---

## B. Game only (static hosting, no Friends online)

Upload the **contents** of `site/` to any static hosting (including the hidden `.htaccess` on Apache/cPanel). HTTPS strongly recommended. No server-side code is needed. The game plays fully; the 👫 Friends button stays hidden.

| Hosting | What to do |
|---|---|
| Apache / cPanel | Upload `site/` contents; `.htaccess` sets MIME types, caching and security headers (needs `mod_headers`). |
| nginx | Use `deploy/static-only/nginx.conf.example` and `deploy/static-only/mathfarm-headers.conf`. |
| Netlify / Cloudflare Pages | Rename `deploy/static-only/netlify-or-cloudflare-pages_headers` to `_headers`, put it in `site/`, deploy `site/`. |
| S3 + CloudFront, Azure, GitHub Pages, IIS | Upload `site/` contents; default document `index.html`; add MIME types for `.webmanifest` (`application/manifest+json`) and `.woff2` (`font/woff2`) if missing. |

Caching: `index.html` and `manifest.webmanifest` `no-cache`; `js/`, `css/`, `vendor/`, `fonts/` can be cached for a year (they are versioned with `?v=<build id>`); `icons/` one day.

---

## Saved progress (important)

- The game's **progress lives in the browser** of each device (localStorage), as before. The friends server only receives a **summary** for the leaderboard and island visits; it never writes progress back.
- Progress belongs to one browser on one device and one web address. **Choose the final URL before Adley starts playing**; changing the domain or moving from http to https starts fresh. Progress from the current preview link does not carry over.
- Private/incognito windows and clearing website data lose progress.
- **iPad / iPhone Safari**: Safari can delete a website's data when it has not been opened for about 7 days of Safari use. Open the game in Safari, tap **Share → Add to Home Screen**, and always start it from that icon (the icon keeps its own data). Each device in a friend group is linked by a random key stored the same way; if it is lost, the family simply joins again with the invite code.

---

## Browser and device support

- Needs WebGL for the 3D islands (all current browsers: Safari on iPadOS/iOS 15+, Chrome, Edge, Firefox, Samsung Internet). Without it, farms open from a list and island visits are not available.
- Best on a tablet or laptop; phones work too.
- The whole game is in **English**, including the read-aloud voice. The page is marked `lang="en"` and `translate="no"`, so browsers set to Indonesian will not auto-translate it. Children may still type Indonesian in the chat; the filter covers both languages.

---

## After deploying: test checklist

1. **Laptop:** open the URL. The title screen shows "Adley's Math Farm" with rounded fonts. DevTools Console: no red errors. Network: every request goes to your own domain.
2. `curl -s https://<your-url>/api/health` returns `"friends":true` and `"canCreate":true` (set-up A).
3. **Play test:** Let's play → tutorial → Skip → walk to a ❓ bubble → solve the puzzle → coins go up. Reload: progress kept.
4. **Friends (set-up A), with two devices or two browsers:**
   - Device 1: 👪 → 👫 Friends settings → Start a new friend group (host key, PIN) → note the invite code.
   - Device 2: 👪 → 👫 Friends settings → Join with the code and a different PIN → "Waiting for a yes".
   - Device 1: Say yes. Device 2 shows "You are in the friend group!" within half a minute.
   - Both: tap 👫 → leaderboard shows both children. Send "Hi! 👋" from the quick messages; it appears on the other device.
   - Type an unkind word or a phone number: the message is refused with a friendly explanation and does not appear on the other device.
   - Device 1: tap Visit next to the friend → their island opens with a 🏠 Home button; send a ❤️ cheer; tap Home.
5. **Adley's iPad:** open the URL in Safari, play one farm, check sound and 🔊, then Share → Add to Home Screen and open from the icon.
6. **Headers:** `curl -I https://<your-url>/` shows `Content-Security-Policy`, `X-Content-Type-Options: nosniff` and `Cache-Control: no-cache`.
7. **Files:** `sha256sum -c SHA256SUMS.txt` in the package folder (macOS: `shasum -a 256 -c SHA256SUMS.txt`).

---

## Third-party components

| Component | License | File |
|---|---|---|
| three.js r128 (3D engine) | MIT | `site/vendor/three-LICENSE.txt` |
| Andika font (SIL International) | SIL Open Font License 1.1 | `site/fonts/OFL-Andika.txt` |
| Baloo 2 font (Ek Type) | SIL Open Font License 1.1 | `site/fonts/OFL-Baloo2.txt` |
| Node.js (runtime, not included) | MIT | — |

Emoji are drawn by the device's own emoji font.

---

## How this package was checked

- **Server:** 29 automated tests (`npm test`): groups, invite codes, approvals, PINs and lock-out (also against parallel guessing), permissions, leaderboard and weekly stars, visits and cheers, chat filtering, numbers sent in pieces, rate limits and faked forwarding headers, groups sealed from each other, a whole class joining from one school network, backups, bad input, static file safety, unsafe settings.
- **Load:** 5,000 simulated children playing at the same time on a 2-vCPU test machine: 590 requests per second, no errors, 99% of answers within 7 ms, the server using about a quarter of one CPU core and 115 MB of memory.
- **Chat filter:** 316 reference messages, including the tricks found by three independent review rounds (look-alike letters, invisible characters, split words, numbers in pieces or as words, links with odd dots, asking for details) and ordinary game chat that must stay allowed (sums, scores, "aku punya anjing", "jalan ke farm 3"), plus a fresh set of 63 everyday messages, none blocked.
- **Docker and nginx:** the package was unzipped, built and started with `docker compose` (with a local Node 22 base image, because Docker Hub was not reachable from the test machine), the database survived a restart, and the HTTPS nginx example was tested in front of it, including a faked `X-Forwarded-For` that did not get around the limits.
- **Game with friends:** an end-to-end test with five browser devices against the real server (51 checks: starting and joining a group, wrong codes and PINs, approval, leaderboard, chat, blocked messages, visiting with cheers, permissions, chat history, removing a player, iPad and phone layouts, server down).
- **Game itself:** the full 40-test end-to-end suite, run against the friends server.
- **Independent review:** the server, filter and client were reviewed three times by a separate reviewer for security and child-safety gaps; the findings were fixed, and the remaining known limits are listed in "Child safety and security, in short".
- Testing was done in Chromium. Please still do step 5 of the checklist on Adley's real iPad.
