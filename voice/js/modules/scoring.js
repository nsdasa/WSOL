/**
 * PRONUNCIATION SCORING & COMPARISON MODULE
 * 
 * Comprehensive scoring system for pronunciation analysis with:
 * - Multi-dimensional feature comparison (pitch, MFCC, formants, intensity)
 * - DTW and point-by-point comparison modes
 * - Stress pattern analysis
 * - Voice quality metrics
 * - Detailed feedback generation
 * 
 * Dependencies: DTW, internal modules (for ZCR/spectral tilt)
 * 
 * @module scoring
 */

import { DTW } from './dtw.js';
import { ImprovedLPC, InternalFeatureExtractor } from './internal.js';

// ===============================================
// HELPER FUNCTIONS
// ===============================================

/**
 * Calculate Pearson correlation coefficient between two arrays
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export function pearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const x_ = x.slice(0, n);
    const y_ = y.slice(0, n);
    
    const meanX = x_.reduce((a, b) => a + b, 0) / n;
    const meanY = y_.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x_[i] - meanX;
        const dy = y_[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
}

/**
 * Extract RMS envelope from audio samples
 * @param {Float32Array} samples - Audio samples
 * @param {number} windowSize - Window size in samples (default: 480)
 * @param {number} hopSize - Hop size in samples (default: 240)
 * @returns {number[]} Envelope values
 */
export function extractEnvelope(samples, windowSize = 480, hopSize = 240) {
    const envelope = [];
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            sum += samples[i + j] * samples[i + j];
        }
        envelope.push(Math.sqrt(sum / windowSize));
    }
    return envelope;
}

/**
 * Resample array to target length using linear interpolation
 * @param {number[]} arr - Source array
 * @param {number} targetLen - Target length
 * @returns {number[]} Resampled array
 */
export function resampleArray(arr, targetLen) {
    if (arr.length === targetLen) return arr;
    if (arr.length === 0) return new Array(targetLen).fill(0);
    
    const result = [];
    for (let i = 0; i < targetLen; i++) {
        const srcIdx = (i / (targetLen - 1)) * (arr.length - 1);
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, arr.length - 1);
        const t = srcIdx - lo;
        result.push(arr[lo] * (1 - t) + arr[hi] * t);
    }
    return result;
}

// ===============================================
// ACOUSTIC ANALYZER
// Wrapper class for extracting all acoustic features
// ===============================================

/**
 * AcousticAnalyzer - Feature extraction wrapper
 * Coordinates extraction of all acoustic features from an audio buffer
 */
export class AcousticAnalyzer {
    constructor(audioBuffer) {
        this.buffer = audioBuffer;
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
    }
    
    /**
     * Extract formants using ImprovedLPC
     * @returns {Object[]} Formant tracks
     */
    extractFormants() {
        return ImprovedLPC.extractFormants(this.buffer);
    }
    
    /**
     * Extract pitch track
     * NOTE: This is a placeholder - actual implementation should import from pitch.js
     * @returns {Object[]} Pitch track
     */
    extractPitch() {
        // Placeholder - should be imported from pitch module
        console.warn('extractPitch should be implemented by importing pitch.js module');
        return [];
    }
    
    /**
     * Extract intensity/envelope
     * NOTE: This is a placeholder - actual implementation should import from intensity.js
     * @returns {Object[]} Intensity track
     */
    extractIntensity() {
        // Placeholder - should be imported from intensity module
        console.warn('extractIntensity should be implemented by importing intensity.js module');
        return [];
    }
    
    /**
     * Extract Zero-Crossing Rate
     * @returns {Object[]} ZCR track
     */
    extractZCR() {
        const extractor = new InternalFeatureExtractor(this.buffer);
        return extractor.extractZCR();
    }
    
    /**
     * Extract Spectral Tilt
     * @returns {Object[]} Spectral tilt track
     */
    extractSpectralTilt() {
        const extractor = new InternalFeatureExtractor(this.buffer);
        return extractor.extractSpectralTilt();
    }
    
    /**
     * Extract MFCCs
     * NOTE: This is a placeholder - actual implementation should import from mfcc.js
     * @param {number} numCoeffs - Number of coefficients
     * @param {number} numFilters - Number of mel filters
     * @returns {Object[]} MFCC frames
     */
    extractMFCCs(numCoeffs = 13, numFilters = 60) {
        // Placeholder - should be imported from mfcc module
        console.warn('extractMFCCs should be implemented by importing mfcc.js module');
        return [];
    }
    
