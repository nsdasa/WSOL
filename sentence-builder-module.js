// =================================================================
// SENTENCE BUILDER MODULE - Bob and Mariel Ward School
// Version 1.0 - November 2025
// Build sentences word-by-word using picture cards
// =================================================================

class SentenceBuilderModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.sentenceFrames = []; // Array of selected cards
        this.currentFrameIndex = 0; // Which frame is being filled
        this.availableWordTypes = []; // Word types from CSV columns
        this.wordsByType = {}; // Words organized by type for current lesson
        this.frameSize = 160; // Match-sound module size
        this.maxFramesPerRow = 4; // Will be calculated based on screen
        this.selectedFrameIndex = null; // Frame being edited
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonDisplay = (filterManager && filterManager.isActive())
            ? 'Special'
            : (this.assets.currentLesson || 'Lesson');

        this.container.innerHTML = `
            <div class="container module-sentence-builder">
                <h1><i class="fas fa-bars-staggered"></i> Sentence Builder (${langName}: Lesson ${lessonDisplay})</h1>

                <div class="controls">
                    <button id="resetSentenceBtn" class="btn btn-warning">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                    <button id="playSentenceBtn" class="btn btn-primary" disabled>
                        <i class="fas fa-play"></i> Play Sentence
                    </button>
                </div>

                <div class="sentence-area" id="sentenceArea">
                    <div class="sentence-row" id="sentenceRow">
                        <!-- Frames will be added here -->
                    </div>
                </div>

                <div class="empty-state" id="noDataState" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>No Sentence Data Available</h2>
                    <p>Please upload a Sentence Words CSV file for this language in the Deck Builder.</p>
                </div>
            </div>

            <!-- Word Type Selector Modal -->
            <div id="wordTypeModal" class="modal hidden">
                <div class="modal-content word-type-modal">
                    <div class="modal-header">
                        <h2><i class="fas fa-tags"></i> Select Word Type</h2>
                        <button id="closeWordTypeModal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="word-type-grid" id="wordTypeGrid">
                            <!-- Word type buttons will be added here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card Selector Modal -->
            <div id="cardSelectorModal" class="modal hidden">
                <div class="modal-content card-selector-modal">
                    <div class="modal-header">
                        <button id="backToWordTypes" class="back-btn"><i class="fas fa-arrow-left"></i> Back</button>
                        <h2><i class="fas fa-image"></i> Select Card: <span id="selectedWordType"></span></h2>
                        <button id="closeCardSelectorModal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="card-selector-grid" id="cardSelectorGrid">
                            <!-- Cards will be added here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        const hasFilter = filterManager && filterManager.isActive();
        if (!this.assets.currentLanguage || (!this.assets.currentLesson && !hasFilter)) {
            this.showNoDataState('Please select a language and lesson from the dropdowns above to begin.');
            return;
        }

        // Load sentence word data from manifest
        this.loadSentenceWords();

        if (this.availableWordTypes.length === 0) {
            this.showNoDataState('No sentence data available for this lesson. Please upload a Sentence Words CSV in the Deck Builder.');
            return;
        }

        // Calculate max frames per row based on screen width
        this.calculateMaxFramesPerRow();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render with 2 empty frames
        this.sentenceFrames = [null, null];
        this.renderSentenceFrames();

        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'sentence-builder',
                'Sentence Builder',
                'Click on a frame to add a word card. Select a word type, then choose a picture card. Click cards to flip and see the word. Use the speaker icon to hear pronunciation.'
            );
        }
    }

    /**
     * Load sentence words from manifest for current language and lesson
     */
    loadSentenceWords() {
        const manifest = this.assets.manifest;
        const trigraph = this.assets.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lesson = this.assets.currentLesson;

        this.availableWordTypes = [];
        this.wordsByType = {};

        // Check if sentenceWords exists in manifest
        if (!manifest?.sentenceWords?.[trigraph]?.[lesson]) {
            debugLogger?.log(2, `No sentence words found for ${trigraph} lesson ${lesson}`);
            return;
        }

        const lessonData = manifest.sentenceWords[trigraph][lesson];

        // Get all word types (columns) that have data
        for (const [wordType, words] of Object.entries(lessonData)) {
            if (words && words.length > 0) {
                this.availableWordTypes.push(wordType);
                this.wordsByType[wordType] = words;
            }
        }

        debugLogger?.log(2, `Loaded ${this.availableWordTypes.length} word types for sentence builder`);
    }

    /**
     * Calculate max frames per row based on screen width
     */
    calculateMaxFramesPerRow() {
        const screenWidth = window.innerWidth;
        // Middle 50% of screen
        const availableWidth = screenWidth * 0.5;
        // Frame width + gap
        const frameWithGap = this.frameSize + 16;
        this.maxFramesPerRow = Math.floor(availableWidth / frameWithGap);
        // Minimum 2, maximum 6
        this.maxFramesPerRow = Math.max(2, Math.min(6, this.maxFramesPerRow));
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Reset button
        document.getElementById('resetSentenceBtn').addEventListener('click', () => this.resetSentence());

        // Play sentence button
        document.getElementById('playSentenceBtn').addEventListener('click', () => this.playSentence());

        // Modal close buttons
        document.getElementById('closeWordTypeModal').addEventListener('click', () => this.hideWordTypeModal());
        document.getElementById('closeCardSelectorModal').addEventListener('click', () => this.hideCardSelectorModal());

        // Back button - return to word type selection
        document.getElementById('backToWordTypes').addEventListener('click', () => {
            this.hideCardSelectorModal();
            this.showWordTypeModal();
        });

        // Close modals on background click
        document.getElementById('wordTypeModal').addEventListener('click', (e) => {
            if (e.target.id === 'wordTypeModal') this.hideWordTypeModal();
        });
        document.getElementById('cardSelectorModal').addEventListener('click', (e) => {
            if (e.target.id === 'cardSelectorModal') this.hideCardSelectorModal();
        });

        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideWordTypeModal();
                this.hideCardSelectorModal();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.calculateMaxFramesPerRow();
            this.renderSentenceFrames();
        });
    }

    /**
     * Render all sentence frames
     */
    renderSentenceFrames() {
        const sentenceRow = document.getElementById('sentenceRow');
        sentenceRow.innerHTML = '';

        // Create rows as needed
        let currentRow = document.createElement('div');
        currentRow.className = 'sentence-frame-row';
        sentenceRow.appendChild(currentRow);

        let framesInCurrentRow = 0;

        this.sentenceFrames.forEach((card, index) => {
            // Check if we need a new row
            if (framesInCurrentRow >= this.maxFramesPerRow) {
                currentRow = document.createElement('div');
                currentRow.className = 'sentence-frame-row';
                sentenceRow.appendChild(currentRow);
                framesInCurrentRow = 0;
            }

            const frame = this.createFrame(card, index);
            currentRow.appendChild(frame);
            framesInCurrentRow++;
        });

        // Update play button state
        const hasCards = this.sentenceFrames.some(card => card !== null);
        document.getElementById('playSentenceBtn').disabled = !hasCards;
    }

    /**
     * Create a single frame element
     */
    createFrame(card, index) {
        const frame = document.createElement('div');
        frame.className = 'sentence-frame';
        frame.dataset.index = index;

        if (card) {
            // Frame has a card
            frame.classList.add('has-card');

            const cardInner = document.createElement('div');
            cardInner.className = 'frame-card';

            // Front (image only)
            const front = document.createElement('div');
            front.className = 'frame-card-face frame-card-front';

            if (card.isVideo) {
                const video = document.createElement('video');
                video.src = card.imagePath;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                front.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = card.imagePath;
                img.alt = card.word;
                img.onerror = () => {
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                };
                front.appendChild(img);
            }

            // Speaker icon on front
            if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
                const speaker = document.createElement('div');
                speaker.className = 'frame-speaker';
                speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
                speaker.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playCardAudio(card);
                });
                front.appendChild(speaker);
            }

            // Delete button on front
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'frame-delete';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFrame(index);
            });
            front.appendChild(deleteBtn);

            // Back (word text)
            const back = document.createElement('div');
            back.className = 'frame-card-face frame-card-back';

            const wordText = document.createElement('div');
            wordText.className = 'frame-word';
            wordText.textContent = card.word;
            back.appendChild(wordText);

            const englishText = document.createElement('div');
            englishText.className = 'frame-english';
            englishText.textContent = card.english;
            back.appendChild(englishText);

            // Speaker icon on back
            if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
                const speakerBack = document.createElement('div');
                speakerBack.className = 'frame-speaker';
                speakerBack.innerHTML = '<i class="fas fa-volume-up"></i>';
                speakerBack.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playCardAudio(card);
                });
                back.appendChild(speakerBack);
            }

            cardInner.appendChild(front);
            cardInner.appendChild(back);
            frame.appendChild(cardInner);

            // Click to flip
            frame.addEventListener('click', () => {
                frame.classList.toggle('flipped');
            });

        } else {
            // Empty frame - add card button
            frame.classList.add('empty-frame');
            frame.innerHTML = `
                <div class="add-card-content">
                    <i class="fas fa-plus"></i>
                    <span>Add Card</span>
                </div>
            `;
            frame.addEventListener('click', () => this.onFrameClick(index));
        }

        return frame;
    }

    /**
     * Handle click on an empty frame
     */
    onFrameClick(index) {
        this.selectedFrameIndex = index;
        this.showWordTypeModal();
    }

    /**
     * Show word type selector modal
     */
    showWordTypeModal() {
        const grid = document.getElementById('wordTypeGrid');
        grid.innerHTML = '';

        this.availableWordTypes.forEach(wordType => {
            const words = this.wordsByType[wordType] || [];
            const wordCount = words.length;

            // Create preview of first few words (truncate to fit box)
            const previewWords = words.slice(0, 8).join(', ');
            const preview = previewWords.length > 60 ? previewWords.substring(0, 57) + '...' : previewWords;

            const btn = document.createElement('button');
            btn.className = 'word-type-btn';
            btn.innerHTML = `
                <span class="word-type-name">${wordType}</span>
                <span class="word-count">${wordCount} word${wordCount !== 1 ? 's' : ''}</span>
                <span class="word-preview">${preview}</span>
            `;
            btn.addEventListener('click', () => {
                this.hideWordTypeModal();
                this.showCardSelectorModal(wordType);
            });
            grid.appendChild(btn);
        });

        document.getElementById('wordTypeModal').classList.remove('hidden');
    }

    /**
     * Hide word type selector modal
     */
    hideWordTypeModal() {
        document.getElementById('wordTypeModal').classList.add('hidden');
    }

    /**
     * Show card selector modal for a specific word type
     */
    showCardSelectorModal(wordType) {
        document.getElementById('selectedWordType').textContent = wordType;
        const grid = document.getElementById('cardSelectorGrid');
        grid.innerHTML = '';

        const words = this.wordsByType[wordType] || [];

        // Debug: log available cards
        const allCards = this.assets.getCards({ lesson: null });
        console.log(`[SentenceBuilder] showCardSelectorModal: wordType="${wordType}", words=${JSON.stringify(words)}, totalCards=${allCards.length}`);

        words.forEach(word => {
            // Find the card in manifest that matches this word
            const card = this.findCardByWord(word);
            if (!card) {
                console.warn(`[SentenceBuilder] Card not found for word: "${word}"`);
                debugLogger?.log(2, `Card not found for word: ${word}`);
                return;
            }

            console.log(`[SentenceBuilder] Found card for "${word}": card #${card.cardNum} "${card.word}"`);
            const cardEl = this.createSelectorCard(card);
            cardEl.addEventListener('click', () => {
                this.selectCard(card);
            });
            grid.appendChild(cardEl);
        });

        document.getElementById('cardSelectorModal').classList.remove('hidden');
    }

    /**
     * Find a card in manifest by word (handles slash-separated variants)
     */
    findCardByWord(word) {
        // Search ALL cards - sentence builder words can reference cards from any lesson
        // Must pass lesson: null to bypass default currentLesson filtering in getCards()
        const allCards = this.assets.getCards({ lesson: null });

        // Normalize function: lowercase, collapse spaces around slashes, trim
        const normalize = (str) => {
            return (str || '')
                .toLowerCase()
                .trim()
                .replace(/\s*\/\s*/g, '/'); // "ako / ko" → "ako/ko"
        };

        const searchWord = normalize(word);

        // Extract individual variants from search word (e.g., "ako/ko" → ["ako", "ko"])
        const searchVariants = searchWord.split('/').map(v => v.trim()).filter(v => v);

        // First pass: exact match on normalized word or any variant
        for (const card of allCards) {
            const cardWord = normalize(card.word);
            const cardVariants = cardWord.split('/').map(v => v.trim()).filter(v => v);

            // Check if normalized words match exactly
            if (cardWord === searchWord) {
                return card;
            }

            // Check if any search variant matches any card variant
            for (const searchVar of searchVariants) {
                if (cardVariants.includes(searchVar)) {
                    return card;
                }
            }

            // Check acceptableAnswers array
            if (card.acceptableAnswers && Array.isArray(card.acceptableAnswers)) {
                for (const answer of card.acceptableAnswers) {
                    const normalizedAnswer = normalize(answer);
                    if (normalizedAnswer === searchWord) {
                        return card;
                    }
                    // Check variants in acceptable answers
                    const answerVariants = normalizedAnswer.split('/').map(v => v.trim()).filter(v => v);
                    for (const searchVar of searchVariants) {
                        if (answerVariants.includes(searchVar)) {
                            return card;
                        }
                    }
                }
            }
        }

        // No partial/fuzzy matching - it causes wrong card matches
        // If we didn't find an exact match, return null
        return null;
    }

    /**
     * Create a card element for the selector modal
     */
    createSelectorCard(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'selector-card';

        const cardInner = document.createElement('div');
        cardInner.className = 'selector-card-inner';

        // Front (image only)
        const front = document.createElement('div');
        front.className = 'selector-card-face selector-card-front';

        if (card.isVideo) {
            const video = document.createElement('video');
            video.src = card.imagePath;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            front.appendChild(video);
        } else if (card.imagePath) {
            const img = document.createElement('img');
            img.src = card.imagePath;
            img.alt = card.word;
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            };
            front.appendChild(img);
        } else {
            front.innerHTML = '<div class="no-image">No Image</div>';
        }

        // Speaker icon
        if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
            const speaker = document.createElement('div');
            speaker.className = 'selector-speaker';
            speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
            speaker.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playCardAudio(card);
            });
            front.appendChild(speaker);
        }

        // Back (word)
        const back = document.createElement('div');
        back.className = 'selector-card-face selector-card-back';

        const wordText = document.createElement('div');
        wordText.className = 'selector-word';
        wordText.textContent = card.word;
        back.appendChild(wordText);

        const englishText = document.createElement('div');
        englishText.className = 'selector-english';
        englishText.textContent = card.english;
        back.appendChild(englishText);

        // Speaker icon on back
        if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
            const speakerBack = document.createElement('div');
            speakerBack.className = 'selector-speaker';
            speakerBack.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakerBack.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playCardAudio(card);
            });
            back.appendChild(speakerBack);
        }

        cardInner.appendChild(front);
        cardInner.appendChild(back);
        cardEl.appendChild(cardInner);

        // Click to flip (but not select)
        cardEl.addEventListener('click', (e) => {
            // If clicking speaker, don't flip
            if (e.target.closest('.selector-speaker')) return;
            cardEl.classList.toggle('flipped');
        });

        // Double-click to select
        cardEl.addEventListener('dblclick', () => {
            this.selectCard(card);
        });

        // Add select button
        const selectBtn = document.createElement('button');
        selectBtn.className = 'selector-select-btn';
        selectBtn.innerHTML = '<i class="fas fa-check"></i> Select';
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectCard(card);
        });
        cardEl.appendChild(selectBtn);

        return cardEl;
    }

    /**
     * Select a card for the current frame
     */
    selectCard(card) {
        this.hideCardSelectorModal();

        // Add the card to the selected frame
        this.sentenceFrames[this.selectedFrameIndex] = card;

        // If this was the last empty frame, add a new one
        const lastIndex = this.sentenceFrames.length - 1;
        if (this.selectedFrameIndex === lastIndex) {
            this.sentenceFrames.push(null);
        }

        // Re-render
        this.renderSentenceFrames();

        toastManager?.show('Card added to sentence', 'success');
    }

    /**
     * Hide card selector modal
     */
    hideCardSelectorModal() {
        document.getElementById('cardSelectorModal').classList.add('hidden');
    }

    /**
     * Delete a frame from the sentence
     */
    deleteFrame(index) {
        // Remove the frame
        this.sentenceFrames.splice(index, 1);

        // Ensure we always have at least 2 frames
        while (this.sentenceFrames.length < 2) {
            this.sentenceFrames.push(null);
        }

        // If all frames are empty, ensure we have exactly 2
        if (this.sentenceFrames.every(f => f === null)) {
            this.sentenceFrames = [null, null];
        }

        // Re-render
        this.renderSentenceFrames();

        toastManager?.show('Card removed from sentence', 'success');
    }

    /**
     * Reset the sentence to initial state
     */
    resetSentence() {
        this.sentenceFrames = [null, null];
        this.renderSentenceFrames();
        toastManager?.show('Sentence reset', 'success');
    }

    /**
     * Play audio for a card (handles multi-variant)
     */
    playCardAudio(card) {
        if (!card.audioPath || card.audioPath.length === 0) return;

        let currentIndex = 0;

        const playNext = () => {
            if (currentIndex >= card.audioPath.length) return;

            const audioPath = card.audioPath[currentIndex];
            if (!audioPath) {
                currentIndex++;
                playNext();
                return;
            }

            const audio = new Audio(audioPath);
            audio.onended = () => {
                currentIndex++;
                playNext();
            };
            audio.onerror = () => {
                debugLogger?.log(1, `Audio error: ${audioPath}`);
                currentIndex++;
                playNext();
            };
            audio.play().catch(err => {
                debugLogger?.log(1, `Audio play error: ${err.message}`);
                currentIndex++;
                playNext();
            });
        };

        playNext();
    }

    /**
     * Play all cards in the sentence sequentially
     */
    playSentence() {
        const cards = this.sentenceFrames.filter(card => card !== null);
        if (cards.length === 0) return;

        let currentCardIndex = 0;

        const playNextCard = () => {
            if (currentCardIndex >= cards.length) {
                toastManager?.show('Sentence playback complete', 'success');
                return;
            }

            const card = cards[currentCardIndex];
            if (!card.audioPath || card.audioPath.length === 0) {
                currentCardIndex++;
                // Small delay before next card
                setTimeout(playNextCard, 300);
                return;
            }

            // Play all audio variants for this card
            let variantIndex = 0;

            const playNextVariant = () => {
                if (variantIndex >= card.audioPath.length) {
                    currentCardIndex++;
                    // Small delay before next card
                    setTimeout(playNextCard, 500);
                    return;
                }

                const audioPath = card.audioPath[variantIndex];
                if (!audioPath) {
                    variantIndex++;
                    playNextVariant();
                    return;
                }

                const audio = new Audio(audioPath);
                audio.onended = () => {
                    variantIndex++;
                    playNextVariant();
                };
                audio.onerror = () => {
                    variantIndex++;
                    playNextVariant();
                };
                audio.play().catch(() => {
                    variantIndex++;
                    playNextVariant();
                });
            };

            playNextVariant();
        };

        playNextCard();
    }

    /**
     * Show no data state
     */
    showNoDataState(message) {
        document.getElementById('sentenceArea').style.display = 'none';
        const noDataState = document.getElementById('noDataState');
        noDataState.style.display = 'block';
        noDataState.querySelector('p').textContent = message;
    }

    /**
     * Cleanup when module is destroyed
     */
    destroy() {
        super.destroy();
        // Remove resize listener
        window.removeEventListener('resize', this.calculateMaxFramesPerRow);
    }
}
