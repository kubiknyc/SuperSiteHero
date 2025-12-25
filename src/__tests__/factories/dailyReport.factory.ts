/**
 * Daily Report Factory
 * Creates mock daily report data for testing
 */

import { faker } from '@faker-js/faker';
import type {
  ReportStatus,
  ShiftType,
  FormMode,
  ScheduleStatus,
  DelayType,
  DelayCategory,
  IncidentType,
  InspectionResult,
  PhotoCategory,
  DeliveryInspectionStatus,
  WorkforceEntryType,
  EquipmentOwnerType,
  CompletionStatus,
} from '@/types/daily-reports-v2';

// Daily Report interface
export interface MockDailyReport {
  id: string;
  project_id: string;
  report_date: string;
  report_number?: string;
  reporter_id: string;
  reviewer_id?: string;

  // Shift/Time tracking
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type: ShiftType;
  total_hours?: number;

  // Weather
  weather_condition?: string;
  temperature_high?: number;
  temperature_low?: number;
  precipitation?: number;
  wind_speed?: number;
  humidity_percentage?: number;
  weather_delays?: boolean;
  weather_delay_hours?: number;
  weather_delay_notes?: string;

  // Work narrative
  work_summary?: string;
  work_completed?: string;
  work_planned_tomorrow?: string;

  // Progress tracking
  overall_progress_percentage?: number;
  schedule_status?: ScheduleStatus;
  schedule_variance_days?: number;

  // Status
  status: ReportStatus;
  mode: FormMode;

  // Signatures
  submitted_by_signature?: string;
  submitted_by_name?: string;
  submitted_at?: string;
  approved_by_signature?: string;
  approved_by_name?: string;
  approved_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  company_id: string;

  // Aggregated counts
  total_workers?: number;
}

// Workforce entry interface
export interface MockWorkforceEntry {
  id: string;
  daily_report_id: string;
  entry_type: WorkforceEntryType;
  subcontractor_id?: string;
  company_name?: string;
  team_name?: string;
  foreman_name?: string;
  worker_count?: number;
  trade?: string;
  activity?: string;
  work_area?: string;
  hours_worked?: number;
  hours_regular?: number;
  hours_overtime?: number;
  created_at: string;
}

// Equipment entry interface
export interface MockEquipmentEntry {
  id: string;
  daily_report_id: string;
  equipment_type: string;
  equipment_id?: string;
  equipment_description?: string;
  quantity: number;
  owner_type: EquipmentOwnerType;
  hours_used?: number;
  hours_idle?: number;
  operator_name?: string;
  notes?: string;
  created_at: string;
}

// Delay entry interface
export interface MockDelayEntry {
  id: string;
  daily_report_id: string;
  delay_type: DelayType;
  delay_category?: DelayCategory;
  description: string;
  duration_hours?: number;
  duration_days?: number;
  affected_areas?: string[];
  affected_trades?: string[];
  schedule_impact_days?: number;
  cost_impact_estimate?: number;
  responsible_party?: string;
  created_at: string;
  updated_at: string;
}

// Safety incident interface
export interface MockSafetyIncident {
  id: string;
  daily_report_id: string;
  incident_type: IncidentType;
  incident_category?: string;
  osha_reportable: boolean;
  incident_time?: string;
  incident_location?: string;
  description: string;
  injured_party_name?: string;
  injured_party_company?: string;
  injury_type?: string;
  treatment_provided?: string;
  immediate_actions?: string;
  corrective_actions?: string;
  completion_status: CompletionStatus;
  client_notified: boolean;
  insurance_notified: boolean;
  created_at: string;
  updated_at: string;
}

