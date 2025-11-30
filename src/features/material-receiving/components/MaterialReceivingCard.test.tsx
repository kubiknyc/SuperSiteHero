/**
 * MaterialReceivingCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MaterialReceivingCard } from './MaterialReceivingCard'
import type { MaterialReceivedWithDetails } from '@/types/material-receiving'

// Wrapper component for router context
const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

// Mock material data
const mockMaterial: MaterialReceivedWithDetails = {
  id: 'mat-123',
  project_id: 'proj-456',
  delivery_date: '2025-01-15',
  delivery_time: '10:30',
  delivery_ticket_number: 'DT-001',
  material_description: 'Concrete Mix Type II',
  quantity: '500',
  unit: 'CY',
  vendor: 'ABC Supply Co',
  vendor_contact: 'John Smith',
  submittal_procurement_id: 'sub-789',
  daily_report_delivery_id: null,
  storage_location: 'Warehouse A, Bay 3',
  po_number: 'PO-2025-001',
  received_by: 'user-123',
  inspected_by: null,
  inspected_at: null,
  condition: 'good',
  condition_notes: null,
  status: 'received',
  notes: null,
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
  submittal_id: 'sub-789',
  submittal_number: 'SUB-001',
  submittal_title: 'Concrete Submittal',
  daily_report_id: null,
  daily_report_date: null,
  photo_count: 3,
}

describe('MaterialReceivingCard', () => {
  const projectId = 'proj-456'

  describe('Basic Rendering', () => {
    it('should render material description as title', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Concrete Mix Type II')).toBeInTheDocument()
    })

    it('should render status badge', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Received')).toBeInTheDocument()
    })

    it('should render condition badge', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Good')).toBeInTheDocument()
    })

    it('should render delivery date', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      // Date formatting may vary, check for presence of date info
      expect(screen.getByText(/Jan.*15.*2025|1\/15\/2025|15.*Jan.*2025/i)).toBeInTheDocument()
    })
  })

  describe('Delivery Information', () => {
    it('should render delivery ticket number', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('#DT-001')).toBeInTheDocument()
    })

    it('should render quantity with unit', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('500 CY')).toBeInTheDocument()
    })

    it('should render vendor name', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('ABC Supply Co')).toBeInTheDocument()
    })

    it('should render storage location', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Warehouse A, Bay 3')).toBeInTheDocument()
    })

    it('should render received by name', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })
  })

  describe('Links and Photos', () => {
    it('should render photo count', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render submittal link', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Submittal #SUB-001')).toBeInTheDocument()
    })

    it('should have a view button that links to detail page', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      const viewButton = screen.getByRole('link', { name: 'View' })
      expect(viewButton).toHaveAttribute(
        'href',
        '/projects/proj-456/material-receiving/mat-123'
      )
    })
  })

  describe('Dropdown Actions', () => {
    it('should render dropdown menu button', () => {
      renderWithRouter(
        <MaterialReceivingCard material={mockMaterial} projectId={projectId} />
      )
      const menuButton = screen.getByRole('button', { name: '' })
      expect(menuButton).toBeInTheDocument()
    })

    it('should call onEdit when edit is clicked', async () => {
      const onEdit = vi.fn()
      renderWithRouter(
        <MaterialReceivingCard
          material={mockMaterial}
          projectId={projectId}
          onEdit={onEdit}
        />
      )

      // Open dropdown
      const menuButton = screen.getAllByRole('button')[0]
      fireEvent.click(menuButton)

      // Click edit
      const editOption = await screen.findByText('Edit')
      fireEvent.click(editOption)

      expect(onEdit).toHaveBeenCalledWith('mat-123')
    })

    it('should call onDelete when delete is clicked', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <MaterialReceivingCard
          material={mockMaterial}
          projectId={projectId}
          onDelete={onDelete}
        />
      )

      // Open dropdown
      const menuButton = screen.getAllByRole('button')[0]
      fireEvent.click(menuButton)

      // Click delete
      const deleteOption = await screen.findByText('Delete')
      fireEvent.click(deleteOption)

      expect(onDelete).toHaveBeenCalledWith('mat-123')
    })
  })

  describe('Optional Fields', () => {
    it('should not render ticket number when not provided', () => {
      const materialWithoutTicket = { ...mockMaterial, delivery_ticket_number: null }
      renderWithRouter(
        <MaterialReceivingCard material={materialWithoutTicket} projectId={projectId} />
      )
      expect(screen.queryByText(/#DT/)).not.toBeInTheDocument()
    })

    it('should not render quantity when not provided', () => {
      const materialWithoutQuantity = { ...mockMaterial, quantity: null }
      renderWithRouter(
        <MaterialReceivingCard material={materialWithoutQuantity} projectId={projectId} />
      )
      expect(screen.queryByText(/CY/)).not.toBeInTheDocument()
    })

    it('should not render vendor when not provided', () => {
      const materialWithoutVendor = { ...mockMaterial, vendor: null }
      renderWithRouter(
        <MaterialReceivingCard material={materialWithoutVendor} projectId={projectId} />
      )
      expect(screen.queryByText('ABC Supply Co')).not.toBeInTheDocument()
    })

    it('should not render photo count when zero', () => {
      const materialWithoutPhotos = { ...mockMaterial, photo_count: 0 }
      renderWithRouter(
        <MaterialReceivingCard material={materialWithoutPhotos} projectId={projectId} />
      )
      // Photo count section should not be visible when count is 0
      const photoCountElement = screen.queryByText('0')
      // Either not present or not associated with camera icon
      expect(photoCountElement).not.toBeInTheDocument()
    })

    it('should not render submittal link when not provided', () => {
      const materialWithoutSubmittal = { ...mockMaterial, submittal_number: null }
      renderWithRouter(
        <MaterialReceivingCard material={materialWithoutSubmittal} projectId={projectId} />
      )
      expect(screen.queryByText(/Submittal/)).not.toBeInTheDocument()
    })
  })

  describe('Different Statuses and Conditions', () => {
    it('should render with inspected status', () => {
      const inspectedMaterial = { ...mockMaterial, status: 'inspected' as const }
      renderWithRouter(
        <MaterialReceivingCard material={inspectedMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Inspected')).toBeInTheDocument()
    })

    it('should render with damaged condition', () => {
      const damagedMaterial = { ...mockMaterial, condition: 'damaged' as const }
      renderWithRouter(
        <MaterialReceivingCard material={damagedMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Damaged')).toBeInTheDocument()
    })

    it('should render with partial condition', () => {
      const partialMaterial = { ...mockMaterial, condition: 'partial' as const }
      renderWithRouter(
        <MaterialReceivingCard material={partialMaterial} projectId={projectId} />
      )
      expect(screen.getByText('Partial Delivery')).toBeInTheDocument()
    })
  })
})
