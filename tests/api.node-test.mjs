import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,createHmac,randomUUID} from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {readFileSync} from 'node:fs';


import {handleApi} from '../worker/index.mjs';

const db=new DatabaseSync(':memory:');
const migration=new URL('../migrations/0001_init.sql',import.meta.url);
db.exec(readFileSync(migration,'utf8'));
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});jwk.kid='rfb-test-key';jwk.alg='RS256';jwk.use='sig';
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'max-age=180'}});
function callSql(statements) {
  const output=[];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const item of statements) {
      const stmt=db.prepare(item.sql);
      const args=item.args;
      if(stmt.columns().length>0) {
        const rows=stmt.all(...args);
        output.push({results:rows,meta:{changes:rows.length}});
      } else {
        const info=stmt.run(...args);
        output.push({results:[],meta:{changes:Number(info.changes)}});
      }
    }
    db.exec('COMMIT');
    return output;
  } catch(e) {db.exec('ROLLBACK');throw e;}
}
class Prepared {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Prepared(this.sql,args);}
 async run(){return callSql([this])[0];}
 async first(){return callSql([this])[0].results[0]||null;}
 async all(){return callSql([this])[0];}
}
const database={prepare:sql=>new Prepared(sql),batch:async statements=>callSql(statements)};
const env={DB:database,SANDBOX_MODE:'true',FIREBASE_PROJECT_ID:'rfb-ticket-test',TICKET_SIGNING_SECRET:'0123456789test-secret-0123456789test-secret',SANDBOX_WEBHOOK_SECRET:'test-sandbox-secret-for-signature-over-32-chars'};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(uid){
 const now=Math.floor(Date.now()/1000),header=encode({alg:'RS256',typ:'JWT',kid:'rfb-test-key'});
 const payload=encode({iss:'https://securetoken.google.com/rfb-ticket-test',aud:'rfb-ticket-test',sub:uid,iat:now,exp:now+3600,auth_time:now});
 const signed=header+'.'+payload,signer=createSign('RSA-SHA256');signer.update(signed);return signed+'.'+signer.sign(privateKey).toString('base64url');
}
const a=token('organizer-a'),b=token('buyer-b'),c=token('buyer-c'),gate=token('gate-d'),outsider=token('outsider-x');
async function api(path,method='GET',body=null,auth=null){
 const headers={};if(auth)headers.authorization='Bearer '+auth;if(body!==null)headers['content-type']='application/json';
 const req=new Request('https://rfb.example'+path,{method,headers,body:body!==null?JSON.stringify(body):undefined});
 const res=await handleApi(req,env);return {httpStatus:res.status,...await res.json()};
}
let eventId,lotId,orderId,ticket;
test('public endpoints and authorization boundary',async()=>{
 assert.equal((await api('/api/health')).ready,true);
 assert.equal((await api('/api/me')).httpStatus,401);
 const me=await api('/api/me','GET',null,a);assert.equal(me.uid,'organizer-a');
 const r=await api('/api/events','POST',{title:'Evento teste',city:'Cidade teste',startsAt:'2027-01-01T00:00:00Z'},a);
 assert.equal(r.httpStatus,201);eventId=r.eventId;
 assert.equal((await api('/api/events')).events.length,0);
 assert.equal((await api('/api/events/'+eventId+'/publish','POST',{},a)).httpStatus,409);
 assert.equal((await api('/api/events/'+eventId+'/lots','POST',{label:'Pista',capacity:1,priceCents:2500},outsider)).httpStatus,403);
 const lot=await api('/api/events/'+eventId+'/lots','POST',{label:'Pista',capacity:1,priceCents:2500},a);
 assert.equal(lot.httpStatus,201);lotId=lot.lotId;
 assert.equal((await api('/api/events/'+eventId+'/publish','POST',{},a)).httpStatus,200);
 assert.equal((await api('/api/events')).events.length,1);
 assert.equal((await api('/api/events/'+eventId)).lots[0].available,1);
});
test('inventory no-oversell, idempotency key and sandbox issue',async()=>{
 const key=randomUUID(),hold=await api('/api/orders','POST',{lotId,quantity:1,requestKey:key},b);
 assert.equal(hold.httpStatus,201);orderId=hold.order.id;
 assert.equal(hold.order.amount_cents,2500);
 const second=await api('/api/orders','POST',{lotId,quantity:1,requestKey:randomUUID()},c);
 assert.equal(second.httpStatus,409);assert.equal(second.error,'SOLD_OUT_OR_UNAVAILABLE');
 const replay=await api('/api/orders','POST',{lotId,quantity:1,requestKey:key},b);
 assert.equal(replay.replayed,true);assert.equal(replay.order.id,orderId);
 assert.equal((await api('/api/orders','POST',{lotId,quantity:2,requestKey:key},b)).error,'IDEMPOTENCY_CONFLICT');
 assert.equal((await api('/api/orders/'+orderId+'/sandbox-confirm','POST',{},c)).httpStatus,404);
 const payment=await api('/api/orders/'+orderId+'/sandbox-confirm','POST',{},b);
 assert.equal(payment.httpStatus,200);assert.equal(payment.sandbox,true);
 assert.equal(payment.tickets.length,1);ticket=payment.tickets[0];assert.ok(Number.isSafeInteger(ticket.ticket_number) && ticket.ticket_number>0);assert.match(ticket.token,/^[a-f0-9-]+\.1\.[A-Za-z0-9_-]+$/);
 assert.equal((await api('/api/orders/'+orderId+'/sandbox-confirm','POST',{},b)).replayed,true);
 assert.equal((await api('/api/events/'+eventId)).lots[0].available,0);
});
test('role isolation, single check-in, replay and authorized gate',async()=>{
 const attempt=randomUUID();
 assert.equal((await api('/api/checkin','POST',{eventId,token:ticket.token,requestId:attempt},outsider)).httpStatus,403);
 assert.equal((await api('/api/checkin','POST',{eventId,token:ticket.token,requestId:attempt},gate)).httpStatus,403);
 assert.equal((await api('/api/events/'+eventId+'/staff','POST',{uid:'gate-d'},a)).httpStatus,200);
 const first=await api('/api/checkin','POST',{eventId,token:ticket.token,requestId:attempt},gate);
 assert.equal(first.result,'OK');assert.equal(first.replayed,false);
 const replay=await api('/api/checkin','POST',{eventId,token:ticket.token,requestId:attempt},gate);
 assert.equal(replay.result,'OK');assert.equal(replay.replayed,true);
 const second=await api('/api/checkin','POST',{eventId,token:ticket.token,requestId:randomUUID()},gate);
 assert.equal(second.httpStatus,409);assert.equal(second.error,'ALREADY_USED');
 const st=await api('/api/events/'+eventId+'/stats','GET',null,a);
 assert.equal(st.stats.checkins,1);assert.equal(st.stats.issued,1);
 assert.equal((await api('/api/events/'+eventId+'/stats','GET',null,b)).httpStatus,403);
 assert.equal((await api('/api/orders/'+orderId+'/refund','POST',{},b)).error,'REFUND_DENIED');
});
test('transfer revokes old token and refund works before admission',async()=>{
 const newLot=await api('/api/events/'+eventId+'/lots','POST',{label:'Camarote',capacity:2,priceCents:5000},a);
 const newOrder=await api('/api/orders','POST',{lotId:newLot.lotId,quantity:1,requestKey:randomUUID()},b);
 const confirm=await api('/api/orders/'+newOrder.order.id+'/sandbox-confirm','POST',{},b);
 const tokenBefore=confirm.tickets[0].token;
 const moved=await api('/api/tickets/'+confirm.tickets[0].id+'/transfer','POST',{toUid:'buyer-c'},b);
 assert.equal(moved.oldTokenRevoked,true);
 assert.equal((await api('/api/checkin','POST',{eventId,token:tokenBefore,requestId:randomUUID()},gate)).error,'INVALID_TICKET');
 const cTickets=(await api('/api/tickets','GET',null,c)).tickets;
 const newest=cTickets.find(x=>x.id===confirm.tickets[0].id);
 assert.ok(newest.token && newest.token!==tokenBefore);
 const another=await api('/api/orders','POST',{lotId:newLot.lotId,quantity:1,requestKey:randomUUID()},c);
 const issued=await api('/api/orders/'+another.order.id+'/sandbox-confirm','POST',{},c);
 const refunded=await api('/api/orders/'+another.order.id+'/refund','POST',{},c);
 assert.equal(refunded.httpStatus,200);assert.equal(refunded.moneyReturned,false);
 assert.equal((await api('/api/checkin','POST',{eventId,token:issued.tickets[0].token,requestId:randomUUID()},gate)).error,'INVALID_TICKET');
});
test('checkin valid signature required, no trust to browser-provided token',async()=>{
 const token=await api('/api/tickets','GET',null,c);
 const valid=token.tickets.find(x=>x.status==='issued');assert.ok(valid);
 const tampered=valid.token.slice(0,-1)+(valid.token.at(-1)==='A'?'B':'A');
 assert.equal((await api('/api/checkin','POST',{eventId,token:tampered,requestId:randomUUID()},gate)).error,'INVALID_TICKET');
 assert.equal((await api('/api/checkin','POST',{eventId,token:valid.token,requestId:randomUUID()},gate)).result,'OK');
});
test('two concurrent buyers cannot reserve the last seat, and cross-event role isolation holds',async()=>{
 const anotherEvent=await api('/api/events','POST',{title:'Evento paralelo',city:'Cidade paralela',startsAt:'2027-03-20T18:00:00Z'},a);
 const ev=anotherEvent.eventId;
 const extraLot=await api('/api/events/'+ev+'/lots','POST',{label:'Uma vaga',capacity:1,priceCents:1234},a);
 await api('/api/events/'+ev+'/publish','POST',{},a);
 const [x,y]=await Promise.all([
   api('/api/orders','POST',{lotId:extraLot.lotId,quantity:1,requestKey:randomUUID()},b),
   api('/api/orders','POST',{lotId:extraLot.lotId,quantity:1,requestKey:randomUUID()},c),
 ]);
 assert.deepEqual([x.httpStatus,y.httpStatus].sort(),[201,409]);
 const details=await api('/api/events/'+ev);
 assert.equal(details.lots[0].available,0);
 assert.equal(details.lots[0].reserved,1);
 assert.equal((await api('/api/events/'+ev+'/lots','POST',{label:'Inválido',capacity:1,priceCents:0},b)).httpStatus,403);
 assert.equal((await api('/api/events/'+ev+'/stats','GET',null,gate)).httpStatus,403);
});
test('expiration recovers capacity atomically and stale checkout cannot issue',async()=>{
 const exp=await api('/api/events','POST',{title:'Teste de expiração',city:'Cidade teste',startsAt:'2027-04-14T20:00:00Z'},a);
 const xlot=await api('/api/events/'+exp.eventId+'/lots','POST',{label:'Só uma vaga',capacity:1,priceCents:100},a);
 await api('/api/events/'+exp.eventId+'/publish','POST',{},a);
 const first=await api('/api/orders','POST',{lotId:xlot.lotId,quantity:1,requestKey:randomUUID()},b);
 assert.equal(first.httpStatus,201);
 db.prepare('UPDATE orders SET hold_expires_at=? WHERE id=?').run(1,first.order.id);
 const next=await api('/api/orders','POST',{lotId:xlot.lotId,quantity:1,requestKey:randomUUID()},c);
 assert.equal(next.httpStatus,201);
 assert.equal((await api('/api/orders/'+first.order.id+'/sandbox-confirm','POST',{},b)).httpStatus,409);
 const lot=(await api('/api/events/'+exp.eventId)).lots[0];
 assert.equal(lot.available,0);assert.equal(lot.reserved,1);
});
test('independent fiscal cannot reuse another fiscal idempotency request',async()=>{
 const staff2=token('gate-e');
 const l=await api('/api/events/'+eventId+'/lots','POST',{label:'Checkin paralelo',capacity:1,priceCents:0},a);
 const o=await api('/api/orders','POST',{lotId:l.lotId,quantity:1,requestKey:randomUUID()},b);
 const issued=await api('/api/orders/'+o.order.id+'/sandbox-confirm','POST',{},b);
 const entry=issued.tickets[0].token;
 await api('/api/events/'+eventId+'/staff','POST',{uid:'gate-e'},a);
 const reqId=randomUUID();
 const first=await api('/api/checkin','POST',{eventId,token:entry,requestId:reqId},gate);
 assert.equal(first.result,'OK');
 const denied=await api('/api/checkin','POST',{eventId,token:entry,requestId:reqId},staff2);
 assert.equal(denied.httpStatus,409);
 assert.equal(denied.error,'REQUEST_ID_REUSED');
 const repeated=await api('/api/checkin','POST',{eventId,token:entry,requestId:randomUUID()},staff2);
 assert.equal(repeated.error,'ALREADY_USED');
});
test('F03 ticket numbers are stable, positive and unique globally without being authentication tokens',async()=>{
 const ticketRows=db.prepare('SELECT ticket_number,id FROM tickets ORDER BY ticket_number').all();
 assert.ok(ticketRows.length>=3);
 assert.equal(new Set(ticketRows.map(row=>row.ticket_number)).size,ticketRows.length);
 assert.ok(ticketRows.every(row=>Number.isSafeInteger(row.ticket_number) && row.ticket_number>0));
 const owned=(await api('/api/tickets','GET',null,c)).tickets;
 assert.ok(owned.every(t=>Number.isSafeInteger(t.ticket_number)));
 assert.ok(owned.every(t=>!String(t.token || '').startsWith(String(t.ticket_number))));
});
test('F05 fake-provider callback signature is required, replays cannot issue tickets twice',async()=>{
 const lot=await api('/api/events/'+eventId+'/lots','POST',{label:'Webhook Lote',capacity:1,priceCents:1500},a);
 const order=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},b);
 assert.equal(order.httpStatus,201);
 const payload=JSON.stringify({webhookId:randomUUID(),orderId:order.order.id,status:'sandbox_paid'});
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac('sha256',env.SANDBOX_WEBHOOK_SECRET).update(timestamp+'.'+payload).digest('hex');
 async function fire(sig,stamp=timestamp,raw=payload){
   const req=new Request('https://rfb.example/api/webhooks/sandbox',{method:'POST',headers:{'content-type':'application/json','x-rfb-timestamp':stamp,'x-rfb-signature':sig},body:raw});
   const res=await handleApi(req,env);return {httpStatus:res.status,...await res.json()};
 }
 assert.equal((await fire('0'.repeat(64))).httpStatus,401);
 assert.equal((await fire(signature,String(Number(timestamp)-3600))).httpStatus,401);
 const first=await fire(signature);assert.equal(first.httpStatus,200);assert.equal(first.replayed,false);
 const again=await fire(signature);assert.equal(again.httpStatus,200);assert.equal(again.replayed,true);
 const issued=db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE order_id=?').get(order.order.id);
 assert.equal(issued.n,1);
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order.order.id).status,'issued');
 assert.equal((await fire(signature,timestamp,payload+' ')).httpStatus,401);
});
test('administrator dashboard is read-only and granted only by trusted backend config',async()=>{
 const admin=token('admin-trusted');
 env.ADMIN_UID='admin-trusted';
 const ok=await api('/api/admin/summary','GET',null,admin);
 assert.equal(ok.httpStatus,200);assert.equal(ok.readOnly,true);
 assert.ok(ok.stats.total_events>=2);
 assert.ok(ok.stats.issued_tickets>=3);
 const denied=await api('/api/admin/summary','GET',null,b);
 assert.equal(denied.httpStatus,403);
 assert.equal((await api('/api/me','GET',null,admin)).isAdmin,true);
 assert.equal((await api('/api/me','GET',null,b)).isAdmin,false);
 delete env.ADMIN_UID;
 assert.equal((await api('/api/admin/summary','GET',null,admin)).httpStatus,403);
});

