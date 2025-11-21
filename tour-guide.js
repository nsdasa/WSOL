/**
 * Tour Guide System using Driver.js
 * Bob and Mariel Ward School of Filipino Languages
 *
 * Configuration is loaded from tour-config.json for easy editing
 * Includes smart setup to ensure UI elements are visible before touring
 */

// Tour configuration - loaded from JSON
let tours = {};
let toursLoaded = false;

// Load tour configuration from JSON file
async function loadTourConfig() {
    if (toursLoaded) return tours;

    try {
        const response = await fetch('tour-config.json?v=' + Date.now());
        if (!response.ok) {
            throw new Error('Failed to load tour config');
        }
        const config = await response.json();

        // Transform JSON config into Driver.js format
        tours = {};
        for (const [moduleName, moduleConfig] of Object.entries(config)) {
            // Skip comment fields
            if (moduleName.startsWith('_')) continue;

            // Handle both array (old format) and object (new phased format)
            if (Array.isArray(moduleConfig)) {
                tours[moduleName] = {
                    steps: moduleConfig.map(step => ({
                        element: step.element,
                        popover: {
                            title: step.title,
                            description: step.description,
                            position: step.position || 'bottom'
                        }
                    }))
                };
            } else {
                // New phased format with phases
                tours[moduleName] = moduleConfig;
            }
        }

        toursLoaded = true;
        console.log('Tour config loaded. Available tours:', Object.keys(tours));
        return tours;
    } catch (error) {
        console.error('Error loading tour config:', error);
        return {};
    }
}

// Load config for /rec module (different path)
async function loadTourConfigRec() {
    if (toursLoaded) return tours;

    try {
        const response = await fetch('../tour-config.json?v=' + Date.now());
        if (!response.ok) {
            throw new Error('Failed to load tour config');
        }
        const config = await response.json();

        // Transform JSON config into Driver.js format
        tours = {};
        for (const [moduleName, moduleConfig] of Object.entries(config)) {
            if (moduleName.startsWith('_')) continue;

            if (Array.isArray(moduleConfig)) {
                tours[moduleName] = {
                    steps: moduleConfig.map(step => ({
                        element: step.element,
                        popover: {
                            title: step.title,
                            description: step.description,
                            position: step.position || 'bottom'
                        }
                    }))
                };
            } else {
                tours[moduleName] = moduleConfig;
            }
        }

        toursLoaded = true;
        console.log('Tour config loaded (rec). Available tours:', Object.keys(tours));
        return tours;
    } catch (error) {
        console.error('Error loading tour config:', error);
        return {};
    }
}

// Helper: Wait for an element to appear in DOM
function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const el = document.querySelector(selector);
            if (el) {
                obs.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

// Helper: Small delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Transform step config to Driver.js format
function transformSteps(steps) {
    return steps.map(step => ({
        element: step.element,
        popover: {
            title: step.title,
            description: step.description,
            position: step.position || 'bottom'
        }
    }));
}

// Setup function for match/match-sound modules
async function setupMatchModule(moduleName) {
    const isMatchSound = moduleName === 'match-sound';
    const reviewSettingsId = isMatchSound ? '#reviewSettingsSound' : '#reviewSettings';

    // Check if already started (content exists in matching container)
    const container = document.querySelector('#matchingContainer');
    const hasContent = container && container.querySelector('.pictures-row');

    if (!hasContent) {
        // Ensure review mode is selected
        const reviewBtn = document.querySelector('.mode-btn[data-mode="review"]');
        if (reviewBtn && !reviewBtn.classList.contains('active')) {
            reviewBtn.click();
            await delay(100);
        }

        // Click start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.click();
            // Wait for content to load
            await delay(500);
            try {
                await waitForElement('.pictures-row', 2000);
            } catch (e) {
                console.warn('Could not wait for pictures to load');
            }
        }
    }

    return true;
}

// Setup function for quiz module
async function setupQuizModule() {
    // Check if quiz is already started
    const quizContainer = document.querySelector('#quizContainer');
    const hasStarted = quizContainer && quizContainer.querySelector('.quiz-content');

    if (!hasStarted) {
        // Ensure review mode is selected
        const reviewBtn = document.querySelector('.mode-btn[data-mode="review"]');
        if (reviewBtn && !reviewBtn.classList.contains('active')) {
            reviewBtn.click();
            await delay(100);
        }

        // Click start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.click();
            await delay(500);
            try {
                await waitForElement('.quiz-content', 2000);
            } catch (e) {
                console.warn('Could not wait for quiz to load');
            }
        }
    }

    return true;
}

