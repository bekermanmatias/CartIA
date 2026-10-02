#!/usr/bin/env sh
set -eu
cd "${VPS_DEPLOY_PATH:?VPS_DEPLOY_PATH is required}"
stamp=$(date +%Y%m%d-%H%M%S)
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' "$API_IMAGE" "$WEB_IMAGE" > .release.env
# Asegurar que el compose portable no tenga modificaciones locales que bloqueen el pull.
git -C "$VPS_DEPLOY_PATH" checkout -- compose.production.yml || true

git -C "$VPS_DEPLOY_PATH" pull --ff-only origin main

set -a; . ./.env; . ./.release.env; set +a
mkdir -p backups
docker compose -f compose.production.yml up -d db
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  docker compose -f compose.production.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" && break
  sleep 3
done
if docker compose -f compose.production.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
  docker compose -f compose.production.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/pre-release-$stamp.sql.gz"
fi
docker compose -f compose.production.yml pull api web
docker compose -f compose.production.yml run --rm api npx prisma migrate deploy
docker compose -f compose.production.yml up -d --remove-orphans
for attempt in 1 2 3 4 5 6; do
  docker compose -f compose.production.yml exec -T api node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && break
  sleep 5
done
printf 'Optimizando media existente (miniaturas de video y faststart)...\n'
docker compose -f compose.production.yml exec -T api node dist/src/media/reprocess.js || printf 'Reproceso de media omitido o con errores (no bloquea el deploy).\n'
printf 'Regenerando miniaturas desde el primer frame para evitar parpadeo...\n'
docker compose -f compose.production.yml exec -T api node dist/src/media/reprocess.js --posters || printf 'Regeneracion de miniaturas omitida o con errores (no bloquea el deploy).\n'
docker compose -f compose.production.yml exec -T api node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
