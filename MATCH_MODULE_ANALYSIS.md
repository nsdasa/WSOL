# Comprehensive Analysis: Match Module Manifest JSON Usage

## 1. MATCH MODULE CODE LOCATION

The match module is located in two main files:

### Primary Files:
- **Picture Match Module**: `/home/user/WSOL/match-module.js` (459 lines)
- **Audio Match Module**: `/home/user/WSOL/match-sound-module.js` (477 lines)

Both modules extend the `LearningModule` base class (defined in `/home/user/WSOL/app.js`)

### Supporting Infrastructure:
- **AssetManager**: `/home/user/WSOL/app.js` (lines 754-1118) - Loads and manages cards from manifest
- **Manifest File**: `/home/user/WSOL/assets/manifest.json` (v3.x format with cards array)

---

## 2. MANIFEST LOADING FLOW

### A. Manifest Loading (AssetManager.loadManifest)
**File**: `/home/user/WSOL/app.js`, lines 766-811

```javascript
async loadManifest() {
    try {
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
```

**Key Points**:
- Fetches with timestamp to prevent caching
- Detects manifest version (v4.0 vs v3.x)
- v3.x: `manifest.cards` is a flat array
- v4.0: `manifest.cards` is an object with language trigraphs as keys (e.g., `manifest.cards.ceb`)

### B. Language Selection (AssetManager.setLanguage)
**File**: `/home/user/WSOL/app.js`, lines 864-903

```javascript
setLanguage(languageTrigraph) {
    const lang = this.languages.find(l => l.trigraph.toLowerCase() === languageTrigraph.toLowerCase());
    if (!lang) return false;
    
    this.currentLanguage = lang;
    
    // v4.0: Load cards for this language
    if (this.manifest.cards && typeof this.manifest.cards === 'object' && !Array.isArray(this.manifest.cards)) {
        this.cards = this.manifest.cards[trigraph] || [];
        
        // Get lessons for this language
        if (this.manifest.stats?.languageStats?.[trigraph]?.lessons) {
            this.lessons = this.manifest.stats.languageStats[trigraph].lessons.sort((a, b) => a - b);
        } else {
            // Fallback: extract from cards
            const lessonSet = new Set();
            this.cards.forEach(card => lessonSet.add(card.lesson));
            this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
        }
```

**Stores in**:
- `assetManager.currentLanguage` - Selected language object
- `assetManager.cards` - All cards for the selected language
- `assetManager.lessons` - Array of lesson numbers available in that language

---

## 3. CARD RETRIEVAL AND FILTERING (AssetManager.getCards)

**File**: `/home/user/WSOL/app.js`, lines 927-969

```javascript
getCards(filters = {}) {
    let filtered = [...this.cards];
    
    // Check if advanced filter is active
    if (filterManager && filterManager.isActive()) {
        filtered = filterManager.getFilteredCards(this.cards);
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
    
    // Enrich cards to ensure consistent structure
    return filtered.map(card => this.enrichCard(card));
}
```

**In Match Module (MatchExerciseModule.init)**
**File**: `/home/user/WSOL/match-module.js`, lines 99-110

```javascript
async init() {
    this.allCards = this.assets.getCards();  // Get all cards for current lesson
    
    if (this.allCards.length === 0) {
        // Show error state
        return;
    }
}
```

**Execution flow**:
1. `getCards()` called without filters → uses current lesson filter
2. Returns enriched cards with normalized structure
3. Stored in `MatchExerciseModule.allCards`

---

## 4. MANIFEST JSON STRUCTURE (v3.x)

**File**: `/home/user/WSOL/assets/assets_old/manifest.json`

```json
{
    "version": "3.1",
    "lastUpdated": "2025-11-16T23:28:58-08:00",
    "languages": [
        {
            "id": 1,
            "name": "Cebuano",
            "trigraph": "ceb"
        },
        {
            "id": 2,
            "name": "English",
            "trigraph": "eng"
        }
    ],
    "totalCards": 185,
    "lessonStats": {
        "1": {
            "total": 23,
            "withImage": 23,
            "withGif": 4,
            "withPng": 23,
            "audioCount": {
                "ceb": 23
            }
        }
    },
    "cards": [
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
                "ceb": "assets/1.ceb.asa.m4a"
            },
            "translations": {
                "cebuano": {
                    "word": "Asa",
                    "note": "Where",
                    "acceptableAnswers": ["Asa"]
                },
                "english": {
                    "word": "",
                    "note": ""
                }
            },
            "grammar": "Interrogative",
            "category": null,
            "subCategory1": null,
            "subCategory2": null,
            "actflEst": "Novice-Mid"
        }
    ]
}
```

