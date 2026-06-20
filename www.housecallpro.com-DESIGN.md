# Design System Inspired by Housecall Pro

## 1. Visual Theme & Atmosphere

Housecall Pro's design system embodies a modern, professional aesthetic built for the home services industry. The visual language combines bold, commanding typography with a strategic use of blue and gold accents against dark, trustworthy neutrals. The design conveys reliability, efficiency, and technological sophistication—qualities essential for field service businesses managing complex operations. The system balances industry professionalism with approachable, human-centered interactions, using generous whitespace and clean layouts to reduce cognitive load for busy service professionals. Dark backgrounds establish authority, while bright gold call-to-actions create urgency and guide users toward conversion. The overall atmosphere is industrial yet welcoming, technical yet accessible.

**Key Characteristics**
- Bold, geometric typography with high contrast
- Strategic dark blues and navy foundations with vibrant gold accents
- Clean, minimal layouts with generous whitespace
- Professional yet approachable visual tone
- High-contrast text for readability and accessibility
- Purposeful use of color to guide user attention
- Modern, scalable component structure

## 2. Color Palette & Roles

### Primary
- **Navy Base** (`#13191E`): Primary background color used across 557 instances; establishes the core visual foundation
- **Deep Navy** (`#002942`): Secondary background and container color used in 327 instances; creates depth and hierarchy
- **Dark Navy** (`#0E2634`): Tertiary dark neutral for subtle differentiation
- **Darkest Navy** (`#0A2443`): Deep accent background for elevated components

### Accent Colors
- **Bright Blue** (`#0F77CC`): Primary interactive accent; used for links, highlights, and secondary CTAs across 87 instances
- **Electric Blue** (`#0055FF`): High-emphasis interactive element color for critical actions
- **Light Blue** (`#DEF0FF`): Background tint for blue-highlighted content and information states used in 20 instances

### Interactive
- **Gold Primary** (`#FF9B24`): Primary call-to-action button color; conveys urgency and warmth; used 5 times
- **Gold Accent** (`#FFB706`): Secondary gold emphasis for hover states and supporting CTAs; used 3 times
- **Golden Yellow** (`#FCB900`): Tertiary warning and emphasis color; high visibility

### Neutral Scale
- **Text Dark** (`#212121`): Primary text color for body copy and standard content; used 43 times
- **Text Charcoal** (`#13181A`): Alternative dark text for inverted backgrounds; used 3 times
- **Text Light** (`#FFFFFF`): Light text for dark backgrounds; used 19 times
- **Divider Gray** (`#BDBDBD`): Border and divider color; used 4 times
- **Light Gray** (`#E0E0E0`): Subtle backgrounds and disabled states; used 2 times
- **Lightest Gray** (`#F5F5F5`): Background surface tint for subtle sections
- **Very Light** (`#ECEFF1`): Minimal background variation
- **Text Medium** (`#979797`): Secondary/tertiary text for reduced emphasis

### Surface & Borders
- **Black** (`#000000`): Maximum contrast for critical elements
- **White** (`#FFFFFF`): Primary surface and card backgrounds

### Semantic / Status
- **Error Red** (`#CF2E2E`): Error states and destructive actions; indicates critical issues requiring immediate attention

## 3. Typography Rules

### Font Family
**Primary:** Headline Gothic ATF and Headline Gothic ATF Rough No. 1 (display and heading emphasis), fallback to Georgia, serif
**Secondary:** Open Sans (body, UI labels, standard content), fallback to -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Tertiary:** Plus Jakarta Sans (input labels, supporting text), fallback to "Inter", sans-serif

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|---|---|
| Display Large (H1) | Headline Gothic ATF Rough No. 1 | 83px | 400 | 85px | 0px | Hero headline; max impact |
| Display Medium (H2) | Headline Gothic ATF | 68px | 400 | 68px | 0px | Section headline; strong presence |
| Heading Large (H4) | Open Sans | 18px | 700 | 27px | 0px | Subsection headline; emphasis |
| Heading Medium (H5) | Open Sans | 14px | 700 | 24px | 0px | Card title; list header |
| Body Standard | Open Sans | 16px | 400 | 24px | 0px | Primary reading text; comfortable measure |
| Body Small | Open Sans | 11px | 400 | 18px | 0px | Supporting text; metadata |
| Input Text | Open Sans | 12px | 400 | 18px | 0px | Form input and placeholder text |
| List Item | Open Sans | 18px | 400 | 27px | 0px | List content; structured information |
| Span Accent | Open Sans | 16px | 400 | 24px | 0px | Inline emphasis; supporting inline |

