/**
 * Tour Editor App
 * Main controller for the WYSIWYG Tour Editor
 */

class TourEditorApp {
    constructor() {
        this.tourConfig = null;
        this.currentModule = null;
        this.currentDraft = null;
        this.selectedStep = null;
        this.selectedPhase = null;
        this.hasUnsavedChanges = false;
        this.zoomLevel = 100;

        // Components
        this.previewFrame = null;
        this.stepManager = null;
        this.shapeOverlay = null;
        this.actionRecorder = null;

        // Mode states
        this.selectElementMode = false;
        this.drawShapeMode = false;
        this.recordActionMode = false;
    }

    async init() {
        console.log('Tour Editor initializing...');

        // Initialize components
        this.previewFrame = new PreviewFrame(this);
        this.stepManager = new StepManager(this);
        this.shapeOverlay = new ShapeOverlay(this);
        this.actionRecorder = new ActionRecorder(this);

        // Load tour configuration
        await this.loadTourConfig();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize theme
        this.initTheme();

        console.log('Tour Editor initialized');
    }

    async loadTourConfig() {
        try {
            const response = await fetch('../tour-config.json?v=' + Date.now());
            if (!response.ok) throw new Error('Failed to load tour config');
            this.tourConfig = await response.json();
            console.log('Tour config loaded:', Object.keys(this.tourConfig));
        } catch (error) {
            console.error('Error loading tour config:', error);
            this.showToast('Failed to load tour configuration', 'error');
            this.tourConfig = {};
        }
    }

    setupEventListeners() {
        // Module selector
        document.getElementById('moduleSelect').addEventListener('change', (e) => {
            this.selectModule(e.target.value);
        });

        // Draft selector
        document.getElementById('draftSelect').addEventListener('change', (e) => {
            this.loadDraft(e.target.value);
        });

        // Header buttons
        document.getElementById('saveDraftBtn').addEventListener('click', () => {
            this.saveDraft();
        });

        document.getElementById('previewTourBtn').addEventListener('click', () => {
            this.previewTour();
        });

        document.getElementById('publishBtn').addEventListener('click', () => {
            this.showPublishModal();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Preview controls
        document.getElementById('refreshPreview').addEventListener('click', () => {
            this.previewFrame.refresh();
        });

        document.getElementById('zoomIn').addEventListener('click', () => {
            this.setZoom(this.zoomLevel + 10);
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.setZoom(this.zoomLevel - 10);
        });

        // Toolbar buttons
        document.getElementById('selectElementBtn').addEventListener('click', () => {
            this.toggleSelectElementMode();
        });

        document.getElementById('drawShapeBtn').addEventListener('click', () => {
            this.toggleDrawShapeMode();
        });

        document.getElementById('recordActionBtn').addEventListener('click', () => {
            this.toggleRecordActionMode();
        });

        // Add step button
        document.getElementById('addStepBtn').addEventListener('click', () => {
            this.addNewStep();
        });

        // Step editor events
        this.setupStepEditorEvents();

        // Modal events
        this.setupModalEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    setupStepEditorEvents() {
        // Close step editor
        document.getElementById('closeStepEditor').addEventListener('click', () => {
            this.closeStepEditor();
        });

        // Pick element button
        document.getElementById('pickElementBtn').addEventListener('click', () => {
            this.toggleSelectElementMode();
        });

        // Apply changes
        document.getElementById('applyStepChanges').addEventListener('click', () => {
            this.applyStepChanges();
        });

        // Cancel changes
        document.getElementById('cancelStepChanges').addEventListener('click', () => {
            this.closeStepEditor();
        });

        // Delete step
        document.getElementById('deleteStepBtn').addEventListener('click', () => {
            this.deleteCurrentStep();
        });

        // Edit shape button
        document.getElementById('editShapeBtn').addEventListener('click', () => {
            this.showShapeModal();
        });

        // Edit action button
        document.getElementById('editActionBtn').addEventListener('click', () => {
            this.showActionModal();
        });
    }

    setupModalEvents() {
        // Shape modal
        document.getElementById('closeShapeModal').addEventListener('click', () => {
            this.hideModal('shapeModal');
        });

        document.getElementById('clearShape').addEventListener('click', () => {
            this.shapeOverlay.clearShape();
        });

        document.getElementById('saveShape').addEventListener('click', () => {
            this.saveShapeToStep();
        });

        // Shape tools
        document.querySelectorAll('.shape-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.shapeOverlay.setShapeType(btn.dataset.shape);
            });
        });

        // Shape settings
        document.getElementById('strokeColor').addEventListener('input', (e) => {
            this.shapeOverlay.setStrokeColor(e.target.value);
        });

        document.getElementById('fillOpacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value + '%';
            this.shapeOverlay.setFillOpacity(e.target.value / 100);
        });

