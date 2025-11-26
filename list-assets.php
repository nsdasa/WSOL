<?php
// list-assets.php - FULLY WORKING v4.0 - November 18, 2025
// Now correctly returns .m4a and .mp3 as type: "audio"

require_once 'config.php';
enforceHttps();

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

if (function_exists('opcache_invalidate')) {
    opcache_invalidate(__FILE__, true);
}
if (function_exists('opcache_reset')) {
    opcache_reset();
}
clearstatcache(true);

$assetsDir = __DIR__ . '/assets';

if (!is_dir($assetsDir)) {
    echo json_encode(['success' => false, 'error' => 'Assets directory not found']);
    exit;
}

$filterType = isset($_GET['type']) ? $_GET['type'] : 'all';
$files = [];

try {
    clearstatcache(true, $assetsDir);
    $entries = scandir($assetsDir);

    if ($entries === false) {
        throw new Exception('Failed to scan assets directory');
    }

    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') continue;

        $fullPath = $assetsDir . '/' . $entry;
        clearstatcache(true, $fullPath);
        if (!is_file($fullPath)) continue;

        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));

        $fileType = null;
        if (in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) $fileType = 'png';
        elseif (in_array($ext, ['gif', 'mp4', 'webm'])) $fileType = 'gif';
        elseif (in_array($ext, ['mp3', 'm4a', 'wav', 'ogg', 'opus', 'webm'])) $fileType = 'audio';
        elseif ($ext === 'csv') $fileType = 'csv';
        elseif ($ext === 'json') $fileType = 'json';

        if ($fileType === null) continue;
        if ($filterType !== 'all' && $fileType !== $filterType) continue;

        $files[] = [
            'name' => $entry,
            'path' => 'assets/' . $entry,
            'type' => $fileType,
            'size' => filesize($fullPath),
            'modified' => filemtime($fullPath)
        ];
    }

    usort($files, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    echo json_encode([
        'success' => true,
        'files' => $files,
        'count' => count($files),
        'timestamp' => time()
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>