/**
 * Voice Recorder - Standalone Application
 * Bob and Mariel Ward School of Filipino Languages
 */

class VoiceRecorderApp {
    constructor() {
        this.currentLanguage = 'ceb';
        this.languageNames = {
            'ceb': 'Cebuano',
            'mrw': 'Maranao',
            'sin': 'Sinama'
        };
        this.allCards = [];
        this.filteredCards = [];
        this.serverFiles = [];
        this.currentCardId = null;
        this.audioRecorder = null;
        this.editedCards = new Map(); // Track edited cards for saving

        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupThemeToggle();
        await this.loadCards();
    }
    
    setupEventListeners() {
        // Language filter
        document.getElementById('languageFilter').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            this.loadCards();
        });
        
        // Lesson filters
        document.getElementById('lessonFilterFrom').addEventListener('input', () => this.filterCards());
        document.getElementById('lessonFilterTo').addEventListener('input', () => this.filterCards());
        document.getElementById('clearLessonFilter').addEventListener('click', () => {
            document.getElementById('lessonFilterFrom').value = '';
            document.getElementById('lessonFilterTo').value = '';
            this.filterCards();
        });
        
        // Search
        document.getElementById('searchCards').addEventListener('input', () => this.filterCards());

        // Save changes
        document.getElementById('saveChangesBtn').addEventListener('click', () => this.saveChanges());

        // Modal close
        document.getElementById('closeFileModal').addEventListener('click', () => this.closeFileModal());
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // File browser search
        document.getElementById('fileBrowserSearch').addEventListener('input', (e) => {
            this.filterServerFiles(e.target.value);
        });
        
        // Upload
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Drag and drop
        const uploadZone = document.getElementById('uploadZone');
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        
        // Recording
        document.getElementById('startRecordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecordBtn').addEventListener('click', () => this.stopRecording());
        
        // Filename dialog
        document.getElementById('confirmFilenameBtn').addEventListener('click', () => this.confirmFilename());
        document.getElementById('cancelFilenameBtn').addEventListener('click', () => this.closeFilenameDialog());
        document.getElementById('filenameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmFilename();
            if (e.key === 'Escape') this.closeFilenameDialog();
        });
    }
    
    setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
        
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }
    
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    async loadCards() {
        const tbody = document.getElementById('cardsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    <i class="fas fa-spinner fa-spin"></i> Loading cards...
                </td>
            </tr>
        `;

        try {
            // Load the main manifest file from assets directory
            const response = await fetch(`../assets/manifest.json?_=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load manifest');

            const manifest = await response.json();

            // Check if this is v4.0 manifest structure
            const isV4 = manifest.version === '4.0' ||
                        (manifest.cards && typeof manifest.cards === 'object' && !Array.isArray(manifest.cards));

            if (isV4) {
                // v4.0 structure: manifest.cards is an object with language keys
                this.allCards = manifest.cards[this.currentLanguage] || [];

                // Merge image data if available
                if (manifest.images) {
                    this.allCards.forEach(card => {
                        const cardNum = card.cardNum || card.wordNum;
                        const imageData = manifest.images[cardNum];
                        if (imageData) {
                            card.printImagePath = imageData.printImagePath;
                            card.gifPath = imageData.gifPath;
                            card.hasGif = imageData.hasGif;
                        }
                    });
                }
            } else {
                // v3.x fallback: manifest.cards is a flat array
                this.allCards = manifest.cards || [];
            }

            this.filterCards();
        } catch (err) {
            console.error('Error loading cards:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <i class="fas fa-exclamation-triangle"></i> Error loading cards. Please ensure manifest.json exists in the assets folder.
                    </td>
                </tr>
            `;
            this.showToast('Error loading cards: ' + err.message, 'error');
        }
    }
    
    filterCards() {
        console.log('filterCards called');
        const fromLesson = parseInt(document.getElementById('lessonFilterFrom').value) || 0;
        const toLesson = parseInt(document.getElementById('lessonFilterTo').value) || 999;
        const search = document.getElementById('searchCards').value.toLowerCase().trim();

        this.filteredCards = this.allCards.filter(card => {
            const lesson = card.lesson || 0;
            if (lesson < fromLesson || lesson > toLesson) return false;

            if (search) {
                const word = (card.word || '').toLowerCase();
                const english = (card.english || '').toLowerCase();
                if (!word.includes(search) && !english.includes(search)) return false;
            }

            return true;
        });

        console.log('Calling renderCards...');
        this.renderCards();
        console.log('Calling updateStats...');
        this.updateStats();
    }
    
    renderCards() {
        const tbody = document.getElementById('cardsTableBody');

        if (this.filteredCards.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <i class="fas fa-search"></i> No cards found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredCards.map(card => {
            const cardId = card.cardNum || card.wordNum;

            // Get word variants by splitting on "/"
            const wordVariants = card.word ? card.word.split('/').map(w => w.trim()) : [''];

            // Get audio paths (now an array for multi-variant support)
            const audioPaths = Array.isArray(card.audio) ? card.audio : (card.audio ? [card.audio] : []);

            // Generate audio badges for each variant
            const audioBadgesHtml = wordVariants.map((variant, index) => {
                const audioPath = audioPaths[index] || null;
                const hasAudio = !!audioPath;

                // Label: show filename if file exists, otherwise show word variant
                let label = '';
                if (hasAudio) {
                    label = audioPath.split('/').pop();  // Show filename
                } else {
                    label = variant.toLowerCase();  // Show word variant
                }

                const badgeClass = hasAudio ? 'has-audio' : 'no-audio';
                const icon = hasAudio ? 'fa-check' : 'fa-folder-open';
                const title = hasAudio ? `Audio: ${label}` : `Click to record audio for "${variant}"`;

                return `
                    <span class="audio-badge ${badgeClass}"
                          data-card-id="${cardId}"
                          data-variant-index="${index}"
                          data-variant="${variant}"
                          onclick="app.openAudioModal(${cardId}, ${index}, '${variant.replace(/'/g, "\\'")}')"
                          title="${title}">
                        <i class="fas ${icon}"></i> ${label}
                    </span>
                `;
            }).join('');

            // Check if any variant has audio
            const hasAnyAudio = audioPaths.some(path => !!path);

            return `
                <tr>
                    <td>${card.lesson || '-'}</td>
                    <td>${cardId}</td>
                    <td>${card.word || ''}</td>
                    <td>${card.english || ''}</td>
                    <td>
                        <div class="audio-badges-container">
                            ${audioBadgesHtml}
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${hasAnyAudio ? 'complete' : 'missing'}">
                            ${hasAnyAudio ? 'Complete' : 'Needs Audio'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    updateStats() {
        const total = this.filteredCards.length;
        const withAudio = this.filteredCards.filter(c => !!c.audio).length;
        
        document.getElementById('cardCount').textContent = `${total} cards`;
        document.getElementById('audioCount').textContent = `${withAudio} with audio`;
    }
    
    openAudioModal(cardId, variantIndex = 0, variant = null) {
        this.currentCardId = cardId;
        this.currentVariantIndex = variantIndex;
        this.currentVariant = variant;

        // Reset modal state
        this.switchTab('browse');
        this.resetRecordingView();

        // Update title
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (card) {
            const variantText = variant ? ` - "${variant}"` : '';
            document.getElementById('fileModalTitle').innerHTML = `
                <i class="fas fa-file-audio"></i>
                Audio for: ${card.word}${variantText} (${card.english})
            `;
        }

        // Show modal
        document.getElementById('fileModal').classList.remove('hidden');

        // Load server files
        this.loadServerFiles();
    }
    
    closeFileModal() {
        document.getElementById('fileModal').classList.add('hidden');
        this.cleanupRecorder();
        // Don't clear currentCardId here - we still need it for filename confirmation
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName + 'Tab');
        });
    }
    
    async loadServerFiles() {
        const grid = document.getElementById('fileBrowserGrid');
        grid.innerHTML = '<div class="loading-files"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            const response = await fetch(`../list-assets.php?type=audio&_=${Date.now()}`);
            const result = await response.json();
            
            if (result.success) {
                this.serverFiles = result.files || [];
                this.displayServerFiles(this.serverFiles);
            } else {
                grid.innerHTML = '<div class="loading-files">Error loading files</div>';
            }
        } catch (err) {
            grid.innerHTML = '<div class="loading-files">Error loading files</div>';
        }
    }
    
    displayServerFiles(files) {
        const grid = document.getElementById('fileBrowserGrid');
        
        if (files.length === 0) {
            grid.innerHTML = '<div class="loading-files">No audio files found</div>';
            return;
        }
        
        grid.innerHTML = files.map(file => `
            <div class="file-item" onclick="app.selectServerFile('${file.name}', '${file.path}')">
                <i class="fas fa-file-audio"></i>
                <div class="filename">${file.name}</div>
            </div>
        `).join('');
    }
    
    filterServerFiles(search) {
        const filtered = this.serverFiles.filter(f => 
            f.name.toLowerCase().includes(search.toLowerCase())
        );
        this.displayServerFiles(filtered);
    }
    
    selectServerFile(filename, filepath) {
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
        if (!card) return;

        // Handle multi-variant audio (audio as array)
        if (!Array.isArray(card.audio)) {
            card.audio = card.audio ? [card.audio] : [];
        }

        // Pad array with nulls if needed to reach variant index
        while (card.audio.length <= this.currentVariantIndex) {
            card.audio.push(null);
        }

        // Set audio at the correct variant index
        card.audio[this.currentVariantIndex] = filepath;
        card.hasAudio = true;

        // Mark card as edited for saving to manifest
        this.markCardAsEdited(card);

        this.closeFileModal();
        this.filterCards();
        this.showToast(`Audio linked: ${filename}`, 'success');

        // Clear current card tracking
        this.currentCardId = null;
        this.currentVariantIndex = 0;
        this.currentVariant = null;
    }
    
    handleFileUpload(file) {
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
        if (!card) return;
        
        // Generate filename
        const word = (card.word || 'word').toLowerCase().replace(/[^a-z0-9]/g, '');
        const english = (card.english || 'english').toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = file.name.split('.').pop();
        const defaultFilename = `${this.currentCardId}.${this.currentLanguage}.${word}.${english}.${ext}`;
        
        this.pendingFile = file;
        this.pendingBlob = null;
        this.showFilenameDialog(defaultFilename);
    }
    
    // Recording functionality
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.audioRecorder = {
                mediaRecorder: null,
                audioChunks: [],
                audioContext: new (window.AudioContext || window.webkitAudioContext)(),
                analyser: null,
                audioBuffer: null,
                audioBlob: null,
                isRecording: false,
                markerStart: 0,
                markerEnd: 1,
                playbackAudio: null,
                isPlaying: false,
                animationId: null
            };
            
            const source = this.audioRecorder.audioContext.createMediaStreamSource(stream);
            this.audioRecorder.analyser = this.audioRecorder.audioContext.createAnalyser();
            this.audioRecorder.analyser.fftSize = 2048;
            source.connect(this.audioRecorder.analyser);
            
            this.audioRecorder.mediaRecorder = new MediaRecorder(stream);
            this.audioRecorder.audioChunks = [];
            
            this.audioRecorder.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioRecorder.audioChunks.push(e.data);
                }
            };
            
            this.audioRecorder.mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                this.audioRecorder.audioBlob = new Blob(this.audioRecorder.audioChunks, { type: 'audio/webm' });
                const arrayBuffer = await this.audioRecorder.audioBlob.arrayBuffer();
                this.audioRecorder.audioBuffer = await this.audioRecorder.audioContext.decodeAudioData(arrayBuffer);

                this.showAudioEditor();
            };

            // Start countdown and recording sequence
            await this.startCountdownAndRecord();

        } catch (err) {
            console.error('Microphone error:', err);
            this.showToast('Error accessing microphone', 'error');
        }
    }
    
    /**
     * Start countdown and recording with precise timing
     * Timeline:
     *   0ms: "3"
     *   1000ms: "2"
     *   2000ms: "1"
     *   2800ms: Start recording (still showing "1")
     *   3000ms: Show "Recording..."
     *   3700ms: Start silence detection
     */
    startCountdownAndRecord() {
        return new Promise((resolve) => {
            const countdownDisplay = document.getElementById('countdownDisplay');
            const recordStatus = document.getElementById('recordStatus');
            const startRecordBtn = document.getElementById('startRecordBtn');
            const stopRecordBtn = document.getElementById('stopRecordBtn');
            const countdownNumber = countdownDisplay.querySelector('.countdown-number');

            countdownDisplay.classList.remove('hidden');
            recordStatus.classList.add('hidden');

            let count = 3;
            countdownNumber.textContent = count;

            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownNumber.textContent = count;

                    // At count === 1 (2000ms), schedule recording to start at 2800ms
                    if (count === 1) {
                        setTimeout(() => {
                            // Start recording while still showing "1"
                            if (this.audioRecorder && this.audioRecorder.mediaRecorder) {
                                this.audioRecorder.mediaRecorder.start(100);
                                this.audioRecorder.isRecording = true;
                            }
                        }, 800); // 800ms after showing "1" = 2800ms total
                    }
                } else if (count === 0) {
                    // 3000ms - Hide countdown, show Recording UI
                    clearInterval(interval);

                    countdownDisplay.classList.add('hidden');
                    recordStatus.classList.remove('hidden');
                    startRecordBtn.classList.add('hidden');
                    stopRecordBtn.classList.remove('hidden');
                    recordStatus.innerHTML = '<i class="fas fa-circle recording-pulse"></i><p>Recording...</p>';

                    // Start silence detection at 3700ms (700ms after showing "Recording")
                    setTimeout(() => {
                        if (this.audioRecorder && this.audioRecorder.isRecording) {
                            this.startSilenceDetection();
                        }
                    }, 700);

                    resolve();
                }
            }, 1000);
        });
    }
    
    startSilenceDetection() {
        const analyser = this.audioRecorder.analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceStart = null;
        
        const checkSilence = () => {
            if (!this.audioRecorder || !this.audioRecorder.isRecording) return;
            
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            
            if (average < 10) {
                if (!silenceStart) {
                    silenceStart = Date.now();
                } else if (Date.now() - silenceStart > 300) {
                    this.stopRecording();
                    return;
                }
            } else {
                silenceStart = null;
            }
            
            requestAnimationFrame(checkSilence);
        };
        
        requestAnimationFrame(checkSilence);
    }
    
    stopRecording() {
        if (this.audioRecorder && this.audioRecorder.mediaRecorder && this.audioRecorder.isRecording) {
            this.audioRecorder.isRecording = false;
            this.audioRecorder.mediaRecorder.stop();
        }
    }
    
    showAudioEditor() {
        document.getElementById('recordView').classList.add('hidden');
        document.getElementById('editorView').classList.remove('hidden');
        
        this.drawWaveform();
        this.detectVoiceBoundaries();
        this.setupEditorControls();
        
        const totalTime = this.audioRecorder.audioBuffer.duration;
        document.getElementById('totalTime').textContent = this.formatTime(totalTime);
    }
    
    drawWaveform() {
        const canvas = document.getElementById('waveformCanvas');
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
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < width; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        
        ctx.stroke();
        this.updateMarkerPositions();
    }
    
    detectVoiceBoundaries() {
        const data = this.audioRecorder.audioBuffer.getChannelData(0);
        const sampleRate = this.audioRecorder.audioBuffer.sampleRate;
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += Math.abs(data[i]);
        }
        const threshold = (sum / data.length) * 2;
        
        let startSample = 0;
        for (let i = 0; i < data.length; i++) {
            if (Math.abs(data[i]) > threshold) {
                startSample = Math.max(0, i - (sampleRate * 0.1));
                break;
            }
        }
        
        let endSample = data.length;
        for (let i = data.length - 1; i >= 0; i--) {
            if (Math.abs(data[i]) > threshold) {
                endSample = Math.min(data.length, i + (sampleRate * 0.1));
                break;
            }
        }
        
        this.audioRecorder.markerStart = startSample / data.length;
        this.audioRecorder.markerEnd = endSample / data.length;
    }
    
    updateMarkerPositions() {
        document.getElementById('markerStart').style.left = `${this.audioRecorder.markerStart * 100}%`;
        document.getElementById('markerEnd').style.left = `${this.audioRecorder.markerEnd * 100}%`;
    }
    
    setupEditorControls() {
        const playBtn = document.getElementById('editorPlayBtn');
        const pauseBtn = document.getElementById('editorPauseBtn');
        const stopBtn = document.getElementById('editorStopBtn');
        const cutBtn = document.getElementById('editorCutBtn');
        const saveBtn = document.getElementById('editorSaveBtn');
        const rerecordBtn = document.getElementById('editorRerecordBtn');
        const playheadEl = document.getElementById('playhead');

        // Create audio element for playback
        const audioUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
        this.audioRecorder.playbackAudio = new Audio(audioUrl);

        // Track animation state
        this.audioRecorder.isPlaying = false;
        this.audioRecorder.animationId = null;

        // Update time display during playback
        this.audioRecorder.playbackAudio.addEventListener('timeupdate', () => {
            if (!this.audioRecorder || !this.audioRecorder.playbackAudio) return;
            document.getElementById('currentTime').textContent = this.formatTime(this.audioRecorder.playbackAudio.currentTime);
        });

        // Handle audio ending naturally
        this.audioRecorder.playbackAudio.addEventListener('ended', () => {
            this.stopPlayback();
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
                this.stopPlayback();
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
        playBtn.onclick = () => {
            if (!this.audioRecorder) return;
            const duration = this.audioRecorder.audioBuffer.duration;
            const startTime = this.audioRecorder.markerStart * duration;

            this.audioRecorder.playbackAudio.currentTime = startTime;
            this.audioRecorder.playbackAudio.play();

            // Show and start playhead animation
            this.audioRecorder.isPlaying = true;
            playheadEl.classList.add('active');
            playheadEl.style.left = `${this.audioRecorder.markerStart * 100}%`;
            this.audioRecorder.animationId = requestAnimationFrame(animatePlayhead);
        };

        // Pause button
        pauseBtn.onclick = () => {
            if (!this.audioRecorder) return;
            this.audioRecorder.playbackAudio.pause();
            this.audioRecorder.isPlaying = false;
            if (this.audioRecorder.animationId) {
                cancelAnimationFrame(this.audioRecorder.animationId);
            }
            // Keep playhead visible but stopped
        };

        // Stop button
        stopBtn.onclick = () => {
            this.stopPlayback();
        };

        // Cut button
        cutBtn.onclick = async () => {
            if (!this.audioRecorder) return;
            // Stop any playback first
            this.stopPlayback();

            await this.cutAudio();
            this.drawWaveform();

            // Update audio for playback
            const newUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
            this.audioRecorder.playbackAudio.src = newUrl;
            document.getElementById('totalTime').textContent = this.formatTime(this.audioRecorder.audioBuffer.duration);

            this.showToast('Audio trimmed to markers', 'success');
        };

        // Save button
        saveBtn.onclick = () => {
            // Stop playback before saving
            this.stopPlayback();
            this.saveRecording();
        };

        // Re-record button
        rerecordBtn.onclick = () => {
            // Stop playback and reset
            this.stopPlayback();
            this.resetRecordingView();
        };

        // Make markers draggable
        this.makeMarkerDraggable('markerStart', 'start');
        this.makeMarkerDraggable('markerEnd', 'end');
    }

    stopPlayback() {
        if (!this.audioRecorder) return;

        const playheadEl = document.getElementById('playhead');

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
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            currentTimeEl.textContent = '0:00';
        }
    }

    makeMarkerDraggable(markerId, type) {
        const marker = document.getElementById(markerId);
        const canvas = document.getElementById('waveformCanvas');
        let isDragging = false;

        // Helper function to get position from event
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

        // Helper function to update marker position
        const updateMarkerPosition = (e) => {
            if (!isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const position = getPositionFromEvent(e, rect);

            if (type === 'start' && position < this.audioRecorder.markerEnd - 0.01) {
                this.audioRecorder.markerStart = position;
                marker.style.left = `${position * 100}%`;
            } else if (type === 'end' && position > this.audioRecorder.markerStart + 0.01) {
                this.audioRecorder.markerEnd = position;
                marker.style.left = `${position * 100}%`;
            }
        };

        // Mouse events
        marker.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', updateMarkerPosition);

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch events for mobile
        marker.addEventListener('touchstart', (e) => {
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
    }
    
    async cutAudio() {
        const audioBuffer = this.audioRecorder.audioBuffer;
        const startSample = Math.floor(this.audioRecorder.markerStart * audioBuffer.length);
        const endSample = Math.floor(this.audioRecorder.markerEnd * audioBuffer.length);
        const newLength = endSample - startSample;
        
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
        
        this.audioRecorder.audioBuffer = newBuffer;
        this.audioRecorder.audioBlob = this.audioBufferToBlob(newBuffer);
        this.audioRecorder.markerStart = 0;
        this.audioRecorder.markerEnd = 1;
    }
    
    audioBufferToBlob(audioBuffer) {
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
    }
    
    saveRecording() {
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
        if (!card) return;

        // Use variant for filename if available
        const wordForFilename = this.currentVariant
            ? this.currentVariant.toLowerCase().replace(/[^a-z0-9]/g, '')
            : (card.word || 'word').toLowerCase().replace(/[^a-z0-9]/g, '');
        const english = (card.english || 'english').toLowerCase().replace(/[^a-z0-9]/g, '');

        // Determine extension based on blob type
        // After cutting, blob is WAV. Original recording is WebM/Opus
        const extension = this.audioRecorder.audioBlob.type.includes('wav') ? 'wav' : 'opus';
        const defaultFilename = `${this.currentCardId}.${this.currentLanguage}.${wordForFilename}.${english}.${extension}`;

        this.pendingBlob = this.audioRecorder.audioBlob;
        this.pendingFile = null;

        console.log('saveRecording - blob:', this.pendingBlob, 'size:', this.pendingBlob?.size, 'type:', this.pendingBlob?.type, 'extension:', extension);

        this.closeFileModal();
        this.showFilenameDialog(defaultFilename);
    }
    
    resetRecordingView() {
        document.getElementById('recordView').classList.remove('hidden');
        document.getElementById('editorView').classList.add('hidden');
        document.getElementById('startRecordBtn').classList.remove('hidden');
        document.getElementById('stopRecordBtn').classList.add('hidden');
        document.getElementById('countdownDisplay').classList.add('hidden');
        document.getElementById('recordStatus').innerHTML = '<i class="fas fa-microphone"></i><p>Click Record to start</p>';
    }
    
    showFilenameDialog(defaultFilename) {
        const input = document.getElementById('filenameInput');
        input.value = defaultFilename;
        document.getElementById('filenameDialog').classList.remove('hidden');
        
        input.focus();
        const dotIndex = defaultFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            input.setSelectionRange(0, dotIndex);
        }
    }
    
    closeFilenameDialog() {
        document.getElementById('filenameDialog').classList.add('hidden');
        this.pendingFile = null;
        this.pendingBlob = null;
    }
    
    async confirmFilename() {
        const filename = document.getElementById('filenameInput').value.trim();
        if (!filename) {
            this.showToast('Please enter a filename', 'warning');
            return;
        }

        // Save blob/file to local variables BEFORE closing dialog
        const blobToUpload = this.pendingBlob;
        const fileToUpload = this.pendingFile;

        // Close dialog and clear pending
        this.closeFilenameDialog();
        this.showToast('Uploading...', 'warning');

        try {
            const formData = new FormData();

            if (blobToUpload) {
                formData.append('audio', blobToUpload, filename);
            } else if (fileToUpload) {
                formData.append('audio', fileToUpload, filename);
            }

            formData.append('filename', filename);

            console.log('Uploading audio:', filename, 'Blob size:', blobToUpload?.size || fileToUpload?.size);

            const response = await fetch('../upload-audio.php', {
                method: 'POST',
                body: formData
            });

            console.log('Upload response status:', response.status);
            const result = await response.json();
            console.log('Upload result:', result);

            if (result.success) {
                console.log('Finding card with ID:', this.currentCardId);
                const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
                console.log('Found card:', card);
                console.log('Current variant index:', this.currentVariantIndex);
                console.log('Card audio before update:', card?.audio);

                if (card) {
                    // Handle multi-variant audio (audio as array)
                    // Ensure audio is array
                    if (!Array.isArray(card.audio)) {
                        card.audio = card.audio ? [card.audio] : [];
                    }

                    // Pad array with nulls if needed to reach variant index
                    while (card.audio.length <= this.currentVariantIndex) {
                        card.audio.push(null);
                    }

                    // Set audio at the correct variant index
                    card.audio[this.currentVariantIndex] = result.path;
                    card.hasAudio = true;

                    console.log('Card audio after update:', card.audio);
                    console.log('Card hasAudio:', card.hasAudio);

                    // Mark card as edited for saving to manifest
                    this.markCardAsEdited(card);
                    console.log('Edited cards count:', this.editedCards.size);
                }

                this.filterCards();
                this.showToast(`Audio saved: ${filename}`, 'success');
            } else {
                this.showToast(`Upload failed: ${result.error}`, 'error');
            }
        } catch (err) {
            this.showToast(`Upload error: ${err.message}`, 'error');
        } finally {
            // Clear currentCardId after upload completes (success or failure)
            this.currentCardId = null;
            this.currentVariantIndex = 0;
            this.currentVariant = null;
        }
    }
    
    cleanupRecorder() {
        if (this.audioRecorder) {
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
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    markCardAsEdited(card) {
        const cardId = card.cardNum || card.wordNum;
        console.log('markCardAsEdited called for card:', cardId);
        this.editedCards.set(cardId, card);
        console.log('editedCards after set:', this.editedCards);
        this.updateSaveButton();
    }

    updateSaveButton() {
        console.log('updateSaveButton called, edited count:', this.editedCards.size);
        const saveBtn = document.getElementById('saveChangesBtn');
        if (this.editedCards.size > 0) {
            saveBtn.disabled = false;
            saveBtn.textContent = ` Save Changes (${this.editedCards.size})`;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Changes (${this.editedCards.size})`;
            console.log('Save button enabled');
        } else {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Changes`;
            console.log('Save button disabled');
        }
    }

    async saveChanges() {
        if (this.editedCards.size === 0) {
            this.showToast('No changes to save', 'warning');
            return;
        }

        if (!confirm(`Save ${this.editedCards.size} edited cards to manifest?`)) {
            return;
        }

        try {
            // Apply edits to allCards array
            this.editedCards.forEach((editedCard, cardId) => {
                const index = this.allCards.findIndex(c => (c.cardNum || c.wordNum) === cardId);
                if (index !== -1) {
                    this.allCards[index] = editedCard;
                }
            });

            // Save to server using save-deck.php
            this.showToast('Saving changes to manifest...', 'info');

            const response = await fetch('../save-deck.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trigraph: this.currentLanguage,
                    languageName: this.languageNames[this.currentLanguage],
                    cards: this.allCards
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(`✓ ${result.message} (${result.cardCount} cards)`, 'success');
                this.editedCards.clear();
                this.updateSaveButton();
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (err) {
            console.error('Save error:', err);
            this.showToast(`Save failed: ${err.message}`, 'error');
        }
    }
}

// Initialize app
const app = new VoiceRecorderApp();
