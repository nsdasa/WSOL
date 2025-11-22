/**
 * INTERNAL ACOUSTIC FEATURES MODULE
 * 
 * Advanced signal processing for extracting internal acoustic features:
 * - Linear Predictive Coding (LPC) for formant extraction
 * - Polynomial root-finding for mathematically correct formant detection
 * - Zero-Crossing Rate (ZCR) for voice/unvoiced discrimination
 * - Spectral Tilt for voice quality assessment
 * 
 * This module implements the mathematically rigorous methods used by tools
 * like Praat for formant analysis, including complex polynomial root-finding
 * algorithms (Durand-Kerner and Laguerre's method).
 * 
 * @module internal
 */

/**
 * ImprovedLPC - Advanced Linear Predictive Coding for Formant Extraction
 * 
 * Implements the full LPC pipeline with polynomial root-finding:
 * 1. Autocorrelation of windowed signal
 * 2. Levinson-Durbin recursion for LPC coefficients
 * 3. LPC spectrum computation OR polynomial root-finding
 * 4. Formant extraction from spectral peaks or polynomial roots
 * 5. Formant tracking with smoothing and validation
 */
export class ImprovedLPC {
    /**
     * Compute LPC power spectrum from coefficients
     * Uses the formula: S(ω) = 1 / |A(e^(jω))|²
     * 
     * @param {number[]} lpcCoeffs - LPC coefficients [1, a1, a2, ..., an]
     * @param {number} numPoints - Number of frequency points
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {number[]} Power spectrum
     */
    static computeLPCSpectrum(lpcCoeffs, numPoints, sampleRate) {
        const spectrum = new Array(numPoints);
        
        for (let k = 0; k < numPoints; k++) {
            const freq = (k * sampleRate) / (2 * numPoints);
            const omega = (2 * Math.PI * freq) / sampleRate;
            
            let real = 1.0;
            let imag = 0.0;
            
            for (let i = 1; i < lpcCoeffs.length; i++) {
                const angle = omega * i;
                real += lpcCoeffs[i] * Math.cos(angle);
                imag += lpcCoeffs[i] * Math.sin(angle);
            }
            
            // Use POWER spectrum (magnitude squared) for better peak prominence
            const magSquared = real * real + imag * imag + 1e-10;
            spectrum[k] = 1.0 / magSquared;
        }
        
        return spectrum;
    }
    
    /**
     * Find spectral peaks in LPC spectrum for formant candidates
     * Uses adaptive thresholding with multiple passes
     * 
     * @param {number[]} spectrum - LPC power spectrum
     * @param {number} sampleRate - Sample rate in Hz
     * @param {number} minFreq - Minimum formant frequency (default: 90 Hz)
     * @param {number} maxFreq - Maximum formant frequency (default: 5000 Hz)
     * @param {number} numFormants - Number of formants to extract (default: 4)
     * @returns {Object[]} Array of peak objects with {freq, magnitude, bandwidth}
     */
    static findSpectralPeaks(spectrum, sampleRate, minFreq = 90, maxFreq = 5000, numFormants = 4) {
        const numPoints = spectrum.length;
        const freqPerBin = sampleRate / (2 * numPoints);
        const minBin = Math.ceil(minFreq / freqPerBin);
        const maxBin = Math.floor(maxFreq / freqPerBin);

        // Find global max for dynamic threshold
        let globalMax = 0;
        for (let i = minBin; i < maxBin; i++) {
            if (spectrum[i] > globalMax) globalMax = spectrum[i];
        }

        const peaks = [];
        const visited = new Array(spectrum.length).fill(false);

        // Multiple passes with decreasing threshold - start MUCH lower
        for (let threshold of [0.05, 0.02, 0.01, 0.005, 0.001]) {
            if (peaks.length >= numFormants * 3) break;

            for (let i = minBin + 1; i < maxBin - 1; i++) {
                if (visited[i] || spectrum[i] < globalMax * threshold) continue;

                // Simple local maximum check - just ±1 bin
                if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {

                    // Log-domain parabolic interpolation for sub-bin accuracy
                    const y1 = Math.log(spectrum[i-1] + 1e-10);
                    const y2 = Math.log(spectrum[i] + 1e-10);
                    const y3 = Math.log(spectrum[i+1] + 1e-10);

                    let offset = 0;
                    const denom = y1 - 2*y2 + y3;
                    if (Math.abs(denom) > 1e-10) {
                        offset = 0.5 * (y1 - y3) / denom;
                        offset = Math.max(-0.5, Math.min(0.5, offset)); // Clamp
                    }
                    const refinedFreq = (i + offset) * freqPerBin;

                    peaks.push({
                        freq: refinedFreq,
                        magnitude: spectrum[i],
                        bandwidth: this.estimateBandwidth(spectrum, i, freqPerBin)
                    });

                    // Mark nearby bins as visited - smaller window
                    for (let j = i - 3; j <= i + 3; j++) {
                        if (j >= 0 && j < spectrum.length) visited[j] = true;
                    }
                }
            }
        }

        // If still not enough peaks, just take the strongest bins
        if (peaks.length < 3) {
            const magnitudes = [];
            for (let i = minBin; i < maxBin; i++) {
                if (!visited[i]) {
                    magnitudes.push({ 
                        freq: i * freqPerBin, 
                        magnitude: spectrum[i],
                        bandwidth: 100
                    });
                }
            }
            magnitudes.sort((a, b) => b.magnitude - a.magnitude);
            
            // Add top bins as peaks
            for (const m of magnitudes.slice(0, 10)) {
                if (peaks.length >= numFormants * 3) break;
                // Check spacing from existing peaks
                let tooClose = false;
                for (const p of peaks) {
                    if (Math.abs(m.freq - p.freq) < 100) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) peaks.push(m);
            }
        }

        // Sort by magnitude (strongest peaks first)
        peaks.sort((a, b) => b.magnitude - a.magnitude);

        // Select best candidates with minimum spacing
        const selected = [];
        const minSpacing = 120; // Hz minimum between formants - reduced from 150

        for (const peak of peaks) {
            if (selected.length >= numFormants * 2) break;
            
            // Check spacing from all already-selected peaks
            let tooClose = false;
            for (const sel of selected) {
                if (Math.abs(peak.freq - sel.freq) < minSpacing) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                selected.push(peak);
            }
        }

        // Sort selected peaks by frequency for formant assignment
        selected.sort((a, b) => a.freq - b.freq);

        return selected;
    }
    
