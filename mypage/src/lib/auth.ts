import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Local session auth.
 *
 * Doc 03 item 2 lists "Autenticação Muska, IDs de artista, permissões" as an
 * access still to be requested. Until that exists, this module owns identity
 * locally. It is deliberately small and swappable: everything the rest of the
 * app consumes goes through `requireAccount` / `requireArtistAccess`, so
 * replacing the implementation with the Muska provider touches only this file.
 */

const SESSION_COOKIE = "mypage_session";
const SESSION_DAYS = 30;

// --- Password hashing --------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (derived.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

// --- Sessions ----------------------------------------------------------------

function tokenHash(token: string): string {
  // Only the hash is stored: a database read cannot resurrect a live session.
  return createHash("sha256").update(`${token}${process.env.AUTH_SECRET ?? ""}`).digest("hex");
}

export async function createSession(accountId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token: tokenHash(token), accountId, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token: tokenHash(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export interface SessionAccount {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
}

export async function getAccount(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token: tokenHash(token) },
    include: { account: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.account.id,
    email: session.account.email,
    displayName: session.account.displayName,
    phone: session.account.phone,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404 = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAccount(): Promise<SessionAccount> {
  const account = await getAccount();
  if (!account) throw new AuthError("Sessão inválida ou expirada.", 401);
  return account;
}

// --- Per-artist isolation ----------------------------------------------------

export type Role = "owner" | "manager" | "viewer";

const WRITE_ROLES: Role[] = ["owner", "manager"];

export interface ArtistAccess {
  account: SessionAccount;
  artistId: string;
  role: Role;
}

/**
 * The single gate every artist-scoped operation must pass through.
 *
 * Doc 03: "Isolamento por artista em todas as operações; testar acesso indevido
 * a IDs de outro artista." A missing membership returns 404 rather than 403 so
 * the endpoint does not confirm that an unrelated artist id exists.
 */
export async function requireArtistAccess(
  artistId: string,
  options: { write?: boolean } = {},
): Promise<ArtistAccess> {
  const account = await requireAccount();
  const membership = await db.membership.findUnique({
    where: { accountId_artistId: { accountId: account.id, artistId } },
  });
  if (!membership) throw new AuthError("Artista não encontrado.", 404);

  const role = membership.role as Role;
  if (options.write && !WRITE_ROLES.includes(role)) {
    throw new AuthError("A tua função não permite editar este artista.", 403);
  }
  return { account, artistId, role };
}

/** Artists the signed-in account manages. Backs `GET /api/me`. */
export async function listManagedArtists(accountId: string) {
  const memberships = await db.membership.findMany({
    where: { accountId },
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.artist.id,
    slug: m.artist.slug,
    displayName: m.artist.displayName,
    plan: m.artist.plan,
    muskaId: m.artist.muskaId,
    role: m.role as Role,
  }));
}

/** Convenience for pages: the account's first artist, or null. */
export async function getCurrentArtistId(accountId: string): Promise<string | null> {
  const membership = await db.membership.findFirst({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });
  return membership?.artistId ?? null;
}
