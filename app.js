// =================================================================
// CEBUANO LEARNING PLATFORM - Core Application
// Version 4.3 - November 2025 - Two-Level Navigation & New Modules
// =================================================================

// Global instances
let router;
let assetManager;
let debugLogger;
let authManager;  // AUTHENTICATION MANAGER
let assetScanner;
let themeManager;
let toastManager;
let deviceDetector;
let browserCapabilityDetector;
let instructionManager;
let filterManager;

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Fisher-Yates (Knuth) shuffle - produces unbiased random permutation
 * Note: .sort(() => Math.random() - 0.5) is biased and should not be used
 * @param {Array} array - Array to shuffle
 * @returns {Array} - New shuffled array (original unchanged)
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

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
            debugLogger?.log(3, `Device type changed: ${oldType} ? ${this.deviceType}`);
        }
        
        if (oldOrientation !== this.orientation) {
            debugLogger?.log(3, `Orientation changed: ${oldOrientation} ? ${this.orientation}`);
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
// BROWSER CAPABILITY DETECTOR
// =================================================================
class BrowserCapabilityDetector {
    constructor() {
        this.supportsWebP = null;
        this.supportsWebM = null;
        this.supportsMP4 = null;
    }

    async init() {
        // Detect all format support
        await Promise.all([
            this.detectWebP(),
            this.detectWebM(),
            this.detectMP4()
        ]);

        debugLogger?.log(3, `Browser support - WebP: ${this.supportsWebP}, WebM: ${this.supportsWebM}, MP4: ${this.supportsMP4}`);
    }

    async detectWebP() {
        return new Promise((resolve) => {
            const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
            const img = new Image();

            img.onload = () => {
                this.supportsWebP = img.width === 1 && img.height === 1;
                resolve(this.supportsWebP);
            };

            img.onerror = () => {
                this.supportsWebP = false;
                resolve(false);
            };

            img.src = webpData;
        });
    }

    detectWebM() {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canPlay = video.canPlayType('video/webm; codecs="vp8, vorbis"');
            this.supportsWebM = canPlay === 'probably' || canPlay === 'maybe';
            resolve(this.supportsWebM);
        });
    }

    detectMP4() {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canPlay = video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
            this.supportsMP4 = canPlay === 'probably' || canPlay === 'maybe';
            resolve(this.supportsMP4);
        });
    }

    // Helper methods for easy checking
    shouldUseWebP() {
        return this.supportsWebP === true;
    }

    shouldUseWebM() {
        return this.supportsWebM === true;
    }

    // Get preferred image format (webp if supported, otherwise png/jpg/jpeg)
    getPreferredImageFormat(availableFormats) {
        if (this.supportsWebP && availableFormats.webp) {
            return 'webp';
        }
        // Fallback order: png, jpg, jpeg
        if (availableFormats.png) return 'png';
        if (availableFormats.jpg) return 'jpg';
        if (availableFormats.jpeg) return 'jpeg';
        return null;
    }

    // Get preferred video format (webm if supported, otherwise mp4, then gif)
    getPreferredVideoFormat(availableFormats) {
        if (this.supportsWebM && availableFormats.webm) {
            return 'webm';
        }
        if (this.supportsMP4 && availableFormats.mp4) {
            return 'mp4';
        }
        // Fallback to GIF (always supported)
        if (availableFormats.gif) return 'gif';
        return null;
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
// FILTER MANAGER - Advanced Filtering System
// =================================================================
class FilterManager {
    constructor() {
        this.filters = {
            startLesson: null,
            endLesson: null,
            grammar: null,
            category: null,
            subCategory1: null,
            subCategory2: null,
            actflEst: null
        };
        this.isAdvancedFilterActive = false;
        this.modal = null;
        this.filterOptions = {
            lessons: [],
            grammar: [],
            category: [],
            subCategory1: [],
            subCategory2: [],
            actflEst: []
        };
    }
    
    init() {
        this.modal = document.getElementById('advancedFilterModal');
        
        const filterBtn = document.getElementById('advancedFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.showModal());
        }
        
        const closeBtn = document.getElementById('closeFilterModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }
        
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hideModal();
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.hideModal();
            }
        });
        
        const selectors = ['filterStartLesson', 'filterEndLesson', 'filterGrammar', 
                          'filterCategory', 'filterSubCategory1', 'filterSubCategory2', 'filterActfl'];
        selectors.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.updateMatchCount());
            }
        });
        
        debugLogger?.log(3, 'FilterManager initialized');
    }
    
    populateFilterOptions() {
        if (!assetManager || !assetManager.cards || assetManager.cards.length === 0) {
            debugLogger?.log(2, 'No cards available for filter options');
            return;
        }
        
        const cards = assetManager.cards;
        const lessons = new Set();
        const grammar = new Set();
        const category = new Set();
        const subCategory1 = new Set();
        const subCategory2 = new Set();
        const actflEst = new Set();
        
        cards.forEach(card => {
            if (card.lesson) lessons.add(card.lesson);
            if (card.grammar) grammar.add(card.grammar);
            if (card.category) category.add(card.category);
            if (card.subCategory1) subCategory1.add(card.subCategory1);
            if (card.subCategory2) subCategory2.add(card.subCategory2);
            if (card.actflEst) actflEst.add(card.actflEst);
        });
        
        this.filterOptions.lessons = Array.from(lessons).sort((a, b) => a - b);
        this.filterOptions.grammar = Array.from(grammar).sort();
        this.filterOptions.category = Array.from(category).sort();
        this.filterOptions.subCategory1 = Array.from(subCategory1).sort();
        this.filterOptions.subCategory2 = Array.from(subCategory2).sort();
        this.filterOptions.actflEst = Array.from(actflEst).sort();
        
        this.populateDropdown('filterStartLesson', this.filterOptions.lessons, true);
        this.populateDropdown('filterEndLesson', this.filterOptions.lessons, true);
        this.populateDropdown('filterGrammar', this.filterOptions.grammar);
        this.populateDropdown('filterCategory', this.filterOptions.category);
        this.populateDropdown('filterSubCategory1', this.filterOptions.subCategory1);
        this.populateDropdown('filterSubCategory2', this.filterOptions.subCategory2);
        this.populateDropdown('filterActfl', this.filterOptions.actflEst);
        
        debugLogger?.log(3, `Filter options populated: ${this.filterOptions.lessons.length} lessons`);
    }
    
    populateDropdown(elementId, options, isLesson = false) {
        const select = document.getElementById(elementId);
        if (!select) return;
        
        select.innerHTML = '<option value="">All</option>';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = isLesson ? `Lesson ${opt}` : opt;
            select.appendChild(option);
        });
    }
    
    showModal() {
        this.populateFilterOptions();
        this.restoreFilterValues();
        this.updateMatchCount();
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }
    
    hideModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
    
    restoreFilterValues() {
        const setSelectValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        
        setSelectValue('filterStartLesson', this.filters.startLesson);
        setSelectValue('filterEndLesson', this.filters.endLesson);
        setSelectValue('filterGrammar', this.filters.grammar);
        setSelectValue('filterCategory', this.filters.category);
        setSelectValue('filterSubCategory1', this.filters.subCategory1);
        setSelectValue('filterSubCategory2', this.filters.subCategory2);
        setSelectValue('filterActfl', this.filters.actflEst);
    }
    
    getSelectedFilters() {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el && el.value ? el.value : null;
        };
        
        return {
            startLesson: getValue('filterStartLesson') ? parseInt(getValue('filterStartLesson')) : null,
            endLesson: getValue('filterEndLesson') ? parseInt(getValue('filterEndLesson')) : null,
            grammar: getValue('filterGrammar'),
            category: getValue('filterCategory'),
            subCategory1: getValue('filterSubCategory1'),
            subCategory2: getValue('filterSubCategory2'),
            actflEst: getValue('filterActfl')
        };
    }
    
    getMatchingCards() {
        if (!assetManager || !assetManager.cards) return [];
        
        const filters = this.getSelectedFilters();
        let cards = [...assetManager.cards];
        
        if (filters.startLesson !== null || filters.endLesson !== null) {
            const start = filters.startLesson || 1;
            const end = filters.endLesson || 999;
            cards = cards.filter(card => card.lesson >= start && card.lesson <= end);
        }
        
        if (filters.grammar) {
            cards = cards.filter(card => card.grammar === filters.grammar);
        }
        if (filters.category) {
            cards = cards.filter(card => card.category === filters.category);
        }
        if (filters.subCategory1) {
            cards = cards.filter(card => card.subCategory1 === filters.subCategory1);
        }
        if (filters.subCategory2) {
            cards = cards.filter(card => card.subCategory2 === filters.subCategory2);
        }
        if (filters.actflEst) {
            cards = cards.filter(card => card.actflEst === filters.actflEst);
        }
        
        return cards;
    }
    
    updateMatchCount() {
        const matchingCards = this.getMatchingCards();
        const countEl = document.getElementById('filterMatchCount');
        if (countEl) {
            countEl.textContent = `${matchingCards.length} card${matchingCards.length !== 1 ? 's' : ''} match`;
            countEl.style.color = matchingCards.length === 0 ? 'var(--error)' : 'var(--success)';
        }
    }
    
    applyFilters() {
        const filters = this.getSelectedFilters();
        const matchingCards = this.getMatchingCards();
        
        if (matchingCards.length === 0) {
            toastManager?.show('No cards match the selected filters', 'warning');
            return;
        }
        
        const hasAdvancedFilter = filters.grammar || filters.category || 
                                  filters.subCategory1 || filters.subCategory2 || 
                                  filters.actflEst ||
                                  (filters.startLesson !== null && filters.endLesson !== null && 
                                   filters.startLesson !== filters.endLesson);
        
        this.filters = filters;
        this.isAdvancedFilterActive = hasAdvancedFilter || 
                                      (filters.startLesson !== null || filters.endLesson !== null);
        
        const filterBtn = document.getElementById('advancedFilterBtn');
        if (filterBtn) {
            filterBtn.classList.toggle('filter-active', this.isAdvancedFilterActive);
        }
        
        const lessonSelect = document.getElementById('lessonSelect');
        if (lessonSelect) {
            if (this.isAdvancedFilterActive) {
                lessonSelect.disabled = true;
                lessonSelect.value = '';
                const specialOption = document.createElement('option');
                specialOption.value = 'special';
                specialOption.textContent = 'Special (Filtered)';
                specialOption.id = 'specialFilterOption';
                lessonSelect.appendChild(specialOption);
                lessonSelect.value = 'special';
            } else {
                lessonSelect.disabled = false;
                const specialOpt = document.getElementById('specialFilterOption');
                if (specialOpt) specialOpt.remove();
            }
        }
        
        this.hideModal();
        toastManager?.show(`Filter applied: ${matchingCards.length} cards`, 'success');
        debugLogger?.log(2, `Advanced filter applied: ${matchingCards.length} cards match`);
        
        if (router && router.currentModule) {
            const currentModuleName = window.location.hash.slice(1) || 'flashcards';
            router.navigate(currentModuleName);
        }
    }
    
    clearFilters() {
        this.filters = {
            startLesson: null,
            endLesson: null,
            grammar: null,
            category: null,
            subCategory1: null,
            subCategory2: null,
            actflEst: null
        };
        this.isAdvancedFilterActive = false;
        
        ['filterStartLesson', 'filterEndLesson', 'filterGrammar', 'filterCategory', 
         'filterSubCategory1', 'filterSubCategory2', 'filterActfl'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const filterBtn = document.getElementById('advancedFilterBtn');
        if (filterBtn) {
            filterBtn.classList.remove('filter-active');
        }
        
        const lessonSelect = document.getElementById('lessonSelect');
        if (lessonSelect) {
            lessonSelect.disabled = false;
            const specialOpt = document.getElementById('specialFilterOption');
            if (specialOpt) specialOpt.remove();
            
            if (assetManager && assetManager.lessons.length > 0) {
                lessonSelect.value = assetManager.lessons[0];
                assetManager.setLesson(assetManager.lessons[0]);
            }
        }
        
        this.updateMatchCount();
        toastManager?.show('Filters cleared', 'success');
        debugLogger?.log(2, 'Advanced filters cleared');
        
        if (router && router.currentModule) {
            const currentModuleName = window.location.hash.slice(1) || 'flashcards';
            router.navigate(currentModuleName);
        }
    }
    
    isActive() {
        return this.isAdvancedFilterActive;
    }
    
    getFilteredCards(cards) {
        if (!this.isAdvancedFilterActive) {
            return null;
        }
        
        let filtered = [...cards];
        
        if (this.filters.startLesson !== null || this.filters.endLesson !== null) {
            const start = this.filters.startLesson || 1;
            const end = this.filters.endLesson || 999;
            filtered = filtered.filter(card => card.lesson >= start && card.lesson <= end);
        }
        
        if (this.filters.grammar) {
            filtered = filtered.filter(card => card.grammar === this.filters.grammar);
        }
        if (this.filters.category) {
            filtered = filtered.filter(card => card.category === this.filters.category);
        }
        if (this.filters.subCategory1) {
            filtered = filtered.filter(card => card.subCategory1 === this.filters.subCategory1);
        }
        if (this.filters.subCategory2) {
            filtered = filtered.filter(card => card.subCategory2 === this.filters.subCategory2);
        }
        if (this.filters.actflEst) {
            filtered = filtered.filter(card => card.actflEst === this.filters.actflEst);
        }
        
        return filtered;
    }
}

