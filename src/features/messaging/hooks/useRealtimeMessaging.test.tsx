/**
 * Unit Tests for Realtime Messaging Hooks
 *
 * Tests the Supabase Realtime hooks for:
 * - Real-time message subscriptions
 * - Typing indicators
 * - Presence tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Create mock channel with proper chaining
const createMockChannel = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
  track: vi.fn().mockResolvedValue('ok'),
  untrack: vi.fn(),
  presenceState: vi.fn().mockReturnValue({}),
})

let mockChannel = createMockChannel()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

// Mock the auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    userProfile: {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    },
  })),
}))

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useRealtimeMessages,
  useTypingIndicator,
  usePresence,
  useConversationRealtime,
} from './useRealtimeMessaging'

// Test wrapper with React Query provider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('Realtime Messaging Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel = createMockChannel()
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useRealtimeMessages', () => {
    it('should subscribe to conversation messages channel', () => {
      const { unmount } = renderHook(
        () => useRealtimeMessages('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).toHaveBeenCalledWith('messages:conv-1')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      unmount()
      expect(supabase.removeChannel).toHaveBeenCalled()
    })

    it('should not subscribe when conversation ID is empty', () => {
      renderHook(
        () => useRealtimeMessages(''),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('should not subscribe when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValueOnce({ userProfile: null } as any)

      renderHook(
        () => useRealtimeMessages('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('useTypingIndicator', () => {
    it('should subscribe to typing indicator channel', () => {
      const { unmount } = renderHook(
        () => useTypingIndicator('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).toHaveBeenCalledWith('typing:conv-1')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      unmount()
      expect(supabase.removeChannel).toHaveBeenCalled()
    })

    it('should return empty typing users initially', () => {
      const { result } = renderHook(
        () => useTypingIndicator('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(result.current.typingUsers).toEqual([])
    })

    it('should provide sendTyping function', () => {
      const { result } = renderHook(
        () => useTypingIndicator('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(typeof result.current.sendTyping).toBe('function')
    })

    it('should not subscribe when conversation ID is empty', () => {
      renderHook(
        () => useTypingIndicator(''),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('usePresence', () => {
    it('should subscribe to presence channel with config', () => {
      const { unmount } = renderHook(
        () => usePresence('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).toHaveBeenCalledWith('presence:conv-1', {
        config: {
          presence: {
            key: 'test-user-id',
          },
        },
      })
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      unmount()
      expect(supabase.removeChannel).toHaveBeenCalled()
    })

    it('should provide isUserOnline function', () => {
      const { result } = renderHook(
        () => usePresence('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(typeof result.current.isUserOnline).toBe('function')
      expect(result.current.isUserOnline('some-user-id')).toBe(false)
    })

    it('should provide getLastSeen function', () => {
      const { result } = renderHook(
        () => usePresence('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(typeof result.current.getLastSeen).toBe('function')
    })

    it('should not subscribe when conversation ID is empty', () => {
      renderHook(
        () => usePresence(''),
        { wrapper: createWrapper() }
      )

      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('useConversationRealtime', () => {
    it('should combine typing indicator and presence hooks', () => {
      const { result } = renderHook(
        () => useConversationRealtime('conv-1'),
        { wrapper: createWrapper() }
      )

      // From typing indicator
      expect(result.current).toHaveProperty('typingUsers')
      expect(result.current).toHaveProperty('sendTyping')

      // From presence
      expect(result.current).toHaveProperty('presenceState')
      expect(result.current).toHaveProperty('isUserOnline')
      expect(result.current).toHaveProperty('getLastSeen')

      // Combined
      expect(result.current).toHaveProperty('isTyping')
    })

    it('should return isTyping as false initially', () => {
      const { result } = renderHook(
        () => useConversationRealtime('conv-1'),
        { wrapper: createWrapper() }
      )

      expect(result.current.isTyping).toBe(false)
    })
  })
})
