---
version: alpha
name: Wise-design-analysis
description: An inspired interpretation of Wise's design language — a global money-transfer brand whose surface combines an unusually heavy near-black display sans (weight 900 at 64–126 px) with a vivid lime-green brand accent, sage-tinted surface neutrals, and rounded white cards on a pale green-tinted canvas; the whole system reads more like a Scandinavian fintech magazine than a bank.

colors:
  primary: "#9fe870"
  on-primary: "#0e0f0c"
  primary-active: "#cdffad"
  primary-neutral: "#c5edab"
  primary-pale: "#e2f6d5"
  ink: "#0e0f0c"
  ink-deep: "#163300"
  body: "#454745"
  mute: "#868685"
  canvas: "#ffffff"
  canvas-soft: "#e8ebe6"
  positive: "#2ead4b"
  positive-deep: "#054d28"
  warning: "#ffd11a"
  warning-deep: "#b86700"
  warning-content: "#4a3b1c"
  negative: "#d03238"
  negative-deep: "#a72027"
  negative-darkest: "#a7000d"
  negative-bg: "#320707"
  accent-orange: "#ffc091"
  accent-cyan: "#38c8ff"

typography:
  display-mega:
    fontFamily: Wise Sans, Inter, system-ui, -apple-system, sans-serif
    fontSize: 126px
    fontWeight: 900
    lineHeight: 107.1px
  display-xxl:
    fontFamily: Wise Sans, Inter, system-ui, sans-serif
    fontSize: 96px
    fontWeight: 900
    lineHeight: 81.6px
  display-xl:
    fontFamily: Wise Sans, Inter, system-ui, sans-serif
    fontSize: 64px
    fontWeight: 900
    lineHeight: 54.4px
  display-lg:
    fontFamily: Wise Sans, Inter, system-ui, sans-serif
    fontSize: 47px
    fontWeight: 400
    lineHeight: 70.5px
    letterSpacing: -0.108px
  display-md:
    fontFamily: Wise Sans, Inter, system-ui, sans-serif
    fontSize: 40px
    fontWeight: 900
    lineHeight: 34px
  display-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 38.4px
    letterSpacing: -0.96px
  display-xs:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 31.2px
    letterSpacing: -0.48px
  body-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 400
    lineHeight: 30px
  body-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-md-strong:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
  body-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm-strong:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  caption:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  button-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px

rounded:
  none: 0px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px

components:
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.md} {spacing.xl}"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-strong}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md} {spacing.xl}"
  button-secondary:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md} {spacing.xl}"
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md} {spacing.xl}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md} {spacing.lg}"
  card-content:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  card-feature-sage:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  card-feature-green:
    backgroundColor: "{colors.primary-pale}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  card-feature-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  hero-band:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.display-mega}"
    padding: "{spacing.3xl} {spacing.xl}"
  hero-band-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.primary}"
    typography: "{typography.display-mega}"
    padding: "{spacing.3xl} {spacing.xl}"
  content-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    padding: "{spacing.3xl} {spacing.xl}"
  currency-converter-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  badge-positive:
    backgroundColor: "{colors.primary-pale}"
    textColor: "{colors.positive-deep}"
    typography: "{typography.body-sm-strong}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.md}"
  badge-negative:
    backgroundColor: "{colors.negative-bg}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm-strong}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.md}"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-soft}"
    typography: "{typography.body-sm}"
    padding: "{spacing.3xl} {spacing.xl}"

  # ─── Examples (illustrative) — auto-derived; resolve any TO_FILL markers below ───
  ex-pricing-tier:
    description: "Default Pricing tier card. Re-uses feature-card chrome with brand canvas-soft surface."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.mute}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  ex-pricing-tier-featured:
    description: "Featured/highlighted tier — polarity-flipped surface (dark fill + light text in light mode, light fill + dark text in dark mode)."
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  ex-product-selector:
    description: "What's Included summary card — re-purposed for SaaS / B2B verticals (NOT a literal product gallery)."
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  ex-cart-drawer:
    description: "Subscription summary — re-purposed for SaaS / B2B (line items per add-on, not literal cart)."
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    item-divider: "{colors.canvas-soft}"
  ex-app-shell-row:
    description: "Sidebar nav row inside the App Shell example. Active state uses brand primary as the indicator."
    backgroundColor: "{colors.canvas}"
    activeIndicator: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.lg}"
  ex-data-table-cell:
    description: "Default data-table th + td chrome. Header uses mono-caps eyebrow typography; body uses body-sm."
    headerBackground: "{colors.canvas-soft}"
    headerTypography: "{typography.caption}"
    bodyTypography: "{typography.body-sm}"
    cellPadding: "{spacing.md} {spacing.lg}"
    rowBorder: "{colors.canvas-soft}"
  ex-auth-form-card:
    description: "Sign-in / sign-up card. Re-uses feature-card chrome with text-input primitives inside."
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  ex-modal-card:
    description: "Modal dialog surface — same chrome as feature-card with elevated shadow."
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  ex-empty-state-card:
    description: "Empty-state illustration frame."
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.xl}"
    padding: "{spacing.3xl}"
    captionTypography: "{typography.body-md}"
  ex-toast:
    description: "Toast notification surface — feature-card shape + medium shadow."
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body-sm}"

