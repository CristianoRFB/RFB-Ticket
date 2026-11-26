# RFBTicket — UX, identidade e catálogo completo de telas

> **BASE DO USUÁRIO:** os 58 T-IDs abaixo são os planejados na fonte original, NÃO telas programadas. Os 10 PNGs de conceito existentes no ZIP são artes demonstrativas, NÃO prints do produto executando. **Este repositório público recebe o catálogo textual, mas os PNGs do ZIP original ainda não foram importados nem revisados quanto à marca e licença.**

## Identidade de produto baseada na fonte

- **Segmento:** Ingressos e acesso a eventos.
- **Direção visual original:** Evento com cartaz, lotes e cartão de ingresso com QR visual.
- **Cor de acento no índice do ZIP:** `#B46DF6`; verificar contraste AA 4,5:1 normal, 3:1 texto grande e estados focados WCAG 2.2.
- **Experiência principal:** Eventos → Lotes e capacidade → Checkout.
- **Arquitetura/condição especializada:** Firestore transaction por ingresso e capacidade; Worker para webhooks e scanner autorizado.
- Padrão: desktop 1440 px com grid e navegação consistente, tablet 768/1024 px com reorganização de densidade, mobile 320/360/390/430 px com alvo tátil e CTA alcançável; layout flexível, sem scroll horizontal nem microtexto.

## PNGs ORIGINAIS — localizados no ZIP, não nesta branch

Caminho exato de origem: `RFB-LABS-2026/repos-individuais/11-rfbticket/design/PNG/`.

- **IMG-01** — `01-home.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-02** — `02-fluxo-principal.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-03** — `03-detalhe-e-estado.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-04** — `04-painel-operacional.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-05** — `05-admin-e-permissoes.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-06** — `06-relatorios-e-indicadores.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-07** — `07-configuracoes-e-seguranca.png` — conceito desktop/fluxo geral; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-08** — `08-mobile-home.png` — conceito mobile; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-09** — `09-mobile-fluxo.png` — conceito mobile; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).
- **IMG-10** — `10-mobile-perfil.png` — conceito mobile; estado `SOURCE_ZIP_ONLY` (não copiado ao GitHub).

Outros arquivos do original: `design/desktop.svg`, `design/mobile.svg`, 8 PNG de diagramas e fontes DOT/Mermaid. Ao criar repo independente, copiar assets originais com hashes; para recursos de terceiros validar direitos e não publicar imagem sem licença.

## Navegação e hierarquia inicial (decisão de Starter Pack)

**Primeira demonstração funcional proposta:** começar por Eventos, usando Lotes e capacidade e Checkout como navegação/contexto. Não escrever conteúdo genérico de SaaS em todas as telas; o domínio ingressos e acesso a eventos precisa ser visível no hero, no objeto principal e no CTA. A página deve mostrar o estado vazio, sucesso e falha com feedback concreto, não meros cartões estáticos.

- **Mobile:** menu conciso, CTA principal e fluxo do ator mais comum; títulos específicos, controles 44x44 px quando viável, scroll natural; movimento reduzido respeitado.
- **Desktop:** navegação lateral/superior quando pertinente, conteúdo principal + ações secundárias; evitar enfeites sem função.
- **Acessibilidade:** HTML semântico, foco visível, labels reais, mensagens de erro associadas, teclado, leitor de tela, skip link e `prefers-reduced-motion`.
- **Copy:** dados sintéticos identificados, sem reviews, métricas ou promessas de produto fictícias.

## Catálogo de T001 a T058 — todos da fonte original

