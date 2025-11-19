<?php
// scan-assets.php - FULLY RESTORED v4.0 - November 2025
// Generates complete manifest.json + detailed scan-report.html with full formatting
// Includes proper audio linking and comprehensive per-card breakdown

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

if (function_exists('opcache_invalidate')) opcache_invalidate(__FILE__, true);
if (function_exists('opcache_reset')) opcache_reset();
clearstatcache(true);

$assetsDir = __DIR__ . '/assets';
$manifestPath = $assetsDir . '/manifest.json';

$action = $_GET['action'] ?? 'scan';

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

// ------------------------------------------------
// 1. CSV UPLOAD HANDLER
// ------------------------------------------------
function handleCSVUpload() {
    global $assetsDir;

    try {
        $uploaded = false;

        if (isset($_FILES['languageFile']) && $_FILES['languageFile']['error'] === UPLOAD_ERR_OK) {
            $target = $assetsDir . '/Language_List.csv';
            move_uploaded_file($_FILES['languageFile']['tmp_name'], $target);
            clearstatcache(true, $target);
            $uploaded = true;
        }

        foreach (['ceb' => 'Cebuano', 'mrw' => 'Maranao', 'sin' => 'Sinama'] as $trig => $name) {
            $field = 'wordFile_' . $trig;
            if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
                $target = $assetsDir . '/Word_List_' . $name . '.csv';
                move_uploaded_file($_FILES[$field]['tmp_name'], $target);
                clearstatcache(true, $target);
                $uploaded = true;
            }
        }

        if (!$uploaded) throw new Exception('No files received');

        scanAssets(); // re-scan after upload
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ------------------------------------------------
// 2. MEDIA UPLOAD HANDLER
// ------------------------------------------------
function handleMediaUpload() {
    global $assetsDir;
    $stats = ['imagesUploaded' => 0, 'audioUploaded' => 0];

    foreach ($_FILES as $key => $files) {
        if (!is_array($files['name'])) {
            if ($files['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($files['name'], PATHINFO_EXTENSION));
                if (in_array($ext, ['png','gif','mp3','m4a'])) {
                    $target = $assetsDir . '/' . basename($files['name']);
                    if (move_uploaded_file($files['tmp_name'], $target)) {
                        if (in_array($ext, ['png','gif'])) $stats['imagesUploaded']++;
                        else $stats['audioUploaded']++;
                    }
                }
            }
        } else {
            foreach ($files['name'] as $i => $name) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                    if (in_array($ext, ['png','gif','mp3','m4a'])) {
                        $target = $assetsDir . '/' . basename($name);
                        if (move_uploaded_file($files['tmp_name'][$i], $target)) {
                            if (in_array($ext, ['png','gif'])) $stats['imagesUploaded']++;
                            else $stats['audioUploaded']++;
                        }
                    }
                }
            }
        }
    }

    scanAssets(); // always rescan after media upload
    echo json_encode(['success' => true, 'stats' => $stats]);
}