**Critical Properties for Match Module**:
- `imagePath` / `printImagePath` - Image to display
- `audio[trigraph]` - Audio file path for the word
- `translations[language].word` - Word in target language
- `translations[language].acceptableAnswers` - Valid answer variations
- `lesson` - Lesson number (for filtering)

---

## 5. VIRTUAL CARD EXPANSION (MULTI-WORD SUPPORT)

**File**: `/home/user/WSOL/match-module.js`, lines 17-35

This is the critical step that transforms physical cards into virtual cards:

```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        const acceptableAnswers = card.acceptableAnswers || [card.word];
        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,              // Original card ID (v4.0) or wordNum (v3.x)
                targetWord: targetWord,            // Specific word variant to test
                physicalIndex: physicalIndex,      // Index in allCards array
                imagePath: card.imagePath,         // Image path (shared across variants)
                audioPath: card.audioPath,         // Audio path (shared across variants)
                allWords: acceptableAnswers,       // ALL acceptable answers for comparison
                originalCard: card                 // Reference to enriched card object
            });
        });
    });
    return virtualCards;
}
```

**Why This Matters**:
- One physical card with multiple acceptable answers creates multiple virtual cards
- Example: If a card has `acceptableAnswers: ["cat", "kitten"]`, it becomes 2 virtual cards
- Each virtual card has a unique `targetWord` for comparison
- But they share the same `imagePath` and `audioPath`

**In startExercise (Match Module)**
**File**: `/home/user/WSOL/match-module.js`, lines 140-181

```javascript
startExercise() {
    this.scoreTracker.reset();
    this.matches = [];
    
    // UPDATED: Expand to virtual cards
    this.virtualCards = this.expandToVirtualCards(this.allCards);
    this.unmatched = new Set(this.virtualCards.map((_, i) => i));  // Set of virtual card indices
    this.presentedPictureIndices = new Set();
    this.selectedItem = null;
    
    // Initialize correct counts for review mode
    this.correctCounts = new Map();
    this.virtualCards.forEach((_, idx) => {
        this.correctCounts.set(idx, 0);  // Track each virtual card separately
    });
    
    this.renderPicture();
    this.renderWords();
}
```

---

## 6. PICTURE SELECTION LOGIC

### A. Select Next Picture (renderPicture)
**File**: `/home/user/WSOL/match-module.js`, lines 183-221

```javascript
renderPicture() {
    const pictureSection = document.getElementById('pictureSection');
    
    // Check if we've shown all pictures - means we're done
    if (this.unmatched.size === 0) {
        // Completion message
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
    
    // RANDOM SELECTION: Pick a random index from available
    const randomIdx = availableForPresentation[Math.floor(Math.random() * availableForPresentation.length)];
    this.currentTargetIdx = randomIdx;
    this.presentedPictureIndices.add(randomIdx);  // Mark as presented
    
    const targetCard = this.virtualCards[randomIdx];
    
    // Render image for this virtual card
    pictureSection.innerHTML = `
        <div class="picture-only">
            <img src="${targetCard.imagePath}" alt="Match this picture">
        </div>
    `;
}
```

**Selection Algorithm**:
1. Get all unmatched virtual card indices
2. Prioritize cards never presented before (`!presentedPictureIndices.has(idx)`)
3. If all have been presented, use any unmatched
4. Randomly select one index: `Math.floor(Math.random() * length)`
5. Display the image from that virtual card

---

## 7. WORD/OPTION SELECTION LOGIC

### A. Select Words to Display (renderWords)
**File**: `/home/user/WSOL/match-module.js`, lines 223-260

