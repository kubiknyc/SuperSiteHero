/**
 * StatusBadge Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import type { MaterialStatus } from '@/types/material-receiving'

describe('StatusBadge', () => {
  const statuses: { value: MaterialStatus; label: string }[] = [
    { value: 'received', label: 'Received' },
    { value: 'inspected', label: 'Inspected' },
    { value: 'stored', label: 'Stored' },
    { value: 'issued', label: 'Issued' },
    { value: 'returned', label: 'Returned' },
  ]

  describe('Status Display', () => {
    it.each(statuses)('should display correct label for $value status', ({ value, label }) => {
      render(<StatusBadge status={value} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should render as a badge element', () => {
      render(<StatusBadge status="received" />)
      const badge = screen.getByText('Received')
      expect(badge).toHaveClass('inline-flex')
    })

    it('should apply custom className when provided', () => {
      render(<StatusBadge status="received" className="custom-class" />)
      const badge = screen.getByText('Received')
      expect(badge).toHaveClass('custom-class')
    })

    it('should have blue styling for received status', () => {
      render(<StatusBadge status="received" />)
      const badge = screen.getByText('Received')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should have purple styling for inspected status', () => {
      render(<StatusBadge status="inspected" />)
      const badge = screen.getByText('Inspected')
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-800')
    })

    it('should have green styling for stored status', () => {
      render(<StatusBadge status="stored" />)
      const badge = screen.getByText('Stored')
      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should have orange styling for issued status', () => {
      render(<StatusBadge status="issued" />)
      const badge = screen.getByText('Issued')
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800')
    })

    it('should have gray styling for returned status', () => {
      render(<StatusBadge status="returned" />)
      const badge = screen.getByText('Returned')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
    })
  })
})