### Principles
- Headline Gothic typefaces dominate display sizes for maximum visual impact and brand distinctiveness
- Open Sans provides excellent readability for body text and UI components across all screen sizes
- Font weights are intentionally limited (400 regular, 700 bold) to maintain visual clarity and reduce cognitive load
- Line heights exceed font size by 1–1.5× to optimize readability in body text and forms
- Typographic hierarchy relies primarily on size and weight rather than color; ensure sufficient contrast for accessibility
- Use consistent line-height ratios across related text elements to maintain visual rhythm

## 4. Component Stylings

### Buttons

**Primary CTA Button (Gold)**
- Background: `#FF9B24`
- Text Color: `#13191E`
- Font: Open Sans, 16px, 700
- Padding: `12px 40px`
- Border Radius: `8px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Background `#FFB706`; darken text slightly
- Active State: Background `#FCB900`; scale 0.98

**Secondary Button (Navy Border)**
- Background: transparent
- Text Color: `#0F77CC`
- Font: Open Sans, 16px, 400
- Padding: `12px 32px`
- Border Radius: `8px`
- Border: `1px solid #0F77CC`
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Background `rgba(15, 119, 204, 0.08)`;
- Active State: Background `rgba(15, 119, 204, 0.16)`

**Ghost Button (Text Only)**
- Background: transparent
- Text Color: `#0F77CC`
- Font: Open Sans, 16px, 400
- Padding: `8px 0px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Text Color `#0055FF`; underline
- Active State: Text Color `#002942`

**Pill Button (Rounded Edge)**
- Background: `#0F77CC`
- Text Color: `#FFFFFF`
- Font: Open Sans, 16px, 700
- Padding: `12px 28px`
- Border Radius: `100px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Background `#0055FF`; increase brightness
- Active State: Background `#002942`

### Cards & Containers

**Default Card**
- Background: `#FFFFFF`
- Text Color: `#212121`
- Font: Open Sans, 16px, 400
- Padding: `24px`
- Border Radius: `24px`
- Border: `1px solid #E0E0E0`
- Box Shadow: `0px 2px 8px rgba(0, 0, 0, 0.08)`
- Line Height: 24px

**Dark Card (Overlay)**
- Background: `#0B0B0C`
- Text Color: `#FFFFFF`
- Font: Plus Jakarta Sans, 16px, 400
- Padding: `80px 32px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px

**Feature Card**
- Background: `rgba(255, 255, 255, 0.95)`
- Text Color: `#13191E`
- Font: Open Sans, 18px, 400
- Padding: `32px 24px`
- Border Radius: `16px`
- Border: None
- Box Shadow: `0px 4px 16px rgba(0, 0, 0, 0.12)`
- Line Height: 27px

**Section Container**
- Background: `#F5F5F5`
- Text Color: `#212121`
- Font: Open Sans, 16px, 400
- Padding: `64px 40px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px

### Inputs & Forms

**Standard Email Input**
- Background: `#FFFFFF`
- Text Color: `#13191E`
- Font: Open Sans, 12px, 400
- Padding: `0px 20px`
- Border Radius: `100px 0px 0px 100px` (left-side rounded)
- Border: `1px solid #E0E0E0`
- Height: `40px`
- Box Shadow: `none`
- Line Height: 18px
- Focus State: Border `1px solid #0F77CC`; Box Shadow `0px 0px 8px rgba(15, 119, 204, 0.16)`
- Placeholder Color: `rgba(0, 0, 0, 0.54)`

**Large Input Field (Desktop)**
- Background: `#FFFFFF`
- Text Color: `rgba(0, 0, 0, 0.87)`
- Font: Plus Jakarta Sans, 14px, 400
- Padding: `0px 24px`
- Border Radius: `100px 0px 0px 100px`
- Border: `1px solid #BDBDBD`
- Height: `56px`
- Width: `312px`
- Box Shadow: `none`
- Line Height: 21px
- Focus State: Border `1px solid #0F77CC`; Box Shadow `0px 0px 12px rgba(15, 119, 204, 0.2)`

