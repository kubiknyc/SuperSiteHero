/**
 * Daily Report V2 Validation Schemas
 * Comprehensive Zod validation for all daily report entities
 */

import { z } from 'zod';

// =============================================
// ENUMS
// =============================================

export const shiftTypeSchema = z.enum(['regular', 'overtime', 'double_time', 'weekend']);

export const delayTypeSchema = z.enum([
  'owner',
  'contractor',
  'subcontractor',
  'weather',
  'material',
  'inspection',
  'permit',
  'design',
  'unforeseen',
  'labor',
  'equipment',
  'other',
]);

export const delayCategorySchema = z.enum([
  'excusable_compensable',
  'excusable_non_compensable',
  'non_excusable',
]);

export const incidentTypeSchema = z.enum([
  'near_miss',
  'first_aid',
  'recordable',
  'lost_time',
  'fatality',
]);

export const inspectionCategorySchema = z.enum([
  'building_official',
  'owner',
  'third_party',
  'internal',
]);

export const inspectionResultSchema = z.enum([
  'pass',
  'fail',
  'conditional',
  'scheduled',
  'cancelled',
  'rescheduled',
]);

export const reportStatusSchema = z.enum([
  'draft',
  'submitted',
  'in_review',
  'changes_requested',
  'approved',
  'locked',
]);

export const formModeSchema = z.enum(['quick', 'detailed']);

export const scheduleStatusSchema = z.enum(['on_schedule', 'ahead', 'behind']);

export const workforceEntryTypeSchema = z.enum(['company_crew', 'individual']);

export const equipmentOwnerTypeSchema = z.enum(['owned', 'rented', 'subcontractor']);

export const photoCategorySchema = z.enum([
  'progress',
  'safety',
  'quality',
  'delivery',
  'weather',
  'issue',
  'inspection',
  'general',
]);

export const deliveryInspectionStatusSchema = z.enum([
  'pending_inspection',
  'accepted',
  'rejected',
  'partial',
]);

export const completionStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

// =============================================
// HELPER SCHEMAS
// =============================================

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
const optionalDateSchema = dateSchema.optional();
const positiveNumber = z.number().positive('Must be greater than 0');
const optionalPositiveNumber = positiveNumber.optional();
const nonNegativeNumber = z.number().min(0, 'Cannot be negative');
const optionalNonNegativeNumber = nonNegativeNumber.optional();
const percentage = z.number().min(0).max(100, 'Must be between 0 and 100');
const optionalPercentage = percentage.optional();

// =============================================
// WEATHER SCHEMA
// =============================================

export const weatherSectionSchema = z.object({
  weather_condition: z.string().min(1, 'Weather condition is required'),
  temperature_high: z.number().min(-50).max(150).optional(),
  temperature_low: z.number().min(-50).max(150).optional(),
  precipitation: optionalNonNegativeNumber,
  wind_speed: optionalNonNegativeNumber,
  wind_direction: z.string().max(20).optional(),
  humidity_percentage: z.number().min(0).max(100).optional(),
  weather_delays: z.boolean().default(false),
  weather_delay_hours: optionalNonNegativeNumber,
  weather_delay_notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.temperature_high && data.temperature_low) {
      return data.temperature_high >= data.temperature_low;
    }
    return true;
  },
  { message: 'High temperature must be greater than or equal to low temperature' }
);

// =============================================
// WORK SECTION SCHEMA
// =============================================

export const workSectionSchema = z.object({
  work_summary: z.string().min(1, 'Work summary is required').max(3000, 'Maximum 3000 characters'),
  work_completed: z.string().max(2000).optional(),
  work_planned_tomorrow: z.string().max(2000).optional(),
});

// =============================================
// WORKFORCE ENTRY SCHEMA
// =============================================

