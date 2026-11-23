# ADR-002 — Cloudflare D1 para estoque e check-in; Firebase Auth para identidade

**Status:** PROPOSTA IMPLEMENTADA LOCALMENTE (não homologada em runtime Cloudflare), 22/11/2026.

## Contexto

Stack do Starter Pack sugeria Firebase Auth + Firestore Spark e Worker Free. Sem Firestore em uso no repo, e ainda sem Backend real, a semântica de entrada única, estoque e idempotência precisa ser demonstrada com transações server-side. O D1 oferece constraints/unique e transações `batch()` SQL, no Free, usando Worker. Firebase Auth permanece para identidade, sem mudar o frontend principal React.

## Decisão

Usar D1 de sandbox como banco transacional em Worker; manter Firebase Authentication para contas. Não criar D1 real automaticamente nem tocar projetos existentes. Reserva com atualização condicional de saldo e lote; emissão sandbox com criação e alteração de status no mesmo batch; check-in com PK ticket_id e atualização de status. Retirada de permissão na tabela event_staff impede novas entradas. QR assinado HMAC muda `token_version` em transferência.

## Consequências e restrições

Benefícios: atomicidade em um banco relacional e teste em SQLite isolado, sem custo recorrente adicional obrigatório até limite da franquia Free. Contrapartidas: migração de modelagem planejada originalmente para Firestore, manutenção dupla de Firebase+Cloudflare, JWT verificado via chave pública, dependência de Internet para validar identidade e entrada, risco de esgotar cotas; NÃO há modo offline seguro.

Aceites ainda pendentes: prova em D1/Workers runtime, múltiplas instâncias concorrentes reais, autenticação real Firebase, cobertura de erros, testes UI/browser/CI, threat model/pentest, rate limiting, backup e política de dados. A implementação *local SQLite* não é prova de comportamento em ambiente de produção Cloudflare.

Alternativa não adotada: Firestore transacional com autenticação+Rules. Pode ser retomado se o usuário desejar; mudanças devem passar ADR e migração, nunca apagar dados existentes.
