<?php
// Force UTF-8 encoding
header('Content-Type: text/html; charset=UTF-8');
mb_internal_encoding('UTF-8');

// ============================================
// CONFIGURATION
// ============================================
$PASSWORD = 'WSOL10:15';
$SESSION_NAME = 'wsol_converter_auth';
$UPLOAD_DIR = sys_get_temp_dir() . '/converter_uploads/';
$MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Create upload directory if it doesn't exist
if (!file_exists($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// ============================================
// HTTPS Enforcement
// ============================================
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
           || $_SERVER['SERVER_PORT'] == 443
           || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if (!$isHttps) {
    http_response_code(403);
    die('<!DOCTYPE html><html><head><title>HTTPS Required</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>?? HTTPS Required</h1><p>This page requires a secure connection.</p></body></html>');
}

// ============================================
// Authentication
// ============================================
session_start();

if (isset($_GET['logout'])) {
    unset($_SESSION[$SESSION_NAME]);
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === $PASSWORD) {
        $_SESSION[$SESSION_NAME] = true;
        header('Location: ' . $_SERVER['REQUEST_URI']);
        exit;
    } else {
        $error = 'Incorrect password';
    }
}

$authenticated = isset($_SESSION[$SESSION_NAME]) && $_SESSION[$SESSION_NAME] === true;

// ============================================
// File Download Handler
// ============================================
if ($authenticated && isset($_GET['download']) && isset($_GET['file'])) {
    $file = basename($_GET['file']); // Security: prevent directory traversal
    $filepath = $UPLOAD_DIR . $file;
    
    if (file_exists($filepath)) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $filepath);
        finfo_close($finfo);
        
        header('Content-Type: ' . $mime);
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        
        // Clean up after download
        unlink($filepath);
        exit;
    }
}

// ============================================
// File Processing Handler
// ============================================
$result = null;
if ($authenticated && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $file = $_FILES['file'];
    
    if ($file['error'] === UPLOAD_ERR_OK && $file['size'] <= $MAX_FILE_SIZE) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $basename = pathinfo($file['name'], PATHINFO_FILENAME);
        $inputPath = $UPLOAD_DIR . uniqid() . '_input.' . $ext;
        
        if (move_uploaded_file($file['tmp_name'], $inputPath)) {
            // Get conversion options from POST
            $maxSize = intval($_POST['maxSize'] ?? 400);
            $outputFormat = $_POST['outputFormat'] ?? 'mp4';
            $crf = intval($_POST['crf'] ?? 28);
            $fps = intval($_POST['fps'] ?? 0);
            
            $outputPath = $UPLOAD_DIR . uniqid() . '_output.' . $outputFormat;
            
            try {
<<<<<<< Updated upstream
                if ($ext === 'png') {
                    // PNG to WebP using GD
                    $result = convertPngToWebp($inputPath, $outputPath, $_POST);
=======
                // Check if it's an audio file
                $audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
                
                if ($ext === 'png') {
                    // PNG to WebP using GD
                    $result = convertPngToWebp($inputPath, $outputPath, $_POST);
                } elseif (in_array($ext, $audioExts)) {
                    // Audio conversion
                    $result = convertAudio($inputPath, $outputPath, $_POST);
>>>>>>> Stashed changes
                } elseif ($ext === 'gif' || $ext === 'mp4' || $ext === 'webm') {
                    // Use FFmpeg for video conversion
                    $result = convertWithFFmpeg($inputPath, $outputPath, $ext, $maxSize, $outputFormat, $crf, $fps);
                }
                
                if ($result && $result['success']) {
                    $result['downloadUrl'] = '?download=1&file=' . urlencode(basename($result['outputPath']));
                    $result['originalName'] = $file['name'];
                    $result['newName'] = $basename . '.' . $outputFormat;
                }
            } catch (Exception $e) {
                $result = ['success' => false, 'error' => $e->getMessage()];
            }
            
            // Clean up input file
            if (file_exists($inputPath)) {
                unlink($inputPath);
            }
        }
    } else {
        $result = ['success' => false, 'error' => 'Upload failed or file too large (max 50MB)'];
    }
    
    // Return JSON for AJAX requests
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}

