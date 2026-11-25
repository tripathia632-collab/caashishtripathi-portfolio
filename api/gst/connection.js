const { callGstinApi, sendJson, readJsonBody } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const result = await callGstinApi('/v1/gst/filing/connections');
    return sendJson(res, result.ok ? 200 : result.status, {
      success: result.ok,
      ...result
    });
  }

  if (req.method === 'DELETE') {
    const gstin = String(req.query?.gstin || '').trim().toUpperCase();
    if (!gstin) {
      return sendJson(res, 400, { success: false, error: 'GSTIN is required to disconnect session.' });
    }
    const result = await callGstinApi(`/v1/gst/filing/connections/${encodeURIComponent(gstin)}`, {
      method: 'DELETE'
    });
    return sendJson(res, result.ok ? 200 : result.status, {
      success: result.ok,
      ...result
    });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const action = body.action;
    const gstin = String(body.gstin || '').trim().toUpperCase();

    if (!gstin || gstin.length !== 15) {
      return sendJson(res, 400, { success: false, error: 'Valid 15-character GSTIN is required.' });
    }

    if (action === 'request-otp') {
      const gstUsername = String(body.gstUsername || body.gst_username || '').trim();
      if (!gstUsername) {
        return sendJson(res, 400, {
          success: false,
          error: 'GST Portal API Username is required (configure it in Client Master).'
        });
      }
      const result = await callGstinApi('/v1/gst/filing/connections', {
        method: 'POST',
        body: { gstin, gst_username: gstUsername }
      });
      return sendJson(res, result.ok ? 200 : result.status, {
        success: result.ok,
        ...result
      });
    }

    if (action === 'verify-otp') {
      const otp = String(body.otp || '').trim();
      if (!otp) {
        return sendJson(res, 400, { success: false, error: 'OTP is required.' });
      }
      const result = await callGstinApi(`/v1/gst/filing/connections/${encodeURIComponent(gstin)}/verify`, {
        method: 'POST',
        body: { otp }
      });
      return sendJson(res, result.ok ? 200 : result.status, {
        success: result.ok,
        ...result
      });
    }

    return sendJson(res, 400, { success: false, error: 'Unsupported connection action.' });
  }

  return sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
