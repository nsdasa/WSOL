<?php
/**
 * Asset Scanner API - Bob and Mariel Ward School of Filipino Languages
 * Version 3.0 - Multi-language, Multi-lesson Support
 * Fixed version with improved error handling
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(120);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Configuration
define('ASSETS_DIR', __DIR__ . '/assets');
define('MANIFEST_FILE', ASSETS_DIR . '/manifest.json');
define('LANGUAGE_CSV', ASSETS_DIR . '/Language_List.csv');
define('WORD_CSV', ASSETS_DIR . '/Word_List.csv');

/**
 * Load and parse Language_List.csv
 */
function loadLanguages() {
    if (!file_exists(LANGUAGE_CSV)) {
        return ['success' => false, 'error' => 'Language_List.csv not found in assets folder'];
    }
    
    $languages = [];
    $file = fopen(LANGUAGE_CSV, 'r');
    
    if (!$file) {
        return ['success' => false, 'error' => 'Cannot open Language_List.csv'];
    }
    
    // Skip header row (with BOM if present)
    $header = fgets($file);
    
    $lineNumber = 1; // Track line numbers for better error reporting
    while (($row = fgetcsv($file)) !== false) {
        $lineNumber++;
        
        // Skip empty rows
        if (empty($row) || (count($row) === 1 && trim($row[0]) === '')) {
            continue;
        }
        
        // Validate row has minimum required columns (3 for Language_List)
        if (count($row) < 3) {
            error_log("Language_List.csv line $lineNumber: Insufficient columns (expected 3, got " . count($row) . ")");
            continue;
        }
        
        // Validate and sanitize data
        $id = isset($row[0]) && is_numeric(trim($row[0])) ? (int)trim($row[0]) : null;
        $name = isset($row[1]) ? trim($row[1]) : '';
        $trigraph = isset($row[2]) ? strtolower(trim($row[2])) : '';
        
        // Skip if essential data is missing
        if ($id === null || empty($name) || empty($trigraph)) {
            error_log("Language_List.csv line $lineNumber: Missing essential data (ID: $id, Name: '$name', Trigraph: '$trigraph')");
            continue;
        }
        
        // Validate trigraph is exactly 3 characters
        if (strlen($trigraph) !== 3) {
            error_log("Language_List.csv line $lineNumber: Invalid trigraph '$trigraph' (must be exactly 3 characters)");
            continue;
        }
        
        if (!empty($id) && !empty($name) && !empty($trigraph)) {
            $languages[] = [
                'id' => $id,
                'name' => $name,
                'trigraph' => $trigraph
            ];
        }
    }
    
    fclose($file);
    return ['success' => true, 'languages' => $languages];
}

/**
 * Load and parse Word_List.csv
 */
