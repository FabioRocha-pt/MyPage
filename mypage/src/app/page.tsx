import type { Metadata } from "next";
import Link from "next/link";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { ToolDeck } from "@/components/landing/ToolDeck";
import { ToolRequestForm } from "@/components/landing/ToolRequestForm";
import { TemplateCatalog } from "@/components/TemplateCatalog";
import { ThemeToggle } from "@/components/ThemeToggle";
import "@/styles/landing.css";
import "@/styles/catalog.css";

/**
 * Landing page — a port of prototipo/index.html.
 *
 * Copy, section order and ids are the prototype's, in the English the handoff
 * uses on this screen. Three things change, each because the handoff asks for
 * it rather than because Next needed it:
 *
 *   - Doc 01: "Toolkit: baralho sem caixa de fundo (…). Remover o antigo texto
 *     lateral 'AS YOUR TOOLKIT' e a iluminação do cursor por baixo das cartas."
 *     See ToolDeck / landing.css.
 *   - Doc 01: "Catálogo de templates público e backoffice devem partilhar as
 *     mesmas miniaturas e identificadores." The prototype did this at runtime
 *     with assets/front-template-catalog.js, which replaced the photo gallery
 *     with the live catalogue; here the catalogue is rendered directly.
 *   - Doc 01 / doc 04: plan names, benefits and ECV figures are "material a
 *     validar". The lists below are the handoff's, kept verbatim, with the note
 *     under them saying the commercial terms are not approved.
 */

export const metadata: Metadata = {
  title: "My Page · Your stage. Your page.",
  description:
    "Build a high-impact mobile page with motion, music, events, booking and the tools your audience actually uses.",
  alternates: { canonical: "/" },
};

const TICKER = ["DJs", "Artists", "Clubs", "Events", "Venues", "Booking", "Tickets", "Mobile First"];

const GROWTH = [
  { step: "01", title: "Create your page", text: "Launch a mobile-first home for your identity, story and work." },
  {
    step: "02",
    title: "Choose your tools",
    text: "Activate only the modules your career or business actually needs.",
  },
  { step: "03", title: "Monetize", text: "Turn visits into bookings, tickets, reservations, services and sales." },
  {
    step: "04",
    title: "Grow your career",
    text: "Understand your audience, improve decisions and create momentum.",
  },
  {
    step: "05",
    title: "Find partnerships",
    text: "Connect artists, venues, promoters, brands and new opportunities.",
  },
  {
    step: "06",
    title: "Build what’s missing",
    text: "Together, we can create any custom tool your next stage requires.",
    accent: true,
  },
];

const AUDIENCES = [
  {
    tag: "01 / TALENT",
    title: "For DJs & MCs",
    text: "Show your sound, publish sets and events, receive bookings, build an EPK and understand your audience.",
    tags: ["Sets", "Events", "Booking", "EPK", "Analytics"],
  },
  {
    tag: "02 / ARTISTS",
    title: "For singers & artists",
    text: "A flexible home for singers, musicians, bands, producers, instrumentalists and performers to share and sell their work.",
    tags: ["Music", "Releases", "Shows", "Media", "Partnerships"],
  },
  {
    tag: "03 / VENUES",
    title: "For clubs & venues",
    text: "Manage events, tickets, reservations, VIP tables, menus and any custom service from one backoffice.",
    tags: ["Tickets", "Reservations", "VIP", "Services", "Customers"],
  },
];

/**
 * The plan cards exactly as the handoff presents them.
 * Doc 01: "Preços pedidos: Free limitado, €25/mês e €50/mês. Nomes Pro/Premium e
 * listas de benefícios presentes nas telas são material a validar."
 */
