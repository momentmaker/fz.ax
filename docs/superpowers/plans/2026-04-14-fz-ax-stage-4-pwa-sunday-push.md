# fz.ax Stage 4 — PWA + Sunday Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fz.ax installable as a Progressive Web App, cache the app shell for offline use, and schedule a best-effort Sunday 21:00 local notification on browsers that support Notification Triggers.

**Architecture:** Hand-written `public/sw.js` does cache-first assets + network-first document. A new `composables/usePwa.ts` handles registration, install-prompt capture, and push scheduling. Two new small toolbar buttons (`FzInstallButton`, `FzPushButton`) are feature-detected and hidden when not applicable. A new `setPushOptIn` action on `useFzState` persists the opt-in choice. Re-scheduling is idempotent on page load.

**Tech Stack:** Hand-written service worker (no Workbox, no `@vite-pwa/nuxt`), Vue 3 composables, strict TypeScript, Vitest with happy-dom mocks.

**Spec reference:** `docs/superpowers/specs/2026-04-14-fz-ax-stage-4-pwa-sunday-push-design.md` — this plan implements it exactly.

**Pre-flight check:**
- `git tag --list stage-3-tier-1-rituals` → exists
- `pnpm test` → 162 passing
- `pnpm lint && pnpm typecheck && pnpm generate` → clean
- `git status` → clean

---

## Task 1: Enhance `public/site.webmanifest`

**Files:**
- Modify: `public/site.webmanifest`

**Why:** The existing manifest has name "4000" and white theme color. Upgrade to the real brand name and the yellow accent so installed PWAs match the site's visual identity.

- [ ] **Step 1: Replace the file contents**

Replace `public/site.webmanifest` with:

```json
{
  "name": "four-thousand weekz",
  "short_name": "4000",
  "description": "your life visualized in hexagons",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#F7B808",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 2: Verify it's valid JSON**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('public/site.webmanifest', 'utf8')).name)"
```

Expected: prints `four-thousand weekz`.

- [ ] **Step 3: Commit**

```bash
git add public/site.webmanifest
git commit -m "$(cat <<'EOF'
enhance site.webmanifest for stage 4 PWA install

- name: "4000" → "four-thousand weekz" (short_name stays "4000"
  for the home-screen icon label)
- description added: "your life visualized in hexagons"
- start_url and scope pinned to "/"
- theme_color: white → #F7B808 (brand yellow) so the installed
  PWA's status bar and splash screen match the site
- orientation: portrait-primary (the grid is tall, not wide)
- icons unchanged (existing 192/512 maskable PNGs stay)
EOF
)"
```

---

## Task 2: Add `nextSundayAt21` to `utils/date.ts` (TDD)

**Files:**
- Modify: `tests/` — new `tests/date.spec.ts`
- Modify: `utils/date.ts`

**Why:** `usePwa.scheduleSundayPush` needs to compute the next Sunday at 21:00 local time. Pure function, easy to test.

- [ ] **Step 1: Write the failing tests**

