/***************************************************************************
 * BOB AND MARIEL WARD SCHOOL OF FILIPINO LANGUAGES
 * QUICK REFERENCE GUIDE v3.2 (UPDATED)
 * 
 * CHANGES IN v3.2:
 * - ? Authentication system for Admin and Deck Builder modules
 * - ? Enhanced Deck Builder: editable card numbers, categories modal, file rename warnings
 * - ? Complete cache prevention on all manifest/asset fetches
 * - ? File browser system for selecting/uploading assets
 * - ? Modular CSS architecture (core.css, theme.css, module-specific)
 * - ? Session timeout management
 * 
 * USAGE: Paste this at the start of conversations when working on modules
 * FULL CONTEXT: See original analysis conversation for deep dive
 ***************************************************************************/

/* ========================================================================
   WHEN TO USE THIS REFERENCE
   ======================================================================== */
// ? Editing a single module and need architecture context
// ? Can't access conversation history
// ? Quick reminder of API methods
// ? Don't paste this if just referencing past conversation

/* ========================================================================
   ARCHITECTURE OVERVIEW
   ======================================================================== */
Tech Stack:     Vanilla JS (ES6+), PHP backend, JSON manifest, CSS3, Session-based auth
Pattern:        SPA with hash-based routing + authentication guard
Base Class:     LearningModule (all modules extend this)
Lifecycle:      constructor() ? render() ? init() ? destroy()
Entry Point:    index.php ? app.js ? auth check ? module files
Version:        3.2 (Authentication + Enhanced Deck Builder)

File Structure:
+-- app.js                      // Core: managers, base classes, router
+-- auth-manager.js             // NEW: Client-side authentication handler
+-- auth.php                    // NEW: Server-side session validation
+-- config.php                  // NEW: Admin password and settings
+-- [module]-module.js          // Individual learning modules
+-- scan-assets.php             // Server-side: CSV upload + asset processor
+-- list-assets.php             // NEW: File browser endpoint
+-- rename-asset.php            // NEW: File rename endpoint
+-- styles/
¦   +-- core.css                // Base styles, layouts, utilities
¦   +-- theme.css               // Dark/light theme variables
¦   +-- modules/
¦       +-- flashcards.css      // Module-specific styles
¦       +-- match.css
¦       +-- deck-builder.css    // UPDATED: New UI components
¦       +-- ...
+-- assets/
    +-- manifest.json           // Generated card catalog (auto-created)
    +-- Language_List.csv       // Language definitions (uploaded via web)
    +-- Word_List.csv           // Word translations (uploaded via web)
    +-- [files]                 // PNG/GIF/MP3 following naming convention

/* ========================================================================
   AUTHENTICATION SYSTEM (v3.2 - NEW MAJOR FEATURE)
   ======================================================================== */

// Protected Modules: Admin, Deck Builder
// Public Modules: Flashcards, Match modules, Quiz, PDF

// Authentication Flow:
1. User clicks on protected module tab
2. Router calls authManager.requireAuth(moduleName)
3. If not authenticated, shows login modal
4. On successful login, session created on server
5. Session expires after timeout (default: 30 minutes)
6. Logout button appears in header when authenticated

// AuthManager Methods:
authManager.init()                          // Initialize auth system
authManager.checkSession()                  // Verify server session
authManager.requireAuth(moduleName)         // Check access, show login if needed
authManager.logout()                        // Clear session, return to flashcards
authManager.setSessionTimeout(minutes)      // Update timeout (5-480 minutes)

// Server Endpoints (auth.php):
GET  auth.php?action=check                  // Verify session status
POST auth.php?action=login                  // Authenticate with password
GET  auth.php?action=logout                 // Destroy session
POST auth.php?action=setTimeout             // Update session timeout

// Session Response Structure:
{
  authenticated: true/false,
  timeout_minutes: 30,
  time_remaining: 1234,  // seconds
  reason: "Session expired"  // if authenticated=false
}

// Config File (config.php):
define('ADMIN_PASSWORD', 'admin123');       // Change this!
define('DEFAULT_SESSION_TIMEOUT', 30);      // Minutes
define('SESSION_NAME', 'bmw_school_session');

// Login Modal UI Elements:
<div id="loginModal">
  <input type="password" id="adminPassword">
  <button id="loginSubmitBtn">Login</button>
  <button id="loginCancelBtn">Cancel</button>
  <div id="loginError" class="hidden"></div>
