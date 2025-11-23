// =================================================================
// DECK BUILDER MODULE - UPLOAD HANDLERS
// Split from deck-builder-module.js for maintainability
// Contains: CSV, Media, Sentence Words, and Grammar upload handlers
// =================================================================

// =========================================
// CSV DATA MANAGEMENT
// =========================================

DeckBuilderModule.prototype.setupCSVUpload = function() {
    this.languageFile = null;
    this.wordFiles = {};

    // Populate language file inputs
    const languages = this.assets.manifest?.languages || [
        {trigraph: 'ceb', name: 'Cebuano'},
        {trigraph: 'mrw', name: 'Maranao'},
        {trigraph: 'sin', name: 'Sinama'}
    ];
    const targetLanguages = languages.filter(l => l.trigraph.toLowerCase() !== 'eng');

    const wordFileInputsContainer = document.getElementById('deckWordFileInputs');
    if (wordFileInputsContainer) {
        wordFileInputsContainer.innerHTML = targetLanguages.map(lang => `
            <div class="file-upload-container word-file-row" data-trigraph="${lang.trigraph}">
                <label class="file-upload-label">
                    <i class="fas fa-file-csv"></i> ${lang.name}
                    <span class="file-hint">Word_List_${lang.name}.csv</span>
                </label>
                <input type="file" name="wordFile_${lang.trigraph}" accept=".csv" class="file-input">
                <div class="file-status">No file selected</div>
            </div>
        `).join('');
    }

    // Radio button changes
    document.querySelectorAll('input[name="deckUpdateType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = e.target.value;
            const languageContainer = document.getElementById('deckLanguageUploadContainer');
            const wordContainer = document.getElementById('deckWordUploadContainer');

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
                const status = document.getElementById('deckLanguageFileStatus');
                if (status) {
                    status.textContent = 'No file selected';
                    status.style.color = 'var(--text-secondary)';
                }
            }
            this.updateUploadButton();
        });
    });

    // Language file input
    const languageInput = document.getElementById('deckLanguageFileInput');
    if (languageInput) {
        languageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const status = document.getElementById('deckLanguageFileStatus');
            if (file) {
                if (!file.name.toLowerCase().endsWith('.csv')) {
                    toastManager.show('Please select a CSV file', 'error');
                    languageInput.value = '';
                    this.languageFile = null;
                    status.textContent = 'No file selected';
                    status.style.color = 'var(--text-secondary)';
                } else {
                    this.languageFile = file;
                    status.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    status.style.color = 'var(--success)';
                }
            } else {
                this.languageFile = null;
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            this.updateUploadButton();
        });
    }

    // Word file inputs
    document.querySelectorAll('#deckWordFileInputs input[type="file"]').forEach(input => {
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
                    status.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    status.style.color = 'var(--success)';
                }
            } else {
                delete this.wordFiles[trigraph];
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            this.updateUploadButton();
        });
    });

    // Upload button
    const uploadBtn = document.getElementById('deckUploadProcessBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.uploadAndProcess());
    }

    // Scan assets button
    const scanBtn = document.getElementById('deckScanAssetsBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => this.triggerAssetScan());
    }
};

DeckBuilderModule.prototype.clearWordFileStatuses = function() {
    document.querySelectorAll('#deckWordFileInputs .word-file-row').forEach(row => {
        const status = row.querySelector('.file-status');
        const input = row.querySelector('input[type="file"]');
        if (status) {
            status.textContent = 'No file selected';
            status.style.color = 'var(--text-secondary)';
        }
        if (input) input.value = '';
    });
};

DeckBuilderModule.prototype.updateUploadButton = function() {
    const uploadBtn = document.getElementById('deckUploadProcessBtn');
    if (!uploadBtn) return;

    const updateType = document.querySelector('input[name="deckUpdateType"]:checked')?.value || 'both';
    let canUpload = false;

    if (updateType === 'both') {
        canUpload = this.languageFile && Object.keys(this.wordFiles).length > 0;
    } else if (updateType === 'language') {
        canUpload = this.languageFile !== null;
    } else if (updateType === 'word') {
        canUpload = Object.keys(this.wordFiles).length > 0;
    }

    uploadBtn.disabled = !canUpload;
};

