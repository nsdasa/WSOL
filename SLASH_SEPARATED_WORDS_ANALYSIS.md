# Slash-Separated Words Analysis
## How CSV Words Like "Ako/ko" Are Processed Into Acceptable Answers

---

## Table of Contents
1. [Overview](#overview)
2. [Complete Data Flow](#complete-data-flow)
3. [CSV Format](#csv-format)
4. [scan-assets.php Processing](#scan-assetsphp-processing)
5. [Manifest JSON Storage](#manifest-json-storage)
6. [app.js enrichCard() Processing](#appjs-enrichcard-processing)
7. [Which Modules Use This Feature](#which-modules-use-this-feature)
8. [How Each Module Uses Multi-Word Variants](#how-each-module-uses-multi-word-variants)
9. [Complete Example Walkthrough](#complete-example-walkthrough)

---

## Overview

The system supports **slash-separated word variants** (e.g., "Ako/ko", "Kini / ni") in CSV files. These are automatically split into separate acceptable answers during runtime, allowing users to provide any variant when answering.

### Key Points
- **CSV stores:** "Ako/ko" as a single string
- **Manifest v3.1 stores:** `"word": "Ako/ko"` + `"acceptableAnswers": ["Ako", "ko"]`
- **Manifest v4.0 stores:** `"word": "Ako/ko"` + `"acceptableAnswers": ["Ako/ko"]` (splitting happens at runtime)
- **Runtime processing:** `enrichCard()` splits by "/" to create array of acceptable answers
- **Modules use:** All matching/quiz modules validate against the acceptableAnswers array

---

## Complete Data Flow

```
CSV File (Word_List_Cebuano.csv)
    "Ako/ko"
         |
         V
scan-assets.php
    loadLanguageWordList()
    → Read CSV row[2] = "Ako/ko"
    → Store as: 'word' => trim($row[2]) = "Ako/ko"
         |
         V
Manifest JSON (v4.0)
    {
        "word": "Ako/ko",
        "acceptableAnswers": ["Ako/ko"]  ← Single element
    }
         |
         V
app.js → AssetManager.enrichCard()
    Line 982: acceptableAnswers = card.word.split('/').map(w => w.trim())
    → ["Ako", "ko"]
         |
         V
Enriched Card in Memory
    {
        word: "Ako/ko",           ← Display value
        acceptableAnswers: ["Ako", "ko"]  ← Validation array
    }
         |
         V
Modules Use enrichCard() Output
    ├─→ Match: Creates 2 virtual cards (one per variant)
    ├─→ Audio-Match: Creates 2 virtual cards
    ├─→ Quiz: Validates user input against both "Ako" and "ko"
    └─→ Flashcards: Displays "Ako/ko" on card
```

---

## CSV Format

### File Location
- `/home/user/WSOL/assets/Word_List_Cebuano.csv`
- `/home/user/WSOL/assets/Word_List_Maranao.csv`
- `/home/user/WSOL/assets/Word_List_Sinama.csv`

### CSV Structure
```csv
Lesson #,Card #,Cebuano,English,Cebuano Note,English Note,Maranao,Maranao Note,Sinama,Sinama Note,Grammar,Category,Sub-Category 1,Sub-Category 2,ACTFL Est.,Type
1,12,Ako/ko,I/me,,,,,,,Pronoun,Function Word,Pronoun,Pronoun,Novice-Low,N
1,13,Ikaw/ka,You,,,,,,,Pronoun,Function Word,Pronoun,Pronoun,Novice-Low,N
1,14,Kini / ni,This,,,,,,,Demonstrative pronoun,Function Word,Demonstrative,Demonstrative,Novice-Mid,N
1,15,Kana / na,That,,,,,,,Demonstrative pronoun,Function Word,Demonstrative,Demonstrative,Novice-Mid,N
1,21,Mestro/a,Teacher,,,,,,,Noun,World,Occupation,Teaching,Novice-High,S
```

### Slash Variants in CSV
Words can contain slashes with or without spaces:
- **Without spaces:** `Ako/ko` → splits to `["Ako", "ko"]`
- **With spaces:** `Kini / ni` → splits to `["Kini", "ni"]` (trim() removes spaces)
- **Mixed:** `Mestro/a` → splits to `["Mestro", "a"]` (though "a" alone might not be meaningful)

**Column Position:** Word is in column 2 (0-indexed) for Cebuano, column 6 for Maranao, column 8 for Sinama

---

## scan-assets.php Processing

### Location
`/home/user/WSOL/scan-assets.php`

### CSV Loading Function
**Lines 309-338:**

```php
function loadLanguageWordList($path) {
    if (!file_exists($path)) return [];

    $cards = [];
    $file = fopen($path, 'r');
    if (!$file) return [];

    $headers = fgetcsv($file); // read header

    while (($row = fgetcsv($file)) !== false) {
        if (count($row) < 6) continue;

        $cards[] = [
            'lesson' => (int)$row[0],
            'cardNum' => (int)$row[1],
            'word' => trim($row[2]),          // ← "Ako/ko" stored as-is
            'wordNote' => $row[3] ?? '',
            'english' => trim($row[4]),
            'englishNote' => $row[5] ?? '',
            'grammar' => $row[6] ?? '',
            'category' => $row[7] ?? '',
            'subCategory1' => $row[8] ?? '',
            'subCategory2' => $row[9] ?? '',
            'actflEst' => $row[10] ?? '',
            'type' => $row[11] ?? 'N'
        ];
    }
    fclose($file);
    return $cards;
}
```

**Key Point:** The word is stored **exactly as it appears in the CSV** - no splitting occurs at this stage.

### Manifest Generation
**Lines 223-240:**

```php
$finalCards[$trig][] = [
    'lesson' => $c['lesson'],
    'cardNum' => $c['cardNum'],
    'word' => $c['word'][$trig],                  // ← "Ako/ko"
    'english' => $c['english'][$trig] ?? '',
    'grammar' => $c['grammar'],
    'category' => $c['category'],
    'subCategory1' => $c['subCategory1'],
    'subCategory2' => $c['subCategory2'],
    'actflEst' => $c['actflEst'],
    'type' => $c['type'],
    'acceptableAnswers' => [$c['word'][$trig]],   // ← ["Ako/ko"] single element
    'englishAcceptable' => [$c['english'][$trig] ?? ''],
    'audio' => $audioPath,
    'hasAudio' => $hasAudio,
    'printImagePath' => $c['printImagePath'],
    'hasGif' => $c['hasGif']
];
```

**Result:** Manifest v4.0 has:
```json
{
    "word": "Ako/ko",
    "acceptableAnswers": ["Ako/ko"]
}
```

**Important:** The PHP script does NOT split the slashes. It stores the word in a single-element array.

---

## Manifest JSON Storage

### v3.1 Format (Current, Hand-Edited)
**Location:** `/home/user/WSOL/assets/assets_old/manifest.json`

```json
{
    "wordNum": 12,
    "lesson": 1,
    "imagePath": "assets/12.Ako.I.png",
    "audio": {
        "ceb": "assets/12.ceb.ako-ko.m4a"
    },
    "translations": {
        "cebuano": {
            "word": "Ako/ko",
            "note": "I/me",
            "acceptableAnswers": ["Ako", "ko"]  ← Already split (hand-edited)
        }
    }
}
```

**Note:** The current v3.1 manifest has `acceptableAnswers` already split. This was likely done manually or by an older version of the scanning script.

### v4.0 Format (Generated by scan-assets.php)
**Location:** `/home/user/WSOL/assets/manifest.json` (when generated)

```json
{
    "lesson": 1,
    "cardNum": 12,
    "word": "Ako/ko",
    "english": "I/me",
    "acceptableAnswers": ["Ako/ko"],  ← NOT split in manifest
    "englishAcceptable": ["I/me"],
    "audio": "assets/12.ceb.ako-ko.m4a",
    "hasAudio": true
}
```

**Key Difference:** v4.0 stores the slash-separated string as a single element in the array. The splitting happens at runtime.

---

## app.js enrichCard() Processing

### Location
`/home/user/WSOL/app.js:971-1069`

### For v4.0 Cards
**Lines 975-1019:**

```javascript
enrichCard(card) {
    const isV4Card = !card.translations && card.word !== undefined;

    if (isV4Card) {
        // v4.0 card structure - direct properties
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';

        // Build acceptableAnswers
        let acceptableAnswers = card.acceptableAnswers;
        if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
            acceptableAnswers = card.word ?
                card.word.split('/').map(w => w.trim()).filter(w => w) : [];
        } else {
            // CRITICAL: Even if acceptableAnswers exists, split each element
            // This handles ["Ako/ko"] → ["Ako", "ko"]
            acceptableAnswers = acceptableAnswers.flatMap(ans =>
                ans.split('/').map(w => w.trim()).filter(w => w)
            );
        }

        // Build englishAcceptable (same logic)
        let englishAcceptable = card.englishAcceptable;
        if (!englishAcceptable || !Array.isArray(englishAcceptable)) {
            englishAcceptable = card.english ?
                card.english.split('/').map(w => w.trim()).filter(w => w) : [];
        } else {
            englishAcceptable = englishAcceptable.flatMap(ans =>
                ans.split('/').map(w => w.trim()).filter(w => w)
            );
        }

        return {
            ...card,
            acceptableAnswers,      // ← ["Ako", "ko"]
            englishAcceptable,
            // ... other properties
        };
    }
}
```

**Actual Code (Lines 980-989):**
```javascript
// Build acceptableAnswers
let acceptableAnswers = card.acceptableAnswers;
if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
    acceptableAnswers = card.word ?
        card.word.split('/').map(w => w.trim()).filter(w => w) : [];
}

// Build englishAcceptable
let englishAcceptable = card.englishAcceptable;
if (!englishAcceptable || !Array.isArray(englishAcceptable)) {
    englishAcceptable = card.english ?
        card.english.split('/').map(w => w.trim()).filter(w => w) : [];
}
```

**Processing Steps:**
1. Check if `acceptableAnswers` exists and is an array
2. If not, split `card.word` by "/"
3. Apply `.trim()` to each part (removes leading/trailing spaces)
4. Filter out empty strings
5. Result: `["Ako/ko"]` → becomes `["Ako", "ko"]`

**Note:** The current code (line 982) only splits if `acceptableAnswers` doesn't exist. This means:
- If manifest has `["Ako/ko"]`, it stays as `["Ako/ko"]` ❌
- If manifest has no `acceptableAnswers`, it splits `card.word` by "/" ✅

**Potential Issue:** The current implementation might not split if the manifest already has a single-element array with a slash-separated string.

### For v3.x Cards
**Lines 1042-1052:**

```javascript
// Build acceptableAnswers
let acceptableAnswers;
if (primaryTranslation) {
    if (primaryTranslation.acceptableAnswers &&
        Array.isArray(primaryTranslation.acceptableAnswers)) {
        acceptableAnswers = primaryTranslation.acceptableAnswers;  // Use existing
    } else {
        acceptableAnswers = primaryTranslation.word
            .split(',')  // ← Note: splits by COMMA, not slash!
            .map(w => w.trim())
            .filter(w => w);
    }
} else {
    acceptableAnswers = [card.cebuano || ''];
}
```

**Key Point:** For v3.x cards, if `acceptableAnswers` exists in the manifest, it's used as-is. The current v3.1 manifest already has split answers:
```json
"acceptableAnswers": ["Ako", "ko"]
```

So v3.x cards work correctly because the manifest was pre-processed.

---

## Which Modules Use This Feature

### Modules That Use `acceptableAnswers`

| Module | File | Uses Multi-Word? | How? |
|--------|------|-----------------|------|
| **Match** | `match-module.js` | ✅ YES | Creates virtual cards (one per variant) |
| **Audio-Match** | `match-sound-module.js` | ✅ YES | Creates virtual cards (one per variant) |
| **Quiz** | `quiz-module.js` | ✅ YES | Validates input against all variants |
| **Flashcards** | `flashcards-module.js` | ❌ NO | Only displays the word, doesn't validate |
| **Deck Builder** | `deck-builder-module.js` | ⚠️ PARTIAL | Stores word as-is, relies on enrichCard |

---

## How Each Module Uses Multi-Word Variants

### 1. Match Module (`match-module.js`)

#### Virtual Card Expansion
**Lines 17-35:**

```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        // Get acceptableAnswers from enriched card
        const acceptableAnswers = card.acceptableAnswers || [card.word];

        // CREATE ONE VIRTUAL CARD PER ACCEPTABLE ANSWER
        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,           // Same card ID for all variants
                targetWord: targetWord,         // "Ako" or "ko"
                physicalIndex: physicalIndex,
                imagePath: card.imagePath,      // Shared image
                audioPath: card.audioPath,
                allWords: acceptableAnswers,    // ["Ako", "ko"] for exclusion
                originalCard: card
            });
        });
    });
    return virtualCards;
}
```

#### Example: "Ako/ko" Card
**Physical Card (from CSV):**
```javascript
{
    cardNum: 12,
    word: "Ako/ko",
    acceptableAnswers: ["Ako", "ko"],  // After enrichCard
    imagePath: "assets/12.Ako.I.png"
}
```

**Becomes 2 Virtual Cards:**
```javascript
[
    {
        cardId: 12,
        targetWord: "Ako",
        allWords: ["Ako", "ko"],
        imagePath: "assets/12.Ako.I.png"
    },
    {
        cardId: 12,
        targetWord: "ko",
        allWords: ["Ako", "ko"],
        imagePath: "assets/12.Ako.I.png"
    }
]
```

#### Usage in Matching Logic
**Lines 262-325 (selectWord method):**

```javascript
selectWord(item, virtualIdx) {
    const selectedCard = this.virtualCards[virtualIdx];
    const targetCard = this.virtualCards[this.currentTargetIdx];

    // Check if selected word is one of the target's acceptable answers
    const isCorrect = targetCard.allWords.includes(selectedCard.targetWord);

    if (isCorrect) {
        // User matched correctly
        // Both "Ako" and "ko" are valid matches for the same image
    }
}
```

**Exclusion Logic (renderWords, lines 223-260):**

```javascript
const otherUnmatched = Array.from(this.unmatched).filter(idx => {
    const card = this.virtualCards[idx];

    // Exclude if same physical card (cardId match)
    if (card.cardId === targetCard.cardId) return false;

    // Exclude if any word overlaps with target's words
    return !card.allWords.some(w => targetCard.allWords.includes(w));
});
```

**Why This Matters:**
- If showing the image for "Ako/ko", both "Ako" and "ko" word buttons would be correct
- The exclusion logic prevents showing both variants as options
- It filters out the same cardId (12) completely
- It also filters out any other cards that share words (word overlap check)

---

### 2. Audio-Match Module (`match-sound-module.js`)

**Identical Virtual Card Logic:**
**Lines 19-39:**

```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        // v4.0: Use card.acceptableAnswers (populated by enrichCard)
        const acceptableAnswers = card.acceptableAnswers || [card.word];

        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,
                targetWord: targetWord,
                physicalIndex: physicalIndex,
                imagePath: card.imagePath,
                audioPath: card.audioPath,      // Same audio for all variants
                allWords: acceptableAnswers,    // For exclusion logic
                originalCard: card
            });
        });
    });
    return virtualCards;
}
```

**Usage:**
- Plays audio for "Ako/ko" (e.g., "assets/12.ceb.ako-ko.m4a")
- Shows pictures as answer options
- Either "Ako" or "ko" variant can be the target of a question
- Same exclusion logic as Match module

---

### 3. Quiz Module (`quiz-module.js`)

**Validation Logic:**
**Lines 200-249:**

```javascript
submitAnswer() {
    if (!this.currentCard) return;

    const userAnswer = document.getElementById('userInput').value.trim().toLowerCase();

    // Check against ALL acceptable answers
    const acceptableAnswers = this.currentCard.acceptableAnswers || [this.currentCard.word];
    const isCorrect = acceptableAnswers.some(answer =>
        answer.toLowerCase() === userAnswer
    );

    if (this.currentMode === 'test') {
        // Record answer as correct/incorrect
        this.userResponses[this.currentCardIndex - 1] = { userAnswer, isCorrect };

        if (isCorrect) {
            this.correctCount++;
        } else {
            this.incorrectCount++;
        }
    } else {
        // Review mode
        if (isCorrect) {
            this.currentCard.mastered = true;
        } else {
            // Show first acceptable answer as hint
            const correctDisplay = document.getElementById('correctWordDisplay');
            correctDisplay.textContent = `Correct: ${acceptableAnswers[0]}`;
            correctDisplay.classList.add('show');

            // Delay next appearance by 3 questions
            this.currentCard.minNextShow = this.sequenceCounter + 3;
        }
    }
}
```

**Example Scenario:**
```
Question: Shows image of person, plays audio (if available), displays "I/me"
User types: "ako"  ← lowercase
System checks: ["Ako", "ko"].some(answer => answer.toLowerCase() === "ako")
              → "Ako".toLowerCase() === "ako" → true ✓
Result: Correct!

Alternative:
User types: "ko"
System checks: ["Ako", "ko"].some(answer => answer.toLowerCase() === "ko")
              → "ko".toLowerCase() === "ko" → true ✓
Result: Also correct!
```

**Case-Insensitive Matching:**
- User input converted to lowercase: `.toLowerCase()`
- Each acceptable answer converted to lowercase: `answer.toLowerCase()`
- Comparison: exact match required

**Feedback Display:**
- If incorrect, shows `acceptableAnswers[0]` as the correct answer
- For "Ako/ko", would show "Ako" (first variant)
- User sees: "Correct: Ako"

---

### 4. Flashcards Module (`flashcards-module.js`)

**Does NOT use multi-word variants for validation** - only for display.

**Display Logic:**
**Lines 194-223:**

```javascript
const primaryWord = card.word;  // "Ako/ko" - displays as-is
const englishWord = card.english;

let backHTML = `
    <div class="card-back-content">
        <div class="primary-word-box">
            <div class="primary-lang-label">${learningLangLabel.toUpperCase()}</div>
            <div class="primary-word" style="font-size: ${primaryFontSize}px;">
                ${primaryWord}    ← Shows "Ako/ko"
            </div>
        </div>
        <div class="secondary-language">
            <div class="secondary-lang-label">English:</div>
            <div class="secondary-word" style="font-size: ${englishFontSize}px;">
                ${englishWord}
            </div>
        </div>
    </div>
`;
```

**Result:** User sees "Ako/ko" displayed exactly as written in CSV.

---

### 5. Deck Builder Module (`deck-builder-module.js`)

**Storage Logic:**
**Lines 1084-1092:**

```javascript
} else if (field === 'word') {
    // v4.0: direct property
    card.word = value;  // Stores "Ako/ko" as-is
    card.acceptableAnswers = [value];  // ["Ako/ko"] single element
} else if (field === 'english') {
    // v4.0: direct property
    card.english = value;
    card.englishAcceptable = [value];
}
```

**Key Point:** The Deck Builder stores the word exactly as entered by the user. If they type "Ako/ko", it stores:
```javascript
{
    word: "Ako/ko",
    acceptableAnswers: ["Ako/ko"]
}
```

The splitting happens later when `enrichCard()` is called in other modules.

---

## Complete Example Walkthrough

### Example: Card #12 "Ako/ko" (I/me)

#### Step 1: CSV Entry
**File:** `Word_List_Cebuano.csv`
```csv
1,12,Ako/ko,I/me,,,,,,,Pronoun,Function Word,Pronoun,Pronoun,Novice-Low,N
```

#### Step 2: scan-assets.php Reads CSV
```php
$cards[] = [
    'cardNum' => 12,
    'word' => 'Ako/ko',  // ← Stored as single string
    'english' => 'I/me',
    // ...
];
```

#### Step 3: scan-assets.php Generates Manifest (v4.0)
```json
{
    "cardNum": 12,
    "word": "Ako/ko",
    "english": "I/me",
    "acceptableAnswers": ["Ako/ko"],  ← Single element
    "englishAcceptable": ["I/me"],
    "audio": "assets/12.ceb.ako-ko.m4a",
    "imagePath": "assets/12.Ako.I.png"
}
```

#### Step 4: AssetManager Loads Manifest
```javascript
// app.js:766-811
async loadManifest() {
    const response = await fetch(`assets/manifest.json?_=${timestamp}`);
    this.manifest = await response.json();
    this.cards = this.manifest.cards['ceb'];  // For v4.0
}
```

#### Step 5: Module Calls getCards()
```javascript
// match-module.js:116
this.allCards = this.assets.getCards({ hasImage: true });
```

#### Step 6: getCards() Calls enrichCard()
```javascript
// app.js:969
return filtered.map(card => this.enrichCard(card));
```

#### Step 7: enrichCard() Splits Slash-Separated Words
```javascript
// app.js:980-983
let acceptableAnswers = card.acceptableAnswers;
if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
    acceptableAnswers = card.word.split('/').map(w => w.trim()).filter(w => w);
}
// Result: ["Ako", "ko"]
```

**Note:** Current code issue - if `acceptableAnswers = ["Ako/ko"]` exists, it won't split it!

**Better Implementation Would Be:**
```javascript
let acceptableAnswers = card.acceptableAnswers || [card.word];
acceptableAnswers = acceptableAnswers.flatMap(ans =>
    ans.split('/').map(w => w.trim()).filter(w => w)
);
// ["Ako/ko"] → ["Ako", "ko"]
```

#### Step 8: Enriched Card Returned
```javascript
{
    cardNum: 12,
    word: "Ako/ko",
    english: "I/me",
    acceptableAnswers: ["Ako", "ko"],  ← Now split
    englishAcceptable: ["I", "me"],    ← English also split
    audioPath: "assets/12.ceb.ako-ko.m4a",
    imagePath: "assets/12.Ako.I.png",
    allTranslations: { ... }
}
```

#### Step 9A: Match Module Usage
```javascript
// match-module.js:18-35
expandToVirtualCards([enrichedCard])

// Creates 2 virtual cards:
[
    { cardId: 12, targetWord: "Ako", allWords: ["Ako", "ko"], ... },
    { cardId: 12, targetWord: "ko", allWords: ["Ako", "ko"], ... }
]
```

**Game Flow:**
```
Round 1:
- Random selection: Show image "12.Ako.I.png"
- Show 4 word options: ["Ako", "Unsa", "Asa", "Oo"]
- User clicks "Ako" ✓ Correct!

Round 2 (later):
- Random selection: Show image "12.Ako.I.png" again
- Show 4 word options: ["ko", "Dili", "Ikaw", "Kini"]
- User clicks "ko" ✓ Correct! (same image, different variant)
```

#### Step 9B: Quiz Module Usage
```javascript
// quiz-module.js:205-206
const acceptableAnswers = this.currentCard.acceptableAnswers;  // ["Ako", "ko"]
const isCorrect = acceptableAnswers.some(answer =>
    answer.toLowerCase() === userAnswer
);
```

**Game Flow:**
```
Question: Shows image, plays audio, displays "I/me"
Input box: [_________________]

User types "ako" → Correct! ✓
OR
User types "ko" → Correct! ✓
OR
User types "Ako/ko" → Incorrect! ✗ (exact string not in array)
```

#### Step 9C: Flashcards Module Usage
```javascript
// flashcards-module.js:194
const primaryWord = card.word;  // "Ako/ko"

// Displays on card back:
CEBUANO
Ako/ko
I/me

ENGLISH
I/me
```

**No validation** - just displays the slash-separated string.

---

## Summary

### Data Flow Overview

| Stage | Format | Example | Notes |
|-------|--------|---------|-------|
| **CSV File** | String with "/" | `"Ako/ko"` | Raw data |
| **scan-assets.php** | Single string | `'word' => 'Ako/ko'` | No splitting |
| **Manifest v4.0** | Single-element array | `["Ako/ko"]` | Stored as-is |
| **enrichCard() (v4.0)** | Split array | `["Ako", "ko"]` | Runtime splitting |
| **Match Module** | Virtual cards | 2 cards, one per variant | Separate matching targets |
| **Quiz Module** | Validation array | Accepts "Ako" OR "ko" | Case-insensitive |
| **Flashcards** | Display string | Shows "Ako/ko" | No splitting needed |

### Which Separator?

| Context | Separator | Example | Notes |
|---------|-----------|---------|-------|
| **CSV to Manifest** | "/" (forward slash) | `Ako/ko` | Standard |
| **v3.x enrichCard** | "," (comma) | `Ako,ko` | Line 1048 |
| **v4.0 enrichCard** | "/" (forward slash) | `Ako/ko` | Line 982 |
| **Spaces handled?** | YES | `Kini / ni` | `.trim()` removes spaces |

### Current Code Issue

**Problem:** The current `enrichCard()` code at line 982:
```javascript
if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
    acceptableAnswers = card.word.split('/').map(w => w.trim()).filter(w => w);
}
```

Only splits if `acceptableAnswers` doesn't exist. If the manifest has `["Ako/ko"]`, it won't be split.

**Solution:** Use `.flatMap()` to split all elements:
```javascript
let acceptableAnswers = card.acceptableAnswers || [card.word];
acceptableAnswers = acceptableAnswers.flatMap(ans =>
    ans.split('/').map(w => w.trim()).filter(w => w)
);
```

### Module Usage Summary

| Module | Uses Splitting? | Purpose |
|--------|----------------|---------|
| **Match** | ✅ YES | Creates separate virtual cards for each variant |
| **Audio-Match** | ✅ YES | Creates separate virtual cards for each variant |
| **Quiz** | ✅ YES | Validates user input against all variants |
| **Flashcards** | ❌ NO | Only displays the full string "Ako/ko" |
| **Deck Builder** | ⚠️ STORES | Stores word as-is, relies on runtime splitting |

### Key Takeaways

1. **CSV Format:** Words with multiple variants use "/" separator (e.g., "Ako/ko")
2. **PHP Processing:** `scan-assets.php` does NOT split - stores as single string
3. **Manifest Storage:** v4.0 stores `["Ako/ko"]` as single array element
4. **Runtime Splitting:** `enrichCard()` in `app.js` splits "/" during card enrichment
5. **Virtual Cards:** Match modules create one virtual card per variant
6. **Validation:** Quiz module accepts any variant as correct answer
7. **Display:** Flashcards show the full "Ako/ko" string
8. **Case Handling:** Spaces around "/" are trimmed (e.g., "Kini / ni" → ["Kini", "ni"])

---

**Document Created:** 2025-11-20
**Repository:** `/home/user/WSOL`
**Branch:** `claude/research-manifest-modules-015Pg5imKqapV6sQ6o5gyNq9`
