---
version: alpha
name: Cloudflare
description: "Welcome to Cloudflare - Powering the next generation of applications"
sourceUrl: "https://www.cloudflare.com & https://developers.cloudflare.com"

colors:
  primary: "#ff5e1f"
  on-primary: "#ffffff"
  accent: "#ff7038"
  light:
    background: "#ffffff"
    surface: "#fdfdfc"
    border: "#f0f0f0"
    text: "#262626"
    text-muted: "#666666"
  dark:
    background: "#0d0e12"
    surface: "#16181d"
    surface-elevated: "#1e2028"
    border: "#272a34"
    text: "#f4f4f5"
    text-muted: "#9ca3af"

typography:
  display:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.8px
  heading:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 19px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.48px
  body:
    fontFamily: "FT Kunst Grotesk, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.14px
  mono:
    fontFamily: "Apercu Mono Pro, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 32, 40, 48, 60, 112, 128]

radius:
  sm: 1px
  md: 2px
  lg: 3px
  xl: 4px
  pill: 9999px

shadows:
  card: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 80, 10, 0.06) 0px 4px 60px 0px, rgba(0, 0, 0, 0.03) 0px 2px 12px 0px"
  elevated: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 80, 10, 0.06) 0px 4px 60px 0px, rgba(0, 0, 0, 0.03) 0px 2px 12px 0px"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  duration-slow: 2000ms
  easing: "cubic-bezier(0.19, 1, 0.22, 1)"

breakpoints: [400px, 426px, 550px, 768px]
---

## Rationale

Cloudflare's design system projects technical competence and enterprise reliability through a deliberately restrained, high-contrast aesthetic. The system operates across two primary environments: an authoritative enterprise light mode (`www.cloudflare.com`) and a high-efficiency developer dark mode (`developers.cloudflare.com`).

The measured tokens reveal a system built around clarity over decoration: crisp text contrast, dark obsidian backgrounds in developer surfaces, and a bold signature orange accent (`#ff5e1f`) that punctuates CTAs and moments of emphasis across both modes. This is a working professional interface where every color choice signals purpose. The typography stack (FT Kunst Grotesk) is geometric and modern, with aggressive negative letter-spacing at display scales that creates visual density and forward momentum, reinforcing the messaging around infrastructure scale and performance. The sparse shadow system and minimal radius values (1–4px, never heavily rounded) reinforce a "no-nonsense" industrial feel that aligns with a company positioning itself as the backbone of the internet.

The spacing scale is deliberately shallow—base unit of 4px with a carefully bounded progression—which keeps the visual system tight and efficient. This reflects a product category where density and scannability matter more than breathing room.

## 1. Visual Theme & Atmosphere

Cloudflare's visual identity reads as **technical minimalism**. 
- **Light Mode (Enterprise / Main Site)**: Flat, structured canvas with near-white surfaces (`#fdfdfc`) and dark charcoal copy (`#262626`). Visual noise is eliminated to build trust in enterprise contexts.
- **Dark Mode (Developer Docs / Technical Tooling)**: High-density dark canvas (`#0d0e12`) paired with elevated obsidian containers (`#16181d`) and crisp white typography (`#f4f4f5`). Designed to reduce eye strain for developers working in code-heavy environments.

## 2. Color System

**Primary Accent (`#ff5e1f`, Cloudflare Orange):** A warm, energetic orange deployed on CTAs, active indicators, and interactive elements across both Light and Dark modes.

**On-Primary (`#ffffff`):** Inverted text and icons on orange backgrounds ensure legibility.

### Light Mode Palette
- **Background (`#ffffff`)**: Hero sections, primary page canvas.
- **Surface (`#fdfdfc`)**: Cards, sidebar containers, alternating sections.
- **Border (`#f0f0f0`)**: Subtle dividers and panel boundaries.
- **Text (`#262626`)**: Dark charcoal for maximum body text readability.
- **Text Muted (`#666666`)**: Secondary labels, metadata, inactive icons.

