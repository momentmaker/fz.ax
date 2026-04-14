# fz.ax · Stage 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate fz.ax from a single 430-line Options-API `app.vue` to a TypeScript Composition-API codebase with composables, split components, Vitest tests, ESLint, GitHub Pages deployment, and a v0 → v1 localStorage migration — *while preserving the existing visual experience exactly*. No new features in this stage.

**Architecture:** `app.vue` becomes a thin shell that mounts `<FzPage/>`. Time math moves to a pure `useTime` composable (no Vue dependencies, fully unit-testable). Application state moves to a `useFzState` composable wrapping a module-scope `reactive(FzState)` object that auto-persists to `localStorage`. The grid, hexagon, title, and scroll-hex become focused single-responsibility components. A `migrate()` utility lifts the legacy `localStorage['dob']` key into the new `FzState` shape on first load. Deployment switches from Netlify (current) to GitHub Pages via `nuxt generate` + a GitHub Actions workflow + a `public/CNAME` file.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript (strict), Vitest, @vue/test-utils, @nuxt/eslint, pnpm, GitHub Actions, GitHub Pages

**Spec reference:** `docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md` — this plan implements feature **F1.9 (Code refactor)** and the deployment infrastructure called out in the spec's *GitHub Pages deployment* section. No feature work from F0.x or higher is included in this stage.

**Pre-flight sanity check:** Before starting, confirm:
- You are in the `fz.ax` repository root: `pwd` → `/Users/rubberduck/GitHub/momentmaker/fz.ax`
- The working tree is clean: `git status` → `nothing to commit, working tree clean`
- pnpm is installed: `pnpm --version` → some version number
- Node 20+ is installed: `node --version` → `v20.x.x` or higher

---

## Task 1: Install Vitest and Vue test utils

**Files:**
- Modify: `package.json`

**Why:** We need a test runner before we can do TDD on any of the new composables and utilities. Vitest is the natural choice for a Vue + Vite stack.

- [ ] **Step 1: Install Vitest and friends as dev dependencies**

Run:
```bash
pnpm add -D vitest @vue/test-utils happy-dom @vitest/coverage-v8
```

Expected: pnpm prints "Done in Xs" and updates `package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Add test scripts to package.json**

Open `package.json`. The current `scripts` block looks like:
```json
"scripts": {
  "build": "nuxt build",
  "dev": "nuxt dev",
  "generate": "nuxt generate",
  "preview": "nuxt preview",
  "postinstall": "nuxt prepare"
}
```

Replace it with:
```json
"scripts": {
  "build": "nuxt build",
  "dev": "nuxt dev",
  "generate": "nuxt generate",
  "preview": "nuxt preview",
  "postinstall": "nuxt prepare",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:cov": "vitest run --coverage",
  "lint": "eslint .",
  "typecheck": "nuxt typecheck"
}
```

- [ ] **Step 3: Verify package.json is valid JSON**

Run:
```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('package.json'))).join(','))"
```

Expected: prints `name,private,type,scripts,dependencies,devDependencies` (or similar — at minimum, no error).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
add vitest and test scripts

stage 1 foundations: introduce a test runner before doing TDD on the
new composables and utilities. happy-dom is the dom shim for vue
component tests when we need them. coverage is opt-in via test:cov.
EOF
)"
```

---

## Task 2: Add Vitest configuration

**Files:**
- Create: `vitest.config.ts`

**Why:** Vitest needs to know how to resolve Nuxt's path aliases (`~/`, `@/`) and which files to treat as tests. A standalone vitest config (instead of merging with nuxt config) keeps tests fast and decoupled from the Nuxt build.

- [ ] **Step 1: Create vitest.config.ts**

Create `vitest.config.ts` with this exact content:

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['composables/**/*.ts', 'utils/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
```

- [ ] **Step 2: Create the tests directory with a sanity test**

Create `tests/sanity.spec.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Run the sanity test**

Run:
```bash
pnpm test
```

Expected: vitest discovers `tests/sanity.spec.ts`, runs one test, prints `1 passed (1)`. Exit code 0.

If it fails: re-check `vitest.config.ts` syntax; ensure `happy-dom` is installed (`pnpm list happy-dom` should show a version).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/sanity.spec.ts
git commit -m "$(cat <<'EOF'
add vitest config and sanity test

vitest is configured with happy-dom for component DOM access, path
aliases matching nuxt's ~ and @, and coverage scoped to composables
and utils. the sanity test verifies the runner works before we start
adding real tests.
EOF
)"
```

---

## Task 3: Add ESLint via @nuxt/eslint

**Files:**
- Modify: `package.json` (already done in Task 1, but @nuxt/eslint is new)
- Modify: `nuxt.config.ts`
- Create: `eslint.config.mjs`

**Why:** Stage 1 introduces TypeScript and a refactored codebase. Catching obvious mistakes (unused vars, untyped `any` slip-throughs, formatting drift) at lint time keeps the quality bar steady as we add features in later stages.

- [ ] **Step 1: Install @nuxt/eslint**

Run:
```bash
pnpm add -D @nuxt/eslint eslint typescript
```

Expected: pnpm completes. `eslint` and `typescript` are pulled in as transitive deps if not already present.

- [ ] **Step 2: Register the module in nuxt.config.ts**

Open `nuxt.config.ts`. Current content:
```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'four-thousand weekz',
      meta: [
        { name: 'description', content: 'your life visualized in hexagons' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '4000' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href:'/site.webmanifest' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})
```

Add the `modules` array. The new content:

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  app: {
    head: {
      title: 'four-thousand weekz',
      meta: [
        { name: 'description', content: 'your life visualized in hexagons' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '4000' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href:'/site.webmanifest' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})
```

- [ ] **Step 3: Run nuxt prepare to scaffold the eslint config**

Run:
```bash
pnpm postinstall
```

Expected: `nuxt prepare` writes `.nuxt/` types and the eslint module scaffolds an `eslint.config.mjs` if not present. Some output mentions "Wrote eslint.config.mjs" or "ESLint configured."

- [ ] **Step 4: Verify eslint.config.mjs exists**

Run:
```bash
ls eslint.config.mjs
```

Expected: lists the file. If it doesn't exist, manually create `eslint.config.mjs` with:

```js
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // your custom rules here
)
```

- [ ] **Step 5: Run lint**

Run:
```bash
pnpm lint
```

Expected: lint runs. May find some pre-existing issues in `app.vue` — that's fine, we're about to delete most of `app.vue` anyway. As long as `pnpm lint` exits without crashing, you're good. Note any errors but do not fix them yet.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml nuxt.config.ts eslint.config.mjs
git commit -m "$(cat <<'EOF'
add @nuxt/eslint and run lint

