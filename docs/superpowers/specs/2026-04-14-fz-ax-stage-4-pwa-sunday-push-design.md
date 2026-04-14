---
title: fz.ax Stage 4 · PWA + Sunday Push
status: draft
date: 2026-04-14
author: autopilot run
parent: docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md
stage: 4
feature_ids: [F1.6, F1.7]
---

# fz.ax Stage 4 · PWA + Sunday Push

> The site becomes installable. The week closes on its own.

## Goal

Stage 4 is the smallest stage in the whole redesign: two features, both touching new ground (service workers, notifications) rather than extending the reactive data flow. After Stage 4, fz.ax is an **installable Progressive Web App** that works fully offline, and users on supported browsers can opt into a **Sunday evening local notification** that reminds them to whisper to the closing week — without a server, without an account, without a third-party SW library.

**In scope:**
- **F1.6 Installable PWA + offline** — finish the web-app manifest, hand-write a cache-first service worker, register it on first load, expose a toolbar "install" button that fires the `beforeinstallprompt` event when the browser offers one.
- **F1.7 Sunday Push notification** — best-effort local notification via the Notification Triggers API, scheduled by the service worker, opt-in tracked in `prefs.pushOptIn`, silent on browsers that don't support `TimestampTrigger`. The in-app Sunday Whisper modal (F1.1, Stage 3) remains the primary path.

**Out of scope:** everything Tier 2 (Stage 5) and Tier 3 (Stage 6). No push UI beyond a single toggle. No recurring-notification fallbacks for unsupported browsers. No backend. No analytics. No icon regeneration — the existing 192/512 maskable PNGs in `public/` are reused.

## Context

Stage 3 (shipped, tag `stage-3-tier-1-rituals`) added the Sunday ritual, Library, Echo, Poster, Backup, and Easter Egg surfaces. `FzState.prefs.pushOptIn` was reserved in the Stage 1 data model for exactly this moment — Stage 4 populates it. `FzToolbar` already holds poster/backup/restore buttons and is the natural home for the new install + push toggle affordances.

The existing `public/site.webmanifest` is minimal:

```json
{
  "name": "4000",
  "short_name": "4000",
  "icons": [
    { "src": "/web-app-manifest-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/web-app-manifest-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

Stage 4 enhances it but doesn't break it.

## Soul (unchanged)

- Local-first only. No backend, no cloud, no analytics, no third-party scripts, no bundler plugins that would pull in runtime code.
- The service worker is **hand-written** (~60 lines). No Workbox, no `@vite-pwa/nuxt`, no framework-owned SW.
- Push notification is **best-effort**, **opt-in**, and **browser-permitting**. Users on Firefox / Safari / iOS never see it, and the in-app Sunday modal remains fully functional as their primary ritual path.
- One page, one purpose. The new toolbar buttons hide when they would be useless (install hides if the app is already installed or can't be installed; push hides if the browser can't schedule it).
- Yellow `#F7B808` + blue `#0847F7`. Hexagon symbols in the new button glyphs.

## Feature design

### F1.6 · Installable PWA + offline

**Service worker (`public/sw.js`)** — hand-written, ~60 lines, two responsibilities:

1. **Cache the app shell on install.** Pre-cache a small set of essential URLs: `/`, `/site.webmanifest`, `/favicon.ico`, `/favicon.svg`, the 192/512 icons, and `/apple-touch-icon.png`. Runtime JS/CSS files have hashed names (emitted by Nuxt into `/_nuxt/*`) and are cached on-demand via the fetch handler.

2. **Fetch strategy:**
   - **Document request (`request.mode === 'navigate'`):** network-first with cache fallback. So the user always gets the latest index.html when online, and a cached copy when offline.
   - **Everything else (assets):** cache-first. Check cache, fall back to network, store the response for next time.

3. **Activate / upgrade:** on activate, delete any old cache versions (we version the cache name via a `CACHE_VERSION` constant). Call `self.clients.claim()` so a new SW takes over existing tabs immediately.

