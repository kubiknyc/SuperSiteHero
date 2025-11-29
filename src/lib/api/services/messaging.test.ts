/**
 * Tests for Messaging System API Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as messagingService from './messaging'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock data
const mockUserId = 'user-123'
const mockOtherUserId = 'user-456'
const mockConversationId = 'conv-123'
const mockMessageId = 'msg-123'
const mockReactionId = 'react-123'

const mockConversation = {
  id: mockConversationId,
  type: 'group',
  name: 'Test Conversation',
  project_id: null,
  created_by: mockUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_message_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  participants: [
    {
      id: 'part-1',
      conversation_id: mockConversationId,
      user_id: mockUserId,
      joined_at: '2024-01-01T00:00:00Z',
      left_at: null,
      last_read_at: null,
      is_muted: false,
      role: 'admin',
    },
  ],
}

const mockMessage = {
  id: mockMessageId,
  conversation_id: mockConversationId,
  sender_id: mockUserId,
  content: 'Hello, world!',
  message_type: 'text',
  attachments: null,
  mentioned_users: null,
  parent_message_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  edited_at: null,
}

const mockParticipant = {
  id: 'part-1',
  conversation_id: mockConversationId,
  user_id: mockUserId,
  joined_at: '2024-01-01T00:00:00Z',
  left_at: null,
  last_read_at: null,
  is_muted: false,
  role: 'admin',
}

const mockReaction = {
  id: mockReactionId,
  message_id: mockMessageId,
  user_id: mockUserId,
  emoji: '👍',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock Supabase chain
let mockSupabaseChain: any

beforeEach(() => {
  mockSupabaseChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    then: vi.fn(),
  }

  vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain)
  vi.mocked(supabase.rpc).mockReturnValue(mockSupabaseChain)
})

// =====================================================
// CONVERSATION TESTS
// =====================================================

describe('Conversation Methods', () => {
  describe('getConversations', () => {
    it('should fetch conversations for user', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockConversation], error: null }).then(onFulfilled)
      )

      const result = await messagingService.getConversations(mockUserId)

      expect(result.data).toEqual([mockConversation])
      expect(result.error).toBeNull()
      expect(supabase.from).toHaveBeenCalledWith('conversations')
      expect(mockSupabaseChain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should apply type filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockConversation], error: null }).then(onFulfilled)
      )

      await messagingService.getConversations(mockUserId, { type: 'group' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('type', 'group')
    })

    it('should apply project filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockConversation], error: null }).then(onFulfilled)
      )

      await messagingService.getConversations(mockUserId, { project_id: 'proj-1' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    })

    it('should apply search filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockConversation], error: null }).then(onFulfilled)
      )

      await messagingService.getConversations(mockUserId, { search: 'test' })

      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith('name', '%test%')
    })

    it('should apply pagination', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockConversation], error: null }).then(onFulfilled)
      )

      await messagingService.getConversations(mockUserId, { limit: 20, offset: 10 })

      expect(mockSupabaseChain.range).toHaveBeenCalledWith(10, 29)
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error }).then(onFulfilled)
      )

      const result = await messagingService.getConversations(mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(error)
    })
  })

  describe('getConversation', () => {
    it('should fetch single conversation', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock conversation fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockConversation, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getConversation(mockConversationId, mockUserId)

      expect(result.data).toEqual(mockConversation)
      expect(result.error).toBeNull()
    })

    it('should return error if user not a participant', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getConversation(mockConversationId, mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('Not authorized')
    })
  })

  describe('createConversation', () => {
    it('should create group conversation', async () => {
      // Mock conversation creation
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockConversation, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock adding creator as admin
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.createConversation(mockUserId, {
        type: 'group',
        name: 'Test Group',
        participant_ids: [],
      })

      expect(result.data).toEqual(mockConversation)
      expect(result.error).toBeNull()
      expect(supabase.from).toHaveBeenCalledWith('conversations')
      expect(supabase.from).toHaveBeenCalledWith('conversation_participants')
    })

    it('should add initial participants', async () => {
      // Mock conversation creation
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockConversation, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock adding creator
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock adding other participants
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        ),
      } as any)

      await messagingService.createConversation(mockUserId, {
        type: 'group',
        name: 'Test Group',
        participant_ids: [mockOtherUserId],
      })

      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })
  })

  describe('getOrCreateDirectConversation', () => {
    it('should call database function', async () => {
      vi.mocked(supabase.rpc).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockConversation, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getOrCreateDirectConversation(
        mockUserId,
        mockOtherUserId
      )

      expect(result.data).toEqual(mockConversation)
      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_direct_conversation', {
        p_user_id_1: mockUserId,
        p_user_id_2: mockOtherUserId,
      })
    })
  })

  describe('updateConversation', () => {
    it('should update conversation name', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock update
      const updatedConv = { ...mockConversation, name: 'New Name' }
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: updatedConv, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.updateConversation(
        mockConversationId,
        mockUserId,
        { name: 'New Name' }
      )

      expect(result.data?.name).toBe('New Name')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ name: 'New Name' })
    })
  })

  describe('addParticipants', () => {
    it('should add new participants', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { role: 'admin' }, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock existing participants check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock insert
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockParticipant], error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.addParticipants(
        mockConversationId,
        mockUserId,
        [mockOtherUserId]
      )

      expect(result.data).toEqual([mockParticipant])
    })

    it('should require admin role', async () => {
      // Mock non-admin check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { role: 'member' }, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.addParticipants(
        mockConversationId,
        mockUserId,
        [mockOtherUserId]
      )

      expect(result.error?.message).toContain('Only admins')
    })
  })

  describe('removeParticipant', () => {
    it('should remove participant as admin', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { role: 'admin' }, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock update
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.removeParticipant(
        mockConversationId,
        mockUserId,
        mockOtherUserId
      )

      expect(result.data).toBe(true)
      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })

    it('should prevent removing self', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { role: 'admin' }, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.removeParticipant(
        mockConversationId,
        mockUserId,
        mockUserId
      )

      expect(result.error?.message).toContain('leaveConversation')
    })
  })

  describe('leaveConversation', () => {
    it('should allow user to leave', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const result = await messagingService.leaveConversation(mockConversationId, mockUserId)

      expect(result.data).toBe(true)
      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })
})

// =====================================================
// MESSAGE TESTS
// =====================================================

describe('Message Methods', () => {
  describe('getMessages', () => {
    it('should fetch messages for conversation', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock messages fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockMessage], error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getMessages(mockConversationId, mockUserId)

      expect(result.data).toEqual([mockMessage])
      expect(result.error).toBeNull()
    })

    it('should apply before_id filter for pagination', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock before message fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { created_at: '2024-01-01T00:00:00Z' }, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock messages fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockMessage], error: null }).then(onFulfilled)
        ),
      } as any)

      await messagingService.getMessages(mockConversationId, mockUserId, {
        conversation_id: mockConversationId,
        before_id: 'msg-before',
      })

      expect(mockSupabaseChain.lt).toHaveBeenCalled()
    })

    it('should apply sender filter', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock messages fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockMessage], error: null }).then(onFulfilled)
        ),
      } as any)

      await messagingService.getMessages(mockConversationId, mockUserId, {
        conversation_id: mockConversationId,
        sender_id: mockUserId,
      })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('sender_id', mockUserId)
    })
  })

  describe('getMessage', () => {
    it('should fetch single message', async () => {
      // Mock message fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockMessage, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getMessage(mockMessageId, mockUserId)

      expect(result.data).toEqual(mockMessage)
    })
  })

  describe('sendMessage', () => {
    it('should send text message', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock message insert
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockMessage, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.sendMessage(mockUserId, {
        conversation_id: mockConversationId,
        content: 'Hello',
        message_type: 'text',
      })

      expect(result.data).toEqual(mockMessage)
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })

    it('should extract @mentions from content', async () => {
      // Mock participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock message insert
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockMessage, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock conversation query for mention notifications
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: { name: 'Test Chat' }, error: null }).then(onFulfilled)
        ),
      } as any)

      await messagingService.sendMessage(mockUserId, {
        conversation_id: mockConversationId,
        content: 'Hello @[John](user-123)',
        message_type: 'text',
      })

      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })
  })

  describe('editMessage', () => {
    it('should edit message content', async () => {
      const editedMessage = { ...mockMessage, content: 'Edited', edited_at: '2024-01-02T00:00:00Z' }
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: editedMessage, error: null }).then(onFulfilled)
      )

      const result = await messagingService.editMessage(mockMessageId, mockUserId, 'Edited')

      expect(result.data?.content).toBe('Edited')
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('sender_id', mockUserId)
    })
  })

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const result = await messagingService.deleteMessage(mockMessageId, mockUserId)

      expect(result.data).toBe(true)
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('sender_id', mockUserId)
    })
  })

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const result = await messagingService.markAsRead(mockConversationId, mockUserId)

      expect(result.data).toBe(true)
      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })

  describe('searchMessages', () => {
    it('should search messages globally', async () => {
      // Create a message query chain that will eventually return messages
      const messageQueryChain = {
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockMessage], error: null }).then(onFulfilled)
        ),
      }

      // Mock first call: .from('messages') - this builds the query chain
      vi.mocked(supabase.from).mockReturnValueOnce(messageQueryChain as any)

      // Mock second call: .from('conversation_participants') - this fetches user's conversations
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [{ conversation_id: mockConversationId }], error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.searchMessages(mockUserId, 'hello')

      expect(result.data).toEqual([mockMessage])
      expect(messageQueryChain.textSearch).toHaveBeenCalledWith('content', 'hello')
    })

    it('should search within specific conversation', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [mockMessage], error: null }).then(onFulfilled)
      )

      await messagingService.searchMessages(mockUserId, 'hello', mockConversationId)

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('conversation_id', mockConversationId)
    })
  })
})

// =====================================================
// PARTICIPANT TESTS
// =====================================================

describe('Participant Methods', () => {
  describe('getParticipants', () => {
    it('should fetch all participants', async () => {
      // Mock user participant check
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockParticipant, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock participants fetch
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: [mockParticipant], error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getParticipants(mockConversationId, mockUserId)

      expect(result.data).toEqual([mockParticipant])
    })
  })

  describe('updateParticipant', () => {
    it('should update participant settings', async () => {
      const updated = { ...mockParticipant, is_muted: true }
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updated, error: null }).then(onFulfilled)
      )

      const result = await messagingService.updateParticipant(
        mockConversationId,
        mockUserId,
        { is_muted: true }
      )

      expect(result.data?.is_muted).toBe(true)
    })
  })

  describe('getUnreadCount', () => {
    it('should get total unread count', async () => {
      vi.mocked(supabase.rpc).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: 5, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getUnreadCount(mockUserId)

      expect(result.data).toBe(5)
      expect(supabase.rpc).toHaveBeenCalledWith('get_total_unread_count', {
        p_user_id: mockUserId,
      })
    })

    it('should get conversation-specific unread count', async () => {
      vi.mocked(supabase.rpc).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: 3, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.getUnreadCount(mockUserId, mockConversationId)

      expect(result.data).toBe(3)
      expect(supabase.rpc).toHaveBeenCalledWith('get_unread_message_count', {
        p_user_id: mockUserId,
        p_conversation_id: mockConversationId,
      })
    })
  })
})

// =====================================================
// REACTION TESTS
// =====================================================

describe('Reaction Methods', () => {
  describe('addReaction', () => {
    it('should add new reaction', async () => {
      // Mock existing check (none found)
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled)
        ),
      } as any)

      // Mock insert
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...mockSupabaseChain,
        then: vi.fn().mockImplementation((onFulfilled) =>
          Promise.resolve({ data: mockReaction, error: null }).then(onFulfilled)
        ),
      } as any)

      const result = await messagingService.addReaction(mockMessageId, mockUserId, '👍')

      expect(result.data).toEqual(mockReaction)
    })

    it('should return existing reaction if duplicate', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockReaction, error: null }).then(onFulfilled)
      )

      const result = await messagingService.addReaction(mockMessageId, mockUserId, '👍')

      expect(result.data).toEqual(mockReaction)
    })
  })

  describe('removeReaction', () => {
    it('should remove reaction', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const result = await messagingService.removeReaction(mockReactionId, mockUserId)

      expect(result.data).toBe(true)
      expect(mockSupabaseChain.delete).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
    })
  })
})

// =====================================================
// ERROR HANDLING TESTS
// =====================================================

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const error = new Error('Connection failed')
    mockSupabaseChain.then.mockImplementation((onFulfilled) =>
      Promise.resolve({ data: null, error }).then(onFulfilled)
    )

    const result = await messagingService.getConversations(mockUserId)

    expect(result.data).toBeNull()
    expect(result.error).toEqual(error)
  })

  it('should handle permission errors', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      ...mockSupabaseChain,
      then: vi.fn().mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      ),
    } as any)

    const result = await messagingService.getConversation(mockConversationId, mockUserId)

    expect(result.error?.message).toContain('Not authorized')
  })
})