stage 1 foundations: introduce eslint via the official nuxt module
so we catch unused vars, untyped any leaks, and formatting drift as
we refactor app.vue into a real component tree. existing app.vue
warnings are tolerated since we're about to delete most of it.
EOF
)"
```

---

## Task 4: Confirm strict TypeScript and tsconfig path aliases

**Files:**
- Modify: `tsconfig.json`

**Why:** Nuxt 3 generates `.nuxt/tsconfig.json` and the project `tsconfig.json` extends it. We need to verify strict mode is on so TypeScript catches null/undefined and implicit any. We also want a `~/types/*` path alias to import our shared types cleanly.

- [ ] **Step 1: Read the current tsconfig.json**

Run:
```bash
cat tsconfig.json
```

Expected: it currently extends `./.nuxt/tsconfig.json`.

- [ ] **Step 2: Replace tsconfig.json**

Replace the contents of `tsconfig.json` with:

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

`noUncheckedIndexedAccess` is important: it forces us to handle the case where `weeks[index]` might be `undefined` (which it is for unmarked weeks in our sparse data model). This catches a class of bugs where we forget the sparse-ness.

- [ ] **Step 3: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: typecheck runs. There may be errors in the existing `app.vue` (which is `.vue` JavaScript, not TS) — this is OK for now. As long as the runner itself doesn't error, you're fine.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "$(cat <<'EOF'
enable strict typescript with noUncheckedIndexedAccess

stage 1 foundations: forces us to handle the case where weeks[index]
might be undefined (which it is for unmarked weeks in our sparse data
model). catches a class of bugs where we forget the sparse-ness.
EOF
)"
```

---

## Task 5: Add public/CNAME for the custom domain

**Files:**
- Create: `public/CNAME`

**Why:** GitHub Pages reads `public/CNAME` (which gets copied to the deploy root) to know which custom domain to serve. Without this, GH Pages would serve at `<username>.github.io/fz.ax`.

- [ ] **Step 1: Create the CNAME file**

Create `public/CNAME` with this exact content (no trailing newline matters but let's include one):

```
fz.ax
```

- [ ] **Step 2: Verify the file**

Run:
```bash
cat public/CNAME
```

Expected: prints `fz.ax`.

- [ ] **Step 3: Commit**

```bash
git add public/CNAME
git commit -m "$(cat <<'EOF'
add public/CNAME for github pages custom domain

stage 1 foundations: pinning the custom domain so GH Pages serves
fz.ax instead of <username>.github.io/fz.ax. file lives in public/
so nuxt copies it to the deploy artifact root.
EOF
)"
```

---

## Task 6: Update nuxt.config.ts for static GitHub Pages deployment

**Files:**
- Modify: `nuxt.config.ts`

**Why:** GitHub Pages serves static files only — no SSR, no serverless. We need Nuxt to render a single static `index.html` that bootstraps the SPA on the client. The `ssr: false` + `nitro.prerender.routes: ['/']` combo gets us there.

- [ ] **Step 1: Update nuxt.config.ts**

Replace the file with:

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: false,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/']
    }
  },
  app: {
    baseURL: '/',
    cdnURL: '',
    head: {
      title: 'four-thousand weekz',
      meta: [
        { name: 'description', content: 'your life visualized in hexagons' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '4000' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})
```

Notes on the new fields:
- `ssr: false` — SPA mode. The page boots empty and Vue takes over on the client.
- `nitro.preset: 'static'` — explicit even though `nuxt generate` implies it; makes intent obvious.
- `nitro.prerender.routes: ['/']` — Nitro pre-renders the root so users get the HTML shell immediately.
- `app.baseURL: '/'` — correct because we're serving from a custom domain root, not `username.github.io/fz.ax`.

- [ ] **Step 2: Run the generator and verify it produces static output**

Run:
```bash
pnpm generate
```

Expected: Nuxt builds and prerenders `/`. Final output goes to `.output/public/`. The command prints something like `✔ You can preview this build using …`.

- [ ] **Step 3: Verify the build artifact contains index.html**

Run:
```bash
ls .output/public/index.html
```

Expected: lists the file.

- [ ] **Step 4: Verify CNAME ended up in the artifact**

Run:
```bash
cat .output/public/CNAME
```

Expected: prints `fz.ax`.

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts
git commit -m "$(cat <<'EOF'
configure nuxt for static github pages deployment

stage 1 foundations: ssr off, nitro static preset, single-route
prerender, baseURL at root for custom domain. confirmed the build
artifact contains both index.html and CNAME ready for GH Pages.
EOF
)"
```

---

## Task 7: Add the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Why:** We want every push to `master` to automatically build and deploy to GitHub Pages, so we never deploy by hand and never wonder which version is live.

- [ ] **Step 1: Create the workflow directory**

Run:
```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create deploy.yml**

Create `.github/workflows/deploy.yml` with this exact content:

```yaml
name: deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Generate static site
        run: pnpm generate

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verify the workflow YAML is parseable**

Run:
```bash
node -e "const yaml=require('fs').readFileSync('.github/workflows/deploy.yml','utf8'); console.log(yaml.split('\\n').length, 'lines')"
```

Expected: prints something like `60 lines` (or whatever line count).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
add github actions workflow for github pages deploy

stage 1 foundations: every push to master runs tests, generates the
static site, and deploys to GH Pages. concurrency group ensures we
never have two deploys racing each other. workflow_dispatch lets us
re-deploy from the actions tab without pushing a commit.
EOF
)"
```

---

## Task 8: Define the FzState TypeScript types

**Files:**
- Create: `types/state.ts`

**Why:** Every other piece of code in this stage will reference these types. Defining them first means every later file gets compile-time guarantees about the shape of state.

- [ ] **Step 1: Create types/state.ts**

Create `types/state.ts` with this exact content:

```ts
/**
 * Single root key in localStorage: 'fz.ax.state'
 *
 * The shape lifted from the spec at:
 * docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md
 *
 * version is intentionally a numeric literal so future migrations
 * can use exhaustive switching to evolve the schema.
 */
export interface FzState {
  version: 1
  dob: string                               // ISO date YYYY-MM-DD
  weeks: Record<number, WeekEntry>          // sparse: only marked weeks present
  vow: VowEntry | null
  letters: LetterEntry[]
  anchors: number[]                         // sorted week indices
  prefs: Preferences
  meta: Meta
}

export interface WeekEntry {
  mark: string                              // single Unicode codepoint (one grapheme cluster)
  whisper?: string                          // free text, soft-capped at ~240 chars
  markedAt: string                          // ISO timestamp of last edit
}

export interface VowEntry {
  text: string
  writtenAt: string                         // ISO timestamp
}

export interface LetterEntry {
  text: string
  sealedAt: string                          // ISO timestamp when written
  unsealAt: string                          // ISO date YYYY-MM-DD when readable
  read: boolean
}

export interface Preferences {
  theme: 'auto' | 'light' | 'dark'
  pushOptIn: boolean
  reducedMotion: boolean | 'auto'
  weekStart: 'mon' | 'sun'
}

export interface Meta {
  createdAt: string                         // first-run timestamp
  lastSundayPrompt?: string                 // ISO date of last Sunday modal
  lastEcho?: string                         // ISO date of last shown Echo (max one per day)
  lastVisitedWeek?: number                  // last week index seen — drives "a week passed" notice
  installedPwa?: boolean
}