// =================================================================
// ASSET MANAGER - Version 4.0 - Per-language card support
// =================================================================
class AssetManager {
    constructor() {
        this.manifest = null;
        this.cards = [];           // Cards for current language
        this.languages = [];
        this.lessons = [];         // Lessons for current language
        this.currentLanguage = null;
        this.currentLesson = null;
        this.imageUrls = new Map();
        this.audioUrls = new Map();
    }
    
    async loadManifest() {
        try {
            // Use file modification time for cache busting (from PHP)
            // Falls back to timestamp if MANIFEST_VERSION not available
            const version = window.MANIFEST_VERSION || new Date().getTime();

            const response = await fetch(`assets/manifest.json?v=${version}`, {
                method: 'GET',
                cache: 'default', // Allow browser caching based on version
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.manifest = await response.json();
            this.languages = this.manifest.languages || [];
            
            // Detect manifest version
            const isV4 = this.manifest.version === '4.0' || 
                        (this.manifest.cards && typeof this.manifest.cards === 'object' && !Array.isArray(this.manifest.cards));
            
            if (isV4) {
                debugLogger.log(2, `Loaded v4.0 manifest with ${this.languages.length} languages`);
            } else {
                // v3.x fallback - cards is flat array
                this.cards = this.manifest.cards || [];
                const lessonSet = new Set();
                this.cards.forEach(card => lessonSet.add(card.lesson));
                this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
                debugLogger.log(2, `Loaded v3.x manifest: ${this.cards.length} cards, ${this.lessons.length} lessons`);
            }
            
            // Initialize selectors
            this.populateLanguageSelector();
            
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
            const defaultLang = this.languages.find(l => l.trigraph.toLowerCase() === 'ceb') || 
                               this.languages.find(l => l.trigraph.toLowerCase() !== 'eng') ||
                               this.languages[0];
            selector.value = defaultLang.trigraph.toLowerCase();
            this.setLanguage(defaultLang.trigraph.toLowerCase());
        }
    }
    
    populateLessonSelector() {
        const selector = document.getElementById('lessonSelect');
        if (!selector || this.lessons.length === 0) return;

        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonMeta = this.manifest?.lessonMeta?.[trigraph] || {};

        selector.innerHTML = '<option value="">Select Lesson...</option>';
        this.lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;

            // Check if this is a review lesson and mark it
            const meta = lessonMeta[lesson];
            if (meta?.type === 'review') {
                option.textContent = `Lesson ${lesson} (Review: ${meta.reviewsLessons?.join(', ') || 'N/A'})`;
                option.className = 'review-lesson-option';
            } else {
                option.textContent = `Lesson ${lesson}`;
            }
            selector.appendChild(option);
        });

        // Auto-select first lesson if none selected
        if (!this.currentLesson && this.lessons.length > 0) {
            selector.value = this.lessons[0];
            this.setLesson(this.lessons[0]);
        } else if (this.currentLesson && this.lessons.includes(this.currentLesson)) {
            // Keep current lesson if it exists in new language
            selector.value = this.currentLesson;
        } else if (this.lessons.length > 0) {
            // Reset to first lesson if current doesn't exist
            selector.value = this.lessons[0];
            this.setLesson(this.lessons[0]);
        }
    }
    