</div>

// Usage in Router:
async navigate(moduleName) {
    const canAccess = await authManager.requireAuth(moduleName);
    if (!canAccess) return;
    // Proceed with navigation...
}

/* ========================================================================
   CACHE PREVENTION (v3.2 - CRITICAL UPDATE)
   ======================================================================== */

// All manifest and asset fetches now include cache prevention to ensure
// fresh data after CSV uploads or asset rescans

// Cache Prevention Pattern:
const timestamp = new Date().getTime();
const response = await fetch(`assets/manifest.json?_=${timestamp}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});

// Applied in:
- assetManager.loadManifest()          // Main manifest loading
- deck-builder loadServerFiles()       // File browser
- deck-builder renameFileOnServer()    // File rename operations
- Any other dynamic content fetches

// Why This Matters:
// Without cache prevention, browsers may serve stale manifest.json after
// uploading new CSVs, causing confusion about which cards are available.

/* ========================================================================
   DECK BUILDER MODULE ENHANCEMENTS (v3.2)
   ======================================================================== */

// NEW FEATURES:

1. EDITABLE CARD NUMBERS
   - Card # column now has input field instead of static text
   - On blur, validates if new number already exists
   - Shows warning popup if duplicate found
   - Updates editedCards map with new card number

   handleCardNumberChange(oldCardNum, newCardNum) {
       // Check for existing card
       const existingCard = this.allCards.find(c => c.wordNum === newCardNum);
       if (existingCard) {
           alert(`Card #${newCardNum} already exists: ${word} / ${english}`);
       }
       this.handleFieldEdit(oldCardNum, 'wordNum', newCardNum);
   }

2. CATEGORIES MODAL EDITOR
   - New "Categories" button in each row
   - Opens modal for Grammar/Category/SubCategory1/SubCategory2/ACTFLEst
   - Saves data back to card object
   - Modal includes form validation and keyboard shortcuts

   openCategoriesModal(cardId) {
       // Populate modal fields
       document.getElementById('catGrammar').value = card.grammar || '';
       // Show modal
       document.getElementById('categoriesModal').classList.remove('hidden');
   }

3. FILE RENAME WARNING SYSTEM
   - Validates filename against expected pattern when selecting files
   - Shows warning modal if filename doesn't match convention
   - Offers three options:
     a) Rename & Link (recommended)
     b) Link Anyway (warning given)
     c) Cancel
   - Suggests proper filename based on card data

   Expected Patterns:
   PNG/GIF: {wordNum}.{description}.{ext}
            Example: 17.tilaw.taste.png
   
   Audio:   {wordNum}.{lang}.{description}.{ext}
            Example: 17.ceb.tilaw.taste.mp3

   validateFilename(cardId, filename, fileType, audioLang) {
       const wordNum = cardId;
       const basename = filename.split('/').pop();
       
       if (fileType === 'png' || fileType === 'gif') {
           isValid = new RegExp(`^${wordNum}\\.`).test(basename);
       } else if (fileType === 'audio' && audioLang) {
           isValid = new RegExp(`^${wordNum}\\.${audioLang}\\.`).test(basename);
       }
       
       return { isValid, expectedPattern, actualFilename };
   }

   generateSuggestedFilename(card, fileType, audioLang) {
       const wordNum = card.wordNum;
       const cebuano = getCardWord(card, 'cebuano').toLowerCase();
       const english = getCardWord(card, 'english').toLowerCase();
       
       if (fileType === 'png') {
           return `${wordNum}.${cebuano}.${english}.png`;
       } else if (fileType === 'audio' && audioLang) {
           return `${wordNum}.${audioLang}.${cebuano}.${english}.mp3`;
       }
   }

4. FILE BROWSER SYSTEM
   - Browse existing files in /assets folder
   - Visual preview for images
   - Audio playback for .mp3 files
   - Search and filter capabilities
   - Shows current file with preview

   File Browser UI Components:
   - Browse Tab: Grid of server files with thumbnails
   - Upload Tab: File selection interface
   - Current File Preview: Shows assigned file with preview
   - Search/Filter: Real-time filtering of file list

   showFileSelectionModal(cardId, fileType, audioLang) {
       // Create modal with tabs
       // Load server files
       // Setup event listeners
       // Handle file selection or upload
   }

