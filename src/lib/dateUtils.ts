/**
 * Safe date formatting utilities
 * Handle null/undefined values gracefully
 */
import { format, isValid, parseISO } from 'date-fns'

export const safeFormat = (
  dateValue: string | number | Date | null | undefined,
  formatStr: string = 'MMM d, yyyy',
  fallback: string = 'N/A'
): string => {
  if (!dateValue) {return fallback}

  try {
    let date: Date
    if (typeof dateValue === 'string') {
      date = parseISO(dateValue)
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue)
    } else {
      date = dateValue
    }

    return isValid(date) ? format(date, formatStr) : fallback
  } catch {
    return fallback
  }
}

export const safeFormatLong = (dateValue: string | null | undefined, fallback: string = 'N/A'): string => {
  return safeFormat(dateValue, 'MMMM d, yyyy', fallback)
}

export const safeFormatShort = (dateValue: string | null | undefined, fallback: string = 'N/A'): string => {
  return safeFormat(dateValue, 'MMM d', fallback)
}

export const safeFormatWithTime = (dateValue: string | null | undefined, fallback: string = 'N/A'): string => {
  return safeFormat(dateValue, 'MMM d, yyyy h:mm a', fallback)
}

export const safeGetDay = (dateValue: string | null | undefined): number | null => {
  if (!dateValue) {return null}

  try {
    const date = parseISO(dateValue)
    return isValid(date) ? date.getDay() : null
  } catch {
    return null
  }
}