// ============================================
// Conversion Functions
// ============================================
function convertPngToWebp($inputPath, $outputPath, $options) {
    $resolution = floatval($options['resolution'] ?? 100) / 100;
    $quality = intval($options['quality'] ?? 85);
    
    $image = imagecreatefrompng($inputPath);
    if (!$image) {
        throw new Exception('Failed to load PNG');
    }
    
    $width = imagesx($image);
    $height = imagesy($image);
    $newWidth = round($width * $resolution);
    $newHeight = round($height * $resolution);
    
    $resized = imagecreatetruecolor($newWidth, $newHeight);
    imagealphablending($resized, false);
    imagesavealpha($resized, true);
    
    imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    $outputPath = str_replace('.mp4', '.webp', $outputPath);
    imagewebp($resized, $outputPath, $quality);
    
    imagedestroy($image);
    imagedestroy($resized);
    
    return [
        'success' => true,
        'outputPath' => $outputPath,
        'originalSize' => filesize($inputPath),
        'newSize' => filesize($outputPath)
    ];
}

<<<<<<< Updated upstream
=======
function convertAudio($inputPath, $outputPath, $options) {
    $ffmpegPath = trim(shell_exec('which ffmpeg'));
    if (empty($ffmpegPath)) {
        $ffmpegPath = 'ffmpeg';
    }
    
    $outputFormat = $options['outputFormat'] ?? 'opus';
    $bitrate = intval($options['bitrate'] ?? 48);
    $channels = intval($options['channels'] ?? 1);
    $sampleRate = intval($options['sampleRate'] ?? 48000);
    
    // Opus only supports: 8000, 12000, 16000, 24000, 48000
    if ($outputFormat === 'opus') {
        $validOpusRates = [8000, 12000, 16000, 24000, 48000];
        if (!in_array($sampleRate, $validOpusRates)) {
            $sampleRate = 48000; // Default to 48kHz for Opus
        }
    }
    
    // Update output path with correct extension
    $outputPath = preg_replace('/\.[^.]+$/', '.' . $outputFormat, $outputPath);
    
    // Build FFmpeg command
    $args = [
        escapeshellarg($ffmpegPath),
        '-i', escapeshellarg($inputPath)
    ];
    
    // Audio codec based on format
    if ($outputFormat === 'opus') {
        $args[] = '-c:a';
        $args[] = 'libopus';
        $args[] = '-b:a';
        $args[] = $bitrate . 'k';
        $args[] = '-vbr';
        $args[] = 'on';
    } elseif ($outputFormat === 'm4a') {
        $args[] = '-c:a';
        $args[] = 'aac';
        $args[] = '-b:a';
        $args[] = $bitrate . 'k';
    } elseif ($outputFormat === 'mp3') {
        $args[] = '-c:a';
        $args[] = 'libmp3lame';
        $args[] = '-b:a';
        $args[] = $bitrate . 'k';
    }
    
    // Set channels (mono/stereo)
    $args[] = '-ac';
    $args[] = $channels;
    
    // Set sample rate
    $args[] = '-ar';
    $args[] = $sampleRate;
    
    // Remove video streams
    $args[] = '-vn';
    
    // Output file
    $args[] = '-y'; // Overwrite
    $args[] = escapeshellarg($outputPath);
    
    $command = implode(' ', $args) . ' 2>&1';
    
    // Log the command for debugging
    error_log("FFmpeg audio command: " . $command);
    
    exec($command, $output, $returnCode);
    
    if ($returnCode !== 0 || !file_exists($outputPath)) {
        $errorMsg = 'FFmpeg exit code: ' . $returnCode . "\n" . 
                    'Command: ' . $command . "\n" . 
                    'Output: ' . implode("\n", $output);
        error_log("Audio conversion error: " . $errorMsg);
        throw new Exception($errorMsg);
    }
    
    return [
        'success' => true,
        'outputPath' => $outputPath,
        'originalSize' => filesize($inputPath),
        'newSize' => filesize($outputPath)
    ];
}

