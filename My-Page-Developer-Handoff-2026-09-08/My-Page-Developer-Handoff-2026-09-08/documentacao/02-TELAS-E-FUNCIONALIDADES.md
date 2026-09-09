# 02 · Telas, funcionalidades e estado real

## Dashboard

Indicadores pretendidos: visitas, cliques nos conteúdos e pedidos de booking; donativos confirmados quando a ferramenta estiver ativa. Mostrar estados vazios reais, não números inventados. Atalhos para completar perfil, imagens, músicas e booking. Atualmente os indicadores não têm origem de dados.

## Page: Informações básicas

Campos: nome real privado, nome artístico, slug/endereço, cidade, país, géneros, frase de apresentação, biografia e lista de redes/plataformas com URL. Preservar layout aprovado. Normalizar links e slug; nome real/contactos de conta nunca são públicos por omissão.

## Page: Imagens e cores

Escolher template visualmente. Imagens: banner/principal, retrato e logo; cada template declara proporções e zonas de recorte. Biblioteca deve permitir reutilizar imagens do press kit sem novo upload.

Paletas predefinidas por template, alternativas seguras e extração a partir da imagem. Edição por HEX, RGB e seletor. Recusar fundo e destaque sem contraste; calcular texto do botão. No protótipo: mínimo 4,5:1 texto/fundo e 3:1 destaque/fundo. Em produção, verificar também estados hover/foco/desativado e texto sobre fotografia com overlay ou superfície sólida.

Miniaturas atuais: iframes reduzidos dos próprios templates, partilhados entre landing, catálogo e editor. O pedido original prevê imagens de preview; exportar capturas versionadas se essa for a decisão técnica de produção.

## Page: Ordem e visibilidade

Uma única lista de acordeões com setas Subir/Descer e controlo de visibilidade. Reordenar sem perder dados, seleção ou estado de abertura; teclado e mobile suportados. Numeração acompanha a ordem.

`Informações básicas` contém a biografia, mas também configura o hero. `Imagens e cores` é configuração e não uma secção pública. Separar no modelo definitivo `editorOrder` de `sectionOrder`. O protótipo mistura ambos em `layout`; não o transportar sem adaptação. Hero permanece no topo na implementação atual; confirmar se se mantém fixo.

Donativos e loja continuam ocultos no front do protótipo. A ativação final deve depender da disponibilidade real e dos direitos do plano, não apenas de uma checkbox.

## Press kit

Categorias iniciais: fotos de imprensa, fotos ao vivo, logos, vídeos promocionais, visuais LED, biografia/EPK, rider técnico, rider de hospitalidade e stage plot. Permitir álbuns com nome/categoria e evolução para categorias próprias.

Cada categoria pode ter link Google Drive/outro e opção pública. Aviso explícito: qualquer pessoa com o link deve conseguir aceder aos ficheiros. Não exigir integração Google Drive para aceitar links.

Também receber ficheiros no sistema: originais em alta qualidade preservados, derivados leves para exibição, download autorizado do original e seleção para banner/retrato. Visibilidade por álbum e ficheiro; ficheiro privado não pode ser acessível publicamente por URL previsível. Rider: upload PDF ou link e botão de download/abertura.

Protótipo: IndexedDB conserva ficheiros no navegador; canvas gera WebP até 1600 px; limite local de 100 MB por ficheiro. Isto não é armazenamento de produção, antivírus, processamento em servidor ou política comercial de limites. Uploads feitos nos campos antigos fora da biblioteca não persistem.

## Música e sets / Áudio

Objetivo Muska: pesquisar artista, selecionar resultado e associar o ID real à página, trazendo o catálogo autorizado. Confirmar titularidade/gestão do artista, evitar associação arbitrária a qualquer perfil. Pesquisa do protótipo apenas informa que a API está pendente.

Outras plataformas: Spotify, Apple Music, Deezer, YouTube Music, SoundCloud, Mixcloud, TIDAL, Amazon Music, Bandcamp, Audiomack e Muska. Fluxo desejado: escolher plataforma, colar link, identificar tipo/metadados, mostrar logo oficial e integrar player onde permitido. Nas telas atuais, os indicadores são abreviaturas e a maioria dos links abre externamente; isto ainda não é o fluxo final.

Link pode aparecer no hero, só na secção de música ou em ambos. A página escolhe conteúdos da biblioteca; uploads e gestão ficam em Áudio. Servidor deve validar plataformas/URLs e isolar embeds. Não fazer fetch de URLs arbitrárias sem proteção.

