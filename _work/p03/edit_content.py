import sys

p = 'src/lib/page-content.ts'
s = open(p, encoding='utf-8').read()


def rep(old, new):
    global s
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)


rep(''' * Media is always referenced by id''', ''' * Página 3 · DJs & Producers (the Ellputo handoff, template id "06") added
 * the rest of its page as optional fields: cut-out hero photos, a statement
 * and a ticker, audience figures with their source, facts, a journey
 * timeline, collaborations, a photo beside the projects and the awards,
 * "Stories" (a local reel, an editorial photo and campaign credits), a local
 * film under the gallery and booking emails per region. Templates 01 and 02
 * ignore them.
 *
 * Media is always referenced by id''')

rep('''export interface StatItem {
  value: string;
  label: string;
}''', '''export interface StatItem {
  value: string;
  label: string;
  /** Optional link: the audience figures open the network they count. */
  url?: string | null;
}

export interface TimelineItem {
  period: string;
  title: string;
  text: string | null;
}

export interface CollaborationGroup {
  label: string;
  names: string;
}

export interface CreditItem {
  year: string | null;
  title: string;
  client: string | null;
}

export interface BookingRegion {
  label: string;
  email: string;
}''')

rep('''  year: string | null;
  url: string | null;
}

export interface HighlightItem''', '''  year: string | null;
  url: string | null;
  /** Short label beside the release: "EP", "Collab". */
  type?: string | null;
}

export interface HighlightItem''')

rep('''  booking: {
    contactName: string | null;
    contactRole: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: boolean;
    showPublic: boolean;
  };
  rider: {''', '''  /** Cut-out photos layered in the hero, back to front (Página 3). */
  heroPhotoIds: string[];
  /** Big line beside the hero logo; a line break starts the highlighted part. */
  heroStatement: string | null;
  /** Words of the moving band under the hero. */
  ticker: string[];
  /** Where the numbers come from, shown beside them ("press kit, not live counts"). */
  statsNote: string | null;
  /** Short facts under the biography: "2000 · The journey begins". */
  facts: StatItem[];
  timeline: TimelineItem[];
  collaborations: CollaborationGroup[];
  musicPhotoId: string | null;
  highlightsPhotoId: string | null;
  stories: {
    reelMediaId: string | null;
    posterMediaId: string | null;
    photoMediaId: string | null;
    reelTitle: string | null;
    photoCaption: string | null;
    statement: string | null;
    intro: string | null;
    creditsNote: string | null;
    credits: CreditItem[];
  };
  galleryFilm: {
    mediaId: string | null;
    posterMediaId: string | null;
    title: string | null;
  };
  booking: {
    contactName: string | null;
    contactRole: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: boolean;
    showPublic: boolean;
    /** Booking emails by territory ("Mozambique", "Rest of the world"). */
    regions: BookingRegion[];
  };
  rider: {''')

rep('''  logoHeroMediaId: null,
  booking: { contactName: null, contactRole: null, phone: null, email: null, whatsapp: false, showPublic: false },''', '''  logoHeroMediaId: null,
  heroPhotoIds: [],
  heroStatement: null,
  ticker: [],
  statsNote: null,
  facts: [],
  timeline: [],
  collaborations: [],
  musicPhotoId: null,
  highlightsPhotoId: null,
  stories: {
    reelMediaId: null,
    posterMediaId: null,
    photoMediaId: null,
    reelTitle: null,
    photoCaption: null,
    statement: null,
    intro: null,
    creditsNote: null,
    credits: [],
  },
  galleryFilm: { mediaId: null, posterMediaId: null, title: null },
  booking: { contactName: null, contactRole: null, phone: null, email: null, whatsapp: false, showPublic: false, regions: [] },''')

rep('''  notes: 12,
} as const;''', '''  notes: 12,
  heroPhotos: 3,
  ticker: 8,
  timeline: 12,
  collaborations: 6,
  credits: 20,
  regions: 6,
} as const;''')

rep('''/**
 * Rebuilds a valid document''', '''function statItems(value: unknown, limit: number): StatItem[] {
  return arr(value)
    .map((entry) => {
      const row = obj(entry);
      const value = text(row.value, 16);
      return value ? { value, label: text(row.label, 60) ?? "", url: url(row.url) } : null;
    })
    .filter((entry): entry is StatItem => Boolean(entry))
    .slice(0, limit);
}

function ids(value: unknown, limit: number): string[] {
  return arr(value)
    .map(id)
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, limit);
}

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

/**
 * Rebuilds a valid document''')

