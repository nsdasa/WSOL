class FlashcardsModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.cards = [];
        this.currentIndex = 0;
        this.cardsPerPage = deviceDetector ? deviceDetector.getCardsPerPage() : 4;
        // v4.0: Cards only contain learning language + English
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';
        
        this.container.innerHTML = `
            <div class="container module-flashcards">
                <h1>Flashcards (${langName}: Lesson ${lessonNum})</h1>
                <div class="controls">
                    <button id="prevBtn">< Previous</button>
                    <button id="restartBtn" class="btn-secondary"><i class="fas fa-redo"></i> Restart</button>
                    <button id="nextBtn">Next ></button>
                </div>
                <div id="cardsGrid" class="cards-grid"></div>
            </div>
        `;
    }
    
    async init() {
        // Check if language and lesson are selected
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
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
                    <p>No cards available for this lesson.</p>
                    <p>Please scan assets or select a different lesson.</p>
                </div>
            `;
            return;
        }
        
        document.getElementById('prevBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        await this.renderPage();
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'flashcards',
                'Flashcards Instructions',
                'Click on the Speaker icon to hear the word. Click on the picture to see the word.'
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
            // v4.0 fix: Use card.word instead of card.cebuano
            img.alt = `${card.word} - ${card.english}`;
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            };
            
            // Add timeout and proper error handling for image loading
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
            
            if (card.hasAudio) {
                const speaker = document.createElement('div');
                speaker.className = 'speaker-icon';
                speaker.innerHTML = '<i class="fas fa-volume-up"></i>';
                speaker.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const audio = new Audio(card.audioPath);
                    audio.play().catch(err => debugLogger.log(1, `Audio play error: ${err.message}`));
                });
                front.appendChild(speaker);
            }
            
            const back = document.createElement('div');
            back.className = 'card-face card-back';
            back.style.display = 'none';
            back.style.opacity = '0';
            
            // Dynamic font size calculation based on word length
            const getDynamicFontSize = (word, baseSize = 28, minSize = 16) => {
                const length = word.length;
                if (length <= 6) {
                    debugLogger?.log(3, `Font calc: "${word}" (${length} chars) -> ${baseSize}px (short word)`);
                    return baseSize;
                }
                
                const reduction = (length - 6) * 1.2;
                const calculated = baseSize - reduction;
                const final = Math.max(minSize, calculated);
                
                debugLogger?.log(3, `Font calc: "${word}" (${length} chars) -> reduction: ${reduction}px, calculated: ${calculated}px, final: ${final}px`);
                return final;
            };
            
            // Secondary word dynamic sizing (smaller base)
            const getSecondaryFontSize = (word) => {
                return getDynamicFontSize(word, 18, 14);
            };
            
            // v4.0: Use normalized card properties directly
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
            
            debugLogger?.log(3, `Primary word "${primaryWord}" will render at ${primaryFontSize}px`);
            debugLogger?.log(3, `English word "${englishWord}" will render at ${englishFontSize}px`);
            
            // Build the card back HTML - v4.0: Always show learning language + English
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
            
            debugLogger?.log(3, `Card back HTML generated for card ${card.cardNum}`);
            
            if (card.hasAudio) {
                const speakerBack = document.createElement('div');
                speakerBack.className = 'speaker-icon';
                speakerBack.innerHTML = '<i class="fas fa-volume-up"></i>';
                speakerBack.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const audio = new Audio(card.audioPath);
                    audio.play().catch(err => debugLogger.log(1, `Audio play error: ${err.message}`));
                });
                back.appendChild(speakerBack);
            }
            
            cardEl.appendChild(front);
            cardEl.appendChild(back);
            
            // Store primaryWord for flip handler
            const wordLength = primaryWord.length;
            
            cardEl.addEventListener('click', () => {
                const front = cardEl.querySelector('.card-front');
                const back = cardEl.querySelector('.card-back');
                
                if (cardEl.classList.contains('flipped')) {
                    // Flipping to front - remove expansion
                    debugLogger?.log(3, `Flipping to front, removing card expansion`);
                    cardContainer.classList.remove('card-expanded');
                    
                    // Show front
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
                    // Flipping to back - check if expansion needed
                    const needsExpansion = wordLength > 6;
                    
                    if (needsExpansion) {
                        debugLogger?.log(3, `Long word (${wordLength} chars) - expanding card`);
                        cardContainer.classList.add('card-expanded');
                    } else {
                        debugLogger?.log(3, `Short word (${wordLength} chars) - normal width`);
                        cardContainer.classList.remove('card-expanded');
                    }
                    
                    // Show back
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
}