// =================================================================
// DECK BUILDER MODULE - Bob and Mariel Ward School
// Version 4.0 - Card Deck Editor and Manager - FULLY v4.0 COMPATIBLE
// Updated: November 2025 - Fixed for v4.0 manifest structure:
//   1. Per-language card arrays (manifest.cards.ceb[], etc.)
//   2. Direct card properties (word, english, audio as string)
//   3. Shared images via manifest.images[cardNum]
//   4. cardNum instead of wordNum
//   5. Per-language CSV export
// =================================================================

class DeckBuilderModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.currentTrigraph = 'ceb'; // Default language trigraph
        this.currentLanguageName = 'Cebuano';
        this.allCards = [];
        this.filteredCards = [];
        this.editedCards = new Map(); // Track unsaved changes
        this.deletedCards = new Set(); // Track deleted card IDs
        this.newCards = []; // Track new cards
        this.nextNewCardId = 10000; // Temporary IDs for new cards
        
        // Role-based access
        this.userRole = null; // 'admin' or 'voice-recorder'
        this.isAdmin = false;
        
        // Sorting state
        this.sortColumn = 'lesson'; // Default sort by lesson
        this.sortDirection = 'asc'; // Default ascending
        
        // Language name to trigraph mapping
        this.langNameToTrigraph = {
            'cebuano': 'ceb',
            'english': 'eng',
            'maranao': 'mrw',
            'sinama': 'sin'
        };
        
        this.trigraphToLangName = {
            'ceb': 'Cebuano',
            'eng': 'English',
            'mrw': 'Maranao',
            'sin': 'Sinama'
        };
    }
    
    async render() {
        // Check user role - Roles: admin > deck-manager > editor > voice-recorder
        this.userRole = window.authManager?.role || 'admin';
        this.isAdmin = this.userRole === 'admin';
        this.isDeckManager = this.userRole === 'deck-manager';
        this.isEditor = this.userRole === 'editor';
        this.isRecorder = this.userRole === 'voice-recorder';

        // Language restriction (null = no restriction, otherwise trigraph like 'ceb')
        this.languageRestriction = window.authManager?.getLanguageRestriction?.() || null;
        this.restrictedLanguageName = this.languageRestriction
            ? (window.authManager?.getLanguageName?.(this.languageRestriction) || this.languageRestriction)
            : null;

        // Permission flags
        this.canEditCards = this.isAdmin || this.isDeckManager || this.isEditor; // Can add/delete/edit cards
        this.canAccessToolSections = this.isAdmin || this.isDeckManager; // Can see CSV, Media, Sentence, Grammar sections

        // CSS classes for hiding elements
        const toolSectionsClass = this.canAccessToolSections ? '' : 'hidden'; // For tool sections
        const editButtonsClass = this.canEditCards ? '' : 'hidden'; // For add/delete/save buttons

        // Role indicator badge (include language if restricted)
        let roleIndicator = '';
        if (this.isDeckManager) {
            roleIndicator = '<span class="role-badge deck-manager"><i class="fas fa-user-tie"></i> Deck Manager</span>';
        } else if (this.isEditor) {
            const langSuffix = this.restrictedLanguageName ? ` - ${this.restrictedLanguageName}` : '';
            roleIndicator = `<span class="role-badge editor"><i class="fas fa-edit"></i> Editor${langSuffix}</span>`;
        } else if (this.isRecorder) {
            const langSuffix = this.restrictedLanguageName ? ` - ${this.restrictedLanguageName}` : '';
            roleIndicator = `<span class="role-badge voice-recorder"><i class="fas fa-microphone"></i> Recorder${langSuffix}</span>`;
        }
        
        this.container.innerHTML = `
            <div class="card module-deck-builder">
                <div class="deck-header">
                    <div class="deck-title">
                        <h1>
                            <i class="fas fa-layer-group"></i>
                            Deck Builder
                            ${roleIndicator}
                        </h1>
                        <p class="deck-description">Create, edit, and manage your language learning cards</p>
                    </div>
                    <div class="deck-actions">
                        <button id="addCardBtn" class="btn btn-success ${editButtonsClass}">
                            <i class="fas fa-plus"></i> Add New Card
                        </button>
                        <button id="saveChangesBtn" class="btn btn-primary ${editButtonsClass}" disabled>
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button id="exportCSVBtn" class="btn btn-secondary">
                            <i class="fas fa-download"></i> Export CSV
                        </button>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="deck-summary" id="deckSummary">
                    <div class="summary-grid">
                        <div class="stat-box">
                            <div class="number" id="statTotal">0</div>
                            <div class="label">Total Cards</div>
                        </div>
                        <div class="stat-box">
                            <div class="number" id="statComplete">0</div>
                            <div class="label">Complete</div>
                        </div>
                        <div class="stat-box">
                            <div class="number" id="statMissing">0</div>
                            <div class="label">Missing Assets</div>
                        </div>
                        <div class="stat-box">
                            <div class="number" id="statNew">0</div>
                            <div class="label">New Words</div>
                        </div>
                    </div>
                </div>

                <!-- CSV Data Management Section (Admin and Deck Manager only) -->
                <div class="deck-section collapsible collapsed ${toolSectionsClass}" id="csvManagementSection" data-section="csv">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-sync-alt"></i> CSV Data Management
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
                        <div class="section-card">
                        <p class="section-description">
                            Upload and process your Language List and Word List CSV files. In v4.0, each language has its own Word List file.
                        </p>

                        <div class="csv-upload-section">
                            <div class="upload-options">
                                <label style="font-weight:600;margin-bottom:12px;display:block;color:var(--text-primary);">What do you want to update?</label>
                                <div class="radio-group">
                                    <label class="radio-option">
                                        <input type="radio" name="deckUpdateType" value="both" checked>
                                        <span>Both Lists (Language + Word)</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="deckUpdateType" value="language">
                                        <span>Language List Only</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="deckUpdateType" value="word">
                                        <span>Word Lists Only</span>
                                    </label>
                                </div>
                            </div>

                            <div class="file-upload-container" id="deckLanguageUploadContainer">
                                <label class="file-upload-label">
                                    <i class="fas fa-language"></i> Language List CSV
                                    <span class="file-hint">Expected: 3 columns (ID, Name, Trigraph)</span>
                                </label>
                                <input type="file" id="deckLanguageFileInput" accept=".csv" class="file-input">
                                <div class="file-status" id="deckLanguageFileStatus">No file selected</div>
                            </div>

                            <div id="deckWordUploadContainer">
                                <label class="file-upload-label" style="margin-bottom:16px;">
                                    <i class="fas fa-list"></i> Word List CSVs (per language)
                                    <span class="file-hint">v4.0: Each language has its own word list file</span>
                                </label>
                                <div class="language-uploads" id="deckWordFileInputs">
                                    <!-- Will be populated dynamically -->
                                </div>
                            </div>
                        </div>

                        <div class="section-actions">
                            <button id="deckUploadProcessBtn" class="btn btn-primary btn-lg" disabled>
                                <i class="fas fa-upload"></i> Upload & Process
                            </button>
                            <button id="deckScanAssetsBtn" class="btn btn-secondary">
                                <i class="fas fa-sync"></i> Rescan Assets Only
                            </button>
                        </div>
                        <p class="section-hint">
                            <i class="fas fa-info-circle"></i> Upload CSVs first, then the system will scan for matching images/audio files
                        </p>
                        </div>
                    </div>
                </div>

                <!-- Media Files Upload Section (Admin and Deck Manager only) -->
                <div class="deck-section collapsible collapsed ${toolSectionsClass}" id="mediaUploadSection" data-section="media">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-photo-video"></i> Media Files Upload
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
                        <div class="section-card">
                            <p class="section-description">
                                Upload image/video files (PNG/JPG/WebP/GIF/MP4/WebM) and audio files (MP3/M4A) for your words. Files must follow the naming convention.
                            </p>

                        <div class="csv-upload-section">
                            <div class="file-upload-container">
                                <label class="file-upload-label">
                                    <i class="fas fa-images"></i> Image Files (PNG/JPG/WebP/GIF/MP4/WebM)
                                    <span class="file-hint">Format: WordNum.word.translation.ext (e.g., 17.tilaw.taste.png)</span>
                                </label>
                                <input type="file" id="deckImageFilesInput" accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm" multiple class="file-input">
                                <div class="file-status" id="deckImageFilesStatus">No files selected</div>
                            </div>

                            <div class="file-upload-container">
                                <label class="file-upload-label">
                                    <i class="fas fa-music"></i> Audio Files (MP3/M4A)
                                    <span class="file-hint">Format: WordNum.trigraph.word.mp3/m4a (e.g., 17.ceb.tilaw.m4a)</span>
                                </label>
                                <input type="file" id="deckAudioFilesInput" accept=".mp3,.m4a" multiple class="file-input">
                                <div class="file-status" id="deckAudioFilesStatus">No files selected</div>
                            </div>
                        </div>

                            <div class="section-actions">
                                <button id="deckUploadMediaBtn" class="btn btn-primary" disabled>
                                    <i class="fas fa-cloud-upload-alt"></i> Upload Media Files
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sentence Words Upload Section (Admin and Deck Manager only) -->
                <div class="deck-section collapsible collapsed ${toolSectionsClass}" id="sentenceWordsSection" data-section="sentence">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-bars-staggered"></i> Sentence Builder Data
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
                        <!-- Tab Navigation -->
                    <div class="sentence-words-tabs">
                        <button class="sw-tab-btn active" data-tab="upload">
                            <i class="fas fa-upload"></i> Upload CSV
                        </button>
                        <button class="sw-tab-btn" data-tab="editor">
                            <i class="fas fa-edit"></i> Edit Words
                        </button>
                    </div>

                    <!-- Upload Tab Content -->
                    <div class="sw-tab-content active" id="swUploadTab">
                        <div class="section-card">
                            <p class="section-description">
                                Upload Sentence Words CSV files for the Sentence Builder module. Each language has its own file.
                                Format: First column is "Lesson #", other columns are word types (Verb, Noun, etc.) containing comma-separated words.
                            </p>

                            <div class="csv-upload-section">
                                <div id="sentenceWordFileInputs" class="language-uploads">
                                    <!-- Will be populated dynamically -->
                                </div>
                            </div>

                            <div class="section-actions">
                                <button id="uploadSentenceWordsBtn" class="btn btn-primary" disabled>
                                    <i class="fas fa-upload"></i> Upload Sentence Words
                                </button>
                            </div>
                            <p class="section-hint">
                                <i class="fas fa-exclamation-triangle"></i> All words in the CSV must exist in the Word Lists. Invalid words will cause the upload to fail.
                            </p>
                        </div>
                    </div>

                    <!-- Editor Tab Content -->
                    <div class="sw-tab-content" id="swEditorTab">
                        <div class="section-card">
                            <div class="sw-editor-controls">
                                <div class="sw-editor-selects">
                                    <div class="filter-group">
                                        <label for="swEditorLanguage">
                                            <i class="fas fa-language"></i> Language:
                                        </label>
                                        <select id="swEditorLanguage" class="select-control">
                                            <option value="">Select Language</option>
                                        </select>
                                    </div>
                                    <div class="filter-group">
                                        <label for="swEditorLesson">
                                            <i class="fas fa-bookmark"></i> Lesson:
                                        </label>
                                        <select id="swEditorLesson" class="select-control">
                                            <option value="">Select Lesson</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="sw-editor-actions">
                                    <button id="swAddWordType" class="btn btn-secondary" disabled>
                                        <i class="fas fa-plus"></i> Add Word Type
                                    </button>
                                    <button id="swSaveChanges" class="btn btn-primary" disabled>
                                        <i class="fas fa-save"></i> Save Changes
                                    </button>
                                </div>
                            </div>

                            <div id="swEditorContent" class="sw-editor-content">
                                <div class="sw-editor-empty">
                                    <i class="fas fa-hand-pointer"></i>
                                    <p>Select a language and lesson to edit sentence words</p>
                                </div>
                            </div>

                            <!-- Card Preview Tooltip -->
                            <div id="swCardPreview" class="sw-card-preview hidden">
                                <div class="sw-preview-image"></div>
                                <div class="sw-preview-info">
                                    <div class="sw-preview-word"></div>
                                    <div class="sw-preview-english"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                <!-- Grammar Files Management Section (Admin and Deck Manager only) -->
                <div class="deck-section collapsible collapsed ${toolSectionsClass}" id="grammarManagementSection" data-section="grammar">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-book-open"></i> Grammar Files Management
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
                        <div class="section-card">
                        <p class="section-description">
                            Upload HTML grammar files for each lesson. Files can be exported from Word as "Web Page, Filtered" or converted using the <a href="converter/" target="_blank">Converter</a>.
                        </p>

                        <div class="csv-upload-section">
                            <div class="grammar-upload-row">
                                <div class="filter-group">
                                    <label for="grammarLanguageSelect">
                                        <i class="fas fa-language"></i> Language:
                                    </label>
                                    <select id="grammarLanguageSelect" class="select-control">
                                        <option value="ceb">Cebuano</option>
                                        <option value="mrw">Maranao</option>
                                        <option value="sin">Sinama</option>
                                    </select>
                                </div>

                                <div class="filter-group">
                                    <label for="grammarLessonInput">
                                        <i class="fas fa-bookmark"></i> Lesson:
                                    </label>
                                    <input type="number" id="grammarLessonInput" class="form-input" placeholder="Lesson #" min="1" style="width: 100px;">
                                </div>
                            </div>

                            <div class="file-upload-container">
                                <label class="file-upload-label">
                                    <i class="fas fa-file-code"></i> Grammar HTML File
                                    <span class="file-hint">HTML/HTM file exported from Word or converted from DOCX</span>
                                </label>
                                <input type="file" id="grammarFileInput" accept=".html,.htm" class="file-input">
                                <div class="file-status" id="grammarFileStatus">No file selected</div>
                            </div>
                        </div>

                        <div class="section-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button id="uploadGrammarBtn" class="btn btn-primary" disabled>
                                <i class="fas fa-cloud-upload-alt"></i> Upload Grammar File
                            </button>
                            <button id="grammarReportBtn" class="btn btn-secondary">
                                <i class="fas fa-chart-bar"></i> Grammar Coverage Report
                            </button>
                        </div>

                        <!-- Grammar Report Display Area -->
                        <div id="grammarReportContainer" class="grammar-report-container hidden">
                            <div class="grammar-report-header">
                                <h4><i class="fas fa-chart-pie"></i> Grammar Coverage Report</h4>
                                <button id="closeGrammarReport" class="btn btn-sm btn-secondary">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div id="grammarReportContent"></div>
                        </div>
                        </div>
                    </div>
                </div>

                <!-- Card Data Section (Collapsible) -->
                <div class="deck-section collapsible" id="cardDataSection" data-section="cardData">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-table"></i> Card Data
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">

                <!-- Legend -->
                <div class="deck-legend">
                    <strong>Status Legend:</strong>
                    <span class="legend-item"><span class="status status-complete-animated">Complete (Animated)</span> - PNG + GIF + Audio</span>
                    <span class="legend-item"><span class="status status-complete-static">Complete (Static)</span> - PNG + Audio</span>
                    <span class="legend-item"><span class="status status-partial">Partial</span> - Some assets</span>
                    <span class="legend-item"><span class="status status-missing">Missing</span> - No assets</span>
                    <span class="legend-item"><span class="type-badge new">N</span> - New Word</span>
                    <span class="legend-item"><span class="type-badge review">R</span> - Review</span>
                </div>

                <!-- Filter Controls Bar (above table) -->
                <div class="deck-controls">
                    <div class="filter-group">
                        <label for="languageFilter">
                            <i class="fas fa-language"></i> Language:
                        </label>
                        <select id="languageFilter" class="select-control" ${this.languageRestriction ? 'disabled' : ''}>
                            <option value="ceb" ${this.languageRestriction === 'ceb' ? 'selected' : ''}>Cebuano</option>
                            <option value="mrw" ${this.languageRestriction === 'mrw' ? 'selected' : ''}>Maranao</option>
                            <option value="sin" ${this.languageRestriction === 'sin' ? 'selected' : ''}>Sinama</option>
                        </select>
                        ${this.languageRestriction ? '<span class="language-locked-hint" title="Language restricted based on your role"><i class="fas fa-lock"></i></span>' : ''}
                    </div>

                    <div class="filter-group">
                        <label for="lessonFilterFrom">
                            <i class="fas fa-filter"></i> Lesson:
                        </label>
                        <input type="number" id="lessonFilterFrom" class="form-input lesson-range-input" placeholder="From" min="1">
                        <span style="color: var(--text-secondary);">-</span>
                        <input type="number" id="lessonFilterTo" class="form-input lesson-range-input" placeholder="To" min="1">
                        <button id="clearLessonFilter" class="btn btn-sm btn-secondary" title="Clear lesson filter">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="filter-group search-group">
                        <label for="searchCards">
                            <i class="fas fa-search"></i>
                        </label>
                        <input type="text" id="searchCards" class="form-input" placeholder="Search words...">
                    </div>

                    <button id="addCardBtnTop" class="btn btn-success ${editButtonsClass}">
                        <i class="fas fa-plus"></i> Add New Card
                    </button>

                    <div class="stats-mini">
                        <span id="cardCount">0 cards</span>
                        <span id="unsavedCount" class="unsaved-indicator hidden ${editButtonsClass}">0 unsaved</span>
                    </div>
                </div>

                <!-- Card Table -->
                <div class="deck-table-container">
                    <table class="deck-table" id="deckTable">
                        <thead>
                            <tr>
                                ${!this.isRecorder ? '<th style="width: 70px;">Actions</th>' : ''}
                                ${!this.isRecorder ? '<th style="width: 50px;">Type</th>' : ''}
                                <th style="width: 60px;" class="sortable-header" data-sort="cardNum">
                                    Card # <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable-header word-column" data-sort="word" id="langHeader">
                                    Cebuano <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable-header word-column" data-sort="english">
                                    English <i class="fas fa-sort sort-icon"></i>
                                </th>
                                ${!this.isRecorder ? '<th style="width: 85px;">Categories</th>' : ''}
                                ${!this.isRecorder ? '<th style="width: 140px;">Picture (PNG)</th>' : ''}
                                ${!this.isRecorder ? '<th style="width: 90px;">Animated (GIF)</th>' : ''}
                                <th style="width: 140px;">Audio</th>
                                ${!this.isRecorder ? `<th style="width: 100px;" class="sortable-header" data-sort="status">
                                    Status <i class="fas fa-sort sort-icon"></i>
                                </th>` : ''}
                            </tr>
                        </thead>
                        <tbody id="deckTableBody">
                            <!-- Cards will be populated here -->
                        </tbody>
                    </table>
                </div>

                <!-- Add New Card Button (Bottom) -->
                <div style="margin: 16px 0; text-align: center;" class="${editButtonsClass}">
                    <button id="addCardBtnBottom" class="btn btn-success">
                        <i class="fas fa-plus"></i> Add New Card
                    </button>
                </div>

                    </div>
                </div>

                <!-- Empty State -->
                <div class="empty-state" id="emptyState" style="display:none;">
                    <i class="fas fa-layer-group"></i>
                    <h2>No Cards Found</h2>
                    <p>Click "Add New Card" to create your first card, or check your filters.</p>
                </div>
            </div>

            <!-- Categories Editor Modal -->
            <div id="categoriesModal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-tags"></i> Edit Categories - Card #<span id="catModalCardNum"></span></h2>
                        <button id="closeCategoriesModal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-book"></i> Grammar
                            </label>
                            <input type="text" id="catGrammar" class="form-input" placeholder="e.g., noun, verb, adjective">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-folder"></i> Category
                            </label>
                            <input type="text" id="catCategory" class="form-input" placeholder="e.g., food, animals, colors">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-folder-open"></i> SubCategory 1
                            </label>
                            <input type="text" id="catSubCategory1" class="form-input" placeholder="e.g., fruits, vegetables">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-folder-open"></i> SubCategory 2
                            </label>
                            <input type="text" id="catSubCategory2" class="form-input" placeholder="Optional second subcategory">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-graduation-cap"></i> ACTFL Est
                            </label>
                            <input type="text" id="catACTFLEst" class="form-input" placeholder="e.g., Novice Low, Intermediate Mid">
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button id="saveCategoriesBtn" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Categories
                        </button>
                        <button id="cancelCategoriesBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Notes Editor Modal -->
            <div id="notesModal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-sticky-note"></i> <span id="notesModalTitle">Edit Note</span> - Card #<span id="notesModalCardNum"></span></h2>
                        <button id="closeNotesModal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-comment"></i> Note
                            </label>
                            <textarea id="notesTextarea" class="form-input" rows="4" placeholder="Enter note for this word..."></textarea>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button id="saveNotesBtn" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Note
                        </button>
                        <button id="clearNotesBtn" class="btn btn-warning">
                            <i class="fas fa-eraser"></i> Clear Note
                        </button>
                        <button id="cancelNotesBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async init() {
        // Store global reference for inline event handlers
        window.deckBuilder = this;

        // If language restricted, force currentTrigraph to restricted language
        if (this.languageRestriction) {
            this.currentTrigraph = this.languageRestriction;
        }

        // Load cards for current language from v4.0 manifest structure
        this.loadCardsForLanguage(this.currentTrigraph);

        if (this.allCards.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.querySelector('.deck-table-container').style.display = 'none';
        }

        // Setup event listeners
        this.setupEventListeners();

        // Setup collapsible sections
        this.setupCollapsibleSections();

        // Setup CSV, Media, and Grammar upload (admin and deck-manager)
        if (this.canAccessToolSections) {
            this.setupCSVUpload();
            this.setupMediaUpload();
            this.setupSentenceWordsUpload();
            this.setupSentenceWordsEditor();
            this.setupGrammarUpload();
        }

        // Initial render (will apply default sort)
        this.filterAndRenderCards();

        // Update stats
        this.updateStats();

        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'deck-builder',
                'Deck Builder Guide',
                'Edit cards directly in the table by clicking on cells. Click on file badges to upload new images or audio. Use "Add New Card" to create cards, "Categories" button to edit grammar/category fields, and "Save Changes" to update the manifest. Click column headers to sort. Use the notes icon to add notes to words.'
            );
        }
    }

    /**
     * Load cards for a specific language from v4.0 manifest
     */
    loadCardsForLanguage(trigraph) {
        this.currentTrigraph = trigraph;
        this.currentLanguageName = this.trigraphToLangName[trigraph] || 'Unknown';
        
        // Access manifest - handle both v4.0 (per-language) and v3.x (flat array) structures
        const manifest = this.assets.manifest;
        
        if (!manifest) {
            this.allCards = [];
            debugLogger?.log(1, 'No manifest loaded');
            return;
        }
        
        // v4.0 structure: manifest.cards is object with trigraph keys
        if (manifest.cards && typeof manifest.cards === 'object' && !Array.isArray(manifest.cards)) {
            this.allCards = manifest.cards[trigraph] || [];
            debugLogger?.log(2, `Loaded ${this.allCards.length} cards for ${this.currentLanguageName} (v4.0 format)`);
        } 
        // v3.x structure: manifest.cards is flat array
        else if (Array.isArray(manifest.cards)) {
            this.allCards = manifest.cards;
            debugLogger?.log(2, `Loaded ${this.allCards.length} cards (v3.x flat format)`);
        }
        // Fallback to AssetManager.cards
        else if (Array.isArray(this.assets.cards)) {
            this.allCards = this.assets.cards;
            debugLogger?.log(2, `Loaded ${this.allCards.length} cards from AssetManager`);
        }
        else {
            this.allCards = [];
            debugLogger?.log(1, 'Could not load cards - unknown manifest structure');
        }
        
        // Merge shared images from manifest.images if available
        if (manifest.images) {
            this.allCards = this.allCards.map(card => {
                const cardNum = String(card.cardNum || card.wordNum);
                const imageData = manifest.images[cardNum];
                if (imageData) {
                    return {
                        ...card,
                        printImagePath: card.printImagePath || imageData.png || null,
                        hasGif: card.hasGif || !!imageData.gif,
                        gifPath: imageData.gif || null
                    };
                }
                return card;
            });
        }
    }

    /**
     * Sorting comparison function
     */
    sortCards(cards) {
        return cards.sort((a, b) => {
            let aVal, bVal;
            
            switch (this.sortColumn) {
                case 'lesson':
                    aVal = a.lesson || 0;
                    bVal = b.lesson || 0;
                    break;
                case 'cardNum':
                    aVal = a.cardNum || a.wordNum || 0;
                    bVal = b.cardNum || b.wordNum || 0;
                    break;
                case 'word':
                    aVal = this.getCardWord(a).toLowerCase();
                    bVal = this.getCardWord(b).toLowerCase();
                    break;
                case 'english':
                    aVal = this.getCardEnglish(a).toLowerCase();
                    bVal = this.getCardEnglish(b).toLowerCase();
                    break;
                case 'status':
                    // Sort by status priority: complete-animated > complete-static > partial > missing
                    const statusOrder = {
                        'status-complete-animated': 1,
                        'status-complete-static': 2,
                        'status-partial': 3,
                        'status-missing': 4
                    };
                    aVal = statusOrder[this.getStatusClass(a)] || 5;
                    bVal = statusOrder[this.getStatusClass(b)] || 5;
                    break;
                default:
                    aVal = a.lesson || 0;
                    bVal = b.lesson || 0;
            }
            
            if (typeof aVal === 'string') {
                const comparison = aVal.localeCompare(bVal);
                return this.sortDirection === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aVal - bVal;
                return this.sortDirection === 'asc' ? comparison : -comparison;
            }
        });
    }

    /**
     * Handle column header click for sorting
     */
    handleSortClick(column) {
        if (this.sortColumn === column) {
            // Toggle direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, default to ascending
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        // Update header icons
        this.updateSortIcons();
        
        // Re-render table
        this.filterAndRenderCards();
    }

    /**
     * Update sort icons in header
     */
    updateSortIcons() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            const column = header.dataset.sort;
            
            if (column === this.sortColumn) {
                icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon active`;
            } else {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
    }

    /**
     * Setup collapsible sections with localStorage persistence
     */
    setupCollapsibleSections() {
        const sections = this.container.querySelectorAll('.deck-section.collapsible');
        const storageKey = 'deckBuilder_collapsedSections';

        // Load saved state from localStorage
        let savedState = {};
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                savedState = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load collapsed sections state:', e);
        }

        sections.forEach(section => {
            const sectionId = section.dataset.section;
            const title = section.querySelector('.section-title');

            if (!title || !sectionId) return;

            // Apply saved state (default to collapsed if no saved state)
            if (savedState[sectionId] === false) {
                section.classList.remove('collapsed');
            }
            // Note: sections start collapsed by default via HTML class

            // Click handler
            title.addEventListener('click', () => {
                this.toggleSection(section, storageKey);
            });

            // Keyboard accessibility (Enter/Space to toggle)
            title.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleSection(section, storageKey);
                }
            });
        });
    }

    /**
     * Toggle a collapsible section and save state
     */
    toggleSection(section, storageKey) {
        const sectionId = section.dataset.section;
        const isCollapsed = section.classList.toggle('collapsed');

        // Save state to localStorage
        try {
            let savedState = {};
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                savedState = JSON.parse(saved);
            }
            savedState[sectionId] = isCollapsed;
            localStorage.setItem(storageKey, JSON.stringify(savedState));
        } catch (e) {
            console.warn('Could not save collapsed sections state:', e);
        }
    }

    setupEventListeners() {
        // Language filter - now uses trigraph values
        document.getElementById('languageFilter').addEventListener('change', (e) => {
            const trigraph = e.target.value;
            this.loadCardsForLanguage(trigraph);
            // Update language header text (remove sort icon text)
            const langHeader = document.getElementById('langHeader');
            langHeader.innerHTML = `${this.currentLanguageName} <i class="fas fa-sort sort-icon"></i>`;
            this.updateSortIcons();
            this.filterAndRenderCards();
            this.updateStats();
        });

        // Lesson range filters
        document.getElementById('lessonFilterFrom').addEventListener('input', () => {
            this.filterAndRenderCards();
        });
        
        document.getElementById('lessonFilterTo').addEventListener('input', () => {
            this.filterAndRenderCards();
        });
        
        // Clear lesson filter button
        document.getElementById('clearLessonFilter').addEventListener('click', () => {
            document.getElementById('lessonFilterFrom').value = '';
            document.getElementById('lessonFilterTo').value = '';
            this.filterAndRenderCards();
        });

        // Search
        document.getElementById('searchCards').addEventListener('input', () => {
            this.filterAndRenderCards();
        });

        // Sortable headers
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                this.handleSortClick(header.dataset.sort);
            });
        });

        // Add card - THREE buttons
        document.getElementById('addCardBtn').addEventListener('click', () => {
            this.addNewCard();
        });
        
        document.getElementById('addCardBtnTop').addEventListener('click', () => {
            this.addNewCard();
        });
        
        document.getElementById('addCardBtnBottom').addEventListener('click', () => {
            this.addNewCard();
        });

        // Save changes
        document.getElementById('saveChangesBtn').addEventListener('click', () => {
            this.saveChanges();
        });

        // Export CSV
        document.getElementById('exportCSVBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Categories modal
        document.getElementById('closeCategoriesModal').addEventListener('click', () => {
            this.closeCategoriesModal();
        });

        document.getElementById('cancelCategoriesBtn').addEventListener('click', () => {
            this.closeCategoriesModal();
        });

        document.getElementById('saveCategoriesBtn').addEventListener('click', () => {
            this.saveCategoriesData();
        });

        // Notes modal
        document.getElementById('closeNotesModal').addEventListener('click', () => {
            this.closeNotesModal();
        });

        document.getElementById('cancelNotesBtn').addEventListener('click', () => {
            this.closeNotesModal();
        });

        document.getElementById('saveNotesBtn').addEventListener('click', () => {
            this.saveNotesData();
        });

        document.getElementById('clearNotesBtn').addEventListener('click', () => {
            document.getElementById('notesTextarea').value = '';
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const categoriesModal = document.getElementById('categoriesModal');
                if (categoriesModal && !categoriesModal.classList.contains('hidden')) {
                    this.closeCategoriesModal();
                }
                const notesModal = document.getElementById('notesModal');
                if (notesModal && !notesModal.classList.contains('hidden')) {
                    this.closeNotesModal();
                }
            }
        });
        
        // Update sort icons initially
        this.updateSortIcons();
    }

    filterAndRenderCards() {
        const lessonFrom = parseInt(document.getElementById('lessonFilterFrom').value) || null;
        const lessonTo = parseInt(document.getElementById('lessonFilterTo').value) || null;
        const searchTerm = document.getElementById('searchCards').value.toLowerCase();

        this.filteredCards = this.allCards.filter(card => {
            // Get card ID (support both v4.0 cardNum and v3.x wordNum)
            const cardId = card.cardNum || card.wordNum;
            
            // Skip deleted cards
            if (this.deletedCards.has(cardId)) return false;

            // Lesson range filter
            if (lessonFrom !== null && card.lesson < lessonFrom) {
                return false;
            }
            if (lessonTo !== null && card.lesson > lessonTo) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const wordText = this.getCardWord(card).toLowerCase();
                const englishText = this.getCardEnglish(card).toLowerCase();
                if (!wordText.includes(searchTerm) && !englishText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        // Include new cards
        const newCardsFiltered = this.newCards.filter(card => {
            if (lessonFrom !== null && card.lesson < lessonFrom) {
                return false;
            }
            if (lessonTo !== null && card.lesson > lessonTo) {
                return false;
            }
            if (searchTerm) {
                const wordText = this.getCardWord(card).toLowerCase();
                const englishText = this.getCardEnglish(card).toLowerCase();
                if (!wordText.includes(searchTerm) && !englishText.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });

        this.filteredCards = [...this.filteredCards, ...newCardsFiltered];
        
        // Apply sorting
        this.filteredCards = this.sortCards(this.filteredCards);

        // Update card count
        document.getElementById('cardCount').textContent = `${this.filteredCards.length} cards`;

        // Render table
        this.renderTable();

        // Show/hide empty state
        if (this.filteredCards.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.querySelector('.deck-table-container').style.display = 'none';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            document.querySelector('.deck-table-container').style.display = 'block';
        }
    }

    renderTable() {
        const tbody = document.getElementById('deckTableBody');
        tbody.innerHTML = '';

        // Group cards by lesson
        const lessonGroups = new Map();
        this.filteredCards.forEach(card => {
            const lesson = card.lesson || 0;
            if (!lessonGroups.has(lesson)) {
                lessonGroups.set(lesson, []);
            }
            lessonGroups.get(lesson).push(card);
        });

        // Sort lessons numerically
        const sortedLessons = Array.from(lessonGroups.keys()).sort((a, b) => a - b);

        // Load collapsed state from localStorage
        const storageKey = 'deckBuilder_collapsedLessons';
        let collapsedLessons = {};
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                collapsedLessons = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load collapsed lessons state:', e);
        }

        // Render each lesson group
        sortedLessons.forEach(lesson => {
            const cards = lessonGroups.get(lesson);
            const isCollapsed = collapsedLessons[lesson] !== false; // Default to collapsed

            // Create lesson header row
            const headerRow = document.createElement('tr');
            headerRow.className = `lesson-header-row ${isCollapsed ? 'collapsed' : ''}`;
            headerRow.dataset.lesson = lesson;

            const headerCell = document.createElement('td');
            // Dynamic colspan: recorder has 4 columns, others have 10
            headerCell.colSpan = this.isRecorder ? 4 : 10;
            headerCell.className = 'lesson-header-cell';
            headerCell.innerHTML = `
                <div class="lesson-header">
                    <i class="fas fa-chevron-right lesson-chevron"></i>
                    <span class="lesson-title">Lesson ${lesson}</span>
                    <span class="lesson-count">${cards.length} card${cards.length !== 1 ? 's' : ''}</span>
                </div>
            `;

            // Add click handler for expand/collapse
            headerCell.addEventListener('click', () => {
                this.toggleLessonGroup(lesson, headerRow, storageKey);
            });

            headerRow.appendChild(headerCell);
            tbody.appendChild(headerRow);

            // Create card rows for this lesson
            cards.forEach(card => {
                const row = this.createCardRow(card);
                row.classList.add('lesson-card-row');
                row.dataset.lesson = lesson;
                if (isCollapsed) {
                    row.classList.add('hidden');
                }
                tbody.appendChild(row);
            });
        });
    }

    toggleLessonGroup(lesson, headerRow, storageKey) {
        const isCollapsed = headerRow.classList.toggle('collapsed');
        const tbody = document.getElementById('deckTableBody');

        // Toggle visibility of card rows for this lesson
        const cardRows = tbody.querySelectorAll(`.lesson-card-row[data-lesson="${lesson}"]`);
        cardRows.forEach(row => {
            row.classList.toggle('hidden', isCollapsed);
        });

        // Save state to localStorage
        try {
            let collapsedLessons = {};
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                collapsedLessons = JSON.parse(saved);
            }
            collapsedLessons[lesson] = isCollapsed;
            localStorage.setItem(storageKey, JSON.stringify(collapsedLessons));
        } catch (e) {
            console.warn('Could not save collapsed lessons state:', e);
        }
    }

    createCardRow(card) {
        const row = document.createElement('tr');
        // Support both cardNum (v4.0) and wordNum (v3.x)
        const cardId = parseInt(card.cardNum || card.wordNum) || 0;
        row.dataset.cardId = cardId;

        const isNewCard = cardId >= this.nextNewCardId - 1000;
        const isEdited = this.editedCards.has(cardId);

        if (isNewCard || isEdited) {
            row.classList.add('edited-row');
        }

        // Permission-based attributes
        const canEdit = this.canEditCards; // admin, deck-manager, editor
        const disabledAttr = canEdit ? '' : 'disabled';
        const readonlyClass = canEdit ? '' : 'readonly-field';

        // Voice recorder sees limited columns only
        const isRecorderOnly = this.isRecorder;

        // Actions (moved to first column) - hidden for recorder
        if (!isRecorderOnly) {
            const actionsCell = document.createElement('td');
            if (canEdit) {
                actionsCell.innerHTML = `
                    <div class="actions-cell">
                        <button class="btn-icon add-below-btn" data-card-id="${cardId}" title="Add Card Below">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon delete-card-btn" data-card-id="${cardId}" title="Delete Card">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            } else {
                actionsCell.innerHTML = `<span class="text-muted">-</span>`;
            }
            row.appendChild(actionsCell);
        }

        // Type - hidden for recorder
        if (!isRecorderOnly) {
            const typeCell = document.createElement('td');
            typeCell.innerHTML = `
                <select class="cell-select ${readonlyClass}" data-field="type" data-card-id="${cardId}" ${disabledAttr}>
                    <option value="N" ${card.type === 'N' ? 'selected' : ''}>N</option>
                    <option value="R" ${card.type === 'R' ? 'selected' : ''}>R</option>
                </select>
            `;
            row.appendChild(typeCell);
        }

        // Card # - visible for all (read-only for recorder)
        const cardNumCell = document.createElement('td');
        cardNumCell.innerHTML = `<input type="number" class="cell-input card-num-input ${readonlyClass}" value="${cardId}"
            data-field="cardNum" data-card-id="${cardId}" data-original-id="${cardId}" min="1" ${disabledAttr}>`;
        row.appendChild(cardNumCell);

        // Language word (editable) with notes icon - visible for all (read-only for recorder)
        const langWord = this.getCardWord(card);
        const hasWordNote = !!(card.wordNote && card.wordNote.trim());
        const langCell = document.createElement('td');
        langCell.className = 'word-column';
        langCell.innerHTML = `
            <div class="word-cell-container">
                <input type="text" class="cell-input word-input ${readonlyClass}" value="${langWord}"
                    data-field="word" data-card-id="${cardId}" ${disabledAttr}>
                <button class="notes-btn ${hasWordNote ? 'has-note' : ''} ${canEdit ? '' : 'hidden'}" data-card-id="${cardId}" data-note-type="word" title="${hasWordNote ? 'Edit note' : 'Add note'}">
                    <i class="fas fa-sticky-note"></i>
                    ${hasWordNote ? '<i class="fas fa-check note-check"></i>' : ''}
                </button>
            </div>
        `;
        row.appendChild(langCell);

        // English translation (editable) with notes icon - visible for all (read-only for recorder)
        const engWord = this.getCardEnglish(card);
        const hasEngNote = !!(card.englishNote && card.englishNote.trim());
        const engCell = document.createElement('td');
        engCell.className = 'word-column';
        engCell.innerHTML = `
            <div class="word-cell-container">
                <input type="text" class="cell-input word-input ${readonlyClass}" value="${engWord}"
                    data-field="english" data-card-id="${cardId}" ${disabledAttr}>
                <button class="notes-btn ${hasEngNote ? 'has-note' : ''} ${canEdit ? '' : 'hidden'}" data-card-id="${cardId}" data-note-type="english" title="${hasEngNote ? 'Edit note' : 'Add note'}">
                    <i class="fas fa-sticky-note"></i>
                    ${hasEngNote ? '<i class="fas fa-check note-check"></i>' : ''}
                </button>
            </div>
        `;
        row.appendChild(engCell);

        // Categories button - hidden for recorder
        if (!isRecorderOnly) {
            const categoriesCell = document.createElement('td');
            categoriesCell.innerHTML = `
                <button class="btn btn-sm btn-secondary categories-btn ${canEdit ? '' : 'hidden'}" data-card-id="${cardId}" title="Edit Categories">
                    Categories
                </button>
            `;
            row.appendChild(categoriesCell);
        }

        // Picture PNG - hidden for recorder
        if (!isRecorderOnly) {
            const pngCell = document.createElement('td');
            pngCell.appendChild(this.createFileUploadBadge(card, 'png'));
            row.appendChild(pngCell);
        }

        // Animated GIF - hidden for recorder
        if (!isRecorderOnly) {
            const gifCell = document.createElement('td');
            gifCell.appendChild(this.createFileUploadBadge(card, 'gif'));
            row.appendChild(gifCell);
        }

        // Audio - visible for all (this is the main thing recorders need to interact with)
        const audioCell = document.createElement('td');
        audioCell.appendChild(this.createAudioBadge(card));
        row.appendChild(audioCell);

        // Status - hidden for recorder
        if (!isRecorderOnly) {
            const statusCell = document.createElement('td');
            statusCell.innerHTML = `<span class="status ${this.getStatusClass(card)}">${this.getStatusText(card)}</span>`;
            row.appendChild(statusCell);
        }

        // Attach event listeners
        this.attachRowEventListeners(row, card);

        return row;
    }

    attachRowEventListeners(row, card) {
        const cardId = card.cardNum || card.wordNum;
        
        // Input changes - handle card number specially
        row.querySelectorAll('.cell-input, .cell-select').forEach(input => {
            if (input.classList.contains('card-num-input')) {
                input.addEventListener('blur', (e) => {
                    this.handleCardNumberChange(cardId, parseInt(e.target.value));
                });
            } else {
                input.addEventListener('change', (e) => {
                    this.handleFieldEdit(cardId, e.target.dataset.field, e.target.value);
                });
            }
        });

        // Categories button
        const categoriesBtn = row.querySelector('.categories-btn');
        if (categoriesBtn) {
            categoriesBtn.addEventListener('click', () => {
                this.openCategoriesModal(cardId);
            });
        }

        // Notes buttons
        row.querySelectorAll('.notes-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openNotesModal(cardId, btn.dataset.noteType);
            });
        });

        // Add below button
        const addBelowBtn = row.querySelector('.add-below-btn');
        if (addBelowBtn) {
            addBelowBtn.addEventListener('click', () => {
                this.addCardBelow(cardId);
            });
        }

        // Delete button
        const deleteBtn = row.querySelector('.delete-card-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteCard(cardId);
            });
        }
    }

    handleCardNumberChange(oldCardId, newCardId) {
        if (oldCardId === newCardId) return;

        // Check if new card number already exists
        const existingCard = this.allCards.find(c => (c.cardNum || c.wordNum) === newCardId);
        const existingNewCard = this.newCards.find(c => (c.cardNum || c.wordNum) === newCardId);

        if (existingCard || existingNewCard) {
            const targetCard = existingCard || existingNewCard;
            const langWord = this.getCardWord(targetCard);
            const engWord = this.getCardEnglish(targetCard);
            
            const message = `?? Card #${newCardId} already exists:\n\n` +
                `${this.currentLanguageName}: ${langWord}\n` +
                `English: ${engWord}\n` +
                `Lesson: ${targetCard.lesson}\n\n` +
                `Note: You can reuse the same card number for shared images. ` +
                `This is just a reminder that this number is already in use.`;
            
            alert(message);
        }

        // Proceed with the change
        this.handleFieldEdit(oldCardId, 'cardNum', newCardId);
    }

    openCategoriesModal(cardId) {
        // Find card
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Store current card ID for saving
        this.currentCategoriesCardId = cardId;

        // Populate modal fields
        document.getElementById('catModalCardNum').textContent = cardId;
        document.getElementById('catGrammar').value = card.grammar || '';
        document.getElementById('catCategory').value = card.category || '';
        document.getElementById('catSubCategory1').value = card.subCategory1 || '';
        document.getElementById('catSubCategory2').value = card.subCategory2 || '';
        document.getElementById('catACTFLEst').value = card.actflEst || '';

        // Show modal
        document.getElementById('categoriesModal').classList.remove('hidden');
    }

    closeCategoriesModal() {
        document.getElementById('categoriesModal').classList.add('hidden');
        this.currentCategoriesCardId = null;
    }

    saveCategoriesData() {
        if (!this.currentCategoriesCardId) return;

        // Find card
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCategoriesCardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === this.currentCategoriesCardId);
        }

        if (!card) return;

        // Update card data
        card.grammar = document.getElementById('catGrammar').value.trim();
        card.category = document.getElementById('catCategory').value.trim();
        card.subCategory1 = document.getElementById('catSubCategory1').value.trim();
        card.subCategory2 = document.getElementById('catSubCategory2').value.trim();
        card.actflEst = document.getElementById('catACTFLEst').value.trim();

        // Mark as edited
        this.editedCards.set(this.currentCategoriesCardId, card);

        // Close modal
        this.closeCategoriesModal();

        // Update UI
        this.updateUnsavedIndicator();

        toastManager.show('Categories updated! Remember to save changes.', 'success');
    }

    openNotesModal(cardId, noteType) {
        // Find card
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Store current context for saving
        this.currentNotesCardId = cardId;
        this.currentNotesType = noteType;

        // Get current note value
        let currentNote = '';
        let title = '';
        
        if (noteType === 'word') {
            currentNote = card.wordNote || '';
            title = `${this.currentLanguageName} Note`;
        } else if (noteType === 'english') {
            currentNote = card.englishNote || '';
            title = 'English Note';
        }

        // Populate modal fields
        document.getElementById('notesModalCardNum').textContent = cardId;
        document.getElementById('notesModalTitle').textContent = title;
        document.getElementById('notesTextarea').value = currentNote;

        // Show modal
        document.getElementById('notesModal').classList.remove('hidden');
        
        // Focus textarea
        setTimeout(() => {
            document.getElementById('notesTextarea').focus();
        }, 100);
    }

    closeNotesModal() {
        document.getElementById('notesModal').classList.add('hidden');
        this.currentNotesCardId = null;
        this.currentNotesType = null;
    }

    saveNotesData() {
        if (!this.currentNotesCardId || !this.currentNotesType) return;

        // Find card
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentNotesCardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === this.currentNotesCardId);
        }

        if (!card) return;

        // Update card data
        const noteValue = document.getElementById('notesTextarea').value.trim();
        
        if (this.currentNotesType === 'word') {
            card.wordNote = noteValue;
        } else if (this.currentNotesType === 'english') {
            card.englishNote = noteValue;
        }

        // Mark as edited
        this.editedCards.set(this.currentNotesCardId, card);

        // Close modal
        this.closeNotesModal();

        // Update UI
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        toastManager.show('Note updated! Remember to save changes.', 'success');
    }

    createFileUploadBadge(card, type) {
        const container = document.createElement('div');
        container.className = 'file-upload-badge-container';
        const cardId = card.cardNum || card.wordNum;

        let hasFile = false;
        let filename = '';
        let availableFormats = [];

        if (type === 'png') {
            hasFile = !!card.printImagePath;
            filename = card.printImagePath ? card.printImagePath.split('/').pop() : '';
            // Check all available image formats in manifest
            const imageData = this.assets?.manifest?.images?.[cardId] || {};
            if (imageData.png) availableFormats.push('PNG');
            if (imageData.jpg) availableFormats.push('JPG');
            if (imageData.jpeg) availableFormats.push('JPEG');
            if (imageData.webp) availableFormats.push('WebP');
        } else if (type === 'gif') {
            hasFile = card.hasGif || !!card.gifPath;
            filename = card.gifPath ? card.gifPath.split('/').pop() : '';
            // Check all available video/animation formats in manifest
            const imageData = this.assets?.manifest?.images?.[cardId] || {};
            if (imageData.gif) availableFormats.push('GIF');
            if (imageData.mp4) availableFormats.push('MP4');
            if (imageData.webm) availableFormats.push('WebM');
        }

        const badge = document.createElement('span');
        badge.className = `file-badge ${type} ${hasFile ? 'has-file' : 'no-file'} ${this.isAdmin ? 'upload-trigger' : 'disabled-badge'}`;
        badge.dataset.cardId = cardId;
        badge.dataset.fileType = type;

        // Build label: show base filename and format badges
        let labelHTML = '';
        if (hasFile && filename) {
            // Extract base filename without extension
            const baseFilename = filename.replace(/\.(png|jpg|jpeg|webp|gif|mp4|webm)$/i, '');

            // Show formats as small badges if multiple formats exist
            if (availableFormats.length > 1) {
                const formatBadges = availableFormats.map(fmt =>
                    `<span class="format-icon" title="${fmt}">${fmt}</span>`
                ).join('');
                labelHTML = `<i class="fas fa-check"></i> ${baseFilename} ${formatBadges}`;
            } else {
                labelHTML = `<i class="fas fa-check"></i> ${filename}`;
            }
        } else {
            labelHTML = `<i class="fas fa-folder-open"></i> ${type.toUpperCase()}`;
        }

        badge.innerHTML = labelHTML;
        badge.title = this.isAdmin
            ? (filename || `Click to select or upload ${type.toUpperCase()} file`)
            : `${type.toUpperCase()} - Admin only`;

        // Only allow click for admin
        if (this.isAdmin) {
            badge.addEventListener('click', () => {
                this.showFileSelectionModal(cardId, type);
            });
        }

        container.appendChild(badge);
        return container;
    }

    /**
     * Create audio badges for v4.0 - one badge per word variant
     * UPDATED: Supports multi-variant audio (e.g., "Ako/ko" needs 2 badges)
     */
    createAudioBadge(card) {
        const container = document.createElement('div');
        container.className = 'audio-badges-container';
        const cardId = card.cardNum || card.wordNum;

        // Get word variants by splitting on "/"
        const wordVariants = card.word ? card.word.split('/').map(w => w.trim()) : [''];

        // Get audio paths (now an array)
        const audioPaths = Array.isArray(card.audio) ? card.audio : (card.audio ? [card.audio] : []);

        // Create one badge per variant
        wordVariants.forEach((variant, index) => {
            const audioPath = audioPaths[index] || null;
            const hasAudio = !!audioPath;

            const badge = document.createElement('span');
            badge.className = `file-badge audio ${hasAudio ? 'has-file' : 'no-file'} upload-trigger`;
            badge.dataset.cardId = cardId;
            badge.dataset.fileType = 'audio';
            badge.dataset.audioLang = this.currentTrigraph;
            badge.dataset.variantIndex = index;
            badge.dataset.variant = variant;

            // Label: show filename if file exists, otherwise show word variant
            let label = '';
            if (hasAudio) {
                label = audioPath.split('/').pop();  // Show filename
            } else {
                label = variant.toLowerCase();  // Show word variant
            }

            badge.innerHTML = hasAudio
                ? `<i class="fas fa-check"></i> ${label}`
                : `<i class="fas fa-folder-open"></i> ${label}`;

            badge.title = hasAudio
                ? `Audio: ${label}`
                : `Click to upload audio for "${variant}"`;

            badge.addEventListener('click', () => {
                this.showFileSelectionModal(cardId, 'audio', this.currentTrigraph, index, variant);
            });

            container.appendChild(badge);
        });

        return container;
    }

    handleFieldEdit(cardId, field, value) {
        // Find card in allCards or newCards
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Update card data based on field
        if (field === 'lesson') {
            card.lesson = parseInt(value) || 1;
        } else if (field === 'type') {
            card.type = value;
        } else if (field === 'cardNum') {
            const newCardNum = parseInt(value);
            if (!isNaN(newCardNum)) {
                // Update both cardNum and wordNum for compatibility
                card.cardNum = newCardNum;
                card.wordNum = newCardNum;
                // Update the map key
                if (this.editedCards.has(cardId)) {
                    const editedCard = this.editedCards.get(cardId);
                    this.editedCards.delete(cardId);
                    this.editedCards.set(newCardNum, editedCard);
                }
            }
        } else if (field === 'word') {
            // v4.0: direct property
            card.word = value;
            card.acceptableAnswers = [value];
        } else if (field === 'english') {
            // v4.0: direct property
            card.english = value;
            card.englishAcceptable = [value];
        }

        // Mark as edited
        const currentCardId = card.cardNum || card.wordNum;
        if (!this.editedCards.has(currentCardId)) {
            this.editedCards.set(currentCardId, card);
        }

        this.updateUnsavedIndicator();
    }

    showFileSelectionModal(cardId, fileType, audioLang = null, variantIndex = 0, variant = '') {
        // Find card and get current file
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Store variant info for later use
        this.currentVariantIndex = variantIndex;
        this.currentVariant = variant;

        // Determine current file path
        let currentFilePath = null;
        let currentFileName = 'No file selected';

        if (fileType === 'png') {
            currentFilePath = card.printImagePath;
        } else if (fileType === 'gif') {
            currentFilePath = card.gifPath || (card.hasGif ? card.imagePath : null);
        } else if (fileType === 'audio') {
            // v4.0: audio is array now, get specific variant's audio
            const audioPaths = Array.isArray(card.audio) ? card.audio : (card.audio ? [card.audio] : []);
            currentFilePath = audioPaths[variantIndex] || null;
        }

        // Determine modal title based on file type
        let modalTitle = '';
        if (fileType === 'png') {
            modalTitle = 'Select Image File (PNG/JPG/JPEG/WebP)';
        } else if (fileType === 'gif') {
            modalTitle = 'Select Video/Animation File (GIF/MP4/WebM)';
        } else if (fileType === 'audio') {
            modalTitle = `Select Audio File (MP3/M4A) ${audioLang ? `(${audioLang.toUpperCase()})` : ''}`;
        }

        // Get all linked files for this card from manifest.images
        const linkedFiles = [];
        const imageData = this.assets?.manifest?.images?.[cardId] || {};

        if (fileType === 'png') {
            // Show all static image formats
            if (imageData.png) linkedFiles.push({ format: 'PNG', path: imageData.png });
            if (imageData.jpg) linkedFiles.push({ format: 'JPG', path: imageData.jpg });
            if (imageData.jpeg) linkedFiles.push({ format: 'JPEG', path: imageData.jpeg });
            if (imageData.webp) linkedFiles.push({ format: 'WebP', path: imageData.webp });
        } else if (fileType === 'gif') {
            // Show all video/animation formats
            if (imageData.gif) linkedFiles.push({ format: 'GIF', path: imageData.gif });
            if (imageData.mp4) linkedFiles.push({ format: 'MP4', path: imageData.mp4 });
            if (imageData.webm) linkedFiles.push({ format: 'WebM', path: imageData.webm });
        }

        // Build current files display
        let currentFilesHTML = '';
        if (linkedFiles.length > 0) {
            currentFilesHTML = `
                <div class="linked-files-list">
                    ${linkedFiles.map(file => `
                        <div class="linked-file-item">
                            <span class="format-badge">${file.format}</span>
                            <span class="file-name">${file.path.split('/').pop()}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (currentFilePath) {
            currentFilesHTML = `<span class="current-file-name">${currentFileName}</span>`;
        } else {
            currentFilesHTML = `<span class="current-file-name">No file selected</span>`;
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'file-selection-modal';
        modal.innerHTML = `
            <div class="file-selection-content">
                <div class="file-selection-header">
                    <h3>
                        <i class="fas fa-file"></i>
                        ${modalTitle}
                    </h3>
                    <button class="close-modal-btn" id="closeFileModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="file-selection-tabs">
                    <button class="tab-btn active" data-tab="browse">
                        <i class="fas fa-folder-open"></i> Browse Server (/assets)
                    </button>
                    <button class="tab-btn" data-tab="upload">
                        <i class="fas fa-upload"></i> Upload New File
                    </button>
                    ${fileType === 'audio' ? `
                    <button class="tab-btn" data-tab="record">
                        <i class="fas fa-microphone"></i> Record Audio
                    </button>
                    ` : ''}
                </div>

                <div class="file-selection-body">
                    <!-- Browse Tab -->
                    <div class="tab-content active" id="browseTab">
                        <!-- Current File Preview -->
                        <div class="current-file-preview" id="currentFilePreview">
                            <div class="current-file-header">
                                <strong><i class="fas fa-link"></i> Linked Files for Card #${cardId}:</strong>
                                ${currentFilesHTML}
                            </div>
                            <div class="current-file-display" id="currentFileDisplay">
                                ${this.generateCurrentFilePreview(currentFilePath, fileType)}
                            </div>
                        </div>

                        <div class="file-browser-controls">
                            <input type="text" id="fileBrowserSearch" class="form-input"
                                placeholder="Search files...">
                            <select id="fileBrowserFilter" class="select-control">
                                <option value="all">All Files</option>
                                ${fileType === 'png' ? `
                                    <option value="png">PNG Only</option>
                                    <option value="jpg">JPG Only</option>
                                    <option value="webp">WebP Only</option>
                                ` : ''}
                                ${fileType === 'gif' ? `
                                    <option value="gif">GIF Only</option>
                                    <option value="mp4">MP4 Only</option>
                                    <option value="webm">WebM Only</option>
                                ` : ''}
                                ${fileType === 'audio' ? `
                                    <option value="mp3">MP3 Only</option>
                                    <option value="m4a">M4A Only</option>
                                ` : ''}
                            </select>
                        </div>
                        <div class="file-browser-grid" id="fileBrowserGrid">
                            <div class="loading-files">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Loading files...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Upload Tab -->
                    <div class="tab-content" id="uploadTab">
                        <div class="upload-dropzone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop file here, or click to select</p>
                            <button id="selectFileBtn" class="btn btn-primary">
                                <i class="fas fa-folder-open"></i> Select File
                            </button>
                            <input type="file" id="fileUploadInput" style="display:none;">
                        </div>
                    </div>

                    ${fileType === 'audio' ? `
                    <!-- Record Tab -->
                    <div class="tab-content" id="recordTab">
                        <div class="record-container" id="recordContainer">
                            <!-- Recording View -->
                            <div class="record-view" id="recordView">
                                <div class="record-status" id="recordStatus">
                                    <i class="fas fa-microphone"></i>
                                    <p>Click Record to start</p>
                                </div>
                                <div class="countdown-display hidden" id="countdownDisplay">
                                    <span class="countdown-number">3</span>
                                </div>
                                <button class="btn btn-record" id="startRecordBtn">
                                    <i class="fas fa-microphone"></i> Record
                                </button>
                                <button class="btn btn-stop hidden" id="stopRecordBtn">
                                    <i class="fas fa-stop"></i> Stop
                                </button>
                            </div>

                            <!-- Editor View -->
                            <div class="editor-view hidden" id="editorView">
                                <div class="waveform-container">
                                    <canvas id="waveformCanvas" width="600" height="150"></canvas>
                                    <div class="marker marker-start" id="markerStart"></div>
                                    <div class="marker marker-end" id="markerEnd"></div>
                                    <div class="playhead" id="playhead"></div>
                                </div>
                                <div class="editor-time-display">
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
                                    <button class="btn btn-sm btn-warning" id="editorCutBtn" title="Cut to markers">
                                        <i class="fas fa-cut"></i> Cut
                                    </button>
                                    <button class="btn btn-sm btn-primary" id="editorSaveBtn" title="Save">
                                        <i class="fas fa-save"></i> Save
                                    </button>
                                    <button class="btn btn-sm btn-secondary" id="editorRerecordBtn" title="Record again">
                                        <i class="fas fa-microphone"></i> Re-record
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const tab = e.target.dataset.tab;
                let tabId = 'browseTab';
                if (tab === 'upload') tabId = 'uploadTab';
                else if (tab === 'record') tabId = 'recordTab';
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Close modal
        const closeModal = () => {
            // Clean up audio recorder if active
            if (this.audioRecorder) {
                this.cleanupAudioRecorder();
            }
            // Safely remove modal if it's still in the DOM
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        modal.querySelector('#closeFileModal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Setup audio playback for current file if it's audio
        if (fileType === 'audio' && currentFilePath) {
            const playBtn = modal.querySelector('#playCurrentAudio');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const audio = new Audio(currentFilePath);
                    audio.play();
                });
            }
        }

        // Load server files
        this.loadServerFiles(fileType, audioLang);

        // Setup file browser search
        modal.querySelector('#fileBrowserSearch').addEventListener('input', (e) => {
            this.filterServerFiles(e.target.value, modal.querySelector('#fileBrowserFilter').value);
        });

        modal.querySelector('#fileBrowserFilter').addEventListener('change', (e) => {
            this.filterServerFiles(modal.querySelector('#fileBrowserSearch').value, e.target.value);
        });

        // Setup upload button
        modal.querySelector('#selectFileBtn').addEventListener('click', () => {
            modal.querySelector('#fileUploadInput').click();
        });

        modal.querySelector('#fileUploadInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(cardId, fileType, audioLang, file);
                closeModal();
            }
        });

        // Setup recording functionality for audio files
        if (fileType === 'audio') {
            this.setupAudioRecorder(modal, cardId, audioLang, closeModal);
        }

        // Store reference for file selection
        this.currentFileSelectionContext = { cardId, fileType, audioLang, modal, closeModal };
    }

    /**
     * Setup audio recorder functionality
     */

    // Audio recorder methods moved to deck-builder-audio.js
    // setupAudioRecorder, startCountdown, startSilenceDetection, stopRecording,
    // showAudioEditor, drawWaveform, detectVoiceBoundaries, updateMarkerPositions,
    // setupEditorControls, stopPlayback, makeMarkerDraggable, cutAudio, encodeAudioBuffer,
    // audioBufferToBlob, saveRecordedAudio, showFilenameDialog, formatTime,
    // cleanupAudioRecorder, generateCurrentFilePreview

    async loadServerFiles(fileType, audioLang) {
        try {
            // Map fileType for list-assets.php
            const apiFileType = fileType === 'audio' ? 'audio' : fileType;
            
            // CACHE PREVENTION: Add timestamp and no-cache headers
            const timestamp = new Date().getTime();
            const response = await fetch(`list-assets.php?type=${apiFileType}&_=${timestamp}`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const result = await response.json();

            if (result.success) {
                this.serverFiles = result.files;
                this.displayServerFiles(this.serverFiles);
            } else {
                document.getElementById('fileBrowserGrid').innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Could not load server files</p>
                        <small>${result.error || 'Unknown error'}</small>
                    </div>
                `;
            }
        } catch (err) {
            document.getElementById('fileBrowserGrid').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading files from server</p>
                    <small>${err.message}</small>
                </div>
            `;
            debugLogger?.log(1, `Error loading server files: ${err.message}`);
        }
    }

    displayServerFiles(files) {
        const grid = document.getElementById('fileBrowserGrid');
        
        if (!files || files.length === 0) {
            grid.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-folder-open"></i>
                    <p>No files found in /assets folder</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-browser-item';
            fileItem.dataset.filename = file.name;
            fileItem.dataset.filepath = file.path;
            fileItem.dataset.filetype = file.type;

            let preview = '';
            let isAudio = false;
            
            if (file.type === 'png' || file.type === 'gif') {
                preview = `<img src="${file.path}" alt="${file.name}">`;
            } else if (file.type === 'audio') {
                preview = `<i class="fas fa-file-audio"></i>`;
                isAudio = true;
            } else {
                preview = `<i class="fas fa-file"></i>`;
            }

            // For audio files, make filename much more prominent
            const filenameDisplay = isAudio 
                ? `<div class="file-name audio-filename" title="${file.name}">${file.name}</div>`
                : `<div class="file-name" title="${file.name}">${file.name}</div>`;

            fileItem.innerHTML = `
                <div class="file-preview ${isAudio ? 'audio-preview' : ''}">${preview}</div>
                <div class="file-info">
                    ${filenameDisplay}
                    <div class="file-meta">
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        ${isAudio ? '<span class="audio-play-btn" title="Preview audio"><i class="fas fa-play"></i></span>' : ''}
                    </div>
                </div>
            `;

            // Click to select file
            fileItem.addEventListener('click', (e) => {
                // Don't select if clicking play button
                if (e.target.closest('.audio-play-btn')) {
                    const audio = new Audio(file.path);
                    audio.play();
                    return;
                }
                this.selectExistingFile(file);
            });

            grid.appendChild(fileItem);
        });
    }

    filterServerFiles(searchTerm, filterType) {
        if (!this.serverFiles) return;

        let filtered = this.serverFiles;

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(f => f.type === filterType);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(f => f.name.toLowerCase().includes(term));
        }

        this.displayServerFiles(filtered);
    }

    validateFilename(cardNum, filename, fileType, audioLang = null) {
        const ext = filename.split('.').pop().toLowerCase();
        
        // Check if filename starts with cardNum
        const startsWithNum = filename.match(/^(\d+)\./);
        
        let expectedPattern = '';
        let isValid = false;
        
        if (fileType === 'png') {
            expectedPattern = `${cardNum}.*.*.png (or .jpg, .jpeg, .webp)`;
            isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
        } else if (fileType === 'gif') {
            expectedPattern = `${cardNum}.*.*.gif (or .mp4, .webm)`;
            isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ['gif', 'mp4', 'webm'].includes(ext);
        } else if (fileType === 'audio') {
            expectedPattern = `${cardNum}.${audioLang}.*.mp3 or .m4a`;
            const audioMatch = filename.match(/^(\d+)\.([a-z]{3})\./);
            isValid = audioMatch && 
                      parseInt(audioMatch[1]) === cardNum && 
                      audioMatch[2] === audioLang &&
                      (ext === 'mp3' || ext === 'm4a');
        }
        
        return {
            isValid,
            expectedPattern,
            actualFilename: filename
        };
    }

    generateSuggestedFilename(card, fileType, audioLang = null, actualExtension = null) {
        const cardId = card.cardNum || card.wordNum;
        const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
        const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';

        if (fileType === 'png') {
            const ext = actualExtension || 'png';
            return `${cardId}.${word}.${english}.${ext}`;
        } else if (fileType === 'gif') {
            const ext = actualExtension || 'gif';
            return `${cardId}.${word}.${english}.${ext}`;
        } else if (fileType === 'audio' && audioLang) {
            const ext = actualExtension || 'mp3';
            return `${cardId}.${audioLang}.${word}.${english}.${ext}`;
        }

        return null;
    }

    showRenameWarning(file, card, fileType, audioLang = null) {
        const cardId = card.cardNum || card.wordNum;
        const validation = this.validateFilename(cardId, file.name, fileType, audioLang);
        
        if (validation.isValid) {
            // File is properly named, proceed normally
            this.linkFileToCard(file, card, fileType, audioLang);
            return;
        }
        
        // File has incorrect name - show warning
        // Extract the actual extension from the file to preserve it in the suggested name
        const actualExt = file.name.split('.').pop().toLowerCase();
        const suggestedName = this.generateSuggestedFilename(card, fileType, audioLang, actualExt);
        
        const modal = document.createElement('div');
        modal.className = 'modal rename-warning-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white;">
                    <h2>
                        <i class="fas fa-exclamation-triangle"></i>
                        Filename Convention Warning
                    </h2>
                </div>
                
                <div class="modal-body" style="padding: 24px;">
                    <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                        <strong style="color: #856404;">?? This file doesn't follow the naming convention!</strong>
                        <p style="margin: 8px 0 0 0; color: #856404; font-size: 14px;">
                            If you link it as-is, it will be <strong>unlinked</strong> when you run "Rescan Assets" in the future.
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-file"></i> Current Filename:
                        </label>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; color: #e74c3c; font-weight: 600;">
                            ${validation.actualFilename}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-check-circle"></i> Expected Pattern:
                        </label>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; color: #7f8c8d; font-size: 13px;">
                            ${validation.expectedPattern}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-magic"></i> Suggested Filename:
                        </label>
                        <input type="text" id="renameInput" class="form-input" 
                            value="${suggestedName}" 
                            style="font-family: monospace; color: #27ae60; font-weight: 600;">
                        <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> You can edit this before renaming
                        </p>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 16px 24px; background: #f8f9fa; border-top: 1px solid #dee2e6;">
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="renameAndLinkBtn" class="btn btn-success">
                            <i class="fas fa-check"></i> Rename & Link
                        </button>
                        <button id="linkAnywayBtn" class="btn btn-warning">
                            <i class="fas fa-link"></i> Link Anyway
                        </button>
                        <button id="cancelLinkBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const renameInput = document.getElementById('renameInput');
        const renameAndLinkBtn = document.getElementById('renameAndLinkBtn');
        const linkAnywayBtn = document.getElementById('linkAnywayBtn');
        const cancelLinkBtn = document.getElementById('cancelLinkBtn');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        // Rename and link
        renameAndLinkBtn.addEventListener('click', async () => {
            const newFilename = renameInput.value.trim();
            
            if (!newFilename) {
                toastManager.show('Please enter a filename', 'error');
                return;
            }
            
            renameAndLinkBtn.disabled = true;
            renameAndLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renaming...';
            
            const success = await this.renameFileOnServer(file.name, newFilename);
            
            if (success) {
                file.name = newFilename;
                file.path = 'assets/' + newFilename;
                this.linkFileToCard(file, card, fileType, audioLang);
                closeModal();
                toastManager.show(`File renamed and linked successfully!`, 'success', 4000);
            } else {
                renameAndLinkBtn.disabled = false;
                renameAndLinkBtn.innerHTML = '<i class="fas fa-check"></i> Rename & Link';
            }
        });
        
        // Link anyway
        linkAnywayBtn.addEventListener('click', () => {
            this.linkFileToCard(file, card, fileType, audioLang);
            closeModal();
            toastManager.show('File linked (may be unlinked on future scans)', 'warning', 4000);
        });
        
        // Cancel
        cancelLinkBtn.addEventListener('click', closeModal);
        
        // Close on escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        setTimeout(() => renameInput.focus(), 100);
    }

    async renameFileOnServer(oldFilename, newFilename) {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`rename-asset.php?_=${timestamp}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    oldFilename: oldFilename,
                    newFilename: newFilename
                }),
                cache: 'no-store'
            });
            
            const result = await response.json();
            
            if (result.success) {
                debugLogger?.log(2, `File renamed: ${oldFilename} ? ${newFilename}`);
                return true;
            } else {
                toastManager.show(`Rename failed: ${result.error}`, 'error', 5000);
                return false;
            }
        } catch (err) {
            toastManager.show(`Error renaming file: ${err.message}`, 'error', 5000);
            return false;
        }
    }

    linkFileToCard(file, card, fileType, audioLang = null) {
        if (fileType === 'png') {
            card.printImagePath = file.path;
        } else if (fileType === 'gif') {
            card.gifPath = file.path;
            card.hasGif = true;
        } else if (fileType === 'audio') {
            // v4.0: audio is now array (multi-variant support)
            // Ensure audio is array
            if (!Array.isArray(card.audio)) {
                card.audio = card.audio ? [card.audio] : [];
            }

            // Get variant index from stored context
            const variantIndex = this.currentVariantIndex || 0;

            // Pad array with nulls if needed
            while (card.audio.length <= variantIndex) {
                card.audio.push(null);
            }

            // Set audio at variant index
            card.audio[variantIndex] = file.path;
            card.hasAudio = card.audio.some(p => p !== null && p !== undefined && p !== '');
        }

        // Mark as edited
        const cardId = card.cardNum || card.wordNum;
        this.editedCards.set(cardId, card);

        // Re-render
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();
    }

    selectExistingFile(file) {
        const { cardId, fileType, audioLang, closeModal } = this.currentFileSelectionContext;

        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        closeModal();
        this.showRenameWarning(file, card, fileType, audioLang);
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async handleFileUpload(cardId, fileType, audioLang = null, file = null) {
        if (!file) {
            const input = document.createElement('input');
            input.type = 'file';
            
            if (fileType === 'png') {
                input.accept = 'image/png,image/jpeg,image/webp';
            } else if (fileType === 'gif') {
                input.accept = 'image/gif,video/mp4,video/webm';
            } else if (fileType === 'audio') {
                input.accept = 'audio/mp3,audio/mpeg,audio/m4a';
            }

            input.onchange = async (e) => {
                const selectedFile = e.target.files[0];
                if (selectedFile) {
                    this.handleFileUpload(cardId, fileType, audioLang, selectedFile);
                }
            };

            input.click();
            return;
        }

        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // For PNG and GIF, show filename dialog
        if (fileType === 'png' || fileType === 'gif') {
            // Generate default filename
            const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
            const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
            // Get the actual file extension from the uploaded file
            const actualExt = file.name.split('.').pop().toLowerCase();
            const defaultFilename = `${cardId}.${word}.${english}.${actualExt}`;

            // Create preview URL for the uploaded file
            const previewUrl = URL.createObjectURL(file);

            // Show filename dialog with preview
            this.showFilenameDialog(defaultFilename, async (finalFilename) => {
                toastManager.show(`Uploading ${finalFilename}...`, 'warning', 2000);

                try {
                    // Upload the file to the server
                    const formData = new FormData();
                    formData.append('media', file);
                    formData.append('filename', finalFilename);

                    const response = await fetch('upload-media.php', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || 'Upload failed');
                    }

                    // Update card path with uploaded file
                    if (fileType === 'png') {
                        card.printImagePath = result.path;
                    } else if (fileType === 'gif') {
                        card.gifPath = result.path;
                        card.hasGif = true;
                    }

                    this.editedCards.set(cardId, card);
                    this.filterAndRenderCards();
                    this.updateUnsavedIndicator();

                    // Clean up preview URL
                    URL.revokeObjectURL(previewUrl);

                    // Close the file selection modal if it's open
                    if (this.currentFileSelectionContext && this.currentFileSelectionContext.closeModal) {
                        this.currentFileSelectionContext.closeModal();
                    }

                    toastManager.show(`✓ File uploaded as ${finalFilename}. Remember to save changes.`, 'success');
                } catch (error) {
                    toastManager.show(`Upload failed: ${error.message}`, 'error');
                    console.error('Upload error:', error);
                }
            }, previewUrl, fileType);
            return;
        }

        // For audio, use direct upload (recording has its own dialog)
        toastManager.show(`Uploading ${file.name}...`, 'warning', 2000);

        // Generate proper filename for audio
        const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
        const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
        const ext = file.name.split('.').pop();

        if (fileType === 'audio' && audioLang) {
            card.audio = `assets/${cardId}.${audioLang}.${word}.${english}.${ext}`;
            card.hasAudio = true;
        }

        this.editedCards.set(cardId, card);
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        toastManager.show(`File uploaded! Remember to save changes.`, 'success');
    }

    addNewCard(lessonNum = null, insertAfterCardId = null) {
        // Find the highest card number - filter out any invalid values and ensure numbers
        const allCardNums = [
            ...this.allCards.map(c => parseInt(c.cardNum || c.wordNum)),
            ...this.newCards.map(c => parseInt(c.cardNum || c.wordNum))
        ].filter(num => !isNaN(num) && num > 0);
        
        const maxCardNum = allCardNums.length > 0 ? Math.max(...allCardNums) : 0;
        const newCardNum = maxCardNum + 1;

        // Get lesson from filter (use "from" value if set, otherwise default to 1)
        let lesson = 1;
        if (lessonNum !== null) {
            lesson = lessonNum;
        } else {
            const fromValue = document.getElementById('lessonFilterFrom').value;
            if (fromValue) {
                lesson = parseInt(fromValue) || 1;
            }
        }

        // Create card in v4.0 format
        const newCard = {
            cardNum: newCardNum,
            lesson: lesson,
            type: 'N',
            word: '',
            english: '',
            wordNote: '',
            englishNote: '',
            acceptableAnswers: [],
            englishAcceptable: [],
            grammar: '',
            category: '',
            subCategory1: '',
            subCategory2: '',
            actflEst: '',
            audio: null,
            hasAudio: false,
            printImagePath: null,
            hasGif: false,
            gifPath: null
        };

        if (insertAfterCardId !== null) {
            const insertIndex = this.newCards.findIndex(c => (c.cardNum || c.wordNum) === insertAfterCardId);
            if (insertIndex !== -1) {
                this.newCards.splice(insertIndex + 1, 0, newCard);
            } else {
                this.newCards.push(newCard);
            }
        } else {
            this.newCards.push(newCard);
        }

        this.editedCards.set(newCard.cardNum, newCard);

        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        setTimeout(() => {
            const newRow = document.querySelector(`tr[data-card-id="${newCardNum}"]`);
            if (newRow) {
                newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newRow.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';
                setTimeout(() => {
                    newRow.style.backgroundColor = '';
                }, 2000);
            }
        }, 100);

        toastManager.show(`New card #${newCardNum} added. Fill in the details and save.`, 'success');
    }

    addCardBelow(cardId) {
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        this.addNewCard(card.lesson, cardId);
    }

    deleteCard(cardId) {
        if (!confirm('Are you sure you want to delete this card?')) return;

        this.deletedCards.add(cardId);

        const newCardIndex = this.newCards.findIndex(c => (c.cardNum || c.wordNum) === cardId);
        if (newCardIndex !== -1) {
            this.newCards.splice(newCardIndex, 1);
        }

        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        toastManager.show('Card marked for deletion. Save changes to confirm.', 'warning');
    }

    async saveChanges() {
        if (this.editedCards.size === 0 && this.deletedCards.size === 0) {
            toastManager.show('No changes to save', 'warning');
            return;
        }

        if (!confirm(`Save ${this.editedCards.size} edited/new cards and delete ${this.deletedCards.size} cards?`)) {
            return;
        }

        try {
            // Apply edits
            this.editedCards.forEach((editedCard, cardId) => {
                const index = this.allCards.findIndex(c => (c.cardNum || c.wordNum) === cardId);
                if (index !== -1) {
                    this.allCards[index] = editedCard;
                } else {
                    this.allCards.push(editedCard);
                }
            });

            // Apply deletions
            this.deletedCards.forEach(cardId => {
                const index = this.allCards.findIndex(c => (c.cardNum || c.wordNum) === cardId);
                if (index !== -1) {
                    this.allCards.splice(index, 1);
                }
            });

            // Save to server
            toastManager.show('Saving changes to CSV file...', 'info');

            const response = await fetch('save-deck.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trigraph: this.currentTrigraph,
                    languageName: this.currentLanguageName,
                    cards: this.allCards
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Save failed');
            }

            // Update manifest structure
            if (this.assets.manifest && this.assets.manifest.cards) {
                this.assets.manifest.cards[this.currentTrigraph] = this.allCards;
            }

            // Clear tracking
            this.editedCards.clear();
            this.deletedCards.clear();
            this.newCards = [];

            // Re-render
            this.filterAndRenderCards();
            this.updateStats();
            this.updateUnsavedIndicator();

            toastManager.show(`✓ Saved! ${result.cardCount} cards written to manifest.json. Changes are live immediately - no rescan needed!`, 'success', 6000);
            debugLogger?.log(2, `Deck Builder: Saved ${this.allCards.length} cards for ${this.currentLanguageName} directly to manifest`);
        } catch (err) {
            console.error('Save error:', err);
            toastManager.show('Error saving changes: ' + err.message, 'error', 5000);
        }
    }

    /**
     * Export to per-language CSV (v4.0 format)
     */
    exportToCSV() {
        const csv = this.generateCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Word_List_${this.currentLanguageName}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toastManager.show(`CSV exported for ${this.currentLanguageName}!`, 'success');
    }

    /**
     * Generate per-language CSV (v4.0 format - 12 columns)
     */
    generateCSV() {
        const headers = [
            'Lesson', 'CardNum', 'Word', 'WordNote', 'English', 'EnglishNote',
            'Grammar', 'Category', 'SubCategory1', 'SubCategory2', 'ACTFLEst', 'Type'
        ];

        let csv = headers.join(',') + '\n';

        this.allCards.forEach(card => {
            const row = [
                card.lesson || '',
                card.cardNum || card.wordNum || '',
                this.escapeCSV(this.getCardWord(card)),
                this.escapeCSV(card.wordNote || ''),
                this.escapeCSV(this.getCardEnglish(card)),
                this.escapeCSV(card.englishNote || ''),
                this.escapeCSV(card.grammar || ''),
                this.escapeCSV(card.category || ''),
                this.escapeCSV(card.subCategory1 || ''),
                this.escapeCSV(card.subCategory2 || ''),
                this.escapeCSV(card.actflEst || ''),
                card.type || 'N'
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    escapeCSV(value) {
        if (typeof value !== 'string') return '';
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    }

    updateStats() {
        const total = this.allCards.length;
        let complete = 0;
        let missing = 0;
        let newWords = 0;

        this.allCards.forEach(card => {
            const status = this.getStatusClass(card);
            if (status === 'status-complete-animated' || status === 'status-complete-static') {
                complete++;
            }
            if (status === 'status-missing') {
                missing++;
            }
            if (card.type === 'N') {
                newWords++;
            }
        });

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statComplete').textContent = complete;
        document.getElementById('statMissing').textContent = missing;
        document.getElementById('statNew').textContent = newWords;
    }

    updateUnsavedIndicator() {
        const unsavedCount = this.editedCards.size + this.deletedCards.size;
        const indicator = document.getElementById('unsavedCount');
        const saveBtn = document.getElementById('saveChangesBtn');

        if (unsavedCount > 0) {
            indicator.textContent = `${unsavedCount} unsaved`;
            indicator.classList.remove('hidden');
            saveBtn.disabled = false;
        } else {
            indicator.classList.add('hidden');
            saveBtn.disabled = true;
        }
    }

    /**
     * Get word for current language - v4.0 uses direct properties
     */
    getCardWord(card) {
        // v4.0: direct card.word property
        if (card.word !== undefined) {
            return card.word || '';
        }
        // v3.x fallback: translations object
        if (card.translations) {
            const langName = this.trigraphToLangName[this.currentTrigraph]?.toLowerCase() || 'cebuano';
            return card.translations[langName]?.word || '';
        }
        return '';
    }

    /**
     * Get English translation - v4.0 uses direct property
     */
    getCardEnglish(card) {
        // v4.0: direct card.english property
        if (card.english !== undefined) {
            return card.english || '';
        }
        // v3.x fallback
        if (card.translations?.english) {
            return card.translations.english.word || '';
        }
        return '';
    }

    getStatusClass(card) {
        const hasPng = !!card.printImagePath;
        const hasGif = card.hasGif || !!card.gifPath;
        // v4.0: audio is array - check for actual paths, not empty arrays
        const hasAudio = (Array.isArray(card.audio) ? card.audio.some(a => a && a.trim()) : !!card.audio) || card.hasAudio;

        if (hasPng && hasGif && hasAudio) return 'status-complete-animated';
        if (hasPng && hasAudio) return 'status-complete-static';
        if (hasPng || hasGif) return 'status-partial';
        return 'status-missing';
    }

    getStatusText(card) {
        const cls = this.getStatusClass(card);
        if (cls === 'status-complete-animated') return 'Complete (Animated)';
        if (cls === 'status-complete-static') return 'Complete (Static)';
        if (cls === 'status-partial') return 'Partial';
        return 'Missing';
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }


    // Upload handlers moved to deck-builder-uploads.js
    // setupCSVUpload, uploadAndProcess, triggerAssetScan,
    // setupMediaUpload, uploadMediaFiles,
    // setupSentenceWordsUpload, uploadSentenceWords,
    // setupGrammarUpload, uploadGrammarFile, showGrammarReport, renderGrammarReport

    destroy() {
        super.destroy();
    }
}