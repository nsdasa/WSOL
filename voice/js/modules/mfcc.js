/**
 * MFCC MODULE
 * Mel-Frequency Cepstral Coefficients extraction for speech analysis
 */

import { MathUtils } from '../utils/math-utils.js';

export class MFCCAnalyzer {
    constructor(audioBuffer, fftProcessor, debugLog) {
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
        this.fftProcessor = fftProcessor;
        this.debugLog = debugLog;
    }

    /**
     * Extract MFCC features from audio
     * @param {number} numCoeffs - Number of MFCC coefficients (typically 13)
     * @param {number} numFilters - Number of mel filters (typically 40-60)
     * @returns {Array} MFCC feature vectors with time stamps
     */
    extractMFCCs(numCoeffs = 13, numFilters = 60) {
        // Optimized parameters for single-word pronunciation analysis
        const frameSize = 2048;      // ~46ms at 44.1kHz - excellent frequency resolution
        const hopSize = 128;         // ~2.9ms - fine temporal resolution for transitions
        const lowFreq = 100;         // Cut DC/rumble, focus on speech
        const highFreq = Math.min(8000, this.sampleRate / 2);  // Speech bandwidth
        const preEmphasis = 0.97;    // Boost high frequencies for consonants
        const lifterCoeff = 22;      // Cepstral liftering parameter
        
        this.debugLog.log(`Starting MFCC extraction (frame=${frameSize}, hop=${hopSize}, filters=${numFilters})...`);
        
        // Pre-compute mel filterbank with frequency limits
        const melFilters = this.createMelFilterbank(frameSize, numFilters, lowFreq, highFreq);
        
        // Pre-compute Hamming window
        const hammingWindow = new Float64Array(frameSize);
        for (let i = 0; i < frameSize; i++) {
            hammingWindow[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frameSize - 1));
        }
        
        // Pre-compute liftering coefficients
        const lifter = new Float64Array(numCoeffs);
        for (let n = 0; n < numCoeffs; n++) {
            lifter[n] = 1 + (lifterCoeff / 2) * Math.sin(Math.PI * n / lifterCoeff);
        }
        
        const mfccs = [];
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            // Extract frame
            const frame = new Float64Array(frameSize);
            
            // Apply pre-emphasis filter (boost high frequencies)
            for (let j = 0; j < frameSize; j++) {
                const currentSample = this.data[i + j];
                if (j === 0 && i > 0) {
                    frame[j] = currentSample - preEmphasis * this.data[i - 1];
                } else if (j === 0) {
                    frame[j] = currentSample;
                } else {
                    frame[j] = currentSample - preEmphasis * this.data[i + j - 1];
                }
            }
            
            // Apply Hamming window
            for (let j = 0; j < frameSize; j++) {
                frame[j] *= hammingWindow[j];
            }
            
            // Compute power spectrum
            const spectrum = this.fftProcessor.computeFFT(Array.from(frame));
            const powerSpectrum = spectrum.map(x => x * x);
            
            // Apply mel filterbank
            const melEnergies = new Float64Array(numFilters);
            for (let f = 0; f < numFilters; f++) {
                let energy = 0;
                for (let k = 0; k < melFilters[f].length; k++) {
                    const bin = melFilters[f][k].bin;
                    if (bin < powerSpectrum.length) {
                        energy += powerSpectrum[bin] * melFilters[f][k].weight;
                    }
                }
                // Take log (add small value to avoid log(0))
                melEnergies[f] = Math.log(energy + 1e-10);
            }
            
            // Apply DCT-II to get MFCCs
            const coeffs = new Float64Array(numCoeffs);
            const scale = Math.sqrt(2 / numFilters);
            for (let n = 0; n < numCoeffs; n++) {
                let sum = 0;
                for (let m = 0; m < numFilters; m++) {
                    sum += melEnergies[m] * Math.cos(Math.PI * n * (m + 0.5) / numFilters);
                }
                // Apply liftering to reduce dominance of higher coefficients
                coeffs[n] = sum * scale * lifter[n];
            }
            
