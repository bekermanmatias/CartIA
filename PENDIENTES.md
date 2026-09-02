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
## PRÓXIMO BLOQUE — BETA OPERATIVA
| Estado | Tarea | Criterio de aceptación | Próxima acción | Dependencias |
|---|---|---|---|---|
| en progreso | Validación E2E con celular | QR → carta → pedido/llamado → panel → resolución funciona sin recargar; el pedido avanza por NEW → PREPARING → READY → DELIVERED | Probar una mesa real desde dos pestañas y documentar evidencia | Docker dev, SSE |
| pendiente | Compose de producción | API, frontend Nginx, PostgreSQL privado y configuración persistente levantan correctamente | Crear `compose.production.yml` compatible con `scripts/vps-release.sh` | Docker |
| pendiente | Documentación VPS | La instalación, HTTPS, variables, migraciones, backup y rollback están documentados para NestJS/PostgreSQL/R2 | Actualizar `DOCKER.md` y `HOSTINGER.md` | Compose productivo |
| pendiente | Backup y restauración | Se genera dump antes del release y se restaura correctamente en una base de prueba | Ejecutar y documentar una prueba de backup/restore | VPS, PostgreSQL |
| pendiente | Primer deploy beta | Un merge a `main` publica imágenes SHA, aplica migraciones, verifica healthchecks y deja la versión accesible | Configurar secrets de GitHub y variables de producción | GitHub Actions, VPS |
| pendiente | Prueba con restaurante | Un administrador carga carta/media, crea mesas y opera pedidos durante una jornada de prueba | Preparar checklist y datos iniciales del primer local | Beta operativa |
### Registro — Priorización para beta real
- Carta, pedidos y media R2: `terminado`.
- Validación E2E y deploy de producción: `en progreso`/`pendiente`.
- Decisión: priorizar el flujo operativo desde celular y el primer deploy VPS antes de sumar seguridad avanzada, Redis/WebSockets o mejoras secundarias.
- Criterio de beta: un restaurante puede cargar su carta, recibir pedidos y llamados, cambiar estados y operar con datos persistentes en el VPS.

### 2026-09-02 — Contexto de plataforma y administración multiempresa

- Estado: `en progreso`.
- Cambios: Platform Admin inicia en contexto `Plataforma` sin sucursal automática; Administración permite seleccionar empresa, crear/editar empresas, crear/editar/pausar locales, operar un local explícito y crear/desactivar usuarios. Los resúmenes de organizaciones y locales calculan mesas y platos desde PostgreSQL.
- Verificación: `npm --prefix backend run typecheck` y `npm --prefix frontend run build` correctos.
- Pendientes descubiertos: completar pruebas E2E de aislamiento con dos organizaciones y mejorar el retorno visual desde operación a Plataforma.
## Actualización — Compose portable de producción

- Estado: `terminado`.
- Cambio: se agregó `compose.production.yml` con servicios `db`, `api` y `web`, PostgreSQL no expuesto, volúmenes persistentes para base/media, healthchecks y configuración por variables.
- Compatibilidad: acepta `API_IMAGE` y `WEB_IMAGE` para releases inmutables desde GHCR; sin esas variables puede construir imágenes locales.
- Próximo paso: configurar el VPS y ejecutar el primer release con backup, migraciones y healthchecks.
## Auditoría de dinamismo — resultado

- Estado: `pendiente`.
- El flujo conectado ya usa NestJS, PostgreSQL y R2 para autenticación, carta, media, mesas, pedidos, llamados y configuración.
- Persisten datos iniciales de demo en `frontend/src/App.jsx`: platos, videos, mesas, pedidos, llamados, clientes y analítica de ejemplo. Se reemplazan al cargar la API, pero deben quedar aislados detrás de `VITE_DEMO_MODE=true`.
- `localStorage` conserva estados de demo de carta, opciones y tema; no es la fuente de verdad del restaurante conectado, pero debe limpiarse o deshabilitarse fuera del modo demo.
- La edición de categorías todavía usa `prompt/confirm`; es funcional, pero requiere una interfaz formal para una experiencia de restaurante real.
- Próxima acción: ejecutar una prueba de aceptación con datos nuevos, eliminar cualquier fallback visible en modo conectado y luego desplegar la beta en VPS.
## Limpieza de demo y sandbox persistente — 2026-09-01

