<?php
// Include config and enforce HTTPS
require_once __DIR__ . '/config.php';
enforceHttps();

// Prevent caching of the HTML page itself
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// Get manifest version for cache busting (only re-download when file changes)
$manifestVersion = file_exists(__DIR__ . '/assets/manifest.json')
    ? filemtime(__DIR__ . '/assets/manifest.json')
    : time();
?>
<!DOCTYPE html>
<html lang="en" data-theme="light">
<!-- Bob and Mariel Ward School of Filipino Languages - Version 4.3 - Two-Level Navigation & New Modules - November 2025 -->
<head>
    <meta charset="UTF-8">
    <!-- Manifest version for JavaScript cache busting -->
    <script>window.MANIFEST_VERSION = <?php echo $manifestVersion; ?>;</script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Prevent browser caching of this page -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">

    <title>Bob and Mariel Ward School of Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
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
    <link rel="stylesheet" href="styles/modules/grammar.css?v=<?php echo cacheBust('styles/modules/grammar.css'); ?>">
    <link rel="stylesheet" href="styles/modules/teacher-guide.css?v=<?php echo cacheBust('styles/modules/teacher-guide.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match.css?v=<?php echo cacheBust('styles/modules/match.css'); ?>">
    <link rel="stylesheet" href="styles/modules/match-sound.css?v=<?php echo cacheBust('styles/modules/match-sound.css'); ?>">
    <link rel="stylesheet" href="styles/modules/quiz.css?v=<?php echo cacheBust('styles/modules/quiz.css'); ?>">
    <link rel="stylesheet" href="styles/modules/admin.css?v=<?php echo cacheBust('styles/modules/admin.css'); ?>">
    <link rel="stylesheet" href="styles/modules/pdf-print.css?v=<?php echo cacheBust('styles/modules/pdf-print.css'); ?>">
    <link rel="stylesheet" href="styles/modules/deck-builder.css?v=<?php echo cacheBust('styles/modules/deck-builder.css'); ?>">
    <link rel="stylesheet" href="styles/modules/voice-practice.css?v=<?php echo cacheBust('styles/modules/voice-practice.css'); ?>">
    <link rel="stylesheet" href="styles/modules/sentence-builder.css?v=<?php echo cacheBust('styles/modules/sentence-builder.css'); ?>">
    <link rel="stylesheet" href="styles/modules/sentence-review.css?v=<?php echo cacheBust('styles/modules/sentence-review.css'); ?>">
    <link rel="stylesheet" href="styles/modules/conversation-practice.css?v=<?php echo cacheBust('styles/modules/conversation-practice.css'); ?>">
    <link rel="stylesheet" href="styles/modules/picture-story.css?v=<?php echo cacheBust('styles/modules/picture-story.css'); ?>">
    <link rel="stylesheet" href="styles/modules/kanban.css?v=<?php echo cacheBust('styles/modules/kanban.css'); ?>">

    <!-- Driver.js for onboarding tours -->
    <link rel="stylesheet" href="assets/vendor/driver.css?v=<?php echo cacheBust('assets/vendor/driver.css'); ?>"/>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-title">
                <h1>
                    <img id="logoImg" src="assets/logo.png" alt="Logo" class="logo-image" style="display: none;" onload="this.style.display='inline-block';" onerror="this.style.display='none'">
                    Bob and Mariel Ward School of Filipino Languages
                </h1>
                <span class="version-badge">v4.3</span>
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
                <button id="loginBtn" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                </button>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Two-Level Navigation System -->
        <div class="nav-tabs" id="navLevel1">
            <button class="nav-tab" data-module="grammar">
                <i class="fas fa-book-open"></i>
                Grammar
            </button>
            <button class="nav-tab nav-category active" data-category="word-discovery">
                <i class="fas fa-search"></i>
                Word Discovery
            </button>
            <button class="nav-tab nav-category" data-category="sentence-zone">
                <i class="fas fa-comments"></i>
                Sentence Zone
            </button>
            <button class="nav-tab" data-module="teacher-guide">
                <i class="fas fa-chalkboard-teacher"></i>
                Teacher's Guide
            </button>
            <button class="nav-tab" data-module="pdf">
                <i class="fas fa-print"></i>
                Print PDFs
            </button>
            <button class="nav-tab hidden" data-module="kanban" id="kanbanTab">
                <i class="fas fa-columns"></i>
                Tracker
            </button>
            <button class="nav-tab hidden" data-module="deck-builder" id="deckBuilderTab">
                <i class="fas fa-edit"></i>
                Deck Builder
            </button>
            <button class="nav-tab hidden" data-module="admin" id="adminTab">
                <i class="fas fa-tools"></i>
                Admin
            </button>
        </div>

        <!-- Level 2: Word Discovery -->
        <div class="nav-tabs nav-level-2 hidden" id="navWordDiscovery" data-category="word-discovery">
            <button class="nav-tab nav-back" data-back="true">
                <i class="fas fa-arrow-left"></i>
                Back
            </button>
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
        </div>

        <!-- Level 2: Sentence Zone -->
        <div class="nav-tabs nav-level-2 hidden" id="navSentenceZone" data-category="sentence-zone">
            <button class="nav-tab nav-back" data-back="true">
                <i class="fas fa-arrow-left"></i>
                Back
            </button>
            <button class="nav-tab" data-module="sentence-review">
                <i class="fas fa-eye"></i>
                Review Zone
            </button>
            <button class="nav-tab" data-module="conversation-practice">
                <i class="fas fa-comments"></i>
                Conversation Zone
            </button>
            <button class="nav-tab" data-module="picture-story">
                <i class="fas fa-book-reader"></i>
                Story Zone
            </button>
            <button class="nav-tab" data-module="sentence-builder">
                <i class="fas fa-bars-staggered"></i>
                Sentence Builder
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
                <h2><i class="fas fa-lock"></i> Login</h2>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 20px; color: var(--text-secondary);">
                    Select your user account and enter the password to access protected features.
                </p>
                <div class="form-group">
                    <label class="form-label">User</label>
                    <select id="loginUser" class="form-input">
                        <option value="">Loading users...</option>
                    </select>
                </div>
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Password</label>
                    <input type="password" id="adminPassword" class="form-input" placeholder="Enter password">
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

    <script src="app.js?v=<?php echo cacheBust('app.js'); ?>"></script>
    <script src="auth-manager.js?v=<?php echo cacheBust('auth-manager.js'); ?>"></script>
    <script src="assets/vendor/meyda.min.js?v=<?php echo cacheBust('assets/vendor/meyda.min.js'); ?>"></script>
    <script src="voice-practice-module.js?v=<?php echo cacheBust('voice-practice-module.js'); ?>"></script>
    <script src="flashcards-module.js?v=<?php echo cacheBust('flashcards-module.js'); ?>"></script>
    <script src="grammar-module.js?v=<?php echo cacheBust('grammar-module.js'); ?>"></script>
    <script src="teacher-guide-module.js?v=<?php echo cacheBust('teacher-guide-module.js'); ?>"></script>
    <script src="match-module.js?v=<?php echo cacheBust('match-module.js'); ?>"></script>
    <script src="match-sound-module.js?v=<?php echo cacheBust('match-sound-module.js'); ?>"></script>
    <script src="quiz-module.js?v=<?php echo cacheBust('quiz-module.js'); ?>"></script>
    <script src="admin-module.js?v=<?php echo cacheBust('admin-module.js'); ?>"></script>
    <script src="pdf-module.js?v=<?php echo cacheBust('pdf-module.js'); ?>"></script>
    <script src="deck-builder-module.js?v=<?php echo cacheBust('deck-builder-module.js'); ?>"></script>
    <script src="deck-builder-audio.js?v=<?php echo cacheBust('deck-builder-audio.js'); ?>"></script>
    <script src="deck-builder-uploads.js?v=<?php echo cacheBust('deck-builder-uploads.js'); ?>"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="sentence-builder-module.js?v=<?php echo cacheBust('sentence-builder-module.js'); ?>"></script>
    <script src="sentence-review-module.js?v=<?php echo cacheBust('sentence-review-module.js'); ?>"></script>
    <script src="sentence-review-builder.js?v=<?php echo cacheBust('sentence-review-builder.js'); ?>"></script>
    <script src="card-sentence-sync.js?v=<?php echo cacheBust('card-sentence-sync.js'); ?>"></script>
    <script src="sentence-pool-manager.js?v=<?php echo cacheBust('sentence-pool-manager.js'); ?>"></script>
    <script src="sentence-zone-builders.js?v=<?php echo cacheBust('sentence-zone-builders.js'); ?>"></script>
    <script src="conversation-practice-module.js?v=<?php echo cacheBust('conversation-practice-module.js'); ?>"></script>
    <script src="picture-story-module.js?v=<?php echo cacheBust('picture-story-module.js'); ?>"></script>
    <script src="kanban-tracker-module.js?v=<?php echo cacheBust('kanban-tracker-module.js'); ?>"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <!-- Driver.js for onboarding tours -->
    <script src="assets/vendor/driver.js?v=<?php echo cacheBust('assets/vendor/driver.js'); ?>"></script>
    <script src="tour-guide.js?v=<?php echo cacheBust('tour-guide.js'); ?>"></script>
</body>
</html>