const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: "LIMITED",
    amount: "€0",
    period: "/ month",
    cve: "0 ECV",
    popular: false,
    cta: "Start free",
    features: [
      "Professional DJ page",
      "Core template",
      "Music & social links",
      "Upcoming events",
      "Basic booking",
      "My Page branding + ads",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "MOST POPULAR",
    amount: "€25",
    period: "/ month",
    cve: "2.500 ECV / month",
    popular: true,
    cta: "Go Pro ↗",
    features: [
      "No advertising",
      "Pro templates",
      "More media & events",
      "Advanced booking",
      "EPK & professional tools",
      "Analytics integrations",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    badge: null,
    amount: "€50",
    period: "/ month",
    cve: "4.500 ECV / month",
    popular: false,
    cta: "Choose Premium",
    features: [
      "Fully customized design",
      "Custom domain",
      "No My Page branding",
      "Unlimited sections",
      "Advanced integrations",
      "Priority support",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="lp" id="top">
      <LandingMotion />
      <span className="lp-noise" aria-hidden="true" />
      <div className="lp-ambient" aria-hidden="true">
        <span className="orange" />
        <span className="blue" />
        <span className="purple" />
      </div>

      <nav className="lp-nav">
        <a className="lp-brand" href="#top">
          <span className="lp-mark" aria-hidden="true">
            Y
          </span>
          <span>My Page</span>
          <small className="lp-brand-meta">Powered by Muska</small>
        </a>
        <div className="lp-navlinks">
          <Link className="keep" href="/artists">
            Artistas
          </Link>
          <a href="#templates">Templates</a>
          <a href="#tools">Tools</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="lp-actions">
          {/* The prototype linked to backoffice.html; the real backoffice is
              behind a session, so /studio sends a visitor to sign in first. */}
          <Link className="lp-btn demo" href="/studio">
            Backoffice ↗
          </Link>
          <ThemeToggle className="lp-iconbtn" />
          <Link className="lp-btn primary keep" href="/signup">
            Start free ↗
          </Link>
        </div>
      </nav>

      <main>
        <section className="lp-hero">
          <div className="lp-glow g1" data-parallax=".06" aria-hidden="true" />
          <div className="lp-glow g2" data-parallax="-.035" aria-hidden="true" />
          <div className="lp-shell lp-hero-grid">
            <div>
              <div className="lp-eyebrow">Website builder for the culture</div>
              <h1>
                Your stage.
                <br />
                <span className="lp-gradient">Your page.</span>
              </h1>
              <p className="lp-lead">
                Build a high-impact mobile page with motion, music, events, booking and the tools your audience
                actually uses.
              </p>
              <div className="lp-hero-ctas">
                <Link className="lp-btn primary" href="/signup">
                  Create your page ↗
                </Link>
                <a className="lp-btn" href="#templates">
                  See the potential ↓
                </a>
              </div>
              <div className="lp-micro">Start with DJs · Next: clubs, venues, tickets &amp; reservations</div>
            </div>

            <div className="lp-showcase" id="lp-showcase">
              <div className="lp-panel main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-main.webp" alt="Dynamic mobile-first template reference" />
                <div className="lp-overlay">
                  <span>YOURPAGE / TEMPLATE</span>
                  <b>Motion first.</b>
                </div>
              </div>
              <div className="lp-panel small1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-a.webp" alt="Immersive template reference" />
              </div>
              <div className="lp-panel small2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-b.webp" alt="Artist page reference" />
              </div>
              <div className="lp-floating f1">
                <b>Mobile</b>
                <span>built for the first screen</span>
              </div>
              <div className="lp-floating f2">
                <b>Motion</b>
                <span>parallax + interactions</span>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-marquee-space" aria-label="My Page ecosystem">
          <div className="lp-marquee-band">
            <div className="lp-marquee">
              <div className="lp-track">
                {[0, 1, 2, 3].map((group) => (
                  <div className="lp-ticker-group" key={group} aria-hidden={group > 0 || undefined}>
                    {TICKER.map((word) => (
                      <span key={word}>{word}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section id="templates">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Visual direction</div>
                <h2>Templates that already feel custom.</h2>
              </div>
              <p>
                We start with a strong library of visually distinct templates. Users change content, media and accent
                while the design quality stays controlled.
              </p>
            </div>
            {/* Same catalogue the editor uses — shared ids and thumbnails. */}
            <TemplateCatalog mode="signup" lang="en" />
          </div>
        </section>

        <section id="tools">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">The first toolkit</div>
                <h2>Simple enough to launch. Useful enough to sell.</h2>
              </div>
              <p>
                The first version focuses on the things DJs need every week. More modules can be activated as the
                builder grows.
              </p>
            </div>
            <ToolDeck />
          </div>
        </section>

        <section className="lp-custom-toolkit" id="custom-toolkit">
          <div className="lp-shell">
            <div className="lp-custom-card lp-reveal">
              <div className="lp-custom-copy">
                <div className="lp-eyebrow">Built around what you need</div>
                <h2>Can’t find the toolkit you’re looking for?</h2>
                <p>
                  Describe what you need. Our team will get in touch, understand your workflow and bring the right
                  solution to your page.
                </p>
              </div>
              <div className="lp-custom-action">
                <small>Share your idea, references and contact details. You can attach PDF files or images from inside your account.</small>
                <ToolRequestForm />
              </div>
            </div>
          </div>
        </section>

        <section id="product-path">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Your growth path</div>
                <h2>Build your presence. Grow your career.</h2>
              </div>
              <p>My Page starts as your digital home and grows with your work, your audience and your ambitions.</p>
            </div>
            <div className="lp-growth">
              {GROWTH.map((item) => (
                <article className={`lp-growth-step lp-reveal ${item.accent ? "accent" : ""}`} key={item.step}>
                  <small>{item.step}</small>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="for-who">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Who My Page is for</div>
                <h2>One backoffice. Three ways to grow.</h2>
              </div>
              <p>Every profile gets a central workspace to manage content, opportunities, audience and business.</p>
            </div>
            <div className="lp-audience-grid">
              {AUDIENCES.map((audience) => (
                <article className="lp-audience-card lp-reveal" key={audience.tag}>
                  <span>{audience.tag}</span>
                  <h3>{audience.title}</h3>
                  <p>{audience.text}</p>
                  <div className="lp-audience-tags">
                    {audience.tags.map((tag) => (
                      <b key={tag}>{tag}</b>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Pricing</div>
                <h2>Start free. Grow into the tools you need.</h2>
              </div>
              <p>
                A free page must already look good. Upgrades unlock control, professional tools and customization.
              </p>
            </div>
            <div className="lp-pricing">
              {PLANS.map((plan) => (
                <article className={`lp-price lp-reveal ${plan.popular ? "pop" : ""}`} key={plan.id}>
                  {plan.badge && <div className="lp-popular">{plan.badge}</div>}
                  <h3>{plan.name}</h3>
                  <div className="lp-amount">
                    {plan.amount} <small>{plan.period}</small>
                  </div>
                  <div className="lp-cve">{plan.cve}</div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link className={`lp-btn ${plan.popular ? "primary" : ""}`} href="/signup">
                    {plan.cta}
                  </Link>
                </article>
              ))}
              {/* Doc 01: "Não os tratar como preços ou conversões aprovados." */}
              <p className="lp-price-note">
                Plan names, benefit lists and the ECV figures shown here still need to be confirmed with the owner.
                Exact limits, per-tool access, storage, commissions and downgrade rules have not been approved.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="lp-shell">
            <div className="lp-cta-card lp-reveal">
              <div className="lp-eyebrow" style={{ color: "#ddd" }}>
                Your page is your stage
              </div>
              <h2>
                Look custom.
                <br />
                <span style={{ color: "#ff9d47" }}>Move better.</span>
              </h2>
              <div className="lp-cta-row">
                <p>
                  Start with a beautiful DJ page today. Use the same platform tomorrow for your venue, event,
                  reservations and ticket sales.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="lp-btn primary" href="/signup">
                    Create your page ↗
                  </Link>
                  <Link className="lp-btn" style={{ color: "white", borderColor: "rgba(255,255,255,.2)" }} href="/studio">
                    Open the backoffice
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="lp-shell lp-footer-row">
          <div className="lp-brand">
            <span className="lp-mark" aria-hidden="true">
              Y
            </span>
            <span>My Page</span>
          </div>
          <div>© {new Date().getFullYear()} My Page · Powered by Muska · Built mobile first.</div>
        </div>
      </footer>
    </div>
  );
}
