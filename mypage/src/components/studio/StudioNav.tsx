"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const rail = useRef<HTMLDivElement>(null);

  /*
   * On a phone the submenu is a horizontal rail (studio.css, max-width 720px),
   * so the entry for the screen you are on can start out scrolled off to the
   * right — "Merchandising" sits ~400px into the rail. Centre it on arrival.
   *
   * `scrollLeft` rather than `scrollIntoView`: the latter also scrolls the
   * window, which would move the page under the reader on every navigation.
   * Desktop is unaffected, where the rail does not overflow and the assignment
   * is a no-op.
   */
  useEffect(() => {
    const node = rail.current;
    const active = node?.querySelector<HTMLElement>("a.active");
    if (!node || !active) return;
    node.scrollLeft = active.offsetLeft - (node.clientWidth - active.clientWidth) / 2;
  }, [pathname]);

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
          <div className="mypage-submenu" ref={rail}>
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
      {/*
        `ws-tab` marks the two links the sidebar's segmented control repeats.
        Below 720px the sidebar owns them and these copies step aside, so a
        phone shows each destination once instead of twice.
      */}
      <Link className={`ws-tab ${pathname === "/studio" ? "selected" : ""}`} href="/studio">
        Dashboard
      </Link>
      <Link className={`ws-tab ${inMyPage ? "selected" : ""}`} href="/studio/page">
        My Page
      </Link>
      {/* Doc 01: "'Explorar artistas' deve abrir https://muskalive.com". */}
      <a className="explore" href="https://muskalive.com" target="_blank" rel="noopener noreferrer">
        Explorar artistas ↗
      </a>
    </nav>
  );
}
