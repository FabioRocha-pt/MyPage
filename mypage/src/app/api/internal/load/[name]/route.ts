import { timingSafeEqual } from "node:crypto";
import { appRole, decode, encode, INTERNAL_SECRET_HEADER, replyForError, type LoadReply } from "@/lib/data";
import { loaders, type LoaderName } from "@/lib/loaders";

/**
 * Runs a page loader for the frontend server (MYPAGE_ROLE=web, lib/data).
 *
 * Only answers on the API server, and only to a caller holding
 * INTERNAL_API_SECRET; the frontend's server.js also refuses to forward
 * /api/internal from the internet. The loaders read the session from the
 * forwarded cookie themselves, so the secret proves who is asking, not who
 * is signed in.
 */

function authorised(request: Request): boolean {
  const expected = process.env.INTERNAL_API_SECRET ?? "";
  const given = request.headers.get(INTERNAL_SECRET_HEADER) ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const reply = (body: LoadReply, status = 200) =>
  new Response(encode(body), { status, headers: { "content-type": "application/json" } });

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (appRole() !== "api" || !authorised(request)) return new Response("Not found", { status: 404 });

  const { name } = await params;
  if (!Object.hasOwn(loaders, name)) return new Response("Unknown loader", { status: 404 });

  const args = decode(await request.text());
  if (!Array.isArray(args)) return new Response("Bad arguments", { status: 400 });

  try {
    const run = loaders[name as LoaderName] as (...a: unknown[]) => Promise<unknown>;
    return reply({ ok: true, data: await run(...args) });
  } catch (error) {
    const known = replyForError(error);
    if (known) return reply(known);
    console.error(`[internal/load/${name}]`, error);
    return new Response("Loader failed", { status: 500 });
  }
}