export const workforceEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  entry_type: workforceEntryTypeSchema,
  subcontractor_id: z.string().uuid().optional(),

  // Company crew fields
  company_name: z.string().max(255).optional(),
  team_name: z.string().max(255).optional(),
  foreman_name: z.string().max(255).optional(),
  worker_count: z.number().int().positive().optional(),
  apprentice_count: z.number().int().min(0).optional(),

  // Individual fields
  worker_name: z.string().max(255).optional(),
  worker_id: z.string().max(100).optional(),

  // Common fields
  trade: z.string().max(100).optional(),
  activity: z.string().max(500).optional(),

  // Location/Cost
  work_area: z.string().max(255).optional(),
  cost_code: z.string().max(50).optional(),
  phase_code: z.string().max(50).optional(),

  // Time
  start_time: timeSchema,
  end_time: timeSchema,
  hours_worked: optionalNonNegativeNumber,
  hours_regular: optionalNonNegativeNumber,
  hours_overtime: optionalNonNegativeNumber,
  hours_double_time: optionalNonNegativeNumber,
  break_duration_minutes: z.number().int().min(0).max(480).optional(),

  // Progress
  work_completed_percentage: optionalPercentage,
}).refine(
  (data) => {
    if (data.entry_type === 'company_crew') {
      return data.company_name || data.team_name;
    }
    if (data.entry_type === 'individual') {
      return !!data.worker_name;
    }
    return true;
  },
  { message: 'Company crews require company or team name. Individuals require worker name.' }
);

// =============================================
// EQUIPMENT ENTRY SCHEMA
// =============================================

export const equipmentEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  equipment_type: z.string().min(1, 'Equipment type is required').max(100),
  equipment_id: z.string().max(100).optional(),
  equipment_description: z.string().max(500).optional(),
  quantity: z.number().int().positive().default(1),
  owner_type: equipmentOwnerTypeSchema.default('owned'),
  owner: z.string().max(255).optional(),
  rental_company: z.string().max(255).optional(),

  // Usage
  hours_used: optionalNonNegativeNumber,
  hours_idle: optionalNonNegativeNumber,
  hours_breakdown: optionalNonNegativeNumber,
  fuel_used: optionalNonNegativeNumber,

  // Location/Cost
  work_area: z.string().max(255).optional(),
  cost_code: z.string().max(50).optional(),
  operator_name: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

// =============================================
// DELAY ENTRY SCHEMA (Critical)
// =============================================

export const delayEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  delay_type: delayTypeSchema,
  delay_category: delayCategorySchema.optional(),
  description: z.string().min(1, 'Delay description is required').max(2000),
  start_time: timeSchema,
  end_time: timeSchema,
  duration_hours: optionalNonNegativeNumber,
  duration_days: optionalNonNegativeNumber,
  affected_areas: z.array(z.string()).optional(),
  affected_trades: z.array(z.string()).optional(),
  affected_activities: z.string().max(1000).optional(),
  schedule_impact_days: z.number().int().optional(),
  cost_impact_estimate: optionalNonNegativeNumber,
  responsible_party: z.string().max(255).optional(),
  responsible_company: z.string().max(255).optional(),
  notified_parties: z.array(z.string()).optional(),
  notification_method: z.string().max(100).optional(),
  notification_date: optionalDateSchema,
  rfi_id: z.string().uuid().optional(),
  change_order_id: z.string().uuid().optional(),
  supporting_photo_ids: z.array(z.string().uuid()).optional(),
});

// =============================================
// SAFETY INCIDENT SCHEMA
// =============================================

export const safetyIncidentSchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  incident_type: incidentTypeSchema,
  incident_category: z.string().max(100).optional(),
  osha_reportable: z.boolean().default(false),
  osha_case_number: z.string().max(50).optional(),
  incident_time: timeSchema,
  incident_location: z.string().max(255).optional(),
  description: z.string().min(1, 'Incident description is required').max(3000),
  immediate_cause: z.string().max(1000).optional(),
  root_cause: z.string().max(1000).optional(),

  // Injured party
  injured_party_name: z.string().max(255).optional(),
  injured_party_company: z.string().max(255).optional(),
  injured_party_trade: z.string().max(100).optional(),
  injury_type: z.string().max(255).optional(),
  body_part_affected: z.string().max(255).optional(),
  treatment_provided: z.string().max(1000).optional(),
  medical_facility: z.string().max(255).optional(),
  returned_to_work: z.boolean().optional(),
  return_date: optionalDateSchema,

  // Corrective actions
  immediate_actions: z.string().max(2000).optional(),
  corrective_actions: z.string().max(2000).optional(),
  preventive_measures: z.string().max(2000).optional(),
  responsible_party: z.string().max(255).optional(),
  completion_due_date: optionalDateSchema,
  completion_status: completionStatusSchema.default('pending'),

  // Notifications
  reported_to: z.array(z.string()).optional(),
  reported_by: z.string().max(255).optional(),
  reported_at: z.string().datetime().optional(),
  client_notified: z.boolean().default(false),
  insurance_notified: z.boolean().default(false),
});

// =============================================
// INSPECTION SCHEMA
// =============================================

