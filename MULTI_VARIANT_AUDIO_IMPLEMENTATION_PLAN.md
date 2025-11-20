# Multi-Variant Audio Implementation Plan
## Supporting Individual Audio Files Per Word Variant

---

## Goal
Enable cards with slash-separated words (e.g., "Ako/ko") to have separate audio files for each variant, with different behavior across modules.

---

## Current vs. New Behavior

### Audio File Naming

**Current:**
```
Card 12: "Ako/ko"
Audio: 12.ceb.ako-ko.m4a (single file)
```

**New:**
```
Card 12: "Ako/ko"
Audio 1: 12.ceb.ako.m4a
Audio 2: 12.ceb.ko.m4a
```

### Pattern
`{cardNum}.{trigraph}.{wordVariant}.{ext}`

**Example:**
- Card 12, Cebuano, variant "Ako": `12.ceb.ako.m4a`
- Card 12, Cebuano, variant "ko": `12.ceb.ko.m4a`
- Card 14, Cebuano, variant "Kini": `14.ceb.kini.m4a`
- Card 14, Cebuano, variant "ni": `14.ceb.ni.m4a`

---

## Module Behavior Changes

### 1. Flashcards Module
**Behavior:** Play all audio files **sequentially** (back-to-back)

```
Card: "Ako/ko"
Speaker Icon Click:
  1. Play "12.ceb.ako.m4a"
  2. Wait for finish
  3. Play "12.ceb.ko.m4a"
  4. Done
```

**Implementation:**
- Store array of audio paths: `["assets/12.ceb.ako.m4a", "assets/12.ceb.ko.m4a"]`
- Play using audio chain with `onended` event

---

### 2. Audio-Match Module
**Behavior:** Each variant = **separate question**

```
Card: "Ako/ko" with image "12.Ako.I.png"

Question 1:
  Play: "12.ceb.ako.m4a"
  Show Pictures: [12.Ako.I.png, other1.png, other2.png, other3.png]
  User selects: 12.Ako.I.png ✓

Question 2:
  Play: "12.ceb.ko.m4a"
  Show Pictures: [12.Ako.I.png, other4.png, other5.png, other6.png]
  User selects: 12.Ako.I.png ✓
```

**Implementation:**
- Virtual cards already exist (one per variant)
- Assign individual `audioPath` to each virtual card
- Virtual card for "Ako": `audioPath: "assets/12.ceb.ako.m4a"`
- Virtual card for "ko": `audioPath: "assets/12.ceb.ko.m4a"`

---

### 3. Match Module
**Behavior:** No changes (already uses virtual cards)

Visual matching only, no audio involved.

---

### 4. Quiz Module
**Behavior:** Play all audio files sequentially (same as Flashcards)

```
Question: "I/me"
Audio plays:
  1. "12.ceb.ako.m4a"
  2. "12.ceb.ko.m4a"
Input: [________]
Accepts: "Ako" or "ko"
```

**Implementation:**
- Similar to Flashcards: play audio array sequentially

---

### 5. Deck Builder Module
**Behavior:** Show multiple audio icons, one per variant

```
Card: "Ako/ko"

Audio Icons:
  [🔊 ako] [🔊 ko]
   ↓         ↓
  No file   No file

After linking:
  [🔊 12.ceb.ako.m4a] [🔊 12.ceb.ko.m4a]
```

**Icon Label Logic:**
- **Before file linked:** Show word variant (e.g., "ako", "ko")
- **After file linked:** Show filename (e.g., "12.ceb.ako.m4a")

**PNG/GIF Icons:**
- **After file linked:** Show filename

---

## Implementation Steps

### Step 1: scan-assets.php
**File:** `/home/user/WSOL/scan-assets.php`

**Current Audio Linking (lines 190-198):**
```php
foreach ($audioFiles as $f) {
    list($num, $trig) = extractAudioInfo($f);
    if ($num && $trig && isset($cardsMaster[$num])) {
        $path = "assets/$f";
        $cardsMaster[$num]['audio'][$trig] = $path;
        $cardsMaster[$num]['audioFiles'][$trig] = $f;
    }
}
```

**New Audio Linking:**
```php
foreach ($audioFiles as $f) {
    list($num, $trig, $wordVariant) = extractAudioInfo($f);
    if ($num && $trig && isset($cardsMaster[$num])) {
        $path = "assets/$f";

        // Store as array of audio files per language
        if (!isset($cardsMaster[$num]['audio'][$trig])) {
            $cardsMaster[$num]['audio'][$trig] = [];
        }
        if (!isset($cardsMaster[$num]['audioFiles'][$trig])) {
            $cardsMaster[$num]['audioFiles'][$trig] = [];
        }

        // Add to array
        $cardsMaster[$num]['audio'][$trig][] = $path;
        $cardsMaster[$num]['audioFiles'][$trig][] = $f;
    }
}
```