5. DUAL "ADD NEW CARD" BUTTONS
   - Button at top (in header)
   - Button at bottom (after table)
   - Both call same addNewCard() method
   - Scroll to new card and highlight

6. ADD CARD BELOW
   - New button in Actions column: "+"
   - Inserts new card immediately after current card
   - Maintains same lesson as parent card

   addCardBelow(cardId) {
       const card = this.allCards.find(c => c.wordNum === cardId);
       this.addNewCard(card.lesson, cardId);
   }

// Deck Builder Event Listeners (Updated):
setupEventListeners() {
    // THREE add card buttons
    document.getElementById('addCardBtn').addEventListener('click', () => this.addNewCard());
    document.getElementById('addCardBtnTop').addEventListener('click', () => this.addNewCard());
    document.getElementById('addCardBtnBottom').addEventListener('click', () => this.addNewCard());
    
    // Categories modal
    document.getElementById('saveCategoriesBtn').addEventListener('click', () => this.saveCategoriesData());
    document.getElementById('closeCategoriesModal').addEventListener('click', () => this.closeCategoriesModal());
}

// File Operations:
async renameFileOnServer(oldFilename, newFilename) {
    const timestamp = new Date().getTime();
    const response = await fetch(`rename-asset.php?_=${timestamp}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ oldFilename, newFilename }),
        cache: 'no-store'
    });
    return await response.json();
}

async loadServerFiles(fileType, audioLang) {
    const timestamp = new Date().getTime();
    const response = await fetch(`list-assets.php?type=${fileType}&_=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
    const result = await response.json();
    this.displayServerFiles(result.files);
}

/* ========================================================================
   SERVER-SIDE FILE ENDPOINTS (NEW in v3.2)
   ======================================================================== */

// list-assets.php - Returns list of files in /assets folder
GET list-assets.php?type={fileType}

Response:
{
  success: true,
  files: [
    {
      name: "17.tilaw.taste.png",
      path: "assets/17.tilaw.taste.png",
      type: "png",
      size: 45678
    },
    ...
  ]
}

// rename-asset.php - Renames file on server
POST rename-asset.php
Body: { oldFilename: "old.png", newFilename: "new.png" }

Response:
{
  success: true,
  message: "File renamed successfully"
}

// Implementation needed on server:
<?php
// list-assets.php
$type = $_GET['type'] ?? 'all';
$files = [];
$dir = __DIR__ . '/assets';

foreach (scandir($dir) as $file) {
    if ($file === '.' || $file === '..') continue;
    
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    if ($type === 'all' || $ext === $type) {
        $files[] = [
            'name' => $file,
            'path' => 'assets/' . $file,
            'type' => $ext,
            'size' => filesize($dir . '/' . $file)
        ];
    }
}

echo json_encode(['success' => true, 'files' => $files]);
?>

<?php
// rename-asset.php
$data = json_decode(file_get_contents('php://input'), true);
$oldPath = __DIR__ . '/assets/' . basename($data['oldFilename']);
$newPath = __DIR__ . '/assets/' . basename($data['newFilename']);

if (rename($oldPath, $newPath)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Rename failed']);
}
?>

/* ========================================================================
   MODULAR CSS ARCHITECTURE (v3.2)
   ======================================================================== */

// CSS Structure:
styles/
+-- core.css              // Base styles, layouts, form elements, buttons
+-- theme.css             // CSS custom properties for light/dark themes
+-- modules/
    +-- flashcards.css    // Flashcard-specific styles
    +-- match.css         // Picture match styles
    +-- match-sound.css   // Audio match styles
    +-- quiz.css          // Quiz module styles
    +-- admin.css         // Admin panel styles
    +-- pdf-print.css     // PDF generation styles
    +-- deck-builder.css  // Deck builder editor styles

// Loading in index.php:
<link rel="stylesheet" href="styles/core.css?v=<?php echo filemtime('styles/core.css'); ?>">
<link rel="stylesheet" href="styles/theme.css?v=<?php echo filemtime('styles/theme.css'); ?>">
<link rel="stylesheet" href="styles/modules/flashcards.css?v=<?php echo filemtime('...'); ?>">

// Benefits:
- Easier maintenance (changes isolated to relevant files)
- Faster page loads (browsers can cache individual files)
- Better organization (each module has its own styles)
- Cache busting via filemtime() timestamps

// Deck Builder Specific CSS Classes (NEW):
.deck-builder                    // Main container
.categories-btn                  // Categories modal trigger button
.card-num-input                  // Editable card number input
.file-selection-modal            // File browser modal overlay
.file-selection-tabs             // Tab buttons (Browse/Upload)
.file-browser-grid               // Grid of server files
.file-browser-item               // Individual file card
.file-preview                    // Image/audio preview area
.audio-filename                  // Prominent audio filename display
.rename-warning-modal            // Filename validation warning
.current-file-preview            // Shows currently assigned file
.add-below-btn                   // + button for adding card below

/* ========================================================================
   GLOBAL MANAGERS (Available in all modules)
   ======================================================================== */

// --- AUTH MANAGER (NEW in v3.2) ---
authManager.authenticated                // Current auth state (boolean)
authManager.timeoutMinutes               // Session timeout setting
authManager.init()                       // Setup auth system
authManager.checkSession()               // Verify server session
authManager.requireAuth(moduleName)      // Check access (returns Promise)
authManager.logout()                     // Clear session
authManager.setSessionTimeout(minutes)   // Update timeout (5-480)

// --- ASSET MANAGER (UPDATED with cache prevention) ---
assetManager.cards                       // All loaded cards (raw)
assetManager.languages                   // Available languages array
assetManager.currentLanguage             // { id, name, trigraph }
assetManager.currentLesson               // Current lesson number
assetManager.loadManifest()              // NOW with cache prevention
assetManager.getCards(filters)           // Get filtered + enriched cards
assetManager.enrichCard(card)            // Adds computed properties to card
assetManager.setLanguage(trigraph)       // Switch learning language
assetManager.setLesson(number)           // Switch lesson
assetManager.revokeAllUrls()             // Clean up object URLs

// --- ROUTER (UPDATED with auth guard) ---
router.navigate(moduleName)              // NOW checks auth before navigation
router.currentModule                     // Active module instance
router.routes                            // Registered module map

// --- DEVICE DETECTOR ---
deviceDetector.deviceType                // 'mobile-phone' | 'mobile-tablet' | 'desktop'
deviceDetector.orientation               // 'portrait' | 'landscape'
deviceDetector.isMobileDevice()          // true if phone
deviceDetector.isTabletDevice()          // true if tablet
deviceDetector.getCardsPerPage()         // 1 (phone) / 2-4 (tablet) / 4 (desktop)

// --- UI MANAGERS ---
toastManager.show(msg, type, duration)
  // type: 'success' | 'error' | 'warning'
  // duration: milliseconds (default: 3000)

debugLogger.log(severity, message)
  // severity: 1 (error) | 2 (warning) | 3 (info)

instructionManager.show(moduleId, title, text)
  // Shows modal once per session per module
  // moduleId: unique identifier to prevent repeat shows

// --- SCORE TRACKER ---
scoreTracker = new ScoreTracker()
scoreTracker.reset()
scoreTracker.recordAnswer(isCorrect, card)
scoreTracker.getPercentage()             // 0-100
scoreTracker.getSummary()                // { correct, total, percentage, details }

/* ========================================================================
   CSV UPLOAD SYSTEM (v3.1 - Unchanged)
   ======================================================================== */

// Admin module now supports direct CSV file upload instead of requiring FTP

// Upload Options (Radio Selection in Admin Panel):
1. "Both Lists (Language + Word)" - Upload both CSVs at once
2. "Language List Only" - Update only language data, use existing Word_List
3. "Word List Only" - Update only word data, use existing Language_List
4. "Rescan Assets Only" - No CSV upload, just rescan existing image/audio files

// CSV Validation Rules:
Language CSV: Must have 3 columns (ID, Name, Trigraph)
- ID must be numeric
- Name must not be empty
- Trigraph must be exactly 3 characters
- Any filename accepted (validates structure, not name)

Word CSV: Must have 16 columns (Lesson ? Type)
- Lesson must be numeric
- WordNum must be numeric
- Type column at index [15]: "N" (New) or "R" (Review)
- Any filename accepted (validates structure, not name)

/* ========================================================================
   VIRTUAL CARD SYSTEM (Critical for multi-word support)
   ======================================================================== */

// PROBLEM: Cards with "eat/taste" show both answers as distractors
// SOLUTION: Expand to virtual cards, one per acceptable answer

expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        const acceptableAnswers = card.acceptableAnswers || [card.cebuano];
        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.wordNum,           // Original card ID
                targetWord: targetWord,         // Specific word being tested
                physicalIndex: physicalIndex,   // Index in allCards array
                imagePath: card.imagePath,
                audioPath: card.audioPath,
                allWords: acceptableAnswers,    // For exclusion logic
                originalCard: card              // Full card reference
            });
        });
    });
    return virtualCards;
}

