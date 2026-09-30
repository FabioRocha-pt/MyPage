import re
src = open('src/styles/template-01.css', encoding='utf8').read()
rules = [l for l in src.split('\n') if re.match(r'\.t01 \.mp-(foto-play|foto\[data-mp-lightbox="video"\]|foto\.mp-sem-miniatura)', l)]
print(len(rules))
css = '\n'.join(r.replace('.t01 ', '.t02 ') for r in rules)
p = 'src/styles/template-02.css'
s = open(p, encoding='utf8').read()
s = s.rstrip('\n') + '''

/* Gallery videos (from the Template 01 · v1 handoff, where the gallery gained
   them): cover with a play button, a coloured fallback when YouTube is out. */
''' + css + '\n'
open(p, 'w', encoding='utf8', newline='\n').write(s)

p = 'src/templates/t02/Template02.tsx'
s = open(p, encoding='utf8').read()
a = '''                  loading="lazy"
                />
                {caption && <figcaption>{caption}</figcaption>}'''
b = '''                  loading="lazy"
                />
                {item.videoId && (
                  <span className="mp-foto-play" aria-hidden="true">
                    ▶
                  </span>
                )}
                {caption && <figcaption>{caption}</figcaption>}'''
assert s.count(a) == 1; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)
