<?php
/**
 * Cebuano Vocabulary Generator - API Backend
 * 
 * This script proxies requests to the Anthropic API,
 * keeping the API key secure on the server.
 */

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't show errors to users
ini_set('log_errors', 1);

// Load configuration
// If you moved config.php outside web root, update this path:
// $config = require '/home/username/config/cebuano-config.php';
$config = require __DIR__ . '/config.php';

// ==================== LOGGING ====================

function writeLog($message, $data = null) {
    global $config;
    if (!($config['debug'] ?? false)) return;
    
    $logFile = sys_get_temp_dir() . '/cebuano_api_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    if ($data !== null) {
        $logEntry .= " | " . json_encode($data, JSON_UNESCAPED_SLASHES);
    }
    $logEntry .= "\n";
    
    // Keep log file under 1MB
    if (file_exists($logFile) && filesize($logFile) > 1048576) {
        file_put_contents($logFile, '');
    }
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Headers
header('Content-Type: application/json');

// CORS handling
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($config['allowed_origins']) || in_array($origin, $config['allowed_origins'])) {
    if (!empty($origin)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ==================== RATE LIMITING ====================

function getRateLimitFile() {
    $dir = sys_get_temp_dir() . '/cebuano_rate_limit';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . '/' . md5($_SERVER['REMOTE_ADDR']) . '.json';
}

function checkRateLimit($limit) {
    $file = getRateLimitFile();
    $now = time();
    $windowStart = $now - 3600; // 1 hour window
    
    $requests = [];
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (is_array($data)) {
            $requests = array_filter($data, fn($t) => $t > $windowStart);
        }
    }
    
    if (count($requests) >= $limit) {
        return false;
    }
    
    $requests[] = $now;
    file_put_contents($file, json_encode($requests));
    return true;
}

// ==================== SYSTEM PROMPT ====================

$SYSTEM_PROMPT = <<<'PROMPT'
You are a Cebuano linguistics expert. Your task is to extract vocabulary from a Cebuano language learning table and generate all ACTUALLY USED verb derivatives.

Step 1: VOCABULARY EXTRACTION

CRITICAL RULES:
1. Extract all words exactly as shown in the table
2. For each verb, identify which affixes from the "allowed verb affixes" column are ACTUALLY used with that specific verb
3. DO NOT mechanically apply every affix to every verb - only create derivatives that are genuine Cebuano words with actual meanings
4. Verify each derivative is a real, commonly used form in Cebuano before including it
5. If you're uncertain whether a derivative is actually used, do not include it
6. Words with "/" notation (e.g., Ako/ko, Kini/ni) indicate alternative forms - include BOTH forms in the vocabulary

PROCESS:
1. Extract all words from these columns: Q&A, Verb, Adverb, Function Words, Pronoun, Noun, Adjective, Preposition, Numbers, Special
2. For "/" alternatives (e.g., Ako/ko), split into both forms: "Ako" AND "ko"
3. For each verb in the "Verb" column, check the "allowed verb affixes" column
4. Generate ONLY the derivatives that are actually used in Cebuano with those affixes
5. Consider meaning and usage: Does this derivative have a real function? Is it commonly used?

VOCABULARY OUTPUT FORMAT:
Organize by lesson number with these sections:
- Q&A Words
- Function Words  
- Pronouns (list both full and short forms from "/" notation)
- Nouns
- Adverbs (if applicable)
- Adjectives (if applicable)
- Prepositions (if applicable)
- Numbers (if applicable)
- Special (if applicable)
- Verbs and Derivatives (list base verb, then all actual derivatives)

For each verb section, format as:
*verb_name:*
- base_form, derivative1, derivative2, derivative3, etc.

Be factually accurate. Prioritize correctness over completeness.

Step 2: TIERED SENTENCE SEQUENCES (Progressive Complexity System)

TASK: Create TIERED ladderized sentence sequences using the Three-Tier Complexity System.

**TOKEN BUDGET WARNING**: Keep working sections BRIEF. The verified output is the priority.

---

## A. THREE-TIER SYSTEM OVERVIEW

Sequences are grouped into THREE TIERS based on complexity:

| Tier | Name | Max Words | Grammar Scope | Sequences |
|------|------|-----------|---------------|-----------|
| **Tier 1** | Simple | 2-3 | L1 only | Foundation, confidence |
| **Tier 2** | Medium | 2-5 | L1-L2 | Expansion, basic affixes |
| **Tier 3** | Advanced | 2-8 | L1-L4 | Full complexity |

### COMPLEXITY MODE (from user input):
- **BEGINNER HEAVY**: 4 Simple + 2 Medium + 2 Advanced = 8 sequences
- **PROGRESSIVE**: 2 Simple + 3 Medium + 3 Advanced = 8 sequences

### GROUPING RULE:
Output ALL Tier 1 sequences first, then ALL Tier 2, then ALL Tier 3.

---

## B. TIER 1: SIMPLE SEQUENCES

### Word Count Limits:
- **Maximum**: 3 words (NEVER exceed 3)
- **Typical**: 2 words

### Sentence Targets (8 sentences per sequence):
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2 | Verb-base + Location |
| 3 | 3 | Question + ang + Noun |
| 4 | 2-3 | Location answer |
| 5 | 2 | Demonstrative + Noun |
| 6 | 2-3 | Verb-base + target |
| 7 | 3 | Question + ang + Noun |
| 8 | 2-3 | Simple answer |

### Grammar Allowed (L1 ONLY):
**YES - Use these**:
- Demonstratives: Kini, ni, Kana, na, Kadto, kato
- Location pronouns: Diri, Dinhi, Didto, Diha, Dinha
- Basic pronouns: Ako, ko, Ikaw, ka, Siya, Sila
- Article: ang
- Question words: Asa, Unsa
- Base verbs (imperative): Lakaw, Adto, Hunong, Higda, Dagan

**NO - Do NOT use**:
- ❌ Affixed verbs (nag-, mag-, i-, -a, -i)
- ❌ Possessive pronouns (akong, imong, etc.)
- ❌ Preposition "sa"
- ❌ Complex prepositions (gikan, atubangan, kilid)
- ❌ Conjunctions (og)
- ❌ Adjectives (dako, gamay, duol, layo)
- ❌ Plural marker (mga)
- ❌ Special words (Oo, Dili, hapit)

### Tier 1 Example:
| # | Cebuano | English | Words |
|---|---------|---------|:-----:|
| 1 | Kini Eskwelahan. | This is a school. | 2 |
| 2 | Lakaw diri. | Walk here. | 2 |
| 3 | Asa ang Maestra? | Where is the teacher? | 3 |
| 4 | Didto siya. | She's there. | 2 |
| 5 | Kana Merkado. | That is a market. | 2 |
| 6 | Adto didto. | Go there. | 2 |
| 7 | Unsa kana? | What is that? | 2 |
| 8 | Kana Tindahan. | That is a store. | 2 |

---

## C. TIER 2: MEDIUM SEQUENCES

### Word Count Limits:
- **Maximum**: 5 words
- **Start at**: 2 words, grow to 5

### Sentence Targets:
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2-3 | Verb-base + target |
| 3 | 3 | Question + ang + Noun |
| 4 | 3-4 | Ang + Noun + Adjective/Location |
| 5 | 4-5 | Noun phrase with sa + Place |
| 6 | 4-5 | nag-Verb + Actor + sa + Noun |
| 7 | 4-5 | nag-Verb + Actor + sa + Noun |
| 8 | 4-5 | Statement with Oo/Dili + adjective |

### Grammar Allowed (L1 + L2):
**Everything from Tier 1, PLUS**:
- Preposition: sa
- Adjectives: dako, gamay, duol, layo
- Affirmation/Negation: Oo, Dili
- Special: hapit
- Verb affixes: nag- forms ONLY (naglakaw, nagadto, etc.)

**Still NOT allowed**:
- ❌ Possessive pronouns (akong, imong, etc.)
- ❌ Complex prepositions (gikan, atubangan, kilid)
- ❌ Conjunctions (og)
- ❌ Plural marker (mga)
- ❌ Compound sentences

### Tier 2 Example:
| # | Cebuano | English | Words |
|---|---------|---------|:-----:|
| 1 | Kini Balay. | This is a house. | 2 |
| 2 | Lakaw dinhi. | Walk here. | 2 |
| 3 | Asa ang Ospital? | Where is the hospital? | 3 |
| 4 | Ang Ospital duol. | The hospital is near. | 3 |
| 5 | Ang Banko layo sa Balay. | The bank is far from the house. | 5 |
| 6 | Naglakaw {Lakaw} ako sa Ospital. | I walked to the hospital. | 4 |
| 7 | Naglakaw {Lakaw} siya sa Banko. | She walked to the bank. | 4 |
| 8 | Oo, duol ang Ospital. | Yes, the hospital is near. | 4 |

---

## D. TIER 3: ADVANCED SEQUENCES

### Word Count Limits:
- **Maximum**: 8 words (can reach 9 for compounds)
- **Start at**: 2 words, grow to 8

### Sentence Targets:
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2-3 | Verb-base + target |
| 3 | 3 | Question + ang + Noun |
| 4 | 4-5 | Answer with sa + location |
| 5 | 4-5 | nag-Verb + Actor + sa + Noun |
| 6 | 5-6 | Location with complex preposition |
| 7 | 6-8 | gikan...padulong OR compound with og |
| 8 | 6-8 | Complex: mga + contrast (dili) |

### Grammar Allowed (ALL LEVELS L1-L4):
**Everything from Tiers 1 & 2, PLUS**:
- Possessive pronouns: akong, imong, iyang, ilang
- Complex prepositions: gikan, atubangan, kilid, padulong
- Conjunction: og
- Plural marker: mga
- Contrast patterns: dili + adjective
- Full verb system (all forms in vocabulary)

### Tier 3 Example:
| # | Cebuano | English | Words |
|---|---------|---------|:-----:|
| 1 | Kini Siyudad. | This is a city. | 2 |
| 2 | Adto didto. | Go there. | 2 |
| 3 | Asa ang Munisipyo? | Where is the municipal hall? | 3 |
| 4 | Ang Munisipyo duol sa Simbahan. | The municipal hall is near the church. | 5 |
| 5 | Naglakaw {Lakaw} ako sa Merkado. | I walked to the market. | 4 |
| 6 | Ang Merkado atubangan sa Banko. | The market is in front of the bank. | 5 |
| 7 | Naglakaw {Lakaw} siya gikan sa Balay padulong sa Eskwelahan. | She walked from the house toward the school. | 8 |
| 8 | Dako ang mga Tindahan sa Siyudad, dili gamay. | The stores in the city are big, not small. | 8 |

---

## E. SENTENCE TYPE CLASSIFICATION

Every sentence MUST have exactly one type:

| Type | Definition | Markers |
|------|------------|---------|
| **Statement** | Declares a fact | Period (.) |
| **Command** | Imperative instruction | Base verb, no actor |
| **Question** | Asks for information | Question mark (?) |
| **Answer** | Direct response to question | Follows Question |

**Rules**:
- Questions MUST be immediately followed by Answers
- Commands use base verb form (no nag-/mag-)
- Q&A pairs typically at positions 3-4 and 7-8

---

## F. SCENARIO FRAMEWORK

Each sequence follows a coherent mini-scenario:

### Structure:
1. **Setting** (Sentences 1-2): Identify place/person, give simple direction
2. **Inquiry** (Sentences 3-4): Question and Answer pair
3. **Action/Description** (Sentences 5-6): Movement or location details
4. **Resolution** (Sentences 7-8): Conclusion, summary, or Q&A pair

### Scenario Types:
- **Finding Places**: Kini + Place → Asa ang...? → Movement → Arrival
- **Identifying People**: Kini + Person → Kinsa/Asa...? → Action → Description
- **Describing Locations**: Kini + Place → Unsa...? → Adjective → Comparison
- **Giving Directions**: Start → Direction → Landmarks → Destination

---

## G. VOCABULARY COVERAGE

### Requirements:
- **Core words** (ang, sa, demonstratives): Use frequently across all tiers
- **Nouns**: Minimum 3 uses each across all sequences
- **Verbs**: Base form in Tier 1, nag- form in Tiers 2-3
- **Adjectives**: Appear only in Tiers 2-3
- **Complex prepositions**: Appear only in Tier 3

### Note on Tier Restrictions:
Some vocabulary words can ONLY appear in higher tiers:
- "sa" → Tier 2+ only
- "og" → Tier 3 only
- "mga" → Tier 3 only
- Adjectives → Tier 2+ only

If a word is restricted, it gets fewer total uses but still appears appropriately.

---

## H. QUALITY VALIDATION

Before finalizing each sequence, verify:

### Tier 1 Checklist:
☐ NO sentence exceeds 3 words
☐ NO affixed verbs (nag-, mag-, etc.)
☐ NO "sa" preposition
☐ NO adjectives
☐ Only L1 grammar structures

### Tier 2 Checklist:
☐ NO sentence exceeds 5 words
☐ Only nag- affixed verbs (positions 6-8)
☐ NO complex prepositions (gikan, atubangan, kilid)
☐ NO conjunction "og"
☐ NO plural "mga"

### Tier 3 Checklist:
☐ Sentences can reach 8 words
☐ Full grammar allowed
☐ Uses complex prepositions
☐ Uses compound sentences with "og"
☐ Uses contrast patterns

### All Tiers:
☐ Word count matches tier limits
☐ Q&A pairs properly matched
☐ All affixed verbs have {root} markers
☐ Every word in allowed vocabulary
☐ Logical narrative flow

---

## I. COMMON MISTAKES TO AVOID

1. **Using "sa" in Tier 1** - NOT allowed
2. **Using adjectives in Tier 1** - NOT allowed
3. **Using nag- verbs in Tier 1** - NOT allowed
4. **Exceeding 3 words in Tier 1** - Strict limit
5. **Using "og" in Tier 2** - Only Tier 3
6. **Using complex prepositions in Tier 2** - Only Tier 3
7. **Missing {root} markers on affixed verbs**
8. **Question without immediate Answer**
9. **Vocabulary violations**

---

## MANDATORY AUDIT SYSTEM (Step 3) - CRITICAL

After generating ALL sequences, you MUST perform a STRICT vocabulary audit BEFORE presenting ANY output.

### STEP 3A: BUILD ALLOWED WORD LIST
First, create a COMPLETE list of every allowed word from your vocabulary extraction:
- All Q&A words
- All Function words  
- All Pronouns (both full and short forms from "/" notation)
- All Nouns
- All Adverbs
- All Adjectives
- All Prepositions
- All Numbers
- All Special words
- All Verbs AND their derivatives (every form you listed)

This is your ALLOWED WORD LIST. NO other Cebuano words may appear in sentences.

### STEP 3B: EXTRACT ALL WORDS FROM SENTENCES
Go through EVERY sentence you created and list EVERY unique Cebuano word used.
- Strip {root} markers to get the base word for checking
- Include words inside {root} markers as the root form
- List every single word, no exceptions

### STEP 3C: WORD-BY-WORD VERIFICATION
For EACH word extracted from sentences:
1. Is this word in the ALLOWED WORD LIST? 
2. If YES → ✓ Valid
3. If NO → ❌ VIOLATION (unless it's a proper name used with Si/Ni marker)

### STEP 3D: EVALUATE RESULTS
- If ZERO violations → Audit PASSED, proceed to output
- If ANY violations → Audit FAILED, proceed to REDO

### REDO PROCESS (If Audit Fails):
1. List violations found
2. Rewrite affected sentences using ONLY allowed words
3. Re-run audit until it passes with ZERO violations
4. Only then proceed to output

### AUDIT OUTPUT FORMAT:

The audit results MUST be included in the VERIFIED OUTPUT section with full details:

## VOCABULARY AUDIT

### Allowed Words Check:
List any words used in sentences that are NOT in the allowed vocabulary list:
- [word] ❌ NOT IN VOCABULARY - used in Sequence X, Sentence Y
- (or) ✓ All words verified - no violations

### Word Usage Count:
| Word | Category | Count | Status |
|------|----------|-------|--------|
| Kini | Demonstrative | 5 | ✓ |
| ang | Function | 12 | ✓ |
| Eskwelahan | Noun | 2 | ❌ (needs 3) |
... (list ALL vocabulary words)

### Summary:
- Total vocabulary words: [X]
- Words meeting 3x minimum: [Y]
- Words below minimum: [Z] (list them)
- Vocabulary violations: [0 or list]
- **Status: PASSED / FAILED**

### ZERO TOLERANCE RULE:
NO sentences may contain words outside the ALLOWED WORD LIST. 
A single invalid word means the entire output is rejected.

---

## CRITICAL: VERIFIED OUTPUT FORMAT (CSV)

Once the audit PASSES, you MUST output the final verified content in CSV format wrapped in special markers.

**OUTPUT THE VERIFIED SECTION FIRST** - This is the most important part of your response.

### CSV OUTPUT STRUCTURE:
The CSV must have these exact columns:
```
Lesson #,Tier,Seq #,Sequ Title,Sentence #,Sentence Text,English Translation,Sentence Type
```

### CSV FORMATTING RULES:
1. **Lesson #**: Only on first row of each lesson, leave blank for subsequent rows
2. **Tier**: One of: Simple, Medium, Advanced - only on first row of each sequence
3. **Seq #**: Sequence number within the lesson (1, 2, 3, etc.), only on first row of each sequence
4. **Sequ Title**: Title of the sequence, only on first row of each sequence
5. **Sentence #**: Sentence number within the sequence (1, 2, 3, etc.)
6. **Sentence Text**: Cebuano sentence with {root} markers for affixed words
7. **English Translation**: English translation of the sentence
8. **Sentence Type**: One of: Question, Answer, Statement, Command

### CSV EXAMPLE:
```
Lesson #,Tier,Seq #,Sequ Title,Sentence #,Sentence Text,English Translation,Sentence Type
1,Simple,1,Basic Identification,,,,,
,,,,1,Kini Eskwelahan.,This is a school.,Statement
,,,,2,Lakaw diri.,Walk here.,Command
,,,,3,Asa ang Maestra?,Where is the teacher?,Question
,,,,4,Didto siya.,She's there.,Answer
1,Medium,3,Near and Far,,,,,
,,,,1,Kini Balay.,This is a house.,Statement
,,,,2,Lakaw dinhi.,Walk here.,Command
,,,,3,Asa ang Ospital?,Where is the hospital?,Question
,,,,4,Ang Ospital duol.,The hospital is near.,Answer
1,Advanced,7,Journey to School,,,,,
,,,,1,Kini Siyudad.,This is a city.,Statement
,,,,2,Adto didto.,Go there.,Command
```

### IMPORTANT CSV NOTES:
- Wrap text containing commas in double quotes
- The sequence title row has empty Sentence #, Sentence Text, English Translation, and Sentence Type
- Include the {root} markers in the Sentence Text column
- Every sentence MUST have a Sentence Type
- **Tier must be one of: Simple, Medium, Advanced**
- **Group sequences by Tier: ALL Simple first, then ALL Medium, then ALL Advanced**

---

## RESPONSE STRUCTURE (Follow this order exactly):

**STEP 1**: Brief vocabulary list (just list the words, no extensive explanation)

**STEP 2**: Create TIERED sequences (grouped by tier: Simple → Medium → Advanced)

**STEP 3**: Perform full vocabulary audit

**STEP 4**: Output the VERIFIED section below

===VERIFIED_OUTPUT_START===

## VOCABULARY LIST
[Organized by category: Q&A, Function Words, Pronouns, Nouns, Adjectives, Prepositions, Numbers, Special, Verbs with derivatives]

## VOCABULARY AUDIT

### Allowed Words Check:
[List any violations, or confirm "✓ All words verified - no violations"]

### Word Usage Count:
| Word | Category | Count | Status |
|------|----------|-------|--------|
[List EVERY vocabulary word with its usage count and ✓ or ❌]

### Audit Summary:
- Total vocabulary words: [X]
- Words meeting 3x minimum: [Y]  
- Words below minimum: [Z] - [list them]
- Vocabulary violations: [0 or list]
- **Status: PASSED**

## SENTENCE CSV
```csv
Lesson #,Tier,Seq #,Sequ Title,Sentence #,Sentence Text,English Translation,Sentence Type
[All sequences in CSV format, grouped by tier: Simple first, Medium second, Advanced last]
```

===VERIFIED_OUTPUT_END===

**CRITICAL**: You MUST complete the ===VERIFIED_OUTPUT_END=== marker. Include the full audit table - this is essential for verification.

---

OUTPUT: Vocabulary list, TIERED sentence sequences (Simple → Medium → Advanced) in CSV format with Tier column, Sentence Types, FULL word usage audit table, and PASSED audit. All wrapped in ===VERIFIED_OUTPUT_START=== and ===VERIFIED_OUTPUT_END=== markers.
PROMPT;

// ==================== REQUEST ROUTING ====================

$method = $_SERVER['REQUEST_METHOD'];

// Check for path in query parameter first (for direct api.php access)
if (isset($_GET['path'])) {
    $path = $_GET['path'];
} else {
    // Fall back to parsing REQUEST_URI (for .htaccess rewrite)
    $requestUri = $_SERVER['REQUEST_URI'];
    $basePath = '/sentences';
    
    // Remove base path and query string
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = preg_replace('#^' . preg_quote($basePath, '#') . '#', '', $path);
}

// Normalize path
$path = '/' . ltrim($path, '/');

// Simple debug - always works (add ?showpath=1 to any request)
if (isset($_GET['showpath'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'path' => $path,
        'method' => $method,
        'get_path' => $_GET['path'] ?? null,
        'php_version' => PHP_VERSION,
        'curl_version' => curl_version()['version'] ?? 'unknown'
    ]);
    exit;
}

// Debug mode - uncomment to troubleshoot routing issues
if (isset($_GET['debug']) && $config['debug']) {
    header('Content-Type: application/json');
    echo json_encode([
        'debug' => true,
        'method' => $method,
        'path' => $path,
        'get_path' => $_GET['path'] ?? null,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
        'query_string' => $_SERVER['QUERY_STRING'] ?? null
    ]);
    exit;
}

// Route: GET /api/health
if ($method === 'GET' && $path === '/api/health') {
    echo json_encode([
        'status' => 'ok',
        'timestamp' => date('c'),
        'hasApiKey' => !empty($config['api_key']) && $config['api_key'] !== 'sk-ant-api03-YOUR-API-KEY-HERE'
    ]);
    exit;
}

// Route: GET /api/logs (view debug logs - only when debug mode is enabled)
if ($method === 'GET' && $path === '/api/logs') {
    if (!($config['debug'] ?? false)) {
        http_response_code(403);
        echo json_encode(['error' => 'Debug mode not enabled. Set debug => true in config.php']);
        exit;
    }
    
    $logFile = sys_get_temp_dir() . '/cebuano_api_debug.log';
    
    if (isset($_GET['clear'])) {
        file_put_contents($logFile, '');
        echo json_encode(['success' => true, 'message' => 'Log cleared']);
        exit;
    }
    
    if (!file_exists($logFile)) {
        echo json_encode(['logs' => '', 'message' => 'No log file exists yet']);
        exit;
    }
    
    $logs = file_get_contents($logFile);
    $lines = explode("\n", trim($logs));
    
    // Return last N lines (default 100)
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $lines = array_slice($lines, -$limit);
    
    echo json_encode([
        'logs' => implode("\n", $lines),
        'lineCount' => count($lines),
        'fileSize' => filesize($logFile)
    ]);
    exit;
}

// Route: GET /api/test (test Anthropic API connectivity)
if ($method === 'GET' && $path === '/api/test') {
    writeLog('=== API Test started ===');
    
    if (empty($config['api_key']) || $config['api_key'] === 'sk-ant-api03-YOUR-API-KEY-HERE') {
        echo json_encode(['error' => 'API key not configured']);
        exit;
    }
    
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $config['api_key'],
            'anthropic-version: 2023-06-01'
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 50,
            'messages' => [['role' => 'user', 'content' => 'Say "API connection successful" and nothing else.']]
        ]),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_NOSIGNAL => 1,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);
    
    $startTime = microtime(true);
    $response = curl_exec($ch);
    $elapsed = round((microtime(true) - $startTime) * 1000);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    curl_close($ch);
    
    writeLog('API Test result', [
        'httpCode' => $httpCode,
        'elapsed' => $elapsed . 'ms',
        'curlError' => $curlError ?: 'none',
        'curlErrno' => $curlErrno
    ]);
    
    if ($curlError) {
        echo json_encode([
            'success' => false,
            'error' => $curlError,
            'curlErrno' => $curlErrno,
            'elapsed' => $elapsed,
            'hint' => strpos($curlError, 'getaddrinfo') !== false 
                ? 'DNS resolution failed. This is a server-side network issue.' 
                : 'Network error connecting to Anthropic API.'
        ]);
        exit;
    }
    
    $data = json_decode($response, true);
    
    if ($httpCode === 200) {
        echo json_encode([
            'success' => true,
            'message' => $data['content'][0]['text'] ?? 'OK',
            'elapsed' => $elapsed,
            'model' => $data['model'] ?? 'unknown'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'httpCode' => $httpCode,
            'error' => $data['error']['message'] ?? 'Unknown error',
            'elapsed' => $elapsed
        ]);
    }
    exit;
}

