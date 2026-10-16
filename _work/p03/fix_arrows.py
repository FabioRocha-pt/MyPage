import sys

p = 'src/templates/t06/Template06.tsx'
s = open(p, encoding='utf-8').read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'{n} != {count}: ' + old[:80])
    s = s.replace(old, new)


rep('''function Arrow() {
  return <span aria-hidden="true">↗&#xFE0E;</span>;
}''', '''/**
 * "↗" with the text-presentation selector, so iOS never draws the emoji. The
 * handoff wraps it in a <span> in some places (styled) and not in others; the
 * markup follows it, so `Arrow` is the span and `ARROW` the bare glyph.
 */
const ARROW = "↗\\uFE0E";

function Arrow() {
  return <span aria-hidden="true">{ARROW}</span>;
}''')

# Bare glyph where the reference has plain text.
rep('''            Watch the videos <Arrow />''', '''            Watch the videos {ARROW}''')
rep('''                OPEN {upper(player.platformLabel ?? "player")} <Arrow />''', '''                OPEN {upper(player.platformLabel ?? "player")} {ARROW}''')
rep('''                  Listen on {player.platformLabel ?? "the platform"} <Arrow />''', '''                  Listen on {player.platformLabel ?? "the platform"} {ARROW}''')
rep('''              {upper(track.title)} <Arrow />''', '''              {upper(track.title)} {ARROW}''')
rep('''                  Open video <Arrow />''', '''                  Open video {ARROW}''')
rep('''              Open video <Arrow />''', '''              Open video {ARROW}''')
rep('''            YOUTUBE CHANNEL <Arrow />''', '''            YOUTUBE CHANNEL {ARROW}''')
rep('''                <span>
                  {n} / VIEW <Arrow />
                </span>''', '''                <span>
                  {n} / VIEW {ARROW}
                </span>''')
rep('''                  Tickets <Arrow />''', '''                  Tickets {ARROW}''')
rep('''              WhatsApp <Arrow />''', '''              WhatsApp {ARROW}''')
rep('''                    {upper(`Book ${name}`)} <Arrow />''', '''                    {upper(`Book ${name}`)} {ARROW}''')
rep('''                      <span>
                        {upper(stat.label)} <Arrow />
                      </span>''', '''                      <span>
                        {upper(stat.label)} {ARROW}
                      </span>''')
rep('''          Watch on YouTube <Arrow />''', '''          Watch on YouTube {ARROW}''')
rep('''<b aria-hidden="true">↗&#xFE0E;</b>''', '''<b aria-hidden="true">{ARROW}</b>''', 2)

# Listen panel: the second line is not highlighted in the handoff.
rep('''            <Lockup
              as="h3"
              label={upper(`${name} on ${player.platformLabel ?? "the player"}`)}
              main="Press play."
              em={<span className="listen-em">Stay for the feeling.</span>}
            />''', '''            <Lockup
              as="h3"
              label={upper(`${name} on ${player.platformLabel ?? "the player"}`)}
              main={
                <>
                  Press play.
                  <br />
                  Stay for the feeling.
                </>
              }
            />''')

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', s.count('<Arrow />'))
