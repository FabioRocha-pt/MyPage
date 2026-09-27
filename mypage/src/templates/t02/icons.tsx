/**
 * The handoff's icon sprite, verbatim. Platforms without a drawn icon fall back
 * to the generic link glyph, as `derivar()` did with `'#i-' + plataforma`.
 */

const DRAWN = new Set(["instagram", "facebook", "youtube", "spotify", "apple"]);

export function iconFor(platform: string): string {
  return `#t02-i-${DRAWN.has(platform) ? platform : "link"}`;
}

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="t02-i-instagram" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" />
        </symbol>
        <symbol id="t02-i-facebook" viewBox="0 0 24 24">
          <path
            d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21h3z"
            fill="currentColor"
          />
        </symbol>
        <symbol id="t02-i-youtube" viewBox="0 0 24 24">
          <rect x="2.4" y="5.2" width="19.2" height="13.6" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor" />
        </symbol>
        <symbol id="t02-i-spotify" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.2 9.5c3.3-1 7-.7 9.7.9M7.8 12.5c2.7-.8 5.6-.5 7.9.9M8.4 15.3c2.1-.6 4.3-.4 6 .7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="t02-i-apple" viewBox="0 0 24 24">
          <path d="M9.3 17.8V6.9l9.4-2.2v10.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="7.1" cy="17.8" r="2.3" fill="currentColor" />
          <circle cx="16.5" cy="15.6" r="2.3" fill="currentColor" />
        </symbol>
        <symbol id="t02-i-link" viewBox="0 0 24 24">
          <path
            d="M10 14l4-4M8.5 11.5l-2 2a3 3 0 004.2 4.2l2-2M15.5 12.5l2-2a3 3 0 00-4.2-4.2l-2 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}
