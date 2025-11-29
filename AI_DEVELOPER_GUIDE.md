# WSOL - AI Developer Guide
## Bob and Mariel Ward School of Filipino Languages - Learning Platform
### Version 4.3 - November 2025

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Architecture Overview](#architecture-overview)
5. [Core Modules Reference](#core-modules-reference)
6. [Data Structures](#data-structures)
7. [Authentication System](#authentication-system)
8. [Backend API Reference](#backend-api-reference)
9. [Frontend Module Development](#frontend-module-development)
10. [Asset Management](#asset-management)
11. [Naming Conventions](#naming-conventions)
12. [Common Development Tasks](#common-development-tasks)

---

## Project Overview

WSOL is a comprehensive language learning platform designed for teaching Filipino languages (Cebuano, Maranao, Sinama) to English speakers. It provides:

- **Flashcard-based vocabulary learning** with picture/audio support
- **Interactive exercises**: Picture Match, Audio Match, Quiz (Unsa Ni?)
- **Sentence building** tools for grammar practice
- **Grammar lesson viewer** from uploaded HTML files
- **PDF generation** for printable flashcards and worksheets
- **Voice practice** with pronunciation comparison
- **Admin tools** for content management
- **Multi-language support** with per-language card data
- **Role-based access control** (Admin, Deck Manager, Editor, Voice Recorder)

### Primary Users
- Students learning Filipino languages
- Teachers managing course content
- Administrators managing users and assets

---

## Technology Stack

### Frontend
- **Pure JavaScript** (ES6+) - No framework dependency
- **Class-based module architecture** extending `LearningModule` base class
- **CSS3** with CSS custom properties (variables) for theming
- **SortableJS** - Drag and drop functionality
- **jsPDF** - PDF generation
- **Driver.js** - Guided tours/onboarding
- **Meyda.js** - Audio analysis for voice practice

### Backend
- **PHP 7+** - Server-side processing
- **JSON files** - Data storage (no traditional database)
- **Session-based authentication** with role management

### Key External Libraries
```html
<!-- CDN Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<!-- Vendor (local) -->
assets/vendor/driver.js - Tour system
assets/vendor/meyda.min.js - Audio analysis
```

---

## Repository Structure

```
WSOL/
├── index.php                    # Main entry point (HTML template)
├── app.js                       # Core application (72KB)
│                                # - Global managers (Asset, Theme, Toast, etc.)
│                                # - Base LearningModule class
│                                # - Router, FilterManager, DeviceDetector
│                                # - Initialization logic
│
├── auth-manager.js              # Client-side authentication
├── auth.php                     # Server-side auth endpoints
├── users.json                   # User database
├── users.php                    # User CRUD API (admin only)
├── config.php                   # Server configuration & passwords
│
├── # LEARNING MODULES (Frontend)
├── flashcards-module.js         # Flashcard viewer with flip animation
├── match-module.js              # Picture-to-word matching game
├── match-sound-module.js        # Audio-to-word matching game
├── quiz-module.js               # "Unsa Ni?" fill-in quiz
├── sentence-builder-module.js   # Build sentences with word cards
├── sentence-review-module.js    # Review predefined sentences
├── conversation-practice-module.js # Q&A dialogue practice (NEW)
├── picture-story-module.js      # Story sequence ordering (NEW)
├── sentence-review-builder.js   # Editor for sentence review data
├── grammar-module.js            # Grammar lesson HTML viewer
├── teacher-guide-module.js      # Teacher guide HTML viewer
├── pdf-module.js                # PDF flashcard/worksheet generator
├── voice-practice-module.js     # Pronunciation practice (128KB)
│
├── # ADMIN MODULES
├── admin-module.js              # Admin panel & asset scanner UI
├── deck-builder-module.js       # Main deck editor (176KB)
├── deck-builder-audio.js        # Audio recording/upload features
├── deck-builder-uploads.js      # Media upload handling
├── card-sentence-sync.js        # Card-sentence synchronization manager
│
├── # BACKEND API
├── scan-assets.php              # Asset scanner & manifest generator (78KB)
├── save-deck.php                # Save card changes to manifest
├── upload-audio.php             # Audio file upload handler
├── upload-media.php             # Image/video upload handler
├── list-assets.php              # List available assets
├── rename-asset.php             # Rename asset files
│
├── # TOUR SYSTEM
├── tour-guide.js                # Tour orchestration
├── tour-config.json             # Tour step definitions
├── tour-editor/                 # Visual tour editor (admin tool)
│   ├── tour-editor-app.js
│   ├── components/
│   └── services/
│
├── # VOICE ANALYSIS (Standalone)
├── voice/
│   ├── voice.html               # Standalone pronunciation analyzer
│   ├── js/
│   │   ├── main.js              # Application entry
│   │   ├── modules/
│   │   │   ├── visualizer.js    # Waveform/spectrum display
│   │   │   ├── scoring.js       # Pronunciation comparison
│   │   │   ├── pitch.js         # Pitch detection
│   │   │   ├── mfcc.js          # MFCC feature extraction
│   │   │   ├── dtw.js           # Dynamic time warping
│   │   │   ├── fft.js           # FFT analysis
│   │   │   ├── intensity.js     # Volume analysis
│   │   │   ├── waveform.js      # Waveform processing
│   │   │   └── ai-api.js        # AI integration
│   │   └── utils/
│   └── css/
│
├── # VOICE RECORDER (Standalone)
├── rec/
│   ├── voice-recorder-app.js    # Standalone recorder for voice actors
│   └── voice-recorder.css
│
├── # TTS GENERATOR (ElevenLabs)
├── TTS/
│   ├── index.html               # TTS generation interface
│   ├── generate.php             # API handler for ElevenLabs
│   └── status.php               # System status check
│
├── # BUG TRACKER
├── bugs/
│   ├── index.html               # Kanban board UI
│   ├── bugs-api.php             # CRUD API endpoints
│   ├── bugs.json                # Bug data storage
│   ├── bugs-archive.json        # Archived bugs
│   └── auth-check.php           # Admin authentication
│
├── # STYLES
├── styles/
│   ├── core.css                 # Base styles & CSS variables
│   ├── theme.css                # Light/dark theme definitions
│   └── modules/                 # Per-module CSS
│       ├── flashcards.css
│       ├── match.css
│       ├── quiz.css
│       └── ...
│
├── # ASSETS
├── assets/
│   ├── manifest.json            # Central card/asset database (624KB)
│   ├── scan-report.html         # Generated scan report
│   ├── Language_List.csv        # Language definitions
│   ├── Word_List_*.csv          # Per-language vocabulary
│   ├── Sentence_Words_*.csv     # Sentence builder word pools
│   ├── *.png, *.webp            # Card images
│   ├── *.m4a, *.mp3             # Audio pronunciations
│   ├── *.gif, *.webm, *.mp4     # Animated cards
│   ├── grammar/                 # HTML grammar lessons
│   │   ├── ceb/                 # Per-language
│   │   ├── mrw/
│   │   └── sin/
│   ├── teacher-guide/           # HTML teacher guides
│   └── vendor/                  # Third-party libraries
│
└── sentences/                   # Sentence review data (JSON files)
```

---

## Architecture Overview

### Frontend Architecture

The application uses a **single-page application (SPA)** pattern with hash-based routing:

```
┌─────────────────────────────────────────────────────────────┐
│                        index.php                             │
│  (HTML template with nav tabs and module container)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          app.js                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Router    │  │AssetManager │  │ AuthManager │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ThemeManager │  │ToastManager │  │FilterManager│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │DebugLogger  │  │DeviceDetect │  │BrowserCapabilityDet │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              LearningModule (Base Class)               │  │
│  │  render() → init() → destroy()                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────┐                         ┌───────────────┐
│FlashcardsModule│                         │MatchModule    │
│QuizModule      │  ... (all extend        │AdminModule    │
│PDFPrintModule  │      LearningModule)    │DeckBuilder    │
└───────────────┘                         └───────────────┘
```

### Module Lifecycle

Every learning module follows this lifecycle:

```javascript
class MyModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.assets = assetManager;  // Access to cards, languages, lessons
    }

    async render() {
        // 1. Render HTML structure to this.container
        this.container.innerHTML = `<div>...</div>`;
    }

    async init() {
        // 2. Initialize state, attach event listeners
        // 3. Load data via this.assets.getCards()
    }

    destroy() {
        // 4. Cleanup (base class handles container clearing)
        super.destroy();
    }
}
```

### Data Flow

```
CSV Files ──► scan-assets.php ──► manifest.json ──► AssetManager ──► Modules
                    │
                    ▼
           scan-report.html (diagnostic)
```

---

## Core Modules Reference

### Global Managers (app.js)

| Manager | Purpose |
|---------|---------|
| `assetManager` | Loads manifest, provides card data, handles language/lesson selection |
| `authManager` | Handles login/logout, role checking, session management |
| `router` | Hash-based navigation between modules |
| `themeManager` | Light/dark mode switching |
| `toastManager` | Toast notification display |
| `filterManager` | Advanced card filtering (by grammar, category, ACTFL level) |
| `debugLogger` | Console and on-screen debug logging |
| `deviceDetector` | Mobile/tablet/desktop detection |
| `browserCapabilityDetector` | WebP, WebM, MP4 support detection |
| `instructionManager` | First-visit instruction popups |

### Learning Modules

| Module | File | Description |
|--------|------|-------------|
| `FlashcardsModule` | flashcards-module.js | Flip cards with image front, word/translation back |
| `MatchExerciseModule` | match-module.js | Match pictures to words (visual) |
| `MatchSoundModule` | match-sound-module.js | Match audio to words (listening) |
| `UnsaNiQuizModule` | quiz-module.js | Type-the-word quiz from picture |
| `SentenceBuilderModule` | sentence-builder-module.js | Build sentences by selecting word cards |
| `SentenceReviewModule` | sentence-review-module.js | Practice predefined sentences with visual word-picture connections |
| `GrammarModule` | grammar-module.js | Display grammar HTML lessons |
| `TeacherGuideModule` | teacher-guide-module.js | Display teacher guide HTML |
| `PDFPrintModule` | pdf-module.js | Generate printable flashcards/worksheets |
| `DeckBuilderModule` | deck-builder-module.js | Edit cards, upload CSVs, manage assets |
| `CardSentenceSyncManager` | card-sentence-sync.js | Detect card changes affecting sentence data |
| `AdminModule` | admin-module.js | Scan assets, manage users, system config |

---

## Data Structures

### manifest.json (v4.0 Format)

The manifest is the central database for all card data:

```json
{
    "version": "4.0",
    "lastUpdated": "2025-11-26T04:08:14-08:00",

    "languages": [
        { "id": 1, "name": "Cebuano", "trigraph": "ceb" },
        { "id": 2, "name": "English", "trigraph": "eng" },
        { "id": 3, "name": "Maranao", "trigraph": "mrw" },
        { "id": 4, "name": "Sinama", "trigraph": "sin" }
    ],

    "images": {
        "1": {
            "png": "assets/1.Asa.Where.png",
            "webp": "assets/1.Asa.Where.webp"
        },
        "2": {
            "png": "assets/2.Unsa.What.png",
            "gif": "assets/2.unsa.what.gif",
            "webm": "assets/2.unsa.what.webm"
        }
    },

    "cards": {
        "ceb": [
            {
                "cardNum": 1,
                "lesson": 1,
                "word": "Asa",
                "wordNote": "",
                "english": "Where",
                "englishNote": "",
                "cebuano": "",
                "cebuanoNote": "",
                "type": "N",
                "grammar": "Question Word",
                "category": "Questions",
                "subCategory1": "",
                "subCategory2": "",
                "actflEst": "Novice",
                "hasImage": true,
                "hasGif": false,
                "hasAudio": true,
                "printImagePath": "assets/1.Asa.Where.png",
                "gifPath": null,
                "audio": "assets/1.ceb.asa.m4a"
            }
        ],
        "mrw": [ /* Maranao cards */ ],
        "sin": [ /* Sinama cards */ ]
    },

    "lessonMeta": {
        "ceb": {
            "5": {
                "type": "review",
                "reviewsLessons": [1, 2, 3, 4]
            }
        }
    },

    "sentenceWords": {
        "ceb": {
            "1": {
                "Question Word": [
                    { "word": "Asa", "cardNum": 45 },
                    { "word": "Unsa", "cardNum": 46 },
                    { "word": "Kinsa", "cardNum": null }
                ],
                "Noun": ["libro", "lamesa", "silya"],
                "Verb": ["kuha", "butang", "sulat"]
            }
        }
    },
    // Note: sentenceWords entries can be:
    // - Simple strings: "word" (legacy format, auto-linked at runtime)
    // - Objects: { "word": "text", "cardNum": 123 } (explicit card link)
    // cardNum can be null for unlinked words

    "sentenceReview": {
        "ceb": {
            "1": [
                {
                    "sequenceTitle": "Finding the Book",
                    "sentences": [
                        {
                            "words": ["Asa", "ang", "libro"],
                            "english": "Where is the book?",
                            "type": "question"
                        }
                    ]
                }
            ]
        }
    },

    "grammar": {
        "ceb": {
            "1": "lesson-1.html",
            "2": "lesson-2.html"
        }
    },

    "teacherGuide": {
        "ceb": {
            "1": "lesson-1.html"
        }
    },

    "stats": {
        "totalCards": 500,
        "cardsWithAudio": 450,
        "totalImages": 500,
        "languageStats": {
            "ceb": {
                "totalCards": 200,
                "cardsWithAudio": 190,
                "lessons": [1, 2, 3, 4, 5]
            }
        }
    }
}
```

### Card Object (Enriched)

When accessed via `assetManager.getCards()`, cards are enriched with additional properties:

```javascript
{
    // Original properties from manifest
    cardNum: 1,
    lesson: 1,
    word: "Asa",
    english: "Where",

    // Enriched by AssetManager.enrichCard()
    acceptableAnswers: ["Asa"],           // Array for multi-variant words
    englishAcceptable: ["Where"],
    cebuanoAcceptable: [],
    audioPath: ["assets/1.ceb.asa.m4a"],  // Always array (multi-audio support)
    imagePath: "assets/1.Asa.Where.webp", // Best format for browser
    isVideo: false,                        // true if imagePath is mp4/webm
    allTranslations: {
        cebuano: { word: "Asa", note: "", acceptableAnswers: ["Asa"] },
        english: { word: "Where", note: "", acceptableAnswers: ["Where"] }
    }
}
```

### users.json

```json
{
    "users": [
        {
            "id": 1,
            "username": "admin",
            "password": "WSOL10:15",
            "role": "admin",
            "language": null,
            "created": "2025-01-01T00:00:00Z",
            "lastModified": "2025-01-01T00:00:00Z"
        },
        {
            "id": 3,
            "username": "editor-ceb",
            "password": "edit123",
            "role": "editor",
            "language": "ceb",
            "created": "2025-01-01T00:00:00Z"
        }
    ],
    "nextId": 9
}
```

---

## Authentication System

### Roles Hierarchy

```
admin           - Full access to everything
    └── deck-manager  - Full deck builder, no admin panel
        └── editor        - Card table CRUD only, language-restricted
            └── voice-recorder - Read-only table, can only record audio
```

### Permission Checking (Client-side)

```javascript
// In any module
const canEdit = window.authManager?.hasPermission('edit');
const isAdmin = window.authManager?.isAdmin();
const restrictedLang = window.authManager?.getLanguageRestriction();

// Available actions:
// view, filter, audio-upload, audio-record, audio-select,
// edit, create, delete, save, export,
// csv-tools, media-tools, sentence-tools, grammar-tools
```

### Authentication Flow

```
1. User clicks Login → shows loginModal
2. User selects username, enters password
3. POST to auth.php?action=login with FormData
4. PHP validates against users.json or config.php fallback
5. Success: Sets session variables, returns role/language
6. Client updates UI based on role
```

---

## Backend API Reference

### scan-assets.php

Main asset management endpoint.

| Action | Method | Description |
|--------|--------|-------------|
| `?action=scan` | GET | Scan assets folder, rebuild manifest.json |
| `?action=upload` | POST | Upload CSV files (Language_List, Word_List) |
| `?action=uploadMedia` | POST | Upload image/audio files |
| `?action=uploadSentenceWords` | POST | Upload Sentence Words CSVs |
| `?action=uploadGrammar` | POST | Upload grammar HTML files |
| `?action=uploadTeacherGuide` | POST | Upload teacher guide HTML |

### save-deck.php

Save card changes directly to manifest.json.

```javascript
// POST JSON body:
{
    "trigraph": "ceb",           // Language code
    "cards": [...],              // Full card array for language
    "lessonMeta": {...},         // Optional: lesson metadata
    "sentenceReview": {...}      // Optional: sentence review data
}
```

### auth.php

| Action | Method | Description |
|--------|--------|-------------|
| `?action=login` | POST | Authenticate user |
| `?action=logout` | GET | End session |
| `?action=check` | GET | Validate current session |
| `?action=setTimeout` | POST | Update session timeout |
| `?action=listUsers` | GET | Get user list (no passwords) |

### users.php (Admin only)

| Action | Method | Description |
|--------|--------|-------------|
| `?action=list` | GET | List all users |
| `?action=add` | POST | Create user |
| `?action=edit` | POST | Update user |
| `?action=delete` | POST | Delete user |

### bugs/bugs-api.php (Admin only)

Bug tracker CRUD API with kanban board support.

| Action | Method | Description |
|--------|--------|-------------|
| `?action=list` | GET | List all bugs with statuses, priorities, severities |
| `?action=get&id=BUG-001` | GET | Get single bug by ID |
| `?action=create` | POST | Create new bug |
| `?action=update` | POST | Update existing bug |
| `?action=delete` | POST | Archive bug (soft delete) |
| `?action=comment` | POST | Add comment to bug |
| `?action=move` | POST | Change bug status (drag-drop) |
| `?action=export` | GET | Export bugs to CSV |
| `?action=stats` | GET | Get bug statistics |
| `?action=check-auth` | GET | Check authentication status |

```javascript
// POST body for create/update:
{
    "id": "BUG-001",           // Required for update
    "title": "Bug title",      // Required
    "description": "Details",
    "status": "reported",      // reported|confirmed|in-progress|testing|resolved|closed|wont-fix
    "priority": "medium",      // critical|high|medium|low
    "severity": "minor",       // blocker|major|minor|trivial
    "module": "flashcards-module.js",
    "assignee": "username",
    "tags": ["ui", "audio"]
}
```

---

## Frontend Module Development

### Creating a New Module

1. Create the module file:

```javascript
// my-module.js
class MyModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.state = {};
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lesson = this.assets.currentLesson || 'Lesson';

        this.container.innerHTML = `
            <div class="module-my-module">
                <h1>My Module (${langName}: Lesson ${lesson})</h1>
                <div class="controls">
                    <button id="startBtn" class="btn btn-primary">Start</button>
                </div>
                <div id="contentArea"></div>
            </div>
        `;
    }

    async init() {
        // Check prerequisites
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showEmptyState('Please select a language and lesson.');
            return;
        }

        // Get cards for current lesson
        this.cards = this.assets.getCards();

        if (this.cards.length === 0) {
            this.showEmptyState('No cards available for this lesson.');
            return;
        }

        // Setup event listeners
        document.getElementById('startBtn').addEventListener('click', () => this.start());

        // Show instructions (optional)
        instructionManager?.show('my-module', 'My Module', 'Instructions here...');
    }

    start() {
        // Module logic
    }

    showEmptyState(message) {
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}
```

2. Create CSS (styles/modules/my-module.css):

```css
.module-my-module {
    padding: var(--spacing-base);
}

.module-my-module h1 {
    margin-bottom: var(--spacing-large);
}
```

3. Register in index.php:

```html
<!-- Add CSS -->
<link rel="stylesheet" href="styles/modules/my-module.css?v=<?php echo cacheBust('styles/modules/my-module.css'); ?>">

<!-- Add script -->
<script src="my-module.js?v=<?php echo cacheBust('my-module.js'); ?>"></script>

<!-- Add nav tab -->
<button class="nav-tab" data-module="my-module">
    <i class="fas fa-star"></i>
    My Module
</button>
```

4. Register in app.js init():

```javascript
if (typeof MyModule !== 'undefined') {
    router.register('my-module', MyModule);
}
```

### Working with Cards

```javascript
// Get all cards for current lesson
const cards = this.assets.getCards();

// Get cards with specific filters
const cardsWithAudio = this.assets.getCards({ hasAudio: true });
const cardsWithImages = this.assets.getCards({ hasImage: true });
const verbCards = this.assets.getCards({ type: 'V' });

// Access card properties
cards.forEach(card => {
    // Display properties
    const word = card.word;           // Target language word
    const english = card.english;     // English translation
    const cebuano = card.cebuano;     // Cebuano (for non-Cebuano languages)

    // Media paths
    const image = card.imagePath;     // Best image format for browser
    const audio = card.audioPath;     // Array of audio file paths
    const isVideo = card.isVideo;     // true if image is mp4/webm

    // For answer validation
    const acceptable = card.acceptableAnswers;  // ["word1", "word2"]
});
```

### Playing Audio

```javascript
// Single audio
const audio = new Audio(card.audioPath[0]);
audio.play();

// Multiple audio files (variants)
playAudioSequentially(card.audioPath) {
    let currentIndex = 0;

    const playNext = () => {
        if (currentIndex >= card.audioPath.length) return;

        const audio = new Audio(card.audioPath[currentIndex]);
        audio.onended = () => {
            currentIndex++;
            playNext();
        };
        audio.play();
    };

    playNext();
}
```

### Handling Image/Video

```javascript
if (card.isVideo) {
    const video = document.createElement('video');
    video.src = card.imagePath;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    container.appendChild(video);
} else {
    const img = document.createElement('img');
    img.src = card.imagePath;
    img.alt = `${card.word} - ${card.english}`;
    container.appendChild(img);
}
```

### SentenceReviewModule Methods

The SentenceReviewModule has several key methods for displaying sentence type and visual connections:

```javascript
// Display sentence type banner with color-coded styling
displaySentenceType(sentenceType)
// sentenceType: 'Question' | 'Statement' | 'Command' | 'Answer' | null

// Render word bubbles below picture cards
renderBubbleLayout()
// Creates bubble groups matching card order, with speaker icons for audio

// Create individual word bubble element
createWordBubble(wordData, wordIndex, cardNum, isFunctionWord)
// Returns DOM element for the bubble

// Draw SVG connection lines from cards to bubbles
drawConnectionLines()
// Uses requestAnimationFrame for accurate positioning
```

**Key CSS Classes:**
- `.sr-sentence-type-display` - Sentence type banner (with `.type-question`, `.type-statement`, `.type-command`, `.type-answer`)
- `.sr-bubble-display` - Container for bubbles and connection lines
- `.sr-display-bubbles-row` - Row of word bubbles
- `.sr-bubble-group` - Groups bubbles belonging to same card
- `.sr-display-bubble` - Individual word bubble (`.function-word` variant for function words)
- `.sr-connection-lines` - SVG container for lines
- `.sr-connection-line` - Individual SVG line (`.function-word-line` variant)
- `.sr-english-translation` - English text at bottom

**Data Attributes on Card Elements:**
- `data-card-num` - Card number for connection mapping
- `data-word-indices` - JSON array of word indices belonging to card
- `data-word-index` - Index of individual word
- `data-is-function-word` - True for function word placeholders

### CardSentenceSyncManager Class

Manages synchronization between card deck changes and sentence data. Located in `card-sentence-sync.js`.

**Key Methods:**

```javascript
// Capture card state before save operation
captureSnapshot()
// Returns Map<cardNum, {word, imagePath, variants}>

// Detect which cards changed after save
detectChanges()
// Returns { changedCards: Set, deletedCards: Set, newCards: Set }

// Find sentences linked to changed/deleted cards
findAffectedSentences(changes)
// Returns array of affected sentence references

// Generate full sync report
generateSyncReport()
// Returns report with summary, affected sentences grouped by issue type

// Smart re-parse: only re-evaluate words linked to changed cards
smartReparse(report)
// Returns array of recommendations (action, newCardNum, needsReview, etc.)

// Apply automatic fixes (where needsReview is false)
applyAutoFixes(recommendations)
// Returns { applied: number, needsReview: number }

// Clear snapshot after sync complete
clearSnapshot()
```

**Integration with DeckBuilderModule:**

```javascript
// In saveChanges() - before applying edits:
this.cardSentenceSyncManager.captureSnapshot();

// After successful save:
this.checkSentenceSync(); // Shows warning if affected sentences found
```

**Sync Report Structure:**

```javascript
{
    summary: {
        totalCardsChanged: number,
        totalCardsDeleted: number,
        totalSentencesAffected: number,
        totalWordLinksAffected: number
    },
    byIssueType: {
        deleted: [...],  // Words linked to deleted cards
        changed: [...]   // Words linked to modified cards
    },
    affectedSentences: [
        {
            lessonNum, sequenceIndex, sentenceIndex, wordIndex,
            word, cardNum, issue: 'deleted'|'changed',
            manuallyLinked: boolean
        }
    ]
}
```

**Recommendation Actions:**
- `update_image` - Card still matches, just update image path (auto-apply)
- `no_change` - Card still matches, no action needed (auto-apply)
- `reassign` - Card deleted, replacement found (needs review)
- `suggest_reassign` - Card changed, suggested replacement (needs review)
- `make_function_word` - Card deleted, no replacement (needs review)
- `needs_manual_link` - Card changed, no auto-match (needs review)

---

## Asset Management

### File Naming Conventions

**Images:**
```
{CardNum}.{Word}.{Translation}.{ext}
Example: 17.tilaw.taste.png
         17.tilaw.taste.webp  (WebP variant)
         17.tilaw.taste.gif   (Animated)
         17.tilaw.taste.webm  (Video variant)
```

**Audio:**
```
{CardNum}.{Trigraph}.{Word}.{ext}
Example: 17.ceb.tilaw.m4a
         17.ceb.tilaw-2.m4a   (Variant for multi-word cards)
         17.mrw.timan.m4a     (Maranao version)
```

**Grammar/Teacher Guide:**
```
assets/grammar/{trigraph}/lesson-{num}.html
assets/teacher-guide/{trigraph}/lesson-{num}.html
```

### CSV File Formats

**Language_List.csv:**
```csv
ID,Name,Trigraph
1,Cebuano,ceb
2,English,eng
3,Maranao,mrw
4,Sinama,sin
```

**Word_List_{Language}.csv:**
```csv
Card Num,Lesson,Word,Word Note,English,English Note,Type,Grammar,Category,SubCategory1,SubCategory2,ACTFL Est,Cebuano,Cebuano Note
1,1,Asa,,Where,,N,Question Word,Questions,,,Novice,,
2,1,Unsa,,What,,N,Question Word,Questions,,,Novice,,
```

**Sentence_Words_{trigraph}.csv:**
```csv
Lesson #,Question Word,Noun,Verb,Adjective,Pronoun
1,"Asa, Unsa","libro, lamesa","kuha, sulat","dako, gamay","ako, ikaw"
2,"Kinsa, Pila","balay, kwarto","lingkod, barug","pula, berde","siya, sila"
```

### Browser Format Detection

The app automatically selects optimal formats:

```javascript
// browserCapabilityDetector detects support for:
// - WebP images (preferred over PNG/JPG)
// - WebM video (preferred over GIF/MP4)
// - MP4 video (fallback from WebM)

// Format selection priority:
// Images: webp > png > jpg > jpeg
// Videos: webm > mp4 > gif
```

---

## Naming Conventions

### JavaScript
- **Classes**: PascalCase (`FlashcardsModule`, `AssetManager`)
- **Functions/Methods**: camelCase (`loadCards`, `renderPage`)
- **Variables**: camelCase (`currentIndex`, `filteredCards`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_SESSION_TIMEOUT`)
- **Private methods**: Prefix with underscore optional

### CSS
- **Classes**: kebab-case (`nav-tab`, `module-container`)
- **Modules**: `.module-{name}` (`module-flashcards`, `module-quiz`)
- **BEM-like**: `block-element` (`card-front`, `card-back`)
- **States**: `.active`, `.hidden`, `.disabled`

### PHP
- **Functions**: camelCase (`handleLogin`, `scanAssets`)
- **Constants**: UPPER_SNAKE_CASE (`ADMIN_PASSWORD`, `SESSION_NAME`)

### Files
- **JS Modules**: `{name}-module.js`
- **CSS Modules**: `styles/modules/{name}.css`
- **PHP APIs**: `{action}.php` or `{resource}-{action}.php`

---

## Common Development Tasks

### Adding a New Card Property

1. Update Word_List CSV with new column
2. Modify `scan-assets.php` to read the column
3. Update `save-deck.php` to preserve it
4. Access in modules via `card.propertyName`

### Adding a New Language

1. Add to Language_List.csv
2. Create Word_List_{LanguageName}.csv
3. Rescan assets in Admin panel
4. Optional: Create grammar/teacher-guide HTML files

### Adding a Filter Option

1. Add property to cards in Word_List CSV
2. Update FilterManager in app.js:
   - Add to `this.filters` object
   - Add dropdown in HTML
   - Update `populateFilterOptions()`
   - Update `getMatchingCards()` filter logic

### Modifying the Deck Builder

The Deck Builder is the most complex module. Key areas:

- **Table rendering**: `renderTable()` method
- **Cell editing**: `makeEditable()` and inline handlers
- **Audio management**: `deck-builder-audio.js`
- **File uploads**: `deck-builder-uploads.js`
- **Save changes**: Sends to `save-deck.php`

### Debugging Tips

```javascript
// Enable debug console
localStorage.setItem('debugLevel', '3');

// Check authentication state
console.log(window.authManager);

// Inspect current cards
console.log(assetManager.getCards());

// Force re-render current module
router.navigate(window.location.hash.slice(1));
```

---

## Quick Reference: Key Files to Modify

| Task | Files |
|------|-------|
| Add new module | `{name}-module.js`, `styles/modules/{name}.css`, `index.php`, `app.js` |
| Modify card structure | `scan-assets.php`, `save-deck.php`, `app.js (enrichCard)` |
| Change authentication | `auth-manager.js`, `auth.php`, `users.php` |
| Update styling | `styles/core.css`, `styles/theme.css` |
| Modify tours | `tour-config.json` |
| Add backend endpoint | New PHP file + call from JS |

---

## Security Notes

1. **Passwords** are stored in plaintext in `users.json` and `config.php` - production should use proper hashing
2. **Session-based auth** with configurable timeout
3. **HTTPS enforcement** via `enforceHttps()` in config.php
4. **Role-based access** checked both client and server-side
5. **No SQL** - all data in JSON files (no injection risk)
6. **File uploads** validated by extension only

---

## Performance Considerations

1. **Manifest caching**: Version parameter for cache busting
2. **Image formats**: WebP preferred, automatic fallback
3. **Video formats**: WebM preferred for animations
4. **Object URL cleanup**: `revokeAllUrls()` in AssetManager
5. **Lazy loading**: Cards loaded per-lesson, not all at once
6. **Device detection**: Different card counts for mobile/tablet/desktop

---

## Branding Assets

### Logo

- **Path**: `assets/logo.webp`
- **Format**: WebP (158KB)
- **Usage**: Displayed in header and login modal
- **Reference in CSS**: `.logo-image` class in `styles/core.css`

The logo shows the Bob and Mariel Ward School of Filipino Languages branding. It appears:
- In the main header (44px height)
- In the login modal (larger size)
- Uses CSS `object-fit: contain` for proper scaling

### Colors (Brand)

Primary brand colors are defined in CSS variables:
- `--primary: #4F46E5` (Indigo) - Main accent color
- `--secondary: #10B981` (Green) - Success/positive actions
- `--error: #EF4444` (Red) - Error states
- `--warning: #F59E0B` (Amber) - Warnings

---

*This guide is maintained for AI coding assistants working on the WSOL project. Last updated: November 2025*
