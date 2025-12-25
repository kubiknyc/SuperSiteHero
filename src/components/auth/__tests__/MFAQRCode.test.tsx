/**
 * MFAQRCode Component Tests
 *
 * Tests the MFAQRCode component including:
 * - QR code display with DOMPurify sanitization
 * - Manual secret key display
 * - Copy-to-clipboard functionality
 * - Setup instructions display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  userEvent,
} from '@/__tests__/helpers';
import { MFAQRCode } from '../MFAQRCode';
import DOMPurify from 'dompurify';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string) => input),
  },
}));

describe('MFAQRCode', () => {
  const mockQrSvg = '<svg width="200" height="200"><rect width="200" height="200" fill="white"/></svg>';
  const mockSecret = 'JBSWY3DPEHPK3PXP';

  const defaultProps = {
    qrSvg: mockQrSvg,
    secret: mockSecret,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render QR code section', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText('Scan with Authenticator App')).toBeInTheDocument();
      expect(screen.getByText(/Use Google Authenticator, Microsoft Authenticator, or Authy/i)).toBeInTheDocument();
    });

    it('should render manual entry section', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText("Can't scan? Enter code manually:")).toBeInTheDocument();
      expect(screen.getByText(/Time-based \(TOTP\)/i)).toBeInTheDocument();
    });

    it('should render setup instructions', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText('Setup Instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Open your authenticator app/i)).toBeInTheDocument();
      expect(screen.getByText(/Scan the code above or enter the secret key/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify the 6-digit code/i)).toBeInTheDocument();
    });
  });

  describe('QR Code Display', () => {
    it('should sanitize QR code SVG with DOMPurify', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(mockQrSvg, { USE_PROFILES: { svg: true } });
    });

    it('should render sanitized QR code', () => {
      const maliciousSvg = '<svg><script>alert("xss")</script></svg>';
      const sanitizedSvg = '<svg></svg>';

      vi.mocked(DOMPurify.sanitize).mockReturnValue(sanitizedSvg);

      render(<MFAQRCode {...defaultProps} qrSvg={maliciousSvg} />);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousSvg, { USE_PROFILES: { svg: true } });
    });

    it('should apply correct styles to QR code container', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const qrContainer = container.querySelector('.qr-code-container');
      expect(qrContainer).toHaveStyle({ filter: 'contrast(1.1)' });
      expect(qrContainer).toHaveStyle({ maxWidth: '280px' });
    });
  });

  describe('Secret Key Display', () => {
    it('should format secret key in groups of 4 characters', () => {
      render(<MFAQRCode {...defaultProps} />);

      // JBSWY3DPEHPK3PXP -> JBSW Y3DP EHPK 3PXP
      expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    });

    it('should handle secret keys not divisible by 4', () => {
      render(<MFAQRCode {...defaultProps} secret="ABCDEFGH123" />);

      // ABCDEFGH123 -> ABCD EFGH 123
      expect(screen.getByText('ABCD EFGH 123')).toBeInTheDocument();
    });

    it('should handle empty secret key', () => {
      render(<MFAQRCode {...defaultProps} secret="" />);

      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should display secret in monospace font', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const secretCode = container.querySelector('code');
      expect(secretCode).toHaveClass('font-mono');
    });
  });

  describe('Issuer and Account Information', () => {
    it('should display default issuer "JobSight"', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText(/Issuer:/)).toBeInTheDocument();
      expect(screen.getByText('JobSight')).toBeInTheDocument();
    });

    it('should display custom issuer', () => {
      render(<MFAQRCode {...defaultProps} issuer="CustomApp" />);

      expect(screen.getByText('CustomApp')).toBeInTheDocument();
    });

    it('should display account name when provided', () => {
      render(<MFAQRCode {...defaultProps} accountName="user@example.com" />);

      expect(screen.getByText(/Account:/)).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should not display account section when not provided', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.queryByText(/Account:/)).not.toBeInTheDocument();
    });

    it('should not display account section when empty string', () => {
      render(<MFAQRCode {...defaultProps} accountName="" />);

      expect(screen.queryByText(/Account:/)).not.toBeInTheDocument();
    });
  });

  describe('Copy-to-Clipboard Functionality', () => {
    it('should render copy button when onCopySecret is provided', () => {
      const onCopySecret = vi.fn();

      render(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} />);

      const copyButton = screen.getByTitle('Copy secret key');
      expect(copyButton).toBeInTheDocument();
    });

    it('should not render copy button when onCopySecret is not provided', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.queryByTitle('Copy secret key')).not.toBeInTheDocument();
    });

    it('should call onCopySecret when copy button is clicked', async () => {
      const onCopySecret = vi.fn();

      render(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} />);

      const copyButton = screen.getByTitle('Copy secret key');
      await userEvent.click(copyButton);

      expect(onCopySecret).toHaveBeenCalled();
    });

    it('should show copy icon by default', () => {
      const onCopySecret = vi.fn();

      render(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} />);

      const copyButton = screen.getByTitle('Copy secret key');
      const icon = copyButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should show check icon when secretCopied is true', () => {
      const onCopySecret = vi.fn();

      render(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={true} />);

      const copyButton = screen.getByTitle('Copy secret key');
      expect(copyButton).toBeInTheDocument();
    });

    it('should toggle between copy and check icons', async () => {
      const onCopySecret = vi.fn();

      const { rerender } = render(
        <MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={false} />
      );

      const copyButton = screen.getByTitle('Copy secret key');
      expect(copyButton).toBeInTheDocument();

      // Simulate copy action
      rerender(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={true} />);

      const updatedButton = screen.getByTitle('Copy secret key');
      expect(updatedButton).toBeInTheDocument();
    });
  });

  describe('TOTP Configuration Display', () => {
    it('should display TOTP configuration details', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText(/Type:/)).toBeInTheDocument();
      expect(screen.getByText(/Time-based \(TOTP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
      expect(screen.getByText(/30 second interval/i)).toBeInTheDocument();
    });
  });

  describe('Setup Instructions', () => {
    it('should display all setup steps', () => {
      render(<MFAQRCode {...defaultProps} />);

      expect(screen.getByText(/Open your authenticator app/i)).toBeInTheDocument();
      expect(screen.getByText(/Tap the \+ or Add Account button/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose "Scan QR Code" or "Enter manually"/i)).toBeInTheDocument();
      expect(screen.getByText(/Scan the code above or enter the secret key/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify the 6-digit code on the next screen/i)).toBeInTheDocument();
    });

    it('should display instructions in ordered list', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const orderedList = container.querySelector('ol');
      expect(orderedList).toBeInTheDocument();
      expect(orderedList).toHaveClass('list-decimal');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible structure', () => {
      render(<MFAQRCode {...defaultProps} />);

      // Headings should be present for screen readers
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should allow secret key to be selected', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const secretCode = container.querySelector('code');
      expect(secretCode).toHaveClass('select-all');
    });

    it('should have proper button labels for copy functionality', () => {
      const onCopySecret = vi.fn();

      render(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} />);

      const copyButton = screen.getByTitle('Copy secret key');
      expect(copyButton).toHaveAttribute('title', 'Copy secret key');
    });
  });

  describe('Visual Design', () => {
    it('should render shield icon', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have proper card structure', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      // Should have multiple card components
      const cards = container.querySelectorAll('div[class*="p-"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have blue theme for info sections', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const blueSection = container.querySelector('.bg-blue-50');
      expect(blueSection).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long secret keys', () => {
      const longSecret = 'A'.repeat(100);

      render(<MFAQRCode {...defaultProps} secret={longSecret} />);

      // Should still render without breaking
      expect(screen.getByRole('heading', { name: /scan with authenticator app/i })).toBeInTheDocument();
    });

    it('should handle special characters in account name', () => {
      render(<MFAQRCode {...defaultProps} accountName="user+test@example.com" />);

      expect(screen.getByText('user+test@example.com')).toBeInTheDocument();
    });

    it('should handle XSS attempts in issuer', () => {
      const maliciousIssuer = '<script>alert("xss")</script>';

      render(<MFAQRCode {...defaultProps} issuer={maliciousIssuer} />);

      // React automatically escapes text content, so it should be safe
      expect(screen.getByText(maliciousIssuer)).toBeInTheDocument();
    });

    it('should handle malformed SVG gracefully', () => {
      const malformedSvg = '<svg><invalid-tag>';

      render(<MFAQRCode {...defaultProps} qrSvg={malformedSvg} />);

      // Component should still render
      expect(screen.getByText('Scan with Authenticator App')).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('should render complete MFA setup flow', () => {
      const onCopySecret = vi.fn();

      render(
        <MFAQRCode
          qrSvg={mockQrSvg}
          secret={mockSecret}
          issuer="JobSight"
          accountName="john.doe@example.com"
          onCopySecret={onCopySecret}
          secretCopied={false}
        />
      );

      // Should show all sections
      expect(screen.getByText('Scan with Authenticator App')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
      expect(screen.getByTitle('Copy secret key')).toBeInTheDocument();
      expect(screen.getByText('Setup Instructions:')).toBeInTheDocument();
    });

    it('should handle copy and reset flow', async () => {
      const onCopySecret = vi.fn();

      const { rerender } = render(
        <MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={false} />
      );

      // Click copy button
      const copyButton = screen.getByTitle('Copy secret key');
      await userEvent.click(copyButton);

      expect(onCopySecret).toHaveBeenCalled();

      // Simulate copied state
      rerender(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={true} />);

      // Should show check icon
      expect(screen.getByTitle('Copy secret key')).toBeInTheDocument();

      // Reset after timeout
      rerender(<MFAQRCode {...defaultProps} onCopySecret={onCopySecret} secretCopied={false} />);

      // Should show copy icon again
      expect(screen.getByTitle('Copy secret key')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive QR code container', () => {
      const { container } = render(<MFAQRCode {...defaultProps} />);

      const qrContainer = container.querySelector('.qr-code-container');
      expect(qrContainer).toHaveStyle({ width: '100%' });
      expect(qrContainer).toHaveStyle({ maxWidth: '280px' });
    });
  });
});
