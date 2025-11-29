<?php
/**
 * Cebuano Content Generator - API Backend
 *
 * Generates content for three module types:
 * 1. Review Sentences - Tiered ladder sentences
 * 2. Story Sequences - Narrative sequences for Story Zone
 * 3. Conversation Dialogues - Q&A pairs for Conversation Zone
 *
 * Two progression modes:
 * 1. Tier-Locked (Hybrid A+C) - Same grammar constraints per tier
 * 2. Cumulative (Proposal D) - Higher tiers use vocabulary from previous lessons
 */

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load configuration
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
    $windowStart = $now - 3600;

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

// ==================== SHARED GRAMMAR RULES ====================

$GRAMMAR_RULES = <<<'GRAMMAR'
## CEBUANO GRAMMAR RULES (MANDATORY ENFORCEMENT)

### A. PRONOUN FORM RULES

Cebuano pronouns have FULL and SHORT forms with strict positional rules:

| Person | Full Form (Nominative) | Short Form (Genitive) |
|--------|------------------------|----------------------|
| 1st sing | Ako | ko, nako |
| 2nd sing | Ikaw | ka, nimo |
| 3rd sing | Siya | niya |
| 1st pl (excl) | Kami | namo |
| 1st pl (incl) | Kita | nato, ta |
| 2nd pl | Kamo | ninyo |
| 3rd pl | Sila | nila |

**FULL FORM USAGE (Ako, Ikaw, Siya, Kami, Kita, Kamo, Sila):**
- Sentence-initial position: "Ako naglakaw." (I walked.)
- After ang (topic marker): "Ang ako nalipay." (I am happy.)
- Emphatic/contrastive contexts: "Ako, dili siya." (Me, not him.)
- As sentence topic/focus

**SHORT FORM USAGE (ko, ka, niya, namo, nato, ninyo, nila):**
- Post-verbal position: "Naglakaw ko." (I walked.)
- Non-topic/agent position: "Gibuhat ko." (Done by me.)
- Possessive: "Ang balay ko." (My house.)
- Second position in clause (after first word/phrase)

**VIOLATION EXAMPLES:**
- ❌ "Ko naglakaw." (Short form cannot be sentence-initial)
- ❌ "Naglakaw Ako sa merkado." (Full form wrong in post-verbal non-initial)
- ✓ "Ako naglakaw sa merkado." (Full form sentence-initial)
- ✓ "Naglakaw ako sa merkado." (Full form post-verbal but as topic)

### B. ARTICLE USAGE RULES

| Article | Function | Usage |
|---------|----------|-------|
| **ang** | Topic/subject marker | Marks the definite topic: "Ang balay dako." |
| **sa** | Location/direction/genitive | Location: "sa merkado", Possession: "sa bata" |
| **og/ug** | Indefinite object, conjunction | Object: "Mipalit og isda", And: "isda og gulay" |
| **si** | Personal name marker (topic) | "Si Maria naglakaw." |
| **ni** | Personal name marker (genitive) | "Ang balay ni Maria." |

**RULES:**
- "ang" for definite/specific topics
- "sa" for locations, directions, and genitive relationships
- "og" for indefinite objects and as conjunction "and"
- "si" before personal names as topic
- "ni" before personal names for possession/agent

### C. VERB AFFIX RULES

**CRITICAL: Only use affixes listed in the "allowed verb affixes" column for each verb.**

Common affix patterns:
| Affix | Function | Example |
|-------|----------|---------|
| nag- | Past, actor focus | naglakaw (walked) |
| mag- | Future, actor focus | maglakaw (will walk) |
| mi- | Past, actor focus (motion) | milakaw (walked/went) |
| mo- | Future, actor focus (motion) | molakaw (will walk/go) |
| gi- | Past, object focus | gibuhat (was done) |
| -on | Future, object focus | buhaton (will be done) |
| i- | Object/benefactive focus | ihatag (to give [something]) |
| -an | Locative/directional focus | adtoan (to go to) |

**VALIDATION:**
- Check each verb against its allowed affixes
- Do NOT generate affix combinations not in the allowed list
- Mark affixed verbs with {root}: "Naglakaw {Lakaw}"

### D. TIER GRAMMAR RESTRICTIONS

**TIER 1 (Simple) - L1 Grammar Only:**
ALLOWED:
- Demonstratives: Kini, ni, Kana, na, Kadto, kato
- Location pronouns: Diri, Dinhi, Didto, Diha, Dinha
- Basic pronouns: Ako, ko, Ikaw, ka, Siya, Sila (and other forms)
- Article: ang
- Question words: Asa, Unsa, Kinsa
- Base verbs (imperative): Lakaw, Adto, Hunong, Higda, Dagan

