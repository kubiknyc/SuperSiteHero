/**
 * Equipment API Service Tests
 *
 * Comprehensive tests for equipment tracking including CRUD operations,
 * assignments, logs, maintenance, inspections, and cost integration.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Mock Supabase - use vi.hoisted to make these available to vi.mock
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockIn,
  mockIs,
  mockNot,
  mockGt,
  mockGte,
  mockLte,
  mockOr,
  mockOrder,
  mockSingle,
  mockLimit,
  mockAuthGetUser,
  mockRpc,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
  mockIs: vi.fn(),
  mockNot: vi.fn(),
  mockGt: vi.fn(),
  mockGte: vi.fn(),
  mockLte: vi.fn(),
  mockOr: vi.fn(),
  mockOrder: vi.fn(),
  mockSingle: vi.fn(),
  mockLimit: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: mockAuthGetUser,
    },
    rpc: mockRpc,
  },
}))

import {
  equipmentApi,
  equipmentAssignmentsApi,
  equipmentLogsApi,
  equipmentMaintenanceApi,
  equipmentInspectionsApi,
} from './equipment'

describe('equipmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default chainable mock behavior
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })

    // Create a shared mutable state for the resolved value
    // Tests can update this to change what the query resolves to
    let queryResolvedValue = { data: [], error: null }

    // Create a chainable object that all methods will return
    // This object is also thenable so it can be awaited
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        in: mockIn,
        is: mockIs,
        not: mockNot,
        gt: mockGt,
        gte: mockGte,
        lte: mockLte,
        or: mockOr,
        order: mockOrder,
        single: mockSingle,
        limit: mockLimit,
        select: mockSelect,
      }
      // Make the object thenable (Promise-like) - reads current queryResolvedValue
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    // All chainable methods return a fresh chainable
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockIn.mockImplementation(() => createChainable())
    mockIs.mockImplementation(() => createChainable())
    mockNot.mockImplementation(() => createChainable())
    mockGt.mockImplementation(() => createChainable())
    mockGte.mockImplementation(() => createChainable())
    mockLte.mockImplementation(() => createChainable())
    mockOr.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())

    // Helper to set the query result for tests
    // Tests should call this instead of mockXxx.mockResolvedValue()
    ;(globalThis as any).setQueryResult = (result: { data: any; error: any }) => {
      queryResolvedValue = result
    }

    mockLimit.mockResolvedValue({ data: [], error: null })

    mockInsert.mockReturnValue({
      select: mockSelect,
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
    })

    mockDelete.mockReturnValue({
      eq: mockEq,
    })

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
  })

  // Declare setQueryResult type for tests
  const setQueryResult = (result: { data: any; error: any }) => {
    ;(globalThis as any).setQueryResult(result)
  }

  describe('getEquipment', () => {
    it('should get all equipment for a company', async () => {
      const mockEquipment = [
        { id: '1', equipment_number: 'EQ-001', name: 'Excavator', status: 'available' },
        { id: '2', equipment_number: 'EQ-002', name: 'Bulldozer', status: 'in_use' },
      ]

      setQueryResult({ data: mockEquipment, error: null })

      const result = await equipmentApi.getEquipment({ companyId: 'company-123' })

      expect(mockFrom).toHaveBeenCalledWith('equipment_summary')
      expect(mockEq).toHaveBeenCalledWith('company_id', 'company-123')
      expect(mockOrder).toHaveBeenCalledWith('equipment_number', { ascending: true })
      expect(result).toEqual(mockEquipment)
    })

    it('should filter by equipment_type (single)', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        equipmentType: 'excavator',
      })

      expect(mockEq).toHaveBeenCalledWith('equipment_type', 'excavator')
    })

    it('should filter by equipment_type (multiple)', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        equipmentType: ['excavator', 'bulldozer'],
      })

      expect(mockIn).toHaveBeenCalledWith('equipment_type', ['excavator', 'bulldozer'])
    })

    it('should filter by category', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        category: 'heavy_equipment',
      })

      expect(mockEq).toHaveBeenCalledWith('category', 'heavy_equipment')
    })

    it('should filter by status', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        status: ['available', 'in_use'],
      })

      expect(mockIn).toHaveBeenCalledWith('status', ['available', 'in_use'])
    })

    it('should filter by ownership_type', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        ownershipType: 'rented',
      })

      expect(mockEq).toHaveBeenCalledWith('ownership_type', 'rented')
    })

    it('should filter by current_project_id', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        currentProjectId: 'project-123',
      })

      expect(mockEq).toHaveBeenCalledWith('current_project_id', 'project-123')
    })

    it('should search equipment by multiple fields', async () => {
      // Default chainable already resolves to { data: [], error: null }

      await equipmentApi.getEquipment({
        companyId: 'company-123',
        search: 'CAT',
      })

      expect(mockOr).toHaveBeenCalledWith('name.ilike.%CAT%,equipment_number.ilike.%CAT%,make.ilike.%CAT%,model.ilike.%CAT%')
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database error')
      setQueryResult({ data: null, error: mockError })

      await expect(equipmentApi.getEquipment({ companyId: 'company-123' })).rejects.toThrow('Database error')
    })

    it('should return empty array when no data', async () => {
      setQueryResult({ data: null, error: null })

      const result = await equipmentApi.getEquipment({ companyId: 'company-123' })

      expect(result).toEqual([])
    })
  })

  describe('getEquipmentById', () => {
    it('should get equipment with all details', async () => {
      const mockEquipment = { id: 'eq-123', equipment_number: 'EQ-001', name: 'Excavator' }
      const mockAssignments = [{ id: 'assign-1', status: 'active' }]
      const mockLogs = [{ id: 'log-1', log_date: '2025-01-20' }]
      const mockMaintenance = [{ id: 'maint-1', status: 'scheduled' }]

      mockSingle.mockResolvedValueOnce({ data: mockEquipment, error: null })
      mockOrder.mockResolvedValueOnce({ data: mockAssignments, error: null })
      mockLimit.mockResolvedValueOnce({ data: mockLogs, error: null })
      mockLimit.mockResolvedValueOnce({ data: mockMaintenance, error: null })

      const result = await equipmentApi.getEquipmentById('eq-123')

      expect(result.active_assignments).toEqual(mockAssignments)
      expect(result.recent_logs).toEqual(mockLogs)
      expect(result.upcoming_maintenance).toEqual(mockMaintenance)
    })

    it('should handle not found error', async () => {
      const mockError = new Error('Not found')
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(equipmentApi.getEquipmentById('nonexistent')).rejects.toThrow('Not found')
    })
  })

  describe('createEquipment', () => {
    it('should create equipment with required fields', async () => {
      const mockEquipment = {
        id: 'new-eq',
        equipment_number: 'EQ-100',
        name: 'New Excavator',
        equipment_type: 'excavator',
        status: 'available',
      }

      // First call: get user company, second call: create equipment
      mockSingle
        .mockResolvedValueOnce({ data: { company_id: 'company-123' }, error: null })
        .mockResolvedValueOnce({ data: mockEquipment, error: null })

      const dto = {
        equipment_number: 'EQ-100',
        name: 'New Excavator',
        equipment_type: 'excavator' as const,
      }

      const result = await equipmentApi.createEquipment(dto)

      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockFrom).toHaveBeenCalledWith('equipment')
      expect(mockInsert).toHaveBeenCalled()

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.equipment_number).toBe('EQ-100')
      expect(insertCall.name).toBe('New Excavator')
      expect(insertCall.status).toBe('available')
      expect(insertCall.ownership_type).toBe('owned')

      expect(result).toEqual(mockEquipment)
    })

    it('should create equipment with all optional fields', async () => {
      // First call: get user company, second call: create equipment
      mockSingle
        .mockResolvedValueOnce({ data: { company_id: 'company-123' }, error: null })
        .mockResolvedValueOnce({ data: {}, error: null })

      const dto = {
        equipment_number: 'EQ-100',
        name: 'Detailed Excavator',
        description: 'Large excavator for heavy work',
        equipment_type: 'excavator' as const,
        category: 'heavy_equipment',
        make: 'Caterpillar',
        model: '320D',
        year: 2020,
        serial_number: 'SN123456',
        vin: 'VIN789012',
        ownership_type: 'rented' as const,
        owner_company: 'Rental Corp',
        rental_rate: 500,
        rental_rate_type: 'daily' as const,
        capacity: '2.5 cubic yards',
        operating_weight: 20000,
        dimensions: '30ft x 10ft x 12ft',
        status: 'maintenance' as const,
        current_location: 'Yard A',
        current_hours: 1000,
        current_miles: 5000,
        purchase_price: 250000,
        purchase_date: '2020-01-15',
        hourly_cost: 75,
        fuel_type: 'diesel',
        insurance_policy: 'POL-123',
        insurance_expiry: '2025-12-31',
        registration_number: 'REG-456',
        registration_expiry: '2025-06-30',
        requires_certified_operator: true,
        certification_type: 'Heavy Equipment Operator',
        image_url: 'https://example.com/eq.jpg',
        notes: 'Special maintenance notes',
      }

      await equipmentApi.createEquipment(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.make).toBe('Caterpillar')
      expect(insertCall.model).toBe('320D')
      expect(insertCall.ownership_type).toBe('rented')
      expect(insertCall.requires_certified_operator).toBe(true)
    })

    it('should handle user company not found', async () => {
      // User company lookup returns null
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const dto = {
        equipment_number: 'EQ-100',
        name: 'Test',
        equipment_type: 'excavator' as const,
      }

      await expect(equipmentApi.createEquipment(dto)).rejects.toThrow('User company not found')
    })

    it('should handle creation errors', async () => {
      const mockError = new Error('Creation failed')
      // First call: get user company succeeds, second call: create fails
      mockSingle
        .mockResolvedValueOnce({ data: { company_id: 'company-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: mockError })

      const dto = {
        equipment_number: 'EQ-100',
        name: 'Test',
        equipment_type: 'excavator' as const,
      }

      await expect(equipmentApi.createEquipment(dto)).rejects.toThrow('Creation failed')
    })
  })

  describe('updateEquipment', () => {
    it('should update equipment fields', async () => {
      const mockUpdated = { id: 'eq-123', name: 'Updated Name' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await equipmentApi.updateEquipment('eq-123', {
        name: 'Updated Name',
        current_hours: 1500,
      })

      expect(mockFrom).toHaveBeenCalledWith('equipment')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'eq-123')
      expect(result).toEqual(mockUpdated)
    })
  })

  describe('updateEquipmentStatus', () => {
    it('should update equipment status', async () => {
      const mockUpdated = { id: 'eq-123', status: 'maintenance' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await equipmentApi.updateEquipmentStatus('eq-123', 'maintenance')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('maintenance')
      expect(result).toEqual(mockUpdated)
    })
  })

  describe('deleteEquipment', () => {
    it('should soft delete equipment', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await equipmentApi.deleteEquipment('eq-123')

      expect(mockFrom).toHaveBeenCalledWith('equipment')
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.deleted_at).toBeDefined()
    })

    it('should handle deletion errors', async () => {
      const mockError = new Error('Deletion failed')
      mockEq.mockResolvedValue({ data: null, error: mockError })

      await expect(equipmentApi.deleteEquipment('eq-123')).rejects.toThrow('Deletion failed')
    })
  })

  describe('getEquipmentStatistics', () => {
    it('should calculate comprehensive statistics', async () => {
      const mockEquipment = [
        {
          equipment_type: 'excavator',
          status: 'available',
          ownership_type: 'owned',
          hours_this_month: 100,
          days_since_maintenance: 30,
        },
        {
          equipment_type: 'bulldozer',
          status: 'in_use',
          ownership_type: 'rented',
          hours_this_month: 150,
          days_since_maintenance: 95,
        },
        {
          equipment_type: 'excavator',
          status: 'maintenance',
          ownership_type: 'owned',
          hours_this_month: 0,
          next_maintenance_date: '2025-01-10',
        },
      ]

      mockEq.mockResolvedValue({ data: mockEquipment, error: null })

      const result = await equipmentApi.getEquipmentStatistics('company-123')

      expect(result.total).toBe(3)
      expect(result.by_status.available).toBe(1)
      expect(result.by_status.in_use).toBe(1)
      expect(result.by_status.maintenance).toBe(1)
      expect(result.by_type.excavator).toBe(2)
      expect(result.by_type.bulldozer).toBe(1)
      expect(result.by_ownership.owned).toBe(2)
      expect(result.by_ownership.rented).toBe(1)
      expect(result.total_hours_this_month).toBe(250)
      expect(result.equipment_needing_maintenance).toBeGreaterThan(0)
      expect(result.rented_equipment_count).toBe(1)
    })

    it('should calculate utilization rate', async () => {
      const mockEquipment = [
        { status: 'available', equipment_type: 'excavator', ownership_type: 'owned', hours_this_month: 0 },
        { status: 'available', equipment_type: 'bulldozer', ownership_type: 'owned', hours_this_month: 0 },
        { status: 'in_use', equipment_type: 'excavator', ownership_type: 'owned', hours_this_month: 100 },
        { status: 'in_use', equipment_type: 'bulldozer', ownership_type: 'owned', hours_this_month: 100 },
        { status: 'in_use', equipment_type: 'excavator', ownership_type: 'owned', hours_this_month: 100 },
      ]

      mockEq.mockResolvedValue({ data: mockEquipment, error: null })

      const result = await equipmentApi.getEquipmentStatistics('company-123')

      // 3 in_use out of 5 total = 60% utilization
      expect(result.utilization_rate).toBe(60)
    })

    it('should return default stats when no equipment', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      const result = await equipmentApi.getEquipmentStatistics('company-123')

      expect(result.total).toBe(0)
      expect(result.utilization_rate).toBe(0)
    })
  })

  describe('getAvailableEquipment', () => {
    it('should get only available equipment', async () => {
      const mockAvailable = [
        { id: '1', status: 'available', equipment_number: 'EQ-001' },
        { id: '2', status: 'available', equipment_number: 'EQ-002' },
      ]

      mockOrder.mockResolvedValue({ data: mockAvailable, error: null })

      const result = await equipmentApi.getAvailableEquipment('company-123')

      expect(mockEq).toHaveBeenCalledWith('company_id', 'company-123')
      expect(mockEq).toHaveBeenCalledWith('status', 'available')
      expect(result).toEqual(mockAvailable)
    })
  })
})

describe('equipmentAssignmentsApi', () => {
  // Sequential results queue for tests needing multiple sequential calls
  let resultsQueue: Array<{ data: any; error: any }> = []

  const setResults = (results: Array<{ data: any; error: any }>) => {
    resultsQueue = [...results]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resultsQueue = [{ data: [], error: null }]

    // Create a thenable chainable mock that pops results from queue
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        order: mockOrder,
        select: mockSelect,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate,
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        const result = resultsQueue.length > 1 ? resultsQueue.shift()! : resultsQueue[0]
        return Promise.resolve(result).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        const result = resultsQueue.length > 1 ? resultsQueue.shift()! : resultsQueue[0]
        return Promise.resolve(result).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
  })

  describe('getAssignments', () => {
    it('should get assignments for equipment', async () => {
      const mockAssignments = [
        { id: '1', equipment_id: 'eq-123', project_id: 'proj-1', status: 'active' },
        { id: '2', equipment_id: 'eq-123', project_id: 'proj-2', status: 'completed' },
      ]

      setResults([{ data: mockAssignments, error: null }])

      const result = await equipmentAssignmentsApi.getAssignments('eq-123')

      expect(mockEq).toHaveBeenCalledWith('equipment_id', 'eq-123')
      expect(mockOrder).toHaveBeenCalledWith('assigned_date', { ascending: false })
      expect(result).toEqual(mockAssignments)
    })
  })

  describe('getProjectEquipment', () => {
    it('should get active equipment for project', async () => {
      setResults([{ data: [], error: null }])

      await equipmentAssignmentsApi.getProjectEquipment('project-123')

      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
      expect(mockEq).toHaveBeenCalledWith('status', 'active')
    })
  })

  describe('assignEquipment', () => {
    it('should assign equipment to project', async () => {
      const mockAssignment = {
        id: 'assign-1',
        equipment_id: 'eq-123',
        project_id: 'project-123',
        status: 'active',
      }

      // First: insert assignment, Second: update equipment status
      setResults([
        { data: mockAssignment, error: null },
        { data: null, error: null },
      ])

      const dto = {
        equipment_id: 'eq-123',
        project_id: 'project-123',
        assigned_date: '2025-01-20',
      }

      const result = await equipmentAssignmentsApi.assignEquipment(dto)

      expect(mockFrom).toHaveBeenCalledWith('equipment_assignments')
      expect(mockFrom).toHaveBeenCalledWith('equipment')

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.status).toBe('active')
      expect(insertCall.assigned_by).toBe('test-user-id')

      // Should update equipment status
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('in_use')
      expect(updateCall.current_project_id).toBe('project-123')

      expect(result).toEqual(mockAssignment)
    })

    it('should assign with optional fields', async () => {
      // First: insert assignment, Second: update equipment status
      setResults([
        { data: {}, error: null },
        { data: null, error: null },
      ])

      const dto = {
        equipment_id: 'eq-123',
        project_id: 'project-123',
        assigned_date: '2025-01-20',
        expected_return_date: '2025-02-20',
        assignment_reason: 'Foundation work',
        daily_rate: 500,
        hourly_rate: 75,
        notes: 'Special handling required',
      }

      await equipmentAssignmentsApi.assignEquipment(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.expected_return_date).toBe('2025-02-20')
      expect(insertCall.assignment_reason).toBe('Foundation work')
      expect(insertCall.daily_rate).toBe(500)
    })
  })

  describe('updateAssignment', () => {
    it('should update assignment', async () => {
      setResults([{ data: {}, error: null }])

      await equipmentAssignmentsApi.updateAssignment('assign-1', {
        expected_return_date: '2025-03-01',
        notes: 'Extended assignment',
      })

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'assign-1')
    })
  })

  describe('returnEquipment', () => {
    it('should complete assignment and update equipment status', async () => {
      const mockAssignment = { equipment_id: 'eq-123' }

      // First: get assignment, Second: update assignment, Third: update equipment
      setResults([
        { data: mockAssignment, error: null },
        { data: { status: 'completed' }, error: null },
        { data: null, error: null },
      ])

      await equipmentAssignmentsApi.returnEquipment('assign-1', '2025-01-25')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('completed')
      expect(updateCall.actual_return_date).toBe('2025-01-25')

      // Should update equipment status to available
      const equipmentUpdate = mockUpdate.mock.calls[1][0]
      expect(equipmentUpdate.status).toBe('available')
      expect(equipmentUpdate.current_project_id).toBeNull()
    })

    it('should use current date if not provided', async () => {
      // First: get assignment, Second: update assignment, Third: update equipment
      setResults([
        { data: { equipment_id: 'eq-123' }, error: null },
        { data: {}, error: null },
        { data: null, error: null },
      ])

      await equipmentAssignmentsApi.returnEquipment('assign-1')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.actual_return_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

describe('equipmentLogsApi', () => {
  // Shared mutable state for query results
  let queryResolvedValue: { data: any; error: any } = { data: [], error: null }

  beforeEach(() => {
    vi.clearAllMocks()
    queryResolvedValue = { data: [], error: null }

    // Create a thenable chainable mock
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
        select: mockSelect,
        single: mockSingle,
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      rpc: mockRpc,
    })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockGte.mockImplementation(() => createChainable())
    mockLte.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
  })

  describe('getLogs', () => {
    it('should get logs with filters', async () => {
      const mockLogs = [
        { id: '1', equipment_id: 'eq-123', hours_used: 8, log_date: '2025-01-20' },
      ]

      queryResolvedValue = { data: mockLogs, error: null }

      const result = await equipmentLogsApi.getLogs({ equipmentId: 'eq-123' })

      expect(mockEq).toHaveBeenCalledWith('equipment_id', 'eq-123')
      expect(mockOrder).toHaveBeenCalledWith('log_date', { ascending: false })
      expect(result).toEqual(mockLogs)
    })

    it('should filter by date range', async () => {
      queryResolvedValue = { data: [], error: null }

      await equipmentLogsApi.getLogs({
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      })

      expect(mockGte).toHaveBeenCalledWith('log_date', '2025-01-01')
      expect(mockLte).toHaveBeenCalledWith('log_date', '2025-01-31')
    })
  })

  describe('createLog', () => {
    it('should create log entry', async () => {
      const mockLog = { id: 'log-1', equipment_id: 'eq-123', hours_used: 8 }
      queryResolvedValue = { data: mockLog, error: null }

      const dto = {
        equipment_id: 'eq-123',
        log_date: '2025-01-20',
        hours_used: 8,
        work_description: 'Excavation work',
      }

      const result = await equipmentLogsApi.createLog(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.equipment_id).toBe('eq-123')
      expect(insertCall.hours_used).toBe(8)
      expect(insertCall.created_by).toBe('test-user-id')
      expect(result).toEqual(mockLog)
    })
  })

  describe('getTotalHours', () => {
    it('should calculate total hours for date range', async () => {
      const mockLogs = [
        { hours_used: 8 },
        { hours_used: 10 },
        { hours_used: null },
        { hours_used: 6 },
      ]

      queryResolvedValue = { data: mockLogs, error: null }

      const result = await equipmentLogsApi.getTotalHours('eq-123', '2025-01-01', '2025-01-31')

      expect(result).toBe(24)
    })

    it('should return 0 when no logs', async () => {
      queryResolvedValue = { data: null, error: null }

      const result = await equipmentLogsApi.getTotalHours('eq-123', '2025-01-01', '2025-01-31')

      expect(result).toBe(0)
    })
  })

  describe('postCostToTransaction', () => {
    it('should post equipment cost via RPC', async () => {
      mockRpc.mockResolvedValue({ data: 'transaction-123', error: null })

      const result = await equipmentLogsApi.postCostToTransaction('log-123')

      expect(mockRpc).toHaveBeenCalledWith('post_equipment_cost_to_transaction', {
        p_equipment_log_id: 'log-123',
      })
      expect(result).toBe('transaction-123')
    })
  })

  describe('batchPostCosts', () => {
    it('should batch post costs and return results', async () => {
      const mockError = new Error('Failed')
      mockRpc
        .mockResolvedValueOnce({ data: 'tx-1', error: null })
        .mockResolvedValueOnce({ data: 'tx-2', error: null })
        .mockResolvedValueOnce({ data: null, error: mockError })

      const result = await equipmentLogsApi.batchPostCosts(['log-1', 'log-2', 'log-3'])

      expect(result.success).toEqual(['log-1', 'log-2'])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].id).toBe('log-3')
      expect(result.failed[0].error).toBe('Failed')
    })
  })
})

describe('equipmentMaintenanceApi', () => {
  // Shared mutable state for query results
  let queryResolvedValue: { data: any; error: any } = { data: [], error: null }

  beforeEach(() => {
    vi.clearAllMocks()
    queryResolvedValue = { data: [], error: null }

    // Create a thenable chainable mock
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        in: mockIn,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
        select: mockSelect,
        single: mockSingle,
        nullsFirst: vi.fn().mockImplementation(() => createChainable()),
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockIn.mockImplementation(() => createChainable())
    mockGte.mockImplementation(() => createChainable())
    mockLte.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
  })

  describe('getMaintenance', () => {
    it('should get maintenance records with filters', async () => {
      queryResolvedValue = { data: [], error: null }

      await equipmentMaintenanceApi.getMaintenance({
        equipmentId: 'eq-123',
        maintenanceType: ['preventive', 'repair'],
        status: 'scheduled',
      })

      expect(mockEq).toHaveBeenCalledWith('equipment_id', 'eq-123')
      expect(mockIn).toHaveBeenCalledWith('maintenance_type', ['preventive', 'repair'])
      expect(mockEq).toHaveBeenCalledWith('status', 'scheduled')
    })
  })

  describe('scheduleMaintenance', () => {
    it('should schedule maintenance', async () => {
      const mockMaintenance = { id: 'maint-1', status: 'scheduled' }
      queryResolvedValue = { data: mockMaintenance, error: null }

      const dto = {
        equipment_id: 'eq-123',
        maintenance_type: 'preventive',
        scheduled_date: '2025-02-15',
        description: 'Regular maintenance',
      }

      const result = await equipmentMaintenanceApi.scheduleMaintenance(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.status).toBe('scheduled')
      expect(insertCall.created_by).toBe('test-user-id')
      expect(result).toEqual(mockMaintenance)
    })
  })

  describe('completeMaintenance', () => {
    it('should complete maintenance with details', async () => {
      queryResolvedValue = { data: {}, error: null }

      await equipmentMaintenanceApi.completeMaintenance('maint-1', {
        completed_date: '2025-02-20',
        work_performed: 'Oil change, filter replacement',
        labor_cost: 200,
        parts_cost: 150,
        total_cost: 350,
        downtime_hours: 4,
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('completed')
      expect(updateCall.work_performed).toBe('Oil change, filter replacement')
      expect(updateCall.total_cost).toBe(350)
    })

    it('should use current date if not provided', async () => {
      queryResolvedValue = { data: {}, error: null }

      await equipmentMaintenanceApi.completeMaintenance('maint-1', {})

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('cancelMaintenance', () => {
    it('should cancel maintenance', async () => {
      queryResolvedValue = { data: {}, error: null }

      await equipmentMaintenanceApi.cancelMaintenance('maint-1')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('cancelled')
    })
  })

  describe('getUpcomingMaintenance', () => {
    it('should get maintenance scheduled in next 30 days', async () => {
      queryResolvedValue = { data: [], error: null }

      await equipmentMaintenanceApi.getUpcomingMaintenance('company-123')

      expect(mockEq).toHaveBeenCalledWith('equipment.company_id', 'company-123')
      expect(mockEq).toHaveBeenCalledWith('status', 'scheduled')
      expect(mockLte).toHaveBeenCalled()
      expect(mockOrder).toHaveBeenCalledWith('scheduled_date', { ascending: true })
    })
  })
})

describe('equipmentInspectionsApi', () => {
  // Shared mutable state for query results
  let queryResolvedValue: { data: any; error: any } = { data: [], error: null }

  beforeEach(() => {
    vi.clearAllMocks()
    queryResolvedValue = { data: [], error: null }

    // Create a thenable chainable mock
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        select: mockSelect,
        single: mockSingle,
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockLimit.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())
    mockInsert.mockReturnValue({ select: mockSelect })
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
  })

  describe('getInspections', () => {
    it('should get inspections for equipment', async () => {
      const mockInspections = [
        { id: '1', equipment_id: 'eq-123', overall_status: 'pass', inspection_date: '2025-01-20' },
      ]

      queryResolvedValue = { data: mockInspections, error: null }

      const result = await equipmentInspectionsApi.getInspections('eq-123')

      expect(mockEq).toHaveBeenCalledWith('equipment_id', 'eq-123')
      expect(mockOrder).toHaveBeenCalledWith('inspection_date', { ascending: false })
      expect(result).toEqual(mockInspections)
    })
  })

  describe('createInspection', () => {
    it('should create inspection', async () => {
      const mockInspection = { id: 'insp-1', overall_status: 'pass' }
      queryResolvedValue = { data: mockInspection, error: null }

      const dto = {
        equipment_id: 'eq-123',
        inspection_type: 'daily',
        inspection_date: '2025-01-20',
        overall_status: 'pass',
        checklist_items: [
          { item: 'Fluid levels', status: 'ok' },
          { item: 'Tire pressure', status: 'ok' },
        ],
      }

      const result = await equipmentInspectionsApi.createInspection(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.inspector_id).toBe('test-user-id')
      expect(insertCall.overall_status).toBe('pass')
      expect(result).toEqual(mockInspection)
    })
  })

  describe('getLatestInspection', () => {
    it('should get most recent inspection', async () => {
      const mockInspection = { id: 'insp-latest', inspection_date: '2025-01-20' }
      queryResolvedValue = { data: mockInspection, error: null }

      const result = await equipmentInspectionsApi.getLatestInspection('eq-123')

      expect(mockOrder).toHaveBeenCalledWith('inspection_date', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockInspection)
    })

    it('should return null when no inspections exist', async () => {
      queryResolvedValue = { data: null, error: { code: 'PGRST116' } }

      const result = await equipmentInspectionsApi.getLatestInspection('eq-123')

      expect(result).toBeNull()
    })
  })
})
