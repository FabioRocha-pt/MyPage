/**
 * Sidebar icons.
 *
 * Doc 01: "Ícones distintos: Dashboard com painel/indicadores; My Page com
 * página/perfil. Traço arredondado coerente com a referência, não caracteres
 * tipográficos genéricos." Both are drawn, not typed, and share the same
 * stroke weight and cap style so the pair reads as one set.
 */

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M8 17v1M12 14v4M16 16v2" />
    </svg>
  );
}

export function MyPageIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 8h18M7 5.5h.01M10 5.5h.01" />
      <circle cx="9" cy="13" r="2" />
      <path d="M6 18c0-2.7 6-2.7 6 0M15 12h3M15 16h3" />
    </svg>
  );
}
