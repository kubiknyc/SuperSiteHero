/**
 * Subcontractor Portal Types Tests
 * Tests for subcontractor portal type structures and constants
 */

import { describe, it, expect } from 'vitest'
import type {
  SubcontractorRole,
  ComplianceDocumentType,
  ComplianceDocumentStatus,
  InvitationStatus,
  BidStatus,
  PunchItemStatus,
  TaskStatus,
  SubcontractorPortalAccess,
  SubcontractorComplianceDocument,
  SubcontractorInvitation,
  SubcontractorBid,
  SubcontractorPunchItem,
  SubcontractorTask,
  SubcontractorStats,
  SubcontractorProject,
  SubcontractorPermissions,
  SubcontractorDashboardData,
  ComplianceDocumentsFilter,
  BidsFilter,
  SubcontractorItemsFilter,
} from './subcontractor-portal'

// ============================================================================
// TYPE VALIDATION TESTS
// ============================================================================

describe('Subcontractor Portal Types', () => {
  describe('Role Type', () => {
    it('should only allow subcontractor role', () => {
      const role: SubcontractorRole = 'subcontractor'
      expect(role).toBe('subcontractor')
    })
  })

  describe('ComplianceDocumentType', () => {
    it('should include all document types', () => {
      const types: ComplianceDocumentType[] = [
        'insurance_certificate',
        'license',
        'w9',
        'bond',
        'safety_cert',
        'other',
      ]
      expect(types).toHaveLength(6)
    })
  })

  describe('ComplianceDocumentStatus', () => {
    it('should include all status values', () => {
      const statuses: ComplianceDocumentStatus[] = ['pending', 'approved', 'rejected', 'expired']
      expect(statuses).toHaveLength(4)
    })
  })

  describe('InvitationStatus', () => {
    it('should include all invitation statuses', () => {
      const statuses: InvitationStatus[] = ['pending', 'accepted', 'expired', 'cancelled']
      expect(statuses).toHaveLength(4)
    })
  })

  describe('BidStatus', () => {
    it('should include all bid statuses', () => {
      const statuses: BidStatus[] = [
        'pending',
        'draft',
        'submitted',
        'awarded',
        'rejected',
        'declined',
      ]
      expect(statuses).toHaveLength(6)
    })
  })

  describe('PunchItemStatus', () => {
    it('should include all punch item statuses', () => {
      const statuses: PunchItemStatus[] = [
        'open',
        'in_progress',
        'ready_for_review',
        'completed',
        'verified',
        'rejected',
      ]
      expect(statuses).toHaveLength(6)
    })
  })

  describe('TaskStatus', () => {
    it('should include all task statuses', () => {
      const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
      expect(statuses).toHaveLength(4)
    })
  })
})

// ============================================================================
// INTERFACE STRUCTURE TESTS
// ============================================================================

