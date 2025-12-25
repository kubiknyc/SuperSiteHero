import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingScreen, LoadingSpinner, LoadingOverlay, ButtonLoader } from '../LoadingScreen'

// Mock Logo component
vi.mock('@/components/brand/Logo', () => ({
  LogoIcon: ({ className }: { className?: string }) => (
    <div data-testid="logo-icon" className={className}>
      JobSight Logo
    </div>
  ),
}))

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the loading screen', () => {
      const { container } = render(<LoadingScreen />)

      const loadingScreen = container.firstChild
      expect(loadingScreen).toBeInTheDocument()
    })

    it('renders with default message', () => {
      render(<LoadingScreen />)

      expect(screen.getByText('Loading JobSight...')).toBeInTheDocument()
    })

    it('renders with custom message', () => {
      render(<LoadingScreen message="Please wait..." />)

      expect(screen.getByText('Please wait...')).toBeInTheDocument()
    })

    it('does not render message when empty string provided', () => {
      render(<LoadingScreen message="" />)

      expect(screen.queryByText('Loading JobSight...')).not.toBeInTheDocument()
    })

    it('renders the logo icon', () => {
      render(<LoadingScreen />)

      expect(screen.getByTestId('logo-icon')).toBeInTheDocument()
    })

    it('renders tagline', () => {
      render(<LoadingScreen />)

      expect(screen.getByText('Construction Field Management')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('is full screen with fixed positioning', () => {
      const { container } = render(<LoadingScreen />)

      const loadingScreen = container.firstChild as HTMLElement
      expect(loadingScreen).toHaveClass('fixed', 'inset-0')
    })

    it('uses flexbox for centering', () => {
      const { container } = render(<LoadingScreen />)

      const loadingScreen = container.firstChild as HTMLElement
      expect(loadingScreen).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })

    it('has gradient background', () => {
      const { container } = render(<LoadingScreen />)

      const loadingScreen = container.firstChild as HTMLElement
      expect(loadingScreen).toHaveClass('bg-gradient-to-br', 'from-gray-900', 'via-gray-800', 'to-gray-900')
    })

    it('accepts custom className', () => {
      const { container } = render(<LoadingScreen className="custom-class" />)

      const loadingScreen = container.firstChild as HTMLElement
      expect(loadingScreen).toHaveClass('custom-class')
    })

    it('has animated background grid', () => {
      const { container } = render(<LoadingScreen />)

      const grid = container.querySelector('.absolute.inset-0.opacity-10')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Logo Presentation', () => {
    it('renders logo with correct size', () => {
      render(<LoadingScreen />)

      const logo = screen.getByTestId('logo-icon')
      expect(logo).toHaveClass('w-24', 'h-24')
    })

    it('logo has drop shadow', () => {
      render(<LoadingScreen />)

      const logo = screen.getByTestId('logo-icon')
      expect(logo).toHaveClass('drop-shadow-2xl')
    })

    it('logo has glow effect containers', () => {
      const { container } = render(<LoadingScreen />)

      // Should have multiple glow rings
      const glowRings = container.querySelectorAll('[class*="blur-"]')
      expect(glowRings.length).toBeGreaterThan(0)
    })

    it('logo has gradient background container', () => {
      const { container } = render(<LoadingScreen />)

      const logoContainer = container.querySelector('.bg-gradient-to-br.from-primary')
      expect(logoContainer).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('renders progress bar', () => {
      const { container } = render(<LoadingScreen />)

      const progressBar = container.querySelector('.w-64.h-1.bg-gray-700')
      expect(progressBar).toBeInTheDocument()
    })

    it('progress bar has gradient fill', () => {
      const { container } = render(<LoadingScreen />)

      const progressFill = container.querySelector('.bg-gradient-to-r.from-primary.to-primary-500')
      expect(progressFill).toBeInTheDocument()
    })

    it('progress bar is rounded', () => {
      const { container } = render(<LoadingScreen />)

      const progressBar = container.querySelector('.w-64.h-1')
      expect(progressBar).toHaveClass('rounded-full', 'overflow-hidden')
    })
  })

  describe('Status Dots', () => {
    it('renders three status dots', () => {
      const { container } = render(<LoadingScreen />)

      const dots = container.querySelectorAll('.w-2.h-2.bg-primary.rounded-full')
      expect(dots.length).toBe(3)
    })

    it('dots have staggered animation delays', () => {
      const { container } = render(<LoadingScreen />)

      const dots = container.querySelectorAll('.w-2.h-2.bg-primary.rounded-full')
      dots.forEach((dot, index) => {
        const style = (dot as HTMLElement).style.animationDelay
        expect(style).toBe(`${index * 0.2}s`)
      })
    })
  })

  describe('Animations', () => {
    it('includes inline animation styles', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement).toBeInTheDocument()
    })

    it('has gridSlide animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes gridSlide')
    })

    it('has pulseGlow animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes pulseGlow')
    })

    it('has construct animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes construct')
    })

    it('has progressSlide animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes progressSlide')
    })

    it('has fadeInUp animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes fadeInUp')
    })

    it('has bounce animation keyframes', () => {
      const { container } = render(<LoadingScreen />)

      const styleElement = container.querySelector('style')
      expect(styleElement?.textContent).toContain('@keyframes bounce')
    })
  })

  describe('Dark Mode Support', () => {
    it('has dark mode gradient colors for logo', () => {
      const { container } = render(<LoadingScreen />)

      const logoContainer = container.querySelector('.dark\\:from-primary')
      expect(logoContainer).toBeInTheDocument()
    })

    it('has dark mode colors for progress bar', () => {
      const { container } = render(<LoadingScreen />)

      const progressFill = container.querySelector('.dark\\:from-primary')
      expect(progressFill).toBeInTheDocument()
    })

    it('has dark mode colors for status dots', () => {
      const { container } = render(<LoadingScreen />)

      const dots = container.querySelectorAll('.dark\\:bg-primary')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  describe('Text Content', () => {
    it('message has uppercase styling', () => {
      render(<LoadingScreen message="Test Message" />)

      const message = screen.getByText('Test Message')
      expect(message).toHaveClass('uppercase')
    })

    it('message has semibold font', () => {
      render(<LoadingScreen message="Test Message" />)

      const message = screen.getByText('Test Message')
      expect(message).toHaveClass('font-semibold')
    })

    it('tagline has tracking', () => {
      render(<LoadingScreen />)

      const tagline = screen.getByText('Construction Field Management')
      expect(tagline).toHaveClass('tracking-[0.2em]')
    })

    it('tagline has disabled text color', () => {
      render(<LoadingScreen />)

      const tagline = screen.getByText('Construction Field Management')
      expect(tagline).toHaveClass('text-disabled')
    })
  })
})

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders spinner', () => {
      const { container } = render(<LoadingSpinner />)

      const spinner = container.querySelector('svg')
      expect(spinner).toBeInTheDocument()
    })

    it('has spin animation', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })

    it('has primary color', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-primary')
    })

    it('has dark mode color', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('dark:text-primary-400')
    })
  })

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('w-4', 'h-4')
    })

    it('renders medium size by default', () => {
      const { container } = render(<LoadingSpinner />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('w-6', 'h-6')
    })

    it('renders large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('w-10', 'h-10')
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-spinner" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-spinner')
    })

    it('combines size and custom classes', () => {
      const { container } = render(<LoadingSpinner size="lg" className="my-custom-class" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('w-10', 'h-10', 'my-custom-class')
    })
  })

  describe('SVG Structure', () => {
    it('has circle element for background', () => {
      const { container } = render(<LoadingSpinner />)

      const circle = container.querySelector('circle')
      expect(circle).toBeInTheDocument()
      expect(circle).toHaveAttribute('cx', '12')
      expect(circle).toHaveAttribute('cy', '12')
      expect(circle).toHaveAttribute('r', '10')
    })

    it('has path element for spinner arc', () => {
      const { container } = render(<LoadingSpinner />)

      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
    })

    it('circle has opacity styling', () => {
      const { container } = render(<LoadingSpinner />)

      const circle = container.querySelector('circle')
      expect(circle).toHaveClass('opacity-25')
    })

    it('path has opacity styling', () => {
      const { container } = render(<LoadingSpinner />)

      const path = container.querySelector('path')
      expect(path).toHaveClass('opacity-75')
    })
  })
})

