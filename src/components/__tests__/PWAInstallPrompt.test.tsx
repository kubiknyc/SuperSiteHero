/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Use vi.hoisted() for mocks to ensure they're available during vi.mock() execution
const { mockUsePWAInstall, mockPromptInstall, mockDismissPrompt, mockTrackPromptShown, mockResetDismissed } = vi.hoisted(() => {
  const promptInstall = vi.fn();
  const dismissPrompt = vi.fn();
  const trackPromptShown = vi.fn();
  const resetDismissed = vi.fn();
  const usePWAInstall = vi.fn();
  return {
    mockUsePWAInstall: usePWAInstall,
    mockPromptInstall: promptInstall,
    mockDismissPrompt: dismissPrompt,
    mockTrackPromptShown: trackPromptShown,
    mockResetDismissed: resetDismissed,
  };
});

const defaultPWAHookValues = {
  shouldShowBanner: true,
  isInstallable: true,
  isInstalled: false,
  isStandalone: false,
  isIOS: false,
  isDismissed: false,
  promptInstall: mockPromptInstall,
  dismissPrompt: mockDismissPrompt,
  trackPromptShown: mockTrackPromptShown,
  resetDismissed: mockResetDismissed,
};

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: mockUsePWAInstall,
}));

// Import after mocks are set up
import {
  ShareIcon,
  IOSInstallInstructions,
  PWAInstallBanner,
  PWAInstallButton,
  PWAInstallIndicator,
} from '../PWAInstallPrompt';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

vi.mock('@/components/brand', () => ({
  LogoIcon: ({ className }: any) => <div className={className} data-testid="logo-icon">Logo</div>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className }: any) => <span className={className} data-testid="icon-x">X</span>,
  Download: ({ className }: any) => <span className={className} data-testid="icon-download">Download</span>,
  Plus: ({ className }: any) => <span className={className} data-testid="icon-plus">+</span>,
  Smartphone: ({ className }: any) => <span className={className} data-testid="icon-smartphone">Smartphone</span>,
  Monitor: ({ className }: any) => <span className={className} data-testid="icon-monitor">Monitor</span>,
  CheckCircle2: ({ className }: any) => <span className={className} data-testid="icon-check-circle">Check</span>,
  Info: ({ className }: any) => <span className={className} data-testid="icon-info">Info</span>,
}));

