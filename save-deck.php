<?php
/**
 * Save Deck Changes - Directly updates manifest.json
 * Preserves all asset links and only updates card data
 */

require_once 'config.php';
enforceHttps();

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
    if (!isset($data['trigraph']) || !isset($data['cards'])) {
        throw new Exception('Missing required fields: trigraph or cards');
    }

    $trigraph = $data['trigraph'];
    $cards = $data['cards'];
    $lessonMeta = isset($data['lessonMeta']) ? $data['lessonMeta'] : null;

    // Validate trigraph
    $allowedTrigraphs = ['ceb', 'mrw', 'sin', 'eng'];
    if (!in_array($trigraph, $allowedTrigraphs)) {
        throw new Exception('Invalid trigraph: ' . $trigraph);
    }

    // Define paths
    $assetsDir = __DIR__ . '/assets';
    $manifestPath = $assetsDir . '/manifest.json';

    // Check if assets directory exists
    if (!is_dir($assetsDir)) {
        throw new Exception('Assets directory not found');
    }

    // Load existing manifest
    if (!file_exists($manifestPath)) {
        // Create new v4.0 manifest if doesn't exist
        $manifest = [
            'version' => '4.0',
            'lastUpdated' => date('c'),
            'languages' => [
                ['id' => 1, 'name' => 'Cebuano', 'trigraph' => 'ceb'],
                ['id' => 2, 'name' => 'English', 'trigraph' => 'eng'],
                ['id' => 3, 'name' => 'Maranao', 'trigraph' => 'mrw'],
                ['id' => 4, 'name' => 'Sinama', 'trigraph' => 'sin']
            ],
            'images' => new stdClass(),
            'cards' => new stdClass(),
            'stats' => [
                'totalCards' => 0,
                'cardsWithAudio' => 0,
                'totalImages' => 0
            ]
        ];
    } else {
        $manifestJson = file_get_contents($manifestPath);
        $manifest = json_decode($manifestJson, true);

        if (!$manifest) {
            throw new Exception('Failed to parse existing manifest.json');
        }
    }

    // Update the specific language's cards
    $manifest['cards'][$trigraph] = $cards;

    // Update manifest.images based on card data
    // Initialize images array if not exists
    if (!isset($manifest['images']) || !is_array($manifest['images'])) {
        $manifest['images'] = [];
    }

    // Scan assets directory to build images array with all format variants
    foreach ($cards as $card) {
        $cardNum = isset($card['cardNum']) ? $card['cardNum'] : (isset($card['wordNum']) ? $card['wordNum'] : null);
        if (!$cardNum) continue;

        // Initialize card's image formats if not exists
        if (!isset($manifest['images'][(string)$cardNum])) {
            $manifest['images'][(string)$cardNum] = [];
        }

        // Check for image file variants (png, jpg, jpeg, webp)
        if (!empty($card['printImagePath'])) {
            $ext = strtolower(pathinfo($card['printImagePath'], PATHINFO_EXTENSION));
            $manifest['images'][(string)$cardNum][$ext] = $card['printImagePath'];

            // Check for other image format variants with same base name
            $basePath = preg_replace('/\.(png|jpg|jpeg|webp)$/i', '', $card['printImagePath']);
            foreach (['png', 'jpg', 'jpeg', 'webp'] as $checkExt) {
                $variantPath = $basePath . '.' . $checkExt;
                if (file_exists(__DIR__ . '/' . $variantPath)) {
                    $manifest['images'][(string)$cardNum][$checkExt] = $variantPath;
                }
            }
        }

        // Check for video/animation file variants (gif, mp4, webm)
        if (!empty($card['gifPath'])) {
            $ext = strtolower(pathinfo($card['gifPath'], PATHINFO_EXTENSION));
            $manifest['images'][(string)$cardNum][$ext] = $card['gifPath'];

            // Check for other video format variants with same base name
            $basePath = preg_replace('/\.(gif|mp4|webm)$/i', '', $card['gifPath']);
            foreach (['gif', 'mp4', 'webm'] as $checkExt) {
                $variantPath = $basePath . '.' . $checkExt;
                if (file_exists(__DIR__ . '/' . $variantPath)) {
                    $manifest['images'][(string)$cardNum][$checkExt] = $variantPath;
                }
            }
        }
    }

    // Update lessonMeta if provided
    if ($lessonMeta !== null) {
        // Initialize lessonMeta section if not exists
        if (!isset($manifest['lessonMeta'])) {
            $manifest['lessonMeta'] = [];
        }
        // Update lessonMeta for this language
        $manifest['lessonMeta'][$trigraph] = $lessonMeta;
    }

    // Update sentenceReview if provided (legacy support)
    if (isset($data['sentenceReview'])) {
        // Initialize sentenceReview section if not exists
        if (!isset($manifest['sentenceReview'])) {
            $manifest['sentenceReview'] = [];
        }
        // Update sentenceReview for this language
        $manifest['sentenceReview'][$trigraph] = $data['sentenceReview'];

        // Generate sentence index CSV after updating sentence review data
        generateSentenceIndexCSV($manifest, __DIR__ . '/assets/sentences/audio');
    }

    // Update new sentences structure if provided
    if (isset($data['sentences'])) {
        // Initialize sentences section if not exists
        if (!isset($manifest['sentences'])) {
            $manifest['sentences'] = [];
        }
        // Initialize language section if not exists
        if (!isset($manifest['sentences'][$trigraph])) {
            $manifest['sentences'][$trigraph] = [
                'pool' => [],
                'reviewZone' => ['lessons' => new stdClass()],
                'conversationZone' => ['lessons' => new stdClass()],
                'storyZone' => ['lessons' => new stdClass()]
            ];
        }

        // Update specific parts if provided
        if (isset($data['sentences']['pool'])) {
            $manifest['sentences'][$trigraph]['pool'] = $data['sentences']['pool'];
        }
        if (isset($data['sentences']['reviewZone'])) {
            $manifest['sentences'][$trigraph]['reviewZone'] = $data['sentences']['reviewZone'];
        }
        if (isset($data['sentences']['conversationZone'])) {
            $manifest['sentences'][$trigraph]['conversationZone'] = $data['sentences']['conversationZone'];
        }
        if (isset($data['sentences']['storyZone'])) {
            $manifest['sentences'][$trigraph]['storyZone'] = $data['sentences']['storyZone'];
        }
    }

    // Update timestamp
    $manifest['lastUpdated'] = date('c');

    // Recalculate stats
    $manifest['stats'] = calculateStats($manifest);

    // Write back to manifest.json
    $result = file_put_contents(
        $manifestPath,
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    );

    if ($result === false) {
        throw new Exception('Failed to write manifest.json');
    }

    // Set proper permissions
    chmod($manifestPath, 0644);

    // Clear file cache
    clearstatcache(true, $manifestPath);

    echo json_encode([
        'success' => true,
        'message' => 'Changes saved directly to manifest.json',
        'cardCount' => count($cards),
        'bytes' => $result,
        'info' => 'Changes are immediately active. Format variants automatically detected.'
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
 * Calculate manifest statistics
 */
function calculateStats($manifest) {
    $stats = [
        'totalCards' => 0,
        'cardsWithAudio' => 0,
        'totalImages' => 0,
        'languageStats' => []
    ];

    if (isset($manifest['cards']) && is_array($manifest['cards'])) {
        foreach ($manifest['cards'] as $trigraph => $cards) {
            $langStats = [
                'totalCards' => count($cards),
                'cardsWithAudio' => 0,
                'lessons' => []
            ];

            foreach ($cards as $card) {
                if (!empty($card['hasAudio'])) {
                    $langStats['cardsWithAudio']++;
                    $stats['cardsWithAudio']++;
                }

                if (isset($card['lesson']) && !in_array($card['lesson'], $langStats['lessons'])) {
                    $langStats['lessons'][] = $card['lesson'];
                }
            }

            // Also include review lessons from lessonMeta
            if (isset($manifest['lessonMeta'][$trigraph]) && is_array($manifest['lessonMeta'][$trigraph])) {
                foreach ($manifest['lessonMeta'][$trigraph] as $lessonNum => $meta) {
                    $lessonNum = (int)$lessonNum;
                    if (!in_array($lessonNum, $langStats['lessons'])) {
                        $langStats['lessons'][] = $lessonNum;
                    }
                }
            }

            sort($langStats['lessons']);
            $stats['languageStats'][$trigraph] = $langStats;
            $stats['totalCards'] += $langStats['totalCards'];
        }
    }

    if (isset($manifest['images'])) {
        $stats['totalImages'] = is_array($manifest['images']) ? count($manifest['images']) : count((array)$manifest['images']);
    }

    return $stats;
}

/**
 * Generate sentence index CSV file for all languages
 * This creates a human-readable reference for recording native speaker audio
 * @param array $manifest The full manifest data
 * @param string $audioDir Path to the sentences/audio directory
 */
function generateSentenceIndexCSV($manifest, $audioDir) {
    // Ensure directory exists
    if (!is_dir($audioDir)) {
        mkdir($audioDir, 0755, true);
    }

    // Collect all sentences across all languages with deduplication
    $sentenceIndex = [];
    $sentenceMap = []; // Maps "trigraph:text" to sentenceNum for deduplication

    if (!isset($manifest['sentenceReview']) || !is_array($manifest['sentenceReview'])) {
        return;
    }

    // Track next sentence number per language
    $nextSentenceNum = [];

    foreach ($manifest['sentenceReview'] as $trigraph => $langData) {
        if (!isset($langData['lessons']) || !is_array($langData['lessons'])) {
            continue;
        }

        // Initialize sentence counter for this language
        if (!isset($nextSentenceNum[$trigraph])) {
            $nextSentenceNum[$trigraph] = 1;
        }

        // Ensure language audio directory exists
        $langAudioDir = $audioDir . '/' . $trigraph;
        if (!is_dir($langAudioDir)) {
            mkdir($langAudioDir, 0755, true);
        }

        foreach ($langData['lessons'] as $lessonNum => $lessonData) {
            if (!isset($lessonData['sequences']) || !is_array($lessonData['sequences'])) {
                continue;
            }

            foreach ($lessonData['sequences'] as $sequence) {
                $sequenceTitle = isset($sequence['title']) ? $sequence['title'] : 'Untitled';

                if (!isset($sequence['sentences']) || !is_array($sequence['sentences'])) {
                    continue;
                }

                foreach ($sequence['sentences'] as $sentence) {
                    $text = isset($sentence['text']) ? trim($sentence['text']) : '';
                    if (empty($text)) continue;

                    $english = isset($sentence['english']) ? $sentence['english'] : '';
                    $cebuano = isset($sentence['cebuano']) ? $sentence['cebuano'] : '';

                    // Create unique key for deduplication
                    $dedupKey = $trigraph . ':' . $text;

                    if (isset($sentenceMap[$dedupKey])) {
                        // Sentence already exists, add this location to it
                        $existingNum = $sentenceMap[$dedupKey];
                        foreach ($sentenceIndex as &$entry) {
                            if ($entry['sentenceNum'] == $existingNum && $entry['trigraph'] == $trigraph) {
                                // Add lesson and sequence if not already present
                                if (strpos($entry['lessons'], (string)$lessonNum) === false) {
                                    $entry['lessons'] .= ', ' . $lessonNum;
                                }
                                if (strpos($entry['sequences'], $sequenceTitle) === false) {
                                    $entry['sequences'] .= ', ' . $sequenceTitle;
                                }
                                break;
                            }
                        }
                        unset($entry);
                    } else {
                        // New sentence - assign number
                        $sentenceNum = $nextSentenceNum[$trigraph]++;
                        $sentenceMap[$dedupKey] = $sentenceNum;

                        $sentenceIndex[] = [
                            'sentenceNum' => $sentenceNum,
                            'trigraph' => $trigraph,
                            'text' => $text,
                            'english' => $english,
                            'cebuano' => $cebuano,
                            'lessons' => (string)$lessonNum,
                            'sequences' => $sequenceTitle
                        ];
                    }
                }
            }
        }
    }

    // Sort by language then sentence number
    usort($sentenceIndex, function($a, $b) {
        $langCompare = strcmp($a['trigraph'], $b['trigraph']);
        if ($langCompare !== 0) return $langCompare;
        return $a['sentenceNum'] - $b['sentenceNum'];
    });

    // Write CSV file
    $csvPath = $audioDir . '/sentence-index.csv';
    $fp = fopen($csvPath, 'w');

    // Write header - include Cebuano Translation column for non-Cebuano languages
    fputcsv($fp, ['Sentence #', 'Language', 'Text', 'English Translation', 'Cebuano Translation', 'Lessons', 'Sequences']);

    // Write data rows
    foreach ($sentenceIndex as $entry) {
        fputcsv($fp, [
            $entry['sentenceNum'],
            $entry['trigraph'],
            $entry['text'],
            $entry['english'],
            $entry['cebuano'],
            $entry['lessons'],
            $entry['sequences']
        ]);
    }

    fclose($fp);
    chmod($csvPath, 0644);
}
?>
