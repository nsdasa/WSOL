<?php
// rename-asset.php - Rename asset files with validation
// Version 3.2 - November 2025
// Part of Bob and Mariel Ward School of Filipino Languages

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$assetsDir = __DIR__ . '/assets';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['oldFilename']) || !isset($input['newFilename'])) {
    echo json_encode([
        'success' => false,
        'error' => 'Missing oldFilename or newFilename'
    ]);
    exit;
}

$oldFilename = basename($input['oldFilename']); // Security: strip path
$newFilename = basename($input['newFilename']); // Security: strip path

$oldPath = $assetsDir . '/' . $oldFilename;
$newPath = $assetsDir . '/' . $newFilename;

// Validate old file exists
if (!file_exists($oldPath)) {
    echo json_encode([
        'success' => false,
        'error' => "File not found: $oldFilename"
    ]);
    exit;
}

// Validate new filename doesn't already exist
if (file_exists($newPath) && $oldPath !== $newPath) {
    echo json_encode([
        'success' => false,
        'error' => "A file named '$newFilename' already exists"
    ]);
    exit;
}

// Validate new filename format
$ext = strtolower(pathinfo($newFilename, PATHINFO_EXTENSION));
$validExtensions = ['png', 'gif', 'mp3', 'm4a'];

if (!in_array($ext, $validExtensions)) {
    echo json_encode([
        'success' => false,
        'error' => "Invalid file extension. Must be: " . implode(', ', $validExtensions)
    ]);
    exit;
}

// Validate filename pattern
$isValid = false;

if ($ext === 'png' || $ext === 'gif') {
    // Must start with number: 123.anything.ext
    $isValid = preg_match('/^\d+\./', $newFilename);
} else if ($ext === 'mp3' || $ext === 'm4a') {
    // Must be: 123.lang.anything.ext
    $isValid = preg_match('/^\d+\.[a-z]{3}\./', $newFilename);
}

if (!$isValid) {
    echo json_encode([
        'success' => false,
        'error' => "Invalid filename format. Expected: WordNum.word.translation.$ext (or WordNum.lang.word.translation.mp3 for audio)"
    ]);
    exit;
}

// Perform rename
if (rename($oldPath, $newPath)) {
    echo json_encode([
        'success' => true,
        'message' => "File renamed successfully",
        'oldFilename' => $oldFilename,
        'newFilename' => $newFilename
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => "Failed to rename file. Check file permissions."
    ]);
}
?>