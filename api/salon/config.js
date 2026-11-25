/**
 * Public Supabase configuration endpoint for SalonSync Studio.
 * Only exposes SUPABASE_URL and SUPABASE_ANON_KEY (public client credentials meant for RLS-protected browser access).
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = (process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

  res.status(200).json({
    ok: true,
    configured: Boolean(url && anonKey),
    supabaseUrl: url,
    supabaseAnonKey: anonKey
  });
};
