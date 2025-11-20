# Match Module Code Reference Quick Guide

## Question 1: WHERE IS THE MATCH MODULE CODE LOCATED?

**File Locations:**
```
/home/user/WSOL/match-module.js              → Picture Match Module (459 lines)
/home/user/WSOL/match-sound-module.js        → Audio Match Module (477 lines)
/home/user/WSOL/app.js (lines 754-1118)      → AssetManager class
/home/user/WSOL/app.js (lines 404-749)       → FilterManager class
```

---

## Question 2: HOW DOES IT LOAD/READ THE MANIFEST?

**Code Reference: AssetManager.loadManifest()**
- **Location**: `/home/user/WSOL/app.js`, lines 766-811
- **Key Lines**:
  - Line 771: `const response = await fetch('assets/manifest.json?_=${timestamp}'...)`
  - Line 785: `this.manifest = await response.json()`
  - Line 786: `this.languages = this.manifest.languages || []`
  - Lines 789-801: Version detection (v4.0 vs v3.x)

**Code Reference: AssetManager.setLanguage()**
- **Location**: `/home/user/WSOL/app.js`, lines 864-903
- **Key Lines**:
  - Line 874: `this.cards = this.manifest.cards[trigraph] || []` (v4.0)
  - Line 796: `this.cards = this.manifest.cards || []` (v3.x fallback)
  - Lines 877-883: Extract lessons for language

**Code Reference: Match Module Usage**
- **Location**: `/home/user/WSOL/match-module.js`, lines 99-110
- **Key Line**: `this.allCards = this.assets.getCards()`

---

## Question 3: HOW DOES IT DETERMINE WHICH PICTURES TO SHOW?

**Code Reference: MatchExerciseModule.renderPicture()**
- **Location**: `/home/user/WSOL/match-module.js`, lines 183-221

**Critical Lines**:
```javascript
// Line 200-201: Get all unmatched cards
const unmatchedArray = Array.from(this.unmatched);

// Lines 203-208: Prioritize ones not yet presented
let availableForPresentation = unmatchedArray.filter(idx => 
    !this.presentedPictureIndices.has(idx)
);
if (availableForPresentation.length === 0) {
    availableForPresentation = unmatchedArray;
}

// Line 210: RANDOM SELECTION - Pick one randomly
const randomIdx = availableForPresentation[
    Math.floor(Math.random() * availableForPresentation.length)
];

// Line 212: Mark as presented
this.presentedPictureIndices.add(randomIdx);

// Lines 214-220: Display the image
const targetCard = this.virtualCards[randomIdx];
pictureSection.innerHTML = `<img src="${targetCard.imagePath}" ...>`;
```

---

## Question 4: HOW DOES IT DETERMINE WHICH WORDS TO SHOW?

**Code Reference: MatchExerciseModule.renderWords()**
- **Location**: `/home/user/WSOL/match-module.js`, lines 223-260

**Critical Lines**:

**Step 1: Get Distractors (lines 232-239)**
```javascript
const targetCard = this.virtualCards[this.currentTargetIdx];
const maxPictures = deviceDetector ? deviceDetector.getMaxPictures() : 4;

// Get other unmatched cards - EXCLUDE SAME CARD and SAME WORD
const otherUnmatched = Array.from(this.unmatched).filter(idx => {
    const card = this.virtualCards[idx];
    if (card.cardId === targetCard.cardId) return false;  // Same card variant
    return !card.allWords.some(w => targetCard.allWords.includes(w));  // Same word
});
```

**Step 2: Randomize Distractors (line 242)**
```javascript
// Shuffle and take 3 distractors
const shuffled = otherUnmatched
    .sort(() => Math.random() - 0.5)
    .slice(0, maxPictures - 1);
```

**Step 3: Randomize Positions (line 245)**
```javascript
// Combine target + distractors, then shuffle positions
const displayWords = [this.currentTargetIdx, ...shuffled]
    .sort(() => Math.random() - 0.5);
```

**Step 4: Render (lines 247-259)**
```javascript
displayWords.forEach(virtualIdx => {
    const card = this.virtualCards[virtualIdx];
    item.innerHTML = `<span class="word">${card.targetWord}</span>`;
});
```

---

## Question 5: HOW DOES IT CREATE MATCHING PAIRS?

**Code Reference: MatchExerciseModule.expandToVirtualCards()**
- **Location**: `/home/user/WSOL/match-module.js`, lines 17-35

**Critical Lines**:
```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        // Line 21: Get acceptable answers (multiple variants possible)
        const acceptableAnswers = card.acceptableAnswers || [card.word];
        
        // Lines 22-31: Create virtual card for EACH answer variant
        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,         // Original card ID
                targetWord: targetWord,       // THIS variant
                physicalIndex: physicalIndex,
                imagePath: card.imagePath,    // SHARED image
                audioPath: card.audioPath,    // SHARED audio
                allWords: acceptableAnswers,  // ALL variants for comparison
                originalCard: card
            });
        });
    });
    return virtualCards;
}
```

**In startExercise (lines 159-160)**:
```javascript
this.virtualCards = this.expandToVirtualCards(this.allCards);
this.unmatched = new Set(this.virtualCards.map((_, i) => i));
```

**Example**:
- Physical card has: `acceptableAnswers: ["cat", "kitten"]`
- Creates 2 virtual cards:
  - Virtual Card 0: `{targetWord: "cat", cardId: 1, imagePath: "cat.png", allWords: ["cat", "kitten"]}`
  - Virtual Card 1: `{targetWord: "kitten", cardId: 1, imagePath: "cat.png", allWords: ["cat", "kitten"]}`

---

