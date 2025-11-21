/**
 * Tour Guide System using Driver.js
 * Bob and Mariel Ward School of Filipino Languages
 *
 * Provides interactive onboarding tours for each module
 */

// Tour definitions for each module
const tours = {
    flashcards: [
        {
            element: '.module-flashcards h1',
            popover: {
                title: 'Welcome to Flashcards!',
                description: 'Study vocabulary with interactive flashcards. Click cards to flip between the word and translation.',
                position: 'bottom'
            }
        },
        {
            element: '.vp-toggle-container',
            popover: {
                title: 'Voice Practice Mode',
                description: 'Enable this to practice speaking! You\'ll be able to record your pronunciation and compare it with native audio.',
                position: 'bottom'
            }
        },
        {
            element: '.translation-toggle-container',
            popover: {
                title: 'Choose Translation Language',
                description: 'For Maranao and Sinama, select whether you want to see English or Cebuano translations on the card backs.',
                position: 'bottom',
                onNextClick: function() {
                    // This popover only appears for non-Cebuano languages
                    const elem = document.querySelector('.translation-toggle-container');
                    if (!elem) {
                        // Skip to next step if element doesn't exist
                        return true;
                    }
                }
            }
        },
        {
            element: '#cardsGrid',
            popover: {
                title: 'Flashcard Display',
                description: 'Click any card to flip it and see the translation. Audio will play automatically if available.',
                position: 'top'
            }
        },
        {
            element: '.controls',
            popover: {
                title: 'Navigation Controls',
                description: 'Use Previous/Next to move between pages, or Restart to go back to the beginning. You can also use arrow keys!',
                position: 'top'
            }
        }
    ],

    match: [
        {
            element: '.module-match h1',
            popover: {
                title: 'Welcome to Picture Match!',
                description: 'Test your vocabulary by matching words with their corresponding pictures.',
                position: 'bottom'
            }
        },
        {
            element: '.mode-buttons',
            popover: {
                title: 'Choose Your Mode',
                description: 'Review Mode: Practice until you master each word (repeat multiple times). Test Mode: One chance per word with a final score.',
                position: 'bottom'
            }
        },
        {
            element: '#reviewSettings',
            popover: {
                title: 'Review Repetitions',
                description: 'In Review Mode, set how many times you need to match each word correctly before it\'s considered mastered (default: 3 times).',
                position: 'bottom'
            }
        },
        {
            element: '.progress-section',
            popover: {
                title: 'Track Your Progress',
                description: 'Watch your progress bar fill up as you correctly match more words!',
                position: 'bottom'
            }
        },
        {
            element: '#matchingContainer',
            popover: {
                title: 'How to Play',
                description: 'Click a word from the top row, then click the matching picture below. Lines will connect your matches!',
                position: 'top'
            }
        },
        {
            element: '#startBtn',
            popover: {
                title: 'Ready to Start?',
                description: 'Click Start to begin matching! Good luck!',
                position: 'left'
            }
        }
    ],

    'match-sound': [
        {
            element: '.module-match-sound h1',
            popover: {
                title: 'Welcome to Audio Match!',
                description: 'Listen to audio and match it with the correct picture. This helps develop your listening skills!',
                position: 'bottom'
            }
        },
        {
            element: '.mode-buttons',
            popover: {
                title: 'Choose Your Mode',
                description: 'Review Mode: Keep practicing each word until you master it. Test Mode: One attempt per word with scoring.',
                position: 'bottom'
            }
        },
        {
            element: '#reviewSettingsSound',
            popover: {
                title: 'Review Repetitions',
                description: 'Set how many correct matches needed before a word is mastered in Review Mode.',
                position: 'bottom'
            }
        },
        {
            element: '#matchingContainer',
            popover: {
                title: 'Listen and Match',
                description: 'Audio will play automatically. Click the picture that matches what you hear. Click the speaker icon to replay!',
                position: 'top'
            }
        },
        {
            element: '.progress-section',
            popover: {
                title: 'Progress Tracker',
                description: 'See how many words you\'ve successfully matched!',
                position: 'bottom'
            }
        }
    ],

    quiz: [
        {
            element: '.module-quiz h1',
            popover: {
                title: 'Welcome to Unsa Ni?',
                description: '"Unsa Ni?" means "What is this?" in Cebuano. Type the correct word for each picture!',
                position: 'bottom'
            }
        },
        {
            element: '.mode-buttons',
            popover: {
                title: 'Select Mode',
                description: 'Review Mode: Practice with spaced repetition until mastered. Test Mode: Go through all cards once with scoring.',
                position: 'bottom'
            }
        },
        {
            element: '#quizContainer .center-panel',
            popover: {
                title: 'Picture Display',
                description: 'Look at the picture and type the corresponding word in your target language.',
                position: 'left'
            }
        },
        {
            element: '#quizContainer .left-panel',
            popover: {
                title: 'Type Your Answer',
                description: 'Enter the word in the input field and press Enter or click Submit. The system accepts multiple correct spellings!',
                position: 'right'
            }
        },
        {
            element: '#rightPanel',
            popover: {
                title: 'Score Tracking',
                description: 'In Test Mode, see your correct and incorrect counts here as you progress.',
                position: 'left'
            }
        }
    ],

    rec: [
        {
            element: '.app-header h1',
            popover: {
                title: 'Welcome to Voice Recorder!',
                description: 'This tool lets you record, upload, or select audio files for vocabulary cards.',
                position: 'bottom'
            }
        },
        {
            element: '#languageFilter',
            popover: {
                title: 'Select Language',
                description: 'Choose which language you want to work with (Cebuano, Maranao, or Sinama).',
                position: 'bottom'
            }
        },
        {
            element: '#translationLangFilter',
            popover: {
                title: 'Translation Language',
                description: 'For Maranao and Sinama, select whether you want to see English or Cebuano translations.',
                position: 'bottom',
                onNextClick: function() {
                    // This only appears for non-Cebuano languages
                    const elem = document.querySelector('#translationLangGroup');
                    if (!elem || elem.style.display === 'none') {
                        return true; // Skip if not visible
                    }
                }
            }
        },
        {
            element: '.filter-group.search-group',
            popover: {
                title: 'Search Cards',
                description: 'Quickly find specific words by typing in the search box.',
                position: 'bottom'
            }
        },
        {
            element: '.lesson-input',
            popover: {
                title: 'Filter by Lesson',
                description: 'Filter cards to show only a specific lesson range.',
                position: 'bottom'
            }
        },
        {
            element: '.cards-table',
            popover: {
                title: 'Audio Cards Table',
                description: 'Click on any audio badge to open the recording modal. Badges show the word variant and current audio status.',
                position: 'top'
            }
        },
        {
            element: '#saveChangesBtn',
            popover: {
                title: 'Save Your Changes',
                description: 'After recording or assigning audio files, don\'t forget to click Save Changes to update the manifest!',
                position: 'left'
            }
        }
    ]
};

