// =================================================================
// VOICE PRACTICE MODULE - Pronunciation Analysis for Flashcards
// Version 2.0 - November 2025 - Enhanced MFCC with Meyda, VAD, Deltas
// =================================================================
// DEPENDENCY: Meyda library required for accurate FFT & MFCC extraction
// Add to HTML: <script src="https://unpkg.com/meyda@5.6.0/dist/web/meyda.min.js"></script>
// =================================================================

// Global voice practice manager
let voicePracticeManager = null;

// =================================================================
// VOICE PRACTICE MANAGER - Main controller
// =================================================================
class VoicePracticeManager {
    constructor() {
        this.enabled = this.loadEnabledState();
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.nativeBuffer = null;
        this.userBuffer = null;
        this.nativeDuration = 0;
        this.currentCard = null;
        this.useDTW = true;
        this.applyFilter = true;
        this.sideBySideMode = false;
        this.currentVizType = 'waveform';

        // Initialize audio context on first user interaction
        this.audioContextInitialized = false;
    }
    
    loadEnabledState() {
        const saved = localStorage.getItem('voicePracticeEnabled');
        return saved === null ? true : saved === 'true';
    }
    
    saveEnabledState() {
        localStorage.setItem('voicePracticeEnabled', this.enabled);
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        this.saveEnabledState();
        debugLogger?.log(2, `Voice practice ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    async initAudioContext() {
        if (this.audioContextInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioContextInitialized = true;
            debugLogger?.log(3, 'Audio context initialized');
        } catch (err) {
            debugLogger?.log(1, `Failed to initialize audio context: ${err.message}`);
            throw err;
        }
    }
    
    async startPractice(card) {
        if (!this.enabled) return;
        
        this.currentCard = card;
        
        try {
            // Initialize audio context if needed
            await this.initAudioContext();
            
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Load native audio
            await this.loadNativeAudio(card.audioPath);
            
            // Show practice modal
            this.showPracticeModal(card);
            
        } catch (err) {
            debugLogger?.log(1, `Failed to start voice practice: ${err.message}`);
            toastManager?.show('Microphone access required for voice practice', 'error');
        }
    }
    
    async loadNativeAudio(audioPath) {
        try {
            const response = await fetch(audioPath);
            const arrayBuffer = await response.arrayBuffer();
            let buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Trim silence from native audio using dynamic threshold
            const originalDuration = buffer.duration;
            buffer = this.trimSilence(buffer);
            
            // Apply filter if enabled (for consistency with user recording)
            if (this.applyFilter) {
                buffer = await this.applyBandpassFilter(buffer);
            }
            
            this.nativeBuffer = buffer;
            this.nativeDuration = buffer.duration;
            
            debugLogger?.log(3, `Native audio loaded: ${originalDuration.toFixed(2)}s -> trimmed to ${this.nativeDuration.toFixed(2)}s`);
        } catch (err) {
            debugLogger?.log(1, `Failed to load native audio: ${err.message}`);
            throw err;
        }
    }
    
    showPracticeModal(card) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('voicePracticeModal');
        if (!modal) {
            modal = this.createPracticeModal();
            document.body.appendChild(modal);
        }
        
        // Update word display
        document.getElementById('vpWord').textContent = card.word;
        document.getElementById('vpEnglish').textContent = card.english;
        
        // Reset state - hide all sections first
        document.getElementById('vpCountdown').style.display = 'none';
        document.getElementById('vpRecording').style.display = 'none';
        document.getElementById('vpResults').style.display = 'none';
        document.getElementById('vpStart').style.display = 'block';
        
        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    
    createPracticeModal() {
        const modal = document.createElement('div');
        modal.id = 'voicePracticeModal';
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-content vp-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-microphone"></i> Voice Practice</h2>
                    <button id="vpClose" class="btn-icon"><i class="fas fa-times"></i></button>
                </div>
                <div class="vp-body">
                    <div class="vp-word-display">
                        <div class="vp-word" id="vpWord">Word</div>
                        <div class="vp-english" id="vpEnglish">English</div>
                    </div>
                    
                    <div id="vpStart" class="vp-start-section">
                        <p>Listen to the native speaker, then repeat the word.</p>
                        <button id="vpStartBtn" class="btn btn-primary btn-large">
                            <i class="fas fa-play"></i> Start Practice
                        </button>
                    </div>
                    
                    <div id="vpCountdown" class="vp-countdown" style="display: none;">
                        <div class="vp-countdown-number" id="vpCountdownNum">3</div>
                        <div class="vp-countdown-text" id="vpCountdownText">Get ready...</div>
                    </div>
                    
                    <div id="vpRecording" class="vp-recording" style="display: none;">
                        <div class="vp-recording-indicator">
                            <div class="vp-pulse-dot"></div>
                            <span>Recording...</span>
                        </div>
                        <div class="vp-say-word">Say: <strong id="vpSayWord">Word</strong></div>
                    </div>
                    
                    <div id="vpResults" class="vp-results" style="display: none;">
                        <div class="vp-score-display">
                            <div class="vp-score-circle">
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" class="vp-score-bg"></circle>
                                    <circle cx="50" cy="50" r="45" class="vp-score-fill" id="vpScoreFill"></circle>
                                </svg>
                                <div class="vp-score-text" id="vpScoreText">0</div>
                            </div>
                            <div class="vp-feedback" id="vpFeedback">Analyzing...</div>
                        </div>

                        <div class="vp-score-breakdown" id="vpScoreBreakdown">
                            <div class="vp-breakdown-header">Score Breakdown</div>
                            <div class="vp-breakdown-grid">
                                <div class="vp-breakdown-item" data-factor="mfcc">
                                    <span class="vp-breakdown-label">Vowel Quality</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarMfcc"></div></div>
                                    <span class="vp-breakdown-value" id="vpValMfcc">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="pitch">
                                    <span class="vp-breakdown-label">Pitch/Intonation</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarPitch"></div></div>
                                    <span class="vp-breakdown-value" id="vpValPitch">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="stressPos">
                                    <span class="vp-breakdown-label">Stress Timing</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarStressPos"></div></div>
                                    <span class="vp-breakdown-value" id="vpValStressPos">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="stressPat">
                                    <span class="vp-breakdown-label">Stress Pattern</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarStressPat"></div></div>
                                    <span class="vp-breakdown-value" id="vpValStressPat">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="intensity">
                                    <span class="vp-breakdown-label">Dynamics</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarIntensity"></div></div>
                                    <span class="vp-breakdown-value" id="vpValIntensity">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="duration">
                                    <span class="vp-breakdown-label">Timing</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarDuration"></div></div>
                                    <span class="vp-breakdown-value" id="vpValDuration">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="voiceQuality">
                                    <span class="vp-breakdown-label">Voice Quality</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarVoiceQuality"></div></div>
                                    <span class="vp-breakdown-value" id="vpValVoiceQuality">--</span>
                                </div>
                                <div class="vp-breakdown-item" data-factor="rhythm">
                                    <span class="vp-breakdown-label">Rhythm</span>
                                    <div class="vp-breakdown-bar"><div class="vp-breakdown-fill" id="vpBarRhythm"></div></div>
                                    <span class="vp-breakdown-value" id="vpValRhythm">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="vp-viz-controls">
                            <div class="vp-viz-tabs">
                                <button class="vp-viz-tab active" data-viz="waveform">Waveform</button>
                                <button class="vp-viz-tab" data-viz="pitch">Pitch Contour</button>
                                <button class="vp-viz-tab" data-viz="intensity">Intensity</button>
                            </div>
                            <button class="vp-layout-toggle" id="vpLayoutToggle" title="Toggle side-by-side view">
                                <i class="fas fa-columns"></i>
                            </button>
                        </div>

                        <div class="vp-canvas-container" id="vpCanvasContainer">
                            <canvas id="vpCanvas" width="800" height="300"></canvas>
                        </div>
                        <div class="vp-canvas-sidebyside hidden" id="vpCanvasSideBySide">
                            <div class="vp-side-panel">
                                <div class="vp-side-label"><i class="fas fa-volume-up"></i> Native</div>
                                <canvas id="vpCanvasNative" width="380" height="250"></canvas>
                            </div>
                            <div class="vp-side-panel">
                                <div class="vp-side-label"><i class="fas fa-microphone"></i> Yours</div>
                                <canvas id="vpCanvasUser" width="380" height="250"></canvas>
                            </div>
                        </div>
                        
                        <div class="vp-actions">
                            <button id="vpTryAgain" class="btn btn-primary">
                                <i class="fas fa-redo"></i> Try Again
                            </button>
                            <button id="vpPlayNative" class="btn btn-secondary">
                                <i class="fas fa-volume-up"></i> Native
                            </button>
                            <button id="vpPlayUser" class="btn btn-secondary">
                                <i class="fas fa-microphone"></i> Yours
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        setTimeout(() => {
            document.getElementById('vpClose').addEventListener('click', () => this.closeModal());
            document.getElementById('vpStartBtn').addEventListener('click', () => this.beginPracticeSequence());
            document.getElementById('vpTryAgain').addEventListener('click', () => this.beginPracticeSequence());
            document.getElementById('vpPlayNative').addEventListener('click', () => this.playNative());
            document.getElementById('vpPlayUser').addEventListener('click', () => this.playUser());
            
            // Viz tab listeners
            document.querySelectorAll('.vp-viz-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.vp-viz-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.updateVisualization(e.target.dataset.viz);
                });
            });

            // Layout toggle listener
            document.getElementById('vpLayoutToggle').addEventListener('click', () => {
                this.sideBySideMode = !this.sideBySideMode;
                const overlayContainer = document.getElementById('vpCanvasContainer');
                const sideBySideContainer = document.getElementById('vpCanvasSideBySide');
                const toggleBtn = document.getElementById('vpLayoutToggle');

                if (this.sideBySideMode) {
                    overlayContainer.classList.add('hidden');
                    sideBySideContainer.classList.remove('hidden');
                    toggleBtn.classList.add('active');
                } else {
                    overlayContainer.classList.remove('hidden');
                    sideBySideContainer.classList.add('hidden');
                    toggleBtn.classList.remove('active');
                }
                this.updateVisualization(this.currentVizType || 'waveform');
            });
        }, 0);
        
        return modal;
    }
    
    closeModal() {
        const modal = document.getElementById('voicePracticeModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        
        // Stop any ongoing recording
        if (this.isRecording && this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }
    
    async beginPracticeSequence() {
        // Hide start, show countdown
        document.getElementById('vpStart').style.display = 'none';
        document.getElementById('vpResults').style.display = 'none';
        document.getElementById('vpCountdown').style.display = 'block';
        
        // Play native audio first
        await this.playNative();
        
        // Countdown 3, 2, 1 (600ms each)
        for (let i = 3; i >= 1; i--) {
            document.getElementById('vpCountdownNum').textContent = i;
            document.getElementById('vpCountdownText').textContent = i === 1 ? 'Speak now!' : 'Get ready...';
            await this.delay(600);
        }
        
        // Show recording state
        document.getElementById('vpCountdown').style.display = 'none';
        document.getElementById('vpRecording').style.display = 'block';
        document.getElementById('vpSayWord').textContent = this.currentCard.word;
        
        // Reset recording indicator UI (in case it was changed to "Processing...")
        const recordingIndicator = document.querySelector('#vpRecording .vp-recording-indicator span');
        const pulseDot = document.querySelector('#vpRecording .vp-pulse-dot');
        if (recordingIndicator) {
            recordingIndicator.textContent = 'Recording...';
        }
        if (pulseDot) {
            pulseDot.style.animation = '';
            pulseDot.style.background = '';
        }
        
        // Start recording with silence detection
        await this.startRecording();
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };
            
            // Set up silence detection using AnalyserNode
            const analyserContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = analyserContext.createMediaStreamSource(stream);
            const analyser = analyserContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.1;
            source.connect(analyser);
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Silence detection parameters
            const silenceThreshold = 15; // RMS threshold for silence
            const silenceDuration = 100; // ms of silence to trigger stop
            const maxRecordTime = 5000; // Maximum recording time (safety)
            const minSpeechTime = 200; // Minimum speech before allowing silence stop
            
            let silenceStart = null;
            let speechDetected = false;
            let speechStartTime = null;
            let recordingStartTime = Date.now();
            
            this.mediaRecorder.start(100);
            this.isRecording = true;
            debugLogger?.log(3, 'Recording started with silence detection');
            
            // Monitor for silence
            const checkSilence = () => {
                if (!this.isRecording) {
                    analyserContext.close();
                    return;
                }
                
                analyser.getByteTimeDomainData(dataArray);
                
                // Calculate RMS
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const value = (dataArray[i] - 128) / 128;
                    sum += value * value;
                }
                const rms = Math.sqrt(sum / bufferLength) * 100;
                
                const now = Date.now();
                const elapsed = now - recordingStartTime;
                
                if (rms > silenceThreshold) {
                    // Sound detected
                    silenceStart = null;
                    if (!speechDetected) {
                        speechDetected = true;
                        speechStartTime = now;
                        debugLogger?.log(3, `Speech detected at ${elapsed}ms`);
                    }
                } else {
                    // Silence detected
                    if (silenceStart === null) {
                        silenceStart = now;
                    }
                    
                    // Check if we should stop
                    const silenceTime = now - silenceStart;
                    const speechTime = speechDetected ? (silenceStart - speechStartTime) : 0;
                    
                    if (speechDetected && speechTime >= minSpeechTime && silenceTime >= silenceDuration) {
                        debugLogger?.log(3, `Stopping: ${silenceTime}ms silence after ${speechTime}ms speech`);
                        this.stopRecording();
                        analyserContext.close();
                        return;
                    }
                }
                
                // Safety timeout
                if (elapsed >= maxRecordTime) {
                    debugLogger?.log(3, `Max recording time reached (${maxRecordTime}ms)`);
                    this.stopRecording();
                    analyserContext.close();
                    return;
                }
                
                // Continue monitoring
                requestAnimationFrame(checkSilence);
            };
            
            // Start monitoring
            checkSilence();
            
        } catch (err) {
            debugLogger?.log(1, `Recording failed: ${err.message}`);
            toastManager?.show('Failed to access microphone', 'error');
        }
    }
    
    async stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return;
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                this.isRecording = false;
                
                // Update UI to show processing state immediately
                const recordingIndicator = document.querySelector('#vpRecording .vp-recording-indicator span');
                const pulseDot = document.querySelector('#vpRecording .vp-pulse-dot');
                const sayWord = document.getElementById('vpSayWord');
                if (recordingIndicator) {
                    recordingIndicator.textContent = 'Processing...';
                }
                if (pulseDot) {
                    pulseDot.style.animation = 'none';
                    pulseDot.style.background = '#6b7280'; // Gray instead of red
                }
                if (sayWord) {
                    sayWord.innerHTML = 'Analyzing your pronunciation';
                }
                
                // Stop all tracks
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                
                // Process recorded audio
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                const arrayBuffer = await blob.arrayBuffer();
                
                try {
                    this.userBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    
                    // Trim silence from user recording
                    this.userBuffer = this.trimSilence(this.userBuffer);
                    
                    // Apply filter if enabled
                    if (this.applyFilter) {
                        this.userBuffer = await this.applyBandpassFilter(this.userBuffer);
                    }
                    
                    debugLogger?.log(3, `User recording processed: ${this.userBuffer.duration.toFixed(2)}s`);
                    
                    // Analyze and show results
                    await this.analyzeAndShowResults();
                    
                } catch (err) {
                    debugLogger?.log(1, `Failed to process recording: ${err.message}`);
                    toastManager?.show('Failed to process recording', 'error');
                }
                
                resolve();
            };
            
            this.mediaRecorder.stop();
        });
    }
    
    trimSilence(buffer, fixedThreshold = 0.01) {
        const data = buffer.getChannelData(0);
        const frameSize = 512;
        const sampleRate = buffer.sampleRate;
        let start = 0;
        let end = data.length;
        
        // 100ms padding in samples
        const paddingSamples = Math.floor(sampleRate * 0.1);
        
        debugLogger?.log(3, `Trimming silence: ${data.length} samples (${(data.length/sampleRate).toFixed(3)}s)`);
        
        // Calculate RMS values for each frame
        const frameCount = Math.floor(data.length / frameSize);
        const rmsValues = [];
        
        for (let i = 0; i < frameCount; i++) {
            let rms = 0;
            const offset = i * frameSize;
            for (let j = 0; j < frameSize; j++) {
                rms += data[offset + j] ** 2;
            }
            rms = Math.sqrt(rms / frameSize);
            rmsValues.push(rms);
        }
        
        // Calculate dynamic threshold
        // Use actual max for signal level (not percentile which fails for mostly-silent audio)
        const sortedRMS = [...rmsValues].sort((a, b) => a - b);
        const noiseFloor = sortedRMS[Math.floor(sortedRMS.length * 0.1)];
        const maxRMS = sortedRMS[sortedRMS.length - 1];
        
        // Threshold = 15% of the way from noise floor to max
        const dynamicThreshold = noiseFloor + (maxRMS - noiseFloor) * 0.15;
        const threshold = Math.max(fixedThreshold, dynamicThreshold);
        
        debugLogger?.log(3, `Noise floor: ${noiseFloor.toFixed(4)}, Max: ${maxRMS.toFixed(4)}, Threshold: ${threshold.toFixed(4)}`);
        
        // Find start with sustained energy (require multiple consecutive frames above threshold)
        let consecutiveFrames = 0;
        const minSustainedFrames = 3;
        let foundStart = false;
        
        for (let i = 0; i < rmsValues.length; i++) {
            if (rmsValues[i] > threshold) {
                consecutiveFrames++;
                if (consecutiveFrames >= minSustainedFrames) {
                    start = (i - consecutiveFrames + 1) * frameSize;
                    foundStart = true;
                    debugLogger?.log(3, `Found start at frame ${i - consecutiveFrames + 1}, sample ${start}`);
                    break;
                }
            } else {
                consecutiveFrames = 0;
            }
        }
        
        // Find end with sustained energy
        consecutiveFrames = 0;
        let foundEnd = false;
        for (let i = rmsValues.length - 1; i >= 0; i--) {
            if (rmsValues[i] > threshold) {
                consecutiveFrames++;
                if (consecutiveFrames >= minSustainedFrames) {
                    end = (i + consecutiveFrames) * frameSize;
                    foundEnd = true;
                    debugLogger?.log(3, `Found end at frame ${i + consecutiveFrames - 1}, sample ${end}`);
                    break;
                }
            } else {
                consecutiveFrames = 0;
            }
        }
        
        // Return original buffer if no speech found
        if (!foundStart || !foundEnd || start >= end) {
            debugLogger?.log(3, 'No trimming needed - keeping original');
            return buffer;
        }
        
        // Add 100ms padding to start and end
        start = Math.max(0, start - paddingSamples);
        end = Math.min(data.length, end + paddingSamples);
        
        debugLogger?.log(3, `After 100ms padding: start=${start}, end=${end}`);
        
        // Create trimmed buffer
        const trimmedLength = end - start;
        const trimmedBuffer = this.audioContext.createBuffer(
            buffer.numberOfChannels,
            trimmedLength,
            sampleRate
        );
        
        // Copy all channels
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const destData = trimmedBuffer.getChannelData(channel);
            for (let i = 0; i < trimmedLength; i++) {
                destData[i] = sourceData[start + i];
            }
        }
        
        debugLogger?.log(3, `Trimmed: ${(data.length/sampleRate).toFixed(3)}s ? ${(trimmedLength/sampleRate).toFixed(3)}s`);
        
        return trimmedBuffer;
    }
    
    async applyBandpassFilter(buffer) {
        const offlineCtx = new OfflineAudioContext(
            1,
            buffer.length,
            buffer.sampleRate
        );
        
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        
        const highpass = offlineCtx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 70;
        
        const lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 12000;
        
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(offlineCtx.destination);
        
        source.start();
        
        return await offlineCtx.startRendering();
    }
    
    async analyzeAndShowResults() {
        // Hide recording, show results
        document.getElementById('vpRecording').style.display = 'none';
        document.getElementById('vpResults').style.display = 'block';

        // Run enhanced analysis with audioContext for Meyda + VAD + Deltas
        const analyzer = new PronunciationAnalyzer(
            this.nativeBuffer,
            this.userBuffer,
            this.useDTW,
            this.audioContext  // Pass audioContext to enable enhanced MFCC processing
        );
        const results = await analyzer.analyze();

        // Store results for visualization
        this.analysisResults = results;

        // Log VAD info if available
        if (results.vadInfo) {
            debugLogger?.log(3, `VAD Info - Native: ${results.vadInfo.native?.trimmedDuration?.toFixed(2)}s, User: ${results.vadInfo.user?.trimmedDuration?.toFixed(2)}s`);
        }

        // Display score and breakdown
        this.displayScore(results.score);
        this.displayScoreBreakdown(results);

        // Draw initial visualization (waveform)
        this.currentVizType = 'waveform';
        this.updateVisualization('waveform');

        // Auto-play sequence: native → user → native
        // Wait for score animation to complete (~1 second)
        await this.delay(1200);

        // Play sequence with error handling
        try {
            await this.playComparisonSequence();
        } catch (err) {
            debugLogger?.log(1, `Playback sequence error: ${err.message}`);
        }
    }
    
    async playComparisonSequence() {
        debugLogger?.log(3, 'Playing comparison sequence: native ? user ? native');
        
        // Check buffers exist
        if (!this.nativeBuffer) {
            debugLogger?.log(1, 'Cannot play: nativeBuffer is null');
            return;
        }
        if (!this.userBuffer) {
            debugLogger?.log(1, 'Cannot play: userBuffer is null');
            return;
        }
        
        // Play native
        debugLogger?.log(3, 'Playing native...');
        await this.playNative();
        await this.delay(300); // Brief pause
        
        // Play user
        debugLogger?.log(3, 'Playing user...');
        await this.playUser();
        await this.delay(300); // Brief pause
        
        // Play native again
        debugLogger?.log(3, 'Playing native again...');
        await this.playNative();
        
        debugLogger?.log(3, 'Comparison sequence complete');
    }
    
    displayScore(score) {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (score / 100) * circumference;
        
        const scoreFill = document.getElementById('vpScoreFill');
        // Initialize the stroke-dasharray
        scoreFill.style.strokeDasharray = circumference;
        scoreFill.style.strokeDashoffset = circumference;
        
        // Animate to final value
        setTimeout(() => {
            scoreFill.style.strokeDashoffset = offset;
        }, 50);
        
        // Animate score number
        const scoreText = document.getElementById('vpScoreText');
        let current = 0;
        const increment = Math.ceil(score / 30);
        const timer = setInterval(() => {
            current += increment;
            if (current >= score) {
                current = score;
                clearInterval(timer);
            }
            scoreText.textContent = Math.round(current);
        }, 30);
        
        // Set feedback text
        const feedback = document.getElementById('vpFeedback');
        if (score >= 85) {
            feedback.textContent = 'Excellent! ??';
            feedback.className = 'vp-feedback excellent';
        } else if (score >= 70) {
            feedback.textContent = 'Great Job! ??';
            feedback.className = 'vp-feedback great';
        } else if (score >= 55) {
            feedback.textContent = 'Good Effort! ??';
            feedback.className = 'vp-feedback good';
        } else {
            feedback.textContent = 'Keep Practicing! ??';
            feedback.className = 'vp-feedback practice';
        }
    }

    displayScoreBreakdown(results) {
        // Check if we have enhanced results (8-factor system)
        const hasEnhancedResults = results.mfccDetails && results.pitchDetails && results.stressScores;

        if (!hasEnhancedResults) {
            // Hide breakdown for legacy analysis
            const breakdownEl = document.getElementById('vpScoreBreakdown');
            if (breakdownEl) breakdownEl.style.display = 'none';
            return;
        }

        // Show breakdown panel
        const breakdownEl = document.getElementById('vpScoreBreakdown');
        if (breakdownEl) breakdownEl.style.display = 'block';

        // Extract individual scores
        const scores = {
            mfcc: results.mfccDetails?.score || 0,
            pitch: results.pitchDetails?.score || 0,
            stressPos: results.stressScores?.position || 0,
            stressPat: results.stressScores?.pattern || 0,
            intensity: results.intensityDetails?.score || 0,
            duration: this.analysisResults?.durationScore || this.calculateDurationScore(),
            voiceQuality: results.voiceQualityScore?.score || 0,
            rhythm: results.rhythmScore?.score || 0
        };

        // Color coding based on score
        const getColor = (score) => {
            if (score >= 85) return '#22c55e'; // green
            if (score >= 70) return '#84cc16'; // lime
            if (score >= 55) return '#eab308'; // yellow
            if (score >= 40) return '#f97316'; // orange
            return '#ef4444'; // red
        };

        // Update each breakdown bar with animation
        Object.entries(scores).forEach(([key, score]) => {
            const bar = document.getElementById(`vpBar${key.charAt(0).toUpperCase() + key.slice(1)}`);
            const val = document.getElementById(`vpVal${key.charAt(0).toUpperCase() + key.slice(1)}`);

            if (bar && val) {
                // Animate bar width
                setTimeout(() => {
                    bar.style.width = `${Math.round(score)}%`;
                    bar.style.backgroundColor = getColor(score);
                }, 100);
                val.textContent = Math.round(score);
            }
        });
    }

    calculateDurationScore() {
        // Fallback duration score calculation
        if (!this.nativeBuffer || !this.userBuffer) return 0;
        const ratio = this.userBuffer.duration / this.nativeBuffer.duration;
        const diff = Math.abs(1 - ratio);
        return Math.max(0, 100 - diff * 200);
    }

    updateVisualization(type) {
        this.currentVizType = type;

        if (!this.nativeBuffer || !this.userBuffer) return;

        if (this.sideBySideMode) {
            // Side-by-side mode: draw on separate canvases
            this.drawSideBySide(type);
        } else {
            // Overlay mode: draw on single canvas
            const canvas = document.getElementById('vpCanvas');
            const ctx = canvas.getContext('2d');

            // Clear canvas
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            switch (type) {
                case 'waveform':
                    this.drawWaveform(ctx, canvas);
                    break;
                case 'pitch':
                    this.drawPitch(ctx, canvas);
                    break;
                case 'intensity':
                    this.drawIntensity(ctx, canvas);
                    break;
            }
        }
    }

    drawSideBySide(type) {
        const nativeCanvas = document.getElementById('vpCanvasNative');
        const userCanvas = document.getElementById('vpCanvasUser');
        const nativeCtx = nativeCanvas.getContext('2d');
        const userCtx = userCanvas.getContext('2d');

        // Clear both canvases
        nativeCtx.fillStyle = '#1f2937';
        nativeCtx.fillRect(0, 0, nativeCanvas.width, nativeCanvas.height);
        userCtx.fillStyle = '#1f2937';
        userCtx.fillRect(0, 0, userCanvas.width, userCanvas.height);

        switch (type) {
            case 'waveform':
                this.drawWaveformSingle(nativeCtx, nativeCanvas, this.nativeBuffer, '#3b82f6', 'Native');
                this.drawWaveformSingle(userCtx, userCanvas, this.userBuffer, '#22c55e', 'Yours');
                break;
            case 'pitch':
                this.drawPitchSingle(nativeCtx, nativeCanvas, 'native');
                this.drawPitchSingle(userCtx, userCanvas, 'user');
                break;
            case 'intensity':
                this.drawIntensitySingle(nativeCtx, nativeCanvas, 'native');
                this.drawIntensitySingle(userCtx, userCanvas, 'user');
                break;
        }
    }

    drawWaveformSingle(ctx, canvas, buffer, color, label) {
        const data = buffer.getChannelData(0);
        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 40, right: 10, top: 25, bottom: 30 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const midY = padding.top + plotHeight / 2;

        // Draw axes
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(width - padding.right, midY);
        ctx.stroke();

        // Draw waveform envelope
        const samplesPerPixel = data.length / plotWidth;
        ctx.fillStyle = color;
        ctx.beginPath();

        // Top envelope
        for (let i = 0; i < plotWidth; i++) {
            const startSample = Math.floor(i * samplesPerPixel);
            const endSample = Math.floor((i + 1) * samplesPerPixel);
            let max = 0;
            for (let j = startSample; j < endSample && j < data.length; j++) {
                if (data[j] > max) max = data[j];
            }
            const x = padding.left + i;
            const y = midY - (max * plotHeight / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        // Bottom envelope (reverse)
        for (let i = plotWidth - 1; i >= 0; i--) {
            const startSample = Math.floor(i * samplesPerPixel);
            const endSample = Math.floor((i + 1) * samplesPerPixel);
            let min = 0;
            for (let j = startSample; j < endSample && j < data.length; j++) {
                if (data[j] < min) min = data[j];
            }
            const x = padding.left + i;
            const y = midY - (min * plotHeight / 2);
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Time label
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${buffer.duration.toFixed(2)}s`, width / 2, height - 5);
    }

