/**
 * MAIN APPLICATION MODULE
 * 
 * Application orchestration for the Pronunciation Analyzer.
 * Handles initialization, event binding, and workflow coordination.
 * 
 * Features:
 * - Microphone access and recording
 * - Audio file upload handling  
 * - Analysis workflow orchestration
 * - Visualization mode switching
 * - Settings and preferences management
 * - Results display and export
 * 
 * Dependencies:
 * - modules/visualizer.js - Canvas visualization
 * - modules/scoring.js - Pronunciation comparison
 * - modules/ai-api.js - AI analysis integration
 * - utils/audio-utils.js - Audio handling
 * - utils/math-utils.js - Mathematical utilities
 * 
 * @module main
 */

import { Visualizer } from './modules/visualizer.js';
import { PronunciationComparator } from './modules/scoring.js';
import { AIAnalyzer, AIAnalysisUI } from './modules/ai-api.js';
import { trimSilence } from './utils/audio-utils.js';

// ===================================================================
// GLOBAL STATE
// ===================================================================
// AudioContext created lazily to comply with browser autoplay policies
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

let nativeBuffer = null;
let userBuffer = null;
let nativeAudioElement = null;
let userAudioBlob = null;
let mediaRecorder = null;
let audioChunks = [];
let currentViz = 'waveform';
let stream = null;
let analysisResults = null;
let detailedAnalysis = null;

// Audio processing options
let useFilter = true;  // Apply 70-12000 Hz speech filter
let useDTW = true;     // Use Dynamic Time Warping for comparison

// Cache for computed spectra (avoid recomputing on display mode switch)
// Exposed globally for visualizer.js to access
window.spectrumCache = {
    nativeSpectrum: null,
    userSpectrum: null,
    nativeSpectrogram: null,
    userSpectrogram: null
};
const spectrumCache = window.spectrumCache;

// Scale preferences (referenced globally by Visualizer)
window.scalePreferences = {
    amplitude: 'linear',
    waveformMode: 'bipolar',
    displayMode: 'overlay',
    spectrogramMag: 'linear',
    spectrogramFreq: 'linear',
    melBins: 80,
    filterMode: 'global',
    filterValue: 0,
    zoomX: 1,
    zoomY: 1,
    fftSize: 512,
    hopSize: 'auto',

    // Waveform filtering options
    waveformFilterMode: 'none',
    waveformThreshold: 0.01,
    waveformPercentile: 90,
    waveformRmsWindow: 64,
    waveformZoomX: 1,
    waveformZoomY: 1,
    waveformTimeStart: 0,
    waveformTimeEnd: 1,
    waveformDownsample: 'minmax',
    waveformNormalization: 'independent',

    // MFCC options
    mfccNumFilters: 60,
    mfccCoeffStart: 1,
    mfccCoeffEnd: 12,
    mfccDelta: false,
    mfccLifter: 0,
    mfccFilterMode: 'global',
    mfccFilterValue: 0,
    mfccPerBinNorm: false,
    mfccZoomX: 1,
    mfccZoomY: 1,
    mfccColormap: 'viridis',
    mfccSymmetric: false,
    mfccNormalization: 'independent',

    // Pitch visualization options
    pitchMinConfidence: 0.0,
    pitchSmoothing: false,
    pitchSmoothingWindow: 3,
    pitchScale: 'linear',
    pitchNormalize: false,
    pitchShowConfidence: true,
    pitchShowUnvoiced: true,
    pitchYMin: 50,
    pitchYMax: 500,

    // Intensity visualization options
    intensityNormalization: 'independent',
    intensitySmoothing: false,
    intensitySmoothingWindow: 5,
    intensityLogScale: false,

    // Formant visualization options
    formantSmoothing: false,
    formantSmoothingWindow: 3,
    formantOverlay: false,
    formantShowF1: true,
    formantShowF2: true,
    formantShowF3: true,

    // Feature visualization
    featureLayout: 'grid',
    featureShowLabels: true
};

// FFT size options
const fftSizeOptions = [256, 512, 1024, 2048, 4096];

// ===================================================================
// DEBUG LOGGING
// ===================================================================
// Exposed globally for visualizer.js to access
window.debugLog = {
    log: (message, type = 'info') => {
        const output = document.getElementById('debugOutput');
        if (!output) return;

        const time = new Date().toLocaleTimeString();
        const color = {
            info: '#60a5fa',
            success: '#34d399',
            error: '#f87171',
            warning: '#fbbf24'
        }[type] || '#9ca3af';

        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.style.fontSize = '12px';
        entry.innerHTML = `<span style="color: #6b7280">[${time}]</span> <span style="color: ${color}">${message}</span>`;
        output.appendChild(entry);
        output.scrollTop = output.scrollHeight;
    }
};
const debugLog = window.debugLog;

// ===================================================================
// INITIALIZATION
// ===================================================================
async function init() {
    debugLog.log('Initializing Pronunciation Analyzer...');

    // Initialize core components
    const canvas = document.getElementById('vizCanvas');
    if (!canvas) {
        debugLog.log('Canvas element not found!', 'error');
        return;
    }
    const visualizer = new Visualizer(canvas);
    const comparator = new PronunciationComparator();
    const aiAnalyzer = new AIAnalyzer();
    const aiUI = new AIAnalysisUI(aiAnalyzer);

    // Override AI UI message handler to use debug log
    aiUI.showMessage = (msg, type) => debugLog.log(msg, type);

    // Initialize AI UI
    aiUI.init({
        section: 'aiAnalysisSection',
        content: 'aiAnalysisContent',
        button: 'aiAnalysisBtn',
        status: 'apiStatus',
        input: 'apiKeyInput'
    });

    // Request microphone access
    const micStatus = document.getElementById('micStatus');
    if (micStatus) micStatus.style.display = 'block';


    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length === 0) return;

            userAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            audioChunks = [];

            try {
                const arrayBuffer = await userAudioBlob.arrayBuffer();
                const decodedBuffer = await getAudioContext().decodeAudioData(arrayBuffer);

                userBuffer = trimSilence(decodedBuffer);

                // Clear user cache since we have new audio
                spectrumCache.userSpectrum = null;
                spectrumCache.userSpectrogram = null;

                const userRecordingEl = document.getElementById('userRecordingSection');
                if (userRecordingEl) userRecordingEl.classList.add('show');
                const userDurationEl = document.getElementById('userDurationText');
                if (userDurationEl) userDurationEl.textContent = `Duration: ${userBuffer.duration.toFixed(1)}s`;

                const compareBtn = document.getElementById('compareBtn');
                if (compareBtn) compareBtn.disabled = false;
                debugLog.log('Recording processed successfully', 'success');
            } catch (err) {
                debugLog.log(`Error processing recording: ${err.message}`, 'error');
                alert('Error processing recording: ' + err.message);
            }
        };

        if (micStatus) {
            micStatus.textContent = '✅ Microphone ready!';
            micStatus.classList.add('ready');
        }
        debugLog.log('Microphone access granted', 'success');
    } catch (err) {
        debugLog.log(`Microphone error: ${err.message}`, 'error');
        if (micStatus) {
            micStatus.textContent = '❌ Microphone access denied';
            micStatus.classList.add('error');
        }
    }

    // Set up all event handlers
    setupFileHandlers();
    setupRecordingHandlers();
    setupPlaybackHandlers();
    setupAnalysisHandlers(comparator, aiAnalyzer);
    setupVisualizationHandlers(visualizer);
    setupSettingsHandlers();
    setupExportHandlers();
    setupAIHandlers(aiUI);
    setupProcessingOptions();
    setupCopyPromptHandlers();


    // Initialize canvas with placeholder
    visualizer.ctx.fillStyle = '#1f2937';
    visualizer.ctx.fillRect(0, 0, visualizer.canvas.width, visualizer.canvas.height);
    visualizer.ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
    visualizer.ctx.font = '20px sans-serif';
    visualizer.ctx.textAlign = 'center';
    visualizer.ctx.fillText('Upload native audio and record your voice to begin',
        visualizer.canvas.width / 2, visualizer.canvas.height / 2);

    debugLog.log('Initialization complete!', 'success');

    return { visualizer, comparator, aiAnalyzer, aiUI };
}

