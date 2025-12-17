/**
 * Minimal test to validate Vitest infrastructure
 * No imports, no mocks, no dependencies
 */

import { describe, it, expect } from 'vitest'

describe('Infrastructure validation', () => {
  it('should execute basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string comparison', () => {
    expect('hello').toBe('hello')
  })

  it('should validate boolean logic', () => {
    expect(true).toBe(true)
    expect(false).toBe(false)
  })
})
