<?php
/**
 * Save Tour Draft
 * Stores tour drafts for the WYSIWYG editor
 */

require_once 'config.php';
enforceHttps();

session_start();

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

// Only admin can save drafts
if ($_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST method required']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['id']) || !isset($input['data'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input: id and data required']);
    exit;
}

$draftId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['id']);
$draftData = $input['data'];

// Validate draft ID
if (empty($draftId) || strlen($draftId) > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid draft ID']);
    exit;
}

// Create drafts directory if not exists
$draftsDir = __DIR__ . '/tour-drafts';
if (!is_dir($draftsDir)) {
    if (!mkdir($draftsDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create drafts directory']);
        exit;
    }
}

// Add metadata
$draftData['savedAt'] = time();
$draftData['savedBy'] = $_SESSION['user_role'];

// Save draft
$filePath = $draftsDir . '/' . $draftId . '.json';
$json = json_encode($draftData, JSON_PRETTY_PRINT);

if ($json === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    exit;
}

if (file_put_contents($filePath, $json) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not save draft']);
    exit;
}

echo json_encode([
    'success' => true,
    'id' => $draftId,
    'savedAt' => $draftData['savedAt']
]);
