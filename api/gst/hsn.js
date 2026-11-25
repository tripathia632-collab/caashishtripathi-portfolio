const { callGstinApi, sendJson } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }
  const code = String(req.query?.code || '').trim();
  const q = String(req.query?.q || '').trim();

  if (code) {
    const result = await callGstinApi(`/v1/hsn/${encodeURIComponent(code)}`);
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, ...result });
  }
  if (q) {
    const result = await callGstinApi(`/v1/hsn/search?q=${encodeURIComponent(q)}`);
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, ...result });
  }
  return sendJson(res, 400, { success: false, error: 'Provide ?code= or ?q= parameter.' });
};