**Update extractAudioInfo() (lines 345-350):**
```php
function extractAudioInfo($filename) {
    // Pattern: {num}.{trigraph}.{wordVariant}.{ext}
    // Example: 12.ceb.ako.m4a
    if (preg_match('/^(\d+)\.([a-z]{3})\.([^.]+)\./', $filename, $m)) {
        return [(int)$m[1], $m[2], $m[3]];  // [12, "ceb", "ako"]
    }
    return [null, null, null];
}
```

**Update Manifest Generation (lines 220-240):**
```php
$audioPath = $c['audio'][$trig] ?? null;
$hasAudio = !empty($audioPath);

$finalCards[$trig][] = [
    'lesson' => $c['lesson'],
    'cardNum' => $c['cardNum'],
    'word' => $c['word'][$trig],
    'english' => $c['english'][$trig] ?? '',
    // ... other fields ...
    'audio' => $audioPath,  // Now an array: ["assets/12.ceb.ako.m4a", "assets/12.ceb.ko.m4a"]
    'hasAudio' => $hasAudio,
    // ...
];
```

---

### Step 2: app.js enrichCard()
**File:** `/home/user/WSOL/app.js:971-1069`

**Current:**
```javascript
audioPath: card.audio || null,
```

**New:**
```javascript
// Handle audio as array or single value
let audioPath = card.audio;
if (audioPath && !Array.isArray(audioPath)) {
    audioPath = [audioPath];  // Convert single to array
}

return {
    ...card,
    audioPath: audioPath || [],  // Always array
    // ...
};
```

For v3.x cards:
```javascript
// Get audio paths for current language
const audioData = card.audio && card.audio[learningLangKey] ?
    card.audio[learningLangKey] : null;

let audioPath = [];
if (audioData) {
    audioPath = Array.isArray(audioData) ? audioData : [audioData];
}

return {
    ...card,
    audioPath: audioPath,  // Array
    // ...
};
```

---

### Step 3: flashcards-module.js
**File:** `/home/user/WSOL/flashcards-module.js:150-159`

**Current:**
```javascript
if (card.hasAudio) {
    speaker.addEventListener('click', (e) => {
        e.stopPropagation();
        const audio = new Audio(card.audioPath);
        audio.play();
    });
}
```

**New:**
```javascript
if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
    speaker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playAudioSequentially(card.audioPath);
    });
}

// Add method to FlashcardsModule class
playAudioSequentially(audioPaths) {
    let currentIndex = 0;

    const playNext = () => {
        if (currentIndex >= audioPaths.length) {
            return;  // Done
        }

        const audio = new Audio(audioPaths[currentIndex]);
        audio.onended = () => {
            currentIndex++;
            playNext();  // Play next in chain
        };
        audio.onerror = () => {
            debugLogger?.log(1, `Audio play error: ${audioPaths[currentIndex]}`);
            currentIndex++;
            playNext();  // Skip to next on error
        };
        audio.play().catch(err => {
            debugLogger?.log(1, `Audio play error: ${err.message}`);
            currentIndex++;
            playNext();
        });
    };

    playNext();
}
```

---

### Step 4: match-sound-module.js
**File:** `/home/user/WSOL/match-sound-module.js:19-39`

**Current expandToVirtualCards:**
```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        const acceptableAnswers = card.acceptableAnswers || [card.word];

        acceptableAnswers.forEach(targetWord => {
            virtualCards.push({
                cardId: card.cardNum,
                targetWord: targetWord,
                physicalIndex: physicalIndex,
                imagePath: card.imagePath,
                audioPath: card.audioPath,  // ← Currently whole array
                allWords: acceptableAnswers,
                originalCard: card
            });
        });
    });
    return virtualCards;
}
```

**New expandToVirtualCards:**
```javascript
expandToVirtualCards(cards) {
    const virtualCards = [];
    cards.forEach((card, physicalIndex) => {
        const acceptableAnswers = card.acceptableAnswers || [card.word];
        const audioPaths = card.audioPath || [];  // Array of audio paths

        acceptableAnswers.forEach((targetWord, variantIndex) => {
            // Match audio to variant by index
            const individualAudioPath = audioPaths[variantIndex] || null;

            virtualCards.push({
                cardId: card.cardNum,
                targetWord: targetWord,
                physicalIndex: physicalIndex,
                imagePath: card.imagePath,
                audioPath: individualAudioPath,  // ← Individual audio for this variant
                allWords: acceptableAnswers,
                originalCard: card
            });
        });
    });
    return virtualCards;
}
```

