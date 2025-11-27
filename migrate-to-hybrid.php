#!/usr/bin/env php
<?php
/**
 * WSOL Hybrid A+B Architecture Migration Script
 *
 * This script:
 * 1. Creates the new directory structure
 * 2. Migrates audio files to new locations with new naming
 * 3. Migrates image files to new locations with new naming
 * 4. Generates segmented manifest files (manifest-index, language indexes, lesson chunks)
 * 5. Creates a detailed migration report
 *
 * Usage: php migrate-to-hybrid.php [--dry-run] [--skip-files] [--skip-manifest]
 *
 * Options:
 *   --dry-run       Show what would be done without making changes
 *   --skip-files    Skip file migration, only generate manifest segments
 *   --skip-manifest Skip manifest generation, only migrate files
 */

// Configuration
define('BASE_DIR', __DIR__);
define('ASSETS_DIR', BASE_DIR . '/assets');
define('MANIFEST_PATH', ASSETS_DIR . '/manifest.json');

// Parse command line options
$options = getopt('', ['dry-run', 'skip-files', 'skip-manifest', 'help']);
$dryRun = isset($options['dry-run']);
$skipFiles = isset($options['skip-files']);
$skipManifest = isset($options['skip-manifest']);

if (isset($options['help'])) {
    echo "Usage: php migrate-to-hybrid.php [--dry-run] [--skip-files] [--skip-manifest]\n";
    echo "\nOptions:\n";
    echo "  --dry-run       Show what would be done without making changes\n";
    echo "  --skip-files    Skip file migration, only generate manifest segments\n";
    echo "  --skip-manifest Skip manifest generation, only migrate files\n";
    exit(0);
}

// Migration report
$report = [
    'startTime' => date('c'),
    'dryRun' => $dryRun,
    'directories' => ['created' => [], 'existed' => [], 'failed' => []],
    'audio' => ['migrated' => [], 'skipped' => [], 'failed' => []],
    'images' => ['migrated' => [], 'skipped' => [], 'failed' => []],
    'manifest' => ['files' => [], 'errors' => []],
    'summary' => []
];

echo "=================================================================\n";
echo "  WSOL Hybrid A+B Architecture Migration\n";
echo "=================================================================\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no changes will be made)" : "LIVE") . "\n";
echo "Started: " . $report['startTime'] . "\n";
echo "=================================================================\n\n";

// Load existing manifest
if (!file_exists(MANIFEST_PATH)) {
    die("ERROR: manifest.json not found at " . MANIFEST_PATH . "\n");
}

$manifest = json_decode(file_get_contents(MANIFEST_PATH), true);
if (!$manifest) {
    die("ERROR: Failed to parse manifest.json\n");
}

echo "Loaded manifest v{$manifest['version']} with " . count($manifest['languages']) . " languages\n\n";

// =================================================================
// PHASE 1: Create Directory Structure
// =================================================================
echo "PHASE 1: Creating directory structure...\n";
echo "-----------------------------------------------------------------\n";

$languages = ['ceb', 'mrw', 'sin'];

// Calculate needed buckets based on max cardNum
$maxCardNum = 0;
foreach ($manifest['cards'] as $langCards) {
    foreach ($langCards as $card) {
        if (isset($card['cardNum']) && $card['cardNum'] > $maxCardNum) {
            $maxCardNum = $card['cardNum'];
        }
    }
}
// Round up to nearest 100 and add buffer
$maxBucket = ceil($maxCardNum / 100) * 100 + 500;

$buckets = [];
for ($i = 1; $i <= $maxBucket; $i += 100) {
    $buckets[] = sprintf('%04d-%04d', $i, $i + 99);
}

$directories = [
    // Data directories
    ASSETS_DIR . '/data',
    ASSETS_DIR . '/data/shared',
];

// Language-specific data directories
foreach ($languages as $lang) {
    $directories[] = ASSETS_DIR . "/data/languages/$lang";
}

// Audio directories with buckets
foreach ($languages as $lang) {
    $directories[] = ASSETS_DIR . "/audio/$lang";
    foreach ($buckets as $bucket) {
        $directories[] = ASSETS_DIR . "/audio/$lang/$bucket";
    }
}

