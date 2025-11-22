/**
 * DTW MODULE
 * Dynamic Time Warping for tempo-invariant sequence alignment
 */

export class DTW {
    /**
     * Compute 1D Dynamic Time Warping distance between two sequences
     * @param {Array} seq1 - First sequence (numeric array)
     * @param {Array} seq2 - Second sequence (numeric array)
     * @param {number} window - Sakoe-Chiba band constraint (0 = no constraint)
     * @returns {Object} DTW distance and cost matrix
     */
    static compute1D(seq1, seq2, window = 20) {
        const n = seq1.length;
        const m = seq2.length;
        
        // Initialize cost matrix with infinity
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        // Apply Sakoe-Chiba band constraint
        const effectiveWindow = window > 0 ? window : Math.max(n, m);
        
        // Fill cost matrix with dynamic programming
        for (let i = 1; i <= n; i++) {
            // Only compute within the band window
            const jStart = Math.max(1, Math.floor(i * m / n) - effectiveWindow);
            const jEnd = Math.min(m, Math.floor(i * m / n) + effectiveWindow);
            
            for (let j = jStart; j <= jEnd; j++) {
                // Local distance
                const distance = Math.abs(seq1[i-1] - seq2[j-1]);
                
                // Find minimum cumulative cost from three predecessors
                const cost1 = cost[i-1][j];     // Insertion
                const cost2 = cost[i][j-1];     // Deletion
                const cost3 = cost[i-1][j-1];   // Match
                
                cost[i][j] = distance + Math.min(cost1, cost2, cost3);
            }
        }
        
        const totalDistance = cost[n][m];
        const pathLength = n + m;
        const normalizedDistance = totalDistance / pathLength;
        
        return {
            distance: totalDistance,
            normalizedDistance: normalizedDistance,
            cost: cost
        };
    }
    
    /**
     * Compute multi-dimensional DTW for formant or feature vectors
     * @param {Array} seq1 - First sequence (array of objects with f1, f2, f3)
     * @param {Array} seq2 - Second sequence (array of objects with f1, f2, f3)
     * @param {Object} weights - Weights for each dimension {f1, f2, f3}
     * @param {number} window - Sakoe-Chiba band constraint
     * @param {Object} debugLog - Optional debug logger
     * @returns {Object} DTW distance
     */
    static computeMultiDim(seq1, seq2, weights = {f1: 1.0, f2: 0.8, f3: 0.6}, window = 20, debugLog = null) {
        const n = seq1.length;
        const m = seq2.length;
        
        if (debugLog) {
            debugLog.log(`DTW.computeMultiDim: n=${n}, m=${m}`);
        }
        
        // Validate input sequences
        this.validateMultiDimSequence(seq1, 'seq1', debugLog);
        this.validateMultiDimSequence(seq2, 'seq2', debugLog);
        
        // Initialize cost matrix
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        const effectiveWindow = window > 0 ? window : Math.max(n, m);
        
        // Weighted Euclidean distance function
        const weightedDistance = (p1, p2) => {
            const d1 = weights.f1 * (p1.f1 - p2.f1);
            const d2 = weights.f2 * (p1.f2 - p2.f2);
            const d3 = weights.f3 * (p1.f3 - p2.f3);
            return Math.sqrt(d1*d1 + d2*d2 + d3*d3);
        };
        
        // Fill cost matrix
        for (let i = 1; i <= n; i++) {
            const jStart = Math.max(1, Math.floor(i * m / n) - effectiveWindow);
            const jEnd = Math.min(m, Math.floor(i * m / n) + effectiveWindow);
            
            for (let j = jStart; j <= jEnd; j++) {
                const distance = weightedDistance(seq1[i-1], seq2[j-1]);
                
                cost[i][j] = distance + Math.min(
                    cost[i-1][j],     // Insertion
                    cost[i][j-1],     // Deletion
                    cost[i-1][j-1]    // Match
                );
            }
        }
        
        const totalDistance = cost[n][m];
        const pathLength = n + m;
        const normalizedDistance = totalDistance / pathLength;
        
        if (debugLog) {
            debugLog.log(`DTW distance: ${totalDistance.toFixed(2)}, normalized: ${normalizedDistance.toFixed(4)}`);
        }
        
        return {
            distance: totalDistance,
            normalizedDistance: normalizedDistance
        };
    }