---


## Overview

Wise — the global money-transfer brand — wears its identity in a single signature pairing: a vivid lime-green `{colors.primary}` (`#9fe870`) used as the CTA pill and brand accent, set against a pale sage-tinted canvas `{colors.canvas-soft}` (`#e8ebe6`) that runs across the hero band, and a near-black ink `{colors.ink}` (`#0e0f0c`) with a hint of warmth from the brand's underlying olive cast. The brand reads more like a calm Scandinavian magazine than a bank — generous whitespace, large rounded cards, and an unusually heavy display sans set at weight 900 carrying every hero headline.

Display typography is the second decisive voice. The proprietary `Wise Sans` family carries hero displays at weight 900 in scales from 64 px up to 126 px on the largest hero. The brand pairs Wise Sans 900 with Inter at weight 600 for sub-displays — the contrast between the chunky proprietary face and Inter's neutrality creates a particular hierarchy: Wise Sans for the brand moment, Inter for everything else.

Cards are universally pill-rounded — `{rounded.xl}` 24 px is the brand's signature card radius. Buttons take the same 24 px pill-rectangle shape. The brand never uses sharp corners on UI elements; the visual softness is part of the friendly fintech voice.

**Key Characteristics:**
- A single lime-green CTA accent `{colors.primary}` (`#9fe870`) — the brand's universal primary action color. No second accent.
- Two-face display typography — Wise Sans (proprietary, weight 900, hero scale) + Inter (weight 600, sub-display scale). The contrast is the brand's typographic story.
- `{rounded.xl}` 24 px is the canonical card and button radius. Generous, friendly.
- Sage-tinted canvas `{colors.canvas-soft}` (`#e8ebe6`) is the brand's hero surface; white `{colors.canvas}` is reserved for cards within the sage band.
- A full semantic palette: positive green family, warning yellow family, negative red family — each documented with content / hover / active variants for in-product use.
- Currency-converter card on the hero — the brand's signature interactive component, hosting from/to amount inputs.

## Colors

### Brand & Accent
- **Wise Green** (`{colors.primary}` — `#9fe870`): The brand's universal CTA color. Every primary button, every "Send money" pill, the brand's logo accent.
- **Wise Green Hover** (`{colors.primary-active}` — `#cdffad`): The lighter green for active state.
- **Wise Green Neutral** (`{colors.primary-neutral}` — `#c5edab`): A mid-saturation green used as a neutral active fill.
- **Wise Green Pale** (`{colors.primary-pale}` — `#e2f6d5`): The lightest green for soft surface tints / badge backgrounds.

### Surface
- **Canvas** (`{colors.canvas}` — `#ffffff`): Pure white for card interiors.
- **Canvas Soft** (`{colors.canvas-soft}` — `#e8ebe6`): The sage-tinted page background. Defining mood of the brand.

### Text
- **Ink** (`{colors.ink}` — `#0e0f0c`): Near-black with a hint of olive warmth — the brand's default text and headings color.
- **Ink Deep** (`{colors.ink-deep}` — `#163300`): A deep forest-green ink used on positive-state surfaces.
- **Body** (`{colors.body}` — `#454745`): Secondary body text.
- **Mute** (`{colors.mute}` — `#868685`): Lowest-priority text — captions, placeholder, fine print.

