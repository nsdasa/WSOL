<?php
/**
 * Asset Migration Script
 * Migrates existing assets from flat structure to organized subdirectories
 *
 * OLD STRUCTURE:
 * /assets/
 * ├── *.csv, *.json
 * ├── *.png, *.gif, *.mp4, *.webm (images/videos)
 * ├── *.m4a, *.mp3 (audio files)
 * └── grammar/, vendor/
 *
 * NEW STRUCTURE:
 * /assets/
 * ├── *.csv, *.json (stay at root)
 * ├── pics/ (all images/videos)
 * ├── audio/
 * │   ├── ceb/
 * │   ├── mrw/
 * │   ├── sin/
 * │   └── old/ (backups)
 * └── grammar/, vendor/ (unchanged)
 */

require_once 'config.php';

// Only allow admin access
session_start();
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    die('Access denied. Admin only.');
}

$assetsDir = __DIR__ . '/assets';
$dryRun = isset($_GET['dry_run']) && $_GET['dry_run'] === 'true';

echo "<!DOCTYPE html>
<html>
<head>
    <title>Asset Migration</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #0f0; }
        h1 { color: #0f0; }
        .success { color: #0f0; }
        .error { color: #f00; }
        .info { color: #ff0; }
        .moved { color: #0ff; }
        pre { background: #000; padding: 10px; border: 1px solid #0f0; }
    </style>
</head>
<body>
<h1>Asset Directory Migration</h1>
";

if ($dryRun) {
    echo "<p class='info'>🔍 DRY RUN MODE - No files will be moved</p>";
} else {
    echo "<p class='error'>⚠️  LIVE MODE - Files will be moved!</p>";
}

echo "<pre>";

$stats = [
    'images_moved' => 0,
    'audio_moved' => 0,
    'skipped' => 0,
    'errors' => 0
];

try {
    // Create new directories if they don't exist
    $dirs = [
        $assetsDir . '/pics',
        $assetsDir . '/audio',
        $assetsDir . '/audio/ceb',
        $assetsDir . '/audio/mrw',
        $assetsDir . '/audio/sin',
        $assetsDir . '/audio/old'
    ];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            echo "Creating directory: $dir\n";
            if (!$dryRun) {
                if (!mkdir($dir, 0755, true)) {
                    throw new Exception("Failed to create directory: $dir");
                }
            }
        } else {
            echo "Directory exists: $dir\n";
        }
    }

    echo "\n--- Scanning assets directory ---\n";

    // Scan root assets directory
    $files = scandir($assetsDir);

    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $fullPath = $assetsDir . '/' . $file;

        // Skip directories
        if (is_dir($fullPath)) {
            echo "Skipping directory: $file\n";
            continue;
        }

        // Skip CSV and JSON files (stay at root)
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, ['csv', 'json'])) {
            echo "Keeping at root: $file\n";
            $stats['skipped']++;
            continue;
        }

        // Move images/videos to /assets/pics/
        if (in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'])) {
            $newPath = $assetsDir . '/pics/' . $file;

            if (file_exists($newPath)) {
                echo "<span class='info'>File exists at destination, skipping: $file</span>\n";
                $stats['skipped']++;
            } else {
                echo "Moving image/video: $file → pics/$file\n";
                if (!$dryRun) {
                    if (rename($fullPath, $newPath)) {
                        echo "<span class='success'>  ✓ Moved successfully</span>\n";
                        $stats['images_moved']++;
                    } else {
                        echo "<span class='error'>  ✗ Failed to move</span>\n";
                        $stats['errors']++;
                    }
                } else {
                    $stats['images_moved']++;
                }
            }
            continue;
        }

        // Move audio files to /assets/audio/{lang}/
        if (in_array($ext, ['mp3', 'm4a', 'wav', 'ogg', 'opus'])) {
            // Extract language from filename (format: cardNum.lang.word.ext)
            $parts = explode('.', $file);
            $lang = 'ceb'; // Default

            if (count($parts) >= 2 && in_array($parts[1], ['ceb', 'mrw', 'sin'])) {
                $lang = $parts[1];
            }

            $newPath = $assetsDir . '/audio/' . $lang . '/' . $file;

            if (file_exists($newPath)) {
                echo "<span class='info'>File exists at destination, skipping: $file</span>\n";
                $stats['skipped']++;
            } else {
                echo "Moving audio: $file → audio/$lang/$file\n";
                if (!$dryRun) {
                    if (rename($fullPath, $newPath)) {
                        echo "<span class='success'>  ✓ Moved successfully</span>\n";
                        $stats['audio_moved']++;
                    } else {
                        echo "<span class='error'>  ✗ Failed to move</span>\n";
                        $stats['errors']++;
                    }
                } else {
                    $stats['audio_moved']++;
                }
            }
            continue;
        }

        // Unknown file type
        echo "<span class='info'>Unknown file type, skipping: $file</span>\n";
        $stats['skipped']++;
    }

    echo "\n--- Migration Summary ---\n";
    echo "Images/Videos moved: {$stats['images_moved']}\n";
    echo "Audio files moved: {$stats['audio_moved']}\n";
    echo "Files skipped: {$stats['skipped']}\n";
    echo "Errors: {$stats['errors']}\n";

    if ($dryRun) {
        echo "\n<span class='info'>This was a DRY RUN. No files were actually moved.</span>\n";
        echo "<a href='migrate-assets.php'>Run migration for real</a>\n";
    } else {
        echo "\n<span class='success'>✓ Migration complete!</span>\n";
        echo "\nNext steps:\n";
        echo "1. Run scan-assets.php to update manifest with new paths\n";
        echo "2. Test uploads in /rec module and deck-builder\n";
        echo "3. Verify all modules load assets correctly\n";
    }

} catch (Exception $e) {
    echo "\n<span class='error'>ERROR: " . $e->getMessage() . "</span>\n";
}

echo "</pre>
</body>
</html>";
?>