// ------------------------------------------------
// 3. MAIN SCAN FUNCTION
// ------------------------------------------------
function scanAssets() {
    global $assetsDir, $manifestPath;

    $languages = loadLanguageList($assetsDir . '/Language_List.csv');
    $langByTrigraph = [];
    foreach ($languages as $l) $langByTrigraph[$l['trigraph']] = $l['name'];

    // Temporary storage
    $cardsMaster = [];       // cardNum ? base data
    $images = [];            // cardNum ? png/gif paths
    $audioFiles = [];
    $pngFiles = [];
    $gifFiles = [];

    // Track file associations for detailed report
    $fileAssociations = [];

    // Scan directory once
    $allFiles = scandir($assetsDir);
    foreach ($allFiles as $f) {
        if ($f === '.' || $f === '..' || is_dir("$assetsDir/$f")) continue;
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
        if ($ext === 'png') $pngFiles[] = $f;
        elseif ($ext === 'gif') $gifFiles[] = $f;
        elseif (in_array($ext, ['mp3','m4a'])) $audioFiles[] = $f;
    }

    // Load every language's word list
    foreach ($languages as $lang) {
        $trig = $lang['trigraph'];
        $csv = "$assetsDir/Word_List_" . $langByTrigraph[$trig] . ".csv";
        $list = file_exists($csv) ? loadLanguageWordList($csv) : [];

        foreach ($list as $card) {
            $num = $card['cardNum'];
            if (!isset($cardsMaster[$num])) {
                $cardsMaster[$num] = [
                    'lesson' => $card['lesson'],
                    'cardNum' => $num,
                    'grammar' => $card['grammar'] ?? '',
                    'category' => $card['category'] ?? '',
                    'subCategory1' => $card['subCategory1'] ?? '',
                    'subCategory2' => $card['subCategory2'] ?? '',
                    'actflEst' => $card['actflEst'] ?? '',
                    'type' => $card['type'] ?? 'N',
                    'word' => [],
                    'english' => [],
                    'audio' => [],
                    'printImagePath' => null,
                    'hasGif' => false,
                    'pngFile' => null,
                    'gifFile' => null,
                    'audioFiles' => []
                ];
            }
            $cardsMaster[$num]['word'][$trig] = $card['word'];
            $cardsMaster[$num]['english'][$trig] = $card['english'];
        }
    }

    // Link PNGs
    foreach ($pngFiles as $f) {
        $num = extractWordNum($f);
        if ($num && isset($cardsMaster[$num])) {
            $path = "assets/$f";
            $cardsMaster[$num]['printImagePath'] = $path;
            $cardsMaster[$num]['pngFile'] = $f;
            $images[(string)$num]['png'] = $path;
        }
    }

    // Link GIFs
    foreach ($gifFiles as $f) {
        $num = extractWordNum($f);
        if ($num && isset($cardsMaster[$num])) {
            $cardsMaster[$num]['hasGif'] = true;
            $cardsMaster[$num]['gifFile'] = $f;
            $images[(string)$num]['gif'] = "assets/$f";
        }
    }

    // Link Audio
    foreach ($audioFiles as $f) {
        list($num, $trig) = extractAudioInfo($f);
        if ($num && $trig && isset($cardsMaster[$num])) {
            $path = "assets/$f";
            $cardsMaster[$num]['audio'][$trig] = $path;
            $cardsMaster[$num]['audioFiles'][$trig] = $f;
        }
    }

    // Build final per-language card arrays (v4.0 structure)
    $finalCards = [];
    $stats = [
        'totalPng' => count($pngFiles),
        'totalGif' => count($gifFiles),
        'totalAudio' => count($audioFiles),
        'totalCards' => 0,
        'cardsWithAudio' => 0,
        'totalImages' => count($images),
        'languageStats' => []
    ];

    foreach ($languages as $lang) {
        $trig = $lang['trigraph'];
        $finalCards[$trig] = [];
        $langStats = ['totalCards' => 0, 'cardsWithAudio' => 0, 'lessons' => []];

        foreach ($cardsMaster as $c) {
            if (!isset($c['word'][$trig])) continue;

            $audioPath = $c['audio'][$trig] ?? null;
            $hasAudio = !empty($audioPath);

            $finalCards[$trig][] = [
                'lesson' => $c['lesson'],
                'cardNum' => $c['cardNum'],
                'word' => $c['word'][$trig],
                'english' => $c['english'][$trig] ?? '',
                'grammar' => $c['grammar'],
                'category' => $c['category'],
                'subCategory1' => $c['subCategory1'],
                'subCategory2' => $c['subCategory2'],
                'actflEst' => $c['actflEst'],
                'type' => $c['type'],
                'acceptableAnswers' => [$c['word'][$trig]],
                'englishAcceptable' => [$c['english'][$trig] ?? ''],
                'audio' => $audioPath,
                'hasAudio' => $hasAudio,
                'printImagePath' => $c['printImagePath'],
                'hasGif' => $c['hasGif']
            ];

            $langStats['totalCards']++;
            if ($hasAudio) $langStats['cardsWithAudio']++;
            if (!in_array($c['lesson'], $langStats['lessons'])) {
                $langStats['lessons'][] = $c['lesson'];
            }
        }
        sort($langStats['lessons']);
        $stats['languageStats'][$trig] = $langStats;
        $stats['totalCards'] += $langStats['totalCards'];
        $stats['cardsWithAudio'] += $langStats['cardsWithAudio'];
    }

    $manifest = [
        'version' => '4.0',
        'lastUpdated' => date('c'),
        'languages' => $languages,
        'images' => $images,
        'cards' => $finalCards,
        'stats' => $stats
    ];

    file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    clearstatcache(true, $manifestPath);

    // Generate detailed HTML report
    $reportPath = $assetsDir . '/scan-report.html';
    file_put_contents($reportPath, generateHtmlReport($manifest, $cardsMaster, $languages));

    echo json_encode([
        'success' => true,
        'message' => 'Scan completed successfully',
        'stats' => $stats,
        'reportUrl' => 'assets/scan-report.html?' . time()
    ]);
}