FORBIDDEN:
- ❌ Affixed verbs (nag-, mag-, mi-, gi-, i-, -on, -an)
- ❌ Preposition "sa"
- ❌ Adjectives (dako, gamay, duol, layo)
- ❌ Conjunction "og"
- ❌ Plural marker "mga"
- ❌ Complex prepositions (gikan, atubangan, kilid, padulong)

**TIER 2 (Medium) - L1 + L2 Grammar:**
ALLOWED (in addition to Tier 1):
- Preposition: sa
- Adjectives: dako, gamay, duol, layo
- Affirmation/Negation: Oo, Dili
- nag- verb forms ONLY

FORBIDDEN:
- ❌ Possessive pronouns (akong, imong, iyang, ilang)
- ❌ Complex prepositions (gikan, atubangan, kilid, padulong)
- ❌ Conjunction "og"
- ❌ Plural marker "mga"
- ❌ Other verb affixes (mi-, gi-, i-, -on, -an)

**TIER 3 (Advanced) - All L1-L4 Grammar:**
ALLOWED:
- Everything from Tiers 1 & 2
- Possessive pronouns: akong, imong, iyang, ilang
- Complex prepositions: gikan, atubangan, kilid, padulong
- Conjunction: og
- Plural marker: mga
- Full verb system (all affixes from allowed list)
GRAMMAR;

// ==================== AUDIT REQUIREMENTS ====================

$AUDIT_REQUIREMENTS = <<<'AUDIT'
## MANDATORY AUDIT SYSTEM (CRITICAL - ZERO TOLERANCE)

### STEP 1: BUILD ALLOWED WORD LIST
Create a COMPLETE list of every allowed word from vocabulary extraction:
- All Q&A words
- All Function words
- All Pronouns (BOTH full and short forms from "/" notation)
- All Nouns
- All Adverbs, Adjectives, Prepositions, Numbers, Special words
- All Verbs AND their derivatives (only forms you listed)

This is your ALLOWED WORD LIST. NO other Cebuano words may appear.

### STEP 2: VOCABULARY AUDIT
For EACH word in generated sentences:
1. Strip {root} markers to get base word
2. Check against ALLOWED WORD LIST
3. If NOT in list → ❌ VIOLATION

### STEP 3: GRAMMAR AUDIT
For EACH sentence, verify:

**Pronoun Check:**
- Full forms (Ako, Ikaw, Siya, etc.) only in allowed positions
- Short forms (ko, ka, niya, etc.) only in allowed positions
- Mark violations: "❌ PRONOUN: [word] in wrong position"

**Article Check:**
- "ang" used correctly as topic marker
- "sa" used correctly for location/genitive
- "og" used correctly for objects/conjunction
- "si/ni" used correctly with personal names
- Mark violations: "❌ ARTICLE: [word] used incorrectly"

**Affix Check:**
- Each affixed verb uses ONLY allowed affixes from vocabulary table
- Mark violations: "❌ AFFIX: [verb] uses unauthorized affix"

**Tier Check:**
- No forbidden grammar for the tier level
- Mark violations: "❌ TIER: [word/pattern] forbidden in Tier X"

### STEP 4: AUDIT OUTPUT FORMAT

## AUDIT RESULTS

### Vocabulary Check:
✓ All words verified - no violations
OR
❌ VIOLATIONS FOUND:
- [word] in Sequence X, Sentence Y - NOT IN VOCABULARY

### Grammar Check:
✓ All grammar verified - no violations
OR
❌ VIOLATIONS FOUND:
- ❌ PRONOUN: "ko" sentence-initial in Seq X, Sent Y
- ❌ ARTICLE: "ang" missing before topic in Seq X, Sent Y
- ❌ AFFIX: "milakaw" uses mi- not in allowed affixes
- ❌ TIER: "sa" used in Tier 1 sentence

### Word Usage Count:
| Word | Category | Count | Min Required | Status |
|------|----------|-------|--------------|--------|
| Kini | Demonstrative | 5 | 3 | ✓ |
| ang | Article | 12 | 3 | ✓ |
...

### Summary:
- Vocabulary violations: [0 or count]
- Grammar violations: [0 or count]
- Words below 3x minimum: [list]
- **AUDIT STATUS: PASSED / FAILED**

### ZERO TOLERANCE RULE:
If ANY violation exists, you MUST:
1. List all violations
2. Rewrite affected sentences
3. Re-run audit
4. Only output when AUDIT STATUS: PASSED
AUDIT;

// ==================== CONTENT TYPE: REVIEW SENTENCES ====================

$REVIEW_SENTENCES_PROMPT = <<<'PROMPT'
You are a Cebuano linguistics expert. Your task is to extract vocabulary and generate TIERED LADDERIZED SENTENCE SEQUENCES for the Sentence Review module.

