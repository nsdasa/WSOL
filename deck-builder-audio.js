// =================================================================
// DECK BUILDER MODULE - AUDIO RECORDER & EDITOR
// Split from deck-builder-module.js for maintainability
// Contains: Audio recording, waveform editing, encoding, playback
// =================================================================

/**
 * Setup audio recorder functionality
 */
DeckBuilderModule.prototype.setupAudioRecorder = function(modal, cardId, audioLang, closeModal) {
    const startRecordBtn = modal.querySelector('#startRecordBtn');
    const stopRecordBtn = modal.querySelector('#stopRecordBtn');
    const recordStatus = modal.querySelector('#recordStatus');
    const countdownDisplay = modal.querySelector('#countdownDisplay');
    const recordView = modal.querySelector('#recordView');
    const editorView = modal.querySelector('#editorView');

    // Initialize recorder state
    this.audioRecorder = {
        mediaRecorder: null,
        audioChunks: [],
        audioContext: null,
        analyser: null,
        audioBuffer: null,
        audioBlob: null,
        isRecording: false,
        silenceTimeout: null,
        markerStart: 0,
        markerEnd: 1,
        playbackAudio: null
    };

    // Start recording button
    startRecordBtn.addEventListener('click', async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio context for analysis
            this.audioRecorder.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioRecorder.audioContext.createMediaStreamSource(stream);
            this.audioRecorder.analyser = this.audioRecorder.audioContext.createAnalyser();
            this.audioRecorder.analyser.fftSize = 2048;
            source.connect(this.audioRecorder.analyser);

            // Setup MediaRecorder
            this.audioRecorder.mediaRecorder = new MediaRecorder(stream);
            this.audioRecorder.audioChunks = [];

            this.audioRecorder.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioRecorder.audioChunks.push(e.data);
                }
            };

            this.audioRecorder.mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Create blob
                this.audioRecorder.audioBlob = new Blob(this.audioRecorder.audioChunks, { type: 'audio/webm' });

                // Decode audio for waveform
                const arrayBuffer = await this.audioRecorder.audioBlob.arrayBuffer();
                this.audioRecorder.audioBuffer = await this.audioRecorder.audioContext.decodeAudioData(arrayBuffer);

                // Switch to editor view
                this.showAudioEditor(modal, cardId, audioLang, closeModal);
            };

            // Start countdown
            await this.startCountdown(countdownDisplay, recordStatus);

            // Start recording
            this.audioRecorder.mediaRecorder.start(100);
            this.audioRecorder.isRecording = true;

            // Update UI
            startRecordBtn.classList.add('hidden');
            stopRecordBtn.classList.remove('hidden');
            recordStatus.innerHTML = '<i class="fas fa-circle recording-pulse"></i><p>Recording...</p>';

            // Start silence detection after 500ms grace period
            // This gives the user time to start speaking after "Speak" appears
            setTimeout(() => {
                if (this.audioRecorder && this.audioRecorder.isRecording) {
                    this.startSilenceDetection(modal);
                }
            }, 500);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            toastManager.show('Error accessing microphone. Please check permissions.', 'error');
        }
    });

    // Stop recording button
    stopRecordBtn.addEventListener('click', () => {
        this.stopRecording();
    });
};

/**
 * Start countdown before recording
 */
DeckBuilderModule.prototype.startCountdown = function(countdownDisplay, recordStatus) {
    return new Promise((resolve) => {
        countdownDisplay.classList.remove('hidden');
        recordStatus.classList.add('hidden');

        let count = 3;
        const countdownNumber = countdownDisplay.querySelector('.countdown-number');
        countdownNumber.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else if (count === 0) {
                // Show "Speak" and immediately start recording
                countdownNumber.textContent = 'Speak';
                countdownNumber.classList.add('speak');
                clearInterval(interval);

                // Start recording immediately when "Speak" appears
                resolve();

                // Hide countdown after 300ms (recording already started)
                setTimeout(() => {
                    countdownDisplay.classList.add('hidden');
                    recordStatus.classList.remove('hidden');
                    countdownNumber.classList.remove('speak');
                }, 300);
            }
        }, 1000);
    });
};

/**
 * Start silence detection during recording
 */
