/**
 * Banners In 48 design tokens.
 *
 * Ecwid-style design language:
 *  - Pure white + off-white panels (no dominant dark sections except the footer)
 *  - Bright saturated single accent (Ecwid green) for CTAs
 *  - Soft pale-green washes for soft-accent surfaces
 *  - Inter typography, sentence-case headlines, friendly rounded shapes
 *  - Soft, low-opacity, layered shadows
 *
 * Components reference semantic names — never raw hex.
 */

export const colors = {
  // ── Backgrounds (Ecwid 6-role system) ──────────────────────────────────
  // lightest — page background
  lightest: "#FFFFFF",
  // light — card / soft-panel surface
  light: "#F8F9FA",
  // legacy aliases kept for backwards compatibility with components that
  // still consume them; values map onto the new Ecwid surfaces.
  surface: "#FFFFFF",
  surfaceTint: "#F8F9FA",
  surfaceVeryLight: "#F3F4F6",
  black: "#000000",

  // soft accents — pale washes for soft-accent bands (Ecwid pale-green + pale-blue)
  softAccent: "#E8F5E9",
  softAccent2: "#E0F2FE",
  // legacy "infoTint" maps onto the pale-blue wash
  infoTint: "#E0F2FE",

  // ── Strong Accent (Ecwid green) — CTAs, links, active states ───────────
  strongAccent: "#00B545",
  strongAccentHover: "#009A3B",
  strongAccentActive: "#007A2E",
  strongAccentText: "#FFFFFF",

  // CTA role — legacy semantic name. Points to the Ecwid green accent.
  ctaPrimary: "#00B545",
  ctaAccent: "#009A3B",
  ctaActive: "#007A2E",
  ctaText: "#FFFFFF",

  // ── Interactive (links, secondary) — Ecwid-green based for cohesion ────
  link: "#007A2E",
  linkHover: "#009A3B",
  linkActive: "#005C23",

  // ── Dark text & footer backgrounds ─────────────────────────────────────
  // dark — primary body text
  dark: "#1F1F1F",
  darkMuted: "#5F6B7A",
  // darkest — Ecwid deep navy-charcoal, used on the footer band only
  darkest: "#0A2540",

  // Text role — legacy semantic aliases
  textDark: "#1F1F1F",
  textCharcoal: "#13181A",
  textLight: "#FFFFFF",
  textMedium: "#5F6B7A",
  textOnDark: "#FFFFFF",
  textOnAccent: "#FFFFFF",
  muted: "#5F6B7A",

  // Legacy navy tokens — aliased onto the Ecwid dark / darkest values so
  // downstream consumers that still reference them keep working after the
  // re-skin. These are intentionally not deleted to avoid a wide rename in
  // this phase; they will be retired in a follow-up.
  navyBase: "#0A2540",
  navyDeep: "#0A2540",
  navyDark: "#0A2540",
  navyDarkest: "#0A2540",

  // ── Borders & dividers ─────────────────────────────────────────────────
  border: "#E5E7EB",
  borderInput: "#D1D5DB",
  divider: "#E5E7EB",

  // ── Semantic / status ──────────────────────────────────────────────────
  success: "#00B545",
  warning: "#F5A623",
  error: "#E5484D",

  // Badges (light tints to sit on white surfaces)
  badgeSuccessBg: "#E8F5E9",
  badgeSuccessText: "#007A2E",
  badgeWarningBg: "#FFF6E6",
  badgeWarningText: "#B26A00",
  badgeErrorBg: "#FEECEC",
  badgeErrorText: "#C72530",

  // ── Timeline markers ───────────────────────────────────────────────────
  timelineDone: "#00B545",
  timelineCurrent: "#00B545",
  timelineCurrentRing: "#E8F5E9",
  timelinePending: "#D1D5DB",
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
  // Desktop sizes — kept compatible with the previous scale so the
  // existing Tailwind fontSize utilities (`text-hero-h1`, etc.) keep
  // working. Hero H1 is intentionally smaller than before because
  // Inter at 800 with tight tracking reads larger than Archivo Black.
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
  card: 20,
  pill: 100,
  // Back-compat aliases for existing Tailwind utilities (rounded-btn / rounded-feature / rounded-card)
  // — the value is the same as the friendlier Ecwid scale.
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
  // Soft, low-opacity, layered — Ecwid aesthetic.
  none: "none",
  level1: "0 1px 2px rgba(16, 24, 40, 0.05)",
  nav: "0 1px 0 rgba(16, 24, 40, 0.06)",
  level2: "0 4px 12px rgba(16, 24, 40, 0.08)",
  level3: "0 8px 24px rgba(16, 24, 40, 0.12)",
  level4: "0 16px 40px rgba(16, 24, 40, 0.16)",
  // Focus glow — Ecwid green ring
  focusGlow: "0 0 0 4px rgba(0, 181, 69, 0.18)",
  focusGlowSmall: "0 0 0 3px rgba(0, 181, 69, 0.16)",
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
