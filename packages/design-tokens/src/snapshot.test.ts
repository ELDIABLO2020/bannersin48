import { describe, it, expect } from "vitest";
import { colors, radius, spacing, shadow, breakpoints, container, zIndex } from "./tokens";
import { cssVars, cssVarName, buildCssVarsString } from "./cssVars";

describe("design tokens — HCP design compliance", () => {
  describe("colors", () => {
    it("uses the HCP-inspired palette", () => {
      expect(colors.lightest).toBe("#FFFFFF");
      expect(colors.light).toBe("#F8F9FA");
      expect(colors.softAccent).toBe("#eef1f3");
      expect(colors.softAccent2).toBe("#f5f7f8");
      expect(colors.darkest).toBe("#002a42");

      expect(colors.strongAccent).toBe("#fbbf21");
      expect(colors.strongAccentHover).toBe("#e5a91a");
      expect(colors.strongAccentActive).toBe("#c99212");
      expect(colors.strongAccentText).toBe("#131b1f");

      expect(colors.ctaPrimary).toBe("#fbbf21");
      expect(colors.ctaAccent).toBe("#e5a91a");
      expect(colors.ctaActive).toBe("#c99212");
      expect(colors.ctaText).toBe("#131b1f");

      expect(colors.dark).toBe("#43423e");
      expect(colors.darkMuted).toBe("#5f6b7a");
      expect(colors.textDark).toBe("#43423e");
      expect(colors.textLight).toBe("#FFFFFF");
      expect(colors.textMedium).toBe("#5f6b7a");

      expect(colors.border).toBe("#b0bfbc");
      expect(colors.borderInput).toBe("#b0bfbc");
      expect(colors.divider).toBe("#b0bfbc");

      expect(colors.success).toBe("#00B545");
      expect(colors.warning).toBe("#F5A623");
      expect(colors.error).toBe("#E5484D");
    });

    it("exposes badge palette", () => {
      expect(colors.badgeSuccessBg).toBe("#E8F5E9");
      expect(colors.badgeSuccessText).toBe("#007A2E");
      expect(colors.badgeWarningBg).toBe("#FFF6E6");
      expect(colors.badgeWarningText).toBe("#B26A00");
      expect(colors.badgeErrorBg).toBe("#FEECEC");
      expect(colors.badgeErrorText).toBe("#C72530");
    });

    it("exposes timeline markers", () => {
      expect(colors.timelineDone).toBe("#00B545");
      expect(colors.timelineCurrent).toBe("#fbbf21");
      expect(colors.timelineCurrentRing).toBe("#fef3c7");
      expect(colors.timelinePending).toBe("#b0bfbc");
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
    it("exposes elevation levels plus gold focus glow", () => {
      expect(shadow.level1).toBe("0 1px 2px rgba(16, 24, 40, 0.05)");
      expect(shadow.level2).toBe("0 4px 12px rgba(16, 24, 40, 0.08)");
      expect(shadow.level3).toBe("0 8px 24px rgba(16, 24, 40, 0.12)");
      expect(shadow.level4).toBe("0 16px 40px rgba(16, 24, 40, 0.16)");
      expect(shadow.focusGlow).toBe("0 0 0 4px rgba(251, 191, 33, 0.2)");
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
    expect(str).toMatch(/--color-cta-primary: #fbbf21;/);
    expect(str).toMatch(/--color-strong-accent: #fbbf21;/);
    expect(str).toMatch(/--color-bg-soft-accent: #eef1f3;/);
    expect(str).toMatch(/--color-bg-darkest: #002a42;/);
    expect(str).toMatch(/\}$/);
  });

  it("all cssVar entries resolve to non-empty strings", () => {
    for (const [k, v] of Object.entries(cssVars)) {
      expect(v, `${k} should have a value`).toBeTruthy();
    }
  });
});
