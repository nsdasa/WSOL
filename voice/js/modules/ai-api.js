/**
 * AI API MODULE
 * 
 * Anthropic Claude API integration for pronunciation coaching feedback.
 * Provides intelligent analysis of pronunciation metrics using Claude AI.
 * 
 * Features:
 * - API key management with localStorage persistence
 * - Structured prompt generation from analysis results
 * - Markdown to HTML conversion for formatted feedback
 * - Error handling and user feedback
 * 
 * Dependencies: None (standalone)
 * 
 * @module ai-api
 */

export class AIAnalyzer {
    constructor() {
        this.apiKey = this.loadApiKey();
        this.analysisResults = null;
    }
    
    /**
     * Load API key from localStorage
     * @returns {string|null} API key or null if not configured
     */
    loadApiKey() {
        return localStorage.getItem('anthropic_api_key') || null;
    }
    
    /**
     * Save API key to localStorage
     * @param {string} key - Anthropic API key (must start with 'sk-')
     * @returns {boolean} Success status
     */
    saveApiKey(key) {
        const trimmedKey = key.trim();
        
        if (!trimmedKey || !trimmedKey.startsWith('sk-')) {
            return false;
        }
        
        this.apiKey = trimmedKey;
        localStorage.setItem('anthropic_api_key', trimmedKey);
        return true;
    }
    
    /**
     * Clear API key from localStorage
     */
    clearApiKey() {
        this.apiKey = null;
        localStorage.removeItem('anthropic_api_key');
    }
    
    /**
     * Check if API is configured
     * @returns {boolean} True if API key is set
     */
    isConfigured() {
        return this.apiKey !== null && this.apiKey.length > 0;
    }
    
    /**
     * Store analysis results for AI processing
     * @param {Object} results - Analysis results from PronunciationComparator
     */
    setAnalysisResults(results) {
        this.analysisResults = results;
    }
    
    /**
     * Build structured prompt for Claude API
     * @param {Object} metrics - Analysis metrics
     * @returns {string} Formatted prompt
     */
    buildPrompt(metrics) {
        return `You are a pronunciation coach analyzing speech evaluation metrics for a language learner. Based on the following calculated metrics, provide detailed, actionable feedback for improving pronunciation.

## Target Language Context
The learner may be practicing Cebuano, Maranao, or Sinama - Philippine languages. If you have specific phonological knowledge about these languages (such as common sound patterns, stress rules, or vowel systems), include relevant guidance. If you don't have specific knowledge about the target language, provide general articulatory guidance without making up language-specific details.

## Calculated Metrics (scores out of 100)
${JSON.stringify(metrics, null, 2)}

## Your Task
1. **Interpret the scores** - Explain what each metric means in plain language
2. **Prioritize issues** - Focus on the lowest scores first (most critical improvements)
3. **Give specific, actionable advice** for each issue
4. **Include articulatory guidance** - Tongue position, lip shape, breath control, etc.
5. **Be encouraging but honest** - Acknowledge strengths while addressing weaknesses

Keep your response focused and practical. Use clear formatting but avoid excessive bullet points.`;
    }
    
    /**
     * Convert markdown text to basic HTML
     * @param {string} markdown - Markdown formatted text
     * @returns {string} HTML formatted text
     */
    convertMarkdownToHTML(markdown) {
        return markdown
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gm, '<h5 style="margin: 15px 0 10px 0; color: #065f46;">$1</h5>')
            .replace(/^## (.*$)/gm, '<h4 style="margin: 15px 0 10px 0; color: #047857;">$1</h4>')
            .replace(/^- /gm, '• ')
            .replace(/^\d+\. /gm, (match) => `<strong>${match}</strong>`)
            .replace(/\n\n/g, '</p><p style="margin: 10px 0;">')
            .replace(/\n/g, '<br>');
    }
    