/**
 * Default preferences for a brand-new state.
 */
export const DEFAULT_PREFS: Preferences = {
  theme: 'auto',
  pushOptIn: false,
  reducedMotion: 'auto',
  weekStart: 'mon',
}

/**
 * The localStorage root key. All state lives here.
 */
export const STORAGE_KEY = 'fz.ax.state'

/**
 * The legacy v0 storage key. Used by the migration helper only.
 */
export const LEGACY_DOB_KEY = 'dob'
```

- [ ] **Step 2: Verify the file is valid TypeScript**

Run:
```bash
pnpm typecheck
```

Expected: typecheck runs. Existing `app.vue` may still error — that's fine. `types/state.ts` itself should not produce any errors.

- [ ] **Step 3: Commit**

```bash
git add types/state.ts
git commit -m "$(cat <<'EOF'
define FzState types and storage constants

stage 1 foundations: every later file in this stage references these
types. defining them first means we get compile-time guarantees about
state shape from the very first composable. STORAGE_KEY and the
legacy DOB key are exported as constants so there's only one place
to change them later.
EOF
)"
```

---

## Task 9: Build the storage utility (TDD)

**Files:**
- Create: `tests/storage.spec.ts`
- Create: `utils/storage.ts`

**Why:** Reading and writing JSON to `localStorage` with proper error handling is something you want to write once, test thoroughly, and never think about again. Using TDD here also gives us confidence that our test infrastructure works end-to-end.

- [ ] **Step 1: Write the failing tests**

Create `tests/storage.spec.ts` with this exact content:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { readState, writeState, clearState } from '../utils/storage'
import type { FzState } from '../types/state'
import { STORAGE_KEY, DEFAULT_PREFS } from '../types/state'

const sampleState: FzState = {
  version: 1,
  dob: '1990-05-15',
  weeks: {
    100: { mark: '❤', whisper: 'first kiss', markedAt: '2025-01-01T00:00:00.000Z' },
  },
  vow: null,
  letters: [],
  anchors: [],
  prefs: DEFAULT_PREFS,
  meta: { createdAt: '2025-01-01T00:00:00.000Z' },
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no state has been written', () => {
    expect(readState()).toBeNull()
  })

  it('round-trips a full state', () => {
    writeState(sampleState)
    expect(readState()).toEqual(sampleState)
  })

  it('writes JSON under the STORAGE_KEY', () => {
    writeState(sampleState)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(sampleState)
  })

  it('returns null when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(readState()).toBeNull()
  })

  it('returns null when the stored value parses but is not an object', () => {
    localStorage.setItem(STORAGE_KEY, '"a string"')
    expect(readState()).toBeNull()
  })

  it('clears the state', () => {
    writeState(sampleState)
    clearState()
    expect(readState()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/storage.spec.ts
```

Expected: vitest tries to import `../utils/storage` and fails because the file doesn't exist. Output includes "Cannot find module" or similar. Exit code non-zero.

- [ ] **Step 3: Implement utils/storage.ts**

Create `utils/storage.ts` with this exact content:

```ts
import type { FzState } from '../types/state'
import { STORAGE_KEY } from '../types/state'

/**
 * Read the persisted state from localStorage, or null if absent or invalid.
 * Defensive: a corrupt blob is treated as "no state" so the app can recover
 * by re-running first-run rather than throwing on every page load.
 */
export function readState(): FzState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as FzState
  } catch {
    return null
  }
}

/**
 * Persist the state under STORAGE_KEY. Caller is responsible for shape — there
 * is no schema validation at the storage layer (validation belongs in migrate).
 */
export function writeState(state: FzState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Remove all persisted state. Useful for testing and for a "reset" affordance
 * we may add later.
 */
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/storage.spec.ts
```

Expected: all 6 tests pass. Output ends with `Tests  6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add tests/storage.spec.ts utils/storage.ts
git commit -m "$(cat <<'EOF'
add storage utility for reading and writing FzState (TDD)

stage 1 foundations: thin wrapper over localStorage for our single
root key. defensive about corrupt blobs (treated as "no state" so
the app recovers by re-running first-run instead of throwing). six
unit tests cover round-trip, missing key, malformed JSON, non-object
JSON, and clear.
EOF
)"
```

---

## Task 10: Build the v0 → v1 migration utility (TDD)

**Files:**
- Create: `tests/migrate.spec.ts`
- Create: `utils/migrate.ts`

**Why:** Existing users have a `localStorage['dob']` key from the original 430-line `app.vue`. We must not lose their DOB when they reload after the new code ships. The migration runs at module init time, before `useFzState` reads anything.

- [ ] **Step 1: Write the failing tests**

Create `tests/migrate.spec.ts` with this exact content:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { migrate, createFreshState } from '../utils/migrate'
import { STORAGE_KEY, LEGACY_DOB_KEY, DEFAULT_PREFS } from '../types/state'
import type { FzState } from '../types/state'