### Semantic
- **Positive** (`{colors.positive}` — `#2ead4b`): Success indicator.
- **Positive Deep** (`{colors.positive-deep}` — `#054d28`): Pressed positive state.
- **Warning** (`{colors.warning}` — `#ffd11a`): Caution indicator.
- **Warning Deep** (`{colors.warning-deep}` — `#b86700`): Pressed warning.
- **Warning Content** (`{colors.warning-content}` — `#4a3b1c`): Text on warning surfaces.
- **Negative** (`{colors.negative}` — `#d03238`): Destructive / error red.
- **Negative Deep** (`{colors.negative-deep}` — `#a72027`): Pressed destructive.
- **Negative Darkest** (`{colors.negative-darkest}` — `#a7000d`): Highest-emphasis destructive text.
- **Negative Bg** (`{colors.negative-bg}` — `#320707`): Dark maroon for destructive callout backgrounds.

### Brand Accent — Tertiary
- **Accent Orange** (`{colors.accent-orange}` — `#ffc091`): Bright peach used inside illustrative content / pricing cards.
- **Accent Cyan** (`{colors.accent-cyan}` — `#38c8ff`): Bright sky-blue used as a tertiary illustration accent.

## Typography

### Font Family
Two faces ladder the system:
1. **Wise Sans** — proprietary geometric sans with an unusually heavy weight 900 used for all hero displays. The face is the brand's typographic signature. Always at weight 900, never lighter on the marketing surface.
2. **Inter** — used for sub-displays (weight 600), all body, and form labels. Loaded with `font-feature-settings: "calt"` for contextual alternates.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-mega}` | 126px | 900 | 107.1px | 0 | Hero stencil at maximum scale. |
| `{typography.display-xxl}` | 96px | 900 | 81.6px | 0 | Sub-hero scale. |
| `{typography.display-xl}` | 64px | 900 | 54.4px | 0 | Standard hero headline. |
| `{typography.display-lg}` | 47px | 400 | 70.5px | -0.108px | Lighter sub-display. |
| `{typography.display-md}` | 40px | 900 | 34px | 0 | Section / card headlines. |
| `{typography.display-sm}` | 32px | 600 | 38.4px | -0.96px | Inter-rendered section headings. |
| `{typography.display-xs}` | 24px | 600 | 31.2px | -0.48px | Sub-section displays. |
| `{typography.body-lg}` | 20px | 400 | 30px | 0 | Lead paragraphs. |
| `{typography.body-md}` | 16px | 400 | 24px | 0 | Default body. |
| `{typography.body-md-strong}` | 16px | 600 | 24px | 0 | Bold inline body. |
| `{typography.body-sm}` | 14px | 400 | 20px | 0 | Secondary body. |
| `{typography.body-sm-strong}` | 14px | 600 | 20px | 0 | Bold caption / nav-link. |
| `{typography.caption}` | 12px | 400 | 16px | 0 | Fine print. |
| `{typography.button-md}` | 16px | 600 | 24px | 0 | Button label. |

### Principles
- **Weight 900 for hero, weight 600 for everything else.** The brand's display ceiling is full-black weight; everything below is semibold.
- **Wise Sans for the brand voice, Inter for utility.** Strict role separation.

### Note on Font Substitutes
Wise Sans is proprietary. Open-source substitutes:
- **Display** — *Inter* at weight 900 or *Manrope* at weight 800 / 900 captures the geometric heaviness. *Geist* weight 800 is a passable second choice.
- **Sub-display + body** — *Inter* is the brand's actual second face.

## Layout

### Spacing System
- **Base unit**: 4 px.
- **Tokens**: `{spacing.xxs}` 2 px · `{spacing.xs}` 4 px · `{spacing.sm}` 8 px · `{spacing.md}` 12 px · `{spacing.lg}` 16 px · `{spacing.xl}` 24 px · `{spacing.2xl}` 32 px · `{spacing.3xl}` 48 px.
- **Section padding**: bands use `{spacing.3xl}` 48 px top/bottom on desktop.
- **Card interior**: cards at `{spacing.xl}` 24 px.

### Grid & Container
- Marketing container centres at ~1200 px.
- Hero: split layout (headline left, currency-converter card right) at desktop; stacked at mobile.
- Feature grids: 2-up / 3-up at desktop.

### Responsive Strategy

#### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hero stacks; converter card full-width below headline; grids 1-up. |
| Tablet | 768–1023px | Grids 2-up. |
| Desktop | ≥ 1024px | Hero split; full grids. |

#### Touch Targets
Buttons render ~48 px tall (12 vertical padding + 24 line). WCAG AAA at all widths.

#### Image Behavior
Photography is sparse; the brand prefers illustrative SVGs and product mockups inside cards. Country flag thumbnails appear inside currency rows.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Level 0 — Flat | No shadow, no border. | Default. |
| Level 1 — Hairline on Dark | 1 px solid `{colors.ink}` border. | Tertiary outline buttons, form inputs. |
| Level 2 — Soft Card | Implicit Level 0 white card sitting on sage canvas — the surface contrast IS the elevation. | Cards on the sage hero band. |

The brand uses surface contrast (`{colors.canvas-soft}` background vs `{colors.canvas}` cards) as the primary elevation cue.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed bands. |
| `{rounded.sm}` | 8px | Inline pills, small badges. |
| `{rounded.md}` | 12px | Form inputs, smaller chrome. |
| `{rounded.lg}` | 16px | Mid-size cards. |
| `{rounded.xl}` | 24px | The brand's canonical button + card radius. |
| `{rounded.pill}` | 9999px | Status pills and full-radius accents. |
| `{rounded.full}` | 9999px | Circular icon containers. |

## Components

### Buttons

**`button-primary`** — the lime-green CTA pill.
- Background `{colors.primary}`, text `{colors.on-primary}`, label `{typography.button-md}`, padding `{spacing.md} {spacing.xl}`, shape `{rounded.xl}` 24 px.

**`button-secondary`** — the sage-tinted secondary.
- Background `{colors.canvas-soft}`, text `{colors.ink}`, same typography / padding / shape.

**`button-tertiary`** — the white outline tertiary.
- Background `{colors.canvas}`, text `{colors.ink}`, 1 px solid `{colors.ink}` border, same typography / padding / shape.

**`button-icon-circular`** — the circular icon button.
- Background `{colors.canvas}`, ink icon, shape `{rounded.full}`.

### Cards & Containers

**`card-content`** — the default white card.
- Background `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.xl}`, shape `{rounded.xl}`. No border, sits on sage canvas.

**`card-feature-sage`** — the sage-tinted feature card.
- Background `{colors.canvas-soft}`, text `{colors.ink}`, padding `{spacing.xl}`, shape `{rounded.xl}`.

**`card-feature-green`** — the soft-green feature card.
- Background `{colors.primary-pale}`, text `{colors.ink}`, padding `{spacing.xl}`, shape `{rounded.xl}`.

**`card-feature-dark`** — the polarity-flipped dark card with green text.
- Background `{colors.ink}`, text `{colors.primary}` (Wise green!), padding `{spacing.xl}`, shape `{rounded.xl}`. Used for promotional moments.

**`currency-converter-card`** — the brand's signature interactive widget.
- Background `{colors.canvas}`, text `{colors.ink}`, 1 px solid `{colors.ink}` border, padding `{spacing.xl}`, shape `{rounded.xl}`. Hosts from/to amount inputs + currency selectors.

### Inputs & Forms

**`text-input`** — the canonical text input.
- Background `{colors.canvas}`, text `{colors.ink}`, 1 px solid `{colors.ink}` border, body in `{typography.body-md}`, padding `{spacing.md} {spacing.lg}`, shape `{rounded.md}`.

### Navigation

**`nav-bar`** — the sticky top nav.
- Background `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.md} {spacing.xl}`.

**`nav-link`** — link items inside nav.
- Text `{colors.ink}`, set in `{typography.body-sm-strong}`.

**`footer`** — the dark footer band.
- Background `{colors.ink}`, text `{colors.canvas-soft}`, padding `{spacing.3xl} {spacing.xl}`. Body in `{typography.body-sm}`.

### Signature Components

**`hero-band`** — the sage-canvas hero band.
- Background `{colors.canvas-soft}`, text `{colors.ink}`, padding `{spacing.3xl} {spacing.xl}`. Headline in `{typography.display-mega}` (Wise Sans weight 900).

**`hero-band-dark`** — the polarity-flipped dark hero.
- Background `{colors.ink}`, text `{colors.primary}` (Wise green headline on near-black!), same padding / scale.

**`content-band`** — the white content band that follows hero.
- Background `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.3xl} {spacing.xl}`. Section headline in `{typography.display-md}`.

**`badge-positive`** — the positive status pill.
- Background `{colors.primary-pale}`, text `{colors.positive-deep}`, body in `{typography.body-sm-strong}`, padding `{spacing.xs} {spacing.md}`, shape `{rounded.pill}`.

**`badge-negative`** — the negative status pill.
- Background `{colors.negative-bg}`, text white, body in `{typography.body-sm-strong}`, padding `{spacing.xs} {spacing.md}`, shape `{rounded.pill}`.

### Examples (illustrative)

> Auto-derived kit-mirror demonstration surfaces (`scripts/derive-examples-block.mjs`). Each `ex-*` entry references brand-native primitives so downstream consumers (`/preview-design`, `/generate-kit`) re-skin the same 10 surfaces consistently. `TO_FILL` markers indicate missing primitives — resolve in the LLM judgment pass.

**`ex-pricing-tier`** — Default Pricing tier card. Re-uses feature-card chrome with brand canvas-soft surface.
- Properties: `backgroundColor`, `textColor`, `borderColor`, `rounded`, `padding`

**`ex-pricing-tier-featured`** — Featured/highlighted tier — polarity-flipped surface (dark fill + light text in light mode, light fill + dark text in dark mode).
- Properties: `backgroundColor`, `textColor`, `rounded`, `padding`

**`ex-product-selector`** — What's Included summary card — re-purposed for SaaS / B2B verticals (NOT a literal product gallery).
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-cart-drawer`** — Subscription summary — re-purposed for SaaS / B2B (line items per add-on, not literal cart).
- Properties: `backgroundColor`, `rounded`, `padding`, `item-divider`