4. **`skipWaiting()`** on install so a new SW activates on the next load without waiting for all tabs to close. Safe for this app because there are no in-flight mutations the new SW would clobber.

5. **No IndexedDB, no Background Sync, no Periodic Sync.** Stage 4 explicitly doesn't reach for APIs beyond what's needed.

**`composables/usePwa.ts`** — the main-thread glue:

- `registerServiceWorker()` — called once from `FzPage.onMounted`. If `'serviceWorker' in navigator`, register `/sw.js` with scope `/`. Returns a promise of the registration or null. Failures are swallowed (SW registration can fail in incognito, on file://, etc).
- `useInstallPrompt()` — composable that listens for `beforeinstallprompt`, stores the deferred event in a ref, and exposes a `promptInstall()` function that calls `event.prompt()`. Also tracks whether the app is already installed via `matchMedia('(display-mode: standalone)').matches`.
- Exposes reactive refs: `canInstall`, `isInstalled`, plus push-related refs defined below.

**`components/FzInstallButton.vue`** (or integrated into `FzToolbar.vue`) — a small button that shows when `canInstall && !isInstalled`, calls `promptInstall()` on click, and hides once the prompt resolves.

**Manifest enhancements (`public/site.webmanifest`):**
- `name`: `"four-thousand weekz"` (was `"4000"`)
- `short_name`: `"4000"` (unchanged)
- `description`: `"your life visualized in hexagons"`
- `start_url`: `"/"`
- `scope`: `"/"`
- `theme_color`: `"#F7B808"` (was `"#ffffff"` — matches the yellow brand accent)
- `background_color`: `"#FFFFFF"` (unchanged)
- `display`: `"standalone"` (unchanged)
- `orientation`: `"portrait-primary"` — matches the tall grid aesthetic

Icons unchanged (the existing 192/512 maskable PNGs stay).

**Nuxt config additions (`nuxt.config.ts`):**
- Add a `<link rel="manifest" href="/site.webmanifest">` entry already exists in `app.head` — keep.
- Add a `<meta name="theme-color" content="#F7B808">` so iOS Safari uses the brand accent in the status bar when the app is installed.
- Add a `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` if not already present (it is).

No build-time changes. `public/sw.js` is copied verbatim to `.output/public/sw.js` by `nuxt generate` because everything in `public/` is copied as-is.

### F1.7 · Sunday Push notification

**Feature detection.** The Notification Triggers API (`TimestampTrigger`) is currently implemented only in Chromium-based desktop browsers (Chrome/Edge). The check is:

```ts
const supportsTimestampTriggers = (
  typeof window !== 'undefined'
  && 'Notification' in window
  && 'serviceWorker' in navigator
  && 'showTrigger' in Notification.prototype
)
```

If false, the push toggle button never appears in the toolbar and the composable's `scheduleSundayPush` / `cancelSundayPush` functions are no-ops that return cleanly. Firefox, Safari, and iOS users see nothing new — their primary ritual path remains the in-app F1.1 Sunday Whisper modal.

**Scheduling logic (`composables/usePwa.ts` extension):**

```ts
async function scheduleSundayPush(registration: ServiceWorkerRegistration): Promise<void> {
  if (!supportsTimestampTriggers) return
  if (Notification.permission !== 'granted') return

  // Remove any existing scheduled notification for fz.ax Sunday
  // so we always end up with exactly one scheduled at the next 21:00.
  const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true })
  for (const n of existing) n.close()

  const nextSunday = nextSundayAt21(new Date())
  await registration.showNotification('⏣ this week is closing', {
    body: 'what do you want to remember about it?',
    tag: 'fz-ax-sunday',
    icon: '/web-app-manifest-192x192.png',
    badge: '/favicon-48x48.png',
    showTrigger: new TimestampTrigger(nextSunday.getTime()),
  } as NotificationOptions & { showTrigger: TimestampTrigger })
}
```

Where `nextSundayAt21(from: Date): Date` is a pure utility in `utils/date.ts` that computes the next Sunday at 21:00 local time, skipping to next week if today is Sunday and the clock is already past 21:00.

**Re-scheduling.** TimestampTrigger fires the notification once then is done. The trigger needs to be re-scheduled weekly. Two paths handle this:

1. **On every page load with `pushOptIn: true`**, `usePwa` re-calls `scheduleSundayPush(registration)` which cancels any existing `fz-ax-sunday` notification and creates a fresh one for the next Sunday. Idempotent.
2. **No SW-side re-scheduling.** We don't try to re-schedule from inside the notificationclick handler because we'd need to persist state across SW invocations, which complicates things. The user visiting the site once a week is sufficient — and if they don't visit for a month, the notifications just don't fire, which is the correct outcome for a tool that lives on the user's terms.

**Permission flow.**

1. User clicks the bell button in the toolbar (visible only when `supportsTimestampTriggers === true`).
2. If permission is already `'granted'`, toggle `prefs.pushOptIn`. If enabling, call `scheduleSundayPush`. If disabling, call `cancelSundayPush`.
3. If permission is `'default'`, call `Notification.requestPermission()`. On grant, set `pushOptIn: true` and schedule. On deny, do nothing (leave `pushOptIn: false`).
4. If permission is `'denied'`, show a title tooltip explaining the user needs to re-enable notifications in their browser settings. Don't try to re-prompt.

**`cancelSundayPush(registration)`:**

```ts
async function cancelSundayPush(registration: ServiceWorkerRegistration): Promise<void> {
  if (!supportsTimestampTriggers) return
  const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true })
  for (const n of existing) n.close()
}
```

**`setPushOptIn(value)` action on `useFzState`:**

New composable action that writes `prefs.pushOptIn`. Follows the Stage 2 throw-and-close pattern: asserts state is non-null, spreads `{ ...current, prefs: { ...current.prefs, pushOptIn: value } }`, calls `writeState`, throws if the write fails. UI callers wrap in `try/catch`.

**`useFzState.setPushOptIn` is the ONLY place `pushOptIn` is written.** The `usePwa` composable reads it via `state.value?.prefs.pushOptIn` but never writes directly.

## Data model (no changes)

`FzState.prefs.pushOptIn: boolean` is already in the Stage 1 type:

```ts
interface Preferences {
  theme: 'auto' | 'light' | 'dark'
  pushOptIn: boolean           // used by F1.7 starting in Stage 4
  reducedMotion: boolean | 'auto'
  weekStart: 'mon' | 'sun'
}
```

Stage 4 populates it; the validator already accepts it.

## Architecture

### New files

- **`public/sw.js`** — hand-written service worker (~60 lines). Pure JS, no modules, no TypeScript compilation. Copied verbatim from `public/` to `.output/public/` at build time.
- **`composables/usePwa.ts`** — registration, install prompt, push scheduling. Returns a reactive API.
- **`components/FzInstallButton.vue`** and **`components/FzPushButton.vue`** — two small buttons, one for install, one for push toggle. Could be combined into an `FzToolbar` extension; splitting them makes each component single-purpose and the conditional rendering cleaner.
- **`tests/usePwa.spec.ts`** — mocked tests for the composable's decision logic (can't test actual SW registration in happy-dom).
- **`tests/date.spec.ts`** (or extend existing) — tests for `nextSundayAt21`.