>>>>>>> Stashed changes
function convertWithFFmpeg($inputPath, $outputPath, $inputExt, $maxSize, $outputFormat, $crf, $fps) {
    $ffmpegPath = trim(shell_exec('which ffmpeg'));
    if (empty($ffmpegPath)) {
        $ffmpegPath = 'ffmpeg'; // Try system PATH
    }
    
    // Build FFmpeg command
    $args = [
        escapeshellarg($ffmpegPath),
        '-i', escapeshellarg($inputPath),
        '-vf', escapeshellarg("scale='min($maxSize,iw)':'min($maxSize,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2")
    ];
    
    if ($fps > 0) {
        $args[] = '-r';
        $args[] = $fps;
    }
    
    if ($outputFormat === 'mp4') {
        $args[] = '-c:v';
        $args[] = 'libx264';
        $args[] = '-pix_fmt';
        $args[] = 'yuv420p';
        $args[] = '-movflags';
        $args[] = '+faststart';
        $args[] = '-crf';
        $args[] = $crf;
        $args[] = '-preset';
        $args[] = 'medium';
    } else {
        $args[] = '-c:v';
        $args[] = 'libvpx-vp9';
        $args[] = '-pix_fmt';
        $args[] = 'yuv420p';
        $args[] = '-crf';
        $args[] = $crf;
        $args[] = '-b:v';
        $args[] = '0';
    }
    
    $args[] = '-an'; // No audio
    $args[] = '-y'; // Overwrite
    $args[] = escapeshellarg($outputPath);
    
    $command = implode(' ', $args) . ' 2>&1';
    
    exec($command, $output, $returnCode);
    
    if ($returnCode !== 0 || !file_exists($outputPath)) {
        throw new Exception('FFmpeg conversion failed: ' . implode("\n", $output));
    }
    
    return [
        'success' => true,
        'outputPath' => $outputPath,
        'originalSize' => filesize($inputPath),
        'newSize' => filesize($outputPath)
    ];
}

// ============================================
// Login Form
// ============================================
if (!$authenticated) {
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Media Converter</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f3f4f6;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 360px;
            text-align: center;
        }
        .login-box h1 {
            margin: 0 0 10px;
            font-size: 1.5em;
            color: #111827;
        }
        .login-box .subtitle {
            color: #6b7280;
            margin: 0 0 25px;
            font-size: 0.9em;
        }
        .login-box input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 16px;
            margin-bottom: 15px;
        }
        .login-box input[type="password"]:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .login-box button {
            width: 100%;
            padding: 12px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
        }
        .login-box button:hover {
            background: #1d4ed8;
        }
        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>Media Converter</h1>
        <p class="subtitle">Ward School of Filipino Languages</p>
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        <form method="POST">
            <input type="password" name="password" placeholder="Enter password" required autofocus>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>
