<?php

declare(strict_types=1);

const CARTIA_ROOT = __DIR__ . '/..';

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function config(): array
{
    static $config;
    if ($config !== null) {
        return $config;
    }
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        jsonResponse([
            'ok' => false,
            'error' => 'CartIA todavía no está configurado.',
            'code' => 'CONFIG_MISSING',
        ], 503);
    }
    $loaded = require $path;
    if (!is_array($loaded)) {
        jsonResponse(['ok' => false, 'error' => 'Configuración inválida.'], 500);
    }
    $config = $loaded;
    return $config;
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $cfg = config();
    try {
        $pdo = new PDO(
            'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4',
            $cfg['db_user'],
            $cfg['db_pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $error) {
        error_log('[CartIA] Database connection failed: ' . $error->getMessage());
        jsonResponse(['ok' => false, 'error' => 'No se pudo conectar con la base de datos.'], 503);
    }
    return $pdo;
}

function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $cfg = config();
    session_name((string) ($cfg['session_name'] ?? 'cartia_session'));
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}

function currentUser(): ?array
{
    startSecureSession();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $statement = db()->prepare(
        'SELECT u.id, u.restaurant_id, u.name, u.email, u.role, u.status, r.name AS restaurant_name, r.slug AS restaurant_slug
         FROM users u LEFT JOIN restaurants r ON r.id = u.restaurant_id WHERE u.id = ? LIMIT 1'
    );
    $statement->execute([(int) $_SESSION['user_id']]);
    $user = $statement->fetch();
    return $user && $user['status'] === 'active' ? $user : null;
}

function requireUser(?string $role = null): array
{
    $user = currentUser();
    if (!$user) {
        jsonResponse(['ok' => false, 'error' => 'Debes iniciar sesión.', 'code' => 'UNAUTHENTICATED'], 401);
    }
    if ($role !== null && $user['role'] !== $role) {
        jsonResponse(['ok' => false, 'error' => 'No tienes permisos para realizar esta acción.'], 403);
    }
    return $user;
}

function requireRestaurantUser(): array
{
    $user = requireUser();
    if ($user['role'] !== 'restaurant_admin' || !$user['restaurant_id']) {
        jsonResponse(['ok' => false, 'error' => 'Selecciona un restaurante válido.'], 403);
    }
    return $user;
}

function ensureCsrf(): string
{
    startSecureSession();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return (string) $_SESSION['csrf'];
}

function requireCsrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($provided === '' || !hash_equals(ensureCsrf(), $provided)) {
        jsonResponse(['ok' => false, 'error' => 'La sesión cambió. Recarga la página e intenta nuevamente.'], 419);
    }
}

function route(): string
{
    return trim((string) ($_GET['route'] ?? 'health'), '/');
}

function method(): string
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

function cleanSlug(string $value): string
{
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $value) ?? '', '-'));
    return substr($value ?: 'restaurant', 0, 80);
}

function publicAssetUrl(?string $path): ?string
{
    if (!$path) {
        return null;
    }
    if (preg_match('#^https?://#', $path)) {
        return $path;
    }
    $base = rtrim((string) (config()['app_url'] ?? ''), '/');
    return $base . '/' . ltrim($path, '/');
}

function publicMenuUrl(string $restaurantSlug, string $tableToken): string
{
    $base = rtrim((string) config()['app_url'], '/');
    return $base . '/?r=' . rawurlencode($restaurantSlug) . '&t=' . rawurlencode($tableToken) . '#menu';
}

function requestIpHash(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $ip . '|' . (string) config()['install_key']);
}

function findPublicContext(string $slug, string $token): array
{
    $statement = db()->prepare(
        'SELECT r.*, t.id AS table_id, t.label AS table_label, t.public_token
         FROM restaurants r JOIN restaurant_tables t ON t.restaurant_id = r.id
         WHERE r.slug = ? AND r.status = "active" AND t.public_token = ? AND t.active = 1 LIMIT 1'
    );
    $statement->execute([$slug, $token]);
    $context = $statement->fetch();
    if (!$context) {
        jsonResponse(['ok' => false, 'error' => 'Este QR no corresponde a una mesa activa.'], 404);
    }
    return $context;
}

function relativeTime(string $createdAt): string
{
    $seconds = max(0, time() - strtotime($createdAt));
    if ($seconds < 60) return 'recién';
    if ($seconds < 3600) return 'hace ' . floor($seconds / 60) . ' min';
    return 'hace ' . floor($seconds / 3600) . ' h';
}

function restaurantPayload(int $restaurantId): array
{
    $restaurantStatement = db()->prepare('SELECT * FROM restaurants WHERE id = ? LIMIT 1');
    $restaurantStatement->execute([$restaurantId]);
    $restaurant = $restaurantStatement->fetch();
    if (!$restaurant) {
        jsonResponse(['ok' => false, 'error' => 'Restaurante no encontrado.'], 404);
    }

    $dishStatement = db()->prepare(
        'SELECT d.*, v.path AS video_path, v.original_name AS video_file_name, v.bytes AS video_size,
                v.mime_type AS video_type, v.duration_seconds, v.width AS video_width, v.height AS video_height,
                v.published AS video_published
         FROM dishes d LEFT JOIN dish_videos v ON v.dish_id = d.id
         WHERE d.restaurant_id = ? ORDER BY d.sort_order, d.id'
    );
    $dishStatement->execute([$restaurantId]);
    $dishes = array_map(static function (array $dish): array {
        $video = $dish['video_path'] ? [
            'url' => publicAssetUrl($dish['video_path']),
            'fileName' => $dish['video_file_name'],
            'size' => (int) $dish['video_size'],
            'type' => $dish['video_type'],
            'duration' => $dish['duration_seconds'] !== null ? (float) $dish['duration_seconds'] : null,
            'width' => $dish['video_width'] !== null ? (int) $dish['video_width'] : null,
            'height' => $dish['video_height'] !== null ? (int) $dish['video_height'] : null,
            'published' => (bool) $dish['video_published'],
            'dishId' => $dish['public_id'],
            'dish' => $dish['name'],
        ] : null;
        return [
            'databaseId' => (int) $dish['id'],
            'id' => $dish['public_id'],
            'name' => $dish['name'],
            'detail' => $dish['description'],
            'price' => '$' . number_format(((int) $dish['price_cents']) / 100, 0, ',', '.'),
            'priceCents' => (int) $dish['price_cents'],
            'currency' => $dish['currency'],
            'image' => publicAssetUrl($dish['image_path']),
            'badge' => $dish['badge'] ?? '',
            'category' => $dish['category'],
            'available' => (bool) $dish['available'],
            'video' => $video,
        ];
    }, $dishStatement->fetchAll());

    return [
        'restaurant' => [
            'id' => (int) $restaurant['id'],
            'name' => $restaurant['name'],
            'slug' => $restaurant['slug'],
            'tagline' => $restaurant['tagline'],
            'logo' => publicAssetUrl($restaurant['logo_path']),
        ],
        'serviceOptions' => [
            'waiter' => (bool) $restaurant['service_waiter'],
            'bill' => (bool) $restaurant['service_bill'],
        ],
        'visualTheme' => [
            'primary' => $restaurant['theme_primary'],
            'accent' => $restaurant['theme_accent'],
            'paper' => $restaurant['theme_paper'],
            'name' => $restaurant['theme_name'],
            'font' => $restaurant['theme_font'],
        ],
        'dishes' => $dishes,
    ];
}

