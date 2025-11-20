class FlashcardsModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.cards = [];
        this.currentIndex = 0;
        this.cardsPerPage = deviceDetector ? deviceDetector.getCardsPerPage() : 4;
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonDisplay = (filterManager && filterManager.isActive()) 
            ? 'Special' 
            : (this.assets.currentLesson || 'Lesson');
        
        const vpEnabled = voicePracticeManager ? voicePracticeManager.isEnabled() : false;
        
        this.container.innerHTML = `
            <div class="container module-flashcards">
                <h1>Flashcards (${langName}: ${lessonDisplay})</h1>
                
                <div class="vp-toggle-container">
                    <label>
                        <input type="checkbox" id="vpToggle" ${vpEnabled ? 'checked' : ''}>
                        <i class="fas fa-microphone"></i> Enable Voice Practice
                    </label>
                </div>
                
                <div class="controls">
                    <button id="prevBtn" class="btn btn-secondary"><i class="fas fa-chevron-left"></i> Previous</button>
                    <button id="restartBtn" class="btn btn-primary"><i class="fas fa-redo"></i> Restart</button>
                    <button id="nextBtn" class="btn btn-secondary">Next <i class="fas fa-chevron-right"></i></button>
                </div>
                <div id="cardsGrid" class="cards-grid"></div>
            </div>
        `;
    }
    
    async init() {
        const hasFilter = filterManager && filterManager.isActive();
        if (!this.assets.currentLanguage || (!this.assets.currentLesson && !hasFilter)) {
            document.getElementById('cardsGrid').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Please select a language and lesson from the dropdowns above to begin.</p>
                </div>
            `;
            return;
        }
        
        this.cards = this.assets.getCards();
        
        if (this.cards.length === 0) {
            document.getElementById('cardsGrid').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No cards available for this ${hasFilter ? 'filter' : 'lesson'}.</p>
                    <p>Please ${hasFilter ? 'adjust your filters' : 'scan assets or select a different lesson'}.</p>
                </div>
            `;
            return;
        }
        
        document.getElementById('prevBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        const vpToggle = document.getElementById('vpToggle');
        if (vpToggle) {
            vpToggle.addEventListener('change', (e) => {
                if (voicePracticeManager) {
                    voicePracticeManager.setEnabled(e.target.checked);
                    this.renderPage();
                }
            });
        }
        
        await this.renderPage();
        
        if (instructionManager) {
            instructionManager.show(
                'flashcards',
                'Flashcards Instructions',
                'Click on the Speaker icon to hear the word. Click on the picture to see the word.' + 
                (voicePracticeManager?.isEnabled() ? ' Click the Mic icon to practice pronunciation.' : '')
            );
        }
    }
    
    restart() {
        this.currentIndex = 0;
        this.renderPage();
    }
    
    async renderPage() {
        const grid = document.getElementById('cardsGrid');
        const start = this.currentIndex;
        const end = Math.min(start + this.cardsPerPage, this.cards.length);
        const pageCards = this.cards.slice(start, end);
        
        grid.innerHTML = '';
        
        const vpEnabled = voicePracticeManager ? voicePracticeManager.isEnabled() : false;
        
        for (const card of pageCards) {
            const cardContainer = document.createElement('div');
            cardContainer.className = 'card-container';
            
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            
            const front = document.createElement('div');
            front.className = 'card-face card-front';
            front.style.opacity = '1';
            front.style.display = 'flex';
            
            const img = document.createElement('img');
            img.src = card.imagePath;
            img.alt = `${card.word} - ${card.english}`;
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            };
            
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    debugLogger?.log(2, `Image load timeout for: ${card.imagePath}`);
                    cardContainer.style.height = '300px';
                    cardEl.style.height = '300px';
                    resolve();
                }, 5000);
                
                img.onload = () => {
                    clearTimeout(timeout);
                    const maxHeight = 300;
                    cardContainer.style.height = `${maxHeight}px`;
                    cardEl.style.height = `${maxHeight}px`;
                    resolve();
                };
                
                img.onerror = () => {
                    clearTimeout(timeout);
                    debugLogger?.log(2, `Image load error for: ${card.imagePath}`);
                    cardContainer.style.height = '300px';
                    cardEl.style.height = '300px';
                    resolve();
                };
            });
            
            front.appendChild(img);
            
            if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
                const speaker = document.createElement('div');
                speaker.className = 'speaker-icon';
                speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
                speaker.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playAudioSequentially(card.audioPath);
                });
                front.appendChild(speaker);
            }
            
            if (card.hasAudio && vpEnabled) {
                const mic = document.createElement('div');
                mic.className = 'mic-icon';
                mic.innerHTML = '<i class="fas fa-microphone"></i>';
                mic.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (voicePracticeManager) {
                        voicePracticeManager.startPractice(card);
                    }
                });
                front.appendChild(mic);
            }
            
            const back = document.createElement('div');
            back.className = 'card-face card-back';
            back.style.display = 'none';
            back.style.opacity = '0';
            
            const getDynamicFontSize = (word, baseSize = 28, minSize = 16) => {
                const length = word.length;
                if (length <= 6) {
                    return baseSize;
                }
                const reduction = (length - 6) * 1.2;
                const calculated = baseSize - reduction;
                return Math.max(minSize, calculated);
            };
            
            const getSecondaryFontSize = (word) => {
                return getDynamicFontSize(word, 18, 14);
            };
            
            const learningLangLabel = this.assets.currentLanguage.name;
            const primaryWord = card.word;
            const primaryNote = card.wordNote || '';
            const englishWord = card.english;
            const englishNote = card.englishNote || '';
            
            if (!primaryWord) {
                debugLogger?.log(1, `ERROR: No word found for card ${card.cardNum}`);
                continue;
            }
            
            const primaryFontSize = getDynamicFontSize(primaryWord);
            const englishFontSize = getSecondaryFontSize(englishWord);
            
            let backHTML = `
                <div class="card-back-content">
                    <div class="primary-word-box">
                        <div class="primary-lang-label">${learningLangLabel.toUpperCase()}</div>
                        <div class="primary-word" style="font-size: ${primaryFontSize}px;">${primaryWord}</div>
                        ${primaryNote ? `<div class="primary-note">${primaryNote}</div>` : ''}
                    </div>
                    <div class="secondary-language">
                        <div class="secondary-lang-label">English:</div>
                        <div class="secondary-word" style="font-size: ${englishFontSize}px;">${englishWord}</div>
                        ${englishNote ? `<div class="secondary-note">${englishNote}</div>` : ''}
                    </div>
                </div>
            `;
            
            back.innerHTML = backHTML;
            
            if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
                const speakerBack = document.createElement('div');
                speakerBack.className = 'speaker-icon';
                speakerBack.innerHTML = '<i class="fas fa-volume-up"></i>';
                speakerBack.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playAudioSequentially(card.audioPath);
                });
                back.appendChild(speakerBack);
            }
            
            if (card.hasAudio && vpEnabled) {
                const micBack = document.createElement('div');
                micBack.className = 'mic-icon';
                micBack.innerHTML = '<i class="fas fa-microphone"></i>';
                micBack.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (voicePracticeManager) {
                        voicePracticeManager.startPractice(card);
                    }
                });
                back.appendChild(micBack);
            }
            
            cardEl.appendChild(front);
            cardEl.appendChild(back);
            
            const wordLength = primaryWord.length;
            
            cardEl.addEventListener('click', () => {
                const front = cardEl.querySelector('.card-front');
                const back = cardEl.querySelector('.card-back');
                
                if (cardEl.classList.contains('flipped')) {
                    cardContainer.classList.remove('card-expanded');
                    back.style.opacity = '0';
                    setTimeout(() => {
                        back.style.display = 'none';
                        front.style.display = 'flex';
                        setTimeout(() => {
                            front.style.opacity = '1';
                        }, 10);
                    }, 300);
                    cardEl.classList.remove('flipped');
                } else {
                    const needsExpansion = wordLength > 6;
                    if (needsExpansion) {
                        cardContainer.classList.add('card-expanded');
                    } else {
                        cardContainer.classList.remove('card-expanded');
                    }
                    
                    front.style.opacity = '0';
                    setTimeout(() => {
                        front.style.display = 'none';
                        back.style.display = 'flex';
                        setTimeout(() => {
                            back.style.opacity = '1';
                        }, 10);
                    }, 300);
                    cardEl.classList.add('flipped');
                }
            });
            
            cardContainer.appendChild(cardEl);
            grid.appendChild(cardContainer);
        }
        
        this.updateButtons();
    }
    
    updateButtons() {
        document.getElementById('prevBtn').disabled = this.currentIndex === 0;
        document.getElementById('nextBtn').disabled = this.currentIndex + this.cardsPerPage >= this.cards.length;
    }
    
    previousPage() {
        this.currentIndex -= this.cardsPerPage;
        if (this.currentIndex < 0) this.currentIndex = 0;
        this.renderPage();
    }
    
    nextPage() {
        this.currentIndex += this.cardsPerPage;
        if (this.currentIndex >= this.cards.length) {
            this.currentIndex = Math.max(0, this.cards.length - this.cardsPerPage);
        }
        this.renderPage();
    }

    // Play audio files sequentially (for multi-variant cards)
    playAudioSequentially(audioPaths) {
        if (!audioPaths || audioPaths.length === 0) return;

        let currentIndex = 0;

        const playNext = () => {
            if (currentIndex >= audioPaths.length) {
                return;  // Done
            }

            const audio = new Audio(audioPaths[currentIndex]);

            audio.onended = () => {
                currentIndex++;
                playNext();  // Play next in chain
            };

            audio.onerror = () => {
                debugLogger?.log(1, `Audio play error: ${audioPaths[currentIndex]}`);
                currentIndex++;
                playNext();  // Skip to next on error
            };

            audio.play().catch(err => {
                debugLogger?.log(1, `Audio play error: ${err.message}`);
                currentIndex++;
                playNext();
            });
        };

        playNext();
    }
}
