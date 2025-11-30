import { describe, it, expect } from 'vitest'
import {
  weatherSchema,
  workSectionSchema,
  issuesSectionSchema,
  workforceEntrySchema,
  equipmentEntrySchema,
  deliveryEntrySchema,
  visitorEntrySchema,
  photoSchema,
  dailyReportSchema,
} from '../dailyReportSchema'

describe('weatherSchema', () => {
  it('should validate valid weather data', () => {
    const validData = {
      weather_condition: 'Sunny',
      temperature_high: 75,
      temperature_low: 60,
    }
    expect(() => weatherSchema.parse(validData)).not.toThrow()
  })

  it('should require weather_condition', () => {
    const invalidData = { temperature_high: 75 }
    expect(() => weatherSchema.parse(invalidData)).toThrow()
  })

  it('should reject temperatures above 150°F', () => {
    const invalidTemp = { weather_condition: 'Hot', temperature_high: 200 }
    expect(() => weatherSchema.parse(invalidTemp)).toThrow(/Invalid temperature/)
  })

  it('should reject temperatures below -50°F', () => {
    const invalidTemp = { weather_condition: 'Cold', temperature_low: -60 }
    expect(() => weatherSchema.parse(invalidTemp)).toThrow(/Invalid temperature/)
  })

  it('should enforce weather_notes character limit (500)', () => {
    const tooLongNotes = {
      weather_condition: 'Rain',
      weather_notes: 'x'.repeat(501)
    }
    expect(() => weatherSchema.parse(tooLongNotes)).toThrow(/Maximum 500 characters/)
  })

  it('should allow weather_notes up to 500 characters', () => {
    const validNotes = {
      weather_condition: 'Cloudy',
      weather_notes: 'x'.repeat(500),
    }
    expect(() => weatherSchema.parse(validNotes)).not.toThrow()
  })

  it('should allow optional fields', () => {
    const minimalData = { weather_condition: 'Sunny' }
    expect(() => weatherSchema.parse(minimalData)).not.toThrow()
  })
})

describe('workSectionSchema', () => {
  it('should require work_performed', () => {
    const invalidData = {}
    expect(() => workSectionSchema.parse(invalidData)).toThrow()
  })

  it('should validate with only required field', () => {
    const validData = { work_performed: 'Installed electrical panels' }
    expect(() => workSectionSchema.parse(validData)).not.toThrow()
  })

  it('should enforce work_performed character limit (2000)', () => {
    const tooLong = { work_performed: 'x'.repeat(2001) }
    expect(() => workSectionSchema.parse(tooLong)).toThrow(/Maximum 2000 characters/)
  })

  it('should enforce work_completed character limit (1000)', () => {
    const data = {
      work_performed: 'Work done',
      work_completed: 'x'.repeat(1001)
    }
    expect(() => workSectionSchema.parse(data)).toThrow(/Maximum 1000 characters/)
  })

  it('should enforce work_planned character limit (1000)', () => {
    const data = {
      work_performed: 'Work done',
      work_planned: 'x'.repeat(1001)
    }
    expect(() => workSectionSchema.parse(data)).toThrow(/Maximum 1000 characters/)
  })

  it('should allow all fields at max length', () => {
    const validData = {
      work_performed: 'x'.repeat(2000),
      work_completed: 'y'.repeat(1000),
      work_planned: 'z'.repeat(1000),
    }
    expect(() => workSectionSchema.parse(validData)).not.toThrow()
  })
})

describe('issuesSectionSchema', () => {
  it('should allow all optional fields', () => {
    const emptyData = {}
    expect(() => issuesSectionSchema.parse(emptyData)).not.toThrow()
  })

  it('should enforce safety_incidents character limit (1000)', () => {
    const tooLong = { safety_incidents: 'x'.repeat(1001) }
    expect(() => issuesSectionSchema.parse(tooLong)).toThrow(/Maximum 1000 characters/)
  })

  it('should enforce quality_issues character limit (1000)', () => {
    const tooLong = { quality_issues: 'x'.repeat(1001) }
    expect(() => issuesSectionSchema.parse(tooLong)).toThrow(/Maximum 1000 characters/)
  })

  it('should enforce schedule_delays character limit (1000)', () => {
    const tooLong = { schedule_delays: 'x'.repeat(1001) }
    expect(() => issuesSectionSchema.parse(tooLong)).toThrow(/Maximum 1000 characters/)
  })

  it('should enforce general_notes character limit (2000)', () => {
    const tooLong = { general_notes: 'x'.repeat(2001) }
    expect(() => issuesSectionSchema.parse(tooLong)).toThrow(/Maximum 2000 characters/)
  })

  it('should validate all fields at max length', () => {
    const validData = {
      safety_incidents: 'x'.repeat(1000),
      quality_issues: 'y'.repeat(1000),
      schedule_delays: 'z'.repeat(1000),
      general_notes: 'w'.repeat(2000),
    }
    expect(() => issuesSectionSchema.parse(validData)).not.toThrow()
  })
})

