/**
 * This script runs in the context of the web page loaded in the BrowserView.
 * It detects Poki ads in the DOM, waits 5 seconds, then removes them.
 * Includes a global flag to disable the ad blocker for testing.
 */

window.__disablePokiAdBlocker = false;

function removePokiAds() {
  if (window.__disablePokiAdBlocker) {
    console.log('Poki ad blocker disabled.');
    return;
  }

  // Example selectors for Poki ads - adjust as needed
  const pokiAdSelectors = [
    '.poki-ad-container',
    '.poki-ad',
    '#poki-ad',
    '[id^="poki-ad"]',
    '[class*="poki-ad"]',
    '.ad-container.poki',
  ];

  pokiAdSelectors.forEach(selector => {
    const ads = document.querySelectorAll(selector);
    ads.forEach(ad => {
      if (ad && ad.parentNode && ad.offsetParent !== null) { // visible check
        ad.parentNode.removeChild(ad);
        console.log('Poki ad removed:', ad);
      }
    });
  });
}

// Toggle function to enable/disable the ad blocker dynamically
window.togglePokiAdBlocker = function() {
  window.__disablePokiAdBlocker = !window.__disablePokiAdBlocker;
  console.log('Poki ad blocker enabled:', !window.__disablePokiAdBlocker);
};

// Wait 5 seconds after page load, then remove Poki ads
window.addEventListener('load', () => {
  setTimeout(() => {
    removePokiAds();
  }, 1);
});

// Also observe DOM changes to catch dynamically added ads
const observer = new MutationObserver((mutations) => {
  if (window.__disablePokiAdBlocker) return;
  mutations.forEach(() => {
    removePokiAds();
  });
});

observer.observe(document.body, { childList: true, subtree: true });
