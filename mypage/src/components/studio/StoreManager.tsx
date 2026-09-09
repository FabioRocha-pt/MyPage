"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * Merchandising.
 *
 * Doc 04, Etapa 6: prices are computed on the server, a failed payment releases
 * nothing, and a digital product must be private in the library before it can
 * be sold. All three are enforced by the API; this screen surfaces the reasons
 * instead of hiding the rejection.
 *
 * Order state changes follow the same rule as booking: only the transitions the
 * server allows are offered, and refunds are not a local flip — they belong to
 * the payment provider.
 */

export interface VariantRow {
  id: string;
  name: string;
  priceMinor: number;
  stock: number | null;
}

export interface ProductRow {
  id: string;
  title: string;
  type: string;
  currency: string;
  isPublished: boolean;
  variants: VariantRow[];
}

export interface OrderRow {
  reference: string;
  status: string;
  paymentStatus: string;
  buyerName: string;
  buyerEmail: string;
  totalMinor: number;
  currency: string;
  digitalReleased: boolean;
  createdAt: string;
  items: { title: string; variant: string | null; quantity: number; lineTotalMinor: number }[];
}

interface Props {
  artistId: string;
  initialProducts: ProductRow[];
  initialOrders: OrderRow[];
  privateFiles: { id: string; title: string }[];
  images: { id: string; title: string }[];
  included: boolean;
  planLabel: string;
  maxProducts: number;
  paymentsLive: boolean;
}

const ORDER_TRANSITIONS: Record<string, string[]> = {
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  pending_payment: ["cancelled"],
  cancelled: [],
  refunded: [],
  failed: [],
};

const ORDER_LABEL: Record<string, string> = {
  pending_payment: "Aguarda pagamento",
  paid: "Paga",
  preparing: "Em preparação",
  shipped: "Enviada",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
  failed: "Falhada",
};

const EMPTY = {
  title: "",
  description: "",
  type: "physical",
  price: "",
  stock: "",
  shipping: "",
  shippingInfo: "",
  imageMediaId: "",
  assetMediaId: "",
  isPublished: false,
};

