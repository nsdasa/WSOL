/***************************************************************************
 * BOB AND MARIEL WARD SCHOOL OF FILIPINO LANGUAGES
 * QUICK REFERENCE GUIDE v3.1 (UPDATED - MODULAR CSS)
 * 
 * CHANGES IN v3.1:
 * - ? CSV Upload System (upload files via web interface)
 * - ? Type column added (N=New, R=Review) at index 15
 * - ? wordVersion column removed
 * - ? NULL handling for blank grammar fields
 * - ? Any CSV filename accepted (validates content only)
 * - ? MODULAR CSS: Split into 9 files for context efficiency
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
Tech Stack:     Vanilla JS (ES6+), PHP backend, JSON manifest, CSS3
Pattern:        SPA with hash-based routing
Base Class:     LearningModule (all modules extend this)
Lifecycle:      constructor() ? render() ? init() ? destroy()
Entry Point:    index.php ? app.js ? module files
Version:        3.1 (CSV Upload System + Modular CSS)

File Structure:
+-- app.js                 // Core: managers, base classes, router
+-- [module]-module.js     // Individual learning modules
+-- scan-assets.php        // Server-side: CSV upload + asset processor
+-- styles/                // Modular CSS (v3.1+)
¦   +-- core.css          // Shared: variables, header, buttons, forms, modals (~400 lines)
¦   +-- theme.css         // Dark mode, mobile responsive, device detection (~200 lines)
¦   +-- modules/
¦       +-- flashcards.css      (~250 lines)
¦       +-- match.css           (~200 lines)
¦       +-- match-sound.css     (~150 lines)
¦       +-- quiz.css            (~200 lines)
¦       +-- admin.css           (~300 lines)
¦       +-- pdf-print.css       (~400 lines)
¦       +-- deck-builder.css    (~800 lines)
+-- assets/
    +-- manifest.json      // Generated card catalog (auto-created)
    +-- Language_List.csv  // Language definitions (uploaded via web)
    +-- Word_List.csv      // Word translations (uploaded via web)
    +-- [files]            // PNG/GIF/MP3 following naming convention

/* ========================================================================
   MODULAR CSS ARCHITECTURE (v3.1+)
   ======================================================================== */

// WHY MODULAR?
// - Context Window Efficiency: Only load relevant CSS files in conversations
// - Before: 2,700 lines every time
// - Now: ~600 lines core + ~800 lines target module = ~1,400 lines max
// - SAVES ~1,300 LINES = More room for actual problem-solving!

// CSS LOADING (All modules loaded upfront in index.php):
<link rel="stylesheet" href="styles/core.css?v=...">           // Required
<link rel="stylesheet" href="styles/theme.css?v=...">          // Required
<link rel="stylesheet" href="styles/modules/flashcards.css?v=...">
<link rel="stylesheet" href="styles/modules/match.css?v=...">
<link rel="stylesheet" href="styles/modules/match-sound.css?v=...">
<link rel="stylesheet" href="styles/modules/quiz.css?v=...">
<link rel="stylesheet" href="styles/modules/admin.css?v=...">
<link rel="stylesheet" href="styles/modules/pdf-print.css?v=...">
<link rel="stylesheet" href="styles/modules/deck-builder.css?v=...">

// CORE.CSS (~400 lines) - Always needed:
- CSS custom properties (:root)
- Base styles & reset
- Header & navigation
- Cards & buttons
- Forms & inputs
- Modals (scan, instruction, login)
- Toast notifications
- Empty states
- Utility classes

// THEME.CSS (~200 lines) - Always needed:
- Dark mode support ([data-theme="dark"])
- Mobile detection classes (body.mobile-phone, body.mobile-tablet)
- Touch device optimizations (body.touch-device)
- Responsive breakpoints (@media queries)
- Device-specific adjustments
- Reduced motion support

