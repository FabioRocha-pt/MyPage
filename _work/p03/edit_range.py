import sys
def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s: sys.exit(p + ' NOT FOUND: ' + old[:80])
        s = s.replace(old, new, 1)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

edit('src/lib/storage.ts', [('''/** Streams a stored object. The caller is responsible for authorising the read. */
export function readStream(key: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(resolveKey(key));''', '''/**
 * Streams a stored object, or the inclusive byte `range` of it (video seeking).
 * The caller is responsible for authorising the read.
 */
export function readStream(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(resolveKey(key), range);''')])

edit('src/app/api/media/[id]/view/route.ts', [
('''import { etagFor, exists, readStream } from "@/lib/storage";''', '''import { etagFor, readStream, size } from "@/lib/storage";'''),
('''  if (!(await exists(key))) throw new ApiError("Ficheiro indisponível.", 410, "gone");''', '''  const bytes = await size(key);
  if (bytes === null) throw new ApiError("Ficheiro indisponível.", 410, "gone");'''),
('''  const isDerived = key === media.derivedKey;
  const contentType = isDerived ? "image/webp" : media.mimeType;

  return new Response(readStream(key), {
    headers: {
      "Content-Type": contentType,
      ETag: etag,''', '''  const isDerived = key === media.derivedKey;
  const contentType = isDerived ? "image/webp" : media.mimeType;

  // Video players (Safari above all) only play a file served in byte ranges.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  let slice: { start: number; end: number } | undefined;
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, bytes - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), bytes - 1) : bytes - 1;
    if (start >= bytes || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes}` } });
    }
    slice = { start, end };
  }

  return new Response(readStream(key, slice), {
    status: slice ? 206 : 200,
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Length": String(slice ? slice.end - slice.start + 1 : bytes),
      ...(slice ? { "Content-Range": `bytes ${slice.start}-${slice.end}/${bytes}` } : {}),
      ETag: etag,'''),
])
print('ok')
