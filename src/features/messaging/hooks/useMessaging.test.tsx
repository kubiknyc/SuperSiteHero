/**
 * Unit Tests for Messaging React Query Hooks
 *
 * Tests the messaging hooks for:
 * - Conversations (list, detail, create)
 * - Messages (list, send, edit, delete)
 * - Reactions
 * - Unread counts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Mock the messaging API
vi.mock('@/lib/api/services/messaging', () => ({
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  addParticipants: vi.fn(),
  removeParticipant: vi.fn(),
  getOrCreateDirectConversation: vi.fn(),
  searchMessages: vi.fn(),
  leaveConversation: vi.fn(),
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

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import * as messagingApi from '@/lib/api/services/messaging'
import { useAuth } from '@/lib/auth/AuthContext'
import { toast } from 'react-hot-toast'
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useMarkAsRead,
  useAddReaction,
  useRemoveReaction,
  useTotalUnreadCount,
  useSearchMessages,
  messagingKeys,
} from './useMessaging'

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

// Mock data factories
const mockConversation = (overrides = {}) => ({
  id: 'conv-1',
  type: 'direct' as const,
  name: null,
  created_by: 'test-user-id',
  project_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  participants: [
    { user_id: 'test-user-id', joined_at: new Date().toISOString() },
    { user_id: 'other-user-id', joined_at: new Date().toISOString() },
  ],
  last_message: null,
  unread_count: 0,
  ...overrides,
})

const mockMessage = (overrides = {}) => ({
  id: 'msg-1',
  conversation_id: 'conv-1',
  sender_id: 'test-user-id',
  content: 'Hello world',
  content_type: 'text' as const,
  attachments: [],
  mentions: [],
  parent_message_id: null,
  is_edited: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sender: { id: 'test-user-id', first_name: 'Test', last_name: 'User', email: 'test@example.com' },
  reactions: [],
  read_receipts: [],
  ...overrides,
})

describe('Messaging Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('messagingKeys', () => {
    it('should generate correct query keys', () => {
      expect(messagingKeys.all).toEqual(['messaging'])
      expect(messagingKeys.conversations()).toEqual(['messaging', 'conversations'])
      expect(messagingKeys.conversation('conv-1')).toEqual(['messaging', 'conversations', 'detail', 'conv-1'])
      expect(messagingKeys.messages()).toEqual(['messaging', 'messages'])
      expect(messagingKeys.messagesInfinite('conv-1')).toEqual(['messaging', 'messages', 'infinite', 'conv-1'])
      expect(messagingKeys.unreadCount('user-1')).toEqual(['messaging', 'unread', 'user-1'])
      expect(messagingKeys.totalUnread('user-1')).toEqual(['messaging', 'totalUnread', 'user-1'])
      expect(messagingKeys.search('hello')).toEqual(['messaging', 'search', 'hello'])
    })

    it('should include filters in conversation list key', () => {
      const filters = { type: 'group' as const }
      expect(messagingKeys.conversationsList(filters)).toEqual(['messaging', 'conversations', 'list', filters])
    })
  })

  describe('useConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockData = [mockConversation(), mockConversation({ id: 'conv-2' })]
      vi.mocked(messagingApi.getConversations).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
      expect(messagingApi.getConversations).toHaveBeenCalledWith('test-user-id', undefined)
    })

    it('should fetch conversations with filters', async () => {
      const filters = { type: 'group' as const }
      const mockData = [mockConversation({ type: 'group' })]
      vi.mocked(messagingApi.getConversations).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useConversations(filters), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(messagingApi.getConversations).toHaveBeenCalledWith('test-user-id', filters)
    })

    it('should handle error', async () => {
      const error = new Error('Failed to fetch conversations')
      vi.mocked(messagingApi.getConversations).mockResolvedValueOnce({ data: null, error })

      const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
    })

    it('should not fetch when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValueOnce({ userProfile: null } as any)

      const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isFetching).toBe(false)
      expect(messagingApi.getConversations).not.toHaveBeenCalled()
    })
  })

  describe('useConversation', () => {
    it('should fetch a single conversation', async () => {
      const mockData = mockConversation()
      vi.mocked(messagingApi.getConversation).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useConversation('conv-1'), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
      expect(messagingApi.getConversation).toHaveBeenCalledWith('conv-1', 'test-user-id')
    })

    it('should not fetch when conversation ID is undefined', async () => {
      const { result } = renderHook(() => useConversation(undefined), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(messagingApi.getConversation).not.toHaveBeenCalled()
    })
  })

  describe('useCreateConversation', () => {
    it('should create a direct conversation', async () => {
      const mockData = mockConversation()
      vi.mocked(messagingApi.createConversation).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          type: 'direct',
          participant_ids: ['other-user-id'],
        })
      })

      expect(messagingApi.createConversation).toHaveBeenCalledWith('test-user-id', {
        type: 'direct',
        participant_ids: ['other-user-id'],
      })
      expect(toast.success).toHaveBeenCalledWith('Conversation started')
    })

    it('should create a group conversation', async () => {
      const mockData = mockConversation({ type: 'group' })
      vi.mocked(messagingApi.createConversation).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          type: 'group',
          participant_ids: ['user-1', 'user-2'],
          name: 'Test Group',
        })
      })

      expect(toast.success).toHaveBeenCalledWith('Group created')
    })

    it('should handle create error', async () => {
      const error = new Error('Failed to create')
      vi.mocked(messagingApi.createConversation).mockResolvedValueOnce({ data: null, error })

      const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            type: 'direct',
            participant_ids: ['other-user-id'],
          })
        } catch (e) {
          // Expected
        }
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to create conversation: Failed to create')
    })
  })

  describe('useMessages', () => {
    it('should fetch messages for a conversation', async () => {
      const mockData = [mockMessage(), mockMessage({ id: 'msg-2' })]
      vi.mocked(messagingApi.getMessages).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useMessages('conv-1'), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('should not fetch when conversation ID is empty', async () => {
      const { result } = renderHook(() => useMessages(''), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(messagingApi.getMessages).not.toHaveBeenCalled()
    })
  })

  describe('useSendMessage', () => {
    it('should send a message successfully', async () => {
      const mockData = mockMessage()
      vi.mocked(messagingApi.sendMessage).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv-1',
          message: {
            content: 'Hello world',
            content_type: 'text',
          },
        })
      })

      expect(messagingApi.sendMessage).toHaveBeenCalled()
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Network error')
      vi.mocked(messagingApi.sendMessage).mockResolvedValueOnce({ data: null, error })

      const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            conversationId: 'conv-1',
            message: { content: 'Hello', content_type: 'text' },
          })
        } catch (e) {
          // Expected
        }
      })

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('useEditMessage', () => {
    it('should edit a message', async () => {
      const mockData = mockMessage({ content: 'Updated', is_edited: true })
      vi.mocked(messagingApi.editMessage).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useEditMessage(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          content: 'Updated',
        })
      })

      expect(messagingApi.editMessage).toHaveBeenCalledWith('msg-1', 'test-user-id', 'Updated')
    })
  })

  describe('useDeleteMessage', () => {
    it('should delete a message', async () => {
      vi.mocked(messagingApi.deleteMessage).mockResolvedValueOnce({ data: true, error: null })

      const { result } = renderHook(() => useDeleteMessage(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv-1',
          messageId: 'msg-1',
        })
      })

      expect(messagingApi.deleteMessage).toHaveBeenCalledWith('msg-1', 'test-user-id')
    })
  })

  describe('useMarkAsRead', () => {
    it('should mark messages as read', async () => {
      vi.mocked(messagingApi.markAsRead).mockResolvedValueOnce({ data: true, error: null })

      const { result } = renderHook(() => useMarkAsRead(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync('conv-1')
      })

      expect(messagingApi.markAsRead).toHaveBeenCalledWith('conv-1', 'test-user-id')
    })
  })

  describe('useAddReaction', () => {
    it('should add a reaction to a message', async () => {
      const mockReaction = {
        id: 'reaction-1',
        message_id: 'msg-1',
        user_id: 'test-user-id',
        emoji: '👍',
        created_at: new Date().toISOString(),
      }
      vi.mocked(messagingApi.addReaction).mockResolvedValueOnce({ data: mockReaction, error: null })

      const { result } = renderHook(() => useAddReaction(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          emoji: '👍',
        })
      })

      expect(messagingApi.addReaction).toHaveBeenCalledWith('msg-1', 'test-user-id', '👍')
    })
  })

  describe('useRemoveReaction', () => {
    it('should remove a reaction from a message', async () => {
      vi.mocked(messagingApi.removeReaction).mockResolvedValueOnce({ data: true, error: null })

      const { result } = renderHook(() => useRemoveReaction(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv-1',
          messageId: 'msg-1',
        })
      })

      expect(messagingApi.removeReaction).toHaveBeenCalledWith('msg-1', 'test-user-id')
    })
  })

  describe('useTotalUnreadCount', () => {
    it('should fetch total unread count', async () => {
      vi.mocked(messagingApi.getUnreadCount).mockResolvedValueOnce({ data: 5, error: null })

      const { result } = renderHook(() => useTotalUnreadCount(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(5)
      expect(messagingApi.getUnreadCount).toHaveBeenCalledWith('test-user-id')
    })

    it('should handle error', async () => {
      const error = new Error('Failed to get count')
      vi.mocked(messagingApi.getUnreadCount).mockResolvedValueOnce({ data: 0, error })

      const { result } = renderHook(() => useTotalUnreadCount(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useSearchMessages', () => {
    it('should search messages', async () => {
      const mockData = [mockMessage({ content: 'Hello world' })]
      vi.mocked(messagingApi.searchMessages).mockResolvedValueOnce({ data: mockData, error: null })

      const { result } = renderHook(() => useSearchMessages('hello'), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('should not search when query is empty', async () => {
      const { result } = renderHook(() => useSearchMessages(''), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(messagingApi.searchMessages).not.toHaveBeenCalled()
    })
  })
})
