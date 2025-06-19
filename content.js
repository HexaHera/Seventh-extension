console.log('Content script loaded and initialized');

// Global variables
let floatingInput = null;
let currentInput = null;
let habitMode = false;
let advancedMode = false;
let suppressFloatingInput = false;

// Debug logging
console.log('Content script starting initialization...');

// Function to create floating input box with Shadow DOM
function createFloatingInput() {
  // Remove any existing floating input
  const oldHost = document.getElementById('floating-input-host');
  if (oldHost) oldHost.remove();

  console.log('Creating floating input box');
  const host = document.createElement('div');
  host.id = 'floating-input-host';
  host.style.position = 'fixed';
  host.style.top = '40px';
  host.style.left = '50%';
  host.style.transform = 'translateX(-50%)';
  host.style.zIndex = '2147483647';
  host.style.display = 'none';

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .floating-input-box, .floating-textarea, .button-container, .copy-btn, .close-btn {
        text-decoration: none !important;
      }
      .floating-input-box {
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        min-width: 320px;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      .floating-textarea {
        width: 100%;
        height: 80px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
        margin-bottom: 10px;
        box-sizing: border-box;
      }
      .button-container {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .copy-btn, .close-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      .copy-btn {
        background: #4CAF50;
        color: white;
      }
      .close-btn {
        background: #f44336;
        color: white;
      }
    </style>
    <div class="floating-input-box">
      <textarea class="floating-textarea" placeholder="Type your text here..."></textarea>
      <div class="button-container">
        <button class="copy-btn">Copy</button>
        <button class="close-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(host);
  console.log('Floating input host appended:', host, host.shadowRoot);

  // Get elements from shadow root
  const textarea = shadow.querySelector('.floating-textarea');
  const copyButton = shadow.querySelector('.copy-btn');
  const closeButton = shadow.querySelector('.close-btn');
  console.log('Close button element:', closeButton);

  // Add a visible outline for debug
  closeButton.style.outline = '2px solid red';

  // Add event listeners
  textarea.addEventListener('input', () => {
    if (currentInput) {
      if ('value' in currentInput) {
        currentInput.value = textarea.value;
        const event = new Event('input', { bubbles: true });
        currentInput.dispatchEvent(event);
      } else if (currentInput.isContentEditable) {
        currentInput.innerText = textarea.value;
      }
    }
  });

  copyButton.addEventListener('click', function () {
    if (currentInput) {
      if ('value' in currentInput) {
        currentInput.value = textarea.value;
        const event = new Event('input', { bubbles: true });
        currentInput.dispatchEvent(event);
      } else if (currentInput.isContentEditable) {
        currentInput.innerText = textarea.value;
      }
      textarea.select();
      document.execCommand('copy');
      showNotification('Text copied to original input!');
    }
  });

  closeButton.addEventListener('click', function (e) {
    console.log('Close button clicked', e, this);
    host.style.display = 'none';
    const textarea = host.shadowRoot.querySelector('.floating-textarea');
    if (textarea) textarea.value = '';
    suppressFloatingInput = true;
    if (currentInput) {
      currentInput.blur();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && host.style.display === 'block') {
      host.style.display = 'none';
      if (currentInput) {
        currentInput.focus();
      }
    }
  });

  console.log('Floating input box created and added to DOM (Shadow DOM)');
  return host;
}

// AI functionality using OpenAI API key
async function processWithAI(text, prompt) {
  try {
    // Get API key from storage
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      showNotification('Please add your OpenAI API key in the extension popup');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that processes text based on user requests."
          },
          {
            role: "user",
            content: `${prompt}\n\nText to process: ${text}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI processing error:', error);
    showNotification('Error processing with AI. Please check your API key and try again.');
    return null;
  }
}

// Function to show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000000;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// Function to handle focus events
function handleFocus(event) {
  if (suppressFloatingInput) {
    suppressFloatingInput = false;
    return;
  }
  // Ignore focus events from inside the floating input (including Shadow DOM)
  if (floatingInput) {
    const path = event.composedPath();
    if (path.includes(floatingInput) || (floatingInput.shadowRoot && path.includes(floatingInput.shadowRoot))) {
      return;
    }
    if (floatingInput.shadowRoot) {
      for (const el of path) {
        if (el instanceof Node && floatingInput.shadowRoot.contains(el)) {
          return;
        }
      }
    }
  }

  console.log('Focus event triggered on:', event.target);
  if (!habitMode) return;

  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    console.log('Habit mode is enabled, showing floating input');
    if (!floatingInput) {
      floatingInput = createFloatingInput();
    }
    currentInput = target;
    floatingInput.style.display = 'block';
    // Set textarea value in shadow root
    const textarea = floatingInput.shadowRoot.querySelector('.floating-textarea');
    textarea.value = target.value;
    // textarea.focus(); // Removed to prevent recursion
  }
}

// Initialize the content script
console.log('Content script starting initialization...');

// Load initial state
chrome.storage.local.get(['habitMode', 'advancedMode'], (result) => {
  console.log('Loading initial state:', result);
  habitMode = result.habitMode || false;
  advancedMode = result.advancedMode || false;
});

// Add event listeners
document.addEventListener('focus', handleFocus, true);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  if (message.type === 'toggleHabitMode') {
    console.log('Habit Mode toggled:', message.enabled);
    habitMode = message.enabled;
  } else if (message.type === 'toggleAdvancedMode') {
    advancedMode = message.enabled;
  }
});

// Add text selection handler to get the selected text
document.addEventListener('mouseup', async () => {
  if (!advancedMode) return;

  const selectedText = window.getSelection().toString();
  if (selectedText) {
    // Show a small floating button near the selection
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const aiButton = document.createElement('button');
    aiButton.className = 'fixed bg-blue-500 text-white px-3 py-1 rounded-lg shadow-lg z-50 text-sm';
    aiButton.textContent = 'AI';
    aiButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
    aiButton.style.left = `${rect.left + window.scrollX}px`;

    aiButton.addEventListener('click', async () => {
      const processedText = await processWithAI(
        selectedText,
        'Improve this text while maintaining its meaning:'
      );
      if (processedText) {
        // Replace the selected text
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(processedText));
        showNotification('Text processed successfully!');
      }
      aiButton.remove();
    });

    document.body.appendChild(aiButton);
    setTimeout(() => aiButton.remove(), 5000); // Remove after 5 seconds
  }
});

console.log('Content script initialization complete');