DeckBuilderModule.prototype.uploadAndProcess = async function() {
    const uploadBtn = document.getElementById('deckUploadProcessBtn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading & Processing...';

    try {
        const formData = new FormData();

        if (this.languageFile) {
            formData.append('languageFile', this.languageFile);
        }

        Object.entries(this.wordFiles).forEach(([trigraph, file]) => {
            formData.append(`wordFile_${trigraph}`, file);
        });

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=upload&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        const result = await response.json();

        if (result.success) {
            toastManager.show('CSV files uploaded and processed successfully!', 'success', 5000);
            await assetManager.loadManifest();
            this.loadCardsForLanguage(this.currentTrigraph);
            this.filterAndRenderCards();
            this.updateStats();
        } else {
            toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Process';

        const languageInput = document.getElementById('deckLanguageFileInput');
        if (languageInput) languageInput.value = '';
        this.languageFile = null;
        const languageStatus = document.getElementById('deckLanguageFileStatus');
        if (languageStatus) {
            languageStatus.textContent = 'No file selected';
            languageStatus.style.color = 'var(--text-secondary)';
        }

        this.wordFiles = {};
        this.clearWordFileStatuses();
        this.updateUploadButton();
    }
};

DeckBuilderModule.prototype.triggerAssetScan = async function() {
    const scanBtn = document.getElementById('deckScanAssetsBtn');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    }

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=scan&mode=update_all&_=${timestamp}`, {
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
            await assetManager.loadManifest();
            this.loadCardsForLanguage(this.currentTrigraph);
            this.filterAndRenderCards();
            this.updateStats();
        } else {
            toastManager.show(`Scan failed: ${result.error || result.message}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.innerHTML = '<i class="fas fa-sync"></i> Rescan Assets Only';
        }
    }
};

// =========================================
// MEDIA FILES UPLOAD
// =========================================

DeckBuilderModule.prototype.setupMediaUpload = function() {
    this.imageFiles = [];
    this.audioFiles = [];

    const imageInput = document.getElementById('deckImageFilesInput');
    const audioInput = document.getElementById('deckAudioFilesInput');
    const uploadBtn = document.getElementById('deckUploadMediaBtn');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            this.imageFiles = Array.from(e.target.files);
            const status = document.getElementById('deckImageFilesStatus');
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
            const status = document.getElementById('deckAudioFilesStatus');
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
};

DeckBuilderModule.prototype.updateMediaUploadButton = function() {
    const uploadBtn = document.getElementById('deckUploadMediaBtn');
    if (uploadBtn) {
        uploadBtn.disabled = this.imageFiles.length === 0 && this.audioFiles.length === 0;
    }
};

DeckBuilderModule.prototype.uploadMediaFiles = async function() {
    const uploadBtn = document.getElementById('deckUploadMediaBtn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const formData = new FormData();

        this.imageFiles.forEach(file => {
            formData.append('imageFiles[]', file);
        });

        this.audioFiles.forEach(file => {
            formData.append('audioFiles[]', file);
        });

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=uploadMedia&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        const result = await response.json();

        if (result.success) {
            toastManager.show(
                `Media uploaded! ${result.stats?.imagesUploaded || 0} images, ${result.stats?.audioUploaded || 0} audio files.`,
                'success',
                5000
            );

            // Trigger asset scan after upload
            await this.triggerAssetScan();
        } else {
            toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Media Files';

        const imageInput = document.getElementById('deckImageFilesInput');
        const audioInput = document.getElementById('deckAudioFilesInput');
        if (imageInput) imageInput.value = '';
        if (audioInput) audioInput.value = '';
        this.imageFiles = [];
        this.audioFiles = [];

        const imageStatus = document.getElementById('deckImageFilesStatus');
        const audioStatus = document.getElementById('deckAudioFilesStatus');
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
};

// =========================================
// SENTENCE WORDS UPLOAD
// =========================================

DeckBuilderModule.prototype.setupSentenceWordsUpload = function() {
    this.sentenceWordFiles = {};

    // Populate sentence word file inputs
    const languages = this.assets.manifest?.languages || [
        {trigraph: 'ceb', name: 'Cebuano'},
        {trigraph: 'mrw', name: 'Maranao'},
        {trigraph: 'sin', name: 'Sinama'}
    ];
    const targetLanguages = languages.filter(l => l.trigraph.toLowerCase() !== 'eng');

    const sentenceFileInputsContainer = document.getElementById('sentenceWordFileInputs');
    if (sentenceFileInputsContainer) {
        sentenceFileInputsContainer.innerHTML = targetLanguages.map(lang => `
            <div class="file-upload-container sentence-file-row" data-trigraph="${lang.trigraph}">
                <label class="file-upload-label">
                    <i class="fas fa-file-csv"></i> ${lang.name}
                    <span class="file-hint">Sentence_Words_${lang.trigraph}.csv</span>
                </label>
                <input type="file" name="sentenceFile_${lang.trigraph}" accept=".csv" class="file-input">
                <div class="file-status">No file selected</div>
            </div>
        `).join('');
    }

    // Sentence word file inputs
    document.querySelectorAll('#sentenceWordFileInputs input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const row = e.target.closest('.sentence-file-row');
            const status = row.querySelector('.file-status');
            const trigraph = row.dataset.trigraph;

            if (file) {
                if (!file.name.toLowerCase().endsWith('.csv')) {
                    toastManager.show('Please select a CSV file', 'error');
                    input.value = '';
                    delete this.sentenceWordFiles[trigraph];
                    status.textContent = 'No file selected';
                    status.style.color = 'var(--text-secondary)';
                } else {
                    this.sentenceWordFiles[trigraph] = file;
                    status.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    status.style.color = 'var(--success)';
                }
            } else {
                delete this.sentenceWordFiles[trigraph];
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            this.updateSentenceWordsButton();
        });
    });

    // Upload button
    const uploadBtn = document.getElementById('uploadSentenceWordsBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.uploadSentenceWords());
    }
};

