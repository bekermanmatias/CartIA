# Despliegue de CartIA en Hostinger Agencia

CartIA se publica como frontend React estático, API PHP y base MariaDB/MySQL. No necesita un servidor Node en ejecución.

## 1. Crear la base de datos

En hPanel abre `Sitios web → Administrar → Gestión de bases de datos` y crea una base, usuario y contraseña. En Hostinger el host de la base es `localhost`.

## 2. Configurar CartIA

Dentro de `dist/hostinger/public_html/api`, duplica `config.example.php` como `config.php` y completa:

- `db_name`, `db_user` y `db_pass` con los datos de hPanel.
- `app_url` con el dominio HTTPS definitivo, sin barra final.
- `install_key` con una frase aleatoria de al menos 32 caracteres.
- `max_video_bytes` con 50 MB para esta beta.

No publiques ni compartas el contenido de `config.php`.

## 3. Subir archivos

Comprime el contenido de `dist/hostinger/public_html`, súbelo al directorio `public_html` del dominio y extráelo allí. El archivo `index.html` debe quedar directamente dentro de `public_html`.

Verifica permisos de escritura para `uploads` y `api/storage` (normalmente `755` en Hostinger).

## 4. Ajustar PHP

En `Configuración de PHP → Opciones de PHP`, usa PHP 8.1 o superior y configura, dentro del máximo permitido por el plan:

- `upload_max_filesize`: 50M o más.
- `post_max_size`: 55M o más.
- `max_execution_time`: 120.
- `memory_limit`: 256M o más.

CartIA acepta únicamente MP4 para esta beta. Recomendado: H.264, audio AAC, vertical 720 × 1280, 6–12 segundos y entre 3–8 MB.

## 5. Instalar la primera cuenta

Realiza una sola petición POST a `https://TU-DOMINIO/api/index.php?route=install` con:

```json
{
  "installKey": "LA_CLAVE_DE_CONFIG.PHP",
  "restaurantName": "Nombre del restaurante",
  "name": "Nombre del administrador",
  "email": "admin@restaurante.com",
  "password": "UNA_CONTRASEÑA_SEGURA",
  "superadminName": "Equipo CartIA",
  "superadminEmail": "admin@cartia.com",
  "superadminPassword": "OTRA_CONTRASEÑA_MUY_SEGURA"
}
```

La instalación crea el esquema, la cuenta del restaurante, la cuenta global de CartIA, seis platos de muestra y 16 mesas con QR único. Después crea `api/storage/installed.lock` y no puede repetirse. La cuenta global es la que da de alta otros restaurantes; no se registra ningún cliente por su cuenta.

## 6. Comprobación

- `https://TU-DOMINIO/api/index.php?route=health` debe devolver `configured: true` y `database: true`.
- Inicia sesión desde la portada.
- Ve a `Mesas`, abre una mesa y descarga su QR.
- Escanéalo con un celular, envía un pedido y confirma que aparezca en el panel en menos de cinco segundos.
