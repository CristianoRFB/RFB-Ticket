# HANDOFF — RFBTicket / continuação do RFB Method

Data: 22/11/2026 BRT. Repositório exclusivo `CristianoRFB/RFB-Ticket`. PR de trabalho: https://github.com/CristianoRFB/RFB-Ticket/pull/1 (DRAFT). Branch: `feature/rfb-starter-pack-v1`. `main` não alterada.

**Último commit de código confirmado antes deste checkpoint:** `40737f84cc23c6c0dbb355eb8e8ea75e63c3c6a1`; ressincronize HEAD antes de novos writes. `PROJECT_STATUS.json` é o estado canônico. `docs/ACCEPTANCE-MATRIX.md` detalha 12 funcionalidades e lacunas.

Implementado em código: eventos/lotes, reserva SQL transacional, buyer idempotency, fake checkout, emissão de tickets HMAC, scanner/permissões, dupla entrada impedida por UNIQUE D1, tickets de propriedade do comprador, transferência uma vez, reembolso sandbox, logs simples e métricas. UI React inclui navegação de comprador, organizador e fiscal. Roteamento Cloudflare cf + D1 preparado, sem recursos reais provisionados. Nenhuma chamada de pagamento verdadeiro.

**Provas:** backend Node SQLite 8/8 PASS, domínio Node 5/5 PASS, CI Vite/TS/Vitest/build 4/4 PASS no commit `6a6f...`, Playwright Chromium desktop/mobile 6/6 PASS e CI mais recente `40737...` 6/6 PASS. Node 24 update será verificado em novo CI. Testes Firebase/Cloudflare reais = NOT_RUN.

**Pendências P0/P1:** conexão Firebase Auth em ambiente isolado, DB D1 de teste, validação concorrente real/2 aparelhos, rate limits, logs de abuso, revogação, replay webhook sandbox, numeração amigável de ingresso, mobile QA real, 58 T-IDs, políticas de dados e disaster recovery. Sem esses gates **não afirmar 90%, concluído, homologado ou publicado**.

**Ações seguras a seguir:** pesquisar checks/status GitHub no HEAD, corrigir browser CI se falhar, testar no emulador ou staging isolado autorizado, preencher F03/F05 e gates de segurança, atualizar `PROJECT_STATUS.json` e o PR. Não editar `rfb-method-gpt/myown`. Não realizar deploy/merge automaticamente.

**Rollback:** reverter as fatias da branch Draft, preservando `main` e banco de outros projetos.

## F03 numeração (novo slice)
- Tickets: ticket_number autoincremental global e UUID único para QR, números exibidos na UI. Node SQLite 9/9 PASS, CI no commit futuro ainda verificar. Schema 0001 destina-se a DB novo; NÃO migrar banco de produção.

## Webhook assinado simulado S005
- worker/webhook.mjs + /api/webhooks/sandbox assinam e verificam callbacks fictícios com segredo SANDBOX_WEBHOOK_SECRET e evento idempotente sandbox_webhooks. Node SQLite 10/10 PASS. NÃO equivale a Mercado Pago/Stripe ou outro integrador; nenhum webhook/PIX real e nenhuma cobrança.
- Config cloudflare agora exige dois Worker secrets sem versionar; criar ambiente isolado apenas com permissão e quotas Free verificadas.

## S006 Admin read-only
- Escopo: actor 5, /api/admin/summary, UID fixado pelo servidor, visão agregada no React, negação 403 por padrão. Node 11/11 PASS. Para tornar testável remotamente, configurar ADMIN_UID somente no Worker de sandbox autorizado e testar Firebase ID token real.

## Encerramento da rodada / retomada
- HEAD de código confirmado: `ade0bc31b9273ff284298dc14b4869b2364a79dd`, PR #1 DRAFT, main intacta. GitHub CI 6/6 PASS neste SHA (backend, frontend, browser).
- Backend Node SQLite 11/11 PASS, domínio 5/5 PASS, Playwright demo 6/6 PASS. Segurança de produção NÃO homologada.
- Próximo passo autônomo seguro é reconciliar novos PRs/Issues, verificar checkout e código, depois preparar D1 + Firebase **isolados** somente após validar custos e autorização. Executar testes reais de corrida em portaria e checkout, testar mobile com câmera e análise de negação entre organizações; fechar F05 com gateway sandbox real antes de falar em 90%.


## STATUS CANÔNICO ATUALIZADO — 2026-11-23 BRT / S008