    drawPitchSingle(ctx, canvas, source) {
        const pitchData = source === 'native'
            ? this.analysisResults?.features?.nativePitch
            : this.analysisResults?.features?.userPitch;

        if (!pitchData || pitchData.length === 0) {
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No pitch data', canvas.width / 2, canvas.height / 2);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 40, right: 10, top: 25, bottom: 30 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        const color = source === 'native' ? '#3b82f6' : '#22c55e';

        // Find pitch range (use both native and user for consistent scale)
        const allPitches = [
            ...(this.analysisResults?.features?.nativePitch || []),
            ...(this.analysisResults?.features?.userPitch || [])
        ].map(p => p.pitch).filter(p => p > 0);

        if (allPitches.length === 0) return;

        const minPitch = Math.min(...allPitches) * 0.9;
        const maxPitch = Math.max(...allPitches) * 1.1;
        const maxTime = Math.max(
            pitchData[pitchData.length - 1]?.time || 0,
            this.nativeBuffer.duration,
            this.userBuffer.duration
        );

        // Draw axes
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Draw pitch contour
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < pitchData.length; i++) {
            if (pitchData[i].pitch > 0) {
                const x = padding.left + (pitchData[i].time / maxTime) * plotWidth;
                const y = height - padding.bottom - ((pitchData[i].pitch - minPitch) / (maxPitch - minPitch)) * plotHeight;
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // Draw stress dots for this source
        this.drawStressDotsSingle(ctx, canvas, source, minPitch, maxPitch, maxTime, padding, plotWidth, plotHeight);

        // Y-axis labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(maxPitch)}`, padding.left - 3, padding.top + 8);
        ctx.fillText(`${Math.round(minPitch)}`, padding.left - 3, height - padding.bottom);
    }

    drawStressDotsSingle(ctx, canvas, source, minPitch, maxPitch, maxTime, padding, plotWidth, plotHeight) {
        const stresses = source === 'native'
            ? this.analysisResults?.stresses?.native
            : this.analysisResults?.stresses?.user;

        if (!stresses || stresses.length === 0) return;

        const pitchData = source === 'native'
            ? this.analysisResults?.features?.nativePitch
            : this.analysisResults?.features?.userPitch;

        const height = canvas.height;
        const color = source === 'native' ? '#f59e0b' : '#ef4444';

        stresses.forEach((stress, idx) => {
            const x = padding.left + (stress.time / maxTime) * plotWidth;

            // Find pitch at this time
            let pitchAtTime = 0;
            for (const p of pitchData) {
                if (Math.abs(p.time - stress.time) < 0.02 && p.pitch > 0) {
                    pitchAtTime = p.pitch;
                    break;
                }
            }

            if (pitchAtTime > 0) {
                const y = height - padding.bottom - ((pitchAtTime - minPitch) / (maxPitch - minPitch)) * plotHeight;

                // Draw stress dot
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw stress rank number
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(idx + 1, x, y + 3);
            }
        });
    }

    drawIntensitySingle(ctx, canvas, source) {
        const intensityData = source === 'native'
            ? this.analysisResults?.features?.nativeIntensity
            : this.analysisResults?.features?.userIntensity;

        if (!intensityData || intensityData.length === 0) {
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No intensity data', canvas.width / 2, canvas.height / 2);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 40, right: 10, top: 25, bottom: 30 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const midY = padding.top + plotHeight / 2;

        const color = source === 'native' ? '#3b82f6' : '#22c55e';

        // Find max time
        const maxTime = Math.max(
            intensityData[intensityData.length - 1]?.time || 0,
            this.nativeBuffer.duration,
            this.userBuffer.duration
        );

        // Draw center line
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(width - padding.right, midY);
        ctx.stroke();

        // Draw intensity envelope
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();

        // Upper envelope
        for (let i = 0; i < intensityData.length; i++) {
            const x = padding.left + (intensityData[i].time / maxTime) * plotWidth;
            const y = midY - (intensityData[i].value * plotHeight / 2);
            if (i === 0) ctx.moveTo(x, midY);
            ctx.lineTo(x, y);
        }

        // Lower envelope (mirror)
        for (let i = intensityData.length - 1; i >= 0; i--) {
            const x = padding.left + (intensityData[i].time / maxTime) * plotWidth;
            const y = midY + (intensityData[i].value * plotHeight / 2);
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    drawWaveform(ctx, canvas) {
        const nativeData = this.nativeBuffer.getChannelData(0);
        const userData = this.userBuffer.getChannelData(0);
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 60, right: 20, top: 40, bottom: 40 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const midY = padding.top + plotHeight / 2;
        
        // Colors
        const nativeColor = '#3b82f6';
        const userColor = '#ffffff';
        
        // Draw axes
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(width - padding.right, midY);
        ctx.stroke();
        
        // Y-axis labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('1', padding.left - 5, padding.top + 10);
        ctx.fillText('0', padding.left - 5, midY + 3);
        ctx.fillText('-1', padding.left - 5, height - padding.bottom);
        
        // Amplitude label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Amplitude', 0, 0);
        ctx.restore();
        
        // Time axis labels
        const maxDur = Math.max(this.nativeBuffer.duration, this.userBuffer.duration);
        
        ctx.textAlign = 'center';
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const x = padding.left + (i / numTicks) * plotWidth;
            const time = (i / numTicks) * maxDur;
            ctx.fillText(time.toFixed(2), x, height - padding.bottom + 15);
            
            ctx.beginPath();
            ctx.moveTo(x, height - padding.bottom);
            ctx.lineTo(x, height - padding.bottom + 3);
            ctx.stroke();
        }
        
        ctx.fillText('Time (seconds)', width / 2, height - 5);
        
        // Calculate peak values
        let nativePeak = 0, userPeak = 0;
        for (let i = 0; i < nativeData.length; i++) {
            if (Math.abs(nativeData[i]) > nativePeak) nativePeak = Math.abs(nativeData[i]);
        }
        for (let i = 0; i < userData.length; i++) {
            if (Math.abs(userData[i]) > userPeak) userPeak = Math.abs(userData[i]);
        }
        
        // Helper function to draw waveform with envelope (min/max per pixel)
        const drawWaveformEnvelope = (data, color) => {
            const samplesPerPixel = data.length / plotWidth;
            
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            
            // Draw filled envelope for better visibility
            ctx.beginPath();
            
            // Top envelope (positive values)
            for (let i = 0; i < plotWidth; i++) {
                const startSample = Math.floor(i * samplesPerPixel);
                const endSample = Math.floor((i + 1) * samplesPerPixel);
                
                let max = -Infinity;
                for (let j = startSample; j < endSample && j < data.length; j++) {
                    if (data[j] > max) max = data[j];
                }
                
                const y = midY - (max * (plotHeight / 2) * 0.9);
                if (i === 0) ctx.moveTo(padding.left + i, y);
                else ctx.lineTo(padding.left + i, y);
            }
            
            // Bottom envelope (negative values) - go backwards
            for (let i = plotWidth - 1; i >= 0; i--) {
                const startSample = Math.floor(i * samplesPerPixel);
                const endSample = Math.floor((i + 1) * samplesPerPixel);
                
                let min = Infinity;
                for (let j = startSample; j < endSample && j < data.length; j++) {
                    if (data[j] < min) min = data[j];
                }
                
                const y = midY - (min * (plotHeight / 2) * 0.9);
                ctx.lineTo(padding.left + i, y);
            }
            
            ctx.closePath();
            ctx.globalAlpha = 0.6;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.stroke();
        };
        
        // Draw native waveform (blue)
        drawWaveformEnvelope(nativeData, nativeColor);
        
        // Draw user waveform (red)
        drawWaveformEnvelope(userData, userColor);
        
        // Legend
        const legendX = padding.left + 10;
        const legendY = padding.top - 25;
        
        ctx.fillStyle = nativeColor;
        ctx.fillRect(legendX, legendY, 12, 12);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Native (peak=${nativePeak.toFixed(2)})`, legendX + 18, legendY + 10);
        
        ctx.fillStyle = userColor;
        ctx.fillRect(legendX + 180, legendY, 12, 12);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(`You (peak=${userPeak.toFixed(2)})`, legendX + 198, legendY + 10);
    }
    
    drawPitch(ctx, canvas) {
        if (!this.analysisResults || !this.analysisResults.features) {
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Pitch data not available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const nativePitch = this.analysisResults.features.nativePitch;
        const userPitch = this.analysisResults.features.userPitch;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 60, right: 20, top: 40, bottom: 40 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        const nativeColor = '#3b82f6';
        const userColor = '#ffffff';
        
        // Find pitch range
        const allPitches = [...nativePitch, ...userPitch]
            .map(p => p.pitch)
            .filter(p => p > 0);
        
        if (allPitches.length === 0) {
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No pitch detected', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const minPitch = Math.min(...allPitches) * 0.9;
        const maxPitch = Math.max(...allPitches) * 1.1;
        
        // Draw axes
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        
        // Y-axis labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        
        const pitchTicks = 5;
        for (let i = 0; i <= pitchTicks; i++) {
            const pitch = minPitch + (i / pitchTicks) * (maxPitch - minPitch);
            const y = height - padding.bottom - (i / pitchTicks) * plotHeight;
            ctx.fillText(Math.round(pitch), padding.left - 5, y + 3);
            
            ctx.strokeStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        
        // Pitch label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Pitch (Hz)', 0, 0);
        ctx.restore();
        
        // Time axis
        const maxTime = Math.max(
            nativePitch.length > 0 ? nativePitch[nativePitch.length - 1].time : 0,
            userPitch.length > 0 ? userPitch[userPitch.length - 1].time : 0
        );
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ca3af';
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const x = padding.left + (i / numTicks) * plotWidth;
            const time = (i / numTicks) * maxTime;
            ctx.fillText(time.toFixed(2), x, height - padding.bottom + 15);
        }
        ctx.fillText('Time (seconds)', width / 2, height - 5);
        
        // Draw native pitch
        ctx.strokeStyle = nativeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let started = false;
        for (let i = 0; i < nativePitch.length; i++) {
            if (nativePitch[i].pitch > 0) {
                const x = padding.left + (nativePitch[i].time / maxTime) * plotWidth;
                const y = height - padding.bottom - ((nativePitch[i].pitch - minPitch) / (maxPitch - minPitch)) * plotHeight;
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
        
        // Draw user pitch
        ctx.strokeStyle = userColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        started = false;
        for (let i = 0; i < userPitch.length; i++) {
            if (userPitch[i].pitch > 0) {
                const x = padding.left + (userPitch[i].time / maxTime) * plotWidth;
                const y = height - padding.bottom - ((userPitch[i].pitch - minPitch) / (maxPitch - minPitch)) * plotHeight;
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // Draw stress dots overlay
        this.drawStressDotsOverlay(ctx, canvas, minPitch, maxPitch, maxTime, padding, plotWidth, plotHeight);

        // Legend
        const legendX = padding.left + 10;
        const legendY = padding.top - 25;

        ctx.fillStyle = nativeColor;
        ctx.fillRect(legendX, legendY, 12, 12);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Native Speaker', legendX + 18, legendY + 10);

        ctx.fillStyle = userColor;
        ctx.fillRect(legendX + 130, legendY, 12, 12);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('Your Recording', legendX + 148, legendY + 10);

        // Stress dots legend
        if (this.analysisResults?.stresses?.native?.length > 0 || this.analysisResults?.stresses?.user?.length > 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(legendX + 280, legendY + 6, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#e5e7eb';
            ctx.fillText('Native Stress', legendX + 290, legendY + 10);

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(legendX + 400, legendY + 6, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#e5e7eb';
            ctx.fillText('Your Stress', legendX + 410, legendY + 10);
        }

        // Range indicator
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Range: ${Math.round(minPitch)}-${Math.round(maxPitch)} Hz`, width - padding.right, padding.top - 10);
    }

    drawStressDotsOverlay(ctx, canvas, minPitch, maxPitch, maxTime, padding, plotWidth, plotHeight) {
        const nativeStresses = this.analysisResults?.stresses?.native || [];
        const userStresses = this.analysisResults?.stresses?.user || [];
        const nativePitch = this.analysisResults?.features?.nativePitch || [];
        const userPitch = this.analysisResults?.features?.userPitch || [];
        const height = canvas.height;

        // Helper to draw stress dots for a source
        const drawDots = (stresses, pitchData, color, yOffset) => {
            stresses.forEach((stress, idx) => {
                const x = padding.left + (stress.time / maxTime) * plotWidth;

                // Find pitch at this time
                let pitchAtTime = 0;
                for (const p of pitchData) {
                    if (Math.abs(p.time - stress.time) < 0.02 && p.pitch > 0) {
                        pitchAtTime = p.pitch;
                        break;
                    }
                }

                if (pitchAtTime > 0) {
                    const y = height - padding.bottom - ((pitchAtTime - minPitch) / (maxPitch - minPitch)) * plotHeight + yOffset;

                    // Draw stress dot with glow effect
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(x, y, 7, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Draw stress rank number
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(idx + 1, x, y + 3);
                }
            });
        };

        // Draw native stresses (orange, slightly above pitch line)
        drawDots(nativeStresses, nativePitch, '#f59e0b', -8);

        // Draw user stresses (red, slightly below pitch line)
        drawDots(userStresses, userPitch, '#ef4444', 8);
    }

    drawIntensity(ctx, canvas) {
        if (!this.analysisResults || !this.analysisResults.features) {
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Intensity data not available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const nativeIntensity = this.analysisResults.features.nativeIntensity;
        const userIntensity = this.analysisResults.features.userIntensity;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = { left: 60, right: 20, top: 50, bottom: 40 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const midY = padding.top + plotHeight / 2;
        
        const nativeColor = '#3b82f6';
        const userColor = '#ffffff';
        
        // Draw center line
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(width - padding.right, midY);
        ctx.stroke();
        
        // Draw Y-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.stroke();
        
        // Y-axis label
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('0', padding.left - 5, midY + 3);
        
        // Time axis
        const maxTime = Math.max(
            nativeIntensity.length > 0 ? nativeIntensity[nativeIntensity.length - 1].time : 0,
            userIntensity.length > 0 ? userIntensity[userIntensity.length - 1].time : 0
        );
        
        ctx.textAlign = 'center';
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const x = padding.left + (i / numTicks) * plotWidth;
            const time = (i / numTicks) * maxTime;
            ctx.fillText(time.toFixed(2), x, height - padding.bottom + 15);
        }
        ctx.fillText('Time (seconds)', width / 2, height - 5);
        
        // Calculate bar width
        const maxFrames = Math.max(nativeIntensity.length, userIntensity.length);
        const barWidth = Math.max(1, plotWidth / maxFrames);
        
        // Draw native intensity bars (above center line)
        ctx.fillStyle = nativeColor;
        for (let i = 0; i < nativeIntensity.length; i++) {
            const x = padding.left + (i / nativeIntensity.length) * plotWidth;
            const barHeight = nativeIntensity[i].intensity * (plotHeight / 2) * 0.9;
            ctx.fillRect(x, midY - barHeight, barWidth * 0.8, barHeight);
        }
        
        // Draw user intensity bars (below center line)
        ctx.fillStyle = userColor;
        for (let i = 0; i < userIntensity.length; i++) {
            const x = padding.left + (i / userIntensity.length) * plotWidth;
            const barHeight = userIntensity[i].intensity * (plotHeight / 2) * 0.9;
            ctx.fillRect(x, midY, barWidth * 0.8, barHeight);
        }
        
        // Legend labels
        ctx.fillStyle = nativeColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Native Speaker', padding.left + 5, padding.top - 30);
        
        ctx.fillStyle = userColor;
        ctx.fillText('Your Recording', padding.left + 5, height - padding.bottom + 35);
    }
    
    async playNative() {
        if (!this.nativeBuffer) {
            debugLogger?.log(2, 'playNative: no buffer');
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.nativeBuffer;
            source.connect(this.audioContext.destination);
            source.onended = resolve;
            source.start();
        });
    }
    
    async playUser() {
        if (!this.userBuffer) {
            debugLogger?.log(2, 'playUser: no buffer');
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.userBuffer;
            source.connect(this.audioContext.destination);
            source.onended = resolve;
            source.start();
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =================================================================
// DTW (Dynamic Time Warping)
// =================================================================
class DTW {
    static compute1D(seq1, seq2, window = 20) {
        const n = seq1.length;
        const m = seq2.length;
        
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        const effectiveWindow = window > 0 ? window : Math.max(n, m);
        
        for (let i = 1; i <= n; i++) {
            const jStart = Math.max(1, Math.floor(i * m / n) - effectiveWindow);
            const jEnd = Math.min(m, Math.floor(i * m / n) + effectiveWindow);
            
            for (let j = jStart; j <= jEnd; j++) {
                const distance = Math.abs(seq1[i-1] - seq2[j-1]);
                
                const cost1 = cost[i-1][j];
                const cost2 = cost[i][j-1];
                const cost3 = cost[i-1][j-1];
                
                cost[i][j] = distance + Math.min(cost1, cost2, cost3);
            }
        }
        
        const totalDistance = cost[n][m];
        const pathLength = n + m;
        const normalizedDistance = totalDistance / pathLength;
        
        return {
            distance: totalDistance,
            normalizedDistance: normalizedDistance,
            cost: cost
        };
    }
    
    static computeMultiDim(seq1, seq2, numDims, window = 20) {
        const n = seq1.length;
        const m = seq2.length;
        
        if (n === 0 || m === 0) {
            return { distance: Infinity, normalizedDistance: Infinity };
        }
        
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        const effectiveWindow = window > 0 ? window : Math.max(n, m);
        
        for (let i = 1; i <= n; i++) {
            const jStart = Math.max(1, Math.floor(i * m / n) - effectiveWindow);
            const jEnd = Math.min(m, Math.floor(i * m / n) + effectiveWindow);
            
            for (let j = jStart; j <= jEnd; j++) {
                // Euclidean distance across dimensions
                let dist = 0;
                for (let d = 0; d < numDims; d++) {
                    const diff = seq1[i-1][d] - seq2[j-1][d];
                    dist += diff * diff;
                }
                dist = Math.sqrt(dist);
                
                cost[i][j] = dist + Math.min(
                    cost[i-1][j],
                    cost[i][j-1],
                    cost[i-1][j-1]
                );
            }
        }
        
        const totalDistance = cost[n][m];
        const pathLength = n + m;
        const normalizedDistance = totalDistance / pathLength;
        
        return {
            distance: totalDistance,
            normalizedDistance: normalizedDistance
        };
    }
}

// =================================================================
// PRONUNCIATION ANALYZER (Enhanced with Meyda + VAD + Deltas)
// =================================================================
class PronunciationAnalyzer {
    constructor(nativeBuffer, userBuffer, useDTW = true, audioContext = null) {
        this.nativeBuffer = nativeBuffer;
        this.userBuffer = userBuffer;
        this.useDTW = useDTW;
        this.audioContext = audioContext;
    }

    async analyze() {
        debugLogger?.log(3, 'Starting enhanced pronunciation analysis...');

        // Use EnhancedMFCCProcessor if audioContext is available
        if (this.audioContext) {
            return this.analyzeEnhanced();
        }

        // Fallback to legacy analysis if no audioContext
        return this.analyzeLegacy();
    }

    async analyzeEnhanced() {
        const processor = new EnhancedMFCCProcessor(this.audioContext);
        const stressDetector = new ProsodicStressDetector();
        const voiceQualityAnalyzer = new SimpleVoiceQualityAnalyzer(this.audioContext.sampleRate);

        // Extract features using enhanced processor
        const nativePitch = processor.extractPitch(this.nativeBuffer);
        const userPitch = processor.extractPitch(this.userBuffer);

        const nativeMFCCResult = await processor.extractMFCCs(this.nativeBuffer, { includeDeltas: true });
        const userMFCCResult = await processor.extractMFCCs(this.userBuffer, { includeDeltas: true });

        const nativeIntensity = processor.extractIntensity(this.nativeBuffer);
        const userIntensity = processor.extractIntensity(this.userBuffer);

        // Detect stressed syllables
        const nativeStresses = stressDetector.detect(nativePitch, nativeIntensity, this.audioContext.sampleRate);
        const userStresses = stressDetector.detect(userPitch, userIntensity, this.audioContext.sampleRate);

        // Voice quality analysis (stability & clarity)
        const nativeVQ = voiceQualityAnalyzer.analyze(nativePitch, nativeIntensity, this.nativeBuffer);
        const userVQ = voiceQualityAnalyzer.analyze(userPitch, userIntensity, this.userBuffer);

        // Use enhanced MFCC comparison with deltas and Z-normalization
        const mfccComparison = compareMFCCsEnhanced(nativeMFCCResult, userMFCCResult, this.useDTW);

        // Use enhanced pitch/intensity comparison
        const pitchComparison = comparePitchEnhanced(nativePitch, userPitch, this.useDTW);
        const intensityComparison = compareIntensityEnhanced(nativeIntensity, userIntensity, this.useDTW);

        // Stress position and pattern scoring
        const stressScores = StressScorer.score(nativeStresses, userStresses, this.nativeBuffer.duration);

        // Voice quality scoring
        const voiceQualityScore = scoreVoiceQuality(nativeVQ, userVQ);

        // Rhythm scoring (%V - vowel proportion)
        const rhythmScore = scoreRhythm(nativePitch, userPitch, nativeIntensity, userIntensity);

        const durationScore = this.compareDuration();

        // Final weights optimized for Philippine languages (8 factors)
        const weights = {
            mfcc: 0.25,            // Vowel quality (MFCC with deltas)
            pitch: 0.18,           // Pitch/intonation contour
            stressPosition: 0.12, // Syllable timing alignment
            stressPattern: 0.10,  // Prominence ordering
            intensity: 0.10,      // Envelope/dynamics
            duration: 0.10,       // Overall timing
            voiceQuality: 0.08,   // Stability & clarity
            rhythm: 0.07          // Vowel proportion (%V)
        };

        const overallScore = Math.round(
            mfccComparison.score * weights.mfcc +
            pitchComparison.score * weights.pitch +
            stressScores.position * weights.stressPosition +
            stressScores.pattern * weights.stressPattern +
            intensityComparison.score * weights.intensity +
            durationScore * weights.duration +
            voiceQualityScore.score * weights.voiceQuality +
            rhythmScore.score * weights.rhythm
        );

        debugLogger?.log(3, `Enhanced analysis complete. Score: ${overallScore}`);
        debugLogger?.log(3, `  MFCC: ${mfccComparison.score}, Pitch: ${pitchComparison.score}`);
        debugLogger?.log(3, `  Stress Position: ${stressScores.position}, Pattern: ${stressScores.pattern}`);
        debugLogger?.log(3, `  Intensity: ${intensityComparison.score}, Duration: ${durationScore}`);
        debugLogger?.log(3, `  Voice Quality: ${voiceQualityScore.score}, Rhythm: ${rhythmScore.score}`);
        debugLogger?.log(3, `  Stresses: native=${nativeStresses.length}, user=${userStresses.length}`);
        debugLogger?.log(3, `  VAD trimmed native: ${nativeMFCCResult.vadInfo.trimmedDuration.toFixed(2)}s`);
        debugLogger?.log(3, `  VAD trimmed user: ${userMFCCResult.vadInfo.trimmedDuration.toFixed(2)}s`);

        return {
            score: overallScore,
            features: {
                nativePitch,
                userPitch,
                nativeMFCCs: nativeMFCCResult.frames,
                userMFCCs: userMFCCResult.frames,
                nativeIntensity,
                userIntensity
            },
            stresses: {
                native: nativeStresses,
                user: userStresses
            },
            voiceQuality: {
                native: nativeVQ,
                user: userVQ
            },
            vadInfo: {
                native: nativeMFCCResult.vadInfo,
                user: userMFCCResult.vadInfo
            },
            mfccDetails: mfccComparison,
            pitchDetails: pitchComparison,
            intensityDetails: intensityComparison,
            stressScores,
            voiceQualityScore,
            rhythmScore
        };
    }

    analyzeLegacy() {
        debugLogger?.log(3, 'Using legacy analysis (no audioContext)');

        // Create a temporary processor for pitch/intensity extraction
        const tempProcessor = {
            sampleRate: this.nativeBuffer.sampleRate,
            frameSize: 1024,
            hopSize: 128
        };

        // Extract pitch using autocorrelation
        const nativePitch = this.extractPitchLegacy(this.nativeBuffer);
        const userPitch = this.extractPitchLegacy(this.userBuffer);

        const nativeMFCCs = this.extractMFCCsLegacy(this.nativeBuffer);
        const userMFCCs = this.extractMFCCsLegacy(this.userBuffer);

        const nativeIntensity = this.extractIntensityLegacy(this.nativeBuffer);
        const userIntensity = this.extractIntensityLegacy(this.userBuffer);

        const pitchScore = this.comparePitch(nativePitch, userPitch);
        const mfccScore = this.compareMFCCsLegacy(nativeMFCCs, userMFCCs);
        const durationScore = this.compareDuration();
        const spectralScore = this.compareSpectral(nativeMFCCs, userMFCCs);
        const stressScore = this.compareStress(nativeIntensity, userIntensity);
        const qualityScore = this.assessQuality(nativeMFCCs, userPitch);

        const weights = {
            pitch: 0.30,
            mfcc: 0.25,
            spectral: 0.15,
            duration: 0.15,
            stress: 0.10,
            quality: 0.05
        };

        const overallScore = Math.round(
            pitchScore * weights.pitch +
            mfccScore * weights.mfcc +
            spectralScore * weights.spectral +
            durationScore * weights.duration +
            stressScore * weights.stress +
            qualityScore * weights.quality
        );

        debugLogger?.log(3, `Legacy analysis complete. Score: ${overallScore}`);

        return {
            score: overallScore,
            features: {
                nativePitch,
                userPitch,
                nativeMFCCs,
                userMFCCs,
                nativeIntensity,
                userIntensity
            }
        };
    }

    // Legacy extraction methods for fallback
    extractPitchLegacy(buffer) {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const frameSize = 2048;
        const hopSize = 128;
        const minPitch = 75;
        const maxPitch = 500;
        const pitchTrack = [];

        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = Array.from(data.slice(i, i + frameSize));
            const pitch = this.estimatePitchLegacy(frame, sampleRate, minPitch, maxPitch);
            pitchTrack.push({ time: i / sampleRate, pitch });
        }

        return pitchTrack;
    }

    estimatePitchLegacy(frame, sampleRate, minPitch, maxPitch) {
        const minLag = Math.floor(sampleRate / maxPitch);
        const maxLag = Math.floor(sampleRate / minPitch);
        let maxCorr = -Infinity;
        let bestLag = 0;

        for (let lag = minLag; lag < maxLag; lag++) {
            let corr = 0, norm1 = 0, norm2 = 0;
            for (let j = 0; j < frame.length - lag; j++) {
                corr += frame[j] * frame[j + lag];
                norm1 += frame[j] * frame[j];
                norm2 += frame[j + lag] * frame[j + lag];
            }
            if (norm1 > 0 && norm2 > 0) corr /= Math.sqrt(norm1 * norm2);
            if (corr > maxCorr) { maxCorr = corr; bestLag = lag; }
        }

        return maxCorr < 0.3 ? 0 : sampleRate / bestLag;
    }

    extractMFCCsLegacy(buffer) {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const frameSize = 1024;
        const hopSize = 128;
        const numCoeffs = 13;
        const numFilters = 40;
        const mfccs = [];

        const filterbank = this.createMelFilterbankLegacy(frameSize, numFilters, sampleRate);

        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = Array.from(data.slice(i, i + frameSize));
            const windowed = this.applyHammingWindowLegacy(frame);
            const spectrum = this.computeFFTLegacy(windowed);
            const melEnergies = this.applyMelFilterbankLegacy(spectrum, filterbank);
            const logMelEnergies = melEnergies.map(e => Math.log(Math.max(e, 1e-10)));
            const coeffs = this.computeDCTLegacy(logMelEnergies, numCoeffs);

            mfccs.push({ time: i / sampleRate, coeffs });
        }

        return mfccs;
    }

    extractIntensityLegacy(buffer) {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const frameSize = 1024;
        const hopSize = 128;
        const intensity = [];

        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = data.slice(i, i + frameSize);
            let sum = 0;
            for (const sample of frame) sum += sample * sample;
            intensity.push({ time: i / sampleRate, intensity: Math.sqrt(sum / frameSize) });
        }

        const maxInt = Math.max(...intensity.map(i => i.intensity));
        if (maxInt > 0) intensity.forEach(i => i.intensity /= maxInt);

        return intensity;
    }

    // Legacy helper methods
    createMelFilterbankLegacy(frameSize, numFilters, sampleRate) {
        const fftSize = frameSize / 2 + 1;
        const hzToMel = hz => 2595 * Math.log10(1 + hz / 700);
        const melToHz = mel => 700 * (Math.pow(10, mel / 2595) - 1);
        const melMin = hzToMel(0);
        const melMax = hzToMel(sampleRate / 2);

        const melPoints = [];
        for (let i = 0; i <= numFilters + 1; i++) {
            melPoints.push(melMin + (i / (numFilters + 1)) * (melMax - melMin));
        }

        const binPoints = melPoints.map(mel => Math.floor((frameSize + 1) * melToHz(mel) / sampleRate));

        const filterbank = [];
        for (let m = 1; m <= numFilters; m++) {
            const filter = new Array(fftSize).fill(0);
            for (let k = binPoints[m - 1]; k < binPoints[m]; k++) {
                filter[k] = (k - binPoints[m - 1]) / (binPoints[m] - binPoints[m - 1]);
            }
            for (let k = binPoints[m]; k < binPoints[m + 1]; k++) {
                filter[k] = (binPoints[m + 1] - k) / (binPoints[m + 1] - binPoints[m]);
            }
            filterbank.push(filter);
        }
        return filterbank;
    }

    applyHammingWindowLegacy(frame) {
        const N = frame.length;
        return frame.map((s, n) => s * (0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1))));
    }

    computeFFTLegacy(frame) {
        const N = frame.length;
        const spectrum = new Array(N / 2 + 1).fill(0);
        for (let k = 0; k <= N / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                real += frame[n] * Math.cos(angle);
                imag += frame[n] * Math.sin(angle);
            }
            spectrum[k] = (real * real + imag * imag) / N;
        }
        return spectrum;
    }

    applyMelFilterbankLegacy(spectrum, filterbank) {
        return filterbank.map(filter => {
            let energy = 0;
            for (let k = 0; k < spectrum.length; k++) energy += spectrum[k] * filter[k];
            return energy;
        });
    }

    computeDCTLegacy(input, numCoeffs) {
        const N = input.length;
        const coeffs = [];
        for (let k = 0; k < numCoeffs; k++) {
            let sum = 0;
            for (let n = 0; n < N; n++) {
                sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
            }
            coeffs.push(sum * Math.sqrt(2 / N));
        }
        return coeffs;
    }

    comparePitch(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) return 50;

        const nativeVoiced = native.filter(p => p.pitch > 0).map(p => p.pitch);
        const userVoiced = user.filter(p => p.pitch > 0).map(p => p.pitch);

        if (nativeVoiced.length === 0 || userVoiced.length === 0) return 50;

        let score;

        if (this.useDTW) {
            const nativeMean = nativeVoiced.reduce((a, b) => a + b, 0) / nativeVoiced.length;
            const userMean = userVoiced.reduce((a, b) => a + b, 0) / userVoiced.length;

            const nativeNorm = nativeVoiced.map(p => p / nativeMean);
            const userNorm = userVoiced.map(p => p / userMean);

            const dtwResult = DTW.compute1D(nativeNorm, userNorm, 20);
            score = Math.max(0, 100 * (1 - dtwResult.normalizedDistance));

            debugLogger?.log(3, `Pitch DTW: distance=${dtwResult.normalizedDistance.toFixed(4)}, score=${score.toFixed(1)}`);
        } else {
            const nativeMean = nativeVoiced.reduce((a, b) => a + b, 0) / nativeVoiced.length;
            const userMean = userVoiced.reduce((a, b) => a + b, 0) / userVoiced.length;
            const ratio = Math.min(nativeMean, userMean) / Math.max(nativeMean, userMean);
            score = ratio * 100;
        }

        return Math.min(100, Math.max(0, score));
    }

