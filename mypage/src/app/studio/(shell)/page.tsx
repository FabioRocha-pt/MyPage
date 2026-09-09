import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { formatDateTime, requireStudioContext } from "@/lib/studio";
import { DismissibleNotice } from "@/components/studio/DismissibleNotice";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard.
 *
 * Doc 02: "Indicadores pretendidos: visitas, cliques nos conteúdos e pedidos de
 * booking; donativos confirmados quando a ferramenta estiver ativa. Mostrar
 * estados vazios reais, não números inventados. (…) Atualmente os indicadores
 * não têm origem de dados."
 *
 * So: booking requests and confirmed donations are counted from the database,
 * because those rows exist. Visits and content clicks have no collector yet and
 * show an em dash with the reason — never a plausible-looking number.
 */

interface Metric {
  label: string;
  value: string;
  note: string;
}

export default async function DashboardPage() {
  const { artist, entitlement, usage, isPublished, publishedAt, draftUpdatedAt } =
    await requireStudioContext();

  const [newBookings, totalBookings, confirmedDonations, notifications, draft, links] = await Promise.all([
    db.bookingRequest.count({ where: { artistId: artist.id, status: "new" } }),
    db.bookingRequest.count({ where: { artistId: artist.id } }),
    db.donation.aggregate({
      where: { status: "confirmed", campaign: { artistId: artist.id } },
      _sum: { amountMinor: true },
      _count: true,
    }),
    db.notification.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.pageDraft.findUnique({
      where: { artistId: artist.id },
      select: { heroMediaId: true, portraitMediaId: true, templateId: true },
    }),
    db.externalLink.count({ where: { artistId: artist.id } }),
  ]);

  const donationsEnabled = entitlement.tools.includes("donations");

  const metrics: Metric[] = [
    {
      label: "Visitas à página",
      value: "—",
      note: "Sem origem de dados ligada",
    },
    {
      label: "Cliques nos conteúdos",
      value: "—",
      note: "Sem origem de dados ligada",
    },
    {
      label: "Pedidos de booking",
      value: String(totalBookings),
      note: newBookings > 0 ? `${newBookings} por responder` : "Nenhum pedido novo",
    },
    {
      label: "Donativos confirmados",
      value: donationsEnabled
        ? formatMoney(confirmedDonations._sum.amountMinor ?? 0, "CVE" as CurrencyCode)
        : "—",
      note: donationsEnabled
        ? `${confirmedDonations._count} pagamentos confirmados`
        : `Fora do plano ${entitlement.label}`,
    },
  ];

  // Doc 02: "Atalhos para completar perfil, imagens, músicas e booking."
  // Each step reports whether it is already done, from real data.
  const steps = [
    {
      number: "01",
      label: "Completar informações básicas",
      href: "/studio/page#basic",
      done: Boolean(artist.displayName && links > 0),
    },
    {
      number: "02",
      label: "Escolher imagens e template",
      href: "/studio/page#visual",
      done: Boolean(draft?.heroMediaId || draft?.portraitMediaId),
    },
    {
      number: "03",
      label: "Adicionar música e vídeos",
      href: "/studio/audio",
      done: usage.mediaItems > 0,
    },
    {
      number: "04",
      label: "Configurar pedidos de booking",
      href: "/studio/booking",
      done: totalBookings > 0,
    },
  ];

  return (
    <>
      <DismissibleNotice id="dashboard-metrics">
        As visitas e os cliques ainda não têm recolha ligada, por isso aparecem a traço. Os pedidos de booking e os
        donativos confirmados vêm da base de dados.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>A tua página, num só lugar.</h2>
          <p>Acompanha o que já existe e prepara o próximo passo.</p>
        </div>
        <Link className="primary" href="/studio/page">
          Editar My Page ↗
        </Link>
      </div>

      <div className="stats">
        {metrics.map((metric) => (
          <article className="stat" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h3>Vamos preparar a tua página.</h3>
          <p>Identidade, imagem e ferramentas. Escolhe o que os teus visitantes vão encontrar.</p>
          <div className="setup">
            {steps.map((step) => (
              <Link href={step.href} key={step.number}>
                <span className={step.done ? "done" : ""}>{step.done ? "✓" : step.number}</span>
                {step.label}
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3>Estado da página</h3>
          <p>
            {isPublished
              ? "A versão publicada é independente do rascunho: o público só muda quando publicares de novo."
              : "Ainda nada está público. Guardar o rascunho não publica a página."}
          </p>

          <div className="setup">
            <Link href={`/p/${artist.slug}`}>
              <span className={isPublished ? "done" : ""}>{isPublished ? "✓" : "—"}</span>
              {isPublished ? `Publicada em ${formatDateTime(publishedAt)}` : "Ainda não publicada"}
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/studio/page">
              <span>✎</span>
              Rascunho guardado em {formatDateTime(draftUpdatedAt)}
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/studio/page#visual">
              <span>◫</span>
              Template {draft?.templateId ?? "01"} · plano {entitlement.label}
              <b aria-hidden="true">↗</b>
            </Link>
          </div>

          {notifications.length > 0 ? (
            <ul className="activity-list">
              {notifications.map((item) => (
                <li key={item.id}>
                  <span className={item.readAt ? "" : "unread"}>{item.title}</span>
                  <small>
                    {formatDateTime(item.createdAt)} · {item.body}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <span aria-hidden="true">◷</span>
              <h3>Ainda sem atividade</h3>
              <p>Quando a página estiver publicada, os pedidos e as interações aparecem aqui.</p>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
