// =================================================================
// SENTENCE ZONE BUILDERS - Deck Builder Addon
// Version 2.0 - November 2025
// Read-only preview of data derived from Sentence Review
// Conversations and Stories are auto-generated from sentenceReview data
// =================================================================

/**
 * ConversationZoneBuilder - Manages the conversation zone editor in deck builder
 */
class ConversationZoneBuilder {
    constructor(deckBuilder) {
        this.deckBuilder = deckBuilder;
        this.currentTrigraph = 'ceb';
        this.conversations = [];
        this.expandedConversations = new Set();
        this.sentencePool = [];
    }

    /**
     * Render the conversation zone builder section
     */
    renderSection() {
        return `
            <div class="deck-section collapsible collapsed" id="conversationZoneSection" data-section="conversation-zone">
                <h3 class="section-title" role="button" tabindex="0">
                    <i class="fas fa-comments"></i> Conversation Zone Preview
                    <i class="fas fa-chevron-down section-chevron"></i>
                </h3>
                <div class="section-content">
                    <div class="section-card">
                        <div class="cz-info-banner">
                            <i class="fas fa-info-circle"></i>
                            <span>Conversations are automatically derived from Sentence Review data.
                            Q&A pairs are created from sentences marked as "question" followed by "answer" or "statement".
                            Edit sentence types in the Sentence Review section above.</span>
                        </div>

                        <!-- Conversations List (read-only view) -->
                        <div class="cz-builder-conversations">
                            <h4><i class="fas fa-list"></i> Derived Conversations</h4>
                            <div id="czConversationsList" class="cz-conversations-list">
                                <!-- Conversations will be rendered here -->
                            </div>
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
        this.renderConversationsList();
    }

    /**
     * Load conversation zone data from sentenceReview (where learning modules read from)
     */
    loadData() {
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        // Load from sentenceReview - the same source the learning modules use
        const sentenceReviewData = this.deckBuilder.assets.manifest?.sentenceReview?.[this.currentTrigraph];
        this.conversations = [];
        this.sentencePool = [];

        if (sentenceReviewData?.lessons) {
            let conversationId = 1;
            let sentenceNum = 1;
            const sentenceMap = new Map(); // Track sentences to avoid duplicates in pool

            // Process each lesson
            for (const [lessonNum, lessonData] of Object.entries(sentenceReviewData.lessons)) {
                if (!lessonData.sequences) continue;

                // Process each sequence as a conversation
                for (const sequence of lessonData.sequences) {
                    if (!sequence.sentences?.length) continue;

                    // Build sentence pool entries and extract Q&A pairs
                    const pairs = [];

                    for (let i = 0; i < sequence.sentences.length; i++) {
                        const sentence = sequence.sentences[i];
                        const sentenceKey = `${lessonNum}-${sequence.id}-${sentence.id}`;

                        // Add to sentence pool if not already there
                        if (!sentenceMap.has(sentenceKey)) {
                            const poolEntry = {
                                sentenceNum: sentenceNum,
                                text: sentence.text,
                                english: sentence.english || '',
                                sentenceType: sentence.sentenceType,
                                lessonNum: parseInt(lessonNum),
                                sequenceId: sequence.id,
                                originalId: sentence.id,
                                words: sentence.words || []
                            };
                            this.sentencePool.push(poolEntry);
                            sentenceMap.set(sentenceKey, sentenceNum);
                            sentenceNum++;
                        }

                        // Extract Q&A pairs: question followed by answer/statement
                        const sentType = (sentence.sentenceType || '').toLowerCase();
                        if (sentType === 'question' && i + 1 < sequence.sentences.length) {
                            const nextSentence = sequence.sentences[i + 1];
                            const nextSentenceKey = `${lessonNum}-${sequence.id}-${nextSentence.id}`;
                            const nextSentType = (nextSentence.sentenceType || '').toLowerCase();

                            if (nextSentType === 'answer' || nextSentType === 'statement') {
                                pairs.push({
                                    questionNum: sentenceMap.get(sentenceKey),
                                    answerNum: sentenceMap.get(nextSentenceKey) || sentenceNum
                                });
                            }
                        }
                    }

                    // Only create conversation if we found Q&A pairs
                    if (pairs.length > 0) {
                        this.conversations.push({
                            id: conversationId++,
                            title: sequence.title || `Sequence ${sequence.id}`,
                            lesson: parseInt(lessonNum),
                            pairs: pairs
                        });
                    }
                }
            }
        }

        debugLogger?.log(3, `ConversationZoneBuilder: Loaded ${this.conversations.length} conversations from sentenceReview`);
    }

    /**
     * Render conversations list (read-only view)
     */
    renderConversationsList() {
        const container = document.getElementById('czConversationsList');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="cz-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No Q&A pairs found. Add sentences with "question" and "answer" types in the Sentence Review section.</p>
                </div>
            `;
            return;
        }

