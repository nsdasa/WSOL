/**
 * Preview Frame Component
 * Manages the iframe that displays the main application modules
 */

class PreviewFrame {
    constructor(app) {
        this.app = app;
        this.iframe = document.getElementById('previewFrame');
        this.wrapper = document.getElementById('iframeWrapper');
        this.placeholder = document.getElementById('previewPlaceholder');
        this.highlightEl = document.getElementById('elementHighlight');
        this.canvas = document.getElementById('overlayCanvas');

        this.currentModule = null;
        this.zoomScale = 1;
        this.selectionMode = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle iframe load
        this.iframe.addEventListener('load', () => {
            this.onFrameLoaded();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateCanvasSize();
        });
    }

    loadModule(moduleName) {
        this.currentModule = moduleName;

        // Show iframe, hide placeholder
        this.placeholder.style.display = 'none';
        this.wrapper.style.display = 'block';

        // Build URL with module hash
        let url = '../index.php';
        if (moduleName === 'rec') {
            url = '../rec/index.php';
        } else {
            url = `../index.php#${moduleName}`;
        }

        // Add query param to indicate editor mode
        url += (url.includes('?') ? '&' : '?') + 'editorMode=true';

        this.iframe.src = url;
    }

    onFrameLoaded() {
        console.log('Preview frame loaded');
        this.updateCanvasSize();
        this.injectEditorHelpers();
    }