Create `tests/date.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { localDateString, nextSundayAt21 } from '../utils/date'

describe('localDateString', () => {
  it('returns YYYY-MM-DD in local time', () => {
    // #given a local Date
    const d = new Date(2026, 3, 12, 20, 30) // 2026-04-12 20:30 local
    // #then the formatter returns the local-date form
    expect(localDateString(d)).toBe('2026-04-12')
  })
})

describe('nextSundayAt21', () => {
  it('returns the next Sunday at 21:00 when today is Monday', () => {
    // #given a Monday at noon (2026-04-13 is a Monday)
    const monday = new Date(2026, 3, 13, 12, 0)
    // #when we compute the next Sunday 21:00
    const next = nextSundayAt21(monday)
    // #then it's the following Sunday at 21:00 local
    expect(next.getDay()).toBe(0) // Sunday
    expect(next.getHours()).toBe(21)
    expect(next.getMinutes()).toBe(0)
    expect(next.getSeconds()).toBe(0)
    // 2026-04-13 is Monday → next Sunday is 2026-04-19
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(3)
    expect(next.getDate()).toBe(19)
  })

  it('returns today at 21:00 if today is Sunday before 21:00', () => {
    // #given a Sunday at 15:00 (2026-04-12 is Sunday)
    const sundayAfternoon = new Date(2026, 3, 12, 15, 0)
    // #when we compute
    const next = nextSundayAt21(sundayAfternoon)
    // #then it's today at 21:00
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(12)
    expect(next.getHours()).toBe(21)
  })

  it('returns next Sunday if today is Sunday at 21:00 exactly', () => {
    // #given a Sunday at 21:00 exactly
    const sundayAt21 = new Date(2026, 3, 12, 21, 0)
    // #when we compute
    const next = nextSundayAt21(sundayAt21)
    // #then it's next Sunday — 21:00 exactly doesn't count as "future"
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })

  it('returns next Sunday if today is Sunday at 22:00', () => {
    // #given a Sunday at 22:00 (past the 21:00 trigger)
    const sundayLate = new Date(2026, 3, 12, 22, 0)
    // #when we compute
    const next = nextSundayAt21(sundayLate)
    // #then it rolls to next Sunday
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
  })

  it('returns this coming Sunday when today is Wednesday', () => {
    // #given a Wednesday (2026-04-15)
    const wed = new Date(2026, 3, 15, 10, 0)
    // #when we compute
    const next = nextSundayAt21(wed)
    // #then it's the upcoming Sunday
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })

  it('returns tomorrow 21:00 when today is Saturday', () => {
    // #given a Saturday morning (2026-04-18)
    const sat = new Date(2026, 3, 18, 9, 0)
    // #when we compute
    const next = nextSundayAt21(sat)
    // #then it's tomorrow at 21:00
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/date.spec.ts
```

Expected: tests fail because `nextSundayAt21` isn't exported yet. `localDateString` tests pass (existing).

- [ ] **Step 3: Add `nextSundayAt21` to `utils/date.ts`**

Append to `utils/date.ts` (below the existing `localDateString` function):

```ts
/**
 * Return the next Sunday at 21:00 local time, strictly in the future
 * relative to `from`. If `from` is already a Sunday BEFORE 21:00, the
 * same-day 21:00 counts. If `from` is Sunday at 21:00 exactly or later,
 * the result rolls to the following Sunday.
 *
 * Used by usePwa to schedule the weekly Sunday Whisper notification.
 */
export function nextSundayAt21(from: Date): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 21, 0, 0, 0)
  const day = result.getDay() // 0 = Sunday
  if (day !== 0) {
    // Advance to this week's Sunday (could be 1-6 days forward).
    result.setDate(result.getDate() + (7 - day))
  }
  else if (from.getTime() >= result.getTime()) {
    // Today is Sunday but we're already at or past 21:00 — roll to next Sunday.
    result.setDate(result.getDate() + 7)
  }
  return result
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/date.spec.ts
```

Expected: all 7 tests pass (1 localDateString + 6 nextSundayAt21).

- [ ] **Step 5: Commit**

```bash
git add tests/date.spec.ts utils/date.ts
git commit -m "$(cat <<'EOF'
add nextSundayAt21 helper (TDD)

stage 4 prep: computes the next Sunday at 21:00 local time,
strictly future relative to the input. used by usePwa to
schedule the weekly sunday push notification. pure function,
6 tests cover monday/wednesday/saturday/sunday-morning/
sunday-at-21-exactly/sunday-evening boundary cases. the
localDateString test is extracted from its previous home for
colocation.
EOF
)"
```

---

## Task 3: Add `setPushOptIn` to `useFzState` (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** `usePwa.enablePush` and `disablePush` need to persist the user's opt-in choice. Follows the Stage 2 throw-and-close pattern.

- [ ] **Step 1: Add failing tests**

In `tests/useFzState.spec.ts`, after the last existing `describe` nested inside the top-level `describe('useFzState', ...)`, add:

```ts
  describe('setPushOptIn', () => {
    it('throws when state is null', () => {
      const { setPushOptIn } = useFzState()
      expect(() => setPushOptIn(true)).toThrow(/no state/i)
    })

    it('sets prefs.pushOptIn to true', () => {
      const { state, setDob, setPushOptIn } = useFzState()
      setDob('1990-05-15')
      setPushOptIn(true)
      expect(state.value!.prefs.pushOptIn).toBe(true)
    })

    it('sets prefs.pushOptIn to false', () => {
      const { state, setDob, setPushOptIn } = useFzState()
      setDob('1990-05-15')
      setPushOptIn(true)
      setPushOptIn(false)
      expect(state.value!.prefs.pushOptIn).toBe(false)
    })

    it('persists to localStorage', () => {
      const { setDob, setPushOptIn } = useFzState()
      setDob('1990-05-15')
      setPushOptIn(true)
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).prefs.pushOptIn).toBe(true)
    })

    it('preserves other prefs fields', () => {
      const { state, setDob, setPushOptIn } = useFzState()
      setDob('1990-05-15')
      const beforeTheme = state.value!.prefs.theme
      setPushOptIn(true)
      expect(state.value!.prefs.theme).toBe(beforeTheme)
      expect(state.value!.prefs.weekStart).toBe('mon')
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

- [ ] **Step 3: Add `setPushOptIn` to `composables/useFzState.ts`**

After the existing `setLastEcho` function and before `replaceState`, insert:

```ts
/**
 * Update prefs.pushOptIn. Used by usePwa when the user enables or
 * disables the Sunday push notification. The pref is read back on
 * every page load to decide whether to re-schedule the notification.
 */
function setPushOptIn(value: boolean): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    prefs: { ...current.prefs, pushOptIn: value },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}
```

Update the `UseFzStateReturn` interface:

Find the existing:
```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  setLastSundayPrompt: (dateStr: string) => void
  setLastEcho: (dateStr: string) => void
  replaceState: (next: FzState) => void
  resetState: () => void
}
```

Replace with:
```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  setLastSundayPrompt: (dateStr: string) => void
  setLastEcho: (dateStr: string) => void
  setPushOptIn: (value: boolean) => void
  replaceState: (next: FzState) => void
  resetState: () => void
}
```

And the return object in `useFzState()`:
```ts
export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    setWhisper,
    clearMark,
    setLastSundayPrompt,
    setLastEcho,
    setPushOptIn,
    replaceState,
    resetState,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
add setPushOptIn to useFzState (TDD)

stage 4 prep: persists prefs.pushOptIn via the throw-and-close
pattern. usePwa reads it on every page load to decide whether
to re-schedule the sunday notification. 5 tests cover null
state throw, set-to-true, set-to-false, persistence, and
preservation of other prefs fields.
EOF
)"
```

---

## Task 4: Write `public/sw.js`

**Files:**
- Create: `public/sw.js`

**Why:** The hand-written service worker that caches the app shell (cache-first for assets, network-first for documents) and hosts the Sunday notification scheduling.

- [ ] **Step 1: Create the file**

Create `public/sw.js` with this exact content:

```js
/*
 * fz.ax service worker
 *
 * Two responsibilities:
 *   1. Cache the app shell so fz.ax works offline after the first visit.
 *      - Cache-first for assets (the hashed /_nuxt/* bundle, icons, manifest).
 *      - Network-first for the document (always try to get the latest
 *        index.html when online; fall back to cached copy when offline).
 *   2. Host the Sunday Whisper notification, scheduled from the main
 *      thread via registration.showNotification with a TimestampTrigger.
 *      (The main thread handles scheduling; the SW is just the registration
 *      target. There is no SW-side re-scheduling or state persistence.)
 *
 * No Workbox, no @vite-pwa/nuxt, no IndexedDB, no Background Sync.
 * Hand-written, ~60 lines, legible in one sitting.
 */

const CACHE_VERSION = 'fz-ax-v1'

