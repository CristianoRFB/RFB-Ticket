import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,createHmac,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Miniflare,createFetchMock} from 'miniflare';

/**
 * True local workerd + D1 integration. All identities are synthetic RSA-signed
 * Firebase-shaped tokens, verified against a mocked Google JWKS response.
 * Zero Cloudflare account access and no real Firebase users or payments.
 */
const authProject='rfb-local-only';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
jwk.kid='rfb-local-jwks';jwk.use='sig';jwk.alg='RS256';
const fetchMock=createFetchMock();
fetchMock.disableNetConnect();
fetchMock.get('https://www.googleapis.com')
  .intercept({method:'GET',path:'/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'})
  .reply(200,JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'max-age=3600','content-type':'application/json'}})
  .persist();

let mf,db;
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function fakeFirebaseIdToken(uid) {
  const t=Math.floor(Date.now()/1000);
  const signed=encode({alg:'RS256',kid:jwk.kid,typ:'JWT'})+'.'+encode({
    aud:authProject,iss:'https://securetoken.google.com/'+authProject,
    sub:uid,iat:t,exp:t+3600,auth_time:t,email_verified:true
  });
  const signer=createSign('RSA-SHA256');signer.update(signed);
  return signed+'.'+signer.sign(privateKey).toString('base64url');
}
const organizer=fakeFirebaseIdToken('organizer-workerd');
const buyerA=fakeFirebaseIdToken('buyer-workerd-a');
const buyerB=fakeFirebaseIdToken('buyer-workerd-b');
const gate=fakeFirebaseIdToken('gate-workerd');
async function request(path,method='GET',payload,authorization) {
  const headers={};
  if(authorization)headers.Authorization='Bearer '+authorization;
  if(payload!==undefined)headers['Content-Type']='application/json';
  const response=await mf.dispatchFetch('https://local.test'+path,{
    method,headers,body:payload===undefined?undefined:JSON.stringify(payload)
  });
  const result=await response.json();
  return {...result,status:response.status}; // Keep HTTP status separate from response business-status fields.
}
before(async()=>{
  mf=new Miniflare({
    scriptPath:new URL('../worker/index.mjs',import.meta.url).pathname,
    modules:true,
    modulesRules:[{type:'ESModule',include:['**/*.mjs']}],
    d1Databases:{DB:'00000000-0000-4000-8000-000000000001'},
    bindings:{
      FIREBASE_PROJECT_ID:authProject,SANDBOX_MODE:'true',
      TICKET_SIGNING_SECRET:'test-only-worker-hmac-secret-which-is-longer-than-32',
      SANDBOX_WEBHOOK_SECRET:'another-fake-webhook-secret-longer-than-32'
    },
    fetchMock
  });
  await mf.ready;
  db=await mf.getD1Database('DB');
  const schema=readFileSync(new URL('../migrations/0001_init.sql',import.meta.url),'utf8')
    .split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
  // D1.exec() parses a line-oriented command stream; each multiline DDL
  // statement is instead prepared independently, preserving the SQL schema.
  for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean)){
    if(statement.startsWith('PRAGMA'))continue; // foreign_keys already enabled by D1.
    await db.prepare(statement).run();
  }
});
after(async()=>{if(mf)await mf.dispose();});

test('workerd D1: unauthenticated writes denied, owner cannot be impersonated',async()=>{
  const denied=await request('/api/events','POST',{title:'Intruso',city:'Jales',startsAt:'2027-09-01T20:00:00Z'});
  assert.equal(denied.status,401);
  const created=await request('/api/events','POST',{title:'RFB teste workerd',city:'Jales',startsAt:'2027-09-01T20:00:00Z'},organizer);
  assert.equal(created.status,201);
  const lot=await request('/api/events/'+created.eventId+'/lots','POST',{label:'Última cadeira',capacity:1,priceCents:700},buyerA);
  assert.equal(lot.status,403);
});

test('workerd D1: two concurrent buyers cannot oversell and the signed QR is single-use',async()=>{
  const created=await request('/api/events','POST',{title:'RFB corrida D1 local',city:'Jales',startsAt:'2027-09-10T20:00:00Z'},organizer);
  assert.equal(created.status,201);
  const eventId=created.eventId;
  const lot=await request('/api/events/'+eventId+'/lots','POST',{label:'Uma vaga',capacity:1,priceCents:700},organizer);
  assert.equal(lot.status,201);
  assert.equal((await request('/api/events/'+eventId+'/publish','POST',{},organizer)).status,200);
  const [first,second]=await Promise.all([
    request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},buyerA),
    request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},buyerB)
  ]);
  assert.deepEqual([first.status,second.status].sort(),[201,409]);
  const winner=first.status===201?{data:first,uid:buyerA}:{data:second,uid:buyerB};
  const check=await db.prepare('SELECT reserved,issued FROM lots WHERE id=?').bind(lot.lotId).first();
  assert.equal(check.reserved,1);assert.equal(check.issued,0);
  const issue=await request('/api/orders/'+winner.data.order.id+'/sandbox-confirm','POST',{},winner.uid);
  assert.equal(issue.status,200);assert.equal(issue.tickets.length,1);
  assert.ok(issue.tickets[0].ticket_number>0);
  assert.equal((await request('/api/events/'+eventId+'/staff','POST',{uid:'gate-workerd'},organizer)).status,200);
  const firstId=randomUUID(),secondId=randomUUID(),token=issue.tickets[0].token;
  const [admitA,admitB]=await Promise.all([
    request('/api/checkin','POST',{eventId,token,requestId:firstId},gate),
    request('/api/checkin','POST',{eventId,token,requestId:secondId},organizer)
  ]);
  assert.deepEqual([admitA.status,admitB.status].sort(),[200,409]);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE event_id=?').bind(eventId).first();
  assert.equal(count.n,1);
  const approved=admitA.status===200?{uid:gate,id:firstId}:{uid:organizer,id:secondId};
  const replay=await request('/api/checkin','POST',{eventId,token,requestId:approved.id},approved.uid);
  assert.equal(replay.status,200);assert.equal(replay.replayed,true);
});


