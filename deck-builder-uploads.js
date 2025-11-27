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
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';

    try {
        const formData = new FormData();

        // Add sentence word files
        for (const [trig, file] of Object.entries(this.sentenceWordFiles)) {
            formData.append(`sentenceFile_${trig}`, file);
        }

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=previewSentenceWords&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        const result = await response.json();

        if (result.success && result.preview) {
            // Show preview modal with validation results
            this.showSentenceWordsPreview(result.results);
        } else {
            toastManager.show(`Validation failed: ${result.error || 'Unknown error'}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Sentence Words';
    }
};

/**
 * Show sentence words preview modal with validation results
 */
DeckBuilderModule.prototype.showSentenceWordsPreview = function(results) {
    // Store results for later confirmation
    this.sentenceWordsPreviewData = results;
    this.sentenceWordsCorrections = {};

    // Create modal if it doesn't exist
    let modal = document.getElementById('sentenceWordsPreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sentenceWordsPreviewModal';
        modal.className = 'modal sentence-preview-modal';
        document.body.appendChild(modal);
    }

    // Build modal content
    let languageTabs = '';
    let languagePanels = '';
    let firstTrig = null;

    for (const [trig, data] of Object.entries(results)) {
        if (!firstTrig) firstTrig = trig;

        const hasErrors = data.stats.unmatched > 0;
        const tabClass = hasErrors ? 'has-errors' : '';

        languageTabs += `
            <button class="preview-tab ${trig === firstTrig ? 'active' : ''} ${tabClass}" data-trig="${trig}">
                ${data.language}
                <span class="tab-stats">
                    ${hasErrors ? `<span class="error-count">${data.stats.unmatched}</span>` : '<i class="fas fa-check"></i>'}
                </span>
            </button>
        `;

        languagePanels += `
            <div class="preview-panel ${trig === firstTrig ? 'active' : ''}" data-trig="${trig}">
                ${this.renderPreviewTable(trig, data)}
            </div>
        `;

        // Initialize corrections for this language
        this.sentenceWordsCorrections[trig] = {
            tempFile: data.tempFile,
            corrections: {}
        };
    }

    // Calculate totals
    let totalWords = 0, totalMatched = 0, totalUnmatched = 0;
    for (const data of Object.values(results)) {
        totalWords += data.stats.total;
        totalMatched += data.stats.matched;
        totalUnmatched += data.stats.unmatched;
    }

    modal.innerHTML = `
        <div class="modal-content preview-modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-file-csv"></i> Sentence Words Upload Preview</h2>
                <button class="close-btn" id="closePreviewModal">&times;</button>
            </div>

            <div class="preview-summary">
                <div class="summary-item">
                    <span class="summary-value">${totalWords}</span>
                    <span class="summary-label">Total Words</span>
                </div>
                <div class="summary-item success">
                    <span class="summary-value">${totalMatched}</span>
                    <span class="summary-label">Matched</span>
                </div>
                <div class="summary-item ${totalUnmatched > 0 ? 'error' : 'success'}">
                    <span class="summary-value">${totalUnmatched}</span>
                    <span class="summary-label">Unmatched</span>
                </div>
            </div>

            ${totalUnmatched > 0 ? `
                <div class="preview-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Some words were not found in the manifest. Please select the correct card for each unmatched word, or they will be skipped.</span>
                </div>
            ` : `
                <div class="preview-success">
                    <i class="fas fa-check-circle"></i>
                    <span>All words matched successfully! Review and confirm to upload.</span>
                </div>
            `}

            <div class="preview-tabs">
                ${languageTabs}
            </div>

            <div class="preview-panels">
                ${languagePanels}
            </div>

            <div class="modal-footer">
                <button id="cancelPreviewBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button id="confirmUploadBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> Confirm Upload
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    // Setup event listeners
    this.setupPreviewModalEvents(modal);
};

/**
 * Render preview table for a language
 */
DeckBuilderModule.prototype.renderPreviewTable = function(trig, data) {
    const { words, stats, allCards } = data;

    // Group by matched/unmatched for better organization
    const unmatchedWords = words.filter(w => !w.matched);
    const matchedWords = words.filter(w => w.matched);

    let html = `
        <div class="preview-stats-bar">
            <span><i class="fas fa-check-circle text-success"></i> ${stats.matched} matched</span>
            <span><i class="fas fa-times-circle text-error"></i> ${stats.unmatched} unmatched</span>
        </div>
    `;

    // Show unmatched words first (they need attention)
    if (unmatchedWords.length > 0) {
        html += `
            <div class="preview-section unmatched-section">
                <h4><i class="fas fa-exclamation-circle"></i> Unmatched Words - Select Correct Card</h4>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Word in CSV</th>
                            <th>Type</th>
                            <th>Lesson</th>
                            <th>Select Card</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const word of unmatchedWords) {
            const suggestionOptions = this.buildSuggestionOptions(word, allCards);
            html += `
                <tr class="unmatched-row" data-original="${this.escapeHtml(word.original)}">
                    <td class="word-cell">
                        <span class="original-word">${this.escapeHtml(word.original)}</span>
                    </td>
                    <td>${this.escapeHtml(word.wordType)}</td>
                    <td>${word.lesson}</td>
                    <td class="select-cell">
                        <select class="card-select" data-trig="${trig}" data-original="${this.escapeHtml(word.original)}">
                            <option value="">-- Skip this word --</option>
                            ${suggestionOptions}
                        </select>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    // Show matched words (collapsed by default)
    if (matchedWords.length > 0) {
        html += `
            <div class="preview-section matched-section">
                <h4 class="collapsible" data-collapsed="true">
                    <i class="fas fa-chevron-right"></i>
                    <i class="fas fa-check-circle text-success"></i>
                    Matched Words (${matchedWords.length})
                    <span class="collapse-hint">Click to expand</span>
                </h4>
                <div class="matched-content" style="display: none;">
                    <table class="preview-table matched-table">
                        <thead>
                            <tr>
                                <th>Word in CSV</th>
                                <th>Type</th>
                                <th>Matched Card</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        for (const word of matchedWords) {
            html += `
                <tr class="matched-row">
                    <td>${this.escapeHtml(word.original)}</td>
                    <td>${this.escapeHtml(word.wordType)}</td>
                    <td>
                        <span class="matched-card">
                            <i class="fas fa-check"></i>
                            #${word.cardNum}: ${this.escapeHtml(word.cardWord)}
                        </span>
                    </td>
                </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    return html;
};

/**
 * Build suggestion options HTML for dropdown
 */
DeckBuilderModule.prototype.buildSuggestionOptions = function(word, allCards) {
    let html = '';

    // Add suggestions first (with similarity scores)
    if (word.suggestions && word.suggestions.length > 0) {
        html += '<optgroup label="Suggestions">';
        for (const sug of word.suggestions) {
            html += `<option value="${this.escapeHtml(sug.word)}" data-card-num="${sug.cardNum}">
                ${this.escapeHtml(sug.word)} (${sug.english}) - ${sug.similarity}% match
            </option>`;
        }
        html += '</optgroup>';
    }

    // Add all cards as options
    html += '<optgroup label="All Cards">';
    for (const card of allCards) {
        html += `<option value="${this.escapeHtml(card.word)}" data-card-num="${card.cardNum}">
            L${card.lesson} #${card.cardNum}: ${this.escapeHtml(card.word)} (${this.escapeHtml(card.english)})
        </option>`;
    }
    html += '</optgroup>';

    return html;
};

/**
 * Setup event listeners for preview modal
 */
DeckBuilderModule.prototype.setupPreviewModalEvents = function(modal) {
    // Close button
    modal.querySelector('#closePreviewModal').addEventListener('click', () => {
        modal.classList.add('hidden');
        this.clearSentenceWordInputs();
    });

    // Cancel button
    modal.querySelector('#cancelPreviewBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
        this.clearSentenceWordInputs();
    });

    // Confirm button
    modal.querySelector('#confirmUploadBtn').addEventListener('click', () => {
        this.confirmSentenceWordsUpload();
    });

    // Tab switching
    modal.querySelectorAll('.preview-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const trig = tab.dataset.trig;

            // Update active tab
            modal.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active panel
            modal.querySelectorAll('.preview-panel').forEach(p => p.classList.remove('active'));
            modal.querySelector(`.preview-panel[data-trig="${trig}"]`).classList.add('active');
        });
    });

    // Card selection dropdowns
    modal.querySelectorAll('.card-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const trig = e.target.dataset.trig;
            const original = e.target.dataset.original;
            const selected = e.target.value;

            if (selected) {
                this.sentenceWordsCorrections[trig].corrections[original] = selected;
                e.target.closest('tr').classList.add('corrected');
            } else {
                delete this.sentenceWordsCorrections[trig].corrections[original];
                e.target.closest('tr').classList.remove('corrected');
            }
        });
    });

    // Collapsible sections
    modal.querySelectorAll('.collapsible').forEach(header => {
        header.addEventListener('click', () => {
            const isCollapsed = header.dataset.collapsed === 'true';
            const content = header.nextElementSibling;

            if (isCollapsed) {
                content.style.display = 'block';
                header.dataset.collapsed = 'false';
                header.querySelector('.fas').classList.replace('fa-chevron-right', 'fa-chevron-down');
            } else {
                content.style.display = 'none';
                header.dataset.collapsed = 'true';
                header.querySelector('.fas').classList.replace('fa-chevron-down', 'fa-chevron-right');
            }
        });
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            this.clearSentenceWordInputs();
        }
    });
};