    /**
     * Extract delta MFCCs (temporal derivatives)
     * @param {Object[]} mfccs - Static MFCC frames
     * @param {number} windowSize - Delta computation window
     * @returns {Object[]} Delta MFCC frames
     */
    extractDeltaMFCCs(mfccs, windowSize = 2) {
        if (mfccs.length < 2 * windowSize + 1) {
            console.warn('Not enough frames for delta extraction');
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
        
        return deltas;
    }
}

// ===============================================
// PRONUNCIATION COMPARATOR
// Main comparison and scoring engine
// ===============================================

/**
 * PronunciationComparator - Multi-dimensional pronunciation scoring
 * 
 * Compares native and user pronunciations across multiple acoustic dimensions:
 * - Pitch contour (intonation)
 * - MFCC (phonetic quality)
 * - Envelope (loudness contour)
 * - Duration (timing)
 * - Stress patterns (syllable prominence)
 * - Voice quality (ZCR, spectral tilt)
 */
export class PronunciationComparator {
    constructor(config = {}) {
        this.useDTW = config.useDTW !== undefined ? config.useDTW : true;
        this.numMelFilters = config.numMelFilters || 60;
        this.weights = config.weights || {
            pitch: 0.20,
            mfcc: 0.25,
            envelope: 0.15,
            duration: 0.10,
            stressPosition: 0.10,
            stress: 0.10,
            quality: 0.10
        };
    }
    
    /**
     * Main comparison method
     * Extracts all features and computes comprehensive score
     * 
     * @param {AudioBuffer} nativeBuffer - Native speaker audio
     * @param {AudioBuffer} userBuffer - User audio
     * @returns {Object} Comparison results with scores and detailed breakdown
     */
    compare(nativeBuffer, userBuffer) {
        console.log('Starting comparison analysis...');
        
        const nativeAnalyzer = new AcousticAnalyzer(nativeBuffer);
        const userAnalyzer = new AcousticAnalyzer(userBuffer);
        
        // Extract all features
        const nativePitch = nativeAnalyzer.extractPitch();
        const userPitch = userAnalyzer.extractPitch();
        
        const nativeIntensity = nativeAnalyzer.extractIntensity();
        const userIntensity = userAnalyzer.extractIntensity();
        
        const nativeZCR = nativeAnalyzer.extractZCR();
        const userZCR = userAnalyzer.extractZCR();
        
        const nativeTilt = nativeAnalyzer.extractSpectralTilt();
        const userTilt = userAnalyzer.extractSpectralTilt();
        
        const nativeMFCCs = nativeAnalyzer.extractMFCCs(13, this.numMelFilters);
        const userMFCCs = userAnalyzer.extractMFCCs(13, this.numMelFilters);
        
        // Extract delta MFCCs for temporal dynamics analysis
        const nativeDeltaMFCCs = nativeAnalyzer.extractDeltaMFCCs(nativeMFCCs);
        const userDeltaMFCCs = userAnalyzer.extractDeltaMFCCs(userMFCCs);
        
        // Extract envelope correlation
        const nativeData = nativeBuffer.getChannelData(0);
        const userData = userBuffer.getChannelData(0);
        const nativeEnvelope = extractEnvelope(nativeData);
        const userEnvelope = extractEnvelope(userData);
        
        // Perform all comparisons
        const envelopeResult = this.compareEnvelope(nativeEnvelope, userEnvelope);
        const pitchResult = this.comparePitchDetailed(nativePitch, userPitch);
        const durationResult = this.compareDurationDetailed(nativeBuffer, userBuffer);
        const spectralResult = this.compareSpectralDetailed(nativeBuffer, userBuffer);
        const qualityResult = this.compareQualityDetailed(nativeZCR, userZCR, nativeTilt, userTilt);
        const stressResult = this.compareStressPattern(nativeIntensity, userIntensity);
        const mfccResult = this.compareMFCCs(nativeMFCCs, userMFCCs);
        const deltaMfccResult = this.compareMFCCs(nativeDeltaMFCCs, userDeltaMFCCs);
        
        // Extract individual scores
        const pitchScore = pitchResult.score;
        const durationScore = durationResult.score;
        const spectralScore = spectralResult.score;
        const qualityScore = qualityResult.score;
        const stressScore = stressResult.score;
        const stressPositionScore = stressResult.positionScore || stressScore;
        // Combine static MFCC (70%) and delta MFCC (30%) for comprehensive phonetic scoring
        const mfccScore = mfccResult.score * 0.7 + deltaMfccResult.score * 0.3;
        const envelopeScore = envelopeResult.score;
        
        console.log(`Scores - P:${pitchScore.toFixed(0)} M:${mfccScore.toFixed(0)} (static:${mfccResult.score.toFixed(0)} delta:${deltaMfccResult.score.toFixed(0)}) E:${envelopeScore.toFixed(0)} D:${durationScore.toFixed(0)} StPos:${stressPositionScore.toFixed(0)} StPat:${stressScore.toFixed(0)} Q:${qualityScore.toFixed(0)}`);
        
        // Calculate weighted overall score
        const overallScore = Math.round(
            pitchScore * this.weights.pitch +
            mfccScore * this.weights.mfcc +
            envelopeScore * this.weights.envelope +
            durationScore * this.weights.duration +
            stressPositionScore * this.weights.stressPosition +
            stressScore * this.weights.stress +
            qualityScore * this.weights.quality
        );
        
        // Build detailed report
        const detailedReport = {
            metadata: {
                timestamp: new Date().toISOString(),
                nativeDuration: nativeBuffer.duration,
                userDuration: userBuffer.duration,
                nativeSampleRate: nativeBuffer.sampleRate,
                userSampleRate: userBuffer.sampleRate
            },
            mfcc: {
                numMelFilters: this.numMelFilters,
                staticComparison: mfccResult.details,
                deltaComparison: deltaMfccResult.details,
                staticScore: mfccResult.score,
                deltaScore: deltaMfccResult.score,
                combinedScore: mfccScore,
                interpretation: {
                    staticMeaning: 'Captures vowel/consonant quality (what sounds are produced)',
                    deltaMeaning: 'Captures transitions between sounds (how smoothly sounds change)',
                    lowDeltaScore: deltaMfccResult.score < 60 ? 
                        'User transitions between sounds are abrupt or unclear' : null
                }
            },
            pitch: {
                native: {
                    summary: nativePitch.summary,
                    sampleFrames: nativePitch.detailedFrames ? nativePitch.detailedFrames.slice(0, 10) : []
                },
                user: {
                    summary: userPitch.summary,
                    sampleFrames: userPitch.detailedFrames ? userPitch.detailedFrames.slice(0, 10) : []
                },
                comparison: pitchResult.details
            },
            duration: durationResult.details,
            envelope: envelopeResult.details,
            quality: qualityResult.details,
            scoring: {
                weights: this.weights,
                rawScores: {
                    pitch: pitchScore,
                    mfcc: mfccScore,
                    envelope: envelopeScore,
                    duration: durationScore,
                    stressPosition: stressPositionScore,
                    stress: stressScore,
                    quality: qualityScore
                },
                weightedScores: {
                    pitch: pitchScore * this.weights.pitch,
                    mfcc: mfccScore * this.weights.mfcc,
                    envelope: envelopeScore * this.weights.envelope,
                    duration: durationScore * this.weights.duration,
                    stressPosition: stressPositionScore * this.weights.stressPosition,
                    stress: stressScore * this.weights.stress,
                    quality: qualityScore * this.weights.quality
                },
                overallScore: overallScore
            }
        };
        
        const result = {
            score: overallScore,
            breakdown: {
                pitch: Math.round(pitchScore),
                mfcc: Math.round(mfccScore),
                envelope: Math.round(envelopeScore),
                duration: Math.round(durationScore),
                stressPosition: Math.round(stressPositionScore),
                stress: Math.round(stressScore),
                quality: Math.round(qualityScore)
            },
            features: {
                nativeMFCCs,
                userMFCCs,
                nativeDeltaMFCCs,
                userDeltaMFCCs,
                nativePitch,
                userPitch,
                nativeIntensity,
                userIntensity,
                nativeEnvelope,
                userEnvelope,
                nativeZCR,
                userZCR,
                nativeTilt,
                userTilt
            },
            feedback: this.generateFeedback(overallScore, {
                pitch: pitchScore,
                mfcc: mfccScore,
                envelope: envelopeScore,
                duration: durationScore,
                stressPosition: stressPositionScore
            }),
            detailedReport: detailedReport
        };
        
        return result;
    }
    
