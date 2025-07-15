function monitorDataLayer() {
  if (window.dataLayer) {
    const originalPush = window.dataLayer.push;

    window.dataLayer.push = function() {
      const event = Array.from(arguments);
      const result = originalPush.apply(this, arguments);

      document.dispatchEvent(new CustomEvent('DATALAYER_PUSH', {
        detail: {
          type: 'DATALAYER_PUSH',
          data: event,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      }));

      return result;
    };

    document.dispatchEvent(new CustomEvent('DATALAYER_INIT', {
      detail: {
        type: 'DATALAYER_INIT',
        data: window.dataLayer,
        url: window.location.href
      }
    }));
  }

  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  function isGtmLog(args) {
    if (args.length > 0 && typeof args[0] === 'string') {
      const firstArg = args[0].toLowerCase();
    
      return firstArg.includes('gtm') || firstArg.includes('tag manager') || firstArg.includes('tag fired') || firstArg.includes('variable');
    }
    return false;
  }

  console.log = function() {
    if (isGtmLog(arguments)) {
      document.dispatchEvent(new CustomEvent('GTM_LOG', {
        detail: {
          type: 'GTM_LOG',
          method: 'log',
          args: Array.from(arguments),
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      }));
    }
    originalConsoleLog.apply(console, arguments);
  };

  console.info = function() {
    if (isGtmLog(arguments)) {
      document.dispatchEvent(new CustomEvent('GTM_LOG', {
        detail: {
          type: 'GTM_LOG',
          method: 'info',
          args: Array.from(arguments),
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      }));
    }
    originalConsoleInfo.apply(console, arguments);
  };

}

monitorDataLayer();