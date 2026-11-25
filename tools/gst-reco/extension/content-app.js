// Content script running on caashishtripathi.in / localhost
// Bridges page window.postMessage <-> Extension Background Worker

(function () {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || !event.data.type) return;

    if (event.data.type === 'GSTWISE_EXT_PING') {
      window.postMessage(
        {
          type: 'GSTWISE_EXT_PONG',
          version: '1.0.0',
          capabilities: ['LOGIN_PREFILL', 'RETURNS_ASSIST', 'ARN_SYNC']
        },
        '*'
      );
    }

    if (event.data.type === 'GSTWISE_EXT_OPEN_PORTAL') {
      chrome.runtime.sendMessage(
        { type: 'GSTWISE_OPEN_PORTAL', payload: event.data.payload },
        (response) => {
          window.postMessage(
            {
              type: 'GSTWISE_EXT_OPEN_PORTAL_ACK',
              response: response || { ok: false, error: chrome.runtime.lastError?.message }
            },
            '*'
          );
        }
      );
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'GSTWISE_PORTAL_CALLBACK') {
      window.postMessage(
        { type: 'GSTWISE_PORTAL_CALLBACK', payload: message.payload },
        '*'
      );
    }
  });
})();
