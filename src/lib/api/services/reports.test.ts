/**
 * Reports API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getProjectHealthReport,
  getDailyReportAnalytics,
  getWorkflowSummary,
  getPunchListReport,
  getSafetyIncidentReport,
  getFinancialSummary,
  getDocumentSummary,
} from './reports'

// Mock Supabase with thenable chain pattern
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  then: vi.fn(function(this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('Reports API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain - all methods return 'this' for chaining
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.gte.mockReturnThis()
    mockSupabaseChain.lte.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.from.mockReturnThis()
    // Reset the thenable to resolve with empty data
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  describe('getProjectHealthReport', () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Test Project',
      status: 'active',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      contract_value: 1000000,
      budget: 900000,
    }

    const mockWorkflowItems = [
      { workflow_type_id: 'rfi', status: 'open' },
      { workflow_type_id: 'rfi', status: 'closed' },
      { workflow_type_id: 'change_order', status: 'draft' },
      { workflow_type_id: 'submittal', status: 'pending' },
    ]

    const mockPunchItems = [
      { status: 'open' },
      { status: 'completed' },
      { status: 'verified' },
    ]

    it('should fetch project health report successfully', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
        )

      const result = await getProjectHealthReport('proj-1')

      expect(result.projectId).toBe('proj-1')
      expect(result.projectName).toBe('Test Project')
      expect(result.status).toBe('active')
      expect(result.contractValue).toBe(1000000)
      expect(result.budget).toBe(900000)
    })

    it('should calculate budget variance correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getProjectHealthReport('proj-1')

      // (1000000 - 900000) / 900000 * 100 = 11.11%
      expect(result.budgetVariance).toBeCloseTo(11.11, 1)
    })

    it('should count open items correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
        )

      const result = await getProjectHealthReport('proj-1')

      expect(result.openItems.punchListItems).toBe(1) // Only 'open' item
    })

    it('should throw error when project not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Not found' } }).then(onFulfilled)
      )

      await expect(getProjectHealthReport('nonexistent')).rejects.toThrow()
    })

    it('should handle null budget and contract_value', async () => {
      const projectNoBudget = { ...mockProject, budget: null, contract_value: null }

      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: projectNoBudget, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getProjectHealthReport('proj-1')

      expect(result.budgetVariance).toBeNull()
    })
  })

  describe('getDailyReportAnalytics', () => {
    const mockReports = [
      { id: 'report-1', status: 'submitted', report_date: '2025-01-15' },
      { id: 'report-2', status: 'approved', report_date: '2025-01-16' },
      { id: 'report-3', status: 'draft', report_date: '2025-01-17' },
    ]

    const mockWorkforce = [
      { worker_count: 10, trade: 'Electrical' },
      { worker_count: 15, trade: 'Plumbing' },
      { worker_count: 10, trade: 'Electrical' },
    ]

    const mockEquipment = [
      { equipment_type: 'Crane', hours_used: 8 },
      { equipment_type: 'Excavator', hours_used: 6 },
      { equipment_type: 'Crane', hours_used: 4 },
    ]

    const mockSafetyIncidents = [{ id: 'incident-1' }]

    it('should fetch daily report analytics successfully', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockReports, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockWorkforce, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockEquipment, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockSafetyIncidents, error: null }).then(onFulfilled)
        )

      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')

      expect(result.projectId).toBe('proj-1')
      expect(result.totalReports).toBe(3)
      expect(result.submittedReports).toBe(2) // submitted + approved
      expect(result.approvedReports).toBe(1)
      expect(result.safetyIssuesReported).toBe(1)
    })

    it('should calculate submission rate correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockReports, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')

      // 2 submitted out of 3 = 66.67%
      expect(result.submissionRate).toBeCloseTo(66.67, 1)
    })

    it('should aggregate trades correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockReports, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockWorkforce, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')

      expect(result.dominantTrades).toHaveLength(2)
      expect(result.dominantTrades[0].trade).toBe('Electrical')
      expect(result.dominantTrades[0].count).toBe(2)
    })

    it('should aggregate equipment utilization correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockReports, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockEquipment, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')

      expect(result.equipmentUtilization).toHaveLength(2)
      expect(result.equipmentUtilization[0].type).toBe('Crane')
      expect(result.equipmentUtilization[0].hoursUsed).toBe(12) // 8 + 4
    })

    it('should handle empty reports', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')

      expect(result.totalReports).toBe(0)
      expect(result.submissionRate).toBe(0)
      expect(result.averageWorkersPerDay).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      // Function returns default values when data is null (uses optional chaining)
      const result = await getDailyReportAnalytics('proj-1', '2025-01-01', '2025-01-31')
      expect(result.totalReports).toBe(0)
      expect(result.submissionRate).toBe(0)
    })
  })

  describe('getWorkflowSummary', () => {
    const mockWorkflowItems = [
      { id: '1', status: 'open', opened_date: '2025-01-01', closed_date: '2025-01-05', cost_impact: 5000, schedule_impact: 2 },
      { id: '2', status: 'closed', opened_date: '2025-01-02', closed_date: '2025-01-08', cost_impact: 3000, schedule_impact: 1 },
      { id: '3', status: 'open', opened_date: '2025-01-03', closed_date: null, cost_impact: null, schedule_impact: null },
    ]

    it('should fetch workflow summary successfully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'RFI')

      expect(result.projectId).toBe('proj-1')
      expect(result.workflowType).toBe('RFI')
      expect(result.totalCount).toBe(3)
    })

    it('should group items by status correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'RFI')

      expect(result.byStatus['open']).toBe(2)
      expect(result.byStatus['closed']).toBe(1)
    })

    it('should calculate total cost impact correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'ChangeOrder')

      expect(result.totalCostImpact).toBe(8000) // 5000 + 3000
    })

    it('should calculate total schedule impact correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'ChangeOrder')

      expect(result.totalScheduleImpact).toBe(3) // 2 + 1
    })

    it('should calculate average response time correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowItems, error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'RFI')

      // Item 1: 4 days, Item 2: 6 days, Item 3: no closed_date
      // Average = (4 + 6) / 2 = 5 days
      expect(result.averageResponseTime).toBe(5)
    })

    it('should handle empty workflow items', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'RFI')

      expect(result.totalCount).toBe(0)
      expect(result.averageResponseTime).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      // When data is null, function uses optional chaining and returns defaults
      // This test verifies the function completes without throwing
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      const result = await getWorkflowSummary('proj-1', 'RFI')
      // Function should return an object with the expected shape
      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('workflowType')
    })
  })

  describe('getPunchListReport', () => {
    const mockPunchItems = [
      { id: '1', status: 'open', trade: 'Electrical', created_at: '2025-01-01', completed_date: null, priority: 'high', building: 'A', floor: '1', room: '101' },
      { id: '2', status: 'completed', trade: 'Electrical', created_at: '2025-01-02', completed_date: '2025-01-10', priority: 'normal', building: 'A', floor: '1', room: '102' },
      { id: '3', status: 'rejected', trade: 'Plumbing', created_at: '2025-01-03', completed_date: null, priority: 'low', building: 'B', floor: '2', room: '201' },
      { id: '4', status: 'verified', trade: 'Plumbing', created_at: '2025-01-04', completed_date: '2025-01-12', priority: 'normal', building: 'B', floor: '2', room: '202' },
    ]

    it('should fetch punch list report successfully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      expect(result.projectId).toBe('proj-1')
      expect(result.totalItems).toBe(4)
    })

    it('should group items by status correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      expect(result.byStatus['open']).toBe(1)
      expect(result.byStatus['completed']).toBe(1)
      expect(result.byStatus['rejected']).toBe(1)
      expect(result.byStatus['verified']).toBe(1)
    })

    it('should group items by trade with completion rate', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      const electrical = result.byTrade.find(t => t.trade === 'Electrical')
      expect(electrical?.count).toBe(2)
      expect(electrical?.completionRate).toBe(50) // 1 completed out of 2

      const plumbing = result.byTrade.find(t => t.trade === 'Plumbing')
      expect(plumbing?.count).toBe(2)
      expect(plumbing?.completionRate).toBe(50) // 1 verified out of 2
    })

    it('should group items by location correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      expect(result.byLocation).toHaveLength(4) // 4 unique locations
    })

    it('should calculate rejection rate correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPunchItems, error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      expect(result.rejectionRate).toBe(25) // 1 out of 4 = 25%
    })

    it('should handle empty punch list', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await getPunchListReport('proj-1')

      expect(result.totalItems).toBe(0)
      expect(result.averageDaysOpen).toBe(0)
      expect(result.rejectionRate).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      // Function returns default values when data is null (uses optional chaining)
      const result = await getPunchListReport('proj-1')
      expect(result.totalItems).toBe(0)
      expect(result.byStatus).toEqual({})
    })
  })

  describe('getSafetyIncidentReport', () => {
    const mockIncidents = [
      { id: '1', incident_type: 'slip', severity: 'minor', incident_date: '2025-01-15', status: 'closed', created_at: '2025-01-15' },
      { id: '2', incident_type: 'fall', severity: 'major', incident_date: '2025-01-16', status: 'open', created_at: '2025-01-16' },
      { id: '3', incident_type: 'slip', severity: 'minor', incident_date: '2025-01-17', status: 'closed', created_at: '2025-01-17' },
    ]

    it('should fetch safety incident report successfully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')

      expect(result.projectId).toBe('proj-1')
      expect(result.totalIncidents).toBe(3)
      expect(result.dateRange.startDate).toBe('2025-01-01')
      expect(result.dateRange.endDate).toBe('2025-01-31')
    })

    it('should group incidents by type correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')

      expect(result.byType['slip']).toBe(2)
      expect(result.byType['fall']).toBe(1)
    })

    it('should group incidents by severity correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')

      expect(result.bySeverity['minor']).toBe(2)
      expect(result.bySeverity['major']).toBe(1)
    })

    it('should count open incidents correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')

      expect(result.openIncidents).toBe(1) // Only incident 2 is open
    })

    it('should handle empty incidents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')

      expect(result.totalIncidents).toBe(0)
      expect(result.openIncidents).toBe(0)
      expect(result.averageResolutionTime).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      // Function returns default values when data is null (uses optional chaining)
      const result = await getSafetyIncidentReport('proj-1', '2025-01-01', '2025-01-31')
      expect(result.totalIncidents).toBe(0)
      expect(result.openIncidents).toBe(0)
    })
  })

  describe('getFinancialSummary', () => {
    const mockProject = {
      contract_value: 1000000,
      budget: 900000,
    }

    const mockChangeOrders = [
      { cost_impact: 50000, status: 'approved' },
      { cost_impact: 25000, status: 'approved' },
      { cost_impact: null, status: 'draft' },
    ]

    it('should fetch financial summary successfully', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockChangeOrders, error: null }).then(onFulfilled)
        )

      const result = await getFinancialSummary('proj-1')

      expect(result.projectId).toBe('proj-1')
      expect(result.contractValue).toBe(1000000)
      expect(result.budget).toBe(900000)
    })

    it('should calculate change orders impact correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockChangeOrders, error: null }).then(onFulfilled)
        )

      const result = await getFinancialSummary('proj-1')

      expect(result.changeOrdersImpact).toBe(75000) // 50000 + 25000
    })

    it('should calculate forecasted total correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockChangeOrders, error: null }).then(onFulfilled)
        )

      const result = await getFinancialSummary('proj-1')

      expect(result.forecastedTotal).toBe(1075000) // 1000000 + 75000
    })

    it('should calculate percentage over budget correctly', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockProject, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockChangeOrders, error: null }).then(onFulfilled)
        )

      const result = await getFinancialSummary('proj-1')

      // (1075000 - 900000) / 900000 * 100 = 19.44%
      expect(result.percentageOverBudget).toBeCloseTo(19.44, 1)
    })

    it('should handle null budget', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: { contract_value: 1000000, budget: null }, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled)
        )

      const result = await getFinancialSummary('proj-1')

      expect(result.budget).toBe(0)
      expect(result.percentageOverBudget).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      // Function returns default values when data is null (uses optional chaining)
      const result = await getFinancialSummary('proj-1')
      expect(result.budget).toBe(0)
      expect(result.contractValue).toBe(0)
    })
  })

  describe('getDocumentSummary', () => {
    const mockDocuments = [
      { document_type: 'drawing', discipline: 'Structural', status: 'approved', requires_approval: false },
      { document_type: 'drawing', discipline: 'Electrical', status: 'pending', requires_approval: true },
      { document_type: 'specification', discipline: 'Structural', status: 'superseded', requires_approval: false },
      { document_type: 'photo', discipline: null, status: 'approved', requires_approval: false },
    ]

    it('should fetch document summary successfully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      expect(result.projectId).toBe('proj-1')
      expect(result.totalDocuments).toBe(4)
    })

    it('should group documents by type correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      expect(result.byType['drawing']).toBe(2)
      expect(result.byType['specification']).toBe(1)
      expect(result.byType['photo']).toBe(1)
    })

    it('should group documents by discipline correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      const structural = result.byDiscipline.find(d => d.discipline === 'Structural')
      expect(structural?.count).toBe(2)

      const electrical = result.byDiscipline.find(d => d.discipline === 'Electrical')
      expect(electrical?.count).toBe(1)
    })

    it('should count outstanding approvals correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      expect(result.outstandingApprovals).toBe(1) // Only doc 2 requires approval
    })

    it('should count superseded documents correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      expect(result.supersededCount).toBe(1) // Only doc 3 is superseded
    })

    it('should handle empty documents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await getDocumentSummary('proj-1')

      expect(result.totalDocuments).toBe(0)
      expect(result.outstandingApprovals).toBe(0)
      expect(result.supersededCount).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      // Function returns default values when data is null (uses optional chaining)
      const result = await getDocumentSummary('proj-1')
      expect(result.totalDocuments).toBe(0)
      expect(result.outstandingApprovals).toBe(0)
    })
  })
})