DeckBuilderModule.prototype.updateSentenceWordsButton = function() {
    const uploadBtn = document.getElementById('uploadSentenceWordsBtn');
    if (uploadBtn) {
        uploadBtn.disabled = Object.keys(this.sentenceWordFiles).length === 0;
    }
};

DeckBuilderModule.prototype.uploadSentenceWords = async function() {
    const uploadBtn = document.getElementById('uploadSentenceWordsBtn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading & Validating...';

    try {
        const formData = new FormData();

        // Add sentence word files
        for (const [trig, file] of Object.entries(this.sentenceWordFiles)) {
            formData.append(`sentenceFile_${trig}`, file);
        }

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=uploadSentenceWords&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        const result = await response.json();

        if (result.success) {
            toastManager.show('Sentence words uploaded successfully!', 'success', 5000);

            // Reload manifest
            await this.assets.loadManifest();
            this.loadCardsForLanguage(this.currentTrigraph);
            this.filterAndRenderCards();
        } else if (result.validationErrors) {
            // Show validation errors
            let errorMsg = 'Validation errors:\n';
            for (const [lang, errors] of Object.entries(result.validationErrors)) {
                errorMsg += `\n${lang}:\n`;
                errors.slice(0, 5).forEach(err => {
                    errorMsg += `  - ${err}\n`;
                });
                if (errors.length > 5) {
                    errorMsg += `  ...and ${errors.length - 5} more errors\n`;
                }
            }
            toastManager.show('Upload failed - some words not found in manifest', 'error', 10000);
            console.error(errorMsg);
            alert(errorMsg);
        } else {
            toastManager.show(`Upload failed: ${result.error || 'Unknown error'}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Sentence Words';

        // Clear file inputs
        document.querySelectorAll('#sentenceWordFileInputs .sentence-file-row').forEach(row => {
            const status = row.querySelector('.file-status');
            const input = row.querySelector('input[type="file"]');
            if (status) {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            if (input) input.value = '';
        });
        this.sentenceWordFiles = {};
        this.updateSentenceWordsButton();
    }
};

// =========================================
// GRAMMAR FILES MANAGEMENT
// =========================================

DeckBuilderModule.prototype.setupGrammarUpload = function() {
    this.grammarFile = null;

    const grammarInput = document.getElementById('grammarFileInput');
    const uploadBtn = document.getElementById('uploadGrammarBtn');
    const reportBtn = document.getElementById('grammarReportBtn');
    const lessonInput = document.getElementById('grammarLessonInput');
    const closeReportBtn = document.getElementById('closeGrammarReport');

    if (grammarInput) {
        grammarInput.addEventListener('change', (e) => {
            this.grammarFile = e.target.files[0] || null;
            const status = document.getElementById('grammarFileStatus');
            if (this.grammarFile) {
                status.textContent = this.grammarFile.name;
                status.style.color = 'var(--success)';
            } else {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            this.updateGrammarUploadButton();
        });
    }

    if (lessonInput) {
        lessonInput.addEventListener('input', () => {
            this.updateGrammarUploadButton();
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.uploadGrammarFile());
    }

    if (reportBtn) {
        reportBtn.addEventListener('click', () => this.showGrammarReport());
    }

    if (closeReportBtn) {
        closeReportBtn.addEventListener('click', () => {
            const container = document.getElementById('grammarReportContainer');
            if (container) container.classList.add('hidden');
        });
    }
};

DeckBuilderModule.prototype.updateGrammarUploadButton = function() {
    const uploadBtn = document.getElementById('uploadGrammarBtn');
    const lessonInput = document.getElementById('grammarLessonInput');
    const lesson = parseInt(lessonInput?.value || 0);

    if (uploadBtn) {
        uploadBtn.disabled = !this.grammarFile || lesson <= 0;
    }
};

DeckBuilderModule.prototype.uploadGrammarFile = async function() {
    const uploadBtn = document.getElementById('uploadGrammarBtn');
    const languageSelect = document.getElementById('grammarLanguageSelect');
    const lessonInput = document.getElementById('grammarLessonInput');

    const language = languageSelect?.value || 'ceb';
    const lesson = parseInt(lessonInput?.value || 0);

    if (!this.grammarFile || lesson <= 0) {
        toastManager.show('Please select a file and enter a lesson number', 'warning');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const formData = new FormData();
        formData.append('grammarFile', this.grammarFile);
        formData.append('language', language);
        formData.append('lesson', lesson);

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=uploadGrammar&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store'
        });

        const result = await response.json();

        if (result.success) {
            const langName = this.trigraphToLangName[language] || language;
            toastManager.show(
                `Grammar uploaded for ${langName} Lesson ${lesson}!`,
                'success',
                5000
            );

            // Reset form
            const grammarInput = document.getElementById('grammarFileInput');
            if (grammarInput) grammarInput.value = '';
            if (lessonInput) lessonInput.value = '';
            this.grammarFile = null;

            const status = document.getElementById('grammarFileStatus');
            if (status) {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }

            // Reload manifest to pick up new grammar entry
            await assetManager.loadManifest();
        } else {
            toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Grammar File';
        this.updateGrammarUploadButton();
    }
};

DeckBuilderModule.prototype.showGrammarReport = async function() {
    const reportBtn = document.getElementById('grammarReportBtn');
    const container = document.getElementById('grammarReportContainer');
    const content = document.getElementById('grammarReportContent');

    if (!container || !content) return;

    reportBtn.disabled = true;
    reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    content.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Generating report...</div>';
    container.classList.remove('hidden');

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=grammarReport&_=${timestamp}`, {
            cache: 'no-store'
        });

        const report = await response.json();

        if (report.success) {
            content.innerHTML = this.renderGrammarReport(report);
        } else {
            content.innerHTML = `<div class="error-message">Failed to generate report: ${report.error || 'Unknown error'}</div>`;
        }
    } catch (err) {
        content.innerHTML = `<div class="error-message">Error: ${err.message}</div>`;
    } finally {
        reportBtn.disabled = false;
        reportBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Grammar Coverage Report';
    }
};

DeckBuilderModule.prototype.renderGrammarReport = function(report) {
    let html = `
        <div class="grammar-report-summary">
            <div class="summary-stat">
                <span class="stat-value">${report.summary.totalGrammarFiles}</span>
                <span class="stat-label">Total Grammar Files</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${report.summary.totalLessons}</span>
                <span class="stat-label">Total Lessons</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${report.summary.overallCoverage}%</span>
                <span class="stat-label">Overall Coverage</span>
            </div>
        </div>
        <div class="grammar-report-languages">
    `;

    for (const [trigraph, lang] of Object.entries(report.languages)) {
        const coverageClass = lang.coverage >= 80 ? 'high' : (lang.coverage >= 50 ? 'medium' : 'low');

        html += `
            <div class="language-report-card">
                <div class="language-header">
                    <h5>${lang.name}</h5>
                    <span class="coverage-badge ${coverageClass}">${lang.coverage}% coverage</span>
                </div>
                <div class="language-stats">
                    <span><strong>${lang.grammarCount}</strong> of <strong>${lang.totalLessons}</strong> lessons have grammar</span>
                </div>
        `;

        if (lang.lessonsWithGrammar.length > 0) {
            html += `
                <div class="lessons-list">
                    <span class="list-label"><i class="fas fa-check-circle" style="color: var(--success);"></i> Has Grammar:</span>
                    <span class="lesson-numbers">${lang.lessonsWithGrammar.join(', ')}</span>
                </div>
            `;
        }

        if (lang.lessonsWithoutGrammar.length > 0) {
            html += `
                <div class="lessons-list missing">
                    <span class="list-label"><i class="fas fa-times-circle" style="color: var(--error);"></i> Missing:</span>
                    <span class="lesson-numbers">${lang.lessonsWithoutGrammar.join(', ')}</span>
                </div>
            `;
        }

        html += `</div>`;
    }

    html += `
        </div>
        <div class="report-footer">
            <small>Report generated: ${new Date(report.generated).toLocaleString()}</small>
        </div>
    `;

    return html;
};
