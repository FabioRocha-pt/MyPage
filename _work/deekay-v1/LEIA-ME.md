# DJ Deekay · página para publicar

Duas formas de pôr isto online. Escolhe uma.

## 1. Pasta `publicar/` — é esta a versão a sério

Envia **o conteúdo de `publicar/`** para a raiz do alojamento. Funciona em qualquer
serviço de ficheiros estáticos: Netlify, Vercel, GitHub Pages, Cloudflare Pages,
ou um cPanel normal por FTP para dentro de `public_html`.

```
publicar/
  index.html        página principal
  booking.html      pedido de booking, rider técnico e hospitalidade
  assets/           fotografias, logótipos, esquema técnico, press kit e rider em PDF
  robots.txt
  sitemap.xml
```

Não há build, não há servidor, não há base de dados. São ficheiros.

### Os dois endereços que tens de escrever

Enquanto o domínio não estiver decidido, as páginas trazem `https://SEU-DOMINIO`
nos metadados de partilha e `https://SEU-DOMINIO-MY-PAGE` no crédito do rodapé.
O primeiro só afeta a pré-visualização quando o link é enviado por WhatsApp,
Instagram ou Facebook. O segundo deixa o "Powered by Muska" sem destino até ser
trocado. Tudo o resto funciona à mesma.

Quando souberes o endereço, tens duas maneiras de o pôr:

- **Refazer:** `python3 ferramentas/construir-site.py deekay https://deekay.cv https://landing-do-my-page`
- **Ou à mão:** substituir `https://SEU-DOMINIO` pelo endereço do artista
  (4 ocorrências em `index.html`, 4 em `booking.html`, 1 em `robots.txt`, 2 em
  `sitemap.xml`) e `https://SEU-DOMINIO-MY-PAGE` pelo endereço da landing do My Page
  (1 em cada página). Este segundo é para onde leva o "Powered by Muska" do rodapé.

Depois disso, um link partilhado mostra o nome, a frase e a fotografia de palco.

## 2. Ficheiro `ficheiro-unico/deekay.html`

Um único ficheiro de 2,7 MB com as fotografias lá dentro. Abre por duplo clique,
sem servidor, e pode ser enviado por email ou WhatsApp como anexo.

Tem menos do que a versão de cima: não traz a página de booking nem os PDF.
O rider e o portfólio passam a apontar para a pasta do Drive. Serve para mostrar
a alguém rapidamente, não para ser o site.

## Os dois PDF

`deekay-presskit.pdf` (seis páginas: capa, biografia, música e palmarés, galeria,
rider técnico, hospitalidade e contacto) e `deekay-rider-tecnico.pdf` (capa, rider e
hospitalidade) são gerados a partir do mesmo ficheiro de dados, com o desenho do site.
Para os refazer: `node ferramentas/gerar-pdf.mjs deekay`.

O rider e o portfólio originais, feitos pela equipa do artista, estão guardados em
`site-deekay/originais/` e já não são usados pela página.

## O que a página contém

Tudo vem de `prototipo/artistas/deekay.json`. Nenhum dado do artista está escrito
dentro do HTML, e é por isso que a página do próximo artista se faz com um
ficheiro de dados novo, sem tocar em código.

Principal: hero com logótipo, vinil e redes sobre vidro fosco; géneros; biografia com fotografia fixa
que acompanha a leitura; três números; Spotify e discografia de oito temas; quatro
vídeos; galeria de cinco fotografias com pop up, descarregar e partilhar; palmarés com fotografia de fundo;
press kit e booking. Tudo com entrada animada, que se desliga sozinha quando o
sistema pede movimento reduzido.
Secundária: pedido de booking, rider técnico com esquema de ligações,
hospitalidade, bilhetes, avisos e descargas.

## Antes de publicar, confirma comigo

- O rider fica público na página ou só a pedido do promotor.
- A ordem dos géneros e se o nome real aparece.
- Os créditos dos fotógrafos das cinco fotografias.
- Se o telefone do Diego pode mesmo ficar visível numa página pública indexada
  pelo Google. Numa demo é uma coisa, online é outra.

O formulário da página de booking não envia nada para lado nenhum: monta a
mensagem e abre o WhatsApp do manager. Não há servidor nem base de dados.

## Regras de navegação

Nenhuma ligação tira a pessoa da página. Os vídeos do YouTube, incluindo os da
discografia e do palmarés, abrem em pop up. Redes, Spotify, WhatsApp e PDF abrem
numa aba nova e a página fica aberta atrás.

## Template

Esta página é o Template 02 · versão 1, guardado em `modelos/template-02-v1/` com a
documentação do contrato de dados e um `modelo.json` para o próximo artista.
