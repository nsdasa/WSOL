// =================================================================
// AUTHENTICATION MANAGER - Add to app.js
// Handles login/logout and session validation
// =================================================================

class AuthManager {
    constructor() {
        this.authenticated = false;
        this.checkingAuth = false;
        this.timeoutMinutes = 30;
    }
    
    async init() {
        // Setup login modal handlers
        const loginModal = document.getElementById('loginModal');
        const loginSubmitBtn = document.getElementById('loginSubmitBtn');
        const loginCancelBtn = document.getElementById('loginCancelBtn');
        const adminPassword = document.getElementById('adminPassword');
        
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
        
        // Check if already authenticated
        await this.checkSession();
        
        // Add logout button to header if authenticated
        if (this.authenticated) {
            this.addLogoutButton();
        }
    }
    
    async checkSession() {
        try {
            const response = await fetch('auth.php?action=check');
            const result = await response.json();
            
            this.authenticated = result.authenticated || false;
            
            if (this.authenticated) {
                this.timeoutMinutes = result.timeout_minutes || 30;
                this.addLogoutButton();
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
                resolve(true);
            } else {
                this.showLoginModal(moduleName, resolve, reject);
            }
        });
    }
    
    showLoginModal(moduleName, resolve, reject) {
        const modal = document.getElementById('loginModal');
        const passwordInput = document.getElementById('adminPassword');
        const errorDiv = document.getElementById('loginError');
        
        // Clear previous state
        passwordInput.value = '';
        errorDiv.classList.add('hidden');
        
        // Show modal
        modal.classList.remove('hidden');
        passwordInput.focus();
        
        // Store callbacks
        this.loginResolve = resolve;
        this.loginReject = reject;
        this.loginModuleName = moduleName;
    }
    
    async handleLogin() {
        const passwordInput = document.getElementById('adminPassword');
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.getElementById('loginSubmitBtn');
        
        const password = passwordInput.value;
        
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
            
            const response = await fetch('auth.php?action=login', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.authenticated = true;
                this.timeoutMinutes = result.timeout_minutes || 30;
                
                // Hide modal
                document.getElementById('loginModal').classList.add('hidden');
                
                // Add logout button
                this.addLogoutButton();
                
                // Resolve promise
                if (this.loginResolve) {
                    this.loginResolve(true);
                }
                
                toastManager?.show('Login successful!', 'success');
                debugLogger?.log(2, 'Admin authenticated successfully');
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
            this.removeLogoutButton();
            
            toastManager?.show('Logged out successfully', 'success');
            debugLogger?.log(2, 'Admin logged out');
            
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
}
