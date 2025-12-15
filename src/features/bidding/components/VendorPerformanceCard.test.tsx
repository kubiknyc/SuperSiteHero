/**
 * Tests for Vendor Performance Card Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VendorPerformanceCard } from './VendorPerformanceCard'
import type { VendorRecommendation } from '@/types/historical-bid-analysis'

describe('VendorPerformanceCard', () => {
  const mockVendor: VendorRecommendation = {
    rank: 1,
    vendor_id: 'vendor-1',
    vendor_name: 'ABC Contractors',
    score: 85.5,
    score_breakdown: {
      win_rate_score: 22.5,
      pricing_score: 20,
      reliability_score: 23,
      experience_score: 20,
    },
    win_rate: 65,
    average_markup: 8.5,
    completion_rate: 95,
    quality_score: 90,
    similar_projects: 8,
    same_trade_bids: 15,
    recent_activity: true,
    reliability_level: 'high',
    on_time_delivery: 92,
    confidence: 'high',
    reasons: ['Strong win rate', 'Excellent completion rate', 'Competitive pricing'],
    concerns: [],
  }

  it('should render vendor name and score', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText('ABC Contractors')).toBeInTheDocument()
    expect(screen.getByText('85.5')).toBeInTheDocument()
  })

  it('should display reliability badge', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText(/High Reliability/i)).toBeInTheDocument()
  })

  it('should show active badge for recent activity', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should display key metrics', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText('8.5%')).toBeInTheDocument() // markup
    expect(screen.getByText('95.0%')).toBeInTheDocument() // completion rate
    expect(screen.getByText('8')).toBeInTheDocument() // similar projects
  })

  it('should show score breakdown', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText(/22.5\/25/)).toBeInTheDocument() // win rate score
    expect(screen.getByText(/20.0\/25/)).toBeInTheDocument() // pricing score
    expect(screen.getByText(/23.0\/25/)).toBeInTheDocument() // reliability score
    expect(screen.getByText(/20.0\/25/)).toBeInTheDocument() // experience score
  })

  it('should display strengths', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText('Strong win rate')).toBeInTheDocument()
    expect(screen.getByText('Excellent completion rate')).toBeInTheDocument()
    expect(screen.getByText('Competitive pricing')).toBeInTheDocument()
  })

  it('should show quality score when available', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText(/Quality Score:/)).toBeInTheDocument()
    expect(screen.getByText(/90.0\/100/)).toBeInTheDocument()
  })

  it('should display confidence level', () => {
    render(<VendorPerformanceCard vendor={mockVendor} />)

    expect(screen.getByText(/HIGH CONFIDENCE RECOMMENDATION/)).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<VendorPerformanceCard vendor={mockVendor} onClick={handleClick} />)

    const card = screen.getByText('ABC Contractors').closest('.cursor-pointer')
    card?.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should handle vendor without quality score', () => {
    const vendorWithoutQuality = { ...mockVendor, quality_score: null }
    render(<VendorPerformanceCard vendor={vendorWithoutQuality} />)

    expect(screen.queryByText(/Quality Score:/)).not.toBeInTheDocument()
  })

  it('should handle vendor without recent activity', () => {
    const inactiveVendor = { ...mockVendor, recent_activity: false }
    render(<VendorPerformanceCard vendor={inactiveVendor} />)

    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('should show different confidence levels correctly', () => {
    const mediumConfidenceVendor = { ...mockVendor, confidence: 'medium' as const }
    const { rerender } = render(<VendorPerformanceCard vendor={mediumConfidenceVendor} />)

    expect(screen.getByText(/MEDIUM CONFIDENCE RECOMMENDATION/)).toBeInTheDocument()

    const lowConfidenceVendor = { ...mockVendor, confidence: 'low' as const }
    rerender(<VendorPerformanceCard vendor={lowConfidenceVendor} />)

    expect(screen.getByText(/LOW CONFIDENCE RECOMMENDATION/)).toBeInTheDocument()
  })
})
