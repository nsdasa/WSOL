<?php
/**
 * List Tour Backups
 * Returns all available tour config backups
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

// Get backups directory
$backupsDir = __DIR__ . '/tour-backups';

if (!is_dir($backupsDir)) {
    echo json_encode([]);
    exit;
}

// List all backup files
$backups = [];
$files = glob($backupsDir . '/backup_*.json');

foreach ($files as $file) {
    $backupId = basename($file, '.json');
    $mtime = filemtime($file);
    $size = filesize($file);

    $backups[] = [
        'id' => $backupId,
        'timestamp' => $mtime,
        'date' => date('Y-m-d H:i:s', $mtime),
        'size' => $size
    ];
}

// Sort by timestamp descending
usort($backups, function($a, $b) {
    return $b['timestamp'] - $a['timestamp'];
});

echo json_encode($backups);
