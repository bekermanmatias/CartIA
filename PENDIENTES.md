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
| en progreso | Permisos administrativos | Cada endpoint administrativo valida usuario, organización, sucursal y rol | Reemplazar las comprobaciones puntuales por una matriz de permisos y guards reutilizables | Auth |
| en progreso | Organizaciones y sucursales | Un usuario puede pertenecer a varias organizaciones/sucursales y cambiar de contexto | Conectar la gestión visual de usuarios y locales en React | Permisos |
| en progreso | Aislamiento multi-tenant | Ningún usuario, QR o endpoint puede leer/modificar datos de otra sucursal | Cubrir queries con tests de dos organizaciones y dos locales | Permisos, modelo Prisma |
| terminado | Uploads de media en R2 | Imágenes, MP4 y logos se validan, se guardan en Cloudflare R2 y se vinculan a su sucursal | Mantener límites y evaluar carga directa firmada cuando crezca el volumen | Cloudflare R2 |
| pendiente | Auditoría | Crear, actualizar, archivar, login y resolución generan `AuditLog` con actor y sucursal | Incorporar servicio de auditoría a comandos administrativos | Permisos |
| terminado | Migración y seed inicial | Prisma aplica migración versionada y crea usuario demo idempotente | Ejecutar también seed en una instalación limpia de CI/VPS | PostgreSQL |
| en progreso | Suite de pruebas | CI ejecuta unitarias, integración, aislamiento y E2E sin pasos manuales | Crear fixtures y tests negativos de dos organizaciones con PostgreSQL | CI |
| en progreso | CI/CD | PR y `main` ejecutan validaciones; `main` publica imágenes SHA y despliega por SSH | Probar workflow en GitHub y completar provisioning VPS | Secrets GitHub, VPS |

## P1 — Operación multi-local

| Estado | Tarea | Criterio de aceptación | Próxima acción | Dependencias |
|---|---|---|---|---|
| en progreso | Acceso a varias sucursales | Un usuario con dos membresías puede consultar y operar ambas sin cruzar datos | Probar cambio de contexto con dos locales reales | Permisos |
| en progreso | Selector de sucursal | El panel muestra las sucursales permitidas y cambia el contexto sin relogin | Completar estados visuales y recarga del panel | API de memberships |
| en progreso | Roles | OWNER, ADMIN, MANAGER, STAFF, VIEWER tienen permisos explícitos y testeados | Publicar matriz de permisos y aplicarla a cada endpoint | Auth |
| terminado | Gestión operativa de carta | Platos y categorías se crean, editan, archivan, restauran y reordenan por sucursal | Validar el flujo con el primer restaurante beta | PostgreSQL, R2 |
| en progreso | Mesas y QR | Cada mesa tiene token aleatorio no adivinable y todas las operaciones validan slug/token/estado | Agregar rotación y revocación de tokens | Prisma |
| en progreso | Flujo operativo en tiempo real | QR → menú → pedido/llamado → tablero de estados → resolución funciona en E2E | Ejecutar un pedido/llamado real desde QR y verificar actualización SSE visual | SSE, tests |
| terminado | Media persistente en R2 | Los archivos sobreviven a recreaciones, se reemplazan de forma segura y se sirven con caché larga | Configurar dominio propio cuando salga de beta | Cloudflare R2 |
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

### 2026-09-01 — Carta administrable y pedidos por estado

- Estado: `terminado` para gestión de carta; `en progreso` para la validación E2E visual de operación.
- Cambios: platos y categorías ahora se archivan/restauran y se reordenan; una categoría archivada mueve sus platos a `Sin categoría`; el panel incorpora tablero de pedidos `Nuevo → En preparación → Listo → Entregado` y cancelación confirmada.
- Verificación: migración Prisma `20260901113000_catalog_archive_and_order_flow` aplicada; typecheck y 8 tests backend correctos; build frontend correcto; prueba local de archivo/restauración correcta; pedido QR de prueba llegó a `DELIVERED`.
- Pendientes descubiertos: prueba visual desde celular con SSE y decidir una pantalla histórica de pedidos entregados/cancelados.

### 2026-09-01 — R2 y operación de restaurante

- Estado: `terminado` para uploads y media persistente; `en progreso` para validación visual completa del flujo operativo.
- Cambios: se creó `StorageService` para Cloudflare R2, endpoints de imagen, video y logo, persistencia de `storageKey`, URLs públicas `r2.dev`, reemplazo de archivos, integración del panel existente y escucha SSE para pedidos y llamados. El modo Vite de desarrollo ahora usa la API real salvo que `VITE_DEMO_MODE=true` sea explícito.
- Verificación: migración Prisma `20260901100000_r2_media_storage` aplicada; typecheck y tests backend correctos; build frontend correcto; R2 confirmó escritura/borrado; login → mesa QR → menú público respondió correctamente desde Docker local.
- Pendientes descubiertos: ejecutar y documentar un pedido/llamado visual de punta a punta, completar pruebas automatizadas de uploads y configurar dominio propio de media antes de producción.

### 2026-08-31 — P0 matriz de permisos y aislamiento

- Estado: `en progreso`.
- Cambios: `AccessService` centraliza acciones de permiso y validaciones de organización, sucursal y contexto activo; los servicios de CartIA y organizaciones consumen esa autorización; el panel React incorpora gestión de usuarios; se agregaron pruebas unitarias del servicio de acceso.
- Verificación: `npm --prefix backend run typecheck` correcto; `npm --prefix backend test -- --runInBand` correcto (1 suite, 5 tests); Docker dev verificado con API y frontend activos, incluyendo Nest watch y Vite HMR.
- Pendientes descubiertos: completar cobertura de controllers, fixtures de dos organizaciones, pruebas de CSRF/sesión, E2E y aplicar autorización a todas las rutas operativas.

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