describe('workforceEntrySchema', () => {
  it('should require team_name and worker_count for team entries', () => {
    const teamEntry = { id: '1', entry_type: 'team' }
    expect(() => workforceEntrySchema.parse(teamEntry)).toThrow()
  })

  it('should validate team entry with required fields', () => {
    const validTeam = {
      id: '1',
      entry_type: 'team',
      team_name: 'Electricians',
      worker_count: 5,
    }
    expect(() => workforceEntrySchema.parse(validTeam)).not.toThrow()
  })

  it('should require worker_name for individual entries', () => {
    const individualEntry = { id: '1', entry_type: 'individual' }
    expect(() => workforceEntrySchema.parse(individualEntry)).toThrow()
  })

  it('should validate individual entry with required fields', () => {
    const validIndividual = {
      id: '1',
      entry_type: 'individual',
      worker_name: 'John Doe',
    }
    expect(() => workforceEntrySchema.parse(validIndividual)).not.toThrow()
  })

  it('should enforce hours_worked range (0-24)', () => {
    const invalidHours = {
      id: '1',
      entry_type: 'team',
      team_name: 'Electricians',
      worker_count: 5,
      hours_worked: 30,
    }
    expect(() => workforceEntrySchema.parse(invalidHours)).toThrow(/Cannot exceed 24 hours/)
  })

  it('should allow 0 hours_worked', () => {
    const validEntry = {
      id: '1',
      entry_type: 'team',
      team_name: 'Electricians',
      worker_count: 5,
      hours_worked: 0,
    }
    expect(() => workforceEntrySchema.parse(validEntry)).not.toThrow()
  })

  it('should enforce activity character limit (200)', () => {
    const tooLongActivity = {
      id: '1',
      entry_type: 'team',
      team_name: 'Plumbers',
      worker_count: 3,
      activity: 'x'.repeat(201),
    }
    expect(() => workforceEntrySchema.parse(tooLongActivity)).toThrow(/Maximum 200 characters/)
  })
})

describe('equipmentEntrySchema', () => {
  it('should require equipment_type and quantity', () => {
    const invalidData = { id: '1' }
    expect(() => equipmentEntrySchema.parse(invalidData)).toThrow()
  })

  it('should validate with required fields', () => {
    const validData = {
      id: '1',
      equipment_type: 'Excavator',
      quantity: 2,
    }
    expect(() => equipmentEntrySchema.parse(validData)).not.toThrow()
  })

  it('should enforce positive quantity', () => {
    const invalidQuantity = {
      id: '1',
      equipment_type: 'Crane',
      quantity: -1,
    }
    expect(() => equipmentEntrySchema.parse(invalidQuantity)).toThrow(/Must be greater than 0/)
  })

  it('should enforce equipment_type character limit (100)', () => {
    const tooLong = {
      id: '1',
      equipment_type: 'x'.repeat(101),
      quantity: 1,
    }
    expect(() => equipmentEntrySchema.parse(tooLong)).toThrow(/Maximum 100 characters/)
  })

  it('should enforce hours_used range (0-24)', () => {
    const invalidHours = {
      id: '1',
      equipment_type: 'Bulldozer',
      quantity: 1,
      hours_used: 25,
    }
    expect(() => equipmentEntrySchema.parse(invalidHours)).toThrow(/Cannot exceed 24 hours/)
  })

  it('should enforce notes character limit (500)', () => {
    const tooLongNotes = {
      id: '1',
      equipment_type: 'Forklift',
      quantity: 1,
      notes: 'x'.repeat(501),
    }
    expect(() => equipmentEntrySchema.parse(tooLongNotes)).toThrow(/Maximum 500 characters/)
  })
})

describe('deliveryEntrySchema', () => {
  it('should require material_description', () => {
    const invalidData = { id: '1' }
    expect(() => deliveryEntrySchema.parse(invalidData)).toThrow()
  })

  it('should validate with required field', () => {
    const validData = {
      id: '1',
      material_description: 'Steel beams',
    }
    expect(() => deliveryEntrySchema.parse(validData)).not.toThrow()
  })

  it('should enforce material_description character limit (200)', () => {
    const tooLong = {
      id: '1',
      material_description: 'x'.repeat(201),
    }
    expect(() => deliveryEntrySchema.parse(tooLong)).toThrow(/Maximum 200 characters/)
  })

  it('should enforce delivery_ticket_number character limit (50)', () => {
    const tooLong = {
      id: '1',
      material_description: 'Concrete',
      delivery_ticket_number: 'x'.repeat(51),
    }
    expect(() => deliveryEntrySchema.parse(tooLong)).toThrow(/Maximum 50 characters/)
  })

  it('should enforce notes character limit (500)', () => {
    const tooLong = {
      id: '1',
      material_description: 'Lumber',
      notes: 'x'.repeat(501),
    }
    expect(() => deliveryEntrySchema.parse(tooLong)).toThrow(/Maximum 500 characters/)
  })
})

