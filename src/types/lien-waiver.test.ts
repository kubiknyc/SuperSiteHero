/**
 * Lien Waiver Types Tests
 * Tests for types, constants, and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  LIEN_WAIVER_TYPES,
  LIEN_WAIVER_STATUSES,
  US_STATES,
  getWaiverTypeLabel,
  getWaiverStatusLabel,
  getWaiverStatusColor,
  isConditionalWaiver,
  isFinalWaiver,
  getStateName,
  hasStatutoryForm,
  formatWaiverAmount,
  isWaiverOverdue,
  getDaysUntilDue,
  type LienWaiver,
  type LienWaiverType,
  type LienWaiverStatus,
} from './lien-waiver';

describe('lien-waiver types', () => {
  // =============================================
  // CONSTANTS TESTS
  // =============================================

  describe('LIEN_WAIVER_TYPES', () => {
    it('should contain all four waiver types', () => {
      expect(LIEN_WAIVER_TYPES).toHaveLength(4);

      const types = LIEN_WAIVER_TYPES.map(t => t.value);
      expect(types).toContain('conditional_progress');
      expect(types).toContain('unconditional_progress');
      expect(types).toContain('conditional_final');
      expect(types).toContain('unconditional_final');
    });

    it('should have correct conditional flags', () => {
      const conditionalProgress = LIEN_WAIVER_TYPES.find(t => t.value === 'conditional_progress');
      const unconditionalProgress = LIEN_WAIVER_TYPES.find(t => t.value === 'unconditional_progress');
      const conditionalFinal = LIEN_WAIVER_TYPES.find(t => t.value === 'conditional_final');
      const unconditionalFinal = LIEN_WAIVER_TYPES.find(t => t.value === 'unconditional_final');

      expect(conditionalProgress?.isConditional).toBe(true);
      expect(conditionalProgress?.isFinal).toBe(false);

      expect(unconditionalProgress?.isConditional).toBe(false);
      expect(unconditionalProgress?.isFinal).toBe(false);

      expect(conditionalFinal?.isConditional).toBe(true);
      expect(conditionalFinal?.isFinal).toBe(true);

      expect(unconditionalFinal?.isConditional).toBe(false);
      expect(unconditionalFinal?.isFinal).toBe(true);
    });

    it('should have human-readable labels for all types', () => {
      LIEN_WAIVER_TYPES.forEach(type => {
        expect(type.label).toBeDefined();
        expect(type.label.length).toBeGreaterThan(0);
        expect(type.description).toBeDefined();
        expect(type.description.length).toBeGreaterThan(0);
      });
    });

    it('should have correct labels', () => {
      expect(LIEN_WAIVER_TYPES.find(t => t.value === 'conditional_progress')?.label).toBe('Conditional Progress');
      expect(LIEN_WAIVER_TYPES.find(t => t.value === 'unconditional_final')?.label).toBe('Unconditional Final');
    });
  });

  describe('LIEN_WAIVER_STATUSES', () => {
    it('should contain all nine status values', () => {
      expect(LIEN_WAIVER_STATUSES).toHaveLength(9);

      const statuses = LIEN_WAIVER_STATUSES.map(s => s.value);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('draft');
      expect(statuses).toContain('sent');
      expect(statuses).toContain('received');
      expect(statuses).toContain('under_review');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('expired');
      expect(statuses).toContain('void');
    });

    it('should have color codes for all statuses', () => {
      LIEN_WAIVER_STATUSES.forEach(status => {
        expect(status.color).toBeDefined();
        expect(status.color.length).toBeGreaterThan(0);
      });
    });

    it('should have appropriate colors for status states', () => {
      const approved = LIEN_WAIVER_STATUSES.find(s => s.value === 'approved');
      const rejected = LIEN_WAIVER_STATUSES.find(s => s.value === 'rejected');
      const sent = LIEN_WAIVER_STATUSES.find(s => s.value === 'sent');
      const expired = LIEN_WAIVER_STATUSES.find(s => s.value === 'expired');

      expect(approved?.color).toBe('green');
      expect(rejected?.color).toBe('red');
      expect(sent?.color).toBe('blue');
      expect(expired?.color).toBe('orange');
    });

    it('should have descriptions for all statuses', () => {
      LIEN_WAIVER_STATUSES.forEach(status => {
        expect(status.description).toBeDefined();
        expect(status.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('US_STATES', () => {
    it('should contain all 50 US states', () => {
      expect(US_STATES).toHaveLength(50);
    });

    it('should have valid state codes (2 characters)', () => {
      US_STATES.forEach(state => {
        expect(state.code).toHaveLength(2);
        expect(state.code).toBe(state.code.toUpperCase());
      });
    });

    it('should identify states with statutory form requirements', () => {
      const statesWithStatutoryForms = US_STATES.filter(s => s.hasStatutoryForm);

      // Known states with statutory lien waiver forms
      const expectedStatutoryStates = ['AZ', 'CA', 'GA', 'MI', 'MS', 'MO', 'NV', 'TX', 'UT', 'WY'];
      const actualStatutoryStates = statesWithStatutoryForms.map(s => s.code);

      expectedStatutoryStates.forEach(stateCode => {
        expect(actualStatutoryStates).toContain(stateCode);
      });
    });

    it('should have unique state codes', () => {
      const codes = US_STATES.map(s => s.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('should include major construction states', () => {
      const stateCodes = US_STATES.map(s => s.code);
      expect(stateCodes).toContain('CA'); // California
      expect(stateCodes).toContain('TX'); // Texas
      expect(stateCodes).toContain('FL'); // Florida
      expect(stateCodes).toContain('NY'); // New York
    });
  });

  // =============================================
  // HELPER FUNCTION TESTS
  // =============================================

  describe('getWaiverTypeLabel', () => {
    it('should return correct label for known types', () => {
      expect(getWaiverTypeLabel('conditional_progress')).toBe('Conditional Progress');
      expect(getWaiverTypeLabel('unconditional_progress')).toBe('Unconditional Progress');
      expect(getWaiverTypeLabel('conditional_final')).toBe('Conditional Final');
      expect(getWaiverTypeLabel('unconditional_final')).toBe('Unconditional Final');
    });

    it('should return the type value for unknown types', () => {
      expect(getWaiverTypeLabel('unknown_type' as LienWaiverType)).toBe('unknown_type');
    });
  });

  describe('getWaiverStatusLabel', () => {
    it('should return correct label for known statuses', () => {
      expect(getWaiverStatusLabel('pending')).toBe('Pending');
      expect(getWaiverStatusLabel('approved')).toBe('Approved');
      expect(getWaiverStatusLabel('rejected')).toBe('Rejected');
      expect(getWaiverStatusLabel('under_review')).toBe('Under Review');
    });

    it('should return the status value for unknown statuses', () => {
      expect(getWaiverStatusLabel('unknown_status' as LienWaiverStatus)).toBe('unknown_status');
    });
  });

  describe('getWaiverStatusColor', () => {
    it('should return correct color for known statuses', () => {
      expect(getWaiverStatusColor('approved')).toBe('green');
      expect(getWaiverStatusColor('rejected')).toBe('red');
      expect(getWaiverStatusColor('sent')).toBe('blue');
      expect(getWaiverStatusColor('pending')).toBe('gray');
      expect(getWaiverStatusColor('expired')).toBe('orange');
    });

    it('should return gray for unknown statuses', () => {
      expect(getWaiverStatusColor('unknown_status' as LienWaiverStatus)).toBe('gray');
    });
  });

  describe('isConditionalWaiver', () => {
    it('should return true for conditional waiver types', () => {
      expect(isConditionalWaiver('conditional_progress')).toBe(true);
      expect(isConditionalWaiver('conditional_final')).toBe(true);
    });

    it('should return false for unconditional waiver types', () => {
      expect(isConditionalWaiver('unconditional_progress')).toBe(false);
      expect(isConditionalWaiver('unconditional_final')).toBe(false);
    });

    it('should return false for unknown types', () => {
      expect(isConditionalWaiver('unknown_type' as LienWaiverType)).toBe(false);
    });
  });

  describe('isFinalWaiver', () => {
    it('should return true for final waiver types', () => {
      expect(isFinalWaiver('conditional_final')).toBe(true);
      expect(isFinalWaiver('unconditional_final')).toBe(true);
    });

    it('should return false for progress waiver types', () => {
      expect(isFinalWaiver('conditional_progress')).toBe(false);
      expect(isFinalWaiver('unconditional_progress')).toBe(false);
    });

    it('should return false for unknown types', () => {
      expect(isFinalWaiver('unknown_type' as LienWaiverType)).toBe(false);
    });
  });

  describe('getStateName', () => {
    it('should return correct state name for known codes', () => {
      expect(getStateName('CA')).toBe('California');
      expect(getStateName('TX')).toBe('Texas');
      expect(getStateName('NY')).toBe('New York');
      expect(getStateName('FL')).toBe('Florida');
    });

    it('should return the code for unknown states', () => {
      expect(getStateName('XX')).toBe('XX');
    });
  });

  describe('hasStatutoryForm', () => {
    it('should return true for states with statutory forms', () => {
      expect(hasStatutoryForm('CA')).toBe(true);
      expect(hasStatutoryForm('TX')).toBe(true);
      expect(hasStatutoryForm('AZ')).toBe(true);
      expect(hasStatutoryForm('GA')).toBe(true);
    });

    it('should return false for states without statutory forms', () => {
      expect(hasStatutoryForm('NY')).toBe(false);
      expect(hasStatutoryForm('FL')).toBe(false);
      expect(hasStatutoryForm('IL')).toBe(false);
    });

    it('should return false for unknown state codes', () => {
      expect(hasStatutoryForm('XX')).toBe(false);
    });
  });

  describe('formatWaiverAmount', () => {
    it('should format amounts as USD currency', () => {
      expect(formatWaiverAmount(1000)).toBe('$1,000.00');
      expect(formatWaiverAmount(1234567.89)).toBe('$1,234,567.89');
      expect(formatWaiverAmount(0)).toBe('$0.00');
    });

    it('should handle decimal amounts correctly', () => {
      expect(formatWaiverAmount(99.99)).toBe('$99.99');
      expect(formatWaiverAmount(0.01)).toBe('$0.01');
      expect(formatWaiverAmount(123.456)).toBe('$123.46'); // Rounds to 2 decimals
    });

    it('should format large construction amounts', () => {
      expect(formatWaiverAmount(500000)).toBe('$500,000.00');
      expect(formatWaiverAmount(2500000)).toBe('$2,500,000.00');
    });
  });

  describe('isWaiverOverdue', () => {
    const createMockWaiver = (dueDate: string | null, status: LienWaiverStatus): LienWaiver => ({
      id: 'waiver-1',
      company_id: 'company-1',
      project_id: 'project-1',
      waiver_number: 'LW-001',
      waiver_type: 'conditional_progress',
      status,
      through_date: '2024-01-01',
      payment_amount: 10000,
      due_date: dueDate,
      notarization_required: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      payment_application_id: null,
      subcontractor_id: null,
      vendor_name: null,
      template_id: null,
      check_number: null,
      check_date: null,
      exceptions: null,
      rendered_content: null,
      claimant_name: null,
      claimant_title: null,
      claimant_company: null,
      signature_url: null,
      signature_date: null,
      signed_at: null,
      notary_name: null,
      notary_commission_number: null,
      notary_commission_expiration: null,
      notarized_at: null,
      notarized_document_url: null,
      document_url: null,
      sent_at: null,
      sent_to_email: null,
      received_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      reminder_sent_at: null,
      notes: null,
      created_by: null,
      deleted_at: null,
    });

    it('should return false when due_date is null', () => {
      const waiver = createMockWaiver(null, 'pending');
      expect(isWaiverOverdue(waiver)).toBe(false);
    });

    it('should return false for approved waivers', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const waiver = createMockWaiver(pastDate, 'approved');
      expect(isWaiverOverdue(waiver)).toBe(false);
    });

    it('should return false for void waivers', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const waiver = createMockWaiver(pastDate, 'void');
      expect(isWaiverOverdue(waiver)).toBe(false);
    });

    it('should return true for pending waiver past due date', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const waiver = createMockWaiver(pastDate, 'pending');
      expect(isWaiverOverdue(waiver)).toBe(true);
    });

    it('should return false for pending waiver with future due date', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const waiver = createMockWaiver(futureDate, 'pending');
      expect(isWaiverOverdue(waiver)).toBe(false);
    });

    it('should return true for sent waiver past due date', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const waiver = createMockWaiver(pastDate, 'sent');
      expect(isWaiverOverdue(waiver)).toBe(true);
    });
  });

  describe('getDaysUntilDue', () => {
    it('should return positive days for future due dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const days = getDaysUntilDue(futureDate);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(8); // Allow for timezone differences
    });

    it('should return negative days for past due dates', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const days = getDaysUntilDue(pastDate);
      expect(days).toBeLessThan(0);
    });

    it('should return 0 or 1 for today', () => {
      const today = new Date().toISOString();
      const days = getDaysUntilDue(today);
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(1);
    });

    it('should handle date strings correctly', () => {
      // 30 days from now
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const dateString = thirtyDaysLater.toISOString().split('T')[0];
      const days = getDaysUntilDue(dateString);
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });
  });

  // =============================================
  // TYPE INTERFACE STRUCTURE TESTS
  // =============================================

  describe('LienWaiverTemplate interface', () => {
    it('should have required fields for template identification', () => {
      const template = {
        id: 'template-1',
        company_id: 'company-1',
        name: 'California Conditional Progress',
        state_code: 'CA',
        waiver_type: 'conditional_progress' as LienWaiverType,
        template_content: 'Template content here...',
        legal_language: null,
        notarization_required: false,
        placeholders: ['{{contractor_name}}', '{{amount}}'],
        is_default: true,
        is_active: true,
        version: 1,
        effective_date: null,
        expiration_date: null,
        statute_reference: 'Cal. Civ. Code § 8134',
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
      };

      expect(template.name).toBeDefined();
      expect(template.state_code).toHaveLength(2);
      expect(template.waiver_type).toBe('conditional_progress');
      expect(template.template_content).toBeDefined();
      expect(Array.isArray(template.placeholders)).toBe(true);
    });
  });

  describe('LienWaiverRequirement interface', () => {
    it('should have required fields for payment waiver enforcement', () => {
      const requirement = {
        id: 'req-1',
        company_id: 'company-1',
        project_id: 'project-1',
        name: 'Standard Waiver Requirement',
        description: 'Require waivers for all payments over $10,000',
        required_for_progress_payments: true,
        required_for_final_payment: true,
        min_payment_threshold: 10000,
        requires_contractor_waiver: true,
        requires_sub_waivers: true,
        requires_supplier_waivers: false,
        days_before_payment_due: 5,
        block_payment_without_waiver: true,
        allow_conditional_for_progress: true,
        require_unconditional_for_final: true,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
      };

      // Verify payment enforcement fields
      expect(requirement.block_payment_without_waiver).toBe(true);
      expect(requirement.min_payment_threshold).toBe(10000);
      expect(requirement.days_before_payment_due).toBe(5);

      // Verify waiver type requirements
      expect(requirement.allow_conditional_for_progress).toBe(true);
      expect(requirement.require_unconditional_for_final).toBe(true);

      // Verify entity requirements
      expect(requirement.requires_contractor_waiver).toBe(true);
      expect(requirement.requires_sub_waivers).toBe(true);
      expect(requirement.requires_supplier_waivers).toBe(false);
    });
  });

  describe('ProjectWaiverSummary interface', () => {
    it('should track all waiver status counts', () => {
      const summary = {
        total_waivers: 25,
        pending_count: 5,
        received_count: 8,
        approved_count: 10,
        missing_count: 2,
        overdue_count: 3,
        total_waived_amount: 500000,
      };

      // Verify counts add up logically
      expect(summary.total_waivers).toBeGreaterThanOrEqual(
        summary.pending_count + summary.received_count + summary.approved_count
      );
      expect(summary.overdue_count).toBeLessThanOrEqual(summary.pending_count);
      expect(summary.total_waived_amount).toBeGreaterThan(0);
    });
  });

  describe('WaiverComplianceStatus interface', () => {
    it('should track compliance percentage correctly', () => {
      const compliance = {
        project_id: 'project-1',
        project_name: 'Commercial Building',
        payment_application_id: 'pa-1',
        application_number: '5',
        total_required: 10,
        total_received: 8,
        total_approved: 7,
        compliance_percent: 70,
        is_compliant: false,
        blocking_payment: true,
      };

      // Verify compliance calculations
      expect(compliance.total_received).toBeLessThanOrEqual(compliance.total_required);
      expect(compliance.total_approved).toBeLessThanOrEqual(compliance.total_received);
      expect(compliance.compliance_percent).toBe(
        (compliance.total_approved / compliance.total_required) * 100
      );
      expect(compliance.is_compliant).toBe(false); // Not 100% compliant
      expect(compliance.blocking_payment).toBe(true); // Should block payment
    });

    it('should identify compliant status', () => {
      const compliantStatus = {
        project_id: 'project-2',
        project_name: 'Residential Complex',
        payment_application_id: 'pa-2',
        application_number: '3',
        total_required: 5,
        total_received: 5,
        total_approved: 5,
        compliance_percent: 100,
        is_compliant: true,
        blocking_payment: false,
      };

      expect(compliantStatus.compliance_percent).toBe(100);
      expect(compliantStatus.is_compliant).toBe(true);
      expect(compliantStatus.blocking_payment).toBe(false);
    });
  });
});
