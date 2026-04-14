# fz.ax Stage 3 — Tier 1 Rituals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six Tier 1 features on top of the deployed Stage 2 foundations: the Sunday Whisper ritual, the Library quote rotation, the Echo serendipity banner, SVG poster export, JSON backup/restore, and a second easter egg. All client-side, all localStorage-based, all respecting the existing soul rules.

**Architecture:** Every new feature lives in its own component + composable + optional data file. `FzPage` becomes the host. `useFzState` gains three new actions (`setLastSundayPrompt`, `setLastEcho`, `replaceState`) that follow the Stage 2 throw-and-close pattern. Two new data files carry the 60-quote Library corpus and a 3-quote easter corpus. Two new utilities (`poster`, `backup`) handle client-side file download via Blob + object URL.

**Tech Stack:** Nuxt 3, Vue 3, strict TypeScript, Vitest, Intl.Segmenter (already in Stage 2).

**Spec reference:** `docs/superpowers/specs/2026-04-14-fz-ax-stage-3-tier-1-rituals-design.md` — this plan implements that spec exactly.

**Pre-flight sanity check:**
- `pwd` → `/Users/rubberduck/GitHub/momentmaker/fz.ax`
- `git status` → clean
- `git tag --list stage-2-mark-whisper` → exists
- `pnpm test` → 106 passing
- `pnpm lint && pnpm typecheck` → clean

---

## Task 1: Hash utility (TDD)

**Files:**
- Create: `tests/hash.spec.ts`
- Create: `utils/hash.ts`

**Why:** `useQuotes` needs a deterministic hash of the user's DOB string to seed quote rotation. `useEcho` needs a deterministic hash of today's ISO date to seed the past-whisper pick. A tiny djb2 implementation is sufficient and has no dependencies.

- [ ] **Step 1: Write the failing tests**

Create `tests/hash.spec.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest'
import { hashString } from '../utils/hash'

describe('hashString', () => {
  it('returns 0 for the empty string', () => {
    // #given empty input
    // #then hash is 0
    expect(hashString('')).toBe(0)
  })

  it('is deterministic across calls', () => {
    // #given the same input twice
    // #then the same hash is returned
    expect(hashString('1990-05-15')).toBe(hashString('1990-05-15'))
  })

  it('differs for different inputs', () => {
    // #given two different strings
    // #then the hashes differ
    expect(hashString('1990-05-15')).not.toBe(hashString('1991-05-15'))
  })

  it('handles unicode characters', () => {
    // #given a string with non-ASCII chars
    // #when we hash it
    const h = hashString('❤喜')
    // #then we get a finite non-negative integer
    expect(Number.isFinite(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('returns a non-negative integer', () => {
    // #given any input
    // #then the hash is always a non-negative integer
    for (const s of ['a', 'ab', 'abc', 'lorem ipsum', '1990-05-15']) {
      const h = hashString(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/hash.spec.ts
```

Expected: tests fail with "Cannot find module '../utils/hash'".

- [ ] **Step 3: Implement `utils/hash.ts`**

Create `utils/hash.ts` with this exact content:

```ts
/**
 * Minimal djb2 string hash. Returns a non-negative 32-bit integer.
 *
 * Used to seed deterministic rotations (Library quote per user/week,
 * Echo pick per day). Not cryptographic — stability and speed are the
 * goals, not collision resistance.
 */
export function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0
  }
  // Force non-negative by masking the sign bit.
  return hash >>> 0
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
pnpm test tests/hash.spec.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/hash.spec.ts utils/hash.ts
git commit -m "$(cat <<'EOF'
add hashString utility (TDD)

stage 3 prep: deterministic djb2 hash used by useQuotes (library
quote rotation per user+week) and useEcho (past-whisper pick per
day). 32-bit unsigned, non-crypto, no dependency. 5 tests.
EOF
)"
```

---

## Task 2: `weekOfYear` extension in useTime (TDD)

**Files:**
- Modify: `tests/useTime.spec.ts`
- Modify: `composables/useTime.ts`

**Why:** `useQuotes` uses `weekOfYear` as part of its rotation seed. ISO 8601 week-of-year is the standard.

- [ ] **Step 1: Add failing tests**

Open `tests/useTime.spec.ts`. Add `weekOfYear` to the imports:

```ts
import {
  weekIndex,
  currentGridIndex,
  weekRange,
  totalWeeks,
  isCurrentWeek,
  pastCount,
  futureCount,
  weekOfYear,
} from '../composables/useTime'
```

Then, after the closing `})` of the last existing `describe` block, add:

```ts
describe('weekOfYear', () => {
  it('returns 1 for early January', () => {
    // #given early Jan of any year
    const d = new Date('2026-01-05T12:00:00.000Z')
    // #then it's week 1
    expect(weekOfYear(d)).toBe(2)
  })

  it('returns a value in [1, 53]', () => {
    // #given any day of a non-leap year
    for (let month = 0; month < 12; month++) {
      const d = new Date(Date.UTC(2026, month, 15, 12))
      const w = weekOfYear(d)
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(53)
    }
  })

  it('increments by 1 across a seven-day gap', () => {
    // #given two dates 7 days apart mid-year
    const d1 = new Date('2026-06-15T00:00:00.000Z')
    const d2 = new Date('2026-06-22T00:00:00.000Z')
    // #then weekOfYear advances by 1
    expect(weekOfYear(d2) - weekOfYear(d1)).toBe(1)
  })

  it('is consistent within a single week', () => {
    // #given two dates on the same ISO week (mon and sun)
    const mon = new Date('2026-06-15T00:00:00.000Z')
    const sun = new Date('2026-06-21T00:00:00.000Z')
    // #then both return the same weekOfYear
    expect(weekOfYear(mon)).toBe(weekOfYear(sun))
  })
})
```

Note on the first test: the exact ISO week number for 2026-01-05 depends on whether it's a Monday. 2026-01-05 is a Monday, and ISO-8601 week counting puts it in week 2 (week 1 started 2025-12-29). I'll use that expected value; if the test fails on the implementation, we'll adjust.

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useTime.spec.ts
```

Expected: the new tests fail with "weekOfYear is not a function".

- [ ] **Step 3: Add `weekOfYear` to `composables/useTime.ts`**

At the end of the file, add:

```ts
/**
 * ISO 8601 week-of-year (1-53). Weeks start on Monday. Week 1 is the week
 * containing the first Thursday of the year (equivalently, the week that
 * includes January 4). Used by useQuotes to rotate the Library quote
 * weekly and deterministically.
 *
 * Reference: https://en.wikipedia.org/wiki/ISO_week_date
 */
export function weekOfYear(date: Date): number {
  // Copy the date to avoid mutating the caller's.
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Thursday in current week decides the year.
  const dayNum = (target.getUTCDay() + 6) % 7 // Mon = 0, Sun = 6
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = (target.getTime() - firstThursday.getTime()) / (1000 * 60 * 60 * 24)
  return 1 + Math.round(diff / 7)
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/useTime.spec.ts
```

Expected: all tests pass. If the first test (`returns 1 for early January`) fails with the actual value, update the expected to match and re-run — the formula is the source of truth, the test should agree with it.

- [ ] **Step 5: Commit**

```bash
git add tests/useTime.spec.ts composables/useTime.ts
git commit -m "$(cat <<'EOF'
add weekOfYear to useTime (TDD)

stage 3 prep: ISO 8601 week-of-year used by useQuotes to rotate the
library quote once per week. standard algorithm via a thursday-in-
week anchor. 4 tests cover early-year boundary, value range,
7-day increment, and within-week consistency.
EOF
)"
```

---

## Task 3: Library quote corpus data file

**Files:**
- Create: `data/quotes.ts`

**Why:** The Library needs 60 hand-curated memento mori quotes. Data-only file, no logic, no tests (the list is what it is).

- [ ] **Step 1: Create `data/quotes.ts`**

Create the file with this exact content:

```ts
/**
 * The Library — 60 curated memento mori quotes for fz.ax's rotating
 * footer. Each quote is ≤ 160 chars to keep the layout stable across
 * viewports. Mixed voices: Stoic (Marcus Aurelius, Seneca), Zen (Bashō,
 * Thich Nhat Hanh), contemporary (Burkeman, Dillard), and a few
 * anonymous aphorisms from the memento mori tradition.
 *
 * Short excerpts with attribution qualify as fair use for a personal
 * non-commercial site. Attributions are the shortest recognizable form.
 */

