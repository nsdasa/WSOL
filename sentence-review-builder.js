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
        this.loadData();
        this.setupEventListeners();
        this.populateLessonSelector();
        this.renderLessonsList();
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

        const lessonNums = Object.keys(this.lessons).map(Number).sort((a, b) => a - b);

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
                        <button class="btn btn-xs btn-danger sr-delete-sentence" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" title="Delete sentence">
                            <i class="fas fa-trash"></i>
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
     * Render word pictures with bubble layout and connection lines
     * Layout: Word bubbles on top -> Connection lines -> Deduplicated pictures on bottom
     */
    renderWordPictures(lessonNum, seqIndex, sentIndex, words) {
        const sentenceKey = `${lessonNum}-${seqIndex}-${sentIndex}`;

        // Build a map of unique pictures (by cardNum) and which word indices link to them
        const pictureMap = new Map(); // cardNum -> { card info, wordIndices: [] }
        const wordsWithPictures = [];

        if (words && words.length > 0) {
            words.forEach((word, wordIndex) => {
                if (word.cardNum && word.imagePath) {
                    if (!pictureMap.has(word.cardNum)) {
                        pictureMap.set(word.cardNum, {
                            cardNum: word.cardNum,
                            imagePath: word.imagePath,
                            wordIndices: []
                        });
                    }
                    pictureMap.get(word.cardNum).wordIndices.push(wordIndex);
                    wordsWithPictures.push(wordIndex);
                }
            });
        }

        let html = `<div class="sr-bubble-layout" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}">`;

        // === BUBBLES ROW ===
        html += `<div class="sr-bubbles-row" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}">`;

        if (words && words.length > 0) {
            words.forEach((word, wordIndex) => {
                const hasPicture = !!(word.cardNum && word.imagePath);
                const needsResClass = word.needsResolution ? ' needs-resolution' : '';
                const functionClass = hasPicture ? '' : ' function-word';

                html += `
                    <div class="sr-word-bubble${functionClass}${needsResClass}"
                         data-lesson="${lessonNum}"
                         data-seq="${seqIndex}"
                         data-sent="${sentIndex}"
                         data-word="${wordIndex}"
                         data-cardnum="${word.cardNum || ''}"
                         draggable="true"
                         title="Click to ${hasPicture ? 'change' : 'add'} picture link">
                        <div class="sr-bubble-text">${word.word}${word.root ? ' <span class="sr-root-hint">(root: ' + word.root + ')</span>' : ''}</div>
                        ${word.needsResolution ? '<span class="sr-bubble-warning" title="Auto-assigned via root - needs review">⚠️</span>' : ''}
                        <div class="sr-bubble-actions">
                            <button class="sr-bubble-edit-btn" title="Edit word">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="sr-bubble-link-btn" title="${hasPicture ? 'Change picture link' : 'Link to picture'}">
                                <i class="fas fa-link"></i>
                            </button>
                            <button class="sr-bubble-delete-btn" title="Delete word">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="sr-drag-handle" title="Drag to reorder">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                    </div>
                `;
            });
        }

        // Add word button
        html += `
            <div class="sr-add-word-btn" data-lesson="${lessonNum}" data-seq="${seqIndex}" data-sent="${sentIndex}" title="Add word">
                <i class="fas fa-plus"></i>
            </div>
        `;

        html += '</div>'; // End bubbles row

        // === SVG CONNECTION LINES (placeholder - drawn after render) ===
        html += `<svg class="sr-connection-lines" data-sentence="${sentenceKey}"></svg>`;

        // === PICTURES ROW (deduplicated) ===
        html += `<div class="sr-pictures-row">`;

        if (pictureMap.size > 0) {
            // Create array of pictures in order of first word that links to them
            const picturesInOrder = [];
            const seenCardNums = new Set();

            words.forEach((word, wordIndex) => {
                if (word.cardNum && pictureMap.has(word.cardNum) && !seenCardNums.has(word.cardNum)) {
                    seenCardNums.add(word.cardNum);
                    picturesInOrder.push(pictureMap.get(word.cardNum));
                }
            });

            picturesInOrder.forEach(picInfo => {
                const linkedWords = picInfo.wordIndices.map(i => words[i].word).join(', ');
                html += `
                    <div class="sr-picture-slot"
                         data-cardnum="${picInfo.cardNum}"
                         data-word-indices="${picInfo.wordIndices.join(',')}"
                         title="Linked to: ${linkedWords}">
                        <div class="sr-slot-card">
                            <img src="${picInfo.imagePath}" alt="Card ${picInfo.cardNum}">
                            ${picInfo.wordIndices.length > 1 ? `<span class="sr-multi-link-badge">${picInfo.wordIndices.length}</span>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        // Add placeholder slots for function words (to maintain visual alignment)
        words.forEach((word, wordIndex) => {
            if (!word.cardNum || !word.imagePath) {
                html += `
                    <div class="sr-picture-slot no-picture" data-word="${wordIndex}">
                        <div class="sr-no-picture-dot"></div>
                    </div>
                `;
            }
        });

        html += '</div>'; // End pictures row
        html += '</div>'; // End bubble layout

        return html;
    }

    /**
     * Draw connection lines for a sentence after DOM is rendered
     */
    drawConnectionLines(sentenceKey) {
        const svg = document.querySelector(`.sr-connection-lines[data-sentence="${sentenceKey}"]`);
        if (!svg) return;

        const layoutContainer = svg.closest('.sr-bubble-layout');
        if (!layoutContainer) return;

        const bubblesRow = layoutContainer.querySelector('.sr-bubbles-row');
        const picturesRow = layoutContainer.querySelector('.sr-pictures-row');
        if (!bubblesRow || !picturesRow) return;

        // Clear existing lines
        svg.innerHTML = '';

        const containerRect = layoutContainer.getBoundingClientRect();

        // Set SVG dimensions
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';

        // Get all bubbles with pictures
        const bubbles = bubblesRow.querySelectorAll('.sr-word-bubble:not(.function-word)');

        bubbles.forEach(bubble => {
            const cardNum = bubble.dataset.cardnum;
            if (!cardNum) return;

            // Find the picture slot for this cardNum
            const pictureSlot = picturesRow.querySelector(`.sr-picture-slot[data-cardnum="${cardNum}"]`);
            if (!pictureSlot) return;

            const bubbleRect = bubble.getBoundingClientRect();
            const pictureRect = pictureSlot.getBoundingClientRect();

            // Calculate positions relative to container
            const startX = bubbleRect.left - containerRect.left + bubbleRect.width / 2;
            const startY = bubbleRect.bottom - containerRect.top;
            const endX = pictureRect.left - containerRect.left + pictureRect.width / 2;
            const endY = pictureRect.top - containerRect.top;

            // Create line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', endY);
            line.setAttribute('class', 'sr-connection-line');
            svg.appendChild(line);
        });
    }

    /**
     * Redraw all connection lines (called after layout changes)
     */
    redrawAllConnectionLines() {
        document.querySelectorAll('.sr-bubble-layout').forEach(layout => {
            const lessonNum = layout.dataset.lesson;
            const seqIndex = layout.dataset.seq;
            const sentIndex = layout.dataset.sent;
            const sentenceKey = `${lessonNum}-${seqIndex}-${sentIndex}`;
            this.drawConnectionLines(sentenceKey);
        });
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

        // Delete sentence buttons
        document.querySelectorAll('.sr-delete-sentence').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonNum = parseInt(btn.dataset.lesson);
                const seqIndex = parseInt(btn.dataset.seq);
                const sentIndex = parseInt(btn.dataset.sent);
                this.deleteSentence(lessonNum, seqIndex, sentIndex);
            });
        });

        // Bubble edit buttons (edit word text)
        document.querySelectorAll('.sr-bubble-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bubble = btn.closest('.sr-word-bubble');
                const lessonNum = parseInt(bubble.dataset.lesson);
                const seqIndex = parseInt(bubble.dataset.seq);
                const sentIndex = parseInt(bubble.dataset.sent);
                const wordIndex = parseInt(bubble.dataset.word);
                this.editWordText(lessonNum, seqIndex, sentIndex, wordIndex);
            });
        });

        // Bubble link buttons (link to picture)
        document.querySelectorAll('.sr-bubble-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bubble = btn.closest('.sr-word-bubble');
                const lessonNum = parseInt(bubble.dataset.lesson);
                const seqIndex = parseInt(bubble.dataset.seq);
                const sentIndex = parseInt(bubble.dataset.sent);
                const wordIndex = parseInt(bubble.dataset.word);
                this.openPictureLinkModal(lessonNum, seqIndex, sentIndex, wordIndex);
            });
        });

        // Bubble delete buttons
        document.querySelectorAll('.sr-bubble-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bubble = btn.closest('.sr-word-bubble');
                const lessonNum = parseInt(bubble.dataset.lesson);
                const seqIndex = parseInt(bubble.dataset.seq);
                const sentIndex = parseInt(bubble.dataset.sent);
                const wordIndex = parseInt(bubble.dataset.word);
                this.deleteWord(lessonNum, seqIndex, sentIndex, wordIndex);
            });
        });

        // Word bubble click - open picture link modal (click on bubble itself, not buttons)
        document.querySelectorAll('.sr-word-bubble').forEach(bubble => {
            bubble.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons or drag handle
                if (e.target.closest('.sr-bubble-actions') || e.target.closest('.sr-drag-handle')) {
                    return;
                }
                e.stopPropagation();
                const lessonNum = parseInt(bubble.dataset.lesson);
                const seqIndex = parseInt(bubble.dataset.seq);
                const sentIndex = parseInt(bubble.dataset.sent);
                const wordIndex = parseInt(bubble.dataset.word);
                this.openPictureLinkModal(lessonNum, seqIndex, sentIndex, wordIndex);
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

        // Initialize SortableJS for bubble rows
        this.initSortableBubbleRows();

        // Draw connection lines after DOM is ready
        requestAnimationFrame(() => {
            this.redrawAllConnectionLines();
        });
    }

    /**
     * Edit word text inline
     */
    editWordText(lessonNum, seqIndex, sentIndex, wordIndex) {
        const word = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex].words[wordIndex];
        const newText = prompt('Edit word(s):\n(You can enter multiple words for a phrase)', word.word);

        if (newText === null || newText.trim() === '') return;

        word.word = newText.trim();
        this.editedLessons.add(lessonNum);
        this.updateSentenceText(lessonNum, seqIndex, sentIndex);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Word updated', 'success');
    }

    /**
     * Initialize SortableJS for drag-and-drop reordering of bubbles
     */
    initSortableBubbleRows() {
        // Destroy existing instances
        this.sortableInstances.forEach(instance => instance.destroy());
        this.sortableInstances = [];

        // Initialize Sortable on each bubbles row
        if (typeof Sortable !== 'undefined') {
            document.querySelectorAll('.sr-bubbles-row').forEach(row => {
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
     * Delete a word from a sentence, or remove its card reference if it has one
     * If the word has a picture/card, only remove the card reference (keep the word text)
     * If the word has no picture, delete the entire word from the sentence
     */
    deleteWord(lessonNum, seqIndex, sentIndex, wordIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
        const word = sentence.words[wordIndex];

        if (word.imagePath || word.cardNum) {
            // Word has a card/picture - only remove the card reference, keep the word text
            if (!confirm(`Remove picture from "${word.word}"? (The word text will remain)`)) return;

            // Clear card-related properties but keep the word text
            delete word.cardNum;
            delete word.imagePath;
            delete word.root;
            delete word.needsResolution;

            toastManager?.show('Picture removed from word', 'success');
        } else {
            // Word has no picture - delete the entire word
            if (!confirm(`Delete "${word.word}" from this sentence?`)) return;

            sentence.words.splice(wordIndex, 1);
            this.updateSentenceText(lessonNum, seqIndex, sentIndex);

            toastManager?.show('Word deleted', 'success');
        }

        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();
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

            grid.innerHTML = matchingCards.map(card => {
                const imgPath = card.imagePath || card.printImagePath;
                return `
                <div class="sr-pic-option" data-cardnum="${card.cardNum}" data-word="${card.word}" data-imagepath="${imgPath || ''}">
                    ${imgPath ? `<img src="${imgPath}" alt="${card.word}">` : '<div class="no-image">No Image</div>'}
                    <span class="card-word">${card.word}</span>
                    <span class="card-english">${card.english}</span>
                </div>
            `}).join('');

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
     * Delete a sequence and renumber remaining sequences
     */
    deleteSequence(lessonNum, seqIndex) {
        if (!confirm('Delete this sequence?')) return;

        const sequences = this.lessons[lessonNum].sequences;
        sequences.splice(seqIndex, 1);

        // Renumber remaining sequences (1-indexed IDs)
        sequences.forEach((seq, idx) => {
            seq.id = idx + 1;
        });

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
     * Delete a sentence from a sequence and renumber remaining sentences
     */
    deleteSentence(lessonNum, seqIndex, sentIndex) {
        const sentences = this.lessons[lessonNum].sequences[seqIndex].sentences;
        const sentence = sentences[sentIndex];

        if (!confirm(`Delete sentence "${sentence.text}"?`)) return;

        // Remove the sentence
        sentences.splice(sentIndex, 1);

        // Renumber remaining sentences (1-indexed IDs)
        sentences.forEach((sent, idx) => {
            sent.id = idx + 1;
        });

        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();

        toastManager?.show('Sentence deleted', 'success');
    }

    /**
     * Open picture link modal with Quick Link and search functionality
     */
    openPictureLinkModal(lessonNum, seqIndex, sentIndex, wordIndex) {
        const sentence = this.lessons[lessonNum].sequences[seqIndex].sentences[sentIndex];
        const word = sentence.words[wordIndex];
        const allCards = this.deckBuilder.assets.getCards({ lesson: null });

        // Find other words in this sentence that have pictures (for Quick Link)
        const otherLinkedWords = sentence.words
            .map((w, idx) => ({ word: w, index: idx }))
            .filter(item => item.index !== wordIndex && item.word.cardNum && item.word.imagePath);

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal sr-picture-link-modal';
        modal.id = 'srPictureLinkModal';

        const hasCurrentPicture = !!(word.cardNum && word.imagePath);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-link"></i> Link "${word.word}" to Picture</h2>
                    <button class="close-btn" id="srCloseLinkModal">&times;</button>
                </div>
                <div class="modal-body">
                    ${hasCurrentPicture ? `
                        <div class="sr-current-link">
                            <h4>Currently Linked To:</h4>
                            <div class="sr-current-picture">
                                <img src="${word.imagePath}" alt="Current">
                                <span>Card #${word.cardNum}</span>
                            </div>
                        </div>
                    ` : ''}

                    ${otherLinkedWords.length > 0 ? `
                        <div class="sr-quick-link-section">
                            <h4><i class="fas fa-bolt"></i> Quick Link (same as another word)</h4>
                            <div class="sr-quick-link-options">
                                ${otherLinkedWords.map(item => {
                                    const card = allCards.find(c => c.cardNum === item.word.cardNum);
                                    return `
                                        <div class="sr-quick-link-option" data-cardnum="${item.word.cardNum}" data-imagepath="${item.word.imagePath}">
                                            <img src="${item.word.imagePath}" alt="${item.word.word}">
                                            <div class="sr-quick-link-info">
                                                <span class="sr-quick-link-word">Same as "${item.word.word}"</span>
                                                <span class="sr-quick-link-card">${card?.word || 'Card #' + item.word.cardNum}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="sr-search-section">
                        <h4><i class="fas fa-search"></i> Search for a Card</h4>
                        <div class="sr-search-bar">
                            <input type="text" id="srPicSearch" placeholder="Search cards..." value="${word.word}">
                            <button id="srPicSearchBtn" class="btn btn-primary">
                                <i class="fas fa-search"></i> Search
                            </button>
                        </div>
                        <div class="sr-pic-grid" id="srPicGrid">
                            <!-- Cards will be rendered here -->
                        </div>
                    </div>

                    <div class="sr-remove-link-section">
                        <button id="srRemoveLinkBtn" class="btn btn-outline-danger ${hasCurrentPicture ? '' : 'hidden'}">
                            <i class="fas fa-unlink"></i> Remove Picture Link (make function word)
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Helper to apply a link and close modal
        const applyLink = (cardNum, imagePath) => {
            word.cardNum = cardNum;
            word.imagePath = imagePath;
            word.needsResolution = false;

            this.editedLessons.add(lessonNum);
            this.renderLessonsList();
            this.updateSaveButton();

            modal.remove();
            toastManager?.show('Picture linked', 'success');
        };

        // Quick link click handlers
        modal.querySelectorAll('.sr-quick-link-option').forEach(option => {
            option.addEventListener('click', () => {
                const cardNum = parseInt(option.dataset.cardnum);
                const imagePath = option.dataset.imagepath;
                applyLink(cardNum, imagePath);
            });
        });

        // Search and render results
        const renderResults = (searchTerm) => {
            const grid = document.getElementById('srPicGrid');
            const term = searchTerm.toLowerCase();

            if (!term) {
                grid.innerHTML = '<p class="hint-text">Enter a search term to find cards</p>';
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

            grid.innerHTML = matchingCards.map(card => {
                const imgPath = card.imagePath || card.printImagePath;
                return `
                <div class="sr-pic-option" data-cardnum="${card.cardNum}" data-imagepath="${imgPath || ''}">
                    ${imgPath ? `<img src="${imgPath}" alt="${card.word}">` : '<div class="no-image">No Image</div>'}
                    <span class="card-word">${card.word}</span>
                    <span class="card-english">${card.english || ''}</span>
                </div>
            `}).join('');

            // Add click handlers
            grid.querySelectorAll('.sr-pic-option').forEach(option => {
                option.addEventListener('click', () => {
                    const cardNum = parseInt(option.dataset.cardnum);
                    const imagePath = option.dataset.imagepath;
                    applyLink(cardNum, imagePath);
                });
            });
        };

        // Initial search with word text
        renderResults(word.word);

        // Search button
        document.getElementById('srPicSearchBtn')?.addEventListener('click', () => {
            renderResults(document.getElementById('srPicSearch').value);
        });

        // Search on Enter
        document.getElementById('srPicSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                renderResults(e.target.value);
            }
        });

        // Remove link button
        document.getElementById('srRemoveLinkBtn')?.addEventListener('click', () => {
            word.cardNum = null;
            word.imagePath = null;
            word.needsResolution = false;

            this.editedLessons.add(lessonNum);
            this.renderLessonsList();
            this.updateSaveButton();

            modal.remove();
            toastManager?.show('Picture link removed', 'success');
        });

        // Close modal
        document.getElementById('srCloseLinkModal')?.addEventListener('click', () => modal.remove());
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
