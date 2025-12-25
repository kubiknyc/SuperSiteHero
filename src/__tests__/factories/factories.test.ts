/**
 * Factory Tests
 * Verify that all mock data factories work correctly
 */

import { describe, it, expect } from 'vitest';

// Import all factories
import {
  // User factory
  createMockUser,
  createMockAuthUser,
  createMockSession,
  createMockSuperintendent,
  createMockAdmin,
  createMockProjectManager,
  createMockForeman,
  createMockViewer,
  createMockUsers,
  createMockUserWithAuth,
  TEST_USERS,

  // Project factory
  createMockProject,
  createMockProjectAssignment,
  createMockActiveProject,
  createMockCompletedProject,
  createMockOnHoldProject,
  createMockPreConstructionProject,
  createMockProjects,
  createMockProjectWithAssignments,
  TEST_PROJECTS,

  // Daily Report factory
  createMockDailyReport,
  createMockWorkforceEntry,
  createMockEquipmentEntry,
  createMockDelayEntry,
  createMockSafetyIncident,
  createMockInspectionEntry,
  createMockPhotoEntry,
  createMockDeliveryEntry,
  createMockDraftReport,
  createMockSubmittedReport,
  createMockApprovedReport,
  createMockDailyReports,
  createMockDailyReportWithEntries,
  TEST_DAILY_REPORTS,

  // Document factory
  createMockDocument,
  createMockDocumentFolder,
  createMockDocumentVersion,
  createMockDrawing,
  createMockDrawingSet,
  createMockApprovedDocument,
  createMockRejectedDocument,
  createMockDocuments,
  createMockDrawings,
  createMockFolderWithDocuments,
  createMockDrawingSetWithDrawings,
  TEST_DOCUMENTS,
  TEST_DRAWINGS,

  // DocuSign factory
  createMockDSConnection,
  createMockDSEnvelope,
  createMockDSRecipient,
  createMockDSEnvelopeDocument,
  createMockDSEnvelopeEvent,
  createMockDSConnectionStatus,
  createMockDSEnvelopeStats,
  createMockDSOAuthTokens,
  createMockDSUserInfo,
  createMockDSAccountInfo,
  createMockActiveDSConnection,
  createMockInactiveDSConnection,
  createMockDemoDSConnection,
  createMockErrorDSConnection,
  createMockCompletedDSEnvelope,
  createMockPendingDSEnvelope,
  createMockDeclinedDSEnvelope,
  createMockDSEnvelopes,
  createMockDSEnvelopeWithDetails,
  TEST_DOCUSIGN,
} from './index';

describe('User Factory', () => {
  it('should create a mock user with default values', () => {
    const user = createMockUser();

    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.full_name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.company_id).toBeDefined();
    expect(user.is_active).toBe(true);
    expect(user.created_at).toBeDefined();
    expect(user.updated_at).toBeDefined();
  });

  it('should create a mock user with custom values', () => {
    const user = createMockUser({
      id: 'custom-id',
      email: 'custom@test.com',
      role: 'admin',
    });

    expect(user.id).toBe('custom-id');
    expect(user.email).toBe('custom@test.com');
    expect(user.role).toBe('admin');
  });

  it('should create role-specific users', () => {
    expect(createMockSuperintendent().role).toBe('superintendent');
    expect(createMockAdmin().role).toBe('admin');
    expect(createMockProjectManager().role).toBe('project_manager');
    expect(createMockForeman().role).toBe('foreman');
    expect(createMockViewer().role).toBe('viewer');
  });

  it('should create multiple users', () => {
    const users = createMockUsers(5);
    expect(users).toHaveLength(5);
    users.forEach((user) => {
      expect(user.id).toBeDefined();
    });
  });

  it('should create a user with auth', () => {
    const { authUser, profile, session } = createMockUserWithAuth();

    expect(authUser.id).toBe(profile.id);
    expect(authUser.email).toBe(profile.email);
    expect(session.user.id).toBe(authUser.id);
  });

  it('should have valid test users', () => {
    expect(TEST_USERS.admin.role).toBe('admin');
    expect(TEST_USERS.superintendent.role).toBe('superintendent');
    expect(TEST_USERS.projectManager.role).toBe('project_manager');
    expect(TEST_USERS.foreman.role).toBe('foreman');
    expect(TEST_USERS.viewer.role).toBe('viewer');
  });

  it('should create a mock auth user', () => {
    const authUser = createMockAuthUser();

    expect(authUser.id).toBeDefined();
    expect(authUser.email).toBeDefined();
    expect(authUser.role).toBe('authenticated');
    expect(authUser.aud).toBe('authenticated');
  });

  it('should create a mock session', () => {
    const session = createMockSession();

    expect(session.access_token).toBeDefined();
    expect(session.refresh_token).toBeDefined();
    expect(session.expires_in).toBe(3600);
    expect(session.user).toBeDefined();
  });
});

