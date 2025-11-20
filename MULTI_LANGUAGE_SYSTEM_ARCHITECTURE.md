# Multi-Language System Architecture
## How Cebuano, Maranao, Sinama, and English are Handled

---

## Current State: ⚠️ Incomplete Multi-Language Support

### What Exists
- **Cebuano:** ✅ Fully imported and working
- **English:** ✅ Used as translation/reference language
- **Maranao:** ❌ NOT currently imported (empty in manifest)
- **Sinama:** ❌ NOT currently imported (empty in manifest)

---

## How the Language System SHOULD Work

### 1. Language Definition (`Language_List.csv`)

**Location:** `/home/user/WSOL/assets/Language_List.csv`

```csv
ID,Name,Trigraph
1,Cebuano,ceb
2,English,eng
3,Maranao,mrw
4,Sinama,sin
```

**Purpose:** Defines all supported languages with:
- `id` - Unique identifier
- `name` - Display name (e.g., "Cebuano")
- `trigraph` - 3-letter ISO 639-3 code (e.g., "ceb")

---

## 2. Expected CSV File Structure

### The System Expects SEPARATE Word List Files:

```
/home/user/WSOL/assets/
├── Word_List_Cebuano.csv  ← Cebuano words
├── Word_List_Maranao.csv  ← Maranao words
└── Word_List_Sinama.csv   ← Sinama words
```

### CSV Format (per language):

```csv
Lesson #,Card #,Word,Word Note,English,English Note,Grammar,Category,Sub-Category 1,Sub-Category 2,ACTFL Est.,Type
1,1,Asa,,Where,,Interrogative,Function Word,Question Word,Question Word,Novice-Mid,N
1,2,Unsa,,What,,Interrogative,Function Word,Question Word,Question Word,Novice-Mid,N
```

**Column Mapping:**
- Column 0: Lesson #
- Column 1: Card #
- Column 2: **Word in target language** (Cebuano/Maranao/Sinama)
- Column 3: Word Note
- Column 4: **English translation**
- Column 5: English Note
- Column 6: Grammar
- Column 7: Category
- Column 8: Sub-Category 1
- Column 9: Sub-Category 2
- Column 10: ACTFL Est.
- Column 11: Type (N/R/S)

---

## 3. What Currently Exists

### Master CSV File: `Word_List.csv`

**Location:** `/home/user/WSOL/assets/Word_List.csv`

This is a COMBINED file with ALL languages in one CSV:

```csv
Lesson #,Card #,Cebuano,English,Cebuano Note,English Note,Maranao,Maranao Note,Sinama,Sinama Note,Grammar,...
1,1,Asa,Where,,,,,,,Interrogative,...
1,12,Ako/ko,I/me,,,,,,,Pronoun,...
```

**Column Structure:**
- Column 0: Lesson #
- Column 1: Card #
- **Column 2: Cebuano** ← Target language #1
- Column 3: English ← Translation
- Column 4: Cebuano Note
- Column 5: English Note
- **Column 6: Maranao** ← Target language #2
- Column 7: Maranao Note
- **Column 8: Sinama** ← Target language #3
- Column 9: Sinama Note
- Column 10: Grammar
- Column 11: Category
- ...

**Problem:** This format doesn't match what `scan-assets.php` expects!

---

## 4. How scan-assets.php Processes Languages

### Step-by-Step Flow:

**Step 1: Load Language Definitions**
```php
$languages = loadLanguageList($assetsDir . '/Language_List.csv');
// Returns: [
//   {id: 1, name: 'Cebuano', trigraph: 'ceb'},
//   {id: 2, name: 'English', trigraph: 'eng'},
//   {id: 3, name: 'Maranao', trigraph: 'mrw'},
//   {id: 4, name: 'Sinama', trigraph: 'sin'}
// ]
```

