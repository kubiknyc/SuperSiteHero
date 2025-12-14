/**
 * Equipment Types Tests
 * Tests for equipment constants and utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  EQUIPMENT_TYPES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  OWNERSHIP_TYPES,
  FUEL_TYPES,
  MAINTENANCE_TYPES,
  MAINTENANCE_STATUSES,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  // Utility functions
  getEquipmentTypeLabel,
  getEquipmentStatusColor,
  getEquipmentStatusLabel,
  getMaintenanceStatusColor,
  getInspectionStatusColor,
  formatEquipmentName,
  isMaintenanceOverdue,
  // Types
  type EquipmentType,
  type EquipmentStatus,
  type MaintenanceStatus,
  type InspectionStatus,
  type Equipment,
  type EquipmentMaintenance,
} from './equipment'

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Equipment Constants', () => {
  describe('EQUIPMENT_TYPES', () => {
    it('should contain all equipment types', () => {
      expect(EQUIPMENT_TYPES).toHaveLength(20)
    })

    it('should have value, label, and category for each type', () => {
      EQUIPMENT_TYPES.forEach((type) => {
        expect(type).toHaveProperty('value')
        expect(type).toHaveProperty('label')
        expect(type).toHaveProperty('category')
        expect(typeof type.value).toBe('string')
        expect(typeof type.label).toBe('string')
        expect(typeof type.category).toBe('string')
      })
    })

    it('should have unique values', () => {
      const values = EQUIPMENT_TYPES.map((t) => t.value)
      expect(new Set(values).size).toBe(values.length)
    })

    it('should include common construction equipment', () => {
      const values = EQUIPMENT_TYPES.map((t) => t.value)
      expect(values).toContain('excavator')
      expect(values).toContain('crane')
      expect(values).toContain('forklift')
      expect(values).toContain('bulldozer')
      expect(values).toContain('generator')
    })

    it('should map types to correct categories', () => {
      const excavator = EQUIPMENT_TYPES.find((t) => t.value === 'excavator')
      expect(excavator?.category).toBe('earthmoving')

      const crane = EQUIPMENT_TYPES.find((t) => t.value === 'crane')
      expect(crane?.category).toBe('lifting')

      const generator = EQUIPMENT_TYPES.find((t) => t.value === 'generator')
      expect(generator?.category).toBe('power')
    })
  })

  describe('EQUIPMENT_CATEGORIES', () => {
    it('should contain all equipment categories', () => {
      expect(EQUIPMENT_CATEGORIES).toHaveLength(10)
    })

    it('should have value and label for each category', () => {
      EQUIPMENT_CATEGORIES.forEach((category) => {
        expect(category).toHaveProperty('value')
        expect(category).toHaveProperty('label')
      })
    })

    it('should include standard construction categories', () => {
      const values = EQUIPMENT_CATEGORIES.map((c) => c.value)
      expect(values).toContain('earthmoving')
      expect(values).toContain('lifting')
      expect(values).toContain('transport')
      expect(values).toContain('power')
    })
  })

  describe('EQUIPMENT_STATUSES', () => {
    it('should contain all equipment statuses', () => {
      expect(EQUIPMENT_STATUSES).toHaveLength(4)
    })

    it('should have value, label, and color for each status', () => {
      EQUIPMENT_STATUSES.forEach((status) => {
        expect(status).toHaveProperty('value')
        expect(status).toHaveProperty('label')
        expect(status).toHaveProperty('color')
      })
    })

    it('should include all status values', () => {
      const values = EQUIPMENT_STATUSES.map((s) => s.value)
      expect(values).toContain('available')
      expect(values).toContain('in_use')
      expect(values).toContain('maintenance')
      expect(values).toContain('out_of_service')
    })

    it('should have appropriate colors', () => {
      const available = EQUIPMENT_STATUSES.find((s) => s.value === 'available')
      expect(available?.color).toBe('green')

      const outOfService = EQUIPMENT_STATUSES.find((s) => s.value === 'out_of_service')
      expect(outOfService?.color).toBe('red')
    })
  })

  describe('OWNERSHIP_TYPES', () => {
    it('should contain all ownership types', () => {
      expect(OWNERSHIP_TYPES).toHaveLength(3)
    })

    it('should include owned, rented, and leased', () => {
      const values = OWNERSHIP_TYPES.map((o) => o.value)
      expect(values).toContain('owned')
      expect(values).toContain('rented')
      expect(values).toContain('leased')
    })
  })

  describe('FUEL_TYPES', () => {
    it('should contain all fuel types', () => {
      expect(FUEL_TYPES).toHaveLength(6)
    })

    it('should include common fuel types', () => {
      const values = FUEL_TYPES.map((f) => f.value)
      expect(values).toContain('diesel')
      expect(values).toContain('gasoline')
      expect(values).toContain('electric')
      expect(values).toContain('hybrid')
    })
  })

  describe('MAINTENANCE_TYPES', () => {
    it('should contain all maintenance types', () => {
      expect(MAINTENANCE_TYPES).toHaveLength(4)
    })

    it('should include standard maintenance types', () => {
      const values = MAINTENANCE_TYPES.map((m) => m.value)
      expect(values).toContain('preventive')
      expect(values).toContain('repair')
      expect(values).toContain('inspection')
      expect(values).toContain('service')
    })
  })

  describe('MAINTENANCE_STATUSES', () => {
    it('should contain all maintenance statuses', () => {
      expect(MAINTENANCE_STATUSES).toHaveLength(4)
    })

    it('should include workflow statuses', () => {
      const values = MAINTENANCE_STATUSES.map((s) => s.value)
      expect(values).toContain('scheduled')
      expect(values).toContain('in_progress')
      expect(values).toContain('completed')
      expect(values).toContain('cancelled')
    })

    it('should have appropriate colors', () => {
      const completed = MAINTENANCE_STATUSES.find((s) => s.value === 'completed')
      expect(completed?.color).toBe('green')

      const cancelled = MAINTENANCE_STATUSES.find((s) => s.value === 'cancelled')
      expect(cancelled?.color).toBe('gray')
    })
  })

  describe('INSPECTION_TYPES', () => {
    it('should contain all inspection types', () => {
      expect(INSPECTION_TYPES).toHaveLength(5)
    })

    it('should include inspection frequency types', () => {
      const values = INSPECTION_TYPES.map((i) => i.value)
      expect(values).toContain('pre_operation')
      expect(values).toContain('daily')
      expect(values).toContain('weekly')
      expect(values).toContain('monthly')
      expect(values).toContain('annual')
    })
  })

  describe('INSPECTION_STATUSES', () => {
    it('should contain all inspection statuses', () => {
      expect(INSPECTION_STATUSES).toHaveLength(3)
    })

    it('should include pass, fail, and needs_attention', () => {
      const values = INSPECTION_STATUSES.map((s) => s.value)
      expect(values).toContain('pass')
      expect(values).toContain('fail')
      expect(values).toContain('needs_attention')
    })

    it('should have appropriate colors', () => {
      const pass = INSPECTION_STATUSES.find((s) => s.value === 'pass')
      expect(pass?.color).toBe('green')

      const fail = INSPECTION_STATUSES.find((s) => s.value === 'fail')
      expect(fail?.color).toBe('red')
    })
  })
})

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Equipment Utility Functions', () => {
  describe('getEquipmentTypeLabel', () => {
    it('should return correct label for known types', () => {
      expect(getEquipmentTypeLabel('excavator')).toBe('Excavator')
      expect(getEquipmentTypeLabel('crane')).toBe('Crane')
      expect(getEquipmentTypeLabel('forklift')).toBe('Forklift')
      expect(getEquipmentTypeLabel('dump_truck')).toBe('Dump Truck')
    })

    it('should return the type value for unknown types', () => {
      expect(getEquipmentTypeLabel('unknown' as EquipmentType)).toBe('unknown')
    })

    it('should return Aerial Lift for lift type', () => {
      expect(getEquipmentTypeLabel('lift')).toBe('Aerial Lift')
    })
  })

  describe('getEquipmentStatusColor', () => {
    it('should return correct colors for statuses', () => {
      expect(getEquipmentStatusColor('available')).toBe('green')
      expect(getEquipmentStatusColor('in_use')).toBe('blue')
      expect(getEquipmentStatusColor('maintenance')).toBe('yellow')
      expect(getEquipmentStatusColor('out_of_service')).toBe('red')
    })

    it('should return gray for unknown status', () => {
      expect(getEquipmentStatusColor('unknown' as EquipmentStatus)).toBe('gray')
    })
  })

  describe('getEquipmentStatusLabel', () => {
    it('should return correct labels for statuses', () => {
      expect(getEquipmentStatusLabel('available')).toBe('Available')
      expect(getEquipmentStatusLabel('in_use')).toBe('In Use')
      expect(getEquipmentStatusLabel('maintenance')).toBe('Maintenance')
      expect(getEquipmentStatusLabel('out_of_service')).toBe('Out of Service')
    })

    it('should return the status value for unknown status', () => {
      expect(getEquipmentStatusLabel('unknown' as EquipmentStatus)).toBe('unknown')
    })
  })

  describe('getMaintenanceStatusColor', () => {
    it('should return correct colors for maintenance statuses', () => {
      expect(getMaintenanceStatusColor('scheduled')).toBe('blue')
      expect(getMaintenanceStatusColor('in_progress')).toBe('yellow')
      expect(getMaintenanceStatusColor('completed')).toBe('green')
      expect(getMaintenanceStatusColor('cancelled')).toBe('gray')
    })

    it('should return gray for unknown status', () => {
      expect(getMaintenanceStatusColor('unknown' as MaintenanceStatus)).toBe('gray')
    })
  })

  describe('getInspectionStatusColor', () => {
    it('should return correct colors for inspection statuses', () => {
      expect(getInspectionStatusColor('pass')).toBe('green')
      expect(getInspectionStatusColor('fail')).toBe('red')
      expect(getInspectionStatusColor('needs_attention')).toBe('yellow')
    })

    it('should return gray for unknown status', () => {
      expect(getInspectionStatusColor('unknown' as InspectionStatus)).toBe('gray')
    })
  })

  describe('formatEquipmentName', () => {
    it('should format equipment name with number and name', () => {
      const equipment = {
        equipment_number: 'EQ-001',
        name: 'CAT 320 Excavator',
      }
      expect(formatEquipmentName(equipment)).toBe('EQ-001 - CAT 320 Excavator')
    })

    it('should handle simple names', () => {
      const equipment = {
        equipment_number: '123',
        name: 'Forklift',
      }
      expect(formatEquipmentName(equipment)).toBe('123 - Forklift')
    })
  })

  describe('isMaintenanceOverdue', () => {
    const baseEquipment: Equipment = {
      id: 'eq-1',
      company_id: 'company-1',
      equipment_number: 'EQ-001',
      name: 'Test Equipment',
      description: null,
      equipment_type: 'excavator',
      category: 'earthmoving',
      make: 'CAT',
      model: '320',
      year: 2020,
      serial_number: null,
      vin: null,
      ownership_type: 'owned',
      owner_company: null,
      rental_rate: null,
      rental_rate_type: null,
      capacity: null,
      operating_weight: null,
      dimensions: null,
      status: 'available',
      current_location: null,
      current_project_id: null,
      current_hours: 1000,
      current_miles: 5000,
      purchase_price: null,
      purchase_date: null,
      hourly_cost: null,
      fuel_type: 'diesel',
      insurance_policy: null,
      insurance_expiry: null,
      registration_number: null,
      registration_expiry: null,
      requires_certified_operator: false,
      certification_type: null,
      image_url: null,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
    }

    const baseMaintenance: EquipmentMaintenance = {
      id: 'maint-1',
      equipment_id: 'eq-1',
      maintenance_type: 'preventive',
      scheduled_date: null,
      due_hours: null,
      due_miles: null,
      completed_date: null,
      completed_hours: null,
      completed_miles: null,
      description: 'Oil change',
      work_performed: null,
      service_provider: null,
      technician_name: null,
      labor_cost: null,
      parts_cost: null,
      total_cost: null,
      parts_used: [],
      status: 'scheduled',
      downtime_hours: null,
      invoice_number: null,
      attachments: [],
      next_service_date: null,
      next_service_hours: null,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: null,
    }

    it('should return false for non-scheduled maintenance', () => {
      const maintenance = { ...baseMaintenance, status: 'completed' as const }
      expect(isMaintenanceOverdue(maintenance, baseEquipment)).toBe(false)
    })

    it('should return false for in_progress maintenance', () => {
      const maintenance = { ...baseMaintenance, status: 'in_progress' as const }
      expect(isMaintenanceOverdue(maintenance, baseEquipment)).toBe(false)
    })

    it('should return true when scheduled date is in the past', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      const maintenance = {
        ...baseMaintenance,
        scheduled_date: pastDate.toISOString(),
      }
      expect(isMaintenanceOverdue(maintenance, baseEquipment)).toBe(true)
    })

    it('should return false when scheduled date is in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const maintenance = {
        ...baseMaintenance,
        scheduled_date: futureDate.toISOString(),
      }
      expect(isMaintenanceOverdue(maintenance, baseEquipment)).toBe(false)
    })

    it('should return true when equipment hours exceed due hours', () => {
      const maintenance = { ...baseMaintenance, due_hours: 500 }
      const equipment = { ...baseEquipment, current_hours: 1000 }
      expect(isMaintenanceOverdue(maintenance, equipment)).toBe(true)
    })

    it('should return false when equipment hours below due hours', () => {
      const maintenance = { ...baseMaintenance, due_hours: 1500 }
      const equipment = { ...baseEquipment, current_hours: 1000 }
      expect(isMaintenanceOverdue(maintenance, equipment)).toBe(false)
    })

    it('should return true when equipment miles exceed due miles', () => {
      const maintenance = { ...baseMaintenance, due_miles: 3000 }
      const equipment = { ...baseEquipment, current_miles: 5000 }
      expect(isMaintenanceOverdue(maintenance, equipment)).toBe(true)
    })

    it('should return false when equipment miles below due miles', () => {
      const maintenance = { ...baseMaintenance, due_miles: 10000 }
      const equipment = { ...baseEquipment, current_miles: 5000 }
      expect(isMaintenanceOverdue(maintenance, equipment)).toBe(false)
    })

    it('should return false when no due criteria are set', () => {
      expect(isMaintenanceOverdue(baseMaintenance, baseEquipment)).toBe(false)
    })
  })
})

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('Equipment Type Structures', () => {
  it('should have expected properties on Equipment interface', () => {
    const equipment: Equipment = {
      id: 'eq-1',
      company_id: 'company-1',
      equipment_number: 'EQ-001',
      name: 'Excavator',
      description: 'Heavy duty excavator',
      equipment_type: 'excavator',
      category: 'earthmoving',
      make: 'Caterpillar',
      model: '320',
      year: 2022,
      serial_number: 'ABC123',
      vin: null,
      ownership_type: 'owned',
      owner_company: null,
      rental_rate: null,
      rental_rate_type: null,
      capacity: '20 tons',
      operating_weight: '22,000 lbs',
      dimensions: '10x4x5 ft',
      status: 'available',
      current_location: 'Main Yard',
      current_project_id: null,
      current_hours: 500,
      current_miles: 0,
      purchase_price: 250000,
      purchase_date: '2022-01-15',
      hourly_cost: 150,
      fuel_type: 'diesel',
      insurance_policy: 'POL-123',
      insurance_expiry: '2025-01-01',
      registration_number: 'REG-456',
      registration_expiry: '2024-12-31',
      requires_certified_operator: true,
      certification_type: 'Heavy Equipment Operator',
      image_url: 'https://example.com/equipment.jpg',
      notes: 'Well maintained',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      created_by: 'user-1',
      deleted_at: null,
    }

    expect(equipment.id).toBe('eq-1')
    expect(equipment.equipment_type).toBe('excavator')
    expect(equipment.status).toBe('available')
    expect(equipment.ownership_type).toBe('owned')
  })

  it('should have expected properties on EquipmentMaintenance interface', () => {
    const maintenance: EquipmentMaintenance = {
      id: 'maint-1',
      equipment_id: 'eq-1',
      maintenance_type: 'preventive',
      scheduled_date: '2024-02-01',
      due_hours: 1000,
      due_miles: null,
      completed_date: null,
      completed_hours: null,
      completed_miles: null,
      description: 'Regular oil change',
      work_performed: null,
      service_provider: 'ABC Mechanics',
      technician_name: 'John Doe',
      labor_cost: 200,
      parts_cost: 150,
      total_cost: 350,
      parts_used: [
        { part_name: 'Oil Filter', part_number: 'OF-123', quantity: 1, unit_cost: 25 },
        { part_name: 'Engine Oil', quantity: 6, unit_cost: 20 },
      ],
      status: 'scheduled',
      downtime_hours: null,
      invoice_number: null,
      attachments: [],
      next_service_date: '2024-05-01',
      next_service_hours: 1500,
      notes: 'Schedule during slow period',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      created_by: 'user-1',
    }

    expect(maintenance.maintenance_type).toBe('preventive')
    expect(maintenance.status).toBe('scheduled')
    expect(maintenance.parts_used).toHaveLength(2)
  })
})
