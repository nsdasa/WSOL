# Quiz Module - Key Code Snippets Reference

## 1. LOADING THE MANIFEST

**File:** `/home/user/WSOL/app.js` lines 766-811

```javascript
async loadManifest() {
    const timestamp = new Date().getTime();
    
    const response = await fetch(`assets/manifest.json?_=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    this.manifest = await response.json();
    this.languages = this.manifest.languages || [];

    // Detect manifest version
    const isV4 = this.manifest.version === '4.0' || 
                (this.manifest.cards && typeof this.manifest.cards === 'object' && !Array.isArray(this.manifest.cards));

    if (isV4) {
        debugLogger.log(2, `Loaded v4.0 manifest with ${this.languages.length} languages`);
    } else {
        // v3.x fallback - cards is flat array
        this.cards = this.manifest.cards || [];
        const lessonSet = new Set();
        this.cards.forEach(card => lessonSet.add(card.lesson));
        this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
        debugLogger.log(2, `Loaded v3.x manifest: ${this.cards.length} cards, ${this.lessons.length} lessons`);
    }

    this.populateLanguageSelector();
    return this.cards;
}
```

---

## 2. GETTING CARDS WITH FILTERING

**File:** `/home/user/WSOL/app.js` lines 927-969

```javascript
getCards(filters = {}) {
    let filtered = [...this.cards];
    
    // Check if advanced filter is active
    if (filterManager && filterManager.isActive()) {
        filtered = filterManager.getFilteredCards(this.cards);
        if (filtered === null) {
            filtered = [...this.cards];
        }
    } else {
        // Normal lesson filtering
        const lessonFilter = filters.lesson !== undefined ? filters.lesson : this.currentLesson;
        if (lessonFilter !== null && lessonFilter !== undefined) {
            filtered = filtered.filter(card => card.lesson === lessonFilter);
        }
    }
    
    // Filter by audio availability
    if (filters.hasAudio !== undefined) {
        filtered = filtered.filter(card => card.hasAudio === filters.hasAudio);
    }
    
    // Filter by image availability
    if (filters.hasImage !== undefined) {
        filtered = filtered.filter(card => {
            const hasImg = card.hasImage || card.printImagePath || card.hasGif;
            return hasImg === filters.hasImage;
        });
    }
    
    // Filter by type (N = noun, V = verb, etc.)
    if (filters.type) {
        filtered = filtered.filter(card => card.type === filters.type);
    }
    
    // Filter by category
    if (filters.category) {
        filtered = filtered.filter(card => card.category === filters.category);
    }
    
    // Enrich cards to ensure consistent structure
    return filtered.map(card => this.enrichCard(card));
}
```

---

## 3. ENRICHING CARDS (Building acceptableAnswers, imagePath, audioPath)

**File:** `/home/user/WSOL/app.js` lines 971-1068

```javascript
enrichCard(card) {
    // Detect manifest version based on card structure
    const isV4Card = card.word !== undefined && card.english !== undefined;
    
    if (isV4Card) {
        // v4.0 card structure - direct properties
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        
        // Build acceptableAnswers
        let acceptableAnswers = card.acceptableAnswers;
        if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
            acceptableAnswers = card.word ? card.word.split('/').map(w => w.trim()).filter(w => w) : [];
        }
        
        // Build englishAcceptable
        let englishAcceptable = card.englishAcceptable;
        if (!englishAcceptable || !Array.isArray(englishAcceptable)) {
            englishAcceptable = card.english ? card.english.split('/').map(w => w.trim()).filter(w => w) : [];
        }
        
        // Get image path (prefer GIF for display, PNG for print)
        const imagePath = card.hasGif ? 
            (this.manifest.images?.[card.cardNum]?.gif || card.printImagePath) : 
            card.printImagePath;
        
        return {
            ...card,
            // Normalized properties for module compatibility
            acceptableAnswers,
            englishAcceptable,
            audioPath: card.audio || null,
            imagePath: imagePath,
            // Keep word/english as primary display
            word: card.word,
            english: card.english,
            // For v3.x compatibility
            allTranslations: {
                [this.getLangKeyFromTrigraph(trigraph)]: {
                    word: card.word,
                    note: card.wordNote || '',
                    acceptableAnswers
                },
                english: {
                    word: card.english,
                    note: card.englishNote || '',
                    acceptableAnswers: englishAcceptable
                }
            }
        };
    } else {
        // v3.x card structure - translations object
        let allTranslations;
        
        if (card.translations) {
            allTranslations = card.translations;
        } else {
            allTranslations = {
                cebuano: card.cebuano ? { word: card.cebuano, note: card.cebuanoNote || '' } : null,
                english: card.english ? { word: card.english, note: card.englishNote || '' } : null,
                maranao: card.maranao ? { word: card.maranao, note: card.maranaoNote || '' } : null,
                sinama: card.sinama ? { word: card.sinama, note: card.sinamaNote || '' } : null
            };
        }
        
        // Get learning language key
        const learningLangKey = this.currentLanguage ? this.currentLanguage.trigraph.toLowerCase() : 'ceb';
        const learningLangName = this.getLangKeyFromTrigraph(learningLangKey);
        
        // Get primary translation for current learning language
        const primaryTranslation = allTranslations[learningLangName];
        
        // Build acceptableAnswers
        let acceptableAnswers;
        if (primaryTranslation) {
            if (primaryTranslation.acceptableAnswers && Array.isArray(primaryTranslation.acceptableAnswers)) {
                acceptableAnswers = primaryTranslation.acceptableAnswers;
            } else {
                acceptableAnswers = primaryTranslation.word.split(',').map(w => w.trim()).filter(w => w);
            }
        } else {
            acceptableAnswers = [card.cebuano || ''];
        }
        
        // Get audio path for current language
        const audioPath = card.audio && card.audio[learningLangKey] ? 
            card.audio[learningLangKey] : null;
        
        return {
            ...card,
            allTranslations,
            acceptableAnswers,
            audioPath: audioPath || card.audioPath,
            imagePath: card.imagePath || card.printImagePath,
            word: primaryTranslation?.word || card.cebuano || '',
            english: allTranslations.english?.word || card.english || ''
        };
    }
}
```

---

## 4. QUIZ INITIALIZATION & CARD SHUFFLING

**File:** `/home/user/WSOL/quiz-module.js` lines 129-163

```javascript
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
        // TEST MODE: Shuffle all cards randomly
        this.shuffledCards = [...this.rawCards].sort(() => Math.random() - 0.5);
        this.currentCardIndex = 0;
        this.updateScores();
        this.sequenceCounter = 0;
        document.getElementById('rightPanel').style.display = 'block';
    } else {
        // REVIEW MODE: Add spaced repetition metadata
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
```

---

## 5. SHOW NEXT CARD (WITH MODE-SPECIFIC LOGIC)

**File:** `/home/user/WSOL/quiz-module.js` lines 165-198

```javascript
showNextCard() {
    let card;
    
    if (this.currentMode === 'test') {
        // TEST MODE: Linear sequential
        if (this.currentCardIndex >= this.shuffledCards.length) {
            this.showReview();
            return;
        }
        card = this.shuffledCards[this.currentCardIndex];
        this.currentCardIndex++;
    } else {
        // REVIEW MODE: Spaced repetition with random selection
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
    document.getElementById('feedbackMark').textContent = '';
    document.getElementById('correctWordDisplay').classList.remove('show');
    document.getElementById('correctWordDisplay').textContent = '';
}
```

---

## 6. ANSWER VALIDATION & FEEDBACK

**File:** `/home/user/WSOL/quiz-module.js` lines 200-252

```javascript
submitAnswer() {
    if (!this.currentCard) return;
    
    const userAnswer = document.getElementById('userInput').value.trim().toLowerCase();
    // UPDATED: Check against all acceptable answers
    const acceptableAnswers = this.currentCard.acceptableAnswers || [this.currentCard.word];
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
        // REVIEW MODE
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
            
            // Set when to show again (3 cards later)
            this.currentCard.minNextShow = this.sequenceCounter + 3;
            
            setTimeout(() => {
                correctDisplay.classList.remove('show');
                this.sequenceCounter++;
                this.showNextCard();
            }, 3000);
        }
    }
}
```

---

## 7. SHOWING TEST REVIEW (Results Screen)

**File:** `/home/user/WSOL/quiz-module.js` lines 259-282

```javascript
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
            <img src="${card.imagePath}" alt="${card.word}" class="review-image">
            <div class="review-word">${card.word}</div>
            <div class="selected-word">${response ? response.userAnswer : 'No answer'} <span class="match-mark ${response && response.isCorrect ? 'correct' : 'incorrect'}">${response && response.isCorrect ? 'OK' : 'X'}</span></div>
        `;
        grid.appendChild(item);
    });
}
```

