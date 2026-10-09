#!/bin/sh
# Put a backup back (Docker set-up). Run from the package folder:
#   sh deploy/restore.sh /var/backups/mathfarm/math-farm-2026-10-09-0215.db.gz
# The server is stopped for a few seconds. The current database is kept as math-farm.db.before-restore.
set -eu
SRC="${1:?Give the backup file (.db or .db.gz)}"
TMP="$(mktemp -d)"
case "$SRC" in *.gz) gunzip -c "$SRC" > "$TMP/restore.db" ;; *) cp "$SRC" "$TMP/restore.db" ;; esac
chmod 755 "$TMP"; chmod 644 "$TMP/restore.db"     # the container runs as an ordinary user and must be able to read it
docker compose stop mathfarm
# whatever happens next, the server is started again
trap 'docker compose start mathfarm >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
docker compose run --rm --no-deps -v "$TMP:/restore:ro" mathfarm node -e "
  const fs = require('fs'), d = '/data/math-farm.db';
  if (fs.existsSync(d)) fs.copyFileSync(d, d + '.before-restore');
  for (const x of ['-wal', '-shm']) { try { fs.unlinkSync(d + x); } catch (e) {} }
  fs.copyFileSync('/restore/restore.db', d); console.log('Database restored from backup.');"
docker compose start mathfarm
sleep 3; docker compose exec -T mathfarm node admin.js groups