| Tela | Especificação original | Estágio |
|---|---|---|
| T001 | Landing / apresentação | `PARTIAL_SANDBOX` |
| T002 | Cadastro / criar conta | `PARTIAL_SANDBOX` |
| T003 | Login e recuperar acesso | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T004 | Onboarding e perfil | `PARTIAL_SANDBOX` |
| T005 | Página principal / feed | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T006 | Busca e filtros | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T007 | Detalhes do recurso | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T008 | Fluxo de criação | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T009 | Fluxo de edição | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T010 | Confirmação / revisão | `PARTIAL_SANDBOX` |
| T011 | Estado concluído / recibo | `PARTIAL_SANDBOX` |
| T012 | Lista pessoal / histórico | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T013 | Notificações | `PARTIAL_SANDBOX` |
| T014 | Mensagens ou contato | `NOT_IMPLEMENTED` |
| T015 | Central de ajuda | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T016 | Preferências e privacidade | `PARTIAL_SANDBOX` |
| T017 | Acesso e segurança | `PARTIAL_SANDBOX` |
| T018 | Página vazia / primeira vez | `PARTIAL_SANDBOX` |
| T019 | Carregamento e skeleton | `PARTIAL_SANDBOX` |
| T020 | Erro de rede / retentar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T021 | Sem permissão / bloqueio | `PARTIAL_SANDBOX` |
| T022 | Estado de conflito concorrente | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T023 | Admin: visão geral | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T024 | Admin: gestão de usuários | `NOT_IMPLEMENTED` |
| T025 | Admin: moderação e auditoria | `PARTIAL_SANDBOX` |
| T026 | Admin: regras e configurações | `NOT_IMPLEMENTED` |
| T027 | Admin: relatórios | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T028 | Página 404 / recurso indisponível | `PARTIAL_SANDBOX` |
| T029 | Módulo / Eventos — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T030 | Módulo / Eventos — detalhe | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T031 | Módulo / Eventos — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T032 | Módulo / Lotes e capacidade — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T033 | Módulo / Lotes e capacidade — detalhe | `PARTIAL_SANDBOX` |
| T034 | Módulo / Lotes e capacidade — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T035 | Módulo / Checkout — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T036 | Módulo / Checkout — detalhe | `PARTIAL_SANDBOX` |
| T037 | Módulo / Checkout — criar/editar | `PARTIAL_SANDBOX` |
| T038 | Módulo / Emissão de ingressos — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T039 | Módulo / Emissão de ingressos — detalhe | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T040 | Módulo / Emissão de ingressos — criar/editar | `PARTIAL_SANDBOX` |
| T041 | Módulo / Meus ingressos — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T042 | Módulo / Meus ingressos — detalhe | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T043 | Módulo / Meus ingressos — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T044 | Módulo / Leitor de QR — lista | `PARTIAL_SANDBOX` |
| T045 | Módulo / Leitor de QR — detalhe | `PARTIAL_SANDBOX` |
| T046 | Módulo / Leitor de QR — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T047 | Módulo / Check-in — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T048 | Módulo / Check-in — detalhe | `PARTIAL_SANDBOX` |
| T049 | Módulo / Check-in — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T050 | Módulo / Reembolso — lista | `PARTIAL_SANDBOX` |
| T051 | Módulo / Reembolso — detalhe | `PARTIAL_SANDBOX` |
| T052 | Módulo / Reembolso — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T053 | Módulo / Painel do organizador — lista | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T054 | Módulo / Painel do organizador — detalhe | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T055 | Módulo / Painel do organizador — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T056 | Módulo / Relatórios — lista | `PARTIAL_SANDBOX` |
| T057 | Módulo / Relatórios — detalhe | `CODE_SANDBOX_NOT_E2E_REMOTE` |
| T058 | Módulo / Relatórios — criar/editar | `CODE_SANDBOX_NOT_E2E_REMOTE` |

**Prioridade de desenvolvimento:** T001 apresentação, T003 login se realmente requerido, T005 primeira tela do produto, T007 recurso, T008 criação, T009 edição, T010 confirmação, T018–T022 vazios/erro/concorrência, T028 404 e T029–T031 primeiro módulo, mais telas necessárias ao fluxo end-to-end. Não gerar telas de admin/moderação sem domínio, autorização e dados reais de teste.

## Contrato de design para exportação futura

**D-UX-01:** mockup desktop e mobile de cada tela prioritária, mantendo estilo original sem usar o PNG como prova de execução. **D-UX-02:** user flow clicável ou interativo, separado do layout conceitual. **D-UX-03:** UI real em React, estados tratados. **D-UX-04:** screenshot REAL com URL/commit/viewports e data, separado dos PNG conceituais.

A lista de 58 telas não obriga implementar 58 páginas idênticas: revisar redundância, agrupar componentes e produzir apenas aquelas necessárias ao caso de uso, preservando rastreabilidade de cada T-ID.

