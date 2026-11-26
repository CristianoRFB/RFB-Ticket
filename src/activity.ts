/** Read-only in-app status feed derived exclusively from the signed-in user's own API data.
 * Not push notifications, messages, background tracking or a persistent inbox. */
export type ActivityOrder={id:string;status:string;quantity:number;created_at?:number};
export type ActivityTicket={id:string;ticket_number:number;status:string;created_at?:number;used_at?:number|null;token?:string|null};
export type ActivityRow={id:string;title:string;detail:string;createdAt:number};
const orderStatus:Record<string,string>={
 held:'Reserva ativa (10 min)',issued:'Ingressos de demonstração emitidos',
 expired:'Reserva expirada',cancelled:'Reserva cancelada',refunded:'Reembolso fictício'
};
const ticketStatus:Record<string,string>={
 issued:'QR disponível',used:'Entrada registrada',revoked:'QR revogado'
};
export function recentActivity(orders:ActivityOrder[],tickets:ActivityTicket[]):ActivityRow[]{
  const orderRows=orders.map(o=>({
    id:'order:'+o.id,title:'Pedido '+o.id.slice(0,8),detail:orderStatus[o.status]||'Status atualizado',
    createdAt:Number.isSafeInteger(o.created_at)?(o.created_at||0):0
  }));
  const ticketRows=tickets.map(t=>({
    id:'ticket:'+t.id,title:'Ingresso #'+String(t.ticket_number).padStart(6,'0'),
    detail:ticketStatus[t.status]||'Status atualizado',
    createdAt:Number.isSafeInteger(t.used_at)?(t.used_at||0):(Number.isSafeInteger(t.created_at)?(t.created_at||0):0)
  }));
  return [...orderRows,...ticketRows].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id)).slice(0,100);
}
