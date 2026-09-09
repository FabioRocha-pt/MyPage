import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { StudioSidebar, WorkspaceTabs, type SubmenuItem } from "@/components/studio/StudioNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireStudioContext } from "@/lib/studio";
import "@/styles/studio.css";

export const metadata: Metadata = {
  title: { default: "Backoffice", template: "%s · My Page" },
  robots: { index: false, follow: false },
};

/**
 * Backoffice shell.
 *
 * Doc 01: "Logo My Page branco no cabeçalho dark; assinatura preservada" and
 * "Dashboard e My Page na lateral". The submenu is built from the plan the
 * server enforces, so a tool the artist cannot use is marked here instead of
 * failing later inside the screen.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { account, artist, entitlement } = await requireStudioContext();

  const submenu: SubmenuItem[] = [
    { href: "/studio/page", label: "Page" },
    { href: "/studio/links", label: "Ligações" },
    { href: "/studio/press", label: "Press kit", note: note(entitlement.tools, "press") },
    { href: "/studio/audio", label: "Áudio", note: note(entitlement.tools, "music") },
    { href: "/studio/video", label: "Vídeos", note: note(entitlement.tools, "video") },
    { href: "/studio/events", label: "Eventos", note: note(entitlement.tools, "events") },
    { href: "/studio/booking", label: "Booking", note: note(entitlement.tools, "booking") },
    { href: "/studio/donations", label: "Donativos", note: note(entitlement.tools, "donations") },
    { href: "/studio/store", label: "Merchandising", note: note(entitlement.tools, "store") },
    { href: "/studio/tools", label: "Pedir ferramenta" },
  ];

  const initials = artist.displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="studio-header">
        <Link href="/" className="brand" aria-label="My Page · Powered by Muska">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mypage-logo" src="/brand/mypage.svg" alt="My Page · Powered by Muska" width={160} height={50} />
        </Link>
        <div className="studio-account">
          <span>{account.displayName}</span>
          <span className="account-badge" aria-hidden="true">
            {initials}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="studio">
        <StudioSidebar submenu={submenu} />

        <main>
          <header className="topbar">
            <WorkspaceTabs />
            <div className="top-actions">
              <ThemeToggle className="icon-button" />
              <a
                className="secondary"
                href={`/p/${artist.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver página pública ↗
              </a>
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

function note(tools: string[], tool: string): string | undefined {
  return tools.includes(tool) ? undefined : "Fora do plano";
}
