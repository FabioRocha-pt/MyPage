import sys
p = 'src/components/studio/editor/PageEditor.tsx'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    if old not in s: sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)
rep('import { DiscographyFields, GalleryCard, HighlightsCard, LogoDarkField, RiderCard, StoryFields } from "./ContentCards";',
    'import { DiscographyFields, GalleryCard, HighlightsCard, LogoDarkField, Page3Fields, RiderCard, StoryFields, type Page3Part } from "./ContentCards";')
rep('''                  {cardId === "events" && (
                    <SelectionCard''', '''                  {/* Página 3 · DJs & Producers: its own content, only while it is the chosen template. */}
                  {appearance.templateId === "06" &&
                    (["basic", "music", "highlights", "video", "gallery", "rider"] as string[]).includes(cardId) && (
                      <Page3Fields
                        part={cardId as Page3Part}
                        content={content}
                        images={props.images}
                        videos={props.videos}
                        onChange={patchContent}
                      />
                    )}

                  {cardId === "events" && (
                    <SelectionCard''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
