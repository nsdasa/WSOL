// =================================================================
// DECK BUILDER MODULE - MODALS
// Split from deck-builder-module.js for maintainability
// Contains: Categories modal, Notes modal
// =================================================================

/**
 * Handle card number changes with duplicate warning
 */
DeckBuilderModule.prototype.handleCardNumberChange = function(oldCardId, newCardId) {
    if (oldCardId === newCardId) return;

    // Check if new card number already exists
    const existingCard = this.allCards.find(c => (c.cardNum || c.wordNum) === newCardId);
    const existingNewCard = this.newCards.find(c => (c.cardNum || c.wordNum) === newCardId);

    if (existingCard || existingNewCard) {
        const targetCard = existingCard || existingNewCard;
        const langWord = this.getCardWord(targetCard);
        const engWord = this.getCardEnglish(targetCard);

        const message = `Card #${newCardId} already exists:\n\n` +
            `${this.currentLanguageName}: ${langWord}\n` +
            `English: ${engWord}\n` +
            `Lesson: ${targetCard.lesson}\n\n` +
            `Note: You can reuse the same card number for shared images. ` +
            `This is just a reminder that this number is already in use.`;

        alert(message);
    }

    // Proceed with the change
    this.handleFieldEdit(oldCardId, 'cardNum', newCardId);
};

/**
 * Open the categories modal for a card
 */
DeckBuilderModule.prototype.openCategoriesModal = function(cardId) {
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
};

/**
 * Close the categories modal
 */
DeckBuilderModule.prototype.closeCategoriesModal = function() {
    document.getElementById('categoriesModal').classList.add('hidden');
    this.currentCategoriesCardId = null;
};

/**
 * Save categories data from the modal
 */
DeckBuilderModule.prototype.saveCategoriesData = function() {
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
};

/**
 * Open the notes modal for a card
 */
DeckBuilderModule.prototype.openNotesModal = function(cardId, noteType) {
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
};

/**
 * Close the notes modal
 */
DeckBuilderModule.prototype.closeNotesModal = function() {
    document.getElementById('notesModal').classList.add('hidden');
    this.currentNotesCardId = null;
    this.currentNotesType = null;
};

/**
 * Save notes data from the modal
 */
DeckBuilderModule.prototype.saveNotesData = function() {
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
};
