# File: DESIGN.md
# LEVEL 4 TRUTH: VISUAL & UI/UX SPECIFICATIONS

## 1. Visual Core Philosophy
- **Vibe:** Soft, modern, minimalistic, highly approachable.
- **Inspiration:** Vercel Dashboard, Stripe Sigma.
- **Key Characteristics:** Exaggerated border radii, large diffuse colored shadows, borderless cards, and stark vibrant accents for status identification.

## 2. Color Palette (Strict Tokens)
| Role | Token | Hex Code | Description |
| :--- | :--- | :--- | :--- |
| **Primary** | `primary` | `#8B5CF6` | Vivid Violet (Main buttons, active states, chart lines) |
| **Background** | `background-light`| `#F8FAFC` | Ghost White (Main application canvas) |
| **Surface** | `surface` | `#FFFFFF` | Pure White (Cards, modals, dropdowns) |
| **Text Main** | `text-main` | `#0F172A` | Slate 900 (Headings, primary data points) |
| **Text Muted**| `text-muted` | `#64748B` | Slate 500 (Secondary text, table headers) |
| **Success** | `success` | `#10B981` | Emerald 500 (200 OK, healthy status) |
| **Warning** | `warning` | `#F59E0B` | Amber 500 (4xx Errors, rate limits, warnings) |
| **Error** | `error` | `#F43F5E` | Rose 500 (5xx Errors, critical failures, destructive actions) |

## 3. Typography
- **Headings:** `Outfit` (Weight: 600 SemiBold). Used for page titles, card headers, and large numeric data.
- **Body:** `Plus Jakarta Sans` (Weights: 400 Regular, 500 Medium). Used for all standard text, descriptions, and labels.
- **Monospace:** `JetBrains Mono` (Weights: 400, 500). Strictly reserved for logs, terminal outputs, JSON payloads, and route paths.

## 4. Layout & Effect Tokens
- **Radii:**
  - `card`: `20px` (Extremely rounded corners for all surface elements).
  - `pill`: `9999px` (Fully rounded for buttons, status tags, and search bars).
- **Shadows:**
  - `soft`: `0 10px 30px -10px rgba(15, 23, 42, 0.05)` (Default card elevation).
  - `glow`: `0 10px 25px -5px rgba(139, 92, 246, 0.25)` (Primary-tinted hover state for active/clickable elements).

## 5. Core Component Specifications
- **Sidebar Navigation:** Fixed width `280px`. Transparent/blurred background blending with the main canvas. Active states use primary color with `10%` opacity background.
- **Stat Cards:** Clean `#FFFFFF` surface. Strictly borderless (or extremely subtle `#F1F5F9` 1px border if needed). Uses `shadow-soft`, transitioning to `shadow-glow` on hover.
- **Traffic Chart (Recharts):** Monotone curved lines. Gradient fill dropping from `primary` (30% opacity) to transparent at the baseline. No hard grid lines (dashed/dotted light gray only).
- **Live Log Terminal:** Dark surface (`#0F172A`). Monospace typography. Individual log rows must highlight (`bg-slate-800/50`) on hover with a quick transition (`150ms ease`).

## 6. Tailwind Implementation Mapping
These tokens MUST be mapped exactly in `apps/web/tailwind.config.ts` under `theme.extend`:
- Colors map to `colors` object.
- Fonts map to `fontFamily` (`display`, `body`, `mono`).
- Radii map to `borderRadius` (`card`, `pill`).
- Shadows map to `boxShadow` (`soft`, `glow`).