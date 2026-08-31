# CartIA — Pendientes hacia producción

Backlog operativo único para llevar CartIA desde la migración técnica actual hasta una beta multi-local y producción.

## Estados y prioridades

- **P0**: bloquea la beta o producción.
- **P1**: necesario para operar correctamente en varios locales.
- **P2**: mejora posterior o evolución.
- Estados: `pendiente`, `en progreso`, `bloqueado`, `terminado`.

Cada tarea debe cerrarse con evidencia: código, test, comando ejecutado o verificación manual documentada.

## P0 — Base técnica

| Estado | Tarea | Criterio de aceptación | Próxima acción | Dependencias |
|---|---|---|---|---|
| pendiente | Actualizar `DOCKER.md` y `HOSTINGER.md` | La documentación describe NestJS, PostgreSQL, Docker Compose, VPS y los comandos actuales | Reemplazar referencias PHP/MySQL/Agency por el runtime VPS | Compose productivo |
| terminado | Separar frontend y backend | React/Vite vive en `frontend/` y NestJS/Prisma en `backend/` | Mantener scripts raíz como orquestadores | — |
| terminado | Docker de producción | Existen imágenes separadas para API Nest y frontend Nginx, con PostgreSQL privado y media persistente | Mantener healthchecks y revisar HTTPS en VPS | Docker Compose |
| terminado | Docker de desarrollo | `docker-compose.dev.yml` monta código, ejecuta Nest watch y Vite HMR | Usar `npm run dev:docker` durante desarrollo | Docker Desktop |
| en progreso | Autenticación y sesión | Login, logout, `/me`, cookie HttpOnly, CSRF, expiración y rate limit tienen tests | Agregar tests de sesión/CSRF y prohibir secreto default en producción | Prisma, PostgreSQL |
| pendiente | Permisos administrativos | Cada endpoint administrativo valida usuario, organización, sucursal y rol | Crear guard/decorator de autorización centralizado | Auth |
| pendiente | Organizaciones y sucursales | Un usuario puede pertenecer a varias organizaciones/sucursales y cambiar de contexto | Agregar endpoints de administración y selector de sucursal | Permisos |
| en progreso | Aislamiento multi-tenant | Ningún usuario, QR o endpoint puede leer/modificar datos de otra sucursal | Cubrir queries con tests de dos organizaciones y dos locales | Permisos, modelo Prisma |
| pendiente | Uploads de media | Imágenes, MP4 y logos validan MIME, extensión, tamaño y contenido; se guardan por sucursal | Implementar `StorageService` filesystem con URLs `/uploads/...` | Volumen media |
| pendiente | Auditoría | Crear, actualizar, archivar, login y resolución generan `AuditLog` con actor y sucursal | Incorporar servicio de auditoría a comandos administrativos | Permisos |
| terminado | Migración y seed inicial | Prisma aplica migración versionada y crea usuario demo idempotente | Ejecutar también seed en una instalación limpia de CI/VPS | PostgreSQL |
| pendiente | Suite de pruebas | CI ejecuta unitarias, integración, aislamiento y E2E sin pasos manuales | Crear fixtures y tests de API con PostgreSQL | CI |
| en progreso | CI/CD | PR y `main` ejecutan validaciones; `main` publica imágenes SHA y despliega por SSH | Probar workflow en GitHub y completar provisioning VPS | Secrets GitHub, VPS |

## P1 — Operación multi-local