    /**
     * Compare MFCC sequences using DTW or point-by-point
     * @param {Object[]} native - Native MFCC frames
     * @param {Object[]} user - User MFCC frames
     * @returns {Object} Score and details
     */
    compareMFCCs(native, user) {
        if (!native || !user || native.length === 0 || user.length === 0) {
            return {
                score: 50,
                details: { reason: 'Insufficient MFCC data' }
            };
        }
        
        let score, method;
        const numCoeffs = native[0].coeffs.length;
        
        // Compute coefficient-wise statistics for detailed analysis
        const coeffStats = [];
        for (let c = 1; c < numCoeffs; c++) {
            const nativeVals = native.map(f => f.coeffs[c]);
            const userVals = user.map(f => f.coeffs[c]);
            
            const nativeMean = nativeVals.reduce((a, b) => a + b, 0) / nativeVals.length;
            const userMean = userVals.reduce((a, b) => a + b, 0) / userVals.length;
            
            const nativeStd = Math.sqrt(nativeVals.reduce((a, b) => a + (b - nativeMean) ** 2, 0) / nativeVals.length);
            const userStd = Math.sqrt(userVals.reduce((a, b) => a + (b - userMean) ** 2, 0) / userVals.length);
            
            coeffStats.push({
                coeff: c,
                nativeMean: nativeMean,
                userMean: userMean,
                meanDiff: Math.abs(nativeMean - userMean),
                nativeStd: nativeStd,
                userStd: userStd
            });
        }
        
        if (this.useDTW) {
            // Use DTW on MFCC sequences
            const n = native.length;
            const m = user.length;
            
            // Create cost matrix
            const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
            cost[0][0] = 0;
            
            // Adaptive window based on length ratio
            const window = Math.max(20, Math.floor(Math.max(n, m) * 0.2));
            
            for (let i = 1; i <= n; i++) {
                const jStart = Math.max(1, Math.floor(i * m / n) - window);
                const jEnd = Math.min(m, Math.floor(i * m / n) + window);
                
                for (let j = jStart; j <= jEnd; j++) {
                    // Weighted Euclidean distance between MFCC vectors (skip c0 which is energy)
                    // Weight lower coefficients (which capture more perceptual info) more heavily
                    let dist = 0;
                    for (let c = 1; c < numCoeffs; c++) {
                        const weight = 1 / Math.sqrt(c); // Lower coeffs weighted more
                        const diff = native[i-1].coeffs[c] - user[j-1].coeffs[c];
                        dist += weight * diff * diff;
                    }
                    dist = Math.sqrt(dist);
                    
                    cost[i][j] = dist + Math.min(
                        cost[i-1][j],
                        cost[i][j-1],
                        cost[i-1][j-1]
                    );
                }
            }
            
            const totalDist = cost[n][m];
            const pathLength = n + m;
            const normalizedDist = totalDist / pathLength;
            
            // Convert to score (adjusted for weighted distances)
            score = Math.max(0, 100 * (1 - normalizedDist / 8));
            method = 'DTW-Weighted';
            
        } else {
            // Point-by-point comparison with interpolation
            const targetLen = Math.max(native.length, user.length);
            let totalDist = 0;
            
            for (let i = 0; i < targetLen; i++) {
                const nIdx = Math.min(native.length - 1, Math.floor(i * native.length / targetLen));
                const uIdx = Math.min(user.length - 1, Math.floor(i * user.length / targetLen));
                
                let frameDist = 0;
                for (let c = 1; c < numCoeffs; c++) {
                    const weight = 1 / Math.sqrt(c);
                    const diff = native[nIdx].coeffs[c] - user[uIdx].coeffs[c];
                    frameDist += weight * diff * diff;
                }
                totalDist += Math.sqrt(frameDist);
            }
            
            const avgDist = totalDist / targetLen;
            score = Math.max(0, 100 * (1 - avgDist / 8));
            method = 'Interpolated-Weighted';
        }
        
        // Identify problematic coefficients (for AI feedback)
        const problematicCoeffs = coeffStats
            .filter(s => s.meanDiff > 5) // Threshold for significant difference
            .sort((a, b) => b.meanDiff - a.meanDiff)
            .slice(0, 3);
        
        return {
            score: Math.min(100, Math.max(0, score)),
            details: {
                nativeFrames: native.length,
                userFrames: user.length,
                method: method,
                coefficientStats: coeffStats,
                problematicCoeffs: problematicCoeffs,
                frameTimeResolution: native.length > 1 ? 
                    ((native[native.length-1].time - native[0].time) / (native.length - 1) * 1000).toFixed(1) + 'ms' : 
                    'N/A'
            }
        };
    }
    