// Route: GET /api/config
if ($method === 'GET' && $path === '/api/config') {
    echo json_encode([
        'model' => $config['default_model'],
        'maxTokens' => $config['max_tokens'],
        'hasApiKey' => !empty($config['api_key']) && $config['api_key'] !== 'sk-ant-api03-YOUR-API-KEY-HERE',
        'availableModels' => $config['available_models'],
        'delayBetweenRequests' => $config['delay_between_requests'] ?? 20,
        'retry' => $config['retry'] ?? [
            'max_attempts' => 5,
            'initial_delay' => 10,
            'backoff_multiplier' => 2,
            'max_delay' => 120
        ]
    ]);
    exit;
}

// ==================== API REQUEST WITH RETRY ====================

function makeAnthropicRequest($requestBody, $config, $SYSTEM_PROMPT) {
    $retryConfig = $config['retry'] ?? [
        'max_attempts' => 5,
        'initial_delay' => 10,
        'backoff_multiplier' => 2,
        'max_delay' => 120
    ];
    
    $attempt = 0;
    $lastError = null;
    $totalRetryTime = 0;
    $retryLog = [];
    
    while ($attempt < $retryConfig['max_attempts']) {
        $attempt++;
        
        writeLog("API attempt $attempt of " . $retryConfig['max_attempts']);
        
        // Make request to Anthropic API
        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-api-key: ' . $config['api_key'],
                'anthropic-version: 2023-06-01'
            ],
            CURLOPT_POSTFIELDS => json_encode($requestBody),
            CURLOPT_TIMEOUT => 300,           // 5 minute timeout for long responses
            CURLOPT_CONNECTTIMEOUT => 30,     // 30 second connection timeout
            CURLOPT_DNS_CACHE_TIMEOUT => 120, // Cache DNS for 2 minutes
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4, // Force IPv4 (helps with some DNS issues)
            CURLOPT_NOSIGNAL => 1,            // Required for timeout to work in multi-threaded environments
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,   // Follow redirects
            CURLOPT_MAXREDIRS => 3
        ]);
        
        writeLog("CURL request starting...");
        $startTime = microtime(true);
        $response = curl_exec($ch);
        $elapsed = round((microtime(true) - $startTime) * 1000);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        writeLog("CURL completed", [
            'httpCode' => $httpCode,
            'elapsed' => $elapsed . 'ms',
            'responseLen' => strlen($response),
            'curlError' => $curlError ?: 'none'
        ]);
        
        // Handle curl errors
        if ($curlError) {
            writeLog("CURL ERROR: $curlError");
            $retryLog[] = ['attempt' => $attempt, 'error' => 'CURL: ' . $curlError, 'timestamp' => date('c')];
            
            // DNS and connection errors are retryable (temporary network issues)
            $isRetryableError = (
                strpos($curlError, 'getaddrinfo') !== false ||
                strpos($curlError, 'resolve') !== false ||
                strpos($curlError, 'DNS') !== false ||
                strpos($curlError, 'Connection') !== false ||
                strpos($curlError, 'timed out') !== false
            );
            
            if ($isRetryableError && $attempt < $retryConfig['max_attempts']) {
                $delay = min(
                    $retryConfig['initial_delay'] * pow($retryConfig['backoff_multiplier'], $attempt - 1),
                    $retryConfig['max_delay']
                );
                writeLog("Retryable CURL error, waiting {$delay}s before retry...");
                $retryLog[count($retryLog) - 1]['waiting'] = $delay;
                $totalRetryTime += $delay;
                sleep((int)$delay);
                continue; // Retry the request
            }
            
            $lastError = ['type' => 'curl', 'message' => $curlError, 'code' => 500];
            break;
        }
        
        $data = json_decode($response, true);
        
        // Success!
        if ($httpCode === 200) {
            writeLog("API SUCCESS on attempt $attempt");
            return [
                'success' => true,
                'data' => $data,
                'elapsed' => $elapsed,
                'attempts' => $attempt,
                'totalRetryTime' => $totalRetryTime,
                'retryLog' => $retryLog
            ];
        }
        
        // Handle rate limit (429) or overloaded (529) - these are retryable
        if ($httpCode === 429 || $httpCode === 529) {
            $errorMessage = $data['error']['message'] ?? 'Rate limit exceeded';
            writeLog("Rate limit hit: HTTP $httpCode", ['message' => $errorMessage]);
            $retryLog[] = [
                'attempt' => $attempt, 
                'error' => "HTTP $httpCode: $errorMessage",
                'timestamp' => date('c')
            ];
            
            // Check if we have more attempts
            if ($attempt < $retryConfig['max_attempts']) {
                // Calculate delay with exponential backoff
                $delay = min(
                    $retryConfig['initial_delay'] * pow($retryConfig['backoff_multiplier'], $attempt - 1),
                    $retryConfig['max_delay']
                );
                
                // Check for Retry-After header hint
                if (isset($data['error']['retry_after'])) {
                    $delay = max($delay, (float)$data['error']['retry_after']);
                }
                
                $retryLog[count($retryLog) - 1]['waiting'] = $delay;
                $totalRetryTime += $delay;
                
                // Wait before retrying
                sleep((int)$delay);
                continue;
            }
            
            $lastError = ['type' => 'rate_limit', 'message' => $errorMessage, 'code' => $httpCode];
            break;
        }
        
        // Non-retryable error
        $lastError = [
            'type' => 'api_error',
            'message' => $data['error']['message'] ?? 'API request failed',
            'code' => $httpCode,
            'details' => $data
        ];
        break;
    }
    
    // All retries exhausted or non-retryable error
    return [
        'success' => false,
        'error' => $lastError,
        'attempts' => $attempt,
        'totalRetryTime' => $totalRetryTime,
        'retryLog' => $retryLog
    ];
}

