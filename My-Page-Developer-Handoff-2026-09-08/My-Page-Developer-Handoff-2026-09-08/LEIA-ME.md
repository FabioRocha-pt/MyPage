# My Page · Entrega ao developer

Data: 8 de setembro de 2026. Produto: **My Page · Powered by Muska**.

Esta pasta reúne as telas atuais, os assets, as referências disponíveis e a especificação consolidada da visão discutida. O objetivo é transformar o protótipo numa plataforma real, preservando a direção aprovada. Não é código pronto para produção nem um sistema já ligado ao Muska.

## Ler nesta ordem

1. [Visão e decisões finais](documentacao/01-PRODUTO-E-DECISOES.md).
2. [Telas, funcionalidades e estado real](documentacao/02-TELAS-E-FUNCIONALIDADES.md).
3. [Arquitetura, dados e integrações propostas](documentacao/03-ARQUITETURA-E-INTEGRACOES.md).
4. [Plano de execução e critérios de aceitação](documentacao/04-IMPLEMENTACAO-E-TESTES.md).
5. [Referências e inventário](referencias/LEIA-ME.md).

Os documentos 01–04 são a fonte consolidada desta entrega. Os ficheiros em `documentacao/historico` documentam a evolução, podem conter direções substituídas e **não devem prevalecer** sobre estes quatro documentos. Quando o comportamento do protótipo divergir da especificação, consultar a coluna de pendências; não transformar uma limitação do protótipo numa decisão de produto.

## Abrir as telas

- [Landing page](prototipo/index.html).
- [Backoffice](prototipo/backoffice.html).
- [Catálogo de templates](prototipo/templates.html).
- [Listagem local de artistas](prototipo/artists.html).
- [Template 01](prototipo/dj-template-01.html), [02](prototipo/dj-template-02.html), [03](prototipo/dj-template-03.html), [04](prototipo/dj-template-04.html), [05](prototipo/dj-template-05.html).

Para testar, usar um servidor estático local a partir de `prototipo`, por exemplo `python3 -m http.server 8080`, e abrir `http://localhost:8080/backoffice.html`. Manter a mesma porta e o mesmo navegador durante os testes. Não é necessário publicar na internet.

## O que esta entrega contém e o que não contém

Contém HTML/CSS/JavaScript editáveis, cinco templates, logo vetorial, imagens usadas nas telas, referências visuais disponíveis e documentação consolidada. Os formulários básicos, ordem de secções e vários fluxos locais estão prototipados.

Não contém backend, base de dados partilhada, autenticação, credenciais, APIs privadas Muska/SISP, contratos de pagamento, deploy, domínio configurado, encomendas reais ou publicação funcional. Também não contém os dados que alguém tenha introduzido no navegador: esses dados e uploads locais não ficam dentro dos HTML.

O botão Preview ainda abre conteúdo demonstrativo. A primeira integração a fazer é editor → dados comuns → preview de um template → versão publicada.

## Limitações de validação

Foram verificadas sintaxe JavaScript, referências locais essenciais e regras de contraste das cinco paletas. Não existe uma certificação funcional ou visual completa. Executar os testes do documento 04 antes de aprovar cada fluxo.

## Como trabalhar com o proprietário

Validar por módulo: Imagens e cores → Press kit → Áudio/Vídeo → Eventos/Booking → Donativos/Loja. Não redesenhar Informações básicas nem alterar a identidade sem aprovação. Fechar decisões em aberto com o proprietário antes de definir regras comerciais ou pagamentos.