// ===================================================================
// FILE UPLOAD HANDLERS
// ===================================================================
function setupFileHandlers() {
    // Native audio file upload - use correct ID from index.php
    const nativeInput = document.getElementById('nativeAudioFile');
    if (!nativeInput) {
        debugLog.log('Native audio input not found', 'error');
        return;
    }

    nativeInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        debugLog.log(`File selected: ${file.name} (${file.size} bytes)`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const decodedBuffer = await getAudioContext().decodeAudioData(arrayBuffer);
            nativeBuffer = trimSilence(decodedBuffer);

            // Clear native cache since we have new audio
            spectrumCache.nativeSpectrum = null;
            spectrumCache.nativeSpectrogram = null;

            debugLog.log(`Native audio loaded: ${nativeBuffer.duration.toFixed(2)}s`, 'success');

            nativeAudioElement = new Audio(URL.createObjectURL(file));

            // Update UI elements
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) uploadSection.classList.add('has-file');
            const fileLoaded = document.getElementById('fileLoaded');
            if (fileLoaded) fileLoaded.classList.add('show');
            const fileName = document.getElementById('fileName');
            if (fileName) fileName.textContent = file.name;
            const fileDurationText = document.getElementById('fileDurationText');
            if (fileDurationText) fileDurationText.textContent = `Duration: ${nativeBuffer.duration.toFixed(1)}s`;

            const wordName = file.name.replace(/\.(mp3|m4a|wav|webm|ogg)$/i, '');
            const targetWord = document.getElementById('targetWord');
            if (targetWord) targetWord.textContent = wordName;
            const targetTranslation = document.getElementById('targetTranslation');
            if (targetTranslation) targetTranslation.textContent = 'Ready to practice!';

            // Enable recording
            const recordBtn = document.getElementById('recordBtn');
            if (recordBtn) recordBtn.disabled = false;

            // Enable user audio upload
            const userAudioFile = document.getElementById('userAudioFile');
            if (userAudioFile) userAudioFile.disabled = false;
            const userUploadLabel = document.getElementById('userUploadLabel');
            if (userUploadLabel) {
                userUploadLabel.style.opacity = '1';
                userUploadLabel.style.cursor = 'pointer';
            }

            if (userBuffer) {
                updateVisualization();
            }
        } catch (err) {
            debugLog.log(`Error loading file: ${err.message}`, 'error');
            alert('Could not load audio file. Please ensure it\'s a valid audio format.');
        }
    });

    // User audio file upload handler
    const userAudioFileInput = document.getElementById('userAudioFile');
    if (userAudioFileInput) {
        userAudioFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            debugLog.log(`User file selected: ${file.name} (${file.size} bytes)`);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const decodedBuffer = await getAudioContext().decodeAudioData(arrayBuffer);
                userBuffer = trimSilence(decodedBuffer);

                userAudioBlob = new Blob([arrayBuffer], { type: file.type });

                // Clear user cache
                spectrumCache.userSpectrum = null;
                spectrumCache.userSpectrogram = null;

                debugLog.log(`User audio loaded: ${userBuffer.duration.toFixed(2)}s`, 'success');

                const userRecordingEl = document.getElementById('userRecordingSection');
                if (userRecordingEl) userRecordingEl.classList.add('show');
                const userDurationEl = document.getElementById('userDurationText');
                if (userDurationEl) userDurationEl.textContent = `Duration: ${userBuffer.duration.toFixed(1)}s`;

                const compareBtn = document.getElementById('compareBtn');
                if (compareBtn) compareBtn.disabled = false;
            } catch (err) {
                debugLog.log(`Error loading user file: ${err.message}`, 'error');
                alert('Could not load audio file. Please ensure it\'s a valid audio format.');
            }
        });
    }
}

// ===================================================================
// RECORDING HANDLERS
// ===================================================================
function setupRecordingHandlers() {
    const recordBtn = document.getElementById('recordBtn');
    const recordText = document.getElementById('recordText');
    const recordingIndicator = document.getElementById('recordingIndicator');

    if (!recordBtn) {
        debugLog.log('Record button not found', 'error');
        return;
    }

    recordBtn.addEventListener('click', () => {
        if (!mediaRecorder) {
            debugLog.log('MediaRecorder not initialized', 'error');
            return;
        }

        if (mediaRecorder.state === 'inactive') {
            // Start recording
            debugLog.log('Starting recording...');
            audioChunks = [];
            mediaRecorder.start();

            // Update UI
            recordBtn.classList.add('recording');
            if (recordText) recordText.textContent = 'Stop Recording';
            if (recordingIndicator) recordingIndicator.classList.add('active');

        } else if (mediaRecorder.state === 'recording') {
            // Stop recording
            debugLog.log('Stopping recording...');
            mediaRecorder.stop();

            // Update UI
            recordBtn.classList.remove('recording');
            if (recordText) recordText.textContent = 'Record Your Voice';
            if (recordingIndicator) recordingIndicator.classList.remove('active');
        }
    });
}

