# Bob and Mariel Ward School of Filipino Languages
## Complete Functional Guide for AI-Assisted Development

**Version 4.2 - November 2025**

---

# Table of Contents

1. [What This Application Does](#what-this-application-does)
2. [How the Application is Organized](#how-the-application-is-organized)
3. [The Main Parts of the System](#the-main-parts-of-the-system)
4. [Learning Modules Explained](#learning-modules-explained)
5. [Administrative Tools](#administrative-tools)
6. [How Data is Stored](#how-data-is-stored)
7. [File-by-File Reference](#file-by-file-reference)
8. [How Users Log In and Access Features](#how-users-log-in-and-access-features)
9. [How to Modify Different Parts](#how-to-modify-different-parts)
10. [Common Tasks and Where to Look](#common-tasks-and-where-to-look)

---

# What This Application Does

This is a **language learning website** designed to teach Filipino languages - specifically **Cebuano**, **Maranao**, and **Sinama**. Students use it to learn vocabulary words through various interactive exercises like flashcards, matching games, quizzes, and pronunciation practice.

Think of it like Duolingo, but specifically made for Filipino languages and designed to work alongside traditional classroom teaching.

## Main Features for Students

- **Flashcards**: See a picture, flip to see the word in your target language
- **Picture Match**: Match words to their correct pictures
- **Audio Match**: Listen to a word and match it to the right picture
- **Quiz ("Unsa Ni?")**: Type the correct word when shown a picture
- **Sentence Builder**: Drag and arrange word cards to build sentences
- **Sentence Review**: Review complete sentences with visual connections
- **Voice Practice**: Record yourself saying words and get AI feedback on pronunciation
- **Grammar Lessons**: Read grammar rules and explanations
- **Teacher's Guide**: Resources for instructors

## Main Features for Administrators

- **Deck Builder**: Add, edit, and delete vocabulary cards
- **User Management**: Create accounts with different permission levels
- **Asset Scanner**: Scan images and audio files to update the vocabulary database
- **Tour Editor**: Create guided tutorials for students

---

# How the Application is Organized

The application follows a simple pattern:

```
WSOL/
├── index.php          <- The main page everyone sees
├── app.js             <- The brain that controls everything
├── *-module.js        <- Each learning activity (flashcards, quiz, etc.)
├── *.php              <- Server-side code that handles saving/loading data
├── assets/            <- Pictures, audio files, and vocabulary data
├── styles/            <- How everything looks (colors, layout, fonts)
└── Special folders:
    ├── tour-editor/   <- Tool to create guided tours
    ├── voice/         <- Advanced voice recording tools
    ├── sentences/     <- AI-powered sentence generator
    ├── rec/           <- Voice recording interface
    └── converter/     <- Data conversion tools
```

## The Two Parts: Frontend and Backend

**Frontend** (what runs in your browser):
- All the `.js` files (JavaScript)
- All the `.css` files (styling)
- The HTML in `index.php`

**Backend** (what runs on the server):
- All the `.php` files
- Handles saving changes to files
- Handles user login and security

---

# The Main Parts of the System

## 1. The Entry Point (index.php)

This is where everything starts. When you visit the website, this file loads and:
1. Checks if you're using a secure connection (HTTPS)
2. Loads all the styling (CSS files)
3. Shows the header with language/lesson selectors
4. Shows the navigation tabs (Flashcards, Quiz, etc.)
5. Loads all the JavaScript modules

**Important sections in index.php:**
- Lines 16-62: Loads CSS stylesheets
- Lines 64-103: The header bar with controls
- Lines 106-151: Navigation tabs for different modules
- Lines 157-314: Pop-up windows (modals) for login, filters, etc.
- Lines 326-349: Loads JavaScript files

## 2. The Main Controller (app.js)

This is the "brain" of the application. It controls:
- Which module to show when you click a tab
- Loading vocabulary data from the manifest file
- Theme switching (light/dark mode)
- User device detection (phone, tablet, desktop)
- Toast notifications (those little pop-up messages)
- Advanced filtering of cards

**Key classes in app.js:**

| Class Name | What It Does | Lines |
|------------|--------------|-------|
| `LearningModule` | Base template all modules follow | 41-80 |
| `DeviceDetector` | Detects if you're on phone/tablet/desktop | 85-213 |
| `BrowserCapabilityDetector` | Checks which image/video formats work | 218-306 |
| `DebugLogger` | Records errors for troubleshooting | 311-354 |
| `ThemeManager` | Handles light/dark mode switching | 359-396 |
| `ToastManager` | Shows those little notification messages | 401-446 |
| `InstructionManager` | Shows first-time instructions | 451-512 |
| `FilterManager` | Handles advanced card filtering | 517-862 |
| `AssetManager` | Loads and manages all vocabulary data | 867-1341 |
| `ScoreTracker` | Tracks scores during tests | 1346-1384 |
| `Router` | Controls which module is displayed | 1678-1727 |

## 3. Authentication Manager (auth-manager.js)

Controls who can access what. There are four user roles:

| Role | What They Can Do |
|------|------------------|
| **Admin** | Everything - full access to all features |
| **Deck Manager** | Full access to Deck Builder, no Admin panel |
| **Editor** | Can edit cards but not use advanced tools |
| **Voice Recorder** | Can only filter cards and record audio |

**Key functions:**
- `handleLogin()`: Processes login attempts
- `logout()`: Logs user out
- `hasPermission(action)`: Checks if user can do something
- `getLanguageRestriction()`: Some users are limited to one language

---

# Learning Modules Explained

Each learning activity is its own module. They all follow the same pattern:

```javascript
class SomeModule extends LearningModule {
    constructor() { /* setup */ }
    render()     { /* draw the screen */ }
    init()       { /* connect buttons and start */ }
    destroy()    { /* clean up when leaving */ }
}
```

## Flashcards Module (flashcards-module.js)

**What it does**: Shows vocabulary cards you can flip to see the word.

**How it works**:
1. Gets cards for the current lesson from AssetManager
2. Displays pictures in a grid (4 at a time on desktop)
3. Click a card to flip it and see the word
4. Speaker icon plays the audio pronunciation
5. Microphone icon opens voice practice (if enabled)

**Key features**:
- Can show English OR Cebuano translation on back
- Voice practice toggle
- Supports animated images (GIF, MP4, WebM)

## Picture Match Module (match-module.js)

**What it does**: Shows a picture, you pick the matching word from choices.

**How it works**:
1. Loads cards and creates "virtual cards" (one per word variant)
2. Shows one picture at a time
3. Displays 4 word choices above
4. Draws a line when you pick an answer
5. Green line = correct, Red line = wrong

**Two modes**:
- **Review Mode**: Must get each word correct 3 times
- **Test Mode**: One chance per word, shows final score

## Audio Match Module (match-sound-module.js)

**What it does**: Like Picture Match but you hear the word instead of seeing it typed.

**How it works**:
1. Plays audio for a word
2. Shows 4 picture choices
3. You pick which picture matches the sound

## Quiz Module - "Unsa Ni?" (quiz-module.js)

"Unsa Ni?" means "What is this?" in Cebuano.

**What it does**: Shows a picture, you type the word.

**How it works**:
1. Shows a picture
2. You type what you think the word is
3. Checks against all acceptable spellings
4. **Review Mode**: Missed words come back later
5. **Test Mode**: One pass through, shows final score

**Smart feature**: Accepts multiple correct spellings (e.g., "tilaw" and "tilawo")

## Sentence Builder Module (sentence-builder-module.js)

**What it does**: Build sentences by choosing picture cards.

**How it works**:
1. Shows empty frames in a row
2. Click a frame to pick a word type (Subject, Verb, etc.)
3. Pick a picture card for that word type
4. Drag to rearrange words in the sentence
5. Cards are flippable to see the word

## Sentence Review Module (sentence-review-module.js)

**What it does**: Shows complete sentences with visual word connections.

**How it works**:
1. Shows pre-built sentences from the lesson
2. Displays picture bubbles connected by lines
3. Lines show how words relate to each other
4. Click speaker icons to hear words

## Voice Practice Module (voice-practice-module.js)

**What it does**: Record yourself and compare to native pronunciation.

**How it works**:
1. Plays the native speaker's audio
2. You record yourself saying the word
3. Shows visual comparison (waveforms, pitch contours)
4. Uses AI (Claude API) to give feedback

**Technical features**:
- MFCC extraction (audio fingerprinting)
- Dynamic Time Warping (compares recordings)
- Multiple visualization modes

## Grammar Module (grammar-module.js)

**What it does**: Shows grammar lessons as HTML pages.

**How it works**:
1. Loads lesson HTML from `assets/grammar/{language}/lesson-{n}.html`
2. Displays formatted text with examples

## Teacher's Guide Module (teacher-guide-module.js)

**What it does**: Shows teaching resources.

**How it works**:
- Similar to Grammar module
- Loads from `assets/teacher-guide/{language}/`

## PDF Print Module (pdf-module.js)

**What it does**: Create printable worksheets and flashcards.

**Three formats**:
1. **Flashcards**: 2-sided printable cards
2. **Unsa Ni?**: Fill-in-the-blank worksheets
3. **Matching Game**: Connect pictures to words

**How it works**:
1. Select lessons or grammar type to filter
2. Choose which languages on card backs
3. Generates PDF using jsPDF library

---

# Administrative Tools

## Deck Builder Module (deck-builder-module.js)

The main tool for managing vocabulary cards. This is a large file (~172KB) because it has many features.

**Main sections**:
1. **Card Table**: View all cards in a spreadsheet format
2. **CSV Tools**: Import/export cards from spreadsheets
3. **Media Tools**: Upload and manage images/audio
4. **Sentence Tools**: Manage sentence data
5. **Grammar Tools**: Manage lesson metadata

**What you can do**:
- Add new vocabulary cards
- Edit existing cards (word, translation, notes)
- Delete cards
- Assign images to cards
- Record or upload audio
- Set lesson numbers
- Export to CSV

**Related files**:
- `deck-builder-audio.js`: Audio recording/selection
- `deck-builder-uploads.js`: File upload handling

## Admin Module (admin-module.js)

System administration panel for admins only.

**Sections**:
1. **System Status**: Shows version, card counts, audio coverage
2. **Module Health Check**: Shows which modules are working
3. **Debug Configuration**: Set logging level, view errors
4. **Session Management**: Set login timeout duration
5. **User Management**: Add/edit/delete user accounts

## Tour Editor (tour-editor/ folder)

Creates guided tutorials that walk new users through the app.

**Files**:
- `index.php`: The editor interface
- `tour-editor-app.js`: Main editor logic
- `components/`: UI pieces
  - `action-recorder.js`: Records click sequences
  - `preview-frame.js`: Shows live preview
  - `shape-overlay.js`: Highlights UI elements
  - `step-manager.js`: Manages tour steps
  - `toolbar.js`: Editor toolbar buttons

---

# How Data is Stored

## The Manifest File (assets/manifest.json)

This is the heart of all vocabulary data. Structure:

```json
{
  "version": "4.0",
  "lastUpdated": "2025-11-26T04:08:14-08:00",
  "languages": [
    {"id": 1, "name": "Cebuano", "trigraph": "ceb"},
    {"id": 2, "name": "English", "trigraph": "eng"},
    {"id": 3, "name": "Maranao", "trigraph": "mrw"},
    {"id": 4, "name": "Sinama", "trigraph": "sin"}
  ],
  "images": {
    "1": {
      "png": "assets/1.Asa.Where.png",
      "webp": "assets/1.Asa.Where.webp"
    }
  },
  "cards": {
    "ceb": [
      {
        "cardNum": 1,
        "lesson": 1,
        "word": "Asa",
        "english": "Where",
        "hasAudio": true,
        "audio": ["assets/audio/ceb/1.ceb.asa.m4a"]
      }
    ]
  },
  "lessonMeta": {
    "ceb": {
      "5": {"type": "review", "reviewsLessons": [1,2,3,4]}
    }
  },
  "sentenceWords": { ... },
  "sentenceReview": { ... }
}
```

**Key sections**:
- `languages`: Which languages are available
- `images`: Maps card numbers to image file paths
- `cards`: All vocabulary cards organized by language
- `lessonMeta`: Special lesson settings (like review lessons)
- `sentenceWords`: Words organized by type for Sentence Builder
- `sentenceReview`: Pre-built sentences for Sentence Review

## User Data (users.json)

Stores user accounts:

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "password": "WSOL10:15",
      "role": "admin",
      "language": null
    }
  ]
}
```

## Tour Configuration (tour-config.json)

Stores guided tour steps for each module.

---

# File-by-File Reference

## Root Directory Files

| File | Purpose | When You'd Change It |
|------|---------|---------------------|
| `index.php` | Main HTML page structure | Adding new tabs, changing header |
| `config.php` | Passwords, security settings | Changing default passwords |
| `app.js` | Core application logic | Adding new managers, changing filters |
| `auth-manager.js` | Login/permissions | Adding new roles, changing access rules |
| `flashcards-module.js` | Flashcard exercise | Changing card flip behavior |
| `match-module.js` | Picture matching exercise | Changing matching rules |
| `match-sound-module.js` | Audio matching exercise | Changing audio playback |
| `quiz-module.js` | Typing quiz | Changing answer validation |
| `sentence-builder-module.js` | Sentence construction | Changing frame behavior |
| `sentence-review-module.js` | Sentence review display | Changing visual layout |
| `sentence-review-builder.js` | Builds sentence review data | Changing connection lines |
| `voice-practice-module.js` | Pronunciation practice | Changing audio analysis |
| `grammar-module.js` | Grammar lesson display | Changing how lessons load |
| `teacher-guide-module.js` | Teacher resources | Changing resource display |
| `pdf-module.js` | PDF generation | Adding new PDF formats |
| `deck-builder-module.js` | Card management | Adding new card fields |
| `deck-builder-audio.js` | Audio handling | Changing audio formats |
| `deck-builder-uploads.js` | File uploads | Changing upload limits |
| `admin-module.js` | Admin dashboard | Adding new admin features |
| `tour-guide.js` | Tour display system | Changing tour behavior |

## PHP Backend Files

| File | Purpose |
|------|---------|
| `auth.php` | Handles login/logout requests |
| `users.php` | Manages user accounts (add/edit/delete) |
| `save-deck.php` | Saves card changes to manifest |
| `scan-assets.php` | Scans for images/audio files |
| `list-assets.php` | Lists available assets |
| `rename-asset.php` | Renames asset files |
| `upload-audio.php` | Handles audio uploads |
| `upload-media.php` | Handles image uploads |
| `save-tour-config.php` | Saves tour changes |
| `load-tour-draft.php` | Loads tour drafts |
| `list-tour-drafts.php` | Lists saved drafts |

## Style Files (styles/ folder)

| File | What It Styles |
|------|----------------|
| `core.css` | Base layout, buttons, forms |
| `theme.css` | Light/dark mode colors |
| `modules/flashcards.css` | Flashcard appearance |
| `modules/match.css` | Picture match game |
| `modules/match-sound.css` | Audio match game |
| `modules/quiz.css` | Quiz interface |
| `modules/deck-builder.css` | Admin card editor |
| `modules/admin.css` | Admin panel |
| `modules/voice-practice.css` | Recording interface |
| `modules/sentence-builder.css` | Sentence builder |
| `modules/sentence-review.css` | Sentence review |
| `modules/pdf-print.css` | PDF preview |
| `modules/grammar.css` | Grammar lessons |
| `modules/teacher-guide.css` | Teacher guide |

## Assets Folder Structure

```
assets/
├── manifest.json         <- All vocabulary data
├── logo.png              <- School logo
├── vendor/               <- Third-party libraries
│   ├── driver.js         <- Tour system
│   ├── driver.css
│   └── meyda.min.js      <- Audio analysis
├── grammar/              <- Grammar lesson HTML files
│   ├── ceb/              <- Cebuano grammar
│   ├── mrw/              <- Maranao grammar
│   └── sin/              <- Sinama grammar
├── teacher-guide/        <- Teacher resources
├── [image files]         <- PNG, WebP, GIF images
├── audio/                <- Audio files by language
│   ├── ceb/              <- Cebuano audio
│   ├── mrw/              <- Maranao audio
│   └── sin/              <- Sinama audio
└── CSV files             <- Word lists for import
```

---

# How Users Log In and Access Features

## Login Flow

1. User clicks "Login" button in header
2. Modal appears with user dropdown and password field
3. User selects their account and enters password
4. Request sent to `auth.php?action=login`
5. Server checks password against `users.json`
6. On success: session created, UI updated based on role
7. On failure: error message shown

## Role Permissions

**Admin** (`role: "admin"`):
- Access everything
- Can see Admin tab and Deck Builder tab
- Can manage users
- Can change system settings

**Deck Manager** (`role: "deck-manager"`):
- Full Deck Builder access (all sections)
- NO Admin tab access
- Can work with all languages

**Editor** (`role: "editor"`):
- Deck Builder table only (no CSV/Media/Sentence tools)
- Can add/edit/delete cards
- Usually restricted to ONE language

**Voice Recorder** (`role: "voice-recorder"`):
- Can only view cards and record audio
- Cannot edit card data
- Usually restricted to ONE language

## Language Restrictions

Editors and Voice Recorders can be limited to specific languages:
```json
{
  "username": "editor-ceb",
  "role": "editor",
  "language": "ceb"  // Can only work with Cebuano
}
```

---

# How to Modify Different Parts

## Adding a New Vocabulary Card

**Manually (via code)**:
1. Open `assets/manifest.json`
2. Find the `cards` section for your language
3. Add a new card object:
```json
{
  "cardNum": 301,
  "lesson": 15,
  "word": "Balay",
  "english": "House",
  "hasAudio": false,
  "audio": [],
  "printImagePath": "assets/301.Balay.House.png"
}
```

**Through the UI**:
1. Log in as Admin or Deck Manager
2. Go to Deck Builder tab
3. Click "Add Card" button
4. Fill in the fields
5. Click Save

## Adding a New Learning Module

1. Create new file: `your-module.js`
2. Create the class:
```javascript
class YourModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
    }

    async render() {
        this.container.innerHTML = `
            <div class="module-your">
                <h1>Your Module</h1>
                <!-- Your HTML here -->
            </div>
        `;
    }

    async init() {
        // Setup event listeners
        // Load data
    }
}
```

3. Add CSS file: `styles/modules/your-module.css`
4. Add to `index.php`:
   - Add `<link>` for CSS (around line 57)
   - Add `<script>` for JS (around line 343)
   - Add navigation tab button (around line 141)
5. Register in `app.js` (around line 1858):
```javascript
router.register('your-module', YourModule);
```

## Changing Colors/Theme

Edit `styles/theme.css`:
```css
:root {
    --primary: #your-color;
    --success: #your-color;
    --error: #your-color;
}
```

## Adding a New User Role

1. In `auth-manager.js`, add to `hasPermission()` method (~line 449):
```javascript
if (this.role === 'new-role') {
    const newRoleAllowed = ['view', 'filter', /* permissions */];
    return newRoleAllowed.includes(action);
}
```

2. In `admin-module.js`, add to role options (~line 622)
3. In `config.php`, add password constant

---

# Common Tasks and Where to Look

## "I want to change how flashcards flip"
Look in: `flashcards-module.js` lines 363-396 (click handler)
And: `styles/modules/flashcards.css` for animations

## "I want to add a new field to vocabulary cards"
Look in:
1. `deck-builder-module.js` - add column to table
2. `assets/manifest.json` - add field to card objects
3. `save-deck.php` - ensure field is preserved when saving

## "I want to change the login password"
Look in: `users.json` - change the password field
Or: `config.php` - change the default role passwords

## "I want to add a new language"
Look in:
1. `assets/manifest.json` - add to `languages` array
2. Create audio folder: `assets/audio/xxx/`
3. Create grammar folder: `assets/grammar/xxx/`

## "I want to change how audio plays"
Look in: `flashcards-module.js` function `playAudioSequentially()` (~line 425)
This same function exists in several modules.

## "I want to change the matching game rules"
Look in: `match-module.js`
- `expandToVirtualCards()` - how words are split
- `selectWord()` - what happens when you pick

## "I want to change the quiz validation"
Look in: `quiz-module.js` function `submitAnswer()` (~line 248)

## "I want to change how cards are filtered"
Look in: `app.js` class `FilterManager` (~line 517)
And: `AssetManager.getCards()` (~line 1050)

## "I want to add something to the Admin panel"
Look in: `admin-module.js` function `render()` (~line 17)
Add new collapsible section following the pattern.

## "I want to change what gets saved when cards are edited"
Look in: `save-deck.php` - this processes all card saves

---

# Quick Reference: Key Functions

## Getting Cards for Current Lesson
```javascript
const cards = assetManager.getCards();
// or with filters:
const cards = assetManager.getCards({ lesson: 5, hasAudio: true });
```

## Playing Audio
```javascript
const audio = new Audio(card.audioPath[0]);
audio.play();
```

## Showing a Toast Message
```javascript
toastManager.show('Your message here', 'success'); // or 'error', 'warning'
```

## Checking User Permission
```javascript
if (authManager.hasPermission('edit')) {
    // user can edit
}
```

## Navigating to a Module
```javascript
router.navigate('flashcards');
```

## Getting Current Language
```javascript
const lang = assetManager.currentLanguage; // {name: "Cebuano", trigraph: "ceb"}
```

---

# External Libraries Used

| Library | Purpose | Location |
|---------|---------|----------|
| Font Awesome 6.4 | Icons | CDN |
| jsPDF 2.5.1 | PDF generation | CDN |
| SortableJS 1.15 | Drag-and-drop | CDN |
| Driver.js | Guided tours | assets/vendor/ |
| Meyda.js | Audio analysis | assets/vendor/ |

---

# Summary

This application is a complete language learning platform with:

1. **Frontend**: JavaScript modules for each exercise type
2. **Backend**: PHP files for data management and authentication
3. **Data**: JSON manifest containing all vocabulary
4. **Assets**: Images and audio files for vocabulary

The code follows consistent patterns:
- Each module extends `LearningModule`
- Each module has `render()`, `init()`, `destroy()` methods
- PHP files handle saving data and security
- CSS is organized by module

When making changes:
1. Find the relevant module file
2. Look for the function that handles what you want to change
3. Test in the browser
4. Save card changes through the Deck Builder (uses `save-deck.php`)

The codebase is well-organized and each file has a specific purpose, making it manageable to modify specific features without affecting others.
