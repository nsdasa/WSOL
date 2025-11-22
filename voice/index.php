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
            <h1>🎯 Professional Pronunciation Analyzer</h1>
            <p>Advanced acoustic analysis for language learning</p>
        </div>

        <div class="content">
            <!-- Word Display -->
            <div class="word-display">
                <h2 id="targetWord">Upload Audio</h2>
                <p id="wordMeaning">Compare your pronunciation with native speaker</p>
            </div>

            <!-- Native Audio Upload -->
            <div class="upload-section" id="nativeUploadSection">
                <h3>📁 Step 1: Upload Native Speaker Audio</h3>
                <div class="file-input-wrapper">
                    <input type="file" id="nativeAudioInput" accept="audio/*">
                    <label for="nativeAudioInput" class="file-input-label">
                        <span>📤</span>
                        <span>Choose Native Audio File</span>
                    </label>
                </div>
                <div class="file-loaded" id="nativeFileLoaded">
                    <div class="file-loaded-info">
                        <div class="file-icon">🎵</div>
                        <span id="nativeFileName">No file loaded</span>
                        <button class="play-btn" id="playNative">▶ Play</button>
                    </div>
                </div>
            </div>

            <!-- User Recording -->
            <div class="upload-section" id="userRecordSection" style="display: none;">
                <h3>🎤 Step 2: Record Your Pronunciation</h3>
                <div class="controls">
                    <button class="btn btn-record" id="recordBtn">
                        <span>🎤</span>
                        <span>Start Recording</span>
                    </button>
                    <button class="btn btn-stop" id="stopBtn" disabled>
                        <span>⏹</span>
                        <span>Stop</span>
                    </button>
                </div>
                <div class="user-recording-section" id="userRecordingLoaded">
                    <div class="file-loaded-info">
                        <div class="file-icon user">🎤</div>
                        <span id="userRecordingInfo">No recording yet</span>
                        <button class="play-btn user" id="playUser">▶ Play</button>
                    </div>
                </div>
            </div>

            <!-- Analysis Controls -->
            <div id="analysisControls" style="display: none;">
                <div class="controls">
                    <button class="btn btn-primary" id="analyzeBtn">
                        <span>🔬</span>
                        <span>Analyze Pronunciation</span>
                    </button>
                    <label style="margin-left: 15px;">
                        <input type="checkbox" id="useDTWCheckbox" checked>
                        Use DTW (tempo-invariant)
                    </label>
                </div>
            </div>

            <!-- Visualization Canvas -->
            <div id="visualizationSection" style="display: none;">
                <h3>📊 Visual Analysis</h3>
                <div class="visualization-controls">
                    <select id="vizTypeSelect">
                        <option value="waveform">Waveform Overlay</option>
                        <option value="spectrogram">Spectrogram</option>
                        <option value="pitch">Pitch Contour</option>
                        <option value="mfcc">MFCC Heatmap</option>
                        <option value="formants">Formant Tracks</option>
                        <option value="all">All Features</option>
                    </select>
                </div>
                <div class="canvas-container">
                    <canvas id="visualizationCanvas"></canvas>
                </div>
                <div id="scaleControls" class="scale-controls"></div>
            </div>

            <!-- Results -->
            <div id="results" class="results">
                <h3>🎯 Analysis Results</h3>
                <div class="score-display">
                    <svg width="120" height="120">
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                        <circle id="scoreFill" cx="60" cy="60" r="45" fill="none" 
                                stroke="#10b981" stroke-width="8" 
                                stroke-dasharray="282.74" stroke-dashoffset="282.74"
                                transform="rotate(-90 60 60)"/>
                        <text x="60" y="70" text-anchor="middle" font-size="32" font-weight="bold" fill="#1f2937">
                            <tspan id="scoreText">0</tspan>
                        </text>
                    </svg>
                </div>
                <div class="feedback">
                    <h4 id="feedback">Processing...</h4>
                    <p id="detailedFeedback"></p>
                    <p id="methodIndicator"></p>
                </div>
                
                <!-- Score Breakdown -->
                <div class="breakdown">
                    <h4>Detailed Breakdown</h4>
                    <div class="breakdown-item">
                        <span>Pitch (Melody)</span>
                        <div class="progress-bar">
                            <div id="pitchBar" class="progress-fill"></div>
                        </div>
                        <span id="pitchScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>MFCC (Sound Quality)</span>
                        <div class="progress-bar">
                            <div id="mfccBar" class="progress-fill"></div>
                        </div>
                        <span id="mfccScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Envelope (Rhythm)</span>
                        <div class="progress-bar">
                            <div id="envelopeBar" class="progress-fill"></div>
                        </div>
                        <span id="envelopeScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Duration (Timing)</span>
                        <div class="progress-bar">
                            <div id="durationBar" class="progress-fill"></div>
                        </div>
                        <span id="durationScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Stress Position</span>
                        <div class="progress-bar">
                            <div id="stressPositionBar" class="progress-fill"></div>
                        </div>
                        <span id="stressPositionScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Stress Pattern</span>
                        <div class="progress-bar">
                            <div id="stressBar" class="progress-fill"></div>
                        </div>
                        <span id="stressScore">0%</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Quality (ZCR/Tilt)</span>
                        <div class="progress-bar">
                            <div id="qualityBar" class="progress-fill"></div>
                        </div>
                        <span id="qualityScore">0%</span>
                    </div>
                </div>

                <!-- AI Analysis Section -->
                <div id="aiAnalysisSection" style="display: none;">
                    <h4>🤖 AI-Powered Feedback</h4>
                    <button class="btn btn-secondary" id="aiAnalysisBtn">
                        Get Detailed AI Feedback
                    </button>
                    <div id="aiAnalysisContent" class="ai-feedback"></div>
                </div>
            </div>

            <!-- Debug Log -->
            <div id="debugPanel" class="debug-panel">
                <h4>🔍 Debug Log <button id="clearDebug" style="float: right;">Clear</button></h4>
                <div id="debugLog"></div>
            </div>

            <!-- API Configuration -->
            <div class="config-section">
                <h4>⚙️ Configuration</h4>
                <div>
                    <label>Anthropic API Key:</label>
                    <input type="password" id="apiKeyInput" placeholder="sk-ant-...">
                    <button id="saveApiKey" class="btn btn-small">Save</button>
                    <span id="apiStatus"></span>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Modules -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
