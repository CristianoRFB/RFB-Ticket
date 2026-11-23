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
| T001 | Landing / apresentação | `NOT_IMPLEMENTED` |
| T002 | Cadastro / criar conta | `NOT_IMPLEMENTED` |
| T003 | Login e recuperar acesso | `NOT_IMPLEMENTED` |
| T004 | Onboarding e perfil | `NOT_IMPLEMENTED` |
| T005 | Página principal / feed | `NOT_IMPLEMENTED` |
| T006 | Busca e filtros | `NOT_IMPLEMENTED` |
| T007 | Detalhes do recurso | `NOT_IMPLEMENTED` |
| T008 | Fluxo de criação | `NOT_IMPLEMENTED` |
| T009 | Fluxo de edição | `NOT_IMPLEMENTED` |
| T010 | Confirmação / revisão | `NOT_IMPLEMENTED` |
| T011 | Estado concluído / recibo | `NOT_IMPLEMENTED` |
| T012 | Lista pessoal / histórico | `NOT_IMPLEMENTED` |
| T013 | Notificações | `NOT_IMPLEMENTED` |
| T014 | Mensagens ou contato | `NOT_IMPLEMENTED` |
| T015 | Central de ajuda | `NOT_IMPLEMENTED` |
| T016 | Preferências e privacidade | `NOT_IMPLEMENTED` |
| T017 | Acesso e segurança | `NOT_IMPLEMENTED` |
| T018 | Página vazia / primeira vez | `NOT_IMPLEMENTED` |
| T019 | Carregamento e skeleton | `NOT_IMPLEMENTED` |
| T020 | Erro de rede / retentar | `NOT_IMPLEMENTED` |
| T021 | Sem permissão / bloqueio | `NOT_IMPLEMENTED` |
| T022 | Estado de conflito concorrente | `NOT_IMPLEMENTED` |
| T023 | Admin: visão geral | `NOT_IMPLEMENTED` |
| T024 | Admin: gestão de usuários | `NOT_IMPLEMENTED` |
| T025 | Admin: moderação e auditoria | `NOT_IMPLEMENTED` |
| T026 | Admin: regras e configurações | `NOT_IMPLEMENTED` |
| T027 | Admin: relatórios | `NOT_IMPLEMENTED` |
| T028 | Página 404 / recurso indisponível | `NOT_IMPLEMENTED` |
| T029 | Módulo / Eventos — lista | `NOT_IMPLEMENTED` |
| T030 | Módulo / Eventos — detalhe | `NOT_IMPLEMENTED` |
| T031 | Módulo / Eventos — criar/editar | `NOT_IMPLEMENTED` |
| T032 | Módulo / Lotes e capacidade — lista | `NOT_IMPLEMENTED` |
| T033 | Módulo / Lotes e capacidade — detalhe | `NOT_IMPLEMENTED` |
| T034 | Módulo / Lotes e capacidade — criar/editar | `NOT_IMPLEMENTED` |
| T035 | Módulo / Checkout — lista | `NOT_IMPLEMENTED` |
| T036 | Módulo / Checkout — detalhe | `NOT_IMPLEMENTED` |
| T037 | Módulo / Checkout — criar/editar | `NOT_IMPLEMENTED` |
| T038 | Módulo / Emissão de ingressos — lista | `NOT_IMPLEMENTED` |
| T039 | Módulo / Emissão de ingressos — detalhe | `NOT_IMPLEMENTED` |
| T040 | Módulo / Emissão de ingressos — criar/editar | `NOT_IMPLEMENTED` |
| T041 | Módulo / Meus ingressos — lista | `NOT_IMPLEMENTED` |
| T042 | Módulo / Meus ingressos — detalhe | `NOT_IMPLEMENTED` |
| T043 | Módulo / Meus ingressos — criar/editar | `NOT_IMPLEMENTED` |
| T044 | Módulo / Leitor de QR — lista | `NOT_IMPLEMENTED` |
| T045 | Módulo / Leitor de QR — detalhe | `NOT_IMPLEMENTED` |
| T046 | Módulo / Leitor de QR — criar/editar | `NOT_IMPLEMENTED` |
| T047 | Módulo / Check-in — lista | `NOT_IMPLEMENTED` |
| T048 | Módulo / Check-in — detalhe | `NOT_IMPLEMENTED` |
| T049 | Módulo / Check-in — criar/editar | `NOT_IMPLEMENTED` |
| T050 | Módulo / Reembolso — lista | `NOT_IMPLEMENTED` |
| T051 | Módulo / Reembolso — detalhe | `NOT_IMPLEMENTED` |
| T052 | Módulo / Reembolso — criar/editar | `NOT_IMPLEMENTED` |
| T053 | Módulo / Painel do organizador — lista | `NOT_IMPLEMENTED` |
| T054 | Módulo / Painel do organizador — detalhe | `NOT_IMPLEMENTED` |
| T055 | Módulo / Painel do organizador — criar/editar | `NOT_IMPLEMENTED` |
| T056 | Módulo / Relatórios — lista | `NOT_IMPLEMENTED` |
| T057 | Módulo / Relatórios — detalhe | `NOT_IMPLEMENTED` |
| T058 | Módulo / Relatórios — criar/editar | `NOT_IMPLEMENTED` |

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

**Status no RFB Method:** `SCREEN_CATALOG_IMPORTED / ORIGINAL_DESIGN_REFERENCED / BROWSER_QA_NOT_RUN`.
