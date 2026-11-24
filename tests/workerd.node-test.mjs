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
      SANDBOX_WEBHOOK_SECRET:'another-fake-webhook-secret-longer-than-32',
      ADMIN_UID:'admin-workerd' // synthetic test-only admin, not production
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
  const auditRow=await db.prepare("SELECT COUNT(*) AS n FROM audit WHERE event_id=? AND action='CHECKIN_ACCEPTED' AND target_id=?").bind(eventId,issue.tickets[0].id).first();
  assert.equal(auditRow.n,1);
  const activity=await request('/api/events/'+eventId+'/checkins?page=1','GET',undefined,gate);
  assert.equal(activity.status,200);assert.equal(activity.checkins.length,1);
  assert.equal(activity.checkins[0].ticket_number,issue.tickets[0].ticket_number);
  assert.ok(!('fiscal_uid' in activity.checkins[0]));
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
  assert.equal((await request('/api/events/'+ev+'/staff','POST',{uid:'gate-workerd'},organizer)).status,409);
  assert.equal((await request('/api/lots/'+l.lotId,'PATCH',{status:'paused'},organizer)).status,409);
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

test('workerd D1: sandbox refund revokes ticket and returns inventory exactly once',async()=>{
  const created=await request('/api/events','POST',{title:'Reembolso fictício D1',city:'Jales',startsAt:'2027-12-12T20:00:00Z'},organizer);
  const ev=created.eventId;
  const lot=await request('/api/events/'+ev+'/lots','POST',{label:'Um lugar',capacity:1,priceCents:1000},organizer);
  await request('/api/events/'+ev+'/publish','POST',{},organizer);
  const held=await request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},buyerA);
  assert.equal(held.status,201);
  const paid=await request('/api/orders/'+held.order.id+'/sandbox-confirm','POST',{},buyerA);
  assert.equal(paid.status,200);
  assert.equal((await request('/api/events/'+ev)).lots[0].available,0);
  const refunded=await request('/api/orders/'+held.order.id+'/refund','POST',{},buyerA);
  assert.equal(refunded.status,200);
  assert.equal(refunded.capacityReleased,true);
  assert.equal((await request('/api/events/'+ev)).lots[0].available,1);
  assert.equal((await request('/api/orders/'+held.order.id+'/refund','POST',{},buyerA)).status,409);
  const ticket=await request('/api/tickets','GET',undefined,buyerA);
  assert.equal(ticket.tickets.find(x=>x.id===paid.tickets[0].id).status,'revoked');
  const repurchased=await request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},buyerB);
  assert.equal(repurchased.status,201);
  assert.equal((await request('/api/events/'+ev)).lots[0].available,0);
});

test('workerd D1: CSV report is allowed only for the event owner',async()=>{
  const checked=await db.prepare('SELECT event_id FROM checkins LIMIT 1').first();
  assert.ok(checked?.event_id);
  const url='https://local.test/api/events/'+checked.event_id+'/checkins.csv';
  const allowed=await mf.dispatchFetch(url,{headers:{Authorization:'Bearer '+organizer}});
  assert.equal(allowed.status,200);
  assert.match(allowed.headers.get('content-type')||'',/text\/csv/);
  const text=await allowed.text();
  // Response.text() may remove a UTF-8 BOM; validate the actual CSV header.
  assert.ok(text.replace(/^\uFEFF/,'').startsWith('numero_ingresso,data_checkin_utc'));
  assert.ok(!text.includes('buyer-workerd')&&!text.includes('gate-workerd'));
  const outsider=await mf.dispatchFetch(url,{headers:{Authorization:'Bearer '+buyerA}});
  assert.equal(outsider.status,403);
});

test('workerd D1: concurrent requests cannot bypass the five-active-hold antiabuse cap',async()=>{
  const rate=fakeFirebaseIdToken('buyer-limited-workerd');
  const created=await request('/api/events','POST',{title:'Teste limite D1',city:'Jales',startsAt:'2027-11-30T20:00:00Z'},organizer);
  const ev=created.eventId;
  const lot=await request('/api/events/'+ev+'/lots','POST',{label:'Sem excedente',capacity:10,priceCents:0},organizer);
  await request('/api/events/'+ev+'/publish','POST',{},organizer);
  const active=[];
  for(let i=0;i<4;i++){
    const hold=await request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},rate);
    assert.equal(hold.status,201);active.push(hold.order.id);
  }
  const [first,second]=await Promise.all([
    request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},rate),
    request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},rate)
  ]);
  assert.deepEqual([first.status,second.status].sort((a,b)=>a-b),[201,429]);
  assert.equal((await request('/api/events/'+ev)).lots[0].reserved,5);
  assert.equal((await request('/api/orders/'+active[0]+'/cancel','POST',{},rate)).status,200);
  const refill=await request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},rate);
  assert.equal(refill.status,201);
});

