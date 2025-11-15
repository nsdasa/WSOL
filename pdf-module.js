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
        this.pdfFormat = 'flashcards'; // flashcards, unsani, matching
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
                    <!-- NEW: Format Selection -->
                    <div class="config-card">
                        <h3><i class="fas fa-file-alt"></i> PDF Format</h3>
                        <div class="filter-options">
                            <label class="radio-label">
                                <input type="radio" name="pdfFormat" value="flashcards" checked>
                                Flashcards (2-sided printable cards)
                            </label>
                        </div>
                        <div class="filter-options">
                            <label class="radio-label">
                                <input type="radio" name="pdfFormat" value="unsani">
                                Unsa Ni? (Fill-in-the-blank worksheet)
                            </label>
                        </div>
                        <div class="filter-options">
                            <label class="radio-label">
                                <input type="radio" name="pdfFormat" value="matching">
                                Matching Game (Connect pictures to words)
                            </label>
                        </div>
                    </div>
                
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
                    
                    <div class="config-card" id="languageSelectionCard">
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
                        <button id="showPrintPreviewBtn" class="btn btn-secondary" style="margin-bottom: 16px;" disabled>
                            <i class="fas fa-eye"></i> Show Print Preview
                        </button>
                        <button id="generatePDFBtn" class="btn btn-primary btn-lg" disabled>
                            <i class="fas fa-file-pdf"></i> Generate PDF
                        </button>
                    </div>
                </div>
                
                <!-- Print Preview Modal -->
                <div id="printPreviewModal" class="modal hidden">
                    <div class="modal-content print-preview-modal">
                        <div class="modal-header">
                            <h2><i class="fas fa-file-pdf"></i> Print Preview</h2>
                            <button id="closePrintPreviewBtn" class="close-btn">&times;</button>
                        </div>
                        <div class="print-preview-loading hidden" id="previewLoading">
                            <div class="spinner"></div>
                            <p>Generating preview...</p>
                        </div>
                        <iframe id="pdfPreviewFrame" class="pdf-preview-frame"></iframe>
                        <div class="modal-footer">
                            <button id="downloadFromPreviewBtn" class="btn btn-primary">
                                <i class="fas fa-download"></i> Download PDF
                            </button>
                            <button id="closePreviewBtn" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
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
        
        // Setup PDF format radio buttons
        document.querySelectorAll('input[name="pdfFormat"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.pdfFormat = e.target.value;
                this.updateFormatUI();
            });
        });
        
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
        
        // Setup print preview button
        document.getElementById('showPrintPreviewBtn').addEventListener('click', () => {
            this.showPrintPreview();
        });
        
        // Setup print preview modal controls
        document.getElementById('closePrintPreviewBtn').addEventListener('click', () => {
            this.closePrintPreview();
        });
        
        document.getElementById('closePreviewBtn').addEventListener('click', () => {
            this.closePrintPreview();
        });
        
        document.getElementById('downloadFromPreviewBtn').addEventListener('click', () => {
            this.downloadPreviewedPDF();
        });
        
        // Store the preview PDF
        this.previewPdfBlob = null;
        
        // Initial preview
        this.updateCardPreview();
        this.updateFormatUI();
        
        // Show instructions
        if (instructionManager) {
            instructionManager.show(
                'pdf',
                'PDF Print Instructions',
                'Choose your PDF format, filter the cards you want, and click Generate PDF to create a printable document.'
            );
        }
    }
    
    updateFormatUI() {
        // Show/hide language selection based on format
        const languageCard = document.getElementById('languageSelectionCard');
        if (this.pdfFormat === 'flashcards') {
            languageCard.style.display = 'block';
        } else {
            languageCard.style.display = 'none';
        }
    }
    
    updateCardPreview() {
        const allCards = this.assets.cards || [];
        
        if (this.filterType === 'lesson') {
            const lessonFrom = parseInt(document.getElementById('lessonFromFilter').value);
            const lessonTo = parseInt(document.getElementById('lessonToFilter').value);
            const minLesson = Math.min(lessonFrom, lessonTo);
            const maxLesson = Math.max(lessonFrom, lessonTo);
            
            this.selectedCards = allCards.filter(c => c.lesson >= minLesson && c.lesson <= maxLesson);
        } else {
            const grammarType = document.getElementById('grammarFilter').value;
            if (grammarType) {
                this.selectedCards = allCards.filter(c => c.grammar === grammarType);
            } else {
                this.selectedCards = [];
            }
        }
        
        const previewCount = document.getElementById('cardPreviewCount');
        const generateBtn = document.getElementById('generatePDFBtn');
        const previewBtn = document.getElementById('showPrintPreviewBtn');
        
        if (this.selectedCards.length > 0) {
            previewCount.textContent = `${this.selectedCards.length} cards will be included`;
            previewCount.style.color = 'var(--success)';
            generateBtn.disabled = false;
            previewBtn.disabled = false;
        } else {
            previewCount.textContent = 'No cards match your filters';
            previewCount.style.color = 'var(--error)';
            generateBtn.disabled = true;
            previewBtn.disabled = true;
        }
    }
    
    async showPrintPreview() {
        // Show modal and loading state
        const modal = document.getElementById('printPreviewModal');
        const loading = document.getElementById('previewLoading');
        const iframe = document.getElementById('pdfPreviewFrame');
        
        modal.classList.remove('hidden');
        loading.classList.remove('hidden');
        iframe.style.display = 'none';
        
        try {
            // Generate the actual PDF
            const pdfBlob = await this.generatePDFPreview();
            
            // Create blob URL and display in iframe
            const blobUrl = URL.createObjectURL(pdfBlob);
            iframe.src = blobUrl;
            iframe.style.display = 'block';
            loading.classList.add('hidden');
            
            // Store for download
            this.previewPdfBlob = pdfBlob;
            
        } catch (error) {
            console.error('Preview generation error:', error);
            toastManager.show(`Preview failed: ${error.message}`, 'error');
            this.closePrintPreview();
        }
    }
    
    async generatePDFPreview() {
        // Generate PDF based on format, but return blob instead of downloading
        if (this.pdfFormat === 'flashcards') {
            return await this.generateFlashcardsPDFBlob();
        } else if (this.pdfFormat === 'unsani') {
            return await this.generateUnsaNiPDFBlob();
        } else if (this.pdfFormat === 'matching') {
            return await this.generateMatchingGamePDFBlob();
        }
    }
    
    closePrintPreview() {
        const modal = document.getElementById('printPreviewModal');
        const iframe = document.getElementById('pdfPreviewFrame');
        
        modal.classList.add('hidden');
        
        // Revoke blob URL to free memory
        if (iframe.src && iframe.src.startsWith('blob:')) {
            URL.revokeObjectURL(iframe.src);
        }
        iframe.src = '';
        
        this.previewPdfBlob = null;
    }
    
    downloadPreviewedPDF() {
        if (!this.previewPdfBlob) {
            toastManager.show('No PDF to download', 'error');
            return;
        }
        
        // Create download link
        const url = URL.createObjectURL(this.previewPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename
        const learningLang = this.assets.currentLanguage.name;
        let filterDesc;
        
        if (this.filterType === 'lesson') {
            const lessonFrom = parseInt(document.getElementById('lessonFromFilter').value);
            const lessonTo = parseInt(document.getElementById('lessonToFilter').value);
            filterDesc = lessonFrom === lessonTo ? `L${lessonFrom}` : `L${lessonFrom}-${lessonTo}`;
        } else {
            const grammarType = document.getElementById('grammarFilter').value;
            filterDesc = grammarType.replace(/\s+/g, '-');
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `${learningLang}-${this.pdfFormat}-${filterDesc}-${timestamp}.pdf`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toastManager.show('PDF downloaded!', 'success');
        this.closePrintPreview();
    }
    
    // ===== BLOB VERSIONS FOR PREVIEW =====
    async generateFlashcardsPDFBlob() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        const cardWidth = (pageWidth - margin * 3) / 2;
        const cardHeight = (pageHeight - margin * 3) / 2;
        const backgroundColor = [250, 248, 240];
        
        // Process cards in groups of 4
        for (let i = 0; i < this.selectedCards.length; i += 4) {
            const pageCards = this.selectedCards.slice(i, i + 4);
            
            if (i > 0) doc.addPage();
            await this.renderFrontPage(doc, pageCards, margin, cardWidth, cardHeight, backgroundColor);
            doc.addPage();
            await this.renderBackPage(doc, pageCards, margin, cardWidth, cardHeight, backgroundColor);
        }
        
        return doc.output('blob');
    }
    
    async generateUnsaNiPDFBlob() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const itemsPerPage = 6;
        
        for (let i = 0; i < this.selectedCards.length; i += itemsPerPage) {
            if (i > 0) doc.addPage();
            const pageCards = this.selectedCards.slice(i, i + itemsPerPage);
            await this.renderUnsaNiPage(doc, pageCards, pageWidth, pageHeight);
        }
        
        return doc.output('blob');
    }
    
    async generateMatchingGamePDFBlob() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const itemsPerPage = 10;
        
        for (let i = 0; i < this.selectedCards.length; i += itemsPerPage) {
            if (i > 0) doc.addPage();
            const pageCards = this.selectedCards.slice(i, i + itemsPerPage);
            await this.renderMatchingGamePage(doc, pageCards, pageWidth, pageHeight);
        }
        
        return doc.output('blob');
    }
    
    async generatePDF() {
        // Route to appropriate generator based on format
        if (this.pdfFormat === 'flashcards') {
            await this.generateFlashcardsPDF();
        } else if (this.pdfFormat === 'unsani') {
            await this.generateUnsaNiPDF();
        } else if (this.pdfFormat === 'matching') {
            await this.generateMatchingGamePDF();
        }
    }
    
    async generateFlashcardsPDF() {
        // Show processing message
        document.getElementById('processingMessage').classList.remove('hidden');
        document.getElementById('generatePDFBtn').disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
            
            const pageWidth = doc.internal.pageSize.width; // 215.9mm
            const pageHeight = doc.internal.pageSize.height; // 279.4mm
            const margin = 10;
            const cardWidth = (pageWidth - margin * 3) / 2;
            const cardHeight = (pageHeight - margin * 3) / 2;
            
            // Background color (light cream)
            const backgroundColor = [250, 248, 240];
            
            // Process cards in groups of 4
            for (let i = 0; i < this.selectedCards.length; i += 4) {
                const pageCards = this.selectedCards.slice(i, i + 4);
                
                if (i > 0) doc.addPage();
                
                // Add front page
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
    
    async generateUnsaNiPDF() {
        document.getElementById('processingMessage').classList.remove('hidden');
        document.getElementById('generatePDFBtn').disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
            
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            
            // Process cards in groups of 7 per page
            for (let i = 0; i < this.selectedCards.length; i += 7) {
                const pageCards = this.selectedCards.slice(i, i + 7);
                
                if (i > 0) doc.addPage();
                
                await this.renderUnsaNiPage(doc, pageCards, pageWidth, pageHeight);
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
            
            const filename = `${learningLang}_${filterDesc}_UnsaNi.pdf`;
            
            doc.save(filename);
            
            toastManager.show('Unsa Ni? PDF generated successfully!', 'success', 3000);
            
        } catch (error) {
            console.error('PDF generation error:', error);
            toastManager.show(`Error generating PDF: ${error.message}`, 'error', 5000);
        } finally {
            document.getElementById('processingMessage').classList.add('hidden');
            document.getElementById('generatePDFBtn').disabled = false;
        }
    }
    
    async generateMatchingGamePDF() {
        document.getElementById('processingMessage').classList.remove('hidden');
        document.getElementById('generatePDFBtn').disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
            
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            
            // Process cards in groups of 7 per page (matching game format)
            for (let i = 0; i < this.selectedCards.length; i += 7) {
                const pageCards = this.selectedCards.slice(i, i + 7);
                
                if (i > 0) doc.addPage();
                
                await this.renderMatchingGamePage(doc, pageCards, pageWidth, pageHeight);
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
            
            const filename = `${learningLang}_${filterDesc}_Matching.pdf`;
            
            doc.save(filename);
            
            toastManager.show('Matching Game PDF generated successfully!', 'success', 3000);
            
        } catch (error) {
            console.error('PDF generation error:', error);
            toastManager.show(`Error generating PDF: ${error.message}`, 'error', 5000);
        } finally {
            document.getElementById('processingMessage').classList.add('hidden');
            document.getElementById('generatePDFBtn').disabled = false;
        }
    }
    
    async renderPDFHeader(doc, pageWidth, title, subtitle) {
        // Try to load logo
        let logoLoaded = false;
        try {
            const logoData = await this.loadImageAsDataURL('assets/logo.png');
            const logoSize = 15; // mm
            const logoX = 10;
            const logoY = 8;
            doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
            logoLoaded = true;
        } catch (error) {
            console.log('Logo not found, skipping');
        }
        
        // School name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        const textX = logoLoaded ? 28 : 10;
        doc.text('Bob and Mariel Ward School of Filipino Languages', textX, 15);
        
        // Draw line under header
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, 25, pageWidth - 10, 25);
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth / 2, 35, { align: 'center' });
        
        // Subtitle if provided
        if (subtitle) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(subtitle, pageWidth / 2, 42, { align: 'center' });
        }
    }
    
    async renderUnsaNiPage(doc, cards, pageWidth, pageHeight) {
        // Render header
        await this.renderPDFHeader(doc, pageWidth, 'Isulat: Unsa kini?', 'LITRATO');
        
        const startY = 50;
        const rowHeight = 30;
        const imageSize = 25;
        const imageX = 15;
        const textX = 45;
        const lineWidth = 120;
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const y = startY + (i * rowHeight);
            
            // Draw border box around each item
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);
            doc.rect(10, y - 3, pageWidth - 20, rowHeight - 2);
            
            // Load and draw image
            try {
                const imgData = await this.loadImageAsDataURL(card.imagePath);
                doc.addImage(imgData, 'PNG', imageX, y, imageSize, imageSize, undefined, 'FAST');
            } catch (error) {
                console.error('Error loading image:', error);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text('Image not found', imageX + imageSize / 2, y + imageSize / 2, { align: 'center' });
            }
            
            // Draw "Kini ang" text
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            doc.text('Kini ang', textX, y + 13);
            
            // Draw blank line
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            const lineY = y + 15;
            doc.line(textX + 25, lineY, textX + lineWidth, lineY);
            
            // Draw period at the end
            doc.text('.', textX + lineWidth + 2, y + 13);
        }
    }
    
    async renderMatchingGamePage(doc, cards, pageWidth, pageHeight) {
        // Render header
        await this.renderPDFHeader(doc, pageWidth, 'Asa ang saktong pulong sa mga litrato?', '');
        
        const startY = 50;
        const rowHeight = 28;
        const imageSize = 22;
        const leftColX = 15;
        const dotRadius = 2;
        const leftDotX = leftColX + imageSize + 8;
        const rightDotX = pageWidth / 2 + 10;
        const wordX = rightDotX + 8;
        
        // Column headers
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LITRATO', leftColX, 48);
        doc.text('PULONG', rightDotX + 5, 48);
        
        // Scramble the words for the right column
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const shuffledCard = shuffledCards[i];
            const y = startY + (i * rowHeight);
            
            // LEFT SIDE: Image with dot on right
            try {
                const imgData = await this.loadImageAsDataURL(card.imagePath);
                doc.addImage(imgData, 'PNG', leftColX, y, imageSize, imageSize, undefined, 'FAST');
            } catch (error) {
                console.error('Error loading image:', error);
            }
            
            // Draw dot on right side of image
            doc.setFillColor(0);
            doc.circle(leftDotX, y + imageSize / 2, dotRadius, 'F');
            
            // RIGHT SIDE: Word with dot on left
            doc.setFillColor(0);
            doc.circle(rightDotX, y + imageSize / 2, dotRadius, 'F');
            
            // Draw word
            const learningLang = this.assets.currentLanguage.name;
            const word = shuffledCard.translations[learningLang.toLowerCase()].word;
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            doc.text(word, wordX, y + imageSize / 2 + 2);
        }
        
        // Draw vertical separator line
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2, 48, pageWidth / 2, startY + (cards.length * rowHeight));
    }
    
    async renderFrontPage(doc, cards, margin, cardWidth, cardHeight, bgColor) {
        // Set background color
        doc.setFillColor(...bgColor);
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
        doc.setFillColor(...bgColor);
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