// MODULE CSS FILES - Module-specific:
Each file contains only the styles for that specific module, including:
- Module layout & structure
- Game/activity mechanics
- Mobile responsive overrides
- Module-specific animations

// WHEN WORKING ON A MODULE:
// 1. In Claude conversations, only reference:
//    - core.css (if touching shared components)
//    - theme.css (if touching responsive/dark mode)
//    - The specific module's CSS file
// 2. Example: Working on Deck Builder?
//    - Upload: core.css (~400 lines) + deck-builder.css (~800 lines)
//    - Total: ~1,200 lines vs 2,700 lines before!

/* ========================================================================
   CSV UPLOAD SYSTEM (v3.1 - NEW MAJOR FEATURE)
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

// Upload Process (Client-side):
const formData = new FormData();
formData.append('action', 'upload');
formData.append('updateType', 'both'); // or 'language' or 'word'
formData.append('languageFile', languageFileInput.files[0]);
formData.append('wordFile', wordFileInput.files[0]);

const response = await fetch('scan-assets.php', {
    method: 'POST',
    body: formData
});

const result = await response.json();
// result.success, result.stats, result.issues, result.reportUrl

// Admin Module CSV Methods (NEW in v3.1):
setupCSVUpload()              // Initialize upload UI and event listeners
updateUploadButton()          // Enable/disable based on file selection
uploadAndProcess()            // Send files to server via FormData
handleFileSelection(input, statusId)  // Show file info on selection

// scan-assets.php Upload Handler (NEW in v3.1):
handleLanguageUpload($file)   // Validate + save Language_List.csv
handleWordUpload($file)       // Validate + save Word_List.csv

/* ========================================================================
   GLOBAL MANAGERS (Available in all modules)
   ======================================================================== */

// --- ASSET MANAGER ---
assetManager.cards                    // All loaded cards (raw)
assetManager.languages                // Available languages array
assetManager.currentLanguage          // { id, name, trigraph }
assetManager.currentLesson            // Current lesson number
assetManager.getCards(filters)        // Get filtered + enriched cards
  // filters: { lesson, language, hasAudio, hasImage }
  // Returns: Array of enriched cards with allTranslations, acceptableAnswers
assetManager.enrichCard(card)         // Adds computed properties to card
assetManager.setLanguage(trigraph)    // Switch learning language
assetManager.setLesson(number)        // Switch lesson

// --- ROUTER ---
router.navigate(moduleName)           // Switch modules (handles cleanup)
router.currentModule                  // Active module instance
router.routes                         // Registered module map

// --- DEVICE DETECTOR ---
deviceDetector.deviceType             // 'mobile-phone' | 'mobile-tablet' | 'desktop'
deviceDetector.orientation            // 'portrait' | 'landscape'
deviceDetector.isMobileDevice()       // true if phone
deviceDetector.isTabletDevice()       // true if tablet
deviceDetector.getCardsPerPage()      // 1 (phone) / 2-4 (tablet) / 4 (desktop)

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
scoreTracker.getPercentage()          // 0-100
scoreTracker.getSummary()             // { correct, total, percentage, details }

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

// USAGE IN MODULES:
// 1. Expand on start: this.virtualCards = this.expandToVirtualCards(this.allCards);
// 2. Track indices: this.unmatched = new Set(virtualCards.map((_, i) => i));
// 3. Use cardId for exclusion, virtualIdx for tracking

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
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
            });
        });
        
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
   REVIEW vs TEST MODE PATTERNS
   ======================================================================== */

// --- REVIEW MODE: Spaced Repetition ---
if (this.currentMode === 'review') {
    this.reviewRepetitions = 3;  // Configurable (read from input)
    this.correctCounts = new Map();
    
    // Initialize counts
    this.virtualCards.forEach((_, idx) => {
        this.correctCounts.set(idx, 0);
    });
    
    // On correct answer
    if (isCorrect) {
        const currentCount = this.correctCounts.get(virtualIdx) || 0;
        this.correctCounts.set(virtualIdx, currentCount + 1);
        
        // Only remove if mastered
        if (this.correctCounts.get(virtualIdx) >= this.reviewRepetitions) {
            this.unmatched.delete(virtualIdx);
            this.showFeedback('OK', 'correct');
        } else {
            // Continue practicing this card
            this.showFeedback('OK', 'correct');
            setTimeout(() => this.nextRound(), 1000);
        }
    } else {
        this.showFeedback('X', 'incorrect');
        // Card stays in pool
    }
}

