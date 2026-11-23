/** Synthetic RFB-Ticket domain. No real inventory, payment or security boundary. */
export type EventStatus = 'published' | 'draft' | 'cancelled';
export type LotStatus = 'available' | 'paused';

export interface EventRecord {
  id: string;
  organizerId: string;
  title: string;
  city: string;
  startsAt: string;
  status: EventStatus;
  description: string;
}

export interface LotRecord {
  id: string;
  eventId: string;
  label: string;
  capacity: number;
  issued: number;
  held: number;
  status: LotStatus;
  priceCents: number;
}

export type ReservationResult =
  | { ok: true; remaining: number; quantity: number }
  | { ok: false; code: 'UNAVAILABLE_EVENT' | 'WRONG_EVENT' | 'PAUSED' | 'INVALID_QUANTITY' | 'SOLD_OUT'; message: string };

export function publishedEvents(events: readonly EventRecord[]): EventRecord[] {
  return events.filter((event) => event.status === 'published');
}

export function remainingSeats(lot: LotRecord, extraHeld = 0): number {
  if (!Number.isSafeInteger(lot.capacity) || !Number.isSafeInteger(lot.issued) ||
      !Number.isSafeInteger(lot.held) || !Number.isSafeInteger(extraHeld) ||
      lot.capacity < 0 || lot.issued < 0 || lot.held < 0 || extraHeld < 0) {
    return 0;
  }
  return Math.max(0, lot.capacity - lot.issued - lot.held - extraHeld);
}

/**
 * Performs only a client-side rehearsal. The output MUST NOT be used for stock,
 * purchases or entry admission; a backend transaction is required for these.
 */
export function simulateLotReservation(
  event: EventRecord,
  lot: LotRecord,
  quantity: number,
  extraHeld = 0,
): ReservationResult {
  if (event.status !== 'published') return { ok: false, code: 'UNAVAILABLE_EVENT', message: 'Este evento não está publicado.' };
  if (lot.eventId !== event.id) return { ok: false, code: 'WRONG_EVENT', message: 'O lote não pertence a este evento.' };
  if (lot.status !== 'available') return { ok: false, code: 'PAUSED', message: 'Este lote está indisponível.' };
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 4) {
    return { ok: false, code: 'INVALID_QUANTITY', message: 'Escolha de 1 a 4 ingressos.' };
  }
  const remaining = remainingSeats(lot, extraHeld);
  if (quantity > remaining) return { ok: false, code: 'SOLD_OUT', message: 'Não há vagas suficientes nesta simulação.' };
  return { ok: true, quantity, remaining: remaining - quantity };
}
