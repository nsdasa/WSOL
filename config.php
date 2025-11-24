<?php
// =================================================================
// CONFIGURATION FILE - Bob and Mariel Ward School
// Store admin credentials and settings
// =================================================================

// Admin password (full access)
define('ADMIN_PASSWORD', 'WSOL10:15');

// Deck Manager password (full access to Deck Builder, no Admin access)
define('DECK_MANAGER_PASSWORD', 'deck123');

// Voice Recorder password (can only filter and record audio)
define('VOICE_RECORDER_PASSWORD', 'voice123');

// Default session timeout in minutes (can be changed in Admin panel)
define('DEFAULT_SESSION_TIMEOUT', 60);

// Session name
define('SESSION_NAME', 'bmw_school_session');

// =================================================================
// HTTPS ENFORCEMENT FUNCTION
// =================================================================
/**
 * Force HTTPS redirect with proxy support and security headers
 * Call this at the top of any PHP file that needs HTTPS enforcement
 */
function enforceHttps() {
    // Check if already using HTTPS (including behind proxy/load balancer)
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
               || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
               || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    if (!$isHttps) {
        // Build redirect URL
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $uri = $_SERVER['REQUEST_URI'] ?? '';

        if (!empty($host) && !empty($uri)) {
            $redirectUrl = 'https://' . $host . $uri;
            header('Location: ' . $redirectUrl, true, 301);
            exit;
        }
    }

    // Add security headers for HTTPS connections
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
}