export const inspectionEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  inspection_type: z.string().min(1, 'Inspection type is required').max(255),
  inspection_category: inspectionCategorySchema.optional(),
  inspector_name: z.string().max(255).optional(),
  inspector_company: z.string().max(255).optional(),
  inspection_time: timeSchema,
  result: inspectionResultSchema.optional(),
  pass_with_conditions: z.string().max(1000).optional(),
  deficiencies_noted: z.string().max(2000).optional(),
  corrective_actions_required: z.string().max(2000).optional(),
  reinspection_required: z.boolean().default(false),
  reinspection_date: optionalDateSchema,
  permit_number: z.string().max(100).optional(),
  permit_type: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  supporting_photo_ids: z.array(z.string().uuid()).optional(),
});

// =============================================
// T&M WORK SCHEMA
// =============================================

export const laborEntrySchema = z.object({
  trade: z.string().min(1).max(100),
  hours: positiveNumber,
  rate: optionalPositiveNumber,
  cost: optionalNonNegativeNumber,
});

export const materialEntrySchema = z.object({
  item: z.string().min(1).max(255),
  quantity: positiveNumber,
  unit: z.string().min(1).max(50),
  unit_cost: optionalPositiveNumber,
  total: optionalNonNegativeNumber,
});

export const equipmentUsageEntrySchema = z.object({
  type: z.string().min(1).max(100),
  hours: positiveNumber,
  rate: optionalPositiveNumber,
  cost: optionalNonNegativeNumber,
});

export const tmWorkEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  work_order_number: z.string().max(100).optional(),
  change_order_id: z.string().uuid().optional(),
  description: z.string().min(1, 'T&M work description is required').max(2000),
  labor_entries: z.array(laborEntrySchema).default([]),
  total_labor_hours: optionalNonNegativeNumber,
  total_labor_cost: optionalNonNegativeNumber,
  materials_used: z.array(materialEntrySchema).default([]),
  total_materials_cost: optionalNonNegativeNumber,
  equipment_used: z.array(equipmentUsageEntrySchema).default([]),
  total_equipment_cost: optionalNonNegativeNumber,
  total_cost: optionalNonNegativeNumber,
  authorized_by: z.string().max(255).optional(),
  authorization_signature: z.string().optional(),
  authorization_date: optionalDateSchema,
});

// =============================================
// PROGRESS ENTRY SCHEMA
// =============================================

export const progressEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  activity_id: z.string().max(100).optional(),
  activity_name: z.string().min(1, 'Activity name is required').max(255),
  cost_code: z.string().max(50).optional(),
  work_area: z.string().max(255).optional(),
  planned_start_date: optionalDateSchema,
  planned_end_date: optionalDateSchema,
  actual_start_date: optionalDateSchema,
  actual_end_date: optionalDateSchema,
  planned_percentage_today: optionalPercentage,
  actual_percentage_today: optionalPercentage,
  cumulative_percentage: optionalPercentage,
  variance_percentage: z.number().optional(),
  unit_of_measure: z.string().max(20).optional(),
  planned_quantity_today: optionalNonNegativeNumber,
  actual_quantity_today: optionalNonNegativeNumber,
  cumulative_quantity: optionalNonNegativeNumber,
  total_planned_quantity: optionalNonNegativeNumber,
  variance_reason: z.string().max(1000).optional(),
  corrective_action: z.string().max(1000).optional(),
});

// =============================================
// DELIVERY ENTRY SCHEMA
// =============================================

export const deliveryEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  material_description: z.string().min(1, 'Material description is required').max(500),
  quantity: z.string().max(100).optional(),
  vendor: z.string().max(255).optional(),
  delivery_ticket_number: z.string().max(100).optional(),
  delivery_time: timeSchema,
  po_number: z.string().max(100).optional(),
  receiving_employee: z.string().max(255).optional(),
  inspection_status: deliveryInspectionStatusSchema.default('pending_inspection'),
  rejection_reason: z.string().max(500).optional(),
  storage_location: z.string().max(255).optional(),
  cost_code: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

// =============================================
// VISITOR ENTRY SCHEMA
// =============================================

export const visitorEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  visitor_name: z.string().min(1, 'Visitor name is required').max(255),
  company: z.string().max(255).optional(),
  purpose: z.string().max(500).optional(),
  badge_number: z.string().max(50).optional(),
  arrival_time: timeSchema,
  departure_time: timeSchema,
  safety_orientation_completed: z.boolean().default(false),
  escort_required: z.boolean().default(false),
  escort_name: z.string().max(255).optional(),
  areas_accessed: z.array(z.string()).optional(),
  photos_taken: z.boolean().default(false),
  nda_signed: z.boolean().default(false),
});

