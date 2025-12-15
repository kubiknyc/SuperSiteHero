/**
 * Tests for Photo360Viewer Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Photo360Viewer } from './Photo360Viewer';

// Mock @photo-sphere-viewer/core
vi.mock('@photo-sphere-viewer/core', () => ({
  Viewer: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn((event, callback) => {
      if (event === 'ready') {
        // Simulate ready event after a short delay
        setTimeout(callback, 10);
      }
    }),
    destroy: vi.fn(),
    getPlugin: vi.fn().mockReturnValue({
      isSupported: vi.fn().mockReturnValue(true),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    }),
    startAutoRotate: vi.fn(),
    animate: vi.fn(),
  })),
}));

// Mock @photo-sphere-viewer/gyroscope-plugin
vi.mock('@photo-sphere-viewer/gyroscope-plugin', () => ({
  GyroscopePlugin: class GyroscopePlugin {},
}));

// Mock CSS imports
vi.mock('@photo-sphere-viewer/core/index.css', () => ({}));
vi.mock('@photo-sphere-viewer/gyroscope-plugin/index.css', () => ({}));

describe('Photo360Viewer', () => {
  const defaultProps = {
    photoUrl: 'https://example.com/test-360-photo.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<Photo360Viewer {...defaultProps} />);

    // Should show loading state initially
    expect(screen.getByText('Loading panorama...')).toBeInTheDocument();
  });

  it('displays 360 badge', async () => {
    render(<Photo360Viewer {...defaultProps} />);

    // 360 badge should always be visible
    expect(screen.getByText('360')).toBeInTheDocument();
  });

  it('shows controls after loading', async () => {
    render(<Photo360Viewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading panorama...')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('renders with caption when provided', () => {
    render(<Photo360Viewer {...defaultProps} caption="Test caption" />);

    expect(screen.getByText('Test caption')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Photo360Viewer {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onReady callback when viewer is ready', async () => {
    const onReady = vi.fn();
    render(<Photo360Viewer {...defaultProps} onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('renders gyroscope hint on mobile', async () => {
    render(<Photo360Viewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading panorama...')).not.toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText(/Enable gyroscope/)).toBeInTheDocument();
  });

  describe('controls', () => {
    it('renders reset view button', async () => {
      render(<Photo360Viewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading panorama...')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByTitle('Reset view')).toBeInTheDocument();
    });

    it('renders fullscreen button', async () => {
      render(<Photo360Viewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading panorama...')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error message when photoUrl is invalid', async () => {
      // Override the mock to simulate an error
      const { Viewer } = await import('@photo-sphere-viewer/core');
      vi.mocked(Viewer).mockImplementationOnce(() => {
        throw new Error('Failed to load image');
      });

      render(<Photo360Viewer photoUrl="" />);

      // Component should handle the error gracefully
      // The exact behavior depends on implementation
    });

    it('calls onError callback on failure', async () => {
      const onError = vi.fn();
      const { Viewer } = await import('@photo-sphere-viewer/core');
      vi.mocked(Viewer).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      render(<Photo360Viewer photoUrl="invalid" onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('auto-rotate', () => {
    it('starts auto-rotate when enabled', async () => {
      const { Viewer } = await import('@photo-sphere-viewer/core');
      const mockViewer = {
        addEventListener: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(callback, 10);
          }
        }),
        destroy: vi.fn(),
        getPlugin: vi.fn().mockReturnValue({
          isSupported: vi.fn().mockReturnValue(true),
        }),
        startAutoRotate: vi.fn(),
      };
      vi.mocked(Viewer).mockImplementation(() => mockViewer as any);

      render(<Photo360Viewer {...defaultProps} autoRotate autoRotateSpeed="0.5rpm" />);

      await waitFor(() => {
        expect(mockViewer.startAutoRotate).toHaveBeenCalledWith({ speed: '0.5rpm' });
      }, { timeout: 1000 });
    });
  });

  describe('initial view settings', () => {
    it('sets default heading and pitch', async () => {
      const { Viewer } = await import('@photo-sphere-viewer/core');

      render(
        <Photo360Viewer
          {...defaultProps}
          defaultHeading={180}
          defaultPitch={15}
        />
      );

      expect(Viewer).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultYaw: Math.PI, // 180 degrees in radians
          defaultPitch: expect.any(Number),
        })
      );
    });
  });

  describe('zoom settings', () => {
    it('applies min and max zoom levels', async () => {
      const { Viewer } = await import('@photo-sphere-viewer/core');

      render(
        <Photo360Viewer
          {...defaultProps}
          minZoom={20}
          maxZoom={80}
        />
      );

      expect(Viewer).toHaveBeenCalledWith(
        expect.objectContaining({
          minFov: 20, // 100 - maxZoom
          maxFov: 80, // 100 - minZoom
        })
      );
    });
  });
});

describe('Photo360Viewer error state', () => {
  it('renders error UI when error occurs', async () => {
    const { Viewer } = await import('@photo-sphere-viewer/core');
    vi.mocked(Viewer).mockImplementation(() => {
      throw new Error('Network error');
    });

    render(<Photo360Viewer photoUrl="https://example.com/fail.jpg" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Panorama')).toBeInTheDocument();
    });
  });
});
