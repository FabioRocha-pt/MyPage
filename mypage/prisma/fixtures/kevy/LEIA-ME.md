# DJ Kevy Delgado · página para publicar

Segunda página feita no sistema My Page, depois do Deekay. Mesmo motor, mesmo contrato de dados, outro desenho (Template 01). Duas formas de pôr isto online. Escolhe uma.

## 1. Pasta `publicar/`, a versão a sério

Envia **o conteúdo de `publicar/`** para a raiz do alojamento. Funciona em qualquer serviço de ficheiros estáticos: Netlify, Vercel, GitHub Pages, Cloudflare Pages, ou um cPanel normal por FTP para dentro de `public_html`.

```
publicar/
  index.html        página principal
  booking.html      pedido de booking, rider técnico e hospitalidade
  assets/           fotografias, logótipos, diagrama do equipamento, press kit e rider em PDF
  robots.txt
  sitemap.xml
```

Não há build, não há servidor, não há base de dados. São ficheiros.

### Os dois endereços que tens de escrever

Enquanto o domínio não estiver decidido, as páginas trazem `https://SEU-DOMINIO` nos metadados de partilha e `https://SEU-DOMINIO-MY-PAGE` no crédito do rodapé. O primeiro só afeta a pré-visualização quando o link é enviado por WhatsApp, Instagram ou Facebook. O segundo deixa o "Powered by Muska" sem destino até ser trocado. Tudo o resto funciona à mesma.

Quando souberes o endereço, tens duas maneiras de o pôr:

- **Refazer:** `python3 ferramentas/construir-site.py kevy https://dominio-do-kevy https://landing-do-my-page`
- **Ou à mão:** substituir `https://SEU-DOMINIO` pelo endereço do artista (4 ocorrências em `index.html`, 4 em `booking.html`, 1 em `robots.txt`, 2 em `sitemap.xml`) e `https://SEU-DOMINIO-MY-PAGE` pelo endereço da landing do My Page (1 em cada página).

## 2. Ficheiro `ficheiro-unico/kevy.html`

Um único ficheiro de 5,7 MB que abre por duplo clique, sem servidor, e pode ir por email ou WhatsApp. Ao contrário da primeira versão do Deekay, este leva tudo lá dentro:

- as fotografias e o logótipo;
- o press kit e o rider em PDF, que abrem numa aba nova a partir do próprio ficheiro;
- a página de booking e rider, que abre por cima da página principal e fecha com "Voltar à página", o X, a tecla Escape ou o botão de voltar do telemóvel.

Serve para mostrar ao artista e a promotores. O site é a pasta `publicar/`.

## Os dois PDF (`pdf/`)

`kevy-presskit.pdf` (seis páginas: capa, biografia, música e palmarés, galeria, rider técnico, hospitalidade e contacto) e `kevy-rider-tecnico.pdf` (capa, rider e hospitalidade). São gerados a partir do mesmo ficheiro de dados, com o desenho do site. Fundo em verde escuro, frase da capa em Instrument Serif itálico (licença OFL, o ficheiro da fonte está no projeto). Para os refazer: `node ferramentas/gerar-pdf.mjs kevy`.

O rider original, feito pela equipa do artista, está guardado no projeto em `artistas/kevy/` e já não é usado pela página.

## Os dados (`dados/kevy.json`)

Tudo o que a página mostra vem daqui. Nenhum dado do artista está escrito dentro do HTML. É este o formato que o backoffice tem de produzir. Em relação ao Deekay há três campos novos, todos opcionais:

| Campo | Para quê |
|---|---|
| `imagens.logoHero` | logótipo do hero, quando é diferente do da barra (no Kevy é o monograma empilhado) |
| `galeria[].video` | um vídeo do YouTube dentro da galeria, com miniatura, botão de play e pop up |
| `aparencia.documento` | opções só do PDF: fundo próprio, sem vinil, sem sombra no topo da fotografia, frase em serifa |

`porConfirmar` lista o que ainda falta confirmar com o artista. Não é mostrado na página.

## O que a página contém

Principal: hero com a fotografia a ocupar o ecrã, logótipo oficial, alcunha "The Machine", frase e redes; Spotify do artista e três lançamentos com ano; biografia em três capítulos com fotografia fixa que acompanha a leitura; palmarés com quatro destaques sobre fotografia; galeria "Em palco" com três fotografias e um vídeo, pop up, setas, descarregar e partilhar; press kit em cartões; booking. Tudo com entrada animada, que se desliga sozinha quando o sistema pede movimento reduzido. Etiquetas das secções sem número.

Secundária: pedido de booking, rider técnico com diagrama de equipamento, hospitalidade, avisos e descargas.

Secções sem dados ficam escondidas, e o menu acompanha. Hoje estão escondidas as próximas datas, os números e a linha de géneros.

## Antes de publicar, falta do artista

- **Contacto de booking** (nome, telefone com WhatsApp e/ou email). Sem ele o formulário só deixa copiar o pedido, e a página diz isso a quem o preencher. É o único bloqueio real.
- Géneros musicais.
- Confirmação da frase "De Cabo Verde para novas pistas."
- Créditos dos fotógrafos.
- Bilhetes para convidados (o rider do artista não diz).
- Os vídeos da pasta VIDEOS do Drive, se ele os quiser na galeria.

## Pedido de booking

Quem pede preenche nome, evento, data, local e mensagem, e escolhe como quer a resposta: **WhatsApp** (deixa o número) ou **email** (deixa o email, para quem não quer dar o número). Com isso a página monta a mensagem já escrita, com a data em dd/mm/aaaa e o contacto de quem pede, e abre:

- o WhatsApp do artista (`wa.me`), se ele tiver `booking.telefone` com `booking.whatsapp: true`;
- o programa de email com o pedido para `booking.email`, com assunto "Pedido de booking · evento · data".

Se o artista só tiver um dos canais, o pedido sai por esse, e o contacto preferido de quem pede vai na mensagem. Se não tiver nenhum, o botão de envio desaparece e fica "Copiar pedido". Não há servidor nem base de dados: nada fica guardado. Receber os pedidos numa caixa de entrada do My Page é trabalho de integração, fora desta versão.

## Vídeos e o erro 153 do YouTube

O YouTube só toca vídeos embutidos quando a página se identifica (cabeçalho Referer). Aberta a partir do disco (duplo clique, ficheiro único), dentro da pré-visualização de uma app ou num visualizador de ficheiros do telemóvel, a página não tem origem e o leitor dá "Error 153". A página deteta esses casos e mostra no pop up a capa do vídeo e um botão "Ver no YouTube". Publicada num domínio (http ou https), o vídeo toca no pop up; o iframe leva `referrerpolicy="strict-origin-when-cross-origin"` para o YouTube receber a origem.

## Regras de navegação

Nenhuma ligação tira a pessoa da página. Os vídeos do YouTube abrem em pop up. Redes, Spotify, WhatsApp e PDF abrem numa aba nova e a página fica aberta atrás.

"Pasta completa" leva ainda à pasta do Drive do artista. A ideia é passar a ser um arquivo no servidor do My Page, com os ficheiros de cada artista arrumados. Isso ainda não está feito.

## Capturas (`capturas/`)

Hero, galeria com vídeo, pop up de fotografia com partilha, página de booking com o rider, telemóvel, menu do telemóvel, um vídeo do movimento e a capa do PDF.

## Template

Esta página é o Template 01 · versão 1, guardado no projeto em `modelos/template-01-v1/` com a documentação do que muda em relação ao Template 02. O motor (`artista-render.js`, `artista-movimento.js`, `artista.css`) é o mesmo nas duas páginas.
