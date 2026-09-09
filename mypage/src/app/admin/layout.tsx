import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireStaffAccount } from "@/lib/studio";
import "@/styles/studio.css";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s · My Page" },
  // The team area must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * The My Page team area.
 *
 * Deliberately outside the `/studio` shell: that shell is artist-scoped and its
 * sidebar, submenu and workspace tabs all assume "the artist I am editing".
 * Staff have no such artist, so reusing it would mean threading a null artist
 * through every one of those components. The shell's own `.studio` grid and
 * `.content` classes are reused, so the two areas stay visually one product.
 *
 * `admin` is already in `RESERVED_SLUGS` (lib/api.ts), so no published page can
 * ever shadow this route.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const account = await requireStaffAccount();

  return (
    <>
      <header className="studio-header">
        <Link href="/" className="brand" aria-label="My Page · Powered by Muska">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="mypage-logo"
            src="/brand/mypage.svg"
            alt="My Page · Powered by Muska"
            width={160}
            height={50}
          />
        </Link>
        <div className="studio-account">
          <span>
            {account.displayName}
            <small style={{ display: "block", opacity: 0.7 }}>{account.email}</small>
          </span>
          <span className="account-badge" aria-hidden="true">
            EQUIPA
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="studio">
        <aside className="sidebar">
          <nav aria-label="Menu de administração">
            <Link className="nav-button active" href="/admin" aria-current="page">
              Administração
            </Link>
          </nav>
          <div className="side-bottom">
            <span className="status-dot" aria-hidden="true" /> Acesso de equipa
          </div>
        </aside>

        <main>
          <header className="topbar">
            <nav className="workspace-tabs" aria-label="Áreas">
              <Link className="selected" href="/admin">
                Plataforma
              </Link>
            </nav>
            <div className="top-actions">
              <ThemeToggle className="icon-button" />
            </div>
          </header>

          <div className="content">{children}</div>

          <footer>
            <span>MY PAGE</span>
            <span>Powered by Muska</span>
          </footer>
        </main>
      </div>
    </>
  );
}
