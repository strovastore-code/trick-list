// Random Trick Session Tracker
// Automatically prevents the same trick from appearing twice in a session

(function() {
  // Override fetch to intercept and track random trick selections
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input.url;
    
    // Call original fetch first
    const response = await originalFetch(...args);
    
    // If this is a tricks fetch, filter out already-seen tricks for random selection
    if (url.includes('/api/tricks') && !url.includes('/api/me/learned')) {
      try {
        // Clone response so we can read it
        const clone = response.clone();
        const tricks = await clone.json();
        
        // Get random history from session storage
        const history = JSON.parse(sessionStorage.getItem('tricklist_random_history') || '[]');
        
        // Check if this request is from a random trick function
        // We'll add a marker in the URL or check the call stack
        const stack = new Error().stack || '';
        const isRandomRequest = stack.includes('an=') || stack.includes('yn=') || 
                                 url.includes('random=true') ||
                                 (init && init.headers && init.headers['X-Random-Request']);
        
        if (isRandomRequest && Array.isArray(tricks)) {
          // Filter out tricks that have been shown this session
          const filteredTricks = tricks.filter(trick => !history.includes(trick.id));
          
          // If all tricks have been shown, clear history and start over
          if (filteredTricks.length === 0 && tricks.length > 0) {
            sessionStorage.removeItem('tricklist_random_history');
            return new Response(JSON.stringify(tricks), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
          
          // Return filtered tricks
          return new Response(JSON.stringify(filteredTricks), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    return response;
  };
  
  // Expose global function to track when a trick is shown
  window.trackRandomTrick = function(trickId) {
    try {
      const history = JSON.parse(sessionStorage.getItem('tricklist_random_history') || '[]');
      if (!history.includes(trickId)) {
        history.push(trickId);
        sessionStorage.setItem('tricklist_random_history', JSON.stringify(history));
      }
    } catch (e) {
      // Silent fail
    }
  };
  
  // Expose function to clear history (for new session or reset)
  window.clearRandomHistory = function() {
    sessionStorage.removeItem('tricklist_random_history');
  };
  
  // Intercept Math.random to detect random trick selection
  // This is a more aggressive approach - wrap random selection in DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          // Look for trick display elements
          const trickElements = node.querySelectorAll('[data-testid*="random"], [class*="random"]');
          trickElements.forEach(function(el) {
            // Try to extract trick ID from various attributes
            const trickId = el.getAttribute('data-trick-id') || 
                          el.getAttribute('data-id') ||
                          (el.textContent && el.textContent.match(/ID:\s*(\d+)/)?.[1]);
            
            if (trickId) {
              window.trackRandomTrick(parseInt(trickId));
            }
          });
        }
      });
    });
  });
  
  // Start observing
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
