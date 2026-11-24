# RFBTicket — Matriz atual F01–F12 / AC-01–AC-12 (S010, 23/11/2026)

**Não confundir código sandbox com aceite.** Código verificado no commit `4d6b5a437548f161e80a1ffe230cb26c2cfbb44c`, [CI 45305151761](https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45305151761): 19/19 Node SQLite, 11/11 Workerd+D1 local, 5/5 domínio, 15/15 Vitest, 6/6 Playwright demo e 6/6 Playwright sandbox **com Firebase fictício/API mock**. Typecheck, Vite build e Cloudflare dry-run aprovados. Nenhum deploy externo.

| F/AC | Implementado no sandbox | Evidência local | Gate de conclusão aberto |
|---|---|---|---|
| F01 / AC-01 Catálogo de eventos | Eventos publicados, detalhes, editor por dono, busca parametrizada/paginada e filtros de cidade | SQLite, Workerd D1, React/Playwright mock | Staging Firebase/D1 real, pesquisa acessível com dados reais de teste |
| F02 / AC-02 Lotes com limites | Pausa, estoque atômico, reservas com expiração/limite 5 por UID, retry comprador idempotente | Concorrência Workerd D1, Vitest retry | Região/quotas D1 remotas, bots coordenados |
| F03 / AC-03 Ingressos numerados | Número global imutável, UUID para token | Node e Workerd D1 | Numeração/UX testada no staging |
| F04 / AC-04 Compra sandbox | Checkout com reserva e confirmação **fictícia**, sem cobrança | Node/D1 local | PSP real de sandbox homologado sem pagamentos reais |
| F05 / AC-05 Emissão após webhook | Receptor HMAC de **provedor fictício**, assinaturas e idempotência | Teste local Workerd HMAC/replay | Contrato/credenciais de PSP sandbox real e bloqueio do atalho fake |
| F06 / AC-06 QR assinado/referenciado | QR SVG e HMAC server-side com versão/revogação | Testes locais assinatura/tampering | Leitura real, segredo rotativo operacional |
| F07 / AC-07 Check-in único online | SQL único/atômico + audit de sucesso na mesma transação; retry mesmo requestId | D1 local 2 scanners concorrentes | D1 remoto, dois aparelhos, perda de rede |
| F08 / AC-08 Leitor autorizado | Fiscal vinculado a evento, revogação, câmera quando suportada/fallback manual, história de entradas | D1 local RBAC, tipo/build | Câmera Android/iOS física, conectividade irregular |
| F09 / AC-09 Relatórios | KPIs, CSV privado até 5000 linhas e histórico de check-ins paginado, sem UIDs no relatório | Node/Workerd D1 redaction | Testes com grandes eventos e retenção LGPD |
| F10 / AC-10 Cancelamento/reembolso | Cancelar hold/evento, fake refund revogando QR e liberando vaga, confirmação UI | Node/Workerd D1 | Fluxo comercial/PSP e política de estorno real |
| F11 / AC-11 Transferência controlada | Uma transferência por token, QR antigo invalidado, confirmação UI | Workerd D1, React build | Identidade real do destinatário e UX autenticada |
| F12 / AC-12 Log de acessos | Auditoria de ações incluindo check-in atômico, visão paginada organizador e admin sanitizada | Node e Workerd D1 RBAC | Política LGPD, rate limit de negativas, observabilidade e incidentes |

**Matriz de 58 telas:** [UX](UX-DESIGN-AND-QA.md) com 32 rotas/componentes de sandbox, 23 parciais e 3 ausentes. **Percentual de conclusão do produto:** não comprovado. Meta solicitada 90% permanece aberta até testes e aceites independentes. Recursos Firebase, D1, PSP e dispositivos reais permanecem NOT_RUN.