// ===================================================================
// PLAYBACK HANDLERS
// ===================================================================
function setupPlaybackHandlers() {
    const playNativeBtn = document.getElementById('playNative');
    if (playNativeBtn) {
        playNativeBtn.addEventListener('click', async () => {
            // Ensure AudioContext is active
            await getAudioContext();

            if (nativeAudioElement) {
                nativeAudioElement.currentTime = 0;
                nativeAudioElement.volume = 1.0;
                nativeAudioElement.play()
                    .then(() => debugLog.log('Native playback started', 'success'))
                    .catch(err => alert('Could not play audio: ' + err.message));
            }
        });
    }

    const playUserBtn = document.getElementById('playUser');
    if (playUserBtn) {
        playUserBtn.addEventListener('click', async () => {
            // Ensure AudioContext is active
            await getAudioContext();

            if (userAudioBlob) {
                const audioURL = URL.createObjectURL(userAudioBlob);
                const audio = new Audio(audioURL);
                audio.volume = 1.0;
                audio.play()
                    .then(() => debugLog.log('User playback started', 'success'))
                    .catch(err => alert('Could not play recording: ' + err.message));
            }
        });
    }

    const tryAgainBtn = document.getElementById('tryAgain');
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => {
            const results = document.getElementById('results');
            if (results) results.classList.remove('show');
            userBuffer = null;
            userAudioBlob = null;
            // Clear user cache
            spectrumCache.userSpectrum = null;
            spectrumCache.userSpectrogram = null;

            const compareBtn = document.getElementById('compareBtn');
            if (compareBtn) compareBtn.disabled = true;
            const exportBtn = document.getElementById('exportAnalysis');
            if (exportBtn) exportBtn.disabled = true;

            const userRecordingEl = document.getElementById('userRecordingSection');
            if (userRecordingEl) userRecordingEl.classList.remove('show');

            // Clear AI analysis
            const aiSection = document.getElementById('aiAnalysisSection');
            if (aiSection) aiSection.style.display = 'none';

            debugLog.log('Reset for new recording');
        });
    }
}

// ===================================================================
// ANALYSIS HANDLERS
// ===================================================================
function setupAnalysisHandlers(comparator, aiAnalyzer) {
    const compareBtn = document.getElementById('compareBtn');
    if (!compareBtn) {
        debugLog.log('Compare button not found', 'error');
        return;
    }

    compareBtn.addEventListener('click', async () => {
        if (!nativeBuffer || !userBuffer) {
            debugLog.log('Missing audio buffers', 'error');
            alert('Please upload native audio and record your voice first.');
            return;
        }

        debugLog.log('Starting pronunciation analysis...');

        // Validate user recording
        const userData = userBuffer.getChannelData(0);
        let maxAmp = 0;
        let rms = 0;
        for (let i = 0; i < userData.length; i++) {
            maxAmp = Math.max(maxAmp, Math.abs(userData[i]));
            rms += userData[i] * userData[i];
        }
        rms = Math.sqrt(rms / userData.length);

        debugLog.log(`Validation - Max: ${maxAmp.toFixed(4)}, RMS: ${rms.toFixed(4)}`);

        if (maxAmp < 0.01 || rms < 0.001) {
            alert('Your recording appears to be silent or too quiet. Please record again.');
            debugLog.log('Analysis rejected: invalid audio', 'error');
            return;
        }

        document.getElementById('feedback').textContent = 'Processing...';
        document.getElementById('results').classList.add('show');

        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            analysisResults = comparator.compare(nativeBuffer, userBuffer);
            // Add buffers to results for visualizer access
            analysisResults.nativeBuffer = nativeBuffer;
            analysisResults.userBuffer = userBuffer;
            detailedAnalysis = analysisResults.detailedReport;

            // Store results for AI analysis
            aiAnalyzer.setAnalysisResults(analysisResults);

            showResults(analysisResults);
            showDetailedAnalysis(detailedAnalysis);
            updateVisualization();

            // Show visualization section
            const vizSection = document.getElementById('visualizationSection');
            if (vizSection) vizSection.style.display = 'block';

            // Enable export if available
            const exportBtn = document.getElementById('exportAnalysis');
            if (exportBtn) exportBtn.disabled = false;

            // Enable AI analysis button if API is configured
            const aiBtn = document.getElementById('aiAnalysisBtn');
            if (aiBtn && aiAnalyzer.isConfigured()) {
                aiBtn.disabled = false;
            }

            // Enable copy prompt buttons
            const copyBalancedBtn = document.getElementById('copyBalancedPrompt');
            if (copyBalancedBtn) copyBalancedBtn.disabled = false;
            const copyFullBtn = document.getElementById('copyFullPrompt');
            if (copyFullBtn) copyFullBtn.disabled = false;

            debugLog.log('Analysis complete', 'success');
        } catch (err) {
            debugLog.log(`Error: ${err.message}`, 'error');
            console.error('Full error:', err);
            alert('Error during analysis: ' + err.message);
        }
    });
}

// ===================================================================
// VISUALIZATION HANDLERS
// ===================================================================
function setupVisualizationHandlers(visualizer) {
    // Visualization tab switching
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentViz = e.target.dataset.viz;
            debugLog.log(`Switching to ${currentViz} visualization`);

            updateScaleControlsVisibility();
            updateVisualization();
        });
    });

    // Display mode toggle (overlay/stacked)
    document.querySelectorAll('.scale-toggle button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const scale = e.target.dataset.scale;

            e.target.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            if (type === 'amplitude') {
                window.scalePreferences.amplitude = scale;
                debugLog.log(`Amplitude scale: ${scale}`);
            } else if (type === 'waveformMode') {
                window.scalePreferences.waveformMode = scale;
                debugLog.log(`Waveform mode: ${scale}`);
            } else if (type === 'displayMode') {
                window.scalePreferences.displayMode = scale;
                debugLog.log(`Display mode: ${scale}`);
            } else if (type === 'spectrogramMag') {
                window.scalePreferences.spectrogramMag = scale;
                debugLog.log(`Spectrogram magnitude: ${scale}`);
            } else if (type === 'spectrogramFreq') {
                window.scalePreferences.spectrogramFreq = scale;
                debugLog.log(`Spectrogram frequency: ${scale}`);
            }

            updateVisualization();
        });
    });

    // Debug panel toggle
    const toggleDebugBtn = document.getElementById('toggleDebug');
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', () => {
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel) debugPanel.classList.toggle('show');
        });
    }

    // Clear debug button
    const clearDebugBtn = document.getElementById('clearDebug');
    if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', () => {
            const debugOutput = document.getElementById('debugOutput');
            if (debugOutput) debugOutput.innerHTML = '';
        });
    }
}

