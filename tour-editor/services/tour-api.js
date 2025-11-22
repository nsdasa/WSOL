/**
 * Tour API Service
 * Handles communication with backend for publishing tours
 */

class TourAPI {
    static BASE_URL = '..';

    // Publish tour configuration
    static async publishConfig(config) {
        try {
            const response = await fetch(`${this.BASE_URL}/save-tour-config.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to publish tour');
            }

            return result;
        } catch (error) {
            console.error('Error publishing config:', error);
            throw error;
        }
    }

    // Load current live config
    static async loadLiveConfig() {
        try {
            const response = await fetch(`${this.BASE_URL}/tour-config.json?v=${Date.now()}`);

            if (!response.ok) {
                throw new Error('Failed to load tour config');
            }

            return response.json();
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    // Validate tour configuration
    static validateConfig(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('Invalid configuration object');
            return { valid: false, errors };
        }

        // Check each module
        Object.entries(config).forEach(([moduleName, moduleConfig]) => {
            if (moduleName.startsWith('_')) return; // Skip comments

            if (Array.isArray(moduleConfig)) {
                // Simple format
                moduleConfig.forEach((step, index) => {
                    const stepErrors = this.validateStep(step, `${moduleName}[${index}]`);
                    errors.push(...stepErrors);
                });
            } else if (typeof moduleConfig === 'object') {
                // Phased format
                Object.entries(moduleConfig).forEach(([phase, steps]) => {
                    if (!Array.isArray(steps)) {
                        errors.push(`${moduleName}.${phase} should be an array`);
                        return;
                    }
                    steps.forEach((step, index) => {
                        const stepErrors = this.validateStep(step, `${moduleName}.${phase}[${index}]`);
                        errors.push(...stepErrors);
                    });
                });
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate a single step
    static validateStep(step, path) {
        const errors = [];

        if (!step || typeof step !== 'object') {
            errors.push(`${path}: Invalid step object`);
            return errors;
        }

        // Title is recommended but not required
        if (!step.title) {
            // Warning only, not error
            console.warn(`${path}: Step has no title`);
        }

        // Description is recommended
        if (!step.description) {
            console.warn(`${path}: Step has no description`);
        }

        // Position should be valid
        const validPositions = ['top', 'bottom', 'left', 'right'];
        if (step.position && !validPositions.includes(step.position)) {
            errors.push(`${path}: Invalid position "${step.position}"`);
        }

        // Validate preAction if present
        if (step.preAction) {
            const actionErrors = this.validateAction(step.preAction, `${path}.preAction`);
            errors.push(...actionErrors);
        }

        return errors;
    }

    // Validate an action configuration
    static validateAction(action, path) {
        const errors = [];

        if (Array.isArray(action)) {
            action.forEach((a, i) => {
                const actionErrors = this.validateSingleAction(a, `${path}[${i}]`);
                errors.push(...actionErrors);
            });
        } else {
            const actionErrors = this.validateSingleAction(action, path);
            errors.push(...actionErrors);
        }

        return errors;
    }

    static validateSingleAction(action, path) {
        const errors = [];

        if (!action || typeof action !== 'object') {
            errors.push(`${path}: Invalid action object`);
            return errors;
        }

        const validTypes = ['click', 'dblclick', 'input', 'scroll', 'wait', 'custom'];
        if (!action.type || !validTypes.includes(action.type)) {
            errors.push(`${path}: Invalid action type "${action.type}"`);
        }

        if (action.type !== 'wait' && !action.target) {
            errors.push(`${path}: Action requires target selector`);
        }

        if (action.type === 'input' && !action.value) {
            console.warn(`${path}: Input action has no value`);
        }

        return errors;
    }

    // Compare two configs and get diff
    static diffConfigs(oldConfig, newConfig) {
        const changes = {
            added: [],
            removed: [],
            modified: []
        };

        const oldModules = new Set(Object.keys(oldConfig).filter(k => !k.startsWith('_')));
        const newModules = new Set(Object.keys(newConfig).filter(k => !k.startsWith('_')));

        // Find added modules
        newModules.forEach(mod => {
            if (!oldModules.has(mod)) {
                changes.added.push({ type: 'module', name: mod });
            }
        });

        // Find removed modules
        oldModules.forEach(mod => {
            if (!newModules.has(mod)) {
                changes.removed.push({ type: 'module', name: mod });
            }
        });

        // Find modified modules
        newModules.forEach(mod => {
            if (oldModules.has(mod)) {
                const oldStr = JSON.stringify(oldConfig[mod]);
                const newStr = JSON.stringify(newConfig[mod]);
                if (oldStr !== newStr) {
                    changes.modified.push({
                        type: 'module',
                        name: mod,
                        oldStepCount: this.countSteps(oldConfig[mod]),
                        newStepCount: this.countSteps(newConfig[mod])
                    });
                }
            }
        });

        return changes;
    }

    // Count steps in a module config
    static countSteps(moduleConfig) {
        if (Array.isArray(moduleConfig)) {
            return moduleConfig.length;
        }
        if (typeof moduleConfig === 'object') {
            return Object.values(moduleConfig)
                .filter(Array.isArray)
                .reduce((sum, arr) => sum + arr.length, 0);
        }
        return 0;
    }

    // Create backup of current config
    static async createBackup() {
        try {
            const response = await fetch(`${this.BASE_URL}/backup-tour-config.php`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Backup failed');
            }

            return response.json();
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    // List available backups
    static async listBackups() {
        try {
            const response = await fetch(`${this.BASE_URL}/list-tour-backups.php`);

            if (!response.ok) {
                throw new Error('Failed to list backups');
            }

            return response.json();
        } catch (error) {
            console.error('Error listing backups:', error);
            throw error;
        }
    }

    // Restore from backup
    static async restoreBackup(backupId) {
        try {
            const response = await fetch(`${this.BASE_URL}/restore-tour-backup.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ backupId })
            });

            if (!response.ok) {
                throw new Error('Restore failed');
            }

            return response.json();
        } catch (error) {
            console.error('Error restoring backup:', error);
            throw error;
        }
    }
}