describe('PWAInstallPrompt Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set default mock return value
    mockUsePWAInstall.mockReturnValue(defaultPWAHookValues);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('ShareIcon', () => {
    it('renders SVG with correct attributes', () => {
      const { container } = render(<ShareIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('applies custom className', () => {
      const { container } = render(<ShareIcon className="custom-class" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('custom-class');
    });

    it('includes default h-4 w-4 classes', () => {
      const { container } = render(<ShareIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('renders share icon path elements', () => {
      const { container } = render(<ShareIcon />);
      const paths = container.querySelectorAll('path, polyline, line');

      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('IOSInstallInstructions', () => {
    describe('Basic Rendering', () => {
      it('renders all three instruction steps', () => {
        render(<IOSInstallInstructions />);

        expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
        expect(screen.getByText(/Share button in Safari/i)).toBeInTheDocument();
        expect(screen.getByText(/Scroll and tap/i)).toBeInTheDocument();
        expect(screen.getByText(/"Add to Home Screen"/i)).toBeInTheDocument();
        expect(screen.getByText(/Tap "Add" in the top right to install/i)).toBeInTheDocument();
      });

      it('renders numbered step indicators', () => {
        const { container } = render(<IOSInstallInstructions />);

        expect(container.textContent).toContain('1');
        expect(container.textContent).toContain('2');
        expect(container.textContent).toContain('3');
      });

      it('renders Safari requirement info box', () => {
        render(<IOSInstallInstructions />);

        expect(screen.getByText(/You must use Safari on iOS to install web apps/i)).toBeInTheDocument();
        expect(screen.getByTestId('icon-info')).toBeInTheDocument();
      });

      it('applies custom className', () => {
        const { container } = render(<IOSInstallInstructions className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    describe('Header with Close Button', () => {
      it('shows header when onClose is provided', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        expect(screen.getByText('Install on iOS')).toBeInTheDocument();
        expect(screen.getByTestId('icon-smartphone')).toBeInTheDocument();
      });

      it('does not show header when onClose is not provided', () => {
        render(<IOSInstallInstructions />);

        expect(screen.queryByText('Install on iOS')).not.toBeInTheDocument();
      });

      it('calls onClose when close button is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        const closeButton = screen.getByRole('button', { name: /close instructions/i });
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('renders close button with X icon', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        const closeButton = screen.getByRole('button', { name: /close instructions/i });
        expect(closeButton).toBeInTheDocument();
        expect(screen.getByTestId('icon-x')).toBeInTheDocument();
      });
    });

    describe('Compact Mode', () => {
      it('applies smaller text classes in compact mode', () => {
        const { container } = render(<IOSInstallInstructions compact={true} />);
        const list = container.querySelector('ol');

        expect(list).toHaveClass('text-xs');
      });

      it('uses regular text classes in non-compact mode', () => {
        const { container } = render(<IOSInstallInstructions compact={false} />);
        const list = container.querySelector('ol');

        expect(list).toHaveClass('text-sm');
      });

      it('renders smaller step indicators in compact mode', () => {
        const { container } = render(<IOSInstallInstructions compact={true} />);
        const stepIndicator = container.querySelector('.w-5.h-5');

        expect(stepIndicator).toBeInTheDocument();
      });

      it('renders larger step indicators in non-compact mode', () => {
        const { container } = render(<IOSInstallInstructions compact={false} />);
        const stepIndicator = container.querySelector('.w-6.h-6');

        expect(stepIndicator).toBeInTheDocument();
      });
    });

    describe('Don\'t Show Again Functionality', () => {
      it('shows "don\'t show again" checkbox by default', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        expect(screen.getByRole('checkbox', { name: /don't show again/i })).toBeInTheDocument();
      });

      it('hides "don\'t show again" when showDontShowAgain is false', () => {
        render(<IOSInstallInstructions showDontShowAgain={false} />);

        expect(screen.queryByRole('checkbox', { name: /don't show again/i })).not.toBeInTheDocument();
      });

      it('updates checkbox state when clicked', async () => {
        const user = userEvent.setup({ delay: null });
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);
        expect(checkbox).toBeChecked();
      });

      it('calls onDontShowAgain when checkbox is checked and Close is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        const onClose = vi.fn();
        const onDontShowAgain = vi.fn();
        render(
          <IOSInstallInstructions
            onClose={onClose}
            onDontShowAgain={onDontShowAgain}
          />
        );

        const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
        await user.click(checkbox);

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(onDontShowAgain).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('does not call onDontShowAgain when checkbox is unchecked and Close is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        const onClose = vi.fn();
        const onDontShowAgain = vi.fn();
        render(
          <IOSInstallInstructions
            onClose={onClose}
            onDontShowAgain={onDontShowAgain}
          />
        );

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(onDontShowAgain).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('shows Close button when onClose is provided', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });
    });

    describe('Icons and Styling', () => {
      it('renders ShareIcon in step 1', () => {
        const { container } = render(<IOSInstallInstructions />);
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
      });

      it('renders Plus icon in step 2', () => {
        render(<IOSInstallInstructions />);

        expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
      });

      it('applies dark mode classes to step indicators', () => {
        const { container } = render(<IOSInstallInstructions />);
        const stepIndicators = container.querySelectorAll('.bg-primary-100');

        expect(stepIndicators.length).toBeGreaterThan(0);
      });

      it('applies primary colors to info box', () => {
        const { container } = render(<IOSInstallInstructions />);
        const infoBox = container.querySelector('.bg-primary-50');

        expect(infoBox).toBeInTheDocument();
      });
    });

    describe('Accessibility', () => {
      it('uses ordered list for steps', () => {
        const { container } = render(<IOSInstallInstructions />);
        const orderedList = container.querySelector('ol');

        expect(orderedList).toBeInTheDocument();
      });

      it('provides accessible close button label', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        expect(screen.getByRole('button', { name: /close instructions/i })).toBeInTheDocument();
      });

      it('associates label with checkbox using htmlFor', () => {
        const onClose = vi.fn();
        render(<IOSInstallInstructions onClose={onClose} />);

        const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
        expect(checkbox).toHaveAttribute('id', 'dont-show-ios');
      });
    });
  });

  describe('PWAInstallBanner', () => {
    describe('Visibility and Animation', () => {
      it('does not render when shouldShowBanner is false', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: false,
        });

        render(<PWAInstallBanner />);

        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
      });

      it('renders when shouldShowBanner is true', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);
        vi.runAllTimers(); // Trigger visibility timer

        expect(screen.getByTestId('card')).toBeInTheDocument();
      });

      it('calls trackPromptShown after delay when showing', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(mockTrackPromptShown).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);

        expect(mockTrackPromptShown).toHaveBeenCalledTimes(1);
      });

      it('applies bottom position by default', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        const { container } = render(<PWAInstallBanner />);
        const wrapper = container.firstChild;

        expect(wrapper).toHaveClass('bottom-0');
      });

      it('applies top position when position="top"', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        const { container } = render(<PWAInstallBanner position="top" />);
        const wrapper = container.firstChild;

        expect(wrapper).toHaveClass('top-0');
      });

      it('applies custom className', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        const { container } = render(<PWAInstallBanner className="custom-class" />);
        const wrapper = container.firstChild;

        expect(wrapper).toHaveClass('custom-class');
      });
    });

    describe('Content Rendering', () => {
      it('renders logo icon', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByTestId('logo-icon')).toBeInTheDocument();
      });

      it('renders "Install JobSight" title', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByText('Install JobSight')).toBeInTheDocument();
      });

      it('renders description with benefits', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByText(/quick access, offline support/i)).toBeInTheDocument();
      });

      it('renders Install App button with download icon', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
        expect(screen.getByTestId('icon-download')).toBeInTheDocument();
      });

      it('renders "Not now" dismiss button', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
      });

      it('renders dismiss X button', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
      });

      it('renders "don\'t show again" checkbox', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByRole('checkbox', { name: /don't show again/i })).toBeInTheDocument();
      });
    });

    describe('Install Flow - Non-iOS', () => {
      it('calls promptInstall when Install App is clicked on non-iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
          isIOS: false,
        });

        render(<PWAInstallBanner />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      });

      it('does not show iOS instructions on non-iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
          isIOS: false,
        });

        render(<PWAInstallBanner />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        expect(screen.queryByText(/Tap the/i)).not.toBeInTheDocument();
      });
    });

    describe('Install Flow - iOS', () => {
      it('shows iOS instructions when Install App is clicked on iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
          isIOS: true,
        });

        render(<PWAInstallBanner />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        await waitFor(() => {
          expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
        });
      });

      it('calls analytics callback when iOS instructions are shown', async () => {
        const user = userEvent.setup({ delay: null });
        const onAnalyticsEvent = vi.fn();
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
          isIOS: true,
        });

        render(<PWAInstallBanner onAnalyticsEvent={onAnalyticsEvent} />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        expect(onAnalyticsEvent).toHaveBeenCalledWith('pwa_ios_instructions_shown', { source: 'banner' });
      });

      it('does not call promptInstall on iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
          isIOS: true,
        });

        render(<PWAInstallBanner />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        expect(mockPromptInstall).not.toHaveBeenCalled();
      });
    });

    describe('Dismiss Functionality', () => {
      it('calls dismissPrompt when "Not now" is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        const notNowButton = screen.getByRole('button', { name: /not now/i });
        await user.click(notNowButton);

        vi.advanceTimersByTime(300); // Animation delay

        expect(mockDismissPrompt).toHaveBeenCalledWith(false);
      });

      it('calls dismissPrompt when X button is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        await user.click(dismissButton);

        vi.advanceTimersByTime(300);

        expect(mockDismissPrompt).toHaveBeenCalledWith(false);
      });

      it('dismisses permanently when "don\'t show again" is checked', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
        await user.click(checkbox);

        const notNowButton = screen.getByRole('button', { name: /not now/i });
        await user.click(notNowButton);

        vi.advanceTimersByTime(300);

        expect(mockDismissPrompt).toHaveBeenCalledWith(true);
      });
    });

    describe('Dark Mode Support', () => {
      it('applies dark mode classes to card', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        const { container } = render(<PWAInstallBanner />);
        const card = container.querySelector('[data-testid="card"]');

        expect(card).toHaveClass('dark:bg-background', 'dark:border-gray-700');
      });
    });

    describe('Accessibility', () => {
      it('provides aria-label for dismiss button', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          shouldShowBanner: true,
        });

        render(<PWAInstallBanner />);

        expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
      });
    });
  });

  describe('PWAInstallButton', () => {
    describe('Installed State', () => {
      it('shows installed state when isInstalled is true', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstalled: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText('App Installed')).toBeInTheDocument();
        expect(screen.getByText(/JobSight is installed on your device/i)).toBeInTheDocument();
      });

      it('shows installed state when isStandalone is true', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isStandalone: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText('App Installed')).toBeInTheDocument();
      });

      it('renders CheckCircle icon in installed state', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstalled: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
      });

      it('shows running in standalone mode status', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstalled: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText(/Running in standalone mode/i)).toBeInTheDocument();
      });

      it('shows app version', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstalled: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText(/Version:/i)).toBeInTheDocument();
      });

      it('applies green border in installed state', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstalled: true,
        });

        const { container } = render(<PWAInstallButton />);
        const card = container.querySelector('[data-testid="card"]');

        expect(card).toHaveClass('border-green-200', 'dark:border-green-800');
      });
    });

    describe('iOS Instructions State', () => {
      it('shows iOS instructions when clicked on iOS device', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isIOS: true,
          isInstallable: true,
        });

        render(<PWAInstallButton />);

        const installButton = screen.getByRole('button', { name: /how to install/i });
        await user.click(installButton);

        await waitFor(() => {
          expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
        });
      });

      it('calls analytics callback when iOS instructions are shown', async () => {
        const user = userEvent.setup({ delay: null });
        const onAnalyticsEvent = vi.fn();
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isIOS: true,
          isInstallable: true,
        });

        render(<PWAInstallButton onAnalyticsEvent={onAnalyticsEvent} />);

        const installButton = screen.getByRole('button', { name: /how to install/i });
        await user.click(installButton);

        expect(onAnalyticsEvent).toHaveBeenCalledWith('pwa_ios_instructions_shown', { source: 'settings' });
      });

      it('does not show "don\'t show again" in iOS instructions', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isIOS: true,
          isInstallable: true,
        });

        render(<PWAInstallButton />);

        const installButton = screen.getByRole('button', { name: /how to install/i });
        await user.click(installButton);

        await waitFor(() => {
          expect(screen.queryByRole('checkbox', { name: /don't show again/i })).not.toBeInTheDocument();
        });
      });
    });

    describe('Not Installable State', () => {
      it('shows not installable state when not installable and not iOS', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText(/Your browser may not support PWA installation/i)).toBeInTheDocument();
      });

      it('shows "Show Install Prompt" button in not installable state', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByRole('button', { name: /show install prompt/i })).toBeInTheDocument();
      });

      it('calls resetDismissed when "Show Install Prompt" is clicked', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        const showPromptButton = screen.getByRole('button', { name: /show install prompt/i });
        await user.click(showPromptButton);

        expect(mockResetDismissed).toHaveBeenCalledTimes(1);
      });

      it('shows supported browsers info', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText(/Chrome 67\+, Edge 79\+, Safari 11.1\+/i)).toBeInTheDocument();
      });

      it('renders Monitor icon in not installable state', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByTestId('icon-monitor')).toBeInTheDocument();
      });
    });

    describe('Installable State', () => {
      it('shows install button when installable on non-iOS', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
      });

      it('shows "How to Install" button on iOS', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isIOS: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByRole('button', { name: /how to install/i })).toBeInTheDocument();
      });

      it('calls promptInstall when Install App is clicked on non-iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        const installButton = screen.getByRole('button', { name: /install app/i });
        await user.click(installButton);

        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      });

      it('renders logo icon on non-iOS', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isIOS: false,
        });

        render(<PWAInstallButton />);

        expect(screen.getByTestId('logo-icon')).toBeInTheDocument();
      });

      it('renders smartphone icon on iOS', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isIOS: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByTestId('icon-smartphone')).toBeInTheDocument();
      });

      it('shows benefits description', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
        });

        render(<PWAInstallButton />);

        expect(screen.getByText(/quick access from your home screen, offline support/i)).toBeInTheDocument();
      });
    });

    describe('Styling', () => {
      it('applies custom className', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
        });

        const { container } = render(<PWAInstallButton className="custom-class" />);
        const card = container.querySelector('[data-testid="card"]');

        expect(card).toHaveClass('custom-class');
      });

      it('applies primary border in installable state', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
        });

        const { container } = render(<PWAInstallButton />);
        const card = container.querySelector('[data-testid="card"]');

        expect(card).toHaveClass('border-primary-200', 'dark:border-primary-800');
      });
    });
  });

  describe('PWAInstallIndicator', () => {
    describe('Visibility', () => {
      it('does not render when not installable', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: false,
        });

        render(<PWAInstallIndicator />);

        expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
      });

      it('does not render when dismissed', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: true,
        });

        render(<PWAInstallIndicator />);

        expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
      });

      it('renders when installable and not dismissed', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
        });

        render(<PWAInstallIndicator />);

        expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
      });
    });

    describe('Button Rendering', () => {
      it('renders download icon', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
        });

        render(<PWAInstallIndicator />);

        expect(screen.getByTestId('icon-download')).toBeInTheDocument();
      });

      it('renders pulse indicator dot', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
        });

        const { container } = render(<PWAInstallIndicator />);
        const pulseDot = container.querySelector('.animate-pulse');

        expect(pulseDot).toBeInTheDocument();
      });

      it('applies custom className', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
        });

        const { container } = render(<PWAInstallIndicator className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    describe('Install Flow - Non-iOS', () => {
      it('calls promptInstall when clicked on non-iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: false,
        });

        render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      });

      it('does not show tooltip on non-iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: false,
        });

        render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        expect(screen.queryByText(/Tap the/i)).not.toBeInTheDocument();
      });
    });

    describe('Install Flow - iOS', () => {
      it('shows iOS instructions tooltip when clicked on iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: true,
        });

        render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        await waitFor(() => {
          expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
        });
      });

      it('calls analytics callback when iOS tooltip is shown', async () => {
        const user = userEvent.setup({ delay: null });
        const onAnalyticsEvent = vi.fn();
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: true,
        });

        render(<PWAInstallIndicator onAnalyticsEvent={onAnalyticsEvent} />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        expect(onAnalyticsEvent).toHaveBeenCalledWith('pwa_ios_instructions_shown', { source: 'indicator' });
      });

      it('does not call promptInstall on iOS', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: true,
        });

        render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        expect(mockPromptInstall).not.toHaveBeenCalled();
      });

      it('renders compact iOS instructions in tooltip', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: true,
        });

        const { container } = render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        await waitFor(() => {
          const tooltip = container.querySelector('.animate-in');
          expect(tooltip).toBeInTheDocument();
        });
      });

      it('allows dismissing iOS tooltip permanently', async () => {
        const user = userEvent.setup({ delay: null });
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
          isIOS: true,
        });

        render(<PWAInstallIndicator />);

        const button = screen.getByRole('button', { name: /install app/i });
        await user.click(button);

        await waitFor(() => {
          expect(screen.getByRole('checkbox', { name: /don't show again/i })).toBeInTheDocument();
        });

        const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
        await user.click(checkbox);

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(mockDismissPrompt).toHaveBeenCalledWith(true);
      });
    });

    describe('Accessibility', () => {
      it('provides aria-label for install button', () => {
        mockUsePWAInstall.mockReturnValue({
          ...defaultPWAHookValues,
          isInstallable: true,
          isDismissed: false,
        });

        render(<PWAInstallIndicator />);

        expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
      });
    });
  });
});
