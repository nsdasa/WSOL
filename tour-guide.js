/**
 * Tour Guide System using Driver.js
 * Bob and Mariel Ward School of Filipino Languages
 *
 * Configuration is loaded from tour-config.json for easy editing
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
        for (const [moduleName, steps] of Object.entries(config)) {
            // Skip comment fields
            if (moduleName.startsWith('_')) continue;

            tours[moduleName] = steps.map(step => ({
                element: step.element,
                popover: {
                    title: step.title,
                    description: step.description,
                    position: step.position || 'bottom'
                }
            }));
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
        for (const [moduleName, steps] of Object.entries(config)) {
            if (moduleName.startsWith('_')) continue;

            tours[moduleName] = steps.map(step => ({
                element: step.element,
                popover: {
                    title: step.title,
                    description: step.description,
                    position: step.position || 'bottom'
                }
            }));
        }

        toursLoaded = true;
        console.log('Tour config loaded (rec). Available tours:', Object.keys(tours));
        return tours;
    } catch (error) {
        console.error('Error loading tour config:', error);
        return {};
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
console.log('Tour Guide System initialized');

// Debug: Check what Driver.js exposes
console.log('Driver.js check:', {
    'window.driver.js.driver': window.driver && window.driver.js && window.driver.js.driver,
    'typeof': typeof (window.driver && window.driver.js && window.driver.js.driver)
});
