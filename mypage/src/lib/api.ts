import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { EntitlementError } from "./entitlements";

/**
 * Consistent error shape across every route handler.
 * Doc 03: "Definir paginação, filtros, erros consistentes, validação, limites,
 * rate limiting e prevenção de abuso."
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "bad_request",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, code = "bad_request", details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Wraps a handler so thrown domain errors become well-formed responses. */
export function handle<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.message, error.status, error.code, error.details);
      }
      if (error instanceof AuthError) {
        return fail(error.message, error.status, error.status === 403 ? "forbidden" : "unauthorized");
      }
      if (error instanceof EntitlementError) {
        return fail(error.message, 402, "plan_required", { tool: error.tool });
      }
      console.error("[api]", error);
      const message =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado.";
      return fail(message, 500, "internal_error");
    }
  };
}

// --- Body parsing ------------------------------------------------------------

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") throw new Error();
    return body as T;
  } catch {
    throw new ApiError("Corpo do pedido inválido.", 400, "invalid_body");
  }
}

// --- Field helpers -----------------------------------------------------------

export function requireString(
  source: Record<string, unknown>,
  field: string,
  { max = 500, min = 1 }: { max?: number; min?: number } = {},
): string {
  const value = source[field];
  if (typeof value !== "string" || value.trim().length < min) {
    throw new ApiError(`Campo obrigatório em falta: ${field}.`, 400, "missing_field", { field });
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ApiError(`O campo ${field} excede ${max} caracteres.`, 400, "field_too_long", { field });
  }
  return trimmed;
}

export function optionalString(
  source: Record<string, unknown>,
  field: string,
  max = 4000,
): string | null {
  const value = source[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(`O campo ${field} deve ser texto.`, 400, "invalid_field", { field });
  }
  return value.trim().slice(0, max) || null;
}

export function requireInt(
  source: Record<string, unknown>,
  field: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const value = source[field];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(`O campo ${field} deve ser um inteiro entre ${min} e ${max}.`, 400, "invalid_field", { field });
  }
  return parsed;
}

export function optionalInt(
  source: Record<string, unknown>,
  field: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number | null {
  const value = source[field];
  if (value === undefined || value === null || value === "") return null;
  return requireInt(source, field, { min, max });
}

export function requireEnum<T extends string>(
  source: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T {
  const value = source[field];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ApiError(
      `O campo ${field} deve ser um de: ${allowed.join(", ")}.`,
      400,
      "invalid_field",
      { field, allowed },
    );
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  source: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = source[field];
  if (value === undefined || value === null || value === "") return fallback;
  return requireEnum(source, field, allowed);
}

export function requireDate(source: Record<string, unknown>, field: string): Date {
  const value = source[field];
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(`O campo ${field} deve ser uma data.`, 400, "invalid_field", { field });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`Data inválida em ${field}.`, 400, "invalid_field", { field });
  }
  return date;
}

export function optionalDate(source: Record<string, unknown>, field: string): Date | null {
  const value = source[field];
  if (value === undefined || value === null || value === "") return null;
  return requireDate(source, field);
}

export function requireBool(source: Record<string, unknown>, field: string, fallback = false): boolean {
  const value = source[field];
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

// --- Pagination --------------------------------------------------------------

export interface Page {
  take: number;
  skip: number;
  page: number;
  perPage: number;
}

export function pagination(request: Request, { defaultPerPage = 24, maxPerPage = 100 } = {}): Page {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, Number(url.searchParams.get("perPage") ?? defaultPerPage) || defaultPerPage));
  return { take: perPage, skip: (page - 1) * perPage, page, perPage };
}

export function paged<T>(items: T[], total: number, page: Page) {
  return {
    items,
    pagination: {
      page: page.page,
      perPage: page.perPage,
      total,
      pages: Math.max(1, Math.ceil(total / page.perPage)),
    },
  };
}

// --- Slug --------------------------------------------------------------------

export function slugify(input: string): string {
  // Decompose, then drop Unicode combining marks (U+0300–U+036F) so accented
  // names produce clean ASCII slugs.
  return [...input.normalize("NFD")]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Reserved so a page slug can never shadow an application route. */
const RESERVED_SLUGS = new Set([
  "api", "studio", "login", "logout", "signup", "admin", "p", "preview", "artists",
  "templates", "pricing", "www", "muska", "mypage", "my-page", "assets", "static",
  "_next", "favicon", "robots", "sitemap", "help", "support", "terms", "privacy",
]);

export function assertSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ApiError(
      "O endereço só pode conter letras minúsculas, números e hífenes.",
      400,
      "invalid_slug",
    );
  }
  if (slug.length < 3 || slug.length > 48) {
    throw new ApiError("O endereço deve ter entre 3 e 48 caracteres.", 400, "invalid_slug");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new ApiError("Este endereço está reservado. Escolhe outro.", 409, "reserved_slug");
  }
  return slug;
}

// --- Text safety -------------------------------------------------------------

/**
 * Plain-text sanitiser. All artist-authored copy is rendered as text nodes by
 * React, never with dangerouslySetInnerHTML, so escaping is already handled;
 * this strips control characters and caps length before storage.
 */
export function cleanText(input: string, max = 4000): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[ --]/g, "")
    .trim()
    .slice(0, max);
}

// --- Rate limiting -----------------------------------------------------------

/**
 * In-memory fixed-window limiter for public write endpoints (booking requests,
 * tool requests, checkout). Enough for a single instance; a shared store is
 * required before running more than one (noted in README).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ApiError(
      "Demasiados pedidos. Tenta novamente dentro de alguns minutos.",
      429,
      "rate_limited",
    );
  }
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