test('workerd D1: gate revocation and event cancellation revoke issued QR',async()=>{
  const created=await request('/api/events','POST',{title:'Evento reversível sandbox',city:'Jales',startsAt:'2027-10-01T20:00:00Z'},organizer);
  assert.equal(created.status,201);
  const ev=created.eventId;
  const l=await request('/api/events/'+ev+'/lots','POST',{label:'Lote 1',capacity:2,priceCents:900},organizer);
  assert.equal(l.status,201);
  assert.equal((await request('/api/events/'+ev+'/publish','POST',{},organizer)).status,200);
  const held=await request('/api/orders','POST',{lotId:l.lotId,quantity:1,requestKey:randomUUID()},buyerA);
  const ticket=await request('/api/orders/'+held.order.id+'/sandbox-confirm','POST',{},buyerA);
  assert.equal(ticket.status,200);
  assert.equal((await request('/api/events/'+ev+'/staff','POST',{uid:'gate-workerd'},organizer)).status,200);
  assert.equal((await request('/api/events/'+ev+'/staff/gate-workerd','DELETE',undefined,buyerA)).status,403);
  assert.equal((await request('/api/events/'+ev+'/staff/gate-workerd','DELETE',undefined,organizer)).status,200);
  assert.equal((await request('/api/checkin','POST',{eventId:ev,token:ticket.tickets[0].token,requestId:randomUUID()},gate)).status,403);
  const cancelled=await request('/api/events/'+ev+'/cancel','POST',{},organizer);
  assert.equal(cancelled.status,200);assert.equal(cancelled.moneyReturned,false);
  assert.equal((await request('/api/events/'+ev)).status,404);
  const orders=await request('/api/orders','GET',undefined,buyerA);
  assert.equal(orders.orders.find(o=>o.id===held.order.id).status,'refunded');
  const tickets=await request('/api/tickets','GET',undefined,buyerA);
  assert.equal(tickets.tickets.find(t=>t.id===ticket.tickets[0].id).status,'revoked');
  assert.equal((await request('/api/checkin','POST',{eventId:ev,token:ticket.tickets[0].token,requestId:randomUUID()},organizer)).status,400);
});

test('workerd D1: fake webhook cryptographic verification and exactly-once ticket issuance',async()=>{
  const created=await request('/api/events','POST',{title:'Provedor fictício',city:'Jales',startsAt:'2027-10-10T20:00:00Z'},organizer);
  const ev=created.eventId;
  const l=await request('/api/events/'+ev+'/lots','POST',{label:'Único',capacity:1,priceCents:1500},organizer);
  await request('/api/events/'+ev+'/publish','POST',{},organizer);
  const held=await request('/api/orders','POST',{lotId:l.lotId,quantity:1,requestKey:randomUUID()},buyerB);
  assert.equal(held.status,201);
  const secret='another-fake-webhook-secret-longer-than-32';
  const raw=JSON.stringify({webhookId:randomUUID(),orderId:held.order.id,status:'sandbox_paid'});
  const ts=String(Math.floor(Date.now()/1000));
  const sig=createHmac('sha256',secret).update(ts+'.'+raw).digest('hex');
  async function webhook(signature) {
    const reply=await mf.dispatchFetch('https://local.test/api/webhooks/sandbox',{
      method:'POST',headers:{'content-type':'application/json','x-rfb-timestamp':ts,'x-rfb-signature':signature},
      body:raw
    });
    return {httpStatus:reply.status,...await reply.json()};
  }
  assert.equal((await webhook('0'.repeat(64))).httpStatus,401);
  const first=await webhook(sig);assert.equal(first.httpStatus,200);assert.equal(first.replayed,false);
  const replay=await webhook(sig);assert.equal(replay.httpStatus,200);assert.equal(replay.replayed,true);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE order_id=?').bind(held.order.id).first();
  assert.equal(count.n,1);
  const order=await db.prepare('SELECT status FROM orders WHERE id=?').bind(held.order.id).first();
  assert.equal(order.status,'issued');
});

test('workerd D1: cross-tenant organizer cannot manage events owned by another user',async()=>{
  const other=await request('/api/events','POST',{title:'Evento de outro tenant',city:'Votuporanga',startsAt:'2027-11-02T22:00:00Z'},buyerB);
  assert.equal(other.status,201);
  assert.equal((await request('/api/events/'+other.eventId+'/lots','POST',{label:'Inválido',capacity:1,priceCents:100},organizer)).status,403);
  assert.equal((await request('/api/events/'+other.eventId+'/staff','POST',{uid:'gate-workerd'},organizer)).status,403);
  assert.equal((await request('/api/events/'+other.eventId+'/cancel','POST',{},organizer)).status,403);
  assert.equal((await request('/api/manage/events/'+other.eventId,'GET',undefined,organizer)).status,403);
});
