p = 'src/templates/t01/Template01.tsx'
s = open(p, encoding='utf8').read()
a = '''  const heroLinks = snapshot.links.filter((link) => link.placement === "hero" || link.placement === "both");'''
b = '''  // Template 01 lists every network in the hero column, as the handoff does.
  const heroLinks = snapshot.links;'''
assert a in s; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)

p = 'prisma/seed-handoff.ts'
s = open(p, encoding='utf8').read()
a = '''  const sectionOrder = ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];'''
b = '''  const sectionOrder =
    data.template === "01"
      ? ["hero", "music", "video", "biography", "highlights", "gallery", "events", "press", "booking", "donations", "store"]
      : ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];'''
assert a in s; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)