// CRITICAL EXCLUSION LOGIC: Never show words from same physical card together
const currentCardId = this.virtualCards[this.currentTargetIdx].cardId;
const eligibleDistractors = available.filter(idx => {
    const vc = this.virtualCards[idx];
    return vc.cardId !== currentCardId;  // ? Prevents "eat" + "taste" together
});

/* ========================================================================
   MODULE BASE CLASS PATTERN
   ======================================================================== */

class YourModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        // Module-specific state
        this.allCards = [];
        this.virtualCards = [];
        this.currentMode = 'review';  // 'review' | 'test'
        this.unmatched = new Set();
        this.scoreTracker = new ScoreTracker();
    }
    
    async render() {
        // Build HTML structure
        this.container.innerHTML = `
            <div class="container module-yourname">
                <h1>Module Title</h1>
                <div class="controls">
                    <div class="mode-buttons">
                        <button class="mode-btn active" data-mode="review">Review</button>
                        <button class="mode-btn" data-mode="test">Test</button>
                    </div>
                    <button id="startBtn">Start</button>
                </div>
                <div id="gameContainer"></div>
            </div>
        `;
    }
    
    async init() {
        // Check prerequisites
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showEmptyState('Please select a language and lesson');
            return;
        }
        
        // Load cards
        this.allCards = this.assets.getCards({ hasAudio: true });
        if (this.allCards.length === 0) {
            this.showEmptyState('No cards available');
            return;
        }
        
        // Expand to virtual cards if needed
        this.virtualCards = this.expandToVirtualCards(this.allCards);
        
        // Setup event listeners
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        
        // Show instructions (once per session)
        if (instructionManager) {
            instructionManager.show('yourmodule', 'Title', 'Instructions text here');
        }
    }
    
    destroy() {
        // Clear intervals
        if (this.someInterval) clearInterval(this.someInterval);
        // Call parent cleanup
        super.destroy();
    }
}

