// =================================================================
// DECK BUILDER MODULE - TABLE RENDERING
// Split from deck-builder-module.js for maintainability
// Contains: Table rendering, sorting, filtering, card rows
// =================================================================

/**
 * Sort cards by the current sort column and direction
 */
DeckBuilderModule.prototype.sortCards = function(cards) {
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
};

/**
 * Handle column header click for sorting
 */
DeckBuilderModule.prototype.handleSortClick = function(column) {
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
};

/**
 * Update sort icons in header
 */
DeckBuilderModule.prototype.updateSortIcons = function() {
    document.querySelectorAll('.sortable-header').forEach(header => {
        const icon = header.querySelector('.sort-icon');
        const column = header.dataset.sort;

        if (column === this.sortColumn) {
            icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon active`;
        } else {
            icon.className = 'fas fa-sort sort-icon';
        }
    });
};

/**
 * Setup collapsible sections with localStorage persistence
 */
DeckBuilderModule.prototype.setupCollapsibleSections = function() {
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
};

/**
 * Toggle a collapsible section and save state
 */
DeckBuilderModule.prototype.toggleSection = function(section, storageKey) {
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
};

/**
 * Setup event listeners for filters, buttons, and modals
 */
DeckBuilderModule.prototype.setupEventListeners = function() {
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
        // Notify sentence review builder of language change
        this.notifySentenceReviewBuilderLanguageChange(trigraph);
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

    // Add card - TWO buttons (inline and bottom)
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

    // Export CSV - show modal
    document.getElementById('exportCSVBtn').addEventListener('click', () => {
        this.showExportCSVModal();
    });

    // Export CSV modal buttons
    document.getElementById('closeExportCSVModal').addEventListener('click', () => {
        this.closeExportCSVModal();
    });

    document.getElementById('cancelExportCSVBtn').addEventListener('click', () => {
        this.closeExportCSVModal();
    });

    document.getElementById('exportLanguageListBtn').addEventListener('click', () => {
        this.exportLanguageListCSV();
        this.closeExportCSVModal();
    });

    document.getElementById('exportWordListBtn').addEventListener('click', () => {
        this.exportWordListCSV();
        this.closeExportCSVModal();
    });

    document.getElementById('exportSentenceWordsBtn').addEventListener('click', () => {
        this.exportSentenceWordsCSV();
        this.closeExportCSVModal();
    });

    document.getElementById('exportSentenceReviewBtn').addEventListener('click', () => {
        this.exportSentenceReviewCSV();
        this.closeExportCSVModal();
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
            const exportModal = document.getElementById('exportCSVModal');
            if (exportModal && !exportModal.classList.contains('hidden')) {
                this.closeExportCSVModal();
            }
        }
    });

    // Update sort icons initially
    this.updateSortIcons();
};

/**
 * Filter cards and re-render the table
 */
DeckBuilderModule.prototype.filterAndRenderCards = function() {
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
};

/**
 * Render the card table with lesson grouping
 */
DeckBuilderModule.prototype.renderTable = function() {
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

    // Get lessonMeta for review lessons
    const lessonMeta = this.assets?.manifest?.lessonMeta?.[this.currentTrigraph] || {};

    // Add review lessons (which have no cards) to lessonGroups
    Object.keys(lessonMeta).forEach(lessonNum => {
        const num = parseInt(lessonNum);
        if (lessonMeta[lessonNum].type === 'review' && !lessonGroups.has(num)) {
            lessonGroups.set(num, []);
        }
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

        // Check if this is a review lesson
        const meta = lessonMeta[lesson] || {};
        const isReviewLesson = meta.type === 'review';
        const reviewsLessons = meta.reviewsLessons || [];

        // Create lesson header row
        const headerRow = document.createElement('tr');
        headerRow.className = `lesson-header-row ${isCollapsed ? 'collapsed' : ''} ${isReviewLesson ? 'review-lesson' : ''}`;
        headerRow.dataset.lesson = lesson;

        const headerCell = document.createElement('td');
        // Dynamic colspan: recorder has 4 columns, others have 10
        headerCell.colSpan = this.isRecorder ? 4 : 10;
        headerCell.className = 'lesson-header-cell';

        // Build lesson info display
        let lessonInfo = '';
        if (isReviewLesson) {
            lessonInfo = `<span class="lesson-review-badge"><i class="fas fa-redo"></i> Review</span>
                <span class="lesson-reviews">Reviews: ${reviewsLessons.join(', ') || 'None'}</span>`;
        } else {
            lessonInfo = `<span class="lesson-count">${cards.length} card${cards.length !== 1 ? 's' : ''}</span>`;
        }

        // Add lesson button only for users who can edit cards
        const addLessonBtn = this.canEditCards ? `
            <button class="btn-icon add-lesson-btn" data-after-lesson="${lesson}" title="Add Lesson After ${lesson}">
                <i class="fas fa-plus-circle"></i>
            </button>` : '';

        headerCell.innerHTML = `
            <div class="lesson-header">
                <i class="fas fa-chevron-right lesson-chevron"></i>
                <span class="lesson-title">Lesson ${lesson}</span>
                ${lessonInfo}
                ${addLessonBtn}
            </div>
        `;

        // Add click handler for expand/collapse (but not on the add button)
        headerCell.addEventListener('click', (e) => {
            if (!e.target.closest('.add-lesson-btn')) {
                this.toggleLessonGroup(lesson, headerRow, storageKey);
            }
        });

        // Add click handler for add lesson button
        const addBtn = headerCell.querySelector('.add-lesson-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddLessonModal(lesson + 1);
            });
        }

        headerRow.appendChild(headerCell);
        tbody.appendChild(headerRow);

        // Create card rows for this lesson (only if not a review lesson)
        if (!isReviewLesson) {
            cards.forEach(card => {
                const row = this.createCardRow(card);
                row.classList.add('lesson-card-row');
                row.dataset.lesson = lesson;
                if (isCollapsed) {
                    row.classList.add('hidden');
                }
                tbody.appendChild(row);
            });
        }
    });
};

/**
 * Toggle lesson group expand/collapse
 */
DeckBuilderModule.prototype.toggleLessonGroup = function(lesson, headerRow, storageKey) {
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
};

/**
 * Create a table row for a card
 */
DeckBuilderModule.prototype.createCardRow = function(card) {
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
};

/**
 * Attach event listeners to a card row
 */
DeckBuilderModule.prototype.attachRowEventListeners = function(row, card) {
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
};
