"use client";

import { useState } from "react";
import { getJson } from "@/lib/http";

/**
 * Muska catalogue search.
 *
 * Doc 04, checklist item 8: "pesquisa Muska informa integração pendente."
 * The endpoint answers 503 with the adapter's own message while the integration
 * does not exist, and this component shows that message verbatim — it never
 * renders an empty result list that could read as "no artists found".
 *
 * Doc 04, Etapa 4: "artista selecionado corresponde ao ID real autorizado."
 * Selection is deliberately absent until the adapter can prove ownership.
 */

interface MuskaArtist {
  muskaId: string;
  name: string;
  imageUrl?: string | null;
}

export function MuskaSearch({ connected, message }: { connected: boolean; message: string }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MuskaArtist[]>([]);
  const [note, setNote] = useState<string | null>(connected ? null : message);
  const [busy, setBusy] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);

    const result = await getJson<{ items: MuskaArtist[]; total: number }>(
      `/api/muska/search?q=${encodeURIComponent(query)}`,
    );

    if (!result.ok) {
      setItems([]);
      setNote(result.error);
    } else {
      setItems(result.data?.items ?? []);
      if ((result.data?.items ?? []).length === 0) setNote("Sem resultados para esta pesquisa.");
    }
    setBusy(false);
  }

  return (
    <form className="manager-form" onSubmit={search}>
      <h3>Catálogo Muska</h3>
      <div className="fields">
        <label className="field wide">
          Procurar artista
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome do artista no Muska"
            disabled={!connected}
          />
          <small>
            Associar a página a um artista Muska exige confirmação de titularidade; por isso a seleção só fica
            disponível quando a integração autenticada existir.
          </small>
        </label>
      </div>
      <button type="submit" className="secondary" disabled={busy || !connected}>
        Procurar
      </button>
      {note && (
        <p className="hint" role="status">
          {note}
        </p>
      )}
      {items.length > 0 && (
        <ul className="activity-list">
          {items.map((item) => (
            <li key={item.muskaId}>
              {item.name}
              <small>{item.muskaId}</small>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