// =============================================
// PHOTO ENTRY SCHEMA
// =============================================

export const photoEntrySchema = z.object({
  id: z.string().uuid(),
  daily_report_id: z.string().uuid().optional(),
  file_url: z.string().url('Invalid file URL'),
  thumbnail_url: z.string().url().optional(),
  file_size: z.number().int().positive().optional(),
  caption: z.string().max(500).optional(),
  category: photoCategorySchema.default('general'),
  work_area: z.string().max(255).optional(),
  cost_code: z.string().max(50).optional(),
  gps_latitude: z.number().min(-90).max(90).optional(),
  gps_longitude: z.number().min(-180).max(180).optional(),
  compass_heading: z.number().min(0).max(360).optional(),
  taken_at: z.string().datetime().optional(),
  taken_by: z.string().max(255).optional(),
  linked_to_type: z.string().max(50).optional(),
  linked_to_id: z.string().uuid().optional(),
  upload_status: z.enum(['pending', 'uploading', 'uploaded', 'failed']).default('pending'),
});

// =============================================
// COMPLETE FORM SCHEMA (QUICK MODE)
// =============================================

export const quickModeFormSchema = z.object({
  project_id: z.string().uuid(),
  report_date: dateSchema,
  mode: z.literal('quick'),

  // Shift
  shift_start_time: timeSchema,
  shift_end_time: timeSchema,
  shift_type: shiftTypeSchema.default('regular'),

  // Weather
  weather: weatherSectionSchema,

  // Work
  work: workSectionSchema,

  // Collections
  workforce: z.array(workforceEntrySchema).default([]),
  equipment: z.array(equipmentEntrySchema).default([]),
  delays: z.array(delayEntrySchema).default([]),
  deliveries: z.array(deliveryEntrySchema).default([]),
  visitors: z.array(visitorEntrySchema).default([]),
  photos: z.array(photoEntrySchema).default([]),
});

// =============================================
// COMPLETE FORM SCHEMA (DETAILED MODE)
// =============================================

export const detailedModeFormSchema = quickModeFormSchema.extend({
  mode: z.literal('detailed'),

  // Progress
  progress: z.object({
    overall_progress_percentage: optionalPercentage,
    schedule_status: scheduleStatusSchema.optional(),
  }).optional(),

  // Additional collections
  safety_incidents: z.array(safetyIncidentSchema).default([]),
  inspections: z.array(inspectionEntrySchema).default([]),
  tm_work: z.array(tmWorkEntrySchema).default([]),
  progress_entries: z.array(progressEntrySchema).default([]),
});

// =============================================
// SUBMIT SCHEMA
// =============================================

export const submitReportSchema = z.object({
  report_id: z.string().uuid(),
  submitted_by_signature: z.string().min(1, 'Signature is required'),
  submitted_by_name: z.string().min(1, 'Name is required').max(255),
});

export const approveReportSchema = z.object({
  report_id: z.string().uuid(),
  approved_by_signature: z.string().min(1, 'Signature is required'),
  approved_by_name: z.string().min(1, 'Name is required').max(255),
  approval_comments: z.string().max(2000).optional(),
});

export const requestChangesSchema = z.object({
  report_id: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required').max(2000),
});

// =============================================
// TYPE EXPORTS
// =============================================

export type QuickModeFormData = z.infer<typeof quickModeFormSchema>;
export type DetailedModeFormData = z.infer<typeof detailedModeFormSchema>;
export type WorkforceEntryData = z.infer<typeof workforceEntrySchema>;
export type EquipmentEntryData = z.infer<typeof equipmentEntrySchema>;
export type DelayEntryData = z.infer<typeof delayEntrySchema>;
export type SafetyIncidentData = z.infer<typeof safetyIncidentSchema>;
export type InspectionEntryData = z.infer<typeof inspectionEntrySchema>;
export type TMWorkEntryData = z.infer<typeof tmWorkEntrySchema>;
export type ProgressEntryData = z.infer<typeof progressEntrySchema>;
export type DeliveryEntryData = z.infer<typeof deliveryEntrySchema>;
export type VisitorEntryData = z.infer<typeof visitorEntrySchema>;
export type PhotoEntryData = z.infer<typeof photoEntrySchema>;
export type WeatherSectionData = z.infer<typeof weatherSectionSchema>;
export type WorkSectionData = z.infer<typeof workSectionSchema>;
