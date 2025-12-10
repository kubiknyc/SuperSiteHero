/**
 * Workflow Engine Tests
 * Tests for approval workflow state machine and transitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DailyReportWorkflowEngine,
  workflowEngine,
  type ApprovalRole,
} from '../workflowEngine';
import type { DailyReportV2, ReportStatus } from '@/types/daily-reports-v2';

describe('DailyReportWorkflowEngine', () => {
  let engine: DailyReportWorkflowEngine;

  beforeEach(() => {
    engine = new DailyReportWorkflowEngine();
  });

  describe('Status Transitions', () => {
    describe('canTransition', () => {
      it('should allow draft -> submitted transition', () => {
        expect(engine.canTransition('draft', 'submitted')).toBe(true);
      });

      it('should allow submitted -> approved transition', () => {
        expect(engine.canTransition('submitted', 'approved')).toBe(true);
      });

      it('should allow submitted -> changes_requested transition', () => {
        expect(engine.canTransition('submitted', 'changes_requested')).toBe(true);
      });

      it('should allow changes_requested -> submitted transition', () => {
        expect(engine.canTransition('changes_requested', 'submitted')).toBe(true);
      });

      it('should allow approved -> locked transition', () => {
        expect(engine.canTransition('approved', 'locked')).toBe(true);
      });

      it('should not allow draft -> approved direct transition', () => {
        expect(engine.canTransition('draft', 'approved')).toBe(false);
      });

      it('should not allow locked -> any transition', () => {
        expect(engine.canTransition('locked', 'draft')).toBe(false);
        expect(engine.canTransition('locked', 'submitted')).toBe(false);
        expect(engine.canTransition('locked', 'approved')).toBe(false);
      });

      it('should not allow approved -> draft transition', () => {
        expect(engine.canTransition('approved', 'draft')).toBe(false);
      });
    });

    describe('canPerformTransition', () => {
      it('should allow author to submit draft', () => {
        expect(engine.canPerformTransition('draft', 'submitted', 'author')).toBe(true);
      });

      it('should allow admin to perform any valid transition', () => {
        expect(engine.canPerformTransition('draft', 'submitted', 'admin')).toBe(true);
        expect(engine.canPerformTransition('submitted', 'approved', 'admin')).toBe(true);
        expect(engine.canPerformTransition('submitted', 'changes_requested', 'admin')).toBe(true);
      });

      it('should allow approver to approve submission', () => {
        expect(engine.canPerformTransition('submitted', 'approved', 'approver')).toBe(true);
      });

      it('should allow reviewer to request changes', () => {
        expect(engine.canPerformTransition('submitted', 'changes_requested', 'reviewer')).toBe(true);
      });

      it('should not allow author to approve their own report', () => {
        expect(engine.canPerformTransition('submitted', 'approved', 'author')).toBe(false);
      });

      it('should not allow reviewer to submit draft', () => {
        expect(engine.canPerformTransition('draft', 'submitted', 'reviewer')).toBe(false);
      });
    });

    describe('getAvailableTransitions', () => {
      it('should return submit and voided for author with draft', () => {
        const transitions = engine.getAvailableTransitions('draft', 'author');
        expect(transitions).toContain('submitted');
        expect(transitions).toContain('voided');
        expect(transitions).toHaveLength(2);
      });

      it('should return approve and request changes for approver with submitted', () => {
        const transitions = engine.getAvailableTransitions('submitted', 'approver');
        expect(transitions).toContain('approved');
        expect(transitions).toContain('changes_requested');
      });

      it('should return empty array for locked status', () => {
        const transitions = engine.getAvailableTransitions('locked', 'admin');
        expect(transitions).toEqual([]);
      });

      it('should return submit and draft for author with changes_requested', () => {
        const transitions = engine.getAvailableTransitions('changes_requested', 'author');
        expect(transitions).toContain('submitted');
        expect(transitions).toContain('draft');
      });
    });
  });

  describe('Validation', () => {
    describe('validateForSubmission', () => {
      it('should pass validation for valid report', () => {
        const report: Partial<DailyReportV2> = {
          project_id: 'proj-1',
          report_date: '2025-01-27',
          work_summary: 'Completed concrete pour on level 3',
          submitted_by_signature: 'signature-data',
        };

        const result = engine.validateForSubmission(report);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation for missing work summary', () => {
        const report: Partial<DailyReportV2> = {
          project_id: 'proj-1',
          report_date: '2025-01-27',
          work_summary: '',
          submitted_by_signature: 'signature-data',
        };

        const result = engine.validateForSubmission(report);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Work summary is required');
      });

      it('should fail validation for missing project_id', () => {
        const report: Partial<DailyReportV2> = {
          report_date: '2025-01-27',
          work_summary: 'Work completed',
          submitted_by_signature: 'signature-data',
        };

        const result = engine.validateForSubmission(report);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Project ID is required');
      });

      it('should fail validation for missing signature when required', () => {
        const report: Partial<DailyReportV2> = {
          project_id: 'proj-1',
          report_date: '2025-01-27',
          work_summary: 'Work completed',
        };

        const result = engine.validateForSubmission(report);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Signature is required for submission');
      });

      it('should pass validation without signature when not required', () => {
        const engineNoSig = new DailyReportWorkflowEngine({ requiresSignature: false });
        const report: Partial<DailyReportV2> = {
          project_id: 'proj-1',
          report_date: '2025-01-27',
          work_summary: 'Work completed',
        };

        const result = engineNoSig.validateForSubmission(report);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Notification Configuration', () => {
    it('should return notification config for draft -> submitted', () => {
      const config = engine.getNotificationConfig('draft', 'submitted');
      expect(config).toBeDefined();
      expect(config?.type).toBe('report_submitted');
      expect(config?.recipients).toContain('reviewer');
      expect(config?.recipients).toContain('approver');
      expect(config?.emailEnabled).toBe(true);
    });

    it('should return notification config for approved transition', () => {
      const config = engine.getNotificationConfig('submitted', 'approved');
      expect(config).toBeDefined();
      expect(config?.type).toBe('report_approved');
      expect(config?.recipients).toContain('author');
    });

    it('should return notification config for changes requested', () => {
      const config = engine.getNotificationConfig('submitted', 'changes_requested');
      expect(config).toBeDefined();
      expect(config?.type).toBe('changes_requested');
      expect(config?.recipients).toContain('author');
    });

    it('should return null for transitions without notifications', () => {
      const config = engine.getNotificationConfig('changes_requested', 'draft');
      expect(config).toBeNull();
    });
  });

  describe('Auto-Lock Logic', () => {
    it('should return true for immediate lock (0 days)', () => {
      const engineImmediateLock = new DailyReportWorkflowEngine({ autoLockDays: 0 });
      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'approved',
        approved_at: new Date().toISOString(),
      } as DailyReportV2;

      expect(engineImmediateLock.shouldAutoLock(report)).toBe(true);
    });

    it('should return false for report not yet approved', () => {
      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'submitted',
      } as DailyReportV2;

      expect(engine.shouldAutoLock(report)).toBe(false);
    });

    it('should return false for approved report without approval date', () => {
      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'approved',
      } as DailyReportV2;

      expect(engine.shouldAutoLock(report)).toBe(false);
    });

    it('should return true for report approved beyond lock period', () => {
      const engine3Days = new DailyReportWorkflowEngine({ autoLockDays: 3 });
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'approved',
        approved_at: fourDaysAgo.toISOString(),
      } as DailyReportV2;

      expect(engine3Days.shouldAutoLock(report)).toBe(true);
    });

    it('should return false for recently approved report', () => {
      const engine3Days = new DailyReportWorkflowEngine({ autoLockDays: 3 });
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'approved',
        approved_at: oneDayAgo.toISOString(),
      } as DailyReportV2;

      expect(engine3Days.shouldAutoLock(report)).toBe(false);
    });
  });

  describe('Review Reminders', () => {
    it('should return true when reminder time has passed', () => {
      const engine8Hours = new DailyReportWorkflowEngine({ reminderHours: 8 });
      const tenHoursAgo = new Date();
      tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'submitted',
        submitted_at: tenHoursAgo.toISOString(),
      } as DailyReportV2;

      expect(engine8Hours.needsReviewReminder(report)).toBe(true);
    });

    it('should return false for recently submitted report', () => {
      const engine8Hours = new DailyReportWorkflowEngine({ reminderHours: 8 });
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'submitted',
        submitted_at: twoHoursAgo.toISOString(),
      } as DailyReportV2;

      expect(engine8Hours.needsReviewReminder(report)).toBe(false);
    });

    it('should return false for non-submitted status', () => {
      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'draft',
        submitted_at: new Date().toISOString(),
      } as DailyReportV2;

      expect(engine.needsReviewReminder(report)).toBe(false);
    });
  });

  describe('Escalation Logic', () => {
    it('should return true when escalation time has passed', () => {
      const engine24Hours = new DailyReportWorkflowEngine({ escalationHours: 24 });
      const twentySixHoursAgo = new Date();
      twentySixHoursAgo.setHours(twentySixHoursAgo.getHours() - 26);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'submitted',
        submitted_at: twentySixHoursAgo.toISOString(),
      } as DailyReportV2;

      expect(engine24Hours.needsEscalation(report)).toBe(true);
    });

    it('should work for in_review status', () => {
      const engine24Hours = new DailyReportWorkflowEngine({ escalationHours: 24 });
      const twentySixHoursAgo = new Date();
      twentySixHoursAgo.setHours(twentySixHoursAgo.getHours() - 26);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'in_review',
        submitted_at: twentySixHoursAgo.toISOString(),
      } as DailyReportV2;

      expect(engine24Hours.needsEscalation(report)).toBe(true);
    });

    it('should return false before escalation time', () => {
      const engine24Hours = new DailyReportWorkflowEngine({ escalationHours: 24 });
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'submitted',
        submitted_at: twelveHoursAgo.toISOString(),
      } as DailyReportV2;

      expect(engine24Hours.needsEscalation(report)).toBe(false);
    });

    it('should return false for approved status', () => {
      const report: DailyReportV2 = {
        id: 'report-1',
        status: 'approved',
        submitted_at: new Date(0).toISOString(),
      } as DailyReportV2;

      expect(engine.needsEscalation(report)).toBe(false);
    });
  });

  describe('Status Display Info', () => {
    it('should return correct info for each status', () => {
      const statuses: ReportStatus[] = [
        'draft',
        'submitted',
        'in_review',
        'changes_requested',
        'approved',
        'locked',
      ];

      statuses.forEach((status) => {
        const info = engine.getStatusInfo(status);
        expect(info).toBeDefined();
        expect(info.label).toBeDefined();
        expect(info.color).toBeDefined();
        expect(info.icon).toBeDefined();
        expect(info.description).toBeDefined();
      });
    });

    it('should return draft info correctly', () => {
      const info = engine.getStatusInfo('draft');
      expect(info.label).toBe('Draft');
      expect(info.color).toBe('gray');
      expect(info.icon).toBe('edit');
    });

    it('should return approved info correctly', () => {
      const info = engine.getStatusInfo('approved');
      expect(info.label).toBe('Approved');
      expect(info.color).toBe('green');
      expect(info.icon).toBe('check-circle');
    });
  });

  describe('Available Actions', () => {
    const mockReport: DailyReportV2 = {
      id: 'report-1',
      status: 'draft',
    } as DailyReportV2;

    it('should return submit and void actions for author with draft', () => {
      const report = { ...mockReport, status: 'draft' as const };
      const actions = engine.getAvailableActions(report, 'author');

      expect(actions).toHaveLength(2);
      const actionTypes = actions.map((a) => a.action);
      expect(actionTypes).toContain('submit');
      expect(actionTypes).toContain('void');

      const submitAction = actions.find((a) => a.action === 'submit');
      expect(submitAction?.toStatus).toBe('submitted');
      expect(submitAction?.requiresSignature).toBe(true);

      const voidAction = actions.find((a) => a.action === 'void');
      expect(voidAction?.toStatus).toBe('voided');
      expect(voidAction?.requiresComment).toBe(true);
    });

    it('should return approve and request changes for approver with submitted', () => {
      const report = { ...mockReport, status: 'submitted' as const };
      const actions = engine.getAvailableActions(report, 'approver');

      expect(actions.length).toBeGreaterThan(0);
      const actionTypes = actions.map((a) => a.action);
      expect(actionTypes).toContain('approve');
      expect(actionTypes).toContain('request_changes');
    });

    it('should return lock action for admin with approved', () => {
      const report = { ...mockReport, status: 'approved' as const };
      const actions = engine.getAvailableActions(report, 'admin');

      const lockAction = actions.find((a) => a.action === 'lock');
      expect(lockAction).toBeDefined();
      expect(lockAction?.requiresSignature).toBe(false);
    });

    it('should set requiresComment for request changes action', () => {
      const report = { ...mockReport, status: 'submitted' as const };
      const actions = engine.getAvailableActions(report, 'reviewer');

      const requestChanges = actions.find((a) => a.action === 'request_changes');
      expect(requestChanges).toBeDefined();
      expect(requestChanges?.requiresComment).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a default configured instance', () => {
      expect(workflowEngine).toBeDefined();
      expect(workflowEngine).toBeInstanceOf(DailyReportWorkflowEngine);
    });

    it('should have default configuration', () => {
      const report: Partial<DailyReportV2> = {
        project_id: 'proj-1',
        report_date: '2025-01-27',
        work_summary: 'Work done',
      };

      const result = workflowEngine.validateForSubmission(report);
      expect(result.valid).toBe(false); // Should require signature by default
      expect(result.errors).toContain('Signature is required for submission');
    });
  });

  describe('Custom Configuration', () => {
    it('should allow custom configuration', () => {
      const customEngine = new DailyReportWorkflowEngine({
        requiresSignature: false,
        autoLockDays: 7,
        multiLevelApproval: true,
        requiredApprovers: 2,
        escalationHours: 48,
        reminderHours: 16,
        allowSubmitterApproval: true,
      });

      expect(customEngine).toBeDefined();

      const report: Partial<DailyReportV2> = {
        project_id: 'proj-1',
        report_date: '2025-01-27',
        work_summary: 'Work completed',
      };

      const result = customEngine.validateForSubmission(report);
      expect(result.valid).toBe(true); // No signature required
    });
  });
});