// --- TEST MODE: Single Pass Scoring ---
if (this.currentMode === 'test') {
    this.scoreTracker.recordAnswer(isCorrect, card);
    this.unmatched.delete(virtualIdx);
    
    if (this.unmatched.size === 0) {
        this.showTestReview();  // Show final results
    } else {
        this.nextRound();       // Continue to next card
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
  
  // ?? CHANGED IN v3.1:
  type: "N",                     // NEW: "N" (New word) or "R" (Review word)
  grammar: "verb",               // CHANGED: Now returns null if blank (not empty string)
  category: null,                // CHANGED: Returns null instead of ""
  subCategory1: "transitive",    // CHANGED: Returns null if blank
  subCategory2: null,            // CHANGED: Returns null if blank
  actflEst: "novice-mid"         // CHANGED: Returns null if blank
  // wordVersion: REMOVED in v3.1 (replaced by 'type')
}

// ENRICHED CARD (after assetManager.enrichCard())
// Adds computed properties:
{
  ...card,
  allTranslations: { cebuano: {...}, english: {...}, ... },
  acceptableAnswers: ["tilaw", "lami"],  // For current learning language
  audioPath: "assets/17.ceb.tilaw.mp3"   // For current learning language
}

// NULL Checking Pattern (NEW in v3.1):
if (card.grammar) {  // ? Simple truthiness check now works
    // Grammar exists and is not null
}

// Old pattern (no longer needed):
if (card.grammar && card.grammar !== '') {  // ? Unnecessary in v3.1
    // Grammar exists
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
   CSV UPLOAD FORMATS (v3.1)
   ======================================================================== */

// Language_List.csv (3 columns required):
ID, Name, Trigraph
1, Cebuano, ceb
2, English, eng
3, Maranao, mrw
4, Sinama, sin

// Validation Rules:
- ID must be numeric
- Name must not be empty
- Trigraph must be exactly 3 characters
- Any CSV filename accepted (system validates content, not filename)

// Word_List.csv (16 columns required - UPDATED in v3.1):
Lesson, WordNum, Cebuano, CebuanoNote, English, EnglishNote, 
Maranao, MaranaoNote, Sinama, SinamaNote, 
Grammar, Category, SubCategory1, SubCategory2, ACTFLEst, Type

// Example row:
1, 17, tilaw/lami, "also means delicious", taste, "", 
timan, "", tilaw, "", 
verb, actions, senses, , novice-mid, N

// Type Column (Index 15) - NEW in v3.1:
"N" = New word (first time introduction)
"R" = Review word (previously learned)

// Validation Rules:
- Lesson must be numeric
- WordNum must be numeric
- Type should be "N" or "R" (optional field)
- Any CSV filename accepted

// REMOVED in v3.1:
// wordVersion column (was index 16) - no longer exists

// Acceptable Answers Parsing (Unchanged):
"tilaw/lami" ? acceptableAnswers: ["tilaw", "lami"]
"long/tall" ? acceptableAnswers: ["long", "tall"]
"your / yours" ? acceptableAnswers: ["your", "yours"] (spaces handled)

/* ========================================================================
   RESPONSIVE DESIGN HELPERS
   ======================================================================== */

// Body classes automatically applied by DeviceDetector
body.mobile-phone              // Phone (width < 480px or mobile UA)
body.mobile-tablet             // Tablet (480-1024px or tablet UA)
body.desktop                   // Desktop (1024px+)
body.portrait                  // Height > Width
body.landscape                 // Width > Height
body.touch-device              // Has touch capability
body[data-device="mobile-phone"]
body[data-orientation="portrait"]

// CSS targeting examples (in module CSS files)
body.mobile-phone .cards-grid { 
    grid-template-columns: 1fr;  // Single column
}
body.mobile-tablet.portrait .cards-grid { 
    grid-template-columns: repeat(2, 1fr);  // 2 columns
}
body.desktop .cards-grid { 
    grid-template-columns: repeat(4, 1fr);  // 4 columns
}

// JavaScript device detection
if (deviceDetector.isMobileDevice()) {
    // Phone-specific logic
} else if (deviceDetector.isTabletDevice()) {
    // Tablet-specific logic
}

// Cards per page (auto-adjusts to device)
const cardsPerPage = deviceDetector.getCardsPerPage();

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

// --- DRAW SVG LINE (for matching games) ---
drawLine(dot1, dot2, color = 'green') {
    const svg = document.getElementById('linesSvg');
    const rect1 = dot1.getBoundingClientRect();
    const rect2 = dot2.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    
    const x1 = rect1.left - svgRect.left + rect1.width / 2;
    const y1 = rect1.top - svgRect.top + rect1.height / 2;
    const x2 = rect2.left - svgRect.left + rect2.width / 2;
    const y2 = rect2.top - svgRect.top + rect2.height / 2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '3');
    
    svg.appendChild(line);
    return line;
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
   COMMON EVENT HANDLERS
   ======================================================================== */

// Mode button toggle
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentMode = e.target.dataset.mode;
    });
});