describe('migrate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when there is no v1 state and no legacy dob', () => {
    expect(migrate()).toBeNull()
  })

  it('passes through an existing v1 state without modification', () => {
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
      vow: null,
      letters: [],
      anchors: [],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    expect(migrate()).toEqual(state)
  })

  it('lifts a legacy dob into a fresh v1 state', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const result = migrate()

    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.dob).toBe('1985-03-21')
    expect(result!.weeks).toEqual({})
    expect(result!.vow).toBeNull()
    expect(result!.letters).toEqual([])
    expect(result!.anchors).toEqual([])
    expect(result!.prefs).toEqual(DEFAULT_PREFS)
    expect(typeof result!.meta.createdAt).toBe('string')
  })

  it('persists the migrated state to STORAGE_KEY', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    migrate()
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1985-03-21')
  })

  it('removes the legacy dob key after migrating', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    migrate()
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('prefers v1 state over legacy dob if both exist', () => {
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
      vow: null,
      letters: [],
      anchors: [],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const result = migrate()

    expect(result!.dob).toBe('1990-05-15')
  })

  describe('createFreshState', () => {
    it('builds a v1 state with the given dob and current timestamp', () => {
      const before = Date.now()
      const state = createFreshState('1990-05-15')
      const after = Date.now()

      expect(state.version).toBe(1)
      expect(state.dob).toBe('1990-05-15')
      expect(state.weeks).toEqual({})
      expect(state.vow).toBeNull()
      expect(state.letters).toEqual([])
      expect(state.anchors).toEqual([])
      expect(state.prefs).toEqual(DEFAULT_PREFS)

      const createdAt = new Date(state.meta.createdAt).getTime()
      expect(createdAt).toBeGreaterThanOrEqual(before)
      expect(createdAt).toBeLessThanOrEqual(after)
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/migrate.spec.ts
```

Expected: tests fail with "Cannot find module '../utils/migrate'". Exit code non-zero.

- [ ] **Step 3: Implement utils/migrate.ts**

Create `utils/migrate.ts` with this exact content:

```ts
import type { FzState } from '../types/state'
import {
  STORAGE_KEY,
  LEGACY_DOB_KEY,
  DEFAULT_PREFS,
} from '../types/state'
import { readState, writeState } from './storage'

/**
 * Build a brand-new FzState given a date of birth.
 * Used by the migration path and by first-run.
 */
export function createFreshState(dob: string): FzState {
  return {
    version: 1,
    dob,
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: { ...DEFAULT_PREFS },
    meta: { createdAt: new Date().toISOString() },
  }
}

/**
 * Migrate any prior storage to v1. Resolution order:
 *
 *   1. If a v1 state already exists at STORAGE_KEY, return it unchanged.
 *   2. Else if the legacy `localStorage['dob']` key exists, lift it into
 *      a fresh v1 state, persist it, and remove the legacy key.
 *   3. Else return null (no prior data, caller will trigger first-run).
 *
 * This function is idempotent — calling it twice has the same effect as
 * calling it once. It must be safe to invoke at every page load.
 */
export function migrate(): FzState | null {
  const existing = readState()
  if (existing !== null) return existing

  const legacy = localStorage.getItem(LEGACY_DOB_KEY)
  if (legacy === null) return null

  const fresh = createFreshState(legacy)
  writeState(fresh)
  localStorage.removeItem(LEGACY_DOB_KEY)
  return fresh
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/migrate.spec.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/migrate.spec.ts utils/migrate.ts
git commit -m "$(cat <<'EOF'
add v0 to v1 storage migration (TDD)

stage 1 foundations: existing users have a localStorage['dob'] key
from the original app.vue. migrate() lifts that into a fresh v1
state, persists it under the new storage key, and removes the
legacy key. idempotent — safe to call on every page load. seven
tests cover all four cases plus the createFreshState helper.
EOF
)"
```

---

## Task 11: Build the useTime composable (TDD)

**Files:**
- Create: `tests/useTime.spec.ts`
- Create: `composables/useTime.ts`

**Why:** All week-math (which week is "today", date range of week N, etc.) must be pure, testable, and independent of Vue. Putting it in a composable (which just exports functions, in the Nuxt convention) keeps it decoupled and unit-testable.

Note on week semantics: the existing `app.vue` computes weeks as `Math.floor((today - dob) / (1000*60*60*24*7))`. We preserve that exact behavior so the migration is visually a no-op for existing users. The spec mentions ISO 8601 weeks for *future* features (anniversary, week-of-year), but the *grid index* uses elapsed-days/7 just like the original.

- [ ] **Step 1: Write the failing tests**

Create `tests/useTime.spec.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest'
import {
  weekIndex,
  weekRange,
  totalWeeks,
  isCurrentWeek,
  pastCount,
  futureCount,
} from '../composables/useTime'

describe('weekIndex', () => {
  it('returns 0 when today is the same day as dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 0 for any day in the first 7 days after dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-06T00:00:00.000Z') // 5 days later
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 1 exactly 7 days after dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-08T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(1)
  })

  it('returns 52 one year (365 days) later', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(52) // 365/7 = 52.14 → floor = 52
  })

  it('handles a leap year correctly (366 days = 52)', () => {
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('2000-12-31T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(52) // 365/7 = 52.14 → floor = 52
  })

  it('returns 0 when today is before dob (clamped)', () => {
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('1999-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(0)
  })
})

describe('weekRange', () => {
  it('returns the start and end dates of the first week', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const range = weekRange(dob, 0)
    expect(range.start.toISOString().slice(0, 10)).toBe('1990-01-01')
    expect(range.end.toISOString().slice(0, 10)).toBe('1990-01-07')
  })

  it('returns the start and end dates of week 100', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const range = weekRange(dob, 100)
    // 100 weeks * 7 days = 700 days after 1990-01-01 → 1991-12-02
    expect(range.start.toISOString().slice(0, 10)).toBe('1991-12-02')
    // end is 6 days later → 1991-12-08
    expect(range.end.toISOString().slice(0, 10)).toBe('1991-12-08')
  })
})

describe('totalWeeks', () => {
  it('is exactly 4000', () => {
    expect(totalWeeks).toBe(4000)
  })
})

describe('isCurrentWeek', () => {
  it('returns true for the index that matches today', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    const idx = weekIndex(dob, today)
    expect(isCurrentWeek(dob, today, idx)).toBe(true)
  })

  it('returns false for any other index', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    const idx = weekIndex(dob, today)
    expect(isCurrentWeek(dob, today, idx + 1)).toBe(false)
    expect(isCurrentWeek(dob, today, idx - 1)).toBe(false)
  })
})

describe('pastCount and futureCount', () => {
  it('pastCount equals the current week index', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(pastCount(dob, today)).toBe(52)
  })

  it('futureCount equals (totalWeeks - 1 - currentIndex)', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(futureCount(dob, today)).toBe(4000 - 1 - 52)
  })

  it('past + 1 (current) + future = totalWeeks', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2010-06-15T00:00:00.000Z')
    expect(pastCount(dob, today) + 1 + futureCount(dob, today)).toBe(4000)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/useTime.spec.ts
```

Expected: tests fail with "Cannot find module '../composables/useTime'". Exit code non-zero.

- [ ] **Step 3: Implement composables/useTime.ts**

Create `composables/useTime.ts` with this exact content:

```ts
/**
 * Pure, Vue-independent time math for fz.ax.
 *
 * The grid uses elapsed-days/7 indexing — same as the original app.vue —
 * so existing users see no visual change after migration. Stage 5+ adds
 * ISO 8601 week-of-year math separately for the anniversary and library
 * features; that math lives here too.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_WEEK = MS_PER_DAY * 7

/**
 * The total number of weeks fz.ax visualizes — the namesake.
 */
export const totalWeeks = 4000

/**
 * The week index of `today` relative to `dob`. Clamped at 0 if today is
 * before dob (defensive against future-DOB inputs).
 */
export function weekIndex(dob: Date, today: Date): number {
  const diff = today.getTime() - dob.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / MS_PER_WEEK)
}

/**
 * The start (inclusive) and end (inclusive) dates of week `index` relative
 * to `dob`. End is 6 days after start.
 */
export function weekRange(dob: Date, index: number): { start: Date; end: Date } {
  const start = new Date(dob.getTime() + index * MS_PER_WEEK)
  const end = new Date(start.getTime() + 6 * MS_PER_DAY)
  return { start, end }
}

/**
 * True if the given index is the same as the current week index for today.
 */
export function isCurrentWeek(dob: Date, today: Date, index: number): boolean {
  return weekIndex(dob, today) === index
}

/**
 * Number of weeks before the current one. Equal to the current week index.
 */
export function pastCount(dob: Date, today: Date): number {
  return weekIndex(dob, today)
}

/**
 * Number of weeks after the current one. Always non-negative.
 */
