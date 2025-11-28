<?php
/**
 * ElevenLabs TTS Generation Backend
 *
 * Handles API calls to ElevenLabs, converts audio to OPUS format,
 * and saves files to the correct location.
 *
 * Requires Admin authentication.
 */

// Auth check must come before any output
require_once __DIR__ . '/auth-check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Require Admin authentication
requireTTSAuth();

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

// Required parameters
$required = ['apiKey', 'voiceId', 'text', 'filename', 'savePath'];
foreach ($required as $param) {
    if (empty($input[$param])) {
        echo json_encode(['success' => false, 'error' => "Missing required parameter: $param"]);
        exit;
    }
}

$apiKey = $input['apiKey'];
$voiceId = $input['voiceId'];
$text = $input['text'];
$filename = $input['filename'];
$savePath = $input['savePath'];
$model = $input['model'] ?? 'eleven_multilingual_v2';
$stability = $input['stability'] ?? 0.5;
$similarity = $input['similarity'] ?? 0.75;
$type = $input['type'] ?? 'custom';
$cardNum = $input['cardNum'] ?? null;
$lang = $input['lang'] ?? null;
$outputFormat = $input['outputFormat'] ?? 'opus'; // opus or mp3

// Full paths
$projectRoot = dirname(__DIR__);
$fullSavePath = $projectRoot . '/' . $savePath;
$tempDir = sys_get_temp_dir();

// Ensure directory exists
$saveDir = dirname($fullSavePath);
if (!is_dir($saveDir)) {
    if (!mkdir($saveDir, 0755, true)) {
        echo json_encode(['success' => false, 'error' => 'Failed to create directory: ' . $saveDir]);
        exit;
    }
}

try {
    // Call ElevenLabs API
    $audioData = callElevenLabsAPI($apiKey, $voiceId, $text, $model, $stability, $similarity);

    if ($audioData === false) {
        throw new Exception('Failed to get audio from ElevenLabs API');
    }

    // Save temporary MP3
    $tempMp3 = $tempDir . '/' . uniqid('tts_') . '.mp3';
    if (file_put_contents($tempMp3, $audioData) === false) {
        throw new Exception('Failed to write temporary audio file');
    }

    $actualFormat = $outputFormat;
    $actualSavePath = $fullSavePath;

    // Convert to requested format or fallback to MP3
    if ($outputFormat === 'opus') {
        $result = convertToOpus($tempMp3, $fullSavePath);
        if (!$result['success']) {
            // Fallback to MP3 if conversion fails
            $actualFormat = 'mp3';
            $actualSavePath = str_replace('.opus', '.mp3', $fullSavePath);
            $savePath = str_replace('.opus', '.mp3', $savePath);
            $filename = str_replace('.opus', '.mp3', $filename);
            if (!copy($tempMp3, $actualSavePath)) {
                @unlink($tempMp3);
                throw new Exception('Failed to save audio file');
            }
        }
    } else {
        // Just save as MP3
        $actualSavePath = str_replace('.opus', '.mp3', $fullSavePath);
        $savePath = str_replace('.opus', '.mp3', $savePath);
        $filename = str_replace('.opus', '.mp3', $filename);
        if (!copy($tempMp3, $actualSavePath)) {
            @unlink($tempMp3);
            throw new Exception('Failed to save audio file');
        }
    }

    // Clean up temp file
    @unlink($tempMp3);

    // Update manifest if it's a word card
    if ($type === 'word' && $cardNum && $lang) {
        updateManifestAudio($projectRoot, $lang, $cardNum, $savePath);
    }

    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'savePath' => $savePath,
        'format' => $actualFormat,
        'size' => filesize($actualSavePath)
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Call ElevenLabs Text-to-Speech API
 */
function callElevenLabsAPI($apiKey, $voiceId, $text, $model, $stability, $similarity) {
    $url = "https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}";

    $data = [
        'text' => $text,
        'model_id' => $model,
        'voice_settings' => [
            'stability' => (float)$stability,
            'similarity_boost' => (float)$similarity
        ]
    ];

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: audio/mpeg',
            'Content-Type: application/json',
            'xi-api-key: ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 60
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception('cURL error: ' . $error);
    }

    if ($httpCode !== 200) {
        // Try to parse error message
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['detail']['message'] ?? $errorData['detail'] ?? 'Unknown API error';
        throw new Exception("ElevenLabs API error ($httpCode): $errorMsg");
    }

    return $response;
}

/**
 * Convert audio file to OPUS format using ffmpeg
 * Returns array with 'success' and 'message' keys
 */