// The pre-cache list: essential shell URLs. Hashed /_nuxt/* files are
// NOT listed here — they're cached on first fetch instead.
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  // Activate the new SW immediately rather than waiting for all tabs to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Network-first for the document (always get the latest when online).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // Cache-first for assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses.
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
      return undefined
    }),
  )
})
```

- [ ] **Step 2: Verify it parses as JS**

```bash
node --check public/sw.js
```

Expected: no output (success).

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "$(cat <<'EOF'
add hand-written service worker

stage 4 F1.6: ~80 lines of service worker covering app-shell cache,
cache-first asset strategy, network-first document strategy, cache
version cleanup on activate, skipWaiting + claim, and a
notificationclick handler that focuses or opens the fz.ax tab.

no Workbox, no @vite-pwa/nuxt, no IndexedDB, no Background Sync
per the parent spec's "no third-party SW library" commitment.
legible in one sitting.
EOF
)"
```

---

## Task 5: Write `composables/usePwa.ts` (TDD for testable parts)

**Files:**
- Create: `tests/usePwa.spec.ts`
- Create: `composables/usePwa.ts`

**Why:** Main-thread glue for SW registration, install prompt capture, and push scheduling. The testable parts are the decision logic — actual SW registration and notification APIs are mocked.

- [ ] **Step 1: Write failing tests**

Create `tests/usePwa.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { supportsPush, computeInitialInstalled } from '../composables/usePwa'

describe('supportsPush', () => {
  // supportsPush is a static runtime feature-detection that can't be
  // usefully tested against happy-dom because happy-dom doesn't ship
  // Notification or ServiceWorker. What we CAN verify: it's a boolean.
  it('is a boolean', () => {
    expect(typeof supportsPush).toBe('boolean')
  })

  it('is false in the test environment (happy-dom has no ServiceWorker)', () => {
    // #given the happy-dom test environment has no real SW / notification APIs
    // #then supportsPush is false here
    // (In a real Chromium desktop, it would be true.)
    expect(supportsPush).toBe(false)
  })
})

describe('computeInitialInstalled', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    // Default: matchMedia returns not-matching
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('returns false when not in standalone display mode', () => {
    expect(computeInitialInstalled()).toBe(false)
  })

  it('returns true when matchMedia reports standalone', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    expect(computeInitialInstalled()).toBe(true)
  })

  it('returns false when matchMedia is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).matchMedia = undefined
    expect(computeInitialInstalled()).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/usePwa.spec.ts
```

Expected: fails with "Cannot find module '../composables/usePwa'".

- [ ] **Step 3: Create `composables/usePwa.ts`**

