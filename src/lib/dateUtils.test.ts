import { describe, it, expect } from 'vitest';
import {
  safeFormat,
  safeFormatLong,
  safeFormatShort,
  safeFormatWithTime,
  safeGetDay,
} from './dateUtils';

describe('safeFormat', () => {
  it('should format valid ISO date string', () => {
    const result = safeFormat('2025-01-15T10:30:00Z', 'MMM d, yyyy');
    expect(result).toBe('Jan 15, 2025');
  });

  it('should format valid date number (timestamp)', () => {
    const timestamp = new Date('2025-01-15T12:00:00Z').getTime();
    const result = safeFormat(timestamp, 'MMM d, yyyy');
    // Use regex to handle timezone differences
    expect(result).toMatch(/Jan (14|15), 2025/);
  });

  it('should format valid Date object', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const result = safeFormat(date, 'MMM d, yyyy');
    // Use regex to handle timezone differences
    expect(result).toMatch(/Jan (14|15), 2025/);
  });

  it('should return fallback for null', () => {
    const result = safeFormat(null);
    expect(result).toBe('N/A');
  });

  it('should return fallback for undefined', () => {
    const result = safeFormat(undefined);
    expect(result).toBe('N/A');
  });

  it('should return custom fallback when provided', () => {
    const result = safeFormat(null, 'MMM d, yyyy', 'No date');
    expect(result).toBe('No date');
  });

  it('should return fallback for invalid date string', () => {
    const result = safeFormat('invalid-date');
    expect(result).toBe('N/A');
  });

  it('should use default format when not specified', () => {
    const result = safeFormat('2025-01-15');
    expect(result).toBe('Jan 15, 2025');
  });

  it('should handle different date formats', () => {
    const result = safeFormat('2025-01-15', 'yyyy-MM-dd');
    expect(result).toBe('2025-01-15');
  });

  it('should handle time formatting', () => {
    const result = safeFormat('2025-01-15T14:30:00Z', 'h:mm a');
    // Note: Result may vary based on timezone
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it('should handle edge case: year 0', () => {
    const result = safeFormat('0000-01-01');
    // Year 0 is valid in ISO 8601 (represents 1 BC), so it should format
    expect(result).toMatch(/Jan 1, 0*1/);
  });

  it('should handle leap year dates', () => {
    const result = safeFormat('2024-02-29', 'MMM d, yyyy');
    expect(result).toBe('Feb 29, 2024');
  });
});

describe('safeFormatLong', () => {
  it('should format date in long format', () => {
    const result = safeFormatLong('2025-01-15');
    expect(result).toBe('January 15, 2025');
  });

  it('should return fallback for null', () => {
    const result = safeFormatLong(null);
    expect(result).toBe('N/A');
  });

  it('should return custom fallback when provided', () => {
    const result = safeFormatLong(null, 'Unknown date');
    expect(result).toBe('Unknown date');
  });

  it('should handle December dates', () => {
    const result = safeFormatLong('2025-12-25');
    expect(result).toBe('December 25, 2025');
  });
});

describe('safeFormatShort', () => {
  it('should format date in short format without year', () => {
    const result = safeFormatShort('2025-01-15');
    expect(result).toBe('Jan 15');
  });

  it('should return fallback for undefined', () => {
    const result = safeFormatShort(undefined);
    expect(result).toBe('N/A');
  });

  it('should return custom fallback when provided', () => {
    const result = safeFormatShort(null, '--');
    expect(result).toBe('--');
  });

  it('should handle single-digit days', () => {
    const result = safeFormatShort('2025-01-05');
    expect(result).toBe('Jan 5');
  });

  it('should handle last day of month', () => {
    const result = safeFormatShort('2025-01-31');
    expect(result).toBe('Jan 31');
  });
});

describe('safeFormatWithTime', () => {
  it('should format date with time', () => {
    const result = safeFormatWithTime('2025-01-15T14:30:00Z');
    // Note: Result may vary based on timezone
    expect(result).toMatch(/Jan 15, 2025 \d{1,2}:\d{2} (AM|PM)/);
  });

  it('should return fallback for null', () => {
    const result = safeFormatWithTime(null);
    expect(result).toBe('N/A');
  });

  it('should return custom fallback when provided', () => {
    const result = safeFormatWithTime(undefined, 'No timestamp');
    expect(result).toBe('No timestamp');
  });

  it('should handle midnight time', () => {
    const result = safeFormatWithTime('2025-01-15T00:00:00Z');
    // Midnight UTC can be different local times depending on timezone
    expect(result).toMatch(/Jan (14|15), 2025 \d{1,2}:\d{2} (AM|PM)/);
  });

  it('should handle noon time', () => {
    const result = safeFormatWithTime('2025-01-15T12:00:00Z');
    expect(result).toMatch(/Jan 15, 2025 \d{1,2}:\d{2} (AM|PM)/);
  });
});

describe('safeGetDay', () => {
  it('should return day of week for valid date (Sunday)', () => {
    // 2025-01-12 is a Sunday
    const result = safeGetDay('2025-01-12');
    expect(result).toBe(0);
  });

  it('should return day of week for valid date (Monday)', () => {
    // 2025-01-13 is a Monday
    const result = safeGetDay('2025-01-13');
    expect(result).toBe(1);
  });

  it('should return day of week for valid date (Saturday)', () => {
    // 2025-01-18 is a Saturday
    const result = safeGetDay('2025-01-18');
    expect(result).toBe(6);
  });

  it('should return null for null input', () => {
    const result = safeGetDay(null);
    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = safeGetDay(undefined);
    expect(result).toBeNull();
  });

  it('should return null for invalid date string', () => {
    const result = safeGetDay('not-a-date');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = safeGetDay('');
    expect(result).toBeNull();
  });

  it('should handle ISO date with time', () => {
    const result = safeGetDay('2025-01-12T14:30:00Z');
    // Day should still be determined correctly
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(6);
  });
});
