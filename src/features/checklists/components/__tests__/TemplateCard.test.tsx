/**
 * TemplateCard Component Tests
 * Tests for checklist template card in grid and list views
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateCard } from '../TemplateCard'
import type { ChecklistTemplate } from '@/types/checklists'

// Test data factory
function createMockTemplate(overrides: Partial<ChecklistTemplate> = {}): ChecklistTemplate {
  return {
    id: 'template-1',
    company_id: 'company-1',
    name: 'Daily Safety Inspection',
    description: 'Standard daily safety inspection checklist',
    category: 'Safety',
    template_level: 'company',
    is_system_template: false,
    tags: ['safety', 'daily', 'inspection'],
    instructions: 'Complete all items before end of shift',
    estimated_duration_minutes: 30,
    scoring_enabled: true,
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    deleted_at: null,
    ...overrides,
  }
}

describe('TemplateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Grid View', () => {
    it('renders template name', () => {
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
    })

    it('renders template description', () => {
      const template = createMockTemplate({ description: 'Standard daily safety inspection checklist' })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Standard daily safety inspection checklist')).toBeInTheDocument()
    })

    it('shows category badge when provided', () => {
      const template = createMockTemplate({ category: 'Safety' })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Safety')).toBeInTheDocument()
    })

    it('shows system badge for system templates', () => {
      const template = createMockTemplate({ is_system_template: true })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('hides system badge for non-system templates', () => {
      const template = createMockTemplate({ is_system_template: false })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.queryByText('System')).not.toBeInTheDocument()
    })

    it('shows estimated duration when provided', () => {
      const template = createMockTemplate({ estimated_duration_minutes: 30 })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('30 minutes')).toBeInTheDocument()
    })

    it('does not show duration when not provided', () => {
      const template = createMockTemplate({ estimated_duration_minutes: null })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.queryByText(/minutes/i)).not.toBeInTheDocument()
    })

    it('shows tags when provided', () => {
      const template = createMockTemplate({ tags: ['safety', 'daily', 'inspection'] })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('safety')).toBeInTheDocument()
      expect(screen.getByText('daily')).toBeInTheDocument()
      expect(screen.getByText('inspection')).toBeInTheDocument()
    })

    it('limits tags display to 3 with overflow indicator', () => {
      const template = createMockTemplate({ tags: ['safety', 'daily', 'inspection', 'construction', 'osha'] })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('safety')).toBeInTheDocument()
      expect(screen.getByText('daily')).toBeInTheDocument()
      expect(screen.getByText('inspection')).toBeInTheDocument()
      expect(screen.getByText('+2 more')).toBeInTheDocument()
    })

    it('calls onView when template name is clicked', () => {
      const onView = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onView={onView} />)

      fireEvent.click(screen.getByText('Daily Safety Inspection'))
      expect(onView).toHaveBeenCalledWith(template)
    })

    it('shows updated time', () => {
      const template = createMockTemplate({
        updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText(/Updated/i)).toBeInTheDocument()
    })
  })

  describe('List View', () => {
    it('renders template name in list view', () => {
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="list" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
    })

    it('shows description in list view', () => {
      const template = createMockTemplate({ description: 'Standard safety check' })
      render(<TemplateCard template={template} viewMode="list" />)

      expect(screen.getByText('Standard safety check')).toBeInTheDocument()
    })

    it('shows estimated duration in list view', () => {
      const template = createMockTemplate({ estimated_duration_minutes: 45 })
      render(<TemplateCard template={template} viewMode="list" />)

      expect(screen.getByText('45 min')).toBeInTheDocument()
    })
  })

  describe('Menu Actions', () => {
    it('opens menu on more button click', () => {
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)

      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Edit Template')).toBeInTheDocument()
      expect(screen.getByText('Edit Items')).toBeInTheDocument()
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('calls onView when View Details is clicked', () => {
      const onView = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onView={onView} />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)
      fireEvent.click(screen.getByText('View Details'))

      expect(onView).toHaveBeenCalledWith(template)
    })

    it('calls onEdit when Edit Template is clicked', () => {
      const onEdit = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onEdit={onEdit} />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)
      fireEvent.click(screen.getByText('Edit Template'))

      expect(onEdit).toHaveBeenCalledWith(template)
    })

    it('calls onEditItems when Edit Items is clicked', () => {
      const onEditItems = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onEditItems={onEditItems} />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)
      fireEvent.click(screen.getByText('Edit Items'))

      expect(onEditItems).toHaveBeenCalledWith(template)
    })

    it('calls onDuplicate when Duplicate is clicked', () => {
      const onDuplicate = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onDuplicate={onDuplicate} />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)
      fireEvent.click(screen.getByText('Duplicate'))

      expect(onDuplicate).toHaveBeenCalledWith(template)
    })

    it('requires double-click to delete', () => {
      const onDelete = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onDelete={onDelete} />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)

      // First click shows confirmation
      fireEvent.click(screen.getByText('Delete'))
      expect(onDelete).not.toHaveBeenCalled()

      // Second click confirms
      fireEvent.click(screen.getByText('Click again to confirm'))
      expect(onDelete).toHaveBeenCalledWith(template)
    })

    it('closes menu on outside click', async () => {
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" />)

      const moreButton = screen.getByRole('button')
      fireEvent.click(moreButton)

      expect(screen.getByText('View Details')).toBeInTheDocument()

      // Click outside
      fireEvent.mouseDown(document.body)

      await waitFor(() => {
        expect(screen.queryByText('View Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('handles null description gracefully', () => {
      const template = createMockTemplate({ description: null })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
    })

    it('handles null category gracefully', () => {
      const template = createMockTemplate({ category: null })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
      expect(screen.queryByRole('badge')).toBeNull() // No category badge
    })

    it('handles empty tags array', () => {
      const template = createMockTemplate({ tags: [] })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('Daily Safety Inspection')).toBeInTheDocument()
    })
  })

  describe('Template Levels', () => {
    it('handles system template level', () => {
      const template = createMockTemplate({ template_level: 'system', is_system_template: true })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('handles company template level', () => {
      const template = createMockTemplate({ template_level: 'company', is_system_template: false })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.queryByText('System')).not.toBeInTheDocument()
    })

    it('handles project template level', () => {
      const template = createMockTemplate({ template_level: 'project', is_system_template: false })
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.queryByText('System')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has clickable card elements', () => {
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('card content is clickable', () => {
      const onView = vi.fn()
      const template = createMockTemplate()
      render(<TemplateCard template={template} viewMode="grid" onView={onView} />)

      // Click on content area
      fireEvent.click(screen.getByText('Daily Safety Inspection'))
      expect(onView).toHaveBeenCalled()
    })
  })
})
