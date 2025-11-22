/**
 * INTENSITY MODULE
 * Intensity/envelope extraction and stress pattern detection
 */

import { MathUtils } from '../utils/math-utils.js';

export class IntensityAnalyzer {
    constructor(audioBuffer, debugLog) {
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
        this.debugLog = debugLog;
    }

    /**
     * Extract intensity envelope (RMS amplitude over time)
     * @returns {Array} Intensity track with time and intensity values
     */
    extractIntensity() {
        const frameSize = 2048;
        const hopSize = 512;
        const intensity = [];
        
        this.debugLog.log(`Extracting intensity envelope (frame=${frameSize}, hop=${hopSize})...`);
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            let sum = 0;
            for (let j = 0; j < frameSize; j++) {
                sum += this.data[i + j] ** 2;
            }
            intensity.push({
                time: i / this.sampleRate,
                intensity: Math.sqrt(sum / frameSize) // RMS
            });
        }
        
        this.debugLog.log(`Extracted ${intensity.length} intensity frames`, 'success');
        return intensity;
    }

    /**
     * Extract zero-crossing rate (indicator of noise vs. periodicity)
     * @returns {Array} ZCR track with time and rate values
     */
    extractZCR() {
        const frameSize = 2048;
        const hopSize = 512;
        const zcr = [];
        
        this.debugLog.log(`Extracting zero-crossing rate...`);
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            let crossings = 0;
            for (let j = 1; j < frameSize; j++) {
                if ((this.data[i + j - 1] >= 0 && this.data[i + j] < 0) ||
                    (this.data[i + j - 1] < 0 && this.data[i + j] >= 0)) {
                    crossings++;
                }
            }
            zcr.push({
                time: i / this.sampleRate,
                zcr: crossings / frameSize
            });
        }
        
        this.debugLog.log(`Extracted ${zcr.length} ZCR frames`, 'success');
        return zcr;
    }

    /**
     * Extract spectral tilt (balance between low and high frequencies)
     * @param {Function} computeFFT - FFT computation function
     * @returns {Array} Spectral tilt track
     */
    extractSpectralTilt(computeFFT) {
        const frameSize = 1024;
        const hopSize = 512;
        const tilt = [];
        
        this.debugLog.log(`Extracting spectral tilt...`);
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = Array.from(this.data.slice(i, i + frameSize));
            const windowed = MathUtils.applyHammingWindow(frame);
            const spectrum = computeFFT(windowed);
            
            // Split spectrum into low and high frequency regions
            const lowCutoff = Math.floor(spectrum.length * 0.3);
            let lowEnergy = 0;
            let highEnergy = 0;
            
            for (let j = 0; j < lowCutoff; j++) {
                lowEnergy += spectrum[j];
            }
            for (let j = lowCutoff; j < spectrum.length; j++) {
                highEnergy += spectrum[j];
            }
            
            // Tilt is ratio of low to high energy
            const tiltValue = lowEnergy / (highEnergy + 1e-10);
            
            tilt.push({
                time: i / this.sampleRate,
                tilt: tiltValue
            });
        }
        
        this.debugLog.log(`Extracted ${tilt.length} spectral tilt frames`, 'success');
        return tilt;
    }
}

/**
 * STRESS PATTERN ANALYZER
 * Detects syllable stress patterns from intensity envelope
 */
