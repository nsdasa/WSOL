// =================================================================
// VOICE PRACTICE MODULE - Pronunciation Analysis for Flashcards
// Version 1.1 - November 2025 - Fixed UI, timing, and visualizations
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
                        
                        <div class="vp-viz-tabs">
                            <button class="vp-viz-tab active" data-viz="waveform">Waveform</button>
                            <button class="vp-viz-tab" data-viz="pitch">Pitch Contour</button>
                            <button class="vp-viz-tab" data-viz="intensity">Intensity</button>
                        </div>
                        
                        <div class="vp-canvas-container">
                            <canvas id="vpCanvas" width="800" height="300"></canvas>
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
        
        // Run analysis
        const analyzer = new PronunciationAnalyzer(this.nativeBuffer, this.userBuffer, this.useDTW);
        const results = analyzer.analyze();
        
        // Store results for visualization
        this.analysisResults = results;
        
        // Display score
        this.displayScore(results.score);
        
        // Draw initial visualization (waveform)
        this.updateVisualization('waveform');
        
        // Auto-play sequence: native ? user ? native
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
    
    updateVisualization(type) {
        const canvas = document.getElementById('vpCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!this.nativeBuffer || !this.userBuffer) return;
        
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
        
        // Range indicator
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Range: ${Math.round(minPitch)}-${Math.round(maxPitch)} Hz`, width - padding.right, padding.top - 10);
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
// PRONUNCIATION ANALYZER
// =================================================================
class PronunciationAnalyzer {
    constructor(nativeBuffer, userBuffer, useDTW = true) {
        this.nativeBuffer = nativeBuffer;
        this.userBuffer = userBuffer;
        this.useDTW = useDTW;
    }
    
    analyze() {
        debugLogger?.log(3, 'Starting pronunciation analysis...');
        
        const nativeAnalyzer = new AcousticAnalyzer(this.nativeBuffer);
        const userAnalyzer = new AcousticAnalyzer(this.userBuffer);
        
        const nativePitch = nativeAnalyzer.extractPitch();
        const userPitch = userAnalyzer.extractPitch();
        
        const nativeMFCCs = nativeAnalyzer.extractMFCCs();
        const userMFCCs = userAnalyzer.extractMFCCs();
        
        const nativeIntensity = nativeAnalyzer.extractIntensity();
        const userIntensity = userAnalyzer.extractIntensity();
        
        const pitchScore = this.comparePitch(nativePitch, userPitch);
        const mfccScore = this.compareMFCCs(nativeMFCCs, userMFCCs);
        const durationScore = this.compareDuration();
        const spectralScore = this.compareSpectral(nativeMFCCs, userMFCCs);
        const stressScore = this.compareStress(nativeIntensity, userIntensity);
        const qualityScore = this.assessQuality(userMFCCs, userPitch);
        
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
        
        debugLogger?.log(3, `Analysis complete. Score: ${overallScore}`);
        
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
    
    comparePitch(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) return 50;
        
        const nativeVoiced = native.filter(p => p.pitch > 0).map(p => p.pitch);
        const userVoiced = user.filter(p => p.pitch > 0).map(p => p.pitch);
        
        if (nativeVoiced.length === 0 || userVoiced.length === 0) return 50;
        
        let score;
        
        if (this.useDTW) {
            // Normalize pitch values for better comparison
            const nativeMean = nativeVoiced.reduce((a, b) => a + b, 0) / nativeVoiced.length;
            const userMean = userVoiced.reduce((a, b) => a + b, 0) / userVoiced.length;
            
            const nativeNorm = nativeVoiced.map(p => p / nativeMean);
            const userNorm = userVoiced.map(p => p / userMean);
            
            // Use DTW class with windowed approach
            const dtwResult = DTW.compute1D(nativeNorm, userNorm, 20);
            
            // Convert normalized distance to score
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
    
    compareMFCCs(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) return 50;
        
        let score;
        
        if (this.useDTW) {
            const numCoeffs = native[0].coeffs.length;
            
            // Convert to array format for DTW (skip c0)
            const nativeSeq = native.map(m => m.coeffs.slice(1));
            const userSeq = user.map(m => m.coeffs.slice(1));
            
            // Use multi-dimensional DTW
            const dtwResult = DTW.computeMultiDim(nativeSeq, userSeq, numCoeffs - 1, 20);
            
            // Convert normalized distance to score
            score = Math.max(0, 100 * (1 - dtwResult.normalizedDistance / 10));
            
            debugLogger?.log(3, `MFCC DTW: distance=${dtwResult.normalizedDistance.toFixed(4)}, score=${score.toFixed(1)}`);
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
    
    computeSpectralCentroid(mfccs) {
        let sum = 0;
        for (const frame of mfccs) {
            sum += Math.abs(frame.coeffs[1]) + Math.abs(frame.coeffs[2]);
        }
        return sum / mfccs.length;
    }
    
    compareStress(nativeIntensity, userIntensity) {
        if (!nativeIntensity || !userIntensity) return 50;
        
        const nativePattern = nativeIntensity.map(i => i.intensity);
        const userPattern = userIntensity.map(i => i.intensity);
        
        if (nativePattern.length === 0 || userPattern.length === 0) return 50;
        
        let score;
        
        if (this.useDTW) {
            // Use DTW for stress pattern comparison
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
}

// =================================================================
// ACOUSTIC ANALYZER
// =================================================================
class AcousticAnalyzer {
    constructor(audioBuffer) {
        this.buffer = audioBuffer;
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
    }
    
    extractPitch() {
        const frameSize = 2048;
        const hopSize = 512;
        const minPitch = 75;
        const maxPitch = 500;
        const pitchTrack = [];
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = this.data.slice(i, i + frameSize);
            const pitch = this.estimatePitch(Array.from(frame), minPitch, maxPitch);
            
            pitchTrack.push({
                time: i / this.sampleRate,
                pitch: pitch
            });
        }
        
        const smoothed = this.medianFilter(pitchTrack.map(p => p.pitch), 5);
        
        return pitchTrack.map((p, i) => ({
            time: p.time,
            pitch: smoothed[i]
        }));
    }
    
    estimatePitch(frame, minPitch, maxPitch) {
        const minLag = Math.floor(this.sampleRate / maxPitch);
        const maxLag = Math.floor(this.sampleRate / minPitch);
        
        let maxCorr = -Infinity;
        let bestLag = 0;
        
        for (let lag = minLag; lag < maxLag; lag++) {
            let corr = 0;
            let norm1 = 0;
            let norm2 = 0;
            
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
        
        if (maxCorr < 0.3) return 0;
        
        return this.sampleRate / bestLag;
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
    
    extractMFCCs() {
        const frameSize = 2048;
        const hopSize = 512;
        const numCoeffs = 13;
        const numFilters = 26;
        const mfccs = [];
        
        const filterbank = this.createMelFilterbank(frameSize, numFilters);
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = this.data.slice(i, i + frameSize);
            const windowed = this.applyHammingWindow(Array.from(frame));
            const spectrum = this.computeFFT(windowed);
            const melEnergies = this.applyMelFilterbank(spectrum, filterbank);
            const logMelEnergies = melEnergies.map(e => Math.log(Math.max(e, 1e-10)));
            const coeffs = this.computeDCT(logMelEnergies, numCoeffs);
            
            mfccs.push({
                time: i / this.sampleRate,
                coeffs: coeffs
            });
        }
        
        return mfccs;
    }
    
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
            let real = 0;
            let imag = 0;
            
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
    
    extractIntensity() {
        const frameSize = 2048;
        const hopSize = 512;
        const intensity = [];
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = this.data.slice(i, i + frameSize);
            
            let sum = 0;
            for (const sample of frame) {
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / frameSize);
            
            intensity.push({
                time: i / this.sampleRate,
                intensity: rms
            });
        }
        
        const maxIntensity = Math.max(...intensity.map(i => i.intensity));
        if (maxIntensity > 0) {
            intensity.forEach(i => {
                i.intensity = i.intensity / maxIntensity;
            });
        }
        
        return intensity;
    }
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