    setLanguage(languageTrigraph) {
        const lang = this.languages.find(l => l.trigraph.toLowerCase() === languageTrigraph.toLowerCase());
        if (!lang) return false;
        
        this.currentLanguage = lang;
        const trigraph = lang.trigraph.toLowerCase();
        
        // Check if v4.0 manifest (cards is object with trigraph keys)
        if (this.manifest.cards && typeof this.manifest.cards === 'object' && !Array.isArray(this.manifest.cards)) {
            // v4.0: Load cards for this language
            this.cards = this.manifest.cards[trigraph] || [];
            
            // Get lessons for this language from languageStats
            if (this.manifest.stats?.languageStats?.[trigraph]?.lessons) {
                this.lessons = this.manifest.stats.languageStats[trigraph].lessons.sort((a, b) => a - b);
            } else {
                // Fallback: extract from cards
                const lessonSet = new Set();
                this.cards.forEach(card => lessonSet.add(card.lesson));
                this.lessons = Array.from(lessonSet).sort((a, b) => a - b);
            }
            
            debugLogger.log(2, `Language set to: ${lang.name} (${trigraph}) - ${this.cards.length} cards, ${this.lessons.length} lessons`);
        } else {
            // v3.x: Cards are flat array, just update currentLanguage
            debugLogger.log(2, `Language set to: ${lang.name} (${lang.trigraph})`);
        }
        
        // Update lesson selector for new language
        this.populateLessonSelector();
        
        // Clear advanced filters when language changes
        if (filterManager && filterManager.isAdvancedFilterActive) {
            filterManager.clearFilters();
        }
        
        this.updateModuleTitles();
        
        return true;
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
    
    // Get language name from trigraph
    getLanguageName(trigraph) {
        const lang = this.languages.find(l => l.trigraph.toLowerCase() === trigraph.toLowerCase());
        return lang ? lang.name : trigraph.toUpperCase();
    }
    
    getCards(filters = {}) {
        let filtered = [...this.cards];

        // Check if advanced filter is active
        if (filterManager && filterManager.isActive()) {
            filtered = filterManager.getFilteredCards(this.cards);
            if (filtered === null) {
                filtered = [...this.cards];
            }
        } else {
            // Normal lesson filtering
            const lessonFilter = filters.lesson !== undefined ? filters.lesson : this.currentLesson;
            if (lessonFilter !== null && lessonFilter !== undefined) {
                // Check if this is a review lesson
                const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
                const lessonMeta = this.manifest?.lessonMeta?.[trigraph]?.[lessonFilter];

                if (lessonMeta?.type === 'review' && lessonMeta?.reviewsLessons?.length > 0) {
                    // Review lesson: get cards from all reviewed lessons
                    const reviewedLessons = lessonMeta.reviewsLessons;
                    filtered = filtered.filter(card => reviewedLessons.includes(card.lesson));
                    debugLogger?.log(2, `Review lesson ${lessonFilter}: Loading cards from lessons ${reviewedLessons.join(', ')}`);
                } else {
                    // Regular lesson: filter by exact lesson number
                    filtered = filtered.filter(card => card.lesson === lessonFilter);
                }
            }
        }

        // Filter by audio availability
        if (filters.hasAudio !== undefined) {
            filtered = filtered.filter(card => card.hasAudio === filters.hasAudio);
        }

        // Filter by image availability
        if (filters.hasImage !== undefined) {
            filtered = filtered.filter(card => {
                const hasImg = card.hasImage || card.printImagePath || card.hasGif;
                return hasImg === filters.hasImage;
            });
        }

        // Filter by type (N = noun, V = verb, etc.)
        if (filters.type) {
            filtered = filtered.filter(card => card.type === filters.type);
        }

        // Filter by category
        if (filters.category) {
            filtered = filtered.filter(card => card.category === filters.category);
        }

        // Enrich cards to ensure consistent structure
        return filtered.map(card => this.enrichCard(card));
    }

    /**
     * Check if a lesson is a review lesson
     */
    isReviewLesson(lessonNum) {
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonMeta = this.manifest?.lessonMeta?.[trigraph]?.[lessonNum];
        return lessonMeta?.type === 'review';
    }

    /**
     * Get the lessons being reviewed by a review lesson
     */
    getReviewedLessons(lessonNum) {
        const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
        const lessonMeta = this.manifest?.lessonMeta?.[trigraph]?.[lessonNum];
        return lessonMeta?.reviewsLessons || [];
    }
    
    enrichCard(card) {
        // Detect manifest version based on card structure
        const isV4Card = card.word !== undefined && card.english !== undefined;
        
        if (isV4Card) {
            // v4.0 card structure - direct properties
            const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
            
            // Build acceptableAnswers
            let acceptableAnswers = card.acceptableAnswers;
            if (!acceptableAnswers || !Array.isArray(acceptableAnswers)) {
                acceptableAnswers = card.word ? card.word.split('/').map(w => w.trim()).filter(w => w) : [];
            }
            
            // Build englishAcceptable
            let englishAcceptable = card.englishAcceptable;
            if (!englishAcceptable || !Array.isArray(englishAcceptable)) {
                englishAcceptable = card.english ? card.english.split('/').map(w => w.trim()).filter(w => w) : [];
            }

            // Get image path with browser capability detection
            let imagePath = null;
            let isVideo = false;

            const availableFormats = this.manifest.images?.[card.cardNum] || {};

            // Check if animated formats exist in the available formats (not just hasGif flag)
            const hasAnimatedFormats = availableFormats.gif || availableFormats.mp4 || availableFormats.webm;

            if (card.hasGif || hasAnimatedFormats) {
                // Prefer animated/video formats
                const videoFormat = browserCapabilityDetector?.getPreferredVideoFormat(availableFormats);
                if (videoFormat) {
                    imagePath = availableFormats[videoFormat];
                    isVideo = videoFormat === 'mp4' || videoFormat === 'webm';
                } else {
                    // Fallback to print image if no animation available
                    imagePath = card.printImagePath;
                }
                debugLogger?.log(3, `Card ${card.cardNum}: Available formats: ${JSON.stringify(Object.keys(availableFormats))}, Selected: ${videoFormat || 'fallback'}, isVideo: ${isVideo}`);
            } else {
                // Use static image with format preference
                const imageFormat = browserCapabilityDetector?.getPreferredImageFormat(availableFormats);
                if (imageFormat) {
                    imagePath = availableFormats[imageFormat];
                } else {
                    // Fallback to printImagePath
                    imagePath = card.printImagePath;
                }
                debugLogger?.log(3, `Card ${card.cardNum}: Available formats: ${JSON.stringify(Object.keys(availableFormats))}, Selected: ${imageFormat || 'fallback'}, Path: ${imagePath}`);
            }

            // Handle audio as array (for multi-variant support)
            let audioPath = card.audio;
            if (audioPath && !Array.isArray(audioPath)) {
                audioPath = [audioPath];  // Convert single value to array
            } else if (!audioPath) {
                audioPath = [];
            }
            // Filter out null values
            audioPath = audioPath.filter(p => p !== null && p !== undefined && p !== '');

            // Build cebuanoAcceptable for non-Cebuano languages
            let cebuanoAcceptable = [];
            if (card.cebuano) {
                cebuanoAcceptable = card.cebuano.split('/').map(w => w.trim()).filter(w => w);
            }

            // Build allTranslations object
            const allTranslations = {
                [this.getLangKeyFromTrigraph(trigraph)]: {
                    word: card.word,
                    note: card.wordNote || '',
                    acceptableAnswers
                },
                english: {
                    word: card.english,
                    note: card.englishNote || '',
                    acceptableAnswers: englishAcceptable
                }
            };

            // Add Cebuano translation for non-Cebuano languages
            if (trigraph !== 'ceb' && card.cebuano) {
                allTranslations.cebuano = {
                    word: card.cebuano,
                    note: card.cebuanoNote || '',
                    acceptableAnswers: cebuanoAcceptable
                };
            }

            return {
                ...card,
                // Normalized properties for module compatibility
                acceptableAnswers,
                englishAcceptable,
                cebuanoAcceptable,
                audioPath: audioPath,  // Always an array
                imagePath: imagePath,
                isVideo: isVideo,  // True if imagePath is a video file (mp4/webm)
                // Keep word/english/cebuano as primary display
                word: card.word,
                english: card.english,
                cebuano: card.cebuano || '',
                wordNote: card.wordNote || '',
                englishNote: card.englishNote || '',
                cebuanoNote: card.cebuanoNote || '',
                // For v3.x compatibility in modules that expect translations
                allTranslations: allTranslations
            };
        } else {
            // v3.x card structure - translations object
            let allTranslations;
            
            if (card.translations) {
                allTranslations = card.translations;
            } else {
                allTranslations = {
                    cebuano: card.cebuano ? { word: card.cebuano, note: card.cebuanoNote || '' } : null,
                    english: card.english ? { word: card.english, note: card.englishNote || '' } : null,
                    maranao: card.maranao ? { word: card.maranao, note: card.maranaoNote || '' } : null,
                    sinama: card.sinama ? { word: card.sinama, note: card.sinamaNote || '' } : null
                };
            }
            
            // Get learning language key
            const learningLangKey = this.currentLanguage ? this.currentLanguage.trigraph.toLowerCase() : 'ceb';
            const learningLangName = this.getLangKeyFromTrigraph(learningLangKey);
            
            // Get primary translation for current learning language
            const primaryTranslation = allTranslations[learningLangName];
            
            // Build acceptableAnswers
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
            
            // Get audio path for current language (handle as array)
            let audioData = card.audio && card.audio[learningLangKey] ?
                card.audio[learningLangKey] : (card.audioPath || null);

            let audioPath = [];
            if (audioData) {
                if (Array.isArray(audioData)) {
                    audioPath = audioData.filter(p => p !== null && p !== undefined && p !== '');
                } else {
                    audioPath = [audioData];
                }
            }

            return {
                ...card,
                allTranslations,
                acceptableAnswers,
                audioPath: audioPath,  // Always an array
                imagePath: card.imagePath || card.printImagePath,
                // Add v4-style properties for compatibility
                word: primaryTranslation?.word || card.cebuano || '',
                english: allTranslations.english?.word || card.english || ''
            };
        }
    }
    
    // Convert trigraph to language key name
    getLangKeyFromTrigraph(trigraph) {
        const map = {
            'ceb': 'cebuano',
            'eng': 'english',
            'mrw': 'maranao',
            'sin': 'sinama'
        };
        return map[trigraph.toLowerCase()] || trigraph.toLowerCase();
    }
    
    // Get image path for a card (handles both v3 and v4)
    getImagePath(card) {
        if (card.imagePath) return card.imagePath;
        if (card.printImagePath) return card.printImagePath;
        
        // v4.0: Check manifest.images
        const cardNum = card.cardNum || card.wordNum;
        if (cardNum && this.manifest.images?.[cardNum]) {
            const imgData = this.manifest.images[cardNum];
            return imgData.gif || imgData.png || null;
        }
        
        return null;
    }
    
    // Get audio path for a card
    getAudioPath(card) {
        if (card.audioPath) return card.audioPath;
        if (card.audio) {
            // v4.0: audio is direct string path
            if (typeof card.audio === 'string') return card.audio;
            // v3.x: audio is object with trigraph keys
            const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';
            return card.audio[trigraph] || null;
        }
        return null;
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
            
            let imgHtml = '<div style="width:60px;height:60px;background:#ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto 5px;">??</div>';
            
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
                ${card.hasAudio ? '<div class="audio-indicator">??</div>' : ''}
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
// ROUTER - WITH AUTHENTICATION
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
        // Check authentication for protected modules
        try {
            const canAccess = await authManager.requireAuth(moduleName);
            
            if (!canAccess) {
                debugLogger.log(2, `Access denied to ${moduleName} - authentication required`);
                return;
            }
        } catch (err) {
            // User cancelled login or auth failed
            debugLogger.log(2, `Authentication cancelled for ${moduleName}`);
            return;
        }
        
        // Proceed with navigation
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
// TWO-LEVEL NAVIGATION SYSTEM
// =================================================================

// Module to category mapping
const moduleCategories = {
    'flashcards': 'word-discovery',
    'match': 'word-discovery',
    'match-sound': 'word-discovery',
    'quiz': 'word-discovery',
    'sentence-review': 'sentence-zone',
    'conversation-practice': 'sentence-zone',
    'picture-story': 'sentence-zone',
    'sentence-builder': 'sentence-zone'
};

// Current navigation state
let currentNavCategory = null;

/**
 * Initialize two-level navigation system
 */
function initTwoLevelNavigation() {
    const navLevel1 = document.getElementById('navLevel1');
    const navWordDiscovery = document.getElementById('navWordDiscovery');
    const navSentenceZone = document.getElementById('navSentenceZone');

    // Category button clicks (Word Discovery, Sentence Zone)
    document.querySelectorAll('.nav-tab[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            showNavLevel2(category);
        });
    });

