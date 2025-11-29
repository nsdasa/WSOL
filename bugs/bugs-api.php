<?php
/**
 * Bug Tracker API
 *
 * Endpoints:
 * - GET ?action=list - List all bugs
 * - GET ?action=get&id=BUG-001 - Get single bug
 * - POST action=create - Create new bug
 * - POST action=update - Update bug
 * - POST action=delete - Delete bug
 * - POST action=comment - Add comment
 * - POST action=move - Move bug to different status (for drag-drop)
 * - GET ?action=export - Export to CSV
 * - GET ?action=stats - Get statistics
 */

require_once __DIR__ . '/auth-check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Require authentication
$auth = requireBugTrackerAuth();
$currentUser = $auth['username'];

define('BUGS_FILE', __DIR__ . '/bugs.json');
define('ARCHIVE_FILE', __DIR__ . '/bugs-archive.json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        listBugs();
        break;
    case 'get':
        getBug($_GET['id'] ?? '');
        break;
    case 'create':
        createBug();
        break;
    case 'update':
        updateBug();
        break;
    case 'delete':
        deleteBug();
        break;
    case 'comment':
        addComment();
        break;
    case 'move':
        moveBug();
        break;
    case 'export':
        exportBugs();
        break;
    case 'stats':
        getStats();
        break;
    case 'check-auth':
        echo json_encode(['authenticated' => true, 'username' => $currentUser]);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

// Load bugs data
function loadBugs() {
    if (!file_exists(BUGS_FILE)) {
        return [
            'version' => '1.0',
            'lastUpdated' => date('c'),
            'nextId' => 1,
            'statuses' => [],
            'priorities' => [],
            'severities' => [],
            'bugs' => []
        ];
    }
    return json_decode(file_get_contents(BUGS_FILE), true);
}

// Save bugs data
function saveBugs($data) {
    $data['lastUpdated'] = date('c');
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents(BUGS_FILE, $json) !== false;
}

// Generate bug ID
function generateBugId($data) {
    $id = $data['nextId'];
    return 'BUG-' . str_pad($id, 3, '0', STR_PAD_LEFT);
}

// List all bugs
function listBugs() {
    $data = loadBugs();
    echo json_encode([
        'success' => true,
        'bugs' => $data['bugs'],
        'statuses' => $data['statuses'],
        'priorities' => $data['priorities'],
        'severities' => $data['severities']
    ]);
}

// Get single bug
function getBug($id) {
    if (empty($id)) {
        echo json_encode(['success' => false, 'error' => 'Bug ID required']);
        return;
    }

    $data = loadBugs();
    foreach ($data['bugs'] as $bug) {
        if ($bug['id'] === $id) {
            echo json_encode(['success' => true, 'bug' => $bug]);
            return;
        }
    }

    echo json_encode(['success' => false, 'error' => 'Bug not found']);
}

// Create new bug
function createBug() {
    global $currentUser;

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $title = trim($input['title'] ?? '');
    if (empty($title)) {
        echo json_encode(['success' => false, 'error' => 'Title is required']);
        return;
    }

    $data = loadBugs();
    $bugId = generateBugId($data);

    $bug = [
        'id' => $bugId,
        'title' => $title,
        'description' => $input['description'] ?? '',
        'status' => $input['status'] ?? 'reported',
        'priority' => $input['priority'] ?? 'medium',
        'severity' => $input['severity'] ?? 'minor',
        'module' => $input['module'] ?? '',
        'reporter' => $currentUser,
        'assignee' => $input['assignee'] ?? null,
        'tags' => $input['tags'] ?? [],
        'created' => date('c'),
        'updated' => date('c'),
        'history' => [
            [
                'date' => date('c'),
                'user' => $currentUser,
                'action' => 'created',
                'details' => 'Bug created'
            ]
        ],
        'comments' => []
    ];

    $data['bugs'][] = $bug;
    $data['nextId']++;

    if (saveBugs($data)) {
        echo json_encode(['success' => true, 'bug' => $bug]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save bug']);
    }
}

// Update bug
function updateBug() {
    global $currentUser;

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $bugId = $input['id'] ?? '';
    if (empty($bugId)) {
        echo json_encode(['success' => false, 'error' => 'Bug ID required']);
        return;
    }

    $data = loadBugs();
    $found = false;

    foreach ($data['bugs'] as &$bug) {
        if ($bug['id'] === $bugId) {
            $found = true;
            $changes = [];

            // Track changes for history
            $fields = ['title', 'description', 'status', 'priority', 'severity', 'module', 'assignee', 'tags'];
            foreach ($fields as $field) {
                if (isset($input[$field]) && $input[$field] !== ($bug[$field] ?? null)) {
                    $oldVal = $bug[$field] ?? 'none';
                    $newVal = $input[$field];

                    // Format for display
                    if (is_array($oldVal)) $oldVal = implode(', ', $oldVal);
                    if (is_array($newVal)) $newVal = implode(', ', $newVal);

                    $changes[] = "$field: '$oldVal' → '$newVal'";
                    $bug[$field] = $input[$field];
                }
            }

            if (!empty($changes)) {
                $bug['updated'] = date('c');
                $bug['history'][] = [
                    'date' => date('c'),
                    'user' => $currentUser,
                    'action' => 'updated',
                    'details' => implode('; ', $changes)
                ];
            }

            break;
        }
    }

    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Bug not found']);
        return;
    }

    if (saveBugs($data)) {
        echo json_encode(['success' => true, 'bug' => $bug]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save bug']);
    }
}

// Delete bug (archives it)
function deleteBug() {
    global $currentUser;

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $bugId = $input['id'] ?? '';
    if (empty($bugId)) {
        echo json_encode(['success' => false, 'error' => 'Bug ID required']);
        return;
    }

    $data = loadBugs();
    $bugToArchive = null;
    $bugIndex = -1;

    foreach ($data['bugs'] as $i => $bug) {
        if ($bug['id'] === $bugId) {
            $bugToArchive = $bug;
            $bugIndex = $i;
            break;
        }
    }

    if ($bugIndex === -1) {
        echo json_encode(['success' => false, 'error' => 'Bug not found']);
        return;
    }

    // Archive the bug
    $bugToArchive['archivedAt'] = date('c');
    $bugToArchive['archivedBy'] = $currentUser;

    // Load or create archive
    $archive = [];
    if (file_exists(ARCHIVE_FILE)) {
        $archive = json_decode(file_get_contents(ARCHIVE_FILE), true) ?: [];
    }
    $archive[] = $bugToArchive;
    file_put_contents(ARCHIVE_FILE, json_encode($archive, JSON_PRETTY_PRINT));

    // Remove from active bugs
    array_splice($data['bugs'], $bugIndex, 1);

    if (saveBugs($data)) {
        echo json_encode(['success' => true, 'message' => 'Bug archived']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete bug']);
    }
}

// Add comment to bug
function addComment() {
    global $currentUser;

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $bugId = $input['id'] ?? '';
    $text = trim($input['text'] ?? '');

    if (empty($bugId) || empty($text)) {
        echo json_encode(['success' => false, 'error' => 'Bug ID and comment text required']);
        return;
    }

    $data = loadBugs();
    $found = false;

    foreach ($data['bugs'] as &$bug) {
        if ($bug['id'] === $bugId) {
            $found = true;

            $comment = [
                'id' => uniqid('c'),
                'user' => $currentUser,
                'text' => $text,
                'date' => date('c')
            ];

            $bug['comments'][] = $comment;
            $bug['updated'] = date('c');
            $bug['history'][] = [
                'date' => date('c'),
                'user' => $currentUser,
                'action' => 'commented',
                'details' => 'Added comment'
            ];

            break;
        }
    }

    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Bug not found']);
        return;
    }

    if (saveBugs($data)) {
        echo json_encode(['success' => true, 'comment' => $comment]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save comment']);
    }
}

// Move bug to different status (for drag-drop)
function moveBug() {
    global $currentUser;

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $bugId = $input['id'] ?? '';
    $newStatus = $input['status'] ?? '';

    if (empty($bugId) || empty($newStatus)) {
        echo json_encode(['success' => false, 'error' => 'Bug ID and status required']);
        return;
    }

    $data = loadBugs();
    $found = false;

    foreach ($data['bugs'] as &$bug) {
        if ($bug['id'] === $bugId) {
            $found = true;
            $oldStatus = $bug['status'];

            if ($oldStatus !== $newStatus) {
                $bug['status'] = $newStatus;
                $bug['updated'] = date('c');
                $bug['history'][] = [
                    'date' => date('c'),
                    'user' => $currentUser,
                    'action' => 'status_change',
                    'details' => "Status: '$oldStatus' → '$newStatus'"
                ];
            }

            break;
        }
    }

    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Bug not found']);
        return;
    }

    if (saveBugs($data)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to move bug']);
    }
}

// Export bugs to CSV
function exportBugs() {
    $data = loadBugs();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="bugs-export-' . date('Y-m-d') . '.csv"');

    $output = fopen('php://output', 'w');

    // Header row
    fputcsv($output, ['ID', 'Title', 'Status', 'Priority', 'Severity', 'Module', 'Reporter', 'Assignee', 'Created', 'Updated', 'Tags']);

    foreach ($data['bugs'] as $bug) {
        fputcsv($output, [
            $bug['id'],
            $bug['title'],
            $bug['status'],
            $bug['priority'],
            $bug['severity'],
            $bug['module'],
            $bug['reporter'],
            $bug['assignee'] ?? '',
            $bug['created'],
            $bug['updated'],
            implode('; ', $bug['tags'] ?? [])
        ]);
    }

    fclose($output);
    exit;
}

// Get statistics
function getStats() {
    $data = loadBugs();

    $stats = [
        'total' => count($data['bugs']),
        'byStatus' => [],
        'byPriority' => [],
        'bySeverity' => []
    ];

    foreach ($data['statuses'] as $status) {
        $stats['byStatus'][$status['id']] = 0;
    }
    foreach ($data['priorities'] as $priority) {
        $stats['byPriority'][$priority['id']] = 0;
    }
    foreach ($data['severities'] as $severity) {
        $stats['bySeverity'][$severity['id']] = 0;
    }

    foreach ($data['bugs'] as $bug) {
        if (isset($stats['byStatus'][$bug['status']])) {
            $stats['byStatus'][$bug['status']]++;
        }
        if (isset($stats['byPriority'][$bug['priority']])) {
            $stats['byPriority'][$bug['priority']]++;
        }
        if (isset($stats['bySeverity'][$bug['severity']])) {
            $stats['bySeverity'][$bug['severity']]++;
        }
    }

    echo json_encode(['success' => true, 'stats' => $stats]);
}
