document.addEventListener('DOMContentLoaded', function() {
  const eventList = document.getElementById('eventList');
  const filterInput = document.getElementById('filterInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const showAnalyticsBtn = document.getElementById('showAnalyticsBtn');
  const geminiToggle = document.getElementById('geminiToggle');
  const geminiPanel = document.getElementById('geminiPanel');
  const closeGemini = document.getElementById('closeGemini');
  const geminiChat = document.getElementById('geminiChat');
  const geminiInput = document.getElementById('geminiInput');
  const sendGemini = document.getElementById('sendGemini');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const settingsToggle = document.getElementById('settingsToggle');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKey = document.getElementById('saveApiKey');
  const themeAuto = document.getElementById('themeAuto');
  const themeLight = document.getElementById('themeLight');
  const themeDark = document.getElementById('themeDark');
  const themeBlack = document.getElementById('themeBlack');
  const tagVariableList = document.getElementById('tagVariableList');


 
  let events = [];
  let chatHistory = [];


  loadEvents();
  loadApiKey();
  initTheme();
  loadGtmLogs();
  // if (showAnalyticsBtn) {
  //     showAnalyticsBtn.addEventListener('click', () => {
  //         geminiPanel.classList.add('active');
  //     });
  // }



  filterInput.addEventListener('input', () => renderEvents(filterInput.value));
  refreshBtn.addEventListener('click', refreshDataLayer);
  clearBtn.addEventListener('click', clearEvents);
  exportBtn.addEventListener('click', exportEvents);
  geminiToggle.addEventListener('click', () => geminiPanel.classList.add('active'));
  closeGemini.addEventListener('click', () => geminiPanel.classList.remove('active'));
  settingsToggle.addEventListener('click', () => settingsPanel.classList.add('active'));
  closeSettings.addEventListener('click', () => settingsPanel.classList.remove('active'));
  saveApiKey.addEventListener('click', saveApiKeyHandler);
  sendGemini.addEventListener('click', sendGeminiMessage);
  geminiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGeminiMessage();
    }
  });
  themeAuto.addEventListener('click', () => setTheme('auto'));
  themeLight.addEventListener('click', () => setTheme('light'));
  themeDark.addEventListener('click', () => setTheme('dark'));
  themeBlack.addEventListener('click', () => setTheme('black'));


  function setTheme(theme) {
  
    chrome.storage.local.set({ theme: theme });
    
    
    applyTheme(theme);
    
    [themeAuto, themeLight, themeDark, themeBlack].forEach(btn => 
      btn.classList.remove('active'));
    document.getElementById(`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`)
      .classList.add('active');
  }

  function applyTheme(theme) {
    if (theme === 'auto') {
    
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }


  function initTheme() {
    chrome.storage.local.get(['theme'], function(result) {
      const theme = result.theme || 'auto';
      setTheme(theme);
      
      
      if (theme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', e => {
            applyTheme('auto');
          });
      }
    });
  }

  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request) return;
    
    if (request.type === 'DATALAYER_PUSH' || request.type === 'DATALAYER_INIT') {
      addEvent({
        type: request.type,
        data: request.data,
        timestamp: request.timestamp || new Date().toISOString(),
        url: request.url
      });
    }
    
    if (sendResponse) sendResponse({status: 'processed'});
    return true;
  });
   function loadGtmLogs() {
    chrome.storage.local.get(['gtmLogs'], function(result) {
      if (result.gtmLogs) {
        gtmDebugLogs = result.gtmLogs;
        renderTagsAndVariables();
      }
    });
  }

  function loadEvents() {
    chrome.storage.local.get(['dataLayerEvents'], function(result) {
      if (result.dataLayerEvents) {
        events = result.dataLayerEvents;
        renderEvents();
      }
    });
  }

  function loadApiKey() {
    chrome.storage.local.get(['geminiApiKey'], function(result) {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
      }
    });
  }

  function addEvent(event) {
    events.unshift(event);
    chrome.storage.local.set({ dataLayerEvents: events.slice(0, 1000) });
    renderEvents();
  }

  function renderEvents(filter = '') {
    const filteredEvents = filter 
      ? events.filter(event => 
          JSON.stringify(event).toLowerCase().includes(filter.toLowerCase()))
      : events;
    
    eventList.innerHTML = filteredEvents.length === 0
      ? `
        <div class="empty-state">
          <p>No DataLayer events found${filter ? ' matching your filter' : ''}.</p>
        </div>
      `
      : filteredEvents.map(event => `
        <div class="event-item">
          <h3>${event.type === 'DATALAYER_PUSH' ? 'Event Push' : 'Initial DataLayer'}</h3>
          <pre>${JSON.stringify(event.data, null, 2)}</pre>
          <div class="event-meta">
            <span>${new Date(event.timestamp).toLocaleTimeString()}</span>
            <span>${new URL(event.url).hostname}</span>
          </div>
        </div>
      `).join('');
    
    
    document.querySelectorAll('.event-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('expanded');
      });
    });
  }

  function refreshDataLayer() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs.length) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_DATALAYER'})
        .catch(err => {
          console.log('Injecting content script...');
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }).then(() => {
            chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_DATALAYER'});
          });
        });
    });
  }

  function clearEvents() {
    events = [];
    chrome.storage.local.set({ dataLayerEvents: [] });
    renderEvents();
  }

  function exportEvents() {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: 'datalayer-events.json'
    });
  }

  function saveApiKeyHandler() {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    chrome.storage.local.set({ geminiApiKey: key }, () => {
      addChatMessage('API key saved successfully!', 'system');
      settingsPanel.classList.remove('active');
    });
  }

   async function sendGeminiMessage() {
        const message = geminiInput.value.trim();
        if (!message) return;

        addChatMessage(message, 'user');
        geminiInput.value = '';
        geminiInput.disabled = true;
        sendGemini.disabled = true;

        try {
            const loadingId = 'loading-' + Date.now();
            addChatMessage('Thinking...', 'ai', loadingId);

            const pushedEvents = events.filter(event => event.type === 'DATALAYER_PUSH');

            let dataLayerContext = '';
            if (pushedEvents.length > 0) {
                dataLayerContext = 'Here are the DataLayer PUSH events captured on the website:\n\n';
                pushedEvents.forEach((event, index) => {
                    dataLayerContext += `Event ${index + 1} (Type: ${event.type}, Timestamp: ${new Date(event.timestamp).toLocaleTimeString()}):\n`;
                    dataLayerContext += `Data: ${JSON.stringify(event.data, null, 2)}\n\n`;
                });
                dataLayerContext += 'Based on these events, please answer my question:\n\n';
            } else {
                dataLayerContext = 'There are no DataLayer PUSH events captured yet. Please ask me about general DataLayer concepts or wait for events to appear.\n\n';
            }

      
            const fullQuery = dataLayerContext + message;


            const response = await queryGeminiAI(fullQuery); 

            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                loadingElement.innerHTML = `<p>${response}</p>`;
                loadingElement.classList.remove('thinking');
            } else {
                addChatMessage(response, 'ai');
            }

            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: response });

        } catch (error) {
            addChatMessage(`Error: ${error.message}`, 'ai');
        } finally {
            geminiInput.disabled = false;
            sendGemini.disabled = false;
            geminiInput.focus();
        }
    }

  function addChatMessage(text, sender, id = '') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}`;
    if (id) {
      messageEl.id = id;
      if (sender === 'ai') messageEl.classList.add('thinking');
    }
    messageEl.innerHTML = `<p>${text}</p>`;
    geminiChat.appendChild(messageEl);
    geminiChat.scrollTop = geminiChat.scrollHeight;
  }

  async function queryGeminiAI(query) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        const geminiApiKey = result.geminiApiKey;
        
        if (!geminiApiKey) {
          reject(new Error('Please set your Gemini API key in the settings'));
          return;
        }

       
        const contents = chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));
        
       
        contents.push({
          role: 'user',
          parts: [{ text: query }]
        });

       
        fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.9,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        })
        .then(async response => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
          }
          return response.json();
        })
        .then(data => {
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('No valid response from Gemini');
          }
          resolve(data.candidates[0].content.parts[0].text);
        })
        .catch(error => {
          console.error('Gemini API error:', error);
          if (error.message.includes('API key not valid')) {
            reject(new Error('Invalid API key. Please check your Gemini API key in settings.'));
          } else if (error.message.includes('quota')) {
            reject(new Error('API quota exceeded. Please check your Google Cloud quota.'));
          } else {
            reject(new Error(`Failed to get response: ${error.message}`));
          }
        });
      });
    });
  }
});







