// File: /src/lib/validation/schemas.test.ts
// Tests for Zod validation schemas

import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  optionalStringSchema,
  dateSchema,
  statusSchema,
  projectCreateSchema,
  projectUpdateSchema,
  dailyReportCreateSchema,
  dailyReportUpdateSchema,
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  changeOrderCommentSchema,
  workflowItemCreateSchema,
  workflowItemUpdateSchema,
  validateArray,
  type ProjectCreateInput,
  type DailyReportCreateInput,
  type ChangeOrderCreateInput,
  type WorkflowItemCreateInput,
} from './schemas'

describe('Common Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const result = emailSchema.safeParse('user@example.com')
      expect(result.success).toBe(true)
    })

    it('should reject empty string', () => {
      const result = emailSchema.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email is required')
      }
    })

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('invalid-email')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email')
      }
    })

    it('should accept email with subdomains', () => {
      const result = emailSchema.safeParse('user@mail.example.com')
      expect(result.success).toBe(true)
    })

    it('should accept email with plus addressing', () => {
      const result = emailSchema.safeParse('user+tag@example.com')
      expect(result.success).toBe(true)
    })
  })

  describe('passwordSchema', () => {
    it('should accept valid password', () => {
      const result = passwordSchema.safeParse('Password123')
      expect(result.success).toBe(true)
    })

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters')
      }
    })

    it('should reject password without uppercase letter', () => {
      const result = passwordSchema.safeParse('password123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(e => e.message.includes('uppercase'))).toBe(true)
      }
    })

    it('should reject password without lowercase letter', () => {
      const result = passwordSchema.safeParse('PASSWORD123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(e => e.message.includes('lowercase'))).toBe(true)
      }
    })

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Password')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(e => e.message.includes('number'))).toBe(true)
      }
    })
  })

  describe('optionalStringSchema', () => {
    it('should accept string value', () => {
      const result = optionalStringSchema.safeParse('test')
      expect(result.success).toBe(true)
    })

    it('should accept undefined', () => {
      const result = optionalStringSchema.safeParse(undefined)
      expect(result.success).toBe(true)
    })

    it('should accept null', () => {
      const result = optionalStringSchema.safeParse(null)
      expect(result.success).toBe(true)
    })
  })

  describe('statusSchema', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'archived']
      validStatuses.forEach(status => {
        const result = statusSchema.safeParse(status)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const result = statusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })
})

