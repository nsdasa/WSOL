# Quiz Module Analysis - Complete Documentation

This directory now contains three comprehensive analysis documents about how the quiz module reads and uses the manifest JSON.

## Documents Created

### 1. QUIZ_MANIFEST_ANALYSIS.md (Comprehensive)
**Size:** ~8,000 lines of detailed analysis
**Purpose:** Complete technical reference with all details

**Contents:**
- Quiz module location & architecture
- Manifest loading & reading flow (step by step)
- How quiz determines which questions to ask
- How quiz determines what content to show (pictures/audio/words)
- Quiz flow & sequencing logic
- Correct vs incorrect answer selection mechanism
- Randomization & answer selection logic
- Detailed code references for all key functions
- Complete data flow summary

**Best For:** Deep understanding, implementation, troubleshooting

**Read This If You Want To:**
- Understand the complete system from start to finish
- Know every detail about how questions are selected
- Learn the spaced repetition algorithm
- Understand manifest enrichment process
- See all the code line references

---

### 2. QUIZ_ARCHITECTURE_DIAGRAM.txt (Visual)
**Purpose:** ASCII diagrams and flow charts

**Contents:**
- Application initialization flow
- User interaction sequence
- Card loading & enrichment process diagram
- Quiz initialization & shuffling
- Quiz loop with decision trees
- Answer submission & validation flow
- Quiz completion paths
- Manifest structure diagram
- Randomization mechanisms
- File structure overview

**Best For:** Visual learners, quick navigation, high-level understanding

**Read This If You Want To:**
- See visual flow diagrams
- Understand the big picture quickly
- Navigate between different sections
- See how systems interact graphically
- Use as a reference poster

---

### 3. QUIZ_CODE_SNIPPETS.md (Reference)
**Purpose:** Copy-paste ready code with line numbers

**Contents:**
- 10 key code snippets with explanations
- Manifest loading code
- Card filtering code
- Card enrichment code
- Quiz initialization & shuffling
- Card selection logic (both modes)
- Answer validation logic
- Review screen generation
- Advanced filter integration
- Sample manifest structure

**Best For:** Quick lookups, implementation reference, debugging

**Read This If You Want To:**
- Find specific code quickly
- Copy working code patterns
- Understand specific functions
- See real code in context
- Quick fact summary table

---

## Quick Navigation

### If You Need To Understand...

**Question Selection:**
- See: `QUIZ_ARCHITECTURE_DIAGRAM.txt` → "QUIZ LOOP: CARD SELECTION & DISPLAY"
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 5 (showNextCard)
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 5.3

**Randomization:**
- See: `QUIZ_ARCHITECTURE_DIAGRAM.txt` → "KEY RANDOMIZATION MECHANISMS"
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 4 (startQuiz)
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 7

**Answer Checking:**
- See: `QUIZ_ARCHITECTURE_DIAGRAM.txt` → "USER ANSWER SUBMISSION & VALIDATION"
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 6 (submitAnswer)
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 6

**Manifest Structure:**
- See: `QUIZ_ARCHITECTURE_DIAGRAM.txt` → "MANIFEST STRUCTURE (v3.x Format)"
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 10
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 2

**Card Enrichment:**
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 3 (enrichCard)
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 4

**Advanced Filtering:**
- See: `QUIZ_ARCHITECTURE_DIAGRAM.txt` → "CARD LOADING & ENRICHMENT PROCESS"
- Code: `QUIZ_CODE_SNIPPETS.md` → Section 8
- Details: `QUIZ_MANIFEST_ANALYSIS.md` → Section 3.3

---

## Key File Locations

```
/home/user/WSOL/
├── quiz-module.js                          (Main quiz implementation - 289 lines)
├── app.js                                  (AssetManager, FilterManager - 1700+ lines)
├── assets/assets_old/manifest.json         (Card definitions)
│
├── QUIZ_MANIFEST_ANALYSIS.md               (THIS - Comprehensive analysis)
├── QUIZ_ARCHITECTURE_DIAGRAM.txt           (Visual diagrams)
├── QUIZ_CODE_SNIPPETS.md                   (Code reference)
└── README_QUIZ_ANALYSIS.md                 (This file)
```

---

## Key Classes & Methods Summary

### UnsaNiQuizModule (quiz-module.js)
- `constructor()` - Initialize quiz state
- `render()` - Generate UI
- `init()` - Set up event listeners
- `startQuiz()` - Initialize and shuffle cards
- `showNextCard()` - Display next card with logic
- `submitAnswer()` - Process user input
- `showReview()` - Display test results

### AssetManager (app.js)
- `loadManifest()` - Fetch & parse manifest
- `setLanguage()` - Switch language
- `getCards()` - Filter cards by lesson/filter
- `enrichCard()` - Normalize card data

### FilterManager (app.js)
- `isActive()` - Check if advanced filter enabled
- `getFilteredCards()` - Apply filter criteria

---

## Key Data Structures

### Manifest Card (v3.x)
```javascript
{
    wordNum: 1,
    lesson: 1,
    type: "N",
    imagePath: "...",
    translations: {
        cebuano: { word: "Asa", acceptableAnswers: ["Asa"] },
        english: { word: "", acceptableAnswers: [] },
        ...
    },
    grammar: "Interrogative",
    audio: { ceb: "assets/1.ceb.asa.m4a" },
    category: null,
    actflEst: "Novice-Mid"
}
```

### Enriched Card
```javascript
{
    // ... original properties ...
    acceptableAnswers: ["Asa"],
    imagePath: "assets/1.Asa.Where.png",
    audioPath: "assets/1.ceb.asa.m4a",
    word: "Asa",
    english: "",
    allTranslations: { ... },
    // Added by Review mode:
    mastered: false,
    minNextShow: -1
}
```

---

## Key Algorithms

### Spaced Repetition (Review Mode)
When card is incorrect: `minNextShow = sequenceCounter + 3`

This means the card won't be shown again until 3 more cards have been presented.

### Card Selection (Review Mode)
1. Filter to unmastered cards only
2. Filter to eligible cards (minNextShow <= sequenceCounter)
3. If eligible cards exist: randomly select from them
4. If no eligible cards: force show first unmastered card

### Card Randomization (Test Mode)
Use Fisher-Yates style shuffle: `.sort(() => Math.random() - 0.5)`

Then present sequentially from the shuffled array.

---

## Quick Facts

- **Manifest Format:** v3.x (flat array)
- **Quiz Modes:** Review & Test
- **Languages:** Cebuano, Maranao, Sinama
- **Answer Validation:** Case-insensitive, checks all acceptableAnswers
- **Spaced Repetition Delay:** 3 cards
- **Feedback Display:** 1500ms (correct), 3000ms (incorrect in review mode)
- **Total Cards:** ~185 across all lessons

---

## How to Use These Documents

1. **First Time Learning:** Start with `QUIZ_ARCHITECTURE_DIAGRAM.txt`
2. **Implementing:** Use `QUIZ_CODE_SNIPPETS.md` as reference
3. **Deep Dive:** Refer to `QUIZ_MANIFEST_ANALYSIS.md` for all details
4. **Quick Lookup:** Use line numbers provided to jump to specific code

---

## Generated: 2025-11-20

All analysis documents generated based on comprehensive codebase analysis.
Lines references are accurate to the source files as of the generation date.

