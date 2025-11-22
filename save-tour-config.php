<?php
/**
 * Save Tour Configuration
 * Saves the tour-config.json file
 */

// Require authentication
session_start();
require_once 'config.php';

// Check if user is logged in as admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get the JSON data from the request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Validate the data structure
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data must be an object']);
    exit;
}

// Validate each module's steps
$validModules = ['flashcards', 'match', 'match-sound', 'quiz', 'rec'];
foreach ($data as $key => $value) {
    // Skip comment fields
    if (strpos($key, '_') === 0) continue;

    if (!in_array($key, $validModules)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Invalid module: $key"]);
        exit;
    }

    if (!is_array($value)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Module $key must be an array of steps"]);
        exit;
    }

    foreach ($value as $index => $step) {
        if (!isset($step['element']) || !isset($step['title']) || !isset($step['description'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Step $index in $key missing required fields (element, title, description)"]);
            exit;
        }
    }
}

// Create backup of existing config
$configPath = __DIR__ . '/tour-config.json';
$backupPath = __DIR__ . '/tour-config.backup.json';

if (file_exists($configPath)) {
    copy($configPath, $backupPath);
}

// Write the new config
$jsonOutput = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($jsonOutput === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to encode JSON']);
    exit;
}

$result = file_put_contents($configPath, $jsonOutput);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write config file']);
    exit;
}

// Return success
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Tour configuration saved successfully',
    'bytes' => $result
]);
