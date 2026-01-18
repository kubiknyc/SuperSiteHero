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

  // Dashboard factory
  createMockDashboardStats,
  createEmptyDashboardStats,
  createCriticalDashboardStats,
  createMockDashboardActionItem,
  createOverdueActionItem,
  createUrgentActionItem,
  createMockDashboardActionItems,
  createMixedActionItems,
  createMockProjectStats,
  createEmptyProjectStats,
  createMockCountResponse,
  createMockDataResponse,
  createMockErrorResponse,
  TEST_DASHBOARD_STATS,
  TEST_ACTION_ITEMS_DASHBOARD,
  TEST_PROJECT_STATS,

  // Procurement factory
  createMockVendor,
  createMockVendors,
  createInactiveVendor,
  createUnapprovedVendor,
  createMockPurchaseOrder,
  createMockPurchaseOrders,
  createDraftPO,
  createApprovedPO,
  createOrderedPO,
  createCancelledPO,
  createMockPOLineItem,
  createMockPOLineItems,
  createPartiallyReceivedLineItem,
  createReceivedLineItem,
  createMockPOReceipt,
  createMockPOReceipts,
  createDamagedReceipt,
  createMockProcurementStats,
  createEmptyProcurementStats,
  createVendorDTO,
  createUpdateVendorDTO,
  createPurchaseOrderDTO,
  createUpdatePurchaseOrderDTO,
  createLineItemDTO,
  createUpdateLineItemDTO,
  createReceiptDTO,
  createVendorFilters,
  createPurchaseOrderFilters,
  TEST_PROCUREMENT_DATA,

  // Owner Invoice factory
  createMockOwnerInvoice,
  createDraftInvoice,
  createSentInvoice,
  createOverdueInvoice,
  createPaidInvoice,
  createMockOwnerInvoices,
  createMixedInvoices,
  createMockInvoiceWithDetails,
  createMockLineItem,
  createMockLineItems,
  createMockPayment,
  createMockPayments,
  createMockInvoiceStats,
  createEmptyInvoiceStats,
  createMockAgingItem,
  createMockAgingSummary,
  createMockAgingReport,
  createMockSingleResponse,
  TEST_INVOICES,
  TEST_INVOICE_STATS,
  TEST_AGING_REPORT,
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

describe('Dashboard Factory', () => {
  it('should create mock dashboard stats with default values', () => {
    const stats = createMockDashboardStats();

    expect(stats.tasks).toBeDefined();
    expect(stats.tasks.pending).toBe(10);
    expect(stats.tasks.inProgress).toBe(5);
    expect(stats.tasks.completed).toBe(25);
    expect(stats.tasks.overdue).toBe(2);
    expect(stats.tasks.total).toBe(42);
    expect(stats.tasks.trend).toHaveLength(5);

    expect(stats.rfis).toBeDefined();
    expect(stats.rfis.open).toBe(8);
    expect(stats.rfis.total).toBe(24);

    expect(stats.punchItems).toBeDefined();
    expect(stats.safety).toBeDefined();
    expect(stats.changeOrders).toBeDefined();
    expect(stats.submittals).toBeDefined();
  });

  it('should create empty dashboard stats', () => {
    const stats = createEmptyDashboardStats();

    expect(stats.tasks.pending).toBe(0);
    expect(stats.tasks.total).toBe(0);
    expect(stats.rfis.open).toBe(0);
    expect(stats.punchItems.open).toBe(0);
    expect(stats.safety.daysSinceIncident).toBe(365);
    expect(stats.changeOrders.pending).toBe(0);
    expect(stats.submittals.pending).toBe(0);
  });

  it('should create critical dashboard stats', () => {
    const stats = createCriticalDashboardStats();

    expect(stats.tasks.overdue).toBe(15);
    expect(stats.rfis.overdue).toBe(10);
    expect(stats.punchItems.open).toBe(50);
    expect(stats.safety.daysSinceIncident).toBe(5);
    expect(stats.safety.openIncidents).toBe(2);
  });

  it('should create mock dashboard action items', () => {
    const item = createMockDashboardActionItem();

    expect(item.id).toBeDefined();
    expect(item.type).toBeDefined();
    expect(item.title).toBeDefined();
    expect(item.description).toBeDefined();
    expect(item.priority).toBeDefined();
    expect(item.projectId).toBeDefined();
    expect(item.link).toBeDefined();
  });

  it('should create overdue action item', () => {
    const item = createOverdueActionItem();

    expect(item.isOverdue).toBe(true);
    expect(item.priority).toBe('high');
    expect(new Date(item.dueDate!).getTime()).toBeLessThan(Date.now());
  });

  it('should create urgent action item', () => {
    const item = createUrgentActionItem();

    expect(item.priority).toBe('urgent');
    expect(item.isOverdue).toBe(true);
  });

  it('should create multiple action items', () => {
    const items = createMockDashboardActionItems(5);

    expect(items).toHaveLength(5);
    items.forEach((item) => {
      expect(item.id).toBeDefined();
    });
  });

  it('should create mixed action items', () => {
    const items = createMixedActionItems();

    expect(items.length).toBeGreaterThanOrEqual(4);

    const types = items.map((i) => i.type);
    expect(types).toContain('task');
    expect(types).toContain('rfi');
  });

  it('should create project stats', () => {
    const stats = createMockProjectStats();

    expect(stats.tasks).toBe(25);
    expect(stats.rfis).toBe(12);
    expect(stats.punchItems).toBe(45);
    expect(stats.dailyReports).toBe(30);
  });

  it('should create empty project stats', () => {
    const stats = createEmptyProjectStats();

    expect(stats.tasks).toBe(0);
    expect(stats.rfis).toBe(0);
    expect(stats.punchItems).toBe(0);
    expect(stats.dailyReports).toBe(0);
  });

  it('should create Supabase response mocks', () => {
    const countResponse = createMockCountResponse(42);
    expect(countResponse.count).toBe(42);
    expect(countResponse.error).toBeNull();

    const dataResponse = createMockDataResponse([{ id: '1' }, { id: '2' }]);
    expect(dataResponse.data).toHaveLength(2);
    expect(dataResponse.error).toBeNull();

    const errorResponse = createMockErrorResponse('Test error');
    expect(errorResponse.data).toBeNull();
    expect(errorResponse.error?.message).toBe('Test error');
  });

  it('should have valid test constants', () => {
    expect(TEST_DASHBOARD_STATS.DEFAULT).toBeDefined();
    expect(TEST_DASHBOARD_STATS.EMPTY).toBeDefined();
    expect(TEST_DASHBOARD_STATS.CRITICAL).toBeDefined();
    expect(TEST_ACTION_ITEMS_DASHBOARD.SINGLE).toBeDefined();
    expect(TEST_ACTION_ITEMS_DASHBOARD.OVERDUE).toBeDefined();
    expect(TEST_ACTION_ITEMS_DASHBOARD.MIXED).toBeDefined();
    expect(TEST_PROJECT_STATS.DEFAULT).toBeDefined();
  });
});