### Modified files

- **`public/site.webmanifest`** — metadata enhancements.
- **`composables/useFzState.ts`** — add `setPushOptIn(value: boolean)`.
- **`utils/date.ts`** — add `nextSundayAt21(from: Date): Date`.
- **`components/FzToolbar.vue`** — host the new `FzInstallButton` and `FzPushButton`.
- **`components/FzPage.vue`** — call `registerServiceWorker()` on mount.
- **`nuxt.config.ts`** — add `<meta name="theme-color" content="#F7B808">` to `app.head.meta`.
- **`tests/useFzState.spec.ts`** — add `setPushOptIn` tests.

### Composable shape

```ts
export interface UsePwaReturn {
  // Install
  canInstall: Ref<boolean>
  isInstalled: Ref<boolean>
  promptInstall: () => Promise<void>

  // Push
  supportsPush: boolean  // static, not reactive (feature detection at module init)
  pushPermission: Ref<NotificationPermission | 'unsupported'>
  enablePush: () => Promise<void>
  disablePush: () => Promise<void>

  // Setup
  register: () => Promise<ServiceWorkerRegistration | null>
}
```

## Interaction flows

### First-time install (desktop Chrome / Edge)

1. User visits fz.ax. `FzPage.onMounted` calls `usePwa.register()`, which calls `navigator.serviceWorker.register('/sw.js')`. SW installs, pre-caches the app shell, activates, claims clients.
2. A few seconds later, Chrome fires `beforeinstallprompt` on `window`. `usePwa` intercepts it, calls `preventDefault()`, stores the deferred event in a ref, sets `canInstall.value = true`.
3. `FzInstallButton` becomes visible in the toolbar (shows `⬇` glyph with `title="install"`).
4. User clicks the button. `promptInstall()` calls `event.prompt()` and awaits `event.userChoice`. If `'accepted'`, Chrome installs the app and hides the browser UI next time the user opens it.
5. After the install completes, `canInstall.value = false` (the deferred event is used up).