// Route: POST /api/process
if ($method === 'POST' && $path === '/api/process') {
    writeLog('=== Process request started ===');
    
    // Check API key
    if (empty($config['api_key']) || $config['api_key'] === 'sk-ant-api03-YOUR-API-KEY-HERE') {
        writeLog('ERROR: API key not configured');
        http_response_code(500);
        echo json_encode(['error' => 'API key not configured on server']);
        exit;
    }
    
    // Check rate limit
    if (!checkRateLimit($config['rate_limit'])) {
        writeLog('ERROR: Rate limit exceeded');
        http_response_code(429);
        echo json_encode(['error' => 'Rate limit exceeded. Please try again later.']);
        exit;
    }
    
    // Get request body
    $rawInput = file_get_contents('php://input');
    writeLog('Raw input received', ['length' => strlen($rawInput)]);
    
    $input = json_decode($rawInput, true);
    
    if (empty($input['lessonNum']) || empty($input['tableData'])) {
        writeLog('ERROR: Missing required fields', $input);
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: lessonNum and tableData']);
        exit;
    }
    
    $lessonNum = $input['lessonNum'];
    $tableData = $input['tableData'];
    $model = $input['customModel'] ?? $config['default_model'];
    $maxTokens = isset($input['maxTokens']) ? min(max((int)$input['maxTokens'], 4000), 64000) : $config['max_tokens'];
    $complexityMode = $input['complexityMode'] ?? 'beginner';
    
    // Determine mode description
    $modeDescription = $complexityMode === 'beginner' 
        ? 'BEGINNER HEAVY: Create 4 Simple (Tier 1), 2 Medium (Tier 2), 2 Advanced (Tier 3) sequences'
        : 'PROGRESSIVE: Create 2 Simple (Tier 1), 3 Medium (Tier 2), 3 Advanced (Tier 3) sequences';
    
    writeLog('Processing lesson', ['lessonNum' => $lessonNum, 'model' => $model, 'maxTokens' => $maxTokens, 'complexityMode' => $complexityMode, 'tableDataLen' => strlen($tableData)]);
    
    $userMessage = "Process the following vocabulary table for Lesson {$lessonNum}:

{$tableData}

**COMPLEXITY MODE**: {$modeDescription}

Please:
1. Extract all vocabulary exactly as shown (remember \"/\" means both forms are valid, e.g., Ako/ko means both \"Ako\" and \"ko\")
2. Generate actual verb derivatives (only real Cebuano forms)
3. Create TIERED ladderized sentence sequences following the specified complexity mode
4. Group sequences by tier: ALL Simple (Tier 1) first, then ALL Medium (Tier 2), then ALL Advanced (Tier 3)
5. Perform the mandatory vocabulary audit
6. Ensure all words meet the 3x minimum usage requirement
7. IMPORTANT: Wrap your final verified output in ===VERIFIED_OUTPUT_START=== and ===VERIFIED_OUTPUT_END=== markers

Output the complete verified result with markers.";

    $requestBody = [
        'model' => $model,
        'max_tokens' => $maxTokens,
        'system' => $SYSTEM_PROMPT,
        'messages' => [
            ['role' => 'user', 'content' => $userMessage]
        ]
    ];
    
    writeLog('Calling Anthropic API', ['model' => $model, 'maxTokens' => $maxTokens]);
    
    // Make request with retry logic
    $result = makeAnthropicRequest($requestBody, $config, $SYSTEM_PROMPT);
    
    writeLog('API call completed', [
        'success' => $result['success'],
        'attempts' => $result['attempts'],
        'elapsed' => $result['elapsed'] ?? 'N/A'
    ]);
    
    if (!$result['success']) {
        $error = $result['error'];
        writeLog('API ERROR', $error);
        http_response_code($error['code'] ?? 500);
        echo json_encode([
            'error' => $error['message'],
            'errorType' => $error['type'],
            'attempts' => $result['attempts'],
            'totalRetryTime' => $result['totalRetryTime'],
            'retryLog' => $result['retryLog'],
            'details' => $config['debug'] ? ($error['details'] ?? null) : null
        ]);
        exit;
    }
    
    $data = $result['data'];
    $inputTokens = $data['usage']['input_tokens'] ?? 0;
    $outputTokens = $data['usage']['output_tokens'] ?? 0;
    
    writeLog('SUCCESS', [
        'lessonNum' => $lessonNum,
        'inputTokens' => $inputTokens,
        'outputTokens' => $outputTokens,
        'contentLength' => strlen($data['content'][0]['text'] ?? '')
    ]);
    
    echo json_encode([
        'success' => true,
        'lessonNum' => $lessonNum,
        'content' => $data['content'][0]['text'],
        'usage' => [
            'inputTokens' => $inputTokens,
            'outputTokens' => $outputTokens,
            'totalTokens' => $inputTokens + $outputTokens
        ],
        'model' => $data['model'],
        'elapsedMs' => $result['elapsed'],
        'attempts' => $result['attempts'],
        'totalRetryTime' => $result['totalRetryTime'],
        'retryLog' => $result['retryLog']
    ]);
    exit;
}

// Route: POST /api/config (update configuration - optional, can be disabled)
if ($method === 'POST' && $path === '/api/config') {
    // This endpoint is disabled by default for security
    // Uncomment if you want to allow runtime config changes
    /*
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!empty($input['model']) && in_array($input['model'], $config['available_models'])) {
        // Note: This doesn't persist - would need to write to config file
        $config['default_model'] = $input['model'];
    }
    
    echo json_encode(['success' => true, 'model' => $config['default_model']]);
    exit;
    */
    
    http_response_code(403);
    echo json_encode(['error' => 'Configuration updates disabled']);
    exit;
}

// 404 for unknown API routes
if (strpos($path, '/api/') === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
    exit;
}

// For non-API routes, let the web server handle it (serve index.html)
// This shouldn't normally be reached if .htaccess is configured correctly
http_response_code(404);
echo json_encode(['error' => 'Not found']);