```ts
import { ref, type Ref } from 'vue'
import { useFzState } from './useFzState'
import { nextSundayAt21 } from '../utils/date'

/**
 * Static feature detection for the Notification Triggers API. This is
 * Chromium-desktop-only at the time of Stage 4. On browsers that don't
 * support it (Firefox, Safari, iOS), we silently skip all push-related
 * functionality and the in-app Sunday Whisper modal (F1.1) remains the
 * primary ritual path.
 */
export const supportsPush: boolean = (() => {
  if (typeof window === 'undefined') return false
  if (typeof Notification === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  // `showTrigger` lives on Notification.prototype when Notification
  // Triggers is implemented. It's the canonical feature check.
  if (!('showTrigger' in Notification.prototype)) return false
  if (typeof (globalThis as { TimestampTrigger?: unknown }).TimestampTrigger !== 'function') return false
  return true
})()

/**
 * Detect whether the site is running in a standalone display context
 * (PWA installed or launched from home screen). Exposed for tests.
 */
export function computeInitialInstalled(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(display-mode: standalone)').matches
  }
  catch {
    return false
  }
}

// The BeforeInstallPromptEvent isn't in lib.dom. Minimal shape for our use.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePwaReturn {
  canInstall: Ref<boolean>
  isInstalled: Ref<boolean>
  promptInstall: () => Promise<void>
  supportsPush: boolean
  pushEnabled: Ref<boolean>
  pushPermission: Ref<NotificationPermission | 'unsupported'>
  enablePush: () => Promise<void>
  disablePush: () => Promise<void>
  register: () => Promise<ServiceWorkerRegistration | null>
}

let _module: UsePwaReturn | null = null

/**
 * Main-thread glue for fz.ax's PWA features:
 *   - Service worker registration (idempotent; registers once per page)
 *   - Install prompt capture (beforeinstallprompt) and trigger
 *   - Sunday push scheduling via TimestampTrigger (best-effort)
 *
 * All actions are feature-detected and fail closed: on browsers without
 * the relevant API, the corresponding refs never change from their
 * initial values and the UI toolbar buttons hide themselves.
 */
export function usePwa(): UsePwaReturn {
  if (_module !== null) return _module

  const canInstall = ref(false)
  const isInstalled = ref(computeInitialInstalled())
  const pushEnabled = ref(false)
  const pushPermission = ref<NotificationPermission | 'unsupported'>(
    supportsPush ? Notification.permission : 'unsupported',
  )

  let deferredPrompt: InstallPromptEvent | null = null
  let registration: ServiceWorkerRegistration | null = null

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      deferredPrompt = event as InstallPromptEvent
      canInstall.value = true
    })

    window.addEventListener('appinstalled', () => {
      canInstall.value = false
      isInstalled.value = true
      deferredPrompt = null
    })
  }

  async function promptInstall(): Promise<void> {
    if (deferredPrompt === null) return
    await deferredPrompt.prompt()
    try {
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        canInstall.value = false
      }
    }
    catch {
      // user dismissed the dialog — leave canInstall alone
    }
    deferredPrompt = null
  }

  async function register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null
    }
    if (registration !== null) return registration
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      // If the user already opted in on a prior visit, re-schedule now.
      const { state } = useFzState()
      if (supportsPush && state.value?.prefs.pushOptIn === true && Notification.permission === 'granted') {
        pushEnabled.value = true
        await scheduleSundayPush(registration)
      }
      return registration
    }
    catch {
      registration = null
      return null
    }
  }

  async function enablePush(): Promise<void> {
    if (!supportsPush) return
    if (Notification.permission === 'denied') {
      pushPermission.value = 'denied'
      return
    }
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      pushPermission.value = result
      if (result !== 'granted') return
    }
    const { setPushOptIn } = useFzState()
    try {
      setPushOptIn(true)
    }
    catch {
      return
    }
    pushEnabled.value = true
    if (registration !== null) {
      await scheduleSundayPush(registration)
    }
  }

  async function disablePush(): Promise<void> {
    if (!supportsPush) return
    const { setPushOptIn } = useFzState()
    try {
      setPushOptIn(false)
    }
    catch {
      return
    }
    pushEnabled.value = false
    if (registration !== null) {
      await cancelSundayPush(registration)
    }
  }

  _module = {
    canInstall,
    isInstalled,
    promptInstall,
    supportsPush,
    pushEnabled,
    pushPermission,
    enablePush,
    disablePush,
    register,
  }
  return _module
}

/**
 * Schedule a one-shot notification for the next Sunday at 21:00 local.
 * Idempotent — cancels any existing fz-ax-sunday notification first,
 * so calling this on every page load is safe and keeps exactly one
 * scheduled notification at all times.
 *
 * Exported for tests and for direct callers that have a registration.
 */
async function scheduleSundayPush(registration: ServiceWorkerRegistration): Promise<void> {
  if (!supportsPush) return
  if (Notification.permission !== 'granted') return

  try {
    const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true })
    for (const n of existing) n.close()
  }
  catch {
    // getNotifications can throw on some implementations — proceed anyway.
  }

  const next = nextSundayAt21(new Date())
  try {
    const TimestampTriggerCtor = (globalThis as { TimestampTrigger: new (t: number) => object }).TimestampTrigger
    const options: NotificationOptions & { showTrigger?: object } = {
      body: 'what do you want to remember about it?',
      tag: 'fz-ax-sunday',
      icon: '/web-app-manifest-192x192.png',
      badge: '/favicon-48x48.png',
      showTrigger: new TimestampTriggerCtor(next.getTime()),
    }
    await registration.showNotification('⏣ this week is closing', options)
  }
  catch {
    // Scheduling can fail if permission was revoked between the check
    // and the call, or if the API is partially supported. Fail silently —
    // the in-app Sunday modal is still the guaranteed path.
  }
}

async function cancelSundayPush(registration: ServiceWorkerRegistration): Promise<void> {
  if (!supportsPush) return
  try {
    const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true })
    for (const n of existing) n.close()
  }
  catch {
    // ignore
  }
}

/**
 * Test-only reset of the module singleton. Vitest doesn't reload modules
 * between specs by default.
 */
export function __resetForTests(): void {
  _module = null
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/usePwa.spec.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Run the full suite + typecheck + lint**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add tests/usePwa.spec.ts composables/usePwa.ts
git commit -m "$(cat <<'EOF'
add usePwa composable (TDD)

stage 4 F1.6/F1.7 glue: singleton composable that manages service
worker registration, beforeinstallprompt capture, and sunday push
scheduling. all feature-detected and fail-closed: on browsers
without ServiceWorker / Notification / TimestampTrigger, the refs
never change from their initial values and the toolbar buttons
hide themselves.

scheduleSundayPush is idempotent: it cancels any existing
fz-ax-sunday notification before creating a fresh one, so calling
it on every page load always lands at exactly one scheduled
notification for the next 21:00 local sunday.

4 tests cover supportsPush detection + computeInitialInstalled's
display-mode check (standalone, not standalone, missing
matchMedia). the dynamic parts (SW registration, notification
scheduling) are not unit-tested because happy-dom doesn't emulate
either API — they're verified manually in the smoke test.
EOF
)"
```

