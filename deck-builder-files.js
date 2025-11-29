// =================================================================
// DECK BUILDER MODULE - FILE MANAGEMENT
// Split from deck-builder-module.js for maintainability
// Contains: File badges, file selection modal, file upload
// =================================================================

/**
 * Create file upload badge for PNG/GIF columns
 */
DeckBuilderModule.prototype.createFileUploadBadge = function(card, type) {
    const container = document.createElement('div');
    container.className = 'file-upload-badge-container';
    const cardId = card.cardNum || card.wordNum;

    let hasFile = false;
    let filename = '';
    let availableFormats = [];

    if (type === 'png') {
        hasFile = !!card.printImagePath;
        filename = card.printImagePath ? card.printImagePath.split('/').pop() : '';
        // Check all available image formats in manifest
        const imageData = this.assets?.manifest?.images?.[cardId] || {};
        if (imageData.png) availableFormats.push('PNG');
        if (imageData.jpg) availableFormats.push('JPG');
        if (imageData.jpeg) availableFormats.push('JPEG');
        if (imageData.webp) availableFormats.push('WebP');
    } else if (type === 'gif') {
        hasFile = card.hasGif || !!card.gifPath;
        filename = card.gifPath ? card.gifPath.split('/').pop() : '';
        // Check all available video/animation formats in manifest
        const imageData = this.assets?.manifest?.images?.[cardId] || {};
        if (imageData.gif) availableFormats.push('GIF');
        if (imageData.mp4) availableFormats.push('MP4');
        if (imageData.webm) availableFormats.push('WebM');
    }

    const badge = document.createElement('span');
    badge.className = `file-badge ${type} ${hasFile ? 'has-file' : 'no-file'} ${this.isAdmin ? 'upload-trigger' : 'disabled-badge'}`;
    badge.dataset.cardId = cardId;
    badge.dataset.fileType = type;

    // Build label: show base filename and format badges
    let labelHTML = '';
    if (hasFile && filename) {
        // Extract base filename without extension
        const baseFilename = filename.replace(/\.(png|jpg|jpeg|webp|gif|mp4|webm)$/i, '');

        // Show formats as small badges if multiple formats exist
        if (availableFormats.length > 1) {
            const formatBadges = availableFormats.map(fmt =>
                `<span class="format-icon" title="${fmt}">${fmt}</span>`
            ).join('');
            labelHTML = `<i class="fas fa-check"></i> ${baseFilename} ${formatBadges}`;
        } else {
            labelHTML = `<i class="fas fa-check"></i> ${filename}`;
        }
    } else {
        labelHTML = `<i class="fas fa-folder-open"></i> ${type.toUpperCase()}`;
    }

    badge.innerHTML = labelHTML;
    badge.title = this.isAdmin
        ? (filename || `Click to select or upload ${type.toUpperCase()} file`)
        : `${type.toUpperCase()} - Admin only`;

    // Only allow click for admin
    if (this.isAdmin) {
        badge.addEventListener('click', () => {
            this.showFileSelectionModal(cardId, type);
        });
    }

    container.appendChild(badge);
    return container;
};

/**
 * Create audio badges for v4.0 - one badge per word variant
 * Supports multi-variant audio (e.g., "Ako/ko" needs 2 badges)
 */
DeckBuilderModule.prototype.createAudioBadge = function(card) {
    const container = document.createElement('div');
    container.className = 'audio-badges-container';
    const cardId = card.cardNum || card.wordNum;

    // Get word variants by splitting on "/"
    const wordVariants = card.word ? card.word.split('/').map(w => w.trim()) : [''];

    // Get audio paths (now an array)
    const audioPaths = Array.isArray(card.audio) ? card.audio : (card.audio ? [card.audio] : []);

    // Create one badge per variant
    wordVariants.forEach((variant, index) => {
        const audioPath = audioPaths[index] || null;
        const hasAudio = !!audioPath;

        const badge = document.createElement('span');
        badge.className = `file-badge audio ${hasAudio ? 'has-file' : 'no-file'} upload-trigger`;
        badge.dataset.cardId = cardId;
        badge.dataset.fileType = 'audio';
        badge.dataset.audioLang = this.currentTrigraph;
        badge.dataset.variantIndex = index;
        badge.dataset.variant = variant;

        // Label: show filename if file exists, otherwise show word variant
        let label = '';
        if (hasAudio) {
            label = audioPath.split('/').pop();  // Show filename
        } else {
            label = variant.toLowerCase();  // Show word variant
        }

        badge.innerHTML = hasAudio
            ? `<i class="fas fa-check"></i> ${label}`
            : `<i class="fas fa-folder-open"></i> ${label}`;

        badge.title = hasAudio
            ? `Audio: ${label}`
            : `Click to upload audio for "${variant}"`;

        badge.addEventListener('click', () => {
            this.showFileSelectionModal(cardId, 'audio', this.currentTrigraph, index, variant);
        });

        container.appendChild(badge);
    });

    return container;
};

