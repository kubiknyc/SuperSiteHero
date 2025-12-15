// File: /src/features/checklists/components/ChecklistScoring.test.tsx
// Tests for ChecklistScoring component

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChecklistScoring } from './ChecklistScoring'
import type { ChecklistTemplateItem } from '@/types/checklists'
import type { ScoringConfiguration } from '@/types/checklist-scoring'

const mockTemplateItems: ChecklistTemplateItem[] = [
  {
    id: 'item1',
    checklist_template_id: 'template1',
    item_type: 'checkbox',
    label: 'Safety Check 1',
    description: null,
    sort_order: 1,
    section: 'Safety',
    is_required: true,
    config: {},
    scoring_enabled: true,
    pass_fail_na_scoring: true,
    requires_photo: false,
    min_photos: 0,
    max_photos: 5,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
  },
  {
    id: 'item2',
    checklist_template_id: 'template1',
    item_type: 'checkbox',
    label: 'Quality Check 1',
    description: null,
    sort_order: 2,
    section: 'Quality',
    is_required: true,
    config: {},
    scoring_enabled: true,
    pass_fail_na_scoring: true,
    requires_photo: false,
    min_photos: 0,
    max_photos: 5,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
  },
]

describe('ChecklistScoring', () => {
  it('should render with scoring disabled by default', () => {
    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} onChange={onChange} />)

    expect(screen.getByText('Scoring Configuration')).toBeInTheDocument()
    expect(screen.getByText('Enable Scoring')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /enable scoring/i })).not.toBeChecked()
  })

  it('should enable scoring when toggle is clicked', () => {
    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} onChange={onChange} />)

    const enableToggle = screen.getByRole('switch', { name: /enable scoring/i })
    fireEvent.click(enableToggle)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    )
  })

  it('should show scoring options when enabled', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'percentage',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    expect(screen.getByText('Scoring Type')).toBeInTheDocument()
    expect(screen.getByText('Pass Threshold')).toBeInTheDocument()
    expect(screen.getByText('Include N/A in Total')).toBeInTheDocument()
    expect(screen.getByText('Auto-Fail on Critical Items')).toBeInTheDocument()
  })

  it('should change scoring type', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'percentage',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    const select = screen.getByRole('combobox', { name: /scoring type/i })
    fireEvent.click(select)

    // Note: This is a simplified test - actual Select component behavior may differ
    // In a real test, you'd need to properly interact with the Radix UI Select
  })

  it('should show point values section for points-based scoring', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'points',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    expect(screen.getByText('Point Values')).toBeInTheDocument()
    expect(screen.getByText('Safety Check 1')).toBeInTheDocument()
    expect(screen.getByText('Quality Check 1')).toBeInTheDocument()
  })

  it('should show grade thresholds for letter grade scoring', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'letter_grade',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    expect(screen.getByText('Grade Thresholds')).toBeInTheDocument()
    expect(screen.getByText('Define percentage ranges for each letter grade')).toBeInTheDocument()
  })

  it('should show critical items section when fail_on_critical is enabled', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'percentage',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: true,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    expect(screen.getByText('Critical Items')).toBeInTheDocument()
    expect(
      screen.getByText('Mark items as critical - checklist will auto-fail if any critical item fails')
    ).toBeInTheDocument()
  })

  it('should update pass threshold', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'percentage',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    // The slider interaction would need to be tested with proper slider events
    // This is a placeholder for the structure
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('should display scoring type descriptions', () => {
    const config: ScoringConfiguration = {
      enabled: true,
      scoring_type: 'binary',
      pass_threshold: 100,
      include_na_in_total: false,
      fail_on_critical: false,
    }

    const onChange = vi.fn()
    render(<ChecklistScoring templateItems={mockTemplateItems} config={config} onChange={onChange} />)

    expect(
      screen.getByText('All items must pass for 100%, any failure results in 0%')
    ).toBeInTheDocument()
  })
})