// Initialize tour based on current module
function initTour(moduleName) {
    // Check if user has seen this tour before
    const tourKey = `tour_completed_${moduleName}`;

    // Check localStorage
    if (localStorage.getItem(tourKey)) {
        return; // User has already seen this tour
    }

    // Check if tours exist for this module
    if (!tours[moduleName]) {
        console.log(`No tour defined for module: ${moduleName}`);
        return;
    }

    // Filter out steps where elements don't exist (for conditional UI elements)
    const availableSteps = tours[moduleName].filter(step => {
        if (!step.element) return true; // Keep steps without specific elements
        return document.querySelector(step.element) !== null;
    });

    if (availableSteps.length === 0) {
        console.log(`No available tour steps for module: ${moduleName}`);
        return;
    }

    // Create driver instance
    // Driver.js exports to window.driver.js (note the .js)
    const driverObj = window.driver && window.driver.js;

    if (!driverObj) {
        console.error('Driver.js library not loaded properly');
        return;
    }

    const driverInstance = driverObj({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: availableSteps,
        onDestroyStarted: () => {
            // Mark tour as completed
            localStorage.setItem(tourKey, 'true');
            driverInstance.destroy();
        },
        onDestroyed: () => {
            // Clean up
        }
    });

    // Show tour after a brief delay to ensure all UI elements are rendered
    setTimeout(() => {
        try {
            driverInstance.drive();
        } catch (error) {
            console.error('Error starting tour:', error);
        }
    }, 800);
}

// Function to manually trigger tour (for "Show Tour" button)
function showTour(moduleName) {
    if (!tours[moduleName]) {
        console.warn(`No tour defined for module: ${moduleName}`);
        return;
    }

    // Filter out steps where elements don't exist
    const availableSteps = tours[moduleName].filter(step => {
        if (!step.element) return true;
        return document.querySelector(step.element) !== null;
    });

    if (availableSteps.length === 0) {
        alert('Tour not available - please ensure the module is fully loaded.');
        return;
    }

    // Driver.js exports to window.driver.js.driver
    const driverObj = window.driver && window.driver.js && window.driver.js.driver;

    if (!driverObj) {
        console.error('Driver.js library not loaded properly');
        alert('Tour feature not available. Please refresh the page and try again.');
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
window.initTour = initTour;
window.showTour = showTour;
window.resetAllTours = resetAllTours;

// Debug: Log when tour guide is loaded
console.log('Tour Guide System loaded. Available tours:', Object.keys(tours));

// Debug: Check what Driver.js exposes
console.log('Driver.js check:', {
    'window.driver.js.driver': window.driver && window.driver.js && window.driver.js.driver,
    'typeof': typeof (window.driver && window.driver.js && window.driver.js.driver)
});