describe('Project Factory', () => {
  it('should create a mock project with default values', () => {
    const project = createMockProject();

    expect(project.id).toBeDefined();
    expect(project.name).toBeDefined();
    expect(project.project_number).toBeDefined();
    expect(project.status).toBeDefined();
    expect(project.company_id).toBeDefined();
    expect(project.created_at).toBeDefined();
  });

  it('should create projects with specific statuses', () => {
    expect(createMockActiveProject().status).toBe('active');
    expect(createMockCompletedProject().status).toBe('completed');
    expect(createMockOnHoldProject().status).toBe('on_hold');
    expect(createMockPreConstructionProject().status).toBe('pre_construction');
  });

  it('should create multiple projects', () => {
    const projects = createMockProjects(3);
    expect(projects).toHaveLength(3);
  });

  it('should create project with assignments', () => {
    const { project, assignments } = createMockProjectWithAssignments({}, ['user-1', 'user-2']);

    expect(project.id).toBeDefined();
    expect(assignments).toHaveLength(2);
    expect(assignments[0].project_id).toBe(project.id);
    expect(assignments[1].project_id).toBe(project.id);
  });

  it('should have valid test projects', () => {
    expect(TEST_PROJECTS.active.status).toBe('active');
    expect(TEST_PROJECTS.completed.status).toBe('completed');
    expect(TEST_PROJECTS.onHold.status).toBe('on_hold');
    expect(TEST_PROJECTS.preCon.status).toBe('pre_construction');
  });
});

describe('Daily Report Factory', () => {
  it('should create a mock daily report with default values', () => {
    const report = createMockDailyReport();

    expect(report.id).toBeDefined();
    expect(report.project_id).toBeDefined();
    expect(report.report_date).toBeDefined();
    expect(report.reporter_id).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.mode).toBeDefined();
  });

  it('should create reports with specific statuses', () => {
    expect(createMockDraftReport().status).toBe('draft');
    expect(createMockSubmittedReport().status).toBe('submitted');
    expect(createMockApprovedReport().status).toBe('approved');
  });

  it('should create submitted report with signature data', () => {
    const report = createMockSubmittedReport();

    expect(report.submitted_by_signature).toBeDefined();
    expect(report.submitted_by_name).toBeDefined();
    expect(report.submitted_at).toBeDefined();
  });

  it('should create workforce entries', () => {
    const entry = createMockWorkforceEntry();

    expect(entry.id).toBeDefined();
    expect(entry.daily_report_id).toBeDefined();
    expect(entry.entry_type).toBeDefined();
    expect(entry.trade).toBeDefined();
  });

  it('should create equipment entries', () => {
    const entry = createMockEquipmentEntry();

    expect(entry.id).toBeDefined();
    expect(entry.equipment_type).toBeDefined();
    expect(entry.quantity).toBeDefined();
  });

  it('should create delay entries', () => {
    const entry = createMockDelayEntry();

    expect(entry.id).toBeDefined();
    expect(entry.delay_type).toBeDefined();
    expect(entry.description).toBeDefined();
  });

  it('should create safety incidents', () => {
    const incident = createMockSafetyIncident();

    expect(incident.id).toBeDefined();
    expect(incident.incident_type).toBeDefined();
    expect(incident.description).toBeDefined();
  });

  it('should create inspection entries', () => {
    const entry = createMockInspectionEntry();

    expect(entry.id).toBeDefined();
    expect(entry.inspection_type).toBeDefined();
    expect(entry.result).toBeDefined();
  });

  it('should create photo entries', () => {
    const entry = createMockPhotoEntry();

    expect(entry.id).toBeDefined();
    expect(entry.file_url).toBeDefined();
    expect(entry.category).toBeDefined();
  });

  it('should create delivery entries', () => {
    const entry = createMockDeliveryEntry();

    expect(entry.id).toBeDefined();
    expect(entry.material_description).toBeDefined();
    expect(entry.inspection_status).toBeDefined();
  });

  it('should create complete report with entries', () => {
    const { report, workforce, equipment, delays, incidents, inspections, photos, deliveries } =
      createMockDailyReportWithEntries();

    expect(report.id).toBeDefined();
    expect(workforce.length).toBeGreaterThanOrEqual(2);
    expect(equipment.length).toBeGreaterThanOrEqual(1);
    expect(photos.length).toBeGreaterThanOrEqual(3);

    // Verify all entries are linked to the report
    workforce.forEach((entry) => {
      expect(entry.daily_report_id).toBe(report.id);
    });
  });
});

