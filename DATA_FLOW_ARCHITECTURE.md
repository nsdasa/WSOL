# WSOL Data Flow Architecture

## Overview

This document provides a comprehensive analysis of how data is managed and referenced across the WSOL learning platform, focusing on the manifest.json, DeckBuilder module, and all learning modules.

---

## 1. Central Data Store: manifest.json

**Location:** `/assets/manifest.json`
**Size:** ~21,800 lines
**Version:** 4.0

### Structure Diagram

```
manifest.json (v4.0)
├── version: "4.0"
├── lastUpdated: ISO timestamp
│
├── languages: [                          # Supported languages
│   { id: 1, name: "Cebuano", trigraph: "ceb" },
│   { id: 2, name: "English", trigraph: "eng" },
│   { id: 3, name: "Maranao", trigraph: "mrw" },
│   { id: 4, name: "Sinama", trigraph: "sin" }
│   ]
│
├── images: {                             # SHARED image index (by cardNum)
│   "1": {
│       "png": "assets/1.Asa.Where.png",
│       "webp": "assets/1.Asa.Where.webp",
│       "gif": "assets/1.Asa.Where.gif"   # Optional animation
│   },
│   "2": { ... }
│   }
│
├── cards: {                              # PER-LANGUAGE card arrays
│   "ceb": [ ...card objects... ],
│   "mrw": [ ...card objects... ],
│   "sin": [ ...card objects... ]
│   }
│
├── lessonMeta: {                         # PER-LANGUAGE lesson metadata
│   "ceb": {
│       "1": { type: "regular" },
│       "4": { type: "review", reviewsLessons: [1, 2, 3] }
│   }
│   }
│
├── sentences: {                          # PER-LANGUAGE sentence data
│   "ceb": {
│       "pool": [ ...sentence objects... ],
│       "reviewZone": { lessons: {...} },
│       "conversationZone": { conversations: [...] },
│       "storyZone": { stories: [...] }
│   }
│   }
│
└── stats: {                              # Aggregated statistics
        totalCards, cardsWithAudio, totalImages,
        languageStats: { ceb: {...}, mrw: {...} }
    }
```

### Card Object Structure (v4.0)

```javascript
{
    cardNum: 17,                    // PRIMARY KEY - unique across all languages
    lesson: 2,                      // Lesson number
    type: "N",                      // N=New, R=Review

    // Core vocabulary
    word: "tilaw",                  // Target language word
    english: "taste",               // English translation
    cebuano: "tilaw",               // Cebuano translation (for mrw/sin)

    // Notes (optional)
    wordNote: "",
    englishNote: "",
    cebuanoNote: "",

    // Acceptable answers for quizzes
    acceptableAnswers: ["tilaw", "mag-tilaw"],
    englishAcceptable: ["taste", "to taste"],

    // Classification
    grammar: "Verb",
    category: "Action",
    subCategory1: "",
    subCategory2: "",
    actflEst: "Novice",

    // Media references
    audio: ["assets/17.ceb.tilaw.m4a"],  // Array for multi-variant
    hasAudio: true,
    printImagePath: "assets/17.tilaw.taste.png",
    hasGif: true,
    gifPath: "assets/17.tilaw.taste.gif"
}
```

### Key Design Principles

1. **Shared Images, Per-Language Cards**: Images are indexed by `cardNum` in `manifest.images`, while cards are stored per-language in `manifest.cards[trigraph]`.

2. **cardNum as Primary Key**: `cardNum` links cards across languages and to shared images.