**Text Input (General)**
- Background: `#FFFFFF`
- Text Color: `rgba(0, 0, 0, 0.87)`
- Font: Plus Jakarta Sans, 16px, 400
- Padding: `0px 20px`
- Border Radius: `100px 0px 0px 100px`
- Border: `1px solid #BDBDBD`
- Height: `54px`
- Box Shadow: `none`
- Line Height: 24px
- Focus State: Border `1px solid #0F77CC`; Box Shadow `0px 0px 12px rgba(15, 119, 204, 0.2)`
- Disabled State: Background `#F5F5F5`; Text Color `#979797`; Cursor not-allowed

**CTA Button (Right-side Attached)**
- Background: `#FF9B24`
- Text Color: `#13191E`
- Font: Open Sans, 14px, 700
- Padding: `12px 24px`
- Border Radius: `0px 100px 100px 0px` (right-side rounded)
- Border: None
- Height: `40px` (matches input)
- Box Shadow: `none`
- Line Height: 18px
- Hover State: Background `#FFB706`
- Active State: Background `#FCB900`

### Navigation

**Top Navigation Bar**
- Background: `#FFFFFF`
- Text Color: `#13191E`
- Font: Open Sans, 16px, 400
- Height: `64px`
- Padding: `0px 40px`
- Border: None
- Box Shadow: `0px 1px 3px rgba(0, 0, 0, 0.08)`
- Line Height: 24px

**Nav Link (Standard)**
- Background: transparent
- Text Color: `#13191E`
- Font: Open Sans, 16px, 400
- Padding: `12px 16px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Text Color `#0F77CC`; Background `rgba(15, 119, 204, 0.08)`
- Active State: Text Color `#0F77CC`; Border Bottom `2px solid #0F77CC`

**Nav Link (Bold)**
- Background: transparent
- Text Color: `#0E2634`
- Font: Open Sans, 14px, 700
- Padding: `8px 12px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Text Color `#0F77CC`
- Active State: Text Color `#0055FF`

### Links

**Primary Link**
- Background: transparent
- Text Color: `#0F77CC`
- Font: Open Sans, 16px, 400
- Padding: `0px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Text Decoration `underline`; Color `#0055FF`
- Active State: Color `#002942`

**Secondary Link**
- Background: transparent
- Text Color: `#0F77CC`
- Font: Open Sans, 16px, 400
- Padding: `0px`
- Border Radius: `0px`
- Border: None
- Box Shadow: `none`
- Line Height: 24px
- Hover State: Text Color `#0055FF`; Text Decoration `underline`

### Badges & Labels

**Success Badge**
- Background: `#E8F5E9`
- Text Color: `#2E7D32`
- Font: Open Sans, 12px, 600
- Padding: `4px 12px`
- Border Radius: `16px`
- Border: None
- Box Shadow: `none`

**Warning Badge**
- Background: `#FFF3E0`
- Text Color: `#F57C00`
- Font: Open Sans, 12px, 600
- Padding: `4px 12px`
- Border Radius: `16px`
- Border: None
- Box Shadow: `none`

**Error Badge**
- Background: `#FFEBEE`
- Text Color: `#CF2E2E`
- Font: Open Sans, 12px, 600
- Padding: `4px 12px`
- Border Radius: `16px`
- Border: None
- Box Shadow: `none`

## 5. Layout Principles

### Spacing System

**Base Unit:** 4px (fundamental spacing increment)

**Spacing Scale:**
- **4px:** Micro spacing between tightly related elements
- **8px:** Extra-small padding for compact components
- **12px:** Small padding for input fields and button labels
- **16px:** Standard gap between related UI elements
- **20px:** Standard padding for form fields
- **24px:** Standard padding for cards and sections
- **32px:** Large padding for grouped sections
- **40px:** Extra-large padding for page sections
- **64px:** Section margin for major content breaks
- **80px:** Page-level padding for hero sections
- **196px:** Hero section margin for dominant layout spacing

Use consistent spacing to create visual rhythm and guide user attention. Maintain proportional relationships between spacing values to ensure coherent visual hierarchy.

### Grid & Container

