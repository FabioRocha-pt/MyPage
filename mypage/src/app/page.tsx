import type { Metadata } from "next";
import Link from "next/link";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { ToolDeck } from "@/components/landing/ToolDeck";
import { ToolRequestForm } from "@/components/landing/ToolRequestForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PLAN_SEED, getEntitlement, type Entitlement } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { TEMPLATES } from "@/templates/registry";
import "@/styles/landing.css";

/**
 * Landing page.
 *
 * Ported from prototipo/index.html, with three corrections the handoff asks for:
 *   - Doc 01: the toolkit deck loses its background box, the "AS YOUR TOOLKIT"
 *     side label and the cursor light (see ToolDeck / landing.css).
 *   - Doc 04: "Campos ECV/benefícios de planos presentes nas telas carecem de
 *     validação comercial" — the plan cards are built from the entitlements the
 *     server actually enforces, and the note under them says the commercial
 *     terms are still open. Nothing here invents a benefit.
 *   - Doc 01: the template names come from the shared registry, so the landing,
 *     the catalogue and the editor cannot drift apart.
 */

export const metadata: Metadata = {
  title: "My Page · A tua página. O teu palco.",
  alternates: { canonical: "/" },
};

const TICKER = ["DJs", "Artistas", "Clubes", "Eventos", "Espaços", "Booking", "Bilhetes", "Mobile First"];

/** Reference imagery for the gallery; real template thumbnails live in the catalogue. */
const GALLERY_IMAGES = [
  "/landing/showcase-main.webp",
  "/landing/gallery-experimental.webp",
  "/landing/gallery-editorial.webp",
  "/landing/showcase-a.webp",
  "/landing/showcase-b.webp",
];

const GROWTH = [
  {
    step: "01",
    title: "Cria a tua página",
    text: "Lança uma casa digital mobile-first para a tua identidade, história e trabalho.",
  },
  {
    step: "02",
    title: "Escolhe as ferramentas",
    text: "Ativa apenas os módulos de que a tua carreira ou negócio precisa mesmo.",
  },
  {
    step: "03",
    title: "Monetiza",
    text: "Transforma visitas em bookings, bilhetes, reservas, serviços e vendas.",
  },
  {
    step: "04",
    title: "Cresce a carreira",
    text: "Percebe a tua audiência, decide melhor e cria momentum.",
  },
  {
    step: "05",
    title: "Encontra parcerias",
    text: "Liga artistas, espaços, promotores, marcas e novas oportunidades.",
  },
  {
    step: "06",
    title: "Constrói o que falta",
    text: "Em conjunto, criamos a ferramenta que a tua próxima etapa exigir.",
    accent: true,
  },
];

const AUDIENCES = [
  {
    tag: "01 / TALENTO",
    title: "Para DJs e MCs",
    text: "Mostra o teu som, publica sets e eventos, recebe bookings, monta o EPK e percebe a tua audiência.",
    tags: ["Sets", "Eventos", "Booking", "EPK", "Insights"],
  },
  {
    tag: "02 / ARTISTAS",
    title: "Para cantores e artistas",
    text: "Uma casa flexível para cantores, músicos, bandas, produtores e performers partilharem e venderem o seu trabalho.",
    tags: ["Música", "Lançamentos", "Shows", "Media", "Parcerias"],
  },
  {
    tag: "03 / ESPAÇOS",
    title: "Para clubes e espaços",
    text: "Gere eventos, bilhetes, reservas, mesas VIP, cartas e serviços personalizados a partir de um só backoffice.",
    tags: ["Bilhetes", "Reservas", "VIP", "Serviços", "Clientes"],
  },
];

const TOOL_LABELS: Record<string, string> = {
  basic: "Informações básicas",
  visual: "Imagens e cores",
  press: "Press kit",
  music: "Música e sets",
  video: "Vídeos",
  events: "Eventos",
  booking: "Booking",
  donations: "Donativos",
  store: "Loja",
};

/**
 * The plan cards read the entitlements the server enforces. If the database has
 * not been seeded yet the page still renders, from the same seed constant the
 * seeder uses — the landing never becomes a second source of truth for limits.
 */
