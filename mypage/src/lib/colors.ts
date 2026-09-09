/**
 * Contrast rules, ported from the prototype (assets/backoffice-v5.js) and
 * extended with the production checks doc 02 asks for.
 *
 * Prototype minimum: 4.5:1 text/background, 3:1 accent/background.
 * Doc 02 additionally requires hover/focus/disabled states and text over
 * photography to stay legible — `evaluatePalette` reports on those too.
 */

export type Rgb = [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

export function normaliseHex(value: string): string | null {
  const raw = value.trim();
  if (HEX.test(raw)) return raw.toLowerCase();
  // Accept the 3-digit shorthand and expand it.
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const normalised = normaliseHex(hex);
  if (!normalised) throw new Error(`Cor inválida: ${hex}`);
  const value = normalised.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Picks the button label colour with the better contrast against `background`. */
export function textOn(background: string): string {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#101010")
    ? "#ffffff"
    : "#101010";
}

export function mix(a: string, b: string, weight: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex([ar + (br - ar) * w, ag + (bg - ag) * w, ab + (bb - ab) * w]);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

export interface PaletteInput {
  background: string;
  text: string;
  accent: string;
}

export interface PaletteCheck {
  id: string;
  label: string;
  ratio: number;
  required: number;
  passes: boolean;
}

export interface PaletteReport {
  valid: boolean;
  /** The three prototype-level rules. A palette failing these is rejected. */
  blocking: PaletteCheck[];
  /** Doc 02 production checks. Reported as warnings, not rejections. */
  advisory: PaletteCheck[];
  /** Derived colours the templates consume. */
  derived: {
    accentText: string;
    accentHover: string;
    accentDisabled: string;
    surface: string;
    surfaceRaised: string;
    line: string;
    muted: string;
    /** Solid scrim to place under text that sits over a photograph. */
    overlay: string;
  };
}

const MIN_TEXT = 4.5;
const MIN_ACCENT = 3;
const MIN_MUTED = 4.5;

export function evaluatePalette({ background, text, accent }: PaletteInput): PaletteReport {
  const bg = normaliseHex(background) ?? "#101724";
  const fg = normaliseHex(text) ?? "#ffffff";
  const ac = normaliseHex(accent) ?? "#55d5ee";

  const accentText = textOn(ac);
  const accentHover = relativeLuminance(bg) < 0.5 ? lighten(ac, 0.14) : darken(ac, 0.14);
  const accentDisabled = mix(ac, bg, 0.55);
  const isDark = relativeLuminance(bg) < 0.5;
  const surface = isDark ? lighten(bg, 0.06) : darken(bg, 0.04);
  const surfaceRaised = isDark ? lighten(bg, 0.12) : darken(bg, 0.08);
  const line = isDark ? lighten(bg, 0.18) : darken(bg, 0.14);
  const muted = mix(fg, bg, 0.38);
  const overlay = isDark ? darken(bg, 0.35) : lighten(bg, 0.35);

  const blocking: PaletteCheck[] = [
    {
      id: "text-background",
      label: "Texto sobre o fundo",
      ratio: contrastRatio(bg, fg),
      required: MIN_TEXT,
      passes: contrastRatio(bg, fg) >= MIN_TEXT,
    },
    {
      id: "accent-background",
      label: "Destaque sobre o fundo",
      ratio: contrastRatio(bg, ac),
      required: MIN_ACCENT,
      passes: contrastRatio(bg, ac) >= MIN_ACCENT,
    },
    {
      id: "accent-label",
      label: "Texto do botão sobre o destaque",
      ratio: contrastRatio(ac, accentText),
      required: MIN_TEXT,
      passes: contrastRatio(ac, accentText) >= MIN_TEXT,
    },
  ];

  const advisory: PaletteCheck[] = [
    {
      id: "accent-hover",
      label: "Destaque em hover",
      ratio: contrastRatio(bg, accentHover),
      required: MIN_ACCENT,
      passes: contrastRatio(bg, accentHover) >= MIN_ACCENT,
    },
    {
      id: "accent-disabled",
      label: "Destaque desativado",
      ratio: contrastRatio(bg, accentDisabled),
      required: 1.6,
      passes: contrastRatio(bg, accentDisabled) >= 1.6,
    },
    {
      id: "muted-text",
      label: "Texto secundário",
      ratio: contrastRatio(bg, muted),
      required: MIN_MUTED,
      passes: contrastRatio(bg, muted) >= MIN_MUTED,
    },
    {
      id: "text-overlay",
      label: "Texto sobre fotografia (com scrim)",
      ratio: contrastRatio(overlay, fg),
      required: MIN_TEXT,
      passes: contrastRatio(overlay, fg) >= MIN_TEXT,
    },
  ];

  return {
    valid: blocking.every((check) => check.passes),
    blocking,
    advisory,
    derived: { accentText, accentHover, accentDisabled, surface, surfaceRaised, line, muted, overlay },
  };
}

/**
 * Repairs a palette instead of rejecting it: keeps the background and accent
 * the artist chose and recomputes whatever is unreadable.
 */
export function repairPalette(input: PaletteInput): PaletteInput {
  const bg = normaliseHex(input.background) ?? "#101724";
  let text = normaliseHex(input.text) ?? textOn(bg);
  let accent = normaliseHex(input.accent) ?? "#55d5ee";

  if (contrastRatio(bg, text) < MIN_TEXT) text = textOn(bg);
  if (contrastRatio(bg, accent) < MIN_ACCENT) {
    const isDark = relativeLuminance(bg) < 0.5;
    // Walk the accent towards white or black until it clears 3:1.
    for (let step = 0.1; step <= 1; step += 0.1) {
      const candidate = isDark ? lighten(accent, step) : darken(accent, step);
      if (contrastRatio(bg, candidate) >= MIN_ACCENT) {
        accent = candidate;
        break;
      }
    }
  }
  return { background: bg, text, accent };
}

/**
 * Quantises pixel data into a small palette. Mirrors the prototype's 32-step
 * binning but runs anywhere (used by the server-side extractor).
 */
export function extractPalette(pixels: Uint8Array | Uint8ClampedArray, count = 5): string[] {
  const bins = new Map<string, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] !== undefined && pixels[i + 3] < 128) continue;
    const key = [pixels[i], pixels[i + 1], pixels[i + 2]]
      .map((v) => Math.min(255, Math.round(v / 32) * 32))
      .join(",");
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  return [...bins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => rgbToHex(key.split(",").map(Number) as Rgb));
}
