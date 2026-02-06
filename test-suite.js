/**
 * Test Suite for AI Slop Detector
 * Run in Node.js or browser console
 */

const AISlopDetector = require('./ai-slop-detector.js');

// Test cases with expected scores
const testCases = [
  {
    name: "Classic 'not X, it's Y' pattern",
    text: "The gap isn't jobs. It's understanding.",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Staccato negation",
    text: "Not tools. Not salary. Not workload. Just clarity.",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Here's what formula",
    text: "Here's the uncomfortable truth: we're failing.",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Multiple patterns combined",
    text: `Here's the uncomfortable truth: We're producing tool operators, not security professionals.
    
The gap isn't jobs. It's understanding.

Not tools. Not salary. Not workload.`,
    expectedScore: 30,
    shouldDetect: true
  },
  {
    name: "On paper but reality",
    text: "On paper, it may sound perfect. But in reality, it's an operational challenge.",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Engagement bait",
    text: "Like this post and comment 'KEYWORDS' if you want the full guide!",
    expectedScore: 20,
    shouldDetect: true
  },
  {
    name: "Emoji spam",
    text: "This is amazing! 🚀 ✅ 👇 🔥 💡 Check it out!",
    expectedScore: 25,
    shouldDetect: true
  },
  {
    name: "What if answer pattern",
    text: "What if local shopkeepers were the answer to India's logistics puzzle?",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Normal human text",
    text: "I had a great meeting today. We discussed the new project timeline and everyone agreed on the deliverables. Looking forward to next week.",
    expectedScore: 0,
    shouldDetect: false
  },
  {
    name: "Professional update",
    text: "Just finished implementing the new API endpoint. The performance improvements are significant - response times down by 40%. Thanks to the team for their code reviews.",
    expectedScore: 0,
    shouldDetect: false
  },
  {
    name: "Real LinkedIn post (high slop)",
    text: `Just wrapped up interviews for a cybersecurity role.

Not a single candidate could explain how the tools they use actually work.

Here's the uncomfortable truth: We're producing tool operators, not security professionals.

The gap isn't jobs. It's understanding.

Real cybersecurity professionals:
• Understand protocols before they scan them
• Know what happens at Layer 3 when they run a tool
• Think like attackers, not button-clickers

To aspiring cybersecurity professionals: Stop chasing the next shiny certification.

The industry doesn't need more tool operators.
It needs more problem solvers.`,
    expectedScore: 60,
    shouldDetect: true
  },
  {
    name: "Servant leadership slop",
    text: `I scheduled a 1:1.

Not to lecture.
Not to warn.
But to listen.

What happened over the next two months still stays with me.

What changed?
Not tools.
Not salary.
Not workload.

The leadership approach changed.

Because servant leadership isn't about being "soft".
It's about having the courage to stand firm on values.

Sometimes performance doesn't need more pressure.
It needs trust.`,
    expectedScore: 80,
    shouldDetect: true
  },
  {
    name: "Buzzword heavy",
    text: "This is a game-changer for thought leadership. The paradigm shift in servant leadership is uncomfortable truth we must face.",
    expectedScore: 12,
    shouldDetect: true
  },
  {
    name: "Stop/Start pattern",
    text: "Stop chasing certifications. Start understanding fundamentals.",
    expectedScore: 10,
    shouldDetect: true
  },
  {
    name: "Less/More pattern",
    text: "Less platform. More infrastructure. Less noise. More signal.",
    expectedScore: 20,
    shouldDetect: true
  }
];

// Run tests
function runTests() {
  console.log('='.repeat(60));
  console.log('AI SLOP DETECTOR - TEST SUITE');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(60));
    
    const analysis = AISlopDetector.analyzeText(testCase.text);
    const isDetected = AISlopDetector.isSlop(testCase.text, 30);
    
    console.log(`Text preview: "${testCase.text.substring(0, 80)}..."`);
    console.log(`Score: ${analysis.score}`);
    console.log(`Confidence: ${AISlopDetector.getConfidenceLevel(analysis.score)}`);
    console.log(`Detected patterns:`, Object.keys(analysis.patterns).filter(p => analysis.patterns[p] > 0));
    console.log(`Detected emojis:`, Object.keys(analysis.emojis).filter(e => analysis.emojis[e] > 0));
    console.log(`Buzzwords:`, analysis.buzzwords);
    
    const testPassed = (isDetected === testCase.shouldDetect);
    
    if (testPassed) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log(`❌ FAIL - Expected ${testCase.shouldDetect ? 'detection' : 'no detection'}, got ${isDetected ? 'detection' : 'no detection'}`);
      failed++;
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total: ${testCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testCases };