function convertToOpus($inputPath, $outputPath) {
    // Check if ffmpeg is available
    $ffmpegCheck = shell_exec('which ffmpeg 2>/dev/null');
    $ffmpeg = null;

    if (empty($ffmpegCheck)) {
        // Try to find ffmpeg in common locations
        $ffmpegPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
        foreach ($ffmpegPaths as $path) {
            if (file_exists($path) && is_executable($path)) {
                $ffmpeg = $path;
                break;
            }
        }

        if (!$ffmpeg) {
            // Check for opusenc as alternative
            $opusencCheck = shell_exec('which opusenc 2>/dev/null');
            if (!empty($opusencCheck)) {
                $result = convertWithOpusenc($inputPath, $outputPath);
                return ['success' => $result, 'message' => $result ? 'Converted with opusenc' : 'opusenc conversion failed'];
            }

            return ['success' => false, 'message' => 'ffmpeg not available'];
        }
    } else {
        $ffmpeg = trim($ffmpegCheck);
    }

    // Convert using ffmpeg
    // -i input -c:a libopus -b:a 64k output.opus
    $cmd = escapeshellcmd($ffmpeg) . ' -y -i ' . escapeshellarg($inputPath) .
           ' -c:a libopus -b:a 64k -vbr on -compression_level 10 ' .
           escapeshellarg($outputPath) . ' 2>&1';

    $output = shell_exec($cmd);

    $success = file_exists($outputPath) && filesize($outputPath) > 0;
    return ['success' => $success, 'message' => $success ? 'Converted with ffmpeg' : 'ffmpeg conversion failed: ' . $output];
}

/**
 * Convert using opusenc (opus-tools)
 */
function convertWithOpusenc($inputPath, $outputPath) {
    // First convert MP3 to WAV (opusenc only accepts WAV/FLAC/OGG)
    $tempWav = sys_get_temp_dir() . '/' . uniqid('wav_') . '.wav';

    // Use ffmpeg for MP3->WAV conversion
    $ffmpeg = shell_exec('which ffmpeg 2>/dev/null');
    if (empty($ffmpeg)) {
        return false;
    }

    $cmd = trim($ffmpeg) . ' -y -i ' . escapeshellarg($inputPath) . ' ' . escapeshellarg($tempWav) . ' 2>&1';
    shell_exec($cmd);

    if (!file_exists($tempWav)) {
        return false;
    }

    // Now convert WAV to OPUS
    $opusenc = trim(shell_exec('which opusenc 2>/dev/null'));
    $cmd = $opusenc . ' --bitrate 64 ' . escapeshellarg($tempWav) . ' ' . escapeshellarg($outputPath) . ' 2>&1';
    shell_exec($cmd);

    @unlink($tempWav);

    return file_exists($outputPath) && filesize($outputPath) > 0;
}

/**
 * Update the manifest.json to add audio reference
 */
function updateManifestAudio($projectRoot, $lang, $cardNum, $audioPath) {
    $manifestPath = $projectRoot . '/assets/manifest.json';

    if (!file_exists($manifestPath)) {
        return false;
    }

    $manifest = json_decode(file_get_contents($manifestPath), true);

    if (!$manifest || !isset($manifest['cards'][$lang])) {
        return false;
    }

    // Find the card and update audio
    foreach ($manifest['cards'][$lang] as &$card) {
        if ($card['cardNum'] == $cardNum) {
            // Add audio path if not already present
            if (!isset($card['audio'])) {
                $card['audio'] = [];
            }

            if (!in_array($audioPath, $card['audio'])) {
                $card['audio'][] = $audioPath;
            }

            $card['hasAudio'] = true;
            break;
        }
    }

    // Update stats
    if (isset($manifest['stats']['languageStats'][$lang])) {
        $cardsWithAudio = 0;
        foreach ($manifest['cards'][$lang] as $card) {
            if (!empty($card['hasAudio'])) {
                $cardsWithAudio++;
            }
        }
        $manifest['stats']['languageStats'][$lang]['cardsWithAudio'] = $cardsWithAudio;
    }

    // Update total stats
    $totalWithAudio = 0;
    foreach (['ceb', 'mrw', 'sin'] as $l) {
        $totalWithAudio += $manifest['stats']['languageStats'][$l]['cardsWithAudio'] ?? 0;
    }
    $manifest['stats']['cardsWithAudio'] = $totalWithAudio;

    // Update timestamp
    $manifest['lastUpdated'] = date('c');

    // Save manifest
    $json = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($manifestPath, $json) !== false;
}
