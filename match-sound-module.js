class MatchSoundModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.allCards = [];
        this.virtualCards = []; // ADDED: Virtual cards for multi-word support
        this.currentMode = 'review';
        this.unmatched = new Set();
        this.currentShown = new Set();
        this.selectedItem = null;
        this.matches = [];
        this.currentTargetIdx = -1;
        this.maxPictures = 4; // Always show 4 cards
        this.presentedAudioIndices = new Set(); // Track which audio has been presented
        this.scoreTracker = new ScoreTracker();
        this.reviewRepetitions = 3; // Default: need to get each word correct 3 times
        this.correctCounts = new Map(); // Track how many times each card answered correctly
    }
    
    // ADDED: Expand physical cards into virtual cards (one per acceptable answer)
    expandToVirtualCards(cards) {
        const virtualCards = [];
        cards.forEach((card, physicalIndex) => {
            const acceptableAnswers = card.acceptableAnswers || [card.cebuano];
            acceptableAnswers.forEach(targetWord => {
                virtualCards.push({
                    cardId: card.wordNum,           // Track original card
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
            <div class="container module-match-sound">
                <h1>Audio Match (${langName}: Lesson ${lessonNum})</h1>
                <div class="controls">
                    <div class="mode-buttons">
                        <button class="mode-btn active" data-mode="review">Review Mode</button>
                        <button class="mode-btn" data-mode="test">Test Mode</button>
                    </div>
                    <div class="review-settings" id="reviewSettingsSound">
                        <label for="reviewRepsSound">Review Repetitions:</label>
                        <input type="number" id="reviewRepsSound" min="1" max="10" value="3" style="width: 60px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <button id="startBtn">Start</button>
                    <button id="restartMatchSoundBtn" class="btn-secondary"><i class="fas fa-redo"></i> Restart</button>
                </div>
                <div class="progress-section">
                    <div class="progress-label">Progress: <span id="progressText">0/0</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                </div>
                <div class="matching-container-sound" id="matchingContainer">
                    <div class="pictures-row" id="picturesRow"></div>
                    <div class="audio-section" id="audioSection"></div>
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
        
        // Audio Match requires BOTH images (to show) and audio (to play)
        this.allCards = this.assets.getCards({ hasAudio: true }).filter(card => card.hasImage);
        
        if (this.allCards.length === 0) {
            document.getElementById('matchingContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No cards available with both images and audio for this lesson.</p>
                    <p>Please ensure your cards have both image files and audio files.</p>
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
                const reviewSettings = document.getElementById('reviewSettingsSound');
                if (reviewSettings) {
                    reviewSettings.style.display = this.currentMode === 'review' ? 'flex' : 'none';
                }
            });
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startExercise());
        document.getElementById('retryBtn').addEventListener('click', () => this.startExercise());
        document.getElementById('restartMatchSoundBtn').addEventListener('click', () => this.startExercise());
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'match-sound',
                'Listen and Match Instructions',
                'Click the Speaker Icon to hear the word, then click the matching picture. You can click the speaker multiple times to listen again. In Review Mode, you need to get each word correct multiple times (default: 3).'
            );
        }
    }
    
    startExercise() {
        if (this.allCards.length === 0) {
            alert('No cards available with both images and audio. Please add complete cards with both image and audio files, then scan again.');
            return;
        }
        
        // Read review repetitions value
        const reviewRepsInput = document.getElementById('reviewRepsSound');
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
        this.presentedAudioIndices = new Set(); // Reset presented audio tracker
        this.selectedItem = null;
        
        // Initialize correct counts for review mode
        this.correctCounts = new Map();
        this.virtualCards.forEach((_, idx) => {
            this.correctCounts.set(idx, 0);
        });
        
        this.renderAudio();
        this.renderPictures();
        
        if (this.currentMode === 'test') {
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress();
        } else {
            // Show progress in review mode too
            document.querySelector('.progress-section').style.display = 'block';
            this.updateProgress();
        }
    }
    
    renderAudio() {
        const audioSection = document.getElementById('audioSection');
        audioSection.innerHTML = '';
        
        const available = [...this.unmatched];
        if (available.length === 0) return;
        
        // In test mode, prioritize audio that hasn't been presented yet
        let unpresented = available.filter(idx => !this.presentedAudioIndices.has(idx));
        
        // If all have been presented, reset the tracker
        if (unpresented.length === 0 && available.length > 0) {
            this.presentedAudioIndices.clear();
            unpresented = available;
        }
        
        // Select from unpresented audio
        const selectFrom = unpresented.length > 0 ? unpresented : available;
        this.currentTargetIdx = selectFrom[Math.floor(Math.random() * selectFrom.length)];
        this.presentedAudioIndices.add(this.currentTargetIdx);
        
        // UPDATED: Get virtual card instead of physical card
        const virtualCard = this.virtualCards[this.currentTargetIdx];
        
        const audioSpeaker = document.createElement('div');
        audioSpeaker.className = 'audio-speaker-big';
        audioSpeaker.dataset.side = 'audio';
        audioSpeaker.dataset.targetWord = virtualCard.targetWord; // UPDATED
        audioSpeaker.dataset.cardId = virtualCard.cardId; // ADDED
        
        audioSpeaker.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        audioSpeaker.appendChild(dot);
        audioSpeaker.addEventListener('click', (e) => this.handleClick(e, audioSpeaker));
        
        audioSection.appendChild(audioSpeaker);
    }
    
    renderPictures() {
        const picturesRow = document.getElementById('picturesRow');
        picturesRow.innerHTML = '';
        
        const available = [...this.unmatched];
        if (available.length === 0) return;
        
        // CRITICAL: Get current target's cardId for exclusion
        const currentVirtualCard = this.virtualCards[this.currentTargetIdx];
        const currentCardId = currentVirtualCard.cardId;
        
        // Start with the correct answer
        let shown = [this.currentTargetIdx];
        
        // UPDATED: Filter out pictures from the same physical card
        const eligibleForDistractors = available.filter(idx => {
            const vc = this.virtualCards[idx];
            return vc.cardId !== currentCardId; // Exclude same-card words
        });
        
        // Determine target count - ALWAYS 4 options in BOTH modes
        const maxPictures = 4;
        const targetCount = maxPictures;
        
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
        
        // Shuffle the shown pictures
        shown.sort(() => Math.random() - 0.5);
        
        // Render picture items
        shown.forEach(virtualIdx => {
            const virtualCard = this.virtualCards[virtualIdx];
            const item = this.createPictureItem(virtualCard, virtualIdx);
            picturesRow.appendChild(item);
        });
    }
    
    createPictureItem(virtualCard, virtualIdx) {
        const item = document.createElement('div');
        item.className = 'item';
        item.dataset.side = 'picture';
        item.dataset.targetWord = virtualCard.targetWord; // UPDATED
        item.dataset.virtualIdx = virtualIdx; // UPDATED
        item.dataset.cardId = virtualCard.cardId; // ADDED
        
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        const img = document.createElement('img');
        img.src = virtualCard.imagePath;
        img.alt = virtualCard.targetWord;
        
        item.appendChild(dot);
        item.appendChild(img);
        item.addEventListener('click', (e) => this.handleClick(e, item));
        
        return item;
    }
    
    handleClick(event, item) {
        event.stopPropagation();
        const dot = item.querySelector('.dot');
        
        // If clicking the audio speaker, just play the sound
        if (item.dataset.side === 'audio') {
            const targetVirtualCard = this.virtualCards[this.currentTargetIdx];
            if (targetVirtualCard && targetVirtualCard.audioPath) {
                const audio = new Audio(targetVirtualCard.audioPath);
                audio.play().catch(e => debugLogger.log(1, `Audio play error: ${e.message}`));
            }
            return; // Don't select anything, just play sound
        }
        
        // If clicking a picture, directly match it
        if (item.dataset.side === 'picture') {
            const virtualIdx = parseInt(item.dataset.virtualIdx);
            const actual = item.dataset.targetWord;
            const expected = this.virtualCards[this.currentTargetIdx].targetWord;
            
            const isCorrect = expected === actual;
            
            // Get audio speaker for line drawing
            const audioSpeaker = document.querySelector('.audio-speaker-big');
            const audioDot = audioSpeaker ? audioSpeaker.querySelector('.dot') : null;
            
            const lineColor = this.currentMode === 'test' || isCorrect ? 'green' : 'red';
            const line = audioDot ? this.drawLine(audioDot, dot, lineColor) : null;
            
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
                            if (line) {
                                const svg = document.getElementById('linesSvg');
                                if (svg.contains(line)) svg.removeChild(line);
                            }
                            // Refresh for next round
                            this.renderAudio();
                            this.renderPictures();
                            this.updateProgress();
                        }, 1000);
                    }
                } else {
                    setTimeout(() => {
                        if (line) {
                            const svg = document.getElementById('linesSvg');
                            if (svg.contains(line)) svg.removeChild(line);
                        }
                    }, 1000);
                }
            } else {
                // Test mode
                this.matches.push({
                    playedCebuano: expected,
                    selectedPictureCard: this.virtualCards[virtualIdx]
                });
                
                this.scoreTracker.recordAnswer(isCorrect, this.virtualCards[virtualIdx].originalCard);
                this.unmatched.delete(virtualIdx);
                item.classList.add('matched');
                dot.classList.add('matched');
                
                // In test mode, swap ALL 4 cards after selection
                setTimeout(() => {
                    if (line) {
                        const svg = document.getElementById('linesSvg');
                        if (svg.contains(line)) svg.removeChild(line);
                    }
                    
                    if (this.unmatched.size === 0) {
                        this.showTestReview();
                    } else {
                        // Refresh audio and ALL pictures for next round
                        this.renderAudio();
                        this.renderPictures();
                        this.updateProgress();
                    }
                }, 1000);
            }
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
    
    showFeedback(symbol, type) {
        const feedback = document.getElementById('feedback');
        feedback.innerHTML = symbol;
        feedback.className = `feedback ${type} show`;
        setTimeout(() => feedback.classList.remove('show'), 1000);
    }
    
    fadeAndRemove(pictureItem, line) {
        const svg = document.getElementById('linesSvg');
        const picturesRow = document.getElementById('picturesRow');
        
        if (line && svg.contains(line)) {
            line.style.transition = 'opacity 0.5s';
            line.style.opacity = '0';
            setTimeout(() => {
                if (svg.contains(line)) svg.removeChild(line);
            }, 500);
        }
        
        pictureItem.style.transition = 'opacity 0.5s';
        pictureItem.style.opacity = '0';
        setTimeout(() => {
            if (picturesRow && picturesRow.contains(pictureItem)) {
                picturesRow.removeChild(pictureItem);
            }
            if (this.unmatched.size > 0) {
                this.renderAudio();
                this.renderPictures();
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
        const correct = this.matches.filter(m => m.playedCebuano === m.selectedPictureCard.targetWord).length; // UPDATED
        const percentage = Math.round((correct / total) * 100);
        
        document.getElementById('scoreValue').textContent = percentage;
        document.getElementById('scoreDisplay').style.display = 'block';
        
        const grid = document.getElementById('reviewGrid');
        grid.innerHTML = '';
        
        this.matches.forEach(match => {
            const isCorrect = match.playedCebuano === match.selectedPictureCard.targetWord; // UPDATED
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <div class="review-word">${match.playedCebuano}</div>
                <img src="${match.selectedPictureCard.imagePath}" alt="${match.selectedPictureCard.targetWord}" class="review-image">
                <div class="selected-word">${match.selectedPictureCard.targetWord} <span class="match-mark ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'OK' : 'X'}</span></div>
            `;
            grid.appendChild(item);
        });
    }
}