// Start/Restart button
document.getElementById('startBtn').addEventListener('click', () => this.start());
document.getElementById('restartBtn').addEventListener('click', () => this.start());

// Review repetitions input
const reviewRepsInput = document.getElementById('reviewReps');
if (reviewRepsInput) {
    this.reviewRepetitions = parseInt(reviewRepsInput.value) || 3;
}

/* ========================================================================
   CSS CUSTOM PROPERTIES (Defined in styles/core.css)
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
   MODULE-SPECIFIC CSS CLASSES (Know which file to edit)
   ======================================================================== */

// FLASHCARDS (styles/modules/flashcards.css):
.module-flashcards             // Container
.flashcard-options             // Language selection UI
.language-checkboxes           // Checkbox group
.cards-grid                    // Grid layout (responsive)
.card-container                // Individual card wrapper
.card-front / .card-back       // Card sides
.card-back-content             // Back content wrapper
.primary-word-box              // Primary language box
.secondary-language            // Secondary language box
.speaker-icon                  // Audio play button

// PICTURE MATCH (styles/modules/match.css):
.module-match                  // Container
.mode-buttons                  // Review/Test toggle
.review-settings               // Repetition input
.progress-section              // Progress bar
.matching-container            // Two-column layout
.column                        // Left/right columns
.item                          // Clickable item
.lines-overlay                 // SVG line container
.feedback                      // Correct/incorrect overlay
.review-container              // Final results

// AUDIO MATCH (styles/modules/match-sound.css):
.module-match-sound            // Container
.matching-container-sound      // Vertical layout
.pictures-row                  // Picture grid
.audio-section                 // Audio button area
.audio-speaker-big             // Large speaker button
.picture-only                  // Single picture mode
.dot                           // Selection indicator

// UNSA NI (styles/modules/quiz.css):
.module-quiz                   // Container
.quiz-container                // Three-column layout
.left-panel                    // Input section
.center-panel                  // Image section
.right-panel                   // Score panel
.text-section                  // Input area
.user-input                    // Text input
.card-image                    // Display image
.score-item                    // Score display

// ADMIN (styles/modules/admin.css):
.module-admin                  // Container
.module-status-grid            // Status cards
.module-status-item            // Individual status
.csv-upload-section            // Upload UI
.radio-option                  // Upload type selector
.file-upload-container         // File drop zone
.debug-log-container           // Debug output