describe('visitorEntrySchema', () => {
  it('should require visitor_name', () => {
    const invalidData = { id: '1' }
    expect(() => visitorEntrySchema.parse(invalidData)).toThrow()
  })

  it('should validate with required field', () => {
    const validData = {
      id: '1',
      visitor_name: 'John Inspector',
    }
    expect(() => visitorEntrySchema.parse(validData)).not.toThrow()
  })

  it('should enforce visitor_name character limit (100)', () => {
    const tooLong = {
      id: '1',
      visitor_name: 'x'.repeat(101),
    }
    expect(() => visitorEntrySchema.parse(tooLong)).toThrow(/Maximum 100 characters/)
  })

  it('should enforce company character limit (100)', () => {
    const tooLong = {
      id: '1',
      visitor_name: 'Jane Doe',
      company: 'x'.repeat(101),
    }
    expect(() => visitorEntrySchema.parse(tooLong)).toThrow(/Maximum 100 characters/)
  })

  it('should enforce purpose character limit (200)', () => {
    const tooLong = {
      id: '1',
      visitor_name: 'Bob Smith',
      purpose: 'x'.repeat(201),
    }
    expect(() => visitorEntrySchema.parse(tooLong)).toThrow(/Maximum 200 characters/)
  })
})

describe('photoSchema', () => {
  it('should validate minimal photo data', () => {
    const validData = {
      id: '1',
      uploadStatus: 'pending' as const,
    }
    expect(() => photoSchema.parse(validData)).not.toThrow()
  })

  it('should enforce caption character limit (300)', () => {
    const tooLong = {
      id: '1',
      caption: 'x'.repeat(301),
      uploadStatus: 'uploaded' as const,
    }
    expect(() => photoSchema.parse(tooLong)).toThrow(/Maximum 300 characters/)
  })

  it('should accept valid uploadStatus values', () => {
    const statuses = ['pending', 'uploading', 'uploaded', 'failed'] as const
    statuses.forEach((status) => {
      const data = { id: '1', uploadStatus: status }
      expect(() => photoSchema.parse(data)).not.toThrow()
    })
  })

  it('should reject invalid uploadStatus', () => {
    const invalidData = { id: '1', uploadStatus: 'invalid' }
    expect(() => photoSchema.parse(invalidData)).toThrow()
  })
})

describe('dailyReportSchema', () => {
  it('should require project_id and report_date', () => {
    const invalidData = {}
    expect(() => dailyReportSchema.parse(invalidData)).toThrow()
  })

  it('should require work section', () => {
    const missingWork = {
      project_id: 'proj-1',
      report_date: '2024-01-01',
    }
    expect(() => dailyReportSchema.parse(missingWork)).toThrow()
  })

  it('should validate a complete valid report', () => {
    const validReport = {
      project_id: 'proj-1',
      report_date: '2024-01-01',
      work: {
        work_performed: 'Completed foundation work',
      },
      weather: {
        weather_condition: 'Sunny',
      },
    }
    expect(() => dailyReportSchema.parse(validReport)).not.toThrow()
  })

  it('should allow optional sections', () => {
    const minimalReport = {
      project_id: 'proj-1',
      report_date: '2024-01-01',
      work: {
        work_performed: 'Daily tasks',
      },
    }
    expect(() => dailyReportSchema.parse(minimalReport)).not.toThrow()
  })

  it('should validate report with all sections', () => {
    const completeReport = {
      project_id: 'proj-1',
      report_date: '2024-01-01',
      work: {
        work_performed: 'All work',
        work_completed: 'Task 1',
        work_planned: 'Task 2',
      },
      weather: {
        weather_condition: 'Clear',
        temperature_high: 75,
        temperature_low: 60,
      },
      issues: {
        safety_incidents: 'None',
        quality_issues: 'None',
      },
      workforce: [
        { id: '1', entry_type: 'team', team_name: 'Crew A', worker_count: 5 },
      ],
      equipment: [
        { id: '1', equipment_type: 'Excavator', quantity: 1 },
      ],
      deliveries: [
        { id: '1', material_description: 'Concrete' },
      ],
      visitors: [
        { id: '1', visitor_name: 'Inspector' },
      ],
      photos: [
        { id: '1', uploadStatus: 'uploaded' },
      ],
    }
    expect(() => dailyReportSchema.parse(completeReport)).not.toThrow()
  })
})
