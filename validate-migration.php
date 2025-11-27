#!/usr/bin/env php
<?php
/**
 * WSOL Migration Validation Script
 *
 * This script validates that the migration was successful by checking:
 * 1. All expected directories exist
 * 2. All audio files are in new locations
 * 3. All image files are in new locations
 * 4. All manifest segment files exist and are valid JSON
 * 5. Card counts match between old and new manifests
 *
 * Usage: php validate-migration.php [--verbose]
 */

define('BASE_DIR', __DIR__);
define('ASSETS_DIR', BASE_DIR . '/assets');
define('MANIFEST_PATH', ASSETS_DIR . '/manifest.json');

$verbose = in_array('--verbose', $argv) || in_array('-v', $argv);

echo "=================================================================\n";
echo "  WSOL Migration Validation\n";
echo "=================================================================\n\n";

$errors = [];
$warnings = [];
$checks = [
    'directories' => ['passed' => 0, 'failed' => 0],
    'manifest_files' => ['passed' => 0, 'failed' => 0],
    'audio_files' => ['passed' => 0, 'failed' => 0],
    'image_files' => ['passed' => 0, 'failed' => 0],
    'data_integrity' => ['passed' => 0, 'failed' => 0]
];

// Load original manifest for comparison
if (!file_exists(MANIFEST_PATH)) {
    die("ERROR: Original manifest.json not found\n");
}
$originalManifest = json_decode(file_get_contents(MANIFEST_PATH), true);

// =================================================================
// CHECK 1: Required Directories Exist
// =================================================================
echo "CHECK 1: Verifying directory structure...\n";

$requiredDirs = [
    'assets/data',
    'assets/data/shared',
    'assets/data/languages/ceb',
    'assets/data/languages/mrw',
    'assets/data/languages/sin',
    'assets/audio/ceb',
    'assets/audio/mrw',
    'assets/audio/sin',
    'assets/images/webp',
    'assets/images/png'
];

foreach ($requiredDirs as $dir) {
    $fullPath = BASE_DIR . '/' . $dir;
    if (is_dir($fullPath)) {
        $checks['directories']['passed']++;
        if ($verbose) echo "  OK: $dir\n";
    } else {
        $checks['directories']['failed']++;
        $errors[] = "Missing directory: $dir";
        echo "  FAIL: $dir\n";
    }
}

echo "  Result: {$checks['directories']['passed']} passed, {$checks['directories']['failed']} failed\n\n";

// =================================================================
// CHECK 2: Manifest Segment Files Exist and Are Valid
// =================================================================
echo "CHECK 2: Verifying manifest segment files...\n";

$requiredManifestFiles = [
    'assets/data/manifest-index.json',
    'assets/data/shared/images.json'
];

// Add language-specific files
foreach (['ceb', 'mrw', 'sin'] as $lang) {
    $requiredManifestFiles[] = "assets/data/languages/$lang/index.json";
}

foreach ($requiredManifestFiles as $file) {
    $fullPath = BASE_DIR . '/' . $file;
    if (!file_exists($fullPath)) {
        $checks['manifest_files']['failed']++;
        $errors[] = "Missing manifest file: $file";
        echo "  FAIL: $file (not found)\n";
        continue;
    }

    $content = file_get_contents($fullPath);
    $json = json_decode($content, true);
    if ($json === null) {
        $checks['manifest_files']['failed']++;
        $errors[] = "Invalid JSON in: $file";
        echo "  FAIL: $file (invalid JSON)\n";
        continue;
    }

    $checks['manifest_files']['passed']++;
    if ($verbose) echo "  OK: $file\n";
}

// Check for lesson chunk files based on language indexes
foreach (['ceb', 'mrw', 'sin'] as $lang) {
    $indexPath = BASE_DIR . "/assets/data/languages/$lang/index.json";
    if (!file_exists($indexPath)) continue;

    $langIndex = json_decode(file_get_contents($indexPath), true);
    if (empty($langIndex['lessonChunks'])) continue;

    foreach ($langIndex['lessonChunks'] as $chunk) {
        $chunkPath = BASE_DIR . "/assets/data/languages/$lang/{$chunk['file']}";
        if (!file_exists($chunkPath)) {
            $checks['manifest_files']['failed']++;
            $errors[] = "Missing chunk file: {$chunk['file']} for $lang";
            echo "  FAIL: data/languages/$lang/{$chunk['file']} (not found)\n";
            continue;
        }

        $chunkContent = json_decode(file_get_contents($chunkPath), true);
        if ($chunkContent === null) {
            $checks['manifest_files']['failed']++;
            $errors[] = "Invalid JSON in chunk: {$chunk['file']}";
            echo "  FAIL: data/languages/$lang/{$chunk['file']} (invalid JSON)\n";
            continue;
        }

        $checks['manifest_files']['passed']++;
        if ($verbose) echo "  OK: data/languages/$lang/{$chunk['file']}\n";
    }
}

