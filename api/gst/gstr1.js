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

  if (!gstin || !retPeriod) {
    return sendJson(res, 400, { success: false, error: 'gstin and ret_period (MMYYYY) are required.' });
  }

  if (action === 'save') {
    if (!body.payload) {
      return sendJson(res, 400, { success: false, error: 'GSTR-1 payload is required.' });
    }
    const result = await callGstinApi('/v1/gstr1/save', {
      method: 'POST',
      body: {
        gstin,
        ret_period: retPeriod,
        pan,
        payload: body.payload,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  if (action === 'file') {
    if (!body.approved) {
      return sendJson(res, 400, { success: false, error: 'Explicit user declaration approval is required before filing.' });
    }
    if (!body.evcOtp && !body.evc_otp) {
      return sendJson(res, 400, { success: false, error: 'EVC OTP is required to file GSTR-1.' });
    }
    if (!body.summary) {
      return sendJson(res, 400, { success: false, error: 'Saved return summary (with checksum) is required. Run Save GSTR-1 first.' });
    }
    const result = await callGstinApi('/v1/gstr1/file', {
      method: 'POST',
      body: {
        gstin,
        ret_period: retPeriod,
        pan,
        evc_otp: String(body.evcOtp || body.evc_otp).trim(),
        summary: body.summary,
        ...(testMode ? { test_mode: true } : {})
      }
    });
    return sendJson(res, result.ok ? 200 : result.status, { success: result.ok, testMode, ...result });
  }

  return sendJson(res, 400, { success: false, error: 'Unsupported GSTR-1 action.' });
};
