import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase, supabaseUntyped } from '@/lib/supabase'
import { quickbooksApi } from '../quickbooks'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
  supabaseUntyped: {
    from: vi.fn(),
  },
}))

describe('QuickBooks API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('getConnectionStatus', () => {
    it('should return connected status', async () => {
      const mockConnection = {
        id: 'conn1',
        company_name: 'Test Company',
        realm_id: 'realm123',
        is_sandbox: false,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        auto_sync_enabled: true,
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.getConnectionStatus('comp1')

      expect(result.isConnected).toBe(true)
      expect(result.companyName).toBe('Test Company')
    })

    it('should return not connected status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.getConnectionStatus('comp1')

      expect(result.isConnected).toBe(false)
      expect(result.connectionId).toBeNull()
    })
  })

  describe('getAuthUrl', () => {
    it('should generate authorization URL', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { authUrl: 'https://appcenter.intuit.com/connect/oauth2...' },
        error: null,
      })

      const result = await quickbooksApi.getAuthUrl('comp1', false)

      expect(result).toContain('appcenter.intuit.com')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('qb-get-auth-url', {
        body: { companyId: 'comp1', isSandbox: false },
      })
    })
  })

  describe('completeConnection', () => {
    it('should complete OAuth and return connection', async () => {
      const mockConnection = {
        id: 'conn1',
        company_name: 'Test Company',
        realm_id: 'realm123',
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { connection: mockConnection },
        error: null,
      })

      const result = await quickbooksApi.completeConnection('comp1', {
        code: 'auth-code',
        realmId: 'realm123',
      })

      expect(result.id).toBe('conn1')
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {},
        error: null,
      })

      await quickbooksApi.refreshToken('conn1')

      expect(supabase.functions.invoke).toHaveBeenCalledWith('qb-refresh-token', {
        body: { connectionId: 'conn1' },
      })
    })
  })

  describe('disconnect', () => {
    it('should disconnect from QuickBooks', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {},
        error: null,
      })

      await quickbooksApi.disconnect('conn1')

      expect(supabase.functions.invoke).toHaveBeenCalledWith('qb-disconnect', {
        body: { connectionId: 'conn1' },
      })
    })
  })

  describe('getAccountMappings', () => {
    it('should fetch account mappings', async () => {
      const mockMappings = [
        { id: 'map1', cost_code: '1000', qb_account_id: 'acc1', qb_account_name: 'Labor' },
        { id: 'map2', cost_code: '2000', qb_account_id: 'acc2', qb_account_name: 'Materials' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMappings, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.getAccountMappings('comp1')

      expect(result).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('company_id', 'comp1')
    })
  })

  describe('createAccountMapping', () => {
    it('should create account mapping', async () => {
      const newMapping = {
        cost_code: '1000',
        qb_account_id: 'acc1',
        qb_account_name: 'Labor',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'map1', ...newMapping },
          error: null
        }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.createAccountMapping('comp1', 'conn1', newMapping)

      expect(result.cost_code).toBe('1000')
    })
  })

  describe('setDefaultMapping', () => {
    it('should set default mapping', async () => {
      const mockClearQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ error: null }),
      }

      mockClearQuery.eq.mockReturnValue({
        ...mockClearQuery,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSetQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabaseUntyped.from)
        .mockReturnValueOnce(mockClearQuery as any)
        .mockReturnValueOnce(mockSetQuery as any)

      await quickbooksApi.setDefaultMapping('map1', 'conn1')

      expect(mockSetQuery.update).toHaveBeenCalledWith({ is_default: true })
    })
  })

  describe('getQBAccounts', () => {
    it('should fetch QuickBooks accounts', async () => {
      const mockAccounts = [
        { id: 'acc1', name: 'Labor', type: 'Expense' },
        { id: 'acc2', name: 'Materials', type: 'Expense' },
      ]

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { accounts: mockAccounts },
        error: null,
      })

      const result = await quickbooksApi.getQBAccounts('conn1')

      expect(result).toHaveLength(2)
    })
  })

  describe('syncEntity', () => {
    it('should sync entity to QuickBooks', async () => {
      const mockMapping = {
        id: 'map1',
        local_entity_id: 'vendor1',
        qb_entity_id: 'qb_vendor1',
        sync_status: 'synced',
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { mapping: mockMapping },
        error: null,
      })

      const result = await quickbooksApi.syncEntity('conn1', {
        localEntityType: 'vendor',
        localEntityId: 'vendor1',
        direction: 'to_quickbooks',
      })

      expect(result.sync_status).toBe('synced')
    })
  })

  describe('bulkSync', () => {
    it('should perform bulk sync', async () => {
      const mockResult = {
        success: 8,
        failed: 2,
        logId: 'log123',
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResult,
        error: null,
      })

      const result = await quickbooksApi.bulkSync('conn1', {
        entityType: 'invoice',
        entityIds: ['inv1', 'inv2', 'inv3'],
        direction: 'to_quickbooks',
      })

      expect(result.success).toBe(8)
      expect(result.failed).toBe(2)
    })
  })

  describe('queueForSync', () => {
    it('should queue entity for sync', async () => {
      const mockQueue = {
        id: 'queue1',
        local_entity_type: 'bill',
        local_entity_id: 'bill1',
        status: 'pending',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockQueue, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.queueForSync('comp1', 'conn1', 'bill', 'bill1', 8)

      expect(result.status).toBe('pending')
    })
  })

  describe('retrySync', () => {
    it('should retry failed sync', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      await quickbooksApi.retrySync('queue1')

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'pending',
        last_error: null,
      })
    })
  })

  describe('getSyncLogs', () => {
    it('should fetch sync logs', async () => {
      const mockLogs = [
        { id: 'log1', entity_type: 'invoice', status: 'synced' },
        { id: 'log2', entity_type: 'bill', status: 'failed' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      }

      vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

      const result = await quickbooksApi.getSyncLogs('comp1', { limit: 10 })

      expect(result).toHaveLength(2)
    })
  })

  describe('getSyncStats', () => {
    it('should get sync statistics', async () => {
      const mockCountQuery1 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 50, error: null }),
      }

      const mockCountQuery2 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }

      mockCountQuery2.eq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      })

      const mockCountQuery3 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ count: 2, error: null }),
      }

      mockCountQuery3.eq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      })

      const mockLogQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { completed_at: '2024-12-19T10:00:00Z' },
          error: null
        }),
      }

      const mockEntityQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabaseUntyped.from)
        .mockReturnValueOnce(mockCountQuery1 as any)
        .mockReturnValueOnce(mockCountQuery2 as any)
        .mockReturnValueOnce(mockCountQuery3 as any)
        .mockReturnValueOnce(mockLogQuery as any)
        .mockReturnValueOnce(mockEntityQuery as any)

      const result = await quickbooksApi.getSyncStats('comp1')

      expect(result.totalMappedEntities).toBe(50)
      expect(result.pendingSyncs).toBe(5)
      expect(result.failedSyncs).toBe(2)
    })
  })

  describe('getDashboard', () => {
    it('should get full dashboard data', async () => {
      const mockConnection = { isConnected: true, companyName: 'Test' }
      const mockStats = { totalMappedEntities: 50, pendingSyncs: 5, failedSyncs: 2, lastSyncAt: null, syncsByEntityType: {} as any }
      const mockLogs = []
      const mockPending = []

      // Mock all the methods used by getDashboard
      vi.spyOn(quickbooksApi, 'getConnectionStatus').mockResolvedValue(mockConnection as any)
      vi.spyOn(quickbooksApi, 'getSyncStats').mockResolvedValue(mockStats)
      vi.spyOn(quickbooksApi, 'getSyncLogs').mockResolvedValue(mockLogs)
      vi.spyOn(quickbooksApi, 'getPendingSyncs').mockResolvedValue(mockPending)

      const result = await quickbooksApi.getDashboard('comp1')

      expect(result.connection).toEqual(mockConnection)
      expect(result.stats).toEqual(mockStats)
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    describe('Token Expiration Handling', () => {
      it('should detect expired tokens', async () => {
        const expiredConnection = {
          id: 'conn1',
          company_name: 'Test Company',
          realm_id: 'realm123',
          is_sandbox: false,
          is_active: true,
          token_expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          auto_sync_enabled: true,
          last_sync_at: null,
          connection_error: null,
          sync_frequency_hours: 24,
        }

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: expiredConnection, error: null }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        const result = await quickbooksApi.getConnectionStatus('comp1')

        expect(result.isConnected).toBe(true)
        expect(result.tokenExpiresAt).toBeTruthy()
        // Token is expired - app should handle refreshing
        const tokenExpiry = new Date(result.tokenExpiresAt!)
        expect(tokenExpiry.getTime()).toBeLessThan(Date.now())
      })
    })

    describe('Network Error Handling', () => {
      it('should handle network errors during OAuth', async () => {
        vi.mocked(supabase.functions.invoke).mockResolvedValue({
          data: null,
          error: { message: 'Network error' },
        })

        await expect(quickbooksApi.getAuthUrl('comp1', false)).rejects.toThrow()
      })

      it('should handle API rate limiting errors', async () => {
        vi.mocked(supabase.functions.invoke).mockResolvedValue({
          data: null,
          error: { message: 'Rate limit exceeded', details: { retryAfter: 60 } },
        })

        await expect(quickbooksApi.syncEntity('conn1', {
          localEntityType: 'invoice',
          localEntityId: 'inv1',
          direction: 'to_quickbooks',
        })).rejects.toThrow()
      })
    })

    describe('Data Validation', () => {
      it('should handle missing connection ID', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        const result = await quickbooksApi.getConnectionStatus('comp1')

        expect(result.isConnected).toBe(false)
        expect(result.connectionId).toBeNull()
      })

      it('should handle database errors', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        await expect(quickbooksApi.getAccountMappings('comp1')).rejects.toThrow()
      })
    })

    describe('Sync Failure Recovery', () => {
      it('should handle partial sync failures', async () => {
        const mockResult = {
          success: 3,
          failed: 7,
          logId: 'log123',
          errors: [
            { entityId: 'inv1', error: 'Invalid amount' },
            { entityId: 'inv2', error: 'Missing required field' },
          ],
        }

        vi.mocked(supabase.functions.invoke).mockResolvedValue({
          data: mockResult,
          error: null,
        })

        const result = await quickbooksApi.bulkSync('conn1', {
          entityType: 'invoice',
          entityIds: ['inv1', 'inv2', 'inv3'],
          direction: 'to_quickbooks',
        })

        expect(result.success).toBe(3)
        expect(result.failed).toBe(7)
      })

      it('should reset sync queue on retry', async () => {
        const mockQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        await quickbooksApi.retrySync('queue1')

        expect(mockQuery.update).toHaveBeenCalledWith({
          status: 'pending',
          last_error: null,
        })
      })
    })

    describe('Connection State Edge Cases', () => {
      it('should handle sandbox mode correctly', async () => {
        const sandboxConnection = {
          id: 'conn1',
          company_name: 'Sandbox Company',
          realm_id: 'sandbox123',
          is_sandbox: true,
          is_active: true,
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          auto_sync_enabled: false,
          last_sync_at: null,
          connection_error: null,
        }

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: sandboxConnection, error: null }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        const result = await quickbooksApi.getConnectionStatus('comp1')

        expect(result.isSandbox).toBe(true)
        expect(result.autoSyncEnabled).toBe(false)
      })

      it('should handle null auto_sync_enabled', async () => {
        const connectionWithNull = {
          id: 'conn1',
          company_name: 'Test Company',
          realm_id: 'realm123',
          is_sandbox: false,
          is_active: true,
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          auto_sync_enabled: null,
          last_sync_at: null,
          connection_error: null,
        }

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: connectionWithNull, error: null }),
        }

        vi.mocked(supabaseUntyped.from).mockReturnValue(mockQuery as any)

        const result = await quickbooksApi.getConnectionStatus('comp1')

        expect(result.autoSyncEnabled).toBeFalsy()
      })
    })
  })
})
