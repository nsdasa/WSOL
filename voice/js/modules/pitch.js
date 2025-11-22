/**
 * PITCH MODULE
 * Pitch detection using normalized autocorrelation with advanced cleaning
 */

import { MathUtils } from '../utils/math-utils.js';

export class PitchAnalyzer {
    constructor(audioBuffer, debugLog) {
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
        this.debugLog = debugLog;
    }

    /**
     * Extract pitch contour from audio
     * @returns {Array} Pitch track with time, pitch, and confidence
     */
    extractPitch() {
        const frameSize = 2048;
        const hopSize = 128;    // Fine temporal resolution for single words
        const minPitch = 75;
        const maxPitch = 500;
        const pitchTrack = [];
        const detailedFrames = [];
        
        this.debugLog.log(`Starting pitch extraction (frame=${frameSize}, hop=${hopSize})...`);
        
        // Frame-by-frame pitch estimation
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = this.data.slice(i, i + frameSize);
            const result = this.estimatePitchDetailed(Array.from(frame), minPitch, maxPitch);
            
            pitchTrack.push({
                time: i / this.sampleRate,
                pitch: result.pitch,
                confidence: result.confidence
            });
            
            detailedFrames.push({
                frameIndex: Math.floor(i / hopSize),
                time: i / this.sampleRate,
                pitch: result.pitch,
                confidence: result.confidence,
                bestLag: result.bestLag,
                maxCorrelation: result.maxCorr,
                isVoiced: result.pitch > 0
            });
        }
        
        // Clean and smooth pitch track
        const cleaned = this.cleanPitchTrack(pitchTrack.map(p => p.pitch), minPitch, maxPitch);
        
        this.debugLog.log(`Extracted ${pitchTrack.length} pitch frames`, 'success');
        
        // Reconstruct result with cleaned pitches
        const result = pitchTrack.map((p, i) => ({
            time: p.time,
            pitch: cleaned[i],
            confidence: p.confidence
        }));
        
        result.detailedFrames = detailedFrames;
        
        // Compute summary statistics
        const voicedPitches = cleaned.filter(p => p > 0);
        result.summary = {
            totalFrames: pitchTrack.length,
            voicedFrames: voicedPitches.length,
            unvoicedFrames: pitchTrack.length - voicedPitches.length,
            avgPitch: voicedPitches.length > 0 ? 
                (voicedPitches.reduce((a,b) => a+b, 0) / voicedPitches.length).toFixed(1) : 0,
            minPitch: voicedPitches.length > 0 ? Math.min(...voicedPitches).toFixed(1) : 0,
            maxPitch: voicedPitches.length > 0 ? Math.max(...voicedPitches).toFixed(1) : 0
        };
        