export class StressAnalyzer {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }

    /**
     * Find intensity peaks (potential syllable stress points)
     * @param {Array} intensityTrack - Intensity envelope
     * @param {number} minHeight - Minimum peak height (0-1 relative to max)
     * @returns {Array} Peak positions with time, height, and index
     */
    findPeaks(intensityTrack, minHeight = 0.3) {
        const peaks = [];
        const values = intensityTrack.map(p => p.intensity);
        
        if (values.length < 10) {
            this.debugLog.log('Too few frames for peak detection', 'warning');
            return peaks;
        }
        
        const maxVal = Math.max(...values);
        if (maxVal === 0) {
            this.debugLog.log('Zero intensity detected', 'warning');
            return peaks;
        }

        // Look for local maxima that exceed threshold
        for (let i = 5; i < values.length - 5; i++) {
            if (values[i] > maxVal * minHeight &&
                values[i] > values[i-1] && values[i] > values[i+1] &&
                values[i] > values[i-2] && values[i] > values[i+2] &&
                values[i] > values[i-3] && values[i] > values[i+3]) {
                peaks.push({
                    time: intensityTrack[i].time,
                    height: values[i] / maxVal,
                    index: i
                });
            }
        }
        
        this.debugLog.log(`Found ${peaks.length} intensity peaks`);
        return peaks;
    }

    /**
     * Compare stress patterns between native and user recordings
     * @param {Array} nativeIntensity - Native speaker intensity
     * @param {Array} userIntensity - User intensity
     * @returns {Object} Stress comparison scores and details
     */
    compareStressPattern(nativeIntensity, userIntensity) {
        const nativePeaks = this.findPeaks(nativeIntensity, 0.35);
        const userPeaks = this.findPeaks(userIntensity, 0.35);

        if (nativePeaks.length === 0 || userPeaks.length === 0) {
            return { 
                score: 50, 
                positionScore: 50,
                details: { reason: 'Insufficient stress peaks' } 
            };
        }

        // Calculate stress POSITION score - where is the strongest stress?
        const nativeValues = nativeIntensity.map(p => p.intensity);
        const userValues = userIntensity.map(p => p.intensity);
        
        const nativeStrongest = nativePeaks.reduce((a, b) => a.height > b.height ? a : b);
        const userStrongest = userPeaks.reduce((a, b) => a.height > b.height ? a : b);
        
        const nativePos = nativeStrongest.index / nativeValues.length;
        const userPos = userStrongest.index / userValues.length;
        const posDiff = Math.abs(nativePos - userPos);
        
        // Score: 100 if same position, loses 20 points per 10% position difference
        const positionScore = Math.max(0, 100 - posDiff * 200);

        // Match peaks by time (with tolerance)
        let matched = 0;
        const nativeDuration = nativeIntensity.length > 0 ? 
            nativeIntensity[nativeIntensity.length - 1].time : 1;
        const tolerance = Math.max(0.1, nativeDuration * 0.15); // 15% of duration

        for (const np of nativePeaks) {
            for (const up of userPeaks) {
                if (Math.abs(np.time - up.time) < tolerance) {
                    // Relative height should be similar
                    const heightDiff = Math.abs(np.height - up.height);
                    if (heightDiff < 0.4) {
                        matched++;
                        break;
                    }
                }
            }
        }

        // Penalize for wrong number of syllables
        const countPenalty = Math.abs(nativePeaks.length - userPeaks.length) * 10;
        const score = Math.max(0, Math.min(100, (matched / nativePeaks.length) * 100 - countPenalty));
        
        this.debugLog.log(
            `Stress pattern: ${matched}/${nativePeaks.length} peaks matched, ` +
            `position score: ${positionScore.toFixed(0)}%`
        );
        
        return {
            score: Math.round(score),
            positionScore: Math.round(positionScore),
            details: {
                nativePeaks: nativePeaks.length,
                userPeaks: userPeaks.length,
                matched: matched,
                nativeStressPos: (nativePos * 100).toFixed(1) + '%',
                userStressPos: (userPos * 100).toFixed(1) + '%',
                positionDiff: (posDiff * 100).toFixed(1) + '%',
                calculation: `Pattern: ${matched}/${nativePeaks.length} matched, Position: ${positionScore.toFixed(0)}%`
            }
        };
    }

    /**
     * Detect stress anomalies in intensity track
     * @param {Array} intensityTrack - Intensity envelope
     * @returns {Object} Anomaly statistics
     */
    static detectAnomalies(intensityTrack) {
        const values = intensityTrack.map(p => p.intensity);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(
            values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
        );
        
        let spikes = 0;
        let drops = 0;
        
        for (let i = 1; i < values.length - 1; i++) {
            const prevAvg = (values[i-1] + values[i-2]) / 2;
            const nextAvg = (values[i+1] + values[i+2]) / 2;
            const localAvg = (prevAvg + nextAvg) / 2;
            
            if (values[i] > localAvg + 2 * std) spikes++;
            if (values[i] < localAvg - 2 * std) drops++;
        }
        
        return {
            mean: mean.toFixed(4),
            std: std.toFixed(4),
            spikes,
            drops,
            dynamic_range: (Math.max(...values) / (Math.min(...values) + 1e-10)).toFixed(2)
        };
    }

    /**
     * Smooth intensity envelope
     * @param {Array} intensityTrack - Raw intensity
     * @param {number} windowSize - Smoothing window size
     * @returns {Array} Smoothed intensity
     */
    static smoothIntensity(intensityTrack, windowSize = 5) {
        const values = intensityTrack.map(p => p.intensity);
        const smoothed = MathUtils.medianFilter(values, windowSize);
        
        return intensityTrack.map((point, i) => ({
            time: point.time,
            intensity: smoothed[i]
        }));
    }
}
