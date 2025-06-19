// Browser API polyfill
const browserAPI = (() => {
  // Check if we're in Firefox
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  }
  // Otherwise use Chrome
  return chrome;
})();

// Export the API
window.browserAPI = browserAPI; 