/**
 * Handle field edits on card data
 */
DeckBuilderModule.prototype.handleFieldEdit = function(cardId, field, value) {
    // Find card in allCards or newCards
    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) return;

    // Update card data based on field
    if (field === 'lesson') {
        card.lesson = parseInt(value) || 1;
    } else if (field === 'type') {
        card.type = value;
    } else if (field === 'cardNum') {
        const newCardNum = parseInt(value);
        if (!isNaN(newCardNum)) {
            // Update both cardNum and wordNum for compatibility
            card.cardNum = newCardNum;
            card.wordNum = newCardNum;
            // Update the map key
            if (this.editedCards.has(cardId)) {
                const editedCard = this.editedCards.get(cardId);
                this.editedCards.delete(cardId);
                this.editedCards.set(newCardNum, editedCard);
            }
        }
    } else if (field === 'word') {
        // v4.0: direct property
        card.word = value;
        card.acceptableAnswers = [value];
    } else if (field === 'english') {
        // v4.0: direct property
        card.english = value;
        card.englishAcceptable = [value];
    }

    // Mark as edited
    const currentCardId = card.cardNum || card.wordNum;
    if (!this.editedCards.has(currentCardId)) {
        this.editedCards.set(currentCardId, card);
    }

    this.updateUnsavedIndicator();
};

/**
 * Show the file selection modal
 */
