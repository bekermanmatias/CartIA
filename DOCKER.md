# Docker de CartIA

CartIA se ejecuta con React/Vite, NestJS, PostgreSQL y Cloudflare R2. No usa MySQL, PHP-FPM ni el directorio `api/` como backend de producción.

## Desarrollo

Configurá `backend/.env` con `DATABASE_URL`, `SESSION_SECRET`, `MEDIA_STORAGE=s3` y las credenciales `S3_*` de R2. Luego levantá el entorno conectado:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build db api frontend
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1/health`
- PostgreSQL permanece dentro de Docker.

## Producción

Usá `compose.production.yml` junto con `scripts/vps-release.sh`. El servicio web se expone sólo en `127.0.0.1:18080`; el Nginx principal del VPS termina HTTPS y enruta `cartia.ar`, `app.cartia.ar` y los subdominios de restaurantes.

Antes de un release corré `npm run build`, `npm run test:sites`, `npm run typecheck` y `npm run test:api`.
