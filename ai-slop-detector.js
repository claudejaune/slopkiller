/**
 * AI Slop Detector
 * Detects AI-generated LinkedIn-style content patterns
 */

const AISlopDetector = {
  
  // Regex patterns for common AI slop structures
  patterns: {
    
    // Pattern 1: "It's not X, it's Y" / "The gap isn't X, it's Y"
    notItsPattern: /\b(the\s+\w+\s+)?(isn't|is\s+not|aren't|are\s+not)\s+(\w+\s*){1,5}\.\s*(it's|they're|it\s+is|they\s+are)\s+/gi,
    
    // Pattern 2: Staccato "Not X. Not Y. Just Z." or "No X. No Y. Just Z."
    staccatoNegation: /(^|\n)\s*(not|no)\s+[\w\s]{3,30}\.\s*(not|no)\s+[\w\s]{3,30}\.\s*(just|but|only)\s+/gim,
    
    // Pattern 3: "Here's what made it possible:" / "Here's the truth:"
    heresWhat: /here'?s\s+(what|the\s+(truth|reality|problem|uncomfortable\s+truth))[:\s]/gi,
    
    // Pattern 4: Multiple bold statements in succession
    excessiveBold: /(\*\*[^*]{10,80}\*\*\s*){3,}/g,
    
    // Pattern 5: "If you [do X], remember this:"
    rememberThis: /if\s+you\s+[\w\s]{5,40},?\s+remember\s+this/gi,
    
    // Pattern 6: "What changed? Not X. The Y changed."
    whatChanged: /what\s+changed\?\s*(not|no)\s+/gi,
    
    // Pattern 7: "This is not X. It is Y."
    thisIsNot: /this\s+(is\s+not|isn't|doesn't)\s+[\w\s]{3,30}\.\s*it\s+(is|'s)\s+/gi,
    
    // Pattern 8: "On paper, X. But in reality, Y."
    onPaperButReality: /on\s+paper,?\s+[\w\s]{5,50}\.\s*but\s+in\s+reality,?\s+/gi,
    
    // Pattern 9: Engagement bait (Like/Comment/Share)
    engagementBait: /(like\s+this\s+post|comment\s+[""']?\w+[""']?|drop\s+a\s+comment|share\s+if|tag\s+someone)/gi,
    
    // Pattern 10: "What if [thing] was the answer to [problem]?"
    whatIfAnswer: /what\s+if\s+[\w\s]{5,50}\s+(was|were|is)\s+the\s+answer\s+to/gi,
    
    // Pattern 11: Starting sentence with "Because" for profundity
    becauseStart: /(^|\n)\s*because\s+[\w\s]{10,}/gim,
    
    // Pattern 12: "The [noun] isn't 'X.' It's 'Y.'"
    headlineIsnt: /the\s+\w+\s+isn't\s+[""'][^""']{5,50}[""']\.\s*it's\s+[""']/gi,
    
    // Pattern 13: Numbered urgency (X days, Y hours)
    numberedUrgency: /\b\d+\s+(days?|hours?|minutes?)\s+to\s+/gi,
    
    // Pattern 14: "Less X. More Y."
    lessMore: /\bless\s+[\w\s]{3,20}\.\s*more\s+[\w\s]{3,20}\./gi,
    
    // Pattern 15: Question followed by single word answer
    questionSingleWord: /\?\s*\n\s*[A-Z][\w]{3,15}\.\s*\n/g,
    
    // Pattern 16: "Stop X. Start Y."
    stopStart: /\bstop\s+[\w\s]{3,30}\.\s*start\s+/gi,
    
    // Pattern 17: "To [audience]: [command]"
    toAudienceCommand: /to\s+(aspiring|hiring|future|young|experienced)\s+[\w\s]{3,30}:\s*(stop|start|remember|don't|never)/gi,
    
    // Pattern 18: Triple emphasis structure
    tripleEmphasis: /(•|\-|\*|\d\.)\s*[^•\-*\n]{10,80}\s*(•|\-|\*|\d\.)\s*[^•\-*\n]{10,80}\s*(•|\-|\*|\d\.)\s*[^•\-*\n]{10,80}/g,
  },
  
  // Emoji patterns that suggest AI slop
  emojiPatterns: {
    rocket: /🚀/g,
    greenCheck: /✅/g,
    pointingDown: /👇/g,
    fire: /🔥/g,
    lightbulb: /💡/g,
    chartUp: /📈/g,
    warning: /⚠️/g,
    pretentious: /[🪶🕰️🕊️🏛️📜🗺️]/g,
  },
  
  // Structural red flags
  structuralFlags: {
    // Single sentence paragraphs (multiple in succession)
    singleSentenceParagraphs: /(^|\n)\s*[A-Z][^.\n]{10,100}\.\s*(\n\s*\n|\n\s*$)/gm,
    
    // Excessive line breaks
    excessiveBreaks: /\n\s*\n\s*\n/g,
    
    // Overuse of em dashes
    emDashAbuse: /—/g,
    
    // ALL CAPS words for emphasis
    capsEmphasis: /\b[A-Z]{3,}\b/g,
  },
  
  // Buzzword detection
  buzzwords: [
    'game-changer',
    'game changer',
    'shift',
    'uncomfortable truth',
    'here\'s the thing',
    'let that sink in',
    'read that again',
    'the reality is',
    'the truth is',
    'servant leadership',
    'thought leadership',
    'paradigm shift',
    'disruptor',
    'innovator',
    'visionary',
  ],
  
  /**
   * Calculate slop score for text
   * @param {string} text - Text to analyze
   * @returns {object} Score and detected patterns
   */
  analyzeText(text) {
    const detected = {
      patterns: {},
      emojis: {},
      structural: {},
      buzzwords: [],
      score: 0,
    };
    
    // Check regex patterns
    for (const [name, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        detected.patterns[name] = matches.length;
        detected.score += matches.length * 10; // 10 points per pattern match
      }
    }
    
    // Check emoji patterns
    for (const [name, pattern] of Object.entries(this.emojiPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        detected.emojis[name] = matches.length;
        detected.score += matches.length * 5; // 5 points per emoji
      }
    }
    
    // Check structural flags
    for (const [name, pattern] of Object.entries(this.structuralFlags)) {
      const matches = text.match(pattern);
      if (matches) {
        detected.structural[name] = matches.length;
        // Weight these less heavily
        if (name === 'singleSentenceParagraphs' && matches.length > 5) {
          detected.score += 15;
        } else if (name === 'excessiveBreaks' && matches.length > 3) {
          detected.score += 10;
        } else if (name === 'emDashAbuse' && matches.length > 4) {
          detected.score += 8;
        } else if (name === 'capsEmphasis' && matches.length > 2) {
          detected.score += 5;
        }
      }
    }
    
    // Check buzzwords
    const textLower = text.toLowerCase();
    for (const buzzword of this.buzzwords) {
      if (textLower.includes(buzzword)) {
        detected.buzzwords.push(buzzword);
        detected.score += 3; // 3 points per buzzword
      }
    }
    
    return detected;
  },
  
  /**
   * Determine if text is AI slop based on score
   * @param {string} text - Text to check
   * @param {number} threshold - Score threshold (default: 30)
   * @returns {boolean}
   */
  isSlop(text, threshold = 30) {
    const analysis = this.analyzeText(text);
    return analysis.score >= threshold;
  },
  
  /**
   * Get confidence level
   * @param {number} score
   * @returns {string}
   */
  getConfidenceLevel(score) {
    if (score >= 100) return 'VERY HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    if (score >= 15) return 'LOW';
    return 'VERY LOW';
  },
  
  /**
   * Replace slop text with "herp derp"
   * @param {string} text - Original text
   * @param {number} threshold - Score threshold
   * @returns {string} Modified text
   */
  replaceSlop(text, threshold = 30) {
    const analysis = this.analyzeText(text);
    
    if (analysis.score < threshold) {
      return text; // Not sloppy enough, return original
    }
    
    // Replace detected patterns with herp derp variants
    let modified = text;
    
    // Replace the most egregious patterns
    for (const [name, pattern] of Object.entries(this.patterns)) {
      if (analysis.patterns[name]) {
        modified = modified.replace(pattern, 'herp derp. ');
      }
    }
    
    return modified;
  },
  
  /**
   * Generate a herp derp replacement of appropriate length
   * @param {string} original - Original text
   * @returns {string}
   */
  generateHerpDerp(original) {
    const wordCount = original.split(/\s+/).length;
    const herpDerpVariants = [
      'herp derp',
      'derp herp',
      'herp de derp',
      'derpy derp derp',
      'herp a derp',
    ];
    
    const repetitions = Math.ceil(wordCount / 3);
    let result = [];
    
    for (let i = 0; i < repetitions; i++) {
      result.push(herpDerpVariants[i % herpDerpVariants.length]);
    }
    
    return result.join('. ') + '.';
  }
};

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISlopDetector;
}
