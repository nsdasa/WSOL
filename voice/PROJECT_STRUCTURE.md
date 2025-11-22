# Pronunciation Analyzer - Modular Structure

## Overview
Refactored from monolithic 9,779-line HTML file into clean, maintainable PHP + JavaScript modules.

## Directory Structure
```
/pronunciation-analyzer/
├── index.php                 # Landing page (HTML structure)
├── css/
│   ├── main.css             # Core layout & typography
│   ├── controls.css         # Buttons & interactive elements
│   └── results.css          # Score display & feedback
├── js/
│   ├── main.js              # Main orchestrator (entry point)
│   ├── modules/
│   │   ├── pitch.js         # Pitch detection & analysis
│   │   ├── intensity.js     # Intensity/envelope & stress detection
│   │   ├── mfcc.js          # MFCC extraction & mel filterbank
│   │   ├── waveform.js      # Waveform processing
│   │   ├── fft.js           # FFT computation & spectrogram
│   │   ├── internal.js      # LPC, formants, autocorrelation
│   │   ├── dtw.js           # Dynamic Time Warping
│   │   ├── scoring.js       # Comparison & scoring algorithms
│   │   ├── visualizer.js    # Canvas-based visualization
│   │   └── ai-api.js        # Anthropic API integration
│   └── utils/
│       ├── math-utils.js    # Mathematical helpers
│       └── audio-utils.js   # Audio handling & Web Audio API
└── assets/                  # Images, icons, etc.
```

## Module Responsibilities

### 1. **pitch.js** (~500 lines)
**Source:** Lines 2386-2563
- `extractPitch()` - Main pitch extraction pipeline
- `estimatePitchDetailed()` - Normalized autocorrelation
- Octave error correction
- Median filtering & smoothing
- Pitch contour cleaning

### 2. **intensity.js** (~400 lines)
**Source:** Lines 2564-2635, 3746-3831
- `extractIntensity()` - RMS envelope detection
- `detectStress()` - Syllable stress patterns
- `compareStressPattern()` - Pattern matching
- `compareStressPosition()` - Main stress location

### 3. **mfcc.js** (~600 lines)
**Source:** Lines 2641-2805, 2806-2881
- `extractMFCCs()` - 13-coefficient extraction
- `createMelFilterbank()` - Triangular filters
- `applyDCT()` - Discrete Cosine Transform
- Pre-emphasis & liftering
- Mel scale conversions

### 4. **waveform.js** (~200 lines)
**Source:** Scattered preprocessing functions
- Normalization
- DC offset removal
- Downsampling
- Buffer manipulation

### 5. **fft.js** (~400 lines)
**Source:** Lines 2883-2951, 4422-4510
- `computeFFT()` - Cooley-Tukey algorithm
- `computeSpectrogram()` - Time-frequency analysis
- Bit reversal
- Windowing functions

### 6. **internal.js** (~800 lines)
**Source:** Lines 1536-2373
- `ImprovedLPC` class
  - `levinsonDurbin()` - LPC coefficients
  - `computeLPCSpectrum()` - Spectral analysis
  - `extractFormants()` - Formant tracking
  - `findSpectralPeaks()` - Peak detection
- `autocorrelation()`
- `preEmphasis()`
- `computeZCR()` - Zero-crossing rate
- `extractSpectralTilt()` - Frequency balance
- Polynomial root-finding (Durand-Kerner, Laguerre)

### 7. **dtw.js** (~200 lines)
**Source:** Lines 2956-3058
- `compute1D()` - 1D sequence alignment
- `computeMultiDim()` - Multi-dimensional DTW
- Path recovery
- Normalized distance

### 8. **scoring.js** (~1200 lines)
**Source:** Lines 3062-3894
- `PronunciationComparator` class
  - `comparePitch()` - Pitch similarity
  - `compareMFCC()` - Timbral matching
  - `compareEnvelope()` - Amplitude contour
  - `compareDuration()` - Timing accuracy
  - `compareQuality()` - ZCR + spectral tilt
  - `compareFormants()` - Formant trajectories
  - `compareStressPattern()` - Rhythm analysis
- Weighted scoring system (7 components)
- Feedback generation

### 9. **visualizer.js** (~2500 lines)
**Source:** Lines 3899-6500+
- `Visualizer` class
  - `drawWaveform()` - Overlay visualization
  - `drawSpectrogram()` - Time-frequency heatmap
  - `drawPitch()` - F0 contour with confidence
  - `drawMFCCs()` - Coefficient heatmap
  - `drawFormants()` - F1/F2/F3 tracks
  - `drawAllFeatures()` - 6-panel combined view
