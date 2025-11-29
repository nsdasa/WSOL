// =================================================================
// DECK BUILDER MODULE - CSV EXPORT
// Split from deck-builder-module.js for maintainability
// Contains: CSV export functionality for all data types
// =================================================================

/**
 * Truncate text to a maximum length
 */
DeckBuilderModule.prototype.truncateText = function(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

/**
 * Show Export CSV Modal
 */
DeckBuilderModule.prototype.showExportCSVModal = function() {
    // Update the button labels with current language
    const wordListBtn = document.getElementById('exportWordListBtn');
    const sentenceWordsBtn = document.getElementById('exportSentenceWordsBtn');
    const sentenceReviewBtn = document.getElementById('exportSentenceReviewBtn');

    if (wordListBtn) {
        wordListBtn.querySelector('strong').textContent = `Word List (${this.currentLanguageName})`;
    }
    if (sentenceWordsBtn) {
        sentenceWordsBtn.querySelector('strong').textContent = `Sentence Words (${this.currentLanguageName})`;
    }
    if (sentenceReviewBtn) {
        sentenceReviewBtn.querySelector('strong').textContent = `Sentence Review (${this.currentLanguageName})`;
    }

    document.getElementById('exportCSVModal').classList.remove('hidden');
};

/**
 * Close Export CSV Modal
 */
DeckBuilderModule.prototype.closeExportCSVModal = function() {
    document.getElementById('exportCSVModal').classList.add('hidden');
};

/**
 * Export Language List CSV
 * Format: Language #,Language Name,Trigraph
 */
DeckBuilderModule.prototype.exportLanguageListCSV = function() {
    const languages = this.assets.manifest?.languages || [];

    if (languages.length === 0) {
        toastManager.show('No language data available to export', 'warning');
        return;
    }

    let csv = 'Language #,Language Name,Trigraph\n';

    languages.forEach((lang, index) => {
        const row = [
            index + 1,
            this.escapeCSV(lang.name || ''),
            (lang.trigraph || '').toUpperCase()
        ];
        csv += row.join(',') + '\n';
    });

    this.downloadCSV(csv, `Language_List_${new Date().toISOString().split('T')[0]}.csv`);
    toastManager.show('Language List CSV exported!', 'success');
};

/**
 * Export Word List CSV (v4.0 format - per language)
 * Format: Lesson, CardNum, Word, WordNote, English, EnglishNote, Grammar, Category, SubCategory1, SubCategory2, ACTFLEst, Type
 */
DeckBuilderModule.prototype.exportWordListCSV = function() {
    const csv = this.generateWordListCSV();
    this.downloadCSV(csv, `Word_List_${this.currentLanguageName}_${new Date().toISOString().split('T')[0]}.csv`);
    toastManager.show(`Word List CSV exported for ${this.currentLanguageName}!`, 'success');
};

/**
 * Generate per-language Word List CSV (v4.0 format - 12 columns)
 */
DeckBuilderModule.prototype.generateWordListCSV = function() {
    const headers = [
        'Lesson', 'CardNum', 'Word', 'WordNote', 'English', 'EnglishNote',
        'Grammar', 'Category', 'SubCategory1', 'SubCategory2', 'ACTFLEst', 'Type'
    ];

    let csv = headers.join(',') + '\n';

    this.allCards.forEach(card => {
        const row = [
            card.lesson || '',
            card.cardNum || card.wordNum || '',
            this.escapeCSV(this.getCardWord(card)),
            this.escapeCSV(card.wordNote || ''),
            this.escapeCSV(this.getCardEnglish(card)),
            this.escapeCSV(card.englishNote || ''),
            this.escapeCSV(card.grammar || ''),
            this.escapeCSV(card.category || ''),
            this.escapeCSV(card.subCategory1 || ''),
            this.escapeCSV(card.subCategory2 || ''),
            this.escapeCSV(card.actflEst || ''),
            card.type || 'N'
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
};

/**
 * Export Sentence Words CSV (per language)
 * Format: Lesson #,Q&A,Verb,Adverb,Function Words,Pronoun,Noun,Adjective,Preposition,Numbers,Special
 * Words can be strings or objects { word, cardNum } - both formats are supported
 */
DeckBuilderModule.prototype.exportSentenceWordsCSV = function() {
    const sentenceWords = this.assets.manifest?.sentenceWords?.[this.currentTrigraph];

    if (!sentenceWords || Object.keys(sentenceWords).length === 0) {
        toastManager.show(`No Sentence Words data available for ${this.currentLanguageName}`, 'warning');
        return;
    }

    // Define the column headers (word types)
    const wordTypes = ['Q&A', 'Verb', 'Adverb', 'Function Words', 'Pronoun', 'Noun', 'Adjective', 'Preposition', 'Numbers', 'Special'];
    const headers = ['Lesson #', ...wordTypes];

    let csv = headers.join(',') + '\n';

    // Sort lessons numerically
    const lessonNums = Object.keys(sentenceWords).sort((a, b) => parseInt(a) - parseInt(b));

    for (const lessonNum of lessonNums) {
        const lessonData = sentenceWords[lessonNum];
        const row = [lessonNum];

        for (const wordType of wordTypes) {
            const words = lessonData[wordType] || [];
            // Handle both string and object formats: { word, cardNum }
            const wordTexts = words.map(w => {
                if (typeof w === 'string') return w;
                // Include cardNum in export if present: "word[#cardNum]"
                return w.cardNum ? `${w.word}[#${w.cardNum}]` : w.word;
            });
            const cellValue = wordTexts.join(', ');
            row.push(this.escapeCSV(cellValue));
        }

        csv += row.join(',') + '\n';
    }

    this.downloadCSV(csv, `Sentence_Words_${this.currentTrigraph}_${new Date().toISOString().split('T')[0]}.csv`);
    toastManager.show(`Sentence Words CSV exported for ${this.currentLanguageName}!`, 'success');
};

/**
 * Export Sentence Review CSV (per language)
 * Format: Lesson #,Seq #,Sequ Title,Sentence #,Sentence Text,English Translation,Sentence Type
 */
DeckBuilderModule.prototype.exportSentenceReviewCSV = function() {
    const sentenceReview = this.assets.manifest?.sentenceReview?.[this.currentTrigraph];

    if (!sentenceReview || !sentenceReview.lessons || Object.keys(sentenceReview.lessons).length === 0) {
        toastManager.show(`No Sentence Review data available for ${this.currentLanguageName}`, 'warning');
        return;
    }

    const headers = ['Lesson #', 'Seq #', 'Sequ Title', 'Sentence #', 'Sentence Text', 'English Translation', 'Sentence Type'];
    let csv = headers.join(',') + '\n';

    // Sort lessons numerically
    const lessonNums = Object.keys(sentenceReview.lessons).sort((a, b) => parseInt(a) - parseInt(b));

    for (const lessonNum of lessonNums) {
        const lessonData = sentenceReview.lessons[lessonNum];
        const sequences = lessonData.sequences || [];

        sequences.forEach((seq, seqIndex) => {
            const seqNum = seq.id || (seqIndex + 1);
            const seqTitle = seq.title || '';

            // First row for sequence: header row with title
            const headerRow = [
                lessonNum,
                seqNum,
                this.escapeCSV(seqTitle),
                '',  // No sentence #
                '',  // No sentence text
                '',  // No english
                ''   // No type
            ];
            csv += headerRow.join(',') + '\n';

            // Sentence rows
            const sentences = seq.sentences || [];
            sentences.forEach((sentence, sentIndex) => {
                const sentNum = sentence.id || (sentIndex + 1);
                const sentText = sentence.text || '';
                const english = sentence.english || '';
                const sentType = sentence.type || '';

                const sentRow = [
                    '',  // Lesson # only on first row of sequence
                    '',  // Seq # only on header row
                    '',  // Title only on header row
                    sentNum,
                    this.escapeCSV(sentText),
                    this.escapeCSV(english),
                    this.escapeCSV(sentType)
                ];
                csv += sentRow.join(',') + '\n';
            });
        });
    }

    this.downloadCSV(csv, `Sentence_Review_${this.currentTrigraph}_${new Date().toISOString().split('T')[0]}.csv`);
    toastManager.show(`Sentence Review CSV exported for ${this.currentLanguageName}!`, 'success');
};

/**
 * Helper function to download CSV content as a file
 */
DeckBuilderModule.prototype.downloadCSV = function(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Legacy export function - kept for backward compatibility
 */
DeckBuilderModule.prototype.exportToCSV = function() {
    this.exportWordListCSV();
};

/**
 * Generate per-language CSV (v4.0 format - 12 columns)
 * @deprecated Use generateWordListCSV() instead
 */
DeckBuilderModule.prototype.generateCSV = function() {
    return this.generateWordListCSV();
};

/**
 * Escape CSV special characters
 */
DeckBuilderModule.prototype.escapeCSV = function(value) {
    if (typeof value !== 'string') return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
};