// ===================================================================
// SETTINGS HANDLERS
// ===================================================================
function setupSettingsHandlers() {
    // Mel bins
    const melBinsSlider = document.getElementById('melBinsSlider');
    const melBinsInput = document.getElementById('melBinsInput');

    melBinsSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        melBinsInput.value = value;
        window.scalePreferences.melBins = value;
        debugLog.log(`Mel bins: ${value}`);
        updateVisualization();
    });

    melBinsInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value)) value = 80;
        value = Math.max(20, Math.min(200, value));
        e.target.value = value;
        melBinsSlider.value = value;
        window.scalePreferences.melBins = value;
        debugLog.log(`Mel bins: ${value}`);
        updateVisualization();
    });

    // Filter mode
    document.getElementById('filterModeSelect').addEventListener('change', (e) => {
        window.scalePreferences.filterMode = e.target.value;
        updateScaleControlsVisibility();
        updateFilterControls();
        updateVisualization();
    });

    // Filter value
    const filterSlider = document.getElementById('filterValueSlider');
    const filterInput = document.getElementById('filterValueInput');

    filterSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        filterInput.value = value;
        window.scalePreferences.filterValue = value;
        debugLog.log(`Filter value: ${value}`);
        updateVisualization();
    });

    filterInput.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value);
        const slider = document.getElementById('filterValueSlider');
        if (isNaN(value)) value = parseFloat(slider.min);
        value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), value));
        e.target.value = value;
        slider.value = value;
        window.scalePreferences.filterValue = value;
        debugLog.log(`Filter value: ${value}`);
        updateVisualization();
    });

    // Zoom controls
    setupZoomControls();

    // FFT size
    setupFFTControls();

    // Waveform controls
    setupWaveformControls();

    // MFCC controls
    setupMFCCControls();

    // Pitch controls
    setupPitchControls();

    // Intensity controls
    setupIntensityControls();
}

function setupZoomControls() {
    // Zoom X
    const zoomXSlider = document.getElementById('zoomXSlider');
    const zoomXInput = document.getElementById('zoomXInput');

    zoomXSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        zoomXInput.value = value;
        window.scalePreferences.zoomX = value;
        debugLog.log(`Zoom X: ${value}×`);
        updateVisualization();
    });

    zoomXInput.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) value = 1;
        value = Math.max(1, Math.min(10, value));
        e.target.value = value;
        zoomXSlider.value = value;
        window.scalePreferences.zoomX = value;
        debugLog.log(`Zoom X: ${value}×`);
        updateVisualization();
    });

    // Zoom Y
    const zoomYSlider = document.getElementById('zoomYSlider');
    const zoomYInput = document.getElementById('zoomYInput');

    zoomYSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        zoomYInput.value = value;
        window.scalePreferences.zoomY = value;
        debugLog.log(`Zoom Y: ${value}×`);
        updateVisualization();
    });

    zoomYInput.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) value = 1;
        value = Math.max(1, Math.min(10, value));
        e.target.value = value;
        zoomYSlider.value = value;
        window.scalePreferences.zoomY = value;
        debugLog.log(`Zoom Y: ${value}×`);
        updateVisualization();
    });
}

function setupFFTControls() {
    const fftSizeSlider = document.getElementById('fftSizeSlider');
    const fftSizeSelect = document.getElementById('fftSizeSelect');

    fftSizeSlider.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        const fftSize = fftSizeOptions[index];
        fftSizeSelect.value = fftSize;
        window.scalePreferences.fftSize = fftSize;
        // Clear spectrum cache when FFT size changes
        spectrumCache.nativeSpectrum = null;
        spectrumCache.userSpectrum = null;
        debugLog.log(`FFT size: ${fftSize}`);
        updateVisualization();
    });

    fftSizeSelect.addEventListener('change', (e) => {
        const fftSize = parseInt(e.target.value);
        const index = fftSizeOptions.indexOf(fftSize);
        fftSizeSlider.value = index;
        window.scalePreferences.fftSize = fftSize;
        // Clear spectrum cache when FFT size changes
        spectrumCache.nativeSpectrum = null;
        spectrumCache.userSpectrum = null;
        debugLog.log(`FFT size: ${fftSize}`);
        updateVisualization();
    });

    // Hop size
    document.getElementById('hopSizeSelect').addEventListener('change', (e) => {
        window.scalePreferences.hopSize = e.target.value;
        debugLog.log(`Hop size: ${e.target.value}`);
        updateVisualization();
    });
}

function setupWaveformControls() {
    // Waveform filter mode
    const waveformFilterModeSelect = document.getElementById('waveformFilterModeSelect');
    if (waveformFilterModeSelect) {
        waveformFilterModeSelect.addEventListener('change', (e) => {
            window.scalePreferences.waveformFilterMode = e.target.value;
            updateScaleControlsVisibility();
            updateWaveformFilterControls();
            updateVisualization();
        });
    }

    // Waveform filter value
    const filterSlider = document.getElementById('waveformFilterValueSlider');
    const filterInput = document.getElementById('waveformFilterValueInput');

    if (filterSlider) {
        filterSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (filterInput) filterInput.value = value;
            updateWaveformFilterValue(value);
            updateVisualization();
        });
    }

    if (filterInput) {
        filterInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (filterSlider) filterSlider.value = value;
            updateWaveformFilterValue(value);
            updateVisualization();
        });
    }

    // Waveform zoom X
    const waveZoomXSlider = document.getElementById('waveformZoomXSlider');
    const waveZoomXInput = document.getElementById('waveformZoomXInput');

    if (waveZoomXSlider) {
        waveZoomXSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (waveZoomXInput) waveZoomXInput.value = value;
            window.scalePreferences.waveformZoomX = value;
            updateVisualization();
        });
    }

    if (waveZoomXInput) {
        waveZoomXInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (waveZoomXSlider) waveZoomXSlider.value = value;
            window.scalePreferences.waveformZoomX = value;
            updateVisualization();
        });
    }

    // Waveform zoom Y
    const waveZoomYSlider = document.getElementById('waveformZoomYSlider');
    const waveZoomYInput = document.getElementById('waveformZoomYInput');

    if (waveZoomYSlider) {
        waveZoomYSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (waveZoomYInput) waveZoomYInput.value = value;
            window.scalePreferences.waveformZoomY = value;
            updateVisualization();
        });
    }

    if (waveZoomYInput) {
        waveZoomYInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (waveZoomYSlider) waveZoomYSlider.value = value;
            window.scalePreferences.waveformZoomY = value;
            updateVisualization();
        });
    }

    // Time crop
    const timeStartSlider = document.getElementById('waveformTimeStartSlider');
    const timeStartInput = document.getElementById('waveformTimeStartInput');
    const timeEndSlider = document.getElementById('waveformTimeEndSlider');
    const timeEndInput = document.getElementById('waveformTimeEndInput');

    if (timeStartSlider) {
        timeStartSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (timeStartInput) timeStartInput.value = value;
            window.scalePreferences.waveformTimeStart = value;
            updateVisualization();
        });
    }

    if (timeStartInput) {
        timeStartInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (timeStartSlider) timeStartSlider.value = value;
            window.scalePreferences.waveformTimeStart = value;
            updateVisualization();
        });
    }

    if (timeEndSlider) {
        timeEndSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (timeEndInput) timeEndInput.value = value;
            window.scalePreferences.waveformTimeEnd = value;
            updateVisualization();
        });
    }

    if (timeEndInput) {
        timeEndInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (timeEndSlider) timeEndSlider.value = value;
            window.scalePreferences.waveformTimeEnd = value;
            updateVisualization();
        });
    }

    // Downsampling mode
    const downsampleSelect = document.getElementById('waveformDownsampleSelect');
    if (downsampleSelect) {
        downsampleSelect.addEventListener('change', (e) => {
            window.scalePreferences.waveformDownsample = e.target.value;
            updateVisualization();
        });
    }

    // Normalization mode
    const normalizationSelect = document.getElementById('waveformNormalizationSelect');
    if (normalizationSelect) {
        normalizationSelect.addEventListener('change', (e) => {
            window.scalePreferences.waveformNormalization = e.target.value;
            updateVisualization();
        });
    }
}

