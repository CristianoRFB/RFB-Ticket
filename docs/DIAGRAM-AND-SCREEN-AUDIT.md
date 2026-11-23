# RFBTicket — auditoria inicial de diagramas e catálogo

Data: 22/11/2026. Auditoria TEXTUAL, não validação renderizada por engine Mermaid nem revisão UML formal.

## Sete diagramas existentes

- D-001 (atores/casos): o mapeamento arbitrário associa fiscal de entrada a compra em sandbox e administrador à emissão depois de webhook; NÃO pode ser usado como ACL. Criar matriz papel x ação primeiro.
- D-002 (classes): onze entidades candidatas e relações propostas; faltam cardinalidades, atributos mínimos reais, invariantes e classes de Reserva/ConcessaoDoFiscal.
- D-003 (ERD): entidades listadas sem relações; portanto ainda não serve de contrato de persistência/índices. Não inventar multiplicidades com base em esquema genérico.
- D-004 (C4 aproximado): Cloudflare Worker, Auth e Firestore são apenas hipótese. Falta desenhar boundary entre browser, token, API privilegiada e Firestore Rules; compatibilidade/quotas exigem prova.
- D-005 (sequência): cenário roteirizado sem autenticação real, erros, idempotência e condições de corrida. Substituir por sequências separadas para reserva, webhook confirmado e check-in.
- D-006 (estados): transição linear utilizado -> cancelado -> estornado não corresponde necessariamente às regras de cancelamento/reembolso. Não implementar literalmente antes de decidir transições autorizadas.
- D-007 (atividade): fluxos de erro voltam ao início sem recuperar contexto; desenhar retentativa, cancelamento e indisponibilidade real.

Nenhum dos sete foi homologado como modelo de backend. Revisão de sintaxe visual Mermaid: NOT_RUN.

## Catálogo de telas T001–T058

- Há 58 identificadores textuais. Eles NÃO são 58 telas implementadas nem 58 mockups.
- O bloco T001–T028 é genérico de SaaS; precisa mapear quais telas são pertinentes a ingressos, evitar telas de chat/perfil/admin sem caso de uso.
- T029–T031 (Eventos) e T032–T034 (Lotes) são núcleo da fatia F01/F02. A UI atual representa parte de listagem, seleção e informação de lote por estado, não cada tela separada nem CRUD.
- T035–T058 devem preservar rastreabilidade, mas criar somente quando a função correspondente possuir contrato de segurança/negócio.
- PNGs do ZIP original não foram publicados: licenciamento, originalidade e identidade de marca pendentes.

## Próximas entregas de modelagem

1. Diagramas de sequência Mermaid reais de duas reservas simultâneas e dois scans simultâneos.
2. Diagrama de estados revisto para Reserva, Ingresso, Pedido e Checkin separadamente, com transições ilícitas.
3. ERD/Cardinalidades e regras para Evento/Edicao/Lote/Reserva/Ingresso/Checkin/LeitorPermitido.
4. Matriz atores/ações com teste de negação e tenant isolation.
5. Protótipos mobile/desktop de portaria com estados OK/ALREADY_USED/NO_PERMISSION/OFFLINE e UX acessível; screenshots reais só após executar app.

Principal bloqueio: modelo de negócio e Firestore Emulator real não foram validados. Evitar código de produção sem esses gates.
