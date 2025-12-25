import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { publicApprovalsApi } from '../public-approvals'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

vi.mock('../../errors', () => ({
  ApiErrorClass: class extends Error {
    constructor(public status: number, message: string, public details?: unknown) {
      super(message)
    }
  },
}))

describe('Public Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPublicApprovalLink', () => {
    it('should create public approval link', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', public_token: 'token123' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await publicApprovalsApi.createPublicApprovalLink({
        approval_request_id: 'request-1',
        client_email: 'client@example.com',
      })

      expect(result.id).toBe('1')
      expect(mockQuery.insert).toHaveBeenCalled()
    })

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as any)

      await expect(
        publicApprovalsApi.createPublicApprovalLink({
          approval_request_id: 'request-1',
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('getPublicApprovalLinks', () => {
    it('should fetch links for approval request', async () => {
      const mockLinks = [
        { id: '1', approval_request_id: 'request-1' },
        { id: '2', approval_request_id: 'request-1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLinks, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await publicApprovalsApi.getPublicApprovalLinks('request-1')

      expect(result).toHaveLength(2)
    })
  })

  describe('revokePublicApprovalLink', () => {
    it('should revoke link', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await publicApprovalsApi.revokePublicApprovalLink('link-1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          revoked_at: expect.any(String),
          revoked_by: 'user-1',
        })
      )
    })
  })

  describe('validatePublicApprovalToken', () => {
    it('should validate token successfully', async () => {
      const mockValidation = [{
        is_valid: true,
        link_id: 'link-1',
        approval_request_id: 'request-1',
        remaining_uses: 5,
        error_message: null,
      }]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockValidation, error: null } as any)

      const result = await publicApprovalsApi.validatePublicApprovalToken('valid-token')

      expect(result.is_valid).toBe(true)
      expect(result.link_id).toBe('link-1')
    })

    it('should handle invalid token', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any)

      const result = await publicApprovalsApi.validatePublicApprovalToken('invalid')

      expect(result.is_valid).toBe(false)
      expect(result.error_message).toBe('Invalid or expired approval link')
    })
  })

  describe('submitClientApprovalResponse', () => {
    it('should submit approval response', async () => {
      const mockResponse = { id: 'response-1', decision: 'approved' }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: [mockResponse], error: null } as any)

      const result = await publicApprovalsApi.submitClientApprovalResponse({
        public_link_id: 'link-1',
        decision: 'approved',
        client_name: 'John Doe',
        client_email: 'john@example.com',
      })

      expect(result.decision).toBe('approved')
    })

    it('should handle rate limiting error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'rate limit exceeded' },
      } as any)

      await expect(
        publicApprovalsApi.submitClientApprovalResponse({
          public_link_id: 'link-1',
          decision: 'approved',
          client_name: 'John',
          client_email: 'john@example.com',
        })
      ).rejects.toThrow()
    })
  })

  describe('sendApprovalLinkEmail', () => {
    it('should send approval link email', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockLink = {
        id: 'link-1',
        approval_request_id: 'request-1',
        approval_request: {
          workflow: { name: 'Document Approval' },
        },
      }

      const mockLinkQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLink, error: null }),
      }

      const mockNotifQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'public_approval_links') {return mockLinkQuery as any}
        return mockNotifQuery as any
      })

      await publicApprovalsApi.sendApprovalLinkEmail('link-1', 'client@example.com', 'Please review')

      expect(mockNotifQuery.insert).toHaveBeenCalled()
    })
  })

  describe('getClientApprovalResponses', () => {
    it('should fetch client responses', async () => {
      const mockResponses = [
        { id: '1', decision: 'approved', submitted_at: '2024-01-15' },
        { id: '2', decision: 'rejected', submitted_at: '2024-01-16' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockResponses, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await publicApprovalsApi.getClientApprovalResponses('request-1')

      expect(result).toHaveLength(2)
    })
  })
})
