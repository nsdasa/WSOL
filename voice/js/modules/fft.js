/**
 * FFT MODULE
 * Fast Fourier Transform and spectrogram computation
 */

import { MathUtils } from '../utils/math-utils.js';

export class FFTProcessor {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }

    /**
     * Compute FFT using Cooley-Tukey algorithm
     * @param {Array} signal - Input signal (real values)
     * @returns {Array} Magnitude spectrum
     */
    computeFFT(signal) {
        const n = signal.length;
        
        // Pad to next power of 2 if needed
        let paddedLength = 1;
        while (paddedLength < n) paddedLength <<= 1;
        
        // Create complex arrays (real and imaginary parts)
        const real = new Float64Array(paddedLength);
        const imag = new Float64Array(paddedLength);
        
        // Copy signal to real part, pad with zeros
        for (let i = 0; i < n; i++) {
            real[i] = signal[i];
        }
        
        // Bit-reversal permutation
        const bits = Math.log2(paddedLength);
        for (let i = 0; i < paddedLength; i++) {
            const j = this.reverseBits(i, bits);
            if (j > i) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }
        
        // Cooley-Tukey iterative FFT
        for (let size = 2; size <= paddedLength; size *= 2) {
            const halfSize = size / 2;
            const angleStep = -2 * Math.PI / size;
            
            for (let i = 0; i < paddedLength; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const angle = angleStep * j;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    
                    const idx1 = i + j;
                    const idx2 = i + j + halfSize;
                    
                    const tReal = real[idx2] * cos - imag[idx2] * sin;
                    const tImag = real[idx2] * sin + imag[idx2] * cos;
                    
                    real[idx2] = real[idx1] - tReal;
                    imag[idx2] = imag[idx1] - tImag;
                    real[idx1] = real[idx1] + tReal;
                    imag[idx1] = imag[idx1] + tImag;
                }
            }
        }
        
        // Compute magnitudes (only need first half due to symmetry)
        const magnitude = new Array(n / 2);
        for (let k = 0; k < n / 2; k++) {
            magnitude[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
        }
        
        return magnitude;
    }

    /**
     * Reverse bits for FFT bit-reversal permutation
     * @param {number} x - Input value
     * @param {number} bits - Number of bits
     * @returns {number} Bit-reversed value
     */
    reverseBits(x, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (x & 1);
            x >>= 1;
        }
        return result;
    }

    /**
     * Compute spectrogram (time-frequency representation)
     * @param {AudioBuffer} buffer - Input audio buffer
     * @param {Object} options - Spectrogram options
     * @returns {Array} 2D spectrogram data
     */
    computeSpectrogram(buffer, options = {}) {
        const {
            fftSize = 2048,
            hopSize = 512,
            maxFreq = 8000,
            useDB = false,
            useMel = false,
            numMelBins = 128
        } = options;
        
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        const numFrames = Math.floor((data.length - fftSize) / hopSize);
        const maxBin = Math.floor((maxFreq / sampleRate) * (fftSize / 2));
        
        if (numFrames <= 0) {
            this.debugLog.log(`Audio too short for FFT size ${fftSize}`, 'error');
            return [];
        }
        
        this.debugLog.log(`Computing spectrogram: ${numFrames} frames, FFT size ${fftSize}`);
        
        // Create mel filterbank if needed
        let melFilterbank = null;
        if (useMel) {
            melFilterbank = this.createMelFilterbank(numMelBins, fftSize, sampleRate, 0, maxFreq);
        }
        
        const spectrogramData = [];
        
        for (let i = 0; i < numFrames; i++) {
            const start = i * hopSize;
            const frame = Array.from(data.slice(start, start + fftSize));
            
            // Apply Hamming window
            const windowed = frame.map((sample, idx) =>
                sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * idx / (fftSize - 1)))
            );
            
            const spectrum = this.computeFFT(windowed);
            let frameData;
            
            if (useMel) {
                // Apply mel filterbank
                const melSpectrum = this.applyMelFilterbank(spectrum, melFilterbank);
                
                let maxMag = 1;
                if (!useDB) {
                    maxMag = Math.max(...melSpectrum);
                }
                
                frameData = melSpectrum.map(mag => {
                    if (useDB) {
                        const db = 20 * Math.log10(mag + 1e-10);
                        return Math.max(0, Math.min(1, (db + 60) / 60));
                    } else {
                        return mag / (maxMag + 1e-10);
                    }
                });
            } else {
                // Standard linear bins
                frameData = [];
                
                let maxMag = 1;
                if (!useDB) {
                    maxMag = Math.max(...spectrum.slice(0, maxBin));
                }
                
                for (let bin = 0; bin < maxBin; bin++) {
                    let normalized;
                    if (useDB) {
                        const db = 20 * Math.log10(spectrum[bin] + 1e-10);
                        normalized = Math.max(0, Math.min(1, (db + 60) / 60));
                    } else {
                        normalized = spectrum[bin] / (maxMag + 1e-10);
                    }
                    frameData.push(normalized);
                }
            }
            
            spectrogramData.push(frameData);
        }
        
        this.debugLog.log(`Spectrogram complete: ${spectrogramData.length} frames`, 'success');
        return spectrogramData;
    }

    /**
     * Create mel-scale filterbank
     * @param {number} numFilters - Number of mel filters
     * @param {number} fftSize - FFT size
     * @param {number} sampleRate - Sample rate
     * @param {number} minFreq - Minimum frequency
     * @param {number} maxFreq - Maximum frequency
     * @returns {Array} Mel filterbank
     */
    createMelFilterbank(numFilters, fftSize, sampleRate, minFreq = 0, maxFreq = 8000) {
        const minMel = MathUtils.hzToMel(minFreq);
        const maxMel = MathUtils.hzToMel(maxFreq);
        
        // Create numFilters + 2 points evenly spaced in mel scale
        const melPoints = [];
        for (let i = 0; i < numFilters + 2; i++) {
            melPoints.push(minMel + (maxMel - minMel) * i / (numFilters + 1));
        }
        
        // Convert back to Hz
        const hzPoints = melPoints.map(mel => MathUtils.melToHz(mel));
        
        // Convert to FFT bin indices
        const binPoints = hzPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate));
        
        // Create triangular filters
        const filterbank = [];
        for (let i = 1; i < numFilters + 1; i++) {
            const filter = new Array(Math.floor(fftSize / 2)).fill(0);
            
            // Rising edge
            for (let j = binPoints[i - 1]; j < binPoints[i]; j++) {
                if (j >= 0 && j < filter.length) {
                    filter[j] = (j - binPoints[i - 1]) / (binPoints[i] - binPoints[i - 1]);
                }
            }
            
            // Falling edge
            for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
                if (j >= 0 && j < filter.length) {
                    filter[j] = (binPoints[i + 1] - j) / (binPoints[i + 1] - binPoints[i]);
                }
            }
            
            filterbank.push(filter);
        }
        
        return filterbank;
    }

    /**
     * Apply mel filterbank to spectrum
     * @param {Array} spectrum - Input spectrum
     * @param {Array} filterbank - Mel filterbank
     * @returns {Array} Mel-filtered spectrum
     */
    applyMelFilterbank(spectrum, filterbank) {
        return filterbank.map(filter => {
            let sum = 0;
            for (let i = 0; i < filter.length && i < spectrum.length; i++) {
                sum += spectrum[i] * filter[i];
            }
            return sum;
        });
    }

    /**
     * Compute power spectrum (magnitude squared)
     * @param {Array} signal - Input signal
     * @returns {Array} Power spectrum
     */
    computePowerSpectrum(signal) {
        const magnitude = this.computeFFT(signal);
        return magnitude.map(m => m * m);
    }

    /**
     * Compute spectral centroid (brightness measure)
     * @param {Array} spectrum - Magnitude spectrum
     * @param {number} sampleRate - Sample rate
     * @returns {number} Spectral centroid in Hz
     */
    static computeSpectralCentroid(spectrum, sampleRate) {
        const binSize = sampleRate / (2 * spectrum.length);
        let weightedSum = 0;
        let totalMagnitude = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
            const freq = i * binSize;
            weightedSum += freq * spectrum[i];
            totalMagnitude += spectrum[i];
        }
        
        return totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
    }

    /**
     * Compute spectral rolloff (frequency below which 85% of energy lies)
     * @param {Array} spectrum - Magnitude spectrum
     * @param {number} sampleRate - Sample rate
     * @param {number} threshold - Energy threshold (0-1)
     * @returns {number} Spectral rolloff in Hz
     */
    static computeSpectralRolloff(spectrum, sampleRate, threshold = 0.85) {
        const binSize = sampleRate / (2 * spectrum.length);
        const totalEnergy = spectrum.reduce((sum, mag) => sum + mag * mag, 0);
        const targetEnergy = totalEnergy * threshold;
        
        let cumulativeEnergy = 0;
        for (let i = 0; i < spectrum.length; i++) {
            cumulativeEnergy += spectrum[i] * spectrum[i];
            if (cumulativeEnergy >= targetEnergy) {
                return i * binSize;
            }
        }
        
        return (spectrum.length - 1) * binSize;
    }

    /**
     * Compute spectral flux (change in spectrum over time)
     * @param {Array} spectrum1 - First spectrum
     * @param {Array} spectrum2 - Second spectrum
     * @returns {number} Spectral flux
     */
    static computeSpectralFlux(spectrum1, spectrum2) {
        const minLen = Math.min(spectrum1.length, spectrum2.length);
        let flux = 0;
        
        for (let i = 0; i < minLen; i++) {
            const diff = spectrum2[i] - spectrum1[i];
            flux += diff * diff;
        }
        
        return Math.sqrt(flux);
    }
}
