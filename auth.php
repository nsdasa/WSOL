<?php
// =================================================================
// AUTHENTICATION HANDLER - Bob and Mariel Ward School
// Handles login, logout, and session validation
// Now supports dynamic users from users.json
// =================================================================

require_once 'config.php';
enforceHttps();

session_start();

header('Content-Type: application/json');

// Define the users file path
define('USERS_FILE', __DIR__ . '/users.json');

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

    case 'listUsers':
        listUsers();
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

// Load users from JSON file
function loadUsers() {
    if (!file_exists(USERS_FILE)) {
        // Fallback to config.php passwords if users.json doesn't exist
        return null;
    }

    $content = file_get_contents(USERS_FILE);
    $data = json_decode($content, true);
    return $data['users'] ?? null;
}

// Find user by username in users.json
function findUserByUsername($username) {
    $users = loadUsers();

    if ($users === null) {
        return null;
    }

    foreach ($users as $user) {
        if ($user['username'] === $username) {
            return $user;
        }
    }

    return false; // User not found
}

// List users for login dropdown (without passwords)
function listUsers() {
    $users = loadUsers();

    if ($users === null) {
        // Return fallback roles if users.json doesn't exist
        echo json_encode([
            'success' => true,
            'users' => [
                ['username' => 'admin', 'role' => 'admin', 'language' => null],
                ['username' => 'deck-manager', 'role' => 'deck-manager', 'language' => null],
                ['username' => 'editor', 'role' => 'editor', 'language' => null],
                ['username' => 'voice-recorder', 'role' => 'voice-recorder', 'language' => null]
            ]
        ]);
        return;
    }

    // Return users without passwords
    $safeUsers = array_map(function($user) {
        return [
            'username' => $user['username'],
            'role' => $user['role'],
            'language' => $user['language'] ?? null
        ];
    }, $users);

    echo json_encode([
        'success' => true,
        'users' => $safeUsers
    ]);
}

function handleLogin() {
    $password = $_POST['password'] ?? '';
    $username = $_POST['username'] ?? '';

    if (empty($username)) {
        echo json_encode([
            'success' => false,
            'error' => 'Please select a user'
        ]);
        return;
    }

    // Try to find user by username in users.json
    $user = findUserByUsername($username);

    $passwordMatches = false;
    $role = null;
    $language = null;

    if ($user === null) {
        // Fallback to config.php passwords (users.json doesn't exist)
        // In this case, username IS the role
        $validRoles = ['admin', 'deck-manager', 'editor', 'voice-recorder'];
        if (in_array($username, $validRoles)) {
            switch ($username) {
                case 'admin':
                    $passwordMatches = ($password === ADMIN_PASSWORD);
                    $role = 'admin';
                    break;
                case 'deck-manager':
                    $passwordMatches = ($password === DECK_MANAGER_PASSWORD);
                    $role = 'deck-manager';
                    break;
                case 'editor':
                    $passwordMatches = ($password === EDITOR_PASSWORD);
                    $role = 'editor';
                    break;
                case 'voice-recorder':
                    $passwordMatches = ($password === VOICE_RECORDER_PASSWORD);
                    $role = 'voice-recorder';
                    break;
            }
        }
    } elseif ($user !== false) {
        // User found in users.json - verify password
        if ($user['password'] === $password) {
            $passwordMatches = true;
            $role = $user['role'];
            $language = $user['language'] ?? null;
        }
    }

    if ($passwordMatches) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['user_role'] = $role;
        $_SESSION['username'] = $username;
        $_SESSION['user_language'] = $language; // Language restriction (null = all languages)
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();

        // Use default or custom timeout
        if (!isset($_SESSION['timeout_minutes'])) {
            $_SESSION['timeout_minutes'] = DEFAULT_SESSION_TIMEOUT;
        }

        echo json_encode([
            'success' => true,
            'role' => $role,
            'username' => $username,
            'language' => $_SESSION['user_language'],
            'timeout_minutes' => $_SESSION['timeout_minutes']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Incorrect password for user: ' . $username
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
        'username' => $_SESSION['username'] ?? null,
        'language' => $_SESSION['user_language'] ?? null,
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
