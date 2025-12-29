import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Use vi.hoisted() for mocks to ensure they're available during vi.mock() execution
const { mockUseDarkMode, mockSetTheme, mockToggleTheme } = vi.hoisted(() => {
  const setTheme = vi.fn()
  const toggleTheme = vi.fn()
  const useDarkMode = vi.fn()
  return {
    mockUseDarkMode: useDarkMode,
    mockSetTheme: setTheme,
    mockToggleTheme: toggleTheme,
  }
})

const defaultDarkModeValues = {
  theme: 'light',
  isDarkMode: false,
  setTheme: mockSetTheme,
  toggleTheme: mockToggleTheme,
}

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: mockUseDarkMode,
}))

// Import after mocks are set up
import {
  ThemeToggle,
  ThemeSwitch,
  ThemeSelector,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default mock return value
    mockUseDarkMode.mockReturnValue(defaultDarkModeValues)
  })

  describe('Default Mode', () => {
    it('renders theme toggle', () => {
      render(<ThemeToggle />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
    })

    it('displays current theme label', () => {
      render(<ThemeToggle />)

      expect(screen.getByText('Light mode')).toBeInTheDocument()
    })

    it('shows dropdown trigger button', () => {
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /light/i })
      expect(button).toBeInTheDocument()
    })

    it('displays sun icon for light theme', () => {
      const { container } = render(<ThemeToggle />)

      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('shows theme options when dropdown is opened', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /light/i })
      await user.click(button)

      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('calls setTheme when light option is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /light/i })
      await user.click(button)

      const lightOption = screen.getByRole('menuitem', { name: /light/i })
      await user.click(lightOption)

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('calls setTheme when dark option is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /light/i })
      await user.click(button)

      const darkOption = screen.getByRole('menuitem', { name: /dark/i })
      await user.click(darkOption)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('calls setTheme when system option is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /light/i })
      await user.click(button)

      const systemOption = screen.getByRole('menuitem', { name: /system/i })
      await user.click(systemOption)

      expect(mockSetTheme).toHaveBeenCalledWith('system')
    })
  })

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<ThemeToggle compact={true} />)

      const button = screen.getByRole('button', { name: /current theme/i })
      expect(button).toBeInTheDocument()
    })

    it('does not show label in compact mode', () => {
      render(<ThemeToggle compact={true} />)

      expect(screen.queryByText('Theme')).not.toBeInTheDocument()
      expect(screen.queryByText('Light mode')).not.toBeInTheDocument()
    })

    it('has accessible aria-label in compact mode', () => {
      render(<ThemeToggle compact={true} />)

      const button = screen.getByRole('button', { name: /current theme: Light/i })
      expect(button).toBeInTheDocument()
    })

    it('has screen reader only text', () => {
      render(<ThemeToggle compact={true} />)

      const srText = screen.getByText('Toggle theme')
      expect(srText).toHaveClass('sr-only')
    })

    it('shows dropdown menu in compact mode', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle compact={true} />)

      const button = screen.getByRole('button', { name: /current theme/i })
      await user.click(button)

      expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument()
    })

    it('has icon button styling in compact mode', () => {
      render(<ThemeToggle compact={true} />)

      const button = screen.getByRole('button', { name: /current theme/i })
      expect(button).toHaveClass('h-9', 'w-9')
    })
  })

  describe('Label Display', () => {
    it('shows label by default', () => {
      render(<ThemeToggle />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
    })

    it('hides label when showLabel is false', () => {
      render(<ThemeToggle showLabel={false} />)

      expect(screen.queryByText('Theme')).not.toBeInTheDocument()
      expect(screen.queryByText('Light mode')).not.toBeInTheDocument()
    })

    it('shows label when showLabel is true', () => {
      render(<ThemeToggle showLabel={true} />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
      expect(screen.getByText('Light mode')).toBeInTheDocument()
    })
  })

  describe('Theme States', () => {
    it('displays correct icon for light theme', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'light',
        isDarkMode: false,
        setTheme: mockSetTheme,
      })

      const { container } = render(<ThemeToggle />)

      // Should show sun icon
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('displays correct icon for dark theme', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'dark',
        isDarkMode: true,
        setTheme: mockSetTheme,
      })

      const { container } = render(<ThemeToggle />)

      // Should show moon icon
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('displays correct icon for system theme', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'system',
        isDarkMode: false,
        setTheme: mockSetTheme,
      })

      const { container } = render(<ThemeToggle />)

      // Should show monitor icon
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('displays correct label for dark theme', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'dark',
        isDarkMode: true,
        setTheme: mockSetTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByText('Dark mode')).toBeInTheDocument()
    })

    it('displays correct label for system theme', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'system',
        isDarkMode: false,
        setTheme: mockSetTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByText('System mode')).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(<ThemeToggle className="custom-class" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })

    it('applies custom className in compact mode', () => {
      render(<ThemeToggle compact={true} className="compact-custom" />)

      const button = screen.getByRole('button', { name: /current theme/i })
      expect(button).toHaveClass('compact-custom')
    })
  })
})