**`ex-app-shell-row`** — Sidebar nav row inside the App Shell example. Active state uses brand primary as the indicator.
- Properties: `backgroundColor`, `activeIndicator`, `rounded`, `padding`

**`ex-data-table-cell`** — Default data-table th + td chrome. Header uses mono-caps eyebrow typography; body uses body-sm.
- Properties: `headerBackground`, `headerTypography`, `bodyTypography`, `cellPadding`, `rowBorder`

**`ex-auth-form-card`** — Sign-in / sign-up card. Re-uses feature-card chrome with text-input primitives inside.
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-modal-card`** — Modal dialog surface — same chrome as feature-card with elevated shadow.
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-empty-state-card`** — Empty-state illustration frame.
- Properties: `backgroundColor`, `rounded`, `padding`, `captionTypography`

**`ex-toast`** — Toast notification surface — feature-card shape + medium shadow.
- Properties: `backgroundColor`, `rounded`, `padding`, `typography`


## Do's and Don'ts

### Do
- Reserve `{colors.primary}` Wise green for every primary CTA. The lime-green pill IS the brand's conversion signature.
- Set hero headlines in `{typography.display-mega}` / `{typography.display-xl}` Wise Sans weight 900. Never lighter.
- Use `{rounded.xl}` 24 px for buttons and cards. The generous radius is the brand's friendliness signature.
- Cycle page surfaces in `{colors.canvas-soft}` sage canvas → `{colors.canvas}` white cards. Surface contrast carries elevation.
- Use the full semantic palette (positive / warning / negative) for in-product status — never repurpose Wise green as success indicator since it IS the brand CTA.