// ------------------------------------------------
// 4. ALL HELPER FUNCTIONS
// ------------------------------------------------
function loadLanguageList($path) {
    $default = [
        ['id' => 1, 'name' => 'Cebuano', 'trigraph' => 'ceb'],
        ['id' => 2, 'name' => 'English', 'trigraph' => 'eng'],
        ['id' => 3, 'name' => 'Maranao', 'trigraph' => 'mrw'],
        ['id' => 4, 'name' => 'Sinama', 'trigraph' => 'sin']
    ];

    if (!file_exists($path)) return $default;

    $list = [];
    $file = fopen($path, 'r');
    if ($file) {
        fgetcsv($file); // skip header
        while (($row = fgetcsv($file)) !== false) {
            if (count($row) >= 3) {
                $list[] = [
                    'id' => (int)$row[0],
                    'name' => trim($row[1]),
                    'trigraph' => strtolower(trim($row[2]))
                ];
            }
        }
        fclose($file);
    }
    return $list ?: $default;
}

function loadLanguageWordList($path) {
    if (!file_exists($path)) return [];

    $cards = [];
    $file = fopen($path, 'r');
    if (!$file) return [];

    $headers = fgetcsv($file); // read header

    while (($row = fgetcsv($file)) !== false) {
        if (count($row) < 6) continue;

        $cards[] = [
            'lesson' => (int)$row[0],
            'cardNum' => (int)$row[1],
            'word' => trim($row[2]),
            'wordNote' => $row[3] ?? '',
            'english' => trim($row[4]),
            'englishNote' => $row[5] ?? '',
            'grammar' => $row[6] ?? '',
            'category' => $row[7] ?? '',
            'subCategory1' => $row[8] ?? '',
            'subCategory2' => $row[9] ?? '',
            'actflEst' => $row[10] ?? '',
            'type' => $row[11] ?? 'N'
        ];
    }
    fclose($file);
    return $cards;
}

function extractWordNum($filename) {
    if (preg_match('/^(\d+)\./', $filename, $m)) return (int)$m[1];
    return null;
}

function extractAudioInfo($filename) {
    if (preg_match('/^(\d+)\.([a-z]{3})\./', $filename, $m)) {
        return [(int)$m[1], $m[2]];
    }
    return [null, null];
}

