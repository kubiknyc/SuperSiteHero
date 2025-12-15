/**
 * Daily Report V2 Zustand Store
 * Comprehensive state management for enhanced daily report system
 * Features: Quick Mode, Detailed Mode, Offline support, Auto-save
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  DailyReportV2,
  FormMode,
  ShiftType,
  ReportStatus,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DelayEntry,
  SafetyIncident,
  InspectionEntry,
  TMWorkEntry,
  ProgressEntry,
  DeliveryEntryV2,
  VisitorEntryV2,
  PhotoEntryV2,
  WeatherApiResponse,
} from '@/types/daily-reports-v2';

// =============================================
// TYPES
// =============================================

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export interface SyncQueueItem {
  id: string;
  reportId: string;
  action: 'create' | 'update';
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface ConflictInfo {
  reportId: string;
  localUpdatedAt: number;
  serverUpdatedAt: string;
  serverData: Partial<DailyReportV2>;
}

export interface DraftReportV2 {
  id: string;
  project_id: string;
  report_date: string;
  mode: FormMode;

  // Shift
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type: ShiftType;

  // Weather
  weather_condition?: string;
  temperature_high?: number;
  temperature_low?: number;
  precipitation?: number;
  wind_speed?: number;
  wind_direction?: string;
  humidity_percentage?: number;
  weather_source?: 'api' | 'manual';
  weather_fetched_at?: string;
  weather_delays?: boolean;
  weather_delay_hours?: number;
  weather_delay_notes?: string;

  // Work
  work_summary?: string;
  work_completed?: string;
  work_planned_tomorrow?: string;

  // Progress
  overall_progress_percentage?: number;
  schedule_status?: 'on_schedule' | 'ahead' | 'behind';

  // Status
  status: ReportStatus;

  // Signatures
  submitted_by_signature?: string;
  submitted_by_name?: string;

  // Last saved
  _lastSavedAt?: number;
  _isDirty?: boolean;
}

interface DailyReportStoreV2State {
  // Current draft
  draftReport: DraftReportV2 | null;

  // Collections
  workforce: WorkforceEntryV2[];
  equipment: EquipmentEntryV2[];
  delays: DelayEntry[];
  safetyIncidents: SafetyIncident[];
  inspections: InspectionEntry[];
  tmWork: TMWorkEntry[];
  progress: ProgressEntry[];
  deliveries: DeliveryEntryV2[];
  visitors: VisitorEntryV2[];
  photos: PhotoEntryV2[];

  // Sync state
  syncStatus: SyncStatus;
  syncError: string | null;
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  conflict: ConflictInfo | null;

  // UI state
  expandedSections: Record<string, boolean>;
  activeSection: string | null;
}

interface DailyReportStoreV2Actions {
  // Draft management
  initializeDraft: (projectId: string, reportDate: string, mode?: FormMode) => void;
  initializeFromExisting: (report: DailyReportV2 & {
    workforce?: WorkforceEntryV2[];
    equipment?: EquipmentEntryV2[];
    delays?: DelayEntry[];
    safety_incidents?: SafetyIncident[];
    inspections?: InspectionEntry[];
    tm_work?: TMWorkEntry[];
    progress?: ProgressEntry[];
    deliveries?: DeliveryEntryV2[];
    visitors?: VisitorEntryV2[];
    photos?: PhotoEntryV2[];
  }) => void;
  updateDraft: (updates: Partial<DraftReportV2>) => void;
  setMode: (mode: FormMode) => void;
  applyWeather: (weather: WeatherApiResponse) => void;

  // Workforce
  addWorkforceEntry: (entry?: Partial<WorkforceEntryV2>) => string;
  updateWorkforceEntry: (id: string, updates: Partial<WorkforceEntryV2>) => void;
  removeWorkforceEntry: (id: string) => void;

  // Equipment
  addEquipmentEntry: (entry?: Partial<EquipmentEntryV2>) => string;
  updateEquipmentEntry: (id: string, updates: Partial<EquipmentEntryV2>) => void;
  removeEquipmentEntry: (id: string) => void;

  // Delays
  addDelayEntry: (entry?: Partial<DelayEntry>) => string;
  updateDelayEntry: (id: string, updates: Partial<DelayEntry>) => void;
  removeDelayEntry: (id: string) => void;

  // Safety Incidents
  addSafetyIncident: (entry?: Partial<SafetyIncident>) => string;
  updateSafetyIncident: (id: string, updates: Partial<SafetyIncident>) => void;
  removeSafetyIncident: (id: string) => void;

  // Inspections
  addInspection: (entry?: Partial<InspectionEntry>) => string;
  updateInspection: (id: string, updates: Partial<InspectionEntry>) => void;
  removeInspection: (id: string) => void;

  // T&M Work
  addTMWork: (entry?: Partial<TMWorkEntry>) => string;
  updateTMWork: (id: string, updates: Partial<TMWorkEntry>) => void;
  removeTMWork: (id: string) => void;

  // Progress
  addProgressEntry: (entry?: Partial<ProgressEntry>) => string;
  updateProgressEntry: (id: string, updates: Partial<ProgressEntry>) => void;
  removeProgressEntry: (id: string) => void;

  // Deliveries
  addDeliveryEntry: (entry?: Partial<DeliveryEntryV2>) => string;
  updateDeliveryEntry: (id: string, updates: Partial<DeliveryEntryV2>) => void;
  removeDeliveryEntry: (id: string) => void;

  // Visitors
  addVisitorEntry: (entry?: Partial<VisitorEntryV2>) => string;
  updateVisitorEntry: (id: string, updates: Partial<VisitorEntryV2>) => void;
  removeVisitorEntry: (id: string) => void;

  // Photos
  addPhoto: (photo: PhotoEntryV2) => void;
  updatePhoto: (id: string, updates: Partial<PhotoEntryV2>) => void;
  removePhoto: (id: string) => void;

  // Copy from previous day
  applyPreviousDayData: (data: {
    workforce?: WorkforceEntryV2[];
    equipment?: EquipmentEntryV2[];
  }) => void;

  // Template
  applyTemplate: (template: {
    workforce?: Partial<WorkforceEntryV2>[];
    equipment?: Partial<EquipmentEntryV2>[];
  }) => void;

  // Sync
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  addToSyncQueue: (item: Omit<SyncQueueItem, 'timestamp' | 'retries'>) => void;
  removeFromSyncQueue: (id: string) => void;
  setConflict: (conflict: ConflictInfo | null) => void;
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void;

  // UI
  toggleSection: (sectionId: string) => void;
  setActiveSection: (sectionId: string | null) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;

  // Reset
  clearDraft: () => void;

  // Computed
  getTotalWorkers: () => number;
  getFormData: () => DraftReportV2 & {
    workforce: WorkforceEntryV2[];
    equipment: EquipmentEntryV2[];
    delays: DelayEntry[];
    safetyIncidents: SafetyIncident[];
    inspections: InspectionEntry[];
    tmWork: TMWorkEntry[];
    progress: ProgressEntry[];
    deliveries: DeliveryEntryV2[];
    visitors: VisitorEntryV2[];
    photos: PhotoEntryV2[];
  } | null;
}

type DailyReportStoreV2 = DailyReportStoreV2State & DailyReportStoreV2Actions;

// =============================================
// HELPERS
// =============================================

const generateId = () => crypto.randomUUID();

const getDefaultShiftTimes = () => ({
  shift_start_time: '07:00',
  shift_end_time: '15:30',
});

const calculateTotalWorkers = (workforce: WorkforceEntryV2[]): number => {
  return workforce.reduce((total, entry) => {
    if (entry.entry_type === 'company_crew' && entry.worker_count) {
      return total + entry.worker_count + (entry.apprentice_count || 0);
    } else if (entry.entry_type === 'individual') {
      return total + 1;
    }
    return total;
  }, 0);
};

const defaultExpandedSections: Record<string, boolean> = {
  weather: true,
  work: true,
  workforce: true,
  equipment: false,
  delays: false,
  safety: false,
  inspections: false,
  tmWork: false,
  progress: false,
  deliveries: false,
  visitors: false,
  photos: false,
};

// =============================================
// STORE
// =============================================

export const useDailyReportStoreV2 = create<DailyReportStoreV2>()(
  persist(
    (set, get) => ({
      // Initial state
      draftReport: null,
      workforce: [],
      equipment: [],
      delays: [],
      safetyIncidents: [],
      inspections: [],
      tmWork: [],
      progress: [],
      deliveries: [],
      visitors: [],
      photos: [],
      syncStatus: 'idle',
      syncError: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncQueue: [],
      conflict: null,
      expandedSections: { ...defaultExpandedSections },
      activeSection: null,

      // =============================================
      // DRAFT MANAGEMENT
      // =============================================

      initializeDraft: (projectId, reportDate, mode = 'quick') => {
        const { shift_start_time, shift_end_time } = getDefaultShiftTimes();
        set({
          draftReport: {
            id: generateId(),
            project_id: projectId,
            report_date: reportDate,
            mode,
            shift_type: 'regular',
            shift_start_time,
            shift_end_time,
            status: 'draft',
            _isDirty: false,
          },
          workforce: [],
          equipment: [],
          delays: [],
          safetyIncidents: [],
          inspections: [],
          tmWork: [],
          progress: [],
          deliveries: [],
          visitors: [],
          photos: [],
          expandedSections: { ...defaultExpandedSections },
        });
      },

      initializeFromExisting: (report) => {
        set({
          draftReport: {
            id: report.id,
            project_id: report.project_id,
            report_date: report.report_date,
            mode: report.mode || 'quick',
            shift_type: report.shift_type as ShiftType || 'regular',
            shift_start_time: report.shift_start_time,
            shift_end_time: report.shift_end_time,
            weather_condition: report.weather_condition,
            temperature_high: report.temperature_high ?? undefined,
            temperature_low: report.temperature_low ?? undefined,
            precipitation: report.precipitation ?? undefined,
            wind_speed: report.wind_speed ?? undefined,
            wind_direction: report.wind_direction,
            humidity_percentage: report.humidity_percentage,
            weather_source: report.weather_source as 'api' | 'manual',
            weather_fetched_at: report.weather_fetched_at,
            weather_delays: report.weather_delays ?? undefined,
            weather_delay_hours: report.weather_delay_hours ?? undefined,
            weather_delay_notes: report.weather_delay_notes,
            work_summary: report.work_summary,
            work_completed: report.work_completed,
            work_planned_tomorrow: report.work_planned_tomorrow,
            overall_progress_percentage: report.overall_progress_percentage ?? undefined,
            schedule_status: report.schedule_status,
            status: report.status,
            _isDirty: false,
          },
          workforce: report.workforce || [],
          equipment: report.equipment || [],
          delays: report.delays || [],
          safetyIncidents: report.safety_incidents || [],
          inspections: report.inspections || [],
          tmWork: report.tm_work || [],
          progress: report.progress || [],
          deliveries: report.deliveries || [],
          visitors: report.visitors || [],
          photos: report.photos || [],
        });
      },

      updateDraft: (updates) => {
        set((state) => ({
          draftReport: state.draftReport
            ? { ...state.draftReport, ...updates, _isDirty: true }
            : null,
        }));
      },

      setMode: (mode) => {
        set((state) => ({
          draftReport: state.draftReport
            ? { ...state.draftReport, mode }
            : null,
          expandedSections: mode === 'quick'
            ? { ...defaultExpandedSections }
            : Object.keys(defaultExpandedSections).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        }));
      },

      applyWeather: (weather) => {
        set((state) => ({
          draftReport: state.draftReport
            ? {
                ...state.draftReport,
                weather_condition: weather.condition,
                temperature_high: weather.temperature_high,
                temperature_low: weather.temperature_low,
                precipitation: weather.precipitation,
                wind_speed: weather.wind_speed,
                wind_direction: weather.wind_direction,
                humidity_percentage: weather.humidity,
                weather_source: 'api',
                weather_fetched_at: weather.fetched_at,
                _isDirty: true,
              }
            : null,
        }));
      },

      // =============================================
      // WORKFORCE
      // =============================================

      addWorkforceEntry: (entry) => {
        const id = generateId();
        const newEntry: WorkforceEntryV2 = {
          id,
          daily_report_id: get().draftReport?.id || '',
          entry_type: 'company_crew',
          created_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          workforce: [...state.workforce, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateWorkforceEntry: (id, updates) => {
        set((state) => ({
          workforce: state.workforce.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeWorkforceEntry: (id) => {
        set((state) => ({
          workforce: state.workforce.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // EQUIPMENT
      // =============================================

      addEquipmentEntry: (entry) => {
        const id = generateId();
        const newEntry: EquipmentEntryV2 = {
          id,
          daily_report_id: get().draftReport?.id || '',
          equipment_type: '',
          quantity: 1,
          owner_type: 'owned',
          created_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          equipment: [...state.equipment, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateEquipmentEntry: (id, updates) => {
        set((state) => ({
          equipment: state.equipment.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeEquipmentEntry: (id) => {
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // DELAYS
      // =============================================

      addDelayEntry: (entry) => {
        const id = generateId();
        const newEntry: DelayEntry = {
          id,
          daily_report_id: get().draftReport?.id || '',
          delay_type: 'other',
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          delays: [...state.delays, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateDelayEntry: (id, updates) => {
        set((state) => ({
          delays: state.delays.map((e) => (e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeDelayEntry: (id) => {
        set((state) => ({
          delays: state.delays.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // SAFETY INCIDENTS
      // =============================================

      addSafetyIncident: (entry) => {
        const id = generateId();
        const newEntry: SafetyIncident = {
          id,
          daily_report_id: get().draftReport?.id || '',
          incident_type: 'near_miss',
          description: '',
          osha_reportable: false,
          client_notified: false,
          insurance_notified: false,
          completion_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          safetyIncidents: [...state.safetyIncidents, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateSafetyIncident: (id, updates) => {
        set((state) => ({
          safetyIncidents: state.safetyIncidents.map((e) => (e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeSafetyIncident: (id) => {
        set((state) => ({
          safetyIncidents: state.safetyIncidents.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // INSPECTIONS
      // =============================================

      addInspection: (entry) => {
        const id = generateId();
        const newEntry: InspectionEntry = {
          id,
          daily_report_id: get().draftReport?.id || '',
          inspection_type: '',
          reinspection_required: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          inspections: [...state.inspections, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateInspection: (id, updates) => {
        set((state) => ({
          inspections: state.inspections.map((e) => (e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeInspection: (id) => {
        set((state) => ({
          inspections: state.inspections.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // T&M WORK
      // =============================================

      addTMWork: (entry) => {
        const id = generateId();
        const newEntry: TMWorkEntry = {
          id,
          daily_report_id: get().draftReport?.id || '',
          description: '',
          labor_entries: [],
          materials_used: [],
          equipment_used: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          tmWork: [...state.tmWork, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateTMWork: (id, updates) => {
        set((state) => ({
          tmWork: state.tmWork.map((e) => (e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeTMWork: (id) => {
        set((state) => ({
          tmWork: state.tmWork.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // PROGRESS
      // =============================================

      addProgressEntry: (entry) => {
        const id = generateId();
        const newEntry: ProgressEntry = {
          id,
          daily_report_id: get().draftReport?.id || '',
          activity_name: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          progress: [...state.progress, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateProgressEntry: (id, updates) => {
        set((state) => ({
          progress: state.progress.map((e) => (e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeProgressEntry: (id) => {
        set((state) => ({
          progress: state.progress.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // DELIVERIES
      // =============================================

      addDeliveryEntry: (entry) => {
        const id = generateId();
        const newEntry: DeliveryEntryV2 = {
          id,
          daily_report_id: get().draftReport?.id || '',
          material_description: '',
          inspection_status: 'pending_inspection',
          created_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          deliveries: [...state.deliveries, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateDeliveryEntry: (id, updates) => {
        set((state) => ({
          deliveries: state.deliveries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeDeliveryEntry: (id) => {
        set((state) => ({
          deliveries: state.deliveries.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // VISITORS
      // =============================================

      addVisitorEntry: (entry) => {
        const id = generateId();
        const newEntry: VisitorEntryV2 = {
          id,
          daily_report_id: get().draftReport?.id || '',
          visitor_name: '',
          safety_orientation_completed: false,
          escort_required: false,
          photos_taken: false,
          nda_signed: false,
          created_at: new Date().toISOString(),
          ...entry,
        };
        set((state) => ({
          visitors: [...state.visitors, newEntry],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
        return id;
      },

      updateVisitorEntry: (id, updates) => {
        set((state) => ({
          visitors: state.visitors.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      removeVisitorEntry: (id) => {
        set((state) => ({
          visitors: state.visitors.filter((e) => e.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // PHOTOS
      // =============================================

      addPhoto: (photo) => {
        set((state) => ({
          photos: [...state.photos, photo],
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      updatePhoto: (id, updates) => {
        set((state) => ({
          photos: state.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      removePhoto: (id) => {
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
          draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
        }));
      },

      // =============================================
      // COPY & TEMPLATES
      // =============================================

      applyPreviousDayData: (data) => {
        set((state) => {
          const newWorkforce = (data.workforce || []).map((w) => ({
            ...w,
            id: generateId(),
            daily_report_id: state.draftReport?.id || '',
            created_at: new Date().toISOString(),
          }));
          const newEquipment = (data.equipment || []).map((e) => ({
            ...e,
            id: generateId(),
            daily_report_id: state.draftReport?.id || '',
            created_at: new Date().toISOString(),
          }));
          return {
            workforce: [...state.workforce, ...newWorkforce],
            equipment: [...state.equipment, ...newEquipment],
            draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
          };
        });
      },

      applyTemplate: (template) => {
        set((state) => {
          const newWorkforce = (template.workforce || []).map((w) => ({
            ...w,
            id: generateId(),
            daily_report_id: state.draftReport?.id || '',
            created_at: new Date().toISOString(),
            entry_type: w.entry_type || 'company_crew',
          })) as WorkforceEntryV2[];

          const newEquipment = (template.equipment || []).map((e) => ({
            ...e,
            id: generateId(),
            daily_report_id: state.draftReport?.id || '',
            created_at: new Date().toISOString(),
            equipment_type: e.equipment_type || '',
            quantity: e.quantity || 1,
            owner_type: e.owner_type || 'owned',
          })) as EquipmentEntryV2[];

          return {
            workforce: newWorkforce,
            equipment: newEquipment,
            draftReport: state.draftReport ? { ...state.draftReport, _isDirty: true } : null,
          };
        });
      },

      // =============================================
      // SYNC
      // =============================================

      setSyncStatus: (status, error = null) => {
        set({ syncStatus: status, syncError: error });
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
      },

      addToSyncQueue: (item) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            { ...item, timestamp: Date.now(), retries: 0 },
          ],
        }));
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }));
      },

      setConflict: (conflict) => {
        set({ conflict, syncStatus: conflict ? 'conflict' : 'idle' });
      },

      resolveConflict: (strategy) => {
        set((state) => {
          if (!state.conflict) {return state;}

          switch (strategy) {
            case 'keep_local':
              return { conflict: null, syncStatus: 'idle' };
            case 'keep_server':
              return {
                draftReport: state.conflict.serverData as DraftReportV2,
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter(
                  (item) => item.reportId !== state.conflict?.reportId
                ),
              };
            case 'merge':
              const merged = { ...state.conflict.serverData } as DraftReportV2;
              if (state.draftReport) {
                Object.keys(state.draftReport).forEach((key) => {
                  const localValue = state.draftReport?.[key as keyof DraftReportV2];
                  if (localValue !== null && localValue !== undefined) {
                    (merged as unknown as Record<string, unknown>)[key] = localValue;
                  }
                });
              }
              return {
                draftReport: merged,
                conflict: null,
                syncStatus: 'idle',
              };
            default:
              return state;
          }
        });
      },

      // =============================================
      // UI
      // =============================================

      toggleSection: (sectionId) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: !state.expandedSections[sectionId],
          },
        }));
      },

      setActiveSection: (sectionId) => {
        set({ activeSection: sectionId });
      },

      expandAllSections: () => {
        set((state) => ({
          expandedSections: Object.keys(state.expandedSections).reduce(
            (acc, key) => ({ ...acc, [key]: true }),
            {}
          ),
        }));
      },

      collapseAllSections: () => {
        set((state) => ({
          expandedSections: Object.keys(state.expandedSections).reduce(
            (acc, key) => ({ ...acc, [key]: false }),
            {}
          ),
        }));
      },

      // =============================================
      // RESET
      // =============================================

      clearDraft: () => {
        set({
          draftReport: null,
          workforce: [],
          equipment: [],
          delays: [],
          safetyIncidents: [],
          inspections: [],
          tmWork: [],
          progress: [],
          deliveries: [],
          visitors: [],
          photos: [],
          syncQueue: [],
          syncStatus: 'idle',
          syncError: null,
          conflict: null,
          expandedSections: { ...defaultExpandedSections },
          activeSection: null,
        });
      },

      // =============================================
      // COMPUTED
      // =============================================

      getTotalWorkers: () => {
        return calculateTotalWorkers(get().workforce);
      },

      getFormData: () => {
        const state = get();
        if (!state.draftReport) {return null;}

        return {
          ...state.draftReport,
          workforce: state.workforce,
          equipment: state.equipment,
          delays: state.delays,
          safetyIncidents: state.safetyIncidents,
          inspections: state.inspections,
          tmWork: state.tmWork,
          progress: state.progress,
          deliveries: state.deliveries,
          visitors: state.visitors,
          photos: state.photos,
        };
      },
    }),
    {
      name: 'daily-report-store-v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        draftReport: state.draftReport,
        workforce: state.workforce,
        equipment: state.equipment,
        delays: state.delays,
        safetyIncidents: state.safetyIncidents,
        inspections: state.inspections,
        tmWork: state.tmWork,
        progress: state.progress,
        deliveries: state.deliveries,
        visitors: state.visitors,
        photos: state.photos,
        syncQueue: state.syncQueue,
        expandedSections: state.expandedSections,
      }),
    }
  )
);

// =============================================
// SELECTORS
// =============================================

export const selectDraftReport = (state: DailyReportStoreV2) => state.draftReport;
export const selectWorkforce = (state: DailyReportStoreV2) => state.workforce;
export const selectEquipment = (state: DailyReportStoreV2) => state.equipment;
export const selectDelays = (state: DailyReportStoreV2) => state.delays;
export const selectSafetyIncidents = (state: DailyReportStoreV2) => state.safetyIncidents;
export const selectInspections = (state: DailyReportStoreV2) => state.inspections;
export const selectTMWork = (state: DailyReportStoreV2) => state.tmWork;
export const selectProgress = (state: DailyReportStoreV2) => state.progress;
export const selectDeliveries = (state: DailyReportStoreV2) => state.deliveries;
export const selectVisitors = (state: DailyReportStoreV2) => state.visitors;
export const selectPhotos = (state: DailyReportStoreV2) => state.photos;
export const selectSyncStatus = (state: DailyReportStoreV2) => state.syncStatus;
export const selectIsOnline = (state: DailyReportStoreV2) => state.isOnline;
export const selectHasPendingSync = (state: DailyReportStoreV2) => state.syncQueue.length > 0;
export const selectExpandedSections = (state: DailyReportStoreV2) => state.expandedSections;
export const selectIsDirty = (state: DailyReportStoreV2) => state.draftReport?._isDirty ?? false;