- Color mapping (viridis, plasma, jet)
- Axis rendering
- Scale controls

### 10. **ai-api.js** (~150 lines)
**Source:** Lines 9667-9753
- `runAIAnalysis()` - Call Anthropic API
- Prompt building with metrics
- Response formatting (markdown → HTML)
- Error handling
- API key management

### 11. **main.js** (~400 lines)
**Source:** Lines 6700-9778 (event handlers, orchestration)
- App initialization
- Event listeners (upload, record, analyze)
- Workflow coordination
- State management
- UI updates
- Error handling

### 12. **math-utils.js** (~150 lines)
**Source:** Scattered mathematical functions
- `applyHammingWindow()`
- `medianFilter()`
- `resampleArray()`
- `pearsonCorrelation()`
- `normalize()`
- `removeDCOffset()`
- Hz ↔ Mel conversions
- Complex number operations

### 13. **audio-utils.js** (~200 lines)
**Source:** Audio handling functions
- `DebugLog` class
- `AudioUtils` class
  - File loading
  - Audio playback
  - Recording
  - Format conversion
- `StorageManager` - LocalStorage wrapper

## Data Flow

```
User Upload/Record
       ↓
   AudioBuffer
       ↓
   [Preprocessing] ← internal.js (pre-emphasis, windowing)
       ↓
   ┌───────────────────────────┐
   │   Feature Extraction      │
   ├───────────────────────────┤
   │ pitch.js     → F0 track   │
   │ intensity.js → RMS + stress│
   │ mfcc.js      → 13 coeffs  │
   │ fft.js       → Spectrogram│
   │ internal.js  → Formants   │
   └───────────────────────────┘
       ↓
   [Comparison] ← scoring.js + dtw.js
       ↓
   7-Component Score + Breakdown
       ↓
   ┌───────────────────────────┐
   │ Visualization & Feedback  │
   ├───────────────────────────┤
   │ visualizer.js → Canvas    │
   │ ai-api.js     → AI advice │
   └───────────────────────────┘
       ↓
   Display Results
```

## API Dependencies

### Web Audio API
- `AudioContext`
- `decodeAudioData()`
- `createBufferSource()`
- `MediaRecorder`

### Canvas API
- 2D rendering context
- Path drawing
- Text rendering
- Transformations

### External APIs
- Anthropic Claude API (optional)
  - Model: claude-sonnet-4-20250514
  - Endpoint: https://api.anthropic.com/v1/messages

## Configuration

### Global Variables (now in main.js)
- `audioContext` - Web Audio context
- `nativeBuffer` - Reference audio
- `userBuffer` - Learner recording
- `analysisResults` - Current scores
- `useDTW` - Algorithm toggle

### Preferences (LocalStorage)
- `anthropicApiKey` - API authentication
- `scalePreferences` - Visualization settings
- `debugEnabled` - Logging toggle

## Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- ES6 modules
- Web Audio API
- Canvas 2D
- MediaRecorder API
- localStorage

## Development Notes

### Module Pattern
- ES6 modules with `export`/`import`
- Class-based for stateful components
- Functional for utilities
- No global pollution

### Error Handling
- Try-catch around audio processing
- Graceful degradation for missing features
- User-friendly error messages
- Debug logging for developers

### Performance Considerations
- FFT: Cooley-Tukey (O(n log n))
- DTW: Sakoe-Chiba band constraint
- MFCC: Cached mel filterbanks
- Canvas: RequestAnimationFrame for animations

### Testing Strategy
- Unit tests for math utilities
- Integration tests for pipelines
- Manual testing with diverse audio samples
- Cross-browser validation

## Migration Checklist

- [x] Directory structure created
- [x] index.php with clean HTML
- [x] CSS modules (main, controls, results)
- [x] Utility modules (math-utils, audio-utils)
- [ ] pitch.js extraction
- [ ] intensity.js extraction
- [ ] mfcc.js extraction
- [ ] waveform.js extraction
- [ ] fft.js extraction
- [ ] internal.js extraction
- [ ] dtw.js extraction
- [ ] scoring.js extraction
- [ ] visualizer.js extraction
- [ ] ai-api.js extraction
- [ ] main.js orchestration
- [ ] Testing & debugging
- [ ] Documentation

## Next Steps

1. Extract pitch.js as template
2. Follow pattern for remaining modules
3. Wire up main.js orchestrator
4. Test individual modules
5. Integration testing
6. Deployment
