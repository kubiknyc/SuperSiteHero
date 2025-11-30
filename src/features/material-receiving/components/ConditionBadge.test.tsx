/**
 * ConditionBadge Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConditionBadge } from './ConditionBadge'
import type { MaterialCondition } from '@/types/material-receiving'

describe('ConditionBadge', () => {
  const conditions: { value: MaterialCondition; label: string }[] = [
    { value: 'good', label: 'Good' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'partial', label: 'Partial Delivery' },
    { value: 'rejected', label: 'Rejected' },
  ]

  describe('Condition Display', () => {
    it.each(conditions)('should display correct label for $value condition', ({ value, label }) => {
      render(<ConditionBadge condition={value} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      render(<ConditionBadge condition="good" />)
      const badge = screen.getByText('Good').closest('div')
      // Icon is rendered as SVG inside the badge
      const svg = badge?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should hide icon when showIcon is false', () => {
      render(<ConditionBadge condition="good" showIcon={false} />)
      const badge = screen.getByText('Good').closest('div')
      const svg = badge?.querySelector('svg')
      expect(svg).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should render as a badge element', () => {
      render(<ConditionBadge condition="good" />)
      const badge = screen.getByText('Good')
      expect(badge).toHaveClass('inline-flex')
    })

    it('should apply custom className when provided', () => {
      render(<ConditionBadge condition="good" className="custom-class" />)
      const badge = screen.getByText('Good')
      expect(badge).toHaveClass('custom-class')
    })

    it('should have green styling for good condition', () => {
      render(<ConditionBadge condition="good" />)
      const badge = screen.getByText('Good')
      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should have red styling for damaged condition', () => {
      render(<ConditionBadge condition="damaged" />)
      const badge = screen.getByText('Damaged')
      expect(badge).toHaveClass('bg-red-100', 'text-red-800')
    })

    it('should have yellow styling for partial condition', () => {
      render(<ConditionBadge condition="partial" />)
      const badge = screen.getByText('Partial Delivery')
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })

    it('should have red styling for rejected condition', () => {
      render(<ConditionBadge condition="rejected" />)
      const badge = screen.getByText('Rejected')
      expect(badge).toHaveClass('bg-red-100', 'text-red-800')
    })
  })

  describe('Accessibility', () => {
    it('should have gap class for icon spacing', () => {
      render(<ConditionBadge condition="good" />)
      const badge = screen.getByText('Good')
      expect(badge).toHaveClass('gap-1')
    })
  })
})
