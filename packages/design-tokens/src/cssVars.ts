/**
 * CSS custom property names for the design tokens.
 * Synced into the :root block of frontend/app/globals.css by
 * scripts/sync-globals-css.ts.
 *
 * Every semantic role is exposed as a CSS variable so components can read
 * them at runtime (e.g. inline styles for the floating countdown island
 * and StatusHeroCard).
 */

import { colors, radius, zIndex } from "./tokens";

export const cssVarName = {
  // ── Backgrounds ────────────────────────────────────────────────────────
  bgLightest: "--color-bg-lightest",
  bgLight: "--color-bg-light",
  bgSoftAccent: "--color-bg-soft-accent",
  bgSoftAccent2: "--color-bg-soft-accent-2",
  bgStrongAccent: "--color-bg-strong-accent",
  bgDarkest: "--color-bg-darkest",

  // ── Dark surfaces ──────────────────────────────────────────────────────
  bgInkBlack: "--color-bg-ink-black",
  bgSurfaceDark: "--color-bg-surface-dark",
  bgSurfaceDarkRaised: "--color-bg-surface-dark-raised",

  bgSurface: "--color-bg-surface",
  bgSurfaceTint: "--color-bg-surface-tint",
  bgSurfaceVeryLight: "--color-bg-surface-very-light",
  bgInfoTint: "--color-bg-info-tint",
  bgBlack: "--color-bg-black",
  bgAccentTint: "--color-bg-accent-tint",

  // ── Strong Accent (CTA) ────────────────────────────────────────────────
  strongAccent: "--color-strong-accent",
  strongAccentHover: "--color-strong-accent-hover",
  strongAccentActive: "--color-strong-accent-active",
  strongAccentText: "--color-strong-accent-text",
  strongAccentOnDark: "--color-strong-accent-on-dark",

  // CTA role
  ctaPrimary: "--color-cta-primary",
  ctaAccent: "--color-cta-accent",
  ctaActive: "--color-cta-active",
  ctaText: "--color-cta-text",

  // ── Secondary Accent (brand green) ─────────────────────────────────────
  brandGreen: "--color-brand-green",
  brandGreenHover: "--color-brand-green-hover",
  greenText: "--color-green-text",

  // ── Link ───────────────────────────────────────────────────────────────
  link: "--color-link",
  linkHover: "--color-link-hover",
  linkActive: "--color-link-active",

  // ── Text ───────────────────────────────────────────────────────────────
  textDark: "--color-text-dark",
  textCharcoal: "--color-text-charcoal",
  textLight: "--color-text-light",
  textMedium: "--color-text-medium",
  textOnAccent: "--color-text-on-accent",
  textDisabled: "--color-text-disabled",
  dark: "--color-dark",
  darkMuted: "--color-dark-muted",
  muted: "--color-muted",

  // ── Borders ────────────────────────────────────────────────────────────
  border: "--color-border",
  borderSubtle: "--color-border-subtle",
  borderInput: "--color-border-input",
  divider: "--color-divider",
  borderOnDark: "--color-border-on-dark",

  // ── Status ─────────────────────────────────────────────────────────────
  success: "--color-success",
  warning: "--color-warning",
  error: "--color-error",

  // ── Badges ─────────────────────────────────────────────────────────────
  badgeSuccessBg: "--color-badge-success-bg",
  badgeSuccessText: "--color-badge-success-text",
  badgeWarningBg: "--color-badge-warning-bg",
  badgeWarningText: "--color-badge-warning-text",
  badgeErrorBg: "--color-badge-error-bg",
  badgeErrorText: "--color-badge-error-text",

  // ── Radius ─────────────────────────────────────────────────────────────
  radiusButton: "--radius-button",

  // ── Z-index ────────────────────────────────────────────────────────────
  zTabBar: "--z-tab-bar",
  zDropdown: "--z-dropdown",
  zSticky: "--z-sticky",
  zModalBackdrop: "--z-modal-backdrop",
  zModal: "--z-modal",
  zToast: "--z-toast",
  zTooltip: "--z-tooltip",
} as const;

