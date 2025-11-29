// =================================================================
// PICTURE STORY MODULE - Bob and Mariel Ward School
// Version 1.0 - November 2025
// Arrange sentences in correct story sequence order
// =================================================================

class PictureStoryModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.sequences = [];            // Available story sequences
        this.currentSequence = null;
        this.currentSequenceIndex = 0;
        this.shuffledSentences = [];    // Current user-arranged order
        this.correctOrder = [];         // Original sentence order
        this.mode = 'review';           // 'review' or 'test'
        this.attempts = 0;
        this.maxAttempts = 3;
        this.hasChecked = false;
        this.isCorrect = false;
        this.sortableInstance = null;
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';

        this.container.innerHTML = `
            <div class="module-picture-story">
                <h1><i class="fas fa-book-reader"></i> Story Zone (${langName}: Lesson ${lessonNum})</h1>

                <div class="ps-controls">
                    <div class="ps-mode-toggle">
                        <button class="ps-mode-btn active" data-mode="review">
                            <i class="fas fa-book-open"></i> Review Mode
                        </button>
                        <button class="ps-mode-btn" data-mode="test">
                            <i class="fas fa-clipboard-check"></i> Test Mode
                        </button>
                    </div>
                    <div class="ps-sequence-nav">
                        <button id="psPrevSeq" class="btn btn-secondary btn-sm" disabled>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span id="psSequenceInfo">Sequence 1 of 1</span>
                        <button id="psNextSeq" class="btn btn-secondary btn-sm" disabled>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <div class="ps-story-header">
                    <h2 id="psStoryTitle">Story Title</h2>
                    <div class="ps-attempts" id="psAttempts"></div>
                </div>

                <div class="ps-instruction">
                    <i class="fas fa-hand-pointer"></i>
                    Drag and drop the sentences to arrange them in the correct order.
                </div>

                <div class="ps-story-area" id="psStoryArea">
                    <!-- Sentence cards rendered here -->
                </div>

                <div class="ps-actions">
                    <button id="psPlayStory" class="btn btn-secondary">
                        <i class="fas fa-play"></i> Play Story
                    </button>
                    <button id="psCheckOrder" class="btn btn-primary">
                        <i class="fas fa-check"></i> Check Order
                    </button>
                    <button id="psResetOrder" class="btn btn-warning hidden">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <button id="psNextStory" class="btn btn-success hidden">
                        <i class="fas fa-arrow-right"></i> Next Story
                    </button>
                </div>

                <div class="ps-feedback hidden" id="psFeedback"></div>

                <div class="empty-state hidden" id="psNoDataState">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>No Story Data</h2>
                    <p>No story sequences found for this lesson.</p>
                </div>
            </div>
        `;
    }

    async init() {
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showNoDataState('Please select a language and lesson to begin.');
            return;
        }

        // Load sequences from sentence review data
        this.loadSequences();

        if (this.sequences.length === 0) {
            this.showNoDataState('No story sequences found for this lesson. Please add sentence review data.');
            return;
        }

        this.setupEventListeners();
        this.loadCurrentSequence();

        if (instructionManager) {
            instructionManager.show(
                'picture-story',
                'Story Zone',
                'Arrange the sentences in the correct order to form a coherent story. Drag sentences to reorder them. Click cards to flip and see words. Use the speaker icon to hear pronunciation.'
            );
        }
    }

    /**
     * Load sequences from story zone data
     * Uses new sentences.storyZone structure, with fallback to sentenceReview
     */
    loadSequences() {
        this.sequences = [];
        const manifest = this.assets.manifest;
        const trigraph = this.assets.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonNum = this.assets.currentLesson;

        // Check for review lesson
        const lessonMeta = manifest?.lessonMeta?.[trigraph]?.[lessonNum];
        const isReviewLesson = lessonMeta?.type === 'review';
        const lessonsToLoad = isReviewLesson && lessonMeta?.reviewsLessons?.length > 0
            ? lessonMeta.reviewsLessons
            : [lessonNum];

        // Get the sentence pool for resolving sentences
        const sentencePool = manifest?.sentences?.[trigraph]?.pool || [];
        const poolMap = new Map(sentencePool.map(s => [s.sentenceNum, s]));

        // First, try the new storyZone structure
        let foundStories = false;
        for (const lesson of lessonsToLoad) {
            const storyData = manifest?.sentences?.[trigraph]?.storyZone?.lessons?.[lesson];
            if (storyData?.stories?.length > 0) {
                foundStories = true;
                for (const story of storyData.stories) {
                    // Resolve sentenceNums to actual sentence objects
                    const sentences = (story.sentenceNums || [])
                        .map(num => poolMap.get(num))
                        .filter(s => s !== undefined);

                    if (sentences.length >= 2) {
                        this.sequences.push({
                            id: story.id,
                            title: isReviewLesson ? `L${lesson}: ${story.title}` : story.title,
                            lessonNum: lesson,
                            sentences: sentences
                        });
                    }
                }
            }
        }

        // Fallback: extract from sentenceReview (old structure)
        if (!foundStories) {
            for (const lesson of lessonsToLoad) {
                // Try new reviewZone structure first
                let lessonData = manifest?.sentences?.[trigraph]?.reviewZone?.lessons?.[lesson];
                // Fallback to old sentenceReview structure
                if (!lessonData) {
                    lessonData = manifest?.sentenceReview?.[trigraph]?.lessons?.[lesson];
                }
                if (!lessonData?.sequences) continue;

                for (const sequence of lessonData.sequences) {
                    // Resolve sentences from pool (new) or use embedded (old)
                    let sentences;
                    if (sequence.sentenceNums && Array.isArray(sequence.sentenceNums)) {
                        sentences = sequence.sentenceNums
                            .map(num => poolMap.get(num))
                            .filter(s => s !== undefined);
                    } else if (sequence.sentences && Array.isArray(sequence.sentences)) {
                        sentences = sequence.sentences;
                    } else {
                        continue;
                    }

                    // Only include sequences with multiple sentences
                    if (sentences.length >= 2) {
                        this.sequences.push({
                            ...sequence,
                            lessonNum: lesson,
                            title: isReviewLesson ? `L${lesson}: ${sequence.title}` : sequence.title,
                            sentences: sentences
                        });
                    }
                }
            }
        }

        debugLogger?.log(2, `Loaded ${this.sequences.length} story sequences`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mode toggle
        document.querySelectorAll('.ps-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ps-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.renderSentences();
            });
        });

        // Sequence navigation
        document.getElementById('psPrevSeq')?.addEventListener('click', () => this.previousSequence());
        document.getElementById('psNextSeq')?.addEventListener('click', () => this.nextSequence());

        // Actions
        document.getElementById('psPlayStory')?.addEventListener('click', () => this.playStory());
        document.getElementById('psCheckOrder')?.addEventListener('click', () => this.checkOrder());
        document.getElementById('psResetOrder')?.addEventListener('click', () => this.resetOrder());
        document.getElementById('psNextStory')?.addEventListener('click', () => this.nextSequence());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * Handle keyboard navigation
     */
    handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowLeft':
                this.previousSequence();
                break;
            case 'ArrowRight':
                this.nextSequence();
                break;
            case ' ':
                e.preventDefault();
                this.playStory();
                break;
            case 'Enter':
                if (!this.hasChecked) this.checkOrder();
                break;
        }
    }

    /**
     * Load current sequence and shuffle sentences
     */
    loadCurrentSequence() {
        if (this.sequences.length === 0) return;

        this.currentSequence = this.sequences[this.currentSequenceIndex];
        this.correctOrder = this.currentSequence.sentences.map(s => s.id);

        // Shuffle sentences
        this.shuffledSentences = shuffleArray([...this.currentSequence.sentences]);

        // Make sure it's actually shuffled (not in correct order)
        let attempts = 0;
        while (this.isInCorrectOrder() && attempts < 10) {
            this.shuffledSentences = shuffleArray([...this.currentSequence.sentences]);
            attempts++;
        }

        // Reset state
        this.hasChecked = false;
        this.isCorrect = false;
        this.attempts = 0;

        this.updateUI();
        this.renderSentences();
        this.initSortable();
    }

    /**
     * Check if sentences are in correct order
     */
    isInCorrectOrder() {
        return this.shuffledSentences.every((s, idx) => s.id === this.correctOrder[idx]);
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Title
        document.getElementById('psStoryTitle').textContent = this.currentSequence?.title || 'Story';

        // Sequence info
        document.getElementById('psSequenceInfo').textContent =
            `Sequence ${this.currentSequenceIndex + 1} of ${this.sequences.length}`;

        // Navigation buttons
        document.getElementById('psPrevSeq').disabled = this.currentSequenceIndex === 0;
        document.getElementById('psNextSeq').disabled = this.currentSequenceIndex >= this.sequences.length - 1;

        // Attempts (test mode only)
        const attemptsEl = document.getElementById('psAttempts');
        if (this.mode === 'test') {
            attemptsEl.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
            attemptsEl.classList.remove('hidden');
        } else {
            attemptsEl.classList.add('hidden');
        }

        // Action buttons
        this.updateActionButtons();
    }

    /**
     * Update action button visibility
     */
    updateActionButtons() {
        const checkBtn = document.getElementById('psCheckOrder');
        const resetBtn = document.getElementById('psResetOrder');
        const nextBtn = document.getElementById('psNextStory');

        if (this.hasChecked) {
            checkBtn.classList.add('hidden');

            if (this.isCorrect) {
                resetBtn.classList.add('hidden');
                nextBtn.classList.remove('hidden');
            } else {
                if (this.mode === 'review' || this.attempts < this.maxAttempts) {
                    resetBtn.classList.remove('hidden');
                } else {
                    resetBtn.classList.add('hidden');
                }
                nextBtn.classList.add('hidden');
            }
        } else {
            checkBtn.classList.remove('hidden');
            resetBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
        }
    }

    /**
     * Render sentence cards
     */
    renderSentences() {
        const storyArea = document.getElementById('psStoryArea');
        if (!storyArea) return;

        storyArea.innerHTML = this.shuffledSentences.map((sentence, idx) => `
            <div class="ps-sentence-card ${this.hasChecked ? this.getSentenceStatus(sentence, idx) : ''}"
                 data-sentence-id="${sentence.id}" data-index="${idx}">
                <div class="ps-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="ps-sentence-content">
                    <div class="ps-sentence-pictures">
                        ${this.renderSentenceCards(sentence)}
                    </div>
                    <div class="ps-sentence-text">${sentence.text}</div>
                </div>
                <button class="ps-sentence-audio" data-index="${idx}">
                    <i class="fas fa-volume-up"></i>
                </button>
                ${this.hasChecked ? `<div class="ps-position-indicator">${this.getPositionIndicator(sentence, idx)}</div>` : ''}
            </div>
        `).join('');

        // Setup audio buttons
        storyArea.querySelectorAll('.ps-sentence-audio').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.playSentenceAudio(this.shuffledSentences[idx]);
            });
        });

        // Setup card flip handlers
        this.setupCardFlipHandlers(storyArea);
    }

    /**
     * Get sentence status class (correct/incorrect)
     */
    getSentenceStatus(sentence, currentIndex) {
        const correctIndex = this.correctOrder.indexOf(sentence.id);
        return currentIndex === correctIndex ? 'correct' : 'incorrect';
    }

    /**
     * Get position indicator for feedback
     */
    getPositionIndicator(sentence, currentIndex) {
        const correctIndex = this.correctOrder.indexOf(sentence.id);
        if (currentIndex === correctIndex) {
            return '<i class="fas fa-check"></i>';
        } else {
            return `<i class="fas fa-arrow-right"></i> ${correctIndex + 1}`;
        }
    }

    /**
     * Render sentence as compact picture cards
     */
    renderSentenceCards(sentence) {
        if (!sentence?.words?.length) {
            return '';
        }

        return sentence.words.map(wordData => {
            if (wordData.cardNum && wordData.imagePath) {
                const card = this.findCardByNum(wordData.cardNum);
                return this.renderFlipCard(wordData, card);
            } else {
                return `<span class="ps-function-word">${wordData.word}</span>`;
            }
        }).join('');
    }

    /**
     * Render a compact flip card
     */
    renderFlipCard(wordData, card) {
        const imagePath = card?.imagePath || wordData.imagePath;
        const word = wordData.word;
        const english = card?.english || '';

        const backContent = this.mode === 'review'
            ? `<div class="ps-card-word">${word}</div><div class="ps-card-english">${english}</div>`
            : `<div class="ps-card-word">${word}</div>`;

        return `
            <div class="ps-card-wrapper" data-card-num="${wordData.cardNum}">
                <div class="ps-card-inner">
                    <div class="ps-card-front">
                        <img src="${imagePath}" alt="${word}" loading="lazy">
                        ${card?.hasAudio ? '<i class="fas fa-volume-up ps-card-speaker"></i>' : ''}
                    </div>
                    <div class="ps-card-back">
                        ${backContent}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup card flip handlers
     */
    setupCardFlipHandlers(container) {
        container.querySelectorAll('.ps-card-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();

                if (e.target.classList.contains('ps-card-speaker')) {
                    const cardNum = parseInt(wrapper.dataset.cardNum);
                    const card = this.findCardByNum(cardNum);
                    if (card) this.playCardAudio(card);
                    return;
                }

                wrapper.classList.toggle('flipped');
            });
        });
    }

    /**
     * Initialize SortableJS for drag and drop
     */
    initSortable() {
        const storyArea = document.getElementById('psStoryArea');
        if (!storyArea) return;

        // Destroy previous instance
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }

        // Don't allow sorting if already checked
        if (this.hasChecked) return;

        this.sortableInstance = new Sortable(storyArea, {
            animation: 200,
            handle: '.ps-drag-handle',
            ghostClass: 'ps-sentence-ghost',
            chosenClass: 'ps-sentence-chosen',
            dragClass: 'ps-sentence-drag',
            onEnd: (evt) => {
                // Update shuffledSentences array to match new order
                const item = this.shuffledSentences.splice(evt.oldIndex, 1)[0];
                this.shuffledSentences.splice(evt.newIndex, 0, item);
            }
        });
    }

    /**
     * Check if current order is correct
     */
    checkOrder() {
        this.hasChecked = true;
        this.attempts++;
        this.isCorrect = this.isInCorrectOrder();

        // Disable sorting
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }

        // Show feedback
        this.showFeedback();

        // Re-render with status indicators
        this.renderSentences();

        // Update UI
        this.updateUI();
    }

    /**
     * Show feedback after checking
     */
    showFeedback() {
        const feedback = document.getElementById('psFeedback');
        if (!feedback) return;

        feedback.classList.remove('hidden');

        if (this.isCorrect) {
            feedback.className = 'ps-feedback correct';
            feedback.innerHTML = '<i class="fas fa-check-circle"></i> Correct! The story is in the right order.';
        } else {
            const remaining = this.maxAttempts - this.attempts;
            feedback.className = 'ps-feedback incorrect';

            if (this.mode === 'test' && remaining <= 0) {
                feedback.innerHTML = '<i class="fas fa-times-circle"></i> Out of attempts. The correct order is shown.';
                // Show correct order
                this.shuffledSentences = [...this.currentSequence.sentences];
                this.renderSentences();
            } else {
                feedback.innerHTML = `<i class="fas fa-times-circle"></i> Not quite right. ${this.mode === 'test' ? `${remaining} attempts remaining.` : 'Try again!'}`;
            }
        }
    }

    /**
     * Reset order for another attempt
     */
    resetOrder() {
        this.hasChecked = false;
        this.isCorrect = false;

        // Re-shuffle
        this.shuffledSentences = shuffleArray([...this.currentSequence.sentences]);

        // Make sure it's actually shuffled
        let attempts = 0;
        while (this.isInCorrectOrder() && attempts < 10) {
            this.shuffledSentences = shuffleArray([...this.currentSequence.sentences]);
            attempts++;
        }

        // Hide feedback
        document.getElementById('psFeedback')?.classList.add('hidden');

        this.updateUI();
        this.renderSentences();
        this.initSortable();
    }

    /**
     * Play story audio in current order
     */
    async playStory() {
        const playBtn = document.getElementById('psPlayStory');
        if (playBtn) {
            playBtn.disabled = true;
            playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Playing...';
        }

        for (const sentence of this.shuffledSentences) {
            await this.playSentenceAudio(sentence);
            await this.delay(300); // Gap between sentences
        }

        if (playBtn) {
            playBtn.disabled = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i> Play Story';
        }
    }

    /**
     * Play sentence audio (word by word)
     */
    async playSentenceAudio(sentence) {
        if (!sentence?.words?.length) return;

        for (const wordData of sentence.words) {
            if (wordData.cardNum) {
                const card = this.findCardByNum(wordData.cardNum);
                if (card?.hasAudio) {
                    await this.playCardAudioAsync(card);
                    await this.delay(100);
                }
            }
        }
    }

    /**
     * Play card audio and return promise
     */
    playCardAudioAsync(card) {
        return new Promise((resolve) => {
            if (!card?.audio?.length) {
                resolve();
                return;
            }

            const audio = new Audio(card.audio[0]);
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play().catch(resolve);
        });
    }

    /**
     * Play card audio
     */
    playCardAudio(card) {
        if (!card?.audio?.length) return;
        const audio = new Audio(card.audio[0]);
        audio.play().catch(err => debugLogger?.log(1, 'Audio play failed:', err));
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Find card by card number
     */
    findCardByNum(cardNum) {
        const cards = this.assets.getCards({ lesson: null });
        return cards.find(c => c.cardNum === cardNum);
    }

    /**
     * Navigation methods
     */
    previousSequence() {
        if (this.currentSequenceIndex > 0) {
            this.currentSequenceIndex--;
            this.loadCurrentSequence();
            document.getElementById('psFeedback')?.classList.add('hidden');
        }
    }

    nextSequence() {
        if (this.currentSequenceIndex < this.sequences.length - 1) {
            this.currentSequenceIndex++;
            this.loadCurrentSequence();
            document.getElementById('psFeedback')?.classList.add('hidden');
        }
    }

    showNoDataState(message) {
        const storyArea = document.getElementById('psStoryArea');
        const noDataState = document.getElementById('psNoDataState');

        if (storyArea) storyArea.classList.add('hidden');
        if (noDataState) {
            noDataState.classList.remove('hidden');
            noDataState.querySelector('p').textContent = message;
        }

        // Hide controls
        document.querySelector('.ps-controls')?.classList.add('hidden');
        document.querySelector('.ps-story-header')?.classList.add('hidden');
        document.querySelector('.ps-instruction')?.classList.add('hidden');
        document.querySelector('.ps-actions')?.classList.add('hidden');
    }

    destroy() {
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
        document.removeEventListener('keydown', this.handleKeydown);
        super.destroy();
    }
}
