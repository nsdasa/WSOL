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
        const lessonNum = this.assets.currentLesson || 'Lesson';
        
        this.container.innerHTML = `
            <div class="container module-match">
                <h1>Picture Match (${langName}: Lesson ${lessonNum})</h1>
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
        // Check if language and lesson are selected
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
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
                    <p>No cards available for this lesson.</p>
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
        pictureSection.innerHTML = '';
        
        const available = [...this.unmatched];
        if (available.length === 0) return;
        
        // In test mode, prioritize pictures that haven't been presented yet
        let unpresented = available.filter(idx => !this.presentedPictureIndices.has(idx));
        
        // If all have been presented, reset the tracker
        if (unpresented.length === 0 && available.length > 0) {
            this.presentedPictureIndices.clear();
            unpresented = available;
        }
        
        // Select from unpresented pictures
        const selectFrom = unpresented.length > 0 ? unpresented : available;
        this.currentTargetIdx = selectFrom[Math.floor(Math.random() * selectFrom.length)];
        this.presentedPictureIndices.add(this.currentTargetIdx);
        
        // UPDATED: Get virtual card instead of physical card
        const virtualCard = this.virtualCards[this.currentTargetIdx];
        
        const pictureContainer = document.createElement('div');
        pictureContainer.className = 'audio-speaker-big picture-only';
        pictureContainer.dataset.side = 'picture';
        pictureContainer.dataset.targetWord = virtualCard.targetWord; // UPDATED
        pictureContainer.dataset.cardId = virtualCard.cardId; // ADDED
        pictureContainer.id = 'currentPicture';
        
        const img = document.createElement('img');
        img.src = virtualCard.imagePath;
        img.alt = virtualCard.targetWord;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        pictureContainer.appendChild(img);
        pictureSection.appendChild(pictureContainer);
    }
    
    renderWords() {
        const wordsRow = document.getElementById('wordsRow');
        wordsRow.innerHTML = '';
        
        const available = [...this.unmatched];
        if (available.length === 0) return;
        
        // CRITICAL: Get current target's cardId for exclusion
        const currentVirtualCard = this.virtualCards[this.currentTargetIdx];
        const currentCardId = currentVirtualCard.cardId;
        
        // Start with the correct answer
        let shown = [this.currentTargetIdx];
        
        // UPDATED: Filter out words from the same physical card
        const eligibleForDistractors = available.filter(idx => {
            const vc = this.virtualCards[idx];
            return vc.cardId !== currentCardId; // Exclude same-card words
        });
        
        // Determine target count - ALWAYS 4 options in BOTH modes
        const maxWords = 4;
        const targetCount = maxWords;
        
        // If we have fewer eligible than needed, include matched cards (both modes)
        if (eligibleForDistractors.length < (targetCount - 1)) {
            const allIndices = this.virtualCards.map((_, i) => i);
            const matched = allIndices.filter(i => !available.includes(i) && this.virtualCards[i].cardId !== currentCardId);
            
            // Add eligible unmatched first
            eligibleForDistractors.forEach(idx => {
                if (shown.length < targetCount && !shown.includes(idx)) {
                    shown.push(idx);
                }
            });
            
            // Then add matched if needed (both modes now)
            matched.forEach(idx => {
                if (shown.length < targetCount && !shown.includes(idx)) {
                    shown.push(idx);
                }
            });
        } else {
            // Normal mode: fill from eligible distractors (up to 4 total, including correct answer)
            const shuffled = [...eligibleForDistractors].sort(() => Math.random() - 0.5);
            const neededCount = Math.min(targetCount - 1, shuffled.length); // -1 because we already have correct answer
            for (let i = 0; i < neededCount; i++) {
                if (!shown.includes(shuffled[i])) {
                    shown.push(shuffled[i]);
                }
            }
        }
        
        // Shuffle the shown words
        shown.sort(() => Math.random() - 0.5);
        
        // Render word buttons
        shown.forEach(virtualIdx => {
            const virtualCard = this.virtualCards[virtualIdx];
            const item = this.createWordItem(virtualCard, virtualIdx);
            wordsRow.appendChild(item);
        });
    }
    
    createWordItem(virtualCard, virtualIdx) {
        const item = document.createElement('div');
        item.className = 'item';
        item.dataset.side = 'word';
        item.dataset.targetWord = virtualCard.targetWord; // UPDATED
        item.dataset.virtualIdx = virtualIdx; // UPDATED
        item.dataset.cardId = virtualCard.cardId; // ADDED
        
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        const word = document.createElement('div');
        word.className = 'word';
        word.textContent = virtualCard.targetWord; // UPDATED
        word.style.fontSize = '20px';
        word.style.fontWeight = '600';
        word.style.textAlign = 'center';
        word.style.padding = '10px';
        
        item.appendChild(dot);
        item.appendChild(word);
        item.addEventListener('click', (e) => this.handleClick(e, item));
        
        return item;
    }
    
    handleClick(event, item) {
        event.stopPropagation();
        
        // Only handle word clicks - picture is just for display
        if (item.dataset.side !== 'word') return;
        
        const dot = item.querySelector('.dot');
        const virtualIdx = parseInt(item.dataset.virtualIdx); // UPDATED
        const selectedWord = item.dataset.targetWord; // UPDATED
        const expectedWord = this.virtualCards[this.currentTargetIdx].targetWord; // UPDATED
        
        const isCorrect = selectedWord === expectedWord;
        
        // Get picture container for line drawing
        const pictureContainer = document.getElementById('currentPicture');
        if (!pictureContainer) return;
        
        // Draw line from picture center to word
        const lineColor = this.currentMode === 'test' || isCorrect ? 'green' : 'red';
        const line = this.drawLineFromPicture(pictureContainer, dot, lineColor);
        
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