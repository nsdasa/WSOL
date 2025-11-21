<?php
/**
 * Voice Recorder - Standalone Audio Recording Tool
 * Bob and Mariel Ward School of Filipino Languages
 * 
 * Separate application for voice recording only
 * Access: /rec/
 */

session_start();
require_once '../config.php';

// Check if logged in
$isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
$userRole = $_SESSION['user_role'] ?? null;

// Only allow voice-recorder role (or admin for testing)
$hasAccess = $isLoggedIn && ($userRole === 'voice-recorder' || $userRole === 'admin');

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    $password = $_POST['password'] ?? '';
    
    // Check voice recorder password (or admin for testing)
    if ($password === VOICE_RECORDER_PASSWORD || $password === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['user_role'] = ($password === ADMIN_PASSWORD) ? 'admin' : 'voice-recorder';
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['timeout_minutes'] = DEFAULT_SESSION_TIMEOUT;
        
        header('Location: index.php');
        exit;
    } else {
        $loginError = 'Incorrect password';
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}

// Cache buster function
function cacheBust($file) {
    $fullPath = __DIR__ . '/../' . $file;
    if (file_exists($fullPath)) {
        return filemtime($fullPath);
    }
    return time();
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice Recorder - Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../styles/core.css?v=<?php echo cacheBust('styles/core.css'); ?>">
    <link rel="stylesheet" href="../styles/theme.css?v=<?php echo cacheBust('styles/theme.css'); ?>">
    <link rel="stylesheet" href="voice-recorder.css?v=<?php echo time(); ?>">

    <!-- Driver.js for onboarding tours -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css"/>
</head>
<body>
    <?php if (!$hasAccess): ?>
    <!-- Login Screen -->
    <div class="login-screen">
        <div class="login-card">
            <div class="login-header">
                <i class="fas fa-microphone"></i>
                <h1>Voice Recorder</h1>
                <p>Bob and Mariel Ward School of Filipino Languages</p>
            </div>
            <form method="POST" class="login-form">
                <input type="hidden" name="action" value="login">
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" class="form-input" 
                        placeholder="Enter password" autofocus required>
                </div>
                <?php if (isset($loginError)): ?>
                <div class="login-error">
                    <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($loginError); ?>
                </div>
                <?php endif; ?>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
            </form>
            <div class="login-footer">
                <a href="../" class="back-link">
                    <i class="fas fa-arrow-left"></i> Back to Main Site
                </a>
            </div>
        </div>
    </div>
    <?php else: ?>
    <!-- Main Application -->
    <div class="app-container">
        <!-- Header -->
        <header class="app-header">
            <div class="header-left">
                <i class="fas fa-microphone"></i>
                <h1>Voice Recorder</h1>
                <span class="role-badge">
                    <i class="fas fa-user"></i> 
                    <?php echo $userRole === 'admin' ? 'Admin' : 'Voice Recorder'; ?>
                </span>
            </div>
            <div class="header-right">
                <button id="showTourBtn" class="btn btn-secondary" title="Show guided tour">
                    <i class="fas fa-question-circle"></i> Show Tour
                </button>
                <button id="themeToggle" class="btn btn-icon" title="Toggle theme">
                    <i class="fas fa-moon"></i>
                </button>
                <a href="?logout=1" class="btn btn-secondary">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </header>

        <!-- Controls Bar -->
        <div class="controls-bar">
            <div class="filter-group">
                <label for="languageFilter">
                    <i class="fas fa-language"></i> Language:
                </label>
                <select id="languageFilter" class="select-control">
                    <option value="ceb">Cebuano</option>
                    <option value="mrw">Maranao</option>
                    <option value="sin">Sinama</option>
                </select>
            </div>

            <div class="filter-group" id="translationLangGroup" style="display: none;">
                <label for="translationLangFilter">
                    <i class="fas fa-globe"></i> Translation:
                </label>
                <select id="translationLangFilter" class="select-control">
                    <option value="eng">English</option>
                    <option value="ceb">Cebuano</option>
                </select>
            </div>

            <div class="filter-group">
                <label for="lessonFilterFrom">
                    <i class="fas fa-filter"></i> Lesson:
                </label>
                <input type="number" id="lessonFilterFrom" class="form-input lesson-input" placeholder="From" min="1">
                <span class="range-separator">-</span>
                <input type="number" id="lessonFilterTo" class="form-input lesson-input" placeholder="To" min="1">
                <button id="clearLessonFilter" class="btn btn-sm btn-secondary" title="Clear">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="filter-group search-group">
                <label for="searchCards">
                    <i class="fas fa-search"></i>
                </label>
                <input type="text" id="searchCards" class="form-input" placeholder="Search words...">
            </div>

            <div class="stats-display">
                <span id="cardCount">0 cards</span>
                <span id="audioCount" class="audio-stat">0 with audio</span>
            </div>

            <div class="action-buttons">
                <button id="saveChangesBtn" class="btn btn-primary" disabled>
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>

        <!-- Cards Table -->
        <div class="table-container">
            <table class="cards-table" id="cardsTable">
                <thead>
                    <tr>
                        <th class="col-audio">Audio</th>
                        <th class="col-word">Word</th>
                        <th class="col-english">Translation</th>
                        <th class="col-lesson">Lesson</th>
                        <th class="col-card">Card #</th>
                    </tr>
                </thead>
                <tbody id="cardsTableBody">
                    <tr>
                        <td colspan="5" class="loading-cell">
                            <i class="fas fa-spinner fa-spin"></i> Loading cards...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <!-- File Selection Modal -->
    <div id="fileModal" class="modal hidden">
        <div class="modal-content file-modal">
            <div class="modal-header">
                <h2 id="fileModalTitle">
                    <i class="fas fa-file-audio"></i> Select Audio File
                </h2>
                <button id="closeFileModal" class="btn-icon">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-tabs">
                <button class="tab-btn active" data-tab="browse">
                    <i class="fas fa-folder-open"></i> Browse Server
                </button>
                <button class="tab-btn" data-tab="upload">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <button class="tab-btn" data-tab="record">
                    <i class="fas fa-microphone"></i> Record
                </button>
            </div>
            <div class="modal-body">
                <!-- Browse Tab -->
                <div class="tab-content active" id="browseTab">
                    <!-- Current File Preview -->
                    <div id="currentFilePreview" style="display: none;">
                        <!-- Dynamically populated -->
                    </div>

                    <div class="file-browser-controls">
                        <input type="text" id="fileBrowserSearch" class="form-input" placeholder="Search files...">
                    </div>
                    <div class="file-browser-grid" id="fileBrowserGrid">
                        <div class="loading-files">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </div>
                    </div>
                </div>
                
                <!-- Upload Tab -->
                <div class="tab-content" id="uploadTab">
                    <div class="upload-zone" id="uploadZone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop audio file here</p>
                        <button id="selectFileBtn" class="btn btn-primary">
                            <i class="fas fa-folder-open"></i> Select File
                        </button>
                        <input type="file" id="fileInput" accept="audio/*" style="display:none;">
                    </div>
                </div>
                
                <!-- Record Tab -->
                <div class="tab-content" id="recordTab">
                    <div class="record-container">
                        <!-- Recording View -->
                        <div id="recordView" class="record-view">
                            <div id="recordStatus" class="record-status">
                                <i class="fas fa-microphone"></i>
                                <p>Click Record to start</p>
                            </div>
                            <div id="countdownDisplay" class="countdown-display hidden">
                                <span class="countdown-number">3</span>
                            </div>
                            <button id="startRecordBtn" class="btn btn-record">
                                <i class="fas fa-microphone"></i> Record
                            </button>
                            <button id="stopRecordBtn" class="btn btn-stop hidden">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        </div>
                        
                        <!-- Editor View -->
                        <div id="editorView" class="editor-view hidden">
                            <div class="waveform-container">
                                <canvas id="waveformCanvas" width="600" height="150"></canvas>
                                <div class="marker marker-start" id="markerStart"></div>
                                <div class="marker marker-end" id="markerEnd"></div>
                                <div class="playhead" id="playhead"></div>
                            </div>
                            <div class="editor-time">
                                <span id="currentTime">0:00</span> / <span id="totalTime">0:00</span>
                            </div>
                            <div class="editor-controls">
                                <button class="btn btn-sm btn-secondary" id="editorPlayBtn" title="Play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorPauseBtn" title="Pause">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorStopBtn" title="Stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                                <button class="btn btn-sm btn-warning" id="editorCutBtn" title="Cut">
                                    <i class="fas fa-cut"></i> Cut
                                </button>
                                <button class="btn btn-sm btn-primary" id="editorSaveBtn" title="Save">
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorRerecordBtn" title="Re-record">
                                    <i class="fas fa-microphone"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Filename Dialog -->
    <div id="filenameDialog" class="modal hidden">
        <div class="modal-content filename-dialog">
            <div class="modal-header">
                <h2><i class="fas fa-save"></i> Save Audio</h2>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Filename</label>
                    <input type="text" id="filenameInput" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Audio Format</label>
                    <select id="audioFormatSelect" class="form-input">
                        <option value="opus">Opus (Recommended - Smallest, Best Quality)</option>
                        <option value="m4a">M4A (Good Compatibility)</option>
                        <option value="wav">WAV (Uncompressed, Large)</option>
                    </select>
                </div>
                <p class="filename-hint">
                    <i class="fas fa-info-circle"></i> File will be saved to assets folder
                </p>
            </div>
            <div class="modal-footer">
                <button id="confirmFilenameBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> Save
                </button>
                <button id="cancelFilenameBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>

    <script src="voice-recorder-app.js?v=<?php echo time(); ?>"></script>

    <!-- Driver.js for onboarding tours -->
    <script src="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js"></script>
    <script src="../tour-guide.js?v=<?php echo time(); ?>"></script>
    <?php endif; ?>
</body>
</html>