function setupMFCCControls() {
    // MFCC num filters
    const numFiltersSlider = document.getElementById('mfccNumFiltersSlider');
    const numFiltersInput = document.getElementById('mfccNumFiltersInput');

    numFiltersSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        numFiltersInput.value = value;
        window.scalePreferences.mfccNumFilters = value;
        updateVisualization();
    });

    numFiltersInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        numFiltersSlider.value = value;
        window.scalePreferences.mfccNumFilters = value;
        updateVisualization();
    });

    // MFCC coefficient range
    const coeffStartSlider = document.getElementById('mfccCoeffStartSlider');
    const coeffStartInput = document.getElementById('mfccCoeffStartInput');
    const coeffEndSlider = document.getElementById('mfccCoeffEndSlider');
    const coeffEndInput = document.getElementById('mfccCoeffEndInput');

    coeffStartSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        coeffStartInput.value = value;
        window.scalePreferences.mfccCoeffStart = value;
        updateVisualization();
    });

    coeffStartInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        coeffStartSlider.value = value;
        window.scalePreferences.mfccCoeffStart = value;
        updateVisualization();
    });

    coeffEndSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        coeffEndInput.value = value;
        window.scalePreferences.mfccCoeffEnd = value;
        updateVisualization();
    });

    coeffEndInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        coeffEndSlider.value = value;
        window.scalePreferences.mfccCoeffEnd = value;
        updateVisualization();
    });

    // MFCC delta checkbox
    document.getElementById('mfccDeltaCheck').addEventListener('change', (e) => {
        window.scalePreferences.mfccDelta = e.target.checked;
        updateVisualization();
    });

    // MFCC lifter
    const lifterSlider = document.getElementById('mfccLifterSlider');
    const lifterInput = document.getElementById('mfccLifterInput');

    lifterSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        lifterInput.value = value;
        window.scalePreferences.mfccLifter = value;
        updateVisualization();
    });

    lifterInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        lifterSlider.value = value;
        window.scalePreferences.mfccLifter = value;
        updateVisualization();
    });

    // MFCC filter mode
    document.getElementById('mfccFilterModeSelect').addEventListener('change', (e) => {
        window.scalePreferences.mfccFilterMode = e.target.value;
        updateScaleControlsVisibility();
        updateMfccFilterControls();
        updateVisualization();
    });

    // MFCC zoom
    const mfccZoomXSlider = document.getElementById('mfccZoomXSlider');
    const mfccZoomXInput = document.getElementById('mfccZoomXInput');

    mfccZoomXSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        mfccZoomXInput.value = value;
        window.scalePreferences.mfccZoomX = value;
        updateVisualization();
    });

    mfccZoomXInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        mfccZoomXSlider.value = value;
        window.scalePreferences.mfccZoomX = value;
        updateVisualization();
    });

    // MFCC colormap
    document.getElementById('mfccColormapSelect').addEventListener('change', (e) => {
        window.scalePreferences.mfccColormap = e.target.value;
        updateVisualization();
    });

    // MFCC symmetric
    document.getElementById('mfccSymmetricCheck').addEventListener('change', (e) => {
        window.scalePreferences.mfccSymmetric = e.target.checked;
        updateVisualization();
    });

    // MFCC normalization
    document.getElementById('mfccNormalizationSelect').addEventListener('change', (e) => {
        window.scalePreferences.mfccNormalization = e.target.value;
        updateVisualization();
    });
}

function setupPitchControls() {
    // Pitch min confidence
    const confSlider = document.getElementById('pitchConfidenceSlider');
    const confInput = document.getElementById('pitchConfidenceInput');

    confSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        confInput.value = value;
        window.scalePreferences.pitchMinConfidence = value;
        updateVisualization();
    });

    confInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        confSlider.value = value;
        window.scalePreferences.pitchMinConfidence = value;
        updateVisualization();
    });

    // Pitch smoothing
    document.getElementById('pitchSmoothingCheck').addEventListener('change', (e) => {
        window.scalePreferences.pitchSmoothing = e.target.checked;
        updateScaleControlsVisibility();
        updateVisualization();
    });

    // Pitch smoothing window
    const smoothSlider = document.getElementById('pitchSmoothingWindowSlider');
    const smoothInput = document.getElementById('pitchSmoothingWindowInput');

    smoothSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        smoothInput.value = value;
        window.scalePreferences.pitchSmoothingWindow = value;
        updateVisualization();
    });

    smoothInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        smoothSlider.value = value;
        window.scalePreferences.pitchSmoothingWindow = value;
        updateVisualization();
    });

    // Pitch Y range
    const yMinSlider = document.getElementById('pitchYMinSlider');
    const yMinInput = document.getElementById('pitchYMinInput');
    const yMaxSlider = document.getElementById('pitchYMaxSlider');
    const yMaxInput = document.getElementById('pitchYMaxInput');

    yMinSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        yMinInput.value = value;
        window.scalePreferences.pitchYMin = value;
        updateVisualization();
    });

    yMinInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        yMinSlider.value = value;
        window.scalePreferences.pitchYMin = value;
        updateVisualization();
    });

    yMaxSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        yMaxInput.value = value;
        window.scalePreferences.pitchYMax = value;
        updateVisualization();
    });

    yMaxInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        yMaxSlider.value = value;
        window.scalePreferences.pitchYMax = value;
        updateVisualization();
    });
}

