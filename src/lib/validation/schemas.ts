// File: /src/lib/validation/schemas.ts
// Comprehensive Zod validation schemas for all entities

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const optionalStringSchema = z.string().optional().nullable()

export const dateSchema = z.string().datetime().optional().nullable()

export const statusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'archived'])

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const projectCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(200, 'Project name cannot exceed 200 characters'),

  project_number: z
    .string()
    .max(50, 'Project number cannot exceed 50 characters')
    .optional()
    .nullable(),

  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable(),

  address: z
    .string()
    .max(255, 'Address cannot exceed 255 characters')
    .optional()
    .nullable(),

  city: z
    .string()
    .max(100, 'City cannot exceed 100 characters')
    .optional()
    .nullable(),

  state: z
    .string()
    .max(2, 'State must be 2 characters')
    .optional()
    .nullable(),

  zip: z
    .string()
    .max(20, 'ZIP code cannot exceed 20 characters')
    .optional()
    .nullable(),

  start_date: z
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid start date')
    .optional()
    .nullable(),

  end_date: z
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid end date')
    .optional()
    .nullable(),

  status: statusSchema.optional().default('planning'),
})

export const projectUpdateSchema = projectCreateSchema.partial()

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

// ============================================================================
// DAILY REPORT SCHEMAS
// ============================================================================

export const dailyReportCreateSchema = z.object({
  project_id: z
    .string()
    .min(1, 'Project is required')
    .uuid('Invalid project ID'),

  reporter_id: z
    .string()
    .uuid('Invalid reporter ID'),

  report_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date')
    .refine((date) => {
      const reportDate = new Date(date)
      const today = new Date()
      reportDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      return reportDate <= today
    }, 'Report date cannot be in the future'),

  weather_condition: z
    .string()
    .max(100, 'Weather condition cannot exceed 100 characters')
    .optional()
    .nullable(),

  temperature_high: z
    .number()
    .min(-100, 'Temperature cannot be below -100°F')
    .max(150, 'Temperature cannot exceed 150°F')
    .optional()
    .nullable(),

  temperature_low: z
    .number()
    .min(-100, 'Temperature cannot be below -100°F')
    .max(150, 'Temperature cannot exceed 150°F')
    .optional()
    .nullable(),

  total_workers: z
    .number()
    .int('Worker count must be a whole number')
    .min(0, 'Worker count cannot be negative')
    .max(10000, 'Worker count seems too high')
    .optional()
    .nullable(),

  weather_delays: z
    .boolean()
    .optional()
    .nullable(),

  other_delays: z
    .string()
    .max(500, 'Delays description cannot exceed 500 characters')
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .nullable(),

  status: z
    .enum(['draft', 'submitted', 'in_review', 'approved', 'rejected'])
    .optional()
    .default('draft'),
})

export const dailyReportUpdateSchema = dailyReportCreateSchema.partial()

export type DailyReportCreateInput = z.infer<typeof dailyReportCreateSchema>
export type DailyReportUpdateInput = z.infer<typeof dailyReportUpdateSchema>

// ============================================================================
// CHANGE ORDER SCHEMAS
// ============================================================================

export const changeOrderCreateSchema = z.object({
  project_id: z
    .string()
    .min(1, 'Project is required')
    .uuid('Invalid project ID'),

  workflow_type_id: z
    .string()
    .min(1, 'Workflow type is required')
    .uuid('Invalid workflow type ID'),

  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title cannot exceed 255 characters'),

  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable(),

  priority: z
    .enum(['low', 'normal', 'high'])
    .optional()
    .default('normal'),

  cost_impact: z
    .number()
    .min(0, 'Cost cannot be negative')
    .max(10000000, 'Cost seems too high')
    .optional()
    .nullable(),

  schedule_impact: z
    .string()
    .max(500, 'Schedule impact description cannot exceed 500 characters')
    .optional()
    .nullable(),

  assignees: z
    .array(z.string().uuid('Invalid assignee ID'))
    .optional()
    .default([]),
})

export const changeOrderUpdateSchema = changeOrderCreateSchema.partial()

export type ChangeOrderCreateInput = z.infer<typeof changeOrderCreateSchema>
export type ChangeOrderUpdateInput = z.infer<typeof changeOrderUpdateSchema>

// ============================================================================
// CHANGE ORDER COMMENT SCHEMAS
// ============================================================================

export const changeOrderCommentSchema = z.object({
  workflow_item_id: z
    .string()
    .min(1, 'Change order is required')
    .uuid('Invalid change order ID'),

  comment: z
    .string()
    .min(1, 'Comment is required')
    .min(2, 'Comment must be at least 2 characters')
    .max(5000, 'Comment cannot exceed 5000 characters'),
})

export type ChangeOrderCommentInput = z.infer<typeof changeOrderCommentSchema>

// ============================================================================
// WORKFLOW ITEM (RFI, SUBMITTAL, etc) SCHEMAS
// ============================================================================

export const workflowItemCreateSchema = z.object({
  project_id: z
    .string()
    .min(1, 'Project is required')
    .uuid('Invalid project ID'),

  workflow_type_id: z
    .string()
    .min(1, 'Workflow type is required')
    .uuid('Invalid workflow type ID'),

  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title cannot exceed 255 characters'),

  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable(),

  priority: z
    .enum(['low', 'normal', 'high'])
    .optional()
    .default('normal'),

  due_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid due date')
    .optional()
    .nullable(),
})

export const workflowItemUpdateSchema = workflowItemCreateSchema.partial()

export type WorkflowItemCreateInput = z.infer<typeof workflowItemCreateSchema>
export type WorkflowItemUpdateInput = z.infer<typeof workflowItemUpdateSchema>

// ============================================================================
// BATCH VALIDATION HELPER
// ============================================================================

/**
 * Validate an array of items
 */
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): { valid: T[]; errors: Array<{ index: number; errors: string[] }> } {
  const valid: T[] = []
  const errors: Array<{ index: number; errors: string[] }> = []

  items.forEach((item, index) => {
    const result = schema.safeParse(item)
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push({
        index,
        errors: result.error.issues.map((e: any) => e.message),
      })
    }
  })

  return { valid, errors }
}
