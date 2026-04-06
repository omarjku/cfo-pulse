<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$prompt = $input['prompt'] ?? '';

if (!$prompt) {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt is required']);
    exit;
}

// ── PUT YOUR ANTHROPIC API KEY HERE ──────────────────────────────────────────
$apiKey = 'YOUR_ANTHROPIC_API_KEY_HERE';
// ─────────────────────────────────────────────────────────────────────────────

$models = [
    'claude-haiku-4-5-20251001',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
];

$lastError = null;

foreach ($models as $model) {
    $payload = json_encode([
        'model'      => $model,
        'max_tokens' => 1000,
        'messages'   => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        echo json_encode([
            'success'    => true,
            'insight'    => $result['content'][0]['text'],
            'modelUsed'  => $model,
        ]);
        exit;
    }

    $lastError = $response;
}

http_response_code(500);
echo json_encode([
    'success' => false,
    'error'   => 'All models failed',
    'details' => $lastError,
]);