DeckBuilderModule.prototype.showFileSelectionModal = function(cardId, fileType, audioLang = null, variantIndex = 0, variant = '') {
    // Find card and get current file
    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) return;

    // Store variant info for later use
    this.currentVariantIndex = variantIndex;
    this.currentVariant = variant;

    // Determine current file path
    let currentFilePath = null;
    let currentFileName = 'No file selected';

    if (fileType === 'png') {
        currentFilePath = card.printImagePath;
    } else if (fileType === 'gif') {
        currentFilePath = card.gifPath || (card.hasGif ? card.imagePath : null);
    } else if (fileType === 'audio') {
        // v4.0: audio is array now, get specific variant's audio
        const audioPaths = Array.isArray(card.audio) ? card.audio : (card.audio ? [card.audio] : []);
        currentFilePath = audioPaths[variantIndex] || null;
    }

    // Determine modal title based on file type
    let modalTitle = '';
    if (fileType === 'png') {
        modalTitle = 'Select Image File (PNG/JPG/JPEG/WebP)';
    } else if (fileType === 'gif') {
        modalTitle = 'Select Video/Animation File (GIF/MP4/WebM)';
    } else if (fileType === 'audio') {
        modalTitle = `Select Audio File (MP3/M4A) ${audioLang ? `(${audioLang.toUpperCase()})` : ''}`;
    }

    // Get all linked files for this card from manifest.images
    const linkedFiles = [];
    const imageData = this.assets?.manifest?.images?.[cardId] || {};

    if (fileType === 'png') {
        // Show all static image formats
        if (imageData.png) linkedFiles.push({ format: 'PNG', path: imageData.png });
        if (imageData.jpg) linkedFiles.push({ format: 'JPG', path: imageData.jpg });
        if (imageData.jpeg) linkedFiles.push({ format: 'JPEG', path: imageData.jpeg });
        if (imageData.webp) linkedFiles.push({ format: 'WebP', path: imageData.webp });
    } else if (fileType === 'gif') {
        // Show all video/animation formats
        if (imageData.gif) linkedFiles.push({ format: 'GIF', path: imageData.gif });
        if (imageData.mp4) linkedFiles.push({ format: 'MP4', path: imageData.mp4 });
        if (imageData.webm) linkedFiles.push({ format: 'WebM', path: imageData.webm });
    }

    // Build current files display
    let currentFilesHTML = '';
    if (linkedFiles.length > 0) {
        currentFilesHTML = `
            <div class="linked-files-list">
                ${linkedFiles.map(file => `
                    <div class="linked-file-item">
                        <span class="format-badge">${file.format}</span>
                        <span class="file-name">${file.path.split('/').pop()}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (currentFilePath) {
        currentFilesHTML = `<span class="current-file-name">${currentFileName}</span>`;
    } else {
        currentFilesHTML = `<span class="current-file-name">No file selected</span>`;
    }

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'file-selection-modal';
    modal.innerHTML = `
        <div class="file-selection-content">
            <div class="file-selection-header">
                <h3>
                    <i class="fas fa-file"></i>
                    ${modalTitle}
                </h3>
                <button class="close-modal-btn" id="closeFileModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="file-selection-tabs">
                <button class="tab-btn active" data-tab="browse">
                    <i class="fas fa-folder-open"></i> Browse Server (/assets)
                </button>
                <button class="tab-btn" data-tab="upload">
                    <i class="fas fa-upload"></i> Upload New File
                </button>
                ${fileType === 'audio' ? `
                <button class="tab-btn" data-tab="record">
                    <i class="fas fa-microphone"></i> Record Audio
                </button>
                ` : ''}
            </div>

            <div class="file-selection-body">
                <!-- Browse Tab -->
                <div class="tab-content active" id="browseTab">
                    <!-- Current File Preview -->
                    <div class="current-file-preview" id="currentFilePreview">
                        <div class="current-file-header">
                            <strong><i class="fas fa-link"></i> Linked Files for Card #${cardId}:</strong>
                            ${currentFilesHTML}
                        </div>
                        <div class="current-file-display" id="currentFileDisplay">
                            ${this.generateCurrentFilePreview(currentFilePath, fileType)}
                        </div>
                    </div>

                    <div class="file-browser-controls">
                        <input type="text" id="fileBrowserSearch" class="form-input"
                            placeholder="Search files...">
                        <select id="fileBrowserFilter" class="select-control">
                            <option value="all">All Files</option>
                            ${fileType === 'png' ? `
                                <option value="png">PNG Only</option>
                                <option value="jpg">JPG Only</option>
                                <option value="webp">WebP Only</option>
                            ` : ''}
                            ${fileType === 'gif' ? `
                                <option value="gif">GIF Only</option>
                                <option value="mp4">MP4 Only</option>
                                <option value="webm">WebM Only</option>
                            ` : ''}
                            ${fileType === 'audio' ? `
                                <option value="mp3">MP3 Only</option>
                                <option value="m4a">M4A Only</option>
                            ` : ''}
                        </select>
                    </div>
                    <div class="file-browser-grid" id="fileBrowserGrid">
                        <div class="loading-files">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading files...</p>
                        </div>
                    </div>
                </div>

                <!-- Upload Tab -->
                <div class="tab-content" id="uploadTab">
                    <div class="upload-dropzone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop file here, or click to select</p>
                        <button id="selectFileBtn" class="btn btn-primary">
                            <i class="fas fa-folder-open"></i> Select File
                        </button>
                        <input type="file" id="fileUploadInput" style="display:none;">
                    </div>
                </div>

                ${fileType === 'audio' ? `
                <!-- Record Tab -->
                <div class="tab-content" id="recordTab">
                    <div class="record-container" id="recordContainer">
                        <!-- Recording View -->
                        <div class="record-view" id="recordView">
                            <div class="record-status" id="recordStatus">
                                <i class="fas fa-microphone"></i>
                                <p>Click Record to start</p>
                            </div>
                            <div class="countdown-display hidden" id="countdownDisplay">
                                <span class="countdown-number">3</span>
                            </div>
                            <button class="btn btn-record" id="startRecordBtn">
                                <i class="fas fa-microphone"></i> Record
                            </button>
                            <button class="btn btn-stop hidden" id="stopRecordBtn">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        </div>

                        <!-- Editor View -->
                        <div class="editor-view hidden" id="editorView">
                            <div class="waveform-container">
                                <canvas id="waveformCanvas" width="600" height="150"></canvas>
                                <div class="marker marker-start" id="markerStart"></div>
                                <div class="marker marker-end" id="markerEnd"></div>
                                <div class="playhead" id="playhead"></div>
                            </div>
                            <div class="editor-time-display">
                                <span id="currentTime">0:00</span> / <span id="totalTime">0:00</span>
                            </div>
                            <div class="editor-controls">
                                <button class="btn btn-sm btn-secondary" id="editorPlayBtn" title="Play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorPauseBtn" title="Pause">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorStopBtn" title="Stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                                <button class="btn btn-sm btn-warning" id="editorCutBtn" title="Cut to markers">
                                    <i class="fas fa-cut"></i> Cut
                                </button>
                                <button class="btn btn-sm btn-primary" id="editorSaveBtn" title="Save">
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button class="btn btn-sm btn-secondary" id="editorRerecordBtn" title="Record again">
                                    <i class="fas fa-microphone"></i> Re-record
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            const tab = e.target.dataset.tab;
            let tabId = 'browseTab';
            if (tab === 'upload') tabId = 'uploadTab';
            else if (tab === 'record') tabId = 'recordTab';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Close modal
    const closeModal = () => {
        // Clean up audio recorder if active
        if (this.audioRecorder) {
            this.cleanupAudioRecorder();
        }
        // Safely remove modal if it's still in the DOM
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    };
    modal.querySelector('#closeFileModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Setup audio playback for current file if it's audio
    if (fileType === 'audio' && currentFilePath) {
        const playBtn = modal.querySelector('#playCurrentAudio');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                const audio = new Audio(currentFilePath);
                audio.play();
            });
        }
    }

    // Load server files
    this.loadServerFiles(fileType, audioLang);

    // Setup file browser search
    modal.querySelector('#fileBrowserSearch').addEventListener('input', (e) => {
        this.filterServerFiles(e.target.value, modal.querySelector('#fileBrowserFilter').value);
    });

    modal.querySelector('#fileBrowserFilter').addEventListener('change', (e) => {
        this.filterServerFiles(modal.querySelector('#fileBrowserSearch').value, e.target.value);
    });

    // Setup upload button
    modal.querySelector('#selectFileBtn').addEventListener('click', () => {
        modal.querySelector('#fileUploadInput').click();
    });

    modal.querySelector('#fileUploadInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            this.handleFileUpload(cardId, fileType, audioLang, file);
            closeModal();
        }
    });

    // Setup recording functionality for audio files
    if (fileType === 'audio') {
        this.setupAudioRecorder(modal, cardId, audioLang, closeModal);
    }

    // Store reference for file selection
    this.currentFileSelectionContext = { cardId, fileType, audioLang, modal, closeModal };
};

