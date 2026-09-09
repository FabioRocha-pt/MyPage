/**
 * Browser-side API helper.
 *
 * Every route handler answers with either the payload or
 * `{ error: { code, message, details } }` (lib/api.ts), so one helper can turn
 * both into the same shape and every manager screen reports server messages
 * verbatim instead of inventing its own wording.
 */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  code: string | null;
  details: unknown;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body instanceof FormData || body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: payload?.error?.message ?? "Ocorreu um erro inesperado.",
        code: payload?.error?.code ?? "unknown",
        details: payload?.error?.details ?? null,
      };
    }

    return { ok: true, status: response.status, data: payload as T, error: null, code: null, details: null };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Sem ligação ao servidor.",
      code: "offline",
      details: null,
    };
  }
}

export const getJson = <T>(url: string) => request<T>("GET", url);
export const postJson = <T>(url: string, body?: unknown) => request<T>("POST", url, body);
export const putJson = <T>(url: string, body?: unknown) => request<T>("PUT", url, body);
export const patchJson = <T>(url: string, body?: unknown) => request<T>("PATCH", url, body);
export const deleteJson = <T>(url: string) => request<T>("DELETE", url);
