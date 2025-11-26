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

// Find user by role and password in users.json
function findUserByRoleAndPassword($role, $password) {
    $users = loadUsers();

    if ($users === null) {
        // Fallback to hardcoded passwords
        return null;
    }

    foreach ($users as $user) {
        if ($user['role'] === $role && $user['password'] === $password) {
            return $user;
        }
    }

    return false; // User not found (different from null which means fallback)
}

function handleLogin() {
    $password = $_POST['password'] ?? '';
    $selectedRole = $_POST['role'] ?? '';

    // Validate the selected role
    // Roles hierarchy: admin > deck-manager > editor > voice-recorder
    $validRoles = ['admin', 'deck-manager', 'editor', 'voice-recorder'];

    if (!in_array($selectedRole, $validRoles)) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid role selected'
        ]);
        return;
    }

    // Try to find user in users.json first
    $user = findUserByRoleAndPassword($selectedRole, $password);

    $passwordMatches = false;
    $username = null;

    if ($user === null) {
        // Fallback to config.php passwords (users.json doesn't exist)
        switch ($selectedRole) {
            case 'admin':
                $passwordMatches = ($password === ADMIN_PASSWORD);
                break;
            case 'deck-manager':
                $passwordMatches = ($password === DECK_MANAGER_PASSWORD);
                break;
            case 'editor':
                $passwordMatches = ($password === EDITOR_PASSWORD);
                break;
            case 'voice-recorder':
                $passwordMatches = ($password === VOICE_RECORDER_PASSWORD);
                break;
        }
    } elseif ($user !== false) {
        // User found in users.json
        $passwordMatches = true;
        $username = $user['username'];
    }
    // If $user === false, password doesn't match any user with that role

    if ($passwordMatches) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['user_role'] = $selectedRole;
        $_SESSION['username'] = $username;
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();

        // Use default or custom timeout
        if (!isset($_SESSION['timeout_minutes'])) {
            $_SESSION['timeout_minutes'] = DEFAULT_SESSION_TIMEOUT;
        }

        echo json_encode([
            'success' => true,
            'role' => $selectedRole,
            'username' => $username,
            'timeout_minutes' => $_SESSION['timeout_minutes']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Incorrect password for the selected role'
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
