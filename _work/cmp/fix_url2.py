p = 'scripts/scope-template-css.py'
s = open(p, encoding='utf8').read()
a = '''        body = body.replace("overflow-x:hidden", "overflow-x:clip")
    return body'''
b = r'''        body = body.replace("overflow-x:hidden", "overflow-x:clip")
    # Relative asset URLs point at the handoff's own demo images (Template 01
    # keeps one on an unused .portrait rule); the bundler cannot resolve them.
    body = re.sub(r"url\(\s*([\"']?)(?:\./)?[\w-]+/[\w./-]+\.(?:png|jpe?g|webp|gif|avif)\1\s*\)", "none", body)
    return body'''
assert a in s
open(p, 'w', encoding='utf8', newline='\n').write(s.replace(a, b))