describe('Procurement Factory', () => {
  it('should create a mock vendor with default values', () => {
    const vendor = createMockVendor();

    expect(vendor.id).toBeDefined();
    expect(vendor.name).toBeDefined();
    expect(vendor.code).toBeDefined();
    expect(vendor.vendor_type).toBe('supplier');
    expect(vendor.is_active).toBe(true);
    expect(vendor.is_approved).toBe(true);
    expect(vendor.email).toBeDefined();
    expect(vendor.phone).toBeDefined();
  });

  it('should create vendor with custom values', () => {
    const vendor = createMockVendor({
      name: 'Custom Vendor',
      vendor_type: 'subcontractor',
      is_active: false,
    });

    expect(vendor.name).toBe('Custom Vendor');
    expect(vendor.vendor_type).toBe('subcontractor');
    expect(vendor.is_active).toBe(false);
  });

  it('should create inactive and unapproved vendors', () => {
    const inactive = createInactiveVendor();
    const unapproved = createUnapprovedVendor();

    expect(inactive.is_active).toBe(false);
    expect(unapproved.is_approved).toBe(false);
  });

  it('should create multiple vendors', () => {
    const vendors = createMockVendors(5);

    expect(vendors).toHaveLength(5);
    vendors.forEach((v) => {
      expect(v.id).toBeDefined();
    });
  });

  it('should create purchase orders with all statuses', () => {
    const draft = createDraftPO();
    const approved = createApprovedPO();
    const ordered = createOrderedPO();
    const cancelled = createCancelledPO();

    expect(draft.status).toBe('draft');
    expect(approved.status).toBe('approved');
    expect(approved.approved_by).toBeDefined();
    expect(ordered.status).toBe('ordered');
    expect(ordered.order_date).toBeDefined();
    expect(cancelled.status).toBe('cancelled');
  });

  it('should create purchase order with default values', () => {
    const po = createMockPurchaseOrder();

    expect(po.id).toBeDefined();
    expect(po.po_number).toBeDefined();
    expect(po.project_id).toBeDefined();
    expect(po.total_amount).toBeDefined();
    expect(po.vendor_name).toBeDefined();
    expect(po.project_name).toBeDefined();
  });

  it('should create multiple purchase orders', () => {
    const pos = createMockPurchaseOrders(3);

    expect(pos).toHaveLength(3);
    pos.forEach((po) => {
      expect(po.id).toBeDefined();
      expect(po.po_number).toBeDefined();
    });
  });

  it('should create line items with receiving status', () => {
    const pending = createMockPOLineItem();
    const partial = createPartiallyReceivedLineItem();
    const received = createReceivedLineItem();

    expect(pending.status).toBe('pending');
    expect(pending.quantity_received).toBe(0);

    expect(partial.status).toBe('partially_received');
    expect(partial.quantity_received).toBeGreaterThan(0);
    expect(partial.quantity_received).toBeLessThan(partial.quantity);

    expect(received.status).toBe('received');
    expect(received.quantity_received).toBe(received.quantity);
  });

  it('should create multiple line items', () => {
    const items = createMockPOLineItems(5);

    expect(items).toHaveLength(5);
    items.forEach((item, index) => {
      expect(item.line_number).toBe(index + 1);
    });
  });

  it('should create receipts with condition types', () => {
    const good = createMockPOReceipt();
    const damaged = createDamagedReceipt();

    expect(good.condition).toBe('good');
    expect(damaged.condition).toBe('damaged');
  });

  it('should create multiple receipts', () => {
    const receipts = createMockPOReceipts(3);

    expect(receipts).toHaveLength(3);
    receipts.forEach((r) => {
      expect(r.id).toBeDefined();
      expect(r.quantity_received).toBeDefined();
    });
  });

  it('should create procurement stats', () => {
    const stats = createMockProcurementStats();

    expect(stats.total_pos).toBe(45);
    expect(stats.total_value).toBe(500000);
    expect(stats.by_status).toBeDefined();
    expect(stats.pending_delivery).toBe(18);
    expect(stats.unique_vendors).toBe(12);
  });

  it('should create empty procurement stats', () => {
    const stats = createEmptyProcurementStats();

    expect(stats.total_pos).toBe(0);
    expect(stats.total_value).toBe(0);
    expect(stats.pending_delivery).toBe(0);
  });

  it('should create DTOs for create/update operations', () => {
    const vendorDTO = createVendorDTO({ name: 'New Vendor' });
    expect(vendorDTO.name).toBe('New Vendor');
    expect(vendorDTO.vendor_type).toBe('supplier');

    const updateVendorDTO = createUpdateVendorDTO({ is_active: false });
    expect(updateVendorDTO.is_active).toBe(false);

    const poDTO = createPurchaseOrderDTO({ project_id: 'proj-123' });
    expect(poDTO.project_id).toBe('proj-123');

    const lineItemDTO = createLineItemDTO({ quantity: 50 });
    expect(lineItemDTO.quantity).toBe(50);

    const receiptDTO = createReceiptDTO({ condition: 'damaged' });
    expect(receiptDTO.condition).toBe('damaged');
  });

  it('should create filter objects', () => {
    const vendorFilters = createVendorFilters({ is_active: true, vendor_type: 'supplier' });
    expect(vendorFilters.is_active).toBe(true);
    expect(vendorFilters.vendor_type).toBe('supplier');

    const poFilters = createPurchaseOrderFilters({ status: 'approved' });
    expect(poFilters.status).toBe('approved');
  });

  it('should have valid test constants', () => {
    expect(TEST_PROCUREMENT_DATA.VENDOR).toBeDefined();
    expect(TEST_PROCUREMENT_DATA.VENDORS).toHaveLength(5);
    expect(TEST_PROCUREMENT_DATA.PO).toBeDefined();
    expect(TEST_PROCUREMENT_DATA.LINE_ITEM).toBeDefined();
    expect(TEST_PROCUREMENT_DATA.RECEIPT).toBeDefined();
    expect(TEST_PROCUREMENT_DATA.STATS).toBeDefined();
  });
});