// ------------------------------------------------
// 5. DETAILED HTML REPORT GENERATOR (FULLY RESTORED)
// ------------------------------------------------
function generateHtmlReport($manifest, $cardsMaster, $languages) {
    $stats = $manifest['stats'];
    $timestamp = date('Y-m-d H:i:s');
    
    // Start HTML
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
        .type-badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
        .type-badge.new { background: #27ae60; color: white; }
        .type-badge.review { background: #f39c12; color: white; }
        .word { font-weight: 600; color: #2c3e50; }
        .legend { margin: 20px 0; padding: 15px; background: #ecf0f1; border-radius: 5px; }
        .legend-item { display: inline-block; margin-right: 20px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>?? Asset Scan Report</h1>
        <p><strong>Generated:</strong> ' . $timestamp . '</p>
        
        <div class="summary">
            <h2>Summary Statistics</h2>
            <div class="summary-grid">
                <div class="stat-box">
                    <div class="number">' . count($cardsMaster) . '</div>
                    <div class="label">Words in CSV</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $stats['totalCards'] . '</div>
                    <div class="label">Cards Created</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $stats['totalPng'] . '</div>
                    <div class="label">PNG Files</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $stats['totalGif'] . '</div>
                    <div class="label">GIF Files</div>
                </div>
                <div class="stat-box">
                    <div class="number">' . $stats['totalAudio'] . '</div>
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
            <br>
            <div class="legend-item"><span class="type-badge new">N</span> - New Word</div>
            <div class="legend-item"><span class="type-badge review">R</span> - Review Word</div>
        </div>
        
        <h2>Detailed Card Matching</h2>
        <table>
            <thead>
                <tr>
                    <th>Lesson</th>
                    <th>Type</th>
                    <th>Card#</th>
                    <th>Word</th>
                    <th>English</th>
                    <th>Files Found</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>';
    
    // Sort cards by card number
    ksort($cardsMaster);
    
    // Generate table rows
    foreach ($cardsMaster as $num => $card) {
        $hasPng = !empty($card['pngFile']);
        $hasGif = !empty($card['gifFile']);
        $hasAudio = !empty($card['audioFiles']);
        
        // Determine status
        if ($hasPng && $hasGif && $hasAudio) {
            $status = 'complete-animated';
            $statusText = 'Complete Animated';
        } elseif ($hasPng && $hasAudio) {
            $status = 'complete-static';
            $statusText = 'Complete Static';
        } elseif ($hasGif && !$hasPng && $hasAudio) {
            $status = 'gif-only';
            $statusText = 'GIF Only';
        } elseif (($hasPng || $hasGif) && !$hasAudio) {
            $status = 'image-only';
            $statusText = 'Image Only';
        } elseif ($hasAudio && !$hasPng && !$hasGif) {
            $status = 'audio-only';
            $statusText = 'Audio Only';
        } elseif (!$hasPng && !$hasGif && !$hasAudio) {
            $status = 'missing';
            $statusText = 'Missing';
        } else {
            $status = 'partial';
            $statusText = 'Partial';
        }
        
        // Build files found HTML
        $filesHtml = '';
        if ($hasPng) {
            $filesHtml .= '<span class="file-badge png">PNG: ' . htmlspecialchars($card['pngFile']) . '</span> ';
        }
        if ($hasGif) {
            $filesHtml .= '<span class="file-badge gif">GIF: ' . htmlspecialchars($card['gifFile']) . '</span> ';
        }
        if ($hasAudio) {
            foreach ($card['audioFiles'] as $trig => $audioFile) {
                $trigUpper = strtoupper($trig);
                $filesHtml .= '<span class="file-badge audio">' . $trigUpper . ': ' . htmlspecialchars($audioFile) . '</span> ';
            }
        }
        if (empty($filesHtml)) {
            $filesHtml = '<span style="color: #95a5a6;">No files found</span>';
        }
        
        // Get first available word (prefer Cebuano)
        $displayWord = '';
        $displayEnglish = '';
        if (!empty($card['word'])) {
            // Prefer Cebuano, then first available
            if (isset($card['word']['ceb'])) {
                $displayWord = $card['word']['ceb'];
                $displayEnglish = $card['english']['ceb'] ?? '';
            } else {
                $displayWord = reset($card['word']);
                $displayEnglish = reset($card['english']) ?: '';
            }
        }
        
        // Type badge
        $typeClass = (strtoupper($card['type']) === 'R') ? 'review' : 'new';
        $typeText = (strtoupper($card['type']) === 'R') ? 'R' : 'N';
        
        $html .= '<tr>
            <td><span class="lesson-badge">' . $card['lesson'] . '</span></td>
            <td><span class="type-badge ' . $typeClass . '">' . $typeText . '</span></td>
            <td><strong>' . $num . '</strong></td>
            <td><span class="word">' . htmlspecialchars($displayWord) . '</span></td>
            <td>' . htmlspecialchars($displayEnglish) . '</td>
            <td>' . $filesHtml . '</td>
            <td><span class="status status-' . $status . '">' . $statusText . '</span></td>
        </tr>';
    }
    
    $html .= '</tbody>
        </table>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d;">
            <p>Bob and Mariel Ward School of Filipino Languages - Asset Scan Report v4.0</p>
        </div>
    </div>
</body>
</html>';

    return $html;
}
?>