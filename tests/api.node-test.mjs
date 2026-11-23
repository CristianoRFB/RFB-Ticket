import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,randomUUID} from 'node:crypto';
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
const env={DB:database,SANDBOX_MODE:'true',FIREBASE_PROJECT_ID:'rfb-ticket-test',TICKET_SIGNING_SECRET:'0123456789test-secret-0123456789test-secret'};
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
 assert.equal(payment.tickets.length,1);ticket=payment.tickets[0];assert.match(ticket.token,/^[a-f0-9-]+\.1\.[A-Za-z0-9_-]+$/);
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
after(()=>{globalThis.fetch=originalFetch;db.close();});
