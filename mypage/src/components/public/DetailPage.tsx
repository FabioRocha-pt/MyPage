"use client";

import Link from "next/link";
import { useEffect } from "react";
import { audiences, pitches, sectorPitches, services, ui } from "@/lib/public-content";
import {
  LanguageSelect,
  ServiceIcon,
  UtilityLinks,
  Wordmark,
  useLanguage,
} from "./shared";
import { SECTOR_KEYS, SERVICE_KEYS, sectorHref, serviceHref } from "@/lib/public-routes";

/**
 * Service and sector pages, a port of the handoff's servico-*.html and
 * setor-*.html (all rendered by assets/mypage-detail.js).
 *
 * Changes for the app: "Quero pedir uma ferramenta" opens the contact form,
 * which files a real tool request, and each package button goes to /signup
 * (the handoff routed both through the landing's prototype account dialog).
 * The package prices are the plans the app sells (seed-tiers: Free 0 €,
 * Pro 25 €, Premium 50 € a month).
 */

const PACKAGES = [
  ["Free", "0", "free"],
  ["Pro", "25", "pro"],
  ["Premium", "50", "premium"],
] as const;

export function DetailPage({ kind, index }: { kind: "service" | "sector"; index: number }) {
  const [lang, setLang] = useLanguage();
  const t = ui[lang];
  const isService = kind === "service";
  const service = isService ? services[index] : null;
  const [title, summary, features] = isService ? services[index][lang] : audiences[lang][index];
  const key = isService ? SERVICE_KEYS[index] : SECTOR_KEYS[index];

  useEffect(() => {
    document.title = `${title} · My Page`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", summary);
  }, [title, summary]);

  const related = isService
    ? SECTOR_KEYS.map((slug, i) => ({ href: sectorHref(slug), text: audiences[lang][i][0] }))
    : SERVICE_KEYS.map((slug, i) => ({ href: serviceHref(slug), text: services[i][lang][0] }));

  return (
    <div className="pub">
      <div className="ambient" aria-hidden="true">
        <i />
        <i />
      </div>
      <header className="detail-header glass">
        <Link href="/" className="wordmark" aria-label="My Page">
          <Wordmark width={132} height={36} />
        </Link>
        <div>
          <Link className="detail-back" href="/">
            ← {t.home}
          </Link>
          <LanguageSelect lang={lang} onChange={setLang} label={t.language} />
        </div>
      </header>

      <main className="wrap detail-main">
        <section className="detail-hero">
          {isService && <ServiceIcon name={key} />}
          {service?.future && <span className="status">{t.future}</span>}
          <div className="title-lockup">
            <span className="kicker">{isService ? t.service : t.sector}</span>
            <h1>{title}</h1>
          </div>
          <p>{summary}</p>
          <a className="button primary" href="#packages">
            {t.start} ↘
          </a>
        </section>

        <section className="detail-layout">
          <div className="detail-copy">
            <h2>{t.why}</h2>
            <p>{isService ? pitches[lang][index] : sectorPitches[lang][index]}</p>
            <p>{t.focus}</p>
            <p>{t.markets}</p>
            {service?.future && <p className="detail-status">{t.futureBody}</p>}
          </div>
          <aside className="benefits glass">
            <h3>{t.included}</h3>
            <ul>
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <h3>{t.related}</h3>
            <div className="detail-links">
              {related.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.text}
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="request-tool glass">
          <h2>{t.requestTitle}</h2>
          <p>{t.requestBody}</p>
          <Link className="button" href="/contact?request=tool">
            {t.request} ↗
          </Link>
        </section>

        <section className="packages" id="packages">
          <h2>{t.packages}</h2>
          <p>{t.packagesBody}</p>
          <div className="package-grid">
            {PACKAGES.map(([name, price, list], i) => (
              <article key={name} className={`package glass${i === 1 ? " featured" : ""}`}>
                <h3>{name}</h3>
                <div className="package-price">
                  €{price} <small>{t.month}</small>
                </div>
                <ul>
                  {t[list].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link className={`button${i === 1 ? " primary" : ""}`} href="/signup">
                  {t.choose} {name} ↗
                </Link>
              </article>
            ))}
          </div>
          <p className="package-notice">{t.notice}</p>
        </section>
      </main>

      <footer className="wrap detail-footer">
        <span>© {new Date().getFullYear()} My Page · Muska</span>
        <span>{t.footer}</span>
      </footer>
      <UtilityLinks lang={lang} />
    </div>
  );
}