**Leia este bloco antes das notas históricas acima.** Último código validado 0727d5100b4d95c2fb5fe726af6df0d128cf7070, CI 45178640841 SUCCESS (4 jobs). Branch `feature/rfb-starter-pack-v1`, PR #1 Draft, main intacta. Verifique SHA e checks antes de editar.

G3 local Workerd+D1: 8/8 PASS, API SQLite 17/17, domínio 5/5, Vite/TS/Vitest build PASS, Playwright demo 6/6, cf deploy dry-run PASS, D1 local migration PASS. Valida JWT assinatura RS256 em JWKS falso isolado. A API continua sandbox e possui fake checkout, sem gateway real. 58 telas/documentação e 7 diagramas permanecem parciais.

Novos recursos: consulta de estoque sem holds expirados, limite de 5 holds simultâneos por UID, cancelamento evento sem checkin, revogação de fiscais, reembolso fake que devolve vaga, CSV de entradas do organizador sem identificadores privados, edição de evento na UI. Ver `docs/ACCEPTANCE-MATRIX.md`.

**Bloqueios externos/produção:** Firebase test project e D1 remoto exclusivos não configurados; pagamentos reais não permitidos; câmera física, isolamento remote, storage quota/billing, anti-bot, retenção LGPD, DR, F01–F12 acceptance, T001–T058 faltam homologação. Não confundir JWTs sintéticos com contas reais Firebase nem cf dry-run com deploy.

**Próxima fatia concreta:** inventariar quotas/ambiente Firebase e Cloudflare; criar apenas sandbox isolado aprovado sem cobrança; rodar auth Firebase real, transações D1 remotas com concorrência em dois dispositivos, checkin e camera; ensaiar export/import/recovery antes de liberar público pagante.

**Rollback:** PR #1 Draft não mesclado; main inalterada. Reverter SHA de alterações em branch sem afetar recursos terceiros.


## S009 — 2026-11-23 BRT: verificações e UI/diagramas

Code SHA testado c0f85cd7f2d8be13c4216e7e3d90d1bf3e6ded72, CI https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45179829134 4/4 jobs PASS. Workerd+D1 **10/10 PASS** inclui transferência QR e admin UID read-only; backend SQLite 17/17 PASS, domínio 5/5 PASS, Chromium demo 6/6 PASS, typecheck/build/cf dry-run PASS. Nenhum recurso Firebase/D1 remoto conectado.

Cobertura T001–T058 no documento UX: 26 sandbox-coded, 21 partial, 11 not implemented; 0 homologated remote. `docs/AS-BUILT-DIAGRAMS.md` descreve D001–D007 do código sem substituir diagramas conceituais. Próximo fluxo: staging isolado, PSP fake->provider real sandbox, QA authenticated/mobile, compliance/DR, revisão/merge com autorização. PR #1 mantém Draft.


## S010 — 23/11/2026: nova rodada com CI validado

**Ponto de retomada:** código `4d6b5a437548f161e80a1ffe230cb26c2cfbb44c` em `feature/rfb-starter-pack-v1`, PR #1 Draft. [CI 45305151761](https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45305151761) quatro jobs PASS; Node SQLite 19, D1 Workerd 11, domínio 5, Vitest 15, Playwright demo 6 + sandbox público mockado 6, typecheck/build/cf dry run PASS.

Novas implementações: catálogo `q/city/page` seguro, frontend de filtros, confirmação de estorno/transferência sandbox, recuperação e verificação de email pelo Firebase, FAQ, conta, feed in-app, histórico de entradas, checkin audit atômico, relatórios admin somente leitura, retry com requestId/requestKey estável, invalidação de respostas tardias após logout, câmera só com identidade+evento selecionados e SVG de marca V1 em preview.

Cobertura de telas: 32 sandbox-coded, 23 partial, 3 not implemented. Ainda **nenhum E2E autenticado com Firebase real, D1 remoto, PSP sandbox financeiro real, hardware físico, backup/restore ou aceite integral**. No merge/deploy, sem recursos persistentes criados.

**Próxima fatia concreta:** configurar **ambiente isolado** Firebase Auth+D1 staging após comprovação Free/autorizações e executar os 5 atores, dois scanners físicos, QR transfer/revoked, ingressos concorrentes e backups. Acessos, pagamento e publicação continuam bloqueados; não confundir CI mockado com homologação.

Leia `PROJECT_STATUS.json`, `docs/QA-REPORT-2026-11-23-S010.md`, `docs/ACCEPTANCE-MATRIX.md` antes de editar.