    /**
     * Run AI analysis using Claude API
     * @returns {Promise<string>} HTML formatted feedback
     * @throws {Error} If API request fails or prerequisites not met
     */
    async runAnalysis() {
        // Validate prerequisites
        if (!this.isConfigured()) {
            throw new Error('API key not configured. Please add your Anthropic API key.');
        }
        
        if (!this.analysisResults) {
            throw new Error('No analysis results available. Please run pronunciation analysis first.');
        }
        
        // Build metrics object
        const metrics = {
            overallScore: this.analysisResults.score,
            breakdown: this.analysisResults.breakdown,
            detailedReport: this.analysisResults.detailedReport
        };
        
        const prompt = this.buildPrompt(metrics);
        
        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        const feedback = data.content[0].text;
        
        // Convert markdown to HTML
        const html = this.convertMarkdownToHTML(feedback);
        
        return `<p style="margin: 10px 0;">${html}</p>`;
    }
}

/**
 * UI Manager for AI Analysis
 * Handles DOM interactions for the AI analysis feature
 */
export class AIAnalysisUI {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.elements = {
            section: null,
            content: null,
            button: null,
            status: null,
            input: null
        };
    }
    
    /**
     * Initialize UI elements
     * @param {Object} elementIds - DOM element IDs
     */
    init(elementIds) {
        this.elements.section = document.getElementById(elementIds.section || 'aiAnalysisSection');
        this.elements.content = document.getElementById(elementIds.content || 'aiAnalysisContent');
        this.elements.button = document.getElementById(elementIds.button || 'aiAnalysisBtn');
        this.elements.status = document.getElementById(elementIds.status || 'apiStatus');
        this.elements.input = document.getElementById(elementIds.input || 'apiKeyInput');
        
        this.updateStatus();
    }
    
    /**
     * Update API configuration status display
     */
    updateStatus() {
        if (!this.elements.status || !this.elements.button) return;
        
        const configured = this.analyzer.isConfigured();
        
        if (configured) {
            this.elements.status.textContent = 'API Configured ✓';
            this.elements.status.className = 'api-status configured';
            this.elements.button.disabled = false;
            
            if (this.elements.input) {
                this.elements.input.value = '••••••••••••••••';
            }
        } else {
            this.elements.status.textContent = 'API Not Configured';
            this.elements.status.className = 'api-status not-configured';
            this.elements.button.disabled = true;
        }
    }
    
    /**
     * Handle save API key action
     */
    handleSaveKey() {
        if (!this.elements.input) return;
        
        const key = this.elements.input.value.trim();
        const success = this.analyzer.saveApiKey(key);
        
        if (success) {
            this.updateStatus();
            this.showMessage('API key saved to localStorage', 'success');
        } else {
            alert('Please enter a valid Anthropic API key (starts with sk-)');
        }
    }
    
    /**
     * Handle clear API key action
     */
    handleClearKey() {
        this.analyzer.clearApiKey();
        
        if (this.elements.input) {
            this.elements.input.value = '';
        }
        
        this.updateStatus();
        this.showMessage('API key cleared', 'info');
    }
    
    /**
     * Run AI analysis and display results
     */
    async runAnalysis() {
        if (!this.elements.section || !this.elements.content || !this.elements.button) {
            console.error('AI UI elements not initialized');
            return;
        }
        
        // Show loading state
        this.elements.section.style.display = 'block';
        this.elements.content.innerHTML = '<div style="text-align: center; color: #6b7280;"><span style="animation: pulse 1.5s infinite;">🔄</span> Getting AI analysis...</div>';
        this.elements.button.disabled = true;
        
        try {
            const html = await this.analyzer.runAnalysis();
            this.elements.content.innerHTML = html;
            this.showMessage('AI analysis complete', 'success');
            
        } catch (error) {
            this.elements.content.innerHTML = `<div style="color: #dc2626; padding: 10px; background: #fee2e2; border-radius: 4px;">
                <strong>Error:</strong> ${error.message}
            </div>`;
            this.showMessage(`AI analysis error: ${error.message}`, 'error');
            
        } finally {
            this.elements.button.disabled = false;
        }
    }
    
    /**
     * Show a message (placeholder - should be implemented by consumer)
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, info)
     */
    showMessage(message, type) {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Export convenience function for quick setup
export function createAIAnalysis(debugLog = console) {
    const analyzer = new AIAnalyzer();
    const ui = new AIAnalysisUI(analyzer);
    
    // Inject debug logger
    ui.showMessage = (msg, type) => {
        if (debugLog && debugLog.log) {
            debugLog.log(msg, type);
        }
    };
    
    return { analyzer, ui };
}