    compareMFCCsLegacy(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) return 50;

        let score;

        if (this.useDTW) {
            const numCoeffs = native[0].coeffs.length;
            const nativeSeq = native.map(m => m.coeffs.slice(1));
            const userSeq = user.map(m => m.coeffs.slice(1));

            const dtwResult = DTW.computeMultiDim(nativeSeq, userSeq, numCoeffs - 1, 20);
            score = Math.max(0, 100 * (1 - dtwResult.normalizedDistance / 10));

            debugLogger?.log(3, `MFCC DTW (legacy): distance=${dtwResult.normalizedDistance.toFixed(4)}, score=${score.toFixed(1)}`);
        } else {
            const minLen = Math.min(native.length, user.length);
            let totalDist = 0;
            const numCoeffs = native[0].coeffs.length;

            for (let i = 0; i < minLen; i++) {
                let frameDist = 0;
                for (let c = 1; c < numCoeffs; c++) {
                    const diff = native[i].coeffs[c] - user[i].coeffs[c];
                    frameDist += diff * diff;
                }
                totalDist += Math.sqrt(frameDist);
            }

            const avgDist = totalDist / minLen;
            score = Math.max(0, 100 * (1 - avgDist / 10));
        }

        return Math.min(100, Math.max(0, score));
    }

    compareDuration() {
        const nativeDur = this.nativeBuffer.duration;
        const userDur = this.userBuffer.duration;
        const ratio = Math.min(nativeDur, userDur) / Math.max(nativeDur, userDur);
        return Math.round(ratio * 100);
    }

    compareSpectral(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) return 50;

        const nativeCentroid = this.computeSpectralCentroid(native);
        const userCentroid = this.computeSpectralCentroid(user);
        const ratio = Math.min(nativeCentroid, userCentroid) / Math.max(nativeCentroid, userCentroid);
        return Math.round(ratio * 100);
    }

    compareSpectralFromFrames(nativeFrames, userFrames) {
        if (!nativeFrames || !userFrames || nativeFrames.length === 0 || userFrames.length === 0) return 50;

        const nativeCentroid = this.computeSpectralCentroidFromFrames(nativeFrames);
        const userCentroid = this.computeSpectralCentroidFromFrames(userFrames);
        const ratio = Math.min(nativeCentroid, userCentroid) / Math.max(nativeCentroid, userCentroid);
        return Math.round(ratio * 100);
    }

    computeSpectralCentroid(mfccs) {
        let sum = 0;
        for (const frame of mfccs) {
            sum += Math.abs(frame.coeffs[1]) + Math.abs(frame.coeffs[2]);
        }
        return sum / mfccs.length;
    }

    computeSpectralCentroidFromFrames(frames) {
        let sum = 0;
        for (const frame of frames) {
            if (frame.coeffs && frame.coeffs.length > 2) {
                sum += Math.abs(frame.coeffs[1]) + Math.abs(frame.coeffs[2]);
            }
        }
        return sum / frames.length;
    }

    compareStress(nativeIntensity, userIntensity) {
        if (!nativeIntensity || !userIntensity) return 50;

        const nativePattern = nativeIntensity.map(i => i.intensity);
        const userPattern = userIntensity.map(i => i.intensity);

        if (nativePattern.length === 0 || userPattern.length === 0) return 50;

        let score;

        if (this.useDTW) {
            const dtwResult = DTW.compute1D(nativePattern, userPattern, 20);
            score = Math.max(0, 100 * (1 - dtwResult.normalizedDistance * 2));

            debugLogger?.log(3, `Stress DTW: distance=${dtwResult.normalizedDistance.toFixed(4)}, score=${score.toFixed(1)}`);
        } else {
            const len = Math.min(nativePattern.length, userPattern.length);
            let diff = 0;
            for (let i = 0; i < len; i++) {
                diff += Math.abs(nativePattern[i] - userPattern[i]);
            }
            const avgDiff = diff / len;
            score = Math.round((1 - avgDiff) * 100);
        }

        return Math.min(100, Math.max(0, score));
    }

    assessQuality(mfccs, pitch) {
        if (!mfccs || mfccs.length === 0) return 50;

        const voicedFrames = pitch.filter(p => p.pitch > 0).length;
        const voicingRatio = voicedFrames / pitch.length;

        let variance = 0;
        for (let c = 1; c < 5; c++) {
            const values = mfccs.map(m => m.coeffs[c]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            for (const v of values) {
                variance += (v - mean) * (v - mean);
            }
        }
        variance /= mfccs.length * 4;

        const stabilityScore = Math.max(0, 100 - variance);
        return Math.round((voicingRatio * 50 + stabilityScore * 0.5));
    }

    assessQualityFromFrames(frames, pitch) {
        if (!frames || frames.length === 0) return 50;

        const voicedFrames = pitch.filter(p => p.pitch > 0).length;
        const voicingRatio = voicedFrames / pitch.length;

        let variance = 0;
        for (let c = 1; c < 5; c++) {
            const values = frames.map(f => f.coeffs[c]).filter(v => v !== undefined);
            if (values.length === 0) continue;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            for (const v of values) {
                variance += (v - mean) * (v - mean);
            }
        }
        variance /= frames.length * 4;

        const stabilityScore = Math.max(0, 100 - variance);
        return Math.round((voicingRatio * 50 + stabilityScore * 0.5));
    }
}

