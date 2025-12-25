/**
 * BiometricSetup Component Tests
 *
 * Tests the BiometricSetup component including:
 * - Device registration flow
 * - Re-auth interval configuration
 * - Browser compatibility display
 * - Device management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  userEvent,
} from '@/__tests__/helpers';
import { BiometricSetup } from '../BiometricSetup';
import * as biometricLib from '@/lib/auth/biometric';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/lib/notifications/ToastContext';

// Mock modules
vi.mock('@/lib/auth/AuthContext');
vi.mock('@/lib/notifications/ToastContext');
vi.mock('@/lib/auth/biometric');

describe('BiometricSetup', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSettings = {
    enabled: true,
    reauthInterval: '1hour' as const,
    credentials: [
      {
        id: 'cred-1',
        credentialId: 'credential-abc',
        publicKey: 'public-key-abc',
        deviceName: 'Chrome on Windows',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-01-15T12:00:00Z',
        transports: ['internal'] as AuthenticatorTransport[],
      },
      {
        id: 'cred-2',
        credentialId: 'credential-def',
        publicKey: 'public-key-def',
        deviceName: 'Safari on Mac',
        createdAt: '2024-01-10T00:00:00Z',
        lastUsed: null,
        transports: ['internal'] as AuthenticatorTransport[],
      },
    ],
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
    } as any);

    // Mock useToast
    vi.mocked(useToast).mockReturnValue(mockToast as any);

    // Mock biometric library functions
    vi.mocked(biometricLib.isWebAuthnSupported).mockReturnValue(true);
    vi.mocked(biometricLib.isPlatformAuthenticatorAvailable).mockResolvedValue(true);
    vi.mocked(biometricLib.getBiometricSettings).mockResolvedValue(mockSettings);
    vi.mocked(biometricLib.getDeviceInfo).mockReturnValue('Chrome on Windows');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Browser Compatibility', () => {
    it('should show warning when WebAuthn is not supported', async () => {
      vi.mocked(biometricLib.isWebAuthnSupported).mockReturnValue(false);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Browser Not Supported')).toBeInTheDocument();
        expect(screen.getByText(/modern browser like Chrome 67\+/i)).toBeInTheDocument();
      });
    });

    it('should show info when platform authenticator is not available', async () => {
      vi.mocked(biometricLib.isPlatformAuthenticatorAvailable).mockResolvedValue(false);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Biometric Not Available')).toBeInTheDocument();
        expect(screen.getByText(/fingerprint, Face ID, or Windows Hello/i)).toBeInTheDocument();
      });
    });

    it('should load settings when browser is compatible', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(biometricLib.getBiometricSettings).toHaveBeenCalledWith(mockUser.id);
        expect(screen.getByText('Biometric Authentication')).toBeInTheDocument();
      });
    });
  });

  describe('Full Settings View', () => {
    it('should display biometric toggle switch', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /enable biometric login/i });
        expect(toggle).toBeInTheDocument();
        expect(toggle).toBeChecked();
      });
    });

    it('should toggle biometric authentication', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue();

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /enable biometric login/i });
      await userEvent.click(toggle);

      await waitFor(() => {
        expect(biometricLib.updateBiometricSettings).toHaveBeenCalledWith(mockUser.id, {
          enabled: false,
        });
        expect(mockToast.success).toHaveBeenCalledWith(
          'Settings Updated',
          'Biometric authentication disabled'
        );
      });
    });

    it('should disable toggle when no credentials are registered', async () => {
      const emptySettings = { ...mockSettings, credentials: [] };
      vi.mocked(biometricLib.getBiometricSettings).mockResolvedValue(emptySettings);

      render(<BiometricSetup />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeDisabled();
        expect(screen.getByText(/register at least one device/i)).toBeInTheDocument();
      });
    });

    it('should display re-authentication interval options', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Re-authentication Interval')).toBeInTheDocument();
        expect(screen.getByText('15 minutes')).toBeInTheDocument();
        expect(screen.getByText('1 hour')).toBeInTheDocument();
        expect(screen.getByText('4 hours')).toBeInTheDocument();
        expect(screen.getByText('Never (session only)')).toBeInTheDocument();
      });
    });

    it('should change re-authentication interval', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue();

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('15 minutes')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: '15 minutes' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(biometricLib.updateBiometricSettings).toHaveBeenCalledWith(mockUser.id, {
          reauthInterval: '15min',
        });
        expect(mockToast.success).toHaveBeenCalledWith(
          'Settings Updated',
          'Re-authentication interval set to 15 minutes'
        );
      });
    });
  });

  describe('Device Management', () => {
    it('should display list of registered devices', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Registered Devices')).toBeInTheDocument();
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
        expect(screen.getByText('Safari on Mac')).toBeInTheDocument();
      });
    });

    it('should show device details including last used', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText(/Added Jan 1, 2024/)).toBeInTheDocument();
        expect(screen.getByText(/Last used Jan 15, 2024/)).toBeInTheDocument();
      });
    });

    it('should show "Never" for devices never used', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        const safariDevice = screen.getByText('Safari on Mac').closest('div');
        expect(safariDevice).toBeInTheDocument();
      });
    });

    it('should show empty state when no devices registered', async () => {
      const emptySettings = { ...mockSettings, credentials: [] };
      vi.mocked(biometricLib.getBiometricSettings).mockResolvedValue(emptySettings);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('No devices registered')).toBeInTheDocument();
        expect(screen.getByText('Add a device to enable biometric login')).toBeInTheDocument();
      });
    });
  });

  describe('Device Registration', () => {
    it('should open device name dialog when clicking Add Device', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Register New Device')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Chrome on Windows')).toBeInTheDocument();
      });
    });

    it('should register device with custom name', async () => {
      const newCredential = {
        id: 'cred-3',
        credentialId: 'credential-ghi',
        publicKey: 'public-key-ghi',
        deviceName: 'My Custom Device',
        createdAt: '2024-01-20T00:00:00Z',
        lastUsed: null,
        transports: ['internal'] as AuthenticatorTransport[],
      };

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      // Enter custom device name
      const input = screen.getByPlaceholderText('Chrome on Windows');
      await userEvent.type(input, 'My Custom Device');

      // Register
      const registerButton = screen.getByRole('button', { name: /register device/i });
      await userEvent.click(registerButton);

      await waitFor(() => {
        expect(biometricLib.registerBiometricCredential).toHaveBeenCalledWith(
          mockUser.id,
          mockUser.email,
          'My Custom Device'
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          'Device Registered',
          'Biometric authentication has been set up successfully'
        );
      });
    });

    it('should register device with default name when no custom name provided', async () => {
      const newCredential = {
        id: 'cred-3',
        credentialId: 'credential-ghi',
        publicKey: 'public-key-ghi',
        deviceName: 'Chrome on Windows',
        createdAt: '2024-01-20T00:00:00Z',
        lastUsed: null,
        transports: ['internal'] as AuthenticatorTransport[],
      };

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      const registerButton = screen.getByRole('button', { name: /register device/i });
      await userEvent.click(registerButton);

      await waitFor(() => {
        expect(biometricLib.registerBiometricCredential).toHaveBeenCalledWith(
          mockUser.id,
          mockUser.email,
          ''
        );
      });
    });

    it('should enable biometric when registering first credential', async () => {
      const emptySettings = { ...mockSettings, credentials: [] };
      vi.mocked(biometricLib.getBiometricSettings)
        .mockResolvedValueOnce(emptySettings)
        .mockResolvedValueOnce(mockSettings);

      const newCredential = {
        id: 'cred-1',
        credentialId: 'credential-abc',
        publicKey: 'public-key-abc',
        deviceName: 'Chrome on Windows',
        createdAt: '2024-01-20T00:00:00Z',
        lastUsed: null,
        transports: ['internal'] as AuthenticatorTransport[],
      };

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential);
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue();

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      const registerButton = screen.getByRole('button', { name: /register device/i });
      await userEvent.click(registerButton);

      await waitFor(() => {
        expect(biometricLib.updateBiometricSettings).toHaveBeenCalledWith(mockUser.id, {
          enabled: true,
        });
      });
    });

    it('should handle registration errors', async () => {
      vi.mocked(biometricLib.registerBiometricCredential).mockRejectedValue(
        new Error('User cancelled biometric verification')
      );

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      const registerButton = screen.getByRole('button', { name: /register device/i });
      await userEvent.click(registerButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Registration Failed',
          'User cancelled biometric verification'
        );
      });
    });

    it('should call onSetupComplete after successful registration', async () => {
      const onSetupComplete = vi.fn();
      const newCredential = {
        id: 'cred-3',
        credentialId: 'credential-ghi',
        publicKey: 'public-key-ghi',
        deviceName: 'Chrome on Windows',
        createdAt: '2024-01-20T00:00:00Z',
        lastUsed: null,
        transports: ['internal'] as AuthenticatorTransport[],
      };

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential);

      render(<BiometricSetup onSetupComplete={onSetupComplete} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add device/i });
      await userEvent.click(addButton);

      const registerButton = screen.getByRole('button', { name: /register device/i });
      await userEvent.click(registerButton);

      await waitFor(() => {
        expect(onSetupComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Device Deletion', () => {
    it('should open confirmation dialog when clicking delete button', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
        (btn) => btn.querySelector('svg[data-testid="icon"]')
      );
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Remove Device')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to remove "Chrome on Windows"/)).toBeInTheDocument();
      });
    });

    it('should delete device when confirmed', async () => {
      vi.mocked(biometricLib.deleteBiometricCredential).mockResolvedValue(true);

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
        (btn) => btn.querySelector('svg[data-testid="icon"]')
      );
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove device/i })).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /remove device/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(biometricLib.deleteBiometricCredential).toHaveBeenCalledWith('cred-1');
        expect(mockToast.success).toHaveBeenCalledWith(
          'Device Removed',
          'Chrome on Windows has been removed'
        );
      });
    });

    it('should handle deletion errors', async () => {
      vi.mocked(biometricLib.deleteBiometricCredential).mockRejectedValue(
        new Error('Failed to delete')
      );

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
        (btn) => btn.querySelector('svg[data-testid="icon"]')
      );
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /remove device/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error', 'Failed to remove device');
      });
    });
  });

  describe('Compact View', () => {
    it('should render compact view when compact prop is true', async () => {
      render(<BiometricSetup compact />);

      await waitFor(() => {
        expect(screen.getByText('Enable Biometric Login')).toBeInTheDocument();
        expect(screen.getByText('Use fingerprint or Face ID for quick, secure access')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /set up biometric login/i })).toBeInTheDocument();
      });

      // Should not show full settings
      expect(screen.queryByText('Registered Devices')).not.toBeInTheDocument();
      expect(screen.queryByText('Re-authentication Interval')).not.toBeInTheDocument();
    });

    it('should open device registration dialog in compact view', async () => {
      render(<BiometricSetup compact />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set up biometric login/i })).toBeInTheDocument();
      });

      const setupButton = screen.getByRole('button', { name: /set up biometric login/i });
      await userEvent.click(setupButton);

      await waitFor(() => {
        expect(screen.getByText('Register Device')).toBeInTheDocument();
        expect(screen.getByText(/Your biometric data never leaves your device/)).toBeInTheDocument();
      });
    });
  });

  describe('Security Information', () => {
    it('should display security information', async () => {
      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByText('Security Information')).toBeInTheDocument();
        expect(screen.getByText(/biometric data .* never leaves your device/i)).toBeInTheDocument();
        expect(screen.getByText(/cryptographic key is stored on our servers/i)).toBeInTheDocument();
        expect(screen.getByText(/can be revoked independently/i)).toBeInTheDocument();
        expect(screen.getByText(/fall back to password authentication/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while loading settings', async () => {
      vi.mocked(biometricLib.getBiometricSettings).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByTestId('icon')).toBeInTheDocument(); // Loading spinner
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle settings load errors gracefully', async () => {
      vi.mocked(biometricLib.getBiometricSettings).mockRejectedValue(
        new Error('Failed to load settings')
      );

      render(<BiometricSetup />);

      // Should not crash, component should still render
      await waitFor(() => {
        expect(screen.queryByText('Biometric Authentication')).not.toBeInTheDocument();
      });
    });

    it('should handle toggle errors', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockRejectedValue(
        new Error('Failed to update')
      );

      render(<BiometricSetup />);

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error', 'Failed to update biometric settings');
      });
    });
  });
});