/**
 * Confirm and upload sentence words with corrections
 */
DeckBuilderModule.prototype.confirmSentenceWordsUpload = async function() {
    const modal = document.getElementById('sentenceWordsPreviewModal');
    const confirmBtn = modal.querySelector('#confirmUploadBtn');

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=confirmSentenceWords&_=${timestamp}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ corrections: this.sentenceWordsCorrections }),
            cache: 'no-store'
        });

        const result = await response.json();

        if (result.success) {
            toastManager.show('Sentence words uploaded successfully!', 'success', 5000);
            modal.classList.add('hidden');

            // Reload manifest
            await this.assets.loadManifest();
            this.loadCardsForLanguage(this.currentTrigraph);
            this.filterAndRenderCards();

            // Clear inputs
            this.clearSentenceWordInputs();
        } else {
            toastManager.show(`Upload failed: ${result.error || 'Unknown error'}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Upload';
    }
};

/**
 * Clear sentence word file inputs
 */
DeckBuilderModule.prototype.clearSentenceWordInputs = function() {
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
};

/**
 * HTML escape helper
 */
DeckBuilderModule.prototype.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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


// =========================================
// TEACHER'S GUIDE FILES MANAGEMENT
// =========================================

DeckBuilderModule.prototype.setupTeacherGuideUpload = function() {
    this.teacherGuideFile = null;

    const teacherGuideInput = document.getElementById('teacherGuideFileInput');
    const uploadBtn = document.getElementById('uploadTeacherGuideBtn');
    const reportBtn = document.getElementById('teacherGuideReportBtn');
    const lessonInput = document.getElementById('teacherGuideLessonInput');
    const closeReportBtn = document.getElementById('closeTeacherGuideReport');

    if (teacherGuideInput) {
        teacherGuideInput.addEventListener('change', (e) => {
            this.teacherGuideFile = e.target.files[0] || null;
            const status = document.getElementById('teacherGuideFileStatus');
            if (this.teacherGuideFile) {
                status.textContent = this.teacherGuideFile.name;
                status.style.color = 'var(--success)';
            } else {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }
            this.updateTeacherGuideUploadButton();
        });
    }

    if (lessonInput) {
        lessonInput.addEventListener('input', () => {
            this.updateTeacherGuideUploadButton();
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.uploadTeacherGuideFile());
    }

    if (reportBtn) {
        reportBtn.addEventListener('click', () => this.showTeacherGuideReport());
    }

    if (closeReportBtn) {
        closeReportBtn.addEventListener('click', () => {
            const container = document.getElementById('teacherGuideReportContainer');
            if (container) container.classList.add('hidden');
        });
    }
};

DeckBuilderModule.prototype.updateTeacherGuideUploadButton = function() {
    const uploadBtn = document.getElementById('uploadTeacherGuideBtn');
    const lessonInput = document.getElementById('teacherGuideLessonInput');
    const lesson = parseInt(lessonInput?.value || 0);

    if (uploadBtn) {
        uploadBtn.disabled = !this.teacherGuideFile || lesson <= 0;
    }
};

DeckBuilderModule.prototype.uploadTeacherGuideFile = async function() {
    const uploadBtn = document.getElementById('uploadTeacherGuideBtn');
    const languageSelect = document.getElementById('teacherGuideLanguageSelect');
    const lessonInput = document.getElementById('teacherGuideLessonInput');

    const language = languageSelect?.value || 'ceb';
    const lesson = parseInt(lessonInput?.value || 0);

    if (!this.teacherGuideFile || lesson <= 0) {
        toastManager.show('Please select a file and enter a lesson number', 'warning');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const formData = new FormData();
        formData.append('teacherGuideFile', this.teacherGuideFile);
        formData.append('language', language);
        formData.append('lesson', lesson);

        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=uploadTeacherGuide&_=${timestamp}`, {
            method: 'POST',
            body: formData,
            cache: 'no-store'
        });

        const result = await response.json();

        if (result.success) {
            const langName = this.trigraphToLangName[language] || language;
            toastManager.show(
                `Teacher's guide uploaded for ${langName} Lesson ${lesson}!`,
                'success',
                5000
            );

            // Reset form
            const teacherGuideInput = document.getElementById('teacherGuideFileInput');
            if (teacherGuideInput) teacherGuideInput.value = '';
            if (lessonInput) lessonInput.value = '';
            this.teacherGuideFile = null;

            const status = document.getElementById('teacherGuideFileStatus');
            if (status) {
                status.textContent = 'No file selected';
                status.style.color = 'var(--text-secondary)';
            }

            // Reload manifest to pick up new teacher's guide entry
            await assetManager.loadManifest();
        } else {
            toastManager.show(`Upload failed: ${result.error || result.message}`, 'error', 5000);
        }
    } catch (err) {
        toastManager.show(`Error: ${err.message}`, 'error', 5000);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Teacher\'s Guide File';
        this.updateTeacherGuideUploadButton();
    }
};