```javascript
renderWords() {
    const wordsRow = document.getElementById('wordsRow');
    wordsRow.innerHTML = '';
    
    if (this.unmatched.size === 0 || this.currentTargetIdx === null) return;
    
    const targetCard = this.virtualCards[this.currentTargetIdx];
    const maxPictures = deviceDetector ? deviceDetector.getMaxPictures() : 4;  // Always 4
    
    // Get other unmatched cards (excluding cards that share words with target)
    const otherUnmatched = Array.from(this.unmatched).filter(idx => {
        const card = this.virtualCards[idx];
        // Exclude if it's a variant of the same physical card
        if (card.cardId === targetCard.cardId) return false;
        // Exclude if any of its words overlap with target's words
        return !card.allWords.some(w => targetCard.allWords.includes(w));
    });
    
    // SHUFFLE AND SELECT: Take up to (maxPictures - 1) other cards
    const shuffled = otherUnmatched.sort(() => Math.random() - 0.5).slice(0, maxPictures - 1);
    
    // Create array with target and others, then SHUFFLE POSITIONS
    const displayWords = [this.currentTargetIdx, ...shuffled].sort(() => Math.random() - 0.5);
    
    // Render each word option
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
```

**Word Selection Algorithm**:

1. **Filter out candidates**:
   - Get all unmatched virtual cards
   - Exclude variants of the same physical card: `if (card.cardId === targetCard.cardId) return false`
   - Exclude cards with overlapping words: `!card.allWords.some(w => targetCard.allWords.includes(w))`

2. **Randomly select options**:
   - Need `maxPictures - 1` (usually 3) distractors
   - Shuffle other cards: `sort(() => Math.random() - 0.5)`
   - Take first N: `.slice(0, maxPictures - 1)`

3. **Randomize positions**:
   - Combine target + distractors: `[this.currentTargetIdx, ...shuffled]`
   - Shuffle again to randomize position: `sort(() => Math.random() - 0.5)`
   - Correct answer is not always in the same position

**Result**: Always displays 4 options (1 correct answer + 3 random distractors)

---

## 8. MATCHING LOGIC AND COMPARISON

### A. Word Selection Handler (selectWord)
**File**: `/home/user/WSOL/match-module.js`, lines 262-340

```javascript
selectWord(item, virtualIdx) {
    // Process the match immediately
    const selectedCard = this.virtualCards[virtualIdx];
    const targetCard = this.virtualCards[this.currentTargetIdx];
    const selectedWord = selectedCard.targetWord;
    
    // CRITICAL: Compare selected word against ALL acceptable answers for target
    const isCorrect = targetCard.allWords.includes(selectedWord);
    
    // Visual feedback - draw line
    const dot = item.querySelector('.dot');
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
            
            // Only remove from unmatched if reached required repetitions
            if (this.correctCounts.get(virtualIdx) >= this.reviewRepetitions) {
                this.unmatched.delete(virtualIdx);
                item.classList.add('matched');
                dot.classList.add('matched');
                setTimeout(() => this.fadeAndRemove(item, line), 1000);
            } else {
                // Still need more repetitions
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
        }
    } else {
        // Test mode
        this.matches.push({
            pictureCard: this.virtualCards[this.currentTargetIdx],
            selectedWord: selectedWord
        });
        
        this.scoreTracker.recordAnswer(isCorrect, this.virtualCards[this.currentTargetIdx].originalCard);
        this.unmatched.delete(this.currentTargetIdx);  // Remove TARGET picture
        item.classList.add('matched');
        dot.classList.add('matched');
        
        // Refresh picture and ALL words for next round
        setTimeout(() => {
            const svg = document.getElementById('linesSvg');
            if (line && svg.contains(line)) svg.removeChild(line);
            
            if (this.unmatched.size === 0) {
                this.showTestReview();
            } else {
                this.renderPicture();
                this.renderWords();
                this.updateProgress();
            }
        }, 1000);
    }
}
```

**Critical Comparison**:
```javascript
const isCorrect = targetCard.allWords.includes(selectedWord);
```

This checks if the selected word exists in the target card's `allWords` array (which contains ALL acceptable answers for that card).

---

## 9. RANDOMIZATION SUMMARY

### Picture Selection Randomization:
1. **Line 210**: `Math.floor(Math.random() * availableForPresentation.length)` - Random selection from available pictures
2. **Presentation tracking**: Ensures each picture is shown at least once before repeating

### Word/Option Randomization:
1. **Line 242**: `otherUnmatched.sort(() => Math.random() - 0.5).slice(0, maxPictures - 1)` - Shuffle and select 3 distractors
2. **Line 245**: `displayWords.sort(() => Math.random() - 0.5)` - Shuffle position of correct answer among options

