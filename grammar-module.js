/**
 * Grammar Module
 * Displays grammar lessons from HTML files
 * Supports both:
 * - "Web Page, Filtered" HTML from Word (with images folder)
 * - Single-file HTML from converter (with embedded base64 images)
 */
class GrammarModule extends LearningModule {
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
            <div class="container module-grammar">
                <div class="grammar-header">
                    <h1><i class="fas fa-book-open"></i> Grammar (${langName}: Lesson ${currentLesson})</h1>
                </div>

                <div class="grammar-toolbar">
                    <div class="toolbar-info">
                        <span id="grammarStatus" class="grammar-status">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </span>
                    </div>
                    <div class="toolbar-actions">
                        <button id="grammarRefreshBtn" class="btn btn-secondary btn-sm" title="Refresh content">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button id="grammarPrintBtn" class="btn btn-secondary btn-sm" title="Print grammar">
                            <i class="fas fa-print"></i>
                        </button>
                        <button id="grammarFullscreenBtn" class="btn btn-secondary btn-sm" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>

                <div id="grammarContent" class="grammar-content">
                    <div class="grammar-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading grammar content...</p>
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

        // Load the grammar content
        await this.loadGrammarContent();
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('grammarRefreshBtn');
        const printBtn = document.getElementById('grammarPrintBtn');
        const fullscreenBtn = document.getElementById('grammarFullscreenBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGrammarContent());
        }

        if (printBtn) {
            printBtn.addEventListener('click', () => this.printGrammar());
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    async loadGrammarContent() {
        const contentEl = document.getElementById('grammarContent');
        const statusEl = document.getElementById('grammarStatus');

        if (!contentEl) return;

        // Show loading state
        contentEl.innerHTML = `
            <div class="grammar-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading grammar content...</p>
            </div>
        `;

        const langTrigraph = this.assets.currentLanguage?.trigraph;
        const lesson = this.assets.currentLesson;

        if (!langTrigraph || !lesson) {
            this.showEmptyState('Please select a language and lesson.');
            return;
        }

        // Try to load the HTML file
        // Supports multiple naming conventions:
        // - lesson-1.html, lesson-1.htm
        // - Lesson 1.html, Lesson 1.htm
        // - grammar-1.html, etc.
        const possiblePaths = [
            `assets/grammar/${langTrigraph}/lesson-${lesson}.html`,
            `assets/grammar/${langTrigraph}/lesson-${lesson}.htm`,
            `assets/grammar/${langTrigraph}/Lesson ${lesson}.html`,
            `assets/grammar/${langTrigraph}/Lesson ${lesson}.htm`,
            `assets/grammar/${langTrigraph}/Lesson${lesson}.html`,
            `assets/grammar/${langTrigraph}/Lesson${lesson}.htm`,
            `assets/grammar/${langTrigraph}/grammar-${lesson}.html`,
            `assets/grammar/${langTrigraph}/grammar-${lesson}.htm`,
            `assets/grammar/${langTrigraph}/${lesson}.html`,
            `assets/grammar/${langTrigraph}/${lesson}.htm`
        ];

        let htmlContent = null;
        let loadedPath = null;

        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    htmlContent = await response.text();
                    loadedPath = path;
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        if (!htmlContent) {
            this.showNoContentState(langTrigraph, lesson);
            return;
        }

        // Process and display the HTML content
        this.displayContent(htmlContent, loadedPath);

        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Loaded`;
        }
    }

    displayContent(htmlContent, sourcePath) {
        const contentEl = document.getElementById('grammarContent');
        if (!contentEl) return;

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
            <div class="grammar-document">
                ${bodyContent}
            </div>
        `;

        this.currentContent = bodyContent;
    }

    showEmptyState(message) {
        const contentEl = document.getElementById('grammarContent');
        const statusEl = document.getElementById('grammarStatus');

        if (contentEl) {
            contentEl.innerHTML = `
                <div class="grammar-empty-state">
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
        const contentEl = document.getElementById('grammarContent');
        const statusEl = document.getElementById('grammarStatus');

        if (contentEl) {
            contentEl.innerHTML = `
                <div class="grammar-empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Grammar Content Available</h3>
                    <p>No grammar file found for <strong>${langTrigraph.toUpperCase()}</strong> Lesson <strong>${lesson}</strong>.</p>
                    <div class="grammar-help">
                        <p><strong>To add grammar content:</strong></p>
                        <ol>
                            <li>Create your grammar document in Microsoft Word</li>
                            <li>Save as <strong>"Web Page, Filtered (*.htm)"</strong><br>
                                <em>or</em> use the <a href="converter/" target="_blank">Converter</a> to convert DOCX to HTML</li>
                            <li>Place the file in: <code>assets/grammar/${langTrigraph}/</code></li>
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

    printGrammar() {
        const contentEl = document.getElementById('grammarContent');
        if (!contentEl || !this.currentContent) {
            if (typeof toastManager !== 'undefined') {
                toastManager.show('No content to print', 'warning');
            }
            return;
        }

        // Create a print window
        const printWindow = window.open('', '_blank');
        const langName = this.assets.currentLanguage?.name || 'Grammar';
        const lesson = this.assets.currentLesson || '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${langName} - Lesson ${lesson} Grammar</title>
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
        const contentEl = document.getElementById('grammarContent');
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

    destroy() {
        this.currentContent = null;
        this.container.innerHTML = '';
    }
}

// Make globally available
window.GrammarModule = GrammarModule;
