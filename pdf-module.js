// =================================================================
// PDF FLASHCARD PRINTING MODULE
// =================================================================

class PDFPrintModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.selectedCards = [];
        this.selectedLanguages = ['english'];
        this.filterType = 'lesson';
        this.filterValue = null;
    }
    
    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const lessonNum = this.assets.currentLesson || 'Lesson';
        
        // Get unique lessons and grammar types from actual data
        const allCards = this.assets.cards || [];
        const lessons = [...new Set(allCards.map(c => c.lesson))].sort((a, b) => a - b);
        const grammarTypes = [...new Set(allCards.map(c => c.grammar).filter(g => g))].sort();
        
        // Get available languages from manifest
        const availableLanguages = this.assets.languages || [];
        const currentLang = this.assets.currentLanguage?.trigraph.toLowerCase();
        const backLanguages = availableLanguages.filter(lang => lang.trigraph.toLowerCase() !== currentLang);
        
        this.container.innerHTML = `
            <div class="container module-pdf-print">
                <h1>Print Flashcards to PDF (${langName}: Lesson ${lessonNum})</h1>
                
                <div class="pdf-config-section">
                    <div class="config-card">
                        <h3><i class="fas fa-filter"></i> Filter Cards</h3>
                        <div class="filter-options">
                            <label class="radio-label">
                                <input type="radio" name="filterType" value="lesson" checked>
                                By Lesson Range
                            </label>
                            <div class="lesson-range">
                                <select id="lessonFromFilter" class="select-control">
                                    ${lessons.map(l => `<option value="${l}">Lesson ${l}</option>`).join('')}
                                </select>
                                <span class="range-separator">to</span>
                                <select id="lessonToFilter" class="select-control">
                                    ${lessons.map((l, idx) => `<option value="${l}" ${idx === lessons.length - 1 ? 'selected' : ''}>Lesson ${l}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="filter-options">
                            <label class="radio-label">
                                <input type="radio" name="filterType" value="grammar">
                                By Grammar Type
                            </label>
                            <select id="grammarFilter" class="select-control" disabled>
                                <option value="">Select Grammar Type...</option>
                                ${grammarTypes.map(g => `<option value="${g}">${g}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="config-card">
                        <h3><i class="fas fa-language"></i> Card Back Languages</h3>
                        <p class="config-hint">Select languages to show on card backs (up to 2)</p>
                        <div class="language-checkboxes">
                            ${backLanguages.map(lang => {
                                const langKey = lang.trigraph.toLowerCase();
                                const isEnglish = langKey === 'eng';
                                return `
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                           class="back-lang-checkbox" 
                                           value="${langKey}"
                                           data-name="${lang.name.toLowerCase()}"
                                           ${isEnglish ? 'checked' : ''}>
                                    ${lang.name}
                                </label>
                            `}).join('')}
                        </div>
                    </div>
                    
                    <div class="config-card">
                        <h3><i class="fas fa-list"></i> Preview</h3>
                        <div id="cardPreviewCount" class="preview-count">
                            Select filters to see card count
                        </div>
                        <button id="generatePDFBtn" class="btn btn-primary btn-lg" disabled>
                            <i class="fas fa-file-pdf"></i> Generate PDF
                        </button>
                    </div>
                </div>
                
                <div id="processingMessage" class="processing-message hidden">
                    <div class="spinner"></div>
                    <p>Generating PDF... Please wait</p>
                </div>
            </div>
        `;
    }
    
    async init() {
        // Check if language and lesson are selected
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Please select a language and lesson from the dropdowns above to begin.</p>
                </div>
            `;
            return;
        }
        
        // Initialize with English if available
        const englishCheckbox = document.querySelector('.back-lang-checkbox[value="eng"]');
        if (englishCheckbox) {
            this.selectedLanguages = ['english'];
        } else {
            this.selectedLanguages = [];
        }
        
        // Setup filter radio buttons
        document.querySelectorAll('input[name="filterType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.filterType = e.target.value;
                document.getElementById('lessonFromFilter').disabled = this.filterType !== 'lesson';
                document.getElementById('lessonToFilter').disabled = this.filterType !== 'lesson';
                document.getElementById('grammarFilter').disabled = this.filterType !== 'grammar';
                this.updateCardPreview();
            });
        });
        
        // Setup lesson range filters
        document.getElementById('lessonFromFilter').addEventListener('change', () => {
            this.updateCardPreview();
        });
        
        document.getElementById('lessonToFilter').addEventListener('change', () => {
            this.updateCardPreview();
        });
        
        document.getElementById('grammarFilter').addEventListener('change', () => {
            this.updateCardPreview();
        });
        
        // Setup language checkboxes
        document.querySelectorAll('.back-lang-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const langName = e.target.dataset.name;
                
                if (e.target.checked) {
                    if (this.selectedLanguages.length < 2) {
                        this.selectedLanguages.push(langName);
                    } else {
                        e.target.checked = false;
                        return;
                    }
                } else {
                    this.selectedLanguages = this.selectedLanguages.filter(l => l !== langName);
                }
                
                // Update checkbox states
                document.querySelectorAll('.back-lang-checkbox').forEach(cb => {
                    if (!cb.checked && this.selectedLanguages.length >= 2) {
                        cb.disabled = true;
                    } else {
                        cb.disabled = false;
                    }
                });
            });
        });
        
        // Setup generate button
        document.getElementById('generatePDFBtn').addEventListener('click', () => {
            this.generatePDF();
        });
        
        // Initial preview
        this.updateCardPreview();
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'pdf-print',
                'PDF Printing Instructions',
                'Select your filter options and languages, then click Generate PDF to create printable flashcards.'
            );
        }
    }
    
    updateCardPreview() {
        const allCards = this.assets.cards || [];
        let filtered = allCards.filter(card => card.hasImage); // Only cards with images
        
        // Apply filters
        if (this.filterType === 'lesson') {
            const lessonFrom = parseInt(document.getElementById('lessonFromFilter').value);
            const lessonTo = parseInt(document.getElementById('lessonToFilter').value);
            
            // Ensure from <= to
            const minLesson = Math.min(lessonFrom, lessonTo);
            const maxLesson = Math.max(lessonFrom, lessonTo);
            
            filtered = filtered.filter(c => c.lesson >= minLesson && c.lesson <= maxLesson);
        } else if (this.filterType === 'grammar') {
            const grammarValue = document.getElementById('grammarFilter').value;
            if (grammarValue) {
                filtered = filtered.filter(c => c.grammar === grammarValue);
            } else {
                filtered = [];
            }
        }
        
        this.selectedCards = filtered;
        
        const previewEl = document.getElementById('cardPreviewCount');
        const generateBtn = document.getElementById('generatePDFBtn');
        
        if (this.selectedCards.length === 0) {
            previewEl.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-info-circle"></i>
                    <p>No cards match the selected filters</p>
                </div>
            `;
            generateBtn.disabled = true;
        } else {
            const pages = Math.ceil(this.selectedCards.length / 4) * 2; // Front and back pages
            previewEl.innerHTML = `
                <div class="preview-stats">
                    <div class="stat-item">
                        <span class="stat-number">${this.selectedCards.length}</span>
                        <span class="stat-label">Cards</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${pages}</span>
                        <span class="stat-label">Pages</span>
                    </div>
                </div>
            `;
            generateBtn.disabled = false;
        }
    }
    
    async generatePDF() {
        if (this.selectedCards.length === 0) return;
        
        // Show processing message
        document.getElementById('processingMessage').classList.remove('hidden');
        document.getElementById('generatePDFBtn').disabled = true;
        
        try {
            // Import jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter' // 8.5" x 11"
            });
            
            const pageWidth = 215.9; // Letter width in mm
            const pageHeight = 279.4; // Letter height in mm
            const cardWidth = (pageWidth - 20) / 2; // 2 columns
            const cardHeight = (pageHeight - 20) / 2; // 2 rows
            const margin = 10;
            const backgroundColor = '#A8D5BA'; // Light teal
            
            // Process cards in groups of 4
            for (let i = 0; i < this.selectedCards.length; i += 4) {
                const pageCards = this.selectedCards.slice(i, i + 4);
                
                // Add front page
                if (i > 0) doc.addPage();
                await this.renderFrontPage(doc, pageCards, margin, cardWidth, cardHeight, backgroundColor);
                
                // Add back page (horizontally flipped positions)
                doc.addPage();
                await this.renderBackPage(doc, pageCards, margin, cardWidth, cardHeight, backgroundColor);
            }
            
            // Save the PDF
            const learningLang = this.assets.currentLanguage.name;
            let filterDesc;
            
            if (this.filterType === 'lesson') {
                const lessonFrom = parseInt(document.getElementById('lessonFromFilter').value);
                const lessonTo = parseInt(document.getElementById('lessonToFilter').value);
                const minLesson = Math.min(lessonFrom, lessonTo);
                const maxLesson = Math.max(lessonFrom, lessonTo);
                
                if (minLesson === maxLesson) {
                    filterDesc = `L${minLesson}`;
                } else {
                    filterDesc = `L${minLesson}-L${maxLesson}`;
                }
            } else {
                filterDesc = document.getElementById('grammarFilter').value || 'All';
            }
            
            const filename = `${learningLang}_${filterDesc}_Flashcards.pdf`;
            
            doc.save(filename);
            
            toastManager.show('PDF generated successfully!', 'success', 3000);
            
        } catch (error) {
            console.error('PDF generation error:', error);
            toastManager.show(`Error generating PDF: ${error.message}`, 'error', 5000);
        } finally {
            document.getElementById('processingMessage').classList.add('hidden');
            document.getElementById('generatePDFBtn').disabled = false;
        }
    }
    
    async renderFrontPage(doc, cards, margin, cardWidth, cardHeight, bgColor) {
        // Set background color
        doc.setFillColor(bgColor);
        doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
        
        const positions = [
            { x: margin, y: margin }, // Top-left
            { x: margin + cardWidth, y: margin }, // Top-right
            { x: margin, y: margin + cardHeight }, // Bottom-left
            { x: margin + cardWidth, y: margin + cardHeight } // Bottom-right
        ];
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const pos = positions[i];
            
            // Draw card border
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(pos.x, pos.y, cardWidth, cardHeight);
            
            // Draw white background
            doc.setFillColor(255, 255, 255);
            doc.rect(pos.x + 1, pos.y + 1, cardWidth - 2, cardHeight - 2, 'F');
            
            // Load and draw image
            try {
                const imgData = await this.loadImageAsDataURL(card.imagePath);
                const imgWidth = cardWidth * 0.8;
                const imgHeight = cardHeight * 0.8;
                const imgX = pos.x + (cardWidth - imgWidth) / 2;
                const imgY = pos.y + (cardHeight - imgHeight) / 2;
                
                doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
            } catch (error) {
                console.error('Error loading image:', error);
                // Draw placeholder text
                doc.setFontSize(12);
                doc.setTextColor(150);
                doc.text('Image not found', pos.x + cardWidth / 2, pos.y + cardHeight / 2, { align: 'center' });
            }
        }
    }
    
    async renderBackPage(doc, cards, margin, cardWidth, cardHeight, bgColor) {
        // Set background color
        doc.setFillColor(bgColor);
        doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
        
        // Horizontally flipped positions for backs
        const positions = [
            { x: margin + cardWidth, y: margin }, // Top-right (was top-left)
            { x: margin, y: margin }, // Top-left (was top-right)
            { x: margin + cardWidth, y: margin + cardHeight }, // Bottom-right (was bottom-left)
            { x: margin, y: margin + cardHeight } // Bottom-left (was bottom-right)
        ];
        
        const learningLang = this.assets.currentLanguage.name;
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const pos = positions[i];
            
            // Draw card border
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(pos.x, pos.y, cardWidth, cardHeight);
            
            // Draw white background
            doc.setFillColor(255, 255, 255);
            doc.rect(pos.x + 1, pos.y + 1, cardWidth - 2, cardHeight - 2, 'F');
            
            // Get translations
            const learningTranslation = card.translations[learningLang.toLowerCase()];
            
            let yOffset = pos.y + 25;
            const centerX = pos.x + cardWidth / 2;
            
            // Learning language label
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            doc.text(learningLang, centerX, yOffset, { align: 'center' });
            yOffset += 10;
            
            // Learning language word (large, bold)
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text(learningTranslation.word, centerX, yOffset, { align: 'center' });
            yOffset += 15;
            
            // Add selected secondary languages
            this.selectedLanguages.forEach(langKey => {
                const translation = card.translations[langKey];
                const langLabel = langKey.charAt(0).toUpperCase() + langKey.slice(1);
                
                if (translation && translation.word) {
                    // Language label
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'normal');
                    doc.text(langLabel, centerX, yOffset, { align: 'center' });
                    yOffset += 8;
                    
                    // Translation word (large, bold)
                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.text(translation.word, centerX, yOffset, { align: 'center' });
                    yOffset += 12;
                }
            });
            
            // Lesson number at bottom
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150);
            doc.text(`L${card.lesson}`, centerX, pos.y + cardHeight - 5, { align: 'center' });
        }
    }
    
    loadImageAsDataURL(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imagePath;
        });
    }
}

// Export to global scope
window.PDFPrintModule = PDFPrintModule;