**Max Width:** 1200px for primary content containers; 1440px for full-bleed hero sections

**Column Strategy:** 
- Desktop: 12-column grid with 40px gutters
- Tablet: 8-column grid with 24px gutters
- Mobile: 4-column grid with 16px gutters

**Section Patterns:**
- Full-width hero sections extend edge-to-edge with 80px vertical padding
- Content sections use centered container with 40px horizontal padding
- Card grids maintain 16px gaps between elements
- Form sections use single-column layout with 24px spacing between fields

### Whitespace Philosophy

Generous whitespace reduces cognitive load and creates breathing room for critical content. Maintain minimum 24px padding around all text content. Use 40px+ margins to separate distinct sections. White space is not empty—it directs focus and establishes visual hierarchy. Avoid cramped layouts; prioritize clarity and scanability over content density.

### Border Radius Scale

- **0px:** Rigid, angular containers and full-bleed sections
- **4px:** Subtle rounding for modal dialogs and nested components
- **8px:** Standard rounding for buttons and small interactive elements
- **16px:** Moderate rounding for feature cards and prominent sections
- **24px:** Generous rounding for large cards and elevated containers
- **100px:** Full pill-shaped buttons and rounded input fields (left/right sides: `100px 0px 0px 100px` and `0px 100px 100px 0px`)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow; `box-shadow: none` | Background surfaces, neutral containers, text-only sections |
| Raised (Level 1) | `box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.08)` | Standard cards, input fields, subtle lift |
| Elevated (Level 2) | `box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.12)` | Feature cards, prominent sections, modal backgrounds |
| High (Level 3) | `box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.16)` | Modals, dropdowns, floating elements; reserved for critical overlays |
| Maximum (Level 4) | `box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.2)` | Tooltips, popovers, top-layer dialogs; highest visual emphasis |

**Shadow Philosophy:** Shadows create subtle depth to enhance usability and visual hierarchy without overwhelming the interface. Use minimal shadows on light backgrounds; reduce shadow intensity on dark surfaces. Darker shadows indicate higher elevation and more interactive importance. Apply shadows consistently to establish predictable spatial relationships. Avoid excessive shadows—they can reduce readability and create visual clutter.

## 7. Do's and Don'ts

### Do
- Use gold (`#FF9B24`, `#FFB706`) exclusively for primary call-to-action buttons to guide user focus and create conversion urgency
- Maintain consistent padding of 24px inside all cards and containers for visual comfort and scanability
- Apply 16px gaps between grid items and related UI components for rhythmic alignment
- Use navy (`#13191E`, `#002942`) as primary background colors to establish authority and professionalism
- Ensure text color contrast meets WCAG AA standards (minimum 4.5:1 for body text, 3:1 for large text)
- Use Blue (`#0F77CC`) for links, secondary CTAs, and interactive elements across all states
- Apply subtle shadows (Level 1–2) only to cards and floating elements; avoid excessive layering
- Maintain Open Sans as primary body font for excellent web readability and universal fallback support
- Use Headline Gothic for display and hero headlines only; never for body or navigation text
- Keep form inputs rounded on the left (`border-radius: 100px 0px 0px 100px`) with attached CTA buttons rounded on the right

### Don't
- Don't use multiple accent colors simultaneously in a single component; maintain visual focus
- Don't apply shadows to full-width sections or background containers; reserve shadows for elevated components only
- Don't reduce padding below 12px in interactive elements; maintain touch target accessibility
- Don't mix font families within a single text block; alternate only between Open Sans and Headline Gothic per semantic role
- Don't use text color `#13191E` on navy backgrounds; always use white or light gray for contrast
- Don't apply border radius greater than 24px to standard components; reserve 100px radius for pill-shaped inputs only
- Don't change font weights outside the 400/700 system; maintain typographic predictability
- Don't overlay multiple depth levels in nested containers; use single-level shadows only
- Don't use semantic colors (`#FF9B24`, error red) for non-functional emphasis; reserve for explicit status communication
- Don't apply line heights below 1.5× font size for any body text; ensure readable line measure

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Mobile | 320px–599px | 4-column grid; 16px gutters; single-column forms; 64px hero padding; 16px section padding |
| Tablet | 600px–1023px | 8-column grid; 24px gutters; 2-column layouts where applicable; 72px hero padding; 32px section padding |
| Desktop | 1024px+ | 12-column grid; 40px gutters; multi-column layouts; 80px hero padding; 40px section padding; max-width containers |
| Large Desktop | 1400px+ | Full layout support; 1440px max-width for hero sections; 96px section padding |

