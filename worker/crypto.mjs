const enc = new TextEncoder();
function base64url(bytes) {return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function createTicketToken(ticketId, tokenVersion, secret) {
  if (!secret || secret.length < 32) throw new Error('SIGNING_UNCONFIGURED');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const payload = ticketId + '.' + tokenVersion;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('rfb-ticket:v1:' + payload)));
  return payload + '.' + base64url(sig);
}
export function parseTicketToken(token) {
  if(typeof token !== 'string' || token.length > 256) return null;
  const match=/^([a-f0-9-]{36})\.([1-9][0-9]{0,8})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if(!match) return null;
  return {ticketId:match[1],version:Number(match[2]),token};
}
export async function validateTicketToken(token, ticket, secret) {
  const parts=parseTicketToken(token);
  if(!parts || !ticket || parts.ticketId!==ticket.id || parts.version!==ticket.token_version) return false;
  const expected=await createTicketToken(parts.ticketId,parts.version,secret);
  const a=enc.encode(expected),b=enc.encode(token);
  if(a.length!==b.length) return false;
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
  return mismatch===0;
}
