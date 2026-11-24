# RFBTicket — da venda ao check-in sem filas

<!-- RFB-PORTFOLIO-README-V1 -->
<div align="center">
  <img src="public/brand/logo.svg" alt="Logo conceitual do RFBTicket" width="440"/>
  
  **Da venda ao check-in sem filas**
  
  <sub>Sandbox técnico em PR draft, não homologado</sub>
</div>

> **Portfólio RFB Labs.** Este projeto valoriza arquitetura, fluxos e evidência técnica real. O logo ainda é um conceito e os recursos a seguir têm o estágio detalhado na documentação. Não confundir sandbox/emulador com produção.

**Status: PR DRAFT / sandbox técnico local. Não é bilheteria em produção.**

Sistema de ingressos experimentais para eventos, com React/Vite, identidade Firebase, Cloudflare Worker e D1 transacional. Possui demonstração local sem backend e um modo sandbox autenticado que depende de infraestrutura de teste ainda NÃO provisionada. Nenhuma venda ou reembolso real.

## Módulos implementados em código (não homologados)

- Eventos: catálogo público, detalhes, criação em rascunho e publicação pelo dono do evento.
- Lotes: capacidade, status de pausa e catálogo de preços fictícios; saldo computado em servidor.
- Pedidos: reserva atômica de 10 min, idempotência por comprador e liberação sob expiração por consulta; não há job automático de expiração.
- Checkout: confirmação *fake sandbox* por comprador e receptor adicional de webhook HMAC assinado por um **provedor fictício**, nunca webhook financeiro real.
- Ingressos: emissão HMAC verificável, numeração global sequencial (no banco sandbox), QR SVG (frontend), visualização privada e transferência uma vez com revogação de QR anterior.
- Portaria: QR por câmera quando suportado, fallback manual, fiscal autorizado por evento e uso único com UNIQUE em D1.
- Relatórios: capacidade, ingressos emitidos, check-ins e receita fictícia; trilha simples de auditoria.
- Administração: visão agregada apenas de leitura, protegida por UID pré-configurado no Worker; negada por padrão.
- Reembolso: operação interna fictícia, bloqueia após check-in/transferência, não devolve dinheiro.

## Rodar localmente

```sh
npm install
npm run test:domain
npm run test:api
npm run typecheck
npm run test
npm run build
npm run dev
```

**Testes realmente executados no executor local:** API SQLite nativo de Node 22 (11 cenários PASS), sintaxe de Worker e JSX via transpilação TypeScript. Build Vite, typecheck global e Playwright da demonstração: PASS no GitHub Actions; execução de Firebase/Cloudflare reais: NOT_RUN.

O modo demonstração é ativado sem Firebase. Para testar integração, configurar `.env.local` e banco isolado (ver [Deploy sandbox](docs/DEPLOY-SANDBOX.md)). Não configurar cobrança, gateway ou production account.

## Segurança

Nenhum JWT de sessão é aceito sem verificar RS256, issuer, audience e validade. A API protege objetos por uid/evento e os QR por HMAC com segredo exclusivo do Worker. Segredos e tokens pessoais não devem entrar no Git. Firebase Auth e infra REAL ainda não foram testados nem homologados. Falta rate limiting e auditoria independente; não lançar publicamente.

## Rastreamento

[Requisitos originais](docs/ESPECIFICACAO-RFB.txt) · [Starter Pack](docs/STARTER-PACK.md) · [Roteiro](docs/ROADMAP.md) · [Dados e checks](docs/ADR-002-D1-TRANSACTIONS.md) · [QA](docs/QA-REPORT-2026-11-22-S002.md) · [Checkpoint](PROJECT_STATUS.json)

## CI proposta

`.github/workflows/ci.yml` executa testes locais de API e domínio e, quando as dependências forem resolvidas, typecheck, Vitest e build. O workflow foi escrito, mas resultados remotos só podem ser relatados depois de verificar os checks da SHA real do PR.

Node >=24.12 é o requisito adotado pelo projeto para o Firebase 13 atual. O CLI `cf` requer pelo menos 22.18. O ambiente local de testes da API tinha Node 22.16; GitHub Actions valida a stack com Node 24. Para backend + frontend no mesmo Worker, usar `npm run dev:sandbox` com D1 de teste configurado; `npm run dev` continua servindo Vite (integrado pelo plugin quando instalado).


## Atualização S008 (23/11/2026)

A branch Draft agora possui controle de expiração de reservas, limite atômico de cinco holds por UID, revogação de fiscais, edição de evento, cancelamento de evento sem checkins, refund fake devolvendo capacidade, relatórios CSV sem PII e scanner que mantém a câmera aberta após recusa.

**CI validada:** 17 testes API SQLite, 8 Workerd + D1 local (incluindo corrida de checkout/check-in), 5 testes domínio, 2 Vitest, 6 Playwright (demo); typecheck/build e `cf deploy --dry-run` PASS. [Run 45178640841](https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45178640841).

`npm run test:workerd` verifica o Worker e D1 em ambiente local isolado com Firebase JWTs de teste assinados. **Não** prova Firebase, D1 ou pagamentos reais. Leia [Matriz de aceite](docs/ACCEPTANCE-MATRIX.md), [QA S008](docs/QA-REPORT-2026-11-23-S008.md) e [checkpoint](PROJECT_STATUS.json).

**Sem deploy, merge, cobrança ou criação de recursos persistentes.**


### S009 — escopo efetivamente testado

[Workerd+D1: 10 testes PASS (run 45179829134)](https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45179829134), incluindo transferência uma vez, QR antigo revogado e administração somente-leitura por UID do servidor. [Diagramas conforme código](docs/AS-BUILT-DIAGRAMS.md) e [cobertura T001–T058](docs/UX-DESIGN-AND-QA.md) atualizados. Ainda sem Firebase remoto, gateway financeiro real, produção e câmera homologada.

## Galeria visual do produto

Capturas reais serão adicionadas após QA desktop/mobile em staging local com dados sintéticos. Os quatro quadros abaixo estão **pendentes**, não são imagens do aplicativo publicado.

| Experiência a documentar | Captura |
|---|---|
| 1. Catálogo de eventos | Pendente de captura verificável |
| 2. Evento e lotes | Pendente de captura verificável |
| 3. Ingresso QR sandbox | Pendente de captura verificável |
| 4. Validação da portaria | Pendente de captura verificável |

[Manifesto de capturas e evidências](docs/screenshots/manifest.json). Nenhuma imagem artificial deve ser apresentada como screenshot funcional.

---

<div align="center">
  <img src="public/brand/assinatura-rfb.svg" width="70" alt="Assinatura institucional RFB"/>
  
  <sub>Desenvolvido por RFB · assinatura do criador, independente da marca do aplicativo.</sub>
</div>
