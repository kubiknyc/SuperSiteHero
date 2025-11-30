/**
 * ComplianceDocumentCard Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComplianceDocumentCard } from './ComplianceDocumentCard'
import type { ComplianceDocumentWithRelations } from '@/types/subcontractor-portal'

// Mock current date for expiration tests
const mockDate = new Date('2025-01-15T12:00:00Z')

// Create mock document data
const createMockDocument = (
  overrides: Partial<ComplianceDocumentWithRelations> = {}
): ComplianceDocumentWithRelations => ({
  id: 'doc-123',
  subcontractor_id: 'sub-123',
  project_id: null,
  document_type: 'insurance_certificate',
  document_name: 'General Liability Insurance 2025',
  description: 'Coverage for general liability claims',
  file_url: 'https://example.com/docs/insurance.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf',
  issue_date: '2025-01-01',
  expiration_date: '2026-01-01',
  is_expired: false,
  expiration_warning_sent: false,
  coverage_amount: 1000000,
  policy_number: 'POL-12345',
  provider_name: 'Acme Insurance Co',
  status: 'approved',
  reviewed_by: null,
  reviewed_at: null,
  rejection_notes: null,
  uploaded_by: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
  deleted_at: null,
  ...overrides,
})

describe('ComplianceDocumentCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Document Information', () => {
    it('should render document name', () => {
      const doc = createMockDocument()
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('General Liability Insurance 2025')).toBeInTheDocument()
    })

    it('should render document type label', () => {
      const doc = createMockDocument({ document_type: 'insurance_certificate' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Insurance Certificate')).toBeInTheDocument()
    })

    it('should render license type correctly', () => {
      const doc = createMockDocument({ document_type: 'license' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('License')).toBeInTheDocument()
    })

    it('should render W-9 type correctly', () => {
      const doc = createMockDocument({ document_type: 'w9' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('W-9 Form')).toBeInTheDocument()
    })

    it('should render bond type correctly', () => {
      const doc = createMockDocument({ document_type: 'bond' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Bond')).toBeInTheDocument()
    })

    it('should render safety certification type correctly', () => {
      const doc = createMockDocument({ document_type: 'safety_cert' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Safety Certification')).toBeInTheDocument()
    })

    it('should render description when present', () => {
      const doc = createMockDocument({ description: 'Test description' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('should not render description when absent', () => {
      const doc = createMockDocument({ description: null })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.queryByText('Coverage for general liability claims')).not.toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show Pending Review for pending status', () => {
      const doc = createMockDocument({ status: 'pending' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Pending Review')).toBeInTheDocument()
    })

    it('should show Approved for approved status', () => {
      const doc = createMockDocument({ status: 'approved' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('should show Rejected for rejected status', () => {
      const doc = createMockDocument({ status: 'rejected' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })

    it('should show Expired for expired status', () => {
      const doc = createMockDocument({ status: 'expired' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Expired')).toBeInTheDocument()
    })
  })

  describe('Insurance Details', () => {
    it('should display issue date', () => {
      const doc = createMockDocument({ issue_date: '2025-01-01' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText(/Issued:/)).toBeInTheDocument()
    })

    it('should display expiration date', () => {
      const doc = createMockDocument({ expiration_date: '2026-01-01' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('should display provider name', () => {
      const doc = createMockDocument({ provider_name: 'Acme Insurance Co' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Acme Insurance Co')).toBeInTheDocument()
    })

    it('should display policy number', () => {
      const doc = createMockDocument({ policy_number: 'POL-12345' })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('#POL-12345')).toBeInTheDocument()
    })

    it('should display coverage amount', () => {
      const doc = createMockDocument({ coverage_amount: 1000000 })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText(/Coverage: \$1,000,000/)).toBeInTheDocument()
    })

    it('should not display provider when null', () => {
      const doc = createMockDocument({ provider_name: null })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.queryByText('Acme Insurance Co')).not.toBeInTheDocument()
    })
  })

  describe('Project Association', () => {
    it('should display project name when associated', () => {
      const doc = createMockDocument({
        project: {
          id: 'proj-123',
          name: 'Downtown Office Building',
          address: '123 Main St',
          status: 'active',
        },
      })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText('Downtown Office Building')).toBeInTheDocument()
    })

    it('should not display project section when not associated', () => {
      const doc = createMockDocument({ project: undefined })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.queryByText('Project:')).not.toBeInTheDocument()
    })
  })

  describe('Rejection Notes', () => {
    it('should display rejection notes for rejected documents', () => {
      const doc = createMockDocument({
        status: 'rejected',
        rejection_notes: 'Certificate has expired',
      })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText(/Rejection Reason:/)).toBeInTheDocument()
      expect(screen.getByText('Certificate has expired')).toBeInTheDocument()
    })

    it('should not display rejection notes for approved documents', () => {
      const doc = createMockDocument({
        status: 'approved',
        rejection_notes: 'Some note',
      })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.queryByText('Rejection Reason:')).not.toBeInTheDocument()
    })
  })

  describe('Reviewer Information', () => {
    it('should display reviewer info when available', () => {
      const doc = createMockDocument({
        reviewed_by: 'user-456',
        reviewed_at: '2025-01-10T14:00:00Z',
        reviewed_by_user: {
          id: 'user-456',
          email: 'reviewer@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      })
      render(<ComplianceDocumentCard document={doc} />)
      expect(screen.getByText(/Reviewed by John Doe/)).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render View button with correct href', () => {
      const doc = createMockDocument({ file_url: 'https://example.com/doc.pdf' })
      render(<ComplianceDocumentCard document={doc} />)
      const viewLink = screen.getByRole('link', { name: /view/i })
      expect(viewLink).toHaveAttribute('href', 'https://example.com/doc.pdf')
      expect(viewLink).toHaveAttribute('target', '_blank')
    })

    it('should render Download button with correct href', () => {
      const doc = createMockDocument({ file_url: 'https://example.com/doc.pdf' })
      render(<ComplianceDocumentCard document={doc} />)
      const downloadLink = screen.getByRole('link', { name: /download/i })
      expect(downloadLink).toHaveAttribute('href', 'https://example.com/doc.pdf')
    })
  })

  describe('Visual States', () => {
    it('should apply opacity for expired documents', () => {
      const doc = createMockDocument({ status: 'expired' })
      const { container } = render(<ComplianceDocumentCard document={doc} />)
      // Check that the card has reduced opacity class
      const card = container.querySelector('.opacity-75')
      expect(card).toBeInTheDocument()
    })

    it('should apply opacity for rejected documents', () => {
      const doc = createMockDocument({ status: 'rejected' })
      const { container } = render(<ComplianceDocumentCard document={doc} />)
      const card = container.querySelector('.opacity-75')
      expect(card).toBeInTheDocument()
    })

    it('should not apply opacity for approved documents', () => {
      const doc = createMockDocument({ status: 'approved' })
      const { container } = render(<ComplianceDocumentCard document={doc} />)
      const card = container.querySelector('.opacity-75')
      expect(card).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const doc = createMockDocument()
      const { container } = render(
        <ComplianceDocumentCard document={doc} className="custom-test-class" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('custom-test-class')
    })
  })
})
