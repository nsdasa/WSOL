# Executive Summary: Bob and Mariel Ward School of Filipino Languages

**Version:** 4.2 | **Last Updated:** November 2025

---

## Overview

The Ward School of Filipino Languages (WSOL) is a comprehensive, interactive web-based language learning platform designed to teach three Philippine languages: **Cebuano**, **Maranao**, and **Sinama**. The application provides multiple learning modalities including flashcards, matching games, quizzes, grammar lessons, sentence building, and advanced voice practice with pronunciation analysis.

---

## Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Language Support** | Three Philippine languages with extensible architecture |
| **Interactive Learning Modules** | Six distinct learning activities for varied engagement |
| **Voice Analysis** | Advanced speech recognition with pitch, intensity, and pronunciation scoring |
| **Content Management** | Full deck builder system for instructors to create/edit lessons |
| **Guided Tours** | Interactive onboarding system with customizable tours |
| **PDF Export** | Generate printable lesson materials |
| **Role-Based Access** | Admin, Deck Manager, and Voice Recorder roles |

---

## Technology Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** PHP 7.4+
- **Server:** Apache with HTTPS enforcement
- **External Libraries:** Driver.js (tours), Meyda.js (audio analysis), jsPDF (exports)
- **AI Integration:** Anthropic API for pronunciation feedback

---

## Application Structure

```
WSOL/
├── Core Application
│   ├── index.php          # Main entry point
│   ├── app.js             # Application bootstrap & core managers
│   └── config.php         # Configuration & credentials
│
├── Learning Modules (7)
│   ├── flashcards-module.js      # Vocabulary study
│   ├── grammar-module.js         # Grammar lessons
│   ├── match-module.js           # Picture matching game
│   ├── match-sound-module.js     # Audio matching game
│   ├── quiz-module.js            # Assessment/testing
│   ├── sentence-builder-module.js # Sentence construction
│   └── voice-practice-module.js  # Pronunciation practice
│
├── Administration
│   ├── admin-module.js           # Admin dashboard
│   ├── deck-builder-module.js    # Content creation
│   └── auth-manager.js           # Authentication
│
├── Subsystems
│   ├── voice/                    # Voice analysis application
│   ├── rec/                      # Voice recording interface
│   ├── tour-editor/              # Tour builder application
│   └── converter/                # Asset conversion tools
│
├── Assets
│   ├── manifest.json             # Content metadata (185 cards)
│   ├── images/                   # Card images (PNG, WebP, GIF)
│   ├── audio/                    # Pronunciation files (M4A)
│   └── grammar/                  # Grammar content by language
│
└── Backend APIs (PHP)
    ├── auth.php                  # Authentication
    ├── scan-assets.php           # Asset discovery
    ├── save-deck.php             # Content persistence
    └── users.php                 # User management
```

---

## File Inventory with Function Summary

### Core Application Files

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `index.php` | Main HTML entry point; loads all modules, defines UI layout, enforces HTTPS | Entry point for all user sessions |
| `app.js` | Bootstrap application; initializes managers (Asset, Auth, Filter, Theme, Toast); routes between modules | Core orchestrator connecting all components |
| `config.php` | Stores admin credentials and session settings | Referenced by auth.php for authentication |
| `auth-manager.js` | Client-side authentication logic, session management | Connects to auth.php backend |

### Learning Modules

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `flashcards-module.js` | Flip-card vocabulary study with pagination and voice integration | Consumes AssetManager card data |
| `grammar-module.js` | Displays grammar lessons from CSV files by language | Loads grammar content from assets/grammar/ |
| `match-module.js` | Picture-to-word matching game with randomized distractors | Uses AssetManager for card images |
| `match-sound-module.js` | Audio-to-word matching game with native pronunciations | Uses AssetManager for audio files |
| `quiz-module.js` | Multiple-choice assessment with scoring | Generates questions from manifest data |
| `sentence-builder-module.js` | Drag-and-drop sentence construction | Uses Sentence_Words CSV files |
| `voice-practice-module.js` | Advanced pronunciation analysis (pitch, MFCC, DTW scoring) | Integrates with voice subsystem |

