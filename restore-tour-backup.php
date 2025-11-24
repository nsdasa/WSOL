<?php
/**
 * Restore Tour Backup
 * Restores tour config from a backup
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

// Only admin can restore backups
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

if (!$input || !isset($input['backupId'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Backup ID required']);
    exit;
}

$backupId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['backupId']);

if (empty($backupId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid backup ID']);
    exit;
}

// Backup file path
$backupFile = __DIR__ . '/tour-backups/' . $backupId . '.json';

if (!file_exists($backupFile)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Backup not found']);
    exit;
}

// Target file
$targetFile = __DIR__ . '/tour-config.json';

// Create a backup of current config first
$backupsDir = __DIR__ . '/tour-backups';
$currentBackup = $backupsDir . '/pre-restore_' . date('Y-m-d_H-i-s') . '.json';
if (file_exists($targetFile)) {
    copy($targetFile, $currentBackup);
}

// Restore the backup
if (!copy($backupFile, $targetFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not restore backup']);
    exit;
}

echo json_encode([
    'success' => true,
    'backupId' => $backupId,
    'restoredAt' => time()
]);
