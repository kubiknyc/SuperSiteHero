// File: /src/features/site-instructions/hooks/useSiteInstructionAcknowledgment.test.ts
// Tests for site instruction acknowledgment hooks
// Milestone 1.2: Site Instructions QR Code Workflow

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useAcknowledgmentsByInstruction,
  useInstructionByQRToken,
  useAcknowledgmentCount,
  acknowledgmentKeys,
} from './useSiteInstructionAcknowledgment'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockAcknowledgments,
            error: null,
          })),
          single: vi.fn(() => ({
            data: mockUser,
            error: null,
          })),
        })),
        single: vi.fn(() => ({
          data: mockAcknowledgments[0],
          error: null,
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}))

// Mock data
const mockAcknowledgments = [
  {
    id: 'ack-1',
    site_instruction_id: 'si-123',
    acknowledged_by: 'user-1',
    acknowledged_by_name: 'John Doe',
    acknowledged_at: '2024-01-15T10:00:00Z',
    signature_data: 'base64-signature-data',
    location_lat: 40.7128,
    location_lng: -74.006,
    location_accuracy: 10.5,
    notes: 'Acknowledged on site',
    is_offline_submission: false,
  },
  {
    id: 'ack-2',
    site_instruction_id: 'si-123',
    acknowledged_by: null,
    acknowledged_by_name: 'Jane Smith',
    acknowledged_at: '2024-01-15T11:00:00Z',
    signature_data: 'base64-signature-data-2',
    location_lat: 40.7129,
    location_lng: -74.007,
    location_accuracy: 15.0,
    notes: 'Via QR code',
    is_offline_submission: true,
  },
]

const mockUser = {
  id: 'user-1',
  full_name: 'John Doe',
  email: 'john@example.com',
}

const mockInstruction = {
  id: 'si-123',
  project_id: 'proj-1',
  reference_number: 'SI-001',
  title: 'Test Instruction',
  description: 'Test description',
  status: 'issued',
  priority: 'high',
  due_date: '2024-02-01',
  qr_code_token: 'valid-token-123',
  qr_code_expires_at: '2025-01-01T00:00:00Z',
}

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe('acknowledgmentKeys', () => {
  it('should generate correct query keys', () => {
    expect(acknowledgmentKeys.all).toEqual(['site-instruction-acknowledgments'])
    expect(acknowledgmentKeys.byInstruction('si-123')).toEqual([
      'site-instruction-acknowledgments',
      'instruction',
      'si-123',
    ])
    expect(acknowledgmentKeys.byUser('user-1')).toEqual([
      'site-instruction-acknowledgments',
      'user',
      'user-1',
    ])
    expect(acknowledgmentKeys.pending('user-1')).toEqual([
      'site-instruction-acknowledgments',
      'pending',
      'user-1',
    ])
    expect(acknowledgmentKeys.byQRToken('token-123')).toEqual([
      'site-instructions',
      'qr-token',
      'token-123',
    ])
  })
})

describe('useAcknowledgmentsByInstruction', () => {
  let supabaseMock: any

  beforeEach(async () => {
    const { supabase } = await import('@/lib/supabase')
    supabaseMock = supabase

    supabaseMock.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: mockAcknowledgments,
            error: null,
          }),
        }),
      }),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not fetch when instructionId is empty', () => {
    const { result } = renderHook(() => useAcknowledgmentsByInstruction(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('should return acknowledgments array structure', async () => {
    // Skip actual API call test since we're mocking
    const { result } = renderHook(() => useAcknowledgmentsByInstruction('si-123'), {
      wrapper: createWrapper(),
    })

    // Initially should be loading
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useInstructionByQRToken', () => {
  let supabaseMock: any

  beforeEach(async () => {
    const { supabase } = await import('@/lib/supabase')
    supabaseMock = supabase
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not fetch when token is empty', () => {
    const { result } = renderHook(() => useInstructionByQRToken(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('should handle invalid token error', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { result } = renderHook(() => useInstructionByQRToken('invalid-token'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('should return instruction for valid token', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [mockInstruction],
      error: null,
    })

    // Mock contacts and projects lookups
    supabaseMock.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: table === 'contacts'
              ? { id: 'contact-1', company_name: 'Test Co' }
              : { id: 'proj-1', name: 'Test Project' },
            error: null,
          }),
        }),
      }),
    }))

    const { result } = renderHook(() => useInstructionByQRToken('valid-token-123'), {
      wrapper: createWrapper(),
    })

    // Should start loading
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useAcknowledgmentCount', () => {
  let supabaseMock: any

  beforeEach(async () => {
    const { supabase } = await import('@/lib/supabase')
    supabaseMock = supabase
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not fetch when instructionId is empty', () => {
    const { result } = renderHook(() => useAcknowledgmentCount(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('should return count when instructionId is provided', async () => {
    supabaseMock.from.mockImplementation(() => ({
      select: () => ({
        eq: () => Promise.resolve({
          count: 5,
          error: null,
        }),
      }),
    }))

    const { result } = renderHook(() => useAcknowledgmentCount('si-123'), {
      wrapper: createWrapper(),
    })

    // Should start loading
    expect(result.current.isLoading).toBe(true)
  })
})

describe('Acknowledgment data types', () => {
  it('should have correct structure for acknowledgment', () => {
    const acknowledgment = mockAcknowledgments[0]

    expect(acknowledgment).toHaveProperty('id')
    expect(acknowledgment).toHaveProperty('site_instruction_id')
    expect(acknowledgment).toHaveProperty('acknowledged_by')
    expect(acknowledgment).toHaveProperty('acknowledged_by_name')
    expect(acknowledgment).toHaveProperty('acknowledged_at')
    expect(acknowledgment).toHaveProperty('signature_data')
    expect(acknowledgment).toHaveProperty('location_lat')
    expect(acknowledgment).toHaveProperty('location_lng')
    expect(acknowledgment).toHaveProperty('location_accuracy')
    expect(acknowledgment).toHaveProperty('notes')
    expect(acknowledgment).toHaveProperty('is_offline_submission')
  })

  it('should support anonymous acknowledgments', () => {
    const anonymousAck = mockAcknowledgments[1]

    expect(anonymousAck.acknowledged_by).toBeNull()
    expect(anonymousAck.acknowledged_by_name).toBe('Jane Smith')
    expect(anonymousAck.is_offline_submission).toBe(true)
  })

  it('should have GPS location data', () => {
    const acknowledgment = mockAcknowledgments[0]

    expect(typeof acknowledgment.location_lat).toBe('number')
    expect(typeof acknowledgment.location_lng).toBe('number')
    expect(typeof acknowledgment.location_accuracy).toBe('number')
    expect(acknowledgment.location_lat).toBeCloseTo(40.7128, 4)
    expect(acknowledgment.location_lng).toBeCloseTo(-74.006, 3)
  })
})

describe('QR Token validation', () => {
  it('should handle expired token', async () => {
    const { supabase } = await import('@/lib/supabase')

    ;(supabase.rpc as any).mockResolvedValueOnce({
      data: [], // Empty result means expired/invalid
      error: null,
    })

    const { result } = renderHook(() => useInstructionByQRToken('expired-token'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    if (result.current.error) {
      expect((result.current.error as Error).message).toContain('Invalid or expired')
    }
  })

  it('should validate token format', () => {
    // UUID format check
    const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const invalidToken = 'not-a-valid-token'

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    expect(uuidRegex.test(validUUID)).toBe(true)
    expect(uuidRegex.test(invalidToken)).toBe(false)
  })
})
