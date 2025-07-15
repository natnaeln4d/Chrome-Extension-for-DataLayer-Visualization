
const devtoolsConnections = {};


chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "devtools-page") {
    
    port.onMessage.addListener(function(msg) {
      if (msg.name === 'init') {
        devtoolsConnections[msg.tabId] = port;
        
        
        port.onDisconnect.addListener(function() {
          delete devtoolsConnections[msg.tabId];
        });
      }
    });
  }
});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (sender.tab && devtoolsConnections[sender.tab.id]) {
    devtoolsConnections[sender.tab.id].postMessage({
      type: 'DATALAYER_UPDATE',
      data: request.data
    });
  }
  

  return true;
});



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (!request || !request.type) {
      console.error('Invalid message format', request);
      if (sendResponse) sendResponse({error: 'Invalid message format'});
      return;
    }

   
    if (sender.tab && devtoolsConnections[sender.tab.id]) {
      devtoolsConnections[sender.tab.id].postMessage(request);
    }

    switch(request.type) {
      case 'SET_GEMINI_KEY':
        chrome.storage.local.set({ geminiApiKey: request.key }, () => {
          if (sendResponse) sendResponse({ success: true });
        });
        return true;
        
      case 'GET_GEMINI_KEY':
        chrome.storage.local.get('geminiApiKey', (result) => {
          if (sendResponse) sendResponse({ key: result.geminiApiKey });
        });
        return true;
      case 'GTM_LOG':
        gtmLogs.unshift({
            type: request.type,
            method: request.method,
            args: request.args,
            timestamp: request.timestamp,
            url: request.url
          });
        gtmLogs = gtmLogs.slice(0, 1000); 
        chrome.storage.local.set({ gtmLogs: gtmLogs }); 
        sendResponse({ status: 'received' });
        return true;
      default:
        if (sendResponse) sendResponse({status: 'forwarded'});
    }
  } catch (e) {
    console.error('Background error:', e);
    if (sendResponse) sendResponse({error: e.message});
  }
  return true; 
});

