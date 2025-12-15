/**
 * Multi-Tenant Data Isolation Tests
 *
 * CRITICAL SECURITY TESTS - Validates that data isolation between
 * companies is properly enforced at all levels.
 *
 * These tests simulate the data isolation logic that should be enforced
 * by both application code and database RLS policies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Types
// ============================================================================

interface TenantContext {
  companyId: string
  userId: string
  role: string
  projectIds: string[]
}

interface ResourceBase {
  id: string
  company_id: string
  created_at: string
  created_by: string
}

interface Project extends ResourceBase {
  name: string
  status: 'active' | 'completed' | 'on_hold'
}

interface DailyReport extends ResourceBase {
  project_id: string
  report_date: string
  status: 'draft' | 'submitted' | 'approved'
  weather_summary: string
}

interface PaymentApplication extends ResourceBase {
  project_id: string
  application_number: number
  period_to: string
  current_payment_due: number
  status: 'draft' | 'submitted' | 'certified' | 'paid'
}

interface ChangeOrder extends ResourceBase {
  project_id: string
  co_number: number
  title: string
  amount: number
  status: 'draft' | 'pending' | 'approved' | 'rejected'
}

interface RFI extends ResourceBase {
  project_id: string
  rfi_number: number
  subject: string
  status: 'draft' | 'open' | 'responded' | 'closed'
}

interface User extends ResourceBase {
  email: string
  full_name: string
  role: string
  is_active: boolean
}

// ============================================================================
// Mock Data - Two Separate Companies
// ============================================================================

const COMPANY_A = {
  id: 'company-a-uuid',
  name: 'ABC Construction',
}

const COMPANY_B = {
  id: 'company-b-uuid',
  name: 'XYZ Builders',
}

// Users for Company A
const usersCompanyA: User[] = [
  {
    id: 'user-a1',
    company_id: COMPANY_A.id,
    email: 'admin@abc.com',
    full_name: 'Alice Admin',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'system',
  },
  {
    id: 'user-a2',
    company_id: COMPANY_A.id,
    email: 'pm@abc.com',
    full_name: 'Paul PM',
    role: 'project_manager',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    created_by: 'user-a1',
  },
  {
    id: 'user-a3',
    company_id: COMPANY_A.id,
    email: 'worker@abc.com',
    full_name: 'Walter Worker',
    role: 'field_worker',
    is_active: true,
    created_at: '2024-01-03T00:00:00Z',
    created_by: 'user-a1',
  },
]

// Users for Company B
const usersCompanyB: User[] = [
  {
    id: 'user-b1',
    company_id: COMPANY_B.id,
    email: 'admin@xyz.com',
    full_name: 'Bob Admin',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'system',
  },
  {
    id: 'user-b2',
    company_id: COMPANY_B.id,
    email: 'pm@xyz.com',
    full_name: 'Patricia PM',
    role: 'project_manager',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    created_by: 'user-b1',
  },
]

// Projects for Company A
const projectsCompanyA: Project[] = [
  {
    id: 'project-a1',
    company_id: COMPANY_A.id,
    name: 'Downtown Office Tower',
    status: 'active',
    created_at: '2024-02-01T00:00:00Z',
    created_by: 'user-a1',
  },
  {
    id: 'project-a2',
    company_id: COMPANY_A.id,
    name: 'Suburban Mall Expansion',
    status: 'active',
    created_at: '2024-03-01T00:00:00Z',
    created_by: 'user-a2',
  },
]

// Projects for Company B
const projectsCompanyB: Project[] = [
  {
    id: 'project-b1',
    company_id: COMPANY_B.id,
    name: 'Riverside Apartments',
    status: 'active',
    created_at: '2024-02-15T00:00:00Z',
    created_by: 'user-b1',
  },
]

// Daily Reports
const dailyReportsCompanyA: DailyReport[] = [
  {
    id: 'report-a1',
    company_id: COMPANY_A.id,
    project_id: 'project-a1',
    report_date: '2024-06-01',
    status: 'submitted',
    weather_summary: 'Sunny, 75F',
    created_at: '2024-06-01T18:00:00Z',
    created_by: 'user-a3',
  },
]

const dailyReportsCompanyB: DailyReport[] = [
  {
    id: 'report-b1',
    company_id: COMPANY_B.id,
    project_id: 'project-b1',
    report_date: '2024-06-01',
    status: 'draft',
    weather_summary: 'Cloudy, 68F',
    created_at: '2024-06-01T17:00:00Z',
    created_by: 'user-b2',
  },
]

// Payment Applications
const paymentAppsCompanyA: PaymentApplication[] = [
  {
    id: 'payapp-a1',
    company_id: COMPANY_A.id,
    project_id: 'project-a1',
    application_number: 1,
    period_to: '2024-05-31',
    current_payment_due: 250000,
    status: 'submitted',
    created_at: '2024-06-05T00:00:00Z',
    created_by: 'user-a2',
  },
]

const paymentAppsCompanyB: PaymentApplication[] = [
  {
    id: 'payapp-b1',
    company_id: COMPANY_B.id,
    project_id: 'project-b1',
    application_number: 3,
    period_to: '2024-05-31',
    current_payment_due: 180000,
    status: 'certified',
    created_at: '2024-06-04T00:00:00Z',
    created_by: 'user-b2',
  },
]

// Change Orders
const changeOrdersCompanyA: ChangeOrder[] = [
  {
    id: 'co-a1',
    company_id: COMPANY_A.id,
    project_id: 'project-a1',
    co_number: 1,
    title: 'Additional HVAC Units',
    amount: 45000,
    status: 'pending',
    created_at: '2024-05-15T00:00:00Z',
    created_by: 'user-a2',
  },
]

// RFIs
const rfisCompanyA: RFI[] = [
  {
    id: 'rfi-a1',
    company_id: COMPANY_A.id,
    project_id: 'project-a1',
    rfi_number: 1,
    subject: 'Foundation Rebar Spacing',
    status: 'open',
    created_at: '2024-04-20T00:00:00Z',
    created_by: 'user-a2',
  },
]

const rfisCompanyB: RFI[] = [
  {
    id: 'rfi-b1',
    company_id: COMPANY_B.id,
    project_id: 'project-b1',
    rfi_number: 1,
    subject: 'Window Specifications',
    status: 'responded',
    created_at: '2024-04-25T00:00:00Z',
    created_by: 'user-b2',
  },
]

// ============================================================================
// Data Access Simulation Functions
// ============================================================================

/**
 * Simulates fetching resources filtered by tenant context
 */
