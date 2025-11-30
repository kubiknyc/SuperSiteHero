/**
 * ComplianceUploadDialog Component Tests
 *
 * Note: Tests involving Radix UI Select interactions are limited due to JSDOM
 * compatibility issues with pointer capture APIs. Full interaction testing
 * should be done via E2E tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComplianceUploadDialog } from './ComplianceUploadDialog'
import { TestProviders } from '@/__tests__/utils/TestProviders'

// Mock the hooks
vi.mock('../hooks/useComplianceDocuments', () => ({
  useUploadComplianceDocument: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-doc-123' }),
    isPending: false,
  })),
  getDocumentTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      insurance_certificate: 'Insurance Certificate',
      license: 'License',
      w9: 'W-9 Form',
      bond: 'Bond',
      safety_cert: 'Safety Certification',
      other: 'Other Document',
    }
    return labels[type] || type
  },
}))

vi.mock('../hooks/useSubcontractorDashboard', () => ({
  useSubcontractorProjects: vi.fn(() => ({
    data: [
      { id: 'proj-1', name: 'Downtown Office', status: 'active' },
      { id: 'proj-2', name: 'Airport Terminal', status: 'active' },
    ],
    isLoading: false,
  })),
}))

function renderDialog(props = {}) {
  const defaultProps = {
    subcontractorId: 'sub-123',
    ...props,
  }

  return render(
    <TestProviders>
      <ComplianceUploadDialog {...defaultProps} />
    </TestProviders>
  )
}

describe('ComplianceUploadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog Trigger', () => {
    it('should render default trigger button', () => {
      renderDialog()
      expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument()
    })

    it('should render custom trigger when provided', () => {
      renderDialog({
        trigger: <button>Custom Upload</button>,
      })
      expect(screen.getByRole('button', { name: /custom upload/i })).toBeInTheDocument()
    })

    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      // Wait for dialog to render in portal
      await waitFor(() => {
        expect(screen.getByText('Upload Compliance Document')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Content', () => {
    it('should display all required form fields', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/document type/i)).toBeInTheDocument()
      })
      expect(screen.getByLabelText(/document name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/file url/i)).toBeInTheDocument()
    })

    it('should display project selector when projects are available', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
      })
    })

    it('should display date fields', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument()
      })
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument()
    })

    it('should display description field', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      })
    })

    it('should display dialog header and description', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByText('Upload Compliance Document')).toBeInTheDocument()
      })
      expect(screen.getByText(/will be reviewed by the project administrator/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when required fields are empty', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByText('Upload Compliance Document')).toBeInTheDocument()
      })

      // Find the submit button (the one with type="submit")
      const submitButtons = screen.getAllByRole('button', { name: /upload document/i })
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')
      expect(submitButton).toBeDisabled()
    })

    it('should have Cancel and Upload buttons', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      // Verify both trigger and submit buttons exist (2 upload document buttons)
      const uploadButtons = screen.getAllByRole('button', { name: /upload document/i })
      expect(uploadButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Cancel Button', () => {
    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('Upload Compliance Document')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.queryByText('Upload Compliance Document')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Input Fields', () => {
    it('should allow typing in document name field', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/document name/i)).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/document name/i)
      await user.type(nameInput, 'Test Document')

      expect(nameInput).toHaveValue('Test Document')
    })

    it('should allow typing in file URL field', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/file url/i)).toBeInTheDocument()
      })

      const urlInput = screen.getByLabelText(/file url/i)
      await user.type(urlInput, 'https://example.com/doc.pdf')

      expect(urlInput).toHaveValue('https://example.com/doc.pdf')
    })

    it('should allow typing in description field', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      })

      const descInput = screen.getByLabelText(/description/i)
      await user.type(descInput, 'Test description')

      expect(descInput).toHaveValue('Test description')
    })

    it('should have date inputs for issue and expiration dates', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /upload document/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument()
      })

      const issueDate = screen.getByLabelText(/issue date/i)
      const expirationDate = screen.getByLabelText(/expiration date/i)

      expect(issueDate).toHaveAttribute('type', 'date')
      expect(expirationDate).toHaveAttribute('type', 'date')
    })
  })

  describe('Subcontractor ID', () => {
    it('should receive subcontractor ID as prop', () => {
      // This test verifies the component renders with the required prop
      renderDialog({ subcontractorId: 'sub-456' })
      expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument()
    })
  })
})
