const { callGstinApi, sendJson, readJsonBody } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const gstin = String(body.gstin || '').trim().toUpperCase();
  const retPeriod = String(body.retPeriod || body.ret_period || '').trim();
  const table = String(body.table || 'b2b').trim().toLowerCase();
  const testMode = body.mode !== 'production';

  if (!gstin || !retPeriod) {
    return sendJson(res, 400, { success: false, error: 'gstin and ret_period (MMYYYY) are required.' });
  }

  const result = await callGstinApi('/v1/gstr2a/fetch', {
    method: 'POST',
    body: {
      table,
      gstin,
      ret_period: retPeriod,
      ...(body.ctin ? { ctin: body.ctin } : {}),
      ...(testMode ? { test_mode: true } : {})
    }
  });

  return sendJson(res, result.ok ? 200 : result.status, {
    success: result.ok,
    testMode,
    table,
    ...result
  });
};