/* ========================================================================
   CARD DATA STRUCTURE (UPDATED v3.1)
   ======================================================================== */
{
  wordNum: 17,                           // Unique identifier
  lesson: 1,                             // Lesson number
  imagePath: "assets/17.tilaw.gif",      // Display (GIF preferred over PNG)
  printImagePath: "assets/17.tilaw.png", // Print-only (always PNG)
  hasImage: true,                        // Boolean flag
  hasGif: true,                          // Has animated version
  hasAudio: true,                        // Has at least one audio file
  audio: {                               // Per-language audio paths
    ceb: "assets/17.ceb.tilaw.taste.mp3",
    eng: "assets/17.eng.tilaw.taste.mp3",
    mrw: "assets/17.mrw.tilaw.taste.mp3",
    sin: "assets/17.sin.tilaw.taste.mp3"
  },
  translations: {                        // All language translations
    cebuano: {
      word: "tilaw/lami",                // Display text (slash-separated variants)
      note: "also means delicious",       // Optional usage note
      acceptableAnswers: ["tilaw", "lami"] // Auto-parsed from slash
    },
    english: {
      word: "taste",
      note: "",
      acceptableAnswers: ["taste"]
    },
    // ... maranao, sinama
  },
  
  // v3.1 fields:
  type: "N",                     // "N" (New word) or "R" (Review word)
  grammar: "verb",               // Returns null if blank (not empty string)
  category: null,                // Returns null instead of ""
  subCategory1: "transitive",    // Returns null if blank
  subCategory2: null,            // Returns null if blank
  actflEst: "novice-mid"         // Returns null if blank
}

// ENRICHED CARD (after assetManager.enrichCard())
// Adds computed properties:
{
  ...card,
  allTranslations: { cebuano: {...}, english: {...}, ... },
  acceptableAnswers: ["tilaw", "lami"],  // For current learning language
  audioPath: "assets/17.ceb.tilaw.mp3"   // For current learning language
}

