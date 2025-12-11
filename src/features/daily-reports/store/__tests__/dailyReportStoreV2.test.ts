/**
 * Daily Report Store V2 Tests
 * Integration tests for Zustand store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyReportStoreV2 } from '../dailyReportStoreV2';
import type {
  DailyReportV2,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DelayEntry,
  SafetyIncident,
  WeatherApiResponse,
} from '@/types/daily-reports-v2';

describe('useDailyReportStoreV2', () => {
  beforeEach(() => {
    // Clear store before each test
    const { result } = renderHook(() => useDailyReportStoreV2());
    act(() => {
      result.current.clearDraft();
    });
  });

  describe('Draft Management', () => {
    it('should initialize a new draft', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27', 'quick');
      });

      expect(result.current.draftReport).toBeDefined();
      expect(result.current.draftReport?.project_id).toBe('proj-1');
      expect(result.current.draftReport?.report_date).toBe('2025-01-27');
      expect(result.current.draftReport?.mode).toBe('quick');
      expect(result.current.draftReport?.status).toBe('draft');
    });

    it('should initialize with default shift times', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      expect(result.current.draftReport?.shift_start_time).toBe('07:00');
      expect(result.current.draftReport?.shift_end_time).toBe('15:30');
      expect(result.current.draftReport?.shift_type).toBe('regular');
    });

    it('should update draft fields', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      act(() => {
        result.current.updateDraft({
          work_summary: 'Completed concrete pour',
          weather_condition: 'sunny',
        });
      });

      expect(result.current.draftReport?.work_summary).toBe('Completed concrete pour');
      expect(result.current.draftReport?.weather_condition).toBe('sunny');
      expect(result.current.draftReport?._isDirty).toBe(true);
    });

    it('should set mode and adjust expanded sections', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27', 'quick');
      });

      act(() => {
        result.current.setMode('detailed');
      });

      expect(result.current.draftReport?.mode).toBe('detailed');
      // In detailed mode, all sections should be expanded
      const allExpanded = Object.values(result.current.expandedSections).every((v) => v);
      expect(allExpanded).toBe(true);
    });

    it('should initialize from existing report', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      const existingReport: DailyReportV2 = {
        id: 'report-1',
        project_id: 'proj-1',
        report_date: '2025-01-27',
        report_number: 'DR-001',
        reporter_id: 'user-1',
        shift_type: 'regular',
        status: 'draft',
        mode: 'detailed',
        work_summary: 'Existing work',
        weather_condition: 'cloudy',
        temperature_high: 75,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z',
      } as DailyReportV2;

      act(() => {
        result.current.initializeFromExisting(existingReport);
      });

      expect(result.current.draftReport?.id).toBe('report-1');
      expect(result.current.draftReport?.work_summary).toBe('Existing work');
      expect(result.current.draftReport?.weather_condition).toBe('cloudy');
      expect(result.current.draftReport?._isDirty).toBe(false);
    });

    it('should clear draft', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
        result.current.addWorkforceEntry();
        result.current.addDelayEntry();
      });

      expect(result.current.draftReport).toBeDefined();
      expect(result.current.workforce).toHaveLength(1);
      expect(result.current.delays).toHaveLength(1);

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.draftReport).toBeNull();
      expect(result.current.workforce).toHaveLength(0);
      expect(result.current.delays).toHaveLength(0);
    });
  });

  describe('Weather', () => {
    it('should apply weather data', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      const weather: WeatherApiResponse = {
        condition: 'partly cloudy',
        temperature_high: 78,
        temperature_low: 62,
        precipitation: 0,
        wind_speed: 12,
        wind_direction: 'NE',
        humidity: 65,
        fetched_at: new Date().toISOString(),
      };

      act(() => {
        result.current.applyWeather(weather);
      });

      expect(result.current.draftReport?.weather_condition).toBe('partly cloudy');
      expect(result.current.draftReport?.temperature_high).toBe(78);
      expect(result.current.draftReport?.temperature_low).toBe(62);
      expect(result.current.draftReport?.wind_speed).toBe(12);
      expect(result.current.draftReport?.weather_source).toBe('api');
    });
  });

  describe('Workforce Management', () => {
    it('should add workforce entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addWorkforceEntry({
          company_name: 'ABC Construction',
          trade: 'Carpentry',
          worker_count: 5,
        });
      });

      expect(result.current.workforce).toHaveLength(1);
      expect(result.current.workforce[0].company_name).toBe('ABC Construction');
      expect(result.current.workforce[0].trade).toBe('Carpentry');
      expect(result.current.workforce[0].worker_count).toBe(5);
      expect(result.current.workforce[0].id).toBeDefined();
    });

    it('should update workforce entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addWorkforceEntry({
          company_name: 'ABC Construction',
          worker_count: 5,
        });
      });

      act(() => {
        result.current.updateWorkforceEntry(entryId, {
          worker_count: 7,
          trade: 'Electrical',
        });
      });

      expect(result.current.workforce[0].worker_count).toBe(7);
      expect(result.current.workforce[0].trade).toBe('Electrical');
    });

    it('should remove workforce entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addWorkforceEntry();
      });

      expect(result.current.workforce).toHaveLength(1);

      act(() => {
        result.current.removeWorkforceEntry(entryId);
      });

      expect(result.current.workforce).toHaveLength(0);
    });

    it('should calculate total workers correctly', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      act(() => {
        // Add crew entry
        result.current.addWorkforceEntry({
          entry_type: 'company_crew',
          worker_count: 5,
          apprentice_count: 2,
        });
        // Add individual entry
        result.current.addWorkforceEntry({
          entry_type: 'individual',
          worker_name: 'John Doe',
        });
      });

      const total = result.current.getTotalWorkers();
      expect(total).toBe(8); // 5 + 2 + 1
    });
  });

  describe('Equipment Management', () => {
    it('should add equipment entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addEquipmentEntry({
          equipment_type: 'Excavator',
          equipment_id: 'EXC-001',
          quantity: 1,
          owner_type: 'owned',
        });
      });

      expect(result.current.equipment).toHaveLength(1);
      expect(result.current.equipment[0].equipment_type).toBe('Excavator');
      expect(result.current.equipment[0].quantity).toBe(1);
    });

    it('should update equipment entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addEquipmentEntry({
          equipment_type: 'Forklift',
        });
      });

      act(() => {
        result.current.updateEquipmentEntry(entryId, {
          hours_used: 6,
          operator_name: 'Jane Smith',
        });
      });

      expect(result.current.equipment[0].hours_used).toBe(6);
      expect(result.current.equipment[0].operator_name).toBe('Jane Smith');
    });

    it('should remove equipment entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addEquipmentEntry();
      });

      expect(result.current.equipment).toHaveLength(1);

      act(() => {
        result.current.removeEquipmentEntry(entryId);
      });

      expect(result.current.equipment).toHaveLength(0);
    });
  });

  describe('Delays Management', () => {
    it('should add delay entry', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      act(() => {
        result.current.addDelayEntry({
          delay_type: 'weather',
          description: 'Heavy rain prevented outdoor work',
          duration_hours: 4,
        });
      });

      expect(result.current.delays).toHaveLength(1);
      expect(result.current.delays[0].delay_type).toBe('weather');
      expect(result.current.delays[0].duration_hours).toBe(4);
    });

    it('should update delay entry with updated_at', async () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let entryId: string;
      act(() => {
        entryId = result.current.addDelayEntry({
          delay_type: 'material',
          description: 'Missing materials',
        });
      });

      const originalUpdatedAt = result.current.delays[0].updated_at;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      act(() => {
        result.current.updateDelayEntry(entryId, {
          duration_hours: 2,
        });
      });

      expect(result.current.delays[0].duration_hours).toBe(2);
      expect(result.current.delays[0].updated_at).not.toBe(originalUpdatedAt);
    });
  });

  describe('Safety Incidents', () => {
    it('should add safety incident', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      act(() => {
        result.current.addSafetyIncident({
          incident_type: 'near_miss',
          description: 'Worker almost struck by falling object',
          osha_reportable: false,
        });
      });

      expect(result.current.safetyIncidents).toHaveLength(1);
      expect(result.current.safetyIncidents[0].incident_type).toBe('near_miss');
      expect(result.current.safetyIncidents[0].client_notified).toBe(false);
    });

    it('should update safety incident', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      let incidentId: string;
      act(() => {
        incidentId = result.current.addSafetyIncident({
          incident_type: 'first_aid',
          description: 'Minor cut',
        });
      });

      act(() => {
        result.current.updateSafetyIncident(incidentId, {
          client_notified: true,
          corrective_actions: 'Provided safety training',
        });
      });

      expect(result.current.safetyIncidents[0].client_notified).toBe(true);
      expect(result.current.safetyIncidents[0].corrective_actions).toBe(
        'Provided safety training'
      );
    });
  });

  describe('Template Application', () => {
    it('should apply template', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
      });

      const template = {
        workforce: [
          {
            entry_type: 'company_crew' as const,
            company_name: 'ABC Construction',
            trade: 'Carpentry',
            worker_count: 5,
          },
        ],
        equipment: [
          {
            equipment_type: 'Excavator',
            owner_type: 'owned' as const,
          },
        ],
      };

      act(() => {
        result.current.applyTemplate(template);
      });

      expect(result.current.workforce).toHaveLength(1);
      expect(result.current.workforce[0].company_name).toBe('ABC Construction');
      expect(result.current.equipment).toHaveLength(1);
      expect(result.current.equipment[0].equipment_type).toBe('Excavator');
    });

    it('should apply previous day data', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
        result.current.addWorkforceEntry({ company_name: 'Existing' });
      });

      expect(result.current.workforce).toHaveLength(1);

      const previousDayData = {
        workforce: [
          {
            id: 'old-id',
            daily_report_id: 'old-report',
            entry_type: 'company_crew' as const,
            company_name: 'Previous Day Crew',
            created_at: '2025-01-26T00:00:00Z',
          } as WorkforceEntryV2,
        ],
        equipment: [] as EquipmentEntryV2[],
      };

      act(() => {
        result.current.applyPreviousDayData(previousDayData);
      });

      // Should append to existing workforce
      expect(result.current.workforce).toHaveLength(2);
      expect(result.current.workforce[1].company_name).toBe('Previous Day Crew');
      // Should have new ID
      expect(result.current.workforce[1].id).not.toBe('old-id');
    });
  });

  describe('Sync Management', () => {
    it('should manage sync status', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      expect(result.current.syncStatus).toBe('idle');

      act(() => {
        result.current.setSyncStatus('syncing');
      });

      expect(result.current.syncStatus).toBe('syncing');

      act(() => {
        result.current.setSyncStatus('success');
      });

      expect(result.current.syncStatus).toBe('success');

      act(() => {
        result.current.setSyncStatus('error', 'Network error');
      });

      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toBe('Network error');
    });

    it('should manage sync queue', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.addToSyncQueue({
          id: 'sync-1',
          reportId: 'report-1',
          action: 'create',
        });
      });

      expect(result.current.syncQueue).toHaveLength(1);
      expect(result.current.syncQueue[0].retries).toBe(0);

      act(() => {
        result.current.removeFromSyncQueue('sync-1');
      });

      expect(result.current.syncQueue).toHaveLength(0);
    });

    it('should handle conflict resolution', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
        result.current.updateDraft({ work_summary: 'Local changes' });
      });

      const conflict = {
        reportId: 'report-1',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2025-01-27T12:00:00Z',
        serverData: {
          work_summary: 'Server changes',
        },
      };

      act(() => {
        result.current.setConflict(conflict);
      });

      expect(result.current.syncStatus).toBe('conflict');
      expect(result.current.conflict).toEqual(conflict);

      act(() => {
        result.current.resolveConflict('keep_local');
      });

      expect(result.current.conflict).toBeNull();
      expect(result.current.draftReport?.work_summary).toBe('Local changes');
    });
  });

  describe('UI State Management', () => {
    it('should toggle section expansion', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      const initialState = result.current.expandedSections.delays;

      act(() => {
        result.current.toggleSection('delays');
      });

      expect(result.current.expandedSections.delays).toBe(!initialState);
    });

    it('should expand all sections', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.collapseAllSections();
      });

      const allCollapsed = Object.values(result.current.expandedSections).every((v) => !v);
      expect(allCollapsed).toBe(true);

      act(() => {
        result.current.expandAllSections();
      });

      const allExpanded = Object.values(result.current.expandedSections).every((v) => v);
      expect(allExpanded).toBe(true);
    });

    it('should set active section', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      expect(result.current.activeSection).toBeNull();

      act(() => {
        result.current.setActiveSection('workforce');
      });

      expect(result.current.activeSection).toBe('workforce');
    });
  });

  describe('Form Data Export', () => {
    it('should export complete form data', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      act(() => {
        result.current.initializeDraft('proj-1', '2025-01-27');
        result.current.updateDraft({ work_summary: 'Test work' });
        result.current.addWorkforceEntry({ company_name: 'ABC' });
        result.current.addEquipmentEntry({ equipment_type: 'Crane' });
        result.current.addDelayEntry({ delay_type: 'weather', description: 'Rain' });
      });

      const formData = result.current.getFormData();

      expect(formData).toBeDefined();
      expect(formData?.work_summary).toBe('Test work');
      expect(formData?.workforce).toHaveLength(1);
      expect(formData?.equipment).toHaveLength(1);
      expect(formData?.delays).toHaveLength(1);
    });

    it('should return null when no draft exists', () => {
      const { result } = renderHook(() => useDailyReportStoreV2());

      const formData = result.current.getFormData();
      expect(formData).toBeNull();
    });
  });
});
