<!DOCTYPE html>
<html lang="en" data-theme="light">
<!-- Bob and Mariel Ward School of Filipino Languages - Version 4.1 - Voice Practice - November 18, 2025 -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bob and Mariel Ward School of Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <?php
    // ROBUST CACHE BUSTER FUNCTION
    // Uses __DIR__ for reliable path resolution regardless of working directory
    function cacheBust($file) {
        $fullPath = __DIR__ . '/' . $file;
        if (file_exists($fullPath)) {
            return filemtime($fullPath);
        } else {
            // Log missing file for debugging (check PHP error log)
            error_log("Cache buster: File not found - " . $fullPath);
            // Return current timestamp as fallback (forces reload)
            return time();
        }
    }
    ?>
    
    <!-- Core Styles with Cache Busting -->
    <link rel="stylesheet" href="styles/core.css?v=<?php echo cacheBust('styles/core.css'); ?>">
    <link rel="stylesheet" href="styles/theme.css?v=<?php echo cacheBust('styles/theme.css'); ?>">
    
    <!-- Module Styles -->
    <link rel="stylesheet" href="styles/modules/flashcards.css?v=<?php echo cacheBust('styles/modules/flashcards.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match.css?v=<?php echo cacheBust('styles/modules/match.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match-sound.css?v=<?php echo cacheBust('styles/modules/match-sound.css'); ?>">
    <link rel="stylesheet" href="styles/modules/quiz.css?v=<?php echo cacheBust('styles/modules/quiz.css'); ?>">
    <link rel="stylesheet" href="styles/modules/admin.css?v=<?php echo cacheBust('styles/modules/admin.css'); ?>">
    <link rel="stylesheet" href="styles/modules/pdf-print.css?v=<?php echo cacheBust('styles/modules/pdf-print.css'); ?>">
    <link rel="stylesheet" href="styles/modules/deck-builder.css?v=<?php echo cacheBust('styles/modules/deck-builder.css'); ?>">
    
    <!-- Voice Practice Styles -->
    <link rel="stylesheet" href="styles/modules/voice-practice.css?v=<?php echo cacheBust('styles/modules/voice-practice.css'); ?>">
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="header-title">
                <h1>
                    <img id="logoImg" src="assets/logo.png" alt="Logo" class="logo-image" style="display: none;" onload="this.style.display='inline-block';" onerror="this.style.display='none'">
                    Bob and Mariel Ward School of Filipino Languages
                </h1>
                <span class="version-badge">v4.1</span>
            </div>
            <div class="header-controls">
                <div class="language-selector">
                    <label for="languageSelect"><i class="fas fa-globe"></i></label>
                    <select id="languageSelect" class="select-control">
                        <option value="">Select Language...</option>
                    </select>
                </div>
                <div class="lesson-selector">
                    <label for="lessonSelect"><i class="fas fa-book"></i></label>
                    <select id="lessonSelect" class="select-control">
                        <option value="">Select Lesson...</option>
                    </select>
                </div>
                <button id="themeToggle" class="theme-toggle">
                    <i class="fas fa-moon"></i>
                    <span>Dark Mode</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Main Container -->
    <div class="container">
        <!-- Navigation Tabs -->
        <div class="nav-tabs">
            <button class="nav-tab active" data-module="flashcards">
                <i class="fas fa-layer-group"></i>
                Flashcards
            </button>
            <button class="nav-tab" data-module="match">
                <i class="fas fa-link"></i>
                Picture Match
            </button>
            <button class="nav-tab" data-module="match-sound">
                <i class="fas fa-volume-up"></i>
                Audio Match
            </button>
            <button class="nav-tab" data-module="quiz">
                <i class="fas fa-question-circle"></i>
                Unsa Ni?
            </button>
            <button class="nav-tab" data-module="deck-builder">
                <i class="fas fa-edit"></i>
                Deck Builder
            </button>
            <button class="nav-tab" data-module="admin">
                <i class="fas fa-tools"></i>
                Admin
            </button>
            <button class="nav-tab" data-module="pdf">
                <i class="fas fa-print"></i>
                Print PDFs
            </button>
        </div>

        <!-- Module Container -->
        <div id="moduleContainer" class="module-container"></div>
    </div>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <!-- Instruction Modal -->
    <div id="instructionModal" class="modal hidden">
        <div class="modal-content instruction-modal">
            <div class="modal-header">
                <h2 id="instructionTitle">Instructions</h2>
            </div>
            <div class="instruction-body">
                <p id="instructionText"></p>
            </div>
            <div class="instruction-footer">
                <button id="closeInstructionBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> OK, Got It!
                </button>
            </div>
        </div>
    </div>

    <!-- Login Modal -->
    <div id="loginModal" class="modal hidden">
        <div class="modal-content login-modal">
            <div class="modal-header">
                <h2><i class="fas fa-lock"></i> Admin Login Required</h2>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 20px; color: var(--text-secondary);">
                    This module requires administrator authentication.
                </p>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="adminPassword" class="form-input" placeholder="Enter admin password">
                </div>
                <div id="loginError" class="login-error hidden"></div>
            </div>
            <div class="action-buttons">
                <button id="loginSubmitBtn" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button id="loginCancelBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- SCAN RESULTS MODAL - FULLY RESTORED -->
    <div id="scanModal" class="modal hidden">
        <div class="modal-content scan-modal" style="max-width:600px;">
            <div class="modal-header">
                <h2><i class="fas fa-check-circle" style="color:#4CAF50"></i> Asset Scan Complete!</h2>
                <button id="closeScanModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
                        <div class="stat-value" id="scanTotalCards">0</div>
                        <div class="stat-label">Total Cards</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-volume-up"></i></div>
                        <div class="stat-value" id="scanWithAudio">0</div>
                        <div class="stat-label">With Audio</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-images"></i></div>
                        <div class="stat-value" id="scanTotalImages">0</div>
                        <div class="stat-label">Images Found</div>
                    </div>
                </div>
                <div style="text-align:center;margin-top:24px;">
                    <a id="scanReportLink" href="#" target="_blank" class="btn btn-primary">
                        <i class="fas fa-file-alt"></i> Open Full HTML Report
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- Debug Console -->
    <div id="debugConsole" class="debug-console">
        <div class="debug-header">
            <span><i class="fas fa-terminal"></i> Debug Log</span>
            <button id="clearDebug" class="btn-icon">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div id="debugLog" class="debug-log"></div>
    </div>

    <!-- Core Application Script -->
    <script src="app.js?v=<?php echo cacheBust('app.js'); ?>"></script>
    
    <!-- Authentication Manager -->
    <script src="auth-manager.js?v=<?php echo cacheBust('auth-manager.js'); ?>"></script>
    
    <!-- Voice Practice Module (load before flashcards) -->
    <script src="voice-practice-module.js?v=<?php echo cacheBust('voice-practice-module.js'); ?>"></script>
    
    <!-- Individual Module Scripts -->
    <script src="flashcards-module.js?v=<?php echo cacheBust('flashcards-module.js'); ?>"></script>
    <script src="match-module.js?v=<?php echo cacheBust('match-module.js'); ?>"></script>
    <script src="match-sound-module.js?v=<?php echo cacheBust('match-sound-module.js'); ?>"></script>
    <script src="quiz-module.js?v=<?php echo cacheBust('quiz-module.js'); ?>"></script>
    <script src="admin-module.js?v=<?php echo cacheBust('admin-module.js'); ?>"></script>
    <script src="pdf-module.js?v=<?php echo cacheBust('pdf-module.js'); ?>"></script>
    <script src="deck-builder-module.js?v=<?php echo cacheBust('deck-builder-module.js'); ?>"></script>
    
    <!-- External Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</body>
</html>
