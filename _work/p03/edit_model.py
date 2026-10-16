import sys
p = 'src/lib/page-model.ts'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    if old not in s: sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)

rep('''/**
 * Resolved `PageContent`''', '''/** A local video file from the library, with its poster. */
export interface SnapshotFilm {
  src: string;
  poster: string | null;
  title: string;
}

/**
 * Resolved `PageContent`''')
rep('''  stats: Array<{ value: string; label: string }>;
  discography: Array<{ title: string; with: string | null; year: string | null; url: string | null }>;''',
'''  stats: Array<{ value: string; label: string; url?: string | null }>;
  discography: Array<{ title: string; with: string | null; year: string | null; url: string | null; type?: string | null }>;''')
rep('''  /** Public documents found in the press kit, by category. */
  documents: { presskit: string | null; rider: string | null; folder: string | null };
}''', '''  /** Public documents found in the press kit, by category. */
  documents: { presskit: string | null; rider: string | null; folder: string | null };
  // --- Página 3 · DJs & Producers (template 06). Optional: older snapshots lack them.
  heroPhotos?: SnapshotImage[];
  heroStatement?: string | null;
  ticker?: string[];
  statsNote?: string | null;
  facts?: Array<{ value: string; label: string; url?: string | null }>;
  timeline?: Array<{ period: string; title: string; text: string | null }>;
  collaborations?: Array<{ label: string; names: string }>;
  musicPhoto?: SnapshotImage | null;
  highlightsPhoto?: SnapshotImage | null;
  stories?: {
    reel: SnapshotFilm | null;
    photo: SnapshotImage | null;
    photoCaption: string | null;
    statement: string | null;
    intro: string | null;
    creditsNote: string | null;
    credits: Array<{ year: string | null; title: string; client: string | null }>;
  } | null;
  galleryFilm?: SnapshotFilm | null;
  /** Booking emails by territory; published only with the public booking contact. */
  bookingRegions?: Array<{ label: string; email: string }>;
}''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
