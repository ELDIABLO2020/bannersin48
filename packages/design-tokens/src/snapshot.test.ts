import { describe, it, expect } from "vitest";
import { colors, radius, spacing, shadow, breakpoints, container, zIndex } from "./tokens";
import { cssVars, cssVarName, buildCssVarsString } from "./cssVars";
import { tailwindPreset } from "./tailwind-preset";

describe("design tokens", () => {
  describe("radius scale", () => {
    it("uses the design file radius scale", () => {
      expect(radius.button).toBe(10);
      expect(radius.featureCard).toBe(16);
      expect(radius.card).toBe(16);
      expect(radius.pill).toBe(100);
      expect(radius.sm).toBe(6);
    });
  });

  describe("spacing scale", () => {
    it("uses the exclusive 4/8/12/16/20/24/32/40/64/80 scale", () => {
      expect(spacing).toMatchObject({
        micro: 4,
        xs: 8,
        sm: 12,
        md: 16,
        mdLg: 20,
        lg: 24,
        xl: 32,
        "2xl": 40,
        "3xl": 64,
        "4xl": 80,
      });
    });
  });

  describe("shadow scale", () => {
    it("exposes elevation levels plus the accent focus glow", () => {
      expect(shadow.level1).toBe("0 1px 2px rgba(16, 24, 40, 0.05)");
      expect(shadow.level2).toBe("0 4px 12px rgba(16, 24, 40, 0.08)");
      expect(shadow.level3).toBe("0 8px 24px rgba(16, 24, 40, 0.12)");
      expect(shadow.level4).toBe("0 16px 40px rgba(16, 24, 40, 0.16)");
      expect(shadow.focusGlow).toBe("0 0 0 4px rgba(203, 16, 121, 0.25)");
    });
  });

  describe("breakpoints", () => {
    it("uses the design file breakpoints", () => {
      expect(breakpoints).toMatchObject({
        mobile: 320,
        tablet: 600,
        desktop: 1024,
        desktopLg: 1400,
      });
    });
  });

  describe("containers", () => {
    it("uses 1200 / 1440 widths", () => {
      expect(container.contentMax).toBe(1200);
      expect(container.heroMax).toBe(1440);
    });
  });

  describe("z-index scale", () => {
    it("uses the design file's z-index ordering", () => {
      expect(zIndex.tabBar).toBe(40);
      expect(zIndex.dropdown).toBe(50);
      expect(zIndex.modal).toBe(90);
      expect(zIndex.tooltip).toBe(110);
    });
  });
});

describe("tailwind preset", () => {
  it("exposes z-index utilities wired to CSS vars", () => {
    const presetZ = tailwindPreset.theme?.extend?.zIndex as Record<string, string>;
    expect(presetZ.sticky).toBe("var(--z-sticky)");
    expect(presetZ.dropdown).toBe("var(--z-dropdown)");
    expect(presetZ["tab-bar"]).toBe("var(--z-tab-bar)");
  });
});

describe("cssVars", () => {
  it("covers every public color token", () => {
    const required: Array<keyof typeof colors> = [
      "lightest",
      "light",
      "softAccent",
      "strongAccent",
      "ctaPrimary",
      "link",
      "textDark",
      "textLight",
      "error",
      "darkest",
      "inkBlack",
      "surfaceDark",
      "surfaceDarkRaised",
      "brandGreen",
      "greenText",
      "accentTint",
      "borderOnDark",
    ];
    for (const key of required) {
      const direct = (cssVarName as Record<string, string>)[key];
      const prefixed =
        (cssVarName as Record<string, string>)[`bg${key.charAt(0).toUpperCase() + key.slice(1)}`] ??
        (cssVarName as Record<string, string>)[key.charAt(0).toLowerCase() + key.slice(1)];
      expect(direct ?? prefixed, `missing CSS var for color token "${key}"`).toBeTruthy();
    }
  });

  // Asserts the variable names are emitted, not their values — pinning brand
  // hexes here is what made this suite break on every palette change.
  it("emits a :root block via buildCssVarsString()", () => {
    const str = buildCssVarsString();
    expect(str).toMatch(/^:root \{/);
    expect(str).toMatch(/--color-cta-primary: \S+;/);
    expect(str).toMatch(/--color-strong-accent: \S+;/);
    expect(str).toMatch(/--color-bg-soft-accent: \S+;/);
    expect(str).toMatch(/--color-bg-darkest: \S+;/);
    expect(str).toMatch(/--color-link: \S+;/);
    expect(str).toMatch(/\}$/);
  });

  it("all cssVar entries resolve to non-empty strings", () => {
    for (const [k, v] of Object.entries(cssVars)) {
      expect(v, `${k} should have a value`).toBeTruthy();
    }
  });
});
