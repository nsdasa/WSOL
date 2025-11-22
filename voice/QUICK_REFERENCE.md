# Quick Reference Guide

## 🚀 Common Tasks

### Deploying to Server

```bash
# 1. Upload files
scp -r pronunciation-analyzer/ user@wsol1.doulosmi.org:/var/www/html/

# 2. Update index.php (replace old <script> with):
<script type="module">
    import { init } from './js/main.js';
</script>

# 3. Test at:
https://wsol1.doulosmi.org/pronunciation-analyzer/
```

---

### Adding a New Visualization

**1. Add method to Visualizer class** (`js/modules/visualizer.js`):
```javascript
drawMyNewViz(buffer1, buffer2) {
    // Your rendering code here
}
```

**2. Add tab to UI** (`index.php`):
```html
<button class="viz-tab" data-viz="mynewviz">My New Viz</button>
```

**3. Add case to switch** (`js/main.js` in `updateVisualization()`):
```javascript
case 'mynewviz':
    visualizer.drawMyNewViz(nativeBuffer, userBuffer);
    break;
```

---

### Adding a New Comparison Method

**1. Add method to PronunciationComparator** (`js/modules/scoring.js`):
```javascript
compareMyFeature(native, user) {
    // Comparison logic
    return { score: 85, description: '...' };
}
```

**2. Update compare()** method to call it:
```javascript
const myFeature = this.compareMyFeature(nativeBuffer, userBuffer);
```

**3. Add to scoring weights:**
```javascript
const weightedScore = (
    pitch.score * 0.25 +
    mfcc.score * 0.20 +
    myFeature.score * 0.10 +  // NEW
    // ...
);
```

---

### Customizing Visualization Colors

**Edit** `js/modules/visualizer.js`:

```javascript
// Waveform colors
this.ctx.strokeStyle = '#3b82f6'; // Blue (native)
this.ctx.strokeStyle = '#ef4444'; // Red (user)

// Spectrogram colormaps
viridisColor(t) { /* ... */ }
plasmaColor(t) { /* ... */ }
jetColor(t) { /* ... */ }
```

---

### Changing Scoring Weights

**Edit** `js/modules/scoring.js` in `compare()` method:

```javascript
const weightedScore = (
    pitch.score * 0.25 +      // 25% weight
    mfcc.score * 0.20 +       // 20% weight
    spectral.score * 0.15 +   // 15% weight
    duration.score * 0.15 +   // 15% weight
    stress.score * 0.10 +     // 10% weight
    formant.score * 0.08 +    // 8% weight
    quality.score * 0.05 +    // 5% weight
    energy.score * 0.02       // 2% weight
);
```

---

### Debugging

**1. Enable debug panel:**
- Click "Show Debug" button in UI
- All operations logged there

**2. Browser console:**
```javascript
// Check if modules loaded
console.log(window.scalePreferences);

// Access visualizer
const canvas = document.getElementById('vizCanvas');
const visualizer = canvas._visualizer;

// Check analysis results
console.log(analysisResults);
```

**3. Check for errors:**
- F12 → Console tab
- Look for red error messages
- Check Network tab for failed loads

---

### Modifying Settings

**All settings in** `js/main.js`:

```javascript
window.scalePreferences = {
    amplitude: 'linear',           // or 'dB'
    waveformMode: 'bipolar',       // or 'envelope'
    displayMode: 'overlay',        // or 'stacked'
    fftSize: 512,                  // 256, 512, 1024, 2048, 4096
    mfccNumFilters: 60,            // 20-80
    pitchYMin: 50,                 // Hz
    pitchYMax: 500,                // Hz
    // ... 40+ more settings
};
```

---

### File Structure at a Glance

