// =================================================================
// ADMIN MODULE - Version 4.0 RESTORED
// November 2025 - Per-language card support
// Full functionality with proper icons and modal display
// =================================================================

class AdminModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.languageFile = null;
        this.wordFiles = {}; // Per-language word files
        this.imageFiles = [];
        this.audioFiles = [];
        this.statsInterval = null;
    }

    async render() {
        // Get languages from manifest for word file inputs
        const languages = this.assets.manifest?.languages || [
            {trigraph: 'ceb', name: 'Cebuano'},
            {trigraph: 'mrw', name: 'Maranao'},
            {trigraph: 'sin', name: 'Sinama'}
        ];

        // Filter out English (it's the target language)
        const targetLanguages = languages.filter(l => l.trigraph.toLowerCase() !== 'eng');

        this.container.innerHTML = `
            <div class="card module-admin">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-tools"></i>
                        Administration Panel
                    </h2>
                    <p class="card-description">Manage assets, view system status, and configure debug settings.</p>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-heartbeat"></i> System Status</h3>
                    <div class="version-notice">
                        <strong>Manifest Version:</strong> <span id="manifestVersion">--</span>
                        <p>Last Updated: <span id="manifestLastUpdated">--</span></p>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-images"></i></div>
                            <div class="stat-value" id="adminTotalCards">0</div>
                            <div class="stat-label">Cards Loaded</div>
                            <div class="stat-detail" id="adminCardsDetail"></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-volume-up"></i></div>
                            <div class="stat-value" id="adminAudioCards">0</div>
                            <div class="stat-label">With Audio</div>
                            <div class="stat-detail" id="adminAudioDetail"></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-gamepad"></i></div>
                            <div class="stat-value" id="adminModuleCount">0</div>
                            <div class="stat-label">Active Modules</div>
                        </div>
                    </div>
                    <div id="languageStatsContainer" class="manifest-details"></div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-puzzle-piece"></i> Module Health Check</h3>
                    <div id="moduleStatus" class="module-status-grid"></div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-bug"></i> Debug Configuration</h3>
                    <div class="debug-config">
                        <p style="margin-bottom:12px;color:var(--text-secondary);font-size:14px;">
                            Control the debug logging level for troubleshooting.
                        </p>
                        <div class="segmented-control">
                            <button class="segmented-option ${debugLogger?.level === 0 ? 'active' : ''}" data-level="0">
                                <i class="fas fa-ban"></i> Off
                            </button>
                            <button class="segmented-option ${debugLogger?.level === 1 ? 'active' : ''}" data-level="1">
                                <i class="fas fa-exclamation-circle"></i> Errors
                            </button>
                            <button class="segmented-option ${debugLogger?.level === 2 ? 'active' : ''}" data-level="2">
                                <i class="fas fa-exclamation-triangle"></i> Warnings
                            </button>
                            <button class="segmented-option ${debugLogger?.level === 3 ? 'active' : ''}" data-level="3">
                                <i class="fas fa-info-circle"></i> All
                            </button>
                        </div>
                        
                        <div style="margin-top:20px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                <h4 style="margin:0;font-size:14px;color:var(--text-primary);">
                                    <i class="fas fa-terminal"></i> Debug Log
                                </h4>
                                <button id="clearDebugBtn" class="btn btn-secondary btn-sm">
                                    <i class="fas fa-trash-alt"></i> Clear
                                </button>
                            </div>
                            <div id="adminDebugLog" class="debug-log-container"></div>
                        </div>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-clock"></i> Session Management</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <div class="current-session-info">
                            <strong>Current Session:</strong>
                            <span id="sessionStatusText">Not logged in</span>
                        </div>
                        <div style="margin-top:16px;">
                            <label class="form-label">Auto-logout Timeout (minutes)</label>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <input type="number" id="sessionTimeoutInput" class="form-input" style="width:100px;" min="5" max="480" value="30">
                                <button id="saveTimeoutBtn" class="btn btn-primary btn-sm">
                                    <i class="fas fa-save"></i> Update Timeout
                                </button>
                            </div>
                            <p style="margin-top:8px;font-size:12px;color:var(--text-secondary);">
                                Range: 5-480 minutes. Changes take effect immediately.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-users-cog"></i> User Management</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Add, edit, or remove users and manage their passwords and roles.
                        </p>
                        <div id="userManagementContainer">
                            <div class="user-management-loading">
                                <i class="fas fa-spinner fa-spin"></i> Loading users...
                            </div>
                        </div>
                        <div class="user-management-actions" style="margin-top:16px;">
                            <button id="addUserBtn" class="btn btn-primary">
                                <i class="fas fa-user-plus"></i> Add New User
                            </button>
                            <button id="refreshUsersBtn" class="btn btn-secondary" style="margin-left:8px;">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-route"></i> Tour Guide Editor</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Edit the guided tour text that appears when users click "Show Tour" in each module.
                        </p>
                        <div id="tourEditorContainer">
                            <div class="tour-editor-loading">
                                <i class="fas fa-spinner fa-spin"></i> Loading tour configuration...
                            </div>
                        </div>
                        <div class="tour-editor-actions" style="margin-top:16px;display:flex;gap:12px;">
                            <button id="saveTourConfigBtn" class="btn btn-primary" disabled>
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button id="resetTourConfigBtn" class="btn btn-secondary">
                                <i class="fas fa-undo"></i> Reset to Saved
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.updateStats();
        this.checkModuleStatus();
        this.updateDebugLog();
    }

    setupEventListeners() {
        // Setup all sub-sections
        this.setupDebugControls();
        this.setupSessionTimeout();
        this.setupUserManagement();
        this.setupTourEditor();
    }

    updateStats() {
        const manifest = this.assets.manifest;
        if (!manifest) return;

        // Update version info
        const versionEl = document.getElementById('manifestVersion');
        const lastUpdatedEl = document.getElementById('manifestLastUpdated');
        
        if (versionEl) versionEl.textContent = manifest.version || '3.1';
        if (lastUpdatedEl) lastUpdatedEl.textContent = manifest.lastUpdated || 'Unknown';

        // Calculate total cards across all languages
        let totalCards = 0;
        let totalAudio = 0;
        const langDetails = [];

        if (manifest.cards) {
            Object.entries(manifest.cards).forEach(([trigraph, cards]) => {
                if (Array.isArray(cards)) {
                    const langName = manifest.languages?.find(l => l.trigraph === trigraph)?.name || trigraph;
                    const audioCount = cards.filter(c => c.hasAudio).length;
                    totalCards += cards.length;
                    totalAudio += audioCount;
                    langDetails.push(`${langName}: ${cards.length}`);
                }
            });
        }

        // Update stat cards
        const totalCardsEl = document.getElementById('adminTotalCards');
        const audioCardsEl = document.getElementById('adminAudioCards');
        const moduleCountEl = document.getElementById('adminModuleCount');
        const cardsDetailEl = document.getElementById('adminCardsDetail');
        const audioDetailEl = document.getElementById('adminAudioDetail');
        
        if (totalCardsEl) totalCardsEl.textContent = totalCards;
        if (audioCardsEl) audioCardsEl.textContent = totalAudio;
        if (moduleCountEl) moduleCountEl.textContent = '7'; // Fixed number of modules
        
        if (cardsDetailEl && langDetails.length > 0) {
            cardsDetailEl.textContent = langDetails.join(' | ');
        }
        
        if (audioDetailEl && totalCards > 0) {
            const percentage = Math.round((totalAudio / totalCards) * 100);
            audioDetailEl.textContent = `${percentage}% coverage`;
        }

        // Update language stats container
        const langStatsContainer = document.getElementById('languageStatsContainer');
        if (langStatsContainer && manifest.stats?.languageStats) {
            let html = '<p><strong>Per-Language Statistics:</strong></p><div>';
            Object.entries(manifest.stats.languageStats).forEach(([trigraph, stats]) => {
                const langName = manifest.languages?.find(l => l.trigraph === trigraph)?.name || trigraph;
                html += `<p><strong>${langName}:</strong> ${stats.totalCards} cards, ${stats.cardsWithAudio} with audio, ${stats.lessons?.length || 0} lessons</p>`;
            });
            html += '</div>';
            langStatsContainer.innerHTML = html;
        }
    }

    checkModuleStatus() {
        const statusContainer = document.getElementById('moduleStatus');
        if (!statusContainer) return;

        // Check if a module's nav tab exists
        const hasNavTab = (moduleKey) => {
            return document.querySelector(`.nav-tab[data-module="${moduleKey}"]`) !== null;
        };

        // Get current language cards from manifest
        const currentLang = document.getElementById('languageSelect')?.value || 'ceb';
        const cards = this.assets.manifest?.cards?.[currentLang] || [];
        const manifestImages = this.assets.manifest?.images || {};

        // Count cards with specific features
        const totalCards = cards.length;
        // Check for images in manifest.images by cardNum, or printImagePath as fallback
        const cardsWithImages = cards.filter(c => {
            const cardNum = c.cardNum || c.id;
            return manifestImages[cardNum] || c.printImagePath;
        }).length;
        const cardsWithAudio = cards.filter(c => c.hasAudio).length;

        const modules = [
            { 
                name: 'Flashcards', 
                icon: 'fa-layer-group', 
                moduleKey: 'flashcards',
                check: () => hasNavTab('flashcards') && totalCards > 0,
                detail: `${totalCards} cards`
            },
            { 
                name: 'Picture Match', 
                icon: 'fa-link', 
                moduleKey: 'match',
                check: () => hasNavTab('match') && cardsWithImages > 0,
                detail: `${cardsWithImages} with images`
            },
            { 
                name: 'Audio Match', 
                icon: 'fa-volume-up', 
                moduleKey: 'match-sound',
                check: () => hasNavTab('match-sound') && cardsWithAudio > 0,
                detail: `${cardsWithAudio} with audio`
            },
            { 
                name: 'Unsa Ni Quiz', 
                icon: 'fa-question-circle', 
                moduleKey: 'quiz',
                check: () => hasNavTab('quiz') && cardsWithImages > 0,
                detail: `${cardsWithImages} with images`
            },
            { 
                name: 'Deck Builder', 
                icon: 'fa-edit', 
                moduleKey: 'deck-builder',
                check: () => hasNavTab('deck-builder') && totalCards > 0,
                detail: `${totalCards} cards`
            },
            { 
                name: 'PDF Print', 
                icon: 'fa-print', 
                moduleKey: 'pdf',
                check: () => hasNavTab('pdf') && cardsWithImages > 0,
                detail: `${cardsWithImages} printable`
            },
            { 
                name: 'Admin Panel', 
                icon: 'fa-tools', 
                moduleKey: 'admin',
                check: () => hasNavTab('admin'),
                detail: 'System tools'
            }
        ];

        statusContainer.innerHTML = modules.map(mod => {
            const isLoaded = mod.check();
            return `
                <div class="module-status-item ${isLoaded ? 'success' : 'error'}">
                    <div class="module-icon">
                        <i class="fas ${mod.icon}"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-name">${mod.name}</div>
                        <div class="module-status">
                            <i class="fas ${isLoaded ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            ${isLoaded ? mod.detail : 'Not Available'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupDebugControls() {
        // Debug level buttons
        document.querySelectorAll('.segmented-option[data-level]').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = parseInt(btn.dataset.level);
                if (debugLogger) {
                    debugLogger.setLevel(level);
                    
                    // Update active state
                    document.querySelectorAll('.segmented-option[data-level]').forEach(b => {
                        b.classList.toggle('active', parseInt(b.dataset.level) === level);
                    });
                    
                    toastManager.show(`Debug level set to ${level === 0 ? 'Off' : level === 1 ? 'Errors' : level === 2 ? 'Warnings' : 'All'}`, 'success');
                }
            });
        });
        
        const clearDebugBtn = document.getElementById('clearDebugBtn');
        if (clearDebugBtn) {
            clearDebugBtn.addEventListener('click', () => {
                debugLogger?.clear();
                this.updateDebugLog();
                toastManager.show('Debug log cleared', 'success');
            });
        }
    }

    setupSessionTimeout() {
        const timeoutInput = document.getElementById('sessionTimeoutInput');
        const saveTimeoutBtn = document.getElementById('saveTimeoutBtn');
        const sessionStatusText = document.getElementById('sessionStatusText');
        
        // Load current timeout value
        if (authManager?.authenticated) {
            if (timeoutInput) timeoutInput.value = authManager.timeoutMinutes || 30;
            if (sessionStatusText) {
                sessionStatusText.textContent = `Active - ${authManager.timeoutMinutes} minute timeout`;
                sessionStatusText.style.color = 'var(--success)';
            }
        } else if (sessionStatusText) {
            sessionStatusText.textContent = 'Not logged in';
            sessionStatusText.style.color = 'var(--text-secondary)';
        }
        
        // Save timeout button
        if (saveTimeoutBtn) {
            saveTimeoutBtn.addEventListener('click', async () => {
                const minutes = parseInt(timeoutInput?.value);
                
                if (isNaN(minutes) || minutes < 5 || minutes > 480) {
                    toastManager.show('Timeout must be between 5 and 480 minutes', 'error');
                    return;
                }
                
                if (!authManager?.authenticated) {
                    toastManager.show('You must be logged in to change this setting', 'warning');
                    return;
                }
                
                saveTimeoutBtn.disabled = true;
                saveTimeoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                
                const success = await authManager.setSessionTimeout(minutes);
                
                if (success && sessionStatusText) {
                    sessionStatusText.textContent = `Active - ${minutes} minute timeout`;
                }
                
                saveTimeoutBtn.disabled = false;
                saveTimeoutBtn.innerHTML = '<i class="fas fa-save"></i> Update Timeout';
            });
        }
    }

    // =========================================
    // USER MANAGEMENT
    // =========================================

    setupUserManagement() {
        this.users = [];
        this.loadUsers();

        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showUserModal());
        }

        // Refresh users button
        const refreshUsersBtn = document.getElementById('refreshUsersBtn');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => this.loadUsers());
        }
    }

    async loadUsers() {
        const container = document.getElementById('userManagementContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="user-management-loading">
                <i class="fas fa-spinner fa-spin"></i> Loading users...
            </div>
        `;

        try {
            const response = await fetch('users.php?action=list&_=' + Date.now(), {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const result = await response.json();

            if (result.success) {
                this.users = result.users;
                this.renderUsersList();
            } else {
                throw new Error(result.error || 'Failed to load users');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="user-management-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load users: ${error.message}</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('refreshUsersBtn').click()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    renderUsersList() {
        const container = document.getElementById('userManagementContainer');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="user-management-empty">
                    <i class="fas fa-users-slash"></i>
                    <p>No users found. Click "Add New User" to create one.</p>
                </div>
            `;
            return;
        }

        const roleLabels = {
            'admin': { label: 'Admin', color: '#ef4444', icon: 'fa-user-shield' },
            'deck-manager': { label: 'Deck Manager', color: '#3b82f6', icon: 'fa-edit' },
            'editor': { label: 'Editor', color: '#f59e0b', icon: 'fa-pen' },
            'voice-recorder': { label: 'Voice Recorder', color: '#10b981', icon: 'fa-microphone' }
        };

        const languageNames = {
            'ceb': 'Cebuano',
            'mrw': 'Maranao',
            'sin': 'Sinama'
        };

        let html = '<div class="users-list">';

        this.users.forEach(user => {
            const roleInfo = roleLabels[user.role] || { label: user.role, color: '#6b7280', icon: 'fa-user' };
            const created = user.created ? new Date(user.created).toLocaleDateString() : 'N/A';

            // Show language restriction for editor/voice-recorder
            let languageTag = '';
            if (['editor', 'voice-recorder'].includes(user.role) && user.language) {
                const langName = languageNames[user.language] || user.language;
                languageTag = `<span class="user-language-tag" style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:4px;font-size:11px;background:var(--primary);color:white;"><i class="fas fa-globe"></i> ${langName}</span>`;
            }

            html += `
                <div class="user-card" data-user-id="${user.id}">
                    <div class="user-card-main">
                        <div class="user-avatar" style="background:${roleInfo.color}20;color:${roleInfo.color};">
                            <i class="fas ${roleInfo.icon}"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${this.escapeHtml(user.username)}${languageTag}</div>
                            <div class="user-role" style="color:${roleInfo.color};">
                                <i class="fas ${roleInfo.icon}"></i> ${roleInfo.label}
                            </div>
                            <div class="user-meta">Created: ${created}</div>
                        </div>
                    </div>
                    <div class="user-card-actions">
                        <button class="btn btn-sm btn-secondary edit-user-btn" data-user-id="${user.id}" title="Edit user">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-user-btn" data-user-id="${user.id}" title="Delete user">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Setup event listeners for edit and delete buttons
        container.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.userId);
                const user = this.users.find(u => u.id === userId);
                if (user) this.showUserModal(user);
            });
        });

        container.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.userId);
                const user = this.users.find(u => u.id === userId);
                if (user) this.confirmDeleteUser(user);
            });
        });
    }

    showUserModal(user = null) {
        const isEdit = user !== null;
        const title = isEdit ? 'Edit User' : 'Add New User';

        const roleOptions = [
            { value: 'admin', label: 'Admin - Full access to all features' },
            { value: 'deck-manager', label: 'Deck Manager - Full Deck Builder access' },
            { value: 'editor', label: 'Editor - Table editing only (no tool sections)' },
            { value: 'voice-recorder', label: 'Voice Recorder - Audio recording only' }
        ];

        const languageOptions = [
            { value: '', label: 'All Languages (no restriction)' },
            { value: 'ceb', label: 'Cebuano' },
            { value: 'mrw', label: 'Maranao' },
            { value: 'sin', label: 'Sinama' }
        ];

        // Determine if language field should be visible (only for editor/voice-recorder)
        const currentRole = isEdit ? user.role : 'admin';
        const showLanguage = ['editor', 'voice-recorder'].includes(currentRole);
        const currentLanguage = isEdit ? (user.language || '') : '';

        const modal = document.createElement('div');
        modal.className = 'modal user-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;width:90%;background:var(--bg-primary);border-radius:12px;overflow:hidden;">
                <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="margin:0;font-size:18px;"><i class="fas ${isEdit ? 'fa-user-edit' : 'fa-user-plus'}"></i> ${title}</h2>
                    <button class="modal-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding:24px;">
                    <form id="userForm">
                        <div class="form-group" style="margin-bottom:16px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;">Username</label>
                            <input type="text" id="userUsername" class="form-input" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;"
                                   value="${isEdit ? this.escapeHtml(user.username) : ''}"
                                   placeholder="Enter username (min 3 characters)"
                                   required minlength="3">
                        </div>
                        <div class="form-group" style="margin-bottom:16px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;">
                                Password ${isEdit ? '(leave blank to keep current)' : ''}
                            </label>
                            <div style="position:relative;">
                                <input type="password" id="userPassword" class="form-input" style="width:100%;padding:10px 12px;padding-right:40px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;"
                                       placeholder="${isEdit ? 'Enter new password or leave blank' : 'Enter password (min 4 characters)'}"
                                       ${isEdit ? '' : 'required'} minlength="4">
                                <button type="button" class="toggle-password-btn" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary);">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:16px;">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;">Role</label>
                            <select id="userRole" class="form-input" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;" required>
                                ${roleOptions.map(opt => `
                                    <option value="${opt.value}" ${isEdit && user.role === opt.value ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group language-field" style="margin-bottom:16px;${showLanguage ? '' : 'display:none;'}">
                            <label class="form-label" style="display:block;margin-bottom:6px;font-weight:600;">
                                <i class="fas fa-globe"></i> Language Restriction
                            </label>
                            <select id="userLanguage" class="form-input" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;">
                                ${languageOptions.map(opt => `
                                    <option value="${opt.value}" ${currentLanguage === opt.value ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('')}
                            </select>
                            <p style="margin:6px 0 0;font-size:12px;color:var(--text-secondary);">
                                Editor and Voice Recorder users must be assigned to a specific language.
                            </p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:12px;">
                    <button class="btn btn-secondary cancel-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn btn-primary save-btn">
                        <i class="fas fa-save"></i> ${isEdit ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Toggle password visibility
        const toggleBtn = modal.querySelector('.toggle-password-btn');
        const passwordInput = modal.querySelector('#userPassword');
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
        });

        // Show/hide language field based on role selection
        const roleSelect = modal.querySelector('#userRole');
        const languageField = modal.querySelector('.language-field');
        roleSelect.addEventListener('change', () => {
            const selectedRole = roleSelect.value;
            const needsLanguage = ['editor', 'voice-recorder'].includes(selectedRole);
            languageField.style.display = needsLanguage ? '' : 'none';
        });

        // Close modal handlers
        const closeModal = () => document.body.removeChild(modal);

        modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Save handler
        modal.querySelector('.save-btn').addEventListener('click', async () => {
            const username = modal.querySelector('#userUsername').value.trim();
            const password = modal.querySelector('#userPassword').value;
            const role = modal.querySelector('#userRole').value;
            const languageSelect = modal.querySelector('#userLanguage');
            const language = languageSelect.value || null;

            // Validation
            if (username.length < 3) {
                toastManager.show('Username must be at least 3 characters', 'error');
                return;
            }

            if (!isEdit && password.length < 4) {
                toastManager.show('Password must be at least 4 characters', 'error');
                return;
            }

            if (isEdit && password && password.length < 4) {
                toastManager.show('Password must be at least 4 characters', 'error');
                return;
            }

            // Language is required for editor and voice-recorder
            if (['editor', 'voice-recorder'].includes(role) && !language) {
                toastManager.show('Language is required for Editor and Voice Recorder roles', 'error');
                return;
            }

            const saveBtn = modal.querySelector('.save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                const action = isEdit ? 'edit' : 'add';
                const payload = isEdit
                    ? { id: user.id, username, role, language, ...(password ? { password } : {}) }
                    : { username, password, role, language };

                const response = await fetch(`users.php?action=${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.success) {
                    toastManager.show(result.message || `User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                    closeModal();
                    this.loadUsers();
                } else {
                    throw new Error(result.error || 'Failed to save user');
                }
            } catch (error) {
                toastManager.show(error.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${isEdit ? 'Save Changes' : 'Create User'}`;
            }
        });

        // Focus username input
        modal.querySelector('#userUsername').focus();
    }

    confirmDeleteUser(user) {
        const modal = document.createElement('div');
        modal.className = 'modal delete-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;width:90%;background:var(--bg-primary);border-radius:12px;overflow:hidden;">
                <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid var(--border-color);background:#fef2f2;">
                    <h2 style="margin:0;font-size:18px;color:#dc2626;">
                        <i class="fas fa-exclamation-triangle"></i> Delete User
                    </h2>
                </div>
                <div class="modal-body" style="padding:24px;">
                    <p style="margin:0 0 16px 0;">Are you sure you want to delete the user <strong>${this.escapeHtml(user.username)}</strong>?</p>
                    <p style="margin:0;color:var(--text-secondary);font-size:13px;">This action cannot be undone.</p>
                </div>
                <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:12px;">
                    <button class="btn btn-secondary cancel-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn btn-danger delete-btn">
                        <i class="fas fa-trash"></i> Delete User
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => document.body.removeChild(modal);

        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.delete-btn').addEventListener('click', async () => {
            const deleteBtn = modal.querySelector('.delete-btn');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

            try {
                const response = await fetch('users.php?action=delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: user.id })
                });

                const result = await response.json();

                if (result.success) {
                    toastManager.show('User deleted successfully', 'success');
                    closeModal();
                    this.loadUsers();
                } else {
                    throw new Error(result.error || 'Failed to delete user');
                }
            } catch (error) {
                toastManager.show(error.message, 'error');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
            }
        });
    }

    updateDebugLog() {
        const logContainer = document.getElementById('adminDebugLog');
        const debugLog = document.getElementById('debugLog');
        
        if (logContainer && debugLog) {
            logContainer.innerHTML = debugLog.innerHTML || '<div style="color:var(--text-secondary);text-align:center;padding:24px;">No debug messages yet</div>';
        }
        
        setTimeout(() => {
            if (router?.currentModule instanceof AdminModule) {
                this.updateDebugLog();
            }
        }, 2000);
    }

    // =========================================
    // TOUR EDITOR
    // =========================================

    async setupTourEditor() {
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
    }

    renderTourEditor() {
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
    }

    renderTourSteps(moduleId, steps, phaseId = null) {
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
    }

    setupTourStepHandlers() {
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
    }

    handleTourInputChange(e) {
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
    }

    moveTourStep(moduleId, phaseId, index, direction) {
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
    }

    deleteTourStep(moduleId, phaseId, index) {
        const steps = phaseId ? this.tourConfig[moduleId]?.[phaseId] : this.tourConfig[moduleId];
        if (!steps || !Array.isArray(steps)) return;

        steps.splice(index, 1);
        this.tourConfigModified = true;
        this.renderTourEditor();
        this.updateTourSaveButton();

        // Re-expand the module section
        const section = document.querySelector(`.tour-module-section[data-module="${moduleId}"]`);
        if (section) section.classList.add('expanded');
    }

    addTourStep(moduleId, phaseId = null) {
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
    }

    updateTourSaveButton() {
        const saveBtn = document.getElementById('saveTourConfigBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.tourConfigModified;
        }
    }

    async saveTourConfig() {
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
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        super.destroy();
    }
}