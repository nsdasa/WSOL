<?php
/**
 * Backup Tour Config
 * Creates a backup of the current tour configuration
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

// Only admin can create backups
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

// Source file
$sourceFile = __DIR__ . '/tour-config.json';

if (!file_exists($sourceFile)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Tour config not found']);
    exit;
}

// Create backups directory
$backupsDir = __DIR__ . '/tour-backups';
if (!is_dir($backupsDir)) {
    if (!mkdir($backupsDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create backups directory']);
        exit;
    }
}

// Generate backup filename with timestamp
$timestamp = date('Y-m-d_H-i-s');
$backupId = 'backup_' . $timestamp;
$backupFile = $backupsDir . '/' . $backupId . '.json';

// Copy the file
if (!copy($sourceFile, $backupFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not create backup']);
    exit;
}

// Clean up old backups (keep last 10)
$backups = glob($backupsDir . '/backup_*.json');
usort($backups, function($a, $b) {
    return filemtime($b) - filemtime($a);
});

$maxBackups = 10;
if (count($backups) > $maxBackups) {
    foreach (array_slice($backups, $maxBackups) as $oldBackup) {
        unlink($oldBackup);
    }
}

echo json_encode([
    'success' => true,
    'backupId' => $backupId,
    'timestamp' => $timestamp
]);
