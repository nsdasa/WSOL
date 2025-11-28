// =================================================================
// CARD-SENTENCE SYNC MANAGER
// Version 1.0 - November 2025
// Handles detection of card changes and synchronization with sentences
// =================================================================

/**
 * CardSentenceSyncManager - Manages synchronization between card deck and sentence data
 *
 * Key features:
 * - Captures card state before saves (snapshot)
 * - Detects which cards changed (word/imagePath modified)
 * - Finds sentences linked to changed cards
 * - Generates mismatch reports preserving manual linkages
 */
class CardSentenceSyncManager {
    constructor(deckBuilder) {
        this.deckBuilder = deckBuilder;
        this.cardSnapshot = null; // Pre-save card state: Map<cardNum, {word, imagePath}>
        this.lastChangedCards = null; // Set of cardNums that changed in last save
    }

    /**
     * Capture card state before a save operation
     * Call this immediately before saving cards
     */
    captureSnapshot() {
        const cards = this.deckBuilder.allCards || [];
        this.cardSnapshot = new Map();

        cards.forEach(card => {
            const cardNum = card.cardNum || card.wordNum;
            if (cardNum) {
                this.cardSnapshot.set(cardNum, {
                    word: card.word?.toLowerCase().trim() || '',
                    imagePath: card.printImagePath || card.imagePath || '',
                    variants: (card.word || '').toLowerCase().split('/').map(v => v.trim())
                });
            }
        });

        debugLogger?.log(3, `CardSentenceSyncManager: Captured snapshot of ${this.cardSnapshot.size} cards`);
        return this.cardSnapshot;
    }

    /**
     * Detect which cards changed after a save operation
     * Compares current card state to the pre-save snapshot
     * @returns {Object} { changedCards: Set<cardNum>, deletedCards: Set<cardNum>, newCards: Set<cardNum> }
     */
    detectChanges() {
        if (!this.cardSnapshot) {
            debugLogger?.log(2, 'CardSentenceSyncManager: No snapshot available for comparison');
            return { changedCards: new Set(), deletedCards: new Set(), newCards: new Set() };
        }

        const currentCards = this.deckBuilder.allCards || [];
        const currentCardMap = new Map();

        currentCards.forEach(card => {
            const cardNum = card.cardNum || card.wordNum;
            if (cardNum) {
                currentCardMap.set(cardNum, {
                    word: card.word?.toLowerCase().trim() || '',
                    imagePath: card.printImagePath || card.imagePath || '',
                    variants: (card.word || '').toLowerCase().split('/').map(v => v.trim())
                });
            }
        });

        const changedCards = new Set();
        const deletedCards = new Set();
        const newCards = new Set();

        // Check for modified and deleted cards
        this.cardSnapshot.forEach((oldData, cardNum) => {
            const newData = currentCardMap.get(cardNum);

            if (!newData) {
                // Card was deleted
                deletedCards.add(cardNum);
            } else if (this.hasCardChanged(oldData, newData)) {
                // Card was modified
                changedCards.add(cardNum);
            }
        });

        // Check for new cards
        currentCardMap.forEach((data, cardNum) => {
            if (!this.cardSnapshot.has(cardNum)) {
                newCards.add(cardNum);
            }
        });

        this.lastChangedCards = { changedCards, deletedCards, newCards };

        debugLogger?.log(3, `CardSentenceSyncManager: Detected ${changedCards.size} changed, ${deletedCards.size} deleted, ${newCards.size} new cards`);

        return this.lastChangedCards;
    }

    /**
     * Check if a card's relevant properties changed
     */
    hasCardChanged(oldData, newData) {
        // Word changed
        if (oldData.word !== newData.word) return true;

        // Image path changed
        if (oldData.imagePath !== newData.imagePath) return true;

        return false;
    }