### Don't
- Don't introduce a second brand accent. Wise green is the sole identity colour.
- Don't render the hero in weight 700 or lighter. The brand's display weight is 900.
- Don't render CTAs as sharp rectangles. The 24 px pill geometry is non-negotiable.
- Don't pair the green CTA with a green background. The brand always sits Wise green on neutral surfaces (sage / white / ink).
- Don't replace Wise Sans with a generic geometric sans for hero typography — the proprietary face IS the brand's voice.

---

## Frontend Implementation: Tailwind CSS & Dynamic CSS Variables

The design language is implemented in the Vue 3 codebase using a decoupled **CSS Variables + Tailwind CSS** architecture. All color tokens are centralized in `:root` inside `src/assets/main.css` and mapped to semantic utility classes in `tailwind.config.js`.

Tokens are stored as **space-separated RGB channels** (`--color-brand: 159 232 112;`), not hex. `tailwind.config.js` wraps them as `rgb(var(--color-x) / <alpha-value>)`, which is what makes opacity modifiers such as `border-danger/30` or `bg-overlay/50` compile. When reading a token directly in CSS, wrap it: `color: rgb(var(--color-success-text));`.

### 1. Token Mapping & Utility Classes

Hex values below are the light theme. Dark theme values are listed in section 3.

| Token Group | CSS Variable (`main.css`) | Default Hex | Tailwind Class (`tailwind.config.js`) | Role |
|---|---|---|---|---|
| **Brand** | `--color-brand` | `#9fe870` | `bg-brand`, `text-brand` | Primary CTA and signature lime-green accent |
| | `--color-brand-hover` | `#8fe25f` | `hover:bg-brand-hover` | Interactive hover state for primary buttons |
| | `--color-brand-ring` | `#8dd95f` | `focus-visible:ring-brand-ring` | Accessible focus ring outline |
| | `--color-brand-dark` | `#0e0f0c` | `text-brand-dark` | Primary text (headings and body). **Inverts in dark mode** — do not use it as a background or as text on the green |
| | `--color-brand-dark-hover` | `#252824` | `hover:text-brand-dark-hover` | Hover state for primary text |
| | `--color-on-brand` | `#0e0f0c` | `text-on-brand`, `border-on-brand` | Text, icons and spinners on top of `bg-brand`. Always dark |
| **Surfaces** | `--color-surface` | `#ffffff` | `bg-surface` | Cards, inputs, sidebar and modals. Replaces `bg-white` |
| | `--color-inverse` | `#0e0f0c` | `bg-inverse` | Featured dark surfaces (impact card, Python code, toast action, dark buttons). Stays dark in both themes |
| | `--color-inverse-hover` | `#252824` | `bg-inverse-hover`, `hover:bg-inverse-hover` | Nested panels and hover on inverse surfaces |
| | `--color-inverse-border` | `#0e0f0c` | `border-inverse-border` | Outline of inverse surfaces (visible only in dark mode) |
| | `--color-on-inverse` | `#ffffff` | `text-on-inverse` | Primary text on inverse surfaces |
| | `--color-inverse-muted` | `#f1f4ef` | `text-inverse-muted` | Secondary text on inverse surfaces |
| | `--color-overlay` | `#0e0f0c` | `bg-overlay/50`, `bg-overlay/60` | Modal backdrops (always used with opacity) |
| **Sage / Canvas** | `--color-sage` | `#e8ebe6` | `bg-sage` | Soft sage page canvas background |
| | `--color-sage-light` | `#f1f4ef` | `bg-sage-light` | Secondary card background and neutral panels |
| | `--color-sage-pill` | `#eef1ec` | `bg-sage-pill` | Table headers (`thead`), badge backgrounds and pills |
| | `--color-sage-muted` | `#646862` | `text-sage-muted` | Subtitles, labels, and secondary metadata |
| | `--color-sage-subtle` | `#454745` | `text-sage-subtle` | Descriptive body copy |
| | `--color-sage-border` | `#dfe4dd` | `border-sage-border` | Standard card and form input borders |
| | `--color-sage-border-light` | `#edf0eb` | `border-sage-border-light` | Subtle horizontal dividers and table borders |
| | `--color-sage-border-dark` | `#d7dcd5` | `border-sage-border-dark` | High-contrast borders and badge outlines |
| | `--color-sage-surface` | `#f6f8f5` | `bg-sage-surface` | Table footers and soft info panels |
| **Success** | `--color-success` | `#2ead4b` | `text-success`, `border-success` | Green indicator for valid entries and approved cycles |
| | `--color-success-bg` | `#eef8e6` | `bg-success-bg` | Soft tinted background for dropzones and valid cards |
| | `--color-success-surface` | `#e3f6d8` | `bg-success-surface` | Badge and notification fill |
| | `--color-success-dark` | `#054d28` | `text-success-dark` | High-contrast green text for accessibility |
| **Warning** | `--color-warning` | `#b86700` | `text-warning`, `border-warning` | Ochre / amber warning indicator |
| | `--color-warning-bg` | `#fff7d9` | `bg-warning-bg` | Warm welcoming card background for review banners |
| | `--color-warning-light` | `#fff0bb` | `bg-warning-light` | Badge fill for pending cycles or warnings |
| | `--color-warning-border` | `#eadca9` | `border-warning-border` | Border for attention banners |
| | `--color-warning-dark` | `#8c6e1e` | `text-warning-dark` | Eyebrow title text for attention cards |
| **Danger** | `--color-danger` | `#d03238` | `text-danger`, `border-danger` | Impeditivo / destructive error indicator |
| | `--color-danger-bg` | `#fce8e8` | `bg-danger-bg` | Error banner background |
| | `--color-danger-light` | `#fffbfb` | `bg-danger-light` | Highlighted error rows in diagnostic tables |
| | `--color-danger-dark` | `#a7000d` | `text-danger-dark` | Critical rejection headline text |
| **Status fill text** | `--color-on-status` | `#ffffff` | `text-on-status`, `hover:text-on-status` | Text and icons on solid `bg-danger`, `bg-success` or `bg-warning`. Turns dark in dark mode, where status fills are lighter |