    /**
     * Compare formant tracks with extensive validation
     * @param {Object[]} native - Native formant frames
     * @param {Object[]} user - User formant frames
     * @returns {Object} Score and details
     */
    compareFormantsDetailed(native, user) {
        console.log(`compareFormantsDetailed: native.length=${native.length}, user.length=${user.length}`);
        
        if (!Array.isArray(native) || !Array.isArray(user)) {
            console.error('ERROR: native or user is not an array');
            return {
                score: 50,
                details: {
                    reason: 'Invalid formant data (not arrays)',
                    method: this.useDTW ? 'DTW (error)' : 'Point-by-point (error)'
                }
            };
        }
        
        // Filter to voiced frames with valid f1, f2, f3
        const nativeVoiced = native.filter(f => 
            f && 
            f.voiced === true && 
            typeof f.f1 === 'number' && !isNaN(f.f1) &&
            typeof f.f2 === 'number' && !isNaN(f.f2) &&
            typeof f.f3 === 'number' && !isNaN(f.f3)
        );
        
        const userVoiced = user.filter(f => 
            f && 
            f.voiced === true && 
            typeof f.f1 === 'number' && !isNaN(f.f1) &&
            typeof f.f2 === 'number' && !isNaN(f.f2) &&
            typeof f.f3 === 'number' && !isNaN(f.f3)
        );
        
        console.log(`Filtered: nativeVoiced=${nativeVoiced.length}, userVoiced=${userVoiced.length}`);
        
        if (nativeVoiced.length === 0 || userVoiced.length === 0) {
            console.error(`No valid voiced frames`);
            return {
                score: 50,
                details: {
                    validFrames: 0,
                    totalFrames: Math.min(native.length, user.length),
                    avgError: 'N/A',
                    reason: 'No voiced frames with valid formants',
                    sampleErrors: [],
                    method: this.useDTW ? 'DTW (no data)' : 'Point-by-point (no data)'
                }
            };
        }
        
        console.log(`First native voiced frame: f1=${nativeVoiced[0].f1}, f2=${nativeVoiced[0].f2}, f3=${nativeVoiced[0].f3}`);
        console.log(`First user voiced frame: f1=${userVoiced[0].f1}, f2=${userVoiced[0].f2}, f3=${userVoiced[0].f3}`);
        
        let score, avgError, calculation, method;
        const frameErrors = [];
        
        if (this.useDTW) {
            console.log(`Using DTW for formant comparison`);
            
            try {
                const dtwResult = DTW.computeMultiDim(
                    nativeVoiced,
                    userVoiced,
                    {f1: 1.0, f2: 0.8, f3: 0.6},
                    20
                );
                
                const avgF1 = nativeVoiced.reduce((sum, f) => sum + f.f1, 0) / nativeVoiced.length;
                const avgF2 = nativeVoiced.reduce((sum, f) => sum + f.f2, 0) / nativeVoiced.length;
                const avgF3 = nativeVoiced.reduce((sum, f) => sum + f.f3, 0) / nativeVoiced.length;
                const avgFormant = (avgF1 + avgF2 + avgF3) / 3;
                
                const relativeError = dtwResult.normalizedDistance / avgFormant;
                score = Math.max(0, 100 * (1 - relativeError * 5));
                avgError = relativeError;
                calculation = `DTW distance: ${dtwResult.normalizedDistance.toFixed(2)}, relative error: ${relativeError.toFixed(4)}`;
                method = 'DTW (tempo-invariant)';
                
                frameErrors.push({
                    note: 'DTW compares overall patterns',
                    native: {
                        avgF1: Math.round(avgF1),
                        avgF2: Math.round(avgF2),
                        avgF3: Math.round(avgF3)
                    },
                    user: {
                        avgF1: Math.round(userVoiced.reduce((sum, f) => sum + f.f1, 0) / userVoiced.length),
                        avgF2: Math.round(userVoiced.reduce((sum, f) => sum + f.f2, 0) / userVoiced.length),
                        avgF3: Math.round(userVoiced.reduce((sum, f) => sum + f.f3, 0) / userVoiced.length)
                    },
                    dtwDistance: dtwResult.normalizedDistance.toFixed(3)
                });
                
            } catch (error) {
                console.error(`DTW failed: ${error.message}`);
                
                // Fallback to point-by-point
                const minLen = Math.min(nativeVoiced.length, userVoiced.length);
                let totalError = 0;
                
                for (let i = 0; i < minLen; i++) {
                    const f1Error = Math.abs(nativeVoiced[i].f1 - userVoiced[i].f1) / nativeVoiced[i].f1;
                    const f2Error = Math.abs(nativeVoiced[i].f2 - userVoiced[i].f2) / nativeVoiced[i].f2;
                    const f3Error = Math.abs(nativeVoiced[i].f3 - userVoiced[i].f3) / nativeVoiced[i].f3;
                    totalError += (f1Error + f2Error + f3Error) / 3;
                }
                
                avgError = totalError / minLen;
                score = Math.max(0, 100 * (1 - avgError));
                calculation = `Fallback after DTW error`;
                method = 'Point-by-point (DTW failed)';
            }
            
        } else {
            const minLen = Math.min(nativeVoiced.length, userVoiced.length);
            let totalError = 0;
            let validFrames = 0;
            
            console.log(`Using point-by-point for formant comparison (${minLen} frames)`);
            
            for (let i = 0; i < minLen; i++) {
                if (!nativeVoiced[i] || !userVoiced[i]) {
                    console.error(`Skipping frame ${i}: undefined`);
                    continue;
                }
                
                const f1Error = Math.abs(nativeVoiced[i].f1 - userVoiced[i].f1) / nativeVoiced[i].f1;
                const f2Error = Math.abs(nativeVoiced[i].f2 - userVoiced[i].f2) / nativeVoiced[i].f2;
                const f3Error = Math.abs(nativeVoiced[i].f3 - userVoiced[i].f3) / nativeVoiced[i].f3;
                
                const frameAvgError = (f1Error + f2Error + f3Error) / 3;
                totalError += frameAvgError;
                validFrames++;
                
                if (frameErrors.length < 5) {
                    frameErrors.push({
                        frameIndex: i,
                        time: nativeVoiced[i].time.toFixed(3),
                        native: {
                            f1: Math.round(nativeVoiced[i].f1),
                            f2: Math.round(nativeVoiced[i].f2),
                            f3: Math.round(nativeVoiced[i].f3)
                        },
                        user: {
                            f1: Math.round(userVoiced[i].f1),
                            f2: Math.round(userVoiced[i].f2),
                            f3: Math.round(userVoiced[i].f3)
                        },
                        errors: {
                            f1: (f1Error * 100).toFixed(1) + '%',
                            f2: (f2Error * 100).toFixed(1) + '%',
                            f3: (f3Error * 100).toFixed(1) + '%',
                            avg: (frameAvgError * 100).toFixed(1) + '%'
                        }
                    });
                }
            }
            
            avgError = totalError / validFrames;
            score = Math.max(0, 100 * (1 - avgError));
            calculation = `Score = 100 × (1 - ${avgError.toFixed(4)}) = ${score.toFixed(1)}`;
            method = 'Point-by-point';
        }
        
        console.log(`Formant score (${method}): ${score.toFixed(1)}%`);
        
        return {
            score: score,
            details: {
                validFrames: this.useDTW ? nativeVoiced.length : Math.min(nativeVoiced.length, userVoiced.length),
                totalFrames: Math.min(native.length, user.length),
                avgError: (avgError * 100).toFixed(2) + '%',
                sampleErrors: frameErrors,
                calculation: calculation,
                method: method
            }
        };
    }
    
