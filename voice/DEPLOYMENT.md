# Pronunciation Analyzer - Deployment Guide

## 🎯 Overview

This guide will help you deploy the modularized Pronunciation Analyzer to your Ward School server.

**What Changed:**
- **Before:** Single 9,779-line HTML file
- **After:** 18 organized modules (100% functionally equivalent)

---

## 📁 Project Structure

```
pronunciation-analyzer/
├── index.php                   # Main HTML page
├── README.md                   # Usage guide
├── PROJECT_STRUCTURE.md        # Architecture docs
├── PROGRESS.md                 # Refactoring status
├── SESSION_5_SUMMARY.md        # Completion summary
│
├── css/
│   ├── main.css               # Core layout & typography
│   ├── controls.css           # Buttons, inputs, sliders
│   └── results.css            # Score display, feedback
│
└── js/
    ├── main.js                # 🆕 Application orchestration
    │
    ├── modules/
    │   ├── pitch.js           # Pitch extraction (autocorrelation, YIN)
    │   ├── intensity.js       # RMS intensity & stress detection
    │   ├── waveform.js        # Audio waveform processing
    │   ├── dtw.js             # Dynamic Time Warping alignment
    │   ├── fft.js             # Fast Fourier Transform
    │   ├── mfcc.js            # Mel-Frequency Cepstral Coefficients
    │   ├── internal.js        # LPC, formants, ZCR, spectral tilt
    │   ├── scoring.js         # 9 comparison algorithms
    │   ├── visualizer.js      # Canvas-based visualizations
    │   └── ai-api.js          # Anthropic Claude integration
    │
    └── utils/
        ├── math-utils.js      # Mathematical helpers
        └── audio-utils.js     # Audio trimming, recording
```

**Total Size:** ~340KB (all JavaScript + CSS)

---

## 🚀 Deployment Steps

### 1. Upload Files

Upload the entire `pronunciation-analyzer/` directory to your server:

```bash
# Using SCP
scp -r pronunciation-analyzer/ user@wsol1.doulosmi.org:/path/to/web/root/

# Or using FTP/SFTP client
# Upload all files maintaining directory structure
```

### 2. Update index.php

The `index.php` file needs to be updated to use ES6 module imports. Replace the old monolithic `<script>` tag with:

```html
<!-- At the end of <body>, replace old script with: -->
<script type="module">
    import { init } from './js/main.js';
    
    // Application initializes automatically
    // No additional code needed
</script>
```

**Important:** Remove the entire old `<script>...</script>` block (the 9,779 line monolith).

### 3. Configure Server for ES6 Modules

Most modern servers support ES6 modules by default, but ensure:

#### Apache (.htaccess)
```apache
# Ensure JavaScript MIME type is correct
AddType text/javascript js mjs

# Enable CORS if needed (for local testing)
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
</IfModule>
```

#### Nginx (nginx.conf)
```nginx
location ~ \.m?js$ {
    default_type text/javascript;
    add_header 'Access-Control-Allow-Origin' '*' always;
}
```

### 4. Test the Application

1. **Open in browser:** Navigate to `https://wsol1.doulosmi.org/pronunciation-analyzer/`

2. **Check console:** Open Developer Tools (F12) and check for errors

3. **Test workflow:**
   - Upload a native audio file
   - Record or upload user audio
   - Click "Analyze Pronunciation"
   - Check visualizations
   - Test AI analysis (if API key configured)

4. **Verify features:**
   - All 8 visualization modes work
   - Settings controls function correctly
   - Export features work
   - Recording/playback works
   - Analysis results display properly

---

## 🔧 Troubleshooting

### Issue: "Failed to load module"

**Cause:** Server not configured for ES6 modules or CORS issues

**Solution:**
- Ensure `.js` files have correct MIME type (`text/javascript`)
- Check browser console for specific error
- Verify all file paths are correct
- Enable CORS if testing locally

