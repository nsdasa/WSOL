<?php
/**
 * Save Deck Changes - Persists deck builder changes to CSV files
 * Receives updated card data and writes back to language-specific CSV files
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Only allow POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed');
    }

    // Get JSON payload
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    // Validate required fields
    if (!isset($data['trigraph']) || !isset($data['languageName']) || !isset($data['cards'])) {
        throw new Exception('Missing required fields: trigraph, languageName, or cards');
    }

    $trigraph = $data['trigraph'];
    $languageName = $data['languageName'];
    $cards = $data['cards'];

    // Validate trigraph
    $allowedTrigraphs = ['ceb', 'mrw', 'sin', 'eng'];
    if (!in_array($trigraph, $allowedTrigraphs)) {
        throw new Exception('Invalid trigraph: ' . $trigraph);
    }

    // Define CSV path
    $assetsDir = __DIR__ . '/assets';
    $csvPath = $assetsDir . '/Word_List_' . $languageName . '.csv';

    // Check if assets directory exists
    if (!is_dir($assetsDir)) {
        throw new Exception('Assets directory not found');
    }

    // Check if directory is writable
    if (!is_writable($assetsDir)) {
        throw new Exception('Assets directory is not writable');
    }

    // Generate CSV content
    $csv = generateCSVContent($cards);

    // Write to file
    $result = file_put_contents($csvPath, $csv);

    if ($result === false) {
        throw new Exception('Failed to write CSV file');
    }

    // Set proper permissions
    chmod($csvPath, 0644);

    // Clear file cache
    clearstatcache(true, $csvPath);

    echo json_encode([
        'success' => true,
        'message' => 'Changes saved successfully',
        'file' => $csvPath,
        'cardCount' => count($cards),
        'bytes' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

/**
 * Generate CSV content from card array
 */
function generateCSVContent($cards) {
    $headers = [
        'Lesson', 'CardNum', 'Word', 'WordNote', 'English', 'EnglishNote',
        'Grammar', 'Category', 'SubCategory1', 'SubCategory2', 'ACTFLEst', 'Type'
    ];

    $csv = implode(',', $headers) . "\n";

    foreach ($cards as $card) {
        $row = [
            isset($card['lesson']) ? $card['lesson'] : '',
            isset($card['cardNum']) ? $card['cardNum'] : (isset($card['wordNum']) ? $card['wordNum'] : ''),
            escapeCSV(isset($card['word']) ? $card['word'] : ''),
            escapeCSV(isset($card['wordNote']) ? $card['wordNote'] : ''),
            escapeCSV(isset($card['english']) ? $card['english'] : ''),
            escapeCSV(isset($card['englishNote']) ? $card['englishNote'] : ''),
            escapeCSV(isset($card['grammar']) ? $card['grammar'] : ''),
            escapeCSV(isset($card['category']) ? $card['category'] : ''),
            escapeCSV(isset($card['subCategory1']) ? $card['subCategory1'] : ''),
            escapeCSV(isset($card['subCategory2']) ? $card['subCategory2'] : ''),
            escapeCSV(isset($card['actflEst']) ? $card['actflEst'] : ''),
            isset($card['type']) ? $card['type'] : 'N'
        ];
        $csv .= implode(',', $row) . "\n";
    }

    return $csv;
}

/**
 * Escape CSV field value
 */
function escapeCSV($value) {
    if ($value === null || $value === '') {
        return '';
    }

    $value = strval($value);

    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (strpos($value, ',') !== false || strpos($value, '"') !== false || strpos($value, "\n") !== false) {
        $value = '"' . str_replace('"', '""', $value) . '"';
    }

    return $value;
}
?>
