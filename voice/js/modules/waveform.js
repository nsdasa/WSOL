/**
 * WAVEFORM MODULE
 * Waveform processing, normalization, and buffer utilities
 */

import { MathUtils } from '../utils/math-utils.js';

export class WaveformProcessor {
    constructor(audioContext, debugLog) {
        this.audioContext = audioContext;
        this.debugLog = debugLog;
    }

    /**
     * Normalize audio buffer to peak amplitude of 1.0
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @returns {AudioBuffer} Normalized audio buffer
     */
    normalize(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const max = Math.max(...data.map(Math.abs));
        
        if (max === 0 || max === 1) {
            this.debugLog.log('No normalization needed');
            return audioBuffer;
        }
        
        const normalized = this.audioContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const normalizedData = normalized.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            normalizedData[i] = data[i] / max;
        }
        
        this.debugLog.log(`Normalized audio (peak: ${max.toFixed(3)} → 1.0)`);
        return normalized;
    }

    /**
     * Remove DC offset from audio
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @returns {AudioBuffer} DC-corrected audio buffer
     */
    removeDCOffset(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        
        if (Math.abs(mean) < 0.001) {
            this.debugLog.log('No significant DC offset detected');
            return audioBuffer;
        }
        
        const corrected = this.audioContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const correctedData = corrected.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            correctedData[i] = data[i] - mean;
        }
        
        this.debugLog.log(`Removed DC offset (mean: ${mean.toFixed(4)})`);
        return corrected;
    }

    /**
     * Apply pre-emphasis filter (boost high frequencies)
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @param {number} alpha - Pre-emphasis coefficient (typically 0.95-0.97)
     * @returns {AudioBuffer} Pre-emphasized audio buffer
     */
    applyPreEmphasis(audioBuffer, alpha = 0.97) {
        const data = audioBuffer.getChannelData(0);
        const emphasized = this.audioContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const emphasizedData = emphasized.getChannelData(0);
        
        emphasizedData[0] = data[0];
        for (let i = 1; i < data.length; i++) {
            emphasizedData[i] = data[i] - alpha * data[i - 1];
        }
        
        this.debugLog.log(`Applied pre-emphasis (α=${alpha})`);
        return emphasized;
    }

    /**
     * Downsample audio buffer
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @param {number} targetSampleRate - Desired sample rate
     * @returns {AudioBuffer} Downsampled audio buffer
     */
    downsample(audioBuffer, targetSampleRate) {
        if (audioBuffer.sampleRate === targetSampleRate) {
            return audioBuffer;
        }
        
        if (audioBuffer.sampleRate < targetSampleRate) {
            this.debugLog.log('Cannot upsample - returning original', 'warning');
            return audioBuffer;
        }
        
        const data = audioBuffer.getChannelData(0);
        const ratio = audioBuffer.sampleRate / targetSampleRate;
        const newLength = Math.floor(data.length / ratio);
        
        const downsampled = this.audioContext.createBuffer(
            1,
            newLength,
            targetSampleRate
        );
        const downsampledData = downsampled.getChannelData(0);
        
        // Simple linear interpolation
        for (let i = 0; i < newLength; i++) {
            const srcIdx = i * ratio;
            const idx1 = Math.floor(srcIdx);
            const idx2 = Math.min(idx1 + 1, data.length - 1);
            const frac = srcIdx - idx1;
            
            downsampledData[i] = data[idx1] * (1 - frac) + data[idx2] * frac;
        }
        
        this.debugLog.log(`Downsampled: ${audioBuffer.sampleRate}Hz → ${targetSampleRate}Hz`);
        return downsampled;
    }

    /**
     * Trim silence from beginning and end
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @param {number} threshold - Silence threshold (0-1)
     * @returns {AudioBuffer} Trimmed audio buffer
     */
    trimSilence(audioBuffer, threshold = 0.01) {
        const data = audioBuffer.getChannelData(0);
        let start = 0;
        let end = data.length - 1;
        
        // Find first non-silent sample
        while (start < data.length && Math.abs(data[start]) < threshold) {
            start++;
        }
        
        // Find last non-silent sample
        while (end > start && Math.abs(data[end]) < threshold) {
            end--;
        }
        
        if (start >= end) {
            this.debugLog.log('Audio is entirely silence!', 'error');
            return audioBuffer;
        }
        
        const trimmedLength = end - start + 1;
        const trimmed = this.audioContext.createBuffer(
            1,
            trimmedLength,
            audioBuffer.sampleRate
        );
        const trimmedData = trimmed.getChannelData(0);
        
        for (let i = 0; i < trimmedLength; i++) {
            trimmedData[i] = data[start + i];
        }
        
        const trimmedMs = ((data.length - trimmedLength) / audioBuffer.sampleRate * 1000).toFixed(0);
        this.debugLog.log(`Trimmed ${trimmedMs}ms of silence`);
        return trimmed;
    }

    /**
     * Resample waveform data to target length
     * @param {Float32Array} data - Input waveform data
     * @param {number} targetLength - Desired length
     * @returns {Float32Array} Resampled data
     */
    static resampleData(data, targetLength) {
        if (data.length === targetLength) {
            return data;
        }
        
        const result = new Float32Array(targetLength);
        const ratio = data.length / targetLength;
        
        for (let i = 0; i < targetLength; i++) {
            const srcIdx = i * ratio;
            const idx1 = Math.floor(srcIdx);
            const idx2 = Math.min(idx1 + 1, data.length - 1);
            const frac = srcIdx - idx1;
            
            result[i] = data[idx1] * (1 - frac) + data[idx2] * frac;
        }
        
        return result;
    }

    /**
     * Get audio statistics
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @returns {Object} Audio statistics
     */
    static getStatistics(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const absData = Array.from(data).map(Math.abs);
        
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const rms = Math.sqrt(
            data.reduce((sum, val) => sum + val * val, 0) / data.length
        );
        const peak = Math.max(...absData);
        const min = Math.min(...data);
        const max = Math.max(...data);
        
        // Calculate dynamic range
        const sorted = absData.filter(x => x > 0).sort((a, b) => a - b);
        const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
        const percentile5 = sorted[Math.floor(sorted.length * 0.05)];
        const dynamicRange = percentile95 / (percentile5 + 1e-10);
        
        return {
            duration: audioBuffer.length / audioBuffer.sampleRate,
            sampleRate: audioBuffer.sampleRate,
            samples: audioBuffer.length,
            mean: mean.toFixed(6),
            rms: rms.toFixed(4),
            peak: peak.toFixed(4),
            min: min.toFixed(4),
            max: max.toFixed(4),
            dynamicRange: dynamicRange.toFixed(2)
        };
    }

    /**
     * Apply fade in/out to avoid clicks
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @param {number} fadeDuration - Fade duration in seconds
     * @returns {AudioBuffer} Faded audio buffer
     */
    applyFade(audioBuffer, fadeDuration = 0.01) {
        const data = audioBuffer.getChannelData(0);
        const fadeSamples = Math.floor(fadeDuration * audioBuffer.sampleRate);
        
        const faded = this.audioContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const fadedData = faded.getChannelData(0);
        
        // Copy data
        for (let i = 0; i < data.length; i++) {
            fadedData[i] = data[i];
        }
        
        // Fade in
        for (let i = 0; i < fadeSamples && i < data.length; i++) {
            const gain = i / fadeSamples;
            fadedData[i] *= gain;
        }
        
        // Fade out
        for (let i = 0; i < fadeSamples && i < data.length; i++) {
            const idx = data.length - 1 - i;
            const gain = i / fadeSamples;
            fadedData[idx] *= gain;
        }
        
        this.debugLog.log(`Applied ${fadeDuration * 1000}ms fade in/out`);
        return faded;
    }

    /**
     * Create a copy of audio buffer
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @returns {AudioBuffer} Copied audio buffer
     */
    clone(audioBuffer) {
        const copy = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const copyData = copy.getChannelData(channel);
            copyData.set(sourceData);
        }
        
        return copy;
    }
}