// Image directories with buckets
foreach (['webp', 'png'] as $format) {
    $directories[] = ASSETS_DIR . "/images/$format";
    foreach ($buckets as $bucket) {
        $directories[] = ASSETS_DIR . "/images/$format/$bucket";
    }
}

foreach ($directories as $dir) {
    $relativePath = str_replace(BASE_DIR . '/', '', $dir);
    if (is_dir($dir)) {
        $report['directories']['existed'][] = $relativePath;
    } else {
        if ($dryRun) {
            echo "  [DRY-RUN] Would create: $relativePath\n";
            $report['directories']['created'][] = $relativePath;
        } else {
            if (@mkdir($dir, 0755, true)) {
                echo "  Created: $relativePath\n";
                $report['directories']['created'][] = $relativePath;
            } else {
                echo "  FAILED: $relativePath\n";
                $report['directories']['failed'][] = $relativePath;
            }
        }
    }
}

echo "\nDirectories: " . count($report['directories']['created']) . " created, "
    . count($report['directories']['existed']) . " existed\n\n";

// =================================================================
// PHASE 2: Migrate Audio Files
// =================================================================
if (!$skipFiles) {
    echo "PHASE 2: Migrating audio files...\n";
    echo "-----------------------------------------------------------------\n";

    foreach ($manifest['cards'] as $trigraph => $cards) {
        echo "  Processing $trigraph audio...\n";

        foreach ($cards as $card) {
            if (empty($card['audio']) || !is_array($card['audio'])) continue;

            foreach ($card['audio'] as $oldPath) {
                $oldFullPath = BASE_DIR . '/' . $oldPath;

                if (!file_exists($oldFullPath)) {
                    $report['audio']['skipped'][] = [
                        'cardNum' => $card['cardNum'],
                        'old' => $oldPath,
                        'reason' => 'File not found'
                    ];
                    continue;
                }

                // Generate new path
                $cardNum = $card['cardNum'];
                $word = normalizeWord($card['word']);
                $bucket = getBucket($cardNum);
                $paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);

                // Get file extension from original
                $ext = pathinfo($oldPath, PATHINFO_EXTENSION) ?: 'm4a';

                $newPath = "assets/audio/$trigraph/$bucket/$paddedNum.$word.$ext";
                $newFullPath = BASE_DIR . '/' . $newPath;

                // Check if already migrated
                if (file_exists($newFullPath)) {
                    $report['audio']['skipped'][] = [
                        'cardNum' => $cardNum,
                        'old' => $oldPath,
                        'new' => $newPath,
                        'reason' => 'Already exists'
                    ];
                    continue;
                }

                if ($dryRun) {
                    echo "    [DRY-RUN] $oldPath -> $newPath\n";
                    $report['audio']['migrated'][] = [
                        'cardNum' => $cardNum,
                        'old' => $oldPath,
                        'new' => $newPath
                    ];
                } else {
                    if (copy($oldFullPath, $newFullPath)) {
                        $report['audio']['migrated'][] = [
                            'cardNum' => $cardNum,
                            'old' => $oldPath,
                            'new' => $newPath
                        ];
                    } else {
                        echo "    FAILED: $oldPath\n";
                        $report['audio']['failed'][] = [
                            'cardNum' => $cardNum,
                            'old' => $oldPath,
                            'new' => $newPath,
                            'reason' => 'Copy failed'
                        ];
                    }
                }
            }
        }
    }

    echo "\nAudio: " . count($report['audio']['migrated']) . " migrated, "
        . count($report['audio']['skipped']) . " skipped, "
        . count($report['audio']['failed']) . " failed\n\n";

    // =================================================================
    // PHASE 3: Migrate Image Files
    // =================================================================
    echo "PHASE 3: Migrating image files...\n";
    echo "-----------------------------------------------------------------\n";

    foreach ($manifest['images'] as $cardNum => $formats) {
        if (empty($formats) || !is_array($formats)) continue;

        // Find the card to get word/english
        $cardInfo = findCardByNum($manifest, $cardNum);
        if (!$cardInfo) {
            $report['images']['skipped'][] = [
                'cardNum' => $cardNum,
                'reason' => 'Card not found in manifest'
            ];
            continue;
        }

        $word = normalizeWord($cardInfo['word']);
        $english = normalizeWord($cardInfo['english']);
        $bucket = getBucket($cardNum);
        $paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);

        foreach ($formats as $format => $oldPath) {
            if (empty($oldPath) || !is_string($oldPath)) continue;

            $oldFullPath = BASE_DIR . '/' . $oldPath;

            if (!file_exists($oldFullPath)) {
                $report['images']['skipped'][] = [
                    'cardNum' => $cardNum,
                    'format' => $format,
                    'old' => $oldPath,
                    'reason' => 'File not found'
                ];
                continue;
            }

            // Determine target directory based on format
            $targetFormat = $format;
            if ($format === 'gif' || $format === 'webm' || $format === 'mp4') {
                // Keep animated formats in webp directory for now
                $targetFormat = $format;
                $newPath = "assets/images/webp/$bucket/$paddedNum.$word.$english.$format";
            } else {
                $newPath = "assets/images/$format/$bucket/$paddedNum.$word.$english.$format";
            }

            $newFullPath = BASE_DIR . '/' . $newPath;

            // Ensure directory exists for special formats
            $newDir = dirname($newFullPath);
            if (!is_dir($newDir) && !$dryRun) {
                @mkdir($newDir, 0755, true);
            }

            // Check if already migrated
            if (file_exists($newFullPath)) {
                $report['images']['skipped'][] = [
                    'cardNum' => $cardNum,
                    'format' => $format,
                    'old' => $oldPath,
                    'new' => $newPath,
                    'reason' => 'Already exists'
                ];
                continue;
            }

            if ($dryRun) {
                echo "  [DRY-RUN] $oldPath -> $newPath\n";
                $report['images']['migrated'][] = [
                    'cardNum' => $cardNum,
                    'format' => $format,
                    'old' => $oldPath,
                    'new' => $newPath
                ];
            } else {
                if (copy($oldFullPath, $newFullPath)) {
                    $report['images']['migrated'][] = [
                        'cardNum' => $cardNum,
                        'format' => $format,
                        'old' => $oldPath,
                        'new' => $newPath
                    ];
                } else {
                    echo "  FAILED: $oldPath\n";
                    $report['images']['failed'][] = [
                        'cardNum' => $cardNum,
                        'format' => $format,
                        'old' => $oldPath,
                        'new' => $newPath,
                        'reason' => 'Copy failed'
                    ];
                }
            }
        }
    }

    echo "\nImages: " . count($report['images']['migrated']) . " migrated, "
        . count($report['images']['skipped']) . " skipped, "
        . count($report['images']['failed']) . " failed\n\n";
}