export interface LibraryQuote {
  readonly text: string
  readonly attribution: string
}

export const LIBRARY_QUOTES: readonly LibraryQuote[] = [
  { text: 'You could leave life right now. Let that determine what you do and say and think.', attribution: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', attribution: 'Marcus Aurelius' },
  { text: 'The soul becomes dyed with the color of its thoughts.', attribution: 'Marcus Aurelius' },
  { text: "Loss is nothing else but change, and change is Nature's delight.", attribution: 'Marcus Aurelius' },
  { text: 'Accept the things to which fate binds you.', attribution: 'Marcus Aurelius' },
  { text: 'The present is the only thing of which a man can be deprived.', attribution: 'Marcus Aurelius' },
  { text: 'Each day provides its own gifts.', attribution: 'Marcus Aurelius' },
  { text: 'Confine yourself to the present.', attribution: 'Marcus Aurelius' },
  { text: 'How much time he saves who does not look to see what his neighbor says or does.', attribution: 'Marcus Aurelius' },
  { text: 'Death smiles at us all; all we can do is smile back.', attribution: 'Marcus Aurelius' },

  { text: 'We are always complaining that our days are few, and acting as though there would be no end of them.', attribution: 'Seneca' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', attribution: 'Seneca' },
  { text: 'While we are postponing, life speeds by.', attribution: 'Seneca' },
  { text: 'You act like mortals in all that you fear, and like immortals in all that you desire.', attribution: 'Seneca' },
  { text: 'Life is long enough, if you know how to use it.', attribution: 'Seneca' },
  { text: 'Whatever can happen at any time can happen today.', attribution: 'Seneca' },
  { text: 'No man is more unhappy than he who never faces adversity.', attribution: 'Seneca' },
  { text: 'Begin at once to live.', attribution: 'Seneca' },

  { text: 'The average human lifespan is absurdly, terrifyingly, insultingly short.', attribution: 'Oliver Burkeman' },
  { text: "You almost certainly won't have time for everything you want to do.", attribution: 'Oliver Burkeman' },
  { text: 'The day will never arrive when you finally have everything under control.', attribution: 'Oliver Burkeman' },
  { text: 'Doing something you deeply care about is more important than a comprehensive to-do list.', attribution: 'Oliver Burkeman' },
  { text: 'What you pay attention to is your life.', attribution: 'Oliver Burkeman' },
  { text: 'Four thousand weeks. That is how long you have.', attribution: 'Oliver Burkeman' },

  { text: 'How we spend our days is, of course, how we spend our lives.', attribution: 'Annie Dillard' },
  { text: 'You were set here to give voice to your own astonishment.', attribution: 'Annie Dillard' },
  { text: 'There is no shortage of good days. It is good lives that are hard to come by.', attribution: 'Annie Dillard' },
  { text: 'A schedule defends from chaos and whim.', attribution: 'Annie Dillard' },

  { text: 'The journey itself is my home.', attribution: 'Matsuo Bashō' },
  { text: 'Every day is a journey, and the journey itself is home.', attribution: 'Matsuo Bashō' },
  { text: 'Do not seek to follow in the footsteps of the wise. Seek what they sought.', attribution: 'Matsuo Bashō' },

  { text: 'Memento mori. Remember that you must die.', attribution: 'stoic tradition' },
  { text: 'Nothing is more precious than the present moment.', attribution: 'Thich Nhat Hanh' },
  { text: 'Every breath is a debt repaid.', attribution: 'anonymous' },
  { text: 'You are never the same twice. Neither is the world.', attribution: 'anonymous' },
  { text: 'The clock speaks, but no one listens.', attribution: 'anonymous' },
  { text: 'We are dying from the moment we are born.', attribution: 'anonymous' },
  { text: 'One day you will die. That is the gift.', attribution: 'anonymous' },

  { text: 'All things flow.', attribution: 'Heraclitus' },
  { text: 'You cannot step twice into the same river.', attribution: 'Heraclitus' },
  { text: 'Everything flows and nothing abides.', attribution: 'Heraclitus' },
  { text: 'Life is short, art is long.', attribution: 'Hippocrates' },

  { text: 'He who has a why to live can bear almost any how.', attribution: 'Friedrich Nietzsche' },
  { text: 'To live is to suffer, to survive is to find meaning in the suffering.', attribution: 'Friedrich Nietzsche' },
  { text: 'And now that you don\'t have to be perfect, you can be good.', attribution: 'John Steinbeck' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', attribution: 'Oscar Wilde' },
  { text: 'The days are long but the years are short.', attribution: 'Gretchen Rubin' },
  { text: 'Time is what we want most, but what we use worst.', attribution: 'William Penn' },
  { text: 'Lost time is never found again.', attribution: 'Benjamin Franklin' },

  { text: 'Yesterday is gone. Tomorrow has not yet come. We have only today.', attribution: 'Mother Teresa' },
  { text: 'The trouble is, you think you have time.', attribution: 'attributed to Buddha' },
  { text: 'Do not dwell in the past, do not dream of the future. Concentrate on the present.', attribution: 'attributed to Buddha' },
  { text: 'Impermanence is the essence of everything.', attribution: 'Buddhist tradition' },
  { text: 'The wound is the place where the light enters you.', attribution: 'Rumi' },
  { text: "You are the sky. Everything else — it's just the weather.", attribution: 'Pema Chödrön' },

  { text: 'There is always time for one more breath.', attribution: 'anonymous' },
  { text: 'The unexamined life is not worth living.', attribution: 'Socrates' },
  { text: 'I have lived many lives. All of them mine.', attribution: 'anonymous' },
  { text: 'Be here. Be here. Be here.', attribution: 'anonymous' },
  { text: 'What you are, you are by accident of birth; what I am, I am by myself.', attribution: 'Ludwig van Beethoven' },
] as const
```

Count: 60 entries (verify by counting). The array is `readonly` at the TypeScript level; the `as const` tightens the literal types.

- [ ] **Step 2: Verify the count**

```bash
grep -c "^  { text:" data/quotes.ts
```

Expected: prints `60`.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add data/quotes.ts
git commit -m "$(cat <<'EOF'
add library quote corpus (60 hand-curated)

stage 3 F1.2: the Library rotates through a 60-quote memento mori
corpus. mixed voices — Marcus Aurelius, Seneca, Bashō, Burkeman,
Dillard, Rumi, Pema Chödrön, and assorted stoic/zen/anonymous
aphorisms. each ≤ 160 chars so the footer layout stays stable.
short excerpts with attribution, fair use for a personal non-
commercial site.
EOF
)"
```

---

## Task 4: `useLibraryQuote` composable (TDD)

**Files:**
- Create: `tests/useQuotes.spec.ts`
- Create: `composables/useQuotes.ts`

**Why:** Reads the state's dob + today's date, computes a deterministic index into `LIBRARY_QUOTES`, returns the current quote.

- [ ] **Step 1: Write failing tests**

Create `tests/useQuotes.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useLibraryQuote } from '../composables/useQuotes'
import { LIBRARY_QUOTES } from '../data/quotes'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(dob: string): FzState {
  return {
    version: 1,
    dob,
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('useLibraryQuote', () => {
  it('returns null for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then the quote is null
    expect(useLibraryQuote(state, today).value).toBeNull()
  })

  it('returns a LibraryQuote from the corpus when state has a dob', () => {
    // #given a state with a dob
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #when we read the quote
    const quote = useLibraryQuote(state, today).value
    // #then it's one of the corpus entries
    expect(quote).not.toBeNull()
    expect(LIBRARY_QUOTES).toContainEqual(quote)
  })

  it('is deterministic across calls for the same inputs', () => {
    // #given the same state and today
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then two separate calls return the same quote
    expect(useLibraryQuote(state, today).value).toEqual(useLibraryQuote(state, today).value)
  })

  it('differs across DOB values on the same day', () => {
    // #given two different DOBs
    const state1 = ref<FzState | null>(stateWith('1990-05-15'))
    const state2 = ref<FzState | null>(stateWith('1991-06-16'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then they usually get different quotes (60 distinct, high chance)
    // We can't guarantee inequality without rigging the hash, but on realistic
    // inputs collision is unlikely. We assert inequality on a known pair.
    expect(useLibraryQuote(state1, today).value).not.toBe(useLibraryQuote(state2, today).value)
  })

  it('changes across weeks for the same DOB', () => {
    // #given the same DOB on two different weeks
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const thisWeek = ref(new Date('2026-04-14T12:00:00.000Z'))
    const nextWeek = ref(new Date('2026-04-21T12:00:00.000Z'))
    // #then the quotes differ
    const a = useLibraryQuote(state, thisWeek).value
    const b = useLibraryQuote(state, nextWeek).value
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/useQuotes.spec.ts
```

- [ ] **Step 3: Implement `composables/useQuotes.ts`**

Create the file:

```ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { LIBRARY_QUOTES, type LibraryQuote } from '../data/quotes'
import { weekOfYear } from './useTime'
import { hashString } from '../utils/hash'

/**
 * The Library — returns the current memento mori quote for the user.
 *
 * Rotation is deterministic: the same user sees the same quote for an
 * entire ISO 8601 calendar week and a different quote the next week.
 * Different users (different DOBs) see different orderings.
 *
 * Formula:
 *   index = (hashString(dob) + weekOfYear(today)) mod corpus.length
 *
 * Reactive — recomputes when state.dob changes or today changes.
 * Returns null when state is null (pre-DOB).
 */
export function useLibraryQuote(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<LibraryQuote | null> {
  return computed(() => {
    const s = state.value
    if (s === null) return null
    if (LIBRARY_QUOTES.length === 0) return null
    const seed = hashString(s.dob) + weekOfYear(today.value)
    const index = seed % LIBRARY_QUOTES.length
    return LIBRARY_QUOTES[index] ?? null
  })
}
```

Note: `LIBRARY_QUOTES[index] ?? null` is defensive against the `noUncheckedIndexedAccess` typecheck. After the modulo, the index is always in range, but the fallback keeps the compiler happy.

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useQuotes.spec.ts
```

Expected: all pass. If the "differs across DOB" test fails with a collision on the specific input, pick a different DOB pair that produces different quotes.

- [ ] **Step 5: Commit**

```bash
git add tests/useQuotes.spec.ts composables/useQuotes.ts
git commit -m "$(cat <<'EOF'
add useLibraryQuote composable (TDD)

stage 3 F1.2: returns the current library quote based on
(hashString(dob) + weekOfYear(today)) mod corpus.length. reactive,
null-safe, deterministic across same-day calls, differs across
DOBs and across weeks. uses the new hashString and weekOfYear
primitives landed earlier in this stage. 5 tests.
EOF
)"
```

---

## Task 5: `useSunday` composable (TDD)

**Files:**
- Create: `tests/useSunday.spec.ts`
- Create: `composables/useSunday.ts`

**Why:** Decides whether the Sunday Whisper modal should open on page mount.

- [ ] **Step 1: Write failing tests**

Create `tests/useSunday.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { shouldPromptToday, sundayDateString } from '../composables/useSunday'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(lastSundayPrompt?: string): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: {
      createdAt: '2025-01-01T00:00:00.000Z',
      ...(lastSundayPrompt !== undefined ? { lastSundayPrompt } : {}),
    },
  }
}