DeckBuilderModule.prototype.showTeacherGuideReport = async function() {
    const reportBtn = document.getElementById('teacherGuideReportBtn');
    const container = document.getElementById('teacherGuideReportContainer');
    const content = document.getElementById('teacherGuideReportContent');

    if (!container || !content) return;

    reportBtn.disabled = true;
    reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    content.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Generating report...</div>';
    container.classList.remove('hidden');

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`scan-assets.php?action=teacherGuideReport&_=${timestamp}`, {
            cache: 'no-store'
        });

        const report = await response.json();

        if (report.success) {
            content.innerHTML = this.renderTeacherGuideReport(report);
        } else {
            content.innerHTML = `<div class="error-message">Failed to generate report: ${report.error || 'Unknown error'}</div>`;
        }
    } catch (err) {
        content.innerHTML = `<div class="error-message">Error: ${err.message}</div>`;
    } finally {
        reportBtn.disabled = false;
        reportBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Teacher\'s Guide Coverage Report';
    }
};

DeckBuilderModule.prototype.renderTeacherGuideReport = function(report) {
    let html = `
        <div class="grammar-report-summary">
            <div class="summary-stat">
                <span class="stat-value">${report.summary.totalGuideFiles}</span>
                <span class="stat-label">Total Guide Files</span>
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
                    <span><strong>${lang.guideCount}</strong> of <strong>${lang.totalLessons}</strong> lessons have teacher's guide</span>
                </div>
        `;

        if (lang.lessonsWithGuide.length > 0) {
            html += `
                <div class="lessons-list">
                    <span class="list-label"><i class="fas fa-check-circle" style="color: var(--success);"></i> Has Guide:</span>
                    <span class="lesson-numbers">${lang.lessonsWithGuide.join(', ')}</span>
                </div>
            `;
        }

        if (lang.lessonsWithoutGuide.length > 0) {
            html += `
                <div class="lessons-list missing">
                    <span class="list-label"><i class="fas fa-times-circle" style="color: var(--error);"></i> Missing:</span>
                    <span class="lesson-numbers">${lang.lessonsWithoutGuide.join(', ')}</span>
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


// =========================================
// SENTENCE WORDS EDITOR (Collapsible Lessons)
// =========================================

DeckBuilderModule.prototype.setupSentenceWordsEditor = function() {
    // Tab switching
    document.querySelectorAll('.sw-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            document.querySelectorAll('.sw-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sw-tab-content').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(tab === 'upload' ? 'swUploadTab' : 'swEditorTab').classList.add('active');

            if (tab === 'editor') {
                this.initSentenceWordsEditor();
            }
        });
    });

    // Initialize editor state
    this.swAllLessonsData = {}; // All lessons data: { lessonNum: { wordType: [...words] } }
    this.swExpandedLessons = new Set(); // Track expanded lessons
    this.swEditedLessons = new Set(); // Track which lessons have been edited
    this.swEditorInitialized = false;
};

DeckBuilderModule.prototype.initSentenceWordsEditor = function() {
    const langSelect = document.getElementById('swEditorLanguage');

    // Populate language dropdown
    const languages = this.assets.manifest?.languages || [];
    const targetLanguages = languages.filter(l => l.trigraph.toLowerCase() !== 'eng');

    langSelect.innerHTML = '<option value="">Select Language</option>' +
        targetLanguages.map(l => `<option value="${l.trigraph}">${l.name}</option>`).join('');

    // Only add event listeners once
    if (!this.swEditorInitialized) {
        // Language change handler
        langSelect.addEventListener('change', () => {
            this.swEditedLessons.clear();
            this.swExpandedLessons.clear();
            this.loadAllSentenceWordsForLanguage();
        });

        // Add Lesson button
        document.getElementById('swAddLesson').addEventListener('click', () => {
            this.addNewSentenceWordsLesson();
        });

        // Save All Changes button
        document.getElementById('swSaveAllChanges').addEventListener('click', () => {
            this.saveAllSentenceWordsChanges();
        });

        this.swEditorInitialized = true;
    }
};

DeckBuilderModule.prototype.loadAllSentenceWordsForLanguage = function() {
    const lang = document.getElementById('swEditorLanguage').value;

    if (!lang) {
        document.getElementById('swAddLesson').disabled = true;
        document.getElementById('swSaveAllChanges').disabled = true;
        document.getElementById('swLessonsList').innerHTML = `
            <div class="sw-editor-empty">
                <i class="fas fa-hand-pointer"></i>
                <p>Select a language to view and edit sentence words</p>
            </div>`;
        return;
    }

    document.getElementById('swAddLesson').disabled = false;

    // Get all sentence words for this language
    const sentenceWords = this.assets.manifest?.sentenceWords?.[lang] || {};

    // Deep clone for editing
    this.swAllLessonsData = JSON.parse(JSON.stringify(sentenceWords));

    // Also get max lesson from cards to ensure we show all possible lessons
    const cards = this.assets.manifest?.cards?.[lang] || [];
    const maxLesson = Math.max(...cards.map(c => c.lesson || 1), 1);

    // Ensure all lessons up to maxLesson exist in our data structure
    for (let i = 1; i <= maxLesson; i++) {
        if (!this.swAllLessonsData[i]) {
            this.swAllLessonsData[i] = {};
        }
    }

    this.renderSentenceWordsLessonsList();
};

DeckBuilderModule.prototype.renderSentenceWordsLessonsList = function() {
    const container = document.getElementById('swLessonsList');
    const lang = document.getElementById('swEditorLanguage').value;

    if (!lang) {
        container.innerHTML = `
            <div class="sw-editor-empty">
                <i class="fas fa-hand-pointer"></i>
                <p>Select a language to view and edit sentence words</p>
            </div>`;
        return;
    }

    const lessonNums = Object.keys(this.swAllLessonsData).map(Number).sort((a, b) => a - b);

    if (lessonNums.length === 0) {
        container.innerHTML = `
            <div class="sw-editor-empty">
                <i class="fas fa-inbox"></i>
                <p>No lessons found. Click "Add Lesson" to create one.</p>
            </div>`;
        return;
    }

    let html = '';

    lessonNums.forEach(lessonNum => {
        const lessonData = this.swAllLessonsData[lessonNum] || {};
        const isExpanded = this.swExpandedLessons.has(lessonNum);
        const isEdited = this.swEditedLessons.has(lessonNum);
        const wordTypeCount = Object.keys(lessonData).length;
        const totalWords = Object.values(lessonData).reduce((sum, words) => sum + (words?.length || 0), 0);

        html += `
            <div class="sw-lesson-item ${isExpanded ? 'expanded' : ''}" data-lesson="${lessonNum}">
                <div class="sw-lesson-header" data-lesson="${lessonNum}">
                    <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                    <span class="lesson-title">Lesson ${lessonNum}</span>
                    <span class="word-type-count">${wordTypeCount} types, ${totalWords} words</span>
                    ${isEdited ? '<span class="edited-badge">Modified</span>' : ''}
                    <button class="btn btn-sm btn-secondary sw-add-word-type" data-lesson="${lessonNum}" title="Add word type">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-danger sw-delete-lesson" data-lesson="${lessonNum}" title="Delete lesson">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="sw-lesson-content ${isExpanded ? '' : 'hidden'}">
                    ${this.renderWordTypesForLesson(lessonNum, lessonData, lang)}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach event listeners
    this.attachSentenceWordsListeners();
    this.updateSaveAllButtonState();
};

DeckBuilderModule.prototype.renderWordTypesForLesson = function(lessonNum, lessonData, lang) {
    if (!lessonData || Object.keys(lessonData).length === 0) {
        return '<p class="sw-no-word-types">No word types defined. Click + to add one.</p>';
    }

    let html = '<div class="sw-word-types-list">';

    for (const [wordType, words] of Object.entries(lessonData)) {
        const wordCount = words?.length || 0;
        html += `
            <div class="sw-word-type-section" data-lesson="${lessonNum}" data-type="${wordType}">
                <div class="sw-type-header">
                    <button class="sw-collapse-btn">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <span class="sw-type-name">${wordType}</span>
                    <span class="sw-type-count">(${wordCount} word${wordCount !== 1 ? 's' : ''})</span>
                    <button class="sw-type-delete" data-lesson="${lessonNum}" data-type="${wordType}" title="Delete word type">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="sw-type-body">
                    <div class="sw-word-chips">`;

        for (const word of (words || [])) {
            const cardMatch = this.findCardForWord(word, lang);
            const validClass = cardMatch ? 'valid' : 'invalid';
            const escapedWord = word.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `
                        <div class="sw-word-chip ${validClass}"
                             data-word="${word}"
                             data-lesson="${lessonNum}"
                             data-type="${wordType}">
                            <span class="sw-chip-text">${word}</span>
                            <button class="sw-chip-delete" data-lesson="${lessonNum}" data-type="${wordType}" data-word="${escapedWord}">&times;</button>
                        </div>`;
        }

        html += `
                        <button class="sw-add-word-btn" data-lesson="${lessonNum}" data-type="${wordType}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    html += '</div>';
    return html;
};

DeckBuilderModule.prototype.attachSentenceWordsListeners = function() {
    const lang = document.getElementById('swEditorLanguage').value;

    // Lesson expand/collapse
    document.querySelectorAll('.sw-lesson-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const lessonNum = parseInt(header.dataset.lesson);
            this.toggleSentenceWordsLesson(lessonNum);
        });
    });

    // Word type collapse toggle
    document.querySelectorAll('.sw-collapse-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const section = btn.closest('.sw-word-type-section');
            section.classList.toggle('collapsed');
        });
    });

    // Add word type buttons
    document.querySelectorAll('.sw-add-word-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessonNum = parseInt(btn.dataset.lesson);
            this.addWordTypeToLesson(lessonNum);
        });
    });

    // Delete lesson buttons
    document.querySelectorAll('.sw-delete-lesson').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessonNum = parseInt(btn.dataset.lesson);
            this.deleteSentenceWordsLesson(lessonNum);
        });
    });

    // Delete word type buttons
    document.querySelectorAll('.sw-type-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessonNum = parseInt(btn.dataset.lesson);
            const wordType = btn.dataset.type;
            this.deleteWordTypeFromLesson(lessonNum, wordType);
        });
    });

    // Add word buttons
    document.querySelectorAll('.sw-add-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessonNum = parseInt(btn.dataset.lesson);
            const wordType = btn.dataset.type;
            this.addWordToTypeInLesson(lessonNum, wordType);
        });
    });

    // Word chip text click (edit)
    document.querySelectorAll('.sw-chip-text').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const chipDiv = chip.closest('.sw-word-chip');
            const lessonNum = parseInt(chipDiv.dataset.lesson);
            const wordType = chipDiv.dataset.type;
            const word = chipDiv.dataset.word;
            this.editWordInLesson(lessonNum, wordType, word);
        });
    });

    // Delete word buttons
    document.querySelectorAll('.sw-chip-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessonNum = parseInt(btn.dataset.lesson);
            const wordType = btn.dataset.type;
            const word = btn.dataset.word;
            this.deleteWordFromLesson(lessonNum, wordType, word);
        });
    });

    // Word chip hover for preview
    document.querySelectorAll('.sw-word-chip').forEach(chip => {
        chip.addEventListener('mouseenter', (e) => {
            const word = chip.dataset.word;
            this.showWordPreview(e, word, lang);
        });
        chip.addEventListener('mouseleave', () => {
            this.hideWordPreview();
        });
    });
};

DeckBuilderModule.prototype.toggleSentenceWordsLesson = function(lessonNum) {
    if (this.swExpandedLessons.has(lessonNum)) {
        this.swExpandedLessons.delete(lessonNum);
    } else {
        this.swExpandedLessons.add(lessonNum);
    }
    this.renderSentenceWordsLessonsList();
};

DeckBuilderModule.prototype.addNewSentenceWordsLesson = function() {
    const lessonNum = prompt('Enter lesson number:');
    if (!lessonNum || isNaN(parseInt(lessonNum))) return;

    const num = parseInt(lessonNum);
    if (this.swAllLessonsData[num] && Object.keys(this.swAllLessonsData[num]).length > 0) {
        toastManager?.show('Lesson already has data', 'warning');
        return;
    }

    this.swAllLessonsData[num] = {};
    this.swEditedLessons.add(num);
    this.swExpandedLessons.add(num);
    this.renderSentenceWordsLessonsList();
    toastManager?.show(`Added Lesson ${num}`, 'success');
};

DeckBuilderModule.prototype.deleteSentenceWordsLesson = function(lessonNum) {
    const lessonData = this.swAllLessonsData[lessonNum] || {};
    const wordTypeCount = Object.keys(lessonData).length;

    if (!confirm(`Delete Lesson ${lessonNum} and its ${wordTypeCount} word type(s)?`)) return;

    delete this.swAllLessonsData[lessonNum];
    this.swEditedLessons.add(lessonNum);
    this.swExpandedLessons.delete(lessonNum);
    this.renderSentenceWordsLessonsList();
    toastManager?.show(`Deleted Lesson ${lessonNum}`, 'success');
};

DeckBuilderModule.prototype.addWordTypeToLesson = function(lessonNum) {
    const typeName = prompt('Enter new word type name (e.g., Verb, Noun, Adjective):');
    if (!typeName || !typeName.trim()) return;

    const trimmedType = typeName.trim();
    if (!this.swAllLessonsData[lessonNum]) {
        this.swAllLessonsData[lessonNum] = {};
    }

    if (this.swAllLessonsData[lessonNum][trimmedType]) {
        toastManager?.show('Word type already exists in this lesson', 'error');
        return;
    }

    this.swAllLessonsData[lessonNum][trimmedType] = [];
    this.swEditedLessons.add(lessonNum);
    this.swExpandedLessons.add(lessonNum);
    this.renderSentenceWordsLessonsList();
    toastManager?.show(`Added word type "${trimmedType}" to Lesson ${lessonNum}`, 'success');
};

DeckBuilderModule.prototype.deleteWordTypeFromLesson = function(lessonNum, wordType) {
    const wordCount = this.swAllLessonsData[lessonNum]?.[wordType]?.length || 0;
    if (!confirm(`Delete word type "${wordType}" and its ${wordCount} word(s) from Lesson ${lessonNum}?`)) return;

    delete this.swAllLessonsData[lessonNum][wordType];
    this.swEditedLessons.add(lessonNum);
    this.renderSentenceWordsLessonsList();
    toastManager?.show(`Deleted word type "${wordType}"`, 'success');
};

DeckBuilderModule.prototype.addWordToTypeInLesson = function(lessonNum, wordType) {
    const word = prompt(`Add new word to "${wordType}" in Lesson ${lessonNum}:`);
    if (!word || !word.trim()) return;

    const trimmedWord = word.trim();
    if (!this.swAllLessonsData[lessonNum]) {
        this.swAllLessonsData[lessonNum] = {};
    }
    if (!this.swAllLessonsData[lessonNum][wordType]) {
        this.swAllLessonsData[lessonNum][wordType] = [];
    }

    if (this.swAllLessonsData[lessonNum][wordType].includes(trimmedWord)) {
        toastManager?.show('Word already exists in this category', 'error');
        return;
    }

    this.swAllLessonsData[lessonNum][wordType].push(trimmedWord);
    this.swEditedLessons.add(lessonNum);
    this.renderSentenceWordsLessonsList();
    toastManager?.show(`Added "${trimmedWord}" to ${wordType}`, 'success');
};

DeckBuilderModule.prototype.editWordInLesson = function(lessonNum, wordType, oldWord) {
    const newWord = prompt(`Edit word:`, oldWord);
    if (!newWord || !newWord.trim() || newWord.trim() === oldWord) return;

    const trimmedWord = newWord.trim();
    const words = this.swAllLessonsData[lessonNum]?.[wordType] || [];
    const index = words.indexOf(oldWord);

    if (index > -1) {
        this.swAllLessonsData[lessonNum][wordType][index] = trimmedWord;
        this.swEditedLessons.add(lessonNum);
        this.renderSentenceWordsLessonsList();
        toastManager?.show(`Updated word to "${trimmedWord}"`, 'success');
    }
};

DeckBuilderModule.prototype.deleteWordFromLesson = function(lessonNum, wordType, word) {
    if (!confirm(`Delete "${word}" from ${wordType}?`)) return;

    const words = this.swAllLessonsData[lessonNum]?.[wordType] || [];
    const index = words.indexOf(word);

    if (index > -1) {
        this.swAllLessonsData[lessonNum][wordType].splice(index, 1);
        this.swEditedLessons.add(lessonNum);
        this.renderSentenceWordsLessonsList();
        toastManager?.show(`Deleted "${word}"`, 'success');
    }
};

DeckBuilderModule.prototype.updateSaveAllButtonState = function() {
    const saveBtn = document.getElementById('swSaveAllChanges');
    saveBtn.disabled = this.swEditedLessons.size === 0;
};

DeckBuilderModule.prototype.saveAllSentenceWordsChanges = async function() {
    const lang = document.getElementById('swEditorLanguage').value;

    if (!lang) {
        toastManager?.show('Please select a language', 'error');
        return;
    }

    if (this.swEditedLessons.size === 0) {
        toastManager?.show('No changes to save', 'info');
        return;
    }

    const saveBtn = document.getElementById('swSaveAllChanges');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        // Save each edited lesson
        const editedLessonNums = Array.from(this.swEditedLessons);
        let successCount = 0;
        let errorCount = 0;

        for (const lessonNum of editedLessonNums) {
            const lessonData = this.swAllLessonsData[lessonNum] || {};

            try {
                const response = await fetch('scan-assets.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveSentenceWords',
                        language: lang,
                        lesson: lessonNum.toString(),
                        wordTypes: lessonData
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Update local manifest
                    if (!this.assets.manifest.sentenceWords) {
                        this.assets.manifest.sentenceWords = {};
                    }
                    if (!this.assets.manifest.sentenceWords[lang]) {
                        this.assets.manifest.sentenceWords[lang] = {};
                    }
                    this.assets.manifest.sentenceWords[lang][lessonNum] = lessonData;
                    successCount++;
                } else {
                    console.error(`Failed to save lesson ${lessonNum}:`, result.error);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error saving lesson ${lessonNum}:`, error);
                errorCount++;
            }
        }

        this.swEditedLessons.clear();
        this.renderSentenceWordsLessonsList();

        if (errorCount === 0) {
            toastManager?.show(`Saved ${successCount} lesson(s) successfully`, 'success');
        } else {
            toastManager?.show(`Saved ${successCount} lesson(s), ${errorCount} failed`, 'warning');
        }
    } catch (error) {
        console.error('Save error:', error);
        toastManager?.show('Failed to save changes', 'error');
    } finally {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
        this.updateSaveAllButtonState();
    }
};

