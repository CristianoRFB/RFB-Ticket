# RFBTicket — Matriz F01–F12 / AC-01–AC-12 (22/11/2026 BRT)

**Critério de porcentagem:** nenhuma estimativa de “90% concluído” será anunciada sem cobertura testada por requisito, segurança e UX. Esta tabela separa o que existe no código do que foi homologado. F01–F12 são os IDs imutáveis da especificação original.

| F / AC | Implementação entregue | Testes presentes | Falta para aceite completo |
|---|---|---|---|
| F01 / AC-01 Catálogo de eventos | API pública de eventos publicados e interface, criação/edição/publicação pelo dono | Node mock SQLite + CI typecheck/build | D1 real, regras de privacidade, browser autenticado |
| F02 / AC-02 Lotes com limites | Capacidade, saldo e reservas com condição SQL e batch | Teste negativo e chamadas concorrentes simuladas | Concorrência real no D1 e expiração em vários Workers |
| F03 / AC-03 Ingressos numerados | UUID de credencial + número global sequencial imutável (INTEGER PRIMARY KEY AUTOINCREMENT) | Node SQLite, nove cenários PASS, verifica unicidade | D1 real e validação de UX; numeração por evento não é requisito consolidado |
| F04 / AC-04 Compra sandbox | Reserva de pedido, preço do banco, botão de confirmação **fake** | Mock SQLite | Gateway/provedor sandbox confiável, sem pagamentos reais |
| F05 / AC-05 Emissão depois de webhook | Emissão após `sandbox-confirm` falso (não é webhook financeiro) | Requisição fake e replay | **NÃO IMPLEMENTADO**: assinatura, replay de webhook e comprovante verificável |
| F06 / AC-06 QR assinado/referenciado | HMAC para token/versionamento e QR visual SVG | Tampering no mock | Revisão de ciclo de segredo, runtime Cloudflare e QR em câmera |
| F07 / AC-07 Validação online de uso único | D1 UNIQUE + transação batch, fiscal validado | SQLite mock 8 testes, inclusive tentativa repetida | Two-device D1 real, simulação de indisponibilidade, auditoria independente |
| F08 / AC-08 Leitor com permissão | UI câmera BarcodeDetector + manual, fiscal por evento | RBAC API em mock | Câmera navegador Android/iOS e comportamento sem suporte/offline |
| F09 / AC-09 Relatório por entrada | Estatísticas de capacidade, emitidos e checkins + auditoria básica | API mock | Paginação, revisão de dados, UX e exportação necessária |
| F10 / AC-10 Cancelamento e reembolso | Cancelar hold; reembolso **fictício** só antes do uso/transferência | API mock | Política de negócio, autorização e gateway sandbox; sem dinheiro real |
| F11 / AC-11 Transferência com controle | Transferência única para UID com revogação QR anterior | API mock | Validação de destinatário, política/reversão e navegador |
| F12 / AC-12 Log de acessos | Trilha de ações do evento e check-ins de sucesso | API mock | Log sanitizado de negativas, privacidade/retention e monitoração |

**Módulos:** Eventos, Lotes, Checkout fake, Emissão, Meus ingressos, Leitor QR, Check-in, Reembolso fake, Painel do organizador, Relatórios têm rotas e/ou UI de sandbox, mas não são 10 módulos homologados. Administrador, 58 telas, screenshots de produto real, cadastro/roles reais e publicação permanecem incompletos.

**Evidência:** PR #1, testes/api.node-test.mjs (8 PASS em Node SQLite), testes/ticketDomain.node-test.mjs (5 PASS), workflows GitHub; executar integrações reais antes de cada aceite.
