<?php
/**
 * Audio Upload Handler for Deck Builder
 * Receives audio blob from recording and saves to assets folder
 */

require_once 'config.php';
enforceHttps();

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
if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
    $error = isset($_FILES['audio']) ? $_FILES['audio']['error'] : 'No file uploaded';
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
$allowedExtensions = ['wav', 'mp3', 'm4a', 'webm', 'ogg', 'opus'];

if (!in_array($ext, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file extension: ' . $ext]);
    exit;
}

// Extract language from filename (format: cardNum.lang.word.ext)
// Example: "123.ceb.tilaw.m4a" -> lang = "ceb"
$parts = explode('.', $filename);
$lang = 'ceb'; // Default to Cebuano
if (count($parts) >= 2 && in_array($parts[1], ['ceb', 'mrw', 'sin'])) {
    $lang = $parts[1];
}

// Define upload directory: /assets/audio/{lang}/
$uploadDir = __DIR__ . '/assets/audio/' . $lang . '/';

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

// Check if file already exists
$fileExists = file_exists($targetPath);
$confirmOverwrite = isset($_POST['confirmOverwrite']) && $_POST['confirmOverwrite'] === 'true';

// If file exists and user hasn't confirmed overwrite, ask for confirmation
if ($fileExists && !$confirmOverwrite) {
    echo json_encode([
        'success' => false,
        'fileExists' => true,
        'filename' => $filename,
        'message' => 'File already exists. Overwrite?'
    ]);
    exit;
}

// If file exists and user confirmed, backup the old file
if ($fileExists && $confirmOverwrite) {
    // Backup directory: /assets/audio/old/
    $oldDir = __DIR__ . '/assets/audio/old/';

    // Create old directory if it doesn't exist
    if (!is_dir($oldDir)) {
        if (!mkdir($oldDir, 0755, true)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not create backup directory']);
            exit;
        }
    }

    // Get file creation time
    $fileCreationTime = filectime($targetPath);
    $dateStr = date('Y-m-d-His', $fileCreationTime);

    // Generate backup filename: original.2025-11-25-123456.ext
    $pathInfo = pathinfo($filename);
    $backupFilename = $pathInfo['filename'] . '.' . $dateStr . '.' . $pathInfo['extension'];
    $backupPath = $oldDir . $backupFilename;

    // Move old file to backup location
    if (!rename($targetPath, $backupPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to backup old file']);
        exit;
    }
}

// Move uploaded file
if (move_uploaded_file($_FILES['audio']['tmp_name'], $targetPath)) {
    // Set proper permissions
    chmod($targetPath, 0644);

    $response = [
        'success' => true,
        'filename' => $filename,
        'path' => 'assets/audio/' . $lang . '/' . $filename,
        'size' => filesize($targetPath)
    ];

    // If we backed up a file, include that info
    if ($fileExists && $confirmOverwrite && isset($backupFilename)) {
        $response['backedUp'] = true;
        $response['backupFile'] = $backupFilename;
    }

    echo json_encode($response);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
?>
