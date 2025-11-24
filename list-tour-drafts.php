<?php
/**
 * List Tour Drafts
 * Returns all saved tour drafts
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

// Get drafts directory
$draftsDir = __DIR__ . '/tour-drafts';

if (!is_dir($draftsDir)) {
    echo json_encode([]);
    exit;
}

// List all draft files
$drafts = [];
$files = glob($draftsDir . '/*.json');

foreach ($files as $file) {
    $content = file_get_contents($file);
    $draft = json_decode($content, true);

    if ($draft) {
        $draftId = basename($file, '.json');
        $drafts[$draftId] = [
            'id' => $draftId,
            'module' => $draft['module'] ?? 'unknown',
            'savedAt' => $draft['savedAt'] ?? filemtime($file),
            'savedBy' => $draft['savedBy'] ?? 'unknown'
        ];
    }
}

// Sort by savedAt descending
uasort($drafts, function($a, $b) {
    return ($b['savedAt'] ?? 0) - ($a['savedAt'] ?? 0);
});

echo json_encode($drafts);