describe('Interface Structures', () => {
  describe('SubcontractorPortalAccess', () => {
    it('should have all required properties', () => {
      const access: SubcontractorPortalAccess = {
        id: 'access-1',
        subcontractor_id: 'sub-1',
        user_id: 'user-1',
        project_id: 'project-1',
        can_view_scope: true,
        can_view_documents: true,
        can_submit_bids: true,
        can_view_schedule: false,
        can_update_punch_items: true,
        can_update_tasks: true,
        can_upload_documents: true,
        invited_by: 'inviter-1',
        invited_at: '2024-01-01T00:00:00Z',
        accepted_at: '2024-01-02T00:00:00Z',
        expires_at: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      expect(access.id).toBe('access-1')
      expect(access.can_view_scope).toBe(true)
      expect(access.is_active).toBe(true)
    })

    it('should have all permission flags', () => {
      const access: SubcontractorPortalAccess = {
        id: 'access-1',
        subcontractor_id: 'sub-1',
        user_id: 'user-1',
        project_id: 'project-1',
        can_view_scope: false,
        can_view_documents: false,
        can_submit_bids: false,
        can_view_schedule: false,
        can_update_punch_items: false,
        can_update_tasks: false,
        can_upload_documents: false,
        invited_by: null,
        invited_at: '2024-01-01T00:00:00Z',
        accepted_at: null,
        expires_at: '2024-12-31T00:00:00Z',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      // All permissions disabled
      expect(access.can_view_scope).toBe(false)
      expect(access.can_submit_bids).toBe(false)
      expect(access.is_active).toBe(false)
    })
  })

  describe('SubcontractorComplianceDocument', () => {
    it('should have all required properties', () => {
      const doc: SubcontractorComplianceDocument = {
        id: 'doc-1',
        subcontractor_id: 'sub-1',
        project_id: 'project-1',
        document_type: 'insurance_certificate',
        document_name: 'General Liability Insurance',
        description: 'GL coverage for project',
        file_url: 'https://storage.example.com/doc.pdf',
        file_size: 256000,
        mime_type: 'application/pdf',
        issue_date: '2024-01-01',
        expiration_date: '2025-01-01',
        is_expired: false,
        expiration_warning_sent: false,
        coverage_amount: 1000000,
        policy_number: 'POL-123',
        provider_name: 'ABC Insurance',
        status: 'approved',
        reviewed_by: 'reviewer-1',
        reviewed_at: '2024-01-02T00:00:00Z',
        rejection_notes: null,
        uploaded_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        deleted_at: null,
      }

      expect(doc.document_type).toBe('insurance_certificate')
      expect(doc.status).toBe('approved')
      expect(doc.coverage_amount).toBe(1000000)
    })

    it('should handle minimal compliance document', () => {
      const minimalDoc: SubcontractorComplianceDocument = {
        id: 'doc-2',
        subcontractor_id: 'sub-1',
        project_id: null,
        document_type: 'other',
        document_name: 'Other Document',
        description: null,
        file_url: 'https://example.com/doc.pdf',
        file_size: null,
        mime_type: null,
        issue_date: null,
        expiration_date: null,
        is_expired: false,
        expiration_warning_sent: false,
        coverage_amount: null,
        policy_number: null,
        provider_name: null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        rejection_notes: null,
        uploaded_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      expect(minimalDoc.project_id).toBeNull()
      expect(minimalDoc.coverage_amount).toBeNull()
    })
  })

  describe('SubcontractorInvitation', () => {
    it('should have all required properties', () => {
      const invitation: SubcontractorInvitation = {
        id: 'inv-1',
        subcontractor_id: 'sub-1',
        project_id: 'project-1',
        email: 'contractor@example.com',
        token: 'abc123xyz',
        status: 'pending',
        invited_by: 'admin-1',
        invited_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z',
        accepted_at: null,
        accepted_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      expect(invitation.status).toBe('pending')
      expect(invitation.token).toBe('abc123xyz')
    })
  })

  describe('SubcontractorBid', () => {
    it('should have all required properties', () => {
      const bid: SubcontractorBid = {
        id: 'bid-1',
        project_id: 'project-1',
        subcontractor_id: 'sub-1',
        workflow_item_id: 'item-1',
        bid_status: 'submitted',
        lump_sum_cost: 50000,
        duration_days: 30,
        notes: 'Includes all materials',
        exclusions: 'Permits not included',
        submitted_at: '2024-01-15T00:00:00Z',
        submitted_by: 'user-1',
        is_awarded: false,
        awarded_at: null,
        awarded_by: null,
        supporting_documents: ['doc-1', 'doc-2'],
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      }

      expect(bid.bid_status).toBe('submitted')
      expect(bid.lump_sum_cost).toBe(50000)
      expect(bid.supporting_documents).toHaveLength(2)
    })

    it('should handle awarded bid', () => {
      const awardedBid: SubcontractorBid = {
        id: 'bid-2',
        project_id: 'project-1',
        subcontractor_id: 'sub-1',
        workflow_item_id: 'item-1',
        bid_status: 'awarded',
        lump_sum_cost: 75000,
        duration_days: 45,
        notes: null,
        exclusions: null,
        submitted_at: '2024-01-15T00:00:00Z',
        submitted_by: 'user-1',
        is_awarded: true,
        awarded_at: '2024-01-20T00:00:00Z',
        awarded_by: 'pm-1',
        supporting_documents: null,
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
      }

      expect(awardedBid.is_awarded).toBe(true)
      expect(awardedBid.awarded_by).toBe('pm-1')
    })
  })

  describe('SubcontractorPunchItem', () => {
    it('should have all required properties', () => {
      const punchItem: SubcontractorPunchItem = {
        id: 'punch-1',
        project_id: 'project-1',
        subcontractor_id: 'sub-1',
        title: 'Fix drywall crack',
        trade: 'Drywall',
        description: 'Repair crack in hallway wall',
        priority: 'high',
        status: 'open',
        building: 'Building A',
        floor: '2nd Floor',
        room: 'Hallway',
        area: 'North Wing',
        location_notes: 'Near elevator',
        due_date: '2024-02-01',
        completed_date: null,
        marked_complete_by: null,
        marked_complete_at: null,
        verified_by: null,
        verified_at: null,
        rejection_notes: null,
        created_at: '2024-01-15T00:00:00Z',
        created_by: 'inspector-1',
      }

      expect(punchItem.status).toBe('open')
      expect(punchItem.priority).toBe('high')
    })

    it('should handle null priority', () => {
      const punchItem: SubcontractorPunchItem = {
        id: 'punch-2',
        project_id: 'project-1',
        subcontractor_id: null,
        title: 'General inspection item',
        trade: null,
        description: null,
        priority: null,
        status: 'open',
        building: null,
        floor: null,
        room: null,
        area: null,
        location_notes: null,
        due_date: null,
        completed_date: null,
        marked_complete_by: null,
        marked_complete_at: null,
        verified_by: null,
        verified_at: null,
        rejection_notes: null,
        created_at: '2024-01-15T00:00:00Z',
        created_by: null,
      }

      expect(punchItem.priority).toBeNull()
      expect(punchItem.subcontractor_id).toBeNull()
    })
  })

  describe('SubcontractorTask', () => {
    it('should have all required properties', () => {
      const task: SubcontractorTask = {
        id: 'task-1',
        project_id: 'project-1',
        assigned_to_subcontractor_id: 'sub-1',
        title: 'Install HVAC unit',
        description: 'Install unit in mechanical room',
        location: 'Mechanical Room B',
        priority: 'normal',
        status: 'in_progress',
        start_date: '2024-01-20',
        due_date: '2024-01-25',
        completed_date: null,
        created_at: '2024-01-15T00:00:00Z',
        created_by: 'pm-1',
      }

      expect(task.status).toBe('in_progress')
      expect(task.priority).toBe('normal')
    })
  })

  describe('SubcontractorStats', () => {
    it('should have all stat properties', () => {
      const stats: SubcontractorStats = {
        total_projects: 5,
        pending_bids: 3,
        open_punch_items: 12,
        open_tasks: 8,
        expiring_documents: 2,
        overdue_items: 1,
      }

      expect(stats.total_projects).toBe(5)
      expect(stats.pending_bids).toBe(3)
      expect(stats.overdue_items).toBe(1)
    })
  })

  describe('SubcontractorProject', () => {
    it('should have project and permission data', () => {
      const permissions: SubcontractorPermissions = {
        can_view_scope: true,
        can_view_documents: true,
        can_submit_bids: true,
        can_view_schedule: true,
        can_update_punch_items: true,
        can_update_tasks: true,
        can_upload_documents: true,
      }

      const project: SubcontractorProject = {
        id: 'project-1',
        name: 'Office Building',
        address: '123 Main St',
        status: 'active',
        trade: 'Electrical',
        scope_of_work: 'Full electrical installation',
        contract_amount: 150000,
        contract_start_date: '2024-01-01',
        contract_end_date: '2024-06-30',
        punch_item_count: 5,
        task_count: 10,
        pending_bid_count: 2,
        permissions,
      }

      expect(project.trade).toBe('Electrical')
      expect(project.permissions.can_submit_bids).toBe(true)
    })
  })

  describe('SubcontractorDashboardData', () => {
    it('should aggregate all dashboard data', () => {
      const dashboard: SubcontractorDashboardData = {
        subcontractor: {
          id: 'sub-1',
          company_name: 'ABC Electric',
          trade: 'Electrical',
          contact_id: 'contact-1',
        },
        stats: {
          total_projects: 3,
          pending_bids: 2,
          open_punch_items: 5,
          open_tasks: 3,
          expiring_documents: 1,
          overdue_items: 0,
        },
        projects: [],
        pending_bids: [],
        recent_punch_items: [],
        recent_tasks: [],
        expiring_documents: [],
      }

      expect(dashboard.subcontractor.company_name).toBe('ABC Electric')
      expect(dashboard.stats.total_projects).toBe(3)
    })
  })
})

// ============================================================================
// FILTER TYPES TESTS
// ============================================================================

describe('Filter Types', () => {
  describe('ComplianceDocumentsFilter', () => {
    it('should support all filter options', () => {
      const filter: ComplianceDocumentsFilter = {
        subcontractor_id: 'sub-1',
        project_id: 'project-1',
        document_type: 'insurance_certificate',
        status: 'approved',
        expiring_within_days: 30,
      }

      expect(filter.document_type).toBe('insurance_certificate')
      expect(filter.expiring_within_days).toBe(30)
    })

    it('should support array filters', () => {
      const filter: ComplianceDocumentsFilter = {
        document_type: ['insurance_certificate', 'license'],
        status: ['pending', 'approved'],
      }

      expect(filter.document_type).toHaveLength(2)
      expect(filter.status).toHaveLength(2)
    })
  })

  describe('BidsFilter', () => {
    it('should support all filter options', () => {
      const filter: BidsFilter = {
        project_id: 'project-1',
        status: 'pending',
        subcontractor_id: 'sub-1',
      }

      expect(filter.status).toBe('pending')
    })

    it('should support array status filter', () => {
      const filter: BidsFilter = {
        status: ['pending', 'submitted', 'awarded'],
      }

      expect(filter.status).toHaveLength(3)
    })
  })

  describe('SubcontractorItemsFilter', () => {
    it('should support all filter options', () => {
      const filter: SubcontractorItemsFilter = {
        project_id: 'project-1',
        status: 'open',
        priority: 'high',
        due_date_from: '2024-01-01',
        due_date_to: '2024-01-31',
        search: 'drywall',
      }

      expect(filter.priority).toBe('high')
      expect(filter.search).toBe('drywall')
    })

    it('should support array filters', () => {
      const filter: SubcontractorItemsFilter = {
        status: ['open', 'in_progress'],
        priority: ['high', 'normal'],
      }

      expect(filter.status).toHaveLength(2)
      expect(filter.priority).toHaveLength(2)
    })
  })
})