// =================================================================
// ENHANCED MFCC PROCESSOR - Accurate FFT via Meyda + VAD + Deltas
// =================================================================
class EnhancedMFCCProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;
        this.frameSize = 1024;
        this.hopSize = 128;
        this.vadThresholdEnergy = 0.01;
        this.vadThresholdZCR = 0.2;
        this.minVoicedFrames = 10;
    }

    // Voice Activity Detection (Energy + ZCR hybrid)
    detectVoicedRegions(buffer) {
        const signal = buffer.getChannelData(0);
        const frames = [];
        const energies = [];
        const zcrs = [];

        for (let i = 0; i < signal.length - this.frameSize; i += this.hopSize) {
            const frame = signal.subarray(i, i + this.frameSize);

            // RMS Energy
            let sumSq = 0;
            for (let j = 0; j < frame.length; j++) sumSq += frame[j] * frame[j];
            const energy = Math.sqrt(sumSq / frame.length);
            energies.push(energy);

            // Zero-Crossing Rate
            let zcr = 0;
            for (let j = 1; j < frame.length; j++) {
                if ((frame[j-1] >= 0 && frame[j] < 0) || (frame[j-1] < 0 && frame[j] >= 0)) zcr++;
            }
            zcrs.push(zcr / frame.length);

            frames.push({
                start: i,
                end: i + this.frameSize,
                energy,
                zcr: zcr / frame.length,
                time: i / this.sampleRate
            });
        }

        // Adaptive energy threshold (90th percentile)
        const sortedEnergies = [...energies].sort((a, b) => a - b);
        const energyThresh = sortedEnergies[Math.floor(sortedEnergies.length * 0.9)];

        // VAD decision: energy above threshold AND low ZCR (voiced speech)
        const voicedFrames = frames.filter(f =>
            f.energy > Math.max(this.vadThresholdEnergy, energyThresh * 0.3) &&
            f.zcr < this.vadThresholdZCR
        );

        if (voicedFrames.length < this.minVoicedFrames) {
            debugLogger?.log(2, "VAD: Not enough voiced speech detected. Using full audio.");
            return { voicedFrames: frames, trimStart: 0, trimEnd: buffer.duration };
        }

        const trimStart = voicedFrames[0].time;
        const trimEnd = voicedFrames[voicedFrames.length - 1].time + this.frameSize / this.sampleRate;

        return {
            voicedFrames,
            trimStart,
            trimEnd,
            totalVoicedSeconds: trimEnd - trimStart
        };
    }

    // Extract MFCCs using Meyda with VAD trimming
    async extractMFCCs(audioBuffer, options = {}) {
        const {
            numCoeffs = 13,
            melBands = 40,
            lifter = 22,
            includeDeltas = true
        } = options;

        // Run VAD and trim silence
        const vad = this.detectVoicedRegions(audioBuffer);
        let processedBuffer = audioBuffer;

        if (vad.trimStart > 0 || vad.trimEnd < audioBuffer.duration) {
            const startSample = Math.floor(vad.trimStart * this.sampleRate);
            const endSample = Math.min(
                Math.ceil(vad.trimEnd * this.sampleRate),
                audioBuffer.length
            );
            const trimmed = this.audioContext.createBuffer(
                1,
                endSample - startSample,
                this.sampleRate
            );
            trimmed.copyToChannel(audioBuffer.getChannelData(0).slice(startSample, endSample), 0);
            processedBuffer = trimmed;
        }

        const signal = processedBuffer.getChannelData(0);

        // Check if Meyda is available
        if (typeof Meyda === 'undefined') {
            debugLogger?.log(1, 'Meyda not loaded, falling back to manual MFCC extraction');
            return this.extractMFCCsFallback(processedBuffer, vad, options);
        }

        // Extract MFCCs frame by frame using Meyda
        const allMfccs = [];
        for (let i = 0; i < signal.length - this.frameSize; i += this.hopSize) {
            const frame = signal.slice(i, i + this.frameSize);

            // Ensure frame is correct length (pad if necessary)
            const paddedFrame = new Float32Array(this.frameSize);
            paddedFrame.set(frame);

            try {
                const mfcc = Meyda.extract('mfcc', paddedFrame, {
                    sampleRate: this.sampleRate,
                    bufferSize: this.frameSize,
                    numberOfMFCCCoefficients: numCoeffs,
                    melBands: melBands
                });

                if (mfcc && mfcc.length > 0) {
                    allMfccs.push(Array.from(mfcc));
                }
            } catch (err) {
                debugLogger?.log(2, `Meyda extraction error at frame ${i}: ${err.message}`);
            }
        }

        if (allMfccs.length === 0) {
            debugLogger?.log(1, 'No MFCCs extracted, falling back to manual extraction');
            return this.extractMFCCsFallback(processedBuffer, vad, options);
        }

        // Build frame objects with liftering and deltas
        const framesPerSecond = this.sampleRate / this.hopSize;
        const frames = [];

        for (let i = 0; i < allMfccs.length; i++) {
            const mfccFrame = [...allMfccs[i]];

            // Apply liftering
            if (lifter > 0) {
                for (let c = 0; c < mfccFrame.length; c++) {
                    const lift = 1 + (lifter / 2) * Math.sin(Math.PI * c / lifter);
                    mfccFrame[c] *= lift;
                }
            }

            frames.push({
                time: (i / framesPerSecond) + vad.trimStart,
                coeffs: mfccFrame,
                deltas: includeDeltas ? this.computeDeltas(allMfccs, i) : null,
                deltaDeltas: includeDeltas ? this.computeDeltaDeltas(allMfccs, i) : null
            });
        }

        debugLogger?.log(3, `Extracted ${frames.length} MFCC frames (Meyda)`);

        return {
            frames,
            vadInfo: {
                originalDuration: audioBuffer.duration,
                trimmedDuration: processedBuffer.duration,
                voicedRatio: processedBuffer.duration / audioBuffer.duration,
                trimStart: vad.trimStart,
                trimEnd: vad.trimEnd
            }
        };
    }

    // Fallback MFCC extraction when Meyda is not available
    extractMFCCsFallback(processedBuffer, vad, options = {}) {
        const { numCoeffs = 13, lifter = 22, includeDeltas = true } = options;
        const signal = processedBuffer.getChannelData(0);
        const numFilters = 40;
        const frames = [];
        const allMfccs = [];

        const filterbank = this.createMelFilterbank(this.frameSize, numFilters);

        for (let i = 0; i < signal.length - this.frameSize; i += this.hopSize) {
            const frame = signal.slice(i, i + this.frameSize);
            const windowed = this.applyHammingWindow(Array.from(frame));
            const spectrum = this.computeFFT(windowed);
            const melEnergies = this.applyMelFilterbank(spectrum, filterbank);
            const logMelEnergies = melEnergies.map(e => Math.log(Math.max(e, 1e-10)));
            const coeffs = this.computeDCT(logMelEnergies, numCoeffs);

            allMfccs.push(coeffs);
        }

        const framesPerSecond = this.sampleRate / this.hopSize;

        for (let i = 0; i < allMfccs.length; i++) {
            const mfccFrame = [...allMfccs[i]];

            // Apply liftering
            if (lifter > 0) {
                for (let c = 0; c < mfccFrame.length; c++) {
                    const lift = 1 + (lifter / 2) * Math.sin(Math.PI * c / lifter);
                    mfccFrame[c] *= lift;
                }
            }

            frames.push({
                time: (i / framesPerSecond) + vad.trimStart,
                coeffs: mfccFrame,
                deltas: includeDeltas ? this.computeDeltas(allMfccs, i) : null,
                deltaDeltas: includeDeltas ? this.computeDeltaDeltas(allMfccs, i) : null
            });
        }

        debugLogger?.log(3, `Extracted ${frames.length} MFCC frames (fallback)`);

        return {
            frames,
            vadInfo: {
                originalDuration: processedBuffer.duration,
                trimmedDuration: processedBuffer.duration,
                voicedRatio: 1.0,
                trimStart: vad.trimStart,
                trimEnd: vad.trimEnd
            }
        };
    }

    // Delta computation (first-order regression)
    computeDeltas(mfccArray, frameIdx, window = 2) {
        if (!mfccArray || mfccArray.length === 0) return null;
        const delta = new Array(mfccArray[0].length).fill(0);
        let norm = 0;

        for (let n = 1; n <= window; n++) {
            const prev = mfccArray[Math.max(0, frameIdx - n)] || mfccArray[frameIdx];
            const next = mfccArray[Math.min(mfccArray.length - 1, frameIdx + n)] || mfccArray[frameIdx];
            for (let i = 0; i < delta.length; i++) {
                delta[i] += n * (next[i] - prev[i]);
            }
            norm += n * n;
        }
        norm *= 2;
        return delta.map(d => norm === 0 ? 0 : d / norm);
    }

    // Delta-delta computation
    computeDeltaDeltas(mfccArray, frameIdx, window = 2) {
        if (!mfccArray || mfccArray.length === 0) return null;

        // First compute deltas for surrounding frames
        const deltas = [];
        for (let i = Math.max(0, frameIdx - window); i <= Math.min(mfccArray.length - 1, frameIdx + window); i++) {
            deltas.push(this.computeDeltas(mfccArray, i, window));
        }

        // Then compute delta of deltas
        const centerIdx = Math.min(window, frameIdx);
        return this.computeDeltas(deltas, centerIdx, Math.min(window, deltas.length - 1));
    }

    // Fallback helper methods
    createMelFilterbank(frameSize, numFilters) {
        const fftSize = frameSize / 2 + 1;
        const melMin = this.hzToMel(0);
        const melMax = this.hzToMel(this.sampleRate / 2);

        const melPoints = [];
        for (let i = 0; i <= numFilters + 1; i++) {
            melPoints.push(melMin + (i / (numFilters + 1)) * (melMax - melMin));
        }

        const binPoints = melPoints.map(mel => {
            const hz = this.melToHz(mel);
            return Math.floor((frameSize + 1) * hz / this.sampleRate);
        });

        const filterbank = [];
        for (let m = 1; m <= numFilters; m++) {
            const filter = new Array(fftSize).fill(0);
            for (let k = binPoints[m - 1]; k < binPoints[m]; k++) {
                filter[k] = (k - binPoints[m - 1]) / (binPoints[m] - binPoints[m - 1]);
            }
            for (let k = binPoints[m]; k < binPoints[m + 1]; k++) {
                filter[k] = (binPoints[m + 1] - k) / (binPoints[m + 1] - binPoints[m]);
            }
            filterbank.push(filter);
        }
        return filterbank;
    }

    hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
    melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); }

    applyHammingWindow(frame) {
        const N = frame.length;
        return frame.map((sample, n) => sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1))));
    }

    computeFFT(frame) {
        const N = frame.length;
        const spectrum = new Array(N / 2 + 1).fill(0);
        for (let k = 0; k <= N / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                real += frame[n] * Math.cos(angle);
                imag += frame[n] * Math.sin(angle);
            }
            spectrum[k] = (real * real + imag * imag) / N;
        }
        return spectrum;
    }

    applyMelFilterbank(spectrum, filterbank) {
        return filterbank.map(filter => {
            let energy = 0;
            for (let k = 0; k < spectrum.length; k++) {
                energy += spectrum[k] * filter[k];
            }
            return energy;
        });
    }

    computeDCT(input, numCoeffs) {
        const N = input.length;
        const coeffs = [];
        for (let k = 0; k < numCoeffs; k++) {
            let sum = 0;
            for (let n = 0; n < N; n++) {
                sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
            }
            coeffs.push(sum * Math.sqrt(2 / N));
        }
        return coeffs;
    }

    // Extract pitch (autocorrelation method) with isVoiced flag and confidence
    extractPitch(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const frameSize = 2048;
        const hopSize = this.hopSize;
        const minPitch = 75;
        const maxPitch = 500;
        const pitchTrack = [];

        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = data.slice(i, i + frameSize);
            const result = this.estimatePitchWithConfidence(Array.from(frame), minPitch, maxPitch);
            pitchTrack.push({
                time: i / this.sampleRate,
                pitch: result.pitch,
                confidence: result.confidence,
                isVoiced: result.pitch > 0 && result.confidence >= 0.3
            });
        }

        // Median filter for smoothing (only on voiced frames)
        const smoothed = this.medianFilter(pitchTrack.map(p => p.pitch), 5);
        return pitchTrack.map((p, i) => ({
            time: p.time,
            pitch: smoothed[i],
            confidence: p.confidence,
            isVoiced: smoothed[i] > 0 && p.confidence >= 0.3
        }));
    }

    estimatePitchWithConfidence(frame, minPitch, maxPitch) {
        const minLag = Math.floor(this.sampleRate / maxPitch);
        const maxLag = Math.floor(this.sampleRate / minPitch);
        let maxCorr = -Infinity;
        let bestLag = 0;

        for (let lag = minLag; lag < maxLag; lag++) {
            let corr = 0, norm1 = 0, norm2 = 0;
            for (let j = 0; j < frame.length - lag; j++) {
                corr += frame[j] * frame[j + lag];
                norm1 += frame[j] * frame[j];
                norm2 += frame[j + lag] * frame[j + lag];
            }
            if (norm1 > 0 && norm2 > 0) {
                corr /= Math.sqrt(norm1 * norm2);
            }
            if (corr > maxCorr) {
                maxCorr = corr;
                bestLag = lag;
            }
        }

        const voicingThreshold = 0.3;
        if (maxCorr < voicingThreshold) {
            return { pitch: 0, confidence: maxCorr };
        }
        return { pitch: this.sampleRate / bestLag, confidence: maxCorr };
    }

    medianFilter(data, windowSize) {
        const result = [];
        const halfWindow = Math.floor(windowSize / 2);
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(data.length, i + halfWindow + 1);
            const window = data.slice(start, end).sort((a, b) => a - b);
            result.push(window[Math.floor(window.length / 2)]);
        }
        return result;
    }

    // Extract intensity (RMS energy) with both rms and intensity fields
    extractIntensity(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const frameSize = this.frameSize;
        const hopSize = this.hopSize;
        const intensity = [];

        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = data.slice(i, i + frameSize);
            let sum = 0;
            for (const sample of frame) {
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / frameSize);
            intensity.push({
                time: i / this.sampleRate,
                rms: rms,           // Raw RMS for stress detection
                intensity: rms      // Will be normalized below
            });
        }

        // Normalize intensity field (keep rms as raw)
        const maxIntensity = Math.max(...intensity.map(i => i.rms));
        if (maxIntensity > 0) {
            intensity.forEach(i => {
                i.intensity = i.rms / maxIntensity;
            });
        }

        return intensity;
    }
}

