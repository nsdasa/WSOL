class MatchExerciseModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.allCards = [];
        this.virtualCards = []; // ADDED: Virtual cards for multi-word support
        this.currentMode = 'review';
        this.unmatched = new Set();
        this.selectedItem = null;
        this.matches = [];
        this.currentTargetIdx = null;
        this.presentedPictureIndices = new Set();
        this.scoreTracker = new ScoreTracker();
        this.reviewRepetitions = 3; // Default: need to get each word correct 3 times
        this.correctCounts = new Map(); // Track how many times each card answered correctly
    }
    
    // ADDED: Expand physical cards into virtual cards (one per acceptable answer)
    expandToVirtualCards(cards) {
        const virtualCards = [];
        cards.forEach((card, physicalIndex) => {
            const acceptableAnswers = card.acceptableAnswers || [card.word];
            acceptableAnswers.forEach(targetWord => {
                virtualCards.push({
                    cardId: card.cardNum,           // Track original card (v4.0)
                    targetWord: targetWord,         // The specific word to test
                    physicalIndex: physicalIndex,   // Index in allCards array
                    imagePath: card.imagePath,
                    audioPath: card.audioPath,
                    allWords: acceptableAnswers,    // For exclusion logic
                    originalCard: card              // Full card reference
                });
            });
        });
        return virtualCards;
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        
        // v4.2: Check if advanced filter is active
        const lessonDisplay = (filterManager && filterManager.isActive()) 
            ? 'Special' 
            : (this.assets.currentLesson || 'Lesson');
        
        this.container.innerHTML = `
            <div class="container module-match">
                <h1>Picture Match (${langName}: ${lessonDisplay})</h1>
                <div class="controls">
                    <div class="mode-buttons">
                        <button class="mode-btn active" data-mode="review">Review Mode</button>
                        <button class="mode-btn" data-mode="test">Test Mode</button>
                    </div>
                    <div class="review-settings" id="reviewSettings">
                        <label for="reviewReps">Review Repetitions:</label>
                        <input type="number" id="reviewReps" min="1" max="10" value="3" style="width: 60px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <button id="startBtn">Start</button>
                    <button id="restartMatchBtn" class="btn-secondary"><i class="fas fa-redo"></i> Restart</button>
                </div>
                <div class="progress-section">
                    <div class="progress-label">Progress: <span id="progressText">0/0</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                </div>
                <div class="matching-container-sound" id="matchingContainer">
                    <div class="pictures-row" id="wordsRow"></div>
                    <div class="audio-section" id="pictureSection"></div>
                    <svg class="lines-overlay" id="linesSvg"></svg>
                    <div class="feedback" id="feedback"></div>
                </div>
                <div class="review-container" id="reviewContainer">
                    <h2 class="review-header" id="reviewHeader">Test Results</h2>
                    <div class="score-display" id="scoreDisplay" style="display:none;">
                        Score: <span class="score-value" id="scoreValue">0</span>%
                    </div>
                    <div class="review-grid" id="reviewGrid"></div>
                    <div class="controls">
                        <button id="retryBtn">Try Again</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async init() {
        // v4.2: Check if language and lesson/filter are selected
        const hasFilter = filterManager && filterManager.isActive();
        if (!this.assets.currentLanguage || (!this.assets.currentLesson && !hasFilter)) {
            document.getElementById('matchingContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Please select a language and lesson from the dropdowns above to begin.</p>
                </div>
            `;
            return;
        }
        
        this.allCards = this.assets.getCards();
        
        if (this.allCards.length === 0) {
            document.getElementById('matchingContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No cards available for this ${hasFilter ? 'filter' : 'lesson'}.</p>
                    <p>Please ${hasFilter ? 'adjust your filters' : 'scan assets or select a different lesson'}.</p>
                </div>
            `;
            return;
        }
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                
                // Show/hide review settings based on mode
                const reviewSettings = document.getElementById('reviewSettings');
                if (reviewSettings) {
                    reviewSettings.style.display = this.currentMode === 'review' ? 'flex' : 'none';
                }
            });
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startExercise());
        document.getElementById('retryBtn').addEventListener('click', () => this.startExercise());
        document.getElementById('restartMatchBtn').addEventListener('click', () => this.startExercise());
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'match',
                'Picture Match Instructions',
                'Look at the picture, then click the matching word above. In Review Mode, you need to get each word correct multiple times (default: 3).'
            );
        }
    }
    
    startExercise() {
        if (this.allCards.length === 0) {
            alert('No cards available. Please scan assets.');
            return;
        }
        
        // Read review repetitions value
        const reviewRepsInput = document.getElementById('reviewReps');
        if (reviewRepsInput) {
            this.reviewRepetitions = parseInt(reviewRepsInput.value) || 3;
        }
        
        document.getElementById('matchingContainer').style.display = 'flex';
        document.getElementById('reviewContainer').style.display = 'none';
        
        this.scoreTracker.reset();
        this.matches = [];
        
        // UPDATED: Expand to virtual cards
        this.virtualCards = this.expandToVirtualCards(this.allCards);
        this.unmatched = new Set(this.virtualCards.map((_, i) => i));
        this.presentedPictureIndices = new Set();
        this.selectedItem = null;
        
        // Initialize correct counts for review mode
        this.correctCounts = new Map();
        this.virtualCards.forEach((_, idx) => {
            this.correctCounts.set(idx, 0);
        });
        
        this.renderPicture();
        this.renderWords();
        
        if (this.currentMode === 'test') {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress();
        } else {
            // Show progress in review mode too
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress();
        }
    }
    
    renderPicture() {
        const pictureSection = document.getElementById('pictureSection');
        
        // Check if we've shown all pictures - means we're done
        if (this.unmatched.size === 0) {
            if (this.currentMode === 'review') {
                pictureSection.innerHTML = `
                    <div class="completion-message" style="text-align: center; padding: 20px;">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 12px;"></i>
                        <h3>Excellent! All cards mastered!</h3>
                        <p>Click "Restart" to practice again.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Select a target from unmatched
        const unmatchedArray = Array.from(this.unmatched);
        
        // For test mode, prioritize pictures that haven't been presented yet
        let availableForPresentation = unmatchedArray.filter(idx => !this.presentedPictureIndices.has(idx));
        if (availableForPresentation.length === 0) {
            // All have been presented at least once, just use any unmatched
            availableForPresentation = unmatchedArray;
        }
        
        const randomIdx = availableForPresentation[Math.floor(Math.random() * availableForPresentation.length)];
        this.currentTargetIdx = randomIdx;
        this.presentedPictureIndices.add(randomIdx); // Mark as presented
        
        const targetCard = this.virtualCards[randomIdx];
        
        pictureSection.innerHTML = `
            <div class="picture-only">
                <img src="${targetCard.imagePath}" alt="Match this picture">
            </div>
        `;
    }
    
    renderWords() {
        const wordsRow = document.getElementById('wordsRow');
        wordsRow.innerHTML = '';
        
        if (this.unmatched.size === 0 || this.currentTargetIdx === null) return;
        
        const targetCard = this.virtualCards[this.currentTargetIdx];
        const maxPictures = deviceDetector ? deviceDetector.getMaxPictures() : 4;
        
        // Get other unmatched cards (excluding cards that share words with target)
        const otherUnmatched = Array.from(this.unmatched).filter(idx => {
            const card = this.virtualCards[idx];
            // Exclude if it's a variant of the same physical card
            if (card.cardId === targetCard.cardId) return false;
            // Exclude if any of its words overlap with target's words
            return !card.allWords.some(w => targetCard.allWords.includes(w));
        });
        
        // Shuffle and take up to (maxPictures - 1) other cards
        const shuffled = otherUnmatched.sort(() => Math.random() - 0.5).slice(0, maxPictures - 1);
        
        // Create array with target and others, then shuffle positions
        const displayWords = [this.currentTargetIdx, ...shuffled].sort(() => Math.random() - 0.5);
        
        displayWords.forEach(virtualIdx => {
            const card = this.virtualCards[virtualIdx];
            
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span class="word">${card.targetWord}</span>
                <div class="dot" data-idx="${virtualIdx}"></div>
            `;
            
            item.addEventListener('click', () => this.selectWord(item, virtualIdx));
            wordsRow.appendChild(item);
        });
    }
    
    selectWord(item, virtualIdx) {
        // Process the match immediately
        const selectedCard = this.virtualCards[virtualIdx];
        const targetCard = this.virtualCards[this.currentTargetIdx];
        const selectedWord = selectedCard.targetWord;
        
        // Compare selected word against all acceptable answers for target
        const isCorrect = targetCard.allWords.includes(selectedWord);
        
        // Find the dot for visual feedback
        const dot = item.querySelector('.dot');
        
        // Get the picture container for line drawing
        const pictureContainer = document.querySelector('.picture-only');
        
        // Draw line from picture to selected word
        const lineColor = this.currentMode === 'test' || isCorrect ? 'green' : 'red';
        const line = pictureContainer && dot ? this.drawLineFromPicture(pictureContainer, dot, lineColor) : null;
        
        if (this.currentMode === 'review') {
            this.showFeedback(isCorrect ? 'OK' : 'X', isCorrect ? 'correct' : 'incorrect');
            if (isCorrect) {
                // Increment correct count
                const currentCount = this.correctCounts.get(virtualIdx) || 0;
                this.correctCounts.set(virtualIdx, currentCount + 1);
                
                // Only remove from unmatched if reached the required repetitions
                if (this.correctCounts.get(virtualIdx) >= this.reviewRepetitions) {
                    this.unmatched.delete(virtualIdx);
                    item.classList.add('matched');
                    dot.classList.add('matched');
                    setTimeout(() => this.fadeAndRemove(item, line), 1000);
                } else {
                    // Still need more repetitions - just show feedback and continue
                    item.classList.add('matched');
                    dot.classList.add('matched');
                    setTimeout(() => {
                        const svg = document.getElementById('linesSvg');
                        if (line && svg.contains(line)) svg.removeChild(line);
                        // Refresh for next round
                        this.renderPicture();
                        this.renderWords();
                        this.updateProgress();
                    }, 1000);
                }
            } else {
                setTimeout(() => {
                    const svg = document.getElementById('linesSvg');
                    if (line && svg.contains(line)) svg.removeChild(line);
                }, 1000);
            }
        } else {
            // Test mode
            this.matches.push({
                pictureCard: this.virtualCards[this.currentTargetIdx], // UPDATED
                selectedWord: selectedWord
            });
            
            this.scoreTracker.recordAnswer(isCorrect, this.virtualCards[this.currentTargetIdx].originalCard); // FIX: Use target, not selected
            this.unmatched.delete(this.currentTargetIdx); // FIX: Remove TARGET picture, not selected word
            item.classList.add('matched');
            dot.classList.add('matched');
            
            // In test mode, swap ALL elements after selection
            setTimeout(() => {
                const svg = document.getElementById('linesSvg');
                if (line && svg.contains(line)) svg.removeChild(line);
                
                if (this.unmatched.size === 0) {
                    this.showTestReview();
                } else {
                    // Refresh picture and ALL words for next round
                    this.renderPicture();
                    this.renderWords();
                    this.updateProgress();
                }
            }, 1000);
        }
    }
    
    drawLine(dot1, dot2, color = 'green') {
        const svg = document.getElementById('linesSvg');
        const rect1 = dot1.getBoundingClientRect();
        const rect2 = dot2.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        const x1 = rect1.left - svgRect.left + rect1.width / 2;
        const y1 = rect1.top - svgRect.top + rect1.height / 2;
        const x2 = rect2.left - svgRect.left + rect2.width / 2;
        const y2 = rect2.top - svgRect.top + rect2.height / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        
        svg.appendChild(line);
        return line;
    }
    
    drawLineFromPicture(pictureContainer, wordDot, color = 'green') {
        const svg = document.getElementById('linesSvg');
        const pictureRect = pictureContainer.getBoundingClientRect();
        const dotRect = wordDot.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        // Draw from center of picture
        const x1 = pictureRect.left - svgRect.left + pictureRect.width / 2;
        const y1 = pictureRect.top - svgRect.top + pictureRect.height / 2;
        
        // Draw to center of word dot
        const x2 = dotRect.left - svgRect.left + dotRect.width / 2;
        const y2 = dotRect.top - svgRect.top + dotRect.height / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        
        svg.appendChild(line);
        return line;
    }
    
    showFeedback(symbol, type) {
        const feedback = document.getElementById('feedback');
        feedback.innerHTML = symbol;
        feedback.className = `feedback ${type} show`;
        setTimeout(() => feedback.classList.remove('show'), 1000);
    }
    
    fadeAndRemove(wordItem, line) {
        const svg = document.getElementById('linesSvg');
        const wordsRow = document.getElementById('wordsRow');
        
        if (line && svg.contains(line)) {
            line.style.transition = 'opacity 0.5s';
            line.style.opacity = '0';
            setTimeout(() => {
                if (svg.contains(line)) svg.removeChild(line);
            }, 500);
        }
        
        wordItem.style.transition = 'opacity 0.5s';
        wordItem.style.opacity = '0';
        setTimeout(() => {
            if (wordsRow.contains(wordItem)) {
                wordsRow.removeChild(wordItem);
            }
            if (this.unmatched.size > 0) {
                this.renderPicture();
                this.renderWords();
            }
        }, 500);
    }
    
    updateProgress() {
        const total = this.virtualCards.length; // UPDATED: Use virtual cards count
        const completed = total - this.unmatched.size;
        const percentage = Math.round((completed / total) * 100);
        
        document.getElementById('progressText').textContent = `${completed}/${total}`;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }
    
    showTestReview() {
        document.getElementById('matchingContainer').style.display = 'none';
        document.getElementById('reviewContainer').style.display = 'block';
        
        const total = this.matches.length;
        const correct = this.matches.filter(m => m.pictureCard.targetWord === m.selectedWord).length; // UPDATED
        const percentage = Math.round((correct / total) * 100);
        
        document.getElementById('scoreValue').textContent = percentage;
        document.getElementById('scoreDisplay').style.display = 'block';
        
        const grid = document.getElementById('reviewGrid');
        grid.innerHTML = '';
        
        this.matches.forEach(match => {
            const isCorrect = match.pictureCard.targetWord === match.selectedWord; // UPDATED
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <img src="${match.pictureCard.imagePath}" alt="${match.pictureCard.targetWord}" class="review-image">
                <div class="review-word">${match.pictureCard.targetWord}</div>
                <div class="selected-word">${match.selectedWord} <span class="match-mark ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'OK' : 'X'}</span></div>
            `;
            grid.appendChild(item);
        });
    }
}