---

## 8. ADVANCED FILTER INTEGRATION

**File:** `/home/user/WSOL/app.js` lines 714-748

```javascript
isActive() {
    return this.isAdvancedFilterActive;
}

getFilteredCards(cards) {
    if (!this.isAdvancedFilterActive) {
        return null;
    }
    
    let filtered = [...cards];
    
    if (this.filters.startLesson !== null || this.filters.endLesson !== null) {
        const start = this.filters.startLesson || 1;
        const end = this.filters.endLesson || 999;
        filtered = filtered.filter(card => card.lesson >= start && card.lesson <= end);
    }
    
    if (this.filters.grammar) {
        filtered = filtered.filter(card => card.grammar === this.filters.grammar);
    }
    if (this.filters.category) {
        filtered = filtered.filter(card => card.category === this.filters.category);
    }
    if (this.filters.subCategory1) {
        filtered = filtered.filter(card => card.subCategory1 === this.filters.subCategory1);
    }
    if (this.filters.subCategory2) {
        filtered = filtered.filter(card => card.subCategory2 === this.filters.subCategory2);
    }
    if (this.filters.actflEst) {
        filtered = filtered.filter(card => card.actflEst === this.filters.actflEst);
    }
    
    return filtered;
}
```

---

## 9. QUIZ INITIALIZATION IN app.js