// =================================================================
// ENHANCED MFCC COMPARISON (with deltas + Z-normalization + Sakoe-Chiba DTW)
// =================================================================
function compareMFCCsEnhanced(nativeResult, userResult, useDTW = true) {
    const nativeFrames = nativeResult.frames;
    const userFrames = userResult.frames;

    if (!nativeFrames || !userFrames || nativeFrames.length === 0 || userFrames.length === 0) {
        return { score: 50, distance: Infinity, avgDistance: Infinity };
    }

    // Concatenate static + delta + delta-delta
    const concat = (frame) => {
        const c = frame.coeffs || [];
        const d = frame.deltas || [];
        const dd = frame.deltaDeltas || [];
        return [...c, ...d, ...dd];
    };

    const nativeVec = nativeFrames.map(concat);
    const userVec = userFrames.map(concat);

    // Z-score normalization per coefficient across all frames
    const zNormalize = (vectors) => {
        if (vectors.length === 0 || vectors[0].length === 0) return vectors;

        const dim = vectors[0].length;
        const stats = [];

        for (let i = 0; i < dim; i++) {
            let sum = 0, sumSq = 0;
            for (const v of vectors) {
                sum += v[i];
                sumSq += v[i] * v[i];
            }
            const mean = sum / vectors.length;
            const variance = sumSq / vectors.length - mean * mean;
            const std = variance > 0 ? Math.sqrt(variance) : 1;
            stats.push({ mean, std });
        }

        return vectors.map(frame =>
            frame.map((val, i) => (val - stats[i].mean) / stats[i].std)
        );
    };

    const nativeNorm = zNormalize(nativeVec);
    const userNorm = zNormalize(userVec);

    const euclidean = (a, b) => {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    };

    if (!useDTW) {
        const len = Math.min(nativeNorm.length, userNorm.length);
        let total = 0;
        for (let i = 0; i < len; i++) total += euclidean(nativeNorm[i], userNorm[i]);
        const score = Math.max(0, 100 - total * 2.5);
        return { score: Math.round(score), distance: total };
    }

    // DTW with Sakoe-Chiba band (±10% of length)
    const n = nativeNorm.length;
    const m = userNorm.length;
    const band = Math.floor(Math.max(n, m) * 0.1);

    const dtw = Array(n + 1).fill().map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        const jStart = Math.max(1, i - band);
        const jEnd = Math.min(m, i + band);
        for (let j = jStart; j <= jEnd; j++) {
            const cost = euclidean(nativeNorm[i - 1], userNorm[j - 1]);
            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j],
                dtw[i][j - 1],
                dtw[i - 1][j - 1]
            );
        }
    }

    const distance = dtw[n][m];
    const avgDistance = distance / Math.max(n, m);
    const score = Math.max(0, Math.min(100, 100 - avgDistance * 4.5));

    return {
        score: Math.round(score),
        distance,
        avgDistance,
        alignmentRatio: Math.min(n, m) / Math.max(n, m)
    };
}