/**
 * Load files from server
 */
DeckBuilderModule.prototype.loadServerFiles = async function(fileType, audioLang) {
    try {
        // Map fileType for list-assets.php
        const apiFileType = fileType === 'audio' ? 'audio' : fileType;

        // CACHE PREVENTION: Add timestamp and no-cache headers
        const timestamp = new Date().getTime();
        const response = await fetch(`list-assets.php?type=${apiFileType}&_=${timestamp}`, {
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
            this.serverFiles = result.files;
            this.displayServerFiles(this.serverFiles);
        } else {
            document.getElementById('fileBrowserGrid').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Could not load server files</p>
                    <small>${result.error || 'Unknown error'}</small>
                </div>
            `;
        }
    } catch (err) {
        document.getElementById('fileBrowserGrid').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading files from server</p>
                <small>${err.message}</small>
            </div>
        `;
        debugLogger?.log(1, `Error loading server files: ${err.message}`);
    }
};

/**
 * Display server files in the grid
 */
DeckBuilderModule.prototype.displayServerFiles = function(files) {
    const grid = document.getElementById('fileBrowserGrid');

    if (!files || files.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-folder-open"></i>
                <p>No files found in /assets folder</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-browser-item';
        fileItem.dataset.filename = file.name;
        fileItem.dataset.filepath = file.path;
        fileItem.dataset.filetype = file.type;

        let preview = '';
        let isAudio = false;

        if (file.type === 'png' || file.type === 'gif') {
            preview = `<img src="${file.path}" alt="${file.name}">`;
        } else if (file.type === 'audio') {
            preview = `<i class="fas fa-file-audio"></i>`;
            isAudio = true;
        } else {
            preview = `<i class="fas fa-file"></i>`;
        }

        // For audio files, make filename much more prominent
        const filenameDisplay = isAudio
            ? `<div class="file-name audio-filename" title="${file.name}">${file.name}</div>`
            : `<div class="file-name" title="${file.name}">${file.name}</div>`;

        fileItem.innerHTML = `
            <div class="file-preview ${isAudio ? 'audio-preview' : ''}">${preview}</div>
            <div class="file-info">
                ${filenameDisplay}
                <div class="file-meta">
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                    ${isAudio ? '<span class="audio-play-btn" title="Preview audio"><i class="fas fa-play"></i></span>' : ''}
                </div>
            </div>
        `;

        // Click to select file
        fileItem.addEventListener('click', (e) => {
            // Don't select if clicking play button
            if (e.target.closest('.audio-play-btn')) {
                const audio = new Audio(file.path);
                audio.play();
                return;
            }
            this.selectExistingFile(file);
        });

        grid.appendChild(fileItem);
    });
};

/**
 * Filter server files by search and type
 */
DeckBuilderModule.prototype.filterServerFiles = function(searchTerm, filterType) {
    if (!this.serverFiles) return;

    let filtered = this.serverFiles;

    // Apply type filter
    if (filterType !== 'all') {
        filtered = filtered.filter(f => f.type === filterType);
    }

    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(f => f.name.toLowerCase().includes(term));
    }

    this.displayServerFiles(filtered);
};

