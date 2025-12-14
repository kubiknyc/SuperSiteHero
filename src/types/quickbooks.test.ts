/**
 * Tests for QuickBooks Types
 * Tests constants, utility functions, and type structures for QB integration
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  QB_SYNC_STATUSES,
  QB_ENTITY_TYPES,
  QB_SYNC_DIRECTIONS,
  QB_API_URLS,
  // Utility functions
  getQBEntityType,
  getLocalEntityType,
  getSyncStatusConfig,
  connectionNeedsRefresh,
  connectionNeedsReauth,
  getQBApiBaseUrl,
  buildQBApiUrl,
  // Types
  type QBSyncStatus,
  type QBSyncDirection,
  type QBEntityType,
  type QBConnection,
  type QBAccountMapping,
  type QBEntityMapping,
  type QBSyncLog,
  type QBPendingSync,
  type QBConnectionStatus,
  type QBSyncStats,
} from './quickbooks'

// =============================================
// QB_SYNC_STATUSES Tests
// =============================================

describe('QB_SYNC_STATUSES', () => {
  it('should have 5 sync statuses', () => {
    expect(QB_SYNC_STATUSES).toHaveLength(5)
  })

  it('should have pending status with gray color', () => {
    const pending = QB_SYNC_STATUSES.find((s) => s.value === 'pending')
    expect(pending).toBeDefined()
    expect(pending?.label).toBe('Pending')
    expect(pending?.color).toBe('gray')
  })

  it('should have syncing status with blue color', () => {
    const syncing = QB_SYNC_STATUSES.find((s) => s.value === 'syncing')
    expect(syncing).toBeDefined()
    expect(syncing?.label).toBe('Syncing')
    expect(syncing?.color).toBe('blue')
  })

  it('should have synced status with green color', () => {
    const synced = QB_SYNC_STATUSES.find((s) => s.value === 'synced')
    expect(synced).toBeDefined()
    expect(synced?.label).toBe('Synced')
    expect(synced?.color).toBe('green')
  })

  it('should have failed status with red color', () => {
    const failed = QB_SYNC_STATUSES.find((s) => s.value === 'failed')
    expect(failed).toBeDefined()
    expect(failed?.label).toBe('Failed')
    expect(failed?.color).toBe('red')
  })

  it('should have skipped status with yellow color', () => {
    const skipped = QB_SYNC_STATUSES.find((s) => s.value === 'skipped')
    expect(skipped).toBeDefined()
    expect(skipped?.label).toBe('Skipped')
    expect(skipped?.color).toBe('yellow')
  })

  it('should have all values with required fields', () => {
    QB_SYNC_STATUSES.forEach((status) => {
      expect(status.value).toBeTruthy()
      expect(status.label).toBeTruthy()
      expect(status.color).toBeTruthy()
    })
  })
})

// =============================================
// QB_ENTITY_TYPES Tests
// =============================================

describe('QB_ENTITY_TYPES', () => {
  it('should have 6 entity types', () => {
    expect(QB_ENTITY_TYPES).toHaveLength(6)
  })

  const expectedMappings = [
    { value: 'vendor', localType: 'subcontractors' },
    { value: 'bill', localType: 'change_orders' },
    { value: 'invoice', localType: 'payment_applications' },
    { value: 'expense', localType: 'cost_transactions' },
    { value: 'customer', localType: 'projects' },
    { value: 'account', localType: 'cost_codes' },
  ]

  expectedMappings.forEach(({ value, localType }) => {
    it(`should map ${value} to ${localType}`, () => {
      const entity = QB_ENTITY_TYPES.find((e) => e.value === value)
      expect(entity).toBeDefined()
      expect(entity?.localType).toBe(localType)
    })
  })

  it('should have all values with required fields', () => {
    QB_ENTITY_TYPES.forEach((entity) => {
      expect(entity.value).toBeTruthy()
      expect(entity.label).toBeTruthy()
      expect(entity.localType).toBeTruthy()
    })
  })
})

// =============================================
// QB_SYNC_DIRECTIONS Tests
// =============================================

describe('QB_SYNC_DIRECTIONS', () => {
  it('should have 3 sync directions', () => {
    expect(QB_SYNC_DIRECTIONS).toHaveLength(3)
  })

  it('should have to_quickbooks direction', () => {
    const toQB = QB_SYNC_DIRECTIONS.find((d) => d.value === 'to_quickbooks')
    expect(toQB).toBeDefined()
    expect(toQB?.label).toBe('To QuickBooks')
  })

  it('should have from_quickbooks direction', () => {
    const fromQB = QB_SYNC_DIRECTIONS.find((d) => d.value === 'from_quickbooks')
    expect(fromQB).toBeDefined()
    expect(fromQB?.label).toBe('From QuickBooks')
  })

  it('should have bidirectional direction', () => {
    const bidirectional = QB_SYNC_DIRECTIONS.find((d) => d.value === 'bidirectional')
    expect(bidirectional).toBeDefined()
    expect(bidirectional?.label).toBe('Two-way Sync')
  })
})

// =============================================
// QB_API_URLS Tests
// =============================================

describe('QB_API_URLS', () => {
  describe('OAuth URLs', () => {
    it('should have authorize URL', () => {
      expect(QB_API_URLS.oauth.authorize).toBe('https://appcenter.intuit.com/connect/oauth2')
    })

    it('should have token URL', () => {
      expect(QB_API_URLS.oauth.token).toBe('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer')
    })

    it('should have revoke URL', () => {
      expect(QB_API_URLS.oauth.revoke).toBe('https://developer.api.intuit.com/v2/oauth2/tokens/revoke')
    })

    it('should have userInfo URL', () => {
      expect(QB_API_URLS.oauth.userInfo).toBe('https://accounts.platform.intuit.com/v1/openid_connect/userinfo')
    })
  })

  describe('API Base URLs', () => {
    it('should have production API URL', () => {
      expect(QB_API_URLS.api.production).toBe('https://quickbooks.api.intuit.com')
    })

    it('should have sandbox API URL', () => {
      expect(QB_API_URLS.api.sandbox).toBe('https://sandbox-quickbooks.api.intuit.com')
    })
  })

  it('should have scopes defined', () => {
    expect(QB_API_URLS.scopes).toBe('com.intuit.quickbooks.accounting')
  })
})

// =============================================
// Utility Function Tests
// =============================================

describe('getQBEntityType', () => {
  it('should return vendor for subcontractors', () => {
    expect(getQBEntityType('subcontractors')).toBe('vendor')
  })

  it('should return bill for change_orders', () => {
    expect(getQBEntityType('change_orders')).toBe('bill')
  })

  it('should return invoice for payment_applications', () => {
    expect(getQBEntityType('payment_applications')).toBe('invoice')
  })

  it('should return expense for cost_transactions', () => {
    expect(getQBEntityType('cost_transactions')).toBe('expense')
  })

  it('should return customer for projects', () => {
    expect(getQBEntityType('projects')).toBe('customer')
  })

  it('should return account for cost_codes', () => {
    expect(getQBEntityType('cost_codes')).toBe('account')
  })

  it('should return null for unknown entity type', () => {
    expect(getQBEntityType('unknown_entity')).toBeNull()
  })
})

describe('getLocalEntityType', () => {
  it('should return subcontractors for vendor', () => {
    expect(getLocalEntityType('vendor')).toBe('subcontractors')
  })

  it('should return change_orders for bill', () => {
    expect(getLocalEntityType('bill')).toBe('change_orders')
  })

  it('should return payment_applications for invoice', () => {
    expect(getLocalEntityType('invoice')).toBe('payment_applications')
  })

  it('should return cost_transactions for expense', () => {
    expect(getLocalEntityType('expense')).toBe('cost_transactions')
  })

  it('should return projects for customer', () => {
    expect(getLocalEntityType('customer')).toBe('projects')
  })

  it('should return cost_codes for account', () => {
    expect(getLocalEntityType('account')).toBe('cost_codes')
  })

  it('should return null for unknown QB entity type', () => {
    expect(getLocalEntityType('unknown' as QBEntityType)).toBeNull()
  })
})

describe('getSyncStatusConfig', () => {
  it('should return correct config for pending', () => {
    const config = getSyncStatusConfig('pending')
    expect(config.value).toBe('pending')
    expect(config.label).toBe('Pending')
    expect(config.color).toBe('gray')
  })

  it('should return correct config for synced', () => {
    const config = getSyncStatusConfig('synced')
    expect(config.value).toBe('synced')
    expect(config.label).toBe('Synced')
    expect(config.color).toBe('green')
  })

  it('should return correct config for failed', () => {
    const config = getSyncStatusConfig('failed')
    expect(config.value).toBe('failed')
    expect(config.label).toBe('Failed')
    expect(config.color).toBe('red')
  })

  it('should return first status for unknown value', () => {
    const config = getSyncStatusConfig('unknown' as QBSyncStatus)
    expect(config).toEqual(QB_SYNC_STATUSES[0])
  })
})

describe('connectionNeedsRefresh', () => {
  it('should return true when token_expires_at is null', () => {
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: null,
      refresh_token_expires_at: '2025-01-01T00:00:00Z',
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsRefresh(connection)).toBe(true)
  })

  it('should return true when token expires within 5 minutes', () => {
    const now = new Date()
    const expiresIn3Min = new Date(now.getTime() + 3 * 60 * 1000)
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: expiresIn3Min.toISOString(),
      refresh_token_expires_at: '2025-01-01T00:00:00Z',
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsRefresh(connection)).toBe(true)
  })

  it('should return false when token is valid for more than 5 minutes', () => {
    const now = new Date()
    const expiresIn10Min = new Date(now.getTime() + 10 * 60 * 1000)
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: expiresIn10Min.toISOString(),
      refresh_token_expires_at: '2025-01-01T00:00:00Z',
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsRefresh(connection)).toBe(false)
  })
})

describe('connectionNeedsReauth', () => {
  it('should return true when refresh_token_expires_at is null', () => {
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: '2025-01-01T00:00:00Z',
      refresh_token_expires_at: null,
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsReauth(connection)).toBe(true)
  })

  it('should return true when refresh token is expired', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: '2025-01-01T00:00:00Z',
      refresh_token_expires_at: pastDate.toISOString(),
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsReauth(connection)).toBe(true)
  })

  it('should return false when refresh token is still valid', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-1',
      company_name: 'Test Co',
      access_token: 'token',
      refresh_token: 'refresh',
      token_expires_at: '2025-01-01T00:00:00Z',
      refresh_token_expires_at: futureDate.toISOString(),
      is_sandbox: false,
      is_active: true,
      last_connected_at: null,
      last_sync_at: null,
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }
    expect(connectionNeedsReauth(connection)).toBe(false)
  })
})

describe('getQBApiBaseUrl', () => {
  it('should return sandbox URL when isSandbox is true', () => {
    expect(getQBApiBaseUrl(true)).toBe('https://sandbox-quickbooks.api.intuit.com')
  })

  it('should return production URL when isSandbox is false', () => {
    expect(getQBApiBaseUrl(false)).toBe('https://quickbooks.api.intuit.com')
  })
})

describe('buildQBApiUrl', () => {
  it('should build correct sandbox URL', () => {
    const url = buildQBApiUrl('realm-123', 'vendor', true)
    expect(url).toBe('https://sandbox-quickbooks.api.intuit.com/v3/company/realm-123/vendor')
  })

  it('should build correct production URL', () => {
    const url = buildQBApiUrl('realm-456', 'invoice', false)
    expect(url).toBe('https://quickbooks.api.intuit.com/v3/company/realm-456/invoice')
  })

  it('should handle different endpoints', () => {
    const vendorUrl = buildQBApiUrl('realm', 'vendor', false)
    const invoiceUrl = buildQBApiUrl('realm', 'invoice', false)
    const accountUrl = buildQBApiUrl('realm', 'account', false)

    expect(vendorUrl).toContain('/vendor')
    expect(invoiceUrl).toContain('/invoice')
    expect(accountUrl).toContain('/account')
  })
})

// =============================================
// Interface Validation Tests
// =============================================

describe('QBConnection interface', () => {
  it('should validate a complete connection object', () => {
    const connection: QBConnection = {
      id: 'conn-1',
      company_id: 'company-1',
      realm_id: 'realm-123456',
      company_name: 'Test Construction Inc',
      access_token: 'encrypted-access-token',
      refresh_token: 'encrypted-refresh-token',
      token_expires_at: '2024-01-15T10:00:00Z',
      refresh_token_expires_at: '2024-04-15T10:00:00Z',
      is_sandbox: false,
      is_active: true,
      last_connected_at: '2024-01-15T08:00:00Z',
      last_sync_at: '2024-01-15T09:00:00Z',
      connection_error: null,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T09:00:00Z',
      created_by: 'user-1',
    }

    expect(connection.realm_id).toBe('realm-123456')
    expect(connection.is_active).toBe(true)
    expect(connection.auto_sync_enabled).toBe(true)
  })
})

describe('QBAccountMapping interface', () => {
  it('should validate a complete account mapping', () => {
    const mapping: QBAccountMapping = {
      id: 'map-1',
      company_id: 'company-1',
      connection_id: 'conn-1',
      cost_code_id: 'cc-1',
      cost_code: '03000',
      qb_account_id: 'qb-123',
      qb_account_name: 'Construction Expenses',
      qb_account_type: 'Expense',
      qb_account_number: '6100',
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }

    expect(mapping.qb_account_id).toBe('qb-123')
    expect(mapping.is_default).toBe(true)
  })
})

describe('QBEntityMapping interface', () => {
  it('should validate a complete entity mapping', () => {
    const mapping: QBEntityMapping = {
      id: 'em-1',
      company_id: 'company-1',
      connection_id: 'conn-1',
      local_entity_type: 'payment_applications',
      local_entity_id: 'pa-123',
      qb_entity_type: 'invoice',
      qb_entity_id: 'qb-inv-456',
      qb_sync_token: '1',
      sync_status: 'synced',
      last_synced_at: '2024-01-15T10:00:00Z',
      last_sync_error: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    }

    expect(mapping.qb_entity_type).toBe('invoice')
    expect(mapping.sync_status).toBe('synced')
  })
})

describe('QBSyncLog interface', () => {
  it('should validate a complete sync log', () => {
    const log: QBSyncLog = {
      id: 'log-1',
      company_id: 'company-1',
      connection_id: 'conn-1',
      sync_type: 'manual',
      direction: 'to_quickbooks',
      entity_type: 'invoice',
      status: 'synced',
      records_processed: 10,
      records_created: 5,
      records_updated: 3,
      records_failed: 2,
      started_at: '2024-01-15T09:00:00Z',
      completed_at: '2024-01-15T09:05:00Z',
      duration_ms: 300000,
      error_message: null,
      error_details: null,
      request_summary: { count: 10 },
      response_summary: { success: 8, failed: 2 },
      initiated_by: 'user-1',
    }

    expect(log.records_processed).toBe(10)
    expect(log.status).toBe('synced')
  })
})

describe('QBPendingSync interface', () => {
  it('should validate a complete pending sync', () => {
    const pending: QBPendingSync = {
      id: 'ps-1',
      company_id: 'company-1',
      connection_id: 'conn-1',
      local_entity_type: 'payment_applications',
      local_entity_id: 'pa-123',
      direction: 'to_quickbooks',
      priority: 1,
      scheduled_at: '2024-01-15T10:00:00Z',
      attempt_count: 0,
      max_attempts: 3,
      last_attempt_at: null,
      last_error: null,
      status: 'pending',
      created_at: '2024-01-15T09:00:00Z',
      created_by: 'user-1',
    }

    expect(pending.priority).toBe(1)
    expect(pending.status).toBe('pending')
    expect(pending.max_attempts).toBe(3)
  })
})

describe('QBConnectionStatus interface', () => {
  it('should validate connection status structure', () => {
    const status: QBConnectionStatus = {
      isConnected: true,
      connectionId: 'conn-1',
      companyName: 'Test Construction',
      realmId: 'realm-123',
      isSandbox: false,
      lastSyncAt: '2024-01-15T10:00:00Z',
      tokenExpiresAt: '2024-01-16T10:00:00Z',
      isTokenExpired: false,
      needsReauth: false,
      connectionError: null,
      autoSyncEnabled: true,
      syncFrequencyHours: 24,
    }

    expect(status.isConnected).toBe(true)
    expect(status.needsReauth).toBe(false)
  })
})

describe('QBSyncStats interface', () => {
  it('should validate sync stats structure', () => {
    const stats: QBSyncStats = {
      totalMappedEntities: 150,
      pendingSyncs: 5,
      failedSyncs: 2,
      lastSyncAt: '2024-01-15T10:00:00Z',
      syncsByEntityType: {
        vendor: { total: 50, synced: 48, pending: 1, failed: 1 },
        customer: { total: 20, synced: 20, pending: 0, failed: 0 },
        invoice: { total: 80, synced: 75, pending: 4, failed: 1 },
        bill: { total: 0, synced: 0, pending: 0, failed: 0 },
        payment: { total: 0, synced: 0, pending: 0, failed: 0 },
        expense: { total: 0, synced: 0, pending: 0, failed: 0 },
        account: { total: 0, synced: 0, pending: 0, failed: 0 },
        journal_entry: { total: 0, synced: 0, pending: 0, failed: 0 },
      },
    }

    expect(stats.totalMappedEntities).toBe(150)
    expect(stats.syncsByEntityType.vendor.synced).toBe(48)
  })
})