**File:** `/home/user/WSOL/app.js` (Main app initialization)

```javascript
// After loading manifest
const assetManager = new AssetManager();
await assetManager.loadManifest();

// Create quiz module instance
const quizModule = new UnsaNiQuizModule(assetManager);

// When user navigates to quiz
await quizModule.render();
await quizModule.init();
```

---

## 10. SAMPLE MANIFEST CARD STRUCTURE (v3.x)

```json
{
    "wordNum": 1,
    "lesson": 1,
    "type": "N",
    "imagePath": "assets/1.Asa.Where.png",
    "printImagePath": "assets/1.taas.tall.png",
    "hasImage": true,
    "hasGif": false,
    "hasAudio": true,
    "audio": {
        "ceb": "assets/1.ceb.asa.m4a",
        "mrw": null,
        "sin": null
    },
    "translations": {
        "cebuano": {
            "word": "Asa",
            "note": "Where",
            "acceptableAnswers": ["Asa"]
        },
        "english": {
            "word": "",
            "note": "",
            "acceptableAnswers": []
        },
        "maranao": {
            "word": "",
            "note": "",
            "acceptableAnswers": []
        },
        "sinama": {
            "word": "",
            "note": "",
            "acceptableAnswers": []
        }
    },
    "grammar": "Interrogative",
    "category": null,
    "subCategory1": null,
    "subCategory2": null,
    "actflEst": "Novice-Mid"
}
```

---

## QUICK FACTS SUMMARY

| Aspect | Value |
|--------|-------|
| Quiz Module File | `/home/user/WSOL/quiz-module.js` |
| Module Class | `UnsaNiQuizModule` |
| Base Class | `LearningModule` |
| Manifest Location | `/home/user/WSOL/assets/assets_old/manifest.json` |
| Manifest Version | v3.x (flat array format) |
| Quiz Modes | Review & Test |
| Question Randomization (Test) | Fisher-Yates style shuffle |
| Question Selection (Review) | Random from eligible cards with spaced repetition |
| Spaced Repetition Delay | 3 cards (when incorrect answer) |
| Answer Validation | Case-insensitive, checks all acceptableAnswers |
| Feedback Timeout (Correct) | 1500ms |
| Feedback Timeout (Incorrect - Review) | 3000ms |
| Feedback Timeout (Incorrect - Test) | 1500ms |

