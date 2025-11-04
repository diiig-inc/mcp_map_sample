<?php
/**
 * AIMap Configuration File
 *
 * このファイルをコピーして config.php として保存し、
 * 各種APIキーと設定を記入してください。
 */

// Anthropic API設定
define('ANTHROPIC_API_KEY', 'your-anthropic-api-key-here');
define('ANTHROPIC_API_URL', 'https://api.anthropic.com/v1/messages');
define('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929');

// DCP (DIIIG Cloud Platform) API設定
define('DCP_MCP_URL', 'https://dcpmcp.diiig.info/mcp');
define('DCP_API_KEY', 'your-dcp-api-key-here');
define('DCP_DATASET_ID', 'your-dataset-id-here'); // 使用するデータセットID

// マップシステム設定
// 使用するマップを選択: 'mapbox', 'maplibre', 'googlemaps'
define('MAP_SYSTEM', 'maplibre');

// Mapbox設定
define('MAPBOX_ACCESS_TOKEN', 'your-mapbox-access-token-here');
define('MAPBOX_STYLE', 'mapbox://styles/mapbox/streets-v12');

// MapLibre設定 (OSMベクタータイル - OpenFreeMap)
define('MAPLIBRE_STYLE', 'https://tiles.openfreemap.org/styles/liberty');

// Google Maps設定
define('GOOGLE_MAPS_API_KEY', 'your-google-maps-api-key-here');

// アプリケーション設定
define('DEFAULT_MAP_CENTER_LAT', 34.69364108831769);
define('DEFAULT_MAP_CENTER_LNG', 135.19343441838353);
define('DEFAULT_MAP_ZOOM', 12);

// セキュリティ設定
define('ALLOWED_ORIGINS', '*'); // 本番環境では適切なドメインを指定してください

// デバッグモード
define('DEBUG_MODE', true);
