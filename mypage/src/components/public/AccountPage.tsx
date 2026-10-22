"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { system, type Lang } from "@/lib/public-content";
import { SystemShell } from "./SystemPage";
import { useLanguage } from "./shared";

/**
 * Login and signup in the handoff's account-card design (login.html,
 * signup.html), on the app's real accounts.
 *
 * The handoff's screens were previews for Muska single sign-on and said so
 * ("Uma conta Muska…", provider buttons, "não foram enviados dados"). Until
 * that integration exists the app keeps its own email + password accounts, so
 * these forms post to /api/auth/login and /api/auth/register exactly as the
 * previous forms did, and the copy that promised a Muska account is replaced
 * below. The provider buttons and the password recovery link are left out:
 * neither has a flow behind it yet.
 *
 * POST /api/auth/login answers with the same message for an unknown email and
 * a wrong password, so the form shows whatever the server says and never adds
 * a hint of its own.
 */

const extra = {
  pt: {
    loginIntro: "Usa o email da tua conta My Page.",
    signupIntro: "Leva menos de um minuto. Podes mudar tudo depois.",
    artistName: "Nome artístico",
    artistHint: "É este o nome que aparece na página pública.",
    slug: "Endereço da página",
    slugHint: "Podes mudar mais tarde. Se já estiver ocupado, juntamos um número.",
    emailHint: "Fica privado: serve para entrar e receber avisos.",
    noAccount: "Ainda não tens conta?",
    hasAccount: "Já tens conta?",
    signingIn: "A entrar…",
    creating: "A criar…",
    loginFailed: "Não foi possível entrar.",
    signupFailed: "Não foi possível criar a conta.",
    offline: "Sem ligação ao servidor. Tenta novamente.",
  },
  en: {
    loginIntro: "Use the email of your My Page account.",
    signupIntro: "It takes less than a minute. You can change everything later.",
    artistName: "Artist name",
    artistHint: "This is the name shown on your public page.",
    slug: "Page address",
    slugHint: "You can change it later. If it is taken, we add a number.",
    emailHint: "Kept private: used to log in and receive notices.",
    noAccount: "Don’t have an account yet?",
    hasAccount: "Already have an account?",
    signingIn: "Logging in…",
    creating: "Creating…",
    loginFailed: "Could not log in.",
    signupFailed: "Could not create the account.",
    offline: "No connection to the server. Try again.",
  },
  fr: {
    loginIntro: "Utilise l’email de ton compte My Page.",
    signupIntro: "Moins d’une minute. Tu pourras tout modifier ensuite.",
    artistName: "Nom d’artiste",
    artistHint: "C’est le nom affiché sur ta page publique.",
    slug: "Adresse de la page",
    slugHint: "Tu pourras la changer. Si elle est prise, nous ajoutons un numéro.",
    emailHint: "Reste privé : sert à te connecter et à recevoir les avis.",
    noAccount: "Pas encore de compte ?",
    hasAccount: "Tu as déjà un compte ?",
    signingIn: "Connexion…",
    creating: "Création…",
    loginFailed: "Connexion impossible.",
    signupFailed: "Impossible de créer le compte.",
    offline: "Pas de connexion au serveur. Réessaie.",
  },
} satisfies Record<Lang, Record<string, string>>;

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

function PasswordField({
  id,
  label,
  lang,
  autoComplete,
  hint,
  onInput,
  inputRef,
}: {
  id: string;
  label: string;
  lang: Lang;
  autoComplete: string;
  hint?: string;
  onInput?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const t = system[lang];
  const [visible, setVisible] = useState(false);
  const toggle = visible ? t.hide : t.show;
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-input has-toggle">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          placeholder={label}
          autoComplete={autoComplete}
          spellCheck={false}
          minLength={autoComplete === "new-password" ? 8 : undefined}
          onInput={onInput}
          required
        />
        <button
          type="button"
          className="password-toggle"
          aria-pressed={visible}
          aria-label={`${toggle} · ${label}`}
          onClick={() => setVisible((value) => !value)}
        >
          {toggle}
        </button>
      </div>
      {hint && <p className="account-hint">{hint}</p>}
    </div>
  );
}

function Status({ error }: { error: string | null }) {
  return (
    <p className={`account-status${error ? " is-error" : ""}`} role="alert">
      {error ?? ""}
    </p>
  );
}