### 2. Live HMR & Hot Theming
- **Zero Restart**: Editing any variable in `src/assets/main.css` triggers instant Hot Module Replacement (HMR) in Vite without restarting the development server.
- **DevTools Live Preview**: Designers and developers can inspect `<html>` / `:root` in browser DevTools and interactively modify any `--color-*` property with the native color picker to test adjustments live.

### 3. Dark Mode Architecture
The theme is selected by a `data-theme="light" | "dark"` attribute on `<html>`. The dark palette overrides the same variables under `:root[data-theme="dark"]` in `src/assets/main.css`, together with `color-scheme: dark` so native controls (date/month inputs, checkboxes, scrollbars, `<dialog>`) follow the theme. Components only use token classes, so the switch needs no `dark:` variants. Tailwind is configured with `darkMode: ['selector', '[data-theme="dark"]']` in case a one-off `dark:` override is ever needed.

**Runtime pieces**
- `src/services/useTheme.js` — singleton composable. Preference is `system` (default), `light` or `dark`, stored in `localStorage` under `comissionai:theme` (`system` removes the key). It follows `prefers-color-scheme` changes while the preference is `system` and updates `<meta name="theme-color">`. Initialized in `src/main.js`.
- Inline script in `index.html` `<head>` — applies `data-theme` before Vue mounts, so a dark user never sees a light flash. Its key and resolution logic must stay in sync with `useTheme.js`.
- `src/components/layout/ThemeToggle.vue` — three-option radiogroup (sun / moon / monitor). Rendered at the bottom of `SidebarNav.vue` on desktop and in `Topbar.vue` below `md`.

