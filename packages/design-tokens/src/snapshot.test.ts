import { describe, it, expect } from "vitest";
import { colors, radius, spacing, shadow, breakpoints, container, zIndex } from "./tokens";
import { cssVars, cssVarName, buildCssVarsString } from "./cssVars";

/**
 * Token integrity tests — guard against silent drift from the Ecwid design
 * language. Any change here is a deliberate design decision, not an accident.
 */
describe("design tokens — Ecwid design compliance", () => {
  describe("colors", () => {
    it("uses the Ecwid 6-role palette", () => {
      // Backgrounds
      expect(colors.lightest).toBe("#FFFFFF");
      expect(colors.light).toBe("#F8F9FA");
      expect(colors.softAccent).toBe("#E8F5E9");
      expect(colors.softAccent2).toBe("#E0F2FE");
      expect(colors.darkest).toBe("#0A2540");

      // Strong accent (Ecwid green)
      expect(colors.strongAccent).toBe("#00B545");
      expect(colors.strongAccentHover).toBe("#009A3B");
      expect(colors.strongAccentActive).toBe("#007A2E");
      expect(colors.strongAccentText).toBe("#FFFFFF");

      // CTA role aliases the strong accent
      expect(colors.ctaPrimary).toBe("#00B545");
      expect(colors.ctaAccent).toBe("#009A3B");
      expect(colors.ctaActive).toBe("#007A2E");
      expect(colors.ctaText).toBe("#FFFFFF");

      // Text
      expect(colors.dark).toBe("#1F1F1F");
      expect(colors.darkMuted).toBe("#5F6B7A");
      expect(colors.textDark).toBe("#1F1F1F");
      expect(colors.textLight).toBe("#FFFFFF");
      expect(colors.textMedium).toBe("#5F6B7A");

      // Borders
      expect(colors.border).toBe("#E5E7EB");
      expect(colors.borderInput).toBe("#D1D5DB");
      expect(colors.divider).toBe("#E5E7EB");

      // Status
      expect(colors.success).toBe("#00B545");
      expect(colors.warning).toBe("#F5A623");
      expect(colors.error).toBe("#E5484D");
    });

    it("exposes the Ecwid badge palette", () => {
      expect(colors.badgeSuccessBg).toBe("#E8F5E9");
      expect(colors.badgeSuccessText).toBe("#007A2E");
      expect(colors.badgeWarningBg).toBe("#FFF6E6");
      expect(colors.badgeWarningText).toBe("#B26A00");
      expect(colors.badgeErrorBg).toBe("#FEECEC");
      expect(colors.badgeErrorText).toBe("#C72530");
    });

    it("exposes the Ecwid timeline markers", () => {
      expect(colors.timelineDone).toBe("#00B545");
      expect(colors.timelineCurrent).toBe("#00B545");
      expect(colors.timelineCurrentRing).toBe("#E8F5E9");
      expect(colors.timelinePending).toBe("#D1D5DB");
    });
  });

  describe("radius scale", () => {
    it("uses the friendlier Ecwid radius scale", () => {
      expect(radius.button).toBe(10);
      expect(radius.featureCard).toBe(16);
      expect(radius.card).toBe(20);
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
    it("exposes the four soft elevation levels plus the green focus glow", () => {
      expect(shadow.level1).toBe("0 1px 2px rgba(16, 24, 40, 0.05)");
      expect(shadow.level2).toBe("0 4px 12px rgba(16, 24, 40, 0.08)");
      expect(shadow.level3).toBe("0 8px 24px rgba(16, 24, 40, 0.12)");
      expect(shadow.level4).toBe("0 16px 40px rgba(16, 24, 40, 0.16)");
      expect(shadow.focusGlow).toBe("0 0 0 4px rgba(0, 181, 69, 0.18)");
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
    ];
    for (const key of required) {
      // Some keys are exposed directly (e.g. --color-strong-accent), others via
      // the legacy background prefix. We accept either.
      const direct = (cssVarName as Record<string, string>)[key];
      const prefixed =
        (cssVarName as Record<string, string>)[`bg${key.charAt(0).toUpperCase() + key.slice(1)}`] ??
        (cssVarName as Record<string, string>)[key.charAt(0).toLowerCase() + key.slice(1)];
      expect(direct ?? prefixed, `missing CSS var for color token "${key}"`).toBeTruthy();
    }
  });

  it("emits a :root block via buildCssVarsString()", () => {
    const str = buildCssVarsString();
    expect(str).toMatch(/^:root \{/);
    expect(str).toMatch(/--color-cta-primary: #00B545;/);
    expect(str).toMatch(/--color-strong-accent: #00B545;/);
    expect(str).toMatch(/--color-bg-soft-accent: #E8F5E9;/);
    expect(str).toMatch(/--color-bg-darkest: #0A2540;/);
    expect(str).toMatch(/\}$/);
  });

  it("all cssVar entries resolve to non-empty strings", () => {
    for (const [k, v] of Object.entries(cssVars)) {
      expect(v, `${k} should have a value`).toBeTruthy();
    }
  });
});