**Example:**
```javascript
// Input card
{
    cardNum: 12,
    word: "Ako/ko",
    acceptableAnswers: ["Ako", "ko"],
    audioPath: ["assets/12.ceb.ako.m4a", "assets/12.ceb.ko.m4a"],
    imagePath: "assets/12.Ako.I.png"
}

// Output virtual cards
[
    {
        cardId: 12,
        targetWord: "Ako",
        audioPath: "assets/12.ceb.ako.m4a",  // ← First audio
        imagePath: "assets/12.Ako.I.png",
        allWords: ["Ako", "ko"]
    },
    {
        cardId: 12,
        targetWord: "ko",
        audioPath: "assets/12.ceb.ko.m4a",  // ← Second audio
        imagePath: "assets/12.Ako.I.png",
        allWords: ["Ako", "ko"]
    }
]
```

**Update renderAudio (lines 191-236):**
```javascript
renderAudio() {
    // ... existing selection logic ...

    const targetCard = this.virtualCards[randomIdx];

    // Create speaker button
    audioSection.innerHTML = `
        <div class="audio-speaker-big">
            <i class="fas fa-volume-up"></i>
            <div class="dot"></div>
        </div>
    `;

    const speaker = audioSection.querySelector('.audio-speaker-big');
    speaker.addEventListener('click', () => {
        // Play single audio for this variant
        if (targetCard.audioPath) {
            const audio = new Audio(targetCard.audioPath);
            audio.play().catch(err => {
                debugLogger?.log(1, `Audio play error: ${err.message}`);
            });
        }
    });
}
```

---

### Step 5: quiz-module.js
**File:** `/home/user/WSOL/quiz-module.js`

**Add sequential audio playback (similar to Flashcards):**
```javascript
// In renderQuestion method (lines 193-237)
if (card.hasAudio && card.audioPath && card.audioPath.length > 0) {
    this.playAudioSequentially(card.audioPath);
}

// Add method to UnsaNiQuizModule class
playAudioSequentially(audioPaths) {
    let currentIndex = 0;

    const playNext = () => {
        if (currentIndex >= audioPaths.length) {
            return;
        }

        const audio = new Audio(audioPaths[currentIndex]);
        audio.onended = () => {
            currentIndex++;
            playNext();
        };
        audio.onerror = () => {
            currentIndex++;
            playNext();
        };
        audio.play().catch(err => {
            debugLogger?.log(1, `Audio play error: ${err.message}`);
            currentIndex++;
            playNext();
        });
    };

    playNext();
}
```

---

### Step 6: deck-builder-module.js
**File:** `/home/user/WSOL/deck-builder-module.js`

**Current Audio Icon (lines ~1000-1050):**
Shows single audio icon per language.

**New Audio Icons:**
Show one icon per word variant.

**Implementation:**
```javascript
// In buildCardHTML or wherever audio icons are created

// Get word variants
const wordVariants = card.word ? card.word.split('/').map(w => w.trim()) : [''];
const audioPaths = card.audioPath || [];

// Create audio icon for each variant
wordVariants.forEach((variant, index) => {
    const audioFile = audioPaths[index] || null;
    const trigraph = this.currentLanguage?.trigraph || 'ceb';

    // Icon label
    let iconLabel = '';
    if (audioFile) {
        // Show filename if file exists
        const filename = audioFile.split('/').pop();
        iconLabel = filename;
    } else {
        // Show word variant if no file
        iconLabel = variant.toLowerCase();
    }

    const audioIcon = document.createElement('div');
    audioIcon.className = 'audio-icon';
    audioIcon.dataset.variant = variant;
    audioIcon.dataset.index = index;
    audioIcon.innerHTML = `
        <i class="fas fa-volume-up"></i>
        <span class="icon-label">${iconLabel}</span>
    `;

    audioIcon.addEventListener('click', () => {
        this.showFileSelectionModal(cardId, 'audio', trigraph, index, variant);
    });

    audioContainer.appendChild(audioIcon);
});
```

**PNG/GIF Icon Updates:**
```javascript
// For PNG icon
const pngIcon = document.createElement('div');
pngIcon.className = 'image-icon';

let pngLabel = 'PNG';
if (card.printImagePath) {
    const filename = card.printImagePath.split('/').pop();
    pngLabel = filename;
}

pngIcon.innerHTML = `
    <i class="fas fa-image"></i>
    <span class="icon-label">${pngLabel}</span>
