// =================================================================
// SENTENCE REVIEW BUILDER - Deck Builder Addon
// Version 1.0 - November 2025
// Provides UI for creating and editing sentence review data
// =================================================================

/**
 * SentenceReviewBuilder - Manages the sentence review editor in deck builder
 * This is instantiated by DeckBuilderModule and adds a collapsible section
 */
class SentenceReviewBuilder {
    constructor(deckBuilder) {
        this.deckBuilder = deckBuilder;
        this.currentTrigraph = 'ceb';
        this.lessons = {}; // Loaded sentence review data
        this.editedLessons = new Set(); // Track which lessons have been edited
        this.expandedLessons = new Set(); // Track expanded lessons
        this.expandedSequences = new Set(); // Track expanded sequences (format: "lessonNum-seqIndex")
        this.sortableInstances = []; // Track SortableJS instances for cleanup
    }

    /**
     * Render the sentence review builder section
     * @returns {string} HTML string for the section
     */
    renderSection() {
        return `
            <div class="deck-section collapsible collapsed" id="sentenceReviewSection" data-section="sentence-review">
                <h3 class="section-title" role="button" tabindex="0">
                    <i class="fas fa-images"></i> Sentence Review Data
                    <i class="fas fa-chevron-down section-chevron"></i>
                </h3>
                <div class="section-content">
                    <div class="section-card">
                        <p class="section-description">
                            Create and edit sentence review lessons. Sentences are displayed as a row of pictures representing each word.
                        </p>

                        <!-- Import Section with Tabs -->
                        <div class="sr-builder-import">
                            <div class="sr-import-tabs">
                                <button class="sr-import-tab active" data-tab="text">
                                    <i class="fas fa-font"></i> Text Import
                                </button>
                                <button class="sr-import-tab" data-tab="csv">
                                    <i class="fas fa-file-csv"></i> CSV Import
                                </button>
                            </div>

                            <!-- Text Import Tab -->
                            <div class="sr-import-tab-content active" id="srTextImportTab">
                                <h4><i class="fas fa-file-import"></i> Import from Text</h4>
                                <textarea id="srImportText" class="sr-import-textarea" placeholder="Paste sentence text here...

Example format:
SEQUENCE 1: Finding the Book

Asa ang libro? (Where is the book?)
Ang libro sa lamesa. (The book is on the table.)
Kuhaa {kuha} ang libro. (Get the book.)

SEQUENCE 2: What Is This?

Unsa kini? (What is this?)
Kini ang bolpen. (This is the ballpen.)"></textarea>
                                <div class="sr-import-actions">
                                    <select id="srImportLesson" class="select-control">
                                        <option value="">Select Target Lesson...</option>
                                    </select>
                                    <button id="srParseBtn" class="btn btn-primary">
                                        <i class="fas fa-magic"></i> Parse & Preview
                                    </button>
                                </div>
                            </div>

                            <!-- CSV Import Tab -->
                            <div class="sr-import-tab-content" id="srCSVImportTab">
                                <h4><i class="fas fa-file-csv"></i> Import from CSV</h4>
                                <p class="sr-csv-description">
                                    Upload a CSV file with columns: Lesson #, Seq #, Sequ Title, Sentence #, Sentence Text, English Translation, Sentence Type
                                </p>
                                <div class="sr-csv-upload-area" id="srCSVDropZone">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drag & drop CSV file here or click to browse</p>
                                    <input type="file" id="srCSVFileInput" accept=".csv" class="sr-csv-file-input">
                                </div>
                                <div class="sr-csv-file-info hidden" id="srCSVFileInfo">
                                    <i class="fas fa-file-csv"></i>
                                    <span id="srCSVFileName"></span>
                                    <button class="sr-csv-remove-btn" id="srCSVRemoveBtn" title="Remove file">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="sr-import-actions">
                                    <button id="srParseCSVBtn" class="btn btn-primary" disabled>
                                        <i class="fas fa-magic"></i> Parse CSV & Preview
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Preview Section -->
                        <div class="sr-builder-preview hidden" id="srPreviewSection">
                            <h4><i class="fas fa-search"></i> Preview Parsed Data</h4>
                            <div id="srPreviewContent"></div>
                            <div class="sr-preview-actions">
                                <button id="srApplyParseBtn" class="btn btn-success">
                                    <i class="fas fa-check"></i> Apply to Lesson
                                </button>
                                <button id="srCancelParseBtn" class="btn btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>

                        <!-- Lessons List -->
                        <div class="sr-builder-lessons">
                            <h4>
                                <i class="fas fa-list"></i> Lessons with Sentence Review Data
                                <button id="srAddLessonBtn" class="btn btn-sm btn-success">
                                    <i class="fas fa-plus"></i> Add Lesson
                                </button>
                            </h4>
                            <div id="srLessonsList" class="sr-lessons-list">
                                <!-- Lessons will be rendered here -->
                            </div>
                        </div>

                        <div class="section-actions">
                            <button id="srSaveAllBtn" class="btn btn-primary" disabled>
                                <i class="fas fa-save"></i> Save Sentence Review Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize the builder after DOM is ready
     */
    init() {
        try {
            this.loadData();
            this.setupEventListeners();
            this.populateLessonSelector();
            this.renderLessonsList();
        } catch (err) {
            console.error('[SentenceReviewBuilder] Initialization error:', err);
        }
    }

    /**
     * Load sentence review data from manifest
     */
    loadData() {
        const manifest = this.deckBuilder.assets.manifest;
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        // Get existing sentence review data
        this.lessons = {};
        const srData = manifest?.sentenceReview?.[this.currentTrigraph]?.lessons;
        if (srData) {
            // Deep clone to avoid mutating manifest
            this.lessons = JSON.parse(JSON.stringify(srData));
        }

        debugLogger?.log(3, `SentenceReviewBuilder: Loaded ${Object.keys(this.lessons).length} lessons`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Import tab switching
        document.querySelectorAll('.sr-import-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sr-import-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.sr-import-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.dataset.tab === 'text' ? 'srTextImportTab' : 'srCSVImportTab';
                document.getElementById(tabId)?.classList.add('active');
            });
        });

        // Parse button (text import)
        document.getElementById('srParseBtn')?.addEventListener('click', () => this.parseAndPreview());

        // CSV file input
        const csvInput = document.getElementById('srCSVFileInput');
        const dropZone = document.getElementById('srCSVDropZone');

        csvInput?.addEventListener('change', (e) => this.handleCSVFileSelect(e.target.files[0]));

        // Drag and drop for CSV
        dropZone?.addEventListener('click', () => csvInput?.click());
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.name.toLowerCase().endsWith('.csv')) {
                this.handleCSVFileSelect(file);
            } else {
                toastManager?.show('Please drop a CSV file', 'warning');
            }
        });

        // Remove CSV file button
        document.getElementById('srCSVRemoveBtn')?.addEventListener('click', () => this.clearCSVFile());

        // Parse CSV button
        document.getElementById('srParseCSVBtn')?.addEventListener('click', () => this.parseCSVAndPreview());

        // Apply parsed data
        document.getElementById('srApplyParseBtn')?.addEventListener('click', () => this.applyParsedData());

        // Cancel parse
        document.getElementById('srCancelParseBtn')?.addEventListener('click', () => {
            document.getElementById('srPreviewSection').classList.add('hidden');
            this.parsedData = null;
            this.parsedLessons = null;
        });

        // Add lesson button
        document.getElementById('srAddLessonBtn')?.addEventListener('click', () => this.addNewLesson());

        // Save all button
        document.getElementById('srSaveAllBtn')?.addEventListener('click', () => this.saveAll());
    }

    /**
     * Handle CSV file selection
     */
    handleCSVFileSelect(file) {
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toastManager?.show('Please select a CSV file', 'error');
            return;
        }

        this.csvFile = file;
        document.getElementById('srCSVDropZone')?.classList.add('hidden');
        document.getElementById('srCSVFileInfo')?.classList.remove('hidden');
        document.getElementById('srCSVFileName').textContent = file.name;
        document.getElementById('srParseCSVBtn').disabled = false;
    }

    /**
     * Clear selected CSV file
     */
    clearCSVFile() {
        this.csvFile = null;
        document.getElementById('srCSVFileInput').value = '';
        document.getElementById('srCSVDropZone')?.classList.remove('hidden');
        document.getElementById('srCSVFileInfo')?.classList.add('hidden');
        document.getElementById('srParseCSVBtn').disabled = true;
    }

    /**
     * Parse CSV file and show preview
     */
    async parseCSVAndPreview() {
        if (!this.csvFile) {
            toastManager?.show('Please select a CSV file', 'warning');
            return;
        }

        try {
            const text = await this.csvFile.text();
            const allCards = this.deckBuilder.assets.getCards({ lesson: null });

            // Parse CSV into lessons structure
            this.parsedLessons = SentenceReviewParser.parseCSV(text, allCards);

            if (!this.parsedLessons || Object.keys(this.parsedLessons).length === 0) {
                toastManager?.show('No valid data found in CSV', 'error');
                return;
            }

            // Show preview
            this.renderCSVPreview();
        } catch (err) {
            toastManager?.show(`Error parsing CSV: ${err.message}`, 'error');
            debugLogger?.log(1, `CSV parse error: ${err.message}`);
        }
    }

    /**
     * Render CSV preview with multiple lessons
     */
    renderCSVPreview() {
        const previewSection = document.getElementById('srPreviewSection');
        const previewContent = document.getElementById('srPreviewContent');

        if (!this.parsedLessons || Object.keys(this.parsedLessons).length === 0) {
            previewContent.innerHTML = '<p class="error-text">No valid data found in CSV.</p>';
            previewSection.classList.remove('hidden');
            return;
        }

        const lessonNums = Object.keys(this.parsedLessons).map(Number).sort((a, b) => a - b);
        let totalSequences = 0;
        let totalSentences = 0;

        lessonNums.forEach(num => {
            const lesson = this.parsedLessons[num];
            totalSequences += lesson.sequences?.length || 0;
            lesson.sequences?.forEach(seq => {
                totalSentences += seq.sentences?.length || 0;
            });
        });

        let html = `
            <div class="sr-csv-preview-summary">
                <span class="summary-item"><i class="fas fa-book"></i> ${lessonNums.length} Lesson(s)</span>
                <span class="summary-item"><i class="fas fa-list"></i> ${totalSequences} Sequence(s)</span>
                <span class="summary-item"><i class="fas fa-comment"></i> ${totalSentences} Sentence(s)</span>
            </div>
        `;

        lessonNums.forEach(lessonNum => {
            const lesson = this.parsedLessons[lessonNum];
            html += `
                <div class="sr-preview-lesson">
                    <div class="sr-preview-lesson-header">
                        <i class="fas fa-book"></i>
                        <strong>Lesson ${lessonNum}</strong>
                        <span class="sequence-count">${lesson.sequences?.length || 0} sequences</span>
                    </div>
            `;

            lesson.sequences?.forEach((sequence, seqIndex) => {
                html += `
                    <div class="sr-preview-sequence">
                        <div class="sr-preview-seq-header">
                            <strong>Sequence ${sequence.id}:</strong> ${sequence.title}
                            <span class="sentence-count">${sequence.sentences?.length || 0} sentences</span>
                        </div>
                        <div class="sr-preview-sentences">
                `;

                sequence.sentences?.forEach((sentence, sentIndex) => {
                    const withPic = sentence.words?.filter(w => w.imagePath).length || 0;
                    const withoutPic = sentence.words?.filter(w => !w.imagePath).length || 0;
                    const needsRes = sentence.words?.filter(w => w.needsResolution).length || 0;

                    // Sentence type badge
                    const typeClass = sentence.sentenceType ? `type-${sentence.sentenceType.toLowerCase()}` : '';
                    const typeBadge = sentence.sentenceType ?
                        `<span class="sr-sentence-type-badge ${typeClass}">${sentence.sentenceType}</span>` : '';

                    html += `
                        <div class="sr-preview-sentence">
                            <div class="sr-preview-sent-text">
                                ${sentence.text}
                                ${typeBadge}
                            </div>
                            <div class="sr-preview-sent-english">${sentence.english}</div>
                            <div class="sr-preview-words">
                    `;

                    sentence.words?.forEach(word => {
                        if (word.imagePath) {
                            const needsResClass = word.needsResolution ? ' needs-resolution' : '';
                            const resTitle = word.needsResolution ? ' - Auto-assigned via root' : '';
                            html += `
                                <div class="sr-preview-word has-pic${needsResClass}" title="${word.word}${word.root ? ' (root: ' + word.root + ')' : ''}${resTitle}">
                                    <img src="${word.imagePath}" alt="${word.word}">
                                    ${word.needsResolution ? '<span class="resolution-flag">⚠️</span>' : ''}
                                </div>
                            `;
                        } else {
                            html += `
                                <div class="sr-preview-word no-pic" title="No picture found for: ${word.word}">
                                    <span>${word.word}</span>
                                </div>
                            `;
                        }
                    });

                    html += `
                            </div>
                            <div class="sr-preview-stats">
                                <span class="stat-good">${withPic} with pictures</span>
                                ${withoutPic > 0 ? `<span class="stat-warn">${withoutPic} without pictures</span>` : ''}
                                ${needsRes > 0 ? `<span class="stat-resolution">⚠️ ${needsRes} need review</span>` : ''}
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        previewContent.innerHTML = html;
        previewSection.classList.remove('hidden');
    }

