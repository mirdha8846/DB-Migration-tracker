---
name: SchemaGuard Latte
colors:
  surface: '#fff8f5'
  surface-dim: '#ffd1b3'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ea'
  surface-container: '#ffeade'
  surface-container-high: '#ffe3d2'
  surface-container-highest: '#ffdcc6'
  on-surface: '#2d1604'
  on-surface-variant: '#504440'
  inverse-surface: '#452a16'
  inverse-on-surface: '#ffede4'
  outline: '#83746f'
  outline-variant: '#d5c3bd'
  surface-tint: '#7b5548'
  primary: '#110200'
  on-primary: '#ffffff'
  primary-container: '#32170d'
  on-primary-container: '#a77c6e'
  inverse-primary: '#edbcab'
  secondary: '#3b6934'
  on-secondary: '#ffffff'
  secondary-container: '#bcf1ad'
  on-secondary-container: '#416f39'
  tertiary: '#100200'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a1200'
  on-tertiary-container: '#e05e0f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#edbcab'
  on-primary-fixed: '#2f140a'
  on-primary-fixed-variant: '#613e32'
  secondary-fixed: '#bcf1ad'
  secondary-fixed-dim: '#a0d493'
  on-secondary-fixed: '#002201'
  on-secondary-fixed-variant: '#23501e'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#fff8f5'
  on-background: '#2d1604'
  surface-variant: '#ffdcc6'
  surface-cream: '#fff8f5'
  surface-latte: '#ffeade'
  surface-foam: '#fff1ea'
  critical-red: '#ba1a1a'
  glass-border: rgba(123, 86, 71, 0.1)
  glass-shadow: rgba(123, 86, 71, 0.08)
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1280px
---

## Brand & Style
SchemaGuard embodies a "Warm Enterprise" aesthetic—a sophisticated blend of high-security technical monitoring with an organic, comforting color palette. The brand personality is vigilant yet calm, designed to reduce the stress of mission-critical database operations.

The visual style is **Modern Glassmorphism** with a **Latte Warmth** twist. It utilizes semi-transparent surfaces, deep backdrop blurs, and organic "steam" particle animations to create a sense of depth and fluidity. The interface moves away from the sterile blues of traditional security dashboards toward a premium, earthy, and refined experience that feels like a high-end architectural lounge.

## Colors
The palette is centered on a "Coffee and Cream" spectrum. The primary color is a deep Espresso (#32170d), providing high-contrast grounding for typography and active states. 

- **Backgrounds:** A dynamic three-tone gradient using `surface-cream`, `surface-latte`, and `surface-foam` creates a soft, shifting canvas.
- **Accents:** A natural Forest Green (#3b6934) represents healthy states and success, while a vibrant Amber (#fe7328) and Crimson (#ba1a1a) signal medium and critical risks respectively.
- **Glass Effects:** Transparency is key; surfaces use white at 40% opacity with heavy blurs (20px) to allow the warm background gradients to bleed through.

## Typography
The system uses a tri-font hierarchy to balance character with utility:
1. **Space Grotesk** is used for headlines and hero numbers, providing a geometric, modern tech-forward feel.
2. **Manrope** serves as the primary workhorse for body text and navigation, chosen for its warmth and high legibility.
3. **JetBrains Mono** is reserved for technical data, migration IDs, and status labels, giving developers a familiar "code" environment within the UI.

Scale is used aggressively for emphasis—large display numbers represent system health, while tight, all-caps monospaced labels are used for meta-information.

## Layout & Spacing
The layout follows a **Fixed Sidebar / Fluid Content** model. 
- **Sidebar:** A constant 16rem (256px) sidebar provides navigation.
- **Grid:** A 12-column logical grid is used for desktop, but visually presented through asymmetric card layouts (e.g., 2/3 chart, 1/3 sidebar component).
- **Rhythm:** An 8px base unit drives all spacing. Containers use 24px (gutter) for internal padding.
- **Responsive:** On mobile, margins shrink to 16px, and the multi-column grids reflow into a single-column stack. Charts and tables enable horizontal scrolling with custom thin scrollbars.

## Elevation & Depth
Elevation is communicated through **translucency and blur** rather than traditional drop shadows.
- **Base Level:** The animated gradient background.
- **Card Level (Glass):** White surfaces at 40% opacity with a 20px backdrop-filter. These feature a subtle 1px border (`rgba(123, 86, 71, 0.1)`) to define edges.
- **Hover State:** When interacting with cards, the elevation increases via a slight scale-up (1.01) and a more pronounced shadow (`0 12px 40px rgba(123, 86, 71, 0.15)`).
- **Navigation/Modals:** High-z-index elements use 40% backdrop blurs to obscure the content beneath without losing the sense of space.
- **Interactive Depth:** A radial "spotlight" follows the mouse cursor, adding a subtle highlight layer that interacts with the warm background.

## Shapes
The shape language is generously rounded to reinforce the "Warm Enterprise" feel.
- **Main Cards:** 1rem (16px) or 1.5rem (24px) corner radius.
- **Buttons & Inputs:** 0.5rem (8px) for standard buttons, while search bars and status chips use full pill shapes (`rounded-full`).
- **Profile Images:** Circular (50% radius) to contrast against the geometric grid.

## Components
- **Buttons:** Primary buttons use a solid Espresso (#32170d) background with white text. Hover states should use `brightness-110`.
- **Glass Cards:** Must include `backdrop-blur-2xl` and a 1px border using `surface-tint` at low opacity.
- **Status Chips:** Use a low-opacity background of the status color (e.g., 10% Red) with high-contrast text and a 1px border. Always include the "Risk Dot" with a glow effect.
- **Risk Dots:** 8px circles with a matching CSS box-shadow glow (e.g., `box-shadow: 0 0 8px #ba1a1a`).
- **Inputs:** Soft, tinted backgrounds (`primary/5`) with pill-shaped corners for search and 12px corners for text areas.
- **Tables:** Minimalist. Headers use all-caps monospaced labels. Rows use a 5% primary color tint on hover to indicate interactivity.
- **AI Advisor:** A distinct component style using `on-tertiary-container` accents to differentiate machine-generated insights from system data.