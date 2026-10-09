#!/bin/sh
# Daily backup of the friends database (Docker set-up). Run from the package folder, e.g. by cron:
#   15 2 * * *  cd /opt/adley-math-farm && sh deploy/backup.sh /var/backups/mathfarm 30 >> /var/log/mathfarm-backup.log 2>&1
# 1st argument: folder on this server for the copies   2nd argument: days to keep (default 30)
set -eu
DEST="${1:-/var/backups/mathfarm}"; KEEP="${2:-30}"
STAMP="$(date +%Y-%m-%d-%H%M%S)"; NAME="math-farm-$STAMP.db"
mkdir -p "$DEST"
# a consistent copy made inside the running container (VACUUM INTO), then copied out and removed from the volume
docker compose exec -T mathfarm node admin.js backup "/data/backups/$NAME"
docker compose cp "mathfarm:/data/backups/$NAME" "$DEST/$NAME"
docker compose exec -T mathfarm node -e "require('fs').unlinkSync(process.argv[1])" "/data/backups/$NAME"
gzip -f "$DEST/$NAME"
find "$DEST" -name 'math-farm-*.db.gz' -mtime +"$KEEP" -delete
echo "$(date '+%F %T') backup ok: $DEST/$NAME.gz ($(du -h "$DEST/$NAME.gz" | cut -f1))"
