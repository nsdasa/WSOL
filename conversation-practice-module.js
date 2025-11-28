// =================================================================
// CONVERSATION PRACTICE MODULE - Bob and Mariel Ward School
// Version 1.0 - November 2025
// Practice Q&A dialogue with Picture Match and Audio Match modes
// =================================================================

class ConversationPracticeModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.qaPairs = [];              // Question-answer pairs extracted from sequences
        this.currentPairIndex = 0;
        this.mode = 'review';           // 'review' or 'test'
        this.gameForm = 'picture';      // 'picture' or 'audio'
        this.score = { correct: 0, total: 0 };
        this.selectedAnswer = null;
        this.hasAnswered = false;
        this.distractorCount = 3;       // Number of wrong answers to show
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';

        this.container.innerHTML = `
            <div class="module-conversation-practice">
                <h1><i class="fas fa-comments"></i> Conversation Zone (${langName}: Lesson ${lessonNum})</h1>

                <div class="cp-controls">
                    <div class="cp-mode-toggle">
                        <button class="cp-mode-btn active" data-mode="review">
                            <i class="fas fa-book-open"></i> Review Mode
                        </button>
                        <button class="cp-mode-btn" data-mode="test">
                            <i class="fas fa-clipboard-check"></i> Test Mode
                        </button>
                    </div>
                    <div class="cp-form-toggle">
                        <button class="cp-form-btn active" data-form="picture">
                            <i class="fas fa-images"></i> Picture Match
                        </button>
                        <button class="cp-form-btn" data-form="audio">
                            <i class="fas fa-headphones"></i> Audio Match
                        </button>
                    </div>
                </div>

                <div class="cp-progress">
                    <span id="cpProgressText">Question 1 of 1</span>
                    <div class="cp-score" id="cpScore">Score: 0/0</div>
                </div>

                <div class="cp-game-area" id="cpGameArea">
                    <!-- Game content rendered here -->
                </div>

                <div class="cp-navigation">
                    <button id="cpPrevBtn" class="btn btn-secondary" disabled>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <button id="cpNextBtn" class="btn btn-primary" disabled>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="empty-state hidden" id="cpNoDataState">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>No Conversation Data</h2>
                    <p>No Q&A sentence pairs found for this lesson.</p>
                </div>
            </div>
        `;
    }

    async init() {
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showNoDataState('Please select a language and lesson to begin.');
            return;
        }

        // Extract Q&A pairs from sentence review data
        this.extractQAPairs();

        if (this.qaPairs.length === 0) {
            this.showNoDataState('No Q&A sentence pairs found for this lesson. Please add sentence data with questions and answers.');
            return;
        }

        this.setupEventListeners();
        this.renderCurrentQuestion();
        this.updateProgress();

        if (instructionManager) {
            instructionManager.show(
                'conversation-practice',
                'Conversation Zone',
                'Practice Q&A dialogues. Listen to or view the question, then select the correct response. Click cards to flip and see words. Use the speaker icon to hear pronunciation.'
            );
        }
    }

    /**
     * Extract Q&A pairs from sentence review data
     * Pairs questions with their following answers/statements
     */
    extractQAPairs() {
        this.qaPairs = [];
        const manifest = this.assets.manifest;
        const trigraph = this.assets.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonNum = this.assets.currentLesson;

        // Check for review lesson
        const lessonMeta = manifest?.lessonMeta?.[trigraph]?.[lessonNum];
        const isReviewLesson = lessonMeta?.type === 'review';
        const lessonsToLoad = isReviewLesson && lessonMeta?.reviewsLessons?.length > 0
            ? lessonMeta.reviewsLessons
            : [lessonNum];

        // Collect all sentences from sequences
        const allSentences = [];

        for (const lesson of lessonsToLoad) {
            const lessonData = manifest?.sentenceReview?.[trigraph]?.lessons?.[lesson];
            if (!lessonData?.sequences) continue;

            for (const sequence of lessonData.sequences) {
                if (!sequence.sentences?.length) continue;

                // Process sentences in sequence to find Q&A pairs
                for (let i = 0; i < sequence.sentences.length; i++) {
                    const sentence = sequence.sentences[i];
                    allSentences.push({
                        ...sentence,
                        sequenceTitle: sequence.title,
                        lessonNum: lesson
                    });
                }
            }
        }

        // Create Q&A pairs
        // A question followed by answer/statement forms a pair
        for (let i = 0; i < allSentences.length; i++) {
            const sentence = allSentences[i];

            // If it's a question and there's a next sentence, create a pair
            if (sentence.sentenceType === 'question' && i + 1 < allSentences.length) {
                const answer = allSentences[i + 1];
                // Only pair if the answer is in the same sequence or is an answer/statement
                if (answer.sentenceType === 'answer' || answer.sentenceType === 'statement' ||
                    answer.sequenceTitle === sentence.sequenceTitle) {
                    this.qaPairs.push({
                        question: sentence,
                        correctAnswer: answer,
                        sequenceTitle: sentence.sequenceTitle
                    });
                }
            }
        }

        // If no explicit Q&A pairs found, try pairing any adjacent sentences
        if (this.qaPairs.length === 0) {
            for (let i = 0; i < allSentences.length - 1; i += 2) {
                this.qaPairs.push({
                    question: allSentences[i],
                    correctAnswer: allSentences[i + 1],
                    sequenceTitle: allSentences[i].sequenceTitle
                });
            }
        }

        // Shuffle pairs for variety
        this.qaPairs = shuffleArray(this.qaPairs);

        debugLogger?.log(2, `Extracted ${this.qaPairs.length} Q&A pairs`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mode toggle
        document.querySelectorAll('.cp-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cp-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.renderCurrentQuestion();
            });
        });

        // Form toggle
        document.querySelectorAll('.cp-form-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cp-form-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameForm = btn.dataset.form;
                this.renderCurrentQuestion();
            });
        });

        // Navigation
        document.getElementById('cpPrevBtn').addEventListener('click', () => this.previousQuestion());
        document.getElementById('cpNextBtn').addEventListener('click', () => this.nextQuestion());

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
                this.previousQuestion();
                break;
            case 'ArrowRight':
                if (this.hasAnswered) this.nextQuestion();
                break;
            case ' ':
                e.preventDefault();
                // Play question audio
                this.playQuestionAudio();
                break;
        }
    }

    /**
     * Render current question based on game form
     */
    renderCurrentQuestion() {
        if (this.qaPairs.length === 0) return;

        this.hasAnswered = false;
        this.selectedAnswer = null;
        const pair = this.qaPairs[this.currentPairIndex];

        const gameArea = document.getElementById('cpGameArea');

        if (this.gameForm === 'picture') {
            this.renderPictureMatch(gameArea, pair);
        } else {
            this.renderAudioMatch(gameArea, pair);
        }

        this.updateNavigationButtons();
    }

    /**
     * Render Picture Match form
     */
    renderPictureMatch(container, pair) {
        const distractors = this.getDistractors(pair.correctAnswer);
        const answers = shuffleArray([pair.correctAnswer, ...distractors]);

        container.innerHTML = `
            <div class="cp-question-section">
                <div class="cp-label">QUESTION:</div>
                <div class="cp-sentence-display cp-question">
                    ${this.renderSentenceCards(pair.question)}
                    <button class="cp-audio-btn" data-sentence="question">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>

            <div class="cp-divider"></div>

            <div class="cp-answers-section">
                <div class="cp-label">Select the correct response:</div>
                <div class="cp-answers-grid">
                    ${answers.map((answer, idx) => `
                        <div class="cp-answer-option" data-index="${idx}" data-correct="${answer === pair.correctAnswer}">
                            <div class="cp-sentence-display">
                                ${this.renderSentenceCards(answer)}
                            </div>
                            <button class="cp-answer-audio-btn" data-answer-index="${idx}">
                                <i class="fas fa-volume-up"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="cp-feedback hidden" id="cpFeedback"></div>
        `;

        // Store answers for reference
        this.currentAnswers = answers;
        this.correctAnswerIndex = answers.indexOf(pair.correctAnswer);

        // Setup answer click handlers
        container.querySelectorAll('.cp-answer-option').forEach(option => {
            option.addEventListener('click', (e) => {
                if (!e.target.closest('.cp-answer-audio-btn') && !e.target.closest('.cp-card-wrapper')) {
                    this.selectAnswer(parseInt(option.dataset.index));
                }
            });
        });

        // Setup audio buttons
        container.querySelector('.cp-audio-btn[data-sentence="question"]')?.addEventListener('click', () => {
            this.playSentenceAudio(pair.question);
        });

        container.querySelectorAll('.cp-answer-audio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.answerIndex);
                this.playSentenceAudio(this.currentAnswers[idx]);
            });
        });

        // Setup card flip handlers
        this.setupCardFlipHandlers(container);
    }

    /**
     * Render Audio Match form
     */
    renderAudioMatch(container, pair) {
        const distractors = this.getDistractors(pair.correctAnswer);
        const answers = shuffleArray([pair.correctAnswer, ...distractors]);

        container.innerHTML = `
            <div class="cp-question-section cp-audio-only">
                <div class="cp-label">QUESTION:</div>
                <div class="cp-audio-player">
                    <button class="cp-play-question-btn" id="cpPlayQuestion">
                        <i class="fas fa-play"></i>
                        <span>Play Question</span>
                    </button>
                </div>
            </div>

            <div class="cp-divider"></div>

            <div class="cp-answers-section">
                <div class="cp-label">Listen and select the correct response:</div>
                <div class="cp-audio-answers-grid">
                    ${answers.map((answer, idx) => `
                        <div class="cp-audio-answer-option" data-index="${idx}" data-correct="${answer === pair.correctAnswer}">
                            <button class="cp-play-answer-btn" data-answer-index="${idx}">
                                <i class="fas fa-play"></i>
                                <span>Play ${String.fromCharCode(65 + idx)}</span>
                            </button>
                            <button class="cp-select-answer-btn" data-answer-index="${idx}">
                                Select ${String.fromCharCode(65 + idx)}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="cp-feedback hidden" id="cpFeedback"></div>
        `;

        // Store answers for reference
        this.currentAnswers = answers;
        this.correctAnswerIndex = answers.indexOf(pair.correctAnswer);

        // Setup play question button
        document.getElementById('cpPlayQuestion')?.addEventListener('click', () => {
            this.playSentenceAudio(pair.question);
        });

        // Setup play answer buttons
        container.querySelectorAll('.cp-play-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.answerIndex);
                this.playSentenceAudio(this.currentAnswers[idx]);
            });
        });

        // Setup select answer buttons
        container.querySelectorAll('.cp-select-answer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.answerIndex);
                this.selectAnswer(idx);
            });
        });
    }

    /**
     * Render sentence as a row of cards
     */
    renderSentenceCards(sentence) {
        if (!sentence?.words?.length) {
            return `<span class="cp-text-only">${sentence?.text || ''}</span>`;
        }

        return sentence.words.map(wordData => {
            if (wordData.cardNum && wordData.imagePath) {
                const card = this.findCardByNum(wordData.cardNum);
                return this.renderFlipCard(wordData, card);
            } else {
                // Function word without card
                return `<span class="cp-function-word">${wordData.word}</span>`;
            }
        }).join('');
    }

    /**
     * Render a flip card for a word
     */
    renderFlipCard(wordData, card) {
        const imagePath = card?.imagePath || wordData.imagePath;
        const word = wordData.word;
        const english = card?.english || '';

        // In test mode, don't show English on flip
        const backContent = this.mode === 'review'
            ? `<div class="cp-card-word">${word}</div><div class="cp-card-english">${english}</div>`
            : `<div class="cp-card-word">${word}</div>`;

        return `
            <div class="cp-card-wrapper" data-card-num="${wordData.cardNum}">
                <div class="cp-card-inner">
                    <div class="cp-card-front">
                        <img src="${imagePath}" alt="${word}" loading="lazy">
                        ${card?.hasAudio ? '<i class="fas fa-volume-up cp-card-speaker"></i>' : ''}
                    </div>
                    <div class="cp-card-back">
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
        container.querySelectorAll('.cp-card-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();

                // Check if clicking speaker icon
                if (e.target.classList.contains('cp-card-speaker')) {
                    const cardNum = parseInt(wrapper.dataset.cardNum);
                    const card = this.findCardByNum(cardNum);
                    if (card) this.playCardAudio(card);
                    return;
                }

                // Toggle flip
                wrapper.classList.toggle('flipped');
            });
        });
    }

    /**
     * Get distractor answers (wrong answers)
     */
    getDistractors(correctAnswer) {
        const distractors = [];
        const usedTexts = new Set([correctAnswer.text]);

        // Get other sentences from different pairs
        const otherSentences = this.qaPairs
            .filter(p => p.correctAnswer.text !== correctAnswer.text)
            .map(p => p.correctAnswer);

        // Shuffle and pick distractors
        const shuffled = shuffleArray(otherSentences);

        for (const sentence of shuffled) {
            if (!usedTexts.has(sentence.text) && distractors.length < this.distractorCount) {
                distractors.push(sentence);
                usedTexts.add(sentence.text);
            }
        }

        return distractors;
    }

    /**
     * Select an answer
     */
    selectAnswer(index) {
        if (this.hasAnswered) return;

        this.hasAnswered = true;
        this.selectedAnswer = index;
        const isCorrect = index === this.correctAnswerIndex;

        if (isCorrect) {
            this.score.correct++;
        }
        this.score.total++;

        // Update UI
        this.showFeedback(isCorrect);
        this.highlightAnswers(index);
        this.updateScore();
        this.updateNavigationButtons();
    }

    /**
     * Show feedback after answer selection
     */
    showFeedback(isCorrect) {
        const feedback = document.getElementById('cpFeedback');
        if (!feedback) return;

        feedback.classList.remove('hidden');
        feedback.className = `cp-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.innerHTML = isCorrect
            ? '<i class="fas fa-check-circle"></i> Correct!'
            : '<i class="fas fa-times-circle"></i> Incorrect';
    }

    /**
     * Highlight correct/incorrect answers
     */
    highlightAnswers(selectedIndex) {
        const options = document.querySelectorAll('.cp-answer-option, .cp-audio-answer-option');
        options.forEach((option, idx) => {
            const isCorrect = option.dataset.correct === 'true';
            const isSelected = idx === selectedIndex;

            if (isCorrect) {
                option.classList.add('correct');
            } else if (isSelected) {
                option.classList.add('incorrect');
            }
        });
    }

    /**
     * Play sentence audio (word-by-word for now)
     */
    async playSentenceAudio(sentence) {
        if (!sentence?.words?.length) return;

        for (const wordData of sentence.words) {
            if (wordData.cardNum) {
                const card = this.findCardByNum(wordData.cardNum);
                if (card?.hasAudio) {
                    await this.playCardAudioAsync(card);
                    await this.delay(100); // Small gap between words
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
     * Play question audio
     */
    playQuestionAudio() {
        const pair = this.qaPairs[this.currentPairIndex];
        if (pair) this.playSentenceAudio(pair.question);
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
    previousQuestion() {
        if (this.currentPairIndex > 0) {
            this.currentPairIndex--;
            this.renderCurrentQuestion();
            this.updateProgress();
        }
    }

    nextQuestion() {
        if (this.currentPairIndex < this.qaPairs.length - 1) {
            this.currentPairIndex++;
            this.renderCurrentQuestion();
            this.updateProgress();
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('cpPrevBtn');
        const nextBtn = document.getElementById('cpNextBtn');

        if (prevBtn) prevBtn.disabled = this.currentPairIndex === 0;
        if (nextBtn) {
            nextBtn.disabled = !this.hasAnswered || this.currentPairIndex >= this.qaPairs.length - 1;
        }
    }

    updateProgress() {
        const progressText = document.getElementById('cpProgressText');
        if (progressText) {
            progressText.textContent = `Question ${this.currentPairIndex + 1} of ${this.qaPairs.length}`;
        }
    }

    updateScore() {
        const scoreEl = document.getElementById('cpScore');
        if (scoreEl) {
            scoreEl.textContent = `Score: ${this.score.correct}/${this.score.total}`;
        }
    }

    showNoDataState(message) {
        const gameArea = document.getElementById('cpGameArea');
        const noDataState = document.getElementById('cpNoDataState');

        if (gameArea) gameArea.classList.add('hidden');
        if (noDataState) {
            noDataState.classList.remove('hidden');
            noDataState.querySelector('p').textContent = message;
        }
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeydown);
        super.destroy();
    }
}