DeckBuilderModule.prototype.findCardForWord = function(word, lang) {
    const cards = this.assets.manifest?.cards?.[lang] || [];
    const normalize = (str) => (str || '').toLowerCase().trim().replace(/\s*\/\s*/g, '/');
    const searchWord = normalize(word);
    const searchVariants = searchWord.split('/').map(v => v.trim()).filter(v => v);

    for (const card of cards) {
        const cardWord = normalize(card.word);
        const cardVariants = cardWord.split('/').map(v => v.trim()).filter(v => v);

        if (cardWord === searchWord) return card;
        for (const sv of searchVariants) {
            if (cardVariants.includes(sv)) return card;
        }
        if (card.acceptableAnswers) {
            for (const ans of card.acceptableAnswers) {
                if (normalize(ans) === searchWord) return card;
            }
        }
    }
    return null;
};

DeckBuilderModule.prototype.addWordToType = function(wordType) {
    const word = prompt(`Add new word to "${wordType}":`);
    if (!word || !word.trim()) return;

    const trimmedWord = word.trim();
    if (!this.swEditorData[wordType]) {
        this.swEditorData[wordType] = [];
    }

    if (this.swEditorData[wordType].includes(trimmedWord)) {
        toastManager?.show('Word already exists in this category', 'error');
        return;
    }

    this.swEditorData[wordType].push(trimmedWord);
    this.swEditorDirty = true;
    this.renderSentenceWordsEditor();
    toastManager?.show(`Added "${trimmedWord}" to ${wordType}`, 'success');
};

