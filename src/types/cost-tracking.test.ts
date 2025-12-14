/**
 * Tests for Cost Tracking Types
 * Validates CSI MasterFormat divisions, cost types, and transaction types
 */

import { describe, it, expect } from 'vitest'
import {
  COST_TYPES,
  TRANSACTION_TYPES,
  SOURCE_TYPES,
  CSI_DIVISIONS,
  type CostType,
  type TransactionType,
  type SourceType,
  type CSIDivision,
  type CostCode,
  type ProjectBudget,
  type CostTransaction,
  type CostCodeWithChildren,
  type ProjectBudgetWithDetails,
  type CostTransactionWithDetails,
  type CreateCostCodeDTO,
  type UpdateCostCodeDTO,
  type CreateProjectBudgetDTO,
  type UpdateProjectBudgetDTO,
  type CreateCostTransactionDTO,
  type UpdateCostTransactionDTO,
  type CostCodeFilters,
  type ProjectBudgetFilters,
  type CostTransactionFilters,
  type ProjectBudgetTotals,
  type BudgetSummaryByDivision,
  type CostTrendDataPoint,
  type ProjectBudgetFormData,
  type CostTransactionFormData,
} from './cost-tracking'

// =============================================
// COST_TYPES Tests
// =============================================

describe('COST_TYPES', () => {
  it('should have 3 cost types', () => {
    expect(COST_TYPES).toHaveLength(3)
  })

  it('should have direct cost type', () => {
    const direct = COST_TYPES.find((t) => t.value === 'direct')
    expect(direct).toBeDefined()
    expect(direct?.label).toBe('Direct Cost')
  })

  it('should have indirect cost type', () => {
    const indirect = COST_TYPES.find((t) => t.value === 'indirect')
    expect(indirect).toBeDefined()
    expect(indirect?.label).toBe('Indirect Cost')
  })

  it('should have overhead cost type', () => {
    const overhead = COST_TYPES.find((t) => t.value === 'overhead')
    expect(overhead).toBeDefined()
    expect(overhead?.label).toBe('Overhead')
  })

  it('should have all values with labels', () => {
    COST_TYPES.forEach((type) => {
      expect(type.value).toBeTruthy()
      expect(type.label).toBeTruthy()
    })
  })
})

// =============================================
// TRANSACTION_TYPES Tests
// =============================================

describe('TRANSACTION_TYPES', () => {
  it('should have 4 transaction types', () => {
    expect(TRANSACTION_TYPES).toHaveLength(4)
  })

  it('should have commitment type with blue color', () => {
    const commitment = TRANSACTION_TYPES.find((t) => t.value === 'commitment')
    expect(commitment).toBeDefined()
    expect(commitment?.label).toBe('Commitment')
    expect(commitment?.color).toBe('blue')
  })

  it('should have actual type with green color', () => {
    const actual = TRANSACTION_TYPES.find((t) => t.value === 'actual')
    expect(actual).toBeDefined()
    expect(actual?.label).toBe('Actual')
    expect(actual?.color).toBe('green')
  })

  it('should have adjustment type with orange color', () => {
    const adjustment = TRANSACTION_TYPES.find((t) => t.value === 'adjustment')
    expect(adjustment).toBeDefined()
    expect(adjustment?.label).toBe('Adjustment')
    expect(adjustment?.color).toBe('orange')
  })

  it('should have forecast type with purple color', () => {
    const forecast = TRANSACTION_TYPES.find((t) => t.value === 'forecast')
    expect(forecast).toBeDefined()
    expect(forecast?.label).toBe('Forecast')
    expect(forecast?.color).toBe('purple')
  })

  it('should have all values with labels and colors', () => {
    TRANSACTION_TYPES.forEach((type) => {
      expect(type.value).toBeTruthy()
      expect(type.label).toBeTruthy()
      expect(type.color).toBeTruthy()
    })
  })
})

// =============================================
// SOURCE_TYPES Tests
// =============================================

describe('SOURCE_TYPES', () => {
  it('should have 8 source types', () => {
    expect(SOURCE_TYPES).toHaveLength(8)
  })

  const expectedSources = [
    { value: 'change_order', label: 'Change Order' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'timesheet', label: 'Timesheet' },
    { value: 'material', label: 'Material' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'subcontract', label: 'Subcontract' },
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'manual', label: 'Manual Entry' },
  ]

  expectedSources.forEach(({ value, label }) => {
    it(`should have ${value} source type with label "${label}"`, () => {
      const source = SOURCE_TYPES.find((s) => s.value === value)
      expect(source).toBeDefined()
      expect(source?.label).toBe(label)
    })
  })
})

