// Background service worker for GSTWise Portal Connector
// Coordinates tab navigation between caashishtripathi.in and services.gst.gov.in
// Never stores passwords persistently; holds optional session prefill in chrome.storage.session only.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'GSTWISE_OPEN_PORTAL') {
    const { payload } = message;
    const sessionData = {
      gstin: payload?.gstin || '',
      portalUsername: payload?.portalUsername || '',
      // Session password stays purely in transient extension session storage (cleared on browser close)
      sessionPassword: payload?.sessionPassword || '',
      fy: payload?.fy || '2026-27',
      month: payload?.month || '09',
      action: payload?.action || 'OPEN_DASHBOARD',
      originTabId: sender?.tab?.id || null,
      updatedAt: Date.now()
    };

    const storageArea = chrome.storage.session || chrome.storage.local;
    storageArea.set({ gstwiseActiveTask: sessionData }, () => {
      const targetUrl =
        sessionData.action === 'LOGIN' || sessionData.action === 'OPEN_LOGIN'
          ? 'https://services.gst.gov.in/services/login'
          : 'https://services.gst.gov.in/services/login';

      chrome.tabs.create({ url: targetUrl, active: true }, (tab) => {
        sendResponse({ ok: true, tabId: tab?.id, status: 'PORTAL_TAB_OPENED' });
      });
    });
    return true;
  }

  if (message.type === 'GSTWISE_GET_ACTIVE_TASK') {
    const storageArea = chrome.storage.session || chrome.storage.local;
    storageArea.get(['gstwiseActiveTask'], (res) => {
      sendResponse({ ok: true, task: res?.gstwiseActiveTask || null });
    });
    return true;
  }

  if (message.type === 'GSTWISE_CLEAR_SESSION_PASSWORD') {
    const storageArea = chrome.storage.session || chrome.storage.local;
    storageArea.get(['gstwiseActiveTask'], (res) => {
      if (res?.gstwiseActiveTask) {
        const updated = { ...res.gstwiseActiveTask, sessionPassword: '' };
        storageArea.set({ gstwiseActiveTask: updated }, () => sendResponse({ ok: true }));
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  if (message.type === 'GSTWISE_SEND_ARN_TO_APP') {
    const storageArea = chrome.storage.session || chrome.storage.local;
    storageArea.get(['gstwiseActiveTask'], (res) => {
      const task = res?.gstwiseActiveTask;
      if (task?.originTabId) {
        chrome.tabs.sendMessage(
          task.originTabId,
          { type: 'GSTWISE_PORTAL_CALLBACK', payload: message.payload },
          () => sendResponse({ ok: true })
        );
      } else {
        sendResponse({ ok: false, error: 'Origin GSTWise tab not found.' });
      }
    });
    return true;
  }
});
