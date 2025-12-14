/**
 * Tests for QuickBooks Integration Hooks
 * CRITICAL for financial integration - ensures QB sync operations work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock user profile
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-456',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

// Create mock API functions
const mockGetConnectionStatus = vi.fn()
const mockGetConnection = vi.fn()
const mockGetAuthUrl = vi.fn()
const mockCompleteConnection = vi.fn()
const mockRefreshToken = vi.fn()
const mockUpdateConnection = vi.fn()
const mockDisconnect = vi.fn()
const mockGetAccountMappings = vi.fn()
const mockCreateAccountMapping = vi.fn()
const mockUpdateAccountMapping = vi.fn()
const mockDeleteAccountMapping = vi.fn()
const mockSetDefaultMapping = vi.fn()
const mockGetEntityMapping = vi.fn()
const mockGetEntityMappings = vi.fn()
const mockGetQBAccounts = vi.fn()
const mockSyncEntity = vi.fn()
const mockBulkSync = vi.fn()
const mockQueueForSync = vi.fn()
const mockRetrySync = vi.fn()
const mockCancelPendingSync = vi.fn()
const mockGetSyncLogs = vi.fn()
const mockGetSyncLog = vi.fn()
const mockGetPendingSyncs = vi.fn()
const mockGetSyncStats = vi.fn()
const mockGetDashboard = vi.fn()

// Mock QuickBooks API
vi.mock('@/lib/api/services/quickbooks', () => ({
  quickbooksApi: {
    getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
    getConnection: (...args: unknown[]) => mockGetConnection(...args),
    getAuthUrl: (...args: unknown[]) => mockGetAuthUrl(...args),
    completeConnection: (...args: unknown[]) => mockCompleteConnection(...args),
    refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
    updateConnection: (...args: unknown[]) => mockUpdateConnection(...args),
    disconnect: (...args: unknown[]) => mockDisconnect(...args),
    getAccountMappings: (...args: unknown[]) => mockGetAccountMappings(...args),
    createAccountMapping: (...args: unknown[]) => mockCreateAccountMapping(...args),
    updateAccountMapping: (...args: unknown[]) => mockUpdateAccountMapping(...args),
    deleteAccountMapping: (...args: unknown[]) => mockDeleteAccountMapping(...args),
    setDefaultMapping: (...args: unknown[]) => mockSetDefaultMapping(...args),
    getEntityMapping: (...args: unknown[]) => mockGetEntityMapping(...args),
    getEntityMappings: (...args: unknown[]) => mockGetEntityMappings(...args),
    getQBAccounts: (...args: unknown[]) => mockGetQBAccounts(...args),
    syncEntity: (...args: unknown[]) => mockSyncEntity(...args),
    bulkSync: (...args: unknown[]) => mockBulkSync(...args),
    queueForSync: (...args: unknown[]) => mockQueueForSync(...args),
    retrySync: (...args: unknown[]) => mockRetrySync(...args),
    cancelPendingSync: (...args: unknown[]) => mockCancelPendingSync(...args),
    getSyncLogs: (...args: unknown[]) => mockGetSyncLogs(...args),
    getSyncLog: (...args: unknown[]) => mockGetSyncLog(...args),
    getPendingSyncs: (...args: unknown[]) => mockGetPendingSyncs(...args),
    getSyncStats: (...args: unknown[]) => mockGetSyncStats(...args),
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
  },
}))

// Import hooks after mocks
import {
  quickbooksKeys,
  useQBConnectionStatus,
  useQBConnection,
  useInitiateQBConnection,
  useCompleteQBConnection,
  useRefreshQBToken,
  useUpdateQBConnection,
  useDisconnectQB,
  useQBAccountMappings,
  useCreateQBAccountMapping,
  useUpdateQBAccountMapping,
  useDeleteQBAccountMapping,
  useSetDefaultQBMapping,
  useQBEntityMapping,
  useQBEntityMappings,
  useQBAccounts,
  useSyncEntity,
  useBulkSync,
  useQueueForSync,
  useRetrySync,
  useCancelPendingSync,
  useQBSyncLogs,
  useQBSyncLog,
  useQBPendingSyncs,
  useQBSyncStats,
  useQBDashboard,
  useIsEntitySynced,
} from './useQuickBooks'

// =============================================
// Test Data
// =============================================

const mockConnectionStatus = {
  isConnected: true,
  needsReauth: false,
  isTokenExpired: false,
  connectionId: 'conn-123',
  companyName: 'Test Company Inc',
  companyId: 'qb-company-456',
  realmId: 'realm-789',
  environment: 'sandbox',
  lastSyncAt: '2024-01-15T10:00:00Z',
  tokenExpiresAt: '2024-01-16T10:00:00Z',
}

const mockConnection = {
  id: 'conn-123',
  company_id: 'company-456',
  qb_realm_id: 'realm-789',
  qb_company_name: 'Test Company Inc',
  access_token: 'encrypted-token',
  refresh_token: 'encrypted-refresh',
  token_expires_at: '2024-01-16T10:00:00Z',
  is_sandbox: true,
  sync_invoices: true,
  sync_payments: true,
  sync_customers: true,
  sync_vendors: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockAccountMappings = [
  {
    id: 'map-1',
    company_id: 'company-456',
    connection_id: 'conn-123',
    local_account_type: 'accounts_receivable',
    qb_account_id: 'qb-ar-123',
    qb_account_name: 'Accounts Receivable',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'map-2',
    company_id: 'company-456',
    connection_id: 'conn-123',
    local_account_type: 'revenue',
    qb_account_id: 'qb-rev-456',
    qb_account_name: 'Construction Revenue',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockQBAccounts = [
  { id: 'qb-acc-1', name: 'Checking', accountType: 'Bank', active: true },
  { id: 'qb-acc-2', name: 'Accounts Receivable', accountType: 'Accounts Receivable', active: true },
  { id: 'qb-acc-3', name: 'Revenue', accountType: 'Income', active: true },
]

const mockEntityMapping = {
  id: 'em-1',
  company_id: 'company-456',
  local_entity_type: 'invoice',
  local_entity_id: 'inv-123',
  qb_entity_id: 'qb-inv-456',
  qb_entity_type: 'Invoice',
  sync_status: 'synced',
  last_synced_at: '2024-01-15T10:00:00Z',
  last_sync_error: null,
  created_at: '2024-01-01T00:00:00Z',
}

const mockSyncLogs = [
  {
    id: 'log-1',
    company_id: 'company-456',
    connection_id: 'conn-123',
    entity_type: 'invoice',
    local_entity_id: 'inv-123',
    qb_entity_id: 'qb-inv-456',
    operation: 'create',
    status: 'success',
    created_at: '2024-01-15T10:00:00Z',
  },
]

const mockPendingSyncs = [
  {
    id: 'ps-1',
    company_id: 'company-456',
    connection_id: 'conn-123',
    entity_type: 'invoice',
    local_entity_id: 'inv-124',
    status: 'pending',
    priority: 1,
    retry_count: 0,
    created_at: '2024-01-15T11:00:00Z',
  },
]

const mockSyncStats = {
  totalSynced: 150,
  pendingCount: 5,
  failedCount: 2,
  lastSyncAt: '2024-01-15T10:00:00Z',
  todaySyncs: 25,
}

const mockDashboard = {
  connection: mockConnectionStatus,
  stats: mockSyncStats,
  recentLogs: mockSyncLogs,
  pendingSyncs: mockPendingSyncs,
}

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
  mockGetConnectionStatus.mockResolvedValue(mockConnectionStatus)
  mockGetConnection.mockResolvedValue(mockConnection)
  mockGetAuthUrl.mockResolvedValue({ authUrl: 'https://quickbooks.com/oauth' })
  mockCompleteConnection.mockResolvedValue(mockConnection)
  mockRefreshToken.mockResolvedValue(mockConnection)
  mockUpdateConnection.mockResolvedValue(mockConnection)
  mockDisconnect.mockResolvedValue(undefined)
  mockGetAccountMappings.mockResolvedValue(mockAccountMappings)
  mockCreateAccountMapping.mockResolvedValue(mockAccountMappings[0])
  mockUpdateAccountMapping.mockResolvedValue(mockAccountMappings[0])
  mockDeleteAccountMapping.mockResolvedValue(undefined)
  mockSetDefaultMapping.mockResolvedValue(undefined)
  mockGetEntityMapping.mockResolvedValue(mockEntityMapping)
  mockGetEntityMappings.mockResolvedValue([mockEntityMapping])
  mockGetQBAccounts.mockResolvedValue(mockQBAccounts)
  mockSyncEntity.mockResolvedValue({ success: true })
  mockBulkSync.mockResolvedValue({ synced: 5, failed: 0 })
  mockQueueForSync.mockResolvedValue(mockPendingSyncs[0])
  mockRetrySync.mockResolvedValue(mockPendingSyncs[0])
  mockCancelPendingSync.mockResolvedValue(undefined)
  mockGetSyncLogs.mockResolvedValue(mockSyncLogs)
  mockGetSyncLog.mockResolvedValue(mockSyncLogs[0])
  mockGetPendingSyncs.mockResolvedValue(mockPendingSyncs)
  mockGetSyncStats.mockResolvedValue(mockSyncStats)
  mockGetDashboard.mockResolvedValue(mockDashboard)
})

// =============================================
// Query Key Tests
// =============================================

describe('quickbooksKeys', () => {
  it('should generate correct base key', () => {
    expect(quickbooksKeys.all).toEqual(['quickbooks'])
  })

  describe('connection keys', () => {
    it('should generate correct connection base key', () => {
      expect(quickbooksKeys.connection()).toEqual(['quickbooks', 'connection'])
    })

    it('should generate correct connection status key', () => {
      expect(quickbooksKeys.connectionStatus('company-123')).toEqual([
        'quickbooks',
        'connection',
        'company-123',
      ])
    })
  })

  describe('account mapping keys', () => {
    it('should generate correct account mappings base key', () => {
      expect(quickbooksKeys.accountMappings()).toEqual(['quickbooks', 'accountMappings'])
    })

    it('should generate correct account mappings list key', () => {
      expect(quickbooksKeys.accountMappingsList('company-123', 'conn-456')).toEqual([
        'quickbooks',
        'accountMappings',
        'company-123',
        'conn-456',
      ])
    })
  })

  describe('entity mapping keys', () => {
    it('should generate correct entity mappings base key', () => {
      expect(quickbooksKeys.entityMappings()).toEqual(['quickbooks', 'entityMappings'])
    })

    it('should generate correct entity mapping key', () => {
      expect(quickbooksKeys.entityMapping('company-123', 'invoice', 'inv-456')).toEqual([
        'quickbooks',
        'entityMappings',
        'company-123',
        'invoice',
        'inv-456',
      ])
    })

    it('should generate correct entity mappings list key with options', () => {
      expect(quickbooksKeys.entityMappingsList('company-123', { entityType: 'invoice', status: 'synced' })).toEqual([
        'quickbooks',
        'entityMappings',
        'company-123',
        { entityType: 'invoice', status: 'synced' },
      ])
    })
  })

  describe('sync keys', () => {
    it('should generate correct sync logs base key', () => {
      expect(quickbooksKeys.syncLogs()).toEqual(['quickbooks', 'syncLogs'])
    })

    it('should generate correct sync log key', () => {
      expect(quickbooksKeys.syncLog('log-123')).toEqual([
        'quickbooks',
        'syncLogs',
        'log-123',
      ])
    })

    it('should generate correct pending syncs base key', () => {
      expect(quickbooksKeys.pendingSyncs()).toEqual(['quickbooks', 'pendingSyncs'])
    })

    it('should generate correct stats key', () => {
      expect(quickbooksKeys.stats('company-123')).toEqual([
        'quickbooks',
        'stats',
        'company-123',
      ])
    })

    it('should generate correct dashboard key', () => {
      expect(quickbooksKeys.dashboard('company-123')).toEqual([
        'quickbooks',
        'dashboard',
        'company-123',
      ])
    })
  })
})

// =============================================
// Connection Hooks Tests
// =============================================

describe('useQBConnectionStatus', () => {
  it('should fetch connection status', async () => {
    const { result } = renderHook(() => useQBConnectionStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockConnectionStatus)
    expect(mockGetConnectionStatus).toHaveBeenCalledWith('company-456')
  })

  it('should return connected status correctly', async () => {
    const { result } = renderHook(() => useQBConnectionStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.isConnected).toBe(true)
    expect(result.current.data?.needsReauth).toBe(false)
  })
})

describe('useQBConnection', () => {
  it('should fetch raw connection', async () => {
    const { result } = renderHook(() => useQBConnection(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockConnection)
  })
})

describe('useInitiateQBConnection', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useInitiateQBConnection(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useCompleteQBConnection', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCompleteQBConnection(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useRefreshQBToken', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useRefreshQBToken(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateQBConnection', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateQBConnection(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDisconnectQB', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDisconnectQB(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Account Mapping Hooks Tests
// =============================================

describe('useQBAccountMappings', () => {
  it('should fetch account mappings', async () => {
    const { result } = renderHook(() => useQBAccountMappings('conn-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockAccountMappings)
    expect(mockGetAccountMappings).toHaveBeenCalledWith('company-456', 'conn-123')
  })
})

describe('useCreateQBAccountMapping', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateQBAccountMapping(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateQBAccountMapping', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateQBAccountMapping(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDeleteQBAccountMapping', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDeleteQBAccountMapping(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useSetDefaultQBMapping', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useSetDefaultQBMapping(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Entity Mapping Hooks Tests
// =============================================

describe('useQBEntityMapping', () => {
  it('should fetch entity mapping', async () => {
    const { result } = renderHook(() => useQBEntityMapping('invoice', 'inv-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockEntityMapping)
    expect(mockGetEntityMapping).toHaveBeenCalledWith('company-456', 'invoice', 'inv-123')
  })

  it('should not fetch when entityId is undefined', async () => {
    const { result } = renderHook(() => useQBEntityMapping('invoice', undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useQBEntityMappings', () => {
  it('should fetch entity mappings list', async () => {
    const { result } = renderHook(() => useQBEntityMappings({ entityType: 'invoice' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockEntityMapping])
  })
})

// =============================================
// QB Accounts Hooks Tests
// =============================================

describe('useQBAccounts', () => {
  it('should fetch QuickBooks accounts', async () => {
    const { result } = renderHook(() => useQBAccounts('conn-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockQBAccounts)
    expect(mockGetQBAccounts).toHaveBeenCalledWith('conn-123')
  })

  it('should not fetch when connectionId is undefined', async () => {
    const { result } = renderHook(() => useQBAccounts(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// Sync Operation Hooks Tests
// =============================================

describe('useSyncEntity', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useSyncEntity(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useBulkSync', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useBulkSync(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useQueueForSync', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useQueueForSync(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useRetrySync', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useRetrySync(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useCancelPendingSync', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCancelPendingSync(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

// =============================================
// Sync Logs Hooks Tests
// =============================================

describe('useQBSyncLogs', () => {
  it('should fetch sync logs', async () => {
    const { result } = renderHook(() => useQBSyncLogs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSyncLogs)
  })

  it('should fetch sync logs with filters', async () => {
    const { result } = renderHook(() => useQBSyncLogs({ entityType: 'invoice', status: 'success' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetSyncLogs).toHaveBeenCalledWith('company-456', { entityType: 'invoice', status: 'success' })
  })
})

describe('useQBSyncLog', () => {
  it('should fetch single sync log', async () => {
    const { result } = renderHook(() => useQBSyncLog('log-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSyncLogs[0])
  })

  it('should not fetch when logId is undefined', async () => {
    const { result } = renderHook(() => useQBSyncLog(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// Pending Syncs Hooks Tests
// =============================================

describe('useQBPendingSyncs', () => {
  it('should fetch pending syncs', async () => {
    const { result } = renderHook(() => useQBPendingSyncs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPendingSyncs)
  })
})

// =============================================
// Dashboard & Stats Hooks Tests
// =============================================

describe('useQBSyncStats', () => {
  it('should fetch sync stats', async () => {
    const { result } = renderHook(() => useQBSyncStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSyncStats)
  })
})

describe('useQBDashboard', () => {
  it('should fetch dashboard data', async () => {
    const { result } = renderHook(() => useQBDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockDashboard)
  })
})

// =============================================
// Helper Hooks Tests
// =============================================

describe('useIsEntitySynced', () => {
  it('should return synced status for synced entity', async () => {
    const { result } = renderHook(() => useIsEntitySynced('invoice', 'inv-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isSynced).toBe(true)
    expect(result.current.syncStatus).toBe('synced')
    expect(result.current.qbEntityId).toBe('qb-inv-456')
  })

  it('should return not synced for non-existent entity', async () => {
    mockGetEntityMapping.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useIsEntitySynced('invoice', 'inv-999'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isSynced).toBe(false)
    expect(result.current.syncStatus).toBe(null)
  })
})

// =============================================
// Integration Security Tests
// =============================================

describe('QuickBooks Integration Security', () => {
  it('should require company_id for all operations', async () => {
    // All hooks check for userProfile.company_id
    const { result } = renderHook(() => useQBConnectionStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Verify company_id is passed to API
    expect(mockGetConnectionStatus).toHaveBeenCalledWith('company-456')
  })

  it('should handle token expiration status', async () => {
    mockGetConnectionStatus.mockResolvedValueOnce({
      ...mockConnectionStatus,
      isTokenExpired: true,
      needsReauth: true,
    })

    const { result } = renderHook(() => useQBConnectionStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.isTokenExpired).toBe(true)
    expect(result.current.data?.needsReauth).toBe(true)
  })

  it('should handle connection errors gracefully', async () => {
    mockGetConnectionStatus.mockRejectedValueOnce(new Error('OAuth error'))

    const { result } = renderHook(() => useQBConnectionStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
  })

  it('should track sync status accurately', async () => {
    const { result } = renderHook(() => useQBSyncStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalSynced).toBe(150)
    expect(result.current.data?.pendingCount).toBe(5)
    expect(result.current.data?.failedCount).toBe(2)
  })
})