DeckBuilderModule.prototype.editWord = function(wordType, oldWord) {
    const newWord = prompt(`Edit word:`, oldWord);
    if (!newWord || !newWord.trim() || newWord.trim() === oldWord) return;

    const trimmedWord = newWord.trim();
    const index = this.swEditorData[wordType].indexOf(oldWord);
    if (index > -1) {
        this.swEditorData[wordType][index] = trimmedWord;
        this.swEditorDirty = true;
        this.renderSentenceWordsEditor();
        toastManager?.show(`Updated word to "${trimmedWord}"`, 'success');
    }
};

DeckBuilderModule.prototype.deleteWord = function(wordType, word) {
    if (!confirm(`Delete "${word}" from ${wordType}?`)) return;

    const index = this.swEditorData[wordType].indexOf(word);
    if (index > -1) {
        this.swEditorData[wordType].splice(index, 1);
        this.swEditorDirty = true;
        this.renderSentenceWordsEditor();
        toastManager?.show(`Deleted "${word}"`, 'success');
    }
};

DeckBuilderModule.prototype.addNewWordType = function() {
    const typeName = prompt('Enter new word type name (e.g., Adjective, Adverb):');
    if (!typeName || !typeName.trim()) return;

    const trimmedType = typeName.trim();
    if (this.swEditorData[trimmedType]) {
        toastManager?.show('Word type already exists', 'error');
        return;
    }

    this.swEditorData[trimmedType] = [];
    this.swEditorDirty = true;
    this.renderSentenceWordsEditor();
    toastManager?.show(`Added word type "${trimmedType}"`, 'success');
};

