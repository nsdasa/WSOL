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
                    <h3 class="section-title"><i class="fas fa-sync-alt"></i> CSV Data Management</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Upload and process your Language List and Word List CSV files. In v4.0, each language has its own Word List file.
                        </p>
                        
                        <div class="csv-upload-section">
                            <div class="upload-options">
                                <label style="font-weight:600;margin-bottom:12px;display:block;color:var(--text-primary);">What do you want to update?</label>
                                <div class="radio-group">
                                    <label class="radio-option">
                                        <input type="radio" name="updateType" value="both" checked>
                                        <span>Both Lists (Language + Word)</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="updateType" value="language">
                                        <span>Language List Only</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="updateType" value="word">
                                        <span>Word Lists Only</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="file-upload-container" id="languageUploadContainer">
                                <label class="file-upload-label">
                                    <i class="fas fa-language"></i> Language List CSV
                                    <span class="file-hint">Expected: 3 columns (ID, Name, Trigraph)</span>
                                </label>
                                <input type="file" id="languageFileInput" accept=".csv" class="file-input">
                                <div class="file-status" id="languageFileStatus">No file selected</div>
                            </div>
                            
                            <div id="wordUploadContainer">
                                <label class="file-upload-label" style="margin-bottom:16px;">
                                    <i class="fas fa-list"></i> Word List CSVs (per language)
                                    <span class="file-hint">v4.0: Each language has its own word list file</span>
                                </label>
                                <div class="language-uploads" id="wordFileInputs">
                                    ${targetLanguages.map(lang => `
                                        <div class="file-upload-container word-file-row" data-trigraph="${lang.trigraph}">
                                            <label class="file-upload-label">
                                                <i class="fas fa-file-csv"></i> ${lang.name}
                                                <span class="file-hint">Word_List_${lang.name}.csv</span>
                                            </label>
                                            <input type="file" name="wordFile_${lang.trigraph}" accept=".csv" class="file-input">
                                            <div class="file-status">No file selected</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <button id="uploadProcessBtn" class="btn btn-primary btn-lg" disabled>
                            <i class="fas fa-upload"></i> Upload & Process
                        </button>
                        <button id="scanAssetsBtn" class="btn btn-secondary" style="margin-left:12px;">
                            <i class="fas fa-sync"></i> Rescan Assets Only
                        </button>
                        <p style="margin-top:12px;font-size:13px;color:var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> Upload CSVs first, then the system will scan for matching images/audio files
                        </p>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-photo-video"></i> Media Files Upload</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Upload image files (PNG/GIF) and audio files (MP3/M4A) for your words. Files must follow the naming convention.
                        </p>
                        
                        <div class="csv-upload-section">
                            <div class="file-upload-container">
                                <label class="file-upload-label">
                                    <i class="fas fa-images"></i> Image Files (PNG/GIF)
                                    <span class="file-hint">Format: WordNum.word.translation.png/gif (e.g., 17.tilaw.taste.png)</span>
                                </label>
                                <input type="file" id="imageFilesInput" accept=".png,.gif" multiple class="file-input">
                                <div class="file-status" id="imageFilesStatus">No files selected</div>
                            </div>
                            
                            <div class="file-upload-container">
                                <label class="file-upload-label">
                                    <i class="fas fa-music"></i> Audio Files (MP3/M4A)
                                    <span class="file-hint">Format: WordNum.trigraph.word.mp3/m4a (e.g., 17.ceb.tilaw.m4a)</span>
                                </label>
                                <input type="file" id="audioFilesInput" accept=".mp3,.m4a" multiple class="file-input">
                                <div class="file-status" id="audioFilesStatus">No files selected</div>
                            </div>
                        </div>
                        
                        <button id="uploadMediaBtn" class="btn btn-primary" disabled>
                            <i class="fas fa-cloud-upload-alt"></i> Upload Media Files
                        </button>
                    </div>
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
            </div>
        `;

        this.setupEventListeners();
        this.updateStats();
        this.checkModuleStatus();
        this.updateDebugLog();
    }

    setupEventListeners() {
        // Setup all sub-sections
        this.setupCSVUpload();
        this.setupAssetScanner();
        this.setupMediaUpload();
        this.setupDebugControls();
        this.setupSessionTimeout();
        
        // Close scan modal button
        const closeScanModal = document.getElementById('closeScanModal');
        if (closeScanModal) {
            closeScanModal.addEventListener('click', () => {
                document.getElementById('scanModal')?.classList.add('hidden');
            });
        }
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
        
        // Count cards with specific features
        const totalCards = cards.length;
        const cardsWithImages = cards.filter(c => c.printImagePath).length;
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

    setupCSVUpload() {
        const languageInput = document.getElementById('languageFileInput');
        const uploadBtn = document.getElementById('uploadProcessBtn');
        const languageStatus = document.getElementById('languageFileStatus');
        const languageContainer = document.getElementById('languageUploadContainer');
        const wordContainer = document.getElementById('wordUploadContainer');
        
        // Handle radio button changes
        document.querySelectorAll('input[name="updateType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const value = e.target.value;
                
                // Show/hide containers based on selection
                if (value === 'both') {
                    languageContainer.style.display = 'block';
                    wordContainer.style.display = 'block';
                } else if (value === 'language') {
                    languageContainer.style.display = 'block';
                    wordContainer.style.display = 'none';
                    this.wordFiles = {};
                    this.clearWordFileStatuses();
                } else if (value === 'word') {
                    languageContainer.style.display = 'none';
                    wordContainer.style.display = 'block';
                    this.languageFile = null;
                    if (languageStatus) {
                        languageStatus.textContent = 'No file selected';
                        languageStatus.style.color = 'var(--text-secondary)';
                    }
                }
                
                this.updateUploadButton();
            });
        });
        
        // Handle language file selection
        if (languageInput) {
            languageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.name.toLowerCase().endsWith('.csv')) {
                        toastManager.show('Please select a CSV file', 'error');
                        languageInput.value = '';
                        this.languageFile = null;
                        languageStatus.textContent = 'No file selected';
                        languageStatus.style.color = 'var(--text-secondary)';
                    } else {
                        this.languageFile = file;
                        languageStatus.textContent = `? ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                        languageStatus.style.color = 'var(--success)';
                        debugLogger?.log(3, `Language CSV selected: ${file.name}`);
                    }
                } else {
                    this.languageFile = null;
                    languageStatus.textContent = 'No file selected';
                    languageStatus.style.color = 'var(--text-secondary)';
                }
                this.updateUploadButton();
            });
        }
        
        // Handle per-language word file selections
        document.querySelectorAll('#wordFileInputs input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const row = e.target.closest('.word-file-row');
                const status = row.querySelector('.file-status');
                const trigraph = row.dataset.trigraph;
                
                if (file) {
                    if (!file.name.toLowerCase().endsWith('.csv')) {
                        toastManager.show('Please select a CSV file', 'error');
                        input.value = '';
                        delete this.wordFiles[trigraph];
                        status.textContent = 'No file selected';
                        status.style.color = 'var(--text-secondary)';
                    } else {
                        this.wordFiles[trigraph] = file;
                        status.textContent = `? ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                        status.style.color = 'var(--success)';
                        debugLogger?.log(3, `Word CSV selected for ${trigraph}: ${file.name}`);
                    }
                } else {
                    delete this.wordFiles[trigraph];
                    status.textContent = 'No file selected';
                    status.style.color = 'var(--text-secondary)';
                }
                this.updateUploadButton();
            });
        });
        
        // Handle upload button click
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadAndProcess());
        }
    }

    clearWordFileStatuses() {
        document.querySelectorAll('#wordFileInputs .word-file-row').forEach(row => {
            const status = row.querySelector('.file-status');
            const input = row.querySelector('input[type="file"]');
            if (status) {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            if (input) input.value = '';
        });
    }

    updateUploadButton() {
        const uploadBtn = document.getElementById('uploadProcessBtn');
        if (!uploadBtn) return;
        
        const updateType = document.querySelector('input[name="updateType"]:checked')?.value || 'both';
        
        let canUpload = false;
        
        if (updateType === 'both') {
            // Need language file AND at least one word file
            canUpload = this.languageFile && Object.keys(this.wordFiles).length > 0;
        } else if (updateType === 'language') {
            canUpload = this.languageFile !== null;
        } else if (updateType === 'word') {
            canUpload = Object.keys(this.wordFiles).length > 0;
        }
        
        uploadBtn.disabled = !canUpload;
    }

    async uploadAndProcess() {
        const uploadBtn = document.getElementById('uploadProcessBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading & Processing...';
        
        try {
            const formData = new FormData();
            
            // Add language file
            if (this.languageFile) {
                formData.append('languageFile', this.languageFile);
            }
            
            // Add per-language word files
            Object.entries(this.wordFiles).forEach(([trigraph, file]) => {
                formData.append(`wordFile_${trigraph}`, file);
            });
            
            // CACHE PREVENTION: Add timestamp and no-cache headers
            const timestamp = new Date().getTime();
            const response = await fetch(`scan-assets.php?action=upload&_=${timestamp}`, {
                method: 'POST',
                body: formData,
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show('CSV files uploaded and processed successfully!', 'success', 5000);
                this.showScanResults(result);
                await assetManager.loadManifest();
                this.updateStats();
                debugLogger?.log(2, `Upload complete: ${result.stats?.totalCards || 0} cards, ${result.stats?.cardsWithAudio || 0} with audio`);
            } else {
                toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
                debugLogger?.log(1, `Upload failed: ${result.error || result.message}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger?.log(1, `Upload error: ${err.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Process';
            
            // Clear file selections
            const languageInput = document.getElementById('languageFileInput');
            if (languageInput) languageInput.value = '';
            this.languageFile = null;
            const languageStatus = document.getElementById('languageFileStatus');
            if (languageStatus) {
                languageStatus.textContent = 'No file selected';
                languageStatus.style.color = 'var(--text-secondary)';
            }
            
            this.wordFiles = {};
            this.clearWordFileStatuses();
            this.updateUploadButton();
        }
    }

    setupAssetScanner() {
        const scanBtn = document.getElementById('scanAssetsBtn');
        if (!scanBtn) return;
        
        scanBtn.addEventListener('click', async () => {
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
            
            try {
                await this.triggerAssetScan();
            } finally {
                scanBtn.disabled = false;
                scanBtn.innerHTML = '<i class="fas fa-sync"></i> Rescan Assets Only';
            }
        });
    }

    async triggerAssetScan() {
        try {
            // CACHE PREVENTION: Add timestamp and no-cache headers
            const timestamp = new Date().getTime();
            const response = await fetch(`scan-assets.php?action=scan&_=${timestamp}`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show('Assets scanned! manifest.json updated.', 'success', 5000);
                this.showScanResults(result);
                await assetManager.loadManifest();
                this.updateStats();
                debugLogger?.log(2, `Scanned: ${result.stats?.totalCards || 0} cards, ${result.stats?.cardsWithAudio || 0} with audio`);
            } else {
                toastManager.show(`Scan failed: ${result.error || result.message}`, 'error', 5000);
                debugLogger?.log(1, `Scan failed: ${result.error || result.message}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger?.log(1, `Scan error: ${err.message}`);
        }
    }

    showScanResults(result) {
        const stats = result.stats || {};
        
        // Use the pre-built scan modal from index.php
        const scanModal = document.getElementById('scanModal');
        
        if (scanModal) {
            // Populate the modal with stats
            const totalCardsEl = document.getElementById('scanTotalCards');
            const withAudioEl = document.getElementById('scanWithAudio');
            const totalImagesEl = document.getElementById('scanTotalImages');
            const reportLink = document.getElementById('scanReportLink');
            
            if (totalCardsEl) totalCardsEl.textContent = stats.totalCards || 0;
            if (withAudioEl) withAudioEl.textContent = stats.cardsWithAudio || 0;
            if (totalImagesEl) totalImagesEl.textContent = stats.totalImages || stats.totalPng || 0;
            
            if (reportLink && result.reportUrl) {
                reportLink.href = result.reportUrl;
                reportLink.style.display = 'inline-flex';
            }
            
            // Show the modal
            scanModal.classList.remove('hidden');
        } else {
            // Fallback: Create a styled modal if the pre-built one doesn't exist
            this.showFallbackScanModal(result, stats);
        }
    }

    showFallbackScanModal(result, stats) {
        // Build per-language stats HTML
        let langStatsHtml = '';
        if (stats.languageStats) {
            langStatsHtml = '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);">';
            langStatsHtml += '<h4 style="margin:0 0 12px 0;font-size:14px;color:var(--text-secondary);"><i class="fas fa-globe"></i> Per-Language Breakdown</h4>';
            Object.entries(stats.languageStats).forEach(([trigraph, ls]) => {
                const langName = this.assets.manifest?.languages?.find(l => l.trigraph === trigraph)?.name || trigraph.toUpperCase();
                langStatsHtml += `
                    <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg-primary);border-radius:4px;margin-bottom:6px;">
                        <span style="font-weight:600;color:var(--text-primary);">${langName}</span>
                        <span style="color:var(--text-secondary);">${ls.totalCards} cards, ${ls.cardsWithAudio} with audio</span>
                    </div>
                `;
            });
            langStatsHtml += '</div>';
        }
        
        // Create modal HTML
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-primary);padding:0;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:10000;max-width:500px;width:90%;overflow:hidden;';
        
        alertDiv.innerHTML = `
            <div style="background:linear-gradient(135deg, #4CAF50, #45a049);padding:20px 24px;color:white;">
                <h3 style="margin:0;display:flex;align-items:center;gap:10px;font-size:20px;">
                    <i class="fas fa-check-circle"></i> Processing Complete!
                </h3>
            </div>
            <div style="padding:24px;">
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:16px;">
                    <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:28px;font-weight:700;color:var(--primary);">${stats.totalCards || 0}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Total Cards</div>
                    </div>
                    <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:28px;font-weight:700;color:var(--success);">${stats.cardsWithAudio || 0}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">With Audio</div>
                    </div>
                    <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:28px;font-weight:700;color:var(--warning);">${stats.totalImages || stats.totalPng || 0}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Images</div>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:16px;">
                    <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:18px;font-weight:600;color:var(--text-primary);">${stats.totalPng || 0}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">PNG Files</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:18px;font-weight:600;color:var(--text-primary);">${stats.totalGif || 0}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">GIF Files</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                        <div style="font-size:18px;font-weight:600;color:var(--text-primary);">${stats.totalAudio || 0}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">Audio Files</div>
                    </div>
                </div>
                
                ${langStatsHtml}
                
                <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
                    ${result.reportUrl ? `
                        <a href="${result.reportUrl}" target="_blank" class="btn btn-primary" style="flex:1;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;">
                            <i class="fas fa-file-alt"></i> View Detailed Report
                        </a>
                    ` : ''}
                    <button id="closeAlertBtn" class="btn btn-secondary" style="flex:1;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';
        
        document.body.appendChild(overlay);
        document.body.appendChild(alertDiv);
        
        const closeBtn = document.getElementById('closeAlertBtn');
        const closeAlert = () => {
            document.body.removeChild(alertDiv);
            document.body.removeChild(overlay);
        };
        
        closeBtn.addEventListener('click', closeAlert);
        overlay.addEventListener('click', closeAlert);
    }

    setupMediaUpload() {
        const imageInput = document.getElementById('imageFilesInput');
        const audioInput = document.getElementById('audioFilesInput');
        const uploadBtn = document.getElementById('uploadMediaBtn');
        
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.imageFiles = Array.from(e.target.files);
                const status = document.getElementById('imageFilesStatus');
                if (this.imageFiles.length > 0) {
                    status.textContent = `${this.imageFiles.length} file(s) selected`;
                    status.style.color = 'var(--success)';
                } else {
                    status.textContent = 'No files selected';
                    status.style.color = 'var(--text-secondary)';
                }
                this.updateMediaUploadButton();
            });
        }
        
        if (audioInput) {
            audioInput.addEventListener('change', (e) => {
                this.audioFiles = Array.from(e.target.files);
                const status = document.getElementById('audioFilesStatus');
                if (this.audioFiles.length > 0) {
                    status.textContent = `${this.audioFiles.length} file(s) selected`;
                    status.style.color = 'var(--success)';
                } else {
                    status.textContent = 'No files selected';
                    status.style.color = 'var(--text-secondary)';
                }
                this.updateMediaUploadButton();
            });
        }
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadMediaFiles());
        }
    }

    updateMediaUploadButton() {
        const uploadBtn = document.getElementById('uploadMediaBtn');
        if (uploadBtn) {
            uploadBtn.disabled = this.imageFiles.length === 0 && this.audioFiles.length === 0;
        }
    }

    async uploadMediaFiles() {
        const uploadBtn = document.getElementById('uploadMediaBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        try {
            const formData = new FormData();
            
            // Add image files
            this.imageFiles.forEach(file => {
                formData.append('imageFiles[]', file);
            });
            
            // Add audio files
            this.audioFiles.forEach(file => {
                formData.append('audioFiles[]', file);
            });
            
            // CACHE PREVENTION: Add timestamp and no-cache headers
            const timestamp = new Date().getTime();
            const response = await fetch(`scan-assets.php?action=uploadMedia&_=${timestamp}`, {
                method: 'POST',
                body: formData,
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show(
                    `Media uploaded! ${result.stats?.imagesUploaded || 0} images, ${result.stats?.audioUploaded || 0} audio files. Processing...`, 
                    'success', 
                    5000
                );
                
                // Automatically trigger asset scan after upload
                await this.triggerAssetScan();
                
                debugLogger?.log(2, `Media upload: ${result.stats?.imagesUploaded || 0} images, ${result.stats?.audioUploaded || 0} audio`);
            } else {
                toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
                debugLogger?.log(1, `Media upload failed: ${result.error || result.message}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger?.log(1, `Media upload error: ${err.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Media Files';
            
            // Clear file selections
            const imageInput = document.getElementById('imageFilesInput');
            const audioInput = document.getElementById('audioFilesInput');
            if (imageInput) imageInput.value = '';
            if (audioInput) audioInput.value = '';
            this.imageFiles = [];
            this.audioFiles = [];
            
            const imageStatus = document.getElementById('imageFilesStatus');
            const audioStatus = document.getElementById('audioFilesStatus');
            if (imageStatus) {
                imageStatus.textContent = 'No files selected';
                imageStatus.style.color = 'var(--text-secondary)';
            }
            if (audioStatus) {
                audioStatus.textContent = 'No files selected';
                audioStatus.style.color = 'var(--text-secondary)';
            }
            this.updateMediaUploadButton();
        }
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