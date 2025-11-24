<?php
/**
 * Delete Tour Draft
 * Removes a saved tour draft
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

// Only admin can delete drafts
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

if (!$input || !isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Draft ID required']);
    exit;
}

$draftId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['id']);

if (empty($draftId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid draft ID']);
    exit;
}

// Delete draft
$filePath = __DIR__ . '/tour-drafts/' . $draftId . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Draft not found']);
    exit;
}

if (!unlink($filePath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not delete draft']);
    exit;
}

echo json_encode([
    'success' => true,
    'id' => $draftId
]);
