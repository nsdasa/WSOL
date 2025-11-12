class AdminModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
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
                    <h3 class="section-title"><i class="fas fa-sync-alt"></i> Asset Management</h3>
                    <div class="card" style="background:var(--bg-secondary);">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            Scan the assets folder on your web server to automatically update manifest.json. 
                            Click this button whenever you upload new images or audio files.
                        </p>
                        <button id="scanAssetsBtn" class="btn btn-primary btn-lg">
                            <i class="fas fa-search"></i> Scan Assets Folder
                        </button>
                        <p style="margin-top:12px;font-size:13px;color:var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> Scans assets/ folder on the server and updates manifest.json automatically
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
                btn.innerHTML = '<i class="fas fa-search"></i> Scan Assets Folder';
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
            <h3 style="margin:0 0 20px 0;color:var(--text-primary);">✅ Scan Complete!</h3>
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
    
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        super.destroy();
    }
}
