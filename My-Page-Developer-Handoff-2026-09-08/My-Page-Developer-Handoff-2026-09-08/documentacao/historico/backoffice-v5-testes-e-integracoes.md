# My Page · Revisão 5

Protótipo local para validar telas e fluxos. Este documento complementa e atualiza as descrições anteriores de funcionalidades Brevemente. Não é uma loja pronta para comercialização.

## Implementado nesta revisão

### Imagens e cores

- Cinco miniaturas dos próprios templates, com seleção e abertura em tamanho real. São previews vivos em miniatura, não capturas PNG. Backoffice, landing page e catálogo público reutilizam o mesmo catálogo.
- Paleta original por template e alternativas Midnight, Studio e Mono.
- HEX, RGB e seletor visual. Combinações com contraste insuficiente são recusadas: texto/fundo 4,5:1 e destaque/fundo 3:1. Texto do botão calculado conforme a cor do botão.
- Cores extraídas da imagem são combinadas com fundo e texto de contraste seguro.
- Seleção de banner/retrato a partir da biblioteca local.
- As regras ainda precisam de ser aplicadas pelos templates públicos e pelo servidor. Não garantem contraste de texto colocado sobre qualquer fotografia: será necessário overlay ou área sólida no renderer.

### Press kit

- Links de fotos de imprensa, fotos ao vivo, logos, vídeos promocionais, visuais LED, biografia/EPK, rider técnico, hospitalidade e stage plot.
- Aviso de acesso aberto a quem possui o link; a aplicação não verifica permissões Google Drive nesta fase.
- Álbuns por categoria, upload local, visibilidade por álbum e por ficheiro.
- Originais preservados em IndexedDB e versões WebP com dimensão máxima de 1600 px. Um WebP não é garantidamente menor para todos os ficheiros.
- Riders PDF com download local; links externos abrem o documento, sem prometer download forçado entre domínios.

### Áudio e vídeo

- Menus laterais separados para upload, links, reprodução e remoção local.
- O criador da página seleciona os conteúdos já existentes na biblioteca.
- YouTube e Vimeo com player incorporado; outros links abrem na plataforma.
- Músicas: Muska, Spotify, Apple Music, Deezer, YouTube Music, SoundCloud, Mixcloud, TIDAL, Amazon Music, Bandcamp e Audiomack. Opção hero, secção de música ou ambos.
- Os indicadores das plataformas ainda são abreviaturas, não logos oficiais. Integrações de players de áudio/oEmbed e pesquisa real de artistas Muska estão pendentes.
- Pesquisa Muska exibe aviso de API indisponível; não cria associações fictícias.

### Eventos e Booking

- Criar, editar e remover eventos locais com nome, data, local, descrição, cartaz e link de bilhetes.
- Selecionar os eventos no criador da página sem duplicar a sua edição.
- Calendário mensal apresenta eventos e intervalos de disponibilidade, indisponibilidade ou reserva provisória.
- Valida fim posterior ao início e impede sobreposição entre intervalos de disponibilidade. Dias não definidos significam por confirmar.
- Não há sincronização Muska, pedidos reais, notificações, fusos por utilizador ou resolução automática de conflitos entre um evento e uma disponibilidade.

### Donativos e merchandising

- Campanhas locais com motivo, objetivo em CVE e vídeo por link ou biblioteca. Receber via SISP está desativado.
- Produtos digitais/físicos com descrição, preço, stock, variante, portes, entrega e ficheiros/imagens.
- Simulação de encomenda com total e verificação básica do stock físico informado. Registos marcados como teste/não pagos, sem dedução ou reserva de stock.
- Não há checkout real, carrinho multi-produto, autenticação de comprador, envio, entrega digital segura, reembolsos, impostos, inventário transacional ou confirmação de pagamento. Estas partes são necessárias para um sistema de vendas completo.
- Donativos e loja continuam indisponíveis na página pública enquanto não existir integração real.

### Pedido de ferramenta

Nome e descrição mantidos; email e telefone retirados da tela. No sistema final serão obtidos da conta autenticada. O protótipo não envia o pedido.

## Roteiro de revisão conjunta

1. Abrir My Page → Page → Imagens e cores. Comparar as cinco bases, trocar paleta e tentar colocar fundo e botão iguais: deve recusar.
2. Criar um álbum, adicionar uma fotografia, descarregar o original e usar como banner. Reabrir a página no mesmo navegador para conferir a biblioteca.
3. Carregar um PDF em Riders e testar o download.
4. Adicionar vídeo em Vídeos; voltar a Page e selecionar esse vídeo. Testar um link YouTube/Vimeo e um ficheiro local.
5. Criar evento com cartaz; selecionar no criador e confirmar que aparece no calendário Booking.
6. Guardar um intervalo de disponibilidade e tentar outro sobreposto.
7. Criar campanha e produto de teste; simular encomenda. Confirmar que não é cobrado dinheiro.

Usar dados de teste. O armazenamento é específico do navegador e da origem; limpar dados do navegador pode apagar originais e rascunhos. Não é um arquivo ou backup de produção. Preferir localhost com porta estável para os testes integrados seguintes.

## Contratos a fechar com o developer

- Uma identidade Muska por artista, permissões e conta de pagamentos sem exposição de credenciais no cliente.
- `pageDraft` e `publishedPage` separados; renderer comum aos templates para seleção, ordem, visibilidade e cores.
- Media: proprietário, original privado, derivados públicos, tipo, dimensão, tamanho, estado de processamento e direitos de uso. Serviços de validação e otimização no servidor.
- Álbuns e visibilidade com controlo real de acesso; nunca servir um original privado apenas porque a URL é conhecida.
- IDs de conteúdos/artistas/eventos Muska, pesquisa, sincronização, paginação e erros de integração.
- Booking com timezone, pedidos, calendário, conflitos, expiração de reservas provisórias e notificações.
- SISP: contrato de API e ambiente de testes, webhook verificado, idempotência e reconciliação. Nunca considerar um pagamento confirmado por retorno do browser.
- Loja: carrinho, checkout, encomendas, stock reservado atomicamente, estados, portes e responsabilidade de envio do artista. Downloads digitais autorizados apenas após pagamento confirmado.
- Logs, suporte, proteção de dados, termos e testes de isolamento entre artistas.

## Verificação feita

Sintaxe JavaScript e referências dos assets locais verificadas. As cinco paletas passaram os testes automáticos de contraste. Não foi feita uma nova validação visual/interativa em navegador nesta revisão; o roteiro acima permanece por executar com o utilizador.