### Touch Targets

- **Minimum button size:** 44px height × 44px width (iOS/Android standard)
- **Minimum link target:** 44px × 44px clickable area
- **Input field height:** 40px (mobile), 54px–56px (desktop)
- **Spacing between touch targets:** minimum 16px to prevent accidental activation
- **Icon buttons:** 48px × 48px with 8px internal padding

### Collapsing Strategy

- **Hero sections:** Scale typography from 83px (desktop) → 48px (tablet) → 32px (mobile) while maintaining line-height proportions
- **Cards:** Single column on mobile (100% width with 16px margins); 2 columns on tablet; 3+ columns on desktop
- **Navigation:** Full horizontal nav on desktop; hamburger menu on tablet/mobile; dropdown menus collapse to vertical lists
- **Input + Button:** Stack vertically on mobile (full-width input, full-width button); inline on tablet/desktop
- **Padding scale:** Reduce padding by 50% on mobile (24px → 12px); 75% on tablet (24px → 20px); full scale on desktop
- **Typography:** Reduce all font sizes by 2px–4px on mobile to maintain readable measure on small screens
- **Grid gaps:** 16px on mobile, 24px on tablet, 40px on desktop

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA Button:** Gold (`#FF9B24`) — Use for main conversion actions like "START FREE TRIAL"
- **Secondary Interactive:** Bright Blue (`#0F77CC`) — Use for links, secondary actions, and emphasis
- **Primary Background:** Navy Base (`#13191E`) — Use for page backgrounds and dark containers
- **Secondary Background:** Deep Navy (`#002942`) — Use for secondary containers and depth variation
- **Text on Light:** Text Dark (`#212121`) — Standard body text and labels on white backgrounds
- **Text on Dark:** White (`#FFFFFF`) — Text on navy/dark backgrounds for maximum contrast
- **Error/Danger:** Error Red (`#CF2E2E`) — Use sparingly for error states and destructive actions
- **Dividers/Borders:** Light Gray (`#E0E0E0`) — Subtle borders between sections
- **Surface Tint:** Lightest Gray (`#F5F5F5`) — Minimal background variation for subtle sections

### Iteration Guide

1. **Always use `#FF9B24` for primary call-to-action buttons**—this gold color drives conversions and is the visual anchor for user action.

2. **Default to `#FFFFFF` text on `#13191E` or `#002942` backgrounds**—ensure 100% contrast and readability on all dark surfaces; never use dark text on navy.

3. **Apply 24px padding inside all cards and large containers**; use 12px–20px for inputs and compact components; maintain proportional spacing ratios.

4. **Use Open Sans for all body, UI, and navigation text at 16px base size**; use Headline Gothic only for display/hero headlines at 68px+ to maintain hierarchy and prevent visual noise. *Banners In 48 implementation uses **Bebas Neue** (Google Fonts) as the licensed Headline Gothic substitute.*

5. **Set border-radius to `8px` for standard buttons, `100px 0px 0px 100px` for input left-side, and `0px 100px 100px 0px` for attached CTA buttons**—this combination creates cohesive form groups.

6. **Apply subtle shadows only to cards and floating elements using Level 1–2 shadow values**; never shadow full-width sections or backgrounds; avoid shadow stacking.

7. **Link color is always `#0F77CC` with underline on hover**; active state should shift to `#002942` to indicate visited state without changing base accent color.

8. **Input fields must have `border: 1px solid #BDBDBD`** and **`box-shadow: 0px 0px 12px rgba(15, 119, 204, 0.2)` on focus**; maintain 44px minimum height for mobile touch accessibility.

9. **Maintain line-height of 1.5× font size minimum for all body text** (e.g., 16px font → 24px line-height); this ensures readability and optical whitespace.

10. **Use the spacing scale (8px, 12px, 16px, 20px, 24px, 32px, 40px, 64px, 80px) exclusively**—never introduce arbitrary spacing values; this maintains visual rhythm and grid alignment.