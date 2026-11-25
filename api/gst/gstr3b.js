const { callGstinApi, sendJson, readJsonBody } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const action = body.action || 'save';
  const gstin = String(body.gstin || '').trim().toUpperCase();
  const retPeriod = String(body.retPeriod || body.ret_period || '').trim();
  const pan = String(body.pan || gstin.substring(2, 12)).trim().toUpperCase();
  const testMode = body.mode !== 'production';

  if (!gstin) {
    return sendJson(res, 400, { success: false, error: 'gstin is required.' });
  }

  if (action === 'save') {
    const result = await callGstinApi('/v1/gstr3b/save', {
      method: 'POST',
      body: {
        gstin,
        ret_period: retPeriod,
        payload: body.payload,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'offset') {
    if (!body.approved) {
      return sendJson(res, 400, { success: false, error: 'Explicit approval required before offsetting cash/ITC ledger.' });
    }
    const result = await callGstinApi('/v1/gstr3b/offset', {
      method: 'POST',
      body: {
        gstin,
        ret_period: retPeriod,
        payload: body.payload,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'evc-otp') {
    const result = await callGstinApi('/v1/gstr3b/evc-otp', {
      method: 'POST',
      body: {
        gstin,
        pan,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'file') {
    if (!body.approved) {
      return sendJson(res, 400, { success: false, error: 'Explicit statutory declaration approval is required before filing GSTR-3B.' });
    }
    const result = await callGstinApi('/v1/gstr3b/file', {
      method: 'POST',
      body: {
        gstin,
        ret_period: retPeriod,
        pan,
        evc_otp: String(body.evcOtp || body.evc_otp || '').trim(),
        chksum: body.chksum,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  return sendJson(res, 400, { success: false, error: 'Unsupported GSTR-3B action.' });
};
