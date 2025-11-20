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
            const response = await fetch(`../manifest.${this.currentLanguage}.json?_=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load manifest');
            
            const manifest = await response.json();
            this.allCards = manifest.cards || [];
            
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
            
            this.filterCards();
        } catch (err) {
            console.error('Error loading cards:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <i class="fas fa-exclamation-triangle"></i> Error loading cards
                    </td>
                </tr>
            `;
            this.showToast('Error loading cards: ' + err.message, 'error');
        }
    }
    
    filterCards() {
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
        
        this.renderCards();
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
            const hasAudio = !!card.audio;
            
            return `
                <tr>
                    <td>${card.lesson || '-'}</td>
                    <td>${cardId}</td>
                    <td>${card.word || ''}</td>
                    <td>${card.english || ''}</td>
                    <td>
                        <span class="audio-badge ${hasAudio ? 'has-audio' : 'no-audio'}" 
                              data-card-id="${cardId}" onclick="app.openAudioModal(${cardId})">
                            <i class="fas ${hasAudio ? 'fa-check' : 'fa-microphone'}"></i>
                            ${hasAudio ? 'Audio' : 'Record'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${hasAudio ? 'complete' : 'missing'}">
                            ${hasAudio ? 'Complete' : 'Needs Audio'}
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
    
    openAudioModal(cardId) {
        this.currentCardId = cardId;
        
        // Reset modal state
        this.switchTab('browse');
        this.resetRecordingView();
        
        // Update title
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === cardId);
        if (card) {
            document.getElementById('fileModalTitle').innerHTML = `
                <i class="fas fa-file-audio"></i> 
                Audio for: ${card.word} (${card.english})
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
        this.currentCardId = null;
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
        
        card.audio = filepath;
        this.closeFileModal();
        this.filterCards();
        this.showToast(`Audio linked: ${filename}`, 'success');
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
                playbackAudio: null
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
            
            // Countdown
            await this.startCountdown();
            
            // Start recording
            this.audioRecorder.mediaRecorder.start(100);
            this.audioRecorder.isRecording = true;
            
            document.getElementById('startRecordBtn').classList.add('hidden');
            document.getElementById('stopRecordBtn').classList.remove('hidden');
            document.getElementById('recordStatus').innerHTML = '<i class="fas fa-circle recording-pulse"></i><p>Recording...</p>';
            
            // Silence detection after 500ms
            setTimeout(() => {
                if (this.audioRecorder && this.audioRecorder.isRecording) {
                    this.startSilenceDetection();
                }
            }, 500);
            
        } catch (err) {
            console.error('Microphone error:', err);
            this.showToast('Error accessing microphone', 'error');
        }
    }
    
    startCountdown() {
        return new Promise((resolve) => {
            const countdownDisplay = document.getElementById('countdownDisplay');
            const recordStatus = document.getElementById('recordStatus');
            const countdownNumber = countdownDisplay.querySelector('.countdown-number');
            
            countdownDisplay.classList.remove('hidden');
            recordStatus.classList.add('hidden');
            
            let count = 3;
            countdownNumber.textContent = count;
            countdownNumber.classList.remove('speak');
            
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownNumber.textContent = count;
                } else if (count === 0) {
                    countdownNumber.textContent = 'Speak';
                    countdownNumber.classList.add('speak');
                    clearInterval(interval);
                    resolve();
                    
                    setTimeout(() => {
                        countdownDisplay.classList.add('hidden');
                        recordStatus.classList.remove('hidden');
                    }, 300);
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
        const audioUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
        this.audioRecorder.playbackAudio = new Audio(audioUrl);
        
        this.audioRecorder.playbackAudio.addEventListener('timeupdate', () => {
            document.getElementById('currentTime').textContent = 
                this.formatTime(this.audioRecorder.playbackAudio.currentTime);
        });
        
        document.getElementById('editorPlayBtn').onclick = () => {
            const startTime = this.audioRecorder.markerStart * this.audioRecorder.audioBuffer.duration;
            this.audioRecorder.playbackAudio.currentTime = startTime;
            this.audioRecorder.playbackAudio.play();
        };
        
        document.getElementById('editorPauseBtn').onclick = () => {
            this.audioRecorder.playbackAudio.pause();
        };
        
        document.getElementById('editorStopBtn').onclick = () => {
            this.audioRecorder.playbackAudio.pause();
            this.audioRecorder.playbackAudio.currentTime = 0;
            document.getElementById('currentTime').textContent = '0:00';
        };
        
        document.getElementById('editorCutBtn').onclick = async () => {
            await this.cutAudio();
            this.drawWaveform();
            const newUrl = URL.createObjectURL(this.audioRecorder.audioBlob);
            this.audioRecorder.playbackAudio.src = newUrl;
            document.getElementById('totalTime').textContent = 
                this.formatTime(this.audioRecorder.audioBuffer.duration);
            this.showToast('Audio trimmed', 'success');
        };
        
        document.getElementById('editorSaveBtn').onclick = () => {
            this.saveRecording();
        };
        
        document.getElementById('editorRerecordBtn').onclick = () => {
            this.resetRecordingView();
            if (this.audioRecorder.playbackAudio) {
                this.audioRecorder.playbackAudio.pause();
            }
        };
        
        // Make markers draggable
        this.makeMarkerDraggable('markerStart', 'start');
        this.makeMarkerDraggable('markerEnd', 'end');
    }
    
    makeMarkerDraggable(markerId, type) {
        const marker = document.getElementById(markerId);
        const canvas = document.getElementById('waveformCanvas');
        let isDragging = false;
        
        marker.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const rect = canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            const position = Math.max(0, Math.min(1, x / rect.width));
            
            if (type === 'start' && position < this.audioRecorder.markerEnd - 0.01) {
                this.audioRecorder.markerStart = position;
                marker.style.left = `${position * 100}%`;
            } else if (type === 'end' && position > this.audioRecorder.markerStart + 0.01) {
                this.audioRecorder.markerEnd = position;
                marker.style.left = `${position * 100}%`;
            }
        });
        
        document.addEventListener('mouseup', () => {
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
        const buffer = audioBuffer.getChannelData(0);
        const samples = buffer.length;
        const dataSize = samples * 2;
        const bufferSize = 44 + dataSize;
        
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);
        
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
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        
        let offset = 44;
        for (let i = 0; i < samples; i++) {
            const sample = Math.max(-1, Math.min(1, buffer[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
    
    saveRecording() {
        const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
        if (!card) return;
        
        const word = (card.word || 'word').toLowerCase().replace(/[^a-z0-9]/g, '');
        const english = (card.english || 'english').toLowerCase().replace(/[^a-z0-9]/g, '');
        const defaultFilename = `${this.currentCardId}.${this.currentLanguage}.${word}.${english}.wav`;
        
        this.pendingBlob = this.audioRecorder.audioBlob;
        this.pendingFile = null;
        
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
        
        this.closeFilenameDialog();
        this.showToast('Uploading...', 'warning');
        
        try {
            const formData = new FormData();
            
            if (this.pendingBlob) {
                formData.append('audio', this.pendingBlob, filename);
            } else if (this.pendingFile) {
                formData.append('audio', this.pendingFile, filename);
            }
            
            formData.append('filename', filename);
            
            const response = await fetch('../upload-audio.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                const card = this.allCards.find(c => (c.cardNum || c.wordNum) === this.currentCardId);
                if (card) {
                    card.audio = `assets/${filename}`;
                }
                
                this.filterCards();
                this.showToast(`Audio saved: ${filename}`, 'success');
            } else {
                this.showToast(`Upload failed: ${result.error}`, 'error');
            }
        } catch (err) {
            this.showToast(`Upload error: ${err.message}`, 'error');
        }
        
        this.pendingFile = null;
        this.pendingBlob = null;
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
}

// Initialize app
const app = new VoiceRecorderApp();
