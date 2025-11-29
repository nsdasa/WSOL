// =================================================================
// DECK BUILDER MODULE - SAVE & SYNC
// Split from deck-builder-module.js for maintainability
// Contains: Save changes, sentence sync, stats, utilities
// =================================================================

/**
 * Save all changes to the server
 */
DeckBuilderModule.prototype.saveChanges = async function() {
    const hasCardChanges = this.editedCards.size > 0 || this.deletedCards.size > 0;
    const hasLessonMetaChanges = this.lessonMetaEdited || false;

    if (!hasCardChanges && !hasLessonMetaChanges) {
        toastManager.show('No changes to save', 'warning');
        return;
    }

    let confirmMsg = '';
    if (hasCardChanges) {
        confirmMsg = `Save ${this.editedCards.size} edited/new cards and delete ${this.deletedCards.size} cards`;
    }
    if (hasLessonMetaChanges) {
        confirmMsg += (confirmMsg ? ', plus ' : 'Save ') + 'lesson metadata changes';
    }
    confirmMsg += '?';

    if (!confirm(confirmMsg)) {
        return;
    }

    // Capture card snapshot BEFORE applying changes (for sentence sync detection)
    if (hasCardChanges && this.cardSentenceSyncManager) {
        this.cardSentenceSyncManager.captureSnapshot();
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
        toastManager.show('Saving changes...', 'info');

        // Build payload - always include lessonMeta to ensure consistency
        const payload = {
            trigraph: this.currentTrigraph,
            languageName: this.currentLanguageName,
            cards: this.allCards,
            // Always include lessonMeta to ensure review lessons are preserved/updated
            lessonMeta: this.assets.manifest.lessonMeta?.[this.currentTrigraph] || {}
        };

        const response = await fetch('save-deck.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
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
        this.lessonMetaEdited = false;

        // Re-render
        this.filterAndRenderCards();
        this.updateStats();
        this.updateUnsavedIndicator();

        toastManager.show(`Saved! ${result.cardCount} cards written to manifest.json. Changes are live immediately - no rescan needed!`, 'success', 6000);
        debugLogger?.log(2, `Deck Builder: Saved ${this.allCards.length} cards for ${this.currentLanguageName} directly to manifest`);

        // Check if sentence data needs sync after card changes
        if (hasCardChanges && this.cardSentenceSyncManager) {
            this.checkSentenceSync();
        }
    } catch (err) {
        console.error('Save error:', err);
        toastManager.show('Error saving changes: ' + err.message, 'error', 5000);

        // Clear snapshot on error
        if (this.cardSentenceSyncManager) {
            this.cardSentenceSyncManager.clearSnapshot();
        }
    }
};

/**
 * Check if sentence data needs synchronization after card changes
 */
DeckBuilderModule.prototype.checkSentenceSync = function() {
    if (!this.cardSentenceSyncManager) return;

    try {
        const report = this.cardSentenceSyncManager.generateSyncReport();

        if (report.summary.totalWordLinksAffected > 0) {
            this.showSentenceSyncWarning(report);
        } else {
            // No sync needed, clear snapshot
            this.cardSentenceSyncManager.clearSnapshot();
            debugLogger?.log(3, 'CardSentenceSync: No sentence data affected by card changes');
        }
    } catch (err) {
        console.error('Sentence sync check error:', err);
        this.cardSentenceSyncManager.clearSnapshot();
    }
};

/**
 * Show warning popup about sentence data that may need attention
 */
DeckBuilderModule.prototype.showSentenceSyncWarning = function(report) {
    // Create modal for sync warning
    const existingModal = document.getElementById('sentenceSyncWarningModal');
    if (existingModal) existingModal.remove();

    const deletedCount = report.byIssueType.deleted.length;
    const changedCount = report.byIssueType.changed.length;

    const modal = document.createElement('div');
    modal.className = 'modal sentence-sync-modal';
    modal.id = 'sentenceSyncWarningModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header warning-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Sentence Data May Need Attention</h2>
                <button class="close-btn" id="closeSyncWarningBtn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="sync-warning-summary">
                    <p>Your card changes may affect sentence data:</p>
                    <ul class="sync-stats">
                        ${deletedCount > 0 ? `<li class="sync-stat-deleted"><i class="fas fa-trash"></i> <strong>${deletedCount}</strong> word(s) linked to deleted cards</li>` : ''}
                        ${changedCount > 0 ? `<li class="sync-stat-changed"><i class="fas fa-edit"></i> <strong>${changedCount}</strong> word(s) linked to modified cards</li>` : ''}
                        <li class="sync-stat-sentences"><i class="fas fa-align-left"></i> <strong>${report.summary.totalSentencesAffected}</strong> sentence(s) potentially affected</li>
                    </ul>
                </div>

                <div class="sync-recommendation">
                    <h4><i class="fas fa-lightbulb"></i> Recommendation</h4>
                    <p>Run the <strong>Sentence Sync Check</strong> to review and resolve any mismatches.
                    This will identify words that may need their picture links updated.</p>
                </div>

                <div class="sync-actions">
                    <button id="runSentenceSyncBtn" class="btn btn-primary btn-lg">
                        <i class="fas fa-sync"></i> Run Sentence Sync Check
                    </button>
                    <button id="skipSentenceSyncBtn" class="btn btn-secondary">
                        <i class="fas fa-forward"></i> Skip for Now
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('closeSyncWarningBtn')?.addEventListener('click', () => {
        this.cardSentenceSyncManager?.clearSnapshot();
        modal.remove();
    });

    document.getElementById('skipSentenceSyncBtn')?.addEventListener('click', () => {
        this.cardSentenceSyncManager?.clearSnapshot();
        modal.remove();
        toastManager?.show('You can run Sentence Sync Check later from the Sentence Review section', 'info');
    });

    document.getElementById('runSentenceSyncBtn')?.addEventListener('click', () => {
        modal.remove();
        this.runSentenceSyncCheck(report);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            this.cardSentenceSyncManager?.clearSnapshot();
            modal.remove();
        }
    });
};

