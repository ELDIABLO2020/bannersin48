import { describe, it, expect } from "vitest";
import { colors, radius, spacing, shadow, breakpoints, container, zIndex } from "./tokens";
import { cssVars, cssVarName, buildCssVarsString } from "./cssVars";

/**
 * Token integrity tests — guard against silent drift from the design file.
 * Any change here is a deliberate design decision, not an accident.
 */
describe("design tokens — design file compliance", () => {
  describe("colors", () => {
    it("uses the Housecall Pro palette verbatim", () => {
      expect(colors.navyBase).toBe("#13191E");
      expect(colors.navyDeep).toBe("#002942");
      expect(colors.navyDark).toBe("#0E2634");
      expect(colors.surface).toBe("#FFFFFF");
      expect(colors.surfaceTint).toBe("#F5F5F5");
      expect(colors.infoTint).toBe("#DEF0FF");
      expect(colors.ctaPrimary).toBe("#FF9B24");
      expect(colors.ctaAccent).toBe("#FFB706");
      expect(colors.ctaActive).toBe("#FCB900");
      expect(colors.link).toBe("#0F77CC");
      expect(colors.linkHover).toBe("#0055FF");
      expect(colors.linkActive).toBe("#002942");
      expect(colors.textDark).toBe("#212121");
      expect(colors.textLight).toBe("#FFFFFF");
      expect(colors.textMedium).toBe("#979797");
      expect(colors.error).toBe("#CF2E2E");
      expect(colors.border).toBe("#E0E0E0");
      expect(colors.borderInput).toBe("#BDBDBD");
    });

    it("exposes the badge palette from the design file", () => {
      expect(colors.badgeSuccessBg).toBe("#E8F5E9");
      expect(colors.badgeSuccessText).toBe("#2E7D32");
      expect(colors.badgeWarningBg).toBe("#FFF3E0");
      expect(colors.badgeWarningText).toBe("#F57C00");
      expect(colors.badgeErrorBg).toBe("#FFEBEE");
      expect(colors.badgeErrorText).toBe("#CF2E2E");
    });
  });

  describe("radius scale", () => {
    it("uses the design file's exclusive radius scale", () => {
      expect(radius.button).toBe(8);
      expect(radius.featureCard).toBe(16);
      expect(radius.card).toBe(24);
      expect(radius.pill).toBe(100);
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
    it("exposes the four elevation levels plus the focus glow", () => {
      expect(shadow.level1).toBe("0px 2px 8px rgba(0, 0, 0, 0.08)");
      expect(shadow.level2).toBe("0px 4px 16px rgba(0, 0, 0, 0.12)");
      expect(shadow.level3).toBe("0px 8px 24px rgba(0, 0, 0, 0.16)");
      expect(shadow.level4).toBe("0px 12px 32px rgba(0, 0, 0, 0.2)");
      expect(shadow.focusGlow).toBe("0px 0px 12px rgba(15, 119, 204, 0.2)");
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
      "navyBase",
      "navyDeep",
      "navyDark",
      "surface",
      "surfaceTint",
      "infoTint",
      "ctaPrimary",
      "link",
      "textDark",
      "textLight",
      "error",
    ];
    for (const key of required) {
      const varName = (cssVarName as Record<string, string>)[`bg${key.charAt(0).toUpperCase() + key.slice(1)}`]
        ?? (cssVarName as Record<string, string>)[key.charAt(0).toLowerCase() + key.slice(1)];
      expect(varName, `missing CSS var for color token "${key}"`).toBeTruthy();
    }
  });

  it("emits a :root block via buildCssVarsString()", () => {
    const str = buildCssVarsString();
    expect(str).toMatch(/^:root \{/);
    expect(str).toMatch(/--color-cta-primary: #FF9B24;/);
    expect(str).toMatch(/--color-link: #0F77CC;/);
    expect(str).toMatch(/\}$/);
  });

  it("all cssVar entries resolve to non-empty strings", () => {
    for (const [k, v] of Object.entries(cssVars)) {
      expect(v, `${k} should have a value`).toBeTruthy();
    }
  });
});
