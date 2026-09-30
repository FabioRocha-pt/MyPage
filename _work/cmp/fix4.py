p = 'tests/mobile-public.spec.ts'
s = open(p, encoding='utf8').read()
a = ''' * it, so a published page lost both its section nav and its date thumbnails.
 */
test("template pages keep their section nav and event posters", async ({ page }) => {
  await page.goto("/templates/01");'''
b = ''' * it, so a published page lost both its section nav and its date thumbnails.
 * Templates 01 and 02 have their own renderers now; 03 still uses the shared one.
 */
test("template pages keep their section nav and event posters", async ({ page }) => {
  await page.goto("/templates/03");'''
assert a in s; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)