---

## Task 6: `components/FzInstallButton.vue`

**Files:**
- Create: `components/FzInstallButton.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { usePwa } from '../composables/usePwa'

const { canInstall, isInstalled, promptInstall } = usePwa()

function onClick(): void {
  void promptInstall()
}
</script>

<template>
  <button
    v-if="canInstall && !isInstalled"
    class="tool"
    aria-label="install fz.ax as an app"
    title="install"
    @click="onClick"
  >⬇</button>
</template>

<style scoped>
.tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover,
.tool:focus-visible {
  background: #fffbe6;
  outline: none;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzInstallButton.vue
git commit -m "FzInstallButton: toolbar install affordance

stage 4 F1.6: small square button that shows only when canInstall
is true and isInstalled is false. fires the deferred
beforeinstallprompt event on click. hides itself once the app is
installed or the prompt is consumed. same visual treatment as the
other toolbar buttons."
```

---

## Task 7: `components/FzPushButton.vue`

**Files:**
- Create: `components/FzPushButton.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePwa } from '../composables/usePwa'

const { supportsPush, pushEnabled, pushPermission, enablePush, disablePush } = usePwa()

const isDenied = computed(() => pushPermission.value === 'denied')
const tooltipTitle = computed(() => {
  if (isDenied.value) return 'sunday push blocked — enable in browser settings'
  if (pushEnabled.value) return 'sunday push on — tap to disable'
  return 'sunday push'
})

const ariaLabel = computed(() => {
  if (isDenied.value) return 'sunday push blocked in browser settings'
  if (pushEnabled.value) return 'disable sunday whisper notification'
  return 'enable sunday whisper notification'
})

function onClick(): void {
  if (isDenied.value) return
  if (pushEnabled.value) {
    void disablePush()
  }
  else {
    void enablePush()
  }
}
</script>

<template>
  <button
    v-if="supportsPush"
    class="tool"
    :class="{ 'tool-on': pushEnabled, 'tool-denied': isDenied }"
    :disabled="isDenied"
    :aria-label="ariaLabel"
    :title="tooltipTitle"
    @click="onClick"
  >⏣</button>
</template>

<style scoped>
.tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover:not(:disabled),
.tool:focus-visible:not(:disabled) {
  background: #fffbe6;
  outline: none;
}

.tool-on {
  background: #F7B808;
  color: white;
}

.tool-on:hover,
.tool-on:focus-visible {
  background: #d99f00;
}

.tool-denied {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzPushButton.vue
git commit -m "FzPushButton: toolbar sunday push toggle

stage 4 F1.7: small square button rendered only when
supportsPush is true (Chromium desktop with Notification
Triggers API). off state: white bg, yellow ⏣ glyph. on state:
yellow bg, white ⏣ glyph. denied state: dim, disabled, tooltip
explains how to re-enable in browser settings.

click toggles pushEnabled via enablePush/disablePush which
persist prefs.pushOptIn and schedule/cancel the notification."
```

