// =================================================================
// CEBUANO LEARNING PLATFORM - Core Application
// Version 3.0 - November 2025
// =================================================================

// Global instances
let router;
let assetManager;
let debugLogger;
let assetScanner;
let themeManager;
let toastManager;
let deviceDetector;
let instructionManager;

// =================================================================
// BASE MODULE CLASS (Previously in modules.js)
// =================================================================
class LearningModule {
    constructor(assetManager) {
        this.assets = assetManager;
        this.container = document.getElementById('moduleContainer');
        this.state = {};
    }
    
    async render() {
        // Override in subclasses
    }
    
    async init() {
        // Override in subclasses
    }
    
    start(mode = 'review') {
        // Override in subclasses
    }
    
    reset() {
        // Override in subclasses
    }
    
    destroy() {
        // Clean up event listeners and DOM
        this.container.innerHTML = '';
        
        // Revoke any object URLs created during this module's lifetime
        if (this.assets) {
            this.assets.revokeAllUrls();
        }
        
        // Additional cleanup for any module-specific resources
        if (this.cleanup) {
            this.cleanup();
        }
        
        debugLogger?.log(3, 'Module destroyed and resources cleaned up');
    }
}

// =================================================================
// DEVICE DETECTOR - Mobile/Tablet/Desktop Detection
// =================================================================
class DeviceDetector {
    constructor() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.userAgent = navigator.userAgent.toLowerCase();
        
        // Determine device type
        this.deviceType = this.getDeviceType();
        this.orientation = this.getOrientation();
        
        // Apply body classes for CSS targeting
        this.applyBodyClasses();
        
        // Listen for orientation/resize changes
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        
        debugLogger?.log(3, `Device: ${this.deviceType}, Touch: ${this.hasTouch}, Orientation: ${this.orientation}`);
    }
    
    getDeviceType() {
        // Phone detection (small screens or phone user agents)
        if (this.screenWidth < 480 || 
            /iphone|ipod|android.*mobile|blackberry|iemobile|windows phone/i.test(this.userAgent)) {
            return 'mobile-phone';
        }
        
        // Tablet detection (medium screens or tablet user agents)
        if ((this.screenWidth >= 480 && this.screenWidth < 1024) ||
            /ipad|android(?!.*mobile)|tablet|kindle|silk/i.test(this.userAgent)) {
            return 'mobile-tablet';
        }
        
        // Desktop (everything else)
        return 'desktop';
    }
    
    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
    
    applyBodyClasses() {
        // Remove all device type classes
        document.body.classList.remove('mobile-phone', 'mobile-tablet', 'desktop');
        document.body.classList.remove('portrait', 'landscape');
        document.body.classList.remove('touch-device', 'no-touch');
        
        // Add current device type
        document.body.classList.add(this.deviceType);
        
        // Add orientation
        document.body.classList.add(this.orientation);
        
        // Add touch capability
        document.body.classList.add(this.hasTouch ? 'touch-device' : 'no-touch');
        
        // Add data attributes for CSS selectors
        document.body.setAttribute('data-device', this.deviceType);
        document.body.setAttribute('data-orientation', this.orientation);
    }
    
    isMobileDevice() {
        return this.deviceType === 'mobile-phone';
    }
    
    isTabletDevice() {
        return this.deviceType === 'mobile-tablet';
    }
    
    isDesktopDevice() {
        return this.deviceType === 'desktop';
    }
    
    isMobileOrTablet() {
        return this.deviceType !== 'desktop';
    }
    
    handleResize() {
        const oldType = this.deviceType;
        const oldOrientation = this.orientation;
        
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.deviceType = this.getDeviceType();
        this.orientation = this.getOrientation();
        
        // Update body classes
        this.applyBodyClasses();
        
        // Log changes
        if (oldType !== this.deviceType) {
            debugLogger?.log(3, `Device type changed: ${oldType} → ${this.deviceType}`);
        }
        
        if (oldOrientation !== this.orientation) {
            debugLogger?.log(3, `Orientation changed: ${oldOrientation} → ${this.orientation}`);
        }
        
        // Trigger re-render if device type changed and a module is active
        if (oldType !== this.deviceType && router && router.currentModule) {
            debugLogger?.log(2, 'Device type changed - re-rendering current module');
            const currentModuleName = window.location.hash.slice(1) || 'flashcards';
            router.navigate(currentModuleName);
        }
    }
    
    handleOrientationChange() {
        setTimeout(() => {
            this.handleResize();
        }, 100); // Small delay to ensure dimensions are updated
    }
    
    getCardsPerPage() {
        // Return appropriate cards per page based on device
        if (this.isMobileDevice()) {
            return 1; // Mobile phones: 1 card at a time
        } else if (this.isTabletDevice()) {
            return this.orientation === 'portrait' ? 2 : 4;
        } else {
            return 4; // Desktop always 4
        }
    }
    
    getMaxPictures() {
        // Return appropriate max pictures for matching games
        return 4; // Always 4 across all devices
    }
}