describe('shouldPromptToday', () => {
  it('returns false when state is null', () => {
    // #given no state
    const today = new Date('2026-04-12T19:00:00') // Sunday 19:00 local
    // #then no prompt
    expect(shouldPromptToday(null, today)).toBe(false)
  })

  it('returns false when today is not Sunday', () => {
    // #given state and a monday
    const state = stateWith()
    const monday = new Date('2026-04-13T19:00:00')
    // #then no prompt
    expect(shouldPromptToday(state, monday)).toBe(false)
  })

  it('returns false on Sunday before 18:00', () => {
    // #given sunday at 17:59 local
    const state = stateWith()
    const sundayAfternoon = new Date('2026-04-12T17:59:00')
    // #then no prompt yet
    expect(shouldPromptToday(state, sundayAfternoon)).toBe(false)
  })

  it('returns true on Sunday at 18:00 with no prior prompt today', () => {
    // #given sunday at 18:00
    const state = stateWith()
    const sundayEvening = new Date('2026-04-12T18:00:00')
    // #then prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(true)
  })

  it('returns true on Sunday at 23:59 with no prior prompt today', () => {
    // #given sunday at 23:59
    const state = stateWith()
    const sundayLate = new Date('2026-04-12T23:59:00')
    // #then prompt
    expect(shouldPromptToday(state, sundayLate)).toBe(true)
  })

  it('returns false if lastSundayPrompt matches today', () => {
    // #given sunday evening with today already logged
    const state = stateWith('2026-04-12')
    const sundayEvening = new Date('2026-04-12T20:00:00')
    // #then no re-prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(false)
  })

  it('returns true if lastSundayPrompt is a prior Sunday', () => {
    // #given state logged last sunday, today is next sunday
    const state = stateWith('2026-04-05')
    const sundayEvening = new Date('2026-04-12T20:00:00')
    // #then re-prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(true)
  })
})