    injectEditorHelpers() {
        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;

            // Add editor mode class
            iframeDoc.body.classList.add('tour-editor-mode');

            // Inject helper script
            const script = iframeDoc.createElement('script');
            script.textContent = `
                // Tour Editor Helper Script
                (function() {
                    window.tourEditorBridge = {
                        // Send message to parent
                        sendToEditor: function(type, data) {
                            window.parent.postMessage({ source: 'tourEditor', type: type, data: data }, '*');
                        },

                        // Highlight element on hover
                        highlightedElement: null,

                        enableSelection: function() {
                            document.body.style.cursor = 'crosshair';
                            document.addEventListener('mouseover', this.handleMouseOver, true);
                            document.addEventListener('click', this.handleClick, true);
                        },

                        disableSelection: function() {
                            document.body.style.cursor = '';
                            document.removeEventListener('mouseover', this.handleMouseOver, true);
                            document.removeEventListener('click', this.handleClick, true);
                            if (this.highlightedElement) {
                                this.highlightedElement.style.outline = '';
                                this.highlightedElement = null;
                            }
                        },

                        handleMouseOver: function(e) {
                            e.stopPropagation();
                            const bridge = window.tourEditorBridge;
                            if (bridge.highlightedElement) {
                                bridge.highlightedElement.style.outline = '';
                            }
                            bridge.highlightedElement = e.target;
                            e.target.style.outline = '2px solid #4CAF50';

                            // Send element bounds to editor
                            const rect = e.target.getBoundingClientRect();
                            bridge.sendToEditor('elementHover', {
                                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                                selector: bridge.generateSelector(e.target)
                            });
                        },

                        handleClick: function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const bridge = window.tourEditorBridge;
                            const selector = bridge.generateSelector(e.target);
                            bridge.sendToEditor('elementSelected', { selector: selector });
                        },

                        generateSelector: function(element) {
                            // Try ID first
                            if (element.id) {
                                return '#' + element.id;
                            }

                            // Try unique class combination
                            if (element.classList.length > 0) {
                                const classes = Array.from(element.classList)
                                    .filter(c => !c.startsWith('tour-editor'))
                                    .join('.');
                                if (classes) {
                                    const selector = element.tagName.toLowerCase() + '.' + classes;
                                    if (document.querySelectorAll(selector).length === 1) {
                                        return selector;
                                    }
                                    // Try just classes
                                    const classSelector = '.' + classes;
                                    if (document.querySelectorAll(classSelector).length === 1) {
                                        return classSelector;
                                    }
                                }
                            }

                            // Build path from parents
                            let path = [];
                            let current = element;
                            while (current && current !== document.body) {
                                let selector = current.tagName.toLowerCase();
                                if (current.id) {
                                    selector = '#' + current.id;
                                    path.unshift(selector);
                                    break;
                                } else if (current.classList.length > 0) {
                                    const classes = Array.from(current.classList)
                                        .filter(c => !c.startsWith('tour-editor'))
                                        .slice(0, 2)
                                        .join('.');
                                    if (classes) {
                                        selector += '.' + classes;
                                    }
                                }
                                path.unshift(selector);
                                current = current.parentElement;
                            }
                            return path.slice(-3).join(' > ');
                        },

                        // Highlight specific element
                        highlightSelector: function(selector) {
                            this.clearHighlight();
                            if (!selector) return;
                            const el = document.querySelector(selector);
                            if (el) {
                                el.style.outline = '3px dashed #4CAF50';
                                el.style.outlineOffset = '2px';
                                this.highlightedElement = el;

                                // Scroll into view
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                const rect = el.getBoundingClientRect();
                                this.sendToEditor('elementHighlighted', {
                                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                                });
                            }
                        },

                        clearHighlight: function() {
                            if (this.highlightedElement) {
                                this.highlightedElement.style.outline = '';
                                this.highlightedElement.style.outlineOffset = '';
                                this.highlightedElement = null;
                            }
                        },

                        // Execute actions
                        executeAction: function(action) {
                            return new Promise((resolve, reject) => {
                                const target = document.querySelector(action.target);
                                if (!target && action.type !== 'wait') {
                                    reject(new Error('Target not found: ' + action.target));
                                    return;
                                }

                                switch (action.type) {
                                    case 'click':
                                        target.click();
                                        break;
                                    case 'dblclick':
                                        target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                                        break;
                                    case 'input':
                                        target.value = action.value;
                                        target.dispatchEvent(new Event('input', { bubbles: true }));
                                        target.dispatchEvent(new Event('change', { bubbles: true }));
                                        break;
                                    case 'scroll':
                                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        break;
                                    case 'wait':
                                        // Just wait
                                        break;
                                }

                                setTimeout(resolve, action.delay || 300);
                            });
                        },

                        // Run multiple actions
                        executeActions: async function(actions) {
                            for (const action of actions) {
                                await this.executeAction(action);
                            }
                            this.sendToEditor('actionsCompleted', {});
                        }
                    };

                    // Listen for messages from editor
                    window.addEventListener('message', function(e) {
                        if (e.data && e.data.source === 'tourEditorParent') {
                            const bridge = window.tourEditorBridge;
                            switch (e.data.type) {
                                case 'enableSelection':
                                    bridge.enableSelection();
                                    break;
                                case 'disableSelection':
                                    bridge.disableSelection();
                                    break;
                                case 'highlight':
                                    bridge.highlightSelector(e.data.selector);
                                    break;
                                case 'clearHighlight':
                                    bridge.clearHighlight();
                                    break;
                                case 'executeActions':
                                    bridge.executeActions(e.data.actions);
                                    break;
                            }
                        }
                    });

                    // Notify editor that bridge is ready
                    window.tourEditorBridge.sendToEditor('bridgeReady', {});
                })();
            `;
            iframeDoc.head.appendChild(script);

            // Inject styles
            const style = iframeDoc.createElement('style');
            style.textContent = `
                .tour-editor-mode * {
                    transition: outline 0.1s ease !important;
                }
            `;
            iframeDoc.head.appendChild(style);

        } catch (error) {
            console.error('Error injecting editor helpers:', error);
        }
    }

    refresh() {
        if (this.currentModule) {
            this.loadModule(this.currentModule);
        }
    }

    setZoom(scale) {
        this.zoomScale = scale;
        this.iframe.style.transform = `scale(${scale})`;
        this.iframe.style.width = (100 / scale) + '%';
        this.iframe.style.height = (100 / scale) + '%';
    }

    updateCanvasSize() {
        const rect = this.wrapper.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    // Element selection
    enableElementSelection() {
        this.selectionMode = true;
        this.sendToIframe('enableSelection');

        // Listen for messages from iframe
        window.addEventListener('message', this.handleIframeMessage);
    }

    disableElementSelection() {
        this.selectionMode = false;
        this.sendToIframe('disableSelection');
        window.removeEventListener('message', this.handleIframeMessage);
    }

    handleIframeMessage = (e) => {
        if (e.data && e.data.source === 'tourEditor') {
            switch (e.data.type) {
                case 'elementHover':
                    this.showHighlightOverlay(e.data.data.rect);
                    break;
                case 'elementSelected':
                    this.app.onElementSelected(e.data.data.selector);
                    break;
                case 'elementHighlighted':
                    this.showHighlightOverlay(e.data.data.rect);
                    break;
                case 'bridgeReady':
                    console.log('Iframe bridge ready');
                    break;
                case 'actionsCompleted':
                    console.log('Actions completed');
                    break;
            }
        }
    }

    showHighlightOverlay(rect) {
        this.highlightEl.style.display = 'block';
        this.highlightEl.style.top = (rect.top * this.zoomScale) + 'px';
        this.highlightEl.style.left = (rect.left * this.zoomScale) + 'px';
        this.highlightEl.style.width = (rect.width * this.zoomScale) + 'px';
        this.highlightEl.style.height = (rect.height * this.zoomScale) + 'px';
    }

    highlightElement(selector) {
        this.sendToIframe('highlight', { selector });
    }

    clearHighlight() {
        this.highlightEl.style.display = 'none';
        this.sendToIframe('clearHighlight');
    }

    sendToIframe(type, data = {}) {
        try {
            this.iframe.contentWindow.postMessage({
                source: 'tourEditorParent',
                type: type,
                ...data
            }, '*');
        } catch (error) {
            console.error('Error sending to iframe:', error);
        }
    }

    // Execute actions in iframe
    executeActions(actions) {
        this.sendToIframe('executeActions', { actions });
    }

    // Run tour preview
    runTour(moduleName, config) {
        // For now, just send to iframe to run with Driver.js
        this.sendToIframe('runTour', { module: moduleName, config: config });
    }
}
