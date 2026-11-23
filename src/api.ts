import type { User } from 'firebase/auth';

export interface TicketEvent { id: string; title: string; description: string; city: string; starts_at: string; status: string; organizer_uid?: string; }
export interface Lot { id: string; event_id?: string; label: string; capacity: number; reserved: number; issued: number; price_cents: number; status: string; available: number; }
export interface Order { id: string; event_id: string; lot_id: string; status: string; quantity: number; amount_cents: number; hold_expires_at: number; }
export interface Ticket { id: string; event_id: string; order_id?: string; status: string; token_version: number; token: string|null; used_at?: number|null; }
export interface EventDetail {event: TicketEvent; lots: Lot[]; staff?: Array<{uid:string;role:string}>;}
export interface EventStats {capacity:number;issued:number;checkins:number;sandbox_revenue_cents:number;}
export type ApiReply<T> = T & {error?: string};

export async function api<T>(path: string, user: User|null, method='GET', body?: unknown): Promise<T> {
  const headers: Record<string,string> = {};
  if (user) headers.Authorization = 'Bearer ' + await user.getIdToken();
  if (body !== undefined) headers['Content-Type']='application/json';
  const response=await fetch(path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit'});
  const data=await response.json() as ApiReply<T>;
  if(!response.ok)throw new Error(data.error||'HTTP_'+response.status);
  return data;
}
export const money=(cents: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const displayDate=(value: string) => {const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString('pt-BR');};