## TASK OVERVIEW
1. Extract vocabulary from the provided table
2. Generate verb derivatives (ONLY real Cebuano forms)
3. Create tiered sentence sequences (Simple → Medium → Advanced)
4. Perform strict vocabulary and grammar audits
5. Output verified CSV content

## STEP 1: VOCABULARY EXTRACTION

CRITICAL RULES:
1. Extract all words exactly as shown in the table
2. For "/" alternatives (e.g., Ako/ko), include BOTH forms
3. For verbs, only generate derivatives using affixes from "allowed verb affixes" column
4. Verify each derivative is a real, commonly used Cebuano form

PROCESS:
1. Extract words from: Q&A, Verb, Adverb, Function Words, Pronoun, Noun, Adjective, Preposition, Numbers, Special
2. Split "/" alternatives into separate entries
3. Generate ONLY allowed verb derivatives

## STEP 2: TIERED SENTENCE SEQUENCES

### THREE-TIER SYSTEM:

| Tier | Name | Max Words | Grammar Scope |
|------|------|-----------|---------------|
| Tier 1 | Simple | 2-3 | L1 only |
| Tier 2 | Medium | 2-5 | L1-L2 |
| Tier 3 | Advanced | 2-8 | L1-L4 |

### COMPLEXITY MODE DISTRIBUTION:
- **BEGINNER HEAVY**: 4 Simple + 2 Medium + 2 Advanced = 8 sequences
- **PROGRESSIVE**: 2 Simple + 3 Medium + 3 Advanced = 8 sequences

### SENTENCE TYPES:
Every sentence must have exactly one type:
- **Statement**: Declares a fact (ends with .)
- **Command**: Imperative instruction (base verb, no actor)
- **Question**: Asks for information (ends with ?)
- **Answer**: Direct response to question (follows Question)

Questions MUST be immediately followed by Answers.

### TIER 1 PATTERNS (2-3 words, L1 only):
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2 | Base-verb + Location |
| 3 | 3 | Question + ang + Noun |
| 4 | 2 | Location answer |
| 5 | 2 | Demonstrative + Noun |
| 6 | 2-3 | Base-verb + target |
| 7 | 3 | Question + ang + Noun |
| 8 | 2-3 | Simple answer |

### TIER 2 PATTERNS (2-5 words, L1+L2):
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2-3 | Base-verb + target |
| 3 | 3 | Question + ang + Noun |
| 4 | 3-4 | Ang + Noun + Adjective/Location |
| 5 | 4-5 | Noun phrase with sa + Place |
| 6 | 4-5 | nag-Verb + Actor + sa + Noun |
| 7 | 4-5 | nag-Verb + Actor + sa + Noun |
| 8 | 4-5 | Statement with Oo/Dili + adjective |

### TIER 3 PATTERNS (2-8 words, all grammar):
| Position | Words | Pattern |
|----------|-------|---------|
| 1 | 2 | Demonstrative + Noun |
| 2 | 2-3 | Base-verb + target |
| 3 | 3 | Question + ang + Noun |
| 4 | 4-5 | Answer with sa + location |
| 5 | 4-5 | nag-Verb + Actor + sa + Noun |
| 6 | 5-6 | Location with complex preposition |
| 7 | 6-8 | gikan...padulong OR compound with og |
| 8 | 6-8 | Complex: mga + contrast (dili) |

{GRAMMAR_RULES}

{AUDIT_REQUIREMENTS}

## OUTPUT FORMAT

Output verified content wrapped in markers:

===VERIFIED_OUTPUT_START===

## VOCABULARY LIST
[Organized by category]

## AUDIT RESULTS
[Full audit tables as specified above]

## SENTENCE CSV
```csv
Lesson #,Tier,Seq #,Sequ Title,Sentence #,Sentence Text,English Translation,Sentence Type
[All sequences grouped by tier: Simple first, Medium second, Advanced last]
```

===VERIFIED_OUTPUT_END===

CRITICAL: Complete the ===VERIFIED_OUTPUT_END=== marker. Include full audit tables.
PROMPT;

// ==================== CONTENT TYPE: STORY SEQUENCES ====================

$STORY_SEQUENCES_PROMPT = <<<'PROMPT'
You are a Cebuano linguistics expert. Your task is to extract vocabulary and generate NARRATIVE STORY SEQUENCES for the Story Zone module, where students arrange sentences in correct order.

## TASK OVERVIEW
1. Extract vocabulary from the provided table
2. Generate verb derivatives (ONLY real Cebuano forms)
3. Create story sequences with CLEAR LOGICAL ORDER
4. Perform strict vocabulary and grammar audits
5. Output verified CSV content

## CRITICAL: STORY ZONE REQUIREMENTS

Stories are used for **sentence ordering exercises**. Students see shuffled sentences and must arrange them correctly. Therefore:

