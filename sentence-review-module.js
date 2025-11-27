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
     * Handles both regular lessons and review lessons (which aggregate multiple lessons)
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

        // Aggregate sequences from all lessons to load
        const aggregatedSequences = [];
        let sequenceIdCounter = 1;

        for (const lessonToLoad of lessonsToLoad) {
            const lessonData = manifest?.sentenceReview?.[trigraph]?.lessons?.[lessonToLoad];

            if (!lessonData || !lessonData.sequences || lessonData.sequences.length === 0) {
                debugLogger?.log(2, `No sentence review data for ${trigraph} lesson ${lessonToLoad}`);
                continue;
            }

            // Add sequences with lesson prefix for review lessons
            for (const sequence of lessonData.sequences) {
                const aggregatedSequence = {
                    ...sequence,
                    id: sequenceIdCounter++,
                    // For review lessons, prefix title with lesson number
                    title: isReviewLesson
                        ? `L${lessonToLoad}: ${sequence.title}`
                        : sequence.title,
                    originalLesson: lessonToLoad
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

        // Window resize handler to redraw connection lines
        this.resizeHandler = this.debounce(() => {
            this.redrawConnectionLines();
        }, 100);
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Redraw connection lines (called on resize)
     */
    redrawConnectionLines() {
        const svg = document.querySelector('.sr-connection-lines');
        if (!svg) return;

        const layoutContainer = svg.parentElement;
        if (!layoutContainer) return;

        const bubbles = layoutContainer.querySelectorAll('.sr-word-bubble');
        const pictures = layoutContainer.querySelectorAll('.sr-picture-slot');

        const bubbleRefs = Array.from(bubbles).map(bubble => ({
            element: bubble,
            hasPicture: !bubble.classList.contains('function-word')
        }));

        const pictureRefs = Array.from(pictures).map(picture => ({
            element: picture,
            hasPicture: picture.classList.contains('has-picture')
        }));

        this.drawConnectionLines(svg, bubbleRefs, pictureRefs);
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
     * Render the current sentence with bubbles and pictures (Option A layout)
     * Layout: Word bubbles on top -> Connection lines -> Pictures on bottom
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

        // Hide English hint initially (will show on reveal)
        const englishHint = document.getElementById('srEnglishHint');
        englishHint.textContent = sentence.english || '';
        englishHint.classList.add('hidden');

        // Create the new layout structure
        area.innerHTML = '';

        // Main container for the bubble-picture layout
        const layoutContainer = document.createElement('div');
        layoutContainer.className = 'sr-bubble-layout';

        // Word bubbles row
        const bubblesRow = document.createElement('div');
        bubblesRow.className = 'sr-bubbles-row';

        // SVG for connection lines
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'sr-connection-lines');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.overflow = 'visible';

        // Pictures row
        const picturesRow = document.createElement('div');
        picturesRow.className = 'sr-pictures-row';

        // Store references for drawing lines after layout
        const bubbleRefs = [];
        const pictureRefs = [];

        sentence.words.forEach((wordData, index) => {
            // Create bubble
            const bubble = this.createWordBubble(wordData, index, sentence);
            bubblesRow.appendChild(bubble);
            bubbleRefs.push({ element: bubble, hasPicture: !!(wordData.imagePath && wordData.cardNum) });

            // Create picture slot
            const pictureSlot = this.createPictureSlot(wordData, index);
            picturesRow.appendChild(pictureSlot);
            pictureRefs.push({ element: pictureSlot, hasPicture: !!(wordData.imagePath && wordData.cardNum) });
        });

        // Assemble layout
        layoutContainer.appendChild(bubblesRow);
        layoutContainer.appendChild(svg);
        layoutContainer.appendChild(picturesRow);
        area.appendChild(layoutContainer);

        // Draw connection lines after DOM is rendered
        requestAnimationFrame(() => {
            this.drawConnectionLines(svg, bubbleRefs, pictureRefs);
        });

        // Update sentence text for reveal
        document.getElementById('srSentenceText').textContent = sentence.text;
    }

    /**
     * Create a word bubble element
     */
    createWordBubble(wordData, index, sentence) {
        const bubble = document.createElement('div');
        bubble.className = 'sr-word-bubble';
        bubble.dataset.index = index;

        const hasPicture = !!(wordData.imagePath && wordData.cardNum);
        if (!hasPicture) {
            bubble.classList.add('function-word');
        }

        // Word text
        const wordText = document.createElement('div');
        wordText.className = 'sr-bubble-text';
        wordText.textContent = wordData.word;
        if (wordData.root) {
            wordText.innerHTML = `${wordData.word}<br><span class="root-hint">(${wordData.root})</span>`;
        }
        bubble.appendChild(wordText);

        // Edit button (appears on hover)
        const editBtn = document.createElement('div');
        editBtn.className = 'sr-bubble-edit';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openBubbleEditModal(wordData, index, sentence);
        });
        bubble.appendChild(editBtn);

        // Click bubble to play audio if available
        const card = hasPicture ? this.findCardByNum(wordData.cardNum) : null;
        if (card?.hasAudio && card?.audioPath?.length > 0) {
            bubble.classList.add('has-audio');
            bubble.addEventListener('click', () => {
                this.playCardAudio(card);
            });
        }

        return bubble;
    }

    /**
     * Create a picture slot element
     */
    createPictureSlot(wordData, index) {
        const slot = document.createElement('div');
        slot.className = 'sr-picture-slot';
        slot.dataset.index = index;

        const hasPicture = !!(wordData.imagePath && wordData.cardNum);

        if (hasPicture) {
            const card = this.findCardByNum(wordData.cardNum);
            slot.classList.add('has-picture');

            // Create flippable card
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'sr-slot-card';

            const cardInner = document.createElement('div');
            cardInner.className = 'sr-slot-card-inner';

            // Front face (image)
            const front = document.createElement('div');
            front.className = 'sr-slot-face sr-slot-front';

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
                    const fallbackImg = document.createElement('img');
                    fallbackImg.src = wordData.imagePath || this.getPlaceholderSvg();
                    fallbackImg.alt = wordData.word;
                    video.replaceWith(fallbackImg);
                };
                front.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = displayPath;
                img.alt = wordData.word;
                img.onerror = () => {
                    img.src = this.getPlaceholderSvg();
                };
                front.appendChild(img);
            }

            // Speaker icon on front
            if (card?.hasAudio && card?.audioPath?.length > 0) {
                const speaker = document.createElement('div');
                speaker.className = 'sr-slot-speaker';
                speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
                speaker.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playCardAudio(card);
                });
                front.appendChild(speaker);
            }

            // Back face (word and english)
            const back = document.createElement('div');
            back.className = 'sr-slot-face sr-slot-back';

            const backWord = document.createElement('div');
            backWord.className = 'sr-slot-word';
            backWord.textContent = card?.word || wordData.word;
            back.appendChild(backWord);

            if (card?.english) {
                const backEnglish = document.createElement('div');
                backEnglish.className = 'sr-slot-english';
                backEnglish.textContent = card.english;
                back.appendChild(backEnglish);
            }

            cardInner.appendChild(front);
            cardInner.appendChild(back);
            cardWrapper.appendChild(cardInner);

            // Click to flip
            cardWrapper.addEventListener('click', () => {
                cardWrapper.classList.toggle('flipped');
            });

            slot.appendChild(cardWrapper);
        } else {
            // Empty slot for function words (no picture)
            slot.classList.add('no-picture');
            const dot = document.createElement('div');
            dot.className = 'sr-no-picture-dot';
            slot.appendChild(dot);
        }

        return slot;
    }

    /**
     * Draw SVG connection lines from bubbles to pictures
     */
    drawConnectionLines(svg, bubbleRefs, pictureRefs) {
        const svgNS = 'http://www.w3.org/2000/svg';
        svg.innerHTML = '';

        const layoutContainer = svg.parentElement;
        if (!layoutContainer) return;

        const containerRect = layoutContainer.getBoundingClientRect();

        // Set SVG dimensions to match container
        svg.setAttribute('width', containerRect.width);
        svg.setAttribute('height', containerRect.height);
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';

        bubbleRefs.forEach((bubbleRef, index) => {
            if (!bubbleRef.hasPicture) return;

            const bubble = bubbleRef.element;
            const picture = pictureRefs[index]?.element;
            if (!picture) return;

            const bubbleRect = bubble.getBoundingClientRect();
            const pictureRect = picture.getBoundingClientRect();

            // Calculate positions relative to container
            const startX = bubbleRect.left - containerRect.left + bubbleRect.width / 2;
            const startY = bubbleRect.bottom - containerRect.top;
            const endX = pictureRect.left - containerRect.left + pictureRect.width / 2;
            const endY = pictureRect.top - containerRect.top;

            // Create line
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', endY);
            line.setAttribute('class', 'sr-connection-line');
            svg.appendChild(line);
        });
    }

    /**
     * Get placeholder SVG data URL
     */
    getPlaceholderSvg() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+';
    }

    /**
     * Open modal to edit a word bubble
     */
    openBubbleEditModal(wordData, index, sentence) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal sr-bubble-edit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Word Bubble</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Word(s)</label>
                        <input type="text" class="form-control sr-bubble-word-input"
                               value="${wordData.word}"
                               placeholder="Enter word(s) - can be a phrase">
                        <small class="form-hint">Enter multiple words for a phrase (e.g., "kumain ng")</small>
                    </div>

                    <div class="form-group">
                        <label>Root Word (optional)</label>
                        <input type="text" class="form-control sr-bubble-root-input"
                               value="${wordData.root || ''}"
                               placeholder="Root word hint">
                    </div>

                    <div class="form-group">
                        <label>Linked Picture</label>
                        <div class="sr-linked-picture-preview">
                            ${wordData.cardNum ? this.renderLinkedPicturePreview(wordData) : '<div class="no-picture-linked">No picture linked</div>'}
                        </div>
                        <div class="sr-picture-actions">
                            <button class="btn btn-secondary sr-change-picture-btn">
                                <i class="fas fa-image"></i> ${wordData.cardNum ? 'Change Picture' : 'Link Picture'}
                            </button>
                            ${wordData.cardNum ? '<button class="btn btn-outline sr-remove-picture-btn"><i class="fas fa-unlink"></i> Remove Link</button>' : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary sr-bubble-cancel-btn">Cancel</button>
                    <button class="btn btn-primary sr-bubble-save-btn">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        // Store current cardNum for reference
        let currentCardNum = wordData.cardNum;
        let currentImagePath = wordData.imagePath;

        // Event listeners
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.sr-bubble-cancel-btn').addEventListener('click', closeModal);

        // Change picture button
        modal.querySelector('.sr-change-picture-btn').addEventListener('click', () => {
            this.openPictureSelectorModal((selectedCard) => {
                currentCardNum = selectedCard.cardNum;
                currentImagePath = selectedCard.printImagePath || selectedCard.imagePath;

                // Update preview
                const previewContainer = modal.querySelector('.sr-linked-picture-preview');
                previewContainer.innerHTML = this.renderLinkedPicturePreview({
                    cardNum: currentCardNum,
                    imagePath: currentImagePath
                });

                // Update actions
                const actionsContainer = modal.querySelector('.sr-picture-actions');
                actionsContainer.innerHTML = `
                    <button class="btn btn-secondary sr-change-picture-btn">
                        <i class="fas fa-image"></i> Change Picture
                    </button>
                    <button class="btn btn-outline sr-remove-picture-btn">
                        <i class="fas fa-unlink"></i> Remove Link
                    </button>
                `;

                // Re-attach listeners
                actionsContainer.querySelector('.sr-change-picture-btn').addEventListener('click', () => {
                    this.openPictureSelectorModal((selectedCard) => {
                        currentCardNum = selectedCard.cardNum;
                        currentImagePath = selectedCard.printImagePath || selectedCard.imagePath;
                        previewContainer.innerHTML = this.renderLinkedPicturePreview({
                            cardNum: currentCardNum,
                            imagePath: currentImagePath
                        });
                    });
                });

                actionsContainer.querySelector('.sr-remove-picture-btn').addEventListener('click', () => {
                    currentCardNum = null;
                    currentImagePath = null;
                    previewContainer.innerHTML = '<div class="no-picture-linked">No picture linked</div>';
                    actionsContainer.innerHTML = `
                        <button class="btn btn-secondary sr-change-picture-btn">
                            <i class="fas fa-image"></i> Link Picture
                        </button>
                    `;
                });
            });
        });

        // Remove picture button (if exists)
        const removePicBtn = modal.querySelector('.sr-remove-picture-btn');
        if (removePicBtn) {
            removePicBtn.addEventListener('click', () => {
                currentCardNum = null;
                currentImagePath = null;
                modal.querySelector('.sr-linked-picture-preview').innerHTML = '<div class="no-picture-linked">No picture linked</div>';
                modal.querySelector('.sr-picture-actions').innerHTML = `
                    <button class="btn btn-secondary sr-change-picture-btn">
                        <i class="fas fa-image"></i> Link Picture
                    </button>
                `;
            });
        }

        // Save button
        modal.querySelector('.sr-bubble-save-btn').addEventListener('click', () => {
            const newWord = modal.querySelector('.sr-bubble-word-input').value.trim();
            const newRoot = modal.querySelector('.sr-bubble-root-input').value.trim() || null;

            if (!newWord) {
                alert('Please enter a word or phrase.');
                return;
            }

            // Update wordData
            wordData.word = newWord;
            wordData.root = newRoot;
            wordData.cardNum = currentCardNum;
            wordData.imagePath = currentImagePath;

            // Mark lesson as edited
            this.markLessonEdited();

            // Re-render
            this.renderCurrentSentence();
            closeModal();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Render linked picture preview HTML
     */
    renderLinkedPicturePreview(wordData) {
        const card = this.findCardByNum(wordData.cardNum);
        const imagePath = card?.imagePath || wordData.imagePath;

        return `
            <div class="linked-picture-card">
                <img src="${imagePath}" alt="Linked picture" onerror="this.src='${this.getPlaceholderSvg()}'">
                <div class="linked-picture-info">
                    <div class="linked-card-word">${card?.word || 'Unknown'}</div>
                    <div class="linked-card-english">${card?.english || ''}</div>
                </div>
            </div>
        `;
    }

    /**
     * Open picture selector modal
     */
    openPictureSelectorModal(onSelect) {
        const allCards = this.assets.getCards({ lesson: null });

        const modal = document.createElement('div');
        modal.className = 'modal sr-picture-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-images"></i> Select Picture</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sr-search-bar">
                        <input type="text" placeholder="Search cards..." class="sr-pic-search">
                    </div>
                    <div class="sr-pic-grid">
                        ${allCards.map(card => `
                            <div class="sr-pic-option" data-card-num="${card.cardNum}">
                                ${card.imagePath ?
                                    `<img src="${card.imagePath}" alt="${card.word}" onerror="this.parentElement.querySelector('.no-image')?.classList.remove('hidden'); this.style.display='none';">` :
                                    '<div class="no-image">No image</div>'
                                }
                                <div class="card-word">${card.word}</div>
                                <div class="card-english">${card.english || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Search functionality
        const searchInput = modal.querySelector('.sr-pic-search');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            modal.querySelectorAll('.sr-pic-option').forEach(option => {
                const word = option.querySelector('.card-word').textContent.toLowerCase();
                const english = option.querySelector('.card-english').textContent.toLowerCase();
                option.style.display = (word.includes(query) || english.includes(query)) ? '' : 'none';
            });
        });

        // Card selection
        modal.querySelectorAll('.sr-pic-option').forEach(option => {
            option.addEventListener('click', () => {
                const cardNum = parseInt(option.dataset.cardNum);
                const selectedCard = allCards.find(c => c.cardNum === cardNum);
                if (selectedCard) {
                    onSelect(selectedCard);
                    closeModal();
                }
            });
        });
    }

    /**
     * Mark the current lesson as edited (for deck builder integration)
     */
    markLessonEdited() {
        // This flag can be used to track unsaved changes
        this.hasUnsavedChanges = true;
        debugLogger?.log(2, 'Sentence review data modified');
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
        const englishHint = document.getElementById('srEnglishHint');

        if (this.isTextRevealed) {
            revealedText.classList.remove('hidden');
            englishHint.classList.remove('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Sentence Text';
        } else {
            revealedText.classList.add('hidden');
            englishHint.classList.add('hidden');
            revealBtn.innerHTML = '<i class="fas fa-eye"></i> Show Sentence Text';
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
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
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

                currentSequence.sentences.push({
                    id: parseInt(sentNum),
                    text: cleanText,
                    english: english || '',
                    sentenceType: sentType || null,
                    words: words
                });
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