- Estado: `terminado`.
- Se eliminaron del frontend los fallbacks de carta, videos, mesas, pedidos, llamados, clientes, analítica y `localStorage`; la aplicación conectada obtiene su estado únicamente de la API.
- Se reemplazaron los `prompt/confirm` de categorías por un modal con validación y confirmación visual.
- Nuevo comando: `npm --prefix backend run sandbox:reset`. Solo reinicia la organización `cartia-demo`, carga fixtures en R2 y deja operaciones/analítica vacías.
- Evidencia: sandbox recreado localmente con 6 platos, 12 mesas y 12 objetos R2; 0 pedidos, 0 llamados y 0 eventos. Typecheck backend, 11 tests, build frontend y build de imágenes Docker correctos.
- Próxima acción: prueba QR desde celular contra el sandbox y luego configuración del primer VPS beta.

## Subdominios automáticos por sucursal — 2026-09-01

- Estado: `terminado` en aplicación y configuración portable; `pendiente` el aprovisionamiento real del DNS/certificado en el VPS.
- Cambios: cada `Location.slug` genera una URL pública `https://{slug}.cartia.ar`; el alta de restaurante propone un subdominio editable, valida formato/reservas/unicidad y muestra la URL final. Los QR nuevos solo incluyen el token de mesa y usan ese host.
- Resolución: NestJS obtiene la sucursal desde el encabezado `Host`; conserva `?r=slug&t=token` como compatibilidad temporal para QR existentes y desarrollo local. `cartia.ar` muestra landing, `app.cartia.ar` sirve el panel y los demás subdominios sirven la carta pública con el mismo build React.
- Infraestructura: Nginx de producción redirige HTTP a HTTPS, preserva `Host` hacia la API y monta certificados wildcard fuera de Git. `compose.production.yml`, CI y `.env.example` aceptan dominio, origen de plataforma y rutas TLS. La guía concreta está en `deploy/SUBDOMAINS.md`.
- Evidencia: typecheck backend correcto, 13 tests backend, build frontend, `docker compose -f compose.production.yml config --quiet` y build de la imagen web de producción correctos. Resta validar DNS/TLS en el VPS.
- Próxima acción: crear `A @`, `A *` y `A app` hacia el VPS, instalar/renovar `cartia.ar` + `*.cartia.ar`, y realizar la prueba QR desde un subdominio real.

## UI dinámica de operación — 2026-09-01

- Estado: `terminado`.
- Cambios: header, avatar, selector de sucursal, contador y franja de sala se alimentan de usuario, sucursal y `/operations`; la franja se oculta sin actividad y vuelve a mostrarse ante una operación nueva. Se eliminaron las referencias visibles de restaurantes demo en carta pública y previsualizaciones.
- Evidencia: build del frontend y 13 tests backend correctos; no permanecen en React los textos `La Oliva`, `Cocina mediterránea`, `Buenos Aires`, mesas ficticias ni el contador fijo.

## Deploy en VPS multi-app — 2026-09-01

- Estado: `en progreso`.
- Cambio: CartIA deja de publicar `80/443` directamente. El web productivo se expone únicamente en `127.0.0.1:18080`; el Nginx principal del VPS termina HTTPS y conserva el encabezado `Host` para resolver subdominios.
- Release: el script prepara PostgreSQL antes del backup y tolera el primer despliegue cuando todavía no existe un dump previo.
- Evidencia: `docker compose -f compose.production.yml config --quiet`, typecheck backend y build frontend correctos.
- Próxima acción: actualizar el clone del VPS, crear el proxy Nginx de `cartia.ar` y validar el servicio por `127.0.0.1:18080` antes de publicar DNS/TLS.