// =================================================================
// PHASE 4: Generate Segmented Manifest Files
// =================================================================
if (!$skipManifest) {
    echo "PHASE 4: Generating segmented manifest files...\n";
    echo "-----------------------------------------------------------------\n";

    // 4.1: Generate manifest-index.json
    $manifestIndex = [
        'version' => '5.0',
        'schemaVersion' => '5.0.0',
        'lastUpdated' => date('c'),
        'migratedFrom' => $manifest['version'] ?? '4.0',
        'languages' => $manifest['languages'],
        'stats' => $manifest['stats'] ?? [
            'totalCards' => 0,
            'cardsWithAudio' => 0,
            'totalImages' => count($manifest['images'] ?? [])
        ],
        'features' => [
            'sentenceBuilder' => ['enabled' => !empty($manifest['sentenceWords'])],
            'sentenceReview' => ['enabled' => !empty($manifest['sentenceReview'])],
            'voicePractice' => ['enabled' => true],
            'grammar' => ['enabled' => !empty($manifest['grammar'])]
        ],
        'dataVersion' => 1
    ];

    $indexPath = ASSETS_DIR . '/data/manifest-index.json';
    if ($dryRun) {
        echo "  [DRY-RUN] Would create: data/manifest-index.json\n";
    } else {
        file_put_contents($indexPath, json_encode($manifestIndex, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo "  Created: data/manifest-index.json\n";
    }
    $report['manifest']['files'][] = 'data/manifest-index.json';

    // 4.2: Generate shared/images.json
    $imagesRegistry = [
        'version' => 1,
        'lastUpdated' => date('c'),
        'basePaths' => [
            'webp' => 'assets/images/webp',
            'png' => 'assets/images/png'
        ],
        'images' => []
    ];

    foreach ($manifest['images'] as $cardNum => $formats) {
        if (empty($formats) || !is_array($formats)) continue;

        $cardInfo = findCardByNum($manifest, $cardNum);
        $word = $cardInfo ? normalizeWord($cardInfo['word']) : '';
        $english = $cardInfo ? normalizeWord($cardInfo['english']) : '';

        $imagesRegistry['images'][$cardNum] = [
            'word' => $word,
            'english' => $english,
            'formats' => []
        ];

        foreach ($formats as $format => $path) {
            if (!empty($path)) {
                $imagesRegistry['images'][$cardNum]['formats'][$format] = true;
            }
        }
    }

    $imagesPath = ASSETS_DIR . '/data/shared/images.json';
    if ($dryRun) {
        echo "  [DRY-RUN] Would create: data/shared/images.json\n";
    } else {
        file_put_contents($imagesPath, json_encode($imagesRegistry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo "  Created: data/shared/images.json\n";
    }
    $report['manifest']['files'][] = 'data/shared/images.json';

    // 4.3: Generate language-specific files
    foreach ($languages as $trigraph) {
        echo "\n  Processing language: $trigraph\n";

        $langCards = $manifest['cards'][$trigraph] ?? [];
        if (empty($langCards)) {
            echo "    No cards for $trigraph, skipping...\n";
            continue;
        }

        // Get lessons for this language
        $lessons = [];
        foreach ($langCards as $card) {
            if (isset($card['lesson']) && !in_array($card['lesson'], $lessons)) {
                $lessons[] = $card['lesson'];
            }
        }
        sort($lessons);

        // Group lessons into chunks of 4
        $lessonChunks = [];
        $chunkSize = 4;

        for ($i = 0; $i < count($lessons); $i += $chunkSize) {
            $chunkLessons = array_slice($lessons, $i, $chunkSize);
            $startLesson = min($chunkLessons);
            $endLesson = max($chunkLessons);

            // Pad to 3 digits for file naming
            $fileName = sprintf('lessons-%03d-%03d.json', $startLesson, $endLesson);

            $lessonChunks[] = [
                'file' => $fileName,
                'lessons' => $chunkLessons,
                'cardCount' => 0 // Will be updated below
            ];
        }

        // Generate language index
        $langIndex = [
            'chunkVersion' => 1,
            'lastModified' => date('c'),
            'trigraph' => $trigraph,
            'stats' => $manifest['stats']['languageStats'][$trigraph] ?? [
                'totalCards' => count($langCards),
                'cardsWithAudio' => 0
            ],
            'lessonChunks' => $lessonChunks,
            'lessonMeta' => $manifest['lessonMeta'][$trigraph] ?? [],
            'hasSentences' => !empty($manifest['sentenceWords'][$trigraph]),
            'hasSentenceReview' => !empty($manifest['sentenceReview'][$trigraph]['lessons']),
            'hasGrammar' => !empty($manifest['grammar'][$trigraph])
        ];

        $langIndexPath = ASSETS_DIR . "/data/languages/$trigraph/index.json";
        if ($dryRun) {
            echo "    [DRY-RUN] Would create: data/languages/$trigraph/index.json\n";
        } else {
            file_put_contents($langIndexPath, json_encode($langIndex, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo "    Created: data/languages/$trigraph/index.json\n";
        }
        $report['manifest']['files'][] = "data/languages/$trigraph/index.json";

        // Generate lesson chunk files
        foreach ($lessonChunks as $idx => $chunkInfo) {
            $chunkCards = array_filter($langCards, function($card) use ($chunkInfo) {
                return in_array($card['lesson'], $chunkInfo['lessons']);
            });

            // Update card count in language index
            $langIndex['lessonChunks'][$idx]['cardCount'] = count($chunkCards);

            // Transform cards for new format (remove full paths, add derived info)
            $transformedCards = [];
            foreach ($chunkCards as $card) {
                $transformed = $card;

                // Remove old path fields - paths will be derived
                unset($transformed['audio']);
                unset($transformed['printImagePath']);
                unset($transformed['gifPath']);

                // Keep hasAudio and hasGif flags
                $transformed['hasAudio'] = $card['hasAudio'] ?? false;
                $transformed['hasGif'] = $card['hasGif'] ?? false;

                $transformedCards[] = $transformed;
            }

            $chunk = [
                'chunkVersion' => 1,
                'lastModified' => date('c'),
                'trigraph' => $trigraph,
                'lessons' => $chunkInfo['lessons'],
                'cards' => array_values($transformedCards)
            ];

            $chunkPath = ASSETS_DIR . "/data/languages/$trigraph/{$chunkInfo['file']}";
            if ($dryRun) {
                echo "    [DRY-RUN] Would create: data/languages/$trigraph/{$chunkInfo['file']} (" . count($transformedCards) . " cards)\n";
            } else {
                file_put_contents($chunkPath, json_encode($chunk, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo "    Created: data/languages/$trigraph/{$chunkInfo['file']} (" . count($transformedCards) . " cards)\n";
            }
            $report['manifest']['files'][] = "data/languages/$trigraph/{$chunkInfo['file']}";
        }

        // Update language index with correct card counts
        if (!$dryRun) {
            file_put_contents($langIndexPath, json_encode($langIndex, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        // Generate sentences.json if data exists
        if (!empty($manifest['sentenceWords'][$trigraph])) {
            $sentences = [
                'version' => 1,
                'lastModified' => date('c'),
                'trigraph' => $trigraph,
                'sentenceWords' => $manifest['sentenceWords'][$trigraph]
            ];

            $sentencesPath = ASSETS_DIR . "/data/languages/$trigraph/sentences.json";
            if ($dryRun) {
                echo "    [DRY-RUN] Would create: data/languages/$trigraph/sentences.json\n";
            } else {
                file_put_contents($sentencesPath, json_encode($sentences, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo "    Created: data/languages/$trigraph/sentences.json\n";
            }
            $report['manifest']['files'][] = "data/languages/$trigraph/sentences.json";
        }

        // Generate sentence-review.json if data exists
        if (!empty($manifest['sentenceReview'][$trigraph]['lessons'])) {
            $sentenceReview = [
                'version' => 1,
                'lastModified' => date('c'),
                'trigraph' => $trigraph,
                'lessons' => $manifest['sentenceReview'][$trigraph]['lessons']
            ];

            $reviewPath = ASSETS_DIR . "/data/languages/$trigraph/sentence-review.json";
            if ($dryRun) {
                echo "    [DRY-RUN] Would create: data/languages/$trigraph/sentence-review.json\n";
            } else {
                file_put_contents($reviewPath, json_encode($sentenceReview, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo "    Created: data/languages/$trigraph/sentence-review.json\n";
            }
            $report['manifest']['files'][] = "data/languages/$trigraph/sentence-review.json";
        }

        // Generate grammar.json if data exists
        if (!empty($manifest['grammar'][$trigraph]) && is_array($manifest['grammar'][$trigraph])) {
            $grammar = [
                'version' => 1,
                'lastModified' => date('c'),
                'trigraph' => $trigraph,
                'lessons' => $manifest['grammar'][$trigraph]
            ];

            $grammarPath = ASSETS_DIR . "/data/languages/$trigraph/grammar.json";
            if ($dryRun) {
                echo "    [DRY-RUN] Would create: data/languages/$trigraph/grammar.json\n";
            } else {
                file_put_contents($grammarPath, json_encode($grammar, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo "    Created: data/languages/$trigraph/grammar.json\n";
            }
            $report['manifest']['files'][] = "data/languages/$trigraph/grammar.json";
        }
    }

    echo "\nManifest files: " . count($report['manifest']['files']) . " created\n\n";
}

// =================================================================
// PHASE 5: Generate Migration Report
// =================================================================
echo "PHASE 5: Generating migration report...\n";
echo "-----------------------------------------------------------------\n";

$report['endTime'] = date('c');
$report['summary'] = [
    'directoriesCreated' => count($report['directories']['created']),
    'directoriesExisted' => count($report['directories']['existed']),
    'directoriesFailed' => count($report['directories']['failed']),
    'audioMigrated' => count($report['audio']['migrated']),
    'audioSkipped' => count($report['audio']['skipped']),
    'audioFailed' => count($report['audio']['failed']),
    'imagesMigrated' => count($report['images']['migrated']),
    'imagesSkipped' => count($report['images']['skipped']),
    'imagesFailed' => count($report['images']['failed']),
    'manifestFilesCreated' => count($report['manifest']['files']),
    'success' => (
        count($report['directories']['failed']) === 0 &&
        count($report['audio']['failed']) === 0 &&
        count($report['images']['failed']) === 0 &&
        count($report['manifest']['errors']) === 0
    )
];

$reportPath = ASSETS_DIR . '/migration-report.json';
if (!$dryRun) {
    file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo "Report saved to: assets/migration-report.json\n";
}

// =================================================================
// Summary
// =================================================================
echo "\n=================================================================\n";
echo "  MIGRATION " . ($dryRun ? "(DRY RUN) " : "") . "COMPLETE\n";
echo "=================================================================\n";
echo "Directories:  {$report['summary']['directoriesCreated']} created, {$report['summary']['directoriesExisted']} existed\n";
echo "Audio files:  {$report['summary']['audioMigrated']} migrated, {$report['summary']['audioSkipped']} skipped, {$report['summary']['audioFailed']} failed\n";
echo "Image files:  {$report['summary']['imagesMigrated']} migrated, {$report['summary']['imagesSkipped']} skipped, {$report['summary']['imagesFailed']} failed\n";
echo "Manifest:     {$report['summary']['manifestFilesCreated']} files created\n";
echo "-----------------------------------------------------------------\n";
echo "Status: " . ($report['summary']['success'] ? "SUCCESS" : "COMPLETED WITH ERRORS") . "\n";
echo "=================================================================\n";

if ($dryRun) {
    echo "\nThis was a DRY RUN. No files were modified.\n";
    echo "Run without --dry-run to perform the actual migration.\n";
}

// =================================================================
// Helper Functions
// =================================================================

function normalizeWord($word) {
    if (empty($word)) return '';

    $word = strtolower($word);
    $word = str_replace("'", '', $word);       // Remove apostrophes
    $word = preg_replace('/\s+/', '-', $word); // Spaces to hyphens
    $word = preg_replace('/[^a-z0-9-]/', '', $word); // Keep only alphanumeric + hyphens
    $word = preg_replace('/-+/', '-', $word);  // Collapse multiple hyphens
    $word = trim($word, '-');                  // Remove leading/trailing hyphens

    return $word;
}

function getBucket($cardNum) {
    $start = floor(($cardNum - 1) / 100) * 100 + 1;
    $end = $start + 99;
    return sprintf('%04d-%04d', $start, $end);
}

function findCardByNum($manifest, $cardNum) {
    // First try to find in Cebuano (base language for images)
    if (!empty($manifest['cards']['ceb'])) {
        foreach ($manifest['cards']['ceb'] as $card) {
            if (isset($card['cardNum']) && $card['cardNum'] == $cardNum) {
                return $card;
            }
        }
    }

    // Fallback: search all languages
    foreach ($manifest['cards'] as $langCards) {
        foreach ($langCards as $card) {
            if (isset($card['cardNum']) && $card['cardNum'] == $cardNum) {
                return $card;
            }
        }
    }

    return null;
}
