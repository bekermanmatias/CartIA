# Despliegue de CartIA

CartIA usa React, NestJS, PostgreSQL y Cloudflare R2. La API PHP/MariaDB incluida en versiones antiguas no forma parte del runtime final y no debe publicarse.

## Runtime de producción

- Un VPS con Docker Compose ejecuta `web`, `api` y PostgreSQL privado.
- Cloudflare R2 guarda logos, imágenes y videos; se requieren `MEDIA_STORAGE=s3` y las variables `S3_*` del bucket.
- El proxy HTTPS del VPS conserva el encabezado `Host` para resolver el subdominio público de cada sucursal.

Usá [deploy/SUBDOMAINS.md](deploy/SUBDOMAINS.md), `compose.production.yml` y `scripts/vps-release.sh` como fuente de verdad para DNS, TLS, variables, migraciones y releases.

Antes de publicar, ejecutá:

```bash
npm run build
npm run test:sites
npm run typecheck
npm run test:api
```

Aplicá las migraciones con `npm --prefix backend run prisma:deploy` durante el release. La migración de esta versión agrega la tipografía persistida por sucursal.