| Estado | Tarea | Criterio de aceptación | Próxima acción | Dependencias |
|---|---|---|---|---|
| pendiente | Acceso a varias sucursales | Un usuario con dos membresías puede consultar y operar ambas sin cruzar datos | Definir contexto activo de sucursal en sesión o header | Permisos |
| pendiente | Selector de sucursal | El panel muestra las sucursales permitidas y cambia el contexto sin relogin | Adaptar bootstrap y navegación del panel | API de memberships |
| pendiente | Roles | OWNER, ADMIN, MANAGER, STAFF, VIEWER tienen permisos explícitos y testeados | Publicar matriz de permisos en la documentación | Auth |
| pendiente | Gestión completa de carta | Menús, categorías, platos, precios, disponibilidad y orden se gestionan por sucursal | Completar CRUD y validaciones | Aislamiento |
| en progreso | Mesas y QR | Cada mesa tiene token aleatorio no adivinable y todas las operaciones validan slug/token/estado | Agregar rotación y revocación de tokens | Prisma |
| en progreso | Flujo operativo en tiempo real | QR → menú → pedido/llamado → SSE → resolución funciona en E2E | Crear escenario automatizado de punta a punta | SSE, tests |
| pendiente | Media persistente | Los archivos sobreviven a recreaciones y se sirven con caché larga | Implementar reemplazo y limpieza segura de archivos | Uploads |
| pendiente | Backups y recuperación | Backup previo al release, retención y restauración documentada funcionan en una prueba | Probar `vps-release.sh` con dump/restauración | VPS |
| pendiente | Observabilidad | Logs JSON, health autenticable, Sentry y alertas básicas están activos | Configurar DSN y documentación de monitoreo | Producción |
| en progreso | Deploy a Hostinger VPS | Merge a `main` construye, publica, migra, levanta y verifica el release | Provisionar usuario SSH restringido, `.env` y Compose en VPS | GitHub Secrets |

## P2 — Endurecimiento y evolución

| Estado | Tarea | Criterio de aceptación | Próxima acción | Dependencias |
|---|---|---|---|---|
| pendiente | Storage R2 intercambiable | Cambiar proveedor sin modificar módulos de negocio | Definir interfaz `StorageService` antes de integrar R2 | Uploads |
| pendiente | Rate limiting granular | Límites diferenciados por IP, sesión, QR y operación sensible | Añadir políticas y tests de 429 | Auth |
| pendiente | UX de errores | El frontend muestra estados claros para auth, red, permisos y uploads | Centralizar `ApiError` y estados de carga | API |
| pendiente | Métricas de negocio | KPIs filtrables por organización y sucursal con consultas eficientes | Definir eventos y períodos soportados | Analytics |
| pendiente | Vulnerabilidades | Dependencias e imágenes no tienen vulnerabilidades críticas o altas sin excepción documentada | Ejecutar auditoría y fijar política de actualización | CI |
| pendiente | Rollback automatizado | Un healthcheck fallido restaura imagen anterior sin perder datos compatibles | Guardar release previo y probar rollback | Migraciones aditivas |
| pendiente | Staging temporal | Existe un entorno previo a producción si el equipo lo necesita | Evaluar cuando haya usuarios beta externos | VPS |
| pendiente | Redis/WebSockets | Solo se agrega si SSE no cubre la carga o la experiencia requerida | Medir conexiones y latencia antes de decidir | Observabilidad |

## Orden de avance

1. Actualizar documentación técnica.
2. Corregir y verificar seed/migraciones en Docker y CI.
3. Implementar uploads con `StorageService`.
4. Implementar organizaciones, sucursales, contexto activo y permisos.
5. Completar aislamiento multi-tenant con pruebas negativas.
6. Agregar auditoría y tests de seguridad.
7. Validar el pipeline completo de CI/CD y el procedimiento de backup/rollback.

## Registro de sesiones

Cada sesión de trabajo debe registrar:

```text
Fecha:
Tarea:
Estado anterior → estado nuevo:
Cambios realizados:
Verificación:
Pendientes descubiertos:
```

## Criterio de salida a producción

CartIA estará lista cuando React funcione desde `frontend/`, NestJS/Prisma desde `backend/`, PostgreSQL sea la única base runtime, varias sucursales operen simultáneamente sin cruces de datos, QR/pedidos/llamados/SSE funcionen de punta a punta, los uploads sean seguros y persistentes, CI/CD despliegue desde `main`, y existan backups, rollback y monitoreo probados.
