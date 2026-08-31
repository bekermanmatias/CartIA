# Docker Setup para CartIA

## Requisitos previos

- Docker: https://docs.docker.com/get-docker/
- Docker Compose: https://docs.docker.com/compose/install/
- Git (para clonar el repositorio)

## Estructura de servicios

El `docker-compose.yml` levanta 4 servicios:

1. **MySQL 8.0** (`db`): Base de datos
   - Host: `db:3306` (desde otros contenedores)
   - Host: `localhost:3306` (desde tu máquina)
   - Usuario: `u000000000_cartia`
   - Password: `cartia_password_change_me` (cambiar en `.env.docker`)

2. **PHP-FPM 8.2** (`app`): Backend API + frontend compilado
   - Compilación automática del frontend React/Vite
   - Extensiones: PDO, PDO MySQL, mbstring

3. **Nginx** (`web`): Servidor web y proxy inverso
   - Acceso: http://localhost
   - Sirve archivos estáticos del frontend
   - Enruta `/api/*` a PHP-FPM

4. **Volúmenes compartidos**: Para desarrollo en vivo

## Configuración inicial

### 1. Variables de entorno (opcional)

Si deseas cambiar credenciales de la BD, edita `.env.docker`:

```bash
cp .env.docker .env.docker.local
# Editar .env.docker.local con tus valores
```

Luego inicia con:
```bash
docker-compose --env-file .env.docker.local up
```

### 2. Crear configuración de PHP

```bash
# Crear config.php desde el template
cp api/config.example.php api/config.php
```

Edita `api/config.php` y ajusta según sea necesario:
```php
return [
    'db_host' => 'db',  // Nombre del servicio Docker
    'db_name' => 'u000000000_cartia',
    'db_user' => 'u000000000_cartia',
    'db_pass' => 'cartia_password_change_me',  // Debe coincidir con .env.docker
    // ... resto de config
];
```

## Levantar el proyecto

### Opción 1: Levantarlo en primer plano (ver logs en vivo)

```bash
docker-compose up
```

### Opción 2: Levantarlo en background (daemon)

```bash
docker-compose up -d
```

Ver logs:
```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f web
```

## Acceso a la aplicación

- **Frontend/Menu**: http://localhost
- **API**: http://localhost/api/
- **phpmyadmin** (opcional): Ver sección de extras

## Comandos útiles

### Parar los servicios
```bash
docker-compose stop
```

### Eliminar contenedores, volúmenes y redes
```bash
docker-compose down -v
```

### Ejecutar comandos en un contenedor
```bash
# Acceder a la shell del contenedor PHP
docker-compose exec app sh

# Acceder a MySQL
docker-compose exec db mysql -u u000000000_cartia -p u000000000_cartia

# Ver estado de servicios
docker-compose ps
```

### Reconstruir la imagen después de cambios
```bash
docker-compose up --build
```

### Limpiar todo (cuidado: elimina volúmenes)
```bash
docker-compose down -v
docker image rm cartia-app
```

## Estructura de directorios montados

```
.
├── api/              → Mapeado a /app/api (rw)
├── public/           → Mapeado a /var/www/html/public (ro)
├── uploads/          → Mapeado a /app/uploads y /var/www/html/uploads (rw)
└── database/         → Archivo schema.sql se carga en la BD al iniciar
```

## Desarrollo

### Cambios en el frontend (React/Vite)

1. Durante desarrollo, puedes usar:
   ```bash
   pnpm run dev
   ```
   en tu máquina (sin Docker)

2. Para compilar e incluir en el contenedor:
   ```bash
   pnpm run build:hostinger
   docker-compose up --build
   ```

### Cambios en la API (PHP)

Los cambios en `api/` se reflejan automáticamente gracias al volumen compartido.

### Cambios en la BD

Para modificar el schema:
1. Edita `database/schema.sql`
2. Reinicia la BD:
   ```bash
   docker-compose down -v
   docker-compose up
   ```

## Extras (opcional)

### Agregar phpMyAdmin

Añade este servicio a `docker-compose.yml`:

```yaml
  phpmyadmin:
    image: phpmyadmin:latest
    container_name: cartia-phpmyadmin
    environment:
      PMA_HOST: db
      PMA_USER: u000000000_cartia
      PMA_PASSWORD: cartia_password_change_me
    ports:
      - "8080:80"
    depends_on:
      - db
    networks:
      - cartia-network
```

Luego accede a: http://localhost:8080

### Agregar mail (Mailhog)

Para testing de emails:

```yaml
  mailhog:
    image: mailhog/mailhog:latest
    container_name: cartia-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - cartia-network
```

Accede a: http://localhost:8025

## Solución de problemas

### El contenedor no inicia

```bash
docker-compose logs app
```

Busca mensajes de error sobre:
- Conexión a la BD
- Puertos ocupados
- Archivos faltantes

### La BD no se inicializa

Asegúrate de que `database/schema.sql` existe y es válido:
```bash
docker-compose down -v
docker-compose up
```

### Permisos de archivos

Si hay problemas con permisos en `uploads/`:
```bash
docker-compose exec app chmod 777 /app/uploads
```

### Puerto 80 ocupado

Cambia el mapeo en `docker-compose.yml`:
```yaml
ports:
  - "8000:80"  # Accede a http://localhost:8000
```

## Próximos pasos

1. Configura `api/config.php`
2. Levanta Docker: `docker-compose up`
3. Accede a http://localhost
4. Verifica logs: `docker-compose logs`

¡Listo! El proyecto está corriendo en Docker.
