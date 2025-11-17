<?php
// list-assets.php - Shows ALL asset files (permissive version)
// Version 3.2 - November 2025
// Part of Bob and Mariel Ward School of Filipino Languages

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$assetsDir = __DIR__ . '/assets';
$type = $_GET['type'] ?? 'all';

$files = [];
$handle = opendir($assetsDir);

while (($filename = readdir($handle)) !== false) {
    if ($filename === '.' || $filename === '..') continue;
    
    // Skip CSV and manifest files
    if (in_array($filename, ['manifest.json', 'Language_List.csv', 'Word_List.csv'])) {
        continue;
    }
    
    // Skip HTML report files
    if (preg_match('/^Asset_Scan_Report_.*\.htm$/', $filename)) {
        continue;
    }
    
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $filepath = 'assets/' . $filename;
    $fullpath = $assetsDir . '/' . $filename;
    
    // Determine file type
    $fileType = match($ext) {
        'png' => 'png',
        'gif' => 'gif',
        'mp3', 'm4a' => 'mp3',
        default => null
    };
    
    // Skip non-asset files
    if ($fileType === null) {
        continue;
    }
    
    // Filter by requested type (if specified)
    if ($type !== 'all' && $fileType !== $type) {
        continue;
    }
    
    // Add to files list
    $files[] = [
        'name' => $filename,
        'path' => $filepath,
        'type' => $fileType,
        'size' => filesize($fullpath)
    ];
}

closedir($handle);

// Sort by filename (natural sort for better number ordering)
usort($files, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));

echo json_encode([
    'success' => true,
    'files' => $files,
    'count' => count($files)
]);
?>