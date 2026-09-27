import type { CSSProperties } from "react";
import type { PageSnapshot } from "@/lib/page-model";
import { SectionStack } from "./shared/sections";
import { HEROES } from "./heroes";
import { templateOrDefault } from "./registry";
import { Template02, type T02Links } from "./t02/Template02";

/**
 * The single entry point that turns a snapshot into a page.
 *
 * Used by:
 *   - /p/[slug]        the public page (published snapshot only)
 *   - /studio/preview  the authenticated draft preview
 *   - the template catalogue thumbnails
 *
 * All three render the same component from the same contract, which is what
 * makes doc 04's "preview fiel" achievable rather than aspirational.
 *
 * The palette arrives as inline custom properties rather than a generated
 * stylesheet: the values are per-artist, so they belong on the element, and
 * every colour has already been contrast-checked server-side.
 */

export function PageRenderer({
  snapshot,
  scale,
  page = "home",
  links,
}: {
  snapshot: PageSnapshot;
  /** Used by catalogue thumbnails to render a shrunken live preview. */
  scale?: number;
  /** Template 02 has a second page: booking request, rider and hospitality. */
  page?: "home" | "booking";
  /** Where the page and its booking page live in the current context. */
  links?: T02Links;
}) {
  const template = templateOrDefault(snapshot.templateId);

  // Template 02 · versão 1 has its own full renderer (hero and sections), from
  // the Deekay handoff. The other four still share Hero + SectionStack.
  if (template.id === "02") {
    return <Template02 snapshot={snapshot} page={page} links={links ?? { home: "#top", booking: null }} />;
  }
  const Hero = HEROES[template.id as keyof typeof HEROES] ?? HEROES["01"];

  const style = {
    "--p-bg": snapshot.appearance.background,
    "--p-text": snapshot.appearance.text,
    "--p-accent": snapshot.appearance.accent,
    "--p-accent-text": snapshot.appearance.accentText,
    "--p-accent-hover": snapshot.appearance.accentHover,
    "--p-surface": snapshot.appearance.surface,
    "--p-surface-raised": snapshot.appearance.surfaceRaised,
    "--p-line": snapshot.appearance.line,
    "--p-muted": snapshot.appearance.muted,
    "--p-overlay": snapshot.appearance.overlay,
    ...(scale ? { transform: `scale(${scale})`, transformOrigin: "top left" } : {}),
  } as CSSProperties;

  return (
    <div className={`tpl tpl-${template.id}`} style={style} data-template={template.id}>
      <Hero snapshot={snapshot} />
      <main>
        <SectionStack snapshot={snapshot} />
      </main>
      <footer className="tpl-footer">
        <div className="tpl-inner tpl-footer-row">
          <strong>{snapshot.profile.displayName}</strong>
          {snapshot.links.length > 0 && (
            <ul className="tpl-footer-links">
              {snapshot.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {/* Doc 01 / entitlements: the badge is removed on paid plans. */}
          {snapshot.branding.showMyPageBadge && (
            <a className="tpl-badge-link" href="/" target="_blank" rel="noopener">
              My Page · Powered by Muska
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
