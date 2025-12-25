/**
 * BiometricReauthDialog Component Tests
 *
 * Tests the BiometricReauthDialog component including:
 * - Biometric re-authentication flow
 * - Password fallback
 * - Session timeout handling
 * - useBiometricReauth hook integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  render,
  screen,
  waitFor,
  userEvent,
} from '@/__tests__/helpers';
import { BiometricReauthDialog, useBiometricReauth } from '../BiometricReauthDialog';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useToast } from '@/lib/notifications/ToastContext';

// Mock modules
vi.mock('../../hooks/useBiometricAuth');
vi.mock('@/lib/notifications/ToastContext');

describe('BiometricReauthDialog', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockBiometricAuth = {
    authenticate: vi.fn(),
    isAvailable: true,
    error: null,
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
    onFallbackToPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useToast).mockReturnValue(mockToast as any);
    vi.mocked(useBiometricAuth).mockReturnValue(mockBiometricAuth as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render dialog when open', () => {
      render(<BiometricReauthDialog {...defaultProps} />);

      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
      expect(screen.getByText('This action requires biometric verification for security.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify with biometrics/i })).toBeInTheDocument();
    });

    it('should not render when not available', () => {
      vi.mocked(useBiometricAuth).mockReturnValue({
        ...mockBiometricAuth,
        isAvailable: false,
      } as any);

      const { container } = render(<BiometricReauthDialog {...defaultProps} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should render custom title and description', () => {
      render(
        <BiometricReauthDialog
          {...defaultProps}
          title="Custom Title"
          description="Custom description text"
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('should render password fallback button by default', () => {
      render(<BiometricReauthDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /use password instead/i })).toBeInTheDocument();
    });

    it('should hide password fallback when showPasswordFallback is false', () => {
      render(<BiometricReauthDialog {...defaultProps} showPasswordFallback={false} />);

      expect(screen.queryByRole('button', { name: /use password instead/i })).not.toBeInTheDocument();
    });

    it('should hide password fallback when onFallbackToPassword is not provided', () => {
      const props = { ...defaultProps, onFallbackToPassword: undefined };
      render(<BiometricReauthDialog {...props} />);

      expect(screen.queryByRole('button', { name: /use password instead/i })).not.toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('should call authenticate when verify button is clicked', async () => {
      mockBiometricAuth.authenticate.mockResolvedValue(true);

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockBiometricAuth.authenticate).toHaveBeenCalled();
      });
    });

    it('should show loading state during authentication', async () => {
      mockBiometricAuth.authenticate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(verifyButton).toBeDisabled();
    });

    it('should call onSuccess on successful authentication', async () => {
      mockBiometricAuth.authenticate.mockResolvedValue(true);

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Verified', 'Identity verified successfully');
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error on failed authentication', async () => {
      mockBiometricAuth.authenticate.mockResolvedValue(false);
      vi.mocked(useBiometricAuth).mockReturnValue({
        ...mockBiometricAuth,
        error: 'Authentication failed',
      } as any);

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Verification Failed', 'Authentication failed');
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });

    it('should show error when authentication throws', async () => {
      mockBiometricAuth.authenticate.mockRejectedValue(new Error('Device not found'));

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error', 'Device not found');
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });

    it('should handle generic errors', async () => {
      mockBiometricAuth.authenticate.mockRejectedValue('Unknown error');

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error', 'Authentication failed');
      });
    });
  });

  describe('Dialog Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<BiometricReauthDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should call onFallbackToPassword when password fallback is clicked', async () => {
      render(<BiometricReauthDialog {...defaultProps} />);

      const passwordButton = screen.getByRole('button', { name: /use password instead/i });
      await userEvent.click(passwordButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      expect(defaultProps.onFallbackToPassword).toHaveBeenCalled();
    });

    it('should disable buttons during authentication', async () => {
      mockBiometricAuth.authenticate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );

      render(<BiometricReauthDialog {...defaultProps} />);

      const verifyButton = screen.getByRole('button', { name: /verify with biometrics/i });
      await userEvent.click(verifyButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const passwordButton = screen.getByRole('button', { name: /use password instead/i });

      expect(cancelButton).toBeDisabled();
      expect(passwordButton).toBeDisabled();
    });
  });

  describe('Dialog State Management', () => {
    it('should close dialog when onOpenChange is called with false', async () => {
      const { rerender } = render(<BiometricReauthDialog {...defaultProps} />);

      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();

      rerender(<BiometricReauthDialog {...defaultProps} open={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Verify Your Identity')).not.toBeInTheDocument();
      });
    });
  });
});

describe('useBiometricReauth Hook', () => {
  const mockBiometricAuth = {
    needsReauth: vi.fn(),
    isEnabled: true,
    isAvailable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBiometricAuth).mockReturnValue(mockBiometricAuth as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with closed dialog', () => {
      const { result } = renderHook(() => useBiometricReauth());

      expect(result.current.isOpen).toBe(false);
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useBiometricReauth());

      expect(result.current.requireReauth).toBeDefined();
      expect(result.current.handleSuccess).toBeDefined();
      expect(result.current.handleCancel).toBeDefined();
      expect(result.current.setIsOpen).toBeDefined();
    });
  });

  describe('requireReauth', () => {
    it('should execute action immediately when biometric is not enabled', () => {
      vi.mocked(useBiometricAuth).mockReturnValue({
        ...mockBiometricAuth,
        isEnabled: false,
      } as any);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        const needsDialog = result.current.requireReauth(action);
        expect(needsDialog).toBe(false);
      });

      expect(action).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
    });

    it('should execute action immediately when biometric is not available', () => {
      vi.mocked(useBiometricAuth).mockReturnValue({
        ...mockBiometricAuth,
        isAvailable: false,
      } as any);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        const needsDialog = result.current.requireReauth(action);
        expect(needsDialog).toBe(false);
      });

      expect(action).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
    });

    it('should execute action immediately when reauth is not needed', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(false);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        const needsDialog = result.current.requireReauth(action);
        expect(needsDialog).toBe(false);
      });

      expect(action).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
    });

    it('should open dialog when reauth is needed', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        const needsDialog = result.current.requireReauth(action);
        expect(needsDialog).toBe(true);
      });

      expect(action).not.toHaveBeenCalled();
      expect(result.current.isOpen).toBe(true);
    });

    it('should store pending action when dialog is opened', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        result.current.requireReauth(action);
      });

      // Execute pending action on success
      act(() => {
        result.current.handleSuccess();
      });

      expect(action).toHaveBeenCalled();
    });
  });

  describe('handleSuccess', () => {
    it('should execute pending action on success', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        result.current.requireReauth(action);
      });

      expect(action).not.toHaveBeenCalled();

      act(() => {
        result.current.handleSuccess();
      });

      expect(action).toHaveBeenCalled();
    });

    it('should clear pending action after execution', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        result.current.requireReauth(action);
        result.current.handleSuccess();
      });

      // Calling handleSuccess again should not execute action
      action.mockClear();

      act(() => {
        result.current.handleSuccess();
      });

      expect(action).not.toHaveBeenCalled();
    });

    it('should handle success when no pending action', () => {
      const { result } = renderHook(() => useBiometricReauth());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleSuccess();
        });
      }).not.toThrow();
    });
  });

  describe('handleCancel', () => {
    it('should clear pending action on cancel', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        result.current.requireReauth(action);
      });

      act(() => {
        result.current.handleCancel();
      });

      // Action should not execute on success after cancel
      act(() => {
        result.current.handleSuccess();
      });

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Actions', () => {
    it('should replace pending action when requireReauth is called multiple times', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action1 = vi.fn();
      const action2 = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      act(() => {
        result.current.requireReauth(action1);
        result.current.requireReauth(action2);
      });

      act(() => {
        result.current.handleSuccess();
      });

      expect(action1).not.toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete reauth flow', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      // Start reauth flow
      act(() => {
        const needsDialog = result.current.requireReauth(action);
        expect(needsDialog).toBe(true);
      });

      expect(result.current.isOpen).toBe(true);
      expect(action).not.toHaveBeenCalled();

      // Simulate successful authentication
      act(() => {
        result.current.handleSuccess();
      });

      expect(action).toHaveBeenCalled();
    });

    it('should handle cancelled reauth flow', () => {
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      // Start reauth flow
      act(() => {
        result.current.requireReauth(action);
      });

      expect(result.current.isOpen).toBe(true);

      // User cancels
      act(() => {
        result.current.handleCancel();
        result.current.setIsOpen(false);
      });

      expect(result.current.isOpen).toBe(false);
      expect(action).not.toHaveBeenCalled();
    });

    it('should handle session timeout scenario', () => {
      // Initially no reauth needed
      mockBiometricAuth.needsReauth.mockReturnValue(false);

      const action1 = vi.fn();
      const { result } = renderHook(() => useBiometricReauth());

      // First action executes immediately
      act(() => {
        result.current.requireReauth(action1);
      });

      expect(action1).toHaveBeenCalled();

      // Session times out
      mockBiometricAuth.needsReauth.mockReturnValue(true);

      const action2 = vi.fn();

      // Second action requires reauth
      act(() => {
        const needsDialog = result.current.requireReauth(action2);
        expect(needsDialog).toBe(true);
      });

      expect(result.current.isOpen).toBe(true);
      expect(action2).not.toHaveBeenCalled();

      // Reauth successful
      act(() => {
        result.current.handleSuccess();
      });

      expect(action2).toHaveBeenCalled();
    });
  });
});
