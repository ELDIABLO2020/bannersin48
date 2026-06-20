import { describe, it, expect } from "vitest";
import { colors, radius, spacing, shadow, breakpoints, container, zIndex } from "./tokens";
import { cssVars, cssVarName, buildCssVarsString } from "./cssVars";

describe("design tokens — HCP design compliance", () => {
  describe("colors", () => {
    it("uses the live HCP palette (audited Jun 2026)", () => {
      expect(colors.lightest).toBe("#FFFFFF");
      expect(colors.light).toBe("#F5F5F5");
      expect(colors.softAccent).toBe("#ECEFF1");
      expect(colors.softAccent2).toBe("#F5F5F5");
      expect(colors.infoTint).toBe("#DEF0FF");
      expect(colors.darkest).toBe("#13191E");

      expect(colors.strongAccent).toBe("#FF9B24");
      expect(colors.strongAccentHover).toBe("#FFB706");
      expect(colors.strongAccentActive).toBe("#FCB900");
      expect(colors.strongAccentText).toBe("#13191E");

      expect(colors.ctaPrimary).toBe("#FF9B24");
      expect(colors.ctaAccent).toBe("#FFB706");
      expect(colors.ctaActive).toBe("#FCB900");
      expect(colors.ctaText).toBe("#13191E");

      expect(colors.link).toBe("#0F77CC");
      expect(colors.linkHover).toBe("#0055FF");
      expect(colors.linkActive).toBe("#002942");

      expect(colors.navyBase).toBe("#13191E");
      expect(colors.navyDeep).toBe("#002942");
      expect(colors.navyDark).toBe("#0E2634");
      expect(colors.navyMid).toBe("#0E2634");
      expect(colors.goldTint).toBe("#FFF3E0");
      expect(colors.borderOnDark).toBe("rgba(255,255,255,0.15)");

      expect(colors.dark).toBe("#212121");
      expect(colors.darkMuted).toBe("#979797");
      expect(colors.textDark).toBe("#212121");
      expect(colors.textLight).toBe("#FFFFFF");
      expect(colors.textMedium).toBe("#979797");

      expect(colors.border).toBe("#BDBDBD");
      expect(colors.borderSubtle).toBe("#E0E0E0");
      expect(colors.borderInput).toBe("#E0E0E0");
      expect(colors.divider).toBe("#BDBDBD");

      expect(colors.success).toBe("#00B545");
      expect(colors.warning).toBe("#F57C00");
      expect(colors.error).toBe("#CF2E2E");
    });

    it("exposes badge palette", () => {
      expect(colors.badgeSuccessBg).toBe("#E8F5E9");
      expect(colors.badgeSuccessText).toBe("#2E7D32");
      expect(colors.badgeWarningBg).toBe("#FFF3E0");
      expect(colors.badgeWarningText).toBe("#F57C00");
      expect(colors.badgeErrorBg).toBe("#FFEBEE");
      expect(colors.badgeErrorText).toBe("#CF2E2E");
    });

    it("exposes timeline markers", () => {
      expect(colors.timelineDone).toBe("#0F77CC");
      expect(colors.timelineCurrent).toBe("#0F77CC");
      expect(colors.timelineCurrentRing).toBe("#DEF0FF");
      expect(colors.timelinePending).toBe("#BDBDBD");
    });
  });

  describe("radius scale", () => {
    it("uses HCP-inspired radius scale", () => {
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
    it("exposes elevation levels plus blue focus glow", () => {
      expect(shadow.level1).toBe("0 1px 2px rgba(16, 24, 40, 0.05)");
      expect(shadow.level2).toBe("0 4px 12px rgba(16, 24, 40, 0.08)");
      expect(shadow.level3).toBe("0 8px 24px rgba(16, 24, 40, 0.12)");
      expect(shadow.level4).toBe("0 16px 40px rgba(16, 24, 40, 0.16)");
      expect(shadow.focusGlow).toBe("0 0 0 4px rgba(15, 119, 204, 0.2)");
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
      "navyMid",
      "goldTint",
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

  it("emits a :root block via buildCssVarsString()", () => {
    const str = buildCssVarsString();
    expect(str).toMatch(/^:root \{/);
    expect(str).toMatch(/--color-cta-primary: #FF9B24;/);
    expect(str).toMatch(/--color-strong-accent: #FF9B24;/);
    expect(str).toMatch(/--color-bg-soft-accent: #ECEFF1;/);
    expect(str).toMatch(/--color-bg-darkest: #13191E;/);
    expect(str).toMatch(/--color-link: #0F77CC;/);
    expect(str).toMatch(/\}$/);
  });

  it("all cssVar entries resolve to non-empty strings", () => {
    for (const [k, v] of Object.entries(cssVars)) {
      expect(v, `${k} should have a value`).toBeTruthy();
    }
  });
});
