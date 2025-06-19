// Store current state
let state = {
  habitMode: false,
  advancedMode: false
};

// Load saved state when extension starts
chrome.storage.local.get(['habitMode', 'advancedMode'], (result) => {
  state.habitMode = result.habitMode || false;
  state.advancedMode = result.advancedMode || false;
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-habit-mode') {
    state.habitMode = !state.habitMode;
    chrome.storage.local.set({ habitMode: state.habitMode }, () => {
      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'toggleHabitMode',
            enabled: state.habitMode
          });
        }
      });
    });
  } else if (command === 'toggle-advanced-mode') {
    state.advancedMode = !state.advancedMode;
    chrome.storage.local.set({ advancedMode: state.advancedMode }, () => {
      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'toggleAdvancedMode',
            enabled: state.advancedMode
          });
        }
      });
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);

  if (message.type === 'getState') {
    sendResponse(state);
  } else if (message.type === 'toggleHabitMode') {
    state.habitMode = message.enabled;
    chrome.storage.local.set({ habitMode: state.habitMode }, () => {
      sendResponse({ success: true });
    });
  } else if (message.type === 'toggleAdvancedMode') {
    state.advancedMode = message.enabled;
    chrome.storage.local.set({ advancedMode: state.advancedMode }, () => {
      sendResponse({ success: true });
    });
  }

  return true; // Keep the message channel open for async response
});