### Administration & Content Management

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `admin-module.js` | Admin dashboard with statistics, user management, settings | Requires admin authentication |
| `deck-builder-module.js` | CMS for creating/editing lesson cards | Writes to manifest.json via save-deck.php |
| `deck-builder-audio.js` | Audio file management for deck builder | Uploads via upload-audio.php |
| `deck-builder-uploads.js` | Image/media upload handling | Uploads via upload-media.php |
| `pdf-module.js` | PDF export generation | Reads from manifest, outputs PDF |
| `tour-guide.js` | Interactive onboarding tour system | Reads tour-config.json, uses Driver.js |

### Backend API Endpoints

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `auth.php` | Login/logout, session validation | Called by auth-manager.js |
| `scan-assets.php` | Discovers all assets, generates manifest.json | Admin-triggered, updates manifest |
| `save-deck.php` | Persists card/lesson changes | Called by deck-builder-module.js |
| `users.php` | CRUD operations for user accounts | Called by admin-module.js |
| `upload-audio.php` | Handles M4A audio file uploads | Called by deck-builder-audio.js |
| `upload-media.php` | Handles image file uploads | Called by deck-builder-uploads.js |
| `list-assets.php` | Returns asset inventory | Used by deck builder for browsing |
| `rename-asset.php` | Renames asset files | Used by deck builder |

### Tour System Files

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `tour-config.json` | Stores tour step definitions | Read by tour-guide.js |
| `save-tour-config.php` | Persists tour configuration changes | Called by tour-editor |
| `tour-editor/index.php` | Tour creation/editing interface | Standalone application |
| `tour-editor/tour-editor-app.js` | Tour editor logic | Main tour editor controller |

### Voice Analysis Subsystem

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `voice/index.php` | Voice analysis application UI | Standalone pronunciation trainer |
| `voice/js/main.js` | Voice system orchestration | Coordinates all voice modules |
| `voice/js/modules/pitch.js` | Pitch extraction algorithms | Used by scoring.js |
| `voice/js/modules/intensity.js` | Loudness/intensity analysis | Used by scoring.js |
| `voice/js/modules/mfcc.js` | MFCC feature extraction | Used by scoring.js |
| `voice/js/modules/fft.js` | FFT and spectrogram generation | Used by visualizer.js |
| `voice/js/modules/dtw.js` | Dynamic Time Warping comparison | Used by scoring.js |
| `voice/js/modules/scoring.js` | Pronunciation scoring algorithm | Combines all analysis metrics |
| `voice/js/modules/visualizer.js` | Waveform canvas visualization | Displays audio feedback |
| `voice/js/modules/ai-api.js` | Anthropic API integration | AI-powered pronunciation feedback |

### Voice Recorder Subsystem

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `rec/index.php` | Voice recorder application UI | Standalone recording tool |
| `rec/voice-recorder-app.js` | Recording logic and management | Handles audio capture |
| `rec/voice-recorder.css` | Recorder styling | Styles recorder interface |

### Converter System

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `converter/index.php` | Asset and manifest conversion tools | Admin utility for data migration |

### Styling

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `styles/core.css` | Base layout and component styles | Loaded by index.php |
| `styles/theme.css` | Light/dark theme CSS variables | Managed by ThemeManager |
| `styles/modules/*.css` | Module-specific styling (11 files) | Loaded per-module |

### Data Files

| File | Function | Structure Relationship |
|------|----------|----------------------|
| `assets/manifest.json` | Master content database (185 cards) | Central data source for all modules |
| `users.json` | User credentials database | Read/written by users.php |
| `.htaccess` | Apache configuration (caching, security, uploads) | Server-level configuration |
| `assets/Language_List.csv` | Language definitions | Used by AssetManager |
| `assets/Word_List_*.csv` | Vocabulary lists per language | Used by learning modules |
| `assets/Sentence_Words_ceb.csv` | Sentence builder word bank | Used by sentence-builder-module.js |

