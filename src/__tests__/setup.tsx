import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { vi, afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): any[] {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock window.screen.orientation
Object.defineProperty(window.screen, 'orientation', {
  writable: true,
  configurable: true,
  value: {
    angle: 0,
    type: 'landscape-primary',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    lock: vi.fn().mockResolvedValue(undefined),
    unlock: vi.fn(),
  },
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock @/ path alias imports (for Vitest Windows path resolution issue)
// These mocks allow components to import from @/ paths in tests

// Mock utility functions - use real clsx and twMerge for proper functionality
vi.mock('@/lib/utils', async () => {
  const { clsx } = await import('clsx');
  const { twMerge } = await import('tailwind-merge');

  return {
    cn: (...inputs: any[]) => twMerge(clsx(inputs)),
    formatDate: (date: any) => date ? new Date(date).toLocaleDateString() : '-',
    formatCurrency: (amount: any) => amount !== null && amount !== undefined ? `$${amount}` : '-',
  };
});

// Mock UI components
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <option {...props}>{children}</option>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: (props: any) => <input type="checkbox" role="switch" {...props} />,
}));

// Mock form components (forward to actual files using relative paths)
vi.mock('@/components/ui/form-field', async () => {
  const mod = await import('../components/ui/form-field');
  return mod;
});

vi.mock('@/components/ui/form-error', async () => {
  const mod = await import('../components/ui/form-error');
  return mod;
});

// Mock hooks and stores (already mocked in test files, but need global fallback)
vi.mock('@/features/daily-reports/store/offlineReportStore', () => ({
  useOfflineReportStore: vi.fn(),
}));

vi.mock('@/features/daily-reports/hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(() => ({
    syncStatus: 'idle',
    syncError: null,
    isOnline: true,
    hasPendingSync: false,
    pendingSyncCount: 0,
    manualSync: vi.fn(),
  })),
}));

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: vi.fn(),
  useMyProjects: vi.fn(),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/features/daily-reports/components/DailyReportForm', () => ({
  DailyReportForm: (props: any) => <div data-testid="daily-report-form">{JSON.stringify(props)}</div>,
}));

// Mock lucide-react icons - use a proxy to return an icon component for any icon name
vi.mock('lucide-react', async (importOriginal) => {
  const Icon = (props: any) => <svg {...props} data-testid={props['data-testid'] || 'icon'} />;
  const actual = await importOriginal() as Record<string, any>;

  // Create a proxy that returns the Icon component for any accessed property
  return new Proxy(actual, {
    get(target, prop) {
      // If it's a symbol or special property, return the original
      if (typeof prop === 'symbol' || prop === 'default' || prop === '__esModule') {
        return (target as Record<string | symbol, unknown>)[prop];
      }
      // For any icon name, return our mock Icon component
      return Icon;
    },
  });
});
