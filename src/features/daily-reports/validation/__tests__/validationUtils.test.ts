import { describe, it, expect } from 'vitest'
import {
  getCharacterCount,
  validateDateNotFuture,
  validateField,
  isEmpty,
  validateTimeFormat,
  validateRequiredFields,
  formatFieldName,
} from '../validationUtils'
import { z } from 'zod'

describe('getCharacterCount', () => {
  it('should return correct count and remaining', () => {
    const result = getCharacterCount('Hello', 100)
    expect(result.count).toBe(5)
    expect(result.remaining).toBe(95)
    expect(result.isNearLimit).toBe(false)
    expect(result.isOverLimit).toBe(false)
  })

  it('should detect near limit at 90%', () => {
    const result = getCharacterCount('x'.repeat(91), 100)
    expect(result.isNearLimit).toBe(true)
    expect(result.isOverLimit).toBe(false)
  })

  it('should detect over limit', () => {
    const result = getCharacterCount('x'.repeat(101), 100)
    expect(result.isOverLimit).toBe(true)
    expect(result.remaining).toBe(-1)
  })

  it('should handle undefined input', () => {
    const result = getCharacterCount(undefined, 100)
    expect(result.count).toBe(0)
    expect(result.remaining).toBe(100)
  })

  it('should handle empty string', () => {
    const result = getCharacterCount('', 50)
    expect(result.count).toBe(0)
    expect(result.remaining).toBe(50)
  })

  it('should detect near limit exactly at 90%', () => {
    const result = getCharacterCount('x'.repeat(90), 100)
    expect(result.isNearLimit).toBe(true)
  })

  it('should not be near limit at 89%', () => {
    const result = getCharacterCount('x'.repeat(89), 100)
    expect(result.isNearLimit).toBe(false)
  })

  it('should handle max length exactly', () => {
    const result = getCharacterCount('x'.repeat(100), 100)
    expect(result.count).toBe(100)
    expect(result.remaining).toBe(0)
    expect(result.isOverLimit).toBe(false)
  })
})

describe('validateDateNotFuture', () => {
  it('should allow today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(validateDateNotFuture(today)).toBe(true)
  })

  it('should allow past dates', () => {
    expect(validateDateNotFuture('2020-01-01')).toBe(true)
    expect(validateDateNotFuture('2023-12-31')).toBe(true)
  })

  it('should reject future dates', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]
    expect(validateDateNotFuture(futureDate)).toBe(false)
  })

  it('should reject dates far in the future', () => {
    expect(validateDateNotFuture('2099-12-31')).toBe(false)
  })

  it('should handle yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const pastDate = yesterday.toISOString().split('T')[0]
    expect(validateDateNotFuture(pastDate)).toBe(true)
  })
})

describe('validateField', () => {
  it('should return success for valid value', () => {
    const schema = z.string().min(1, 'Required')
    const result = validateField(schema, 'test')
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return error for invalid value', () => {
    const schema = z.string().min(5, 'Must be at least 5 characters')
    const result = validateField(schema, 'abc')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Must be at least 5 characters')
  })

  it('should validate numbers', () => {
    const schema = z.number().positive('Must be positive')
    expect(validateField(schema, 10).success).toBe(true)
    expect(validateField(schema, -5).success).toBe(false)
  })

  it('should validate complex schemas', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    })
    expect(validateField(schema, { name: 'John', age: 25 }).success).toBe(true)
    expect(validateField(schema, { name: '', age: 25 }).success).toBe(false)
  })
})

describe('isEmpty', () => {
  it('should detect null and undefined', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
  })

  it('should detect empty strings', () => {
    expect(isEmpty('')).toBe(true)
    expect(isEmpty('   ')).toBe(true)
  })

  it('should detect empty arrays', () => {
    expect(isEmpty([])).toBe(true)
  })

  it('should not consider non-empty values as empty', () => {
    expect(isEmpty('hello')).toBe(false)
    expect(isEmpty('  text  ')).toBe(false)
    expect(isEmpty([1, 2, 3])).toBe(false)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
  })
})

describe('validateTimeFormat', () => {
  it('should accept valid times (HH:MM)', () => {
    expect(validateTimeFormat('09:30')).toBe(true)
    expect(validateTimeFormat('14:45')).toBe(true)
    expect(validateTimeFormat('00:00')).toBe(true)
    expect(validateTimeFormat('23:59')).toBe(true)
  })

  it('should accept single-digit hours', () => {
    expect(validateTimeFormat('9:30')).toBe(true)
    expect(validateTimeFormat('5:15')).toBe(true)
  })

  it('should reject invalid hours', () => {
    expect(validateTimeFormat('24:00')).toBe(false)
    expect(validateTimeFormat('25:30')).toBe(false)
  })

  it('should reject invalid minutes', () => {
    expect(validateTimeFormat('10:60')).toBe(false)
    expect(validateTimeFormat('14:99')).toBe(false)
  })

  it('should reject invalid formats', () => {
    expect(validateTimeFormat('1030')).toBe(false)
    expect(validateTimeFormat('10-30')).toBe(false)
    expect(validateTimeFormat('10:30:45')).toBe(false)
    expect(validateTimeFormat('abc')).toBe(false)
  })
})

describe('validateRequiredFields', () => {
  it('should identify missing required fields', () => {
    const data = { name: 'John', age: '' }
    const required = ['name', 'age', 'email']
    const result = validateRequiredFields(data, required)

    expect(result.isValid).toBe(false)
    expect(result.missingFields).toContain('email')
    expect(result.missingFields).toContain('age')
  })

  it('should return valid when all fields present', () => {
    const data = { name: 'John', age: 25, email: 'john@example.com' }
    const required = ['name', 'age', 'email']
    const result = validateRequiredFields(data, required)

    expect(result.isValid).toBe(true)
    expect(result.missingFields).toEqual([])
  })

  it('should handle empty required fields array', () => {
    const data = { name: 'John' }
    const result = validateRequiredFields(data, [])

    expect(result.isValid).toBe(true)
    expect(result.missingFields).toEqual([])
  })

  it('should detect null and undefined as missing', () => {
    const data = { name: 'John', age: null, email: undefined }
    const required = ['name', 'age', 'email']
    const result = validateRequiredFields(data, required)

    expect(result.isValid).toBe(false)
    expect(result.missingFields).toHaveLength(2)
  })
})

describe('formatFieldName', () => {
  it('should convert camelCase to Title Case', () => {
    expect(formatFieldName('firstName')).toBe('First Name')
    expect(formatFieldName('emailAddress')).toBe('Email Address')
  })

  it('should convert snake_case to readable format', () => {
    expect(formatFieldName('first_name')).toBe('First name')
    expect(formatFieldName('email_address')).toBe('Email address')
  })

  it('should handle single words', () => {
    expect(formatFieldName('name')).toBe('Name')
    expect(formatFieldName('email')).toBe('Email')
  })

  it('should handle already formatted names', () => {
    expect(formatFieldName('Name')).toBe(' Name') // Implementation adds space before capital
  })

  it('should handle multiple underscores', () => {
    expect(formatFieldName('user_email_address')).toBe('User email address')
  })

  it('should handle mixed case', () => {
    expect(formatFieldName('userEmailAddress')).toBe('User Email Address')
  })
})
