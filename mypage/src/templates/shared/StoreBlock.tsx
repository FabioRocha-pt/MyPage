"use client";

import { useMemo, useState } from "react";
import type { SnapshotProduct } from "@/lib/page-model";
import { formatMoney, type CurrencyCode } from "@/lib/money";

/**
 * Multi-product cart and checkout.
 *
 * Doc 02 lists what the prototype lacked: "Não existe carrinho multi-produto,
 * cobrança, reserva de stock, entrega real, fatura, devolução ou gestão
 * completa de vendas."
 *
 * The cart lives here; the money does not. Totals shown are a preview computed
 * from snapshot prices, and the server recomputes them at /api/checkout — doc
 * 04: "Preço/total calculados no servidor". A mismatch means the snapshot is
 * stale, and the server's number wins.
 */

interface Line {
  productId: string;
  variantId: string;
  quantity: number;
}

export function StoreBlock({ products, slug }: { products: SnapshotProduct[]; slug: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  const currency = (products[0]?.currency ?? "CVE") as CurrencyCode;

  const detailed = useMemo(
    () =>
      lines
        .map((line) => {
          const product = products.find((p) => p.id === line.productId);
          const variant = product?.variants.find((v) => v.id === line.variantId);
          if (!product || !variant) return null;
          return { line, product, variant, total: variant.priceMinor * line.quantity };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [lines, products],
  );

  const subtotal = detailed.reduce((sum, entry) => sum + entry.total, 0);
  const shipping = [...new Set(detailed.filter((e) => e.product.type === "physical").map((e) => e.product.id))]
    .reduce((sum, id) => sum + (products.find((p) => p.id === id)?.shippingMinor ?? 0), 0);
  const hasPhysical = detailed.some((entry) => entry.product.type === "physical");

  function add(productId: string, variantId: string) {
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variantId);
      if (existing) {
        return current.map((line) =>
          line.variantId === variantId ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
        );
      }
      return [...current, { productId, variantId, quantity: 1 }];
    });
    setOpen(true);
  }

  function setQuantity(variantId: string, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.variantId !== variantId)
        : current.map((line) => (line.variantId === variantId ? { ...line, quantity } : line)),
    );
  }

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("sending");

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      slug,
      cart: lines,
      buyerName: form.get("buyerName"),
      buyerEmail: form.get("buyerEmail"),
      buyerPhone: form.get("buyerPhone") || undefined,
    };
    if (hasPhysical) {
      payload.addressLine = form.get("addressLine");
      payload.addressCity = form.get("addressCity");
      payload.addressCountry = form.get("addressCountry");
      payload.addressPostcode = form.get("addressPostcode") || undefined;
      payload.deliveryNote = form.get("deliveryNote") || undefined;
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "Não foi possível concluir a encomenda.");
      window.location.href = data.redirectUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
      setState("idle");
    }
  }

  return (
    <div className="tpl-store">
      <div className="tpl-store-grid">
        {products.map((product) => (
          <article key={product.id} className="tpl-product">
            {product.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.title} loading="lazy" />
            )}
            <div className="tpl-product-body">
              <span className="tpl-product-type">
                {product.type === "digital" ? "Digital" : "Físico"}
              </span>
              <h3>{product.title}</h3>
              <p>{product.description}</p>

              <div className="tpl-product-variants">
                {product.variants.map((variant) => {
                  const soldOut = variant.stock !== null && variant.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => add(product.id, variant.id)}
                    >
                      <span>{variant.name}</span>
                      <strong>{formatMoney(variant.priceMinor, product.currency as CurrencyCode)}</strong>
                      {soldOut && <em>Esgotado</em>}
                      {!soldOut && variant.stock !== null && variant.stock <= 5 && (
                        <em>Só {variant.stock}</em>
                      )}
                    </button>
                  );
                })}
              </div>

              {product.type === "physical" && (
                <small className="tpl-product-note">
                  {product.shippingInfo ?? "Envio combinado após a compra."}
                  {product.shippingMinor
                    ? ` · Portes ${formatMoney(product.shippingMinor, product.currency as CurrencyCode)}`
                    : ""}
                  {" · Entrega da responsabilidade do artista."}
                </small>
              )}
              {product.type === "digital" && (
                <small className="tpl-product-note">
                  Download disponível após confirmação do pagamento.
                </small>
              )}
            </div>
          </article>
        ))}
      </div>

      {detailed.length > 0 && (
        <div className={`tpl-cart ${open ? "is-open" : ""}`}>
          <button type="button" className="tpl-cart-toggle" onClick={() => setOpen((v) => !v)}>
            Carrinho · {detailed.length} {detailed.length === 1 ? "artigo" : "artigos"} ·{" "}
            {formatMoney(subtotal + shipping, currency)}
          </button>

          {open && (
            <div className="tpl-cart-body">
              <ul className="tpl-cart-lines">
                {detailed.map(({ line, product, variant, total }) => (
                  <li key={variant.id}>
                    <div>
                      <strong>{product.title}</strong>
                      <span>{variant.name}</span>
                    </div>
                    <div className="tpl-cart-qty">
                      <button
                        type="button"
                        aria-label={`Menos um ${product.title}`}
                        onClick={() => setQuantity(variant.id, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Mais um ${product.title}`}
                        disabled={variant.stock !== null && line.quantity >= variant.stock}
                        onClick={() => setQuantity(variant.id, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <strong>{formatMoney(total, currency)}</strong>
                  </li>
                ))}
              </ul>

              <dl className="tpl-cart-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal, currency)}</dd>
                </div>
                {shipping > 0 && (
                  <div>
                    <dt>Portes</dt>
                    <dd>{formatMoney(shipping, currency)}</dd>
                  </div>
                )}
                <div className="tpl-cart-total">
                  <dt>Total</dt>
                  <dd>{formatMoney(subtotal + shipping, currency)}</dd>
                </div>
              </dl>
              <p className="tpl-cart-note">
                O total é recalculado no servidor antes do pagamento. Nada é cobrado até confirmares.
              </p>

              <form className="tpl-form" onSubmit={checkout}>
                <div className="tpl-form-grid">
                  <label>
                    <span>Nome *</span>
                    <input name="buyerName" required maxLength={120} autoComplete="name" />
                  </label>
                  <label>
                    <span>Email *</span>
                    <input name="buyerEmail" type="email" required maxLength={200} autoComplete="email" />
                  </label>
                  <label>
                    <span>Telefone</span>
                    <input name="buyerPhone" type="tel" maxLength={40} autoComplete="tel" />
                  </label>

                  {hasPhysical && (
                    <>
                      <label className="tpl-form-full">
                        <span>Morada *</span>
                        <input name="addressLine" required maxLength={240} autoComplete="street-address" />
                      </label>
                      <label>
                        <span>Cidade *</span>
                        <input name="addressCity" required maxLength={80} autoComplete="address-level2" />
                      </label>
                      <label>
                        <span>País *</span>
                        <input name="addressCountry" required maxLength={80} autoComplete="country-name" />
                      </label>
                      <label>
                        <span>Código postal</span>
                        <input name="addressPostcode" maxLength={20} autoComplete="postal-code" />
                      </label>
                      <label className="tpl-form-full">
                        <span>Nota de entrega</span>
                        <textarea name="deliveryNote" rows={2} maxLength={500} />
                      </label>
                    </>
                  )}
                </div>

                {error && (
                  <p className="tpl-form-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="tpl-form-actions">
                  <button className="tpl-cta" type="submit" disabled={state === "sending"}>
                    {state === "sending" ? "A preparar…" : "Ir para pagamento"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
