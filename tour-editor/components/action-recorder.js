/**
 * Action Recorder Component
 * Records and plays back user interactions for tour automation
 */

class ActionRecorder {
    constructor(app) {
        this.app = app;
        this.actionList = document.getElementById('actionList');
        this.actionTemplate = document.getElementById('actionTemplate');

        this.recording = false;
        this.recordedActions = [];
        this.currentActions = [];
    }

    startRecording() {
        this.recording = true;
        this.recordedActions = [];
        this.app.showToast('Recording started. Perform actions in preview...', 'info');

        // Listen for messages from iframe
        window.addEventListener('message', this.handleRecordedAction);

        // Send record mode to iframe
        this.app.previewFrame.sendToIframe('startRecording');
    }

    stopRecording() {
        this.recording = false;
        window.removeEventListener('message', this.handleRecordedAction);

        this.app.previewFrame.sendToIframe('stopRecording');

        if (this.recordedActions.length > 0) {
            this.currentActions = [...this.recordedActions];
            this.renderActionList();
            this.app.showToast(`Recorded ${this.recordedActions.length} action(s)`, 'success');
        }
    }

    handleRecordedAction = (e) => {
        if (e.data && e.data.source === 'tourEditor' && e.data.type === 'actionRecorded') {
            this.recordedActions.push(e.data.data);
        }
    }

    addActionItem() {
        const newAction = {
            type: 'click',
            target: '',
            value: '',
            delay: 300
        };

        this.currentActions.push(newAction);
        this.renderActionList();
    }

    removeAction(index) {
        this.currentActions.splice(index, 1);
        this.renderActionList();
    }

    renderActionList() {
        this.actionList.innerHTML = '';

        this.currentActions.forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'action-item';
            item.innerHTML = `
                <div class="action-row">
                    <select class="form-input action-type" data-index="${index}">
                        <option value="click" ${action.type === 'click' ? 'selected' : ''}>Click</option>
                        <option value="dblclick" ${action.type === 'dblclick' ? 'selected' : ''}>Double Click</option>
                        <option value="input" ${action.type === 'input' ? 'selected' : ''}>Enter Text</option>
                        <option value="scroll" ${action.type === 'scroll' ? 'selected' : ''}>Scroll To</option>
                        <option value="wait" ${action.type === 'wait' ? 'selected' : ''}>Wait</option>
                    </select>
                    <button class="btn btn-sm btn-icon remove-action" data-index="${index}" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="action-row">
                    <input type="text" class="form-input action-target" data-index="${index}"
                        placeholder="CSS Selector" value="${action.target || ''}"
                        ${action.type === 'wait' ? 'disabled' : ''}>
                    <button class="btn btn-sm btn-secondary pick-action-target" data-index="${index}" title="Pick element">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                </div>
                <div class="action-row action-value-row" style="display: ${action.type === 'input' ? 'flex' : 'none'}">
                    <input type="text" class="form-input action-value" data-index="${index}"
                        placeholder="Text to enter" value="${action.value || ''}">
                </div>
                <div class="action-row">
                    <label>Delay after (ms):</label>
                    <input type="number" class="form-input action-delay" data-index="${index}"
                        value="${action.delay || 300}" min="0" max="5000">
                </div>
            `;
            this.actionList.appendChild(item);
        });

        this.setupActionItemHandlers();
    }

    setupActionItemHandlers() {
        // Remove buttons
        this.actionList.querySelectorAll('.remove-action').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeAction(parseInt(btn.dataset.index));
            });
        });

        // Type selectors
        this.actionList.querySelectorAll('.action-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.currentActions[index].type = e.target.value;

                // Show/hide value row for input type
                const item = e.target.closest('.action-item');
                const valueRow = item.querySelector('.action-value-row');
                const targetInput = item.querySelector('.action-target');

                valueRow.style.display = e.target.value === 'input' ? 'flex' : 'none';
                targetInput.disabled = e.target.value === 'wait';
            });
        });

        // Target inputs
        this.actionList.querySelectorAll('.action-target').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.currentActions[index].target = e.target.value;
            });
        });

        // Value inputs
        this.actionList.querySelectorAll('.action-value').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.currentActions[index].value = e.target.value;
            });
        });

        // Delay inputs
        this.actionList.querySelectorAll('.action-delay').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.currentActions[index].delay = parseInt(e.target.value) || 300;
            });
        });

        // Pick target buttons
        this.actionList.querySelectorAll('.pick-action-target').forEach(btn => {
            btn.addEventListener('click', () => {
                this.pickActionTarget(parseInt(btn.dataset.index));
            });
        });
    }

    pickActionTarget(actionIndex) {
        this.app.hideModal('actionModal');

        // Store which action we're picking for
        this.pickingForAction = actionIndex;

        // Enable element selection with callback
        this.app.previewFrame.enableElementSelection();

        const originalCallback = this.app.onElementSelected.bind(this.app);
        this.app.onElementSelected = (selector) => {
            // Update action target
            if (this.pickingForAction !== null) {
                this.currentActions[this.pickingForAction].target = selector;
                this.pickingForAction = null;
                this.app.onElementSelected = originalCallback;
                this.app.previewFrame.disableElementSelection();
                this.app.showModal('actionModal');
                this.renderActionList();
            } else {
                originalCallback(selector);
            }
        };

        this.app.showToast('Click an element in preview to select it', 'info');
    }

    testActions() {
        if (this.currentActions.length === 0) {
            this.app.showToast('No actions to test', 'error');
            return;
        }

        this.app.showToast('Testing actions...', 'info');
        this.app.previewFrame.executeActions(this.currentActions);
    }

    loadActions(actionsData) {
        if (Array.isArray(actionsData)) {
            this.currentActions = JSON.parse(JSON.stringify(actionsData));
        } else if (actionsData) {
            // Single action object
            this.currentActions = [JSON.parse(JSON.stringify(actionsData))];
        } else {
            this.currentActions = [];
        }
        this.renderActionList();
    }

    clearActions() {
        this.currentActions = [];
        this.renderActionList();
    }

    getActionsData() {
        // Filter out invalid actions
        const validActions = this.currentActions.filter(a => {
            if (a.type === 'wait') return true;
            return a.target && a.target.trim() !== '';
        });

        if (validActions.length === 0) return null;
        if (validActions.length === 1) return validActions[0];
        return validActions;
    }

    // Create preset action configurations
    createPreset(type) {
        const presets = {
            flipCard: [
                { type: 'click', target: '.card', delay: 500 }
            ],
            startReview: [
                { type: 'click', target: '.mode-btn[data-mode="review"]', delay: 300 },
                { type: 'click', target: '#startBtn', delay: 500 }
            ],
            startTest: [
                { type: 'click', target: '.mode-btn[data-mode="test"]', delay: 300 },
                { type: 'click', target: '#startBtn', delay: 500 }
            ],
            enterText: [
                { type: 'input', target: '#answerInput', value: 'example', delay: 300 },
                { type: 'click', target: '#submitBtn', delay: 300 }
            ],
            navigate: [
                { type: 'click', target: '.next-btn', delay: 300 }
            ]
        };

        return presets[type] || [];
    }
}