echo "  Result: {$checks['manifest_files']['passed']} passed, {$checks['manifest_files']['failed']} failed\n\n";

// =================================================================
// CHECK 3: Audio Files Exist in New Locations
// =================================================================
echo "CHECK 3: Verifying audio files...\n";

$audioChecked = 0;
$audioFound = 0;
$audioMissing = [];

foreach ($originalManifest['cards'] as $trigraph => $cards) {
    foreach ($cards as $card) {
        if (empty($card['hasAudio']) || empty($card['audio'])) continue;

        $audioChecked++;

        $cardNum = $card['cardNum'];
        $word = normalizeWord($card['word']);
        $bucket = getBucket($cardNum);
        $paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);

        // Check new location
        $newPath = "assets/audio/$trigraph/$bucket/$paddedNum.$word.m4a";
        $fullPath = BASE_DIR . '/' . $newPath;

        if (file_exists($fullPath)) {
            $audioFound++;
            $checks['audio_files']['passed']++;
            if ($verbose) echo "  OK: $newPath\n";
        } else {
            // Check if old file still exists (not migrated)
            $oldExists = false;
            foreach ($card['audio'] as $oldPath) {
                if (file_exists(BASE_DIR . '/' . $oldPath)) {
                    $oldExists = true;
                    break;
                }
            }

            if ($oldExists) {
                $warnings[] = "Audio not migrated (old exists): Card $cardNum ($word)";
                if ($verbose) echo "  WARN: $newPath (not migrated, old exists)\n";
            } else {
                $checks['audio_files']['failed']++;
                $audioMissing[] = "Card $cardNum: $newPath";
                echo "  FAIL: $newPath (not found)\n";
            }
        }
    }
}

echo "  Checked: $audioChecked, Found in new location: $audioFound\n";
echo "  Result: {$checks['audio_files']['passed']} passed, {$checks['audio_files']['failed']} failed\n\n";

// =================================================================
// CHECK 4: Image Files Exist in New Locations
// =================================================================
echo "CHECK 4: Verifying image files...\n";

$imagesChecked = 0;
$imagesFound = 0;

foreach ($originalManifest['images'] as $cardNum => $formats) {
    if (empty($formats) || !is_array($formats)) continue;

    $cardInfo = findCardByNum($originalManifest, $cardNum);
    if (!$cardInfo) continue;

    $word = normalizeWord($cardInfo['word']);
    $english = normalizeWord($cardInfo['english']);
    $bucket = getBucket($cardNum);
    $paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);

    foreach ($formats as $format => $oldPath) {
        if (empty($oldPath) || !is_string($oldPath)) continue;

        $imagesChecked++;

        // Determine expected new path
        if ($format === 'gif' || $format === 'webm' || $format === 'mp4') {
            $newPath = "assets/images/webp/$bucket/$paddedNum.$word.$english.$format";
        } else {
            $newPath = "assets/images/$format/$bucket/$paddedNum.$word.$english.$format";
        }

        $fullPath = BASE_DIR . '/' . $newPath;

        if (file_exists($fullPath)) {
            $imagesFound++;
            $checks['image_files']['passed']++;
            if ($verbose) echo "  OK: $newPath\n";
        } else {
            // Check if old file still exists
            if (file_exists(BASE_DIR . '/' . $oldPath)) {
                $warnings[] = "Image not migrated (old exists): Card $cardNum $format";
                if ($verbose) echo "  WARN: $newPath (not migrated, old exists)\n";
            } else {
                $checks['image_files']['failed']++;
                echo "  FAIL: $newPath (not found)\n";
            }
        }
    }
}

echo "  Checked: $imagesChecked, Found in new location: $imagesFound\n";
echo "  Result: {$checks['image_files']['passed']} passed, {$checks['image_files']['failed']} failed\n\n";