DeckBuilderModule.prototype.deleteWordType = function(wordType) {
    const wordCount = this.swEditorData[wordType]?.length || 0;
    if (!confirm(`Delete word type "${wordType}" and its ${wordCount} word(s)?`)) return;

    delete this.swEditorData[wordType];
    this.swEditorDirty = true;
    this.renderSentenceWordsEditor();
    toastManager?.show(`Deleted word type "${wordType}"`, 'success');
};

DeckBuilderModule.prototype.showWordPreview = function(event, word, lang) {
    const card = this.findCardForWord(word, lang);
    const preview = document.getElementById('swCardPreview');

    if (!card) {
        preview.classList.add('hidden');
        return;
    }

    const imageContainer = preview.querySelector('.sw-preview-image');
    const wordEl = preview.querySelector('.sw-preview-word');
    const englishEl = preview.querySelector('.sw-preview-english');

    // Set image
    if (card.printImagePath) {
        imageContainer.innerHTML = `<img src="${card.printImagePath}" alt="${card.word}">`;
    } else {
        imageContainer.innerHTML = '<i class="fas fa-image" style="font-size: 40px; color: var(--text-secondary);"></i>';
    }

    wordEl.textContent = card.word;
    englishEl.textContent = card.english || '';

    // Position near cursor
    const rect = event.target.getBoundingClientRect();
    preview.style.left = rect.left + 'px';
    preview.style.top = (rect.bottom + 8) + 'px';
    preview.classList.remove('hidden');
};