1. **Order must be DETERMINABLE** - logical sequence, not arbitrary
2. **Temporal/causal flow** - first → then → finally
3. **Coherent mini-narratives** - each sequence tells a complete story
4. **Clear sequence markers** - setting → action → resolution

## STEP 1: VOCABULARY EXTRACTION

CRITICAL RULES:
1. Extract all words exactly as shown in the table
2. For "/" alternatives (e.g., Ako/ko), include BOTH forms
3. For verbs, only generate derivatives using affixes from "allowed verb affixes" column
4. Verify each derivative is a real, commonly used Cebuano form

## STEP 2: TIERED STORY SEQUENCES

### THREE-TIER SYSTEM:

| Tier | Name | Sentences | Story Type | Grammar |
|------|------|-----------|------------|---------|
| Tier 1 | Scene | 4 | Identification sequence | L1 only |
| Tier 2 | Action | 5-6 | Basic action narrative | L1-L2 |
| Tier 3 | Journey | 6-8 | Full journey narrative | L1-L4 |

### COMPLEXITY MODE DISTRIBUTION:
- **BEGINNER HEAVY**: 4 Scene + 2 Action + 2 Journey = 8 sequences
- **PROGRESSIVE**: 2 Scene + 3 Action + 3 Journey = 8 sequences

### TIER 1: SCENE SEQUENCES (4 sentences, L1 only)

**Structure**: Identify → Locate → Direct → Confirm

**Pattern**:
| Position | Function | Pattern | Example |
|----------|----------|---------|---------|
| 1 | Identify subject | Demonstrative + Noun | Kini Balay. |
| 2 | Identify related | Kana + Noun | Kana Eskwelahan. |
| 3 | Give direction | Base-verb + Location | Lakaw didto. |
| 4 | Confirm location | Location + Pronoun | Didto siya. |

**Order Logic**: Introduction → Related item → Action → Result

**Forbidden in Tier 1:**
- ❌ Affixed verbs, "sa", adjectives, "og", "mga", complex prepositions

### TIER 2: ACTION SEQUENCES (5-6 sentences, L1+L2)

**Structure**: Setting → Action1 → Action2 → Description → Conclusion

**Pattern**:
| Position | Function | Pattern | Example |
|----------|----------|---------|---------|
| 1 | Setting | Kini + Noun + (sa Place) | Kini Balay ni Juan. |
| 2 | First action | nag-Verb + Actor + sa + Noun | Naglakaw siya sa Merkado. |
| 3 | Description | Ang + Noun + Adjective | Ang Merkado duol. |
| 4 | Second action | nag-Verb + Actor + sa + Noun | Naglakaw siya sa Tindahan. |
| 5 | Observation | Ang + Noun + Adjective | Ang Tindahan dako. |
| 6 | Conclusion | nag-Verb + return/result | Naglakaw siya sa Balay. |

**Order Logic**: Where we start → First destination → Description → Second destination → Final

**Allowed in Tier 2:** sa, adjectives, Oo/Dili, nag- verbs
**Forbidden:** og, mga, complex prepositions, other verb affixes

### TIER 3: JOURNEY SEQUENCES (6-8 sentences, all grammar)

**Structure**: Origin → Departure → Path → Arrival → Activity → Return

**Pattern**:
| Position | Function | Pattern | Example |
|----------|----------|---------|---------|
| 1 | Identify origin | Kini ang + Noun + ni + Name | Kini ang Balay ni Maria. |
| 2 | Departure | nag-Verb + gikan sa + Noun | Naglakaw siya gikan sa Balay. |
| 3 | Path/Direction | nag-Verb + padulong sa + Noun | Naglakaw siya padulong sa Merkado. |
| 4 | Landmark | Ang + Noun + preposition + sa + Noun | Ang Merkado atubangan sa Simbahan. |
| 5 | Activity | Verb + og + Object + sa + Place | Namalit siya og isda sa Merkado. |
| 6 | More activity | Verb + og + Object | Namalit siya og gulay. |
| 7 | Return journey | nag-Verb + gikan + padulong | Naglakaw siya gikan sa Merkado padulong sa Balay. |
| 8 | Conclusion | Statement about result | Ang mga isda og gulay sa Balay na. |

**Order Logic**: Clear journey from origin → through path → to destination → activities → return

**All grammar allowed in Tier 3**

{GRAMMAR_RULES}

{AUDIT_REQUIREMENTS}

## OUTPUT FORMAT

===VERIFIED_OUTPUT_START===

## VOCABULARY LIST
[Organized by category]

## AUDIT RESULTS
[Full audit tables]

## STORY CSV
```csv
Lesson #,Tier,Seq #,Story Title,Sentence #,Sentence Text,English Translation,Sentence Type
[All sequences grouped by tier]
```

===VERIFIED_OUTPUT_END===

**CSV Notes:**
- Sentence Type for stories: Statement, Command (most will be Statement)
- Story Title should describe the narrative (e.g., "Maria Goes to Market")
- Order in CSV = correct order for the story
PROMPT;