        // Action modal
        document.getElementById('closeActionModal').addEventListener('click', () => {
            this.hideModal('actionModal');
        });

        document.getElementById('enableAction').addEventListener('change', (e) => {
            document.getElementById('actionConfig').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('addActionBtn').addEventListener('click', () => {
            this.actionRecorder.addActionItem();
        });

        document.getElementById('testActions').addEventListener('click', () => {
            this.actionRecorder.testActions();
        });

        document.getElementById('recordActions').addEventListener('click', () => {
            this.toggleRecordActionMode();
            this.hideModal('actionModal');
        });

        document.getElementById('saveActions').addEventListener('click', () => {
            this.saveActionsToStep();
        });

        document.getElementById('cancelActions').addEventListener('click', () => {
            this.hideModal('actionModal');
        });

        // Publish modal
        document.getElementById('closePublishModal').addEventListener('click', () => {
            this.hideModal('publishModal');
        });

        document.getElementById('previewBeforePublish').addEventListener('click', () => {
            this.previewTour();
        });

        document.getElementById('confirmPublish').addEventListener('click', () => {
            this.publishTour();
        });

        document.getElementById('cancelPublish').addEventListener('click', () => {
            this.hideModal('publishModal');
        });

        // Draft modal
        document.getElementById('closeDraftModal').addEventListener('click', () => {
            this.hideModal('draftModal');
        });

        document.getElementById('newDraftBtn').addEventListener('click', () => {
            this.createNewDraft();
        });

        document.getElementById('importDraftBtn').addEventListener('click', () => {
            this.importDraft();
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    handleKeyboard(e) {
        // Escape to cancel modes or close editor
        if (e.key === 'Escape') {
            if (this.selectElementMode) {
                this.toggleSelectElementMode();
            } else if (this.drawShapeMode) {
                this.toggleDrawShapeMode();
            } else if (this.recordActionMode) {
                this.toggleRecordActionMode();
            } else if (this.selectedStep !== null) {
                this.closeStepEditor();
            }
        }

        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveDraft();
        }
    }

    // Module management
    selectModule(moduleName) {
        if (!moduleName) {
            this.currentModule = null;
            this.renderEmptyState();
            this.updateButtonStates();
            return;
        }

        this.currentModule = moduleName;
        console.log('Selected module:', moduleName);

        // Load module in preview frame
        this.previewFrame.loadModule(moduleName);

        // Render steps for this module
        this.renderSteps();

        // Enable buttons
        this.updateButtonStates();
    }

    renderEmptyState() {
        document.getElementById('previewPlaceholder').style.display = 'flex';
        document.getElementById('iframeWrapper').style.display = 'none';
        document.getElementById('stepsContainer').innerHTML = `
            <div class="steps-placeholder">
                <i class="fas fa-tasks"></i>
                <p>Select a module to view and edit tour steps</p>
            </div>
        `;
        this.closeStepEditor();
    }

    renderSteps() {
        const container = document.getElementById('stepsContainer');
        const moduleConfig = this.tourConfig[this.currentModule];

        if (!moduleConfig) {
            container.innerHTML = `
                <div class="steps-placeholder">
                    <i class="fas fa-plus-circle"></i>
                    <p>No tour configured for this module yet</p>
                    <button class="btn btn-primary" onclick="tourEditor.addNewStep()">
                        <i class="fas fa-plus"></i> Create First Step
                    </button>
                </div>
            `;
            return;
        }

        // Check if phased or simple format
        if (Array.isArray(moduleConfig)) {
            // Simple format
            container.innerHTML = this.renderPhaseSteps('simple', moduleConfig);
        } else {
            // Phased format
            let html = '';
            const phases = ['intro', 'review', 'test', 'cardBack'];

            phases.forEach(phase => {
                if (moduleConfig[phase] && moduleConfig[phase].length > 0) {
                    html += this.renderPhaseSection(phase, moduleConfig[phase]);
                }
            });

            container.innerHTML = html || `
                <div class="steps-placeholder">
                    <i class="fas fa-plus-circle"></i>
                    <p>No steps configured yet</p>
                    <button class="btn btn-primary" onclick="tourEditor.addNewStep()">
                        <i class="fas fa-plus"></i> Create First Step
                    </button>
                </div>
            `;
        }

        // Setup step event handlers
        this.setupStepHandlers();
    }

    renderPhaseSection(phase, steps) {
        const phaseLabels = {
            intro: 'Introduction',
            review: 'Review Mode',
            test: 'Test Mode',
            cardBack: 'Card Back'
        };

        return `
            <div class="phase-section" data-phase="${phase}">
                <div class="phase-header">
                    <span class="phase-title">
                        <i class="fas fa-layer-group"></i>
                        ${phaseLabels[phase] || phase}
                    </span>
                    <span class="phase-count">${steps.length} steps</span>
                </div>
                <div class="phase-steps">
                    ${this.renderPhaseSteps(phase, steps)}
                </div>
                <button class="btn btn-sm btn-secondary" onclick="tourEditor.addNewStep('${phase}')" style="margin-top: 8px;">
                    <i class="fas fa-plus"></i> Add Step
                </button>
            </div>
        `;
    }

    renderPhaseSteps(phase, steps) {
        return steps.map((step, index) => `
            <div class="step-card" data-phase="${phase}" data-index="${index}">
                <div class="step-card-header">
                    <span class="step-number">Step ${index + 1}</span>
                    <div class="step-actions">
                        <button class="move-up" title="Move up" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="move-down" title="Move down" ${index === steps.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="delete-step" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="step-title">${step.title || 'Untitled Step'}</div>
                <div class="step-element">${step.element || '(no element)'}</div>
                <div class="step-badges">
                    ${step.customShape ? '<span class="step-badge has-shape"><i class="fas fa-draw-polygon"></i> Shape</span>' : ''}
                    ${step.preAction ? '<span class="step-badge has-action"><i class="fas fa-bolt"></i> Action</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    setupStepHandlers() {
        // Step card clicks
        document.querySelectorAll('.step-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.step-actions')) return;
                this.selectStep(card.dataset.phase, parseInt(card.dataset.index));
            });
        });

        // Move up buttons
        document.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.step-card');
                this.moveStep(card.dataset.phase, parseInt(card.dataset.index), -1);
            });
        });

        // Move down buttons
        document.querySelectorAll('.move-down').forEach(click => {
            click.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = click.closest('.step-card');
                this.moveStep(card.dataset.phase, parseInt(card.dataset.index), 1);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.step-card');
                this.deleteStep(card.dataset.phase, parseInt(card.dataset.index));
            });
        });
    }

    selectStep(phase, index) {
        // Update visual selection
        document.querySelectorAll('.step-card').forEach(card => {
            card.classList.remove('selected');
        });
        const selectedCard = document.querySelector(`.step-card[data-phase="${phase}"][data-index="${index}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.selectedPhase = phase;
        this.selectedStep = index;

        // Get step data
        const step = this.getStep(phase, index);
        if (!step) return;

        // Populate editor
        this.openStepEditor(step, phase, index);

        // Highlight element in preview
        if (step.element) {
            this.previewFrame.highlightElement(step.element);
        }
    }

    getStep(phase, index) {
        const moduleConfig = this.tourConfig[this.currentModule];
        if (!moduleConfig) return null;

        if (Array.isArray(moduleConfig)) {
            return moduleConfig[index];
        } else if (moduleConfig[phase]) {
            return moduleConfig[phase][index];
        }
        return null;
    }

    openStepEditor(step, phase, index) {
        const panel = document.getElementById('stepEditorPanel');
        panel.style.display = 'block';

        // Update title
        document.getElementById('stepEditorTitle').textContent = `Step ${index + 1} (${phase})`;

        // Populate fields
        document.getElementById('stepElement').value = step.element || '';
        document.getElementById('stepPosition').value = step.position || 'bottom';
        document.getElementById('stepTitle').value = step.title || '';
        document.getElementById('stepDescription').value = step.description || '';

        // Update status indicators
        document.getElementById('shapeStatus').textContent = step.customShape ? 'Custom shape defined' : 'No custom shape';
        document.getElementById('actionStatus').textContent = step.preAction ? 'Action configured' : 'No action configured';
    }

    closeStepEditor() {
        document.getElementById('stepEditorPanel').style.display = 'none';
        document.querySelectorAll('.step-card').forEach(card => {
            card.classList.remove('selected');
        });
        this.selectedStep = null;
        this.selectedPhase = null;
        this.previewFrame.clearHighlight();
    }

    applyStepChanges() {
        if (this.selectedStep === null || !this.selectedPhase) return;

        const step = this.getStep(this.selectedPhase, this.selectedStep);
        if (!step) return;

        // Update step data
        step.element = document.getElementById('stepElement').value || null;
        step.position = document.getElementById('stepPosition').value;
        step.title = document.getElementById('stepTitle').value;
        step.description = document.getElementById('stepDescription').value;

        this.markAsModified();
        this.renderSteps();
        this.showToast('Step updated', 'success');
    }

    addNewStep(phase = null) {
        if (!this.currentModule) return;

        // Determine phase
        if (!phase) {
            const moduleConfig = this.tourConfig[this.currentModule];
            if (moduleConfig && !Array.isArray(moduleConfig)) {
                // Phased format - default to intro
                phase = 'intro';
            } else {
                phase = 'simple';
            }
        }

        const newStep = {
            element: null,
            title: 'New Step',
            description: 'Enter step description here',
            position: 'bottom'
        };

        // Add to config
        if (phase === 'simple') {
            if (!Array.isArray(this.tourConfig[this.currentModule])) {
                this.tourConfig[this.currentModule] = [];
            }
            this.tourConfig[this.currentModule].push(newStep);
        } else {
            if (!this.tourConfig[this.currentModule]) {
                this.tourConfig[this.currentModule] = {};
            }
            if (!this.tourConfig[this.currentModule][phase]) {
                this.tourConfig[this.currentModule][phase] = [];
            }
            this.tourConfig[this.currentModule][phase].push(newStep);
        }

        this.markAsModified();
        this.renderSteps();

        // Select the new step
        const steps = phase === 'simple'
            ? this.tourConfig[this.currentModule]
            : this.tourConfig[this.currentModule][phase];
        this.selectStep(phase, steps.length - 1);

        this.showToast('New step added', 'success');
    }

    moveStep(phase, index, direction) {
        const steps = this.getStepsArray(phase);
        if (!steps) return;

        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= steps.length) return;

        // Swap steps
        [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];

        this.markAsModified();
        this.renderSteps();

        // Re-select at new position if this was selected
        if (this.selectedPhase === phase && this.selectedStep === index) {
            this.selectStep(phase, newIndex);
        }
    }

    deleteStep(phase, index) {
        if (!confirm('Are you sure you want to delete this step?')) return;

        const steps = this.getStepsArray(phase);
        if (!steps) return;

        steps.splice(index, 1);

        this.markAsModified();
        this.renderSteps();

        // Close editor if deleted step was selected
        if (this.selectedPhase === phase && this.selectedStep === index) {
            this.closeStepEditor();
        }

        this.showToast('Step deleted', 'success');
    }

    deleteCurrentStep() {
        if (this.selectedStep === null || !this.selectedPhase) return;
        this.deleteStep(this.selectedPhase, this.selectedStep);
    }

    getStepsArray(phase) {
        const moduleConfig = this.tourConfig[this.currentModule];
        if (!moduleConfig) return null;

        if (phase === 'simple' || Array.isArray(moduleConfig)) {
            return Array.isArray(moduleConfig) ? moduleConfig : null;
        }
        return moduleConfig[phase];
    }

    // Mode toggles
    toggleSelectElementMode() {
        this.selectElementMode = !this.selectElementMode;
        document.getElementById('selectElementBtn').classList.toggle('active', this.selectElementMode);
        document.getElementById('pickElementBtn')?.classList.toggle('active', this.selectElementMode);

        if (this.selectElementMode) {
            this.drawShapeMode = false;
            this.recordActionMode = false;
            document.getElementById('drawShapeBtn').classList.remove('active');
            document.getElementById('recordActionBtn').classList.remove('active');
            this.previewFrame.enableElementSelection();
        } else {
            this.previewFrame.disableElementSelection();
        }
    }

    toggleDrawShapeMode() {
        this.drawShapeMode = !this.drawShapeMode;
        document.getElementById('drawShapeBtn').classList.toggle('active', this.drawShapeMode);

        if (this.drawShapeMode) {
            this.selectElementMode = false;
            this.recordActionMode = false;
            document.getElementById('selectElementBtn').classList.remove('active');
            document.getElementById('recordActionBtn').classList.remove('active');
            this.shapeOverlay.enable();
        } else {
            this.shapeOverlay.disable();
        }
    }

    toggleRecordActionMode() {
        this.recordActionMode = !this.recordActionMode;
        document.getElementById('recordActionBtn').classList.toggle('active', this.recordActionMode);

        if (this.recordActionMode) {
            this.selectElementMode = false;
            this.drawShapeMode = false;
            document.getElementById('selectElementBtn').classList.remove('active');
            document.getElementById('drawShapeBtn').classList.remove('active');
            this.actionRecorder.startRecording();
        } else {
            this.actionRecorder.stopRecording();
        }
    }

    // Element selection callback
    onElementSelected(selector) {
        if (this.selectElementMode) {
            document.getElementById('stepElement').value = selector;
            this.toggleSelectElementMode();
        }
    }

    // Shape modal
    showShapeModal() {
        const step = this.getStep(this.selectedPhase, this.selectedStep);
        if (step?.customShape) {
            this.shapeOverlay.loadShape(step.customShape);
        }
        this.showModal('shapeModal');
    }

    saveShapeToStep() {
        if (this.selectedStep === null) return;

        const step = this.getStep(this.selectedPhase, this.selectedStep);
        if (!step) return;

        step.customShape = this.shapeOverlay.getShapeData();
        document.getElementById('shapeStatus').textContent = step.customShape ? 'Custom shape defined' : 'No custom shape';
        this.markAsModified();
        this.hideModal('shapeModal');
        this.showToast('Shape saved', 'success');
    }

    // Action modal
    showActionModal() {
        const step = this.getStep(this.selectedPhase, this.selectedStep);

        document.getElementById('enableAction').checked = !!step?.preAction;
        document.getElementById('actionConfig').style.display = step?.preAction ? 'block' : 'none';

        if (step?.preAction) {
            this.actionRecorder.loadActions(step.preAction);
        } else {
            this.actionRecorder.clearActions();
        }

        this.showModal('actionModal');
    }

    saveActionsToStep() {
        if (this.selectedStep === null) return;

        const step = this.getStep(this.selectedPhase, this.selectedStep);
        if (!step) return;

        if (document.getElementById('enableAction').checked) {
            step.preAction = this.actionRecorder.getActionsData();
        } else {
            delete step.preAction;
        }

        document.getElementById('actionStatus').textContent = step.preAction ? 'Action configured' : 'No action configured';
        this.markAsModified();
        this.hideModal('actionModal');
        this.showToast('Actions saved', 'success');
    }

    // Draft management
    async saveDraft() {
        if (!this.currentModule || !this.hasUnsavedChanges) return;

        try {
            await TourStorage.saveDraft(this.currentDraft || 'autosave', {
                module: this.currentModule,
                config: this.tourConfig[this.currentModule],
                timestamp: Date.now()
            });

            this.hasUnsavedChanges = false;
            this.updateButtonStates();
            this.showToast('Draft saved', 'success');
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showToast('Failed to save draft', 'error');
        }
    }

    async loadDraft(draftId) {
        if (!draftId) {
            // Load live config
            await this.loadTourConfig();
            this.currentDraft = null;
        } else {
            try {
                const draft = await TourStorage.loadDraft(draftId);
                if (draft && draft.config) {
                    this.tourConfig[draft.module] = draft.config;
                    this.currentModule = draft.module;
                    document.getElementById('moduleSelect').value = draft.module;
                }
                this.currentDraft = draftId;
            } catch (error) {
                console.error('Error loading draft:', error);
                this.showToast('Failed to load draft', 'error');
            }
        }

        this.renderSteps();
        this.hasUnsavedChanges = false;
        this.updateButtonStates();
    }

    createNewDraft() {
        const name = prompt('Enter draft name:');
        if (!name) return;

        this.currentDraft = name.toLowerCase().replace(/\s+/g, '-');
        this.hasUnsavedChanges = true;
        this.updateButtonStates();
        this.hideModal('draftModal');
        this.showToast('New draft created', 'info');
    }

    importDraft() {
        // TODO: Implement file import
        this.showToast('Import feature coming soon', 'info');
    }

    // Publishing
    showPublishModal() {
        const summary = document.getElementById('publishSummary');

        // Generate summary of changes
        const moduleConfig = this.tourConfig[this.currentModule];
        let stepCount = 0;

        if (Array.isArray(moduleConfig)) {
            stepCount = moduleConfig.length;
        } else if (moduleConfig) {
            Object.values(moduleConfig).forEach(phase => {
                if (Array.isArray(phase)) {
                    stepCount += phase.length;
                }
            });
        }

        summary.innerHTML = `
            <p><strong>Module:</strong> ${this.currentModule}</p>
            <p><strong>Total Steps:</strong> ${stepCount}</p>
        `;

        this.showModal('publishModal');
    }

    async publishTour() {
        try {
            const response = await TourAPI.publishConfig(this.tourConfig);
            if (response.success) {
                this.hasUnsavedChanges = false;
                this.updateButtonStates();
                this.hideModal('publishModal');
                this.showToast('Tour published successfully!', 'success');
            } else {
                throw new Error(response.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error publishing tour:', error);
            this.showToast('Failed to publish: ' + error.message, 'error');
        }
    }

    // Preview tour
    previewTour() {
        if (!this.currentModule) return;
        this.previewFrame.runTour(this.currentModule, this.tourConfig[this.currentModule]);
    }

    // Zoom control
    setZoom(level) {
        this.zoomLevel = Math.max(50, Math.min(150, level));
        document.getElementById('zoomLevel').textContent = this.zoomLevel + '%';
        this.previewFrame.setZoom(this.zoomLevel / 100);
    }

    // State management
    markAsModified() {
        this.hasUnsavedChanges = true;
        this.updateButtonStates();
    }

    updateButtonStates() {
        const hasModule = !!this.currentModule;
        const hasChanges = this.hasUnsavedChanges;

        document.getElementById('saveDraftBtn').disabled = !hasChanges;
        document.getElementById('previewTourBtn').disabled = !hasModule;
        document.getElementById('publishBtn').disabled = !hasModule;
        document.getElementById('addStepBtn').disabled = !hasModule;
    }

    // Theme management
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Modal helpers
    showModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    hideModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app
let tourEditor;
document.addEventListener('DOMContentLoaded', () => {
    tourEditor = new TourEditorApp();
    tourEditor.init();
});