// PDF PRINT (styles/modules/pdf-print.css):
.module-pdf-print              // Container
.config-card                   // Configuration sections
.format-selection-card         // Format picker
.filter-options                // Radio buttons
.card-preview-grid             // Preview tiles
.preview-card-item             // Preview card
.print-preview-modal           // PDF preview
.processing-message            // Loading overlay

// DECK BUILDER (styles/modules/deck-builder.css):
.module-deck-builder           // Container
.deck-header                   // Top section
.deck-controls                 // Filters & search
.deck-table                    // Main table
.cell-input                    // Editable cell
.file-badge                    // File status badge
.categories-btn                // Categories editor
.file-selection-modal          // File picker
.file-browser-grid             // File grid
.current-file-preview          // Current file display

/* ========================================================================
   COMMON DEBUGGING PATTERNS
   ======================================================================== */

// Log card data
debugLogger.log(3, `Loaded ${this.allCards.length} cards for lesson ${this.assets.currentLesson}`);

// Track virtual card expansion
debugLogger.log(3, `Expanded ${this.allCards.length} physical ? ${this.virtualCards.length} virtual cards`);

// Monitor matching
debugLogger.log(2, `Selected: ${selectedWord}, Expected: ${expectedWord}, Match: ${isCorrect}`);

// Check asset availability
if (!card.hasAudio) {
    debugLogger.log(2, `Card ${card.wordNum} missing audio for ${this.assets.currentLanguage.trigraph}`);
}

// Check type field (NEW in v3.1)
if (card.type === 'N') {
    debugLogger.log(3, `Card ${card.wordNum} is a NEW word`);
} else if (card.type === 'R') {
    debugLogger.log(3, `Card ${card.wordNum} is a REVIEW word`);
}

/* ========================================================================
   QUICK TROUBLESHOOTING
   ======================================================================== */

Problem: Cards not loading
? Check: assetManager.currentLanguage and currentLesson are set
? Check: manifest.json exists and has cards for that lesson
? Debug: console.log(this.assets.getCards())

Problem: Audio not playing
? Check: card.hasAudio === true
? Check: audioPath exists and file is accessible
? Debug: Try playing in browser directly: new Audio(path).play()

Problem: Virtual cards showing same-card distractors
? Check: Exclusion logic uses cardId not virtualIdx
? Debug: Log currentCardId and distractor cardIds

Problem: Review mode not removing cards
? Check: correctCounts reaching reviewRepetitions threshold
? Debug: Log this.correctCounts after each answer

Problem: Responsive layout broken
? Check: DeviceDetector initialized before modules
? Check: Body classes applied (mobile-phone, etc.)
? Debug: console.log(deviceDetector.deviceType)

Problem: Module not rendering
? Check: Module registered in router (app.js init)
? Check: Module class exported/available globally
? Debug: console.log(router.routes)

Problem: CSV upload not working (NEW in v3.1)
? Check: File extension is .csv
? Check: Browser console for validation errors
? Check: Server permissions (assets/ folder writable)
? Check: PHP upload limits (default 2MB, increase if needed)
? Debug: Check Network tab for server response

Problem: Type column not showing (NEW in v3.1)
? Check: Word_List.csv has 16 columns (not 15)
? Check: Type column at index 15 has "N" or "R"
? Debug: console.log(card.type)

Problem: Grammar fields showing null
? This is CORRECT in v3.1 (changed from empty strings)
? Use: if (card.grammar) { ... } for checking
? Old code: if (card.grammar && card.grammar !== '') still works

Problem: CSS not loading (MODULAR CSS)
? Check: All CSS files linked in index.php
? Check: File paths correct (styles/core.css, styles/modules/...)
? Check: PHP filemtime() function working (for cache busting)
? Clear browser cache: Ctrl+Shift+R
? Debug: View page source, verify all <link> tags present