### Dark Mode Palette (Cloudflare Developers Style)
- **Background (`#0d0e12`)**: Deep slate / obsidian canvas for dark mode layout background.
- **Surface (`#16181d`)**: Elevated card containers, table backgrounds, sidebar surface.
- **Surface Elevated (`#1e2028`)**: Dropdown menus, popovers, modal dialogs, and hover states.
- **Border (`#272a34`)**: Subtle dark borders maintaining clear section demarcation.
- **Text (`#f4f4f5`)**: Bright neutral white for high contrast body text and headers.
- **Text Muted (`#9ca3af`)**: Cool grey for secondary copy, code annotations, and subheadings.

**Interactive Accent Hover (`#ff7038`):** A slightly brighter orange for hover feedback across both themes.

## 3. Typography

**Font family:** FT Kunst Grotesk is a geometric, contemporary sans-serif with geometric proportions. It projects modernity and clarity—common in tech infrastructure brands.

**Display scale (32px, 500 weight, -0.8px letter-spacing):** Hero headlines are set loose but compressed laterally, creating a tense, forward-moving energy. The negative spacing makes large text feel denser and more impactful.

**Heading scale (19px, 400 weight, -0.48px letter-spacing):** Maintains the geometric visual voice for component headers.

**Body (14px, 400 weight, 1.15 line height, -0.14px letter-spacing):** Readable and compact for web dashboards and documentation.

**Mono (Apercu Mono Pro, 12px, 1.5 line height):** Code blocks and data contexts; 1.5 line height gives breathing room to code.

## 4. Components & Patterns

**CTA Buttons:** Orange primary fill (`#ff5e1f`) with white text. Buttons feature minimal styling—flat fills, small radius (1–4px, nearly square), and no heavy shadow. On hover, the accent color (`#ff7038`) provides interactive feedback.

**Cards and Surfaces:**
- *Light Mode*: Off-white background (`#fdfdfc`) with 1px inset borders (`#f0f0f0`).
- *Dark Mode*: Obsidian background (`#16181d`) with dark inset borders (`#272a34`).

### 4.1 Cloudflare Segmented Tab Panel (Tab Style - Image 1)
- **Header Bar**: Full-width dark tab bar with 1px bottom border (`border-b border-[#272a34]`).
- **Tab Items**: Separated by vertical 1px borders (`border-r border-[#272a34]`).
  - *Inactive Tab*: Muted text (`#9ca3af`), dark background (`#0d0e12`), subtle hover highlighting (`hover:text-white hover:bg-[#16181d]`).
  - *Active Tab*: Crisp white text (`#ffffff`), active orange accent border (`border-b-2 border-[#ff5e1f]`), slightly elevated dark background (`bg-[#16181d]`).
- **Content Area**: Dark container (`#16181d` / `#0d0e12`) featuring:
  - Sub-icon with colored border glow (e.g. `bg-purple-500/10 border border-purple-500/30 text-purple-400`).
  - Embedded Mono Code Snippet box (`bg-[#0d0e12] border border-[#272a34] font-mono text-sm p-3 rounded-lg`).
  - Pill CTA Button (`rounded-full border border-gray-700 text-xs px-4 py-1.5 hover:border-[#ff5e1f]`).

### 4.2 Cloudflare Grid KPI Cards (Grid Card Style - Image 2)
- **Grid Layout**: Outer container with a unified 1px dark grid border (`border border-[#272a34] divide-x divide-y divide-[#272a34] bg-[#0d0e12]`).
- **Card Structure**:
  - **Header Meta Row**:
    - Left: Date / Timestamp in mono text (`font-mono text-[11px] text-gray-500`).
    - Right: Category / Metric Tag in uppercase orange mono text (`font-mono text-[11px] text-[#ff5e1f] tracking-wider uppercase`).
  - **Card Title**: Medium weight headline (`text-white text-base md:text-lg font-medium`).
  - **Card Body**: Compact description or metric details in muted grey (`text-sm text-gray-400`).
  - **Footer Link**: Interactive action link with arrow (`text-xs text-gray-300 hover:text-[#ff5e1f] flex items-center gap-1.5 mt-auto pt-4`).
