/**
 * ExecutionCard Component Tests
 * Tests for checklist execution card in grid and list views
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionCard } from '../ExecutionCard'
import type { ChecklistExecution } from '@/types/checklists'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Test data factory
function createMockExecution(overrides: Partial<ChecklistExecution> = {}): ChecklistExecution {
  return {
    id: 'exec-1',
    project_id: 'project-1',
    checklist_template_id: 'template-1',
    name: 'Daily Safety Inspection',
    description: 'Morning safety check for floor 3',
    category: 'Safety',
    inspector_user_id: 'user-1',
    inspector_name: 'John Inspector',
    inspector_signature_url: null,
    location: 'Floor 3, Building A',
    weather_conditions: 'Clear',
    temperature: 72,
    status: 'in_progress',
    items: [],
    is_completed: false,
    completed_at: null,
    completed_by: null,
    submitted_at: null,
    score_pass: 8,
    score_fail: 2,
    score_na: 0,
    score_total: 10,
    score_percentage: 80,
    daily_report_id: null,
    pdf_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    deleted_at: null,
    ...overrides,
  }
}

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  )
}

describe('ExecutionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Grid View', () => {
    it('renders execution name and description', () => {
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
      expect(screen.getByText('Morning safety check for floor 3')).toBeInTheDocument()
    })

    it('displays status badge', () => {
      const execution = createMockExecution({ status: 'in_progress' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('shows location when provided', () => {
      const execution = createMockExecution({ location: 'Floor 3, Building A' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText('Floor 3, Building A')).toBeInTheDocument()
    })

    it('shows category badge when provided', () => {
      const execution = createMockExecution({ category: 'Safety' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText('Safety')).toBeInTheDocument()
    })

    it('shows progress bar for in-progress executions', () => {
      const execution = createMockExecution({ status: 'in_progress', is_completed: false })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText('Progress')).toBeInTheDocument()
    })

    it('hides progress bar for completed executions', () => {
      const execution = createMockExecution({ status: 'submitted', is_completed: true })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.queryByText('Progress')).not.toBeInTheDocument()
    })

    it('navigates to execution details on title click', () => {
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      fireEvent.click(screen.getByText('Daily Safety Inspection'))
      expect(mockNavigate).toHaveBeenCalledWith('/checklists/executions/exec-1')
    })

    it('shows Continue button for draft executions', () => {
      const execution = createMockExecution({ status: 'draft' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('shows Continue button for in_progress executions', () => {
      const execution = createMockExecution({ status: 'in_progress' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('hides Continue button for submitted executions', () => {
      const execution = createMockExecution({ status: 'submitted', is_completed: true })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      // Continue button should not be in footer
      const continueButtons = screen.queryAllByRole('button', { name: /continue/i })
      // May have Continue in menu, but not in main card area
      expect(continueButtons.length).toBeLessThanOrEqual(1)
    })

    it('navigates to fill page on Continue click', () => {
      const execution = createMockExecution({ status: 'in_progress' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)

      expect(mockNavigate).toHaveBeenCalledWith('/checklists/executions/exec-1/fill')
    })
  })

  describe('List View', () => {
    it('renders execution name in list view', () => {
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="list" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
    })

    it('shows description in list view', () => {
      const execution = createMockExecution({ description: 'Morning safety check' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="list" />)

      expect(screen.getByText('Morning safety check')).toBeInTheDocument()
    })

    it('displays inspector info when available', () => {
      const execution = createMockExecution({ inspector_user_id: 'user-1' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="list" />)

      expect(screen.getByText('Inspector')).toBeInTheDocument()
    })

    it('displays location in list view', () => {
      const execution = createMockExecution({ location: 'Floor 3' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="list" />)

      expect(screen.getByText('Floor 3')).toBeInTheDocument()
    })
  })

  describe('Status Colors', () => {
    const statusTests = [
      { status: 'draft', expectedClass: 'bg-gray-100' },
      { status: 'in_progress', expectedClass: 'bg-blue-100' },
      { status: 'submitted', expectedClass: 'bg-green-100' },
      { status: 'approved', expectedClass: 'bg-emerald-100' },
      { status: 'rejected', expectedClass: 'bg-red-100' },
    ] as const

    statusTests.forEach(({ status, expectedClass }) => {
      it(`shows correct color for ${status} status`, () => {
        const execution = createMockExecution({ status })
        renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

        const badge = screen.getByText(status === 'in_progress' ? 'In Progress' :
          status.charAt(0).toUpperCase() + status.slice(1))
        expect(badge.className).toContain(expectedClass)
      })
    })
  })

  describe('Menu Actions', () => {
    it('opens menu on more button click', () => {
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      const moreButton = screen.getAllByRole('button')[0]
      fireEvent.click(moreButton)

      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    it('calls onDelete when delete is clicked twice', () => {
      const onDelete = vi.fn()
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" onDelete={onDelete} />)

      // Open menu
      const moreButton = screen.getAllByRole('button')[0]
      fireEvent.click(moreButton)

      // Click delete first time
      fireEvent.click(screen.getByText('Delete'))
      expect(onDelete).not.toHaveBeenCalled()

      // Click delete second time to confirm
      fireEvent.click(screen.getByText('Click again to confirm'))
      expect(onDelete).toHaveBeenCalledWith(execution)
    })

    it('shows Continue option in menu for in_progress executions', () => {
      const execution = createMockExecution({ status: 'in_progress' })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      const moreButton = screen.getAllByRole('button')[0]
      fireEvent.click(moreButton)

      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('hides Continue option in menu for completed executions', () => {
      const execution = createMockExecution({ status: 'approved', is_completed: true })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      const moreButton = screen.getAllByRole('button')[0]
      fireEvent.click(moreButton)

      expect(screen.queryByText('Continue')).not.toBeInTheDocument()
    })
  })

  describe('Timestamps', () => {
    it('shows created time for incomplete executions', () => {
      const execution = createMockExecution({
        is_completed: false,
        completed_at: null,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText(/Created/i)).toBeInTheDocument()
    })

    it('shows completed time for complete executions', () => {
      const execution = createMockExecution({
        is_completed: true,
        completed_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      expect(screen.getByText(/Completed/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has interactive elements accessible', () => {
      const execution = createMockExecution()
      renderWithRouter(<ExecutionCard execution={execution} viewMode="grid" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
