<?php
/**
 * Tour Editor - WYSIWYG Tour Configuration Tool
 * Bob and Mariel Ward School of Filipino Languages
 *
 * Standalone visual editor for creating and managing guided tours
 * Access: /tour-editor/
 */

require_once '../config.php';
enforceHttps();

session_start();

// Check if logged in
$isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
$userRole = $_SESSION['user_role'] ?? null;

// Only allow admin role
$hasAccess = $isLoggedIn && $userRole === 'admin';

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    $password = $_POST['password'] ?? '';

    if ($password === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['user_role'] = 'admin';
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

function localCacheBust($file) {
    $fullPath = __DIR__ . '/' . $file;
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
    <title>Tour Editor - Filipino Languages</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../styles/core.css?v=<?php echo cacheBust('styles/core.css'); ?>">
    <link rel="stylesheet" href="../styles/theme.css?v=<?php echo cacheBust('styles/theme.css'); ?>">
    <link rel="stylesheet" href="tour-editor.css?v=<?php echo localCacheBust('tour-editor.css'); ?>">
</head>
<body>
    <?php if (!$hasAccess): ?>
    <!-- Login Screen -->
    <div class="login-screen">
        <div class="login-card">
            <div class="login-header">
                <i class="fas fa-route"></i>
                <h1>Tour Editor</h1>
                <p>Bob and Mariel Ward School of Filipino Languages</p>
            </div>
            <form method="POST" class="login-form">
                <input type="hidden" name="action" value="login">
                <div class="form-group">
                    <label for="password">Admin Password</label>
                    <input type="password" id="password" name="password" class="form-input"
                        placeholder="Enter admin password" autofocus required>
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
    <!-- Main Editor Application -->
    <div class="tour-editor-app">
        <!-- Header -->
        <header class="editor-header">
            <div class="header-left">
                <i class="fas fa-route"></i>
                <h1>Tour Editor</h1>
                <span class="role-badge">
                    <i class="fas fa-user-shield"></i> Admin
                </span>
            </div>
            <div class="header-center">
                <div class="module-selector">
                    <label for="moduleSelect"><i class="fas fa-cube"></i></label>
                    <select id="moduleSelect" class="select-control">
                        <option value="">Select Module...</option>
                        <option value="flashcards">Flashcards</option>
                        <option value="match">Picture Match</option>
                        <option value="match-sound">Audio Match</option>
                        <option value="quiz">Unsa Ni? Quiz</option>
                        <option value="rec">Voice Recorder</option>
                    </select>
                </div>
                <div class="draft-selector">
                    <label for="draftSelect"><i class="fas fa-file-alt"></i></label>
                    <select id="draftSelect" class="select-control">
                        <option value="">Live Config</option>
                    </select>
                </div>
            </div>
            <div class="header-right">
                <button id="saveDraftBtn" class="btn btn-secondary" disabled>
                    <i class="fas fa-save"></i> Save Draft
                </button>
                <button id="previewTourBtn" class="btn btn-secondary" disabled>
                    <i class="fas fa-play"></i> Preview
                </button>
                <button id="publishBtn" class="btn btn-primary" disabled>
                    <i class="fas fa-upload"></i> Publish
                </button>
                <button id="themeToggle" class="btn btn-icon" title="Toggle theme">
                    <i class="fas fa-moon"></i>
                </button>
                <a href="?logout=1" class="btn btn-secondary">
                    <i class="fas fa-sign-out-alt"></i>
                </a>
            </div>
        </header>

        <!-- Main Content Area -->
        <div class="editor-main">
            <!-- Preview Panel (Left) -->
            <div class="preview-panel">
                <div class="panel-header">
                    <h3><i class="fas fa-eye"></i> Module Preview</h3>
                    <div class="preview-controls">
                        <button id="refreshPreview" class="btn btn-sm btn-icon" title="Refresh preview">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button id="zoomOut" class="btn btn-sm btn-icon" title="Zoom out">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <span id="zoomLevel" class="zoom-indicator">100%</span>
                        <button id="zoomIn" class="btn btn-sm btn-icon" title="Zoom in">
                            <i class="fas fa-search-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="preview-container">
                    <div class="preview-placeholder" id="previewPlaceholder">
                        <i class="fas fa-hand-pointer"></i>
                        <p>Select a module to preview</p>
                    </div>
                    <div class="iframe-wrapper" id="iframeWrapper" style="display: none;">
                        <iframe id="previewFrame" src="about:blank" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
                        <canvas id="overlayCanvas"></canvas>
                        <div class="element-highlight" id="elementHighlight" style="display: none;"></div>
                    </div>
                </div>
                <div class="preview-toolbar">
                    <button id="selectElementBtn" class="btn btn-tool" title="Select element from preview">
                        <i class="fas fa-crosshairs"></i> Select Element
                    </button>
                    <button id="drawShapeBtn" class="btn btn-tool" title="Draw highlight shape">
                        <i class="fas fa-draw-polygon"></i> Draw Shape
                    </button>
                    <button id="recordActionBtn" class="btn btn-tool" title="Record user action">
                        <i class="fas fa-video"></i> Record Action
                    </button>
                </div>
            </div>

            <!-- Steps Panel (Right) -->
            <div class="steps-panel">
                <div class="panel-header">
                    <h3><i class="fas fa-list-ol"></i> Tour Steps</h3>
                    <button id="addStepBtn" class="btn btn-sm btn-primary" disabled>
                        <i class="fas fa-plus"></i> Add Step
                    </button>
                </div>
                <div class="steps-container" id="stepsContainer">
                    <div class="steps-placeholder">
                        <i class="fas fa-tasks"></i>
                        <p>Select a module to view and edit tour steps</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step Editor Panel (Bottom) -->
        <div class="step-editor-panel" id="stepEditorPanel" style="display: none;">
            <div class="panel-header">
                <h3><i class="fas fa-edit"></i> Edit Step: <span id="stepEditorTitle">Step 1</span></h3>
                <button id="closeStepEditor" class="btn btn-sm btn-icon" title="Close editor">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="step-editor-content">
                <div class="editor-row">
                    <div class="editor-field">
                        <label for="stepElement">Element Selector</label>
                        <div class="input-with-button">
                            <input type="text" id="stepElement" class="form-input" placeholder=".class-name or #id">
                            <button id="pickElementBtn" class="btn btn-sm btn-secondary" title="Pick from preview">
                                <i class="fas fa-crosshairs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="editor-field">
                        <label for="stepPosition">Position</label>
                        <select id="stepPosition" class="form-input">
                            <option value="bottom">Bottom</option>
                            <option value="top">Top</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                </div>
                <div class="editor-row">
                    <div class="editor-field">
                        <label for="stepTitle">Title</label>
                        <input type="text" id="stepTitle" class="form-input" placeholder="Step title">
                    </div>
                </div>
                <div class="editor-row">
                    <div class="editor-field full-width">
                        <label for="stepDescription">Description</label>
                        <textarea id="stepDescription" class="form-input" rows="3" placeholder="Step description text"></textarea>
                    </div>
                </div>
                <div class="editor-row">
                    <div class="editor-field">
                        <label>Highlight Shape</label>
                        <button id="editShapeBtn" class="btn btn-secondary">
                            <i class="fas fa-draw-polygon"></i> Edit Shape
                        </button>
                        <span id="shapeStatus" class="field-hint">No custom shape</span>
                    </div>
                    <div class="editor-field">
                        <label>Pre-Step Action</label>
                        <button id="editActionBtn" class="btn btn-secondary">
                            <i class="fas fa-bolt"></i> Configure Action
                        </button>
                        <span id="actionStatus" class="field-hint">No action configured</span>
                    </div>
                </div>
                <div class="editor-actions">
                    <button id="applyStepChanges" class="btn btn-primary">
                        <i class="fas fa-check"></i> Apply Changes
                    </button>
                    <button id="cancelStepChanges" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="deleteStepBtn" class="btn btn-danger">
                        <i class="fas fa-trash"></i> Delete Step
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Shape Editor Modal -->
    <div id="shapeModal" class="modal hidden">
        <div class="modal-content shape-modal">
            <div class="modal-header">
                <h2><i class="fas fa-draw-polygon"></i> Shape Editor</h2>
                <button id="closeShapeModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="shape-tools">
                    <button class="shape-tool active" data-shape="rectangle" title="Rectangle">
                        <i class="fas fa-square"></i>
                    </button>
                    <button class="shape-tool" data-shape="circle" title="Circle">
                        <i class="fas fa-circle"></i>
                    </button>
                    <button class="shape-tool" data-shape="polygon" title="Polygon">
                        <i class="fas fa-draw-polygon"></i>
                    </button>
                    <button class="shape-tool" data-shape="freeform" title="Freeform">
                        <i class="fas fa-pen"></i>
                    </button>
                </div>
                <div class="shape-preview">
                    <canvas id="shapeCanvas" width="500" height="300"></canvas>
                </div>
                <div class="shape-settings">
                    <div class="setting-group">
                        <label>Stroke Color</label>
                        <input type="color" id="strokeColor" value="#4CAF50">
                    </div>
                    <div class="setting-group">
                        <label>Fill Opacity</label>
                        <input type="range" id="fillOpacity" min="0" max="100" value="20">
                        <span id="opacityValue">20%</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="clearShape" class="btn btn-secondary">
                    <i class="fas fa-eraser"></i> Clear
                </button>
                <button id="saveShape" class="btn btn-primary">
                    <i class="fas fa-check"></i> Save Shape
                </button>
            </div>
        </div>
    </div>

    <!-- Action Editor Modal -->
    <div id="actionModal" class="modal hidden">
        <div class="modal-content action-modal">
            <div class="modal-header">
                <h2><i class="fas fa-bolt"></i> Action Configuration</h2>
                <button id="closeActionModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="action-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="enableAction">
                        <span>Execute action before this step</span>
                    </label>
                </div>
                <div class="action-config" id="actionConfig">
                    <div class="action-list" id="actionList">
                        <!-- Actions will be added here -->
                    </div>
                    <button id="addActionBtn" class="btn btn-sm btn-secondary">
                        <i class="fas fa-plus"></i> Add Action
                    </button>
                </div>
                <div class="action-template hidden" id="actionTemplate">
                    <div class="action-item">
                        <div class="action-row">
                            <select class="form-input action-type">
                                <option value="click">Click</option>
                                <option value="dblclick">Double Click</option>
                                <option value="input">Enter Text</option>
                                <option value="scroll">Scroll To</option>
                                <option value="wait">Wait</option>
                            </select>
                            <button class="btn btn-sm btn-icon remove-action" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="action-row">
                            <input type="text" class="form-input action-target" placeholder="CSS Selector">
                            <button class="btn btn-sm btn-secondary pick-action-target" title="Pick element">
                                <i class="fas fa-crosshairs"></i>
                            </button>
                        </div>
                        <div class="action-row action-value-row" style="display: none;">
                            <input type="text" class="form-input action-value" placeholder="Value">
                        </div>
                        <div class="action-row">
                            <label>Delay after (ms):</label>
                            <input type="number" class="form-input action-delay" value="300" min="0" max="5000">
                        </div>
                    </div>
                </div>
                <div class="action-preview">
                    <button id="testActions" class="btn btn-secondary">
                        <i class="fas fa-play"></i> Test Actions
                    </button>
                    <button id="recordActions" class="btn btn-secondary">
                        <i class="fas fa-video"></i> Record Actions
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button id="saveActions" class="btn btn-primary">
                    <i class="fas fa-check"></i> Save Actions
                </button>
                <button id="cancelActions" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Draft Manager Modal -->
    <div id="draftModal" class="modal hidden">
        <div class="modal-content draft-modal">
            <div class="modal-header">
                <h2><i class="fas fa-file-alt"></i> Draft Manager</h2>
                <button id="closeDraftModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="draft-actions">
                    <button id="newDraftBtn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> New Draft
                    </button>
                    <button id="importDraftBtn" class="btn btn-secondary">
                        <i class="fas fa-file-import"></i> Import
                    </button>
                </div>
                <div class="draft-list" id="draftList">
                    <!-- Drafts will be listed here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Publish Confirmation Modal -->
    <div id="publishModal" class="modal hidden">
        <div class="modal-content publish-modal">
            <div class="modal-header">
                <h2><i class="fas fa-upload"></i> Publish Tour</h2>
                <button id="closePublishModal" class="btn-icon"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="publish-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>This will replace the live tour configuration. A backup will be created automatically.</p>
                </div>
                <div class="publish-summary" id="publishSummary">
                    <!-- Changes summary will be shown here -->
                </div>
                <div class="publish-preview">
                    <button id="previewBeforePublish" class="btn btn-secondary">
                        <i class="fas fa-eye"></i> Preview Full Tour
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button id="confirmPublish" class="btn btn-primary">
                    <i class="fas fa-check"></i> Confirm Publish
                </button>
                <button id="cancelPublish" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <!-- Scripts -->
    <script src="utils/dom-selector.js?v=<?php echo localCacheBust('utils/dom-selector.js'); ?>"></script>
    <script src="services/tour-storage.js?v=<?php echo localCacheBust('services/tour-storage.js'); ?>"></script>
    <script src="services/tour-api.js?v=<?php echo localCacheBust('services/tour-api.js'); ?>"></script>
    <script src="components/preview-frame.js?v=<?php echo localCacheBust('components/preview-frame.js'); ?>"></script>
    <script src="components/step-manager.js?v=<?php echo localCacheBust('components/step-manager.js'); ?>"></script>
    <script src="components/shape-overlay.js?v=<?php echo localCacheBust('components/shape-overlay.js'); ?>"></script>
    <script src="components/action-recorder.js?v=<?php echo localCacheBust('components/action-recorder.js'); ?>"></script>
    <script src="components/toolbar.js?v=<?php echo localCacheBust('components/toolbar.js'); ?>"></script>
    <script src="tour-editor-app.js?v=<?php echo localCacheBust('tour-editor-app.js'); ?>"></script>
    <?php endif; ?>
</body>
</html>
