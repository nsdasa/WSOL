/**
 * MATH UTILITIES MODULE
 * Mathematical helper functions for signal processing
 */

export const MathUtils = {
    /**
     * Apply Hamming window to signal
     */
    applyHammingWindow(signal) {
        const n = signal.length;
        const windowed = new Array(n);
        
        for (let i = 0; i < n; i++) {
            windowed[i] = signal[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)));
        }
        
        return windowed;
    },

    /**
     * Median filter for smoothing
     */
    medianFilter(data, windowSize = 5) {
        const result = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(data.length, i + halfWindow + 1);
            const window = data.slice(start, end).filter(x => x !== 0).sort((a, b) => a - b);
            result.push(window.length > 0 ? window[Math.floor(window.length / 2)] : 0);
        }
        
        return result;
    },

    /**
     * Resample array to target length
     */
    resampleArray(data, targetLen) {
        const result = new Array(targetLen);
        const ratio = data.length / targetLen;
        
        for (let i = 0; i < targetLen; i++) {
            const srcIdx = i * ratio;
            const idx1 = Math.floor(srcIdx);
            const idx2 = Math.min(idx1 + 1, data.length - 1);
            const frac = srcIdx - idx1;
            
            result[i] = data[idx1] * (1 - frac) + data[idx2] * frac;
        }
        
        return result;
    },

    /**
     * Pearson correlation coefficient
     */
    pearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        
        const num = sumXY - (sumX * sumY / n);
        const den = Math.sqrt((sumX2 - sumX * sumX / n) * (sumY2 - sumY * sumY / n));
        
        return den === 0 ? 0 : num / den;
    },

    /**
     * Normalize array to 0-1 range
     */
    normalize(data) {
        const max = Math.max(...data.map(Math.abs));
        return max === 0 ? data : data.map(x => x / max);
    },

    /**
     * Remove DC offset
     */
    removeDCOffset(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.map(x => x - mean);
    },

    /**
     * Hz to Mel scale conversion
     */
    hzToMel(hz) {
        return 2595 * Math.log10(1 + hz / 700);
    },

    /**
     * Mel to Hz scale conversion
     */
    melToHz(mel) {
        return 700 * (Math.pow(10, mel / 2595) - 1);
    },

    /**
     * Compute RMS (Root Mean Square) energy
     */
    computeRMS(signal) {
        let sum = 0;
        for (let i = 0; i < signal.length; i++) {
            sum += signal[i] * signal[i];
        }
        return Math.sqrt(sum / signal.length);
    },

    /**
     * Bit reversal for FFT
     */
    reverseBits(x, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (x & 1);
            x >>= 1;
        }
        return result;
    },

    /**
     * Complex number operations
     */
    complex: {
        multiply(a, b) {
            return {
                real: a.real * b.real - a.imag * b.imag,
                imag: a.real * b.imag + a.imag * b.real
            };
        },
        
        divide(a, b) {
            const denom = b.real * b.real + b.imag * b.imag;
            if (denom < 1e-20) return { real: 0, imag: 0 };
            return {
                real: (a.real * b.real + a.imag * b.imag) / denom,
                imag: (a.imag * b.real - a.real * b.imag) / denom
            };
        },
        
        subtract(a, b) {
            return {
                real: a.real - b.real,
                imag: a.imag - b.imag
            };
        },
        
        abs(z) {
            return Math.sqrt(z.real * z.real + z.imag * z.imag);
        },
        
        angle(z) {
            return Math.atan2(z.imag, z.real);
        }
    }
};
