# RFBTicket — RFB Labs

> **Demonstração de eventos e lotes com dados sintéticos; NÃO é bilheteria real.** PR #1 draft, não publicado. Não há backend, login, pagamento, checkout, QR antifraude ou check-in real.

**Slogan:** Da venda ao check-in sem filas.

## Escopo presente no PR draft

- Catálogo local de dois eventos fictícios; seleção e detalhes.
- Lotes com capacidade/ocupação exemplificativas, indisponibilidade, quantidade 1–4 e preços fictícios.
- Simulação de reserva apenas em memória, sem validade fora da aba. Nenhum estoque real é bloqueado.
- Lógica de domínio F01/F02 com cinco testes negativos/positivos executados localmente em Node 22.
- Matriz de requisitos, 58 telas previstas, sete diagramas iniciais e plano de check-in transacional, todos sem backend aprovado.

## Executar localmente

Requer Node.js compatível, npm e acesso às dependências do package.json. Os comandos abaixo NÃO foram executados integralmente nesta sessão por indisponibilidade de instalação:

~~~sh
npm install
npm run test:domain
npm run typecheck
npm run test
npm run build
npm run dev
~~~

Apenas o teste nativo do domínio (5/5) e typecheck de arquivos de domínio isolados foram efetivamente executados com ferramentas instaladas, sem executar Vite/React. Ver docs/QA-REPORT-2026-11-22.md.

## Documentação

- [Especificação original](docs/ESPECIFICACAO-RFB.txt)
- [Starter Pack](docs/STARTER-PACK.md) — blueprint histórico, pode conter status antigo
- [Diagramas](docs/DIAGRAMAS.md) — sete propostas editáveis
- [UX e catálogo de 58 telas](docs/UX-DESIGN-AND-QA.md)
- [Roadmap histórico](docs/ROADMAP.md)
- [Arquitetura transacional proposta](docs/TRANSACTIONAL-CHECKIN-PLAN.md)
- [QA executado e pendente](docs/QA-REPORT-2026-11-22.md)
- [Estado canônico](PROJECT_STATUS.json), [progresso](docs/rfb/PROGRESS.md), [handoff](docs/HANDOFF.md)

Meta de custo recorrente adicional R$0 dentro de limites gratuitos e sem cobrança autorizada; taxas por venda e serviços externos não estão incluídos. Firebase/Cloudflare permanecem NÃO CONECTADOS/NÃO IMPLANTADOS.