    /**
     * Find all sentences that are linked to the changed/deleted cards
     * @param {Object} changes - Result from detectChanges()
     * @returns {Array} Array of affected sentence references
     */
    findAffectedSentences(changes) {
        const affected = [];
        const manifest = this.deckBuilder.assets.manifest;
        const trigraph = this.deckBuilder.currentTrigraph;

        // Get sentence review data
        const srData = manifest?.sentenceReview?.[trigraph]?.lessons;
        if (!srData) {
            debugLogger?.log(3, 'CardSentenceSyncManager: No sentence review data found');
            return affected;
        }

        // All cards that could cause issues
        const problemCards = new Set([
            ...changes.changedCards,
            ...changes.deletedCards
        ]);

        if (problemCards.size === 0) {
            return affected;
        }

        // Scan all sentences for links to problem cards
        Object.entries(srData).forEach(([lessonNum, lessonData]) => {
            lessonData.sequences?.forEach((sequence, seqIndex) => {
                sequence.sentences?.forEach((sentence, sentIndex) => {
                    sentence.words?.forEach((word, wordIndex) => {
                        if (word.cardNum && problemCards.has(word.cardNum)) {
                            const isDeleted = changes.deletedCards.has(word.cardNum);
                            const isChanged = changes.changedCards.has(word.cardNum);

                            affected.push({
                                lessonNum: parseInt(lessonNum),
                                sequenceIndex: seqIndex,
                                sequenceTitle: sequence.title,
                                sentenceIndex: sentIndex,
                                sentenceText: sentence.text,
                                sentenceEnglish: sentence.english,
                                wordIndex: wordIndex,
                                word: word.word,
                                cardNum: word.cardNum,
                                currentImagePath: word.imagePath,
                                issue: isDeleted ? 'deleted' : 'changed',
                                oldCardData: this.cardSnapshot.get(word.cardNum),
                                manuallyLinked: word.needsResolution === false && word.cardNum != null
                            });
                        }
                    });
                });
            });
        });

        debugLogger?.log(3, `CardSentenceSyncManager: Found ${affected.length} affected sentence-word links`);
        return affected;
    }

    /**
     * Generate a full sync report
     * @returns {Object} Report with affected sentences grouped by issue type
     */
    generateSyncReport() {
        const changes = this.detectChanges();
        const affectedSentences = this.findAffectedSentences(changes);

        const report = {
            timestamp: new Date().toISOString(),
            trigraph: this.deckBuilder.currentTrigraph,
            summary: {
                totalCardsChanged: changes.changedCards.size,
                totalCardsDeleted: changes.deletedCards.size,
                totalCardsNew: changes.newCards.size,
                totalSentencesAffected: new Set(affectedSentences.map(a =>
                    `${a.lessonNum}-${a.sequenceIndex}-${a.sentenceIndex}`
                )).size,
                totalWordLinksAffected: affectedSentences.length
            },
            changedCards: Array.from(changes.changedCards),
            deletedCards: Array.from(changes.deletedCards),
            newCards: Array.from(changes.newCards),
            affectedSentences: affectedSentences,
            byIssueType: {
                deleted: affectedSentences.filter(a => a.issue === 'deleted'),
                changed: affectedSentences.filter(a => a.issue === 'changed')
            }
        };

        return report;
    }

    /**
     * Check if sync is needed (any cards changed that are linked to sentences)
     */
    isSyncNeeded() {
        const report = this.generateSyncReport();
        return report.summary.totalWordLinksAffected > 0;
    }