    /**
     * Populate lesson selector dropdown
     */
    populateLessonSelector() {
        const select = document.getElementById('srImportLesson');
        if (!select) return;

        select.innerHTML = '<option value="">Select Target Lesson...</option>';

        // Get all lessons for current language
        const lessons = this.deckBuilder.assets.lessons || [];
        lessons.forEach(lessonNum => {
            const option = document.createElement('option');
            option.value = lessonNum;
            option.textContent = `Lesson ${lessonNum}`;
            select.appendChild(option);
        });
    }

    /**
     * Parse text input and show preview
     */
    parseAndPreview() {
        const textInput = document.getElementById('srImportText').value.trim();
        const targetLesson = document.getElementById('srImportLesson').value;

        if (!textInput) {
            toastManager?.show('Please enter text to parse', 'warning');
            return;
        }

        if (!targetLesson) {
            toastManager?.show('Please select a target lesson', 'warning');
            return;
        }

        // Get all cards for word lookup
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });

        // Parse the input
        this.parsedData = SentenceReviewParser.parseInput(textInput, allCards);
        this.parsedTargetLesson = parseInt(targetLesson);

        // Show preview
        this.renderPreview();
    }

    /**
     * Render preview of parsed data
     */
    renderPreview() {
        const previewSection = document.getElementById('srPreviewSection');
        const previewContent = document.getElementById('srPreviewContent');

        if (!this.parsedData || this.parsedData.sequences.length === 0) {
            previewContent.innerHTML = '<p class="error-text">No valid sequences found. Check your input format.</p>';
            previewSection.classList.remove('hidden');
            return;
        }

        let html = `<p class="preview-summary">Found ${this.parsedData.sequences.length} sequence(s) for Lesson ${this.parsedTargetLesson}</p>`;

        this.parsedData.sequences.forEach((sequence, seqIndex) => {
            html += `
                <div class="sr-preview-sequence">
                    <div class="sr-preview-seq-header">
                        <strong>Sequence ${sequence.id}:</strong> ${sequence.title}
                        <span class="sentence-count">${sequence.sentences.length} sentences</span>
                    </div>
                    <div class="sr-preview-sentences">
            `;

            sequence.sentences.forEach((sentence, sentIndex) => {
                // Count words with and without pictures
                const withPic = sentence.words.filter(w => w.imagePath).length;
                const withoutPic = sentence.words.filter(w => !w.imagePath).length;
                const needsRes = sentence.words.filter(w => w.needsResolution).length;

                html += `
                    <div class="sr-preview-sentence">
                        <div class="sr-preview-sent-text">${sentence.text}</div>
                        <div class="sr-preview-sent-english">${sentence.english}</div>
                        <div class="sr-preview-words">
                `;

                sentence.words.forEach(word => {
                    if (word.imagePath) {
                        const needsResClass = word.needsResolution ? ' needs-resolution' : '';
                        const resTitle = word.needsResolution ? ' ⚠️ Auto-assigned via root - needs review' : '';
                        html += `
                            <div class="sr-preview-word has-pic${needsResClass}" title="${word.word}${word.root ? ' (root: ' + word.root + ')' : ''}${resTitle}">
                                <img src="${word.imagePath}" alt="${word.word}">
                                ${word.needsResolution ? '<span class="resolution-flag" title="Needs review">⚠️</span>' : ''}
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="sr-preview-word no-pic" title="No picture found for: ${word.word}">
                                <span>${word.word}</span>
                            </div>
                        `;
                    }
                });

                html += `
                        </div>
                        <div class="sr-preview-stats">
                            <span class="stat-good">${withPic} with pictures</span>
                            ${withoutPic > 0 ? `<span class="stat-warn">${withoutPic} without pictures</span>` : ''}
                            ${needsRes > 0 ? `<span class="stat-resolution">⚠️ ${needsRes} need review</span>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        previewContent.innerHTML = html;
        previewSection.classList.remove('hidden');
    }

    /**
     * Apply parsed data to the target lesson
     */
    applyParsedData() {
        // Handle CSV import (multiple lessons)
        if (this.parsedLessons && Object.keys(this.parsedLessons).length > 0) {
            let lessonsApplied = 0;

            for (const [lessonNum, lessonData] of Object.entries(this.parsedLessons)) {
                this.lessons[lessonNum] = lessonData;
                this.editedLessons.add(parseInt(lessonNum));
                lessonsApplied++;
            }

            // Clear CSV parse state
            this.parsedLessons = null;
            this.clearCSVFile();
            document.getElementById('srPreviewSection').classList.add('hidden');

            // Re-render lessons list
            this.renderLessonsList();
            this.updateSaveButton();

            toastManager?.show(`${lessonsApplied} lesson(s) imported from CSV`, 'success');
            return;
        }

        // Handle text import (single lesson)
        if (!this.parsedData || !this.parsedTargetLesson) return;

        // Create or update lesson data
        this.lessons[this.parsedTargetLesson] = {
            title: `Lesson ${this.parsedTargetLesson} Sentences`,
            sequences: this.parsedData.sequences
        };

        this.editedLessons.add(this.parsedTargetLesson);

        // Clear parse state
        this.parsedData = null;
        this.parsedTargetLesson = null;
        document.getElementById('srPreviewSection').classList.add('hidden');
        document.getElementById('srImportText').value = '';
        document.getElementById('srImportLesson').value = '';

        // Re-render lessons list
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sentence review data applied', 'success');
    }

    /**
     * Render the lessons list with collapsible hierarchy
     */
    renderLessonsList() {
        const container = document.getElementById('srLessonsList');
        if (!container) return;

        try {
            const lessonNums = Object.keys(this.lessons || {}).map(Number).sort((a, b) => a - b);

        if (lessonNums.length === 0) {
            container.innerHTML = `
                <div class="sr-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No sentence review data yet. Import text above or add a new lesson.</p>
                </div>
            `;
            return;
        }

        let html = '';

        lessonNums.forEach(lessonNum => {
            const lesson = this.lessons[lessonNum];
            const isExpanded = this.expandedLessons.has(lessonNum);
            const isEdited = this.editedLessons.has(lessonNum);

            html += `
                <div class="sr-lesson-item ${isExpanded ? 'expanded' : ''}" data-lesson="${lessonNum}">
                    <div class="sr-lesson-header" data-lesson="${lessonNum}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="lesson-title">Lesson ${lessonNum}: ${lesson.title || 'Untitled'}</span>
                        <span class="sequence-count">${lesson.sequences?.length || 0} sequences</span>
                        ${isEdited ? '<span class="edited-badge">Modified</span>' : ''}
                        <button class="btn btn-sm btn-danger sr-delete-lesson" data-lesson="${lessonNum}" title="Delete lesson">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sr-lesson-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSequences(lessonNum, lesson.sequences || [])}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners
        this.attachLessonListeners();
        } catch (err) {
            console.error('[SentenceReviewBuilder] Error rendering lessons list:', err);
            container.innerHTML = `
                <div class="sr-empty-state error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading sentence review data. Please refresh the page.</p>
                </div>
            `;
        }
    }

    /**
     * Render sequences for a lesson
     */
    renderSequences(lessonNum, sequences) {
        if (!sequences || sequences.length === 0) {
            return '<p class="sr-no-sequences">No sequences in this lesson</p>';
        }

        let html = '<div class="sr-sequences-list">';

        sequences.forEach((sequence, seqIndex) => {
            const seqKey = `${lessonNum}-${seqIndex}`;
            const isExpanded = this.expandedSequences.has(seqKey);

            html += `
                <div class="sr-sequence-item ${isExpanded ? 'expanded' : ''}" data-lesson="${lessonNum}" data-seq="${seqIndex}">
                    <div class="sr-sequence-header" data-lesson="${lessonNum}" data-seq="${seqIndex}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="sequence-title">Sequence ${sequence.id}: ${sequence.title || 'Untitled'}</span>
                        <span class="sentence-count">${sequence.sentences?.length || 0} sentences</span>
                        <button class="btn btn-sm btn-secondary sr-edit-sequence" data-lesson="${lessonNum}" data-seq="${seqIndex}" title="Edit sequence">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger sr-delete-sequence" data-lesson="${lessonNum}" data-seq="${seqIndex}" title="Delete sequence">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sr-sequence-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSentences(lessonNum, seqIndex, sequence.sentences || [])}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success sr-add-sequence" data-lesson="${lessonNum}">
                <i class="fas fa-plus"></i> Add Sequence
            </button>
        </div>`;

        return html;
    }

    /**
     * Render sentences for a sequence with pictures
     */
    renderSentences(lessonNum, seqIndex, sentences) {
        if (!sentences || sentences.length === 0) {
            return '<p class="sr-no-sentences">No sentences in this sequence</p>';
        }

        let html = '<div class="sr-sentences-list">';

        sentences.forEach((sentence, sentIndex) => {
            // Sentence type badge
            const typeClass = sentence.sentenceType ? `type-${sentence.sentenceType.toLowerCase()}` : '';
            const typeBadge = sentence.sentenceType ?
                `<span class="sr-sentence-type-badge ${typeClass}">${sentence.sentenceType}</span>` : '';

            html += `
                <div class="sr-sentence-item" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}">
                    <div class="sr-sentence-header">
                        <span class="sentence-num">${sentIndex + 1}.</span>
                        <span class="sentence-text">${sentence.text}</span>
                        ${typeBadge}
                        <span class="sentence-english">(${sentence.english})</span>
                        <button class="btn btn-xs btn-secondary sr-edit-sentence" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" title="Edit sentence">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="sr-sentence-pictures">
                        ${this.renderWordPictures(lessonNum, seqIndex, sentIndex, sentence.words || [])}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success sr-add-sentence" data-lesson="${lessonNum}" data-seq="${seqIndex}">
                <i class="fas fa-plus"></i> Add Sentence
            </button>
        </div>`;

        return html;
    }

    /**
     * Render word pictures in a row with drag-and-drop support
     */
    renderWordPictures(lessonNum, seqIndex, sentIndex, words) {
        // Always show the row container for drag-and-drop and add functionality
        let html = `<div class="sr-word-pictures-row" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}">`;

        if (words && Array.isArray(words) && words.length > 0) {
            words.forEach((word, wordIndex) => {
                // Skip invalid word objects
                if (!word || typeof word !== 'object') return;

                if (word.imagePath) {
                    const needsResClass = word.needsResolution ? ' needs-resolution' : '';
                    const resTitle = word.needsResolution ? ' ⚠️ Auto-assigned via root - needs review' : '';
                    html += `
                        <div class="sr-word-pic${needsResClass}" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" data-word="${wordIndex}" draggable="true">
                            <div class="sr-drag-handle" title="Drag to reorder">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <img src="${word.imagePath}" alt="${word.word}" title="${word.word}${word.root ? ' (root: ' + word.root + ')' : ''}${resTitle}">
                            <span class="word-label">${word.word}</span>
                            ${word.needsResolution ? '<span class="resolution-flag" title="Auto-assigned via root - click to review">⚠️</span>' : ''}
                            <button class="sr-change-pic-btn" title="Change picture">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="sr-delete-word-btn" title="Delete word">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="sr-word-pic no-pic" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" data-word="${wordIndex}" draggable="true">
                            <div class="sr-drag-handle" title="Drag to reorder">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <span class="word-text">${word.word}</span>
                            <button class="sr-assign-pic-btn" title="Assign picture">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="sr-delete-word-btn" title="Delete word">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }
            });
        }

        // Add word button at the end
        html += `
            <div class="sr-add-word-btn" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" title="Add word/card">
                <i class="fas fa-plus"></i>
            </div>
        `;

        html += '</div>';
        return html;
    }

    /**
     * Attach event listeners to lesson list items
     */
    attachLessonListeners() {
        // Lesson expand/collapse
        document.querySelectorAll('.sr-lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const lessonNum = parseInt(header.dataset.lesson);
                this.toggleLesson(lessonNum);
            });
        });

        // Sequence expand/collapse
        document.querySelectorAll('.sr-sequence-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const lessonNum = parseInt(header.dataset.lesson);
                const seqIndex = parseInt(header.dataset.seq);
                this.toggleSequence(lessonNum, seqIndex);
            });
        });

        // Delete lesson buttons
        document.querySelectorAll('.sr-delete-lesson').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonNum = parseInt(btn.dataset.lesson);
                this.deleteLesson(lessonNum);
            });
        });

        // Delete sequence buttons
        document.querySelectorAll('.sr-delete-sequence').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonNum = parseInt(btn.dataset.lesson);
                const seqIndex = parseInt(btn.dataset.seq);
                this.deleteSequence(lessonNum, seqIndex);
            });
        });

        // Add sequence buttons
        document.querySelectorAll('.sr-add-sequence').forEach(btn => {
            btn.addEventListener('click', () => {
                const lessonNum = parseInt(btn.dataset.lesson);
                this.addSequence(lessonNum);
            });
        });

        // Add sentence buttons
        document.querySelectorAll('.sr-add-sentence').forEach(btn => {
            btn.addEventListener('click', () => {
                const lessonNum = parseInt(btn.dataset.lesson);
                const seqIndex = parseInt(btn.dataset.seq);
                this.addSentence(lessonNum, seqIndex);
            });
        });

        // Edit sentence buttons
        document.querySelectorAll('.sr-edit-sentence').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonNum = parseInt(btn.dataset.lesson);
                const seqIndex = parseInt(btn.dataset.seq);
                const sentIndex = parseInt(btn.dataset.sent);
                this.editSentence(lessonNum, seqIndex, sentIndex);
            });
        });

        // Change picture buttons
        document.querySelectorAll('.sr-change-pic-btn, .sr-assign-pic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordPic = btn.closest('.sr-word-pic');
                const lessonNum = parseInt(wordPic.dataset.lesson);
                const seqIndex = parseInt(wordPic.dataset.seq);
                const sentIndex = parseInt(wordPic.dataset.sent);
                const wordIndex = parseInt(wordPic.dataset.word);
                this.openPictureSelector(lessonNum, seqIndex, sentIndex, wordIndex);
            });
        });

        // Delete word buttons
        document.querySelectorAll('.sr-delete-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordPic = btn.closest('.sr-word-pic');
                const lessonNum = parseInt(wordPic.dataset.lesson);
                const seqIndex = parseInt(wordPic.dataset.seq);
                const sentIndex = parseInt(wordPic.dataset.sent);
                const wordIndex = parseInt(wordPic.dataset.word);
                this.deleteWord(lessonNum, seqIndex, sentIndex, wordIndex);
            });
        });

        // Add word buttons
        document.querySelectorAll('.sr-add-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonNum = parseInt(btn.dataset.lesson);
                const seqIndex = parseInt(btn.dataset.seq);
                const sentIndex = parseInt(btn.dataset.sent);
                this.addWord(lessonNum, seqIndex, sentIndex);
            });
        });

        // Initialize SortableJS for word picture rows
        this.initSortableWordRows();
    }

    /**
     * Initialize SortableJS for drag-and-drop reordering of words
     */
    initSortableWordRows() {
        // Destroy existing instances
        this.sortableInstances.forEach(instance => instance.destroy());
        this.sortableInstances = [];

        // Initialize Sortable on each word pictures row
        if (typeof Sortable !== 'undefined') {
            document.querySelectorAll('.sr-word-pictures-row').forEach(row => {
                const lessonNum = parseInt(row.dataset.lesson);
                const seqIndex = parseInt(row.dataset.seq);
                const sentIndex = parseInt(row.dataset.sent);

                const sortable = new Sortable(row, {
                    animation: 150,
                    handle: '.sr-drag-handle',
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    dragClass: 'sortable-drag',
                    filter: '.sr-add-word-btn', // Don't drag the add button
                    onEnd: (evt) => {
                        // Don't process if dropped on the add button
                        if (evt.newIndex >= this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex].words.length) {
                            // Re-render to reset position
                            this.renderLessonsList();
                            return;
                        }
                        this.onWordReorder(lessonNum, seqIndex, sentIndex, evt.oldIndex, evt.newIndex);
                    }
                });
                this.sortableInstances.push(sortable);
            });
        }
    }

    /**
     * Handle word reordering after drag-and-drop
     */
    onWordReorder(lessonNum, seqIndex, sentIndex, oldIndex, newIndex) {
        if (oldIndex === newIndex) return;

        const words = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex].words;
        const [movedWord] = words.splice(oldIndex, 1);
        words.splice(newIndex, 0, movedWord);

        this.editedLessons.add(lessonNum);
        this.updateSaveButton();

        // Update sentence text to reflect new word order
        this.updateSentenceText(lessonNum, seqIndex, sentIndex);

        // Re-render to update data-word indices
        this.renderLessonsList();

        toastManager?.show('Word order updated', 'success');
    }

    /**
     * Update sentence text based on current word order
     */
    updateSentenceText(lessonNum, seqIndex, sentIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
        // Reconstruct text from words (preserving punctuation would require more complex handling)
        sentence.text = sentence.words.map(w => w.word).join(' ');
    }

    /**
     * Delete a word from a sentence
     */
    deleteWord(lessonNum, seqIndex, sentIndex, wordIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
        const word = sentence.words[wordIndex];

        if (!confirm(`Delete "${word.word}" from this sentence?`)) return;

        sentence.words.splice(wordIndex, 1);
        this.updateSentenceText(lessonNum, seqIndex, sentIndex);

        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Word deleted', 'success');
    }

    /**
     * Add a new word to a sentence
     */
    addWord(lessonNum, seqIndex, sentIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];

        // Show a modal to select what to add
        this.openAddWordModal(lessonNum, seqIndex, sentIndex);
    }

    /**
     * Open modal to add a new word (function word or card)
     */
    openAddWordModal(lessonNum, seqIndex, sentIndex) {
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });

        const modal = document.createElement('div');
        modal.className = 'modal sr-add-word-modal';
        modal.id = 'srAddWordModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-plus"></i> Add Word to Sentence</h2>
                    <button class="close-btn" id="srCloseAddWordModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sr-add-word-tabs">
                        <button class="sr-add-word-tab active" data-tab="function">
                            <i class="fas fa-font"></i> Function Word
                        </button>
                        <button class="sr-add-word-tab" data-tab="card">
                            <i class="fas fa-image"></i> Picture Card
                        </button>
                    </div>

                    <div class="sr-add-word-content" id="functionWordTab">
                        <p>Add a word without a picture (function words like "ang", "sa", etc.)</p>
                        <input type="text" id="srFunctionWordInput" class="form-control" placeholder="Enter word...">
                        <button id="srAddFunctionWordBtn" class="btn btn-success" style="margin-top: 12px;">
                            <i class="fas fa-plus"></i> Add Function Word
                        </button>
                    </div>

                    <div class="sr-add-word-content hidden" id="cardWordTab">
                        <div class="sr-search-bar">
                            <input type="text" id="srCardSearch" placeholder="Search cards...">
                            <button id="srCardSearchBtn" class="btn btn-primary">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                        <div class="sr-pic-grid" id="srCardGrid">
                            <p class="hint-text">Search for a card to add</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        modal.querySelectorAll('.sr-add-word-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.sr-add-word-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.getElementById('functionWordTab').classList.toggle('hidden', tab.dataset.tab !== 'function');
                document.getElementById('cardWordTab').classList.toggle('hidden', tab.dataset.tab !== 'card');
            });
        });

        // Add function word
        document.getElementById('srAddFunctionWordBtn')?.addEventListener('click', () => {
            const word = document.getElementById('srFunctionWordInput').value.trim();
            if (!word) {
                toastManager?.show('Please enter a word', 'warning');
                return;
            }

            const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
            sentence.words.push({
                word: word,
                root: null,
                cardNum: null,
                imagePath: null,
                needsResolution: false
            });

            this.updateSentenceText(lessonNum, seqIndex, sentIndex);
            this.editedLessons.add(lessonNum);
            this.renderLessonsList();
            this.updateSaveButton();

            modal.remove();
            toastManager?.show('Function word added', 'success');
        });

        // Card search
        const renderCardResults = (searchTerm) => {
            const grid = document.getElementById('srCardGrid');
            const term = searchTerm.toLowerCase();

            if (!term) {
                grid.innerHTML = '<p class="hint-text">Search for a card to add</p>';
                return;
            }

            const matchingCards = allCards.filter(card => {
                const wordMatch = card.word?.toLowerCase().includes(term);
                const englishMatch = card.english?.toLowerCase().includes(term);
                return wordMatch || englishMatch;
            }).slice(0, 50);

            if (matchingCards.length === 0) {
                grid.innerHTML = '<p class="no-results">No matching cards found</p>';
                return;
            }

            grid.innerHTML = matchingCards.map(card => `
                <div class="sr-pic-option" data-cardnum="${card.cardNum}" data-word="${card.word}" data-imagepath="${card.printImagePath || ''}">
                    ${card.printImagePath ? `<img src="${card.printImagePath}" alt="${card.word}">` : '<div class="no-image">No Image</div>'}
                    <span class="card-word">${card.word}</span>
                    <span class="card-english">${card.english}</span>
                </div>
            `).join('');

            // Add click handlers
            grid.querySelectorAll('.sr-pic-option').forEach(option => {
                option.addEventListener('click', () => {
                    const cardNum = parseInt(option.dataset.cardnum);
                    const word = option.dataset.word;
                    const imagePath = option.dataset.imagepath;

                    const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
                    sentence.words.push({
                        word: word,
                        root: null,
                        cardNum: cardNum,
                        imagePath: imagePath || null,
                        needsResolution: false
                    });

                    this.updateSentenceText(lessonNum, seqIndex, sentIndex);
                    this.editedLessons.add(lessonNum);
                    this.renderLessonsList();
                    this.updateSaveButton();

                    modal.remove();
                    toastManager?.show('Card added', 'success');
                });
            });
        };

        document.getElementById('srCardSearchBtn')?.addEventListener('click', () => {
            renderCardResults(document.getElementById('srCardSearch').value);
        });

        document.getElementById('srCardSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                renderCardResults(e.target.value);
            }
        });

        // Close modal
        document.getElementById('srCloseAddWordModal')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Toggle lesson expansion
     */
    toggleLesson(lessonNum) {
        if (this.expandedLessons.has(lessonNum)) {
            this.expandedLessons.delete(lessonNum);
        } else {
            this.expandedLessons.add(lessonNum);
        }
        this.renderLessonsList();
    }

    /**
     * Toggle sequence expansion
     */
    toggleSequence(lessonNum, seqIndex) {
        const key = `${lessonNum}-${seqIndex}`;
        if (this.expandedSequences.has(key)) {
            this.expandedSequences.delete(key);
        } else {
            this.expandedSequences.add(key);
        }
        this.renderLessonsList();
    }

    /**
     * Add a new lesson
     */
    addNewLesson() {
        const lessonNum = prompt('Enter lesson number:');
        if (!lessonNum || isNaN(parseInt(lessonNum))) return;

        const num = parseInt(lessonNum);
        if (this.lessons[num]) {
            toastManager?.show('Lesson already exists', 'warning');
            return;
        }

        this.lessons[num] = {
            title: `Lesson ${num} Sentences`,
            sequences: []
        };

        this.editedLessons.add(num);
        this.expandedLessons.add(num);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Lesson added', 'success');
    }

    /**
     * Delete a lesson
     */
    deleteLesson(lessonNum) {
        if (!confirm(`Delete all sentence review data for Lesson ${lessonNum}?`)) return;

        delete this.lessons[lessonNum];
        this.editedLessons.add(lessonNum);
        this.expandedLessons.delete(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Lesson deleted', 'success');
    }

    /**
     * Add a sequence to a lesson
     */
    addSequence(lessonNum) {
        const title = prompt('Enter sequence title:');
        if (!title) return;

        const sequences = this.lessons[lessonNum].sequences || [];
        const nextId = sequences.length > 0 ? Math.max(...sequences.map(s => s.id)) + 1 : 1;

        sequences.push({
            id: nextId,
            title: title,
            sentences: []
        });

        this.lessons[lessonNum].sequences = sequences;
        this.editedLessons.add(lessonNum);
        this.expandedSequences.add(`${lessonNum}-${sequences.length - 1}`);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sequence added', 'success');
    }

    /**
     * Delete a sequence
     */
    deleteSequence(lessonNum, seqIndex) {
        if (!confirm('Delete this sequence?')) return;

        this.lessons[lessonNum].sequences.splice(seqIndex, 1);
        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sequence deleted', 'success');
    }

    /**
     * Add a sentence to a sequence
     */
    addSentence(lessonNum, seqIndex) {
        const text = prompt('Enter sentence (Cebuano):');
        if (!text) return;

        const english = prompt('Enter English translation:');
        if (!english) return;

        const sentences = this.lessons[lessonNum].sequences[seqIndex].sentences || [];
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });

        // Parse words
        const words = SentenceReviewParser.parseWords(text, allCards);

        sentences.push({
            id: sentences.length + 1,
            text: text.replace(/\s*\{[^}]+\}/g, ''), // Clean display text
            english: english,
            words: words
        });

        this.lessons[lessonNum].sequences[seqIndex].sentences = sentences;
        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sentence added', 'success');
    }

    /**
     * Edit a sentence
     */
    editSentence(lessonNum, seqIndex, sentIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];

        const newText = prompt('Edit sentence (Cebuano):', sentence.text);
        if (newText === null) return;

        const newEnglish = prompt('Edit English translation:', sentence.english);
        if (newEnglish === null) return;

        // Re-parse words if text changed
        if (newText !== sentence.text) {
            const allCards = this.deckBuilder.assets.getCards({ lesson: null });
            sentence.words = SentenceReviewParser.parseWords(newText, allCards);
            sentence.text = newText.replace(/\s*\{[^}]+\}/g, '');
        }

        sentence.english = newEnglish;

        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sentence updated', 'success');
    }

    /**
     * Open picture selector modal for a word
     */
    openPictureSelector(lessonNum, seqIndex, sentIndex, wordIndex) {
        const word = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex].words[wordIndex];
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal sr-picture-modal';
        modal.id = 'srPictureModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-image"></i> Select Picture for "${word.word}"</h2>
                    <button class="close-btn" id="srClosePicModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sr-search-bar">
                        <input type="text" id="srPicSearch" placeholder="Search cards..." value="${word.word}">
                        <button id="srPicSearchBtn" class="btn btn-primary">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <div class="sr-pic-grid" id="srPicGrid">
                        <!-- Cards will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Render initial results
        const renderResults = (searchTerm) => {
            const grid = document.getElementById('srPicGrid');
            const term = searchTerm.toLowerCase();

            const matchingCards = allCards.filter(card => {
                const wordMatch = card.word?.toLowerCase().includes(term);
                const englishMatch = card.english?.toLowerCase().includes(term);
                return wordMatch || englishMatch;
            }).slice(0, 50); // Limit to 50 results

            if (matchingCards.length === 0) {
                grid.innerHTML = '<p class="no-results">No matching cards found</p>';
                return;
            }

            grid.innerHTML = matchingCards.map(card => `
                <div class="sr-pic-option" data-cardnum="${card.cardNum}" data-imagepath="${card.printImagePath || ''}">
                    ${card.printImagePath ? `<img src="${card.printImagePath}" alt="${card.word}">` : '<div class="no-image">No Image</div>'}
                    <span class="card-word">${card.word}</span>
                    <span class="card-english">${card.english}</span>
                </div>
            `).join('');

            // Add click handlers
            grid.querySelectorAll('.sr-pic-option').forEach(option => {
                option.addEventListener('click', () => {
                    const cardNum = parseInt(option.dataset.cardnum);
                    const imagePath = option.dataset.imagepath;

                    // Update word data
                    word.cardNum = cardNum;
                    word.imagePath = imagePath || null;

                    this.editedLessons.add(lessonNum);
                    this.renderLessonsList();
                    this.updateSaveButton();

                    // Close modal
                    modal.remove();
                    toastManager?.show('Picture updated', 'success');
                });
            });
        };

        // Initial render
        renderResults(word.word);

        // Search functionality
        document.getElementById('srPicSearchBtn')?.addEventListener('click', () => {
            const term = document.getElementById('srPicSearch').value;
            renderResults(term);
        });

        document.getElementById('srPicSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                renderResults(e.target.value);
            }
        });

        // Close modal
        document.getElementById('srClosePicModal')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        const btn = document.getElementById('srSaveAllBtn');
        if (btn) {
            btn.disabled = this.editedLessons.size === 0;
        }
    }

    /**
     * Save all sentence review data
     */
    async saveAll() {
        try {
            const trigraph = this.currentTrigraph;

            // Prepare data for saving
            const saveData = {
                trigraph: trigraph,
                sentenceReview: {
                    lessons: this.lessons
                }
            };

            // Post to backend
            const response = await fetch('save-deck.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigraph: trigraph,
                    cards: this.deckBuilder.allCards, // Keep existing cards
                    sentenceReview: saveData.sentenceReview
                })
            });

            const result = await response.json();

            if (result.success) {
                this.editedLessons.clear();
                this.updateSaveButton();
                toastManager?.show('Sentence review data saved', 'success');

                // Reload manifest
                await this.deckBuilder.assets.loadManifest();
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (err) {
            toastManager?.show(`Save failed: ${err.message}`, 'error');
            debugLogger?.log(1, `SentenceReviewBuilder save error: ${err.message}`);
        }
    }

    /**
     * Called when language changes in deck builder
     */
    onLanguageChange(trigraph) {
        this.currentTrigraph = trigraph;
        this.editedLessons.clear();
        this.expandedLessons.clear();
        this.expandedSequences.clear();
        this.loadData();
        this.populateLessonSelector();
        this.renderLessonsList();
        this.updateSaveButton();
    }
}