function LoginForm({ lang, next }: { lang: Lang; next: string }) {
  const router = useRouter();
  const t = system[lang];
  const x = extra[lang];
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
        setError(payload?.error?.message ?? x.loginFailed);
        return;
      }
      // The session cookie is set by the route; refresh so server components
      // pick it up before navigating.
      router.replace(next);
      router.refresh();
    } catch {
      setError(x.offline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="account-field">
        <label htmlFor="email">{t.email}</label>
        <div className="account-input">
          <input id="email" name="email" type="email" placeholder={t.email} autoComplete="email" required autoFocus />
        </div>
      </div>
      <PasswordField id="password" label={t.password} lang={lang} autoComplete="current-password" />
      <div className="account-bottom">
        <span />
        <button className="system-primary" type="submit" disabled={busy}>
          {busy ? x.signingIn : `${t.login} →`}
        </button>
      </div>
      <Status error={error} />
    </form>
  );
}

function RegisterForm({ lang, domain, templateId }: { lang: Lang; domain: string; templateId?: string }) {
  const router = useRouter();
  const t = system[lang];
  const x = extra[lang];
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState<HTMLInputElement | null>(null);
  const [second, setSecond] = useState<HTMLInputElement | null>(null);

  const effectiveSlug = slugTouched ? previewSlug(slug) : previewSlug(displayName);

  function checkMatch() {
    if (first && second) second.setCustomValidity(first.value === second.value ? "" : t.mismatch);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          password: form.get("password"),
          slug: effectiveSlug || undefined,
          // The catalogue's choice, carried through /signup?template=NN. The
          // server re-checks it against the free plan before applying it.
          templateId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? x.signupFailed);
        return;
      }
      router.replace("/studio");
      router.refresh();
    } catch {
      setError(x.offline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="account-field">
        <label htmlFor="displayName">{x.artistName}</label>
        <div className="account-input">
          <input
            id="displayName"
            name="displayName"
            placeholder={x.artistName}
            maxLength={80}
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            autoFocus
          />
        </div>
        <p className="account-hint">{x.artistHint}</p>
      </div>

      <div className="account-field">
        <label htmlFor="slug">{x.slug}</label>
        <div className="account-slug">
          <span>{domain}/p/</span>
          <input
            id="slug"
            name="slug"
            maxLength={48}
            spellCheck={false}
            placeholder="o-teu-nome"
            value={slugTouched ? slug : effectiveSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
          />
        </div>
        <p className="account-hint">{x.slugHint}</p>
      </div>

      <div className="account-field">
        <label htmlFor="email">{t.email}</label>
        <div className="account-input">
          <input id="email" name="email" type="email" placeholder={t.email} autoComplete="email" required />
        </div>
        <p className="account-hint">{x.emailHint}</p>
      </div>

      <PasswordField
        id="password"
        label={t.password}
        lang={lang}
        autoComplete="new-password"
        hint={t.passwordHint}
        onInput={checkMatch}
        inputRef={setFirst}
      />
      <PasswordField
        id="passwordAgain"
        label={t.again}
        lang={lang}
        autoComplete="new-password"
        onInput={checkMatch}
        inputRef={setSecond}
      />

      <label className="terms-check">
        <input type="checkbox" required />
        <span>
          {t.accept} <Link href="/terms">{t.terms}</Link> {t.and} <Link href="/privacy">{t.privacy}</Link>
        </span>
      </label>

      <div className="account-bottom">
        <span />
        <button className="system-primary" type="submit" disabled={busy}>
          {busy ? x.creating : `${t.signup} →`}
        </button>
      </div>
      <Status error={error} />
    </form>
  );
}

export function AccountPage({
  mode,
  next = "/studio",
  domain = "",
  templateId,
  notice,
}: {
  mode: "login" | "signup";
  next?: string;
  domain?: string;
  templateId?: string;
  /** Server-side notices (signed-in without an artist, chosen template). */
  notice?: React.ReactNode;
}) {
  const [lang, setLang] = useLanguage();
  const t = system[lang];
  const x = extra[lang];
  const isLogin = mode === "login";

  return (
    <SystemShell lang={lang} setLang={setLang} title={isLogin ? t.login : t.signup}>
      <section className="account-card">
        <h1>{isLogin ? t.login : t.signup}</h1>
        <p className="account-intro">{isLogin ? x.loginIntro : x.signupIntro}</p>
        {notice}
        {isLogin ? (
          <LoginForm lang={lang} next={next} />
        ) : (
          <RegisterForm lang={lang} domain={domain} templateId={templateId} />
        )}
        <p className="account-switch">
          {isLogin ? x.noAccount : x.hasAccount}{" "}
          <Link href={isLogin ? "/signup" : "/login"}>{isLogin ? t.signup : t.login}</Link>
        </p>
      </section>
    </SystemShell>
  );
}