    /**
     * Estimate formant bandwidth using half-power point method
     * 
     * @param {number[]} spectrum - LPC spectrum
     * @param {number} peakIndex - Index of peak in spectrum
     * @param {number} freqPerBin - Frequency resolution (Hz/bin)
     * @returns {number} Bandwidth in Hz
     */
    static estimateBandwidth(spectrum, peakIndex, freqPerBin) {
        if (peakIndex <= 0 || peakIndex >= spectrum.length - 1) {
            return 100;
        }
        
        const peakMag = spectrum[peakIndex];
        const halfPower = peakMag / Math.sqrt(2);
        
        let leftIdx = peakIndex;
        while (leftIdx > 0 && spectrum[leftIdx] > halfPower) {
            leftIdx--;
        }
        
        let rightIdx = peakIndex;
        while (rightIdx < spectrum.length - 1 && spectrum[rightIdx] > halfPower) {
            rightIdx++;
        }
        
        const bandwidth = Math.max(50, (rightIdx - leftIdx) * freqPerBin);
        return bandwidth;
    }
    
    /**
     * Compute autocorrelation function
     * Uses unbiased estimate (divide by n-lag instead of n)
     * 
     * @param {number[]} signal - Input signal
     * @param {number} maxLag - Maximum lag to compute
     * @returns {number[]} Autocorrelation values for lags 0 to maxLag
     */
    static autocorrelation(signal, maxLag) {
        const result = new Array(maxLag + 1).fill(0);
        const n = signal.length;
        
        for (let lag = 0; lag <= maxLag; lag++) {
            let sum = 0;
            for (let i = 0; i < n - lag; i++) {
                sum += signal[i] * signal[i + lag];
            }
            result[lag] = sum / (n - lag);
        }
        
        return result;
    }
    
    /**
     * Levinson-Durbin recursion for LPC coefficient estimation
     * Solves the Yule-Walker equations efficiently in O(p²) time
     * 
     * @param {number[]} autocorr - Autocorrelation sequence
     * @param {number} order - LPC order (number of coefficients)
     * @returns {Object} {lpc, error, reflectionCoeffs}
     */
    static levinsonDurbin(autocorr, order) {
        const lpc = new Array(order + 1).fill(0);
        lpc[0] = 1;
        
        const error = new Array(order + 1).fill(0);
        error[0] = autocorr[0];
        
        const k = new Array(order).fill(0);
        
        for (let i = 1; i <= order; i++) {
            let lambda = autocorr[i];
            
            for (let j = 1; j < i; j++) {
                lambda -= lpc[j] * autocorr[i - j];
            }
            
            lambda /= error[i - 1];
            k[i - 1] = -lambda;
            
            const tmpLPC = lpc.slice();
            lpc[i] = -lambda;
            
            for (let j = 1; j < i; j++) {
                lpc[j] = tmpLPC[j] - lambda * tmpLPC[i - j];
            }
            
            error[i] = error[i - 1] * (1 - lambda * lambda);
        }
        
        return { lpc, error: error[order], reflectionCoeffs: k };
    }
    
