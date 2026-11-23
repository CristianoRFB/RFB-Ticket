# RFB-Ticket — projeto transacional de estoque e check-in (NÃO IMPLEMENTADO)

Data da análise: 2026-11-22 (America/Sao_Paulo). Esta é uma proposta técnica para S002–S004, não uma API, Cloudflare Worker, Firestore Rules, gateway ou validação online já existente.

## Escopo, fonte e decisão provisória

Fonte: docs/ESPECIFICACAO-RFB.txt, F01–F12 e AC-01–AC-12. Prova de valor: uma credencial emitida e válida passa uma vez; o segundo scan, com outro ID de tentativa, retorna ALREADY_USED sem criar outro acesso.

- Frontend React/TypeScript/Vite já em scaffold; F01/F02 têm apenas demo de sessão, sem estoque real.
- Banco candidato: Firebase Auth + Firestore Standard no Spark, inicialmente somente Emulator; nenhuma conta, chave ou billing configurados neste projeto.
- API de scanner: componente servidor autorizado, com Worker Free como hipótese a validar (credenciais, autenticação, chamadas transacionais Firestore REST, limites e runtime). Não declarar compatibilidade com Firebase Admin SDK em Workers sem prova.
- Dados de pagamento: sandbox isolado, sem cobranças, taxas ou webhooks reais. Nunca confiar em callback/redirect do frontend.
- ADR-001 (provisória): priorizar segurança de validação online; offline seguro fica FORA do MVP até existir protocolo de reconciliação e risco aprovado.

## Entidades e invariantes a validar

Organizador(id), Evento(id, organizadorId, estado), Edicao(id, eventoId), Lote(id, edicaoId, capacidade, reservadosAtivos, emitidos), Reserva(id, usuarioId, loteId, quantidade, expiresAt, estado), Pedido, Pagamento, Ingresso(id, tokenHash, eventoId, status, usedAt?), Checkin(id determinístico por ingresso, scannerId, occuredAt), LeitorPermitido(scannerUid, eventoId, papel).

Regras obrigatórias:
1. Cada evento e lote pertence a um organizador. Toda escrita protegida verifica papel, ownership e identidade no backend/Firestore Rules; nunca confiar em campos organizerId/role/pricing fornecidos pelo navegador.
2. Estoque disponível >= 0 e nunca ultrapassa capacidade; reservar e atualizar contador no mesmo commit transacional.
3. Pagamento só altera estado após confirmação assinada e idempotente verificada em ambiente de sandbox; pedido pago não depende de navegação no cliente.
4. Ingresso com token opaco aleatório no QR. Nunca incorporar PII, email, chave de assinatura ou estado financeiro no código QR.
5. Ingresso emitido, do evento correto, não cancelado/não transferido e ainda não utilizado é pré-condição para check-in.
6. Um único Checkin por ingresso, criável apenas na mesma transação que marca usedAt. Duplicação em tentativa distinta retorna ALREADY_USED, com log sanitizado e sem sobrescrever o primeiro check-in.
7. Retry técnico com o MESMO requestId retorna resultado idempotente quando comprovadamente é a mesma operação; novo requestId com o mesmo QR depois do uso é recusado.
8. Tokens e permissões revogadas devem falhar fechados. Sem rede não emitir OK visual; mostrar OFFLINE_NOT_VERIFIED e usar processo manual explícito.

## Operação futura A — reservar lote, com expiração (pseudocontrato)

Entrada: usuarioAutenticado, eventoId, loteId, quantidade 1–4, idempotencyKey. Saídas: RESERVED, SOLD_OUT, NO_PERMISSION, INVALID_REQUEST, UNAVAILABLE, CONFLICT_RETRY, RATE_LIMITED.

Dentro da transação: ler evento/edição/lote/hold existente; validar publicação, identidade, organizer, lote, capacidade e saldo; se idempotencyKey já aplicado ao mesmo usuário e payload, devolver a mesma reserva; calcular contador de holds ainda ativos; criar hold com expiresAt emitido pelo servidor e atualizar saldo com assert de capacidade. Tratar ABORTED/CONTENTION com retry controlado e erro recuperável.