// ==================== CONTENT TYPE: CONVERSATION DIALOGUES ====================

$CONVERSATION_DIALOGUES_PROMPT = <<<'PROMPT'
You are a Cebuano linguistics expert. Your task is to extract vocabulary and generate Q&A CONVERSATION DIALOGUES for the Conversation Zone module, where students match questions with correct answers.

## TASK OVERVIEW
1. Extract vocabulary from the provided table
2. Generate verb derivatives (ONLY real Cebuano forms)
3. Create Q&A pairs with UNAMBIGUOUS correct answers
4. Perform strict vocabulary and grammar audits
5. Output verified CSV content

## CRITICAL: CONVERSATION ZONE REQUIREMENTS

Dialogues are used for **Q&A matching exercises**. Students see a question and must select the correct answer from multiple choices. Therefore:

1. **Clear Q&A pairing** - every Question has exactly ONE correct Answer
2. **Unambiguous answers** - correct answer must be clearly distinguishable
3. **Distractor-friendly** - generate enough variety for wrong answer options
4. **Natural dialogue patterns** - realistic conversational exchanges

## STEP 1: VOCABULARY EXTRACTION

CRITICAL RULES:
1. Extract all words exactly as shown in the table
2. For "/" alternatives (e.g., Ako/ko), include BOTH forms
3. For verbs, only generate derivatives using affixes from "allowed verb affixes" column
4. Verify each derivative is a real, commonly used Cebuano form

## STEP 2: TIERED CONVERSATION DIALOGUES

### THREE-TIER SYSTEM:

| Tier | Name | Q&A Complexity | Grammar |
|------|------|----------------|---------|
| Tier 1 | Identify | Simple identification Q&A | L1 only |
| Tier 2 | Describe | Descriptive Q&A with details | L1-L2 |
| Tier 3 | Converse | Complex multi-part Q&A | L1-L4 |

### COMPLEXITY MODE DISTRIBUTION:
- **BEGINNER HEAVY**: 8 Identify + 4 Describe + 4 Converse = 16 Q&A pairs
- **PROGRESSIVE**: 4 Identify + 6 Describe + 6 Converse = 16 Q&A pairs

### TIER 1: IDENTIFICATION Q&A (L1 only)

**Question Types Available:**
| Question Pattern | Answer Pattern | Example |
|------------------|----------------|---------|
| Unsa kini/kana? | Kini/Kana + Noun | Q: Unsa kini? A: Kini Balay. |
| Asa ang + Noun? | Location + Pronoun/Noun | Q: Asa ang Maestra? A: Didto siya. |
| Kinsa siya/kini? | Siya/Kini + Noun/Name | Q: Kinsa siya? A: Siya Maestra. |

**Rules:**
- Answers use demonstratives and location pronouns only
- No "sa" in answers
- No adjectives in answers
- Questions: 2-3 words, Answers: 2-3 words

**Forbidden in Tier 1:** Affixed verbs, sa, adjectives, og, mga

### TIER 2: DESCRIPTIVE Q&A (L1+L2)

**Question Types Available:**
| Question Pattern | Answer Pattern | Example |
|------------------|----------------|---------|
| Asa ang + Noun? | Ang + Noun + Adj + sa + Place | Q: Asa ang Ospital? A: Ang Ospital duol sa Simbahan. |
| Adj + ba ang + Noun? | Oo/Dili, Adj + ang + Noun | Q: Dako ba ang Merkado? A: Oo, dako ang Merkado. |
| nag-Verb + ba + Pronoun? | Oo/Dili, nag-Verb + Pronoun + sa | Q: Naglakaw ba siya? A: Oo, naglakaw siya sa Eskwelahan. |
| Unsa ang + Noun? | Ang + Noun + Adj | Q: Unsa ang Tindahan? A: Ang Tindahan gamay. |

**Rules:**
- Answers can include adjectives and "sa"
- Yes/No questions use Oo/Dili
- nag- verbs allowed
- Questions: 3-4 words, Answers: 3-5 words

**Forbidden in Tier 2:** og, mga, complex prepositions, possessives

### TIER 3: COMPLEX Q&A (All grammar)

**Question Types Available:**
| Question Pattern | Answer Pattern | Example |
|------------------|----------------|---------|
| Asa + Verb + si + Name + gikan sa? | Verb + gikan sa + Place + padulong sa + Place | Q: Asa naglakaw si Maria gikan sa Balay? A: Naglakaw siya gikan sa Balay padulong sa Merkado. |
| Unsa ang gi-Verb + niya? | Verb + og + Object(s) | Q: Unsa ang gipalit niya? A: Namalit siya og isda og gulay. |
| Asa ang mga + Noun? | Ang mga + Noun + Location | Q: Asa ang mga Tindahan? A: Ang mga Tindahan sa Siyudad. |
| Kinsa ang tag-iya sa + Noun? | Si + Name ang tag-iya | Q: Kinsa ang tag-iya sa Balay? A: Si Juan ang tag-iya. |

