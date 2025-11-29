<?php
/**
 * Migration Script: Convert sentenceReview to new sentences structure
 *
 * OLD: sentenceReview.ceb.lessons["1"].sequences[].sentences[]
 * NEW: sentences.ceb.pool[] + sentences.ceb.reviewZone.lessons["1"].sequences[].sentenceNums[]
 *
 * Run once to migrate data, then delete this file.
 */

require_once 'config.php';

header('Content-Type: application/json');

// Load manifest
$manifestPath = __DIR__ . '/assets/manifest.json';
if (!file_exists($manifestPath)) {
    die(json_encode(['success' => false, 'error' => 'manifest.json not found']));
}

$manifest = json_decode(file_get_contents($manifestPath), true);
if (!$manifest) {
    die(json_encode(['success' => false, 'error' => 'Failed to parse manifest.json']));
}

// Check if already migrated
if (isset($manifest['sentences']) && !empty($manifest['sentences'])) {
    die(json_encode(['success' => false, 'error' => 'Already migrated - sentences structure exists']));
}

// Check if sentenceReview exists
if (!isset($manifest['sentenceReview']) || empty($manifest['sentenceReview'])) {
    die(json_encode(['success' => false, 'error' => 'No sentenceReview data to migrate']));
}

$migratedLanguages = [];

// Initialize new sentences structure
$manifest['sentences'] = [];

// Process each language
foreach ($manifest['sentenceReview'] as $trigraph => $langData) {
    $pool = [];
    $reviewZone = ['lessons' => []];
    $sentenceNumCounter = 1;
    $sentenceTextToNum = []; // Track sentence text to avoid duplicates

    if (!isset($langData['lessons'])) {
        continue;
    }

    // Process each lesson
    foreach ($langData['lessons'] as $lessonNum => $lessonData) {
        $reviewZone['lessons'][$lessonNum] = [
            'title' => $lessonData['title'] ?? "Lesson $lessonNum",
            'sequences' => []
        ];

        if (!isset($lessonData['sequences'])) {
            continue;
        }

        // Process each sequence
        foreach ($lessonData['sequences'] as $sequence) {
            $sequenceSentenceNums = [];

            if (!isset($sequence['sentences'])) {
                continue;
            }

            // Process each sentence
            foreach ($sequence['sentences'] as $sentence) {
                $sentenceText = trim($sentence['text'] ?? '');

                if (empty($sentenceText)) {
                    continue;
                }

                // Check if we've already added this sentence (by text)
                if (isset($sentenceTextToNum[$sentenceText])) {
                    // Reuse existing sentenceNum
                    $sequenceSentenceNums[] = $sentenceTextToNum[$sentenceText];
                } else {
                    // Add to pool with new sentenceNum
                    $newSentence = [
                        'sentenceNum' => $sentenceNumCounter,
                        'text' => $sentenceText,
                        'english' => $sentence['english'] ?? '',
                        'type' => $sentence['sentenceType'] ?? null,
                        'audioPath' => null, // New field for sentence audio
                        'words' => $sentence['words'] ?? []
                    ];

                    $pool[] = $newSentence;
                    $sentenceTextToNum[$sentenceText] = $sentenceNumCounter;
                    $sequenceSentenceNums[] = $sentenceNumCounter;
                    $sentenceNumCounter++;
                }
            }

            // Add sequence with sentenceNums reference
            $reviewZone['lessons'][$lessonNum]['sequences'][] = [
                'id' => $sequence['id'] ?? count($reviewZone['lessons'][$lessonNum]['sequences']) + 1,
                'title' => $sequence['title'] ?? 'Untitled Sequence',
                'sentenceNums' => $sequenceSentenceNums
            ];
        }
    }

    // Create the new sentences structure for this language
    $manifest['sentences'][$trigraph] = [
        'pool' => $pool,
        'reviewZone' => $reviewZone,
        'conversationZone' => [
            'lessons' => new stdClass()  // Empty object for lessons
        ],
        'storyZone' => [
            'lessons' => new stdClass()  // Empty object for lessons
        ]
    ];

    $migratedLanguages[] = [
        'trigraph' => $trigraph,
        'poolSize' => count($pool),
        'lessons' => count($reviewZone['lessons'])
    ];
}

// Backup old sentenceReview (rename to sentenceReview_backup)
$manifest['sentenceReview_backup'] = $manifest['sentenceReview'];
unset($manifest['sentenceReview']);

// Update lastUpdated
$manifest['lastUpdated'] = date('c');

// Save manifest
$jsonOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
if (file_put_contents($manifestPath, json_encode($manifest, $jsonOptions))) {
    echo json_encode([
        'success' => true,
        'message' => 'Migration completed successfully',
        'migratedLanguages' => $migratedLanguages,
        'note' => 'Old data backed up to sentenceReview_backup'
    ], JSON_PRETTY_PRINT);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to write manifest.json'
    ]);
}
