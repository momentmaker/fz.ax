import type { FzState } from '../types/state'
import { totalWeeks, weekIndex } from '../composables/useTime'
import { localDateString } from './date'

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
    }
    else if (i < currentIdx) {
      glyph = '⬢'
      fill = blue
    }
    else if (i === currentIdx) {
      glyph = '⏣'
      fill = yellow
    }
    else {
      glyph = '⬡'
      fill = blue
    }

    parts.push(
      `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(CELL_SIZE * 0.75).toFixed(2)}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${escapeXml(glyph)}</text>`,
    )
  }

  // Footer
  const exportDate = localDateString(today)
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
  const dateStr = localDateString(today)
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
