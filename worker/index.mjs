import { authenticate } from './auth.mjs';
import { createTicketToken, parseTicketToken, validateTicketToken } from './crypto.mjs';
import { verifySandboxWebhook } from './webhook.mjs';

class ApiError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const now = () => Math.floor(Date.now()/1000);
const ok = (value, status=200) => Response.json(value, {status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function bad(code,status=400) {throw new ApiError(code,status);}
function str(value,max=140) {if(typeof value !== 'string' || value.trim().length===0 || value.length>max) bad('INVALID_INPUT');return value.trim();}
function id(value) {if(typeof value !== 'string'|| !uuid.test(value))bad('INVALID_ID');return value.toLowerCase();}
function integer(value,min,max) {if(!Number.isSafeInteger(value)||value<min||value>max)bad('INVALID_INPUT');return value;}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) bad('JSON_REQUIRED',415);
  const text=await request.text();if(text.length>10000)bad('PAYLOAD_TOO_LARGE',413);
  try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))bad('INVALID_JSON');return value;}
  catch(e){if(e instanceof ApiError)throw e;bad('INVALID_JSON');}
}
async function hasRole(db,uid,eventId,roles=['organizer']) {
  const result=await db.prepare('SELECT e.organizer_uid, s.role FROM events e LEFT JOIN event_staff s ON s.event_id=e.id AND s.uid=? WHERE e.id=?').bind(uid,eventId).first();
  return !!result && (result.organizer_uid===uid || (roles.includes(result.role)));
}
async function requireRole(db,uid,eventId,roles=['organizer']) {if(!await hasRole(db,uid,eventId,roles))bad('NO_PERMISSION',403);}
async function audit(db,eventId,uid,action,target) {
  await db.prepare('INSERT INTO audit(event_id,actor_uid,action,target_id,created_at) VALUES(?,?,?,?,?)').bind(eventId,uid,action,target,now()).run();
}
async function sweepExpired(db) {
  const t=now();
  await db.batch([
    db.prepare(`UPDATE lots SET reserved=reserved-COALESCE((SELECT SUM(quantity) FROM orders WHERE lot_id=lots.id AND status='held' AND hold_expires_at<=?),0)
      WHERE EXISTS(SELECT 1 FROM orders WHERE lot_id=lots.id AND status='held' AND hold_expires_at<=?)`).bind(t,t),
    db.prepare("UPDATE orders SET status='expired' WHERE status='held' AND hold_expires_at<=?").bind(t),
  ]);
}
function safeError(error) {
  if(error instanceof ApiError)return ok({error:error.code},error.status);
  if(['INVALID_TOKEN','AUTH_UNCONFIGURED','UNAUTHORIZED'].includes(error?.message))return ok({error:'UNAUTHORIZED'},401);
  if(error?.message==='AUTH_KEYS_UNAVAILABLE')return ok({error:'AUTH_UNAVAILABLE'},503);
  if(error?.message==='SIGNING_UNCONFIGURED')return ok({error:'TICKET_SIGNING_UNAVAILABLE'},503);
  console.error(JSON.stringify({kind:'API_ERROR',error_type:error?.name||'Unknown'}));
  return ok({error:'INTERNAL_ERROR'},500);
}

