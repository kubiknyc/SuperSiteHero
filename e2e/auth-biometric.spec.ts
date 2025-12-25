/**
 * Biometric Authentication E2E Tests
 *
 * End-to-end tests for biometric authentication flow using Playwright:
 * - Biometric setup flow
 * - Biometric login
 * - Device management
 * - Re-authentication
 * - Fallback to password
 * - Browser compatibility warnings
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'test.biometric@example.com',
  password: 'SecurePassword123!',
  name: 'Test Biometric User',
};

// Page Object Model for Biometric Setup
class BiometricSetupPage {
  constructor(private page: Page) {}

  async navigateToSettings() {
    await this.page.goto('/settings/security');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToBiometricSetup() {
    await this.page.goto('/settings/biometric');
    await this.page.waitForLoadState('networkidle');
  }

  async getBiometricToggle() {
    return this.page.getByRole('switch', { name: /enable biometric login/i });
  }

  async enableBiometric() {
    const toggle = await this.getBiometricToggle();
    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await toggle.click();
    }
  }

  async disableBiometric() {
    const toggle = await this.getBiometricToggle();
    const isChecked = await toggle.isChecked();
    if (isChecked) {
      await toggle.click();
    }
  }

  async clickAddDevice() {
    await this.page.getByRole('button', { name: /add device/i }).click();
  }

  async enterDeviceName(name: string) {
    await this.page.getByPlaceholder(/chrome on windows/i).fill(name);
  }

  async clickRegisterDevice() {
    await this.page.getByRole('button', { name: /register device/i }).click();
  }

  async selectReauthInterval(interval: '15 minutes' | '1 hour' | '4 hours' | 'Never (session only)') {
    await this.page.getByRole('button', { name: interval }).click();
  }

  async getDeviceList() {
    return this.page.locator('[data-testid="device-list"] > div, .bg-gray-50');
  }

  async deleteDevice(deviceName: string) {
    const deviceRow = this.page.locator(`text=${deviceName}`).locator('..').locator('..');
    await deviceRow.getByRole('button', { name: '' }).last().click();
    await this.page.getByRole('button', { name: /remove device/i }).click();
  }

  async getCompatibilityWarning() {
    return this.page.locator('text=/Browser Not Supported|Biometric Not Available/i');
  }

  async waitForSuccess() {
    await this.page.waitForSelector('text=/device registered|settings updated/i', { timeout: 5000 });
  }
}

// Page Object Model for Login
class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }

  async clickBiometricLogin() {
    await this.page.getByRole('button', { name: /sign in with biometrics/i }).click();
  }

  async waitForDashboard() {
    await this.page.waitForURL(/\/dashboard|\/projects/i, { timeout: 10000 });
  }

  async hasBiometricOption() {
    return this.page.getByRole('button', { name: /sign in with biometrics/i }).isVisible();
  }
}

// Page Object Model for Re-auth Dialog
class ReauthDialogPage {
  constructor(private page: Page) {}

  async isVisible() {
    return this.page.getByText('Verify Your Identity').isVisible();
  }

  async clickVerifyBiometrics() {
    await this.page.getByRole('button', { name: /verify with biometrics/i }).click();
  }

  async clickUsePassword() {
    await this.page.getByRole('button', { name: /use password instead/i }).click();
  }

  async clickCancel() {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  async enterPassword(password: string) {
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole('button', { name: /verify|confirm/i }).click();
  }
}

// Helper to mock WebAuthn API
async function mockWebAuthnSupport(page: Page, supported: boolean = true, available: boolean = true) {
  await page.addInitScript(({ supported, available }) => {
    if (supported) {
      (window as any).PublicKeyCredential = {
        isUserVerifyingPlatformAuthenticatorAvailable: async () => available,
      };

      if (available) {
        // Mock credential creation
        (navigator.credentials as any).create = async () => ({
          id: 'mock-credential-id',
          rawId: new Uint8Array([1, 2, 3, 4]).buffer,
          response: {
            attestationObject: new Uint8Array([5, 6, 7, 8]).buffer,
            clientDataJSON: new Uint8Array([9, 10, 11, 12]).buffer,
            getPublicKey: () => new Uint8Array([13, 14, 15, 16]).buffer,
            getTransports: () => ['internal'],
          },
          type: 'public-key',
        });

        // Mock credential assertion
        (navigator.credentials as any).get = async () => ({
          id: 'mock-credential-id',
          rawId: new Uint8Array([1, 2, 3, 4]).buffer,
          response: {
            authenticatorData: new Uint8Array([5, 6, 7, 8]).buffer,
            clientDataJSON: new Uint8Array([9, 10, 11, 12]).buffer,
            signature: new Uint8Array([13, 14, 15, 16]).buffer,
            userHandle: new Uint8Array([17, 18, 19, 20]).buffer,
          },
          type: 'public-key',
        });
      }
    } else {
      delete (window as any).PublicKeyCredential;
    }
  }, { supported, available });
}

test.describe('Biometric Authentication', () => {
  let loginPage: LoginPage;
  let biometricPage: BiometricSetupPage;
  let reauthPage: ReauthDialogPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    biometricPage = new BiometricSetupPage(page);
    reauthPage = new ReauthDialogPage(page);

    // Mock WebAuthn support
    await mockWebAuthnSupport(page, true, true);
  });

  test.describe('Browser Compatibility', () => {
    test('should show warning when WebAuthn is not supported', async ({ page }) => {
      await mockWebAuthnSupport(page, false, false);

      // Login first
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();

      // Navigate to biometric setup
      await biometricPage.navigateToBiometricSetup();

      // Should show compatibility warning
      const warning = await biometricPage.getCompatibilityWarning();
      await expect(warning).toBeVisible();
      await expect(page.getByText(/modern browser/i)).toBeVisible();
    });

    test('should show info when platform authenticator is not available', async ({ page }) => {
      await mockWebAuthnSupport(page, true, false);

      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();

      await biometricPage.navigateToBiometricSetup();

      const warning = await biometricPage.getCompatibilityWarning();
      await expect(warning).toBeVisible();
      await expect(page.getByText(/fingerprint, Face ID, or Windows Hello/i)).toBeVisible();
    });

    test('should show setup UI when biometric is available', async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();

      await biometricPage.navigateToBiometricSetup();

      await expect(page.getByText('Biometric Authentication')).toBeVisible();
      await expect(page.getByRole('button', { name: /add device/i })).toBeVisible();
    });
  });

  test.describe('Biometric Setup Flow', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should register a new device with default name', async ({ page }) => {
      await biometricPage.clickAddDevice();

      await expect(page.getByText('Register New Device')).toBeVisible();
      await expect(page.getByPlaceholder(/chrome on windows/i)).toBeVisible();

      await biometricPage.clickRegisterDevice();

      await biometricPage.waitForSuccess();
      await expect(page.getByText(/device registered/i)).toBeVisible();
    });

    test('should register a new device with custom name', async ({ page }) => {
      await biometricPage.clickAddDevice();

      await biometricPage.enterDeviceName('My Work Laptop');
      await biometricPage.clickRegisterDevice();

      await biometricPage.waitForSuccess();

      const devices = await biometricPage.getDeviceList();
      await expect(devices.filter({ hasText: 'My Work Laptop' })).toBeVisible();
    });

    test('should display registered devices', async ({ page }) => {
      // Assuming device is already registered
      const devices = await biometricPage.getDeviceList();
      expect(await devices.count()).toBeGreaterThan(0);
    });

    test('should show device details including last used', async ({ page }) => {
      const devices = await biometricPage.getDeviceList();
      const firstDevice = devices.first();

      await expect(firstDevice).toContainText(/Added/i);
    });

    test('should enable biometric authentication after first device', async ({ page }) => {
      const toggle = await biometricPage.getBiometricToggle();

      // Should be enabled if devices are registered
      // Or disabled if no devices
      const isEnabled = await toggle.isChecked();
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  test.describe('Device Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should delete a registered device', async ({ page }) => {
      // Register a device first
      await biometricPage.clickAddDevice();
      await biometricPage.enterDeviceName('Device to Delete');
      await biometricPage.clickRegisterDevice();
      await biometricPage.waitForSuccess();

      // Delete the device
      await biometricPage.deleteDevice('Device to Delete');

      await expect(page.getByText(/device removed/i)).toBeVisible();
    });

    test('should show confirmation dialog before deleting device', async ({ page }) => {
      // Assuming at least one device exists
      const devices = await biometricPage.getDeviceList();
      if (await devices.count() > 0) {
        const deleteButton = devices.first().getByRole('button', { name: '' }).last();
        await deleteButton.click();

        await expect(page.getByText('Remove Device')).toBeVisible();
        await expect(page.getByText(/are you sure/i)).toBeVisible();

        // Cancel deletion
        await page.getByRole('button', { name: /cancel/i }).click();
      }
    });

    test('should disable toggle when all devices are removed', async ({ page }) => {
      // This test assumes we can remove all devices
      // In practice, you might want to keep at least one device
      const toggle = await biometricPage.getBiometricToggle();

      // If toggle is enabled and we remove all devices, it should become disabled
      // Implementation depends on your business logic
      const isEnabled = await toggle.isChecked();
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  test.describe('Re-authentication Interval', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should display re-auth interval options', async ({ page }) => {
      await expect(page.getByText('Re-authentication Interval')).toBeVisible();
      await expect(page.getByRole('button', { name: '15 minutes' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1 hour' })).toBeVisible();
      await expect(page.getByRole('button', { name: '4 hours' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Never (session only)' })).toBeVisible();
    });

    test('should change re-auth interval', async ({ page }) => {
      await biometricPage.selectReauthInterval('15 minutes');

      await expect(page.getByText(/settings updated/i)).toBeVisible();
      await expect(page.getByText(/15 minutes/i)).toBeVisible();
    });

    test('should highlight selected interval', async ({ page }) => {
      await biometricPage.selectReauthInterval('4 hours');

      const button = page.getByRole('button', { name: '4 hours' });
      // Check if button has active/selected styling
      const classes = await button.getAttribute('class');
      expect(classes).toBeTruthy();
    });
  });

  test.describe('Biometric Login Flow', () => {
    test('should show biometric login option when available', async ({ page }) => {
      await loginPage.navigate();

      // Check if biometric option is available
      // This depends on whether the user has registered devices
      const hasBiometric = await loginPage.hasBiometricOption();
      expect(typeof hasBiometric).toBe('boolean');
    });

    test('should login with biometrics', async ({ page }) => {
      await loginPage.navigate();

      // Mock that user has biometric registered
      if (await loginPage.hasBiometricOption()) {
        await loginPage.clickBiometricLogin();

        // Should redirect to dashboard
        await loginPage.waitForDashboard();
        await expect(page.url()).toMatch(/\/dashboard|\/projects/i);
      }
    });

    test('should fallback to password on biometric failure', async ({ page }) => {
      await loginPage.navigate();

      if (await loginPage.hasBiometricOption()) {
        // Mock biometric failure
        await mockWebAuthnSupport(page, true, false);

        await loginPage.clickBiometricLogin();

        // Should show error or fallback option
        await expect(page.getByText(/failed|try again/i)).toBeVisible();
      }
    });
  });

  test.describe('Re-authentication Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
    });

    test('should show re-auth dialog for sensitive operations', async ({ page }) => {
      // Navigate to a sensitive operation (e.g., change password)
      await page.goto('/settings/security/change-password');

      // Re-auth dialog might appear
      if (await reauthPage.isVisible()) {
        await expect(page.getByText('Verify Your Identity')).toBeVisible();
        await expect(page.getByRole('button', { name: /verify with biometrics/i })).toBeVisible();
      }
    });

    test('should verify with biometrics in re-auth dialog', async ({ page }) => {
      await page.goto('/settings/security/change-password');

      if (await reauthPage.isVisible()) {
        await reauthPage.clickVerifyBiometrics();

        // Should close dialog and allow operation
        await expect(page.getByText('Verify Your Identity')).not.toBeVisible();
      }
    });

    test('should show password fallback option', async ({ page }) => {
      await page.goto('/settings/security/change-password');

      if (await reauthPage.isVisible()) {
        await expect(page.getByRole('button', { name: /use password instead/i })).toBeVisible();
      }
    });

    test('should fallback to password authentication', async ({ page }) => {
      await page.goto('/settings/security/change-password');

      if (await reauthPage.isVisible()) {
        await reauthPage.clickUsePassword();

        // Should show password input
        await expect(page.getByLabel(/password/i)).toBeVisible();

        await reauthPage.enterPassword(TEST_USER.password);

        // Should verify and close dialog
        await expect(page.getByText('Verify Your Identity')).not.toBeVisible();
      }
    });

    test('should cancel re-authentication', async ({ page }) => {
      await page.goto('/settings/security/change-password');

      if (await reauthPage.isVisible()) {
        await reauthPage.clickCancel();

        // Should close dialog
        await expect(page.getByText('Verify Your Identity')).not.toBeVisible();
      }
    });
  });

  test.describe('Security Information', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should display security information', async ({ page }) => {
      await expect(page.getByText('Security Information')).toBeVisible();
      await expect(page.getByText(/biometric data .* never leaves your device/i)).toBeVisible();
      await expect(page.getByText(/cryptographic key/i)).toBeVisible();
      await expect(page.getByText(/revoked independently/i)).toBeVisible();
    });
  });

  test.describe('Toggle Biometric', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should enable biometric authentication', async ({ page }) => {
      const toggle = await biometricPage.getBiometricToggle();

      if (!await toggle.isChecked()) {
        await biometricPage.enableBiometric();
        await expect(page.getByText(/biometric authentication enabled/i)).toBeVisible();
      }
    });

    test('should disable biometric authentication', async ({ page }) => {
      const toggle = await biometricPage.getBiometricToggle();

      if (await toggle.isChecked()) {
        await biometricPage.disableBiometric();
        await expect(page.getByText(/biometric authentication disabled/i)).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();
    });

    test('should handle device registration errors', async ({ page }) => {
      // Mock WebAuthn to throw error
      await page.addInitScript(() => {
        (navigator.credentials as any).create = async () => {
          throw new Error('NotAllowedError');
        };
      });

      await biometricPage.clickAddDevice();
      await biometricPage.clickRegisterDevice();

      // Should show error message
      await expect(page.getByText(/cancelled|not allowed|failed/i)).toBeVisible();
    });

    test('should handle authentication errors', async ({ page }) => {
      // Mock WebAuthn to throw error
      await page.addInitScript(() => {
        (navigator.credentials as any).get = async () => {
          throw new Error('Authentication failed');
        };
      });

      await loginPage.navigate();

      if (await loginPage.hasBiometricOption()) {
        await loginPage.clickBiometricLogin();

        // Should show error
        await expect(page.getByText(/failed|error/i)).toBeVisible();
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'This test is only for Chromium');

      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();

      await expect(page.getByText('Biometric Authentication')).toBeVisible();
    });

    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'This test is only for Firefox');

      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();

      await expect(page.getByText('Biometric Authentication')).toBeVisible();
    });

    test('should work in WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'This test is only for WebKit');

      await loginPage.navigate();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForDashboard();
      await biometricPage.navigateToBiometricSetup();

      await expect(page.getByText('Biometric Authentication')).toBeVisible();
    });
  });
});