---

## Task 8: Add `FzInstallButton` + `FzPushButton` to `FzToolbar`

**Files:**
- Modify: `components/FzToolbar.vue`

- [ ] **Step 1: Read the current `FzToolbar.vue`** to see the existing template structure.

- [ ] **Step 2: Edit the template**

In `components/FzToolbar.vue`, find:
```vue
<template>
  <div class="toolbar">
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download poster"
```

Right after the opening `<div class="toolbar">`, insert these two component instances (the auto-imported FzPushButton first, then FzInstallButton):

```vue
    <FzPushButton />
    <FzInstallButton />
```

The resulting template opening looks like:
```vue
<template>
  <div class="toolbar">
    <FzPushButton />
    <FzInstallButton />
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download poster"
      title="poster"
      @click="onPosterClick"
    >⬢</button>
```

`FzPushButton` and `FzInstallButton` are auto-imported by Nuxt.

- [ ] **Step 3: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/FzToolbar.vue
git commit -m "FzToolbar: host FzPushButton and FzInstallButton

stage 4 wiring: adds the two new buttons to the toolbar. both
are conditionally rendered (supportsPush / canInstall), so most
users see the existing 3-button toolbar. chromium desktop users
who opt in see all 5. layout ordering: push, install, poster,
backup, restore."
```

---

## Task 9: Register the service worker on mount in `FzPage`

**Files:**
- Modify: `components/FzPage.vue`

- [ ] **Step 1: Read the current `FzPage.vue`** to see the `onMounted` block.

- [ ] **Step 2: Add `usePwa` import and `register()` call**

At the top of `<script setup lang="ts">`, add an import:

```ts
import { usePwa } from '../composables/usePwa'
```

Right after the existing destructure `const { state } = useFzState()`, add:

```ts
const { register: registerPwa } = usePwa()
```

Inside the `onMounted` block, at the very end (after the Sunday modal check), add:

```ts
  // Stage 4 F1.6: register the service worker so future visits are
  // installable and offline-capable. This also handles push
  // re-scheduling if the user previously opted in (usePwa's register
  // reads prefs.pushOptIn and calls scheduleSundayPush on success).
  void registerPwa()
```

- [ ] **Step 3: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/FzPage.vue
git commit -m "FzPage: register service worker on mount

stage 4 F1.6: calls usePwa.register() in onMounted. the
composable handles idempotency (skips if already registered),
feature detection (skips if no serviceWorker), and push
re-scheduling (reads prefs.pushOptIn and schedules a fresh
sunday notification if the user is opted in and permission is
still granted)."
```

---

## Task 10: Add `theme-color` meta to `nuxt.config.ts`

**Files:**
- Modify: `nuxt.config.ts`

**Why:** Matches the manifest theme color so installed PWAs show the brand accent in the status bar from day one.

- [ ] **Step 1: Read `nuxt.config.ts`**

- [ ] **Step 2: Add the meta tag**

Find the `meta:` array inside `app.head`. It currently contains `description`, `viewport`, `apple-mobile-web-app-title`. Add a fourth entry:

```ts
{ name: 'theme-color', content: '#F7B808' }
```

