// =================================================================
// SENTENCE REVIEW MODULE - Bob and Mariel Ward School
// Version 1.0 - November 2025
// Display sentence pictures in a row for sentence comprehension training
// =================================================================

class SentenceReviewModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.lessons = {}; // Loaded sentence review lessons
        this.currentLesson = null;
        this.currentSequenceIndex = 0;
        this.currentSentenceIndex = 0;
        this.isTextRevealed = false;
        this.pictureSize = 80; // Size of word pictures
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';

        this.container.innerHTML = `
            <div class="container module-sentence-review">
                <h1><i class="fas fa-images"></i> Sentence Review (${langName}: Lesson ${lessonNum})</h1>

                <div class="sr-controls">
                    <button id="srPrevSentenceBtn" class="btn btn-secondary" disabled>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <div class="sr-progress">
                        <span id="srSequenceTitle">Sequence 1</span>
                        <span id="srSentenceCount">(1/1)</span>
                    </div>
                    <button id="srNextSentenceBtn" class="btn btn-secondary" disabled>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="sr-sentence-area" id="srSentenceArea">
                    <!-- Pictures will be rendered here -->
                </div>

                <div class="sr-english-hint" id="srEnglishHint">
                    <!-- English translation hint -->
                </div>

                <div class="sr-reveal-section">
                    <button id="srRevealBtn" class="btn btn-primary btn-lg">
                        <i class="fas fa-eye"></i> Show Sentence Text
                    </button>
                    <button id="srPlayAudioBtn" class="btn btn-secondary btn-lg">
                        <i class="fas fa-volume-up"></i> Play Audio
                    </button>
                </div>

                <div class="sr-revealed-text hidden" id="srRevealedText">
                    <div class="sr-sentence-text" id="srSentenceText"></div>
                </div>

                <div class="sr-sequence-selector hidden" id="srSequenceSelector">
                    <h3>Jump to Sequence</h3>
                    <div class="sr-sequence-list" id="srSequenceList">
                        <!-- Sequence buttons will be rendered here -->
                    </div>
                </div>

                <div class="empty-state hidden" id="srNoDataState">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>No Sentence Review Data</h2>
                    <p>Please add sentence review data for this lesson in the Deck Builder.</p>
                </div>
            </div>
        `;
    }

    async init() {
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showNoDataState('Please select a language and lesson from the dropdowns above to begin.');
            return;
        }

        // Load sentence review data from manifest
        this.loadSentenceReviewData();

        if (!this.currentLesson || this.currentLesson.sequences.length === 0) {
            this.showNoDataState('No sentence review data available for this lesson. Please add data in the Deck Builder.');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Render initial state
        this.renderCurrentSentence();
        this.renderSequenceSelector();
        this.updateNavigationButtons();

        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'sentence-review',
                'Sentence Review',
                'Look at the pictures in order to understand the sentence. Click on pictures to hear individual words. Click "Show Sentence Text" to reveal the written sentence.'
            );
        }
    }

    /**
     * Load sentence review data from manifest
     */
    loadSentenceReviewData() {
        const manifest = this.assets.manifest;
        const trigraph = this.assets.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonNum = this.assets.currentLesson;

        // Check for sentenceReview data in manifest
        const lessonData = manifest?.sentenceReview?.[trigraph]?.lessons?.[lessonNum];

        if (!lessonData || !lessonData.sequences || lessonData.sequences.length === 0) {
            debugLogger?.log(2, `No sentence review data for ${trigraph} lesson ${lessonNum}`);
            this.currentLesson = null;
            return;
        }

        this.currentLesson = lessonData;
        this.currentSequenceIndex = 0;
        this.currentSentenceIndex = 0;

        debugLogger?.log(2, `Loaded sentence review: ${lessonData.sequences.length} sequences for lesson ${lessonNum}`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('srPrevSentenceBtn').addEventListener('click', () => this.previousSentence());
        document.getElementById('srNextSentenceBtn').addEventListener('click', () => this.nextSentence());
        document.getElementById('srRevealBtn').addEventListener('click', () => this.toggleReveal());
        document.getElementById('srPlayAudioBtn').addEventListener('click', () => this.playSentenceAudio());

        // Click on sequence title to show selector
        document.getElementById('srSequenceTitle').addEventListener('click', () => {
            document.getElementById('srSequenceSelector').classList.toggle('hidden');
        });

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
                this.previousSentence();
                break;
            case 'ArrowRight':
                this.nextSentence();
                break;
            case ' ':
                e.preventDefault();
                this.toggleReveal();
                break;
            case 'Enter':
                this.playSentenceAudio();
                break;
        }
    }

    /**
     * Render the current sentence with pictures
     */
    renderCurrentSentence() {
        const area = document.getElementById('srSentenceArea');
        const sequence = this.currentLesson.sequences[this.currentSequenceIndex];
        const sentence = sequence.sentences[this.currentSentenceIndex];

        // Update progress display
        document.getElementById('srSequenceTitle').textContent = sequence.title || `Sequence ${sequence.id}`;
        document.getElementById('srSentenceCount').textContent =
            `(${this.currentSentenceIndex + 1}/${sequence.sentences.length})`;

        // Reset reveal state
        this.isTextRevealed = false;
        document.getElementById('srRevealedText').classList.add('hidden');
        document.getElementById('srRevealBtn').innerHTML = '<i class="fas fa-eye"></i> Show Sentence Text';

        // Render pictures
        area.innerHTML = '';

        const pictureRow = document.createElement('div');
        pictureRow.className = 'sr-picture-row';

        sentence.words.forEach((wordData, index) => {
            const wordContainer = document.createElement('div');
            wordContainer.className = 'sr-word-container';

            if (wordData.imagePath && wordData.cardNum) {
                // Has a picture
                const pictureEl = document.createElement('div');
                pictureEl.className = 'sr-word-picture';

                // Get the card data for audio
                const card = this.findCardByNum(wordData.cardNum);

                // Create image or video
                const img = document.createElement('img');
                img.src = wordData.imagePath;
                img.alt = wordData.word;
                img.onerror = () => {
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4/PC90ZXh0Pjwvc3ZnPg==';
                };
                pictureEl.appendChild(img);

                // Click to play word audio
                if (card?.hasAudio && card?.audioPath?.length > 0) {
                    pictureEl.classList.add('has-audio');
                    pictureEl.addEventListener('click', () => {
                        this.playCardAudio(card);
                    });
                }

                wordContainer.appendChild(pictureEl);

                // Show word label on hover/reveal
                const wordLabel = document.createElement('div');
                wordLabel.className = 'sr-word-label';
                wordLabel.textContent = wordData.word;
                if (wordData.root) {
                    wordLabel.innerHTML = `${wordData.word} <span class="root-hint">(${wordData.root})</span>`;
                }
                wordContainer.appendChild(wordLabel);
            } else {
                // No picture - function word
                const placeholderEl = document.createElement('div');
                placeholderEl.className = 'sr-word-placeholder';
                placeholderEl.textContent = wordData.word;
                wordContainer.appendChild(placeholderEl);
            }

            pictureRow.appendChild(wordContainer);
        });

        area.appendChild(pictureRow);

        // Show English hint
        const englishHint = document.getElementById('srEnglishHint');
        englishHint.textContent = sentence.english || '';

        // Update sentence text for reveal
        document.getElementById('srSentenceText').textContent = sentence.text;
    }

    /**
     * Find a card by cardNum
     */
    findCardByNum(cardNum) {
        const allCards = this.assets.getCards({ lesson: null });
        return allCards.find(c => c.cardNum === cardNum);
    }

    /**
     * Toggle reveal of sentence text
     */
    toggleReveal() {
        this.isTextRevealed = !this.isTextRevealed;
        const revealedText = document.getElementById('srRevealedText');
        const revealBtn = document.getElementById('srRevealBtn');

        if (this.isTextRevealed) {
            revealedText.classList.remove('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Sentence Text';

            // Also show word labels
            document.querySelectorAll('.sr-word-label').forEach(el => {
                el.classList.add('visible');
            });
        } else {
            revealedText.classList.add('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye"></i> Show Sentence Text';

            // Hide word labels
            document.querySelectorAll('.sr-word-label').forEach(el => {
                el.classList.remove('visible');
            });
        }
    }

    /**
     * Play audio for a card
     */
    playCardAudio(card) {
        if (!card?.audioPath || card.audioPath.length === 0) return;

        const audio = new Audio(card.audioPath[0]);
        audio.play().catch(err => {
            debugLogger?.log(1, `Audio play error: ${err.message}`);
        });
    }

    /**
     * Play all word audio in sequence for the sentence
     */
    playSentenceAudio() {
        const sequence = this.currentLesson.sequences[this.currentSequenceIndex];
        const sentence = sequence.sentences[this.currentSentenceIndex];

        // Collect all cards with audio
        const cardsWithAudio = [];
        sentence.words.forEach(wordData => {
            if (wordData.cardNum) {
                const card = this.findCardByNum(wordData.cardNum);
                if (card?.hasAudio && card?.audioPath?.length > 0) {
                    cardsWithAudio.push(card);
                }
            }
        });

        if (cardsWithAudio.length === 0) {
            toastManager?.show('No audio available for this sentence', 'warning');
            return;
        }

        let currentIndex = 0;

        const playNext = () => {
            if (currentIndex >= cardsWithAudio.length) {
                return;
            }

            const card = cardsWithAudio[currentIndex];
            const audio = new Audio(card.audioPath[0]);

            audio.onended = () => {
                currentIndex++;
                setTimeout(playNext, 200); // Small delay between words
            };

            audio.onerror = () => {
                currentIndex++;
                playNext();
            };

            audio.play().catch(() => {
                currentIndex++;
                playNext();
            });
        };

        playNext();
    }

    /**
     * Navigate to previous sentence
     */
    previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.currentSentenceIndex--;
        } else if (this.currentSequenceIndex > 0) {
            // Go to previous sequence, last sentence
            this.currentSequenceIndex--;
            const prevSequence = this.currentLesson.sequences[this.currentSequenceIndex];
            this.currentSentenceIndex = prevSequence.sentences.length - 1;
        }
        this.renderCurrentSentence();
        this.updateNavigationButtons();
    }

    /**
     * Navigate to next sentence
     */
    nextSentence() {
        const sequence = this.currentLesson.sequences[this.currentSequenceIndex];

        if (this.currentSentenceIndex < sequence.sentences.length - 1) {
            this.currentSentenceIndex++;
        } else if (this.currentSequenceIndex < this.currentLesson.sequences.length - 1) {
            // Go to next sequence, first sentence
            this.currentSequenceIndex++;
            this.currentSentenceIndex = 0;
        }
        this.renderCurrentSentence();
        this.updateNavigationButtons();
    }

    /**
     * Jump to a specific sequence
     */
    jumpToSequence(sequenceIndex) {
        this.currentSequenceIndex = sequenceIndex;
        this.currentSentenceIndex = 0;
        this.renderCurrentSentence();
        this.updateNavigationButtons();
        document.getElementById('srSequenceSelector').classList.add('hidden');
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('srPrevSentenceBtn');
        const nextBtn = document.getElementById('srNextSentenceBtn');

        // Enable/disable based on position
        const isFirst = this.currentSequenceIndex === 0 && this.currentSentenceIndex === 0;
        const isLast = this.currentSequenceIndex === this.currentLesson.sequences.length - 1 &&
            this.currentSentenceIndex === this.currentLesson.sequences[this.currentSequenceIndex].sentences.length - 1;

        prevBtn.disabled = isFirst;
        nextBtn.disabled = isLast;
    }

    /**
     * Render sequence selector buttons
     */
    renderSequenceSelector() {
        const list = document.getElementById('srSequenceList');
        list.innerHTML = '';

        this.currentLesson.sequences.forEach((sequence, index) => {
            const btn = document.createElement('button');
            btn.className = 'sr-sequence-btn';
            if (index === this.currentSequenceIndex) {
                btn.classList.add('active');
            }
            btn.innerHTML = `
                <span class="sequence-num">${sequence.id}</span>
                <span class="sequence-title">${sequence.title || 'Untitled'}</span>
                <span class="sequence-count">${sequence.sentences.length} sentences</span>
            `;
            btn.addEventListener('click', () => this.jumpToSequence(index));
            list.appendChild(btn);
        });
    }

    /**
     * Show no data state
     */
    showNoDataState(message) {
        document.getElementById('srSentenceArea').classList.add('hidden');
        document.getElementById('srEnglishHint').classList.add('hidden');
        document.querySelector('.sr-reveal-section').classList.add('hidden');
        document.querySelector('.sr-controls').classList.add('hidden');

        const noDataState = document.getElementById('srNoDataState');
        noDataState.classList.remove('hidden');
        noDataState.querySelector('p').textContent = message;
    }

    /**
     * Cleanup
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeydown);
        super.destroy();
    }
}

// =================================================================
// SENTENCE REVIEW PARSER - Static utility class for parsing text input
// =================================================================
class SentenceReviewParser {
    /**
     * Parse raw text input into structured sentence review data
     * @param {string} rawText - The raw text with sequences and sentences
     * @param {Array} allCards - All cards from manifest for word lookup
     * @returns {Object} Parsed lesson data with sequences and sentences
     */
    static parseInput(rawText, allCards) {
        const lines = rawText.trim().split('\n');
        const sequences = [];
        let currentSequence = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Detect sequence header: "SEQUENCE 1: Title" or "SEQUENCE 1"
            const seqMatch = trimmedLine.match(/^SEQUENCE\s+(\d+)(?::\s*(.+))?$/i);
            if (seqMatch) {
                currentSequence = {
                    id: parseInt(seqMatch[1]),
                    title: seqMatch[2]?.trim() || `Sequence ${seqMatch[1]}`,
                    sentences: []
                };
                sequences.push(currentSequence);
                continue;
            }

            // Detect sentence: "Cebuano text. (English translation)"
            const sentMatch = trimmedLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            if (sentMatch && currentSequence) {
                const cebuanoText = sentMatch[1].trim();
                const englishText = sentMatch[2].trim();

                // Parse words with {root} notation
                const words = this.parseWords(cebuanoText, allCards);

                // Clean display text (remove {root} notation)
                const cleanText = cebuanoText.replace(/\s*\{[^}]+\}/g, '');

                currentSequence.sentences.push({
                    id: currentSequence.sentences.length + 1,
                    text: cleanText,
                    english: englishText,
                    words: words
                });
            }
        }

        return { sequences };
    }

    /**
     * Parse words from a sentence, handling {root} notation
     * @param {string} text - The sentence text
     * @param {Array} allCards - All cards for lookup
     * @returns {Array} Array of word objects with picture mappings
     */
    static parseWords(text, allCards) {
        const words = [];

        // Pattern to match: word{root} or just word
        // Also handles punctuation attached to words
        const pattern = /(\S+?)(?:\s*\{(\w+)\})?(?=[.,!?]?\s|[.,!?]?$)/g;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            let word = match[1].replace(/[.,!?]$/, ''); // Remove trailing punctuation
            const root = match[2] || null;

            if (!word) continue;

            // Look up card
            const cardInfo = this.findCardForWord(word, root, allCards);

            words.push({
                word: word,
                root: root,
                cardNum: cardInfo?.cardNum || null,
                imagePath: cardInfo?.imagePath || null
            });
        }

        return words;
    }

    /**
     * Find a card for a word, using root as fallback
     * @param {string} word - The word to find
     * @param {string|null} root - Optional root word hint
     * @param {Array} allCards - All cards to search
     * @returns {Object|null} Card info or null
     */
    static findCardForWord(word, root, allCards) {
        const normalize = (str) => (str || '').toLowerCase().trim();
        const searchWord = normalize(word);
        const searchRoot = root ? normalize(root) : null;

        // First try exact match on word
        for (const card of allCards) {
            const cardWord = normalize(card.word);
            const variants = cardWord.split('/').map(v => v.trim());

            if (cardWord === searchWord || variants.includes(searchWord)) {
                return { cardNum: card.cardNum, imagePath: card.imagePath };
            }

            // Check acceptableAnswers
            if (card.acceptableAnswers) {
                for (const answer of card.acceptableAnswers) {
                    if (normalize(answer) === searchWord) {
                        return { cardNum: card.cardNum, imagePath: card.imagePath };
                    }
                }
            }
        }

        // Try root word if provided
        if (searchRoot) {
            for (const card of allCards) {
                const cardWord = normalize(card.word);
                const variants = cardWord.split('/').map(v => v.trim());

                if (cardWord === searchRoot || variants.includes(searchRoot)) {
                    return { cardNum: card.cardNum, imagePath: card.imagePath };
                }

                if (card.acceptableAnswers) {
                    for (const answer of card.acceptableAnswers) {
                        if (normalize(answer) === searchRoot) {
                            return { cardNum: card.cardNum, imagePath: card.imagePath };
                        }
                    }
                }
            }
        }

        return null;
    }
}
