// =================================================================
// SENTENCE ZONE BUILDERS - Deck Builder Addon
// Version 1.0 - November 2025
// Provides UI for editing Conversation Zone and Story Zone data
// =================================================================

/**
 * ConversationZoneBuilder - Manages the conversation zone editor in deck builder
 */
class ConversationZoneBuilder {
    constructor(deckBuilder) {
        this.deckBuilder = deckBuilder;
        this.currentTrigraph = 'ceb';
        this.conversations = [];
        this.editedConversations = new Set();
        this.expandedConversations = new Set();
        this.sentencePool = []; // Cache of available sentences
    }

    /**
     * Render the conversation zone builder section
     */
    renderSection() {
        return `
            <div class="deck-section collapsible collapsed" id="conversationZoneSection" data-section="conversation-zone">
                <h3 class="section-title" role="button" tabindex="0">
                    <i class="fas fa-comments"></i> Conversation Zone Data
                    <i class="fas fa-chevron-down section-chevron"></i>
                </h3>
                <div class="section-content">
                    <div class="section-card">
                        <p class="section-description">
                            Create Q&A conversation pairs for the Conversation Practice module.
                            Each conversation contains question-answer pairs from the sentence pool.
                        </p>

                        <!-- Import Section -->
                        <div class="cz-builder-import">
                            <h4><i class="fas fa-file-csv"></i> Import from CSV</h4>
                            <p class="import-description">
                                CSV format: Conversation Title, Lesson, Question Sentence #, Answer Sentence #
                            </p>
                            <div class="cz-csv-upload-area" id="czCSVDropZone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Drag & drop CSV file here or click to browse</p>
                                <input type="file" id="czCSVFileInput" accept=".csv" class="cz-csv-file-input">
                            </div>
                            <div class="cz-csv-file-info hidden" id="czCSVFileInfo">
                                <i class="fas fa-file-csv"></i>
                                <span id="czCSVFileName"></span>
                                <button class="cz-csv-remove-btn" id="czCSVRemoveBtn" title="Remove file">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="cz-import-actions">
                                <button id="czParseCSVBtn" class="btn btn-primary" disabled>
                                    <i class="fas fa-magic"></i> Parse CSV & Preview
                                </button>
                            </div>
                        </div>

                        <!-- Preview Section -->
                        <div class="cz-builder-preview hidden" id="czPreviewSection">
                            <h4><i class="fas fa-search"></i> Preview Parsed Data</h4>
                            <div id="czPreviewContent"></div>
                            <div class="cz-preview-actions">
                                <button id="czApplyParseBtn" class="btn btn-success">
                                    <i class="fas fa-check"></i> Apply Import
                                </button>
                                <button id="czCancelParseBtn" class="btn btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>

                        <!-- Conversations List -->
                        <div class="cz-builder-conversations">
                            <h4>
                                <i class="fas fa-list"></i> Conversations
                                <button id="czAddConversationBtn" class="btn btn-sm btn-success">
                                    <i class="fas fa-plus"></i> Add Conversation
                                </button>
                            </h4>
                            <div id="czConversationsList" class="cz-conversations-list">
                                <!-- Conversations will be rendered here -->
                            </div>
                        </div>

                        <div class="section-actions">
                            <button id="czSaveAllBtn" class="btn btn-primary" disabled>
                                <i class="fas fa-save"></i> Save Conversation Zone Data
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
        this.renderConversationsList();
    }

    /**
     * Load conversation zone data
     */
    loadData() {
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        // Get from new sentence pool structure or initialize empty
        const sentenceData = this.deckBuilder.assets.manifest?.sentences?.[this.currentTrigraph];
        this.conversations = sentenceData?.conversationZone?.conversations
            ? JSON.parse(JSON.stringify(sentenceData.conversationZone.conversations))
            : [];

        // Load sentence pool for reference
        this.sentencePool = sentenceData?.pool || [];

        debugLogger?.log(3, `ConversationZoneBuilder: Loaded ${this.conversations.length} conversations`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // CSV file input
        const csvInput = document.getElementById('czCSVFileInput');
        const dropZone = document.getElementById('czCSVDropZone');

        csvInput?.addEventListener('change', (e) => this.handleCSVFileSelect(e.target.files[0]));

        // Drag and drop for CSV
        dropZone?.addEventListener('click', () => csvInput?.click());
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file?.name.toLowerCase().endsWith('.csv')) {
                this.handleCSVFileSelect(file);
            }
        });

        // Remove CSV file button
        document.getElementById('czCSVRemoveBtn')?.addEventListener('click', () => this.clearCSVFile());

        // Parse CSV button
        document.getElementById('czParseCSVBtn')?.addEventListener('click', () => this.parseCSVAndPreview());

        // Apply/Cancel parse
        document.getElementById('czApplyParseBtn')?.addEventListener('click', () => this.applyParsedData());
        document.getElementById('czCancelParseBtn')?.addEventListener('click', () => {
            document.getElementById('czPreviewSection').classList.add('hidden');
            this.parsedData = null;
        });

        // Add conversation button
        document.getElementById('czAddConversationBtn')?.addEventListener('click', () => this.addNewConversation());

        // Save button
        document.getElementById('czSaveAllBtn')?.addEventListener('click', () => this.saveAll());
    }

    /**
     * Handle CSV file selection
     */
    handleCSVFileSelect(file) {
        if (!file) return;

        this.csvFile = file;
        document.getElementById('czCSVDropZone')?.classList.add('hidden');
        document.getElementById('czCSVFileInfo')?.classList.remove('hidden');
        document.getElementById('czCSVFileName').textContent = file.name;
        document.getElementById('czParseCSVBtn').disabled = false;
    }

    /**
     * Clear selected CSV file
     */
    clearCSVFile() {
        this.csvFile = null;
        document.getElementById('czCSVFileInput').value = '';
        document.getElementById('czCSVDropZone')?.classList.remove('hidden');
        document.getElementById('czCSVFileInfo')?.classList.add('hidden');
        document.getElementById('czParseCSVBtn').disabled = true;
    }

    /**
     * Parse CSV and show preview
     */
    async parseCSVAndPreview() {
        if (!this.csvFile) return;

        try {
            const text = await this.csvFile.text();
            this.parsedData = this.parseCSV(text);

            if (!this.parsedData || this.parsedData.length === 0) {
                toastManager?.show('No valid data found in CSV', 'error');
                return;
            }

            this.renderCSVPreview();
        } catch (err) {
            toastManager?.show(`Error parsing CSV: ${err.message}`, 'error');
        }
    }

    /**
     * Parse CSV text into conversation data
     * Format: Conversation Title, Lesson, Question #, Answer #
     */
    parseCSV(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return [];

        const conversations = new Map();

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const fields = this.parseCSVLine(lines[i]);
            if (fields.length < 4) continue;

            const [title, lessonStr, questionStr, answerStr] = fields;
            const lesson = parseInt(lessonStr) || 1;
            const questionNum = parseInt(questionStr);
            const answerNum = parseInt(answerStr);

            if (!questionNum || !answerNum) continue;

            const key = `${title}-${lesson}`;
            if (!conversations.has(key)) {
                conversations.set(key, {
                    title: title || 'Untitled',
                    lesson,
                    pairs: []
                });
            }

            conversations.get(key).pairs.push({ questionNum, answerNum });
        }

        return Array.from(conversations.values());
    }

    /**
     * Parse a single CSV line handling quotes
     */
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        fields.push(current.trim());
        return fields;
    }

    /**
     * Render CSV preview
     */
    renderCSVPreview() {
        const previewSection = document.getElementById('czPreviewSection');
        const previewContent = document.getElementById('czPreviewContent');

        let html = `<p class="preview-summary">Found ${this.parsedData.length} conversation(s)</p>`;

        this.parsedData.forEach(conv => {
            html += `
                <div class="cz-preview-conversation">
                    <div class="cz-preview-header">
                        <strong>${conv.title}</strong> (Lesson ${conv.lesson})
                        <span class="pair-count">${conv.pairs.length} Q&A pairs</span>
                    </div>
                    <div class="cz-preview-pairs">
                        ${conv.pairs.map(pair => {
                            const q = this.sentencePool.find(s => s.sentenceNum === pair.questionNum);
                            const a = this.sentencePool.find(s => s.sentenceNum === pair.answerNum);
                            return `
                                <div class="cz-preview-pair">
                                    <span class="pair-q">Q#${pair.questionNum}: ${q?.text || 'Not found'}</span>
                                    <span class="pair-a">A#${pair.answerNum}: ${a?.text || 'Not found'}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        previewContent.innerHTML = html;
        previewSection.classList.remove('hidden');
    }

    /**
     * Apply parsed data
     */
    applyParsedData() {
        if (!this.parsedData) return;

        const nextId = this.conversations.length > 0
            ? Math.max(...this.conversations.map(c => c.id)) + 1
            : 1;

        this.parsedData.forEach((conv, idx) => {
            this.conversations.push({
                id: nextId + idx,
                title: conv.title,
                lesson: conv.lesson,
                pairs: conv.pairs
            });
            this.editedConversations.add(nextId + idx);
        });

        this.parsedData = null;
        this.clearCSVFile();
        document.getElementById('czPreviewSection').classList.add('hidden');
        this.renderConversationsList();
        this.updateSaveButton();

        toastManager?.show(`${this.parsedData?.length || 0} conversations imported`, 'success');
    }

    /**
     * Render conversations list
     */
    renderConversationsList() {
        const container = document.getElementById('czConversationsList');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="cz-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No conversations yet. Import from CSV or add a new conversation.</p>
                </div>
            `;
            return;
        }

        let html = '';

        this.conversations.forEach(conv => {
            const isExpanded = this.expandedConversations.has(conv.id);
            const isEdited = this.editedConversations.has(conv.id);

            html += `
                <div class="cz-conversation-item ${isExpanded ? 'expanded' : ''}" data-id="${conv.id}">
                    <div class="cz-conversation-header" data-id="${conv.id}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="conv-title">${conv.title}</span>
                        <span class="conv-lesson">Lesson ${conv.lesson}</span>
                        <span class="pair-count">${conv.pairs?.length || 0} pairs</span>
                        ${isEdited ? '<span class="edited-badge">Modified</span>' : ''}
                        <button class="btn btn-sm btn-danger cz-delete-conv" data-id="${conv.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="cz-conversation-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderPairs(conv)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachConversationListeners();
    }

    /**
     * Render Q&A pairs for a conversation
     */
    renderPairs(conv) {
        if (!conv.pairs || conv.pairs.length === 0) {
            return '<p class="cz-no-pairs">No Q&A pairs in this conversation</p>';
        }

        let html = '<div class="cz-pairs-list">';

        conv.pairs.forEach((pair, idx) => {
            const q = this.sentencePool.find(s => s.sentenceNum === pair.questionNum);
            const a = this.sentencePool.find(s => s.sentenceNum === pair.answerNum);

            html += `
                <div class="cz-pair-item" data-conv-id="${conv.id}" data-pair-idx="${idx}">
                    <div class="cz-pair-num">${idx + 1}</div>
                    <div class="cz-pair-content">
                        <div class="cz-pair-question">
                            <span class="pair-label">Q:</span>
                            <span class="pair-text">${q?.text || `[Sentence #${pair.questionNum} not found]`}</span>
                            <span class="pair-num">#${pair.questionNum}</span>
                        </div>
                        <div class="cz-pair-answer">
                            <span class="pair-label">A:</span>
                            <span class="pair-text">${a?.text || `[Sentence #${pair.answerNum} not found]`}</span>
                            <span class="pair-num">#${pair.answerNum}</span>
                        </div>
                    </div>
                    <div class="cz-pair-actions">
                        <button class="btn btn-xs btn-secondary cz-edit-pair" title="Edit pair">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-xs btn-danger cz-delete-pair" title="Delete pair">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success cz-add-pair" data-conv-id="${conv.id}">
                <i class="fas fa-plus"></i> Add Q&A Pair
            </button>
        </div>`;

        return html;
    }

    /**
     * Attach event listeners to conversation items
     */
    attachConversationListeners() {
        // Expand/collapse
        document.querySelectorAll('.cz-conversation-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = parseInt(header.dataset.id);
                this.toggleConversation(id);
            });
        });

        // Delete conversation
        document.querySelectorAll('.cz-delete-conv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.deleteConversation(id);
            });
        });

        // Add pair
        document.querySelectorAll('.cz-add-pair').forEach(btn => {
            btn.addEventListener('click', () => {
                const convId = parseInt(btn.dataset.convId);
                this.addPair(convId);
            });
        });

        // Edit pair
        document.querySelectorAll('.cz-edit-pair').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.cz-pair-item');
                const convId = parseInt(item.dataset.convId);
                const pairIdx = parseInt(item.dataset.pairIdx);
                this.editPair(convId, pairIdx);
            });
        });

        // Delete pair
        document.querySelectorAll('.cz-delete-pair').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.cz-pair-item');
                const convId = parseInt(item.dataset.convId);
                const pairIdx = parseInt(item.dataset.pairIdx);
                this.deletePair(convId, pairIdx);
            });
        });
    }

    /**
     * Toggle conversation expansion
     */
    toggleConversation(id) {
        if (this.expandedConversations.has(id)) {
            this.expandedConversations.delete(id);
        } else {
            this.expandedConversations.add(id);
        }
        this.renderConversationsList();
    }

    /**
     * Add new conversation
     */
    addNewConversation() {
        const title = prompt('Enter conversation title:');
        if (!title) return;

        const lessonStr = prompt('Enter lesson number:', '1');
        const lesson = parseInt(lessonStr) || 1;

        const nextId = this.conversations.length > 0
            ? Math.max(...this.conversations.map(c => c.id)) + 1
            : 1;

        this.conversations.push({
            id: nextId,
            title,
            lesson,
            pairs: []
        });

        this.editedConversations.add(nextId);
        this.expandedConversations.add(nextId);
        this.renderConversationsList();
        this.updateSaveButton();

        toastManager?.show('Conversation added', 'success');
    }

    /**
     * Delete conversation
     */
    deleteConversation(id) {
        if (!confirm('Delete this conversation?')) return;

        const index = this.conversations.findIndex(c => c.id === id);
        if (index === -1) return;

        this.conversations.splice(index, 1);
        this.editedConversations.add(id);
        this.expandedConversations.delete(id);
        this.renderConversationsList();
        this.updateSaveButton();

        toastManager?.show('Conversation deleted', 'success');
    }

    /**
     * Add Q&A pair to conversation
     */
    addPair(convId) {
        const conv = this.conversations.find(c => c.id === convId);
        if (!conv) return;

        // Show sentence picker modal
        this.showPairEditorModal(convId, null);
    }

    /**
     * Edit Q&A pair
     */
    editPair(convId, pairIdx) {
        this.showPairEditorModal(convId, pairIdx);
    }

    /**
     * Delete Q&A pair
     */
    deletePair(convId, pairIdx) {
        const conv = this.conversations.find(c => c.id === convId);
        if (!conv || !conv.pairs) return;

        if (!confirm('Delete this Q&A pair?')) return;

        conv.pairs.splice(pairIdx, 1);
        this.editedConversations.add(convId);
        this.renderConversationsList();
        this.updateSaveButton();

        toastManager?.show('Q&A pair deleted', 'success');
    }

    /**
     * Show modal to add/edit a Q&A pair
     */
    showPairEditorModal(convId, pairIdx) {
        const conv = this.conversations.find(c => c.id === convId);
        if (!conv) return;

        const isEdit = pairIdx !== null;
        const existingPair = isEdit ? conv.pairs[pairIdx] : null;

        const modal = document.createElement('div');
        modal.className = 'modal cz-pair-modal';
        modal.id = 'czPairModal';

        // Get questions and answers from pool
        const questions = this.sentencePool.filter(s => s.type === 'Question');
        const answers = this.sentencePool.filter(s => s.type === 'Answer' || s.type === 'Statement');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-comments"></i> ${isEdit ? 'Edit' : 'Add'} Q&A Pair</h2>
                    <button class="close-btn" id="closePairModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Question Sentence:</label>
                        <select id="czQuestionSelect" class="form-control">
                            <option value="">Select a question...</option>
                            ${questions.map(s => `
                                <option value="${s.sentenceNum}" ${existingPair?.questionNum === s.sentenceNum ? 'selected' : ''}>
                                    #${s.sentenceNum}: ${s.text}
                                </option>
                            `).join('')}
                        </select>
                        <input type="number" id="czQuestionNumInput" class="form-control mt-2"
                               placeholder="Or enter sentence # directly"
                               value="${existingPair?.questionNum || ''}">
                    </div>
                    <div class="form-group">
                        <label>Answer Sentence:</label>
                        <select id="czAnswerSelect" class="form-control">
                            <option value="">Select an answer...</option>
                            ${answers.map(s => `
                                <option value="${s.sentenceNum}" ${existingPair?.answerNum === s.sentenceNum ? 'selected' : ''}>
                                    #${s.sentenceNum}: ${s.text}
                                </option>
                            `).join('')}
                        </select>
                        <input type="number" id="czAnswerNumInput" class="form-control mt-2"
                               placeholder="Or enter sentence # directly"
                               value="${existingPair?.answerNum || ''}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="czSavePairBtn" class="btn btn-success">
                        <i class="fas fa-check"></i> ${isEdit ? 'Update' : 'Add'} Pair
                    </button>
                    <button id="czCancelPairBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Sync select with input
        document.getElementById('czQuestionSelect')?.addEventListener('change', (e) => {
            document.getElementById('czQuestionNumInput').value = e.target.value;
        });
        document.getElementById('czAnswerSelect')?.addEventListener('change', (e) => {
            document.getElementById('czAnswerNumInput').value = e.target.value;
        });

        // Save
        document.getElementById('czSavePairBtn')?.addEventListener('click', () => {
            const questionNum = parseInt(document.getElementById('czQuestionNumInput').value);
            const answerNum = parseInt(document.getElementById('czAnswerNumInput').value);

            if (!questionNum || !answerNum) {
                toastManager?.show('Please select both question and answer', 'warning');
                return;
            }

            if (isEdit) {
                conv.pairs[pairIdx] = { questionNum, answerNum };
            } else {
                if (!conv.pairs) conv.pairs = [];
                conv.pairs.push({ questionNum, answerNum });
            }

            this.editedConversations.add(convId);
            this.renderConversationsList();
            this.updateSaveButton();
            modal.remove();

            toastManager?.show(`Q&A pair ${isEdit ? 'updated' : 'added'}`, 'success');
        });

        // Cancel/Close
        document.getElementById('czCancelPairBtn')?.addEventListener('click', () => modal.remove());
        document.getElementById('closePairModal')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        const btn = document.getElementById('czSaveAllBtn');
        if (btn) {
            btn.disabled = this.editedConversations.size === 0;
        }
    }

    /**
     * Save all conversation zone data
     */
    async saveAll() {
        try {
            const trigraph = this.currentTrigraph;

            // Ensure sentence structure exists
            if (!this.deckBuilder.assets.manifest.sentences) {
                this.deckBuilder.assets.manifest.sentences = {};
            }
            if (!this.deckBuilder.assets.manifest.sentences[trigraph]) {
                this.deckBuilder.assets.manifest.sentences[trigraph] = {
                    pool: [],
                    reviewZone: { lessons: {} },
                    conversationZone: { conversations: [] },
                    storyZone: { stories: [] }
                };
            }

            // Update conversation zone data
            this.deckBuilder.assets.manifest.sentences[trigraph].conversationZone = {
                conversations: this.conversations
            };

            // Save via the existing save-deck.php
            const response = await fetch('save-deck.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigraph,
                    sentences: this.deckBuilder.assets.manifest.sentences[trigraph]
                })
            });

            const result = await response.json();

            if (result.success) {
                this.editedConversations.clear();
                this.updateSaveButton();
                toastManager?.show('Conversation zone data saved', 'success');
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (err) {
            toastManager?.show(`Save failed: ${err.message}`, 'error');
        }
    }

    /**
     * Handle language change
     */
    onLanguageChange(trigraph) {
        this.currentTrigraph = trigraph;
        this.editedConversations.clear();
        this.expandedConversations.clear();
        this.loadData();
        this.renderConversationsList();
        this.updateSaveButton();
    }
}

// =========================================================================
// STORY ZONE BUILDER
// =========================================================================

/**
 * StoryZoneBuilder - Manages the story zone editor in deck builder
 */
class StoryZoneBuilder {
    constructor(deckBuilder) {
        this.deckBuilder = deckBuilder;
        this.currentTrigraph = 'ceb';
        this.stories = [];
        this.editedStories = new Set();
        this.expandedStories = new Set();
        this.sentencePool = [];
        this.sortableInstances = [];
    }

    /**
     * Render the story zone builder section
     */
    renderSection() {
        return `
            <div class="deck-section collapsible collapsed" id="storyZoneSection" data-section="story-zone">
                <h3 class="section-title" role="button" tabindex="0">
                    <i class="fas fa-book-open"></i> Story Zone Data
                    <i class="fas fa-chevron-down section-chevron"></i>
                </h3>
                <div class="section-content">
                    <div class="section-card">
                        <p class="section-description">
                            Create ordered story sequences for the Picture Story module.
                            Each story contains sentences in a specific order that students must arrange.
                        </p>

                        <!-- Import Section -->
                        <div class="sz-builder-import">
                            <h4><i class="fas fa-file-csv"></i> Import from CSV</h4>
                            <p class="import-description">
                                CSV format: Story Title, Lesson, Position, Sentence #
                            </p>
                            <div class="sz-csv-upload-area" id="szCSVDropZone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Drag & drop CSV file here or click to browse</p>
                                <input type="file" id="szCSVFileInput" accept=".csv" class="sz-csv-file-input">
                            </div>
                            <div class="sz-csv-file-info hidden" id="szCSVFileInfo">
                                <i class="fas fa-file-csv"></i>
                                <span id="szCSVFileName"></span>
                                <button class="sz-csv-remove-btn" id="szCSVRemoveBtn" title="Remove file">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="sz-import-actions">
                                <button id="szParseCSVBtn" class="btn btn-primary" disabled>
                                    <i class="fas fa-magic"></i> Parse CSV & Preview
                                </button>
                            </div>
                        </div>

                        <!-- Preview Section -->
                        <div class="sz-builder-preview hidden" id="szPreviewSection">
                            <h4><i class="fas fa-search"></i> Preview Parsed Data</h4>
                            <div id="szPreviewContent"></div>
                            <div class="sz-preview-actions">
                                <button id="szApplyParseBtn" class="btn btn-success">
                                    <i class="fas fa-check"></i> Apply Import
                                </button>
                                <button id="szCancelParseBtn" class="btn btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>

                        <!-- Stories List -->
                        <div class="sz-builder-stories">
                            <h4>
                                <i class="fas fa-list"></i> Stories
                                <button id="szAddStoryBtn" class="btn btn-sm btn-success">
                                    <i class="fas fa-plus"></i> Add Story
                                </button>
                            </h4>
                            <div id="szStoriesList" class="sz-stories-list">
                                <!-- Stories will be rendered here -->
                            </div>
                        </div>

                        <div class="section-actions">
                            <button id="szSaveAllBtn" class="btn btn-primary" disabled>
                                <i class="fas fa-save"></i> Save Story Zone Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize the builder
     */
    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderStoriesList();
    }

    /**
     * Load story zone data
     */
    loadData() {
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        const sentenceData = this.deckBuilder.assets.manifest?.sentences?.[this.currentTrigraph];
        this.stories = sentenceData?.storyZone?.stories
            ? JSON.parse(JSON.stringify(sentenceData.storyZone.stories))
            : [];

        this.sentencePool = sentenceData?.pool || [];

        debugLogger?.log(3, `StoryZoneBuilder: Loaded ${this.stories.length} stories`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // CSV handling (similar to conversation zone)
        const csvInput = document.getElementById('szCSVFileInput');
        const dropZone = document.getElementById('szCSVDropZone');

        csvInput?.addEventListener('change', (e) => this.handleCSVFileSelect(e.target.files[0]));

        dropZone?.addEventListener('click', () => csvInput?.click());
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file?.name.toLowerCase().endsWith('.csv')) {
                this.handleCSVFileSelect(file);
            }
        });

        document.getElementById('szCSVRemoveBtn')?.addEventListener('click', () => this.clearCSVFile());
        document.getElementById('szParseCSVBtn')?.addEventListener('click', () => this.parseCSVAndPreview());

        document.getElementById('szApplyParseBtn')?.addEventListener('click', () => this.applyParsedData());
        document.getElementById('szCancelParseBtn')?.addEventListener('click', () => {
            document.getElementById('szPreviewSection').classList.add('hidden');
            this.parsedData = null;
        });

        document.getElementById('szAddStoryBtn')?.addEventListener('click', () => this.addNewStory());
        document.getElementById('szSaveAllBtn')?.addEventListener('click', () => this.saveAll());
    }

    /**
     * Handle CSV file selection
     */
    handleCSVFileSelect(file) {
        if (!file) return;

        this.csvFile = file;
        document.getElementById('szCSVDropZone')?.classList.add('hidden');
        document.getElementById('szCSVFileInfo')?.classList.remove('hidden');
        document.getElementById('szCSVFileName').textContent = file.name;
        document.getElementById('szParseCSVBtn').disabled = false;
    }

    /**
     * Clear CSV file
     */
    clearCSVFile() {
        this.csvFile = null;
        document.getElementById('szCSVFileInput').value = '';
        document.getElementById('szCSVDropZone')?.classList.remove('hidden');
        document.getElementById('szCSVFileInfo')?.classList.add('hidden');
        document.getElementById('szParseCSVBtn').disabled = true;
    }

    /**
     * Parse CSV and preview
     */
    async parseCSVAndPreview() {
        if (!this.csvFile) return;

        try {
            const text = await this.csvFile.text();
            this.parsedData = this.parseCSV(text);

            if (!this.parsedData || this.parsedData.length === 0) {
                toastManager?.show('No valid data found in CSV', 'error');
                return;
            }

            this.renderCSVPreview();
        } catch (err) {
            toastManager?.show(`Error parsing CSV: ${err.message}`, 'error');
        }
    }

    /**
     * Parse CSV for story data
     * Format: Story Title, Lesson, Position, Sentence #
     */
    parseCSV(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return [];

        const stories = new Map();

        for (let i = 1; i < lines.length; i++) {
            const fields = this.parseCSVLine(lines[i]);
            if (fields.length < 4) continue;

            const [title, lessonStr, posStr, sentenceStr] = fields;
            const lesson = parseInt(lessonStr) || 1;
            const position = parseInt(posStr) || 1;
            const sentenceNum = parseInt(sentenceStr);

            if (!sentenceNum) continue;

            const key = `${title}-${lesson}`;
            if (!stories.has(key)) {
                stories.set(key, {
                    title: title || 'Untitled',
                    lesson,
                    sentences: []
                });
            }

            stories.get(key).sentences.push({ position, sentenceNum });
        }

        // Sort sentences by position within each story
        stories.forEach(story => {
            story.sentences.sort((a, b) => a.position - b.position);
            story.sentenceNums = story.sentences.map(s => s.sentenceNum);
            delete story.sentences;
        });

        return Array.from(stories.values());
    }

    /**
     * Parse CSV line
     */
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        fields.push(current.trim());
        return fields;
    }

    /**
     * Render CSV preview
     */
    renderCSVPreview() {
        const previewSection = document.getElementById('szPreviewSection');
        const previewContent = document.getElementById('szPreviewContent');

        let html = `<p class="preview-summary">Found ${this.parsedData.length} story(ies)</p>`;

        this.parsedData.forEach(story => {
            html += `
                <div class="sz-preview-story">
                    <div class="sz-preview-header">
                        <strong>${story.title}</strong> (Lesson ${story.lesson})
                        <span class="sentence-count">${story.sentenceNums.length} sentences</span>
                    </div>
                    <div class="sz-preview-sentences">
                        ${story.sentenceNums.map((num, idx) => {
                            const s = this.sentencePool.find(p => p.sentenceNum === num);
                            return `
                                <div class="sz-preview-sentence">
                                    <span class="position">${idx + 1}.</span>
                                    <span class="text">#${num}: ${s?.text || 'Not found'}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        previewContent.innerHTML = html;
        previewSection.classList.remove('hidden');
    }

    /**
     * Apply parsed data
     */
    applyParsedData() {
        if (!this.parsedData) return;

        const nextId = this.stories.length > 0
            ? Math.max(...this.stories.map(s => s.id)) + 1
            : 1;

        this.parsedData.forEach((story, idx) => {
            this.stories.push({
                id: nextId + idx,
                title: story.title,
                lesson: story.lesson,
                sentenceNums: story.sentenceNums
            });
            this.editedStories.add(nextId + idx);
        });

        this.parsedData = null;
        this.clearCSVFile();
        document.getElementById('szPreviewSection').classList.add('hidden');
        this.renderStoriesList();
        this.updateSaveButton();

        toastManager?.show(`${this.parsedData?.length || 0} stories imported`, 'success');
    }

    /**
     * Render stories list
     */
    renderStoriesList() {
        const container = document.getElementById('szStoriesList');
        if (!container) return;

        // Clean up sortable instances
        this.sortableInstances.forEach(s => s.destroy());
        this.sortableInstances = [];

        if (this.stories.length === 0) {
            container.innerHTML = `
                <div class="sz-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No stories yet. Import from CSV or add a new story.</p>
                </div>
            `;
            return;
        }

        let html = '';

        this.stories.forEach(story => {
            const isExpanded = this.expandedStories.has(story.id);
            const isEdited = this.editedStories.has(story.id);

            html += `
                <div class="sz-story-item ${isExpanded ? 'expanded' : ''}" data-id="${story.id}">
                    <div class="sz-story-header" data-id="${story.id}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="story-title">${story.title}</span>
                        <span class="story-lesson">Lesson ${story.lesson}</span>
                        <span class="sentence-count">${story.sentenceNums?.length || 0} sentences</span>
                        ${isEdited ? '<span class="edited-badge">Modified</span>' : ''}
                        <button class="btn btn-sm btn-danger sz-delete-story" data-id="${story.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="sz-story-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSentences(story)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachStoryListeners();
        this.initSortable();
    }

    /**
     * Render sentences for a story with drag handles
     */
    renderSentences(story) {
        if (!story.sentenceNums || story.sentenceNums.length === 0) {
            return '<p class="sz-no-sentences">No sentences in this story</p>';
        }

        let html = `<div class="sz-sentences-list" data-story-id="${story.id}">`;

        story.sentenceNums.forEach((num, idx) => {
            const s = this.sentencePool.find(p => p.sentenceNum === num);

            html += `
                <div class="sz-sentence-item" data-story-id="${story.id}" data-idx="${idx}" data-num="${num}">
                    <div class="sz-drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <span class="sz-position">${idx + 1}.</span>
                    <span class="sz-sentence-text">${s?.text || `[#${num} not found]`}</span>
                    <span class="sz-sentence-num">#${num}</span>
                    <button class="btn btn-xs btn-danger sz-remove-sentence" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        html += `
            <button class="btn btn-sm btn-success sz-add-sentence" data-story-id="${story.id}">
                <i class="fas fa-plus"></i> Add Sentence
            </button>
        </div>`;

        return html;
    }

    /**
     * Attach event listeners
     */
    attachStoryListeners() {
        // Expand/collapse
        document.querySelectorAll('.sz-story-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = parseInt(header.dataset.id);
                this.toggleStory(id);
            });
        });

        // Delete story
        document.querySelectorAll('.sz-delete-story').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.deleteStory(id);
            });
        });

        // Add sentence
        document.querySelectorAll('.sz-add-sentence').forEach(btn => {
            btn.addEventListener('click', () => {
                const storyId = parseInt(btn.dataset.storyId);
                this.addSentence(storyId);
            });
        });

        // Remove sentence
        document.querySelectorAll('.sz-remove-sentence').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.sz-sentence-item');
                const storyId = parseInt(item.dataset.storyId);
                const idx = parseInt(item.dataset.idx);
                this.removeSentence(storyId, idx);
            });
        });
    }

    /**
     * Initialize SortableJS for drag-and-drop reordering
     */
    initSortable() {
        if (typeof Sortable === 'undefined') return;

        document.querySelectorAll('.sz-sentences-list').forEach(list => {
            const storyId = parseInt(list.dataset.storyId);

            const sortable = new Sortable(list, {
                animation: 150,
                handle: '.sz-drag-handle',
                filter: '.sz-add-sentence',
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    this.onSentenceReorder(storyId, evt.oldIndex, evt.newIndex);
                }
            });

            this.sortableInstances.push(sortable);
        });
    }

    /**
     * Handle sentence reorder
     */
    onSentenceReorder(storyId, oldIdx, newIdx) {
        if (oldIdx === newIdx) return;

        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;

        const [moved] = story.sentenceNums.splice(oldIdx, 1);
        story.sentenceNums.splice(newIdx, 0, moved);

        this.editedStories.add(storyId);
        this.renderStoriesList();
        this.updateSaveButton();

        toastManager?.show('Sentence order updated', 'success');
    }

    /**
     * Toggle story expansion
     */
    toggleStory(id) {
        if (this.expandedStories.has(id)) {
            this.expandedStories.delete(id);
        } else {
            this.expandedStories.add(id);
        }
        this.renderStoriesList();
    }

    /**
     * Add new story
     */
    addNewStory() {
        const title = prompt('Enter story title:');
        if (!title) return;

        const lessonStr = prompt('Enter lesson number:', '1');
        const lesson = parseInt(lessonStr) || 1;

        const nextId = this.stories.length > 0
            ? Math.max(...this.stories.map(s => s.id)) + 1
            : 1;

        this.stories.push({
            id: nextId,
            title,
            lesson,
            sentenceNums: []
        });

        this.editedStories.add(nextId);
        this.expandedStories.add(nextId);
        this.renderStoriesList();
        this.updateSaveButton();

        toastManager?.show('Story added', 'success');
    }

    /**
     * Delete story
     */
    deleteStory(id) {
        if (!confirm('Delete this story?')) return;

        const index = this.stories.findIndex(s => s.id === id);
        if (index === -1) return;

        this.stories.splice(index, 1);
        this.editedStories.add(id);
        this.expandedStories.delete(id);
        this.renderStoriesList();
        this.updateSaveButton();

        toastManager?.show('Story deleted', 'success');
    }

    /**
     * Add sentence to story
     */
    addSentence(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;

        this.showSentencePickerModal(storyId);
    }

    /**
     * Remove sentence from story
     */
    removeSentence(storyId, idx) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;

        story.sentenceNums.splice(idx, 1);
        this.editedStories.add(storyId);
        this.renderStoriesList();
        this.updateSaveButton();

        toastManager?.show('Sentence removed', 'success');
    }

    /**
     * Show sentence picker modal
     */
    showSentencePickerModal(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;

        const modal = document.createElement('div');
        modal.className = 'modal sz-sentence-modal';
        modal.id = 'szSentenceModal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-plus"></i> Add Sentence to Story</h2>
                    <button class="close-btn" id="closeSentenceModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Search sentences:</label>
                        <input type="text" id="szSentenceSearch" class="form-control" placeholder="Search...">
                    </div>
                    <div class="sz-sentence-options" id="szSentenceOptions">
                        ${this.sentencePool.map(s => `
                            <div class="sz-sentence-option" data-num="${s.sentenceNum}">
                                <span class="num">#${s.sentenceNum}</span>
                                <span class="text">${s.text}</span>
                                <span class="type">${s.type || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="form-group mt-3">
                        <label>Or enter sentence # directly:</label>
                        <input type="number" id="szSentenceNumInput" class="form-control" placeholder="Sentence #">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="szAddSentenceBtn" class="btn btn-success">
                        <i class="fas fa-plus"></i> Add Sentence
                    </button>
                    <button id="szCancelSentenceBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedNum = null;

        // Click on option
        modal.querySelectorAll('.sz-sentence-option').forEach(opt => {
            opt.addEventListener('click', () => {
                modal.querySelectorAll('.sz-sentence-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedNum = parseInt(opt.dataset.num);
                document.getElementById('szSentenceNumInput').value = selectedNum;
            });
        });

        // Search filter
        document.getElementById('szSentenceSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            modal.querySelectorAll('.sz-sentence-option').forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });

        // Add
        document.getElementById('szAddSentenceBtn')?.addEventListener('click', () => {
            const num = parseInt(document.getElementById('szSentenceNumInput').value);
            if (!num) {
                toastManager?.show('Please select or enter a sentence number', 'warning');
                return;
            }

            if (!story.sentenceNums) story.sentenceNums = [];
            story.sentenceNums.push(num);

            this.editedStories.add(storyId);
            this.renderStoriesList();
            this.updateSaveButton();
            modal.remove();

            toastManager?.show('Sentence added to story', 'success');
        });

        // Cancel/Close
        document.getElementById('szCancelSentenceBtn')?.addEventListener('click', () => modal.remove());
        document.getElementById('closeSentenceModal')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    /**
     * Update save button
     */
    updateSaveButton() {
        const btn = document.getElementById('szSaveAllBtn');
        if (btn) {
            btn.disabled = this.editedStories.size === 0;
        }
    }

    /**
     * Save all story zone data
     */
    async saveAll() {
        try {
            const trigraph = this.currentTrigraph;

            if (!this.deckBuilder.assets.manifest.sentences) {
                this.deckBuilder.assets.manifest.sentences = {};
            }
            if (!this.deckBuilder.assets.manifest.sentences[trigraph]) {
                this.deckBuilder.assets.manifest.sentences[trigraph] = {
                    pool: [],
                    reviewZone: { lessons: {} },
                    conversationZone: { conversations: [] },
                    storyZone: { stories: [] }
                };
            }

            this.deckBuilder.assets.manifest.sentences[trigraph].storyZone = {
                stories: this.stories
            };

            const response = await fetch('save-deck.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigraph,
                    sentences: this.deckBuilder.assets.manifest.sentences[trigraph]
                })
            });

            const result = await response.json();

            if (result.success) {
                this.editedStories.clear();
                this.updateSaveButton();
                toastManager?.show('Story zone data saved', 'success');
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (err) {
            toastManager?.show(`Save failed: ${err.message}`, 'error');
        }
    }

    /**
     * Handle language change
     */
    onLanguageChange(trigraph) {
        this.currentTrigraph = trigraph;
        this.editedStories.clear();
        this.expandedStories.clear();
        this.loadData();
        this.renderStoriesList();
        this.updateSaveButton();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ConversationZoneBuilder = ConversationZoneBuilder;
    window.StoryZoneBuilder = StoryZoneBuilder;
}
