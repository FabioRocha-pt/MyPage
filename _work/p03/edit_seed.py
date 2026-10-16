import sys

p = 'prisma/seed-handoff.ts'
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)


rep(''' *   - deekay · Template 02 · versão 1 (`deekay-v1-publicar.zip`)
 *   - kevy   · Template 01 · versão 1 (`kevy-v1-publicar.zip`)
 *''', ''' *   - deekay  · Template 02 · versão 1 (`deekay-v1-publicar.zip`)
 *   - kevy    · Template 01 · versão 1 (`kevy-v1-publicar.zip`)
 *   - ellputo · Página 3 · DJs & Producers, template 06
 *               (`Entrega-Fabio-Pagina-03-DJs-Producers-2026-10-14.zip`)
 *''')
rep(''' * o ano de cada lançamento.
 *''', ''' * o ano de cada lançamento.
 *
 * A entrega da Página 3 não trazia ficheiro de dados: `fixtures/ellputo/
 * ellputo.json` foi escrito a partir do `site/index.html`, no mesmo contrato,
 * com o bloco `pagina3` para o que só essa página mostra (recortes do hero,
 * percurso, colaborações, Stories, filme da galeria, emails por região). Os
 * dois vídeos locais entram otimizados (H.264, faststart), não os originais.
 * Ellputo não tem rider nem pasta do Drive: esses campos são opcionais.
 *''')
rep(''' *   npm run db:seed:kevy       (tsx prisma/seed-handoff.ts kevy)''', ''' *   npm run db:seed:kevy       (tsx prisma/seed-handoff.ts kevy)
 *   npm run db:seed:ellputo    (tsx prisma/seed-handoff.ts ellputo)''')
rep('''  console.error("Uso: tsx prisma/seed-handoff.ts <slug>   (deekay, kevy)");''', '''  console.error("Uso: tsx prisma/seed-handoff.ts <slug>   (deekay, kevy, ellputo)");''')

# --- interface
rep('''    frase: string;
    cidade: string;''', '''    frase: string;
    /** Line above the name (`roleLine`). Defaults to "DJ · Produtor". */
    funcao?: string | null;
    cidade: string;''')
rep('''  imagens: { principal: string; retrato: string; logo: string; logoEscuro: string; logoHero?: string | null };
  numeros: Array<{ valor: string; rotulo: string }>;
  links: Array<{ plataforma: string; rotulo: string; url: string; destaque: boolean }>;
  musica: { player: { plataformaUrl: string } };
  discografia: Array<{ titulo: string; com: string | null; ano?: string | null; url: string | null }>;
  destaques: Array<{ titulo: string; detalhe: string | null; tipo: string | null; ano: string | null; video: string | null }>;
  videos: Array<{ id: string; titulo: string; embed: string }>;''', '''  imagens: { principal: string; retrato: string; logo: string; logoEscuro?: string | null; logoHero?: string | null };
  numeros: Array<{ valor: string; rotulo: string; url?: string | null }>;
  links: Array<{ plataforma: string; rotulo: string; url: string; destaque: boolean }>;
  musica: {
    player: { plataformaUrl: string };
    /** More music links, listed beside the player (Página 3). */
    outras?: Array<{ plataforma: string; rotulo: string; url: string }>;
  };
  discografia: Array<{ titulo: string; com: string | null; ano?: string | null; tipo?: string | null; url: string | null }>;
  destaques: Array<{ titulo: string; detalhe: string | null; tipo: string | null; ano: string | null; video: string | null }>;
  /** Deekay/Kevy: `id` + `embed`. Ellputo: a link (a playlist too) and a cover image. */
  videos: Array<{ id?: string; titulo: string; embed?: string; url?: string; capa?: string }>;''')
rep('''    email: string | null;
    mostrarContactoPublico: boolean;
  };
  rider: {''', '''    email: string | null;
    mostrarContactoPublico: boolean;
    regioes?: Array<{ rotulo: string; email: string }>;
  };
  rider: {''')
rep('''    pdf: string;
  };
  presskit: { drive: string; portfolio: string; publico: boolean };
  porConfirmar?: string[];
}''', '''    pdf: string;
  } | null;
  presskit: { drive: string | null; portfolio: string; publico: boolean };
  /** Página 3 · DJs & Producers (template 06) only. */
  pagina3?: {
    fraseHero: string | null;
    recortesHero: string[];
    faixa: string[];
    origemNumeros: string | null;
    factos: Array<{ valor: string; rotulo: string }>;
    percurso: Array<{ periodo: string; titulo: string; texto: string | null }>;
    colaboracoes: Array<{ rotulo: string; nomes: string }>;
    fotoMusica: string | null;
    fotoPremios: string | null;
    stories: {
      video: string | null;
      tituloVideo: string | null;
      capa: string | null;
      foto: string | null;
      legendaFoto: string | null;
      tipografia: string | null;
      introducao: string | null;
      notaCreditos: string | null;
      creditos: Array<{ ano: string | null; titulo: string; cliente: string | null }>;
    };
    filmeGaleria: { video: string; titulo: string | null; capa: string | null } | null;
  };
  porConfirmar?: string[];
}''')

