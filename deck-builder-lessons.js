// =================================================================
// DECK BUILDER MODULE - LESSON MANAGEMENT
// Split from deck-builder-module.js for maintainability
// Contains: Lesson creation, card add/delete
// =================================================================

/**
 * Show modal for adding a new lesson
 */
DeckBuilderModule.prototype.showAddLessonModal = function(suggestedLessonNum = null) {
    // Get all existing lessons (from cards and from lessonMeta)
    const existingLessons = this.getAllExistingLessons();

    // Calculate suggested lesson number if not provided
    if (suggestedLessonNum === null) {
        suggestedLessonNum = existingLessons.length > 0 ? Math.max(...existingLessons) + 1 : 1;
    }

    // Get regular lessons only (for review checkboxes)
    const lessonMeta = this.assets?.manifest?.lessonMeta?.[this.currentTrigraph] || {};
    const regularLessons = existingLessons.filter(lesson => {
        const meta = lessonMeta[lesson];
        return !meta || meta.type !== 'review';
    });

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'file-selection-modal add-lesson-modal';
    modal.innerHTML = `
        <div class="file-selection-content" style="max-width: 500px;">
            <div class="file-selection-header">
                <h3>
                    <i class="fas fa-plus-circle"></i>
                    Add New Lesson
                </h3>
                <button class="close-modal-btn" id="closeAddLessonModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="file-selection-body" style="padding: 20px;">
                <div class="form-group">
                    <label for="newLessonNumber">Lesson Number:</label>
                    <input type="number" id="newLessonNumber" class="form-input"
                        value="${suggestedLessonNum}" min="1" style="width: 100px;">
                    <span id="lessonNumError" class="error-text" style="display: none; color: #ef4444; margin-left: 10px;"></span>
                </div>

                <div class="form-group" style="margin-top: 20px;">
                    <label>Lesson Type:</label>
                    <div class="lesson-type-options" style="display: flex; gap: 20px; margin-top: 10px;">
                        <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="lessonType" value="regular" checked>
                            <span><i class="fas fa-book"></i> Regular Lesson</span>
                        </label>
                        <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="lessonType" value="review">
                            <span><i class="fas fa-redo"></i> Review Lesson</span>
                        </label>
                    </div>
                </div>

                <div id="reviewLessonsSection" class="form-group" style="margin-top: 20px; display: none;">
                    <label>Select Lessons to Review:</label>
                    <div class="review-lessons-checkboxes" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; max-height: 200px; overflow-y: auto; padding: 10px; background: var(--bg-secondary); border-radius: 8px;">
                        ${regularLessons.length > 0 ? regularLessons.map(lesson => `
                            <label class="checkbox-option" style="display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 80px;">
                                <input type="checkbox" name="reviewLesson" value="${lesson}">
                                <span>Lesson ${lesson}</span>
                            </label>
                        `).join('') : '<span class="text-muted">No regular lessons available</span>'}
                    </div>
                </div>
            </div>

            <div class="file-selection-footer" style="padding: 15px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
                <button id="cancelAddLesson" class="btn btn-secondary">Cancel</button>
                <button id="confirmAddLesson" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Lesson
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Get references
    const lessonNumInput = modal.querySelector('#newLessonNumber');
    const lessonNumError = modal.querySelector('#lessonNumError');
    const lessonTypeRadios = modal.querySelectorAll('input[name="lessonType"]');
    const reviewSection = modal.querySelector('#reviewLessonsSection');
    const confirmBtn = modal.querySelector('#confirmAddLesson');

    // Show/hide review lessons section based on type
    lessonTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            reviewSection.style.display = radio.value === 'review' && radio.checked ? 'block' : 'none';
        });
    });

    // Validate lesson number on change
    lessonNumInput.addEventListener('input', () => {
        const num = parseInt(lessonNumInput.value);
        if (existingLessons.includes(num)) {
            lessonNumError.textContent = `Lesson ${num} already exists`;
            lessonNumError.style.display = 'inline';
            confirmBtn.disabled = true;
        } else if (num < 1) {
            lessonNumError.textContent = 'Must be at least 1';
            lessonNumError.style.display = 'inline';
            confirmBtn.disabled = true;
        } else {
            lessonNumError.style.display = 'none';
            confirmBtn.disabled = false;
        }
    });

    // Close modal handlers
    const closeModal = () => {
        modal.remove();
    };

    modal.querySelector('#closeAddLessonModal').addEventListener('click', closeModal);
    modal.querySelector('#cancelAddLesson').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Confirm add lesson
    confirmBtn.addEventListener('click', () => {
        const lessonNum = parseInt(lessonNumInput.value);
        const lessonType = modal.querySelector('input[name="lessonType"]:checked').value;

        // Get selected review lessons if review type
        let reviewsLessons = [];
        if (lessonType === 'review') {
            const checkedBoxes = modal.querySelectorAll('input[name="reviewLesson"]:checked');
            reviewsLessons = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        }

        // Validate
        if (existingLessons.includes(lessonNum)) {
            toastManager.show(`Lesson ${lessonNum} already exists`, 'error');
            return;
        }

        if (lessonType === 'review' && reviewsLessons.length === 0) {
            toastManager.show('Please select at least one lesson to review', 'error');
            return;
        }

        // Add the lesson
        this.addLesson(lessonNum, lessonType, reviewsLessons);
        closeModal();
    });
};

/**
 * Get all existing lesson numbers
 */
DeckBuilderModule.prototype.getAllExistingLessons = function() {
    // Get lessons from cards
    const cardLessons = new Set();
    this.allCards.forEach(card => {
        if (card.lesson) cardLessons.add(card.lesson);
    });
    this.newCards.forEach(card => {
        if (card.lesson) cardLessons.add(card.lesson);
    });

    // Get lessons from lessonMeta (includes review lessons)
    const lessonMeta = this.assets?.manifest?.lessonMeta?.[this.currentTrigraph] || {};
    Object.keys(lessonMeta).forEach(key => {
        cardLessons.add(parseInt(key));
    });

    return Array.from(cardLessons).sort((a, b) => a - b);
};

/**
 * Add a new lesson to the manifest
 */
DeckBuilderModule.prototype.addLesson = function(lessonNum, lessonType, reviewsLessons = []) {
    // Initialize lessonMeta in manifest if not exists
    if (!this.assets.manifest.lessonMeta) {
        this.assets.manifest.lessonMeta = {};
    }
    if (!this.assets.manifest.lessonMeta[this.currentTrigraph]) {
        this.assets.manifest.lessonMeta[this.currentTrigraph] = {};
    }

    // Add the lesson metadata
    this.assets.manifest.lessonMeta[this.currentTrigraph][lessonNum] = {
        type: lessonType,
        ...(lessonType === 'review' ? { reviewsLessons: reviewsLessons } : {})
    };

    // Track this as an edit
    this.lessonMetaEdited = true;

    if (lessonType === 'regular') {
        // For regular lessons, add a new card
        this.addNewCard(lessonNum);
        toastManager.show(`Lesson ${lessonNum} created with a new card. Fill in the details and save.`, 'success');
    } else {
        // For review lessons, just refresh the table
        this.filterAndRenderCards();
        this.updateUnsavedIndicator();
        toastManager.show(`Review lesson ${lessonNum} created (reviews: ${reviewsLessons.join(', ')}). Save to persist.`, 'success');
    }
};

/**
 * Add a new card
 */
DeckBuilderModule.prototype.addNewCard = function(lessonNum = null, insertAfterCardId = null) {
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
};

/**
 * Add a new card below an existing card
 */
DeckBuilderModule.prototype.addCardBelow = function(cardId) {
    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) return;

    this.addNewCard(card.lesson, cardId);
};

/**
 * Delete a card
 */
DeckBuilderModule.prototype.deleteCard = function(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) return;

    this.deletedCards.add(cardId);

    const newCardIndex = this.newCards.findIndex(c => (c.cardNum || c.wordNum) === cardId);
    if (newCardIndex !== -1) {
        this.newCards.splice(newCardIndex, 1);
    }

    this.filterAndRenderCards();
    this.updateUnsavedIndicator();

    toastManager.show('Card marked for deletion. Save changes to confirm.', 'warning');
};