export async function handleApi(request,env) {
  try {
    if(!env.DB)bad('DATABASE_NOT_CONFIGURED',503);
    if(new URL(request.url).pathname==='/api/health')return ok({service:'rfb-ticket',mode:'sandbox',ready:!!env.FIREBASE_PROJECT_ID&&!!env.TICKET_SIGNING_SECRET});
    const url=new URL(request.url),path=url.pathname,method=request.method;
    // Public catalog (only published records; no personal information).
    if(method==='GET' && path==='/api/events') {
      const result=await env.DB.prepare("SELECT id,title,description,city,starts_at,status FROM events WHERE status='published' ORDER BY starts_at LIMIT 100").all();
      return ok({events:result.results||[]});
    }
    const evDetail=/^\/api\/events\/([^/]+)$/.exec(path);
    if(method==='GET' && evDetail) {
      const eventId=id(evDetail[1]);
      const event=await env.DB.prepare("SELECT id,title,description,city,starts_at,status FROM events WHERE id=? AND status='published'").bind(eventId).first();
      if(!event)bad('NOT_FOUND',404);
      // Public availability is a read-only projection. Expired holds no longer appear sold out
      // even before a subsequent write performs the physical sweep.
      const lots=await env.DB.prepare(`SELECT l.id,l.label,l.price_cents,l.capacity,l.issued,l.status,
        MAX(0,l.reserved-COALESCE((SELECT SUM(o.quantity) FROM orders o
          WHERE o.lot_id=l.id AND o.status='held' AND o.hold_expires_at<=?),0)) AS reserved
        FROM lots l WHERE l.event_id=? ORDER BY l.price_cents`).bind(now(),eventId).all();
      return ok({event,lots:(lots.results||[]).map(l=>({...l,available:Math.max(0,l.capacity-l.issued-l.reserved)}))});
    }
    // Signed, time-limited payment *simulation* callback from a fake provider.
    // Does not authorize a real-world charge. The client cannot sign this event.
    if(method==='POST' && path==='/api/webhooks/sandbox'){
      if(env.SANDBOX_MODE!=='true'||!env.SANDBOX_WEBHOOK_SECRET||env.SANDBOX_WEBHOOK_SECRET.length<32)bad('WEBHOOK_NOT_CONFIGURED',503);
      let event;try{event=await verifySandboxWebhook(request,env.SANDBOX_WEBHOOK_SECRET);}
      catch(e){if(e.message==='WEBHOOK_UNCONFIGURED')bad('WEBHOOK_NOT_CONFIGURED',503);bad('WEBHOOK_UNAUTHORIZED',401);}
      const webhookId=id(event.webhookId),orderId=id(event.orderId);
      const prior=await env.DB.prepare('SELECT order_id FROM sandbox_webhooks WHERE id=?').bind(webhookId).first();
      if(prior){if(prior.order_id!==orderId)bad('WEBHOOK_REPLAY_CONFLICT',409);return ok({accepted:true,replayed:true,sandbox:true});}
      const order=await env.DB.prepare('SELECT id,event_id,buyer_uid,lot_id,quantity,status,hold_expires_at FROM orders WHERE id=?').bind(orderId).first();
      if(!order)bad('NOT_FOUND',404);
      if(order.status!=='held'||order.hold_expires_at<=now())bad('ORDER_EXPIRED_OR_INVALID',409);
      const t=now(),ticketIds=Array.from({length:order.quantity},()=>crypto.randomUUID());
      const stmts=[
        env.DB.prepare("INSERT OR IGNORE INTO sandbox_webhooks(id,order_id,received_at) SELECT ?,id,? FROM orders WHERE id=? AND status='held' AND hold_expires_at>?").bind(webhookId,t,orderId,t),
        env.DB.prepare("UPDATE orders SET status='issuing' WHERE id=? AND status='held' AND EXISTS(SELECT 1 FROM sandbox_webhooks WHERE id=? AND order_id=?)").bind(orderId,webhookId,orderId),
      ];
      for(const ticketId of ticketIds)stmts.push(env.DB.prepare("INSERT INTO tickets(id,order_id,event_id,owner_uid,status,created_at) SELECT ?,id,event_id,buyer_uid,'issued',? FROM orders WHERE id=? AND status='issuing'").bind(ticketId,t,orderId));
      stmts.push(env.DB.prepare("UPDATE lots SET reserved=reserved-?,issued=issued+? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='issuing')").bind(order.quantity,order.quantity,order.lot_id,orderId));
      stmts.push(env.DB.prepare("UPDATE orders SET status='issued' WHERE id=? AND status='issuing'").bind(orderId));
      const result=await env.DB.batch(stmts);
      if(!result[0]?.meta?.changes){
        const replay=await env.DB.prepare('SELECT order_id FROM sandbox_webhooks WHERE id=?').bind(webhookId).first();
        if(replay?.order_id===orderId)return ok({accepted:true,replayed:true,sandbox:true});
        bad('ORDER_CONFLICT',409);
      }
      await audit(env.DB,order.event_id,'fake-provider','SIGNED_SANDBOX_WEBHOOK',orderId);
      return ok({accepted:true,replayed:false,sandbox:true});
    }
    const user=await authenticate(request,env);
    if(method==='GET' && path==='/api/me')return ok({uid:user.uid,emailVerified:user.emailVerified,isAdmin:typeof env.ADMIN_UID==='string' && env.ADMIN_UID.length>0 && user.uid===env.ADMIN_UID});
    // A read-only administrative overview. No arbitrary self-assigned roles and no personal data.
    if(method==='GET' && path==='/api/admin/summary'){
      if(!env.ADMIN_UID || user.uid!==env.ADMIN_UID)bad('NO_PERMISSION',403);
      const stats=await env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM events) AS total_events,
        (SELECT COUNT(*) FROM events WHERE status='published') AS published_events,
        (SELECT COUNT(*) FROM lots) AS total_lots,
        (SELECT COUNT(*) FROM orders) AS sandbox_orders,
        (SELECT COUNT(*) FROM tickets) AS issued_tickets,
        (SELECT COUNT(*) FROM checkins) AS completed_checkins`).first();
      return ok({stats,financials:'sandbox_only',readOnly:true});
    }

    // Organizer-only CSV export: ticket numbers and UTC timestamps, never QR
    // secrets, buyer UID or fiscal UID. Explicit cap prevents unbounded reads.
    const csvRoute=/^\\/api\\/events\\/([^/]+)\\/checkins\\.csv$/.exec(path);
    if(method==='GET' && csvRoute){
      const eventId=id(csvRoute[1]);
      const owner=await env.DB.prepare('SELECT organizer_uid FROM events WHERE id=?').bind(eventId).first();
      if(!owner||owner.organizer_uid!==user.uid)bad('NO_PERMISSION',403);
      const records=await env.DB.prepare(`SELECT t.ticket_number,c.created_at
        FROM checkins c JOIN tickets t ON t.id=c.ticket_id
        WHERE c.event_id=? ORDER BY c.created_at ASC,t.ticket_number ASC LIMIT 5001`).bind(eventId).all();
      const list=records.results||[];
      if(list.length>5000)bad('REPORT_EXPORT_LIMIT',413);
      const rows=['numero_ingresso,data_checkin_utc',...list.map(row=>
        String(row.ticket_number)+','+new Date(Number(row.created_at)*1000).toISOString())];
      return new Response('\\uFEFF'+rows.join('\\r\\n')+'\\r\\n',{
        status:200,headers:{
          'Content-Type':'text/csv; charset=utf-8',
          'Content-Disposition':'attachment; filename="rfbticket-checkins-'+eventId+'.csv"',
          'Cache-Control':'private, no-store',
          'X-Content-Type-Options':'nosniff',
        }
      });
    }
    const managerDetail=/^\\/api\\/manage\\/events\\/([^/]+)$/.exec(path);
    if(method==='GET' && managerDetail) {
      const eventId=id(managerDetail[1]);
      await requireRole(env.DB,user.uid,eventId,['organizer','gate']);
      const event=await env.DB.prepare('SELECT id,organizer_uid,title,description,city,starts_at,status,created_at FROM events WHERE id=?').bind(eventId).first();
      const lots=await env.DB.prepare('SELECT * FROM lots WHERE event_id=? ORDER BY price_cents').bind(eventId).all();
      const staff=event.organizer_uid===user.uid ? await env.DB.prepare('SELECT uid,role FROM event_staff WHERE event_id=?').bind(eventId).all() : {results:[]};
      return ok({event,lots:lots.results||[],staff:staff.results||[]});
    }
    if(method==='PATCH' && evDetail){
      const eventId=id(evDetail[1]);await requireRole(env.DB,user.uid,eventId);
      const p=await body(request);
      const title=str(p.title),city=str(p.city),startsAt=str(p.startsAt,40),description=typeof p.description==='string'?p.description.slice(0,2000):'';
      if(!Number.isFinite(Date.parse(startsAt)))bad('INVALID_DATE');
      const result=await env.DB.prepare("UPDATE events SET title=?,city=?,starts_at=?,description=? WHERE id=? AND status!='cancelled'").bind(title,city,startsAt,description,eventId).run();
      if(!result.meta?.changes)bad('INVALID_EVENT_STATE',409);
      await audit(env.DB,eventId,user.uid,'EVENT_UPDATED',eventId);
      return ok({updated:true});
    }
    const lotEdit=/^\/api\/lots\/([^/]+)$/.exec(path);
    if(method==='PATCH' && lotEdit){
      const lotId=id(lotEdit[1]);
      const existing=await env.DB.prepare('SELECT * FROM lots WHERE id=?').bind(lotId).first();
      if(!existing)bad('NOT_FOUND',404);
      await requireRole(env.DB,user.uid,existing.event_id);
      const p=await body(request),status=p.status;
      if(status!=='available' && status!=='paused')bad('INVALID_INPUT');
      const result=await env.DB.prepare(`UPDATE lots SET status=? WHERE id=?
        AND EXISTS(SELECT 1 FROM events WHERE id=lots.event_id AND status IN ('draft','published'))`).bind(status,lotId).run();
      if(!result.meta?.changes)bad('INVALID_EVENT_STATE',409);
      await audit(env.DB,existing.event_id,user.uid,'LOT_STATUS_UPDATED',lotId);
      return ok({status});
    }
    // An authenticated user may create their own event, but cannot impersonate another organizer.
    if(method==='POST' && path==='/api/events') {
      const p=await body(request),eventId=crypto.randomUUID();
      const title=str(p.title),city=str(p.city),startsAt=str(p.startsAt,40),description=typeof p.description==='string'?p.description.slice(0,2000):'';
      if(!Number.isFinite(Date.parse(startsAt)))bad('INVALID_DATE');
      await env.DB.prepare('INSERT INTO events(id,organizer_uid,title,description,city,starts_at,status) VALUES(?,?,?,?,?,?,\'draft\')').bind(eventId,user.uid,title,description,city,startsAt).run();
      await audit(env.DB,eventId,user.uid,'EVENT_CREATED',eventId);
      return ok({eventId,status:'draft'},201);
    }
    if(method==='GET' && path==='/api/manage/events') {
      const result=await env.DB.prepare('SELECT DISTINCT e.id,e.title,e.status,e.city,e.starts_at FROM events e LEFT JOIN event_staff s ON s.event_id=e.id AND s.uid=? WHERE e.organizer_uid=? OR s.uid=? ORDER BY e.created_at DESC LIMIT 100').bind(user.uid,user.uid,user.uid).all();
      return ok({events:result.results||[]});
    }
    // Revoke a lost or compromised gate account without allowing cross-event access.
    const staffRemoval=/^\/api\/events\/([^/]+)\/staff\/([^/]+)$/.exec(path);
    if(method==='DELETE' && staffRemoval){
      const eventId=id(staffRemoval[1]),targetUid=str(decodeURIComponent(staffRemoval[2]),128);
      await requireRole(env.DB,user.uid,eventId);
      const removed=await env.DB.prepare("DELETE FROM event_staff WHERE event_id=? AND uid=? AND role='gate'").bind(eventId,targetUid).run();
      if(!removed.meta?.changes)bad('STAFF_NOT_FOUND',404);
      await audit(env.DB,eventId,user.uid,'GATE_REVOKED',targetUid);
      return ok({revoked:true,uid:targetUid});
    }
    const manage=/^\/api\/events\/([^/]+)\/(lots|publish|staff|stats|audit|checkins|cancel)$/.exec(path);
    if(manage){
      const eventId=id(manage[1]),operation=manage[2];
      if(operation==='cancel' && method==='POST') {
        await requireRole(env.DB,user.uid,eventId);
        // A cancellation is forbidden after any successful admission. One D1 batch
        // makes status, held orders, issued tickets and inventory agree atomically.
        const changed=await env.DB.batch([
          env.DB.prepare(`UPDATE events SET status='cancelled' WHERE id=? AND organizer_uid=?
            AND status IN ('draft','published') AND NOT EXISTS(SELECT 1 FROM checkins WHERE event_id=?)`).bind(eventId,user.uid,eventId),
          env.DB.prepare(`UPDATE orders SET status=CASE WHEN status='held' THEN 'cancelled'
            WHEN status='issued' THEN 'refunded' ELSE status END
            WHERE event_id=? AND status IN ('held','issued')
            AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='cancelled')`).bind(eventId,eventId),
          env.DB.prepare(`UPDATE tickets SET status='revoked',token_version=token_version+1
            WHERE event_id=? AND status='issued'
            AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='cancelled')`).bind(eventId,eventId),
          env.DB.prepare(`UPDATE lots SET reserved=0 WHERE event_id=?
            AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='cancelled')`).bind(eventId,eventId),
        ]);
        if(!changed[0]?.meta?.changes)bad('EVENT_CANCELLATION_DENIED',409);
        await audit(env.DB,eventId,user.uid,'EVENT_CANCELLED_SANDBOX',eventId);
        return ok({status:'cancelled',refunds:'simulated_only',moneyReturned:false});
      }
      if(operation==='lots' && method==='POST') {
        await requireRole(env.DB,user.uid,eventId);
        const p=await body(request),lotId=crypto.randomUUID();
        const name=str(p.label),capacity=integer(p.capacity,1,1000000),price=integer(p.priceCents,0,100000000);
        const inserted=await env.DB.prepare(`INSERT INTO lots(id,event_id,label,capacity,price_cents,status)
          SELECT ?,e.id,?,?,?,'available' FROM events e
          WHERE e.id=? AND e.status IN ('draft','published')`).bind(lotId,name,capacity,price,eventId).run();
        if(!inserted.meta?.changes)bad('INVALID_EVENT_STATE',409);
        await audit(env.DB,eventId,user.uid,'LOT_CREATED',lotId);
        return ok({lotId},201);
      }
      if(operation==='publish' && method==='POST') {
        await requireRole(env.DB,user.uid,eventId);
        const changed=await env.DB.prepare("UPDATE events SET status='published' WHERE id=? AND status='draft' AND EXISTS(SELECT 1 FROM lots WHERE lots.event_id=events.id)").bind(eventId).run();
        if(!changed.meta?.changes)bad('NO_LOTS_OR_INVALID_STATUS',409);
        await audit(env.DB,eventId,user.uid,'EVENT_PUBLISHED',eventId);
        return ok({status:'published'});
      }
      if(operation==='staff' && method==='POST') {
        await requireRole(env.DB,user.uid,eventId);
        const p=await body(request),uid=str(p.uid,128);
        if(uid===user.uid)bad('CANNOT_ASSIGN_SELF');
        const updated=await env.DB.prepare(`INSERT INTO event_staff(event_id,uid,role)
          SELECT ?,?,'gate' FROM events WHERE id=? AND status IN ('draft','published')
          ON CONFLICT(event_id,uid) DO UPDATE SET role='gate'`).bind(eventId,uid,eventId).run();
        if(!updated.meta?.changes)bad('INVALID_EVENT_STATE',409);
        await audit(env.DB,eventId,user.uid,'GATE_ASSIGNED',uid);
        return ok({uid,role:'gate'});
      }
      if(operation==='stats' && method==='GET') {
        await requireRole(env.DB,user.uid,eventId);
        const stats=await env.DB.prepare("SELECT (SELECT COALESCE(SUM(capacity),0) FROM lots WHERE event_id=?) AS capacity,(SELECT COALESCE(SUM(issued),0) FROM lots WHERE event_id=?) AS issued,(SELECT COUNT(*) FROM checkins WHERE event_id=?) AS checkins,(SELECT COALESCE(SUM(amount_cents),0) FROM orders WHERE event_id=? AND status='issued') AS sandbox_revenue_cents").bind(eventId,eventId,eventId,eventId).first();
        return ok({stats,financials:'sandbox_only_not_real_revenue'});
      }
      if(operation==='audit' && method==='GET') {
        await requireRole(env.DB,user.uid,eventId);
        const result=await env.DB.prepare('SELECT id,action,target_id,created_at FROM audit WHERE event_id=? ORDER BY created_at DESC LIMIT 100').bind(eventId).all();
        return ok({audit:result.results||[]});
      }
      if(operation==='checkins' && method==='GET') {
        await requireRole(env.DB,user.uid,eventId,['organizer','gate']);
        const result=await env.DB.prepare('SELECT ticket_id,created_at FROM checkins WHERE event_id=? ORDER BY created_at DESC LIMIT 100').bind(eventId).all();
        return ok({checkins:result.results||[]});
      }
    }
    // Order holds are D1 transactions. Client supplies neither event price nor tenant identity.
    if(method==='POST' && path==='/api/orders') {
      const p=await body(request),lotId=id(p.lotId),quantity=integer(p.quantity,1,4),requestKey=id(p.requestKey);
      await sweepExpired(env.DB);
      const prior=await env.DB.prepare('SELECT * FROM orders WHERE buyer_uid=? AND request_key=?').bind(user.uid,requestKey).first();
      if(prior){if(prior.lot_id!==lotId||prior.quantity!==quantity)bad('IDEMPOTENCY_CONFLICT',409);return ok({order:prior,replayed:true});}
      const orderId=crypto.randomUUID(),t=now(),expires=t+600;
      const insert=env.DB.prepare(`INSERT INTO orders(id,buyer_uid,event_id,lot_id,quantity,amount_cents,status,hold_expires_at,request_key,created_at)
        SELECT ?,?,l.event_id,l.id,?,l.price_cents*?,'creating',?,?,? FROM lots l JOIN events e ON e.id=l.event_id
        WHERE l.id=? AND e.status='published' AND l.status='available' AND l.capacity-l.issued-l.reserved>=?`).bind(orderId,user.uid,quantity,quantity,expires,requestKey,t,lotId,quantity);
      let batch;
      try {batch=await env.DB.batch([
        insert,
        env.DB.prepare("UPDATE lots SET reserved=reserved+? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='creating')").bind(quantity,lotId,orderId),
        env.DB.prepare("UPDATE orders SET status='held' WHERE id=? AND status='creating'").bind(orderId),
      ]);} catch(e) {
        const existing=await env.DB.prepare('SELECT * FROM orders WHERE buyer_uid=? AND request_key=?').bind(user.uid,requestKey).first();
        if(existing){if(existing.lot_id!==lotId||existing.quantity!==quantity)bad('IDEMPOTENCY_CONFLICT',409);return ok({order:existing,replayed:true});}
        throw e;
      }
      if(!batch[0]?.meta?.changes)bad('SOLD_OUT_OR_UNAVAILABLE',409);
      const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND buyer_uid=?').bind(orderId,user.uid).first();
      await audit(env.DB,order.event_id,user.uid,'ORDER_HELD',orderId);
      return ok({order,sandbox:true},201);
    }
    if(method==='GET' && path==='/api/orders'){
      const result=await env.DB.prepare(`SELECT id,event_id,lot_id,quantity,amount_cents,
        CASE WHEN status='held' AND hold_expires_at<=? THEN 'expired' ELSE status END AS status,
        hold_expires_at,created_at FROM orders WHERE buyer_uid=? ORDER BY created_at DESC LIMIT 100`).bind(now(),user.uid).all();
      return ok({orders:result.results||[]});
    }
    const orderAct=/^\/api\/orders\/([^/]+)\/(sandbox-confirm|cancel|refund)$/.exec(path);
    if(orderAct && method==='POST') {
      const orderId=id(orderAct[1]),operation=orderAct[2];
      await sweepExpired(env.DB);
      const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND buyer_uid=?').bind(orderId,user.uid).first();
      if(!order)bad('NOT_FOUND',404);
      if(operation==='cancel') {
        const result=await env.DB.batch([
          env.DB.prepare("UPDATE lots SET reserved=reserved-? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND buyer_uid=? AND status='held')").bind(order.quantity,order.lot_id,orderId,user.uid),
          env.DB.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND buyer_uid=? AND status='held'").bind(orderId,user.uid),
        ]);
        if(!result[1]?.meta?.changes)bad('INVALID_ORDER_STATE',409);
        await audit(env.DB,order.event_id,user.uid,'ORDER_CANCELLED',orderId);
        return ok({status:'cancelled'});
      }
      if(operation==='refund') {
        // Fake refund: atomically revoke QR credentials and return their sold
        // seats to inventory. Checked-in or transferred tickets remain ineligible.
        const result=await env.DB.batch([
          env.DB.prepare(`UPDATE orders SET status='refunded' WHERE id=? AND buyer_uid=?
            AND status='issued'
            AND NOT EXISTS(SELECT 1 FROM tickets WHERE order_id=?
              AND (status!='issued' OR owner_uid!=?))
            AND EXISTS(SELECT 1 FROM lots WHERE id=orders.lot_id AND issued>=orders.quantity)`)
            .bind(orderId,user.uid,orderId,user.uid),
          env.DB.prepare(`UPDATE tickets SET status='revoked',token_version=token_version+1
            WHERE order_id=? AND status='issued'
            AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='refunded')`).bind(orderId,orderId),
          env.DB.prepare(`UPDATE lots SET issued=issued-? WHERE id=? AND issued>=?
            AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='refunded')`)
            .bind(order.quantity,order.lot_id,order.quantity,orderId),
        ]);
        if(!result[0]?.meta?.changes)bad('REFUND_DENIED',409);
        await audit(env.DB,order.event_id,user.uid,'SANDBOX_REFUND_AND_STOCK_RELEASE',orderId);
        return ok({status:'refunded',moneyReturned:false,capacityReleased:true,sandbox:true});
      }
      if(operation==='sandbox-confirm') {
        if(env.SANDBOX_MODE!=='true')bad('SANDBOX_DISABLED',503);
        if(order.status==='issued')return ok({status:'issued',replayed:true,tickets:await getTicketsForOrder(env,orderId,user.uid)});
        if(order.status!=='held'||order.hold_expires_at<=now())bad('ORDER_EXPIRED_OR_INVALID',409);
        const t=now(),ticketIds=Array.from({length:order.quantity},()=>crypto.randomUUID());
        const statements=[env.DB.prepare("UPDATE orders SET status='issuing' WHERE id=? AND buyer_uid=? AND status='held' AND hold_expires_at>?").bind(orderId,user.uid,t)];
        for(const ticketId of ticketIds)statements.push(env.DB.prepare("INSERT INTO tickets(id,order_id,event_id,owner_uid,status,created_at) SELECT ?,id,event_id,buyer_uid,'issued',? FROM orders WHERE id=? AND status='issuing'").bind(ticketId,t,orderId));
        statements.push(env.DB.prepare("UPDATE lots SET reserved=reserved-?, issued=issued+? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='issuing')").bind(order.quantity,order.quantity,order.lot_id,orderId));
        statements.push(env.DB.prepare("UPDATE orders SET status='issued' WHERE id=? AND status='issuing'").bind(orderId));
        const result=await env.DB.batch(statements);
        if(!result[0]?.meta?.changes){const fresh=await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first();if(fresh?.status==='issued')return ok({status:'issued',replayed:true,tickets:await getTicketsForOrder(env,orderId,user.uid)});bad('ORDER_CONFLICT',409);}
        await audit(env.DB,order.event_id,user.uid,'SANDBOX_TICKETS_ISSUED',orderId);
        return ok({status:'issued',sandbox:true,tickets:await getTicketsForOrder(env,orderId,user.uid)});
      }
    }
    if(method==='GET' && path==='/api/tickets') {
      const rows=await env.DB.prepare("SELECT t.ticket_number,t.id,t.event_id,t.order_id,t.status,t.token_version,t.used_at,t.created_at FROM tickets t WHERE t.owner_uid=? ORDER BY t.created_at DESC LIMIT 100").bind(user.uid).all();
      return ok({tickets:await Promise.all((rows.results||[]).map(async t=>({...t,token:t.status==='issued'?await createTicketToken(t.id,t.token_version,env.TICKET_SIGNING_SECRET):null})))});
    }
    const transfer=/^\/api\/tickets\/([^/]+)\/transfer$/.exec(path);
    if(method==='POST' && transfer) {
      const ticketId=id(transfer[1]),p=await body(request),toUid=str(p.toUid,128);
      if(toUid===user.uid)bad('INVALID_RECIPIENT');
      const ticket=await env.DB.prepare('SELECT * FROM tickets WHERE id=? AND owner_uid=?').bind(ticketId,user.uid).first();
      if(!ticket)bad('NOT_FOUND',404);
      const changed=await env.DB.prepare("UPDATE tickets SET owner_uid=?, token_version=token_version+1,transfer_count=transfer_count+1 WHERE id=? AND owner_uid=? AND status='issued' AND transfer_count=0").bind(toUid,ticketId,user.uid).run();
      if(!changed.meta?.changes)bad('TRANSFER_DENIED',409);
      await audit(env.DB,ticket.event_id,user.uid,'TICKET_TRANSFERRED',ticketId);
      return ok({transferred:true,oldTokenRevoked:true});
    }
    if(method==='POST' && path==='/api/checkin') {
      const p=await body(request),requestId=id(p.requestId),eventId=id(p.eventId);
      const parsed=parseTicketToken(p.token);if(!parsed)bad('INVALID_TICKET',400);
      if(!await hasRole(env.DB,user.uid,eventId,['organizer','gate']))bad('NO_PERMISSION',403);
      const ticket=await env.DB.prepare('SELECT id,event_id,status,token_version FROM tickets WHERE id=?').bind(parsed.ticketId).first();
      if(!ticket||ticket.event_id!==eventId||!await validateTicketToken(p.token,ticket,env.TICKET_SIGNING_SECRET))bad('INVALID_TICKET',400);
      const previous=await env.DB.prepare('SELECT ticket_id,request_id,fiscal_uid FROM checkins WHERE ticket_id=? OR request_id=?').bind(ticket.id,requestId).first();
      if(previous){if(previous.ticket_id===ticket.id && previous.request_id===requestId && previous.fiscal_uid===user.uid)return ok({result:'OK',replayed:true});bad(previous.request_id===requestId?'REQUEST_ID_REUSED':'ALREADY_USED',409);}
      if(ticket.status!=='issued')bad('TICKET_NOT_VALID',409);
      const t=now();
      const sql=`INSERT OR IGNORE INTO checkins(ticket_id,event_id,fiscal_uid,request_id,created_at)
        SELECT t.id,t.event_id,?,?,? FROM tickets t WHERE t.id=? AND t.event_id=? AND t.token_version=? AND t.status='issued'
        AND EXISTS(SELECT 1 FROM events e WHERE e.id=t.event_id AND e.status='published')
        AND EXISTS(SELECT 1 FROM events e LEFT JOIN event_staff s ON s.event_id=e.id AND s.uid=?
        WHERE e.id=t.event_id AND (e.organizer_uid=? OR s.role='gate'))`;
      const result=await env.DB.batch([
        env.DB.prepare(sql).bind(user.uid,requestId,t,ticket.id,eventId,ticket.token_version,user.uid,user.uid),
        env.DB.prepare("UPDATE tickets SET status='used',used_at=? WHERE id=? AND status='issued' AND EXISTS(SELECT 1 FROM checkins WHERE ticket_id=? AND request_id=?)").bind(t,ticket.id,ticket.id,requestId),
      ]);
      if(!result[0]?.meta?.changes)bad('ALREADY_USED_OR_REVOKED',409);
      return ok({result:'OK',replayed:false,usedAt:t,sandbox:true});
    }
    return ok({error:'NOT_FOUND'},404);
  } catch(error) {return safeError(error);}
}
async function getTicketsForOrder(env,orderId,uid) {
  const rows=await env.DB.prepare('SELECT ticket_number,id,event_id,token_version,status FROM tickets WHERE order_id=? AND owner_uid=? ORDER BY created_at').bind(orderId,uid).all();
  return Promise.all((rows.results||[]).map(async t=>({...t,token: t.status==='issued'?await createTicketToken(t.id,t.token_version,env.TICKET_SIGNING_SECRET):null})));
}
export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/'))return handleApi(request,env);
    if(env.ASSETS)return env.ASSETS.fetch(request);
    return new Response('RFBTicket API (sem ativos configurados)',{status:404});
  }
};
