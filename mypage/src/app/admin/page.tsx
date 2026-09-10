import type { Metadata } from "next";
import { ToolRequestQueue, type AdminToolRequest } from "@/components/admin/ToolRequestQueue";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/studio";
import "@/styles/admin.css";

export const metadata: Metadata = { title: "Plataforma" };

/**
 * The team dashboard.
 *
 * Read-only across the platform, with one exception: replying to a tool
 * request, which doc 03 assigns to the team and which no per-artist role can
 * do. Everything else here is observation, matching the chosen scope: read
 * everything, answer tool requests.
 */
export default async function AdminPage() {
  const [requests, artists, accountCount, artistCount, publishedCount, pendingRequests] = await Promise.all([
    db.toolRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        account: { select: { email: true } },
        artist: { select: { displayName: true } },
      },
    }),
    db.artist.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        displayName: true,
        plan: true,
        createdAt: true,
        publishedPages: { where: { isLive: true }, select: { version: true, publishedAt: true } },
      },
    }),
    db.account.count(),
    db.artist.count(),
    db.publishedPage.count({ where: { isLive: true } }),
    db.toolRequest.count({ where: { status: "new" } }),
  ]);

  const rows: AdminToolRequest[] = requests.map((request) => ({
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    reply: request.reply,
    createdAt: request.createdAt.toISOString(),
    accountEmail: request.account?.email ?? null,
    artistName: request.artist?.displayName ?? null,
    contactEmail: request.contactEmail,
    contactPhone: request.contactPhone,
  }));

  return (
    <>
      <div className="view-head">
        <div>
          <h2>Plataforma My Page</h2>
          <p>Vista de equipa. Leitura em toda a plataforma; a escrita limita-se às respostas aos pedidos.</p>
        </div>
        <span className={`badge ${pendingRequests > 0 ? "is-draft" : ""}`}>
          {pendingRequests > 0 ? `${pendingRequests} por responder` : "Sem pedidos novos"}
        </span>
      </div>

      <div className="stats">
        <Stat label="Contas" value={accountCount} />
        <Stat label="Artistas" value={artistCount} />
        <Stat label="Páginas publicadas" value={publishedCount} />
        <Stat label="Pedidos por responder" value={pendingRequests} />
      </div>

      <h3>Pedidos de ferramenta</h3>
      <ToolRequestQueue requests={rows} />

      <h3>Artistas</h3>
      {artists.length === 0 ? (
        <div className="empty-library">Ainda não há artistas.</div>
      ) : (
        <div className="admin-list">
          <div className="admin-row is-head">
            <span>Artista</span>
            <span>Endereço</span>
            <span>Plano</span>
            <span>Publicada</span>
            <span>Criado</span>
          </div>
          {artists.map((artist) => {
            const live = artist.publishedPages[0];
            return (
              // `data-label` repeats the header row's wording. On a phone the
              // row stacks and admin.css prints the label beside each cell,
              // so a column is never read without knowing which one it is.
              <div className="admin-row" key={artist.id}>
                <span data-label="Artista">
                  <b>{artist.displayName}</b>
                </span>
                <span data-label="Endereço">
                  {live ? (
                    <a href={`/p/${artist.slug}`} target="_blank" rel="noopener noreferrer">
                      /p/{artist.slug} ↗
                    </a>
                  ) : (
                    <span className="muted">/p/{artist.slug}</span>
                  )}
                </span>
                <span data-label="Plano">{artist.plan}</span>
                <span data-label="Publicada" className={live ? undefined : "muted"}>
                  {live ? `v${live.version} · ${formatDateTime(live.publishedAt)}` : "Não publicada"}
                </span>
                <span data-label="Criado" className="muted">
                  {formatDateTime(artist.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
