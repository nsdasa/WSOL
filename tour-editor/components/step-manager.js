/**
 * Step Manager Component
 * Handles tour step CRUD operations and drag-drop reordering
 */

class StepManager {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('stepsContainer');
        this.draggedItem = null;
        this.dragOverItem = null;
    }

    // Enable drag-drop for step reordering
    enableDragDrop() {
        const stepCards = this.container.querySelectorAll('.step-card');

        stepCards.forEach(card => {
            card.setAttribute('draggable', 'true');

            card.addEventListener('dragstart', (e) => {
                this.draggedItem = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedItem = null;
                this.dragOverItem = null;
                this.container.querySelectorAll('.step-card').forEach(c => {
                    c.classList.remove('drag-over');
                });
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (this.draggedItem !== card) {
                    card.classList.add('drag-over');
                    this.dragOverItem = card;
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');

                if (this.draggedItem && this.draggedItem !== card) {
                    // Get indices
                    const fromPhase = this.draggedItem.dataset.phase;
                    const fromIndex = parseInt(this.draggedItem.dataset.index);
                    const toPhase = card.dataset.phase;
                    const toIndex = parseInt(card.dataset.index);

                    // Only allow reorder within same phase
                    if (fromPhase === toPhase) {
                        this.reorderSteps(fromPhase, fromIndex, toIndex);
                    } else {
                        this.app.showToast('Cannot move steps between phases', 'error');
                    }
                }
            });
        });
    }

    reorderSteps(phase, fromIndex, toIndex) {
        const steps = this.app.getStepsArray(phase);
        if (!steps) return;

        // Remove from old position
        const [removed] = steps.splice(fromIndex, 1);
        // Insert at new position
        steps.splice(toIndex, 0, removed);

        this.app.markAsModified();
        this.app.renderSteps();

        // Re-select if needed
        if (this.app.selectedPhase === phase) {
            if (this.app.selectedStep === fromIndex) {
                this.app.selectStep(phase, toIndex);
            } else if (fromIndex < this.app.selectedStep && toIndex >= this.app.selectedStep) {
                this.app.selectStep(phase, this.app.selectedStep - 1);
            } else if (fromIndex > this.app.selectedStep && toIndex <= this.app.selectedStep) {
                this.app.selectStep(phase, this.app.selectedStep + 1);
            }
        }
    }

    // Validate step data
    validateStep(step) {
        const errors = [];

        if (!step.title || step.title.trim() === '') {
            errors.push('Title is required');
        }

        if (!step.description || step.description.trim() === '') {
            errors.push('Description is required');
        }

        // Element is optional (can be null for general messages)

        return errors;
    }

    // Generate step preview thumbnail (placeholder for now)
    generateThumbnail(step) {
        // Could capture iframe screenshot in the future
        return null;
    }

    // Export steps to JSON
    exportSteps(moduleName) {
        const config = this.app.tourConfig[moduleName];
        return JSON.stringify(config, null, 2);
    }

    // Import steps from JSON
    importSteps(moduleName, json) {
        try {
            const config = JSON.parse(json);
            this.app.tourConfig[moduleName] = config;
            this.app.markAsModified();
            this.app.renderSteps();
            return true;
        } catch (error) {
            console.error('Error importing steps:', error);
            return false;
        }
    }

    // Duplicate a step
    duplicateStep(phase, index) {
        const steps = this.app.getStepsArray(phase);
        if (!steps || !steps[index]) return;

        const original = steps[index];
        const copy = JSON.parse(JSON.stringify(original));
        copy.title = copy.title + ' (Copy)';

        steps.splice(index + 1, 0, copy);

        this.app.markAsModified();
        this.app.renderSteps();
        this.app.selectStep(phase, index + 1);
    }

    // Create step template
    createTemplate(type) {
        const templates = {
            welcome: {
                element: null,
                title: 'Welcome!',
                description: 'Welcome to this module. Let me show you around.',
                position: 'bottom'
            },
            clickElement: {
                element: '.button',
                title: 'Click Here',
                description: 'Click this button to proceed.',
                position: 'right'
            },
            inputField: {
                element: 'input',
                title: 'Enter Text',
                description: 'Type your answer in this field.',
                position: 'bottom'
            },
            navigation: {
                element: '.controls',
                title: 'Navigation',
                description: 'Use these buttons to navigate.',
                position: 'top'
            },
            completion: {
                element: null,
                title: 'All Done!',
                description: 'You\'ve completed this tutorial. Good luck!',
                position: 'bottom'
            }
        };

        return templates[type] || templates.welcome;
    }
}
