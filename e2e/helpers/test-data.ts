/**
 * Test Data Generators and Fixtures
 *
 * Provides consistent test data for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface TestProject {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface TestTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
}

/**
 * Generate a unique test user
 */
export function generateTestUser(role: string = 'user'): TestUser {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    password: 'TestPass123!',
    name: `Test User ${timestamp}`,
    role,
  };
}

/**
 * Generate a unique test project
 */
export function generateTestProject(): TestProject {
  const timestamp = Date.now();
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  return {
    name: `Test Project ${timestamp}`,
    description: `This is a test project created by automated testing at ${new Date().toISOString()}`,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Generate a unique test task
 */
export function generateTestTask(priority: 'low' | 'medium' | 'high' = 'medium'): TestTask {
  const timestamp = Date.now();
  return {
    title: `Test Task ${timestamp}`,
    description: `This is a test task created by automated testing`,
    priority,
    status: 'todo',
  };
}

/**
 * Generate test daily report data
 */
export function generateTestDailyReport() {
  return {
    date: new Date().toISOString().split('T')[0],
    weather: 'Clear',
    temperature: 72,
    workPerformed: 'Test work performed for automated testing',
    laborHours: 40,
    equipment: 'Excavator, Crane',
  };
}

/**
 * Generate test RFI data
 */
export function generateTestRFI() {
  const timestamp = Date.now();
  return {
    subject: `Test RFI ${timestamp}`,
    question: 'This is a test question for automated testing',
    drawingReference: 'A-101',
    specification: '03 30 00',
  };
}

/**
 * Generate test submittal data
 */
export function generateTestSubmittal() {
  const timestamp = Date.now();
  return {
    number: `S-${timestamp}`,
    title: `Test Submittal ${timestamp}`,
    specification: '09 51 00',
    description: 'Test submittal for automated testing',
  };
}

/**
 * Generate test change order data
 */
export function generateTestChangeOrder() {
  const timestamp = Date.now();
  return {
    number: `CO-${timestamp}`,
    description: 'Test change order for automated testing',
    amount: 5000,
    reason: 'Testing',
  };
}

/**
 * Generate test punch item data
 */
export function generateTestPunchItem() {
  const timestamp = Date.now();
  return {
    title: `Test Punch Item ${timestamp}`,
    description: 'Test punch item for automated testing',
    location: 'Room 101',
    trade: 'General',
  };
}

/**
 * Generate test inspection data
 */
export function generateTestInspection() {
  return {
    type: 'Safety',
    date: new Date().toISOString().split('T')[0],
    inspector: 'Test Inspector',
    notes: 'Test inspection for automated testing',
  };
}

/**
 * Generate test safety incident data
 */
export function generateTestIncident() {
  return {
    date: new Date().toISOString().split('T')[0],
    type: 'Near Miss',
    severity: 'Low',
    description: 'Test incident for automated testing',
    location: 'Test Site',
  };
}

/**
 * Generate test NCR (Non-Conformance Report) data
 */
export function generateTestNCR() {
  const timestamp = Date.now();
  return {
    title: `Test NCR ${timestamp}`,
    description: 'Non-conformance identified during automated testing',
    category: 'workmanship',
    severity: 'minor',
    ncr_type: 'deficiency',
    priority: 'medium',
    building: 'Building A',
    floor: 'Level 1',
    area: 'Room 101',
    spec_section: '03 30 00',
    responsible_party_type: 'subcontractor',
  };
}

/**
 * Generate test QC Inspection data
 */
export function generateTestQCInspection() {
  const timestamp = Date.now();
  return {
    title: `Test QC Inspection ${timestamp}`,
    description: 'Quality control inspection for automated testing',
    inspection_type: 'in_process',
    category: 'structural',
    location: 'Building A, Level 2, Grid C-5',
    spec_section: '03 30 00 - Cast-in-Place Concrete',
    drawing_reference: 'S-301',
    inspection_date: new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate test Photo Location data
 */
export function generateTestPhotoLocation() {
  const timestamp = Date.now();
  return {
    name: `Photo Point ${timestamp}`,
    location_code: `PP-${timestamp}`,
    description: 'Test photo location for automated testing',
    building: 'Building A',
    floor: 'Level 1',
    capture_frequency: 'daily',
    camera_direction: 'north',
    camera_height: 'eye_level',
  };
}

/**
 * Generate test Photo Comparison data
 */
export function generateTestPhotoComparison() {
  const timestamp = Date.now();
  return {
    title: `Progress Comparison ${timestamp}`,
    description: 'Before/after comparison for automated testing',
    comparison_type: 'before_after',
    is_public: false,
  };
}

/**
 * Generate test Photo Report data
 */
export function generateTestPhotoReport() {
  const timestamp = Date.now();
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    title: `Photo Progress Report ${timestamp}`,
    description: 'Monthly photo progress report for automated testing',
    report_type: 'monthly',
    period_start: monthAgo.toISOString().split('T')[0],
    period_end: today.toISOString().split('T')[0],
  };
}

/**
 * Common test data constants
 */
export const TEST_DATA = {
  users: {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'adminpass123',
    },
    user: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword123',
    },
    subcontractor: {
      email: process.env.TEST_SUB_EMAIL || 'sub@example.com',
      password: process.env.TEST_SUB_PASSWORD || 'subpass123',
    },
  },

  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
    veryLong: 30000,
  },

  // Common selectors
  selectors: {
    createButton: 'button, a',
    createButtonText: /new|create|add/i,
    submitButton: 'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
    editButton: 'button, a',
    editButtonText: /edit/i,
    deleteButton: 'button, a',
    deleteButtonText: /delete|remove/i,
    searchInput: 'input[type="search"], input[placeholder*="search" i]',
    statusFilter: 'select[name="status"], [data-testid="status-filter"]',
    successAlert: '[role="alert"]',
    successText: /success|created|updated|saved/i,
    errorAlert: '[role="alert"], .error, .text-red-500, .text-destructive',
  },
};