- **Featured Card Variant**: Top-left primary card features a subtle dark grid texture background, orange status dot (`•`), and prominent title sizing.

### 4.3 Cloudflare Top Title Bar (Developers Title Bar Style)
- **Top Sticky Bar**: Full-width top bar (`border-b border-[#f0f0f0] dark:border-[#272a34] bg-white/90 dark:bg-[#16181d]/90 backdrop-blur-md sticky top-0 z-50`).
- **Left Logo & Badge**:
  - Brand Logo + Icon in Cloudflare Orange (`#ff5e1f`).
  - Mono Pill Badge (e.g. `DOCS` / `DASHBOARD`): `bg-gray-100 dark:bg-[#272a34] text-[#262626] dark:text-gray-300 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700`.
- **Center Quick Nav Links**: Muted links (`Directory`, `API`, `SDKs`, `Changelog`) using `text-[#262626] dark:text-gray-300 hover:text-[#ff5e1f] text-xs font-medium`.
- **Right Utilities & CTA**:
  - Search trigger box with `⌘ K` keyboard shortcut badge.
  - Quick Theme Toggle button.
  - Primary Action Pill Button: `bg-[#ff5e1f] text-white rounded-full px-4 py-1.5 text-xs font-medium hover:bg-[#ff7038]`.

### 4.4 Background Grid Texture & Hero Header
- **Background Canvas**: Deep slate obsidian (`#0d0e12`) canvas overlaid with a subtle radial dot matrix background texture (`bg-[radial-gradient(#272a34_1px,transparent_1px)] [background-size:16px_16px]`).
- **Hero Title**: Large display heading (`font-display font-semibold text-3xl md:text-4xl text-[#262626] dark:text-white tracking-tight`).
- **Hero Subtitle**: Readable muted description (`text-[#666666] dark:text-gray-400 text-sm md:text-base`).
- **Hero Action Pills**:
  - Primary Pill: `bg-[#ff5e1f] text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-[#ff7038] shadow-sm`.
  - Secondary Pill: `rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#262626] dark:text-gray-200 text-sm px-4 py-2 hover:border-[#ff5e1f]`.

**Focus and Interactive States:** Smooth transition timings (100–200ms) with a spring-like easing curve (`cubic-bezier(0.19, 1, 0.22, 1)`) provide deliberate, controlled feedback.



## 5. Spacing & Layout

The spacing scale `[4, 8, 12, 16, 32, 40, 48, 60, 112, 128]` is **shallow and granular**. A 4px base unit allows precise, tight compositions without creating visual clutter.

**Breakpoints:** `[400px, 426px, 550px, 768px]` mobile-first responsive layout grid.

## 6. Motion & Interaction

**Duration Tokens:**
- Fast (`100ms`): Focus states, button hovers.
- Base (`200ms`): Component state changes, dropdown expands.
- Slow (`2000ms`): Section reveals or progress indicators.

**Easing:** `cubic-bezier(0.19, 1, 0.22, 1)` provides a responsive, high-precision motion feel.

## Accessibility

### Contrast Ratios

**Light Mode Primary: `#262626` (text) on `#ffffff` (background):**
- Contrast ratio ≈ **40.5:1** — exceeds WCAG AAA (7:1).

**Dark Mode Primary: `#f4f4f5` (text) on `#0d0e12` (background):**
- Contrast ratio ≈ **16.2:1** — exceeds WCAG AAA (7:1).

**White Text on Orange CTA (`#ffffff` on `#ff5e1f`):**
- Contrast ratio ≈ **3.8:1** — suitable for large text and buttons, but recommend using bold font weights or elevated button padding for visual distinction.

### Minimum Requirements

- **Touch Target:** Minimum 44×44px interactive targets on mobile.
- **Focus Ring:** 2px outline with 2px offset (`#ff5e1f` accent in light mode; `#ff5e1f` or high-contrast ring in dark mode).
- **Reduced Motion:** Honor `prefers-reduced-motion` by dropping transition durations to 0ms for users who opt out of animations.