**Dark palette** — same brand green, neutrals keep the olive cast of the charcoal ink.

| Token | Light | Dark |
|---|---|---|
| `sage` (page) | `#e8ebe6` | `#111310` |
| `surface` | `#ffffff` | `#1a1d18` |
| `sage-light` / `sage-pill` / `sage-surface` | `#f1f4ef` / `#eef1ec` / `#f6f8f5` | `#21251f` / `#262a24` / `#1e211c` |
| `sage-border` / `-light` / `-dark` | `#dfe4dd` / `#edf0eb` / `#d7dcd5` | `#30352d` / `#262a24` / `#3b4137` |
| `sage-muted` / `sage-subtle` | `#646862` / `#454745` | `#a2a79e` / `#c6cac2` |
| `brand-dark` (text) | `#0e0f0c` | `#e8ebe6` |
| `brand` / `brand-hover` | `#9fe870` / `#8fe25f` | `#9fe870` / `#b2f08a` |
| `on-brand` | `#0e0f0c` | `#0e0f0c` |
| `inverse` / `inverse-hover` / `inverse-border` | `#0e0f0c` / `#252824` / `#0e0f0c` | `#080907` / `#21251f` / `#3b4137` |
| `on-inverse` / `inverse-muted` | `#ffffff` / `#f1f4ef` | `#e8ebe6` / `#c6cac2` |
| `on-status` | `#ffffff` | `#0e0f0c` |
| `success` / `-bg` / `-surface` / `-dark` / `-text` | `#2ead4b` / `#eef8e6` / `#e3f6d8` / `#054d28` / `#47872b` | `#4cc766` / `#16271a` / `#1b3320` / `#8fe0a0` / `#8fd46f` |
| `warning` / `-bg` / `-light` / `-border` / `-dark` / `-text` | `#b86700` / `#fff7d9` / `#fff0bb` / `#eadca9` / `#8c6e1e` / `#4a3b1c` | `#e8a23a` / `#2b2312` / `#3a2e14` / `#5a4a22` / `#e3b453` / `#f2dfac` |
| `danger` / `-bg` / `-light` / `-dark` | `#d03238` / `#fce8e8` / `#fffbfb` / `#a7000d` | `#ff6b70` / `#351517` / `#2a1314` / `#ff8f94` |

