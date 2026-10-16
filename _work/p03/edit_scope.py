import sys
p = 'scripts/scope-template-css.py'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    if old not in s: sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)
rep('''Usage (from the mypage folder):
    python scripts/scope-template-css.py <page.html> src/styles/template-02.css
    python scripts/scope-template-css.py <page.html> src/styles/template-01.css
"""''', '''Página 3 · DJs & Producers (the Ellputo handoff, template 06) ships its
styles as four separate layers instead of <style> blocks; pass them in order
(style.css template-06.css motion.css gallery.css) and they are read as one.
Its state lives on <body> as classes (template-06, motion-edition,
motion-paused), which the root element carries instead.

Usage (from the mypage folder):
    python scripts/scope-template-css.py <page.html> src/styles/template-02.css
    python scripts/scope-template-css.py <page.html> src/styles/template-01.css
    python scripts/scope-template-css.py style.css template-06.css motion.css gallery.css src/styles/template-06.css
"""''')
rep('''STATE_CLASSES = {"mp-mov", "mp-entrou", "mp-luz", "mp-rolou", "mp-menu-aberto", "mp-parado"}''',
'''STATE_CLASSES = {
    "mp-mov", "mp-entrou", "mp-luz", "mp-rolou", "mp-menu-aberto", "mp-parado",
    # Template 06: classes on <body>.
    "template-06", "motion-edition", "motion-paused",
}''')
rep('''def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)''', '''def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def strip_imports(css: str) -> str:
    # Web fonts are loaded by the renderer; an @import has no block to scope.
    return re.sub(r"@import[^;]*;", "", css)''')
rep('''    if sel.startswith("*"):
        return f"{ROOT} {sel}"''', '''    if sel.startswith("*"):
        return f"{ROOT} {sel}"
    # body.template-06>main  ->  .t06.template-06>main
    m = re.match(r"body((?:\.[\w-]+)+)(.*)", sel)
    if m:
        return ROOT + m.group(1) + m.group(2)''')
rep('''    ".t02": "Template 02 · versão 1 (Deekay handoff, deekay-v1-publicar.zip)",''', '''    ".t02": "Template 02 · versão 1 (Deekay handoff, deekay-v1-publicar.zip)",
    ".t06": "Página 3 · DJs & Producers, template 06 (Ellputo handoff, Entrega-Fabio-Pagina-03-DJs-Producers)",''')
rep('''    source, target = sys.argv[1], sys.argv[2]''', '''    *sources, target = sys.argv[1:]''')
rep('''    css = strip_comments(read_styles(open(source, encoding="utf-8").read()))''', '''    parts = []
    for source in sources:
        raw = open(source, encoding="utf-8").read()
        parts.append(raw if source.endswith(".css") else read_styles(raw))
    css = strip_imports(strip_comments("\n".join(parts)))''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