function loadWords() {
    if (!file_exists(WORD_CSV)) {
        return ['success' => false, 'error' => 'Word_List.csv not found in assets folder'];
    }
    
    $words = [];
    $file = fopen(WORD_CSV, 'r');
    
    if (!$file) {
        return ['success' => false, 'error' => 'Cannot open Word_List.csv'];
    }
    
    // Skip header row
    fgets($file);
    
    $lineNumber = 1;
    while (($row = fgetcsv($file)) !== false) {
        $lineNumber++;
        
        // Skip empty rows
        if (empty($row) || (count($row) === 1 && trim($row[0]) === '')) {
            continue;
        }
        
        // Validate row has minimum required columns
        if (count($row) < 15) {
            error_log("Word_List.csv line $lineNumber: Insufficient columns (expected at least 15, got " . count($row) . ")");
            continue;
        }
        
        // Validate wordNum exists and is numeric
        if (!isset($row[1]) || !is_numeric(trim($row[1]))) {
            error_log("Word_List.csv line $lineNumber: Invalid or missing word number");
            continue;
        }
        
        $wordNum = (int)trim($row[1]);
        
        // Validate at least one translation exists
        $cebuano = trim($row[2] ?? '');
        $english = trim($row[4] ?? '');
        
        if (empty($cebuano) && empty($english)) {
            error_log("Word_List.csv line $lineNumber: No translations found for word $wordNum");
            continue;
        }
        
        if (!empty($wordNum)) {
            $words[$wordNum] = [
                'wordNum' => $wordNum,
                'lesson' => isset($row[0]) && is_numeric(trim($row[0])) ? (int)trim($row[0]) : 0,
                'cebuano' => $cebuano,
                'cebuanoNote' => trim($row[3] ?? ''),
                'english' => $english,
                'englishNote' => trim($row[5] ?? ''),
                'maranao' => trim($row[6] ?? ''),
                'maranaoNote' => trim($row[7] ?? ''),
                'sinama' => trim($row[8] ?? ''),
                'sinamaNote' => trim($row[9] ?? ''),
                'grammar' => trim($row[10] ?? ''),
                'category' => trim($row[11] ?? ''),
                'subCategory1' => trim($row[12] ?? ''),
                'subCategory2' => trim($row[13] ?? ''),
                'actflEst' => trim($row[14] ?? ''),
                'wordVersion' => trim($row[15] ?? '')
            ];
        }
    }
    
    fclose($file);
    return ['success' => true, 'words' => $words];
}

/**
 * Generate detailed scan report with file matching information
 */
function generateDetailedReport($wordData, $cards, $pngFiles, $gifFiles, $mp3Files) {
    $report = [
        'summary' => [
            'timestamp' => date('Y-m-d H:i:s'),
            'totalWordsInCSV' => count($wordData),
            'totalCardsCreated' => count($cards),
            'filesScanned' => [
                'png' => count($pngFiles),
                'gif' => count($gifFiles),
                'mp3' => count($mp3Files)
            ]
        ],
        'detailedMatches' => []
    ];
    
    // Create detailed table for each word in CSV
    foreach ($wordData as $wordNum => $word) {
        $cardExists = isset($cards[$wordNum]);
        $card = $cardExists ? $cards[$wordNum] : null;
        
        $match = [
            'wordNum' => $wordNum,
            'lesson' => $word['lesson'],
            'cebuano' => $word['cebuano'],
            'english' => $word['english'],
            'maranao' => $word['maranao'],
            'sinama' => $word['sinama'],
            'hasCard' => $cardExists,
            'files' => [
                'png' => null,
                'gif' => null,
                'audio' => []
            ],
            'status' => 'missing'
        ];
        
        if ($cardExists) {
            // Check for PNG
            if ($card['printImagePath']) {
                $match['files']['png'] = basename($card['printImagePath']);
            }
            
            // Check for GIF
            if (isset($card['hasGif']) && $card['hasGif']) {
                $match['files']['gif'] = basename($card['imagePath']);
            }
            
            // Check for audio files
            foreach ($card['audio'] as $lang => $path) {
                $match['files']['audio'][$lang] = basename($path);
            }
            
            // Determine status
            $hasPng = !empty($match['files']['png']);
            $hasGif = !empty($match['files']['gif']);
            $hasAudio = !empty($match['files']['audio']);
            
            if ($hasPng && $hasGif && $hasAudio) {
                $match['status'] = 'complete-animated';
            } elseif ($hasPng && $hasAudio) {
                $match['status'] = 'complete-static';
            } elseif ($hasGif && !$hasPng) {
                $match['status'] = 'gif-only';
            } elseif ($hasPng || $hasGif) {
                $match['status'] = 'image-only';
            } elseif ($hasAudio) {
                $match['status'] = 'audio-only';
            } else {
                $match['status'] = 'partial';
            }
        }
        
        $report['detailedMatches'][] = $match;
    }
    
    return $report;
}

/**
 * Scan the assets directory for PNG and MP3 files
 */
