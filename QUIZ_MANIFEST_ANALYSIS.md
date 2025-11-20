# COMPREHENSIVE ANALYSIS: Quiz Module & Manifest Integration

## 1. QUIZ MODULE LOCATION & ARCHITECTURE

**File:** `/home/user/WSOL/quiz-module.js` (289 lines)

**Class:** `UnsaNiQuizModule` extends `LearningModule`

The quiz module is a learning module subclass that inherits from a base `LearningModule` class defined in `app.js`.

### Class Structure:
```javascript
class UnsaNiQuizModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.rawCards = [];           // All cards for current lesson/filter
        this.shuffledCards = [];      // Cards in quiz sequence
        this.currentCard = null;      // Currently displayed card
        this.currentCardIndex = 0;    // Position in quiz
        this.currentMode = 'review';  // 'review' or 'test' mode
        this.correctCount = 0;        // Score tracker
        this.incorrectCount = 0;      // Score tracker
        this.userResponses = [];      // Array of {userAnswer, isCorrect}
        this.sequenceCounter = 0;     // Spaced repetition counter
        this.scoreTracker = new ScoreTracker();
    }
}
```

---

## 2. MANIFEST LOADING & READING FLOW

### 2.1 Manifest Location & Format

**Primary Manifest:** `/home/user/WSOL/assets/assets_old/manifest.json`
- **Version:** 3.x (flat card array structure)
- **Loaded via:** AssetManager.loadManifest()
- **Load URL:** `assets/manifest.json` (with cache-busting timestamp)

### 2.2 Manifest Structure (v3.x Format)

```javascript
// Manifest JSON Structure
{
    "version": "3.1",
    "lastUpdated": "2025-11-16T23:28:58-08:00",
    "languages": [
        { "id": 1, "name": "Cebuano", "trigraph": "ceb" },
        { "id": 2, "name": "English", "trigraph": "eng" },
        { "id": 3, "name": "Maranao", "trigraph": "mrw" },
        { "id": 4, "name": "Sinama", "trigraph": "sin" }
    ],
    "cards": [
        {
            "wordNum": 1,
            "lesson": 1,
            "type": "N",                    // N=noun, V=verb
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
                    "note": "",
                    "acceptableAnswers": []
                },
                "maranao": { ... },
                "sinama": { ... }
            },
            "grammar": "Interrogative",
            "category": null,
            "subCategory1": null,
            "subCategory2": null,
            "actflEst": "Novice-Mid"
        },
        // ... more cards
    ]
}
```

### 2.3 AssetManager Loading Process

**Location:** `/home/user/WSOL/app.js` lines 754-1118

