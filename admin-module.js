class AdminModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.languageFile = null;
        this.wordFile = null;
        this.imageFiles = [];
        this.audioFiles = [];
    }
    
    async render() {
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
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-images"></i></div>
                            <div class="stat-value" id="adminTotalCards">0</div>
                            <div class="stat-label">Cards Loaded</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-volume-up"></i></div>
                            <div class="stat-value" id="adminAudioCards">0</div>
                            <div class="stat-label">With Audio</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-gamepad"></i></div>
                            <div class="stat-value" id="adminModuleCount">0</div>
                            <div class="stat-label">Active Modules</div>
                        </div>
                    </div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-puzzle-piece"></i> Module Health Check</h3>
                    <div id="moduleStatus" class="module-status-grid"></div>
                </div>

                <div class="admin-section">
                    <h3 class="section-title"><i class="fas fa-sync-alt"></i> CSV Data Management</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Upload and process your Language List and/or Word List CSV files. The system will validate the format and update the manifest.
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
                                        <span>Word List Only</span>
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
                            
                            <div class="file-upload-container" id="wordUploadContainer">
                                <label class="file-upload-label">
                                    <i class="fas fa-list"></i> Word List CSV
                                    <span class="file-hint">Expected: 16 columns (Lesson → Type)</span>
                                </label>
                                <input type="file" id="wordFileInput" accept=".csv" class="file-input">
                                <div class="file-status" id="wordFileStatus">No file selected</div>
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
                            Upload image files (PNG/GIF) and audio files (MP3) for your words. Files must follow the naming convention.
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
        const totalCards = this.assets.cards.length;
        const audioCards = this.assets.cards.filter(c => c.hasAudio).length;
        const moduleCount = Object.keys(router.routes).length;
        
        document.getElementById('adminTotalCards').textContent = totalCards;
        document.getElementById('adminAudioCards').textContent = audioCards;
        document.getElementById('adminModuleCount').textContent = moduleCount;
    }
    
    updateModuleStatus() {
        const modules = [
            { name: 'Flashcards', key: 'flashcards', icon: 'fa-layer-group' },
            { name: 'Picture Match', key: 'match', icon: 'fa-link' },
            { name: 'Audio Match', key: 'match-sound', icon: 'fa-volume-up' },
            { name: 'Unsa Ni Quiz', key: 'quiz', icon: 'fa-question-circle' },
            { name: 'Admin Panel', key: 'admin', icon: 'fa-tools' }
        ];
        
        const container = document.getElementById('moduleStatus');
        container.innerHTML = modules.map(module => {
            const isRegistered = router.routes[module.key] !== undefined;
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
        
        const currentLevel = debugLogger.level;
        document.querySelectorAll('.segmented-option').forEach(btn => {
            if (parseInt(btn.dataset.level) === currentLevel) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        document.getElementById('adminShowDebug').addEventListener('change', (e) => {
            const debugConsole = document.getElementById('debugConsole');
            if (e.target.checked) {
                debugConsole.classList.add('visible');
            } else {
                debugConsole.classList.remove('visible');
            }
        });
        
        document.getElementById('clearDebugBtn').addEventListener('click', () => {
            debugLogger.clear();
            this.updateDebugLog();
            toastManager.show('Debug log cleared', 'success');
        });
    }
    
    setupCSVUpload() {
        const languageInput = document.getElementById('languageFileInput');
        const wordInput = document.getElementById('wordFileInput');
        const uploadBtn = document.getElementById('uploadProcessBtn');
        const languageStatus = document.getElementById('languageFileStatus');
        const wordStatus = document.getElementById('wordFileStatus');
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
                    this.wordFile = null;
                    wordStatus.textContent = 'No file selected';
                } else if (value === 'word') {
                    languageContainer.style.display = 'none';
                    wordContainer.style.display = 'block';
                    this.languageFile = null;
                    languageStatus.textContent = 'No file selected';
                }
                
                this.updateUploadButton();
            });
        });
        
        // Handle file selections
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
                    languageStatus.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    languageStatus.style.color = 'var(--success)';
                    debugLogger.log(3, `Language CSV selected: ${file.name}`);
                }
            } else {
                this.languageFile = null;
                languageStatus.textContent = 'No file selected';
                languageStatus.style.color = 'var(--text-secondary)';
            }
            this.updateUploadButton();
        });
        
        wordInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.name.toLowerCase().endsWith('.csv')) {
                    toastManager.show('Please select a CSV file', 'error');
                    wordInput.value = '';
                    this.wordFile = null;
                    wordStatus.textContent = 'No file selected';
                    wordStatus.style.color = 'var(--text-secondary)';
                } else {
                    this.wordFile = file;
                    wordStatus.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    wordStatus.style.color = 'var(--success)';
                    debugLogger.log(3, `Word CSV selected: ${file.name}`);
                }
            } else {
                this.wordFile = null;
                wordStatus.textContent = 'No file selected';
                wordStatus.style.color = 'var(--text-secondary)';
            }
            this.updateUploadButton();
        });
        
        // Handle upload button click
        uploadBtn.addEventListener('click', () => this.uploadAndProcess());
    }
    
    updateUploadButton() {
        const uploadBtn = document.getElementById('uploadProcessBtn');
        const updateType = document.querySelector('input[name="updateType"]:checked').value;
        
        let canUpload = false;
        
        if (updateType === 'both') {
            canUpload = this.languageFile && this.wordFile;
        } else if (updateType === 'language') {
            canUpload = this.languageFile;
        } else if (updateType === 'word') {
            canUpload = this.wordFile;
        }
        
        uploadBtn.disabled = !canUpload;
    }
    
    async uploadAndProcess() {
        const uploadBtn = document.getElementById('uploadProcessBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading & Processing...';
        
        try {
            const formData = new FormData();
            
            if (this.languageFile) {
                formData.append('languageFile', this.languageFile);
            }
            
            if (this.wordFile) {
                formData.append('wordFile', this.wordFile);
            }
            
            const response = await fetch('scan-assets.php?action=upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show('CSV files uploaded and processed successfully!', 'success', 5000);
                this.showScanResults(result);
                await assetManager.loadManifest();
                this.updateStats();
                debugLogger.log(2, `Upload complete: ${result.stats.totalCards} cards, ${result.stats.cardsWithAudio} with audio`);
            } else {
                toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
                debugLogger.log(1, `Upload failed: ${result.error || result.message}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger.log(1, `Upload error: ${err.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Process';
            
            // Clear file selections
            document.getElementById('languageFileInput').value = '';
            document.getElementById('wordFileInput').value = '';
            this.languageFile = null;
            this.wordFile = null;
            document.getElementById('languageFileStatus').textContent = 'No file selected';
            document.getElementById('wordFileStatus').textContent = 'No file selected';
            document.getElementById('languageFileStatus').style.color = 'var(--text-secondary)';
            document.getElementById('wordFileStatus').style.color = 'var(--text-secondary)';
            this.updateUploadButton();
        }
    }
    
    setupAssetScanner() {
        document.getElementById('scanAssetsBtn').addEventListener('click', async () => {
            const btn = document.getElementById('scanAssetsBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
            
            try {
                const response = await fetch('scan-assets.php?action=scan');
                const result = await response.json();
                
                if (result.success) {
                    toastManager.show('Assets scanned! manifest.json updated.', 'success', 5000);
                    this.updateStats();
                    this.showScanResults(result);
                    await assetManager.loadManifest();
                    debugLogger.log(2, `Scanned: ${result.stats.totalCards} cards, ${result.stats.cardsWithAudio} with audio`);
                } else {
                    toastManager.show(`Scan failed: ${result.error || result.message}`, 'error', 5000);
                    debugLogger.log(1, `Scan failed: ${result.error || result.message}`);
                }
            } catch (err) {
                toastManager.show(`Error: ${err.message}`, 'error', 5000);
                debugLogger.log(1, `Scan error: ${err.message}`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync"></i> Rescan Assets Only';
            }
        });
    }
    
    showScanResults(result) {
        const gifInfo = result.stats.totalGif > 0 ? `\n- GIF Files: ${result.stats.totalGif}` : '';
        const pngInfo = result.stats.totalPng > 0 ? `\n- PNG Files: ${result.stats.totalPng}` : '';
        const issuesText = result.issues.length > 0 ? `\n⚠️ Issues: ${result.issues.length}` : '\n✅ No issues';
        
        let message = `✅ Scan Complete!\n\n📊 Stats:\n- Cards: ${result.stats.totalCards}\n- With Audio: ${result.stats.cardsWithAudio}${pngInfo}${gifInfo}\n- Audio Files: ${result.stats.totalAudio}${issuesText}`;
        
        if (result.reportUrl) {
            message += '\n\n📄 Detailed report generated!';
        }
        
        // Create a custom modal-style alert with download button
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-primary);padding:30px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;max-width:500px;';
        
        alertDiv.innerHTML = `
            <h3 style="margin:0 0 20px 0;color:var(--text-primary);">✅ Processing Complete!</h3>
            <div style="background:var(--bg-secondary);padding:15px;border-radius:5px;margin-bottom:20px;white-space:pre-line;font-family:monospace;font-size:13px;color:var(--text-primary);">
                <strong>📊 Statistics:</strong>
                • Cards: ${result.stats.totalCards}
                • With Audio: ${result.stats.cardsWithAudio}
                ${result.stats.totalPng ? `• PNG Files: ${result.stats.totalPng}` : ''}
                ${result.stats.totalGif ? `• GIF Files: ${result.stats.totalGif}` : ''}
                • Audio Files: ${result.stats.totalAudio}
                ${result.issues.length > 0 ? `\n⚠️ Issues: ${result.issues.length}` : '\n✅ No issues found'}
            </div>
            ${result.reportUrl ? `
                <div style="margin-bottom:15px;">
                    <a href="${result.reportUrl}" target="_blank" class="btn btn-primary" style="display:inline-block;text-decoration:none;">
                        <i class="fas fa-download"></i> View Detailed Report
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
        
        if (result.issues.length > 0) {
            debugLogger.log(2, '=== Scan Issues ===');
            result.issues.forEach(issue => {
                debugLogger.log(issue.type === 'error' ? 1 : 2, `${issue.file}: ${issue.message}`);
            });
        }
    }
    
    updateDebugLog() {
        const logContainer = document.getElementById('adminDebugLog');
        const debugLog = document.getElementById('debugLog');
        
        if (debugLog) {
            logContainer.innerHTML = debugLog.innerHTML || '<div style="color:var(--text-secondary);text-align:center;padding:24px;">No debug messages yet</div>';
        }
        
        setTimeout(() => {
            if (router.currentModule instanceof AdminModule) {
                this.updateDebugLog();
            }
        }, 2000);
    }
    
    setupMediaUpload() {
        const imageInput = document.getElementById('imageFilesInput');
        const audioInput = document.getElementById('audioFilesInput');
        const uploadBtn = document.getElementById('uploadMediaBtn');
        
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
        
        uploadBtn.addEventListener('click', () => this.uploadMediaFiles());
    }
    
    updateMediaUploadButton() {
        const uploadBtn = document.getElementById('uploadMediaBtn');
        uploadBtn.disabled = this.imageFiles.length === 0 && this.audioFiles.length === 0;
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
            
            const response = await fetch('scan-assets.php?action=uploadMedia', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                toastManager.show(
                    `Media uploaded! ${result.stats.imagesUploaded} images, ${result.stats.audioUploaded} audio files. Processing...`, 
                    'success', 
                    5000
                );
                
                // Automatically trigger asset scan after upload
                await this.triggerAssetScan();
                
                debugLogger.log(2, `Media upload: ${result.stats.imagesUploaded} images, ${result.stats.audioUploaded} audio`);
            } else {
                toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
                debugLogger.log(1, `Media upload failed: ${result.error || result.message}`);
            }
        } catch (err) {
            toastManager.show(`Error: ${err.message}`, 'error', 5000);
            debugLogger.log(1, `Media upload error: ${err.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Media Files';
            
            // Clear file selections
            document.getElementById('imageFilesInput').value = '';
            document.getElementById('audioFilesInput').value = '';
            this.imageFiles = [];
            this.audioFiles = [];
            document.getElementById('imageFilesStatus').textContent = 'No files selected';
            document.getElementById('audioFilesStatus').textContent = 'No files selected';
            document.getElementById('imageFilesStatus').style.color = 'var(--text-secondary)';
            document.getElementById('audioFilesStatus').style.color = 'var(--text-secondary)';
            this.updateMediaUploadButton();
        }
    }
    
    async triggerAssetScan() {
        try {
            const response = await fetch('scan-assets.php?action=scan');
            const result = await response.json();
            
            if (result.success) {
                this.showScanResults(result);
                await assetManager.loadManifest();
                this.updateStats();
                debugLogger.log(2, `Auto-scan complete: ${result.stats.totalCards} cards, ${result.stats.cardsWithAudio} with audio`);
            }
        } catch (err) {
            debugLogger.log(1, `Auto-scan error: ${err.message}`);
        }
    }
    
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        super.destroy();
    }
}
