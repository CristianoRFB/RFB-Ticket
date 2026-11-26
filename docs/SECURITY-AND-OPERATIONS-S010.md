# RFBTicket — Segurança, operação e liberação (S010)

Status: **procedimento proposto; não executado em infraestrutura remota**. Aplica-se exclusivamente a `CristianoRFB/RFB-Ticket`. Nenhuma migração, recurso Cloudflare, pagamento ou usuário Firebase real foi criado nesta rodada.

## 1. Fronteiras e dados tratados

- **Cliente React:** pode receber API key pública Firebase de uma aplicação de testes; nunca recebe `TICKET_SIGNING_SECRET`, `SANDBOX_WEBHOOK_SECRET`, identidade admin configurada nem token de gateway.
- **Worker:** verifica Firebase ID token RS256, confere `aud`, `iss`, expiração, assinatura JWKS; faz autorização por `uid` e evento em cada operação protegida.
- **D1:** mantém `events`, `lots`, `orders`, `tickets`, `checkins`, `event_staff`, `sandbox_webhooks`, `audit`. Contém IDs persistentes de contas (dados pessoais pseudônimos, não anônimos). Preservar acesso estritamente privado.
- **QR:** HMAC versionado e verificado no servidor. Não carrega nome, e-mail nem dados de pagamento. Não registrar token em logs ou URLs.
- **Admin:** UID injetado pelo servidor, não por campo do cliente. As listas de eventos e auditoria não devolvem UIDs de compradores/fiscais ou destinos; autorização é repetida no Worker.

## 2. Barreiras já programadas

1. Estoque somente via SQL transacional D1 com limites e idempotência `requestKey`; máximo cinco pedidos `held` simultâneos por UID.
2. Tentativas repetidas de check-in com o mesmo `requestId` e fiscal retornam replay seguro; solicitações independentes de QR utilizado são recusadas.
3. Entrada, estado `used` e ação `CHECKIN_ACCEPTED` entram na mesma transação. A UI nunca declara aprovação offline.
4. Revogação de fiscal pelo organizador, transferência única com rotação do token e reembolso **fictício** revogando QR e liberando estoque.
5. Eventos cancelados não são publicados no catálogo, não aceitam lote/fiscal e não são canceláveis após entrada registrada.
6. Busca e relatórios paginados, parâmetros vinculados, exportação CSV privada limitada, sem dados de identidade.

**Limitações:** não há rate limit distribuído por IP, CAPTCHA, defesa completa de bots, E2E de Firebase real ou teste D1 remoto. Os limites por UID não impedem contas falsas coordenadas. O servidor não presta serviço para ingressos com dinheiro real.

## 3. Pré-condições de um staging seguro — G4 (todas pendentes)

- Confirmar plano Free e limites reais na conta proprietária; **não ativar billing/Blaze nem cartão**. Referências: [Firebase billing](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) e [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- Separar um projeto Firebase de testes, usuários explicitamente fictícios e um banco D1 **novo e dedicado**. Nunca usar D1, Firebase ou Cloudflare de outros produtos RFB.
- Configurar somente variáveis não secretas no frontend (`VITE_FIREBASE_*`); segredos no armazenamento de secrets do Worker e nunca em logs, GitHub ou screenshots.
- `FIREBASE_PROJECT_ID` deve corresponder a `aud` / `iss` do JWT real. Usar `ADMIN_UID` apenas se o dono da conta tiver aprovado um UID de teste.
- Manter `SANDBOX_MODE=true`, sem qualquer fluxo de cobrança real. Webhook existente é **de provedor fictício**; não tratá-lo como confirmação financeira.
- Validar migrações no D1 **local**; inspecionar schema e possível incompatibilidade antes de aplicar em banco remoto. Banco novo usa `migrations/0001_init.sql`; não rodar migração destrutiva sobre bancos pré-existentes.
- Preparar exportação/restauração de backup de dados sintéticos via ferramentas oficiais da conta e documentar o procedimento de volta. Nenhum teste de restore remoto foi realizado.
- Executar smoke tests em HTTPS, autenticação de duas contas/tenants, duas portarias, último assento, webhook duplicado e check-in simultâneo. Capturar logs sem PII.

## 4. Falha segura na entrada

| Cenário | Comportamento exigido | Prova necessária |
|---|---|---|
| Câmera/permissão falha | Mostrar campo manual; nunca aprovar offline | Android Chrome / iOS Safari físicos |
| Rede cai após POST | Repetir o mesmo ID de tentativa, consultar servidor; não liberar por timeout | Teste de conexão intermitente |
| Duas portas validam QR | Uma entrada 200, outra 409; uma linha no banco | D1 remoto e dispositivos distintos |
| Fiscal perde acesso | Próxima chamada retorna 403 | Reautenticação e revogação remota |
| QR transferido ou reembolsado | Token anterior recusado | Teste de rotação HMAC remoto |
| Pagamento falha | Manter pedido pendente/expirado; nunca emitir ingresso real | PSP sandbox real ainda não integrado |

## 5. Incidentes, privacidade e rollback

- **Suspeita de abuso:** interromper novas operações de teste, retirar acesso do fiscal no painel, preservar log auditável restrito e conferir anomalias no banco. Não publicar QR ou UID em Issues públicas.
- **Erro de deploy:** restaurar versão anterior do Worker via mecanismo autorizado do provedor, após verificar compatibilidade do schema. Não reverter dados com `git reset`.
- **Esquema incorreto:** manter cópia de segurança e aplicar plano de restauração ensaiado; sem plano/backup confirmado, parar a implantação.
- **LGPD:** antes de usuários reais, definir controlador, finalidade, bases legais, política de retenção, exclusão e resposta a solicitação do titular. Ativos de teste não devem receber PII real.
- **Custos:** carga/tráfego podem esgotar cotas grátis; quotas e plano devem ser monitorados em homologação. R$0 é objetivo condicionado a limites, não garantia.

## 6. Critérios de aceitação

- G3: GitHub Actions com backend + frontend + Workerd D1 local + browser demo + browser sandbox público usando API mockados = PASS; detalhes por commit em `PROJECT_STATUS.json`.
- G4/G5: Firebase real e D1 remoto isolados, câmera física, PSP financeiro sandbox, backup/restauração, LGPD, quotas e UX ainda exigem provas.
- PR #1 continua Draft até revisão, consentimento de deploy e fechamento de critérios; **não mesclar por estar verde**.