### How Many Items:
- **Always 4 options**: 1 correct answer + 3 random distractors
- Device detector provides max: `deviceDetector.getMaxPictures()` (always returns 4)

---

## 10. COMPLETE FLOW SUMMARY

```
1. Load Manifest
   └─ AssetManager.loadManifest()
      └─ Fetch assets/manifest.json
      └─ Parse JSON (v3.x or v4.0)

2. Select Language
   └─ AssetManager.setLanguage(trigraph)
      └─ Extract cards for language from manifest.cards or manifest.cards[trigraph]
      └─ Store in assetManager.cards

3. Select Lesson
   └─ AssetManager.setLesson(lessonNum)
      └─ Store in assetManager.currentLesson

4. Initialize Match Module
   └─ MatchExerciseModule.init()
      └─ Call assetManager.getCards()
         └─ Filter by currentLesson
         └─ Enrich each card (normalize structure)
         └─ Return enriched cards
      └─ Store in this.allCards

5. Start Exercise
   └─ MatchExerciseModule.startExercise()
      └─ Call expandToVirtualCards(this.allCards)
         └─ For each card with multiple acceptable answers, create virtual card
         └─ Each virtual card has unique targetWord
         └─ Store in this.virtualCards
      └─ Initialize tracking sets:
         ├─ this.unmatched = Set of all virtual card indices
         ├─ this.presentedPictureIndices = Set of already shown indices
         └─ this.correctCounts = Map of correct answer counts per virtual card

6. Render Picture
   └─ MatchExerciseModule.renderPicture()
      └─ Select random unmatched virtual card
      └─ Prioritize ones not yet presented
      └─ Display image: virtualCard.imagePath

7. Render Words
   └─ MatchExerciseModule.renderWords()
      └─ Get target card: this.virtualCards[this.currentTargetIdx]
      └─ Filter other unmatched cards:
         ├─ Exclude same physical card variants
         ├─ Exclude overlapping words
      └─ Shuffle and select 3 distractors: sort(() => Math.random() - 0.5)
      └─ Combine target + distractors: [target, ...distractors]
      └─ Shuffle positions: sort(() => Math.random() - 0.5)
      └─ Render each word option: card.targetWord

8. Process Selection
   └─ MatchExerciseModule.selectWord(item, virtualIdx)
      └─ Get selectedCard = this.virtualCards[virtualIdx]
      └─ Get targetCard = this.virtualCards[this.currentTargetIdx]
      └─ Compare: isCorrect = targetCard.allWords.includes(selectedCard.targetWord)
      └─ If correct:
         ├─ Review mode: increment count, remove if reached repetitions
         └─ Test mode: record answer, remove target picture
      └─ Refresh: renderPicture() + renderWords()

9. Complete
   └─ When this.unmatched.size === 0
      └─ Show completion message
      └─ (Test mode) Show review results
```

---

## 11. KEY DATA STRUCTURES

### Virtual Card Structure:
```javascript
{
    cardId: 1,                           // Original card ID
    targetWord: "Asa",                   // Word being tested THIS round
    physicalIndex: 0,                    // Index in allCards
    imagePath: "assets/1.Asa.Where.png", // Image to display (shared)
    audioPath: "assets/1.ceb.asa.m4a",   // Audio to play (shared)
    allWords: ["Asa"],                   // ALL acceptable answers
    originalCard: {...}                  // Full enriched card
}
```

### Tracking Sets:
- `this.unmatched` - Indices of virtual cards not yet matched
- `this.presentedPictureIndices` - Indices of virtual cards shown at least once
- `this.correctCounts` - Map of how many times each virtual card was answered correctly

---

## 12. CRITICAL BEHAVIORS

1. **Multi-word Support**: One physical card can become multiple virtual cards if it has multiple acceptable answers
2. **Same Word Exclusion**: If target card is "cat" and a distractor card is also "cat", it's excluded
3. **Same Card Variant Exclusion**: If target card ID is "1" and another virtual card is also from card ID "1", it's excluded
4. **Randomization**: Both picture selection AND word position are randomized
5. **Review Mode**: Cards must be answered correctly multiple times (default 3) before removal
6. **Test Mode**: Each picture shown once, then moves on
7. **Position Randomization**: Correct answer can appear in any of 4 positions