    // Back button clicks
    document.querySelectorAll('.nav-tab[data-back]').forEach(btn => {
        btn.addEventListener('click', () => {
            showNavLevel1();
        });
    });

    // Check initial hash to determine which nav level to show
    const hash = window.location.hash.slice(1) || 'flashcards';
    const category = moduleCategories[hash];

    if (category) {
        showNavLevel2(category, false);
        updateActiveTab(hash);
    }
}

/**
 * Show Level 1 navigation (main categories)
 */
function showNavLevel1() {
    const navLevel1 = document.getElementById('navLevel1');
    const navWordDiscovery = document.getElementById('navWordDiscovery');
    const navSentenceZone = document.getElementById('navSentenceZone');

    navLevel1.classList.remove('hidden');
    navWordDiscovery.classList.add('hidden');
    navSentenceZone.classList.add('hidden');

    currentNavCategory = null;
}

/**
 * Show Level 2 navigation for a specific category
 * @param {string} category - The category to show ('word-discovery' or 'sentence-zone')
 * @param {boolean} navigateToDefault - Whether to navigate to the default module
 */
function showNavLevel2(category, navigateToDefault = true) {
    const navLevel1 = document.getElementById('navLevel1');
    const navWordDiscovery = document.getElementById('navWordDiscovery');
    const navSentenceZone = document.getElementById('navSentenceZone');

    navLevel1.classList.add('hidden');

    if (category === 'word-discovery') {
        navWordDiscovery.classList.remove('hidden');
        navSentenceZone.classList.add('hidden');
        if (navigateToDefault && router) {
            router.navigate('flashcards');
            updateActiveTab('flashcards');
        }
    } else if (category === 'sentence-zone') {
        navSentenceZone.classList.remove('hidden');
        navWordDiscovery.classList.add('hidden');
        if (navigateToDefault && router) {
            router.navigate('sentence-review');
            updateActiveTab('sentence-review');
        }
    }

    currentNavCategory = category;
}

