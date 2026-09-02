# Subdominios públicos de CartIA

Cada sucursal usa su `Location.slug` como URL pública: `https://{slug}.cartia.ar`. El slug se define al crear el local desde el panel de plataforma, es globalmente único y no debe modificarse porque forma parte de los QR impresos.

## DNS en Hostinger

En la zona DNS de `cartia.ar`, crear estos registros A hacia la IP pública del VPS:

| Host | Destino |
| --- | --- |
| `@` | IP del VPS |
| `*` | IP del VPS |
| `app` | IP del VPS |

El wildcard hace que no haya que crear un registro DNS por restaurante. La propagación puede tardar según el TTL configurado.

## Certificado TLS wildcard

El Nginx principal del VPS debe tener un certificado que incluya `cartia.ar` y `*.cartia.ar`. El certificado se termina en ese Nginx, no dentro del contenedor de CartIA.

```env
TLS_CERT_PATH=/var/www/cartia-secrets/tls/fullchain.pem
TLS_KEY_PATH=/var/www/cartia-secrets/tls/privkey.pem
```

La renovación del certificado debe actualizar esos mismos archivos y recargar el Nginx principal.

## Variables de producción

En el `.env` local del VPS (no versionado):

```env
PUBLIC_BASE_DOMAIN=cartia.ar
PUBLIC_PROTOCOL=https
VITE_PLATFORM_ORIGIN=https://app.cartia.ar
VITE_SALES_WHATSAPP_URL=https://wa.me/5491100000000
APP_URL=https://app.cartia.ar
```

`cartia.ar` muestra la landing; `app.cartia.ar` sirve el panel de acceso; cualquier otro subdominio de primer nivel sirve la carta pública. El Nginx principal preserva el encabezado `Host` al proxyar hacia `http://127.0.0.1:18080`, y NestJS identifica la sucursal sin enviar su slug en los QR nuevos.

`VITE_SALES_WHATSAPP_URL` es opcional. Al configurarla con una URL de WhatsApp, los CTAs de `cartia.ar` abren una consulta comercial precompletada. Si se omite, la landing no publica un enlace de contacto ficticio.

## Desarrollo y QR existentes

Sin `PUBLIC_BASE_DOMAIN`, el backend sigue generando el enlace compatible `/?r={slug}&t={tableToken}#menu`. También se admite temporalmente `?r=slug&t=token` en producción para QR ya impresos.
