"use client";

import Link from "next/link";
import type { EditorCardId } from "@/lib/page-model";
import { CARD_COPY, CARD_MANAGER, type SelectableItem } from "./types";

/**
 * The cards that only choose what a section shows.
 *
 * Doc 01: "Cada uma abre para configuração/seleção." Doc 02: "A página escolhe
 * conteúdos da biblioteca; uploads e gestão ficam em Áudio." So this card lists
 * what the artist already owns and writes the choice into the section's
 * `contentIds` — it never uploads or creates anything.
 *
 * `selectable` is empty for the sections the snapshot does not filter by id
 * (booking, donations, store): there the card is visibility and position only.
 */
export function SelectionCard({
  cardId,
  items,
  selected,
  emptyLabel,
  allMeansAll,
  onToggle,
}: {
  cardId: EditorCardId;
  items: SelectableItem[];
  selected: string[];
  emptyLabel: string;
  /** Events: an empty selection means "show all upcoming" (see lib/snapshot.ts). */
  allMeansAll?: boolean;
  onToggle: (id: string) => void;
}) {
  const manager = CARD_MANAGER[cardId];
  const copy = CARD_COPY[cardId];

  return (
    <>
      {copy && <p className="hint">{copy}</p>}

      {items.length > 0 ? (
        <>
          <h3>Conteúdos nesta secção</h3>
          <div className="catalog-selector">
            {items.map((item) => (
              <label key={item.id}>
                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
                <span>
                  {item.title}
                  {item.note && (
                    <small style={{ display: "block", color: "var(--muted)" }}>{item.note}</small>
                  )}
                </span>
              </label>
            ))}
          </div>
          {allMeansAll && selected.length === 0 && (
            <p className="hint">Sem seleção, a página mostra todos os eventos por vir.</p>
          )}
        </>
      ) : (
        // Booking, donations and store pass no label: the snapshot does not
        // filter those sections by id, so there is nothing to select and the
        // card is visibility and position only. Rendering the box regardless
        // left a blank grey slab, since `.empty-library` carries padding and a
        // background of its own.
        emptyLabel !== "" && <div className="empty-library">{emptyLabel}</div>
      )}

      {manager && (
        <Link className="secondary" href={manager.href}>
          {manager.label} ↗
        </Link>
      )}
    </>
  );
}
