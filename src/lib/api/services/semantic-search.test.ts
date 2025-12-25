/**
 * Semantic Search Service Tests
 * Tests for message entity integration and search functionality
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import {
  sanitizeSearchQuery,
  sanitizeDateRange,
  type DateRange,
} from './semantic-search'

// ============================================================================
// Input Sanitization Tests
// ============================================================================

describe('sanitizeSearchQuery', () => {
  it('should sanitize basic query', () => {
    const result = sanitizeSearchQuery('hello world')
    expect(result).toBe('hello world')
  })

  it('should remove SQL comment syntax', () => {
    const result = sanitizeSearchQuery('search -- DROP TABLE')
    expect(result).toBe('search  DROP TABLE')
  })

  it('should remove block comments', () => {
    const result = sanitizeSearchQuery('search /* comment */ term')
    expect(result).toBe('search  term')
  })

  it('should remove semicolons', () => {
    const result = sanitizeSearchQuery('search; DROP TABLE;')
    expect(result).toBe('search DROP TABLE')
  })

  it('should remove quotes', () => {
    const result = sanitizeSearchQuery('search "term" \'another\'')
    expect(result).toBe('search term another')
  })

  it('should remove backslashes', () => {
    const result = sanitizeSearchQuery('search\\term')
    expect(result).toBe('searchterm')
  })

  it('should remove null bytes', () => {
    const result = sanitizeSearchQuery('search\0term')
    expect(result).toBe('searchterm')
  })

  it('should limit length to 500 characters', () => {
    const longQuery = 'a'.repeat(600)
    const result = sanitizeSearchQuery(longQuery)
    expect(result.length).toBe(500)
  })

  it('should trim whitespace', () => {
    const result = sanitizeSearchQuery('  search term  ')
    expect(result).toBe('search term')
  })

  it('should handle empty string', () => {
    const result = sanitizeSearchQuery('')
    expect(result).toBe('')
  })

  it('should handle null and undefined', () => {
    expect(sanitizeSearchQuery(null as any)).toBe('')
    expect(sanitizeSearchQuery(undefined as any)).toBe('')
  })

  it('should handle non-string input', () => {
    expect(sanitizeSearchQuery(123 as any)).toBe('')
    expect(sanitizeSearchQuery({} as any)).toBe('')
  })

  it('should handle complex SQL injection attempt', () => {
    const malicious = "'; DROP TABLE users; --"
    const result = sanitizeSearchQuery(malicious)
    expect(result).not.toContain(';')
    expect(result).not.toContain('--')
    expect(result).not.toContain("'")
  })

  it('should preserve normal search terms', () => {
    const result = sanitizeSearchQuery('roof leak repair safety')
    expect(result).toBe('roof leak repair safety')
  })

  it('should handle special characters safely', () => {
    const result = sanitizeSearchQuery('search@term.com $100 #tag')
    expect(result).toBe('search@term.com $100 #tag')
  })
})

describe('sanitizeDateRange', () => {
  it('should accept valid date range', () => {
    const input: DateRange = {
      start: '2024-01-01',
      end: '2024-12-31',
    }
    const result = sanitizeDateRange(input)
    expect(result).toEqual({
      start: '2024-01-01',
      end: '2024-12-31',
    })
  })

  it('should accept start date only', () => {
    const input: DateRange = {
      start: '2024-01-01',
    }
    const result = sanitizeDateRange(input)
    expect(result).toEqual({
      start: '2024-01-01',
    })
  })

  it('should accept end date only', () => {
    const input: DateRange = {
      end: '2024-12-31',
    }
    const result = sanitizeDateRange(input)
    expect(result).toEqual({
      end: '2024-12-31',
    })
  })

  it('should reject invalid date format', () => {
    const input: DateRange = {
      start: '01/01/2024',
      end: '12-31-2024',
    }
    const result = sanitizeDateRange(input)
    expect(result).toBeUndefined()
  })

  it('should reject malformed dates', () => {
    const input: DateRange = {
      start: 'not-a-date',
      end: '2024-13-45',
    }
    const result = sanitizeDateRange(input)
    expect(result).toBeUndefined()
  })

  it('should handle undefined input', () => {
    const result = sanitizeDateRange(undefined)
    expect(result).toBeUndefined()
  })

  it('should handle empty object', () => {
    const result = sanitizeDateRange({})
    expect(result).toBeUndefined()
  })

  it('should accept valid start and reject invalid end', () => {
    const input: DateRange = {
      start: '2024-01-01',
      end: 'invalid',
    }
    const result = sanitizeDateRange(input)
    expect(result).toEqual({
      start: '2024-01-01',
    })
  })

  it('should reject invalid start and accept valid end', () => {
    const input: DateRange = {
      start: 'invalid',
      end: '2024-12-31',
    }
    const result = sanitizeDateRange(input)
    expect(result).toEqual({
      end: '2024-12-31',
    })
  })

  it('should handle SQL injection in dates', () => {
    const input: DateRange = {
      start: "2024-01-01'; DROP TABLE messages; --",
      end: '2024-12-31',
    }
    const result = sanitizeDateRange(input)
    // Should reject the malicious start date
    expect(result?.start).toBeUndefined()
    expect(result?.end).toBe('2024-12-31')
  })

  it('should validate proper YYYY-MM-DD format', () => {
    const validCases = [
      { start: '2024-01-01', end: '2024-12-31' },
      { start: '2023-06-15', end: '2023-06-30' },
      { start: '2025-12-01', end: '2025-12-25' },
    ]

    validCases.forEach(input => {
      const result = sanitizeDateRange(input)
      expect(result).toEqual(input)
    })
  })

  it('should reject various invalid formats', () => {
    const invalidCases = [
      { start: '2024/01/01' },
      { start: '01-01-2024' },
      { start: '2024-1-1' },
      { start: '24-01-01' },
      { start: '2024-13-01' }, // Invalid month
      { start: '2024-01-32' }, // Invalid day
    ]

    invalidCases.forEach(input => {
      const result = sanitizeDateRange(input)
      expect(result?.start).toBeUndefined()
    })
  })
})

