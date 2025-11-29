/**
 * Mention Notification Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendMentionNotifications, extractMentionedUserIds } from './mention-notifications'
import { sendNotification } from '@/lib/notifications/notification-service'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/lib/notifications/notification-service', () => ({
  sendNotification: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('Mention Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractMentionedUserIds', () => {
    it('should extract user IDs from mention tags', () => {
      const content = 'Hey @[John Doe](user-123) and @[Jane Smith](user-456), check this out!'
      const userIds = extractMentionedUserIds(content)

      expect(userIds).toEqual(['user-123', 'user-456'])
    })

    it('should return empty array when no mentions', () => {
      const content = 'Just a regular message with no mentions'
      const userIds = extractMentionedUserIds(content)

      expect(userIds).toEqual([])
    })

    it('should handle single mention', () => {
      const content = 'Hello @[Alice](user-789)'
      const userIds = extractMentionedUserIds(content)

      expect(userIds).toEqual(['user-789'])
    })

    it('should handle multiple mentions of same user', () => {
      const content = '@[Bob](user-111) and @[Bob](user-111) again'
      const userIds = extractMentionedUserIds(content)

      expect(userIds).toEqual(['user-111', 'user-111'])
    })

    it('should handle mentions with special characters in names', () => {
      const content = 'Hey @[O\'Brien](user-222) and @[José García](user-333)!'
      const userIds = extractMentionedUserIds(content)

      expect(userIds).toEqual(['user-222', 'user-333'])
    })
  })

  describe('sendMentionNotifications', () => {
    it('should send notifications to mentioned users', async () => {
      const mockUsers = [
        { id: 'user-123', full_name: 'John Doe', email: 'john@example.com' },
        { id: 'user-456', full_name: 'Jane Smith', email: 'jane@example.com' },
      ]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)
      vi.mocked(sendNotification).mockResolvedValue(undefined)

      await sendMentionNotifications({
        messageId: 'msg-1',
        conversationId: 'conv-1',
        mentionedUserIds: ['user-123', 'user-456'],
        senderName: 'Bob',
        senderId: 'sender-1',
        conversationName: 'Team Chat',
        messagePreview: 'Hey everyone, check this out!',
      })

      expect(sendNotification).toHaveBeenCalledTimes(2)
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          type: 'mention',
          title: 'Bob mentioned you',
          message: expect.stringContaining('Team Chat'),
          link: '/messages/conv-1',
        })
      )
    })

    it('should not notify the sender', async () => {
      const mockUsers = [
        { id: 'user-123', full_name: 'John Doe', email: 'john@example.com' },
      ]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)
      vi.mocked(sendNotification).mockResolvedValue(undefined)

      await sendMentionNotifications({
        messageId: 'msg-1',
        conversationId: 'conv-1',
        mentionedUserIds: ['sender-1', 'user-123'],  // Includes sender
        senderName: 'Sender',
        senderId: 'sender-1',  // Sender's ID
        conversationName: null,
        messagePreview: 'Test',
      })

      // Should only notify user-123, not sender-1
      expect(sendNotification).toHaveBeenCalledTimes(1)
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
        })
      )
    })

    it('should handle empty mention list', async () => {
      await sendMentionNotifications({
        messageId: 'msg-1',
        conversationId: 'conv-1',
        mentionedUserIds: [],
        senderName: 'Bob',
        senderId: 'sender-1',
        conversationName: 'Chat',
        messagePreview: 'No mentions',
      })

      expect(sendNotification).not.toHaveBeenCalled()
    })

    it('should truncate long message previews', async () => {
      const longMessage = 'x'.repeat(150)

      const mockUsers = [{ id: 'user-123', full_name: 'John', email: 'john@example.com' }]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)
      vi.mocked(sendNotification).mockResolvedValue(undefined)

      await sendMentionNotifications({
        messageId: 'msg-1',
        conversationId: 'conv-1',
        mentionedUserIds: ['user-123'],
        senderName: 'Bob',
        senderId: 'sender-1',
        conversationName: 'Chat',
        messagePreview: longMessage,
      })

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/\.\.\.$/),  // Should end with ...
        })
      )
    })

    it('should use "Direct Message" when conversation name is null', async () => {
      const mockUsers = [{ id: 'user-123', full_name: 'John', email: 'john@example.com' }]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)
      vi.mocked(sendNotification).mockResolvedValue(undefined)

      await sendMentionNotifications({
        messageId: 'msg-1',
        conversationId: 'conv-1',
        mentionedUserIds: ['user-123'],
        senderName: 'Bob',
        senderId: 'sender-1',
        conversationName: null,
        messagePreview: 'Test',
      })

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Direct Message'),
        })
      )
    })

    it('should handle notification failures gracefully', async () => {
      const mockUsers = [{ id: 'user-123', full_name: 'John', email: 'john@example.com' }]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)
      vi.mocked(sendNotification).mockRejectedValue(new Error('Notification service down'))

      // Should not throw, just log error
      await expect(
        sendMentionNotifications({
          messageId: 'msg-1',
          conversationId: 'conv-1',
          mentionedUserIds: ['user-123'],
          senderName: 'Bob',
          senderId: 'sender-1',
          conversationName: 'Chat',
          messagePreview: 'Test',
        })
      ).resolves.not.toThrow()
    })

    it('should handle database errors when fetching users', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      // Should not throw, just return early
      await expect(
        sendMentionNotifications({
          messageId: 'msg-1',
          conversationId: 'conv-1',
          mentionedUserIds: ['user-123'],
          senderName: 'Bob',
          senderId: 'sender-1',
          conversationName: 'Chat',
          messagePreview: 'Test',
        })
      ).resolves.not.toThrow()

      expect(sendNotification).not.toHaveBeenCalled()
    })
  })
})
