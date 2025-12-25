import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import {
  reportSharingApi,
  getShareUrl,
  getEmbedCode,
  isShareExpired,
  userHasAccess,
} from '../report-sharing'

vi.mock('@/lib/supabase', () => ({
  supabaseUntyped: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Report Sharing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReportShares', () => {
    it('should fetch shares for report template', async () => {
      const mockShares = [
        { id: '1', report_template_id: 'template-1', is_public: true },
        { id: '2', report_template_id: 'template-1', is_public: false },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockShares, error: null }),
      }

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await reportSharingApi.getReportShares('template-1')

      expect(result).toHaveLength(2)
    })
  })

  describe('getReportShare', () => {
    it('should fetch single share', async () => {
      const mockShare = { id: '1', public_token: 'abc123' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockShare, error: null }),
      }

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await reportSharingApi.getReportShare('1')

      expect(result?.public_token).toBe('abc123')
    })

    it('should return null when not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await reportSharingApi.getReportShare('999')

      expect(result).toBeNull()
    })
  })

  describe('getSharedReportByToken', () => {
    it('should fetch shared report by public token', async () => {
      const mockData = [{
        id: '1',
        report_template_id: 'template-1',
        public_token: 'abc123',
        is_public: true,
        template_name: 'Monthly Report',
        company_id: 'company-1',
        company_name: 'ACME Corp',
      }]

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.rpc).mockResolvedValue({ data: mockData, error: null } as any)

      const result = await reportSharingApi.getSharedReportByToken('abc123')

      expect(result?.publicToken).toBe('abc123')
      expect(result?.template.name).toBe('Monthly Report')
    })

    it('should return null when token invalid', async () => {
      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.rpc).mockResolvedValue({ data: [], error: null } as any)

      const result = await reportSharingApi.getSharedReportByToken('invalid')

      expect(result).toBeNull()
    })
  })

  describe('createReportShare', () => {
    it('should create new share', async () => {
      const mockUser = { user: { id: 'user-1' } }
      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await reportSharingApi.createReportShare({
        reportTemplateId: 'template-1',
        companyId: 'company-1',
        isPublic: true,
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updateReportShare', () => {
    it('should update share settings', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      await reportSharingApi.updateReportShare('1', {
        isPublic: false,
        allowExport: false,
      })

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: false,
          allow_export: false,
        })
      )
    })
  })

  describe('deleteReportShare', () => {
    it('should delete share', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      await reportSharingApi.deleteReportShare('1')

      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  describe('regenerateShareToken', () => {
    it('should regenerate token', async () => {
      const supabaseUntyped = require('@/lib/supabase').supabaseUntyped
      vi.mocked(supabaseUntyped.rpc).mockResolvedValue({ data: 'new-token-123', error: null } as any)

      const result = await reportSharingApi.regenerateShareToken('share-1')

      expect(result).toBe('new-token-123')
    })
  })

  describe('Helper Functions', () => {
    it('should generate share URL', () => {
      const url = getShareUrl('abc123')
      expect(url).toContain('/reports/public/abc123')
    })

    it('should generate embed code', () => {
      const code = getEmbedCode('abc123', '800px', '600px')
      expect(code).toContain('iframe')
      expect(code).toContain('width="800px"')
      expect(code).toContain('height="600px"')
    })

    it('should check if share is expired', () => {
      const expiredShare = {
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      } as any

      const validShare = {
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any

      const noExpiryShare = {
        expires_at: null,
      } as any

      expect(isShareExpired(expiredShare)).toBe(true)
      expect(isShareExpired(validShare)).toBe(false)
      expect(isShareExpired(noExpiryShare)).toBe(false)
    })

    it('should check user access to share', () => {
      const publicShare = { is_public: true } as any
      const privateShareWithUser = {
        is_public: false,
        allowed_users: ['user-1', 'user-2'],
      } as any
      const privateShareWithoutUser = {
        is_public: false,
        allowed_users: ['user-3'],
      } as any

      expect(userHasAccess(publicShare, null)).toBe(true)
      expect(userHasAccess(publicShare, 'user-1')).toBe(true)
      expect(userHasAccess(privateShareWithUser, 'user-1')).toBe(true)
      expect(userHasAccess(privateShareWithoutUser, 'user-1')).toBe(false)
      expect(userHasAccess(privateShareWithUser, null)).toBe(false)
    })
  })
})
