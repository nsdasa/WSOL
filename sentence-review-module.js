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
        this.pictureSize = 160; // Size of word pictures (matches audio-match)
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';

        this.container.innerHTML = `
            <div class="module-sentence-review">
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

                <div class="sr-sentence-type-display hidden" id="srSentenceType">
                    <i class="fas fa-comment"></i>
                    <span id="srSentenceTypeText">Statement</span>
                </div>

                <div class="sr-sentence-area" id="srSentenceArea">
                    <!-- Pictures will be rendered here -->
                </div>

                <div class="sr-bubble-display hidden" id="srBubbleDisplay">
                    <svg class="sr-connection-lines" id="srConnectionLines"></svg>
                    <div class="sr-display-bubbles-row" id="srBubblesRow">
                        <!-- Word bubbles will be rendered here -->
                    </div>
                    <div class="sr-english-translation" id="srEnglishTranslation">
                        <!-- English translation here -->
                    </div>
                </div>

                <div class="sr-reveal-section">
                    <button id="srRevealBtn" class="btn btn-primary btn-lg">
                        <i class="fas fa-eye"></i> Show Sentence Text
                    </button>
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
     * Handles both regular lessons and review lessons (which aggregate multiple lessons)
     * Updated for new sentences.reviewZone structure with sentence pool
     */
    loadSentenceReviewData() {
        const manifest = this.assets.manifest;
        const trigraph = this.assets.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonNum = this.assets.currentLesson;

        // Check if this is a review lesson
        const lessonMeta = manifest?.lessonMeta?.[trigraph]?.[lessonNum];
        const isReviewLesson = lessonMeta?.type === 'review';
        const lessonsToLoad = isReviewLesson && lessonMeta?.reviewsLessons?.length > 0
            ? lessonMeta.reviewsLessons
            : [lessonNum];

        debugLogger?.log(2, `Loading sentence review for ${isReviewLesson ? 'review ' : ''}lesson ${lessonNum}${isReviewLesson ? ` (reviewing: ${lessonsToLoad.join(', ')})` : ''}`);

        // Get the sentence pool for resolving sentences
        const sentencePool = manifest?.sentences?.[trigraph]?.pool || [];
        const poolMap = new Map(sentencePool.map(s => [s.sentenceNum, s]));

        // Aggregate sequences from all lessons to load
        const aggregatedSequences = [];
        let sequenceIdCounter = 1;

        for (const lessonToLoad of lessonsToLoad) {
            // Try new structure first: sentences.reviewZone.lessons
            let lessonData = manifest?.sentences?.[trigraph]?.reviewZone?.lessons?.[lessonToLoad];

            // Fallback to old structure: sentenceReview.lessons (for backwards compatibility)
            if (!lessonData) {
                lessonData = manifest?.sentenceReview?.[trigraph]?.lessons?.[lessonToLoad];
            }

            if (!lessonData || !lessonData.sequences || lessonData.sequences.length === 0) {
                debugLogger?.log(2, `No sentence review data for ${trigraph} lesson ${lessonToLoad}`);
                continue;
            }

            // Add sequences with lesson prefix for review lessons
            for (const sequence of lessonData.sequences) {
                // Resolve sentenceNums to actual sentence objects (new structure)
                // Or use embedded sentences directly (old structure)
                let sentences;
                if (sequence.sentenceNums && Array.isArray(sequence.sentenceNums)) {
                    // New structure: resolve from pool
                    sentences = sequence.sentenceNums
                        .map(num => poolMap.get(num))
                        .filter(s => s !== undefined);
                } else if (sequence.sentences && Array.isArray(sequence.sentences)) {
                    // Old structure: use embedded sentences
                    sentences = sequence.sentences;
                } else {
                    sentences = [];
                }

                const aggregatedSequence = {
                    id: sequenceIdCounter++,
                    title: isReviewLesson
                        ? `L${lessonToLoad}: ${sequence.title}`
                        : sequence.title,
                    originalLesson: lessonToLoad,
                    sentences: sentences
                };
                aggregatedSequences.push(aggregatedSequence);
            }
        }

        if (aggregatedSequences.length === 0) {
            debugLogger?.log(2, `No sentence review data found for ${trigraph} lesson ${lessonNum}`);
            this.currentLesson = null;
            return;
        }

        // Create aggregated lesson data
        this.currentLesson = {
            title: isReviewLesson
                ? `Review: Lessons ${lessonsToLoad.join(', ')}`
                : `Lesson ${lessonNum}`,
            sequences: aggregatedSequences
        };
        this.currentSequenceIndex = 0;
        this.currentSentenceIndex = 0;

        debugLogger?.log(2, `Loaded sentence review: ${aggregatedSequences.length} sequences for lesson ${lessonNum}`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('srPrevSentenceBtn').addEventListener('click', () => this.previousSentence());
        document.getElementById('srNextSentenceBtn').addEventListener('click', () => this.nextSentence());
        document.getElementById('srRevealBtn').addEventListener('click', () => this.toggleReveal());

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
        document.getElementById('srBubbleDisplay').classList.add('hidden');
        document.getElementById('srRevealBtn').innerHTML = '<i class="fas fa-eye"></i> Show Sentence Text';

        // Display sentence type banner
        this.displaySentenceType(sentence.sentenceType);

        // Store current sentence for bubble rendering
        this.currentSentence = sentence;

        // Render pictures
        area.innerHTML = '';

        const pictureRow = document.createElement('div');
        pictureRow.className = 'sr-picture-row';

        // Build phrase groups - consecutive runs of words sharing the same cardNum
        // Uses the card's word property to determine phrase length, so repeated phrases
        // are correctly split into separate groups.
        // Example: "Maayong Adlaw Maayong Adlaw" (card word = "Maayong Adlaw", 2 words)
        //   -> shows [Maayong Adlaw] [Maayong Adlaw] (2 cards, not 1)
        const phraseGroups = [];
        let currentGroup = null;

        sentence.words.forEach((wordData, index) => {
            if (wordData.imagePath && wordData.cardNum) {
                // Get the card to determine expected phrase length
                const card = this.findCardByNum(wordData.cardNum);
                const cardWord = card?.word || wordData.word || '';
                // Count words in the card's word property (phrase length)
                const expectedPhraseLength = cardWord.split(/\s+/).filter(w => w.length > 0).length || 1;

                // Check if we should continue the current group or start a new one
                const shouldContinue = currentGroup &&
                    currentGroup.cardNum === wordData.cardNum &&
                    currentGroup.wordIndices.length < currentGroup.expectedLength;

                if (shouldContinue) {
                    // Continue current phrase group (still building the phrase)
                    currentGroup.wordIndices.push(index);
                } else {
                    // Start new phrase group (different card, or phrase is complete)
                    currentGroup = {
                        cardNum: wordData.cardNum,
                        wordData: wordData,
                        wordIndices: [index],
                        expectedLength: expectedPhraseLength,
                        card: card
                    };
                    phraseGroups.push(currentGroup);
                }
            } else {
                // Function word (no card) - ends any current phrase group
                currentGroup = null;
            }
        });

        // Build maps for rendering: which word indices start a phrase group, which are "inner" words to skip
        const phraseGroupByStartIndex = new Map(); // startIndex -> phraseGroup
        const skipIndices = new Set(); // word indices that are part of a phrase but not the first word

        phraseGroups.forEach(group => {
            const startIndex = group.wordIndices[0];
            phraseGroupByStartIndex.set(startIndex, group);
            // Mark all indices except the first as "skip" (they're part of the phrase, rendered with first word)
            for (let i = 1; i < group.wordIndices.length; i++) {
                skipIndices.add(group.wordIndices[i]);
            }
        });

        // Render all words in order - cards for phrase groups, placeholders for function words
        sentence.words.forEach((wordData, index) => {
            // Skip if this word is part of a multi-word phrase (not the first word)
            if (skipIndices.has(index)) {
                return;
            }

            const wordContainer = document.createElement('div');
            wordContainer.className = 'sr-word-container';

            // Check if this word starts a phrase group
            const group = phraseGroupByStartIndex.get(index);

            if (group) {
                // Render the phrase group card
                const linkedWords = group.wordIndices.map(i => sentence.words[i].word);
                const card = group.card;

                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'sr-card-wrapper';
                // Store data for connection lines
                cardWrapper.dataset.cardNum = group.cardNum;
                cardWrapper.dataset.wordIndices = JSON.stringify(group.wordIndices);

                const cardInner = document.createElement('div');
                cardInner.className = 'sr-card-inner';

                // Front face (image or video)
                const front = document.createElement('div');
                front.className = 'sr-card-face sr-card-front';

                // Use card.imagePath (with WebP/WebM preference) instead of wordData.imagePath (printImagePath)
                const displayPath = card?.imagePath || wordData.imagePath;
                const isVideo = card?.isVideo || false;

                if (isVideo) {
                    const video = document.createElement('video');
                    video.src = displayPath;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.onerror = () => {
                        // Fallback to image on video error
                        const fallbackImg = document.createElement('img');
                        fallbackImg.src = wordData.imagePath || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+';
                        fallbackImg.alt = linkedWords.join(' ');
                        video.replaceWith(fallbackImg);
                    };
                    front.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = displayPath;
                    img.alt = linkedWords.join(' ');
                    img.onerror = () => {
                        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+';
                    };
                    front.appendChild(img);
                }

                // Speaker icon on front
                if (card?.hasAudio && card?.audioPath?.length > 0) {
                    const speaker = document.createElement('div');
                    speaker.className = 'sr-speaker-icon';
                    speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speaker.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.playCardAudio(card);
                    });
                    front.appendChild(speaker);
                }

                // Back face (word text) - show all linked words
                const back = document.createElement('div');
                back.className = 'sr-card-face sr-card-back';

                const wordText = document.createElement('div');
                wordText.className = 'sr-card-word';
                // Show all linked words (the phrase)
                wordText.textContent = linkedWords.join(' ');
                back.appendChild(wordText);

                // English translation on back
                if (card?.english) {
                    const englishText = document.createElement('div');
                    englishText.className = 'sr-card-english';
                    englishText.textContent = card.english;
                    back.appendChild(englishText);
                }

                // Speaker icon on back
                if (card?.hasAudio && card?.audioPath?.length > 0) {
                    const speakerBack = document.createElement('div');
                    speakerBack.className = 'sr-speaker-icon';
                    speakerBack.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakerBack.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.playCardAudio(card);
                    });
                    back.appendChild(speakerBack);
                }

                cardInner.appendChild(front);
                cardInner.appendChild(back);
                cardWrapper.appendChild(cardInner);

                // Click to flip card
                cardWrapper.addEventListener('click', () => {
                    cardWrapper.classList.toggle('flipped');
                });

                wordContainer.appendChild(cardWrapper);
            } else {
                // No card - render function word placeholder
                const placeholderEl = document.createElement('div');
                placeholderEl.className = 'sr-word-placeholder';
                placeholderEl.textContent = wordData.word;
                // Store data for connection lines (function word has no cardNum)
                placeholderEl.dataset.wordIndex = index;
                placeholderEl.dataset.isFunctionWord = 'true';
                wordContainer.appendChild(placeholderEl);
            }

            pictureRow.appendChild(wordContainer);
        });

        area.appendChild(pictureRow);

        // Store phrase groups for bubble layout rendering
        this.phraseGroups = phraseGroups;
        this.skipIndices = skipIndices;

        // Set sentence type banner width to match actual cards width (not container)
        requestAnimationFrame(() => {
            const typeDisplay = document.getElementById('srSentenceType');
            const cards = pictureRow.querySelectorAll('.sr-word-container');
            if (typeDisplay && cards.length > 0) {
                // Calculate actual width spanned by cards (first to last card)
                const firstCard = cards[0];
                const lastCard = cards[cards.length - 1];
                const firstRect = firstCard.getBoundingClientRect();
                const lastRect = lastCard.getBoundingClientRect();
                const cardsWidth = lastRect.right - firstRect.left;

                // Banner should be at least as wide as its content
                const contentWidth = typeDisplay.scrollWidth;
                typeDisplay.style.width = `${Math.max(contentWidth, cardsWidth)}px`;
            }
        });
    }

    /**
     * Find a card by cardNum
     */
    findCardByNum(cardNum) {
        const allCards = this.assets.getCards({ lesson: null });
        return allCards.find(c => c.cardNum === cardNum);
    }

    /**
     * Toggle reveal of sentence text with bubble layout
     */
    toggleReveal() {
        this.isTextRevealed = !this.isTextRevealed;
        const bubbleDisplay = document.getElementById('srBubbleDisplay');
        const revealBtn = document.getElementById('srRevealBtn');

        if (this.isTextRevealed) {
            // Render the bubble layout
            this.renderBubbleLayout();
            bubbleDisplay.classList.remove('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Sentence Text';

            // Draw connection lines after DOM update
            requestAnimationFrame(() => {
                this.drawConnectionLines();
            });
        } else {
            bubbleDisplay.classList.add('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye"></i> Show Sentence Text';
        }
    }

    /**
     * Display sentence type banner with appropriate color and icon
     */
    displaySentenceType(sentenceType) {
        const typeDisplay = document.getElementById('srSentenceType');
        const typeText = document.getElementById('srSentenceTypeText');
        const typeIcon = typeDisplay.querySelector('i');

        if (!sentenceType) {
            typeDisplay.classList.add('hidden');
            return;
        }

        // Remove all type classes
        typeDisplay.classList.remove('type-question', 'type-statement', 'type-command', 'type-answer');

        // Set type-specific class, icon, and text
        const typeLower = sentenceType.toLowerCase();
        typeDisplay.classList.add(`type-${typeLower}`);
        typeText.textContent = sentenceType.toUpperCase();

        // Set icon based on type
        const iconMap = {
            'question': 'fa-circle-question',
            'statement': 'fa-comment',
            'command': 'fa-bullhorn',
            'answer': 'fa-reply'
        };
        typeIcon.className = `fas ${iconMap[typeLower] || 'fa-comment'}`;

        typeDisplay.classList.remove('hidden');
    }

    /**
     * Render the bubble layout with word bubbles below picture cards
     */
    renderBubbleLayout() {
        const bubblesRow = document.getElementById('srBubblesRow');
        const englishTranslation = document.getElementById('srEnglishTranslation');
        const sentence = this.currentSentence;

        if (!sentence) return;

        // Clear previous content
        bubblesRow.innerHTML = '';

        // Build bubble layout - bubbles must be in same order as cards
        // Group bubbles under their respective cards
        const wordContainers = document.querySelectorAll('#srSentenceArea .sr-word-container');

        wordContainers.forEach((container, containerIndex) => {
            const cardWrapper = container.querySelector('.sr-card-wrapper');
            const placeholder = container.querySelector('.sr-word-placeholder');

            if (cardWrapper) {
                // This is a picture card - create bubbles for all linked words
                const wordIndices = JSON.parse(cardWrapper.dataset.wordIndices || '[]');
                const cardNum = cardWrapper.dataset.cardNum;

                // Create a bubble group container to keep multi-word phrases together
                const bubbleGroup = document.createElement('div');
                bubbleGroup.className = 'sr-bubble-group';
                bubbleGroup.dataset.cardNum = cardNum;

                wordIndices.forEach((wordIndex, i) => {
                    const wordData = sentence.words[wordIndex];
                    const bubble = this.createWordBubble(wordData, wordIndex, cardNum);
                    bubbleGroup.appendChild(bubble);
                });

                bubblesRow.appendChild(bubbleGroup);

            } else if (placeholder) {
                // This is a function word placeholder - create a bubble for it
                const wordIndex = parseInt(placeholder.dataset.wordIndex);
                const wordData = sentence.words[wordIndex];

                // Create a bubble group for consistency (single bubble)
                const bubbleGroup = document.createElement('div');
                bubbleGroup.className = 'sr-bubble-group function-word-group';

                const bubble = this.createWordBubble(wordData, wordIndex, null, true);
                bubbleGroup.appendChild(bubble);
                bubblesRow.appendChild(bubbleGroup);
            }
        });

        // Set English translation
        englishTranslation.textContent = sentence.english || '';
    }

    /**
     * Create a word bubble element
     */
    createWordBubble(wordData, wordIndex, cardNum, isFunctionWord = false) {
        const bubble = document.createElement('div');
        bubble.className = 'sr-display-bubble';
        if (isFunctionWord) {
            bubble.classList.add('function-word');
        }
        bubble.dataset.wordIndex = wordIndex;
        if (cardNum) {
            bubble.dataset.cardNum = cardNum;
        }

        const text = document.createElement('span');
        text.className = 'sr-bubble-text';
        text.textContent = wordData.word;
        bubble.appendChild(text);

        // Add speaker icon if audio available
        const card = cardNum ? this.findCardByNum(parseInt(cardNum)) : null;
        if (card?.hasAudio && card?.audioPath?.length > 0) {
            const speaker = document.createElement('span');
            speaker.className = 'sr-bubble-speaker';
            speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
            bubble.appendChild(speaker);
        }

        // Add click handler for audio
        bubble.addEventListener('click', () => {
            if (card?.hasAudio && card?.audioPath?.length > 0) {
                this.playCardAudio(card);
            }
        });

        return bubble;
    }

    /**
     * Draw SVG connection lines from picture cards down to word bubbles
     */
    drawConnectionLines() {
        const svg = document.getElementById('srConnectionLines');
        const sentenceArea = document.getElementById('srSentenceArea');

        if (!svg || !sentenceArea) return;

        // Clear existing lines
        svg.innerHTML = '';

        // Use SVG's bounding rect as reference - coordinates are relative to SVG element
        const svgRect = svg.getBoundingClientRect();

        // Get all word containers in DOM order (maintains sentence word order)
        const wordContainers = sentenceArea.querySelectorAll('.sr-word-container');
        const bubbleGroups = document.querySelectorAll('#srBubblesRow .sr-bubble-group');

        // Process each word container in order, matching with bubble groups
        wordContainers.forEach((container, index) => {
            const bubbleGroup = bubbleGroups[index];
            if (!bubbleGroup) return;

            // Find the card wrapper or placeholder inside this container
            const cardWrapper = container.querySelector('.sr-card-wrapper');
            const placeholder = container.querySelector('.sr-word-placeholder');
            const element = cardWrapper || placeholder;

            if (!element) return;

            const elementRect = element.getBoundingClientRect();
            // Center-bottom of card/placeholder
            const elementCenterX = elementRect.left + elementRect.width / 2 - svgRect.left;
            const elementBottomY = elementRect.bottom - svgRect.top;

            // Get all bubbles in this group
            const bubbles = bubbleGroup.querySelectorAll('.sr-display-bubble');
            const isFunctionWord = !!placeholder;

            bubbles.forEach((bubble) => {
                const bubbleRect = bubble.getBoundingClientRect();
                // Center-top of word bubble
                const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2 - svgRect.left;
                const bubbleTopY = bubbleRect.top - svgRect.top;

                // Create line from element bottom-center to bubble top-center
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', elementCenterX);
                line.setAttribute('y1', elementBottomY);
                line.setAttribute('x2', bubbleCenterX);
                line.setAttribute('y2', bubbleTopY);
                line.setAttribute('class', isFunctionWord ? 'sr-connection-line function-word-line' : 'sr-connection-line');
                svg.appendChild(line);
            });
        });
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
     * Parse CSV data into structured sentence review data with multiple lessons
     * CSV columns: Lesson #, Seq #, Sequ Title, Sentence #, Sentence Text, English Translation, Sentence Type
     * @param {string} csvText - The raw CSV text
     * @param {Array} allCards - All cards from manifest for word lookup
     * @returns {Object} Lessons object keyed by lesson number
     */
    static parseCSV(csvText, allCards) {
        const rows = this.parseCSVRows(csvText);
        const lessons = {};

        let currentLesson = null;
        let currentSequence = null;

        for (const row of rows) {
            // Skip header row
            if (row['Lesson #'] === 'Lesson #') continue;

            const lessonNum = row['Lesson #']?.trim();
            const seqNum = row['Seq #']?.trim();
            const seqTitle = row['Sequ Title']?.trim();
            const sentNum = row['Sentence #']?.trim();
            const sentText = row['Sentence Text']?.trim();
            const english = row['English Translation']?.trim();
            const cebuanoTranslation = row['Cebuano Translation']?.trim();
            const sentType = row['Sentence Type']?.trim();

            // Sequence header row: has lesson/seq number and title but no sentence data
            if ((lessonNum || seqNum) && seqTitle && !sentNum) {
                // Update current lesson if specified
                if (lessonNum) {
                    currentLesson = lessonNum;
                }

                // Initialize lesson if needed
                if (currentLesson && !lessons[currentLesson]) {
                    lessons[currentLesson] = {
                        title: `Lesson ${currentLesson}`,
                        sequences: []
                    };
                }

                // Create new sequence
                if (currentLesson && seqNum) {
                    currentSequence = {
                        id: parseInt(seqNum),
                        title: seqTitle,
                        sentences: []
                    };
                    lessons[currentLesson].sequences.push(currentSequence);
                }
            }
            // Sentence row: has sentence number and text
            else if (sentNum && sentText && currentSequence) {
                // Parse words with {root} notation
                const words = this.parseWords(sentText, allCards);

                // Clean display text (remove {root} notation)
                const cleanText = sentText.replace(/\s*\{[^}]+\}/g, '');

                const sentenceObj = {
                    id: parseInt(sentNum),
                    text: cleanText,
                    english: english || '',
                    sentenceType: sentType || null,
                    words: words
                };

                // Add cebuano translation for non-Cebuano languages
                if (cebuanoTranslation) {
                    sentenceObj.cebuano = cebuanoTranslation;
                }

                currentSequence.sentences.push(sentenceObj);
            }
        }

        return lessons;
    }

    /**
     * Parse CSV text into array of row objects
     * Handles quoted fields with commas
     * @param {string} csvText - Raw CSV text
     * @returns {Array} Array of objects with column headers as keys
     */
    static parseCSVRows(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // Parse header row
        const headers = this.parseCSVLine(lines[0]);
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            rows.push(row);
        }

        return rows;
    }

    /**
     * Parse a single CSV line, handling quoted fields
     * @param {string} line - CSV line
     * @returns {Array} Array of field values
     */
    static parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        // Push last field
        fields.push(current.trim());

        return fields;
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
                imagePath: cardInfo?.imagePath || null,
                needsResolution: cardInfo?.needsResolution || false
            });
        }

        return words;
    }

    /**
     * Find a card for a word, using root as fallback
     * @param {string} word - The word to find
     * @param {string|null} root - Optional root word hint
     * @param {Array} allCards - All cards to search
     * @returns {Object|null} Card info with needsResolution flag, or null
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
                return { cardNum: card.cardNum, imagePath: card.printImagePath, needsResolution: false };
            }

            // Check acceptableAnswers
            if (card.acceptableAnswers) {
                for (const answer of card.acceptableAnswers) {
                    if (normalize(answer) === searchWord) {
                        return { cardNum: card.cardNum, imagePath: card.printImagePath, needsResolution: false };
                    }
                }
            }
        }

        // Try root word if provided - FLAG FOR RESOLUTION since word wasn't found directly
        if (searchRoot) {
            for (const card of allCards) {
                const cardWord = normalize(card.word);
                const variants = cardWord.split('/').map(v => v.trim());

                if (cardWord === searchRoot || variants.includes(searchRoot)) {
                    // Word not found in cards AND was auto-assigned via root - needs resolution
                    return { cardNum: card.cardNum, imagePath: card.printImagePath, needsResolution: true };
                }

                if (card.acceptableAnswers) {
                    for (const answer of card.acceptableAnswers) {
                        if (normalize(answer) === searchRoot) {
                            // Word not found in cards AND was auto-assigned via root - needs resolution
                            return { cardNum: card.cardNum, imagePath: card.printImagePath, needsResolution: true };
                        }
                    }
                }
            }
        }

        return null;
    }
}
