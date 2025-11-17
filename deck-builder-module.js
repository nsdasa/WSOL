// =================================================================
// DECK BUILDER MODULE - Bob and Mariel Ward School
// Version 3.2 - Card Deck Editor and Manager
// Updated: November 2025 - Enhanced with:
//   1. Dual "Add New Card" buttons (top + bottom)
//   2. Editable Card # with duplicate detection
//   3. Categories column with modal editor for Grammar/Category fields
// =================================================================

class DeckBuilderModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.currentLanguage = 'cebuano'; // Default language filter
        this.allCards = [];
        this.filteredCards = [];
        this.editedCards = new Map(); // Track unsaved changes
        this.deletedCards = new Set(); // Track deleted card IDs
        this.newCards = []; // Track new cards
        this.nextNewCardId = 10000; // Temporary IDs for new cards
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
                            <i class="fas fa-language"></i> Filter by Language:
                        </label>
                        <select id="languageFilter" class="select-control">
                            <option value="cebuano">Cebuano</option>
                            <option value="english">English</option>
                            <option value="maranao">Maranao</option>
                            <option value="sinama">Sinama</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="lessonFilter">
                            <i class="fas fa-filter"></i> Filter by Lesson:
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
                                <th style="width: 150px;">Audio Files</th>
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
        // Load all cards
        this.allCards = this.assets.cards || [];
        
        if (this.allCards.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.querySelector('.deck-table-container').style.display = 'none';
            return;
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

    populateLessonFilter() {
        const lessons = new Set();
        this.allCards.forEach(card => lessons.add(card.lesson));
        const sortedLessons = Array.from(lessons).sort((a, b) => a - b);

        const lessonFilter = document.getElementById('lessonFilter');
        sortedLessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = `Lesson ${lesson}`;
            lessonFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        // Language filter
        document.getElementById('languageFilter').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            document.getElementById('langHeader').textContent = this.capitalize(this.currentLanguage);
            this.filterAndRenderCards();
        });

        // Lesson filter
        document.getElementById('lessonFilter').addEventListener('change', () => {
            this.filterAndRenderCards();
        });

        // Search
        document.getElementById('searchCards').addEventListener('input', (e) => {
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
            // Skip deleted cards
            if (this.deletedCards.has(card.wordNum)) return false;

            // Lesson filter
            if (lessonFilter !== 'all' && card.lesson !== parseInt(lessonFilter)) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const wordText = this.getCardWord(card, this.currentLanguage).toLowerCase();
                const englishText = this.getCardWord(card, 'english').toLowerCase();
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
                const wordText = this.getCardWord(card, this.currentLanguage).toLowerCase();
                const englishText = this.getCardWord(card, 'english').toLowerCase();
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
        row.dataset.cardId = card.wordNum;
        
        const isNewCard = card.wordNum >= this.nextNewCardId - 1000;
        const isEdited = this.editedCards.has(card.wordNum);
        
        if (isNewCard || isEdited) {
            row.classList.add('edited-row');
        }

        // Lesson
        const lessonCell = document.createElement('td');
        lessonCell.innerHTML = `<input type="number" class="cell-input" value="${card.lesson || ''}" 
            data-field="lesson" data-card-id="${card.wordNum}" min="1" max="100">`;
        row.appendChild(lessonCell);

        // Type
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `
            <select class="cell-select" data-field="type" data-card-id="${card.wordNum}">
                <option value="N" ${card.type === 'N' ? 'selected' : ''}>N</option>
                <option value="R" ${card.type === 'R' ? 'selected' : ''}>R</option>
            </select>
        `;
        row.appendChild(typeCell);

        // Card # - NOW EDITABLE
        const cardNumCell = document.createElement('td');
        cardNumCell.innerHTML = `<input type="number" class="cell-input card-num-input" value="${card.wordNum}" 
            data-field="wordNum" data-card-id="${card.wordNum}" data-original-id="${card.wordNum}" min="1">`;
        row.appendChild(cardNumCell);

        // Language word (editable)
        const langWord = this.getCardWord(card, this.currentLanguage);
        const langCell = document.createElement('td');
        langCell.innerHTML = `<input type="text" class="cell-input" value="${langWord}" 
            data-field="${this.currentLanguage}" data-card-id="${card.wordNum}">`;
        row.appendChild(langCell);

        // English translation (editable)
        const engWord = this.getCardWord(card, 'english');
        const engCell = document.createElement('td');
        engCell.innerHTML = `<input type="text" class="cell-input" value="${engWord}" 
            data-field="english" data-card-id="${card.wordNum}">`;
        row.appendChild(engCell);

        // Categories button
        const categoriesCell = document.createElement('td');
        categoriesCell.innerHTML = `
            <button class="btn btn-sm btn-secondary categories-btn" data-card-id="${card.wordNum}" title="Edit Categories">
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

        // Audio files
        const audioCell = document.createElement('td');
        audioCell.appendChild(this.createAudioBadges(card));
        row.appendChild(audioCell);

        // Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = `<span class="status ${this.getStatusClass(card)}">${this.getStatusText(card)}</span>`;
        row.appendChild(statusCell);

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div style="display: flex; gap: 4px; justify-content: center;">
                <button class="btn-icon add-below-btn" data-card-id="${card.wordNum}" title="Add Card Below" style="color: var(--success);">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-icon delete-card-btn" data-card-id="${card.wordNum}" title="Delete Card">
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
        // Input changes - handle card number specially
        row.querySelectorAll('.cell-input, .cell-select').forEach(input => {
            if (input.classList.contains('card-num-input')) {
                input.addEventListener('blur', (e) => {
                    this.handleCardNumberChange(card.wordNum, parseInt(e.target.value));
                });
            } else {
                input.addEventListener('change', (e) => {
                    this.handleFieldEdit(card.wordNum, e.target.dataset.field, e.target.value);
                });
            }
        });

        // Categories button
        const categoriesBtn = row.querySelector('.categories-btn');
        if (categoriesBtn) {
            categoriesBtn.addEventListener('click', () => {
                this.openCategoriesModal(card.wordNum);
            });
        }

        // Add below button
        const addBelowBtn = row.querySelector('.add-below-btn');
        if (addBelowBtn) {
            addBelowBtn.addEventListener('click', () => {
                this.addCardBelow(card.wordNum);
            });
        }

        // Delete button
        const deleteBtn = row.querySelector('.delete-card-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteCard(card.wordNum);
            });
        }
    }

    handleCardNumberChange(oldCardNum, newCardNum) {
        if (oldCardNum === newCardNum) return;

        // Check if new card number already exists
        const existingCard = this.allCards.find(c => c.wordNum === newCardNum && c.wordNum !== oldCardNum);
        const existingNewCard = this.newCards.find(c => c.wordNum === newCardNum && c.wordNum !== oldCardNum);

        if (existingCard || existingNewCard) {
            const targetCard = existingCard || existingNewCard;
            const langWord = this.getCardWord(targetCard, this.currentLanguage);
            const engWord = this.getCardWord(targetCard, 'english');
            
            const message = `?? Card #${newCardNum} already exists:\n\n` +
                `${this.capitalize(this.currentLanguage)}: ${langWord}\n` +
                `English: ${engWord}\n` +
                `Lesson: ${targetCard.lesson}\n\n` +
                `Note: You can reuse the same card number for different words or audio files. ` +
                `This is just a reminder that this number is already in use.`;
            
            alert(message);
        }

        // Proceed with the change
        this.handleFieldEdit(oldCardNum, 'wordNum', newCardNum);
    }

    openCategoriesModal(cardId) {
        // Find card
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
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
        let card = this.allCards.find(c => c.wordNum === this.currentCategoriesCardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === this.currentCategoriesCardId);
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

        let hasFile = false;
        let filename = '';

        if (type === 'png') {
            hasFile = card.printImagePath || card.hasImage;
            filename = card.printImagePath ? card.printImagePath.split('/').pop() : '';
        } else if (type === 'gif') {
            hasFile = card.hasGif;
            filename = card.imagePath && card.hasGif ? card.imagePath.split('/').pop() : '';
        }

        const badge = document.createElement('span');
        badge.className = `file-badge ${type} ${hasFile ? 'has-file' : 'no-file'} upload-trigger`;
        badge.dataset.cardId = card.wordNum;
        badge.dataset.fileType = type;
        badge.innerHTML = hasFile 
            ? `<i class="fas fa-check"></i> ${type.toUpperCase()}`
            : `<i class="fas fa-folder-open"></i> ${type.toUpperCase()}`;
        badge.title = filename || `Click to select or upload ${type.toUpperCase()} file`;

        badge.addEventListener('click', () => {
            this.showFileSelectionModal(card.wordNum, type);
        });

        container.appendChild(badge);
        return container;
    }

    createAudioBadges(card) {
        const container = document.createElement('div');
        container.className = 'audio-badges-container';

        const languages = ['ceb', 'eng', 'mrw', 'sin'];
        languages.forEach(lang => {
            const hasAudio = card.audio && card.audio[lang];
            const badge = document.createElement('span');
            badge.className = `file-badge audio ${hasAudio ? 'has-file' : 'no-file'} upload-trigger`;
            badge.dataset.cardId = card.wordNum;
            badge.dataset.fileType = 'audio';
            badge.dataset.audioLang = lang;
            badge.innerHTML = hasAudio 
                ? `<i class="fas fa-check"></i> ${lang.toUpperCase()}`
                : `<i class="fas fa-folder-open"></i> ${lang.toUpperCase()}`;
            badge.title = hasAudio ? card.audio[lang].split('/').pop() : `Click to select or upload ${lang.toUpperCase()} audio`;

            badge.addEventListener('click', () => {
                this.showFileSelectionModal(card.wordNum, 'audio', lang);
            });

            container.appendChild(badge);
        });

        return container;
    }

    handleFieldEdit(cardId, field, value) {
        // Find card in allCards or newCards
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
        }

        if (!card) return;

        // Update card data
        if (field === 'lesson') {
            card.lesson = parseInt(value) || 1;
        } else if (field === 'type') {
            card.type = value;
        } else if (field === 'wordNum') {
            const newWordNum = parseInt(value);
            if (!isNaN(newWordNum)) {
                card.wordNum = newWordNum;
                // Update the map key
                if (this.editedCards.has(cardId)) {
                    const editedCard = this.editedCards.get(cardId);
                    this.editedCards.delete(cardId);
                    this.editedCards.set(newWordNum, editedCard);
                }
            }
        } else if (['cebuano', 'english', 'maranao', 'sinama'].includes(field)) {
            if (!card.translations) {
                card.translations = {};
            }
            if (!card.translations[field]) {
                card.translations[field] = { word: '', note: '', acceptableAnswers: [] };
            }
            card.translations[field].word = value;
            card.translations[field].acceptableAnswers = value.split('/').map(w => w.trim());
        }

        // Mark as edited
        if (!this.editedCards.has(card.wordNum)) {
            this.editedCards.set(card.wordNum, card);
        }

        this.updateUnsavedIndicator();
    }

    showFileSelectionModal(cardId, fileType, audioLang = null) {
        // Find card and get current file
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
        }

        if (!card) return;

        // Determine current file path
        let currentFilePath = null;
        let currentFileName = 'No file selected';
        
        if (fileType === 'png') {
            currentFilePath = card.printImagePath;
        } else if (fileType === 'gif') {
            currentFilePath = card.imagePath && card.hasGif ? card.imagePath : null;
        } else if (fileType === 'audio' && audioLang) {
            currentFilePath = card.audio && card.audio[audioLang] ? card.audio[audioLang] : null;
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
                                <option value="${fileType}">${fileType.toUpperCase()} Only</option>
                            </select>
                        </div>
                        <div class="file-browser-grid" id="fileBrowserGrid">
                            <div class="loading-files">
                                <i class="fas fa-spinner fa-spin"></i> Loading files...
                            </div>
                        </div>
                    </div>

                    <!-- Upload Tab -->
                    <div class="tab-content" id="uploadTab">
                        <div class="upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <h4>Upload New ${fileType.toUpperCase()} File</h4>
                            <p>Select a file from your computer</p>
                            <button class="btn btn-primary" id="selectFileBtn">
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
            // Call PHP endpoint to get file list
            const response = await fetch('list-assets.php?type=' + fileType);
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
                    <p style="margin-top:12px;font-size:12px;">
                        Note: You need to create <code>list-assets.php</code> on your server.
                        See integration guide for code.
                    </p>
                </div>
            `;
            debugLogger.log(1, `Error loading server files: ${err.message}`);
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
            } else if (file.type === 'mp3') {
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
                        ${file.type === 'mp3' ? '<span class="audio-play-btn" title="Preview audio"><i class="fas fa-play"></i></span>' : ''}
                    </div>
                </div>
                <div class="file-select-overlay">
                    <button class="btn btn-success btn-sm">
                        <i class="fas fa-check"></i> Select
                    </button>
                </div>
            `;

            // Click to select
            fileItem.addEventListener('click', () => {
                this.selectExistingFile(file);
            });

            // Audio preview
            if (file.type === 'mp3') {
                const playBtn = fileItem.querySelector('.audio-play-btn');
                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const audio = new Audio(file.path);
                        audio.play();
                    });
                }
            }

            grid.appendChild(fileItem);
        });
    }

    filterServerFiles(searchTerm, filterType) {
        if (!this.serverFiles) return;

        let filtered = this.serverFiles;

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(f => f.type === filterType);
        }

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(f => 
                f.name.toLowerCase().includes(term)
            );
        }

        this.displayServerFiles(filtered);
    }

    selectExistingFile(file) {
        const { cardId, fileType, audioLang, closeModal } = this.currentFileSelectionContext;

        // Find card
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
        }

        if (!card) return;

        // Update card with selected file
        if (fileType === 'png') {
            card.printImagePath = file.path;
            card.hasImage = true;
        } else if (fileType === 'gif') {
            card.imagePath = file.path;
            card.hasGif = true;
            card.hasImage = true;
        } else if (fileType === 'audio' && audioLang) {
            if (!card.audio) card.audio = {};
            card.audio[audioLang] = file.path;
            card.hasAudio = true;
        }

        // Mark as edited
        this.editedCards.set(cardId, card);

        // Re-render
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        closeModal();

        toastManager.show(`File "${file.name}" linked to card!`, 'success');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async handleFileUpload(cardId, fileType, audioLang = null, file = null) {
        // If no file provided, open file picker
        if (!file) {
            const input = document.createElement('input');
            input.type = 'file';
            
            if (fileType === 'png') {
                input.accept = 'image/png';
            } else if (fileType === 'gif') {
                input.accept = 'image/gif';
            } else if (fileType === 'audio') {
                input.accept = 'audio/mp3,audio/mpeg';
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
        // For now, we'll simulate by creating object URL
        const url = URL.createObjectURL(file);

        // Find card
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
        }

        if (!card) return;

        // Update card with file info
        if (fileType === 'png') {
            card.printImagePath = `assets/${cardId}.${file.name.split('.').pop()}`;
            card.hasImage = true;
        } else if (fileType === 'gif') {
            card.imagePath = `assets/${cardId}.${file.name.split('.').pop()}`;
            card.hasGif = true;
            card.hasImage = true;
        } else if (fileType === 'audio' && audioLang) {
            if (!card.audio) card.audio = {};
            card.audio[audioLang] = `assets/${cardId}.${audioLang}.${file.name.split('.').pop()}`;
            card.hasAudio = true;
        }

        // Mark as edited
        this.editedCards.set(cardId, card);

        // Re-render table
        this.filterAndRenderCards();

        this.updateUnsavedIndicator();

        toastManager.show(`File "${file.name}" uploaded! Remember to save changes.`, 'success');
    }

    addNewCard(lessonNum = null, insertAfterCardId = null) {
        // Find the highest card number
        const allCardNums = [
            ...this.allCards.map(c => c.wordNum),
            ...this.newCards.map(c => c.wordNum)
        ];
        const maxCardNum = allCardNums.length > 0 ? Math.max(...allCardNums) : 0;
        const newCardNum = maxCardNum + 1;

        // Use provided lesson or default to filter or 1
        const lesson = lessonNum !== null ? lessonNum : (parseInt(document.getElementById('lessonFilter').value) || 1);

        const newCard = {
            wordNum: newCardNum,
            lesson: lesson,
            type: 'N',
            translations: {
                cebuano: { word: '', note: '', acceptableAnswers: [] },
                english: { word: '', note: '', acceptableAnswers: [] },
                maranao: { word: '', note: '', acceptableAnswers: [] },
                sinama: { word: '', note: '', acceptableAnswers: [] }
            },
            imagePath: null,
            printImagePath: null,
            hasImage: false,
            hasGif: false,
            hasAudio: false,
            audio: {},
            grammar: null,
            category: null,
            subCategory1: null,
            subCategory2: null,
            actflEst: null
        };

        // If insertAfterCardId is provided, insert at specific position
        if (insertAfterCardId !== null) {
            const insertIndex = this.newCards.findIndex(c => c.wordNum === insertAfterCardId);
            if (insertIndex !== -1) {
                this.newCards.splice(insertIndex + 1, 0, newCard);
            } else {
                this.newCards.push(newCard);
            }
        } else {
            this.newCards.push(newCard);
        }

        this.editedCards.set(newCard.wordNum, newCard);

        this.filterAndRenderCards();
        this.updateUnsavedIndicator();

        // Scroll to the new card
        setTimeout(() => {
            const newRow = document.querySelector(`tr[data-card-id="${newCardNum}"]`);
            if (newRow) {
                newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly highlight the new row
                newRow.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';
                setTimeout(() => {
                    newRow.style.backgroundColor = '';
                }, 2000);
            }
        }, 100);

        toastManager.show(`New card #${newCardNum} added. Fill in the details and save.`, 'success');
    }

    addCardBelow(cardId) {
        // Find the card to get its lesson
        let card = this.allCards.find(c => c.wordNum === cardId);
        if (!card) {
            card = this.newCards.find(c => c.wordNum === cardId);
        }

        if (!card) return;

        // Add new card with the same lesson
        this.addNewCard(card.lesson, cardId);
    }

    deleteCard(cardId) {
        if (!confirm('Are you sure you want to delete this card?')) return;

        // Mark as deleted
        this.deletedCards.add(cardId);

        // Remove from newCards if it's a new card
        const newCardIndex = this.newCards.findIndex(c => c.wordNum === cardId);
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

        // In production, this would send data to server
        // For now, update local manifest

        // Apply edits
        this.editedCards.forEach((editedCard, cardId) => {
            const index = this.allCards.findIndex(c => c.wordNum === cardId);
            if (index !== -1) {
                this.allCards[index] = editedCard;
            } else {
                // New card
                this.allCards.push(editedCard);
            }
        });

        // Apply deletions
        this.deletedCards.forEach(cardId => {
            const index = this.allCards.findIndex(c => c.wordNum === cardId);
            if (index !== -1) {
                this.allCards.splice(index, 1);
            }
        });

        // Update asset manager
        this.assets.cards = this.allCards;

        // Clear tracking
        this.editedCards.clear();
        this.deletedCards.clear();
        this.newCards = [];

        // Re-render
        this.filterAndRenderCards();
        this.updateStats();
        this.updateUnsavedIndicator();

        toastManager.show('Changes saved successfully!', 'success', 3000);

        debugLogger.log(2, `Deck Builder: Saved changes to ${this.allCards.length} cards`);
    }

    exportToCSV() {
        const csv = this.generateCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Word_List_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toastManager.show('CSV exported successfully!', 'success');
    }

    generateCSV() {
        const headers = [
            'Lesson', 'WordNum', 'Cebuano', 'CebuanoNote', 'English', 'EnglishNote',
            'Maranao', 'MaranaoNote', 'Sinama', 'SinamaNote',
            'Grammar', 'Category', 'SubCategory1', 'SubCategory2', 'ACTFLEst', 'Type'
        ];

        let csv = headers.join(',') + '\n';

        this.allCards.forEach(card => {
            const row = [
                card.lesson || '',
                card.wordNum || '',
                this.escapeCSV(card.translations?.cebuano?.word || ''),
                this.escapeCSV(card.translations?.cebuano?.note || ''),
                this.escapeCSV(card.translations?.english?.word || ''),
                this.escapeCSV(card.translations?.english?.note || ''),
                this.escapeCSV(card.translations?.maranao?.word || ''),
                this.escapeCSV(card.translations?.maranao?.note || ''),
                this.escapeCSV(card.translations?.sinama?.word || ''),
                this.escapeCSV(card.translations?.sinama?.note || ''),
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
            if (this.getStatusClass(card) === 'status-complete-animated' || 
                this.getStatusClass(card) === 'status-complete-static') {
                complete++;
            }
            if (this.getStatusClass(card) === 'status-missing') {
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

    getCardWord(card, language) {
        if (!card.translations || !card.translations[language]) {
            return '';
        }
        return card.translations[language].word || '';
    }

    getStatusClass(card) {
        const hasPng = card.printImagePath || card.hasImage;
        const hasGif = card.hasGif;
        const hasAudio = card.hasAudio;

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