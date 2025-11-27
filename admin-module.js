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

                <!-- System Status Section (Collapsible) -->
                <div class="admin-section collapsible collapsed" id="systemStatusSection" data-section="systemStatus">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-heartbeat"></i> System Status
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
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
                </div>

                <!-- Module Health Check Section (Collapsible) -->
                <div class="admin-section collapsible collapsed" id="moduleHealthSection" data-section="moduleHealth">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-puzzle-piece"></i> Module Health Check
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
                        <div id="moduleStatus" class="module-status-grid"></div>
                    </div>
                </div>

                <!-- Debug Configuration Section (Collapsible) -->
                <div class="admin-section collapsible collapsed" id="debugConfigSection" data-section="debugConfig">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-bug"></i> Debug Configuration
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
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
                </div>

                <!-- Session Management Section (Collapsible) -->
                <div class="admin-section collapsible collapsed" id="sessionManagementSection" data-section="sessionManagement">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-clock"></i> Session Management
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
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
                </div>

                <!-- User Management Section (Collapsible) -->
                <div class="admin-section collapsible collapsed" id="userManagementSection" data-section="userManagement">
                    <h3 class="section-title" role="button" tabindex="0">
                        <i class="fas fa-users-cog"></i> User Management
                        <i class="fas fa-chevron-down section-chevron"></i>
                    </h3>
                    <div class="section-content">
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
                </div>

            </div>
        `;

        this.setupEventListeners();
        this.setupCollapsibleSections();
        this.updateStats();
        this.checkModuleStatus();
        this.updateDebugLog();
    }

    setupEventListeners() {
        // Setup all sub-sections
        this.setupDebugControls();
        this.setupSessionTimeout();
        this.setupUserManagement();
    }

    setupCollapsibleSections() {
        const sections = this.container.querySelectorAll('.admin-section.collapsible');
        const storageKey = 'admin_collapsedSections';

        // Load saved states
        let savedStates = {};
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) savedStates = JSON.parse(saved);
        } catch (e) {
            console.warn('Could not load section states:', e);
        }

        sections.forEach(section => {
            const sectionId = section.dataset.section;
            const title = section.querySelector('.section-title');

            // Apply saved state (default to collapsed if not saved)
            if (savedStates[sectionId] === false) {
                section.classList.remove('collapsed');
            }

            // Toggle handler
            const toggleSection = () => {
                section.classList.toggle('collapsed');
                savedStates[sectionId] = section.classList.contains('collapsed');
                try {
                    localStorage.setItem(storageKey, JSON.stringify(savedStates));
                } catch (e) {
                    console.warn('Could not save section state:', e);
                }
            };

            title.addEventListener('click', toggleSection);
            title.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection();
                }
            });
        });
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
        if (window.authManager?.authenticated) {
            if (timeoutInput) timeoutInput.value = window.authManager.timeoutMinutes || 30;
            if (sessionStatusText) {
                sessionStatusText.textContent = `Active - ${window.authManager.timeoutMinutes} minute timeout`;
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
                
                if (!window.authManager?.authenticated) {
                    toastManager.show('You must be logged in to change this setting', 'warning');
                    return;
                }

                saveTimeoutBtn.disabled = true;
                saveTimeoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                const success = await window.authManager.setSessionTimeout(minutes);
                
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

    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        super.destroy();
    }
}