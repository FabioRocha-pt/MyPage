# My Page · Ajustes do backoffice

## Navegação

Dashboard e My Page permanecem no menu lateral. Dentro de My Page, os separadores horizontais são: Editor da página, Press kit, Músicas e sets, Vídeos, Booking, Eventos, Donativos, Store e Pedir ferramenta.

## Editor da página

Informações básicas e imagens/cores continuam em acordeões. A ordem das secções públicas é configurada com botões Subir e Descer, utilizáveis também pelo teclado. Cada secção tem um controlo de visibilidade. O hero permanece no topo; Donativos e Store ficam ocultos e indisponíveis nesta fase.

A ordem e a visibilidade são guardadas ao clicar em Guardar rascunho, no armazenamento deste navegador. Os templates públicos ainda não leem esta configuração. Não existe publicação ou sincronização com uma API nesta versão.

## Ferramentas

- Press kit, músicas, vídeos e pedido de ferramenta mantêm os campos do protótipo.
- Booking tem um separador próprio. A gestão de calendário, pedidos e confirmações está marcada Brevemente. Tornar a secção visível no rascunho não ativa um serviço de receção de pedidos.
- Eventos são geridos no Muska Link. O editor My Page apenas configura posição e visibilidade. Não duplica formulários de eventos, lotes ou bilhetes. A ligação ao gestor está pendente e o botão permanece desativado.
- Donativos e Store/merchandising têm separadores Brevemente, sem edição nem pagamentos ativos.

## Visual

Botão lateral sem contorno decorativo cyan; campos com uma única borda no foco; avisos com fundo amarelo discreto, contorno tracejado, ícone e botão de fechar. Modos claro e escuro mantidos.

## Próxima integração

Definir um contrato partilhado para a lista ordenada de secções com `id` e `visible`; guardar por artista no servidor e fazer cada template consumir essa lista. Integrar conteúdos Muska por identificadores e permissões, sem duplicar a gestão existente.
