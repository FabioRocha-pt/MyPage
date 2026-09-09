"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardIcon, MyPageIcon } from "./icons";

/**
 * Sidebar and workspace tabs.
 *
 * Doc 01, "Navegação final do backoffice": "Dashboard e My Page na lateral. Ao
 * entrar em My Page, mostrar: Page (criador e publicador), Áudio e Vídeos
 * (bibliotecas), Eventos, Booking, Donativos e Merchandising." That is exactly
 * the list below — press kit, ligações e pedido de ferramenta vivem dentro do
 * criador Page, como no protótipo, e não duplicam entradas no menu.
 *
 * Tools outside the plan still show, marked: doc 04 asks for "ferramentas
 * indisponíveis (…) claramente assinaladas".
 */

export interface SubmenuItem {
  href: string;
  label: string;
  note?: string;
}

export function StudioSidebar({ submenu }: { submenu: SubmenuItem[] }) {
  const pathname = usePathname();
  const inMyPage = pathname !== "/studio";

  return (
    <aside className="sidebar">
      <nav aria-label="Menu principal">
        <Link
          className={`nav-button ${pathname === "/studio" ? "active" : ""}`}
          href="/studio"
          aria-current={pathname === "/studio" ? "page" : undefined}
        >
          <DashboardIcon className="nav-icon" />
          Dashboard
        </Link>
        <Link
          className={`nav-button ${inMyPage ? "active" : ""}`}
          href="/studio/page"
          aria-current={inMyPage ? "page" : undefined}
        >
          <MyPageIcon className="nav-icon" />
          My Page
        </Link>

        {inMyPage && (
          <div className="mypage-submenu">
            {submenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "active" : ""}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
                {item.note && <small>{item.note}</small>}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="side-bottom">
        <span className="status-dot" aria-hidden="true" /> Ambiente de desenvolvimento
        <small>Powered by Muska</small>
      </div>
    </aside>
  );
}

export function WorkspaceTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const inMyPage = pathname !== "/studio";

  return (
    <nav className="workspace-tabs" aria-label="Área My Page">
      <button
        type="button"
        className="back-button"
        aria-label="Voltar ao dashboard"
        onClick={() => router.push("/studio")}
      >
        ‹
      </button>
      <Link className={pathname === "/studio" ? "selected" : ""} href="/studio">
        Dashboard
      </Link>
      <Link className={inMyPage ? "selected" : ""} href="/studio/page">
        My Page
      </Link>
      {/* Doc 01: "'Explorar artistas' deve abrir https://muskalive.com". */}
      <a className="explore" href="https://muskalive.com" target="_blank" rel="noopener noreferrer">
        Explorar artistas ↗
      </a>
    </nav>
  );
}