// =================================================================
// CHECK 5: Data Integrity - Card Counts Match
// =================================================================
echo "CHECK 5: Verifying data integrity...\n";

foreach (['ceb', 'mrw', 'sin'] as $lang) {
    $originalCards = $originalManifest['cards'][$lang] ?? [];
    $originalCount = count($originalCards);

    // Count cards in new chunk files
    $newCount = 0;
    $indexPath = BASE_DIR . "/assets/data/languages/$lang/index.json";

    if (file_exists($indexPath)) {
        $langIndex = json_decode(file_get_contents($indexPath), true);

        foreach ($langIndex['lessonChunks'] ?? [] as $chunk) {
            $chunkPath = BASE_DIR . "/assets/data/languages/$lang/{$chunk['file']}";
            if (file_exists($chunkPath)) {
                $chunkData = json_decode(file_get_contents($chunkPath), true);
                $newCount += count($chunkData['cards'] ?? []);
            }
        }
    }

    if ($originalCount === $newCount) {
        $checks['data_integrity']['passed']++;
        echo "  OK: $lang - $originalCount cards (matches)\n";
    } else {
        $checks['data_integrity']['failed']++;
        $errors[] = "Card count mismatch for $lang: original=$originalCount, new=$newCount";
        echo "  FAIL: $lang - original=$originalCount, new=$newCount (MISMATCH)\n";
    }
}

echo "  Result: {$checks['data_integrity']['passed']} passed, {$checks['data_integrity']['failed']} failed\n\n";

// =================================================================
// Summary
// =================================================================
echo "=================================================================\n";
echo "  VALIDATION SUMMARY\n";
echo "=================================================================\n";

$totalPassed = 0;
$totalFailed = 0;

foreach ($checks as $category => $results) {
    $totalPassed += $results['passed'];
    $totalFailed += $results['failed'];
    $status = $results['failed'] === 0 ? 'PASS' : 'FAIL';
    echo sprintf("  %-20s %s (%d passed, %d failed)\n",
        ucfirst(str_replace('_', ' ', $category)) . ':',
        $status,
        $results['passed'],
        $results['failed']
    );
}

echo "-----------------------------------------------------------------\n";
echo "  Total: $totalPassed passed, $totalFailed failed\n";

if (!empty($warnings)) {
    echo "\n  Warnings (" . count($warnings) . "):\n";
    foreach (array_slice($warnings, 0, 10) as $warning) {
        echo "    - $warning\n";
    }
    if (count($warnings) > 10) {
        echo "    ... and " . (count($warnings) - 10) . " more\n";
    }
}

if (!empty($errors)) {
    echo "\n  Errors (" . count($errors) . "):\n";
    foreach (array_slice($errors, 0, 10) as $error) {
        echo "    - $error\n";
    }
    if (count($errors) > 10) {
        echo "    ... and " . (count($errors) - 10) . " more\n";
    }
}

echo "=================================================================\n";
echo "  STATUS: " . ($totalFailed === 0 ? "VALIDATION PASSED" : "VALIDATION FAILED") . "\n";
echo "=================================================================\n";

exit($totalFailed === 0 ? 0 : 1);

// =================================================================
// Helper Functions
// =================================================================

function normalizeWord($word) {
    if (empty($word)) return '';
    $word = strtolower($word);
    $word = str_replace("'", '', $word);
    $word = preg_replace('/\s+/', '-', $word);
    $word = preg_replace('/[^a-z0-9-]/', '', $word);
    $word = preg_replace('/-+/', '-', $word);
    $word = trim($word, '-');
    return $word;
}

function getBucket($cardNum) {
    $start = floor(($cardNum - 1) / 100) * 100 + 1;
    $end = $start + 99;
    return sprintf('%04d-%04d', $start, $end);
}

function findCardByNum($manifest, $cardNum) {
    if (!empty($manifest['cards']['ceb'])) {
        foreach ($manifest['cards']['ceb'] as $card) {
            if (isset($card['cardNum']) && $card['cardNum'] == $cardNum) {
                return $card;
            }
        }
    }
    foreach ($manifest['cards'] as $langCards) {
        foreach ($langCards as $card) {
            if (isset($card['cardNum']) && $card['cardNum'] == $cardNum) {
                return $card;
            }
        }
    }
    return null;
}
