# four-thousand weekz

⬢⏣⬡ your life visualized in hexagons ⬡⏣⬢

**Live:** [fz.ax](https://fz.ax)

A quiet, local-first memento mori. Each hexagon is one week of your life. Mark the weeks that mattered. Whisper the reasons. Notice the shape of time.

## Soul

- **Quiet over loud.** No gamification, no streaks, no achievements.
- **Personal over social.** No accounts, no sharing, no cloud sync.
- **Contemplative over engaging.** Not optimized for return visits — optimized for presence.
- **Local-first.** Your state lives in `localStorage`. Backup is a JSON file you manage yourself.
- **Memento mori.** The average human life is four-thousand weeks. This is a quiet place to notice them.

## Features

The app ships 24 features across six stages, fully implementing [the parent spec](docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md).

### The grid (F0)

- 4000 hexagons laid out responsively (21 cols desktop / 12 tablet / 7 mobile)
- Click any week to open the Mark popover — type one character or pick from your personal palette, add a whisper
- Hover any hexagon to see its date range
- The current week pulses with a 2.4s breathing glow

### Tier 1 — rituals (F1.1-F1.8)

- **F1.1 Sunday Whisper** — quiet modal on Sunday evenings asking what you want to remember about the week
- **F1.2 Library** — rotating curated quotes from contemplative writers
- **F1.3 Echo** — a random past whisper surfaces once per day
- **F1.4 Poster** — SVG export of your grid with all marks baked in (A2 portrait)
- **F1.5 Backup / Restore** — JSON file export and import, hand-written validator
- **F1.6 Installable PWA** — hand-written service worker (no Workbox), cache-first app shell, offline-capable
- **F1.7 Sunday Push** — best-effort local notification via Notification Triggers API on Chromium desktop
- **F1.8 Easter egg** — an ASCII hexagon in the DOM comments

### Tier 2 — calendar of rituals (F2.1-F2.9)

- **F2.1 The Vow** — a single-sentence yearly intent in italic blue under the title. Click or press `V`
- **F2.2 Monday Ceremony** — live at midnight Monday, the current hexagon transforms in place; after-the-fact notice on reload
- **F2.3 Constellation Lines** — click a marked week and every week with the same glyph lights up
- **F2.4 Anniversary Echo** — whispers from the same week-of-year in previous years; takes precedence over F1.3
- **F2.5 Solstice / Equinox** — on the four mile-marker days, the page transforms: dark navy, slowed 5.5s breathing cycle, small-caps header
- **F2.6 Quiet Mode** — press `Q` to strip chrome and leave only the grid edge-to-edge
- **F2.7 Whisper Search** — press `/` to search whispers; matches light up, non-matches dim
- **F2.8 Long Now footer** — `02026 · the long now` with the leading zero in yellow
- **F2.9 Anchored Weeks** — right-click or long-press any week to anchor it as a life landmark; red rings on grid and poster

### Tier 3 — the final dreams (F3.1-F3.5)

- **F3.1 First Run Ceremony** — three click-to-advance screens before the date input; 1500ms click delay per screen forces reading
- **F3.2 Birthday Hexagon** — thin gold halo on each of the 77 birthday weeks across your grid
- **F3.3 The Annual Letter** — on your birthday week, write a sealed letter to yourself one year from now; auto-unseals next year
- **F3.4 Dark Mode** — designed (not inverted) dark variant; auto by `prefers-color-scheme`, manual override in prefs; solstice keeps its own palette
- **F3.5 Keyboard navigation** — arrow cursor moves across the grid, `Enter` opens the popover, `?` shows the shortcut overlay

## Keyboard shortcuts

| Key | Action |
|---|---|
| `↑` `↓` `←` `→` | Move the cursor |
| `Enter` | Mark the focused week |
| `V` | Edit your vow |
| `Q` | Quiet mode |
| `/` | Search whispers |
| `?` | Show this help overlay |
| `Esc` | Close the top modal / cursor / highlight |

Right-click (or long-press on touch) any week to anchor it.

## Non-goals

Listing these protects the soul:

- No user accounts. Ever.
- No cloud sync. Backup is a JSON file you manage.
- No analytics, telemetry, or tracking.
- No social features. No sharing, profiles, friends, leaderboards, comments, likes.
- No third-party scripts. No CDN fonts, no widgets, no chat.
- No SSR. Pure static generation.
- No backend. Not even one serverless function.
- No gamification. No badges, points, streaks, achievements.
- No AI features. You write your own life.

## Tech stack

- **Framework:** [Nuxt 3](https://nuxt.com) with `ssr: false` + static generation
- **Language:** TypeScript strict (`noUncheckedIndexedAccess`), no `any` without justification
- **State:** Single `useFzState` composable singleton, hand-rolled
- **Service worker:** Hand-written `sw.js` (no Workbox, no `@vite-pwa/nuxt`)
- **Tests:** Vitest with happy-dom, 312 passing
- **Hosting:** GitHub Pages via custom domain (Cloudflare DNS-only)
- **Dependencies:** Zero third-party runtime libraries outside the Vue/Nuxt core

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm typecheck    # nuxt typecheck
pnpm lint         # eslint
pnpm generate     # static build → .output/public
```

## Stages

Each stage corresponds to a tag in the repo history:

| Tag | Stage | Features |
|---|---|---|
| `stage-1-foundations` | 1 | TypeScript refactor + GH Pages deploy |
| `stage-2-mark-whisper` | 2 | F0 — interactive mark + whisper popover |
| `stage-3-tier-1-rituals` | 3 | F1.1-F1.5 + F1.8 — Sunday, Library, Echo, Poster, Backup, Easter |
| `stage-4-pwa-sunday-push` | 4 | F1.6 + F1.7 — installable PWA + notifications |
| `stage-5-tier-2-rituals` | 5 | F2.1-F2.9 — Vow, Monday, Constellation, Anniversary, Solstice, Quiet, Search, Long Now, Anchors |
| `stage-6-tier-3-dreams` | 6 | F3.1-F3.5 — First Run, Birthday, Letter, Dark, Keyboard — **feature-complete** |

Each stage was shipped via a multi-round adversarial review process. See `docs/superpowers/specs/` for design specs and `docs/superpowers/plans/` for implementation plans.

## License

[MIT](LICENSE).

fz.ax is a personal practice turned into software. The code is open source for the purpose of trust: you can audit it, verify there is no telemetry, and confirm your data never leaves your device. Forks are welcome if they honor the soul.

---

⎇ written quietly, one hexagon at a time