// =============================================
// CSI_DIVISIONS Tests (CSI MasterFormat)
// =============================================

describe('CSI_DIVISIONS', () => {
  it('should have 35 CSI divisions', () => {
    expect(CSI_DIVISIONS).toHaveLength(35)
  })

  describe('General group', () => {
    it('should have Division 00 - Procurement and Contracting Requirements', () => {
      const division = CSI_DIVISIONS.find((d) => d.division === '00')
      expect(division).toBeDefined()
      expect(division?.name).toBe('Procurement and Contracting Requirements')
      expect(division?.group).toBe('General')
    })

    it('should have Division 01 - General Requirements', () => {
      const division = CSI_DIVISIONS.find((d) => d.division === '01')
      expect(division).toBeDefined()
      expect(division?.name).toBe('General Requirements')
      expect(division?.group).toBe('General')
    })
  })

  describe('Facility Construction group', () => {
    const facilityDivisions = [
      { division: '02', name: 'Existing Conditions' },
      { division: '03', name: 'Concrete' },
      { division: '04', name: 'Masonry' },
      { division: '05', name: 'Metals' },
      { division: '06', name: 'Wood, Plastics, and Composites' },
      { division: '07', name: 'Thermal and Moisture Protection' },
      { division: '08', name: 'Openings' },
      { division: '09', name: 'Finishes' },
      { division: '10', name: 'Specialties' },
      { division: '11', name: 'Equipment' },
      { division: '12', name: 'Furnishings' },
      { division: '13', name: 'Special Construction' },
      { division: '14', name: 'Conveying Equipment' },
    ]

    facilityDivisions.forEach(({ division, name }) => {
      it(`should have Division ${division} - ${name}`, () => {
        const div = CSI_DIVISIONS.find((d) => d.division === division)
        expect(div).toBeDefined()
        expect(div?.name).toBe(name)
        expect(div?.group).toBe('Facility Construction')
      })
    })
  })

  describe('Facility Services group', () => {
    const serviceDivisions = [
      { division: '21', name: 'Fire Suppression' },
      { division: '22', name: 'Plumbing' },
      { division: '23', name: 'HVAC' },
      { division: '25', name: 'Integrated Automation' },
      { division: '26', name: 'Electrical' },
      { division: '27', name: 'Communications' },
      { division: '28', name: 'Electronic Safety and Security' },
    ]

    serviceDivisions.forEach(({ division, name }) => {
      it(`should have Division ${division} - ${name}`, () => {
        const div = CSI_DIVISIONS.find((d) => d.division === division)
        expect(div).toBeDefined()
        expect(div?.name).toBe(name)
        expect(div?.group).toBe('Facility Services')
      })
    })
  })

  describe('Site and Infrastructure group', () => {
    const siteDivisions = [
      { division: '31', name: 'Earthwork' },
      { division: '32', name: 'Exterior Improvements' },
      { division: '33', name: 'Utilities' },
      { division: '34', name: 'Transportation' },
      { division: '35', name: 'Waterway and Marine Construction' },
    ]

    siteDivisions.forEach(({ division, name }) => {
      it(`should have Division ${division} - ${name}`, () => {
        const div = CSI_DIVISIONS.find((d) => d.division === division)
        expect(div).toBeDefined()
        expect(div?.name).toBe(name)
        expect(div?.group).toBe('Site and Infrastructure')
      })
    })
  })

  describe('Process Equipment group', () => {
    const processDivisions = [
      { division: '40', name: 'Process Interconnections' },
      { division: '41', name: 'Material Processing and Handling Equipment' },
      { division: '42', name: 'Process Heating, Cooling, and Drying Equipment' },
      { division: '43', name: 'Process Gas and Liquid Handling' },
      { division: '44', name: 'Pollution and Waste Control Equipment' },
      { division: '45', name: 'Industry-Specific Manufacturing Equipment' },
      { division: '46', name: 'Water and Wastewater Equipment' },
      { division: '48', name: 'Electrical Power Generation' },
    ]

    processDivisions.forEach(({ division, name }) => {
      it(`should have Division ${division} - ${name}`, () => {
        const div = CSI_DIVISIONS.find((d) => d.division === division)
        expect(div).toBeDefined()
        expect(div?.name).toBe(name)
        expect(div?.group).toBe('Process Equipment')
      })
    })
  })

  it('should have unique division codes', () => {
    const divisions = CSI_DIVISIONS.map((d) => d.division)
    const uniqueDivisions = [...new Set(divisions)]
    expect(divisions.length).toBe(uniqueDivisions.length)
  })

  it('should have all divisions with required fields', () => {
    CSI_DIVISIONS.forEach((div) => {
      expect(div.division).toBeTruthy()
      expect(div.name).toBeTruthy()
      expect(div.group).toBeTruthy()
    })
  })
})