export function StoreManager({
  artistId,
  initialProducts,
  initialOrders,
  privateFiles,
  images,
  included,
  planLabel,
  maxProducts,
  paymentsLive,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reloadProducts() {
    const result = await getJson<{ products: ProductRow[] }>(`/api/artists/${artistId}/products`);
    if (result.ok && result.data) setProducts(result.data.products);
  }

  async function reloadOrders() {
    const result = await getJson<{ items: OrderRow[] }>(`/api/artists/${artistId}/orders`);
    if (result.ok && result.data) setOrders(result.data.items);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const priceMinor = Math.round(Number(form.price.replace(",", ".")) * 100);
    if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
      setStatus({ text: "Indica um preço válido.", bad: true });
      setBusy(false);
      return;
    }

    const result = await postJson(`/api/artists/${artistId}/products`, {
      title: form.title,
      description: form.description,
      type: form.type,
      currency: "CVE",
      isPublished: form.isPublished,
      imageMediaId: form.imageMediaId || undefined,
      assetMediaId: form.type === "digital" ? form.assetMediaId || undefined : undefined,
      shippingMinor:
        form.type === "physical" && form.shipping
          ? Math.round(Number(form.shipping.replace(",", ".")) * 100)
          : undefined,
      shippingInfo: form.type === "physical" ? form.shippingInfo || undefined : undefined,
      variants: [
        {
          name: "Padrão",
          priceMinor,
          stock: form.type === "physical" && form.stock ? Number(form.stock) : undefined,
        },
      ],
    });

    setStatus(result.ok ? { text: "Produto criado." } : { text: result.error ?? "Erro.", bad: true });
    if (result.ok) setForm(EMPTY);
    await reloadProducts();
    setBusy(false);
  }

  async function togglePublished(row: ProductRow) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/products/${row.id}`, { isPublished: !row.isPublished });
    setStatus(result.ok ? { text: `${row.title} atualizado.` } : { text: result.error ?? "Erro.", bad: true });
    await reloadProducts();
    setBusy(false);
  }

  async function remove(row: ProductRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/products/${row.id}`);
    setStatus(result.ok ? { text: `${row.title} removido.` } : { text: result.error ?? "Erro.", bad: true });
    await reloadProducts();
    setBusy(false);
  }

  async function advanceOrder(order: OrderRow, next: string) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/orders/${order.reference}`, { status: next });
    setStatus(
      result.ok
        ? { text: `${order.reference}: ${ORDER_LABEL[next] ?? next}.` }
        : { text: result.error ?? "Transição recusada.", bad: true },
    );
    await reloadOrders();
    setBusy(false);
  }

  return (
    <div className="manager">
      {!paymentsLive && (
        <DismissibleNotice id="store-provider">
          O provedor de pagamentos em uso é de teste. Uma encomenda paga aqui não representa dinheiro recebido, e a
          entrega física é da responsabilidade do artista.
        </DismissibleNotice>
      )}
      {!included && (
        <DismissibleNotice id="store-plan">
          A loja não está incluída no plano {planLabel} (limite atual: {maxProducts} produtos).
        </DismissibleNotice>
      )}

      <div className="view-head">
        <div>
          <h2>Merchandising</h2>
          <p>Produtos digitais e físicos, stock e encomendas.</p>
        </div>
      </div>

      <form className="manager-form" onSubmit={create}>
        <h3>Novo produto</h3>
        <div className="fields">
          <label className="field">
            Nome
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label className="field">
            Tipo
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="physical">Físico</option>
              <option value="digital">Digital</option>
            </select>
          </label>
          <label className="field">
            Preço (ECV)
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
            <small>O total é sempre recalculado no servidor no momento da compra.</small>
          </label>
          {form.type === "physical" ? (
            <>
              <label className="field">
                Stock
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                />
              </label>
              <label className="field">
                Portes (ECV)
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.shipping}
                  onChange={(event) => setForm({ ...form, shipping: event.target.value })}
                />
              </label>
              <label className="field wide">
                Informação de envio
                <input
                  type="text"
                  placeholder="Zonas, prazos e responsabilidade da entrega"
                  value={form.shippingInfo}
                  onChange={(event) => setForm({ ...form, shippingInfo: event.target.value })}
                />
              </label>
            </>
          ) : (
            <label className="field">
              Ficheiro digital
              <select
                value={form.assetMediaId}
                onChange={(event) => setForm({ ...form, assetMediaId: event.target.value })}
                required
              >
                <option value="">Escolher ficheiro privado</option>
                {privateFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.title}
                  </option>
                ))}
              </select>
              <small>Só ficheiros privados podem ser vendidos; o comprador recebe acesso após a confirmação.</small>
            </label>
          )}
          <label className="field">
            Imagem
            <select
              value={form.imageMediaId}
              onChange={(event) => setForm({ ...form, imageMediaId: event.target.value })}
            >
              <option value="">Sem imagem</option>
              {images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field wide">
            Descrição
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          Criar produto
        </button>
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Produtos</h3>
      {products.length === 0 ? (
        <div className="empty-library">Ainda não há produtos.</div>
      ) : (
        <div className="record-grid">
          {products.map((row) => (
            <article className="record-card" key={row.id}>
              <h4>{row.title}</h4>
              <small>{row.type === "digital" ? "Digital" : "Físico"}</small>
              {row.variants.map((variant) => (
                <small key={variant.id}>
                  {variant.name} · {formatCve(variant.priceMinor)}
                  {variant.stock !== null ? ` · ${variant.stock} em stock` : ""}
                </small>
              ))}
              <small>{row.isPublished ? "Publicado" : "Não publicado"}</small>
              <div className="record-actions">
                <button type="button" className="secondary" onClick={() => togglePublished(row)} disabled={busy}>
                  {row.isPublished ? "Despublicar" : "Publicar"}
                </button>
                <button type="button" className="quiet" onClick={() => remove(row)} disabled={busy}>
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h3>Encomendas</h3>
      {orders.length === 0 ? (
        <div className="empty-library">Ainda não há encomendas.</div>
      ) : (
        <div className="record-grid">
          {orders.map((order) => (
            <article className="record-card" key={order.reference}>
              <h4>{order.reference}</h4>
              <small>
                {ORDER_LABEL[order.status] ?? order.status} · pagamento {order.paymentStatus}
              </small>
              <small>
                {order.buyerName} · {order.buyerEmail}
              </small>
              {order.items.map((item, index) => (
                <small key={index}>
                  {item.quantity}× {item.title}
                  {item.variant ? ` (${item.variant})` : ""} · {formatCve(item.lineTotalMinor)}
                </small>
              ))}
              <small>Total {formatCve(order.totalMinor)}</small>
              {order.digitalReleased && <small>Ficheiro digital libertado ao comprador</small>}
              <div className="record-actions">
                {(ORDER_TRANSITIONS[order.status] ?? []).map((next) => (
                  <button
                    key={next}
                    type="button"
                    className="secondary"
                    onClick={() => advanceOrder(order, next)}
                    disabled={busy}
                  >
                    {ORDER_LABEL[next] ?? next}
                  </button>
                ))}
                {(ORDER_TRANSITIONS[order.status] ?? []).length === 0 && <span className="badge">Estado final</span>}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="hint">
        Reembolsos não são uma mudança de estado local: têm de partir do provedor de pagamentos para o dinheiro e o
        registo não ficarem dessincronizados.
      </p>
    </div>
  );
}

function formatCve(minor: number): string {
  return new Intl.NumberFormat("pt-CV", {
    style: "currency",
    currency: "CVE",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
