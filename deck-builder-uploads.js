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
