<?php
/**
 * Chat API - Anthropic API with MCP Connector
 * SSEストリーミング対応
 */

require_once '../../lib/config.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendSSE('error', ['message' => 'Invalid request method']);
    exit(1);
}

$input = json_decode(file_get_contents('php://input'), true);
$userMessage = $input['message'] ?? '';
$conversationHistory = $input['history'] ?? [];

if (empty($userMessage)) {
    sendSSE('error', ['message' => 'Message is required']);
    exit(1);
}

// システムプロンプト
$datasetId = DCP_DATASET_ID;
$lat = DEFAULT_MAP_CENTER_LAT;
$lng = DEFAULT_MAP_CENTER_LNG;
$systemPrompt = <<<PROMPT
あなたは地図とPOI情報を提供するAIアシスタントです。
ユーザーの質問に対して、DCP MCPの利用可能なツールを活用して正確なPOI情報を提供してください。

DCP MCPツールを使用する際は、必ず dataset_id: {$datasetId} を指定してください。
また、地図の中心座標は以下の通りです。場所の指定がない場合以下を使ってください。
latitude: {$lat}
longitude: {$lng}

まず、ユーザーに対して自然な会話形式で回答してください。
マークダウンは許可できません。プレーンなテキストでお願いします。
その後、もしDCP MCPから取得したPOI情報がある場合は、回答の最後に以下のJSON形式で追記してください：

---POI_DATA---
{
    "pois": [
        // DCPから取得したPOI情報の配列
    ]
}

POI情報は必ずDCP MCPツールから取得した正確な情報のみを使用してください。
憶測や不正確な情報を作り上げないでください。
PROMPT;

// メッセージ履歴の構築
$messages = [];
foreach ($conversationHistory as $msg) {
    $messages[] = [
        'role' => $msg['role'],
        'content' => $msg['content']
    ];
}
$messages[] = [
    'role' => 'user',
    'content' => $userMessage
];

// Anthropic API リクエスト本体（MCP Connector対応）
$requestBody = [
    'model' => ANTHROPIC_MODEL,
    'max_tokens' => 4096,
    'system' => $systemPrompt,
    'messages' => $messages,
    'stream' => true,
    'mcp_servers' => [
        [
            'type' => 'url',
            'url' => DCP_MCP_URL,
            'name' => 'dcp-mcp',
            'authorization_token' => DCP_API_KEY
        ]
    ]
];

// デバッグ: リクエスト開始
if (DEBUG_MODE) {
    error_log("Starting Anthropic API request");
    error_log("Request body: " . json_encode($requestBody));
}

// cURLでストリーミングリクエスト
$ch = curl_init(ANTHROPIC_API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . ANTHROPIC_API_KEY,
    'anthropic-version: 2023-06-01',
    'anthropic-beta: mcp-client-2025-04-04'
]);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
    if (DEBUG_MODE) {
        error_log("Received chunk: " . substr($data, 0, 200));
    }

    // SSEストリーミングでデータを送信
    $lines = explode("\n", $data);
    foreach ($lines as $line) {
        if (strpos($line, 'data: ') === 0) {
            $jsonData = trim(substr($line, 6));
            if ($jsonData !== '[DONE]' && !empty($jsonData)) {
                $decoded = json_decode($jsonData, true);

                // Anthropic APIのストリーミング形式
                if ($decoded && isset($decoded['type'])) {
                    if ($decoded['type'] === 'content_block_delta') {
                        // テキストデルタを取得
                        if (isset($decoded['delta']['type']) && $decoded['delta']['type'] === 'text_delta') {
                            if (isset($decoded['delta']['text'])) {
                                sendSSE('message', ['text' => $decoded['delta']['text']]);
                            }
                        }
                    }
                }
            }
        }
    }
    return strlen($data);
});

$result = curl_exec($ch);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $error = curl_error($ch);
    if (DEBUG_MODE) {
        error_log("cURL error: " . $error);
    }
    sendSSE('error', ['message' => 'API request failed: ' . $error]);
} elseif ($httpCode >= 400) {
    sendSSE('error', ['message' => 'API returned error status: ' . $httpCode]);
}

if (DEBUG_MODE) {
    error_log("HTTP response code: " . $httpCode);
}

curl_close($ch);

sendSSE('done', ['message' => 'Stream completed']);

/**
 * SSE形式でデータを送信
 */
function sendSSE($event, $data) {
    echo "event: {$event}\n";
    echo "data: " . json_encode($data) . "\n\n";
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
}