3. **Audio is Language-Specific**: Each card stores its own audio path(s) since pronunciation differs per language.

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────────────────┐    │
│  │ Language Select │    │ Lesson Select  │    │ Advanced Filter Manager    │    │
│  └───────┬────────┘    └───────┬────────┘    └─────────────┬──────────────┘    │
│          │                     │                           │                    │
│          └─────────────────────┴───────────────────────────┘                    │
│                                │                                                │
│                                ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         ASSET MANAGER                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │ • loadManifest() - Fetches manifest.json with cache busting     │    │   │
│  │  │ • setLanguage(trigraph) - Loads cards.ceb/mrw/sin               │    │   │
│  │  │ • setLesson(num) - Sets current lesson filter                   │    │   │
│  │  │ • getCards(filters) - Returns enriched, filtered cards          │    │   │
│  │  │ • enrichCard(card) - Adds imagePath, audioPath, normalizes data │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                          │   │
│  │  State: currentLanguage, currentLesson, cards[], lessons[]              │   │
│  └──────────────────────────────────────────────────────────────────────┬──┘   │
│                                                                          │      │
└──────────────────────────────────────────────────────────────────────────┼──────┘
                                                                           │
                         ┌─────────────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────────────────────────────────────────┐
    │                          LEARNING MODULES                                   │
    │                                                                             │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
    │  │ Flashcards   │ │ Match        │ │ MatchSound   │ │ UnsaNiQuiz   │       │
    │  │              │ │ Exercise     │ │              │ │              │       │
    │  │ cards =      │ │ cards =      │ │ cards =      │ │ cards =      │       │
    │  │ assets.      │ │ assets.      │ │ assets.      │ │ assets.      │       │
    │  │ getCards()   │ │ getCards()   │ │ getCards()   │ │ getCards()   │       │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
    │                                                                             │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
    │  │ Sentence     │ │ Conversation │ │ Picture      │ │ Sentence     │       │
    │  │ Review       │ │ Practice     │ │ Story        │ │ Builder      │       │
    │  │              │ │              │ │              │ │              │       │
    │  │ Uses         │ │ Uses         │ │ Uses         │ │ Uses         │       │
    │  │ SentencePool │ │ SentencePool │ │ SentencePool │ │ SentencePool │       │
    │  │ Manager      │ │ Manager      │ │ Manager      │ │ Manager      │       │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
    │                                                                             │
    └────────────────────────────────────────────────────────────────────────────┘



    ┌────────────────────────────────────────────────────────────────────────────┐
    │                          AUTHORING LAYER                                    │
    │                                                                             │
    │  ┌─────────────────────────────────────────────────────────────────────┐   │
    │  │                      DECK BUILDER MODULE                             │   │
    │  │                                                                      │   │
    │  │  Editing State:                                                      │   │
    │  │  ├── allCards[] - All cards for current language                     │   │
    │  │  ├── editedCards (Map) - Modified cards keyed by cardNum            │   │
    │  │  ├── deletedCards (Set) - Deleted cardNums                          │   │
    │  │  ├── newCards[] - Newly created cards                               │   │
    │  │  └── lessonMetaEdited (bool) - Lesson metadata changed              │   │
    │  │                                                                      │   │
    │  │  Features:                                                           │   │
    │  │  ├── CSV Import (Language List, Word Lists per language)            │   │
    │  │  ├── Media Upload (images, audio, video)                            │   │
    │  │  ├── Audio Recording (in-browser)                                   │   │
    │  │  ├── Lesson Management (regular + review lessons)                   │   │
    │  │  └── Sentence Zone Builders                                         │   │
    │  └─────────────────────────────────────────────────────────────────────┘   │
    │                                │                                            │
    │                                │ Save Changes                               │
    │                                ▼                                            │
    │  ┌─────────────────────────────────────────────────────────────────────┐   │
    │  │                      save-deck.php                                   │   │
    │  │                                                                      │   │
    │  │  POST: { trigraph, cards[], lessonMeta?, sentences? }               │   │
    │  │                                                                      │   │
    │  │  Actions:                                                            │   │
    │  │  1. Load existing manifest.json                                      │   │
    │  │  2. manifest.cards[trigraph] = cards                                 │   │
    │  │  3. Regenerate manifest.images from card paths                       │   │
    │  │  4. Update manifest.lessonMeta[trigraph]                            │   │
    │  │  5. Update manifest.sentences[trigraph] if provided                 │   │
    │  │  6. Update manifest.stats                                           │   │
    │  │  7. Write manifest.json                                             │   │
    │  └─────────────────────────────────────────────────────────────────────┘   │
    │                                │                                            │
    │                                ▼                                            │
    │                       manifest.json updated                                 │
    │                                │                                            │
    │                                ▼                                            │
    │                   Frontend reloads with new version                         │
    │                                                                             │
    └────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. AssetManager: The Data Gateway

**File:** `app.js` (lines 867-1250)

### Responsibilities

1. **Manifest Loading**
   ```javascript
   async loadManifest() {
       const version = window.MANIFEST_VERSION || new Date().getTime();
       const response = await fetch(`assets/manifest.json?v=${version}`);
       this.manifest = await response.json();
   }
   ```

2. **Language Switching**
   ```javascript
   setLanguage(trigraph) {
       // v4.0: Load cards for this language
       this.cards = this.manifest.cards[trigraph] || [];

       // Get lessons from languageStats or extract from cards
       this.lessons = this.manifest.stats.languageStats[trigraph].lessons;
   }
   ```

