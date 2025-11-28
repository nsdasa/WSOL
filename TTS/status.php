<?php
/**
 * System Status Check for TTS Generator
 *
 * Checks for required dependencies and system capabilities.
 * Requires Admin authentication.
 */

// Auth check must come before any output
require_once __DIR__ . '/auth-check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Require Admin authentication
requireTTSAuth();

$status = [
    'php_version' => PHP_VERSION,
    'curl_enabled' => extension_loaded('curl'),
    'json_enabled' => extension_loaded('json'),
    'ffmpeg' => [
        'available' => false,
        'path' => null,
        'version' => null
    ],
    'opusenc' => [
        'available' => false,
        'path' => null
    ],
    'directories' => [
        'assets_writable' => is_writable(dirname(__DIR__) . '/assets'),
        'sentences_ceb_writable' => is_writable(dirname(__DIR__) . '/assets/sentences/audio/ceb'),
        'sentences_mrw_writable' => is_writable(dirname(__DIR__) . '/assets/sentences/audio/mrw'),
        'sentences_sin_writable' => is_writable(dirname(__DIR__) . '/assets/sentences/audio/sin')
    ],
    'temp_dir' => [
        'path' => sys_get_temp_dir(),
        'writable' => is_writable(sys_get_temp_dir())
    ]
];

// Check ffmpeg
$ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?? '');
if (empty($ffmpegPath)) {
    // Try common locations
    $paths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
    foreach ($paths as $path) {
        if (file_exists($path) && is_executable($path)) {
            $ffmpegPath = $path;
            break;
        }
    }
}

if (!empty($ffmpegPath)) {
    $status['ffmpeg']['available'] = true;
    $status['ffmpeg']['path'] = $ffmpegPath;

    // Get version
    $version = shell_exec($ffmpegPath . ' -version 2>&1 | head -1');
    if ($version) {
        preg_match('/ffmpeg version ([^\s]+)/', $version, $matches);
        $status['ffmpeg']['version'] = $matches[1] ?? 'unknown';
    }

    // Check for libopus codec
    $codecs = shell_exec($ffmpegPath . ' -codecs 2>/dev/null | grep opus');
    $status['ffmpeg']['libopus'] = strpos($codecs, 'libopus') !== false;
}

// Check opusenc
$opusencPath = trim(shell_exec('which opusenc 2>/dev/null') ?? '');
if (!empty($opusencPath)) {
    $status['opusenc']['available'] = true;
    $status['opusenc']['path'] = $opusencPath;
}

// Overall readiness
$status['ready'] = $status['curl_enabled']
    && $status['json_enabled']
    && ($status['ffmpeg']['available'] || $status['opusenc']['available'])
    && $status['directories']['assets_writable']
    && $status['temp_dir']['writable'];

// Recommendations
$status['recommendations'] = [];
if (!$status['ffmpeg']['available']) {
    $status['recommendations'][] = 'Install ffmpeg for audio conversion: apt-get install ffmpeg';
}
if (!$status['curl_enabled']) {
    $status['recommendations'][] = 'Enable PHP curl extension';
}
if (!$status['directories']['assets_writable']) {
    $status['recommendations'][] = 'Make assets directory writable: chmod 755 assets';
}

echo json_encode($status, JSON_PRETTY_PRINT);
