<?php
/**
 * Asset File Lister API - Bob and Mariel Ward School
 * Lists files from the assets directory for Deck Builder file selection
 * Version 3.1 - November 2025
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Configuration
define('ASSETS_DIR', __DIR__ . '/assets');

/**
 * Get file list from assets directory
 */
function listAssetFiles($filterType = 'all') {
    if (!is_dir(ASSETS_DIR)) {
        return [
            'success' => false,
            'error' => 'Assets directory not found',
            'files' => []
        ];
    }
    
    $files = [];
    $allowedExtensions = [];
    
    // Determine allowed extensions based on filter type
    switch ($filterType) {
        case 'png':
            $allowedExtensions = ['png'];
            break;
        case 'gif':
            $allowedExtensions = ['gif'];
            break;
        case 'mp3':
        case 'audio':
            $allowedExtensions = ['mp3', 'm4a'];
            break;
        case 'image':
            $allowedExtensions = ['png', 'gif'];
            break;
        case 'all':
        default:
            $allowedExtensions = ['png', 'gif', 'mp3', 'm4a'];
            break;
    }
    
    // Scan directory
    $iterator = new DirectoryIterator(ASSETS_DIR);
    
    foreach ($iterator as $fileInfo) {
        if ($fileInfo->isDot() || $fileInfo->isDir()) {
            continue;
        }
        
        $filename = $fileInfo->getFilename();
        $extension = strtolower($fileInfo->getExtension());
        
        // Skip logo.png
        if ($filename === 'logo.png') {
            continue;
        }
        
        // Skip CSV files and manifests
        if (in_array($extension, ['csv', 'json', 'html', 'txt'])) {
            continue;
        }
        
        // Check if extension matches filter
        if (!in_array($extension, $allowedExtensions)) {
            continue;
        }
        
        // Determine file type
        $type = '';
        if (in_array($extension, ['png'])) {
            $type = 'png';
        } elseif (in_array($extension, ['gif'])) {
            $type = 'gif';
        } elseif (in_array($extension, ['mp3', 'm4a'])) {
            $type = 'mp3';
        }
        
        // Parse filename to extract word number if possible
        $wordNum = null;
        if (preg_match('/^(\d+)\./', $filename, $matches)) {
            $wordNum = (int)$matches[1];
        }
        
        $files[] = [
            'name' => $filename,
            'path' => 'assets/' . $filename,
            'size' => $fileInfo->getSize(),
            'type' => $type,
            'extension' => $extension,
            'wordNum' => $wordNum,
            'modified' => $fileInfo->getMTime()
        ];
    }
    
    // Sort by filename
    usort($files, function($a, $b) {
        // Sort by word number if both have it
        if ($a['wordNum'] !== null && $b['wordNum'] !== null) {
            return $a['wordNum'] - $b['wordNum'];
        }
        // Otherwise sort alphabetically
        return strcmp($a['name'], $b['name']);
    });
    
    return [
        'success' => true,
        'files' => $files,
        'count' => count($files),
        'filterType' => $filterType
    ];
}

/**
 * Main request handler
 */
function handleRequest() {
    $type = isset($_GET['type']) ? $_GET['type'] : 'all';
    
    // Validate type parameter
    $validTypes = ['all', 'png', 'gif', 'mp3', 'audio', 'image'];
    if (!in_array($type, $validTypes)) {
        return [
            'success' => false,
            'error' => 'Invalid type parameter. Valid types: ' . implode(', ', $validTypes)
        ];
    }
    
    return listAssetFiles($type);
}

// Process request and return JSON
try {
    $response = handleRequest();
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>