Every text pair in the dark palette meets WCAG AA (≥ 4.5:1) — e.g. `sage-muted` on `surface` 6.9:1, `danger` on `surface` 6.2:1, `on-status` on `danger` 7.0:1.

**Color rules for components**
- Never use `bg-white`, `text-white` or Tailwind palette colors (`gray-*`, `emerald-*`, `amber-*`…) in `.vue` files. Use `bg-surface`, `text-on-*` and the semantic families.
- Text on the green is `text-on-brand`, never `text-brand-dark` — the latter turns light in dark mode.
- Dark featured blocks use `bg-inverse` + `text-on-inverse` / `text-inverse-muted`. Inside them, do not use `text-sage-border` or `text-sage-light` as text; those become dark in dark mode.
- Solid status fills (`bg-danger`, `bg-success`, `bg-warning`) take `text-on-status`.
- Modal backdrops use `bg-overlay/50` or `/60`. Native `<dialog>::backdrop` keeps a literal `rgb()` because custom properties are not reliably inherited by `::backdrop`.
- Translucent white (`bg-white/10`, `border-white/10`) is allowed only inside `bg-inverse` blocks, which stay dark in both themes.
- `.focus-ring` draws its offset with `ring-offset-surface`, so the gap matches the background in both themes.

### 4. Data Ingestion & Closed Cycle UI Patterns
- **Closed Cycle Cards**: Visual representation of monthly competencies (`Dezembro`, `Novembro`, `Outubro`) with dual-base requirements (RH + Vendas).
- **StatusBadges**: Canonical status pills (`neutral`, `success`, `warning`, `danger`) dynamically colored by semantic tone classes.
- **Atomic Validation Banner**: If impeditivo errors or relational cross-check failures occur, the strict mandatory alert is displayed:
  > *"Planilha com pendências: corrija e envie novamente"*

### 5. Asynchronous Background Processing & Non-blocking Feedback Patterns
- **Topbar Progress Pill (`Topbar.vue`)**:
  - Live animated widget placed at the top-right header:
    - **In progress**: Amber warning pill (`border-warning-border bg-warning-bg`) with spinner icon, active stage, and percentage (`0% - 100%`).
    - **Success**: Emerald success pill (`border-success/30 bg-success-bg text-success`) with checkmark, direct modal reopen link, and dismiss button.
    - **Error**: Rose error pill (`border-danger/30 bg-danger-bg text-danger`) with warning icon and direct link to diagnosis.
- **Modal In-Progress Step Checklist (`UploadBaseModal.vue`)**:
  - Step-by-step visual tracker inside the modal separating Stage 1 (RH) and Stage 2 (Vendas), with dynamic status (`Aguardando`, `Em validação...`, `Concluída`).
  - Button **"Continuar navegando em segundo plano"** (`bg-inverse text-on-inverse hover:bg-inverse-hover`) allowing the user to unmount the modal without aborting the background promise.
- **Reactive Competency Card Progress (`DataView.vue`)**:
  - When a background ingestion is active for a specific month, the card renders a top pulsating accent line (`bg-brand animate-pulse`) and an inline progress bar with real-time percentage and status copy.
- **Global Toast Notification Surface (`ToastContainer.vue`, `notificationStore.js`)**:
  - Floating alerts (`fixed bottom-5 right-5 z-[9999]`) with smooth enter/leave transitions, adhering to the semantic token palette (`success`, `warning`, `danger`, `info`).
  - Actionable CTAs: Allows direct reopening of the modal (`actionLabel: "Ver Relatório"` / `"Ver Diagnóstico"`) from anywhere in the application.


