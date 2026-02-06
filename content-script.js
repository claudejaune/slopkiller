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
 * Clean text by removing LinkedIn UI elements
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove common LinkedIn UI text patterns
  let cleaned = text;
  
  // Remove user name headers and profile info (flexible 1-5 lines)
  cleaned = cleaned.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n/, ''); // First 5 lines max
  
  // Remove "Feed post", "Product at Company | Startup Advisor" style headers
  cleaned = cleaned.replace(/^Product at.*?\n/, ''); // Remove headline line
  cleaned = cleaned.replace(/^(.*?\|.*?\|.*?)+\n/, ''); // Remove pipe-separated header lines
  
  // Remove "Feed post" and similar UI text
  cleaned = cleaned.replace(/Feed post/gi, '');
  
  // Remove verification badges and status indicators
  cleaned = cleaned.replace(/•\s*(1st|2nd|3rd|4th|5th|Verified|Promoted|Sponsored)/g, '');
  
  // Remove LinkedIn button and action text
  cleaned = cleaned.replace(/(Like|Comment|Share|Tag|Report|Save)\s+(this\s+post|someone|if|to|now)?/gi, '');
  cleaned = cleaned.replace(/drop\s+a\s+comment/gi, '');
  
  // Remove time indicators (e.g., "1d", "2h", "3w")
  cleaned = cleaned.replace(/\b\d+[dhw]\b/g, '');
  
  // Remove hashtags at the end (they're not slop patterns)
  cleaned = cleaned.replace(/(?:\s*#[A-Za-z0-9_]+)+$/, '');
  
  // Remove empty lines and excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  cleaned = cleaned.replace(/^\s+|\s+$/gm, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Clear all highlights from page
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
  
  // Skip if this is a comment (we only want to analyze main posts)
  const commentParent = post.closest(
    '.feed-shared-comment, .comments-comment-item, .comment-content, ' +
    '.feed-shared-comments, .social-details-article, .comments-list, ' +
    '.feed-shared-update-v2__commentary'
  );
  if (commentParent) {
    post.setAttribute('data-slop-processed', 'true');
    return;
  }
  
  post.setAttribute('data-slop-processed', 'true');
  
  // Get complete post text
  let text = getPostText(post);
  
  // Clean text to remove LinkedIn UI elements
  const originalLength = text.length;
  text = cleanText(text);
  const cleanedLength = text.length;
  
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
      originalLength: originalLength,
      cleanedLength: cleanedLength,
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
  
  // Find parent container that wraps the WHOLE post
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
  
  // LinkedIn post selectors - ORDER MATTERS!
  // Text-only selectors FIRST to avoid analyzing headers, buttons, UI
  const postSelectors = [
    '.feed-shared-update-v2__description',  // Post text content - check FIRST
    '.feed-shared-text',  // Text elements
    '.feed-shared-inline-show-more-text',  // Individual post pages
    'article .update-components-text',  // Component text
    '.break-words',  // Break word elements
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.feed-shared-update-v2',  // FULL container - check LAST (fallback)
    'article',  // Article tags - LAST (fallback)
  ];
  
  let totalProcessed = 0;
  let newlyProcessed = 0;
  
  postSelectors.forEach(selector => {
    const posts = document.querySelectorAll(selector);
    
    posts.forEach(post => {
      // Skip if already processed by a higher-priority selector
      if (post.hasAttribute('data-slop-processed')) {
        return;
      }
      
      // Check if this element is contained within an already-processed post
      const processedAncestor = post.closest('[data-slop-processed="true"]');
      if (processedAncestor) {
        // Mark as processed to avoid duplicate work
        post.setAttribute('data-slop-processed', 'true');
        return;
      }
      
      processPost(post);
      totalProcessed++;
      newlyProcessed++;
    });
  });
  
  if (CONFIG.debugMode) {
    if (newlyProcessed > 0) {
      console.log(`📝 Found ${totalProcessed} potential posts, processed ${newlyProcessed} new ones`);
    }
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