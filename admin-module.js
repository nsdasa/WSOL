// =================================================================
// ADMIN MODULE - Version 4.0
// November 2025 - Per-language card support
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
                                    <i class="fas fa-volume-up"></i> Audio Files (MP3/M4A)
                                    <span class="file-hint">Format: WordNum.lang.word.translation.mp3/m4a (e.g., 17.ceb.tilaw.taste.mp3)</span>
                                </label>
                                <input type="file" id="audioFilesInput" accept=".mp3,.m4a" multiple class="file-input">
                                <div class="file-status" id="audioFilesStatus">No files selected</div>
                            </div>
                        </div>
                        
                        <button id="uploadMediaBtn" class="btn btn-success btn-lg" disabled>
                            <i class="fas fa-cloud-upload-alt"></i> Upload Media Files
                        </button>
                        <p style="margin-top:12px;font-size:13px;color:var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> Upload CSVs first, then upload media files. The system will automatically match files to words.
                        </p>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-bug"></i> Debug Configuration</h3>
                    <div class="debug-config">
                        <div class="form-group">
                            <label class="form-label">Debug Level</label>
                            <div class="segmented-control">
                                <button class="segmented-option" data-level="1">
                                    <i class="fas fa-exclamation-circle"></i> Low
                                </button>
                                <button class="segmented-option active" data-level="2">
                                    <i class="fas fa-exclamation-triangle"></i> Medium
                                </button>
                                <button class="segmented-option" data-level="3">
                                    <i class="fas fa-info-circle"></i> High
                                </button>
                            </div>
                        </div>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="adminShowDebug" checked>
                            <label for="adminShowDebug">Show Debug Console</label>
                        </div>
                        
                        <button id="clearDebugBtn" class="btn btn-secondary">
                            <i class="fas fa-trash-alt"></i> Clear Debug Log
                        </button>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-clock"></i> Session Timeout</h3>
                    <div class="debug-config">
                        <div class="form-group">
                            <label class="form-label">Login Session Duration (minutes)</label>
                            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                <input type="number" id="sessionTimeoutInput" class="form-input" 
                                    style="width: 120px;" min="5" max="480" step="5" value="30">
                                <button id="saveTimeoutBtn" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Update Timeout
                                </button>
                            </div>
                            <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                                <i class="fas fa-info-circle"></i> 
                                Session expires after this many minutes of inactivity. 
                                Range: 5-480 minutes (5 min - 8 hours)
                            </p>
                        </div>
                        
                        <div id="currentSessionInfo" class="current-session-info">
                            <strong>Current Session:</strong>
                            <span id="sessionStatusText">Not logged in</span>
                        </div>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-terminal"></i> Debug Log</h3>
                    <div class="debug-log-container" id="adminDebugLog"></div>
                </div>
            </div>
        `;
    }

    async init() {
        this.updateStats();
        this.updateModuleStatus();
        this.setupDebugControls();
        this.setupSessionTimeout();
        this.setupCSVUpload();
        this.setupMediaUpload();
        this.setupAssetScanner();
        this.updateDebugLog();

        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 5000);

        // Show instructions (warning)
        if (instructionManager) {
            instructionManager.show(
                'admin',
                'Admin Panel',
                '***Unless you are the Admin... don\'t mess with this***'
            );
        }
    }

    updateStats() {
        const manifest = this.assets.manifest;
        
        // Handle v4.0 per-language cards structure
        let totalCards = 0;
        let totalAudio = 0;
        
        if (manifest?.stats) {
            totalCards = manifest.stats.totalCards || 0;
            totalAudio = manifest.stats.cardsWithAudio || 0;
        } else if (manifest?.cards) {
            // v4.0: cards is object with trigraph keys
            if (typeof manifest.cards === 'object' && !Array.isArray(manifest.cards)) {
                Object.values(manifest.cards).forEach(langCards => {
                    if (Array.isArray(langCards)) {
                        totalCards += langCards.length;
                        totalAudio += langCards.filter(c => c.hasAudio).length;
                    }
                });
            } else if (Array.isArray(manifest.cards)) {
                // v3.x fallback: cards is flat array
                totalCards = manifest.cards.length;
                totalAudio = manifest.cards.filter(c => c.hasAudio).length;
            }
        }
        
        const moduleCount = router?.routes ? Object.keys(router.routes).length : 0;
        
        document.getElementById('adminTotalCards').textContent = totalCards;
        document.getElementById('adminAudioCards').textContent = totalAudio;
        document.getElementById('adminModuleCount').textContent = moduleCount;
        
        // Show manifest version info
        const versionEl = document.getElementById('manifestVersion');
        const lastUpdatedEl = document.getElementById('manifestLastUpdated');
        
        if (versionEl && manifest) {
            versionEl.textContent = manifest.version || '3.x';
        }
        
        if (lastUpdatedEl && manifest?.lastUpdated) {
            const date = new Date(manifest.lastUpdated);
            lastUpdatedEl.textContent = date.toLocaleString();
        }
        
        // Show per-language stats for v4.0
        const langStatsContainer = document.getElementById('languageStatsContainer');
        if (langStatsContainer && manifest?.stats?.languageStats) {
            const langStats = manifest.stats.languageStats;
            let html = '<h4 style="margin:0 0 12px 0;font-size:14px;color:var(--text-primary);">Per-Language Breakdown:</h4>';
            
            Object.entries(langStats).forEach(([trigraph, stats]) => {
                const langName = this.assets.manifest?.languages?.find(l => l.trigraph === trigraph)?.name || trigraph.toUpperCase();
                const lessons = stats.lessons?.length || 0;
                html += `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
                        <span><strong>${langName}</strong></span>
                        <span>${stats.totalCards} cards, ${stats.cardsWithAudio} audio, ${lessons} lessons</span>
                    </div>
                `;
            });
            
            langStatsContainer.innerHTML = html;
        }
        
        // Update detail text
        const cardsDetail = document.getElementById('adminCardsDetail');
        const audioDetail = document.getElementById('adminAudioDetail');
        
        if (cardsDetail && manifest?.stats?.totalImages) {
            cardsDetail.textContent = `${manifest.stats.totalImages} images`;
        }
        
        if (audioDetail && manifest?.stats?.totalAudio) {
            audioDetail.textContent = `${manifest.stats.totalAudio} files`;
        }
    }

    updateModuleStatus() {
        const modules = [
            { name: 'Flashcards', key: 'flashcards', icon: 'fa-layer-group' },
            { name: 'Picture Match', key: 'match', icon: 'fa-link' },
            { name: 'Audio Match', key: 'match-sound', icon: 'fa-volume-up' },
            { name: 'Unsa Ni Quiz', key: 'quiz', icon: 'fa-question-circle' },
            { name: 'Deck Builder', key: 'deck-builder', icon: 'fa-edit' },
            { name: 'Print PDF', key: 'pdf', icon: 'fa-print' },
            { name: 'Admin Panel', key: 'admin', icon: 'fa-tools' }
        ];
        
        const container = document.getElementById('moduleStatus');
        if (!container) return;
        
        container.innerHTML = modules.map(module => {
            const isRegistered = router?.routes?.[module.key] !== undefined;
            const statusClass = isRegistered ? 'success' : 'error';
            const statusIcon = isRegistered ? 'fa-check-circle' : 'fa-times-circle';
            const statusText = isRegistered ? 'Functional' : 'Not Loaded';
            
            return `
                <div class="module-status-item ${statusClass}">
                    <div class="module-icon">
                        <i class="fas ${module.icon}"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-name">${module.name}</div>
                        <div class="module-status">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupDebugControls() {
        document.querySelectorAll('.segmented-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.segmented-option').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const level = parseInt(e.currentTarget.dataset.level);
                debugLogger.setLevel(level);
                toastManager.show(`Debug level set to ${['Low', 'Medium', 'High'][level-1]}`, 'success');
            });
        });
        
        const currentLevel = debugLogger?.level || 2;
        document.querySelectorAll('.segmented-option').forEach(btn => {
            if (parseInt(btn.dataset.level) === currentLevel) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        const showDebugCheckbox = document.getElementById('adminShowDebug');
        if (showDebugCheckbox) {
            showDebugCheckbox.addEventListener('change', (e) => {
                const debugConsole = document.getElementById('debugConsole');
                if (debugConsole) {
                    if (e.target.checked) {
                        debugConsole.classList.add('visible');
                    } else {
                        debugConsole.classList.remove('visible');
                    }
                }
            });
        }
        
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
        
        // Build per-language stats text
        let langStatsText = '';
        if (stats.languageStats) {
            Object.entries(stats.languageStats).forEach(([trigraph, ls]) => {
                const langName = this.assets.manifest?.languages?.find(l => l.trigraph === trigraph)?.name || trigraph.toUpperCase();
                langStatsText += `\n  ${langName}: ${ls.totalCards} cards, ${ls.cardsWithAudio} audio`;
            });
        }
        
        // Create a custom modal-style alert
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-primary);padding:30px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;max-width:500px;';
        
        alertDiv.innerHTML = `
            <h3 style="margin:0 0 20px 0;color:var(--text-primary);">? Processing Complete!</h3>
            <div style="background:var(--bg-secondary);padding:15px;border-radius:5px;margin-bottom:20px;white-space:pre-line;font-family:monospace;font-size:13px;color:var(--text-primary);">
                <strong>?? Statistics:</strong>
                  Total Cards: ${stats.totalCards || 0}
                  With Audio: ${stats.cardsWithAudio || 0}
                ${stats.totalPng ? `  PNG Files: ${stats.totalPng}` : ''}
                ${stats.totalGif ? `  GIF Files: ${stats.totalGif}` : ''}
                ${stats.totalAudio ? `  Audio Files: ${stats.totalAudio}` : ''}
                ${stats.totalImages ? `  Total Images: ${stats.totalImages}` : ''}
                ${langStatsText ? `\n<strong>Per-Language:</strong>${langStatsText}` : ''}
            </div>
            ${result.reportUrl ? `
                <div style="margin-bottom:15px;">
                    <a href="${result.reportUrl}" target="_blank" class="btn btn-primary" style="display:inline-block;text-decoration:none;">
                        <i class="fas fa-file-alt"></i> View Detailed Report
                    </a>
                </div>
            ` : ''}
            <button id="closeAlertBtn" class="btn btn-secondary">Close</button>
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
        
        // Also update the scan modal if it exists (v4.0 index.php)
        const scanModal = document.getElementById('scanModal');
        if (scanModal) {
            const totalCardsEl = document.getElementById('scanTotalCards');
            const withAudioEl = document.getElementById('scanWithAudio');
            const totalImagesEl = document.getElementById('scanTotalImages');
            const reportLink = document.getElementById('scanReportLink');
            
            if (totalCardsEl) totalCardsEl.textContent = stats.totalCards || 0;
            if (withAudioEl) withAudioEl.textContent = stats.cardsWithAudio || 0;
            if (totalImagesEl) totalImagesEl.textContent = stats.totalImages || stats.totalPng || 0;
            
            if (reportLink && result.reportUrl) {
                reportLink.href = result.reportUrl;
                reportLink.style.display = 'inline-block';
            }
        }
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