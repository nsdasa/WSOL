<?php
// scan-assets.php - FULLY RESTORED & WORKING v4.0 - November 18, 2025
// Generates perfect manifest.json + scan-report.html + proper audio linking

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
// 1. CSV UPLOAD HANDLER (unchanged – works fine)
// -----
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
// 2. MAIN SCAN FUNCTION — FULLY RESTORED AUDIO LOGIC
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
                    'hasGif' => false
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
            $images[(string)$num]['png'] = $path;
        }
    }

    // Link GIFs
    foreach ($gifFiles as $f) {
        $num = extractWordNum($f);
        if ($num && isset($cardsMaster[$num])) {
            $cardsMaster[$num]['hasGif'] = true;
            $images[(string)$num]['gif'] = "assets/$f";
        }
    }

    // LINK AUDIO — THIS WAS THE MISSING PIECE!
    foreach ($audioFiles as $f) {
        list($num, $trig) = extractAudioInfo($f);
        if ($num && $trig && isset($cardsMaster[$num])) {
            $path = "assets/$f";
            $cardsMaster[$num]['audio'][$trig] = $path;
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

    // Generate HTML report
    $reportPath = $assetsDir . '/scan-report.html';
    file_put_contents($reportPath, generateHtmlReport($manifest));

    echo json_encode([
        'success' => true,
        'message' => 'Scan completed successfully',
        'stats' => $stats,
        'reportUrl' => 'assets/scan-report.html?' . time()
    ]);
}

// ------------------------------------------------
// 3. ALL HELPER FUNCTIONS (complete)
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

function generateHtmlReport($manifest) {
    $html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Scan Report - ' . $manifest['lastUpdated'] . '</title><style>body{font-family:Arial,sans-serif;background:#f8f9fa;color:#333;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#4CAF50;color:white;}</style></head><body>';
    $html .= '<h1>Language Learning Assets Scan Report</h1>';
    $html .= '<p>Generated: ' . $manifest['lastUpdated'] . '</p>';
    $html .= '<h2>Overall Stats</h2>';
    $html .= '<table><tr><th>Total Cards</th><th>With Audio</th><th>PNG Images</th><th>GIFs</th></tr>';
    $html .= '<tr><td>' . $manifest['stats']['totalCards'] . '</td><td>' . $manifest['stats']['cardsWithAudio'] . '</td><td>' . $manifest['stats']['totalPng'] . '</td><td>' . $manifest['stats']['totalGif'] . '</td></tr></table>';

    foreach ($manifest['languages'] as $lang) {
        $t = $lang['trigraph'];
        $ls = $manifest['stats']['languageStats'][$t] ?? null;
        if (!$ls) continue;
        $html .= "<h2>{$lang['name']} ({$t})</h2>";
        $html .= "<p>Cards: {$ls['totalCards']} | With Audio: {$ls['cardsWithAudio']}</p>";
    }
    $html .= '</body></html>';
    return $html;
}
?>