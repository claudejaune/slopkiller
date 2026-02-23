# Pattern Development Guide

## How to Add New AI Slop Patterns

This guide explains how to add new detection patterns to the LinkedIn AI Slop Detector.

## Pattern Structure

All patterns are defined in `ai-slop-detector.js` in the `patterns` object:

```javascript
patterns: {
  patternName: /regex pattern here/gi,
}
```

## Quick Reference: Common Regex Components

### Word Boundaries and Spacing
- `\b` - Word boundary (start/end of word)
- `\s+` - One or more whitespace characters
- `\s*` - Zero or more whitespace characters

### Quantifiers
- `{3,30}` - Between 3 and 30 occurrences
- `{5,}` - 5 or more occurrences
- `+` - One or more
- `*` - Zero or more
- `?` - Zero or one (optional)

### Character Classes
- `\w` - Word character (a-z, A-Z, 0-9, _)
- `[\w\s]` - Word character or space
- `[^*]` - Any character except asterisk
- `.` - Any character except newline

### Anchors
- `^` - Start of line (with `m` flag)
- `$` - End of line (with `m` flag)
- `\n` - Newline character

### Groups
- `(pattern)` - Capturing group
- `(?:pattern)` - Non-capturing group
- `(a|b|c)` - Match a OR b OR c

### Flags
- `g` - Global (find all matches)
- `i` - Case insensitive
- `m` - Multiline (^ and $ match line starts/ends)

## Examples: Building Patterns

### Example 1: "It's not X, it's Y"

**Pattern to detect:**
```
The gap isn't jobs. It's understanding.
It's not about tools. It's about people.
```

**Regex:**
```javascript
notItsPattern: /\b(the\s+\w+\s+)?(isn't|is\s+not)\s+(\w+\s*){1,5}\.\s*(it's|they're|it\s+is)\s+/gi
```

**Breakdown:**
- `\b` - Word boundary
- `(the\s+\w+\s+)?` - Optional "the [word]" prefix
- `(isn't|is\s+not)` - "isn't" OR "is not"
- `\s+` - Space
- `(\w+\s*){1,5}` - 1-5 words
- `\.` - Literal period
- `\s*` - Optional space
- `(it's|they're|it\s+is)` - "it's" OR "they're" OR "it is"
- Flags: `g` (global), `i` (case insensitive)

### Example 2: "Stop X. Start Y."

**Pattern to detect:**
```
Stop chasing certifications. Start understanding fundamentals.
Stop overthinking. Start building.
```

**Regex:**
```javascript
stopStart: /\bstop\s+[\w\s]{3,30}\.\s*start\s+/gi
```

**Breakdown:**
- `\bstop\s+` - Word "stop" followed by space
- `[\w\s]{3,30}` - 3-30 characters (words/spaces)
- `\.` - Literal period
- `\s*` - Optional space
- `start\s+` - Word "start" followed by space

### Example 3: Emoji Detection

**Pattern to detect:**
```
🚀 ✅ 👇 (rocket, checkmark, pointing down)
```

**Regex:**
```javascript
rocket: /🚀/g,
greenCheck: /✅/g,
pointingDown: /👇/g,
```

**Note:** Emoji patterns are simple exact matches.

### Example 4: "Here's what/the truth:"

**Pattern to detect:**
```
Here's what made it possible:
Here's the uncomfortable truth:
Here's the reality:
```

**Regex:**
```javascript
heresWhat: /here'?s\s+(what|the\s+(truth|reality|problem))[:\s]/gi
```

**Breakdown:**
- `here'?s` - "heres" or "here's" (optional apostrophe)
- `\s+` - Space
- `(what|the\s+(truth|reality|problem))` - "what" OR "the truth/reality/problem"
- `[:\s]` - Colon OR space

## Step-by-Step: Adding a New Pattern

### 1. Identify the Pattern

First, collect examples of the pattern you want to detect:

```
Example 1: Let that sink in.
Example 2: Read that again.
Example 3: Let me repeat: clarity matters.
```

### 2. Find Common Elements

What's consistent across all examples?
- Starts with imperative verb: "Let", "Read"
- Contains "that"
- Often ends with "again" or "in"

### 3. Write the Regex

```javascript
letThatSinkIn: /\b(let|read)\s+that\s+(sink\s+in|again)/gi
```

### 4. Add to the patterns object