// Setup function for flashcards module - finds and flips a card with notes
async function setupFlashcardsModule() {
    // Try to get the flashcards module instance
    const flashcardsModule = window.currentModule;

    if (!flashcardsModule || !flashcardsModule.cards) {
        console.warn('Flashcards module not found');
        return false;
    }

    // Find a card with notes
    const cardWithNotesIndex = flashcardsModule.cards.findIndex(card =>
        card.wordNote || card.englishNote || card.cebuanoNote
    );

    if (cardWithNotesIndex >= 0) {
        // Calculate which page this card is on
        const cardsPerPage = flashcardsModule.cardsPerPage || 4;
        const targetPage = Math.floor(cardWithNotesIndex / cardsPerPage);
        const targetIndex = targetPage * cardsPerPage;

        // Navigate to that page if needed
        if (flashcardsModule.currentIndex !== targetIndex) {
            flashcardsModule.currentIndex = targetIndex;
            flashcardsModule.renderPage();
            await delay(300);
        }

        // Find the card element on this page and flip it
        const cardIndexOnPage = cardWithNotesIndex % cardsPerPage;
        const cardElements = document.querySelectorAll('#cardsGrid .card');

        if (cardElements[cardIndexOnPage]) {
            const cardEl = cardElements[cardIndexOnPage];
            if (!cardEl.classList.contains('flipped')) {
                cardEl.click();
                await delay(400); // Wait for flip animation
            }
        }
    }

    return true;
}

// Switch to test mode for match/match-sound/quiz
async function switchToTestMode(moduleName) {
    const testBtn = document.querySelector('.mode-btn[data-mode="test"]');
    if (testBtn && !testBtn.classList.contains('active')) {
        testBtn.click();
        await delay(100);
    }

    // Restart the exercise in test mode
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.click();
        await delay(500);

        // Wait for content to load
        if (moduleName === 'quiz') {
            try {
                await waitForElement('.quiz-content', 2000);
            } catch (e) {}
        } else {
            try {
                await waitForElement('.pictures-row', 2000);
            } catch (e) {}
        }
    }

    return true;
}

// Run a phased tour (review mode -> test mode)
async function runPhasedTour(moduleName, tourConfig) {
    const driverObj = window.driver && window.driver.js && window.driver.js.driver;

    if (!driverObj) {
        console.error('Driver.js library not loaded properly');
        alert('Tour feature not available. Please refresh the page and try again.');
        return;
    }

    // Phase 1: Intro steps (shown before any mode)
    if (tourConfig.intro && tourConfig.intro.length > 0) {
        const introSteps = transformSteps(tourConfig.intro).filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element) !== null;
        });

        if (introSteps.length > 0) {
            await new Promise((resolve) => {
                const driverInstance = driverObj({
                    showProgress: true,
                    showButtons: ['next', 'previous', 'close'],
                    steps: introSteps,
                    onDestroyed: resolve,
                    onDestroyStarted: (element, step, options) => {
                        // If user clicked close, abort the tour
                        if (!options.state.activeIndex || options.state.activeIndex < introSteps.length - 1) {
                            options.state.tourAborted = true;
                        }
                        return true;
                    }
                });
                driverInstance.drive();
            });
        }
    }

    // Setup and show review mode
    if (moduleName === 'match' || moduleName === 'match-sound') {
        await setupMatchModule(moduleName);
    } else if (moduleName === 'quiz') {
        await setupQuizModule();
    }

    // Phase 2: Review mode steps
    if (tourConfig.review && tourConfig.review.length > 0) {
        await delay(300);

        const reviewSteps = transformSteps(tourConfig.review).filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element) !== null;
        });

        if (reviewSteps.length > 0) {
            await new Promise((resolve) => {
                const driverInstance = driverObj({
                    showProgress: true,
                    showButtons: ['next', 'previous', 'close'],
                    steps: reviewSteps,
                    onDestroyed: resolve
                });
                driverInstance.drive();
            });
        }
    }

    // Phase 3: Switch to test mode and show test steps
    if (tourConfig.test && tourConfig.test.length > 0) {
        await switchToTestMode(moduleName);
        await delay(300);

        const testSteps = transformSteps(tourConfig.test).filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element) !== null;
        });

        if (testSteps.length > 0) {
            await new Promise((resolve) => {
                const driverInstance = driverObj({
                    showProgress: true,
                    showButtons: ['next', 'previous', 'close'],
                    steps: testSteps,
                    onDestroyed: resolve
                });
                driverInstance.drive();
            });
        }
    }
}