rep('''  "kevy-rider-tecnico.pdf": "DJ Kevy Delgado · Rider técnico e hospitalidade.pdf",
};''', '''  "kevy-rider-tecnico.pdf": "DJ Kevy Delgado · Rider técnico e hospitalidade.pdf",
  "ellputo-logo.png": "Logo.png",
  "ellputo-logo-hero.png": "Logo do hero.png",
  "ellputo-recorte-1.png": "Recorte 1.png",
  "ellputo-recorte-2.png": "Recorte 2.png",
  "ellputo-recorte-3.png": "Recorte principal.png",
  "ellputo-artist-profile.pdf": "Ellputo · Artist profile.pdf",
  "ellputo-artist-reel.mp4": "Artist reel.mp4",
  "ellputo-music-experience.mp4": "Ellputo Music Experience.mp4",
};

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4" };''')

rep('''async function importFile(artistId: string, asset: string, albumId: string, position: number) {''',
    '''async function importFile(artistId: string, asset: string, albumId: string | null, position: number) {''')
rep('''  if (ext === "pdf") {''', '''  if (ext === "mp4") {
    // A local film (Página 3). Stored as is: the fixture is already the web
    // encode, and the view route serves it in byte ranges.
    return db.media.create({
      data: {
        artistId,
        albumId,
        title: TITLES[name] ?? name,
        kind: "video",
        mimeType: MIME.mp4,
        originalKey,
        sizeBytes: buffer.length,
        status: "ready",
        isPublic: true,
        position,
      },
    });
  }

  if (ext === "pdf") {''')
rep('''      mimeType: ext === "png" ? "image/png" : "image/jpeg",''', '''      mimeType: MIME[ext] ?? "image/jpeg",''')

# --- library
rep('''  const byFile = new Map<string, string>();
  const photoFiles = [
    ...new Set([
      ...data.galeria.flatMap((g) => (g.ficheiro ? [g.ficheiro] : [])),
      ...data.biografiaFotos,
      data.imagens.retrato,
      data.imagens.principal,
    ]),
  ];''', '''  const byFile = new Map<string, string>();
  const p3 = data.pagina3;
  const photoFiles = [
    ...new Set(
      [
        ...data.galeria.flatMap((g) => (g.ficheiro ? [g.ficheiro] : [])),
        ...data.biografiaFotos,
        data.imagens.retrato,
        data.imagens.principal,
        ...(p3?.recortesHero ?? []),
        p3?.fotoMusica,
        p3?.fotoPremios,
        p3?.stories.capa,
        p3?.stories.foto,
        p3?.filmeGaleria?.capa,
      ].filter((asset): asset is string => Boolean(asset)),
    ),
  ];''')
rep('''  byFile.set(fileName(data.rider.esquema), (await importFile(artist.id, data.rider.esquema, plot.id, 0)).id);
  await importFile(artist.id, data.presskit.portfolio, epk.id, 0);
  await importFile(artist.id, data.rider.pdf, riderAlbum.id, 0);''', '''  if (data.rider) {
    byFile.set(fileName(data.rider.esquema), (await importFile(artist.id, data.rider.esquema, plot.id, 0)).id);
    await importFile(artist.id, data.rider.pdf, riderAlbum.id, 0);
  }
  await importFile(artist.id, data.presskit.portfolio, epk.id, 0);

  // Local films (Página 3): library videos without an album, public.
  const films = [p3?.stories.video, p3?.filmeGaleria?.video].filter((asset): asset is string => Boolean(asset));
  for (const [index, asset] of films.entries()) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, null, 100 + index)).id);
  }''')
rep('''  await db.pressLink.create({
    data: { artistId: artist.id, category: "epk", url: data.presskit.drive, isPublic: data.presskit.publico },
  });''', '''  if (data.presskit.drive) {
    await db.pressLink.create({
      data: { artistId: artist.id, category: "epk", url: data.presskit.drive, isPublic: data.presskit.publico },
    });
  }''')

# --- links: other music links
rep('''      group: "music",
      placement: "section",
      position: 0,
    },
  });
''', '''      group: "music",
      placement: "section",
      position: 0,
    },
  });
  for (const [index, link] of (data.musica.outras ?? []).entries()) {
    await db.externalLink.create({
      data: {
        artistId: artist.id,
        platform: link.plataforma,
        label: link.rotulo,
        url: link.url,
        group: "music",
        placement: "section",
        position: index + 1,
      },
    });
  }
''')

