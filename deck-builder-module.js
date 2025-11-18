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
        this.container.innerHTML = `
            <div class="card module-deck-builder">
                <div class="deck-header">
                    <div class="deck-title">
                        <h1>
                            <i class="fas fa-layer-group"></i>
                            Deck Builder
                        </h1>
                        <p class="deck-description">Create, edit, and manage your language learning cards</p>
                    </div>
                    <div class="deck-actions">
                        <button id="addCardBtn" class="btn btn-success">
                            <i class="fas fa-plus"></i> Add New Card
                        </button>
                        <button id="saveChangesBtn" class="btn btn-primary" disabled>
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button id="exportCSVBtn" class="btn btn-secondary">
                            <i class="fas fa-download"></i> Export CSV
                        </button>
                    </div>
                </div>

                <!-- Filter Controls -->
                <div class="deck-controls">
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
                    
                    <div class="filter-group">
                        <label for="lessonFilter">
                            <i class="fas fa-filter"></i> Lesson:
                        </label>
                        <select id="lessonFilter" class="select-control">
                            <option value="all">All Lessons</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="searchCards">
                            <i class="fas fa-search"></i> Search:
                        </label>
                        <input type="text" id="searchCards" class="form-input" placeholder="Search words...">
                    </div>

                    <div class="stats-mini">
                        <span id="cardCount">0 cards</span>
                        <span id="unsavedCount" class="unsaved-indicator hidden">0 unsaved</span>
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

                <!-- Add New Card Button (Top) -->
                <div style="margin: 16px 0; text-align: center;">
                    <button id="addCardBtnTop" class="btn btn-success">
                        <i class="fas fa-plus"></i> Add New Card
                    </button>
                </div>

                <!-- Card Table -->
                <div class="deck-table-container">
                    <table class="deck-table" id="deckTable">
                        <thead>
                            <tr>
                                <th style="width: 80px;">Lesson</th>
                                <th style="width: 60px;">Type</th>
                                <th style="width: 80px;">Card #</th>
                                <th style="width: 200px;" id="langHeader">Cebuano</th>
                                <th style="width: 200px;">English</th>
                                <th style="width: 100px;">Categories</th>
                                <th style="width: 120px;">Picture (PNG)</th>
                                <th style="width: 120px;">Animated (GIF)</th>
                                <th style="width: 100px;">Audio</th>
                                <th style="width: 120px;">Status</th>
                                <th style="width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="deckTableBody">
                            <!-- Cards will be populated here -->
                        </tbody>
                    </table>
                </div>

                <!-- Add New Card Button (Bottom) -->
                <div style="margin: 16px 0; text-align: center;">
                    <button id="addCardBtnBottom" class="btn btn-success">
                        <i class="fas fa-plus"></i> Add New Card
                    </button>
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
        `;
    }
    
    async init() {
        // Load cards for current language from v4.0 manifest structure
        this.loadCardsForLanguage(this.currentTrigraph);
        
        if (this.allCards.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.querySelector('.deck-table-container').style.display = 'none';
        }

        // Populate lesson filter
        this.populateLessonFilter();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.filterAndRenderCards();

        // Update stats
        this.updateStats();

        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'deck-builder',
                'Deck Builder Guide',
                'Edit cards directly in the table by clicking on cells. Click on file badges to upload new images or audio. Use "Add New Card" to create cards, "Categories" button to edit grammar/category fields, and "Save Changes" to update the manifest.'
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

    populateLessonFilter() {
        const lessons = new Set();
        this.allCards.forEach(card => lessons.add(card.lesson));
        const sortedLessons = Array.from(lessons).sort((a, b) => a - b);

        const lessonFilter = document.getElementById('lessonFilter');
        // Clear existing options except "All Lessons"
        lessonFilter.innerHTML = '<option value="all">All Lessons</option>';
        
        sortedLessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = `Lesson ${lesson}`;
            lessonFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        // Language filter - now uses trigraph values
        document.getElementById('languageFilter').addEventListener('change', (e) => {
            const trigraph = e.target.value;
            this.loadCardsForLanguage(trigraph);
            document.getElementById('langHeader').textContent = this.currentLanguageName;
            this.populateLessonFilter();
            this.filterAndRenderCards();
            this.updateStats();
        });

        // Lesson filter
        document.getElementById('lessonFilter').addEventListener('change', () => {
            this.filterAndRenderCards();
        });

        // Search
        document.getElementById('searchCards').addEventListener('input', () => {
            this.filterAndRenderCards();
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

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('categoriesModal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeCategoriesModal();
                }
            }
        });
    }

    filterAndRenderCards() {
        const lessonFilter = document.getElementById('lessonFilter').value;
        const searchTerm = document.getElementById('searchCards').value.toLowerCase();

        this.filteredCards = this.allCards.filter(card => {
            // Get card ID (support both v4.0 cardNum and v3.x wordNum)
            const cardId = card.cardNum || card.wordNum;
            
            // Skip deleted cards
            if (this.deletedCards.has(cardId)) return false;

            // Lesson filter
            if (lessonFilter !== 'all' && card.lesson !== parseInt(lessonFilter)) {
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
            if (lessonFilter !== 'all' && card.lesson !== parseInt(lessonFilter)) {
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

        this.filteredCards.forEach(card => {
            const row = this.createCardRow(card);
            tbody.appendChild(row);
        });
    }

    createCardRow(card) {
        const row = document.createElement('tr');
        // Support both cardNum (v4.0) and wordNum (v3.x)
        const cardId = card.cardNum || card.wordNum;
        row.dataset.cardId = cardId;
        
        const isNewCard = cardId >= this.nextNewCardId - 1000;
        const isEdited = this.editedCards.has(cardId);
        
        if (isNewCard || isEdited) {
            row.classList.add('edited-row');
        }

        // Lesson
        const lessonCell = document.createElement('td');
        lessonCell.innerHTML = `<input type="number" class="cell-input" value="${card.lesson || ''}" 
            data-field="lesson" data-card-id="${cardId}" min="1" max="100">`;
        row.appendChild(lessonCell);

        // Type
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `
            <select class="cell-select" data-field="type" data-card-id="${cardId}">
                <option value="N" ${card.type === 'N' ? 'selected' : ''}>N</option>
                <option value="R" ${card.type === 'R' ? 'selected' : ''}>R</option>
            </select>
        `;
        row.appendChild(typeCell);

        // Card # - NOW EDITABLE
        const cardNumCell = document.createElement('td');
        cardNumCell.innerHTML = `<input type="number" class="cell-input card-num-input" value="${cardId}" 
            data-field="cardNum" data-card-id="${cardId}" data-original-id="${cardId}" min="1">`;
        row.appendChild(cardNumCell);

        // Language word (editable)
        const langWord = this.getCardWord(card);
        const langCell = document.createElement('td');
        langCell.innerHTML = `<input type="text" class="cell-input" value="${langWord}" 
            data-field="word" data-card-id="${cardId}">`;
        row.appendChild(langCell);

        // English translation (editable)
        const engWord = this.getCardEnglish(card);
        const engCell = document.createElement('td');
        engCell.innerHTML = `<input type="text" class="cell-input" value="${engWord}" 
            data-field="english" data-card-id="${cardId}">`;
        row.appendChild(engCell);

        // Categories button
        const categoriesCell = document.createElement('td');
        categoriesCell.innerHTML = `
            <button class="btn btn-sm btn-secondary categories-btn" data-card-id="${cardId}" title="Edit Categories">
                Categories
            </button>
        `;
        row.appendChild(categoriesCell);

        // Picture PNG
        const pngCell = document.createElement('td');
        pngCell.appendChild(this.createFileUploadBadge(card, 'png'));
        row.appendChild(pngCell);

        // Animated GIF
        const gifCell = document.createElement('td');
        gifCell.appendChild(this.createFileUploadBadge(card, 'gif'));
        row.appendChild(gifCell);

        // Audio - simplified for v4.0 (single language per card)
        const audioCell = document.createElement('td');
        audioCell.appendChild(this.createAudioBadge(card));
        row.appendChild(audioCell);

        // Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = `<span class="status ${this.getStatusClass(card)}">${this.getStatusText(card)}</span>`;
        row.appendChild(statusCell);

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div style="display: flex; gap: 4px; justify-content: center;">
                <button class="btn-icon add-below-btn" data-card-id="${cardId}" title="Add Card Below" style="color: var(--success);">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-icon delete-card-btn" data-card-id="${cardId}" title="Delete Card">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        row.appendChild(actionsCell);

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

    createFileUploadBadge(card, type) {
        const container = document.createElement('div');
        container.className = 'file-upload-badge-container';
        const cardId = card.cardNum || card.wordNum;

        let hasFile = false;
        let filename = '';

        if (type === 'png') {
            hasFile = !!card.printImagePath;
            filename = card.printImagePath ? card.printImagePath.split('/').pop() : '';
        } else if (type === 'gif') {
            hasFile = card.hasGif || !!card.gifPath;
            filename = card.gifPath ? card.gifPath.split('/').pop() : '';
        }

        const badge = document.createElement('span');
        badge.className = `file-badge ${type} ${hasFile ? 'has-file' : 'no-file'} upload-trigger`;
        badge.dataset.cardId = cardId;
        badge.dataset.fileType = type;
        badge.innerHTML = hasFile 
            ? `<i class="fas fa-check"></i> ${type.toUpperCase()}`
            : `<i class="fas fa-folder-open"></i> ${type.toUpperCase()}`;
        badge.title = filename || `Click to select or upload ${type.toUpperCase()} file`;

        badge.addEventListener('click', () => {
            this.showFileSelectionModal(cardId, type);
        });

        container.appendChild(badge);
        return container;
    }

    /**
     * Create single audio badge for v4.0 (audio is string, not object)
     */
    createAudioBadge(card) {
        const container = document.createElement('div');
        container.className = 'audio-badges-container';
        const cardId = card.cardNum || card.wordNum;

        // v4.0: audio is a string path, not an object
        const hasAudio = !!card.audio;
        const badge = document.createElement('span');
        badge.className = `file-badge audio ${hasAudio ? 'has-file' : 'no-file'} upload-trigger`;
        badge.dataset.cardId = cardId;
        badge.dataset.fileType = 'audio';
        badge.dataset.audioLang = this.currentTrigraph;
        
        const label = this.currentTrigraph.toUpperCase();
        badge.innerHTML = hasAudio 
            ? `<i class="fas fa-check"></i> ${label}`
            : `<i class="fas fa-folder-open"></i> ${label}`;
        
        const audioFilename = hasAudio && typeof card.audio === 'string' 
            ? card.audio.split('/').pop() 
            : '';
        badge.title = audioFilename || `Click to select or upload ${label} audio`;

        badge.addEventListener('click', () => {
            this.showFileSelectionModal(cardId, 'audio', this.currentTrigraph);
        });

        container.appendChild(badge);
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

    showFileSelectionModal(cardId, fileType, audioLang = null) {
        // Find card and get current file
        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Determine current file path
        let currentFilePath = null;
        let currentFileName = 'No file selected';
        
        if (fileType === 'png') {
            currentFilePath = card.printImagePath;
        } else if (fileType === 'gif') {
            currentFilePath = card.gifPath || (card.hasGif ? card.imagePath : null);
        } else if (fileType === 'audio') {
            // v4.0: audio is string
            currentFilePath = card.audio;
        }

        if (currentFilePath) {
            currentFileName = currentFilePath.split('/').pop();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'file-selection-modal';
        modal.innerHTML = `
            <div class="file-selection-content">
                <div class="file-selection-header">
                    <h3>
                        <i class="fas fa-file"></i>
                        Select ${fileType.toUpperCase()} ${audioLang ? `(${audioLang.toUpperCase()})` : ''} File
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
                </div>

                <div class="file-selection-body">
                    <!-- Browse Tab -->
                    <div class="tab-content active" id="browseTab">
                        <!-- Current File Preview -->
                        <div class="current-file-preview" id="currentFilePreview">
                            <div class="current-file-header">
                                <strong><i class="fas fa-file-image"></i> Current File:</strong>
                                <span class="current-file-name">${currentFileName}</span>
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
                                <option value="${fileType === 'audio' ? 'audio' : fileType}">${fileType.toUpperCase()} Only</option>
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
                const tabId = e.target.dataset.tab === 'browse' ? 'browseTab' : 'uploadTab';
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Close modal
        const closeModal = () => {
            document.body.removeChild(modal);
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

        // Store reference for file selection
        this.currentFileSelectionContext = { cardId, fileType, audioLang, modal, closeModal };
    }

    generateCurrentFilePreview(filePath, fileType) {
        if (!filePath) {
            return `
                <div class="no-current-file">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No file currently assigned</p>
                </div>
            `;
        }

        if (fileType === 'png' || fileType === 'gif') {
            return `
                <div class="current-image-preview">
                    <img src="${filePath}" alt="Current file" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;">
                </div>
            `;
        } else if (fileType === 'audio') {
            return `
                <div class="current-audio-preview">
                    <div class="audio-preview-icon">
                        <i class="fas fa-file-audio"></i>
                    </div>
                    <button class="btn btn-primary btn-sm" id="playCurrentAudio">
                        <i class="fas fa-play"></i> Play Audio
                    </button>
                </div>
            `;
        }

        return '';
    }

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
            expectedPattern = `${cardNum}.*.*.png`;
            isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ext === 'png';
        } else if (fileType === 'gif') {
            expectedPattern = `${cardNum}.*.*.gif`;
            isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ext === 'gif';
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

    generateSuggestedFilename(card, fileType, audioLang = null) {
        const cardId = card.cardNum || card.wordNum;
        const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
        const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
        
        if (fileType === 'png') {
            return `${cardId}.${word}.${english}.png`;
        } else if (fileType === 'gif') {
            return `${cardId}.${word}.${english}.gif`;
        } else if (fileType === 'audio' && audioLang) {
            return `${cardId}.${audioLang}.${word}.${english}.mp3`;
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
        const suggestedName = this.generateSuggestedFilename(card, fileType, audioLang);
        
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
            // v4.0: audio is string
            card.audio = file.path;
            card.hasAudio = true;
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
                input.accept = 'image/png';
            } else if (fileType === 'gif') {
                input.accept = 'image/gif';
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

        toastManager.show(`Uploading ${file.name}...`, 'warning', 2000);

        // In production, this would upload to server
        const url = URL.createObjectURL(file);

        let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (!card) {
            card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
        }

        if (!card) return;

        // Generate proper filename
        const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
        const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
        const ext = file.name.split('.').pop();

        if (fileType === 'png') {
            card.printImagePath = `assets/${cardId}.${word}.${english}.png`;
        } else if (fileType === 'gif') {
            card.gifPath = `assets/${cardId}.${word}.${english}.gif`;
            card.hasGif = true;
        } else if (fileType === 'audio' && audioLang) {
            card.audio = `assets/${cardId}.${audioLang}.${word}.${english}.${ext}`;
            card.hasAudio = true;
        }

        this.editedCards.set(cardId, card);
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        toastManager.show(`File uploaded! Remember to save changes.`, 'success');
    }

    addNewCard(lessonNum = null, insertAfterCardId = null) {
        // Find the highest card number
        const allCardNums = [
            ...this.allCards.map(c => c.cardNum || c.wordNum),
            ...this.newCards.map(c => c.cardNum || c.wordNum)
        ];
        const maxCardNum = allCardNums.length > 0 ? Math.max(...allCardNums) : 0;
        const newCardNum = maxCardNum + 1;

        const lesson = lessonNum !== null ? lessonNum : (parseInt(document.getElementById('lessonFilter').value) || 1);

        // Create card in v4.0 format
        const newCard = {
            cardNum: newCardNum,
            lesson: lesson,
            type: 'N',
            word: '',
            english: '',
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

        toastManager.show('Changes saved successfully!', 'success', 3000);
        debugLogger?.log(2, `Deck Builder: Saved ${this.allCards.length} cards for ${this.currentLanguageName}`);
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
                '', // WordNote - not currently tracked in v4.0
                this.escapeCSV(this.getCardEnglish(card)),
                '', // EnglishNote - not currently tracked in v4.0
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
        // v4.0: audio is string, not object
        const hasAudio = !!card.audio || card.hasAudio;

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

    destroy() {
        super.destroy();
    }
}