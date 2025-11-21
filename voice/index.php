<?php
// Voice Pronunciation Practice
// Loads audio files from ../assets directory
session_start();

// Load manifest
$manifestPath = __DIR__ . '/../assets/manifest.json';
$manifest = json_decode(file_get_contents($manifestPath), true);

// Get available cards (Cebuano only for now)
$cards = $manifest['cards']['ceb'] ?? [];

// Build word list with audio file paths
$wordList = [];
foreach ($cards as $card) {
    $cardNum = $card['cardNum'];
    $word = $card['word'];
    $english = $card['english'];
    $lesson = $card['lesson'];

    // Check if audio file exists
    $audioFile = "../assets/{$cardNum}.ceb." . strtolower($word) . ".m4a";

    if (file_exists(__DIR__ . '/' . $audioFile)) {
        $wordList[] = [
            'cardNum' => $cardNum,
            'word' => $word,
            'english' => $english,
            'lesson' => $lesson,
            'audioPath' => $audioFile
        ];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pronunciation Practice - WSOL</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #1f2937;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 16px;
        }

        .back-link {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }

        .back-link:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .content {
            padding: 40px;
        }

        .word-selector {
            margin-bottom: 30px;
            padding: 20px;
            background: #f3f4f6;
            border-radius: 12px;
        }

        .word-selector h3 {
            margin-bottom: 15px;
            color: #374151;
        }

        .selector-controls {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .selector-controls select,
        .selector-controls input {
            padding: 10px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            background: white;
        }

        .selector-controls select {
            flex: 1;
            min-width: 200px;
        }

        .selector-controls input {
            flex: 2;
            min-width: 250px;
        }

        .word-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
            padding: 10px;
            background: white;
            border-radius: 8px;
        }

        .word-item {
            padding: 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }

        .word-item:hover {
            border-color: #667eea;
            background: #f3f4f6;
            transform: translateY(-2px);
        }

        .word-item.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .word-item .word {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .word-item .english {
            font-size: 14px;
            opacity: 0.7;
        }

        .word-item .lesson {
            font-size: 11px;
            margin-top: 5px;
            opacity: 0.6;
        }

        .word-display {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-radius: 15px;
            border: 2px solid #86efac;
        }

        .word-display h2 {
            font-size: 48px;
            color: #059669;
            margin-bottom: 10px;
        }

        .word-display p {
            font-size: 20px;
            color: #6b7280;
        }

        .word-display.hidden {
            display: none;
        }

        .practice-section {
            display: none;
            margin-top: 30px;
        }

        .practice-section.active {
            display: block;
        }

        .file-loaded {
            display: none;
            background: #f0fdf4;
            border: 2px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .file-loaded.show {
            display: block;
        }

        .file-loaded-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .file-icon {
            width: 50px;
            height: 50px;
            background: #059669;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .file-icon.user {
            background: #dc2626;
        }

        .play-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .play-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .play-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .controls {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
            margin: 30px 0;
        }

        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-secondary {
            background: #6b7280;
            color: white;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .results {
            display: none;
            margin-top: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-radius: 15px;
            border: 2px solid #86efac;
        }

        .results.show {
            display: block;
        }

        .score-display {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 30px;
            align-items: center;
            margin-bottom: 30px;
        }

        .score-circle {
            position: relative;
            width: 200px;
            height: 200px;
        }

        .score-circle svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }

        .score-bg {
            fill: none;
            stroke: #e5e7eb;
            stroke-width: 8;
        }

        .score-fill {
            fill: none;
            stroke: #059669;
            stroke-width: 8;
            stroke-linecap: round;
            transition: stroke-dashoffset 1s ease;
        }

        .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: 700;
            color: #059669;
        }

        .score-info h3 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #059669;
        }

        .score-info p {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.6;
        }

        .canvas-container {
            background: #1f2937;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
        }

        #vizCanvas {
            width: 100%;
            height: auto;
            display: block;
            border-radius: 10px;
        }

        @media (max-width: 768px) {
            .score-display {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .word-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="../index.php" class="back-link">← Back to Main</a>
            <h1>🎤 Pronunciation Practice</h1>
            <p>Practice your pronunciation with native speaker audio</p>
        </div>

        <div class="content">
            <!-- Word Selector -->
            <div class="word-selector">
                <h3>Select a Word to Practice</h3>
                <div class="selector-controls">
                    <select id="lessonFilter">
                        <option value="">All Lessons</option>
                        <?php
                        $lessons = array_unique(array_column($wordList, 'lesson'));
                        sort($lessons);
                        foreach ($lessons as $lesson) {
                            echo "<option value=\"$lesson\">Lesson $lesson</option>";
                        }
                        ?>
                    </select>
                    <input type="text" id="searchInput" placeholder="Search words...">
                </div>
                <div class="word-grid" id="wordGrid">
                    <?php foreach ($wordList as $item): ?>
                        <div class="word-item"
                             data-card-num="<?php echo $item['cardNum']; ?>"
                             data-word="<?php echo htmlspecialchars($item['word']); ?>"
                             data-english="<?php echo htmlspecialchars($item['english']); ?>"
                             data-lesson="<?php echo $item['lesson']; ?>"
                             data-audio="<?php echo $item['audioPath']; ?>">
                            <div class="word"><?php echo htmlspecialchars($item['word']); ?></div>
                            <div class="english"><?php echo htmlspecialchars($item['english']); ?></div>
                            <div class="lesson">Lesson <?php echo $item['lesson']; ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Selected Word Display -->
            <div class="word-display hidden" id="wordDisplay">
                <h2 id="currentWord">-</h2>
                <p id="currentEnglish">-</p>
            </div>

            <!-- Practice Section -->
            <div class="practice-section" id="practiceSection">
                <!-- Native Audio -->
                <div class="file-loaded" id="fileLoaded">
                    <div class="file-loaded-info">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div class="file-icon">🎵</div>
                            <div>
                                <h4 id="fileName" style="color: #059669; margin-bottom: 5px;">Native Audio</h4>
                                <p style="font-size: 13px; color: #6b7280;"><span id="fileDurationText">Duration: 0.0s</span></p>
                            </div>
                        </div>
                        <button id="playNative" class="play-btn">▶️ Play Native</button>
                    </div>
                </div>

                <!-- User Recording Section -->
                <div class="file-loaded" id="userRecordingSection" style="background: #fef2f2; border-color: #fca5a5;">
                    <div class="file-loaded-info">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div class="file-icon user">🎤</div>
                            <div>
                                <h4 style="color: #dc2626; margin-bottom: 5px;">Your Recording</h4>
                                <p style="font-size: 13px; color: #6b7280;"><span id="userDurationText">Duration: 0.0s</span></p>
                            </div>
                        </div>
                        <button id="playUser" class="play-btn user" style="background: #dc2626;">▶️ Play Your Recording</button>
                    </div>
                </div>

                <!-- Controls -->
                <div class="controls">
                    <button id="recordBtn" class="btn btn-secondary">
                        <span>🎤</span>
                        <span id="recordText">Record Your Voice</span>
                    </button>
                    <button id="compareBtn" class="btn btn-primary" disabled>
                        <span>📊</span>
                        <span>Analyze Pronunciation</span>
                    </button>
                </div>

                <!-- Visualization Canvas -->
                <div class="canvas-container">
                    <canvas id="vizCanvas" width="1200" height="400"></canvas>
                </div>

                <!-- Results -->
                <div class="results" id="results">
                    <div class="score-display">
                        <div class="score-circle">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" class="score-bg"></circle>
                                <circle cx="50" cy="50" r="45" class="score-fill" id="scoreFill"
                                        stroke-dasharray="283" stroke-dashoffset="283"></circle>
                            </svg>
                            <div class="score-text" id="scoreText">0</div>
                        </div>
                        <div class="score-info">
                            <h3 id="feedback">Excellent!</h3>
                            <p id="detailedFeedback">Your pronunciation is very close to the native speaker.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Pass PHP data to JavaScript
        const WORD_LIST = <?php echo json_encode($wordList); ?>;

        // Global state
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let nativeBuffer = null;
        let userBuffer = null;
        let nativeAudioElement = null;
        let mediaRecorder = null;
        let audioChunks = [];
        let currentWord = null;
        let stream = null;
        let isRecording = false;

        // Word selection
        const wordGrid = document.getElementById('wordGrid');
        const lessonFilter = document.getElementById('lessonFilter');
        const searchInput = document.getElementById('searchInput');

        wordGrid.addEventListener('click', (e) => {
            const wordItem = e.target.closest('.word-item');
            if (!wordItem) return;

            // Deselect all
            document.querySelectorAll('.word-item').forEach(item => item.classList.remove('selected'));

            // Select this one
            wordItem.classList.add('selected');

            // Load word data
            currentWord = {
                cardNum: wordItem.dataset.cardNum,
                word: wordItem.dataset.word,
                english: wordItem.dataset.english,
                audioPath: wordItem.dataset.audio
            };

            // Update UI
            document.getElementById('currentWord').textContent = currentWord.word;
            document.getElementById('currentEnglish').textContent = currentWord.english;
            document.getElementById('wordDisplay').classList.remove('hidden');
            document.getElementById('practiceSection').classList.add('active');

            // Load native audio
            loadNativeAudio(currentWord.audioPath);
        });

        // Filtering
        lessonFilter.addEventListener('change', filterWords);
        searchInput.addEventListener('input', filterWords);

        function filterWords() {
            const lesson = lessonFilter.value;
            const search = searchInput.value.toLowerCase();

            document.querySelectorAll('.word-item').forEach(item => {
                const matchesLesson = !lesson || item.dataset.lesson === lesson;
                const matchesSearch = !search ||
                    item.dataset.word.toLowerCase().includes(search) ||
                    item.dataset.english.toLowerCase().includes(search);

                item.style.display = matchesLesson && matchesSearch ? 'block' : 'none';
            });
        }

        // Load native audio
        async function loadNativeAudio(audioPath) {
            try {
                const response = await fetch(audioPath);
                const arrayBuffer = await response.arrayBuffer();
                nativeBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Update UI
                document.getElementById('fileLoaded').classList.add('show');
                document.getElementById('fileName').textContent = currentWord.word + ' (Native)';
                document.getElementById('fileDurationText').textContent = `Duration: ${nativeBuffer.duration.toFixed(1)}s`;

                console.log('Native audio loaded:', nativeBuffer.duration + 's');
            } catch (err) {
                console.error('Error loading native audio:', err);
                alert('Failed to load native audio file');
            }
        }

        // Play native audio
        document.getElementById('playNative').addEventListener('click', () => {
            if (!nativeBuffer) return;

            const source = audioContext.createBufferSource();
            source.buffer = nativeBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        });

        // Play user audio
        document.getElementById('playUser').addEventListener('click', () => {
            if (!userBuffer) return;

            const source = audioContext.createBufferSource();
            source.buffer = userBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        });

        // Recording
        document.getElementById('recordBtn').addEventListener('click', async () => {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        });

        async function startRecording() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunks = [];

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    userBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // Update UI
                    document.getElementById('userRecordingSection').classList.add('show');
                    document.getElementById('userDurationText').textContent = `Duration: ${userBuffer.duration.toFixed(1)}s`;
                    document.getElementById('compareBtn').disabled = false;

                    console.log('User recording complete:', userBuffer.duration + 's');
                });

                mediaRecorder.start();
                isRecording = true;
                document.getElementById('recordText').textContent = '⏹️ Stop Recording';
                document.getElementById('recordBtn').style.background = '#dc2626';
            } catch (err) {
                console.error('Error starting recording:', err);
                alert('Failed to access microphone');
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
                isRecording = false;
                document.getElementById('recordText').textContent = '🎤 Record Your Voice';
                document.getElementById('recordBtn').style.background = '';
            }
        }

        // Analyze pronunciation
        document.getElementById('compareBtn').addEventListener('click', async () => {
            if (!nativeBuffer || !userBuffer) {
                alert('Please load native audio and record your voice first');
                return;
            }

            // Simple analysis (basic similarity score)
            const score = analyzeAudio(nativeBuffer, userBuffer);

            // Display results
            displayResults(score);
        });

        function analyzeAudio(native, user) {
            // Simple duration-based scoring (placeholder)
            const durationDiff = Math.abs(native.duration - user.duration);
            const durationScore = Math.max(0, 100 - (durationDiff * 20));

            // Draw waveforms
            drawComparison(native, user);

            return durationScore;
        }

        function drawComparison(native, user) {
            const canvas = document.getElementById('vizCanvas');
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Draw native waveform (green)
            drawWaveform(ctx, native, 0, height / 2, width, height / 4, '#10b981');

            // Draw user waveform (red)
            drawWaveform(ctx, user, 0, height / 2 + height / 4, width, height / 4, '#ef4444');

            // Labels
            ctx.fillStyle = '#10b981';
            ctx.font = '14px sans-serif';
            ctx.fillText('Native Speaker', 10, 20);

            ctx.fillStyle = '#ef4444';
            ctx.fillText('Your Recording', 10, height / 2 + height / 4 + 20);
        }

        function drawWaveform(ctx, buffer, x, y, width, height, color) {
            const data = buffer.getChannelData(0);
            const step = Math.ceil(data.length / width);
            const amp = height / 2;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;

                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }

                ctx.lineTo(x + i, y + (1 + min) * amp);
                ctx.lineTo(x + i, y + (1 + max) * amp);
            }

            ctx.stroke();
        }

        function displayResults(score) {
            const results = document.getElementById('results');
            const scoreText = document.getElementById('scoreText');
            const scoreFill = document.getElementById('scoreFill');
            const feedback = document.getElementById('feedback');
            const detailedFeedback = document.getElementById('detailedFeedback');

            // Update score
            scoreText.textContent = Math.round(score);
            const circumference = 283;
            const offset = circumference - (score / 100) * circumference;
            scoreFill.style.strokeDashoffset = offset;

            // Update feedback
            if (score >= 90) {
                feedback.textContent = 'Excellent!';
                detailedFeedback.textContent = 'Your pronunciation is very close to the native speaker.';
            } else if (score >= 75) {
                feedback.textContent = 'Good Job!';
                detailedFeedback.textContent = 'Your pronunciation is good, but could be improved with more practice.';
            } else if (score >= 60) {
                feedback.textContent = 'Keep Practicing';
                detailedFeedback.textContent = 'Your pronunciation needs work. Try to match the timing and intonation.';
            } else {
                feedback.textContent = 'Needs Improvement';
                detailedFeedback.textContent = 'Keep practicing! Listen carefully to the native speaker and try again.';
            }

            results.classList.add('show');
        }
    </script>
</body>
</html>