## QA visual obrigatório antes de portfólio público

- [ ] Mobile 320, 360, 390, 430 px; tablet 768/1024; desktop 1440 px em navegador REAL.
- [ ] Navegação por teclado, sem foco preso, linguagem acessível, erros e loaders visíveis.
- [ ] Comparação com PNGs **originais** e feedback fundamentado; não exigir pixel match nem plagiar marcas.
- [ ] CRUD/fluxo mínimo real, persistência após reload, dados isolados e teste de duas sessões quando aplicável.
- [ ] Screenshot do APP executando e screenshot do original rotulados distintamente.
- [ ] Cores/contraste, motion/reduced-motion, CLS e imagens/performance avaliados.
- [ ] Publicação somente com gate de segurança, custo e permissão do usuário.

**Status no RFB Method (S009):** `SCREEN_CATALOG_MAPPED / SANDBOX_SOME_COMPONENTS_CODED / LIVE_AUTHENTICATED_BROWSER_QA_NOT_RUN`. Navegador Playwright aprovou somente a demonstração sintética (6/6); o modo Firebase autenticado não foi executado em navegador. Consulte `docs/AS-BUILT-DIAGRAMS.md` e a matriz F01–F12.

## Auditoria de cobertura S009 — 2026-11-23

Os 58 T-IDs referem-se a intenções de tela, **não 58 páginas separadas**. Mapeamos 26 para controles/rotas já codificados no sandbox, 21 parcialmente cobertos e 11 sem implementação. `CODE_SANDBOX_NOT_E2E_REMOTE` significa código existente em LiveApp/Worker com gates de identidade e banco remotos pendentes, **não homologação**. `PARTIAL_SANDBOX` representa componentes compartilhados que não atendem o contrato integral. Os IDs restantes são `NOT_IMPLEMENTED`.

- Falta em T003: recuperação de conta; T006: busca/filtros; T013–T016: notificações, contato, ajuda e preferências; T024–T026: ferramentas administrativas de gestão/moderação; T028: 404 dedicada; T048: detalhe individual de check-in. T001 é parcialmente coberta pelo shell do produto.
- Foco após integrar Firebase/D1 em staging: T003, T006, T015, T019–T022, T028 e T047–T049 com QA física. Não gerar ferramentas administrativas sem aceite de RBAC/LGPD.
- O widget câmera depende de `BarcodeDetector`, exige HTTPS/permissão e possui fallback manual. O Playwright atual valida somente a versão sintética não autenticada.

## S010 — 23/11/2026: auditoria de código e UX do sandbox

**Rastreabilidade:** 32 T-IDs possuem implementação de sandbox em rota/componente, 23 somente experiência parcial e 3 continuam sem implementação inicial (T014 mensagens/contato, T024 gestão de usuários admin, T026 regras/configuração admin). Mesmo os 32 codificados NÃO foram homologados com Firebase/D1 remotos. 55/58 têm algum suporte em código, o que **não** equivale a 95% de produto concluído.

- T003: recuperação de senha por Firebase incorporada; T004: tela própria de conta e solicitação de verificação (onboarding incompleto).
- T006: pesquisa de eventos por nome, descrição e cidade, paginação de 20 por API vinculada; T020/T022: erros/retry de rede e chaves idempotentes para reservas/check-ins.
- T013: feed de atividade da conta, **somente leitura em app**, sem notificações push; T015: central de ajuda local; T016: privacidade da conta explicada, preferências ainda parciais.
- T025: auditoria sanitizada de administração read-only, **sem moderação**; T028: mensagens de indisponibilidade parciais, não rota 404 dedicada.
- T047/T048: portaria com histórico paginado por número do ticket e horário, detalhes parciais.
- Ícone SVG da marca já versionado utilizado em demo e sandbox como **preview do conceito V1**, sem identidade final aprovada.

**QA:** GitHub Actions [run 45305151761](https://github.com/CristianoRFB/RFB-Ticket/actions/runs/45305151761) aprovou frontend, API, Workerd D1 local e navegação Playwright em desktop/mobile. Testes de sandbox público usam Firebase sintético + API interceptada; **não são testes de compra/login autenticado real**. Screenshots oficiais de staging com dados sintéticos e dispositivos físicos ainda NOT_RUN.
