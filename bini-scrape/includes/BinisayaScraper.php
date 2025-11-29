<?php
/**
 * Binisaya.com Scraper - PHP Version
 * Lightweight scraper using cURL and DOM parsing
 */

class BinisayaScraper {
    private $lastRequestTime = 0;
    private $crawlDelay = 20; // 20 seconds per robots.txt
    private $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    /**
     * Respect robots.txt crawl delay
     */
    private function respectCrawlDelay() {
        $now = time();
        $elapsed = $now - $this->lastRequestTime;

        if ($elapsed < $this->crawlDelay && $this->lastRequestTime > 0) {
            $waitTime = $this->crawlDelay - $elapsed;
            sleep($waitTime);
        }

        $this->lastRequestTime = time();
    }

    /**
     * Fetch URL using cURL
     */
    private function fetchUrl($url) {
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_USERAGENT => $this->userAgent,
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Connection: keep-alive'
            ],
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: $error");
        }

        if ($httpCode !== 200) {
            throw new Exception("HTTP error: $httpCode");
        }

        return $response;
    }

    /**
     * Decode HTML entities
     */
    private function decodeHtmlEntities($text) {
        if (!$text) return '';
        return html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Strip HTML tags
     */
    private function stripTags($html) {
        if (!$html) return '';
        return trim(preg_replace('/\s+/', ' ', strip_tags($html)));
    }

    /**
     * Parse Binisaya HTML response
     */
    private function parseBinisayaHtml($html, $searchWord) {
        $result = [
            'found' => false,
            'word' => $searchWord,
            'rootword' => null,
            'affixes' => null,
            'syllables' => null,
            'affix_expansion' => null,
            'meanings' => [],
            'synonyms' => [],
            'derivatives_root' => null,
            'is_root' => false
        ];

        if (!$html) return $result;

        // Cut off at Glosses section
        $glossesIndex = strpos($html, 'Glosses:');
        $contentHtml = $glossesIndex !== false ? substr($html, 0, $glossesIndex) : $html;

        // Word breakdown: "kalipay - lipay - ka-~"
        if (preg_match('/Word - rootword - affixes<br>\s*\n?\s*(\S+)\s*-\s*<b>(\S+)<\/b>\s*-\s*([^<\n]+)/i', $contentHtml, $breakdownMatch)) {
            $result['word'] = trim($breakdownMatch[1]);
            $result['rootword'] = trim($breakdownMatch[2]);
            $result['affixes'] = trim($breakdownMatch[3]);
            $result['found'] = true;

            if (strtolower($result['word']) === strtolower($result['rootword'])) {
                $result['is_root'] = true;
            }
        } else {
            // Check if word exists in table (root word case)
            $pattern = '/<a\s+href="http:\/\/www\.binisaya\.com\/cebuano\/' . preg_quote($searchWord, '/') . '"/i';
            if (preg_match($pattern, $contentHtml)) {
                $result['found'] = true;
                $result['word'] = $searchWord;
                $result['rootword'] = $searchWord;
                $result['is_root'] = true;
            }
        }

        // Syllables
        if (preg_match('/([\w.]+(?:\.[\w]+)*)\.\s*-\s*(\d+)\s*syllables/i', $contentHtml, $syllablesMatch)) {
            $result['syllables'] = [
                'breakdown' => $syllablesMatch[1] . '.',
                'count' => (int)$syllablesMatch[2]
            ];
        }

        // Affix expansion
        if (preg_match('/([a-z]+-)\s*=\s*(\w+)/i', $contentHtml, $affixExpMatch)) {
            $result['affix_expansion'] = $affixExpMatch[1] . ' = ' . $affixExpMatch[2];
        }

        // Meanings from table
        $rowPattern = '/<tr[^>]*><td[^>]*>.*?<a\s+href="http:\/\/www\.binisaya\.com\/cebuano\/[^"]*">(?:<nobr>)?<b>([^<]+)<\/b>(?:<\/nobr>)?<\/a>\s*<i>\[([^\]]+)\]<\/i>.*?<\/td>\s*<td[^>]*>(.*?)<\/td><\/tr>/si';

        if (preg_match_all($rowPattern, $contentHtml, $rowMatches, PREG_SET_ORDER)) {
            foreach ($rowMatches as $rowMatch) {
                $pronunciationText = trim($rowMatch[2]);
                $meaning = [
                    'word' => $this->decodeHtmlEntities(trim($rowMatch[1])),
                    'pronunciation' => "[$pronunciationText]",
                    'english' => [],
                    'pos' => null,
                    'tags' => []
                ];

                // Extract syllables from pronunciation
                $syllableParts = array_filter(explode('.', $pronunciationText));
                if (count($syllableParts) > 0) {
                    $meaning['syllables'] = [
                        'breakdown' => $pronunciationText,
                        'count' => count($syllableParts)
                    ];

                    if (!$result['syllables'] && strtolower($meaning['word']) === strtolower($searchWord)) {
                        $result['syllables'] = $meaning['syllables'];
                    }
                }

                // Extract English words and POS
                $engPattern = '/<a[^>]*>([^<]+)<\/a>(?:&nbsp;|\s*)?(?:<i>)?\(([^)]+)\)(?:<\/i>)?/i';
                if (preg_match_all($engPattern, $rowMatch[3], $engMatches, PREG_SET_ORDER)) {
                    foreach ($engMatches as $engMatch) {
                        $engWord = $this->decodeHtmlEntities(trim($engMatch[1]));
                        if ($engWord) $meaning['english'][] = $engWord;
                        if (!$meaning['pos'] && isset($engMatch[2])) {
                            $meaning['pos'] = trim($engMatch[2]);
                        }
                    }
                }

                // Extract tags
                if (preg_match_all('/\[([a-z]+)\]/i', $rowMatch[3], $tagMatches)) {
                    $meaning['tags'] = $tagMatches[1];
                }

                if ($meaning['word'] || count($meaning['english']) > 0) {
                    $result['meanings'][] = $meaning;
                }
            }
        }

        // Synonyms
        if (preg_match('/Synonyms:\s*([^\n<]+)/i', $contentHtml, $synonymsMatch)) {
            $synonyms = $this->stripTags($synonymsMatch[1]);
            $result['synonyms'] = array_filter(array_map('trim', explode(',', $synonyms)));
        }

        // Derivatives link
        if (preg_match('/Derivatives of\s*<a[^>]*>([^<]+)<\/a>/i', $contentHtml, $derivMatch)) {
            $result['derivatives_root'] = $this->decodeHtmlEntities(trim($derivMatch[1]));
        }

        $result['found'] = count($result['meanings']) > 0 || $result['rootword'] !== null;
        return $result;
    }

    /**
     * Parse derivatives list
     */
    private function parseDerivativesList($html) {
        $derivatives = [];

        $rowPattern = '/<tr[^>]*>(.*?)<\/tr>/si';
        if (preg_match_all($rowPattern, $html, $rowMatches)) {
            foreach ($rowMatches[1] as $rowContent) {
                if (preg_match('/<a\s+href="http:\/\/www\.binisaya\.com\/cebuano\/([^"]+)"[^>]*>([^<]+)<\/a>/i', $rowContent, $wordMatch)) {
                    $meanings = '';
                    if (preg_match('/<td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/si', $rowContent, $tdMatch)) {
                        $meanings = $this->stripTags($tdMatch[1]);
                        $meanings = preg_replace('/^\[Synonyms\]\s*\.\.\.\s*/i', '', $meanings);
                    }

                    $derivatives[] = [
                        'word' => $this->decodeHtmlEntities(trim($wordMatch[2])),
                        'url_slug' => $wordMatch[1],
                        'english_preview' => $meanings
                    ];
                }
            }
        }

        return $derivatives;
    }

    /**
     * Search Binisaya.com for a word
     */
    public function search($word, $options = []) {
        $fetchDerivatives = isset($options['fetchDerivatives']) ? $options['fetchDerivatives'] : true;
        $existingWords = isset($options['existingWords']) ? $options['existingWords'] : [];
        $existingSet = array_flip(array_map('strtolower', $existingWords));

        $this->respectCrawlDelay();

        $results = [
            'steps' => [],
            'errors' => [],
            'word' => $word,
            'found' => false,
            'data' => null,
            'root_data' => null,
            'method' => 'php-curl'
        ];

        try {
            // Step 1: Fetch main word page
            $searchUrl = 'https://www.binisaya.com/node/21?search=binisaya&word=' . urlencode($word) . '&Search=Search';
            $results['steps'][] = "1. Fetching: $searchUrl";

            $html = $this->fetchUrl($searchUrl);
            $results['htmlLength'] = strlen($html);

            $results['steps'][] = '2. Parsing results...';
            $parsed = $this->parseBinisayaHtml($html, $word);

            if ($parsed['found']) {
                $results['found'] = true;

                // Filter meanings to only the searched word
                $rootWord = $parsed['rootword'];
                if ($rootWord && strtolower($rootWord) !== strtolower($word)) {
                    $parsed['meanings'] = array_filter($parsed['meanings'], function($m) use ($word) {
                        return strtolower($m['word']) === strtolower($word);
                    });
                    $parsed['meanings'] = array_values($parsed['meanings']);
                    $results['steps'][] = '   ✓ Filtered to ' . count($parsed['meanings']) . " meanings for \"$word\"";
                }

                if ($rootWord && strtolower($rootWord) === strtolower($word)) {
                    $parsed['is_root'] = true;
                }

                $results['data'] = $parsed;

                // Fetch root if different
                if ($rootWord && strtolower($rootWord) !== strtolower($word)) {
                    if (!isset($existingSet[strtolower($rootWord)])) {
                        $results['steps'][] = "3. Fetching root \"$rootWord\"...";
                        $this->respectCrawlDelay();

                        try {
                            $rootUrl = 'https://www.binisaya.com/node/21?search=binisaya&word=' . urlencode($rootWord) . '&Search=Search';
                            $rootHtml = $this->fetchUrl($rootUrl);
                            $rootParsed = $this->parseBinisayaHtml($rootHtml, $rootWord);

                            if ($rootParsed['found']) {
                                $rootParsed['meanings'] = array_filter($rootParsed['meanings'], function($m) use ($rootWord) {
                                    return strtolower($m['word']) === strtolower($rootWord);
                                });
                                $rootParsed['meanings'] = array_values($rootParsed['meanings']);
                                $rootParsed['is_root'] = true;
                                $results['root_data'] = $rootParsed;
                                $results['steps'][] = '   ✓ Got root with ' . count($rootParsed['meanings']) . ' meanings';
                            }
                        } catch (Exception $e) {
                            $results['errors'][] = 'Failed to fetch root: ' . $e->getMessage();
                        }
                    } else {
                        $results['steps'][] = "3. Root \"$rootWord\" already exists - skipping";
                    }
                }

                // Fetch derivatives
                if ($fetchDerivatives && $parsed['derivatives_root']) {
                    $derivRoot = $parsed['derivatives_root'];
                    $results['steps'][] = "4. Fetching derivatives of \"$derivRoot\"...";
                    $this->respectCrawlDelay();

                    try {
                        $derivUrl = 'https://www.binisaya.com/node/21?search=root&word=' . urlencode($derivRoot);
                        $derivHtml = $this->fetchUrl($derivUrl);
                        $derivList = $this->parseDerivativesList($derivHtml);

                        $derivWords = array_column($derivList, 'word');
                        $results['steps'][] = '   Found ' . count($derivWords) . ' derivatives';

                        if ($results['root_data']) {
                            $results['root_data']['derivatives'] = $derivWords;
                        } elseif ($parsed['is_root']) {
                            $parsed['derivatives'] = $derivWords;
                            $results['data'] = $parsed;
                        }

                        $results['derivatives_list'] = $derivList;
                    } catch (Exception $e) {
                        $results['errors'][] = 'Failed to fetch derivatives: ' . $e->getMessage();
                    }
                }

                // Clean up non-root entry
                if (!$parsed['is_root'] && isset($parsed['derivatives_root'])) {
                    unset($results['data']['derivatives_root']);
                }
            } else {
                $results['steps'][] = '   ✗ Word not found';
            }

            $results['success'] = $results['found'];

        } catch (Exception $e) {
            $results['error'] = $e->getMessage();
            $results['success'] = false;
        }

        return $results;
    }

    /**
     * Save result to JSON file
     */
    public function saveToFile($word, $data, $outputDir = 'output/binisaya') {
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        $safeWord = preg_replace('/[^a-zA-Z0-9-]/', '_', $word);
        $filename = "$outputDir/$safeWord.json";

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (file_put_contents($filename, $json) !== false) {
            return $filename;
        }

        return false;
    }
}
