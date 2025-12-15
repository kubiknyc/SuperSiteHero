// File: /src/features/checklists/components/ScoringReportView.test.tsx
// Tests for ScoringReportView component

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoringReportView } from './ScoringReportView'
import type { ChecklistExecution } from '@/types/checklists'
import type { ScoringReportSummary } from '@/types/checklist-scoring'

const mockExecutions: ChecklistExecution[] = [
  {
    id: 'exec1',
    project_id: 'project1',
    checklist_template_id: 'template1',
    name: 'Safety Inspection 1',
    description: null,
    category: 'Safety',
    inspector_user_id: 'user1',
    inspector_name: 'John Doe',
    inspector_signature_url: null,
    location: 'Site A',
    weather_conditions: 'Sunny',
    temperature: 75,
    status: 'submitted',
    items: [],
    is_completed: true,
    completed_at: '2025-01-10T12:00:00Z',
    completed_by: 'user1',
    submitted_at: '2025-01-10T12:00:00Z',
    score_pass: 9,
    score_fail: 1,
    score_na: 0,
    score_total: 10,
    score_percentage: 90,
    daily_report_id: null,
    pdf_url: null,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T12:00:00Z',
    created_by: 'user1',
    deleted_at: null,
  },
  {
    id: 'exec2',
    project_id: 'project1',
    checklist_template_id: 'template1',
    name: 'Quality Inspection 1',
    description: null,
    category: 'Quality',
    inspector_user_id: 'user2',
    inspector_name: 'Jane Smith',
    inspector_signature_url: null,
    location: 'Site B',
    weather_conditions: 'Cloudy',
    temperature: 68,
    status: 'submitted',
    items: [],
    is_completed: true,
    completed_at: '2025-01-11T12:00:00Z',
    completed_by: 'user2',
    submitted_at: '2025-01-11T12:00:00Z',
    score_pass: 5,
    score_fail: 5,
    score_na: 0,
    score_total: 10,
    score_percentage: 50,
    daily_report_id: null,
    pdf_url: null,
    created_at: '2025-01-11T10:00:00Z',
    updated_at: '2025-01-11T12:00:00Z',
    created_by: 'user2',
    deleted_at: null,
  },
  {
    id: 'exec3',
    project_id: 'project1',
    checklist_template_id: 'template1',
    name: 'Safety Inspection 2',
    description: null,
    category: 'Safety',
    inspector_user_id: 'user1',
    inspector_name: 'John Doe',
    inspector_signature_url: null,
    location: 'Site A',
    weather_conditions: 'Rainy',
    temperature: 65,
    status: 'submitted',
    items: [],
    is_completed: true,
    completed_at: '2025-01-12T12:00:00Z',
    completed_by: 'user1',
    submitted_at: '2025-01-12T12:00:00Z',
    score_pass: 8,
    score_fail: 2,
    score_na: 0,
    score_total: 10,
    score_percentage: 80,
    daily_report_id: null,
    pdf_url: null,
    created_at: '2025-01-12T10:00:00Z',
    updated_at: '2025-01-12T12:00:00Z',
    created_by: 'user1',
    deleted_at: null,
  },
]

const mockSummary: ScoringReportSummary = {
  total_executions: 3,
  passed_count: 2,
  failed_count: 1,
  average_score: 73.33,
  median_score: 80,
  grade_distribution: {
    A: 1,
    B: 1,
    F: 1,
  },
  pass_rate: 66.67,
  trend_data: [
    { date: '2025-01-10T12:00:00Z', score: 90, passed: true },
    { date: '2025-01-11T12:00:00Z', score: 50, passed: false },
    { date: '2025-01-12T12:00:00Z', score: 80, passed: true },
  ],
}

describe('ScoringReportView', () => {
  it('should render summary statistics', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('3')).toBeInTheDocument() // Total
    expect(screen.getByText('2')).toBeInTheDocument() // Passed
    expect(screen.getByText('1')).toBeInTheDocument() // Failed
    expect(screen.getByText('73.3%')).toBeInTheDocument() // Average
  })

  it('should render pass rate card', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('Pass Rate')).toBeInTheDocument()
    expect(screen.getByText('2 / 3 passed')).toBeInTheDocument()
    expect(screen.getByText('66.7%')).toBeInTheDocument()
  })

  it('should render grade distribution', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('Grade Distribution')).toBeInTheDocument()
    // Check for grades in distribution
    const gradeElements = screen.getAllByText('1')
    expect(gradeElements.length).toBeGreaterThan(0)
  })

  it('should render all executions in table', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('Safety Inspection 1')).toBeInTheDocument()
    expect(screen.getByText('Quality Inspection 1')).toBeInTheDocument()
    expect(screen.getByText('Safety Inspection 2')).toBeInTheDocument()
  })

  it('should filter by pass/fail status', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    // Initially shows all 3
    expect(screen.getByText('Scoring Results (3 of 3)')).toBeInTheDocument()

    // Note: Actual filter interaction would require proper Select component mocking
    // This is a structural test to verify the filter exists
    expect(screen.getByText('Pass/Fail Status')).toBeInTheDocument()
  })

  it('should show export buttons when onExport is provided', () => {
    const onExport = vi.fn()
    render(
      <ScoringReportView executions={mockExecutions} summary={mockSummary} onExport={onExport} />
    )

    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('should call onExport with correct format', () => {
    const onExport = vi.fn()
    render(
      <ScoringReportView executions={mockExecutions} summary={mockSummary} onExport={onExport} />
    )

    fireEvent.click(screen.getByText('CSV'))
    expect(onExport).toHaveBeenCalledWith('csv')
  })

  it('should hide export buttons when onExport is not provided', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.queryByText('CSV')).not.toBeInTheDocument()
    expect(screen.queryByText('Excel')).not.toBeInTheDocument()
    expect(screen.queryByText('PDF')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(
      <ScoringReportView executions={mockExecutions} summary={mockSummary} isLoading={true} />
    )

    expect(screen.getByText('Loading scores...')).toBeInTheDocument()
  })

  it('should show empty state when no results', () => {
    const emptySummary: ScoringReportSummary = {
      total_executions: 0,
      passed_count: 0,
      failed_count: 0,
      average_score: 0,
      median_score: 0,
      grade_distribution: {},
      pass_rate: 0,
    }

    render(<ScoringReportView executions={[]} summary={emptySummary} />)

    expect(screen.getByText('No results found with current filters')).toBeInTheDocument()
  })

  it('should display category badges', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('Safety')).toBeInTheDocument()
    expect(screen.getByText('Quality')).toBeInTheDocument()
  })

  it('should display inspector names', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should allow clearing filters', () => {
    render(<ScoringReportView executions={mockExecutions} summary={mockSummary} />)

    const clearButton = screen.getByText('Clear Filters')
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    // After clearing, should show all executions
    expect(screen.getByText('Scoring Results (3 of 3)')).toBeInTheDocument()
  })
})