**Step 2: For Each Language, Load Its Word List**
```php
foreach ($languages as $lang) {
    $trig = $lang['trigraph'];  // 'ceb', 'eng', 'mrw', 'sin'

    // Construct filename
    $csv = "$assetsDir/Word_List_" . $langByTrigraph[$trig] . ".csv";
    // Expected files:
    //   - Word_List_Cebuano.csv
    //   - Word_List_English.csv
    //   - Word_List_Maranao.csv
    //   - Word_List_Sinama.csv

    $list = file_exists($csv) ? loadLanguageWordList($csv) : [];

    foreach ($list as $card) {
        $num = $card['cardNum'];

        // Store word for this language
        $cardsMaster[$num]['word'][$trig] = $card['word'];
        $cardsMaster[$num]['english'][$trig] = $card['english'];
    }
}
```

**Step 3: Build Per-Language Manifest Arrays**
```php
foreach ($languages as $lang) {
    $trig = $lang['trigraph'];
    $finalCards[$trig] = [];

    foreach ($cardsMaster as $c) {
        if (!isset($c['word'][$trig])) continue;  // Skip if no word for this language

        $finalCards[$trig][] = [
            'cardNum' => $c['cardNum'],
            'word' => $c['word'][$trig],      // Word in this language
            'english' => $c['english'][$trig],
            // ...
        ];
    }
}
```

---

## 5. Current Problem

### Files Expected vs Files That Exist:

| Expected File | Exists? | Status |
|--------------|---------|--------|
| `Word_List_Cebuano.csv` | ❌ NO | Missing (uses master CSV) |
| `Word_List_English.csv` | ❌ NO | Missing |
| `Word_List_Maranao.csv` | ❌ NO | Missing |
| `Word_List_Sinama.csv` | ❌ NO | Missing |
| `Word_List.csv` (master) | ✅ YES | Has all languages but wrong format |

### Result in Manifest:

**Cebuano cards exist** because the current v3.1 manifest was hand-edited or created by an older system.

**Maranao and Sinama are EMPTY:**
```json
{
    "wordNum": 1,
    "translations": {
        "cebuano": {
            "word": "Asa",
            "note": "Where",
            "acceptableAnswers": ["Asa"]
        },
        "maranao": {
            "word": "",  ← EMPTY!
            "note": "",
            "acceptableAnswers": []
        },
        "sinama": {
            "word": "",  ← EMPTY!
            "note": "",
            "acceptableAnswers": []
        }
    }
}
```

---

## 6. Audio File Handling Per Language

### Audio File Naming Pattern:
```
{cardNum}.{trigraph}.{wordVariant}.{ext}
```

### Examples:

**Cebuano:**
```
12.ceb.ako.m4a
12.ceb.ko.m4a
```

**Maranao:**
```
12.mrw.saken.m4a     (hypothetical - "I" in Maranao)
12.mrw.ko.m4a
```

**Sinama:**
```
12.sin.aku.m4a       (hypothetical - "I" in Sinama)
12.sin.ku.m4a
```

### How Audio Files Are Linked:

```php
foreach ($audioFiles as $f) {
    list($num, $trig, $wordVariant) = extractAudioInfo($f);
    // Extract: cardNum, trigraph, wordVariant from filename

    if ($num && $trig && isset($cardsMaster[$num])) {
        $path = "assets/$f";

        // Store audio under language trigraph
        $cardsMaster[$num]['audio'][$trig][$wordVariant] = $path;
    }
}
```

**Example Storage:**
```php
$cardsMaster[12]['audio'] = [
    'ceb' => [
        'ako' => 'assets/12.ceb.ako.m4a',
        'ko' => 'assets/12.ceb.ko.m4a'
    ],
    'mrw' => [
        'saken' => 'assets/12.mrw.saken.m4a'
    ],
    'sin' => [
        'aku' => 'assets/12.sin.aku.m4a'
    ]
];
```

### In Manifest v4.0:

