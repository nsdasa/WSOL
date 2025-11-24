<?php
// scan-assets.php - FULLY RESTORED v4.0 - November 2025
// Generates complete manifest.json + detailed scan-report.html with full formatting
// Includes proper audio linking and comprehensive per-card breakdown

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display in HTML
ini_set('log_errors', 1);

// Wrap everything in try-catch
try {
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

    if (function_exists('opcache_invalidate')) opcache_invalidate(__FILE__, true);
    if (function_exists('opcache_reset')) opcache_reset();
    clearstatcache(true);

    $assetsDir = __DIR__ . '/assets';
    $manifestPath = $assetsDir . '/manifest.json';

    // Check if assets directory exists
    if (!is_dir($assetsDir)) {
        throw new Exception('Assets directory not found: ' . $assetsDir);
    }

    // Check if assets directory is writable
    if (!is_writable($assetsDir)) {
        throw new Exception('Assets directory is not writable: ' . $assetsDir);
    }

    // Check for JSON POST body first
    $jsonInput = file_get_contents('php://input');
    $jsonData = json_decode($jsonInput, true);

    // Determine action from GET or JSON body
    $action = $_GET['action'] ?? ($jsonData['action'] ?? 'scan');

    switch ($action) {
        case 'upload':
            handleCSVUpload();
            break;
        case 'uploadSentenceWords':
            handleSentenceWordsUpload();
            break;
        case 'previewSentenceWords':
            previewSentenceWordsUpload();
            break;
        case 'confirmSentenceWords':
            confirmSentenceWordsUpload();
            break;
        case 'saveSentenceWords':
            saveSentenceWords($jsonData);
            break;
        case 'uploadMedia':
            handleMediaUpload();
            break;
        case 'uploadGrammar':
            handleGrammarUpload();
            break;
        case 'grammarReport':
            generateGrammarReport();
            break;
        case 'detectConflicts':
            detectScanConflicts();
            break;
        case 'scan':
        default:
            scanAssets();
            break;
    }
} catch (Exception $e) {
    // Return error as JSON
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
} catch (Error $e) {
    // Catch PHP 7+ errors
    echo json_encode([
        'success' => false,
        'error' => 'PHP Error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
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
// 1b. SENTENCE WORDS CSV UPLOAD HANDLER
// ------------------------------------------------
function handleSentenceWordsUpload() {
    global $assetsDir;

    try {
        $uploaded = false;
        $validationErrors = [];

        // Load existing manifest to validate words
        $manifestPath = $assetsDir . '/manifest.json';
        $manifest = null;
        if (file_exists($manifestPath)) {
            $manifest = json_decode(file_get_contents($manifestPath), true);
        }

        if (!$manifest || !isset($manifest['cards'])) {
            throw new Exception('Manifest not found. Please upload Word Lists first before uploading Sentence Words.');
        }

        // Process sentence word files for each language
        foreach (['ceb' => 'Cebuano', 'mrw' => 'Maranao', 'sin' => 'Sinama'] as $trig => $name) {
            $field = 'sentenceFile_' . $trig;
            if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
                $tmpPath = $_FILES[$field]['tmp_name'];

                // Validate the CSV before saving
                $validation = validateSentenceWordsCSV($tmpPath, $trig, $manifest);

                if (!$validation['valid']) {
                    $validationErrors[$name] = $validation['errors'];
                    continue;
                }

                // Save the file
                $target = $assetsDir . '/Sentence_Words_' . $trig . '.csv';
                move_uploaded_file($tmpPath, $target);
                clearstatcache(true, $target);
                $uploaded = true;
            }
        }

        if (!empty($validationErrors)) {
            echo json_encode([
                'success' => false,
                'error' => 'Validation failed for some files',
                'validationErrors' => $validationErrors
            ]);
            return;
        }

        if (!$uploaded) {
            throw new Exception('No sentence word files received');
        }

        // Re-scan to update manifest with sentence words
        scanAssets();
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * Validate Sentence Words CSV - ensures all words exist in manifest
 */
function validateSentenceWordsCSV($filePath, $trigraph, $manifest) {
    $errors = [];

    if (!file_exists($filePath)) {
        return ['valid' => false, 'errors' => ['File not found']];
    }

    $file = fopen($filePath, 'r');
    if (!$file) {
        return ['valid' => false, 'errors' => ['Could not open file']];
    }

    // Read headers
    $headers = fgetcsv($file);
    if (!$headers || count($headers) < 2) {
        fclose($file);
        return ['valid' => false, 'errors' => ['Invalid CSV format - missing headers']];
    }

    // First column should be "Lesson #" or similar
    $lessonColIndex = 0;

    // Build list of valid words from manifest
    $validWords = [];
    if (isset($manifest['cards'][$trigraph])) {
        foreach ($manifest['cards'][$trigraph] as $card) {
            $word = strtolower(trim($card['word'] ?? ''));
            if ($word) {
                $validWords[$word] = true;
                // Also add variants (slash-separated)
                $variants = explode('/', $word);
                foreach ($variants as $v) {
                    $validWords[strtolower(trim($v))] = true;
                }
            }
        }
    }

    // Process each row
    $rowNum = 1;
    while (($row = fgetcsv($file)) !== false) {
        $rowNum++;

        // Check each column (except Lesson #)
        for ($i = 1; $i < count($row); $i++) {
            $cellValue = trim($row[$i] ?? '');
            if (empty($cellValue)) continue;

            // Split comma-separated words
            $words = array_map('trim', explode(',', $cellValue));

            foreach ($words as $word) {
                if (empty($word)) continue;

                // Handle slash-separated variants (use first word for lookup)
                $wordToCheck = strtolower(trim(explode('/', $word)[0]));

                // Remove any spaces within the word for matching
                $wordToCheck = preg_replace('/\s+/', '', $wordToCheck);

                if (!isset($validWords[$wordToCheck])) {
                    $colName = $headers[$i] ?? "Column $i";
                    $errors[] = "Row $rowNum, $colName: Word '$word' not found in manifest";
                }
            }
        }
    }

    fclose($file);

    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * Preview Sentence Words Upload - validates and returns detailed results with suggestions
 */
function previewSentenceWordsUpload() {
    global $assetsDir;

    try {
        // Load existing manifest
        $manifestPath = $assetsDir . '/manifest.json';
        if (!file_exists($manifestPath)) {
            throw new Exception('Manifest not found. Please upload Word Lists first.');
        }
        $manifest = json_decode(file_get_contents($manifestPath), true);
        if (!$manifest || !isset($manifest['cards'])) {
            throw new Exception('Invalid manifest format.');
        }

        $results = [];

        // Process each language file
        foreach (['ceb' => 'Cebuano', 'mrw' => 'Maranao', 'sin' => 'Sinama'] as $trig => $name) {
            $field = 'sentenceFile_' . $trig;
            if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
                $tmpPath = $_FILES[$field]['tmp_name'];

                // Store file temporarily for later confirmation
                $tempStorePath = sys_get_temp_dir() . '/sentence_words_' . $trig . '_' . session_id() . '.csv';
                copy($tmpPath, $tempStorePath);

                // Get detailed validation with suggestions
                $validation = getDetailedWordValidation($tmpPath, $trig, $manifest);
                $results[$trig] = [
                    'language' => $name,
                    'trigraph' => $trig,
                    'tempFile' => $tempStorePath,
                    'words' => $validation['words'],
                    'stats' => $validation['stats'],
                    'allCards' => getCardsForSuggestions($manifest, $trig)
                ];
            }
        }

        if (empty($results)) {
            throw new Exception('No sentence word files received');
        }

        echo json_encode([
            'success' => true,
            'preview' => true,
            'results' => $results
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * Confirm Sentence Words Upload - saves files with user-corrected mappings
 */
function confirmSentenceWordsUpload() {
    global $assetsDir;

    try {
        // Get corrections from POST data
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['corrections'])) {
            throw new Exception('No correction data received');
        }

        $corrections = $input['corrections'];
        $uploaded = false;

        foreach ($corrections as $trig => $langData) {
            $tempFile = $langData['tempFile'] ?? null;
            $wordCorrections = $langData['corrections'] ?? [];

            if (!$tempFile || !file_exists($tempFile)) {
                continue;
            }

            // Read the original CSV
            $csvContent = file_get_contents($tempFile);

            // Apply corrections to the CSV content
            foreach ($wordCorrections as $original => $corrected) {
                if ($corrected && $corrected !== $original) {
                    // Replace the word in CSV (case-insensitive)
                    $csvContent = preg_replace(
                        '/\b' . preg_quote($original, '/') . '\b/i',
                        $corrected,
                        $csvContent
                    );
                }
            }

            // Save the corrected file
            $target = $assetsDir . '/Sentence_Words_' . $trig . '.csv';
            file_put_contents($target, $csvContent);

            // Clean up temp file
            @unlink($tempFile);

            $uploaded = true;
        }

        if (!$uploaded) {
            throw new Exception('No files were saved');
        }

        // Re-scan to update manifest
        scanAssets();

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * Save sentence words from the manual editor
 */
function saveSentenceWords($data) {
    global $assetsDir;

    try {
        $language = $data['language'] ?? null;
        $lesson = $data['lesson'] ?? null;
        $wordTypes = $data['wordTypes'] ?? null;

        if (!$language || !$lesson || !is_array($wordTypes)) {
            throw new Exception('Missing required fields: language, lesson, wordTypes');
        }

        // Load existing manifest
        $manifestPath = $assetsDir . '/manifest.json';
        if (!file_exists($manifestPath)) {
            throw new Exception('Manifest not found.');
        }

        $manifest = json_decode(file_get_contents($manifestPath), true);
        if (!$manifest) {
            throw new Exception('Invalid manifest format.');
        }

        // Initialize sentenceWords if not exists
        if (!isset($manifest['sentenceWords'])) {
            $manifest['sentenceWords'] = [];
        }
        if (!isset($manifest['sentenceWords'][$language])) {
            $manifest['sentenceWords'][$language] = [];
        }

        // Clean up empty word types
        $cleanedWordTypes = [];
        foreach ($wordTypes as $type => $words) {
            if (is_array($words) && count($words) > 0) {
                $cleanedWordTypes[$type] = array_values($words); // Ensure sequential array
            }
        }

        // Update the specific lesson
        if (empty($cleanedWordTypes)) {
            // If all word types are empty, remove the lesson entry
            unset($manifest['sentenceWords'][$language][$lesson]);
            // Clean up empty language entry
            if (empty($manifest['sentenceWords'][$language])) {
                unset($manifest['sentenceWords'][$language]);
            }
        } else {
            $manifest['sentenceWords'][$language][$lesson] = $cleanedWordTypes;
        }

        // Save manifest
        $jsonOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if (file_put_contents($manifestPath, json_encode($manifest, $jsonOptions)) === false) {
            throw new Exception('Failed to save manifest.');
        }

        echo json_encode([
            'success' => true,
            'message' => "Sentence words saved for {$language} lesson {$lesson}"
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * Get detailed validation results with suggestions for unmatched words
 */
function getDetailedWordValidation($filePath, $trigraph, $manifest) {
    $words = [];
    $stats = ['total' => 0, 'matched' => 0, 'unmatched' => 0];

    if (!file_exists($filePath)) {
        return ['words' => [], 'stats' => $stats];
    }

    $file = fopen($filePath, 'r');
    if (!$file) {
        return ['words' => [], 'stats' => $stats];
    }

    // Read headers
    $headers = fgetcsv($file);
    if (!$headers || count($headers) < 2) {
        fclose($file);
        return ['words' => [], 'stats' => $stats];
    }

    // Build card lookup from manifest
    $cards = $manifest['cards'][$trigraph] ?? [];
    $cardLookup = buildCardLookup($cards);

    // Process each row
    $rowNum = 1;
    while (($row = fgetcsv($file)) !== false) {
        $rowNum++;
        $lesson = trim($row[0] ?? '');

        // Check each column (except Lesson #)
        for ($i = 1; $i < count($row); $i++) {
            $cellValue = trim($row[$i] ?? '');
            if (empty($cellValue)) continue;

            $colName = $headers[$i] ?? "Column $i";

            // Split comma-separated words
            $cellWords = array_map('trim', explode(',', $cellValue));

            foreach ($cellWords as $word) {
                if (empty($word)) continue;

                $stats['total']++;

                // Try to find matching card
                $matchResult = findMatchingCard($word, $cardLookup, $cards);

                $wordEntry = [
                    'original' => $word,
                    'wordType' => $colName,
                    'lesson' => $lesson,
                    'row' => $rowNum,
                    'matched' => $matchResult['matched'],
                    'cardNum' => $matchResult['cardNum'],
                    'cardWord' => $matchResult['cardWord'],
                    'suggestions' => []
                ];

                if ($matchResult['matched']) {
                    $stats['matched']++;
                } else {
                    $stats['unmatched']++;
                    // Get fuzzy match suggestions
                    $wordEntry['suggestions'] = getSuggestions($word, $cards, 5);
                }

                $words[] = $wordEntry;
            }
        }
    }

    fclose($file);

    return ['words' => $words, 'stats' => $stats];
}

/**
 * Build a lookup table for quick word matching
 */
function buildCardLookup($cards) {
    $lookup = [];

    foreach ($cards as $card) {
        $word = strtolower(trim($card['word'] ?? ''));
        if (!$word) continue;

        // Normalize: remove spaces around slashes
        $normalized = preg_replace('/\s*\/\s*/', '/', $word);
        $lookup[$normalized] = $card;

        // Also add individual variants
        $variants = explode('/', $normalized);
        foreach ($variants as $v) {
            $v = trim($v);
            if ($v && !isset($lookup[$v])) {
                $lookup[$v] = $card;
            }
        }
    }

    return $lookup;
}

/**
 * Find matching card for a word
 */
function findMatchingCard($word, $cardLookup, $cards) {
    // Normalize the search word
    $normalized = strtolower(trim($word));
    $normalized = preg_replace('/\s*\/\s*/', '/', $normalized);

    // Direct lookup
    if (isset($cardLookup[$normalized])) {
        $card = $cardLookup[$normalized];
        return [
            'matched' => true,
            'cardNum' => $card['cardNum'] ?? null,
            'cardWord' => $card['word'] ?? ''
        ];
    }

    // Check individual variants
    $variants = explode('/', $normalized);
    foreach ($variants as $v) {
        $v = trim($v);
        if ($v && isset($cardLookup[$v])) {
            $card = $cardLookup[$v];
            return [
                'matched' => true,
                'cardNum' => $card['cardNum'] ?? null,
                'cardWord' => $card['word'] ?? ''
            ];
        }
    }

    return ['matched' => false, 'cardNum' => null, 'cardWord' => ''];
}

/**
 * Get fuzzy match suggestions for an unmatched word
 */
function getSuggestions($word, $cards, $limit = 5) {
    $suggestions = [];
    $normalized = strtolower(trim(preg_replace('/\s*\/\s*/', '/', $word)));

    foreach ($cards as $card) {
        $cardWord = strtolower(trim($card['word'] ?? ''));
        if (!$cardWord) continue;

        $cardNormalized = preg_replace('/\s*\/\s*/', '/', $cardWord);

        // Calculate similarity for the full word
        $similarity = calculateSimilarity($normalized, $cardNormalized);

        // Also check variants
        $cardVariants = explode('/', $cardNormalized);
        $searchVariants = explode('/', $normalized);

        foreach ($searchVariants as $sv) {
            foreach ($cardVariants as $cv) {
                $varSim = calculateSimilarity(trim($sv), trim($cv));
                if ($varSim > $similarity) {
                    $similarity = $varSim;
                }
            }
        }

        if ($similarity > 0.3) { // Minimum threshold
            $suggestions[] = [
                'cardNum' => $card['cardNum'] ?? null,
                'word' => $card['word'] ?? '',
                'english' => $card['english'] ?? '',
                'similarity' => round($similarity * 100)
            ];
        }
    }

    // Sort by similarity descending
    usort($suggestions, function($a, $b) {
        return $b['similarity'] - $a['similarity'];
    });

    return array_slice($suggestions, 0, $limit);
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity($str1, $str2) {
    if ($str1 === $str2) return 1.0;
    if (empty($str1) || empty($str2)) return 0.0;

    $len1 = strlen($str1);
    $len2 = strlen($str2);
    $maxLen = max($len1, $len2);

    if ($maxLen === 0) return 1.0;

    $distance = levenshtein($str1, $str2);
    return 1 - ($distance / $maxLen);
}

/**
 * Get simplified card list for frontend suggestions dropdown
 */
function getCardsForSuggestions($manifest, $trigraph) {
    $cards = $manifest['cards'][$trigraph] ?? [];
    $simplified = [];

    foreach ($cards as $card) {
        $simplified[] = [
            'cardNum' => $card['cardNum'] ?? null,
            'word' => $card['word'] ?? '',
            'english' => $card['english'] ?? '',
            'lesson' => $card['lesson'] ?? null
        ];
    }

    // Sort by lesson, then word
    usort($simplified, function($a, $b) {
        if ($a['lesson'] !== $b['lesson']) {
            return ($a['lesson'] ?? 0) - ($b['lesson'] ?? 0);
        }
        return strcasecmp($a['word'] ?? '', $b['word'] ?? '');
    });

    return $simplified;
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
                if (in_array($ext, ['png','jpg','jpeg','webp','gif','mp4','webm','mp3','m4a'])) {
                    $target = $assetsDir . '/' . basename($files['name']);
                    if (move_uploaded_file($files['tmp_name'], $target)) {
                        if (in_array($ext, ['png','jpg','jpeg','webp','gif','mp4','webm'])) $stats['imagesUploaded']++;
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
// 3. GRAMMAR FILE UPLOAD HANDLER
// ------------------------------------------------
function handleGrammarUpload() {
    global $assetsDir, $manifestPath;

    $language = $_POST['language'] ?? '';
    $lesson = intval($_POST['lesson'] ?? 0);

    if (empty($language) || $lesson <= 0) {
        echo json_encode(['success' => false, 'error' => 'Language and lesson number are required']);
        return;
    }

    // Validate language trigraph
    $validLanguages = ['ceb', 'mrw', 'sin'];
    if (!in_array($language, $validLanguages)) {
        echo json_encode(['success' => false, 'error' => 'Invalid language: ' . $language]);
        return;
    }

    // Check for uploaded file
    if (!isset($_FILES['grammarFile']) || $_FILES['grammarFile']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'No grammar file uploaded or upload error']);
        return;
    }

    $file = $_FILES['grammarFile'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    // Validate file extension
    if (!in_array($ext, ['html', 'htm'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid file type. Only HTML/HTM files allowed.']);
        return;
    }

    // Create grammar directory if it doesn't exist
    $grammarDir = $assetsDir . '/grammar/' . $language;
    if (!file_exists($grammarDir)) {
        mkdir($grammarDir, 0755, true);
    }

    // Target filename: lesson-{n}.html
    $targetFilename = 'lesson-' . $lesson . '.html';
    $targetPath = $grammarDir . '/' . $targetFilename;

    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Update manifest with grammar info
        updateManifestGrammar($language, $lesson);

        echo json_encode([
            'success' => true,
            'message' => 'Grammar file uploaded successfully',
            'path' => 'assets/grammar/' . $language . '/' . $targetFilename,
            'language' => $language,
            'lesson' => $lesson
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save grammar file']);
    }
}

// Helper function to update manifest with grammar data
function updateManifestGrammar($language, $lesson, $filename = null) {
    global $manifestPath;

    if (!file_exists($manifestPath)) {
        return;
    }

    $manifest = json_decode(file_get_contents($manifestPath), true);
    if (!$manifest) {
        return;
    }

    // Initialize grammar section if it doesn't exist
    if (!isset($manifest['grammar'])) {
        $manifest['grammar'] = [];
    }

    // Initialize language grammar object if it doesn't exist
    if (!isset($manifest['grammar'][$language])) {
        $manifest['grammar'][$language] = new stdClass();  // Empty object for JSON
    }

    // Convert to array if needed (for manipulation)
    if (!is_array($manifest['grammar'][$language])) {
        $manifest['grammar'][$language] = (array)$manifest['grammar'][$language];
    }

    // Add lesson => filename mapping
    $filename = $filename ?? 'lesson-' . $lesson . '.html';
    $manifest['grammar'][$language][$lesson] = $filename;

    // Update lastUpdated timestamp
    $manifest['lastUpdated'] = date('c');

    // Save manifest
    file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ------------------------------------------------
// 4. GRAMMAR REPORT GENERATOR
// ------------------------------------------------
function generateGrammarReport() {
    global $assetsDir, $manifestPath;

    $report = [
        'success' => true,
        'generated' => date('c'),
        'languages' => []
    ];

    // Load manifest to get language info and total lessons
    $manifest = null;
    if (file_exists($manifestPath)) {
        $manifest = json_decode(file_get_contents($manifestPath), true);
    }

    // Language info
    $languageNames = [
        'ceb' => 'Cebuano',
        'mrw' => 'Maranao',
        'sin' => 'Sinama'
    ];

    // Initialize grammar section in manifest for syncing
    $grammarManifest = [];

    // Scan grammar directories
    $grammarBase = $assetsDir . '/grammar';

    foreach ($languageNames as $trigraph => $name) {
        $langReport = [
            'name' => $name,
            'trigraph' => $trigraph,
            'lessonsWithGrammar' => [],
            'lessonsWithoutGrammar' => [],
            'grammarFiles' => [],  // Store filename mapping
            'totalLessons' => 0,
            'grammarCount' => 0,
            'coverage' => 0
        ];

        // Get total lessons for this language from manifest
        $totalLessons = 0;
        if ($manifest && isset($manifest['stats']['languageStats'][$trigraph]['lessons'])) {
            $lessons = $manifest['stats']['languageStats'][$trigraph]['lessons'];
            $totalLessons = is_array($lessons) ? max($lessons) : 0;
        }
        $langReport['totalLessons'] = $totalLessons;

        // Scan for grammar files
        $grammarDir = $grammarBase . '/' . $trigraph;
        $foundLessons = [];
        $grammarFiles = [];  // lesson => filename mapping

        if (is_dir($grammarDir)) {
            $files = scandir($grammarDir);
            foreach ($files as $file) {
                // Match lesson-N.html or lesson-N.htm
                if (preg_match('/^lesson-(\d+)\.html?$/i', $file, $matches)) {
                    $lessonNum = intval($matches[1]);
                    $foundLessons[] = $lessonNum;
                    $grammarFiles[$lessonNum] = $file;
                }
                // Also match Lesson N.html format
                elseif (preg_match('/^Lesson\s*(\d+)\.html?$/i', $file, $matches)) {
                    $lessonNum = intval($matches[1]);
                    $foundLessons[] = $lessonNum;
                    $grammarFiles[$lessonNum] = $file;
                }
            }
        }

        sort($foundLessons);
        $langReport['lessonsWithGrammar'] = $foundLessons;
        $langReport['grammarFiles'] = $grammarFiles;
        $langReport['grammarCount'] = count($foundLessons);

        // Build grammar manifest for this language
        $grammarManifest[$trigraph] = $grammarFiles;

        // Find lessons without grammar
        if ($totalLessons > 0) {
            for ($i = 1; $i <= $totalLessons; $i++) {
                if (!in_array($i, $foundLessons)) {
                    $langReport['lessonsWithoutGrammar'][] = $i;
                }
            }
            $langReport['coverage'] = round(($langReport['grammarCount'] / $totalLessons) * 100, 1);
        }

        $report['languages'][$trigraph] = $langReport;
    }

    // Sync grammar info to manifest
    if ($manifest) {
        $manifest['grammar'] = $grammarManifest;
        $manifest['lastUpdated'] = date('c');
        file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $report['manifestSynced'] = true;
    }

    // Calculate overall stats
    $totalGrammar = 0;
    $totalLessons = 0;
    foreach ($report['languages'] as $lang) {
        $totalGrammar += $lang['grammarCount'];
        $totalLessons += $lang['totalLessons'];
    }

    $report['summary'] = [
        'totalGrammarFiles' => $totalGrammar,
        'totalLessons' => $totalLessons,
        'overallCoverage' => $totalLessons > 0 ? round(($totalGrammar / $totalLessons) * 100, 1) : 0
    ];

    echo json_encode($report, JSON_PRETTY_PRINT);
}

// ------------------------------------------------
// 5. CONFLICT DETECTION
// ------------------------------------------------
function detectScanConflicts() {
    global $assetsDir, $manifestPath;

    try {
        $conflicts = [];

        // Load existing manifest
        if (!file_exists($manifestPath)) {
            echo json_encode([
                'success' => true,
                'hasConflicts' => false,
                'message' => 'No existing manifest - fresh scan will be performed'
            ]);
            return;
        }

        $manifestJson = file_get_contents($manifestPath);
        $existingManifest = json_decode($manifestJson, true);

        // Index existing cards
        $existingCards = [];
        if ($existingManifest && isset($existingManifest['cards'])) {
            foreach ($existingManifest['cards'] as $trig => $cards) {
                foreach ($cards as $card) {
                    $cardNum = $card['cardNum'] ?? ($card['wordNum'] ?? null);
                    if ($cardNum) {
                        $existingCards[$trig][$cardNum] = $card;
                    }
                }
            }
        }

        // Load CSV data
        $languages = loadLanguageList($assetsDir . '/Language_List.csv');
        $langByTrigraph = [];
        foreach ($languages as $l) $langByTrigraph[$l['trigraph']] = $l['name'];

        // Scan for new asset files
        $allFiles = scandir($assetsDir);
        $newAudioFiles = [];
        $newImageFiles = [];

        foreach ($allFiles as $f) {
            if ($f === '.' || $f === '..' || is_dir("$assetsDir/$f")) continue;
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));

            if (in_array($ext, ['mp3','m4a','wav','webm'])) {
                list($num, $trig) = extractAudioInfo($f);
                if ($num && $trig) {
                    $newAudioFiles[$trig][$num] = $f;
                }
            } elseif ($ext === 'png' || $ext === 'gif') {
                $num = extractWordNum($f);
                if ($num) {
                    $newImageFiles[$num][] = $f;
                }
            }
        }

        // Check each language
        foreach ($languages as $lang) {
            $trig = $lang['trigraph'];
            $csv = "$assetsDir/Word_List_" . $langByTrigraph[$trig] . ".csv";
            if (!file_exists($csv)) continue;

            $csvCards = loadLanguageWordList($csv);

            foreach ($csvCards as $csvCard) {
                $cardNum = $csvCard['cardNum'];
                $existingCard = $existingCards[$trig][$cardNum] ?? null;

                if (!$existingCard) continue; // New card, no conflict

                // Check for text changes when card has assets
                $hasExistingAudio = !empty($existingCard['audio']);
                $hasExistingImage = !empty($existingCard['printImagePath']);

                if ($hasExistingAudio || $hasExistingImage) {
                    $textChanged =
                        ($existingCard['word'] !== $csvCard['word']) ||
                        ($existingCard['english'] !== $csvCard['english']) ||
                        ($existingCard['lesson'] !== $csvCard['lesson']);

                    if ($textChanged) {
                        $conflicts[] = [
                            'type' => 'text_change_with_assets',
                            'cardNum' => $cardNum,
                            'trigraph' => $trig,
                            'language' => $langByTrigraph[$trig],
                            'existing' => [
                                'word' => $existingCard['word'],
                                'english' => $existingCard['english'],
                                'lesson' => $existingCard['lesson'],
                                'hasAudio' => $hasExistingAudio,
                                'audio' => $existingCard['audio'] ?? null,
                                'hasImage' => $hasExistingImage,
                                'image' => $existingCard['printImagePath'] ?? null
                            ],
                            'csv' => [
                                'word' => $csvCard['word'],
                                'english' => $csvCard['english'],
                                'lesson' => $csvCard['lesson']
                            ]
                        ];
                    }
                }

                // Check for new audio file when card already has audio
                if ($hasExistingAudio && isset($newAudioFiles[$trig][$cardNum])) {
                    $newFile = $newAudioFiles[$trig][$cardNum];
                    // In v4.0, audio is an array - get first element if array
                    $existingAudio = $existingCard['audio'];
                    if (is_array($existingAudio)) {
                        $existingAudio = reset($existingAudio); // Get first element
                    }
                    $existingFile = $existingAudio ? basename($existingAudio) : '';

                    if ($newFile !== $existingFile) {
                        $conflicts[] = [
                            'type' => 'new_audio_found',
                            'cardNum' => $cardNum,
                            'trigraph' => $trig,
                            'language' => $langByTrigraph[$trig],
                            'word' => $existingCard['word'],
                            'existingAudio' => $existingFile,
                            'newAudio' => $newFile
                        ];
                    }
                }
            }
        }

        echo json_encode([
            'success' => true,
            'hasConflicts' => count($conflicts) > 0,
            'conflictCount' => count($conflicts),
            'conflicts' => $conflicts
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Conflict detection error: ' . $e->getMessage()
        ]);
    }
}

// ------------------------------------------------
// 3. MAIN SCAN FUNCTION
// ------------------------------------------------
function scanAssets() {
    global $assetsDir, $manifestPath;

    try {
        // Get resolution mode and selected cards for conflict resolution
        $mode = $_GET['mode'] ?? 'update_all';
        $selectedCards = null;
        $selectedIndex = [];

        if ($mode === 'selective') {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            $selectedCards = $data['selectedCards'] ?? [];

            // Index selected cards for quick lookup
            foreach ($selectedCards as $sc) {
                $selectedIndex[$sc['trigraph']][$sc['cardNum']] = true;
            }
        }

        $languages = loadLanguageList($assetsDir . '/Language_List.csv');
    $langByTrigraph = [];
    foreach ($languages as $l) $langByTrigraph[$l['trigraph']] = $l['name'];

    // Load existing manifest for smart merging
    $existingManifest = null;
    $existingCards = [];
    if (file_exists($manifestPath)) {
        $manifestJson = file_get_contents($manifestPath);
        $existingManifest = json_decode($manifestJson, true);

        // Index existing cards by cardNum and trigraph for quick lookup
        if ($existingManifest && isset($existingManifest['cards'])) {
            foreach ($existingManifest['cards'] as $trig => $cards) {
                foreach ($cards as $card) {
                    $cardNum = $card['cardNum'] ?? ($card['wordNum'] ?? null);
                    if ($cardNum) {
                        $existingCards[$trig][$cardNum] = $card;
                    }
                }
            }
        }
    }

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
        if (in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) $pngFiles[] = $f;
        elseif (in_array($ext, ['gif', 'mp4', 'webm'])) $gifFiles[] = $f;
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
            $cardsMaster[$num]['cebuano'][$trig] = $card['cebuano'] ?? '';
            $cardsMaster[$num]['wordNote'][$trig] = $card['wordNote'] ?? '';
            $cardsMaster[$num]['cebuanoNote'][$trig] = $card['cebuanoNote'] ?? '';
            $cardsMaster[$num]['englishNote'][$trig] = $card['englishNote'] ?? '';
        }
    }

    // Link image files (PNG, JPG, JPEG, WebP)
    foreach ($pngFiles as $f) {
        $num = extractWordNum($f);
        if ($num && isset($cardsMaster[$num])) {
            $path = "assets/$f";
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));

            // Store the first image file as the default printImagePath
            if (!isset($cardsMaster[$num]['printImagePath'])) {
                $cardsMaster[$num]['printImagePath'] = $path;
                $cardsMaster[$num]['pngFile'] = $f;
            }

            // Store all image formats in the images array
            if (!isset($images[(string)$num])) {
                $images[(string)$num] = [];
            }
            $images[(string)$num][$ext] = $path;
        }
    }

    // Link animation/video files (GIF, MP4, WebM)
    foreach ($gifFiles as $f) {
        $num = extractWordNum($f);
        if ($num && isset($cardsMaster[$num])) {
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
            $path = "assets/$f";

            // Set hasGif flag if any animation file exists
            if (!$cardsMaster[$num]['hasGif']) {
                $cardsMaster[$num]['hasGif'] = true;
                $cardsMaster[$num]['gifFile'] = $f;
            }

            // Store all animation formats in the images array
            if (!isset($images[(string)$num])) {
                $images[(string)$num] = [];
            }
            $images[(string)$num][$ext] = $path;
        }
    }

    // Link Audio
    foreach ($audioFiles as $f) {
        list($num, $trig, $wordVariant) = extractAudioInfo($f);
        if ($num && $trig && isset($cardsMaster[$num])) {
            $path = "assets/$f";

            // Initialize audio arrays if not set
            if (!isset($cardsMaster[$num]['audio'][$trig])) {
                $cardsMaster[$num]['audio'][$trig] = [];
            }
            if (!isset($cardsMaster[$num]['audioFiles'][$trig])) {
                $cardsMaster[$num]['audioFiles'][$trig] = [];
            }

            // Store audio with word variant as key for proper ordering
            $cardsMaster[$num]['audio'][$trig][$wordVariant] = $path;
            $cardsMaster[$num]['audioFiles'][$trig][$wordVariant] = $f;
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

            // Build audio array matched to word variants
            $cardNum = $c['cardNum'];

            // Check if this card exists in the previous manifest (SMART MERGE)
            $existingCard = $existingCards[$trig][$cardNum] ?? null;

            // MODE HANDLING: Determine whether to update this card
            $shouldUpdateFromCSV = true;

            if ($mode === 'skip_existing' && $existingCard) {
                // Skip all existing cards, only add new ones
                $shouldUpdateFromCSV = false;
            } elseif ($mode === 'selective') {
                // Only update selected cards
                $shouldUpdateFromCSV = isset($selectedIndex[$trig][$cardNum]);
            }
            // For 'update_all' mode, $shouldUpdateFromCSV remains true

            // If we're skipping this card and it exists, use existing data entirely
            if (!$shouldUpdateFromCSV && $existingCard) {
                $finalCards[$trig][] = $existingCard;
                $langStats['totalCards']++;
                if (!empty($existingCard['hasAudio'])) $langStats['cardsWithAudio']++;
                if (!in_array($existingCard['lesson'], $langStats['lessons'])) {
                    $langStats['lessons'][] = $existingCard['lesson'];
                }
                continue;
            }

            // Build audio array matched to word variants (MULTI-VARIANT)
            $audioArray = [];
            $audioData = $c['audio'][$trig] ?? [];

            if (!empty($audioData) && is_array($audioData)) {
                // Split word by "/" to get variants
                $wordVariants = array_map('trim', explode('/', $c['word'][$trig]));

                // Match audio files to variants by word variant key
                foreach ($wordVariants as $variant) {
                    $variantLower = strtolower($variant);
                    if (isset($audioData[$variantLower])) {
                        $audioArray[] = $audioData[$variantLower];
                    } else {
                        // No audio file for this variant
                        $audioArray[] = null;
                    }
                }
            }

            $hasAudio = !empty(array_filter($audioArray));
            // Smart merge: Preserve existing audio if present (manual recordings are kept!)
            if ($existingCard && !empty($existingCard['audio'])) {
                $audioArray = $existingCard['audio'];
                // Ensure it's an array for multi-variant support
                if (!is_array($audioArray)) {
                    $audioArray = [$audioArray];
                }
            }

            $hasAudio = !empty(array_filter($audioArray));

            // Split words by "/" to create acceptableAnswers arrays (MULTI-VARIANT)
            $wordVariants = array_map('trim', explode('/', $c['word'][$trig]));
            $englishVariants = array_map('trim', explode('/', $c['english'][$trig] ?? ''));
            $cebuanoVariants = [];
            if (!empty($c['cebuano'][$trig])) {
                $cebuanoVariants = array_map('trim', explode('/', $c['cebuano'][$trig]));
            }

            // Smart merge: Preserve existing image paths
            $printImagePath = $existingCard['printImagePath'] ?? ($c['printImagePath'] ?? null);
            $hasGif = $existingCard['hasGif'] ?? ($c['hasGif'] ?? false);

            $finalCards[$trig][] = [
                'lesson' => $c['lesson'],
                'cardNum' => $c['cardNum'],
                'word' => $c['word'][$trig],
                'wordNote' => $c['wordNote'][$trig] ?? '',
                'english' => $c['english'][$trig] ?? '',
                'englishNote' => $c['englishNote'][$trig] ?? '',
                'cebuano' => $c['cebuano'][$trig] ?? '',
                'cebuanoNote' => $c['cebuanoNote'][$trig] ?? '',
                'grammar' => $c['grammar'],
                'category' => $c['category'],
                'subCategory1' => $c['subCategory1'],
                'subCategory2' => $c['subCategory2'],
                'actflEst' => $c['actflEst'],
                'type' => $c['type'],
                'acceptableAnswers' => [$c['word'][$trig]],
                'englishAcceptable' => [$c['english'][$trig] ?? ''],
                'acceptableAnswers' => $wordVariants,
                'englishAcceptable' => $englishVariants,
                'cebuanoAcceptable' => $cebuanoVariants,
                'audio' => $audioArray,
                'hasAudio' => $hasAudio,
                'printImagePath' => $printImagePath,
                'hasGif' => $hasGif
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

    // Load sentence words for each language
    $sentenceWords = loadAllSentenceWords($assetsDir, $languages);

    $manifest = [
        'version' => '4.0',
        'lastUpdated' => date('c'),
        'languages' => $languages,
        'images' => $images,
        'cards' => $finalCards,
        'sentenceWords' => $sentenceWords,
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
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Scan error: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
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

    // Detect format by checking if "Cebuano Word" column exists
    // Cebuano CSV: Word, WordNote, English, EnglishNote (columns 2-5)
    // Other languages: Word, WordNote, Cebuano Word, CebuanoNote, English, EnglishNote (columns 2-7)
    $hasCebuanoColumn = false;
    foreach ($headers as $header) {
        if (stripos($header, 'Cebuano') !== false && stripos($header, 'Word') !== false) {
            $hasCebuanoColumn = true;
            break;
        }
    }

    while (($row = fgetcsv($file)) !== false) {
        if (count($row) < 6) continue;

        if ($hasCebuanoColumn) {
            // Non-Cebuano format: includes Cebuano translation
            $cards[] = [
                'lesson' => (int)$row[0],
                'cardNum' => (int)$row[1],
                'word' => trim($row[2]),
                'wordNote' => $row[3] ?? '',
                'cebuano' => trim($row[4]),        // Cebuano translation
                'cebuanoNote' => $row[5] ?? '',
                'english' => trim($row[6]),        // English translation
                'englishNote' => $row[7] ?? '',
                'grammar' => $row[8] ?? '',
                'category' => $row[9] ?? '',
                'subCategory1' => $row[10] ?? '',
                'subCategory2' => $row[11] ?? '',
                'actflEst' => $row[12] ?? '',
                'type' => $row[13] ?? 'N'
            ];
        } else {
            // Cebuano format: word IS Cebuano, only English translation
            $cards[] = [
                'lesson' => (int)$row[0],
                'cardNum' => (int)$row[1],
                'word' => trim($row[2]),
                'wordNote' => $row[3] ?? '',
                'cebuano' => trim($row[2]),        // Word itself is Cebuano
                'cebuanoNote' => $row[3] ?? '',
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
    }
    fclose($file);
    return $cards;
}

function extractWordNum($filename) {
    if (preg_match('/^(\d+)\./', $filename, $m)) return (int)$m[1];
    return null;
}

function extractAudioInfo($filename) {
    // Pattern: {num}.{trigraph}.{wordVariant}.{ext}
    // Example: 12.ceb.ako.m4a or 12.ceb.ako-ko.m4a (backward compatible)
    if (preg_match('/^(\d+)\.([a-z]{3})\.([^.]+)\./', $filename, $m)) {
        return [(int)$m[1], $m[2], $m[3]];  // [cardNum, trigraph, wordVariant]
    }
    return [null, null, null];
}

/**
 * Load all sentence words CSV files for each language
 */
function loadAllSentenceWords($assetsDir, $languages) {
    $sentenceWords = [];

    foreach ($languages as $lang) {
        $trig = $lang['trigraph'];
        if ($trig === 'eng') continue; // Skip English

        $csvPath = $assetsDir . '/Sentence_Words_' . $trig . '.csv';
        if (file_exists($csvPath)) {
            $sentenceWords[$trig] = loadSentenceWordsCSV($csvPath);
        }
    }

    return $sentenceWords;
}

/**
 * Load and parse a single Sentence Words CSV file
 * Format: Lesson #, WordType1, WordType2, ... (columns are dynamic)
 * Each cell contains comma-separated words
 */
function loadSentenceWordsCSV($path) {
    $result = [];

    if (!file_exists($path)) return $result;

    $file = fopen($path, 'r');
    if (!$file) return $result;

    // Read headers - first row defines word types
    $headers = fgetcsv($file);
    if (!$headers || count($headers) < 2) {
        fclose($file);
        return $result;
    }

    // First column is "Lesson #", rest are word types
    $wordTypes = [];
    for ($i = 1; $i < count($headers); $i++) {
        $wordTypes[$i] = trim($headers[$i]);
    }

    // Process each row (each row is a lesson)
    while (($row = fgetcsv($file)) !== false) {
        if (count($row) < 2) continue;

        $lesson = trim($row[0]);
        if (empty($lesson) || !is_numeric($lesson)) continue;

        $lessonNum = (int)$lesson;
        $result[$lessonNum] = [];

        // Process each word type column
        for ($i = 1; $i < count($row); $i++) {
            $wordType = $wordTypes[$i] ?? null;
            if (!$wordType) continue;

            $cellValue = trim($row[$i] ?? '');
            if (empty($cellValue)) continue;

            // Split comma-separated words and clean them
            $words = array_map('trim', explode(',', $cellValue));
            $words = array_filter($words, function($w) { return !empty($w); });

            if (!empty($words)) {
                $result[$lessonNum][$wordType] = array_values($words);
            }
        }
    }

    fclose($file);
    return $result;
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
        .format-tag { display: inline-block; padding: 2px 4px; margin-left: 2px; background: rgba(255, 255, 255, 0.3); border-radius: 2px; font-size: 9px; font-weight: 700; letter-spacing: 0.3px; }
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
        
        // Build files found HTML with format icons
        $filesHtml = '';

        // Show image files (PNG, JPG, JPEG, WebP) with format icons
        if ($hasPng) {
            $baseFilename = preg_replace('/\.(png|jpg|jpeg|webp)$/i', '', $card['pngFile']);
            $imageFormats = [];

            // Check all available image formats from the images array
            if (isset($images[(string)$num])) {
                if (isset($images[(string)$num]['png'])) $imageFormats[] = 'PNG';
                if (isset($images[(string)$num]['jpg'])) $imageFormats[] = 'JPG';
                if (isset($images[(string)$num]['jpeg'])) $imageFormats[] = 'JPEG';
                if (isset($images[(string)$num]['webp'])) $imageFormats[] = 'WebP';
            }

            if (count($imageFormats) > 1) {
                $formatIcons = implode(' ', array_map(function($fmt) {
                    return '<span class="format-tag">' . $fmt . '</span>';
                }, $imageFormats));
                $filesHtml .= '<span class="file-badge png">IMG: ' . htmlspecialchars($baseFilename) . ' ' . $formatIcons . '</span> ';
            } else {
                $filesHtml .= '<span class="file-badge png">PNG: ' . htmlspecialchars($card['pngFile']) . '</span> ';
            }
        }

        // Show video/animation files (GIF, MP4, WebM) with format icons
        if ($hasGif) {
            $baseFilename = preg_replace('/\.(gif|mp4|webm)$/i', '', $card['gifFile']);
            $videoFormats = [];

            // Check all available video formats from the images array
            if (isset($images[(string)$num])) {
                if (isset($images[(string)$num]['gif'])) $videoFormats[] = 'GIF';
                if (isset($images[(string)$num]['mp4'])) $videoFormats[] = 'MP4';
                if (isset($images[(string)$num]['webm'])) $videoFormats[] = 'WebM';
            }

            if (count($videoFormats) > 1) {
                $formatIcons = implode(' ', array_map(function($fmt) {
                    return '<span class="format-tag">' . $fmt . '</span>';
                }, $videoFormats));
                $filesHtml .= '<span class="file-badge gif">VID: ' . htmlspecialchars($baseFilename) . ' ' . $formatIcons . '</span> ';
            } else {
                $filesHtml .= '<span class="file-badge gif">GIF: ' . htmlspecialchars($card['gifFile']) . '</span> ';
            }
        }
        if ($hasAudio) {
            foreach ($card['audioFiles'] as $trig => $audioFiles) {
                $trigUpper = strtoupper($trig);
                if (is_array($audioFiles)) {
                    foreach ($audioFiles as $audioFile) {
                        if ($audioFile) {
                            $filesHtml .= '<span class="file-badge audio">' . $trigUpper . ': ' . htmlspecialchars($audioFile) . '</span> ';
                        }
                    }
                } else if ($audioFiles) {
                    $filesHtml .= '<span class="file-badge audio">' . $trigUpper . ': ' . htmlspecialchars($audioFiles) . '</span> ';
                }
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