export function futureCount(dob: Date, today: Date): number {
  const idx = weekIndex(dob, today)
  return Math.max(0, totalWeeks - 1 - idx)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/useTime.spec.ts
```

Expected: all tests pass. Output ends with `Tests  passed`.

- [ ] **Step 5: Commit**

```bash
git add tests/useTime.spec.ts composables/useTime.ts
git commit -m "$(cat <<'EOF'
add useTime composable with pure week math (TDD)

stage 1 foundations: pure, vue-independent time math. mirrors the
existing app.vue's elapsed-days/7 indexing so the migration is a
visual no-op. tests cover dob === today, mid-first-week, exact-week
boundary, year boundary, leap year, past-dob clamp, week range
arithmetic, and the conservation law (past + 1 + future = totalWeeks).
EOF
)"
```

---

## Task 12: Build the useFzState composable (TDD)

**Files:**
- Create: `tests/useFzState.spec.ts`
- Create: `composables/useFzState.ts`

**Why:** This is the single source of truth for application state. Every component and every other composable that needs to read or mutate state goes through this. Stage 1 only needs the bare scaffolding — `getState()`, `setDob()`, `resetState()`, and the auto-persistence — but we set it up correctly so later stages can add `setMark`, `setWhisper`, etc. without restructuring.

- [ ] **Step 1: Write the failing tests**

Create `tests/useFzState.spec.ts` with this exact content:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFzState, __resetForTests } from '../composables/useFzState'
import { STORAGE_KEY, LEGACY_DOB_KEY } from '../types/state'

describe('useFzState', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null state when there is no prior storage', () => {
    const { state } = useFzState()
    expect(state.value).toBeNull()
  })

  it('loads existing v1 state from localStorage on first call', () => {
    const persisted = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
      vow: null,
      letters: [],
      anchors: [],
      prefs: {
        theme: 'auto',
        pushOptIn: false,
        reducedMotion: 'auto',
        weekStart: 'mon',
      },
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const { state } = useFzState()

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('migrates legacy dob on first call', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const { state } = useFzState()

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1985-03-21')
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('setDob initializes state when none exists', () => {
    const { state, setDob } = useFzState()
    expect(state.value).toBeNull()

    setDob('1990-05-15')

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('setDob persists the new state to localStorage', () => {
    const { setDob } = useFzState()
    setDob('1990-05-15')

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1990-05-15')
  })

  it('setDob updates an existing state without touching other fields', () => {
    const persisted = {
      version: 1,
      dob: '1990-05-15',
      weeks: { 100: { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' } },
      vow: null,
      letters: [],
      anchors: [],
      prefs: {
        theme: 'auto',
        pushOptIn: false,
        reducedMotion: 'auto',
        weekStart: 'mon',
      },
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const { state, setDob } = useFzState()
    setDob('1991-06-16')

    expect(state.value!.dob).toBe('1991-06-16')
    expect(state.value!.weeks[100]).toEqual({
      mark: '❤',
      markedAt: '2025-01-01T00:00:00.000Z',
    })
  })

  it('resetState clears storage and the in-memory state', () => {
    const { state, setDob, resetState } = useFzState()
    setDob('1990-05-15')
    expect(state.value).not.toBeNull()

    resetState()

    expect(state.value).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns the same reactive ref across multiple calls', () => {
    const a = useFzState()
    const b = useFzState()
    expect(a.state).toBe(b.state)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: tests fail with "Cannot find module '../composables/useFzState'". Exit code non-zero.

- [ ] **Step 3: Implement composables/useFzState.ts**

Create `composables/useFzState.ts` with this exact content:

```ts
import { ref, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { readState, writeState, clearState } from '../utils/storage'
import { migrate, createFreshState } from '../utils/migrate'

/**
 * The single global state singleton. Declared at module scope so every
 * call to useFzState() returns the same reactive ref.
 *
 * Lazy-loaded on first call so that SSR builds (which prerender at
 * build time without window/localStorage) don't crash.
 */
let _state: Ref<FzState | null> | null = null

function ensureLoaded(): Ref<FzState | null> {
  if (_state !== null) return _state

  const initial = typeof window === 'undefined' ? null : migrate()
  _state = ref(initial)
  return _state
}

/**
 * Set or replace the date of birth. If no state exists, create one from
 * scratch. If state exists, mutate just the dob field (preserving marks,
 * whispers, anchors, etc.). Persists immediately to localStorage.
 */
function setDob(dob: string): void {
  const state = ensureLoaded()
  if (state.value === null) {
    state.value = createFreshState(dob)
  } else {
    state.value = { ...state.value, dob }
  }
  writeState(state.value)
}

/**
 * Wipe all state. Intended for testing and for an eventual user-facing reset.
 */
function resetState(): void {
  const state = ensureLoaded()
  state.value = null
  clearState()
}

/**
 * The composable. Returns the reactive state ref plus typed actions.
 * Later stages will add: setMark, setWhisper, clearMark, setVow,
 * writeAnnualLetter, unsealLetter, addAnchor, removeAnchor, setPref.
 */
export function useFzState() {
  return {
    state: ensureLoaded(),
    setDob,
    resetState,
  }
}

/**
 * Test-only reset of the module-level singleton. Vitest needs to clear
 * the in-memory state between tests because it doesn't re-import the
 * module on each spec.
 */
export function __resetForTests(): void {
  _state = null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
add useFzState composable with auto-persistence (TDD)

stage 1 foundations: single global state singleton declared at module
scope so every consumer gets the same reactive ref. lazy-loaded on
first call so SSR prerender doesn't crash on missing localStorage.
runs migrate() at load so legacy dob keys are lifted into v1 state
automatically. exposes setDob and resetState for stage 1; later
stages add setMark, setWhisper, etc. nine tests cover load, migrate,
set, persist, multi-call identity, and the test-only reset.
EOF
)"
```

---

## Task 13: Create the FzHexagon component

**Files:**
- Create: `components/FzHexagon.vue`

**Why:** A focused single-responsibility unit. Receives one week's index and visual state, renders one cell, emits a hover event. Stage 1 wires it up to render the existing visual; later stages add click handlers for the Mark popover, etc.

- [ ] **Step 1: Create components/FzHexagon.vue**

Create `components/FzHexagon.vue` with this exact content:

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Week index from 0 to totalWeeks-1 */
  index: number
  /** Visual state: past, current, or future */
  state: 'past' | 'current' | 'future'
  /** Hover tooltip text — usually the date range */
  hoverText: string
  /** Whether the modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const symbol = computed(() => {
  if (props.state === 'past') return '⬢'
  if (props.state === 'current') return '⏣'
  return '⬡'
})

const isCurrent = computed(() => props.state === 'current')
</script>

<template>
  <div
    class="hexagon"
    :class="{ 'current-week': isCurrent }"
    :data-current="isCurrent ? 'true' : null"
  >
    {{ symbol }}
    <span
      class="hover-text"
      :class="{ 'hide-hover-text': modalOpen }"
    >{{ hoverText }}</span>
  </div>
</template>

<style scoped>
.hexagon {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  color: #0847F7;
}

.hover-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  border-radius: 5px;
  font-size: 0.75rem;
  visibility: hidden;
  white-space: nowrap;
  z-index: 10;
}

.hexagon:hover .hover-text {
  visibility: visible;
}

.hide-hover-text {
  display: none;
}

.current-week {
  color: #F7B808;
}
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors from FzHexagon.vue.

- [ ] **Step 3: Commit**

```bash
git add components/FzHexagon.vue
git commit -m "$(cat <<'EOF'
add FzHexagon component

stage 1 foundations: single hexagon as a focused component. props
are index, state (past/current/future), hover text, and a modal-open
flag that suppresses the tooltip. preserves the existing visual
exactly: same colors, same hover behavior, same symbol per state.
EOF
)"
```

---

## Task 14: Create the FzGrid component

**Files:**
- Create: `components/FzGrid.vue`

**Why:** Renders all 4000 hexagons. Reads `useFzState` for the dob and computes the current-week index from `useTime`. Handles scroll-to-current on mount. Stage 1 wires the existing visual — Stage 2 will add click handling for the Mark popover.

- [ ] **Step 1: Create components/FzGrid.vue**

Create `components/FzGrid.vue` with this exact content:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { weekIndex, weekRange, totalWeeks } from '../composables/useTime'

interface Props {
  /** Whether the modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const { state } = useFzState()
const today = ref(new Date())

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const currentIndex = computed(() => {
  if (dobDate.value === null) return 0
  return weekIndex(dobDate.value, today.value)
})

function getState(index: number): 'past' | 'current' | 'future' {
  if (index < currentIndex.value) return 'past'
  if (index === currentIndex.value) return 'current'
  return 'future'
}

function getHoverText(index: number): string {
  if (dobDate.value === null) return ''
  const range = weekRange(dobDate.value, index)
  return `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`
}

const indices = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < totalWeeks; i++) arr.push(i)
  return arr
})

function scrollToCurrent(): void {
  void nextTick(() => {
    const el = document.getElementById('current-week')
    if (el !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

onMounted(() => {
  scrollToCurrent()
})

defineExpose({ scrollToCurrent })
</script>

<template>
  <div class="hexagon-grid">
    <FzHexagon
      v-for="i in indices"
      :key="i"
      :id="i === currentIndex ? 'current-week' : undefined"
      :index="i"
      :state="getState(i)"
      :hover-text="getHoverText(i)"
      :modal-open="props.modalOpen"
    />
  </div>
</template>

<style scoped>
.hexagon-grid {
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-gap: 5px;
}

@media (max-width: 1024px) {
  .hexagon-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 768px) {
  .hexagon-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}
</style>
```