    /**
     * Smart re-parse: Only re-evaluate words linked to changed cards
     * Preserves manual linkages for unchanged cards
     * @param {Object} report - Sync report from generateSyncReport()
     * @returns {Array} Array of recommended actions
     */
    smartReparse(report) {
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });
        const recommendations = [];

        report.affectedSentences.forEach(affected => {
            const currentCard = allCards.find(c => c.cardNum === affected.cardNum);

            if (affected.issue === 'deleted') {
                // Card was deleted - need to find new match or mark as function word
                const newMatch = SentenceReviewParser.findCardForWord(
                    affected.word,
                    null, // No root hint
                    allCards
                );

                recommendations.push({
                    ...affected,
                    action: newMatch ? 'reassign' : 'make_function_word',
                    newCardNum: newMatch?.cardNum || null,
                    newImagePath: newMatch?.imagePath || null,
                    needsReview: true,
                    message: newMatch
                        ? `Card #${affected.cardNum} deleted. Found potential match: Card #${newMatch.cardNum}`
                        : `Card #${affected.cardNum} deleted. No replacement found - will become function word.`
                });
            } else if (affected.issue === 'changed') {
                // Card word/image changed - check if still valid for this sentence word
                const cardWord = currentCard?.word?.toLowerCase().trim() || '';
                const sentenceWord = affected.word.toLowerCase().trim();
                const cardVariants = cardWord.split('/').map(v => v.trim());

                // Check if the sentence word still matches the card
                const stillMatches = cardVariants.includes(sentenceWord) ||
                    cardWord === sentenceWord ||
                    (currentCard?.acceptableAnswers || []).some(a =>
                        a.toLowerCase().trim() === sentenceWord
                    );

                if (stillMatches) {
                    // Card still matches - just update the image path if needed
                    const newImagePath = currentCard?.printImagePath || currentCard?.imagePath;
                    if (newImagePath !== affected.currentImagePath) {
                        recommendations.push({
                            ...affected,
                            action: 'update_image',
                            newCardNum: affected.cardNum,
                            newImagePath: newImagePath,
                            needsReview: false,
                            message: `Card #${affected.cardNum} image updated. Auto-applying new image path.`
                        });
                    } else {
                        recommendations.push({
                            ...affected,
                            action: 'no_change',
                            needsReview: false,
                            message: `Card #${affected.cardNum} word still matches "${affected.word}". No action needed.`
                        });
                    }
                } else {
                    // Word no longer matches the card - need manual review
                    const newMatch = SentenceReviewParser.findCardForWord(
                        affected.word,
                        null,
                        allCards
                    );

                    recommendations.push({
                        ...affected,
                        action: newMatch ? 'suggest_reassign' : 'needs_manual_link',
                        newCardNum: newMatch?.cardNum || null,
                        newImagePath: newMatch?.imagePath || null,
                        needsReview: true,
                        message: `Card #${affected.cardNum} word changed from "${affected.oldCardData?.word}" to "${cardWord}". ` +
                            (newMatch
                                ? `Suggested match: Card #${newMatch.cardNum}`
                                : `No automatic match found - needs manual linking.`)
                    });
                }
            }
        });

        return recommendations;
    }

    /**
     * Apply automatic fixes from recommendations (where needsReview is false)
     * @param {Array} recommendations - From smartReparse()
     * @returns {Object} { applied: number, needsReview: number }
     */
    applyAutoFixes(recommendations) {
        const manifest = this.deckBuilder.assets.manifest;
        const trigraph = this.deckBuilder.currentTrigraph;
        const srData = manifest?.sentenceReview?.[trigraph]?.lessons;

        if (!srData) return { applied: 0, needsReview: recommendations.length };

        let applied = 0;
        let needsReview = 0;

        recommendations.forEach(rec => {
            if (rec.needsReview) {
                needsReview++;
                return;
            }

            // Apply the fix
            const sentence = srData[rec.lessonNum]?.sequences?.[rec.sequenceIndex]?.sentences?.[rec.sentenceIndex];
            if (!sentence) return;

            const word = sentence.words?.[rec.wordIndex];
            if (!word) return;

            switch (rec.action) {
                case 'update_image':
                    word.imagePath = rec.newImagePath;
                    applied++;
                    break;
                case 'no_change':
                    // Nothing to do
                    applied++;
                    break;
            }
        });

        return { applied, needsReview };
    }

    /**
     * Clear the snapshot (call after sync is complete or cancelled)
     */
    clearSnapshot() {
        this.cardSnapshot = null;
        this.lastChangedCards = null;
    }
}

// Export for use in deck builder
if (typeof window !== 'undefined') {
    window.CardSentenceSyncManager = CardSentenceSyncManager;
}
