import type { EventRecord, LotRecord } from './ticketDomain';

/** Fake fixtures, unrelated to any published real-world event. */
export const demoEvents: EventRecord[] = [
  { id: 'ev-demo-01', organizerId: 'org-demo-a', title: 'Noite Aurora', city: 'Cidade fictícia', startsAt: '2027-05-15T19:00:00', status: 'published', description: 'Evento fictício para testar a escolha de ingressos.' },
  { id: 'ev-demo-02', organizerId: 'org-demo-b', title: 'Festival Horizonte', city: 'Cidade fictícia', startsAt: '2027-07-20T14:00:00', status: 'published', description: 'Outra edição fictícia, com lotes e organizador próprios.' },
];

export const demoLots: LotRecord[] = [
  { id: 'lot-demo-a1', eventId: 'ev-demo-01', label: 'Pista — Lote 1', capacity: 40, issued: 14, held: 2, status: 'available', priceCents: 4500 },
  { id: 'lot-demo-a2', eventId: 'ev-demo-01', label: 'Área especial', capacity: 5, issued: 5, held: 0, status: 'available', priceCents: 9900 },
  { id: 'lot-demo-b1', eventId: 'ev-demo-02', label: 'Entrada geral', capacity: 60, issued: 8, held: 0, status: 'available', priceCents: 3000 },
  { id: 'lot-demo-b2', eventId: 'ev-demo-02', label: 'Meia-entrada (simulação)', capacity: 12, issued: 0, held: 0, status: 'paused', priceCents: 1500 },
];
