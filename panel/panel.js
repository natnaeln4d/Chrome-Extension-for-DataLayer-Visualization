document.addEventListener('DOMContentLoaded', function() {
  const dataLayerTree = document.getElementById('dataLayerTree');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  
 
  const port = chrome.runtime.connect({
    name: "devtools-page"
  });
  
 
  port.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
  });
  
 
  port.onMessage.addListener(function(msg) {
    if (msg.type === 'DATALAYER_UPDATE') {
      renderDataLayer(msg.data);
    }
  });
  

  refreshBtn.addEventListener('click', function() {
    chrome.devtools.inspectedWindow.eval(
      'window.dataLayer',
      function(result, isException) {
        if (!isException && result) {
          renderDataLayer(result);
          port.postMessage({
            type: 'DATALAYER_UPDATE',
            data: result
          });
        }
      }
    );
  });
  
 
  clearBtn.addEventListener('click', function() {
    dataLayerTree.innerHTML = '';
  });
  

  function renderDataLayer(data) {
    dataLayerTree.innerHTML = '';
    
    if (!data || data.length === 0) {
      dataLayerTree.innerHTML = '<div>No DataLayer found or DataLayer is empty.</div>';
      return;
    }
    
  
    const wrapper = {
      'DataLayer (array)': data
    };
    
    createTreeItem(wrapper, dataLayerTree);
  }
  
  
  function createTreeItem(data, parentEl, depth = 0) {
    if (typeof data !== 'object' || data === null) {
      const valueEl = document.createElement('span');
      valueEl.className = 'tree-value';
      valueEl.textContent = JSON.stringify(data);
      parentEl.appendChild(valueEl);
      return;
    }
    
    for (const key in data) {
      const itemEl = document.createElement('div');
      itemEl.className = 'tree-item';
      
      const keyEl = document.createElement('span');
      keyEl.className = 'tree-key';
      keyEl.textContent = key;
      
      const typeEl = document.createElement('span');
      typeEl.className = 'tree-type';
      
      if (Array.isArray(data[key])) {
        typeEl.textContent = `(array[${data[key].length}])`;
      } else if (typeof data[key] === 'object') {
        typeEl.textContent = '(object)';
      }
      
      const toggleEl = document.createElement('span');
      toggleEl.className = 'tree-toggle';
      toggleEl.textContent = '▶';
      
      itemEl.appendChild(toggleEl);
      itemEl.appendChild(keyEl);
      itemEl.appendChild(typeEl);
      
      const childrenEl = document.createElement('div');
      childrenEl.style.display = 'none';
      childrenEl.style.marginLeft = '15px';
      
      parentEl.appendChild(itemEl);
      parentEl.appendChild(childrenEl);
      
     
      let isExpanded = false;
      keyEl.addEventListener('click', function() {
        isExpanded = !isExpanded;
        toggleEl.textContent = isExpanded ? '▼' : '▶';
        childrenEl.style.display = isExpanded ? 'block' : 'none';
        
       
        if (isExpanded && childrenEl.children.length === 0) {
          createTreeItem(data[key], childrenEl, depth + 1);
        }
      });
      
     
      if ((Array.isArray(data[key]) || typeof data[key] === 'object') && data[key] !== null) {
        const previewEl = document.createElement('span');
        previewEl.className = 'tree-preview';
        previewEl.textContent = Array.isArray(data[key]) 
          ? ` [${data[key].length} items]` 
          : ` {${Object.keys(data[key]).length} properties}`;
        itemEl.appendChild(previewEl);
      }
    }
  }
});