function fetchResourcesForTenant<T extends ResourceBase>(
  resources: T[],
  context: TenantContext
): T[] {
  return resources.filter((r) => r.company_id === context.companyId)
}

/**
 * Simulates fetching a single resource by ID with tenant check
 */
function fetchResourceById<T extends ResourceBase>(
  resources: T[],
  id: string,
  context: TenantContext
): T | null {
  const resource = resources.find((r) => r.id === id)
  if (!resource) {return null}
  if (resource.company_id !== context.companyId) {return null} // CRITICAL: Block cross-tenant access
  return resource
}

/**
 * Simulates checking if user can access a resource
 */
function canAccessResource<T extends ResourceBase>(
  resource: T,
  context: TenantContext
): boolean {
  return resource.company_id === context.companyId
}

/**
 * Simulates creating a resource with tenant context
 */
function createResource<T extends ResourceBase>(
  resource: Omit<T, 'company_id' | 'created_by'>,
  context: TenantContext
): T {
  return {
    ...resource,
    company_id: context.companyId, // CRITICAL: Always set to current tenant
    created_by: context.userId,
  } as T
}

// ============================================================================
// Test Suite: Cross-Tenant Data Isolation
// ============================================================================

describe('Data Isolation - Cross-Tenant Access Prevention', () => {
  const contextCompanyA: TenantContext = {
    companyId: COMPANY_A.id,
    userId: 'user-a1',
    role: 'admin',
    projectIds: ['project-a1', 'project-a2'],
  }

  const contextCompanyB: TenantContext = {
    companyId: COMPANY_B.id,
    userId: 'user-b1',
    role: 'admin',
    projectIds: ['project-b1'],
  }

  describe('Projects', () => {
    it('should only return projects for the current tenant', () => {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]

      const companyAProjects = fetchResourcesForTenant(allProjects, contextCompanyA)
      const companyBProjects = fetchResourcesForTenant(allProjects, contextCompanyB)

      expect(companyAProjects).toHaveLength(2)
      expect(companyAProjects.every((p) => p.company_id === COMPANY_A.id)).toBe(true)

      expect(companyBProjects).toHaveLength(1)
      expect(companyBProjects.every((p) => p.company_id === COMPANY_B.id)).toBe(true)
    })

    it('should block direct access to other tenant projects by ID', () => {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]

      // Company A trying to access Company B project
      const blockedAccess = fetchResourceById(allProjects, 'project-b1', contextCompanyA)
      expect(blockedAccess).toBeNull()

      // Company B trying to access Company A project
      const blockedAccess2 = fetchResourceById(allProjects, 'project-a1', contextCompanyB)
      expect(blockedAccess2).toBeNull()
    })

    it('should allow access to own tenant projects', () => {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]

      const ownProject = fetchResourceById(allProjects, 'project-a1', contextCompanyA)
      expect(ownProject).not.toBeNull()
      expect(ownProject?.name).toBe('Downtown Office Tower')
    })
  })

  describe('Daily Reports', () => {
    it('should only return daily reports for the current tenant', () => {
      const allReports = [...dailyReportsCompanyA, ...dailyReportsCompanyB]

      const companyAReports = fetchResourcesForTenant(allReports, contextCompanyA)
      const companyBReports = fetchResourcesForTenant(allReports, contextCompanyB)

      expect(companyAReports).toHaveLength(1)
      expect(companyAReports[0].company_id).toBe(COMPANY_A.id)

      expect(companyBReports).toHaveLength(1)
      expect(companyBReports[0].company_id).toBe(COMPANY_B.id)
    })

    it('should block cross-tenant report access by ID', () => {
      const allReports = [...dailyReportsCompanyA, ...dailyReportsCompanyB]

      const blocked = fetchResourceById(allReports, 'report-b1', contextCompanyA)
      expect(blocked).toBeNull()
    })
  })

  describe('Payment Applications', () => {
    it('should isolate payment applications by tenant', () => {
      const allPayApps = [...paymentAppsCompanyA, ...paymentAppsCompanyB]

      const companyAPayApps = fetchResourcesForTenant(allPayApps, contextCompanyA)
      expect(companyAPayApps).toHaveLength(1)
      expect(companyAPayApps[0].current_payment_due).toBe(250000)

      const companyBPayApps = fetchResourcesForTenant(allPayApps, contextCompanyB)
      expect(companyBPayApps).toHaveLength(1)
      expect(companyBPayApps[0].current_payment_due).toBe(180000)
    })

    it('should block access to other tenant financial data', () => {
      const allPayApps = [...paymentAppsCompanyA, ...paymentAppsCompanyB]

      // This is CRITICAL - financial data must never leak across tenants
      const blockedFinancials = fetchResourceById(allPayApps, 'payapp-b1', contextCompanyA)
      expect(blockedFinancials).toBeNull()
    })
  })

  describe('Change Orders', () => {
    it('should block access to other tenant change orders', () => {
      const blocked = fetchResourceById(changeOrdersCompanyA, 'co-a1', contextCompanyB)
      expect(blocked).toBeNull()
    })
  })

  describe('RFIs', () => {
    it('should isolate RFIs by tenant', () => {
      const allRFIs = [...rfisCompanyA, ...rfisCompanyB]

      const companyARFIs = fetchResourcesForTenant(allRFIs, contextCompanyA)
      const companyBRFIs = fetchResourcesForTenant(allRFIs, contextCompanyB)

      expect(companyARFIs).toHaveLength(1)
      expect(companyARFIs[0].subject).toBe('Foundation Rebar Spacing')

      expect(companyBRFIs).toHaveLength(1)
      expect(companyBRFIs[0].subject).toBe('Window Specifications')
    })
  })

  describe('Users', () => {
    it('should only show users from current tenant', () => {
      const allUsers = [...usersCompanyA, ...usersCompanyB]

      const companyAUsers = fetchResourcesForTenant(allUsers, contextCompanyA)
      expect(companyAUsers).toHaveLength(3)
      expect(companyAUsers.every((u) => u.company_id === COMPANY_A.id)).toBe(true)

      const companyBUsers = fetchResourcesForTenant(allUsers, contextCompanyB)
      expect(companyBUsers).toHaveLength(2)
      expect(companyBUsers.every((u) => u.company_id === COMPANY_B.id)).toBe(true)
    })

    it('should block access to user details from other tenant', () => {
      const allUsers = [...usersCompanyA, ...usersCompanyB]

      const blockedUser = fetchResourceById(allUsers, 'user-b1', contextCompanyA)
      expect(blockedUser).toBeNull()
    })
  })
})