// ============================================================================
// Message Entity Configuration Tests
// ============================================================================

describe('Message Entity Configuration', () => {
  it('should have message entity type defined', () => {
    // This tests that the TypeScript type includes 'message'
    // If this compiles without error, the type is correct
    const entityType: import('./semantic-search').SearchEntityType = 'message'
    expect(entityType).toBe('message')
  })

  it('should validate search options with message entity', () => {
    const options: import('./semantic-search').SearchOptions = {
      entities: ['message', 'rfi', 'daily_report'],
      projectId: 'test-project-id',
      limit: 25,
    }
    expect(options.entities).toContain('message')
    expect(options.entities).toHaveLength(3)
  })

  it('should validate message search result structure', () => {
    const mockResult: import('./semantic-search').SearchResult = {
      id: 'msg-123',
      entityType: 'message',
      title: 'Test message content',
      description: 'Full message text here',
      projectId: 'proj-456',
      projectName: 'Building A',
      createdAt: '2024-01-15T10:30:00Z',
      matchedTerms: ['safety', 'inspection'],
      relevanceScore: 85,
      url: '/projects/proj-456/messages?messageId=msg-123',
    }

    expect(mockResult.entityType).toBe('message')
    expect(mockResult.url).toContain('messages')
  })
})

// ============================================================================
// Search Query Validation Tests
// ============================================================================

describe('Search Query Edge Cases', () => {
  it('should handle very short queries', () => {
    const result = sanitizeSearchQuery('a')
    expect(result).toBe('a')
  })

  it('should handle queries with only spaces', () => {
    const result = sanitizeSearchQuery('   ')
    expect(result).toBe('')
  })

  it('should handle queries with unicode characters', () => {
    const result = sanitizeSearchQuery('résumé café naïve')
    expect(result).toBe('résumé café naïve')
  })

  it('should handle queries with emojis', () => {
    const result = sanitizeSearchQuery('safety 🚧 warning ⚠️')
    expect(result).toBe('safety 🚧 warning ⚠️')
  })

  it('should handle queries with numbers', () => {
    const result = sanitizeSearchQuery('RFI 001 building 2024')
    expect(result).toBe('RFI 001 building 2024')
  })

  it('should handle construction industry terms', () => {
    const terms = [
      'HVAC installation',
      'concrete pour schedule',
      'structural steel',
      'punch list items',
      'daily report',
    ]

    terms.forEach(term => {
      const result = sanitizeSearchQuery(term)
      expect(result).toBe(term)
    })
  })

  it('should preserve CSI division numbers', () => {
    const result = sanitizeSearchQuery('Division 03 concrete work')
    expect(result).toBe('Division 03 concrete work')
  })

  it('should handle hyphenated construction terms', () => {
    const result = sanitizeSearchQuery('pre-construction meeting on-site')
    expect(result).toBe('pre-construction meeting on-site')
  })
})

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Rate Limiting', () => {
  it('should validate rate limit info structure', () => {
    const rateLimitInfo: import('./semantic-search').RateLimitInfo = {
      remaining: 45,
      limit: 50,
      resetAt: new Date('2024-01-15T11:00:00Z'),
    }

    expect(rateLimitInfo.remaining).toBeLessThanOrEqual(rateLimitInfo.limit)
    expect(rateLimitInfo.resetAt).toBeInstanceOf(Date)
  })
})
