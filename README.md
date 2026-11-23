# RFBTicket — da venda ao check-in sem filas

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

**Testes realmente executados no executor local:** API SQLite nativo de Node 22 (10 cenários PASS), sintaxe de Worker e JSX via transpilação TypeScript. Build Vite, typecheck global e Playwright da demonstração: PASS no GitHub Actions; execução de Firebase/Cloudflare reais: NOT_RUN.

O modo demonstração é ativado sem Firebase. Para testar integração, configurar `.env.local` e banco isolado (ver [Deploy sandbox](docs/DEPLOY-SANDBOX.md)). Não configurar cobrança, gateway ou production account.

## Segurança

Nenhum JWT de sessão é aceito sem verificar RS256, issuer, audience e validade. A API protege objetos por uid/evento e os QR por HMAC com segredo exclusivo do Worker. Segredos e tokens pessoais não devem entrar no Git. Firebase Auth e infra REAL ainda não foram testados nem homologados. Falta rate limiting e auditoria independente; não lançar publicamente.

## Rastreamento

[Requisitos originais](docs/ESPECIFICACAO-RFB.txt) · [Starter Pack](docs/STARTER-PACK.md) · [Roteiro](docs/ROADMAP.md) · [Dados e checks](docs/ADR-002-D1-TRANSACTIONS.md) · [QA](docs/QA-REPORT-2026-11-22-S002.md) · [Checkpoint](PROJECT_STATUS.json)

## CI proposta

`.github/workflows/ci.yml` executa testes locais de API e domínio e, quando as dependências forem resolvidas, typecheck, Vitest e build. O workflow foi escrito, mas resultados remotos só podem ser relatados depois de verificar os checks da SHA real do PR.

Node >=24.12 é o requisito adotado pelo projeto para o Firebase 13 atual. O CLI `cf` requer pelo menos 22.18. O ambiente local de testes da API tinha Node 22.16; GitHub Actions valida a stack com Node 24. Para backend + frontend no mesmo Worker, usar `npm run dev:sandbox` com D1 de teste configurado; `npm run dev` continua servindo Vite (integrado pelo plugin quando instalado).
