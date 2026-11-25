const { callGstinApi, sendJson, readJsonBody } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const action = body.action || 'fetch';
  const gstin = String(body.gstin || '').trim().toUpperCase();
  const retPeriod = String(body.retPeriod || body.ret_period || '').trim();
  const testMode = body.mode !== 'production';

  if (!gstin) {
    return sendJson(res, 400, { success: false, error: 'GSTIN is required.' });
  }

  if (action === 'generate') {
    const result = await callGstinApi('/v1/gstr2b/generate', {
      method: 'POST',
      body: { gstin, ret_period: retPeriod, ...(testMode ? { test_mode: true } : {}) }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'status') {
    const result = await callGstinApi('/v1/gstr2b/generate/status', {
      method: 'POST',
      body: { gstin, int_tran_id: body.intTranId || body.int_tran_id, ...(testMode ? { test_mode: true } : {}) }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'fetch') {
    if (!retPeriod) {
      return sendJson(res, 400, { success: false, error: 'ret_period (MMYYYY) is required.' });
    }
    const payload = {
      gstin,
      ret_period: retPeriod,
      ...(body.fileNum ? { file_num: body.fileNum } : {}),
      ...(testMode ? { test_mode: true } : {})
    };
    const result = await callGstinApi('/v1/gstr2b/fetch', {
      method: 'POST',
      body: payload
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  return sendJson(res, 400, { success: false, error: 'Invalid GSTR-2B action.' });
};
