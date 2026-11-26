/**
 * Cryptographic verification of an isolated fake gateway callback.
 * This is NOT a real payment provider integration. No personal or financial
 * details are placed in the body. Production webhooks require a vendor-specific
 * signature and settlement contract.
 */
import { readBoundedUtf8 } from './request-body.mjs';
const encoder = new TextEncoder();
export async function verifySandboxWebhook(request, secret, atSeconds = Math.floor(Date.now()/1000)) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('WEBHOOK_UNCONFIGURED');
  const contentType = request.headers.get('content-type') || '';
  const timestampText = request.headers.get('x-rfb-timestamp') || '';
  const signature = request.headers.get('x-rfb-signature') || '';
  if (!contentType.startsWith('application/json') || !/^\d{10}$/.test(timestampText) || !/^[0-9a-f]{64}$/.test(signature)) throw new Error('WEBHOOK_UNAUTHORIZED');
  const timestamp = Number(timestampText);
  if (Math.abs(atSeconds - timestamp) > 300) throw new Error('WEBHOOK_UNAUTHORIZED');
  let raw;
  try { raw = await readBoundedUtf8(request, 4096); }
  catch { throw new Error('WEBHOOK_UNAUTHORIZED'); }
  if (raw.length < 2) throw new Error('WEBHOOK_UNAUTHORIZED');
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(timestampText+'.'+raw)));
  const received = Uint8Array.from(signature.match(/../g).map(pair=>Number.parseInt(pair,16)));
  if (expected.length !== received.length) throw new Error('WEBHOOK_UNAUTHORIZED');
  let mismatch = 0;for(let i=0;i<expected.length;i++)mismatch |= expected[i]^received[i];
  if (mismatch !== 0) throw new Error('WEBHOOK_UNAUTHORIZED');
  let payload;try {payload = JSON.parse(raw);}catch{throw new Error('WEBHOOK_UNAUTHORIZED');}
  if(!payload || Array.isArray(payload) || typeof payload !== 'object' || payload.status !== 'sandbox_paid')throw new Error('WEBHOOK_UNAUTHORIZED');
  return payload;
}
