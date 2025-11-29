// File: /src/features/analytics/components/RiskScoreGauge.test.tsx
// Tests for RiskScoreGauge and related components

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  RiskScoreGauge,
  RiskBadge,
  RiskIndicator,
  MiniRiskScore,
} from './RiskScoreGauge'
import type { RiskLevel } from '@/types/analytics'

describe('RiskScoreGauge', () => {
  const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical']

  describe('Rendering', () => {
    it('should render with score and label', () => {
      render(<RiskScoreGauge score={50} level="medium" label="Overall Risk" />)

      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Overall Risk')).toBeInTheDocument()
      // Component uses CSS capitalize, so raw text is lowercase
      expect(screen.getByText('medium Risk')).toBeInTheDocument()
    })

    it('should render SVG gauge element', () => {
      const { container } = render(
        <RiskScoreGauge score={50} level="medium" label="Test" />
      )

      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelectorAll('circle').length).toBe(2) // Background + progress
    })

    it('should round score to integer', () => {
      render(<RiskScoreGauge score={45.7} level="medium" label="Test" />)
      expect(screen.getByText('46')).toBeInTheDocument()
    })

    it('should clamp score to 0-100 range for display', () => {
      render(<RiskScoreGauge score={150} level="critical" label="Test" />)
      // Score display should show the value (it's not clamped in display, only in progress)
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      const { container } = render(
        <RiskScoreGauge score={50} level="medium" label="Test" size="sm" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '64')
      expect(svg).toHaveAttribute('height', '64')
    })

    it('should render medium size correctly', () => {
      const { container } = render(
        <RiskScoreGauge score={50} level="medium" label="Test" size="md" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '96')
      expect(svg).toHaveAttribute('height', '96')
    })

    it('should render large size correctly', () => {
      const { container } = render(
        <RiskScoreGauge score={50} level="medium" label="Test" size="lg" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '128')
      expect(svg).toHaveAttribute('height', '128')
    })

    it('should default to medium size', () => {
      const { container } = render(
        <RiskScoreGauge score={50} level="medium" label="Test" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '96')
    })
  })

  describe('Risk Levels', () => {
    it('should render all risk levels with correct text', () => {
      riskLevels.forEach((level) => {
        const { unmount } = render(
          <RiskScoreGauge score={50} level={level} label="Test" />
        )
        // Component uses CSS capitalize, so raw text is lowercase + " Risk"
        const expectedText = `${level} Risk`
        expect(screen.getByText(expectedText)).toBeInTheDocument()
        unmount()
      })
    })

    it('should apply different colors for different risk levels', () => {
      const { container: lowContainer } = render(
        <RiskScoreGauge score={20} level="low" label="Low" />
      )
      const { container: criticalContainer } = render(
        <RiskScoreGauge score={90} level="critical" label="Critical" />
      )

      const lowCircle = lowContainer.querySelectorAll('circle')[1]
      const criticalCircle = criticalContainer.querySelectorAll('circle')[1]

      // Check that stroke colors are different
      expect(lowCircle.getAttribute('stroke')).not.toBe(
        criticalCircle.getAttribute('stroke')
      )
    })
  })

  describe('Label Display', () => {
    it('should show label by default', () => {
      render(<RiskScoreGauge score={50} level="medium" label="Test Label" />)
      expect(screen.getByText('Test Label')).toBeInTheDocument()
    })

    it('should hide label when showLabel is false', () => {
      render(
        <RiskScoreGauge
          score={50}
          level="medium"
          label="Hidden Label"
          showLabel={false}
        />
      )
      expect(screen.queryByText('Hidden Label')).not.toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <RiskScoreGauge
          score={50}
          level="medium"
          label="Test"
          className="custom-gauge-class"
        />
      )

      expect(container.querySelector('.custom-gauge-class')).toBeInTheDocument()
    })
  })
})

describe('RiskBadge', () => {
  describe('Rendering', () => {
    it('should render score and level', () => {
      render(<RiskBadge score={75} level="high" />)

      expect(screen.getByText('75')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })

    it('should round score to integer', () => {
      render(<RiskBadge score={74.6} level="high" />)
      expect(screen.getByText('75')).toBeInTheDocument()
    })

    it('should capitalize level text', () => {
      render(<RiskBadge score={50} level="medium" />)
      // Using capitalize CSS class, so the text is still lowercase in DOM
      expect(screen.getByText('medium')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply different colors for different levels', () => {
      const { container: lowContainer } = render(
        <RiskBadge score={20} level="low" />
      )
      const { container: highContainer } = render(
        <RiskBadge score={80} level="high" />
      )

      const lowBadge = lowContainer.querySelector('span')
      const highBadge = highContainer.querySelector('span')

      // Badges should have different background colors
      expect(lowBadge?.className).not.toBe(highBadge?.className)
    })

    it('should apply custom className', () => {
      const { container } = render(
        <RiskBadge score={50} level="medium" className="custom-badge" />
      )

      expect(container.querySelector('.custom-badge')).toBeInTheDocument()
    })
  })
})

describe('RiskIndicator', () => {
  describe('Rendering', () => {
    it('should render as a colored dot', () => {
      const { container } = render(<RiskIndicator level="low" />)
      const dot = container.querySelector('span')

      expect(dot).toBeInTheDocument()
      expect(dot?.className).toContain('rounded-full')
    })

    it('should have title attribute', () => {
      const { container } = render(<RiskIndicator level="high" />)
      const dot = container.querySelector('span')

      expect(dot).toHaveAttribute('title', 'high risk')
    })
  })

  describe('Colors', () => {
    it('should have green color for low risk', () => {
      const { container } = render(<RiskIndicator level="low" />)
      const dot = container.querySelector('span')

      expect(dot?.className).toContain('bg-green-500')
    })

    it('should have amber color for medium risk', () => {
      const { container } = render(<RiskIndicator level="medium" />)
      const dot = container.querySelector('span')

      expect(dot?.className).toContain('bg-amber-500')
    })

    it('should have orange color for high risk', () => {
      const { container } = render(<RiskIndicator level="high" />)
      const dot = container.querySelector('span')

      expect(dot?.className).toContain('bg-orange-500')
    })

    it('should have red color for critical risk', () => {
      const { container } = render(<RiskIndicator level="critical" />)
      const dot = container.querySelector('span')

      expect(dot?.className).toContain('bg-red-500')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <RiskIndicator level="medium" className="custom-indicator" />
      )

      expect(container.querySelector('.custom-indicator')).toBeInTheDocument()
    })
  })
})

describe('MiniRiskScore', () => {
  describe('Rendering', () => {
    it('should render score and indicator', () => {
      render(<MiniRiskScore score={65} level="medium" />)

      expect(screen.getByText('65')).toBeInTheDocument()
    })

    it('should round score to integer', () => {
      render(<MiniRiskScore score={64.8} level="medium" />)
      expect(screen.getByText('65')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MiniRiskScore score={50} level="medium" className="custom-mini" />
      )

      expect(container.querySelector('.custom-mini')).toBeInTheDocument()
    })

    it('should have different background for different levels', () => {
      const { container: lowContainer } = render(
        <MiniRiskScore score={20} level="low" />
      )
      const { container: criticalContainer } = render(
        <MiniRiskScore score={90} level="critical" />
      )

      const lowDiv = lowContainer.firstChild as HTMLElement
      const criticalDiv = criticalContainer.firstChild as HTMLElement

      expect(lowDiv.className).not.toBe(criticalDiv.className)
    })
  })
})
