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

// Prioritized selectors for main post text blocks.
// Keep these narrow so we don't accidentally score comment bodies.
const MAIN_POST_SELECTORS = [
  '[data-testid="main-feed-activity-card__commentary"]',
  '[data-test-id="main-feed-activity-card__commentary"]',
  '[data-testid="expandable-text-box"]',
  '.feed-shared-update-v2__description',
  '.feed-shared-text',
  '.feed-shared-inline-show-more-text',
  'article .update-components-text',
  '.update-components-update-v2__commentary',
  '.update-components-text-view',
];

const COMMENT_SELECTORS = [
  '[data-view-name="comment-commentary"]',
  '[data-view-name="comments-comments-list"]',
  '[data-view-name="comments-comment-item"]',
  '[data-testid="comments-comment-box-text"]',
  '[data-testid="commentary-text"]',
  '.comments-comment-item',
  '.comments-comment-item-content',
  '.comments-comment-entity',
  '.feed-shared-comment',
  '.comment-content',
];

const FEED_CONTAINER_SELECTORS = [
  '.feed-shared-update-v2',
  'article',
];

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
  
  // Remove "Feed post", "Product at Company | Startup Advisor" style headers
  cleaned = cleaned.replace(/^Product at.*?\n/, ''); // Remove headline line
  cleaned = cleaned.replace(/^(.*?\|.*?\|.*?)+\n/, ''); // Remove pipe-separated header lines
  
  // Remove "Feed post" and similar UI text
  cleaned = cleaned.replace(/Feed post/gi, '');
  
  // Remove follower counts and visibility info (common in post page headers)
  cleaned = cleaned.replace(/\d{1,3}(?:,\d{3})*\s*followers?/gi, '');
  cleaned = cleaned.replace(/Visible to anyone( on or off LinkedIn)?/gi, '');
  cleaned = cleaned.replace(/Visible to connections only/gi, '');
  cleaned = cleaned.replace(/Visible to members only/gi, '');
  
  // Remove verification badges and status indicators
  cleaned = cleaned.replace(/•\s*(1st|2nd|3rd|4th|5th|Verified|Promoted|Sponsored)/g, '');
  
  // Remove LinkedIn button and action text
  cleaned = cleaned.replace(/(Like|Comment|Share|Tag|Report|Save)\s+(this\s+post|someone|if|to|now)?/gi, '');
  cleaned = cleaned.replace(/drop\s+a\s+comment/gi, '');
  
  // Remove time indicators (e.g., "1d", "2h", "3w", "1 week ago")
  cleaned = cleaned.replace(/\b\d+[dhw]\b/g, '');
  cleaned = cleaned.replace(/\b\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago\b/gi, '');
  
  // Remove hashtags at the end (they're not slop patterns)
  cleaned = cleaned.replace(/(?:\s*#[A-Za-z0-9_]+)+$/, '');
  
  // Preserve line structure for structural pattern detection.
  // Only normalize spaces/tabs, not all whitespace.
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n[ \t]+/g, '\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^[ \t]+|[ \t]+$/gm, '');
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
 * Check if an element is a LinkedIn comment (not main post)
 */
function isComment(element) {
  // LinkedIn feed uses `feed-commentary` for main post text.
  // Only explicit comment contexts should be excluded.
  const viewNode = element.closest?.('[data-view-name]');
  const viewName = viewNode?.getAttribute('data-view-name')?.toLowerCase() || '';
  if (viewName === 'feed-commentary') {
    return false;
  }
  if (viewName === 'comment-commentary' || viewName.startsWith('comments-')) {
    return true;
  }

  // Check if element or any ancestor has comment indicators
  for (const selector of COMMENT_SELECTORS) {
    if (element.closest(selector)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if element is likely UI/chrome text rather than post body
 */
function isLikelyUiText(element) {
  const text = (element.innerText || '').trim();
  if (!text) return true;
  if (text.length < 50) return true;

  const uiOnly = [
    'Like',
    'Comment',
    'Share',
    'Send',
    'Repost',
    'Follow',
    'Promoted',
    'Sponsored',
  ];

  return uiOnly.includes(text);
}

/**
 * Fallback: within a feed card/article, find the best candidate text block
 */
function findPrimaryTextInContainer(container) {
  // Try strict selectors first, scoped to the container.
  for (const selector of MAIN_POST_SELECTORS) {
    const el = container.querySelector(selector);
    if (!el) continue;
    if (isComment(el)) continue;
    if (isLikelyUiText(el)) continue;
    return el;
  }

  // Generic fallback for evolving LinkedIn markup:
  // pick the longest non-comment text block inside the container.
  const genericCandidates = container.querySelectorAll('div, span, p');
  let best = null;
  let bestLen = 0;

  genericCandidates.forEach((el) => {
    if (isComment(el)) return;
    if (el.closest('button, nav, footer, aside')) return;
    const text = (el.innerText || '').trim();
    if (text.length < 80) return;
    if (isLikelyUiText(el)) return;
    if (text.length > bestLen) {
      best = el;
      bestLen = text.length;
    }
  });

  return best;
}

/**
 * Process a post container
 */
function processPost(post) {
  // Skip if already processed
  if (post.hasAttribute('data-slop-processed')) {
    return { status: 'already' };
  }
  
  // Skip if this is a comment (we only want to analyze main posts)
  // Use stable data attributes - comments have data-view-name="comment-commentary"
  if (isComment(post)) {
    if (CONFIG.debugMode) {
      console.log('⏭️ Skipped (comment detected)');
    }
    post.setAttribute('data-slop-processed', 'true');
    return { status: 'comment' };
  }
  
  post.setAttribute('data-slop-processed', 'true');
  
  // Get complete post text
  let text = getPostText(post);
  
  // Clean text to remove LinkedIn UI elements
  const originalLength = text.length;
  text = cleanText(text);
  const cleanedLength = text.length;
  
  if (text.length < 50) {
    return { status: 'short' }; // Too short to be slop
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
    return { status: 'highlighted', analysis };
  }

  return { status: 'analyzed', analysis };
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
  // Keep selectors narrow to main-post text to avoid comment blocks.
  const postSelectors = MAIN_POST_SELECTORS;
  
  if (CONFIG.debugMode) {
    console.log('🔎 Checking which selectors match:');
    postSelectors.forEach(selector => {
      const count = document.querySelectorAll(selector).length;
      console.log(`  ${selector}: ${count} elements`);
    });
  }
  
  let totalCandidates = 0;
  let analyzedPosts = 0;
  let highlightedPosts = 0;
  let skippedComment = 0;
  let skippedShort = 0;
  
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
      
      totalCandidates++;
      const beforeProcess = post.innerText?.substring(0, 80);
      const result = processPost(post);
      
      if (result?.status === 'comment') {
        skippedComment++;
      } else if (result?.status === 'short') {
        skippedShort++;
        if (CONFIG.debugMode) {
          console.log(`⏭️ Skipped (too short): "${beforeProcess}..."`);
        }
      } else if (result?.status === 'analyzed') {
        analyzedPosts++;
      } else if (result?.status === 'highlighted') {
        analyzedPosts++;
        highlightedPosts++;
      }
    });
  });

  // Feed fallback: if strict selectors miss the current LinkedIn DOM,
  // scan feed/article containers and infer main post text from within.
  if (totalCandidates === 0) {
    if (CONFIG.debugMode) {
      console.log('🧭 No direct selector matches; trying feed container fallback');
    }

    FEED_CONTAINER_SELECTORS.forEach((selector) => {
      const containers = document.querySelectorAll(selector);
      containers.forEach((container) => {
        const candidate = findPrimaryTextInContainer(container);
        if (!candidate) return;
        if (candidate.hasAttribute('data-slop-processed')) return;

        totalCandidates++;
        const result = processPost(candidate);
        if (result?.status === 'comment') {
          skippedComment++;
        } else if (result?.status === 'short') {
          skippedShort++;
        } else if (result?.status === 'analyzed') {
          analyzedPosts++;
        } else if (result?.status === 'highlighted') {
          analyzedPosts++;
          highlightedPosts++;
        }
      });
    });
  }
  
  if (CONFIG.debugMode) {
    console.log(`📊 Summary: ${totalCandidates} candidates, ${analyzedPosts} analyzed, ${highlightedPosts} highlighted, ${skippedComment} comments skipped, ${skippedShort} too short`);
    const highlightedCount = document.querySelectorAll('.ai-slop-highlighted').length;
    console.log(`🎨 Total highlighted: ${highlightedCount}`);
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