// =================================================================
// PROSODIC STRESS DETECTOR - Syllable-level stress detection
// =================================================================
class ProsodicStressDetector {
    constructor(options = {}) {
        this.pitchWeight = options.pitchWeight ?? 0.55;
        this.intensityWeight = options.intensityWeight ?? 0.35;
        this.durationWeight = options.durationWeight ?? 0.10;
        this.minProminence = options.minProminence ?? 0.65;
        this.windowMs = options.windowMs ?? 120;
    }

    // Main entry point: returns stress events with timing + strength
    detect(pitchContour, intensityContour, sampleRate) {
        if (!pitchContour || !intensityContour || pitchContour.length === 0) {
            return [];
        }

        const stresses = [];
        const hopMs = 1000 / (sampleRate / 128); // ~7.8ms per frame at 128 hop

        for (let i = 0; i < pitchContour.length; i++) {
            const p = pitchContour[i];
            if (!p.isVoiced || p.pitch === 0) continue;

            const centerTime = p.time;
            const windowFrames = Math.round(this.windowMs / hopMs);
            const start = Math.max(0, i - windowFrames);
            const end = Math.min(pitchContour.length, i + windowFrames + 1);

            // Gather local statistics
            const localPitches = [];
            const localEnergies = [];

            for (let j = start; j < end; j++) {
                if (pitchContour[j].isVoiced) {
                    localPitches.push(pitchContour[j].pitch);
                    if (intensityContour[j]) {
                        localEnergies.push(intensityContour[j].rms || intensityContour[j].intensity);
                    }
                }
            }

            if (localPitches.length < 5) continue;

            const meanP = this.mean(localPitches);
            const stdP = this.std(localPitches, meanP);
            const meanE = this.mean(localEnergies);
            const stdE = this.std(localEnergies, meanE);

            const zPitch = stdP > 0 ? (p.pitch - meanP) / stdP : 0;
            const currentEnergy = intensityContour[i] ?
                (intensityContour[i].rms || intensityContour[i].intensity) : 0;
            const zEnergy = stdE > 0 ? (currentEnergy - meanE) / stdE : 0;

            // Duration proxy: how long this voiced segment is compared to neighbors
            let durationScore = 0;
            const segment = this.findVoicedSegment(pitchContour, i);
            if (segment.length > 3) {
                const neighborLengths = [
                    this.findVoicedSegment(pitchContour, Math.max(0, i - 15)).length,
                    this.findVoicedSegment(pitchContour, Math.min(pitchContour.length - 1, i + 15)).length
                ].filter(l => l > 0);
                const avgNeighbor = neighborLengths.length > 0 ? this.mean(neighborLengths) : segment.length;
                durationScore = segment.length > avgNeighbor ? 1 : 0.3;
            }

            const prominence =
                this.pitchWeight * Math.max(0, zPitch) +
                this.intensityWeight * Math.max(0, zEnergy) +
                this.durationWeight * durationScore;

            if (prominence >= this.minProminence) {
                stresses.push({
                    time: centerTime,
                    frame: i,
                    prominence,
                    zPitch,
                    zEnergy,
                    durationScore,
                    segmentLength: segment.length
                });
            }
        }

        // Merge very close stresses (within ~80ms)
        return this.mergeCloseStresses(stresses, 0.08);
    }

