import { localDateString } from './date'
import { SOLSTICE_QUOTES } from '../data/solsticeQuotes'

/**
 * F2.5 Solstice / Equinox detection.
 *
 * Hardcoded lookup table for the years 2025-2105 (covering the maximum
 * lifespan of a 4000-week grid for any user born in 1948+). Each entry
 * is the local-calendar date the astronomical event falls on for users
 * within ±12h of UTC — the variance is acceptable for the once-per-day
 * granularity. Astronomical math (Jean Meeus formulas) would gain only
 * ±1h precision the user doesn't notice.
 */

export type SolsticeKind = 'vernal' | 'summer' | 'autumnal' | 'winter'

interface YearEntry {
  vernal: string
  summer: string
  autumnal: string
  winter: string
}

// Source: NOAA / USNO mean dates. ±1 day accuracy in extreme timezones.
const SOLSTICE_DATES: Record<number, YearEntry> = {
  2025: { vernal: '2025-03-20', summer: '2025-06-21', autumnal: '2025-09-22', winter: '2025-12-21' },
  2026: { vernal: '2026-03-20', summer: '2026-06-21', autumnal: '2026-09-22', winter: '2026-12-21' },
  2027: { vernal: '2027-03-20', summer: '2027-06-21', autumnal: '2027-09-23', winter: '2027-12-22' },
  2028: { vernal: '2028-03-20', summer: '2028-06-20', autumnal: '2028-09-22', winter: '2028-12-21' },
  2029: { vernal: '2029-03-20', summer: '2029-06-21', autumnal: '2029-09-22', winter: '2029-12-21' },
  2030: { vernal: '2030-03-20', summer: '2030-06-21', autumnal: '2030-09-22', winter: '2030-12-21' },
  2031: { vernal: '2031-03-20', summer: '2031-06-21', autumnal: '2031-09-23', winter: '2031-12-22' },
  2032: { vernal: '2032-03-20', summer: '2032-06-20', autumnal: '2032-09-22', winter: '2032-12-21' },
  2033: { vernal: '2033-03-20', summer: '2033-06-21', autumnal: '2033-09-22', winter: '2033-12-21' },
  2034: { vernal: '2034-03-20', summer: '2034-06-21', autumnal: '2034-09-22', winter: '2034-12-21' },
  2035: { vernal: '2035-03-20', summer: '2035-06-21', autumnal: '2035-09-23', winter: '2035-12-22' },
  2036: { vernal: '2036-03-20', summer: '2036-06-20', autumnal: '2036-09-22', winter: '2036-12-21' },
  2037: { vernal: '2037-03-20', summer: '2037-06-21', autumnal: '2037-09-22', winter: '2037-12-21' },
  2038: { vernal: '2038-03-20', summer: '2038-06-21', autumnal: '2038-09-22', winter: '2038-12-21' },
  2039: { vernal: '2039-03-20', summer: '2039-06-21', autumnal: '2039-09-23', winter: '2039-12-22' },
  2040: { vernal: '2040-03-20', summer: '2040-06-20', autumnal: '2040-09-22', winter: '2040-12-21' },
  2041: { vernal: '2041-03-20', summer: '2041-06-21', autumnal: '2041-09-22', winter: '2041-12-21' },
  2042: { vernal: '2042-03-20', summer: '2042-06-21', autumnal: '2042-09-22', winter: '2042-12-21' },
  2043: { vernal: '2043-03-20', summer: '2043-06-21', autumnal: '2043-09-23', winter: '2043-12-22' },
  2044: { vernal: '2044-03-20', summer: '2044-06-20', autumnal: '2044-09-22', winter: '2044-12-21' },
  2045: { vernal: '2045-03-20', summer: '2045-06-21', autumnal: '2045-09-22', winter: '2045-12-21' },
  2046: { vernal: '2046-03-20', summer: '2046-06-21', autumnal: '2046-09-22', winter: '2046-12-21' },
  2047: { vernal: '2047-03-20', summer: '2047-06-21', autumnal: '2047-09-23', winter: '2047-12-22' },
  2048: { vernal: '2048-03-20', summer: '2048-06-20', autumnal: '2048-09-22', winter: '2048-12-21' },
  2049: { vernal: '2049-03-20', summer: '2049-06-21', autumnal: '2049-09-22', winter: '2049-12-21' },
  2050: { vernal: '2050-03-20', summer: '2050-06-21', autumnal: '2050-09-22', winter: '2050-12-21' },
  2051: { vernal: '2051-03-20', summer: '2051-06-21', autumnal: '2051-09-23', winter: '2051-12-22' },
  2052: { vernal: '2052-03-20', summer: '2052-06-20', autumnal: '2052-09-22', winter: '2052-12-21' },
  2053: { vernal: '2053-03-20', summer: '2053-06-21', autumnal: '2053-09-22', winter: '2053-12-21' },
  2054: { vernal: '2054-03-20', summer: '2054-06-21', autumnal: '2054-09-22', winter: '2054-12-21' },
  2055: { vernal: '2055-03-21', summer: '2055-06-21', autumnal: '2055-09-23', winter: '2055-12-22' },
  2056: { vernal: '2056-03-20', summer: '2056-06-20', autumnal: '2056-09-22', winter: '2056-12-21' },
  2057: { vernal: '2057-03-20', summer: '2057-06-21', autumnal: '2057-09-22', winter: '2057-12-21' },
  2058: { vernal: '2058-03-20', summer: '2058-06-21', autumnal: '2058-09-22', winter: '2058-12-21' },
  2059: { vernal: '2059-03-20', summer: '2059-06-21', autumnal: '2059-09-23', winter: '2059-12-22' },
  2060: { vernal: '2060-03-20', summer: '2060-06-20', autumnal: '2060-09-22', winter: '2060-12-21' },
  2061: { vernal: '2061-03-20', summer: '2061-06-21', autumnal: '2061-09-22', winter: '2061-12-21' },
  2062: { vernal: '2062-03-20', summer: '2062-06-21', autumnal: '2062-09-22', winter: '2062-12-21' },
  2063: { vernal: '2063-03-20', summer: '2063-06-21', autumnal: '2063-09-23', winter: '2063-12-22' },
  2064: { vernal: '2064-03-19', summer: '2064-06-20', autumnal: '2064-09-22', winter: '2064-12-21' },
  2065: { vernal: '2065-03-20', summer: '2065-06-21', autumnal: '2065-09-22', winter: '2065-12-21' },
  2066: { vernal: '2066-03-20', summer: '2066-06-21', autumnal: '2066-09-22', winter: '2066-12-21' },
  2067: { vernal: '2067-03-20', summer: '2067-06-21', autumnal: '2067-09-23', winter: '2067-12-22' },
  2068: { vernal: '2068-03-19', summer: '2068-06-20', autumnal: '2068-09-22', winter: '2068-12-21' },
  2069: { vernal: '2069-03-20', summer: '2069-06-21', autumnal: '2069-09-22', winter: '2069-12-21' },
  2070: { vernal: '2070-03-20', summer: '2070-06-21', autumnal: '2070-09-22', winter: '2070-12-21' },
  2071: { vernal: '2071-03-20', summer: '2071-06-21', autumnal: '2071-09-22', winter: '2071-12-22' },
  2072: { vernal: '2072-03-19', summer: '2072-06-20', autumnal: '2072-09-22', winter: '2072-12-21' },
  2073: { vernal: '2073-03-20', summer: '2073-06-21', autumnal: '2073-09-22', winter: '2073-12-21' },
  2074: { vernal: '2074-03-20', summer: '2074-06-21', autumnal: '2074-09-22', winter: '2074-12-21' },
  2075: { vernal: '2075-03-20', summer: '2075-06-21', autumnal: '2075-09-22', winter: '2075-12-21' },
  2076: { vernal: '2076-03-19', summer: '2076-06-20', autumnal: '2076-09-22', winter: '2076-12-21' },
  2077: { vernal: '2077-03-19', summer: '2077-06-20', autumnal: '2077-09-22', winter: '2077-12-21' },
  2078: { vernal: '2078-03-20', summer: '2078-06-21', autumnal: '2078-09-22', winter: '2078-12-21' },
  2079: { vernal: '2079-03-20', summer: '2079-06-21', autumnal: '2079-09-22', winter: '2079-12-21' },
  2080: { vernal: '2080-03-19', summer: '2080-06-20', autumnal: '2080-09-22', winter: '2080-12-21' },
  2081: { vernal: '2081-03-19', summer: '2081-06-20', autumnal: '2081-09-22', winter: '2081-12-21' },
  2082: { vernal: '2082-03-20', summer: '2082-06-21', autumnal: '2082-09-22', winter: '2082-12-21' },
  2083: { vernal: '2083-03-20', summer: '2083-06-21', autumnal: '2083-09-22', winter: '2083-12-21' },
  2084: { vernal: '2084-03-19', summer: '2084-06-20', autumnal: '2084-09-22', winter: '2084-12-21' },
  2085: { vernal: '2085-03-19', summer: '2085-06-20', autumnal: '2085-09-22', winter: '2085-12-21' },
  2086: { vernal: '2086-03-20', summer: '2086-06-21', autumnal: '2086-09-22', winter: '2086-12-21' },
  2087: { vernal: '2087-03-20', summer: '2087-06-21', autumnal: '2087-09-22', winter: '2087-12-21' },
  2088: { vernal: '2088-03-19', summer: '2088-06-20', autumnal: '2088-09-22', winter: '2088-12-21' },
  2089: { vernal: '2089-03-19', summer: '2089-06-20', autumnal: '2089-09-22', winter: '2089-12-21' },
  2090: { vernal: '2090-03-20', summer: '2090-06-21', autumnal: '2090-09-22', winter: '2090-12-21' },
  2091: { vernal: '2091-03-20', summer: '2091-06-21', autumnal: '2091-09-22', winter: '2091-12-21' },
  2092: { vernal: '2092-03-19', summer: '2092-06-20', autumnal: '2092-09-22', winter: '2092-12-21' },
  2093: { vernal: '2093-03-19', summer: '2093-06-20', autumnal: '2093-09-22', winter: '2093-12-21' },
  2094: { vernal: '2094-03-20', summer: '2094-06-21', autumnal: '2094-09-22', winter: '2094-12-21' },
  2095: { vernal: '2095-03-20', summer: '2095-06-21', autumnal: '2095-09-22', winter: '2095-12-22' },
  2096: { vernal: '2096-03-19', summer: '2096-06-20', autumnal: '2096-09-22', winter: '2096-12-21' },
  2097: { vernal: '2097-03-19', summer: '2097-06-20', autumnal: '2097-09-22', winter: '2097-12-21' },
  2098: { vernal: '2098-03-20', summer: '2098-06-21', autumnal: '2098-09-22', winter: '2098-12-21' },
  2099: { vernal: '2099-03-20', summer: '2099-06-21', autumnal: '2099-09-22', winter: '2099-12-21' },
  2100: { vernal: '2100-03-20', summer: '2100-06-21', autumnal: '2100-09-22', winter: '2100-12-21' },
  2101: { vernal: '2101-03-20', summer: '2101-06-21', autumnal: '2101-09-23', winter: '2101-12-22' },
  2102: { vernal: '2102-03-21', summer: '2102-06-21', autumnal: '2102-09-23', winter: '2102-12-22' },
  2103: { vernal: '2103-03-21', summer: '2103-06-22', autumnal: '2103-09-23', winter: '2103-12-22' },
  2104: { vernal: '2104-03-20', summer: '2104-06-21', autumnal: '2104-09-22', winter: '2104-12-21' },
  2105: { vernal: '2105-03-20', summer: '2105-06-21', autumnal: '2105-09-23', winter: '2105-12-22' },
}

export function currentSolsticeOrEquinox(today: Date): SolsticeKind | null {
  const year = today.getFullYear()
  const entry = SOLSTICE_DATES[year]
  if (entry === undefined) return null
  const todayStr = localDateString(today)
  if (todayStr === entry.vernal) return 'vernal'
  if (todayStr === entry.summer) return 'summer'
  if (todayStr === entry.autumnal) return 'autumnal'
  if (todayStr === entry.winter) return 'winter'
  return null
}

/**
 * Return the curated quote for a given solstice/equinox kind. Used by
 * FzLibrary to swap its rotating quote for the day.
 */
export function getSolsticeQuote(kind: SolsticeKind): string {
  return SOLSTICE_QUOTES[kind]
}

/**
 * Return the small-caps display label for the solstice/equinox header.
 */
export function getSolsticeLabel(kind: SolsticeKind, year: number): string {
  const labels: Record<SolsticeKind, string> = {
    vernal: 'VERNAL EQUINOX',
    summer: 'SUMMER SOLSTICE',
    autumnal: 'AUTUMNAL EQUINOX',
    winter: 'WINTER SOLSTICE',
  }
  return `${labels[kind]} · ${year}`
}
