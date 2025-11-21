<?php
// Prevent caching of the HTML page itself
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
?>
<!DOCTYPE html>
<html lang="en" data-theme="light">
<!-- Bob and Mariel Ward School of Filipino Languages - Version 4.2 - Advanced Filter - November 2025 -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Prevent browser caching of this page -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">

    <title>Bob and Mariel Ward School of Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Driver.js for onboarding tours -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css">
    <script src="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.iife.js"></script>

    <?php
    function cacheBust($file) {
        $fullPath = __DIR__ . '/' . $file;
        if (file_exists($fullPath)) {
            return filemtime($fullPath);
        } else {
            error_log("Cache buster: File not found - " . $fullPath);
            return time();
        }
    }
    ?>
    
    <link rel="stylesheet" href="styles/core.css?v=<?php echo cacheBust('styles/core.css'); ?>">
    <link rel="stylesheet" href="styles/theme.css?v=<?php echo cacheBust('styles/theme.css'); ?>">
    <link rel="stylesheet" href="styles/modules/flashcards.css?v=<?php echo cacheBust('styles/modules/flashcards.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match.css?v=<?php echo cacheBust('styles/modules/match.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match-sound.css?v=<?php echo cacheBust('styles/modules/match-sound.css'); ?>">
    <link rel="stylesheet" href="styles/modules/quiz.css?v=<?php echo cacheBust('styles/modules/quiz.css'); ?>">
    <link rel="stylesheet" href="styles/modules/admin.css?v=<?php echo cacheBust('styles/modules/admin.css'); ?>">
    <link rel="stylesheet" href="styles/modules/pdf-print.css?v=<?php echo cacheBust('styles/modules/pdf-print.css'); ?>">
    <link rel="stylesheet" href="styles/modules/deck-builder.css?v=<?php echo cacheBust('styles/modules/deck-builder.css'); ?>">
    <link rel="stylesheet" href="styles/modules/voice-practice.css?v=<?php echo cacheBust('styles/modules/voice-practice.css'); ?>">
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-title">
                <h1>
                    <img id="logoImg" src="assets/logo.png" alt="Logo" class="logo-image" style="display: none;" onload="this.style.display='inline-block';" onerror="this.style.display='none'">
                    Bob and Mariel Ward School of Filipino Languages
                </h1>
                <span class="version-badge">v4.2</span>
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
                <div class="filter-button-container">
                    <button id="advancedFilterBtn">
                        <i class="fas fa-filter"></i>
                        <span>Advanced Filter</span>
                        <span class="filter-indicator"></span>
                    </button>
                </div>
                <button id="themeToggle" class="theme-toggle">
                    <i class="fas fa-moon"></i>
                    <span>Dark Mode</span>
                </button>
            </div>
        </div>
    </div>

    <div class="container">
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
        <div id="moduleContainer" class="module-container"></div>
    </div>

    <div id="toastContainer" class="toast-container"></div>

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

    <div id="advancedFilterModal" class="modal hidden">
        <div class="modal-content filter-modal">
            <div class="modal-header">
                <h2><i class="fas fa-filter"></i> Advanced Filter</h2>
                <button id="closeFilterModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="filter-section-title">Lesson Range</div>
                <div class="lesson-range-row">
                    <div class="filter-group">
                        <label for="filterStartLesson">Start Lesson</label>
                        <select id="filterStartLesson">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filterEndLesson">End Lesson</label>
                        <select id="filterEndLesson">
                            <option value="">All</option>
                        </select>
                    </div>
                </div>
                <p class="filter-hint">Select a range of lessons or leave as "All"</p>
                
                <div class="filter-section-divider">
                    <div class="filter-section-title">Card Properties</div>
                </div>
                
                <div class="filter-group">
                    <label for="filterGrammar">Grammar</label>
                    <select id="filterGrammar">
                        <option value="">All</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterCategory">Category</label>
                    <select id="filterCategory">
                        <option value="">All</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterSubCategory1">Sub-Category 1</label>
                    <select id="filterSubCategory1">
                        <option value="">All</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterSubCategory2">Sub-Category 2</label>
                    <select id="filterSubCategory2">
                        <option value="">All</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterActfl">ACTFL Level</label>
                    <select id="filterActfl">
                        <option value="">All</option>
                    </select>
                </div>
                
                <div class="filter-match-count">
                    <span id="filterMatchCount">0 cards match</span>
                </div>
            </div>
            <div class="filter-footer">
                <button id="clearFiltersBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Clear Filters
                </button>
                <button id="applyFiltersBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> Apply Filters
                </button>
            </div>
        </div>
    </div>

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

    <div id="debugConsole" class="debug-console">
        <div class="debug-header">
            <span><i class="fas fa-terminal"></i> Debug Log</span>
            <button id="clearDebug" class="btn-icon">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div id="debugLog" class="debug-log"></div>
    </div>

    <!-- Tour Guide System -->
    <script src="tour-guide.js?v=<?php echo cacheBust('tour-guide.js'); ?>"></script>

    <script src="app.js?v=<?php echo cacheBust('app.js'); ?>"></script>
    <script src="auth-manager.js?v=<?php echo cacheBust('auth-manager.js'); ?>"></script>
    <script src="voice-practice-module.js?v=<?php echo cacheBust('voice-practice-module.js'); ?>"></script>
    <script src="flashcards-module.js?v=<?php echo cacheBust('flashcards-module.js'); ?>"></script>
    <script src="match-module.js?v=<?php echo cacheBust('match-module.js'); ?>"></script>
    <script src="match-sound-module.js?v=<?php echo cacheBust('match-sound-module.js'); ?>"></script>
    <script src="quiz-module.js?v=<?php echo cacheBust('quiz-module.js'); ?>"></script>
    <script src="admin-module.js?v=<?php echo cacheBust('admin-module.js'); ?>"></script>
    <script src="pdf-module.js?v=<?php echo cacheBust('pdf-module.js'); ?>"></script>
    <script src="deck-builder-module.js?v=<?php echo cacheBust('deck-builder-module.js'); ?>"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</body>
</html>