// NULL Checking Pattern (v3.1):
if (card.grammar) {  // ? Simple truthiness check now works
    // Grammar exists and is not null
}

/* ========================================================================
   FILE NAMING CONVENTIONS (Critical for asset scanning)
   ======================================================================== */

Images:
  WordNum.description.ext
  17.tilaw.taste.png          // Static (required for printing)
  17.tilaw.taste.gif          // Animated (optional, preferred for web)

Audio:
  WordNum.trigraph.description.ext
  17.ceb.tilaw.taste.mp3      // Cebuano pronunciation
  17.eng.tilaw.taste.mp3      // English pronunciation
  17.mrw.tilaw.taste.mp3      // Maranao
  17.sin.tilaw.taste.mp3      // Sinama

Special Files:
  logo.png                    // App logo (excluded from scanning)
  Language_List.csv           // Language definitions (uploaded via web)
  Word_List.csv               // Word translations (uploaded via web)

/* ========================================================================
   COMMON UI PATTERNS
   ======================================================================== */

// --- EMPTY STATE ---
showEmptyState(message) {
    this.container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// --- PROGRESS BAR ---
updateProgress() {
    const total = this.virtualCards.length;
    const completed = total - this.unmatched.size;
    const percentage = Math.round((completed / total) * 100);
    
    document.getElementById('progressText').textContent = `${completed}/${total}`;
    document.getElementById('progressFill').style.width = `${percentage}%`;
}

// --- FEEDBACK ANIMATION ---
showFeedback(symbol, type) {  // 'OK' or 'X', 'correct' or 'incorrect'
    const feedback = document.getElementById('feedback');
    feedback.innerHTML = symbol;
    feedback.className = `feedback ${type} show`;
    setTimeout(() => feedback.classList.remove('show'), 1000);
}

// --- PLAY AUDIO ---
playAudio(audioPath) {
    if (!audioPath) return;
    const audio = new Audio(audioPath);
    audio.play().catch(err => {
        debugLogger.log(1, `Audio play error: ${err.message}`);
    });
}

// --- SHUFFLE ARRAY ---
shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

/* ========================================================================
   CSS CUSTOM PROPERTIES (Available globally)
   ======================================================================== */
--primary: #4F46E5              // Primary brand color
--primary-dark: #4338CA          // Darker shade
--secondary: #10B981             // Success/secondary actions
--error: #EF4444                 // Error states
--warning: #F59E0B               // Warning states
--success: #10B981               // Success states
--bg-primary: #FFFFFF            // Main background (dark: #1F2937)
--bg-secondary: #F9FAFB          // Secondary background (dark: #111827)
--text-primary: #111827          // Primary text (dark: #F9FAFB)
--text-secondary: #6B7280        // Secondary text (dark: #9CA3AF)
--border-color: #E5E7EB          // Borders (dark: #374151)
--shadow-sm: 0 1px 2px rgba...   // Small shadow
--shadow-md: 0 4px 6px rgba...   // Medium shadow
--shadow-lg: 0 10px 15px rgba... // Large shadow

/* ========================================================================
   COMMON DEBUGGING PATTERNS
   ======================================================================== */

// Log card data
debugLogger.log(3, `Loaded ${this.allCards.length} cards for lesson ${this.assets.currentLesson}`);

// Track virtual card expansion
debugLogger.log(3, `Expanded ${this.allCards.length} physical ? ${this.virtualCards.length} virtual cards`);

// Monitor authentication
debugLogger.log(2, `Admin authenticated successfully`);
debugLogger.log(2, `Access denied to ${moduleName} - authentication required`);

// Check asset availability
if (!card.hasAudio) {
    debugLogger.log(2, `Card ${card.wordNum} missing audio for ${this.assets.currentLanguage.trigraph}`);
}

// File operations
debugLogger.log(2, `File renamed: ${oldFilename} ? ${newFilename}`);
debugLogger.log(2, `Upload complete: ${result.stats.totalCards} cards processed`);

/* ========================================================================
   QUICK TROUBLESHOOTING
   ======================================================================== */

Problem: Can't access Admin or Deck Builder modules
? Check: Authentication system enabled and auth.php accessible
? Check: config.php has correct password
? Debug: console.log(authManager.authenticated)

Problem: Manifest not updating after CSV upload
? Check: Cache prevention headers in loadManifest()
? Check: Browser DevTools Network tab shows "no-cache"
? Solution: Force hard refresh (Ctrl+Shift+R)

Problem: File browser not showing files
? Check: list-assets.php exists on server
? Check: Server permissions on /assets folder
? Debug: Check Network tab for 404 or permission errors

Problem: File rename not working
? Check: rename-asset.php exists on server
? Check: Write permissions on /assets folder
? Debug: Check server response in Network tab

Problem: Login modal not appearing
? Check: loginModal element exists in index.php
? Check: auth-manager.js loaded before modules
? Debug: console.log(authManager)

Problem: Cards not loading
? Check: assetManager.currentLanguage and currentLesson are set
? Check: manifest.json exists and has cards for that lesson
? Debug: console.log(this.assets.getCards())

Problem: Module not rendering
? Check: Module registered in router (app.js init)
? Check: Module class exported/available globally
? Debug: console.log(router.routes)

Problem: Responsive layout broken
? Check: DeviceDetector initialized before modules
? Check: Body classes applied (mobile-phone, etc.)
? Debug: console.log(deviceDetector.deviceType)

/* ========================================================================
   MODULE-SPECIFIC NOTES
   ======================================================================== */

FLASHCARDS MODULE:
- Supports multi-language back display (max 2 secondary languages)
- Auto-expands for long words (.card-expanded class)
- Speaker icon plays audio for current learning language

MATCH MODULES (Picture/Audio):
- ALWAYS show 4 options in both Review and Test modes
- Use virtual cards + exclusion logic for multi-word entries
- Review mode: configurable repetitions before mastery
- Test mode: swap all options after each selection

QUIZ MODULE:
- Spaced repetition: wrong answers reappear after 3+ cards
- Mobile layout: Image on top, input below
- Accepts all words in acceptableAnswers array

PDF MODULE:
- Three formats: Flashcards (2-sided), Unsa Ni (worksheet), Matching (game)
- Live preview in modal before download
- Flashcards: 4 per page, back positions horizontally flipped for duplex

ADMIN MODULE:
- Real-time stats (refresh every 5 seconds)
- CSV upload interface with validation
- "Upload & Process" - Uploads CSVs + scans assets
- "Rescan Assets Only" - Just rescans existing files
- Debug log synced with main debug console
- **PROTECTED**: Requires authentication

DECK BUILDER MODULE (v3.2 ENHANCED):
- Visual card editor with inline editing
- Editable card numbers with duplicate detection
- Categories modal for grammar/category fields
- File browser for selecting/uploading assets
- File rename warnings with suggested filenames
- Dual "Add Card" buttons (top + bottom)
- Add card below any row
- Real-time validation and unsaved indicator
- **PROTECTED**: Requires authentication

/* ========================================================================
   VERSION HISTORY
   ======================================================================== */

v3.2 (Current) - November 2025
- ? Authentication system (session-based, 30min timeout)
- ? Enhanced Deck Builder with editable card numbers
- ? Categories modal for grammar/category fields
- ? File rename warning system with validation
- ? File browser with preview and search
- ? Complete cache prevention on all fetches
- ? Modular CSS architecture
- ? Dual "Add Card" buttons and "Add Below" feature

v3.1 - November 2025
- ? CSV Upload System via web interface
- ? Type column added (N=New, R=Review)
- ? wordVersion column removed
- ? NULL handling for blank grammar fields
- ? Any CSV filename accepted (validates content)

v3.0 - November 2025
- Multi-language support (4 languages)
- Virtual card system for multi-word entries
- 6 interactive modules
- PDF generation (3 formats)
- Responsive design with device detection
- Asset management via PHP backend

/* ========================================================================
   SECURITY NOTES (v3.2)
   ======================================================================== */

// Password Security:
- Change ADMIN_PASSWORD in config.php immediately after deployment
- Use strong password (8+ characters, mixed case, numbers, symbols)
- Consider implementing password hashing for production use
- Session timeout enforced server-side

// File Operations Security:
- basename() used in file operations to prevent directory traversal
- File type validation on upload
- Server-side permission checks required

// Session Management:
- Sessions expire after timeout (default 30 minutes)
- Last activity timestamp updated on each auth check
- Logout clears session completely

/* ========================================================================
   END OF QUICK REFERENCE v3.2
   Save this file as: QUICK_REFERENCE_v3.2.js or .md
   Paste when starting conversations about module edits
   ======================================================================== */