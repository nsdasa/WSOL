<?php
// =================================================================
// USER MANAGEMENT API - Bob and Mariel Ward School
// Handles user CRUD operations (Admin only)
// =================================================================

require_once 'config.php';
enforceHttps();

session_start();

header('Content-Type: application/json');

// Define the users file path
define('USERS_FILE', __DIR__ . '/users.json');

// Check if user is authenticated as admin
function requireAdmin() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }

    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }
}

// Load users from JSON file
function loadUsers() {
    if (!file_exists(USERS_FILE)) {
        // Create default users file if it doesn't exist
        $defaultUsers = [
            'users' => [
                [
                    'id' => 1,
                    'username' => 'admin',
                    'password' => ADMIN_PASSWORD,
                    'role' => 'admin',
                    'created' => date('c'),
                    'lastModified' => date('c')
                ],
                [
                    'id' => 2,
                    'username' => 'deckmanager',
                    'password' => DECK_MANAGER_PASSWORD,
                    'role' => 'deck-manager',
                    'created' => date('c'),
                    'lastModified' => date('c')
                ],
                [
                    'id' => 3,
                    'username' => 'voicerecorder',
                    'password' => VOICE_RECORDER_PASSWORD,
                    'role' => 'voice-recorder',
                    'created' => date('c'),
                    'lastModified' => date('c')
                ]
            ],
            'nextId' => 4
        ];
        saveUsers($defaultUsers);
        return $defaultUsers;
    }

    $content = file_get_contents(USERS_FILE);
    return json_decode($content, true) ?: ['users' => [], 'nextId' => 1];
}

// Save users to JSON file
function saveUsers($data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents(USERS_FILE, $json) !== false;
}

// Get action from query string
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        requireAdmin();
        listUsers();
        break;

    case 'add':
        requireAdmin();
        addUser();
        break;

    case 'edit':
        requireAdmin();
        editUser();
        break;

    case 'delete':
        requireAdmin();
        deleteUser();
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

// List all users (passwords are masked)
function listUsers() {
    $data = loadUsers();

    // Mask passwords for security
    $users = array_map(function($user) {
        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'created' => $user['created'] ?? null,
            'lastModified' => $user['lastModified'] ?? null
        ];
    }, $data['users']);

    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
}

// Add a new user
function addUser() {
    $input = json_decode(file_get_contents('php://input'), true);

    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $role = $input['role'] ?? '';

    // Validate inputs
    if (empty($username)) {
        echo json_encode(['success' => false, 'error' => 'Username is required']);
        return;
    }

    if (strlen($username) < 3) {
        echo json_encode(['success' => false, 'error' => 'Username must be at least 3 characters']);
        return;
    }

    if (empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Password is required']);
        return;
    }

    if (strlen($password) < 4) {
        echo json_encode(['success' => false, 'error' => 'Password must be at least 4 characters']);
        return;
    }

    $validRoles = ['admin', 'deck-manager', 'editor', 'voice-recorder'];
    if (!in_array($role, $validRoles)) {
        echo json_encode(['success' => false, 'error' => 'Invalid role. Must be: admin, deck-manager, editor, or voice-recorder']);
        return;
    }

    $data = loadUsers();

    // Check if username already exists
    foreach ($data['users'] as $user) {
        if (strtolower($user['username']) === strtolower($username)) {
            echo json_encode(['success' => false, 'error' => 'Username already exists']);
            return;
        }
    }

    // Create new user
    $newUser = [
        'id' => $data['nextId'],
        'username' => $username,
        'password' => $password,
        'role' => $role,
        'created' => date('c'),
        'lastModified' => date('c')
    ];

    $data['users'][] = $newUser;
    $data['nextId']++;

    if (saveUsers($data)) {
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user' => [
                'id' => $newUser['id'],
                'username' => $newUser['username'],
                'role' => $newUser['role']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save user']);
    }
}

// Edit an existing user
function editUser() {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = intval($input['id'] ?? 0);
    $username = isset($input['username']) ? trim($input['username']) : null;
    $password = $input['password'] ?? null;
    $role = $input['role'] ?? null;

    if ($id <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid user ID']);
        return;
    }

    $data = loadUsers();
    $userIndex = -1;

    // Find user by ID
    foreach ($data['users'] as $index => $user) {
        if ($user['id'] === $id) {
            $userIndex = $index;
            break;
        }
    }

    if ($userIndex === -1) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }

    // Update username if provided
    if ($username !== null) {
        if (strlen($username) < 3) {
            echo json_encode(['success' => false, 'error' => 'Username must be at least 3 characters']);
            return;
        }

        // Check if username already exists (for another user)
        foreach ($data['users'] as $index => $user) {
            if ($index !== $userIndex && strtolower($user['username']) === strtolower($username)) {
                echo json_encode(['success' => false, 'error' => 'Username already exists']);
                return;
            }
        }

        $data['users'][$userIndex]['username'] = $username;
    }

    // Update password if provided
    if ($password !== null && $password !== '') {
        if (strlen($password) < 4) {
            echo json_encode(['success' => false, 'error' => 'Password must be at least 4 characters']);
            return;
        }
        $data['users'][$userIndex]['password'] = $password;
    }

    // Update role if provided
    if ($role !== null) {
        $validRoles = ['admin', 'deck-manager', 'editor', 'voice-recorder'];
        if (!in_array($role, $validRoles)) {
            echo json_encode(['success' => false, 'error' => 'Invalid role']);
            return;
        }
        $data['users'][$userIndex]['role'] = $role;
    }

    $data['users'][$userIndex]['lastModified'] = date('c');

    if (saveUsers($data)) {
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully',
            'user' => [
                'id' => $data['users'][$userIndex]['id'],
                'username' => $data['users'][$userIndex]['username'],
                'role' => $data['users'][$userIndex]['role']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save user']);
    }
}

// Delete a user
function deleteUser() {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = intval($input['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid user ID']);
        return;
    }

    $data = loadUsers();
    $userIndex = -1;
    $userToDelete = null;

    // Find user by ID
    foreach ($data['users'] as $index => $user) {
        if ($user['id'] === $id) {
            $userIndex = $index;
            $userToDelete = $user;
            break;
        }
    }

    if ($userIndex === -1) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }

    // Prevent deleting the last admin
    if ($userToDelete['role'] === 'admin') {
        $adminCount = 0;
        foreach ($data['users'] as $user) {
            if ($user['role'] === 'admin') {
                $adminCount++;
            }
        }

        if ($adminCount <= 1) {
            echo json_encode(['success' => false, 'error' => 'Cannot delete the last admin user']);
            return;
        }
    }

    // Remove the user
    array_splice($data['users'], $userIndex, 1);

    if (saveUsers($data)) {
        echo json_encode([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete user']);
    }
}
