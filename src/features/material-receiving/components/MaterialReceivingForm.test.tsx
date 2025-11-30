/**
 * MaterialReceivingForm Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MaterialReceivingForm } from './MaterialReceivingForm'
import type { MaterialReceivedWithDetails } from '@/types/material-receiving'

// Mock the hooks
vi.mock('../hooks/useMaterialReceiving', () => ({
  useMaterialVendors: () => ({ data: ['ABC Supply', 'XYZ Materials'] }),
  useMaterialStorageLocations: () => ({ data: ['Warehouse A', 'Warehouse B'] }),
}))

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockMaterial: MaterialReceivedWithDetails = {
  id: 'mat-123',
  project_id: 'proj-456',
  delivery_date: '2025-01-15',
  delivery_time: '10:30',
  delivery_ticket_number: 'DT-001',
  material_description: 'Concrete Mix Type II',
  quantity: '500',
  unit: 'CY',
  vendor: 'ABC Supply',
  vendor_contact: 'John Smith',
  submittal_procurement_id: null,
  daily_report_delivery_id: null,
  storage_location: 'Warehouse A',
  po_number: 'PO-2025-001',
  received_by: 'user-123',
  inspected_by: null,
  inspected_at: null,
  condition: 'good',
  condition_notes: 'All items in good condition',
  status: 'received',
  notes: 'Standard delivery',
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-15T10:30:00Z',
  created_by: 'user-456',
  deleted_at: null,
  received_by_name: 'Jane Doe',
  received_by_email: 'jane@example.com',
  inspected_by_name: null,
  inspected_by_email: null,
  created_by_name: 'Admin User',
  project_name: 'Test Project',
  project_number: 'TP-001',
  submittal_id: null,
  submittal_number: null,
  submittal_title: null,
  daily_report_id: null,
  daily_report_date: null,
  photo_count: 0,
}

describe('MaterialReceivingForm', () => {
  const projectId = 'proj-456'
  const onSubmit = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('should render all form sections', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Delivery Information')).toBeInTheDocument()
      expect(screen.getByText('Material Details')).toBeInTheDocument()
      expect(screen.getByText('Vendor Information')).toBeInTheDocument()
      expect(screen.getByText('Condition & Status')).toBeInTheDocument()
    })

    it('should render all required input fields', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByLabelText(/Delivery Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Material Description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Condition/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument()
    })

    it('should render optional input fields', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByLabelText(/Delivery Time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Ticket Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/PO Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Storage Location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Unit/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Vendor Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Vendor Contact/i)).toBeInTheDocument()
    })

    it('should have default values for condition and status', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Default condition should be 'good'
      expect(screen.getByText('Good')).toBeInTheDocument()
      // Default status should be 'received'
      expect(screen.getByText('Received')).toBeInTheDocument()
    })

    it('should show "Log Material" button in create mode', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('button', { name: /Log Material/i })).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should populate form with initial data', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          initialData={mockMaterial}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByDisplayValue('2025-01-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10:30')).toBeInTheDocument()
      expect(screen.getByDisplayValue('DT-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Concrete Mix Type II')).toBeInTheDocument()
      expect(screen.getByDisplayValue('500')).toBeInTheDocument()
      expect(screen.getByDisplayValue('CY')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ABC Supply')).toBeInTheDocument()
      expect(screen.getByDisplayValue('PO-2025-001')).toBeInTheDocument()
    })

    it('should show "Update" button in edit mode', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          initialData={mockMaterial}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument()
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await userEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should show loading state when isLoading is true', () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={true}
        />,
        { wrapper: createWrapper() }
      )

      const submitButton = screen.getByRole('button', { name: /Log Material/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('should show error when delivery date is empty', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Clear the default date
      const dateInput = screen.getByLabelText(/Delivery Date/i)
      await userEvent.clear(dateInput)

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /Log Material/i })
      await userEvent.click(submitButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Delivery date is required/i)).toBeInTheDocument()
      })
    })

    it('should show error when material description is empty', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Try to submit without entering description
      const submitButton = screen.getByRole('button', { name: /Log Material/i })
      await userEvent.click(submitButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Material description is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Fill in required fields
      const descriptionInput = screen.getByLabelText(/Material Description/i)
      await userEvent.type(descriptionInput, 'Test Material')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Log Material/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
        const submittedData = onSubmit.mock.calls[0][0]
        expect(submittedData.material_description).toBe('Test Material')
        expect(submittedData.project_id).toBe('proj-456')
        expect(submittedData.condition).toBe('good')
        expect(submittedData.status).toBe('received')
      })
    })

    it('should include all filled fields in submission', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Fill in fields
      await userEvent.type(screen.getByLabelText(/Material Description/i), 'Lumber Package')
      await userEvent.type(screen.getByLabelText(/Quantity/i), '100')
      await userEvent.type(screen.getByLabelText(/Unit/i), 'BF')
      await userEvent.type(screen.getByLabelText(/Vendor Name/i), 'Wood Depot')
      await userEvent.type(screen.getByLabelText(/Ticket Number/i), 'WD-12345')

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Log Material/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
        const submittedData = onSubmit.mock.calls[0][0]
        expect(submittedData.material_description).toBe('Lumber Package')
        expect(submittedData.quantity).toBe('100')
        expect(submittedData.unit).toBe('BF')
        expect(submittedData.vendor).toBe('Wood Depot')
        expect(submittedData.delivery_ticket_number).toBe('WD-12345')
      })
    })
  })

  describe('Condition and Status Selection', () => {
    it('should allow selecting different conditions', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Find and click the condition select
      const conditionTrigger = screen.getByRole('combobox', { name: /Condition/i })
      await userEvent.click(conditionTrigger)

      // Select 'Damaged'
      const damagedOption = await screen.findByRole('option', { name: /Damaged/i })
      await userEvent.click(damagedOption)

      // Verify selection
      expect(screen.getByText('Damaged')).toBeInTheDocument()
    })

    it('should allow selecting different statuses', async () => {
      render(
        <MaterialReceivingForm
          projectId={projectId}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
        { wrapper: createWrapper() }
      )

      // Find and click the status select
      const statusTrigger = screen.getByRole('combobox', { name: /Status/i })
      await userEvent.click(statusTrigger)

      // Select 'Stored'
      const storedOption = await screen.findByRole('option', { name: /Stored/i })
      await userEvent.click(storedOption)

      // Verify selection
      expect(screen.getByText('Stored')).toBeInTheDocument()
    })
  })
})
