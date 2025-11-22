/**
 * DOM Selector Utilities
 * Helper functions for generating and validating CSS selectors
 */

class DOMSelector {
    // Generate unique selector for an element
    static generateSelector(element, document = window.document) {
        if (!element) return null;

        // Try ID first (most specific)
        if (element.id) {
            return '#' + CSS.escape(element.id);
        }

        // Try data attributes
        const dataAttrs = ['data-module', 'data-mode', 'data-step', 'data-card'];
        for (const attr of dataAttrs) {
            if (element.hasAttribute(attr)) {
                const selector = `[${attr}="${element.getAttribute(attr)}"]`;
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
        }

        // Try unique class combination
        if (element.classList.length > 0) {
            const classes = Array.from(element.classList)
                .filter(c => !c.startsWith('tour-') && !c.includes('active') && !c.includes('hover'))
                .map(c => CSS.escape(c));

            if (classes.length > 0) {
                // Try all classes
                const fullSelector = '.' + classes.join('.');
                if (document.querySelectorAll(fullSelector).length === 1) {
                    return fullSelector;
                }

                // Try with tag name
                const tagSelector = element.tagName.toLowerCase() + '.' + classes.join('.');
                if (document.querySelectorAll(tagSelector).length === 1) {
                    return tagSelector;
                }

                // Try most significant class only
                const primarySelector = '.' + classes[0];
                if (document.querySelectorAll(primarySelector).length === 1) {
                    return primarySelector;
                }
            }
        }

        // Build path from ancestors
        return this.buildPathSelector(element, document);
    }

    // Build selector path from element to a unique ancestor
    static buildPathSelector(element, document = window.document) {
        const path = [];
        let current = element;
        let depth = 0;
        const maxDepth = 5;

        while (current && current !== document.body && depth < maxDepth) {
            let selector = current.tagName.toLowerCase();

            // Add ID if present
            if (current.id) {
                selector = '#' + CSS.escape(current.id);
                path.unshift(selector);
                break;
            }

            // Add significant classes
            const classes = Array.from(current.classList)
                .filter(c => !c.startsWith('tour-') && !c.includes('active'))
                .slice(0, 2)
                .map(c => CSS.escape(c));

            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }

            // Add nth-child if needed for uniqueness
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentElement;
            depth++;
        }

        return path.join(' > ');
    }

    // Validate that a selector matches exactly one element
    static validateSelector(selector, document = window.document) {
        try {
            const matches = document.querySelectorAll(selector);
            return {
                valid: matches.length === 1,
                count: matches.length,
                element: matches.length === 1 ? matches[0] : null
            };
        } catch (error) {
            return {
                valid: false,
                count: 0,
                element: null,
                error: error.message
            };
        }
    }

    // Suggest alternative selectors
    static suggestSelectors(element, document = window.document) {
        const suggestions = [];

        // ID selector
        if (element.id) {
            suggestions.push({
                selector: '#' + CSS.escape(element.id),
                type: 'id',
                priority: 1
            });
        }

        // Class selectors
        if (element.classList.length > 0) {
            const classes = Array.from(element.classList)
                .filter(c => !c.startsWith('tour-'));

            classes.forEach(cls => {
                const selector = '.' + CSS.escape(cls);
                const count = document.querySelectorAll(selector).length;
                if (count === 1) {
                    suggestions.push({
                        selector,
                        type: 'class',
                        priority: 2
                    });
                }
            });
        }

        // Data attribute selectors
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                const selector = `[${attr.name}="${attr.value}"]`;
                const count = document.querySelectorAll(selector).length;
                if (count === 1) {
                    suggestions.push({
                        selector,
                        type: 'data-attribute',
                        priority: 3
                    });
                }
            }
        });

        // Path selector
        suggestions.push({
            selector: this.buildPathSelector(element, document),
            type: 'path',
            priority: 4
        });

        // Sort by priority
        suggestions.sort((a, b) => a.priority - b.priority);

        return suggestions;
    }

    // Get element bounding rect relative to viewport
    static getElementRect(element) {
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    }

    // Check if element is visible in viewport
    static isElementVisible(element) {
        if (!element) return false;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // Get scrollable parent
    static getScrollableParent(element) {
        let parent = element.parentElement;

        while (parent) {
            const style = window.getComputedStyle(parent);
            if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return parent;
            }
            parent = parent.parentElement;
        }

        return document.documentElement;
    }

    // Scroll element into view
    static scrollIntoView(element, behavior = 'smooth') {
        if (!element) return;

        element.scrollIntoView({
            behavior,
            block: 'center',
            inline: 'center'
        });
    }

    // Highlight element temporarily
    static flashHighlight(element, duration = 1000) {
        if (!element) return;

        const originalOutline = element.style.outline;
        const originalTransition = element.style.transition;

        element.style.transition = 'outline 0.2s ease';
        element.style.outline = '3px solid #4CAF50';

        setTimeout(() => {
            element.style.outline = originalOutline;
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, 200);
        }, duration);
    }
}
