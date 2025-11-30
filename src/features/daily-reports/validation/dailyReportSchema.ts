// Zod validation schemas for daily reports
import { z } from 'zod'

// Common field validations
const requiredString = z.string().min(1, 'This field is required')
const optionalString = z.string().optional()
const positiveNumber = z.number().positive('Must be greater than 0')
const optionalPositiveNumber = z.number().positive('Must be greater than 0').optional()

// Weather Section Schema
export const weatherSchema = z.object({
  weather_conditions: requiredString,
  temperature_high: z.number().min(-50, 'Invalid temperature').max(150, 'Invalid temperature').optional(),
  temperature_low: z.number().min(-50, 'Invalid temperature').max(150, 'Invalid temperature').optional(),
  precipitation: optionalString,
  wind_conditions: optionalString,
  weather_delays: z.boolean().optional(),
  weather_notes: z.string().max(500, 'Maximum 500 characters').optional(),
})

// Work Section Schema
export const workSectionSchema = z.object({
  work_performed: requiredString.max(2000, 'Maximum 2000 characters'),
  work_completed: z.string().max(1000, 'Maximum 1000 characters').optional(),
  work_planned: z.string().max(1000, 'Maximum 1000 characters').optional(),
})

// Issues Section Schema
export const issuesSectionSchema = z.object({
  safety_incidents: z.string().max(1000, 'Maximum 1000 characters').optional(),
  quality_issues: z.string().max(1000, 'Maximum 1000 characters').optional(),
  schedule_delays: z.string().max(1000, 'Maximum 1000 characters').optional(),
  general_notes: z.string().max(2000, 'Maximum 2000 characters').optional(),
})

// Workforce Entry Schema
export const workforceEntrySchema = z.object({
  id: z.string(),
  entry_type: z.enum(['team', 'individual']),
  team_name: z.string().optional(),
  worker_name: z.string().optional(),
  trade: z.string().optional(),
  worker_count: optionalPositiveNumber,
  activity: z.string().max(200, 'Maximum 200 characters').optional(),
  hours_worked: z.number().min(0, 'Must be 0 or greater').max(24, 'Cannot exceed 24 hours').optional(),
}).refine(
  (data) => {
    if (data.entry_type === 'team') {
      return !!data.team_name && !!data.worker_count
    }
    if (data.entry_type === 'individual') {
      return !!data.worker_name
    }
    return true
  },
  {
    message: 'Team entries require team name and worker count. Individual entries require worker name.',
    path: ['entry_type'],
  }
)

// Equipment Entry Schema
export const equipmentEntrySchema = z.object({
  id: z.string(),
  equipment_type: requiredString.max(100, 'Maximum 100 characters'),
  equipment_description: z.string().max(200, 'Maximum 200 characters').optional(),
  quantity: positiveNumber,
  owner: z.string().max(100, 'Maximum 100 characters').optional(),
  hours_used: z.number().min(0, 'Must be 0 or greater').max(24, 'Cannot exceed 24 hours').optional(),
  notes: z.string().max(500, 'Maximum 500 characters').optional(),
})

// Delivery Entry Schema
export const deliveryEntrySchema = z.object({
  id: z.string(),
  material_description: requiredString.max(200, 'Maximum 200 characters'),
  quantity: z.string().max(100, 'Maximum 100 characters').optional(),
  vendor: z.string().max(100, 'Maximum 100 characters').optional(),
  delivery_ticket_number: z.string().max(50, 'Maximum 50 characters').optional(),
  delivery_time: z.string().optional(),
  notes: z.string().max(500, 'Maximum 500 characters').optional(),
})

// Visitor Entry Schema
export const visitorEntrySchema = z.object({
  id: z.string(),
  visitor_name: requiredString.max(100, 'Maximum 100 characters'),
  company: z.string().max(100, 'Maximum 100 characters').optional(),
  purpose: z.string().max(200, 'Maximum 200 characters').optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
})

// Photo Schema
export const photoSchema = z.object({
  id: z.string(),
  caption: z.string().max(300, 'Maximum 300 characters').optional(),
  uploadStatus: z.enum(['pending', 'uploading', 'uploaded', 'failed']),
})

// Complete Daily Report Schema
export const dailyReportSchema = z.object({
  // Required fields
  project_id: requiredString,
  report_date: requiredString,

  // Weather section
  weather: weatherSchema.optional(),

  // Work section
  work: workSectionSchema,

  // Issues section
  issues: issuesSectionSchema.optional(),

  // Arrays
  workforce: z.array(workforceEntrySchema).optional(),
  equipment: z.array(equipmentEntrySchema).optional(),
  deliveries: z.array(deliveryEntrySchema).optional(),
  visitors: z.array(visitorEntrySchema).optional(),
  photos: z.array(photoSchema).optional(),
})

// Export type inference
export type DailyReportFormData = z.infer<typeof dailyReportSchema>
export type WeatherFormData = z.infer<typeof weatherSchema>
export type WorkSectionFormData = z.infer<typeof workSectionSchema>
export type IssuesSectionFormData = z.infer<typeof issuesSectionSchema>
export type WorkforceEntryFormData = z.infer<typeof workforceEntrySchema>
export type EquipmentEntryFormData = z.infer<typeof equipmentEntrySchema>
export type DeliveryEntryFormData = z.infer<typeof deliveryEntrySchema>
export type VisitorEntryFormData = z.infer<typeof visitorEntrySchema>
export type PhotoFormData = z.infer<typeof photoSchema>
