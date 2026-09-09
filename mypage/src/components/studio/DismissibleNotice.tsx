"use client";

import { useEffect, useState } from "react";

/**
 * Yellow warning strip.
 *
 * Doc 01: "Avisos amarelos com linha tracejada, ícone e opção de fechar."
 * Dismissal is remembered per notice id so a closed warning does not come back
 * on every navigation — but only in this browser, since it is a UI preference
 * and not artist data.
 */
export function DismissibleNotice({ id, children }: { id: string; children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `mypage-notice:${id}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "closed") setDismissed(true);
    } catch {
      // Private browsing: the notice simply shows every time.
    }
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div className="notice">
      <span className="warning-icon" aria-hidden="true">
        ⚠
      </span>
      <p>{children}</p>
      <button
        type="button"
        className="dismiss-note"
        aria-label="Fechar aviso"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(storageKey, "closed");
          } catch {
            // Nothing to persist; the notice returns on the next visit.
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
