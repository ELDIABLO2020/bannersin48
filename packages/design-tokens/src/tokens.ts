/**
 * Banners In 48 design tokens.
 *
 * HCP-inspired design language:
 *  - Pure white + cool gray panels (#eef1f3)
 *  - Gold accent (#fbbf21) for CTAs with dark text on gold
 *  - Navy/charcoal (#002a42, #131b1f) for dark bands and links
 *  - Inter typography, sentence-case headlines, moderate rounding
 *  - Soft, low-opacity, layered shadows
 *
 * Components reference semantic names — never raw hex.
 */

export const colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────
  lightest: "#FFFFFF",
  light: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceTint: "#F8F9FA",
  surfaceVeryLight: "#F3F4F6",
  black: "#000000",

  // soft accents — cool gray washes (HCP panel surfaces)
  softAccent: "#eef1f3",
  softAccent2: "#f5f7f8",
  infoTint: "#f5f7f8",

  // ── Strong Accent (HCP gold) — CTAs, highlights ────────────────────────
  strongAccent: "#fbbf21",
  strongAccentHover: "#e5a91a",
  strongAccentActive: "#c99212",
  strongAccentText: "#131b1f",

  ctaPrimary: "#fbbf21",
  ctaAccent: "#e5a91a",
  ctaActive: "#c99212",
  ctaText: "#131b1f",

  // ── Interactive (links) — navy based ─────────────────────────────────
  link: "#002a42",
  linkHover: "#001a2e",
  linkActive: "#001220",

  // ── Dark text & footer backgrounds ─────────────────────────────────────
  dark: "#43423e",
  darkMuted: "#5f6b7a",
  darkest: "#002a42",

  textDark: "#43423e",
  textCharcoal: "#131b1f",
  textLight: "#FFFFFF",
  textMedium: "#5f6b7a",
  textOnDark: "#FFFFFF",
  textOnAccent: "#131b1f",
  muted: "#5f6b7a",

  navyBase: "#002a42",
  navyDeep: "#002a42",
  navyDark: "#131b1f",
  navyDarkest: "#002a42",

  // ── Borders & dividers ─────────────────────────────────────────────────
  border: "#b0bfbc",
  borderInput: "#b0bfbc",
  divider: "#b0bfbc",

  // ── Semantic / status (green reserved for success only) ──────────────
  success: "#00B545",
  warning: "#F5A623",
  error: "#E5484D",

  badgeSuccessBg: "#E8F5E9",
  badgeSuccessText: "#007A2E",
  badgeWarningBg: "#FFF6E6",
  badgeWarningText: "#B26A00",
  badgeErrorBg: "#FEECEC",
  badgeErrorText: "#C72530",

  // ── Timeline markers ───────────────────────────────────────────────────
  timelineDone: "#00B545",
  timelineCurrent: "#fbbf21",
  timelineCurrentRing: "#fef3c7",
  timelinePending: "#b0bfbc",
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
  focusGlow: "0 0 0 4px rgba(251, 191, 33, 0.2)",
  focusGlowSmall: "0 0 0 3px rgba(251, 191, 33, 0.18)",
  tabBarBorder: "rgba(16, 24, 40, 0.08)",
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
