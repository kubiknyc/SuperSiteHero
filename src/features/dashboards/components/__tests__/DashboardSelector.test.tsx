/**
 * Dashboard Selector Tests
 * Tests for dashboard view selection and rendering
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDashboardView } from '../DashboardSelector'

describe('useDashboardView', () => {
  it('should initialize with superintendent view', () => {
    const { result } = renderHook(() => useDashboardView())

    expect(result.current.currentView).toBe('superintendent')
  })

  it('should change dashboard view', () => {
    const { result } = renderHook(() => useDashboardView())

    act(() => {
      result.current.setView('project-manager')
    })

    expect(result.current.currentView).toBe('project-manager')

    act(() => {
      result.current.setView('executive')
    })

    expect(result.current.currentView).toBe('executive')
  })

  it('should provide available views', () => {
    const { result } = renderHook(() => useDashboardView())

    expect(result.current.availableViews).toContain('superintendent')
    expect(result.current.availableViews).toContain('project-manager')
    expect(result.current.availableViews).toContain('executive')
  })
})
