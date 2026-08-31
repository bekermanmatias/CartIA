#!/usr/bin/env sh
set -eu
cd "${VPS_DEPLOY_PATH:?VPS_DEPLOY_PATH is required}"
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose -f compose.production.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/pre-release-$stamp.sql.gz"
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' "$API_IMAGE" "$WEB_IMAGE" > .release.env
set -a; . ./.env; . ./.release.env; set +a
docker compose -f compose.production.yml pull api web
docker compose -f compose.production.yml run --rm api npx prisma migrate deploy
docker compose -f compose.production.yml up -d --remove-orphans
for attempt in 1 2 3 4 5 6; do
  wget -qO- http://127.0.0.1/api/v1/health >/dev/null && exit 0
  sleep 5
done
exit 1
