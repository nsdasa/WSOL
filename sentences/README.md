# Cebuano Vocabulary Generator - DreamHost Deployment

A web application for generating Cebuano vocabulary and ladderized sentence sequences using Claude API.

## 📁 Files Overview

```
sentences/
├── index.html      # Frontend application
├── api.php         # Backend API (proxies to Anthropic)
├── config.php      # Configuration (API key, settings)
├── .htaccess       # Apache configuration
└── README.md       # This file
```

## 🚀 Deployment Instructions

### Step 1: Upload Files

1. Connect to your DreamHost account via SFTP or SSH
2. Navigate to your web directory: `/home/username/wsol.doulosmi.org/`
3. Create a `sentences` folder if it doesn't exist
4. Upload all files from this package to that folder

```bash
# Via SSH example:
cd ~/wsol.doulosmi.org/
mkdir -p sentences
# Then upload files
```

### Step 2: Configure API Key

Edit `config.php` and replace the placeholder API key:

```php
'api_key' => 'sk-ant-api03-YOUR-ACTUAL-API-KEY-HERE',
```

**Get your API key from:** https://console.anthropic.com/

### Step 3: Set File Permissions

```bash
# Make config.php readable only by owner and web server
chmod 640 sentences/config.php

# Make sure .htaccess is readable
chmod 644 sentences/.htaccess

# Make sure other files are readable
chmod 644 sentences/index.html
chmod 644 sentences/api.php
```

### Step 4: (Optional) Move Config Outside Web Root

For extra security, move `config.php` outside the web-accessible directory:

```bash
# Move config to a secure location
mv ~/wsol.doulosmi.org/sentences/config.php ~/config/cebuano-config.php

# Set permissions
chmod 640 ~/config/cebuano-config.php
```

Then update the path in `api.php`:

```php
// Change this line:
$config = require __DIR__ . '/config.php';

// To this:
$config = require '/home/username/config/cebuano-config.php';
```

### Step 5: Test the Installation

Visit: `https://wsol.doulosmi.org/sentences/`

You should see:
- The application interface
- "Server connected" status indicator (green)

If you see "API key not configured" or "Server unavailable", check:
1. The API key in `config.php` is correct
2. File permissions are set correctly
3. PHP is enabled for your domain

## ⚙️ Configuration Options

Edit `config.php` to customize:

```php
return [
    // Your Anthropic API Key (REQUIRED)
    'api_key' => 'sk-ant-api03-...',
    
    // Default model to use
    'default_model' => 'claude-sonnet-4-20250514',
    
    // Maximum tokens for API response
    'max_tokens' => 16000,
    
    // Available models in dropdown
    'available_models' => [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-haiku-4-20250514'
    ],
    
    // Rate limit: requests per hour per IP (local server limit)
    'rate_limit' => 30,
    
    // Delay between processing lessons (seconds)
    // Helps avoid Anthropic API rate limits
    'delay_between_requests' => 20,
    
    // Retry configuration for rate limit errors
    'retry' => [
        'max_attempts' => 5,        // Max retry attempts
        'initial_delay' => 10,      // Initial wait (seconds)
        'backoff_multiplier' => 2,  // Delay doubles each retry
        'max_delay' => 120          // Max wait between retries
    ],
    
    // Enable debug mode (shows detailed errors)
    'debug' => false
];
```

## 🔄 Rate Limit Handling

This application includes robust rate limit handling:

### Automatic Delays
- Configurable delay between processing each lesson (default: 20 seconds)
- Prevents hitting Anthropic's requests-per-minute limits
- Countdown timer shown in the UI

### Exponential Backoff Retry
When a rate limit error (429) occurs:
1. First retry after 10 seconds
2. Second retry after 20 seconds
3. Third retry after 40 seconds
4. Fourth retry after 80 seconds
5. Fifth retry after 120 seconds (max)

### Visual Feedback
- Progress bar shows current status
- Countdown timer during delays
- Retry attempts shown in debug console
- Summary of retries after completion

### Tuning for Your Usage
If you still hit rate limits, try:
1. Increase `delay_between_requests` to 30-60 seconds
2. Use Claude Haiku (lower token usage)
3. Process fewer lessons per session
4. Check your Anthropic tier at console.anthropic.com

## 🔒 Security Features

1. **API Key Protection**: The API key is stored server-side and never sent to the browser
2. **Config File Blocked**: `.htaccess` blocks direct access to `config.php`
3. **Rate Limiting**: Prevents abuse (30 requests/hour/IP by default)
4. **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
5. **No Directory Listing**: Prevents browsing server directories

## 🔧 Troubleshooting

### "Server unavailable" error

1. Check that PHP is enabled for your domain
2. Verify the files were uploaded correctly
3. Check DreamHost error logs: `~/logs/wsol.doulosmi.org/`

### "API key not configured" error

1. Edit `config.php` and add your API key
2. Make sure the API key doesn't have extra spaces
3. Verify the key is valid at https://console.anthropic.com/

### "Rate limit exceeded" error

Wait an hour or increase the `rate_limit` value in `config.php`

### 500 Internal Server Error

1. Check file permissions (see Step 3)
2. Check PHP error logs
3. Enable debug mode temporarily:
   ```php
   'debug' => true
   ```

### API requests timing out

The default timeout is 5 minutes (300 seconds). For very long responses, you may need to adjust PHP settings. Contact DreamHost support if needed.

## 📊 Usage Notes

- Each lesson processing uses approximately 10,000-15,000 tokens
- Claude Sonnet is recommended for best balance of speed/quality
- Claude Opus produces higher quality but is slower and more expensive
- Claude Haiku is fastest but may miss nuances

## 🔄 Updating

To update the application:

1. Backup your `config.php` (it contains your API key)
2. Upload new files
3. Restore your `config.php` or update the new one with your settings

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/config` | GET | Get current configuration |
| `/api/process` | POST | Process a single lesson |

## 💰 Cost Estimation

Approximate Claude API costs per lesson:
- **Sonnet**: ~$0.05-0.10 per lesson
- **Opus**: ~$0.30-0.50 per lesson
- **Haiku**: ~$0.01-0.02 per lesson

(Costs vary based on vocabulary list size and output length)

## 📞 Support

For issues with:
- **This application**: Check the debug console (🐛 button)
- **DreamHost hosting**: https://help.dreamhost.com/
- **Anthropic API**: https://docs.anthropic.com/
