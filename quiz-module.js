class UnsaNiQuizModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.rawCards = [];
        this.shuffledCards = [];
        this.currentCard = null;
        this.currentCardIndex = 0;
        this.currentMode = 'review';
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.userResponses = [];
        this.sequenceCounter = 0;
        this.scoreTracker = new ScoreTracker();
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';
        
        this.container.innerHTML = `
            <div class="container module-quiz">
                <h1>Unsa Ni? (${langName}: Lesson ${lessonNum})</h1>
                <div class="controls">
                    <div class="mode-buttons">
                        <button class="mode-btn active" data-mode="review">Review Mode</button>
                        <button class="mode-btn" data-mode="test">Test Mode</button>
                    </div>
                    <button id="startBtn">Start</button>
                    <button id="restartQuizBtn" class="btn-secondary"><i class="fas fa-redo"></i> Restart</button>
                </div>
                <div class="quiz-container" id="quizContainer" style="display:none;">
                    <div class="left-panel">
                        <div class="text-section">
                            <div class="prompt">Type the Cebuano word:</div>
                            <div class="input-section">
                                <input type="text" id="userInput" class="user-input" placeholder="Enter word...">
                                <button id="submitBtn">Submit</button>
                            </div>
                            <div id="correctWordDisplay" class="correct-word-display"></div>
                            <div id="feedbackMark" class="feedback-mark"></div>
                        </div>
                    </div>
                    <div class="center-panel">
                        <div class="image-section">
                            <img id="cardImage" class="card-image" src="" alt="Card">
                        </div>
                    </div>
                    <div class="right-panel" id="rightPanel" style="display:none;">
                        <div class="score-item">
                            <strong>Correct:</strong> <span id="correctCount">0</span>
                        </div>
                        <div class="score-item">
                            <strong>Incorrect:</strong> <span id="incorrectCount">0</span>
                        </div>
                    </div>
                </div>
                <div class="review-container" id="reviewContainer">
                    <h2 class="review-header" id="reviewHeader">Test Results</h2>
                    <div class="review-grid" id="reviewGrid"></div>
                    <div class="controls">
                        <button id="retryBtn">Try Again</button>
                    </div>
                </div>
                <div class="congratulations" id="congratulations">
                    * Congratulations! You've mastered all cards! *
                </div>
            </div>
        `;
    }
    
    async init() {
        // Check if language and lesson are selected
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            document.getElementById('quizContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Please select a language and lesson from the dropdowns above to begin.</p>
                </div>
            `;
            document.getElementById('quizContainer').style.display = 'flex';
            return;
        }
        
        this.rawCards = this.assets.getCards();
        
        if (this.rawCards.length === 0) {
            document.getElementById('quizContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No cards available for this lesson.</p>
                </div>
            `;
            document.getElementById('quizContainer').style.display = 'flex';
            return;
        }
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
            });
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('retryBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('restartQuizBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitAnswer());
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'quiz',
                'Unsa Ni? Instructions',
                'Type in the word that matches the picture. Press enter or click on Submit.'
            );
        }
    }
    
    startQuiz() {
        if (this.rawCards.length === 0) {
            alert('No cards available. Please scan assets.');
            return;
        }
        
        this.scoreTracker.reset();
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.userResponses = [];
        
        if (this.currentMode === 'test') {
            this.shuffledCards = [...this.rawCards].sort(() => Math.random() - 0.5);
            this.currentCardIndex = 0;
            this.updateScores();
            this.sequenceCounter = 0;
            document.getElementById('rightPanel').style.display = 'block';
        } else {
            this.shuffledCards = [...this.rawCards].map(c => ({
                ...c,
                mastered: false,
                minNextShow: -1
            }));
            this.sequenceCounter = 0;
            this.correctCount = 0;
            this.incorrectCount = 0;
            document.getElementById('rightPanel').style.display = 'none';
        }
        
        document.getElementById('quizContainer').style.display = 'flex';
        document.getElementById('reviewContainer').style.display = 'none';
        document.getElementById('congratulations').style.display = 'none';
        
        this.showNextCard();
    }
    
    showNextCard() {
        let card;
        
        if (this.currentMode === 'test') {
            if (this.currentCardIndex >= this.shuffledCards.length) {
                this.showReview();
                return;
            }
            card = this.shuffledCards[this.currentCardIndex];
            this.currentCardIndex++;
        } else {
            const unmastered = this.shuffledCards.filter(c => !c.mastered);
            if (unmastered.length === 0) {
                this.showCongratulations();
                return;
            }
            
            const eligible = unmastered.filter(c => c.minNextShow <= this.sequenceCounter);
            if (eligible.length === 0) {
                card = unmastered[0];
            } else {
                card = eligible[Math.floor(Math.random() * eligible.length)];
            }
        }
        
        this.currentCard = card;
        document.getElementById('cardImage').src = card.imagePath;
        document.getElementById('userInput').value = '';
        document.getElementById('userInput').focus();
        document.getElementById('feedbackMark').classList.remove('show');
        document.getElementById('correctWordDisplay').classList.remove('show');
    }
    
    submitAnswer() {
        if (!this.currentCard) return;
        
        const userAnswer = document.getElementById('userInput').value.trim().toLowerCase();
        // UPDATED: Check against all acceptable answers
        const acceptableAnswers = this.currentCard.acceptableAnswers || [this.currentCard.cebuano];
        const isCorrect = acceptableAnswers.some(answer => answer.toLowerCase() === userAnswer);
        
        const feedbackMark = document.getElementById('feedbackMark');
        
        if (this.currentMode === 'test') {
            this.userResponses[this.currentCardIndex - 1] = { userAnswer, isCorrect };
            
            if (isCorrect) {
                this.correctCount++;
                feedbackMark.innerHTML = 'OK';
                feedbackMark.className = 'feedback-mark correct show';
            } else {
                this.incorrectCount++;
                feedbackMark.innerHTML = 'X';
                feedbackMark.className = 'feedback-mark incorrect show';
            }
            
            this.updateScores();
            setTimeout(() => this.showNextCard(), 1500);
        } else {
            if (isCorrect) {
                this.currentCard.mastered = true;
                feedbackMark.innerHTML = 'OK';
                feedbackMark.className = 'feedback-mark correct show';
                setTimeout(() => {
                    this.sequenceCounter++;
                    this.showNextCard();
                }, 1500);
            } else {
                feedbackMark.innerHTML = 'X';
                feedbackMark.className = 'feedback-mark incorrect show';
                
                const correctDisplay = document.getElementById('correctWordDisplay');
                // Show first acceptable answer as the correct one
                correctDisplay.textContent = `Correct: ${acceptableAnswers[0]}`;
                correctDisplay.classList.add('show');
                
                this.currentCard.minNextShow = this.sequenceCounter + 3;
                
                setTimeout(() => {
                    correctDisplay.classList.remove('show');
                    this.sequenceCounter++;
                    this.showNextCard();
                }, 3000);
            }
        }
    }
    
    updateScores() {
        document.getElementById('correctCount').textContent = this.correctCount;
        document.getElementById('incorrectCount').textContent = this.incorrectCount;
    }
    
    showReview() {
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('reviewContainer').style.display = 'block';
        
        const total = this.shuffledCards.length;
        const percentage = Math.round((this.correctCount / total) * 100);
        
        document.getElementById('reviewHeader').textContent = `Final Score: ${this.correctCount}/${total} (${percentage}%)`;
        
        const grid = document.getElementById('reviewGrid');
        grid.innerHTML = '';
        
        this.shuffledCards.forEach((card, index) => {
            const response = this.userResponses[index];
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <img src="${card.imagePath}" alt="${card.cebuano}" class="review-image">
                <div class="review-word">${card.cebuano}</div>
                <div class="selected-word">${response ? response.userAnswer : 'No answer'} <span class="match-mark ${response && response.isCorrect ? 'correct' : 'incorrect'}">${response && response.isCorrect ? 'OK' : 'X'}</span></div>
            `;
            grid.appendChild(item);
        });
    }
    
    showCongratulations() {
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('congratulations').style.display = 'block';
    }
}