**Expiração:** TTL automática é eventual, não libera estoque em prazo exato. Criar rotina de reconciliação idempotente, ou calcular reservas válidas em desenho escalável, sem esgotar cota; especificar antes do backend. O frontend não escolhe a data de expiração autoritativa.

Teste de concorrência obrigatório em Firebase Emulator: restando 1 vaga, executar duas reservas de 1 vaga em paralelo por identidades distintas. Exigir exatamente 1 sucesso e 1 SOLD_OUT/CONFLICT_RETRY, saldo final 0, sem contador negativo e sem duplicatas. Em seguida repetir idempotencyKey sem nova reserva. Testar tenant B escrevendo em evento A -> DENIED.

## Operação futura B — check-in online (pseudocontrato)

Entrada: token de QR opaco, ID de tentativa único, sessão autenticada de fiscal; nenhuma PII no QR. Resultado: OK, ALREADY_USED, INVALID_TICKET, REVOKED, WRONG_EVENT, NO_PERMISSION, OFFLINE, CONFLICT_RETRY.

1. Autenticar identidade do fiscal por token válido; conferir concessão server-side para o evento e dispositivo, e políticas de revogação.
2. Normalizar e hashear token; localizar ingresso por índice controlado, sem expor existência para público. Rate-limit contra enumeração.
3. Em transação Firestore: ler ingresso + relação com evento/permite fiscal + registro de check-in/idempotência; validar estado emitido, evento e ausência de usedAt; criar Checkin com ID determinístico derivado do ticket id (não do QR) e escrever status utilizado + usedAt no mesmo commit.
4. Se já usado: retornar ALREADY_USED e gravar tentativa recusada em log sanitizado apropriado (sem dar entrada). Nunca reescrever data do primeiro acesso.
5. Se duas sessões verificarem o mesmo token em paralelo: exigir uma só transação vencedora; a perdedora reexecuta pré-condição, recebe ALREADY_USED/CONFLICT_RETRY, não OK adicional.
6. Não usar somente um useState/localStorage, QR assinado sem consulta de uso, nem update incondicional do documento.

Teste obrigatório em Emulator: dois fiscais distintos autorizados escaneiam o mesmo token simultaneamente; exatamente 1 OK + 1 rejeição, 1 único Checkin e um único usedAt. Repetição posterior de novo requestId é rejeitada. Fiscal de evento B e fiscal revogado -> NO_PERMISSION. Ingresso cancelado -> REVOKED. Falha de internet -> nenhum resultado OK.

## Ameaças e prioridade AntiVibeCoding

- AV-03/05: IDOR e tenant crossing — matriz anônimo/comprador/organizador/fiscal/admin; nenhum cargo vindo do frontend.
- AV-08/14: falsos webhooks/replay e emissão duplicada — assinatura, ordem, idempotência e ledger sandbox.
- AV-14/17: corrida na última vaga e duplo check-in — transações/requests paralelos reais no emulador.
- AV-04: token pessoal ou credencial vazada — QR opaco, segredos em secret store, logs sanitizados.
- AV-07: teste na produção — proibido; emulator/staging isolado e autorizado.
- AV-12: câmera negada, internet instável, baixa iluminação — fallback manual com semântica de erro e acessibilidade.
- Cancelamento pós-check-in, transferência e estorno: transições da especificação original são PROPOSTAS, não regra final. Não implementar sem ADR e aprovação de negócio.

## Critérios para iniciar código de backend

- Matriz de permissão revisada e testes negativos definidos.
- Modelo de dados, índices, regras e isolamento de tenant revisados; quotas e custos atuais reconferidos.
- Escolher um adaptador real para Firestore (client SDK governado por Rules ou servidor autentico), verificar em emulator.
- Sem Blaze, SMS, armazenamento cobrado, gateway real ou alteração de produção sem aprovação expressa.
- Medir custo de leituras, escritas, indexação, falhas de conexão e contenda; plano R$0 é meta, não garantia.

## Referências oficiais verificadas em 22/11/2026

- Firebase transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore Rules / getAfter: https://firebase.google.com/docs/firestore/security/rules-conditions
- Firestore contention: https://firebase.google.com/docs/firestore/transaction-data-contention
- Firebase Spark vs Blaze: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Static Assets: https://developers.cloudflare.com/workers/static-assets/
