# PROGRESS — RFBTicket / RFB Method GPT

2026-11-22 BRT. Fonte canônica: `PROJECT_STATUS.json` na raiz. O último SHA analisado foi `40737f84cc23c6c0dbb355eb8e8ea75e63c3c6a1` em `feature/rfb-starter-pack-v1`, PR #1 Draft. Sempre rever HEAD no GitHub antes de editar.

## S001 — inventário / segurança / contexto
0 Issues abertas, 1 PR #1 Draft aberto, main `dbd16775...`. Metodologia, especificação de 12 features, sete diagramas e catálogo T001–T058 preservados. Nenhum PR paralelo criado. Cloudflare conta conectada: recursos existentes de **outros** projetos foram preservados. Nenhum serviço novo faturado.

## S002 — API transacional sandbox e frontend, IMPLEMENTADO_NÃO_HOMOLOGADO
- `15bb5d0883354595e78cb47b640137446c6f38a0`: worker API, HMAC, Firebase ID token, D1 schema e cinco testes SQLite.
- `6a6f5612f1ba206ad1457c3fa9d429aa1546e2ab`: React real/sandbox + UI demo, autenticacao cliente, scanner QR, relatórios, integração do Vite Cloudflare, CI GitHub.
- `15d52fd20a413a58e2228f76b756ad4afdaa6fb9`: replay de check-in restrito ao mesmo fiscal e testes de corrida, expiração e tenant; Node SQLite PASS 8/8.
- `337001841caa06d5c574f72ded6d709bd9190fad`: suíte Playwright para demonstração sintética desktop/mobile/teclado, testes browser aprovados: seis testes em Chromium desktop e mobile.
- CI commit `6a6f...`: 4/4 checks PASS (frontend install/typecheck/Vitest/build; backend tests). CI `337001...`: backend e browser PASS; frontend FAIL por Vitest incluir Playwright. Correção `40737...`: Vitest separado de Playwright; GitHub CI 6/6 PASS.

## S003 — lacunas críticas antes de qualquer 90% real
Matriz detalhada: `docs/ACCEPTANCE-MATRIX.md`. Sem Firebase Authentication configurado nem D1 com Worker real isolado, não houve autenticação E2E, teste D1 concorrente, fila com câmera ou publicação. Sandbox de compra não tem webhook assinado; reembolso não movimenta dinheiro. Build/testes de código aprovados não provam produção.

## Gate de segurança / custo
Nenhuma credencial, PII real, conta de cobrança, deploy ou merge. D1 Free e Workers Free confirmados na documentação, limite do plano específico do usuário e Firebase Spark permanecem NÃO_VERIFICADOS. Não criar R2, domínios próprios ou gateway real. UI e API são protótipos sandbox com bloqueio de produção.

## Retomada concreta
1. Buscar CI da atualização Node 24 após este checkpoint; ler logs de falhas e corrigir com teste direcionado.
2. Fazer QA de navegador em viewport 390/1440 e E2E autenticado **somente** com Firebase/D1 isolados.
3. Implementar F05 gateway webhook (F03 sequencial implementado em código, pendente D1 real) exclusivamente sandbox se credenciais seguras e ambiente forem disponibilizados.
4. Auditar AV-03, AV-08, AV-14, rate-limit, check-in e testes de duas portas reais; depois imagens/assets e 58 T-IDs priorizados.
5. Publicar checkpoint novo, nunca dar merge/deploy sem gates.

## S004 — F03 numeração global auditável (ainda em revisão)
- Migracao 0001 revisada para ticket_number INTEGER PRIMARY KEY AUTOINCREMENT; id QR continua UUID UNIQUE.
- Rotas /api/tickets e emission retornam ticket_number, UI mostra #000001 etc. Node SQLite PASS 9/9.
- Somente banco novo vazio; não rodar migração sobre banco existente sem plano/backup.

## S005 — webhook HMAC de provedor fictício (parcial)
- Nova rota pública POST /api/webhooks/sandbox requer SANDBOX_MODE + SANDBOX_WEBHOOK_SECRET Worker, HMAC SHA256 do corpo e timestamp (janela de 5min). Registra sandbox_webhooks com idempotência e emite ingressos em transação SQL D1 somente com pedido reservado.
- SQLite mock testes de assinatura inválida, stale, tamper, replay e 1 emissão: Node 10/10 PASS. Não foi usado provedor de pagamentos real. Cliente ainda consegue confirmar ficticiamente sob SANDBOX_MODE, portanto F05 REAL continua incompleta.
- PR #1 draft. Commit F03 221c685... passou 6/6 checks GitHub Actions; novo webhook deve passar CI antes de marcar verificado.

## S006 — administrador com acesso fail-closed
- GET /api/admin/summary exige UID autenticado idêntico à variável Worker ADMIN_UID; sem configuração é negado (403). Relatório só agregado, sem e-mail ou segredos.
- Menu Administração React disponível somente quando /api/me atesta isAdmin; o servidor continua autoritativo. Node SQLite 11/11 PASS; staging não configurado.
