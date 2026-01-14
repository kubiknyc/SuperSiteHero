import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { insuranceApi } from '../insurance'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('insuranceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCertificates', () => {
    it('should fetch certificates for a company', async () => {
      const mockData = [
        { id: '1', certificate_number: 'CERT-001', status: 'active' },
        { id: '2', certificate_number: 'CERT-002', status: 'expiring_soon' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await insuranceApi.getCertificates('company-1')

      expect(result).toEqual(mockData)
      expect(mockQuery.eq).toHaveBeenCalledWith('company_id', 'company-1')
    })

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await insuranceApi.getCertificates('company-1', {
        projectId: 'proj-1',
        status: 'active',
        insuranceType: 'liability',
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
      expect(mockQuery.eq).toHaveBeenCalledWith('insurance_type', 'liability')
    })

    it('should handle fetch errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(insuranceApi.getCertificates('company-1')).rejects.toThrow()
    })
  })

  describe('createCertificate', () => {
    it('should create a new certificate', async () => {
      const mockInput = {
        company_id: 'company-1',
        certificate_number: 'CERT-001',
        insurance_type: 'liability',
        carrier_name: 'Carrier Inc',
        policy_number: 'POL-123',
        effective_date: '2024-01-01',
        expiration_date: '2025-01-01',
        coverage_amount: 1000000,
      }
      const mockData = { ...mockInput, id: '1' }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await insuranceApi.createCertificate(mockInput)

      expect(result).toEqual(mockData)
    })

    it('should handle creation errors', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Create failed') }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(insuranceApi.createCertificate({} as any)).rejects.toThrow()
    })
  })

  describe('voidCertificate', () => {
    it('should void a certificate with reason', async () => {
      const mockData = { id: '1', status: 'void', notes: 'Voided: Policy cancelled' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await insuranceApi.voidCertificate('1', 'Policy cancelled')

      expect(result.status).toBe('void')
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'void',
        notes: 'Voided: Policy cancelled',
      })
    })
  })

  describe('getExpiringCertificates', () => {
    it('should fetch expiring certificates within days', async () => {
      const mockData = [
        {
          id: '1',
          certificate_number: 'CERT-001',
          expiration_date: '2024-12-31',
          subcontractor: { company_name: 'Sub A' },
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await insuranceApi.getExpiringCertificates('company-1', 30)

      expect(result).toBeDefined()
      expect(result[0]).toHaveProperty('days_until_expiry')
    })
  })

  describe('checkCompliance', () => {
    it('should check compliance for subcontractor', async () => {
      const mockData = [
        { requirement_type: 'liability', is_compliant: true },
        { requirement_type: 'workers_comp', is_compliant: false },
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null })

      const result = await insuranceApi.checkCompliance('sub-1')

      expect(result).toEqual(mockData)
      expect(supabase.rpc).toHaveBeenCalledWith('check_insurance_compliance', {
        p_subcontractor_id: 'sub-1',
        p_project_id: null,
      })
    })

    it('should handle compliance check errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      })

      await expect(insuranceApi.checkCompliance('sub-1')).rejects.toThrow()
    })
  })

  describe('getDashboardStats', () => {
    it('should calculate dashboard statistics', async () => {
      const mockCertificates = [
        { status: 'active' },
        { status: 'active' },
        { status: 'expiring_soon' },
        { status: 'expired' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockCertificates, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockQuery as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any)

      const result = await insuranceApi.getDashboardStats('company-1')

      expect(result.totalCertificates).toBe(4)
      expect(result.activeCertificates).toBe(2)
      expect(result.expiringWithin30Days).toBe(1)
      expect(result.expiredCertificates).toBe(1)
    })
  })

  describe('uploadCertificateDocument', () => {
    it('should upload certificate document', async () => {
      const mockFile = new File(['content'], 'cert.pdf', { type: 'application/pdf' })
      const mockPublicUrl = 'https://example.com/cert.pdf'

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockUpdate as any)

      const result = await insuranceApi.uploadCertificateDocument('cert-1', mockFile, 'company-1')

      expect(result).toBe(mockPublicUrl)
      expect(mockStorage.upload).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['content'], 'cert.pdf', { type: 'application/pdf' })
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: new Error('Upload failed') }),
        getPublicUrl: vi.fn(),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      await expect(
        insuranceApi.uploadCertificateDocument('cert-1', mockFile, 'company-1')
      ).rejects.toThrow()
    })
  })
})
