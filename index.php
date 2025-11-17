<!DOCTYPE html>
<html lang="en" data-theme="light">
<!-- Bob and Mariel Ward School of Filipino Languages - Version 3.1 - MODULAR CSS - November 2025 -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bob and Mariel Ward School of Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Core Styles -->
    <link rel="stylesheet" href="styles/core.css?v=<?php echo filemtime('styles/core.css'); ?>">
    <link rel="stylesheet" href="styles/theme.css?v=<?php echo filemtime('styles/theme.css'); ?>">
    
    <!-- Module Styles -->
    <link rel="stylesheet" href="styles/modules/flashcards.css?v=<?php echo filemtime('styles/modules/flashcards.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match.css?v=<?php echo filemtime('styles/modules/match.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match-sound.css?v=<?php echo filemtime('styles/modules/match-sound.css'); ?>">
    <link rel="stylesheet" href="styles/modules/quiz.css?v=<?php echo filemtime('styles/modules/quiz.css'); ?>">
    <link rel="stylesheet" href="styles/modules/admin.css?v=<?php echo filemtime('styles/modules/admin.css'); ?>">
    <link rel="stylesheet" href="styles/modules/pdf-print.css?v=<?php echo filemtime('styles/modules/pdf-print.css'); ?>">
    <link rel="stylesheet" href="styles/modules/deck-builder.css?v=<?php echo filemtime('styles/modules/deck-builder.css'); ?>">
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
                <span class="version-badge">v3.1</span>
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
            <button class="nav-tab" data-module="pdf-print">
                <i class="fas fa-print"></i>
                Print PDF
            </button>
            <button class="nav-tab" data-module="deck-builder">
                <i class="fas fa-edit"></i>
                Deck Builder
            </button>
            <button class="nav-tab" data-module="admin">
                <i class="fas fa-tools"></i>
                Admin
            </button>
        </div>

        <!-- Module Container -->
        <div id="moduleContainer" class="tab-content active"></div>
    </div>

    <!-- Scan Assets Modal -->
    <div id="scanModal" class="modal hidden">
        <div class="modal-content large">
            <div class="modal-header">
                <h2><i class="fas fa-search"></i> Asset Scanner</h2>
                <button id="closeScanModal" class="close-btn">&times;</button>
            </div>

            <div id="scanProgress" class="scan-section hidden">
                <div class="loading-spinner"></div>
                <p id="scanProgressText" class="scan-message">Initializing scan...</p>
            </div>

            <div id="scanResults" class="scan-section hidden">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-image"></i></div>
                        <div class="stat-value" id="totalImages">0</div>
                        <div class="stat-label">Images Found</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-music"></i></div>
                        <div class="stat-value" id="totalAudio">0</div>
                        <div class="stat-label">Audio Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-value" id="totalCards">0</div>
                        <div class="stat-label">Complete Cards</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-exclamation-triangle"></i> Validation Results</h3>
                    </div>
                    <div id="validationIssues" class="validation-list"></div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-eye"></i> Card Preview (First 10)</h3>
                    </div>
                    <div id="cardPreview" class="preview-grid"></div>
                </div>

                <div class="action-buttons">
                    <button id="downloadManifest" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download manifest.json
                    </button>
                    <button id="cancelScan" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>

            <div id="scanError" class="scan-section hidden">
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p id="errorMessage"></p>
                    <button id="retryScan" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            </div>
        </div>
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

    <!-- Debug Console (Hidden - Debug log now only shows in Admin tab) -->
    <div id="debugConsole" class="debug-console">
        <div class="debug-header">
            <span><i class="fas fa-terminal"></i> Debug Log</span>
            <button id="clearDebug" class="btn-icon">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div id="debugLog" class="debug-log"></div>
    </div>

    <!-- Core Application Script (includes base LearningModule class) -->
    <script src="app.js?v=<?php echo filemtime('app.js'); ?>"></script>
    
    <!-- Authentication Manager -->
    <script src="auth-manager.js?v=<?php echo filemtime('auth-manager.js'); ?>"></script>
    
    <!-- Individual Module Scripts -->
    <script src="flashcards-module.js?v=<?php echo filemtime('flashcards-module.js'); ?>"></script>
    <script src="match-module.js?v=<?php echo filemtime('match-module.js'); ?>"></script>
    <script src="match-sound-module.js?v=<?php echo filemtime('match-sound-module.js'); ?>"></script>
    <script src="quiz-module.js?v=<?php echo filemtime('quiz-module.js'); ?>"></script>
    <script src="admin-module.js?v=<?php echo filemtime('admin-module.js'); ?>"></script>
    <script src="pdf-module.js?v=<?php echo filemtime('pdf-module.js'); ?>"></script>
    <script src="deck-builder-module.js?v=<?php echo filemtime('deck-builder-module.js'); ?>"></script>
    
    <!-- External Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</body>
</html>