class FlashcardsModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.cards = [];
        this.currentIndex = 0;
        this.cardsPerPage = deviceDetector ? deviceDetector.getCardsPerPage() : 4;
        this.secondaryLanguages = ['english']; // Default to English
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';
        
        // Get available languages excluding the current learning language
        const currentLang = this.assets.currentLanguage?.name.toLowerCase();
        const allLanguages = ['cebuano', 'english', 'maranao', 'sinama'];
        const availableSecondary = allLanguages.filter(lang => lang !== currentLang);
        
        this.container.innerHTML = `
            <div class="container module-flashcards">
                <h1>Flashcards (${langName}: Lesson ${lessonNum})</h1>
                <div class="controls">
                    <button id="prevBtn">< Previous</button>
                    <button id="restartBtn" class="btn-secondary"><i class="fas fa-redo"></i> Restart</button>
                    <button id="nextBtn">Next ></button>
                </div>
                <div class="flashcard-options">
                    <label>Translation Languages:</label>
                    <div class="language-checkboxes">
                        ${availableSecondary.map(lang => `
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       class="secondary-lang-checkbox" 
                                       value="${lang}" 
                                       ${this.secondaryLanguages.includes(lang) ? 'checked' : ''}
                                       ${this.secondaryLanguages.length >= 2 && !this.secondaryLanguages.includes(lang) ? 'disabled' : ''}>
                                ${lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </label>
                        `).join('')}
                    </div>
                    <div class="language-hint">Select up to 2 languages to show on card backs</div>
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
        
        // Setup secondary language checkboxes
        document.querySelectorAll('.secondary-lang-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const lang = e.target.value;
                
                if (e.target.checked) {
                    if (this.secondaryLanguages.length < 2) {
                        this.secondaryLanguages.push(lang);
                    }
                } else {
                    this.secondaryLanguages = this.secondaryLanguages.filter(l => l !== lang);
                }
                
                // Update checkbox states (disable if 2 are selected)
                document.querySelectorAll('.secondary-lang-checkbox').forEach(cb => {
                    if (!cb.checked && this.secondaryLanguages.length >= 2) {
                        cb.disabled = true;
                    } else {
                        cb.disabled = false;
                    }
                });
                
                // Re-render current page with new languages
                this.renderPage();
            });
        });
        
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
            img.alt = `${card.cebuano} - ${card.english}`;
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            };
            
            // Fix issue #1: Add timeout and proper error handling for image loading
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    debugLogger?.log(2, `Image load timeout for: ${card.imagePath}`);
                    // Set default height and resolve anyway
                    cardContainer.style.height = '200px';
                    cardEl.style.height = '200px';
                    resolve();
                }, 5000); // 5 second timeout
                
                img.onload = () => {
                    clearTimeout(timeout);
                    const imgHeight = img.naturalHeight || 200;
                    cardContainer.style.height = `${imgHeight}px`;
                    cardEl.style.height = `${imgHeight}px`;
                    resolve();
                };
                
                img.onerror = () => {
                    clearTimeout(timeout);
                    debugLogger?.log(2, `Image load error for: ${card.imagePath}`);
                    cardContainer.style.height = '200px';
                    cardEl.style.height = '200px';
                    resolve(); // Resolve even on error to not block rendering
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
                
                // Smooth reduction: 1.2px per character over 6
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
            
            // Get the learning language name
            const learningLang = this.assets.currentLanguage.name.toLowerCase();
            const learningLangLabel = this.assets.currentLanguage.name;
            const learningTranslation = card.allTranslations[learningLang];
            
            if (!learningTranslation) {
                debugLogger?.log(1, `ERROR: No translation found for learning language: ${learningLang}`);
                return;
            }
            
            const primaryFontSize = getDynamicFontSize(learningTranslation.word);
            debugLogger?.log(3, `Primary word "${learningTranslation.word}" will render at ${primaryFontSize}px`);
            
            // Build the card back HTML
            let backHTML = `
                <div class="card-back-content">
                    <div class="primary-word-box">
                        <div class="primary-lang-label">${learningLangLabel.toUpperCase()}</div>
                        <div class="primary-word" style="font-size: ${primaryFontSize}px;">${learningTranslation.word}</div>
                        ${learningTranslation.note ? `<div class="primary-note">${learningTranslation.note}</div>` : ''}
                    </div>
            `;
            
            // Add selected secondary languages
            this.secondaryLanguages.forEach(langKey => {
                const translation = card.allTranslations[langKey];
                const langLabel = langKey.charAt(0).toUpperCase() + langKey.slice(1);
                
                if (translation && translation.word) {
                    const secondaryFontSize = getSecondaryFontSize(translation.word);
                    debugLogger?.log(3, `Secondary word "${translation.word}" (${langLabel}) will render at ${secondaryFontSize}px`);
                    
                    backHTML += `
                        <div class="secondary-language">
                            <div class="secondary-lang-label">${langLabel}:</div>
                            <div class="secondary-word" style="font-size: ${secondaryFontSize}px;">${translation.word}</div>
                            ${translation.note ? `<div class="secondary-note">${translation.note}</div>` : ''}
                        </div>
                    `;
                }
            });
            
            backHTML += '</div>';
            back.innerHTML = backHTML;
            
            debugLogger?.log(3, `Card back HTML generated with ${this.secondaryLanguages.length} secondary languages`);
            
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
                    const wordLength = learningTranslation.word.length;
                    const needsExpansion = wordLength > 6; // Changed from 8 to 6
                    
                    if (needsExpansion) {
                        debugLogger?.log(3, `Long word "${learningTranslation.word}" (${wordLength} chars) - expanding card`);
                        cardContainer.classList.add('card-expanded');
                    } else {
                        debugLogger?.log(3, `Short word "${learningTranslation.word}" (${wordLength} chars) - normal width`);
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