test('expired holds are projected read-only as available before a new reservation',async()=>{
 const ev=await api('/api/events','POST',{title:'Projeção de estoque',city:'Jales',startsAt:'2027-05-01T20:00:00Z'},a);
 const lot=await api('/api/events/'+ev.eventId+'/lots','POST',{label:'Único',capacity:1,priceCents:499},a);
 await api('/api/events/'+ev.eventId+'/publish','POST',{},a);
 const hold=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},b);
 assert.equal(hold.httpStatus,201);
 assert.equal((await api('/api/events/'+ev.eventId)).lots[0].available,0);
 db.prepare('UPDATE orders SET hold_expires_at=? WHERE id=?').run(1,hold.order.id);
 const publicView=await api('/api/events/'+ev.eventId);
 assert.equal(publicView.lots[0].reserved,0);
 assert.equal(publicView.lots[0].available,1);
 const myOrders=await api('/api/orders','GET',null,b);
 assert.equal(myOrders.orders.find(o=>o.id===hold.order.id).status,'expired');
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(hold.order.id).status,'held');
 const fresh=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},c);
 assert.equal(fresh.httpStatus,201);
 assert.equal((await api('/api/events/'+ev.eventId)).lots[0].available,0);
});
test('only organizer can revoke gate, and revocation takes effect at next scan',async()=>{
 const lot=await api('/api/events/'+eventId+'/lots','POST',{label:'Revogação fiscal',capacity:1,priceCents:0},a);
 const hold=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},b);
 const issued=await api('/api/orders/'+hold.order.id+'/sandbox-confirm','POST',{},b);
 const signed=issued.tickets[0].token;
 const target='/api/events/'+eventId+'/staff/gate-d';
 assert.equal((await api(target,'DELETE',null,b)).httpStatus,403);
 const revoked=await api(target,'DELETE',null,a);
 assert.equal(revoked.revoked,true);
 assert.equal((await api('/api/checkin','POST',{eventId,token:signed,requestId:randomUUID()},gate)).httpStatus,403);
 assert.equal((await api('/api/checkin','POST',{eventId,token:signed,requestId:randomUUID()},a)).result,'OK');
 assert.equal((await api(target,'DELETE',null,a)).httpStatus,404);
 assert.equal((await api('/api/events/'+eventId+'/staff','POST',{uid:'gate-d'},a)).httpStatus,200);
 const report=await api('/api/events/'+eventId+'/audit','GET',null,a);
 assert.ok(report.audit.some(row=>row.action==='GATE_REVOKED'));
});
test('cancel event revokes all issued tickets, releases holds, and blocks new lots',async()=>{
 const ev=await api('/api/events','POST',{title:'Evento cancelável',city:'Jales',startsAt:'2027-07-01T20:00:00Z'},a);
 const lot=await api('/api/events/'+ev.eventId+'/lots','POST',{label:'Lote simples',capacity:2,priceCents:1900},a);
 await api('/api/events/'+ev.eventId+'/publish','POST',{},a);
 const paid=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},b);
 const issued=await api('/api/orders/'+paid.order.id+'/sandbox-confirm','POST',{},b);
 const held=await api('/api/orders','POST',{lotId:lot.lotId,quantity:1,requestKey:randomUUID()},c);
 assert.equal((await api('/api/events/'+ev.eventId+'/cancel','POST',{},c)).httpStatus,403);
 const cancelled=await api('/api/events/'+ev.eventId+'/cancel','POST',{},a);
 assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.moneyReturned,false);
 assert.equal((await api('/api/events/'+ev.eventId)).httpStatus,404);
 assert.equal((await api('/api/events/'+ev.eventId+'/cancel','POST',{},a)).httpStatus,409);
 assert.equal((await api('/api/events/'+ev.eventId+'/lots','POST',{label:'Tardio',capacity:1,priceCents:0},a)).httpStatus,409);
 const bOrders=await api('/api/orders','GET',null,b);
 assert.equal(bOrders.orders.find(x=>x.id===paid.order.id).status,'refunded');
 const cOrders=await api('/api/orders','GET',null,c);
 assert.equal(cOrders.orders.find(x=>x.id===held.order.id).status,'cancelled');
 const updated=(await api('/api/tickets','GET',null,b)).tickets.find(x=>x.id===issued.tickets[0].id);
 assert.equal(updated.status,'revoked');assert.equal(updated.token,null);
 assert.equal((await api('/api/checkin','POST',{eventId:ev.eventId,token:issued.tickets[0].token,requestId:randomUUID()},a)).error,'INVALID_TICKET');
 const sums=db.prepare('SELECT reserved,issued FROM lots WHERE id=?').get(lot.lotId);
 assert.equal(sums.reserved,0);assert.equal(sums.issued,1);
});
test('organizer cannot cancel an event after its first successful admission',async()=>{
 assert.equal((await api('/api/events/'+eventId+'/cancel','POST',{},a)).error,'EVENT_CANCELLATION_DENIED');
 const manage=await api('/api/manage/events/'+eventId,'GET',null,a);
 assert.equal(manage.event.status,'published');
});

after(()=>{globalThis.fetch=originalFetch;db.close();});
