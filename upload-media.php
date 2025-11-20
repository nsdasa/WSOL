<?php
/**
 * Media Upload Handler for Deck Builder
 * Receives PNG/GIF images and saves to assets folder
 */

header('Content-Type: application/json');

// Enable CORS if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['media']) || $_FILES['media']['error'] !== UPLOAD_ERR_OK) {
    $error = isset($_FILES['media']) ? $_FILES['media']['error'] : 'No file uploaded';
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Upload error: ' . $error]);
    exit;
}

// Get filename from POST
$filename = isset($_POST['filename']) ? $_POST['filename'] : null;

if (!$filename) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Filename required']);
    exit;
}

// Sanitize filename - only allow safe characters
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);

// Ensure it has a valid extension
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
$allowedExtensions = ['png', 'gif', 'jpg', 'jpeg'];

if (!in_array($ext, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file extension: ' . $ext]);
    exit;
}

// Verify it's actually an image
$imageInfo = getimagesize($_FILES['media']['tmp_name']);
if ($imageInfo === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File is not a valid image']);
    exit;
}

// Define upload directory
$uploadDir = __DIR__ . '/assets/';

// Create directory if it doesn't exist
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create assets directory']);
        exit;
    }
}

// Full path for the file
$targetPath = $uploadDir . $filename;

// Move uploaded file
if (move_uploaded_file($_FILES['media']['tmp_name'], $targetPath)) {
    // Set proper permissions
    chmod($targetPath, 0644);

    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'path' => 'assets/' . $filename,
        'size' => filesize($targetPath),
        'type' => $imageInfo['mime']
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
?>
