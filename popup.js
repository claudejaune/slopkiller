/**
 * Popup script for AI Slop Detector
 */

// DOM elements
const enabledCheckbox = document.getElementById('enabled');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const confidenceLabel = document.getElementById('confidenceLabel');
const highlightedCount = document.getElementById('highlightedCount');
const refreshButton = document.getElementById('refresh');
let saveTimeout = null;

// Load saved settings
chrome.storage.sync.get(['enabled', 'threshold'], (result) => {
  enabledCheckbox.checked = result.enabled !== false;
  thresholdSlider.value = result.threshold || 30;
  updateThresholdDisplay();
  updateStats();
});

// Update threshold display
function updateThresholdDisplay() {
  const value = parseInt(thresholdSlider.value);
  thresholdValue.textContent = value;
  
  // Update confidence label
  let confidence = 'LOW';
  let className = 'low';
  
  if (value >= 80) {
    confidence = 'VERY HIGH';
    className = 'very-high';
  } else if (value >= 50) {
    confidence = 'HIGH';
    className = 'high';
  } else if (value >= 25) {
    confidence = 'MEDIUM';
    className = 'medium';
  }
  
  confidenceLabel.textContent = confidence;
  confidenceLabel.className = `confidence ${className}`;
}

// Save settings
function saveSettings() {
  const settings = {
    enabled: enabledCheckbox.checked,
    threshold: parseInt(thresholdSlider.value),
  };
  
  chrome.storage.sync.set(settings);
  
  console.log('💾 Saving settings:', settings);
  
  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateSettings',
        settings: settings
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('✅ Settings sent to content script');
          // Update stats after a brief delay
          setTimeout(updateStats, 500);
        }
      });
    }
  });
}

function scheduleSaveSettings(delay = 200) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSettings, delay);
}

// Get stats from content script
function updateStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getStats'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Could not get stats (may not be on LinkedIn)');
          highlightedCount.textContent = '-';
        } else if (response) {
          highlightedCount.textContent = response.highlighted || 0;
        }
      });
    }
  });
}

// Event listeners
enabledCheckbox.addEventListener('change', saveSettings);
thresholdSlider.addEventListener('input', () => {
  updateThresholdDisplay();
  scheduleSaveSettings();
});
thresholdSlider.addEventListener('change', saveSettings);

refreshButton.addEventListener('click', () => {
  console.log('🔄 Refreshing detection...');
  saveSettings(); // This triggers re-detection
});

// Update stats periodically
setInterval(updateStats, 5000);