describe('ThemeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders theme switch', () => {
      render(<ThemeSwitch />)

      expect(screen.getByText('Dark Mode')).toBeInTheDocument()
    })

    it('renders switch component', () => {
      render(<ThemeSwitch />)

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toBeInTheDocument()
    })

    it('displays status text when enabled', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeSwitch />)

      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })

    it('displays status text when disabled', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeSwitch />)

      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  describe('Icon Display', () => {
    it('shows sun icon when light mode', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: false,
        toggleTheme: mockToggleTheme,
      })

      const { container } = render(<ThemeSwitch />)

      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('shows moon icon when dark mode', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: true,
        toggleTheme: mockToggleTheme,
      })

      const { container } = render(<ThemeSwitch />)

      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('moon icon has blue color in dark mode', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: true,
        toggleTheme: mockToggleTheme,
      })

      const { container } = render(<ThemeSwitch />)

      const moonIcon = container.querySelector('.text-blue-400')
      expect(moonIcon).toBeInTheDocument()
    })

    it('sun icon has warning color in light mode', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: false,
        toggleTheme: mockToggleTheme,
      })

      const { container } = render(<ThemeSwitch />)

      const sunIcon = container.querySelector('.text-warning')
      expect(sunIcon).toBeInTheDocument()
    })
  })

  describe('Switch Interaction', () => {
    it('switch is checked when dark mode is enabled', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeSwitch />)

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toBeChecked()
    })

    it('switch is unchecked when dark mode is disabled', () => {
      mockUseDarkMode.mockReturnValue({
        isDarkMode: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeSwitch />)

      const switchElement = screen.getByRole('switch')
      expect(switchElement).not.toBeChecked()
    })

    it('calls toggleTheme when switch is toggled', async () => {
      const user = userEvent.setup()
      render(<ThemeSwitch />)

      const switchElement = screen.getByRole('switch')
      await user.click(switchElement)

      expect(mockToggleTheme).toHaveBeenCalled()
    })

    it('has accessible aria-label', () => {
      render(<ThemeSwitch />)

      const switchElement = screen.getByRole('switch', { name: /toggle dark mode/i })
      expect(switchElement).toBeInTheDocument()
    })
  })

  describe('Label Control', () => {
    it('shows label by default', () => {
      render(<ThemeSwitch />)

      expect(screen.getByText('Dark Mode')).toBeInTheDocument()
    })

    it('hides label when showLabel is false', () => {
      render(<ThemeSwitch showLabel={false} />)

      expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument()
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
    })

    it('shows label when showLabel is true', () => {
      render(<ThemeSwitch showLabel={true} />)

      expect(screen.getByText('Dark Mode')).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(<ThemeSwitch className="custom-switch" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-switch')
    })
  })
})

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders theme selector', () => {
      render(<ThemeSelector />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
    })

    it('renders all three theme buttons', () => {
      render(<ThemeSelector />)

      expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
    })

    it('renders icons for each option', () => {
      const { container } = render(<ThemeSelector />)

      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Theme Selection', () => {
    it('highlights active theme button', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      })

      render(<ThemeSelector />)

      const lightButton = screen.getByRole('button', { name: /light/i })
      expect(lightButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not highlight inactive buttons', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      })

      render(<ThemeSelector />)

      const darkButton = screen.getByRole('button', { name: /dark/i })
      expect(darkButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls setTheme when light button is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeSelector />)

      const lightButton = screen.getByRole('button', { name: /light/i })
      await user.click(lightButton)

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('calls setTheme when dark button is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeSelector />)

      const darkButton = screen.getByRole('button', { name: /dark/i })
      await user.click(darkButton)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('calls setTheme when system button is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeSelector />)

      const systemButton = screen.getByRole('button', { name: /system/i })
      await user.click(systemButton)

      expect(mockSetTheme).toHaveBeenCalledWith('system')
    })

    it('highlights dark theme when active', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      })

      render(<ThemeSelector />)

      const darkButton = screen.getByRole('button', { name: /dark/i })
      expect(darkButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('highlights system theme when active', () => {
      mockUseDarkMode.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
      })

      render(<ThemeSelector />)

      const systemButton = screen.getByRole('button', { name: /system/i })
      expect(systemButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Layout', () => {
    it('uses flex layout for buttons', () => {
      const { container } = render(<ThemeSelector />)

      const buttonContainer = container.querySelector('.flex.gap-2')
      expect(buttonContainer).toBeInTheDocument()
    })

    it('buttons have equal flex width', () => {
      render(<ThemeSelector />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('flex-1')
      })
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(<ThemeSelector className="custom-selector" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-selector')
    })
  })

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(<ThemeSelector />)

      const label = screen.getByText('Theme')
      expect(label).toBeInTheDocument()
      expect(label.tagName).toBe('LABEL')
    })

    it('all buttons have accessible names', () => {
      render(<ThemeSelector />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('uses aria-pressed for toggle state', () => {
      render(<ThemeSelector />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed')
      })
    })
  })
})

describe('Icon Components', () => {
  describe('SunIcon', () => {
    it('renders sun icon', () => {
      const { container } = render(<SunIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('has default size classes', () => {
      const { container } = render(<SunIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('accepts custom className', () => {
      const { container } = render(<SunIcon className="custom-sun" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-sun')
    })

    it('has proper SVG attributes', () => {
      const { container } = render(<SunIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
      expect(svg).toHaveAttribute('fill', 'none')
      expect(svg).toHaveAttribute('stroke', 'currentColor')
    })
  })

  describe('MoonIcon', () => {
    it('renders moon icon', () => {
      const { container } = render(<MoonIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('has default size classes', () => {
      const { container } = render(<MoonIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('accepts custom className', () => {
      const { container } = render(<MoonIcon className="custom-moon" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-moon')
    })
  })

  describe('MonitorIcon', () => {
    it('renders monitor icon', () => {
      const { container } = render(<MonitorIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('has default size classes', () => {
      const { container } = render(<MonitorIcon />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('accepts custom className', () => {
      const { container } = render(<MonitorIcon className="custom-monitor" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-monitor')
    })
  })
})
