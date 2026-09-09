import type { Metadata } from "next";
import Link from "next/link";
import { requireStudioContext } from "@/lib/studio";
import { buildSnapshot } from "@/lib/snapshot";
import { PageRenderer } from "@/templates/PageRenderer";
import "@/styles/templates.css";

export const metadata: Metadata = { title: "Preview do rascunho", robots: { index: false } };

/**
 * Authenticated draft preview.
 *
 * Doc 04 lists as a limitation to fix: "Preview não é um preview de rascunho
 * real." It is now — this page and POST /page/publish call the same
 * `buildSnapshot`, and the same `PageRenderer` draws the public page, so what
 * is shown here is what publishing would produce.
 *
 * This route is under /studio, behind the session guard: the draft is never
 * readable from the public side.
 */
export default async function PreviewPage() {
  const { artist } = await requireStudioContext();
  const { snapshot, warnings, errors } = await buildSnapshot(artist.id, { mode: "preview" });

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "12px 20px",
          background: "#1b253b",
          color: "#fff",
          fontSize: 13,
        }}
      >
        <strong>Preview do rascunho</strong>
        <span style={{ opacity: 0.75 }}>
          Isto é o que seria publicado. A página pública em /p/{artist.slug} continua na versão anterior.
        </span>
        {errors.length > 0 && <span style={{ color: "#ffb3b3" }}>Bloqueios: {errors.join(" · ")}</span>}
        {warnings.length > 0 && <span style={{ color: "#f5c451" }}>Avisos: {warnings.join(" · ")}</span>}
        <Link href="/studio/page" style={{ marginLeft: "auto", textDecoration: "underline" }}>
          ← Voltar ao editor
        </Link>
      </div>

      <PageRenderer snapshot={snapshot} />
    </>
  );
}
