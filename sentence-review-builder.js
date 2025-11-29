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
     * Supports both old format (sentenceReview) and new format (sentences.reviewZone)
     * Internally uses the new sets/seqs structure
     */
    loadData() {
        const manifest = this.deckBuilder.assets.manifest;
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        // Get sentence pool for resolving sentenceNums to full sentence data
        this.sentencePool = manifest?.sentences?.[this.currentTrigraph]?.pool || [];
        this.poolMap = new Map(this.sentencePool.map(s => [s.sentenceNum, s]));

        // Try new format first: sentences[trigraph].reviewZone.lessons
        const newData = manifest?.sentences?.[this.currentTrigraph]?.reviewZone?.lessons;

        // Fallback to old format: sentenceReview[trigraph].lessons
        const oldData = manifest?.sentenceReview?.[this.currentTrigraph]?.lessons;

        this.lessons = {};

        if (newData) {
            // New format - deep clone
            this.lessons = JSON.parse(JSON.stringify(newData));
            debugLogger?.log(3, `SentenceReviewBuilder: Loaded ${Object.keys(this.lessons).length} lessons (new format)`);
        } else if (oldData) {
            // Old format - convert to new structure
            this.lessons = this.convertOldToNewFormat(oldData);
            debugLogger?.log(3, `SentenceReviewBuilder: Converted ${Object.keys(this.lessons).length} lessons from old format`);
        }
    }

    /**
     * Convert old format (sequences with embedded sentences) to new format (sets with seqs referencing pool)
     */
    convertOldToNewFormat(oldLessons) {
        const newLessons = {};

        for (const [lessonNum, lessonData] of Object.entries(oldLessons)) {
            newLessons[lessonNum] = {
                title: lessonData.title || `Lesson ${lessonNum}`,
                sets: []
            };

            if (lessonData.sequences) {
                for (const seq of lessonData.sequences) {
                    const newSet = {
                        id: seq.id,
                        title: seq.title,
                        seqs: []
                    };

                    // Convert sentences to seqs with sentenceNums
                    if (seq.sentences) {
                        seq.sentences.forEach((sent, idx) => {
                            // For old format, create seqs with inline sentence data
                            // (will be converted to pool references on save)
                            newSet.seqs.push({
                                seqNum: sent.id || idx + 1,
                                sentenceNum: sent.sentenceNum || null, // May not exist in old format
                                text: sent.text,
                                english: sent.english || '',
                                cebuano: sent.cebuano || null,
                                sentenceType: sent.sentenceType || sent.type || null,
                                words: sent.words || []
                            });
                        });
                    } else if (seq.sentenceNums) {
                        // Already in new format (references to pool)
                        seq.sentenceNums.forEach((sentNum, idx) => {
                            const poolSentence = this.poolMap.get(sentNum);
                            newSet.seqs.push({
                                seqNum: idx + 1,
                                sentenceNum: sentNum,
                                text: poolSentence?.text || '',
                                english: poolSentence?.english || '',
                                cebuano: poolSentence?.cebuano || null,
                                sentenceType: poolSentence?.type || null,
                                words: poolSentence?.words || []
                            });
                        });
                    }

                    newLessons[lessonNum].sets.push(newSet);
                }
            }
        }

        return newLessons;
    }

    // =====================================================
    // HELPER METHODS for accessing sets/seqs data
    // These provide backward compatibility with old sequences/sentences structure
    // =====================================================

    /**
     * Get sets (was sequences) for a lesson
     */
    getSets(lessonNum) {
        const lesson = this.lessons[lessonNum];
        if (!lesson) return [];
        return lesson.sets || lesson.sequences || [];
    }

    /**
     * Get a specific set by index
     */
    getSet(lessonNum, setIndex) {
        const sets = this.getSets(lessonNum);
        return sets[setIndex] || null;
    }

    /**
     * Get seqs (was sentences) for a set
     */
    getSeqs(lessonNum, setIndex) {
        const set = this.getSet(lessonNum, setIndex);
        if (!set) return [];
        return set.seqs || set.sentences || [];
    }

    /**
     * Get a specific seq (sentence) by index
     */
    getSeq(lessonNum, setIndex, seqIndex) {
        const seqs = this.getSeqs(lessonNum, setIndex);
        return seqs[seqIndex] || null;
    }

    /**
     * Ensure lesson has sets array (migrates from sequences if needed)
     */
    ensureSetsArray(lessonNum) {
        const lesson = this.lessons[lessonNum];
        if (!lesson) return;
        if (!lesson.sets && lesson.sequences) {
            lesson.sets = lesson.sequences;
            delete lesson.sequences;
        }
        if (!lesson.sets) {
            lesson.sets = [];
        }
    }

    /**
     * Ensure set has seqs array (migrates from sentences if needed)
     */
    ensureSeqsArray(lessonNum, setIndex) {
        this.ensureSetsArray(lessonNum);
        const set = this.lessons[lessonNum]?.sets?.[setIndex];
        if (!set) return;
        if (!set.seqs && set.sentences) {
            set.seqs = set.sentences;
            delete set.sentences;
        }
        if (!set.seqs) {
            set.seqs = [];
        }
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
        let totalSets = 0;
        let totalSentences = 0;

        lessonNums.forEach(num => {
            const lesson = this.parsedLessons[num];
            // Support both old (sequences) and new (sets) format
            const sets = lesson.sets || lesson.sequences || [];
            totalSets += sets.length;
            sets.forEach(set => {
                const seqs = set.seqs || set.sentences || [];
                totalSentences += seqs.length;
            });
        });

        let html = `
            <div class="sr-csv-preview-summary">
                <span class="summary-item"><i class="fas fa-book"></i> ${lessonNums.length} Lesson(s)</span>
                <span class="summary-item"><i class="fas fa-list"></i> ${totalSets} Set(s)</span>
                <span class="summary-item"><i class="fas fa-comment"></i> ${totalSentences} Sentence(s)</span>
            </div>
        `;

        lessonNums.forEach(lessonNum => {
            const lesson = this.parsedLessons[lessonNum];
            const sets = lesson.sets || lesson.sequences || [];
            html += `
                <div class="sr-preview-lesson">
                    <div class="sr-preview-lesson-header">
                        <i class="fas fa-book"></i>
                        <strong>Lesson ${lessonNum}</strong>
                        <span class="sequence-count">${sets.length} sets</span>
                    </div>
            `;

            sets.forEach((set, setIndex) => {
                const seqs = set.seqs || set.sentences || [];
                html += `
                    <div class="sr-preview-sequence">
                        <div class="sr-preview-seq-header">
                            <strong>Set ${set.id}:</strong> ${set.title}
                            <span class="sentence-count">${seqs.length} sentences</span>
                        </div>
                        <div class="sr-preview-sentences">
                `;

                seqs.forEach((seq, seqIndex) => {
                    const withPic = seq.words?.filter(w => w.imagePath).length || 0;
                    const withoutPic = seq.words?.filter(w => !w.imagePath).length || 0;
                    const needsRes = seq.words?.filter(w => w.needsResolution).length || 0;

                    // Sentence type badge
                    const typeClass = seq.sentenceType ? `type-${seq.sentenceType.toLowerCase()}` : '';
                    const typeBadge = seq.sentenceType ?
                        `<span class="sr-sentence-type-badge ${typeClass}">${seq.sentenceType}</span>` : '';

                    html += `
                        <div class="sr-preview-sentence">
                            <div class="sr-preview-sent-text">
                                <span class="seq-num">${seq.seqNum || seqIndex + 1}.</span>
                                ${seq.text}
                                ${typeBadge}
                            </div>
                            <div class="sr-preview-sent-english">${seq.english}</div>
                            <div class="sr-preview-words">
                    `;

                    seq.words?.forEach(word => {
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
     * Uses SentencePoolManager for deduplication - reuses existing sentences when found
     */
    applyParsedData() {
        // Handle CSV import (multiple lessons with new sets/seqs structure)
        if (this.parsedLessons && Object.keys(this.parsedLessons).length > 0) {
            let lessonsApplied = 0;
            let sentencesNew = 0;
            let sentencesReused = 0;

            // Get or create SentencePoolManager
            const poolManager = this.deckBuilder.sentencePoolManager ||
                (window.sentencePoolManager ? window.sentencePoolManager : null);

            for (const [lessonNum, lessonData] of Object.entries(this.parsedLessons)) {
                // Convert parsed data to internal format with deduplication
                const convertedLesson = {
                    title: lessonData.title || `Lesson ${lessonNum}`,
                    sets: []
                };

                // Process each set (was "sequence" in parsed data, now "sets")
                for (const parsedSet of (lessonData.sets || [])) {
                    const newSet = {
                        id: parsedSet.id,
                        title: parsedSet.title,
                        seqs: []
                    };

                    // Process each sentence in the set
                    for (const parsedSeq of (parsedSet.seqs || [])) {
                        // Check if sentence already exists in pool (deduplication)
                        let sentenceNum = null;
                        let isNew = true;

                        if (poolManager) {
                            const existing = poolManager.findByText(parsedSeq.text, this.currentTrigraph);
                            if (existing) {
                                sentenceNum = existing.sentenceNum;
                                isNew = false;
                                sentencesReused++;
                            } else {
                                // Add new sentence to pool
                                const result = poolManager.addOrGetSentence({
                                    text: parsedSeq.text,
                                    english: parsedSeq.english,
                                    cebuano: parsedSeq.cebuano,
                                    type: parsedSeq.sentenceType,
                                    words: parsedSeq.words
                                }, this.currentTrigraph);
                                sentenceNum = result.sentence.sentenceNum;
                                sentencesNew++;
                            }
                        }

                        newSet.seqs.push({
                            seqNum: parsedSeq.seqNum,
                            sentenceNum: sentenceNum,
                            // Keep inline data for display/editing
                            text: parsedSeq.text,
                            english: parsedSeq.english || '',
                            cebuano: parsedSeq.cebuano || null,
                            sentenceType: parsedSeq.sentenceType || null,
                            words: parsedSeq.words || []
                        });
                    }

                    convertedLesson.sets.push(newSet);
                }

                this.lessons[lessonNum] = convertedLesson;
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

            const msg = `${lessonsApplied} lesson(s) imported. ${sentencesNew} new, ${sentencesReused} reused sentences.`;
            toastManager?.show(msg, 'success');
            return;
        }

        // Handle text import (single lesson)
        if (!this.parsedData || !this.parsedTargetLesson) return;

        // Convert old sequences format to new sets format
        const sets = [];
        if (this.parsedData.sequences) {
            for (const seq of this.parsedData.sequences) {
                sets.push({
                    id: seq.id,
                    title: seq.title,
                    seqs: (seq.sentences || []).map((sent, idx) => ({
                        seqNum: sent.id || idx + 1,
                        sentenceNum: null,
                        text: sent.text,
                        english: sent.english || '',
                        cebuano: sent.cebuano || null,
                        sentenceType: sent.sentenceType || null,
                        words: sent.words || []
                    }))
                });
            }
        }

        // Create or update lesson data
        this.lessons[this.parsedTargetLesson] = {
            title: `Lesson ${this.parsedTargetLesson} Sentences`,
            sets: sets
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
     * Uses new terminology: sets (groups of sentences) and seqs (ordered sentences within a set)
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
            // Support both old (sequences) and new (sets) format
            const sets = lesson.sets || lesson.sequences || [];

            html += `
                <div class="sr-lesson-item ${isExpanded ? 'expanded' : ''}" data-lesson="${lessonNum}">
                    <div class="sr-lesson-header" data-lesson="${lessonNum}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="lesson-title">Lesson ${lessonNum}: ${lesson.title || 'Untitled'}</span>
                        <span class="sequence-count">${sets.length} sets</span>
                        ${isEdited ? '<span class="edited-badge">Modified</span>' : ''}
                        <button class="btn btn-sm btn-danger sr-delete-lesson" data-lesson="${lessonNum}" title="Delete lesson">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sr-lesson-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSets(lessonNum, sets)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners
        this.attachLessonListeners();
    }

    /**
     * Render sets for a lesson (was renderSequences)
     * A "set" is a group of sentences with a theme/title
     */
    renderSets(lessonNum, sets) {
        if (!sets || sets.length === 0) {
            return '<p class="sr-no-sequences">No sets in this lesson</p>';
        }

        let html = '<div class="sr-sequences-list">';

        sets.forEach((set, setIndex) => {
            const setKey = `${lessonNum}-${setIndex}`;
            const isExpanded = this.expandedSequences.has(setKey);
            // Support both old (sentences) and new (seqs) format
            const seqs = set.seqs || set.sentences || [];

            html += `
                <div class="sr-sequence-item ${isExpanded ? 'expanded' : ''}" data-lesson="${lessonNum}" data-seq="${setIndex}">
                    <div class="sr-sequence-header" data-lesson="${lessonNum}" data-seq="${setIndex}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="sequence-title">Set ${set.id}: ${set.title || 'Untitled'}</span>
                        <span class="sentence-count">${seqs.length} sentences</span>
                        <button class="btn btn-sm btn-secondary sr-edit-sequence" data-lesson="${lessonNum}" data-seq="${setIndex}" title="Edit set">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger sr-delete-sequence" data-lesson="${lessonNum}" data-seq="${setIndex}" title="Delete set">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sr-sequence-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSeqs(lessonNum, setIndex, seqs)}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success sr-add-sequence" data-lesson="${lessonNum}">
                <i class="fas fa-plus"></i> Add Set
            </button>
        </div>`;

        return html;
    }

    /**
     * Backward compatibility alias
     */
    renderSequences(lessonNum, sequences) {
        return this.renderSets(lessonNum, sequences);
    }

    /**
     * Render seqs (sentences) for a set with pictures
     * A "seq" is an ordered sentence within a set
     */
    renderSeqs(lessonNum, setIndex, seqs) {
        if (!seqs || seqs.length === 0) {
            return '<p class="sr-no-sentences">No sentences in this set</p>';
        }

        let html = '<div class="sr-sentences-list">';

        seqs.forEach((seq, seqIndex) => {
            // Sentence type badge
            const typeClass = seq.sentenceType ? `type-${seq.sentenceType.toLowerCase()}` : '';
            const typeBadge = seq.sentenceType ?
                `<span class="sr-sentence-type-badge ${typeClass}">${seq.sentenceType}</span>` : '';

            // Show seq number and global sentence ID if available
            const seqNumDisplay = seq.seqNum || seqIndex + 1;
            const sentIdBadge = seq.sentenceNum ?
                `<span class="sr-sent-id-badge" title="Global Sentence ID">#${seq.sentenceNum}</span>` : '';

            html += `
                <div class="sr-sentence-item" data-lesson="${lessonNum}" data-seq="${setIndex}" data-sent="${seqIndex}">
                    <div class="sr-sentence-header">
                        <span class="sentence-num">${seqNumDisplay}.</span>
                        ${sentIdBadge}
                        <span class="sentence-text">${seq.text}</span>
                        ${typeBadge}
                        <span class="sentence-english">(${seq.english})</span>
                        <button class="btn btn-xs btn-secondary sr-edit-sentence" data-lesson="${lessonNum}" data-seq="${setIndex}" data-sent="${seqIndex}" title="Edit sentence">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-xs btn-danger sr-delete-sentence" data-lesson="${lessonNum}" data-seq="${setIndex}" data-sent="${seqIndex}" title="Delete sentence">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sr-sentence-pictures">
                        ${this.renderWordPictures(lessonNum, setIndex, seqIndex, seq.words || [])}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success sr-add-sentence" data-lesson="${lessonNum}" data-seq="${setIndex}">
                <i class="fas fa-plus"></i> Add Sentence
            </button>
        </div>`;

        return html;
    }

    /**
     * Backward compatibility alias
     */
    renderSentences(lessonNum, seqIndex, sentences) {
        return this.renderSeqs(lessonNum, seqIndex, sentences);
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
    editWordText(lessonNum, setIndex, seqIndex, wordIndex) {
        const seq = this.getSeq(lessonNum, setIndex, seqIndex);
        if (!seq || !seq.words?.[wordIndex]) return;

        const word = seq.words[wordIndex];
        const newText = prompt('Edit word(s):\n(You can enter multiple words for a phrase)', word.word);

        if (newText === null || newText.trim() === '') return;

        word.word = newText.trim();
        this.editedLessons.add(lessonNum);
        this.updateSentenceText(lessonNum, setIndex, seqIndex);
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
                        const seqs = this.getSeqs(lessonNum, seqIndex);
                        if (evt.newIndex >= (seqs[sentIndex]?.words?.length || 0)) {
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
    onWordReorder(lessonNum, setIndex, seqIndex, oldIndex, newIndex) {
        if (oldIndex === newIndex) return;

        const seq = this.getSeq(lessonNum, setIndex, seqIndex);
        if (!seq?.words) return;

        const [movedWord] = seq.words.splice(oldIndex, 1);
        seq.words.splice(newIndex, 0, movedWord);

        this.editedLessons.add(lessonNum);
        this.updateSaveButton();

        // Update sentence text to reflect new word order
        this.updateSentenceText(lessonNum, setIndex, seqIndex);

        // Re-render to update data-word indices
        this.renderLessonsList();

        toastManager?.show('Word order updated', 'success');
    }

    /**
     * Update sentence text based on current word order
     */
    updateSentenceText(lessonNum, setIndex, seqIndex) {
        const seq = this.getSeq(lessonNum, setIndex, seqIndex);
        if (!seq?.words) return;
        // Reconstruct text from words (preserving punctuation would require more complex handling)
        seq.text = seq.words.map(w => w.word).join(' ');
    }

    /**
     * Delete a word from a sentence, or remove its card reference if it has one
     * If the word has a picture/card, only remove the card reference (keep the word text)
     * If the word has no picture, delete the entire word from the sentence
     */
    deleteWord(lessonNum, setIndex, seqIndex, wordIndex) {
        const seq = this.getSeq(lessonNum, setIndex, seqIndex);
        if (!seq?.words?.[wordIndex]) return;
        const word = seq.words[wordIndex];

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

            seq.words.splice(wordIndex, 1);
            this.updateSentenceText(lessonNum, setIndex, seqIndex);

            toastManager?.show('Word deleted', 'success');
        }

        this.editedLessons.add(lessonNum);
        this.renderLessonsList();
        this.updateSaveButton();
    }

    /**
     * Add a new word to a sentence
     */
    addWord(lessonNum, setIndex, seqIndex) {
        // Show a modal to select what to add
        this.openAddWordModal(lessonNum, setIndex, seqIndex);
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

            const seq = this.getSeq(lessonNum, seqIndex, sentIndex);
            if (!seq) return;
            if (!seq.words) seq.words = [];
            seq.words.push({
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
     * Saves to new format: sentences[trigraph].pool and sentences[trigraph].reviewZone
     */
    async saveAll() {
        try {
            const trigraph = this.currentTrigraph;

            // Build the reviewZone structure with sets/seqs
            const reviewZoneLessons = {};

            for (const [lessonNum, lessonData] of Object.entries(this.lessons)) {
                reviewZoneLessons[lessonNum] = {
                    title: lessonData.title || `Lesson ${lessonNum}`,
                    sets: (lessonData.sets || []).map(set => ({
                        id: set.id,
                        title: set.title,
                        seqs: (set.seqs || []).map(seq => ({
                            seqNum: seq.seqNum,
                            sentenceNum: seq.sentenceNum
                        }))
                    }))
                };
            }

            // Get the current sentence pool from manifest
            const manifest = this.deckBuilder.assets.manifest;
            const currentPool = manifest?.sentences?.[trigraph]?.pool || [];

            // Ensure all sentences in lessons are in the pool
            const poolManager = this.deckBuilder.sentencePoolManager ||
                (window.sentencePoolManager ? window.sentencePoolManager : null);

            // Add any sentences that don't have sentenceNums yet
            for (const lessonData of Object.values(this.lessons)) {
                for (const set of (lessonData.sets || [])) {
                    for (const seq of (set.seqs || [])) {
                        if (!seq.sentenceNum && seq.text && poolManager) {
                            // Add to pool and get sentenceNum
                            const result = poolManager.addOrGetSentence({
                                text: seq.text,
                                english: seq.english,
                                cebuano: seq.cebuano,
                                type: seq.sentenceType,
                                words: seq.words
                            }, trigraph);
                            seq.sentenceNum = result.sentence.sentenceNum;
                        }
                    }
                }
            }

            // Post to backend with new format
            const response = await fetch('save-deck.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigraph: trigraph,
                    cards: this.deckBuilder.allCards, // Keep existing cards
                    sentences: {
                        pool: poolManager ? poolManager.getSentencePool(trigraph) : currentPool,
                        reviewZone: {
                            lessons: reviewZoneLessons
                        }
                    }
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
