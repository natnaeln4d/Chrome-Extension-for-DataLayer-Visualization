document.addEventListener('DATALAYER_PUSH', (event) => {
  sendToExtension(event.detail);
});

document.addEventListener('DATALAYER_INIT', (event) => {
  sendToExtension(event.detail);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REFRESH_DATALAYER') {
    monitorDataLayer();
    sendResponse({status: 'refreshed'});
    return true;
  }
});
document.addEventListener('GTM_LOG', (event) => {
  sendToExtension(event.detail);
});

function sendToExtension(message) {
  if (!chrome.runtime?.id) {
    console.warn('Extension context not available');
    return;
  }
  
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Message failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.warn('Failed to send message:', e.message);
  }
}
function monitorDataLayer() {
  if (!window.dataLayer || !Array.isArray(window.dataLayer)) {
    console.log('No valid dataLayer found');
    return;
  }

  const originalPush = window.dataLayer.push;
  
  window.dataLayer.push = function() {
    try {
     
      const event = Array.from(arguments);
      
     
      const result = originalPush.apply(this, arguments);
      
    
      sendToExtension({
        type: 'DATALAYER_PUSH',
        data: event,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      return result;
    } catch (e) {
      console.error('Error in dataLayer.push wrapper:', e);
      
      return originalPush.apply(this, arguments);
    }
  };
  
 
  sendToExtension({
    type: 'DATALAYER_INIT',
    data: window.dataLayer.slice(), 
    url: window.location.href
  });
}


function injectScript() {
  try {
    if (document.head || document.documentElement) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = function() {
        this.remove();
      };
      script.onerror = function() {
        console.error('Failed to load injected script');
        this.remove();
      };
      
      (document.head || document.documentElement).appendChild(script);
    } else {
      
      setTimeout(injectScript, 100);
    }
  } catch (e) {
    console.error('Script injection failed:', e);
  }
}


function startInjection() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectScript();
  } else {
    const onLoad = () => {
      injectScript();
      window.removeEventListener('load', onLoad);
    };
    window.addEventListener('load', onLoad);
    

    document.addEventListener('DOMContentLoaded', injectScript);
  }
}

startInjection();