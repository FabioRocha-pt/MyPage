"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark switch.
 * Doc 01: "Modos claro e escuro, incluindo contraste dos ícones e campos."
 *
 * The initial value is applied by the inline script in the root layout, so this
 * component only mirrors and updates it — no flash on first paint.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mypage-theme", next);
    } catch {
      // Private browsing: the choice simply does not persist.
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
