# AI Slop Detector - Chrome Extension

A Chrome extension that detects and replaces AI-generated "slop" content on LinkedIn with "herp derp" text.

## Features

- **Pattern Detection**: Uses 18+ regex patterns to detect common AI-generated writing structures
- **Emoji Detection**: Flags overuse of engagement-bait emojis (🚀✅👇🔥💡📈)
- **Scoring System**: Assigns a "slop score" to each post based on detected patterns
- **Two Modes**: 
  - Replace mode: Converts slop to "herp derp" text
  - Highlight mode: Just highlights suspicious posts
- **Adjustable Sensitivity**: Set your own threshold for detection
- **Click to Reveal**: Click replaced text to see the original

## Detected Patterns

### Core Patterns
1. **"It's not X, it's Y"** - The classic false dichotomy
2. **Staccato Negation** - "Not X. Not Y. Just Z."
3. **"Here's what/the truth:"** - Formulaic reveals
4. **"What changed? Not X."** - Dramatic negation structure
5. **"This is not X. It is Y."** - False profundity
6. **"On paper X. But in reality, Y."** - Contrived contrast

### Engagement Patterns
7. **"If you [do X], remember this:"** - Sage advice formula
8. **Engagement bait** - "Like this post", "Comment KEYWORDS"
9. **Numbered urgency** - "11 days to launch. Only 4 hours..."

### Structural Patterns
10. **Excessive bold statements** - Multiple **bold** declarations
11. **"What if X was the answer?"** - Faux-profound questioning
12. **Starting with "Because"** - False profundity trigger
13. **"Less X. More Y."** - Oversimplified binary thinking
14. **"Stop X. Start Y."** - Command structure
15. **"To [audience]: [command]"** - Targeted preaching
16. **Triple emphasis** - Repetitive bullet point lists

### Emoji Red Flags
- 🚀 Rockets (hype)
- ✅ Green checks (engagement bait)
- 👇 Pointing down (attention grabbing)
- 🔥 Fire (unnecessary hype)
- 💡 Light bulb (pretending to be insightful)
- 📈 Chart up (fake success signals)

### Structural Red Flags
- Excessive single-sentence paragraphs
- Overuse of em dashes (—) for dramatic effect
- ALL CAPS for emphasis
- Multiple line breaks for artificial pacing

## Installation

1. Download all files to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the folder containing the extension files

## Files Required

```
ai-slop-detector/
├── manifest.json
├── ai-slop-detector.js
├── content-script.js
├── popup.html
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Usage

1. Navigate to LinkedIn
2. The extension will automatically scan posts
3. Click the extension icon to:
   - Enable/disable detection
   - Adjust sensitivity threshold (10-100)
   - Toggle between replace and highlight mode
   - View stats for current page

### Sensitivity Guide

- **10-20**: Very aggressive (may flag human posts)
- **25-35**: Balanced (recommended starting point)
- **40-60**: Conservative (only obvious AI slop)
- **70-100**: Very conservative (only extreme cases)

## How It Works

1. **Content Script** runs on LinkedIn pages
2. **Pattern Matching** scans text using regex patterns
3. **Scoring Algorithm** assigns points for each detected pattern:
   - Pattern match: 10 points
   - Emoji: 5 points
   - Structural flag: 5-15 points
   - Buzzword: 3 points
4. **Threshold Check** determines if score exceeds your threshold
5. **Replacement/Highlight** modifies the DOM accordingly

## Customization

Edit `ai-slop-detector.js` to:
- Add new patterns to `patterns` object
- Adjust point values in `analyzeText()` method
- Add new buzzwords to `buzzwords` array
- Modify "herp derp" variants in `generateHerpDerp()`

## Example Detections

**Score: 50+** (High confidence AI slop)
```
Here's the uncomfortable truth: We're producing tool operators, not security professionals.

The gap isn't jobs. It's understanding.

Not tools. Not salary. Not workload. The leadership approach changed.
```

**Score: 30-49** (Likely AI slop)
```
On paper, it may sound perfect. But in reality, it's an operational challenge.

🚀 This is a game-changer for buy-side professionals ✅
```

**Score: 15-29** (Suspicious)
```
If you lead teams, remember this:
Sometimes performance doesn't need more pressure.
```

## Known Limitations

- LinkedIn may change their DOM structure (update selectors in content-script.js)
- Some genuine human posts may trigger false positives at low thresholds
- Pattern matching can't detect all AI-generated content
- Only works on LinkedIn currently (easily adaptable to other sites)

## Future Enhancements

- [ ] Support for Twitter/X
- [ ] Machine learning model for better detection
- [ ] Export detected posts to CSV
- [ ] Whitelist specific authors
- [ ] Dark mode for popup
- [ ] Custom "herp derp" replacement text
- [ ] Browser action badge showing slop count

## Contributing

Found a new AI slop pattern? Add it to the `patterns` object in `ai-slop-detector.js`!

## License

MIT License - Use freely, modify as needed.

## Disclaimer

This extension is for educational and satirical purposes. It may occasionally flag legitimate human-written content. Use at your own discretion.
