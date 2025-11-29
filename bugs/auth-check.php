<?php
/**
 * Bug Tracker Authentication Check
 * Requires Admin role to access
 */

require_once dirname(__DIR__) . '/config.php';

// Start session with same name as main app
session_name(SESSION_NAME);
session_start();

/**
 * Check if user is authenticated as Admin
 * Returns array with 'authenticated' and 'error' keys
 */
function checkBugTrackerAuth() {
    // Check if logged in
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        return [
            'authenticated' => false,
            'error' => 'Not logged in. Please log in from the main application first.'
        ];
    }

    // Check session timeout
    $timeout_minutes = $_SESSION['timeout_minutes'] ?? DEFAULT_SESSION_TIMEOUT;
    $timeout_seconds = $timeout_minutes * 60;
    $last_activity = $_SESSION['last_activity'] ?? 0;

    if (time() - $last_activity > $timeout_seconds) {
        session_destroy();
        return [
            'authenticated' => false,
            'error' => 'Session expired. Please log in again.'
        ];
    }

    // Check if user is Admin
    $role = $_SESSION['user_role'] ?? null;
    if ($role !== 'admin') {
        return [
            'authenticated' => false,
            'error' => 'Access denied. Admin role required for Bug Tracker.'
        ];
    }

    // Update last activity
    $_SESSION['last_activity'] = time();

    return [
        'authenticated' => true,
        'username' => $_SESSION['username'] ?? 'Admin',
        'role' => $role
    ];
}

/**
 * Require Admin auth or return JSON error
 * Use this in API endpoints
 */
function requireBugTrackerAuth() {
    $auth = checkBugTrackerAuth();
    if (!$auth['authenticated']) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => $auth['error'],
            'requiresAuth' => true
        ]);
        exit;
    }
    return $auth;
}