function setupIntensityControls() {
    // Intensity normalization
    document.getElementById('intensityNormalizationSelect')?.addEventListener('change', (e) => {
        window.scalePreferences.intensityNormalization = e.target.value;
        updateVisualization();
    });

    // Intensity smoothing
    document.getElementById('intensitySmoothingCheck')?.addEventListener('change', (e) => {
        window.scalePreferences.intensitySmoothing = e.target.checked;
        updateVisualization();
    });

    // Intensity log scale
    document.getElementById('intensityLogScaleCheck')?.addEventListener('change', (e) => {
        window.scalePreferences.intensityLogScale = e.target.checked;
        updateVisualization();
    });
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
function updateScaleControlsVisibility() {
    // Show/hide control groups based on current visualization
    const waveformControls = document.getElementById('waveformControls');
    const spectrogramControls = document.getElementById('spectrogramControls');
    const mfccControls = document.getElementById('mfccControls');
    const pitchControls = document.getElementById('pitchControls');
    const intensityControls = document.getElementById('intensityControls');
    const featureControls = document.getElementById('featureControls');

    // Hide all
    if (waveformControls) waveformControls.style.display = 'none';
    if (spectrogramControls) spectrogramControls.style.display = 'none';
    if (mfccControls) mfccControls.style.display = 'none';
    if (pitchControls) pitchControls.style.display = 'none';
    if (intensityControls) intensityControls.style.display = 'none';
    if (featureControls) featureControls.style.display = 'none';

    // Show relevant controls
    switch (currentViz) {
        case 'waveform':
            if (waveformControls) waveformControls.style.display = 'block';
            break;
        case 'spectrum':
        case 'spectrogram':
            if (spectrogramControls) spectrogramControls.style.display = 'block';
            break;
        case 'mfcc':
            if (mfccControls) mfccControls.style.display = 'block';
            break;
        case 'pitch':
            if (pitchControls) pitchControls.style.display = 'block';
            break;
        case 'intensity':
            if (intensityControls) intensityControls.style.display = 'block';
            break;
        case 'features':
            if (featureControls) featureControls.style.display = 'block';
            break;
    }

    // Update filter control visibility
    const filterValueGroup = document.getElementById('filterValueGroup');
    if (filterValueGroup) {
        filterValueGroup.style.display =
            window.scalePreferences.filterMode === 'none' ? 'none' : 'block';
    }

    const waveformFilterValueGroup = document.getElementById('waveformFilterValueGroup');
    if (waveformFilterValueGroup) {
        waveformFilterValueGroup.style.display =
            window.scalePreferences.waveformFilterMode === 'none' ? 'none' : 'block';
    }

    const mfccFilterValueGroup = document.getElementById('mfccFilterValueGroup');
    if (mfccFilterValueGroup) {
        mfccFilterValueGroup.style.display =
            window.scalePreferences.mfccFilterMode === 'none' ? 'none' : 'block';
    }

    const pitchSmoothingWindowGroup = document.getElementById('pitchSmoothingWindowGroup');
    if (pitchSmoothingWindowGroup) {
        pitchSmoothingWindowGroup.style.display =
            window.scalePreferences.pitchSmoothing ? 'block' : 'none';
    }
}

function updateFilterControls() {
    const mode = window.scalePreferences.filterMode;
    const slider = document.getElementById('filterValueSlider');
    const input = document.getElementById('filterValueInput');
    const label = document.getElementById('filterValueLabel');

    if (!slider || !input || !label) return;

    switch (mode) {
        case 'percentile':
            slider.min = 0;
            slider.max = 100;
            slider.step = 1;
            input.min = 0;
            input.max = 100;
            input.step = 1;
            slider.value = window.scalePreferences.filterValue;
            input.value = window.scalePreferences.filterValue;
            label.textContent = 'Percentile:';
            break;
        case 'threshold':
            slider.min = -120;
            slider.max = 0;
            slider.step = 1;
            input.min = -120;
            input.max = 0;
            input.step = 1;
            slider.value = window.scalePreferences.filterValue;
            input.value = window.scalePreferences.filterValue;
            label.textContent = 'Threshold (dB):';
            break;
    }
}

function updateWaveformFilterControls() {
    const mode = window.scalePreferences.waveformFilterMode;
    const slider = document.getElementById('waveformFilterValueSlider');
    const input = document.getElementById('waveformFilterValueInput');
    const label = document.getElementById('waveformFilterValueLabel');

    if (!slider || !input || !label) return;

    switch (mode) {
        case 'threshold':
            slider.min = 0;
            slider.max = 0.5;
            slider.step = 0.001;
            input.min = 0;
            input.max = 0.5;
            input.step = 0.001;
            slider.value = window.scalePreferences.waveformThreshold;
            input.value = window.scalePreferences.waveformThreshold;
            label.textContent = 'Threshold:';
            break;
        case 'noisegate':
            slider.min = 0;
            slider.max = 0.5;
            slider.step = 0.001;
            input.min = 0;
            input.max = 0.5;
            input.step = 0.001;
            slider.value = window.scalePreferences.waveformThreshold;
            input.value = window.scalePreferences.waveformThreshold;
            label.textContent = 'Gate:';
            break;
        case 'percentile':
            slider.min = 0;
            slider.max = 100;
            slider.step = 1;
            input.min = 0;
            input.max = 100;
            input.step = 1;
            slider.value = window.scalePreferences.waveformPercentile;
            input.value = window.scalePreferences.waveformPercentile;
            label.textContent = 'Percentile:';
            break;
        case 'rms':
            slider.min = 16;
            slider.max = 512;
            slider.step = 16;
            input.min = 16;
            input.max = 512;
            input.step = 16;
            slider.value = window.scalePreferences.waveformRmsWindow;
            input.value = window.scalePreferences.waveformRmsWindow;
            label.textContent = 'Window:';
            break;
    }
}

function updateMfccFilterControls() {
    const mode = window.scalePreferences.mfccFilterMode;
    const slider = document.getElementById('mfccFilterValueSlider');
    const input = document.getElementById('mfccFilterValueInput');
    const label = document.getElementById('mfccFilterValueLabel');

    if (!slider || !input || !label) return;

    switch (mode) {
        case 'percentile':
            slider.min = 0;
            slider.max = 100;
            slider.step = 1;
            input.min = 0;
            input.max = 100;
            input.step = 1;
            slider.value = window.scalePreferences.mfccFilterValue;
            input.value = window.scalePreferences.mfccFilterValue;
            label.textContent = 'Percentile:';
            break;
        case 'threshold':
            slider.min = -50;
            slider.max = 50;
            slider.step = 1;
            input.min = -50;
            input.max = 50;
            input.step = 1;
            slider.value = window.scalePreferences.mfccFilterValue;
            input.value = window.scalePreferences.mfccFilterValue;
            label.textContent = 'Threshold:';
            break;
    }
}

function updateWaveformFilterValue(value) {
    const mode = window.scalePreferences.waveformFilterMode;
    switch (mode) {
        case 'threshold':
        case 'noisegate':
            window.scalePreferences.waveformThreshold = value;
            break;
        case 'percentile':
            window.scalePreferences.waveformPercentile = value;
            break;
        case 'rms':
            window.scalePreferences.waveformRmsWindow = value;
            break;
    }
}

function updateVisualization() {
    if (!nativeBuffer || !userBuffer) {
        debugLog.log('Buffers not ready for visualization');
        return;
    }

    debugLog.log(`Rendering ${currentViz} visualization`);

    // Get visualizer instance (assumes it was stored globally during init)
    const canvas = document.getElementById('vizCanvas');
    if (!canvas) {
        debugLog.log('Canvas not found', 'error');
        return;
    }
    const visualizer = canvas._visualizer || new Visualizer(canvas);
    if (!canvas._visualizer) canvas._visualizer = visualizer;

    switch (currentViz) {
        case 'waveform':
            visualizer.drawWaveform(nativeBuffer, userBuffer);
            break;
        case 'spectrum':
            visualizer.drawSpectrum(nativeBuffer, userBuffer);
            break;
        case 'spectrogram':
            visualizer.drawSpectrogram(nativeBuffer, userBuffer);
            break;
        case 'pitch':
            if (analysisResults && analysisResults.features) {
                visualizer.drawPitch(analysisResults);
            } else {
                showPlaceholder(visualizer, 'Click "Analyze Pronunciation" to see pitch analysis');
            }
            break;
        case 'intensity':
            if (analysisResults && analysisResults.features) {
                visualizer.drawIntensity(analysisResults);
            } else {
                showPlaceholder(visualizer, 'Click "Analyze Pronunciation" to see intensity analysis');
            }
            break;
        case 'mfcc':
            if (analysisResults && analysisResults.features) {
                visualizer.drawMFCCs(analysisResults);
            } else {
                showPlaceholder(visualizer, 'Click "Analyze Pronunciation" to see MFCC analysis');
            }
            break;
        case 'formants':
            if (analysisResults && analysisResults.features) {
                visualizer.drawFormants(analysisResults);
            } else {
                showPlaceholder(visualizer, 'Click "Analyze Pronunciation" to see formant analysis');
            }
            break;
        case 'features':
            if (analysisResults && analysisResults.features) {
                visualizer.drawAllFeatures(analysisResults);
            } else {
                showPlaceholder(visualizer, 'Click "Analyze Pronunciation" to see all features');
            }
            break;
    }

    updateRawDataExportButton();
}

function showPlaceholder(visualizer, message) {
    visualizer.ctx.fillStyle = '#1f2937';
    visualizer.ctx.fillRect(0, 0, visualizer.canvas.width, visualizer.canvas.height);
    visualizer.ctx.fillStyle = 'white';
    visualizer.ctx.font = '16px sans-serif';
    visualizer.ctx.textAlign = 'center';
    visualizer.ctx.fillText(message,
        visualizer.canvas.width / 2, visualizer.canvas.height / 2);
}

function showResults(results) {
    const output = document.getElementById('analysisOutput');
    document.getElementById('analysisPanel').classList.add('show');

    // Update score display
    const score = results.score;
    const maxDash = 440;
    const offset = maxDash - (score / 100) * maxDash;

    document.getElementById('results').classList.add('show');

    // Animate score circle
    setTimeout(() => {
        document.getElementById('scoreFill').style.strokeDashoffset = offset;
        document.getElementById('scoreText').textContent = results.score;
    }, 100);

    // Update feedback
    document.getElementById('feedback').textContent =
        score >= 85 ? 'Excellent!' :
            score >= 70 ? 'Good job!' :
                score >= 50 ? 'Needs improvement' :
                    'Keep practicing';

    document.getElementById('detailedFeedback').textContent = results.feedback;

    // Update method indicator
    const methodIndicator = document.getElementById('methodIndicator');
    if (methodIndicator) {
        methodIndicator.textContent = `Using ${results.method || 'combined'} method`;
    }

    // Update breakdown
    const breakdown = results.breakdown;
    for (const [type, score] of Object.entries(breakdown)) {
        const barElem = document.getElementById(`${type}Bar`);
        const scoreElem = document.getElementById(`${type}Score`);
        if (barElem && scoreElem) {
            barElem.style.width = `${score}%`;
            scoreElem.textContent = `${score}%`;
        }
    }
}

function showDetailedAnalysis(report) {
    const container = document.getElementById('detailedAnalysisContent');
    if (!container || !report) return;

    let html = '<div class="analysis-sections">';

    // Duration
    if (report.metadata) {
        html += `
            <div class="analysis-section">
                <h4>Duration</h4>
                <p>Native: ${report.metadata.nativeDuration.toFixed(2)}s</p>
                <p>User: ${report.metadata.userDuration.toFixed(2)}s</p>
            </div>
        `;
    }

    // Pitch
    if (report.pitch) {
        html += `
            <div class="analysis-section">
                <h4>Pitch Analysis</h4>
                <p>${report.pitch.description || 'Pitch comparison completed'}</p>
            </div>
        `;
    }

    // MFCCs
    if (report.mfcc) {
        html += `
            <div class="analysis-section">
                <h4>Spectral Quality</h4>
                <p>${report.mfcc.description || 'MFCC comparison completed'}</p>
            </div>
        `;
    }

    // Stress
    if (report.stress) {
        html += `
            <div class="analysis-section">
                <h4>Stress Pattern</h4>
                <p>${report.stress.description || 'Stress pattern analyzed'}</p>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function updateRawDataExportButton() {
    const container = document.getElementById('rawDataExportContainer');
    if (!container) return;

    let hasData = false;

    if (currentViz === 'waveform' || currentViz === 'spectrum' || currentViz === 'spectrogram') {
        hasData = nativeBuffer && userBuffer;
    } else {
        hasData = analysisResults && analysisResults.features;
    }

    container.style.display = hasData ? 'block' : 'none';
}

// ===================================================================
// EXPORT HANDLERS
// ===================================================================
function setupExportHandlers() {
    // Export analysis as JSON
    const exportAnalysisBtn = document.getElementById('exportAnalysis');
    if (exportAnalysisBtn) {
        exportAnalysisBtn.addEventListener('click', () => {
            if (!analysisResults) {
                alert('No analysis results to export');
                return;
            }

            const data = JSON.stringify(analysisResults, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pronunciation-analysis-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            debugLog.log('Analysis exported', 'success');
        });
    }

    // Export raw data
    const exportRawBtn = document.getElementById('exportRawData');
    if (exportRawBtn) {
        exportRawBtn.addEventListener('click', () => {
            const modal = document.getElementById('exportModal');
            if (modal) modal.style.display = 'flex';
        });
    }

    const exportRawDataBtn = document.getElementById('exportRawBtn');
    if (exportRawDataBtn) {
        exportRawDataBtn.addEventListener('click', () => {
            exportRawData(false);
            const modal = document.getElementById('exportModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const exportFilteredBtn = document.getElementById('exportFilteredBtn');
    if (exportFilteredBtn) {
        exportFilteredBtn.addEventListener('click', () => {
            exportRawData(true);
            const modal = document.getElementById('exportModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const exportCancelBtn = document.getElementById('exportCancelBtn');
    if (exportCancelBtn) {
        exportCancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('exportModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.style.display = 'none';
            }
        });
    }
}

function exportRawData(filtered = false) {
    const data = {
        visualization: currentViz,
        timestamp: new Date().toISOString(),
        settings: window.scalePreferences,
        native: {},
        user: {}
    };

    // Add visualization-specific data
    switch (currentViz) {
        case 'waveform':
            data.native.samples = Array.from(nativeBuffer.getChannelData(0));
            data.user.samples = Array.from(userBuffer.getChannelData(0));
            data.native.sampleRate = nativeBuffer.sampleRate;
            data.user.sampleRate = userBuffer.sampleRate;
            break;

        case 'pitch':
            if (analysisResults && analysisResults.features) {
                data.native.pitch = analysisResults.features.nativePitch;
                data.user.pitch = analysisResults.features.userPitch;
            }
            break;

        case 'intensity':
            if (analysisResults && analysisResults.features) {
                data.native.intensity = analysisResults.features.nativeIntensity;
                data.user.intensity = analysisResults.features.userIntensity;
            }
            break;

        case 'mfcc':
            if (analysisResults && analysisResults.features) {
                data.native.mfccs = analysisResults.features.nativeMFCCs;
                data.user.mfccs = analysisResults.features.userMFCCs;
            }
            break;
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentViz}-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    debugLog.log(`${currentViz} data exported (${filtered ? 'filtered' : 'raw'})`, 'success');
}

// ===================================================================
// AI HANDLERS
// ===================================================================
function setupAIHandlers(aiUI) {
    // Save API key
    const saveKeyBtn = document.getElementById('saveApiKey');
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            aiUI.handleSaveKey();
        });
    }

    // Clear API key
    const clearKeyBtn = document.getElementById('clearApiKey');
    if (clearKeyBtn) {
        clearKeyBtn.addEventListener('click', () => {
            aiUI.handleClearKey();
        });
    }

    // Run AI analysis
    const aiAnalysisBtn = document.getElementById('aiAnalysisBtn');
    if (aiAnalysisBtn) {
        aiAnalysisBtn.addEventListener('click', () => {
            aiUI.runAnalysis();
        });
    }
}

// ===================================================================
// PROCESSING OPTIONS HANDLERS
// ===================================================================
function setupProcessingOptions() {
    // Speech Filter toggle (70-12000 Hz)
    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) {
        filterToggle.addEventListener('change', (e) => {
            useFilter = e.target.checked;
            debugLog.log(`Speech filter: ${useFilter ? 'enabled' : 'disabled'}`);
        });
    }

    // DTW toggle
    const dtwToggle = document.getElementById('dtwToggle');
    if (dtwToggle) {
        dtwToggle.addEventListener('change', (e) => {
            useDTW = e.target.checked;
            debugLog.log(`DTW: ${useDTW ? 'enabled' : 'disabled'}`);
        });
    }
}

// ===================================================================
// COPY PROMPT HANDLERS
// ===================================================================
function setupCopyPromptHandlers() {
    const copyBalancedBtn = document.getElementById('copyBalancedPrompt');
    const copyFullBtn = document.getElementById('copyFullPrompt');

    if (copyBalancedBtn) {
        copyBalancedBtn.addEventListener('click', () => {
            copyPromptToClipboard('balanced');
        });
    }

    if (copyFullBtn) {
        copyFullBtn.addEventListener('click', () => {
            copyPromptToClipboard('full');
        });
    }
}

function copyPromptToClipboard(mode = 'balanced') {
    if (!analysisResults) {
        debugLog.log('No analysis results to copy', 'error');
        alert('Please run analysis first');
        return;
    }

    const targetWord = document.getElementById('targetWord')?.textContent || 'Unknown';
    const score = analysisResults.score;
    const breakdown = analysisResults.breakdown;

    let prompt = '';

    if (mode === 'balanced') {
        prompt = `I'm practicing pronunciation of "${targetWord}".

My overall score: ${score}/100

Score breakdown:
- Pitch/Intonation: ${breakdown.pitch}%
- MFCCs (Spectral): ${breakdown.mfcc}%
- Envelope: ${breakdown.envelope}%
- Duration: ${breakdown.duration}%
- Stress Position: ${breakdown.stressPosition}%
- Stress Pattern: ${breakdown.stress}%
- Voice Quality: ${breakdown.quality}%

Please analyze my pronunciation and give specific tips for improvement.`;
    } else {
        // Full mode - include detailed analysis
        prompt = `I'm practicing pronunciation of "${targetWord}".

=== ANALYSIS RESULTS ===
Overall Score: ${score}/100
Feedback: ${analysisResults.feedback || 'N/A'}
Method: ${analysisResults.method || 'combined'}

=== DETAILED BREAKDOWN ===
- Pitch/Intonation (20%): ${breakdown.pitch}%
- MFCCs/Spectral (25%): ${breakdown.mfcc}%
- Envelope (15%): ${breakdown.envelope}%
- Duration (10%): ${breakdown.duration}%
- Stress Position (10%): ${breakdown.stressPosition}%
- Stress Pattern (10%): ${breakdown.stress}%
- Voice Quality (10%): ${breakdown.quality}%

=== SETTINGS ===
- Speech Filter: ${useFilter ? 'Enabled (70-12000 Hz)' : 'Disabled'}
- DTW: ${useDTW ? 'Enabled' : 'Disabled'}
- Native Duration: ${nativeBuffer ? nativeBuffer.duration.toFixed(2) + 's' : 'N/A'}
- User Duration: ${userBuffer ? userBuffer.duration.toFixed(2) + 's' : 'N/A'}

Please provide detailed analysis and specific tips for improving my pronunciation.`;
    }

    navigator.clipboard.writeText(prompt).then(() => {
        const btnId = mode === 'balanced' ? 'copyBalancedPrompt' : 'copyFullPrompt';
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalText = btn.querySelector('span:last-child')?.textContent;
            const textSpan = btn.querySelector('span:last-child');
            if (textSpan) {
                textSpan.textContent = 'Copied!';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                }, 2000);
            }
        }
        debugLog.log(`${mode} prompt copied to clipboard`, 'success');
    }).catch(err => {
        debugLog.log(`Failed to copy: ${err.message}`, 'error');
        alert('Failed to copy to clipboard');
    });
}

// ===================================================================
// APPLICATION START
// ===================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module usage
export { init };