// ============================================================================
// Test Suite: Resource Creation with Tenant Context
// ============================================================================

describe('Data Isolation - Resource Creation', () => {
  it('should automatically set company_id to current tenant', () => {
    const context: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a2',
      role: 'project_manager',
      projectIds: ['project-a1'],
    }

    const newProject = createResource<Project>(
      {
        id: 'new-project',
        name: 'New Building',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      context
    )

    expect(newProject.company_id).toBe(COMPANY_A.id)
    expect(newProject.created_by).toBe('user-a2')
  })

  it('should NEVER allow specifying a different company_id', () => {
    const context: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a2',
      role: 'project_manager',
      projectIds: ['project-a1'],
    }

    // Even if we try to sneak in a different company_id, it should be overwritten
    const maliciousAttempt = {
      id: 'hack-project',
      name: 'Sneaky Project',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      company_id: COMPANY_B.id, // Trying to inject different company
    }

    // The createResource function should ignore/overwrite any provided company_id
    const created = createResource<Project>(maliciousAttempt, context)

    // CRITICAL: The company_id must be the current tenant's, not the injected one
    expect(created.company_id).toBe(COMPANY_A.id)
    expect(created.company_id).not.toBe(COMPANY_B.id)
  })
})

// ============================================================================
// Test Suite: Nested Resource Access
// ============================================================================

