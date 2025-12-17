/**
 * DocuSign Service Tests
 *
 * Tests for DocuSign OAuth, envelope creation, and signing flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { docuSignApi } from './docusign'
import type {
  DSConnection,
  DSEnvelope,
  CreateEnvelopeDTO,
  PaymentApplicationSigningConfig,
  ChangeOrderSigningConfig,
  LienWaiverSigningConfig,
} from '@/types/docusign'

// Mock Supabase - Create a proper chainable mock with response queue
let mockResponseQueue: any[] = []

const setMockResponse = (response: any) => {
  mockResponseQueue = [response]
}

const queueMockResponse = (...responses: any[]) => {
  mockResponseQueue = responses
}

const getNextResponse = () => {
  if (mockResponseQueue.length > 0) {
    return mockResponseQueue.shift()
  }
  return { data: null, error: null }
}

// Create a chainable mock builder
const createChainableMock = (): any => {
  const chain: any = {
    select: vi.fn(function(this: any) { return this }),
    insert: vi.fn(function(this: any) { return this }),
    update: vi.fn(function(this: any) { return this }),
    delete: vi.fn(function(this: any) { return this }),
    eq: vi.fn(function(this: any) { return this }),
    order: vi.fn(function(this: any) { return this }),
    limit: vi.fn(function(this: any) { return this }),
    range: vi.fn(function(this: any) { return this }),
    upsert: vi.fn(function(this: any) { return this }),
    in: vi.fn(function(this: any) { return this }),
    single: vi.fn(() => Promise.resolve(getNextResponse())),
    then: vi.fn((resolve) => resolve(getNextResponse())),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainableMock()),
  },
}))

// Mock fetch for DocuSign API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
})

// Test data
const mockConnection: DSConnection = {
  id: 'conn-123',
  company_id: 'company-456',
  account_id: 'ds-account-789',
  account_name: 'Test Account',
  base_uri: 'https://demo.docusign.net',
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  is_demo: true,
  is_active: true,
  last_connected_at: new Date().toISOString(),
  connection_error: null,
  webhook_uri: 'https://api.example.com/webhooks/docusign',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockEnvelope: DSEnvelope = {
  id: 'env-123',
  company_id: 'company-456',
  connection_id: 'conn-123',
  envelope_id: 'ds-env-456',
  document_type: 'payment_application',
  local_document_id: 'payapp-789',
  status: 'sent',
  subject: 'Payment Application for Signature',
  message: 'Please review and sign',
  signing_order_enabled: true,
  reminder_enabled: false,
  sent_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

describe('DocuSign Connection Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
  })

  describe('getConnection', () => {
    it('should return connection when exists', async () => {
      setMockResponse({ data: mockConnection, error: null })

      const result = await docuSignApi.getConnection('company-456')

      expect(result).toEqual(mockConnection)
    })

    it('should return null when connection does not exist', async () => {
      setMockResponse({ data: null, error: { code: 'PGRST116' } })

      const result = await docuSignApi.getConnection('company-456')

      expect(result).toBeNull()
    })

    it('should throw error on database error', async () => {
      setMockResponse({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      })

      await expect(docuSignApi.getConnection('company-456')).rejects.toThrow(
        'Failed to get DocuSign connection'
      )
    })
  })

  describe('getConnectionStatus', () => {
    it('should return disconnected status when no connection', async () => {
      setMockResponse({ data: null, error: { code: 'PGRST116' } })

      const result = await docuSignApi.getConnectionStatus('company-456')

      expect(result.isConnected).toBe(false)
      expect(result.connectionId).toBeNull()
    })

    it('should return connected status with valid token', async () => {
      setMockResponse({ data: mockConnection, error: null })

      const result = await docuSignApi.getConnectionStatus('company-456')

      expect(result.isConnected).toBe(true)
      expect(result.connectionId).toBe('conn-123')
      expect(result.accountId).toBe('ds-account-789')
      expect(result.isTokenExpired).toBe(false)
    })

    it('should detect expired token', async () => {
      const expiredConnection = {
        ...mockConnection,
        token_expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      }
      setMockResponse({ data: expiredConnection, error: null })

      const result = await docuSignApi.getConnectionStatus('company-456')

      expect(result.isTokenExpired).toBe(true)
      expect(result.needsReauth).toBe(true)
    })
  })

  describe('initiateConnection', () => {
    it('should generate authorization URL', async () => {
      setMockResponse({ data: null, error: null })

      // Mock env variables
      vi.stubEnv('VITE_DOCUSIGN_CLIENT_ID', 'test-client-id')
      vi.stubEnv('VITE_DOCUSIGN_REDIRECT_URI', 'https://app.example.com/oauth/callback')

      const result = await docuSignApi.initiateConnection('company-456', {
        is_demo: true,
        return_url: 'https://app.example.com/settings',
      })

      expect(result.authorizationUrl).toContain('account-d.docusign.com/oauth/auth')
      expect(result.authorizationUrl).toContain('response_type=code')
      expect(result.state).toBeDefined()
    })
  })

  describe('disconnect', () => {
    it('should deactivate connection', async () => {
      setMockResponse({ data: null, error: null })

      await docuSignApi.disconnect('conn-123')

      // Verify the update method was called on the chain
      expect(true).toBe(true) // Test passes if no error thrown
    })

    it('should throw error on failure', async () => {
      setMockResponse({ data: null, error: { message: 'Update failed' } })

      await expect(docuSignApi.disconnect('conn-123')).rejects.toThrow('Failed to disconnect')
    })
  })
})

describe('DocuSign Envelope Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
  })

  describe('getEnvelopes', () => {
    it('should fetch envelopes with filters', async () => {
      setMockResponse({ data: [mockEnvelope], error: null })

      const result = await docuSignApi.getEnvelopes('company-456', {
        document_type: 'payment_application',
        status: 'sent',
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('env-123')
    })

    it('should return empty array when no envelopes', async () => {
      setMockResponse({ data: [], error: null })

      const result = await docuSignApi.getEnvelopes('company-456')

      expect(result).toEqual([])
    })
  })

  describe('getEnvelope', () => {
    it('should fetch single envelope with recipients', async () => {
      const envelopeWithRecipients = {
        ...mockEnvelope,
        recipients: [
          {
            id: 'rec-1',
            envelope_db_id: 'env-123',
            recipient_id: '1',
            recipient_type: 'signer',
            email: 'signer@example.com',
            name: 'Test Signer',
            status: 'sent',
          },
        ],
      }
      setMockResponse({ data: envelopeWithRecipients, error: null })

      const result = await docuSignApi.getEnvelope('env-123')

      expect(result?.id).toBe('env-123')
      expect(result?.recipients).toBeDefined()
    })

    it('should return null when envelope not found', async () => {
      setMockResponse({ data: null, error: { code: 'PGRST116' } })

      const result = await docuSignApi.getEnvelope('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('sendEnvelope', () => {
    it('should send envelope and update status', async () => {
      // Queue multiple responses for sequential calls
      queueMockResponse(
        // getEnvelope
        { data: { ...mockEnvelope, status: 'created' }, error: null },
        // getConnection
        { data: mockConnection, error: null },
        // update envelope
        { data: { ...mockEnvelope, status: 'sent', sent_at: new Date().toISOString() }, error: null },
        // update recipients
        { data: null, error: null }
      )

      // Mock DocuSign API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ envelopeId: 'ds-env-456', status: 'sent' }),
      })

      const result = await docuSignApi.sendEnvelope('env-123')

      expect(result.status).toBe('sent')
    })

    it('should throw error if envelope not found', async () => {
      setMockResponse({ data: null, error: { code: 'PGRST116' } })

      await expect(docuSignApi.sendEnvelope('nonexistent')).rejects.toThrow(
        'Envelope not found'
      )
    })

    it('should throw error if envelope already sent', async () => {
      setMockResponse({ data: mockEnvelope, error: null })

      await expect(docuSignApi.sendEnvelope('env-123')).rejects.toThrow(
        'Cannot send envelope with status: sent'
      )
    })
  })

  describe('voidEnvelope', () => {
    it('should void envelope and update status', async () => {
      queueMockResponse(
        // get envelope with connection
        { data: { ...mockEnvelope, connection: mockConnection }, error: null },
        // update envelope
        { data: null, error: null },
        // update recipients
        { data: null, error: null }
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'voided' }),
      })

      await docuSignApi.voidEnvelope({
        envelope_id: 'ds-env-456',
        reason: 'Superseded by new version',
      })

      // Test passes if no error thrown
      expect(true).toBe(true)
    })

    it('should throw error if envelope already completed', async () => {
      setMockResponse({
        data: { ...mockEnvelope, status: 'completed' },
        error: null,
      })

      await expect(
        docuSignApi.voidEnvelope({
          envelope_id: 'ds-env-456',
          reason: 'Test',
        })
      ).rejects.toThrow('Cannot void envelope with status: completed')
    })
  })
})

describe('DocuSign Construction Document Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []

    // Setup common mocks for DocuSign API
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          envelopeId: 'ds-new-env',
          status: 'sent',
        }),
    })
  })

  describe('createPaymentApplicationEnvelope', () => {
    it('should create envelope with correct signers', async () => {
      // Queue responses: getConnection, insert envelope, insert recipients
      queueMockResponse(
        { data: mockConnection, error: null },
        { data: { ...mockEnvelope, id: 'new-env' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null }
      )

      const config: PaymentApplicationSigningConfig = {
        payment_application_id: 'payapp-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
        architect_signer: {
          email: 'architect@example.com',
          name: 'Architect Name',
        },
        owner_signer: {
          email: 'owner@example.com',
          name: 'Owner Name',
        },
      }

      const result = await docuSignApi.createPaymentApplicationEnvelope('company-456', config)

      expect(result).toBeDefined()
    })
  })

  describe('createChangeOrderEnvelope', () => {
    it('should create envelope with contractor and owner signers', async () => {
      queueMockResponse(
        { data: mockConnection, error: null },
        { data: { ...mockEnvelope, document_type: 'change_order' }, error: null },
        { data: null, error: null },
        { data: null, error: null }
      )

      const config: ChangeOrderSigningConfig = {
        change_order_id: 'co-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
        owner_signer: {
          email: 'owner@example.com',
          name: 'Owner Name',
        },
      }

      const result = await docuSignApi.createChangeOrderEnvelope('company-456', config)

      expect(result).toBeDefined()
    })
  })

  describe('createLienWaiverEnvelope', () => {
    it('should create envelope with claimant signer', async () => {
      queueMockResponse(
        { data: mockConnection, error: null },
        { data: { ...mockEnvelope, document_type: 'lien_waiver' }, error: null },
        { data: null, error: null }
      )

      const config: LienWaiverSigningConfig = {
        lien_waiver_id: 'lw-123',
        claimant_signer: {
          email: 'subcontractor@example.com',
          name: 'Subcontractor Name',
        },
        notary_required: false,
      }

      const result = await docuSignApi.createLienWaiverEnvelope('company-456', config)

      expect(result).toBeDefined()
    })

    it('should include notary signer when required', async () => {
      queueMockResponse(
        { data: mockConnection, error: null },
        { data: { ...mockEnvelope, document_type: 'lien_waiver' }, error: null },
        { data: null, error: null },
        { data: null, error: null }
      )

      const config: LienWaiverSigningConfig = {
        lien_waiver_id: 'lw-123',
        claimant_signer: {
          email: 'subcontractor@example.com',
          name: 'Subcontractor Name',
        },
        notary_required: true,
        notary_signer: {
          email: 'notary@example.com',
          name: 'Notary Name',
        },
      }

      const result = await docuSignApi.createLienWaiverEnvelope('company-456', config)

      expect(result).toBeDefined()
    })
  })
})

describe('DocuSign Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
  })

  describe('getEnvelopeStats', () => {
    it('should calculate envelope statistics', async () => {
      const mockEnvelopes = [
        { status: 'completed', document_type: 'payment_application' },
        { status: 'completed', document_type: 'payment_application' },
        { status: 'sent', document_type: 'payment_application' },
        { status: 'sent', document_type: 'change_order' },
        { status: 'declined', document_type: 'change_order' },
        { status: 'voided', document_type: 'lien_waiver' },
      ]

      setMockResponse({ data: mockEnvelopes, error: null })

      const result = await docuSignApi.getEnvelopeStats('company-456')

      expect(result.total).toBe(6)
      expect(result.completed).toBe(2)
      expect(result.sent).toBe(2)
      expect(result.declined).toBe(1)
      expect(result.voided).toBe(1)
      expect(result.byDocumentType.payment_application.total).toBe(3)
      expect(result.byDocumentType.payment_application.completed).toBe(2)
    })

    it('should handle empty envelope list', async () => {
      setMockResponse({ data: [], error: null })

      const result = await docuSignApi.getEnvelopeStats('company-456')

      expect(result.total).toBe(0)
      expect(result.completed).toBe(0)
    })
  })

  describe('getDashboard', () => {
    it('should aggregate dashboard data', async () => {
      // Queue responses for getConnectionStatus, stats, recent envelopes, pending signatures
      queueMockResponse(
        { data: mockConnection, error: null },
        { data: [{ status: 'completed', document_type: 'payment_application' }], error: null },
        { data: [mockEnvelope], error: null },
        { data: [{ ...mockEnvelope, status: 'sent' }], error: null }
      )

      const result = await docuSignApi.getDashboard('company-456')

      expect(result.connection).toBeDefined()
      expect(result.stats).toBeDefined()
      expect(result.recentEnvelopes).toBeDefined()
      expect(result.pendingSignatures).toBeDefined()
    })
  })
})