// =================================================================
// DEBUG LOGGER
// =================================================================
class DebugLogger {
    constructor() {
        this.level = 2; // Default: warnings + errors
        this.logElement = null;
    }
    
    init() {
        this.logElement = document.getElementById('debugLog');
        const savedLevel = localStorage.getItem('debugLevel');
        if (savedLevel) {
            this.level = parseInt(savedLevel);
        }
    }
    
    setLevel(level) {
        this.level = level;
        localStorage.setItem('debugLevel', level);
    }
    
    log(severity, message) {
        if (severity > this.level) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `debug-entry level-${severity}`;
        entry.textContent = `[${timestamp}] ${message}`;
        
        if (this.logElement) {
            this.logElement.appendChild(entry);
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
        
        // Also log to console
        if (severity === 1) console.error(message);
        else if (severity === 2) console.warn(message);
        else console.log(message);
    }
    
    clear() {
        if (this.logElement) {
            this.logElement.innerHTML = '';
        }
    }
}

// =================================================================
// THEME MANAGER
// =================================================================
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
    }
    
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggle());
        }
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            const text = themeBtn.querySelector('span');
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
                text.textContent = 'Light Mode';
            } else {
                icon.className = 'fas fa-moon';
                text.textContent = 'Dark Mode';
            }
        }
    }
    
    toggle() {
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
    }
}

