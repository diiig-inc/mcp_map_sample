<?php
/**
 * POI Detail API - DCP APIからPOI詳細情報を取得
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

// POI IDを取得
$poiId = $_GET['poi_id'] ?? '';

if (empty($poiId)) {
    http_response_code(400);
    echo json_encode(['error' => 'poi_id is required']);
    exit(1);
}

// DCP_MCP_URLを使ってPOI詳細APIのURLを構築
// https://dcpmcp.diiig.info/mcp -> https://dcpapi.diiig.info/api/v1/poi/
$dcpApiUrl = str_replace(['dcpmcp', '/mcp'], ['dcpapi', '/api/v1/poi/'], DCP_MCP_URL);
$dcpApiUrl .= '?dataset_id=' . urlencode(DCP_DATASET_ID) . '&poi_id=' . urlencode($poiId);

if (DEBUG_MODE) {
    error_log("Fetching POI detail from: " . $dcpApiUrl);
}

// cURLでDCP APIにリクエスト
$ch = curl_init($dcpApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . DCP_API_KEY,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $error = curl_error($ch);
    if (DEBUG_MODE) {
        error_log("cURL error: " . $error);
    }
    curl_close($ch);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch POI detail: ' . $error]);
    exit(1);
}

curl_close($ch);

if ($httpCode >= 400) {
    if (DEBUG_MODE) {
        error_log("DCP API error: HTTP " . $httpCode);
        error_log("Response: " . $response);
    }
    http_response_code($httpCode);
    echo json_encode(['error' => 'DCP API returned error: ' . $httpCode, 'details' => $response]);
    exit(1);
}

// レスポンスをそのまま返す
echo $response;