describe('Data Isolation - Nested Resource Access', () => {
  it('should block access to nested resources through valid-looking paths', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1'],
    }

    // Scenario: User A knows about project-b1 (Company B)
    // They try to access daily reports for that project
    // Even though they have "admin" role, they should not see Company B reports

    const allReports = [...dailyReportsCompanyA, ...dailyReportsCompanyB]

    // Filter by project_id that belongs to another tenant
    const attemptedAccess = allReports.filter((r) => r.project_id === 'project-b1')

    // Now apply tenant filtering (this should filter it out)
    const filteredAccess = attemptedAccess.filter(
      (r) => r.company_id === contextA.companyId
    )

    expect(filteredAccess).toHaveLength(0)
  })

  it('should validate project belongs to tenant before allowing report access', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1', 'project-a2'],
    }

    // Function to check if project belongs to user's accessible projects
    function canAccessProjectReports(projectId: string, ctx: TenantContext): boolean {
      // First check: project must be in user's accessible projects
      if (!ctx.projectIds.includes(projectId)) {return false}

      // Second check: project must belong to user's company
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]
      const project = allProjects.find((p) => p.id === projectId)
      if (!project || project.company_id !== ctx.companyId) {return false}

      return true
    }

    // Can access own company projects
    expect(canAccessProjectReports('project-a1', contextA)).toBe(true)

    // Cannot access other company projects
    expect(canAccessProjectReports('project-b1', contextA)).toBe(false)
  })
})

// ============================================================================
// Test Suite: ID Enumeration Prevention
// ============================================================================