// =================================================================
// TOAST MANAGER
// =================================================================
class ToastManager {
    constructor() {
        this.container = null;
    }
    
    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.success}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (this.container.contains(toast)) {
                    this.container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// =================================================================
// INSTRUCTION MANAGER
// =================================================================
class InstructionManager {
    constructor() {
        this.modal = null;
        this.titleElement = null;
        this.textElement = null;
        this.closeBtn = null;
        this.shownInstructions = new Set(); // Track which modules have shown instructions
    }
    
    init() {
        this.modal = document.getElementById('instructionModal');
        this.titleElement = document.getElementById('instructionTitle');
        this.textElement = document.getElementById('instructionText');
        this.closeBtn = document.getElementById('closeInstructionBtn');
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
        
        // Close on background click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }
    }
    
    show(moduleName, title, text) {
        // Check if we've already shown instructions for this module this session
        if (this.shownInstructions.has(moduleName)) {
            return; // Don't show again
        }
        
        this.shownInstructions.add(moduleName);
        
        if (this.titleElement) this.titleElement.textContent = title;
        if (this.textElement) this.textElement.textContent = text;
        if (this.modal) this.modal.classList.remove('hidden');
        
        debugLogger?.log(3, `Showing instructions for ${moduleName}`);
    }
    
    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
    
    reset() {
        // Clear the shown instructions (useful for testing or refresh)
        this.shownInstructions.clear();
    }
}

// =================================================================
// ASSET MANAGER
// =================================================================
class AssetManager {
    constructor() {
        this.manifest = null;
        this.cards = [];
        this.languages = [];
        this.lessons = [];
        this.currentLanguage = null;
        this.currentLesson = null;
        this.imageUrls = new Map();
        this.audioUrls = new Map();
    }
    
    async loadManifest() {
        try {
            const response = await fetch('assets/manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.manifest = await response.json();
            this.cards = this.manifest.cards || [];
            this.languages = this.manifest.languages || [];
            
            // Extract unique lessons
            const lessonSet = new Set();
            this.cards.forEach(card => lessonSet.add(card.lesson));
            this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
            
            debugLogger.log(2, `Loaded ${this.cards.length} cards, ${this.languages.length} languages, ${this.lessons.length} lessons from manifest`);
            
            // Initialize selectors
            this.populateLanguageSelector();
            this.populateLessonSelector();
            
            return this.cards;
        } catch (err) {
            debugLogger.log(1, `Failed to load manifest: ${err.message}`);
            throw err;
        }
    }
    
    populateLanguageSelector() {
        const selector = document.getElementById('languageSelect');
        if (!selector || this.languages.length === 0) return;
        
        selector.innerHTML = '<option value="">Select Language...</option>';
        this.languages.forEach(lang => {
            // Skip English for now (it's the target language)
            if (lang.trigraph.toLowerCase() !== 'eng') {
                const option = document.createElement('option');
                option.value = lang.trigraph.toLowerCase();
                option.textContent = lang.name;
                selector.appendChild(option);
            }
        });
        
        // Auto-select first language if none selected
        if (!this.currentLanguage && this.languages.length > 0) {
            const defaultLang = this.languages.find(l => l.trigraph.toLowerCase() === 'ceb') || this.languages[0];
            selector.value = defaultLang.trigraph.toLowerCase();
            this.setLanguage(defaultLang.trigraph.toLowerCase());
        }
    }
    
    populateLessonSelector() {
        const selector = document.getElementById('lessonSelect');
        if (!selector || this.lessons.length === 0) return;
        
        selector.innerHTML = '<option value="">Select Lesson...</option>';
        this.lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = `Lesson ${lesson}`;
            selector.appendChild(option);
        });
        
        // Auto-select first lesson if none selected
        if (!this.currentLesson && this.lessons.length > 0) {
            selector.value = this.lessons[0];
            this.setLesson(this.lessons[0]);
        }
    }
    
    setLanguage(languageTrigraph) {
        const lang = this.languages.find(l => l.trigraph.toLowerCase() === languageTrigraph.toLowerCase());
        if (lang) {
            this.currentLanguage = lang;
            debugLogger.log(2, `Language set to: ${lang.name} (${lang.trigraph})`);
            this.updateModuleTitles();
            return true;
        }
        return false;
    }
    
    setLesson(lessonNum) {
        lessonNum = parseInt(lessonNum);
        if (this.lessons.includes(lessonNum)) {
            this.currentLesson = lessonNum;
            debugLogger.log(2, `Lesson set to: ${lessonNum}`);
            this.updateModuleTitles();
            return true;
        }
        return false;
    }
    
    updateModuleTitles() {
        // Update any module-specific displays when language/lesson changes
        // This is called after language or lesson selection
    }
    
    getCards(filters = {}) {
        let filtered = [...this.cards];
        
        // Filter by lesson (use currentLesson if not specified)
        const lessonFilter = filters.lesson !== undefined ? filters.lesson : this.currentLesson;
        if (lessonFilter !== null) {
            filtered = filtered.filter(card => card.lesson === lessonFilter);
        }
        
        // Filter by language (use currentLanguage if not specified)
        const langFilter = filters.language || (this.currentLanguage ? this.currentLanguage.trigraph.toLowerCase() : null);
        if (langFilter) {
            filtered = filtered.filter(card => {
                // Check if the card has the language
                const langKey = langFilter === 'ceb' ? 'cebuano' : 
                               langFilter === 'eng' ? 'english' :
                               langFilter === 'mrw' ? 'maranao' :
                               langFilter === 'sin' ? 'sinama' : null;
                
                // Handle both structures: card.translations.cebuano (new) or card.cebuano (old)
                if (card.translations && card.translations[langKey]) {
                    return true;
                }
                return langKey && card[langKey];
            });
        }
        
        // Filter by audio availability
        if (filters.hasAudio !== undefined) {
            filtered = filtered.filter(card => card.hasAudio === filters.hasAudio);
        }
        
        // Filter by image availability
        if (filters.hasImage !== undefined) {
            filtered = filtered.filter(card => card.hasImage === filters.hasImage);
        }
        
        // Enrich cards to ensure they have allTranslations structure
        return filtered.map(card => this.enrichCard(card));
    }
    
    enrichCard(card) {
        // Handle both structures: card.translations (new manifest) or flat properties (old)
        let allTranslations;
        
        if (card.translations) {
            // New structure: card.translations already has the correct format
            allTranslations = card.translations;
        } else {
            // Old structure: build from flat properties
            allTranslations = {
                cebuano: card.cebuano ? { word: card.cebuano, note: card.cebuanoNote || '' } : null,
                english: card.english ? { word: card.english, note: card.englishNote || '' } : null,
                maranao: card.maranao ? { word: card.maranao, note: card.maranaoNote || '' } : null,
                sinama: card.sinama ? { word: card.sinama, note: card.sinamaNote || '' } : null
            };
        }
        
        // Get learning language key
        const learningLangKey = this.currentLanguage ? this.currentLanguage.trigraph.toLowerCase() : 'ceb';
        const learningLangName = learningLangKey === 'ceb' ? 'cebuano' :
                                learningLangKey === 'eng' ? 'english' :
                                learningLangKey === 'mrw' ? 'maranao' :
                                learningLangKey === 'sin' ? 'sinama' : 'cebuano';
        
        // Get primary translation for current learning language
        const primaryTranslation = allTranslations[learningLangName];
        
        // Use existing acceptableAnswers if available, otherwise build from word
        let acceptableAnswers;
        if (primaryTranslation) {
            if (primaryTranslation.acceptableAnswers && Array.isArray(primaryTranslation.acceptableAnswers)) {
                acceptableAnswers = primaryTranslation.acceptableAnswers;
            } else {
                acceptableAnswers = primaryTranslation.word.split(',').map(w => w.trim()).filter(w => w);
            }
        } else {
            acceptableAnswers = [card.cebuano || ''];
        }
        
        // Get audio path for current language
        const audioPath = card.audio && card.audio[learningLangKey] ? 
            card.audio[learningLangKey] : null;
        
        return {
            ...card,
            allTranslations,
            acceptableAnswers,
            audioPath: audioPath || card.audioPath,
            imagePath: card.imagePath || card.printImagePath
        };
    }
    
    revokeAllUrls() {
        // Revoke all object URLs to prevent memory leaks
        this.imageUrls.forEach(url => URL.revokeObjectURL(url));
        this.audioUrls.forEach(url => URL.revokeObjectURL(url));
        this.imageUrls.clear();
        this.audioUrls.clear();
        debugLogger?.log(3, 'All object URLs revoked');
    }
}