**Rules:**
- Full grammar allowed
- Compound objects with og
- Complex prepositions (gikan, padulong, atubangan, kilid)
- Possessives and plurals
- Questions: 4-6 words, Answers: 5-8 words

### ANSWER DISTINCTIVENESS REQUIREMENT

For each Q&A pair, ensure the correct answer is CLEARLY DISTINCT:

**Good Example:**
```
Q: Asa ang Ospital?
A: Ang Ospital duol sa Simbahan. ← Clearly about Ospital location
(Wrong options would be about OTHER places, not Ospital)
```

**Bad Example:**
```
Q: Asa ang Ospital?
A: Duol. ← Too vague, could match other questions
```

{GRAMMAR_RULES}

{AUDIT_REQUIREMENTS}

## OUTPUT FORMAT

===VERIFIED_OUTPUT_START===

## VOCABULARY LIST
[Organized by category]

## AUDIT RESULTS
[Full audit tables]

## CONVERSATION CSV
```csv
Lesson #,Tier,Pair #,Context,Sentence #,Sentence Text,English Translation,Sentence Type
[Format: Each pair has exactly 2 rows - Question then Answer]
```

===VERIFIED_OUTPUT_END===

**CSV Notes:**
- Sentence # is always 1 (Question) or 2 (Answer) within each pair
- Context describes the conversation topic (e.g., "Finding the Hospital")
- Sentence Type is always "Question" or "Answer"
- Pairs are grouped by Tier: Identify first, Describe second, Converse last
PROMPT;

// ==================== CUMULATIVE MODE ADDITIONS ====================

$CUMULATIVE_MODE_ADDITION = <<<'CUMULATIVE'
## CUMULATIVE VOCABULARY MODE (PROPOSAL D)

In this mode, higher tiers can access vocabulary from previous lessons:

| Tier | Vocabulary Access |
|------|-------------------|
| Tier 1 | Current lesson only |
| Tier 2 | Current lesson + 1 previous lesson |
| Tier 3 | Current lesson + ALL previous lessons |

**Implementation:**
- You will receive vocabulary from multiple lessons
- Mark which lesson each word comes from
- Tier 1 content: ONLY use words marked as current lesson
- Tier 2 content: Use words from current and immediate previous lesson
- Tier 3 content: Use words from all provided lessons

**Audit Modification:**
- Track which lesson each word belongs to
- Verify tier restrictions are respected
- Report any cross-lesson violations

**Benefits:**
- Richer narratives at higher tiers
- Reinforces retention of earlier vocabulary
- More realistic content through larger word pool
CUMULATIVE;

// ==================== BUILD FINAL PROMPT ====================

function buildSystemPrompt($contentType, $progressionMode) {
    global $GRAMMAR_RULES, $AUDIT_REQUIREMENTS;
    global $REVIEW_SENTENCES_PROMPT, $STORY_SEQUENCES_PROMPT, $CONVERSATION_DIALOGUES_PROMPT;
    global $CUMULATIVE_MODE_ADDITION;

    // Select base prompt by content type
    switch ($contentType) {
        case 'story':
            $basePrompt = $STORY_SEQUENCES_PROMPT;
            break;
        case 'conversation':
            $basePrompt = $CONVERSATION_DIALOGUES_PROMPT;
            break;
        case 'review':
        default:
            $basePrompt = $REVIEW_SENTENCES_PROMPT;
            break;
    }

    // Replace placeholders
    $prompt = str_replace('{GRAMMAR_RULES}', $GRAMMAR_RULES, $basePrompt);
    $prompt = str_replace('{AUDIT_REQUIREMENTS}', $AUDIT_REQUIREMENTS, $prompt);

    // Add cumulative mode section if applicable
    if ($progressionMode === 'cumulative') {
        $prompt .= "\n\n" . $CUMULATIVE_MODE_ADDITION;
    }

    return $prompt;
}

// ==================== API REQUEST WITH RETRY ====================

