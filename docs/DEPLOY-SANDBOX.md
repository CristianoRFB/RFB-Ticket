# RFBTicket — deploy de homologação condicionado (NÃO EXECUTADO)

**Não publicar nem dar merge automaticamente.** Este é um setup reproduzível, não certificado de produção. Referência Cloudflare CLI nova (`cf`), não Wrangler. Atualizado em 22/11/2026.

## Arquitetura

- Frontend React + TypeScript + Vite, recurso estático do Worker; Firebase Authentication email/senha em projeto de teste; ID token validado pelo Worker via JWKS Google, verificação de assinatura, exp/iat/aud/iss/sub.
- Worker API isolada /api/*; D1 separado para eventos, lotes, pedidos e check-in com operações transacionais. Sem Firestore nesta fase: ADR-002 explica o porquê.
- Emissão explicitamente SANDBOX e sem gateway real. Há também receptor experimental de webhook assinado por um provedor **fictício**; o botão de confirmação fake permanece disponível apenas em SANDBOX_MODE e não prova pagamento. A URL não deve ser oferecida como bilheteria para público pagante. Não enviar e-mail, Pix ou reembolsos reais.
- Cloudflare Free e D1 Free têm cotas: não há SLA nem garantia de uso ilimitado. Sem upgrade automático autorizado.

## Pré-requisitos

1. Node >= 24.12 (Firebase 13 requer Node 24.12; cf exige ao menos 22.18) e CLI `cf` disponível, dependências instaladas e build/QA aprovados.
2. Criar projeto Firebase de teste SEM conta de produção; habilitar Email/Password apenas para contas de teste; configurar Firebase App Check quando for expor a internet.
3. Criar banco D1 exclusivamente para sandbox, NÃO apontar para `vof-2027-staging`, `food-condado-preview` ou quaisquer outros bancos existentes.
4. Atualizar `cloudflare.config.ts`: `DB` apontando para D1 de teste correto; `FIREBASE_PROJECT_ID` exatamente igual ao `VITE_FIREBASE_PROJECT_ID`.
5. Configurar segredos Worker `TICKET_SIGNING_SECRET` e `SANDBOX_WEBHOOK_SECRET` via `cf`/dashboard, ambos com 32+ caracteres aleatórios diferentes; **nunca** registrar secret no repo, PR, arquivo `.env`, screenshot ou comentário.
6. Para habilitar somente a visão administrativa de teste, definir opcionalmente ADMIN_UID como UID do Firebase aprovado, em uma variável de Worker; sem ADMIN_UID, o servidor retorna 403 a todos. Nunca aceitar admin vindo de JSON do cliente.
7. Preencher `.env.local` a partir de `.env.example` com valores públicos do Firebase. Adicionar ao `.gitignore` se ainda não estiver.
8. Criar o schema `migrations/0001_init.sql` **no D1 de teste** via CLI Cloudflare verificada. NÃO rodar em banco existente com dados reais.
9. Revisar regras LGPD, privacidade, política de retenção e limites antes de expor qualquer conta de teste externa.

## Validar sem publicar

```sh
npm install
npm run test:domain
npm run test:api
npm run typecheck
npm run test
npm run build
cf deploy --dry-run
```

**Importante:** `cf` é beta em novembro de 2026, exige Node >=22.18 e aqui usamos Node >=24.12 para compatibilidade Firebase e seu `cloudflare.config.ts` pode precisar ser ajustado conforme a versão instalada; nunca alegar que dry-run funciona sem tentar.

## Segurança e liberação

- Não habilitar gateway verdadeiro com `SANDBOX_MODE=true`; sequer usar este backend para cobrança real.
- Monitorar 401, 403, 409, 429, falhas da consulta de chaves Firebase e quota D1. Falta rate-limit/antiabuso robusto, revogação instantânea de token Firebase, varredura de dependências e testes Cloudflare runtime; **BLOQUEIO PARA PRODUÇÃO**.
- Para criar preview Cloudflare, usar banco de teste separado, autenticação real de teste e revisão humana dos critérios; a configuração atual NÃO foi aplicada em conta.
- Rollback do Worker não reverte dados D1; antes de publicar preparar backup/restore e verificar a restauração no sandbox.

Referências oficiais: https://developers.cloudflare.com/cf/get-started/first-worker/ ; https://developers.cloudflare.com/cf/projects/cloudflare-config/ ; https://developers.cloudflare.com/d1/worker-api/d1-database/#batch ; https://firebase.google.com/docs/auth/admin/verify-id-tokens


## Validação reforçada S008 (2026-11-23)

A CI já executa `npm run test:workerd` com **Miniflare Workerd e D1 local** (sem projeto remoto). Também executa `npx cf deploy --dry-run` (sem deploy).

**Observação cf v1:** `cf d1 migrations apply` exige UUID de banco, não nome/binding. O CI usa UUID sintético `00000000-0000-4000-8000-000000000001` **apenas** com `--local`; não reutilizar esse UUID no remoto. Nunca apontar para DBs existentes de outros projetos.

Comandos locais:
```sh
npm install --no-audit --no-fund
npm run test:api
npm run test:domain
npm run test:workerd
npm run typecheck
npm test
npm run build
npx cf deploy --dry-run
```

Para deploy de teste remoto: primeiro registrar banco D1 dedicado do RFBTicket, Firebase sandbox e seus planos/cotas, secrets separados; aplicar schema remoto **somente** ao banco recém-criado após verificação. Nenhum desses passos remotos ocorreu nesta rodada.