describe('Document Factory', () => {
  it('should create a mock document with default values', () => {
    const doc = createMockDocument();

    expect(doc.id).toBeDefined();
    expect(doc.name).toBeDefined();
    expect(doc.file_url).toBeDefined();
    expect(doc.document_type).toBeDefined();
    expect(doc.status).toBeDefined();
  });

  it('should create approved and rejected documents', () => {
    const approved = createMockApprovedDocument();
    const rejected = createMockRejectedDocument();

    expect(approved.status).toBe('approved');
    expect(approved.approved_by).toBeDefined();

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejection_reason).toBeDefined();
  });

  it('should create document folders', () => {
    const folder = createMockDocumentFolder();

    expect(folder.id).toBeDefined();
    expect(folder.name).toBeDefined();
    expect(folder.path).toBeDefined();
  });

  it('should create document versions', () => {
    const version = createMockDocumentVersion({ version: 2 });

    expect(version.version).toBe(2);
    expect(version.version_label).toBe('v2.0');
  });

  it('should create drawings', () => {
    const drawing = createMockDrawing();

    expect(drawing.id).toBeDefined();
    expect(drawing.drawing_number).toBeDefined();
    expect(drawing.discipline).toBeDefined();
    expect(drawing.revision).toBeDefined();
  });

  it('should create drawing sets', () => {
    const set = createMockDrawingSet();

    expect(set.id).toBeDefined();
    expect(set.name).toBeDefined();
    expect(set.sheet_count).toBeDefined();
    expect(set.disciplines).toBeDefined();
  });

  it('should create folder with documents', () => {
    const { folder, documents } = createMockFolderWithDocuments({}, 5);

    expect(folder.id).toBeDefined();
    expect(documents).toHaveLength(5);
    documents.forEach((doc) => {
      expect(doc.folder_id).toBe(folder.id);
    });
  });

  it('should create drawing set with drawings', () => {
    const { set, drawings } = createMockDrawingSetWithDrawings({}, 10);

    expect(set.id).toBeDefined();
    expect(drawings).toHaveLength(10);
    drawings.forEach((drawing) => {
      expect(drawing.drawing_set_id).toBe(set.id);
    });
  });
});

describe('DocuSign Factory', () => {
  it('should create a mock connection', () => {
    const connection = createMockDSConnection();

    expect(connection.id).toBeDefined();
    expect(connection.account_id).toBeDefined();
    expect(connection.base_uri).toBeDefined();
  });

  it('should create connections with different states', () => {
    const active = createMockActiveDSConnection();
    const inactive = createMockInactiveDSConnection();
    const demo = createMockDemoDSConnection();
    const error = createMockErrorDSConnection('Token expired');

    expect(active.is_active).toBe(true);
    expect(inactive.is_active).toBe(false);
    expect(demo.is_demo).toBe(true);
    expect(error.connection_error).toBe('Token expired');
  });

  it('should create mock envelopes', () => {
    const envelope = createMockDSEnvelope();

    expect(envelope.id).toBeDefined();
    expect(envelope.envelope_id).toBeDefined();
    expect(envelope.document_type).toBeDefined();
    expect(envelope.status).toBeDefined();
  });

  it('should create envelopes with different statuses', () => {
    const completed = createMockCompletedDSEnvelope();
    const pending = createMockPendingDSEnvelope();
    const declined = createMockDeclinedDSEnvelope();

    expect(completed.status).toBe('completed');
    expect(pending.status).toBe('sent');
    expect(declined.status).toBe('declined');
  });

  it('should create mock recipients', () => {
    const recipient = createMockDSRecipient();

    expect(recipient.id).toBeDefined();
    expect(recipient.email).toBeDefined();
    expect(recipient.name).toBeDefined();
    expect(recipient.recipient_type).toBeDefined();
    expect(recipient.status).toBeDefined();
  });

  it('should create envelope with details', () => {
    const { envelope, recipients, documents, events } = createMockDSEnvelopeWithDetails();

    expect(envelope.id).toBeDefined();
    expect(recipients.length).toBeGreaterThanOrEqual(1);
    expect(documents.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeGreaterThanOrEqual(2);

    // Verify relationships
    recipients.forEach((r) => {
      expect(r.envelope_db_id).toBe(envelope.id);
    });
    documents.forEach((d) => {
      expect(d.envelope_db_id).toBe(envelope.id);
    });
  });

  it('should create connection status', () => {
    const status = createMockDSConnectionStatus({ isConnected: true });

    expect(status.isConnected).toBe(true);
    expect(status.connectionId).toBeDefined();
    expect(status.accountId).toBeDefined();
  });

  it('should create envelope stats', () => {
    const stats = createMockDSEnvelopeStats();

    expect(stats.total).toBeDefined();
    expect(stats.pending).toBeDefined();
    expect(stats.completed).toBeDefined();
    expect(stats.byDocumentType).toBeDefined();
    expect(stats.byDocumentType.payment_application).toBeDefined();
  });

  it('should create OAuth tokens', () => {
    const tokens = createMockDSOAuthTokens();

    expect(tokens.access_token).toBeDefined();
    expect(tokens.refresh_token).toBeDefined();
    expect(tokens.token_type).toBe('Bearer');
  });

  it('should create user info', () => {
    const userInfo = createMockDSUserInfo();

    expect(userInfo.email).toBeDefined();
    expect(userInfo.name).toBeDefined();
    expect(userInfo.accounts).toBeDefined();
    expect(userInfo.accounts.length).toBeGreaterThanOrEqual(1);
  });
});