So the meta array becomes:
```ts
meta: [
  { name: 'description', content: 'your life visualized in hexagons' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  { name: 'apple-mobile-web-app-title', content: '4000' },
  { name: 'theme-color', content: '#F7B808' }
],
```

- [ ] **Step 3: Generate to verify the built HTML includes it**

```bash
pnpm generate 2>&1 | tail -5 && grep -c 'theme-color' .output/public/index.html
```

Expected: generate succeeds, grep prints `1`.

- [ ] **Step 4: Commit**

```bash
git add nuxt.config.ts
git commit -m "nuxt.config: add theme-color meta matching manifest

stage 4 F1.6 polish: the installed PWA uses #F7B808 (brand
yellow) as its theme color via site.webmanifest, but the
browser-rendered fz.ax tab ALSO needs a theme-color meta so
Chrome/Edge/iOS show the same accent in their address bar
and status bar. 1-line addition to app.head.meta."
```

---

## Task 11: Manual smoke test

**Files:** None — verification only.

- [ ] **Step 1: Run the dev server**

```bash
pnpm dev > /tmp/fz-ax-stage4-dev.log 2>&1 &
sleep 12
tail -20 /tmp/fz-ax-stage4-dev.log
```

Expected: dev server starts cleanly.

- [ ] **Step 2: Curl the root URL and verify the theme-color meta is in the HTML**

```bash
curl -s http://localhost:3000 | grep -c "theme-color"
```

Expected: prints `1`.

- [ ] **Step 3: Check the manifest is served**

```bash
curl -s http://localhost:3000/site.webmanifest | grep -c "four-thousand weekz"
```

Expected: prints `1`.

- [ ] **Step 4: Check the service worker is accessible**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/sw.js
echo ""
```

Expected: prints `200`.

- [ ] **Step 5: Verify the SW JavaScript is syntactically valid**

```bash
curl -s http://localhost:3000/sw.js | node --check
```

Expected: no output (valid JS).

- [ ] **Step 6: Kill the dev server**

```bash
pkill -f "nuxt dev" || true
```

- [ ] **Step 7: Generate and verify the artifact**

```bash
pnpm generate 2>&1 | tail -5
ls .output/public/sw.js .output/public/site.webmanifest .output/public/CNAME
grep -c "theme-color" .output/public/index.html
```

Expected: all present, theme-color grep returns `1`.

- [ ] **Step 8: No commit** — verification only. Proceed to Task 12.

---

## Task 12: Final verification + tag

**Files:** None.

- [ ] **Step 1: Run every check**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all clean. Test count ~175.

- [ ] **Step 2: Tag the stage**

```bash
git tag -a stage-4-pwa-sunday-push -m "Stage 4 — PWA + Sunday Push"
git log --oneline stage-3-tier-1-rituals..stage-4-pwa-sunday-push
```

Expected: ~12 commits in the stage 4 range.

Do NOT push in this task. The autopilot SHIP phase handles that separately.

---

## Self-review checklist

- [ ] `public/sw.js` exists and parses as valid JS
- [ ] `site.webmanifest` has the new name, description, theme color
- [ ] `nextSundayAt21` tested across all weekday + Sunday-time-of-day boundary cases
- [ ] `setPushOptIn` follows the throw-and-close pattern
- [ ] `usePwa.register()` is idempotent and silently skips unsupported browsers
- [ ] `scheduleSundayPush` is idempotent (cancel-then-schedule)
- [ ] `FzInstallButton` hidden when `!canInstall || isInstalled`
- [ ] `FzPushButton` hidden when `!supportsPush`
- [ ] `nuxt.config.ts` has the theme-color meta
- [ ] `FzPage.onMounted` calls `registerPwa()` once
- [ ] All existing 162 tests still pass
- [ ] All new tests: ~13 (date: 7, useFzState: 5, usePwa: 4)

## Definition of done

- All 12 tasks complete
- ~175 tests passing
- `stage-4-pwa-sunday-push` tag at the head of master
- No Tier 2 or 3 features shipped