describe('Data Isolation - ID Enumeration Prevention', () => {
  it('should not reveal existence of resources through error messages', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1'],
    }

    // Simulate a request for a resource that exists but belongs to another tenant
    function fetchProjectWithSecureError(
      id: string,
      ctx: TenantContext
    ): { data: Project | null; error: string | null } {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]
      const project = allProjects.find((p) => p.id === id)

      // CRITICAL: Return same error regardless of whether resource exists
      // This prevents attackers from discovering valid IDs
      if (!project || project.company_id !== ctx.companyId) {
        return { data: null, error: 'Resource not found' } // Same error for both cases
      }

      return { data: project, error: null }
    }

    // Test with non-existent resource
    const result1 = fetchProjectWithSecureError('non-existent-id', contextA)
    expect(result1.error).toBe('Resource not found')

    // Test with existing resource from other tenant
    const result2 = fetchProjectWithSecureError('project-b1', contextA)
    expect(result2.error).toBe('Resource not found')

    // Errors should be identical - no information leakage
    expect(result1.error).toBe(result2.error)
  })
})

// ============================================================================
// Test Suite: Bulk Operations
// ============================================================================

describe('Data Isolation - Bulk Operations', () => {
  it('should filter bulk queries to only return tenant data', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1', 'project-a2'],
    }

    // Simulate a bulk query for multiple resource types
    const dashboardData = {
      projects: fetchResourcesForTenant(
        [...projectsCompanyA, ...projectsCompanyB],
        contextA
      ),
      reports: fetchResourcesForTenant(
        [...dailyReportsCompanyA, ...dailyReportsCompanyB],
        contextA
      ),
      paymentApps: fetchResourcesForTenant(
        [...paymentAppsCompanyA, ...paymentAppsCompanyB],
        contextA
      ),
      rfis: fetchResourcesForTenant(
        [...rfisCompanyA, ...rfisCompanyB],
        contextA
      ),
    }

    // All returned data should belong to Company A
    expect(dashboardData.projects.every((p) => p.company_id === COMPANY_A.id)).toBe(true)
    expect(dashboardData.reports.every((r) => r.company_id === COMPANY_A.id)).toBe(true)
    expect(dashboardData.paymentApps.every((pa) => pa.company_id === COMPANY_A.id)).toBe(true)
    expect(dashboardData.rfis.every((rfi) => rfi.company_id === COMPANY_A.id)).toBe(true)

    // Should have correct counts
    expect(dashboardData.projects).toHaveLength(2)
    expect(dashboardData.reports).toHaveLength(1)
    expect(dashboardData.paymentApps).toHaveLength(1)
    expect(dashboardData.rfis).toHaveLength(1)
  })
})

// ============================================================================
// Test Suite: Search and Filter Operations
// ============================================================================

describe('Data Isolation - Search Operations', () => {
  it('should only search within tenant data', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1', 'project-a2'],
    }

    function searchProjects(query: string, ctx: TenantContext): Project[] {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]

      return allProjects.filter((p) => {
        // CRITICAL: Always apply tenant filter first
        if (p.company_id !== ctx.companyId) {return false}

        // Then apply search criteria
        return p.name.toLowerCase().includes(query.toLowerCase())
      })
    }

    // Search for "Apartments" should return nothing (that's Company B's project)
    const results1 = searchProjects('Apartments', contextA)
    expect(results1).toHaveLength(0)

    // Search for "Downtown" should return Company A's project
    const results2 = searchProjects('Downtown', contextA)
    expect(results2).toHaveLength(1)
    expect(results2[0].name).toBe('Downtown Office Tower')
  })

  it('should prevent SQL injection attempts from bypassing tenant filter', () => {
    const contextA: TenantContext = {
      companyId: COMPANY_A.id,
      userId: 'user-a1',
      role: 'admin',
      projectIds: ['project-a1'],
    }

    // Simulated malicious search attempt
    const maliciousQuery = "' OR '1'='1"

    function safeSearchProjects(query: string, ctx: TenantContext): Project[] {
      const allProjects = [...projectsCompanyA, ...projectsCompanyB]

      // Sanitize input (in real code, use parameterized queries)
      const sanitizedQuery = query.replace(/['"]/g, '')

      return allProjects.filter((p) => {
        // Tenant filter is ALWAYS applied
        if (p.company_id !== ctx.companyId) {return false}

        return p.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
      })
    }

    const results = safeSearchProjects(maliciousQuery, contextA)

    // Should not return any results (no project name contains "OR 1=1")
    expect(results).toHaveLength(0)

    // More importantly, should not return Company B data
    expect(results.every((r) => r.company_id === COMPANY_A.id)).toBe(true)
  })
})