`;

// Similar for GIF icon
```

**Update File Association:**
When user selects audio file, need to know which variant index it's for:

```javascript
associateAudioFile(cardId, filename, variantIndex) {
    const card = this.findCard(cardId);
    if (!card) return;

    // Ensure audioPath is array
    if (!card.audioPath || !Array.isArray(card.audioPath)) {
        card.audioPath = [];
    }

    // Set audio at variant index
    card.audioPath[variantIndex] = `assets/${filename}`;

    // Update hasAudio
    card.hasAudio = card.audioPath.some(p => p !== null && p !== '');

    this.updateCardDisplay(cardId);
    this.editedCards.set(cardId, card);
}
```

---

## Testing Scenarios

### Test Card: "Ako/ko" (Card #12)

**Files to create:**
- `12.ceb.ako.m4a`
- `12.ceb.ko.m4a`
- `12.Ako.I.png`

**Expected Behavior:**

#### Deck Builder
- Shows 2 audio icons: [ako] [ko]
- After linking: [12.ceb.ako.m4a] [12.ceb.ko.m4a]
- PNG icon shows: [12.Ako.I.png]

#### Flashcards
- Speaker click plays: ako audio → ko audio

#### Audio-Match
- Question 1: Plays "ako" audio → show 4 pictures
- Question 2: Plays "ko" audio → show 4 pictures
- Both questions show the same "12.Ako.I.png" as correct answer

#### Quiz
- Auto-plays: ako audio → ko audio
- Shows: "I/me"
- Accepts: "ako" or "ko"

#### Match
- Shows picture "12.Ako.I.png"
- Shows word options including "Ako" (or "ko")
- No audio (visual only)

---

## File Naming Convention

### Pattern
`{cardNum}.{trigraph}.{wordVariant}.{ext}`

### Rules
1. **cardNum:** Numeric card number (e.g., 12)
2. **trigraph:** Language code lowercase (e.g., ceb, mrw, sin)
3. **wordVariant:** Lowercase word variant (e.g., ako, ko, kini, ni)
4. **ext:** File extension (m4a, mp3)

### Examples
```
12.ceb.ako.m4a
12.ceb.ko.m4a
13.ceb.ikaw.m4a
13.ceb.ka.m4a
14.ceb.kini.m4a
14.ceb.ni.m4a
21.ceb.mestro.m4a
21.ceb.a.m4a
```

### Backward Compatibility
Old format files (e.g., `12.ceb.ako-ko.m4a`) should still work:
- Extract as: `[12, "ceb", "ako-ko"]`
- Treat as single-variant audio
- audioPath becomes: `["assets/12.ceb.ako-ko.m4a"]`

---

## Manifest JSON Structure

### v4.0 Format (New)
```json
{
    "cardNum": 12,
    "word": "Ako/ko",
    "acceptableAnswers": ["Ako/ko"],
    "audio": [
        "assets/12.ceb.ako.m4a",
        "assets/12.ceb.ko.m4a"
    ],
    "hasAudio": true,
    "imagePath": "assets/12.Ako.I.png"
}
```

### After enrichCard()
```javascript
{
    cardNum: 12,
    word: "Ako/ko",
    acceptableAnswers: ["Ako", "ko"],  // Split
    audioPath: [                       // Array
        "assets/12.ceb.ako.m4a",
        "assets/12.ceb.ko.m4a"
    ],
    hasAudio: true,
    imagePath: "assets/12.Ako.I.png"
}
```

---

## Summary

### Changes Required

| File | Changes |
|------|---------|
| `scan-assets.php` | Update audio linking, extractAudioInfo(), manifest generation |
| `app.js` | Update enrichCard() to handle audio arrays |
| `flashcards-module.js` | Add sequential audio playback |
| `match-sound-module.js` | Assign individual audio to virtual cards |
| `quiz-module.js` | Add sequential audio playback |
| `deck-builder-module.js` | Multiple audio icons, show filenames |

### Key Concepts

1. **Audio as Array:** All modules treat audio as array of paths
2. **Variant Index Matching:** Audio files matched to word variants by index
3. **Sequential Playback:** Flashcards/Quiz play all audio files in order
4. **Individual Audio:** Audio-Match assigns one audio per virtual card
5. **Icon Labels:** Show word variant before linking, filename after

---

**Document Created:** 2025-11-20
**Repository:** `/home/user/WSOL`
**Branch:** `claude/research-manifest-modules-015Pg5imKqapV6sQ6o5gyNq9`
