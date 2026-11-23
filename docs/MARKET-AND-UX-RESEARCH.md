# RFBTicket — pesquisa inicial de mercado e experiência

Pesquisa realizada em 22/11/2026, com páginas oficiais dos fornecedores; informações sobre preços comerciais e taxas específicas NÃO foram validadas. Comparação funcional/UX, não benchmark quantitativo nem endosso.

## Referências relevantes

### Sympla (Brasil)
- Apresenta controle de entrada por QR e por busca manual, além de organização por tipos/lotes de ingresso.
- O app do organizador permite visualização dos ingressos e concessão de acesso por aparelho/portaria.
- Fontes: https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15445755766925-Como-controlar-a-entrada-de-participantes-no-dia-do-evento-Check-in-online e https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15445887306509-Como-utilizar-o-aplicativo-Sympla-Organizador-Android

### Ingresse (Brasil)
- Produto de controle de entrada para operadores na portaria, com consulta e validação por QR; help center descreve QR dinâmico nos ingressos do aplicativo.
- Fonte: https://sobre.ingresse.com/controle-de-entrada e https://meajuda.ingresse.com/support/solutions/articles/8000121264-ver-meus-ingressos
- Atenção: QR dinâmico de terceiro não é requisito já especificado do nosso produto, e não substitui validação transacional; não copiar implementação sem análise.

### Ticket Tailor (internacional)
- App de check-in com QR e busca por pedido; permissões de acesso a eventos podem limitar operadores.
- Ajuda oficial também documenta operação offline; isso exige análise própria de risco e reconciliação antes de prometer funcionalidade equivalente no RFBTicket.
- Fontes: https://help.tickettailor.com/en/articles/5151698-how-to-check-in-your-attendees-with-the-check-in-app-at-your-event e https://help.tickettailor.com/en/articles/5151814-preparing-your-check-in-app-before-your-event e https://help.tickettailor.com/en/articles/5028380-how-to-see-your-check-in-data

## Síntese de UX (hipóteses a testar)

1. Portaria mobile precisa ação primária claramente visível, resultado válido/inválido inequívoco, prevenção de dupla leitura e fallback por busca manual sob controle de permissão.
2. Eventos devem apresentar local, horário, lotes, disponibilidade, regras e estado de erro antes de pedir pagamento.
3. Organizador e fiscal não devem compartilhar interface administrativa nem acesso genérico; permissões por evento/portaria são requisito de segurança.
4. RFBTicket pode focar simplicidade para pequenos organizadores e teste de uso único; isso é uma HIPÓTESE DE POSICIONAMENTO, não diferencial competitivo provado.
5. Testar com usuários reais somente depois de ter demo executável, consentimento e plano de testes sem PII; nenhuma entrevista de usuário foi realizada.

## Decisões de não-cópia e custo

- Não copiar artes, telas, textos, marcas, QR proprietários nem reproduzir comportamento externo sem licença.
- Focar primeiro em F01–F02 sintéticos e F07 seguro no Emulator; checkout sandbox posterior.
- Preço de software, taxa por ingresso, contratos e limites de cada concorrente: NAO_VERIFICADO; não inferir que a ferramenta é gratuita.
- Firebase Spark e Cloudflare Free verificados como planos com cotas; não é garantia de projeto completo sempre a R$0. Fontes oficiais: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans e https://developers.cloudflare.com/workers/platform/limits/.
