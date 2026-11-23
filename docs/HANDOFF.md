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