DeckBuilderModule.prototype.startSilenceDetection = function(modal) {
    const analyser = this.audioRecorder.analyser;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = null;
    const silenceThreshold = 10; // Adjust based on testing
    const silenceDuration = 300; // 300ms

    const checkSilence = () => {
        if (!this.audioRecorder.isRecording) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

        if (average < silenceThreshold) {
            if (!silenceStart) {
                silenceStart = Date.now();
            } else if (Date.now() - silenceStart > silenceDuration) {
                // Silence detected for 300ms, stop recording
                this.stopRecording();
                return;
            }
        } else {
            silenceStart = null;
        }

        requestAnimationFrame(checkSilence);
    };

    requestAnimationFrame(checkSilence);
};

/**
 * Stop recording
 */
DeckBuilderModule.prototype.stopRecording = function() {
    if (this.audioRecorder && this.audioRecorder.mediaRecorder && this.audioRecorder.isRecording) {
        this.audioRecorder.isRecording = false;
        this.audioRecorder.mediaRecorder.stop();
    }
};

/**
 * Show audio editor with waveform
 */
DeckBuilderModule.prototype.showAudioEditor = function(modal, cardId, audioLang, closeModal) {
    const recordView = modal.querySelector('#recordView');
    const editorView = modal.querySelector('#editorView');

    recordView.classList.add('hidden');
    editorView.classList.remove('hidden');

    // Draw waveform
    this.drawWaveform(modal);

    // Detect voice boundaries and set markers
    this.detectVoiceBoundaries();

    // Setup editor controls
    this.setupEditorControls(modal, cardId, audioLang, closeModal);

    // Update time display
    const totalTime = this.audioRecorder.audioBuffer.duration;
    modal.querySelector('#totalTime').textContent = this.formatTime(totalTime);
};

/**
 * Draw waveform on canvas
 */
DeckBuilderModule.prototype.drawWaveform = function(modal) {
    const canvas = modal.querySelector('#waveformCanvas');
    const ctx = canvas.getContext('2d');
    const audioBuffer = this.audioRecorder.audioBuffer;
    const data = audioBuffer.getChannelData(0);

    const width = canvas.width;
    const height = canvas.height;
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.stroke();

    // Draw markers
    this.updateMarkerPositions(modal);
};

/**
 * Detect voice boundaries in audio
 */
DeckBuilderModule.prototype.detectVoiceBoundaries = function() {
    const audioBuffer = this.audioRecorder.audioBuffer;
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // Find average amplitude
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += Math.abs(data[i]);
    }
    const avgAmp = sum / data.length;
    const threshold = avgAmp * 2; // Voice threshold

    // Find start of voice
    let startSample = 0;
    for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) {
            startSample = Math.max(0, i - (sampleRate * 0.1)); // 100ms buffer
            break;
        }
    }

    // Find end of voice
    let endSample = data.length;
    for (let i = data.length - 1; i >= 0; i--) {
        if (Math.abs(data[i]) > threshold) {
            endSample = Math.min(data.length, i + (sampleRate * 0.1)); // 100ms buffer
            break;
        }
    }

    // Convert to normalized positions (0-1)
    this.audioRecorder.markerStart = startSample / data.length;
    this.audioRecorder.markerEnd = endSample / data.length;
};

/**
 * Update marker positions on waveform
 */
DeckBuilderModule.prototype.updateMarkerPositions = function(modal) {
    const markerStartEl = modal.querySelector('#markerStart');
    const markerEndEl = modal.querySelector('#markerEnd');

    // Use percentage-based positioning for responsive layout
    markerStartEl.style.left = `${this.audioRecorder.markerStart * 100}%`;
    markerEndEl.style.left = `${this.audioRecorder.markerEnd * 100}%`;
};

/**
 * Setup editor control buttons
 */