    /**
     * Compare pitch contours
     * @param {Object[]} native - Native pitch track
     * @param {Object[]} user - User pitch track
     * @returns {Object} Score and details
     */
    comparePitchDetailed(native, user) {
        const nativePitches = native.filter(p => p.pitch > 0).map(p => p.pitch);
        const userPitches = user.filter(p => p.pitch > 0).map(p => p.pitch);
        
        if (nativePitches.length === 0 || userPitches.length === 0) {
            return {
                score: 50,
                details: {
                    reason: 'Insufficient voiced frames',
                    nativeVoiced: nativePitches.length,
                    userVoiced: userPitches.length,
                    method: this.useDTW ? 'DTW (no data)' : 'Point-by-point (no data)'
                }
            };
        }
        
        let score, calculation, method;
        
        if (this.useDTW) {
            const nativeMean = nativePitches.reduce((a, b) => a + b, 0) / nativePitches.length;
            const userMean = userPitches.reduce((a, b) => a + b, 0) / userPitches.length;
            
            const nativeNorm = nativePitches.map(p => p / nativeMean);
            const userNorm = userPitches.map(p => p / userMean);
            
            const dtwResult = DTW.compute1D(nativeNorm, userNorm, 20);
            
            // More lenient scoring: use factor of 2 instead of 3
            score = Math.max(0, 100 * (1 - dtwResult.normalizedDistance * 2));
            calculation = `DTW distance: ${dtwResult.normalizedDistance.toFixed(4)}`;
            method = 'DTW (tempo-invariant)';
            
        } else {
            const nativeMean = nativePitches.reduce((a, b) => a + b, 0) / nativePitches.length;
            const userMean = userPitches.reduce((a, b) => a + b, 0) / userPitches.length;
            
            const nativeNorm = native.map(p => p.pitch > 0 ? p.pitch / nativeMean : 0);
            const userNorm = user.map(p => p.pitch > 0 ? p.pitch / userMean : 0);
            
            const minLen = Math.min(nativeNorm.length, userNorm.length);
            let correlation = 0;
            
            for (let i = 0; i < minLen; i++) {
                if (nativeNorm[i] > 0 && userNorm[i] > 0) {
                    const diff = Math.abs(nativeNorm[i] - userNorm[i]) / nativeNorm[i];
                    correlation += 1 - Math.min(diff, 1);
                }
            }
            
            score = Math.max(0, 100 * correlation / minLen);
            calculation = `Correlation = ${score.toFixed(1)}%`;
            method = 'Point-by-point';
        }
        
        const nativeMean = nativePitches.reduce((a, b) => a + b, 0) / nativePitches.length;
        const userMean = userPitches.reduce((a, b) => a + b, 0) / userPitches.length;
        
        return {
            score: score,
            details: {
                nativeMean: nativeMean.toFixed(1) + ' Hz',
                userMean: userMean.toFixed(1) + ' Hz',
                pitchDifference: ((userMean - nativeMean) / nativeMean * 100).toFixed(1) + '%',
                validPoints: nativePitches.length,
                totalPoints: Math.max(native.length, user.length),
                calculation: calculation,
                method: method
            }
        };
    }
    
