// =================================================================
// AUTHENTICATION MANAGER - Add to app.js
// Handles login/logout and session validation
// =================================================================

class AuthManager {
    constructor() {
        this.authenticated = false;
        this.checkingAuth = false;
        this.timeoutMinutes = 30;
        this.role = null; // 'admin', 'deck-manager', 'editor', or 'voice-recorder'
        this.language = null; // Language restriction: 'ceb', 'mrw', 'sin', or null (all languages)
    }
    
    async init() {
        // Setup login modal handlers
        const loginModal = document.getElementById('loginModal');
        const loginSubmitBtn = document.getElementById('loginSubmitBtn');
        const loginCancelBtn = document.getElementById('loginCancelBtn');
        const adminPassword = document.getElementById('adminPassword');
        const loginBtn = document.getElementById('loginBtn');

        if (loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', () => this.handleLogin());
        }

        if (loginCancelBtn) {
            loginCancelBtn.addEventListener('click', () => this.cancelLogin());
        }

        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        // Setup login button in header
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModalDirect());
        }

        // Check if already authenticated
        await this.checkSession();

        // Update UI based on authentication state
        if (this.authenticated) {
            this.addLogoutButton();
            this.updateUIForRole();
            this.hideLoginButton();
        } else {
            this.showLoginButton();
        }
    }
    
    async checkSession() {
        try {
            const response = await fetch('auth.php?action=check');
            const result = await response.json();

            this.authenticated = result.authenticated || false;

            if (this.authenticated) {
                this.timeoutMinutes = result.timeout_minutes || 30;
                this.role = result.role || 'admin';
                this.language = result.language || null; // Language restriction
                this.addLogoutButton();
            } else {
                this.role = null;
                this.language = null;
            }

            return this.authenticated;
        } catch (err) {
            debugLogger?.log(1, `Auth check error: ${err.message}`);
            return false;
        }
    }
    
    requireAuth(moduleName) {
        // Only require auth for admin and deck-builder modules
        const protectedModules = ['admin', 'deck-builder'];

        if (!protectedModules.includes(moduleName)) {
            return Promise.resolve(true);
        }

        return new Promise(async (resolve, reject) => {
            const isAuth = await this.checkSession();

            if (isAuth) {
                // Check if deck-manager is trying to access admin module
                if (moduleName === 'admin' && this.role === 'deck-manager') {
                    toastManager?.show('Access denied: Deck Managers cannot access the Admin module', 'error');
                    reject('Access denied to admin module');
                    return;
                }
                resolve(true);
            } else {
                this.showLoginModal(moduleName, resolve, reject);
            }
        });
    }
    
    showLoginModal(moduleName, resolve, reject) {
        const modal = document.getElementById('loginModal');
        const passwordInput = document.getElementById('adminPassword');
        const roleSelect = document.getElementById('loginRole');
        const errorDiv = document.getElementById('loginError');

        // Clear previous state
        passwordInput.value = '';
        if (roleSelect) roleSelect.value = 'admin';
        errorDiv.classList.add('hidden');

        // Show modal
        modal.classList.remove('hidden');
        passwordInput.focus();

        // Store callbacks
        this.loginResolve = resolve;
        this.loginReject = reject;
        this.loginModuleName = moduleName;
        this.isDirectLogin = false;
    }

    /**
     * Show login modal directly (from login button click)
     * No module access required
     */
    showLoginModalDirect() {
        const modal = document.getElementById('loginModal');
        const passwordInput = document.getElementById('adminPassword');
        const roleSelect = document.getElementById('loginRole');
        const errorDiv = document.getElementById('loginError');

        // Clear previous state
        passwordInput.value = '';
        if (roleSelect) roleSelect.value = 'admin';
        errorDiv.classList.add('hidden');

        // Show modal
        modal.classList.remove('hidden');
        passwordInput.focus();

        // Clear any previous callbacks
        this.loginResolve = null;
        this.loginReject = null;
        this.loginModuleName = null;
        this.isDirectLogin = true;
    }
    
    async handleLogin() {
        const passwordInput = document.getElementById('adminPassword');
        const roleSelect = document.getElementById('loginRole');
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.getElementById('loginSubmitBtn');

        const password = passwordInput.value;
        const selectedRole = roleSelect ? roleSelect.value : 'admin';

        if (!password) {
            errorDiv.textContent = 'Please enter a password';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        try {
            const formData = new FormData();
            formData.append('password', password);
            formData.append('role', selectedRole);

            const response = await fetch('auth.php?action=login', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.authenticated = true;
                this.timeoutMinutes = result.timeout_minutes || 30;
                this.role = result.role || 'admin';
                this.language = result.language || null; // Language restriction

                // Hide modal
                document.getElementById('loginModal').classList.add('hidden');

                // Add logout button and hide login button
                this.addLogoutButton();
                this.hideLoginButton();

                // Update UI based on role
                this.updateUIForRole();

                // Resolve promise if this was a module access request
                if (this.loginResolve) {
                    this.loginResolve(true);
                }

                const roleDisplay = this.role === 'admin' ? 'Admin' :
                                   this.role === 'deck-manager' ? 'Deck Manager' :
                                   this.role === 'editor' ? 'Editor' :
                                   'Voice Recorder';
                const langDisplay = this.language ? ` (${this.getLanguageName(this.language)})` : '';
                toastManager?.show(`Login successful! Role: ${roleDisplay}${langDisplay}`, 'success');
                debugLogger?.log(2, `Authenticated as ${this.role}${this.language ? ' for ' + this.language : ''}`);
            } else {
                errorDiv.textContent = result.error || 'Login failed';
                errorDiv.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (err) {
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.classList.remove('hidden');
            debugLogger?.log(1, `Login error: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
    
    cancelLogin() {
        document.getElementById('loginModal').classList.add('hidden');
        
        if (this.loginReject) {
            this.loginReject('Login cancelled');
        }
        
        // Navigate back to flashcards
        router?.navigate('flashcards');
    }
    
    async logout() {
        try {
            await fetch('auth.php?action=logout');

            this.authenticated = false;
            this.role = null;
            this.language = null;
            this.removeLogoutButton();
            this.showLoginButton();

            // Hide protected tabs after logout
            this.hideProtectedTabs();

            toastManager?.show('Logged out successfully', 'success');
            debugLogger?.log(2, 'User logged out');

            // Navigate to flashcards if on protected module
            const currentModule = window.location.hash.slice(1) || 'flashcards';
            if (['admin', 'deck-builder'].includes(currentModule)) {
                router?.navigate('flashcards');
            }
        } catch (err) {
            debugLogger?.log(1, `Logout error: ${err.message}`);
        }
    }
    
    addLogoutButton() {
        // Check if button already exists
        if (document.getElementById('logoutBtn')) return;
        
        const headerControls = document.querySelector('.header-controls');
        if (!headerControls) return;
        
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'btn btn-secondary';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.style.marginLeft = '12px';
        
        logoutBtn.addEventListener('click', () => this.logout());
        
        headerControls.appendChild(logoutBtn);
    }
    
    removeLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.remove();
        }
    }

    /**
     * Hide login button (when user is logged in)
     */
    hideLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.classList.add('hidden');
        }
    }

    /**
     * Show login button (when user is logged out)
     */
    showLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.classList.remove('hidden');
        }
    }
    
    async setSessionTimeout(minutes) {
        try {
            const formData = new FormData();
            formData.append('minutes', minutes);
            
            const response = await fetch('auth.php?action=setTimeout', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.timeoutMinutes = result.timeout_minutes;
                toastManager?.show(`Session timeout set to ${minutes} minutes`, 'success');
                debugLogger?.log(2, `Session timeout updated to ${minutes} minutes`);
                return true;
            } else {
                toastManager?.show(result.error || 'Failed to update timeout', 'error');
                return false;
            }
        } catch (err) {
            debugLogger?.log(1, `Set timeout error: ${err.message}`);
            toastManager?.show('Error updating session timeout', 'error');
            return false;
        }
    }
    
    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.authenticated && this.role === 'admin';
    }

    /**
     * Check if current user is deck manager
     */
    isDeckManager() {
        return this.authenticated && this.role === 'deck-manager';
    }

    /**
     * Check if current user is editor
     */
    isEditor() {
        return this.authenticated && this.role === 'editor';
    }

    /**
     * Check if current user is voice recorder
     */
    isVoiceRecorder() {
        return this.authenticated && this.role === 'voice-recorder';
    }

    /**
     * Check if user has permission for a specific action
     * Roles hierarchy: admin > deck-manager > editor > voice-recorder
     *
     * Admin: Everything (all modules, all features)
     * Deck Manager: Full deck builder (all sections + table with CRUD), no admin module
     * Editor: Table only with full CRUD (no tool sections like CSV, Media, Sentence, Grammar)
     * Voice Recorder: Table only, limited columns, read-only (can only record/upload audio)
     */
    hasPermission(action) {
        if (!this.authenticated) return false;
        if (this.role === 'admin') return true;

        // Deck Manager has full deck builder permissions (all sections + table CRUD)
        if (this.role === 'deck-manager') {
            const deckManagerAllowed = [
                'view',
                'filter',
                'audio-upload',
                'audio-record',
                'audio-select',
                'edit',
                'create',
                'delete',
                'save',
                'export',
                'csv-tools',
                'media-tools',
                'sentence-tools',
                'grammar-tools'
            ];
            return deckManagerAllowed.includes(action);
        }

        // Editor: Table only with full CRUD (no tool sections)
        if (this.role === 'editor') {
            const editorAllowed = [
                'view',
                'filter',
                'audio-upload',
                'audio-record',
                'audio-select',
                'edit',
                'create',
                'delete',
                'save',
                'export'
                // Note: NO csv-tools, media-tools, sentence-tools, grammar-tools
            ];
            return editorAllowed.includes(action);
        }

        // Voice Recorder: limited view, can only record/upload audio
        const voiceRecorderAllowed = [
            'view',
            'filter',
            'audio-upload',
            'audio-record',
            'audio-select'
            // Note: NO edit, create, delete, save permissions
        ];

        return voiceRecorderAllowed.includes(action);
    }

    /**
     * Update UI elements based on user role
     * Shows/hides admin and deck-builder tabs based on authentication and role
     * - Admin: sees both Admin and Deck Builder tabs
     * - Deck Manager: sees only Deck Builder tab (full functionality)
     * - Editor: sees only Deck Builder tab (table only with CRUD)
     * - Voice Recorder: sees only Deck Builder tab (limited functionality)
     * - Not authenticated: sees neither tab
     */
    updateUIForRole() {
        const adminTab = document.querySelector('.nav-tab[data-module="admin"]');
        const deckBuilderTab = document.querySelector('.nav-tab[data-module="deck-builder"]');

        if (!this.authenticated) {
            // Hide both tabs when not authenticated
            if (adminTab) {
                adminTab.classList.add('hidden');
            }
            if (deckBuilderTab) {
                deckBuilderTab.classList.add('hidden');
            }
            return;
        }

        // Show tabs based on role
        if (this.role === 'admin') {
            // Admin sees both tabs
            if (adminTab) {
                adminTab.classList.remove('hidden');
            }
            if (deckBuilderTab) {
                deckBuilderTab.classList.remove('hidden');
            }
        } else if (this.role === 'deck-manager' || this.role === 'editor' || this.role === 'voice-recorder') {
            // Deck Manager, Editor, and Voice Recorder see only Deck Builder tab
            if (adminTab) {
                adminTab.classList.add('hidden');
            }
            if (deckBuilderTab) {
                deckBuilderTab.classList.remove('hidden');
            }
        }
    }

    /**
     * Hide protected tabs (called on logout or when not authenticated)
     */
    hideProtectedTabs() {
        const adminTab = document.querySelector('.nav-tab[data-module="admin"]');
        const deckBuilderTab = document.querySelector('.nav-tab[data-module="deck-builder"]');

        if (adminTab) {
            adminTab.classList.add('hidden');
        }
        if (deckBuilderTab) {
            deckBuilderTab.classList.add('hidden');
        }
    }

    /**
     * Get the display name for a language trigraph
     */
    getLanguageName(trigraph) {
        const names = {
            'ceb': 'Cebuano',
            'mrw': 'Maranao',
            'sin': 'Sinama'
        };
        return names[trigraph] || trigraph;
    }

    /**
     * Check if user is restricted to a specific language
     * Returns the language trigraph if restricted, null if no restriction
     */
    getLanguageRestriction() {
        // Admin and Deck Manager have no language restriction
        if (this.role === 'admin' || this.role === 'deck-manager') {
            return null;
        }
        // Editor and Voice Recorder are restricted to their assigned language
        return this.language;
    }

    /**
     * Check if user can access a specific language
     */
    canAccessLanguage(trigraph) {
        const restriction = this.getLanguageRestriction();
        // No restriction means access to all languages
        if (restriction === null) return true;
        // Otherwise, check if it matches the user's assigned language
        return restriction === trigraph;
    }
}
