/**
 * Tour Guide System using Driver.js
 * Bob and Mariel Ward School of Filipino Languages
 *
 * Provides onboarding tours for all major modules
 */

// Tour definitions for each module
const tours = {
    flashcards: [
        {
            element: '#flashcard-container',
            popover: {
                title: 'Flashcard View',
                description: 'Click the card to flip between the word and its translation. You can also use the spacebar to flip.',
                position: 'bottom'
            }
        },
        {
            element: '.flashcard-nav',
            popover: {
                title: 'Navigate Cards',
                description: 'Use these arrows or your keyboard arrow keys to move between cards.',
                position: 'top'
            }
        },
        {
            element: '#autoplayToggle',
            popover: {
                title: 'Auto-Play Audio',
                description: 'Toggle automatic audio playback. When enabled, audio plays automatically for each card.',
                position: 'left'
            }
        },
        {
            element: '#filterSection',
            popover: {
                title: 'Filter Cards',
                description: 'Use filters to study specific lessons, words with audio, or search for particular terms.',
                position: 'bottom'
            }
        }
    ],

    match: [
        {
            element: '.match-container',
            popover: {
                title: 'Match the Pairs',
                description: 'Click two cards to match words with their translations. Find all matching pairs to complete the game!',
                position: 'top'
            }
        },
        {
            element: '#timer',
            popover: {
                title: 'Beat Your Time',
                description: 'Try to match all pairs as quickly as possible. Your time is displayed here.',
                position: 'bottom'
            }
        },
        {
            element: '#restartBtn',
            popover: {
                title: 'Start Over',
                description: 'Click here to shuffle and restart the game with a new arrangement.',
                position: 'left'
            }
        }
    ],

    'audio-match': [
        {
            element: '.match-sound-grid',
            popover: {
                title: 'Listen and Match',
                description: 'Click on cards to hear the audio, then match the sound with the correct image.',
                position: 'top'
            }
        },
        {
            element: '.speaker-icon',
            popover: {
                title: 'Play Audio',
                description: 'Click the speaker icon to hear the word pronounced in the target language.',
                position: 'right'
            }
        },
        {
            element: '#matchTimer',
            popover: {
                title: 'Track Your Progress',
                description: 'See how fast you can match all the audio clips with their images!',
                position: 'bottom'
            }
        }
    ],

    quiz: [
        {
            element: '.quiz-question',
            popover: {
                title: 'Answer Questions',
                description: 'Select the correct translation for each word. You can also use number keys 1-4 to select answers.',
                position: 'bottom'
            }
        },
        {
            element: '.quiz-progress',
            popover: {
                title: 'Track Progress',
                description: 'See how many questions you\'ve completed and your current score.',
                position: 'top'
            }
        },
        {
            element: '#quizPlayAudio',
            popover: {
                title: 'Hear the Word',
                description: 'Click to hear the pronunciation of the word being tested.',
                position: 'left'
            }
        }
    ],

    rec: [
        {
            element: '#languageFilter',
            popover: {
                title: 'Select Language',
                description: 'Choose which language set you want to record audio for (Cebuano, Maranao, or Sinama).',
                position: 'bottom'
            }
        },
        {
            element: '#translationLangGroup',
            popover: {
                title: 'Translation Language',
                description: 'For Maranao and Sinama, toggle between English or Cebuano translations.',
                position: 'bottom'
            }
        },
        {
            element: '.audio-badge:first-of-type',
            popover: {
                title: 'Record Audio',
                description: 'Click any badge to open the recording modal. You can record, upload, or browse existing audio files.',
                position: 'right'
            }
        },
        {
            element: '#saveChangesBtn',
            popover: {
                title: 'Save Your Work',
                description: 'Important! Don\'t forget to save your changes to update the manifest file with your new audio recordings.',
                position: 'left'
            }
        }
    ]
};

// Initialize tour based on current page
function initTour(moduleName) {
    // Check if user has seen this tour before
    const tourKey = `tour_completed_${moduleName}`;
    if (localStorage.getItem(tourKey)) {
        return; // User has already seen this tour
    }

    // Check if tour exists for this module
    if (!tours[moduleName]) {
        console.warn(`No tour defined for module: ${moduleName}`);
        return;
    }

    const driver = window.driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: tours[moduleName],
        onDestroyStarted: () => {
            // Mark tour as completed
            localStorage.setItem(tourKey, 'true');
            driver.destroy();
        },
        popoverClass: 'tour-popover',
        progressText: '{{current}} of {{total}}'
    });

    // Show after a brief delay so page elements are loaded
    setTimeout(() => {
        // Double check the first element exists before starting
        const firstElement = document.querySelector(tours[moduleName][0].element);
        if (firstElement) {
            driver.drive();
        } else {
            console.warn('Tour first element not found, skipping tour');
        }
    }, 1000);
}

// Function to manually trigger tour (for "Show Tour" button)
function showTour(moduleName) {
    if (!tours[moduleName]) {
        console.warn(`No tour defined for module: ${moduleName}`);
        return;
    }

    const driver = window.driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: tours[moduleName],
        popoverClass: 'tour-popover',
        progressText: '{{current}} of {{total}}'
    });

    driver.drive();
}

// Function to reset tour (allow user to see it again)
function resetTour(moduleName) {
    const tourKey = `tour_completed_${moduleName}`;
    localStorage.removeItem(tourKey);
    console.log(`Tour reset for ${moduleName}. It will show again on next page load.`);
}

// Export functions for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initTour, showTour, resetTour };
}
