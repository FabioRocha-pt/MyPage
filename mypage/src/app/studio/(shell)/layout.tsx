import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { StudioSidebar, WorkspaceTabs, type SubmenuItem } from "@/components/studio/StudioNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireStudioContext } from "@/lib/studio";
import "@/styles/studio.css";
import "@/styles/catalog.css";

export const metadata: Metadata = {
  title: { default: "Backoffice", template: "%s · My Page" },
  robots: { index: false, follow: false },
};

/**
 * Backoffice shell.
 *
 * Doc 04 checklist: "Logo My Page branco no cabeçalho dark; assinatura
 * preservada." The header is the prototype's `muskalink-header`: logo on the
 * left, workspace identity on the right. Signing out is the one addition the
 * prototype could not have, since it had no accounts.
 *
 * Doc 01: the submenu is Page, Áudio, Vídeos, Eventos, Booking, Donativos e
 * Merchandising — nothing else. A tool the plan does not include is marked here
 * rather than failing later inside the screen.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { account, artist, entitlement } = await requireStudioContext();

  const submenu: SubmenuItem[] = [
    { href: "/studio/page", label: "Page" },
    { href: "/studio/audio", label: "Áudio", note: note(entitlement.tools, "music") },
    { href: "/studio/video", label: "Vídeos", note: note(entitlement.tools, "video") },
    { href: "/studio/events", label: "Eventos", note: note(entitlement.tools, "events") },
    { href: "/studio/booking", label: "Booking", note: note(entitlement.tools, "booking") },
    { href: "/studio/donations", label: "Donativos", note: note(entitlement.tools, "donations") },
    { href: "/studio/store", label: "Merchandising", note: note(entitlement.tools, "store") },
  ];

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
            {artist.displayName}
            <small style={{ display: "block", opacity: 0.7 }}>{account.email}</small>
          </span>
          <span className="account-badge" aria-hidden="true">
            MUSKA
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="studio">
        <StudioSidebar submenu={submenu} />

        <main>
          <header className="topbar">
            <WorkspaceTabs />
            {/*
              The prototype moves "Atualizar página" and "Preview" down into the
              page actions (backoffice-v4.js), leaving only the theme switch up
              here. Doc 01: "Atualizar página, Preview e Publicar no fundo."
            */}
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

function note(tools: string[], tool: string): string | undefined {
  return tools.includes(tool) ? undefined : "Fora do plano";
}
