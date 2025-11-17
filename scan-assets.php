<?php
// scan-assets.php - Scans assets folder and generates manifest.json with COMPLETE CACHE PREVENTION
// Handles CSV uploads, media uploads, and asset scanning

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
// CONFIGURATION
// =================================================================

$assetsDir = __DIR__ . '/assets';
$manifestPath = $assetsDir . '/manifest.json';

// =================================================================
// DETERMINE ACTION
// =================================================================

$action = isset($_GET['action']) ? $_GET['action'] : 'scan';

switch ($action) {
    case 'upload':
        handleCSVUpload();
        break;
    case 'uploadMedia':
        handleMediaUpload();
        break;
    case 'scan':
    default:
        scanAssets();
        break;
}

// =================================================================
// HANDLE CSV UPLOAD
// =================================================================

function handleCSVUpload() {
    global $assetsDir;
    
    try {
        // Check if files were uploaded
        $languageFile = isset($_FILES['languageFile']) ? $_FILES['languageFile'] : null;
        $wordFile = isset($_FILES['wordFile']) ? $_FILES['wordFile'] : null;
        
        if (!$languageFile && !$wordFile) {
            throw new Exception('No files uploaded');
        }
        
        // Process language file
        if ($languageFile) {
            $targetPath = $assetsDir . '/Language_List.csv';
            if (!move_uploaded_file($languageFile['tmp_name'], $targetPath)) {
                throw new Exception('Failed to save Language_List.csv');
            }
            // Clear cache for new file
            clearstatcache(true, $targetPath);
        }
        
        // Process word file
        if ($wordFile) {
            $targetPath = $assetsDir . '/Word_List.csv';
            if (!move_uploaded_file($wordFile['tmp_name'], $targetPath)) {
                throw new Exception('Failed to save Word_List.csv');
            }
            // Clear cache for new file
            clearstatcache(true, $targetPath);
        }
        
        // Now scan assets to generate manifest
        scanAssets();
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// =================================================================
// HANDLE MEDIA UPLOAD
// =================================================================

function handleMediaUpload() {
    global $assetsDir;
    
    try {
        $imageFiles = isset($_FILES['imageFiles']) ? $_FILES['imageFiles'] : null;
        $audioFiles = isset($_FILES['audioFiles']) ? $_FILES['audioFiles'] : null;
        
        $imagesUploaded = 0;
        $audioUploaded = 0;
        
        // Process image files
        if ($imageFiles && isset($imageFiles['name'])) {
            for ($i = 0; $i < count($imageFiles['name']); $i++) {
                if ($imageFiles['error'][$i] === UPLOAD_ERR_OK) {
                    $filename = basename($imageFiles['name'][$i]);
                    $targetPath = $assetsDir . '/' . $filename;
                    
                    if (move_uploaded_file($imageFiles['tmp_name'][$i], $targetPath)) {
                        $imagesUploaded++;
                        // Clear cache for new file
                        clearstatcache(true, $targetPath);
                    }
                }
            }
        }
        
        // Process audio files
        if ($audioFiles && isset($audioFiles['name'])) {
            for ($i = 0; $i < count($audioFiles['name']); $i++) {
                if ($audioFiles['error'][$i] === UPLOAD_ERR_OK) {
                    $filename = basename($audioFiles['name'][$i]);
                    $targetPath = $assetsDir . '/' . $filename;
                    
                    if (move_uploaded_file($audioFiles['tmp_name'][$i], $targetPath)) {
                        $audioUploaded++;
                        // Clear cache for new file
                        clearstatcache(true, $targetPath);
                    }
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'imagesUploaded' => $imagesUploaded,
                'audioUploaded' => $audioUploaded
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// =================================================================
// SCAN ASSETS AND GENERATE MANIFEST
// =================================================================

function scanAssets() {
    global $assetsDir, $manifestPath;
    
    try {
        // Clear all file caches before starting
        clearstatcache(true);
        
        // Check if assets directory exists
        if (!is_dir($assetsDir)) {
            throw new Exception('Assets directory not found');
        }
        
        // Load CSV files
        $languages = loadLanguageList($assetsDir . '/Language_List.csv');
        $cards = loadWordList($assetsDir . '/Word_List.csv');
        
        // Scan for image and audio files
        clearstatcache(true, $assetsDir);
        $entries = scandir($assetsDir);
        
        if ($entries === false) {
            throw new Exception('Failed to scan assets directory');
        }
        
        $stats = [
            'totalCards' => count($cards),
            'cardsWithAudio' => 0,
            'totalPng' => 0,
            'totalGif' => 0,
            'totalAudio' => 0
        ];
        
        $issues = [];
        
        // Map files to cards
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            
            $fullPath = $assetsDir . '/' . $entry;
            clearstatcache(true, $fullPath);
            
            if (!is_file($fullPath)) {
                continue;
            }
            
            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            
            // Process PNG files
            if ($ext === 'png') {
                $stats['totalPng']++;
                $wordNum = extractWordNum($entry);
                if ($wordNum !== null) {
                    foreach ($cards as &$card) {
                        if ($card['wordNum'] === $wordNum) {
                            $card['printImagePath'] = 'assets/' . $entry;
                            $card['hasImage'] = true;
                            break;
                        }
                    }
                }
            }
            
            // Process GIF files
            if ($ext === 'gif') {
                $stats['totalGif']++;
                $wordNum = extractWordNum($entry);
                if ($wordNum !== null) {
                    foreach ($cards as &$card) {
                        if ($card['wordNum'] === $wordNum) {
                            $card['imagePath'] = 'assets/' . $entry;
                            $card['hasGif'] = true;
                            $card['hasImage'] = true;
                            break;
                        }
                    }
                }
            }
            
            // Process audio files (MP3/M4A)
            if ($ext === 'mp3' || $ext === 'm4a') {
                $stats['totalAudio']++;
                list($wordNum, $lang) = extractAudioInfo($entry);
                
                if ($wordNum !== null && $lang !== null) {
                    foreach ($cards as &$card) {
                        if ($card['wordNum'] === $wordNum) {
                            if (!isset($card['audio'])) {
                                $card['audio'] = [];
                            }
                            $card['audio'][$lang] = 'assets/' . $entry;
                            $card['hasAudio'] = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Count cards with audio
        foreach ($cards as $card) {
            if (isset($card['hasAudio']) && $card['hasAudio']) {
                $stats['cardsWithAudio']++;
            }
        }
        
        // Generate manifest
        $manifest = [
            'version' => '3.0',
            'lastUpdated' => date('c'),
            'languages' => $languages,
            'cards' => $cards,
            'stats' => $stats
        ];
        
        // Clear cache for manifest path before writing
        clearstatcache(true, $manifestPath);
        
        // Write manifest.json
        $json = json_encode($manifest, JSON_PRETTY_PRINT);
        if (file_put_contents($manifestPath, $json) === false) {
            throw new Exception('Failed to write manifest.json');
        }
        
        // Clear cache for newly written manifest
        clearstatcache(true, $manifestPath);
        
        // Invalidate manifest from OpCache if possible
        if (function_exists('opcache_invalidate')) {
            opcache_invalidate($manifestPath, true);
        }
        
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'issues' => $issues,
            'manifestPath' => 'assets/manifest.json',
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

function loadLanguageList($path) {
    clearstatcache(true, $path);
    
    if (!file_exists($path)) {
        // Return default languages if file doesn't exist
        return [
            ['id' => 1, 'name' => 'Cebuano', 'trigraph' => 'ceb'],
            ['id' => 2, 'name' => 'English', 'trigraph' => 'eng'],
            ['id' => 3, 'name' => 'Maranao', 'trigraph' => 'mrw'],
            ['id' => 4, 'name' => 'Sinama', 'trigraph' => 'sin']
        ];
    }
    
    $languages = [];
    $file = fopen($path, 'r');
    
    if ($file) {
        // Skip header row
        fgetcsv($file);
        
        while (($row = fgetcsv($file)) !== false) {
            if (count($row) >= 3) {
                $languages[] = [
                    'id' => intval($row[0]),
                    'name' => trim($row[1]),
                    'trigraph' => strtolower(trim($row[2]))
                ];
            }
        }
        
        fclose($file);
    }
    
    return $languages;
}

function loadWordList($path) {
    clearstatcache(true, $path);
    
    if (!file_exists($path)) {
        return [];
    }
    
    $cards = [];
    $file = fopen($path, 'r');
    
    if ($file) {
        // Read header to get column indices
        $headers = fgetcsv($file);
        
        while (($row = fgetcsv($file)) !== false) {
            if (count($row) < 16) continue;
            
            $card = [
                'lesson' => intval($row[0]),
                'wordNum' => intval($row[1]),
                'type' => isset($row[15]) ? trim($row[15]) : 'N',
                'translations' => [
                    'cebuano' => [
                        'word' => trim($row[2]),
                        'note' => trim($row[3]),
                        'acceptableAnswers' => explode('/', trim($row[2]))
                    ],
                    'english' => [
                        'word' => trim($row[4]),
                        'note' => trim($row[5]),
                        'acceptableAnswers' => explode('/', trim($row[4]))
                    ],
                    'maranao' => [
                        'word' => trim($row[6]),
                        'note' => trim($row[7]),
                        'acceptableAnswers' => explode('/', trim($row[6]))
                    ],
                    'sinama' => [
                        'word' => trim($row[8]),
                        'note' => trim($row[9]),
                        'acceptableAnswers' => explode('/', trim($row[8]))
                    ]
                ],
                'grammar' => isset($row[10]) ? trim($row[10]) : null,
                'category' => isset($row[11]) ? trim($row[11]) : null,
                'subCategory1' => isset($row[12]) ? trim($row[12]) : null,
                'subCategory2' => isset($row[13]) ? trim($row[13]) : null,
                'actflEst' => isset($row[14]) ? trim($row[14]) : null,
                'hasImage' => false,
                'hasGif' => false,
                'hasAudio' => false,
                'printImagePath' => null,
                'imagePath' => null,
                'audio' => []
            ];
            
            $cards[] = $card;
        }
        
        fclose($file);
    }
    
    return $cards;
}

function extractWordNum($filename) {
    // Extract word number from filename: "17.tilaw.taste.png" -> 17
    if (preg_match('/^(\d+)\./', $filename, $matches)) {
        return intval($matches[1]);
    }
    return null;
}

function extractAudioInfo($filename) {
    // Extract word number and language from audio filename
    // Format: "17.ceb.tilaw.taste.mp3" -> [17, 'ceb']
    if (preg_match('/^(\d+)\.([a-z]{3})\./', $filename, $matches)) {
        return [intval($matches[1]), $matches[2]];
    }
    return [null, null];
}
?>