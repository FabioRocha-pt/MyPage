# 01 · Produto e decisões consolidadas

## Visão

My Page dá ao artista uma página pública profissional e um backoffice para alimentar essa página, selecionar ferramentas e acompanhar a sua atividade. Música, vídeo, artistas e eventos devem aproveitar o ecossistema Muska. A mesma identidade de artista deve ligar página Free e futuras páginas pagas, sem criar perfis duplicados.

Percurso pretendido: criar a página → escolher ferramentas → monetizar → crescer na carreira → encontrar parcerias → divulgar a marca. Quando faltar uma ferramenta, o artista pode descrever a necessidade à equipa. Não existe ainda uma especificação funcional de marketplace de parcerias; é visão de evolução, não uma funcionalidade já construída.

Público inicial: DJs e MCs. Expansão: cantores, músicos e outros artistas; clubs/venues. Começar pelo fluxo DJ e preservar um modelo extensível. Não anunciar suporte completo a todos os públicos antes de existirem os respetivos fluxos.

## Marca e design

- Produto: **My Page**. Assinatura: **Powered by Muska**.
- Logo: SVG fornecido pelo proprietário. No backoffice aparece em branco por CSS; não foi redesenhado. Manter o original e a geometria.
- Backoffice na linha Muska Link: base azul-escuro `#19233A`, superfícies próximas das referências e botões de destaque `#2EA2F0` → `#2DCEEF`.
- Modos claro e escuro, incluindo contraste dos ícones e campos.
- Ícones distintos: Dashboard com painel/indicadores; My Page com página/perfil. Traço arredondado coerente com a referência, não caracteres tipográficos genéricos.
- Sem contorno decorativo nos cartões dos acordeões. Foco dos campos com uma única indicação visível; preservar navegação por teclado.
- Avisos amarelos com linha tracejada, ícone e opção de fechar.
- Remover os pequenos traços decorativos que precediam títulos e evitar texto genérico com aparência artificial.

## Landing page

Manter fundo navy, glows laranja/azul em movimento subtil, revelação suave durante scroll e ticker ligeiramente inclinado, contínuo e sem espaços vazios em ecrãs largos. Respeitar preferência de movimento reduzido.

Toolkit: baralho sem caixa de fundo, glows/blur ambientais preservados. Remover o antigo texto lateral “AS YOUR TOOLKIT” e a iluminação do cursor por baixo das cartas. Conteúdo legível; clique abre detalhes ao lado, segundo clique/voltar repõe listagem. Mobile não depende de hover.

Secção de pedido de ferramenta abaixo do toolkit: nome, descrição, referências/anexos e contacto quando não autenticado. Dentro do backoffice, não pedir novamente email/telefone: usar a conta autenticada.

Catálogo de templates público e backoffice devem partilhar as mesmas miniaturas e identificadores. Atualmente usam previews vivos dos HTML, não PNGs estáticos. Se forem necessárias capturas em produção, gerá-las a partir dos templates e versioná-las no mesmo catálogo, sem duplicar manualmente.

## Planos

Preços pedidos: **Free limitado**, **€25/mês** e **€50/mês**. Nomes Pro/Premium e listas de benefícios presentes nas telas são material a validar. Os limites exatos, acesso por ferramenta, armazenamento, comissões e regras de downgrade não foram aprovados em detalhe.

Há valores ECV nas telas demonstrativas. Não os tratar como preços ou conversões aprovados; confirmar com o proprietário antes de integrar faturação. Não implementar regras comerciais a partir de uma leitura implícita do HTML.

## Artistas e endereços

- “Explorar artistas” deve abrir `https://muskalive.com`, conforme último pedido. Não trocar automaticamente pelo domínio de referência anterior.
- Referências históricas: `https://www.muska.live/en/artists` e o perfil Free indicado em `referencias/LEIA-ME.md`.
- Deve existir uma listagem de artistas que trabalham com Muska/My Page, alimentada pelo catálogo real, com pesquisa, imagens e paginação. A página local atual contém apenas uma seleção demonstrativa, não o catálogo completo.
- O pedido de subdomínio foi interpretado no protótipo como `nomedoartista.muska.cv`. Confirmar domínio e formato final; validar disponibilidade e propriedade antes de publicar.
- Free deve aproveitar o perfil existente. Plano pago usa a mesma identidade com template e ferramentas autorizadas.

## Navegação final do backoffice

Dashboard e My Page na lateral. Ao entrar em My Page, mostrar:

- **Page**: criador e publicador, com todos os acordeões e seleção de conteúdos.
- **Áudio** e **Vídeos**: bibliotecas e gestão de conteúdos.
- **Eventos**: gestão separada de eventos.
- **Booking**: disponibilidade, calendário e futura gestão de pedidos.
- **Donativos** e **Merchandising**: gestão própria; não ativar pagamentos sem integração.

Em Page, ordenar no próprio cartão, sem uma segunda secção “Ordem da página”. Press kit, músicas/sets, vídeos e restantes ferramentas aparecem na mesma listagem. Cada uma abre para configuração/seleção. Informações básicas foi aprovada e deve ser preservada.

Atualizar página, Preview e Publicar no fundo. A versão final deve guardar rascunho, mostrar preview fiel e publicar explicitamente. Não confundir guardar com publicar.

## Alterações de decisão importantes

| Tema | Pedido anterior | Decisão mais recente |
| --- | --- | --- |
| Ferramentas | Separadores horizontais em My Page | Conteúdo no criador em acordeões; gestão avançada em submenus laterais |
| Ordem | Lista de ordenação separada | Controlos no próprio cartão |
| Eventos | Apenas gestão externa Muska | Gestor simples local agora; integração automática Muska depois; Page só seleciona |
| Donativos/loja | Só Brevemente | Prototipar gestão; funcionalidades reais dependem das integrações |
| Template 04 | Parecido com 01/noturno | Direção Ember, laranja/creme, seguindo referência fornecida |
| Contactos do pedido | Email/telefone em todo o lado | No backoffice reutilizar os contactos da conta |

## Templates

01: hero panorâmico/imersivo. 02: editorial dividido. 03: direção editorial crua, tipografia forte; referência inicial Lucky Done Gone. 04: Ember, laranja/creme, página enquadrada e composição assimétrica. 05: retrato único dominante, grelha e painéis sobre a fotografia.

Os cinco devem ter look and feel realmente distintos, mas consumir os mesmos dados. Fotos e nomes de demonstração não representam clientes ou conteúdos aprovados para produção. Revisar direitos de imagens, marcas e referências antes do lançamento; referências visuais não autorizam copiar identidade ou conteúdo de terceiros.
