// =================================================================
// DECK BUILDER MODULE - TOUR EDITOR
// Split from deck-builder-module.js for maintainability
// Contains: Tour configuration editor functionality
// =================================================================

/**
 * Setup the tour editor section
 */
DeckBuilderModule.prototype.setupTourEditor = async function() {
    this.tourConfig = null;
    this.tourConfigModified = false;

    const container = document.getElementById('tourEditorContainer');
    const saveBtn = document.getElementById('saveTourConfigBtn');
    const resetBtn = document.getElementById('resetTourConfigBtn');

    if (!container) return;

    // Load the tour configuration
    try {
        const response = await fetch('tour-config.json?v=' + Date.now(), {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to load config');
        this.tourConfig = await response.json();
        this.renderTourEditor();
    } catch (error) {
        container.innerHTML = `
            <div class="tour-editor-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load tour configuration: ${error.message}</p>
                <button class="btn btn-secondary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        return;
    }

    // Save button handler
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveTourConfig());
    }

    // Reset button handler
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Discard all changes and reload from saved configuration?')) {
                const response = await fetch('tour-config.json?v=' + Date.now(), {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                this.tourConfig = await response.json();
                this.tourConfigModified = false;
                this.renderTourEditor();
                this.updateTourSaveButton();
                toastManager?.show('Configuration reset', 'info');
            }
        });
    }
};

/**
 * Render the tour editor UI
 */
DeckBuilderModule.prototype.renderTourEditor = function() {
    const container = document.getElementById('tourEditorContainer');
    if (!container || !this.tourConfig) return;

    const moduleNames = {
        'flashcards': 'Flashcards',
        'match': 'Picture Match',
        'match-sound': 'Audio Match',
        'quiz': 'Unsa Ni? Quiz',
        'rec': 'Voice Recorder'
    };

    const phaseNames = {
        'intro': 'Introduction',
        'review': 'Review Mode',
        'test': 'Test Mode',
        'cardBack': 'Card Back (Flipped)'
    };

    let html = '<div class="tour-editor-modules">';

    for (const [moduleId, moduleData] of Object.entries(this.tourConfig)) {
        // Skip comment fields
        if (moduleId.startsWith('_')) continue;

        const moduleName = moduleNames[moduleId] || moduleId;
        const isPhased = !Array.isArray(moduleData) && typeof moduleData === 'object';

        // Calculate total step count
        let stepCount = 0;
        if (isPhased) {
            for (const phase of Object.values(moduleData)) {
                if (Array.isArray(phase)) stepCount += phase.length;
            }
        } else if (Array.isArray(moduleData)) {
            stepCount = moduleData.length;
        }

        html += `
            <div class="tour-module-section" data-module="${moduleId}">
                <div class="tour-module-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <h4><i class="fas fa-route"></i> ${moduleName} <span class="step-count">${stepCount} steps</span></h4>
                    <i class="fas fa-chevron-down expand-icon"></i>
                </div>
                <div class="tour-module-steps">
        `;

        if (isPhased) {
            // Phased format - show each phase as a sub-section
            for (const [phaseId, steps] of Object.entries(moduleData)) {
                if (!Array.isArray(steps)) continue;

                const phaseName = phaseNames[phaseId] || phaseId;
                html += `
                    <div class="tour-phase-section" data-phase="${phaseId}">
                        <div class="tour-phase-header">
                            <span class="tour-phase-name">${phaseName}</span>
                            <span class="tour-phase-count">${steps.length} steps</span>
                        </div>
                        ${this.renderTourSteps(moduleId, steps, phaseId)}
                        <button class="btn btn-sm btn-secondary add-step-btn" data-module="${moduleId}" data-phase="${phaseId}">
                            <i class="fas fa-plus"></i> Add Step to ${phaseName}
                        </button>
                    </div>
                `;
            }
        } else if (Array.isArray(moduleData)) {
            // Simple array format
            html += this.renderTourSteps(moduleId, moduleData, null);
            html += `
                <button class="btn btn-sm btn-secondary add-step-btn" data-module="${moduleId}">
                    <i class="fas fa-plus"></i> Add Step
                </button>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;

    // Setup step editing handlers
    this.setupTourStepHandlers();
};

/**
 * Render tour steps for a module/phase
 */
DeckBuilderModule.prototype.renderTourSteps = function(moduleId, steps, phaseId = null) {
    if (!Array.isArray(steps) || steps.length === 0) {
        return '<p class="tour-no-steps">No steps defined</p>';
    }

    const phaseAttr = phaseId ? `data-phase="${phaseId}"` : '';

    return steps.map((step, index) => `
        <div class="tour-step-card" data-module="${moduleId}" data-index="${index}" ${phaseAttr}>
            <div class="tour-step-header">
                <span class="step-number">Step ${index + 1}</span>
                <div class="tour-step-actions">
                    <button class="tour-move-up" title="Move up" ${index === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="tour-move-down" title="Move down" ${index === steps.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="tour-delete-step delete-step" title="Delete step">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="tour-step-fields">
                <div class="tour-field">
                    <label>Element Selector</label>
                    <input type="text" class="tour-input-element" value="${this.escapeHtml(step.element || '')}" placeholder="CSS selector (e.g., #myButton) or leave empty">
                </div>
                <div class="tour-field">
                    <label>Title</label>
                    <input type="text" class="tour-input-title" value="${this.escapeHtml(step.title || '')}" placeholder="Step title">
                </div>
                <div class="tour-field full-width">
                    <label>Description</label>
                    <textarea class="tour-input-description" rows="2" placeholder="Step description">${this.escapeHtml(step.description || '')}</textarea>
                </div>
                <div class="tour-field">
                    <label>Position</label>
                    <select class="tour-input-position">
                        <option value="bottom" ${step.position === 'bottom' ? 'selected' : ''}>Bottom</option>
                        <option value="top" ${step.position === 'top' ? 'selected' : ''}>Top</option>
                        <option value="left" ${step.position === 'left' ? 'selected' : ''}>Left</option>
                        <option value="right" ${step.position === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
};

/**
 * Setup event handlers for tour step editing
 */
DeckBuilderModule.prototype.setupTourStepHandlers = function() {
    const container = document.getElementById('tourEditorContainer');
    if (!container) return;

    // Handle input changes
    container.querySelectorAll('.tour-input-element, .tour-input-title, .tour-input-description, .tour-input-position').forEach(input => {
        input.addEventListener('input', (e) => this.handleTourInputChange(e));
        input.addEventListener('change', (e) => this.handleTourInputChange(e));
    });

    // Handle move up buttons
    container.querySelectorAll('.tour-move-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.tour-step-card');
            const moduleId = card.dataset.module;
            const phaseId = card.dataset.phase || null;
            const index = parseInt(card.dataset.index);
            this.moveTourStep(moduleId, phaseId, index, -1);
        });
    });

    // Handle move down buttons
    container.querySelectorAll('.tour-move-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.tour-step-card');
            const moduleId = card.dataset.module;
            const phaseId = card.dataset.phase || null;
            const index = parseInt(card.dataset.index);
            this.moveTourStep(moduleId, phaseId, index, 1);
        });
    });

    // Handle delete buttons
    container.querySelectorAll('.tour-delete-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Delete this step?')) {
                const card = e.target.closest('.tour-step-card');
                const moduleId = card.dataset.module;
                const phaseId = card.dataset.phase || null;
                const index = parseInt(card.dataset.index);
                this.deleteTourStep(moduleId, phaseId, index);
            }
        });
    });

    // Handle add step buttons
    container.querySelectorAll('.add-step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const moduleId = e.target.closest('button').dataset.module;
            const phaseId = e.target.closest('button').dataset.phase || null;
            this.addTourStep(moduleId, phaseId);
        });
    });
};

/**
 * Handle changes to tour step input fields
 */
DeckBuilderModule.prototype.handleTourInputChange = function(e) {
    const card = e.target.closest('.tour-step-card');
    if (!card) return;

    const moduleId = card.dataset.module;
    const phaseId = card.dataset.phase || null;
    const index = parseInt(card.dataset.index);

    const element = card.querySelector('.tour-input-element').value || null;
    const title = card.querySelector('.tour-input-title').value;
    const description = card.querySelector('.tour-input-description').value;
    const position = card.querySelector('.tour-input-position').value;

    // Get the steps array (either from phase or directly)
    const steps = phaseId ? this.tourConfig[moduleId]?.[phaseId] : this.tourConfig[moduleId];

    if (steps && steps[index]) {
        steps[index] = { element, title, description, position };
        this.tourConfigModified = true;
        this.updateTourSaveButton();
    }
};

/**
 * Move a tour step up or down
 */
DeckBuilderModule.prototype.moveTourStep = function(moduleId, phaseId, index, direction) {
    const steps = phaseId ? this.tourConfig[moduleId]?.[phaseId] : this.tourConfig[moduleId];
    if (!steps || !Array.isArray(steps)) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;

    // Swap steps
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];

    this.tourConfigModified = true;
    this.renderTourEditor();
    this.updateTourSaveButton();

    // Re-expand the module section
    const section = document.querySelector(`.tour-module-section[data-module="${moduleId}"]`);
    if (section) section.classList.add('expanded');
};

/**
 * Delete a tour step
 */
DeckBuilderModule.prototype.deleteTourStep = function(moduleId, phaseId, index) {
    const steps = phaseId ? this.tourConfig[moduleId]?.[phaseId] : this.tourConfig[moduleId];
    if (!steps || !Array.isArray(steps)) return;

    steps.splice(index, 1);
    this.tourConfigModified = true;
    this.renderTourEditor();
    this.updateTourSaveButton();

    // Re-expand the module section
    const section = document.querySelector(`.tour-module-section[data-module="${moduleId}"]`);
    if (section) section.classList.add('expanded');
};

/**
 * Add a new tour step
 */
DeckBuilderModule.prototype.addTourStep = function(moduleId, phaseId = null) {
    let steps;
    if (phaseId) {
        if (!this.tourConfig[moduleId]) {
            this.tourConfig[moduleId] = {};
        }
        if (!this.tourConfig[moduleId][phaseId]) {
            this.tourConfig[moduleId][phaseId] = [];
        }
        steps = this.tourConfig[moduleId][phaseId];
    } else {
        if (!Array.isArray(this.tourConfig[moduleId])) {
            this.tourConfig[moduleId] = [];
        }
        steps = this.tourConfig[moduleId];
    }

    steps.push({
        element: null,
        title: 'New Step',
        description: 'Enter description here',
        position: 'bottom'
    });

    this.tourConfigModified = true;
    this.renderTourEditor();
    this.updateTourSaveButton();

    // Expand the module section and scroll to new step
    const section = document.querySelector(`.tour-module-section[data-module="${moduleId}"]`);
    if (section) {
        section.classList.add('expanded');
        // Find the last card in the appropriate phase section or module
        let lastCard;
        if (phaseId) {
            const phaseSection = section.querySelector(`.tour-phase-section[data-phase="${phaseId}"]`);
            lastCard = phaseSection?.querySelector('.tour-step-card:last-of-type');
        } else {
            lastCard = section.querySelector('.tour-step-card:last-of-type');
        }
        if (lastCard) {
            lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastCard.querySelector('.tour-input-title')?.focus();
        }
    }
};

/**
 * Update the tour save button state
 */
DeckBuilderModule.prototype.updateTourSaveButton = function() {
    const saveBtn = document.getElementById('saveTourConfigBtn');
    if (saveBtn) {
        saveBtn.disabled = !this.tourConfigModified;
    }
};

/**
 * Save tour configuration to server
 */
DeckBuilderModule.prototype.saveTourConfig = async function() {
    const saveBtn = document.getElementById('saveTourConfigBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const response = await fetch('save-tour-config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.tourConfig)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to save');
        }

        this.tourConfigModified = false;
        toastManager?.show('Tour configuration saved!', 'success');
        debugLogger?.log(0, 'Tour configuration saved');

    } catch (error) {
        toastManager?.show(`Error saving: ${error.message}`, 'error');
        debugLogger?.log(1, `Tour config save error: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            this.updateTourSaveButton();
        }
    }
};

/**
 * Escape HTML special characters
 */
DeckBuilderModule.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};
