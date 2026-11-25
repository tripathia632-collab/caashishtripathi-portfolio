// Content script running on official GST Portal (https://services.gst.gov.in/*)
// Assists with pre-filling username and navigating to the selected return period.
// NEVER bypasses CAPTCHA, OTP, EVC, or DSC.

(function () {
  const MONTH_NAMES = {
    '04': 'April', '05': 'May', '06': 'June', '07': 'July',
    '08': 'August', '09': 'September', '10': 'October', '11': 'November',
    '12': 'December', '01': 'January', '02': 'February', '03': 'March'
  };

  function prefillLogin(task) {
    if (!task?.portalUsername) return;
    const userEl = document.querySelector('#username');
    if (userEl && !userEl.value) {
      userEl.value = task.portalUsername;
      userEl.dispatchEvent(new Event('input', { bubbles: true }));
      userEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (task.sessionPassword) {
      const passEl = document.querySelector('#user_pass');
      if (passEl && !passEl.value) {
        passEl.value = task.sessionPassword;
        passEl.dispatchEvent(new Event('input', { bubbles: true }));
        passEl.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.runtime.sendMessage({ type: 'GSTWISE_CLEAR_SESSION_PASSWORD' });
      }
    }

    // Focus CAPTCHA so the user can type it immediately
    const captchaEl = document.querySelector('#captcha');
    if (captchaEl) captchaEl.focus();
  }

  function renderFloatingAssistant(task) {
    if (!task || document.getElementById('gstwise-portal-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'gstwise-portal-bar';
    bar.style.cssText =
      'position:fixed;bottom:18px;left:18px;z-index:2147483647;background:#0F172A;color:#F8FAFC;' +
      'padding:12px 16px;border-radius:12px;font-family:Inter,system-ui,sans-serif;font-size:12px;' +
      'box-shadow:0 16px 40px rgba(15,23,42,0.35);border:1px solid #334155;max-width:340px;';

    const monthName = MONTH_NAMES[task.month] || task.month;
    bar.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#2DD4BF;">
          <span>GSTWise Assistant</span>
        </div>
        <button id="gstwise-bar-close" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div style="font-size:11px;color:#CBD5E1;line-height:1.5;margin-bottom:10px;">
        <div><strong>GSTIN:</strong> <span style="font-family:monospace;">${task.gstin || '-'}</span></div>
        <div><strong>Target Period:</strong> ${monthName} (${task.fy || ''})</div>
        <div><strong>Action:</strong> ${task.action || 'Returns Dashboard'}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button id="gstwise-go-returns" style="background:#0F766E;color:#fff;border:none;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
          Go to File Returns
        </button>
        <button id="gstwise-go-ledgers" style="background:#1E293B;color:#E2E8F0;border:1px solid #475569;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
          View Ledgers
        </button>
      </div>
      <div style="margin-top:8px;font-size:10px;color:#94A3B8;">
        Complete CAPTCHA, EVC OTP, or DSC authentication manually on the official portal.
      </div>
    `;

    document.body.appendChild(bar);
    document.getElementById('gstwise-bar-close')?.addEventListener('click', () => bar.remove());
    document.getElementById('gstwise-go-returns')?.addEventListener('click', () => {
      window.location.href = 'https://services.gst.gov.in/services/auth/fowelcome';
    });
    document.getElementById('gstwise-go-ledgers')?.addEventListener('click', () => {
      window.location.href = 'https://services.gst.gov.in/services/auth/ledgers';
    });
  }

  chrome.runtime.sendMessage({ type: 'GSTWISE_GET_ACTIVE_TASK' }, (res) => {
    const task = res?.task;
    if (!task) return;
    if (window.location.pathname.includes('login')) {
      setTimeout(() => prefillLogin(task), 600);
    }
    renderFloatingAssistant(task);
  });
})();
