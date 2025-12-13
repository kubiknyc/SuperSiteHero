/**
 * BatchUploadProgress Component Tests
 * Tests for batch photo upload progress indicator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchUploadProgress } from '../BatchUploadProgress';
import type { UploadProgress } from '../../../hooks/usePhotoUploadManager';

// Helper to create mock upload progress
function createMockProgress(
  photoId: string,
  status: UploadProgress['status'],
  progress: number,
  error?: string
): UploadProgress {
  return { photoId, status, progress, error };
}

describe('BatchUploadProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('does not render when no uploads in progress', () => {
      const { container } = render(
        <BatchUploadProgress uploadProgress={{}} isUploading={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders when uploads are in progress', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
    });

    it('renders when uploads have failed', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'failed', 0, 'Network error'),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={false} />);
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows correct count during upload', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
        photo2: createMockProgress('photo2', 'uploading', 50),
        photo3: createMockProgress('photo3', 'pending', 0),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      expect(screen.getByText(/Uploading 2 of 3 photos/i)).toBeInTheDocument();
    });

    it('shows success message when all uploaded', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
        photo2: createMockProgress('photo2', 'uploaded', 100),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={false} />);
      expect(screen.getByText(/2 photos uploaded successfully/i)).toBeInTheDocument();
    });

    it('shows mixed result with failures', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
        photo2: createMockProgress('photo2', 'failed', 0, 'Error'),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={false} />);
      expect(screen.getByText(/1 uploaded, 1 failed/i)).toBeInTheDocument();
    });

    it('shows pending count for queued uploads', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'pending', 0),
        photo2: createMockProgress('photo2', 'pending', 0),
        photo3: createMockProgress('photo3', 'pending', 0),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={false} />);
      expect(screen.getByText(/3 photos pending upload/i)).toBeInTheDocument();
    });
  });

  describe('Expandable Details', () => {
    it('shows expand button when multiple photos', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
        photo2: createMockProgress('photo2', 'pending', 0),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      // Should have a chevron button for expanding
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('expands to show individual photo status', () => {
      const progress: Record<string, UploadProgress> = {
        'photo-uuid-1234': createMockProgress('photo-uuid-1234', 'uploaded', 100),
        'photo-uuid-5678': createMockProgress('photo-uuid-5678', 'uploading', 50),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);

      // Find and click expand button
      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find((b) => b.querySelector('svg'));
      if (expandButton) {
        fireEvent.click(expandButton);
      }

      // Should show photo IDs (truncated)
      expect(screen.getByText(/photo-uu.../i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows retry button when uploads have failed', () => {
      const onRetryFailed = vi.fn();
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'failed', 0, 'Error'),
      };
      render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={false}
          onRetryFailed={onRetryFailed}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      expect(onRetryFailed).toHaveBeenCalled();
    });

    it('shows cancel button when uploading', () => {
      const onCancel = vi.fn();
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
      };
      render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={true}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });

    it('shows dismiss button when complete', () => {
      const onDismiss = vi.fn();
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
      };
      render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={false}
          onDismiss={onDismiss}
        />
      );

      // Click the X button to dismiss
      const buttons = screen.getAllByRole('button');
      const dismissButton = buttons[buttons.length - 1];
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    });

    it('hides cancel button when not uploading', () => {
      const onCancel = vi.fn();
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
      };
      render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={false}
          onCancel={onCancel}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('hides retry button when no failures', () => {
      const onRetryFailed = vi.fn();
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
      };
      render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={false}
          onRetryFailed={onRetryFailed}
        />
      );

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('uses green styling for success', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
      };
      const { container } = render(
        <BatchUploadProgress uploadProgress={progress} isUploading={false} />
      );
      expect(container.firstChild).toHaveClass('bg-green-50');
    });

    it('uses red styling for failures', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'failed', 0, 'Error'),
      };
      const { container } = render(
        <BatchUploadProgress uploadProgress={progress} isUploading={false} />
      );
      expect(container.firstChild).toHaveClass('bg-red-50');
    });

    it('uses blue styling during upload', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
      };
      const { container } = render(
        <BatchUploadProgress uploadProgress={progress} isUploading={true} />
      );
      expect(container.firstChild).toHaveClass('bg-blue-50');
    });
  });

  describe('Status Stages', () => {
    it('handles compressing status', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'compressing', 20),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      expect(screen.getByText(/Uploading 1 of 1 photos/i)).toBeInTheDocument();
    });

    it('handles extracting status', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'extracting', 50),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      expect(screen.getByText(/Uploading 1 of 1 photos/i)).toBeInTheDocument();
    });

    it('aggregates multiple statuses correctly', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploaded', 100),
        photo2: createMockProgress('photo2', 'compressing', 20),
        photo3: createMockProgress('photo3', 'extracting', 50),
        photo4: createMockProgress('photo4', 'uploading', 75),
        photo5: createMockProgress('photo5', 'pending', 0),
        photo6: createMockProgress('photo6', 'failed', 0, 'Error'),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);

      // Expand to see details
      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find((b) => b.querySelector('svg'));
      if (expandButton) {
        fireEvent.click(expandButton);
      }

      // Should show summary counts after expanding
      expect(screen.getByText(/1 uploaded/i)).toBeInTheDocument();
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible buttons', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
        photo2: createMockProgress('photo2', 'pending', 0),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles single photo upload', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={true} />);
      expect(screen.getByText(/Uploading 1 of 1 photos/i)).toBeInTheDocument();
    });

    it('handles empty error message', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'failed', 0, ''),
      };
      render(<BatchUploadProgress uploadProgress={progress} isUploading={false} />);
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const progress: Record<string, UploadProgress> = {
        photo1: createMockProgress('photo1', 'uploading', 50),
      };
      const { container } = render(
        <BatchUploadProgress
          uploadProgress={progress}
          isUploading={true}
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