Each language gets its own card array:
```json
{
    "cards": {
        "ceb": [
            {
                "cardNum": 12,
                "word": "Ako/ko",
                "audio": ["assets/12.ceb.ako.m4a", "assets/12.ceb.ko.m4a"]
            }
        ],
        "mrw": [
            {
                "cardNum": 12,
                "word": "Saken",
                "audio": ["assets/12.mrw.saken.m4a"]
            }
        ],
        "sin": [
            {
                "cardNum": 12,
                "word": "Aku",
                "audio": ["assets/12.sin.aku.m4a"]
            }
        ]
    }
}
```

---

## 7. Frontend Language Selection

### How User Selects Language:

**Location:** `app.js` - AssetManager class

```javascript
// User clicks language selector
setLanguage(trigraph) {
    this.currentLanguage = this.languages.find(l =>
        l.trigraph.toLowerCase() === trigraph.toLowerCase()
    );

    // For v4.0 manifest
    if (this.manifest.cards && typeof this.manifest.cards === 'object') {
        this.cards = this.manifest.cards[trigraph] || [];
    } else {
        // v3.x: All cards in one array
        this.cards = this.manifest.cards || [];
    }
}
```

### enrichCard() Extracts Language-Specific Data:

**For v4.0 cards:**
```javascript
enrichCard(card) {
    const trigraph = this.currentLanguage?.trigraph?.toLowerCase() || 'ceb';

    // Card already has language-specific data
    return {
        word: card.word,        // Already in selected language
        english: card.english,  // English translation
        audioPath: card.audio,  // Audio for this language
        // ...
    };
}
```

**For v3.x cards:**
```javascript
enrichCard(card) {
    const learningLangKey = this.currentLanguage?.trigraph?.toLowerCase(); // 'ceb', 'mrw', 'sin'
    const learningLangName = this.getLangKeyFromTrigraph(learningLangKey); // 'cebuano', 'maranao', 'sinama'

    const primaryTranslation = card.translations[learningLangName];

    return {
        word: primaryTranslation?.word || '',      // Word in selected language
        english: card.translations.english?.word,  // English translation
        audioPath: card.audio[learningLangKey],    // Audio for this language
        // ...
    };
}
```

---

## 8. How Different Languages Share Resources

### What's SHARED Across Languages:
- **Card Number:** Same card can have words in multiple languages
- **Images:** Same image used for all language versions of a card
- **Grammar/Category Metadata:** Shared metadata (lesson, type, grammar, etc.)
- **English Translation:** Reference language

### What's UNIQUE Per Language:
- **Word:** The actual word in that language
- **Word Note:** Language-specific notes
- **Acceptable Answers:** Variants in that language
- **Audio:** Separate audio files per language

### Example: Card #12

**Shared:**
- Image: `12.Ako.I.png`
- Lesson: 1
- Grammar: Pronoun
- English: "I/me"

**Language-Specific:**

| Language | Word | Audio Files |
|----------|------|-------------|
| Cebuano | Ako/ko | 12.ceb.ako.m4a, 12.ceb.ko.m4a |
| Maranao | Saken | 12.mrw.saken.m4a |
| Sinama | Aku | 12.sin.aku.m4a |
| English | I/me | 12.eng.i.m4a (optional) |

---

## 9. Solutions to Enable Maranao and Sinama

### Option 1: Create Separate CSV Files (Recommended)

Split `Word_List.csv` into language-specific files:

**Script to Generate:**
```php
<?php
// Split master CSV into per-language files
$master = 'assets/Word_List.csv';
$file = fopen($master, 'r');
$headers = fgetcsv($file);

$outputs = [
    'ceb' => fopen('assets/Word_List_Cebuano.csv', 'w'),
    'mrw' => fopen('assets/Word_List_Maranao.csv', 'w'),
    'sin' => fopen('assets/Word_List_Sinama.csv', 'w')
];

// Write headers to each file
$newHeaders = ['Lesson #','Card #','Word','Word Note','English','English Note','Grammar','Category','Sub-Category 1','Sub-Category 2','ACTFL Est.','Type'];
foreach ($outputs as $fp) {
    fputcsv($fp, $newHeaders);
}

while (($row = fgetcsv($file)) !== false) {
    // Cebuano row (columns 2, 3, 4, 5 + metadata)
    $cebRow = [
        $row[0],  // Lesson
        $row[1],  // Card #
        $row[2],  // Cebuano word
        $row[4],  // Cebuano note
        $row[3],  // English
        $row[5],  // English note
        $row[10], // Grammar
        $row[11], // Category
        $row[12], // Sub-Category 1
        $row[13], // Sub-Category 2
        $row[14], // ACTFL Est.
        $row[15]  // Type
    ];
    fputcsv($outputs['ceb'], $cebRow);

    // Maranao row (columns 6, 7, 3, 5 + metadata)
    if (!empty($row[6])) {  // Only if Maranao word exists
        $mrwRow = [
            $row[0],  // Lesson
            $row[1],  // Card #
            $row[6],  // Maranao word
            $row[7],  // Maranao note
            $row[3],  // English
            $row[5],  // English note
            $row[10], // Grammar
            $row[11], // Category
            $row[12], // Sub-Category 1
            $row[13], // Sub-Category 2
            $row[14], // ACTFL Est.
            $row[15]  // Type
        ];
        fputcsv($outputs['mrw'], $mrwRow);
    }

    // Sinama row (columns 8, 9, 3, 5 + metadata)
    if (!empty($row[8])) {  // Only if Sinama word exists
        $sinRow = [
            $row[0],  // Lesson
            $row[1],  // Card #
            $row[8],  // Sinama word
            $row[9],  // Sinama note
            $row[3],  // English
            $row[5],  // English note
            $row[10], // Grammar
            $row[11], // Category
            $row[12], // Sub-Category 1
            $row[13], // Sub-Category 2
            $row[14], // ACTFL Est.
            $row[15]  // Type
        ];
        fputcsv($outputs['sin'], $sinRow);
    }
}

foreach ($outputs as $fp) {
    fclose($fp);
}
fclose($file);
?>
```

### Option 2: Modify scan-assets.php to Read Master CSV

Update `loadLanguageWordList()` to accept language parameter and extract the correct columns:

```php
function loadLanguageWordList($path, $trigraph) {
    // Column mapping for master CSV
    $columnMap = [
        'ceb' => ['word' => 2, 'note' => 4],
        'mrw' => ['word' => 6, 'note' => 7],
        'sin' => ['word' => 8, 'note' => 9]
    ];

    if (!isset($columnMap[$trigraph])) return [];

    $wordCol = $columnMap[$trigraph]['word'];
    $noteCol = $columnMap[$trigraph]['note'];

    // ... rest of parsing logic using $wordCol and $noteCol
}
```

---

## 10. Summary

### Current Architecture:
- **4 languages defined:** Cebuano, English, Maranao, Sinama
- **Separate CSV files expected** per language
- **Master CSV exists** but wrong format
- **Only Cebuano imported** currently
- **Audio files** use trigraph in filename to distinguish languages
- **Manifest v4.0** has per-language card arrays

### Multi-Variant Audio Applies to ALL Languages:
- Cebuano: "Ako/ko" → 12.ceb.ako.m4a, 12.ceb.ko.m4a
- Maranao: "Word1/Word2" → 12.mrw.word1.m4a, 12.mrw.word2.m4a
- Sinama: "Word1/Word2" → 12.sin.word1.m4a, 12.sin.word2.m4a

### To Enable All Languages:
1. Split master CSV into per-language files, OR
2. Modify scan-assets.php to parse master CSV format

---

**Document Created:** 2025-11-20
**Repository:** `/home/user/WSOL`
**Branch:** `claude/research-manifest-modules-015Pg5imKqapV6sQ6o5gyNq9`