// Inspection entry interface
export interface MockInspectionEntry {
  id: string;
  daily_report_id: string;
  inspection_type: string;
  inspector_name?: string;
  inspector_company?: string;
  inspection_time?: string;
  result?: InspectionResult;
  deficiencies_noted?: string;
  reinspection_required: boolean;
  reinspection_date?: string;
  permit_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Photo entry interface
export interface MockPhotoEntry {
  id: string;
  daily_report_id: string;
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  category: PhotoCategory;
  work_area?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  taken_at?: string;
  taken_by?: string;
  upload_status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  created_at: string;
}

// Delivery entry interface
export interface MockDeliveryEntry {
  id: string;
  daily_report_id: string;
  material_description: string;
  quantity?: string;
  vendor?: string;
  delivery_ticket_number?: string;
  delivery_time?: string;
  po_number?: string;
  receiving_employee?: string;
  inspection_status: DeliveryInspectionStatus;
  storage_location?: string;
  notes?: string;
  created_at: string;
}

// Factory options
export interface DailyReportFactoryOptions {
  id?: string;
  project_id?: string;
  report_date?: string;
  reporter_id?: string;
  status?: ReportStatus;
  mode?: FormMode;
  shift_type?: ShiftType;
  weather_condition?: string;
  company_id?: string;
  overall_progress_percentage?: number;
  schedule_status?: ScheduleStatus;
}

export interface WorkforceEntryFactoryOptions {
  id?: string;
  daily_report_id?: string;
  entry_type?: WorkforceEntryType;
  trade?: string;
  worker_count?: number;
  hours_worked?: number;
}

export interface DelayEntryFactoryOptions {
  id?: string;
  daily_report_id?: string;
  delay_type?: DelayType;
  delay_category?: DelayCategory;
  description?: string;
  duration_hours?: number;
}

export interface SafetyIncidentFactoryOptions {
  id?: string;
  daily_report_id?: string;
  incident_type?: IncidentType;
  osha_reportable?: boolean;
  description?: string;
}

// Weather conditions
const WEATHER_CONDITIONS = [
  'sunny',
  'partly_cloudy',
  'cloudy',
  'overcast',
  'rain',
  'heavy_rain',
  'thunderstorm',
  'snow',
  'sleet',
  'fog',
  'windy',
  'hot',
  'cold',
];

// Trades list
const TRADES = [
  'General Labor',
  'Carpentry',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Steel',
  'Masonry',
  'Roofing',
  'Drywall',
  'Painting',
  'Flooring',
  'Glazing',
  'Insulation',
  'Fire Protection',
  'Elevator',
];

// Equipment types
const EQUIPMENT_TYPES = [
  'Excavator',
  'Crane',
  'Forklift',
  'Boom Lift',
  'Scissor Lift',
  'Bulldozer',
  'Backhoe',
  'Skid Steer',
  'Dump Truck',
  'Concrete Pump',
  'Generator',
  'Compressor',
  'Welder',
  'Scaffold',
];

/**
 * Create a mock daily report
 */
export function createMockDailyReport(options: DailyReportFactoryOptions = {}): MockDailyReport {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.recent({ days: 30 }).toISOString();
  const reportDate = options.report_date ?? faker.date.recent({ days: 30 }).toISOString().split('T')[0];

  return {
    id,
    project_id: options.project_id ?? faker.string.uuid(),
    report_date: reportDate,
    report_number: `DR-${faker.string.numeric(6)}`,
    reporter_id: options.reporter_id ?? faker.string.uuid(),
    reviewer_id: faker.datatype.boolean() ? faker.string.uuid() : undefined,

    // Shift/Time
    shift_start_time: '07:00',
    shift_end_time: '16:00',
    shift_type: options.shift_type ?? faker.helpers.arrayElement(['regular', 'overtime', 'double_time', 'weekend'] as ShiftType[]),
    total_hours: faker.number.float({ min: 6, max: 12, fractionDigits: 1 }),

    // Weather
    weather_condition: options.weather_condition ?? faker.helpers.arrayElement(WEATHER_CONDITIONS),
    temperature_high: faker.number.int({ min: 50, max: 100 }),
    temperature_low: faker.number.int({ min: 30, max: 70 }),
    precipitation: faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
    wind_speed: faker.number.int({ min: 0, max: 30 }),
    humidity_percentage: faker.number.int({ min: 20, max: 90 }),
    weather_delays: faker.datatype.boolean({ probability: 0.1 }),
    weather_delay_hours: faker.datatype.boolean({ probability: 0.1 }) ? faker.number.int({ min: 1, max: 4 }) : undefined,
    weather_delay_notes: faker.datatype.boolean({ probability: 0.1 }) ? faker.lorem.sentence() : undefined,

    // Work narrative
    work_summary: faker.lorem.paragraphs(2),
    work_completed: faker.lorem.paragraph(),
    work_planned_tomorrow: faker.lorem.paragraph(),

    // Progress
    overall_progress_percentage: options.overall_progress_percentage ?? faker.number.int({ min: 0, max: 100 }),
    schedule_status: options.schedule_status ?? faker.helpers.arrayElement(['on_schedule', 'ahead', 'behind'] as ScheduleStatus[]),
    schedule_variance_days: faker.number.int({ min: -10, max: 10 }),

    // Status
    status: options.status ?? faker.helpers.arrayElement(['draft', 'submitted', 'in_review', 'approved', 'locked'] as ReportStatus[]),
    mode: options.mode ?? faker.helpers.arrayElement(['quick', 'detailed'] as FormMode[]),

    // Signatures
    submitted_by_signature: undefined,
    submitted_by_name: undefined,
    submitted_at: undefined,
    approved_by_signature: undefined,
    approved_by_name: undefined,
    approved_at: undefined,

    // Metadata
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    company_id: options.company_id ?? faker.string.uuid(),

    // Aggregated counts
    total_workers: faker.number.int({ min: 5, max: 100 }),
  };
}

/**
 * Create a mock workforce entry
 */
export function createMockWorkforceEntry(options: WorkforceEntryFactoryOptions = {}): MockWorkforceEntry {
  const entryType = options.entry_type ?? faker.helpers.arrayElement(['company_crew', 'individual'] as WorkforceEntryType[]);

  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    entry_type: entryType,
    subcontractor_id: entryType === 'company_crew' ? faker.string.uuid() : undefined,
    company_name: entryType === 'company_crew' ? faker.company.name() : undefined,
    team_name: entryType === 'company_crew' ? `${faker.helpers.arrayElement(TRADES)} Crew` : undefined,
    foreman_name: entryType === 'company_crew' ? faker.person.fullName() : undefined,
    worker_count: options.worker_count ?? faker.number.int({ min: 1, max: 20 }),
    trade: options.trade ?? faker.helpers.arrayElement(TRADES),
    activity: faker.lorem.sentence(),
    work_area: faker.helpers.arrayElement(['Level 1', 'Level 2', 'Level 3', 'Exterior', 'Basement', 'Roof']),
    hours_worked: options.hours_worked ?? faker.number.float({ min: 4, max: 12, fractionDigits: 1 }),
    hours_regular: faker.number.float({ min: 4, max: 8, fractionDigits: 1 }),
    hours_overtime: faker.number.float({ min: 0, max: 4, fractionDigits: 1 }),
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a mock equipment entry
 */
export function createMockEquipmentEntry(options: { id?: string; daily_report_id?: string; equipment_type?: string } = {}): MockEquipmentEntry {
  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    equipment_type: options.equipment_type ?? faker.helpers.arrayElement(EQUIPMENT_TYPES),
    equipment_id: `EQ-${faker.string.numeric(4)}`,
    equipment_description: faker.lorem.sentence(),
    quantity: faker.number.int({ min: 1, max: 5 }),
    owner_type: faker.helpers.arrayElement(['owned', 'rented', 'subcontractor'] as EquipmentOwnerType[]),
    hours_used: faker.number.float({ min: 2, max: 10, fractionDigits: 1 }),
    hours_idle: faker.number.float({ min: 0, max: 2, fractionDigits: 1 }),
    operator_name: faker.person.fullName(),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a mock delay entry
 */
export function createMockDelayEntry(options: DelayEntryFactoryOptions = {}): MockDelayEntry {
  const createdAt = faker.date.recent().toISOString();

  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    delay_type: options.delay_type ?? faker.helpers.arrayElement([
      'owner', 'contractor', 'subcontractor', 'weather', 'material',
      'inspection', 'permit', 'design', 'unforeseen', 'labor', 'equipment', 'other'
    ] as DelayType[]),
    delay_category: options.delay_category ?? faker.helpers.arrayElement([
      'excusable_compensable', 'excusable_non_compensable', 'non_excusable'
    ] as DelayCategory[]),
    description: options.description ?? faker.lorem.paragraph(),
    duration_hours: options.duration_hours ?? faker.number.float({ min: 0.5, max: 8, fractionDigits: 1 }),
    duration_days: faker.number.float({ min: 0, max: 3, fractionDigits: 1 }),
    affected_areas: [faker.helpers.arrayElement(['Level 1', 'Level 2', 'Exterior'])],
    affected_trades: [faker.helpers.arrayElement(TRADES)],
    schedule_impact_days: faker.number.int({ min: 0, max: 5 }),
    cost_impact_estimate: faker.number.int({ min: 0, max: 50000 }),
    responsible_party: faker.company.name(),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * Create a mock safety incident
 */
export function createMockSafetyIncident(options: SafetyIncidentFactoryOptions = {}): MockSafetyIncident {
  const createdAt = faker.date.recent().toISOString();
  const incidentType = options.incident_type ?? faker.helpers.arrayElement([
    'near_miss', 'first_aid', 'recordable', 'lost_time'
  ] as IncidentType[]);

  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    incident_type: incidentType,
    incident_category: faker.helpers.arrayElement([
      'fall', 'struck_by', 'caught_in', 'electrical', 'heat_stress', 'chemical', 'ergonomic', 'vehicle', 'other'
    ]),
    osha_reportable: options.osha_reportable ?? (incidentType !== 'near_miss' && incidentType !== 'first_aid'),
    incident_time: faker.date.recent().toISOString(),
    incident_location: faker.helpers.arrayElement(['Level 1', 'Level 2', 'Exterior', 'Basement', 'Roof']),
    description: options.description ?? faker.lorem.paragraph(),
    injured_party_name: incidentType !== 'near_miss' ? faker.person.fullName() : undefined,
    injured_party_company: incidentType !== 'near_miss' ? faker.company.name() : undefined,
    injury_type: incidentType !== 'near_miss' ? faker.helpers.arrayElement(['Laceration', 'Contusion', 'Sprain', 'Fracture', 'Burn']) : undefined,
    treatment_provided: incidentType !== 'near_miss' ? faker.lorem.sentence() : undefined,
    immediate_actions: faker.lorem.sentence(),
    corrective_actions: faker.lorem.sentence(),
    completion_status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed'] as CompletionStatus[]),
    client_notified: incidentType !== 'near_miss',
    insurance_notified: incidentType === 'recordable' || incidentType === 'lost_time',
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * Create a mock inspection entry
 */
export function createMockInspectionEntry(options: { id?: string; daily_report_id?: string; result?: InspectionResult } = {}): MockInspectionEntry {
  const createdAt = faker.date.recent().toISOString();

  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    inspection_type: faker.helpers.arrayElement([
      'Structural', 'Electrical', 'Plumbing', 'HVAC', 'Fire', 'Framing', 'Foundation', 'Final'
    ]),
    inspector_name: faker.person.fullName(),
    inspector_company: faker.company.name(),
    inspection_time: faker.date.recent().toISOString(),
    result: options.result ?? faker.helpers.arrayElement(['pass', 'fail', 'conditional', 'scheduled'] as InspectionResult[]),
    deficiencies_noted: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    reinspection_required: faker.datatype.boolean({ probability: 0.2 }),
    reinspection_date: faker.datatype.boolean({ probability: 0.2 }) ? faker.date.soon().toISOString().split('T')[0] : undefined,
    permit_number: `P-${faker.string.numeric(6)}`,
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * Create a mock photo entry
 */
export function createMockPhotoEntry(options: { id?: string; daily_report_id?: string; category?: PhotoCategory } = {}): MockPhotoEntry {
  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    file_url: faker.image.url(),
    thumbnail_url: faker.image.url(),
    caption: faker.lorem.sentence(),
    category: options.category ?? faker.helpers.arrayElement([
      'progress', 'safety', 'quality', 'delivery', 'weather', 'issue', 'inspection', 'general'
    ] as PhotoCategory[]),
    work_area: faker.helpers.arrayElement(['Level 1', 'Level 2', 'Level 3', 'Exterior', 'Basement', 'Roof']),
    gps_latitude: faker.location.latitude(),
    gps_longitude: faker.location.longitude(),
    taken_at: faker.date.recent().toISOString(),
    taken_by: faker.person.fullName(),
    upload_status: 'uploaded',
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a mock delivery entry
 */
export function createMockDeliveryEntry(options: { id?: string; daily_report_id?: string } = {}): MockDeliveryEntry {
  return {
    id: options.id ?? faker.string.uuid(),
    daily_report_id: options.daily_report_id ?? faker.string.uuid(),
    material_description: faker.commerce.productName(),
    quantity: `${faker.number.int({ min: 1, max: 100 })} ${faker.helpers.arrayElement(['units', 'tons', 'cubic yards', 'linear feet', 'pallets'])}`,
    vendor: faker.company.name(),
    delivery_ticket_number: `DT-${faker.string.numeric(6)}`,
    delivery_time: faker.date.recent().toISOString(),
    po_number: `PO-${faker.string.numeric(6)}`,
    receiving_employee: faker.person.fullName(),
    inspection_status: faker.helpers.arrayElement([
      'pending_inspection', 'accepted', 'rejected', 'partial'
    ] as DeliveryInspectionStatus[]),
    storage_location: faker.helpers.arrayElement(['Laydown Area A', 'Laydown Area B', 'Warehouse', 'Site Storage']),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a draft daily report
 */
export function createMockDraftReport(options: Omit<DailyReportFactoryOptions, 'status'> = {}): MockDailyReport {
  return createMockDailyReport({ ...options, status: 'draft' });
}

/**
 * Create a submitted daily report
 */
export function createMockSubmittedReport(options: Omit<DailyReportFactoryOptions, 'status'> = {}): MockDailyReport {
  const report = createMockDailyReport({ ...options, status: 'submitted' });
  return {
    ...report,
    submitted_by_signature: faker.string.alphanumeric(100),
    submitted_by_name: faker.person.fullName(),
    submitted_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create an approved daily report
 */
export function createMockApprovedReport(options: Omit<DailyReportFactoryOptions, 'status'> = {}): MockDailyReport {
  const report = createMockSubmittedReport({ ...options });
  return {
    ...report,
    status: 'approved',
    approved_by_signature: faker.string.alphanumeric(100),
    approved_by_name: faker.person.fullName(),
    approved_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create multiple mock daily reports
 */
export function createMockDailyReports(count: number, options: DailyReportFactoryOptions = {}): MockDailyReport[] {
  return Array.from({ length: count }, () => createMockDailyReport(options));
}

/**
 * Create a complete daily report with all related entries
 */
export function createMockDailyReportWithEntries(options: DailyReportFactoryOptions = {}): {
  report: MockDailyReport;
  workforce: MockWorkforceEntry[];
  equipment: MockEquipmentEntry[];
  delays: MockDelayEntry[];
  incidents: MockSafetyIncident[];
  inspections: MockInspectionEntry[];
  photos: MockPhotoEntry[];
  deliveries: MockDeliveryEntry[];
} {
  const report = createMockDailyReport(options);

  return {
    report,
    workforce: Array.from({ length: faker.number.int({ min: 2, max: 8 }) }, () =>
      createMockWorkforceEntry({ daily_report_id: report.id })
    ),
    equipment: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      createMockEquipmentEntry({ daily_report_id: report.id })
    ),
    delays: faker.datatype.boolean({ probability: 0.3 })
      ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
          createMockDelayEntry({ daily_report_id: report.id })
        )
      : [],
    incidents: faker.datatype.boolean({ probability: 0.1 })
      ? [createMockSafetyIncident({ daily_report_id: report.id })]
      : [],
    inspections: faker.datatype.boolean({ probability: 0.4 })
      ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
          createMockInspectionEntry({ daily_report_id: report.id })
        )
      : [],
    photos: Array.from({ length: faker.number.int({ min: 3, max: 15 }) }, () =>
      createMockPhotoEntry({ daily_report_id: report.id })
    ),
    deliveries: faker.datatype.boolean({ probability: 0.5 })
      ? Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
          createMockDeliveryEntry({ daily_report_id: report.id })
        )
      : [],
  };
}

// Default test reports for consistent testing
export const TEST_DAILY_REPORTS = {
  draft: createMockDailyReport({
    id: 'test-report-draft',
    project_id: 'test-project-active',
    reporter_id: 'test-super-id',
    status: 'draft',
    company_id: 'test-company-id',
  }),
  submitted: createMockSubmittedReport({
    id: 'test-report-submitted',
    project_id: 'test-project-active',
    reporter_id: 'test-super-id',
    company_id: 'test-company-id',
  }),
  approved: createMockApprovedReport({
    id: 'test-report-approved',
    project_id: 'test-project-active',
    reporter_id: 'test-super-id',
    company_id: 'test-company-id',
  }),
};