Note: `FzHexagon` is auto-imported by Nuxt because it lives in `components/`. No explicit import needed in the template.

Also: there's a small issue with `:id` on a Vue component element — in Vue 3, when you set `:id` on a component, it goes onto the root element of the component's template. That's exactly what we want here (the hexagon div will have `id="current-week"` for scroll targeting). This works because `<FzHexagon>` has a single root element.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors from FzGrid.vue.

- [ ] **Step 3: Commit**

```bash
git add components/FzGrid.vue
git commit -m "$(cat <<'EOF'
add FzGrid component

stage 1 foundations: renders all 4000 hexagons via FzHexagon.
reads state from useFzState, computes current-week index via
useTime. scrolls to current on mount via nextTick + scrollIntoView,
matching the existing app.vue behavior. exposes scrollToCurrent so
parent can call it after dob changes.
EOF
)"
```

---

## Task 15: Create the FzTitle component

**Files:**
- Create: `components/FzTitle.vue`

**Why:** Encapsulates the title, the past/current/future count subtitle, and the title click → modal-open behavior. Uses `useFzState` and `useTime` directly.

- [ ] **Step 1: Create components/FzTitle.vue**

Create `components/FzTitle.vue` with this exact content:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { pastCount, futureCount } from '../composables/useTime'

const emit = defineEmits<{
  openModal: []
  scrollToCurrent: []
}>()

const { state } = useFzState()
const today = ref(new Date())

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const past = computed(() => {
  if (dobDate.value === null) return 0
  return pastCount(dobDate.value, today.value)
})

const future = computed(() => {
  if (dobDate.value === null) return 0
  return futureCount(dobDate.value, today.value)
})
</script>

<template>
  <h1 class="title" @click="emit('openModal')">four-thousand weekz</h1>
  <h3 class="subtitle">
    <span class="ngmi">{{ past }}</span>-⬢
    <span class="beherenow" @click="emit('scrollToCurrent')">⏣</span>
    ⬡-<span class="wagmi">{{ future }}</span>
  </h3>
</template>

<style scoped>
.title {
  font-size: 2.1rem;
  cursor: pointer;
  color: #F7B808;
  display: inline-block;
  transition: all 0.7s ease;
  margin-bottom: 0px;
}

.title:hover {
  animation: pulsate 0.6s infinite;
}

.subtitle {
  color: #F7B808;
  font-size: 1.2rem;
}

.ngmi,
.wagmi {
  font-size: 0.7rem;
  vertical-align: middle;
  color: #0847F7;
}

.beherenow {
  cursor: progress;
  font-size: 1.5rem;
}

@keyframes pulsate {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/FzTitle.vue
git commit -m "$(cat <<'EOF'
add FzTitle component

stage 1 foundations: title, count subtitle, and the title-click and
beherenow-click affordances. emits openModal for the dob editor and
scrollToCurrent for the ⏣ tap. preserves the existing pulsate
animation, the ngmi/wagmi/beherenow text vocabulary, and the
yellow/blue palette.
EOF
)"
```

---

## Task 16: Create the FzScrollHex component

**Files:**
- Create: `components/FzScrollHex.vue`

**Why:** The floating scroll-to-top hexagon that slides in when the user has scrolled past 100px. Existing functionality, now its own component.

- [ ] **Step 1: Create components/FzScrollHex.vue**

Create `components/FzScrollHex.vue` with this exact content:

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const showScrollButton = ref(false)

function handleScroll(): void {
  showScrollButton.value = window.scrollY > 100
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div
    class="hexagon-scroll"
    :class="{ toggled: showScrollButton }"
    @click="scrollToTop"
  >
    <div class="icon">⬢</div>
  </div>
</template>

<style scoped>
/*
 * The shape comes from assets/main.css's .hexagon-scroll rules.
 * This component owns the show/hide behavior; the visual lives in
 * the global stylesheet so it can co-locate the ::before/::after
 * pseudo-elements that draw the hex shape. We keep the global rules
 * intact and only re-declare what's scoped to this component.
 */
</style>
```

Note: the visual styles for `.hexagon-scroll`, `:before`, `:after`, `.icon`, and `.toggled` already live in `assets/main.css` (which is loaded globally via `nuxt.config.ts`). We do not duplicate them here. The component owns only the show/hide *behavior*.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/FzScrollHex.vue
git commit -m "$(cat <<'EOF'
add FzScrollHex component