// =============================================
// Type Guard Tests
// =============================================

describe('Type definitions', () => {
  describe('CostType', () => {
    it('should accept valid cost types', () => {
      const validTypes: CostType[] = ['direct', 'indirect', 'overhead']
      validTypes.forEach((type) => {
        expect(COST_TYPES.some((t) => t.value === type)).toBe(true)
      })
    })
  })

  describe('TransactionType', () => {
    it('should accept valid transaction types', () => {
      const validTypes: TransactionType[] = ['commitment', 'actual', 'adjustment', 'forecast']
      validTypes.forEach((type) => {
        expect(TRANSACTION_TYPES.some((t) => t.value === type)).toBe(true)
      })
    })
  })

  describe('SourceType', () => {
    it('should accept valid source types', () => {
      const validTypes: SourceType[] = [
        'change_order',
        'invoice',
        'timesheet',
        'material',
        'equipment',
        'subcontract',
        'purchase_order',
        'manual',
      ]
      validTypes.forEach((type) => {
        expect(SOURCE_TYPES.some((t) => t.value === type)).toBe(true)
      })
    })
  })
})

// =============================================
// Interface Validation Tests
// =============================================

describe('Interface validation', () => {
  describe('CostCode interface', () => {
    it('should validate a complete cost code object', () => {
      const costCode: CostCode = {
        id: 'cc-1',
        company_id: 'company-123',
        code: '03 30 00',
        name: 'Cast-in-Place Concrete',
        description: 'Cast-in-place concrete work',
        parent_code_id: 'cc-parent',
        level: 3,
        division: '03',
        section: '30',
        cost_type: 'direct',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      expect(costCode.id).toBe('cc-1')
      expect(costCode.code).toBe('03 30 00')
      expect(costCode.cost_type).toBe('direct')
      expect(costCode.level).toBe(3)
    })
  })

  describe('ProjectBudget interface', () => {
    it('should validate a complete project budget object', () => {
      const budget: ProjectBudget = {
        id: 'pb-1',
        project_id: 'project-123',
        cost_code_id: 'cc-1',
        original_budget: 100000,
        approved_changes: 5000,
        committed_cost: 90000,
        actual_cost: 80000,
        estimated_cost_at_completion: 105000,
        notes: 'Budget for concrete work',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123',
      }

      expect(budget.original_budget).toBe(100000)
      expect(budget.approved_changes).toBe(5000)
      expect(budget.committed_cost).toBe(90000)
      expect(budget.actual_cost).toBe(80000)
    })
  })

  describe('CostTransaction interface', () => {
    it('should validate a complete cost transaction object', () => {
      const transaction: CostTransaction = {
        id: 'tx-1',
        project_id: 'project-123',
        cost_code_id: 'cc-1',
        transaction_date: '2024-01-15',
        description: 'Concrete pour for foundation',
        transaction_type: 'actual',
        source_type: 'invoice',
        source_id: 'inv-123',
        amount: 50000,
        vendor_name: 'XYZ Concrete',
        subcontractor_id: 'sub-123',
        invoice_number: 'INV-2024-001',
        po_number: 'PO-2024-050',
        notes: 'Foundation pour completed',
        created_at: '2024-01-15T10:00:00Z',
        created_by: 'user-123',
        deleted_at: null,
      }

      expect(transaction.transaction_type).toBe('actual')
      expect(transaction.source_type).toBe('invoice')
      expect(transaction.amount).toBe(50000)
    })
  })

  describe('ProjectBudgetWithDetails interface', () => {
    it('should include computed fields', () => {
      const budget: ProjectBudgetWithDetails = {
        id: 'pb-1',
        project_id: 'project-123',
        cost_code_id: 'cc-1',
        original_budget: 100000,
        approved_changes: 5000,
        committed_cost: 90000,
        actual_cost: 80000,
        estimated_cost_at_completion: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        // Extended fields
        cost_code: '03000',
        cost_code_name: 'Concrete',
        division: '03',
        revised_budget: 105000,
        variance: 25000,
        percent_spent: 76.19,
      }

      expect(budget.revised_budget).toBe(105000)
      expect(budget.variance).toBe(25000)
      expect(budget.percent_spent).toBeCloseTo(76.19, 2)
    })
  })

  describe('CostCodeWithChildren interface', () => {
    it('should support hierarchical structure', () => {
      const costCodeTree: CostCodeWithChildren = {
        id: 'cc-1',
        company_id: 'company-123',
        code: '03000',
        name: 'Concrete',
        description: null,
        parent_code_id: null,
        level: 1,
        division: '03',
        section: null,
        cost_type: 'direct',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
        children: [
          {
            id: 'cc-2',
            company_id: 'company-123',
            code: '03100',
            name: 'Concrete Forms and Accessories',
            description: null,
            parent_code_id: 'cc-1',
            level: 2,
            division: '03',
            section: '10',
            cost_type: 'direct',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
          },
        ],
      }

      expect(costCodeTree.children).toHaveLength(1)
      expect(costCodeTree.children?.[0].parent_code_id).toBe('cc-1')
      expect(costCodeTree.children?.[0].level).toBe(2)
    })
  })
})

// =============================================
// DTO Validation Tests
// =============================================

describe('DTO validation', () => {
  describe('CreateCostCodeDTO', () => {
    it('should validate required fields', () => {
      const dto: CreateCostCodeDTO = {
        company_id: 'company-123',
        code: '03 30 00',
        name: 'Cast-in-Place Concrete',
      }

      expect(dto.company_id).toBe('company-123')
      expect(dto.code).toBe('03 30 00')
      expect(dto.name).toBe('Cast-in-Place Concrete')
    })

    it('should accept optional fields', () => {
      const dto: CreateCostCodeDTO = {
        company_id: 'company-123',
        code: '03 30 00',
        name: 'Cast-in-Place Concrete',
        description: 'Description',
        parent_code_id: 'cc-parent',
        level: 3,
        division: '03',
        section: '30',
        cost_type: 'direct',
        is_active: true,
      }

      expect(dto.cost_type).toBe('direct')
      expect(dto.is_active).toBe(true)
    })
  })

  describe('CreateProjectBudgetDTO', () => {
    it('should validate required fields', () => {
      const dto: CreateProjectBudgetDTO = {
        project_id: 'project-123',
        cost_code_id: 'cc-1',
        original_budget: 100000,
      }

      expect(dto.project_id).toBe('project-123')
      expect(dto.cost_code_id).toBe('cc-1')
      expect(dto.original_budget).toBe(100000)
    })
  })

  describe('CreateCostTransactionDTO', () => {
    it('should validate required fields', () => {
      const dto: CreateCostTransactionDTO = {
        project_id: 'project-123',
        cost_code_id: 'cc-1',
        transaction_date: '2024-01-15',
        description: 'Material purchase',
        transaction_type: 'actual',
        amount: 50000,
      }

      expect(dto.project_id).toBe('project-123')
      expect(dto.transaction_type).toBe('actual')
      expect(dto.amount).toBe(50000)
    })
  })
})

// =============================================
// Filter Interface Tests
// =============================================

describe('Filter interfaces', () => {
  describe('CostCodeFilters', () => {
    it('should validate filter options', () => {
      const filters: CostCodeFilters = {
        companyId: 'company-123',
        division: '03',
        level: 2,
        costType: 'direct',
        isActive: true,
        parentCodeId: 'cc-parent',
        search: 'concrete',
      }

      expect(filters.companyId).toBe('company-123')
      expect(filters.division).toBe('03')
      expect(filters.costType).toBe('direct')
    })
  })

  describe('ProjectBudgetFilters', () => {
    it('should validate filter options', () => {
      const filters: ProjectBudgetFilters = {
        projectId: 'project-123',
        costCodeId: 'cc-1',
        division: '03',
        hasVariance: true,
      }

      expect(filters.projectId).toBe('project-123')
      expect(filters.hasVariance).toBe(true)
    })
  })

  describe('CostTransactionFilters', () => {
    it('should validate filter options', () => {
      const filters: CostTransactionFilters = {
        projectId: 'project-123',
        costCodeId: 'cc-1',
        transactionType: 'actual',
        sourceType: 'invoice',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        vendorName: 'XYZ Supplies',
        subcontractorId: 'sub-123',
      }

      expect(filters.transactionType).toBe('actual')
      expect(filters.sourceType).toBe('invoice')
    })
  })
})

// =============================================
// Statistics Types Tests
// =============================================

describe('Statistics types', () => {
  describe('ProjectBudgetTotals', () => {
    it('should validate budget totals structure', () => {
      const totals: ProjectBudgetTotals = {
        total_original_budget: 1000000,
        total_approved_changes: 50000,
        total_revised_budget: 1050000,
        total_committed_cost: 800000,
        total_actual_cost: 600000,
        total_variance: 450000,
        budget_count: 25,
      }

      expect(totals.total_revised_budget).toBe(
        totals.total_original_budget + totals.total_approved_changes
      )
      expect(totals.budget_count).toBe(25)
    })
  })

  describe('BudgetSummaryByDivision', () => {
    it('should validate division summary structure', () => {
      const summary: BudgetSummaryByDivision = {
        division: '03',
        division_name: 'Concrete',
        original_budget: 500000,
        revised_budget: 525000,
        actual_cost: 400000,
        variance: 125000,
        percent_spent: 76.19,
      }

      expect(summary.division).toBe('03')
      expect(summary.variance).toBe(summary.revised_budget - summary.actual_cost)
    })
  })

  describe('CostTrendDataPoint', () => {
    it('should validate trend data structure', () => {
      const dataPoint: CostTrendDataPoint = {
        date: '2024-01-31',
        committed: 500000,
        actual: 400000,
        budget: 600000,
      }

      expect(dataPoint.date).toBe('2024-01-31')
      expect(dataPoint.actual).toBeLessThan(dataPoint.budget)
    })
  })
})

// =============================================
// Form Data Types Tests
// =============================================

describe('Form data types', () => {
  describe('ProjectBudgetFormData', () => {
    it('should use string types for form inputs', () => {
      const formData: ProjectBudgetFormData = {
        cost_code_id: 'cc-1',
        original_budget: '100000',
        approved_changes: '5000',
        committed_cost: '90000',
        actual_cost: '80000',
        estimated_cost_at_completion: '105000',
        notes: 'Budget notes',
      }

      // Form data uses strings for input fields
      expect(typeof formData.original_budget).toBe('string')
      expect(typeof formData.approved_changes).toBe('string')
    })
  })

  describe('CostTransactionFormData', () => {
    it('should use string types for form inputs', () => {
      const formData: CostTransactionFormData = {
        cost_code_id: 'cc-1',
        transaction_date: '2024-01-15',
        description: 'Material purchase',
        transaction_type: 'actual',
        source_type: 'invoice',
        amount: '50000',
        vendor_name: 'XYZ Supplies',
        subcontractor_id: '',
        invoice_number: 'INV-001',
        po_number: 'PO-001',
        notes: '',
      }

      expect(typeof formData.amount).toBe('string')
      expect(formData.source_type).toBe('invoice')
    })

    it('should allow empty source_type', () => {
      const formData: CostTransactionFormData = {
        cost_code_id: 'cc-1',
        transaction_date: '2024-01-15',
        description: 'Manual entry',
        transaction_type: 'actual',
        source_type: '',
        amount: '1000',
        vendor_name: '',
        subcontractor_id: '',
        invoice_number: '',
        po_number: '',
        notes: '',
      }

      expect(formData.source_type).toBe('')
    })
  })
})

// =============================================
// CSI Division Group Analysis
// =============================================

describe('CSI Division grouping', () => {
  it('should have correct number of divisions per group', () => {
    const groups = CSI_DIVISIONS.reduce(
      (acc, div) => {
        acc[div.group] = (acc[div.group] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    expect(groups['General']).toBe(2)
    expect(groups['Facility Construction']).toBe(13)
    expect(groups['Facility Services']).toBe(7)
    expect(groups['Site and Infrastructure']).toBe(5)
    expect(groups['Process Equipment']).toBe(8)
  })

  it('should cover all five CSI MasterFormat groups', () => {
    const uniqueGroups = [...new Set(CSI_DIVISIONS.map((d) => d.group))]
    expect(uniqueGroups).toHaveLength(5)
    expect(uniqueGroups).toContain('General')
    expect(uniqueGroups).toContain('Facility Construction')
    expect(uniqueGroups).toContain('Facility Services')
    expect(uniqueGroups).toContain('Site and Infrastructure')
    expect(uniqueGroups).toContain('Process Equipment')
  })
})
