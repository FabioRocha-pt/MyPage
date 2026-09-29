"""
Scopes a template stylesheet from the static handoff under one class.

The handoff pages (deekay-v1-publicar.zip, Template 02 · versão 1, and
kevy-v1-publicar.zip, Template 01 · versão 1) are written
for a document of their own: rules on :root, html and body, state classes on
<html> (mp-mov, mp-entrou, mp-luz, mp-rolou, mp-menu-aberto) and bare names
such as .nav and .hero. Inside the app every page shares one document, so the
sheet is rewritten to live under a single root class:

    :root / html / body           -> .t02
    :root[data-mypage="on"]       -> .t02.t02   (keeps its extra specificity)
    .mp-mov .x   (state on html)  -> .t02.mp-mov .x
    .mp-luz body::after           -> .t02.mp-luz::after
    anything else                 -> .t02 <selector>
    @keyframes name               -> @keyframes t02-name  (and every use)

The root class comes from the target file name (template-01.css -> .t01).

Usage (from the mypage folder):
    python scripts/scope-template-css.py <page.html> src/styles/template-02.css
    python scripts/scope-template-css.py <page.html> src/styles/template-01.css
"""

import re
import sys

ROOT = ".t02"  # set from the target file name in main()
STATE_CLASSES = {"mp-mov", "mp-entrou", "mp-luz", "mp-rolou", "mp-menu-aberto", "mp-parado"}


def read_styles(html: str) -> str:
    return "\n".join(m.group(1) for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S))


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def split_top(text: str, sep: str) -> list[str]:
    """Splits on `sep` outside brackets, parentheses and strings."""
    out, depth, quote, cur = [], 0, None, []
    for ch in text:
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif ch == sep and depth == 0:
            out.append("".join(cur))
            cur = []
            continue
        cur.append(ch)
    out.append("".join(cur))
    return out


def blocks(css: str):
    """Yields (prelude, body) for each top-level block."""
    i, n = 0, len(css)
    while i < n:
        start = css.find("{", i)
        if start < 0:
            return
        prelude = css[i:start].strip()
        depth, j, quote = 1, start + 1, None
        while j < n and depth:
            ch = css[j]
            if quote:
                if ch == quote:
                    quote = None
            elif ch in "\"'":
                quote = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            j += 1
        yield prelude, css[start + 1 : j - 1]
        i = j


def scope_selector(sel: str) -> str:
    sel = " ".join(sel.split())
    if not sel:
        return sel
    if sel.startswith(':root[data-mypage="on"]'):
        return ROOT + ROOT + sel[len(':root[data-mypage="on"]'):]
    for prefix in (":root", "html", "body"):
        if re.match(rf"{re.escape(prefix)}(?![\w-])", sel):
            return ROOT + sel[len(prefix):]
    if sel.startswith("*"):
        return f"{ROOT} {sel}"

    # State classes that the handoff toggles on <html>.
    m = re.match(r"((?:\.[\w-]+)+)(.*)", sel)
    if m:
        classes = re.findall(r"\.([\w-]+)", m.group(1))
        if classes and all(c in STATE_CLASSES for c in classes):
            rest = m.group(2)
            rest_m = re.match(r"\s+body(?![\w-])(.*)", rest)
            if rest_m:
                rest = rest_m.group(1)
            return ROOT + m.group(1) + rest
    return f"{ROOT} {sel}"


def rename_animations(body: str, names: set[str]) -> str:
    def fix(decl: re.Match) -> str:
        value = decl.group(2)
        for name in names:
            value = re.sub(rf"(?<![\w-]){re.escape(name)}(?![\w-])", f"{ROOT[1:]}-{name}", value)
        return decl.group(1) + value

    return re.sub(r"(animation(?:-name)?\s*:)([^;}]*)", fix, body)


def fix_declarations(selector: str, body: str) -> str:
    # overflow-x:hidden on the page root would make it a scroll container and
    # break the sticky biography photo; clip hides the overflow without that.
    if selector == ROOT:
        body = body.replace("overflow-x:hidden", "overflow-x:clip")
    # Relative asset URLs point at the handoff's own demo images (Template 01
    # keeps one on an unused .portrait rule); the bundler cannot resolve them.
    body = re.sub(r"url\(\s*([\"']?)(?:\./)?[\w-]+/[\w./-]+\.(?:png|jpe?g|webp|gif|avif)\1\s*\)", "none", body)
    return body


def transform(css: str, names: set[str]) -> str:
    out = []
    for prelude, body in blocks(css):
        if prelude.startswith("@keyframes"):
            name = prelude.split()[1]
            out.append(f"@keyframes {ROOT[1:]}-{name}{{{body.strip()}}}")
        elif prelude.startswith("@media") or prelude.startswith("@supports"):
            out.append(f"{prelude}{{\n{transform(body, names)}\n}}")
        else:
            selectors = [scope_selector(s) for s in split_top(prelude, ",")]
            decl = rename_animations(body.strip(), names)
            decl = fix_declarations(selectors[0] if len(selectors) == 1 else "", decl)
            out.append(f"{','.join(selectors)}{{{decl}}}")
    return "\n".join(out)


HANDOFF = {
    ".t01": "Template 01 · versão 1 (Kevy handoff, kevy-v1-publicar.zip)",
    ".t02": "Template 02 · versão 1 (Deekay handoff, deekay-v1-publicar.zip)",
}

HEADER = """/*
 * {handoff}.
 *
 * GENERATED by scripts/scope-template-css.py from the handoff page. Do not edit
 * the scoped rules by hand: fix the source and regenerate, so the next handoff
 * can be re-imported the same way. App-specific additions live in the block
 * at the end of this file, after the marker.
 */

{root}{{position:relative;isolation:isolate;min-height:100vh}}
html:has({root}){{scroll-behavior:smooth}}
"""

MARKER = "/* ===== app additions (kept when regenerating) ===== */"


def main() -> None:
    global ROOT
    source, target = sys.argv[1], sys.argv[2]
    m = re.search(r"template-(\d+)\.css$", target)
    if not m:
        sys.exit("target must be src/styles/template-NN.css")
    ROOT = f".t{m.group(1)}"
    css = strip_comments(read_styles(open(source, encoding="utf-8").read()))
    names = set(re.findall(r"@keyframes\s+([\w-]+)", css))
    scoped = transform(css, names)

    additions = ""
    try:
        existing = open(target, encoding="utf-8").read()
        if MARKER in existing:
            additions = existing[existing.index(MARKER):]
    except FileNotFoundError:
        pass

    with open(target, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(HEADER.format(handoff=HANDOFF.get(ROOT, ROOT), root=ROOT) + "\n" + scoped + "\n\n" + (additions or MARKER + "\n"))


if __name__ == "__main__":
    main()
