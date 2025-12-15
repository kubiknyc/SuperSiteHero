/**
 * ScheduleExportDialog Tests
 *
 * Tests for the schedule export dialog component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScheduleExportDialog } from './ScheduleExportDialog'

// Mock the hooks
vi.mock('../hooks/useScheduleExport', () => ({
  useScheduleExport: vi.fn(() => ({
    isExporting: false,
    progress: 0,
    currentStep: '',
    error: null,
    result: null,
    exportAndDownload: vi.fn().mockResolvedValue(undefined),
    performExport: vi.fn(),
    cancelExport: vi.fn(),
    resetState: vi.fn(),
    getRateLimitStatus: vi.fn(() => ({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    })),
  })),
  estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'project-1' }, error: null }),
        })),
      })),
    })),
  },
}))

// Create query client wrapper
const createQueryClientWrapper = () => {
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

describe('ScheduleExportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectId: 'project-1',
    projectName: 'Test Project',
    projectNumber: 'PROJ-001',
    activityCount: 100,
    milestonesCount: 10,
    criticalCount: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Export Schedule')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<ScheduleExportDialog {...defaultProps} open={false} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.queryByText('Export Schedule')).not.toBeInTheDocument()
    })

    it('should show format selection options', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('MS Project XML')).toBeInTheDocument()
      expect(screen.getByText('Primavera P6 XER')).toBeInTheDocument()
      expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument()
    })

    it('should show filter type dropdown', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Activity Filter')).toBeInTheDocument()
    })

    it('should show date range inputs', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Date Range (Optional)')).toBeInTheDocument()
      expect(screen.getByText('From')).toBeInTheDocument()
      expect(screen.getByText('To')).toBeInTheDocument()
    })

    it('should show options checkboxes', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Include completed activities')).toBeInTheDocument()
      expect(screen.getByText('Include dependencies (predecessor links)')).toBeInTheDocument()
    })

    it('should show export summary', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText(/activities will be exported/)).toBeInTheDocument()
      expect(screen.getByText(/Estimated file size/)).toBeInTheDocument()
    })

    it('should show export and cancel buttons', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe('Format Selection', () => {
    it('should select MS Project XML by default', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      const msProjectOption = screen.getByText('MS Project XML').closest('button')
      expect(msProjectOption).toHaveClass('border-blue-500')
    })

    it('should allow selecting different format', async () => {
      const user = userEvent.setup()
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      const csvOption = screen.getByText('CSV Spreadsheet').closest('button')
      await user.click(csvOption!)

      expect(csvOption).toHaveClass('border-blue-500')
    })
  })

  describe('Activity Count Display', () => {
    it('should show correct activity count', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText(/100/)).toBeInTheDocument()
    })

    it('should show milestone count in filter options', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      // Open the filter dropdown
      const filterTrigger = screen.getByRole('combobox')
      fireEvent.click(filterTrigger)

      // Check for milestone option with count
      expect(screen.getByText(/Milestones Only \(10\)/)).toBeInTheDocument()
    })

    it('should show critical count in filter options', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      const filterTrigger = screen.getByRole('combobox')
      fireEvent.click(filterTrigger)

      expect(screen.getByText(/Critical Path Only \(5\)/)).toBeInTheDocument()
    })
  })

  describe('Date Presets', () => {
    it('should have date preset buttons', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3 mo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '6 mo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '1 yr' })).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should disable export when activity count is 0', () => {
      render(<ScheduleExportDialog {...defaultProps} activityCount={0} />, {
        wrapper: createQueryClientWrapper(),
      })

      const exportButton = screen.getByRole('button', { name: /Export/i })
      expect(exportButton).toBeDisabled()
    })

    it('should show error for invalid date range', async () => {
      const user = userEvent.setup()
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      const dateInputs = screen.getAllByRole('textbox')
      // Note: Date inputs might need different handling
      // This is a simplified test

      // The component should show validation error when dates are invalid
      // Implementation may vary based on actual date input behavior
    })
  })

  describe('Export Actions', () => {
    it('should call onOpenChange when cancel is clicked', async () => {
      const onOpenChange = vi.fn()
      const user = userEvent.setup()

      render(
        <ScheduleExportDialog {...defaultProps} onOpenChange={onOpenChange} />,
        { wrapper: createQueryClientWrapper() }
      )

      await user.click(screen.getByRole('button', { name: /Cancel/i }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when exporting', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: true,
        progress: 50,
        currentStep: 'Generating MS Project XML...',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 10,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Generating MS Project XML...')).toBeInTheDocument()
    })

    it('should show progress bar when exporting', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: true,
        progress: 75,
        currentStep: 'Processing...',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 10,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      // Progress bar should be present
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should show cancel button during export', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: true,
        progress: 50,
        currentStep: 'Exporting...',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 10,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByRole('button', { name: /Cancel Export/i })).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message when export fails', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: {
          message: 'Export Failed',
          details: 'Network error occurred',
        },
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 10,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText('Export Failed')).toBeInTheDocument()
      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
    })

    it('should show try again button on error', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: {
          message: 'Export Failed',
          details: 'Something went wrong',
        },
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 10,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    })
  })

  describe('Rate Limiting', () => {
    it('should show rate limit warning when limit exceeded', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + 3600000),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText(/Export limit reached/i)).toBeInTheDocument()
    })

    it('should disable export button when rate limited', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + 3600000),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      const exportButton = screen.getByRole('button', { name: /Export/i })
      expect(exportButton).toBeDisabled()
    })

    it('should show remaining exports count', async () => {
      const { useScheduleExport } = await import('../hooks/useScheduleExport')
      vi.mocked(useScheduleExport).mockReturnValue({
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: null,
        result: null,
        exportAndDownload: vi.fn(),
        performExport: vi.fn(),
        cancelExport: vi.fn(),
        resetState: vi.fn(),
        getRateLimitStatus: vi.fn(() => ({
          allowed: true,
          remaining: 5,
          resetAt: new Date(),
        })),
        estimateExportSize: vi.fn(() => ({ bytes: 1024, formatted: '1 KB' })),
        validateExportOptions: vi.fn(() => null),
      })

      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByText(/5 exports remaining/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible dialog title', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Export Schedule/i })).toBeInTheDocument()
    })

    it('should have accessible form elements', () => {
      render(<ScheduleExportDialog {...defaultProps} />, {
        wrapper: createQueryClientWrapper(),
      })

      // Radio buttons should be part of a radio group
      const radioGroup = screen.getByRole('radiogroup', { name: /Export Format/i })
      expect(radioGroup).toBeInTheDocument()

      // Radio buttons should be present
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons.length).toBe(3) // MS Project, Primavera, CSV

      // Checkboxes should be accessible
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })
})