/**
 * Validate filename against naming convention
 */
DeckBuilderModule.prototype.validateFilename = function(cardNum, filename, fileType, audioLang = null) {
    const ext = filename.split('.').pop().toLowerCase();

    // Check if filename starts with cardNum
    const startsWithNum = filename.match(/^(\d+)\./);

    let expectedPattern = '';
    let isValid = false;

    if (fileType === 'png') {
        expectedPattern = `${cardNum}.*.*.png (or .jpg, .jpeg, .webp)`;
        isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
    } else if (fileType === 'gif') {
        expectedPattern = `${cardNum}.*.*.gif (or .mp4, .webm)`;
        isValid = startsWithNum && parseInt(startsWithNum[1]) === cardNum && ['gif', 'mp4', 'webm'].includes(ext);
    } else if (fileType === 'audio') {
        expectedPattern = `${cardNum}.${audioLang}.*.mp3 or .m4a`;
        const audioMatch = filename.match(/^(\d+)\.([a-z]{3})\./);
        isValid = audioMatch &&
                  parseInt(audioMatch[1]) === cardNum &&
                  audioMatch[2] === audioLang &&
                  (ext === 'mp3' || ext === 'm4a');
    }

    return {
        isValid,
        expectedPattern,
        actualFilename: filename
    };
};

/**
 * Generate a suggested filename for a card
 */
DeckBuilderModule.prototype.generateSuggestedFilename = function(card, fileType, audioLang = null, actualExtension = null) {
    const cardId = card.cardNum || card.wordNum;
    const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
    const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';

    if (fileType === 'png') {
        const ext = actualExtension || 'png';
        return `${cardId}.${word}.${english}.${ext}`;
    } else if (fileType === 'gif') {
        const ext = actualExtension || 'gif';
        return `${cardId}.${word}.${english}.${ext}`;
    } else if (fileType === 'audio' && audioLang) {
        const ext = actualExtension || 'mp3';
        return `${cardId}.${audioLang}.${word}.${english}.${ext}`;
    }

    return null;
};

/**
 * Show rename warning dialog when file doesn't match naming convention
 */
