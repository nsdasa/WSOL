<?php
// rename-asset.php - Renames asset files with COMPLETE CACHE PREVENTION
// Called by Deck Builder when user wants to rename files to match naming conventions

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

// Clear file status cache (critical for file operations)
clearstatcache(true);

// =================================================================
// ERROR REPORTING (for debugging)
// =================================================================
error_reporting(E_ALL);
ini_set('display_errors', 1);

// =================================================================
// CONFIGURATION
// =================================================================

$assetsDir = __DIR__ . '/assets';

// =================================================================
// MAIN LOGIC
// =================================================================

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate input
    if (!isset($data['oldFilename']) || !isset($data['newFilename'])) {
        throw new Exception('Missing oldFilename or newFilename');
    }
    
    $oldFilename = basename($data['oldFilename']); // Security: prevent path traversal
    $newFilename = basename($data['newFilename']); // Security: prevent path traversal
    
    // Validate filenames
    if (empty($oldFilename) || empty($newFilename)) {
        throw new Exception('Invalid filename(s)');
    }
    
    // Construct full paths
    $oldPath = $assetsDir . '/' . $oldFilename;
    $newPath = $assetsDir . '/' . $newFilename;
    
    // Clear cache for both paths
    clearstatcache(true, $oldPath);
    clearstatcache(true, $newPath);
    
    // Check if old file exists
    if (!file_exists($oldPath)) {
        throw new Exception('Source file does not exist: ' . $oldFilename);
    }
    
    // Check if new filename already exists
    if (file_exists($newPath)) {
        throw new Exception('Target filename already exists: ' . $newFilename);
    }
    
    // Validate that new filename has valid extension
    $allowedExtensions = ['png', 'gif', 'mp3', 'm4a', 'jpg', 'jpeg'];
    $newExt = strtolower(pathinfo($newFilename, PATHINFO_EXTENSION));
    $oldExt = strtolower(pathinfo($oldFilename, PATHINFO_EXTENSION));
    
    if (!in_array($newExt, $allowedExtensions)) {
        throw new Exception('Invalid file extension: ' . $newExt);
    }
    
    // Don't allow changing file extension
    if ($newExt !== $oldExt) {
        throw new Exception('Cannot change file extension');
    }
    
    // Perform rename
    if (!rename($oldPath, $newPath)) {
        throw new Exception('Failed to rename file');
    }
    
    // Clear cache for the new file
    clearstatcache(true, $newPath);
    
    // Invalidate from OpCache if applicable
    if (function_exists('opcache_invalidate')) {
        opcache_invalidate($oldPath, true);
        opcache_invalidate($newPath, true);
    }
    
    // Success
    echo json_encode([
        'success' => true,
        'oldFilename' => $oldFilename,
        'newFilename' => $newFilename,
        'message' => 'File renamed successfully',
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>