DeckBuilderModule.prototype.setupEditorControls = function(modal, cardId, audioLang, closeModal) {
    const playBtn = modal.querySelector('#editorPlayBtn');
    const pauseBtn = modal.querySelector('#editorPauseBtn');
    const stopBtn = modal.querySelector('#editorStopBtn');
    const cutBtn = modal.querySelector('#editorCutBtn');
    const saveBtn = modal.querySelector('#editorSaveBtn');
    const rerecordBtn = modal.querySelector('#editorRerecordBtn');
    const canvas = modal.querySelector('#waveformCanvas');
    const markerStartEl = modal.querySelector('#markerStart');
    const markerEndEl = modal.querySelector('#markerEnd');
    const playheadEl = modal.querySelector('#playhead');

    // Create audio element for playback
    const audioUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
    this.audioRecorder.playbackAudio = new Audio(audioUrl);

    // Track animation state
    this.audioRecorder.isPlaying = false;
    this.audioRecorder.animationId = null;

    // Update time display during playback
    this.audioRecorder.playbackAudio.addEventListener('timeupdate', () => {
        if (!this.audioRecorder || !this.audioRecorder.playbackAudio) return;
        modal.querySelector('#currentTime').textContent = this.formatTime(this.audioRecorder.playbackAudio.currentTime);
    });

    // Handle audio ending naturally
    this.audioRecorder.playbackAudio.addEventListener('ended', () => {
        if (!this.audioRecorder) return;
        this.stopPlayback(modal);
    });

    // Animate playhead function
    const animatePlayhead = () => {
        if (!this.audioRecorder || !this.audioRecorder.isPlaying) return;

        const audio = this.audioRecorder.playbackAudio;
        const duration = this.audioRecorder.audioBuffer.duration;
        const currentTime = audio.currentTime;

        // Calculate boundaries
        const startTime = this.audioRecorder.markerStart * duration;
        const endTime = this.audioRecorder.markerEnd * duration;

        // Check if we've reached the end marker
        if (currentTime >= endTime) {
            this.stopPlayback(modal);
            return;
        }

        // Calculate playhead position as percentage
        // Map current time to position between markers
        const progress = (currentTime - startTime) / (endTime - startTime);
        const playheadPosition = this.audioRecorder.markerStart + (progress * (this.audioRecorder.markerEnd - this.audioRecorder.markerStart));

        playheadEl.style.left = `${playheadPosition * 100}%`;

        // Continue animation
        this.audioRecorder.animationId = requestAnimationFrame(animatePlayhead);
    };

    // Play button - play between markers
    playBtn.addEventListener('click', () => {
        if (!this.audioRecorder || !this.audioRecorder.audioBuffer || !this.audioRecorder.playbackAudio) return;

        const duration = this.audioRecorder.audioBuffer.duration;
        const startTime = this.audioRecorder.markerStart * duration;

        this.audioRecorder.playbackAudio.currentTime = startTime;
        this.audioRecorder.playbackAudio.play();

        // Show and start playhead animation
        this.audioRecorder.isPlaying = true;
        playheadEl.classList.add('active');
        playheadEl.style.left = `${this.audioRecorder.markerStart * 100}%`;
        this.audioRecorder.animationId = requestAnimationFrame(animatePlayhead);
    });

    // Pause button
    pauseBtn.addEventListener('click', () => {
        if (!this.audioRecorder || !this.audioRecorder.playbackAudio) return;

        this.audioRecorder.playbackAudio.pause();
        this.audioRecorder.isPlaying = false;
        if (this.audioRecorder.animationId) {
            cancelAnimationFrame(this.audioRecorder.animationId);
        }
        // Keep playhead visible but stopped
    });

    // Stop button
    stopBtn.addEventListener('click', () => {
        this.stopPlayback(modal);
    });

    // Cut button
    cutBtn.addEventListener('click', async () => {
        if (!this.audioRecorder || !this.audioRecorder.audioBlob) return;

        // Stop any playback first
        this.stopPlayback(modal);

        await this.cutAudio();
        this.drawWaveform(modal);

        // Update audio for playback
        if (this.audioRecorder && this.audioRecorder.audioBlob && this.audioRecorder.playbackAudio && this.audioRecorder.audioBuffer) {
            const newUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
            this.audioRecorder.playbackAudio.src = newUrl;
            modal.querySelector('#totalTime').textContent = this.formatTime(this.audioRecorder.audioBuffer.duration);

            toastManager.show('Audio trimmed to markers', 'success');
        }
    });

    // Save button
    saveBtn.addEventListener('click', () => {
        // Stop playback before saving
        this.stopPlayback(modal);
        this.saveRecordedAudio(cardId, audioLang, closeModal);
    });

    // Re-record button
    rerecordBtn.addEventListener('click', () => {
        // Stop playback and reset
        this.stopPlayback(modal);

        // Reset to recording view
        const recordView = modal.querySelector('#recordView');
        const editorView = modal.querySelector('#editorView');
        const startRecordBtn = modal.querySelector('#startRecordBtn');
        const stopRecordBtn = modal.querySelector('#stopRecordBtn');
        const recordStatus = modal.querySelector('#recordStatus');

        editorView.classList.add('hidden');
        recordView.classList.remove('hidden');
        startRecordBtn.classList.remove('hidden');
        stopRecordBtn.classList.add('hidden');
        recordStatus.innerHTML = '<i class="fas fa-microphone"></i><p>Click Record to start</p>';

        // Cleanup current recording
        if (this.audioRecorder.playbackAudio) {
            this.audioRecorder.playbackAudio.pause();
        }
    });

    // Make markers draggable
    this.makeMarkerDraggable(markerStartEl, canvas, 'start', modal);
    this.makeMarkerDraggable(markerEndEl, canvas, 'end', modal);
};