```javascript
patterns: {
  // ... existing patterns ...
  
  letThatSinkIn: /\b(let|read)\s+that\s+(sink\s+in|again)/gi,
},
```

### 5. Test Your Pattern

Use the test page (`test-page.html`) or add a test case:

```javascript
{
  name: "Let that sink in pattern",
  text: "Let that sink in. Read that again.",
  expectedScore: 10,
  shouldDetect: true
}
```

## Advanced Patterns

### Multi-line Pattern with Optional Elements

**Detect:**
```
What changed?
Not tools.
The approach changed.
```

```javascript
whatChanged: /what\s+changed\?\s*(not|no)\s+/gi
```

### Lookahead/Lookbehind (Advanced)

**Detect bold text only if it appears 3+ times:**
```javascript
excessiveBold: /(\*\*[^*]{10,80}\*\*\s*){3,}/g
```

This matches:
- `\*\*` - Two asterisks (bold start)
- `[^*]{10,80}` - 10-80 non-asterisk characters
- `\*\*` - Two asterisks (bold end)
- `\s*` - Optional space
- `{3,}` - 3 or more times

## Common Patterns to Detect

### 1. False Dichotomy
```
"It's not X, it's Y"
"The answer isn't X, it's Y"
"This isn't about X, it's about Y"
```

### 2. Dramatic Lists
```
"Not X. Not Y. Just Z."
"No X. No Y. Only Z."
```

### 3. Engagement Bait
```
"Comment X to get Y"
"Like if you agree"
"Tag someone who needs this"
```

### 4. Faux Profundity
```
"Let that sink in"
"Read that again"
"The reality is..."
"Here's the truth:"
```

### 5. Numbered Urgency
```
"11 days to launch. Only 4 hours..."
"3 steps to success"
"In just 7 days..."
```

## Scoring Guidelines

When adding patterns, consider the point value:

- **10 points**: Strong AI slop indicators (structure patterns)
- **5 points**: Moderate indicators (emojis, formatting)
- **3 points**: Weak indicators (buzzwords)

Adjust in the `analyzeText()` function:

```javascript
detected.score += matches.length * 10; // 10 points per match
```

## Testing Your Pattern

### Method 1: Test Page
1. Open `test-page.html` in browser
2. Paste text with your pattern
3. Check if it's detected

### Method 2: Console Testing
```javascript
const text = "Your test text here";
const matches = text.match(/your-regex-here/gi);
console.log(matches);
```

### Method 3: Regex Tester
Use https://regex101.com/ with these settings:
- Flavor: ECMAScript (JavaScript)
- Flags: g, i, m (as needed)

## Common Pitfalls

### 1. Too Greedy
❌ Bad: `/the\s+.+\s+is/gi` (matches too much)
✅ Good: `/the\s+\w+\s+is/gi` (matches specific pattern)

### 2. Missing Word Boundaries
❌ Bad: `/not/gi` (matches "notation", "another")
✅ Good: `/\bnot\b/gi` (matches only "not")

### 3. Forgetting Escapes
❌ Bad: `/here's what:/gi` (apostrophe not escaped)
✅ Good: `/here'?s what:/gi` (optional apostrophe)

### 4. Case Sensitivity
❌ Bad: `/STOP/g` (only matches uppercase)
✅ Good: `/stop/gi` (case insensitive)

## Pattern Ideas to Implement

Here are some patterns you could add:

1. **"That's why..."** - Causal explanations
   ```javascript
   thatsWhy: /that'?s\s+why\s+[\w\s]{5,40}/gi
   ```

2. **"The reason is simple"**
   ```javascript
   reasonSimple: /the\s+reason\s+is\s+simple/gi
   ```

3. **"Bottom line:"**
   ```javascript
   bottomLine: /bottom\s+line[:]/gi
   ```

4. **Triple questions**
   ```javascript
   tripleQuestions: /\?\s*\n\s*[^\n]+\?\s*\n\s*[^\n]+\?/gm
   ```

5. **"X is dead. Long live Y."**
   ```javascript
   deadLongLive: /\w+\s+is\s+dead\.\s*long\s+live\s+\w+/gi
   ```

## Contributing Patterns

Found a new pattern? Here's the format:

```javascript
{
  pattern: /regex-here/gi,
  name: "descriptivePatternName",
  description: "Brief explanation of what this detects",
  examples: [
    "Example 1 of the pattern",
    "Example 2 of the pattern"
  ],
  points: 10
}
```

Submit via pull request or issue on the repository.
