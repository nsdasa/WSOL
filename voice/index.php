<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Pronunciation Analyzer</title>

    <!-- CSS Modules -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/controls.css">
    <link rel="stylesheet" href="css/results.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Professional Pronunciation Analyzer</h1>
            <p>Advanced acoustic analysis with pitch tracking, MFCCs, and multi-feature scoring</p>
        </div>

        <div class="content">
            <div id="micStatus" class="mic-status ready" style="display: none;">
                Microphone ready!
            </div>

            <div class="word-display">
                <h2 id="targetWord">Upload Audio File</h2>
                <p id="targetTranslation">Load a native speaker recording to begin</p>
            </div>

            <div class="upload-section" id="uploadSection">
                <div class="file-input-wrapper">
                    <input type="file" id="nativeAudioFile" accept="audio/*" />
                    <label for="nativeAudioFile" class="file-input-label">
                        <span>📁</span>
                        <span>Upload Native Audio</span>
                    </label>
                </div>
            </div>

            <div class="file-loaded" id="fileLoaded">
                <div class="file-loaded-info">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="file-icon">🎵</div>
                        <div>
                            <h4 id="fileName" style="color: #059669; margin-bottom: 5px;">audio.mp3</h4>
                            <p style="font-size: 13px; color: #6b7280;"><span id="fileDurationText">Duration: 0.0s</span></p>
                        </div>
                    </div>
                    <button id="playNative" class="play-btn">▶️ Play Native</button>
                </div>
            </div>

            <div class="user-recording-section" id="userRecordingSection">
                <div class="file-loaded-info">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="file-icon user">🎤</div>
                        <div>
                            <h4 style="color: #dc2626; margin-bottom: 5px;">Your Recording</h4>
                            <p style="font-size: 13px; color: #6b7280;"><span id="userDurationText">Duration: 0.0s</span></p>
                        </div>
                    </div>
                    <button id="playUser" class="play-btn user">▶️ Play Your Recording</button>
                </div>
            </div>

            <!-- API Key Configuration -->
            <div class="filter-toggle-container" id="apiKeyContainer" style="background: #fef3c7; border-left-color: #f59e0b;">
                <details style="width: 100%;">
                    <summary style="cursor: pointer; font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 10px;">
                        🔑 AI Analysis API Key
                        <span id="apiStatus" class="api-status not-configured">Not Configured</span>
                    </summary>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fbbf24;">
                        <p style="font-size: 12px; color: #78350f; margin-bottom: 10px;">
                            Enter your Anthropic API key to enable AI-powered pronunciation feedback.
                            Your key is stored only in your browser's localStorage.
                        </p>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                            <input type="password" id="apiKeyInput" placeholder="sk-ant-api03-..."
                                   style="flex: 1; min-width: 200px; padding: 8px; border: 1px solid #fbbf24; border-radius: 4px; font-family: monospace; font-size: 12px;">
                            <button id="saveApiKey" class="btn btn-secondary" style="padding: 8px 15px; font-size: 12px; background: #f59e0b;">Save Key</button>
                            <button id="clearApiKey" class="btn btn-secondary" style="padding: 8px 15px; font-size: 12px;">Clear</button>
                        </div>
                    </div>
                </details>
            </div>

            <!-- Speech Filter Toggle -->
            <div class="filter-toggle-container" id="filterToggleContainer">
                <input type="checkbox" id="filterToggle" class="filter-checkbox" checked>
                <label for="filterToggle" class="filter-label">
                    🎚️ Apply Speech Filter (70-12000 Hz)
                </label>
                <span class="filter-info">Removes noise outside human speech range</span>
            </div>

            <!-- DTW Toggle -->
            <div class="filter-toggle-container" id="dtwToggleContainer">
                <input type="checkbox" id="dtwToggle" class="filter-checkbox" checked>
                <label for="dtwToggle" class="filter-label">
                    🔄 Use DTW (Dynamic Time Warping)
                </label>
                <span class="filter-info">Matches patterns regardless of speech speed</span>
            </div>

            <div class="controls">
                <button id="recordBtn" class="btn btn-secondary" disabled>
                    <span>🎤</span>
                    <span id="recordText">Record Your Voice</span>
                </button>
                <button id="stopBtn" class="btn btn-secondary" disabled style="background: #dc2626;">
                    <span>⏹️</span>
                    <span>Stop Recording</span>
                </button>
                <div class="file-input-wrapper">
                    <input type="file" id="userAudioFile" accept="audio/*" disabled />
                    <label for="userAudioFile" class="file-input-label" id="userUploadLabel" style="opacity: 0.5; cursor: not-allowed;">
                        <span>📁</span>
                        <span>Upload Your Audio</span>
                    </label>
                </div>
                <button id="compareBtn" class="btn btn-primary" disabled>
                    <span>📊</span>
                    <span>Analyze Pronunciation</span>
                </button>
                <button id="toggleDebug" class="btn btn-secondary">
                    <span>🐛</span>
                    <span>Toggle Debug</span>
                </button>
                <button id="exportAnalysis" class="btn btn-secondary" disabled>
                    <span>📄</span>
                    <span>Export Analysis Data</span>
                </button>
            </div>

            <div class="recording-indicator" id="recordingIndicator">
                <div class="pulse-dot"></div>
                <span>Recording in progress...</span>
            </div>

            <div class="debug-panel" id="debugPanel">
                <strong>Debug Log:</strong>
                <div id="debugOutput"></div>
            </div>

            <div class="debug-panel" id="analysisPanel" style="max-height: 400px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>Detailed Analysis Output:</strong>
                    <button id="copyAnalysis" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;">
                        📋 Copy to Clipboard
                    </button>
                </div>
                <div id="analysisOutput"></div>
            </div>

            <div class="viz-tabs">
                <button class="viz-tab active" data-viz="waveform">📈 Waveform</button>
                <button class="viz-tab" data-viz="spectrum">📊 Spectrum (FFT)</button>
                <button class="viz-tab" data-viz="spectrogram">🌈 Spectrogram</button>
                <button class="viz-tab" data-viz="pitch">🎵 Pitch Contour</button>
                <button class="viz-tab" data-viz="intensity">💪 Intensity</button>
                <button class="viz-tab" data-viz="mfcc">🎼 MFCCs</button>
                <button class="viz-tab" data-viz="features">📊 All Features</button>
            </div>

            <div class="scale-controls" id="scaleControls" style="display: none;">
                <!-- Waveform Controls -->
                <div id="waveformControls" style="display: none;">
                    <div class="scale-control-group">
                        <label>Amplitude:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="linear" data-type="amplitude">Linear</button>
                            <button data-scale="db" data-type="amplitude">dB</button>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Waveform:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="bipolar" data-type="waveformMode">Bipolar</button>
                            <button data-scale="envelope" data-type="waveformMode">Envelope</button>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Display:</label>
                        <div class="scale-toggle">
                            <button data-scale="separate" data-type="displayMode">Separate</button>
                            <button class="active" data-scale="overlay" data-type="displayMode">Overlay</button>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Filter:</label>
                        <select id="waveformFilterModeSelect" style="padding: 4px 6px; border-radius: 4px; font-size: 12px;">
                            <option value="none">None</option>
                            <option value="threshold">Threshold</option>
                            <option value="noisegate">Noise Gate</option>
                            <option value="percentile">Percentile</option>
                            <option value="rms">RMS Smooth</option>
                        </select>
                    </div>
                    <div class="scale-control-group" id="waveformFilterValueGroup" style="display: none;">
                        <label id="waveformFilterValueLabel">Threshold:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="waveformFilterValueSlider" min="0" max="0.5" value="0.01" step="0.001" style="width: 100px;">
                            <input type="number" id="waveformFilterValueInput" min="0" max="0.5" value="0.01" step="0.001" style="width: 60px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom X:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="waveformZoomXSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="waveformZoomXInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                            <span style="font-size: 11px; color: #6b7280;">×</span>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom Y:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="waveformZoomYSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="waveformZoomYInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                            <span style="font-size: 11px; color: #6b7280;">×</span>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Time:</label>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <input type="number" id="waveformTimeStartInput" min="0" max="1" value="0" step="0.01" style="width: 50px; padding: 4px; font-size: 12px;">
                            <span style="font-size: 11px; color: #6b7280;">to</span>
                            <input type="number" id="waveformTimeEndInput" min="0" max="1" value="1" step="0.01" style="width: 50px; padding: 4px; font-size: 12px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Downsample:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="minmax" data-type="waveformDownsample">Min-Max</button>
                            <button data-scale="max" data-type="waveformDownsample">Peak</button>
                            <button data-scale="avg" data-type="waveformDownsample">Avg</button>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Normalize:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="independent" data-type="waveformNorm">Independent</button>
                            <button data-scale="shared" data-type="waveformNorm">Shared</button>
                        </div>
                    </div>
                </div>

                <!-- Spectrogram Controls -->
                <div id="spectrogramControls" style="display: none;">
                    <div class="scale-control-group">
                        <label>Magnitude:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="linear" data-type="spectrogramMag">Linear</button>
                            <button data-scale="db" data-type="spectrogramMag">dB</button>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Frequency:</label>
                        <div class="scale-toggle">
                            <button class="active" data-scale="linear" data-type="spectrogramFreq">Linear</button>
                            <button data-scale="log" data-type="spectrogramFreq">Log</button>
                            <button data-scale="mel" data-type="spectrogramFreq">Mel</button>
                        </div>
                    </div>
                    <div class="scale-control-group" id="melBinsGroup">
                        <label>Mel Bins:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="melBinsSlider" min="20" max="200" value="80" step="5" style="width: 100px;">
                            <input type="number" id="melBinsInput" min="20" max="200" value="80" step="5" style="width: 60px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Filter Mode:</label>
                        <select id="filterModeSelect" style="padding: 4px 6px; border-radius: 4px; font-size: 12px;">
                            <option value="global" selected>Global Peak %</option>
                            <option value="percentile">Percentile</option>
                            <option value="perbin">Per-Frequency Bin</option>
                            <option value="db">dB Threshold</option>
                            <option value="statistical">Statistical</option>
                        </select>
                    </div>
                    <div class="scale-control-group" id="filterValueGroup">
                        <label id="filterValueLabel">Peak %:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="filterValueSlider" min="0" max="100" value="0" step="1" style="width: 120px;">
                            <input type="number" id="filterValueInput" min="0" max="100" value="0" step="1" style="width: 60px;">
                            <span id="filterValueUnit" style="font-size: 11px; color: #6b7280;">%</span>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom X:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="zoomXSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="zoomXInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom Y:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="zoomYSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="zoomYInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>FFT Size:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="fftSizeSlider" min="0" max="4" value="1" step="1" style="width: 100px;">
                            <select id="fftSizeSelect" style="padding: 4px 6px; border-radius: 4px;">
                                <option value="256">256</option>
                                <option value="512" selected>512</option>
                                <option value="1024">1024</option>
                                <option value="2048">2048</option>
                                <option value="4096">4096</option>
                            </select>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Hop Size:</label>
                        <select id="hopSizeSelect" style="padding: 4px 6px; border-radius: 4px;">
                            <option value="auto">Auto</option>
                            <option value="0.25">25%</option>
                            <option value="0.5">50%</option>
                            <option value="0.75">75%</option>
                        </select>
                    </div>
                </div>

                <!-- MFCC Controls -->
                <div id="mfccControls" style="display: none;">
                    <div class="scale-control-group">
                        <label>Num Filters:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccNumFiltersSlider" min="20" max="128" value="60" step="1" style="width: 100px;">
                            <input type="number" id="mfccNumFiltersInput" min="20" max="128" value="60" step="1" style="width: 60px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Coeff Start:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccCoeffStartSlider" min="0" max="12" value="1" step="1" style="width: 80px;">
                            <input type="number" id="mfccCoeffStartInput" min="0" max="12" value="1" step="1" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Coeff End:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccCoeffEndSlider" min="1" max="20" value="12" step="1" style="width: 80px;">
                            <input type="number" id="mfccCoeffEndInput" min="1" max="20" value="12" step="1" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Derivatives:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 11px; display: flex; align-items: center; gap: 3px;">
                                <input type="checkbox" id="mfccDeltaCheck"> Δ
                            </label>
                            <label style="font-size: 11px; display: flex; align-items: center; gap: 3px;">
                                <input type="checkbox" id="mfccDeltaDeltaCheck"> ΔΔ
                            </label>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Lifter:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccLifterSlider" min="0" max="40" value="0" step="1" style="width: 80px;">
                            <input type="number" id="mfccLifterInput" min="0" max="40" value="0" step="1" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Filter Mode:</label>
                        <select id="mfccFilterModeSelect" style="padding: 4px 6px; border-radius: 4px;">
                            <option value="none">None</option>
                            <option value="percentile">Percentile</option>
                            <option value="threshold">Threshold</option>
                        </select>
                    </div>
                    <div class="scale-control-group" id="mfccFilterValueGroup" style="display: none;">
                        <label id="mfccFilterValueLabel">Threshold:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccFilterValueSlider" min="0" max="100" value="0" step="1" style="width: 100px;">
                            <input type="number" id="mfccFilterValueInput" min="0" max="100" value="0" step="1" style="width: 60px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Per-Bin Norm:</label>
                        <input type="checkbox" id="mfccPerBinNormCheck">
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom X:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccZoomXSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="mfccZoomXInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                            <span style="font-size: 11px; color: #6b7280;">×</span>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Zoom Y:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="mfccZoomYSlider" min="1" max="10" value="1" step="0.1" style="width: 100px;">
                            <input type="number" id="mfccZoomYInput" min="1" max="10" value="1" step="0.1" style="width: 50px;">
                            <span style="font-size: 11px; color: #6b7280;">×</span>
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Colormap:</label>
                        <select id="mfccColormapSelect" style="padding: 4px 6px; border-radius: 4px;">
                            <option value="viridis">Viridis</option>
                            <option value="bluered">Blue-Red</option>
                            <option value="grayscale">Grayscale</option>
                        </select>
                    </div>
                    <div class="scale-control-group">
                        <label>Center at 0:</label>
                        <input type="checkbox" id="mfccSymmetricCheck" checked>
                    </div>
                    <div class="scale-control-group">
                        <label>Normalization:</label>
                        <select id="mfccNormalizationSelect" style="padding: 4px 6px; border-radius: 4px;">
                            <option value="independent">Independent</option>
                            <option value="global">Global</option>
                        </select>
                    </div>
                </div>

                <!-- Pitch Controls -->
                <div id="pitchControls" style="display: none;">
                    <div class="scale-control-group">
                        <label>Confidence:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="pitchConfidenceSlider" min="0" max="0.8" value="0" step="0.05" style="width: 80px;">
                            <input type="number" id="pitchConfidenceInput" min="0" max="0.8" value="0" step="0.05" style="width: 50px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Smoothing:</label>
                        <select id="pitchSmoothingSelect" style="padding: 4px 6px; border-radius: 4px; font-size: 12px;">
                            <option value="median" selected>Median</option>
                            <option value="moving-avg">Moving Avg</option>
                            <option value="savitzky-golay">Savitzky-Golay</option>
                            <option value="none">None (Raw)</option>
                        </select>
                    </div>
                    <div class="scale-control-group" id="pitchSmoothingWindowGroup">
                        <label>Window:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="range" id="pitchSmoothingWindowSlider" min="3" max="15" value="5" step="2" style="width: 60px;">
                            <input type="number" id="pitchSmoothingWindowInput" min="3" max="15" value="5" step="2" style="width: 45px;">
                        </div>
                    </div>
                    <div class="scale-control-group">
                        <label>Scale:</label>
                        <select id="pitchScaleSelect" style="padding: 4px 6px; border-radius: 4px; font-size: 12px;">
                            <option value="linear" selected>Linear (Hz)</option>
                            <option value="semitone">Semitone</option>
                        </select>
                    </div>
                    <div class="scale-control-group">
                        <label>Normalize:</label>
                        <select id="pitchNormalizeSelect" style="padding: 4px 6px; border-radius: 4px; font-size: 12px;">
                            <option value="none" selected>None</option>
                            <option value="mean">To Mean</option>
                        </select>
                    </div>
                    <div class="scale-control-group">
                        <label>Show Confidence:</label>
                        <input type="checkbox" id="pitchShowConfidenceCheck">
                    </div>
                    <div class="scale-control-group">
                        <label>Show Gaps:</label>
                        <input type="checkbox" id="pitchShowUnvoicedCheck" checked>
                    </div>
                    <div class="scale-control-group">
                        <label>Y Range:</label>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <input type="number" id="pitchYMinInput" min="0" max="500" value="0" step="10" style="width: 50px; padding: 4px; font-size: 12px;" placeholder="Auto">
                            <span style="font-size: 11px; color: #6b7280;">-</span>
                            <input type="number" id="pitchYMaxInput" min="0" max="800" value="0" step="10" style="width: 50px; padding: 4px; font-size: 12px;" placeholder="Auto">
                            <span style="font-size: 10px; color: #9ca3af;">Hz (0=auto)</span>
                        </div>
                    </div>
                </div>

                <!-- Intensity Controls -->
                <div id="intensityControls" style="display: none;">
                    <div class="scale-control-group">
                        <label>Normalization:</label>
                        <select id="intensityNormalizationSelect" style="padding: 4px 6px; border-radius: 4px;">
                            <option value="independent">Independent</option>
                            <option value="global">Global</option>
                        </select>
                    </div>
                    <div class="scale-control-group">
                        <label><input type="checkbox" id="intensitySmoothingCheck"> Smoothing</label>
                    </div>
                    <div class="scale-control-group">
                        <label><input type="checkbox" id="intensityLogScaleCheck"> Log Scale</label>
                    </div>
                </div>

                <!-- Feature Controls -->
                <div id="featureControls" style="display: none;">
                    <!-- Placeholder for feature-specific controls -->
                </div>
            </div>

            <div id="rawDataExportContainer" style="display: none; margin-bottom: 15px; text-align: right;">
                <button id="exportRawData" class="btn btn-secondary" style="padding: 10px 20px;">
                    <span>📊</span>
                    <span>Export Raw Data (JSON)</span>
                </button>
            </div>

            <!-- Export Options Modal -->
            <div id="exportModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                <div style="background: white; padding: 25px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Export Options</h3>
                    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">Choose what data to export:</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="exportRawBtn" class="btn" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            📦 Raw Data
                        </button>
                        <button id="exportFilteredBtn" class="btn" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            🎯 Filtered Peaks
                        </button>
                    </div>
                    <button id="exportCancelBtn" style="margin-top: 15px; padding: 8px 16px; background: transparent; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; color: #6b7280; font-size: 13px;">
                        Cancel
                    </button>
                </div>
            </div>

            <div class="canvas-container">
                <canvas id="vizCanvas" width="1200" height="500"></canvas>
            </div>

            <div class="results" id="results">
                <div class="score-display">
                    <div class="score-circle">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" class="score-bg"></circle>
                            <circle cx="50" cy="50" r="45" class="score-fill" id="scoreFill"
                                    stroke-dasharray="283" stroke-dashoffset="283"></circle>
                        </svg>
                        <div class="score-text" id="scoreText">0</div>
                    </div>
                    <div class="score-info">
                        <h3 id="feedback">Analyzing...</h3>
                        <p id="detailedFeedback" style="font-size: 16px; color: #6b7280; line-height: 1.6;"></p>
                        <p id="methodIndicator" style="font-size: 14px; color: #9ca3af; margin-top: 10px; font-style: italic;"></p>
                    </div>
                </div>

                <div class="breakdown">
                    <div class="breakdown-item">
                        <span class="label">Pitch/Intonation (20%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="pitchBar" style="width: 0%"></div>
                        </div>
                        <span id="pitchScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">MFCCs (25%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="mfccBar" style="width: 0%"></div>
                        </div>
                        <span id="mfccScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">Envelope (15%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="envelopeBar" style="width: 0%"></div>
                        </div>
                        <span id="envelopeScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">Duration (10%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="durationBar" style="width: 0%"></div>
                        </div>
                        <span id="durationScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">Stress Position (10%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="stressPositionBar" style="width: 0%"></div>
                        </div>
                        <span id="stressPositionScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">Stress Pattern (10%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="stressBar" style="width: 0%"></div>
                        </div>
                        <span id="stressScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="label">Voice Quality (10%)</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="qualityBar" style="width: 0%"></div>
                        </div>
                        <span id="qualityScore">0%</span>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                    <button id="tryAgain" class="btn btn-primary">
                        <span>🔄</span>
                        <span>Try Again</span>
                    </button>
                    <button id="aiAnalysisBtn" class="btn btn-secondary" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);" disabled>
                        <span>🤖</span>
                        <span>AI Analysis</span>
                    </button>
                    <button id="copyBalancedPrompt" class="btn btn-secondary" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);" disabled>
                        <span>📋</span>
                        <span>Copy Balanced</span>
                    </button>
                    <button id="copyFullPrompt" class="btn btn-secondary" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);" disabled>
                        <span>📄</span>
                        <span>Copy Full</span>
                    </button>
                </div>

                <!-- AI Analysis Results -->
                <div id="aiAnalysisSection" style="display: none; margin-top: 20px;">
                    <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #059669;">🤖 AI Analysis</h4>
                        <div id="aiAnalysisContent" style="line-height: 1.6; color: #1f2937;"></div>
                    </div>
                </div>

                <!-- Detailed Analysis Content -->
                <div id="detailedAnalysisContent" style="margin-top: 20px;"></div>
            </div>
        </div>
    </div>

    <!-- JavaScript Modules -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