/**
 * Stop playback and reset playhead
 */
DeckBuilderModule.prototype.stopPlayback = function(modal) {
    if (!this.audioRecorder) return;

    const playheadEl = modal.querySelector('#playhead');

    // Stop audio
    if (this.audioRecorder.playbackAudio) {
        this.audioRecorder.playbackAudio.pause();
        this.audioRecorder.playbackAudio.currentTime = 0;
    }

    // Stop animation
    this.audioRecorder.isPlaying = false;
    if (this.audioRecorder.animationId) {
        cancelAnimationFrame(this.audioRecorder.animationId);
        this.audioRecorder.animationId = null;
    }

    // Hide playhead
    if (playheadEl) {
        playheadEl.classList.remove('active');
    }

    // Reset time display
    const currentTimeEl = modal.querySelector('#currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = '0:00';
    }
};

/**
 * Make marker draggable (with touch support)
 */
DeckBuilderModule.prototype.makeMarkerDraggable = function(markerEl, canvas, type, modal) {
    let isDragging = false;

    // Helper function to get position from event (mouse or touch)
    const getPositionFromEvent = (e, rect) => {
        let clientX;
        if (e.type.startsWith('touch')) {
            clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX;
        } else {
            clientX = e.clientX;
        }
        const x = clientX - rect.left;
        return Math.max(0, Math.min(1, x / rect.width));
    };

    // Update marker position
    const updateMarkerPosition = (e) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const position = getPositionFromEvent(e, rect);

        if (type === 'start') {
            if (position < this.audioRecorder.markerEnd - 0.01) {
                this.audioRecorder.markerStart = position;
                markerEl.style.left = `${position * 100}%`;
            }
        } else {
            if (position > this.audioRecorder.markerStart + 0.01) {
                this.audioRecorder.markerEnd = position;
                markerEl.style.left = `${position * 100}%`;
            }
        }
    };

    // Mouse events
    markerEl.addEventListener('mousedown', (e) => {
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', updateMarkerPosition);

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Touch events for mobile
    markerEl.addEventListener('touchstart', (e) => {
        isDragging = true;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            updateMarkerPosition(e);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    document.addEventListener('touchcancel', () => {
        isDragging = false;
    });
};

/**
 * Cut audio to marker positions
 */
DeckBuilderModule.prototype.cutAudio = async function() {
    const audioBuffer = this.audioRecorder.audioBuffer;
    const startSample = Math.floor(this.audioRecorder.markerStart * audioBuffer.length);
    const endSample = Math.floor(this.audioRecorder.markerEnd * audioBuffer.length);
    const newLength = endSample - startSample;

    // Create new buffer with trimmed audio
    const newBuffer = this.audioRecorder.audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        for (let i = 0; i < newLength; i++) {
            newData[i] = oldData[startSample + i];
        }
    }

    // Convert buffer to blob
    this.audioRecorder.audioBuffer = newBuffer;
    this.audioRecorder.audioBlob = await this.audioBufferToBlob(newBuffer);

    // Reset markers
    this.audioRecorder.markerStart = 0;
    this.audioRecorder.markerEnd = 1;
};

/**
 * Encode AudioBuffer to different formats (Opus, M4A, or WAV)
 */
DeckBuilderModule.prototype.encodeAudioBuffer = async function(audioBuffer, format) {
    const mimeTypes = {
        'opus': 'audio/webm;codecs=opus',
        'm4a': 'audio/mp4',
        'wav': 'audio/wav'
    };

    const mimeType = mimeTypes[format] || mimeTypes.opus;

    // For WAV, use the existing WAV encoder
    if (format === 'wav') {
        return this.audioBufferToBlob(audioBuffer);
    }

    // For Opus and M4A, use MediaRecorder
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);

        const chunks = [];
        const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: mimeType,
            audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            audioContext.close();
            resolve(blob);
        };

        mediaRecorder.onerror = (e) => {
            audioContext.close();
            reject(e);
        };

        mediaRecorder.start();
        source.start(0);
        source.onended = () => mediaRecorder.stop();
    });
};

/**
 * Convert AudioBuffer to Blob (WAV format)
 */