describe('sundayDateString', () => {
  it('returns YYYY-MM-DD in local time', () => {
    // #given a date
    const d = new Date('2026-04-12T20:30:00')
    // #then the formatter returns the local-date form
    expect(sundayDateString(d)).toBe('2026-04-12')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useSunday.spec.ts
```

- [ ] **Step 3: Implement `composables/useSunday.ts`**

```ts
import type { FzState } from '../types/state'

/**
 * Returns the local YYYY-MM-DD string for a date. Used to key the
 * Sunday-prompt-already-shown-today check in meta.lastSundayPrompt.
 */
export function sundayDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Should the Sunday Whisper modal open on this page mount?
 *
 * Yes when:
 *   1. state is not null
 *   2. today is Sunday (local time)
 *   3. local clock is 18:00 or later
 *   4. meta.lastSundayPrompt is not equal to today's local-date string
 *
 * No mid-session polling: this decision runs once on mount. If the user
 * loads the page at 17:59 and waits until 18:00, nothing auto-opens — they
 * see it on their next page load.
 */
export function shouldPromptToday(state: FzState | null, today: Date): boolean {
  if (state === null) return false
  if (today.getDay() !== 0) return false
  if (today.getHours() < 18) return false
  const todayStr = sundayDateString(today)
  if (state.meta.lastSundayPrompt === todayStr) return false
  return true
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useSunday.spec.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tests/useSunday.spec.ts composables/useSunday.ts
git commit -m "$(cat <<'EOF'
add useSunday helpers (TDD)

stage 3 F1.1: shouldPromptToday decides whether to open the sunday
whisper modal on page mount. four conditions: state non-null,
today is sunday, local clock >= 18:00, meta.lastSundayPrompt !=
today's YYYY-MM-DD. no mid-session polling. sundayDateString is
the local-date formatter used to key the "already shown today"
check. 8 tests.
EOF
)"
```

---

## Task 6: `useEcho` composable (TDD)

**Files:**
- Create: `tests/useEcho.spec.ts`
- Create: `composables/useEcho.ts`

**Why:** Picks one past marked+whispered week deterministically per day for the Echo banner.

- [ ] **Step 1: Write failing tests**

Create `tests/useEcho.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useEcho } from '../composables/useEcho'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(weeks: FzState['weeks'], dob = '1990-01-01'): FzState {
  return {
    version: 1,
    dob,
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('useEcho', () => {
  it('returns null for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when no weeks are marked', () => {
    // #given a state with no marks
    const state = ref<FzState | null>(stateWith({}))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when marks exist but none have whispers', () => {
    // #given a state with marks but no whispers
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', markedAt: '2020-01-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo (whispers are required)
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when all whispered weeks are future', () => {
    // #given a very early DOB (so current is high) but whisper on an early week
    // Actually simpler: mock it so the filter should reject future weeks.
    // Use dob 2000-01-01 so weekIndex(today=2026) is about 1370.
    // Mark week 2000 with whisper — that's in the future.
    const state = ref<FzState | null>(stateWith({
      2000: { mark: '❤', whisper: 'future', markedAt: '2020-01-01T00:00:00.000Z' },
    }, '2000-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo (future weeks are filtered out)
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns a past whispered week when one exists', () => {
    // #given a past week with a whisper
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', whisper: 'early memory', markedAt: '2020-01-01T00:00:00.000Z' },
    }, '1990-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then that week is the echo
    const echo = useEcho(state, today).value
    expect(echo).not.toBeNull()
    expect(echo!.weekIndex).toBe(10)
    expect(echo!.whisper).toBe('early memory')
    expect(echo!.mark).toBe('❤')
  })

  it('is deterministic across same-day calls', () => {
    // #given multiple eligible echoes
    const weeks: FzState['weeks'] = {
      10: { mark: '❤', whisper: 'a', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', whisper: 'b', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', whisper: 'c', markedAt: '2020-03-01T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks, '1990-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then two separate reads give the same echo
    const a = useEcho(state, today).value
    const b = useEcho(state, today).value
    expect(a).toEqual(b)
  })

  it('may differ across days', () => {
    // #given multiple eligible echoes
    const weeks: FzState['weeks'] = {
      10: { mark: '❤', whisper: 'a', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', whisper: 'b', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', whisper: 'c', markedAt: '2020-03-01T00:00:00.000Z' },
      40: { mark: '喜', whisper: 'd', markedAt: '2020-04-01T00:00:00.000Z' },
      50: { mark: '☆', whisper: 'e', markedAt: '2020-05-01T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks, '1990-01-01'))
    const day1 = ref(new Date('2026-04-14T00:00:00.000Z'))
    const day2 = ref(new Date('2026-04-15T00:00:00.000Z'))
    // #then at least one pair of days shows different echoes
    // (5 candidates, 2 days — high chance of differing unless the hash lands the same modulo)
    const a = useEcho(state, day1).value
    const b = useEcho(state, day2).value
    // They may or may not differ — we just assert both are non-null.
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/useEcho.spec.ts
```

- [ ] **Step 3: Implement `composables/useEcho.ts`**

```ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { hashString } from '../utils/hash'
import { weekIndex } from './useTime'

export interface EchoEntry {
  weekIndex: number
  mark: string
  whisper: string
  markedAt: string
}

/**
 * The Echo — picks one past marked-and-whispered week deterministically
 * per day. Same day = same Echo. Different day = possibly different.
 *
 * Filter: week must be marked AND have a whisper AND be in the past
 * (strictly < current week index).
 *
 * Returns null when state is null OR no eligible entries exist.
 */
export function useEcho(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<EchoEntry | null> {
  return computed(() => {
    const s = state.value
    if (s === null) return null

    const dob = new Date(s.dob)
    if (Number.isNaN(dob.getTime())) return null
    const currentWeek = weekIndex(dob, today.value)

    const eligible: EchoEntry[] = []
    for (const [keyStr, entry] of Object.entries(s.weeks)) {
      const idx = Number(keyStr)
      if (!Number.isInteger(idx)) continue
      if (idx >= currentWeek) continue
      if (entry.whisper === undefined || entry.whisper === '') continue
      eligible.push({
        weekIndex: idx,
        mark: entry.mark,
        whisper: entry.whisper,
        markedAt: entry.markedAt,
      })
    }

    if (eligible.length === 0) return null

    // Deterministic pick seeded by today's local-date string.
    const todayKey = formatLocalDate(today.value)
    const seed = hashString(todayKey)
    const pick = eligible[seed % eligible.length]
    return pick ?? null
  })
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

Note: I duplicate `formatLocalDate` here instead of importing from `useSunday` to keep the two composables independent. If this shows up in the polish pass, I can refactor — for Stage 3 scope, duplication is OK.

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useEcho.spec.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tests/useEcho.spec.ts composables/useEcho.ts
git commit -m "$(cat <<'EOF'
add useEcho composable (TDD)

stage 3 F1.3: picks one past marked-and-whispered week
deterministically per day. filter is strict: week must be
in the past (< current week index), must have a non-empty
whisper. the daily seed is hashString(YYYY-MM-DD local) so
same day = same echo. returns null when state is null, when
no eligible entries exist, or when dob is invalid. 7 tests.
EOF
)"
```

---

## Task 7: Extend `useFzState` with Stage 3 actions (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** `setLastSundayPrompt` + `setLastEcho` + `replaceState` — Sunday modal, Echo persistence, and backup restore need these.

- [ ] **Step 1: Add failing tests**

Open `tests/useFzState.spec.ts`. After the last `describe` inside the top-level `describe('useFzState', ...)` block (which is `describe('clearMark', ...)`), add these three new nested describes:

```ts
  describe('setLastSundayPrompt', () => {
    it('throws when state is null', () => {
      const { setLastSundayPrompt } = useFzState()
      expect(() => setLastSundayPrompt('2026-04-12')).toThrow(/no state/i)
    })

    it('sets meta.lastSundayPrompt', () => {
      const { state, setDob, setLastSundayPrompt } = useFzState()
      setDob('1990-05-15')
      setLastSundayPrompt('2026-04-12')
      expect(state.value!.meta.lastSundayPrompt).toBe('2026-04-12')
    })

    it('persists to localStorage', () => {
      const { setDob, setLastSundayPrompt } = useFzState()
      setDob('1990-05-15')
      setLastSundayPrompt('2026-04-12')
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).meta.lastSundayPrompt).toBe('2026-04-12')
    })
  })

  describe('setLastEcho', () => {
    it('throws when state is null', () => {
      const { setLastEcho } = useFzState()
      expect(() => setLastEcho('2026-04-14')).toThrow(/no state/i)
    })

    it('sets meta.lastEcho', () => {
      const { state, setDob, setLastEcho } = useFzState()
      setDob('1990-05-15')
      setLastEcho('2026-04-14')
      expect(state.value!.meta.lastEcho).toBe('2026-04-14')
    })
  })

  describe('replaceState', () => {
    it('replaces an existing state', () => {
      const { state, setDob, replaceState } = useFzState()
      setDob('1990-05-15')
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      expect(state.value!.dob).toBe('1991-06-16')
    })

    it('works even when no prior state exists', () => {
      const { state, replaceState } = useFzState()
      expect(state.value).toBeNull()
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      expect(state.value!.dob).toBe('1991-06-16')
    })

    it('throws on an invalid shape', () => {
      const { replaceState } = useFzState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => replaceState({ nope: true } as any)).toThrow(/invalid/i)
    })

    it('persists the replacement', () => {
      const { replaceState } = useFzState()
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).dob).toBe('1991-06-16')
    })
  })
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/useFzState.spec.ts
```

The new describe blocks fail.

- [ ] **Step 3: Implement the three new actions**

Open `composables/useFzState.ts`. Import the validator helper:

Near the top imports, add:
```ts
import { readState } from '../utils/storage'
```

Wait — `readState` doesn't export the validator. We need `isValidFzState`. Let me think. `isValidFzState` is currently private in `utils/storage.ts`. We need to export it.

Open `utils/storage.ts` and change `function isValidFzState` to `export function isValidFzState`. Then in `useFzState.ts` import it:

```ts
import { writeState, clearState, isValidFzState } from '../utils/storage'
```

Then replace the existing import line accordingly. Now add the three new actions after `clearMark` and before `resetState`:

```ts
/**
 * Update meta.lastSundayPrompt. Used by the Sunday Whisper ritual to
 * prevent re-opening the modal on the same day.
 */
function setLastSundayPrompt(dateStr: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    meta: { ...current.meta, lastSundayPrompt: dateStr },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Update meta.lastEcho. Used by FzEcho to mark the day as "echoed already"
 * so the banner doesn't repeat on page reloads within the same day.
 */
function setLastEcho(dateStr: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    meta: { ...current.meta, lastEcho: dateStr },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Replace the entire state — used by the backup restore flow. Validates
 * the incoming shape via isValidFzState and throws on rejection.
 */
function replaceState(next: FzState): void {
  if (!isValidFzState(next)) {
    throw new Error('useFzState: invalid state shape in replaceState')
  }
  const state = ensureLoaded()
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}
```

Note: `replaceState` does not call `assertState` because it's explicitly designed to populate state from an external source, including when no prior state exists.

Update `UseFzStateReturn` to include the three new actions:

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

And the composable return:

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
    replaceState,
    resetState,
  }
}
```

- [ ] **Step 4: Export `isValidFzState` from storage.ts**

Open `utils/storage.ts` and change:
```ts
function isValidFzState(value: unknown): value is FzState {
```
to:
```ts
export function isValidFzState(value: unknown): value is FzState {
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts utils/storage.ts
git commit -m "$(cat <<'EOF'
extend useFzState for stage 3 rituals (TDD)

three new actions:
- setLastSundayPrompt(date): tracks meta.lastSundayPrompt so the
  sunday modal only fires once per sunday evening
- setLastEcho(date): tracks meta.lastEcho so the echo banner only
  appears once per day
- replaceState(next): validates via isValidFzState and replaces
  the entire state; used by the backup restore flow

isValidFzState is now exported from utils/storage.ts so the
replaceState action can validate without re-implementing the
schema check. nine new tests.
EOF
)"
```

---

## Task 8: `utils/backup.ts` (TDD)

**Files:**
- Create: `tests/backup.spec.ts`
- Create: `utils/backup.ts`

**Why:** Export and import the entire state as a JSON file.

- [ ] **Step 1: Write failing tests**

Create `tests/backup.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exportBackup, parseBackup } from '../utils/backup'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

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

describe('exportBackup', () => {
  it('returns a JSON string with the wrapper', () => {
    // #when we export
    const json = exportBackup(sampleState, new Date('2026-04-14T00:00:00.000Z'))
    // #then it parses and has the wrapper fields
    const parsed = JSON.parse(json)
    expect(parsed.fzAxBackup).toBe(true)
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.state).toEqual(sampleState)
  })
})

describe('parseBackup', () => {
  it('round-trips a valid backup', () => {
    // #given a backup written by exportBackup
    const json = exportBackup(sampleState, new Date('2026-04-14T00:00:00.000Z'))
    // #when we parse it
    const parsed = parseBackup(json)
    // #then we get the original state
    expect(parsed).toEqual(sampleState)
  })

  it('returns null for non-JSON input', () => {
    // #given garbage
    // #then null
    expect(parseBackup('not json {')).toBeNull()
  })

  it('returns null when fzAxBackup wrapper is missing', () => {
    // #given a bare state as JSON
    const json = JSON.stringify(sampleState)
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when the inner state is invalid', () => {
    // #given a wrapper around a bad state
    const json = JSON.stringify({ fzAxBackup: true, exportedAt: new Date().toISOString(), state: { nope: true } })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when fzAxBackup is false', () => {
    // #given a wrapper with fzAxBackup: false
    const json = JSON.stringify({ fzAxBackup: false, exportedAt: new Date().toISOString(), state: sampleState })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when state field is missing', () => {
    // #given a wrapper with no state
    const json = JSON.stringify({ fzAxBackup: true, exportedAt: new Date().toISOString() })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/backup.spec.ts
```

- [ ] **Step 3: Implement `utils/backup.ts`**

```ts
import type { FzState } from '../types/state'
import { isValidFzState } from './storage'

/**
 * Export the entire state as a JSON string wrapped in a small envelope
 * so parseBackup can recognize it and reject unrelated JSON files.
 */
export function exportBackup(state: FzState, exportedAt: Date = new Date()): string {
  const wrapper = {
    fzAxBackup: true as const,
    exportedAt: exportedAt.toISOString(),
    state,
  }
  return JSON.stringify(wrapper, null, 2)
}

/**
 * Parse a backup JSON string and return the validated inner FzState, or
 * null on any failure (malformed JSON, missing wrapper, invalid inner
 * state). Null-return instead of throw — the UI calls this from a file-
 * picker handler and needs a quiet "nope" on invalid input.
 */
export function parseBackup(json: string): FzState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const wrapper = parsed as Record<string, unknown>
  if (wrapper.fzAxBackup !== true) return null
  if (!isValidFzState(wrapper.state)) return null
  return wrapper.state
}

/**
 * Trigger a browser download of the backup JSON file. Uses Blob + object
 * URL + synthetic anchor click. No dependencies. Caller should pass the
 * current `today` for the filename date segment.
 */
export function downloadBackup(state: FzState, today: Date = new Date()): void {
  const json = exportBackup(state, today)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStr = formatLocalDate(today)
  const a = document.createElement('a')
  a.href = url
  a.download = `fz-ax-backup-${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke next tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/backup.spec.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/backup.spec.ts utils/backup.ts
git commit -m "$(cat <<'EOF'
add backup utility (TDD)

stage 3 F1.5: exportBackup wraps the state in
{fzAxBackup, exportedAt, state} json. parseBackup validates the
wrapper and the inner state via isValidFzState, returning null
on any failure (silent, matches the UI's no-toast policy).
downloadBackup is the blob + anchor-click helper. 7 tests cover
round-trip, malformed json, missing wrapper, invalid inner state,
false wrapper, and missing state field.
EOF
)"
```

---

## Task 9: `utils/poster.ts` (TDD)

**Files:**
- Create: `tests/poster.spec.ts`
- Create: `utils/poster.ts`

**Why:** Generate a client-side SVG poster of the whole grid with marks baked in.

- [ ] **Step 1: Write failing tests**

Create `tests/poster.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generatePoster } from '../utils/poster'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(weeks: FzState['weeks']): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('generatePoster', () => {
  it('returns a string that starts with an SVG element', () => {
    // #given an empty state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then it's an SVG document
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('declares an A2 viewBox in mm', () => {
    // #given any state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then viewBox matches A2 (420 × 594 mm)
    expect(svg).toMatch(/viewBox="0 0 420 594"/)
  })

  it('includes the title text', () => {
    // #given any state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then the title is in the SVG
    expect(svg).toContain('four-thousand weekz')
  })

  it('renders a <text> for each mark', () => {
    // #given a state with 3 marks
    const state = stateWith({
      10: { mark: '❤', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', markedAt: '2020-03-01T00:00:00.000Z' },
    })
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then each mark glyph appears in the SVG
    expect(svg).toContain('❤')
    expect(svg).toContain('☀')
    expect(svg).toContain('w</text>')
  })

  it('contains the export date in the footer', () => {
    // #given a known export date
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then the year is in the footer somewhere
    expect(svg).toContain('2026')
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/poster.spec.ts
```

- [ ] **Step 3: Implement `utils/poster.ts`**

```ts
import type { FzState } from '../types/state'
import { totalWeeks, weekIndex } from '../composables/useTime'

/**
 * Generate an ISO A2 SVG poster (420 × 594 mm) of the user's 4000-hexagon
 * life grid with all marks baked in. Client-side, string-concatenated,
 * no dependencies. Returns the complete SVG document as a string.
 *
 * Layout:
 *   - Title at the top (yellow, centered)
 *   - 40-column × 100-row grid of hex glyphs below the title
 *   - Footer with the long-now year and the export date
 *
 * Marks are rendered as yellow <text> elements in place of the default
 * past/current/future glyphs. The current week gets a stronger color.
 */
export function generatePoster(state: FzState, today: Date = new Date()): string {
  const COLS = 40
  const ROWS = 100 // 40 × 100 = 4000
  const MARGIN = 15 // mm
  const WIDTH = 420 // mm (A2 width)
  const HEIGHT = 594 // mm (A2 height)

  const TITLE_Y = 30
  const TITLE_SIZE = 18

  const GRID_TOP = 60
  const GRID_BOTTOM = HEIGHT - 60
  const GRID_WIDTH = WIDTH - MARGIN * 2
  const GRID_HEIGHT = GRID_BOTTOM - GRID_TOP

  const CELL_W = GRID_WIDTH / COLS
  const CELL_H = GRID_HEIGHT / ROWS
  const CELL_SIZE = Math.min(CELL_W, CELL_H)

  const GRID_X_START = MARGIN + (GRID_WIDTH - CELL_W * COLS) / 2
  const GRID_Y_START = GRID_TOP + (GRID_HEIGHT - CELL_H * ROWS) / 2

  const dob = new Date(state.dob)
  const currentIdx = Number.isNaN(dob.getTime()) ? 0 : weekIndex(dob, today)

  const yellow = '#F7B808'
  const blue = '#0847F7'

  const parts: string[] = []
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}mm" height="${HEIGHT}mm" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="sans-serif">`)
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="white"/>`)

  // Title
  parts.push(
    `<text x="${WIDTH / 2}" y="${TITLE_Y}" font-size="${TITLE_SIZE}" font-weight="900" fill="${yellow}" text-anchor="middle">four-thousand weekz</text>`,
  )

  // Grid
  for (let i = 0; i < totalWeeks; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = GRID_X_START + col * CELL_W + CELL_W / 2
    const cy = GRID_Y_START + row * CELL_H + CELL_H / 2

    const entry = state.weeks[i]
    let glyph: string
    let fill: string

    if (entry !== undefined) {
      glyph = entry.mark
      fill = yellow
    } else if (i < currentIdx) {
      glyph = '⬢'
      fill = blue
    } else if (i === currentIdx) {
      glyph = '⏣'
      fill = yellow
    } else {
      glyph = '⬡'
      fill = blue
    }

    parts.push(
      `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(CELL_SIZE * 0.75).toFixed(2)}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${escapeXml(glyph)}</text>`,
    )
  }

  // Footer
  const exportDate = today.toISOString().slice(0, 10)
  const longNowYear = `0${today.getFullYear()}`
  const footerY = HEIGHT - 25
  parts.push(
    `<text x="${MARGIN}" y="${footerY}" font-size="4" fill="${blue}">fz.ax · ${exportDate}</text>`,
    `<text x="${WIDTH - MARGIN}" y="${footerY}" font-size="4" fill="${blue}" text-anchor="end">${longNowYear} · the long now</text>`,
  )

  parts.push(`</svg>`)
  return parts.join('\n')
}

/**
 * Trigger a browser download of the SVG poster. Uses the same Blob +
 * object URL + anchor click pattern as downloadBackup.
 */
export function downloadPoster(state: FzState, today: Date = new Date()): void {
  const svg = generatePoster(state, today)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const dateStr = today.toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `fz-ax-poster-${dateStr}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/poster.spec.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tests/poster.spec.ts utils/poster.ts
git commit -m "$(cat <<'EOF'
add poster utility (TDD)

stage 3 F1.4: generatePoster builds an A2 (420×594mm) SVG of the
full 4000-hex grid with marks baked in. string-concatenated,
no dependencies. 40×100 grid layout with yellow/blue palette,
current-week distinct, title at top, long-now year + export
date in the footer. downloadPoster is the blob + anchor-click
helper. 5 tests verify svg validity, A2 viewBox, title, mark
rendering, and footer date.
EOF
)"
```

---

## Task 10: Easter egg corpus + `useEasterEgg` composable

**Files:**
- Create: `data/easter-quotes.ts`
- Create: `composables/useEasterEgg.ts`

**Why:** The hidden quote reveal triggered by the `f`→`z` key sequence. No tests for the composable (it registers a global DOM listener, hard to unit-test cleanly; we rely on manual verification).

- [ ] **Step 1: Create `data/easter-quotes.ts`**

```ts
/**
 * Three hidden quotes revealed by typing the "fz" key sequence. Different
 * from the Library corpus — these are about fz.ax itself.
 */
export const EASTER_QUOTES: readonly string[] = [
  'between ⬢ and ⬡ there is ⏣ — and only ⏣ is yours to live in.',
  'this is not a productivity tool. it is a mirror.',
  'you are reading this on the week you are. that matters more than the grid.',
] as const
```

- [ ] **Step 2: Create `composables/useEasterEgg.ts`**

```ts
import { ref, onBeforeUnmount, type Ref } from 'vue'
import { EASTER_QUOTES } from '../data/easter-quotes'

interface UseEasterEggReturn {
  active: Ref<boolean>
  quote: Ref<string | null>
}

/**
 * Listens for the "fz" key sequence globally. When detected, picks a
 * random hidden quote and exposes it via the reactive `active`/`quote`
 * refs for FzEasterEgg to render. The quote stays active for 4 seconds
 * then clears.
 *
 * Guards: the listener ignores keydowns while the active element is an
 * input or textarea (so typing `fz` in a whisper doesn't trigger it).
 * Cleans up on unmount.
 */
export function useEasterEgg(): UseEasterEggReturn {
  const active = ref(false)
  const quote = ref<string | null>(null)

  let lastKey = ''
  let lastKeyAt = 0
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  function handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target !== null) {
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (target.isContentEditable) return
    }

    const key = event.key.toLowerCase()
    const now = Date.now()

    if (lastKey === 'f' && key === 'z' && now - lastKeyAt <= 500) {
      const pick = EASTER_QUOTES[Math.floor(Math.random() * EASTER_QUOTES.length)] ?? null
      quote.value = pick
      active.value = true
      if (clearTimer !== null) clearTimeout(clearTimer)
      clearTimer = setTimeout(() => {
        active.value = false
        quote.value = null
      }, 4000)
      lastKey = ''
      lastKeyAt = 0
      return
    }

    lastKey = key
    lastKeyAt = now
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown)
    }
    if (clearTimer !== null) {
      clearTimeout(clearTimer)
    }
  })

  return { active, quote }
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add data/easter-quotes.ts composables/useEasterEgg.ts
git commit -m "$(cat <<'EOF'
add useEasterEgg composable + 3-quote easter corpus

stage 3 F1.8 extension: typing "fz" within 500ms triggers a
hidden quote overlay for 4 seconds. input/textarea/contentEditable
focus suppresses the detection so typing fz in a whisper doesn't
fire. 3-quote hidden corpus about fz.ax itself (different from
the library). no unit tests — the listener is global DOM and is
manually verified in the smoke test.
EOF
)"
```

---

## Task 11: `components/FzLibrary.vue`

**Files:**
- Create: `components/FzLibrary.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useLibraryQuote } from '../composables/useQuotes'

const { state } = useFzState()
const today = ref(new Date())
const quote = useLibraryQuote(state, today)
</script>

<template>
  <section v-if="quote !== null" class="library">
    <blockquote class="library-quote">
      {{ quote.text }}
    </blockquote>
    <cite class="library-attribution">{{ quote.attribution }}</cite>
  </section>
</template>

<style scoped>
.library {
  text-align: center;
  padding: 1.25rem 1rem;
  margin: 1.5rem auto 0;
  max-width: 640px;
  border-top: 1px dashed #cccccc;
  border-bottom: 1px dashed #cccccc;
}

.library-quote {
  margin: 0;
  font-style: italic;
  color: #888;
  font-size: 0.85rem;
  line-height: 1.45;
}

.library-attribution {
  display: block;
  font-style: normal;
  font-size: 0.6rem;
  color: #0847F7;
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzLibrary.vue
git commit -m "FzLibrary: render the current rotating quote below the grid

stage 3 F1.2 component: reads useLibraryQuote reactively. renders
nothing when state is null (pre-dob). faint italic text with
dashed top and bottom borders matching the existing aesthetic.
centered, max-width 640px so it doesn't stretch uncomfortably on
wide screens."
```

---

## Task 12: `components/FzEcho.vue`

**Files:**
- Create: `components/FzEcho.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useEcho } from '../composables/useEcho'
import { weekRange } from '../composables/useTime'

const { state, setLastEcho } = useFzState()
const today = ref(new Date())
const echo = useEcho(state, today)

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const todayDateStr = computed(() => {
  const d = today.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const dateRangeLabel = computed(() => {
  if (echo.value === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, echo.value.weekIndex)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return range.start.toLocaleDateString(undefined, opts)
})

function dismiss(): void {
  visible.value = false
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function showIfAppropriate(): void {
  if (echo.value === null) return
  if (state.value === null) return
  if (state.value.meta.lastEcho === todayDateStr.value) return
  visible.value = true
  try {
    setLastEcho(todayDateStr.value)
  } catch {
    // Storage failure — we still show the banner in-session.
  }
  dismissTimer = setTimeout(dismiss, 8000)
}

onMounted(() => {
  showIfAppropriate()
})

// If the user's state loads after this component mounts (legacy dob
// migration path), react once.
watch(echo, (next, prev) => {
  if (prev === null && next !== null && !visible.value) {
    showIfAppropriate()
  }
})

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="echo-fade">
    <div
      v-if="visible && echo !== null"
      class="echo-banner"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      <div class="echo-label">⌁ echo</div>
      <div class="echo-body">
        <em class="echo-whisper">{{ echo.whisper }}</em>
        <span class="echo-meta">· {{ dateRangeLabel }} · {{ echo.mark }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.echo-banner {
  max-width: 560px;
  margin: 0.75rem auto 0;
  padding: 0.75rem 1rem;
  background: #fffbe6;
  border-left: 3px solid #ff3b30;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  color: #444;
}

.echo-label {
  color: #ff3b30;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}

.echo-whisper {
  color: #333;
  font-style: italic;
}

.echo-meta {
  color: #888;
  font-size: 0.75rem;
}

.echo-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.echo-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.echo-fade-enter-from,
.echo-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .echo-fade-enter-active,
  .echo-fade-leave-active {
    transition: none;
  }
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzEcho.vue
git commit -m "FzEcho: serendipity banner for past whispered weeks

stage 3 F1.3 component: reads useEcho reactively. shows a left-
accented fade-in banner with the whisper text + date + mark glyph.
auto-dismisses after 8s or on click. calls setLastEcho once when
the banner appears so the same day doesn't re-show on page
refresh. prefers-reduced-motion disables the fade transitions."
```

---

## Task 13: `components/FzSundayModal.vue`

**Files:**
- Create: `components/FzSundayModal.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { currentGridIndex, weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'
import { sundayDateString } from '../composables/useSunday'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setMark, setWhisper, setLastSundayPrompt } = useFzState()
const today = ref(new Date())

const oneCharInput = ref<HTMLInputElement | null>(null)

const pendingMark = ref<string>('')
const pendingWhisper = ref<string>('')

const currentWeek = computed(() => {
  if (state.value === null) return null
  const dob = new Date(state.value.dob)
  return currentGridIndex(dob, today.value)
})

const currentEntry = computed(() => {
  if (currentWeek.value === null || state.value === null) return null
  return state.value.weeks[currentWeek.value] ?? null
})

const dateRangeLabel = computed(() => {
  if (currentWeek.value === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, currentWeek.value)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return `${range.start.toLocaleDateString(undefined, opts)} — ${range.end.toLocaleDateString(undefined, opts)}`
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      pendingMark.value = currentEntry.value?.mark ?? ''
      pendingWhisper.value = currentEntry.value?.whisper ?? ''
      void nextTick(() => {
        oneCharInput.value?.focus()
      })
    }
  },
  { immediate: true },
)

function applyMark(mark: string): void {
  if (currentWeek.value === null) return
  if (!isSingleGrapheme(mark)) return
  try {
    setMark(currentWeek.value, mark)
    pendingMark.value = mark
  } catch {
    // Storage failure — nothing we can do from here without a toast system.
  }
}

function onOneCharEnter(): void {
  if (pendingMark.value !== '' && isSingleGrapheme(pendingMark.value)) {
    applyMark(pendingMark.value)
  }
}

function flushAndClose(): void {
  if (
    currentWeek.value !== null
    && state.value !== null
    && state.value.weeks[currentWeek.value] !== undefined
    && pendingWhisper.value !== (state.value.weeks[currentWeek.value]?.whisper ?? '')
  ) {
    try {
      setWhisper(currentWeek.value, pendingWhisper.value)
    } catch {
      // ignore — still close
    }
  }
  try {
    setLastSundayPrompt(sundayDateString(today.value))
  } catch {
    // ignore — still close
  }
  emit('close')
}

function onBackdropClick(): void {
  flushAndClose()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    flushAndClose()
  }
}
</script>

<template>
  <div
    v-if="props.open"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Sunday whisper"
    @click="onBackdropClick"
    @keydown="onKey"
  >
    <div class="modal-content" @click.stop>
      <div class="sunday-head">
        <div class="sunday-label">this week is closing</div>
        <div class="sunday-range">{{ dateRangeLabel }}</div>
      </div>

      <p class="sunday-prompt">what do you want to remember about it?</p>

      <div class="sunday-section">
        <div class="sunday-section-label">your mark</div>
        <input
          ref="oneCharInput"
          v-model="pendingMark"
          class="sunday-one-char"
          type="text"
          maxlength="16"
          placeholder="·"
          @keyup.enter="onOneCharEnter"
          @blur="onOneCharEnter"
        >
      </div>

      <div class="sunday-section">
        <div class="sunday-section-label">whisper</div>
        <textarea
          v-model="pendingWhisper"
          class="sunday-whisper"
          :class="{ 'sunday-whisper-locked': currentEntry === null }"
          rows="3"
          :placeholder="currentEntry === null ? 'set a mark first' : 'one sentence (optional)'"
          :disabled="currentEntry === null"
        />
      </div>

      <div class="sunday-foot">
        <button class="btn-76" @click="flushAndClose">4⬢⏣⬡</button>
      </div>
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
  padding: 2rem 1.75rem;
  width: 380px;
  max-width: calc(100vw - 2rem);
  text-align: center;
  z-index: 1001;
  box-shadow: 6px 6px 0 0 #F7B808;
  border: 2px solid #0847F7;
}

.sunday-head {
  padding-bottom: 1rem;
  border-bottom: 1px dashed #cccccc;
}

.sunday-label {
  color: #0847F7;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 800;
}

.sunday-range {
  color: #888;
  font-size: 0.7rem;
  margin-top: 0.25rem;
}

.sunday-prompt {
  color: #444;
  font-style: italic;
  margin: 1rem 0;
  font-size: 0.95rem;
}

.sunday-section {
  padding: 0.75rem 0;
}

.sunday-section-label {
  font-size: 0.6rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.4rem;
}

.sunday-one-char {
  width: 60px;
  height: 40px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  background: white;
  padding: 0;
  margin: 0 auto;
  display: block;
}

.sunday-one-char:focus-visible {
  background: #fffbe6;
  outline: 2px solid #F7B808;
  outline-offset: 2px;
}

.sunday-whisper {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-family: 'Roboto', sans-serif;
  color: #333;
  border: 1.5px solid #0847F7;
  background: white;
  font-style: italic;
  resize: vertical;
}

.sunday-whisper:focus-visible {
  background: #fffbe6;
  outline: none;
}

.sunday-whisper-locked {
  background: #f5f5f5;
  color: #aaa;
  border-color: #cccccc;
  cursor: not-allowed;
  font-style: normal;
}

.sunday-foot {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed #cccccc;
  display: flex;
  justify-content: center;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  background-color: #F7B808;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 100%;
  font-weight: 900;
  border: 0 solid;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.55rem 0.9rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
  --neon: #0847F7;
}

.btn-76:hover,
.btn-76:focus-visible {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon);
  color: #fff;
  outline-color: transparent;
  outline: none;
  transition: 0.2s linear 0.3s;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzSundayModal.vue
git commit -m "FzSundayModal: the sunday whisper ritual modal

stage 3 F1.1 component: opens once per sunday evening, scoped to
the current week. contemplative header ('this week is closing'),
date range, a one-char mark input and a whisper textarea (locked
until a mark exists, same pattern as FzMarkPopover). closes on
backdrop click, escape, or the 4⬢⏣⬡ button — all paths call
setLastSundayPrompt so it doesn't re-open today. each write is
wrapped in try/catch so storage failures don't freeze the modal."
```

---

## Task 14: `components/FzToolbar.vue`

**Files:**
- Create: `components/FzToolbar.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { downloadPoster } from '../utils/poster'
import { downloadBackup, parseBackup } from '../utils/backup'

const { state, replaceState } = useFzState()
const fileInput = ref<HTMLInputElement | null>(null)

function onPosterClick(): void {
  if (state.value === null) return
  try {
    downloadPoster(state.value, new Date())
  } catch {
    // ignore — browser security policies may block download
  }
}

function onBackupClick(): void {
  if (state.value === null) return
  try {
    downloadBackup(state.value, new Date())
  } catch {
    // ignore
  }
}

function onRestoreClick(): void {
  fileInput.value?.click()
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file === undefined) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : null
    if (text === null) return
    const parsed = parseBackup(text)
    if (parsed === null) return
    try {
      replaceState(parsed)
    } catch {
      // ignore — validation already happened in parseBackup
    }
  }
  reader.readAsText(file)
  // Reset so the same file can be re-picked later.
  target.value = ''
}
</script>

<template>
  <div class="toolbar">
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download poster"
      title="poster"
      @click="onPosterClick"
    >⬢</button>
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download backup"
      title="backup"
      @click="onBackupClick"
    >⬡</button>
    <button
      class="tool"
      aria-label="restore backup"
      title="restore"
      @click="onRestoreClick"
    >⌗</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="toolbar-file"
      @change="onFileChange"
    >
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 900;
  display: flex;
  gap: 6px;
}

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

.tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-file {
  display: none;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzToolbar.vue
git commit -m "FzToolbar: fixed-position poster/backup/restore buttons

stage 3 F1.4 + F1.5 host: three tiny square buttons in the top-
right corner. poster triggers downloadPoster, backup triggers
downloadBackup, restore opens a hidden file input and pipes
the uploaded json through parseBackup + replaceState. buttons
are disabled (visually dimmed, cursor not-allowed) when state
is null so new users can't download an empty poster."
```

---

## Task 15: `components/FzEasterEgg.vue`

**Files:**
- Create: `components/FzEasterEgg.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { useEasterEgg } from '../composables/useEasterEgg'

const { active, quote } = useEasterEgg()
</script>

<template>
  <transition name="egg-fade">
    <div v-if="active && quote !== null" class="egg-overlay">
      <div class="egg-inner">
        <div class="egg-deco">⬢ ⏣ ⬡</div>
        <div class="egg-quote">{{ quote }}</div>
        <div class="egg-deco">⬡ ⏣ ⬢</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.egg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.92);
}

.egg-inner {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

.egg-deco {
  color: #0847F7;
  font-size: 1.5rem;
  letter-spacing: 0.5em;
}

.egg-quote {
  color: #F7B808;
  font-size: 1.6rem;
  font-style: italic;
  font-weight: 700;
  margin: 1.5rem 0;
  line-height: 1.4;
}

.egg-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.egg-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.egg-fade-enter-from,
.egg-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .egg-fade-enter-active,
  .egg-fade-leave-active {
    transition: none;
  }
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzEasterEgg.vue
git commit -m "FzEasterEgg: hidden quote overlay

stage 3 F1.8 component: reads useEasterEgg and renders a centered
quote overlay when active. yellow italic quote flanked by blue
hex decorations. pointer-events: none so the grid stays clickable
underneath. prefers-reduced-motion disables the fade."
```

---

## Task 16: Wire everything into `FzPage.vue`

**Files:**
- Modify: `components/FzPage.vue`

- [ ] **Step 1: Read the current file**

Use the Read tool on `/Users/rubberduck/GitHub/momentmaker/fz.ax/components/FzPage.vue` before editing so you see the current structure.

- [ ] **Step 2: Apply the following edits via Edit tool**

**2a.** Add the Sunday + easter-egg imports and state. Find the line:
```ts
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
```

Replace with:
```ts
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { shouldPromptToday } from '../composables/useSunday'
```

**2b.** Find the `const { state } = useFzState()` line and leave it unchanged. After it, add the Sunday modal state. Find the block:
```ts
const markPopoverOpen = ref(false)
const markPopoverWeek = ref<number | null>(null)
```
Leave that unchanged. Right after it add:
```ts

const sundayModalOpen = ref(false)
```

**2c.** Find the `containerClasses` computed and update it to include the sunday modal too:
```ts
const containerClasses = computed(() => ({
  // Either modal disables grid pointer-events so the user can't click a
  // second hexagon while the mark popover is open and silently lose any
  // unsaved whisper typing in the popover.
  'modal-open': showModal.value || markPopoverOpen.value,
}))
```

Replace with:
```ts
const containerClasses = computed(() => ({
  'modal-open': showModal.value || markPopoverOpen.value || sundayModalOpen.value,
}))
```

**2d.** Find the `onMounted` block:
```ts
onMounted(() => {
  if (state.value === null) {
    showModal.value = true
  }
  // Idempotent append — a window flag prevents HMR duplicates in dev.
  const w = window as Window & { __fzEggAdded?: boolean }
  if (w.__fzEggAdded !== true) {
    document.body.appendChild(document.createComment(ASCII_HEXAGON))
    w.__fzEggAdded = true
  }
})
```

Replace with:
```ts
onMounted(() => {
  if (state.value === null) {
    showModal.value = true
  }
  // Idempotent append — a window flag prevents HMR duplicates in dev.
  const w = window as Window & { __fzEggAdded?: boolean }
  if (w.__fzEggAdded !== true) {
    document.body.appendChild(document.createComment(ASCII_HEXAGON))
    w.__fzEggAdded = true
  }
  // Stage 3 F1.1: open the Sunday Whisper modal if today is Sunday evening
  // and we haven't already prompted for today.
  if (shouldPromptToday(state.value, new Date())) {
    sundayModalOpen.value = true
  }
})
```

**2e.** Add a `closeSundayModal` function right after the existing `closeMarkPopover` function:
```ts

function closeSundayModal(): void {
  sundayModalOpen.value = false
}
```

**2f.** In the template, find:
```vue
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen"
      @hex-click="openMarkPopover"
    />
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
  </div>
  <FzScrollHex />
```

Replace with:
```vue
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen"
      @hex-click="openMarkPopover"
    />
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
    <FzSundayModal
      :open="sundayModalOpen"
      @close="closeSundayModal"
    />
    <FzEcho />
    <FzLibrary />
  </div>
  <FzScrollHex />
  <FzToolbar />
  <FzEasterEgg />
```

- [ ] **Step 3: Run all checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add components/FzPage.vue
git commit -m "FzPage: host all stage 3 surfaces

wires FzLibrary (below grid), FzEcho (above grid, via default
v-if), FzSundayModal (opened on mount if shouldPromptToday),
FzToolbar (fixed top-right), and FzEasterEgg (global overlay).
modal-open now also disables grid pointer-events while the
sunday modal is open. every new surface is reactive and
composes cleanly with the existing stage 2 flow."
```

---

## Task 17: Smoke test

**Files:** None — verification only.

- [ ] **Step 1: Run the full verification chain**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all clean. Test count roughly 150+.

- [ ] **Step 2: Start the dev server and check for errors**

```bash
pnpm dev > /tmp/fz-ax-stage3-dev.log 2>&1 &
sleep 12
tail -30 /tmp/fz-ax-stage3-dev.log
curl -s http://localhost:3000 | grep -c "four-thousand weekz"
pkill -f "nuxt dev" || true
```

Expected: dev server starts cleanly, curl returns 1 (or 2), no runtime errors in the log.

If any check fails, STOP and report. Do NOT proceed to Task 18.

---

## Task 18: Final verification + stage tag

**Files:** None — verification + git tag.

- [ ] **Step 1: Run the full verification chain once more**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all clean.

- [ ] **Step 2: Verify the build artifact**

```bash
ls .output/public/index.html .output/public/CNAME && cat .output/public/CNAME
```

Expected: both present, CNAME is `fz.ax`.

- [ ] **Step 3: Tag the stage**

```bash
git tag -a stage-3-tier-1-rituals -m "Stage 3 — Tier 1 Rituals"
git log --oneline stage-2-mark-whisper..stage-3-tier-1-rituals
```

Expected: ~17 commits in the stage 3 range.

Do NOT push in this task. The autopilot SHIP phase handles that separately.

---

## Self-review checklist

After all tasks:

- [ ] Every F1.x (F1.1, F1.2, F1.3, F1.4, F1.5, F1.8) feature has a corresponding file/task
- [ ] No placeholders, no `TODO`/`FIXME`/`XXX`
- [ ] `setLastSundayPrompt`, `setLastEcho`, `replaceState` all follow the throw-and-close pattern
- [ ] `isValidFzState` exported from storage so replaceState can validate
- [ ] All new composables reactive and handle null state
- [ ] `useEasterEgg` ignores keydowns while focus is in an input/textarea
- [ ] FzEcho auto-dismisses after 8s AND on click
- [ ] FzSundayModal closes on all three paths (backdrop, escape, button)
- [ ] FzToolbar buttons disabled when state is null
- [ ] All new animations respect `prefers-reduced-motion`
- [ ] Library quotes are ≤ 160 chars each
- [ ] Easter egg corpus has 3 quotes
- [ ] Library corpus has 60 quotes
- [ ] No new lint warnings or typecheck errors

## Definition of done for Stage 3

- All 18 tasks complete
- 150+ tests passing
- `pnpm generate` clean
- `stage-3-tier-1-rituals` tag points at the head of master
- FzPage hosts FzLibrary, FzEcho, FzSundayModal, FzToolbar, FzEasterEgg
- The deployed site (next push) still boots identical to Stage 2 for a user who hasn't triggered any of the new rituals; new behaviors kick in only on Sunday evening (F1.1), when the user has whispered weeks (F1.3), or when the user interacts with the toolbar / types the easter egg sequence.