    // Helper: find current voiced segment length around index
    findVoicedSegment(contour, idx) {
        if (idx < 0 || idx >= contour.length) return { start: idx, end: idx, length: 0 };
        let start = idx, end = idx;
        while (start > 0 && contour[start - 1].isVoiced) start--;
        while (end < contour.length - 1 && contour[end + 1].isVoiced) end++;
        return { start, end, length: end - start + 1 };
    }

    mergeCloseStresses(stresses, maxGapSec) {
        if (stresses.length <= 1) return stresses;
        const merged = [stresses[0]];
        for (let i = 1; i < stresses.length; i++) {
            const last = merged[merged.length - 1];
            const curr = stresses[i];
            if (curr.time - last.time <= maxGapSec) {
                // Keep the stronger one
                if (curr.prominence > last.prominence) {
                    merged[merged.length - 1] = curr;
                }
            } else {
                merged.push(curr);
            }
        }
        return merged;
    }

    mean(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    std(arr, meanVal) {
        if (!arr || arr.length === 0) return 1;
        const m = meanVal !== undefined ? meanVal : this.mean(arr);
        const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
        return Math.sqrt(variance) || 1;
    }
}

// =================================================================
// STRESS SCORER - Position + Pattern scoring
// =================================================================
class StressScorer {
    static score(nativeStresses, userStresses, duration) {
        if (!nativeStresses || nativeStresses.length === 0) {
            return { position: 100, pattern: 100, details: { nativeCount: 0, userCount: userStresses?.length || 0, matches: 0 } };
        }

        // 1. Stress Position Score (timing alignment)
        const positionMatches = this.countTimingMatches(nativeStresses, userStresses, duration);
        const positionScore = Math.round(100 * positionMatches / nativeStresses.length);

        // 2. Stress Pattern Score (relative ordering)
        const patternScore = this.relativePatternScore(nativeStresses, userStresses);

        return {
            position: Math.max(0, positionScore),
            pattern: Math.max(0, Math.round(patternScore)),
            details: {
                nativeCount: nativeStresses.length,
                userCount: userStresses?.length || 0,
                matches: positionMatches
            }
        };
    }

