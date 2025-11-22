/**
 * VISUALIZATION MODULE
 * 
 * Canvas-based visualization engine for pronunciation analysis.
 * Renders waveforms, spectrograms, pitch contours, formants, MFCCs, and intensity envelopes.
 * 
 * Features:
 * - Dual waveform display (overlay or stacked)
 * - Spectrogram with difference view
 * - Pitch contour visualization
 * - Formant track overlay
 * - MFCC heatmap
 * - Intensity envelope
 * - Interactive scaling and filtering
 * 
 * Dependencies: 
 * - Web Audio API (AudioBuffer, AudioContext)
 * - Canvas 2D rendering context
 * 
 * Global Variables (for compatibility with original code):
 * - scalePreferences: Visualization configuration object
 *   Can be replaced by passing config to constructor in future refactoring
 * 
 * Note: This module currently references the global `scalePreferences` object
 * which should be defined in the main application. For a fully modular setup,
 * pass configuration via the constructor or use the helper functions provided.
 * 
 * @module visualizer
 */

export class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    drawAxes(x, y, width, height, xLabel, yLabel, yMin, yMax, yUnit = '') {
        // Draw main axes
        this.ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + height);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.stroke();
        
        // Draw Y-axis labels and grid
        this.ctx.fillStyle = 'rgba(209, 213, 219, 0.9)';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'right';
        
        const numYTicks = 5;
        const range = yMax - yMin;
        
        // Calculate nice tick values
        const rawStep = range / (numYTicks - 1);
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const normalizedStep = rawStep / magnitude;
        
        let niceStep;
        if (normalizedStep <= 1) niceStep = 1;
        else if (normalizedStep <= 2) niceStep = 2;
        else if (normalizedStep <= 5) niceStep = 5;
        else niceStep = 10;
        
        const step = niceStep * magnitude;
        
        // Calculate nice min/max that encompass data range
        const niceMin = Math.floor(yMin / step) * step;
        const niceMax = Math.ceil(yMax / step) * step;
        
        // Draw ticks
        for (let value = niceMin; value <= niceMax; value += step) {
            if (value < yMin || value > yMax) continue;
            
            const normalizedPos = (value - yMin) / (yMax - yMin);
            const yPos = y + height - (normalizedPos * height);
            
            // Grid line
            this.ctx.strokeStyle = 'rgba(75, 85, 99, 0.15)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, yPos);
            this.ctx.lineTo(x + width, yPos);
            this.ctx.stroke();
            
            // Tick label
            this.ctx.fillStyle = 'rgba(209, 213, 219, 0.9)';
            const labelValue = Math.round(value);
            this.ctx.fillText(labelValue + yUnit, x - 8, yPos + 4);
        }
        
        // Draw axis labels
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        
        // X-axis label
        if (xLabel) {
            this.ctx.fillText(xLabel, x + width / 2, y + height + 30);
        }
        
        // Y-axis label (rotated)
        this.ctx.save();
        this.ctx.translate(x - 50, y + height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(yLabel, 0, 0);
        this.ctx.restore();
    }
    
    drawWaveform(nativeBuffer, userBuffer) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const useOverlay = scalePreferences.displayMode === 'overlay';
        const useDB = scalePreferences.amplitude === 'db';
        
        const nativePeak = this.findPeakAmplitude(nativeBuffer);
        const userPeak = this.findPeakAmplitude(userBuffer);
        
        // Handle shared vs independent normalization
        let effectiveNativePeak = nativePeak;
        let effectiveUserPeak = userPeak;
        if (scalePreferences.waveformNormalization === 'shared') {
            const sharedPeak = Math.max(nativePeak, userPeak);
            effectiveNativePeak = sharedPeak;
            effectiveUserPeak = sharedPeak;
        }
        
        const targetAmplitude = 0.9;
        
        // Calculate displayed time range
        const timeStart = scalePreferences.waveformTimeStart;
        const timeEnd = scalePreferences.waveformTimeEnd;
        const zoomX = scalePreferences.waveformZoomX;
        const baseDuration = Math.max(nativeBuffer.duration, userBuffer.duration);
        const croppedDuration = baseDuration * (timeEnd - timeStart);
        const displayedDuration = croppedDuration / zoomX;
        const displayedStart = baseDuration * timeStart;
        
        if (useOverlay) {
            const plotWidth = width - 100;
            const plotHeight = height - 80;
            const offsetX = 60;
            const offsetY = 10;
            
            let yMin, yMax, yUnit;
            if (useDB) {
                yMin = -60;
                yMax = 0;
                yUnit = 'dB';
            } else {
                yMin = -targetAmplitude;
                yMax = targetAmplitude;
                yUnit = '';
            }
            
            this.drawAxes(offsetX, offsetY, plotWidth, plotHeight, 'Time (seconds)', 'Amplitude', yMin, yMax, yUnit);
            
            this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            this.ctx.lineWidth = 1.5;
            this.drawWaveformData(nativeBuffer, offsetX, offsetY, plotWidth, plotHeight, effectiveNativePeak, targetAmplitude);
            
            this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            this.ctx.lineWidth = 1.5;
            this.drawWaveformData(userBuffer, offsetX, offsetY, plotWidth, plotHeight, effectiveUserPeak, targetAmplitude);
            
            this.ctx.fillStyle = '#3B82F6';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`■ Native (peak=${nativePeak.toFixed(3)})`, offsetX, offsetY - 5);
            
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fillText(`■ You (peak=${userPeak.toFixed(3)})`, offsetX + 220, offsetY - 5);
            
            this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            for (let i = 0; i <= 4; i++) {
                const x = offsetX + (i / 4) * plotWidth;
                const time = displayedStart + (i / 4) * displayedDuration;
                this.ctx.fillText(time.toFixed(2), x, height - 10);
            }
        } else {
            const plotWidth = width - 100;
            const plotHeight = (height - 80) / 2;
            const offsetX = 60;
            
            let yMin, yMax, yUnit;
            if (useDB) {
                yMin = -60;
                yMax = 0;
                yUnit = 'dB';
            } else {
                yMin = -targetAmplitude;
                yMax = targetAmplitude;
                yUnit = '';
            }
            
            this.drawAxes(offsetX, 10, plotWidth, plotHeight, '', 'Amplitude', yMin, yMax, yUnit);
            this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            this.ctx.lineWidth = 1.5;
            this.drawWaveformData(nativeBuffer, offsetX, 10, plotWidth, plotHeight, effectiveNativePeak, targetAmplitude);
            
            this.ctx.fillStyle = '#3B82F6';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Native Speaker`, offsetX, 25);
            
            const offsetY = plotHeight + 50;
            this.drawAxes(offsetX, offsetY, plotWidth, plotHeight, 'Time (seconds)', 'Amplitude', yMin, yMax, yUnit);
            this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            this.drawWaveformData(userBuffer, offsetX, offsetY, plotWidth, plotHeight, effectiveUserPeak, targetAmplitude);
            
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fillText(`Your Recording`, offsetX, offsetY + 15);
            
            this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            for (let i = 0; i <= 4; i++) {
                const x = offsetX + (i / 4) * plotWidth;
                const time = displayedStart + (i / 4) * displayedDuration;
                this.ctx.fillText(time.toFixed(2), x, height - 10);
            }
        }
    }
    
    findPeakAmplitude(buffer) {
        const data = buffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peak) peak = abs;
        }
        return Math.max(peak, 0.01);
    }
    
    drawWaveformData(buffer, x, y, width, height, peakAmplitude, targetAmplitude) {
        const rawData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        // Apply time cropping
        const timeStart = scalePreferences.waveformTimeStart;
        const timeEnd = scalePreferences.waveformTimeEnd;
        const startSample = Math.floor(timeStart * rawData.length);
        const endSample = Math.floor(timeEnd * rawData.length);
        const croppedData = rawData.slice(startSample, endSample);
        
        // Apply zoom X (focus on portion of time)
        const zoomX = scalePreferences.waveformZoomX;
        const zoomLength = Math.floor(croppedData.length / zoomX);
        const data = croppedData.slice(0, zoomLength);
        
        const step = Math.ceil(data.length / width);
        const centerY = y + height / 2;
        
        const useDB = scalePreferences.amplitude === 'db';
        const useBipolar = scalePreferences.waveformMode === 'bipolar';
        const zoomY = scalePreferences.waveformZoomY;
        const filterMode = scalePreferences.waveformFilterMode;
        const downsampleMode = scalePreferences.waveformDownsample;
        
        // Apply RMS smoothing if selected
        let processedData = data;
        if (filterMode === 'rms') {
            const windowSize = Math.floor(scalePreferences.waveformRmsWindow);
            processedData = new Float32Array(data.length);
            for (let i = 0; i < data.length; i++) {
                let rms = 0;
                const start = Math.max(0, i - Math.floor(windowSize / 2));
                const end = Math.min(data.length, i + Math.floor(windowSize / 2));
                for (let j = start; j < end; j++) {
                    rms += data[j] * data[j];
                }
                rms = Math.sqrt(rms / (end - start));
                processedData[i] = data[i] >= 0 ? rms : -rms;
            }
        }
        
        // Calculate percentile threshold if needed
        let percentileThreshold = 0;
        if (filterMode === 'percentile') {
            const absValues = Array.from(processedData).map(v => Math.abs(v)).sort((a, b) => a - b);
            const percentileIdx = Math.floor(absValues.length * (1 - scalePreferences.waveformPercentile / 100));
            percentileThreshold = absValues[Math.max(0, percentileIdx)];
        }
        
        const scaleFactor = useDB ? 1.0 : (targetAmplitude / peakAmplitude);
        
        this.ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i < width; i++) {
            const startIdx = i * step;
            const endIdx = Math.min((i + 1) * step, processedData.length);
            
            // Get sample values based on downsample mode
            let minVal = 0, maxVal = 0, avgVal = 0, peakVal = 0;
            let count = 0;
            
            for (let j = startIdx; j < endIdx; j++) {
                let sample = processedData[j];
                
                // Apply filtering
                if (filterMode === 'threshold' || filterMode === 'noisegate') {
                    const threshold = scalePreferences.waveformThreshold;
                    if (Math.abs(sample) < threshold) {
                        sample = 0;
                    }
                } else if (filterMode === 'percentile') {
                    if (Math.abs(sample) < percentileThreshold) {
                        sample = 0;
                    }
                }
                
                if (sample < minVal) minVal = sample;
                if (sample > maxVal) maxVal = sample;
                if (Math.abs(sample) > Math.abs(peakVal)) peakVal = sample;
                avgVal += sample;
                count++;
            }
            
            if (count > 0) avgVal /= count;
            
            // Apply zoom Y
            minVal *= zoomY;
            maxVal *= zoomY;
            avgVal *= zoomY;
            peakVal *= zoomY;
            
            // Clip values
            minVal = Math.max(-1, Math.min(1, minVal));
            maxVal = Math.max(-1, Math.min(1, maxVal));
            avgVal = Math.max(-1, Math.min(1, avgVal));
            peakVal = Math.max(-1, Math.min(1, peakVal));
            
            if (useBipolar && !useDB) {
                // Draw min-max range
                let drawMin, drawMax;
                if (downsampleMode === 'minmax') {
                    drawMin = minVal;
                    drawMax = maxVal;
                } else if (downsampleMode === 'max') {
                    drawMin = peakVal >= 0 ? 0 : peakVal;
                    drawMax = peakVal >= 0 ? peakVal : 0;
                } else { // avg
                    drawMin = avgVal >= 0 ? 0 : avgVal;
                    drawMax = avgVal >= 0 ? avgVal : 0;
                }
                
                const scaledMin = drawMin * scaleFactor;
                const scaledMax = drawMax * scaleFactor;
                
                const plotYMin = centerY - scaledMin * (height / 2);
                const plotYMax = centerY - scaledMax * (height / 2);
                
                this.ctx.moveTo(x + i, plotYMax);
                this.ctx.lineTo(x + i, plotYMin);
            } else {
                // Envelope mode
                let absVal;
                if (downsampleMode === 'minmax' || downsampleMode === 'max') {
                    absVal = Math.max(Math.abs(minVal), Math.abs(maxVal));
                } else {
                    absVal = Math.abs(avgVal);
                }
                
                let plotY;
                if (useDB) {
                    const db = 20 * Math.log10(Math.max(absVal, 1e-6));
                    const normalizedDB = Math.max(0, (db + 60) / 60);
                    plotY = centerY - normalizedDB * (height / 2);
                } else {
                    const scaledVal = absVal * scaleFactor;
                    plotY = centerY - scaledVal * (height / 2);
                }
                
                if (firstPoint) {
                    this.ctx.moveTo(x + i, plotY);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(x + i, plotY);
                }
            }
        }
        this.ctx.stroke();
    }
    
    drawSpectrogram(nativeBuffer, userBuffer) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const plotWidth = width - 100;
        const plotHeight = (height - 100) / 3; // 3 panels now
        const offsetX = 60;
        
        // Calculate max frequency based on zoom
        const baseMaxFreq = 8000;
        const maxFreq = baseMaxFreq / scalePreferences.zoomX;
        
        // Compute spectrogram data for both
        const nativeData = this.computeSpectrogramData(nativeBuffer, plotWidth, maxFreq);
        const userData = this.computeSpectrogramData(userBuffer, plotWidth, maxFreq);
        
        // Draw native spectrogram
        this.drawSpectrogramFromData(nativeData, offsetX, 10, plotWidth, plotHeight, maxFreq);
        this.ctx.fillStyle = '#3B82F6';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Native Speaker', offsetX, 22);
        
        // Draw Y-axis frequency labels for native
        this.drawFrequencyYAxis(offsetX, 10, plotHeight, maxFreq);
        
        // Draw user spectrogram
        const userOffsetY = plotHeight + 40;
        this.drawSpectrogramFromData(userData, offsetX, userOffsetY, plotWidth, plotHeight, maxFreq);
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillText('Your Recording', offsetX, userOffsetY + 12);
        
        // Draw Y-axis frequency labels for user
        this.drawFrequencyYAxis(offsetX, userOffsetY, plotHeight, maxFreq);
        
        // Draw difference spectrogram
        const diffOffsetY = plotHeight * 2 + 70;
        this.drawSpectrogramDifference(nativeData, userData, offsetX, diffOffsetY, plotWidth, plotHeight);
        this.ctx.fillStyle = '#10B981';
        this.ctx.fillText('Difference (Native - User)', offsetX, diffOffsetY + 12);
        
        // Draw Y-axis frequency labels for difference
        this.drawFrequencyYAxis(offsetX, diffOffsetY, plotHeight, maxFreq);
        
        // Legend for difference
        const legendX = width - 35;
        const legendY = diffOffsetY + 20;
        const legendHeight = plotHeight - 30;
        
        for (let i = 0; i < legendHeight; i++) {
            const normalized = 1 - i / legendHeight;
            this.ctx.fillStyle = this.differenceToColor(normalized);
            this.ctx.fillRect(legendX, legendY + i, 12, 1);
        }
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('+', legendX + 15, legendY + 5);
        this.ctx.fillText('0', legendX + 15, legendY + legendHeight / 2 + 3);
        this.ctx.fillText('-', legendX + 15, legendY + legendHeight);
    }
    
    drawFrequencyYAxis(x, y, height, maxFreq) {
        this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'right';
        
        const useMel = scalePreferences.spectrogramFreq === 'mel';
        const numLabels = 5;
        
        if (useMel) {
            // For mel scale, show Hz values at mel-spaced intervals
            const maxMel = this.hzToMel(maxFreq);
            for (let i = 0; i <= numLabels; i++) {
                const mel = (i / numLabels) * maxMel;
                const freq = this.melToHz(mel);
                const yPos = y + height - (i / numLabels) * height;
                const label = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq).toString();
                this.ctx.fillText(label, x - 5, yPos + 3);
            }
        } else {
            for (let i = 0; i <= numLabels; i++) {
                const freq = (i / numLabels) * maxFreq;
                const yPos = y + height - (i / numLabels) * height;
                const label = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq).toString();
                this.ctx.fillText(label, x - 5, yPos + 3);
            }
        }
    }
    
    // Mel scale conversion functions
    hzToMel(hz) {
        return 2595 * Math.log10(1 + hz / 700);
    }
    
    melToHz(mel) {
        return 700 * (Math.pow(10, mel / 2595) - 1);
    }
    
    // Create mel filterbank
    createMelFilterbank(numFilters, fftSize, sampleRate, minFreq = 0, maxFreq = 8000) {
        const minMel = this.hzToMel(minFreq);
        const maxMel = this.hzToMel(maxFreq);
        
        // Create numFilters + 2 points evenly spaced in mel scale
        const melPoints = [];
        for (let i = 0; i < numFilters + 2; i++) {
            melPoints.push(minMel + (maxMel - minMel) * i / (numFilters + 1));
        }
        
        // Convert back to Hz
        const hzPoints = melPoints.map(mel => this.melToHz(mel));
        
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
    
    // Apply mel filterbank to spectrum
    applyMelFilterbank(spectrum, filterbank) {
        return filterbank.map(filter => {
            let sum = 0;
            for (let i = 0; i < filter.length && i < spectrum.length; i++) {
                sum += spectrum[i] * filter[i];
            }
            return sum;
        });
    }
    
    computeSpectrogramData(buffer, targetWidth, maxFreq = 8000) {
        const data = buffer.getChannelData(0);
        const fftSize = scalePreferences.fftSize;
        
        // Calculate hop size - use user setting or default to fftSize/4
        let hopSize;
        if (scalePreferences.hopSize === 'auto') {
            hopSize = Math.floor(fftSize / 4);
        } else {
            hopSize = parseInt(scalePreferences.hopSize);
            // Ensure hop size doesn't exceed FFT size
            if (hopSize > fftSize) {
                hopSize = Math.floor(fftSize / 4);
            }
        }
        
        const numFrames = Math.floor((data.length - fftSize) / hopSize);
        const sampleRate = buffer.sampleRate;
        const maxBin = Math.floor((maxFreq / sampleRate) * (fftSize / 2));
        
        if (numFrames <= 0) {
            debugLog.log(`Audio too short for FFT size ${fftSize}`, 'error');
            return [];
        }
        
        const useDBMag = scalePreferences.spectrogramMag === 'db';
        const useMel = scalePreferences.spectrogramFreq === 'mel';
        
        // Create mel filterbank if needed
        const numMelBins = scalePreferences.melBins;
        let melFilterbank = null;
        if (useMel) {
            melFilterbank = this.createMelFilterbank(numMelBins, fftSize, sampleRate, 0, maxFreq);
        }
        
        const spectrogramData = [];
        
        for (let i = 0; i < numFrames; i++) {
            const start = i * hopSize;
            const frame = Array.from(data.slice(start, start + fftSize));
            const windowed = frame.map((sample, idx) =>
                sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * idx / (fftSize - 1)))
            );
            
            const spectrum = this.computeFFT(windowed);
            let frameData;
            
            if (useMel) {
                // Apply mel filterbank
                const melSpectrum = this.applyMelFilterbank(spectrum, melFilterbank);
                
                let maxMag = 1;
                if (!useDBMag) {
                    maxMag = Math.max(...melSpectrum);
                }
                
                frameData = melSpectrum.map(mag => {
                    if (useDBMag) {
                        const db = 20 * Math.log10(mag + 1e-10);
                        return Math.max(0, Math.min(1, (db + 60) / 60));
                    } else {
                        return mag / (maxMag + 1e-10);
                    }
                });
            } else {
                // Standard linear/log bins
                frameData = [];
                
                let maxMag = 1;
                if (!useDBMag) {
                    maxMag = Math.max(...spectrum.slice(0, maxBin));
                }
                
                for (let bin = 0; bin < maxBin; bin++) {
                    let normalized;
                    if (useDBMag) {
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
        
        return spectrogramData;
    }
    
    drawSpectrogramFromData(spectrogramData, x, y, width, height, maxFreq = 8000) {
        if (!spectrogramData || spectrogramData.length === 0) return;
        
        const numFrames = spectrogramData.length;
        const numBins = spectrogramData[0].length;
        const frameWidth = width / numFrames;
        const binHeight = height / numBins;
        
        const useLogFreq = scalePreferences.spectrogramFreq === 'log';
        const yZoom = scalePreferences.zoomY;
        
        const filterMode = scalePreferences.filterMode;
        const filterValue = scalePreferences.filterValue;
        
        // Pre-calculate thresholds based on filter mode
        let globalThreshold = 0;
        let binThresholds = null;
        
        if (filterMode === 'perbin') {
            // Calculate max for each frequency bin across all time frames
            binThresholds = new Array(numBins).fill(0);
            for (let bin = 0; bin < numBins; bin++) {
                let binMax = 0;
                for (let i = 0; i < numFrames; i++) {
                    if (spectrogramData[i][bin] > binMax) {
                        binMax = spectrogramData[i][bin];
                    }
                }
                binThresholds[bin] = binMax * (filterValue / 100);
            }
        } else {
            // Flatten all values for global calculations
            const allValues = [];
            for (let i = 0; i < numFrames; i++) {
                for (let bin = 0; bin < numBins; bin++) {
                    allValues.push(spectrogramData[i][bin]);
                }
            }
            
            switch (filterMode) {
                case 'global': {
                    const globalMax = Math.max(...allValues);
                    globalThreshold = globalMax * (filterValue / 100);
                    break;
                }
                case 'percentile': {
                    if (filterValue < 100) {
                        const sorted = [...allValues].sort((a, b) => a - b);
                        const percentileIndex = Math.floor(sorted.length * (1 - filterValue / 100));
                        globalThreshold = sorted[Math.min(percentileIndex, sorted.length - 1)];
                    } else {
                        globalThreshold = 0;
                    }
                    break;
                }
                case 'db': {
                    globalThreshold = Math.pow(10, filterValue / 20);
                    break;
                }
                case 'statistical': {
                    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
                    const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
                    const stdDev = Math.sqrt(variance);
                    globalThreshold = mean + (filterValue * stdDev);
                    break;
                }
            }
        }
        
        for (let i = 0; i < numFrames; i++) {
            for (let bin = 0; bin < numBins; bin++) {
                let normalized = spectrogramData[i][bin];
                
                // Apply filter based on mode
                if (filterMode === 'perbin') {
                    if (normalized < binThresholds[bin]) {
                        normalized = 0;
                    }
                } else {
                    if (normalized < globalThreshold) {
                        normalized = 0;
                    }
                }
                
                // Apply Y zoom - boost intensity and clip
                normalized = Math.min(normalized * yZoom, 1);
                
                this.ctx.fillStyle = this.intensityToColor(normalized);
                
                let yPos;
                if (useLogFreq) {
                    const normalizedFreq = Math.log10(bin + 1) / Math.log10(numBins);
                    yPos = y + height - (normalizedFreq * height);
                } else {
                    yPos = y + height - ((bin + 1) * binHeight);
                }
                
                this.ctx.fillRect(x + (i * frameWidth), yPos, frameWidth + 1, binHeight + 1);
            }
        }
    }
    
    drawSpectrogramDifference(nativeData, userData, x, y, width, height) {
        if (!nativeData || !userData || nativeData.length === 0 || userData.length === 0) return;
        
        // Resample to same length
        const numFrames = Math.min(nativeData.length, userData.length, Math.floor(width));
        const numBins = nativeData[0].length;
        const frameWidth = width / numFrames;
        const binHeight = height / numBins;
        
        for (let i = 0; i < numFrames; i++) {
            const nativeIdx = Math.floor(i * nativeData.length / numFrames);
            const userIdx = Math.floor(i * userData.length / numFrames);
            
            for (let bin = 0; bin < numBins; bin++) {
                const nativeVal = nativeData[nativeIdx][bin];
                const userVal = userData[userIdx][bin];
                const diff = (nativeVal - userVal + 1) / 2; // Map -1..1 to 0..1
                
                this.ctx.fillStyle = this.differenceToColor(diff);
                const yPos = y + height - ((bin + 1) * binHeight);
                this.ctx.fillRect(x + (i * frameWidth), yPos, frameWidth + 1, binHeight + 1);
            }
        }
    }
    
    differenceToColor(normalized) {
        // Blue (user stronger) -> White (same) -> Red (native stronger)
        if (normalized < 0.5) {
            const t = normalized * 2;
            const r = Math.floor(t * 255);
            const g = Math.floor(t * 255);
            const b = 255;
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const t = (normalized - 0.5) * 2;
            const r = 255;
            const g = Math.floor((1 - t) * 255);
            const b = Math.floor((1 - t) * 255);
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    
    drawSpectrogramData(buffer, x, y, width, height) {
        const data = buffer.getChannelData(0);
        const fftSize = 512;
        const hopSize = 128;
        const numFrames = Math.floor((data.length - fftSize) / hopSize);
        const maxFreq = 8000;
        const sampleRate = buffer.sampleRate;
        const maxBin = Math.floor((maxFreq / sampleRate) * (fftSize / 2));
        
        const useDBMag = scalePreferences.spectrogramMag === 'db';
        const useLogFreq = scalePreferences.spectrogramFreq === 'log';
        
        const frameWidth = width / numFrames;
        
        for (let i = 0; i < numFrames; i++) {
            const start = i * hopSize;
            const frame = Array.from(data.slice(start, start + fftSize));
            
            const windowed = frame.map((sample, idx) =>
                sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * idx / (fftSize - 1)))
            );
            
            const spectrum = this.computeFFT(windowed);
            
            let maxMag = 1;
            if (!useDBMag) {
                maxMag = Math.max(...spectrum.slice(0, maxBin));
            }
            
            for (let bin = 0; bin < maxBin; bin++) {
                const magnitude = spectrum[bin];
                
                let normalized;
                if (useDBMag) {
                    const db = 20 * Math.log10(magnitude + 1e-10);
                    normalized = Math.max(0, Math.min(1, (db + 60) / 60));
                } else {
                    normalized = magnitude / (maxMag + 1e-10);
                }
                
                let yPos;
                if (useLogFreq) {
                    const freq = (bin / maxBin) * maxFreq;
                    const minFreqLog = Math.log10(Math.max(1, 20));
                    const maxFreqLog = Math.log10(maxFreq);
                    const freqLog = Math.log10(Math.max(freq, 20));
                    const normalizedFreq = (freqLog - minFreqLog) / (maxFreqLog - minFreqLog);
                    yPos = y + height - (normalizedFreq * height);
                } else {
                    const binHeight = height / maxBin;
                    yPos = y + height - ((bin + 1) * binHeight);
                }
                
                this.ctx.fillStyle = this.intensityToColor(normalized);
                
                if (useLogFreq) {
                    const nextFreq = ((bin + 1) / maxBin) * maxFreq;
                    const nextFreqLog = Math.log10(Math.max(nextFreq, 20));
                    const minFreqLog = Math.log10(20);
                    const maxFreqLog = Math.log10(maxFreq);
                    const nextNormalizedFreq = (nextFreqLog - minFreqLog) / (maxFreqLog - minFreqLog);
                    const nextYPos = y + height - (nextNormalizedFreq * height);
                    const barHeight = Math.abs(yPos - nextYPos) + 1;
                    
                    this.ctx.fillRect(
                        x + (i * frameWidth),
                        nextYPos,
                        frameWidth + 1,
                        barHeight
                    );
                } else {
                    const binHeight = height / maxBin;
                    this.ctx.fillRect(
                        x + (i * frameWidth),
                        yPos,
                        frameWidth + 1,
                        binHeight + 1
                    );
                }
            }
        }
    }
    
    intensityToColor(intensity) {
        const r = Math.floor(intensity * 255);
        const g = Math.floor(Math.sin(intensity * Math.PI) * 255);
        const b = Math.floor((1 - intensity) * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    drawSpectrum(nativeBuffer, userBuffer) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const useOverlay = scalePreferences.displayMode === 'overlay';
        
        // Use cached spectra or compute and cache
        if (!spectrumCache.nativeSpectrum) {
            spectrumCache.nativeSpectrum = this.computeAverageSpectrum(nativeBuffer);
            debugLog.log('Computed and cached native spectrum');
        }
        if (!spectrumCache.userSpectrum) {
            spectrumCache.userSpectrum = this.computeAverageSpectrum(userBuffer);
            debugLog.log('Computed and cached user spectrum');
        }
        
        const nativeSpectrum = spectrumCache.nativeSpectrum;
        const userSpectrum = spectrumCache.userSpectrum;
        
        // Apply zoom - reduce displayed frequency range
        const baseMaxFreq = 5000;
        const maxFreq = baseMaxFreq / scalePreferences.zoomX;
        
        if (useOverlay) {
            const plotWidth = width - 100;
            const plotHeight = height - 80;
            const offsetX = 60;
            const offsetY = 10;
            
            this.drawAxes(offsetX, offsetY, plotWidth, plotHeight, 'Frequency (Hz)', 'Magnitude', 0, 1, '');
            
            this.drawSpectrumData(nativeSpectrum, nativeBuffer.sampleRate, offsetX, offsetY, plotWidth, plotHeight, maxFreq, '#3B82F6');
            this.drawSpectrumData(userSpectrum, userBuffer.sampleRate, offsetX, offsetY, plotWidth, plotHeight, maxFreq, '#EF4444');
            
            this.ctx.fillStyle = '#3B82F6';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('■ Native Speaker', offsetX, offsetY - 5);
            
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fillText('■ Your Recording', offsetX + 150, offsetY - 5);
            
            // Draw frequency labels based on zoomed range
            this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            for (let i = 0; i <= 5; i++) {
                const freq = (i / 5) * maxFreq;
                const x = offsetX + (i / 5) * plotWidth;
                const label = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq).toString();
                this.ctx.fillText(label, x, height - 10);
            }
        } else {
            const plotWidth = width - 100;
            const plotHeight = (height - 80) / 2;
            const offsetX = 60;
            
            this.ctx.fillStyle = '#3B82F6';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Native Speaker Spectrum', offsetX, 25);
            
            this.drawAxes(offsetX, 10, plotWidth, plotHeight, '', 'Magnitude', 0, 1, '');
            this.drawSpectrumData(nativeSpectrum, nativeBuffer.sampleRate, offsetX, 10, plotWidth, plotHeight, maxFreq, '#3B82F6');
            
            const offsetY = plotHeight + 50;
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fillText('Your Recording Spectrum', offsetX, offsetY + 15);
            
            this.drawAxes(offsetX, offsetY, plotWidth, plotHeight, 'Frequency (Hz)', 'Magnitude', 0, 1, '');
            this.drawSpectrumData(userSpectrum, userBuffer.sampleRate, offsetX, offsetY, plotWidth, plotHeight, maxFreq, '#EF4444');
            
            // Draw frequency labels based on zoomed range
            this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            for (let i = 0; i <= 5; i++) {
                const freq = (i / 5) * maxFreq;
                const x = offsetX + (i / 5) * plotWidth;
                const label = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq).toString();
                this.ctx.fillText(label, x, height - 10);
            }
        }
    }
    
    computeAverageSpectrum(buffer) {
        const data = buffer.getChannelData(0);
        const fftSize = scalePreferences.fftSize;
        
        // Calculate hop size - use user setting or default to fftSize/4
        let hopSize;
        if (scalePreferences.hopSize === 'auto') {
            hopSize = Math.floor(fftSize / 4);
        } else {
            hopSize = parseInt(scalePreferences.hopSize);
            if (hopSize > fftSize) {
                hopSize = Math.floor(fftSize / 4);
            }
        }
        
        const numFrames = Math.floor((data.length - fftSize) / hopSize);
        
        if (numFrames <= 0) {
            debugLog.log(`Audio too short for FFT size ${fftSize}`, 'error');
            return new Array(fftSize / 2).fill(0);
        }
        
        let avgSpectrum = null;
        
        for (let i = 0; i < numFrames; i++) {
            const start = i * hopSize;
            const frame = Array.from(data.slice(start, start + fftSize));
            
            const windowed = frame.map((sample, idx) =>
                sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * idx / (fftSize - 1)))
            );
            
            const spectrum = this.computeFFT(windowed);
            
            if (!avgSpectrum) {
                avgSpectrum = new Array(spectrum.length).fill(0);
            }
            
            for (let j = 0; j < spectrum.length; j++) {
                avgSpectrum[j] += spectrum[j];
            }
        }
        
        for (let j = 0; j < avgSpectrum.length; j++) {
            avgSpectrum[j] /= numFrames;
        }
        
        const max = Math.max(...avgSpectrum);
        for (let j = 0; j < avgSpectrum.length; j++) {
            avgSpectrum[j] /= (max + 1e-10);
        }
        
        return avgSpectrum;
    }
    
    drawSpectrumData(spectrum, sampleRate, x, y, width, height, maxFreq, color) {
        const freqPerBin = sampleRate / (2 * spectrum.length);
        const maxBin = Math.min(spectrum.length, Math.floor(maxFreq / freqPerBin));
        
        // Get values in range for filtering
        const values = spectrum.slice(0, maxBin);
        
        // Calculate threshold based on filter mode
        let threshold = 0;
        const filterMode = scalePreferences.filterMode;
        const filterValue = scalePreferences.filterValue;
        
        switch (filterMode) {
            case 'global':
            case 'perbin': {
                // For spectrum view, per-bin acts like global since it's one frame
                const maxMag = Math.max(...values);
                threshold = maxMag * (filterValue / 100);
                break;
            }
            case 'percentile': {
                if (filterValue < 100) {
                    const sorted = [...values].sort((a, b) => a - b);
                    const percentileIndex = Math.floor(sorted.length * (1 - filterValue / 100));
                    threshold = sorted[Math.min(percentileIndex, sorted.length - 1)];
                } else {
                    threshold = 0;
                }
                break;
            }
            case 'db': {
                // Convert dB to linear threshold
                threshold = Math.pow(10, filterValue / 20);
                break;
            }
            case 'statistical': {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                threshold = mean + (filterValue * stdDev);
                break;
            }
        }
        
        // Apply Y zoom
        const yZoom = scalePreferences.zoomY;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let bin = 0; bin < maxBin; bin++) {
            const freq = bin * freqPerBin;
            let magnitude = spectrum[bin];
            
            // Apply filter - values below threshold go to 0
            if (magnitude < threshold) {
                magnitude = 0;
            }
            
            // Apply Y zoom - scale magnitude and clip at top
            magnitude = Math.min(magnitude * yZoom, 1);
            
            const xPos = x + (freq / maxFreq) * width;
            const yPos = y + height - (magnitude * height);
            
            if (bin === 0) {
                this.ctx.moveTo(xPos, yPos);
            } else {
                this.ctx.lineTo(xPos, yPos);
            }
        }
        
        this.ctx.stroke();
    }
    
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
    
    reverseBits(x, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (x & 1);
            x >>= 1;
        }
        return result;
    }
    
    drawFormants(results) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const native = results.features.nativeFormants;
        const user = results.features.userFormants;
        
        const plotWidth = width - 100;
        const plotHeight = (height - 100) / 3;
        const offsetX = 60;
        
        // Auto-calculate ranges for each formant to use 90% of vertical space
        const getFormantRange = (formant) => {
            const allValues = [
                ...native.filter(f => f.voiced).map(f => f[formant]),
                ...user.filter(f => f.voiced).map(f => f[formant])
            ];
            
            if (allValues.length === 0) {
                // Fallback to standard ranges
                if (formant === 'f1') return { min: 200, max: 1200 };
                if (formant === 'f2') return { min: 500, max: 3500 };
                if (formant === 'f3') return { min: 1500, max: 4500 };
            }
            
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            const range = max - min;
            
            // Add 10% padding on each side so peaks reach 90% of space
            const padding = range * 0.111; // (1/0.9 - 1) ≈ 0.111
            
            return {
                min: Math.max(0, Math.round(min - padding)),
                max: Math.round(max + padding)
            };
        };
        
        const f1Range = getFormantRange('f1');
        const f2Range = getFormantRange('f2');
        const f3Range = getFormantRange('f3');
        
        // F1 plot
        this.drawAxes(offsetX, 20, plotWidth, plotHeight, '', 'F1 (Hz)', f1Range.min, f1Range.max, '');
        this.drawFormantTrack(native, user, 'f1', offsetX, 20, plotWidth, plotHeight, f1Range.min, f1Range.max);
        
        // F2 plot
        const y2 = 20 + plotHeight + 30;
        this.drawAxes(offsetX, y2, plotWidth, plotHeight, '', 'F2 (Hz)', f2Range.min, f2Range.max, '');
        this.drawFormantTrack(native, user, 'f2', offsetX, y2, plotWidth, plotHeight, f2Range.min, f2Range.max);
        
        // F3 plot
        const y3 = y2 + plotHeight + 30;
        this.drawAxes(offsetX, y3, plotWidth, plotHeight, 'Time (seconds)', 'F3 (Hz)', f3Range.min, f3Range.max, '');
        this.drawFormantTrack(native, user, 'f3', offsetX, y3, plotWidth, plotHeight, f3Range.min, f3Range.max);
        
        // Legend
        this.ctx.fillStyle = '#3B82F6';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('■ Native Speaker', offsetX, 12);
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillText('■ Your Recording', offsetX + 150, 12);
        
        // Add range info for debugging/clarity
        this.ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Range: ${f1Range.min}-${f1Range.max} Hz`, width - 10, 20 + plotHeight / 2);
        this.ctx.fillText(`Range: ${f2Range.min}-${f2Range.max} Hz`, width - 10, y2 + plotHeight / 2);
        this.ctx.fillText(`Range: ${f3Range.min}-${f3Range.max} Hz`, width - 10, y3 + plotHeight / 2);
    }
    
    drawFormantTrack(native, user, formant, x, y, width, height, minFreq, maxFreq) {
        const maxTime = Math.max(
            native[native.length - 1].time,
            user[user.length - 1].time
        );
        
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        let pathStarted = false;
        native.forEach((point, i) => {
            const plotX = x + (point.time / maxTime) * width;
            const plotY = y + height - ((point[formant] - minFreq) / (maxFreq - minFreq)) * height;
            
            if (point.voiced) {
                if (!pathStarted) {
                    this.ctx.moveTo(plotX, plotY);
                    pathStarted = true;
                } else {
                    this.ctx.lineTo(plotX, plotY);
                }
            } else if (pathStarted) {
                this.ctx.stroke();
                this.ctx.beginPath();
                pathStarted = false;
            }
        });
        if (pathStarted) this.ctx.stroke();
        
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        this.ctx.beginPath();
        pathStarted = false;
        user.forEach((point, i) => {
            const plotX = x + (point.time / maxTime) * width;
            const plotY = y + height - ((point[formant] - minFreq) / (maxFreq - minFreq)) * height;
            
            if (point.voiced) {
                if (!pathStarted) {
                    this.ctx.moveTo(plotX, plotY);
                    pathStarted = true;
                } else {
                    this.ctx.lineTo(plotX, plotY);
                }
            } else if (pathStarted) {
                this.ctx.stroke();
                this.ctx.beginPath();
                pathStarted = false;
            }
        });
        if (pathStarted) this.ctx.stroke();
    }
    
    drawPitch(results) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const nativeRaw = results.features.nativePitch;
        const userRaw = results.features.userPitch;
        
        const plotWidth = width - 100;
        const plotHeight = height - 80;
        const offsetX = 60;
        const offsetY = 20;
        
        // Get preferences
        const confidenceThreshold = scalePreferences.pitchConfidenceThreshold;
        const smoothingMode = scalePreferences.pitchSmoothingMode;
        const smoothingWindow = scalePreferences.pitchSmoothingWindow;
        const pitchScale = scalePreferences.pitchScale;
        const normalizeMode = scalePreferences.pitchNormalize;
        const showConfidence = scalePreferences.pitchShowConfidence;
        const showUnvoiced = scalePreferences.pitchShowUnvoiced;
        const manualYMin = scalePreferences.pitchYMin;
        const manualYMax = scalePreferences.pitchYMax;
        
        // Helper: Apply smoothing filter
        const applySmoothing = (pitchValues) => {
            if (smoothingMode === 'none') return pitchValues;
            
            const window = smoothingWindow;
            const halfWindow = Math.floor(window / 2);
            const result = [...pitchValues];
            
            if (smoothingMode === 'median') {
                for (let i = 0; i < pitchValues.length; i++) {
                    const start = Math.max(0, i - halfWindow);
                    const end = Math.min(pitchValues.length, i + halfWindow + 1);
                    const windowVals = pitchValues.slice(start, end).filter(v => v > 0).sort((a, b) => a - b);
                    if (windowVals.length > 0) {
                        result[i] = windowVals[Math.floor(windowVals.length / 2)];
                    }
                }
            } else if (smoothingMode === 'moving-avg') {
                for (let i = 0; i < pitchValues.length; i++) {
                    const start = Math.max(0, i - halfWindow);
                    const end = Math.min(pitchValues.length, i + halfWindow + 1);
                    const windowVals = pitchValues.slice(start, end).filter(v => v > 0);
                    if (windowVals.length > 0) {
                        result[i] = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
                    }
                }
            } else if (smoothingMode === 'savitzky-golay') {
                // Simplified Savitzky-Golay (quadratic, 5-point default)
                const coeffs = window === 5 ? [-3, 12, 17, 12, -3] : 
                               window === 7 ? [-2, 3, 6, 7, 6, 3, -2] :
                               window === 9 ? [-21, 14, 39, 54, 59, 54, 39, 14, -21] :
                               [1]; // fallback to no filter
                const norm = coeffs.reduce((a, b) => a + Math.abs(b), 0);
                
                for (let i = halfWindow; i < pitchValues.length - halfWindow; i++) {
                    if (pitchValues[i] === 0) continue;
                    let sum = 0;
                    let validCount = 0;
                    for (let j = 0; j < coeffs.length; j++) {
                        const idx = i - halfWindow + j;
                        if (pitchValues[idx] > 0) {
                            sum += coeffs[j] * pitchValues[idx];
                            validCount += Math.abs(coeffs[j]);
                        }
                    }
                    if (validCount > 0) {
                        result[i] = sum / validCount * (norm / validCount);
                    }
                }
            }
            
            return result;
        };
        
        // Helper: Convert Hz to semitones (relative to reference)
        const hzToSemitone = (hz, refHz) => {
            if (hz <= 0 || refHz <= 0) return 0;
            return 12 * Math.log2(hz / refHz);
        };
        
        // Process native pitch
        let nativePitches = nativeRaw.map(p => p.pitch);
        let nativeConfidences = nativeRaw.map(p => p.confidence || 0);
        
        // Apply confidence threshold
        nativePitches = nativePitches.map((p, i) => 
            (nativeConfidences[i] >= confidenceThreshold || confidenceThreshold === 0) ? p : 0
        );
        
        // Apply smoothing
        nativePitches = applySmoothing(nativePitches);
        
        // Process user pitch
        let userPitches = userRaw.map(p => p.pitch);
        let userConfidences = userRaw.map(p => p.confidence || 0);
        
        // Apply confidence threshold
        userPitches = userPitches.map((p, i) => 
            (userConfidences[i] >= confidenceThreshold || confidenceThreshold === 0) ? p : 0
        );
        
        // Apply smoothing
        userPitches = applySmoothing(userPitches);
        
        // Calculate means for normalization
        const nativeVoiced = nativePitches.filter(p => p > 0);
        const userVoiced = userPitches.filter(p => p > 0);
        const nativeMean = nativeVoiced.length > 0 ? nativeVoiced.reduce((a, b) => a + b, 0) / nativeVoiced.length : 100;
        const userMean = userVoiced.length > 0 ? userVoiced.reduce((a, b) => a + b, 0) / userVoiced.length : 100;
        
        // Determine Y axis range and units
        let minY, maxY, yLabel;
        
        if (pitchScale === 'semitone') {
            // Convert to semitones
            const refPitch = normalizeMode === 'mean' ? nativeMean : 100;
            nativePitches = nativePitches.map(p => p > 0 ? hzToSemitone(p, refPitch) : 0);
            userPitches = userPitches.map(p => p > 0 ? hzToSemitone(p, normalizeMode === 'mean' ? userMean : refPitch) : 0);
            
            const allSemitones = [...nativePitches, ...userPitches].filter(p => p !== 0);
            if (allSemitones.length > 0) {
                const dataMin = Math.min(...allSemitones);
                const dataMax = Math.max(...allSemitones);
                const range = dataMax - dataMin;
                minY = dataMin - range * 0.1;
                maxY = dataMax + range * 0.1;
            } else {
                minY = -12;
                maxY = 12;
            }
            yLabel = normalizeMode === 'mean' ? 'Semitones (from mean)' : 'Semitones (from 100Hz)';
        } else {
            // Linear Hz scale
            if (normalizeMode === 'mean') {
                // Normalize both to their means (show deviation)
                nativePitches = nativePitches.map(p => p > 0 ? p - nativeMean : 0);
                userPitches = userPitches.map(p => p > 0 ? p - userMean : 0);
                
                const allDevs = [...nativePitches, ...userPitches].filter(p => p !== 0);
                if (allDevs.length > 0) {
                    const absMax = Math.max(...allDevs.map(Math.abs));
                    minY = -absMax * 1.1;
                    maxY = absMax * 1.1;
                } else {
                    minY = -50;
                    maxY = 50;
                }
                yLabel = 'Hz (deviation from mean)';
            } else {
                // Normal Hz
                const allHz = [...nativePitches, ...userPitches].filter(p => p > 0);
                if (allHz.length > 0) {
                    const dataMin = Math.min(...allHz);
                    const dataMax = Math.max(...allHz);
                    const range = dataMax - dataMin;
                    minY = Math.max(50, dataMin - range * 0.1);
                    maxY = dataMax + range * 0.1;
                } else {
                    minY = 50;
                    maxY = 400;
                }
                yLabel = 'Pitch (Hz)';
            }
        }
        
        // Apply manual Y range if set
        if (manualYMin > 0) minY = manualYMin;
        if (manualYMax > 0) maxY = manualYMax;
        
        // Draw axes
        this.drawAxes(offsetX, offsetY, plotWidth, plotHeight, 'Time (seconds)', yLabel, minY, maxY, '');
        
        const maxTime = Math.max(
            nativeRaw[nativeRaw.length - 1].time,
            userRaw[userRaw.length - 1].time
        );
        
        // Helper: Draw pitch track with options
        const drawTrack = (pitches, times, confidences, color, colorRgb) => {
            if (showConfidence) {
                // Draw with variable opacity based on confidence
                for (let i = 1; i < pitches.length; i++) {
                    if (pitches[i] === 0 || pitches[i-1] === 0) continue;
                    
                    const opacity = 0.3 + 0.7 * (confidences[i] || 0.5);
                    this.ctx.strokeStyle = `rgba(${colorRgb}, ${opacity})`;
                    this.ctx.lineWidth = 1 + 2 * (confidences[i] || 0.5);
                    this.ctx.beginPath();
                    
                    const x1 = offsetX + (times[i-1] / maxTime) * plotWidth;
                    const y1 = offsetY + plotHeight - ((pitches[i-1] - minY) / (maxY - minY)) * plotHeight;
                    const x2 = offsetX + (times[i] / maxTime) * plotWidth;
                    const y2 = offsetY + plotHeight - ((pitches[i] - minY) / (maxY - minY)) * plotHeight;
                    
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
            } else {
                // Standard drawing
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2.5;
                
                if (showUnvoiced) {
                    // Break line at unvoiced segments
                    this.ctx.beginPath();
                    let started = false;
                    for (let i = 0; i < pitches.length; i++) {
                        if (pitches[i] !== 0) {
                            const plotX = offsetX + (times[i] / maxTime) * plotWidth;
                            const plotY = offsetY + plotHeight - ((pitches[i] - minY) / (maxY - minY)) * plotHeight;
                            if (!started) {
                                this.ctx.moveTo(plotX, plotY);
                                started = true;
                            } else {
                                this.ctx.lineTo(plotX, plotY);
                            }
                        } else if (started) {
                            this.ctx.stroke();
                            this.ctx.beginPath();
                            started = false;
                        }
                    }
                    if (started) this.ctx.stroke();
                } else {
                    // Connect through unvoiced
                    this.ctx.beginPath();
                    let started = false;
                    let lastX = 0, lastY = 0;
                    for (let i = 0; i < pitches.length; i++) {
                        if (pitches[i] !== 0) {
                            const plotX = offsetX + (times[i] / maxTime) * plotWidth;
                            const plotY = offsetY + plotHeight - ((pitches[i] - minY) / (maxY - minY)) * plotHeight;
                            if (!started) {
                                this.ctx.moveTo(plotX, plotY);
                                started = true;
                            } else {
                                this.ctx.lineTo(plotX, plotY);
                            }
                            lastX = plotX;
                            lastY = plotY;
                        }
                    }
                    this.ctx.stroke();
                }
            }
        };
        
        // Draw native pitch
        const nativeTimes = nativeRaw.map(p => p.time);
        drawTrack(nativePitches, nativeTimes, nativeConfidences, 'rgba(59, 130, 246, 0.9)', '59, 130, 246');
        
        // Draw user pitch
        const userTimes = userRaw.map(p => p.time);
        drawTrack(userPitches, userTimes, userConfidences, 'rgba(239, 68, 68, 0.9)', '239, 68, 68');
        
        // Legend
        this.ctx.fillStyle = '#3B82F6';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('■ Native Speaker', offsetX, offsetY - 5);
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillText('■ Your Recording', offsetX + 150, offsetY - 5);
        
        // Info
        this.ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'right';
        const infoText = `${smoothingMode !== 'none' ? smoothingMode + '(' + smoothingWindow + ')' : 'raw'} | ${pitchScale}${normalizeMode === 'mean' ? ' normalized' : ''}`;
        this.ctx.fillText(infoText, width - 10, offsetY + plotHeight / 2);
        
        // Show means if normalized
        if (normalizeMode === 'mean') {
            this.ctx.fillText(`Native mean: ${nativeMean.toFixed(0)}Hz | User mean: ${userMean.toFixed(0)}Hz`, width - 10, offsetY + plotHeight / 2 + 15);
        }
    }
    
    drawIntensity(results) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const native = results.features.nativeIntensity;
        const user = results.features.userIntensity;
        
        const plotWidth = width - 100;
        const plotHeight = height - 100;
        const offsetX = 60;
        const offsetY = 40;
        
        const useDB = scalePreferences.amplitude === 'db';
        
        let maxIntensity;
        if (useDB) {
            maxIntensity = 1;
        } else {
            maxIntensity = Math.max(
                ...native.map(d => d.intensity),
                ...user.map(d => d.intensity)
            );
        }
        
        const maxTime = Math.max(
            native[native.length - 1].time,
            user[user.length - 1].time
        );
        
        this.ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, offsetY + plotHeight / 2);
        this.ctx.lineTo(offsetX + plotWidth, offsetY + plotHeight / 2);
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'right';
        
        if (useDB) {
            this.ctx.fillText('0 dB', offsetX - 5, offsetY + plotHeight / 2 + 3);
            this.ctx.fillText('-30', offsetX - 5, offsetY + plotHeight / 4 + 3);
            this.ctx.fillText('-30', offsetX - 5, offsetY + 3 * plotHeight / 4 + 3);
            this.ctx.fillText('-60', offsetX - 5, offsetY + 3);
            this.ctx.fillText('-60', offsetX - 5, offsetY + plotHeight + 3);
        } else {
            this.ctx.fillText('0', offsetX - 5, offsetY + plotHeight / 2 + 3);
        }
        
        const barWidth = plotWidth / Math.max(native.length, user.length);
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        native.forEach((point, i) => {
            const x = offsetX + (point.time / maxTime) * plotWidth;
            let barHeight;
            
            if (useDB) {
                const db = 20 * Math.log10(Math.max(point.intensity, 1e-6));
                const normalizedDB = Math.max(0, (db + 60) / 60);
                barHeight = normalizedDB * (plotHeight / 2);
            } else {
                barHeight = (point.intensity / maxIntensity) * (plotHeight / 2);
            }
            
            this.ctx.fillRect(
                x,
                offsetY + plotHeight / 2 - barHeight,
                barWidth - 1,
                barHeight
            );
        });
        
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        user.forEach((point, i) => {
            const x = offsetX + (point.time / maxTime) * plotWidth;
            let barHeight;
            
            if (useDB) {
                const db = 20 * Math.log10(Math.max(point.intensity, 1e-6));
                const normalizedDB = Math.max(0, (db + 60) / 60);
                barHeight = normalizedDB * (plotHeight / 2);
            } else {
                barHeight = (point.intensity / maxIntensity) * (plotHeight / 2);
            }
            
            this.ctx.fillRect(
                x,
                offsetY + plotHeight / 2,
                barWidth - 1,
                barHeight
            );
        });
        
        this.ctx.fillStyle = '#3B82F6';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Native Speaker`, offsetX, offsetY - 10);
        
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillText(`Your Recording`, offsetX, offsetY + plotHeight + 25);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Time (seconds)', width / 2, height - 10);
    }
    
    drawMFCCs(results) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        const native = results.features.nativeMFCCs;
        const user = results.features.userMFCCs;
        
        if (!native || !user || native.length === 0 || user.length === 0) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No MFCC data available', width / 2, height / 2);
            return;
        }
        
        // Get settings
        const coeffStart = scalePreferences.mfccCoeffStart;
        const coeffEnd = scalePreferences.mfccCoeffEnd;
        const showDelta = scalePreferences.mfccShowDelta;
        const showDeltaDelta = scalePreferences.mfccShowDeltaDelta;
        const lifter = scalePreferences.mfccLifter;
        const filterMode = scalePreferences.mfccFilterMode;
        const filterValue = scalePreferences.mfccFilterValue;
        const perBinNorm = scalePreferences.mfccPerBinNorm;
        const zoomX = scalePreferences.mfccZoomX;
        const zoomY = scalePreferences.mfccZoomY;
        const colormap = scalePreferences.mfccColormap;
        const symmetric = scalePreferences.mfccSymmetric;
        
        // Calculate delta coefficients if needed
        const computeDeltas = (mfccs) => {
            const deltas = [];
            for (let i = 0; i < mfccs.length; i++) {
                const delta = { time: mfccs[i].time, coeffs: [] };
                for (let c = 0; c < mfccs[i].coeffs.length; c++) {
                    let sum = 0;
                    const N = 2;
                    for (let n = 1; n <= N; n++) {
                        const prev = i - n >= 0 ? mfccs[i - n].coeffs[c] : mfccs[0].coeffs[c];
                        const next = i + n < mfccs.length ? mfccs[i + n].coeffs[c] : mfccs[mfccs.length - 1].coeffs[c];
                        sum += n * (next - prev);
                    }
                    delta.coeffs[c] = sum / (2 * N * (N + 1) * (2 * N + 1) / 6);
                }
                deltas.push(delta);
            }
            return deltas;
        };
        
        // Apply liftering
        const applyLifter = (value, coeff, L) => {
            if (L === 0) return value;
            const lifterCoeff = 1 + (L / 2) * Math.sin(Math.PI * coeff / L);
            return value * lifterCoeff;
        };
        
        // Process MFCCs with options
        const processMFCCs = (mfccs) => {
            let processed = mfccs.map(frame => ({
                time: frame.time,
                coeffs: frame.coeffs.slice()
            }));
            
            // Apply liftering
            if (lifter > 0) {
                processed = processed.map(frame => ({
                    time: frame.time,
                    coeffs: frame.coeffs.map((v, c) => applyLifter(v, c, lifter))
                }));
            }
            
            return processed;
        };
        
        let processedNative = processMFCCs(native);
        let processedUser = processMFCCs(user);
        
        // Compute deltas if needed
        let nativeDeltas = showDelta ? computeDeltas(processedNative) : null;
        let userDeltas = showDelta ? computeDeltas(processedUser) : null;
        let nativeDeltaDeltas = showDeltaDelta && nativeDeltas ? computeDeltas(nativeDeltas) : null;
        let userDeltaDeltas = showDeltaDelta && userDeltas ? computeDeltas(userDeltas) : null;
        
        // Apply zoom X (show only first portion)
        const nativeFrames = Math.floor(processedNative.length / zoomX);
        const userFrames = Math.floor(processedUser.length / zoomX);
        processedNative = processedNative.slice(0, nativeFrames);
        processedUser = processedUser.slice(0, userFrames);
        if (nativeDeltas) nativeDeltas = nativeDeltas.slice(0, nativeFrames);
        if (userDeltas) userDeltas = userDeltas.slice(0, userFrames);
        if (nativeDeltaDeltas) nativeDeltaDeltas = nativeDeltaDeltas.slice(0, nativeFrames);
        if (userDeltaDeltas) userDeltaDeltas = userDeltaDeltas.slice(0, userFrames);
        
        const numCoeffs = coeffEnd - coeffStart + 1;
        const offsetX = 100;
        const offsetY = 25;
        const plotWidth = width - offsetX - 40;
        const plotHeight = (height - 100) / 3 - 5;
        
        // Find normalization values
        let maxVal = 0;
        let binMax = {};
        let allValues = [];
        
        const collectValues = (mfccs) => {
            mfccs.forEach(frame => {
                for (let c = coeffStart; c <= coeffEnd; c++) {
                    const val = frame.coeffs[c] || 0;
                    allValues.push(Math.abs(val));
                    maxVal = Math.max(maxVal, Math.abs(val));
                    if (!binMax[c]) binMax[c] = 0;
                    binMax[c] = Math.max(binMax[c], Math.abs(val));
                }
            });
        };
        
        collectValues(processedNative);
        collectValues(processedUser);
        
        // Calculate filter threshold
        let threshold = 0;
        if (filterMode === 'percentile' && allValues.length > 0) {
            const sorted = allValues.slice().sort((a, b) => a - b);
            const idx = Math.floor(sorted.length * (1 - filterValue / 100));
            threshold = sorted[Math.max(0, idx)];
        } else if (filterMode === 'statistical' && allValues.length > 0) {
            const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
            const variance = allValues.reduce((a, b) => a + (b - mean) ** 2, 0) / allValues.length;
            const stdDev = Math.sqrt(variance);
            threshold = mean + filterValue * stdDev;
        }
        
        // Color mapping function
        const getColor = (normalized) => {
            switch (colormap) {
                case 'viridis':
                    return this.viridisColor(normalized);
                case 'plasma':
                    return this.plasmaColor(normalized);
                case 'grayscale':
                    const g = Math.floor(normalized * 255);
                    return `rgb(${g}, ${g}, ${g})`;
                case 'jet':
                    return this.jetColor(normalized);
                case 'bluered':
                default:
                    return this.mfccToColor(normalized);
            }
        };
        
        // Draw MFCC panel
        const drawPanel = (mfccs, panelY, label, labelColor) => {
            const cellWidth = plotWidth / mfccs.length;
            const cellHeight = plotHeight / numCoeffs;
            
            mfccs.forEach((frame, i) => {
                for (let c = coeffStart; c <= coeffEnd; c++) {
                    let val = frame.coeffs[c] || 0;
                    
                    // Apply per-bin normalization or global
                    let normalizer = perBinNorm ? (binMax[c] || 1) : maxVal;
                    if (normalizer === 0) normalizer = 1;
                    
                    let normVal = val / normalizer;
                    
                    // Apply filter
                    if (filterMode !== 'none' && Math.abs(val) < threshold) {
                        normVal = 0;
                    }
                    
                    // Apply zoom Y
                    normVal *= zoomY;
                    normVal = Math.max(-1, Math.min(1, normVal));
                    
                    // Map to 0-1 for colormap
                    let colorVal;
                    if (symmetric) {
                        colorVal = (normVal + 1) / 2;
                    } else {
                        colorVal = (normVal + 1) / 2;
                    }
                    
                    const color = getColor(colorVal);
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(
                        offsetX + i * cellWidth,
                        panelY + (coeffEnd - c) * cellHeight,
                        Math.max(1, cellWidth),
                        cellHeight
                    );
                }
            });
            
            // Label
            this.ctx.fillStyle = labelColor;
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(label, offsetX, panelY - 8);
        };
        
        // Draw native panel
        drawPanel(processedNative, offsetY, 'Native Speaker', '#3B82F6');
        
        // Draw user panel
        const userOffsetY = offsetY + plotHeight + 25;
        drawPanel(processedUser, userOffsetY, 'Your Recording', '#EF4444');
        
        // Draw difference panel
        const diffOffsetY = userOffsetY + plotHeight + 25;
        const numFrames = Math.min(processedNative.length, processedUser.length);
        const diffCellWidth = plotWidth / numFrames;
        const cellHeight = plotHeight / numCoeffs;
        
        for (let i = 0; i < numFrames; i++) {
            const nativeIdx = Math.floor(i * processedNative.length / numFrames);
            const userIdx = Math.floor(i * processedUser.length / numFrames);
            
            for (let c = coeffStart; c <= coeffEnd; c++) {
                let normalizer = perBinNorm ? (binMax[c] || 1) : maxVal;
                if (normalizer === 0) normalizer = 1;
                
                const nativeVal = (processedNative[nativeIdx].coeffs[c] || 0) / normalizer;
                const userVal = (processedUser[userIdx].coeffs[c] || 0) / normalizer;
                const diff = (nativeVal - userVal + 1) / 2;
                
                this.ctx.fillStyle = this.differenceToColor(diff);
                this.ctx.fillRect(
                    offsetX + i * diffCellWidth,
                    diffOffsetY + (coeffEnd - c) * cellHeight,
                    Math.max(1, diffCellWidth),
                    cellHeight
                );
            }
        }
        
        this.ctx.fillStyle = '#10B981';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Difference (Native - User)', offsetX, diffOffsetY - 8);
        
        // Y-axis labels
        this.ctx.fillStyle = 'rgba(209, 213, 219, 0.9)';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'right';
        for (let c = coeffStart; c <= coeffEnd; c++) {
            const y2 = userOffsetY + (coeffEnd - c + 0.5) * cellHeight;
            this.ctx.fillText(`c${c}`, offsetX - 5, y2 + 3);
        }
        
        // X-axis label
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Time (frames)', width / 2, height - 8);
        
        // Color scale legend
        const legendX = width - 30;
        const legendY = diffOffsetY;
        const legendHeight = plotHeight;
        
        for (let i = 0; i < legendHeight; i++) {
            const normalized = 1 - i / legendHeight;
            this.ctx.fillStyle = this.differenceToColor(normalized);
            this.ctx.fillRect(legendX, legendY + i, 12, 1);
        }
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('+', legendX + 15, legendY + 5);
        this.ctx.fillText('0', legendX + 15, legendY + legendHeight / 2 + 3);
        this.ctx.fillText('-', legendX + 15, legendY + legendHeight);
    }
    
    // Additional colormap functions
    viridisColor(t) {
        const c0 = [0.267004, 0.004874, 0.329415];
        const c1 = [0.282327, 0.140926, 0.457517];
        const c2 = [0.253935, 0.265254, 0.529983];
        const c3 = [0.206756, 0.371758, 0.553117];
        const c4 = [0.163625, 0.471133, 0.558148];
        const c5 = [0.127568, 0.566949, 0.550556];
        const c6 = [0.134692, 0.658636, 0.517649];
        const c7 = [0.266941, 0.748751, 0.440573];
        const c8 = [0.477504, 0.821444, 0.318195];
        const c9 = [0.741388, 0.873449, 0.149561];
        const c10 = [0.993248, 0.906157, 0.143936];
        
        const colors = [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10];
        const idx = t * (colors.length - 1);
        const i = Math.floor(idx);
        const f = idx - i;
        
        if (i >= colors.length - 1) {
            return `rgb(${Math.floor(c10[0]*255)}, ${Math.floor(c10[1]*255)}, ${Math.floor(c10[2]*255)})`;
        }
        
        const r = Math.floor((colors[i][0] * (1 - f) + colors[i + 1][0] * f) * 255);
        const g = Math.floor((colors[i][1] * (1 - f) + colors[i + 1][1] * f) * 255);
        const b = Math.floor((colors[i][2] * (1 - f) + colors[i + 1][2] * f) * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    plasmaColor(t) {
        const c0 = [0.050383, 0.029803, 0.527975];
        const c1 = [0.254627, 0.013882, 0.615419];
        const c2 = [0.417642, 0.000564, 0.658390];
        const c3 = [0.562738, 0.051545, 0.641509];
        const c4 = [0.692840, 0.165141, 0.564522];
        const c5 = [0.798216, 0.280197, 0.469538];
        const c6 = [0.881443, 0.392529, 0.383229];
        const c7 = [0.949217, 0.517763, 0.295662];
        const c8 = [0.988648, 0.652325, 0.211364];
        const c9 = [0.988648, 0.809579, 0.145357];
        const c10 = [0.940015, 0.975158, 0.131326];
        
        const colors = [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10];
        const idx = t * (colors.length - 1);
        const i = Math.floor(idx);
        const f = idx - i;
        
        if (i >= colors.length - 1) {
            return `rgb(${Math.floor(c10[0]*255)}, ${Math.floor(c10[1]*255)}, ${Math.floor(c10[2]*255)})`;
        }
        
        const r = Math.floor((colors[i][0] * (1 - f) + colors[i + 1][0] * f) * 255);
        const g = Math.floor((colors[i][1] * (1 - f) + colors[i + 1][1] * f) * 255);
        const b = Math.floor((colors[i][2] * (1 - f) + colors[i + 1][2] * f) * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    jetColor(t) {
        let r, g, b;
        if (t < 0.125) {
            r = 0; g = 0; b = 0.5 + t * 4;
        } else if (t < 0.375) {
            r = 0; g = (t - 0.125) * 4; b = 1;
        } else if (t < 0.625) {
            r = (t - 0.375) * 4; g = 1; b = 1 - (t - 0.375) * 4;
        } else if (t < 0.875) {
            r = 1; g = 1 - (t - 0.625) * 4; b = 0;
        } else {
            r = 1 - (t - 0.875) * 4; g = 0; b = 0;
        }
        return `rgb(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)})`;
    }
    
    mfccToColor(normalized) {
        // Blue -> White -> Red colormap
        if (normalized < 0.5) {
            const t = normalized * 2;
            const r = Math.floor(t * 255);
            const g = Math.floor(t * 255);
            const b = 255;
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const t = (normalized - 0.5) * 2;
            const r = 255;
            const g = Math.floor((1 - t) * 255);
            const b = Math.floor((1 - t) * 255);
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    
    drawAllFeatures(results) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, width, height);
        
        // 3x2 grid
        const cols = 3;
        const rows = 2;
        const padding = 8;
        const panelWidth = (width - padding * (cols + 1)) / cols;
        const panelHeight = (height - padding * (rows + 1)) / rows;
        
        // Row 1: Waveform, Spectrum, Spectrogram
        this.drawMiniWaveform(results, padding, padding, panelWidth, panelHeight);
        this.drawMiniSpectrum(results, padding * 2 + panelWidth, padding, panelWidth, panelHeight);
        this.drawMiniSpectrogram(results, padding * 3 + panelWidth * 2, padding, panelWidth, panelHeight);
        
        // Row 2: Pitch, MFCCs, Intensity
        this.drawMiniPitch(results, padding, padding * 2 + panelHeight, panelWidth, panelHeight);
        this.drawMiniMFCCs(results, padding * 2 + panelWidth, padding * 2 + panelHeight, panelWidth, panelHeight);
        this.drawMiniIntensity(results, padding * 3 + panelWidth * 2, padding * 2 + panelHeight, panelWidth, panelHeight);
    }
    
    drawMiniWaveform(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Waveform', x + 8, y + 16);

        const nativeBuffer = results.nativeBuffer;
        const userBuffer = results.userBuffer;
        if (!nativeBuffer || !userBuffer) return;

        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;

        const nativeData = nativeBuffer.getChannelData(0);
        const userData = userBuffer.getChannelData(0);
        
        // Draw native waveform
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const nativeStep = Math.ceil(nativeData.length / plotWidth);
        for (let i = 0; i < plotWidth; i++) {
            const idx = i * nativeStep;
            const val = nativeData[idx] || 0;
            const py = offsetY + plotHeight / 2 - val * plotHeight / 2;
            if (i === 0) this.ctx.moveTo(offsetX + i, py);
            else this.ctx.lineTo(offsetX + i, py);
        }
        this.ctx.stroke();
        
        // Draw user waveform
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        this.ctx.beginPath();
        const userStep = Math.ceil(userData.length / plotWidth);
        for (let i = 0; i < plotWidth; i++) {
            const idx = i * userStep;
            const val = userData[idx] || 0;
            const py = offsetY + plotHeight / 2 - val * plotHeight / 2;
            if (i === 0) this.ctx.moveTo(offsetX + i, py);
            else this.ctx.lineTo(offsetX + i, py);
        }
        this.ctx.stroke();
    }
    
    drawMiniSpectrum(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Spectrum (FFT)', x + 8, y + 16);

        const nativeBuffer = results.nativeBuffer;
        const userBuffer = results.userBuffer;
        if (!nativeBuffer || !userBuffer) return;

        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;

        // Compute simplified spectrum for mini view
        let nativeSpectrum, userSpectrum;

        // Fast simplified spectrum - just one frame from middle
        const computeQuickSpectrum = (buffer) => {
                const data = buffer.getChannelData(0);
                const fftSize = 512;
                const start = Math.floor(data.length / 2) - fftSize / 2;
                const numBins = 128;
                const spectrum = new Float32Array(numBins);
                
                // Simple DFT on reduced bins
                for (let k = 0; k < numBins; k++) {
                    let real = 0, imag = 0;
                    const freq = k * (fftSize / 2) / numBins;
                    for (let n = 0; n < fftSize; n++) {
                        const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (fftSize - 1));
                        const sample = data[start + n] * window;
                        const angle = 2 * Math.PI * freq * n / fftSize;
                        real += sample * Math.cos(angle);
                        imag -= sample * Math.sin(angle);
                    }
                    spectrum[k] = Math.sqrt(real * real + imag * imag);
                }
                return spectrum;
            };
            
            nativeSpectrum = computeQuickSpectrum(nativeBuffer);
            userSpectrum = computeQuickSpectrum(userBuffer);
        }
        
        // Downsample for display
        const displayBins = Math.min(plotWidth, nativeSpectrum.length);
        const binSize = Math.floor(nativeSpectrum.length / displayBins);
        
        const nativeDisplay = [];
        const userDisplay = [];
        for (let i = 0; i < displayBins; i++) {
            const idx = Math.floor(i * nativeSpectrum.length / displayBins);
            nativeDisplay.push(nativeSpectrum[idx]);
            userDisplay.push(userSpectrum[idx]);
        }
        
        const maxVal = Math.max(...nativeDisplay, ...userDisplay, 0.001);
        
        // Draw native spectrum
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        nativeDisplay.forEach((val, i) => {
            const px = offsetX + (i / displayBins) * plotWidth;
            const py = offsetY + plotHeight - (val / maxVal) * plotHeight;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
        
        // Draw user spectrum
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        this.ctx.beginPath();
        userDisplay.forEach((val, i) => {
            const px = offsetX + (i / displayBins) * plotWidth;
            const py = offsetY + plotHeight - (val / maxVal) * plotHeight;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
    }
    
    drawMiniSpectrogram(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Spectrogram', x + 8, y + 16);

        const nativeBuffer = results.nativeBuffer;
        if (!nativeBuffer) return;

        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;

        const data = nativeBuffer.getChannelData(0);
        const fftSize = 128; // Smaller for speed
        const numCols = Math.min(plotWidth, 100); // Limit columns
        const hopSize = Math.floor(data.length / numCols);
        const numBins = 24; // Fewer frequency bins
        
        const frameWidth = plotWidth / numCols;
        const binHeight = plotHeight / numBins;
        
        for (let col = 0; col < numCols; col++) {
            const start = col * hopSize;
            if (start + fftSize > data.length) break;
            
            // Compute simplified spectrum
            const spectrum = new Float32Array(numBins);
            for (let k = 0; k < numBins; k++) {
                let real = 0, imag = 0;
                const freq = k * (fftSize / 2) / numBins;
                for (let n = 0; n < fftSize; n++) {
                    const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (fftSize - 1));
                    const sample = data[start + n] * window;
                    const angle = 2 * Math.PI * freq * n / fftSize;
                    real += sample * Math.cos(angle);
                    imag -= sample * Math.sin(angle);
                }
                spectrum[k] = Math.sqrt(real * real + imag * imag);
            }
            
            // Draw each frequency bin
            for (let bin = 0; bin < numBins; bin++) {
                const magnitude = spectrum[bin];
                const db = 20 * Math.log10(magnitude + 1e-10);
                const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
                
                this.ctx.fillStyle = this.intensityToColor(normalized);
                const yPos = offsetY + plotHeight - ((bin + 1) * binHeight);
                this.ctx.fillRect(
                    offsetX + (col * frameWidth),
                    yPos,
                    frameWidth + 1,
                    binHeight + 1
                );
            }
        }
    }
    
    drawMiniMFCCs(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('MFCCs', x + 8, y + 16);
        
        const native = results.features.nativeMFCCs;
        const user = results.features.userMFCCs;
        
        if (!native || !user || native.length === 0) return;
        
        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;
        
        const numCoeffs = Math.min(12, native[0].coeffs.length - 1); // Skip c0
        
        // Draw MFCC heatmap for native (top half)
        const nativeHeight = plotHeight / 2 - 2;
        const cellWidth = plotWidth / native.length;
        const cellHeight = nativeHeight / numCoeffs;
        
        // Find max value for normalization
        let maxVal = 0;
        native.forEach(frame => {
            for (let c = 1; c <= numCoeffs; c++) {
                maxVal = Math.max(maxVal, Math.abs(frame.coeffs[c]));
            }
        });
        user.forEach(frame => {
            for (let c = 1; c <= numCoeffs; c++) {
                maxVal = Math.max(maxVal, Math.abs(frame.coeffs[c]));
            }
        });
        
        // Draw native MFCCs
        native.forEach((frame, i) => {
            for (let c = 1; c <= numCoeffs; c++) {
                const val = frame.coeffs[c] / maxVal;
                const normalized = (val + 1) / 2; // Map -1..1 to 0..1
                const color = this.mfccToColor(normalized);
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(
                    offsetX + i * cellWidth,
                    offsetY + (numCoeffs - c) * cellHeight,
                    Math.max(1, cellWidth),
                    cellHeight
                );
            }
        });
        
        // Draw user MFCCs (bottom half)
        const userCellWidth = plotWidth / user.length;
        user.forEach((frame, i) => {
            for (let c = 1; c <= numCoeffs; c++) {
                const val = frame.coeffs[c] / maxVal;
                const normalized = (val + 1) / 2;
                const color = this.mfccToColor(normalized);
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(
                    offsetX + i * userCellWidth,
                    offsetY + nativeHeight + 4 + (numCoeffs - c) * cellHeight,
                    Math.max(1, userCellWidth),
                    cellHeight
                );
            }
        });
        
        // Labels
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        this.ctx.font = '9px sans-serif';
        this.ctx.fillText('Native', x + width - 45, y + 16);
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        this.ctx.fillText('User', x + width - 45, offsetY + nativeHeight + plotHeight / 2);
    }
    
    drawMiniPitch(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Pitch Contour', x + 8, y + 16);
        
        const native = results.features.nativePitch;
        const user = results.features.userPitch;
        
        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;
        
        // Auto-calculate pitch range
        const nativePitches = native.filter(p => p.pitch > 0).map(p => p.pitch);
        const userPitches = user.filter(p => p.pitch > 0).map(p => p.pitch);
        const allPitches = [...nativePitches, ...userPitches];
        
        let minPitch = 50, maxPitch = 400;
        if (allPitches.length > 0) {
            const dataMin = Math.min(...allPitches);
            const dataMax = Math.max(...allPitches);
            const range = dataMax - dataMin;
            const padding = range * 0.111;
            minPitch = Math.max(50, dataMin - padding);
            maxPitch = dataMax + padding;
        }
        
        const maxTime = Math.max(native[native.length - 1].time, user[user.length - 1].time);
        
        // Draw native pitch
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        let started = false;
        native.forEach(p => {
            if (p.pitch > 0) {
                const px = offsetX + (p.time / maxTime) * plotWidth;
                const py = offsetY + plotHeight - ((p.pitch - minPitch) / (maxPitch - minPitch)) * plotHeight;
                if (!started) { this.ctx.moveTo(px, py); started = true; }
                else this.ctx.lineTo(px, py);
            }
        });
        this.ctx.stroke();
        
        // Draw user pitch
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        this.ctx.beginPath();
        started = false;
        user.forEach(p => {
            if (p.pitch > 0) {
                const px = offsetX + (p.time / maxTime) * plotWidth;
                const py = offsetY + plotHeight - ((p.pitch - minPitch) / (maxPitch - minPitch)) * plotHeight;
                if (!started) { this.ctx.moveTo(px, py); started = true; }
                else this.ctx.lineTo(px, py);
            }
        });
        this.ctx.stroke();
    }
    
    drawMiniIntensity(results, x, y, width, height) {
        this.ctx.fillStyle = 'rgba(55, 65, 81, 0.5)';
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Intensity/Energy', x + 8, y + 16);
        
        const native = results.features.nativeIntensity;
        const user = results.features.userIntensity;
        
        const plotWidth = width - 16;
        const plotHeight = height - 28;
        const offsetX = x + 8;
        const offsetY = y + 22;
        
        const barWidth = plotWidth / Math.max(native.length, user.length);
        const maxIntensity = Math.max(
            ...native.map(d => d.intensity),
            ...user.map(d => d.intensity)
        );
        
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        native.forEach((p, i) => {
            const barHeight = (p.intensity / maxIntensity) * (plotHeight / 2);
            this.ctx.fillRect(
                offsetX + (i / native.length) * plotWidth,
                offsetY + plotHeight / 2 - barHeight,
                Math.max(1, barWidth * 0.8),
                barHeight
            );
        });
        
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        user.forEach((p, i) => {
            const barHeight = (p.intensity / maxIntensity) * (plotHeight / 2);
            this.ctx.fillRect(
                offsetX + (i / user.length) * plotWidth,
                offsetY + plotHeight / 2,
                Math.max(1, barWidth * 0.8),
                barHeight
            );
        });
    }
}

/**
 * Default visualization configuration
 * Handles all display preferences and scaling options
 */
export const defaultVisualizerConfig = {
    displayMode: 'overlay',           // 'overlay' or 'stacked'
    amplitude: 'linear',              // 'linear' or 'db'
    waveformNormalization: 'independent', // 'independent' or 'shared'
    waveformMode: 'bipolar',          // 'bipolar' or 'envelope'
    waveformDownsample: 'minmax',     // 'minmax', 'max', or 'avg'
    waveformFilterMode: 'none',       // 'none', 'threshold', 'rms', 'percentile'
    waveformThreshold: 0.01,
    waveformRmsWindow: 100,
    waveformPercentile: 95,
    waveformTimeStart: 0,
    waveformTimeEnd: 1,
    waveformZoomX: 1,
    waveformZoomY: 1,
    
    // Spectrogram settings
    zoomX: 1,
    zoomY: 1,
    colormap: 'viridis',              // 'viridis', 'plasma', 'jet'
    spectrogramMode: 'native',        // 'native', 'user', 'difference'
    
    // MFCC settings
    mfccNumFilters: 60,
    mfccColormap: 'viridis',
    mfccNormalization: 'independent',
    mfccTimeStart: 0,
    mfccTimeEnd: 1,
    mfccZoomX: 1,
    
    // Pitch settings
    pitchYMin: 50,
    pitchYMax: 500,
    
    // General settings
    showGrid: true,
    showLabels: true
};

/**
 * Create a new Visualizer instance with optional configuration
 * @param {HTMLCanvasElement} canvas - Canvas element for rendering
 * @param {Object} config - Optional configuration object
 * @returns {Visualizer} Configured visualizer instance
 */
export function createVisualizer(canvas, config = {}) {
    const viz = new Visualizer(canvas);
    viz.config = { ...defaultVisualizerConfig, ...config };
    return viz;
}

/**
 * Helper function to get/set visualization preferences
 * This is a compatibility layer for the global scalePreferences variable
 * In a modular setup, pass config to the Visualizer constructor instead
 */
export function getVisualizerPreferences() {
    if (typeof window !== 'undefined' && window.scalePreferences) {
return window.scalePreferences;
    }
    return defaultVisualizerConfig;
}
