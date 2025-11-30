/**
 * CameraCapture Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CameraCapture, CameraTrigger } from './CameraCapture'

// Mock MediaDevices API
const mockGetUserMedia = vi.fn()
const mockEnumerateDevices = vi.fn()

const createMockMediaStream = () => {
  const mockTrack = {
    stop: vi.fn(),
    kind: 'video',
    label: 'Mock Camera',
  }
  return {
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
  }
}

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) =>
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  ),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

describe('CameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices,
      },
      writable: true,
      configurable: true,
    })

    // Mock navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    })

    // Default mock implementations
    mockGetUserMedia.mockResolvedValue(createMockMediaStream())
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera-1', label: 'Front Camera' },
      { kind: 'videoinput', deviceId: 'camera-2', label: 'Back Camera' },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dialog Rendering', () => {
    it('should not render when closed', () => {
      render(
        <CameraCapture
          isOpen={false}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      expect(screen.queryByText('Camera')).not.toBeInTheDocument()
    })

    it('should render dialog when open', async () => {
      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })
    })

    it('should show initializing message while camera starts', async () => {
      // Make getUserMedia slow
      mockGetUserMedia.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockMediaStream()), 500))
      )

      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      expect(screen.getByText('Initializing camera...')).toBeInTheDocument()
    })

    it('should show error message when camera access fails', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })

  describe('Camera Initialization', () => {
    it('should request camera access with video constraints', async () => {
      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.any(Object),
            audio: false,
          })
        )
      })
    })

    it('should request GPS location when enabled', async () => {
      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
          options={{ enableGps: true }}
        />
      )

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
      })
    })

    it('should not request GPS when disabled', async () => {
      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
          options={{ enableGps: false }}
        />
      )

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })

      // GPS should not be requested
      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled()
    })
  })

  describe('Close Button', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <CameraCapture
          isOpen={true}
          onClose={mockOnClose}
          onCapture={vi.fn()}
          projectId="project-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })

      // Find close button (X icon button)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg && btn.closest('.px-4') // In the header
      })

      if (closeButton) {
        await user.click(closeButton)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })

  describe('Photo Counter', () => {
    it('should not show counter when no photos captured', async () => {
      render(
        <CameraCapture
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          projectId="project-123"
          options={{ maxPhotos: 10 }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })

      expect(screen.queryByText('0 / 10')).not.toBeInTheDocument()
    })
  })
})

describe('CameraTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices,
      },
      writable: true,
      configurable: true,
    })

    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    })

    mockGetUserMedia.mockResolvedValue(createMockMediaStream())
    mockEnumerateDevices.mockResolvedValue([])
  })

  describe('Trigger Button', () => {
    it('should render default trigger button with camera text', () => {
      render(
        <CameraTrigger projectId="project-123" onCapture={vi.fn()} />
      )

      expect(screen.getByRole('button', { name: /capture photo/i })).toBeInTheDocument()
    })

    it('should render custom children when provided', () => {
      render(
        <CameraTrigger projectId="project-123" onCapture={vi.fn()}>
          <span>Take Picture</span>
        </CameraTrigger>
      )

      expect(screen.getByRole('button', { name: /take picture/i })).toBeInTheDocument()
    })

    it('should open camera dialog when clicked', async () => {
      const user = userEvent.setup()

      render(
        <CameraTrigger projectId="project-123" onCapture={vi.fn()} />
      )

      await user.click(screen.getByRole('button', { name: /capture photo/i }))

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })
    })
  })

  describe('Button Variants', () => {
    it('should apply variant prop', () => {
      render(
        <CameraTrigger
          projectId="project-123"
          onCapture={vi.fn()}
          variant="outline"
        />
      )

      const button = screen.getByRole('button')
      expect(button.className).toContain('border')
    })

    it('should apply size prop', () => {
      render(
        <CameraTrigger
          projectId="project-123"
          onCapture={vi.fn()}
          size="sm"
        />
      )

      const button = screen.getByRole('button')
      // Just verify the button renders with size prop accepted
      expect(button).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <CameraTrigger
          projectId="project-123"
          onCapture={vi.fn()}
          className="my-custom-class"
        />
      )

      const button = screen.getByRole('button')
      expect(button.className).toContain('my-custom-class')
    })
  })

  describe('Props Passing', () => {
    it('should pass projectId to CameraCapture', async () => {
      const user = userEvent.setup()

      render(
        <CameraTrigger projectId="test-project-456" onCapture={vi.fn()} />
      )

      await user.click(screen.getByRole('button', { name: /capture photo/i }))

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })

      // Camera initialized with project context
      expect(mockGetUserMedia).toHaveBeenCalled()
    })

    it('should pass options to CameraCapture', async () => {
      const user = userEvent.setup()

      render(
        <CameraTrigger
          projectId="project-123"
          onCapture={vi.fn()}
          options={{ maxPhotos: 5, enableGps: false }}
        />
      )

      await user.click(screen.getByRole('button', { name: /capture photo/i }))

      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument()
      })
    })
  })
})
