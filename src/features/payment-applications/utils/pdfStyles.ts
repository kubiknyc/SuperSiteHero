/**
 * PDF Styles and Constants for Payment Application Forms
 * Shared styles for G702 and G703 form generation
 */

// Page dimensions (Letter size)
export const PAGE_WIDTH_PORTRAIT = 215.9 // Letter width in mm (8.5")
export const PAGE_HEIGHT_PORTRAIT = 279.4 // Letter height in mm (11")
export const PAGE_WIDTH_LANDSCAPE = 279.4 // Letter width in landscape
export const PAGE_HEIGHT_LANDSCAPE = 215.9 // Letter height in landscape
export const MARGIN = 12.7 // 0.5 inch margins

// Colors
export const COLORS = {
  black: [0, 0, 0] as [number, number, number],
  darkGray: [51, 51, 51] as [number, number, number],
  mediumGray: [128, 128, 128] as [number, number, number],
  lightGray: [200, 200, 200] as [number, number, number],
  veryLightGray: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  aiaBlue: [0, 51, 102] as [number, number, number], // AIA brand blue
  headerBg: [230, 230, 230] as [number, number, number],
}

// Font sizes
export const FONT_SIZES = {
  title: 14,
  subtitle: 11,
  header: 10,
  body: 9,
  small: 8,
  tiny: 7,
}

// Line heights
export const LINE_HEIGHT = {
  normal: 4,
  tight: 3,
  loose: 5,
}

// Border widths
export const BORDER_WIDTH = {
  thin: 0.3,
  normal: 0.5,
  thick: 1,
}

/**
 * Format currency for PDF display
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage for PDF display
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%'
  return `${value.toFixed(1)}%`
}

/**
 * Format date for PDF display
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

/**
 * Format short date for PDF display
 */
export function formatShortDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return date
  }
}