function scanAssets() {
    $cards = [];
    $issues = [];
    
    // Check if assets directory exists
    if (!is_dir(ASSETS_DIR)) {
        return [
            'success' => false,
            'error' => 'Assets directory not found. Please create an "assets" folder.',
            'cards' => [],
            'issues' => []
        ];
    }
    
    // Load CSV data
    $languagesResult = loadLanguages();
    if (!$languagesResult['success']) {
        return [
            'success' => false,
            'error' => $languagesResult['error'],
            'cards' => [],
            'issues' => []
        ];
    }
    $languages = $languagesResult['languages'];
    
    $wordsResult = loadWords();
    if (!$wordsResult['success']) {
        return [
            'success' => false,
            'error' => $wordsResult['error'],
            'cards' => [],
            'issues' => []
        ];
    }
    $wordData = $wordsResult['words'];
    
    // Get all image files (PNG and GIF)
    $pngFiles = glob(ASSETS_DIR . '/*.png');
    $gifFiles = glob(ASSETS_DIR . '/*.gif');
    if ($pngFiles === false) $pngFiles = [];
    if ($gifFiles === false) $gifFiles = [];
    
    // Process PNG files first
    foreach ($pngFiles as $pngPath) {
        $filename = basename($pngPath);
        
        // Skip logo.png
        if ($filename === 'logo.png') {
            continue;
        }
        
        // Parse filename: WordNum.anything.png
        if (preg_match('/^(\d+)\..*\.png$/', $filename, $matches)) {
            $wordNum = (int)$matches[1];
            
            // Check if this word exists in CSV
            if (!isset($wordData[$wordNum])) {
                $issues[] = [
                    'type' => 'warning',
                    'file' => $filename,
                    'message' => "Word #{$wordNum} not found in Word_List.csv"
                ];
                continue;
            }
            
            $word = $wordData[$wordNum];
            
            // Initialize card if not exists
            if (!isset($cards[$wordNum])) {
                $cards[$wordNum] = [
                    'wordNum' => $wordNum,
                    'lesson' => $word['lesson'],
                    'imagePath' => 'assets/' . $filename,      // Will be overridden by GIF if exists
                    'printImagePath' => 'assets/' . $filename, // Always PNG for printing
                    'hasImage' => true,
                    'hasGif' => false,
                    'hasAudio' => false,
                    'audio' => [],
                    'translations' => [],
                    'grammar' => $word['grammar'],
                    'category' => $word['category'],
                    'subCategory1' => $word['subCategory1'],
                    'subCategory2' => $word['subCategory2'],
                    'actflEst' => $word['actflEst'],
                    'wordVersion' => $word['wordVersion']
                ];
            } else {
                $cards[$wordNum]['printImagePath'] = 'assets/' . $filename;
                $cards[$wordNum]['hasImage'] = true;
            }
            
            // Add translations from CSV with acceptableAnswers for slash-separated words
            $cards[$wordNum]['translations'] = [
                'cebuano' => [
                    'word' => $word['cebuano'], 
                    'note' => $word['cebuanoNote'],
                    'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['cebuano']))))
                ],
                'english' => [
                    'word' => $word['english'], 
                    'note' => $word['englishNote'],
                    'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['english']))))
                ],
                'maranao' => [
                    'word' => $word['maranao'], 
                    'note' => $word['maranaoNote'],
                    'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['maranao']))))
                ],
                'sinama' => [
                    'word' => $word['sinama'], 
                    'note' => $word['sinamaNote'],
                    'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['sinama']))))
                ]
            ];
            
        } else {
            $issues[] = [
                'type' => 'error',
                'file' => $filename,
                'message' => 'Invalid filename format. Expected: WordNum.anything.gif (e.g., 17.tilaw.taste.gif)'
            ];
        }
    }
    
    // Process GIF files (override imagePath for online use if GIF exists)
    foreach ($gifFiles as $gifPath) {
        $filename = basename($gifPath);
        
        // Parse filename: WordNum.anything.gif
        if (preg_match('/^(\d+)\..*\.gif$/', $filename, $matches)) {
            $wordNum = (int)$matches[1];
            
            // Check if this word exists in CSV
            if (!isset($wordData[$wordNum])) {
                $issues[] = [
                    'type' => 'warning',
                    'file' => $filename,
                    'message' => "Word #{$wordNum} not found in Word_List.csv"
                ];
                continue;
            }
            
            $word = $wordData[$wordNum];
            
            // Initialize card if not exists (GIF without PNG)
            if (!isset($cards[$wordNum])) {
                $cards[$wordNum] = [
                    'wordNum' => $wordNum,
                    'lesson' => $word['lesson'],
                    'imagePath' => 'assets/' . $filename,      // GIF for online
                    'printImagePath' => null,                   // No PNG for printing
                    'hasImage' => true,
                    'hasGif' => true,
                    'hasAudio' => false,
                    'audio' => [],
                    'translations' => [
                        'cebuano' => [
                            'word' => $word['cebuano'], 
                            'note' => $word['cebuanoNote'],
                            'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['cebuano']))))
                        ],
                        'english' => [
                            'word' => $word['english'], 
                            'note' => $word['englishNote'],
                            'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['english']))))
                        ],
                        'maranao' => [
                            'word' => $word['maranao'], 
                            'note' => $word['maranaoNote'],
                            'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['maranao']))))
                        ],
                        'sinama' => [
                            'word' => $word['sinama'], 
                            'note' => $word['sinamaNote'],
                            'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['sinama']))))
                        ]
                    ],
                    'grammar' => $word['grammar'],
                    'category' => $word['category'],
                    'subCategory1' => $word['subCategory1'],
                    'subCategory2' => $word['subCategory2'],
                    'actflEst' => $word['actflEst'],
                    'wordVersion' => $word['wordVersion']
                ];
                
                $issues[] = [
                    'type' => 'warning',
                    'file' => $filename,
                    'message' => "GIF without PNG - card will not be printable"
                ];
            } else {
                // Override imagePath with GIF (PNG kept in printImagePath)
                $cards[$wordNum]['imagePath'] = 'assets/' . $filename;
                $cards[$wordNum]['hasGif'] = true;
            }
            
        } else {
            $issues[] = [
                'type' => 'error',
                'file' => $filename,
                'message' => 'Invalid filename format. Expected: WordNum.anything.gif (e.g., 17.tilaw.taste.gif)'
            ];
        }
    }
    
    // Get all MP3 files
    $mp3Files = glob(ASSETS_DIR . '/*.mp3');
    if ($mp3Files === false) {
        $mp3Files = [];
    }
    
    foreach ($mp3Files as $mp3Path) {
        $filename = basename($mp3Path);
        
        // Parse filename: WordNum.Trigraph.anything.mp3
        if (preg_match('/^(\d+)\.([a-z]{3})\..*\.mp3$/i', $filename, $matches)) {
            $wordNum = (int)$matches[1];
            $trigraph = strtolower($matches[2]);
            
            // Check if this word exists in our cards
            if (!isset($cards[$wordNum])) {
                // Word exists in audio but no image
                if (isset($wordData[$wordNum])) {
                    $word = $wordData[$wordNum];
                    $cards[$wordNum] = [
                        'wordNum' => $wordNum,
                        'lesson' => $word['lesson'],
                        'imagePath' => null,
                        'hasImage' => false,
                        'hasAudio' => false,
                        'audio' => [],
                        'translations' => [
                            'cebuano' => [
                                'word' => $word['cebuano'], 
                                'note' => $word['cebuanoNote'],
                                'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['cebuano']))))
                            ],
                            'english' => [
                                'word' => $word['english'], 
                                'note' => $word['englishNote'],
                                'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['english']))))
                            ],
                            'maranao' => [
                                'word' => $word['maranao'], 
                                'note' => $word['maranaoNote'],
                                'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['maranao']))))
                            ],
                            'sinama' => [
                                'word' => $word['sinama'], 
                                'note' => $word['sinamaNote'],
                                'acceptableAnswers' => array_values(array_filter(array_map('trim', explode('/', $word['sinama']))))
                            ]
                        ],
                        'grammar' => $word['grammar'],
                        'category' => $word['category'],
                        'subCategory1' => $word['subCategory1'],
                        'subCategory2' => $word['subCategory2'],
                        'actflEst' => $word['actflEst'],
                        'wordVersion' => $word['wordVersion']
                    ];
                } else {
                    $issues[] = [
                        'type' => 'warning',
                        'file' => $filename,
                        'message' => "Word #{$wordNum} not found in Word_List.csv"
                    ];
                    continue;
                }
            }
            
            // Add audio file for this language
            $cards[$wordNum]['audio'][$trigraph] = 'assets/' . $filename;
            $cards[$wordNum]['hasAudio'] = true;
            
        } else {
            $issues[] = [
                'type' => 'error',
                'file' => $filename,
                'message' => 'Invalid filename format. Expected: WordNum.Trigraph.anything.mp3 (e.g., 17.ceb.tilaw.taste.mp3)'
            ];
        }
    }
    
    // Check for words in CSV without any assets
    foreach ($wordData as $wordNum => $word) {
        if (!isset($cards[$wordNum])) {
            $issues[] = [
                'type' => 'warning',
                'file' => "Word #{$wordNum}",
                'message' => "Word '{$word['cebuano']}' ({$word['english']}) has no image or audio files"
            ];
        }
    }
    
    // Group by lessons for stats
    $lessonStats = [];
    $cardsWithAudio = 0;
    $cardsWithGif = 0;
    $cardsWithPng = 0;
    $cardsWithBoth = 0;
    
    foreach ($cards as $card) {
        $lesson = $card['lesson'];
        if (!isset($lessonStats[$lesson])) {
            $lessonStats[$lesson] = ['total' => 0, 'withImage' => 0, 'withGif' => 0, 'withPng' => 0, 'audioCount' => []];
        }
        $lessonStats[$lesson]['total']++;
        if ($card['hasImage']) {
            $lessonStats[$lesson]['withImage']++;
        }
        
        // Count GIFs and PNGs
        if (isset($card['hasGif']) && $card['hasGif']) {
            $cardsWithGif++;
            $lessonStats[$lesson]['withGif']++;
        }
        if (isset($card['printImagePath']) && $card['printImagePath']) {
            $cardsWithPng++;
            $lessonStats[$lesson]['withPng']++;
        }
        if (isset($card['hasGif']) && $card['hasGif'] && isset($card['printImagePath']) && $card['printImagePath']) {
            $cardsWithBoth++;
        }
        
        // Count cards with at least one audio file
        if (!empty($card['audio'])) {
            $cardsWithAudio++;
        }
        
        foreach ($card['audio'] as $lang => $path) {
            if (!isset($lessonStats[$lesson]['audioCount'][$lang])) {
                $lessonStats[$lesson]['audioCount'][$lang] = 0;
            }
            $lessonStats[$lesson]['audioCount'][$lang]++;
        }
    }
    
    // Generate detailed report
    $detailedReport = generateDetailedReport($wordData, $cards, $pngFiles, $gifFiles, $mp3Files);
    
    return [
        'success' => true,
        'cards' => array_values($cards),
        'languages' => $languages,
        'issues' => $issues,
        'stats' => [
            'totalCards' => count($cards),
            'totalImages' => count($pngFiles) + count($gifFiles) - 1, // Exclude logo.png
            'totalPng' => count($pngFiles) - 1, // Exclude logo.png
            'totalGif' => count($gifFiles),
            'totalAudio' => count($mp3Files),
            'cardsWithAudio' => $cardsWithAudio,
            'cardsWithGif' => $cardsWithGif,
            'cardsWithPng' => $cardsWithPng,
            'cardsWithBoth' => $cardsWithBoth,
            'lessonStats' => $lessonStats
        ],
        'detailedReport' => $detailedReport
    ];
}