export const cssVars: Record<string, string> = {
  // Backgrounds
  [cssVarName.bgLightest]: colors.lightest,
  [cssVarName.bgLight]: colors.light,
  [cssVarName.bgSoftAccent]: colors.softAccent,
  [cssVarName.bgSoftAccent2]: colors.softAccent2,
  [cssVarName.bgStrongAccent]: colors.strongAccent,
  [cssVarName.bgDarkest]: colors.darkest,

  // Dark surfaces
  [cssVarName.bgInkBlack]: colors.inkBlack,
  [cssVarName.bgSurfaceDark]: colors.surfaceDark,
  [cssVarName.bgSurfaceDarkRaised]: colors.surfaceDarkRaised,

  [cssVarName.bgSurface]: colors.surface,
  [cssVarName.bgSurfaceTint]: colors.surfaceTint,
  [cssVarName.bgSurfaceVeryLight]: colors.surfaceVeryLight,
  [cssVarName.bgInfoTint]: colors.infoTint,
  [cssVarName.bgBlack]: colors.black,
  [cssVarName.bgAccentTint]: colors.accentTint,

  // Strong accent
  [cssVarName.strongAccent]: colors.strongAccent,
  [cssVarName.strongAccentHover]: colors.strongAccentHover,
  [cssVarName.strongAccentActive]: colors.strongAccentActive,
  [cssVarName.strongAccentText]: colors.strongAccentText,
  [cssVarName.strongAccentOnDark]: colors.strongAccentOnDark,

  // CTA role
  [cssVarName.ctaPrimary]: colors.ctaPrimary,
  [cssVarName.ctaAccent]: colors.ctaAccent,
  [cssVarName.ctaActive]: colors.ctaActive,
  [cssVarName.ctaText]: colors.ctaText,

  // Secondary accent
  [cssVarName.brandGreen]: colors.brandGreen,
  [cssVarName.brandGreenHover]: colors.brandGreenHover,
  [cssVarName.greenText]: colors.greenText,

  // Link
  [cssVarName.link]: colors.link,
  [cssVarName.linkHover]: colors.linkHover,
  [cssVarName.linkActive]: colors.linkActive,

  // Text
  [cssVarName.textDark]: colors.textDark,
  [cssVarName.textCharcoal]: colors.textCharcoal,
  [cssVarName.textLight]: colors.textLight,
  [cssVarName.textMedium]: colors.textMedium,
  [cssVarName.textOnAccent]: colors.textOnAccent,
  [cssVarName.textDisabled]: colors.disabledText,
  [cssVarName.dark]: colors.dark,
  [cssVarName.darkMuted]: colors.darkMuted,
  [cssVarName.muted]: colors.muted,

  // Borders
  [cssVarName.border]: colors.border,
  [cssVarName.borderSubtle]: colors.borderSubtle,
  [cssVarName.borderInput]: colors.borderInput,
  [cssVarName.divider]: colors.divider,
  [cssVarName.borderOnDark]: colors.borderOnDark,

  // Status
  [cssVarName.success]: colors.success,
  [cssVarName.warning]: colors.warning,
  [cssVarName.error]: colors.error,

  // Badges
  [cssVarName.badgeSuccessBg]: colors.badgeSuccessBg,
  [cssVarName.badgeSuccessText]: colors.badgeSuccessText,
  [cssVarName.badgeWarningBg]: colors.badgeWarningBg,
  [cssVarName.badgeWarningText]: colors.badgeWarningText,
  [cssVarName.badgeErrorBg]: colors.badgeErrorBg,
  [cssVarName.badgeErrorText]: colors.badgeErrorText,

  // Radius
  [cssVarName.radiusButton]: `${radius.button}px`,

  // Z-index
  [cssVarName.zTabBar]: `${zIndex.tabBar}`,
  [cssVarName.zDropdown]: `${zIndex.dropdown}`,
  [cssVarName.zSticky]: `${zIndex.sticky}`,
  [cssVarName.zModalBackdrop]: `${zIndex.modalBackdrop}`,
  [cssVarName.zModal]: `${zIndex.modal}`,
  [cssVarName.zToast]: `${zIndex.toast}`,
  [cssVarName.zTooltip]: `${zIndex.tooltip}`,
};

export function buildCssVarsString(): string {
  return `:root {\n${Object.entries(cssVars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}`;
}
