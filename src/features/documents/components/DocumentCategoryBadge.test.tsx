// File: /src/features/documents/components/DocumentCategoryBadge.test.tsx
// Tests for DocumentCategoryBadge component

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DocumentCategoryBadge,
  getCategoryIcon,
  getCategoryLabel,
} from './DocumentCategoryBadge'
import type { DocumentCategoryType } from '@/types/document-ai'

describe('DocumentCategoryBadge', () => {
  const categories: DocumentCategoryType[] = [
    'drawing',
    'specification',
    'contract',
    'submittal',
    'rfi',
    'change_order',
    'invoice',
    'report',
    'correspondence',
    'photo',
    'permit',
    'schedule',
    'other',
  ]

  describe('Rendering', () => {
    it('should render badge with category label', () => {
      render(<DocumentCategoryBadge category="drawing" />)
      expect(screen.getByText('Drawing')).toBeInTheDocument()
    })

    it('should render "Uncategorized" when category is null', () => {
      render(<DocumentCategoryBadge category={null} />)
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    })

    it('should render "Uncategorized" when category is undefined', () => {
      render(<DocumentCategoryBadge category={undefined} />)
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    })

    it('should render all category types correctly', () => {
      const expectedLabels: Record<DocumentCategoryType, string> = {
        drawing: 'Drawing',
        specification: 'Specification',
        contract: 'Contract',
        submittal: 'Submittal',
        rfi: 'RFI',
        change_order: 'Change Order',
        invoice: 'Invoice',
        report: 'Report',
        correspondence: 'Correspondence',
        photo: 'Photo',
        permit: 'Permit',
        schedule: 'Schedule',
        other: 'Other',
      }

      categories.forEach((category) => {
        const { unmount } = render(<DocumentCategoryBadge category={category} />)
        expect(screen.getByText(expectedLabels[category])).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Confidence Display', () => {
    it('should not show confidence by default', () => {
      render(<DocumentCategoryBadge category="drawing" confidence={0.95} />)
      expect(screen.queryByText('(95%)')).not.toBeInTheDocument()
    })

    it('should show confidence when showConfidence is true', () => {
      render(
        <DocumentCategoryBadge
          category="drawing"
          confidence={0.95}
          showConfidence
        />
      )
      expect(screen.getByText('(95%)')).toBeInTheDocument()
    })

    it('should round confidence percentage correctly', () => {
      render(
        <DocumentCategoryBadge
          category="drawing"
          confidence={0.857}
          showConfidence
        />
      )
      expect(screen.getByText('(86%)')).toBeInTheDocument()
    })

    it('should not show confidence when confidence is undefined', () => {
      render(
        <DocumentCategoryBadge
          category="drawing"
          showConfidence
        />
      )
      expect(screen.queryByText(/\(\d+%\)/)).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <DocumentCategoryBadge category="drawing" className="custom-class" />
      )
      const badge = container.querySelector('.custom-class')
      expect(badge).toBeInTheDocument()
    })

    it('should have different colors for different categories', () => {
      const { container: container1 } = render(
        <DocumentCategoryBadge category="drawing" />
      )
      const { container: container2 } = render(
        <DocumentCategoryBadge category="contract" />
      )

      const badge1Classes = container1.querySelector('[class*="bg-"]')?.className
      const badge2Classes = container2.querySelector('[class*="bg-"]')?.className

      // Different categories should have different background colors
      expect(badge1Classes).not.toBe(badge2Classes)
    })
  })

  describe('Icons', () => {
    it('should display category icon', () => {
      render(<DocumentCategoryBadge category="drawing" />)
      // The icon 📐 should be rendered for drawing
      expect(screen.getByText('📐')).toBeInTheDocument()
    })

    it('should display different icons for different categories', () => {
      const { rerender } = render(<DocumentCategoryBadge category="drawing" />)
      expect(screen.getByText('📐')).toBeInTheDocument()

      rerender(<DocumentCategoryBadge category="photo" />)
      expect(screen.getByText('📷')).toBeInTheDocument()

      rerender(<DocumentCategoryBadge category="invoice" />)
      expect(screen.getByText('💰')).toBeInTheDocument()
    })
  })
})

describe('getCategoryIcon', () => {
  it('should return correct icon for each category', () => {
    expect(getCategoryIcon('drawing')).toBe('📐')
    expect(getCategoryIcon('specification')).toBe('📋')
    expect(getCategoryIcon('contract')).toBe('📄')
    expect(getCategoryIcon('submittal')).toBe('📦')
    expect(getCategoryIcon('rfi')).toBe('❓')
    expect(getCategoryIcon('change_order')).toBe('🔄')
    expect(getCategoryIcon('invoice')).toBe('💰')
    expect(getCategoryIcon('report')).toBe('📊')
    expect(getCategoryIcon('correspondence')).toBe('✉️')
    expect(getCategoryIcon('photo')).toBe('📷')
    expect(getCategoryIcon('permit')).toBe('📜')
    expect(getCategoryIcon('schedule')).toBe('📅')
    expect(getCategoryIcon('other')).toBe('📁')
  })

  it('should return default icon for unknown category', () => {
    // TypeScript would normally prevent this, but testing runtime behavior
    expect(getCategoryIcon('unknown' as DocumentCategoryType)).toBe('📁')
  })
})

describe('getCategoryLabel', () => {
  it('should return correct label for each category', () => {
    expect(getCategoryLabel('drawing')).toBe('Drawing')
    expect(getCategoryLabel('specification')).toBe('Specification')
    expect(getCategoryLabel('contract')).toBe('Contract')
    expect(getCategoryLabel('submittal')).toBe('Submittal')
    expect(getCategoryLabel('rfi')).toBe('RFI')
    expect(getCategoryLabel('change_order')).toBe('Change Order')
    expect(getCategoryLabel('invoice')).toBe('Invoice')
    expect(getCategoryLabel('report')).toBe('Report')
    expect(getCategoryLabel('correspondence')).toBe('Correspondence')
    expect(getCategoryLabel('photo')).toBe('Photo')
    expect(getCategoryLabel('permit')).toBe('Permit')
    expect(getCategoryLabel('schedule')).toBe('Schedule')
    expect(getCategoryLabel('other')).toBe('Other')
  })

  it('should return category itself for unknown category', () => {
    // TypeScript would normally prevent this, but testing runtime behavior
    expect(getCategoryLabel('unknown' as DocumentCategoryType)).toBe('unknown')
  })
})