function makeAnthropicRequest($requestBody, $config) {
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
            CURLOPT_TIMEOUT => 300,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_DNS_CACHE_TIMEOUT => 120,
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
        curl_close($ch);

        writeLog("CURL completed", [
            'httpCode' => $httpCode,
            'elapsed' => $elapsed . 'ms',
            'responseLen' => strlen($response),
            'curlError' => $curlError ?: 'none'
        ]);

        if ($curlError) {
            $retryLog[] = ['attempt' => $attempt, 'error' => 'CURL: ' . $curlError, 'timestamp' => date('c')];

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
                $retryLog[count($retryLog) - 1]['waiting'] = $delay;
                $totalRetryTime += $delay;
                sleep((int)$delay);
                continue;
            }

            $lastError = ['type' => 'curl', 'message' => $curlError, 'code' => 500];
            break;
        }

        $data = json_decode($response, true);

        if ($httpCode === 200) {
            return [
                'success' => true,
                'data' => $data,
                'elapsed' => $elapsed,
                'attempts' => $attempt,
                'totalRetryTime' => $totalRetryTime,
                'retryLog' => $retryLog
            ];
        }

        if ($httpCode === 429 || $httpCode === 529) {
            $errorMessage = $data['error']['message'] ?? 'Rate limit exceeded';
            $retryLog[] = [
                'attempt' => $attempt,
                'error' => "HTTP $httpCode: $errorMessage",
                'timestamp' => date('c')
            ];

            if ($attempt < $retryConfig['max_attempts']) {
                $delay = min(
                    $retryConfig['initial_delay'] * pow($retryConfig['backoff_multiplier'], $attempt - 1),
                    $retryConfig['max_delay']
                );

                if (isset($data['error']['retry_after'])) {
                    $delay = max($delay, (float)$data['error']['retry_after']);
                }

                $retryLog[count($retryLog) - 1]['waiting'] = $delay;
                $totalRetryTime += $delay;
                sleep((int)$delay);
                continue;
            }

            $lastError = ['type' => 'rate_limit', 'message' => $errorMessage, 'code' => $httpCode];
            break;
        }

        $lastError = [
            'type' => 'api_error',
            'message' => $data['error']['message'] ?? 'API request failed',
            'code' => $httpCode,
            'details' => $data
        ];
        break;
    }

    return [
        'success' => false,
        'error' => $lastError,
        'attempts' => $attempt,
        'totalRetryTime' => $totalRetryTime,
        'retryLog' => $retryLog
    ];
}

// ==================== REQUEST ROUTING ====================

$method = $_SERVER['REQUEST_METHOD'];

if (isset($_GET['path'])) {
    $path = $_GET['path'];
} else {
    $requestUri = $_SERVER['REQUEST_URI'];
    $basePath = '/sentences';
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = preg_replace('#^' . preg_quote($basePath, '#') . '#', '', $path);
}

$path = '/' . ltrim($path, '/');

// Debug endpoint
if (isset($_GET['showpath'])) {
    echo json_encode([
        'path' => $path,
        'method' => $method,
        'php_version' => PHP_VERSION
    ]);
    exit;
}

// Route: GET /api/health
if ($method === 'GET' && $path === '/api/health') {
    echo json_encode([
        'status' => 'ok',
        'timestamp' => date('c'),
        'hasApiKey' => !empty($config['api_key']) && $config['api_key'] !== 'sk-ant-api03-YOUR-API-KEY-HERE',
        'version' => '2.0',
        'contentTypes' => ['review', 'story', 'conversation'],
        'progressionModes' => ['tier-locked', 'cumulative']
    ]);
    exit;
}

// Route: GET /api/logs
if ($method === 'GET' && $path === '/api/logs') {
    if (!($config['debug'] ?? false)) {
        http_response_code(403);
        echo json_encode(['error' => 'Debug mode not enabled']);
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
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $lines = array_slice($lines, -$limit);

    echo json_encode([
        'logs' => implode("\n", $lines),
        'lineCount' => count($lines),
        'fileSize' => filesize($logFile)
    ]);
    exit;
}

// Route: GET /api/test
if ($method === 'GET' && $path === '/api/test') {
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
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
    ]);

    $startTime = microtime(true);
    $response = curl_exec($ch);
    $elapsed = round((microtime(true) - $startTime) * 1000);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        echo json_encode([
            'success' => false,
            'error' => $curlError,
            'elapsed' => $elapsed
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
        ],
        'contentTypes' => [
            ['value' => 'review', 'label' => 'Review Sentences', 'description' => 'Tiered ladder sentences for Sentence Review module'],
            ['value' => 'story', 'label' => 'Story Sequences', 'description' => 'Narrative sequences for Story Zone (drag-to-order)'],
            ['value' => 'conversation', 'label' => 'Conversation Dialogues', 'description' => 'Q&A pairs for Conversation Zone (matching)']
        ],
        'progressionModes' => [
            ['value' => 'tier-locked', 'label' => 'Tier-Locked', 'description' => 'Same grammar constraints per tier, patterns unlock based on available grammar'],
            ['value' => 'cumulative', 'label' => 'Cumulative', 'description' => 'Higher tiers can use vocabulary from all previous lessons']
        ]
    ]);
    exit;
}

