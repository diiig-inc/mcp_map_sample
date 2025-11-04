<?php
/**
 * Configuration API
 * フロントエンドにマップ設定を提供（APIキーは除く）
 */

require_once '../../lib/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit(1);
}

// マップシステムの設定を構築
$mapSystem = MAP_SYSTEM;
$config = [
    'type' => $mapSystem,
    'config' => [
        'center' => [
            'lat' => DEFAULT_MAP_CENTER_LAT,
            'lng' => DEFAULT_MAP_CENTER_LNG
        ],
        'zoom' => DEFAULT_MAP_ZOOM
    ]
];

// マップシステム別の設定を追加
switch ($mapSystem) {
    case 'mapbox':
        $config['config']['accessToken'] = MAPBOX_ACCESS_TOKEN;
        $config['config']['style'] = MAPBOX_STYLE;
        break;

    case 'maplibre':
        $config['config']['style'] = MAPLIBRE_STYLE;
        break;

    case 'googlemaps':
        // Google Maps APIキーをフロントエンドに提供
        // 注意: Google Cloud Consoleで必ずHTTPリファラー制限を設定してください
        // 例: https://yourdomain.com/*, http://localhost:*
        $config['config']['apiKey'] = GOOGLE_MAPS_API_KEY;
        break;

    default:
        http_response_code(500);
        echo json_encode(['error' => 'Invalid map system configuration']);
        exit(1);
}

echo json_encode($config);