stage 1 foundations: the floating scroll-to-top hexagon. owns the
show/hide behavior (scrollY > 100); the visual styling stays in
assets/main.css where it can co-locate the ::before/::after pseudo
elements that draw the hex shape. cleans up the scroll listener on
unmount.
EOF
)"
```

---

## Task 17: Create the FzDobModal component

**Files:**
- Create: `components/FzDobModal.vue`

**Why:** The existing date-input modal. Stage 6 will replace this with a three-screen FzFirstRun ceremony, but for Stage 1 we preserve the existing UX exactly.

- [ ] **Step 1: Create components/FzDobModal.vue**

Create `components/FzDobModal.vue` with this exact content:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFzState } from '../composables/useFzState'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { state, setDob } = useFzState()
const localDob = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localDob.value = state.value?.dob ?? defaultFourThousandWeeksAgo()
    }
  },
  { immediate: true },
)

function defaultFourThousandWeeksAgo(): string {
  const ms = 4000 * 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString().slice(0, 10)
}

function save(): void {
  if (localDob.value === '') return
  setDob(localDob.value)
  emit('saved')
  emit('close')
}

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="modal-overlay" @click="onBackdropClick">
    <div class="modal-content" @click.stop>
      <h2 class="modal-header">d⬡b</h2>
      <input
        type="date"
        v-model="localDob"
        @keyup.enter="save"
      />
      <button class="btn-76" @click="save">4⬢⏣⬡</button>
      <div class="modal-subtitle">will be saved to your local browser storage</div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 5px;
  text-align: center;
  z-index: 1001;
}

.modal-header {
  font-size: 2.1rem;
  color: #F7B808;
}

.modal-subtitle {
  font-size: 0.7rem;
}

input[type="date"] {
  padding: 0.5rem;
  margin: 0.5rem;
}

.btn-76,
.btn-76 *,
.btn-76 :after,
.btn-76 :before,
.btn-76:after,
.btn-76:before {
  border: 0 solid;
  box-sizing: border-box;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: button;
  background-color: #F7B808;
  background-image: none;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif,
    Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
  font-size: 100%;
  line-height: 1.5;
  margin: 0;
  -webkit-mask-image: -webkit-radial-gradient(#000, #fff);
  padding: 0;
  --neon: #0847F7;
  box-sizing: border-box;
  font-weight: 900;
  -webkit-mask-image: none;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.7rem 1rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
}

.btn-76:hover {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon),
    0 0 100px var(--neon);
  color: #fff;
  outline-color: transparent;
  transition: 0.2s linear 0.6s;
}
</style>
```

Note: the original `app.vue` has a longer set of `.btn-76` rules (with `.top`, `.right`, `.bottom`, `.left` border-animation pseudo-elements). Those are visual flourishes that didn't actually fire because the `<span>` sub-elements weren't rendered. We're preserving the *visible* button (background color, text, hover glow) and dropping the dead animation rules. If you want them back, lift them from the existing `app.vue` lines 277-400.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/FzDobModal.vue
git commit -m "$(cat <<'EOF'
add FzDobModal component

stage 1 foundations: the existing date-input modal as its own
component. preserves the d⬡b header, the date picker, the 4⬢⏣⬡
button with its yellow/blue hover glow, and the local-storage-only
subtitle. Stage 6 will replace this with FzFirstRun (three-screen
ceremony) but for now we want the visual experience identical.
EOF
)"
```

---

## Task 18: Create the FzPage component

**Files:**
- Create: `components/FzPage.vue`

**Why:** The top-level layout that composes FzTitle, FzGrid, FzScrollHex, FzDobModal, and the ASCII-art easter egg. This becomes what `app.vue` mounts. All state lives in `useFzState`; this component just orchestrates.

- [ ] **Step 1: Create components/FzPage.vue**

Create `components/FzPage.vue` with this exact content:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFzState } from '../composables/useFzState'

const { state } = useFzState()
const showModal = ref(false)
const gridRef = ref<{ scrollToCurrent: () => void } | null>(null)

const containerClasses = computed(() => ({
  'modal-open': showModal.value,
}))

function openModal(): void {
  showModal.value = true
}

function closeModal(): void {
  showModal.value = false
}

function onSaved(): void {
  void gridRef.value?.scrollToCurrent()
}

function scrollToCurrent(): void {
  void gridRef.value?.scrollToCurrent()
}

const ASCII_HEXAGON = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣶⣤⡀⠀⠀⠀⠀⣀⣤⣶⣿⣿⣿⣷⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢿⣿⠿⠛⠉⠀⠀⣀⣀⠀⠀⠉⠛⠿⣿⡿⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣀⣴⣤⡀⠀⠀⠀⠀⠀⠀⢀⣠⣴⡾⠟⠻⢷⣦⣄⠀⠀⠀⠀⠀⠀⠀⢀⣤⣦⣀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣠⣶⣿⣿⣿⣿⣿⣷⣦⡄⠀⠀⣶⡿⠛⠉⠀⠀⠀⠀⠉⠛⢿⣶⠀⠀⢠⣴⣾⣿⣿⣿⣿⣿⣶⣄⠀⠀⠀
⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀
⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀
⠀⠀⠀⠻⢿⣿⣿⣿⣿⣿⣿⠿⠃⠀⠀⢿⣧⣄⡀⠀⠀⠀⠀⢀⣠⣼⡿⠀⠀⠘⠿⣿⣿⣿⣿⣿⣿⡿⠟⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠛⠿⠟⠋⠀⠀⠀⠀⠀⠀⠉⠛⠿⣶⣤⣤⣶⠿⠛⠉⠀⠀⠀⠀⠀⠀⠙⠻⠿⠋⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣶⣷⣦⣄⠀⠀⠈⠙⠋⠁⠀⢀⣠⣴⣾⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣿⣶⠀⠀⠀⠀⣶⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠿⣿⣿⣿⣿⡿⠟⠋⠀⠀⠀⠀⠙⠻⢿⣿⣿⣿⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
`

onMounted(() => {
  if (state.value === null) {
    showModal.value = true
  }
  // Preserve the easter-egg ASCII hexagon comment in the page source.
  document.body.appendChild(document.createComment(ASCII_HEXAGON))
})
</script>

<template>
  <div :class="['container', containerClasses]">
    <FzTitle
      @open-modal="openModal"
      @scroll-to-current="scrollToCurrent"
    />
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzGrid ref="gridRef" :modal-open="showModal" />
  </div>
  <FzScrollHex />
</template>

<style scoped>
.container {
  text-align: center;
  padding: 2rem;
}

.modal-open :deep(.hexagon-grid) {
  pointer-events: none;
}
</style>
```

Notes:
- The ASCII hexagon comment is hoisted to a module-level `const` for readability and so future tests can reference it. Stage 1 preserves it verbatim from the original `app.vue`.
- `:deep(.hexagon-grid)` reaches into the FzGrid scoped style to disable pointer events when the modal is open — same as the original `.modal-open .hexagon-grid` rule.
- `<FzTitle>`, `<FzGrid>`, `<FzDobModal>`, `<FzScrollHex>` are all auto-imported by Nuxt.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/FzPage.vue
git commit -m "$(cat <<'EOF'
add FzPage component

stage 1 foundations: top-level layout composing FzTitle, FzGrid,
FzDobModal, FzScrollHex. owns the modal show/hide ref and forwards
events from FzTitle. opens the dob modal on first run. preserves
the ASCII hexagon comment easter egg by appending it to body on
mount, exactly as the original app.vue did.
EOF
)"
```

