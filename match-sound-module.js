class MatchSoundModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.allCards = [];
        this.virtualCards = []; // Virtual cards for multi-word support
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
        this.currentAudio = null; // Store current audio for auto-play and replay
    }
    
    // Expand physical cards into virtual cards (one per acceptable answer)
    // UPDATED for v4.0: Uses card.cardNum and card.word instead of card.wordNum and card.cebuano
    // UPDATED for multi-variant audio: Assigns individual audio to each variant
    expandToVirtualCards(cards) {
        const virtualCards = [];
        cards.forEach((card, physicalIndex) => {
            // v4.0: Use card.acceptableAnswers (populated by enrichCard), fallback to card.word
            const acceptableAnswers = card.acceptableAnswers || [card.word];
            const audioPaths = card.audioPath || [];  // Array of audio paths

            acceptableAnswers.forEach((targetWord, variantIndex) => {
                // Match audio to variant by index
                const individualAudioPath = audioPaths[variantIndex] || null;

                virtualCards.push({
                    cardId: card.cardNum,           // v4.0: Use cardNum instead of wordNum
                    targetWord: targetWord,         // The specific word to test
                    physicalIndex: physicalIndex,   // Index in allCards array
                    imagePath: card.imagePath,
                    isVideo: card.isVideo,          // Video flag for MP4/WebM files
                    audioPath: individualAudioPath, // Individual audio for this variant
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
            <div class="module-match-sound">
                <h1>Audio Match (${langName}: ${lessonDisplay})</h1>
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
                    <button id="showTourBtn" class="btn btn-secondary" title="Show guided tour"><i class="fas fa-question-circle"></i> Show Tour</button>
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
        
        // Audio Match requires BOTH images (to show) and audio (to play)
        // v4.0: getCards returns enriched cards with normalized properties
        // Note: We filter hasAudio via getCards, then manually filter for images
        // because the AssetManager's hasImage filter has a type comparison issue
        this.allCards = this.assets.getCards({ hasAudio: true }).filter(card => card.imagePath);
        
        if (this.allCards.length === 0) {
            document.getElementById('matchingContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No cards available with both images and audio for this ${hasFilter ? 'filter' : 'lesson'}.</p>
                    <p>Please ${hasFilter ? 'adjust your filters or ' : ''}ensure your cards have both image files and audio files.</p>
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

        // Show Tour button
        const showTourBtn = document.getElementById('showTourBtn');
        if (showTourBtn) {
            showTourBtn.addEventListener('click', () => {
                if (typeof showTour !== 'undefined') {
                    showTour('match-sound');
                }
            });
        }
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'match-sound',
                'Audio Match Instructions',
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
        
        // Expand to virtual cards
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
        
        // Check if we've matched everything
        if (this.unmatched.size === 0) {
            if (this.currentMode === 'review') {
                audioSection.innerHTML = `
                    <div class="completion-message" style="text-align: center; padding: 20px;">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 12px;"></i>
                        <h3>Excellent! All cards mastered!</h3>
                        <p>Click "Restart" to practice again.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Select a target audio from unmatched
        const unmatchedArray = Array.from(this.unmatched);
        
        // For test mode, prioritize audio that hasn't been presented yet
        let availableForPresentation = unmatchedArray.filter(idx => !this.presentedAudioIndices.has(idx));
        if (availableForPresentation.length === 0) {
            // All have been presented at least once, just use any unmatched
            availableForPresentation = unmatchedArray;
        }
        
        const randomIdx = availableForPresentation[Math.floor(Math.random() * availableForPresentation.length)];
        this.currentTargetIdx = randomIdx;
        this.presentedAudioIndices.add(randomIdx);
        
        const targetCard = this.virtualCards[randomIdx];
        
        audioSection.innerHTML = `
            <div class="audio-speaker-big">
                <i class="fas fa-volume-up"></i>
                <div class="dot"></div>
            </div>
        `;

        const speaker = audioSection.querySelector('.audio-speaker-big');

        // Store current audio for replay functionality
        if (targetCard.audioPath) {
            this.currentAudio = new Audio(targetCard.audioPath);
        } else {
            this.currentAudio = null;
        }

        speaker.addEventListener('click', () => {
            if (this.currentAudio) {
                this.currentAudio.currentTime = 0; // Reset to beginning
                this.currentAudio.play().catch(err => debugLogger?.log(1, `Audio play error: ${err.message}`));
            }
        });

        // Auto-play audio when new word loads (with small delay to improve browser compatibility)
        if (this.currentAudio) {
            setTimeout(() => {
                this.currentAudio.play().catch(err => {
                    debugLogger?.log(1, `Auto-play audio error: ${err.message}`);
                    // If auto-play fails, it's likely due to browser policy - user can click speaker
                });
            }, 100);
        }
    }
    
    renderPictures() {
        const picturesRow = document.getElementById('picturesRow');
        picturesRow.innerHTML = '';

        if (this.unmatched.size === 0 || this.currentTargetIdx < 0) return;

        const targetCard = this.virtualCards[this.currentTargetIdx];
        const maxPictures = deviceDetector ? deviceDetector.getMaxPictures() : 4;

        // In test mode, use ALL cards as potential distractors (so we always show 4 cards)
        // In review mode, only use unmatched cards
        const candidatePool = this.currentMode === 'test'
            ? this.virtualCards.map((_, i) => i)  // All card indices
            : Array.from(this.unmatched);          // Only unmatched indices

        // Get other cards (excluding cards that share words with target)
        const otherCandidates = candidatePool.filter(idx => {
            const card = this.virtualCards[idx];
            // Exclude if it's a variant of the same physical card
            if (card.cardId === targetCard.cardId) return false;
            // Exclude if any of its words overlap with target's words
            return !card.allWords.some(w => targetCard.allWords.includes(w));
        });

        // Shuffle and take up to (maxPictures - 1) other cards
        const shuffled = shuffleArray(otherCandidates).slice(0, maxPictures - 1);

        // Create array with target and others, then shuffle positions
        const displayPictures = shuffleArray([this.currentTargetIdx, ...shuffled]);
        
        displayPictures.forEach(virtualIdx => {
            const card = this.virtualCards[virtualIdx];
            
            const item = document.createElement('div');
            item.className = 'item loading'; // Start with loading state

            let img;
            if (card.isVideo) {
                // Create video element for MP4/WebM files
                img = document.createElement('video');
                img.autoplay = true;
                img.loop = true;
                img.muted = true;
                img.playsInline = true;

                img.onloadeddata = () => {
                    item.classList.remove('loading');
                };

                img.onerror = () => {
                    item.classList.remove('loading');
                    item.classList.add('load-error');
                    debugLogger?.log(2, `Failed to load video: ${card.imagePath}`);
                };
            } else {
                // Create img element for PNG/JPG/JPEG/WebP/GIF files
                img = document.createElement('img');
                img.alt = 'Match picture';

                img.onload = () => {
                    item.classList.remove('loading');
                };

                img.onerror = () => {
                    item.classList.remove('loading');
                    item.classList.add('load-error');
                    debugLogger?.log(2, `Failed to load image: ${card.imagePath}`);
                };
            }

            // Set src after handlers
            img.src = card.imagePath;
            
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.idx = virtualIdx;
            
            item.appendChild(img);
            item.appendChild(dot);
            
            item.addEventListener('click', () => this.selectPicture(item, virtualIdx));
            picturesRow.appendChild(item);
        });
    }
    
    selectPicture(item, virtualIdx) {
        // Prevent selection while loading
        if (item.classList.contains('loading')) return;
        
        // Process the match immediately
        const selectedCard = this.virtualCards[virtualIdx];
        const targetCard = this.virtualCards[this.currentTargetIdx];
        const expected = targetCard.targetWord;
        
        // Compare selected card against all acceptable answers for target
        const isCorrect = targetCard.allWords.includes(selectedCard.targetWord);
        
        // Find the dot for visual feedback
        const dot = item.querySelector('.dot');
        
        // Get the audio speaker for line drawing
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
                // Incorrect match - replay audio after showing feedback
                setTimeout(() => {
                    if (line) {
                        const svg = document.getElementById('linesSvg');
                        if (svg.contains(line)) svg.removeChild(line);
                    }
                    // Replay the audio to help user learn
                    if (this.currentAudio) {
                        this.currentAudio.currentTime = 0;
                        this.currentAudio.play().catch(err => debugLogger?.log(1, `Replay audio error: ${err.message}`));
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
        const total = this.virtualCards.length;
        const completed = total - this.unmatched.size;
        const percentage = Math.round((completed / total) * 100);
        
        document.getElementById('progressText').textContent = `${completed}/${total}`;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }
    
    showTestReview() {
        document.getElementById('matchingContainer').style.display = 'none';
        document.getElementById('reviewContainer').style.display = 'block';
        
        const total = this.matches.length;
        const correct = this.matches.filter(m => m.playedCebuano === m.selectedPictureCard.targetWord).length;
        const percentage = Math.round((correct / total) * 100);
        
        document.getElementById('scoreValue').textContent = percentage;
        document.getElementById('scoreDisplay').style.display = 'block';
        
        const grid = document.getElementById('reviewGrid');
        grid.innerHTML = '';
        
        this.matches.forEach(match => {
            const isCorrect = match.playedCebuano === match.selectedPictureCard.targetWord;
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
