import sys
p='src/templates/t06/Template06.tsx'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    if old not in s: sys.exit('NOT FOUND '+old[:70])
    s=s.replace(old,new,count)
rep('''  // Every titled block is numbered in reading order: "01 / THE ARTIST".
  let count = 0;
  const label = (text: string) => `${String(++count).padStart(2, "0")} / ${text}`;
  const ctx: Ctx = { snapshot, content, label };
''','''  // Every titled block is numbered in reading order ("01 / THE ARTIST"); the
  // number is fixed here, when the block is placed, not when React renders it.
  let count = 0;
  const numbered = () => {
    const n = String(++count).padStart(2, "0");
    return (text: string) => `${n} / ${text}`;
  };
  const at = (): Ctx => ({ snapshot, content, label: numbered() });
''')
s=s.replace('{...ctx}','{...at()}')
rep('''<Shared key="donations" id="support" label={label("SUPPORT")}''','''<Shared key="donations" id="support" label={numbered()("SUPPORT")}''')
rep('''<Shared key="store" id="store" label={label("STORE")}''','''<Shared key="store" id="store" label={numbered()("STORE")}''')
open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok', s.count('{...at()}'))
