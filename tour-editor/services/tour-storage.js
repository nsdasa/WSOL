/**
 * Tour Storage Service
 * Handles draft saving/loading using localStorage and server API
 */

class TourStorage {
    static STORAGE_KEY = 'tourEditorDrafts';

    // Get all drafts from localStorage
    static getDrafts() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error reading drafts:', error);
            return {};
        }
    }

    // Save drafts to localStorage
    static setDrafts(drafts) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
            return true;
        } catch (error) {
            console.error('Error saving drafts:', error);
            return false;
        }
    }

    // Save a single draft
    static async saveDraft(draftId, draftData) {
        const drafts = this.getDrafts();
        drafts[draftId] = {
            ...draftData,
            id: draftId,
            savedAt: Date.now()
        };
        this.setDrafts(drafts);

        // Also save to server for persistence
        try {
            await this.saveDraftToServer(draftId, draftData);
        } catch (error) {
            console.warn('Server save failed, draft saved locally:', error);
        }

        return drafts[draftId];
    }

    // Load a draft
    static async loadDraft(draftId) {
        // Try local first
        const drafts = this.getDrafts();
        if (drafts[draftId]) {
            return drafts[draftId];
        }

        // Try server
        try {
            return await this.loadDraftFromServer(draftId);
        } catch (error) {
            console.error('Error loading draft:', error);
            return null;
        }
    }

    // Delete a draft
    static async deleteDraft(draftId) {
        const drafts = this.getDrafts();
        delete drafts[draftId];
        this.setDrafts(drafts);

        // Also delete from server
        try {
            await this.deleteDraftFromServer(draftId);
        } catch (error) {
            console.warn('Server delete failed:', error);
        }
    }

    // List all drafts
    static async listDrafts() {
        const localDrafts = this.getDrafts();

        // Merge with server drafts
        try {
            const serverDrafts = await this.listDraftsFromServer();
            // Server drafts take precedence if newer
            Object.entries(serverDrafts).forEach(([id, draft]) => {
                if (!localDrafts[id] || draft.savedAt > localDrafts[id].savedAt) {
                    localDrafts[id] = draft;
                }
            });
        } catch (error) {
            console.warn('Could not fetch server drafts:', error);
        }

        return localDrafts;
    }

    // Server API methods
    static async saveDraftToServer(draftId, draftData) {
        const response = await fetch('../save-tour-draft.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: draftId,
                data: draftData
            })
        });

        if (!response.ok) {
            throw new Error('Server save failed');
        }

        return response.json();
    }

    static async loadDraftFromServer(draftId) {
        const response = await fetch(`../load-tour-draft.php?id=${encodeURIComponent(draftId)}`);

        if (!response.ok) {
            throw new Error('Server load failed');
        }

        return response.json();
    }

    static async deleteDraftFromServer(draftId) {
        const response = await fetch('../delete-tour-draft.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: draftId })
        });

        if (!response.ok) {
            throw new Error('Server delete failed');
        }

        return response.json();
    }

    static async listDraftsFromServer() {
        const response = await fetch('../list-tour-drafts.php');

        if (!response.ok) {
            throw new Error('Server list failed');
        }

        return response.json();
    }

    // Export draft to file
    static exportDraft(draftId) {
        const drafts = this.getDrafts();
        const draft = drafts[draftId];

        if (!draft) {
            throw new Error('Draft not found');
        }

        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `tour-draft-${draftId}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    // Import draft from file
    static importDraft(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const draft = JSON.parse(e.target.result);
                    const draftId = draft.id || `imported-${Date.now()}`;
                    this.saveDraft(draftId, draft);
                    resolve(draft);
                } catch (error) {
                    reject(new Error('Invalid draft file'));
                }
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    // Auto-save functionality
    static startAutoSave(app, intervalMs = 30000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (app.hasUnsavedChanges && app.currentModule) {
                app.saveDraft();
                console.log('Auto-saved draft');
            }
        }, intervalMs);
    }

    static stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Clear all local drafts
    static clearLocalDrafts() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