    // Count how many native stresses have a user stress within ±100ms
    static countTimingMatches(native, user, duration) {
        if (!user || user.length === 0) return 0;
        const tolerance = 0.100; // 100ms window
        let matches = 0;
        for (const ns of native) {
            for (const us of user) {
                if (Math.abs(ns.time - us.time) <= tolerance) {
                    matches++;
                    break;
                }
            }
        }
        return matches;
    }

    // Compare relative prominence order (e.g. strong–weak–strong)
    static relativePatternScore(native, user) {
        if (!native || native.length < 2 || !user || user.length < 2) {
            return 80; // not enough data → neutral
        }

        const nativeOrder = native.map(s => s.prominence);
        const userOrder = user.map(s => s.prominence);

        // Proper ranking with tie-breaking
        const rank = arr => {
            const indexed = arr.map((v, i) => ({ v, i }));
            indexed.sort((a, b) => b.v - a.v);
            const ranks = new Array(arr.length);
            indexed.forEach((item, rankIdx) => {
                ranks[item.i] = rankIdx;
            });
            return ranks;
        };

        const nativeRank = rank(nativeOrder);
        const userRank = rank(userOrder);

        // Spearman rank correlation
        const n = Math.min(nativeRank.length, userRank.length);
        let d2 = 0;
        for (let i = 0; i < n; i++) {
            const diff = nativeRank[i] - (userRank[i] !== undefined ? userRank[i] : userRank[userRank.length - 1]);
            d2 += diff * diff;
        }
        const spearman = n >= 3 ? 1 - (6 * d2) / (n * (n * n - 1)) : 0.7;
        return Math.round(100 * Math.max(0, spearman));
    }
}

// =================================================================
// SIMPLE VOICE QUALITY ANALYZER - Stability & Clarity metrics
// =================================================================
class SimpleVoiceQualityAnalyzer {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
    }

    analyze(pitchContour, intensityContour, audioBuffer) {
        // 1. Pitch Stability (proxy for jitter)
        const pitchStability = this.measurePitchStability(pitchContour);

        // 2. Amplitude Stability (proxy for shimmer)
        const ampStability = this.measureAmplitudeStability(intensityContour);

        // 3. Spectral Tilt (proxy for H1-H2 breathiness)
        const spectralTilt = this.measureSpectralTilt(audioBuffer);

        // 4. Harmonicity (proxy for HNR/CPP)
        const harmonicity = this.measureHarmonicity(pitchContour);

        return { pitchStability, ampStability, spectralTilt, harmonicity };
    }

    measurePitchStability(pitchContour) {
        // Get voiced frames only
        const voicedPitches = pitchContour
            .filter(p => p.isVoiced && p.pitch > 0)
            .map(p => p.pitch);

        if (voicedPitches.length < 5) return 100;

        // Coefficient of variation (lower = more stable)
        const mean = voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length;
        const variance = voicedPitches.reduce((s, v) => s + (v - mean) ** 2, 0) / voicedPitches.length;
        const cv = Math.sqrt(variance) / mean;

        // Convert to 0-100 score (cv of 0.05 = 100, cv of 0.3 = 0)
        return Math.round(Math.max(0, Math.min(100, 100 - cv * 400)));
    }

    measureAmplitudeStability(intensityContour) {
        // Use RMS values
        const rmsValues = intensityContour
            .map(i => i.rms || i.intensity)
            .filter(r => r > 0.01);  // Ignore silence

        if (rmsValues.length < 5) return 100;

        // Frame-to-frame variation
        let totalDiff = 0;
        for (let i = 1; i < rmsValues.length; i++) {
            totalDiff += Math.abs(rmsValues[i] - rmsValues[i - 1]);
        }
        const avgDiff = totalDiff / (rmsValues.length - 1);
        const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
        const relativeVariation = avgDiff / mean;

        // Convert to 0-100 (variation of 0.1 = 100, variation of 0.5 = 0)
        return Math.round(Math.max(0, Math.min(100, 100 - relativeVariation * 250)));
    }

    measureSpectralTilt(audioBuffer) {
        // Compare energy in low band vs high band
        const data = audioBuffer.getChannelData(0);
        const frameSize = Math.min(2048, data.length);

        // Use middle of audio for measurement
        const midPoint = Math.floor(data.length / 2);
        const start = Math.max(0, midPoint - Math.floor(frameSize / 2));
        const frame = data.slice(start, start + frameSize);

        // Low band: smoothed signal energy
        // High band: difference signal energy (high frequency content)
        const smoothed = this.movingAverage(frame, 10);

        let lowEnergy = 0, highEnergy = 0;
        for (let i = 0; i < frame.length; i++) {
            lowEnergy += smoothed[i] ** 2;
            highEnergy += (frame[i] - smoothed[i]) ** 2;
        }

        // Ratio: higher = more low-frequency energy = clearer voice
        const ratio = lowEnergy / (highEnergy + 1e-10);
        const tiltScore = Math.min(100, ratio * 10);

        return Math.round(Math.max(0, tiltScore));
    }

    measureHarmonicity(pitchContour) {
        // Use pitch confidence as proxy for harmonicity
        const voicedFrames = pitchContour.filter(p => p.isVoiced);

        if (voicedFrames.length === 0) return 50;

        // Average confidence of voiced frames
        const avgConfidence = voicedFrames.reduce((s, p) => s + (p.confidence || 0.5), 0) / voicedFrames.length;

        // Convert confidence (0.3-0.9) to score (0-100)
        return Math.round(Math.max(0, Math.min(100, (avgConfidence - 0.3) * 166)));
    }

    movingAverage(arr, window) {
        const result = new Array(arr.length);
        const halfWin = Math.floor(window / 2);

        for (let i = 0; i < arr.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - halfWin); j < Math.min(arr.length, i + halfWin + 1); j++) {
                sum += arr[j];
                count++;
            }
            result[i] = sum / count;
        }
        return result;
    }
}

// =================================================================
// VOICE QUALITY SCORING - Compare native vs user
// =================================================================
function scoreVoiceQuality(nativeVQ, userVQ) {
    if (!nativeVQ || !userVQ) return { score: 75, details: {} };

    const metrics = ['pitchStability', 'ampStability', 'spectralTilt', 'harmonicity'];

    let totalPenalty = 0;
    const details = {};

    for (const metric of metrics) {
        const nativeVal = nativeVQ[metric] || 75;
        const userVal = userVQ[metric] || 75;

        // Only penalize if user is worse than native
        const diff = nativeVal - userVal;
        details[metric] = { native: nativeVal, user: userVal, diff };

        if (diff > 0) {
            totalPenalty += diff * 0.25;  // Each metric contributes up to 25 points
        }
    }

    const score = Math.round(Math.max(0, 100 - totalPenalty));

    return { score, details };
}

// =================================================================
// RHYTHM SCORING - Vowel proportion (%V)
// =================================================================
function scoreRhythm(nativePitch, userPitch, nativeIntensity, userIntensity) {
    // Calculate %V (percentage of voiced frames) for each
    const calcPercentV = (pitch, intensity) => {
        if (!pitch || pitch.length === 0) return 50;

        const voicedCount = pitch.filter(p => p.isVoiced).length;
        return (voicedCount / pitch.length) * 100;
    };

    const nativePercentV = calcPercentV(nativePitch, nativeIntensity);
    const userPercentV = calcPercentV(userPitch, userIntensity);

    // Penalize difference in vowel proportion
    const diff = Math.abs(nativePercentV - userPercentV);
    const score = Math.round(Math.max(0, 100 - diff * 3));

    return {
        score,
        nativePercentV: Math.round(nativePercentV),
        userPercentV: Math.round(userPercentV)
    };
}

// =================================================================
// ENHANCED PITCH/INTENSITY COMPARISON
// =================================================================
function comparePitchEnhanced(nativePitch, userPitch, useDTW = true) {
    if (!nativePitch || !userPitch || nativePitch.length === 0 || userPitch.length === 0) {
        return { score: 50, contourScore: 50, rangeScore: 50 };
    }

    const nativeVoiced = nativePitch.filter(p => p.isVoiced && p.pitch > 0);
    const userVoiced = userPitch.filter(p => p.isVoiced && p.pitch > 0);

    if (nativeVoiced.length === 0 || userVoiced.length === 0) {
        return { score: 50, contourScore: 50, rangeScore: 50 };
    }

    // Extract pitch values
    const nativePitches = nativeVoiced.map(p => p.pitch);
    const userPitches = userVoiced.map(p => p.pitch);

    // 1. Pitch Range Score (compare F0 range)
    const nativeRange = { min: Math.min(...nativePitches), max: Math.max(...nativePitches) };
    const userRange = { min: Math.min(...userPitches), max: Math.max(...userPitches) };

    const nativeSpan = nativeRange.max - nativeRange.min;
    const userSpan = userRange.max - userRange.min;
    const rangeRatio = Math.min(nativeSpan, userSpan) / Math.max(nativeSpan, userSpan);
    const rangeScore = Math.round(rangeRatio * 100);

    // 2. Contour Score (normalized DTW comparison)
    const nativeMean = nativePitches.reduce((a, b) => a + b, 0) / nativePitches.length;
    const userMean = userPitches.reduce((a, b) => a + b, 0) / userPitches.length;

    const nativeNorm = nativePitches.map(p => p / nativeMean);
    const userNorm = userPitches.map(p => p / userMean);

    let contourScore;
    if (useDTW) {
        const dtwResult = DTW.compute1D(nativeNorm, userNorm, 20);
        contourScore = Math.max(0, 100 * (1 - dtwResult.normalizedDistance));
    } else {
        const len = Math.min(nativeNorm.length, userNorm.length);
        let diff = 0;
        for (let i = 0; i < len; i++) {
            diff += Math.abs(nativeNorm[i] - userNorm[i]);
        }
        contourScore = Math.max(0, 100 * (1 - diff / len));
    }

    // Combined score
    const score = Math.round(0.6 * contourScore + 0.4 * rangeScore);

    return {
        score: Math.min(100, Math.max(0, score)),
        contourScore: Math.round(contourScore),
        rangeScore,
        nativeRange,
        userRange
    };
}

function compareIntensityEnhanced(nativeIntensity, userIntensity, useDTW = true) {
    if (!nativeIntensity || !userIntensity || nativeIntensity.length === 0 || userIntensity.length === 0) {
        return { score: 50, envelopeScore: 50, dynamicRangeScore: 50 };
    }

    const nativeRMS = nativeIntensity.map(i => i.rms || i.intensity);
    const userRMS = userIntensity.map(i => i.rms || i.intensity);

    // 1. Dynamic Range Score
    const nativeMax = Math.max(...nativeRMS);
    const nativeMin = Math.min(...nativeRMS.filter(r => r > 0.01));
    const userMax = Math.max(...userRMS);
    const userMin = Math.min(...userRMS.filter(r => r > 0.01));

    const nativeDR = nativeMax / (nativeMin || 0.01);
    const userDR = userMax / (userMin || 0.01);
    const drRatio = Math.min(nativeDR, userDR) / Math.max(nativeDR, userDR);
    const dynamicRangeScore = Math.round(drRatio * 100);

    // 2. Envelope Score (normalized comparison)
    const nativeNorm = nativeRMS.map(r => r / nativeMax);
    const userNorm = userRMS.map(r => r / userMax);

    let envelopeScore;
    if (useDTW) {
        const dtwResult = DTW.compute1D(nativeNorm, userNorm, 20);
        envelopeScore = Math.max(0, 100 * (1 - dtwResult.normalizedDistance * 2));
    } else {
        const len = Math.min(nativeNorm.length, userNorm.length);
        let diff = 0;
        for (let i = 0; i < len; i++) {
            diff += Math.abs(nativeNorm[i] - userNorm[i]);
        }
        envelopeScore = Math.max(0, 100 * (1 - diff / len));
    }

    const score = Math.round(0.7 * envelopeScore + 0.3 * dynamicRangeScore);

    return {
        score: Math.min(100, Math.max(0, score)),
        envelopeScore: Math.round(envelopeScore),
        dynamicRangeScore
    };
}

// =================================================================
// INITIALIZATION
// =================================================================
function initVoicePractice() {
    voicePracticeManager = new VoicePracticeManager();
    debugLogger?.log(3, 'Voice practice manager initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoicePractice);
} else {
    initVoicePractice();
}