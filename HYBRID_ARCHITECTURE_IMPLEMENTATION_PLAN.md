# Hybrid A+B Architecture Implementation Plan

## Overview

This plan migrates WSOL from a monolithic `manifest.json` (610KB) to a segmented Hybrid A+B architecture with reorganized media directories. The implementation is designed to be **incremental and reversible** at each phase.

---

## Target Architecture

### Directory Structure (After Migration)

```
assets/
├── data/                                    # NEW: Segmented JSON data
│   ├── manifest-index.json                  # ~10KB - loads FIRST
│   ├── languages/
│   │   ├── ceb/
│   │   │   ├── index.json                   # ~2KB - lang metadata
│   │   │   ├── lessons-001-004.json         # ~15KB per chunk
│   │   │   ├── lessons-005-008.json
│   │   │   ├── lessons-009-012.json
│   │   │   ├── ...
│   │   │   ├── sentences.json
│   │   │   └── grammar.json
│   │   ├── mrw/
│   │   │   └── [same structure]
│   │   └── sin/
│   │       └── [same structure]
│   └── shared/
│       └── images.json                      # ~30KB - image registry
│
├── audio/                                   # NEW: Reorganized audio
│   ├── ceb/
│   │   ├── 0001-0100/
│   │   │   ├── 0001.asa.m4a
│   │   │   ├── 0002.unsa.m4a
│   │   │   └── ...
│   │   ├── 0101-0200/
│   │   └── ...
│   ├── mrw/
│   └── sin/
│
├── images/                                  # NEW: Reorganized images
│   ├── webp/
│   │   ├── 0001-0100/
│   │   │   ├── 0001.asa.where.webp
│   │   │   └── ...
│   │   └── ...
│   └── png/
│       └── [same structure]
│
├── grammar/                                 # UNCHANGED
├── teacher-guide/                           # UNCHANGED
├── vendor/                                  # UNCHANGED
│
└── manifest.json                            # DEPRECATED (kept for rollback)
```

### File Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Audio | `{paddedCardNum}.{normalizedWord}.m4a` | `0001.asa.m4a` |
| Image (webp) | `{paddedCardNum}.{normalizedWord}.{normalizedEnglish}.webp` | `0001.asa.where.webp` |
| Image (png) | `{paddedCardNum}.{normalizedWord}.{normalizedEnglish}.png` | `0001.asa.where.png` |

**Normalization rules:**
- Lowercase
- Spaces → hyphens
- Remove apostrophes
- Keep only alphanumeric + hyphens

---

## Implementation Phases

### Phase 0: Preparation (1-2 hours)
**Goal:** Set up safety nets before any changes

| Task | Description | Files |
|------|-------------|-------|
| 0.1 | Create git branch `feature/hybrid-architecture` | - |
| 0.2 | Backup current manifest.json | `assets/manifest.json` → `assets/manifest.backup.json` |
| 0.3 | Document current file counts and checksums | Create `migration-baseline.json` |
| 0.4 | Create rollback script | `rollback-migration.php` |

**Deliverables:**
- [ ] Feature branch created
- [ ] Backup files in place
- [ ] Baseline documented
- [ ] Rollback script ready

---

### Phase 1: Create New Directory Structure (1 hour)
**Goal:** Create empty directory structure without moving files

| Task | Description |
|------|-------------|
| 1.1 | Create `assets/data/` directory |
| 1.2 | Create `assets/data/languages/{ceb,mrw,sin}/` directories |
| 1.3 | Create `assets/data/shared/` directory |
| 1.4 | Create `assets/audio/{ceb,mrw,sin}/` directories |
| 1.5 | Create bucket subdirectories (0001-0100, 0101-0200, etc.) |
| 1.6 | Create `assets/images/{webp,png}/` with bucket subdirs |

**Script:** `create-directory-structure.php`

