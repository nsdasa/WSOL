// =================================================================
// SENTENCE POOL MANAGER
// Version 1.0 - November 2025
// Central management of sentences across all sentence-based modules
// =================================================================

/**
 * SentencePoolManager - Manages the central sentence pool and module assignments
 *
 * Data Structure in manifest:
 * {
 *   "sentences": {
 *     "ceb": {
 *       "pool": [
 *         {
 *           "sentenceNum": 1,
 *           "text": "Asa ang libro?",
 *           "english": "Where is the book?",
 *           "type": "Question",
 *           "audioPath": null,
 *           "words": [{ word, root, cardNum, imagePath, needsResolution }]
 *         }
 *       ],
 *       "reviewZone": {
 *         "lessons": {
 *           "1": {
 *             "title": "Lesson 1",
 *             "sequences": [{ id, title, sentenceNums: [1, 2, 3] }]
 *           }
 *         }
 *       },
 *       "conversationZone": {
 *         "lessons": {
 *           "1": {
 *             "title": "Lesson 1",
 *             "conversations": [{ id, title, pairs: [{ questionNum, answerNum }] }]
 *           }
 *         }
 *       },
 *       "storyZone": {
 *         "lessons": {
 *           "1": {
 *             "title": "Lesson 1",
 *             "stories": [{ id, title, sentenceNums: [5, 6, 7, 8] }]
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
class SentencePoolManager {
    constructor(assetManager) {
        this.assets = assetManager;
        this.currentTrigraph = 'ceb';
    }

    /**
     * Get the sentence data for a language
     */
    getSentenceData(trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        return this.assets.manifest?.sentences?.[tg] || null;
    }

    /**
     * Get all sentences in the pool for a language
     */
    getSentencePool(trigraph = null) {
        const data = this.getSentenceData(trigraph);
        return data?.pool || [];
    }

    /**
     * Get a sentence by its number
     */
    getSentence(sentenceNum, trigraph = null) {
        const pool = this.getSentencePool(trigraph);
        return pool.find(s => s.sentenceNum === sentenceNum) || null;
    }

    /**
     * Get the next available sentence number
     */
    getNextSentenceNum(trigraph = null) {
        const pool = this.getSentencePool(trigraph);
        if (pool.length === 0) return 1;
        return Math.max(...pool.map(s => s.sentenceNum)) + 1;
    }

    /**
     * Add a new sentence to the pool
     */
    addSentence(sentenceData, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        this.ensureStructure(tg);

        const sentenceNum = sentenceData.sentenceNum || this.getNextSentenceNum(tg);
        const newSentence = {
            sentenceNum,
            text: sentenceData.text || '',
            english: sentenceData.english || '',
            cebuano: sentenceData.cebuano || null,
            type: sentenceData.type || null,
            words: sentenceData.words || []
        };

        this.assets.manifest.sentences[tg].pool.push(newSentence);
        return newSentence;
    }

    /**
     * Update an existing sentence
     */
    updateSentence(sentenceNum, updates, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const pool = this.getSentencePool(tg);
        const index = pool.findIndex(s => s.sentenceNum === sentenceNum);

        if (index === -1) return null;

        const sentence = pool[index];
        Object.assign(sentence, updates);
        return sentence;
    }

    /**
     * Delete a sentence from the pool
     * Note: This should check if sentence is used by any module first
     */
    deleteSentence(sentenceNum, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const data = this.getSentenceData(tg);
        if (!data?.pool) return false;

        const index = data.pool.findIndex(s => s.sentenceNum === sentenceNum);
        if (index === -1) return false;

        data.pool.splice(index, 1);
        return true;
    }

    /**
     * Check which modules use a sentence
     */
    getSentenceUsage(sentenceNum, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const data = this.getSentenceData(tg);
        if (!data) return { reviewZone: [], conversationZone: [], storyZone: [] };

        const usage = {
            reviewZone: [],
            conversationZone: [],
            storyZone: []
        };

        // Check Review Zone
        if (data.reviewZone?.lessons) {
            Object.entries(data.reviewZone.lessons).forEach(([lessonNum, lesson]) => {
                lesson.sequences?.forEach((seq, seqIdx) => {
                    if (seq.sentenceNums?.includes(sentenceNum)) {
                        usage.reviewZone.push({
                            lesson: lessonNum,
                            sequenceId: seq.id,
                            sequenceTitle: seq.title
                        });
                    }
                });
            });
        }

        // Check Conversation Zone
        if (data.conversationZone?.lessons) {
            Object.entries(data.conversationZone.lessons).forEach(([lessonNum, lesson]) => {
                lesson.conversations?.forEach(conv => {
                    conv.pairs?.forEach(pair => {
                        if (pair.questionNum === sentenceNum || pair.answerNum === sentenceNum) {
                            usage.conversationZone.push({
                                lesson: lessonNum,
                                conversationId: conv.id,
                                conversationTitle: conv.title,
                                role: pair.questionNum === sentenceNum ? 'question' : 'answer'
                            });
                        }
                    });
                });
            });
        }

        // Check Story Zone
        if (data.storyZone?.lessons) {
            Object.entries(data.storyZone.lessons).forEach(([lessonNum, lesson]) => {
                lesson.stories?.forEach(story => {
                    if (story.sentenceNums?.includes(sentenceNum)) {
                        usage.storyZone.push({
                            lesson: lessonNum,
                            storyId: story.id,
                            storyTitle: story.title,
                            position: story.sentenceNums.indexOf(sentenceNum) + 1
                        });
                    }
                });
            });
        }

        return usage;
    }

    /**
     * Check if a sentence is used by any module
     */
    isSentenceInUse(sentenceNum, trigraph = null) {
        const usage = this.getSentenceUsage(sentenceNum, trigraph);
        return usage.reviewZone.length > 0 ||
               usage.conversationZone.length > 0 ||
               usage.storyZone.length > 0;
    }

    // =========================================================
    // REVIEW ZONE METHODS
    // =========================================================

    /**
     * Get Review Zone data
     */
    getReviewZone(trigraph = null) {
        const data = this.getSentenceData(trigraph);
        return data?.reviewZone || { lessons: {} };
    }

    /**
     * Add a sequence to Review Zone
     */
    addReviewSequence(lessonNum, sequenceData, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        this.ensureStructure(tg);

        const reviewZone = this.assets.manifest.sentences[tg].reviewZone;
        if (!reviewZone.lessons[lessonNum]) {
            reviewZone.lessons[lessonNum] = { title: `Lesson ${lessonNum}`, sequences: [] };
        }

        const sequences = reviewZone.lessons[lessonNum].sequences;
        const nextId = sequences.length > 0 ? Math.max(...sequences.map(s => s.id)) + 1 : 1;

        const newSequence = {
            id: sequenceData.id || nextId,
            title: sequenceData.title || 'New Sequence',
            sentenceNums: sequenceData.sentenceNums || []
        };

        sequences.push(newSequence);
        return newSequence;
    }

    /**
     * Update a Review Zone sequence
     */
    updateReviewSequence(lessonNum, sequenceId, updates, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const reviewZone = this.getReviewZone(tg);
        const lesson = reviewZone.lessons?.[lessonNum];
        if (!lesson) return null;

        const sequence = lesson.sequences?.find(s => s.id === sequenceId);
        if (!sequence) return null;

        Object.assign(sequence, updates);
        return sequence;
    }

    /**
     * Delete a Review Zone sequence
     */
    deleteReviewSequence(lessonNum, sequenceId, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const data = this.getSentenceData(tg);
        const lesson = data?.reviewZone?.lessons?.[lessonNum];
        if (!lesson?.sequences) return false;

        const index = lesson.sequences.findIndex(s => s.id === sequenceId);
        if (index === -1) return false;

        lesson.sequences.splice(index, 1);
        return true;
    }

    // =========================================================
    // CONVERSATION ZONE METHODS
    // =========================================================

    /**
     * Get Conversation Zone data
     */
    getConversationZone(trigraph = null) {
        const data = this.getSentenceData(trigraph);
        return data?.conversationZone || { lessons: {} };
    }

    /**
     * Get conversations for a specific lesson
     */
    getConversationsForLesson(lessonNum, trigraph = null) {
        const convZone = this.getConversationZone(trigraph);
        return convZone.lessons?.[lessonNum]?.conversations || [];
    }

    /**
     * Add a conversation to a lesson
     */
    addConversation(lessonNum, conversationData, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        this.ensureStructure(tg);

        const convZone = this.assets.manifest.sentences[tg].conversationZone;
        if (!convZone.lessons[lessonNum]) {
            convZone.lessons[lessonNum] = { title: `Lesson ${lessonNum}`, conversations: [] };
        }

        const conversations = convZone.lessons[lessonNum].conversations;
        const nextId = conversations.length > 0
            ? Math.max(...conversations.map(c => c.id)) + 1
            : 1;

        const newConv = {
            id: conversationData.id || nextId,
            title: conversationData.title || 'New Conversation',
            pairs: conversationData.pairs || []
        };

        conversations.push(newConv);
        return newConv;
    }

    /**
     * Update a conversation
     */
    updateConversation(lessonNum, conversationId, updates, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const convZone = this.getConversationZone(tg);
        const lesson = convZone.lessons?.[lessonNum];
        if (!lesson) return null;

        const conv = lesson.conversations?.find(c => c.id === conversationId);
        if (!conv) return null;

        Object.assign(conv, updates);
        return conv;
    }

    /**
     * Delete a conversation
     */
    deleteConversation(lessonNum, conversationId, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const data = this.getSentenceData(tg);
        const lesson = data?.conversationZone?.lessons?.[lessonNum];
        if (!lesson?.conversations) return false;

        const index = lesson.conversations.findIndex(c => c.id === conversationId);
        if (index === -1) return false;

        lesson.conversations.splice(index, 1);
        return true;
    }

    /**
     * Add a Q&A pair to a conversation
     */
    addConversationPair(lessonNum, conversationId, questionNum, answerNum, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const convZone = this.getConversationZone(tg);
        const lesson = convZone.lessons?.[lessonNum];
        const conv = lesson?.conversations?.find(c => c.id === conversationId);
        if (!conv) return null;

        if (!conv.pairs) conv.pairs = [];
        conv.pairs.push({ questionNum, answerNum });
        return conv;
    }

    // =========================================================
    // STORY ZONE METHODS
    // =========================================================

    /**
     * Get Story Zone data
     */
    getStoryZone(trigraph = null) {
        const data = this.getSentenceData(trigraph);
        return data?.storyZone || { lessons: {} };
    }

    /**
     * Get stories for a specific lesson
     */
    getStoriesForLesson(lessonNum, trigraph = null) {
        const storyZone = this.getStoryZone(trigraph);
        return storyZone.lessons?.[lessonNum]?.stories || [];
    }

    /**
     * Add a story to a lesson
     */
    addStory(lessonNum, storyData, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        this.ensureStructure(tg);

        const storyZone = this.assets.manifest.sentences[tg].storyZone;
        if (!storyZone.lessons[lessonNum]) {
            storyZone.lessons[lessonNum] = { title: `Lesson ${lessonNum}`, stories: [] };
        }

        const stories = storyZone.lessons[lessonNum].stories;
        const nextId = stories.length > 0
            ? Math.max(...stories.map(s => s.id)) + 1
            : 1;

        const newStory = {
            id: storyData.id || nextId,
            title: storyData.title || 'New Story',
            sentenceNums: storyData.sentenceNums || []
        };

        stories.push(newStory);
        return newStory;
    }

    /**
     * Update a story
     */
    updateStory(lessonNum, storyId, updates, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const storyZone = this.getStoryZone(tg);
        const lesson = storyZone.lessons?.[lessonNum];
        if (!lesson) return null;

        const story = lesson.stories?.find(s => s.id === storyId);
        if (!story) return null;

        Object.assign(story, updates);
        return story;
    }

    /**
     * Delete a story
     */
    deleteStory(lessonNum, storyId, trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const data = this.getSentenceData(tg);
        const lesson = data?.storyZone?.lessons?.[lessonNum];
        if (!lesson?.stories) return false;

        const index = lesson.stories.findIndex(s => s.id === storyId);
        if (index === -1) return false;

        lesson.stories.splice(index, 1);
        return true;
    }

    // =========================================================
    // MIGRATION & UTILITIES
    // =========================================================

    /**
     * Ensure the sentence structure exists for a language
     */
    ensureStructure(trigraph) {
        if (!this.assets.manifest.sentences) {
            this.assets.manifest.sentences = {};
        }
        if (!this.assets.manifest.sentences[trigraph]) {
            this.assets.manifest.sentences[trigraph] = {
                pool: [],
                reviewZone: { lessons: {} },
                conversationZone: { lessons: {} },
                storyZone: { lessons: {} }
            };
        }
        // Ensure sub-structures exist (for partial structures)
        const data = this.assets.manifest.sentences[trigraph];
        if (!data.pool) data.pool = [];
        if (!data.reviewZone) data.reviewZone = { lessons: {} };
        if (!data.reviewZone.lessons) data.reviewZone.lessons = {};
        if (!data.conversationZone) data.conversationZone = { lessons: {} };
        if (!data.conversationZone.lessons) data.conversationZone.lessons = {};
        if (!data.storyZone) data.storyZone = { lessons: {} };
        if (!data.storyZone.lessons) data.storyZone.lessons = {};
    }

    /**
     * Migrate old sentenceReview data to new sentences structure
     * This is a one-time migration from the old format
     */
    migrateFromOldFormat(trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const oldData = this.assets.manifest?.sentenceReview?.[tg];

        if (!oldData?.lessons) {
            debugLogger?.log(2, `SentencePoolManager: No old data to migrate for ${tg}`);
            return { migrated: 0, sentences: 0 };
        }

        this.ensureStructure(tg);
        const newData = this.assets.manifest.sentences[tg];

        let sentenceCount = 0;
        let nextSentenceNum = this.getNextSentenceNum(tg);

        // Map old sentence IDs to new sentence numbers
        // Format: { "lessonNum-seqIndex-sentId": newSentenceNum }
        const sentenceMap = new Map();

        // First pass: Create all sentences in the pool
        Object.entries(oldData.lessons).forEach(([lessonNum, lesson]) => {
            lesson.sequences?.forEach((sequence, seqIndex) => {
                sequence.sentences?.forEach(sentence => {
                    const key = `${lessonNum}-${seqIndex}-${sentence.id}`;

                    // Check if this exact sentence already exists in pool (deduplication)
                    const existingSentence = newData.pool.find(s =>
                        s.text === sentence.text &&
                        s.english === sentence.english
                    );

                    if (existingSentence) {
                        sentenceMap.set(key, existingSentence.sentenceNum);
                    } else {
                        // Create new sentence
                        const newSentence = {
                            sentenceNum: nextSentenceNum,
                            text: sentence.text,
                            english: sentence.english || '',
                            cebuano: sentence.cebuano || null,
                            type: sentence.sentenceType || null,
                            words: sentence.words || []
                        };
                        newData.pool.push(newSentence);
                        sentenceMap.set(key, nextSentenceNum);
                        nextSentenceNum++;
                        sentenceCount++;
                    }
                });
            });
        });

        // Second pass: Create Review Zone structure with sentence references
        Object.entries(oldData.lessons).forEach(([lessonNum, lesson]) => {
            if (!newData.reviewZone.lessons[lessonNum]) {
                newData.reviewZone.lessons[lessonNum] = {
                    title: lesson.title || `Lesson ${lessonNum}`,
                    sequences: []
                };
            }

            lesson.sequences?.forEach((sequence, seqIndex) => {
                const sentenceNums = sequence.sentences?.map(sentence => {
                    const key = `${lessonNum}-${seqIndex}-${sentence.id}`;
                    return sentenceMap.get(key);
                }).filter(n => n !== undefined) || [];

                newData.reviewZone.lessons[lessonNum].sequences.push({
                    id: sequence.id,
                    title: sequence.title,
                    sentenceNums
                });
            });
        });

        debugLogger?.log(2, `SentencePoolManager: Migrated ${sentenceCount} sentences for ${tg}`);
        return {
            migrated: Object.keys(oldData.lessons).length,
            sentences: sentenceCount
        };
    }

    /**
     * Check if migration is needed for a language
     */
    needsMigration(trigraph = null) {
        const tg = trigraph || this.currentTrigraph;
        const oldData = this.assets.manifest?.sentenceReview?.[tg];
        const newData = this.assets.manifest?.sentences?.[tg];

        // Has old data but no new data
        return !!(oldData?.lessons && Object.keys(oldData.lessons).length > 0 &&
                 (!newData?.pool || newData.pool.length === 0));
    }

    /**
     * Get sentence by resolving from module reference
     * For Review Zone, resolves sentenceNum to full sentence object
     */
    resolveSentence(sentenceNum, trigraph = null) {
        return this.getSentence(sentenceNum, trigraph);
    }

    /**
     * Get all sentences for a Review Zone sequence
     */
    getSequenceSentences(lessonNum, sequenceId, trigraph = null) {
        const reviewZone = this.getReviewZone(trigraph);
        const lesson = reviewZone.lessons?.[lessonNum];
        const sequence = lesson?.sequences?.find(s => s.id === sequenceId);

        if (!sequence?.sentenceNums) return [];

        return sequence.sentenceNums
            .map(num => this.getSentence(num, trigraph))
            .filter(s => s !== null);
    }

    /**
     * Get all sentences for a conversation (Q&A pairs)
     */
    getConversationSentences(lessonNum, conversationId, trigraph = null) {
        const convZone = this.getConversationZone(trigraph);
        const lesson = convZone.lessons?.[lessonNum];
        const conv = lesson?.conversations?.find(c => c.id === conversationId);

        if (!conv?.pairs) return [];

        return conv.pairs.map(pair => ({
            question: this.getSentence(pair.questionNum, trigraph),
            answer: this.getSentence(pair.answerNum, trigraph)
        })).filter(p => p.question && p.answer);
    }

    /**
     * Get all sentences for a story (in order)
     */
    getStorySentences(lessonNum, storyId, trigraph = null) {
        const storyZone = this.getStoryZone(trigraph);
        const lesson = storyZone.lessons?.[lessonNum];
        const story = lesson?.stories?.find(s => s.id === storyId);

        if (!story?.sentenceNums) return [];

        return story.sentenceNums
            .map(num => this.getSentence(num, trigraph))
            .filter(s => s !== null);
    }

    /**
     * Search sentences in pool
     */
    searchSentences(query, trigraph = null) {
        const pool = this.getSentencePool(trigraph);
        const lowerQuery = query.toLowerCase();

        return pool.filter(s =>
            s.text?.toLowerCase().includes(lowerQuery) ||
            s.english?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get sentences by type
     */
    getSentencesByType(type, trigraph = null) {
        const pool = this.getSentencePool(trigraph);
        return pool.filter(s => s.type === type);
    }

    /**
     * Get unassigned sentences (not used by any module)
     */
    getUnassignedSentences(trigraph = null) {
        const pool = this.getSentencePool(trigraph);
        return pool.filter(s => !this.isSentenceInUse(s.sentenceNum, trigraph));
    }

    /**
     * Parse words for a sentence using the same logic as SentenceReviewParser
     */
    parseWords(text, allCards) {
        if (typeof SentenceReviewParser !== 'undefined') {
            return SentenceReviewParser.parseWords(text, allCards);
        }
        // Fallback: just split into words without card matching
        return text.split(/\s+/).map(word => ({
            word: word.replace(/[.,!?]$/, ''),
            root: null,
            cardNum: null,
            imagePath: null,
            needsResolution: false
        }));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SentencePoolManager = SentencePoolManager;
}
