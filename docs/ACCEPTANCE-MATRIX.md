# RFBTicket — Matriz F01–F12 / AC-01–AC-12 (S008 — 23/11/2026)

**Regra:** implementado em código sandbox ≠ homologado. 17 testes API SQLite, 8 testes Miniflare+Workerd D1, 5 testes domínio, 2 Vitest e 6 Playwright demo PASS em GitHub Actions run 45178640841. Firebase e D1 remotos, câmera real e gateway de pagamento = NOT_RUN. **Percentual homologado: não determinado.**

| F / AC | Código efetivo em branch Draft | Evidência | Gate de aceite ainda aberto |
|---|---|---|---|
| F01 / AC-01 Catálogo | API de eventos publicados, criação, edição por dono e publicação; editor UI | API SQLite + Workerd D1 + CI React build | Firebase Auth real, UX mobile, staging |
| F02 / AC-02 Lotes/estoque | Capacidade, pausa, reserva atômica, expiração e limite de 5 holds ativos/UID | Workerd D1 concorrente (última vaga e limite) | Conflito entre regiões, ataque em escala, D1 remoto |
| F03 / AC-03 Numeração | Ticket número global AUTOINCREMENT estável, UUID separado para token | API SQLite + Workerd D1 issuance | UX, numeração de negócio e staging |
| F04 / AC-04 Compra sandbox | Reserva de 10 min e confirmação fake por comprador | Node SQLite + Workerd D1 | Provedor financeiro sandbox real; nenhuma cobrança |
| F05 / AC-05 Webhook/emissão | Provedor fictício HMAC SHA256 com tempo/replay e emissão transacional | Node SQLite + Workerd D1 fake webhook | Webhook real do provedor, idempotência vendor, sem bypass fake |
| F06 / AC-06 QR seguro | Token HMAC com versão, validação server e QR SVG | Workerd crypto/replay, Node tamper | Revogação operacional/segredo e câmera real |
| F07 / AC-07 Check-in único | INSERT UNIQUE+batch D1, reentrada 409 e replay mesmo fiscal | Workerd D1 dois fiscais simultâneos PASS | D1 remoto, dois dispositivos, erro de rede |
| F08 / AC-08 Fiscal autorizado | Staff gate por evento, scanner BarcodeDetector/manual, revogação imediata | Node SQLite e Workerd D1 RBAC | Teste câmera Android/iOS, acessibilidade e permissões |
| F09 / AC-09 Relatórios | KPIs por evento e CSV privado até 5000 checkins (ticket number + timestamp) | Node SQLite, Workerd D1 export/negação | Paginação, retenção, relatório de grandes eventos |
| F10 / AC-10 Cancelamento/refundo | Cancelar reserva, evento e reembolso **fictício**; token revogado e capacidade devolvida | Node SQLite + Workerd D1 | Gate financeiro sandbox real, política de estorno, nenhum dinheiro transferido |
| F11 / AC-11 Transferência | Transferência única UID->UID, rotação QR anterior, proibida após uso | Node SQLite | Workerd D1 transferência/QR rotacionado PASS; prova identidade destinatário, UX real |
| F12 / AC-12 Auditoria | Log de ações sensíveis por evento e relatórios restritos | Node SQLite | Negativas sanitizadas, retenção LGPD, alertas e exportação revisada |

**Atores:** visitante, comprador, organizador, fiscal, administrador leitura restrita. Os cinco possuem rotas/fluxos de sandbox; identidade real ainda não foi testada.

**Telas e diagramas:** T001–T058: catálogo de 58 IDs documentado, **não 58 telas homologadas**. D001–D007: 7 esboços auditados, não aprovação final.

**Gates por ambiente:** Node SQLite 17/17 PASS; Workerd D1 local 8/8 PASS; CI typecheck/Vitest/build PASS; Chromium demo 6/6 PASS; cf deploy dry-run PASS; D1 CLI local PASS. Firebase remoto, D1 remoto, gateway sandbox real, device-camera, prod deploy, backup/restore = NOT_RUN. Não declarar plataforma pronta para eventos reais.
