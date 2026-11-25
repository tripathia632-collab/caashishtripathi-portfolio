const { isConfigured, callGstinApi, sendJson } = require('../_lib/gstProvider');

module.exports = async function handler(req, res) {
  const configured = isConfigured();
  let stats = null;

  if (configured && req.query?.checkUsage === 'true') {
    const usageRes = await callGstinApi('/v1/gstin/stats/me');
    if (usageRes.ok) stats = usageRes.data;
  }

  sendJson(res, 200, {
    ok: true,
    provider: 'gstinapi.in',
    configured,
    defaultEnv: process.env.GSTINAPI_ENV || 'sandbox',
    capabilities: {
      gstinLookup: true,
      returnHistory: true,
      filingPreference: true,
      otpConnection: true,
      gstr2b: true,
      gstr2a: true,
      gstr1SaveAndEvcFile: true,
      gstr3bSaveOffsetEvcFile: true,
      hsnLookup: true,
      gstr9: false,
      dscFiling: false,
      standaloneLedgersGet: false
    },
    stats
  });
};
