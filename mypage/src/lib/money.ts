/**
 * Money handling.
 *
 * Doc 03: "Valores monetários devem usar unidades mínimas inteiras e moeda
 * explícita; não confiar em totais recebidos do browser."
 *
 * Every amount in the database is an integer in the currency's minor unit.
 * CVE (Cape Verdean escudo) is quoted without decimals in practice, but is
 * formally a 2-decimal currency; we keep 2 exponents everywhere so that a
 * future switch to EUR needs no data migration.
 */

export const CURRENCIES = {
  CVE: { code: "CVE", exponent: 2, label: "Escudo cabo-verdiano", locale: "pt-CV" },
  EUR: { code: "EUR", exponent: 2, label: "Euro", locale: "pt-PT" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function isCurrency(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}

/** Parses a user-entered major-unit amount ("1 250,50") into minor units. */
export function toMinor(input: string | number, currency: CurrencyCode = "CVE"): number | null {
  const { exponent } = CURRENCIES[currency];
  const raw = typeof input === "number" ? String(input) : input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > exponent) return null;
  const padded = fraction.padEnd(exponent, "0");
  const value = Number(whole) * 10 ** exponent + Number(padded || "0");
  return Number.isSafeInteger(value) ? value : null;
}

export function fromMinor(minor: number, currency: CurrencyCode = "CVE"): number {
  return minor / 10 ** CURRENCIES[currency].exponent;
}

export function formatMoney(minor: number, currency: CurrencyCode = "CVE"): string {
  const { locale, code, exponent } = CURRENCIES[currency];
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "CVE" ? 0 : exponent,
      maximumFractionDigits: exponent,
    }).format(fromMinor(minor, currency));
  } catch {
    return `${fromMinor(minor, currency).toFixed(exponent)} ${code}`;
  }
}

/**
 * Recomputes a line total server-side. Quantity is clamped to a sane range so a
 * hostile client cannot overflow the integer total.
 */
export function lineTotal(priceMinor: number, quantity: number): number {
  const qty = Math.floor(quantity);
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000) {
    throw new Error("Quantidade inválida.");
  }
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
    throw new Error("Preço inválido.");
  }
  return priceMinor * qty;
}
