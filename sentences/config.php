<?php
/**
 * Cebuano Vocabulary Generator - Configuration
 * 
 * SECURITY INSTRUCTIONS:
 * 1. Move this file OUTSIDE your web root if possible
 *    e.g., /home/username/config/cebuano-config.php
 *    Then update the require path in api.php
 * 
 * 2. If you must keep it in web root, the .htaccess file
 *    should block direct access to this file
 * 
 * 3. Set restrictive file permissions: chmod 640 config.php
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    http_response_code(403);
    die('Direct access not allowed');
}

return [
    // ===========================================
    // REQUIRED: Your Anthropic API Key
    // ===========================================
    'api_key' => 'sk-ant-api03-YOUR-API-KEY-HERE',
    
    // ===========================================
    // Model Configuration
    // ===========================================
    'default_model' => 'claude-sonnet-4-5-20250929',
    'max_tokens' => 32000,
    
    // Available models for the dropdown
    'available_models' => [
        'claude-sonnet-4-5-20250929',
        'claude-opus-4-5-20251101',
        'claude-haiku-4-5-20251001'
    ],
    
    // ===========================================
    // Rate Limiting (requests per hour per IP)
    // ===========================================
    'rate_limit' => 30,
    
    // ===========================================
    // API Rate Limit Handling
    // ===========================================
    
    // Delay between processing lessons (in seconds)
    // Recommended: 15-30 seconds to avoid Anthropic rate limits
    'delay_between_requests' => 20,
    
    // Retry configuration for 429 (rate limit) errors
    'retry' => [
        // Maximum number of retry attempts
        'max_attempts' => 5,
        
        // Initial delay before first retry (seconds)
        'initial_delay' => 10,
        
        // Multiplier for exponential backoff (delay doubles each retry)
        'backoff_multiplier' => 2,
        
        // Maximum delay between retries (seconds)
        'max_delay' => 120
    ],
    
    // ===========================================
    // Security
    // ===========================================
    // Allowed origins for CORS (empty = same origin only)
    'allowed_origins' => [],
    
    // ===========================================
    // Debug & Logging (set to true to troubleshoot)
    // ===========================================
    // When true:
    // - Server logs are written to temp directory
    // - Click "Server Logs" button in Debug Console to view
    // - Detailed errors are returned
    // SET TO FALSE IN PRODUCTION!
    'debug' => false
];
