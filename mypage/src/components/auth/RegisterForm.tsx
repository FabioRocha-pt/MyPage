"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Create an account and its first artist.
 *
 * Doc 01 leaves the public address format open ("subdomínio ou caminho, a
 * confirmar com o proprietário"), so the prefix shown here comes from the
 * server via `domain` instead of being written into the markup.
 *
 * The slug preview below is cosmetic: POST /api/auth/register slugifies the
 * value again and appends a counter if it is taken, so the server stays the
 * authority on what the address ends up being.
 */

/** Mirrors `slugify` in lib/api.ts, which cannot be imported into a client
 *  component because that module pulls in next/server. */
function previewSlug(value: string): string {
  return [...value.normalize("NFD")]
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

export function RegisterForm({ domain }: { domain: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveSlug = slugTouched ? previewSlug(slug) : previewSlug(displayName);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 8) {
      setError("A palavra-passe precisa de pelo menos 8 caracteres.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          password,
          slug: effectiveSlug || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Não foi possível criar a conta.");
        return;
      }
      router.replace("/studio");
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
        <label htmlFor="displayName">Nome artístico</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={80}
          autoComplete="nickname"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          autoFocus
        />
        <span className="auth-hint">É este o nome que aparece na página pública.</span>
      </div>

      <div className="auth-field">
        <label htmlFor="slug">Endereço da página</label>
        <div className="auth-slug">
          <span>{domain}/p/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            maxLength={48}
            spellCheck={false}
            value={slugTouched ? slug : effectiveSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="o-teu-nome"
          />
        </div>
        <span className="auth-hint">Podes mudar mais tarde. Se já estiver ocupado, juntamos um número.</span>
      </div>

      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <span className="auth-hint">Fica privado: serve para entrar e receber avisos.</span>
      </div>

      <div className="auth-field">
        <label htmlFor="password">Palavra-passe</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="auth-hint">Mínimo 8 caracteres.</span>
      </div>

      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "A criar…" : "Criar conta e página"}
      </button>
    </form>
  );
}