/**
 * Generate and save HTML scan report
 */
function saveDetailedReport($detailedReport) {
    // Check if assets directory exists, create if not
    if (!is_dir(ASSETS_DIR)) {
        error_log("Assets directory doesn't exist, attempting to create: " . ASSETS_DIR);
        if (!mkdir(ASSETS_DIR, 0755, true)) {
            error_log("FAILED to create assets directory: " . ASSETS_DIR);
            return false;
        }
    }
    
    // Check if directory is writable
    if (!is_writable(ASSETS_DIR)) {
        error_log("Assets directory is not writable: " . ASSETS_DIR);
        error_log("Directory permissions: " . substr(sprintf('%o', fileperms(ASSETS_DIR)), -4));
        return false;
    }
    
    $html = generateReportHTML($detailedReport);
    $reportFile = ASSETS_DIR . '/scan-report.html';
    
    error_log("Attempting to save report to: " . $reportFile);
    error_log("HTML length: " . strlen($html) . " bytes");
    
    $saved = file_put_contents($reportFile, $html);
    
    if ($saved === false) {
        error_log("FAILED to save report file");
        $error = error_get_last();
        if ($error) {
            error_log("Last error: " . $error['message']);
        }
        return false;
    }
    
    error_log("Successfully saved report: $saved bytes written to $reportFile");
    error_log("File exists after write: " . (file_exists($reportFile) ? 'yes' : 'no'));
    
    return $reportFile;
}