DeckBuilderModule.prototype.showRenameWarning = function(file, card, fileType, audioLang = null) {
    const cardId = card.cardNum || card.wordNum;
    const validation = this.validateFilename(cardId, file.name, fileType, audioLang);

    if (validation.isValid) {
        // File is properly named, proceed normally
        this.linkFileToCard(file, card, fileType, audioLang);
        return;
    }

    // File has incorrect name - show warning
    // Extract the actual extension from the file to preserve it in the suggested name
    const actualExt = file.name.split('.').pop().toLowerCase();
    const suggestedName = this.generateSuggestedFilename(card, fileType, audioLang, actualExt);

    const modal = document.createElement('div');
    modal.className = 'modal rename-warning-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white;">
                <h2>
                    <i class="fas fa-exclamation-triangle"></i>
                    Filename Convention Warning
                </h2>
            </div>

            <div class="modal-body" style="padding: 24px;">
                <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                    <strong style="color: #856404;">This file doesn't follow the naming convention!</strong>
                    <p style="margin: 8px 0 0 0; color: #856404; font-size: 14px;">
                        If you link it as-is, it will be <strong>unlinked</strong> when you run "Rescan Assets" in the future.
                    </p>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-file"></i> Current Filename:
                    </label>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; color: #e74c3c; font-weight: 600;">
                        ${validation.actualFilename}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-check-circle"></i> Expected Pattern:
                    </label>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; color: #7f8c8d; font-size: 13px;">
                        ${validation.expectedPattern}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-magic"></i> Suggested Filename:
                    </label>
                    <input type="text" id="renameInput" class="form-input"
                        value="${suggestedName}"
                        style="font-family: monospace; color: #27ae60; font-weight: 600;">
                    <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                        <i class="fas fa-info-circle"></i> You can edit this before renaming
                    </p>
                </div>
            </div>

            <div class="modal-footer" style="padding: 16px 24px; background: #f8f9fa; border-top: 1px solid #dee2e6;">
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="renameAndLinkBtn" class="btn btn-success">
                        <i class="fas fa-check"></i> Rename & Link
                    </button>
                    <button id="linkAnywayBtn" class="btn btn-warning">
                        <i class="fas fa-link"></i> Link Anyway
                    </button>
                    <button id="cancelLinkBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const renameInput = document.getElementById('renameInput');
    const renameAndLinkBtn = document.getElementById('renameAndLinkBtn');
    const linkAnywayBtn = document.getElementById('linkAnywayBtn');
    const cancelLinkBtn = document.getElementById('cancelLinkBtn');

    const closeModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    };

    // Rename and link
    renameAndLinkBtn.addEventListener('click', async () => {
        const newFilename = renameInput.value.trim();

        if (!newFilename) {
            toastManager.show('Please enter a filename', 'error');
            return;
        }

        renameAndLinkBtn.disabled = true;
        renameAndLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renaming...';

        const success = await this.renameFileOnServer(file.name, newFilename);

        if (success) {
            file.name = newFilename;
            file.path = 'assets/' + newFilename;
            this.linkFileToCard(file, card, fileType, audioLang);
            closeModal();
            toastManager.show(`File renamed and linked successfully!`, 'success', 4000);
        } else {
            renameAndLinkBtn.disabled = false;
            renameAndLinkBtn.innerHTML = '<i class="fas fa-check"></i> Rename & Link';
        }
    });

    // Link anyway
    linkAnywayBtn.addEventListener('click', () => {
        this.linkFileToCard(file, card, fileType, audioLang);
        closeModal();
        toastManager.show('File linked (may be unlinked on future scans)', 'warning', 4000);
    });

    // Cancel
    cancelLinkBtn.addEventListener('click', closeModal);

    // Close on escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    setTimeout(() => renameInput.focus(), 100);
};

/**
 * Rename file on server
 */
