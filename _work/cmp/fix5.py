def edit(p, pairs):
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert a in s, (p, a[:60])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf8', newline='\n').write(s)

edit('src/components/studio/editor/ContentCards.tsx', [
    (' * Editors for the structured content brought by Template 02 · versão 1:',
     ' * Editors for the structured content brought by Templates 02 and 01 · versão 1:'),
    ('Cada parágrafo da biografia é um capítulo. No template 02 a fotografia',
     'Cada parágrafo da biografia é um capítulo. Nos templates 01 e 02 a fotografia'),
    ('No template 02 isto forma a página de booking:',
     'Nos templates 01 e 02 isto forma a página de booking:'),
])
edit('src/components/studio/editor/PageEditor.tsx', [
    ('title="Alimenta a página de booking do template 02"',
     'title="Alimenta a página de booking dos templates 01 e 02"'),
])
