/**
 * DashboardStats Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardStats } from './DashboardStats'
import type { SubcontractorStats } from '@/types/subcontractor-portal'

// Mock stats data
const createMockStats = (overrides: Partial<SubcontractorStats> = {}): SubcontractorStats => ({
  total_projects: 5,
  pending_bids: 2,
  open_punch_items: 8,
  open_tasks: 4,
  expiring_documents: 1,
  overdue_items: 0,
  ...overrides,
})

describe('DashboardStats', () => {
  describe('Rendering', () => {
    it('should render all stat cards', () => {
      const stats = createMockStats()
      render(<DashboardStats stats={stats} />)

      expect(screen.getByText('Active Projects')).toBeInTheDocument()
      expect(screen.getByText('Pending Bids')).toBeInTheDocument()
      expect(screen.getByText('Punch Items')).toBeInTheDocument()
      expect(screen.getByText('Open Tasks')).toBeInTheDocument()
      expect(screen.getByText('Expiring Docs')).toBeInTheDocument()
      expect(screen.getByText('Overdue Items')).toBeInTheDocument()
    })

    it('should display correct values', () => {
      const stats = createMockStats({
        total_projects: 10,
        pending_bids: 3,
        open_punch_items: 15,
        open_tasks: 7,
        expiring_documents: 2,
        overdue_items: 4,
      })
      render(<DashboardStats stats={stats} />)

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should display zero values correctly', () => {
      const stats = createMockStats({
        total_projects: 0,
        pending_bids: 0,
        open_punch_items: 0,
        open_tasks: 0,
        expiring_documents: 0,
        overdue_items: 0,
      })
      render(<DashboardStats stats={stats} />)

      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(6)
    })
  })

  describe('Warning Indicators', () => {
    it('should show warning description for pending bids > 0', () => {
      const stats = createMockStats({ pending_bids: 3 })
      render(<DashboardStats stats={stats} />)
      expect(screen.getByText('Awaiting your response')).toBeInTheDocument()
    })

    it('should not show warning description for pending bids = 0', () => {
      const stats = createMockStats({ pending_bids: 0 })
      render(<DashboardStats stats={stats} />)
      expect(screen.queryByText('Awaiting your response')).not.toBeInTheDocument()
    })

    it('should show warning description for expiring documents > 0', () => {
      const stats = createMockStats({ expiring_documents: 2 })
      render(<DashboardStats stats={stats} />)
      expect(screen.getByText('Within 30 days')).toBeInTheDocument()
    })

    it('should not show warning description for expiring documents = 0', () => {
      const stats = createMockStats({ expiring_documents: 0 })
      render(<DashboardStats stats={stats} />)
      expect(screen.queryByText('Within 30 days')).not.toBeInTheDocument()
    })

    it('should show danger description for overdue items > 0', () => {
      const stats = createMockStats({ overdue_items: 5 })
      render(<DashboardStats stats={stats} />)
      expect(screen.getByText('Requires attention')).toBeInTheDocument()
    })

    it('should not show danger description for overdue items = 0', () => {
      const stats = createMockStats({ overdue_items: 0 })
      render(<DashboardStats stats={stats} />)
      expect(screen.queryByText('Requires attention')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const stats = createMockStats()
      const { container } = render(<DashboardStats stats={stats} />)

      // Should have grid structure
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()

      // Should have 6 cards
      const cards = container.querySelectorAll('[class*="rounded-"]')
      expect(cards.length).toBeGreaterThanOrEqual(6)
    })
  })
})
