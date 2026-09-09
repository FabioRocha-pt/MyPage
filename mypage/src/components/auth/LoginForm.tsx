"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sign in.
 *
 * POST /api/auth/login answers with the same message for an unknown email and a
 * wrong password, so this form shows whatever the server says and never adds a
 * hint of its own — no user enumeration through the UI either.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Não foi possível entrar.");
        return;
      }
      // The session cookie is set by the route; refresh so server components
      // pick it up before navigating.
      router.replace(next);
      router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Palavra-passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