describe('LoadingOverlay', () => {
  describe('Visibility Control', () => {
    it('renders when show is true', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild
      expect(overlay).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      const { container } = render(<LoadingOverlay show={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('toggles visibility based on show prop', () => {
      const { container, rerender } = render(<LoadingOverlay show={true} />)

      expect(container.firstChild).toBeInTheDocument()

      rerender(<LoadingOverlay show={false} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Layout and Styling', () => {
    it('is full screen with fixed positioning', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('fixed', 'inset-0')
    })

    it('has backdrop blur effect', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('backdrop-blur-md')
    })

    it('has semi-transparent background', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('bg-black/60')
    })

    it('has high z-index for layering', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('z-50')
    })

    it('centers content', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('flex', 'items-center', 'justify-center')
    })
  })

  describe('Card Styling', () => {
    it('has glass morphism card', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const card = container.querySelector('.backdrop-blur-xl')
      expect(card).toBeInTheDocument()
    })

    it('card has rounded corners', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const card = container.querySelector('.rounded-2xl')
      expect(card).toBeInTheDocument()
    })

    it('card has border', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const card = container.querySelector('.border.border-white\\/20')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Content', () => {
    it('renders logo icon', () => {
      render(<LoadingOverlay show={true} />)

      expect(screen.getByTestId('logo-icon')).toBeInTheDocument()
    })

    it('logo has correct size', () => {
      render(<LoadingOverlay show={true} />)

      const logo = screen.getByTestId('logo-icon')
      expect(logo).toHaveClass('w-12', 'h-12')
    })

    it('renders loading spinner', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const spinner = container.querySelector('svg.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('renders message when provided', () => {
      render(<LoadingOverlay show={true} message="Processing..." />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('does not render message when not provided', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const message = container.querySelector('.text-secondary')
      expect(message).not.toBeInTheDocument()
    })

    it('message has correct styling', () => {
      render(<LoadingOverlay show={true} message="Test Message" />)

      const message = screen.getByText('Test Message')
      expect(message).toHaveClass('text-secondary', 'font-semibold', 'text-center')
    })
  })

  describe('Dark Mode Support', () => {
    it('has dark mode card background', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const card = container.querySelector('.dark\\:bg-background\\/90')
      expect(card).toBeInTheDocument()
    })

    it('has dark mode border color', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const card = container.querySelector('.dark\\:border-gray-700\\/50')
      expect(card).toBeInTheDocument()
    })

    it('message has dark mode text color', () => {
      render(<LoadingOverlay show={true} message="Test" />)

      const message = screen.getByText('Test')
      expect(message).toHaveClass('dark:text-gray-300')
    })
  })

  describe('Logo Glow Effect', () => {
    it('has glow effect container', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const glow = container.querySelector('.bg-primary.blur-xl')
      expect(glow).toBeInTheDocument()
    })

    it('logo has gradient background', () => {
      const { container } = render(<LoadingOverlay show={true} />)

      const logoContainer = container.querySelector('.bg-gradient-to-br.from-primary.to-primary-700')
      expect(logoContainer).toBeInTheDocument()
    })
  })
})