```
pronunciation-analyzer/
├── index.php              ← Main UI
│
├── js/
│   ├── main.js           ← Start here for event handlers
│   │
│   ├── modules/
│   │   ├── visualizer.js  ← Canvas rendering
│   │   ├── scoring.js     ← Comparison algorithms
│   │   ├── pitch.js       ← Pitch tracking
│   │   ├── mfcc.js        ← MFCC extraction
│   │   └── ...           ← Other processing modules
│   │
│   └── utils/
│       ├── audio-utils.js ← Recording, trimming
│       └── math-utils.js  ← Math helpers
│
└── css/
    ├── main.css          ← Layout
    ├── controls.css      ← UI controls
    └── results.css       ← Score display
```

---

### Import Examples

```javascript
// In main.js
import { Visualizer } from './modules/visualizer.js';
import { PronunciationComparator } from './modules/scoring.js';

// In scoring.js
import { extractPitch } from './pitch.js';
import { extractMFCCs } from './mfcc.js';
import { computeDTW } from './dtw.js';

// In visualizer.js
// No imports - standalone module
```

---

### Testing Checklist

Before deploying changes:

- [ ] No console errors
- [ ] Upload native audio works
- [ ] Recording works
- [ ] Playback works  
- [ ] Analysis completes
- [ ] All 8 visualizations render
- [ ] Settings controls work
- [ ] Export functions work
- [ ] Mobile responsive
- [ ] HTTPS enabled

---

### Common Issues

**"Cannot find module"**
→ Check file paths (case-sensitive on Linux)

**"Failed to load resource"**
→ Verify server serves .js as text/javascript

**"Microphone not working"**
→ Requires HTTPS and user permission

**"Blank canvas"**
→ Check that updateVisualization() is called after analysis

**"AI analysis button disabled"**
→ Need to configure API key in localStorage

---

### Performance Tips

**1. Cache spectrogram data:**
```javascript
if (!spectrumCache.nativeSpectrogram) {
    spectrumCache.nativeSpectrogram = computeSpectrogram(...);
}
```

**2. Downsample large visualizations:**
```javascript
// In visualizer.js
const step = Math.max(1, Math.floor(data.length / maxPoints));
const downsampled = data.filter((_, i) => i % step === 0);
```

**3. Use requestAnimationFrame for rendering:**
```javascript
requestAnimationFrame(() => {
    visualizer.drawWaveform(native, user);
});
```

---

### Configuration Files

**API Key** (stored in browser):
```javascript
localStorage.setItem('anthropic_api_key', 'sk-...');
```

**Server MIME types** (.htaccess):
```apache
AddType text/javascript js mjs
```

**CORS** (if needed):
```apache
Header set Access-Control-Allow-Origin "*"
```

---

### Module Dependencies

```
main.js
  ├─→ visualizer.js (standalone)
  ├─→ scoring.js
  │    ├─→ pitch.js
  │    ├─→ intensity.js
  │    ├─→ mfcc.js
  │    ├─→ dtw.js
  │    ├─→ fft.js
  │    ├─→ waveform.js
  │    └─→ internal.js
  │         └─→ fft.js
  ├─→ ai-api.js (standalone)
  └─→ audio-utils.js (standalone)
```

---

### Quick Edits

**Change app title:**
`index.php` line 8

**Change default FFT size:**
`js/main.js` → `window.scalePreferences.fftSize`

**Change score thresholds:**
`js/main.js` → `showResults()` function

**Change colormap:**
`js/modules/visualizer.js` → colormap functions

---

### Useful Console Commands

```javascript
// Access global state
console.log(nativeBuffer, userBuffer);
console.log(analysisResults);

// Force re-render
updateVisualization();

// Check API key
console.log(localStorage.getItem('anthropic_api_key'));

// Clear cache
spectrumCache = { nativeSpectrum: null, userSpectrum: null };
```

---

### Documentation Files

- `README.md` - User guide
- `PROJECT_STRUCTURE.md` - Architecture
- `DEPLOYMENT.md` - Server setup
- `SESSION_5_SUMMARY.md` - Complete module reference
- `PROJECT_COMPLETE.md` - Overview & statistics
- `QUICK_REFERENCE.md` - This file

---

**Need more help?** Check the full documentation files listed above!

**Ready to deploy?** See `DEPLOYMENT.md`

**Want to understand the code?** Start with `PROJECT_STRUCTURE.md`