DeckBuilderModule.prototype.audioBufferToBlob = function(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const samples = audioBuffer.length;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write audio data for ALL channels
    let offset = 44;

    // Get all channel data
    const channels = [];
    for (let channel = 0; channel < numChannels; channel++) {
        channels.push(audioBuffer.getChannelData(channel));
    }

    // Interleave channels: L R L R L R ...
    for (let i = 0; i < samples; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Save recorded audio
 */
DeckBuilderModule.prototype.saveRecordedAudio = function(cardId, audioLang, closeModal) {
    // Find card to get word info for filename
    let card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
    if (!card) {
        card = this.newCards.find(c => (c.cardNum || c.wordNum) === cardId);
    }

    if (!card) {
        toastManager.show('Error: Card not found', 'error');
        return;
    }

    const word = this.getCardWord(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
    const english = this.getCardEnglish(card).toLowerCase().replace(/[^a-z0-9]/g, '') || 'english';
    const defaultFilename = `${cardId}.${audioLang}.${word}.${english}.opus`;

    // Store the audio blob and buffer before closing modal (modal cleanup destroys them)
    const audioBlob = this.audioRecorder.audioBlob;
    const audioBuffer = this.audioRecorder.audioBuffer;

    // Close the file selection modal immediately
    try {
        if (closeModal && typeof closeModal === 'function') {
            closeModal();
        }
    } catch (err) {
        console.error('Error closing modal:', err);
    }

    // Show filename edit dialog with audio format selection
    this.showFilenameDialog(defaultFilename, async (finalFilename, selectedFormat) => {
        // Show uploading message
        toastManager.show('Uploading audio...', 'warning', 3000);

        try {
            // Re-encode if format is different from WAV
            let finalBlob = audioBlob;
            if (selectedFormat && selectedFormat !== 'wav' && audioBuffer) {
                toastManager.show(`Converting to ${selectedFormat.toUpperCase()}...`, 'warning', 3000);
                finalBlob = await this.encodeAudioBuffer(audioBuffer, selectedFormat);
            }

            // Upload the audio blob to the server
            const formData = new FormData();
            formData.append('audio', finalBlob, finalFilename);
            formData.append('filename', finalFilename);

            const response = await fetch('upload-audio.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update card with audio path (multi-variant support)
                // Ensure audio is array
                if (!Array.isArray(card.audio)) {
                    card.audio = card.audio ? [card.audio] : [];
                }

                // Get variant index from stored context
                const variantIndex = this.currentVariantIndex || 0;

                // Pad array with nulls if needed
                while (card.audio.length <= variantIndex) {
                    card.audio.push(null);
                }

                // Set audio at variant index - use path from server response
                // Server returns path like: assets/audio/ceb/filename.m4a
                card.audio[variantIndex] = result.path;
                card.hasAudio = card.audio.some(p => p !== null && p !== undefined && p !== '');

                // Mark as edited
                this.editedCards.set(cardId, card);

                // Refresh the UI
                this.filterAndRenderCards();
                this.updateUnsavedIndicator();

                toastManager.show(`Audio saved as ${finalFilename}. Remember to save changes.`, 'success');
            } else {
                toastManager.show(`Upload failed: ${result.error}`, 'error');
            }
        } catch (err) {
            console.error('Error uploading audio:', err);
            toastManager.show(`Upload error: ${err.message}`, 'error');
        }
    }, null, 'audio');
};

/**
 * Show filename edit dialog
 */
DeckBuilderModule.prototype.showFilenameDialog = function(defaultFilename, onConfirm, previewUrl = null, fileType = null) {
    // Create dialog overlay
    const dialog = document.createElement('div');
    dialog.className = 'filename-dialog-overlay';

    // Determine if we should show a preview
    let previewHtml = '';
    if (previewUrl && (fileType === 'png' || fileType === 'gif')) {
        // Check if it's a video file
        const isVideo = /\.(mp4|webm)$/i.test(previewUrl);
        if (isVideo) {
            previewHtml = `
                <div class="filename-preview">
                    <video src="${previewUrl}" autoplay loop muted playsinline style="max-width: 100%; max-height: 200px;"></video>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="filename-preview">
                    <img src="${previewUrl}" alt="Preview">
                </div>
            `;
        }
    }

    // Add format selector for audio files
    let formatSelectorHtml = '';
    if (fileType === 'audio') {
        formatSelectorHtml = `
            <div class="form-group">
                <label class="form-label">Audio Format</label>
                <select id="audioFormatSelect" class="form-input">
                    <option value="opus">Opus (Recommended - Smallest, Best Quality)</option>
                    <option value="m4a">M4A (Good Compatibility)</option>
                    <option value="wav">WAV (Uncompressed, Large)</option>
                </select>
            </div>
        `;
    }

    dialog.innerHTML = `
        <div class="filename-dialog">
            <div class="filename-dialog-header">
                <h3><i class="fas fa-save"></i> Save ${fileType ? fileType.toUpperCase() : 'File'}</h3>
            </div>
            <div class="filename-dialog-body">
                ${previewHtml}
                <div class="form-group">
                    <label class="form-label">Filename</label>
                    <input type="text" id="filenameInput" class="form-input" value="${defaultFilename}">
                </div>
                ${formatSelectorHtml}
                <p class="filename-hint">
                    <i class="fas fa-info-circle"></i>
                    File will be saved to the assets folder
                </p>
            </div>
            <div class="filename-dialog-footer">
                <button id="confirmFilenameBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> Save
                </button>
                <button id="cancelFilenameBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Focus input and select filename (without extension)
    const input = dialog.querySelector('#filenameInput');
    input.focus();
    const dotIndex = defaultFilename.lastIndexOf('.');
    if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
    }

    // Format selector auto-update extension
    if (fileType === 'audio') {
        const formatSelect = dialog.querySelector('#audioFormatSelect');
        formatSelect.addEventListener('change', () => {
            const currentFilename = input.value;
            const lastDotIndex = currentFilename.lastIndexOf('.');
            if (lastDotIndex > 0) {
                const baseName = currentFilename.substring(0, lastDotIndex);
                const newExtension = formatSelect.value;
                input.value = `${baseName}.${newExtension}`;
            }
        });
    }

    // Confirm button
    dialog.querySelector('#confirmFilenameBtn').addEventListener('click', () => {
        const filename = input.value.trim();
        if (filename) {
            document.body.removeChild(dialog);
            // Pass both filename and format for audio files
            if (fileType === 'audio') {
                const formatSelect = dialog.querySelector('#audioFormatSelect');
                onConfirm(filename, formatSelect.value);
            } else {
                onConfirm(filename);
            }
        } else {
            toastManager.show('Please enter a filename', 'warning');
        }
    });

    // Cancel button
    dialog.querySelector('#cancelFilenameBtn').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    // Enter key to confirm
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            dialog.querySelector('#confirmFilenameBtn').click();
        } else if (e.key === 'Escape') {
            dialog.querySelector('#cancelFilenameBtn').click();
        }
    });

    // Click outside to cancel
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });
};

/**
 * Format time in M:SS format
 */
DeckBuilderModule.prototype.formatTime = function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Cleanup audio recorder resources
 */
DeckBuilderModule.prototype.cleanupAudioRecorder = function() {
    if (this.audioRecorder) {
        // Cancel any running animation
        if (this.audioRecorder.animationId) {
            cancelAnimationFrame(this.audioRecorder.animationId);
        }
        if (this.audioRecorder.mediaRecorder && this.audioRecorder.isRecording) {
            this.audioRecorder.mediaRecorder.stop();
        }
        if (this.audioRecorder.playbackAudio) {
            this.audioRecorder.playbackAudio.pause();
        }
        if (this.audioRecorder.audioContext) {
            this.audioRecorder.audioContext.close();
        }
        this.audioRecorder = null;
    }
};

/**
 * Generate current file preview HTML
 */
DeckBuilderModule.prototype.generateCurrentFilePreview = function(filePath, fileType) {
    if (!filePath) {
        return `
            <div class="no-current-file">
                <i class="fas fa-exclamation-circle"></i>
                <p>No file currently assigned</p>
            </div>
        `;
    }

    if (fileType === 'png' || fileType === 'gif') {
        // Check if it's a video file
        const isVideo = /\.(mp4|webm)$/i.test(filePath);
        if (isVideo) {
            return `
                <div class="current-image-preview">
                    <video src="${filePath}" autoplay loop muted playsinline style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;"></video>
                </div>
            `;
        } else {
            return `
                <div class="current-image-preview">
                    <img src="${filePath}" alt="Current file" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;">
                </div>
            `;
        }
    } else if (fileType === 'audio') {
        return `
            <div class="current-audio-preview">
                <div class="audio-preview-icon">
                    <i class="fas fa-file-audio"></i>
                </div>
                <button class="btn btn-primary btn-sm" id="playCurrentAudio">
                    <i class="fas fa-play"></i> Play Audio
                </button>
            </div>
        `;
    }

    return '';
};
