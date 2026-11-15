# ASTRA-HEALTH frontend design system

All tokens live in `src/index.css` (Tailwind v4 `@theme` + CSS variables). Change a value there and every page follows.

## Colour
| Token | Value | Use |
|---|---|---|
| `petrol` | `#142B2D` | dark surfaces, text on ivory, button text |
| `petrol-deep` / `petrol-raised` | `#0E2022` / `#1A3639` | navigation rail and inputs / cards |
| `ivory` | `#F6F0E4` | text on dark, reading sections (Method, Login) |
| `apricot` | `#FFA782` | primary action only |
| `celadon` | `#B6D4C4` | active navigation, small highlights, "nominal" status |

Greys are ivory mixed into petrol. Health status needs three distinguishable states, so two functional colours
sit outside the four-colour palette: caution `#F0C36B` and attention `#F0857A`. Status is always shown with a word or icon too.

## Type
Barlow Semi Condensed 600 (headings) and Instrument Sans 400-600 (everything else), bundled through `@fontsource`, so no external font request.

| Role | Class | 390px | 1440px |
|---|---|---|---|
| Hero | `t-hero` | 48 | 112 |
| Section heading | `t-section` | 36 | 72 |
| Subheading | `t-sub` | 24 | 32 |
| Body | `t-body` (60ch max) | 16 | 19 |
| Navigation, buttons | `t-ui` | 16 | 16 |
| Caption | `t-caption`, `t-eyebrow` | 13 | 14 |

## Layout
- Gutter: `--gutter` = 20px, 6vw from 1024px. Use the `gutter` utility.
- Dividers: `rule-t`, `rule-b` (1px, 16% ivory).
- Signature detail: `.link-line`, a 1px underline that extends from the left when a link is active. Used by the landing nav, the app navigation rail, the mobile menus and the login tabs.
- Controls: `.btn-primary` (apricot, petrol text), `.btn-quiet` (outlined). Minimum height 48px.

## 3D sequence
`src/components/scene/Scene.jsx` builds the model in three.js. `KEYS` holds three camera beats for three aspect classes
(`wide`, `mid`, `portrait`); each beat sets where the model sits in the frame so the copy in `pages/Landing.jsx` has open space:
wide = model right, left, right; portrait = model low, high, low. Copy blocks use `.copy-scrim` where a ring passes behind text.
three.js is lazy-loaded and only on the landing and login pages.

## Routes
`/` landing (public) · `/login` · `/dashboard`, `/health-check`, `/monitoring`, `/assessment`, `/human-body`, `/guidance`, `/reports` (signed in).

## Build
```
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :8000
npm run build    # writes to ../backend/static (also copied to ./dist in this package)
```