test('workerd D1: one-time ticket transfer rotates QR and new owner can enter',async()=>{
  const created=await request('/api/events','POST',{title:'Transferência com prova D1',city:'Jales',startsAt:'2027-12-21T20:00:00Z'},organizer);
  const eventId=created.eventId;
  const lot=await request('/api/events/'+eventId+'/lots','POST',{label:'Troca única',capacity:1,priceCents:0},organizer);
  await request('/api/events/'+eventId+'/publish','POST',{},organizer);
  const hold=await request('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},buyerA);
  const issued=await request('/api/orders/'+hold.order.id+'/sandbox-confirm','POST',{},buyerA);
  assert.equal(issued.status,200);
  const item=issued.tickets[0],oldToken=item.token;
  const forbidden=await request('/api/tickets/'+item.id+'/transfer','POST',{toUid:'buyer-workerd-a'},buyerB);
  assert.equal(forbidden.status,404);
  const transferred=await request('/api/tickets/'+item.id+'/transfer','POST',{toUid:'buyer-workerd-b'},buyerA);
  assert.equal(transferred.status,200);assert.equal(transferred.oldTokenRevoked,true);
  assert.equal((await request('/api/tickets/'+item.id+'/transfer','POST',{toUid:'buyer-workerd-a'},buyerB)).status,409);
  assert.equal((await request('/api/checkin','POST',{eventId,token:oldToken,requestId:randomUUID()},organizer)).status,400);
  const buyerView=await request('/api/tickets','GET',undefined,buyerB);
  const current=buyerView.tickets.find(t=>t.id===item.id);
  assert.ok(current?.token);assert.notEqual(current.token,oldToken);
  const allowed=await request('/api/checkin','POST',{eventId,token:current.token,requestId:randomUUID()},organizer);
  assert.equal(allowed.status,200);
  assert.equal((await request('/api/tickets/'+item.id+'/transfer','POST',{toUid:'buyer-workerd-a'},buyerB)).status,409);
});

test('workerd D1: admin read-only report requires server-bound UID',async()=>{
  const denied=await request('/api/admin/summary','GET',undefined,buyerA);
  assert.equal(denied.status,403);
  const admin=fakeFirebaseIdToken('admin-workerd');
  const data=await request('/api/admin/summary','GET',undefined,admin);
  assert.equal(data.status,200);
  assert.ok(Number.isInteger(data.stats.total_events));
  assert.ok(Number.isInteger(data.stats.completed_checkins));
  assert.equal((await request('/api/admin/summary','POST',{},admin)).status,404);
});


test('workerd D1: search exact strings, pagination and input guards',async()=>{
  const term='cfSearch'+randomUUID().replaceAll('-','').slice(0,12);
  const statements=Array.from({length:22},(_,i)=>
    db.prepare("INSERT INTO events(id,organizer_uid,title,description,city,starts_at,status) VALUES(?,?,?,?,?,?,'published')")
      .bind(randomUUID(),'organizer-workerd',term+' Festival '+i,'Evento local para paginação','Jales',`2028-05-${String(i+1).padStart(2,'0')}T15:00:00Z`)
  );
  await db.batch(statements);
  const p1=await request('/api/events?q='+term+'&city=jales');
  const p2=await request('/api/events?q='+term+'&city=jales&page=2');
  assert.equal(p1.status,200);assert.equal(p1.events.length,20);assert.equal(p1.hasMore,true);
  assert.equal(p2.status,200);assert.equal(p2.events.length,2);assert.equal(p2.hasMore,false);
  assert.equal((await request('/api/events?q=%25')).events.length,0);
  assert.equal((await request('/api/events?page=-1')).status,400);
  assert.equal((await request('/api/events?q='+('x'.repeat(101)))).status,400);
});
