import { useState, type CSSProperties } from 'react';
import product from './product.json';
import { demoEvents, demoLots } from './demoEvents';
import { publishedEvents, remainingSeats, simulateLotReservation } from './ticketDomain';

const events = publishedEvents(demoEvents);
const formatMoney = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default function App() {
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [held, setHeld] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const event = events.find((entry) => entry.id === eventId);
  const lots = event ? demoLots.filter((entry) => entry.eventId === event.id) : [];
  const lot = lots.find((entry) => entry.id === lotId);
  const totalSimulated = Object.values(held).reduce((sum, count) => sum + count, 0);

  function chooseEvent(id: string) {
    setEventId(id);
    setLotId('');
    setQuantity(1);
    setMessage('');
  }

  function reserve() {
    if (!event || !lot) { setMessage('Selecione um evento e um lote para continuar.'); return; }
    const result = simulateLotReservation(event, lot, quantity, held[lot.id] ?? 0);
    if (!result.ok) { setMessage(result.message); return; }
    setHeld((previous) => ({ ...previous, [lot.id]: (previous[lot.id] ?? 0) + result.quantity }));
    setMessage(result.quantity + ' ingresso(s) reservado(s) somente nesta demonstração local. Nenhuma vaga real foi bloqueada.');
  }

  function resetSimulation() {
    setHeld({});
    setMessage('Simulação zerada. Nenhum ingresso real foi alterado.');
  }

  return <div className="shell" style={{ '--accent': product.accent } as CSSProperties}>
    <a className="skip" href="#conteudo">Pular para o conteúdo</a>
    <header className="topbar">
      <a className="brand" href="#conteudo" aria-label="RFBTicket, início">RFB<span>Ticket</span></a>
      <span className="status">RFB LABS <span aria-hidden="true">·</span> DEMONSTRAÇÃO LOCAL G2</span>
    </header>
    <main id="conteudo">
      <section className="hero" aria-labelledby="headline">
        <div>
          <p className="eyebrow">Ingresso, evento, acesso</p>
          <h1 id="headline">Da venda ao <em>check-in</em> sem filas.</h1>
          <p className="lead">Explore eventos fictícios e experimente a seleção de lotes com limites de capacidade.</p>
        </div>
        <aside className="notice" aria-label="Limitações da demonstração">
          <strong>Ambiente de demonstração</strong>
          <p>Os eventos e preços são inventados. A reserva vale apenas nesta aba: não há login, pagamento, QR, persistência compartilhada nem check-in seguro.</p>
        </aside>
      </section>
      <section className="workspace" aria-labelledby="eventos-heading">
        <div className="section-heading">
          <div><p className="eyebrow">01 — Explore</p><h2 id="eventos-heading">Escolha seu evento</h2></div>
          <span className="count">{events.length} eventos fictícios</span>
        </div>
        {events.length === 0 ? <p role="status">Nenhum evento de demonstração publicado.</p> :
          <div className="event-grid">
            {events.map((entry, index) => <button key={entry.id} type="button"
              className={'event-card ' + (eventId === entry.id ? 'selected' : '')}
              aria-pressed={eventId === entry.id} onClick={() => chooseEvent(entry.id)}>
              <span className={'event-art art-' + (index % 2)} aria-hidden="true"><span>{index === 0 ? 'A' : 'H'}</span></span>
              <span className="event-body"><span className="event-meta">{entry.city} <span aria-hidden="true">•</span> {new Date(entry.startsAt).toLocaleDateString('pt-BR')}</span>
              <strong>{entry.title}</strong><span className="event-description">{entry.description}</span>
              <span className="event-link">{eventId === entry.id ? 'Selecionado ✓' : 'Selecionar evento'}</span></span>
            </button>)}
          </div>}
      </section>
      <section className="workspace" aria-labelledby="lotes-heading">
        <div className="section-heading">
          <div><p className="eyebrow">02 — Escolha</p><h2 id="lotes-heading">Lotes e disponibilidade</h2></div>
          {event && <span className="count">{event.title}</span>}
        </div>
        {lots.length === 0 ? <p>Não há lotes disponíveis para este evento.</p> :
          <div className="lot-list">
            {lots.map((entry) => {
              const remaining = remainingSeats(entry, held[entry.id] ?? 0);
              const disabled = remaining === 0 || entry.status !== 'available';
              return <button type="button" key={entry.id} className={'lot-row ' + (lotId === entry.id ? 'selected' : '')}
                aria-pressed={lotId === entry.id} disabled={disabled} onClick={() => { setLotId(entry.id); setMessage(''); }}>
                <span className="lot-name"><strong>{entry.label}</strong><small>{entry.status === 'paused' ? 'Lote pausado' : remaining === 0 ? 'Esgotado' : remaining + ' vagas demonstrativas'}</small></span>
                <span className="lot-price">{formatMoney(entry.priceCents)} <small>{disabled ? 'Indisponível' : lotId === entry.id ? 'Selecionado' : 'Escolher'}</small></span>
              </button>;
            })}
          </div>}
        <div className="reservation-panel">
          <div>
            <label htmlFor="quantidade">Quantidade demonstrativa</label>
            <select id="quantidade" value={quantity} onChange={(e) => { setQuantity(Number(e.target.value)); setMessage(''); }}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} ingresso{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="reservation-action">
            <span>Total fictício: <strong>{lot ? formatMoney(lot.priceCents * quantity) : '—'}</strong></span>
            <button type="button" onClick={reserve} disabled={!lot}>Simular reserva</button>
          </div>
        </div>
        {message && <p className="feedback" role="status" aria-live="polite">{message}</p>}
        <div className="simulation-footer"><span>{totalSimulated} ingresso(s) simulados nesta aba, sem validade real</span><button type="button" className="link-button" onClick={resetSimulation}>Reiniciar simulação</button></div>
      </section>
      <section className="next-steps" aria-labelledby="roadmap-heading">
        <div><p className="eyebrow">03 — Próximas entregas</p><h2 id="roadmap-heading">Do protótipo ao acesso seguro</h2></div>
        <p>Pagamento sandbox, emissão após confirmação confiável e check-in atômico permanecem <strong>não implementados</strong>. A reserva desta página não representa estoque compartilhado.</p>
      </section>
    </main>
    <footer className="footer">RFB Method · F01/F02 demonstrativos · Dados 100% sintéticos · Sem publicação</footer>
  </div>;
}
