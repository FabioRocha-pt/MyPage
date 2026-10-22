"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { helpFaq, system, type Lang } from "@/lib/public-content";
import { LanguageSelect, Wordmark, useLanguage } from "./shared";

/**
 * Account, information and error screens, a port of the handoff's system
 * pages (all rendered by assets/mypage-system.js).
 *
 * The handoff marked these as previews waiting for the Muska account service:
 * its forms showed "não foram enviados dados". In the app, login and signup
 * use the real forms (AccountPage), and the contact form files a request with
 * POST /api/tool-requests, which the team works through in /admin. The
 * recovery, verification and maintenance screens were state previews for
 * flows the app does not have yet, so they are not ported.
 */

export type SystemType = "help" | "contact" | "terms" | "privacy" | "404" | "500";

/** Strings the app needs beyond the handoff's. */
const extra = {
  pt: { sending: "A enviar…", offline: "Sem ligação ao servidor. Tenta novamente.", failed: "Não foi possível enviar." },
  en: { sending: "Sending…", offline: "No connection to the server. Try again.", failed: "Could not send." },
  fr: { sending: "Envoi…", offline: "Pas de connexion au serveur. Réessaie.", failed: "Envoi impossible." },
} satisfies Record<Lang, Record<string, string>>;

export function SystemShell({
  lang,
  setLang,
  title,
  children,
}: {
  lang: Lang;
  setLang: (next: Lang) => void;
  title: string;
  children: React.ReactNode;
}) {
  const t = system[lang];

  useEffect(() => {
    document.title = `${title} · My Page`;
  }, [title]);

  return (
    <div className="pub system-page">
      <header className="system-header">
        <Link className="wordmark" href="/" aria-label="My Page">
          <Wordmark width={135} height={36} />
        </Link>
        <div>
          <Link href="/">{t.home}</Link>
          <LanguageSelect lang={lang} onChange={setLang} label={t.language} />
        </div>
      </header>
      <main className="system-main">{children}</main>
      <footer className="system-footer">
        <Link href="/help">{t.help}</Link>
        <Link href="/contact">{t.contact}</Link>
        <Link href="/terms">{t.terms}</Link>
        <Link href="/privacy">{t.privacy}</Link>
      </footer>
    </div>
  );
}

function ContactForm({ lang, toolRequest }: { lang: Lang; toolRequest: boolean }) {
  const t = system[lang];
  const x = extra[lang];
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "" | "is-ok" | "is-error" }>({ text: "", tone: "" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    setBusy(true);
    setStatus({ text: x.sending, tone: "" });
    try {
      const response = await fetch("/api/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("subject"),
          description: `${String(data.get("message") ?? "")}\n\n— ${name}`,
          contactEmail: data.get("email"),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus({ text: payload?.error?.message ?? x.failed, tone: "is-error" });
        return;
      }
      form.reset();
      setStatus({ text: payload?.data?.message ?? payload?.message ?? "OK", tone: "is-ok" });
    } catch {
      setStatus({ text: x.offline, tone: "is-error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="auth-form" onSubmit={submit}>
        <div className="account-field">
          <label htmlFor="contactName">{t.name}</label>
          <div className="account-input">
            <input id="contactName" name="name" placeholder={t.name} autoComplete="name" maxLength={120} required />
          </div>
        </div>
        <div className="account-field">
          <label htmlFor="contactEmail">{t.email}</label>
          <div className="account-input">
            <input
              id="contactEmail"
              name="email"
              type="email"
              placeholder={t.email}
              autoComplete="email"
              maxLength={200}
              required
            />
          </div>
        </div>
        <div className="account-field">
          <label htmlFor="contactSubject">{t.subject}</label>
          <div className="account-input">
            <input
              id="contactSubject"
              name="subject"
              placeholder={t.subject}
              defaultValue={toolRequest ? t.tool : undefined}
              maxLength={160}
              required
            />
          </div>
        </div>
        <div className="account-field">
          <label htmlFor="contactMessage">{t.message}</label>
          <textarea id="contactMessage" name="message" maxLength={3800} required />
        </div>
        <button className="system-primary" type="submit" disabled={busy}>
          {busy ? x.sending : `${t.sendMessage} →`}
        </button>
      </form>
      <p className={`account-status ${status.tone}`} role="status">
        {status.text}
      </p>
    </>
  );
}

export function SystemPage({
  type,
  toolRequest = false,
  onRetry,
}: {
  type: SystemType;
  toolRequest?: boolean;
  onRetry?: () => void;
}) {
  const [lang, setLang] = useLanguage();
  const t = system[lang];
  const titles: Record<SystemType, string> = {
    help: t.helpTitle,
    contact: t.contactTitle,
    terms: t.terms,
    privacy: t.privacy,
    "404": t.error404,
    "500": t.error500,
  };
  const title = titles[type];

  if (type === "404" || type === "500") {
    return (
      <SystemShell lang={lang} setLang={setLang} title={title}>
        <section className="error-page">
          <h1>{title}</h1>
          <p>{type === "404" ? t.body404 : t.body500}</p>
          <Link className="system-primary" href="/">
            {t.home}
          </Link>
          {type === "500" && (
            <button type="button" className="button" onClick={onRetry ?? (() => location.reload())}>
              {t.retry}
            </button>
          )}
          <div className="error-number">{type}</div>
          <p className="error-tag">{t.rhythm}</p>
        </section>
      </SystemShell>
    );
  }

  return (
    <SystemShell lang={lang} setLang={setLang} title={title}>
      <section className="info-page">
        <h1>{title}</h1>

        {(type === "terms" || type === "privacy") && (
          <>
            <div className="legal-draft">
              <strong>{t.draft}</strong>
              <p>{t.legalBody}</p>
            </div>
            <ul>
              {(type === "terms" ? t.legalTerms : t.legalPrivacy).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{t.legalNote}</p>
            <Link className="system-primary" href="/">
              {t.home}
            </Link>
          </>
        )}

        {type === "help" && (
          <>
            {helpFaq[lang].map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
            <p>
              <Link href="/contact">{t.contact}</Link>
            </p>
          </>
        )}

        {type === "contact" && (
          <>
            <p>{t.contactBody}</p>
            <ContactForm lang={lang} toolRequest={toolRequest} />
          </>
        )}
      </section>
    </SystemShell>
  );
}
