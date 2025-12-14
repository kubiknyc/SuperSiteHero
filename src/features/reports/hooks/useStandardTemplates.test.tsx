/**
 * Standard Templates Hooks Tests
 * Tests for standard report templates library hooks
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useStandardTemplates,
  useTemplateSelection,
  useTemplateFilters,
  useTemplatePreview,
} from './useStandardTemplates'

describe('useStandardTemplates', () => {
  it('should return all templates by default', () => {
    const { result } = renderHook(() => useStandardTemplates())

    expect(result.current.templates).toBeDefined()
    expect(Array.isArray(result.current.templates)).toBe(true)
    expect(result.current.templates.length).toBeGreaterThan(0)
    expect(result.current.isFiltered).toBe(false)
  })

  it('should filter templates by category', () => {
    const { result } = renderHook(() =>
      useStandardTemplates({ category: 'daily' })
    )

    expect(result.current.isFiltered).toBe(true)
    result.current.templates.forEach(template => {
      expect(template.category).toBe('daily')
    })
  })

  it('should return template counts', () => {
    const { result } = renderHook(() => useStandardTemplates())

    expect(result.current.counts).toBeDefined()
    expect(typeof result.current.counts.daily).toBe('number')
  })
})

describe('useTemplateSelection', () => {
  it('should select and clear templates', () => {
    const { result } = renderHook(() => useTemplateSelection())

    expect(result.current.selectedTemplate).toBeNull()

    act(() => {
      result.current.selectTemplate('daily-field-report-summary')
    })

    expect(result.current.selectedTemplate).not.toBeNull()

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedTemplate).toBeNull()
  })
})