    /**
     * Compare durations
     * @param {AudioBuffer} native - Native audio buffer
     * @param {AudioBuffer} user - User audio buffer
     * @returns {Object} Score and details
     */
    compareDurationDetailed(native, user) {
        // Use deviation-based scoring - penalizes proportionally to deviation from 1.0
        const ratio = user.duration / native.duration;
        const deviation = Math.abs(1 - ratio);
        const score = Math.max(0, 100 - deviation * 100);
        
        return {
            score: score,
            details: {
                nativeDuration: native.duration.toFixed(3) + 's',
                userDuration: user.duration.toFixed(3) + 's',
                difference: Math.abs(native.duration - user.duration).toFixed(3) + 's',
                ratio: ratio.toFixed(3),
                deviation: (deviation * 100).toFixed(1) + '%',
                calculation: `Score = 100 - |1 - ${ratio.toFixed(3)}| × 100 = ${score.toFixed(1)}%`
            }
        };
    }
    
    /**
     * Compare envelope (loudness contour) correlation
     * @param {number[]} nativeEnvelope - Native envelope
     * @param {number[]} userEnvelope - User envelope
     * @returns {Object} Score and details
     */
    compareEnvelope(nativeEnvelope, userEnvelope) {
        if (!nativeEnvelope || !userEnvelope || nativeEnvelope.length < 5 || userEnvelope.length < 5) {
            return {
                score: 50,
                details: { reason: 'Insufficient envelope data' }
            };
        }
        
        // Resample to common length and normalize
        const targetLen = 50;
        const nativeResampled = resampleArray(nativeEnvelope, targetLen);
        const userResampled = resampleArray(userEnvelope, targetLen);
        
        // Normalize to 0-1 range
        const nativeMax = Math.max(...nativeResampled) || 1;
        const userMax = Math.max(...userResampled) || 1;
        const nativeNorm = nativeResampled.map(v => v / nativeMax);
        const userNorm = userResampled.map(v => v / userMax);
        
        // Use Pearson correlation
        const correlation = pearsonCorrelation(nativeNorm, userNorm);
        const score = Math.max(0, correlation * 100);
        
        return {
            score: score,
            details: {
                correlation: correlation.toFixed(4),
                nativeLength: nativeEnvelope.length,
                userLength: userEnvelope.length,
                calculation: `Score = Pearson correlation × 100 = ${score.toFixed(1)}%`
            }
        };
    }
    
