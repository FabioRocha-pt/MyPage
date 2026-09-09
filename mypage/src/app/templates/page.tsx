import type { Metadata } from "next";
import Link from "next/link";
import { TemplateCatalog } from "@/components/TemplateCatalog";
import { getAccount, getCurrentArtistId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getArtistEntitlement } from "@/lib/entitlements";
import "@/styles/studio.css";
import "@/styles/catalog.css";

export const metadata: Metadata = {
  title: "Templates",
  description: "Explora as mesmas bases disponíveis no editor. Cada miniatura mostra o próprio template.",
};

/**
 * Public template catalogue — the prototype's `templates.html`.
 *
 * Doc 01: "Catálogo de templates público e backoffice devem partilhar as mesmas
 * miniaturas e identificadores." Both render <TemplateCatalog />; there is no
 * second list of templates anywhere in the codebase.
 *
 * A signed-in artist choosing here applies the template to their draft, which is
 * what the prototype's `chooseMyPageTemplate` did through localStorage. A
 * visitor is sent to registration carrying the choice.
 */
export default async function TemplatesPage() {
  const account = await getAccount();
  const artistId = account ? await getCurrentArtistId(account.id) : null;

  const [draft, entitlement] = await Promise.all([
    artistId ? db.pageDraft.findUnique({ where: { artistId }, select: { templateId: true, version: true } }) : null,
    artistId ? getArtistEntitlement(artistId) : null,
  ]);

  return (
    <main className="catalog-page">
      <nav>
        <Link href="/">My Page</Link>
        <Link href="/studio">O meu backoffice ↗</Link>
      </nav>
      <h1>Escolhe o teu palco.</h1>
      <p>Explora as mesmas bases disponíveis no editor. Cada miniatura mostra o próprio template.</p>

      <TemplateCatalog
        mode={artistId ? "editor" : "signup"}
        artistId={artistId ?? undefined}
        draftVersion={draft?.version}
        current={draft?.templateId}
        allowedTemplates={entitlement?.allowedTemplates}
        planLabel={entitlement?.label}
      />

      {!artistId && (
        <p className="hint">
          Ao escolheres um template levamos-te para a criação de conta, e ele fica logo aplicado ao teu rascunho.
        </p>
      )}
    </main>
  );
}
