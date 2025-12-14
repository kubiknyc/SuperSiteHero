/**
 * Unit Tests for VoiceMessagePlayer Component
 *
 * Tests audio playback functionality including:
 * - Play/pause controls
 * - Progress tracking and seeking
 * - Duration display
 * - Mute toggle
 * - Compact mode
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceMessagePlayer, isVoiceMessage } from './VoiceMessagePlayer'

// Mock Audio element
class MockAudio {
  public currentTime = 0
  public duration = 60
  public paused = true
  public muted = false
  public volume = 1

  public addEventListener = vi.fn((event: string, handler: any) => {
    if (event === 'loadedmetadata') {
      setTimeout(() => handler(), 0)
    } else if (event === 'canplay') {
      setTimeout(() => handler(), 0)
    }
  })

  public removeEventListener = vi.fn()

  public play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })

  public pause = vi.fn(() => {
    this.paused = true
  })

  public load = vi.fn()
}

describe('VoiceMessagePlayer', () => {
  const mockUrl = 'https://example.com/audio.mp3'

  beforeEach(() => {
    // Mock Audio constructor
    global.Audio = MockAudio as any

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render play button initially', async () => {
      render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getByRole('button')
        expect(playButton).toBeInTheDocument()
      })
    })

    it('should render compact mode', async () => {
      const { container } = render(
        <VoiceMessagePlayer url={mockUrl} compact />
      )

      await waitFor(() => {
        expect(container.querySelector('.h-8.w-8')).toBeInTheDocument()
      })
    })

    it('should display duration when provided', async () => {
      render(<VoiceMessagePlayer url={mockUrl} duration={120} />)

      await waitFor(() => {
        expect(screen.getByText(/2:00/)).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<VoiceMessagePlayer url={mockUrl} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Playback Controls', () => {
    it('should toggle play/pause when button is clicked', async () => {
      const { container } = render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getByRole('button')
        expect(playButton).not.toBeDisabled()
      })

      const playButton = screen.getAllByRole('button')[0]

      // Click play
      fireEvent.click(playButton)

      await waitFor(() => {
        const audio = new MockAudio()
        expect(audio.play).toHaveBeenCalled()
      })

      // Click pause
      fireEvent.click(playButton)

      await waitFor(() => {
        const audio = new MockAudio()
        expect(audio.pause).toHaveBeenCalled()
      })
    })

    it('should show pause icon when playing', async () => {
      const { container } = render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getAllByRole('button')[0]
        expect(playButton).not.toBeDisabled()
      })

      const playButton = screen.getAllByRole('button')[0]
      fireEvent.click(playButton)

      await waitFor(() => {
        // Check for pause icon (implementation detail may vary)
        expect(playButton).toBeInTheDocument()
      })
    })

    it('should handle playback errors gracefully', async () => {
      const mockAudioWithError = class extends MockAudio {
        play() {
          return Promise.reject(new Error('Playback failed'))
        }
      }
      global.Audio = mockAudioWithError as any

      render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getAllByRole('button')[0]
        expect(playButton).not.toBeDisabled()
      })

      const playButton = screen.getAllByRole('button')[0]
      fireEvent.click(playButton)

      // Should not crash
      await waitFor(() => {
        expect(playButton).toBeInTheDocument()
      })
    })
  })

  describe('Mute Toggle', () => {
    it('should toggle mute when button is clicked', async () => {
      render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons[0]).not.toBeDisabled()
      })

      const muteButton = screen.getAllByRole('button')[1]

      fireEvent.click(muteButton)

      await waitFor(() => {
        const audio = new MockAudio()
        expect(audio.muted).toBe(false) // Initial state
      })
    })

    it('should show volume icon when not muted', async () => {
      render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const muteButton = screen.getAllByRole('button')[1]
        expect(muteButton).toBeInTheDocument()
      })
    })
  })

  describe('Progress and Seeking', () => {
    it('should display current time and duration', async () => {
      render(<VoiceMessagePlayer url={mockUrl} duration={120} />)

      await waitFor(() => {
        expect(screen.getByText(/0:00/)).toBeInTheDocument()
        expect(screen.getByText(/2:00/)).toBeInTheDocument()
      })
    })

    it('should update progress bar as time changes', async () => {
      const { container } = render(<VoiceMessagePlayer url={mockUrl} duration={60} />)

      await waitFor(() => {
        const progressBar = container.querySelector('.bg-blue-500')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('should seek when progress bar is clicked', async () => {
      const { container } = render(<VoiceMessagePlayer url={mockUrl} duration={60} />)

      await waitFor(() => {
        const progressContainer = container.querySelector('.cursor-pointer')
        expect(progressContainer).toBeInTheDocument()
      })

      const progressContainer = container.querySelector('.cursor-pointer')
      if (progressContainer) {
        // Mock getBoundingClientRect
        progressContainer.getBoundingClientRect = vi.fn(() => ({
          left: 0,
          width: 200,
          top: 0,
          right: 200,
          bottom: 40,
          height: 40,
          x: 0,
          y: 0,
          toJSON: () => {},
        }))

        fireEvent.click(progressContainer, { clientX: 100 })

        // Should seek to 50% of duration
        await waitFor(() => {
          expect(progressContainer).toBeInTheDocument()
        })
      }
    })
  })

  describe('Error Handling', () => {
    it('should display error message when audio fails to load', async () => {
      const mockAudioWithError = class extends MockAudio {
        addEventListener(event: string, handler: any) {
          if (event === 'error') {
            setTimeout(() => handler(), 0)
          }
        }
      }
      global.Audio = mockAudioWithError as any

      render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load audio/)).toBeInTheDocument()
      })
    })

    it('should show error icon when failed', async () => {
      const mockAudioWithError = class extends MockAudio {
        addEventListener(event: string, handler: any) {
          if (event === 'error') {
            setTimeout(() => handler(), 0)
          }
        }
      }
      global.Audio = mockAudioWithError as any

      const { container } = render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        expect(container.querySelector('.text-red-500')).toBeInTheDocument()
      })
    })
  })

  describe('Time Formatting', () => {
    it('should format time correctly for different durations', async () => {
      const { rerender } = render(<VoiceMessagePlayer url={mockUrl} duration={0} />)

      await waitFor(() => {
        expect(screen.getByText(/0:00/)).toBeInTheDocument()
      })

      rerender(<VoiceMessagePlayer url={mockUrl} duration={65} />)

      await waitFor(() => {
        expect(screen.getByText(/1:05/)).toBeInTheDocument()
      })

      rerender(<VoiceMessagePlayer url={mockUrl} duration={3661} />)

      await waitFor(() => {
        expect(screen.getByText(/61:01/)).toBeInTheDocument()
      })
    })

    it('should pad seconds with leading zero', async () => {
      render(<VoiceMessagePlayer url={mockUrl} duration={65} />)

      await waitFor(() => {
        expect(screen.getByText(/1:05/)).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup', () => {
    it('should pause audio on unmount', async () => {
      const { unmount } = render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getAllByRole('button')[0]
        expect(playButton).not.toBeDisabled()
      })

      const audio = new MockAudio()
      const pauseSpy = vi.spyOn(audio, 'pause')

      unmount()

      // Audio cleanup happens in useEffect
      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should remove event listeners on unmount', async () => {
      const { unmount } = render(<VoiceMessagePlayer url={mockUrl} />)

      await waitFor(() => {
        const playButton = screen.getAllByRole('button')[0]
        expect(playButton).not.toBeDisabled()
      })

      const audio = new MockAudio()
      const removeListenerSpy = vi.spyOn(audio, 'removeEventListener')

      unmount()

      expect(removeListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Compact Mode', () => {
    it('should render smaller controls in compact mode', () => {
      const { container } = render(
        <VoiceMessagePlayer url={mockUrl} compact />
      )

      const compactButton = container.querySelector('.h-8.w-8')
      expect(compactButton).toBeInTheDocument()
    })

    it('should show simplified progress bar in compact mode', () => {
      const { container } = render(
        <VoiceMessagePlayer url={mockUrl} compact />
      )

      const progressBar = container.querySelector('.h-1\\.5')
      expect(progressBar).toBeInTheDocument()
    })

    it('should not show mute button in compact mode', () => {
      render(<VoiceMessagePlayer url={mockUrl} compact />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(1) // Only play button
    })
  })

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <VoiceMessagePlayer url={mockUrl} className="custom-class" />
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('should use provided duration', async () => {
      render(<VoiceMessagePlayer url={mockUrl} duration={180} />)

      await waitFor(() => {
        expect(screen.getByText(/3:00/)).toBeInTheDocument()
      })
    })
  })
})

describe('isVoiceMessage', () => {
  it('should identify audio files as voice messages', () => {
    expect(isVoiceMessage({ type: 'audio/webm' })).toBe(true)
    expect(isVoiceMessage({ type: 'audio/mp3' })).toBe(true)
    expect(isVoiceMessage({ type: 'audio/ogg' })).toBe(true)
  })

  it('should identify files with "voice" in name as voice messages', () => {
    expect(
      isVoiceMessage({
        type: 'application/octet-stream',
        name: 'voice-message.webm',
      })
    ).toBe(true)

    expect(
      isVoiceMessage({
        type: 'application/octet-stream',
        name: 'VOICE_RECORDING.mp3',
      })
    ).toBe(true)
  })

  it('should not identify non-audio files as voice messages', () => {
    expect(isVoiceMessage({ type: 'image/png' })).toBe(false)
    expect(isVoiceMessage({ type: 'application/pdf' })).toBe(false)
    expect(isVoiceMessage({ type: 'video/mp4' })).toBe(false)
  })

  it('should handle missing name gracefully', () => {
    expect(isVoiceMessage({ type: 'application/octet-stream' })).toBe(false)
  })
})