### First-time install (iOS Safari)

1. User visits fz.ax. SW registers and pre-caches.
2. Safari does NOT fire `beforeinstallprompt` (iOS has no programmatic install API). `canInstall.value` stays `false`.
3. `FzInstallButton` never appears.
4. To install, the user uses Safari's Share → Add to Home Screen menu. The `site.webmanifest` settings (`display: standalone`, theme_color, icons) kick in and the installed app opens without Safari chrome.

### Opt into Sunday push (supported browser)

1. User clicks the bell button (🔔 glyph, only rendered when `supportsTimestampTriggers === true`).
2. Current permission is `'default'`. `enablePush()` calls `Notification.requestPermission()`. User grants.
3. `usePwa` calls `setPushOptIn(true)` on `useFzState` — updates `prefs.pushOptIn` in localStorage.
4. `usePwa` calls `scheduleSundayPush(registration)`, which computes next Sunday 21:00 local and schedules the notification via the SW's `showNotification` with a `TimestampTrigger`.
5. The bell button's title changes to `"push on — tap to disable"` and its visual state flips.

### Notification fires (on Sunday at 21:00)

1. Browser's notification system fires the scheduled notification. The user sees a native OS toast: "⏣ this week is closing / what do you want to remember about it?"
2. User clicks the notification. Browser opens fz.ax in a new tab or focuses the existing tab. (No SW-side `notificationclick` handler in Stage 4 — we rely on the default browser behavior which is to focus/open the site.)
3. If today is Sunday evening ≥ 18:00 local and the user hasn't already been prompted, the in-app Sunday modal (F1.1) also opens on that page load — redundant but harmless, it's the same prompt.
4. On that page load, `usePwa` sees `pushOptIn === true` and re-schedules next Sunday's notification (idempotent).

### Disable Sunday push

1. User clicks the bell button again. It's currently `"push on"` with a filled glyph.
2. `disablePush()` calls `setPushOptIn(false)`, then `cancelSundayPush(registration)` which fetches any pending `fz-ax-sunday` notification and closes it.
3. Bell button returns to off state.

### Offline load

1. User opens fz.ax with no network. The SW's fetch handler serves the cached index.html.
2. The cached JS/CSS bundle loads from `/_nuxt/*` cached entries.
3. The app runs normally — all features except Sunday Push work identically because they're client-side. Library quote rotation, Echo, Sunday modal, mark popover, poster export, backup, easter egg — all functional.
4. If the user tries to use Sunday push while offline, `scheduleSundayPush` tries `registration.showNotification` which works (the SW IS registered), and the TimestampTrigger fires when the scheduled moment comes, regardless of network state.

