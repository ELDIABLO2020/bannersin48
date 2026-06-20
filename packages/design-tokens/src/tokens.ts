/**
 * Banners In 48 design tokens.
 *
 * Transcribed from www.housecallpro.com-DESIGN.md (Housecall Pro design system):
 *  - Navy base #13191E, deep navy #002942, dark navy #0E2634, darkest #0A2443
 *  - CTA gold #FF9B24 (hover #FFB706, active #FCB900), text on gold #13191E
 *  - Link/interactive blue #0F77CC (hover #0055FF, active #002942)
 *  - Info tint #DEF0FF, neutrals #212121 / #979797 / #ECEFF1 / #F5F5F5
 *  - Borders #BDBDBD (dividers), #E0E0E0 (inputs/cards)
 *
 * Components reference semantic names — never raw hex.
 */

export const colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────
  lightest: "#FFFFFF",
  light: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceTint: "#F5F5F5",
  surfaceVeryLight: "#ECEFF1",
  black: "#000000",

  softAccent: "#ECEFF1",
  softAccent2: "#F5F5F5",
  infoTint: "#DEF0FF",

  // ── Strong Accent (HCP gold) — CTAs, highlights ────────────────────────
  strongAccent: "#FF9B24",
  strongAccentHover: "#FFB706",
  strongAccentActive: "#FCB900",
  strongAccentText: "#13191E",

  ctaPrimary: "#FF9B24",
  ctaAccent: "#FFB706",
  ctaActive: "#FCB900",
  ctaText: "#13191E",

  // ── Interactive (links) — HCP blue ─────────────────────────────────────
  link: "#0F77CC",
  linkHover: "#0055FF",
  linkActive: "#002942",
  linkElectric: "#0055FF",

  // ── Dark text & footer backgrounds ─────────────────────────────────────
  dark: "#212121",
  darkMuted: "#979797",
  darkest: "#13191E",

  textDark: "#212121",
  textCharcoal: "#13181A",
  textLight: "#FFFFFF",
  textMedium: "#979797",
  textOnDark: "#FFFFFF",
  textOnAccent: "#13191E",
  muted: "#979797",

  navyBase: "#13191E",
  navyDeep: "#002942",
  navyDark: "#0E2634",
  navyDarkest: "#0A2443",
  navyMid: "#0E2634",

  goldTint: "#FFF3E0",
  borderOnDark: "rgba(255,255,255,0.15)",

  // ── Borders & dividers ─────────────────────────────────────────────────
  border: "#BDBDBD",
  borderSubtle: "#E0E0E0",
  borderInput: "#E0E0E0",
  divider: "#BDBDBD",

  // ── Semantic / status (NOT brand accent — never use for CTAs or nav) ───
  // success / badgeSuccess* are validation & order-status only (#00B545 ≠ strongAccent).
  success: "#00B545",
  warning: "#F57C00",
  error: "#CF2E2E",

  badgeSuccessBg: "#E8F5E9",
  badgeSuccessText: "#2E7D32",
  badgeWarningBg: "#FFF3E0",
  badgeWarningText: "#F57C00",
  badgeErrorBg: "#FFEBEE",
  badgeErrorText: "#CF2E2E",

  // ── Timeline markers ───────────────────────────────────────────────────
  timelineDone: "#0F77CC",
  timelineCurrent: "#0F77CC",
  timelineCurrentRing: "#DEF0FF",
  timelinePending: "#BDBDBD",
} as const;

export const typography = {
  fontFamily: {
    display: ['"Inter"', "system-ui", "sans-serif"],
    body: ['"Inter"', "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
    input: ['"Inter"', "system-ui", "sans-serif"],
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  fontSize: {
    heroH1: 64,
    sectionH2: 48,
    headingH4: 20,
    headingH5: 16,
    body: 16,
    bodySmall: 13,
    input: 14,
    listItem: 18,
  },
  lineHeight: {
    heroH1: 64,
    sectionH2: 56,
    headingH4: 28,
    headingH5: 24,
    body: 28,
    bodySmall: 20,
    input: 22,
    listItem: 28,
  },
  letterSpacing: {
    tight: "-0.02em",
    tighter: "-0.03em",
    normal: "0",
    wide: "0.04em",
    widest: "0.08em",
  },
} as const;

export const radius = {
  none: 0,
  sm: 6,
  modal: 8,
  button: 10,
  featureCard: 16,
  card: 16,
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
  none: "none",
  level1: "0 1px 2px rgba(16, 24, 40, 0.05)",
  nav: "0 1px 0 rgba(16, 24, 40, 0.06)",
  level2: "0 4px 12px rgba(16, 24, 40, 0.08)",
  level3: "0 8px 24px rgba(16, 24, 40, 0.12)",
  level4: "0 16px 40px rgba(16, 24, 40, 0.16)",
  focusGlow: "0 0 0 4px rgba(15, 119, 204, 0.2)",
  focusGlowSmall: "0 0 0 3px rgba(15, 119, 204, 0.16)",
  tabBarBorder: "rgba(255, 255, 255, 0.15)",
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
  fast: "180ms",
  base: "240ms",
  slow: "360ms",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