```php
<?php
// create-directory-structure.php
$base = __DIR__ . '/assets';
$languages = ['ceb', 'mrw', 'sin'];
$buckets = ['0001-0100', '0101-0200', '0201-0300', '0301-0400', '0401-0500',
            '0501-0600', '0601-0700', '0701-0800', '0801-0900', '0901-1000',
            '1001-1100', '1101-1200', '1201-1300', '1301-1400', '1401-1500',
            '1501-1600', '1601-1700', '1701-1800', '1801-1900', '1901-2000'];

// Data directories
@mkdir("$base/data/shared", 0755, true);
foreach ($languages as $lang) {
    @mkdir("$base/data/languages/$lang", 0755, true);
    @mkdir("$base/audio/$lang", 0755, true);
}

// Bucket directories for audio
foreach ($languages as $lang) {
    foreach ($buckets as $bucket) {
        @mkdir("$base/audio/$lang/$bucket", 0755, true);
    }
}

// Image directories
foreach (['webp', 'png'] as $format) {
    foreach ($buckets as $bucket) {
        @mkdir("$base/images/$format/$bucket", 0755, true);
    }
}

echo "Directory structure created.\n";
```

**Deliverables:**
- [ ] All directories created
- [ ] Verified with `find assets/data -type d | wc -l`

---

### Phase 2: Generate Segmented Manifest Files (2-3 hours)
**Goal:** Split monolithic manifest.json into segment files

| Task | Description | Output File |
|------|-------------|-------------|
| 2.1 | Generate manifest-index.json | `assets/data/manifest-index.json` |
| 2.2 | Generate language index files | `assets/data/languages/{lang}/index.json` |
| 2.3 | Generate lesson chunk files | `assets/data/languages/{lang}/lessons-XXX-XXX.json` |
| 2.4 | Generate shared images registry | `assets/data/shared/images.json` |
| 2.5 | Extract sentences data | `assets/data/languages/{lang}/sentences.json` |
| 2.6 | Extract grammar mappings | `assets/data/languages/{lang}/grammar.json` |

**Script:** `generate-segmented-manifest.php`

**manifest-index.json structure:**
```json
{
  "version": "5.0",
  "schemaVersion": "5.0.0",
  "lastUpdated": "2025-11-27T...",
  "languages": [
    { "id": 1, "name": "Cebuano", "trigraph": "ceb" },
    { "id": 2, "name": "English", "trigraph": "eng" },
    { "id": 3, "name": "Maranao", "trigraph": "mrw" },
    { "id": 4, "name": "Sinama", "trigraph": "sin" }
  ],
  "stats": {
    "totalCards": 625,
    "cardsWithAudio": 264,
    "totalImages": 209
  },
  "features": {
    "sentenceBuilder": { "enabled": true },
    "voicePractice": { "enabled": true },
    "grammar": { "enabled": true }
  },
  "dataVersion": 1
}
```

**Language index.json structure:**
```json
{
  "chunkVersion": 1,
  "lastModified": "2025-11-27T...",
  "trigraph": "ceb",
  "stats": {
    "totalCards": 208,
    "cardsWithAudio": 60
  },
  "lessonChunks": [
    { "file": "lessons-001-004.json", "lessons": [1,2,3,4], "cardCount": 42 },
    { "file": "lessons-005-008.json", "lessons": [5,6,7,8], "cardCount": 40 }
  ],
  "lessonMeta": {
    "4": { "type": "review", "reviewsLessons": [1, 2, 3] },
    "8": { "type": "review", "reviewsLessons": [5, 6, 7] }
  },
  "hasSentences": true,
  "hasGrammar": true
}
```

**Lesson chunk structure:**
```json
{
  "chunkVersion": 1,
  "lastModified": "2025-11-27T...",
  "lessons": [1, 2, 3, 4],
  "cards": [
    {
      "lesson": 1,
      "cardNum": 1,
      "word": "Asa",
      "wordNote": "",
      "english": "Where",
      "englishNote": "",
      "cebuano": "Asa",
      "cebuanoNote": "",
      "grammar": "Interrogative",
      "category": "Function Word",
      "subCategory1": "Question Word",
      "subCategory2": "Question Word",
      "actflEst": "Novice-Mid",
      "type": "N",
      "acceptableAnswers": ["Asa"],
      "englishAcceptable": ["Where"],
      "cebuanoAcceptable": ["Asa"],
      "hasAudio": true,
      "hasGif": false
    }
  ]
}
```

