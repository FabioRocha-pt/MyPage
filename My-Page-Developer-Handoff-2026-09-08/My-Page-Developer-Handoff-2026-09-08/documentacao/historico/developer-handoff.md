# My Page · Base de testes e integração

Estado: protótipo local. Este documento é uma base para revisão conjunta, não um contrato de API já implementado.

## O que testar agora

- Navegação Dashboard → My Page → Page e menus de gestão.
- Abertura de acordeões, ordem através das setas e visibilidade.
- Preenchimento de campos, adição/remoção de links e conteúdos.
- Atualizar página e reabrir no mesmo navegador para verificar o rascunho.
- Seleção de imagens e extração de paleta local. Ficheiros não persistem após recarregar.
- Temas claro/escuro e tamanhos de ecrã.
- Preview abre o template escolhido com dados de demonstração, não com os dados do editor.
- Explorar artistas abre https://muskalive.com. Destino solicitado pelo proprietário; disponibilidade não verificada nesta revisão.

Preferir um servidor local com endereço e porta estáveis para os testes seguintes. O armazenamento pertence à origem do navegador: um rascunho criado num ficheiro local não migra automaticamente para localhost ou staging.

## Fluxo alvo

O artista entra na conta Muska, seleciona a sua página, altera conteúdo e configuração, guarda um rascunho, faz preview e publica uma versão aprovada. O público vê apenas a versão publicada. Alterações posteriores no rascunho não devem mudar a página pública antes de nova publicação.

## Ligações a implementar

| Área | Origem / responsabilidade | Estado atual |
| --- | --- | --- |
| Conta e artista | Identidade Muska e permissões por artista | Sem autenticação |
| Perfil e redes | Campos My Page; separar nome real privado de informação pública | Rascunho local |
| Imagens e cores | Upload persistente, permissões, validação e referências de ficheiros | Preview local |
| Template | Mesmos dados públicos consumidos pelos cinco layouts | Demonstrações independentes |
| Ordem e visibilidade | Lista ordenada `layout: [{id, visible}]` | Guardada no navegador |
| Press kit | Links públicos autorizados e ficheiros | Campos locais |
| Música e vídeo | Catálogo Muska e links externos selecionados | Sem ligação ao catálogo |
| Eventos | Conteúdos Muska Link; sem duplicar gestão de eventos/bilhetes no editor | Posição e visibilidade locais |
| Booking | Serviço próprio de pedidos, calendário, estados e notificações | Brevemente |
| Donativos e merchandising | Gestão dedicada e pagamentos | Brevemente; ocultos |
| Pedido de ferramenta | Receção pela equipa, anexos e acompanhamento | Revisão local; não envia |
| Dashboard | Métricas reais de páginas e ferramentas | Sem dados reais |

Imagens e cores é um bloco de configuração: a sua ordem no editor não cria uma secção no site. `biography` corresponde ao conteúdo biográfico de Informações básicas; o hero continua no topo. O developer deve distinguir ordenação do editor e ordenação de conteúdo público no contrato definitivo.

## Próximo teste integrado, sem publicação pública

1. Ligar o editor a um preview local de um template usando os mesmos dados, ordem e visibilidade.
2. Validar alterações de texto, imagem, links e secções sem afetar nenhum artista real.
3. Confirmar o contrato de dados e aplicar aos restantes templates.
4. Integrar autenticação, base de dados, uploads e APIs Muska num ambiente de testes separado.
5. Testar guardar → recarregar → preview → publicar em staging, incluindo permissões e erros.

Não é necessário lançar publicamente para testar. Testes completos precisam de serviços reais ou de teste ligados; alojar apenas os HTML não cria essas integrações.

## Decisões pendentes para o developer

- Documentação e acesso de teste às APIs Muska, incluindo identidade e catálogo por artista.
- Endereço final, regras de slug e verificação de disponibilidade do subdomínio.
- Funcionalidades de cada plano e limites definidos no servidor.
- Regras de publicação, rascunho, recuperação de versão e campos públicos/privados.
- Destinos e permissões dos ficheiros e pedidos; limites e formatos de upload.
- Definição das métricas, consentimentos e retenção de dados.

Critério de passagem para produção: dados persistentes, isolamento entre artistas, uploads validados, preview fiel ao publicado e testes das integrações aprovados. O botão Publicar do protótipo não publica conteúdo.
