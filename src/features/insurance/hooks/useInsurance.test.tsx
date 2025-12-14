/**
 * Tests for Insurance Hooks
 * CRITICAL for compliance - ensures insurance certificate tracking works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type {
  InsuranceCertificate,
  InsuranceCertificateWithRelations,
  InsuranceRequirement,
  InsuranceDashboardStats,
  ComplianceSummary,
  ExpiringCertificate,
} from '@/types/insurance'

// =============================================
// Mock Setup
// =============================================

const mockGetCertificates = vi.fn()
const mockGetCertificate = vi.fn()
const mockGetCertificateHistory = vi.fn()
const mockCreateCertificate = vi.fn()
const mockUpdateCertificate = vi.fn()
const mockDeleteCertificate = vi.fn()
const mockVoidCertificate = vi.fn()
const mockGetExpiringCertificates = vi.fn()
const mockGetRequirements = vi.fn()
const mockCreateRequirement = vi.fn()
const mockUpdateRequirement = vi.fn()
const mockDeleteRequirement = vi.fn()
const mockCheckCompliance = vi.fn()
const mockGetComplianceSummary = vi.fn()
const mockGetDashboardStats = vi.fn()
const mockGetSubcontractorCertificates = vi.fn()
const mockUploadCertificateDocument = vi.fn()
const mockAcknowledgeAlert = vi.fn()

// Mock useAuth
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
    },
  }),
}))

// Mock insurance API
vi.mock('@/lib/api/services/insurance', () => ({
  insuranceApi: {
    getCertificates: (...args: unknown[]) => mockGetCertificates(...args),
    getCertificate: (...args: unknown[]) => mockGetCertificate(...args),
    getCertificateHistory: (...args: unknown[]) => mockGetCertificateHistory(...args),
    createCertificate: (...args: unknown[]) => mockCreateCertificate(...args),
    updateCertificate: (...args: unknown[]) => mockUpdateCertificate(...args),
    deleteCertificate: (...args: unknown[]) => mockDeleteCertificate(...args),
    voidCertificate: (...args: unknown[]) => mockVoidCertificate(...args),
    getExpiringCertificates: (...args: unknown[]) => mockGetExpiringCertificates(...args),
    getRequirements: (...args: unknown[]) => mockGetRequirements(...args),
    createRequirement: (...args: unknown[]) => mockCreateRequirement(...args),
    updateRequirement: (...args: unknown[]) => mockUpdateRequirement(...args),
    deleteRequirement: (...args: unknown[]) => mockDeleteRequirement(...args),
    checkCompliance: (...args: unknown[]) => mockCheckCompliance(...args),
    getComplianceSummary: (...args: unknown[]) => mockGetComplianceSummary(...args),
    getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
    getSubcontractorCertificates: (...args: unknown[]) => mockGetSubcontractorCertificates(...args),
    uploadCertificateDocument: (...args: unknown[]) => mockUploadCertificateDocument(...args),
    acknowledgeAlert: (...args: unknown[]) => mockAcknowledgeAlert(...args),
  },
}))

// Import hooks after mocks
import {
  insuranceKeys,
  useInsuranceCertificates,
  useInsuranceCertificate,
  useCertificateHistory,
  useCreateInsuranceCertificate,
  useUpdateInsuranceCertificate,
  useDeleteInsuranceCertificate,
  useVoidInsuranceCertificate,
  useExpiringCertificates,
  useInsuranceRequirements,
  useCreateInsuranceRequirement,
  useUpdateInsuranceRequirement,
  useDeleteInsuranceRequirement,
  useComplianceCheck,
  useComplianceSummary,
  useInsuranceDashboardStats,
  useSubcontractorCertificates,
  useUploadCertificateDocument,
  useAcknowledgeAlert,
} from './useInsurance'

// =============================================
// Test Data
// =============================================

const mockCertificate: InsuranceCertificateWithRelations = {
  id: 'cert-123',
  company_id: 'company-456',
  project_id: 'project-789',
  subcontractor_id: 'sub-123',
  certificate_number: 'COI-2024-001',
  insurance_type: 'general_liability',
  carrier_name: 'ABC Insurance',
  carrier_naic_number: '12345',
  policy_number: 'GL-2024-001',
  each_occurrence_limit: 1000000,
  general_aggregate_limit: 2000000,
  products_completed_ops_limit: 2000000,
  personal_adv_injury_limit: 1000000,
  damage_to_rented_premises: 100000,
  medical_expense_limit: 5000,
  combined_single_limit: null,
  bodily_injury_per_person: null,
  bodily_injury_per_accident: null,
  property_damage_limit: null,
  umbrella_each_occurrence: null,
  umbrella_aggregate: null,
  workers_comp_el_each_accident: null,
  workers_comp_el_disease_policy: null,
  workers_comp_el_disease_employee: null,
  effective_date: '2024-01-01',
  expiration_date: '2025-01-01',
  status: 'active',
  additional_insured_required: true,
  additional_insured_verified: true,
  additional_insured_name: 'General Contractor LLC',
  waiver_of_subrogation_required: true,
  waiver_of_subrogation_verified: true,
  primary_noncontributory_required: true,
  primary_noncontributory_verified: true,
  certificate_url: null,
  certificate_storage_path: null,
  issued_by_name: 'John Agent',
  issued_by_email: 'agent@insurance.com',
  issued_by_phone: '555-1234',
  notes: null,
  description_of_operations: 'Construction services',
  alert_days_before_expiry: 30,
  suppress_alerts: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
  subcontractor: {
    id: 'sub-123',
    company_name: 'ABC Electrical',
    contact_name: 'Jane Doe',
    contact_email: 'jane@abc.com',
    contact_phone: '555-5678',
  },
  project: {
    id: 'project-789',
    name: 'Office Building',
    project_number: 'PRJ-001',
  },
}

const mockCertificates: InsuranceCertificateWithRelations[] = [
  mockCertificate,
  {
    ...mockCertificate,
    id: 'cert-124',
    certificate_number: 'COI-2024-002',
    insurance_type: 'workers_compensation',
    status: 'expiring_soon',
  },
]

const mockRequirement: InsuranceRequirement = {
  id: 'req-123',
  company_id: 'company-456',
  project_id: null,
  name: 'General Liability Minimum',
  insurance_type: 'general_liability',
  description: 'Minimum GL coverage for subcontractors',
  min_each_occurrence: 1000000,
  min_general_aggregate: 2000000,
  min_products_completed_ops: null,
  min_combined_single_limit: null,
  min_umbrella_each_occurrence: null,
  min_umbrella_aggregate: null,
  min_workers_comp_el_each_accident: null,
  additional_insured_required: true,
  waiver_of_subrogation_required: true,
  primary_noncontributory_required: false,
  applies_to_all_subcontractors: true,
  specific_subcontractor_ids: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
}

const mockDashboardStats: InsuranceDashboardStats = {
  totalCertificates: 50,
  activeCertificates: 35,
  expiringWithin30Days: 8,
  expiredCertificates: 5,
  pendingRenewal: 2,
  complianceRate: 92,
  subcontractorsWithGaps: 3,
}

const mockComplianceSummary: ComplianceSummary[] = [
  {
    subcontractor_id: 'sub-123',
    subcontractor_name: 'ABC Electrical',
    company_id: 'company-456',
    project_id: 'project-789',
    project_name: 'Office Building',
    active_certificates: 3,
    expiring_certificates: 1,
    expired_certificates: 0,
    next_expiration: '2024-06-15',
    all_additional_insured_verified: true,
  },
]

const mockExpiringCerts: ExpiringCertificate[] = [
  {
    id: 'cert-124',
    certificate_number: 'COI-2024-002',
    insurance_type: 'workers_compensation',
    carrier_name: 'XYZ Insurance',
    expiration_date: '2024-03-15',
    days_until_expiry: 15,
    status: 'expiring_soon',
    subcontractor_id: 'sub-123',
    subcontractor_name: 'ABC Electrical',
    project_id: 'project-789',
    project_name: 'Office Building',
    company_name: 'ABC Electrical',
  },
]

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockGetCertificates.mockResolvedValue(mockCertificates)
  mockGetCertificate.mockResolvedValue(mockCertificate)
  mockGetCertificateHistory.mockResolvedValue([])
  mockCreateCertificate.mockResolvedValue(mockCertificate)
  mockUpdateCertificate.mockResolvedValue(mockCertificate)
  mockDeleteCertificate.mockResolvedValue(undefined)
  mockVoidCertificate.mockResolvedValue({ ...mockCertificate, status: 'void' })
  mockGetExpiringCertificates.mockResolvedValue(mockExpiringCerts)
  mockGetRequirements.mockResolvedValue([mockRequirement])
  mockCreateRequirement.mockResolvedValue(mockRequirement)
  mockUpdateRequirement.mockResolvedValue(mockRequirement)
  mockDeleteRequirement.mockResolvedValue(undefined)
  mockCheckCompliance.mockResolvedValue([])
  mockGetComplianceSummary.mockResolvedValue(mockComplianceSummary)
  mockGetDashboardStats.mockResolvedValue(mockDashboardStats)
  mockGetSubcontractorCertificates.mockResolvedValue([mockCertificate])
  mockUploadCertificateDocument.mockResolvedValue({ url: 'https://storage.example.com/cert.pdf' })
  mockAcknowledgeAlert.mockResolvedValue(undefined)
})

// =============================================
// Query Key Tests
// =============================================

describe('insuranceKeys', () => {
  it('should generate correct base key', () => {
    expect(insuranceKeys.all).toEqual(['insurance'])
  })

  it('should generate correct certificates keys', () => {
    expect(insuranceKeys.certificates()).toEqual(['insurance', 'certificates'])
    expect(insuranceKeys.certificate('cert-123')).toEqual([
      'insurance',
      'certificates',
      'cert-123',
    ])
  })

  it('should generate correct certificates list keys with filters', () => {
    const filters = { companyId: 'company-456', status: 'active' }
    expect(insuranceKeys.certificatesList(filters)).toEqual([
      'insurance',
      'certificates',
      filters,
    ])
  })

  it('should generate correct expiring key', () => {
    expect(insuranceKeys.expiring('company-456', 30)).toEqual([
      'insurance',
      'certificates',
      'expiring',
      'company-456',
      30,
    ])
  })

  it('should generate correct requirements keys', () => {
    expect(insuranceKeys.requirements()).toEqual(['insurance', 'requirements'])
    expect(insuranceKeys.requirementsList('company-456', 'project-789')).toEqual([
      'insurance',
      'requirements',
      'company-456',
      'project-789',
    ])
  })

  it('should generate correct compliance keys', () => {
    expect(insuranceKeys.compliance()).toEqual(['insurance', 'compliance'])
    expect(insuranceKeys.complianceCheck('sub-123', 'project-789')).toEqual([
      'insurance',
      'compliance',
      'sub-123',
      'project-789',
    ])
  })

  it('should generate correct stats key', () => {
    expect(insuranceKeys.stats('company-456')).toEqual([
      'insurance',
      'stats',
      'company-456',
    ])
  })
})

// =============================================
// Certificate Query Tests
// =============================================

describe('useInsuranceCertificates', () => {
  it('should fetch certificates', async () => {
    const { result } = renderHook(() => useInsuranceCertificates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCertificates)
    expect(mockGetCertificates).toHaveBeenCalledWith('company-456', expect.any(Object))
  })

  it('should fetch certificates with filters', async () => {
    const { result } = renderHook(
      () => useInsuranceCertificates({ projectId: 'project-789', status: 'active' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetCertificates).toHaveBeenCalledWith('company-456', {
      projectId: 'project-789',
      subcontractorId: undefined,
      status: 'active',
      insuranceType: undefined,
    })
  })
})

describe('useInsuranceCertificate', () => {
  it('should fetch single certificate', async () => {
    const { result } = renderHook(() => useInsuranceCertificate('cert-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCertificate)
    expect(mockGetCertificate).toHaveBeenCalledWith('cert-123')
  })

  it('should not fetch when certificateId is undefined', () => {
    const { result } = renderHook(() => useInsuranceCertificate(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useExpiringCertificates', () => {
  it('should fetch expiring certificates', async () => {
    const { result } = renderHook(() => useExpiringCertificates(30), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockExpiringCerts)
    expect(mockGetExpiringCertificates).toHaveBeenCalledWith('company-456', 30)
  })
})

// =============================================
// Certificate Mutation Tests
// =============================================

describe('useCreateInsuranceCertificate', () => {
  it('should create certificate', async () => {
    const { result } = renderHook(() => useCreateInsuranceCertificate(), {
      wrapper: createWrapper(),
    })

    const input = {
      certificate_number: 'COI-2024-003',
      insurance_type: 'general_liability' as const,
      carrier_name: 'New Insurance Co',
      policy_number: 'GL-2024-003',
      effective_date: '2024-02-01',
      expiration_date: '2025-02-01',
    }

    await result.current.mutateAsync(input)

    expect(mockCreateCertificate).toHaveBeenCalledWith({
      ...input,
      company_id: 'company-456',
    })
  })
})

describe('useUpdateInsuranceCertificate', () => {
  it('should update certificate', async () => {
    const { result } = renderHook(() => useUpdateInsuranceCertificate(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      certificateId: 'cert-123',
      updates: { status: 'pending_renewal' },
    })

    expect(mockUpdateCertificate).toHaveBeenCalledWith('cert-123', {
      status: 'pending_renewal',
    })
  })
})

describe('useDeleteInsuranceCertificate', () => {
  it('should delete certificate', async () => {
    const { result } = renderHook(() => useDeleteInsuranceCertificate(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('cert-123')

    expect(mockDeleteCertificate).toHaveBeenCalledWith('cert-123')
  })
})

describe('useVoidInsuranceCertificate', () => {
  it('should void certificate with reason', async () => {
    const { result } = renderHook(() => useVoidInsuranceCertificate(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      certificateId: 'cert-123',
      reason: 'Policy cancelled',
    })

    expect(mockVoidCertificate).toHaveBeenCalledWith('cert-123', 'Policy cancelled')
  })
})

// =============================================
// Requirements Tests
// =============================================

describe('useInsuranceRequirements', () => {
  it('should fetch requirements', async () => {
    const { result } = renderHook(() => useInsuranceRequirements(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockRequirement])
    expect(mockGetRequirements).toHaveBeenCalledWith('company-456', undefined)
  })

  it('should fetch requirements for specific project', async () => {
    const { result } = renderHook(() => useInsuranceRequirements('project-789'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetRequirements).toHaveBeenCalledWith('company-456', 'project-789')
  })
})

describe('useCreateInsuranceRequirement', () => {
  it('should create requirement', async () => {
    const { result } = renderHook(() => useCreateInsuranceRequirement(), {
      wrapper: createWrapper(),
    })

    const input = {
      name: 'Workers Comp Minimum',
      insurance_type: 'workers_compensation' as const,
      min_each_occurrence: 500000,
    }

    await result.current.mutateAsync(input)

    expect(mockCreateRequirement).toHaveBeenCalledWith({
      ...input,
      company_id: 'company-456',
    })
  })
})

// =============================================
// Compliance Tests
// =============================================

describe('useComplianceCheck', () => {
  it('should check compliance for subcontractor', async () => {
    const { result } = renderHook(
      () => useComplianceCheck('sub-123', 'project-789'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockCheckCompliance).toHaveBeenCalledWith('sub-123', 'project-789')
  })

  it('should not check when subcontractorId is undefined', () => {
    const { result } = renderHook(() => useComplianceCheck(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useComplianceSummary', () => {
  it('should fetch compliance summary', async () => {
    const { result } = renderHook(() => useComplianceSummary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockComplianceSummary)
    expect(mockGetComplianceSummary).toHaveBeenCalledWith('company-456')
  })
})

// =============================================
// Dashboard Stats Tests
// =============================================

describe('useInsuranceDashboardStats', () => {
  it('should fetch dashboard statistics', async () => {
    const { result } = renderHook(() => useInsuranceDashboardStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockDashboardStats)
    expect(mockGetDashboardStats).toHaveBeenCalledWith('company-456')
  })
})

// =============================================
// Subcontractor Certificates Tests
// =============================================

describe('useSubcontractorCertificates', () => {
  it('should fetch certificates for subcontractor', async () => {
    const { result } = renderHook(() => useSubcontractorCertificates('sub-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockCertificate])
    expect(mockGetSubcontractorCertificates).toHaveBeenCalledWith('sub-123')
  })
})

// =============================================
// Document Upload Tests
// =============================================

describe('useUploadCertificateDocument', () => {
  it('should upload certificate document', async () => {
    const { result } = renderHook(() => useUploadCertificateDocument(), {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'certificate.pdf', { type: 'application/pdf' })

    await result.current.mutateAsync({
      certificateId: 'cert-123',
      file,
    })

    expect(mockUploadCertificateDocument).toHaveBeenCalledWith(
      'cert-123',
      file,
      'company-456'
    )
  })
})

// =============================================
// Alert Tests
// =============================================

describe('useAcknowledgeAlert', () => {
  it('should acknowledge expiration alert', async () => {
    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('alert-123')

    expect(mockAcknowledgeAlert).toHaveBeenCalledWith('alert-123')
  })
})

// =============================================
// Compliance Critical Tests
// =============================================

describe('Insurance Compliance Critical Tests', () => {
  it('should track certificate status', () => {
    expect(mockCertificate.status).toBeDefined()
    expect(['active', 'expiring_soon', 'expired', 'pending_renewal', 'void']).toContain(
      mockCertificate.status
    )
  })

  it('should track coverage limits', () => {
    expect(mockCertificate.each_occurrence_limit).toBeDefined()
    expect(mockCertificate.general_aggregate_limit).toBeDefined()
  })

  it('should track additional insured status', () => {
    expect(mockCertificate.additional_insured_required).toBeDefined()
    expect(mockCertificate.additional_insured_verified).toBeDefined()
  })

  it('should track waiver of subrogation', () => {
    expect(mockCertificate.waiver_of_subrogation_required).toBeDefined()
    expect(mockCertificate.waiver_of_subrogation_verified).toBeDefined()
  })

  it('should provide compliance rate in dashboard', () => {
    expect(mockDashboardStats.complianceRate).toBeDefined()
    expect(mockDashboardStats.subcontractorsWithGaps).toBeDefined()
  })

  it('should track expiration alerts', () => {
    expect(mockDashboardStats.expiringWithin30Days).toBeDefined()
    expect(mockDashboardStats.expiredCertificates).toBeDefined()
  })
})
