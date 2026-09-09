# 04 · Execução e aceitação

## Sequência recomendada

### Etapa 1 · Fechar contratos e preparar ambiente

Confirmar decisões pendentes do documento 03, inventariar código Muska existente e criar ambiente de teste sem artistas/pagamentos reais. Escolher stack em conjunto com a equipa, sem reescrever desnecessariamente sistemas Muska.

Aceite quando: autenticação de teste, artista autorizado, contrato de página e catálogo de templates definidos. Plano comercial e prazos não devem ser inventados pelo developer.

### Etapa 2 · Fechar o ciclo completo numa página

Ligar Informações básicas, imagens, paleta, seleção, ordem e visibilidade a um único template. Guardar rascunho, reabrir, fazer preview e publicar versão de teste. Separar página publicada de rascunho.

Aceite quando: texto/foto/ordem alterados no backoffice aparecem no preview; público só muda depois de publicar; não perde dados ao trocar template; nenhuma informação privada aparece no HTML público.

### Etapa 3 · Biblioteca e cinco templates

Implementar uploads reais, derivados, álbuns, rider, permissões e downloads. Aplicar o contrato comum aos cinco templates, preservando os layouts distintos. Rever miniaturas partilhadas, recortes e limites de cada template.

Aceite quando: original recuperável; derivado otimizado; ficheiro privado inacessível; imagem reutilizada sem duplicação; cinco templates exibem conteúdo equivalente e respeitam cores, ordem e seleção.

### Etapa 4 · Muska, artistas, áudio/vídeo e eventos

Integrar identidade e catálogos existentes; pesquisa e seleção autorizadas; estados vazio/erro/carregamento/paginação. Links externos com metadados/embeds permitidos. Sincronizar eventos sem duplicados e manter edição fora do criador.

Aceite quando: artista selecionado corresponde ao ID real autorizado; Free aponta para perfil correto; não se cria nova identidade ao mudar de plano; conteúdo removido/privado no catálogo é tratado corretamente.

### Etapa 5 · Booking

Implementar disponibilidade, calendário com eventos, pedido de data específica/flexível, estados e notificações. Rever UX com o proprietário antes de confirmar o calendário como final.

Aceite quando: intervalo inválido/conflito é tratado; pedido não confirma automaticamente data; notas privadas não são expostas; fusos e intervalos que passam a meia-noite funcionam; notificações não duplicam.

### Etapa 6 · Donativos e loja

Integração SISP/Muska em sandbox. Donativos: campanha, identidade opcional do doador, progresso por confirmação real, estados e reembolsos. Loja: catálogo/variantes, carrinho multi-produto, checkout, stock, pagamento, encomenda e entrega.

Aceite quando:

- Preço/total calculados no servidor e moeda explícita.
- Pagamento falhado/cancelado não entrega ficheiro nem confirma encomenda.
- Callback/webhook repetido não duplica cobrança, doação ou stock.
- Compra concorrente não vende stock inexistente.
- Produto digital fica privado antes da compra e disponível apenas ao comprador autorizado depois da confirmação.
- Produto físico exige dados de entrega e mostra portes/prazo/responsabilidade do artista antes da confirmação.
- Gestão acompanha estados de encomenda, envio e casos de devolução/reembolso definidos com o proprietário.
- Progresso de doações e identidade dos doadores refletem apenas dados autorizados/confirmados.

### Etapa 7 · Aprovação final e lançamento

Revisão por módulo, segurança, acessibilidade, desempenho, mobile, backups, monitorização e suporte. Só ativar cada ferramenta quando o seu fluxo estiver aprovado. Pode haver lançamento faseado, mas ferramentas indisponíveis devem ser claramente assinaladas e não cobradas/prometidas como funcionais.

## Checklist visual

- Logo My Page branco no cabeçalho dark; assinatura preservada.
- Ícones Dashboard e My Page distintos e coerentes.
- Informações básicas mantém layout aprovado.
- Sem contorno decorativo dos acordeões; foco acessível sem linha dupla.
- Avisos amarelos e botão de fechar.
- Ordem altera-se no cartão, sem lista duplicada; não perde valores.
- Menus Page/gestão compreensíveis em desktop e mobile.
- Template 04 laranja/creme; 05 com uma fotografia dominante; cinco direções distintas.
- Catálogo público e editor usam as mesmas miniaturas.
- Cores iguais/ilegíveis recusadas; texto sobre imagem permanece legível.
- Ticker inclinado sem vazios em ecrãs largos; motion subtil; reduced-motion respeitado.
- Toolkit sem caixa e sem luz de cursor por baixo; leitura legível, clique/voltar, uso por toque/teclado.

## Checklist funcional local antes de alterar o protótipo

1. Servir `prototipo` em localhost e registar navegador/porta.
2. Preencher perfil, guardar e recarregar.
3. Trocar template e paleta; testar HEX inválido, RGB fora de intervalo e contraste insuficiente.
4. Criar álbum, carregar foto/PDF, descarregar original, selecionar banner e recarregar.
5. Adicionar áudio/vídeo por link e upload; selecionar no criador.
6. Criar/editar evento com cartaz; ver no calendário; definir disponibilidade e testar conflito.
7. Criar campanha e produto de teste; simular encomenda, verificando indicação “não paga”.
8. Confirmar que Publicar não afirma sucesso real e que pesquisa Muska informa integração pendente.

## Limitações conhecidas a corrigir / não copiar para produção

- Templates ainda independentes do conteúdo do editor; Preview não é um preview de rascunho real.
- Há várias camadas históricas de CSS/JS no backoffice. Consolidar componentes e estado ao implementar, preservando o resultado visual.
- Persistência atual depende da origem do browser; não serve múltiplos dispositivos nem múltiplos artistas.
- Formulários e mensagens antigas podem ter diferenças relativamente aos gestores mais recentes: rever todo o texto no QA de integração.
- Não foram executados testes end-to-end completos nesta entrega. Verificação estática não comprova uploads, comportamento visual ou integrações.
- Imagens e perfis demonstrativos/referências não constituem conteúdo comercial autorizado.
- Campos ECV/benefícios de planos presentes nas telas carecem de validação comercial.

## Forma de aprovação

Para cada módulo, apresentar ao proprietário o fluxo completo com dados de teste, listar diferenças face à referência e registar decisão. Não considerar o facto de um botão aparecer na tela como prova de funcionalidade. Fechar as pendências com aceitação explícita antes de ativar em produção.
