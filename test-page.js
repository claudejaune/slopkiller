function analyzeTextInput() {
  const text = document.getElementById('testText').value;

  if (!text.trim()) {
    alert('Please enter some text to analyze');
    return;
  }

  displayResults(text);
}

function testExample(element) {
  const text = element.innerText.split('\n').slice(1).join('\n'); // Remove header
  document.getElementById('testText').value = text;
  displayResults(text);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayResults(text) {
  const analysis = AISlopDetector.analyzeText(text);
  const confidence = AISlopDetector.getConfidenceLevel(analysis.score);
  const isSlop = AISlopDetector.isSlop(text, 30);

  // Show results
  document.getElementById('results').style.display = 'block';
  document.getElementById('scoreValue').textContent = analysis.score;

  // Update confidence badge
  const badge = document.getElementById('confidenceBadge');
  badge.textContent = confidence;
  badge.className = 'confidence ' + confidence.toLowerCase().replace(' ', '-');

  // Verdict
  const verdict = document.getElementById('verdict');
  if (isSlop) {
    verdict.textContent = '🚨 AI SLOP DETECTED!';
    verdict.style.color = '#f44336';
  } else {
    verdict.textContent = '✅ Looks human to me!';
    verdict.style.color = '#4caf50';
  }

  // Display patterns
  const patternsList = document.getElementById('patternsList');
  patternsList.innerHTML = '';
  if (Object.keys(analysis.patterns).length > 0) {
    for (const [name, count] of Object.entries(analysis.patterns)) {
      if (count > 0) {
        const div = document.createElement('div');
        div.className = 'pattern-item';
        div.innerHTML = `
          <span>${name.replace(/([A-Z])/g, ' $1').trim()}</span>
          <span class="badge">${count}x</span>
        `;
        patternsList.appendChild(div);
      }
    }
  } else {
    patternsList.innerHTML = '<em>None detected</em>';
  }

  // Display emojis
  const emojisList = document.getElementById('emojisList');
  emojisList.innerHTML = '';
  if (Object.keys(analysis.emojis).length > 0) {
    for (const [name, count] of Object.entries(analysis.emojis)) {
      if (count > 0) {
        const div = document.createElement('div');
        div.className = 'pattern-item';
        div.innerHTML = `
          <span>${name}</span>
          <span class="badge">${count}x</span>
        `;
        emojisList.appendChild(div);
      }
    }
  } else {
    emojisList.innerHTML = '<em>None detected</em>';
  }

  // Display buzzwords
  const buzzwordsList = document.getElementById('buzzwordsList');
  if (analysis.buzzwords.length > 0) {
    buzzwordsList.innerHTML = analysis.buzzwords.map((w) =>
      `<span class="badge" style="margin: 2px;">${w}</span>`
    ).join(' ');
  } else {
    buzzwordsList.innerHTML = '<em>None detected</em>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('analyzeButton');
  const posts = document.querySelectorAll('.post');

  analyzeButton.addEventListener('click', analyzeTextInput);

  posts.forEach((post) => {
    post.addEventListener('click', () => testExample(post));
  });
});