3. **Card Retrieval with Filtering**
   ```javascript
   getCards(filters = {}) {
       let filtered = [...this.cards];

       // Check for advanced filter
       if (filterManager.isActive()) {
           filtered = filterManager.getFilteredCards(this.cards);
       } else {
           // Normal lesson filtering
           filtered = filtered.filter(card => card.lesson === this.currentLesson);
       }

       // Handle review lessons (expand to multiple lessons)
       if (lessonMeta.type === 'review') {
           filtered = filtered.filter(card =>
               lessonMeta.reviewsLessons.includes(card.lesson));
       }

       return filtered.map(card => this.enrichCard(card));
   }
   ```

4. **Card Enrichment** (adds computed properties for modules)
   ```javascript
   enrichCard(card) {
       // Get image path with format detection
       const availableFormats = this.manifest.images[card.cardNum];
       const imagePath = browserCapabilityDetector.getPreferredImageFormat(availableFormats);

       return {
           ...card,
           imagePath: imagePath,           // Selected image format
           isVideo: format === 'mp4',      // True if video file
           audioPath: card.audio || [],    // Normalized to array
           acceptableAnswers: [...],       // Parsed from word
           englishAcceptable: [...],       // Parsed from english
           allTranslations: {...}          // For module compatibility
       };
   }
   ```

---

## 4. Learning Modules: Data Consumers

### Base Class Pattern

All learning modules extend `LearningModule`:

```javascript
class LearningModule {
    constructor(assetManager) {
        this.assets = assetManager;  // Reference to AssetManager
        this.container = document.getElementById('moduleContainer');
    }

    async render() {}   // Build HTML structure
    async init() {}     // Initialize data and events
    start(mode) {}      // Begin activity
    reset() {}          // Reset state
    destroy() {}        // Cleanup
}
```

### Module Data Access Pattern

```javascript
class FlashcardsModule extends LearningModule {
    async init() {
        // All modules follow this pattern:
        this.cards = this.assets.getCards();

        // Cards are enriched with:
        // - card.word (target language)
        // - card.english
        // - card.imagePath (pre-selected based on browser capability)
        // - card.audioPath[] (array of audio file paths)
        // - card.isVideo (true for mp4/webm)
    }
}
```

### Module Data Dependencies

| Module | Data Source | Key Properties Used |
|--------|-------------|---------------------|
| FlashcardsModule | `assets.getCards()` | word, english, imagePath, audioPath, isVideo |
| MatchExerciseModule | `assets.getCards()` | imagePath, word, english |
| MatchSoundModule | `assets.getCards()` | audioPath, word, english |
| UnsaNiQuizModule | `assets.getCards()` | imagePath, acceptableAnswers, englishAcceptable |
| SentenceReviewModule | `SentencePoolManager` | sentence.words[].cardNum → imagePath |
| ConversationPracticeModule | `SentencePoolManager` | conversationZone.pairs |
| PictureStoryModule | `SentencePoolManager` | storyZone.stories[].sentenceNums |
| SentenceBuilderModule | `SentencePoolManager` | sentence.words[] |
| VoicePracticeModule | `assets.getCards()` | word, audioPath (for comparison) |
| PDFPrintModule | `assets.getCards()` | All properties (for print layout) |

---

## 5. Sentence Data System

### Sentence Pool Structure

```javascript
manifest.sentences.ceb = {
    pool: [
        {
            sentenceNum: 1,           // Unique sentence ID
            text: "Asa ang libro?",   // Target language
            english: "Where is the book?",
            cebuano: null,            // For mrw/sin languages
            type: "Question",
            words: [
                {
                    word: "Asa",
                    root: "asa",
                    cardNum: 1,       // Links to card/image
                    imagePath: "assets/1.Asa.Where.png",
                    needsResolution: false
                },
                { word: "ang", root: null, cardNum: null },
                { word: "libro", root: "libro", cardNum: 56 }
            ]
        }
    ],

    reviewZone: {
        lessons: {
            "1": {
                title: "Lesson 1 Sentences",
                sequences: [
                    { id: 1, title: "Greetings", sentenceNums: [1, 2, 3] }
                ]
            }
        }
    },

    conversationZone: {
        conversations: [
            {
                id: 1,
                title: "At the Market",
                lesson: 3,
                pairs: [
                    { questionNum: 5, answerNum: 6 },
                    { questionNum: 7, answerNum: 8 }
                ]
            }
        ]
    },

    storyZone: {
        stories: [
            {
                id: 1,
                title: "My Day",
                lesson: 4,
                sentenceNums: [10, 11, 12, 13, 14]
            }
        ]
    }
}
```

### Sentence-to-Card Linking

