# Cebuano Dictionary Scraper LITE (PHP)

**DreamHost Compatible** - Pure PHP, no Node.js required. Just upload and run!

## Features

- Scrapes Binisaya.com dictionary using PHP cURL
- Works on any shared hosting with PHP 7.4+
- No special server configuration needed
- Batch processing with pause/resume
- Rate limiting compliant with robots.txt (20s delay)
- JSON output files

## Requirements

- PHP 7.4 or higher
- cURL extension enabled (standard on most hosts)
- Write permissions for `output/` and `data/` directories

## Installation

### DreamHost (or any shared hosting)

1. **Upload files** to your domain folder:
   ```
   public_html/
   ├── index.html
   ├── api.php
   ├── includes/
   │   └── BinisayaScraper.php
   ├── output/
   │   └── binisaya/
   └── data/
   ```

2. **Set permissions** (if needed):
   ```bash
   chmod 755 output/ data/
   chmod 644 *.php *.html
   ```

3. **Open in browser** - that's it!

### Local Development

```bash
cd dreamhost
php -S localhost:8000
```

Open http://localhost:8000

## File Structure

```
dreamhost/
├── index.html              # Web interface
├── api.php                 # API endpoints
├── includes/
│   └── BinisayaScraper.php # Scraper class
├── output/
│   └── binisaya/           # JSON output files
├── data/                   # Progress/state files
└── README.md
```

## API Endpoints

All endpoints use `api.php?action=<action>`

| Action | Method | Description |
|--------|--------|-------------|
| `status` | GET | Server status |
| `progress` | GET | Batch progress |
| `test_binisaya` | POST | Test single word lookup |
| `lookup_single` | POST | Lookup and save word |
| `lookup_batch` | POST | Start batch processing |
| `process_next` | GET | Process next word in queue |
| `process_all` | GET | Process all (long-running) |
| `batch_pause` | POST | Pause batch |
| `batch_resume` | POST | Resume batch |
| `batch_cancel` | POST | Cancel batch |
| `files` | GET | List output files |

## Usage Examples

### Test a word (cURL)

```bash
curl -X POST "https://yourdomain.com/api.php?action=test_binisaya" \
  -H "Content-Type: application/json" \
  -d '{"word": "kalipay"}'
```

### Start batch processing

```bash
curl -X POST "https://yourdomain.com/api.php?action=lookup_batch" \
  -H "Content-Type: application/json" \
  -d '{"words": ["kalipay", "gugma", "balay"]}'
```

### Process next word

```bash
curl "https://yourdomain.com/api.php?action=process_next"
```

## How Batch Processing Works

Unlike Node.js which can run continuously, PHP scripts have execution limits. The batch system works by:

1. **Start batch** - Queues words and saves state to file
2. **Auto-process** - JavaScript calls `process_next` every 25 seconds
3. **Progress saved** - State persists between requests
4. **Pause/Resume** - Works across browser sessions

You can also set up a **cron job** to process words automatically:

```bash
# Process one word every minute
* * * * * curl -s "https://yourdomain.com/api.php?action=process_next" > /dev/null
```

## Rate Limiting

The scraper respects Binisaya.com's robots.txt:
- **20 second delay** between requests
- Automatic rate limiting in PHP

## Output

Files are saved to `output/binisaya/` as JSON:

```json
{
  "word": "kalipay",
  "sources": {
    "binisaya": {
      "found": true,
      "data": {
        "word": "kalipay",
        "rootword": "lipay",
        "meanings": [...]
      }
    }
  }
}
```

## Differences from Full Version

| Feature | Full Version | LITE (PHP) |
|---------|--------------|------------|
| SEALang | Yes | No |
| Binisaya | Yes | Yes |
| Runtime | Node.js | PHP |
| Hosting | VPS/Dedicated | Shared OK |
| Setup | npm install | Just upload |

## Troubleshooting

### "Permission denied" errors
```bash
chmod -R 755 output/ data/
```

### cURL errors
Ensure PHP cURL extension is enabled:
```php
<?php phpinfo(); // Check for curl section
```

### Rate limit messages
This is normal - the scraper waits 20 seconds between requests to comply with robots.txt.

### Batch not progressing
- Check that JavaScript is enabled in your browser
- Or set up a cron job to call `process_next`

## License

ISC