    // ===============================================
    // POLYNOMIAL ROOT-FINDING FOR FORMANTS
    // This is the mathematically correct method used by Praat
    // ===============================================
    
    /**
     * Complex number multiplication
     */
    static complexMultiply(a, b) {
        return {
            real: a.real * b.real - a.imag * b.imag,
            imag: a.real * b.imag + a.imag * b.real
        };
    }
    
    /**
     * Complex number division
     */
    static complexDivide(a, b) {
        const denom = b.real * b.real + b.imag * b.imag;
        if (denom < 1e-20) return { real: 0, imag: 0 };
        return {
            real: (a.real * b.real + a.imag * b.imag) / denom,
            imag: (a.imag * b.real - a.real * b.imag) / denom
        };
    }
    
    /**
     * Complex number subtraction
     */
    static complexSubtract(a, b) {
        return {
            real: a.real - b.real,
            imag: a.imag - b.imag
        };
    }
    
    /**
     * Complex number absolute value (magnitude)
     */
    static complexAbs(z) {
        return Math.sqrt(z.real * z.real + z.imag * z.imag);
    }
    
    /**
     * Complex number angle (phase)
     */
    static complexAngle(z) {
        return Math.atan2(z.imag, z.real);
    }
    
    /**
     * Evaluate polynomial at complex point z
     * coeffs[0] is the highest degree term (z^n), coeffs[n] is constant
     */
    static evaluatePolynomial(coeffs, z) {
        let result = { real: coeffs[0], imag: 0 };
        for (let i = 1; i < coeffs.length; i++) {
            result = this.complexMultiply(result, z);
            result.real += coeffs[i];
        }
        return result;
    }
    
    /**
     * Durand-Kerner method for finding polynomial roots
     * This iteratively finds all roots simultaneously
     * 
     * @param {number[]} coeffs - Polynomial coefficients [a0, a1, ..., an]
     * @param {number} maxIterations - Maximum iterations (default: 200)
     * @param {number} tolerance - Convergence tolerance (default: 1e-10)
     * @returns {Object[]} Array of complex roots {real, imag}
     */
    static findPolynomialRoots(coeffs, maxIterations = 200, tolerance = 1e-10) {
        const n = coeffs.length - 1; // Degree
        if (n <= 0) return [];
        
        // Normalize so leading coefficient is 1
        const a0 = coeffs[0];
        if (Math.abs(a0) < 1e-15) return [];
        const normalizedCoeffs = coeffs.map(c => c / a0);
        
        // Initial guesses: use Aberth-style initialization
        // Estimate root radius from coefficients
        let maxCoeff = 0;
        for (let i = 1; i < normalizedCoeffs.length; i++) {
            maxCoeff = Math.max(maxCoeff, Math.abs(normalizedCoeffs[i]));
        }
        const radius = 1 + maxCoeff; // Upper bound on root magnitude
        
        const roots = [];
        for (let i = 0; i < n; i++) {
            // Spread initial guesses on circle, with slight variations
            const angle = (2 * Math.PI * i) / n + 0.3;
            const r = radius * (0.4 + 0.2 * (i % 3)); // Vary radius
            roots.push({
                real: r * Math.cos(angle),
                imag: r * Math.sin(angle)
            });
        }
        
        // Iterate Durand-Kerner with Aberth correction
        for (let iter = 0; iter < maxIterations; iter++) {
            let maxDelta = 0;
            
            for (let i = 0; i < n; i++) {
                // Evaluate polynomial at root[i]
                const pz = this.evaluatePolynomial(normalizedCoeffs, roots[i]);
                
                // Compute product of (root[i] - root[j]) for j != i
                let product = { real: 1, imag: 0 };
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        const diff = this.complexSubtract(roots[i], roots[j]);
                        // Avoid division by zero
                        if (this.complexAbs(diff) < 1e-12) {
                            diff.real += 1e-8;
                            diff.imag += 1e-8;
                        }
                        product = this.complexMultiply(product, diff);
                    }
                }
                
                // Avoid division by zero
                if (this.complexAbs(product) < 1e-15) {
                    continue;
                }
                
                // Update: root[i] = root[i] - p(root[i]) / product
                const delta = this.complexDivide(pz, product);
                roots[i] = this.complexSubtract(roots[i], delta);
                
                maxDelta = Math.max(maxDelta, this.complexAbs(delta));
            }
            