### Asset Directories

| Directory | Contents | Structure Relationship |
|-----------|----------|----------------------|
| `assets/images/` | 185+ PNG, WebP, GIF card images | Referenced in manifest.json |
| `assets/audio/` | 57 M4A pronunciation files | Referenced in manifest.json |
| `assets/grammar/ceb/` | Cebuano grammar content | Loaded by grammar-module.js |
| `assets/grammar/mrw/` | Maranao grammar content | Loaded by grammar-module.js |
| `assets/grammar/sin/` | Sinama grammar content | Loaded by grammar-module.js |
| `assets/vendor/` | External libraries (Driver.js, Meyda.js) | Loaded by index.php |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  index.php ─────────────────────────────────────────────────────────────│
│       │                                                                  │
│       ├── app.js (Core Application)                                      │
│       │       ├── DeviceDetector (responsive behavior)                   │
│       │       ├── AssetManager (manifest.json → card data)               │
│       │       ├── AuthManager (auth.php ← → sessions)                    │
│       │       ├── FilterManager (lesson/grammar filtering)               │
│       │       ├── ThemeManager (light/dark mode)                         │
│       │       ├── ToastManager (notifications)                           │
│       │       └── Router (module switching)                              │
│       │                                                                  │
│       ├── Learning Modules                                               │
│       │       ├── flashcards-module.js                                   │
│       │       ├── grammar-module.js                                      │
│       │       ├── match-module.js                                        │
│       │       ├── match-sound-module.js                                  │
│       │       ├── quiz-module.js                                         │
│       │       ├── sentence-builder-module.js                             │
│       │       └── voice-practice-module.js                               │
│       │                                                                  │
│       ├── Admin & Content                                                │
│       │       ├── admin-module.js                                        │
│       │       ├── deck-builder-module.js                                 │
│       │       ├── pdf-module.js                                          │
│       │       └── tour-guide.js                                          │
│       │                                                                  │
│       └── Subsystems (standalone apps)                                   │
│               ├── voice/ (pronunciation analysis)                        │
│               ├── rec/ (voice recording)                                 │
│               └── tour-editor/ (tour creation)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           APACHE SERVER (PHP)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  API Endpoints                                                           │
│       ├── auth.php (login/sessions)                                      │
│       ├── scan-assets.php (manifest generation)                          │
│       ├── save-deck.php (content persistence)                            │
│       ├── users.php (user management)                                    │
│       ├── upload-audio.php / upload-media.php (file uploads)             │
│       └── tour config APIs (save, load, backup, restore)                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             FILE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Data                              │  Assets                             │
│       ├── manifest.json            │       ├── images/ (PNG, WebP, GIF)  │
│       ├── users.json               │       ├── audio/ (M4A)              │
│       ├── tour-config.json         │       └── grammar/ (CSV, HTML)      │
│       └── config.php               │                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total JavaScript | 16,087 lines |
| Total PHP | 19,944 lines |
| Total Files | 133 |
| Card Images | 185+ |
| Audio Files | 57 |
| Languages Supported | 3 |
| Learning Modules | 7 |
| Application Size | 7.5 MB |

---

## Security Features

- HTTPS enforcement via .htaccess
- Session-based authentication with configurable timeout
- Role-based access control (Admin, Deck Manager, Voice Recorder)
- Protected sensitive files (.env, .git, credentials)
- File upload limits (100MB max)
- Cache control headers on API endpoints

---

## Contact & Support

This application is maintained for the Bob and Mariel Ward School of Filipino Languages.

---

*This document provides a high-level overview. For detailed technical documentation suitable for AI-assisted development, see `AI_CODEBASE_CONTEXT.md`.*
