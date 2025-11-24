# AI Codebase Context - Ward School of Filipino Languages

<!--
================================================================================
AI ASSISTANT INSTRUCTIONS
================================================================================
This file is the authoritative reference for AI assistants working on this codebase.

IMPORTANT: When you make changes to ANY file in this project, you MUST update
the relevant sections of this document to reflect those changes. This includes:
- Adding new files to the file inventory
- Updating function descriptions when behavior changes
- Modifying architecture diagrams when structure changes
- Updating version numbers and timestamps

This document should always accurately reflect the current state of the codebase.
================================================================================
-->

**Version:** 4.2
**Last Updated:** 2025-11-24
**Maintained By:** AI assistants should update this file when making codebase changes

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Core Architecture](#core-architecture)
5. [Module System](#module-system)
6. [Data Flow & State Management](#data-flow--state-management)
7. [API Reference](#api-reference)
8. [File Reference](#file-reference)
9. [Common Patterns & Conventions](#common-patterns--conventions)
10. [Development Guidelines](#development-guidelines)
11. [Testing & Debugging](#testing--debugging)
12. [Security Considerations](#security-considerations)

---

## Project Overview

### Purpose
A comprehensive web-based language learning platform for teaching three Philippine languages:
- **Cebuano** (ceb) - Primary language with most content
- **Maranao** (mrw) - Secondary language
- **Sinama** (sin) - Secondary language

### Core Features
1. **Flashcards** - Vocabulary study with flip cards
2. **Picture Matching** - Match images to words
3. **Audio Matching** - Match pronunciations to words
4. **Quiz** - Multiple choice assessment
5. **Grammar Lessons** - Structured grammar content
6. **Sentence Builder** - Construct sentences from words
7. **Voice Practice** - Pronunciation analysis with scoring
8. **Deck Builder** - CMS for content creation
9. **Admin Panel** - User and system management
10. **PDF Export** - Generate printable materials
11. **Interactive Tours** - Guided onboarding

### Codebase Metrics
```
Total JavaScript:    16,087 lines
Total PHP:           19,944 lines
Total Files:         133
Card Content:        185+ images, 57 audio files
Languages:           3
Learning Modules:    7
```

---

## Technology Stack

### Frontend
```javascript
// No framework - Vanilla JavaScript ES6+
// Key Web APIs used:
- MediaRecorder API      // Voice recording
- Web Audio API          // Audio analysis (pitch, FFT, MFCC)
- Canvas API             // Waveform visualization
- Fetch API              // HTTP requests
- LocalStorage           // Client persistence
```

### Backend
```php
// PHP 7.4+
// Native sessions for authentication
// JSON for API responses
// File-based data storage (manifest.json, users.json)
```

### External Dependencies
| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| Driver.js | Latest | Interactive tours | `assets/vendor/driver.js` |
| Meyda.js | Latest | Audio feature extraction | `assets/vendor/meyda.min.js` |
| jsPDF | CDN | PDF generation | cdnjs.cloudflare.com |
| Font Awesome | 6.4.0 | Icons | CDN |

### Server Requirements
- Apache with mod_rewrite, mod_headers
- PHP 7.4+
- HTTPS (enforced via .htaccess)
- File upload support (100MB limit configured)

---

## Directory Structure

```
/home/user/WSOL/
│
├── index.php                    # Main entry point (HTML5 document)
├── app.js                       # Core application (1,918 lines)
├── config.php                   # Credentials & settings
├── auth-manager.js              # Client-side auth (449 lines)
│
├── LEARNING MODULES
│   ├── flashcards-module.js     # 457 lines
│   ├── grammar-module.js        # 451 lines
│   ├── match-module.js          # 490 lines
│   ├── match-sound-module.js    # 547 lines
│   ├── quiz-module.js           # 370 lines
│   ├── sentence-builder-module.js # 748 lines
│   └── voice-practice-module.js # 3,281 lines (largest)
│
├── ADMIN & CONTENT MANAGEMENT
│   ├── admin-module.js          # 1,173 lines
│   ├── deck-builder-module.js   # 2,505 lines
│   ├── deck-builder-audio.js    # 1,008 lines
│   ├── deck-builder-uploads.js  # 1,119 lines
│   ├── pdf-module.js            # 976 lines
│   └── tour-guide.js            # 595 lines
│
├── BACKEND APIs (PHP)
│   ├── auth.php                 # Login/session (192 lines)
│   ├── scan-assets.php          # Asset discovery (1,793 lines)
│   ├── save-deck.php            # Content persistence (213 lines)
│   ├── users.php                # User management (338 lines)
│   ├── upload-audio.php         # Audio uploads (86 lines)
│   ├── upload-media.php         # Media uploads (115 lines)
│   ├── list-assets.php          # Asset listing (77 lines)
│   ├── rename-asset.php         # Asset renaming (124 lines)
│   └── Tour APIs (7 files)      # Tour config management
│
├── SUBSYSTEMS (standalone apps)
│   ├── voice/                   # Pronunciation analysis app
│   │   ├── index.php            # Main UI
│   │   └── js/modules/          # Analysis algorithms
│   │       ├── pitch.js         # Pitch extraction
│   │       ├── intensity.js     # Loudness analysis
│   │       ├── mfcc.js          # MFCC features
│   │       ├── fft.js           # FFT/spectrogram
│   │       ├── dtw.js           # Dynamic Time Warping
│   │       ├── scoring.js       # Pronunciation scoring
│   │       ├── visualizer.js    # Canvas waveforms
│   │       └── ai-api.js        # Anthropic integration
│   │
│   ├── rec/                     # Voice recorder app
│   │   ├── index.php
│   │   ├── voice-recorder-app.js
│   │   └── voice-recorder.css
│   │
│   ├── tour-editor/             # Tour builder app
│   │   ├── index.php
│   │   ├── tour-editor-app.js
│   │   ├── components/          # UI components
│   │   ├── services/            # Data services
│   │   └── tour-editor.css
│   │
│   └── converter/               # Asset conversion tools
│       └── index.php
│
├── ASSETS
│   ├── manifest.json            # Content database (625KB)
│   ├── images/                  # 185+ card images (PNG, WebP, GIF)
│   ├── audio/                   # 57 M4A pronunciation files
│   ├── grammar/                 # Grammar content by language
│   │   ├── ceb/                 # Cebuano grammar
│   │   ├── mrw/                 # Maranao grammar
│   │   └── sin/                 # Sinama grammar
│   ├── vendor/                  # Third-party libraries
│   ├── Language_List.csv        # Language definitions
│   ├── Word_List_*.csv          # Vocabulary lists
│   └── Sentence_Words_ceb.csv   # Sentence builder words
│
├── STYLING
│   ├── styles/
│   │   ├── core.css             # Base styles
│   │   ├── theme.css            # Light/dark theme
│   │   └── modules/             # Per-module styles (11 files)
│
├── DATA FILES
│   ├── users.json               # User database
│   ├── tour-config.json         # Tour definitions
│   └── .htaccess                # Apache config
│
└── DOCUMENTATION
    ├── EXECUTIVE_SUMMARY.md     # High-level overview
    ├── AI_CODEBASE_CONTEXT.md   # This file (AI reference)
    └── [Other analysis docs]    # Various technical docs
```

---

## Core Architecture

### Application Bootstrap Sequence

```javascript
// index.php loads → app.js executes on DOMContentLoaded

// 1. Device Detection
const deviceDetector = new DeviceDetector();
// Determines: mobile/tablet/desktop, touch capability, orientation

// 2. Asset Manager Initialization
const assetManager = new AssetManager();
await assetManager.init();
// - Fetches manifest.json
// - Parses card data
// - Sets up language/lesson structure

// 3. Authentication Manager
const authManager = new AuthManager();
// - Checks existing session
// - Manages login UI
// - Controls protected feature access

// 4. Filter Manager
const filterManager = new FilterManager(assetManager);
// - Lesson range filtering
// - Grammar category filtering
// - ACTFL level filtering

// 5. Theme Manager
const themeManager = new ThemeManager();
// - Light/dark mode toggle
// - Persistent preference

// 6. Module Router
const router = new Router();
// - Maps nav tabs to modules
// - Handles module switching
// - Manages module lifecycle

// 7. Toast Manager (notifications)
const toastManager = new ToastManager();
```

### Class Hierarchy in app.js

```javascript
// Base class for all learning modules
class LearningModule {
    constructor(containerId) { }
    init(cards) { }           // Initialize with card data
    render() { }              // Render UI
    cleanup() { }             // Cleanup when switching away
    handleResize() { }        // Responsive behavior
}

// Core managers
class DeviceDetector { }      // Lines 85-199
class DebugLogger { }         // Lines 200-350
class ThemeManager { }        // Lines 351-402
class FilterManager { }       // Lines 404-749
class AssetManager { }        // Lines 754-1118
class ToastManager { }        // Lines 1119+
```

### Module Registration Pattern

```javascript
// Each module file registers itself:
// flashcards-module.js
class FlashcardsModule extends LearningModule {
    static MODULE_ID = 'flashcards';

    constructor() {
        super('flashcards-container');
    }

    init(cards) {
        this.cards = cards;
        this.currentPage = 0;
        this.cardsPerPage = this.calculateCardsPerPage();
        this.render();
        this.attachEventListeners();
    }
}

// Registration happens at module load
window.FlashcardsModule = FlashcardsModule;
```

---

## Module System

### Learning Modules

#### FlashcardsModule (`flashcards-module.js`)
```javascript
Purpose: Vocabulary study with flip cards
Key Methods:
- init(cards)           // Initialize with filtered cards
- render()              // Display current page of cards
- flipCard(cardId)      // Toggle card front/back
- nextPage() / prevPage() // Pagination
- playAudio(cardId)     // Play pronunciation

Card Display:
- Front: Image, lesson number
- Back: English translation, pronunciation notes

Dependencies: AssetManager for card data, voice-practice integration
```

#### GrammarModule (`grammar-module.js`)
```javascript
Purpose: Display grammar lessons from files
Key Methods:
- init()                // Load grammar file list
- loadGrammarFile(path) // Fetch and display grammar content
- render()              // Display grammar content

Data Source: assets/grammar/{language}/*.html or *.csv
Supports: Cebuano, Maranao, Sinama
```

#### MatchModule (`match-module.js`)
```javascript
Purpose: Picture-to-word matching game
Key Methods:
- init(cards)           // Set up game with cards
- startGame()           // Begin matching session
- selectImage(index)    // User selects image
- selectWord(index)     // User selects word
- checkMatch()          // Validate selection
- generateDistractors() // Create wrong answers

Game Flow:
1. Show 4 images
2. Show 4 word options (1 correct + 3 distractors)
3. User matches image to word
4. Score and proceed

Virtual Cards: Handles word variants (e.g., "word/variant")
```

#### MatchSoundModule (`match-sound-module.js`)
```javascript
Purpose: Audio-to-word matching game
Key Methods:
- init(cards)           // Set up with audio-enabled cards
- playAudio(cardId)     // Play pronunciation
- selectAudio(index)    // User selects audio
- selectWord(index)     // User selects word
- checkMatch()          // Validate

Similar to MatchModule but uses audio instead of images
```

#### QuizModule (`quiz-module.js`)
```javascript
Purpose: Multiple choice assessment
Key Methods:
- init(cards)           // Set up quiz
- generateQuestion()    // Create question from card
- submitAnswer(index)   // Check user answer
- showResults()         // Display final score

Question Types: Image → Word, Word → Image, Audio → Word
```

#### SentenceBuilderModule (`sentence-builder-module.js`)
```javascript
Purpose: Construct sentences from word cards
Key Methods:
- init()                // Load sentence word data
- startSentence(id)     // Begin building specific sentence
- addWord(wordId)       // Add word to construction
- removeWord(index)     // Remove from construction
- checkSentence()       // Validate completed sentence

Data Source: assets/Sentence_Words_ceb.csv
Searches: All cards in manifest regardless of lesson filter
```

#### VoicePracticeModule (`voice-practice-module.js`)
```javascript
Purpose: Pronunciation analysis and feedback
Size: 3,281 lines (largest module)

Key Methods:
- init(cards)           // Set up with audio-enabled cards
- startRecording()      // Begin user audio capture
- stopRecording()       // End capture, analyze
- analyzeAudio()        // Run analysis algorithms
- compareToReference()  // Compare with native speaker
- displayScore()        // Show pronunciation score

Analysis Pipeline:
1. Pitch extraction (autocorrelation)
2. Intensity analysis (RMS)
3. MFCC feature extraction
4. FFT/spectrogram generation
5. Dynamic Time Warping comparison
6. Weighted scoring

Integration: Uses voice/ subsystem for advanced analysis
```

### Admin Modules

#### AdminModule (`admin-module.js`)
```javascript
Purpose: System administration dashboard
Key Methods:
- init()                // Load admin panel
- showDashboard()       // Display statistics
- manageUsers()         // User CRUD operations
- systemSettings()      // Configure system options
- rescanAssets()        // Trigger asset discovery

Access: Requires admin authentication
```

#### DeckBuilderModule (`deck-builder-module.js`)
```javascript
Purpose: Content management system for lessons
Size: 2,505 lines

Key Methods:
- init()                // Load deck builder UI
- createCard()          // Add new card
- editCard(cardId)      // Modify existing card
- deleteCard(cardId)    // Remove card
- saveChanges()         // Persist to manifest
- uploadImage()         // Add card image
- uploadAudio()         // Add pronunciation

Supporting Modules:
- deck-builder-audio.js (1,008 lines) - Audio management
- deck-builder-uploads.js (1,119 lines) - File upload handling

Access: Requires admin or deck-manager authentication
```

#### PDFModule (`pdf-module.js`)
```javascript
Purpose: Generate printable lesson materials
Key Methods:
- init()                // Set up PDF generator
- generatePDF()         // Create PDF document
- addCard(card)         // Add card to PDF
- save()                // Download PDF file

Library: jsPDF (loaded from CDN)
```

#### TourGuideModule (`tour-guide.js`)
```javascript
Purpose: Interactive onboarding tours
Key Methods:
- init()                // Load tour configuration
- startTour(phase)      // Begin specific tour
- nextStep()            // Advance tour
- endTour()             // Complete/exit tour

Library: Driver.js
Config: tour-config.json
Tour Phases: intro, review, test, cardBack
```

---

## Data Flow & State Management

### Manifest.json Structure

```json
{
  "version": "4.0",
  "generated": "2025-11-24T...",
  "statistics": {
    "totalCards": 185,
    "languages": ["ceb", "mrw", "sin"],
    "lessons": [1, 2, 3, ...]
  },
  "cards": [
    {
      "cardNumber": 1,
      "lesson": 1,
      "type": "noun",
      "images": {
        "png": "images/001.png",
        "webp": "images/001.webp",
        "gif": null
      },
      "audio": {
        "m4a": "audio/001.m4a"
      },
      "translations": {
        "eng": "house",
        "ceb": "balay",
        "mrw": "walay",
        "sin": "luma"
      },
      "grammar": {
        "category": "noun",
        "subcategory": "building"
      },
      "actfl": "Novice Low",
      "acceptableAnswers": ["balay", "baylay"],
      "notes": "Common word for house"
    }
  ]
}
```

### AssetManager Data Flow

```
manifest.json
    │
    ▼
AssetManager.init()
    ├── Parse JSON
    ├── Build card index by ID
    ├── Build lesson index
    ├── Build language index
    └── Store in this.cards, this.lessons, etc.
    │
    ▼
AssetManager.getCards(filters)
    ├── Apply lesson filter
    ├── Apply grammar filter
    ├── Apply language filter
    └── Return filtered cards array
    │
    ▼
Module.init(cards)
    └── Module-specific rendering
```

### Authentication Flow

```
User Login Request
    │
    ▼
auth-manager.js → auth.php
    ├── Validate password
    ├── Check role (admin/deck-manager/voice-recorder)
    ├── Create PHP session
    └── Return session token
    │
    ▼
auth-manager.js
    ├── Store session state
    ├── Update UI (show/hide protected features)
    └── Set session timeout timer
    │
    ▼
Protected Feature Access
    ├── Check authManager.isAuthenticated()
    ├── Check authManager.hasRole(role)
    └── Allow/deny access
```

### Card Filter Flow

```
User Opens Filter Panel
    │
    ▼
FilterManager.showFilterPanel()
    ├── Display lesson range inputs
    ├── Display grammar checkboxes
    ├── Display ACTFL level options
    └── Show current filter state
    │
    ▼
User Applies Filters
    │
    ▼
FilterManager.applyFilters()
    ├── Validate inputs
    ├── Build filter criteria object
    ├── Call AssetManager.getCards(filters)
    ├── Update UI with match count
    └── Notify active module to refresh
    │
    ▼
Module.refresh(filteredCards)
    └── Re-render with new card set
```

---

## API Reference

### Authentication API

#### POST /auth.php
```php
// Login
Request: { action: 'login', password: 'xxx' }
Response: {
    success: true,
    role: 'admin|deck-manager|voice-recorder',
    session_id: 'xxx'
}

// Logout
Request: { action: 'logout' }
Response: { success: true }

// Check session
Request: { action: 'check' }
Response: { authenticated: true, role: 'admin' }
```

### Asset Management API

#### GET /list-assets.php
```php
Response: {
    images: ['001.png', '002.png', ...],
    audio: ['001.m4a', '002.m4a', ...],
    grammar: { ceb: [...], mrw: [...], sin: [...] }
}
```

#### POST /scan-assets.php
```php
// Triggers full asset scan and manifest regeneration
Request: { action: 'scan' }
Response: {
    success: true,
    stats: { images: 185, audio: 57, ... }
}
```

#### POST /upload-audio.php
```php
// Upload audio file
Request: FormData with 'audio' file
Response: { success: true, path: 'audio/filename.m4a' }
```

#### POST /upload-media.php
```php
// Upload image file
Request: FormData with 'media' file
Response: { success: true, path: 'images/filename.png' }
```

#### POST /rename-asset.php
```php
Request: { oldPath: 'images/old.png', newPath: 'images/new.png' }
Response: { success: true }
```

### Deck Management API

#### POST /save-deck.php
```php
// Save card changes
Request: {
    action: 'save',
    cards: [{ cardNumber: 1, ... }]
}
Response: { success: true }

// Add new card
Request: {
    action: 'add',
    card: { lesson: 1, type: 'noun', ... }
}
Response: { success: true, cardNumber: 186 }

// Delete card
Request: { action: 'delete', cardNumber: 5 }
Response: { success: true }
```

### User Management API

#### POST /users.php
```php
// List users
Request: { action: 'list' }
Response: { users: [{ id: 1, username: 'admin', role: 'admin' }] }

// Create user
Request: { action: 'create', username: 'x', password: 'y', role: 'z' }
Response: { success: true, id: 2 }

// Update user
Request: { action: 'update', id: 1, password: 'new' }
Response: { success: true }

// Delete user
Request: { action: 'delete', id: 1 }
Response: { success: true }
```

### Tour Configuration API

#### POST /save-tour-config.php
```php
Request: { config: { steps: [...] } }
Response: { success: true }
```

#### POST /backup-tour-config.php
```php
Response: { success: true, backup: 'tour-config-2025-11-24.json' }
```

#### GET /list-tour-backups.php
```php
Response: { backups: ['tour-config-2025-11-24.json', ...] }
```

---

## File Reference

### Core Application Files

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `index.php` | 337 | HTML entry, loads all JS/CSS | - |
| `app.js` | 1,918 | Core classes, bootstrap | AssetManager, FilterManager, etc. |
| `config.php` | 20 | Admin passwords | $ADMIN_PASSWORD, etc. |
| `auth-manager.js` | 449 | Auth client logic | AuthManager class |

### Learning Modules

| File | Lines | Purpose | Key Class |
|------|-------|---------|-----------|
| `flashcards-module.js` | 457 | Flip cards | FlashcardsModule |
| `grammar-module.js` | 451 | Grammar lessons | GrammarModule |
| `match-module.js` | 490 | Picture matching | MatchModule |
| `match-sound-module.js` | 547 | Audio matching | MatchSoundModule |
| `quiz-module.js` | 370 | Assessment | QuizModule |
| `sentence-builder-module.js` | 748 | Sentence building | SentenceBuilderModule |
| `voice-practice-module.js` | 3,281 | Pronunciation | VoicePracticeModule |

### Admin & Tools

| File | Lines | Purpose | Key Class |
|------|-------|---------|-----------|
| `admin-module.js` | 1,173 | Admin dashboard | AdminModule |
| `deck-builder-module.js` | 2,505 | Content CMS | DeckBuilderModule |
| `deck-builder-audio.js` | 1,008 | Audio management | AudioManager |
| `deck-builder-uploads.js` | 1,119 | File uploads | UploadManager |
| `pdf-module.js` | 976 | PDF generation | PDFModule |
| `tour-guide.js` | 595 | Interactive tours | TourGuide |

### Backend APIs

| File | Lines | Purpose | Endpoints |
|------|-------|---------|-----------|
| `auth.php` | 192 | Authentication | login, logout, check |
| `scan-assets.php` | 1,793 | Asset discovery | scan |
| `save-deck.php` | 213 | Deck persistence | save, add, delete |
| `users.php` | 338 | User management | list, create, update, delete |
| `upload-audio.php` | 86 | Audio uploads | POST file |
| `upload-media.php` | 115 | Media uploads | POST file |
| `list-assets.php` | 77 | Asset listing | GET |
| `rename-asset.php` | 124 | Asset renaming | POST |

### Voice Analysis Subsystem

| File | Purpose | Algorithm |
|------|---------|-----------|
| `voice/js/modules/pitch.js` | Pitch extraction | Autocorrelation |
| `voice/js/modules/intensity.js` | Loudness analysis | RMS calculation |
| `voice/js/modules/mfcc.js` | Feature extraction | Mel-frequency cepstrum |
| `voice/js/modules/fft.js` | Spectrum analysis | Fast Fourier Transform |
| `voice/js/modules/dtw.js` | Sequence alignment | Dynamic Time Warping |
| `voice/js/modules/scoring.js` | Score calculation | Weighted combination |
| `voice/js/modules/visualizer.js` | Waveform display | Canvas API |
| `voice/js/modules/ai-api.js` | AI feedback | Anthropic API |

---

## Common Patterns & Conventions

### Module Pattern

```javascript
// All modules follow this structure:
class ModuleName extends LearningModule {
    static MODULE_ID = 'module-name';

    constructor() {
        super('container-id');
        this.state = {};
    }

    init(cards) {
        this.cards = cards;
        this.attachEventListeners();
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = this.buildHTML();
    }

    attachEventListeners() {
        // Event delegation preferred
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('.card')) {
                this.handleCardClick(e.target);
            }
        });
    }

    cleanup() {
        // Remove listeners, clear timers
    }
}

window.ModuleName = ModuleName;
```

### API Call Pattern

```javascript
// Standard fetch pattern used throughout
async function apiCall(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        toastManager.show('Error: ' + error.message, 'error');
        throw error;
    }
}
```

### Event Handler Pattern

```javascript
// Event delegation for dynamic content
container.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) {
        const cardId = card.dataset.cardId;
        this.handleCardClick(cardId);
    }

    const button = e.target.closest('.btn');
    if (button) {
        const action = button.dataset.action;
        this.handleAction(action);
    }
});
```

### CSS Class Naming

```css
/* BEM-like naming convention */
.module-name { }
.module-name__element { }
.module-name__element--modifier { }

/* State classes */
.is-active { }
.is-loading { }
.is-disabled { }
.has-error { }

/* Theme classes */
.theme-light { }
.theme-dark { }
```

### Responsive Design Pattern

```javascript
// Device-aware card counts
getCardsPerPage() {
    const width = window.innerWidth;
    if (width < 576) return 2;      // Mobile
    if (width < 768) return 4;      // Tablet
    if (width < 992) return 6;      // Small desktop
    return 8;                        // Large desktop
}
```

---

## Development Guidelines

### Adding a New Learning Module

1. Create `new-module.js` following module pattern
2. Add module CSS in `styles/modules/new-module.css`
3. Register in `index.php`:
   ```html
   <script src="new-module.js?v=<?= $version ?>"></script>
   ```
4. Add nav tab in `index.php`:
   ```html
   <li class="nav-item" data-module="new-module">New Module</li>
   ```
5. Add container in `index.php`:
   ```html
   <div id="new-module-container" class="module-container"></div>
   ```
6. Register in router (app.js)
7. **Update this document** with module details

### Adding a New API Endpoint

1. Create `new-endpoint.php`
2. Implement authentication check if needed
3. Return JSON responses
4. Document in API Reference section above
5. **Update this document**

### Modifying Manifest Structure

1. Update `scan-assets.php` to generate new fields
2. Update AssetManager to parse new fields
3. Update dependent modules
4. Increment manifest version
5. **Update this document** with new schema

### Adding a New Language

1. Add language code to Language_List.csv
2. Create Word_List_{language}.csv
3. Create grammar/{langcode}/ directory
4. Add translations to manifest cards
5. Update AssetManager language handling
6. **Update this document**

---

## Testing & Debugging

### Debug Logging

```javascript
// Enable debug mode in browser console:
window.DEBUG = true;

// DebugLogger class in app.js provides:
DebugLogger.log('module', 'message', data);
DebugLogger.warn('module', 'warning');
DebugLogger.error('module', 'error', errorObject);

// Logs include timestamp and module name
// [2025-11-24 10:15:32] [flashcards] Card loaded: 42
```

### Common Debug Points

```javascript
// Check manifest loading
console.log(window.assetManager.cards);

// Check authentication state
console.log(window.authManager.isAuthenticated());
console.log(window.authManager.currentRole);

// Check current filters
console.log(window.filterManager.currentFilters);

// Check active module
console.log(window.router.activeModule);
```

### Browser DevTools Tips

```javascript
// Monitor all fetch requests
// Network tab → Filter: Fetch/XHR

// Check localStorage
localStorage.getItem('wsol-theme');
localStorage.getItem('wsol-language');

// Check sessionStorage
sessionStorage.getItem('wsol-session');
```

### PHP Error Logging

```php
// Errors logged to:
// - Apache error log
// - PHP error log (configured in php.ini)

// Enable verbose errors during development:
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

---

## Security Considerations

### Authentication

```php
// Passwords stored in config.php (plain text - not ideal for production)
$ADMIN_PASSWORD = 'WSOL10:15';
$DECK_MANAGER_PASSWORD = 'deck123';
$VOICE_RECORDER_PASSWORD = 'voice123';

// Sessions use PHP native sessions
session_start();
$_SESSION['authenticated'] = true;
$_SESSION['role'] = 'admin';
```

### Protected Endpoints

```php
// All admin endpoints should check:
function requireAuth($requiredRole = null) {
    session_start();
    if (!isset($_SESSION['authenticated'])) {
        http_response_code(401);
        die(json_encode(['error' => 'Not authenticated']));
    }
    if ($requiredRole && $_SESSION['role'] !== $requiredRole) {
        http_response_code(403);
        die(json_encode(['error' => 'Insufficient permissions']));
    }
}
```

### File Upload Security

```php
// Validate file types
$allowed_types = ['image/png', 'image/webp', 'image/gif', 'audio/mp4'];
if (!in_array($_FILES['file']['type'], $allowed_types)) {
    die('Invalid file type');
}

// Sanitize filenames
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
```

### .htaccess Security Rules

```apache
# Block sensitive files
<FilesMatch "\.(env|git|htpasswd|json)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Allow manifest.json specifically
<Files "manifest.json">
    Allow from all
</Files>

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Changelog

### Version 4.2 (November 2025)
- Added sentence builder module with cross-lesson card search
- Added grammar module with pre-loaded grammar file list
- Improved manifest structure for grammar content
- Added this AI context documentation

### Version 4.0 (October 2025)
- Major manifest schema update
- Added WebP image support
- Improved voice practice module

---

## Quick Reference

### Key Files for Common Tasks

| Task | Files to Modify |
|------|-----------------|
| Add new card content | `save-deck.php`, deck-builder UI |
| Change authentication | `config.php`, `auth.php`, `auth-manager.js` |
| Add new language | CSV files, manifest, AssetManager |
| Modify card display | Module CSS in `styles/modules/` |
| Change filter options | `FilterManager` in `app.js` |
| Add new module | Create module.js, register in index.php |

### File Type Locations

| Type | Location |
|------|----------|
| Card images | `assets/images/` |
| Audio files | `assets/audio/` |
| Grammar content | `assets/grammar/{lang}/` |
| Module styles | `styles/modules/` |
| Configuration | `config.php`, `.htaccess` |
| User data | `users.json` |
| Content data | `assets/manifest.json` |

---

*This document should be updated by AI assistants whenever changes are made to the codebase. Keep it synchronized with the actual implementation.*
