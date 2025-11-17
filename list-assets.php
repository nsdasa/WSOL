<?php
// list-assets.php - Lists all asset files with COMPLETE CACHE PREVENTION
// This endpoint is called by the Deck Builder to browse server files

// =================================================================
// CRITICAL: PREVENT ALL CACHING
// =================================================================

// Prevent browser caching
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// Clear PHP OpCache for this script
if (function_exists('opcache_invalidate')) {
    opcache_invalidate(__FILE__, true);
}
if (function_exists('opcache_reset')) {
    opcache_reset();
}

// Clear file status cache (critical for directory listings)
clearstatcache(true);

// =================================================================
// ERROR REPORTING (for debugging)
// =================================================================
error_reporting(E_ALL);
ini_set('display_errors', 1);

// =================================================================
// MAIN LOGIC
// =================================================================

$assetsDir = __DIR__ . '/assets';

// Check if assets directory exists
if (!is_dir($assetsDir)) {
    echo json_encode([
        'success' => false,
        'error' => 'Assets directory not found'
    ]);
    exit;
}

// Get filter type from query parameter
$filterType = isset($_GET['type']) ? $_GET['type'] : 'all';

$files = [];

try {
    // Scan directory - force fresh read by clearing cache first
    clearstatcache(true, $assetsDir);
    
    $entries = scandir($assetsDir);
    
    if ($entries === false) {
        throw new Exception('Failed to scan assets directory');
    }
    
    foreach ($entries as $entry) {
        // Skip . and ..
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        
        $fullPath = $assetsDir . '/' . $entry;
        
        // Clear cache for this specific file
        clearstatcache(true, $fullPath);
        
        // Only process files (not directories)
        if (!is_file($fullPath)) {
            continue;
        }
        
        // Get file extension
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        
        // Determine file type
        $fileType = null;
        if ($ext === 'png') {
            $fileType = 'png';
        } elseif ($ext === 'gif') {
            $fileType = 'gif';
        } elseif ($ext === 'mp3' || $ext === 'm4a') {
            $fileType = 'mp3';
        } elseif ($ext === 'csv') {
            $fileType = 'csv';
        } elseif ($ext === 'json') {
            $fileType = 'json';
        }
        
        // Skip if no recognized file type
        if ($fileType === null) {
            continue;
        }
        
        // Apply filter if specified
        if ($filterType !== 'all' && $fileType !== $filterType) {
            continue;
        }
        
        // Get file size (with fresh stat)
        $fileSize = filesize($fullPath);
        
        // Add to results
        $files[] = [
            'name' => $entry,
            'path' => 'assets/' . $entry,
            'type' => $fileType,
            'size' => $fileSize,
            'modified' => filemtime($fullPath)
        ];
    }
    
    // Sort files by name
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
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>