rep('''  const booking = obj(raw.booking);
  const rider = obj(raw.rider);
''', '''  const booking = obj(raw.booking);
  const rider = obj(raw.rider);
  const stories = obj(raw.stories);
  const film = obj(raw.galleryFilm);
''')

rep('''    stats: arr(raw.stats)
      .map((entry) => {
        const row = obj(entry);
        const value = text(row.value, 16);
        return value ? { value, label: text(row.label, 60) ?? "" } : null;
      })
      .filter((entry): entry is StatItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.stats),''', '''    stats: statItems(raw.stats, CONTENT_LIMITS.stats),''')

rep('''        return title ? { title, with: text(row.with, 120), year: text(row.year, 12), url: url(row.url) } : null;''', '''        return title
          ? { title, with: text(row.with, 120), year: text(row.year, 12), url: url(row.url), type: text(row.type, 24) }
          : null;''')

rep('''    logoHeroMediaId: id(raw.logoHeroMediaId),
    booking: {''', '''    logoHeroMediaId: id(raw.logoHeroMediaId),
    heroPhotoIds: ids(raw.heroPhotoIds, CONTENT_LIMITS.heroPhotos),
    heroStatement: text(raw.heroStatement, 120),
    ticker: strings(raw.ticker, CONTENT_LIMITS.ticker, 40),
    statsNote: text(raw.statsNote, 160),
    facts: statItems(raw.facts, CONTENT_LIMITS.stats),
    timeline: arr(raw.timeline)
      .map((entry) => {
        const row = obj(entry);
        const title = text(row.title, 120);
        return title ? { period: text(row.period, 24) ?? "", title, text: text(row.text, 400) } : null;
      })
      .filter((entry): entry is TimelineItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.timeline),
    collaborations: arr(raw.collaborations)
      .map((entry) => {
        const row = obj(entry);
        const names = text(row.names, 1200);
        return names ? { label: text(row.label, 60) ?? "", names } : null;
      })
      .filter((entry): entry is CollaborationGroup => Boolean(entry))
      .slice(0, CONTENT_LIMITS.collaborations),
    musicPhotoId: id(raw.musicPhotoId),
    highlightsPhotoId: id(raw.highlightsPhotoId),
    stories: {
      reelMediaId: id(stories.reelMediaId),
      posterMediaId: id(stories.posterMediaId),
      photoMediaId: id(stories.photoMediaId),
      reelTitle: text(stories.reelTitle, 80),
      photoCaption: text(stories.photoCaption, 120),
      statement: text(stories.statement, 60),
      intro: text(stories.intro, 240),
      creditsNote: text(stories.creditsNote, 300),
      credits: arr(stories.credits)
        .map((entry) => {
          const row = obj(entry);
          const title = text(row.title, 120);
          return title ? { year: text(row.year, 16), title, client: text(row.client, 60) } : null;
        })
        .filter((entry): entry is CreditItem => Boolean(entry))
        .slice(0, CONTENT_LIMITS.credits),
    },
    galleryFilm: {
      mediaId: id(film.mediaId),
      posterMediaId: id(film.posterMediaId),
      title: text(film.title, 80),
    },
    booking: {''')

rep('''      showPublic: booking.showPublic === true,
    },''', '''      showPublic: booking.showPublic === true,
      regions: arr(booking.regions)
        .map((entry) => {
          const row = obj(entry);
          const email = text(row.email, 200);
          return email && EMAIL.test(email) ? { label: text(row.label, 60) ?? "", email } : null;
        })
        .filter((entry): entry is BookingRegion => Boolean(entry))
        .slice(0, CONTENT_LIMITS.regions),
    },''')

rep('''    content.logoHeroMediaId,
    content.rider.diagramMediaId,
  ].filter((value): value is string => Boolean(value));
}''', '''    content.logoHeroMediaId,
    content.rider.diagramMediaId,
    ...content.heroPhotoIds,
    content.musicPhotoId,
    content.highlightsPhotoId,
    content.stories.reelMediaId,
    content.stories.posterMediaId,
    content.stories.photoMediaId,
    content.galleryFilm.mediaId,
    content.galleryFilm.posterMediaId,
  ].filter((value): value is string => Boolean(value));
}''')

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