## Visual design

### Install button (`FzInstallButton`)

- Same size and border treatment as existing toolbar buttons (36×36px, 1.5px blue border, white background, yellow glyph).
- Glyph: `⬇` (downwards arrow). Alternate: `+`, but `⬇` reads as "install" more clearly.
- Tooltip: `title="install"`, `aria-label="install fz.ax as an app"`.
- Visible only when `canInstall.value === true`.

### Push button (`FzPushButton`)

- Same size and border treatment.
- Glyph: `⏣` when off, `⏣` with a small glow when on. Simpler: just toggle color — white background when off, yellow background when on, always the `⏣` glyph.
- Tooltip off: `title="sunday push"`, `aria-label="enable sunday whisper notification"`.
- Tooltip on: `title="sunday push on — tap to disable"`, `aria-label="disable sunday whisper notification"`.
- Tooltip if denied: `title="sunday push blocked — enable in browser settings"`, button is disabled (opacity 0.4).
- Visible only when `supportsTimestampTriggers === true`.

### Toolbar ordering

The existing `FzToolbar` has three buttons (poster, backup, restore). Stage 4 adds two optional ones (install, push). Order left-to-right:

`[push] [install] [poster] [backup] [restore]`

Push and install are hidden when not applicable, so most users will see the existing 3-button toolbar. Chrome desktop users who opt in see all 5.

## Accessibility

- Both new buttons have `aria-label` and `title` attributes.
- Both use `<button>` elements with `type="button"`.
- Disabled state uses `disabled` attribute, not just CSS.
- No new modal dialogs — no new focus trap concerns.

## Testing strategy

### What is unit-tested (Vitest with happy-dom + mocks)

- **`utils/date.ts::nextSundayAt21`** — 6 tests covering: from Sunday morning, from Sunday exactly at 21:00, from Sunday evening after 21:00, from Monday, from Wednesday, from Saturday. Each asserts the returned Date is a future Sunday at local 21:00.
- **`composables/useFzState.ts::setPushOptIn`** — 4 tests: throws when state is null, sets pref correctly, persists to localStorage, round-trips through the validator.
- **`composables/usePwa.ts`** — mocked tests for decision logic: install prompt event capture, `canInstall` reactivity, `enablePush` permission flow with a mocked `Notification.requestPermission`, scheduling short-circuit when unsupported.

### What is NOT unit-tested (manual verification)