/**
 * Update active tab styling across all navigation levels
 * @param {string} moduleName - The active module name
 */
function updateActiveTab(moduleName) {
    // Remove active from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active to matching module tab
    document.querySelectorAll(`.nav-tab[data-module="${moduleName}"]`).forEach(tab => {
        tab.classList.add('active');
    });

    // Also highlight the category in Level 1 if applicable
    const category = moduleCategories[moduleName];
    if (category) {
        document.querySelectorAll(`.nav-tab[data-category="${category}"]`).forEach(tab => {
            tab.classList.add('active');
        });
    }
}

// =================================================================
// INITIALIZATION - WITH AUTHENTICATION
// =================================================================
async function init() {
    debugLogger = new DebugLogger();
    debugLogger.init();
    debugLogger.log(2, 'Application starting...');
    
    // Initialize authentication manager
    authManager = new AuthManager();
    await authManager.init();

    // Expose authManager to window for modules that need it
    window.authManager = authManager;
    
    // Initialize device detector early
    deviceDetector = new DeviceDetector();

    // Initialize browser capability detector
    browserCapabilityDetector = new BrowserCapabilityDetector();
    await browserCapabilityDetector.init();

    themeManager = new ThemeManager();
    themeManager.init();
    
    toastManager = new ToastManager();
    toastManager.init();
    
    instructionManager = new InstructionManager();
    instructionManager.init();
    
    // Initialize filter manager
    filterManager = new FilterManager();
    filterManager.init();
    
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
                
                // Update filter button appearance
                const filterBtn = document.getElementById('advancedFilterBtn');
                if (filterBtn) {
                    filterBtn.classList.remove('filter-active');
                }
                
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
            // Ignore if "special" is selected (from advanced filter)
            if (e.target.value === 'special') return;
            
            const lessonNum = parseInt(e.target.value);
            if (lessonNum && assetManager.setLesson(lessonNum)) {
                // Clear advanced filter when manually selecting a lesson
                if (filterManager && filterManager.isActive()) {
                    filterManager.filters = {
                        startLesson: null,
                        endLesson: null,
                        grammar: null,
                        category: null,
                        subCategory1: null,
                        subCategory2: null,
                        actflEst: null
                    };
                    filterManager.isAdvancedFilterActive = false;
                    
                    const filterBtn = document.getElementById('advancedFilterBtn');
                    if (filterBtn) {
                        filterBtn.classList.remove('filter-active');
                    }
                    
                    const specialOpt = document.getElementById('specialFilterOption');
                    if (specialOpt) specialOpt.remove();
                }
                
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
        router.register('grammar', GrammarModule);
        router.register('teacher-guide', TeacherGuideModule);
        router.register('flashcards', FlashcardsModule);
        router.register('match', MatchExerciseModule);
        router.register('match-sound', MatchSoundModule);
        router.register('quiz', UnsaNiQuizModule);
        router.register('sentence-builder', SentenceBuilderModule);
        router.register('sentence-review', SentenceReviewModule);
        router.register('pdf', PDFPrintModule);
        router.register('deck-builder', DeckBuilderModule);
        router.register('admin', AdminModule);
        router.register('kanban', KanbanTrackerModule);
    }

    // Register new sentence modules if available
    if (typeof ConversationPracticeModule !== 'undefined') {
        router.register('conversation-practice', ConversationPracticeModule);
    }
    if (typeof PictureStoryModule !== 'undefined') {
        router.register('picture-story', PictureStoryModule);
    }

    // Two-level navigation system
    initTwoLevelNavigation();

    // Navigation events for direct module tabs
    document.querySelectorAll('.nav-tab[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.module) {
                router.navigate(btn.dataset.module);
                updateActiveTab(btn.dataset.module);
            }
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