DeckBuilderModule.prototype.hideWordPreview = function() {
    document.getElementById('swCardPreview').classList.add('hidden');
};

DeckBuilderModule.prototype.updateSaveButtonState = function() {
    const saveBtn = document.getElementById('swSaveChanges');
    saveBtn.disabled = !this.swEditorDirty;
};

DeckBuilderModule.prototype.saveSentenceWordsChanges = async function() {
    const lang = document.getElementById('swEditorLanguage').value;
    const lesson = document.getElementById('swEditorLesson').value;

    if (!lang || !lesson) {
        toastManager?.show('Please select language and lesson', 'error');
        return;
    }

    try {
        const response = await fetch('scan-assets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveSentenceWords',
                language: lang,
                lesson: lesson,
                wordTypes: this.swEditorData
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update local manifest
            if (!this.assets.manifest.sentenceWords) {
                this.assets.manifest.sentenceWords = {};
            }
            if (!this.assets.manifest.sentenceWords[lang]) {
                this.assets.manifest.sentenceWords[lang] = {};
            }
            this.assets.manifest.sentenceWords[lang][lesson] = this.swEditorData;

            this.swEditorDirty = false;
            this.updateSaveButtonState();
            toastManager?.show('Sentence words saved successfully', 'success');
        } else {
            toastManager?.show(result.error || 'Failed to save', 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        toastManager?.show('Failed to save changes', 'error');
    }
};

// =================================================================
// SENTENCE REVIEW BUILDER INTEGRATION
// =================================================================

/**
 * Setup the Sentence Review Builder section
 */
DeckBuilderModule.prototype.setupSentenceReviewBuilder = function() {
    // Check if SentenceReviewBuilder class is available
    if (typeof SentenceReviewBuilder === 'undefined') {
        console.warn('SentenceReviewBuilder class not loaded');
        return;
    }

    // Create and store the builder instance
    this.sentenceReviewBuilder = new SentenceReviewBuilder(this);
    this.sentenceReviewBuilder.init();

    debugLogger?.log(2, 'Sentence Review Builder initialized');
};

/**
 * Called when language filter changes - notify sentence review builder
 */
DeckBuilderModule.prototype.notifySentenceReviewBuilderLanguageChange = function(trigraph) {
    if (this.sentenceReviewBuilder) {
        this.sentenceReviewBuilder.onLanguageChange(trigraph);
    }
};
