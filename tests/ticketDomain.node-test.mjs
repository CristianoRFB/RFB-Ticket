import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedEvents, remainingSeats, simulateLotReservation } from '../src/ticketDomain.ts';

const event = { id: 'event-a', organizerId: 'tenant-a', title: 'Evento', city: 'Fictícia', startsAt: '', status: 'published', description: '' };
const lot = { id: 'lot-a', eventId: 'event-a', label: 'Primeiro lote', capacity: 10, issued: 5, held: 2, status: 'available', priceCents: 0 };

test('F01: catálogo público ignora rascunhos e cancelados', () => {
  assert.deepEqual(publishedEvents([event, { ...event, id: 'b', status: 'draft' }, { ...event, id: 'c', status: 'cancelled' }]).map(x => x.id), ['event-a']);
});
test('F02: estoque disponível desconta emitidos, reservas e simulações da sessão', () => {
  assert.equal(remainingSeats(lot), 3);
  assert.equal(remainingSeats(lot, 2), 1);
  assert.equal(remainingSeats({ ...lot, capacity: -1 }), 0);
  assert.equal(remainingSeats({ ...lot, capacity: 2 }), 0);
});
test('F02: reserva sintética permite quantidades válidas até o limite', () => {
  assert.deepEqual(simulateLotReservation(event, lot, 3), { ok: true, quantity: 3, remaining: 0 });
  assert.equal(simulateLotReservation(event, lot, 2, 2).code, 'SOLD_OUT');
});
test('F02: não aceita quantidade inválida, lote esgotado ou pausa', () => {
  assert.equal(simulateLotReservation(event, lot, 0).code, 'INVALID_QUANTITY');
  assert.equal(simulateLotReservation(event, lot, 1.5).code, 'INVALID_QUANTITY');
  assert.equal(simulateLotReservation(event, lot, 5).code, 'INVALID_QUANTITY');
  assert.equal(simulateLotReservation(event, { ...lot, status: 'paused' }, 1).code, 'PAUSED');
  assert.equal(simulateLotReservation(event, { ...lot, issued: 10 }, 1).code, 'SOLD_OUT');
});
test('F02/AV-03: não cruza lote de outro evento e não exibe reserva de evento inativo', () => {
  assert.equal(simulateLotReservation({ ...event, id: 'event-b' }, lot, 1).code, 'WRONG_EVENT');
  assert.equal(simulateLotReservation({ ...event, status: 'cancelled' }, lot, 1).code, 'UNAVAILABLE_EVENT');
});