/**
 * Run the full sentence sync check and show results
 */
DeckBuilderModule.prototype.runSentenceSyncCheck = function(report) {
    if (!this.cardSentenceSyncManager) return;

    // Get smart reparse recommendations
    const recommendations = this.cardSentenceSyncManager.smartReparse(report);

    // Show the sync results modal
    this.showSentenceSyncResults(report, recommendations);
};

/**
 * Show detailed sync results with options to apply fixes
 */
DeckBuilderModule.prototype.showSentenceSyncResults = function(report, recommendations) {
    const existingModal = document.getElementById('sentenceSyncResultsModal');
    if (existingModal) existingModal.remove();

    // Separate auto-fixable from needs-review
    const autoFixable = recommendations.filter(r => !r.needsReview);
    const needsReview = recommendations.filter(r => r.needsReview);

    const modal = document.createElement('div');
    modal.className = 'modal sentence-sync-modal';
    modal.id = 'sentenceSyncResultsModal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h2><i class="fas fa-clipboard-check"></i> Sentence Sync Results</h2>
                <button class="close-btn" id="closeSyncResultsBtn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="sync-results-summary">
                    <div class="sync-result-card auto-fix">
                        <i class="fas fa-magic"></i>
                        <span class="count">${autoFixable.length}</span>
                        <span class="label">Auto-fixable</span>
                    </div>
                    <div class="sync-result-card needs-review">
                        <i class="fas fa-user-edit"></i>
                        <span class="count">${needsReview.length}</span>
                        <span class="label">Needs Review</span>
                    </div>
                </div>

                ${autoFixable.length > 0 ? `
                    <div class="sync-section">
                        <h4><i class="fas fa-magic"></i> Auto-Fixable Items</h4>
                        <p class="section-desc">These changes can be applied automatically:</p>
                        <div class="sync-items-list auto-fix-list">
                            ${autoFixable.map((r, idx) => `
                                <div class="sync-item" data-index="${idx}">
                                    <span class="sync-item-action"><i class="fas fa-check-circle"></i> ${r.action.replace('_', ' ')}</span>
                                    <span class="sync-item-word">"${r.word}"</span>
                                    <span class="sync-item-sentence">${this.truncateText(r.sentenceText, 50)}</span>
                                    <span class="sync-item-message">${r.message}</span>
                                </div>
                            `).join('')}
                        </div>
                        <button id="applyAutoFixesBtn" class="btn btn-success">
                            <i class="fas fa-check"></i> Apply ${autoFixable.length} Auto-Fixes
                        </button>
                    </div>
                ` : ''}

                ${needsReview.length > 0 ? `
                    <div class="sync-section">
                        <h4><i class="fas fa-user-edit"></i> Items Needing Manual Review</h4>
                        <p class="section-desc">These items require manual attention in the Sentence Review Builder:</p>
                        <div class="sync-items-list needs-review-list">
                            ${needsReview.map((r, idx) => `
                                <div class="sync-item ${r.issue}" data-index="${idx}">
                                    <span class="sync-item-icon">
                                        ${r.issue === 'deleted' ? '<i class="fas fa-trash text-danger"></i>' : '<i class="fas fa-edit text-warning"></i>'}
                                    </span>
                                    <div class="sync-item-details">
                                        <div class="sync-item-location">
                                            Lesson ${r.lessonNum} -> ${r.sequenceTitle} -> Sentence ${r.sentenceIndex + 1}
                                        </div>
                                        <div class="sync-item-word-info">
                                            Word: "<strong>${r.word}</strong>" (was linked to Card #${r.cardNum})
                                        </div>
                                        <div class="sync-item-sentence-text">"${r.sentenceText}"</div>
                                        <div class="sync-item-message ${r.newCardNum ? 'has-suggestion' : 'no-match'}">
                                            ${r.message}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button id="openSentenceReviewBtn" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> Open Sentence Review Builder
                        </button>
                    </div>
                ` : ''}

                ${autoFixable.length === 0 && needsReview.length === 0 ? `
                    <div class="sync-empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h4>All Clear!</h4>
                        <p>No sentence data needs attention.</p>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button id="closeSyncResultsFinalBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeModal = () => {
        this.cardSentenceSyncManager?.clearSnapshot();
        modal.remove();
    };

    document.getElementById('closeSyncResultsBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeSyncResultsFinalBtn')?.addEventListener('click', closeModal);

    document.getElementById('applyAutoFixesBtn')?.addEventListener('click', async () => {
        const result = this.cardSentenceSyncManager.applyAutoFixes(recommendations);
        toastManager?.show(`Applied ${result.applied} automatic fixes`, 'success');

        // Save the sentence review data
        if (this.sentenceReviewBuilder) {
            await this.sentenceReviewBuilder.saveAll();
        }

        // Refresh the modal
        closeModal();

        if (result.needsReview > 0) {
            toastManager?.show(`${result.needsReview} items still need manual review`, 'info');
        }
    });

    document.getElementById('openSentenceReviewBtn')?.addEventListener('click', () => {
        closeModal();
        // Expand and scroll to sentence review section
        const srSection = document.getElementById('sentenceReviewSection');
        if (srSection) {
            srSection.classList.remove('collapsed');
            srSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

/**
 * Update statistics display
 */
DeckBuilderModule.prototype.updateStats = function() {
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
};

/**
 * Update unsaved changes indicator
 */
DeckBuilderModule.prototype.updateUnsavedIndicator = function() {
    const unsavedCount = this.editedCards.size + this.deletedCards.size;
    const hasLessonMetaChanges = this.lessonMetaEdited || false;
    const indicator = document.getElementById('unsavedCount');
    const saveBtn = document.getElementById('saveChangesBtn');

    if (unsavedCount > 0 || hasLessonMetaChanges) {
        const totalChanges = unsavedCount + (hasLessonMetaChanges ? 1 : 0);
        indicator.textContent = `${totalChanges} unsaved`;
        indicator.classList.remove('hidden');
        saveBtn.disabled = false;
    } else {
        indicator.classList.add('hidden');
        saveBtn.disabled = true;
    }
};

/**
 * Get word for current language - v4.0 uses direct properties
 */
DeckBuilderModule.prototype.getCardWord = function(card) {
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
};

/**
 * Get English translation - v4.0 uses direct property
 */
DeckBuilderModule.prototype.getCardEnglish = function(card) {
    // v4.0: direct card.english property
    if (card.english !== undefined) {
        return card.english || '';
    }
    // v3.x fallback
    if (card.translations?.english) {
        return card.translations.english.word || '';
    }
    return '';
};

/**
 * Get status class for a card
 */
DeckBuilderModule.prototype.getStatusClass = function(card) {
    const hasPng = !!card.printImagePath;
    const hasGif = card.hasGif || !!card.gifPath;
    // v4.0: audio is array - check for actual paths, not empty arrays
    const hasAudio = (Array.isArray(card.audio) ? card.audio.some(a => a && a.trim()) : !!card.audio) || card.hasAudio;

    if (hasPng && hasGif && hasAudio) return 'status-complete-animated';
    if (hasPng && hasAudio) return 'status-complete-static';
    if (hasPng || hasGif) return 'status-partial';
    return 'status-missing';
};

/**
 * Get status text for a card
 */
DeckBuilderModule.prototype.getStatusText = function(card) {
    const cls = this.getStatusClass(card);
    if (cls === 'status-complete-animated') return 'Complete (Animated)';
    if (cls === 'status-complete-static') return 'Complete (Static)';
    if (cls === 'status-partial') return 'Partial';
    return 'Missing';
};

/**
 * Capitalize first letter
 */
DeckBuilderModule.prototype.capitalize = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