describe('Owner Invoice Factory', () => {
  it('should create mock invoice with default values', () => {
    const invoice = createMockOwnerInvoice();

    expect(invoice.id).toBeDefined();
    expect(invoice.invoiceNumber).toBeDefined();
    expect(invoice.invoiceDate).toBeDefined();
    expect(invoice.dueDate).toBeDefined();
    expect(invoice.status).toBe('draft');
    expect(invoice.billToName).toBeDefined();
    expect(invoice.totalAmount).toBeDefined();
    expect(invoice.taxAmount).toBeDefined();
    expect(invoice.retainageAmount).toBeDefined();
  });

  it('should create invoices with all statuses', () => {
    const draft = createDraftInvoice();
    const sent = createSentInvoice();
    const overdue = createOverdueInvoice();
    const paid = createPaidInvoice();

    expect(draft.status).toBe('draft');
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toBeDefined();
    expect(sent.sentBy).toBeDefined();
    expect(overdue.status).toBe('overdue');
    expect(paid.status).toBe('paid');
    expect(paid.balanceDue).toBe(0);
  });

  it('should create multiple invoices', () => {
    const invoices = createMockOwnerInvoices(5);

    expect(invoices).toHaveLength(5);
    invoices.forEach((inv) => {
      expect(inv.id).toBeDefined();
      expect(inv.invoiceNumber).toBeDefined();
    });
  });

  it('should create mixed invoices', () => {
    const invoices = createMixedInvoices();

    expect(invoices.length).toBe(4);
    const statuses = invoices.map((i) => i.status);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('sent');
    expect(statuses).toContain('overdue');
    expect(statuses).toContain('paid');
  });

  it('should create invoice with details', () => {
    const invoice = createMockInvoiceWithDetails();

    expect(invoice.id).toBeDefined();
    expect(invoice.daysUntilDue).toBeDefined();
    expect(invoice.lineItemCount).toBe(3);
    expect(invoice.project).toBeDefined();
    expect(invoice.project.name).toBe('Test Project');
    expect(invoice.lineItems).toHaveLength(3);
  });

  it('should create line items', () => {
    const item = createMockLineItem();

    expect(item.id).toBeDefined();
    expect(item.description).toBeDefined();
    expect(item.quantity).toBeDefined();
    expect(item.unitPrice).toBeDefined();
    expect(item.amount).toBe(item.quantity * item.unitPrice);
    expect(item.laborAmount).toBeDefined();
    expect(item.materialAmount).toBeDefined();
  });

  it('should create multiple line items', () => {
    const items = createMockLineItems(5);

    expect(items).toHaveLength(5);
    items.forEach((item) => {
      expect(item.id).toBeDefined();
    });
  });

  it('should create payments', () => {
    const payment = createMockPayment();

    expect(payment.id).toBeDefined();
    expect(payment.paymentDate).toBeDefined();
    expect(payment.amount).toBeDefined();
    expect(payment.paymentMethod).toBe('check');
    expect(payment.referenceNumber).toBeDefined();
  });

  it('should create multiple payments', () => {
    const payments = createMockPayments(3);

    expect(payments).toHaveLength(3);
    payments.forEach((p) => {
      expect(p.id).toBeDefined();
      expect(p.amount).toBeDefined();
    });
  });

  it('should create invoice stats', () => {
    const stats = createMockInvoiceStats();

    expect(stats.draftCount).toBe(5);
    expect(stats.sentCount).toBe(12);
    expect(stats.overdueCount).toBe(3);
    expect(stats.paidCount).toBe(45);
    expect(stats.totalOutstanding).toBe(650000);
  });

  it('should create empty invoice stats', () => {
    const stats = createEmptyInvoiceStats();

    expect(stats.draftCount).toBe(0);
    expect(stats.sentCount).toBe(0);
    expect(stats.overdueCount).toBe(0);
    expect(stats.totalOutstanding).toBe(0);
  });

  it('should create aging items with correct buckets', () => {
    const current = createMockAgingItem({ daysOverdue: 0 });
    const days1To30 = createMockAgingItem({ daysOverdue: 15 });
    const days31To60 = createMockAgingItem({ daysOverdue: 45 });
    const days61To90 = createMockAgingItem({ daysOverdue: 75 });
    const days90Plus = createMockAgingItem({ daysOverdue: 120 });

    expect(current.agingBucket).toBe('current');
    expect(days1To30.agingBucket).toBe('1-30');
    expect(days31To60.agingBucket).toBe('31-60');
    expect(days61To90.agingBucket).toBe('61-90');
    expect(days90Plus.agingBucket).toBe('90+');
  });

  it('should create aging summary', () => {
    const summary = createMockAgingSummary();

    expect(summary.totalOutstanding).toBe(500000);
    expect(summary.current).toBe(200000);
    expect(summary.days1To30).toBe(150000);
    expect(summary.invoiceCount).toBe(25);
    expect(summary.overdueCount).toBe(8);
  });

  it('should create complete aging report', () => {
    const report = createMockAgingReport();

    expect(report.items).toHaveLength(5);
    expect(report.summary).toBeDefined();
    expect(report.summary.totalOutstanding).toBe(500000);
  });

  it('should create Supabase single response mock', () => {
    const response = createMockSingleResponse({ id: 'test' });

    expect(response.data).toEqual({ id: 'test' });
    expect(response.error).toBeNull();
  });

  it('should have valid test constants', () => {
    expect(TEST_INVOICES.DRAFT).toBeDefined();
    expect(TEST_INVOICES.SENT).toBeDefined();
    expect(TEST_INVOICES.OVERDUE).toBeDefined();
    expect(TEST_INVOICES.PAID).toBeDefined();
    expect(TEST_INVOICES.MIXED).toHaveLength(4);
    expect(TEST_INVOICE_STATS.DEFAULT).toBeDefined();
    expect(TEST_INVOICE_STATS.EMPTY).toBeDefined();
    expect(TEST_AGING_REPORT.items).toBeDefined();
    expect(TEST_AGING_REPORT.summary).toBeDefined();
  });
});
