/**
 * AUDIO UTILITIES MODULE
 * Helper functions for audio file handling and Web Audio API
 */

export class DebugLog {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.entries = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { timestamp, message, type };
        this.entries.push(entry);
        
        if (this.element) {
            const div = document.createElement('div');
            div.className = `debug-entry debug-${type}`;
            div.innerHTML = `<span class="debug-timestamp">[${timestamp}]</span> ${message}`;
            this.element.appendChild(div);
            this.element.scrollTop = this.element.scrollHeight;
        }
        
        // Also log to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    clear() {
        this.entries = [];
        if (this.element) {
            this.element.innerHTML = '';
        }
    }
}

export class AudioUtils {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.currentSource = null;
    }

    /**
     * Load audio file from File object
     */
    async loadAudioFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    resolve(audioBuffer);
                } catch (error) {
                    reject(new Error(`Failed to decode audio: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Play audio buffer
     */
    playAudio(audioBuffer) {
        if (this.currentSource) {
            this.currentSource.stop();
        }
        
        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = audioBuffer;
        this.currentSource.connect(this.audioContext.destination);
        this.currentSource.start(0);
        
        this.currentSource.onended = () => {
            this.currentSource = null;
        };
    }

    /**
     * Stop currently playing audio
     */
    stopAudio() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
    }

    /**
     * Convert AudioBuffer to mono
     */
    toMono(audioBuffer) {
        if (audioBuffer.numberOfChannels === 1) {
            return audioBuffer;
        }
        
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        const monoBuffer = this.audioContext.createBuffer(1, length, sampleRate);
        const monoData = monoBuffer.getChannelData(0);
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                monoData[i] += channelData[i] / audioBuffer.numberOfChannels;
            }
        }
        
        return monoBuffer;
    }

    /**
     * Normalize audio buffer
     */
    normalize(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const max = Math.max(...data.map(Math.abs));
        
        if (max === 0) return audioBuffer;
        
        const normalized = this.audioContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const normalizedData = normalized.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            normalizedData[i] = data[i] / max;
        }
        
        return normalized;
    }

    /**
     * Get audio duration in seconds
     */
    getDuration(audioBuffer) {
        return audioBuffer.length / audioBuffer.sampleRate;
    }

    /**
     * Format duration for display
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Create audio recorder
     */
    async createRecorder() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            
            return {
                recorder: mediaRecorder,
                start: () => {
                    chunks.length = 0;
                    mediaRecorder.start();
                },
                stop: () => new Promise((resolve) => {
                    mediaRecorder.onstop = async () => {
                        const blob = new Blob(chunks, { type: 'audio/webm' });
                        const arrayBuffer = await blob.arrayBuffer();
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        resolve(audioBuffer);
                    };
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }),
                onData: (handler) => {
                    mediaRecorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                        handler(e.data);
                    };
                }
            };
        } catch (error) {
            throw new Error(`Failed to access microphone: ${error.message}`);
        }
    }
}

/**
 * Storage utilities for API keys and preferences
 */
export class StorageManager {
    static save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage save failed:', e);
            return false;
        }
    }

    static load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage load failed:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove failed:', e);
            return false;
        }
    }
}
