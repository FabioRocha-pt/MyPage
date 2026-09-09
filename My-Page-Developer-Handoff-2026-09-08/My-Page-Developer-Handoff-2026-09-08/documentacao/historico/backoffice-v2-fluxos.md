# My Page · Backoffice V2

## Estrutura

Dashboard: resultados reais da página quando as APIs estiverem ligadas. Sem números demonstrativos.
My Page: editor organizado em sanfonas, uma por secção / ferramenta.

1. Informações básicas: nome real privado, nome artístico, subdomínio pretendido, localização, géneros, apresentação, biografia e lista de links públicos.
2. Imagens e cores: templates 01–05, banner, retrato, logo, tema e paleta extraída localmente. As cores são sugestões e podem ser ajustadas.
3. Press kit: pasta partilhada, rider, descrição e seleção de ficheiros.
4. Músicas: conteúdos Muska ou links externos, com título, origem e destaque.
5. Vídeos: conteúdos Muska ou links externos.
6. Booking: calendário para pedir uma data e/ou pedido de datas flexíveis. Um pedido não confirma uma reserva.
7. Eventos: ligação Muska Tickets ou inserção manual de evento, cartaz e link de compra externo. Aviso de responsabilidade visível.
8. Donativos: campanha, objetivo, descrição, vídeo e link de apoio. Progresso e lista pública virão de pagamentos confirmados. Identidade pública ou anonimato por escolha do doador.
9. Pedido de ferramenta: título, problema, anexos e contactos. Destino futuro: equipa My Page, separado dos pedidos de booking do artista.

## O que funciona no protótipo

Navegação, sanfonas, modo claro/escuro, listas editáveis, rascunho local de texto/configurações, seleção e pré-visualização de ficheiros e extração de cores. Ficheiros não ficam guardados após recarregar. Nome real, contactos e rascunhos ficam neste navegador apenas ao guardar.

Ver template abre os HTML existentes com conteúdo de demonstração, não com o rascunho do editor. Nenhum subdomínio é registado. Nenhum pedido é enviado e nenhum pagamento é processado.

## Contratos a fechar antes de implementar o backend

- Conta e propriedade da página; separação de informação pública e privada.
- Subdomínio no formato artista.muska.cv, verificação de disponibilidade e publicação.
- Rascunho / pré-visualização / versão publicada comuns a todos os templates.
- Upload persistente, limites, validação de formatos e permissões de acesso aos ficheiros.
- APIs Muska Music, Video e Tickets; origem e atualização dos conteúdos.
- Booking: pedidos, disponibilidade, notificações e estados de confirmação.
- Eventos externos: destino dos bilhetes e informação do vendedor.
- Donativos: pagamentos confirmados, reembolsos, total líquido a apresentar e consentimento para nome público. Links externos não atualizam automaticamente o progresso.
- Pedidos de ferramentas: receção pela equipa, anexos, estado e resposta.

Design inspirado nas referências Muska fornecidas: base #19233A, painéis azul-escuro e destaque cyan #2DCEEF / #2EA2F0.
