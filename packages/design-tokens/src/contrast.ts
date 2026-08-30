/**
 * WCAG 2.x contrast helpers for design-token validation.
 *
 * These are used by the token test suite to prove that every semantic
 * foreground/background pair clears AA before a token ships. They are pure
 * functions with no runtime dependencies so they can also be reused by
 * content-validation scripts without pulling in a browser.
 */

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function channel(hex: string, start: number): number {
  const value = hex.slice(start, start + 2);
  return parseInt(value, 16) / 255;
}

function expandShortHex(hex: string): string {
  if (hex.length !== 4) return hex;
  return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
}

/**
 * Relative luminance per WCAG 2.1 (sRGB → linearized RGB → luminance).
 * Accepts 3- or 6-digit hex; returns a value in the range [0, 1].
 */
export function relativeLuminance(hex: string): number {
  if (!HEX_RE.test(hex)) {
    throw new Error(`relativeLuminance expected a hex color, got "${hex}"`);
  }
  const expanded = expandShortHex(hex.toLowerCase());
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const r = toLinear(channel(expanded, 1));
  const g = toLinear(channel(expanded, 3));
  const b = toLinear(channel(expanded, 5));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two hex colors (1:1 to 21:1), symmetrical in its
 * arguments per the WCAG formula.
 */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Normal text (and any text below ~24px / 18.66px bold) requires 4.5:1. */
export const AA_NORMAL = 4.5;
/** Large text (≥24px, or ≥18.66px bold) requires 3:1. */
export const AA_LARGE = 3;

export function passesAANormal(ratio: number): boolean {
  return ratio >= AA_NORMAL;
}

export function passesAALarge(ratio: number): boolean {
  return ratio >= AA_LARGE;
}
