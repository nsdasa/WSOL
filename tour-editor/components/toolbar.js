/**
 * Toolbar Component
 * Manages toolbar buttons and keyboard shortcuts
 */

class Toolbar {
    constructor(app) {
        this.app = app;
        this.setupShortcuts();
    }

    setupShortcuts() {
        // Keyboard shortcuts are handled in main app
        // This component provides additional toolbar functionality
    }

    // Toolbar button states
    setButtonState(buttonId, enabled, active = false) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.disabled = !enabled;
        btn.classList.toggle('active', active);
    }

    // Show loading state on button
    setLoading(buttonId, loading) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        if (loading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
            btn.disabled = false;
        }
    }

    // Context-aware toolbar updates
    updateContext(context) {
        switch (context) {
            case 'noModule':
                this.setButtonState('selectElementBtn', false);
                this.setButtonState('drawShapeBtn', false);
                this.setButtonState('recordActionBtn', false);
                this.setButtonState('addStepBtn', false);
                break;

            case 'moduleLoaded':
                this.setButtonState('selectElementBtn', true);
                this.setButtonState('drawShapeBtn', true);
                this.setButtonState('recordActionBtn', true);
                this.setButtonState('addStepBtn', true);
                break;

            case 'stepSelected':
                this.setButtonState('selectElementBtn', true);
                this.setButtonState('drawShapeBtn', true);
                this.setButtonState('recordActionBtn', true);
                break;

            case 'selectMode':
                this.setButtonState('selectElementBtn', true, true);
                this.setButtonState('drawShapeBtn', true, false);
                this.setButtonState('recordActionBtn', true, false);
                break;

            case 'drawMode':
                this.setButtonState('selectElementBtn', true, false);
                this.setButtonState('drawShapeBtn', true, true);
                this.setButtonState('recordActionBtn', true, false);
                break;

            case 'recordMode':
                this.setButtonState('selectElementBtn', true, false);
                this.setButtonState('drawShapeBtn', true, false);
                this.setButtonState('recordActionBtn', true, true);
                break;
        }
    }

    // Undo/Redo support (placeholder for future)
    canUndo() {
        return false; // Not implemented yet
    }

    canRedo() {
        return false; // Not implemented yet
    }

    undo() {
        // TODO: Implement undo stack
    }

    redo() {
        // TODO: Implement redo stack
    }
}