// =================================================================
// SCORE TRACKER (for test modes)
// =================================================================
class ScoreTracker {
    constructor() {
        this.correct = 0;
        this.total = 0;
        this.details = [];
    }
    
    reset() {
        this.correct = 0;
        this.total = 0;
        this.details = [];
    }
    
    recordAnswer(isCorrect, card = null) {
        this.total++;
        if (isCorrect) this.correct++;
        
        if (card) {
            this.details.push({
                card,
                isCorrect,
                timestamp: new Date()
            });
        }
    }
    
    getPercentage() {
        return this.total === 0 ? 0 : Math.round((this.correct / this.total) * 100);
    }
    
    getSummary() {
        return {
            correct: this.correct,
            total: this.total,
            percentage: this.getPercentage(),
            details: this.details
        };
    }
}

// =================================================================
// ASSET SCANNER (Client-side - for browsers supporting File System API)
// =================================================================
class AssetScanner {
    constructor() {
        this.directoryHandle = null;
        this.cards = new Map();
        this.issues = [];
    }
    
    async requestDirectory() {
        try {
            this.directoryHandle = await window.showDirectoryPicker();
            debugLogger.log(2, 'Directory selected: ' + this.directoryHandle.name);
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                debugLogger.log(1, 'Error selecting directory: ' + err.message);
            }
            return false;
        }
    }
    
    async scan() {
        if (!this.directoryHandle) {
            throw new Error('No directory selected');
        }
        
        this.cards.clear();
        this.issues = [];
        
        this.showModal();
        this.showProgress('Starting scan...');
        
        try {
            await this.scanImages();
            await this.scanAudio();
            this.validateResults();
            
            this.showResults();
            
            document.getElementById('downloadManifest').addEventListener('click', () => {
                this.downloadManifest();
            });
            
            document.getElementById('retryScan').addEventListener('click', () => {
                this.hideModal();
                this.scan();
            });
            
        } catch (err) {
            this.showError(err.message);
        }
    }
    
    async scanImages() {
        this.showProgress('Scanning images...');
        
        let count = 0;
        for await (const entry of this.directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.png')) {
                count++;
                
                const parsed = this.parseFilename(entry.name);
                
                if (parsed) {
                    this.cards.set(parsed.cebuano, {
                        cebuano: parsed.cebuano,
                        english: parsed.english,
                        hasImage: true,
                        hasAudio: false,
                        imagePath: `assets/${entry.name}`,
                        audioPath: null,
                        imageHandle: entry
                    });
                } else {
                    this.issues.push({
                        type: 'error',
                        file: entry.name,
                        message: 'Invalid filename format. Expected: [cebuano]+[english].png'
                    });
                }
                
                if (count % 10 === 0) {
                    this.showProgress(`Scanned ${count} images...`);
                    await this.delay(0);
                }
            }
        }
        
        debugLogger.log(2, `Found ${count} PNG files, ${this.cards.size} valid`);
    }
    
    async scanAudio() {
        this.showProgress('Scanning audio files...');
        
        let count = 0;
        let matched = 0;
        
        for await (const entry of this.directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.mp3')) {
                count++;
                
                const cebuano = entry.name.replace('.mp3', '');
                
                if (this.cards.has(cebuano)) {
                    const card = this.cards.get(cebuano);
                    card.hasAudio = true;
                    card.audioPath = `assets/${entry.name}`;
                    card.audioHandle = entry;
                    matched++;
                } else {
                    this.issues.push({
                        type: 'warning',
                        file: entry.name,
                        message: `No matching PNG file found (expected: ${cebuano}+*.png)`
                    });
                }
                
                if (count % 10 === 0) {
                    this.showProgress(`Scanned ${count} audio files...`);
                    await this.delay(0);
                }
            }
        }
        
        debugLogger.log(2, `Found ${count} MP3 files, ${matched} matched to images`);
    }
    
    validateResults() {
        let noAudioCount = 0;
        for (const card of this.cards.values()) {
            if (!card.hasAudio) {
                noAudioCount++;
            }
        }
        
        if (noAudioCount > 0) {
            this.issues.push({
                type: 'info',
                file: 'Multiple files',
                message: `${noAudioCount} card(s) have no audio file. They will still work in modules that don't require audio.`
            });
        }
        
        if (this.cards.size < 5) {
            this.issues.push({
                type: 'warning',
                file: 'General',
                message: `Only ${this.cards.size} valid cards found. Consider adding more for better learning experience.`
            });
        }
    }
    
    parseFilename(filename) {
        const name = filename.replace('.png', '');
        const parts = name.split('+');
        
        if (parts.length === 2 && parts[0] && parts[1]) {
            return {
                cebuano: parts[0].trim(),
                english: parts[1].trim()
            };
        }
        
        return null;
    }
    
    generateManifest() {
        const cardsArray = Array.from(this.cards.values()).map(card => ({
            cebuano: card.cebuano,
            english: card.english,
            hasImage: card.hasImage,
            hasAudio: card.hasAudio,
            imagePath: card.imagePath,
            audioPath: card.audioPath
        }));
        
        cardsArray.sort((a, b) => a.cebuano.localeCompare(b.cebuano));
        
        return {
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            totalCards: cardsArray.length,
            cardsWithAudio: cardsArray.filter(c => c.hasAudio).length,
            cards: cardsArray
        };
    }
    
    downloadManifest() {
        const manifest = this.generateManifest();
        const json = JSON.stringify(manifest, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manifest.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        debugLogger.log(1, 'Manifest downloaded successfully');
    }
    
    showModal() {
        document.getElementById('scanModal').classList.remove('hidden');
        document.getElementById('scanProgress').classList.remove('hidden');
        document.getElementById('scanResults').classList.add('hidden');
        document.getElementById('scanError').classList.add('hidden');
    }
    
    hideModal() {
        document.getElementById('scanModal').classList.add('hidden');
    }
    
    showProgress(message) {
        document.getElementById('scanProgressText').textContent = message;
    }
    
    showResults() {
        document.getElementById('scanProgress').classList.add('hidden');
        document.getElementById('scanResults').classList.remove('hidden');
        
        const audioCount = Array.from(this.cards.values()).filter(c => c.hasAudio).length;
        document.getElementById('totalImages').textContent = this.cards.size;
        document.getElementById('totalAudio').textContent = audioCount;
        document.getElementById('totalCards').textContent = this.cards.size;
        
        const issuesContainer = document.getElementById('validationIssues');
        if (this.issues.length === 0) {
            issuesContainer.innerHTML = '<div class="no-issues"><i class="fas fa-check-circle"></i> No issues found!</div>';
        } else {
            issuesContainer.innerHTML = this.issues.map(issue => `
                <div class="validation-item ${issue.type}">
                    <strong>${issue.file}</strong>: ${issue.message}
                </div>
            `).join('');
        }
        
        this.showCardPreview();
    }
    
    async showCardPreview() {
        const previewContainer = document.getElementById('cardPreview');
        const cardsArray = Array.from(this.cards.values()).slice(0, 10);
        
        previewContainer.innerHTML = '';
        
        for (const card of cardsArray) {
            const preview = document.createElement('div');
            preview.className = 'preview-card';
            
            let imgHtml = '<div style="width:60px;height:60px;background:#ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto 5px;">📷</div>';
            
            try {
                if (card.imageHandle) {
                    const file = await card.imageHandle.getFile();
                    const url = URL.createObjectURL(file);
                    imgHtml = `<img src="${url}" alt="${card.cebuano}">`;
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                }
            } catch (err) {
                debugLogger.log(3, `Could not load preview for ${card.cebuano}`);
            }
            
            preview.innerHTML = `
                ${imgHtml}
                <div class="cebuano">${card.cebuano}</div>
                <div class="english">${card.english}</div>
                ${card.hasAudio ? '<div class="audio-indicator">🔊</div>' : ''}
            `;
            
            previewContainer.appendChild(preview);
        }
    }
    
    showError(message) {
        document.getElementById('scanProgress').classList.add('hidden');
        document.getElementById('scanError').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =================================================================
// ROUTER
// =================================================================
class Router {
    constructor() {
        this.currentModule = null;
        this.routes = {};
    }
    
    register(name, moduleClass) {
        this.routes[name] = moduleClass;
    }
    
    async navigate(moduleName) {
        if (this.currentModule) {
            this.currentModule.destroy();
        }
        
        // Update tab active states
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === moduleName);
        });
        
        const ModuleClass = this.routes[moduleName];
        if (!ModuleClass) {
            debugLogger.log(1, `Module not found: ${moduleName}`);
            return;
        }
        
        this.currentModule = new ModuleClass(assetManager);
        await this.currentModule.render();
        await this.currentModule.init();
        
        window.location.hash = moduleName;
        
        debugLogger.log(2, `Navigated to ${moduleName}`);
    }
}

