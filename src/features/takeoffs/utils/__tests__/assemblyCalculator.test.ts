// File: /src/features/takeoffs/utils/__tests__/assemblyCalculator.test.ts
// Tests for assembly calculator

import { describe, it, expect } from 'vitest'
import {
  parseFormula,
  evaluateFormula,
  calculateAssembly,
  validateAssembly,
  createSimpleAssembly,
  type AssemblyItem,
  type AssemblyVariable,
} from '../assemblyCalculator'
import type { Database } from '@/types/database'

type Assembly = Database['public']['Tables']['assemblies']['Row']

describe('assemblyCalculator', () => {
  describe('parseFormula', () => {
    it('should parse a simple formula', () => {
      const result = parseFormula('qty * 2')
      expect(result.valid).toBe(true)
      expect(result.variables).toContain('qty')
    })

    it('should parse a complex formula', () => {
      const result = parseFormula('(qty * length * width) / 144')
      if (!result.valid) {
        console.log('Parser error:', result.error)
      }
      expect(result.valid).toBe(true)
      expect(result.variables).toContain('qty')
      expect(result.variables).toContain('length')
      expect(result.variables).toContain('width')
    })

    it('should detect invalid formula', () => {
      const result = parseFormula('qty * * 2') // Invalid syntax
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('evaluateFormula', () => {
    it('should evaluate a simple formula', () => {
      const result = evaluateFormula('qty * 2', { qty: 10 })
      expect(result.result).toBe(20)
      expect(result.error).toBeUndefined()
    })

    it('should evaluate formula with multiple variables', () => {
      const result = evaluateFormula('(length * width) / 144', {
        length: 120,
        width: 96,
      })
      // 120 * 96 / 144 = 80
      expect(result.result).toBe(80)
    })

    it('should handle missing variable', () => {
      const result = evaluateFormula('qty * length', { qty: 10 })
      expect(result.error).toBeDefined()
      expect(result.result).toBe(0)
    })

    it('should handle string to number conversion', () => {
      const result = evaluateFormula('qty * 2', { qty: '10' })
      expect(result.result).toBe(20)
    })
  })

  describe('calculateAssembly', () => {
    it('should calculate simple assembly', () => {
      const assembly: Assembly = {
        id: 'test-1',
        name: 'Concrete Wall',
        unit_of_measure: 'LF',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Rebar',
            quantity_formula: 'qty * 4',
            unit_of_measure: 'LF',
            sort_order: 1,
          },
          {
            id: 'item-2',
            name: 'Concrete',
            quantity_formula: 'qty * 0.5',
            unit_of_measure: 'CY',
            sort_order: 2,
          },
        ] as any,
        variables: null,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = calculateAssembly(assembly, 100)

      expect(result.baseQuantity).toBe(100)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].quantity).toBe(400) // 100 * 4
      expect(result.items[1].quantity).toBe(50) // 100 * 0.5
      expect(result.errors).toBeUndefined()
    })

    it('should apply waste factor', () => {
      const assembly: Assembly = {
        id: 'test-2',
        name: 'Drywall',
        unit_of_measure: 'SF',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Drywall Sheets',
            quantity_formula: 'qty / 32',
            unit_of_measure: 'EA',
            waste_factor: 10, // 10% waste
            sort_order: 1,
          },
        ] as any,
        variables: null,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = calculateAssembly(assembly, 320)

      expect(result.items[0].quantity).toBe(10) // 320 / 32 = 10
      expect(result.items[0].waste_factor).toBe(10)
      expect(result.items[0].final_quantity).toBe(11) // 10 * 1.1 = 11
    })

    it('should handle variables', () => {
      const assembly: Assembly = {
        id: 'test-3',
        name: 'Custom Assembly',
        unit_of_measure: 'EA',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Material',
            quantity_formula: 'qty * multiplier',
            unit_of_measure: 'EA',
            sort_order: 1,
          },
        ] as any,
        variables: [
          {
            name: 'multiplier',
            label: 'Multiplier',
            type: 'number',
            default_value: 2,
          },
        ] as any,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = calculateAssembly(assembly, 10, { multiplier: 3 })

      expect(result.items[0].quantity).toBe(30) // 10 * 3
    })

    it('should use default values for missing variables', () => {
      const assembly: Assembly = {
        id: 'test-4',
        name: 'Assembly with Defaults',
        unit_of_measure: 'EA',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Material',
            quantity_formula: 'qty * factor',
            unit_of_measure: 'EA',
            sort_order: 1,
          },
        ] as any,
        variables: [
          {
            name: 'factor',
            label: 'Factor',
            type: 'number',
            default_value: 5,
          },
        ] as any,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = calculateAssembly(assembly, 10, {}) // No variables provided

      expect(result.items[0].quantity).toBe(50) // Uses default: 10 * 5
    })
  })

  describe('validateAssembly', () => {
    it('should validate a correct assembly', () => {
      const assembly: Assembly = {
        id: 'test-5',
        name: 'Valid Assembly',
        unit_of_measure: 'EA',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Item 1',
            quantity_formula: 'qty * 2',
            unit_of_measure: 'EA',
            sort_order: 1,
          },
        ] as any,
        variables: null,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = validateAssembly(assembly)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing name', () => {
      const assembly: Assembly = {
        id: 'test-6',
        name: '',
        unit_of_measure: 'EA',
        assembly_level: 'company',
        items: [] as any,
        variables: null,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = validateAssembly(assembly)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Assembly name is required')
    })

    it('should detect invalid formula', () => {
      const assembly: Assembly = {
        id: 'test-7',
        name: 'Invalid Formula Assembly',
        unit_of_measure: 'EA',
        assembly_level: 'company',
        items: [
          {
            id: 'item-1',
            name: 'Item 1',
            quantity_formula: 'qty * * 2', // Invalid
            unit_of_measure: 'EA',
            sort_order: 1,
          },
        ] as any,
        variables: null,
        description: null,
        category: null,
        trade: null,
        assembly_number: null,
        company_id: null,
        created_by: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }

      const result = validateAssembly(assembly)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('createSimpleAssembly', () => {
    it('should create a simple assembly structure', () => {
      const assembly = createSimpleAssembly('Test Assembly', 'LF', [
        { name: 'Rebar', quantityPerUnit: 4, unit: 'LF' },
        { name: 'Concrete', quantityPerUnit: 0.5, unit: 'CY', wasteFactor: 10 },
      ])

      expect(assembly.name).toBe('Test Assembly')
      expect(assembly.unit_of_measure).toBe('LF')
      expect((assembly.items as any).length).toBe(2)
      expect((assembly.items as any)[0].name).toBe('Rebar')
      expect((assembly.items as any)[1].waste_factor).toBe(10)
    })
  })
})
