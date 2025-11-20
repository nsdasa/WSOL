<?php
// =================================================================
// AUTHENTICATION HANDLER - Bob and Mariel Ward School
// Handles login, logout, and session validation
// =================================================================

session_start();
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    case 'check':
        checkSession();
        break;
    
    case 'setTimeout':
        setSessionTimeout();
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

function handleLogin() {
    $password = $_POST['password'] ?? '';

    // Check which role the password matches
    $role = null;
    if ($password === ADMIN_PASSWORD) {
        $role = 'admin';
    } elseif ($password === DECK_MANAGER_PASSWORD) {
        $role = 'deck-manager';
    } elseif ($password === VOICE_RECORDER_PASSWORD) {
        $role = 'voice-recorder';
    }

    if ($role) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['user_role'] = $role;
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        
        // Use default or custom timeout
        if (!isset($_SESSION['timeout_minutes'])) {
            $_SESSION['timeout_minutes'] = DEFAULT_SESSION_TIMEOUT;
        }
        
        echo json_encode([
            'success' => true,
            'role' => $role,
            'timeout_minutes' => $_SESSION['timeout_minutes']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Incorrect password'
        ]);
    }
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true]);
}

function checkSession() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        echo json_encode(['authenticated' => false]);
        return;
    }
    
    $timeout_minutes = $_SESSION['timeout_minutes'] ?? DEFAULT_SESSION_TIMEOUT;
    $timeout_seconds = $timeout_minutes * 60;
    $last_activity = $_SESSION['last_activity'] ?? 0;
    
    if (time() - $last_activity > $timeout_seconds) {
        session_destroy();
        echo json_encode([
            'authenticated' => false,
            'reason' => 'Session expired'
        ]);
        return;
    }
    
    // Update last activity
    $_SESSION['last_activity'] = time();
    
    echo json_encode([
        'authenticated' => true,
        'role' => $_SESSION['user_role'] ?? 'admin',
        'timeout_minutes' => $timeout_minutes,
        'time_remaining' => $timeout_seconds - (time() - $last_activity)
    ]);
}

function setSessionTimeout() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        return;
    }
    
    $minutes = intval($_POST['minutes'] ?? DEFAULT_SESSION_TIMEOUT);
    
    if ($minutes < 5 || $minutes > 480) { // 5 min to 8 hours
        echo json_encode(['success' => false, 'error' => 'Timeout must be between 5 and 480 minutes']);
        return;
    }
    
    $_SESSION['timeout_minutes'] = $minutes;
    $_SESSION['last_activity'] = time(); // Reset timer
    
    echo json_encode([
        'success' => true,
        'timeout_minutes' => $minutes
    ]);
}
