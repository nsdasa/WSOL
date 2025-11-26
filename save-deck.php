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
?>