```
Sentence → words[].cardNum → manifest.images[cardNum] → Image File
                           → manifest.cards[trigraph].find(c => c.cardNum) → Audio
```

---

## 6. DeckBuilder: The Authoring Interface

**File:** `deck-builder-module.js`

### State Management

```javascript
class DeckBuilderModule extends LearningModule {
    constructor(assetManager) {
        this.currentTrigraph = 'ceb';    // Active language
        this.allCards = [];               // All cards for language
        this.filteredCards = [];          // Display-filtered cards

        // Change tracking
        this.editedCards = new Map();     // cardNum → modified card
        this.deletedCards = new Set();    // cardNums to delete
        this.newCards = [];               // New cards to add
        this.lessonMetaEdited = false;    // Lesson changes flag
    }
}
```

### Edit → Save Flow

```
1. User edits card in table
   ↓
2. this.editedCards.set(cardNum, modifiedCard)
   ↓
3. this.updateUnsavedIndicator()  // Shows "Save" button
   ↓
4. User clicks "Save Changes"
   ↓
5. Merge: allCards + editedCards - deletedCards + newCards
   ↓
6. POST to save-deck.php:
   {
       trigraph: "ceb",
       cards: [...mergedCards],
       lessonMeta: {...},       // If changed
       sentences: {...}         // If sentence builders used
   }
   ↓
7. PHP updates manifest.json
   ↓
8. Frontend: assetManager.loadManifest() with new version
   ↓
9. All modules see updated data on next getCards()
```

### Role-Based Access

| Role | Cards | Tool Sections | Languages |
|------|-------|---------------|-----------|
| admin | Full CRUD | All | All |
| deck-manager | Full CRUD | All | All |
| editor | Full CRUD | None | Restricted |
| voice-recorder | Audio only | None | Restricted |

---

## 7. Cache Management

### Cache Busting Strategy

```php
// index.php - Server-side version injection
$manifestPath = 'assets/manifest.json';
$version = file_exists($manifestPath) ? filemtime($manifestPath) : time();
echo "<script>window.MANIFEST_VERSION = '$version';</script>";
```

```javascript
// app.js - Client-side fetch with version
const response = await fetch(`assets/manifest.json?v=${MANIFEST_VERSION}`);
```

### When Cache Invalidates

1. `save-deck.php` writes manifest.json → file mtime changes
2. Next page load gets new `MANIFEST_VERSION` from PHP
3. Browser fetches fresh manifest due to different URL parameter

---

## 8. Complete Data Reference Chain

```
User Action: Select Language "Cebuano", Lesson 2, Open Flashcards
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ AssetManager.setLanguage('ceb')                                 │
│ ├── this.cards = manifest.cards.ceb (all Cebuano cards)        │
│ └── this.lessons = [1, 2, 3, 4, 5, ...]                        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ AssetManager.setLesson(2)                                       │
│ └── this.currentLesson = 2                                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ FlashcardsModule.init()                                         │
│ └── this.cards = this.assets.getCards()                         │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ AssetManager.getCards()                                         │
│ ├── Filter: card.lesson === 2                                   │
│ ├── Map: enrichCard(card) for each                              │
│ │   ├── Get formats: manifest.images[card.cardNum]              │
│ │   ├── Select: browserCapability.getPreferredImageFormat()     │
│ │   ├── Add: imagePath, isVideo, audioPath[], acceptableAnswers │
│ │   └── Return: enriched card                                   │
│ └── Return: [enrichedCard1, enrichedCard2, ...]                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ FlashcardsModule.renderPage()                                   │
│ ├── for (card of this.cards)                                    │
│ │   ├── img.src = card.imagePath                                │
│ │   ├── audio.src = card.audioPath[0]                           │
│ │   └── Display: card.word, card.english                        │
│ └── Render to DOM                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Purpose | Data Flow Direction |
|-----------|---------|---------------------|
| manifest.json | Central data store | Read by all, written by DeckBuilder |
| AssetManager | Data gateway + state | Loads manifest, provides filtered cards to modules |
| DeckBuilder | Authoring interface | Modifies cards, saves to manifest via PHP |
| Learning Modules | Data consumers | Read enriched cards from AssetManager |
| SentencePoolManager | Sentence data access | Read/write sentence pool in manifest |
| save-deck.php | Persistence layer | Merges changes into manifest.json |
| BrowserCapabilityDetector | Format selection | Determines WebP/PNG, WebM/MP4 preference |

The architecture follows a **single source of truth** pattern where manifest.json is the authoritative data store, AssetManager is the data access layer with enrichment, and all modules consume data through this consistent interface.
