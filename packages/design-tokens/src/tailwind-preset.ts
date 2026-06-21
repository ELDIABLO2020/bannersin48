/**
 * Tailwind CSS preset derived from design tokens.
 * Consumed by frontend/tailwind.config.ts.
 *
 * HCP palette: semantic utility names point at the Housecall Pro color system.
 * Legacy utility names (`bg-navy-base`, `bg-info-tint`, etc.) are preserved
 */

import type { Config } from "tailwindcss";
import { colors, radius, shadow, spacing, breakpoints, typography } from "./tokens";

const FONT_DISPLAY = typography.fontFamily.display;
const FONT_BODY = typography.fontFamily.body;
const FONT_INPUT = typography.fontFamily.input;

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // ── HCP backgrounds ───────────────────────────────────────────────
        lightest: colors.lightest,
        light: colors.light,
        "soft-accent": colors.softAccent,
        "soft-accent-2": colors.softAccent2,
        darkest: colors.darkest,

        // Strong accent (HCP gold)
        "strong-accent": {
          DEFAULT: colors.strongAccent,
          hover: colors.strongAccentHover,
          active: colors.strongAccentActive,
          fg: colors.strongAccentText,
        },
        cta: {
          DEFAULT: colors.ctaPrimary,
          hover: colors.ctaAccent,
          active: colors.ctaActive,
          fg: colors.ctaText,
        },

        // Legacy background utilities — aliases for downstream components.
        "navy-base": colors.navyBase,
        "navy-deep": colors.navyDeep,
        "navy-dark": colors.navyDark,
        "navy-darkest": colors.navyDarkest,
        "navy-mid": colors.navyMid,
        "gold-tint": colors.goldTint,
        "border-on-dark": colors.borderOnDark,
        surface: colors.surface,
        "surface-tint": colors.surfaceTint,
        "surface-very-light": colors.surfaceVeryLight,
        "info-tint": colors.infoTint,
        black: colors.black,

        // Links — HCP blue
        link: {
          DEFAULT: colors.link,
          hover: colors.linkHover,
          active: colors.linkActive,
        },

        // Ink (text colors)
        ink: {
          DEFAULT: colors.textDark,
          charcoal: colors.textCharcoal,
          muted: colors.textMedium,
          light: colors.textLight,
        },
        dark: {
          DEFAULT: colors.dark,
          muted: colors.darkMuted,
        },
        muted: colors.muted,

        // Lines & dividers
        line: {
          DEFAULT: colors.border,
          subtle: colors.borderSubtle,
          input: colors.borderInput,
          divider: colors.divider,
        },

        // Status
        danger: colors.error,
        error: colors.error,
        warning: colors.warning,
        success: {
          DEFAULT: colors.success,
          bg: colors.badgeSuccessBg,
          fg: colors.badgeSuccessText,
        },
        "badge-error": { bg: colors.badgeErrorBg, fg: colors.badgeErrorText },
        "badge-warning": { bg: colors.badgeWarningBg, fg: colors.badgeWarningText },

        // Badges (legacy nested shapes used by `bg-warning-bg` etc.)
        "warning-bg": colors.badgeWarningBg,
        "warning-fg": colors.badgeWarningText,

        // Tab bar (legacy)
        "tab-bar": shadow.tabBarBorder,
      },
      fontFamily: {
        display: [...FONT_DISPLAY],
        body: [...FONT_BODY],
        input: [...FONT_INPUT],
        sans: [...FONT_BODY],
      },
      fontSize: {
        "hero-h1": [`${typography.fontSize.heroH1}px`, { lineHeight: `${typography.lineHeight.heroH1}px`, letterSpacing: typography.letterSpacing.tighter }],
        "section-h2": [`${typography.fontSize.sectionH2}px`, { lineHeight: `${typography.lineHeight.sectionH2}px`, letterSpacing: typography.letterSpacing.tight }],
        "heading-h4": [`${typography.fontSize.headingH4}px`, { lineHeight: `${typography.lineHeight.headingH4}px` }],
        "heading-h5": [`${typography.fontSize.headingH5}px`, { lineHeight: `${typography.lineHeight.headingH5}px` }],
        body: [`${typography.fontSize.body}px`, { lineHeight: `${typography.lineHeight.body}px` }],
        "body-sm": [`${typography.fontSize.bodySmall}px`, { lineHeight: `${typography.lineHeight.bodySmall}px` }],
        input: [`${typography.fontSize.input}px`, { lineHeight: `${typography.lineHeight.input}px` }],
        "list-item": [`${typography.fontSize.listItem}px`, { lineHeight: `${typography.lineHeight.listItem}px` }],
      },
      letterSpacing: {
        tight: typography.letterSpacing.tight,
        tighter: typography.letterSpacing.tighter,
        wide: typography.letterSpacing.wide,
        widest: typography.letterSpacing.widest,
      },
      borderRadius: {
        none: `${radius.none}px`,
        sm: `${radius.sm}px`,
        modal: `${radius.modal}px`,
        btn: `${radius.button}px`,
        feature: `${radius.featureCard}px`,
        card: `${radius.card}px`,
        pill: `${radius.pill}px`,
        "l-pill": `${radius.pill}px 0 0 ${radius.pill}px`,
        "r-pill": `0 ${radius.pill}px ${radius.pill}px 0`,
      },
      boxShadow: {
        nav: shadow.nav,
        "elev-1": shadow.level1,
        "elev-2": shadow.level2,
        "elev-3": shadow.level3,
        "elev-4": shadow.level4,
        focus: shadow.focusGlow,
        "focus-sm": shadow.focusGlowSmall,
      },
      spacing: {
        micro: `${spacing.micro}px`,
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        "md-lg": `${spacing.mdLg}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        "2xl": `${spacing["2xl"]}px`,
        "3xl": `${spacing["3xl"]}px`,
        "4xl": `${spacing["4xl"]}px`,
        "5xl": `${spacing["5xl"]}px`,
      },
      screens: {
        mobile: `${breakpoints.mobile}px`,
        tablet: `${breakpoints.tablet}px`,
        desktop: `${breakpoints.desktop}px`,
        "desktop-lg": `${breakpoints.desktopLg}px`,
      },
      maxWidth: {
        content: "1200px",
        hero: "1440px",
      },
      gridTemplateColumns: {
        desktop: "repeat(12, minmax(0, 1fr))",
        tablet: "repeat(8, minmax(0, 1fr))",
        mobile: "repeat(4, minmax(0, 1fr))",
      },
      gridGap: {
        desktop: "40px",
        tablet: "24px",
        mobile: "16px",
      },
      zIndex: {
        "tab-bar": "var(--z-tab-bar)",
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        "modal-backdrop": "var(--z-modal-backdrop)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        tooltip: "var(--z-tooltip)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slide-up 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
