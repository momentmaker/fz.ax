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
  // Seed pushEnabled from persisted prefs at creation time so the
  // toolbar button doesn't flicker from "off" to "on" between FzPage
  // mount and register() completing. register() is the source of truth
  // for scheduling, but the visual state reflects the saved preference
  // immediately when both permission and opt-in say it should be on.
  const { state: _seedState } = useFzState()
  const pushEnabled = ref(
    supportsPush
    && _seedState.value?.prefs.pushOptIn === true
    && Notification.permission === 'granted',
  )
  const pushPermission = ref<NotificationPermission | 'unsupported'>(
    supportsPush ? Notification.permission : 'unsupported',
  )

  let deferredPrompt: InstallPromptEvent | null = null
  let registration: ServiceWorkerRegistration | null = null
  // Inflight dedupe: if two callers await register() concurrently
  // before navigator.serviceWorker.register resolves, both would see
  // `registration === null` and each would kick off a parallel
  // register + scheduleSundayPush. Storing the promise here lets
  // subsequent callers await the same inflight work instead.
  let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

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
    // Claim the deferred prompt immediately so a rapid double-tap
    // can't re-enter and call .prompt() on a consumed event (which
    // throws per spec — beforeinstallprompt is single-use). Hide the
    // button optimistically. If Chrome decides the user is still a
    // valid install candidate after dismiss, it will fire
    // beforeinstallprompt again and the listener will re-show it.
    const prompt = deferredPrompt
    deferredPrompt = null
    canInstall.value = false
    try {
      await prompt.prompt()
      await prompt.userChoice
      // outcome === 'accepted' is also signalled by 'appinstalled'
      // which sets isInstalled = true. Dismiss leaves canInstall as
      // false until a fresh beforeinstallprompt fires.
    }
    catch {
      // Some browsers throw if .prompt() is called outside a user
      // gesture or after the event was consumed elsewhere. Nothing
      // more to do — the consumed event is discarded.
    }
  }

  async function register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null
    }
    if (registration !== null) return registration
    if (registrationPromise !== null) return registrationPromise
    registrationPromise = (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        registration = reg
        // If the user already opted in on a prior visit, re-schedule now.
        const { state } = useFzState()
        if (supportsPush && state.value?.prefs.pushOptIn === true && Notification.permission === 'granted') {
          pushEnabled.value = true
          await scheduleSundayPush(reg)
        }
        return reg
      }
      catch {
        // Clear BOTH the resolved registration and the inflight
        // promise. Otherwise a transient first-visit failure (flaky
        // network, CSP hiccup) would permanently poison the singleton:
        // every subsequent caller would short-circuit on
        // registrationPromise and get the same already-resolved-to-null
        // promise back, with no way to retry. Nulling the promise
        // lets the next call to register() retry from scratch.
        registration = null
        registrationPromise = null
        return null
      }
    })()
    return registrationPromise
  }

  async function enablePush(): Promise<void> {
    if (!supportsPush) return
    // Guard against the first-visit race where the user hasn't set a
    // DoB yet. setPushOptIn would throw "no state loaded" and we'd
    // swallow the error AFTER having prompted for notification
    // permission — confusing UX (the OS dialog came up for nothing).
    const { state, setPushOptIn } = useFzState()
    if (state.value === null) return
    if (Notification.permission === 'denied') {
      pushPermission.value = 'denied'
      return
    }
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      pushPermission.value = result
      if (result !== 'granted') return
    }
    try {
      setPushOptIn(true)
    }
    catch {
      return
    }
    pushEnabled.value = true
    // Race: the user may have clicked the push button before the SW
    // registration promise resolved. Await register() (idempotent) so
    // we always end up with a registration to schedule against.
    const reg = registration ?? await register()
    if (reg !== null) {
      await scheduleSundayPush(reg)
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
    // Same race-avoidance as enablePush: if the user opts out before
    // the SW registration promise has resolved, await it so we
    // actually cancel the pending notification instead of leaving it
    // to fire once from a prior session's schedule.
    const reg = registration ?? await register()
    if (reg !== null) {
      await cancelSundayPush(reg)
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
 */
// lib.dom's GetNotificationOptions doesn't know about `includeTriggered`
// yet (Notification Triggers draft). Intersection type is the workaround.
type GetNotificationsWithTriggers = GetNotificationOptions & { includeTriggered?: boolean }

async function scheduleSundayPush(registration: ServiceWorkerRegistration): Promise<void> {
  if (!supportsPush) return
  if (Notification.permission !== 'granted') return

  try {
    const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true } as GetNotificationsWithTriggers)
    for (const n of existing) n.close()
  }
  catch {
    // getNotifications can throw on some implementations — proceed anyway.
  }

  const next = nextSundayAt21(new Date())
  try {
    const TimestampTriggerCtor = (globalThis as unknown as { TimestampTrigger: new (t: number) => object }).TimestampTrigger
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
    const existing = await registration.getNotifications({ tag: 'fz-ax-sunday', includeTriggered: true } as GetNotificationsWithTriggers)
    for (const n of existing) n.close()
  }
  catch {
    // ignore
  }
}

/**
 * Test-only reset of the module singleton. Vitest doesn't reload modules
 * between specs by default. Named distinctly from useFzState's
 * __resetForTests to avoid a Nuxt auto-import collision.
 */
export function __resetUsePwaForTests(): void {
  _module = null
}