// Run flashcards tour with card flip
async function runFlashcardsTour(tourConfig) {
    const driverObj = window.driver && window.driver.js && window.driver.js.driver;

    if (!driverObj) {
        console.error('Driver.js library not loaded properly');
        alert('Tour feature not available. Please refresh the page and try again.');
        return;
    }

    // Phase 1: Intro/front card steps
    if (tourConfig.intro && tourConfig.intro.length > 0) {
        const introSteps = transformSteps(tourConfig.intro).filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element) !== null;
        });

        if (introSteps.length > 0) {
            await new Promise((resolve) => {
                const driverInstance = driverObj({
                    showProgress: true,
                    showButtons: ['next', 'previous', 'close'],
                    steps: introSteps,
                    onDestroyed: resolve
                });
                driverInstance.drive();
            });
        }
    }

    // Setup: Navigate to card with notes and flip it
    await setupFlashcardsModule();
    await delay(300);

    // Phase 2: Card back steps
    if (tourConfig.cardBack && tourConfig.cardBack.length > 0) {
        const cardBackSteps = transformSteps(tourConfig.cardBack).filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element) !== null;
        });

        if (cardBackSteps.length > 0) {
            await new Promise((resolve) => {
                const driverInstance = driverObj({
                    showProgress: true,
                    showButtons: ['next', 'previous', 'close'],
                    steps: cardBackSteps,
                    onDestroyed: resolve
                });
                driverInstance.drive();
            });
        }
    }
}

// Function to manually trigger tour (for "Show Tour" button)
async function showTour(moduleName) {
    // Load config if not already loaded
    if (!toursLoaded) {
        // Detect if we're in /rec directory
        if (window.location.pathname.includes('/rec')) {
            await loadTourConfigRec();
        } else {
            await loadTourConfig();
        }
    }

    if (!tours[moduleName]) {
        console.warn(`No tour defined for module: ${moduleName}`);
        alert('Tour not available for this module.');
        return;
    }

    const tourConfig = tours[moduleName];

    // Check if this is a phased tour (has intro/review/test or intro/cardBack structure)
    if (tourConfig.intro || tourConfig.review || tourConfig.test || tourConfig.cardBack) {
        // Phased tour
        if (moduleName === 'flashcards') {
            await runFlashcardsTour(tourConfig);
        } else if (moduleName === 'match' || moduleName === 'match-sound' || moduleName === 'quiz') {
            await runPhasedTour(moduleName, tourConfig);
        } else {
            // For other modules (like rec), run simple tour with all phases combined
            const allSteps = [
                ...(tourConfig.intro || []),
                ...(tourConfig.review || []),
                ...(tourConfig.test || []),
                ...(tourConfig.cardBack || [])
            ];
            await runSimpleTour(transformSteps(allSteps));
        }
    } else if (tourConfig.steps) {
        // Old format with steps array
        await runSimpleTour(tourConfig.steps);
    } else {
        console.warn('Invalid tour config format for module:', moduleName);
        alert('Tour configuration error.');
    }
}

// Simple tour runner (for modules that don't need smart setup)
async function runSimpleTour(steps) {
    const driverObj = window.driver && window.driver.js && window.driver.js.driver;

    if (!driverObj) {
        console.error('Driver.js library not loaded properly');
        alert('Tour feature not available. Please refresh the page and try again.');
        return;
    }

    // Filter out steps where elements don't exist
    const availableSteps = steps.filter(step => {
        if (!step.element) return true;
        return document.querySelector(step.element) !== null;
    });

    if (availableSteps.length === 0) {
        alert('Tour not available - please ensure the module is fully loaded.');
        return;
    }

    const driverInstance = driverObj({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: availableSteps,
        onDestroyed: () => {
            // Optional: Could add analytics here
        }
    });

    try {
        driverInstance.drive();
    } catch (error) {
        console.error('Error showing tour:', error);
        alert('Unable to start tour. Please try again.');
    }
}

// Function to reset all tours (for testing or user preference)
function resetAllTours() {
    Object.keys(tours).forEach(moduleName => {
        localStorage.removeItem(`tour_completed_${moduleName}`);
    });
    console.log('All tours have been reset');
}

// Expose functions globally
window.showTour = showTour;
window.resetAllTours = resetAllTours;

// Pre-load config on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/rec')) {
        loadTourConfigRec();
    } else {
        loadTourConfig();
    }
});

// Debug: Log when tour guide is loaded
console.log('Tour Guide System initialized (v2 - smart setup)');
