# 03 · Arquitetura e integrações

**Proposta de implementação, não APIs existentes.** O developer deve adaptar estes contratos ao backend Muska. Não foi fornecido repositório, stack, documentação privada ou credenciais Muska/SISP. Não inferir endpoints a partir dos URLs públicos.

## Arquitetura alvo

Backoffice autenticado lê/escreve rascunhos e conteúdos por artista. Um serviço My Page valida permissões, guarda dados e publica snapshots. Os cinco templates usam um renderer de secções comum com apresentações distintas. Catálogo Muska fornece identidade, áudio, vídeo e eventos quando ligado. Storage conserva originais privados e derivados públicos autorizados. Pagamentos atualizam encomendas/campanhas apenas por confirmação validada no servidor.

O front público nunca deve ler diretamente o armazenamento do browser do artista. Preview lê rascunho autorizado; público lê exclusivamente a versão publicada. Guardar não altera a página pública. Publicar deve ser atómico e permitir recuperar uma versão anterior.

## Entidades mínimas propostas

| Entidade | Dados essenciais / relação |
| --- | --- |
| Account / membership | Conta Muska, artist_id, papel e permissões |
| Artist | ID Muska, nome artístico, campos públicos e privados separados |
| PageDraft | Artist_id, slug, template_id, theme, paleta, image_refs, editor_order, sections, version |
| PublishedPage | Snapshot validado, published_at, versão, domínio/slug |
| Section | ID estável, tipo, enabled, position e referências de conteúdos |
| Media | Owner, tipo MIME, original, derivados, tamanho/dimensões, estado, visibilidade |
| Album | Nome, categoria, owner, visibilidade, media_ids e ordenação |
| ExternalLink | Plataforma, URL normalizada, posição hero/secção/ambos e metadados |
| Event | Owner, source, external_id, cartaz, data/timezone, local, texto e tickets_url |
| Availability | Artist_id, início/fim/timezone, available/busy/hold e nota privada |
| BookingRequest | Promotor/contacto, datas específicas ou flexíveis, contexto e estado |
| Campaign / donation | Campanha, vídeo, objetivo, pagamento confirmado e preferência pública do doador |
| Product / variant | Tipo, imagens, preço minor units/moeda, stock, ficheiro privado ou envio |
| Order / orderItem | Snapshot de preço/produto, comprador, totais, entrega e estados |
| Payment | Provider, referência, idempotency_key, moeda/valor e estado verificado |
| ToolRequest | Account_id, título, descrição, anexos e estado/resposta |
| PlanEntitlement | Plano, limites e ferramentas autorizadas, aplicados no servidor |

Usar IDs imutáveis; nomes e slugs podem mudar. Não copiar dados privados para snapshots públicos. Valores monetários devem usar unidades mínimas inteiras e moeda explícita; não confiar em totais recebidos do browser.

## Contrato exemplificativo de página

```json
{
  "artistId": "ID_REAL_A_FORNECER_PELO_MUSKA",
  "templateId": "04",
  "slug": "nome-do-artista",
  "profile": {"displayName": "Artista de teste", "bio": "..."},
  "appearance": {
    "mode": "dark",
    "background": "#200d05",
    "text": "#fff6e6",
    "accent": "#ff751f",
    "heroMediaId": null,
    "portraitMediaId": null
  },
  "editorOrder": ["basic", "visual", "press", "music", "video", "events"],
  "sections": [
    {"id": "biography", "enabled": true, "position": 0},
    {"id": "music", "enabled": true, "position": 1, "contentIds": []},
    {"id": "events", "enabled": true, "position": 2, "contentIds": []}
  ],
  "version": 1
}
```

O exemplo não cria artista nem constitui um schema final aprovado.

## Operações sugeridas para a API My Page

| Operação | Contrato sugerido, a validar |
| --- | --- |
| Identidade/permissões | `GET /me`, lista de artistas geridos |
| Ler/guardar rascunho | `GET/PUT /artists/{id}/page/draft`, controlo de versão/conflito |
| Preview/publicar | Preview autenticado; `POST /artists/{id}/page/publish` |
| Público | `GET /pages/{slug}` devolve só snapshot publicado |
| Biblioteca | Upload autorizado, completar processamento, listar, editar visibilidade, download autorizado |
| Catálogo Muska | Adaptador de pesquisa e seleção usando documentação oficial a fornecer |
| Eventos | CRUD manual + sincronização por source/external_id |
| Booking | Intervalos de disponibilidade, criar pedido público validado, transições autenticadas |
| Donativos/loja | Criar intenção no servidor, webhook verificado, consulta de estado |
| Ferramentas | Criar pedido, listar acompanhamento, responder pela equipa |

Definir paginação, filtros, erros consistentes, validação, limites, rate limiting e prevenção de abuso. Uploads grandes devem ter progresso, erro e retry sem duplicar conteúdo.

## Armazenamento local existente: migração, não produção

- `mypage-studio-v2-draft`: campos, listas e `layout`.
- `mypage-tools-v5`: álbuns, media metadata, eventos, slots, campanhas, produtos, encomendas de teste, seleção e imageRefs.
- IndexedDB `mypage-media-v5`, object store `files`: original e derivado.
- Preferência de tema em `mypage-office-theme`; versões anteriores também usaram chaves avulsas.

Não apagar dados locais automaticamente. Se houver importação de testes, pedir confirmação, validar schema e nunca migrar encomendas de teste como vendas reais. A pasta entregue não inclui estas bases de navegador.

## Segurança e acessos obrigatórios

- Isolamento por artista em todas as operações; testar acesso indevido a IDs de outro artista.
- Validar conteúdo/tamanho dos uploads no servidor, inspecionar malware conforme estratégia, impedir execução de ficheiros ativos. Originais e downloads pagos privados.
- URLs externas: whitelist de embeds, bloquear esquemas perigosos, proteção SSRF se houver obtenção de metadados. Sanitização de texto enriquecido e CSP apropriada.
- Webhook de pagamento autenticado, idempotente e reconciliado; não confiar em redirect de sucesso. Dinheiro e estados não são controlados por JavaScript do cliente.
- Stock físico reservado de forma transacional; repetição de pedido não cria dupla venda. Entrega digital só após pagamento verificado.
- Segredos apenas no servidor; ambiente de testes separado, logs sem dados sensíveis, backups e recuperação.

## Acessos e decisões a solicitar ao proprietário / equipa Muska

1. Stack e repositórios de produção; responsáveis e processo de deploy.
2. Autenticação Muska, IDs de artista, permissões e documentação dos catálogos.
3. APIs e ambiente de testes de eventos, música e vídeo; regras de sincronização.
4. SISP: documentação, sandbox, conta/contrato e destinatário de liquidação. Não colocar chaves nesta pasta.
5. Domínio final e controlo DNS; publicação e slugs.
6. Planos/limites, moedas/preços finais, comissões e regras da loja/doações.
7. Política de ficheiros, consentimentos, retenção, direitos de media e termos aprovados.
