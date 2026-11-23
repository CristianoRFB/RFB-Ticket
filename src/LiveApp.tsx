import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { api, displayDate, money, type TicketEvent, type Lot, type Order, type Ticket, type EventDetail, type EventStats } from './api';
import QR from './QR';

type Tab='explorar'|'pedidos'|'ingressos'|'portaria'|'organizador'|'admin';
type Report = {stats:EventStats;financials:string};
function errorText(e: unknown) {return e instanceof Error ? e.message : 'Erro inesperado';}
function AuthPanel({onDone}:{onDone:()=>void}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:FormEvent) {e.preventDefault();if(!firebaseAuth)return;setBusy(true);setMessage('');try{
    if(creating)await createUserWithEmailAndPassword(firebaseAuth,email,password);else await signInWithEmailAndPassword(firebaseAuth,email,password);
    onDone();
  }catch(err){setMessage(errorText(err));}finally{setBusy(false);}}
  return <form className="auth-form" onSubmit={submit}>
    <h2>{creating?'Criar conta de teste':'Entrar no sandbox'}</h2>
    <p>Identidade via Firebase Authentication. Nenhum pagamento real será processado.</p>
    <label>E-mail <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
    <label>Senha <input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete={creating?'new-password':'current-password'}/></label>
    {message && <p className="live-feedback" role="alert">{message}</p>}
    <button type="submit" disabled={busy}>{busy?'Processando...':creating?'Criar conta':'Entrar'}</button>
    <button type="button" className="live-link" onClick={()=>setCreating(!creating)}>{creating?'Já tenho conta':'Cadastrar conta de teste'}</button>
  </form>;
}
function GateScanner({onScan}:{onScan:(token:string)=>Promise<boolean>}) {
  const videoRef=useRef<HTMLVideoElement>(null),running=useRef(false);
  const [message,setMessage]=useState(''),[open,setOpen]=useState(false);
  const lastScan=useRef<{value:string;time:number}>({value:'',time:0});
  useEffect(()=>{
    if(!open)return;
    let stream:MediaStream|undefined,interval:ReturnType<typeof setInterval>|undefined,cancelled=false;
    const Detector=(window as unknown as { BarcodeDetector?:new (config:{formats:string[]})=>{detect:(v:HTMLVideoElement)=>Promise<Array<{rawValue:string}>>} }).BarcodeDetector;
    if(!Detector){setMessage('Leitura automática não disponível neste navegador. Use o código manual.');return;}
    if(!navigator.mediaDevices?.getUserMedia){setMessage('Câmera indisponível neste navegador. Use o código manual.');return;}
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(async media=>{
      if(cancelled){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;
      const video=videoRef.current;if(!video)return;video.srcObject=media;
      await video.play();const detector=new Detector({formats:['qr_code']});
      interval=setInterval(async()=>{if(running.current||!video||video.readyState<2)return;running.current=true;
        try {const codes=await detector.detect(video);const raw=codes[0]?.rawValue;
          if(raw && (raw!==lastScan.current.value || Date.now()-lastScan.current.time>5000)){
            lastScan.current={value:raw,time:Date.now()};
            if(await onScan(raw))setOpen(false);
          }}
        catch(e){setMessage(errorText(e));}finally{running.current=false;}
      },450);
    }).catch(e=>setMessage('Acesso à câmera negado: '+errorText(e)));
    return()=>{cancelled=true;if(interval)clearInterval(interval);stream?.getTracks().forEach(t=>t.stop());};
  },[open,onScan]);
  return <div className="scanner-box">
    <button type="button" className="live-secondary" onClick={()=>{setMessage('');setOpen(!open);}}>{open?'Desativar câmera':'Ler QR pela câmera'}</button>
    {open && <video ref={videoRef} muted playsInline aria-label="Leitor QR da portaria" style={{maxWidth:'100%',width:330,background:'#060816'}}/>}
    {message && <p role="status">{message}</p>}
  </div>;
}
export default function LiveApp() {
  const [user,setUser]=useState<User|null>(firebaseAuth?.currentUser??null);
  const [tab,setTab]=useState<Tab>('explorar'),[events,setEvents]=useState<TicketEvent[]>([]),[detail,setDetail]=useState<EventDetail|null>(null);
  const [managed,setManaged]=useState<TicketEvent[]>([]),[manageId,setManageId]=useState(''),[manageDetail,setManageDetail]=useState<EventDetail|null>(null);
  const [orders,setOrders]=useState<Order[]>([]),[tickets,setTickets]=useState<Ticket[]>([]),[report,setReport]=useState<Report|null>(null);
  const [quantity,setQuantity]=useState(1),[lotId,setLotId]=useState(''),[token,setToken]=useState(''),[scanEvent,setScanEvent]=useState('');
  const [isAdmin,setIsAdmin]=useState(false),[adminReport,setAdminReport]=useState<{total_events:number;published_events:number;total_lots:number;sandbox_orders:number;issued_tickets:number;completed_checkins:number}|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[newEventTitle,setNewEventTitle]=useState(''),[newEventCity,setNewEventCity]=useState(''),[newEventDate,setNewEventDate]=useState('');
  const [newLotLabel,setNewLotLabel]=useState(''),[newLotCapacity,setNewLotCapacity]=useState(40),[newLotPrice,setNewLotPrice]=useState(2500),[staffUid,setStaffUid]=useState(''),[transferTarget,setTransferTarget]=useState<Record<string,string>>({});
  const [editTitle,setEditTitle]=useState(''),[editCity,setEditCity]=useState(''),[editDescription,setEditDescription]=useState(''),[editDate,setEditDate]=useState('');
  const userRef=useRef<User|null>(user);userRef.current=user;
  useEffect(()=>firebaseAuth ? onAuthStateChanged(firebaseAuth,u=>{setUser(u);setMessage('');}) : undefined,[]);
  async function refresh(activeUser:User|null=userRef.current){
    const publicData=await api<{events:TicketEvent[]}>('/api/events',null);
    setEvents(publicData.events);
    if(activeUser){const [mine,ts,orgs,identity]=await Promise.all([
      api<{orders:Order[]}>('/api/orders',activeUser),api<{tickets:Ticket[]}>('/api/tickets',activeUser),api<{events:TicketEvent[]}>('/api/manage/events',activeUser),api<{isAdmin:boolean}>('/api/me',activeUser)]);
      setOrders(mine.orders);setTickets(ts.tickets);setManaged(orgs.events);setIsAdmin(identity.isAdmin===true);
    } else {setOrders([]);setTickets([]);setManaged([]);setIsAdmin(false);setAdminReport(null);}
  }
  useEffect(()=>{refresh(user).catch(e=>setMessage(errorText(e)));},[user]);
  async function run(action:()=>Promise<void>) {setBusy(true);setMessage('');try{await action();}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}
  async function openEvent(id:string) {await run(async()=>{setLotId('');const data=await api<EventDetail>('/api/events/'+id,null);setDetail(data);});}
  async function buy() {if(!user||!lotId)return;await run(async()=>{
    const result=await api<{order:Order}>('/api/orders',user,'POST',{lotId,quantity,requestKey:crypto.randomUUID()});
    setMessage('Reserva sandbox criada. Você pode emitir ingressos simulados na aba Pedidos. Nenhum dinheiro foi cobrado.');
    setTab('pedidos');await refresh();
  });}
  async function orderAction(id:string,operation:'sandbox-confirm'|'cancel'|'refund') {if(!user)return;await run(async()=>{
    await api('/api/orders/'+id+'/'+operation,user,'POST',{});await refresh();
    setMessage(operation==='sandbox-confirm'?'Credenciais sandbox emitidas. Sem pagamento real.':operation==='refund'?'Reembolso fictício registrado. Nenhum dinheiro devolvido.':'Reserva cancelada.');
  });}
  async function transfer(ticketId:string) {if(!user)return;const toUid=transferTarget[ticketId];if(!toUid)return;await run(async()=>{
    await api('/api/tickets/'+ticketId+'/transfer',user,'POST',{toUid});await refresh();setMessage('Ingresso transferido; o QR anterior foi invalidado.');
  });}
  const checkin=useCallback(async (value:string):Promise<boolean>=> {
    if(!user||!scanEvent||!value.trim()){setMessage('Selecione o evento e informe o token.');return false;}
    setBusy(true);setMessage('');
    try {
      const result=await api<{result:string;replayed:boolean}>('/api/checkin',user,'POST',{eventId:scanEvent,token:value.trim(),requestId:crypto.randomUUID()});
      if(result.result!=='OK'){setMessage('ENTRADA RECUSADA (SANDBOX).');return false;}
      setMessage('ENTRADA APROVADA (SANDBOX). Segunda entrada independente será bloqueada.');
      setToken('');
      return true;
    }catch(e){setMessage('ENTRADA BLOQUEADA: '+errorText(e));return false;}
    finally{setBusy(false);}
  },[user,scanEvent]);
  async function reloadManaged(id:string) {
    if(!user)return;
    const d=await api<EventDetail>('/api/manage/events/'+id,user);
    setManageId(id);setManageDetail(d);
    setEditTitle(d.event.title);setEditCity(d.event.city);setEditDescription(d.event.description||'');
    const instant=new Date(d.event.starts_at);
    setEditDate(Number.isNaN(instant.getTime())?'':new Date(instant.getTime()-instant.getTimezoneOffset()*60000).toISOString().slice(0,16));
    // A fiscal is allowed to consult an event but NOT its financial report.
    if(d.event.organizer_uid===user.uid){
      const r=await api<Report>('/api/events/'+id+'/stats',user);
      setReport(r);
    } else setReport(null);
  }
  async function createEvent(e:FormEvent){e.preventDefault();if(!user)return;await run(async()=>{
    const x=await api<{eventId:string}>('/api/events',user,'POST',{title:newEventTitle,city:newEventCity,startsAt:new Date(newEventDate).toISOString(),description:'Evento sandbox criado pelo organizador.'});
    await refresh();await reloadManaged(x.eventId);setNewEventTitle('');setMessage('Evento criado em rascunho. Adicione lotes antes de publicar.');
  });}
  async function addLot(e:FormEvent){e.preventDefault();if(!user||!manageId)return;await run(async()=>{
    await api('/api/events/'+manageId+'/lots',user,'POST',{label:newLotLabel,capacity:newLotCapacity,priceCents:newLotPrice});
    await reloadManaged(manageId);setNewLotLabel('');setMessage('Lote criado no sandbox.');
  });}
  async function doManage(path:string,body:unknown={}) {if(!user||!manageId)return;await run(async()=>{
    await api('/api/events/'+manageId+'/'+path,user,'POST',body);await refresh();await reloadManaged(manageId);setMessage('Operação de organização concluída.');
  });}
  async function downloadCheckins() {if(!user||!manageId)return;await run(async()=>{
    const response=await fetch('/api/events/'+manageId+'/checkins.csv',{
      headers:{Authorization:'Bearer '+await user.getIdToken()},credentials:'omit'
    });
    if(!response.ok)throw new Error('EXPORT_DENIED_'+response.status);
    const blob=await response.blob(),href=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=href;link.download='rfbticket-checkins-'+manageId+'.csv';
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(href),1000);
    setMessage('CSV exportado: apenas números dos ingressos e horários de entrada.');
  });}
  async function saveEvent(e:FormEvent) {e.preventDefault();if(!user||!manageId)return;await run(async()=>{
    await api('/api/events/'+manageId,user,'PATCH',{title:editTitle,city:editCity,
      description:editDescription,startsAt:new Date(editDate).toISOString()});
    await refresh();await reloadManaged(manageId);setMessage('Dados do evento atualizados no sandbox.');
  });}
  async function toggleLot(lot:Lot) {if(!user||!manageId)return;await run(async()=>{
    await api('/api/lots/'+lot.id,user,'PATCH',{status:lot.status==='available'?'paused':'available'});
    await reloadManaged(manageId);setMessage('Status do lote atualizado.');
  });}
  async function revokeGate(uid:string) {if(!user||!manageId)return;await run(async()=>{
    await api('/api/events/'+manageId+'/staff/'+encodeURIComponent(uid),user,'DELETE');
    await reloadManaged(manageId);setMessage('Acesso de fiscal revogado imediatamente.');
  });}
  const [cancelArmed,setCancelArmed]=useState(false);
  const isEventOwner=!!user && !!manageDetail && manageDetail.event.organizer_uid===user.uid;
  const nav:[Tab,string][]=[['explorar','Eventos'],['pedidos','Pedidos'],['ingressos','Meus ingressos'],['portaria','Portaria'],['organizador','Organizador']];
  if(isAdmin)nav.push(['admin','Administração']);
  return <div className="live-shell">
    <header className="live-header"><div><p className="live-kicker">RFB LABS / ACESSO A EVENTOS</p><h1>RFBTicket <span>Sandbox</span></h1><p>Bilheteria de demonstração com validação online. Sem pagamentos reais.</p></div>
      <div className="live-identity">{user?<><span title="UID do Firebase">UID: {user.uid}</span><button type="button" className="live-secondary" onClick={()=>firebaseAuth&&signOut(firebaseAuth)}>Sair</button></>:<span>Visitante — autentique para operar</span>}</div>
    </header>
    {!user && <AuthPanel onDone={()=>setMessage('Autenticação concluída.')}/>}
    <nav className="live-tabs" aria-label="Módulos" role="navigation">{nav.map(([value,label])=><button key={value} type="button" aria-current={tab===value?'page':undefined} onClick={()=>{setTab(value);setMessage('');}}>{label}</button>)}</nav>
    {message && <div role="status" aria-live="polite" className={'live-feedback '+(message.includes('APROVADA')?'approved':'')}>{message}</div>}
    {tab==='explorar' && <main className="live-columns">
      <section className="live-panel"><h2>Eventos disponíveis</h2>{!events.length && <p>Nenhum evento publicado no banco sandbox.</p>}
        {events.map(ev=><button type="button" className="live-option" key={ev.id} onClick={()=>openEvent(ev.id)}><strong>{ev.title}</strong><span>{ev.city} · {displayDate(ev.starts_at)}</span></button>)}
      </section>
      <section className="live-panel"><h2>{detail?detail.event.title:'Escolha um evento'}</h2>{detail?<><p>{detail.event.description}</p><p>{detail.event.city} · {displayDate(detail.event.starts_at)}</p>
        <h3>Lotes</h3>{detail.lots.map(l=><button type="button" className="live-option" key={l.id} aria-pressed={lotId===l.id} disabled={l.status!=='available'||l.available<=0} onClick={()=>setLotId(l.id)}><strong>{l.label} — {money(l.price_cents)}</strong><span>{l.available} vagas · {l.status}</span></button>)}
        <div className="live-actions"><label>Quantidade <select value={quantity} onChange={e=>setQuantity(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button disabled={!user||!lotId||busy} onClick={buy}>Reservar 10 min (sandbox)</button></div>
        {!user&&<p>Entre com uma conta para reservar.</p>}</>:<p>Escolha um evento publicado para ver os ingressos.</p>}</section>
    </main>}
    {tab==='pedidos' && <main className="live-panel"><h2>Meus pedidos</h2>{!user&&<p>Entre para acessar seus pedidos.</p>}{user&&!orders.length&&<p>Você ainda não criou pedidos.</p>}
      {orders.map(o=><div className="live-listitem" key={o.id}><div><strong>Pedido {o.id.slice(0,8)}</strong><span>{o.quantity} ingressos · {money(o.amount_cents)} · {o.status}</span>{o.status==='held'&&<small>Expira em {new Date(o.hold_expires_at*1000).toLocaleString('pt-BR')}</small>}</div>
        <div className="live-actions">{o.status==='held'&&<><button disabled={busy} onClick={()=>orderAction(o.id,'sandbox-confirm')}>Confirmar pagamento fictício</button><button className="live-secondary" disabled={busy} onClick={()=>orderAction(o.id,'cancel')}>Cancelar reserva</button></>}{o.status==='issued'&&<button className="live-secondary" disabled={busy} onClick={()=>orderAction(o.id,'refund')}>Reembolso sandbox</button>}</div></div>)}
    </main>}
    {tab==='ingressos' && <main className="live-panel"><h2>Credenciais sandbox</h2>{!tickets.length&&<p>Nenhum ingresso emitido nesta conta.</p>}
      <div className="live-ticket-grid">{tickets.map(t=><article key={t.id} className="live-ticket"><p className="live-kicker">INGRESSO / {t.status.toUpperCase()}</p><h3>Ingresso #{String(t.ticket_number).padStart(6,'0')}</h3>{t.token?<QR value={t.token}/>:<p>Credencial indisponível: utilizada ou revogada.</p>}
        {t.status==='issued'&&<div className="transfer-form"><label>Transferir para UID Firebase <input placeholder="UID de destino" value={transferTarget[t.id]||''} onChange={e=>setTransferTarget(x=>({...x,[t.id]:e.target.value}))}/></label><button className="live-secondary" disabled={busy} onClick={()=>transfer(t.id)}>Transferir e revogar QR antigo</button></div>}</article>)}</div>
    </main>}
    {tab==='portaria' && <main className="live-panel gate-panel"><h2>Fiscal de entrada — validação online</h2><p>Somente fiscais autorizados pelo organizador podem registrar uma entrada. Acesso não é válido para eventos reais.</p>
      <label>Evento da portaria <select value={scanEvent} onChange={e=>setScanEvent(e.target.value)}><option value="">Selecione</option>{managed.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <GateScanner onScan={checkin}/><form onSubmit={e=>{e.preventDefault();checkin(token);}}><label>Código QR / token manual <textarea rows={3} value={token} onChange={e=>setToken(e.target.value)} placeholder="Cole o código do ingresso sandbox" required/></label><button disabled={!user||!scanEvent||!token||busy} type="submit">Validar entrada</button></form>
      <p className="live-hint">Offline: nunca assumir entrada aprovada. Sem permissão: acesso negado no servidor.</p>
    </main>}
    {tab==='organizador' && <main className="live-columns"><section className="live-panel"><h2>Seus eventos</h2>
      <form className="live-form" onSubmit={createEvent}><h3>Criar evento</h3><label>Título <input required maxLength={140} value={newEventTitle} onChange={e=>setNewEventTitle(e.target.value)}/></label><label>Cidade <input required value={newEventCity} onChange={e=>setNewEventCity(e.target.value)}/></label><label>Data <input required type="datetime-local" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)}/></label><button type="submit" disabled={!user||busy}>Criar rascunho</button></form>
      <h3>Eventos sob sua gestão</h3>{managed.map(e=><button key={e.id} type="button" className="live-option" onClick={()=>run(()=>reloadManaged(e.id))}><strong>{e.title}</strong><span>{e.status}</span></button>)}
    </section><section className="live-panel"><h2>Operação {manageDetail?('— '+manageDetail.event.title):''}</h2>{!manageDetail?<p>Selecione um evento.</p>:<>
      <p>Status: <strong>{manageDetail.event.status}</strong></p>
      {isEventOwner&&manageDetail.event.status!=='cancelled'&&<form className="live-form" onSubmit={saveEvent}>
        <h3>Editar evento</h3>
        <label>Título <input required maxLength={140} value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></label>
        <label>Cidade <input required maxLength={140} value={editCity} onChange={e=>setEditCity(e.target.value)}/></label>
        <label>Data e hora <input required type="datetime-local" value={editDate} onChange={e=>setEditDate(e.target.value)}/></label>
        <label>Descrição <textarea rows={3} maxLength={2000} value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label>
        <button type="submit" disabled={busy||!editDate}>Salvar alterações</button>
      </form>}
      {isEventOwner&&manageDetail.event.status!=='cancelled'&&<form className="live-form" onSubmit={addLot}><h3>Novo lote</h3><label>Nome <input required value={newLotLabel} onChange={e=>setNewLotLabel(e.target.value)}/></label><label>Capacidade <input required type="number" min={1} value={newLotCapacity} onChange={e=>setNewLotCapacity(Number(e.target.value))}/></label><label>Preço fictício (centavos) <input required type="number" min={0} value={newLotPrice} onChange={e=>setNewLotPrice(Number(e.target.value))}/></label><button disabled={busy} type="submit">Criar lote</button></form>}
      <h3>Lotes</h3>{manageDetail.lots.map(l=><div className="live-listitem" key={l.id}><span><strong>{l.label}</strong><small>{l.issued} emitidos · {l.reserved} reservados · limite {l.capacity}</small></span><span>{money(l.price_cents)} · {l.status}</span>{isEventOwner&&manageDetail.event.status!=='cancelled'&&<button type="button" className="live-secondary" disabled={busy} onClick={()=>toggleLot(l)}>{l.status==='available'?'Pausar':'Reativar'}</button>}</div>)}
      {isEventOwner&&manageDetail.event.status==='draft'&&<button disabled={busy||!manageDetail.lots.length} onClick={()=>doManage('publish')}>Publicar evento</button>}
      {isEventOwner&&manageDetail.event.status!=='cancelled'&&<div className="live-actions">
        <button className="live-secondary" type="button" onClick={()=>setCancelArmed(x=>!x)}>{cancelArmed?'Manter evento':'Solicitar cancelamento do evento'}</button>
        {cancelArmed&&<button type="button" disabled={busy} onClick={()=>{setCancelArmed(false);doManage('cancel');}}>Confirmar cancelamento irreversível (sandbox)</button>}
      </div>}
      {isEventOwner&&manageDetail.event.status!=='cancelled'&&<form className="live-form" onSubmit={e=>{e.preventDefault();doManage('staff',{uid:staffUid});}}><h3>Autorizar fiscal</h3><label>UID Firebase do fiscal <input value={staffUid} onChange={e=>setStaffUid(e.target.value)} required/></label><button type="submit" disabled={busy}>Conceder acesso à portaria</button></form>}
      {isEventOwner&&<><h3>Fiscais autorizados</h3>{!manageDetail.staff?.length&&<p>Nenhum fiscal adicionado.</p>}
        {manageDetail.staff?.map(s=><div className="live-listitem" key={s.uid}><span>UID: {s.uid} · {s.role}</span>
          <button type="button" className="live-secondary" disabled={busy} onClick={()=>revokeGate(s.uid)}>Revogar acesso</button></div>)}</>}
      {isEventOwner&&<h3>Relatório do evento</h3>}{report&&<div className="live-metrics"><div><strong>{report.stats.capacity}</strong><span>Capacidade total</span></div><div><strong>{report.stats.issued}</strong><span>Ingressos emitidos</span></div><div><strong>{report.stats.checkins}</strong><span>Entradas validadas</span></div><div><strong>{money(report.stats.sandbox_revenue_cents)}</strong><span>Faturamento simulado</span></div></div>}
      {isEventOwner&&<div className="live-actions">
        <button className="live-secondary" disabled={busy} onClick={()=>run(()=>reloadManaged(manageId))}>Atualizar relatório</button>
        <button className="live-secondary" disabled={busy} onClick={downloadCheckins}>Exportar entradas CSV</button>
      </div>}
      </>}
    </section></main>}
    {tab==='admin' && isAdmin && <main className="live-panel"><h2>Administração — leitura restrita</h2>
      <p>Relatório agregado de todos os eventos sandbox. A concessão de administrador é configurada no backend, nunca na interface.</p>
      <button type="button" disabled={busy||!user} onClick={()=>run(async()=>{if(!user)return;const x=await api<{stats:NonNullable<typeof adminReport>}>('/api/admin/summary',user);setAdminReport(x.stats);})}>Atualizar visão administrativa</button>
      {adminReport&&<div className="live-metrics"><div><strong>{adminReport.total_events}</strong><span>Eventos no sandbox</span></div>
      <div><strong>{adminReport.published_events}</strong><span>Eventos publicados</span></div>
      <div><strong>{adminReport.total_lots}</strong><span>Lotes cadastrados</span></div>
      <div><strong>{adminReport.sandbox_orders}</strong><span>Pedidos fictícios</span></div>
      <div><strong>{adminReport.issued_tickets}</strong><span>Ingressos emitidos</span></div>
      <div><strong>{adminReport.completed_checkins}</strong><span>Entradas demonstrativas</span></div></div>}
    </main>}
    <footer className="live-footer">RFB Method — sandbox sem valor financeiro, sem cobrança, sem ingresso para eventos reais.</footer>
  </div>;
}
