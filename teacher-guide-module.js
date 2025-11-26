/**
 * Teacher's Guide Module
 * Displays teacher's guide lessons from HTML files
 * Supports both:
 * - "Web Page, Filtered" HTML from Word (with images folder)
 * - Single-file HTML from converter (with embedded base64 images)
 */
class TeacherGuideModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.currentContent = null;
        this.availableLessons = [];
    }

    async render() {
        const langName = this.assets.currentLanguage?.name || 'Language';
        const langTrigraph = this.assets.currentLanguage?.trigraph || '';
        const currentLesson = this.assets.currentLesson || 1;

        this.container.innerHTML = `
            <div class="container module-teacher-guide">
                <div class="teacher-guide-header">
                    <h1><i class="fas fa-chalkboard-teacher"></i> Teacher's Guide (${langName}: Lesson ${currentLesson})</h1>
                </div>

                <div class="teacher-guide-toolbar">
                    <div class="toolbar-info">
                        <span id="teacherGuideStatus" class="teacher-guide-status">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </span>
                    </div>
                    <div class="toolbar-actions">
                        <button id="teacherGuideRefreshBtn" class="btn btn-secondary btn-sm" title="Refresh content">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button id="teacherGuidePrintBtn" class="btn btn-secondary btn-sm" title="Print teacher's guide">
                            <i class="fas fa-print"></i>
                        </button>
                        <button id="teacherGuideFullscreenBtn" class="btn btn-secondary btn-sm" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>

                <div id="teacherGuideContent" class="teacher-guide-content">
                    <div class="teacher-guide-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading teacher's guide content...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        // Check if language and lesson are selected
        if (!this.assets.currentLanguage || !this.assets.currentLesson) {
            this.showEmptyState('Please select a language and lesson from the dropdowns above.');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Load the teacher's guide content
        await this.loadTeacherGuideContent();
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('teacherGuideRefreshBtn');
        const printBtn = document.getElementById('teacherGuidePrintBtn');
        const fullscreenBtn = document.getElementById('teacherGuideFullscreenBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadTeacherGuideContent());
        }

        if (printBtn) {
            printBtn.addEventListener('click', () => this.printTeacherGuide());
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    async loadTeacherGuideContent() {
        const contentEl = document.getElementById('teacherGuideContent');
        const statusEl = document.getElementById('teacherGuideStatus');

        if (!contentEl) return;

        const langTrigraph = this.assets.currentLanguage?.trigraph;
        const lesson = this.assets.currentLesson;

        if (!langTrigraph || !lesson) {
            this.showEmptyState('Please select a language and lesson.');
            return;
        }

        // Check manifest for teacher's guide file availability
        const teacherGuideInfo = this.assets.manifest?.teacherGuide;
        const langTeacherGuide = teacherGuideInfo?.[langTrigraph];
        const teacherGuideFile = langTeacherGuide?.[lesson];

        if (!teacherGuideFile) {
            // No teacher's guide file for this lesson - show message immediately (no searching)
            this.showNoTeacherGuideState();
            if (statusEl) {
                statusEl.innerHTML = '';
            }
            return;
        }

        // Show loading state
        contentEl.innerHTML = `
            <div class="teacher-guide-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading teacher's guide content...</p>
            </div>
        `;

        // Load the teacher's guide file directly using the filename from manifest
        const filePath = `assets/teacher-guide/${langTrigraph}/${teacherGuideFile}`;

        try {
            const response = await fetch(filePath);
            if (response.ok) {
                // Fetch as ArrayBuffer to handle encoding properly
                const buffer = await response.arrayBuffer();
                const htmlContent = this.decodeWithCorrectEncoding(buffer);

                // Process and display the HTML content
                this.displayContent(htmlContent, filePath);

                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Loaded`;
                }
            } else {
                // File listed in manifest but not found - show error
                this.showEmptyState(`Teacher's guide file not found: ${teacherGuideFile}`);
            }
        } catch (e) {
            this.showEmptyState(`Error loading teacher's guide: ${e.message}`);
        }
    }

    showNoTeacherGuideState() {
        const contentEl = document.getElementById('teacherGuideContent');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div class="teacher-guide-empty">
                <i class="fas fa-chalkboard-teacher"></i>
                <h3>No Teacher's Guide for this Lesson</h3>
            </div>
        `;
    }

    displayContent(htmlContent, sourcePath) {
        const contentEl = document.getElementById('teacherGuideContent');
        if (!contentEl) return;

        // Fix encoding issues from Word's "Web Page, Filtered" export
        // Word uses Windows-1252 encoding which can cause issues with smart quotes
        htmlContent = this.fixEncoding(htmlContent);

        // Extract the body content from the HTML
        // This handles both full HTML documents and body-only content
        let bodyContent = htmlContent;

        // Try to extract body content from full HTML document
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
            bodyContent = bodyMatch[1];
        }

        // Fix relative image paths if needed
        // For "Web Page, Filtered" files, images are in a subfolder like "lesson-1_files/"
        const basePath = sourcePath.substring(0, sourcePath.lastIndexOf('/') + 1);

        // Replace relative src paths with absolute paths
        bodyContent = bodyContent.replace(
            /src="([^"]+)"/g,
            (match, src) => {
                // Skip if already absolute or data URI
                if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) {
                    return match;
                }
                return `src="${basePath}${src}"`;
            }
        );

        // Also fix background-image URLs in inline styles
        bodyContent = bodyContent.replace(
            /url\(['"]?([^'")]+)['"]?\)/g,
            (match, url) => {
                if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
                    return match;
                }
                return `url('${basePath}${url}')`;
            }
        );

        // Wrap content in a container that applies our styling
        contentEl.innerHTML = `
            <div class="teacher-guide-document">
                ${bodyContent}
            </div>
        `;

        this.currentContent = bodyContent;
    }

    showEmptyState(message) {
        const contentEl = document.getElementById('teacherGuideContent');
        const statusEl = document.getElementById('teacherGuideStatus');

        if (contentEl) {
            contentEl.innerHTML = `
                <div class="teacher-guide-empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }

        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-info-circle"></i> Select lesson`;
        }
    }

    showNoContentState(langTrigraph, lesson) {
        const contentEl = document.getElementById('teacherGuideContent');
        const statusEl = document.getElementById('teacherGuideStatus');

        if (contentEl) {
            contentEl.innerHTML = `
                <div class="teacher-guide-empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Teacher's Guide Content Available</h3>
                    <p>No teacher's guide file found for <strong>${langTrigraph.toUpperCase()}</strong> Lesson <strong>${lesson}</strong>.</p>
                    <div class="teacher-guide-help">
                        <p><strong>To add teacher's guide content:</strong></p>
                        <ol>
                            <li>Create your teacher's guide document in Microsoft Word</li>
                            <li>Save as <strong>"Web Page, Filtered (*.htm)"</strong><br>
                                <em>or</em> use the <a href="converter/" target="_blank">Converter</a> to convert DOCX to HTML</li>
                            <li>Place the file in: <code>assets/teacher-guide/${langTrigraph}/</code></li>
                            <li>Name it: <code>lesson-${lesson}.html</code></li>
                        </ol>
                    </div>
                </div>
            `;
        }

        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> Not found`;
        }
    }

    printTeacherGuide() {
        const contentEl = document.getElementById('teacherGuideContent');
        if (!contentEl || !this.currentContent) {
            if (typeof toastManager !== 'undefined') {
                toastManager.show('No content to print', 'warning');
            }
            return;
        }

        // Create a print window
        const printWindow = window.open('', '_blank');
        const langName = this.assets.currentLanguage?.name || 'Teacher\'s Guide';
        const lesson = this.assets.currentLesson || '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${langName} - Lesson ${lesson} Teacher's Guide</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    img { max-width: 100%; height: auto; }
                    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                    th, td { border: 1px solid #ccc; padding: 8px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${this.currentContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    toggleFullscreen() {
        const contentEl = document.getElementById('teacherGuideContent');
        if (!contentEl) return;

        if (!document.fullscreenElement) {
            contentEl.requestFullscreen().catch(err => {
                if (typeof toastManager !== 'undefined') {
                    toastManager.show('Fullscreen not available', 'warning');
                }
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Decode ArrayBuffer with correct encoding
     * Word's "Web Page, Filtered" uses Windows-1252 encoding
     * This method detects the charset and decodes accordingly
     */
    decodeWithCorrectEncoding(buffer) {
        // First, try to peek at the content to find charset declaration
        // Use a simple ASCII decode first (works for meta tags)
        const uint8Array = new Uint8Array(buffer);
        let peekContent = '';

        // Read first 1024 bytes as ASCII to find meta charset
        for (let i = 0; i < Math.min(1024, uint8Array.length); i++) {
            peekContent += String.fromCharCode(uint8Array[i]);
        }

        // Look for charset declaration in meta tags
        // <meta charset="windows-1252">
        // <meta http-equiv="Content-Type" content="text/html; charset=windows-1252">
        const charsetMatch = peekContent.match(/charset=["']?([^"'\s>]+)/i);
        let charset = charsetMatch ? charsetMatch[1].toLowerCase() : null;

        // Word's "Web Page, Filtered" typically uses windows-1252
        // Common aliases
        if (charset === 'windows-1252' || charset === 'cp1252' || charset === 'iso-8859-1') {
            charset = 'windows-1252';
        }

        // If no charset found, try to detect Windows-1252 by looking for its byte patterns
        // Windows-1252 smart quotes are bytes 0x91-0x94, 0x96-0x97
        if (!charset) {
            for (let i = 0; i < uint8Array.length; i++) {
                const byte = uint8Array[i];
                // Check for Windows-1252 specific characters (0x80-0x9F range)
                if (byte >= 0x91 && byte <= 0x94) {  // Smart quotes
                    charset = 'windows-1252';
                    break;
                }
                if (byte === 0x96 || byte === 0x97) {  // En/em dash
                    charset = 'windows-1252';
                    break;
                }
            }
        }

        // Default to windows-1252 for Word documents, UTF-8 otherwise
        if (!charset) {
            charset = 'utf-8';
        }

        // Decode with the detected charset
        try {
            const decoder = new TextDecoder(charset);
            return decoder.decode(buffer);
        } catch (e) {
            // Fallback to UTF-8 if charset not supported
            console.warn(`Charset ${charset} not supported, falling back to UTF-8`);
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(buffer);
        }
    }

    /**
     * Fix encoding issues from Word's "Web Page, Filtered" export
     * Word uses Windows-1252 encoding which causes smart quotes to display as corrupted characters
     * This method replaces corrupted characters with their proper equivalents
     */
    fixEncoding(html) {
        // Common Windows-1252 to UTF-8 encoding issues
        // These appear when Windows-1252 encoded files are read as UTF-8
        const replacements = [
            // Smart quotes (most common issue)
            [/\u0093/g, '"'],      // Left double quote
            [/\u0094/g, '"'],      // Right double quote
            [/\u0091/g, "'"],      // Left single quote
            [/\u0092/g, "'"],      // Right single quote
            [/\u0085/g, '...'],    // Ellipsis
            [/\u0096/g, '–'],      // En dash
            [/\u0097/g, '—'],      // Em dash

            // Note: Do NOT remove \ufffd (replacement character) - it deletes content
            // Instead, we now handle encoding properly in decodeWithCorrectEncoding()

            // Windows-1252 bytes misread as UTF-8 (shows as A followed by special char)
            [/Â\u0093/g, '"'],
            [/Â\u0094/g, '"'],
            [/Â\u0091/g, "'"],
            [/Â\u0092/g, "'"],
            [/Â·/g, '·'],          // Middle dot
            [/Â©/g, '©'],          // Copyright
            [/Â®/g, '®'],          // Registered
            [/Â°/g, '°'],          // Degree
            [/Â±/g, '±'],          // Plus-minus
            [/Â²/g, '²'],          // Superscript 2
            [/Â³/g, '³'],          // Superscript 3
            [/Â¼/g, '¼'],          // 1/4
            [/Â½/g, '½'],          // 1/2
            [/Â¾/g, '¾'],          // 3/4

            // Common corrupted sequences from Word
            [/â€œ/g, '"'],         // Left double quote (UTF-8 bytes as Windows-1252)
            [/â€/g, '"'],         // Right double quote
            [/â€˜/g, "'"],         // Left single quote
            [/â€™/g, "'"],         // Right single quote (apostrophe)
            [/â€"/g, '–'],         // En dash
            [/â€"/g, '—'],         // Em dash
            [/â€¦/g, '...'],       // Ellipsis
            [/Ã¢â‚¬Å"/g, '"'],     // More corrupted left quote
            [/Ã¢â‚¬/g, '"'],      // More corrupted right quote
            [/Ã¢â‚¬â„¢/g, "'"],    // Corrupted apostrophe

            // Fix double-encoded characters
            [/&amp;/g, '&'],       // Already escaped ampersand
        ];

        let fixed = html;
        for (const [pattern, replacement] of replacements) {
            fixed = fixed.replace(pattern, replacement);
        }

        return fixed;
    }

    destroy() {
        this.currentContent = null;
        this.container.innerHTML = '';
    }
}

// Make globally available
window.TeacherGuideModule = TeacherGuideModule;
