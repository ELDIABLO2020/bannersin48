/**
 * CSS custom property names for the design tokens.
 * The root layout writes these to :root via a style tag.
 */

import { colors, radius, shadow, spacing, breakpoints, container, zIndex } from "./tokens";

export const cssVarName = {
  // Backgrounds
  bgNavyBase: "--color-bg-navy-base",
  bgNavyDeep: "--color-bg-navy-deep",
  bgNavyDark: "--color-bg-navy-dark",
  bgNavyDarkest: "--color-bg-navy-darkest",
  bgSurface: "--color-bg-surface",
  bgSurfaceTint: "--color-bg-surface-tint",
  bgSurfaceVeryLight: "--color-bg-surface-very-light",
  bgInfoTint: "--color-bg-info-tint",
  bgBlack: "--color-bg-black",

  // CTA
  ctaPrimary: "--color-cta-primary",
  ctaAccent: "--color-cta-accent",
  ctaActive: "--color-cta-active",
  ctaText: "--color-cta-text",

  // Link
  link: "--color-link",
  linkHover: "--color-link-hover",
  linkActive: "--color-link-active",

  // Text
  textDark: "--color-text-dark",
  textCharcoal: "--color-text-charcoal",
  textLight: "--color-text-light",
  textMedium: "--color-text-medium",

  // Borders
  border: "--color-border",
  borderInput: "--color-border-input",
  divider: "--color-divider",

  // Error
  error: "--color-error",

  // Badges
  badgeSuccessBg: "--color-badge-success-bg",
  badgeSuccessText: "--color-badge-success-text",
  badgeWarningBg: "--color-badge-warning-bg",
  badgeWarningText: "--color-badge-warning-text",
  badgeErrorBg: "--color-badge-error-bg",
  badgeErrorText: "--color-badge-error-text",

  // Radius
  radiusNone: "--radius-none",
  radiusModal: "--radius-modal",
  radiusButton: "--radius-button",
  radiusFeature: "--radius-feature",
  radiusCard: "--radius-card",
  radiusPill: "--radius-pill",

  // Shadows
  shadowNav: "--shadow-nav",
  shadowL1: "--shadow-level-1",
  shadowL2: "--shadow-level-2",
  shadowL3: "--shadow-level-3",
  shadowL4: "--shadow-level-4",
  shadowFocus: "--shadow-focus",
  shadowFocusSmall: "--shadow-focus-small",

  // Spacing
  spaceMicro: "--space-micro",
  spaceXs: "--space-xs",
  spaceSm: "--space-sm",
  spaceMd: "--space-md",
  spaceMdLg: "--space-md-lg",
  spaceLg: "--space-lg",
  spaceXl: "--space-xl",
  space2xl: "--space-2xl",
  space3xl: "--space-3xl",
  space4xl: "--space-4xl",

  // Containers
  containerContent: "--container-content",
  containerHero: "--container-hero",

  // Breakpoints (read via media queries, but expose for JS)
  bpMobile: "--bp-mobile",
  bpTablet: "--bp-tablet",
  bpDesktop: "--bp-desktop",
  bpDesktopLg: "--bp-desktop-lg",

  // Z-index
  zTabBar: "--z-tab-bar",
  zDropdown: "--z-dropdown",
  zSticky: "--z-sticky",
  zModalBackdrop: "--z-modal-backdrop",
  zModal: "--z-modal",
  zToast: "--z-toast",
  zTooltip: "--z-tooltip",
} as const;

export const cssVars: Record<string, string> = {
  [cssVarName.bgNavyBase]: colors.navyBase,
  [cssVarName.bgNavyDeep]: colors.navyDeep,
  [cssVarName.bgNavyDark]: colors.navyDark,
  [cssVarName.bgNavyDarkest]: colors.navyDarkest,
  [cssVarName.bgSurface]: colors.surface,
  [cssVarName.bgSurfaceTint]: colors.surfaceTint,
  [cssVarName.bgSurfaceVeryLight]: colors.surfaceVeryLight,
  [cssVarName.bgInfoTint]: colors.infoTint,
  [cssVarName.bgBlack]: colors.black,

  [cssVarName.ctaPrimary]: colors.ctaPrimary,
  [cssVarName.ctaAccent]: colors.ctaAccent,
  [cssVarName.ctaActive]: colors.ctaActive,
  [cssVarName.ctaText]: colors.ctaText,

  [cssVarName.link]: colors.link,
  [cssVarName.linkHover]: colors.linkHover,
  [cssVarName.linkActive]: colors.linkActive,

  [cssVarName.textDark]: colors.textDark,
  [cssVarName.textCharcoal]: colors.textCharcoal,
  [cssVarName.textLight]: colors.textLight,
  [cssVarName.textMedium]: colors.textMedium,

  [cssVarName.border]: colors.border,
  [cssVarName.borderInput]: colors.borderInput,
  [cssVarName.divider]: colors.divider,

  [cssVarName.error]: colors.error,

  [cssVarName.badgeSuccessBg]: colors.badgeSuccessBg,
  [cssVarName.badgeSuccessText]: colors.badgeSuccessText,
  [cssVarName.badgeWarningBg]: colors.badgeWarningBg,
  [cssVarName.badgeWarningText]: colors.badgeWarningText,
  [cssVarName.badgeErrorBg]: colors.badgeErrorBg,
  [cssVarName.badgeErrorText]: colors.badgeErrorText,

  [cssVarName.radiusNone]: `${radius.none}px`,
  [cssVarName.radiusModal]: `${radius.modal}px`,
  [cssVarName.radiusButton]: `${radius.button}px`,
  [cssVarName.radiusFeature]: `${radius.featureCard}px`,
  [cssVarName.radiusCard]: `${radius.card}px`,
  [cssVarName.radiusPill]: `${radius.pill}px`,

  [cssVarName.shadowNav]: shadow.nav,
  [cssVarName.shadowL1]: shadow.level1,
  [cssVarName.shadowL2]: shadow.level2,
  [cssVarName.shadowL3]: shadow.level3,
  [cssVarName.shadowL4]: shadow.level4,
  [cssVarName.shadowFocus]: shadow.focusGlow,
  [cssVarName.shadowFocusSmall]: shadow.focusGlowSmall,

  [cssVarName.spaceMicro]: `${spacing.micro}px`,
  [cssVarName.spaceXs]: `${spacing.xs}px`,
  [cssVarName.spaceSm]: `${spacing.sm}px`,
  [cssVarName.spaceMd]: `${spacing.md}px`,
  [cssVarName.spaceMdLg]: `${spacing.mdLg}px`,
  [cssVarName.spaceLg]: `${spacing.lg}px`,
  [cssVarName.spaceXl]: `${spacing.xl}px`,
  [cssVarName.space2xl]: `${spacing["2xl"]}px`,
  [cssVarName.space3xl]: `${spacing["3xl"]}px`,
  [cssVarName.space4xl]: `${spacing["4xl"]}px`,

  [cssVarName.containerContent]: `${container.contentMax}px`,
  [cssVarName.containerHero]: `${container.heroMax}px`,

  [cssVarName.bpMobile]: `${breakpoints.mobile}px`,
  [cssVarName.bpTablet]: `${breakpoints.tablet}px`,
  [cssVarName.bpDesktop]: `${breakpoints.desktop}px`,
  [cssVarName.bpDesktopLg]: `${breakpoints.desktopLg}px`,

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
