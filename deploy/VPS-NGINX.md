# Nginx público de CartIA

El contenedor web de producción escucha únicamente en `127.0.0.1:18080`.
Instalá `deploy/nginx/cartia.conf.template` en el Nginx principal del VPS,
ajustá las rutas del certificado wildcard y validalo antes de recargar:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

El certificado debe incluir `cartia.ar` y `*.cartia.ar`. Es indispensable
conservar `proxy_set_header Host $host`: NestJS usa ese host para resolver la
sucursal (`serenapiso12.cartia.ar` se resuelve como `serenapiso12`).

La carta del subdominio funciona sin token en modo de consulta. El QR de cada
mesa agrega `?t={tableToken}` y habilita pedidos, llamados de mozo y cuenta.