/**
 * Generate HTML for detailed report
 */
function generateReportHTML($report) {
    $timestamp = $report['summary']['timestamp'];
    $totalWords = $report['summary']['totalWordsInCSV'];
    $totalCards = $report['summary']['totalCardsCreated'];
    $pngCount = $report['summary']['filesScanned']['png'];
    $gifCount = $report['summary']['filesScanned']['gif'];
    $mp3Count = $report['summary']['filesScanned']['mp3'];
    
    $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Asset Scan Report - ' . $timestamp . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .stat-box { background: white; padding: 15px; border-radius: 5px; text-align: center; border-left: 4px solid #3498db; }
        .stat-box .number { font-size: 32px; font-weight: bold; color: #2c3e50; }
        .stat-box .label { color: #7f8c8d; font-size: 14px; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #34495e; color: white; padding: 12px; text-align: left; font-weight: 600; position: sticky; top: 0; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f8f9fa; }
        .status { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
        .status-complete-animated { background: #27ae60; color: white; }
        .status-complete-static { background: #2ecc71; color: white; }
        .status-gif-only { background: #f39c12; color: white; }
        .status-image-only { background: #e67e22; color: white; }
        .status-audio-only { background: #9b59b6; color: white; }
        .status-partial { background: #e74c3c; color: white; }
        .status-missing { background: #95a5a6; color: white; }
        .file-badge { display: inline-block; padding: 3px 6px; margin: 2px; background: #3498db; color: white; border-radius: 3px; font-size: 11px; }
        .file-badge.png { background: #1abc9c; }
        .file-badge.gif { background: #e67e22; }
        .file-badge.audio { background: #9b59b6; }
        .lesson-badge { background: #3498db; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        .word { font-weight: 600; color: #2c3e50; }
        .legend { margin: 20px 0; padding: 15px; background: #ecf0f1; border-radius: 5px; }
        .legend-item { display: inline-block; margin-right: 20px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Asset Scan Report</h1>
        <p><strong>Generated:</strong> ' . $timestamp . '</p>
        
        <div class="summary">
            <h2>Summary Statistics</h2>
            <div class="summary-grid">
                <div class="stat-box">
                    <div class="number">' . $totalWords . '</div>
                    <div class="label">Words in CSV</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $totalCards . '</div>
                    <div class="label">Cards Created</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $pngCount . '</div>
                    <div class="label">PNG Files</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $gifCount . '</div>
                    <div class="label">GIF Files</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $mp3Count . '</div>
                    <div class="label">Audio Files</div>
                </div>
            </div>
        </div>
        
        <div class="legend">
            <strong>Status Legend:</strong><br>
            <div class="legend-item"><span class="status status-complete-animated">Complete (Animated)</span> - Has PNG, GIF, and Audio</div>
            <div class="legend-item"><span class="status status-complete-static">Complete (Static)</span> - Has PNG and Audio</div>
            <div class="legend-item"><span class="status status-gif-only">GIF Only</span> - Has GIF but no PNG (not printable)</div>
            <div class="legend-item"><span class="status status-image-only">Image Only</span> - Has image but no audio</div>
            <div class="legend-item"><span class="status status-audio-only">Audio Only</span> - Has audio but no image</div>
            <div class="legend-item"><span class="status status-partial">Partial</span> - Has card but incomplete</div>
            <div class="legend-item"><span class="status status-missing">Missing</span> - No assets found</div>
        </div>
        
        <h2>Detailed Card Matching</h2>
        <table>
            <thead>
                <tr>
                    <th>Lesson</th>
                    <th>Card#</th>
                    <th>Cebuano</th>
                    <th>English</th>
                    <th>Files Found</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>';
    
    foreach ($report['detailedMatches'] as $match) {
        $statusClass = 'status-' . $match['status'];
        $statusLabel = ucwords(str_replace('-', ' ', $match['status']));
        
        $files = '';
        if ($match['files']['png']) {
            $files .= '<span class="file-badge png">PNG: ' . htmlspecialchars($match['files']['png']) . '</span> ';
        }
        if ($match['files']['gif']) {
            $files .= '<span class="file-badge gif">GIF: ' . htmlspecialchars($match['files']['gif']) . '</span> ';
        }
        foreach ($match['files']['audio'] as $lang => $file) {
            $files .= '<span class="file-badge audio">' . strtoupper($lang) . ': ' . htmlspecialchars($file) . '</span> ';
        }
        if (empty($files)) {
            $files = '<span style="color: #95a5a6;">No files found</span>';
        }
        
        $html .= '<tr>
            <td><span class="lesson-badge">' . $match['lesson'] . '</span></td>
            <td><strong>' . $match['wordNum'] . '</strong></td>
            <td><span class="word">' . htmlspecialchars($match['cebuano']) . '</span></td>
            <td>' . htmlspecialchars($match['english']) . '</td>
            <td>' . $files . '</td>
            <td><span class="status ' . $statusClass . '">' . $statusLabel . '</span></td>
        </tr>';
    }
    
    $html .= '</tbody>
        </table>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d;">
            <p>Bob and Mariel Ward School of Filipino Languages - Asset Scan Report</p>
        </div>
    </div>
</body>
</html>';
    
    return $html;
}

/**
 * Generate and save manifest.json file
 */
function generateManifest($scanResult) {
    $manifest = [
        'version' => '3.0',
        'lastUpdated' => date('c'),
        'languages' => $scanResult['languages'],
        'totalCards' => $scanResult['stats']['totalCards'],
        'lessonStats' => $scanResult['stats']['lessonStats'],
        'cards' => $scanResult['cards']
    ];
    
    // Save to file
    $json = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    if ($json === false) {
        error_log("JSON encoding failed: " . json_last_error_msg());
        return false;
    }
    
    $saved = file_put_contents(MANIFEST_FILE, $json);
    
    if ($saved === false) {
        error_log("Failed to write manifest to: " . MANIFEST_FILE);
        error_log("Directory writable: " . (is_writable(dirname(MANIFEST_FILE)) ? 'yes' : 'no'));
    } else {
        error_log("Manifest saved successfully: " . MANIFEST_FILE . " ($saved bytes)");
    }
    
    return $saved !== false;
}

/**
 * Main API handler
 */
function handleRequest() {
    $action = isset($_GET['action']) ? $_GET['action'] : 'scan';
    
    switch ($action) {
        case 'scan':
            // Scan assets directory
            $result = scanAssets();
            
            if ($result['success']) {
                // Generate manifest file
                $saved = generateManifest($result);
                
                // Generate and save detailed report
                $reportPath = saveDetailedReport($result['detailedReport']);
                
                $response = [
                    'success' => true,
                    'message' => 'Assets scanned and manifest.json updated successfully',
                    'manifestSaved' => $saved,
                    'manifestPath' => MANIFEST_FILE,
                    'manifestExists' => file_exists(MANIFEST_FILE),
                    'reportPath' => $reportPath ? str_replace(__DIR__ . '/', '', $reportPath) : null,
                    'reportUrl' => $reportPath ? 'assets/scan-report.html' : null,
                    'reportSaved' => $reportPath !== false,
                    'reportExists' => $reportPath ? file_exists($reportPath) : false,
                    'stats' => $result['stats'],
                    'languages' => $result['languages'],
                    'cards' => $result['cards'],
                    'issues' => $result['issues']
                ];
                
                if (!$saved) {
                    $response['warning'] = 'Manifest file could not be saved';
                    $response['manifestDir'] = dirname(MANIFEST_FILE);
                    $response['manifestDirWritable'] = is_writable(dirname(MANIFEST_FILE));
                }
                
                if (!$reportPath) {
                    $response['reportWarning'] = 'Report HTML file could not be saved';
                    $response['assetsDir'] = ASSETS_DIR;
                    $response['assetsDirExists'] = is_dir(ASSETS_DIR);
                    $response['assetsDirWritable'] = is_dir(ASSETS_DIR) ? is_writable(ASSETS_DIR) : false;
                }
                
                return $response;
            } else {
                return $result;
            }
            
        case 'status':
            // Just check status without updating
            if (file_exists(MANIFEST_FILE)) {
                $manifest = json_decode(file_get_contents(MANIFEST_FILE), true);
                return [
                    'success' => true,
                    'manifestExists' => true,
                    'lastUpdated' => isset($manifest['lastUpdated']) ? $manifest['lastUpdated'] : 'Unknown',
                    'totalCards' => isset($manifest['totalCards']) ? $manifest['totalCards'] : 0,
                    'languages' => isset($manifest['languages']) ? $manifest['languages'] : []
                ];
            } else {
                return [
                    'success' => false,
                    'manifestExists' => false,
                    'message' => 'manifest.json not found. Click "Scan Assets" to create it.'
                ];
            }
            
        case 'test':
            // Test manifest creation
            $testManifest = [
                'version' => '3.0-test',
                'lastUpdated' => date('c'),
                'test' => true
            ];
            
            $json = json_encode($testManifest, JSON_PRETTY_PRINT);
            $saved = file_put_contents(MANIFEST_FILE, $json);
            
            return [
                'success' => $saved !== false,
                'message' => $saved ? 'Test manifest created' : 'Failed to create test manifest',
                'bytesWritten' => $saved,
                'manifestPath' => MANIFEST_FILE,
                'manifestExists' => file_exists(MANIFEST_FILE),
                'dirWritable' => is_writable(dirname(MANIFEST_FILE))
            ];
            
        default:
            return [
                'success' => false,
                'error' => 'Invalid action'
            ];
    }
}

// Process request and return JSON
try {
    $response = handleRequest();
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'line' => $e->getLine()
    ]);
}
?>
