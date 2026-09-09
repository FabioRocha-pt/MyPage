"use client";

import { useState } from "react";

/**
 * The toolkit deck.
 *
 * Copy is verbatim from prototipo/index.html, including the English wording the
 * landing uses throughout. Doc 01 fixes the behaviour:
 * "Toolkit: baralho sem caixa de fundo, glows/blur ambientais preservados.
 * Remover o antigo texto lateral 'AS YOUR TOOLKIT' e a iluminação do cursor
 * por baixo das cartas. Conteúdo legível; clique abre detalhes ao lado, segundo
 * clique/voltar repõe listagem. Mobile não depende de hover."
 *
 * Clicking the active card closes the detail again (the "segundo clique"
 * behaviour), and every card is a real <button> so keyboard and touch work
 * without any hover state.
 */

export interface Tool {
  number: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
}

export const TOOLS: Tool[] = [
  {
    number: "01",
    category: "BUILD",
    title: "Visual editor",
    description:
      "Edit identity, biography, colors, cover, sections and calls-to-action without touching code.",
    icon: "✦",
    tags: ["Live preview", "Theme controls", "Section manager"],
  },
  {
    number: "02",
    category: "PLAY",
    title: "Music & media",
    description: "Feature sets, Spotify, SoundCloud, Mixcloud, YouTube, galleries and videos.",
    icon: "▶",
    tags: ["Featured set", "Video embeds", "Media gallery"],
  },
  {
    number: "03",
    category: "SHOW",
    title: "Events",
    description: "Put the next event first, manage dates and connect every show to tickets or venues.",
    icon: "◇",
    tags: ["Upcoming dates", "Venue links", "Ticket CTA"],
  },
  {
    number: "04",
    category: "CONVERT",
    title: "Booking",
    description:
      "Receive serious enquiries with date, location, budget, event type and direct contact details.",
    icon: "⌁",
    tags: ["Lead inbox", "WhatsApp CTA", "Status tracking"],
  },
  {
    number: "05",
    category: "LISTEN",
    title: "Feedback inbox",
    description: "Receive messages and feedback from fans, promoters and clients inside the backoffice.",
    icon: "◌",
    tags: ["Private feedback", "Replies", "Audience notes"],
  },
  {
    number: "06",
    category: "LEARN",
    title: "Insights",
    description: "Understand visits, clicks, booking interest and the content generating interaction.",
    icon: "↗",
    tags: ["Page views", "Top actions", "Conversion signals"],
  },
];

export function ToolDeck() {
  const [active, setActive] = useState<number | null>(null);

  function select(index: number) {
    setActive((current) => (current === index ? null : index));
  }

  const detail = active !== null ? TOOLS[active] : null;

  return (
    <>
      <div className="lp-deck-intro">
        <span>Hover to explore · Click a card for details</span>
        <span className="lp-deck-line" />
        <span>01 / {String(TOOLS.length).padStart(2, "0")}</span>
      </div>

      <div className={`lp-deck ${detail ? "detail-open" : ""}`} aria-label="My Page core tools">
        <span className="lp-blob a" aria-hidden="true" />
        <span className="lp-blob b" aria-hidden="true" />
        <span className="lp-blob c" aria-hidden="true" />

        {TOOLS.map((tool, index) => (
          <button
            key={tool.number}
            type="button"
            className={`lp-tool-card c${index + 1} ${active === index ? "active" : ""}`}
            aria-expanded={active === index}
            aria-label={`Open ${tool.title} details`}
            onClick={() => select(index)}
          >
            <span className="lp-card-top">
              <span className="lp-ico" aria-hidden="true">
                {tool.icon}
              </span>
              <span>{tool.number}</span>
            </span>
            <span className="lp-card-copy">
              <small>{tool.category}</small>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              <span className="lp-card-more">
                {tool.tags.map((tag) => (
                  <b key={tag}>{tag}</b>
                ))}
              </span>
            </span>
          </button>
        ))}

        <aside className="lp-tool-detail" aria-live="polite">
          {detail && (
            <>
              <button
                type="button"
                className="lp-tool-detail-close"
                onClick={() => setActive(null)}
                aria-label="Back to all tools"
              >
                ← All tools
              </button>
              <div className="lp-tool-detail-number">{detail.number}</div>
              <small>{detail.category}</small>
              <h3>{detail.title}</h3>
              <p>{detail.description}</p>
              <div className="lp-tool-detail-tags">
                {detail.tags.map((tag) => (
                  <b key={tag}>{tag}</b>
                ))}
              </div>
              <button type="button" className="lp-btn primary" onClick={() => setActive(null)}>
                Back to toolkit
              </button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
