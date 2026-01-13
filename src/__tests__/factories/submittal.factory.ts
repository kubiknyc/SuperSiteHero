/**
 * Submittal Factory
 * Factory functions for creating mock Submittal data in tests
 */

import { faker } from '@faker-js/faker';
// Types imported for reference but not directly used - using Mock interfaces instead
// import type { WorkflowItem, WorkflowType, SubmittalProcurement } from '@/types/database-extensions';

// ============================================================================
// Types
// ============================================================================

export type SubmittalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resubmit_required';
export type ProcurementStatus = 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'installed';

export interface MockWorkflowItem {
  id: string;
  project_id: string;
  workflow_type_id: string;
  number: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignees?: string[];
  spec_section?: string;
  submittal_type?: string;
  required_date?: string;
  submitted_date?: string | null;
  approved_date?: string | null;
  created_by?: string;
  company_id?: string;
  metadata?: Record<string, any> | null;
  custom_fields?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MockWorkflowType {
  id: string;
  company_id: string;
  name_singular: string;
  name_plural: string;
  description?: string;
  icon?: string;
  color?: string;
  default_fields?: Record<string, any> | null;
  custom_fields?: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MockSubmittalProcurement {
  id: string;
  workflow_item_id: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_phone?: string;
  vendor_address?: string;
  procurement_status: string;
  order_number?: string;
  order_date?: string;
  expected_delivery?: string;
  actual_delivery?: string | null;
  lead_time_days?: number;
  unit_cost?: number;
  quantity?: number;
  total_cost?: number;
  tracking_number?: string | null;
  notes?: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WorkflowItemFactoryOptions {
  id?: string;
  project_id?: string;
  workflow_type_id?: string;
  number?: number;
  title?: string;
  description?: string;
  status?: SubmittalStatus;
  priority?: string;
  assignees?: string[];
  spec_section?: string;
  submittal_type?: string;
  required_date?: string;
  submitted_date?: string | null;
  approved_date?: string | null;
  created_by?: string;
  company_id?: string;
  deleted_at?: string | null;
}

export interface WorkflowTypeFactoryOptions {
  id?: string;
  company_id?: string;
  name_singular?: string;
  name_plural?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface SubmittalProcurementFactoryOptions {
  id?: string;
  workflow_item_id?: string;
  vendor_name?: string;
  vendor_contact?: string;
  procurement_status?: ProcurementStatus;
  order_date?: string;
  expected_delivery?: string;
  actual_delivery?: string | null;
  lead_time_days?: number;
  unit_cost?: number;
  quantity?: number;
  total_cost?: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock WorkflowType (Submittal workflow type)
 */
export function createMockWorkflowType(
  options: WorkflowTypeFactoryOptions = {}
): MockWorkflowType {
  return {
    id: options.id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),
    name_singular: options.name_singular ?? 'Submittal',
    name_plural: options.name_plural ?? 'Submittals',
    description: options.description ?? 'Submittal workflow for material approvals',
    icon: options.icon ?? 'FileCheck',
    color: options.color ?? '#3b82f6',
    default_fields: {
      spec_section: true,
      submittal_type: true,
      required_date: true,
    },
    custom_fields: null,
    is_active: true,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    deleted_at: null,
  };
}

/**
 * Create a mock Submittal (WorkflowItem)
 */
export function createMockSubmittal(
  options: WorkflowItemFactoryOptions = {}
): MockWorkflowItem {
  const status = options.status ?? 'draft';
  const createdAt = faker.date.past();

  return {
    id: options.id ?? faker.string.uuid(),
    project_id: options.project_id ?? faker.string.uuid(),
    workflow_type_id: options.workflow_type_id ?? faker.string.uuid(),
    number: options.number ?? faker.number.int({ min: 1, max: 999 }),
    title: options.title ?? faker.commerce.productName(),
    description: options.description ?? faker.lorem.paragraph(),
    status,
    priority: options.priority ?? faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    assignees: options.assignees ?? [faker.string.uuid()],
    spec_section: options.spec_section ?? `${faker.number.int({ min: 1, max: 49 })}.${faker.number.int({ min: 10, max: 99 })}.${faker.number.int({ min: 10, max: 99 })}`,
    submittal_type: options.submittal_type ?? faker.helpers.arrayElement(['Product Data', 'Shop Drawings', 'Samples', 'Design Data', 'Test Reports']),
    required_date: options.required_date ?? faker.date.future().toISOString(),
    submitted_date: options.submitted_date ?? (status !== 'draft' ? faker.date.between({ from: createdAt, to: new Date() }).toISOString() : null),
    approved_date: options.approved_date ?? (status === 'approved' ? faker.date.recent().toISOString() : null),
    created_by: options.created_by ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),
    metadata: {
      ball_in_court: status === 'submitted' || status === 'under_review' ? 'architect' : 'contractor',
      review_days: faker.number.int({ min: 7, max: 30 }),
    },
    custom_fields: null,
    created_at: createdAt.toISOString(),
    updated_at: faker.date.recent().toISOString(),
    deleted_at: options.deleted_at ?? null,
  };
}

/**
 * Create a mock draft submittal
 */
export function createMockDraftSubmittal(
  options: Omit<WorkflowItemFactoryOptions, 'status'> = {}
): MockWorkflowItem {
  return createMockSubmittal({
    ...options,
    status: 'draft',
    submitted_date: null,
    approved_date: null,
  });
}

/**
 * Create a mock submitted submittal
 */
export function createMockSubmittedSubmittal(
  options: Omit<WorkflowItemFactoryOptions, 'status'> = {}
): MockWorkflowItem {
  return createMockSubmittal({
    ...options,
    status: 'submitted',
    submitted_date: faker.date.recent().toISOString(),
    approved_date: null,
  });
}

/**
 * Create a mock approved submittal
 */
export function createMockApprovedSubmittal(
  options: Omit<WorkflowItemFactoryOptions, 'status'> = {}
): MockWorkflowItem {
  return createMockSubmittal({
    ...options,
    status: 'approved',
    submitted_date: faker.date.past().toISOString(),
    approved_date: faker.date.recent().toISOString(),
  });
}

/**
 * Create a mock rejected submittal
 */
export function createMockRejectedSubmittal(
  options: Omit<WorkflowItemFactoryOptions, 'status'> = {}
): MockWorkflowItem {
  return createMockSubmittal({
    ...options,
    status: 'rejected',
    submitted_date: faker.date.past().toISOString(),
    approved_date: null,
  });
}

/**
 * Create a mock under review submittal
 */
export function createMockUnderReviewSubmittal(
  options: Omit<WorkflowItemFactoryOptions, 'status'> = {}
): MockWorkflowItem {
  return createMockSubmittal({
    ...options,
    status: 'under_review',
    submitted_date: faker.date.recent().toISOString(),
    approved_date: null,
  });
}

/**
 * Create multiple mock submittals
 */
export function createMockSubmittals(
  count: number = 3,
  options: WorkflowItemFactoryOptions = {}
): MockWorkflowItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSubmittal({
      ...options,
      number: options.number ?? i + 1,
    })
  );
}

/**
 * Create a mock SubmittalProcurement record
 */
export function createMockSubmittalProcurement(
  options: SubmittalProcurementFactoryOptions = {}
): MockSubmittalProcurement {
  const status = options.procurement_status ?? 'pending';
  const orderDate = options.order_date ? new Date(options.order_date) : faker.date.past();
  const leadTimeDays = options.lead_time_days ?? faker.number.int({ min: 14, max: 90 });
  const expectedDelivery = options.expected_delivery ??
    new Date(orderDate.getTime() + leadTimeDays * 24 * 60 * 60 * 1000).toISOString();

  const quantity = options.quantity ?? faker.number.int({ min: 1, max: 100 });
  const unitCost = options.unit_cost ?? parseFloat(faker.commerce.price({ min: 10, max: 10000 }));
  const totalCost = options.total_cost ?? quantity * unitCost;

  return {
    id: options.id ?? faker.string.uuid(),
    workflow_item_id: options.workflow_item_id ?? faker.string.uuid(),
    vendor_name: options.vendor_name ?? faker.company.name(),
    vendor_contact: options.vendor_contact ?? faker.internet.email(),
    vendor_phone: faker.phone.number(),
    vendor_address: faker.location.streetAddress(),
    procurement_status: status,
    order_number: `PO-${faker.string.alphanumeric(8).toUpperCase()}`,
    order_date: orderDate.toISOString(),
    expected_delivery: expectedDelivery,
    actual_delivery: options.actual_delivery ?? (status === 'delivered' || status === 'installed' ? faker.date.recent().toISOString() : null),
    lead_time_days: leadTimeDays,
    unit_cost: unitCost,
    quantity,
    total_cost: totalCost,
    tracking_number: status === 'in_transit' || status === 'delivered' ? faker.string.alphanumeric(12).toUpperCase() : null,
    notes: faker.lorem.sentence(),
    metadata: {
      carrier: faker.helpers.arrayElement(['UPS', 'FedEx', 'USPS', 'DHL']),
      shipping_method: faker.helpers.arrayElement(['Ground', 'Express', 'Overnight']),
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    deleted_at: null,
  };
}

/**
 * Create a mock pending procurement
 */
export function createMockPendingProcurement(
  options: Omit<SubmittalProcurementFactoryOptions, 'procurement_status'> = {}
): MockSubmittalProcurement {
  return createMockSubmittalProcurement({
    ...options,
    procurement_status: 'pending',
    actual_delivery: null,
  });
}

/**
 * Create a mock ordered procurement
 */
export function createMockOrderedProcurement(
  options: Omit<SubmittalProcurementFactoryOptions, 'procurement_status'> = {}
): MockSubmittalProcurement {
  return createMockSubmittalProcurement({
    ...options,
    procurement_status: 'ordered',
    order_date: faker.date.recent().toISOString(),
    actual_delivery: null,
  });
}

/**
 * Create a mock delivered procurement
 */
export function createMockDeliveredProcurement(
  options: Omit<SubmittalProcurementFactoryOptions, 'procurement_status'> = {}
): MockSubmittalProcurement {
  return createMockSubmittalProcurement({
    ...options,
    procurement_status: 'delivered',
    actual_delivery: faker.date.recent().toISOString(),
  });
}

/**
 * Create multiple mock procurement records
 */
export function createMockProcurements(
  count: number = 3,
  options: SubmittalProcurementFactoryOptions = {}
): MockSubmittalProcurement[] {
  return Array.from({ length: count }, () =>
    createMockSubmittalProcurement(options)
  );
}

/**
 * Create submittal with procurement records
 */
export function createMockSubmittalWithProcurement(
  submittalOptions: WorkflowItemFactoryOptions = {},
  procurementOptions: SubmittalProcurementFactoryOptions = {}
): { submittal: MockWorkflowItem; procurement: MockSubmittalProcurement } {
  const submittal = createMockApprovedSubmittal(submittalOptions);
  const procurement = createMockSubmittalProcurement({
    ...procurementOptions,
    workflow_item_id: submittal.id,
  });

  return { submittal, procurement };
}

// ============================================================================
// Pre-configured Test Data
// ============================================================================

export const TEST_SUBMITTALS = {
  draft: createMockDraftSubmittal({
    id: 'submittal-draft-1',
    title: 'Structural Steel Submittals',
    spec_section: '05.12.00',
  }),
  submitted: createMockSubmittedSubmittal({
    id: 'submittal-submitted-1',
    title: 'HVAC Equipment Submittal',
    spec_section: '23.05.00',
  }),
  approved: createMockApprovedSubmittal({
    id: 'submittal-approved-1',
    title: 'Window Wall System',
    spec_section: '08.44.00',
  }),
  rejected: createMockRejectedSubmittal({
    id: 'submittal-rejected-1',
    title: 'Elevator Cab Finishes',
    spec_section: '14.21.00',
  }),
  underReview: createMockUnderReviewSubmittal({
    id: 'submittal-review-1',
    title: 'Roofing System',
    spec_section: '07.50.00',
  }),
};

export const TEST_WORKFLOW_TYPE = createMockWorkflowType({
  id: 'workflow-type-submittal-1',
  name_singular: 'Submittal',
  name_plural: 'Submittals',
});

export const TEST_PROCUREMENT = {
  pending: createMockPendingProcurement({
    id: 'procurement-pending-1',
    workflow_item_id: TEST_SUBMITTALS.approved.id,
  }),
  ordered: createMockOrderedProcurement({
    id: 'procurement-ordered-1',
    workflow_item_id: TEST_SUBMITTALS.approved.id,
  }),
  delivered: createMockDeliveredProcurement({
    id: 'procurement-delivered-1',
    workflow_item_id: TEST_SUBMITTALS.approved.id,
  }),
};