// =================================================================
// INITIALIZATION
// =================================================================
async function init() {
    debugLogger = new DebugLogger();
    debugLogger.init();
    debugLogger.log(2, 'Application starting...');
    
    // Initialize device detector early
    deviceDetector = new DeviceDetector();
    
    themeManager = new ThemeManager();
    themeManager.init();
    
    toastManager = new ToastManager();
    toastManager.init();
    
    instructionManager = new InstructionManager();
    instructionManager.init();
    
    assetManager = new AssetManager();
    try {
        await assetManager.loadManifest();
        toastManager.show('Manifest loaded successfully!', 'success');
    } catch (err) {
        debugLogger.log(1, 'No manifest found - please scan assets to begin');
        toastManager.show('No manifest found. Please scan assets to begin.', 'warning', 5000);
    }
    
    assetScanner = new AssetScanner();
    router = new Router();
    
    // Initialize logo image
    const logoImg = document.getElementById('logoImg');
    if (logoImg) {
        logoImg.onload = function() {
            this.style.display = 'inline-block';
        };
        // Try to load logo, will hide via onerror if not found
        logoImg.src = 'assets/logo.png';
    }
    
    // Language and Lesson selector events
    const languageSelect = document.getElementById('languageSelect');
    const lessonSelect = document.getElementById('lessonSelect');
    
    if (languageSelect) {
        languageSelect.addEventListener('change', async (e) => {
            const trigraph = e.target.value;
            if (trigraph && assetManager.setLanguage(trigraph)) {
                toastManager.show(`Language changed to ${assetManager.currentLanguage.name}`, 'success');
                // Re-render current module if one is active
                if (router.currentModule) {
                    const currentModuleName = window.location.hash.slice(1) || 'flashcards';
                    await router.navigate(currentModuleName);
                }
            }
        });
    }
    
    if (lessonSelect) {
        lessonSelect.addEventListener('change', async (e) => {
            const lessonNum = parseInt(e.target.value);
            if (lessonNum && assetManager.setLesson(lessonNum)) {
                toastManager.show(`Lesson changed to ${lessonNum}`, 'success');
                // Re-render current module if one is active
                if (router.currentModule) {
                    const currentModuleName = window.location.hash.slice(1) || 'flashcards';
                    await router.navigate(currentModuleName);
                }
            }
        });
    }
    
    // Register modules (will be defined in separate module files)
    if (typeof FlashcardsModule !== 'undefined') {
        router.register('flashcards', FlashcardsModule);
        router.register('match', MatchExerciseModule);
        router.register('match-sound', MatchSoundModule);
        router.register('quiz', UnsaNiQuizModule);
        router.register('pdf-print', PDFPrintModule);
        router.register('deck-builder', DeckBuilderModule);
        router.register('admin', AdminModule);
    }
    
    // Navigation events
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            router.navigate(btn.dataset.module);
        });
    });
    
    // Settings button (if exists)
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('hidden');
        });
    }
    
    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('hidden');
        });
    }
    
    // Debug level change
    const debugLevelSelect = document.getElementById('debugLevel');
    if (debugLevelSelect) {
        debugLevelSelect.addEventListener('change', (e) => {
            debugLogger.setLevel(parseInt(e.target.value));
        });
        debugLevelSelect.value = debugLogger.level;
    }
    
    // Show/hide debug console (if checkbox exists)
    const debugCheckbox = document.getElementById('showDebugConsole');
    if (debugCheckbox) {
        debugCheckbox.addEventListener('change', (e) => {
            const console = document.getElementById('debugConsole');
            if (e.target.checked) {
                console.classList.add('visible');
            } else {
                console.classList.remove('visible');
            }
        });
        
        // Set initial state - hidden by default
        document.getElementById('debugConsole').classList.remove('visible');
    }
    
    // Clear debug button
    const clearDebugBtn = document.getElementById('clearDebug');
    if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', () => {
            debugLogger.clear();
        });
    }
    
    // Modal close buttons
    const closeScanModal = document.getElementById('closeScanModal');
    if (closeScanModal) {
        closeScanModal.addEventListener('click', () => {
            document.getElementById('scanModal').classList.add('hidden');
        });
    }
    
    const cancelScan = document.getElementById('cancelScan');
    if (cancelScan) {
        cancelScan.addEventListener('click', () => {
            document.getElementById('scanModal').classList.add('hidden');
        });
    }
    
    // Load initial module from hash or default to flashcards
    const hash = window.location.hash.slice(1) || 'flashcards';
    if (assetManager.cards.length > 0 && assetManager.currentLanguage && assetManager.currentLesson) {
        await router.navigate(hash);
    } else {
        document.getElementById('moduleContainer').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h2>Welcome to Bob and Mariel Ward School of Filipino Languages!</h2>
                    <p>To get started, go to the <strong>Admin</strong> tab and click <strong>Scan Assets</strong> to load your learning materials.</p>
                    <p style="margin-top: 16px; font-size: 14px;">
                        Make sure your files are named correctly:<br>
                        <code>17.tilaw.taste.png</code> and <code>17.ceb.tilaw.taste.mp3</code><br>
                        Place <code>Language_List.csv</code> and <code>Word_List.csv</code> in the assets folder.
                    </p>
                </div>
            </div>
        `;
    }
    
    debugLogger.log(2, 'Application initialized');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
