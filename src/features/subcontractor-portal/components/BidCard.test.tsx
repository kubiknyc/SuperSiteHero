/**
 * BidCard Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { BidCard } from './BidCard'
import type { BidWithRelations } from '@/types/subcontractor-portal'

// Create wrapper with Router
function RouterWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

// Mock bid data
const createMockBid = (overrides: Partial<BidWithRelations> = {}): BidWithRelations => ({
  id: 'bid-123',
  workflow_item_id: 'co-123',
  subcontractor_id: 'sub-123',
  bid_status: 'pending',
  lump_sum_cost: null,
  duration_days: null,
  notes: null,
  submitted_at: null,
  created_at: '2025-01-27T10:00:00Z',
  updated_at: '2025-01-27T10:00:00Z',
  workflow_item: {
    id: 'co-123',
    title: 'Kitchen Renovation',
    item_number: 'CO-001',
    description: 'Full kitchen renovation including cabinets',
    status: 'draft',
    project_id: 'proj-123',
    created_at: '2025-01-27T10:00:00Z',
    updated_at: '2025-01-27T10:00:00Z',
  },
  project: {
    id: 'proj-123',
    name: 'Downtown Office',
    address: '123 Main St',
  },
  ...overrides,
})

describe('BidCard', () => {
  describe('Rendering - Full Card', () => {
    it('should render bid title from workflow item', () => {
      const bid = createMockBid()
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument()
    })

    it('should render project name', () => {
      const bid = createMockBid()
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Downtown Office')).toBeInTheDocument()
    })

    it('should render change order number', () => {
      const bid = createMockBid()
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('CO #CO-001')).toBeInTheDocument()
    })

    it('should show Review & Submit button for pending bids', () => {
      const bid = createMockBid({ bid_status: 'pending' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByRole('link', { name: /review & submit bid/i })).toBeInTheDocument()
    })

    it('should show View Details button for non-pending bids', () => {
      const bid = createMockBid({ bid_status: 'submitted' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByRole('link', { name: /view details/i })).toBeInTheDocument()
    })

    it('should display bid amount when submitted', () => {
      const bid = createMockBid({
        bid_status: 'submitted',
        lump_sum_cost: 15000,
        duration_days: 14,
        submitted_at: '2025-01-28T10:00:00Z',
      })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('$15,000')).toBeInTheDocument()
      expect(screen.getByText('14 days')).toBeInTheDocument()
    })
  })

  describe('Rendering - Compact Card', () => {
    it('should render compact card layout', () => {
      const bid = createMockBid()
      render(<BidCard bid={bid} compact />, { wrapper: RouterWrapper })
      expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument()
      expect(screen.getByText('Downtown Office')).toBeInTheDocument()
    })

    it('should be clickable and link to bid details', () => {
      const bid = createMockBid()
      render(<BidCard bid={bid} compact />, { wrapper: RouterWrapper })
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/portal/bids/bid-123')
    })
  })

  describe('Status Badges', () => {
    it('should show Pending Response badge for pending status', () => {
      const bid = createMockBid({ bid_status: 'pending' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Pending Response')).toBeInTheDocument()
    })

    it('should show Submitted badge for submitted status', () => {
      const bid = createMockBid({ bid_status: 'submitted' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Submitted')).toBeInTheDocument()
    })

    it('should show Awarded badge for awarded status', () => {
      const bid = createMockBid({ bid_status: 'awarded' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Awarded')).toBeInTheDocument()
    })

    it('should show Not Selected badge for rejected status', () => {
      const bid = createMockBid({ bid_status: 'rejected' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Not Selected')).toBeInTheDocument()
    })

    it('should show Declined badge for declined status', () => {
      const bid = createMockBid({ bid_status: 'declined' })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Declined')).toBeInTheDocument()
    })
  })

  describe('Fallback Content', () => {
    it('should show default title when workflow item is missing', () => {
      const bid = createMockBid({ workflow_item: undefined })
      render(<BidCard bid={bid} />, { wrapper: RouterWrapper })
      expect(screen.getByText('Change Order Bid Request')).toBeInTheDocument()
    })

    it('should show default title in compact mode when workflow item is missing', () => {
      const bid = createMockBid({ workflow_item: undefined })
      render(<BidCard bid={bid} compact />, { wrapper: RouterWrapper })
      expect(screen.getByText('Change Order Bid')).toBeInTheDocument()
    })
  })
})
