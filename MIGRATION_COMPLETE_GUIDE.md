# WSOL Hybrid A+B Migration - Complete Guide

**Document Created:** November 27, 2025
**Status:** Ready to Execute
**Branch:** `claude/review-language-structure-01E9h7anF75XCtc7MYVW9n1f`

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current State](#2-current-state)
3. [Target State](#3-target-state)
4. [What Has Been Completed](#4-what-has-been-completed)
5. [Migration Execution Steps](#5-migration-execution-steps)
6. [Code Updates Required](#6-code-updates-required)
7. [File Reference](#7-file-reference)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Problem Statement

### The Challenge

The WSOL platform is designed to scale to **1,500-2,000 words per language** across **3+ languages**, each with audio files. The current architecture has two critical scalability problems:

#### Problem A: Monolithic Manifest
- Current `manifest.json` is **610KB** with 19,331 lines
- At scale: **6MB+** file that must be loaded entirely on every page visit
- Every save rewrites the entire file (conflict risk with multiple editors)

#### Problem B: Flat Directory Structure
- All files in single `/assets/` folder
- Current: ~30 files, manageable
- At scale: **6,000+ audio files + 4,000+ images** in one directory
- Filesystem performance degrades, impossible to navigate

### The Solution: Hybrid A+B Architecture

Combines two strategies:
- **Option A (Language Segmentation):** Separate data files per language
- **Option B (Lesson Chunking):** Group lessons into ~15KB chunk files

Result: Initial load drops from 610KB to ~10KB, with data loaded on-demand.

---

## 2. Current State

### Directory Structure (Before Migration)

```
assets/
├── manifest.json                    # 610KB monolithic file
├── 1.ceb.asa.m4a                   # Audio: flat, mixed naming
├── 2.ceb.unsa.m4a
├── 1.Asa.Where.png                 # Images: flat, mixed naming
├── 1.Asa.Where.webp
├── 2.Unsa.What.png
├── Word_List_Cebuano.csv           # Source CSVs (import only)
├── Word_List_Maranao.csv
├── Word_List_Sinama.csv
├── grammar/ceb/lesson-1.html       # Grammar files (keep as-is)
├── teacher-guide/                  # Teacher guides (keep as-is)
└── vendor/                         # Third-party libs (keep as-is)
```

### File Naming (Current)

| Type | Pattern | Example |
|------|---------|---------|
| Audio | `{cardNum}.{lang}.{word}.m4a` | `1.ceb.asa.m4a` |
| Images | `{cardNum}.{Word}.{English}.{ext}` | `1.Asa.Where.webp` |

### Manifest Structure (Current v4.0)

```json
{
  "version": "4.0",
  "lastUpdated": "2025-11-26T...",
  "languages": [...],
  "images": { "1": { "png": "assets/1.Asa.Where.png", ... } },
  "cards": {
    "ceb": [ { "cardNum": 1, "word": "Asa", "audio": ["assets/1.ceb.asa.m4a"], ... } ],
    "mrw": [...],
    "sin": [...]
  },
  "sentenceWords": { "ceb": { "1": {...}, "2": {...} } },
  "lessonMeta": { "ceb": { "4": { "type": "review", "reviewsLessons": [1,2,3] } } },
  "sentenceReview": { "ceb": { "lessons": {...} } },
  "grammar": { "ceb": { "1": "lesson-1.html" } },
  "stats": {...}
}
```

### Statistics (Current)

| Metric | Value |
|--------|-------|
| Total cards | 625 |
| Languages with cards | 3 (ceb, mrw, sin) |
| Audio files | 264 (mostly mrw) |
| Image entries | 209 |
| Manifest size | 610KB |

---

## 3. Target State

### Directory Structure (After Migration)

```
assets/
├── data/                                    # NEW: Segmented JSON data
│   ├── manifest-index.json                  # ~10KB master index
│   ├── shared/
│   │   └── images.json                      # ~30KB image registry
│   └── languages/
│       ├── ceb/
│       │   ├── index.json                   # ~2KB language metadata
│       │   ├── lessons-001-004.json         # ~15KB lesson chunks
│       │   ├── lessons-005-008.json
│       │   ├── lessons-009-012.json
│       │   ├── sentences.json               # Sentence builder data
│       │   ├── sentence-review.json         # Sentence review data
│       │   └── grammar.json                 # Grammar file mappings
│       ├── mrw/
│       │   └── [same structure]
│       └── sin/
│           └── [same structure]
│
├── audio/                                   # NEW: Organized by language + bucket
│   ├── ceb/
│   │   ├── 0001-0100/
│   │   │   ├── 0001.asa.m4a
│   │   │   ├── 0002.unsa.m4a
│   │   │   └── ...
│   │   ├── 0101-0200/
│   │   └── ...
│   ├── mrw/
│   │   └── [same structure]
│   └── sin/
│       └── [same structure]
│
├── images/                                  # NEW: Organized by format + bucket
│   ├── webp/
│   │   ├── 0001-0100/
│   │   │   ├── 0001.asa.where.webp
│   │   │   ├── 0002.unsa.what.webp
│   │   │   └── ...
│   │   └── ...
│   └── png/
│       └── [same structure]
│
├── manifest.json                            # KEPT: For rollback/v4 fallback
├── grammar/                                 # UNCHANGED
├── teacher-guide/                           # UNCHANGED
└── vendor/                                  # UNCHANGED
```

### File Naming (After Migration)

| Type | Pattern | Example |
|------|---------|---------|
| Audio | `{4-digit-cardNum}.{normalized-word}.m4a` | `0001.asa.m4a` |
| Images | `{4-digit-cardNum}.{normalized-word}.{normalized-english}.{ext}` | `0001.asa.where.webp` |

**Normalization rules:**
- Lowercase everything
- Remove apostrophes (`'`)
- Replace spaces with hyphens
- Remove other special characters
- Example: `"Maayong Adlaw"` → `maayong-adlaw`

### Manifest Structure (Target v5.0)

**manifest-index.json** (~10KB) - Loads immediately:
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
  "stats": { "totalCards": 625, "cardsWithAudio": 264, "totalImages": 209 },
  "features": {
    "sentenceBuilder": { "enabled": true },
    "voicePractice": { "enabled": true },
    "grammar": { "enabled": true }
  },
  "dataVersion": 1
}
```

**languages/ceb/index.json** (~2KB) - Loads on language selection:
```json
{
  "chunkVersion": 1,
  "lastModified": "2025-11-27T...",
  "trigraph": "ceb",
  "stats": { "totalCards": 208, "cardsWithAudio": 60 },
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

**languages/ceb/lessons-001-004.json** (~15KB) - Loads on lesson selection:
```json
{
  "chunkVersion": 1,
  "lastModified": "2025-11-27T...",
  "trigraph": "ceb",
  "lessons": [1, 2, 3, 4],
  "cards": [
    {
      "lesson": 1,
      "cardNum": 1,
      "word": "Asa",
      "english": "Where",
      "grammar": "Interrogative",
      "category": "Function Word",
      "hasAudio": true,
      "hasGif": false
    }
  ]
}
```

Note: Cards no longer store full file paths. Paths are **derived** from cardNum + word using the AssetManager.

---

## 4. What Has Been Completed

### Documents Created

| File | Purpose |
|------|---------|
| `HYBRID_ARCHITECTURE_IMPLEMENTATION_PLAN.md` | Detailed 10-phase implementation plan |
| `MIGRATION_COMPLETE_GUIDE.md` | This document |

### Scripts Created (Ready to Run)

| Script | Purpose | Status |
|--------|---------|--------|
| `migrate-to-hybrid.php` | Executes the full migration | ✅ Ready |
| `validate-migration.php` | Validates migration success | ✅ Ready |

### What the Migration Script Does

1. **Creates directory structure** - All new folders for data/audio/images
2. **Copies audio files** - To new locations with new naming (originals preserved)
3. **Copies image files** - To new locations with new naming (originals preserved)
4. **Generates manifest segments** - All the v5.0 JSON files
5. **Creates migration report** - Detailed JSON log of everything done

### What Has NOT Been Done

| Task | Status |
|------|--------|
| Running the actual migration | ⏳ Pending |
| Updating `app.js` AssetManager | ⏳ Pending |
| Updating `scan-assets.php` | ⏳ Pending |
| Updating `save-deck.php` | ⏳ Pending |
| Updating upload PHP files | ⏳ Pending |
| Testing all modules | ⏳ Pending |

---

## 5. Migration Execution Steps

### Step 1: Run Migration on Non-Production Server

```bash
# Navigate to project directory
cd /path/to/WSOL

# Preview what will happen (no changes made)
php migrate-to-hybrid.php --dry-run

# Review the output, then run the actual migration
php migrate-to-hybrid.php

# Validate the migration succeeded
php validate-migration.php

# Check the detailed report
cat assets/migration-report.json
```

### Step 2: Verify Results

After running migration, you should see:

```
assets/
├── data/
│   ├── manifest-index.json          # Should exist
│   ├── shared/images.json           # Should exist
│   └── languages/
│       ├── ceb/
│       │   ├── index.json           # Should exist
│       │   ├── lessons-001-004.json # Should exist (or similar)
│       │   └── ...
│       ├── mrw/...
│       └── sin/...
├── audio/
│   ├── ceb/0001-0100/               # Should contain .m4a files
│   ├── mrw/0001-0100/
│   └── sin/0001-0100/
└── images/
    ├── webp/0001-0100/              # Should contain .webp files
    └── png/0001-0100/               # Should contain .png files
```

### Step 3: Update Application Code

After migration is validated, update these files:

1. **`app.js`** - AssetManager class needs:
   - v5.0 format detection
   - Lazy loading for language index
   - Lazy loading for lesson chunks
   - Path derivation methods (getAudioPath, getImagePath)
   - Chunk caching

2. **`scan-assets.php`** - Needs to generate segmented files instead of monolithic manifest

3. **`save-deck.php`** - Needs to save to appropriate chunk file based on lesson

4. **`upload-audio.php`** - Needs to save to new directory structure

5. **`upload-media.php`** - Needs to save to new directory structure

### Step 4: Test All Modules

Test each module to ensure it works with new architecture:

- [ ] Flashcards - Card display, audio playback, image display
- [ ] Match - Image matching game
- [ ] Match Sound - Audio matching game
- [ ] Quiz - Multiple choice quiz
- [ ] Sentence Builder - Sentence construction
- [ ] Sentence Review - Sentence practice
- [ ] Grammar - Grammar lessons
- [ ] Deck Builder - Adding/editing cards
- [ ] Voice Practice - Audio recording/comparison
- [ ] PDF Export - Image paths in generated PDFs

### Step 5: Clone to Production

Once everything is tested on non-production:

```bash
# On production server, pull the changes
git pull origin main

# Or clone fresh if preferred
git clone [repository-url]
```

---

## 6. Code Updates Required

### 6.1 AssetManager Changes (app.js)

**New properties needed:**
```javascript
constructor() {
    this.manifestIndex = null;      // v5.0 master index
    this.manifest = null;           // v4.0 fallback
    this.languageIndexes = {};      // Cached language indexes
    this.lessonChunks = {};         // Cached lesson chunks
    this.imagesRegistry = null;     // Shared images registry
    this.isV5 = false;              // Version flag
    // ... existing properties
}
```

**New methods needed:**
```javascript
// Load v5.0 index, fall back to v4.0
async loadManifest() { ... }

// Load language-specific index on demand
async loadLanguageIndex(trigraph) { ... }

// Load lesson chunk on demand
async loadLessonChunk(trigraph, lessonNum) { ... }

// Derive audio path from card data
getAudioPath(cardNum, language, word) { ... }

// Derive image path from card data
getImagePath(cardNum, word, english, format) { ... }

// Normalize word for file naming
normalizeWord(word) { ... }

// Get bucket directory name
getBucket(cardNum) { ... }
```

**Key change to `setLanguage()`:**
- Must call `loadLanguageIndex()` before accessing lessons
- Populate lesson dropdown from language index

**Key change to `setLesson()`:**
- Must call `loadLessonChunk()` before accessing cards
- Cache chunks to avoid re-fetching

**Key change to `enrichCard()`:**
- Derive paths using `getAudioPath()` and `getImagePath()` instead of reading from card data

### 6.2 scan-assets.php Changes

Instead of generating single `manifest.json`, generate:
- `data/manifest-index.json`
- `data/shared/images.json`
- `data/languages/{lang}/index.json` for each language
- `data/languages/{lang}/lessons-XXX-XXX.json` for each lesson chunk
- `data/languages/{lang}/sentences.json` if sentence data exists
- `data/languages/{lang}/grammar.json` if grammar data exists

### 6.3 save-deck.php Changes

Instead of rewriting entire `manifest.json`:
1. Determine which lesson chunk(s) contain the edited cards
2. Load only those chunk files
3. Update cards in the chunk
4. Increment `chunkVersion` for optimistic locking
5. Save only the affected chunk files
6. Update language index stats if needed
7. Update manifest-index stats if needed

### 6.4 Upload Script Changes

**upload-audio.php:**
```php
// Old path generation
$path = "assets/{$cardNum}.{$lang}.{$word}.m4a";

// New path generation
$bucket = getBucket($cardNum);  // e.g., "0001-0100"
$paddedNum = str_pad($cardNum, 4, '0', STR_PAD_LEFT);
$normalizedWord = normalizeWord($word);
$path = "assets/audio/{$lang}/{$bucket}/{$paddedNum}.{$normalizedWord}.m4a";
```

**upload-media.php:**
```php
// Similar changes for images
$path = "assets/images/{$format}/{$bucket}/{$paddedNum}.{$word}.{$english}.{$format}";
```

---

## 7. File Reference

### Scripts to Run

| File | Command | Purpose |
|------|---------|---------|
| `migrate-to-hybrid.php` | `php migrate-to-hybrid.php` | Run migration |
| `migrate-to-hybrid.php` | `php migrate-to-hybrid.php --dry-run` | Preview migration |
| `validate-migration.php` | `php validate-migration.php` | Verify migration |

### Files to Modify (After Migration)

| File | Priority | Changes |
|------|----------|---------|
| `app.js` | HIGH | AssetManager lazy loading + path derivation |
| `scan-assets.php` | HIGH | Generate segmented files |
| `save-deck.php` | HIGH | Save to chunk files |
| `upload-audio.php` | MEDIUM | New directory paths |
| `upload-media.php` | MEDIUM | New directory paths |
| `index.php` | LOW | Update manifest version handling |

### Files Generated by Migration

| File | Size | Purpose |
|------|------|---------|
| `data/manifest-index.json` | ~10KB | Master index, loads first |
| `data/shared/images.json` | ~30KB | Image format registry |
| `data/languages/{lang}/index.json` | ~2KB | Language metadata |
| `data/languages/{lang}/lessons-XXX-XXX.json` | ~15KB each | Card data by lesson group |
| `data/languages/{lang}/sentences.json` | Varies | Sentence builder data |
| `data/languages/{lang}/grammar.json` | ~1KB | Grammar file mappings |
| `migration-report.json` | Varies | Detailed migration log |

---

## 8. Rollback Plan

If something goes wrong, rollback is straightforward:

### Quick Rollback (Code Only)

If the migration ran but code updates break things:

1. The original `manifest.json` is preserved (not deleted)
2. Revert `app.js` changes to use v4.0 loading
3. App will use original manifest and original file paths
4. New directories can stay (they won't interfere)

### Full Rollback

If you need to completely undo:

```bash
# Remove new directories
rm -rf assets/data
rm -rf assets/audio
rm -rf assets/images

# Remove migration report
rm assets/migration-report.json

# Revert any code changes
git checkout -- app.js scan-assets.php save-deck.php
```

### Why Rollback is Safe

1. **Files are COPIED, not moved** - Originals remain in place
2. **manifest.json is preserved** - v4.0 data still exists
3. **Code has fallback** - AssetManager will detect v5.0 vs v4.0
4. **No database** - Just files, easy to revert

---

## Summary: What to Do Tomorrow

1. **On non-production server:**
   ```bash
   php migrate-to-hybrid.php --dry-run   # Preview
   php migrate-to-hybrid.php             # Execute
   php validate-migration.php            # Verify
   ```

2. **Request code updates** - Ask Claude to update:
   - `app.js` AssetManager for v5.0 lazy loading
   - `scan-assets.php` for segmented generation
   - `save-deck.php` for chunk-based saving

3. **Test all modules** on non-production

4. **Clone to production** when satisfied

---

## Questions?

If picking this up with a new Claude session, reference:
- This file: `MIGRATION_COMPLETE_GUIDE.md`
- Implementation details: `HYBRID_ARCHITECTURE_IMPLEMENTATION_PLAN.md`
- Migration script: `migrate-to-hybrid.php`
- Validation script: `validate-migration.php`

The branch `claude/review-language-structure-01E9h7anF75XCtc7MYVW9n1f` contains all these files.
