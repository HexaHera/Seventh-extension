// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get all the elements we need
  const habitModeToggle = document.getElementById('habitModeToggle');
  const advancedModeToggle = document.getElementById('advancedModeToggle');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const statusMessage = document.getElementById('statusMessage');

  // Function to show status messages
  function showStatus(message, isError = false) {
    if (!statusMessage) {
      console.error('Status message element not found');
      return;
    }

    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : 'success';

    setTimeout(() => {
      if (statusMessage) {
        statusMessage.textContent = '';
        statusMessage.className = '';
      }
    }, 3000);
  }

  // Load saved state
  chrome.storage.local.get(['habitMode', 'advancedMode', 'apiKey'], (result) => {
    if (habitModeToggle) habitModeToggle.checked = result.habitMode || false;
    if (advancedModeToggle) advancedModeToggle.checked = result.advancedMode || false;
    if (apiKeyInput) apiKeyInput.value = result.apiKey || '';
  });

  // Handle habit mode toggle
  if (habitModeToggle) {
    habitModeToggle.addEventListener('change', () => {
      const enabled = habitModeToggle.checked;
      chrome.storage.local.set({ habitMode: enabled }, () => {
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'toggleHabitMode',
              enabled: enabled
            }).catch(() => {
              // Ignore errors when content script is not ready
              console.log('Content script not ready yet');
            });
          }
        });
        showStatus('Habit Mode ' + (enabled ? 'enabled' : 'disabled'));
      });
    });
  }

  // Handle advanced mode toggle
  if (advancedModeToggle) {
    advancedModeToggle.addEventListener('change', () => {
      const enabled = advancedModeToggle.checked;
      chrome.storage.local.set({ advancedMode: enabled }, () => {
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'toggleAdvancedMode',
              enabled: enabled
            }).catch(() => {
              // Ignore errors when content script is not ready
              console.log('Content script not ready yet');
            });
          }
        });
        showStatus('Advanced Mode ' + (enabled ? 'enabled' : 'disabled'));
      });
    });
  }

  // Handle API key save
  if (saveApiKeyButton && apiKeyInput) {
    saveApiKeyButton.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        chrome.storage.local.set({ apiKey }, () => {
          showStatus('API key saved successfully');
        });
      } else {
        showStatus('Please enter a valid API key', true);
      }
    });
  }
});