Problem: Module styles missing
? Check: Corresponding module CSS file exists
? Check: Module CSS file linked in index.php
? Verify: CSS file has correct classes for your module
? Debug: Inspect element, check if classes are defined

/* ========================================================================
   API REFERENCE - SCAN ASSETS (UPDATED v3.1)
   ======================================================================== */

// NEW: CSV Upload (v3.1)
POST scan-assets.php
FormData:
  action: 'upload'
  updateType: 'both' | 'language' | 'word'
  languageFile: File (optional, required if updateType includes language)
  wordFile: File (optional, required if updateType includes word)

Server Response:
{
  success: true,
  message: "CSVs uploaded and processed successfully",
  stats: {
    totalCards: 150,
    cardsWithAudio: 145,
    totalPng: 150,
    totalGif: 75,
    totalAudio: 580,
    lessonStats: { ... }
  },
  issues: [
    { type: 'warning', file: '17.png', message: 'No matching audio' }
  ],
  reportUrl: 'assets/scan-report.html'  // Detailed HTML report
}

// Existing: Asset Scan (Unchanged)
GET scan-assets.php?action=scan

Server Response: (same structure as upload)

/* ========================================================================
   ADMIN MODULE - CSV UPLOAD METHODS (NEW v3.1)
   ======================================================================== */

class AdminModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.languageFile = null;  // NEW: Store selected language CSV
        this.wordFile = null;      // NEW: Store selected word CSV
    }
    
    // NEW in v3.1:
    setupCSVUpload() {
        // Initialize radio button event listeners
        // Setup file input change handlers
        // Enable/disable upload button based on selection
        
        document.querySelectorAll('input[name="updateType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateContainerVisibility();
                this.updateUploadButton();
            });
        });
        
        document.getElementById('languageFileInput').addEventListener('change', (e) => {
            this.handleFileSelection(e.target, 'languageFileStatus');
        });
        
        document.getElementById('wordFileInput').addEventListener('change', (e) => {
            this.handleFileSelection(e.target, 'wordFileStatus');
        });
        
        document.getElementById('uploadProcessBtn').addEventListener('click', () => {
            this.uploadAndProcess();
        });
    }
    
    handleFileSelection(fileInput, statusElementId) {
        const file = fileInput.files[0];
        const statusElement = document.getElementById(statusElementId);
        
        if (!file) {
            statusElement.textContent = 'No file selected';
            statusElement.classList.remove('has-file');
            return;
        }
        
        // Validate CSV extension
        if (!file.name.toLowerCase().endsWith('.csv')) {
            toastManager.show('Please select a CSV file', 'error');
            fileInput.value = '';
            return;
        }
        
        // Store file reference
        if (statusElementId === 'languageFileStatus') {
            this.languageFile = file;
        } else {
            this.wordFile = file;
        }
        
        // Show file info
        const fileSize = (file.size / 1024).toFixed(2);
        statusElement.innerHTML = `
            <i class="fas fa-check-circle" style="color:var(--success);"></i>
            ${file.name} (${fileSize} KB)
        `;
        statusElement.classList.add('has-file');
        
        this.updateUploadButton();
    }
    
    updateUploadButton() {
        const updateType = document.querySelector('input[name="updateType"]:checked').value;
        const uploadBtn = document.getElementById('uploadProcessBtn');
        
        let enable = false;
        
        if (updateType === 'both') {
            enable = this.languageFile !== null && this.wordFile !== null;
        } else if (updateType === 'language') {
            enable = this.languageFile !== null;
        } else if (updateType === 'word') {
            enable = this.wordFile !== null;
        }
        
        uploadBtn.disabled = !enable;
    }
    
    async uploadAndProcess() {
        const uploadBtn = document.getElementById('uploadProcessBtn');
        const updateType = document.querySelector('input[name="updateType"]:checked').value;
        
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        try {
            const formData = new FormData();
            formData.append('action', 'upload');
            formData.append('updateType', updateType);
            
            if (this.languageFile) {
                formData.append('languageFile', this.languageFile);
            }
            if (this.wordFile) {
                formData.append('wordFile', this.wordFile);
            }
            
            const response = await fetch('scan-assets.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show('CSVs uploaded and processed!', 'success', 5000);
                this.showScanResults(result);
                
                // Reload manifest
                await assetManager.loadManifest();
                
                // Clear file selections
                this.languageFile = null;
                this.wordFile = null;
                document.getElementById('languageFileInput').value = '';
                document.getElementById('wordFileInput').value = '';
                document.getElementById('languageFileStatus').textContent = 'No file selected';
                document.getElementById('wordFileStatus').textContent = 'No file selected';
                
                debugLogger.log(2, `Upload complete: ${result.stats.totalCards} cards processed`);
            } else {
                toastManager.show(`Upload failed: ${result.error}`, 'error', 5000);
                debugLogger.log(1, `Upload failed: ${result.error}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger.log(1, `Upload error: ${err.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Process';
            this.updateUploadButton();
        }
    }
}

/* ========================================================================
   MODULE-SPECIFIC NOTES
   ======================================================================== */

FLASHCARDS MODULE:
- Supports multi-language back display (max 2 secondary languages)
- Auto-expands for long words (.card-expanded class)
- Speaker icon plays audio for current learning language
- CSS: styles/modules/flashcards.css

MATCH MODULES (Picture/Audio):
- ALWAYS show 4 options in both Review and Test modes
- Use virtual cards + exclusion logic for multi-word entries
- Review mode: configurable repetitions before mastery
- Test mode: swap all options after each selection
- CSS: styles/modules/match.css, styles/modules/match-sound.css

QUIZ MODULE:
- Spaced repetition: wrong answers reappear after 3+ cards
- Mobile layout: Image on top, input below
- Accepts all words in acceptableAnswers array
- CSS: styles/modules/quiz.css

PDF MODULE:
- Three formats: Flashcards (2-sided), Unsa Ni (worksheet), Matching (game)
- Live preview in modal before download
- Flashcards: 4 per page, back positions horizontally flipped for duplex
- CSS: styles/modules/pdf-print.css

ADMIN MODULE (UPDATED v3.1):
- Real-time stats (refresh every 5 seconds)
- CSV upload interface with validation
- "Upload & Process" - Uploads CSVs + scans assets
- "Rescan Assets Only" - Just rescans existing files
- Debug log synced with main debug console
- CSS: styles/modules/admin.css

DECK BUILDER MODULE:
- Edit cards inline with immediate feedback
- Upload images/audio via file browser
- Categories editor for grammar metadata
- Add/delete cards with real-time validation
- CSS: styles/modules/deck-builder.css (~800 lines - largest module)

/* ========================================================================
   VERSION HISTORY
   ======================================================================== */

v3.1 (Current) - November 2025
- ? CSV Upload System via web interface
- ? Type column added (N=New, R=Review)
- ? wordVersion column removed
- ? NULL handling for blank grammar fields
- ? Any CSV filename accepted (validates content)
- ? Enhanced validation with detailed error messages
- ? MODULAR CSS: Split into 9 files for context efficiency

v3.0 - November 2025
- Multi-language support (4 languages)
- Virtual card system for multi-word entries
- 6 interactive modules
- PDF generation (3 formats)
- Responsive design with device detection
- Asset management via PHP backend

/* ========================================================================
   END OF QUICK REFERENCE v3.1 (MODULAR CSS)
   Save this file as: QUICK_REFERENCE_v3.1.js or .md
   Paste when starting conversations about single-module edits
   
   CONTEXT EFFICIENCY TIP:
   When working on a specific module, upload only:
   - This reference file
   - styles/core.css (~400 lines)
   - styles/modules/[your-module].css (~150-800 lines)
   = ~1,000 lines total vs 2,700+ before!
   ======================================================================== */