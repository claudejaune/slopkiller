/**
 * Content Script for AI Slop Detector Chrome Extension
 * Runs on LinkedIn pages to detect and replace AI slop
 */

// Configuration
const CONFIG = {
  slopThreshold: 30, // Score threshold for detection
  enabled: true,
  debugMode: true, // Log detection info to console (enabled by default)
  settingsLoaded: false, // Track when settings are loaded
};

// Load settings from Chrome storage
chrome.storage.sync.get(['enabled', 'threshold'], (result) => {
  CONFIG.enabled = result.enabled !== false; // Default to true
  CONFIG.slopThreshold = result.threshold || 30;
  CONFIG.settingsLoaded = true;
  
  console.log('⚙️ Settings loaded:', { enabled: CONFIG.enabled, threshold: CONFIG.slopThreshold });
  
  // Now initialize - settings are loaded before processing starts
  initialize();
});

/**
 * Get complete post text (not just fragments)
 */
function getPostText(element) {
  return element.innerText || element.textContent || '';
}

/**
 * Clear all highlights from the page
 */
function clearAllHighlights() {
  // Remove highlighted class and inline styles from all elements
  document.querySelectorAll('.ai-slop-highlighted').forEach(el => {
    el.classList.remove('ai-slop-highlighted');
    el.style.backgroundColor = '';
    el.style.borderLeft = '';
    el.style.paddingLeft = '';
  });
  
  // Remove all badges
  document.querySelectorAll('.ai-slop-badge').forEach(el => {
    el.remove();
  });
  
  // Remove data attributes
  document.querySelectorAll('[data-slop-processed]').forEach(el => {
    el.removeAttribute('data-slop-processed');
  });
  
  if (CONFIG.debugMode) {
    console.log('🧹 Cleared all highlights');
  }
}

/**
 * Process a post container
 */
function processPost(post) {
  // Skip if already processed
  if (post.hasAttribute('data-slop-processed')) {
    return;
  }
  
  post.setAttribute('data-slop-processed', 'true');
  
  // Get complete post text
  const text = getPostText(post);
  
  if (text.length < 50) {
    return; // Too short to be slop
  }
  
  const analysis = AISlopDetector.analyzeText(text);
  
  if (CONFIG.debugMode) {
    console.log('📊 Analysis:', {
      score: analysis.score,
      threshold: CONFIG.slopThreshold,
      confidence: AISlopDetector.getConfidenceLevel(analysis.score),
      patterns: analysis.patterns,
      textLength: text.length,
      textPreview: text.substring(0, 100) + '...'
    });
  }
  
  if (analysis.score >= CONFIG.slopThreshold) {
    highlightSlop(post, analysis);
  }
}

/**
 * Highlight a post container
 */
function highlightSlop(element, analysis) {
  if (!element || element.classList.contains('ai-slop-highlighted')) {
    return;
  }
  
  // Find the parent container that wraps the WHOLE post
  const parentUpdate = element.closest('.feed-shared-update-v2');
  const parentArticle = element.closest('article');
  const postContainer = parentUpdate || parentArticle || element;
  
  if (postContainer.classList.contains('ai-slop-highlighted')) {
    return; // Already highlighted
  }
  
  postContainer.classList.add('ai-slop-highlighted');
  postContainer.style.backgroundColor = '#ffebee';
  postContainer.style.borderLeft = '4px solid #f44336';
  postContainer.style.paddingLeft = '8px';
  
  // Add badge showing score
  const badge = document.createElement('span');
  badge.className = 'ai-slop-badge';
  badge.textContent = `🤖 AI Slop Detected (Score: ${analysis.score})`;
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
  
  postContainer.insertBefore(badge, postContainer.firstChild);
  
  if (CONFIG.debugMode) {
    console.log('✨ Highlighted post with score:', analysis.score);
  }
}

/**
 * Find and process LinkedIn post containers
 */
function processLinkedInPosts() {
  if (!CONFIG.enabled) return;
  
  if (CONFIG.debugMode) {
    console.log('🔍 Scanning for LinkedIn posts...');
  }
  
  // LinkedIn post selectors (these may change, so we use multiple)
  const postSelectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-update-v2__commentary',
    '.feed-shared-inline-show-more-text',  // Individual post pages
    '.feed-shared-text',
    'article .update-components-text',
    '.break-words',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.feed-shared-update-v2',  // Full post containers
  ];
  
  let totalProcessed = 0;
  
  postSelectors.forEach(selector => {
    const posts = document.querySelectorAll(selector);
    
    posts.forEach(post => {
      processPost(post);
      totalProcessed++;
    });
  });
  
  if (CONFIG.debugMode && totalProcessed > 0) {
    console.log(`📝 Found ${totalProcessed} potential posts`);
  }
}

/**
 * Initialize and set up observer for dynamic content
 */
function initialize() {
  console.log('🚀 AI Slop Detector initializing...');
  
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
  
  // Log stats
  const highlightedCount = document.querySelectorAll('.ai-slop-highlighted').length;
  console.log('🎨 Total highlighted posts:', highlightedCount);
  console.log('AI Slop Detector initialized');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    CONFIG.enabled = request.settings.enabled;
    CONFIG.slopThreshold = request.settings.threshold;
    
    if (CONFIG.debugMode) {
      console.log('⚙️ Settings updated:', request.settings);
    }
    
    // Clear ALL existing highlights
    clearAllHighlights();
    
    // Re-process page with new settings
    processLinkedInPosts();
    
    sendResponse({ success: true });
  } else if (request.action === 'getStats') {
    const highlighted = document.querySelectorAll('.ai-slop-highlighted').length;
    sendResponse({ highlighted });
  }
});