// Route: POST /api/process
if ($method === 'POST' && $path === '/api/process') {
    writeLog('=== Process request started ===');

    if (empty($config['api_key']) || $config['api_key'] === 'sk-ant-api03-YOUR-API-KEY-HERE') {
        http_response_code(500);
        echo json_encode(['error' => 'API key not configured on server']);
        exit;
    }

    if (!checkRateLimit($config['rate_limit'])) {
        http_response_code(429);
        echo json_encode(['error' => 'Rate limit exceeded. Please try again later.']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (empty($input['lessonNum']) || empty($input['tableData'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: lessonNum and tableData']);
        exit;
    }

    $lessonNum = $input['lessonNum'];
    $tableData = $input['tableData'];
    $model = $input['customModel'] ?? $config['default_model'];
    $maxTokens = isset($input['maxTokens']) ? min(max((int)$input['maxTokens'], 4000), 64000) : $config['max_tokens'];
    $complexityMode = $input['complexityMode'] ?? 'beginner';
    $contentType = $input['contentType'] ?? 'review';
    $progressionMode = $input['progressionMode'] ?? 'tier-locked';
    $previousLessonsData = $input['previousLessonsData'] ?? null;

    writeLog('Processing request', [
        'lessonNum' => $lessonNum,
        'model' => $model,
        'maxTokens' => $maxTokens,
        'contentType' => $contentType,
        'progressionMode' => $progressionMode,
        'complexityMode' => $complexityMode
    ]);

    // Build system prompt based on content type and progression mode
    $systemPrompt = buildSystemPrompt($contentType, $progressionMode);

    // Build content type label
    $contentTypeLabels = [
        'review' => 'Review Sentences',
        'story' => 'Story Sequences',
        'conversation' => 'Conversation Dialogues'
    ];
    $contentTypeLabel = $contentTypeLabels[$contentType] ?? 'Review Sentences';

    // Build complexity mode description
    $modeDescription = $complexityMode === 'beginner'
        ? 'BEGINNER HEAVY distribution'
        : 'PROGRESSIVE distribution';

    // Build user message
    $userMessage = "Generate **{$contentTypeLabel}** for Lesson {$lessonNum}.\n\n";
    $userMessage .= "**Vocabulary Table:**\n{$tableData}\n\n";
    $userMessage .= "**Complexity Mode:** {$modeDescription}\n";
    $userMessage .= "**Progression Mode:** " . ($progressionMode === 'cumulative' ? 'Cumulative (use vocabulary from previous lessons in higher tiers)' : 'Tier-Locked (current lesson vocabulary only)') . "\n\n";

    if ($progressionMode === 'cumulative' && !empty($previousLessonsData)) {
        $userMessage .= "**Previous Lessons Vocabulary (for Tier 2/3 use):**\n{$previousLessonsData}\n\n";
    }

    $userMessage .= "Please:\n";
    $userMessage .= "1. Extract all vocabulary exactly as shown (remember \"/\" means both forms)\n";
    $userMessage .= "2. Generate ONLY real Cebuano verb derivatives using allowed affixes\n";
    $userMessage .= "3. Create tiered content following the specified patterns\n";
    $userMessage .= "4. Perform STRICT vocabulary audit (zero tolerance for unlisted words)\n";
    $userMessage .= "5. Perform STRICT grammar audit (pronoun forms, articles, affixes, tier restrictions)\n";
    $userMessage .= "6. Ensure all words meet the 3x minimum usage requirement\n";
    $userMessage .= "7. IMPORTANT: Wrap final verified output in ===VERIFIED_OUTPUT_START=== and ===VERIFIED_OUTPUT_END=== markers\n\n";
    $userMessage .= "Output the complete verified result with full audit tables.";

    $requestBody = [
        'model' => $model,
        'max_tokens' => $maxTokens,
        'system' => $systemPrompt,
        'messages' => [
            ['role' => 'user', 'content' => $userMessage]
        ]
    ];

    $result = makeAnthropicRequest($requestBody, $config);

    if (!$result['success']) {
        $error = $result['error'];
        http_response_code($error['code'] ?? 500);
        echo json_encode([
            'error' => $error['message'],
            'errorType' => $error['type'],
            'attempts' => $result['attempts'],
            'totalRetryTime' => $result['totalRetryTime'],
            'retryLog' => $result['retryLog']
        ]);
        exit;
    }

    $data = $result['data'];
    $inputTokens = $data['usage']['input_tokens'] ?? 0;
    $outputTokens = $data['usage']['output_tokens'] ?? 0;

    writeLog('SUCCESS', [
        'lessonNum' => $lessonNum,
        'contentType' => $contentType,
        'inputTokens' => $inputTokens,
        'outputTokens' => $outputTokens
    ]);

    echo json_encode([
        'success' => true,
        'lessonNum' => $lessonNum,
        'contentType' => $contentType,
        'progressionMode' => $progressionMode,
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

// 404 for unknown routes
if (strpos($path, '/api/') === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