        return result;
    }

    /**
     * Estimate pitch for a single frame using normalized autocorrelation
     * @param {Array} frame - Audio samples
     * @param {number} minPitch - Minimum expected pitch (Hz)
     * @param {number} maxPitch - Maximum expected pitch (Hz)
     * @returns {Object} Pitch estimate with confidence
     */
    estimatePitchDetailed(frame, minPitch, maxPitch) {
        const minLag = Math.floor(this.sampleRate / maxPitch);
        const maxLag = Math.floor(this.sampleRate / minPitch);
        
        let maxCorr = -Infinity;
        let bestLag = 0;
        
        // Search for best autocorrelation
        for (let lag = minLag; lag < maxLag; lag++) {
            let corr = 0;
            let energy1 = 0;
            let energy2 = 0;
            
            for (let i = 0; i < frame.length - lag; i++) {
                corr += frame[i] * frame[i + lag];
                energy1 += frame[i] * frame[i];
                energy2 += frame[i + lag] * frame[i + lag];
            }
            
            // Normalized autocorrelation
            corr /= Math.sqrt(energy1 * energy2 + 1e-10);
            
            if (corr > maxCorr) {
                maxCorr = corr;
                bestLag = lag;
            }
        }
        
        // Threshold for voicing decision
        if (maxCorr < 0.2) {
            return { pitch: 0, confidence: maxCorr, bestLag: 0, maxCorr: maxCorr };
        }
        
        return {
            pitch: this.sampleRate / bestLag,
            confidence: maxCorr,
            bestLag: bestLag,
            maxCorr: maxCorr
        };
    }

    /**
     * Clean pitch track: octave correction, outlier removal, smoothing
     * @param {Array} pitchData - Raw pitch values
     * @param {number} minPitch - Minimum valid pitch
     * @param {number} maxPitch - Maximum valid pitch
     * @returns {Array} Cleaned pitch values
     */
    cleanPitchTrack(pitchData, minPitch, maxPitch) {
        const cleaned = [...pitchData];
        
        // Pass 0: Handle first frame specially by looking forward
        if (cleaned.length > 2 && cleaned[0] > 0) {
            const next = cleaned[1] || cleaned[2];
            if (next > 0) {
                const half = cleaned[0] / 2;
                const double = cleaned[0] * 2;
                
                const currentDist = Math.abs(cleaned[0] - next);
                const halfDist = Math.abs(half - next);
                const doubleDist = Math.abs(double - next);
                
                if (halfDist < currentDist && half >= minPitch) {
                    this.debugLog.log(`Octave correction at frame 0: ${cleaned[0].toFixed(1)} → ${half.toFixed(1)} Hz`);
                    cleaned[0] = half;
                } else if (doubleDist < currentDist && double <= maxPitch) {
                    this.debugLog.log(`Octave correction at frame 0: ${cleaned[0].toFixed(1)} → ${double.toFixed(1)} Hz`);
                    cleaned[0] = double;
                }
            }
        }

        // Pass 1: Remove octave errors (comparing with neighbors)
        for (let i = 1; i < cleaned.length - 1; i++) {
            if (cleaned[i] === 0) continue;
            
            const prev = cleaned[i - 1] > 0 ? cleaned[i - 1] : cleaned[i];
            const next = cleaned[i + 1] > 0 ? cleaned[i + 1] : cleaned[i];
            
            const context = [prev, next].sort((a, b) => a - b);
            const medianContext = context[Math.floor(context.length / 2)];
            
            // Check for octave errors
            if (cleaned[i] > medianContext * 1.5 || cleaned[i] < medianContext * 0.67) {
                const half = cleaned[i] / 2;
                const double = cleaned[i] * 2;
                
                const currentDist = Math.abs(cleaned[i] - medianContext);
                const halfDist = Math.abs(half - medianContext);
                const doubleDist = Math.abs(double - medianContext);
                
                if (halfDist < currentDist && half >= minPitch) {
                    this.debugLog.log(`Octave correction at frame ${i}: ${cleaned[i].toFixed(1)} → ${half.toFixed(1)} Hz`);
                    cleaned[i] = half;
                } else if (doubleDist < currentDist && double <= maxPitch) {
                    this.debugLog.log(`Octave correction at frame ${i}: ${cleaned[i].toFixed(1)} → ${double.toFixed(1)} Hz`);
                    cleaned[i] = double;
                }
            }
        }

        // Pass 2: Aggressive outlier removal BEFORE median filtering
        for (let i = 1; i < cleaned.length; i++) {
            if (cleaned[i] === 0 || cleaned[i-1] === 0) continue;
            
            const ratio = cleaned[i] / cleaned[i-1];
            if (ratio > 1.5 || ratio < 0.67) {
                if (i < cleaned.length - 1 && cleaned[i+1] > 0) {
                    cleaned[i] = (cleaned[i-1] + cleaned[i+1]) / 2;
                    this.debugLog.log(`Interpolated outlier at frame ${i}: now ${cleaned[i].toFixed(1)}`);
                } else {
                    cleaned[i] = cleaned[i-1];
                }
            }
        }
        
        // Apply median smoothing
        const smoothed = MathUtils.medianFilter(cleaned, 5);
        
        // Pass 3: One final pass for any remaining outliers after smoothing
        for (let i = 1; i < smoothed.length; i++) {
            if (smoothed[i] === 0 || smoothed[i-1] === 0) continue;
            
            const ratio = smoothed[i] / smoothed[i-1];
            if (ratio > 1.5 || ratio < 0.67) {
                if (i < smoothed.length - 1 && smoothed[i+1] > 0) {
                    smoothed[i] = (smoothed[i-1] + smoothed[i+1]) / 2;
                    this.debugLog.log(`Final interpolation at frame ${i}`);
                } else {
                    smoothed[i] = smoothed[i-1];
                }
            }
        }
        
        return smoothed;
    }

    /**
     * Detect pitch artifacts for quality assessment
     * @param {Array} pitchData - Pitch track
     * @returns {Object} Artifact statistics
     */
    static detectPitchArtifacts(pitchData) {
        let jumps = 0;
        let gaps = 0;
        let gapLengths = [];
        let currentGapLength = 0;
        
        for (let i = 1; i < pitchData.length; i++) {
            const prev = pitchData[i - 1].pitch;
            const curr = pitchData[i].pitch;
            
            // Count gaps
            if (curr === 0) {
                currentGapLength++;
            } else {
                if (currentGapLength > 0) {
                    gaps++;
                    gapLengths.push(currentGapLength);
                    currentGapLength = 0;
                }
            }
            
            // Count jumps
            if (prev > 0 && curr > 0) {
                const ratio = curr / prev;
                if (ratio > 1.3 || ratio < 0.77) {
                    jumps++;
                }
            }
        }
        
        const avgGapLength = gapLengths.length > 0 
            ? gapLengths.reduce((a, b) => a + b, 0) / gapLengths.length 
            : 0;
        
        return {
            jumps,
            gaps,
            avgGapLength: avgGapLength.toFixed(1),
            maxGapLength: gapLengths.length > 0 ? Math.max(...gapLengths) : 0
        };
    }

    /**
     * Find pitch landmarks (peaks, valleys, plateaus)
     * @param {Array} pitchData - Pitch track
     * @returns {Object} Landmark positions
     */
    static findPitchLandmarks(pitchData) {
        const peaks = [];
        const valleys = [];
        const pitches = pitchData.filter(p => p.pitch > 0).map(p => p.pitch);
        
        if (pitches.length < 5) return { peaks, valleys };
        
        for (let i = 2; i < pitches.length - 2; i++) {
            const curr = pitches[i];
            const neighbors = [pitches[i-2], pitches[i-1], pitches[i+1], pitches[i+2]];
            const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
            
            if (curr > avgNeighbor * 1.05) {
                peaks.push({ index: i, value: curr });
            } else if (curr < avgNeighbor * 0.95) {
                valleys.push({ index: i, value: curr });
            }
        }
        
        return { peaks, valleys };
    }
}
