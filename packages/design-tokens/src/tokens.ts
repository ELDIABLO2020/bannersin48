/**
 * Banners In 48 design tokens.
 *
 * Source of truth: www.housecallpro.com-DESIGN.md (transcribed once).
 * Components must reference these semantic names — never raw hex.
 */

export const colors = {
  // Backgrounds
  navyBase: "#13191E",
  navyDeep: "#002942",
  navyDark: "#0E2634",
  navyDarkest: "#0A2443",
  surface: "#FFFFFF",
  surfaceTint: "#F5F5F5",
  surfaceVeryLight: "#ECEFF1",
  infoTint: "#DEF0FF",
  black: "#000000",

  // CTA (gold, conversion only)
  ctaPrimary: "#FF9B24",
  ctaAccent: "#FFB706",
  ctaActive: "#FCB900",
  ctaText: "#13191E",

  // Interactive (links, secondary)
  link: "#0F77CC",
  linkHover: "#0055FF",
  linkActive: "#002942",

  // Text
  textDark: "#212121",
  textCharcoal: "#13181A",
  textLight: "#FFFFFF",
  textMedium: "#979797",
  textOnDark: "#FFFFFF",

  // Borders & dividers
  border: "#E0E0E0",
  borderInput: "#BDBDBD",
  divider: "#BDBDBD",

  // Semantic / status
  error: "#CF2E2E",

  // Badges
  badgeSuccessBg: "#E8F5E9",
  badgeSuccessText: "#2E7D32",
  badgeWarningBg: "#FFF3E0",
  badgeWarningText: "#F57C00",
  badgeErrorBg: "#FFEBEE",
  badgeErrorText: "#CF2E2E",

  // Timeline markers
  timelineDone: "#0F77CC",
  timelineCurrent: "#0F77CC",
  timelineCurrentRing: "#DEF0FF",
  timelinePending: "#BDBDBD",
} as const;


export const typography = {
  fontFamily: {
    display: ['"Headline Gothic ATF"', '"Headline Gothic ATF Rough No. 1"', '"Archivo Black"', "Georgia", "serif"],
    body: ['"Open Sans"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
    input: ['"Plus Jakarta Sans"', '"Inter"', "sans-serif"],
  },
  fontWeight: {
    regular: 400,
    bold: 700,
  },
  // Desktop sizes per the design file §3
  fontSize: {
    heroH1: 83,
    sectionH2: 68,
    headingH4: 18,
    headingH5: 14,
    body: 16,
    bodySmall: 11,
    input: 12,
    listItem: 18,
  },
  lineHeight: {
    heroH1: 85,
    sectionH2: 68,
    headingH4: 27,
    headingH5: 24,
    body: 24,
    bodySmall: 18,
    input: 18,
    listItem: 27,
  },
  letterSpacing: {
    tight: "0px",
  },
} as const;

export const radius = {
  none: 0,
  modal: 4,
  button: 8,
  featureCard: 16,
  card: 24,
  pill: 100,
} as const;

export const spacing = {
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
  "5xl": 196,
} as const;

export const shadow = {
  // Never applied to full-width sections; one level per element
  none: "none",
  level1: "0px 2px 8px rgba(0, 0, 0, 0.08)",      // standard cards, input fields
  nav: "0px 1px 3px rgba(0, 0, 0, 0.08)",         // top nav
  level2: "0px 4px 16px rgba(0, 0, 0, 0.12)",     // feature cards, modals
  level3: "0px 8px 24px rgba(0, 0, 0, 0.16)",     // modals, dropdowns
  level4: "0px 12px 32px rgba(0, 0, 0, 0.2)",     // tooltips, popovers
  // Input focus glow
  focusGlow: "0px 0px 12px rgba(15, 119, 204, 0.2)",
  focusGlowSmall: "0px 0px 8px rgba(15, 119, 204, 0.16)",
  // Tab bar
  tabBarBorder: "rgba(255, 255, 255, 0.08)",
} as const;

export const breakpoints = {
  mobile: 320,
  mobileMax: 599,
  tablet: 600,
  tabletMax: 1023,
  desktop: 1024,
  desktopLg: 1400,
} as const;

export const container = {
  contentMax: 1200,
  heroMax: 1440,
} as const;

export const grid = {
  desktop: { cols: 12, gutter: 40 },
  tablet: { cols: 8, gutter: 24 },
  mobile: { cols: 4, gutter: 16 },
} as const;

export const touch = {
  minSize: 44,
  iconButton: 48,
  inputMobile: 40,
  inputDesktop: 54,
  inputDesktopLg: 56,
  minGap: 16,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  tabBar: 40,
  dropdown: 50,
  sticky: 60,
  modalBackdrop: 80,
  modal: 90,
  toast: 100,
  tooltip: 110,
} as const;

export const motion = {
  fast: "150ms",
  base: "200ms",
  slow: "300ms",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
