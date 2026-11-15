// Vercel serverless function: POST /api/contact
// Validates the portfolio contact form and forwards it to Telegram.
// Secrets come from Vercel environment variables, never from the repo:
//   TELEGRAM_BOT_TOKEN  (from @BotFather)
//   TELEGRAM_CHAT_ID    (the chat that should receive the messages)

// Keep in sync with NEEDS in data.js.
const ALLOWED_NEEDS = [
  'Consulting',
  'Full-stack development',
  'AI integration & agents',
  'Front-end & UI',
  '3D / WebGL / AR',
  'Performance & maintenance',
  'Something else',
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;

// Basic rate limit: 5 requests per IP per 10 minutes.
// In-memory, so it is per serverless instance (best effort, not a guarantee).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map();
function limited(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_HITS;
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'method_not_allowed');
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot: real visitors never see or fill this field. Pretend success, send nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) {
    res.setHeader('Retry-After', String(WINDOW_MS / 1000));
    return fail(res, 429, 'rate_limited');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email');

  // needs arrives as "A, B" from the page; an array is accepted too.
  const raw = Array.isArray(body.needs) ? body.needs : typeof body.needs === 'string' ? body.needs.split(', ') : [];
  const needs = [...new Set(raw.map(n => (typeof n === 'string' ? n.trim() : '')))];
  if (needs.length < 1 || needs.length > ALLOWED_NEEDS.length || !needs.every(n => ALLOWED_NEEDS.includes(n))) {
    return fail(res, 400, 'invalid_needs');
  }

  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return fail(res, 500, 'not_configured');

  // Plain text on purpose (no parse_mode), so visitor input can't break formatting.
  const text = ['New portfolio request', `Needs: ${needs.join(', ')}`, `Reply to: ${email}`].join('\n');

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tg.ok) return fail(res, 502, 'delivery_failed');
  } catch {
    return fail(res, 502, 'delivery_failed'); // never include the token or error detail in the response
  }
  return res.status(200).json({ ok: true });
};

module.exports._resetRateLimit = () => hits.clear(); // for tests