- Actual service worker registration (happy-dom doesn't emulate `navigator.serviceWorker`).
- Actual notification scheduling (can't fake the system clock in a unit test without complexity that outweighs benefit).
- Actual install prompt (Chrome-only, triggered by a real user action).
- Offline cache serving (can't simulate without a real browser).

Manual test on Chrome desktop, Safari iOS, Firefox: documented in the Stage 4 plan's smoke-test task.

## Risks and open decisions

**R1: Service worker scope on GitHub Pages + custom domain.** We serve `public/sw.js` at `https://fz.ax/sw.js`. Registering with scope `/` works because the SW is at the root and scope defaults to the containing directory. Verified by the parent spec's deployment section — `nuxt generate` copies `public/` verbatim to `.output/public/`.

**R2: SW cache invalidation on new deploys.** The `CACHE_VERSION` constant in `sw.js` is a string we bump by hand for material updates. When a new SW installs with a different `CACHE_VERSION`, the `activate` event's cleanup removes the old cache. Users get the new app shell on the next load after the new SW activates. Worst case: a user sees the old UI for one load, then the new one.

**R3: `beforeinstallprompt` timing.** The event fires asynchronously, potentially after `FzPage.onMounted`. We register the listener at composable setup time (before `onMounted` fires), so we don't miss it. The listener captures `event` into a ref that the UI reads reactively.

**R4: `TimestampTrigger` experimental status.** The API is Chromium-only and could change. We feature-detect at module init and silently hide the push affordance where it's not available. Even if Chrome removes the API, our code falls through to the unsupported branch.

**R5: Multi-tab push scheduling.** If the user has fz.ax open in two tabs, both call `scheduleSundayPush` on mount. The cancel-then-schedule pattern is idempotent: both tabs' scheduling ends up with the same single notification (the `tag: 'fz-ax-sunday'` dedupes).

**R6: User disables notifications at OS level.** Browser reports `Notification.permission === 'denied'`. We disable the bell button and show the explanation tooltip. `enablePush` is a no-op in that state.

**R7: The theme_color change from white to yellow.** On existing installed PWA users (if any), the theme color update takes effect on their next re-install. We don't have any yet since the PWA is new in Stage 4 — clean slate.

## Decisions (committed)

These are the calls the plan will follow without re-asking:

- **Service worker location:** `public/sw.js` at root. Scope `/`.
- **SW caching strategy:** cache-first for assets (`/_nuxt/*`, icons, manifest), network-first for the document (`request.mode === 'navigate'`).
- **SW cache name:** `fz-ax-v1` (string constant; bump for material updates).
- **SW upgrade behavior:** `skipWaiting()` on install, `clients.claim()` on activate, delete stale caches on activate.
- **Manifest name:** `"four-thousand weekz"` (full), `"4000"` (short).
- **Manifest theme_color:** `#F7B808` (yellow, matches brand accent).
- **Manifest orientation:** `portrait-primary`.
- **Install button glyph:** `⬇`, visible when `canInstall && !isInstalled`.
- **Push button glyph:** `⏣`, visible when `supportsTimestampTriggers`, filled-yellow when enabled.
- **Push notification time:** Sunday 21:00 local, tagged `fz-ax-sunday`.
- **Push notification body:** title `"⏣ this week is closing"`, body `"what do you want to remember about it?"`.
- **Push re-scheduling:** on every page load when `prefs.pushOptIn === true`. Idempotent cancel-then-schedule. No SW-side re-scheduling.
- **Push on iOS / Firefox:** silently unavailable. Bell button not rendered.
- **`setPushOptIn`:** throws on null state, throws on write failure (Stage 2 pattern), UI wraps in try/catch.
- **No Background Sync, no Periodic Sync, no IndexedDB, no Push API (the server-push kind).**

## Files touched

**Created:**
- `public/sw.js`
- `composables/usePwa.ts`
- `components/FzInstallButton.vue`
- `components/FzPushButton.vue`
- `tests/usePwa.spec.ts`

**Modified:**
- `public/site.webmanifest` — metadata
- `composables/useFzState.ts` — `setPushOptIn` action
- `utils/date.ts` — `nextSundayAt21` helper
- `components/FzToolbar.vue` — host the two new buttons
- `components/FzPage.vue` — call `usePwa.register()` on mount
- `nuxt.config.ts` — theme-color meta
- `tests/useFzState.spec.ts` — `setPushOptIn` tests
- `tests/date.spec.ts` (create if not present, or extend) — `nextSundayAt21` tests

**Not touched:** everything else.

## Success criteria

1. On Chrome/Edge desktop, the install button appears and clicking it installs fz.ax as a standalone app with the correct name, icon, and theme color.
2. On iOS Safari, Add to Home Screen installs the app with the correct name/icon/theme even though the in-page install button never appears.
3. The site works fully offline after the first visit — reload with network disabled and every feature still functions except Sunday push scheduling.
4. On Chrome/Edge desktop with notifications allowed, opting into Sunday push schedules a notification for the next Sunday 21:00 local. The notification fires at the scheduled time (verified manually by temporarily setting the target to "now + 30s" during development).
5. On Firefox / Safari / iOS, the bell button is absent, the in-app Sunday modal continues to work, and no runtime errors are thrown.
6. `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm generate` all clean.
7. All existing 162 tests continue to pass. The new Stage 4 tests push the total to roughly 175.
8. The site still deploys via the unchanged GH Actions workflow.
9. No backend, no third-party SW library, no analytics, no telemetry.