            mfccs.push({
                time: i / this.sampleRate,
                coeffs: Array.from(coeffs)
            });
        }
        
        // Apply Cepstral Mean Normalization (CMN) - removes channel/speaker bias
        let originalMeans = null;
        if (mfccs.length > 0) {
            const means = new Float64Array(numCoeffs);
            for (const frame of mfccs) {
                for (let c = 0; c < numCoeffs; c++) {
                    means[c] += frame.coeffs[c];
                }
            }
            for (let c = 0; c < numCoeffs; c++) {
                means[c] /= mfccs.length;
            }
            // Store original means before normalization
            originalMeans = Array.from(means);
            
            // Subtract mean (skip c0 which is energy - keep it unnormalized)
            for (const frame of mfccs) {
                for (let c = 1; c < numCoeffs; c++) {
                    frame.coeffs[c] -= means[c];
                }
            }
            this.debugLog.log(`Applied CMN normalization`);
        }
        
        // Attach original means to the result
        mfccs.originalMeans = originalMeans;
        
        this.debugLog.log(`Extracted ${mfccs.length} MFCC frames`, 'success');
        return mfccs;
    }

    /**
     * Extract delta (velocity) coefficients - captures temporal dynamics
     * @param {Array} mfccs - Static MFCC coefficients
     * @param {number} windowSize - Delta window size
     * @returns {Array} Delta MFCC coefficients
     */
    extractDeltaMFCCs(mfccs, windowSize = 2) {
        if (mfccs.length < 2 * windowSize + 1) {
            this.debugLog.log('Not enough frames for delta extraction', 'warning');
            return mfccs.map(f => ({ time: f.time, coeffs: new Array(f.coeffs.length).fill(0) }));
        }
        
        const deltas = [];
        const numCoeffs = mfccs[0].coeffs.length;
        
        for (let i = 0; i < mfccs.length; i++) {
            const delta = new Float64Array(numCoeffs);
            let norm = 0;
            
            for (let j = 1; j <= windowSize; j++) {
                const prevIdx = Math.max(0, i - j);
                const nextIdx = Math.min(mfccs.length - 1, i + j);
                
                for (let c = 0; c < numCoeffs; c++) {
                    delta[c] += j * (mfccs[nextIdx].coeffs[c] - mfccs[prevIdx].coeffs[c]);
                }
                norm += 2 * j * j;
            }
            
            deltas.push({
                time: mfccs[i].time,
                coeffs: Array.from(delta).map(d => d / norm)
            });
        }
        
        this.debugLog.log(`Extracted ${deltas.length} delta-MFCC frames`, 'success');
        return deltas;
    }

    /**
     * Extract delta-delta (acceleration) coefficients
     * @param {Array} mfccs - Static MFCC coefficients
     * @param {number} windowSize - Delta window size
     * @returns {Array} Delta-delta MFCC coefficients
     */
    extractDeltaDeltaMFCCs(mfccs, windowSize = 2) {
        const deltas = this.extractDeltaMFCCs(mfccs, windowSize);
        const deltaDeltas = this.extractDeltaMFCCs(deltas, windowSize);
        this.debugLog.log(`Extracted ${deltaDeltas.length} delta-delta-MFCC frames`, 'success');
        return deltaDeltas;
    }

    /**
     * Get full MFCC feature set (static + delta + delta-delta = 39 features)
     * @param {number} numCoeffs - Number of MFCC coefficients
     * @param {number} numFilters - Number of mel filters
     * @returns {Array} Full feature vectors (39-dimensional)
     */
    extractFullMFCCFeatures(numCoeffs = 13, numFilters = 60) {
        const staticMfccs = this.extractMFCCs(numCoeffs, numFilters);
        const deltaMfccs = this.extractDeltaMFCCs(staticMfccs);
        const deltaDeltaMfccs = this.extractDeltaDeltaMFCCs(staticMfccs);
        
        // Combine into full feature vectors
        const fullFeatures = staticMfccs.map((frame, i) => ({
            time: frame.time,
            static: frame.coeffs,
            delta: deltaMfccs[i].coeffs,
            deltaDelta: deltaDeltaMfccs[i].coeffs,
            // Combined 39-dimensional feature vector
            coeffs: [...frame.coeffs, ...deltaMfccs[i].coeffs, ...deltaDeltaMfccs[i].coeffs]
        }));
        
        this.debugLog.log(`Full MFCC features: ${fullFeatures.length} frames × ${fullFeatures[0]?.coeffs.length || 0} dimensions`, 'success');
        return fullFeatures;
    }

    /**
     * Create mel-scale filterbank for MFCC computation
     * @param {number} frameSize - FFT frame size
     * @param {number} numFilters - Number of mel filters
     * @param {number} lowFreq - Low frequency cutoff
     * @param {number} highFreq - High frequency cutoff
     * @returns {Array} Mel filterbank
     */
    createMelFilterbank(frameSize, numFilters, lowFreq = 100, highFreq = 8000) {
        const fftSize = frameSize;
        highFreq = Math.min(highFreq, this.sampleRate / 2);
        
        const lowMel = MathUtils.hzToMel(lowFreq);
        const highMel = MathUtils.hzToMel(highFreq);
        
        // Create equally spaced points in mel scale
        const melPoints = [];
        for (let i = 0; i <= numFilters + 1; i++) {
            melPoints.push(lowMel + (highMel - lowMel) * i / (numFilters + 1));
        }
        
        // Convert back to Hz and then to FFT bin
        const binPoints = melPoints.map(mel => {
            const hz = MathUtils.melToHz(mel);
            return Math.floor((fftSize + 1) * hz / this.sampleRate);
        });
        
        // Create triangular filters with area normalization
        const filters = [];
        for (let f = 0; f < numFilters; f++) {
            const filter = [];
            const start = binPoints[f];
            const center = binPoints[f + 1];
            const end = binPoints[f + 2];
            
            // Skip degenerate filters
            if (center <= start || end <= center) continue;
            
            // Compute filter area for normalization
            const area = (end - start) / 2;
            const norm = area > 0 ? 1 / area : 1;
            
            // Rising edge
            for (let k = start; k < center; k++) {
                const weight = ((k - start) / (center - start)) * norm;
                filter.push({ bin: k, weight: weight });
            }
            
            // Falling edge
            for (let k = center; k <= end; k++) {
                const weight = ((end - k) / (end - center)) * norm;
                if (weight > 0) {
                    filter.push({ bin: k, weight: weight });
                }
            }
            
            filters.push(filter);
        }
        
        // Pad with empty filters if some were degenerate
        while (filters.length < numFilters) {
            filters.push([]);
        }
        
        return filters;
    }

    /**
     * Compute cosine distance between two MFCC vectors
     * @param {Array} mfcc1 - First MFCC vector
     * @param {Array} mfcc2 - Second MFCC vector
     * @returns {number} Cosine distance (0 = identical, 2 = opposite)
     */
    static cosineDistance(mfcc1, mfcc2) {
        const len = Math.min(mfcc1.length, mfcc2.length);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < len; i++) {
            dotProduct += mfcc1[i] * mfcc2[i];
            norm1 += mfcc1[i] * mfcc1[i];
            norm2 += mfcc2[i] * mfcc2[i];
        }
        
        const similarity = dotProduct / (Math.sqrt(norm1 * norm2) + 1e-10);
        return 1 - similarity; // Convert similarity to distance
    }

    /**
     * Compute Euclidean distance between two MFCC vectors
     * @param {Array} mfcc1 - First MFCC vector
     * @param {Array} mfcc2 - Second MFCC vector
     * @returns {number} Euclidean distance
     */
    static euclideanDistance(mfcc1, mfcc2) {
        const len = Math.min(mfcc1.length, mfcc2.length);
        let sum = 0;
        
        for (let i = 0; i < len; i++) {
            const diff = mfcc1[i] - mfcc2[i];
            sum += diff * diff;
        }
        
        return Math.sqrt(sum);
    }
}
