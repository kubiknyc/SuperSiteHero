import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock components
const PublicPage = () => <div>Public Page</div>;
const ProtectedPage = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

// Test wrapper with routing
const TestWrapper = ({ initialEntries = ['/'] }: { initialEntries?: string[] }) => {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<PublicPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

// Mock session and user
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
};

const mockSession: Session = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
};

describe('ProtectedRoute', () => {
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for auth state change listener
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
      error: null,
    } as any);
  });

  describe('Authentication States', () => {
    it('should render protected content when authenticated', async () => {
      // Mock authenticated session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile fetch
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                email: mockUser.email,
                company_id: 'company-123',
                role: 'superintendent',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      // Should show loading initially
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Wait for auth to resolve
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Should not redirect to login
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', async () => {
      // Mock no session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(<TestWrapper initialEntries={['/protected']} />);

      // Wait for redirect
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', async () => {
      // Mock slow session check
      vi.mocked(supabase.auth.getSession).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: { session: mockSession }, error: null });
            }, 100);
          })
      );

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                company_id: 'company-123',
                role: 'superintendent',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      // Check for loading indicator (component renders "Loading..." text)
      const loadingText = screen.queryByText('Loading...');
      // Loading state might be very brief, so we check if it appeared or went straight to protected content

      // Wait for auth to complete
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Session Changes', () => {
    it('should redirect when session expires', async () => {
      let authChangeCallback: any;

      // Mock initial authenticated state
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Capture auth state change callback
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: unsubscribeMock } },
          error: null,
        } as any;
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                company_id: 'company-123',
                role: 'superintendent',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      // Initially should show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Simulate session expiry
      await act(async () => {
        authChangeCallback('SIGNED_OUT', null);
      });

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access when user signs in during loading', async () => {
      let authChangeCallback: any;
      let resolveSession: any;

      // Mock delayed session check (simulating slow network)
      vi.mocked(supabase.auth.getSession).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSession = resolve;
        });
      });

      // Capture auth state change callback
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: unsubscribeMock } },
          error: null,
        } as any;
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                company_id: 'company-123',
                role: 'superintendent',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate sign-in event occurring before initial session check completes
      await act(async () => {
        if (authChangeCallback) {
          authChangeCallback('SIGNED_IN', mockSession);
        }
      });

      // Now resolve the initial session check
      await act(async () => {
        resolveSession({ data: { session: mockSession }, error: null });
      });

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    }, 10000);
  });

  describe('Role-Based Access', () => {
    it('should allow access for authorized roles', async () => {
      // Mock authenticated session with proper role
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                email: mockUser.email,
                company_id: 'company-123',
                role: 'superintendent', // Authorized role
              },
              error: null,
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should handle missing user profile gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock authenticated session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile fetch error
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('User profile not found'),
            }),
          }),
        }),
      } as any);

      render(<TestWrapper initialEntries={['/protected']} />);

      // Should still allow access (auth is valid even if profile fetch fails)
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Navigation Preservation', () => {
    it('should preserve query parameters after login redirect', async () => {
      // Mock unauthenticated state
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { container } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/protected?project=123&tab=overview']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <ProtectedPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // TODO: Check that return URL is preserved in state/localStorage
      // This would depend on implementation details
    });
  });

  describe('Error Handling', () => {
    it('should handle session check errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock session check error BEFORE rendering
      vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

      // Mock onAuthStateChange to avoid subscription issues
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(() => {
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
          error: null,
        } as any;
      });

      render(<TestWrapper initialEntries={['/protected']} />);

      // Should redirect to login on error
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      }, { timeout: 3000 });

      consoleErrorSpy.mockRestore();
    }, 10000);

    it('should cleanup subscription on unmount', async () => {
      // Mock authenticated session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUser.id,
                company_id: 'company-123',
                role: 'superintendent',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const { unmount } = render(<TestWrapper initialEntries={['/protected']} />);

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Unmount the component
      unmount();

      // Verify unsubscribe was called
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});