    /**
     * Compare spectral content (waveform correlation)
     * @param {AudioBuffer} native - Native audio buffer
     * @param {AudioBuffer} user - User audio buffer
     * @returns {Object} Score and details
     */
    compareSpectralDetailed(native, user) {
        const nativeData = native.getChannelData(0);
        const userData = user.getChannelData(0);
        
        const minLen = Math.min(nativeData.length, userData.length);
        const nativeResampled = this.resample(nativeData, minLen);
        const userResampled = this.resample(userData, minLen);
        
        let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
        
        for (let i = 0; i < minLen; i++) {
            sumXY += nativeResampled[i] * userResampled[i];
            sumX += nativeResampled[i];
            sumY += userResampled[i];
            sumX2 += nativeResampled[i] ** 2;
            sumY2 += userResampled[i] ** 2;
        }
        
        const num = sumXY - (sumX * sumY / minLen);
        const den = Math.sqrt((sumX2 - sumX ** 2 / minLen) * (sumY2 - sumY ** 2 / minLen));
        
        if (den === 0) {
            return {
                score: 0,
                details: { reason: 'Division by zero' }
            };
        }
        
        const corr = num / den;
        const score = Math.max(0, (corr + 1) * 50);
        
        return {
            score: score,
            details: {
                samplePoints: minLen,
                pearsonCorrelation: corr.toFixed(4),
                calculation: `Score = (r + 1) × 50 = ${score.toFixed(1)}%`
            }
        };
    }
    
    /**
     * Compare voice quality (ZCR and spectral tilt)
     * @param {Object[]} nativeZCR - Native ZCR track
     * @param {Object[]} userZCR - User ZCR track
     * @param {Object[]} nativeTilt - Native spectral tilt track
     * @param {Object[]} userTilt - User spectral tilt track
     * @returns {Object} Score and details
     */
    compareQualityDetailed(nativeZCR, userZCR, nativeTilt, userTilt) {
        let zcrScore, tiltScore, method;
        
        if (this.useDTW) {
            const nativeZCRVals = nativeZCR.map(z => z.zcr);
            const userZCRVals = userZCR.map(z => z.zcr);
            const nativeTiltVals = nativeTilt.map(t => t.tilt);
            const userTiltVals = userTilt.map(t => t.tilt);
            
            const zcrDTW = DTW.compute1D(nativeZCRVals, userZCRVals, 20);
            zcrScore = Math.max(0, 100 * (1 - zcrDTW.normalizedDistance * 20));
            
            const tiltDTW = DTW.compute1D(nativeTiltVals, userTiltVals, 20);
            tiltScore = Math.max(0, 100 * (1 - tiltDTW.normalizedDistance * 10));
            
            method = 'DTW (tempo-invariant)';
        } else {
            zcrScore = this.compareTrack(
                nativeZCR.map(z => z.zcr),
                userZCR.map(z => z.zcr)
            );
            
            tiltScore = this.compareTrack(
                nativeTilt.map(t => t.tilt),
                userTilt.map(t => t.tilt)
            );
            
            method = 'Point-by-point';
        }
        
        const score = (zcrScore + tiltScore) / 2;
        
        return {
            score: score,
            details: {
                zcrScore: zcrScore.toFixed(1) + '%',
                tiltScore: tiltScore.toFixed(1) + '%',
                avgNativeZCR: (nativeZCR.reduce((a,b) => a + b.zcr, 0) / nativeZCR.length).toFixed(4),
                avgUserZCR: (userZCR.reduce((a,b) => a + b.zcr, 0) / userZCR.length).toFixed(4),
                calculation: `Average = ${score.toFixed(1)}%`,
                method: method
            }
        };
    }
    