describe('ButtonLoader', () => {
  describe('Basic Rendering', () => {
    it('renders button loader', () => {
      const { container } = render(<ButtonLoader />)

      const loader = container.firstChild
      expect(loader).toBeInTheDocument()
    })

    it('uses inline-flex layout', () => {
      const { container } = render(<ButtonLoader />)

      const loader = container.firstChild as HTMLElement
      expect(loader).toHaveClass('inline-flex', 'items-center')
    })

    it('has gap between dots', () => {
      const { container } = render(<ButtonLoader />)

      const loader = container.firstChild as HTMLElement
      expect(loader).toHaveClass('gap-1')
    })
  })

  describe('Dots', () => {
    it('renders three dots', () => {
      const { container } = render(<ButtonLoader />)

      const dots = container.querySelectorAll('.w-1\\.5.h-1\\.5')
      expect(dots.length).toBe(3)
    })

    it('dots are circular', () => {
      const { container } = render(<ButtonLoader />)

      const dots = container.querySelectorAll('.rounded-full')
      expect(dots.length).toBe(3)
    })

    it('dots use current color', () => {
      const { container } = render(<ButtonLoader />)

      const dots = container.querySelectorAll('.bg-current')
      expect(dots.length).toBe(3)
    })

    it('dots have staggered animation delays', () => {
      const { container } = render(<ButtonLoader />)

      const dots = container.querySelectorAll('.w-1\\.5')
      dots.forEach((dot, index) => {
        const style = (dot as HTMLElement).style.animationDelay
        expect(style).toBe(`${index * 0.2}s`)
      })
    })

    it('dots have bounce animation', () => {
      const { container } = render(<ButtonLoader />)

      const dots = container.querySelectorAll('.w-1\\.5')
      dots.forEach((dot) => {
        const style = (dot as HTMLElement).style.animation
        expect(style).toContain('bounce')
      })
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(<ButtonLoader className="custom-loader" />)

      const loader = container.firstChild as HTMLElement
      expect(loader).toHaveClass('custom-loader')
    })

    it('combines default and custom classes', () => {
      const { container } = render(<ButtonLoader className="ml-2" />)

      const loader = container.firstChild as HTMLElement
      expect(loader).toHaveClass('inline-flex', 'items-center', 'gap-1', 'ml-2')
    })
  })

  describe('Integration', () => {
    it('can be used inline with text', () => {
      const { container } = render(
        <button>
          Loading <ButtonLoader />
        </button>
      )

      const button = container.querySelector('button')
      expect(button).toHaveTextContent('Loading')
      expect(button?.querySelector('.inline-flex')).toBeInTheDocument()
    })

    it('inherits text color when used in button', () => {
      const { container } = render(
        <button className="text-white">
          <ButtonLoader />
        </button>
      )

      const dots = container.querySelectorAll('.bg-current')
      expect(dots.length).toBe(3)
    })
  })
})

