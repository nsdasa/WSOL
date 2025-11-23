<?php
/**
 * Load Tour Draft
 * Retrieves a saved tour draft
 */

session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

// Get draft ID
$draftId = isset($_GET['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id']) : '';

if (empty($draftId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Draft ID required']);
    exit;
}

// Load draft
$filePath = __DIR__ . '/tour-drafts/' . $draftId . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Draft not found']);
    exit;
}

$content = file_get_contents($filePath);
$draft = json_decode($content, true);

if ($draft === null) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Invalid draft data']);
    exit;
}

$draft['id'] = $draftId;
echo json_encode($draft);
