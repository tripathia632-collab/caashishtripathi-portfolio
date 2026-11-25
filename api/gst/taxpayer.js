const { callGstinApi, sendJson } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  const rawGstin = String(req.query?.gstin || '').trim().toUpperCase();
  const mode = String(req.query?.mode || 'sandbox').toLowerCase();
  const fy = String(req.query?.fy || '2025-26').trim();
  const includeReturns = req.query?.includeReturns !== 'false';

  // In sandbox mode, allow explicit sandbox GSTIN 00AAAAA0000A1ZT (free on gstinapi.in)
  const effectiveGstin =
    mode === 'sandbox' && !rawGstin ? '00AAAAA0000A1ZT' : rawGstin;

  if (!effectiveGstin || effectiveGstin.length !== 15) {
    return sendJson(res, 400, {
      success: false,
      error: 'Please enter a valid 15-character GSTIN.'
    });
  }

  const profileRes = await callGstinApi(`/v1/gstin/${encodeURIComponent(effectiveGstin)}?include=profile`);
  if (!profileRes.ok) {
    return sendJson(res, profileRes.status, {
      success: false,
      code: profileRes.code,
      error: profileRes.error,
      details: profileRes.details
    });
  }

  let returnsData = null;
  let returnsError = null;
  let filingPref = null;
  if (includeReturns) {
    const [retRes, prefRes] = await Promise.all([
      callGstinApi(`/v1/gstin/${encodeURIComponent(effectiveGstin)}/returns?fy=${encodeURIComponent(fy)}`),
      callGstinApi(`/v1/gstin/${encodeURIComponent(effectiveGstin)}/filing-preference?fy=${encodeURIComponent(fy)}`)
    ]);
    if (retRes.ok) returnsData = retRes.data;
    else returnsError = retRes.error;
    if (prefRes.ok) filingPref = prefRes.data;
  }

  return sendJson(res, 200, {
    success: true,
    provider: 'gstinapi.in',
    mode,
    gstin: effectiveGstin,
    isFreeSandboxGstin: effectiveGstin === '00AAAAA0000A1ZT',
    profile: profileRes.data,
    returns: returnsData,
    returnsError,
    filingPreference: filingPref
  });
};