async function loadPlans(): Promise<Entitlement[]> {
  try {
    return await Promise.all(PLAN_SEED.map((plan) => getEntitlement(plan.plan)));
  } catch {
    return PLAN_SEED.map((plan) => ({
      ...plan,
      tools: [...plan.tools],
      allowedTemplates: [...plan.allowedTemplates],
    }));
  }
}

function planFeatures(entitlement: Entitlement): string[] {
  const storage =
    entitlement.maxStorageMb >= 1000
      ? `${Math.round(entitlement.maxStorageMb / 1000)} GB`
      : `${entitlement.maxStorageMb} MB`;

  return [
    `${entitlement.allowedTemplates.length} ${entitlement.allowedTemplates.length === 1 ? "template" : "templates"}`,
    `${entitlement.maxMediaItems} ficheiros · ${storage}`,
    `${entitlement.maxEvents} eventos`,
    entitlement.tools.map((tool) => TOOL_LABELS[tool] ?? tool).join(" · "),
    entitlement.removeBranding ? "Sem marca My Page na página" : "Marca My Page na página",
    entitlement.customDomain ? "Domínio próprio" : "Endereço my page",
  ];
}

export default async function LandingPage() {
  const plans = await loadPlans();

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
            M
          </span>
          <span>My Page</span>
          <small className="lp-brand-meta">Powered by Muska</small>
        </a>
        <div className="lp-navlinks">
          <a href="#templates">Templates</a>
          <a href="#ferramentas">Ferramentas</a>
          <a href="#planos">Planos</a>
        </div>
        <div className="lp-actions">
          <Link className="lp-btn demo" href="/login">
            Entrar
          </Link>
          <ThemeToggle className="lp-iconbtn" />
          <Link className="lp-btn primary keep" href="/signup">
            Criar página ↗
          </Link>
        </div>
      </nav>

      <main>
        <section className="lp-hero">
          <div className="lp-glow g1" data-parallax=".06" aria-hidden="true" />
          <div className="lp-glow g2" data-parallax="-.035" aria-hidden="true" />
          <div className="lp-shell lp-hero-grid">
            <div>
              <div className="lp-eyebrow">Construtor de páginas para a cultura</div>
              <h1>
                O teu palco.
                <br />
                <span className="lp-gradient">A tua página.</span>
              </h1>
              <p className="lp-lead">
                Monta uma página mobile-first com movimento, música, eventos, booking e as ferramentas que a tua
                audiência usa mesmo.
              </p>
              <div className="lp-hero-ctas">
                <Link className="lp-btn primary" href="/signup">
                  Criar a minha página ↗
                </Link>
                <a className="lp-btn" href="#templates">
                  Ver o que é possível ↓
                </a>
              </div>
              <div className="lp-micro">Começa nos DJs · A seguir: clubes, espaços, bilhetes e reservas</div>
            </div>

            <div className="lp-showcase" id="lp-showcase">
              <div className="lp-panel main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-main.webp" alt="Referência de template mobile-first" />
                <div className="lp-overlay">
                  <span>MY PAGE / TEMPLATE</span>
                  <b>Movimento primeiro.</b>
                </div>
              </div>
              <div className="lp-panel small1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-a.webp" alt="Referência de template imersivo" />
              </div>
              <div className="lp-panel small2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/showcase-b.webp" alt="Referência de página de artista" />
              </div>
              <div className="lp-floating f1">
                <b>Mobile</b>
                <span>feito para o primeiro ecrã</span>
              </div>
              <div className="lp-floating f2">
                <b>Movimento</b>
                <span>parallax + interação</span>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-marquee-space" aria-label="Ecossistema My Page">
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
                <div className="lp-eyebrow">Direção visual</div>
                <h2>Templates que já parecem feitos à medida.</h2>
              </div>
              <p>
                Cinco direções visualmente distintas. O artista muda conteúdo, media e cor; a qualidade do desenho
                mantém-se controlada.
              </p>
            </div>
            <div className="lp-gallery">
              {TEMPLATES.map((template, index) => (
                <article className={`lp-shot s${index + 1} lp-reveal`} key={template.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={GALLERY_IMAGES[index]} alt={`Referência visual do template ${template.name}`} />
                  <div className="lp-shot-info">
                    <div>
                      <span>{template.description.toUpperCase()}</span>
                      <strong>{template.name}</strong>
                    </div>
                    <em>{template.id}</em>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ferramentas">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">O primeiro toolkit</div>
                <h2>Simples para lançar. Útil para vender.</h2>
              </div>
              <p>
                A primeira versão foca o que um DJ precisa todas as semanas. Novos módulos entram à medida que a
                plataforma cresce.
              </p>
            </div>
            <ToolDeck />
          </div>
        </section>

        <section className="lp-custom-toolkit" id="ferramenta-medida">
          <div className="lp-shell">
            <div className="lp-custom-card lp-reveal">
              <div className="lp-custom-copy">
                <div className="lp-eyebrow">Construído à volta do que precisas</div>
                <h2>Não encontras a ferramenta que procuras?</h2>
                <p>
                  Descreve o que precisas. A equipa entra em contacto, percebe o teu fluxo de trabalho e traz a
                  solução certa para a tua página.
                </p>
              </div>
              <div className="lp-custom-action">
                <small>Partilha a ideia, as referências e o contacto. Respondemos depois de analisar o pedido.</small>
                <ToolRequestForm />
              </div>
            </div>
          </div>
        </section>

        <section id="percurso">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">O teu percurso</div>
                <h2>Constrói a tua presença. Cresce na tua carreira.</h2>
              </div>
              <p>
                O My Page começa como a tua casa digital e cresce com o teu trabalho, a tua audiência e a tua
                ambição.
              </p>
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

        <section id="para-quem">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Para quem é o My Page</div>
                <h2>Um backoffice. Três formas de crescer.</h2>
              </div>
              <p>Cada perfil tem um espaço central para gerir conteúdo, oportunidades, audiência e negócio.</p>
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

        <section id="planos">
          <div className="lp-shell">
            <div className="lp-section-head lp-reveal">
              <div>
                <div className="lp-eyebrow">Planos</div>
                <h2>Começa grátis. Cresce para as ferramentas que precisares.</h2>
              </div>
              <p>
                Uma página gratuita já tem de ficar bem. Os planos pagos desbloqueiam controlo e ferramentas
                profissionais.
              </p>
            </div>
            <div className="lp-pricing">
              {plans.map((plan) => (
                <article className={`lp-price lp-reveal ${plan.plan === "pro" ? "pop" : ""}`} key={plan.plan}>
                  {plan.plan === "pro" && <div className="lp-popular">MAIS ESCOLHIDO</div>}
                  {plan.plan === "free" && <div className="lp-popular">LIMITADO</div>}
                  <h3>{plan.label}</h3>
                  <div className="lp-amount">
                    {formatMoney(plan.priceMinor, plan.currency === "CVE" ? "CVE" : "EUR")} <small>/ mês</small>
                  </div>
                  <div className="lp-cve">Valor equivalente em ECV por confirmar</div>
                  <ul>
                    {planFeatures(plan).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link className={`lp-btn ${plan.plan === "pro" ? "primary" : ""}`} href="/signup">
                    {plan.plan === "free" ? "Começar grátis" : `Escolher ${plan.label}`}
                  </Link>
                </article>
              ))}
              <p className="lp-price-note">
                Limites e preços vêm das autorizações aplicadas no servidor e podem mudar: as condições comerciais
                finais, comissões e regras de downgrade ainda não foram fechadas com o proprietário.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="lp-shell">
            <div className="lp-cta-card lp-reveal">
              <div className="lp-eyebrow">A tua página é o teu palco</div>
              <h2>
                Parece feita à medida.
                <br />
                <span style={{ color: "#ff9d47" }}>Move-se melhor.</span>
              </h2>
              <div className="lp-cta-row">
                <p>
                  Começa hoje com uma página de DJ. Usa amanhã a mesma plataforma para o teu espaço, os teus eventos,
                  reservas e bilhetes.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="lp-btn primary" href="/signup">
                    Criar a minha página ↗
                  </Link>
                  <Link className="lp-btn" href="/login">
                    Entrar no backoffice
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
              M
            </span>
            <span>My Page</span>
          </div>
          <div>© {new Date().getFullYear()} My Page · Powered by Muska · Feito mobile first.</div>
        </div>
      </footer>
    </div>
  );
}
