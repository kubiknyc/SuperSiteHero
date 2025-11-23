import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { faker } from '@faker-js/faker';

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Factory functions
const mockUser = (): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  confirmed_at: faker.date.past().toISOString(),
  email_confirmed_at: faker.date.past().toISOString(),
  phone: faker.phone.number(),
  last_sign_in_at: faker.date.recent().toISOString(),
  role: 'authenticated',
});

const mockSession = (user?: User): Session => ({
  access_token: faker.string.alphanumeric(40),
  refresh_token: faker.string.alphanumeric(40),
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: user || mockUser(),
});

const mockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  company_id: faker.string.uuid(),
  role: 'superintendent',
  phone: faker.phone.number(),
  avatar_url: null,
  is_active: true,
  last_seen_at: faker.date.recent().toISOString(),
  notification_preferences: null,
  deleted_at: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

describe('AuthContext', () => {
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for onAuthStateChange
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
      error: null,
    } as any);
  });

  describe('Initial Session Loading', () => {
    it('should load session on mount', async () => {
      const user = mockUser();
      const session = mockSession(user);
      const profile = mockUserProfile({ id: user.id });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(session);
      expect(result.current.user).toEqual(user);
      expect(result.current.userProfile).toEqual(profile);
    });

    it('should handle no initial session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should handle error fetching user profile', async () => {
      const user = mockUser();
      const session = mockSession(user);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Profile not found'),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(session);
      expect(result.current.user).toEqual(user);
      expect(result.current.userProfile).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user profile:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = mockUser();
      const session = mockSession(user);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user, session },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn(email, password);
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it('should handle sign in error', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const error = new Error('Invalid login credentials');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: error as any,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.signIn(email, password);
        })
      ).rejects.toThrow('Invalid login credentials');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      const user = mockUser();
      const session = mockSession(user);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: error as any,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toThrow('Sign out failed');
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state change to signed in', async () => {
      const user = mockUser();
      const session = mockSession(user);
      const profile = mockUserProfile({ id: user.id });

      let authChangeCallback: any;

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

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
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();

      // Trigger auth state change
      act(() => {
        authChangeCallback('SIGNED_IN', session);
      });

      await waitFor(() => expect(result.current.session).toEqual(session));

      expect(result.current.user).toEqual(user);
      expect(result.current.userProfile).toEqual(profile);
    });

    it('should handle auth state change to signed out', async () => {
      const user = mockUser();
      const session = mockSession(user);
      const profile = mockUserProfile({ id: user.id });

      let authChangeCallback: any;

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });

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
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(session);
      expect(result.current.userProfile).toEqual(profile);

      // Trigger sign out
      act(() => {
        authChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => expect(result.current.session).toBeNull());

      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should unsubscribe from auth changes on unmount', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        unmount();
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected error fetching user profile', async () => {
      const user = mockUser();
      const session = mockSession(user);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(session);
      expect(result.current.user).toEqual(user);
      expect(result.current.userProfile).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error fetching user profile:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleErrorSpy.mockRestore();
    });
  });
});