**Code Reference:**
```javascript
class AssetManager {
    async loadManifest() {
        // Lines 766-811
        const response = await fetch(`assets/manifest.json?_=${timestamp}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        this.manifest = await response.json();
        this.languages = this.manifest.languages || [];

        // Detect manifest version
        const isV4 = this.manifest.version === '4.0' || 
                    (this.manifest.cards && typeof this.manifest.cards === 'object' && !Array.isArray(this.manifest.cards));

        if (isV4) {
            // v4.0: cards is object with language keys
            debugLogger.log(2, `Loaded v4.0 manifest`);
        } else {
            // v3.x: cards is flat array
            this.cards = this.manifest.cards || [];
            const lessonSet = new Set();
            this.cards.forEach(card => lessonSet.add(card.lesson));
            this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
        }
    }
}
```

---

## 3. HOW QUIZ DETERMINES WHICH QUESTIONS TO ASK

### 3.1 Card Selection Process

**Location:** Quiz init method (lines 75-127)

**Step 1: Verify Selection**
```javascript
async init() {
    // Check if language and lesson/filter are selected (lines 76-87)
    const hasFilter = filterManager && filterManager.isActive();
    if (!this.assets.currentLanguage || (!this.assets.currentLesson && !hasFilter)) {
        // Show empty state
        return;
    }

    // Get cards from AssetManager (line 89)
    this.rawCards = this.assets.getCards();
}
```

### 3.2 AssetManager.getCards() - Card Filtering

**Location:** app.js lines 927-969

```javascript
getCards(filters = {}) {
    let filtered = [...this.cards];
    
    // Step 1: Check advanced filter (lines 931-935)
    if (filterManager && filterManager.isActive()) {
        filtered = filterManager.getFilteredCards(this.cards);
        if (filtered === null) {
            filtered = [...this.cards];
        }
    } else {
        // Step 2: Normal lesson filtering (lines 938-941)
        const lessonFilter = filters.lesson !== undefined ? filters.lesson : this.currentLesson;
        if (lessonFilter !== null && lessonFilter !== undefined) {
            filtered = filtered.filter(card => card.lesson === lessonFilter);
        }
    }
    
    // Step 3: Apply optional additional filters (lines 944-965)
    // - hasAudio filter
    // - hasImage filter
    // - type filter (N, V, etc.)
    // - category filter
    
    // Step 4: Enrich cards (line 968)
    return filtered.map(card => this.enrichCard(card));
}
```

### 3.3 Advanced Filter Integration

**Location:** FilterManager class, app.js lines 404-748

**When Active:**
- FilterManager.isActive() returns true
- getFilteredCards() applies multiple filter criteria:
  - Lesson range (startLesson to endLesson)
  - Grammar type
  - Category
  - SubCategory1 & SubCategory2
  - ACTFL proficiency level

**Example:** Quiz module checks (line 77):
```javascript
const hasFilter = filterManager && filterManager.isActive();
```

---

## 4. HOW QUIZ DETERMINES WHAT CONTENT TO SHOW

### 4.1 Card Enrichment

**Location:** app.js lines 971-1068

```javascript
enrichCard(card) {
    // Detect manifest version
    const isV4Card = card.word !== undefined && card.english !== undefined;
    
    if (isV4Card) {
        // v4.0 structure
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        
        // Build acceptableAnswers from word or translations (lines 980-983)
        let acceptableAnswers = card.acceptableAnswers;
        if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
            acceptableAnswers = card.word ? 
                card.word.split('/').map(w => w.trim()).filter(w => w) : [];
        }
        
        // Get image path - prefer GIF for display (lines 992-994)
        const imagePath = card.hasGif ? 
            (this.manifest.images?.[card.cardNum]?.gif || card.printImagePath) : 
            card.printImagePath;
        
        return {
            ...card,
            acceptableAnswers,
            audioPath: card.audio || null,
            imagePath: imagePath,
            word: card.word,
            english: card.english,
            // ... compatibility properties
        };
    } else {
        // v3.x structure (lines 1020-1068)
        // Extract from translations object
        const learningLangKey = this.currentLanguage ? 
            this.currentLanguage.trigraph.toLowerCase() : 'ceb';
        const learningLangName = this.getLangKeyFromTrigraph(learningLangKey);
        
        const primaryTranslation = allTranslations[learningLangName];
        
        // Build acceptableAnswers from primaryTranslation (lines 1043-1052)
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
        
        // Get audio path for current language (lines 1055-1056)
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

### 4.2 Content Display in Quiz

**Location:** quiz-module.js lines 191 (showNextCard)

```javascript
showNextCard() {
    // ... card selection logic
    
    this.currentCard = card;
    
    // Display image from card.imagePath
    document.getElementById('cardImage').src = card.imagePath;
    
    // Clear previous input
    document.getElementById('userInput').value = '';
    document.getElementById('userInput').focus();
    
    // Clear feedback marks
    document.getElementById('feedbackMark').classList.remove('show');
    document.getElementById('correctWordDisplay').classList.remove('show');
}
```

**What Gets Displayed:**
- **Image:** card.imagePath (GIF preferred if available)
- **Prompt:** "Type the [Language Name] word:"
- **Input field:** For user to type the answer
- **Audio:** Not auto-played in quiz (but available in card structure)

---

## 5. QUIZ FLOW & SEQUENCING LOGIC

### 5.1 Quiz Initialization & Mode Selection

**Location:** quiz-module.js lines 16-163

**UI Render (lines 24-72):**
```html
<div class="container module-quiz">
    <h1>Unsa Ni? (${langName}: ${lessonDisplay})</h1>
    <div class="mode-buttons">
        <button class="mode-btn active" data-mode="review">Review Mode</button>
        <button class="mode-btn" data-mode="test">Test Mode</button>
    </div>
    <button id="startBtn">Start</button>
    ...
</div>
```

**Mode Handling (lines 103-109):**
```javascript
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentMode = e.target.dataset.mode;  // 'review' or 'test'
    });
});
```

### 5.2 Quiz Start & Card Shuffling

**Location:** quiz-module.js lines 129-163

**TEST MODE (lines 140-145):**
```javascript
if (this.currentMode === 'test') {
    // Shuffle all cards randomly
    this.shuffledCards = [...this.rawCards].sort(() => Math.random() - 0.5);
    this.currentCardIndex = 0;
    this.updateScores();
    this.sequenceCounter = 0;
    document.getElementById('rightPanel').style.display = 'block';  // Show scores
}
```

**REVIEW MODE (lines 146-156):**
```javascript
else {
    // Add spaced repetition metadata
    this.shuffledCards = [...this.rawCards].map(c => ({
        ...c,
        mastered: false,           // Track mastery status
        minNextShow: -1            // Spaced repetition timing
    }));
    this.sequenceCounter = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    document.getElementById('rightPanel').style.display = 'none';  // Hide scores
}
```

### 5.3 Card Sequencing in Each Mode

**Location:** quiz-module.js lines 165-198

**TEST MODE - Linear Sequential (lines 168-174):**
```javascript
if (this.currentMode === 'test') {
    // End of quiz?
    if (this.currentCardIndex >= this.shuffledCards.length) {
        this.showReview();
        return;
    }
    
    // Get next card in sequence
    card = this.shuffledCards[this.currentCardIndex];
    this.currentCardIndex++;
}
```

**REVIEW MODE - Spaced Repetition with Random Selection (lines 175-188):**
```javascript
else {
    // Get unmastered cards only
    const unmastered = this.shuffledCards.filter(c => !c.mastered);
    
    // All mastered?
    if (unmastered.length === 0) {
        this.showCongratulations();
        return;
    }
    
    // Get cards eligible to show (minNextShow <= current sequence)
    const eligible = unmastered.filter(c => c.minNextShow <= this.sequenceCounter);
    
    // If no eligible cards, show first unmastered
    if (eligible.length === 0) {
        card = unmastered[0];
    } else {
        // Random selection from eligible cards
        card = eligible[Math.floor(Math.random() * eligible.length)];
    }
}
```

### 5.4 Complete Quiz Flow Diagram

```
START
  ↓
[Mode Selection: Review or Test]
  ↓
[User clicks Start]
  ↓
[Load & Shuffle Cards]
  ├─ Test Mode: Random shuffle all cards
  └─ Review Mode: Mark all as unmastered, set minNextShow = -1
  ↓
[Show Card (image)]
  ↓
[User Types Answer → Submit/Enter]
  ↓
[Check Answer]
  ├─ CORRECT
  │   ├─ Test Mode: Increment correctCount → Wait 1500ms → showNextCard()
  │   └─ Review Mode: Mark mastered=true → sequenceCounter++ → showNextCard()
  │
  └─ INCORRECT
      ├─ Test Mode: Increment incorrectCount → Show answer feedback → Wait 1500ms → showNextCard()
      └─ Review Mode: Show correct answer → Set minNextShow = sequenceCounter + 3 → sequenceCounter++ → showNextCard()
  ↓
[Continue until end]
  ├─ Test Mode: All cards shown? → showReview() → Show final score
  └─ Review Mode: All mastered? → showCongratulations()
```

---

## 6. CORRECT VS INCORRECT ANSWER SELECTION

### 6.1 Answer Validation Logic

**Location:** quiz-module.js lines 200-252

```javascript
submitAnswer() {
    if (!this.currentCard) return;
    
    // Get user's answer and normalize (trim + lowercase)
    const userAnswer = document.getElementById('userInput').value.trim().toLowerCase();
    
    // Get acceptable answers from card (lines 205-206)
    const acceptableAnswers = this.currentCard.acceptableAnswers || [this.currentCard.word];
    
    // Check if user answer matches ANY acceptable answer (case-insensitive)
    const isCorrect = acceptableAnswers.some(answer => answer.toLowerCase() === userAnswer);
    
    // acceptableAnswers = ["Asa", "Unsa"]
    // User enters: "asa" OR "unsa" → CORRECT (case-insensitive matching)
    // User enters: "asi" OR "unknown" → INCORRECT
}
```

### 6.2 Acceptable Answers Structure

**From Manifest (v3.x):**
```json
"translations": {
    "cebuano": {
        "word": "Asa",
        "acceptableAnswers": ["Asa"]
    }
}
```

**From enrichCard() Processing:**
```javascript
// If acceptableAnswers is an array, use as-is
acceptableAnswers = card.acceptableAnswers;  // ["Asa"]

// If acceptableAnswers is missing, split by comma
acceptableAnswers = primaryTranslation.word.split(',').map(w => w.trim());
// "Asa, Unsa" → ["Asa", "Unsa"]

// Or split by slash
acceptableAnswers = card.word.split('/').map(w => w.trim());
// "Asa/Unsa" → ["Asa", "Unsa"]
```

### 6.3 Feedback Handling

**TEST MODE (lines 210-224):**
```javascript
if (this.currentMode === 'test') {
    // Record user response
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
    
    // No answer explanation in test mode
    this.updateScores();
    setTimeout(() => this.showNextCard(), 1500);
}
```

**REVIEW MODE (lines 225-251):**
```javascript
else {
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
        
        // Show the correct answer
        const correctDisplay = document.getElementById('correctWordDisplay');
        correctDisplay.textContent = `Correct: ${acceptableAnswers[0]}`;
        correctDisplay.classList.add('show');
        
        // Set when to show again (3 cards later)
        this.currentCard.minNextShow = this.sequenceCounter + 3;
        
        // Show answer for 3 seconds before moving on
        setTimeout(() => {
            correctDisplay.classList.remove('show');
            this.sequenceCounter++;
            this.showNextCard();
        }, 3000);
    }
}
```

---

## 7. RANDOMIZATION & ANSWER SELECTION LOGIC

### 7.1 Question Randomization

**TEST MODE - Full Randomization (line 141):**
```javascript
this.shuffledCards = [...this.rawCards].sort(() => Math.random() - 0.5);
```
- Uses Fisher-Yates style shuffle via `.sort(() => Math.random() - 0.5)`
- **Note:** This is a simple randomization (not cryptographically secure)
- Results in: Random order of ALL questions

**REVIEW MODE - Intelligent Randomization (lines 176-187):**
```javascript
// Filter to unmastered cards
const unmastered = this.shuffledCards.filter(c => !c.mastered);

// Get cards eligible based on spaced repetition timing
const eligible = unmastered.filter(c => c.minNextShow <= this.sequenceCounter);

// If no eligible cards, force show first unmastered
if (eligible.length === 0) {
    card = unmastered[0];
} else {
    // Random selection from eligible cards
    card = eligible[Math.floor(Math.random() * eligible.length)];
}
```

**Spaced Repetition Algorithm:**
- On incorrect answer: `minNextShow = sequenceCounter + 3`
- Meaning: Card won't reappear for at least 3 more card intervals
- This implements a simple "wait 3 cards" retry spacing
- Example timeline:
  - Sequence 0: Show "Asa" → INCORRECT → minNextShow = 3
  - Sequence 1-2: Show other cards
  - Sequence 3+: "Asa" becomes eligible again

### 7.2 Answer Choice Selection

**Quiz Does NOT Generate Incorrect Answers:**
- Quiz module doesn't generate multiple choice options
- It's a typing-based quiz, not multiple choice
- Only validates user input against acceptable answers

**Acceptable Answers Come From Manifest:**
```javascript
const acceptableAnswers = this.currentCard.acceptableAnswers || [this.currentCard.word];

// Examples from manifest:
// "Asa" → ["Asa"]
// "Sulat/Sulat sa" → ["Sulat", "Sulat sa"]  (split by /)
```

---

## 8. DETAILED CODE REFERENCES & FILE LOCATIONS

### Key Files:
| File | Lines | Purpose |
|------|-------|---------|
| `/home/user/WSOL/quiz-module.js` | 1-289 | Main quiz module implementation |
| `/home/user/WSOL/app.js` | 21-60 | LearningModule base class |
| `/home/user/WSOL/app.js` | 404-748 | FilterManager for advanced filtering |
| `/home/user/WSOL/app.js` | 754-1118 | AssetManager for manifest loading |
| `/home/user/WSOL/assets/assets_old/manifest.json` | All | Quiz card definitions |

### Key Methods:

**Quiz Module:**
- `constructor()` - Initialize quiz state (lines 2-14)
- `render()` - Generate UI (lines 16-73)
- `init()` - Set up event listeners (lines 75-127)
- `startQuiz()` - Initialize quiz & shuffle cards (lines 129-163)
- `showNextCard()` - Display next card with logic (lines 165-198)
- `submitAnswer()` - Process user input (lines 200-252)
- `showReview()` - Display test results (lines 259-282)
- `showCongratulations()` - Show mastery screen (lines 284-287)

**AssetManager:**
- `loadManifest()` - Fetch & parse manifest (lines 766-811)
- `setLanguage()` - Switch language (lines 864-903)
- `getCards()` - Filter cards by lesson/filter (lines 927-969)
- `enrichCard()` - Normalize card data (lines 971-1068)

**FilterManager:**
- `isActive()` - Check if advanced filter enabled (line 714-716)
- `getFilteredCards()` - Apply filter criteria (lines 718-748)

---

## SUMMARY: Complete Data Flow

```
1. User opens app
   ↓
2. AssetManager loads manifest.json
   - manifest.languages → populate language selector
   - manifest.cards → store as cards array
   ↓
3. User selects Language → AssetManager.setLanguage(trigraph)
   - Load cards for that language
   - Extract lessons from cards
   ↓
4. User optionally applies Advanced Filter
   - FilterManager.applyFilters()
   - Cards filtered by grammar, category, ACTFL, etc.
   ↓
5. User selects Lesson (or uses filter as lesson)
   ↓
6. User clicks "Start Quiz"
   - Quiz.startQuiz() called
   - rawCards = assetManager.getCards()
     (calls enrichCard() to add acceptableAnswers, imagePath, audioPath)
   - shuffledCards = shuffle rawCards (test) or add spaced-rep metadata (review)
   ↓
7. Quiz.showNextCard() loop
   - Test Mode: Sequential from shuffled array
   - Review Mode: Random from eligible unmastered cards
   ↓
8. User types answer
   - Quiz.submitAnswer()
   - Compare userAnswer (lowercase) vs acceptableAnswers (case-insensitive)
   - Test Mode: Move to next card, track score
   - Review Mode: Mark mastered, apply spaced repetition timing
   ↓
9. End Quiz
   - Test Mode: Show review with all answers
   - Review Mode: Show congratulations when all mastered
```