**Deliverables:**
- [ ] `manifest-index.json` generated
- [ ] All language `index.json` files generated
- [ ] All lesson chunk files generated
- [ ] `images.json` generated
- [ ] Sentence/grammar files extracted
- [ ] Validation: Total cards across chunks equals original

---

### Phase 3: Update AssetManager for Lazy Loading (3-4 hours)
**Goal:** Modify app.js to support both old and new manifest formats

| Task | Description |
|------|-------------|
| 3.1 | Add manifest version detection (v4.0 vs v5.0) |
| 3.2 | Implement lazy loading for language index |
| 3.3 | Implement lazy loading for lesson chunks |
| 3.4 | Add chunk caching in memory |
| 3.5 | Update path derivation methods |
| 3.6 | Add fallback to v4.0 manifest |
| 3.7 | Update `setLanguage()` method |
| 3.8 | Update `setLesson()` method |
| 3.9 | Update `getCards()` method |

**Key code changes in `app.js`:**

```javascript
class AssetManager {
    constructor() {
        this.manifestIndex = null;      // NEW: v5.0 index
        this.manifest = null;           // KEEP: v4.0 fallback
        this.languageIndexes = {};      // NEW: Cached language indexes
        this.lessonChunks = {};         // NEW: Cached lesson chunks
        this.imagesRegistry = null;     // NEW: Shared images
        this.cards = [];
        this.languages = [];
        this.lessons = [];
        this.currentLanguage = null;
        this.currentLesson = null;
        this.imageUrls = new Map();
        this.audioUrls = new Map();
        this.isV5 = false;              // NEW: Version flag
    }

    async loadManifest() {
        // Try v5.0 first, fall back to v4.0
        try {
            const indexResponse = await fetch('assets/data/manifest-index.json?v=' + Date.now());
            if (indexResponse.ok) {
                this.manifestIndex = await indexResponse.json();
                if (this.manifestIndex.version === '5.0') {
                    this.isV5 = true;
                    this.languages = this.manifestIndex.languages || [];
                    debugLogger.log(2, 'Loaded v5.0 manifest index');
                    this.populateLanguageSelector();
                    return;
                }
            }
        } catch (e) {
            debugLogger.log(2, 'v5.0 index not found, falling back to v4.0');
        }

        // Fallback to v4.0
        await this.loadManifestV4();
    }

    async loadLanguageIndex(trigraph) {
        if (this.languageIndexes[trigraph]) {
            return this.languageIndexes[trigraph];
        }

        const response = await fetch(`assets/data/languages/${trigraph}/index.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to load language index for ${trigraph}`);

        this.languageIndexes[trigraph] = await response.json();
        return this.languageIndexes[trigraph];
    }

    async loadLessonChunk(trigraph, lessonNum) {
        const langIndex = await this.loadLanguageIndex(trigraph);

        // Find which chunk contains this lesson
        const chunkInfo = langIndex.lessonChunks.find(c => c.lessons.includes(lessonNum));
        if (!chunkInfo) throw new Error(`No chunk found for lesson ${lessonNum}`);

        const cacheKey = `${trigraph}:${chunkInfo.file}`;
        if (this.lessonChunks[cacheKey]) {
            return this.lessonChunks[cacheKey];
        }

        const response = await fetch(`assets/data/languages/${trigraph}/${chunkInfo.file}?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to load chunk ${chunkInfo.file}`);

        this.lessonChunks[cacheKey] = await response.json();
        return this.lessonChunks[cacheKey];
    }

    // Path derivation methods
    normalizeWord(word) {
        return word
            .toLowerCase()
            .replace(/'/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
    }

    getBucket(cardNum) {
        const start = Math.floor((cardNum - 1) / 100) * 100 + 1;
        const end = start + 99;
        return `${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`;
    }

    getAudioPath(cardNum, language, word) {
        if (!this.isV5) {
            // V4 path format
            return `assets/${cardNum}.${language}.${this.normalizeWord(word)}.m4a`;
        }
        const bucket = this.getBucket(cardNum);
        const paddedNum = String(cardNum).padStart(4, '0');
        return `assets/audio/${language}/${bucket}/${paddedNum}.${this.normalizeWord(word)}.m4a`;
    }

    getImagePath(cardNum, word, english, format = 'webp') {
        if (!this.isV5) {
            // V4 path format
            return `assets/${cardNum}.${word}.${english}.${format}`;
        }
        const bucket = this.getBucket(cardNum);
        const paddedNum = String(cardNum).padStart(4, '0');
        const normWord = this.normalizeWord(word);
        const normEng = this.normalizeWord(english);
        return `assets/images/${format}/${bucket}/${paddedNum}.${normWord}.${normEng}.${format}`;
    }
}
```

**Deliverables:**
- [ ] AssetManager supports v5.0 format
- [ ] Lazy loading working for language indexes
- [ ] Lazy loading working for lesson chunks
- [ ] Chunk caching implemented
- [ ] Path derivation methods added
- [ ] v4.0 fallback working
- [ ] All existing modules still work

---

### Phase 4: Migrate Audio Files (2-3 hours)
**Goal:** Move and rename audio files to new structure

| Task | Description |
|------|-------------|
| 4.1 | Create migration mapping from old → new paths |
| 4.2 | Copy files to new locations (don't delete originals yet) |
| 4.3 | Verify all files copied correctly |
| 4.4 | Update manifest chunks with new paths |
| 4.5 | Test audio playback |

**Script:** `migrate-audio-files.php`

```php
<?php
// migrate-audio-files.php

$assetsDir = __DIR__ . '/assets';
$manifest = json_decode(file_get_contents("$assetsDir/manifest.json"), true);

$migrationLog = [];

foreach ($manifest['cards'] as $trigraph => $cards) {
    foreach ($cards as $card) {
        if (empty($card['audio'])) continue;

        foreach ($card['audio'] as $oldPath) {
            if (!file_exists(__DIR__ . '/' . $oldPath)) continue;

            $cardNum = $card['cardNum'];
            $word = normalizeWord($card['word']);
            $bucket = getBucket($cardNum);
            $paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);

            $newPath = "assets/audio/$trigraph/$bucket/$paddedNum.$word.m4a";

            // Copy file
            $newFullPath = __DIR__ . '/' . $newPath;
            if (!file_exists($newFullPath)) {
                copy(__DIR__ . '/' . $oldPath, $newFullPath);
            }

            $migrationLog[] = [
                'cardNum' => $cardNum,
                'old' => $oldPath,
                'new' => $newPath,
                'status' => file_exists($newFullPath) ? 'success' : 'failed'
            ];
        }
    }
}

file_put_contents("$assetsDir/audio-migration-log.json", json_encode($migrationLog, JSON_PRETTY_PRINT));
echo "Audio migration complete. See audio-migration-log.json for details.\n";

function normalizeWord($word) {
    $word = strtolower($word);
    $word = str_replace("'", '', $word);
    $word = preg_replace('/\s+/', '-', $word);
    $word = preg_replace('/[^a-z0-9-]/', '', $word);
    return $word;
}

function getBucket($cardNum) {
    $start = floor(($cardNum - 1) / 100) * 100 + 1;
    $end = $start + 99;
    return str_pad($start, 4, '0', STR_PAD_LEFT) . '-' . str_pad($end, 4, '0', STR_PAD_LEFT);
}
```

**Deliverables:**
- [ ] All audio files copied to new locations
- [ ] Migration log created
- [ ] Audio playback verified
- [ ] No broken audio links

---

### Phase 5: Migrate Image Files (2-3 hours)
**Goal:** Move and rename image files to new structure

| Task | Description |
|------|-------------|
| 5.1 | Create migration mapping for images |
| 5.2 | Copy WebP files to new locations |
| 5.3 | Copy PNG files to new locations |
| 5.4 | Handle GIF/WebM files |
| 5.5 | Update images.json registry |
| 5.6 | Test image display |

**Script:** `migrate-image-files.php`

**Deliverables:**
- [ ] All image files copied to new locations
- [ ] images.json registry accurate
- [ ] Image display verified in all modules
- [ ] No broken image links

---

### Phase 6: Update PHP Backend (3-4 hours)
**Goal:** Modify PHP files to read/write segmented manifests

| Task | File | Description |
|------|------|-------------|
| 6.1 | `scan-assets.php` | Generate segmented files instead of monolithic |
| 6.2 | `save-deck.php` | Save to appropriate chunk file |
| 6.3 | `upload-audio.php` | Save to new directory structure |
| 6.4 | `upload-media.php` | Save to new directory structure |
| 6.5 | `list-assets.php` | Support new directory structure |

**save-deck.php changes:**

```php
<?php
// Key changes for save-deck.php

function saveToChunk($trigraph, $cards, $lessonMeta) {
    $dataDir = __DIR__ . '/assets/data/languages/' . $trigraph;

    // Load language index
    $indexPath = "$dataDir/index.json";
    $index = json_decode(file_get_contents($indexPath), true);

    // Group cards by lesson chunk
    $cardsByChunk = [];
    foreach ($cards as $card) {
        $chunkFile = getChunkForLesson($index, $card['lesson']);
        if (!isset($cardsByChunk[$chunkFile])) {
            $cardsByChunk[$chunkFile] = [];
        }
        $cardsByChunk[$chunkFile][] = $card;
    }

    // Update each affected chunk
    foreach ($cardsByChunk as $chunkFile => $chunkCards) {
        $chunkPath = "$dataDir/$chunkFile";
        $chunk = json_decode(file_get_contents($chunkPath), true);

        // Increment version for optimistic locking
        $chunk['chunkVersion'] = ($chunk['chunkVersion'] ?? 0) + 1;
        $chunk['lastModified'] = date('c');

        // Update cards in chunk
        foreach ($chunkCards as $newCard) {
            $found = false;
            foreach ($chunk['cards'] as &$existingCard) {
                if ($existingCard['cardNum'] === $newCard['cardNum']) {
                    $existingCard = $newCard;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $chunk['cards'][] = $newCard;
            }
        }

        // Save chunk
        file_put_contents($chunkPath, json_encode($chunk, JSON_PRETTY_PRINT));
    }

    // Update language index stats
    updateLanguageIndex($trigraph);

    // Update manifest-index stats
    updateManifestIndex();
}

function getChunkForLesson($index, $lesson) {
    foreach ($index['lessonChunks'] as $chunk) {
        if (in_array($lesson, $chunk['lessons'])) {
            return $chunk['file'];
        }
    }
    // Create new chunk if needed
    return createNewChunk($index, $lesson);
}
```

**Deliverables:**
- [ ] scan-assets.php generates segmented files
- [ ] save-deck.php writes to correct chunks
- [ ] upload-audio.php uses new paths
- [ ] upload-media.php uses new paths
- [ ] All CRUD operations working

---

### Phase 7: Update Remaining Modules (2-3 hours)
**Goal:** Ensure all modules work with new architecture

| Task | Module | Changes Needed |
|------|--------|----------------|
| 7.1 | Flashcards | Test with lazy-loaded cards |
| 7.2 | Match | Test with lazy-loaded cards |
| 7.3 | Match Sound | Test audio path derivation |
| 7.4 | Quiz | Test with lazy-loaded cards |
| 7.5 | Sentence Builder | Load sentences.json on demand |
| 7.6 | Sentence Review | Load sentences.json on demand |
| 7.7 | Grammar | Load grammar.json on demand |
| 7.8 | Deck Builder | Test save/load with chunks |
| 7.9 | Voice Practice | Test audio paths |
| 7.10 | PDF | Test image paths |

**Deliverables:**
- [ ] All modules tested and working
- [ ] No console errors
- [ ] Performance verified (faster initial load)

---

### Phase 8: Cleanup and Documentation (1-2 hours)
**Goal:** Remove deprecated files and document changes

| Task | Description |
|------|-------------|
| 8.1 | Archive old audio files (don't delete yet) |
| 8.2 | Archive old image files (don't delete yet) |
| 8.3 | Update README.md |
| 8.4 | Document new file structure |
| 8.5 | Create developer migration guide |
| 8.6 | Update AI_DEVELOPER_GUIDE.md |

**Deliverables:**
- [ ] Old files archived (not deleted)
- [ ] Documentation updated
- [ ] Migration guide created

---

### Phase 9: Testing and Validation (2-3 hours)
**Goal:** Comprehensive testing before production deployment

| Test | Description |
|------|-------------|
| 9.1 | Load time comparison (v4 vs v5) |
| 9.2 | All language selection working |
| 9.3 | All lesson selection working |
| 9.4 | Review lessons pulling correct cards |
| 9.5 | Audio playback in all modules |
| 9.6 | Image display in all modules |
| 9.7 | Deck builder save/load |
| 9.8 | Sentence builder functionality |
| 9.9 | Mobile device testing |
| 9.10 | Offline capability check |

**Deliverables:**
- [ ] Performance benchmarks documented
- [ ] All tests passing
- [ ] Ready for production

---

### Phase 10: Production Deployment (1 hour)
**Goal:** Deploy to production with rollback plan

| Task | Description |
|------|-------------|
| 10.1 | Create production backup |
| 10.2 | Deploy new code |
| 10.3 | Deploy new data files |
| 10.4 | Deploy new media structure |
| 10.5 | Verify production functionality |
| 10.6 | Monitor for errors |

**Rollback procedure:**
1. Restore `manifest.json` from backup
2. Revert app.js to previous version
3. Revert PHP files to previous versions
4. (Media files don't need rollback - old paths still exist)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Keep all originals, copy don't move |
| Broken links | Validate all paths before and after |
| Module incompatibility | Test each module independently |
| Performance regression | Benchmark before/after |
| Multi-user conflicts | Implement chunkVersion optimistic locking |

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 0: Preparation | 1-2 hours |
| Phase 1: Directory Structure | 1 hour |
| Phase 2: Generate Segments | 2-3 hours |
| Phase 3: AssetManager Update | 3-4 hours |
| Phase 4: Audio Migration | 2-3 hours |
| Phase 5: Image Migration | 2-3 hours |
| Phase 6: PHP Backend | 3-4 hours |
| Phase 7: Module Updates | 2-3 hours |
| Phase 8: Cleanup & Docs | 1-2 hours |
| Phase 9: Testing | 2-3 hours |
| Phase 10: Deployment | 1 hour |
| **Total** | **20-29 hours** |

---

## Success Criteria

1. **Initial load time reduced by 60%+** (10KB vs 610KB)
2. **All existing functionality preserved**
3. **Audio/image paths work correctly**
4. **Deck builder save/load works with chunks**
5. **Review lessons still aggregate correctly**
6. **No data loss**
7. **Clean rollback path available**

---

## Files to Create

| File | Purpose |
|------|---------|
| `create-directory-structure.php` | Phase 1 - Create directories |
| `generate-segmented-manifest.php` | Phase 2 - Split manifest |
| `migrate-audio-files.php` | Phase 4 - Move audio |
| `migrate-image-files.php` | Phase 5 - Move images |
| `validate-migration.php` | Phase 9 - Verify integrity |
| `rollback-migration.php` | Rollback if needed |

---

## Files to Modify

| File | Changes |
|------|---------|
| `app.js` | AssetManager lazy loading + path derivation |
| `scan-assets.php` | Generate segmented files |
| `save-deck.php` | Save to chunk files |
| `upload-audio.php` | New directory paths |
| `upload-media.php` | New directory paths |
| `list-assets.php` | Support new structure |
| `index.php` | Update MANIFEST_VERSION handling |

---

## Questions to Resolve Before Starting

1. **Chunk size:** Stay with 4-lesson chunks or adjust?
2. **Old files:** Archive to `_archive/` or delete after validation?
3. **v4 compatibility period:** How long to maintain dual support?
4. **Optimistic locking:** Implement in Phase 6 or defer?