        let html = '';

        this.conversations.forEach(conv => {
            const isExpanded = this.expandedConversations.has(conv.id);

            html += `
                <div class="cz-conversation-item ${isExpanded ? 'expanded' : ''}" data-id="${conv.id}">
                    <div class="cz-conversation-header" data-id="${conv.id}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="conv-title">${conv.title}</span>
                        <span class="conv-lesson">Lesson ${conv.lesson}</span>
                        <span class="pair-count">${conv.pairs?.length || 0} pairs</span>
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
     * Render Q&A pairs for a conversation (read-only)
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
                <div class="cz-pair-item">
                    <div class="cz-pair-num">${idx + 1}</div>
                    <div class="cz-pair-content">
                        <div class="cz-pair-question">
                            <span class="pair-label">Q:</span>
                            <span class="pair-text">${q?.text || `[Sentence #${pair.questionNum} not found]`}</span>
                        </div>
                        <div class="cz-pair-answer">
                            <span class="pair-label">A:</span>
                            <span class="pair-text">${a?.text || `[Sentence #${pair.answerNum} not found]`}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Attach event listeners (expand/collapse only)
     */
    attachConversationListeners() {
        document.querySelectorAll('.cz-conversation-header').forEach(header => {
            header.addEventListener('click', () => {
                const id = parseInt(header.dataset.id);
                this.toggleConversation(id);
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

    // Note: Save functionality removed - conversations are derived from sentenceReview data
    // The ConversationPracticeModule automatically extracts Q&A pairs from sequences

    /**
     * Handle language change
     */
    onLanguageChange(trigraph) {
        this.currentTrigraph = trigraph;
        this.expandedConversations.clear();
        this.loadData();
        this.renderConversationsList();
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
        this.expandedStories = new Set();
        this.sentencePool = [];
    }

    /**
     * Render the story zone builder section
     */
    renderSection() {
        return `
            <div class="deck-section collapsible collapsed" id="storyZoneSection" data-section="story-zone">
                <h3 class="section-title" role="button" tabindex="0">
                    <i class="fas fa-book-open"></i> Story Zone Preview
                    <i class="fas fa-chevron-down section-chevron"></i>
                </h3>
                <div class="section-content">
                    <div class="section-card">
                        <div class="sz-info-banner">
                            <i class="fas fa-info-circle"></i>
                            <span>Stories are automatically derived from Sentence Review sequences.
                            Any sequence with 2 or more sentences becomes a story.
                            Edit sequences in the Sentence Review section above.</span>
                        </div>

                        <!-- Stories List (read-only view) -->
                        <div class="sz-builder-stories">
                            <h4><i class="fas fa-list"></i> Derived Stories</h4>
                            <div id="szStoriesList" class="sz-stories-list">
                                <!-- Stories will be rendered here -->
                            </div>
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
        this.renderStoriesList();
    }

    /**
     * Load story zone data from sentenceReview (where learning modules read from)
     */
    loadData() {
        this.currentTrigraph = this.deckBuilder.currentTrigraph || 'ceb';

        // Load from sentenceReview - the same source the learning modules use
        const sentenceReviewData = this.deckBuilder.assets.manifest?.sentenceReview?.[this.currentTrigraph];
        this.stories = [];
        this.sentencePool = [];

        if (sentenceReviewData?.lessons) {
            let storyId = 1;
            let sentenceNum = 1;
            const sentenceMap = new Map(); // Track sentences to avoid duplicates in pool

            // Process each lesson
            for (const [lessonNum, lessonData] of Object.entries(sentenceReviewData.lessons)) {
                if (!lessonData.sequences) continue;

                // Process each sequence as a story (only if it has 2+ sentences)
                for (const sequence of lessonData.sequences) {
                    if (!sequence.sentences?.length || sequence.sentences.length < 2) continue;

                    const sentenceNums = [];

                    // Build sentence pool entries and collect sentence numbers
                    for (const sentence of sequence.sentences) {
                        const sentenceKey = `${lessonNum}-${sequence.id}-${sentence.id}`;

                        // Add to sentence pool if not already there
                        if (!sentenceMap.has(sentenceKey)) {
                            const poolEntry = {
                                sentenceNum: sentenceNum,
                                text: sentence.text,
                                english: sentence.english || '',
                                sentenceType: sentence.sentenceType,
                                lessonNum: parseInt(lessonNum),
                                sequenceId: sequence.id,
                                originalId: sentence.id,
                                words: sentence.words || []
                            };
                            this.sentencePool.push(poolEntry);
                            sentenceMap.set(sentenceKey, sentenceNum);
                            sentenceNum++;
                        }

                        sentenceNums.push(sentenceMap.get(sentenceKey));
                    }

                    // Create story from sequence
                    this.stories.push({
                        id: storyId++,
                        title: sequence.title || `Sequence ${sequence.id}`,
                        lesson: parseInt(lessonNum),
                        sentenceNums: sentenceNums
                    });
                }
            }
        }

        debugLogger?.log(3, `StoryZoneBuilder: Loaded ${this.stories.length} stories from sentenceReview`);
    }

    /**
     * Render stories list (read-only view)
     */
    renderStoriesList() {
        const container = document.getElementById('szStoriesList');
        if (!container) return;

        if (this.stories.length === 0) {
            container.innerHTML = `
                <div class="sz-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No stories found. Add sequences with 2+ sentences in the Sentence Review section.</p>
                </div>
            `;
            return;
        }

        let html = '';

        this.stories.forEach(story => {
            const isExpanded = this.expandedStories.has(story.id);

            html += `
                <div class="sz-story-item ${isExpanded ? 'expanded' : ''}" data-id="${story.id}">
                    <div class="sz-story-header" data-id="${story.id}">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}-square expand-icon"></i>
                        <span class="story-title">${story.title}</span>
                        <span class="story-lesson">Lesson ${story.lesson}</span>
                        <span class="sentence-count">${story.sentenceNums?.length || 0} sentences</span>
                    </div>
                    <div class="sz-story-content ${isExpanded ? '' : 'hidden'}">
                        ${this.renderSentences(story)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachStoryListeners();
    }

    /**
     * Render sentences for a story (read-only)
     */
    renderSentences(story) {
        if (!story.sentenceNums || story.sentenceNums.length === 0) {
            return '<p class="sz-no-sentences">No sentences in this story</p>';
        }

        let html = '<div class="sz-sentences-list">';

        story.sentenceNums.forEach((num, idx) => {
            const s = this.sentencePool.find(p => p.sentenceNum === num);

            html += `
                <div class="sz-sentence-item">
                    <span class="sz-position">${idx + 1}.</span>
                    <span class="sz-sentence-text">${s?.text || `[Sentence not found]`}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Attach event listeners (expand/collapse only)
     */
    attachStoryListeners() {
        document.querySelectorAll('.sz-story-header').forEach(header => {
            header.addEventListener('click', () => {
                const id = parseInt(header.dataset.id);
                this.toggleStory(id);
            });
        });
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

    // Note: Save functionality removed - stories are derived from sentenceReview data
    // The PictureStoryModule automatically uses sequences with 2+ sentences as stories

    /**
     * Handle language change
     */
    onLanguageChange(trigraph) {
        this.currentTrigraph = trigraph;
        this.expandedStories.clear();
        this.loadData();
        this.renderStoriesList();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ConversationZoneBuilder = ConversationZoneBuilder;
    window.StoryZoneBuilder = StoryZoneBuilder;
}
