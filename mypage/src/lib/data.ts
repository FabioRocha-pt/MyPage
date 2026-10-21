import { cookies } from "next/headers";
import { AuthError } from "./auth";
import { loaders, type LoaderName, type Loaders } from "./loaders";

/**
 * How pages read data: `await load.studioContext()`, `await load.publishedSnapshot(slug)`.
 *
 * MYPAGE_ROLE decides where a loader (lib/loaders) runs:
 *   all (default)  this process owns the database: the loader runs in-process,
 *                  exactly as if the page had called it directly.
 *   web            frontend only, no database: the loader runs on the API server
 *                  (API_URL) through /api/internal/load/<name>, with the visitor's
 *                  cookie, and its result, redirects and errors are replayed here.
 *   api            backend only; pages are not served (server.js).
 */

export type AppRole = "all" | "web" | "api";

export function appRole(): AppRole {
  const role = process.env.MYPAGE_ROLE;
  return role === "web" || role === "api" ? role : "all";
}

/** Header carrying INTERNAL_API_SECRET from the frontend to the API server. */
export const INTERNAL_SECRET_HEADER = "x-mypage-internal";

// --- Wire format ---------------------------------------------------------------

/** What /api/internal/load answers. */
export type LoadReply =
  | { ok: true; data: unknown }
  /** A Next redirect() or notFound() thrown by the loader, by its digest. */
  | { ok: false; digest: string }
  | { ok: false; authError: { message: string; status: 401 | 403 | 404 } };

/** JSON with Dates kept as Dates: Prisma rows carry them and pages call their methods. */
export function encode(value: unknown): string {
  return JSON.stringify(value, function (key, item) {
    const raw = (this as Record<string, unknown>)[key];
    return raw instanceof Date ? { $date: raw.toISOString() } : item;
  });
}

export function decode(text: string): unknown {
  return JSON.parse(text, (_key, item) =>
    item && typeof item === "object" && typeof item.$date === "string" && Object.keys(item).length === 1
      ? new Date(item.$date)
      : item,
  );
}

/**
 * The reply for a loader that threw. Next's redirect() and notFound() are errors
 * identified by their `digest`; passing the digest back lets the frontend
 * rethrow the very same signal. Anything else is a real failure.
 */
export function replyForError(error: unknown): LoadReply | null {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest === "string" && /^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK);/.test(digest)) {
    return { ok: false, digest };
  }
  if (error instanceof AuthError) {
    return { ok: false, authError: { message: error.message, status: error.status } };
  }
  return null;
}

// --- Remote call -----------------------------------------------------------------

async function remote(name: LoaderName, args: unknown[]): Promise<unknown> {
  const base = process.env.API_URL;
  if (!base) throw new Error("MYPAGE_ROLE=web precisa de API_URL (o endereço do servidor da API).");

  const store = await cookies();
  const response = await fetch(new URL(`/api/internal/load/${name}`, base), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: store.toString(),
      [INTERNAL_SECRET_HEADER]: process.env.INTERNAL_API_SECRET ?? "",
    },
    body: encode(args),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`API ${response.status} em /api/internal/load/${name}: ${await response.text()}`);
  }

  const reply = decode(await response.text()) as LoadReply;
  if (reply.ok) return reply.data;
  if ("digest" in reply) {
    throw Object.assign(new Error(reply.digest.split(";")[0]), { digest: reply.digest });
  }
  throw new AuthError(reply.authError.message, reply.authError.status);
}

type Load = {
  [K in LoaderName]: (...args: Parameters<Loaders[K]>) => Promise<Awaited<ReturnType<Loaders[K]>>>;
};

export const load = new Proxy({} as Load, {
  get(_target, name: string) {
    if (!(name in loaders)) return undefined;
    const key = name as LoaderName;
    return (...args: unknown[]) =>
      appRole() === "web"
        ? remote(key, args)
        : (loaders[key] as (...a: unknown[]) => Promise<unknown>)(...args);
  },
});