## Question 6: WHAT IS THE SELECTION LOGIC (HOW MANY ITEMS, WHICH ITEMS)?

**Number of Items**: Always 4
- **Location**: `/home/user/WSOL/app.js`, lines 189-192
```javascript
getMaxPictures() {
    return 4; // Always 4 across all devices
}
```

**Selection Breakdown**:
1. **1 Correct Answer**: The current target virtual card
2. **3 Distractors**: Random selection from other unmatched cards

**Which Distractors**:
- **Location**: `/home/user/WSOL/match-module.js`, lines 232-242
- Exclude if same `cardId` (variant of same card)
- Exclude if word overlap with target's `allWords`
- Randomly shuffle and take first 3

**Example Logic**:
```javascript
// Suppose we have these virtual cards:
// [0] {targetWord: "cat", cardId: 1, allWords: ["cat"]}
// [1] {targetWord: "kitten", cardId: 1, allWords: ["kitten"]}
// [2] {targetWord: "dog", cardId: 2, allWords: ["dog"]}
// [3] {targetWord: "bird", cardId: 3, allWords: ["bird"]}
// [4] {targetWord: "fish", cardId: 4, allWords: ["fish"]}

// If target is [0] {cat}:
// Excluded:
//   [1] - same cardId (1)
// Candidates for distractors: [2, 3, 4]
// Select 3 distractors: all 3 randomly shuffled
// Display: [0 (target), 2, 3, 4] then shuffle positions
// Result: Could show "dog", "cat", "bird", "fish" in any order
```

---

## Question 7: DOES IT RANDOMIZE THE SELECTION AND POSITIONING?

**YES - THREE LEVELS OF RANDOMIZATION**:

**1. PICTURE SELECTION RANDOMIZATION**
- **Location**: `/home/user/WSOL/match-module.js`, line 210
```javascript
const randomIdx = availableForPresentation[
    Math.floor(Math.random() * availableForPresentation.length)
];
```
- Uses `Math.random()` to pick from available unmatched cards
- Prioritizes unpresented cards (fair distribution)

**2. DISTRACTOR SELECTION RANDOMIZATION**
- **Location**: `/home/user/WSOL/match-module.js`, line 242
```javascript
const shuffled = otherUnmatched
    .sort(() => Math.random() - 0.5)  // SHUFFLE
    .slice(0, maxPictures - 1);       // Take first 3
```
- Shuffles the distractor candidates list
- Takes first 3 from shuffled list
- Result: Different 3 distractors selected each round (if more than 3 available)

**3. POSITION RANDOMIZATION**
- **Location**: `/home/user/WSOL/match-module.js`, line 245
```javascript
const displayWords = [this.currentTargetIdx, ...shuffled]
    .sort(() => Math.random() - 0.5);  // SHUFFLE POSITIONS
```
- Combines target + distractors
- Shuffles the entire array
- Result: Correct answer can appear in any position (1st, 2nd, 3rd, or 4th)

**Result**: Users cannot predict:
- Which picture will appear next
- Which words will be distractors
- Where the correct answer will be positioned

---

## CRITICAL COMPARISON LOGIC

**Location**: `/home/user/WSOL/match-module.js`, line 269

```javascript
selectWord(item, virtualIdx) {
    const selectedCard = this.virtualCards[virtualIdx];
    const targetCard = this.virtualCards[this.currentTargetIdx];
    const selectedWord = selectedCard.targetWord;
    
    // CRITICAL: Does selected word exist in target's acceptable answers?
    const isCorrect = targetCard.allWords.includes(selectedWord);
    //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                 This is the CORE matching logic
```

**How it works**:
- Takes the word that was CLICKED: `selectedCard.targetWord`
- Checks if it's in the TARGET card's complete answer set: `targetCard.allWords`
- Supports multi-answer cards naturally

**Example**:
```javascript
// Target picture is "cat" with variants
targetCard = {
    cardId: 1,
    targetWord: "cat",
    allWords: ["cat", "kitten"]  // Both are valid
}

// User clicks on "kitten"
selectedCard = {
    cardId: 2,
    targetWord: "kitten",
    allWords: ["dog"]
}

// Check: "kitten".in(["cat", "kitten"]) → TRUE ✓
```

---

## STATE TRACKING

**Tracking Sets (from startExercise, lines 159-168)**:

```javascript
// All virtual card indices not yet matched
this.unmatched = new Set(this.virtualCards.map((_, i) => i));

// Virtual card indices already shown at least once
this.presentedPictureIndices = new Set();

// Tracks correct answer count for each virtual card (review mode)
this.correctCounts = new Map();
this.virtualCards.forEach((_, idx) => {
    this.correctCounts.set(idx, 0);
});
```

**On Selection (from selectWord)**:
- **Test Mode**: Remove target picture from unmatched
- **Review Mode**: Increment count, remove only if >= reviewRepetitions

---

## ENRICHMENT AND NORMALIZATION

**Location**: `/home/user/WSOL/app.js`, lines 971-1069

The AssetManager.enrichCard() method normalizes both v3.x and v4.0 cards:

```javascript
enrichCard(card) {
    // Build acceptableAnswers (can be split by "/" or array)
    let acceptableAnswers = card.acceptableAnswers;
    if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
        acceptableAnswers = card.word 
            ? card.word.split('/').map(w => w.trim()).filter(w => w) 
            : [];
    }
    
    return {
        ...card,
        acceptableAnswers,      // Normalized array
        audioPath: card.audio || null,
        imagePath: imagePath,
        word: card.word,
        english: card.english,
        // ... other properties
    };
}
```

This ensures:
- Multi-word support (e.g., "cat/kitten" becomes ["cat", "kitten"])
- Consistent property names across versions
- Ready for virtual card expansion

