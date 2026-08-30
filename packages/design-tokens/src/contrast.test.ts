import { describe, it, expect } from "vitest";
import { colors } from "./tokens";
import { contrastRatio, relativeLuminance, passesAANormal, AA_NORMAL } from "./contrast";

describe("contrast helpers", () => {
  it("computes the reference white/black extremes", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("supports 3-digit hex", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#616161")).toBeCloseTo(relativeLuminance("#616161"), 10);
  });

  it("rejects non-hex input", () => {
    expect(() => relativeLuminance("white")).toThrow();
    expect(() => relativeLuminance("#12")).toThrow();
  });
});

describe("readable secondary text tokens", () => {
  it("muted (#616161) clears AA on white and light gray", () => {
    expect(contrastRatio(colors.muted, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(colors.muted, colors.light)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(passesAANormal(contrastRatio(colors.muted, colors.lightest))).toBe(true);
  });

  it("textMedium matches muted and clears AA on white", () => {
    expect(colors.textMedium).toBe(colors.muted);
    expect(contrastRatio(colors.textMedium, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("primary body text clears AA on white", () => {
    expect(contrastRatio(colors.textDark, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(colors.textCharcoal, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe("brand foreground/background pairs", () => {
  it("link color clears AA on white", () => {
    expect(contrastRatio(colors.link, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("accent text on strong accent clears AA", () => {
    expect(contrastRatio(colors.strongAccentText, colors.strongAccent)).toBeGreaterThanOrEqual(
      AA_NORMAL,
    );
  });

  it("accent-on-dark text clears AA on dark surfaces", () => {
    expect(
      contrastRatio(colors.strongAccentOnDark, colors.surfaceDark),
    ).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(colors.textOnDark, colors.surfaceDark)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("greenText clears AA on white while brandGreen is fill-only", () => {
    expect(contrastRatio(colors.greenText, colors.lightest)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe("decorative/disabled neutrals are intentionally non-AA", () => {
  it("disabledText does not pretend to be readable text", () => {
    expect(contrastRatio(colors.disabledText, colors.lightest)).toBeLessThan(AA_NORMAL);
  });
});
