# Manifest JSON System: Comprehensive Guide
## How Flashcards, Match, Audio-Match, and Quiz Modules Determine What Content to Show

---

## Table of Contents
1. [Manifest JSON Structure Overview](#manifest-json-structure-overview)
2. [How Each Module Works](#how-each-module-works)
3. [Content Selection Comparison Table](#content-selection-comparison-table)
4. [Randomization & Timing Logic](#randomization--timing-logic)
5. [Key Architectural Patterns](#key-architectural-patterns)
6. [Complete Data Flow](#complete-data-flow)

---

## Manifest JSON Structure Overview

### Location
- **File Path:** `/home/user/WSOL/assets/assets_old/manifest.json`
- **Generator:** `/home/user/WSOL/scan-assets.php`
- **Size:** 232 KB, 7,747 lines
- **Current Version:** v3.1 (transitioning to v4.0)

### v3.1 Structure (Currently Used)

```json
{
  "version": "3.1",
  "lastUpdated": "2025-11-16T23:28:58-08:00",
  "languages": [
    {"id": 1, "name": "Cebuano", "trigraph": "ceb"},
    {"id": 2, "name": "English", "trigraph": "eng"},
    {"id": 3, "name": "Maranao", "trigraph": "mrw"},
    {"id": 4, "name": "Sinama", "trigraph": "sin"}
  ],
  "totalCards": 185,
  "lessonStats": {
    "1": {"total": 23, "withImage": 23, "audioCount": {"ceb": 23}}
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
      "audio": {"ceb": "assets/1.ceb.asa.m4a"},
      "translations": {
        "cebuano": {
          "word": "Asa",
          "note": "Where",
          "acceptableAnswers": ["Asa"]
        },
        "english": {"word": "", "note": "", "acceptableAnswers": []}
      },
      "grammar": "Interrogative",
      "category": null,
      "actflEst": "Novice-Mid"
    }
  ]
}
```

### Key Data Types
1. **Text:** Words, translations, notes, grammar labels, categories
2. **Images:** PNG (185 cards), GIF (4 animated cards)
3. **Audio:** M4A files (57 cards with Cebuano audio)
4. **Metadata:** Card numbers, lesson numbers, proficiency levels

---

## How Each Module Works

### 1. FLASHCARDS MODULE (`flashcards-module.js`)

#### How it Loads the Manifest
```javascript
// app.js:766-811
async loadManifest() {
    const timestamp = new Date().getTime();
    const response = await fetch(`assets/manifest.json?_=${timestamp}`, {
        cache: 'no-store'
    });
    this.manifest = await response.json();
}
```

#### How Pictures are Determined
**Location:** `flashcards-module.js:117`

```javascript
const img = document.createElement('img');
img.src = card.imagePath;  // From enrichCard normalization
```

**Priority Order:**
1. If `hasGif === true` → Use `manifest.images[cardNum].gif`
2. Otherwise → Use `card.printImagePath` (PNG)
3. Error fallback → Gray placeholder

**Code Reference:** `app.js:991-994`

#### How Words are Determined
**Location:** `flashcards-module.js:194-223`

For **v3.x cards** (current version):
```javascript
// app.js:1000-1019
const learningLangKey = this.currentLanguage?.trigraph?.toLowerCase(); // "ceb"
const learningLangName = this.getLangKeyFromTrigraph(learningLangKey); // "cebuano"
const primaryTranslation = allTranslations[learningLangName];

return {
    word: primaryTranslation?.word || '',  // "Asa"
    english: allTranslations.english?.word || '',  // "Where"
    wordNote: primaryTranslation?.note || '',
    englishNote: allTranslations.english?.note || ''
};
```

**Display:**
- Front: Image + speaker icon (if has audio)
- Back: Cebuano word + note, English word + note

#### How Audio is Determined
**Location:** `app.js:1097-1108`

```javascript
getAudioPath(card) {
    if (card.audio) {
        if (typeof card.audio === 'string') return card.audio; // v4.0
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase(); // "ceb"
        return card.audio[trigraph] || null; // "assets/1.ceb.asa.m4a"
    }
    return null;
}
```

**Playback:** `flashcards-module.js:150-159`
```javascript
speaker.addEventListener('click', (e) => {
    const audio = new Audio(card.audioPath);
    audio.play();
});
```

#### Timing & Sequencing
**No randomization** - Sequential display in manifest order

```javascript
// flashcards-module.js:94-99
async renderPage() {
    const start = this.currentIndex;  // Starting position
    const end = Math.min(start + this.cardsPerPage, this.cards.length);
    const pageCards = this.cards.slice(start, end);  // Sequential slice
    // Render 1-4 cards per page (device-dependent)
}
```

**Cards Per Page:**
- Mobile: 1 card
- Tablet: 2-4 cards
- Desktop: 4 cards

**Card Flip Animation:** 300ms fade transition

---

### 2. MATCH MODULE (`match-module.js`)

#### How it Loads Cards
```javascript
// match-module.js:90-118
async init() {
    this.allCards = this.assets.getCards({ hasImage: true })
        .filter(card => card.word);  // Need both image and word
}
```

#### Virtual Card System
**Critical Pattern:** Expands multi-word cards into separate virtual cards

```javascript
// match-module.js:17-35
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach(card => {
        const acceptableAnswers = card.acceptableAnswers || [card.word];
        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,
                targetWord: targetWord,
                imagePath: card.imagePath,
                allWords: acceptableAnswers
            });
        });
    });
    return virtualCards;
}
```

**Example:**
```
Physical Card: {cardNum: 36, word: "Lamesa/Lamisa"}
               ↓
Virtual Cards: [{targetWord: "Lamesa"}, {targetWord: "Lamisa"}]
```

#### How Pictures are Selected
**Location:** `match-module.js:183-221`

```javascript
renderPicture() {
    // 1. Filter to unmatched cards only
    const unmatchedArray = Array.from(this.unmatched);

    // 2. Prioritize cards not yet presented
    let availableForPresentation = unmatchedArray
        .filter(idx => !this.presentedImageIndices.has(idx));

    // 3. Random selection
    const randomIdx = availableForPresentation[
        Math.floor(Math.random() * availableForPresentation.length)
    ];

    // 4. Mark as presented
    this.presentedImageIndices.add(randomIdx);

    // 5. Show image
    img.src = targetCard.imagePath;
}
```

#### How Words are Selected
**Location:** `match-module.js:223-260`

```javascript
renderWords() {
    // 1. Get the target card (picture shown)
    const targetCard = this.virtualCards[this.currentTargetIdx];

    // 2. Filter distractors - exclude:
    //    a) Same physical card (cardId match)
    //    b) Overlapping words
    const otherUnmatched = Array.from(this.unmatched).filter(idx => {
        const card = this.virtualCards[idx];
        if (card.cardId === targetCard.cardId) return false;
        return !card.allWords.some(w => targetCard.allWords.includes(w));
    });

    // 3. Shuffle and take 3 distractors
    const shuffled = otherUnmatched
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    // 4. Combine target + 3 distractors, shuffle positions
    const displayWords = [this.currentTargetIdx, ...shuffled]
        .sort(() => Math.random() - 0.5);

    // 5. Render as clickable options (always 4)
}
```

#### Matching Logic
```javascript
// match-module.js:262-325
selectWord(virtualIdx) {
    const selectedCard = this.virtualCards[virtualIdx];
    const targetCard = this.virtualCards[this.currentTargetIdx];

    // Check if selected word is in target's acceptable answers
    const isCorrect = targetCard.allWords.includes(selectedCard.targetWord);

    // Draw line (green if correct, red if wrong)
    this.drawLine(dot1, dot2, isCorrect ? 'green' : 'red');
}
```

#### Randomization
**Three levels:**
1. **Picture selection:** Random from unmatched pool
2. **Distractor selection:** Shuffle pool, take first 3
3. **Position randomization:** Shuffle final 4-option array

---

### 3. AUDIO-MATCH MODULE (`match-sound-module.js`)

#### How it Loads Cards
```javascript
// match-sound-module.js:90-118
async init() {
    this.allCards = this.assets.getCards({ hasAudio: true })
        .filter(card => card.imagePath);  // Need both audio AND images
}
```

**Requirements:** Only cards with both `hasAudio === true` AND valid `imagePath`

#### How Audio is Selected
**Location:** `match-sound-module.js:191-236`

```javascript
renderAudio() {
    // 1. Get unmatched cards
    const unmatchedArray = Array.from(this.unmatched);

    // 2. Prioritize audio not yet presented
    let availableForPresentation = unmatchedArray
        .filter(idx => !this.presentedAudioIndices.has(idx));

    // 3. If all presented, use any unmatched
    if (availableForPresentation.length === 0) {
        availableForPresentation = unmatchedArray;
    }

    // 4. Random selection
    const randomIdx = availableForPresentation[
        Math.floor(Math.random() * availableForPresentation.length)
    ];

    // 5. Mark as presented
    this.presentedAudioIndices.add(randomIdx);

    // 6. Play audio
    speaker.addEventListener('click', () => {
        const audio = new Audio(targetCard.audioPath);
        audio.play();
    });
}
```

#### How Pictures are Selected
**Location:** `match-sound-module.js:238-295`

```javascript
renderPictures() {
    const targetCard = this.virtualCards[this.currentTargetIdx];

    // 1. Filter other unmatched, exclude:
    //    - Same physical card (cardId match)
    //    - Overlapping words
    const otherUnmatched = Array.from(this.unmatched).filter(idx => {
        const card = this.virtualCards[idx];
        if (card.cardId === targetCard.cardId) return false;
        return !card.allWords.some(w => targetCard.allWords.includes(w));
    });

    // 2. Shuffle and take up to 3
    const shuffled = otherUnmatched
        .sort(() => Math.random() - 0.5)
        .slice(0, maxPictures - 1);

    // 3. Combine target + distractors, shuffle positions
    const displayPictures = [this.currentTargetIdx, ...shuffled]
        .sort(() => Math.random() - 0.5);

    // 4. Render as clickable images (1-4 depending on device)
}
```

**Max Pictures:**
- Mobile: 1-2 pictures
- Tablet: 2-3 pictures
- Desktop: 4 pictures

#### Review Mode Logic
**Spaced repetition with configurable mastery:**

```javascript
// match-sound-module.js:297-384
selectPicture(item, virtualIdx) {
    const isCorrect = targetCard.allWords.includes(selectedCard.targetWord);

    if (this.currentMode === 'review') {
        if (isCorrect) {
            // Increment correct count
            const currentCount = this.correctCounts.get(virtualIdx) || 0;
            this.correctCounts.set(virtualIdx, currentCount + 1);

            // Check if mastered (default: 3 correct answers)
            if (this.correctCounts.get(virtualIdx) >= this.reviewRepetitions) {
                this.unmatched.delete(virtualIdx);  // Remove from pool
            }
        }
    }
}
```

**Review Repetitions:** Default 3, user-configurable

#### Randomization
**Three levels:**
1. **Audio selection:** Random from eligible (prioritize not-yet-presented)
2. **Picture selection:** Shuffle filtered pool, take 3
3. **Position randomization:** Shuffle final array

---

### 4. QUIZ MODULE (`quiz-module.js`)

#### How it Loads Cards
```javascript
// quiz-module.js:38-71
async init() {
    this.cards = this.assets.getCards();  // All cards for current lesson/filter

    if (this.currentMode === 'test') {
        // Shuffle once at start
        this.shuffledCards = [...this.cards]
            .sort(() => Math.random() - 0.5);
    }
}
```

#### How Questions are Selected

**Test Mode:**
```javascript
// quiz-module.js:132-150
showNextQuestion() {
    if (this.currentQuestionIndex >= this.shuffledCards.length) {
        this.showTestReview();
        return;
    }

    const card = this.shuffledCards[this.currentQuestionIndex];
    this.renderQuestion(card);
    this.currentQuestionIndex++;
}
```
- **Order:** Shuffled once at start, then sequential presentation
- **No skipping:** All cards presented exactly once

**Review Mode:**
```javascript
// quiz-module.js:152-191
showNextQuestion() {
    // 1. Filter to cards eligible to show (spaced repetition)
    const eligibleCards = this.cards.filter((card, idx) => {
        const minNextShow = this.minNextShow.get(idx) || 0;
        return minNextShow <= this.sequenceCounter &&
               !this.masteredSet.has(idx);
    });

    // 2. Random selection from eligible
    const randomIndex = Math.floor(Math.random() * eligibleCards.length);
    const card = eligibleCards[randomIndex];

    this.renderQuestion(card);
    this.sequenceCounter++;
}
```
- **Order:** Dynamic random selection from eligible cards
- **Spaced Repetition:** Failed cards wait 3 questions before reappearing

#### How Content is Shown
**Location:** `quiz-module.js:193-237`

```javascript
renderQuestion(card) {
    // 1. Show image
    const img = document.createElement('img');
    img.src = card.imagePath;

    // 2. Play audio if available
    if (card.hasAudio) {
        const audio = new Audio(card.audioPath);
        audio.play();
    }

    // 3. Show English prompt
    questionText.textContent = card.english;  // "Where"

    // 4. Show input for user to type answer
    answerInput.placeholder = `Type in ${this.assets.currentLanguage.name}`;
}
```

**Question Format:**
- Picture at top
- Auto-play audio (if available)
- English word/phrase as prompt
- Text input for typing answer in target language

#### Answer Validation
**Location:** `quiz-module.js:239-289`

```javascript
checkAnswer() {
    const userAnswer = this.answerInput.value.trim().toLowerCase();
    const card = this.getCurrentCard();

    // Check against all acceptable answers (case-insensitive)
    const isCorrect = card.acceptableAnswers.some(
        answer => answer.toLowerCase() === userAnswer
    );

    if (this.currentMode === 'review') {
        if (isCorrect) {
            this.masteredSet.add(this.currentCardIndex);
        } else {
            // Fail: Must wait 3 more questions
            this.minNextShow.set(this.currentCardIndex, this.sequenceCounter + 3);

            // Show first acceptable answer
            this.showFeedback(`Correct: ${card.acceptableAnswers[0]}`);
        }
    }
}
```

**Validation:**
- Case-insensitive comparison
- Accepts any answer in `acceptableAnswers` array
- No multiple choice - typing only

#### Randomization
**Test Mode:** Shuffle once at initialization
**Review Mode:** Random selection from eligible cards each round
**Answers:** NO randomization (typing input, not multiple choice)

#### Spaced Repetition Algorithm
```javascript
// Incorrect answer
this.minNextShow.set(cardIndex, this.sequenceCounter + 3);

// Next question selection
const eligibleCards = this.cards.filter((card, idx) => {
    const minNextShow = this.minNextShow.get(idx) || 0;
    return minNextShow <= this.sequenceCounter;  // Can show now?
});
```

**Logic:**
- Wrong answer → Can't show for 3 more questions
- `sequenceCounter` increments after each question
- Only cards with `minNextShow <= sequenceCounter` are eligible

---

## Content Selection Comparison Table

| Module | Picture Selection | Word/Text Selection | Audio Selection | Randomization | Order |
|--------|------------------|---------------------|-----------------|---------------|-------|
| **Flashcards** | From `imagePath` (GIF preferred, PNG fallback) | From `translations[language].word` | From `audio[trigraph]` | **NONE** | Sequential in manifest order |
| **Match** | Random from unmatched (prioritize not-yet-shown) | Target (shown picture) + 3 random distractors | N/A | **3-level:** Picture/Distractors/Positions | Random selection, shuffled options |
| **Audio-Match** | Target + 3 random distractors (exclude overlaps) | N/A | Random from unmatched (prioritize not-yet-played) | **3-level:** Audio/Pictures/Positions | Random selection, shuffled options |
| **Quiz** | From `imagePath` for current question | From `acceptableAnswers` for validation | Auto-play from `audioPath` | **Test:** Shuffle once<br>**Review:** Dynamic random | Test: Sequential after shuffle<br>Review: Random from eligible |

---

## Randomization & Timing Logic

### 1. Flashcards: NO Randomization
```javascript
// Sequential pagination
const pageCards = this.cards.slice(start, end);
```
- Display order = Manifest order
- User controls navigation (prev/next)
- No shuffling

### 2. Match: Triple Randomization
```javascript
// Level 1: Picture selection
const randomIdx = Math.floor(Math.random() * availableForPresentation.length);

// Level 2: Distractor selection
const shuffled = otherUnmatched.sort(() => Math.random() - 0.5).slice(0, 3);

// Level 3: Position shuffle
const displayWords = [target, ...shuffled].sort(() => Math.random() - 0.5);
```

### 3. Audio-Match: Triple Randomization
```javascript
// Level 1: Audio selection
const randomIdx = availableForPresentation[
    Math.floor(Math.random() * availableForPresentation.length)
];

// Level 2: Picture selection
const shuffled = otherUnmatched.sort(() => Math.random() - 0.5).slice(0, 3);

// Level 3: Position shuffle
const displayPictures = [target, ...shuffled].sort(() => Math.random() - 0.5);
```

### 4. Quiz: Conditional Randomization
```javascript
// Test Mode: Shuffle once
this.shuffledCards = [...this.cards].sort(() => Math.random() - 0.5);

// Review Mode: Random from eligible
const randomIndex = Math.floor(Math.random() * eligibleCards.length);
```

---

## Key Architectural Patterns

### 1. AssetManager Central Data Hub
**Location:** `app.js:754-1118`

All modules access manifest data through AssetManager:
```javascript
class LearningModule {
    constructor(assets) {
        this.assets = assets;  // AssetManager instance
    }

    async init() {
        this.cards = this.assets.getCards();  // Filtered & enriched
    }
}
```

### 2. Card Enrichment Pattern
**Purpose:** Normalize v3.x and v4.0 manifest formats

```javascript
enrichCard(card) {
    // Extract language-specific data
    const trigraph = this.currentLanguage?.trigraph?.toLowerCase();

    return {
        ...card,
        word: getWordForLanguage(card, trigraph),
        english: getEnglishWord(card),
        imagePath: getImagePath(card),
        audioPath: getAudioPath(card, trigraph),
        acceptableAnswers: getAcceptableAnswers(card, trigraph)
    };
}
```

### 3. Virtual Card Pattern (Match modules)
**Purpose:** Support multi-word cards in matching games

```javascript
// Physical card with multiple variants
{cardNum: 36, acceptableAnswers: ["Lamesa", "Lamisa"]}

// Becomes 2 virtual cards
[
    {cardId: 36, targetWord: "Lamesa", allWords: ["Lamesa", "Lamisa"]},
    {cardId: 36, targetWord: "Lamisa", allWords: ["Lamesa", "Lamisa"]}
]
```

**Benefits:**
- Each word variant is a separate match target
- Shared image and card ID prevent self-matching
- Simple match validation logic

### 4. Presentation Tracking Pattern
**Purpose:** Prevent immediate repetition

```javascript
// Track what's been shown
this.presentedImageIndices = new Set();
this.presentedAudioIndices = new Set();

// Prioritize unpresented content
let availableForPresentation = unmatchedArray
    .filter(idx => !this.presentedImageIndices.has(idx));

// Fallback to any if all presented
if (availableForPresentation.length === 0) {
    availableForPresentation = unmatchedArray;
}
```

### 5. Spaced Repetition Pattern (Quiz Review)
**Purpose:** Adaptive review scheduling

```javascript
// Track next eligible question number
this.minNextShow = new Map();  // cardIndex → sequenceCounter
this.sequenceCounter = 0;       // Increments after each question

// Wrong answer: Block for 3 questions
this.minNextShow.set(cardIndex, this.sequenceCounter + 3);

// Filter eligible
const eligible = cards.filter((card, idx) => {
    return (this.minNextShow.get(idx) || 0) <= this.sequenceCounter;
});
```

---

## Complete Data Flow

### Startup Flow
```
1. User opens app (index.html loads)
   ↓
2. app.js initializes
   ↓
3. AssetManager.loadManifest()
   ├─→ fetch('assets/manifest.json')
   ├─→ Parse JSON
   ├─→ Detect version (v3.x or v4.0)
   └─→ Store in this.manifest
   ↓
4. User selects Language (e.g., "Cebuano")
   ├─→ AssetManager.setLanguage("ceb")
   └─→ For v4.0: Load this.cards = manifest.cards["ceb"]
       For v3.x: this.cards = manifest.cards (flat array)
   ↓
5. User selects Lesson (e.g., "Lesson 1")
   ├─→ AssetManager.setLesson(1)
   └─→ Triggers currentLesson update
```

### Module-Specific Flow

#### Flashcards
```
User clicks "Flashcards"
   ↓
Router → flashcardsModule.render()
   ↓
flashcardsModule.init()
   ├─→ this.cards = assets.getCards()
   │   ├─→ Filter by currentLesson
   │   ├─→ Apply advanced filters if active
   │   └─→ Map through enrichCard()
   ↓
renderPage()
   ├─→ Slice cards[currentIndex : currentIndex + cardsPerPage]
   ├─→ For each card:
   │   ├─→ Create card element
   │   ├─→ Front: <img src=imagePath> + speaker
   │   └─→ Back: word + english
   ↓
User interaction
   ├─→ Click card → Flip (300ms animation)
   ├─→ Click speaker → Play audio
   └─→ Click prev/next → Update currentIndex, re-render
```

#### Match
```
User clicks "Match"
   ↓
matchModule.init()
   ├─→ this.allCards = assets.getCards({hasImage: true})
   │   └─→ Filter cards with both image and word
   ↓
startExercise()
   ├─→ expandToVirtualCards(allCards)
   │   └─→ Create virtual card per acceptableAnswer variant
   ├─→ this.unmatched = Set[all virtual card indices]
   ↓
renderPicture()
   ├─→ Random select from unmatched (prioritize not-yet-shown)
   ├─→ Set currentTargetIdx
   ├─→ Show image
   ↓
renderWords()
   ├─→ Filter otherUnmatched (exclude same card & overlaps)
   ├─→ Shuffle, take 3 distractors
   ├─→ Combine with target, shuffle positions
   ├─→ Render 4 word buttons
   ↓
selectWord()
   ├─→ Check if selectedWord in targetCard.allWords
   ├─→ Draw line (green/red)
   ├─→ Remove from unmatched
   └─→ If unmatched.size > 0: loop to renderPicture()
       Else: showTestReview()
```

#### Audio-Match
```
User clicks "Audio Match"
   ↓
matchSoundModule.init()
   ├─→ this.allCards = assets.getCards({hasAudio: true})
   │   └─→ Filter cards with both audio AND image
   ↓
startExercise()
   ├─→ expandToVirtualCards(allCards)
   ├─→ this.unmatched = Set[all indices]
   ├─→ this.correctCounts = Map[index → 0]
   ↓
renderAudio()
   ├─→ Random select from unmatched (prioritize not-yet-played)
   ├─→ Set currentTargetIdx
   ├─→ Render speaker button
   ├─→ On click: play Audio(audioPath)
   ↓
renderPictures()
   ├─→ Filter otherUnmatched (exclude same card & overlaps)
   ├─→ Shuffle, take up to 3 distractors
   ├─→ Combine with target, shuffle positions
   ├─→ Render 1-4 picture options (device-dependent)
   ↓
selectPicture()
   ├─→ Check if selectedWord in targetCard.allWords
   ├─→ Draw line
   ├─→ REVIEW MODE:
   │   ├─→ If correct: increment correctCounts[idx]
   │   └─→ If correctCounts[idx] >= reviewRepetitions:
   │       └─→ unmatched.delete(idx)
   └─→ TEST MODE:
       └─→ Always unmatched.delete(idx)
   ↓
   └─→ If unmatched.size > 0: loop to renderAudio()
       Else: show completion
```

#### Quiz
```
User clicks "Quiz"
   ↓
quizModule.init()
   ├─→ this.cards = assets.getCards()
   ├─→ If TEST mode: shuffle cards once
   ├─→ If REVIEW mode: Initialize spaced repetition tracking
   ↓
showNextQuestion()
   ├─→ TEST MODE:
   │   └─→ card = shuffledCards[currentQuestionIndex++]
   └─→ REVIEW MODE:
       ├─→ Filter to eligible cards (minNextShow <= sequenceCounter)
       └─→ Random select from eligible
   ↓
renderQuestion(card)
   ├─→ Show image (card.imagePath)
   ├─→ Auto-play audio (card.audioPath) if available
   ├─→ Show English prompt (card.english)
   ├─→ Show text input
   ↓
checkAnswer()
   ├─→ Compare user input (lowercase) vs acceptableAnswers (lowercase)
   ├─→ TEST MODE:
   │   └─→ Record answer, move to next
   └─→ REVIEW MODE:
       ├─→ If correct: masteredSet.add(index)
       └─→ If wrong: minNextShow.set(index, sequenceCounter + 3)
   ↓
   └─→ Loop to showNextQuestion()
```

---

## Summary

### Key Insights

1. **Central Data Hub:** All modules use `AssetManager` as single source of truth
2. **Dual Format Support:** Code handles both v3.x (current) and v4.0 (target) manifests
3. **Card Enrichment:** All cards normalized before use in modules
4. **Virtual Card Pattern:** Match modules expand multi-word cards for granular matching
5. **Presentation Tracking:** Prevents immediate repetition of content
6. **Spaced Repetition:** Quiz review mode uses adaptive scheduling
7. **Randomization Varies:**
   - Flashcards: None (sequential)
   - Match/Audio-Match: Triple randomization (selection + distractors + positions)
   - Quiz: Conditional (shuffle once vs dynamic random)

### File Reference Guide

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| Manifest JSON | `/assets/assets_old/manifest.json` | 7747 | Card data storage |
| AssetManager | `/app.js` | 754-1118 | Manifest loading & card enrichment |
| Flashcards | `/flashcards-module.js` | 315 | Sequential card review |
| Match | `/match-module.js` | 459 | Picture-to-word matching |
| Audio-Match | `/match-sound-module.js` | 459 | Audio-to-picture matching |
| Quiz | `/quiz-module.js` | 289 | Typing practice with spaced repetition |

### Data Selection Summary

| Question | Answer |
|----------|--------|
| **How is picture determined?** | From `card.imagePath` (enriched from `imagePath`/`printImagePath`/`manifest.images`) |
| **How is word determined?** | From `translations[currentLanguage].word` (v3.x) or `card.word` (v4.0) |
| **How is audio determined?** | From `audio[trigraph]` (v3.x) or `card.audio` (v4.0) |
| **When is content shown?** | Flashcards: Sequential pagination<br>Match/Audio-Match: Random with presentation tracking<br>Quiz: Test = sequential after shuffle, Review = spaced repetition |
| **Is it randomized?** | Flashcards: No<br>Match/Audio-Match: Yes (triple randomization)<br>Quiz: Test = once, Review = dynamic |

---

**Document Created:** 2025-11-20
**Repository:** `/home/user/WSOL`
**Branch:** `claude/research-manifest-modules-015Pg5imKqapV6sQ6o5gyNq9`