# --- videos
rep('''  for (const [index, video] of data.videos.entries()) {
    const row = await db.media.create({
      data: {
        artistId: artist.id,
        title: video.titulo,
        kind: "video",
        mimeType: "text/uri-list",
        externalUrl: video.embed,
        platform: "youtube",
        status: "ready",
        isPublic: true,
        position: index,
      },
    });''', '''  for (const [index, video] of data.videos.entries()) {
    // A cover from the handoff becomes the video's derivative, which is what
    // the snapshot publishes as `poster` (a playlist has no YouTube thumbnail).
    const cover = video.capa
      ? await makeImageDerivative(await readFile(path.join(FIXTURES, fileName(video.capa))), artist.id)
      : null;
    const row = await db.media.create({
      data: {
        artistId: artist.id,
        title: video.titulo,
        kind: "video",
        mimeType: "text/uri-list",
        externalUrl: video.url ?? video.embed!,
        derivedKey: cover?.key ?? null,
        derivedBytes: cover?.bytes ?? null,
        platform: "youtube",
        status: "ready",
        isPublic: true,
        position: index,
      },
    });''')

# --- sections
rep('''  const sectionOrder =
    data.template === "01"
      ? ["hero", "music", "video", "biography", "highlights", "gallery", "events", "press", "booking", "donations", "store"]
      : ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];''', '''  const sectionOrder =
    data.template === "01"
      ? ["hero", "music", "video", "biography", "highlights", "gallery", "events", "press", "booking", "donations", "store"]
      : data.template === "06"
        ? ["hero", "biography", "music", "highlights", "video", "gallery", "events", "press", "booking", "donations", "store"]
        : ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];''')

# --- content
rep('''  const content = normaliseContent({
    roleLine: "DJ · Produtor",''', '''  const optionalId = (asset: string | null | undefined) => (asset ? mediaId(asset) : null);
  const content = normaliseContent({
    roleLine: data.perfil.funcao ?? "DJ · Produtor",''')
rep('''    stats: data.numeros.map((n) => ({ value: n.valor, label: n.rotulo })),
    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, year: d.ano ?? null, url: d.url })),''', '''    stats: data.numeros.map((n) => ({ value: n.valor, label: n.rotulo, url: n.url ?? null })),
    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, year: d.ano ?? null, url: d.url, type: d.tipo ?? null })),''')
rep('''    logoDarkMediaId: mediaId(data.imagens.logoEscuro),''', '''    logoDarkMediaId: optionalId(data.imagens.logoEscuro),''')
rep('''      showPublic: data.booking.mostrarContactoPublico,
    },
    rider: {
      isPublic: true,
      technical: data.rider.tecnico.map((r) => ({ qty: r.quantidade, item: r.item })),
      notes: data.rider.notas,
      diagramMediaId: mediaId(data.rider.esquema),
      diagramCaption: data.rider.esquemaLegenda,
      hospitality: data.rider.hospitalidade.map((r) => ({ qty: r.quantidade, item: r.item })),
      guestTickets: data.rider.bilhetes,
      notices: data.rider.aviso,
    },
  });''', '''      showPublic: data.booking.mostrarContactoPublico,
      regions: (data.booking.regioes ?? []).map((r) => ({ label: r.rotulo, email: r.email })),
    },
    rider: data.rider
      ? {
          isPublic: true,
          technical: data.rider.tecnico.map((r) => ({ qty: r.quantidade, item: r.item })),
          notes: data.rider.notas,
          diagramMediaId: mediaId(data.rider.esquema),
          diagramCaption: data.rider.esquemaLegenda,
          hospitality: data.rider.hospitalidade.map((r) => ({ qty: r.quantidade, item: r.item })),
          guestTickets: data.rider.bilhetes,
          notices: data.rider.aviso,
        }
      : { isPublic: false },
    ...(p3
      ? {
          heroPhotoIds: p3.recortesHero.map(mediaId),
          heroStatement: p3.fraseHero,
          ticker: p3.faixa,
          statsNote: p3.origemNumeros,
          facts: p3.factos.map((f) => ({ value: f.valor, label: f.rotulo })),
          timeline: p3.percurso.map((t) => ({ period: t.periodo, title: t.titulo, text: t.texto })),
          collaborations: p3.colaboracoes.map((c) => ({ label: c.rotulo, names: c.nomes })),
          musicPhotoId: optionalId(p3.fotoMusica),
          highlightsPhotoId: optionalId(p3.fotoPremios),
          stories: {
            reelMediaId: optionalId(p3.stories.video),
            posterMediaId: optionalId(p3.stories.capa),
            photoMediaId: optionalId(p3.stories.foto),
            reelTitle: p3.stories.tituloVideo,
            photoCaption: p3.stories.legendaFoto,
            statement: p3.stories.tipografia,
            intro: p3.stories.introducao,
            creditsNote: p3.stories.notaCreditos,
            credits: p3.stories.creditos.map((c) => ({ year: c.ano, title: c.titulo, client: c.cliente })),
          },
          galleryFilm: p3.filmeGaleria
            ? {
                mediaId: mediaId(p3.filmeGaleria.video),
                posterMediaId: optionalId(p3.filmeGaleria.capa),
                title: p3.filmeGaleria.titulo,
              }
            : {},
        }
      : {}),
  });''')

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