## Vídeos

Menu Vídeos: adicionar YouTube/Vimeo ou upload, listar, reproduzir, remover e gerir metadados. Page apenas seleciona quais entram. Protótipo inclui player de link e de ficheiro local. Produção precisa de thumbnails, processamento de formatos, limites, armazenamento e estados de erro. Não duplicar uploads dentro de cada template.

## Eventos

Gestão lateral independente: cartaz (upload/biblioteca ou URL), nome, data/hora, local, descrição e link de bilhetes; criar/editar/remover. Protótipo já permite estes registos locais. Na página, selecionar eventos e controlar posição/visibilidade.

Muska será a origem integrada no futuro. Definir como eventos manuais são migrados/reconciliados para não duplicar registos. Referências de lotes, preços e bilhetes estão na pasta apenas como contexto do Muska Link: não são uma instrução de duplicar o motor de ticketing neste MVP. Compras saem da página; indicar vendedor/responsabilidade do artista conforme conteúdo aprovado.

## Booking

Prioridade: disponibilidade do DJ. Calendário com eventos já existentes e intervalos Disponível, Indisponível e Reserva provisória. Dias sem indicação significam por confirmar. Permitir intervalos com início/fim e nota privada.

Front final: pedir data específica ou pedido aberto/flexível; contacto do promotor, local, contexto e mensagem. Pedido não equivale a reserva confirmada. Gestão pretendida: novo → em contacto → proposta → confirmado/recusado/cancelado. Definir duração, fusos, conflitos e expiração de reservas provisórias.

Protótipo: calendário local e bloqueio de sobreposição de intervalos. Não recebe pedidos públicos, não envia notificações e não resolve conflitos automaticamente com eventos.

## Donativos

Campanha: título, descrição/motivo, vídeo upload ou YouTube/Vimeo, objetivo monetário. Front pretendido: vídeo, pedido, barra de progresso e doadores que escolhem anonimato ou nome público. Progresso deve contar apenas pagamentos confirmados, com regra clara para reembolsos.

Receber via SISP Cabo Verde, ligada à conta Muska. Nenhum contrato de API, credencial ou fluxo de liquidação foi fornecido. Protótipo só guarda campanhas locais; receber está desativado. Não criar dados bancários fictícios nem afirmar que o dinheiro foi recebido.

## Merchandising / loja

Visão completa: vender digital (música, samples, ficheiros) e físico (produtos de merchandising). Entrega física a cargo do artista.

Produto: nome, descrição, imagens, tipo, preço/moeda, variantes, stock, ficheiro digital privado ou regras de envio. Loja real precisa de catálogo, carrinho, checkout, encomenda, pagamento, notificações e área de gestão. Físico: morada, zona/portes, preparação/envio/entrega. Digital: download autorizado depois do pagamento, com política de acesso definida.

Protótipo atual: catálogo, stock informado, uma variante textual, portes, anexos, total e encomenda individual de teste. Não existe carrinho multi-produto, cobrança, reserva de stock, entrega real, fatura, devolução ou gestão completa de vendas. Não apresentar este protótipo como loja operacional. Definir regras comerciais com o proprietário e implementar o ciclo integral descrito no documento 04.

## Pedido de ferramenta

Nome, descrição e referências PDF/imagens. Dentro do backoffice, contacto vem da conta; email/telefone foram retirados. Receção interna, confirmação, histórico e resposta ainda pendentes. Fora da conta, na landing, será necessário recolher contacto.

## Resumo de maturidade

| Área | Existe nesta entrega | Falta para funcionamento real |
| --- | --- | --- |
| Landing / templates | HTML, estilos e interação demonstrativa | Renderizar dados publicados e QA completa |
| Editor | Campos, ordem e rascunho local | Backend, validação, preview fiel, publicação |
| Biblioteca | Originais/derivados locais | Storage partilhado, acesso, processamento seguro |
| Áudio/vídeo | Links, seleção, uploads e reprodução local | Catálogo Muska, metadados, formatos de produção |
| Eventos | CRUD local e seleção | API, sincronização, permissões |
| Booking | Intervalos e calendário local | Pedidos, estados, notificações, conflitos completos |
| Donativos | Campanhas locais | SISP, progresso real, doadores e reconciliação |
| Loja | Catálogo e encomenda de teste | Comércio completo, pagamentos e entregas |
| Artistas | Página de seleção parcial | Catálogo real com pesquisa/paginação |
