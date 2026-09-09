"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, MyPageIcon } from "./icons";

/**
 * Sidebar and workspace tabs.
 *
 * Doc 01, "Navegação final do backoffice": "Dashboard e My Page na lateral. Ao
 * entrar em My Page, mostrar: Page, Áudio, Vídeos, Eventos, Booking, Donativos
 * e Merchandising." The submenu therefore only appears inside My Page.
 *
 * Tools the plan does not include still show, marked, rather than disappearing:
 * doc 04 asks for "ferramentas indisponíveis (…) claramente assinaladas".
 */

export interface SubmenuItem {
  href: string;
  label: string;
  /** Rendered under the label, e.g. "Não incluído no plano Free". */
  note?: string;
}

export function StudioSidebar({ submenu }: { submenu: SubmenuItem[] }) {
  const pathname = usePathname();
  const inMyPage = pathname !== "/studio";

  return (
    <aside className="sidebar">
      <nav aria-label="Menu principal">
        <Link className={`nav-button ${pathname === "/studio" ? "active" : ""}`} href="/studio">
          <DashboardIcon className="nav-icon" />
          Dashboard
        </Link>
        <Link className={`nav-button ${inMyPage ? "active" : ""}`} href="/studio/page">
          <MyPageIcon className="nav-icon" />
          My Page
        </Link>
      </nav>

      {inMyPage && (
        <>
          <p className="side-caption">GESTÃO</p>
          <div className="mypage-submenu">
            {submenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}
              >
                {item.label}
                {item.note && <small>{item.note}</small>}
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="side-bottom">
        <span className="status-dot" aria-hidden="true" /> Ambiente de desenvolvimento
        <small>Powered by Muska</small>
      </div>
    </aside>
  );
}

export function WorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="workspace-tabs" aria-label="Área My Page">
      <Link className={pathname === "/studio" ? "selected" : ""} href="/studio">
        Dashboard
      </Link>
      <Link className={pathname !== "/studio" ? "selected" : ""} href="/studio/page">
        My Page
      </Link>
      {/* Doc 01: "'Explorar artistas' deve abrir https://muskalive.com". */}
      <a className="explore" href="https://muskalive.com" target="_blank" rel="noopener noreferrer">
        Explorar artistas ↗
      </a>
    </nav>
  );
}
