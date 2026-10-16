import sys
p = 'src/lib/snapshot.ts'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    if old not in s: sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)

rep('''    content.logoHeroMediaId,
    content.rider.diagramMediaId,
  ].filter((value): value is string => Boolean(value));

  // Only public images''', '''    content.logoHeroMediaId,
    content.rider.diagramMediaId,
    ...content.heroPhotoIds,
    content.musicPhotoId,
    content.highlightsPhotoId,
    content.stories.posterMediaId,
    content.stories.photoMediaId,
    content.galleryFilm.posterMediaId,
  ].filter((value): value is string => Boolean(value));

  // Only public images''')

rep('''  const bookingContact =
    content.booking.showPublic''', '''  // Template 06's two local films: library videos with a stored file, public,
  // in a public album or none — the same rule the view route applies.
  const filmIds = [
    enabled.has("video") ? content.stories.reelMediaId : null,
    enabled.has("gallery") ? content.galleryFilm.mediaId : null,
  ].filter((value): value is string => Boolean(value));
  const filmRows = filmIds.length
    ? await db.media.findMany({
        where: { id: { in: filmIds }, artistId, kind: "video", status: "ready", isPublic: true, originalKey: { not: null } },
        select: { id: true, title: true, album: { select: { isPublic: true } } },
      })
    : [];
  const film = (mediaId: string | null, posterId: string | null, title: string | null) => {
    const row = filmRows.find((candidate) => candidate.id === mediaId && (candidate.album === null || candidate.album.isPublic));
    return row ? { src: mediaUrl(row.id), poster: contentImage(posterId)?.url ?? null, title: title ?? row.title } : null;
  };
  const storiesReel = film(content.stories.reelMediaId, content.stories.posterMediaId, content.stories.reelTitle);
  const storiesPhoto = enabled.has("video") ? contentImage(content.stories.photoMediaId) : null;
  const stories =
    enabled.has("video") && (storiesReel || storiesPhoto || content.stories.credits.length)
      ? {
          reel: storiesReel,
          photo: storiesPhoto,
          photoCaption: content.stories.photoCaption,
          statement: content.stories.statement,
          intro: content.stories.intro,
          creditsNote: content.stories.creditsNote,
          credits: content.stories.credits,
        }
      : null;

  const bookingContact =
    content.booking.showPublic''')

rep('''    documents,
  };

  // --- Assemble''', '''    documents,
    heroPhotos: content.heroPhotoIds
      .map((mediaId) => contentImage(mediaId))
      .filter((image): image is SnapshotImage => Boolean(image)),
    heroStatement: content.heroStatement,
    ticker: content.ticker,
    statsNote: content.statsNote,
    facts: content.facts,
    timeline: content.timeline,
    collaborations: enabled.has("music") ? content.collaborations : [],
    musicPhoto: enabled.has("music") ? contentImage(content.musicPhotoId) : null,
    highlightsPhoto: enabled.has("highlights") ? contentImage(content.highlightsPhotoId) : null,
    stories,
    galleryFilm: film(content.galleryFilm.mediaId, content.galleryFilm.posterMediaId, content.galleryFilm.title),
    bookingRegions: content.booking.showPublic ? content.booking.regions : [],
  };

  // --- Assemble''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
