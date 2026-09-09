import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Private media storage.
 *
 * Doc 03: "Validar conteúdo/tamanho dos uploads no servidor, inspecionar
 * malware conforme estratégia, impedir execução de ficheiros ativos. Originais
 * e downloads pagos privados."
 *
 * Nothing written here lands in /public. Keys are opaque and unguessable, and
 * every read goes through an authorised route handler. Swapping the local disk
 * for S3 means reimplementing `put`, `read`, `remove` and `signedPath`.
 */

const ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB, matching the prototype limit.
export const DERIVED_MAX_EDGE = 1600; // Prototype: canvas WebP up to 1600 px.

/**
 * Allowed types. Anything the browser can execute — SVG, HTML, scripts — is
 * absent on purpose: an SVG served from our origin is an XSS vector.
 */
export const ALLOWED_TYPES: Record<string, { kind: MediaKind; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "image/avif": { kind: "image", ext: "avif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
  "audio/mpeg": { kind: "audio", ext: "mp3" },
  "audio/mp4": { kind: "audio", ext: "m4a" },
  "audio/wav": { kind: "audio", ext: "wav" },
  "audio/x-wav": { kind: "audio", ext: "wav" },
  "audio/ogg": { kind: "audio", ext: "ogg" },
  "audio/flac": { kind: "audio", ext: "flac" },
  "application/pdf": { kind: "document", ext: "pdf" },
};

export type MediaKind = "image" | "video" | "audio" | "document";

/**
 * Magic-number check. A client-declared Content-Type is a hint, not evidence:
 * a .php renamed to .png arrives with image/png. These signatures are what we
 * actually trust.
 */
const SIGNATURES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/gif", test: (b) => b.subarray(0, 6).toString("ascii").startsWith("GIF8") },
  { mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "image/avif", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" && b.subarray(8, 12).toString("ascii").startsWith("avif") },
  { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
  { mime: "video/mp4", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" },
  { mime: "video/quicktime", test: (b) => b.subarray(4, 12).toString("ascii") === "ftypqt  " },
  { mime: "video/webm", test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  { mime: "audio/mpeg", test: (b) => b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/wav", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE" },
  { mime: "audio/ogg", test: (b) => b.subarray(0, 4).toString("ascii") === "OggS" },
  { mime: "audio/flac", test: (b) => b.subarray(0, 4).toString("ascii") === "fLaC" },
  { mime: "audio/mp4", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" && /M4A|mp42|isom/.test(b.subarray(8, 12).toString("ascii")) },
];

export interface SniffResult {
  mime: string;
  kind: MediaKind;
  ext: string;
}

export function sniff(buffer: Buffer, declared: string): SniffResult | null {
  const matches = SIGNATURES.filter((s) => s.test(buffer)).map((s) => s.mime);
  if (matches.length === 0) return null;

  // Prefer the declared type when the bytes agree with it — mp4/m4a/mov all
  // share the ftyp box, so the declaration disambiguates the container.
  const chosen = matches.includes(declared) ? declared : matches[0];
  const entry = ALLOWED_TYPES[chosen];
  if (!entry) return null;
  return { mime: chosen, kind: entry.kind, ext: entry.ext };
}

// --- Keys and paths ----------------------------------------------------------

/**
 * Keys are `<artistId>/<random>.<ext>`. The random component makes a private
 * file unreachable by guessing, which doc 02 requires: "ficheiro privado não
 * pode ser acessível publicamente por URL previsível".
 */
export function makeKey(artistId: string, ext: string, suffix = ""): string {
  const id = randomBytes(18).toString("base64url");
  return `${artistId}/${id}${suffix}.${ext}`;
}

function resolveKey(key: string): string {
  const target = path.resolve(ROOT, key);
  // Traversal guard: a key containing ../ must never escape the storage root.
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    throw new Error("Chave de armazenamento inválida.");
  }
  return target;
}

// --- Operations --------------------------------------------------------------

export async function put(key: string, data: Buffer): Promise<void> {
  const target = resolveKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function remove(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await rm(resolveKey(key), { force: true });
  } catch {
    // A missing file is not an error worth surfacing during a delete.
  }
}

export async function size(key: string): Promise<number | null> {
  try {
    return (await stat(resolveKey(key))).size;
  } catch {
    return null;
  }
}

export async function exists(key: string): Promise<boolean> {
  return (await size(key)) !== null;
}

/** Streams a stored object. The caller is responsible for authorising the read. */
export function readStream(key: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(resolveKey(key));
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (error) => controller.error(error));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

// --- Derivatives -------------------------------------------------------------

export interface Derivative {
  key: string;
  bytes: number;
  width: number;
  height: number;
}

export interface ImageMeta {
  width: number;
  height: number;
}

export async function imageMeta(buffer: Buffer): Promise<ImageMeta | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

/**
 * Produces the lightweight public derivative. The original is kept untouched so
 * doc 04's acceptance criterion "original recuperável" holds.
 */
export async function makeImageDerivative(
  buffer: Buffer,
  artistId: string,
): Promise<Derivative | null> {
  try {
    const pipeline = sharp(buffer, { failOn: "error" })
      .rotate() // Honour EXIF orientation, then drop the metadata below.
      .resize({
        width: DERIVED_MAX_EDGE,
        height: DERIVED_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    const key = makeKey(artistId, "webp", "-d");
    await put(key, data);
    return { key, bytes: data.length, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/**
 * Downsamples an image to a 64×64 raw buffer for palette extraction, matching
 * the prototype's canvas approach but without a browser.
 */
export async function paletteSample(buffer: Buffer): Promise<Uint8Array | null> {
  try {
    const { data } = await sharp(buffer)
      .resize(64, 64, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Uint8Array(data);
  } catch {
    return null;
  }
}

/** Stable etag so browsers can cache a derivative that never changes. */
export function etagFor(key: string): string {
  return `"${createHash("sha1").update(key).digest("hex")}"`;
}

export function storageRoot(): string {
  return ROOT;
}
