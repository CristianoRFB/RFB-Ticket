/* Firebase ID tokens only (RS256, not Firebase custom tokens). */
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let cached = { keys: [], until: 0 };
const enc = new TextEncoder();
function decodeUrl(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('INVALID_TOKEN');
  const binary = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function parsePart(s) {
  const value = JSON.parse(new TextDecoder().decode(decodeUrl(s)));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_TOKEN');
  return value;
}
export async function verifyFirebaseToken(token, projectId, fetcher = fetch, now = Date.now()) {
  if (!projectId || typeof token !== 'string' || token.length > 4096) throw new Error('AUTH_UNCONFIGURED');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('INVALID_TOKEN');
  const header = parsePart(parts[0]);
  const payload = parsePart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid || header.typ && header.typ !== 'JWT') throw new Error('INVALID_TOKEN');
  const seconds = now / 1000;
  if (payload.aud !== projectId || payload.iss !== 'https://securetoken.google.com/' + projectId ||
      !payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128 ||
      typeof payload.exp !== 'number' || payload.exp <= seconds ||
      typeof payload.iat !== 'number' || payload.iat > seconds + 60 ||
      typeof payload.auth_time !== 'number' || payload.auth_time > seconds + 60) throw new Error('INVALID_TOKEN');
  if (cached.until < now || !cached.keys.some(k => k.kid === header.kid)) {
    const response = await fetcher(JWKS, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('AUTH_KEYS_UNAVAILABLE');
    const value = await response.json();
    if (!Array.isArray(value.keys)) throw new Error('AUTH_KEYS_UNAVAILABLE');
    const age = Math.max(60, Math.min(3600, Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300)));
    cached = { keys: value.keys, until: now + age * 1000 };
  }
  const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw new Error('INVALID_TOKEN');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, decodeUrl(parts[2]), enc.encode(parts[0] + '.' + parts[1]))) throw new Error('INVALID_TOKEN');
  return { uid: payload.sub, emailVerified: payload.email_verified === true };
}
export async function authenticate(request, env) {
  const match = /^Bearer ([A-Za-z0-9_\-.]+)$/.exec(request.headers.get('authorization') || '');
  if (!match) throw new Error('UNAUTHORIZED');
  return verifyFirebaseToken(match[1], env.FIREBASE_PROJECT_ID);
}
