# RFBTicket — D001–D007 conforme código implementado (S009, não produção)

**Escopo:** documentação técnica dos componentes que EXISTEM na branch Draft em c0f85cd7f2d8be13c4216e7e3d90d1bf3e6ded72. Não substituir a versão conceitual `docs/DIAGRAMAS.md`; este documento registra o funcionamento efetivamente programado. Ambiente remoto não implantado.

## D001 — Papéis e autorizações reais (mapa de casos)

```mermaid
flowchart LR
  V[Visitante] --> CAT[Consultar eventos e lotes]
  B[Comprador autenticado] --> HOLD[Reservar vagas]
  B --> FAKE[Confirmar checkout fictício]
  B --> MY[Meus ingressos QR]
  B --> TRANS[Transferir uma vez / reembolso fake]
  O[Organizador dono] --> EVT[Criar editar publicar cancelar evento]
  O --> LOT[Criar e pausar lotes]
  O --> GATES[Conceder/revogar fiscais]
  O --> REP[Relatórios/CSV privados]
  G[Fiscal autorizado no evento] --> SCAN[Validar QR online]
  O --> SCAN
  A[Admin UID configurado no servidor] --> SUM[Resumo agregado somente-leitura]
```

## D002 — Entidades persistidas no schema D1 (simplificado)

```mermaid
erDiagram
  EVENTS ||--o{ LOTS : contains
  EVENTS ||--o{ ORDERS : receives
  EVENTS ||--o{ TICKETS : provides
  EVENTS ||--o{ EVENT_STAFF : authorizes
  EVENTS ||--o{ CHECKINS : admits
  EVENTS ||--o{ AUDIT : logs
  LOTS ||--o{ ORDERS : allocates
  ORDERS ||--o{ TICKETS : issues
  ORDERS ||--o{ SANDBOX_WEBHOOKS : confirms_fake
  TICKETS ||--o| CHECKINS : one_successful_entry
  EVENTS {
    text id PK
    text organizer_uid
    text status
  }
  LOTS {
    text id PK
    int capacity
    int reserved
    int issued
  }
  ORDERS {
    text id PK
    text buyer_uid
    int hold_expires_at
    text status
  }
  TICKETS {
    text id UK
    int ticket_number PK
    text owner_uid
    int token_version
    text status
  }
  CHECKINS {
    text ticket_id UK
    text request_id UK
    text fiscal_uid
  }
```

## D003 — Fluxo de reserva em concorrência

```mermaid
sequenceDiagram
  participant B as Comprador
  participant A as Worker API
  participant D as D1 transaction
  B->>A: POST /api/orders (JWT, lote, quantidade, requestKey)
  A->>A: Validar assinatura JWT, identidade e valores
  A->>D: batch INSERT hold condicional + UPDATE reserved
  Note over D: Capacidade e até 5 holds/UID avaliados atomicamente
  alt vaga e quota
    D-->>A: 1 hold gravado
    A-->>B: 201 Pedido held + expiração
  else esgotado ou quota
    D-->>A: 0 hold
    A-->>B: 409 esgotado / 429 limite
  end
```

## D004 — Estados implementados do pedido

```mermaid
stateDiagram-v2
  [*] --> held: reserve
  held --> expired: hold_expired
  held --> cancelled: cancel
  held --> issuing: signed_fake_webhook
  issuing --> issued: atomic_ticket_issuance
  held --> issued: direct_fake_confirm_batch
  issued --> refunded: fake_refund_no_checkin
  held --> cancelled: event_cancel_sandbox
  issued --> refunded: event_cancel_sandbox
```

## D005 — Estados e rotação do ingresso

```mermaid
stateDiagram-v2
  [*] --> issued: create
  issued --> issued: transfer_once_increase_token_version
  issued --> used: unique_checkin_transaction
  issued --> revoked: fake_refund_or_event_cancel
  used --> [*]
  revoked --> [*]
```

## D006 — Porta de entrada dupla, idempotência e recusa

```mermaid
sequenceDiagram
  participant G1 as Fiscal 1
  participant G2 as Fiscal 2
  participant W as Worker API
  participant DB as D1
  par Primeira leitura
    G1->>W: POST /api/checkin (QR, requestId A)
    W->>DB: batch INSERT CHECKINS UNIQUE + UPDATE TICKET used
    DB-->>W: 1 insert válido
    W-->>G1: 200 ENTRADA OK
  and Segunda leitura
    G2->>W: POST /api/checkin (mesmo QR, requestId B)
    W->>DB: batch só se ticket issued
    DB-->>W: sem insert
    W-->>G2: 409 ALREADY_USED
  end
  Note over W: Replay A somente mesmo fiscal recebe 200 replayed
```

## D007 — Componentes e ambientes

```mermaid
flowchart TB
  U[React Vite SPA] --> W[Cloudflare Worker API + Assets]
  U --> AUTH[Firebase Authentication: não provisionado]
  W -.-> JWKS[Firebase JWKS assinatura RS256]
  W --> DB[D1 SQL atomic batches]
  W --> QR[Token HMAC server-side]
  MOCK[Provedor fictício webhook HMAC] --> W
  QA[GitHub Actions Node24] --> MF[Miniflare Workerd + D1 local]
  QA --> BROWSER[Playwright Chromium demo]
  QA --> DRY[cf deploy dry-run / migração local]
  subgraph PROD_NAO_CONFIGURADA
    AUTH
    W
    DB
  end
```

**Segurança:** segredo QR e webhook somente Worker bindings; autenticação real precisa Firebase project; checkout e reembolso são fictícios, nenhum dinheiro. D1 local Miniflare passou concorrência; D1 remoto e dispositivos reais NÃO testados. Diagramas descrevem estrutura simplificada, não os 58 layouts visuais.