            if (maxDelta < tolerance) {
                break;
            }
        }
        
        return roots;
    }
    
    /**
     * Laguerre's method for finding one root at a time
     * More robust for ill-conditioned polynomials
     * 
     * @param {number[]} coeffs - Polynomial coefficients
     * @param {Object} initialGuess - Complex initial guess {real, imag}
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Complex root {real, imag}
     */
    static laguerreRoot(coeffs, initialGuess, maxIter = 50) {
        const n = coeffs.length - 1;
        let x = { ...initialGuess };
        
        for (let iter = 0; iter < maxIter; iter++) {
            const p = this.evaluatePolynomial(coeffs, x);
            if (this.complexAbs(p) < 1e-14) break;
            
            // Compute p'(x) and p''(x)
            let dp = { real: 0, imag: 0 };
            let ddp = { real: 0, imag: 0 };
            
            for (let i = 0; i < n; i++) {
                const coeff = coeffs[i] * (n - i);
                const power = n - i - 1;
                if (power >= 0) {
                    let term = { real: coeff, imag: 0 };
                    for (let j = 0; j < power; j++) {
                        term = this.complexMultiply(term, x);
                    }
                    dp.real += term.real;
                    dp.imag += term.imag;
                }
            }
            
            for (let i = 0; i < n - 1; i++) {
                const coeff = coeffs[i] * (n - i) * (n - i - 1);
                const power = n - i - 2;
                if (power >= 0) {
                    let term = { real: coeff, imag: 0 };
                    for (let j = 0; j < power; j++) {
                        term = this.complexMultiply(term, x);
                    }
                    ddp.real += term.real;
                    ddp.imag += term.imag;
                }
            }
            
            // G = p'/p, H = G^2 - p''/p
            const G = this.complexDivide(dp, p);
            const G2 = this.complexMultiply(G, G);
            const H = this.complexSubtract(G2, this.complexDivide(ddp, p));
            
            // Laguerre's formula
            const nC = { real: n, imag: 0 };
            const n1 = { real: n - 1, imag: 0 };
            const nH = this.complexMultiply(nC, H);
            const G2term = this.complexMultiply(G, G);
            const disc = this.complexSubtract(this.complexMultiply(n1, nH), this.complexMultiply(n1, G2term));
            
            // sqrt of discriminant (simplified)
            const discMag = this.complexAbs(disc);
            const discAngle = this.complexAngle(disc);
            const sqrtDisc = {
                real: Math.sqrt(discMag) * Math.cos(discAngle / 2),
                imag: Math.sqrt(discMag) * Math.sin(discAngle / 2)
            };
            
            // Choose sign to maximize denominator
            const denom1 = { real: G.real + sqrtDisc.real, imag: G.imag + sqrtDisc.imag };
            const denom2 = { real: G.real - sqrtDisc.real, imag: G.imag - sqrtDisc.imag };
            const denom = this.complexAbs(denom1) > this.complexAbs(denom2) ? denom1 : denom2;
            
            if (this.complexAbs(denom) < 1e-15) break;
            
            const a = this.complexDivide(nC, denom);
            x = this.complexSubtract(x, a);
            
            if (this.complexAbs(a) < 1e-10) break;
        }
        
        return x;
    }
    
    /**
     * Find all roots using Laguerre + deflation
     * 
     * @param {number[]} coeffs - Polynomial coefficients
     * @returns {Object[]} Array of complex roots
     */
    static findRootsLaguerre(coeffs) {
        const n = coeffs.length - 1;
        if (n <= 0) return [];
        
        const roots = [];
        let currentCoeffs = coeffs.slice();
        
        for (let i = 0; i < n; i++) {
            // Initial guess
            const guess = { real: 0.5, imag: 0.5 };
            const root = this.laguerreRoot(currentCoeffs, guess);
            roots.push(root);
            
            // Deflate polynomial by dividing out (x - root)
            const newCoeffs = [currentCoeffs[0]];
            for (let j = 1; j < currentCoeffs.length; j++) {
                const prev = newCoeffs[j - 1];
                const term = this.complexMultiply(prev, root);
                newCoeffs.push(currentCoeffs[j] + term.real); // Approximate for real coeffs
            }
            currentCoeffs = newCoeffs.slice(0, -1);
        }
        
        // Polish roots with original polynomial
        for (let i = 0; i < roots.length; i++) {
            roots[i] = this.laguerreRoot(coeffs, roots[i], 20);
        }
        
        return roots;
    }
    
    /**
     * Extract formants from LPC polynomial roots
     * Converts polynomial roots in z-domain to formant frequencies and bandwidths
     * 
     * @param {number[]} lpcCoeffs - LPC coefficients [1, a1, a2, ..., an]
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {Object[]} Formant candidates with {freq, bandwidth, magnitude}
     */
    static extractFormantsFromRoots(lpcCoeffs, sampleRate) {
        // LPC polynomial is A(z) = 1 + a1*z^-1 + a2*z^-2 + ...
        // We want roots of z^n * A(z) = z^n + a1*z^(n-1) + ... + an
        // So we reverse and use the coefficients directly
        const n = lpcCoeffs.length - 1;
        
        // Build polynomial: z^n + a1*z^(n-1) + ... + an
        // coeffs[0] = 1 (z^n), coeffs[1] = a1, ..., coeffs[n] = an
        const polyCoeffs = lpcCoeffs.slice(); // [1, a1, a2, ..., an]
        
        // Try Durand-Kerner first
        let roots = this.findPolynomialRoots(polyCoeffs);
        
        // If that didn't work well, try Laguerre
        if (roots.length < n / 2) {
            roots = this.findRootsLaguerre(polyCoeffs);
        }
        
        // Extract formant candidates from roots
        const formantCandidates = [];
        let debugRoots = [];
        let rejectedCount = { tooSmall: 0, tooLarge: 0, negative: 0, freqRange: 0, bwRange: 0 };
        
        for (const root of roots) {
            const r = this.complexAbs(root);
            const theta = this.complexAngle(root);
            const frequency = (Math.abs(theta) * sampleRate) / (2 * Math.PI);
            const bandwidth = r > 0.01 ? (-Math.log(r) * sampleRate) / Math.PI : 10000;
            
            debugRoots.push({r: r.toFixed(3), theta: theta.toFixed(3), freq: Math.round(frequency), bw: Math.round(bandwidth)});
            
            // Track why roots are rejected
            if (r <= 0.3) { rejectedCount.tooSmall++; continue; }
            if (r >= 0.995) { rejectedCount.tooLarge++; continue; }
            if (theta <= 0.01) { rejectedCount.negative++; continue; }
            if (frequency < 90 || frequency > 5500) { rejectedCount.freqRange++; continue; }
            if (bandwidth >= 1500) { rejectedCount.bwRange++; continue; }
            
            formantCandidates.push({
                freq: frequency,
                bandwidth: bandwidth,
                magnitude: r
            });
        }
        
        // Sort by frequency
        formantCandidates.sort((a, b) => a.freq - b.freq);
        
        return formantCandidates;
    }
    
    /**
     * Main formant extraction method
     * Processes audio buffer frame-by-frame to extract formant tracks
     * 
     * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
     * @param {Object} options - Extraction options
     * @returns {Object[]} Formant track with time, f1, f2, f3, voiced status
     */
    static extractFormants(audioBuffer, options = {}) {
        const {
            frameSize = 2048,
            hopSize = 512,
            // LPC order: 12-14 works well for formant detection
            // Too high causes over-smoothing, too low misses formants
            lpcOrder = 14,
            preEmphasisAlpha = 0.97
        } = options;
        
        const data = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const formantTracks = [];
        
        let voicedCount = 0;
        let unvoicedCount = 0;
        
        const detailedFrames = [];
        
        // Compute adaptive energy threshold based on signal statistics
        let maxEnergy = 0;
        let energySum = 0;
        let energyCount = 0;
        
        for (let i = 0; i < data.length - frameSize; i += hopSize * 4) { // Sample every 4th frame for speed
            const frame = Array.from(data.slice(i, i + frameSize));
            const windowed = this.applyHammingWindow(frame);
            const energy = this.computeEnergy(windowed);
            if (energy > maxEnergy) maxEnergy = energy;
            energySum += energy;
            energyCount++;
        }
        
        const avgEnergy = energySum / energyCount;
        // Use 10% of average energy as threshold, with a minimum floor
        const energyThreshold = Math.max(avgEnergy * 0.1, 0.001);
        
        console.log(`Extracting formants: ${data.length} samples, ${sampleRate}Hz`);
        console.log(`Method: LPC spectrum peak-picking (improved)`);
        console.log(`Adaptive energy threshold: ${energyThreshold.toFixed(6)} (avg: ${avgEnergy.toFixed(6)}, max: ${maxEnergy.toFixed(6)})`);
        
        for (let i = 0; i < data.length - frameSize; i += hopSize) {
            const frame = Array.from(data.slice(i, i + frameSize));
            
            const windowed = this.applyHammingWindow(frame);
            
            // Compute energy BEFORE pre-emphasis (pre-emphasis reduces voiced speech energy)
            const energy = this.computeEnergy(windowed);
            const zcr = this.computeZCR(windowed);
            
            const emphasized = this.preEmphasis(windowed, preEmphasisAlpha);
            
            // Use adaptive energy threshold instead of fixed value
            const isVoiced = energy > energyThreshold && zcr < 0.5;
            
            const frameData = {
                frameIndex: Math.floor(i / hopSize),
                time: i / sampleRate,
                energy: energy,
                zcr: zcr,
                isVoiced: isVoiced
            };
            
            if (!isVoiced) {
                unvoicedCount++;
                formantTracks.push({
                    time: i / sampleRate,
                    f1: formantTracks.length > 0 ? formantTracks[formantTracks.length - 1].f1 : 500,
                    f2: formantTracks.length > 0 ? formantTracks[formantTracks.length - 1].f2 : 1500,
                    f3: formantTracks.length > 0 ? formantTracks[formantTracks.length - 1].f3 : 2500,
                    voiced: false
                });
                
                frameData.formants = null;
                frameData.reason = 'unvoiced';
                detailedFrames.push(frameData);
                continue;
            }
            
            voicedCount++;
            
            const autocorr = this.autocorrelation(emphasized, lpcOrder);
            const { lpc } = this.levinsonDurbin(autocorr, lpcOrder);
            
            // Validate LPC coefficients
            let lpcValid = true;
            for (let k = 0; k < lpc.length; k++) {
                if (!isFinite(lpc[k]) || Math.abs(lpc[k]) > 100) {
                    lpcValid = false;
                    break;
                }
            }
            
            if (!lpcValid) {
                unvoicedCount++;
                voicedCount--;
                formantTracks.push({
                    time: i / sampleRate,
                    f1: 0, f2: 0, f3: 0,
                    voiced: false
                });
                frameData.formants = null;
                frameData.reason = 'invalid LPC coefficients';
                detailedFrames.push(frameData);
                continue;
            }
            
            // Compute LPC spectrum and find peaks
            const spectrum = this.computeLPCSpectrum(lpc, 1024, sampleRate);
            
            // DEBUG: Log spectrum stats for first voiced frame
            if (voicedCount === 1) {
                let minSpec = Infinity, maxSpec = 0, sumSpec = 0;
                for (let k = 0; k < spectrum.length; k++) {
                    if (spectrum[k] < minSpec) minSpec = spectrum[k];
                    if (spectrum[k] > maxSpec) maxSpec = spectrum[k];
                    sumSpec += spectrum[k];
                }
                console.log(`LPC Spectrum stats - min: ${minSpec.toFixed(4)}, max: ${maxSpec.toFixed(4)}, avg: ${(sumSpec/spectrum.length).toFixed(4)}, range: ${(maxSpec/minSpec).toFixed(1)}x`);
            }
            
            const peaks = this.findSpectralPeaks(spectrum, sampleRate, 90, 5000, 8);
            
            // DEBUG: Log for first voiced frame
            if (voicedCount === 1) {
                console.log(`LPC spectrum peaks found: ${peaks.length}`);
                if (peaks.length > 0) {
                    console.log(`Peak frequencies: ${peaks.map(p => Math.round(p.freq) + 'Hz').join(', ')}`);
                }
            }
            
            // Select formants with proper range constraints
            let f1 = null, f2 = null, f3 = null;
            let hasValidFormants = false;
            
            // Need at least 2 peaks for F1 and F2
            if (peaks.length >= 2) {
                // F1: First peak in typical F1 range (200-1200 Hz)
                // Skip peaks below 200Hz as they're likely F0
                for (const peak of peaks) {
                    if (peak.freq >= 200 && peak.freq <= 1200) {
                        f1 = peak.freq;
                        break;
                    }
                }
                
                // If no peak in strict F1 range, take first peak above 150 Hz
                if (!f1) {
                    for (const peak of peaks) {
                        if (peak.freq >= 150 && peak.freq <= 1500) {
                            f1 = peak.freq;
                            break;
                        }
                    }
                }
                
                if (f1) {
                    // F2: Next peak separated from F1, in F2 range (600-3200 Hz)
                    for (const peak of peaks) {
                        if (peak.freq > f1 + 150 && peak.freq >= 500 && peak.freq <= 3500) {
                            f2 = peak.freq;
                            break;
                        }
                    }
                    
                    // Fallback: any peak sufficiently separated from F1
                    if (!f2) {
                        for (const peak of peaks) {
                            if (peak.freq > f1 + 100) {
                                f2 = peak.freq;
                                break;
                            }
                        }
                    }
                    
                    if (f2) {
                        // F3: Next peak separated from F2
                        for (const peak of peaks) {
                            if (peak.freq > f2 + 150 && peak.freq <= 4500) {
                                f3 = peak.freq;
                                break;
                            }
                        }
                        
                        // If no F3 found, estimate based on F2
                        if (!f3) {
                            f3 = Math.min(f2 * 1.4 + 600, 4000);
                        }
                        
                        // Valid if F2 > F1
                        if (f2 > f1) {
                            hasValidFormants = true;
                        }
                    }
                }
            }
            
            // Last resort: if we have any 2 peaks above 150Hz, use them
            if (!hasValidFormants && peaks.length >= 2) {
                const validPeaks = peaks.filter(p => p.freq >= 150);
                if (validPeaks.length >= 2) {
                    f1 = validPeaks[0].freq;
                    f2 = validPeaks[1].freq;
                    f3 = validPeaks.length >= 3 ? validPeaks[2].freq : f2 * 1.5 + 500;
                    
                    if (f2 > f1) {
                        hasValidFormants = true;
                    }
                }
            }
            
            // If we couldn't find valid formants, mark as unvoiced
            if (!hasValidFormants) {
                unvoicedCount++;
                voicedCount--; // Correct the earlier increment
                formantTracks.push({
                    time: i / sampleRate,
                    f1: 0,
                    f2: 0,
                    f3: 0,
                    voiced: false
                });
                
                frameData.formants = null;
                frameData.reason = 'no valid formant peaks';
                frameData.peaksFound = peaks.length;
                frameData.peakFreqs = peaks.slice(0, 5).map(p => Math.round(p.freq));
                detailedFrames.push(frameData);
                continue;
            }
            
            // Apply smoothing for valid formants
            if (formantTracks.length > 0) {
                const prev = formantTracks[formantTracks.length - 1];
                if (prev.voiced) {
                    const f1Jump = Math.abs(f1 - prev.f1);
                    const f2Jump = Math.abs(f2 - prev.f2);
                    const f3Jump = Math.abs(f3 - prev.f3);
                    
                    if (f1Jump > 300) f1 = prev.f1 * 0.7 + f1 * 0.3;
                    if (f2Jump > 500) f2 = prev.f2 * 0.7 + f2 * 0.3;
                    if (f3Jump > 600) f3 = prev.f3 * 0.7 + f3 * 0.3;
                }
            }
            
            frameData.formants = {
                f1: Math.round(f1),
                f2: Math.round(f2),
                f3: Math.round(f3)
            };
            
            detailedFrames.push(frameData);
            
            formantTracks.push({
                time: i / sampleRate,
                f1: f1,
                f2: f2,
                f3: f3,
                voiced: true,
                peaks: peaks
            });
        }
        
        const f1Smooth = this.medianFilter(formantTracks.map(f => f.f1), 5);
        const f2Smooth = this.medianFilter(formantTracks.map(f => f.f2), 5);
        const f3Smooth = this.medianFilter(formantTracks.map(f => f.f3), 5);
        
        console.log(`Extracted ${formantTracks.length} formant frames (${voicedCount} voiced, ${unvoicedCount} unvoiced)`);
        
        const result = formantTracks.map((track, i) => ({
            time: track.time,
            f1: f1Smooth[i],
            f2: f2Smooth[i],
            f3: f3Smooth[i],
            voiced: track.voiced
        }));
        
        result.detailedFrames = detailedFrames;
        result.summary = {
            totalFrames: formantTracks.length,
            voicedFrames: voicedCount,
            unvoicedFrames: unvoicedCount,
            voicedPercentage: ((voicedCount / formantTracks.length) * 100).toFixed(1),
            avgF1: (f1Smooth.reduce((a,b) => a+b, 0) / f1Smooth.length).toFixed(1),
            avgF2: (f2Smooth.reduce((a,b) => a+b, 0) / f2Smooth.length).toFixed(1),
            avgF3: (f3Smooth.reduce((a,b) => a+b, 0) / f3Smooth.length).toFixed(1)
        };
        
        return result;
    }
    
    // ===============================================
    // HELPER UTILITIES
    // ===============================================
    
    /**
     * Apply Hamming window to signal
     */
    static applyHammingWindow(signal) {
        return signal.map((sample, i) =>
            sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (signal.length - 1)))
        );
    }
    
    /**
     * Apply pre-emphasis filter to boost high frequencies
     */
    static preEmphasis(signal, alpha = 0.97) {
        const result = new Array(signal.length);
        result[0] = signal[0];
        for (let i = 1; i < signal.length; i++) {
            result[i] = signal[i] - alpha * signal[i - 1];
        }
        return result;
    }
    
    /**
     * Compute RMS energy of signal
     */
    static computeEnergy(signal) {
        let sum = 0;
        for (let i = 0; i < signal.length; i++) {
            sum += signal[i] * signal[i];
        }
        return Math.sqrt(sum / signal.length);
    }
    
    /**
     * Compute Zero-Crossing Rate
     */
    static computeZCR(signal) {
        let crossings = 0;
        for (let i = 1; i < signal.length; i++) {
            if ((signal[i - 1] >= 0 && signal[i] < 0) ||
                (signal[i - 1] < 0 && signal[i] >= 0)) {
                crossings++;
            }
        }
        return crossings / signal.length;
    }
    
    /**
     * Apply median filter for smoothing
     */
    static medianFilter(array, windowSize = 5) {
        const result = [];
        const half = Math.floor(windowSize / 2);
        
        for (let i = 0; i < array.length; i++) {
            const window = [];
            for (let j = Math.max(0, i - half); j <= Math.min(array.length - 1, i + half); j++) {
                window.push(array[j]);
            }
            window.sort((a, b) => a - b);
            result.push(window[Math.floor(window.length / 2)]);
        }
        
        return result;
    }
}

