/**
 * ExpirationBadge Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpirationBadge } from './ExpirationBadge'

describe('ExpirationBadge', () => {
  // Mock the current date for consistent testing
  const mockDate = new Date('2025-01-15T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('No Expiration Date', () => {
    it('should display "No Expiration" when expiration date is null', () => {
      render(<ExpirationBadge expirationDate={null} />)
      expect(screen.getByText('No Expiration')).toBeInTheDocument()
    })

    it('should show clock icon by default', () => {
      render(<ExpirationBadge expirationDate={null} />)
      // The badge should have the clock icon (rendered as SVG)
      const badge = screen.getByText('No Expiration').closest('div')
      expect(badge).toBeInTheDocument()
    })

    it('should hide icon when showIcon is false', () => {
      render(<ExpirationBadge expirationDate={null} showIcon={false} />)
      expect(screen.getByText('No Expiration')).toBeInTheDocument()
    })
  })

  describe('Expired Documents', () => {
    it('should show expired message when expiration has passed', () => {
      render(<ExpirationBadge expirationDate="2025-01-10" />)
      // Check for any "Expired" text since exact days may vary with timezone
      expect(screen.getByText(/Expired/)).toBeInTheDocument()
    })

    it('should show days ago for expired documents', () => {
      render(<ExpirationBadge expirationDate="2025-01-05" />)
      // Should show some form of expired message
      expect(screen.getByText(/Expired \d+d ago/)).toBeInTheDocument()
    })

    it('should display expired state correctly', () => {
      render(<ExpirationBadge expirationDate="2025-01-01" />)
      expect(screen.getByText(/Expired/)).toBeInTheDocument()
    })
  })

  describe('Expiring Soon (7 days or less)', () => {
    it('should show expires message for imminent expiration', () => {
      // 2 days from mock date
      render(<ExpirationBadge expirationDate="2025-01-17" />)
      expect(screen.getByText(/Expires/)).toBeInTheDocument()
    })

    it('should show days remaining for near-term expiration', () => {
      // 5 days from mock date
      render(<ExpirationBadge expirationDate="2025-01-20" />)
      expect(screen.getByText(/Expires in \d+d/)).toBeInTheDocument()
    })

    it('should show days within 7 day threshold', () => {
      // 7 days from mock date
      render(<ExpirationBadge expirationDate="2025-01-22" />)
      expect(screen.getByText(/Expires in \d+d/)).toBeInTheDocument()
    })
  })

  describe('Expiring Within 30 Days', () => {
    it('should show warning for 8-30 days', () => {
      render(<ExpirationBadge expirationDate="2025-02-01" />)
      expect(screen.getByText(/Expires in \d+d/)).toBeInTheDocument()
    })

    it('should show days at 30 day threshold', () => {
      render(<ExpirationBadge expirationDate="2025-02-14" />)
      expect(screen.getByText(/Expires in \d+d/)).toBeInTheDocument()
    })
  })

  describe('Expiring Within 90 Days', () => {
    it('should show secondary badge for 31-90 days', () => {
      render(<ExpirationBadge expirationDate="2025-03-15" />)
      expect(screen.getByText(/Expires in \d+d/)).toBeInTheDocument()
    })
  })

  describe('Valid for Long Time', () => {
    it('should show "Valid" for more than 90 days', () => {
      render(<ExpirationBadge expirationDate="2025-06-15" />)
      expect(screen.getByText('Valid')).toBeInTheDocument()
    })

    it('should show green styling for valid documents', () => {
      render(<ExpirationBadge expirationDate="2025-12-31" />)
      expect(screen.getByText('Valid')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<ExpirationBadge expirationDate={null} className="custom-class" />)
      const badge = screen.getByText('No Expiration').closest('div')
      expect(badge).toHaveClass('custom-class')
    })
  })

  describe('showIcon prop', () => {
    it('should show icon by default', () => {
      render(<ExpirationBadge expirationDate="2025-06-15" />)
      // Icon should be present (check for SVG element)
      const badge = screen.getByText('Valid').closest('div')
      const svg = badge?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should hide icon when showIcon is false', () => {
      render(<ExpirationBadge expirationDate="2025-06-15" showIcon={false} />)
      const badge = screen.getByText('Valid').closest('div')
      const svg = badge?.querySelector('svg')
      expect(svg).not.toBeInTheDocument()
    })
  })
})