---

## Task 19: Replace app.vue with a thin shell

**Files:**
- Modify: `app.vue`

**Why:** Now that all the pieces are in place, `app.vue` collapses to a minimal shell that just mounts `<FzPage/>`. This is the moment the refactor actually goes live.

- [ ] **Step 1: Replace app.vue**

Replace the entire contents of `app.vue` with:

```vue
<script setup lang="ts">
// app.vue is intentionally a thin shell. All layout, state, and
// behavior live in components/FzPage.vue and its children.
</script>

<template>
  <FzPage />
</template>
```

- [ ] **Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: no errors. (If there were errors in the old `app.vue`, they're now gone because that code is gone.)

- [ ] **Step 3: Run lint**

Run:
```bash
pnpm lint
```

Expected: no errors. If there are auto-fixable issues, run `pnpm exec eslint . --fix`.

- [ ] **Step 4: Run all tests**

Run:
```bash
pnpm test
```

Expected: all tests pass — sanity, storage, migrate, useTime, useFzState. Output ends with something like `Tests  36 passed (36)` (the exact number depends on how many `it()` blocks across all spec files).

- [ ] **Step 5: Run the dev server and visually verify**

Run:
```bash
pnpm dev
```

In a browser, open the URL printed (usually http://localhost:3000):
- The page loads with the title "four-thousand weekz" pulsating yellow.
- The subtitle shows past-⬢ ⏣ ⬡-future counts.
- The hexagon grid renders 4000 cells.
- The current week is highlighted in yellow.
- Hovering a hexagon shows the date range tooltip.
- Clicking the title opens the d⬡b modal.
- Clicking the ⏣ in the subtitle scrolls to the current week.
- Scrolling down 100px reveals the floating scroll-to-top hexagon.
- View page source: the ASCII hexagon comment is present in the body.

If anything doesn't work, do not commit. Diagnose and fix before continuing.

- [ ] **Step 6: Stop the dev server**

Press Ctrl+C in the terminal where `pnpm dev` is running.

- [ ] **Step 7: Commit**

```bash
git add app.vue
git commit -m "$(cat <<'EOF'
collapse app.vue into a thin shell mounting FzPage

stage 1 foundations: the refactor goes live. app.vue is now 8 lines.
all layout, state, and behavior live in components/FzPage.vue and
its children. visually verified: title pulse, hexagon grid, current
week highlight, hover tooltips, modal open/close, scroll-to-current,
scroll-to-top hex, ASCII easter egg in page source — all working.
EOF
)"
```

---

## Task 20: Delete the unused server directory

**Files:**
- Delete: `server/`

**Why:** The current `server/` directory contains only a `tsconfig.json` and is a leftover from the Nuxt template scaffold. We're a fully static SPA — no server routes, no API endpoints. Removing it makes the file structure honest about that.

- [ ] **Step 1: Verify the directory is empty (apart from tsconfig.json)**

Run:
```bash
ls -la server/
```

Expected: shows `tsconfig.json` and nothing else (besides `.` and `..`).

- [ ] **Step 2: Remove the directory**

Run:
```bash
rm -rf server/
```

- [ ] **Step 3: Verify the build still succeeds without it**

Run:
```bash
pnpm generate
```

Expected: build completes successfully. Output goes to `.output/public/`.

- [ ] **Step 4: Commit**

```bash
git add -A server/
git commit -m "$(cat <<'EOF'
remove unused server directory

stage 1 foundations: leftover from the nuxt template scaffold.
fz.ax is a fully static SPA — no server routes, no api endpoints.
verified the build still completes cleanly without it.
EOF
)"
```

---

## Task 21: Final smoke test and stage commit marker

**Files:**
- None (pure verification step)

**Why:** Before declaring Stage 1 done, run every check one more time end-to-end. This is the moment where you catch the thing you forgot.

- [ ] **Step 1: Clean install**

Run:
```bash
rm -rf node_modules .nuxt .output
pnpm install
```

Expected: pnpm reinstalls everything cleanly. No errors.

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Lint**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Tests**

Run:
```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Build**

Run:
```bash
pnpm generate
```

Expected: build succeeds, `.output/public/index.html` exists, `.output/public/CNAME` exists.

- [ ] **Step 6: Verify the build artifact**

Run:
```bash
ls .output/public/index.html .output/public/CNAME && cat .output/public/CNAME
```

Expected: both files exist; `cat` prints `fz.ax`.

- [ ] **Step 7: Smoke test the dev server one more time**

Run:
```bash
pnpm dev
```

Open the printed URL. Verify everything from Task 19 Step 5 again:
- Title pulses on hover
- Grid renders 4000 hexagons
- Current week is yellow
- Hover shows date range
- Title click opens modal
- ⏣ scrolls to current
- Scroll-down reveals scroll-hex
- ASCII easter egg in page source

- [ ] **Step 8: Stop the dev server**

Press Ctrl+C.

- [ ] **Step 9: Tag the stage 1 completion in git**

Run:
```bash
git tag stage-1-foundations
git log --oneline -25
```

Expected: the most recent commits show the stage 1 work, and the tag points at the latest commit.

---

## Self-review checklist

After completing all tasks, verify against the spec:

- [ ] All v0 → v1 migration paths covered (existing dob, no dob, existing v1)? → Task 10 tests
- [ ] useTime returns the same values as the original `app.vue` math? → Task 11 tests + Task 19 visual smoke test
- [ ] No new features added (the spec says Stage 1 is "looks identical to today")? → Task 19 Step 5 visual check
- [ ] CNAME present in the deploy artifact? → Task 21 Step 6
- [ ] GitHub Actions workflow file present and parseable? → Task 7
- [ ] Vitest runs all spec files? → Task 21 Step 4
- [ ] No `any` types without an explicit justification comment? → grep `any` in `composables/`, `utils/`, `types/`
- [ ] No `@ts-ignore` or `@ts-expect-error`? → grep
- [ ] ASCII hexagon comment still present in page source? → Task 19 Step 5
- [ ] All commits passing pre-commit hooks (if any)? → check `git log` for any `--no-verify` (there should be none)

---

## Definition of done for Stage 1

- All 21 tasks completed.
- All tests passing: sanity (1) + storage (6) + migrate (7) + useTime (14) + useFzState (8) = **36 tests**.
- `pnpm generate` succeeds and produces a static `.output/public/` containing `index.html` and `CNAME`.
- `pnpm dev` shows the same visual experience as the pre-refactor site.
- The ASCII hexagon easter egg is preserved in the rendered HTML body.
- The `server/` directory is gone.
- A `stage-1-foundations` tag exists at the head of master.
- No spec features from F0.1+ have been implemented yet — that's Stage 2.

Once this is true, you are ready for **Stage 2 — The Mark + The Whisper**.
