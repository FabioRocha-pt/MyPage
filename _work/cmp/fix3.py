p = 'tests/mobile-public.spec.ts'
s = open(p, encoding='utf8').read()
a = '''  { path: "/p/deekay/booking", name: "published booking page · deekay" },'''
b = a + '''
  // Template 01 · v1 with real content and its booking page. Needs `npm run db:seed:kevy`.
  { path: "/p/kevy", name: "published page · kevy" },
  { path: "/p/kevy/booking", name: "published booking page · kevy" },'''
assert a in s; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)
