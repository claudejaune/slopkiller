/**
 * Content Script for AI Slop Detector Chrome Extension
 * Runs on LinkedIn pages to detect and replace AI slop
 */

// Configuration
const CONFIG = {
  slopThreshold: 30, // Score threshold for detection
  enabled: true,
  debugMode: false, // Log detection info to console
};

// Load settings from Chrome storage
chrome.storage.sync.get(['enabled', 'threshold'], (result) => {
  CONFIG.enabled = result.enabled !== false; // Default to true
  CONFIG.slopThreshold = result.threshold || 30;
});

/**
 * Process a text node and replace if it's AI slop
 */
function processTextNode(node) {
  if (!node.textContent || node.textContent.trim().length < 50) {
    return; // Too short to be slop
  }
  
  const text = node.textContent;
  const analysis = AISlopDetector.analyzeText(text);
  
  if (CONFIG.debugMode) {
    console.log('AI Slop Analysis:', {
      score: analysis.score,
      confidence: AISlopDetector.getConfidenceLevel(analysis.score),
      patterns: analysis.patterns,
      text: text.substring(0, 100) + '...'
    });
  }
  
  if (analysis.score >= CONFIG.slopThreshold) {
    highlightSlop(node.parentElement, analysis);
  }
}

/**
 * Highlight sloppy text instead of replacing
 */
function highlightSlop(element, analysis) {
  if (!element || element.classList.contains('ai-slop-highlighted')) {
    return;
  }
  
  element.classList.add('ai-slop-highlighted');
  element.style.backgroundColor = '#ffebee';
  element.style.borderLeft = '3px solid #f44336';
  element.style.paddingLeft = '8px';
  
  // Add badge showing score
  const badge = document.createElement('span');
  badge.className = 'ai-slop-badge';
  badge.textContent = `🤖 Slop Score: ${analysis.score}`;
  badge.style.cssText = `
    display: inline-block;
    background: #f44336;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    margin-left: 8px;
    font-weight: bold;
  `;
  
  element.insertBefore(badge, element.firstChild);
}

/**
 * Find and process LinkedIn post containers
 */
function processLinkedInPosts() {
  if (!CONFIG.enabled) return;
  
  // LinkedIn post selectors (these may change, so we use multiple)
  const postSelectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    '.feed-shared-update-v2__commentary',
    'article .update-components-text',
    '.break-words span[dir="ltr"]',
  ];
  
  postSelectors.forEach(selector => {
    const posts = document.querySelectorAll(selector);
    
    posts.forEach(post => {
      // Skip if already processed
      if (post.hasAttribute('data-slop-processed')) {
        return;
      }
      
      post.setAttribute('data-slop-processed', 'true');
      
      // Get all text nodes
      const walker = document.createTreeWalker(
        post,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      // Process each text node
      textNodes.forEach(textNode => {
        processTextNode(textNode);
      });
    });
  });
}

/**
 * Initialize and set up observer for dynamic content
 */
function initialize() {
  // Initial processing
  processLinkedInPosts();
  
  // Set up MutationObserver for dynamically loaded posts
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      }
    });
    
    if (shouldProcess) {
      // Debounce processing
      clearTimeout(window.slopProcessTimeout);
      window.slopProcessTimeout = setTimeout(() => {
        processLinkedInPosts();
      }, 500);
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  console.log('AI Slop Detector initialized');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    CONFIG.enabled = request.settings.enabled;
    CONFIG.slopThreshold = request.settings.threshold;
    
    // Re-process page
    document.querySelectorAll('[data-slop-processed]').forEach(el => {
      el.removeAttribute('data-slop-processed');
    });
    processLinkedInPosts();
    
    sendResponse({ success: true });
  } else if (request.action === 'getStats') {
    const highlighted = document.querySelectorAll('.ai-slop-highlighted').length;
    sendResponse({ highlighted });
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}