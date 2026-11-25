/**
 * Provider-agnostic GST API Abstraction Layer
 * Currently wired to gstinapi.in (swappable with WhiteBooks / MasterGST).
 * Credentials are read strictly from server environment variables.
 */

const BASE_URL = process.env.GSTINAPI_BASE_URL || 'https://www.gstinapi.in';

function getApiKey() {
  return process.env.GSTINAPI_KEY || '';
}

function isConfigured() {
  return Boolean(getApiKey());
}

/**
 * Normalizes upstream gstinapi.in HTTP responses and preserves error codes
 * such as 409 NOT_CONNECTED so the UI can trigger OTP authentication cleanly.
 */
async function callGstinApi(path, { method = 'GET', body = null } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      code: 'API_KEY_MISSING',
      error: 'GSTINAPI_KEY is not configured in server environment variables.'
    };
  }

  const headers = {
    'x-api-key': apiKey,
    'Accept': 'application/json'
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const code = parsed?.error?.code || parsed?.code || (res.status === 409 ? 'NOT_CONNECTED' : 'UPSTREAM_ERROR');
    const message =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      `Upstream request failed with HTTP ${res.status}`;
    return {
      ok: false,
      status: res.status,
      code,
      error: typeof message === 'string' ? message : JSON.stringify(message),
      details: parsed
    };
  }

  return {
    ok: true,
    status: res.status,
    data: parsed,
    provider: 'gstinapi.in'
  };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = {
  BASE_URL,
  getApiKey,
  isConfigured,
  callGstinApi,
  sendJson,
  readJsonBody
};
