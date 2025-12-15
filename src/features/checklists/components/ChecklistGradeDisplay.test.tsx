// File: /src/features/checklists/components/ChecklistGradeDisplay.test.tsx
// Tests for ChecklistGradeDisplay component

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ChecklistGradeDisplay,
  CompactGradeDisplay,
  ScoreTrendIndicator,
} from './ChecklistGradeDisplay'
import type { ChecklistScore } from '@/types/checklist-scoring'

describe('ChecklistGradeDisplay', () => {
  const mockPassedScore: ChecklistScore = {
    execution_id: 'exec1',
    scoring_type: 'percentage',
    score: 85.5,
    passed: true,
    breakdown: {
      total_items: 10,
      completed_items: 10,
      scorable_items: 10,
      pass_count: 9,
      fail_count: 1,
      na_count: 0,
      item_scores: [],
    },
    calculated_at: '2025-01-10T12:00:00Z',
  }

  const mockFailedScore: ChecklistScore = {
    execution_id: 'exec2',
    scoring_type: 'percentage',
    score: 55.0,
    passed: false,
    breakdown: {
      total_items: 10,
      completed_items: 10,
      scorable_items: 10,
      pass_count: 5,
      fail_count: 5,
      na_count: 0,
      item_scores: [],
    },
    calculated_at: '2025-01-10T12:00:00Z',
  }

  const mockLetterGradeScore: ChecklistScore = {
    execution_id: 'exec3',
    scoring_type: 'letter_grade',
    score: 92.0,
    grade: 'A',
    passed: true,
    breakdown: {
      total_items: 10,
      completed_items: 10,
      scorable_items: 10,
      pass_count: 9,
      fail_count: 1,
      na_count: 0,
      item_scores: [],
    },
    calculated_at: '2025-01-10T12:00:00Z',
  }

  const mockCriticalFailureScore: ChecklistScore = {
    execution_id: 'exec4',
    scoring_type: 'percentage',
    score: 80.0,
    passed: false,
    breakdown: {
      total_items: 10,
      completed_items: 10,
      scorable_items: 10,
      pass_count: 8,
      fail_count: 2,
      na_count: 0,
      item_scores: [],
      critical_failures: ['item1', 'item2'],
    },
    calculated_at: '2025-01-10T12:00:00Z',
  }

  describe('ChecklistGradeDisplay', () => {
    it('should render passed score correctly', () => {
      render(<ChecklistGradeDisplay score={mockPassedScore} />)

      expect(screen.getByText('PASSED')).toBeInTheDocument()
      expect(screen.getByText(/85\.5/)).toBeInTheDocument()
      expect(screen.getByText('9')).toBeInTheDocument() // Pass count
      expect(screen.getByText('1')).toBeInTheDocument() // Fail count
    })

    it('should render failed score correctly', () => {
      render(<ChecklistGradeDisplay score={mockFailedScore} />)

      expect(screen.getByText('FAILED')).toBeInTheDocument()
      expect(screen.getByText(/55\.0/)).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Both pass and fail counts
    })

    it('should render letter grade score correctly', () => {
      render(<ChecklistGradeDisplay score={mockLetterGradeScore} />)

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('92.0%')).toBeInTheDocument()
      expect(screen.getByText('PASSED')).toBeInTheDocument()
    })

    it('should render critical failure alert', () => {
      render(<ChecklistGradeDisplay score={mockCriticalFailureScore} />)

      expect(screen.getByText('Critical Failure')).toBeInTheDocument()
      expect(screen.getByText('Critical Item Failures')).toBeInTheDocument()
      expect(screen.getByText('2 critical items failed')).toBeInTheDocument()
    })

    it('should hide details when showDetails is false', () => {
      render(<ChecklistGradeDisplay score={mockPassedScore} showDetails={false} />)

      expect(screen.queryByText('Pass')).not.toBeInTheDocument()
      expect(screen.queryByText('Fail')).not.toBeInTheDocument()
    })

    it('should show points breakdown for points-based scoring', () => {
      const pointsScore: ChecklistScore = {
        execution_id: 'exec5',
        scoring_type: 'points',
        score: 75.0,
        passed: true,
        breakdown: {
          total_items: 5,
          completed_items: 5,
          scorable_items: 5,
          pass_count: 4,
          fail_count: 1,
          na_count: 0,
          total_points: 100,
          earned_points: 75,
          item_scores: [],
        },
        calculated_at: '2025-01-10T12:00:00Z',
      }

      render(<ChecklistGradeDisplay score={pointsScore} />)

      expect(screen.getByText('Points Earned')).toBeInTheDocument()
      expect(screen.getByText('75 / 100')).toBeInTheDocument()
    })

    it('should render different sizes correctly', () => {
      const { rerender } = render(<ChecklistGradeDisplay score={mockPassedScore} size="sm" />)
      expect(screen.getByText(/85\.5/)).toBeInTheDocument()

      rerender(<ChecklistGradeDisplay score={mockPassedScore} size="lg" />)
      expect(screen.getByText(/85\.5/)).toBeInTheDocument()
    })
  })

  describe('CompactGradeDisplay', () => {
    it('should render compact passed score', () => {
      render(<CompactGradeDisplay score={mockPassedScore} />)

      expect(screen.getByText(/85\.5%/)).toBeInTheDocument()
    })

    it('should render compact letter grade', () => {
      render(<CompactGradeDisplay score={mockLetterGradeScore} />)

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('(92%)')).toBeInTheDocument()
    })

    it('should show fail styling for failed score', () => {
      const { container } = render(<CompactGradeDisplay score={mockFailedScore} />)

      expect(container.firstChild).toHaveClass('bg-red-100')
    })
  })

  describe('ScoreTrendIndicator', () => {
    it('should show improvement indicator', () => {
      render(<ScoreTrendIndicator currentScore={85} previousScore={75} />)

      expect(screen.getByText('+10.0%')).toBeInTheDocument()
    })

    it('should show decline indicator', () => {
      render(<ScoreTrendIndicator currentScore={65} previousScore={80} />)

      expect(screen.getByText('-15.0%')).toBeInTheDocument()
    })

    it('should show no change indicator', () => {
      render(<ScoreTrendIndicator currentScore={75} previousScore={75} />)

      expect(screen.getByText('No change')).toBeInTheDocument()
    })
  })
})