describe('Component Integration', () => {
  it('all components can be imported from the same module', () => {
    expect(LoadingScreen).toBeDefined()
    expect(LoadingSpinner).toBeDefined()
    expect(LoadingOverlay).toBeDefined()
    expect(ButtonLoader).toBeDefined()
  })

  it('LoadingOverlay uses LoadingSpinner internally', () => {
    const { container } = render(<LoadingOverlay show={true} />)

    // Should have spinner from LoadingSpinner component
    const spinner = container.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('all components share consistent branding', () => {
    const { container: screenContainer } = render(<LoadingScreen />)
    const { container: overlayContainer } = render(<LoadingOverlay show={true} />)

    // Both should use LogoIcon
    expect(screenContainer.querySelector('[data-testid="logo-icon"]')).toBeInTheDocument()
    expect(overlayContainer.querySelector('[data-testid="logo-icon"]')).toBeInTheDocument()
  })
})

describe('Edge Cases', () => {
  it('handles very long message in LoadingScreen', () => {
    const longMessage = 'This is a very long message that should still render properly in the loading screen component without breaking the layout'

    render(<LoadingScreen message={longMessage} />)

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })

  it('handles very long message in LoadingOverlay', () => {
    const longMessage = 'This is a very long message for the overlay component'

    render(<LoadingOverlay show={true} message={longMessage} />)

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })

  it('handles rapid show/hide toggling in LoadingOverlay', () => {
    const { container, rerender } = render(<LoadingOverlay show={true} />)

    expect(container.firstChild).toBeInTheDocument()

    rerender(<LoadingOverlay show={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<LoadingOverlay show={true} />)
    expect(container.firstChild).toBeInTheDocument()

    rerender(<LoadingOverlay show={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('handles undefined className gracefully', () => {
    const { container: screenContainer } = render(<LoadingScreen className={undefined} />)
    const { container: spinnerContainer } = render(<LoadingSpinner className={undefined} />)
    const { container: loaderContainer } = render(<ButtonLoader className={undefined} />)

    expect(screenContainer.firstChild).toBeInTheDocument()
    expect(spinnerContainer.firstChild).toBeInTheDocument()
    expect(loaderContainer.firstChild).toBeInTheDocument()
  })
})
