<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$route = route();
$method = method();

try {
    if ($route === 'health' && $method === 'GET') {
        $configured = is_file(__DIR__ . '/config.php');
        if (!$configured) {
            jsonResponse(['ok' => true, 'configured' => false, 'php' => PHP_VERSION]);
        }
        db()->query('SELECT 1');
        jsonResponse(['ok' => true, 'configured' => true, 'database' => true, 'php' => PHP_VERSION]);
    }

    if ($route === 'install' && $method === 'POST') {
        $data = input();
        $cfg = config();
        $lockPath = __DIR__ . '/storage/installed.lock';
        if (is_file($lockPath)) {
            jsonResponse(['ok' => false, 'error' => 'CartIA ya fue instalado.'], 409);
        }
        if (empty($data['installKey']) || !hash_equals((string) $cfg['install_key'], (string) $data['installKey'])) {
            jsonResponse(['ok' => false, 'error' => 'Clave de instalación incorrecta.'], 403);
        }
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $restaurantName = trim((string) ($data['restaurantName'] ?? 'La Oliva'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10) {
            jsonResponse(['ok' => false, 'error' => 'Usa un email válido y una contraseña de al menos 10 caracteres.'], 422);
        }

        $sql = file_get_contents(CARTIA_ROOT . '/database/schema.sql');
        if ($sql === false) {
            throw new RuntimeException('No se encontró el esquema de base de datos.');
        }
        foreach (preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: [] as $statement) {
            $statement = trim($statement);
            if ($statement !== '') db()->exec($statement);
        }

        $pdo = db();
        $pdo->beginTransaction();
        $slug = cleanSlug($restaurantName);
        $suffix = 1;
        while (true) {
            $check = $pdo->prepare('SELECT id FROM restaurants WHERE slug = ?');
            $check->execute([$slug]);
            if (!$check->fetch()) break;
            $slug = cleanSlug($restaurantName) . '-' . ++$suffix;
        }
        $restaurantStatement = $pdo->prepare('INSERT INTO restaurants (name, slug, tagline) VALUES (?, ?, ?)');
        $restaurantStatement->execute([$restaurantName, $slug, 'Cocina con identidad']);
        $restaurantId = (int) $pdo->lastInsertId();

        $userStatement = $pdo->prepare(
            'INSERT INTO users (restaurant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, "restaurant_admin")'
        );
        $userStatement->execute([
            $restaurantId,
            trim((string) ($data['name'] ?? 'Administrador')) ?: 'Administrador',
            $email,
            password_hash($password, PASSWORD_DEFAULT),
        ]);
        $userId = (int) $pdo->lastInsertId();

        $superadminEmail = strtolower(trim((string) ($data['superadminEmail'] ?? '')));
        $superadminPassword = (string) ($data['superadminPassword'] ?? '');
        if ($superadminEmail !== '' || $superadminPassword !== '') {
            if (!filter_var($superadminEmail, FILTER_VALIDATE_EMAIL) || strlen($superadminPassword) < 12 || $superadminEmail === $email) {
                throw new RuntimeException('La cuenta CartIA necesita otro email y una contraseña de al menos 12 caracteres.');
            }
            $userStatement->execute([
                null,
                trim((string) ($data['superadminName'] ?? 'Equipo CartIA')) ?: 'Equipo CartIA',
                $superadminEmail,
                password_hash($superadminPassword, PASSWORD_DEFAULT),
            ]);
            $superadminId = (int) $pdo->lastInsertId();
            $pdo->prepare('UPDATE users SET role = "superadmin" WHERE id = ?')->execute([$superadminId]);
        }

        $demoDishes = [
            ['milanesa', 'Milanesa napolitana', 'Ternera tierna, tomate de estación y mozzarella gratinada', 1790000, '/assets/food/milanesa.png', 'Más mirado', 'Principales'],
            ['tartar', 'Tartar de atún rojo', 'Aguacate, sésamo tostado y ponzu cítrico', 1890000, '/assets/food/tartar-atun.png', 'Favorito', 'Entradas'],
            ['pulpo', 'Pulpo a la brasa', 'Crema de patata, pimentón y aceite verde', 2150000, '/assets/food/pulpo.png', null, 'Principales'],
            ['ravioles', 'Ravioles de calabaza', 'Manteca noisette, salvia y avellanas', 1680000, '/assets/food/ravioles.png', 'Vegetariano', 'Principales'],
            ['burrata', 'Burrata de la casa', 'Tomates asados, albahaca fresca y aceite de oliva extra virgen', 1490000, '/assets/food/burrata.png', 'Recomendado', 'Entradas'],
            ['tiramisu', 'Tiramisú clásico', 'Mascarpone, café intenso y cacao amargo', 980000, '/assets/food/tiramisu.png', null, 'Postres'],
        ];
        $dishStatement = $pdo->prepare(
            'INSERT INTO dishes (public_id, restaurant_id, name, description, price_cents, image_path, badge, category, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($demoDishes as $index => $dish) {
            $dishStatement->execute([$dish[0], $restaurantId, $dish[1], $dish[2], $dish[3], $dish[4], $dish[5], $dish[6], $index]);
        }
        $tableStatement = $pdo->prepare('INSERT INTO restaurant_tables (restaurant_id, label, public_token) VALUES (?, ?, ?)');
        for ($number = 1; $number <= 16; $number++) {
            $tableStatement->execute([$restaurantId, 'Mesa ' . $number, bin2hex(random_bytes(16))]);
        }
        $pdo->commit();

        if (!is_dir(dirname($lockPath))) mkdir(dirname($lockPath), 0755, true);
        file_put_contents($lockPath, date(DATE_ATOM));
        startSecureSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        ensureCsrf();
        jsonResponse(['ok' => true, 'restaurant' => ['id' => $restaurantId, 'name' => $restaurantName, 'slug' => $slug]]);
    }

    if ($route === 'auth/login' && $method === 'POST') {
        $data = input();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $statement = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();
        if (!$user || $user['status'] !== 'active' || !password_verify((string) ($data['password'] ?? ''), $user['password_hash'])) {
            usleep(250000);
            jsonResponse(['ok' => false, 'error' => 'Email o contraseña incorrectos.'], 401);
        }
        startSecureSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $user['id']]);
        jsonResponse(['ok' => true, 'user' => currentUser(), 'csrf' => ensureCsrf()]);
    }

    if ($route === 'auth/logout' && $method === 'POST') {
        requireUser();
        requireCsrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
        }
        session_destroy();
        jsonResponse(['ok' => true]);
    }

    if ($route === 'auth/me' && $method === 'GET') {
        $user = currentUser();
        jsonResponse(['ok' => true, 'authenticated' => (bool) $user, 'user' => $user, 'csrf' => $user ? ensureCsrf() : null]);
    }

    if ($route === 'bootstrap' && $method === 'GET') {
        $user = requireRestaurantUser();
        $payload = restaurantPayload((int) $user['restaurant_id']);

        $tablesStatement = db()->prepare('SELECT id, label, public_token, active FROM restaurant_tables WHERE restaurant_id = ? ORDER BY id');
        $tablesStatement->execute([(int) $user['restaurant_id']]);
        $payload['tables'] = array_map(static fn(array $table): array => [
            'id' => (int) $table['id'],
            'label' => $table['label'],
            'token' => $table['public_token'],
            'active' => (bool) $table['active'],
            'menuUrl' => publicMenuUrl($user['restaurant_slug'], $table['public_token']),
        ], $tablesStatement->fetchAll());
        $payload['user'] = $user;
        $payload['csrf'] = ensureCsrf();
        jsonResponse(['ok' => true] + $payload);
    }

    if ($route === 'public/menu' && $method === 'GET') {
        $slug = (string) ($_GET['r'] ?? '');
        $token = (string) ($_GET['t'] ?? '');
        $context = findPublicContext($slug, $token);
        $payload = restaurantPayload((int) $context['id']);
        $visitor = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['v'] ?? '')) ?: '', 0, 64);
        db()->prepare(
            'INSERT INTO analytics_events (restaurant_id, table_id, visitor_session, type, ip_hash) VALUES (?, ?, ?, "qr_scan", ?)'
        )->execute([(int) $context['id'], (int) $context['table_id'], $visitor ?: null, requestIpHash()]);
        $payload['table'] = ['id' => (int) $context['table_id'], 'label' => $context['table_label']];
        jsonResponse(['ok' => true] + $payload);
    }

    if ($route === 'public/request' && $method === 'POST') {
        $data = input();
        $context = findPublicContext((string) ($data['restaurant'] ?? ''), (string) ($data['tableToken'] ?? ''));
        $type = (string) ($data['type'] ?? '');
        if (!in_array($type, ['waiter', 'bill'], true)) {
            jsonResponse(['ok' => false, 'error' => 'Solicitud inválida.'], 422);
        }
        if (($type === 'waiter' && !$context['service_waiter']) || ($type === 'bill' && !$context['service_bill'])) {
            jsonResponse(['ok' => false, 'error' => 'Esta opción no está activa.'], 409);
        }
        $visitor = substr((string) ($data['visitorSession'] ?? ''), 0, 64) ?: null;
        $duplicate = db()->prepare(
            'SELECT id FROM service_requests WHERE restaurant_id = ? AND table_id = ? AND type = ? AND status = "pending" AND created_at > DATE_SUB(NOW(), INTERVAL 90 SECOND) LIMIT 1'
        );
        $duplicate->execute([(int) $context['id'], (int) $context['table_id'], $type]);
        if ($duplicate->fetch()) {
            jsonResponse(['ok' => true, 'duplicate' => true]);
        }
        $statement = db()->prepare(
            'INSERT INTO service_requests (restaurant_id, table_id, type, visitor_session) VALUES (?, ?, ?, ?)'
        );
        $statement->execute([(int) $context['id'], (int) $context['table_id'], $type, $visitor]);
        db()->prepare(
            'INSERT INTO analytics_events (restaurant_id, table_id, visitor_session, type, ip_hash) VALUES (?, ?, ?, ?, ?)'
        )->execute([(int) $context['id'], (int) $context['table_id'], $visitor, $type === 'waiter' ? 'waiter_call' : 'bill_request', requestIpHash()]);
        jsonResponse(['ok' => true, 'requestId' => (int) db()->lastInsertId()], 201);
    }

    if ($route === 'public/order' && $method === 'POST') {
        $data = input();
        $context = findPublicContext((string) ($data['restaurant'] ?? ''), (string) ($data['tableToken'] ?? ''));
        $items = array_values(array_filter((array) ($data['items'] ?? []), static fn($item): bool => is_array($item) && !empty($item['dishId']) && (int) ($item['quantity'] ?? 0) > 0));
        if (!$items || count($items) > 30) {
            jsonResponse(['ok' => false, 'error' => 'El pedido no contiene platos válidos.'], 422);
        }
        $publicIds = array_values(array_unique(array_map(static fn(array $item): string => substr((string) $item['dishId'], 0, 80), $items)));
        $placeholders = implode(',', array_fill(0, count($publicIds), '?'));
        $dishStatement = db()->prepare(
            'SELECT id, public_id, name, price_cents FROM dishes WHERE restaurant_id = ? AND available = 1 AND public_id IN (' . $placeholders . ')'
        );
        $dishStatement->execute(array_merge([(int) $context['id']], $publicIds));
        $dishes = [];
        foreach ($dishStatement->fetchAll() as $dish) $dishes[$dish['public_id']] = $dish;
        if (count($dishes) !== count($publicIds)) {
            jsonResponse(['ok' => false, 'error' => 'Uno de los platos ya no está disponible. Actualiza la carta.'], 409);
        }
        $total = 0;
        $normalized = [];
        foreach ($items as $item) {
            $dish = $dishes[$item['dishId']];
            $quantity = min(20, max(1, (int) $item['quantity']));
            $total += (int) $dish['price_cents'] * $quantity;
            $normalized[] = [$dish, $quantity];
        }
        $pdo = db();
        $pdo->beginTransaction();
        $orderStatement = $pdo->prepare(
            'INSERT INTO orders (restaurant_id, table_id, visitor_session, total_cents, notes) VALUES (?, ?, ?, ?, ?)'
        );
        $visitor = substr((string) ($data['visitorSession'] ?? ''), 0, 64) ?: null;
        $notes = substr(trim((string) ($data['notes'] ?? '')), 0, 500) ?: null;
        $orderStatement->execute([(int) $context['id'], (int) $context['table_id'], $visitor, $total, $notes]);
        $orderId = (int) $pdo->lastInsertId();
        $itemStatement = $pdo->prepare('INSERT INTO order_items (order_id, dish_id, dish_name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)');
        foreach ($normalized as [$dish, $quantity]) {
            $itemStatement->execute([$orderId, (int) $dish['id'], $dish['name'], (int) $dish['price_cents'], $quantity]);
        }
        $pdo->prepare(
            'INSERT INTO analytics_events (restaurant_id, table_id, visitor_session, type, ip_hash) VALUES (?, ?, ?, "order_sent", ?)'
        )->execute([(int) $context['id'], (int) $context['table_id'], $visitor, requestIpHash()]);
        $pdo->commit();
        jsonResponse(['ok' => true, 'orderId' => $orderId, 'totalCents' => $total], 201);
    }

    if ($route === 'public/event' && $method === 'POST') {
        $data = input();
        $context = findPublicContext((string) ($data['restaurant'] ?? ''), (string) ($data['tableToken'] ?? ''));
        $type = (string) ($data['type'] ?? '');
        if (!in_array($type, ['dish_view', 'dish_click', 'add_dish'], true)) {
            jsonResponse(['ok' => false, 'error' => 'Evento inválido.'], 422);
        }
        $dishId = null;
        if (!empty($data['dishId'])) {
            $dish = db()->prepare('SELECT id FROM dishes WHERE restaurant_id = ? AND public_id = ? LIMIT 1');
            $dish->execute([(int) $context['id'], substr((string) $data['dishId'], 0, 80)]);
            $dishId = $dish->fetchColumn() ?: null;
        }
        $statement = db()->prepare(
            'INSERT INTO analytics_events (restaurant_id, table_id, dish_id, visitor_session, type, duration_ms, metadata_json, ip_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $metadata = isset($data['metadata']) ? json_encode($data['metadata'], JSON_UNESCAPED_UNICODE) : null;
        $statement->execute([
            (int) $context['id'], (int) $context['table_id'], $dishId,
            substr((string) ($data['visitorSession'] ?? ''), 0, 64) ?: null,
            $type, isset($data['durationMs']) ? min(3600000, max(0, (int) $data['durationMs'])) : null,
            $metadata, requestIpHash(),
        ]);
        jsonResponse(['ok' => true], 201);
    }

    if ($route === 'tables' && $method === 'GET') {
        $user = requireRestaurantUser();
        $statement = db()->prepare('SELECT id, label, public_token, active FROM restaurant_tables WHERE restaurant_id = ? ORDER BY id');
        $statement->execute([(int) $user['restaurant_id']]);
        $tables = array_map(static fn(array $table): array => [
            'id' => (int) $table['id'], 'label' => $table['label'], 'token' => $table['public_token'],
            'active' => (bool) $table['active'], 'menuUrl' => publicMenuUrl($user['restaurant_slug'], $table['public_token']),
        ], $statement->fetchAll());
        jsonResponse(['ok' => true, 'tables' => $tables]);
    }

    if ($route === 'tables' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        $data = input();
        $label = trim((string) ($data['label'] ?? ''));
        if ($label === '' || mb_strlen($label) > 60) {
            jsonResponse(['ok' => false, 'error' => 'Escribe un nombre de mesa válido.'], 422);
        }
        try {
            $statement = db()->prepare('INSERT INTO restaurant_tables (restaurant_id, label, public_token) VALUES (?, ?, ?)');
            $token = bin2hex(random_bytes(16));
            $statement->execute([(int) $user['restaurant_id'], $label, $token]);
        } catch (PDOException $error) {
            if ((int) $error->errorInfo[1] === 1062) jsonResponse(['ok' => false, 'error' => 'Ya existe una mesa con ese nombre.'], 409);
            throw $error;
        }
        jsonResponse(['ok' => true, 'table' => [
            'id' => (int) db()->lastInsertId(), 'label' => $label, 'token' => $token, 'active' => true,
            'menuUrl' => publicMenuUrl($user['restaurant_slug'], $token),
        ]], 201);
    }

    if ($route === 'tables/archive' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        $data = input();
        $statement = db()->prepare('UPDATE restaurant_tables SET active = 0 WHERE id = ? AND restaurant_id = ?');
        $statement->execute([(int) ($data['id'] ?? 0), (int) $user['restaurant_id']]);
        jsonResponse(['ok' => true]);
    }

    if ($route === 'requests' && $method === 'GET') {
        $user = requireRestaurantUser();
        $serviceStatement = db()->prepare(
            'SELECT sr.id, sr.type, sr.status, sr.created_at, t.label AS table_label
             FROM service_requests sr JOIN restaurant_tables t ON t.id = sr.table_id
             WHERE sr.restaurant_id = ? AND sr.status = "pending" ORDER BY sr.created_at'
        );
        $serviceStatement->execute([(int) $user['restaurant_id']]);
        $requests = array_map(static fn(array $item): array => [
            'id' => (int) $item['id'], 'kind' => 'service', 'requestType' => $item['type'],
            'table' => $item['table_label'], 'type' => $item['type'] === 'waiter' ? 'Llama al mozo' : 'Pidió la cuenta',
            'time' => relativeTime($item['created_at']), 'createdAt' => $item['created_at'],
        ], $serviceStatement->fetchAll());

        $orderStatement = db()->prepare(
            'SELECT o.id, o.total_cents, o.created_at, t.label AS table_label,
                    GROUP_CONCAT(CONCAT(oi.quantity, "× ", oi.dish_name) ORDER BY oi.id SEPARATOR " · ") AS summary
             FROM orders o JOIN restaurant_tables t ON t.id = o.table_id JOIN order_items oi ON oi.order_id = o.id
             WHERE o.restaurant_id = ? AND o.status = "new" GROUP BY o.id ORDER BY o.created_at'
        );
        $orderStatement->execute([(int) $user['restaurant_id']]);
        foreach ($orderStatement->fetchAll() as $order) {
            $requests[] = [
                'id' => (int) $order['id'], 'kind' => 'order', 'requestType' => 'order',
                'table' => $order['table_label'], 'type' => 'Nuevo pedido', 'summary' => $order['summary'],
                'total' => '$' . number_format(((int) $order['total_cents']) / 100, 0, ',', '.'),
                'time' => relativeTime($order['created_at']), 'createdAt' => $order['created_at'],
            ];
        }
        usort($requests, static fn(array $a, array $b): int => strcmp($a['createdAt'], $b['createdAt']));
        jsonResponse(['ok' => true, 'requests' => $requests]);
    }

    if ($route === 'analytics' && $method === 'GET') {
        $user = requireRestaurantUser();
        $days = (int) ($_GET['days'] ?? 7);
        if (!in_array($days, [1, 7, 30], true)) $days = 7;
        $restaurantId = (int) $user['restaurant_id'];
        $since = 'DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)';

        $kpiStatement = db()->prepare(
            'SELECT
              SUM(type = "qr_scan") AS scans,
              SUM(type = "dish_view") AS views,
              SUM(type = "dish_click") AS clicks,
              SUM(type = "add_dish") AS adds,
              SUM(type = "order_sent") AS orders
             FROM analytics_events WHERE restaurant_id = ? AND created_at >= ' . $since
        );
        $kpiStatement->execute([$restaurantId]);
        $kpis = $kpiStatement->fetch() ?: [];

        $dishStatement = db()->prepare(
            'SELECT d.public_id, d.name, d.description, d.image_path,
              COALESCE(AVG(CASE WHEN e.type = "dish_view" THEN e.duration_ms END), 0) AS average_view_ms,
              SUM(e.type = "dish_view") AS view_count,
              SUM(e.type = "dish_click") AS click_count,
              SUM(e.type = "add_dish") AS add_count
             FROM dishes d
             LEFT JOIN analytics_events e ON e.dish_id = d.id AND e.created_at >= ' . $since . '
             WHERE d.restaurant_id = ?
             GROUP BY d.id ORDER BY average_view_ms DESC, view_count DESC LIMIT 10'
        );
        $dishStatement->execute([$restaurantId]);
        $dishRows = array_map(static function (array $row): array {
            $views = (int) $row['view_count'];
            $adds = (int) $row['add_count'];
            return [
                'id' => $row['public_id'],
                'name' => $row['name'],
                'detail' => $row['description'],
                'image' => publicAssetUrl($row['image_path']),
                'averageSeconds' => round(((float) $row['average_view_ms']) / 1000, 1),
                'views' => $views,
                'clicks' => (int) $row['click_count'],
                'adds' => $adds,
                'choiceRate' => $views > 0 ? round(($adds / $views) * 100) : 0,
            ];
        }, $dishStatement->fetchAll());
        jsonResponse(['ok' => true, 'days' => $days, 'kpis' => [
            'scans' => (int) ($kpis['scans'] ?? 0),
            'views' => (int) ($kpis['views'] ?? 0),
            'clicks' => (int) ($kpis['clicks'] ?? 0),
            'adds' => (int) ($kpis['adds'] ?? 0),
            'orders' => (int) ($kpis['orders'] ?? 0),
        ], 'dishes' => $dishRows]);
    }

    if ($route === 'requests/resolve' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        $data = input();
        if (($data['kind'] ?? '') === 'order') {
            $statement = db()->prepare('UPDATE orders SET status = "accepted" WHERE id = ? AND restaurant_id = ? AND status = "new"');
            $statement->execute([(int) ($data['id'] ?? 0), (int) $user['restaurant_id']]);
        } else {
            $statement = db()->prepare(
                'UPDATE service_requests SET status = "resolved", resolved_at = NOW(), resolved_by = ? WHERE id = ? AND restaurant_id = ? AND status = "pending"'
            );
            $statement->execute([(int) $user['id'], (int) ($data['id'] ?? 0), (int) $user['restaurant_id']]);
        }
        jsonResponse(['ok' => true]);
    }

    if ($route === 'settings' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        $data = input();
        $hex = static fn($value, $fallback): string => preg_match('/^#[0-9a-fA-F]{6}$/', (string) $value) ? strtolower((string) $value) : $fallback;
        $statement = db()->prepare(
            'UPDATE restaurants SET service_waiter = ?, service_bill = ?, theme_primary = ?, theme_accent = ?, theme_paper = ?, theme_name = ? WHERE id = ?'
        );
        $statement->execute([
            !empty($data['serviceOptions']['waiter']) ? 1 : 0,
            !empty($data['serviceOptions']['bill']) ? 1 : 0,
            $hex($data['visualTheme']['primary'] ?? '', '#173d31'),
            $hex($data['visualTheme']['accent'] ?? '', '#f0b44d'),
            $hex($data['visualTheme']['paper'] ?? '', '#f6f0e5'),
            substr(trim((string) ($data['visualTheme']['name'] ?? 'Personalizado')), 0, 80),
            (int) $user['restaurant_id'],
        ]);
        jsonResponse(['ok' => true]);
    }

    if ($route === 'dishes/save' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        $data = input();
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') jsonResponse(['ok' => false, 'error' => 'El plato necesita un nombre.'], 422);
        $priceCents = isset($data['priceCents']) ? max(0, (int) $data['priceCents']) : max(0, ((int) preg_replace('/\D/', '', (string) ($data['price'] ?? '0'))) * 100);
        if (!empty($data['databaseId'])) {
            $statement = db()->prepare(
                'UPDATE dishes SET name = ?, description = ?, price_cents = ?, badge = ?, category = ?, available = ? WHERE id = ? AND restaurant_id = ?'
            );
            $statement->execute([$name, trim((string) ($data['detail'] ?? '')), $priceCents, trim((string) ($data['badge'] ?? '')) ?: null,
                trim((string) ($data['category'] ?? 'Principales')), !empty($data['available']) ? 1 : 0,
                (int) $data['databaseId'], (int) $user['restaurant_id']]);
            $databaseId = (int) $data['databaseId'];
            $publicId = (string) ($data['id'] ?? '');
        } else {
            $publicId = cleanSlug($name) . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
            $statement = db()->prepare(
                'INSERT INTO dishes (public_id, restaurant_id, name, description, price_cents, badge, category, available, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(d.sort_order), 0) + 1 FROM dishes d WHERE d.restaurant_id = ?))'
            );
            $statement->execute([$publicId, (int) $user['restaurant_id'], $name, trim((string) ($data['detail'] ?? '')), $priceCents,
                trim((string) ($data['badge'] ?? '')) ?: null, trim((string) ($data['category'] ?? 'Principales')),
                !empty($data['available']) ? 1 : 0, (int) $user['restaurant_id']]);
            $databaseId = (int) db()->lastInsertId();
        }
        jsonResponse(['ok' => true, 'dish' => ['databaseId' => $databaseId, 'id' => $publicId]], empty($data['databaseId']) ? 201 : 200);
    }

    if ($route === 'videos/upload' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        if (empty($_FILES['video']) || !is_uploaded_file($_FILES['video']['tmp_name'])) {
            jsonResponse(['ok' => false, 'error' => 'Selecciona un archivo MP4 válido.'], 422);
        }
        $file = $_FILES['video'];
        if ((int) $file['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['ok' => false, 'error' => 'La carga fue interrumpida. Revisa el límite de PHP en hPanel.'], 422);
        }
        $maxBytes = (int) (config()['max_video_bytes'] ?? 52428800);
        if ((int) $file['size'] > $maxBytes) {
            jsonResponse(['ok' => false, 'error' => 'El video supera el máximo de ' . round($maxBytes / 1048576) . ' MB.'], 413);
        }
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        if ($mime !== 'video/mp4') {
            jsonResponse(['ok' => false, 'error' => 'Para esta beta solo se publican videos MP4 (H.264).'], 422);
        }
        $dish = db()->prepare('SELECT id, public_id, name FROM dishes WHERE id = ? AND restaurant_id = ? LIMIT 1');
        $dish->execute([(int) ($_POST['dishId'] ?? 0), (int) $user['restaurant_id']]);
        $dishRow = $dish->fetch();
        if (!$dishRow) jsonResponse(['ok' => false, 'error' => 'Plato no encontrado.'], 404);

        $relativeDirectory = 'uploads/videos/' . (int) $user['restaurant_id'];
        $absoluteDirectory = CARTIA_ROOT . '/' . $relativeDirectory;
        if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0755, true)) {
            throw new RuntimeException('No se pudo crear la carpeta de videos.');
        }
        $fileName = bin2hex(random_bytes(16)) . '.mp4';
        $relativePath = $relativeDirectory . '/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], CARTIA_ROOT . '/' . $relativePath)) {
            throw new RuntimeException('No se pudo guardar el video.');
        }

        $existing = db()->prepare('SELECT path FROM dish_videos WHERE dish_id = ?');
        $existing->execute([(int) $dishRow['id']]);
        $oldPath = $existing->fetchColumn();
        $statement = db()->prepare(
            'INSERT INTO dish_videos (dish_id, path, original_name, mime_type, bytes, duration_seconds, width, height, published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE path = VALUES(path), original_name = VALUES(original_name), mime_type = VALUES(mime_type),
               bytes = VALUES(bytes), duration_seconds = VALUES(duration_seconds), width = VALUES(width), height = VALUES(height), published = 1'
        );
        $statement->execute([
            (int) $dishRow['id'], $relativePath, basename((string) $file['name']), $mime, (int) $file['size'],
            isset($_POST['duration']) ? (float) $_POST['duration'] : null,
            isset($_POST['width']) ? (int) $_POST['width'] : null,
            isset($_POST['height']) ? (int) $_POST['height'] : null,
        ]);
        if ($oldPath && $oldPath !== $relativePath && str_starts_with((string) $oldPath, 'uploads/videos/')) {
            $oldAbsolute = CARTIA_ROOT . '/' . $oldPath;
            if (is_file($oldAbsolute)) @unlink($oldAbsolute);
        }
        jsonResponse(['ok' => true, 'video' => [
            'url' => publicAssetUrl($relativePath), 'fileName' => basename((string) $file['name']), 'size' => (int) $file['size'],
            'type' => $mime, 'duration' => isset($_POST['duration']) ? (float) $_POST['duration'] : null,
            'width' => isset($_POST['width']) ? (int) $_POST['width'] : null, 'height' => isset($_POST['height']) ? (int) $_POST['height'] : null,
            'published' => true, 'dishId' => $dishRow['public_id'], 'dish' => $dishRow['name'],
        ]], 201);
    }

    if ($route === 'images/upload' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
            jsonResponse(['ok' => false, 'error' => 'Selecciona una imagen válida.'], 422);
        }
        $file = $_FILES['image'];
        $maxBytes = (int) (config()['max_image_bytes'] ?? 8388608);
        if ((int) $file['error'] !== UPLOAD_ERR_OK || (int) $file['size'] > $maxBytes) {
            jsonResponse(['ok' => false, 'error' => 'La imagen supera el máximo de ' . round($maxBytes / 1048576) . ' MB.'], 413);
        }
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime])) {
            jsonResponse(['ok' => false, 'error' => 'Usa una imagen JPG, PNG o WebP.'], 422);
        }
        $dish = db()->prepare('SELECT id, image_path FROM dishes WHERE id = ? AND restaurant_id = ? LIMIT 1');
        $dish->execute([(int) ($_POST['dishId'] ?? 0), (int) $user['restaurant_id']]);
        $dishRow = $dish->fetch();
        if (!$dishRow) jsonResponse(['ok' => false, 'error' => 'Plato no encontrado.'], 404);
        $relativeDirectory = 'uploads/images/' . (int) $user['restaurant_id'];
        $absoluteDirectory = CARTIA_ROOT . '/' . $relativeDirectory;
        if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0755, true)) throw new RuntimeException('No se pudo crear la carpeta de imágenes.');
        $relativePath = $relativeDirectory . '/' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        if (!move_uploaded_file($file['tmp_name'], CARTIA_ROOT . '/' . $relativePath)) throw new RuntimeException('No se pudo guardar la imagen.');
        db()->prepare('UPDATE dishes SET image_path = ? WHERE id = ?')->execute([$relativePath, (int) $dishRow['id']]);
        if ($dishRow['image_path'] && str_starts_with((string) $dishRow['image_path'], 'uploads/images/')) {
            $oldAbsolute = CARTIA_ROOT . '/' . $dishRow['image_path'];
            if (is_file($oldAbsolute)) @unlink($oldAbsolute);
        }
        jsonResponse(['ok' => true, 'image' => publicAssetUrl($relativePath)], 201);
    }

    if ($route === 'logo/upload' && $method === 'POST') {
        $user = requireRestaurantUser();
        requireCsrf();
        if (empty($_FILES['logo']) || !is_uploaded_file($_FILES['logo']['tmp_name'])) jsonResponse(['ok' => false, 'error' => 'Selecciona un logo válido.'], 422);
        $file = $_FILES['logo'];
        $maxBytes = (int) (config()['max_image_bytes'] ?? 8388608);
        if ((int) $file['error'] !== UPLOAD_ERR_OK || (int) $file['size'] > $maxBytes) jsonResponse(['ok' => false, 'error' => 'El logo supera el límite permitido.'], 413);
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime])) jsonResponse(['ok' => false, 'error' => 'Usa un logo PNG, JPG o WebP.'], 422);
        $current = db()->prepare('SELECT logo_path FROM restaurants WHERE id = ?');
        $current->execute([(int) $user['restaurant_id']]);
        $oldPath = $current->fetchColumn();
        $relativeDirectory = 'uploads/logos/' . (int) $user['restaurant_id'];
        $absoluteDirectory = CARTIA_ROOT . '/' . $relativeDirectory;
        if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0755, true)) throw new RuntimeException('No se pudo crear la carpeta de logos.');
        $relativePath = $relativeDirectory . '/' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        if (!move_uploaded_file($file['tmp_name'], CARTIA_ROOT . '/' . $relativePath)) throw new RuntimeException('No se pudo guardar el logo.');
        db()->prepare('UPDATE restaurants SET logo_path = ? WHERE id = ?')->execute([$relativePath, (int) $user['restaurant_id']]);
        if ($oldPath && str_starts_with((string) $oldPath, 'uploads/logos/')) {
            $oldAbsolute = CARTIA_ROOT . '/' . $oldPath;
            if (is_file($oldAbsolute)) @unlink($oldAbsolute);
        }
        jsonResponse(['ok' => true, 'logo' => publicAssetUrl($relativePath)], 201);
    }

    if ($route === 'admin/restaurants' && $method === 'GET') {
        requireUser('superadmin');
        $rows = db()->query(
            'SELECT r.id, r.name, r.slug, r.status, r.created_at, COUNT(DISTINCT t.id) AS table_count, COUNT(DISTINCT d.id) AS dish_count
             FROM restaurants r LEFT JOIN restaurant_tables t ON t.restaurant_id = r.id LEFT JOIN dishes d ON d.restaurant_id = r.id
             GROUP BY r.id ORDER BY r.created_at DESC'
        )->fetchAll();
        jsonResponse(['ok' => true, 'restaurants' => $rows]);
    }

    if ($route === 'admin/restaurants' && $method === 'POST') {
        requireUser('superadmin');
        requireCsrf();
        $data = input();
        $name = trim((string) ($data['restaurantName'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10) {
            jsonResponse(['ok' => false, 'error' => 'Completa restaurante, email válido y contraseña de al menos 10 caracteres.'], 422);
        }
        $pdo = db();
        $pdo->beginTransaction();
        $slug = cleanSlug($name) . '-' . substr(bin2hex(random_bytes(3)), 0, 4);
        $pdo->prepare('INSERT INTO restaurants (name, slug, tagline) VALUES (?, ?, ?)')->execute([$name, $slug, trim((string) ($data['tagline'] ?? ''))]);
        $restaurantId = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO users (restaurant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, "restaurant_admin")')
            ->execute([$restaurantId, trim((string) ($data['adminName'] ?? 'Administrador')) ?: 'Administrador', $email, password_hash($password, PASSWORD_DEFAULT)]);
        $pdo->commit();
        jsonResponse(['ok' => true, 'restaurant' => ['id' => $restaurantId, 'name' => $name, 'slug' => $slug]], 201);
    }

    jsonResponse(['ok' => false, 'error' => 'Ruta no encontrada.'], 404);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[CartIA] ' . $error->getMessage() . "\n" . $error->getTraceAsString());
    jsonResponse(['ok' => false, 'error' => 'Ocurrió un error interno. Intenta nuevamente.'], 500);
}