    /**
     * Validate multi-dimensional sequence data
     * @param {Array} seq - Sequence to validate
     * @param {string} name - Sequence name for error messages
     * @param {Object} debugLog - Optional debug logger
     * @throws {Error} If sequence is invalid
     */
    static validateMultiDimSequence(seq, name, debugLog = null) {
        for (let i = 0; i < seq.length; i++) {
            if (!seq[i]) {
                const error = `${name}[${i}] is ${seq[i]}`;
                if (debugLog) debugLog.log(`ERROR: ${error}`, 'error');
                throw new Error(error);
            }
            
            if (typeof seq[i].f1 !== 'number' || 
                typeof seq[i].f2 !== 'number' || 
                typeof seq[i].f3 !== 'number') {
                const error = `${name}[${i}] has invalid formant data: f1=${seq[i].f1}, f2=${seq[i].f2}, f3=${seq[i].f3}`;
                if (debugLog) debugLog.log(`ERROR: ${error}`, 'error');
                throw new Error(error);
            }
        }
    }

    /**
     * Recover optimal alignment path from cost matrix
     * @param {Array} costMatrix - DTW cost matrix
     * @returns {Array} Alignment path as array of [i, j] pairs
     */
    static recoverPath(costMatrix) {
        const n = costMatrix.length - 1;
        const m = costMatrix[0].length - 1;
        const path = [];
        
        let i = n;
        let j = m;
        
        path.push([i, j]);
        
        while (i > 0 || j > 0) {
            if (i === 0) {
                j--;
            } else if (j === 0) {
                i--;
            } else {
                // Choose minimum predecessor
                const costs = [
                    costMatrix[i-1][j-1],  // Diagonal
                    costMatrix[i-1][j],    // Up
                    costMatrix[i][j-1]     // Left
                ];
                const minCost = Math.min(...costs);
                
                if (minCost === costs[0]) {
                    i--;
                    j--;
                } else if (minCost === costs[1]) {
                    i--;
                } else {
                    j--;
                }
            }
            path.push([i, j]);
        }
        
        return path.reverse();
    }

    /**
     * Compute DTW distance with custom distance function
     * @param {Array} seq1 - First sequence
     * @param {Array} seq2 - Second sequence
     * @param {Function} distanceFn - Custom distance function(elem1, elem2)
     * @param {number} window - Sakoe-Chiba band constraint
     * @returns {Object} DTW distance
     */
    static computeCustom(seq1, seq2, distanceFn, window = 20) {
        const n = seq1.length;
        const m = seq2.length;
        
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        const effectiveWindow = window > 0 ? window : Math.max(n, m);
        
        for (let i = 1; i <= n; i++) {
            const jStart = Math.max(1, Math.floor(i * m / n) - effectiveWindow);
            const jEnd = Math.min(m, Math.floor(i * m / n) + effectiveWindow);
            
            for (let j = jStart; j <= jEnd; j++) {
                const distance = distanceFn(seq1[i-1], seq2[j-1]);
                
                cost[i][j] = distance + Math.min(
                    cost[i-1][j],
                    cost[i][j-1],
                    cost[i-1][j-1]
                );
            }
        }
        
        const totalDistance = cost[n][m];
        const pathLength = n + m;
        const normalizedDistance = totalDistance / pathLength;
        
        return {
            distance: totalDistance,
            normalizedDistance: normalizedDistance,
            cost: cost
        };
    }

    /**
     * Compute DTW with step pattern constraints
     * @param {Array} seq1 - First sequence
     * @param {Array} seq2 - Second sequence
     * @param {string} stepPattern - Step pattern: 'symmetric1', 'symmetric2', 'asymmetric'
     * @returns {Object} DTW distance
     */
    static computeWithStepPattern(seq1, seq2, stepPattern = 'symmetric1') {
        const n = seq1.length;
        const m = seq2.length;
        
        const cost = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        cost[0][0] = 0;
        
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const distance = Math.abs(seq1[i-1] - seq2[j-1]);
                
                let minCost;
                if (stepPattern === 'symmetric1') {
                    // Standard symmetric pattern
                    minCost = Math.min(
                        cost[i-1][j],
                        cost[i][j-1],
                        cost[i-1][j-1]
                    );
                } else if (stepPattern === 'symmetric2') {
                    // P=1, Q=1 symmetric pattern
                    minCost = Math.min(
                        cost[i-1][j] + distance,
                        cost[i][j-1] + distance,
                        cost[i-1][j-1] + 2 * distance
                    ) - distance; // Subtract to avoid double counting
                } else if (stepPattern === 'asymmetric') {
                    // Asymmetric pattern (Rabiner-Juang)
                    minCost = Math.min(
                        cost[i-1][j],
                        cost[i-1][j-1],
                        cost[i-1][j-2] !== undefined ? cost[i-1][j-2] : Infinity
                    );
                } else {
                    minCost = Math.min(cost[i-1][j], cost[i][j-1], cost[i-1][j-1]);
                }
                
                cost[i][j] = distance + minCost;
            }
        }
        
        return {
            distance: cost[n][m],
            normalizedDistance: cost[n][m] / (n + m)
        };
    }
}
