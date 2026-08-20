/**
 * Banners In 48 design tokens.
 *
 * Sampled from the client brand board (logo lockups, marks, QR):
 *  - Brand magenta #CB1079 — primary accent, CTAs, links
 *  - Brand green #3EAF2C — secondary accent, speed/success signals
 *  - Black #000000 and near-black #100F0D — dark sections, footer, nav
 *
 * Accent ramps are darkened rather than lightened so every step keeps
 * WCAG AA against white. Brand green is only 2.85:1 on white, so
 * `greenText` (#2B7A1F, 5.4:1) carries small text on light surfaces
 * while `brandGreen` is reserved for fills, large graphics, and dark bgs.
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
  infoTint: "#FCE7F2",

  // ── Strong Accent (brand magenta) — CTAs, highlights ───────────────────
  strongAccent: "#CB1079",
  strongAccentHover: "#AD0E67",
  strongAccentActive: "#920C57",
  strongAccentText: "#FFFFFF",
  // Brand magenta is only 3.55:1 on the near-black surfaces, so accent *text*
  // sitting on a dark background uses this lightened step instead (5.0:1+).
  strongAccentOnDark: "#EF2E9A",

  ctaPrimary: "#CB1079",
  ctaAccent: "#AD0E67",
  ctaActive: "#920C57",
  ctaText: "#FFFFFF",

  // ── Secondary Accent (brand green) ─────────────────────────────────────
  brandGreen: "#3EAF2C",
  brandGreenHover: "#328C23",
  greenText: "#2B7A1F",

  // ── Interactive (links) ────────────────────────────────────────────────
  link: "#CB1079",
  linkHover: "#AD0E67",
  linkActive: "#920C57",

  // ── Dark text & footer backgrounds ─────────────────────────────────────
  dark: "#212121",
  darkMuted: "#979797",
  darkest: "#000000",

  textDark: "#212121",
  textCharcoal: "#13181A",
  textLight: "#FFFFFF",
  textMedium: "#979797",
  textOnDark: "#FFFFFF",
  textOnAccent: "#FFFFFF",
  muted: "#979797",

  // ── Dark surfaces ──────────────────────────────────────────────────────
  inkBlack: "#000000",
  surfaceDark: "#100F0D",
  surfaceDarkRaised: "#1C1A18",

  accentTint: "#FCE7F2",
  borderOnDark: "rgba(255,255,255,0.15)",

  // ── Borders & dividers ─────────────────────────────────────────────────
  border: "#BDBDBD",
  borderSubtle: "#E0E0E0",
  borderInput: "#E0E0E0",
  divider: "#BDBDBD",

  // ── Semantic / status (NOT brand accent — never use for CTAs or nav) ───
  success: "#2B7A1F",
  warning: "#F57C00",
  error: "#CF2E2E",

  badgeSuccessBg: "#E8F6E4",
  badgeSuccessText: "#226018",
  badgeWarningBg: "#FFF3E0",
  badgeWarningText: "#F57C00",
  badgeErrorBg: "#FFEBEE",
  badgeErrorText: "#CF2E2E",

  // ── Timeline markers ───────────────────────────────────────────────────
  timelineDone: "#2B7A1F",
  timelineCurrent: "#CB1079",
  timelineCurrentRing: "#FCE7F2",
  timelinePending: "#BDBDBD",
} as const;

export const typography = {
  fontFamily: {
    display: ['var(--font-bebas-neue)', '"Bebas Neue"', "Impact", "Haettenschweiler", "Arial Narrow Bold", "sans-serif"],
    body: ['var(--font-open-sans)', '"Open Sans"', "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
    input: ['var(--font-open-sans)', '"Open Sans"', "system-ui", "sans-serif"],
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
  focusGlow: "0 0 0 4px rgba(203, 16, 121, 0.25)",
  focusGlowSmall: "0 0 0 3px rgba(203, 16, 121, 0.2)",
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
