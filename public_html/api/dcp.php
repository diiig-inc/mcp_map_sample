<?php
/**
 * DCP API Proxy
 * DCP (DIIIG Cloud Platform) へのAPIリクエストを中継
 */

require_once '../../lib/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';

if (empty($endpoint)) {
    echo json_encode(['error' => 'Endpoint is required']);
    exit(1);
}

$url = rtrim(DCP_MCP_URL, '/') . '/' . ltrim($endpoint, '/');

// リクエストボディの取得
$requestBody = null;
if ($method === 'POST' || $method === 'PUT') {
    $requestBody = file_get_contents('php://input');
}

// cURLリクエストの設定
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . DCP_API_KEY
];

if ($requestBody) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo json_encode([
        'error' => 'DCP API request failed',
        'message' => curl_error($ch)
    ]);
    curl_close($ch);
    exit(1);
}

curl_close($ch);

http_response_code($httpCode);
echo $response;