### Issue: "Cannot find module"

**Cause:** Import paths incorrect

**Solution:**
- All imports use relative paths (`./` or `../`)
- Verify directory structure matches exactly
- Check case sensitivity (Linux servers are case-sensitive)

### Issue: Visualizations not rendering

**Cause:** Canvas element not found or Visualizer not initialized

**Solution:**
- Verify `<canvas id="vizCanvas">` exists in HTML
- Check that `main.js` is loaded as module
- Inspect browser console for initialization errors

### Issue: Recording not working

**Cause:** HTTPS required for microphone access

**Solution:**
- Ensure site is served over HTTPS
- Microphone permissions must be granted
- Check browser security settings

---

## 📊 Performance Notes

### Module Loading

**Initial Page Load:**
- Main app: `main.js` (~52KB)
- All modules load on-demand
- Browser caches modules after first load

**Total Download:** ~340KB (first visit), ~0KB (cached)

### Runtime Performance

- Same performance as monolithic version
- Module bundling handled by browser
- No build step required
- Development and production use same code

---

## 🔐 Security Considerations

### API Keys

The Anthropic API key is stored in `localStorage`:
- **Location:** Browser's localStorage
- **Key:** `'anthropic_api_key'`
- **Format:** Starts with `'sk-'`

**Note:** This is client-side storage. For production, consider:
- Server-side API proxy
- Rate limiting
- User authentication

### CORS Configuration

If serving from different domain/subdomain:
```javascript
// In ai-api.js, the API call includes:
headers: {
    'anthropic-dangerous-direct-browser-access': 'true'
}
```

This allows direct browser→API calls. For production, consider a backend proxy.

---

## 🎨 Customization

### Adding New Visualizations

1. Add method to `Visualizer` class (`visualizer.js`)
2. Add tab to UI (`index.php`)
3. Add case to switch statement in `updateVisualization()` (`main.js`)
4. Add settings controls if needed

### Adding New Comparison Methods

1. Add method to `PronunciationComparator` class (`scoring.js`)
2. Update scoring weights in `compare()` method
3. Document in `detailedReport`

### Styling

- Modify `css/main.css` for layout changes
- Modify `css/controls.css` for button/input styles
- Modify `css/results.css` for score display

---

## 📚 Documentation Files

- **README.md** - User-facing usage guide
- **PROJECT_STRUCTURE.md** - Detailed architecture documentation
- **SESSION_5_SUMMARY.md** - Complete feature list and module breakdown
- **PROGRESS.md** - Refactoring status and statistics

---

## 🔄 Reverting to Monolithic (if needed)

If you need to revert:

1. Keep a backup of original `voice.html`
2. Use that file instead of the modular version
3. All functionality is identical

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] All files uploaded correctly
- [ ] `index.php` updated with module import
- [ ] Server configured for ES6 modules
- [ ] HTTPS enabled (required for mic access)
- [ ] All 8 visualizations render correctly
- [ ] Recording and playback work
- [ ] Analysis produces results
- [ ] Export functions work
- [ ] AI analysis works (if API key provided)
- [ ] Settings persist and update visualizations
- [ ] No console errors
- [ ] Mobile responsive (test on phone)

---

## 🆘 Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify file structure matches exactly
3. Test with latest Chrome/Firefox
4. Ensure HTTPS is enabled
5. Review this deployment guide

---

## 🎉 Success!

Once deployed, you'll have a professional, maintainable pronunciation analysis tool ready for the Ward School platform!

**Features Available:**
- ✅ 8 visualization modes
- ✅ Advanced signal processing
- ✅ AI-powered feedback
- ✅ Comprehensive export options
- ✅ 50+ customizable parameters
- ✅ Production-ready architecture

---

**Deployment Guide Version:** 1.0  
**Last Updated:** November 22, 2025  
**Tested Environments:** Chrome 120+, Firefox 121+, Safari 17+