describe('Project Schemas', () => {
  describe('projectCreateSchema', () => {
    const validProject: ProjectCreateInput = {
      name: 'Test Project',
      project_number: 'PRJ-001',
      description: 'Test description',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'planning',
    }

    it('should accept valid project data', () => {
      const result = projectCreateSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should reject project with empty name', () => {
      const result = projectCreateSchema.safeParse({ ...validProject, name: '' })
      expect(result.success).toBe(false)
    })

    it('should reject project with name shorter than 3 characters', () => {
      const result = projectCreateSchema.safeParse({ ...validProject, name: 'ab' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 characters')
      }
    })

    it('should reject project with name longer than 200 characters', () => {
      const result = projectCreateSchema.safeParse({ ...validProject, name: 'a'.repeat(201) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 200 characters')
      }
    })

    it('should accept minimal project (name only)', () => {
      const result = projectCreateSchema.safeParse({ name: 'Minimal Project' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid start date', () => {
      const result = projectCreateSchema.safeParse({ ...validProject, start_date: 'invalid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid start date')
      }
    })

    it('should accept null optional fields', () => {
      const result = projectCreateSchema.safeParse({
        name: 'Test Project',
        description: null,
        address: null,
        start_date: null,
      })
      expect(result.success).toBe(true)
    })

    it('should default status to planning', () => {
      const result = projectCreateSchema.safeParse({ name: 'Test Project' })
      if (result.success) {
        expect(result.data.status).toBe('planning')
      }
    })

    it('should reject state longer than 2 characters', () => {
      const result = projectCreateSchema.safeParse({ ...validProject, state: 'CAL' })
      expect(result.success).toBe(false)
    })
  })

  describe('projectUpdateSchema', () => {
    it('should accept partial project data', () => {
      const result = projectUpdateSchema.safeParse({ name: 'Updated Name' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = projectUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})

describe('Daily Report Schemas', () => {
  describe('dailyReportCreateSchema', () => {
    const validReport: DailyReportCreateInput = {
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      reporter_id: '550e8400-e29b-41d4-a716-446655440001',
      report_date: '2025-01-15',
      weather_condition: 'Sunny',
      temperature_high: 75,
      temperature_low: 55,
      total_workers: 20,
      weather_delays: false,
      other_delays: null,
      notes: 'Good progress today',
      status: 'draft',
    }

    it('should accept valid daily report data', () => {
      const result = dailyReportCreateSchema.safeParse(validReport)
      expect(result.success).toBe(true)
    })

    it('should reject invalid project_id (not UUID)', () => {
      const result = dailyReportCreateSchema.safeParse({ ...validReport, project_id: 'invalid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid project ID')
      }
    })

    it('should reject future report date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2) // Add 2 days to ensure it's definitely in the future
      const result = dailyReportCreateSchema.safeParse({
        ...validReport,
        report_date: futureDate.toISOString().split('T')[0],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(e => e.message.includes('cannot be in the future'))).toBe(true)
      }
    })

    it('should accept today as report date', () => {
      const today = new Date().toISOString().split('T')[0]
      const result = dailyReportCreateSchema.safeParse({ ...validReport, report_date: today })
      expect(result.success).toBe(true)
    })

    it('should reject temperature below -100°F', () => {
      const result = dailyReportCreateSchema.safeParse({ ...validReport, temperature_low: -101 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be below -100')
      }
    })

    it('should reject temperature above 150°F', () => {
      const result = dailyReportCreateSchema.safeParse({ ...validReport, temperature_high: 151 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 150')
      }
    })

    it('should reject negative worker count', () => {
      const result = dailyReportCreateSchema.safeParse({ ...validReport, total_workers: -1 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be negative')
      }
    })

    it('should reject non-integer worker count', () => {
      const result = dailyReportCreateSchema.safeParse({ ...validReport, total_workers: 20.5 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be a whole number')
      }
    })

    it('should default status to draft', () => {
      const { status, ...reportWithoutStatus } = validReport
      const result = dailyReportCreateSchema.safeParse(reportWithoutStatus)
      if (result.success) {
        expect(result.data.status).toBe('draft')
      }
    })

    it('should accept minimal report', () => {
      const minimal = {
        project_id: validReport.project_id,
        reporter_id: validReport.reporter_id,
        report_date: validReport.report_date,
      }
      const result = dailyReportCreateSchema.safeParse(minimal)
      expect(result.success).toBe(true)
    })
  })

  describe('dailyReportUpdateSchema', () => {
    it('should accept partial update', () => {
      const result = dailyReportUpdateSchema.safeParse({ notes: 'Updated notes' })
      expect(result.success).toBe(true)
    })
  })
})

describe('Change Order Schemas', () => {
  describe('changeOrderCreateSchema', () => {
    const validChangeOrder: ChangeOrderCreateInput = {
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      workflow_type_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Foundation Change',
      description: 'Change to foundation design',
      priority: 'high',
      cost_impact: 5000.00,
      schedule_impact: '2 days delay',
      assignees: ['550e8400-e29b-41d4-a716-446655440002'],
    }

    it('should accept valid change order data', () => {
      const result = changeOrderCreateSchema.safeParse(validChangeOrder)
      expect(result.success).toBe(true)
    })

    it('should reject title shorter than 5 characters', () => {
      const result = changeOrderCreateSchema.safeParse({ ...validChangeOrder, title: 'test' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 5 characters')
      }
    })

    it('should reject negative cost_impact', () => {
      const result = changeOrderCreateSchema.safeParse({ ...validChangeOrder, cost_impact: -100 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be negative')
      }
    })

    it('should reject cost_impact above 10 million', () => {
      const result = changeOrderCreateSchema.safeParse({ ...validChangeOrder, cost_impact: 10000001 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('too high')
      }
    })

    it('should default priority to normal', () => {
      const { priority, ...withoutPriority } = validChangeOrder
      const result = changeOrderCreateSchema.safeParse(withoutPriority)
      if (result.success) {
        expect(result.data.priority).toBe('normal')
      }
    })

    it('should default assignees to empty array', () => {
      const { assignees, ...withoutAssignees } = validChangeOrder
      const result = changeOrderCreateSchema.safeParse(withoutAssignees)
      if (result.success) {
        expect(result.data.assignees).toEqual([])
      }
    })

    it('should reject invalid assignee UUID', () => {
      const result = changeOrderCreateSchema.safeParse({
        ...validChangeOrder,
        assignees: ['invalid-uuid'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid assignee ID')
      }
    })
  })

  describe('changeOrderCommentSchema', () => {
    const validComment = {
      workflow_item_id: '550e8400-e29b-41d4-a716-446655440000',
      comment: 'This is a comment',
    }

    it('should accept valid comment', () => {
      const result = changeOrderCommentSchema.safeParse(validComment)
      expect(result.success).toBe(true)
    })

    it('should reject empty comment', () => {
      const result = changeOrderCommentSchema.safeParse({ ...validComment, comment: '' })
      expect(result.success).toBe(false)
    })

    it('should reject comment shorter than 2 characters', () => {
      const result = changeOrderCommentSchema.safeParse({ ...validComment, comment: 'a' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should reject comment longer than 5000 characters', () => {
      const result = changeOrderCommentSchema.safeParse({ ...validComment, comment: 'a'.repeat(5001) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 5000 characters')
      }
    })
  })
})

describe('Workflow Item Schemas', () => {
  describe('workflowItemCreateSchema', () => {
    const validWorkflowItem: WorkflowItemCreateInput = {
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      workflow_type_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'RFI: Foundation Detail',
      description: 'Need clarification on foundation detail',
      priority: 'high',
      due_date: '2025-12-31',
    }

    it('should accept valid workflow item data', () => {
      const result = workflowItemCreateSchema.safeParse(validWorkflowItem)
      expect(result.success).toBe(true)
    })

    it('should reject title shorter than 5 characters', () => {
      const result = workflowItemCreateSchema.safeParse({ ...validWorkflowItem, title: 'RFI' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 5 characters')
      }
    })

    it('should default priority to normal', () => {
      const { priority, ...withoutPriority } = validWorkflowItem
      const result = workflowItemCreateSchema.safeParse(withoutPriority)
      if (result.success) {
        expect(result.data.priority).toBe('normal')
      }
    })

    it('should accept null description', () => {
      const result = workflowItemCreateSchema.safeParse({
        ...validWorkflowItem,
        description: null,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid due_date', () => {
      const result = workflowItemCreateSchema.safeParse({
        ...validWorkflowItem,
        due_date: 'not-a-date',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid due date')
      }
    })
  })

  describe('workflowItemUpdateSchema', () => {
    it('should accept partial update', () => {
      const result = workflowItemUpdateSchema.safeParse({ title: 'Updated Title Here' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = workflowItemUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})

describe('validateArray', () => {
  const schema = projectCreateSchema

  it('should validate array of valid items', () => {
    const items = [
      { name: 'Project 1' },
      { name: 'Project 2' },
      { name: 'Project 3' },
    ]
    const result = validateArray(schema, items)
    expect(result.valid).toHaveLength(3)
    expect(result.errors).toHaveLength(0)
  })

  it('should separate valid and invalid items', () => {
    const items = [
      { name: 'Valid Project' },
      { name: 'ab' }, // Too short
      { name: 'Another Valid Project' },
      { name: '' }, // Empty
    ]
    const result = validateArray(schema, items)
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(2)
  })

  it('should provide error details with index', () => {
    const items = [
      { name: 'Valid Project' },
      { name: 'ab' }, // Index 1, too short
    ]
    const result = validateArray(schema, items)
    expect(result.errors[0].index).toBe(1)
    expect(result.errors[0].errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errors.some(e => e.includes('at least 3 characters'))).toBe(true)
  })

  it('should handle empty array', () => {
    const result = validateArray(schema, [])
    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle all invalid items', () => {
    const items = [
      { name: '' },
      { name: 'ab' },
      { name: 'a'.repeat(201) },
    ]
    const result = validateArray(schema, items)
    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(3)
  })

  it('should provide multiple errors for single item', () => {
    const items = [
      { name: 'Valid' },
      {
        name: 'a'.repeat(201), // Too long
        state: 'CAL', // Too long
      },
    ]
    const result = validateArray(schema, items)
    expect(result.errors[0].errors.length).toBeGreaterThan(0)
  })
})