<?php
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Converter | Ward School</title>
    <style>
        * { box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f3f4f6;
            color: #111827;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
        }

        .header h1 {
            margin: 0 0 5px;
            font-size: 1.75em;
        }

        .header .subtitle {
            color: #6b7280;
            margin: 0 0 5px;
        }

        .header .school {
            color: #2563eb;
            font-size: 0.85em;
        }

        .logout-btn {
            position: absolute;
            top: 0;
            right: 0;
            background: #e5e7eb;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            text-decoration: none;
            color: #374151;
        }

        .logout-btn:hover {
            background: #d1d5db;
        }

        .panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .panel h2 {
            margin-top: 0;
            font-size: 1.1em;
            color: #374151;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
        }

        .tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }

        .tab {
            padding: 10px 20px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
        }

        .tab:hover {
            color: #374151;
        }

        .tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .option {
            margin-bottom: 10px;
        }

        .option label {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
            color: #374151;
            font-size: 0.9em;
        }

        .option select, .option input[type="range"], .option input[type="number"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
        }

        .range-value {
            color: #2563eb;
            font-weight: 600;
        }

        .help-text {
            font-size: 11px;
            color: #6b7280;
            margin-top: 3px;
        }

        .upload-area {
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: #f9fafb;
        }

        .upload-area:hover, .upload-area.dragover {
            background: white;
            border-color: #2563eb;
        }

        .upload-icon {
            font-size: 40px;
            margin-bottom: 10px;
        }

        .upload-text {
            color: #6b7280;
            font-size: 14px;
        }

        .upload-text strong {
            color: #2563eb;
        }

        .file-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .file-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #f3f4f6;
            gap: 10px;
            font-size: 14px;
        }

        .file-icon {
            font-size: 20px;
        }

        .file-info {
            flex: 1;
            min-width: 0;
        }

        .file-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .file-size {
            font-size: 11px;
            color: #6b7280;
        }

        .file-status {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 4px;
        }

        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-done { background: #d1fae5; color: #065f46; }
        .status-error { background: #fee2e2; color: #991b1b; }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #2563eb;
            color: white;
        }

        .btn-primary:hover {
            background: #1d4ed8;
        }

        .btn-primary:disabled {
            background: #d1d5db;
            cursor: not-allowed;
        }

        .btn-success {
            background: #16a34a;
            color: white;
        }

        .btn-success:hover {
            background: #15803d;
        }

        .btn-danger {
            background: #dc2626;
            color: white;
        }

        .btn-danger:hover {
            background: #b91c1c;
        }

        .btn-sm {
            padding: 5px 10px;
            font-size: 12px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .progress-bar {
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 15px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #2563eb, #16a34a);
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 600;
        }

        .results-panel {
            display: none;
        }

        .results-panel.show {
            display: block;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }

        .stat-box {
            text-align: center;
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
        }

        .stat-label {
            font-size: 11px;
            color: #6b7280;
        }

<<<<<<< Updated upstream
=======
        .error-details {
            font-size: 10px;
            color: #991b1b;
            margin-top: 4px;
            max-height: 100px;
            overflow: auto;
            white-space: pre-wrap;
            font-family: monospace;
        }

>>>>>>> Stashed changes
        .info-box {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #1e40af;
        }

        @media (max-width: 640px) {
            .options {
                grid-template-columns: 1fr;
            }
            .stats {
                grid-template-columns: 1fr;
            }
            .logout-btn {
                position: static;
                display: block;
                margin: 10px auto 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="?logout" class="logout-btn">Logout</a>
        <h1>Media Converter</h1>
<<<<<<< Updated upstream
        <p class="subtitle">PNG to WebP | GIF/MP4 to WebM/MP4</p>
=======
        <p class="subtitle">PNG to WebP | GIF/MP4 to WebM/MP4 | Audio to Opus/M4A</p>
>>>>>>> Stashed changes
        <p class="school">Bob and Mariel Ward School of Filipino Languages</p>
    </div>

    <div class="info-box">
        <strong>Server-side processing:</strong> Files are converted on the server using FFmpeg for maximum quality and speed. Upload, convert, download!
    </div>

    <div class="panel">
        <h2>Conversion Options</h2>
        
        <div class="tabs">
            <button class="tab active" data-tab="png">PNG to WebP</button>
            <button class="tab" data-tab="gif">GIF to Video</button>
            <button class="tab" data-tab="mp4">MP4 Compress</button>
<<<<<<< Updated upstream
=======
            <button class="tab" data-tab="audio">Audio Compress</button>
>>>>>>> Stashed changes
        </div>

        <div class="tab-content active" id="tab-png">
            <div class="options">
                <div class="option">
                    <label>Resolution</label>
                    <select id="pngResolution">
                        <option value="100">Original Size</option>
                        <option value="75">75%</option>
                        <option value="50">50%</option>
                        <option value="25">25%</option>
                    </select>
                </div>
                <div class="option">
                    <label>Quality: <span class="range-value" id="pngQualityValue">85%</span></label>
                    <input type="range" id="pngQuality" min="1" max="100" value="85">
                    <p class="help-text">Lower = smaller file</p>
                </div>
            </div>
        </div>

        <div class="tab-content" id="tab-gif">
            <div class="options">
                <div class="option">
                    <label>Max Dimension (px)</label>
                    <input type="number" id="gifMaxSize" value="400" min="50" max="1920">
                </div>
                <div class="option">
                    <label>Output Format</label>
                    <select id="gifOutputFormat">
                        <option value="mp4">MP4 (universal)</option>
                        <option value="webm">WebM (smaller)</option>
                    </select>
                </div>
                <div class="option">
                    <label>Quality (CRF): <span class="range-value" id="gifCrfValue">28</span></label>
                    <input type="range" id="gifCrf" min="18" max="40" value="28">
                    <p class="help-text">Higher = smaller file</p>
                </div>
                <div class="option">
                    <label>Frame Rate</label>
                    <select id="gifFps">
                        <option value="0">Keep Original</option>
                        <option value="10">10 FPS</option>
                        <option value="15" selected>15 FPS</option>
                        <option value="24">24 FPS</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="tab-content" id="tab-mp4">
            <div class="options">
                <div class="option">
                    <label>Max Dimension (px)</label>
                    <input type="number" id="mp4MaxSize" value="400" min="50" max="1920">
                </div>
                <div class="option">
                    <label>Output Format</label>
                    <select id="mp4OutputFormat">
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                    </select>
                </div>
                <div class="option">
                    <label>Quality (CRF): <span class="range-value" id="mp4CrfValue">28</span></label>
                    <input type="range" id="mp4Crf" min="18" max="40" value="28">
                    <p class="help-text">Higher = smaller file</p>
                </div>
                <div class="option">
                    <label>Frame Rate</label>
                    <select id="mp4Fps">
                        <option value="0">Keep Original</option>
                        <option value="10">10 FPS</option>
                        <option value="15" selected>15 FPS</option>
                        <option value="24">24 FPS</option>
                    </select>
                </div>
            </div>
        </div>
<<<<<<< Updated upstream
=======

        <div class="tab-content" id="tab-audio">
            <div class="options">
                <div class="option">
                    <label>Output Format</label>
                    <select id="audioOutputFormat">
                        <option value="opus">Opus (smallest, best for speech)</option>
                        <option value="m4a">M4A/AAC (universal compatibility)</option>
                        <option value="mp3">MP3 (legacy support)</option>
                    </select>
                </div>
                <div class="option">
                    <label>Bitrate</label>
                    <select id="audioBitrate">
                        <option value="32">32 kbps (speech - smallest)</option>
                        <option value="48" selected>48 kbps (speech - high quality)</option>
                        <option value="64">64 kbps (music/mixed)</option>
                        <option value="96">96 kbps (music - high quality)</option>
                    </select>
                </div>
                <div class="option">
                    <label>Channels</label>
                    <select id="audioChannels">
                        <option value="1" selected>Mono (speech)</option>
                        <option value="2">Stereo (music)</option>
                    </select>
                    <p class="help-text">Mono is perfect for voice/pronunciation</p>
                </div>
                <div class="option">
                    <label>Sample Rate</label>
                    <select id="audioSampleRate">
                        <option value="16000">16 kHz (voice - smallest)</option>
                        <option value="24000">24 kHz (voice - good)</option>
                        <option value="48000" selected>48 kHz (standard)</option>
                    </select>
                    <p class="help-text">Opus requires 8k, 12k, 16k, 24k, or 48k</p>
                </div>
            </div>
        </div>
>>>>>>> Stashed changes
    </div>

    <div class="panel">
        <h2>Upload Files</h2>
        <div class="upload-area" id="uploadArea">
<<<<<<< Updated upstream
            <input type="file" id="fileInput" multiple accept=".png,.gif,.mp4,.webm" style="display: none;">
            <div class="upload-icon" style="font-size: 48px; font-weight: bold;">^</div>
            <p class="upload-text">
                <strong>Click to browse</strong> or drag and drop<br>
                PNG, GIF, MP4, WebM files
=======
            <input type="file" id="fileInput" multiple accept=".png,.gif,.mp4,.webm,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma" style="display: none;">
            <div class="upload-icon" style="font-size: 48px; font-weight: bold;">^</div>
            <p class="upload-text">
                <strong>Click to browse</strong> or drag and drop<br>
                PNG, GIF, MP4, WebM, MP3, WAV, M4A files
>>>>>>> Stashed changes
            </p>
        </div>
    </div>

    <div class="panel" id="fileListPanel" style="display: none;">
        <h2>Files (<span id="fileCount">0</span>)</h2>
        <div class="file-list" id="fileList"></div>
        
        <div id="progressContainer" style="display: none;">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%">0%</div>
            </div>
        </div>

        <div class="button-group">
            <button class="btn btn-primary" id="convertBtn" disabled>Convert All</button>
            <button class="btn btn-danger" id="clearBtn">Clear</button>
        </div>
    </div>

    <div class="panel results-panel" id="resultsPanel">
        <h2>Results</h2>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-value" id="statConverted">0</div>
                <div class="stat-label">Converted</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" id="statOriginalSize">0 KB</div>
                <div class="stat-label">Original</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" id="statNewSize">0 KB</div>
                <div class="stat-label">New Size</div>
            </div>
        </div>

        <div class="file-list" id="resultsList"></div>
    </div>

    <script>
        let files = [];
        let convertedFiles = [];
        let totalOriginalSize = 0;
        let totalNewSize = 0;

        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileListPanel = document.getElementById('fileListPanel');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        const convertBtn = document.getElementById('convertBtn');
        const clearBtn = document.getElementById('clearBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const resultsPanel = document.getElementById('resultsPanel');
        const resultsList = document.getElementById('resultsList');

        // Tab handling
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });

        // Range updates
        ['pngQuality', 'gifCrf', 'mp4Crf'].forEach(id => {
            const elem = document.getElementById(id);
            const valueElem = document.getElementById(id + 'Value');
            elem.addEventListener('input', () => {
                valueElem.textContent = elem.value + (id.includes('Quality') ? '%' : '');
            });
        });

        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFiles);
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles({ target: { files: e.dataTransfer.files } });
        });

        convertBtn.addEventListener('click', startConversion);
        clearBtn.addEventListener('click', clearAll);

        function handleFiles(e) {
<<<<<<< Updated upstream
            const validExts = ['png', 'gif', 'mp4', 'webm'];
=======
            const validExts = ['png', 'gif', 'mp4', 'webm', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
>>>>>>> Stashed changes
            const newFiles = Array.from(e.target.files).filter(file => {
                const ext = file.name.toLowerCase().split('.').pop();
                return validExts.includes(ext);
            });

            if (newFiles.length === 0) {
<<<<<<< Updated upstream
                alert('Please select PNG, GIF, MP4, or WebM files.');
=======
                alert('Please select valid media files.');
>>>>>>> Stashed changes
                return;
            }

            files = [...files, ...newFiles];
            updateFileList();
            fileInput.value = '';
        }

        function updateFileList() {
            if (files.length === 0) {
                fileListPanel.style.display = 'none';
                return;
            }

            fileListPanel.style.display = 'block';
            fileCount.textContent = files.length;
            convertBtn.disabled = false;

            fileList.innerHTML = files.map((file, index) => {
                const ext = file.name.toLowerCase().split('.').pop();
<<<<<<< Updated upstream
                const icons = { png: '[IMG]', gif: '[VID]', mp4: '[VID]', webm: '[VID]' };
=======
                const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
                const icons = { 
                    png: '[IMG]', 
                    gif: '[VID]', 
                    mp4: '[VID]', 
                    webm: '[VID]'
                };
                
                // Set icon for audio files
                if (audioExts.includes(ext)) {
                    icons[ext] = '[AUD]';
                }
>>>>>>> Stashed changes
                
                return `
                    <div class="file-item">
                        <span class="file-icon">${icons[ext] || '[FILE]'}</span>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${formatSize(file.size)}</div>
                        </div>
                        <span class="file-status status-pending" id="status-${index}">Pending</span>
                    </div>
                `;
            }).join('');
        }

        function clearAll() {
            files = [];
            convertedFiles = [];
            totalOriginalSize = 0;
            totalNewSize = 0;
            updateFileList();
            resultsPanel.classList.remove('show');
            progressContainer.style.display = 'none';
        }

        async function startConversion() {
            convertBtn.disabled = true;
            clearBtn.disabled = true;
            progressContainer.style.display = 'block';
            convertedFiles = [];
            totalOriginalSize = 0;
            totalNewSize = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const statusEl = document.getElementById(`status-${i}`);
                statusEl.textContent = 'Processing';
                statusEl.className = 'file-status status-processing';

                try {
                    const result = await convertFile(file);
                    
                    if (result.success) {
                        convertedFiles.push(result);
                        totalOriginalSize += result.originalSize;
                        totalNewSize += result.newSize;
                        statusEl.textContent = 'Done';
                        statusEl.className = 'file-status status-done';
                    } else {
                        throw new Error(result.error || 'Conversion failed');
                    }
                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    statusEl.textContent = 'Error';
                    statusEl.className = 'file-status status-error';
<<<<<<< Updated upstream
=======
                    
                    const fileItem = statusEl.closest('.file-item');
                    let errorDiv = fileItem.querySelector('.error-details');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'error-details';
                        errorDiv.style.whiteSpace = 'pre-wrap';
                        errorDiv.style.maxHeight = '150px';
                        errorDiv.style.overflow = 'auto';
                        fileItem.querySelector('.file-info').appendChild(errorDiv);
                    }
                    const errorText = error.message || error.toString();
                    errorDiv.textContent = errorText;
                    console.log('Full error:', errorText);
>>>>>>> Stashed changes
                }

                const progress = Math.round(((i + 1) / files.length) * 100);
                progressFill.style.width = progress + '%';
                progressFill.textContent = progress + '%';
            }

            showResults();
            convertBtn.disabled = false;
            clearBtn.disabled = false;
        }

        async function convertFile(file) {
            const ext = file.name.toLowerCase().split('.').pop();
<<<<<<< Updated upstream
=======
            const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
>>>>>>> Stashed changes
            const formData = new FormData();
            formData.append('file', file);

            // Add conversion options based on file type
            if (ext === 'png') {
                formData.append('resolution', document.getElementById('pngResolution').value);
                formData.append('quality', document.getElementById('pngQuality').value);
                formData.append('outputFormat', 'webp');
<<<<<<< Updated upstream
=======
            } else if (audioExts.includes(ext)) {
                formData.append('outputFormat', document.getElementById('audioOutputFormat').value);
                formData.append('bitrate', document.getElementById('audioBitrate').value);
                formData.append('channels', document.getElementById('audioChannels').value);
                formData.append('sampleRate', document.getElementById('audioSampleRate').value);
>>>>>>> Stashed changes
            } else if (ext === 'gif') {
                formData.append('maxSize', document.getElementById('gifMaxSize').value);
                formData.append('outputFormat', document.getElementById('gifOutputFormat').value);
                formData.append('crf', document.getElementById('gifCrf').value);
                formData.append('fps', document.getElementById('gifFps').value);
            } else if (ext === 'mp4' || ext === 'webm') {
                formData.append('maxSize', document.getElementById('mp4MaxSize').value);
                formData.append('outputFormat', document.getElementById('mp4OutputFormat').value);
                formData.append('crf', document.getElementById('mp4Crf').value);
                formData.append('fps', document.getElementById('mp4Fps').value);
            }

            const response = await fetch('', {
                method: 'POST',
                body: formData
            });

<<<<<<< Updated upstream
            return await response.json();
=======
            const result = await response.json();
            
            if (!result.success && result.error) {
                throw new Error(result.error);
            }
            
            return result;
>>>>>>> Stashed changes
        }

        function showResults() {
            resultsPanel.classList.add('show');
            
            document.getElementById('statConverted').textContent = convertedFiles.length;
            document.getElementById('statOriginalSize').textContent = formatSize(totalOriginalSize);
            document.getElementById('statNewSize').textContent = formatSize(totalNewSize);

            resultsList.innerHTML = convertedFiles.map((file) => {
                const savings = Math.round((1 - file.newSize / file.originalSize) * 100);
                const savingsColor = savings > 0 ? '#16a34a' : '#dc2626';
                
                return `
                    <div class="file-item">
                        <span class="file-icon">[OK]</span>
                        <div class="file-info">
                            <div class="file-name">${file.newName}</div>
                            <div class="file-size">
                                ${formatSize(file.originalSize)} to ${formatSize(file.newSize)}
                                <span style="color: ${savingsColor}; font-weight: 600;">
                                    (${savings > 0 ? '-' : '+'}${Math.abs(savings)}%)
                                </span>
                            </div>
                        </div>
                        <a href="${file.downloadUrl}" class="btn btn-primary btn-sm">Download</a>
                    </div>
                `;
            }).join('');
        }

        function formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>