    /**
     * Compare stress patterns (syllable rhythm)
     * @param {Object[]} nativeIntensity - Native intensity track
     * @param {Object[]} userIntensity - User intensity track
     * @returns {Object} Score with both pattern and position scores
     */
    compareStressPattern(nativeIntensity, userIntensity) {
        // Find intensity peaks (syllable stress)
        const findPeaks = (track, minHeight = 0.3) => {
            const peaks = [];
            const values = track.map(p => p.intensity);
            if (values.length < 10) return peaks;
            
            const maxVal = Math.max(...values);
            if (maxVal === 0) return peaks;

            for (let i = 5; i < values.length - 5; i++) {
                if (values[i] > maxVal * minHeight &&
                    values[i] > values[i-1] && values[i] > values[i+1] &&
                    values[i] > values[i-2] && values[i] > values[i+2] &&
                    values[i] > values[i-3] && values[i] > values[i+3]) {
                    peaks.push({
                        time: track[i].time,
                        height: values[i] / maxVal,
                        index: i
                    });
                }
            }
            return peaks;
        };

        const nativePeaks = findPeaks(nativeIntensity, 0.35);
        const userPeaks = findPeaks(userIntensity, 0.35);

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
                    if (heightDiff < 0.4) matched++;
                    break;
                }
            }
        }

        // Penalize for wrong number of syllables
        const countPenalty = Math.abs(nativePeaks.length - userPeaks.length) * 10;
        const score = Math.max(0, Math.min(100, (matched / nativePeaks.length) * 100 - countPenalty));
        
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
     * Generic track comparison helper
     * @param {number[]} track1 - First track
     * @param {number[]} track2 - Second track
     * @returns {number} Similarity score (0-100)
     */
    compareTrack(track1, track2) {
        const minLen = Math.min(track1.length, track2.length);
        let sum = 0;
        
        for (let i = 0; i < minLen; i++) {
            const diff = Math.abs(track1[i] - track2[i]);
            sum += 1 / (1 + diff);
        }
        
        return (sum / minLen) * 100;
    }
    
    /**
     * Resample Float32Array to target length
     * @param {Float32Array} data - Source data
     * @param {number} targetLen - Target length
     * @returns {Float32Array} Resampled data
     */
    resample(data, targetLen) {
        const result = new Float32Array(targetLen);
        const ratio = data.length / targetLen;
        
        for (let i = 0; i < targetLen; i++) {
            const srcIdx = i * ratio;
            const idx1 = Math.floor(srcIdx);
            const idx2 = Math.min(idx1 + 1, data.length - 1);
            const frac = srcIdx - idx1;
            
            result[i] = data[idx1] * (1 - frac) + data[idx2] * frac;
        }
        
        return result;
    }
    
    /**
     * Generate user-friendly feedback based on scores
     * @param {number} score - Overall score
     * @param {Object} breakdown - Score breakdown by category
     * @returns {string} Feedback message
     */
    generateFeedback(score, breakdown) {
        const issues = [];
        
        if (breakdown.pitch < 70) {
            issues.push("Pay attention to pitch patterns and intonation");
        }
        if (breakdown.mfcc < 70) {
            issues.push("Focus on vowel and consonant quality");
        }
        if (breakdown.envelope < 70) {
            issues.push("Practice the loudness contour - your amplitude pattern differs");
        }
        if (breakdown.duration < 70) {
            if (breakdown.duration < 50) {
                issues.push("Significant timing difference - match the rhythm and pace");
            } else {
                issues.push("Adjust your speaking speed to match the native timing");
            }
        }
        if (breakdown.stressPosition < 70) {
            issues.push("Move the main stress emphasis to the correct position in the word");
        }
        
        if (score >= 85) {
            return "Excellent pronunciation! 🎉 " + (issues.length > 0 ? issues.join('. ') + '.' : '');
        } else if (score >= 70) {
            return "Great job! 👍 " + issues.join('. ') + '.';
        } else if (score >= 55) {
            return "Good effort! 📚 " + issues.join('. ') + '.';
        } else {
            return "Keep practicing! 🎯 " + issues.join('. ') + '.';
        }
    }
}

// Export factory function for convenience
export function createComparator(config) {
    return new PronunciationComparator(config);
}