/**
 * InternalFeatureExtractor - Extracts ZCR and Spectral Tilt
 * These features are used for voice quality assessment and voiced/unvoiced discrimination
 */
export class InternalFeatureExtractor {
    constructor(audioBuffer) {
        this.buffer = audioBuffer;
        this.data = audioBuffer.getChannelData(0);
        this.sampleRate = audioBuffer.sampleRate;
    }
    
    /**
     * Extract Zero-Crossing Rate (ZCR) over time
     * ZCR is useful for distinguishing voiced/unvoiced speech
     * 
     * @returns {Object[]} Array of {time, zcr} objects
     */
    extractZCR() {
        const frameSize = 2048;
        const hopSize = 512;
        const zcr = [];
        
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
        
        return zcr;
    }
    
    /**
     * Extract Spectral Tilt over time
     * Spectral tilt indicates the balance between low and high frequencies
     * Higher tilt = more low-frequency energy (typical for vowels)
     * 
     * @returns {Object[]} Array of {time, tilt} objects
     */
    extractSpectralTilt() {
        const frameSize = 1024;
        const hopSize = 512;
        const tilt = [];
        
        for (let i = 0; i < this.data.length - frameSize; i += hopSize) {
            const frame = Array.from(this.data.slice(i, i + frameSize));
            const windowed = ImprovedLPC.applyHammingWindow(frame);
            const spectrum = this.computeFFT(windowed);
            
            const lowCutoff = Math.floor(spectrum.length * 0.3);
            let lowEnergy = 0;
            let highEnergy = 0;
            
            for (let j = 0; j < lowCutoff; j++) {
                lowEnergy += spectrum[j];
            }
            for (let j = lowCutoff; j < spectrum.length; j++) {
                highEnergy += spectrum[j];
            }
            
            const tiltValue = lowEnergy / (highEnergy + 1e-10);
            
            tilt.push({
                time: i / this.sampleRate,
                tilt: tiltValue
            });
        }
        
        return tilt;
    }
    
    /**
     * Compute FFT magnitude spectrum (helper for spectral tilt)
     * NOTE: This is a basic implementation. For production, use the FFT module.
     */
    computeFFT(signal) {
        const N = signal.length;
        const spectrum = new Array(Math.floor(N / 2));
        
        for (let k = 0; k < spectrum.length; k++) {
            let real = 0;
            let imag = 0;
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                real += signal[n] * Math.cos(angle);
                imag += signal[n] * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }
        
        return spectrum;
    }
}

// Export convenience functions
export function extractFormants(audioBuffer, options) {
    return ImprovedLPC.extractFormants(audioBuffer, options);
}

export function extractInternalFeatures(audioBuffer) {
    const extractor = new InternalFeatureExtractor(audioBuffer);
    return {
        zcr: extractor.extractZCR(),
        spectralTilt: extractor.extractSpectralTilt()
    };
}