DeckBuilderModule.prototype.renameFileOnServer = async function(oldFilename, newFilename) {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`rename-asset.php?_=${timestamp}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                oldFilename: oldFilename,
                newFilename: newFilename
            }),
            cache: 'no-store'
        });

        const result = await response.json();

        if (result.success) {
            debugLogger?.log(2, `File renamed: ${oldFilename} -> ${newFilename}`);
            return true;
        } else {
            toastManager.show(`Rename failed: ${result.error}`, 'error', 5000);
            return false;
        }
    } catch (err) {
        toastManager.show(`Error renaming file: ${err.message}`, 'error', 5000);
        return false;
    }
};

/**
 * Link a file to a card
 */
DeckBuilderModule.prototype.linkFileToCard = function(file, card, fileType, audioLang = null) {
    if (fileType === 'png') {
        card.printImagePath = file.path;
    } else if (fileType === 'gif') {
        card.gifPath = file.path;
        card.hasGif = true;
    } else if (fileType === 'audio') {
        // v4.0: audio is now array (multi-variant support)
        // Ensure audio is array
        if (!Array.isArray(card.audio)) {
            card.audio = card.audio ? [card.audio] : [];
        }

        // Get variant index from stored context
        const variantIndex = this.currentVariantIndex || 0;

        // Pad array with nulls if needed
        while (card.audio.length <= variantIndex) {
            card.audio.push(null);
        }

        // Set audio at variant index
        card.audio[variantIndex] = file.path;
        card.hasAudio = card.audio.some(p => p !== null && p !== undefined && p !== '');
    }

    // Mark as edited
    const cardId = card.cardNum || card.wordNum;
    this.editedCards.set(cardId, card);

    // Re-render
    this.filterAndRenderCards();
    this.updateUnsavedIndicator();
};

/**
 * Select an existing file from the browser
 */
DeckBuilderModule.prototype.selectExistingFile = function(file) {
    const { cardId, fileType, audioLang, closeModal } = this.currentFileSelectionContext;

    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) return;

    closeModal();
    this.showRenameWarning(file, card, fileType, audioLang);
};

/**
 * Format file size for display
 */
DeckBuilderModule.prototype.formatFileSize = function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Handle file upload
 */
DeckBuilderModule.prototype.handleFileUpload = async function(cardId, fileType, audioLang = null, file = null) {
    if (!file) {
        const input = document.createElement('input');
        input.type = 'file';

        if (fileType === 'png') {
            input.accept = 'image/png,image/jpeg,image/webp';
        } else if (fileType === 'gif') {
            input.accept = 'image/gif,video/mp4,video/webm';
        } else if (fileType === 'audio') {
            input.accept = 'audio/mp3,audio/mpeg,audio/m4a';
        }

        input.onchange = async (e) => {
            const selectedFile = e.target.files[0];
            if (selectedFile) {
                this.handleFileUpload(cardId, fileType, audioLang, selectedFile);
            }
        };

        input.click();
        return;
    }

    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) return;

    // For PNG and GIF, show filename dialog
    if (fileType === 'png' || fileType === 'gif') {
        // Generate default filename
        const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
        const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
        // Get the actual file extension from the uploaded file
        const actualExt = file.name.split('.').pop().toLowerCase();
        const defaultFilename = `${cardId}.${word}.${english}.${actualExt}`;

        // Create preview URL for the uploaded file
        const previewUrl = URL.createObjectURL(file);

        // Show filename dialog with preview
        this.showFilenameDialog(defaultFilename, async (finalFilename) => {
            toastManager.show(`Uploading ${finalFilename}...`, 'warning', 2000);

            try {
                // Upload the file to the server
                const formData = new FormData();
                formData.append('media', file);
                formData.append('filename', finalFilename);

                const response = await fetch('upload-media.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Upload failed');
                }

                // Update card path with uploaded file
                if (fileType === 'png') {
                    card.printImagePath = result.path;
                } else if (fileType === 'gif') {
                    card.gifPath = result.path;
                    card.hasGif = true;
                }

                this.editedCards.set(cardId, card);
                this.filterAndRenderCards();
                this.updateUnsavedIndicator();

                // Clean up preview URL
                URL.revokeObjectURL(previewUrl);

                // Close the file selection modal if it's open
                if (this.currentFileSelectionContext && this.currentFileSelectionContext.closeModal) {
                    this.currentFileSelectionContext.closeModal();
                }

                toastManager.show(`File uploaded as ${finalFilename}. Remember to save changes.`, 'success');
            } catch (error) {
                toastManager.show(`Upload failed: ${error.message}`, 'error');
                console.error('Upload error:', error);
            }
        }, previewUrl, fileType);
        return;
    }

    // For audio, use direct upload (recording has its own dialog)
    toastManager.show(`Uploading ${file.name}...`, 'warning', 2000);

    // Generate proper filename for audio
    const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
    const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
    const ext = file.name.split('.').pop();

    if (fileType === 'audio' && audioLang) {
        card.audio = `assets/${cardId}.${audioLang}.${word}.${english}.${ext}`;
        card.hasAudio = true;
    }

    this.editedCards.set(cardId, card);
    this.filterAndRenderCards();
    this.updateUnsavedIndicator();

    toastManager.show(`File uploaded! Remember to save changes.`, 'success');
};
