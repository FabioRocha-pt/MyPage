"use client";

import { useState } from "react";

/**
 * The toolkit deck.
 *
 * Doc 01: "Toolkit: baralho sem caixa de fundo, glows/blur ambientais
 * preservados. Remover o antigo texto lateral 'AS YOUR TOOLKIT' e a iluminação
 * do cursor por baixo das cartas. Conteúdo legível; clique abre detalhes ao
 * lado, segundo clique/voltar repõe listagem. Mobile não depende de hover."
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
    title: "Editor visual",
    description:
      "Edita identidade, biografia, cores, capa, secções e chamadas para ação sem tocar em código.",
    icon: "✦",
    tags: ["Preview real", "Controlo de tema", "Gestor de secções"],
  },
  {
    number: "02",
    category: "PLAY",
    title: "Música e media",
    description:
      "Destaca sets, Spotify, SoundCloud, Mixcloud, YouTube, galerias e vídeos numa só página.",
    icon: "▶",
    tags: ["Set em destaque", "Embeds", "Galeria"],
  },
  {
    number: "03",
    category: "SHOW",
    title: "Eventos",
    description:
      "Coloca a próxima data primeiro, gere o calendário e liga cada show a bilhetes ou venues.",
    icon: "◇",
    tags: ["Próximas datas", "Locais", "Link de bilhetes"],
  },
  {
    number: "04",
    category: "CONVERT",
    title: "Booking",
    description:
      "Recebe pedidos sérios com data, local, tipo de evento e contacto direto do promotor.",
    icon: "⌁",
    tags: ["Caixa de pedidos", "Estados", "Disponibilidade"],
  },
  {
    number: "05",
    category: "SELL",
    title: "Loja e donativos",
    description:
      "Vende merchandising e ficheiros digitais, ou recebe apoio direto para um projeto.",
    icon: "◌",
    tags: ["Carrinho", "Stock", "Campanhas"],
  },
  {
    number: "06",
    category: "LEARN",
    title: "Insights",
    description:
      "Percebe visitas, cliques, interesse em booking e que conteúdos geram mais interação.",
    icon: "↗",
    tags: ["Visitas", "Ações", "Sinais de conversão"],
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
        <span>Clica numa carta para ver detalhes</span>
        <span className="lp-deck-line" />
        <span>{String(TOOLS.length).padStart(2, "0")} ferramentas</span>
      </div>

      <div className={`lp-deck ${detail ? "detail-open" : ""}`} aria-label="Ferramentas My Page">
        <span className="lp-blob a" aria-hidden="true" />
        <span className="lp-blob b" aria-hidden="true" />
        <span className="lp-blob c" aria-hidden="true" />

        {TOOLS.map((tool, index) => (
          <button
            key={tool.number}
            type="button"
            className={`lp-tool-card c${index + 1} ${active === index ? "active" : ""}`}
            aria-expanded={active === index}
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
              <button type="button" className="lp-tool-detail-close" onClick={() => setActive(null)}>
                ← Todas as ferramentas
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
                Voltar ao toolkit
              </button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
