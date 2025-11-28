<?php
/**
 * Cebuano Dictionary Scraper LITE - PHP API
 * DreamHost Compatible
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/includes/BinisayaScraper.php';

// Configuration
define('OUTPUT_DIR', __DIR__ . '/output/binisaya');
define('PROGRESS_FILE', __DIR__ . '/data/progress.json');
define('PAUSE_STATE_FILE', __DIR__ . '/data/pause_state.json');

// Ensure directories exist
if (!is_dir(OUTPUT_DIR)) mkdir(OUTPUT_DIR, 0755, true);
if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0755, true);

// Get action from query string or POST
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Get POST data
$input = json_decode(file_get_contents('php://input'), true) ?: [];

// Progress tracking functions
function loadProgress() {
    if (file_exists(PROGRESS_FILE)) {
        return json_decode(file_get_contents(PROGRESS_FILE), true);
    }
    return [
        'isRunning' => false,
        'paused' => false,
        'currentWord' => null,
        'completed' => 0,
        'total' => 0,
        'queue' => [],
        'processed' => [],
        'results' => [],
        'errors' => [],
        'startTime' => null
    ];
}

function saveProgress($progress) {
    file_put_contents(PROGRESS_FILE, json_encode($progress, JSON_PRETTY_PRINT));
}

function resetProgress() {
    $progress = [
        'isRunning' => false,
        'paused' => false,
        'currentWord' => null,
        'completed' => 0,
        'total' => 0,
        'queue' => [],
        'processed' => [],
        'results' => [],
        'errors' => [],
        'startTime' => null
    ];
    saveProgress($progress);
    return $progress;
}

// Route handling
switch ($action) {
    case 'status':
        echo json_encode([
            'server' => 'Cebuano Dictionary Scraper LITE',
            'version' => '1.0.0-php',
            'sources' => ['binisaya'],
            'scraper' => 'php-curl',
            'note' => 'DreamHost compatible - Binisaya.com only'
        ]);
        break;

    case 'progress':
        $progress = loadProgress();
        $elapsed = 0;
        if ($progress['startTime']) {
            $elapsed = time() - $progress['startTime'];
        }

        echo json_encode([
            'isRunning' => $progress['isRunning'],
            'paused' => $progress['paused'],
            'currentWord' => $progress['currentWord'],
            'completed' => $progress['completed'],
            'total' => $progress['total'],
            'queueLength' => count($progress['queue']),
            'processedCount' => count($progress['processed']),
            'elapsedSeconds' => $elapsed,
            'errors' => array_slice($progress['errors'], -5),
            'lastResult' => end($progress['results']) ?: null
        ]);
        break;

    case 'test_binisaya':
        $word = isset($input['word']) ? $input['word'] : 'kalipay';
        $fetchDerivatives = isset($input['fetch_derivatives']) ? $input['fetch_derivatives'] : true;

        $scraper = new BinisayaScraper();
        $result = $scraper->search($word, ['fetchDerivatives' => $fetchDerivatives]);
        $result['scraper_mode'] = 'php-curl';

        echo json_encode($result);
        break;

    case 'lookup_single':
        $word = isset($input['word']) ? $input['word'] : null;

        if (!$word) {
            echo json_encode(['error' => 'No word provided']);
            break;
        }

        $scraper = new BinisayaScraper();
        $result = ['word' => $word, 'sources' => []];

        $binisayaResult = $scraper->search($word, ['fetchDerivatives' => true]);

        if ($binisayaResult['found'] && $binisayaResult['data']) {
            $result['sources']['binisaya'] = [
                'found' => true,
                'data' => $binisayaResult['data'],
                'root_data' => $binisayaResult['root_data'],
                'derivatives_list' => isset($binisayaResult['derivatives_list']) ? $binisayaResult['derivatives_list'] : null
            ];

            // Save to file
            $scraper->saveToFile($word, $binisayaResult, OUTPUT_DIR);
        } else {
            $result['sources']['binisaya'] = ['found' => false];
        }

        echo json_encode($result);
        break;

    case 'lookup_batch':
        $words = isset($input['words']) ? $input['words'] : [];

        if (empty($words)) {
            echo json_encode(['error' => 'No words provided']);
            break;
        }

        // Initialize progress
        $progress = resetProgress();
        $progress['isRunning'] = true;
        $progress['queue'] = $words;
        $progress['total'] = count($words);
        $progress['startTime'] = time();
        saveProgress($progress);

        echo json_encode([
            'success' => true,
            'message' => 'Batch processing started',
            'total_words' => count($words),
            'note' => 'Use api.php?action=process_next to process words one at a time, or api.php?action=process_all for continuous processing'
        ]);
        break;

    case 'process_next':
        // Process one word from the queue
        $progress = loadProgress();

        if (!$progress['isRunning'] || $progress['paused']) {
            echo json_encode(['success' => false, 'message' => 'Batch not running or paused']);
            break;
        }

        if (empty($progress['queue'])) {
            $progress['isRunning'] = false;
            $progress['currentWord'] = null;
            saveProgress($progress);
            echo json_encode(['success' => true, 'message' => 'Batch complete', 'completed' => $progress['completed']]);
            break;
        }

        $wordEntry = array_shift($progress['queue']);
        $parts = explode('|', $wordEntry);
        $word = trim($parts[0]);
        $userEnglish = isset($parts[1]) ? trim($parts[1]) : '';

        if (!$word || in_array(strtolower($word), array_map('strtolower', $progress['processed']))) {
            saveProgress($progress);
            echo json_encode(['success' => true, 'message' => 'Skipped', 'word' => $word]);
            break;
        }

        $progress['currentWord'] = $word;
        saveProgress($progress);

        $scraper = new BinisayaScraper();
        $result = ['word' => $word, 'user_english' => $userEnglish, 'sources' => []];

        try {
            $binisayaResult = $scraper->search($word, [
                'fetchDerivatives' => true,
                'existingWords' => $progress['processed']
            ]);

            if ($binisayaResult['found'] && $binisayaResult['data']) {
                $result['sources']['binisaya'] = [
                    'found' => true,
                    'rootword' => $binisayaResult['data']['rootword'],
                    'is_root' => $binisayaResult['data']['is_root'],
                    'meanings' => $binisayaResult['data']['meanings'],
                    'meanings_count' => count($binisayaResult['data']['meanings'])
                ];

                $scraper->saveToFile($word, $result, OUTPUT_DIR);
            } else {
                $result['sources']['binisaya'] = ['found' => false];
            }

            $progress['results'][] = $result;
            $progress['processed'][] = $word;
            $progress['completed']++;

        } catch (Exception $e) {
            $progress['errors'][] = ['word' => $word, 'error' => $e->getMessage()];
            $progress['completed']++;
        }

        $progress['currentWord'] = null;

        if (empty($progress['queue'])) {
            $progress['isRunning'] = false;
        }

        saveProgress($progress);

        echo json_encode([
            'success' => true,
            'word' => $word,
            'result' => $result,
            'remaining' => count($progress['queue']),
            'completed' => $progress['completed']
        ]);
        break;

    case 'process_all':
        // Process all words (long-running, use with caution)
        set_time_limit(0);
        ignore_user_abort(true);

        $progress = loadProgress();

        if (!$progress['isRunning']) {
            echo json_encode(['success' => false, 'message' => 'No batch running']);
            break;
        }

        $scraper = new BinisayaScraper();
        $processed = 0;

        while (!empty($progress['queue']) && !$progress['paused']) {
            $wordEntry = array_shift($progress['queue']);
            $parts = explode('|', $wordEntry);
            $word = trim($parts[0]);

            if (!$word || in_array(strtolower($word), array_map('strtolower', $progress['processed']))) {
                continue;
            }

            $progress['currentWord'] = $word;
            saveProgress($progress);

            $result = ['word' => $word, 'sources' => []];

            try {
                $binisayaResult = $scraper->search($word, [
                    'fetchDerivatives' => true,
                    'existingWords' => $progress['processed']
                ]);

                if ($binisayaResult['found'] && $binisayaResult['data']) {
                    $result['sources']['binisaya'] = [
                        'found' => true,
                        'data' => $binisayaResult['data']
                    ];
                    $scraper->saveToFile($word, $result, OUTPUT_DIR);
                }

                $progress['results'][] = $result;
                $progress['processed'][] = $word;
                $progress['completed']++;
                $processed++;

            } catch (Exception $e) {
                $progress['errors'][] = ['word' => $word, 'error' => $e->getMessage()];
                $progress['completed']++;
            }

            // Reload progress to check for pause request
            $currentProgress = loadProgress();
            if ($currentProgress['paused']) {
                $progress['paused'] = true;
                break;
            }
        }

        $progress['currentWord'] = null;
        if (empty($progress['queue'])) {
            $progress['isRunning'] = false;
        }
        saveProgress($progress);

        echo json_encode([
            'success' => true,
            'message' => $progress['paused'] ? 'Paused' : 'Batch complete',
            'processed' => $processed,
            'total_completed' => $progress['completed']
        ]);
        break;

    case 'batch_pause':
        $progress = loadProgress();
        $progress['paused'] = true;
        saveProgress($progress);

        echo json_encode(['success' => true, 'message' => 'Pause requested']);
        break;

    case 'batch_resume':
        $progress = loadProgress();

        if (empty($progress['queue'])) {
            echo json_encode(['success' => false, 'message' => 'No paused batch found']);
            break;
        }

        $progress['paused'] = false;
        $progress['isRunning'] = true;
        saveProgress($progress);

        echo json_encode([
            'success' => true,
            'message' => 'Batch resumed',
            'remaining' => count($progress['queue'])
        ]);
        break;

    case 'batch_cancel':
        resetProgress();
        echo json_encode(['success' => true, 'message' => 'Batch cancelled']);
        break;

    case 'files':
        $files = [];

        if (is_dir(OUTPUT_DIR)) {
            $items = scandir(OUTPUT_DIR);
            foreach ($items as $item) {
                if (substr($item, -5) === '.json') {
                    $files[] = [
                        'name' => $item,
                        'word' => str_replace('.json', '', $item),
                        'path' => 'output/binisaya/' . $item,
                        'size' => filesize(OUTPUT_DIR . '/' . $item),
                        'modified' => filemtime(OUTPUT_DIR . '/' . $item)
                    ];
                }
            }

            // Sort by modified time, newest first
            usort($files, function($a, $b) {
                return $b['modified'] - $a['modified'];
            });
        }

        echo json_encode(['binisaya' => $files, 'count' => count($files)]);
        break;

    default:
        echo json_encode([
            'error' => 'Unknown action',
            'available_actions' => [
                'status' => 'GET - Server status',
                'progress' => 'GET - Batch progress',
                'test_binisaya' => 'POST - Test single word',
                'lookup_single' => 'POST - Lookup and save word',
                'lookup_batch' => 'POST - Start batch processing',
                'process_next' => 'GET - Process next word in queue',
                'process_all' => 'GET - Process all words (long-running)',
                'batch_pause' => 'POST - Pause batch',
                'batch_resume' => 'POST - Resume batch',
                'batch_cancel' => 'POST - Cancel batch',
                'files' => 'GET - List output files'
            ]
        ]);
}
