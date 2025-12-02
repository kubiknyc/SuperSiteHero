import { http, HttpResponse } from 'msw';

/**
 * MSW Request Handlers for Supabase API Mocking
 *
 * These handlers intercept API calls during tests and return mock data.
 * This allows unit and integration tests to run without a real database.
 */

// Get Supabase URL from env or use test default
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://test.supabase.co';

// Mock data factories
const mockUser = {
  id: 'test-user-id-123',
  email: 'test@supersitehero.com',
  full_name: 'Test User',
  role: 'superintendent' as const,
  company_id: 'company-id-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCompany = {
  id: 'company-id-123',
  name: 'Test Construction Co',
  created_at: new Date().toISOString(),
};

const mockProject = {
  id: 'project-id-123',
  name: 'Test Project',
  status: 'active' as const,
  company_id: 'company-id-123',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zip_code: '12345',
  start_date: new Date().toISOString().split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockDailyReport = {
  id: 'report-id-123',
  project_id: 'project-id-123',
  report_date: new Date().toISOString().split('T')[0],
  weather_conditions: 'sunny',
  temperature_high: 75,
  temperature_low: 55,
  work_completed_summary: 'Test work completed',
  created_by: 'test-user-id-123',
  company_id: 'company-id-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRFI = {
  id: 'rfi-id-123',
  project_id: 'project-id-123',
  number: 1,
  subject: 'Test RFI Subject',
  question: 'Test RFI question content',
  status: 'open' as const,
  priority: 'medium' as const,
  created_by: 'test-user-id-123',
  assigned_to: 'test-user-id-123',
  company_id: 'company-id-123',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockChangeOrder = {
  id: 'co-id-123',
  project_id: 'project-id-123',
  number: 1,
  title: 'Test Change Order',
  description: 'Test change order description',
  status: 'pending' as const,
  total_cost: 5000,
  created_by: 'test-user-id-123',
  company_id: 'company-id-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTask = {
  id: 'task-id-123',
  project_id: 'project-id-123',
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending' as const,
  priority: 'medium' as const,
  assigned_to: 'test-user-id-123',
  created_by: 'test-user-id-123',
  company_id: 'company-id-123',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPunchItem = {
  id: 'punch-id-123',
  project_id: 'project-id-123',
  title: 'Test Punch Item',
  description: 'Test punch item description',
  status: 'open' as const,
  location: 'Room 101',
  assigned_to: 'test-user-id-123',
  created_by: 'test-user-id-123',
  company_id: 'company-id-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const handlers = [
  // ==================== AUTH ====================
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (body.grant_type === 'password') {
      return HttpResponse.json({
        access_token: 'mock-access-token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token-123',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: 'authenticated',
          aud: 'authenticated',
        },
      });
    }

    return HttpResponse.json({ error: 'Invalid grant type' }, { status: 400 });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/signup`, async () => {
    return HttpResponse.json({
      id: mockUser.id,
      email: mockUser.email,
      role: 'authenticated',
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: mockUser.id,
      email: mockUser.email,
      role: 'authenticated',
    });
  }),

  // ==================== USERS ====================
  http.get(`${SUPABASE_URL}/rest/v1/users`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockUser]);
    }

    return HttpResponse.json([mockUser]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/users`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockUser, ...body }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/users`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockUser, ...body, updated_at: new Date().toISOString() }]);
  }),

  // ==================== COMPANIES ====================
  http.get(`${SUPABASE_URL}/rest/v1/companies`, () => {
    return HttpResponse.json([mockCompany]);
  }),

  // ==================== PROJECTS ====================
  http.get(`${SUPABASE_URL}/rest/v1/projects`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockProject]);
    }

    return HttpResponse.json([mockProject, { ...mockProject, id: 'project-id-456', name: 'Second Project' }]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockProject,
      ...body,
      id: `project-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockProject, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== DAILY REPORTS ====================
  http.get(`${SUPABASE_URL}/rest/v1/daily_reports`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockDailyReport]);
    }

    return HttpResponse.json([
      mockDailyReport,
      { ...mockDailyReport, id: 'report-id-456', report_date: '2024-01-02' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/daily_reports`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockDailyReport,
      ...body,
      id: `report-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/daily_reports`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockDailyReport, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/daily_reports`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== RFIs ====================
  http.get(`${SUPABASE_URL}/rest/v1/rfis`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockRFI]);
    }

    return HttpResponse.json([
      mockRFI,
      { ...mockRFI, id: 'rfi-id-456', number: 2, subject: 'Second RFI', status: 'responded' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/rfis`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockRFI,
      ...body,
      id: `rfi-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/rfis`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockRFI, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/rfis`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== CHANGE ORDERS ====================
  http.get(`${SUPABASE_URL}/rest/v1/change_orders`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockChangeOrder]);
    }

    return HttpResponse.json([
      mockChangeOrder,
      { ...mockChangeOrder, id: 'co-id-456', number: 2, title: 'Second CO', status: 'approved' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/change_orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockChangeOrder,
      ...body,
      id: `co-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/change_orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockChangeOrder, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/change_orders`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== TASKS ====================
  http.get(`${SUPABASE_URL}/rest/v1/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockTask]);
    }

    return HttpResponse.json([
      mockTask,
      { ...mockTask, id: 'task-id-456', title: 'Second Task', status: 'in_progress' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockTask,
      ...body,
      id: `task-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockTask, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== PUNCH LISTS ====================
  http.get(`${SUPABASE_URL}/rest/v1/punch_items`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      return HttpResponse.json([mockPunchItem]);
    }

    return HttpResponse.json([
      mockPunchItem,
      { ...mockPunchItem, id: 'punch-id-456', title: 'Second Punch Item', status: 'completed' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/punch_items`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{
      ...mockPunchItem,
      ...body,
      id: `punch-${Date.now()}`,
      created_at: new Date().toISOString(),
    }]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/punch_items`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockPunchItem, ...body, updated_at: new Date().toISOString() }]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/punch_items`, () => {
    return HttpResponse.json([]);
  }),

  // ==================== PROJECT ASSIGNMENTS ====================
  http.get(`${SUPABASE_URL}/rest/v1/project_assignments`, () => {
    return HttpResponse.json([
      {
        id: 'assignment-id-123',
        project_id: 'project-id-123',
        user_id: 'test-user-id-123',
        role: 'superintendent',
        company_id: 'company-id-123',
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // ==================== STORAGE ====================
  http.post(`${SUPABASE_URL}/storage/v1/object/*`, () => {
    return HttpResponse.json({
      Key: 'test-file-key',
      Id: 'test-file-id',
    });
  }),

  http.get(`${SUPABASE_URL}/storage/v1/object/public/*`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // ==================== CATCH-ALL ====================
  // Return empty array for any unhandled REST endpoints
  http.get(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json([]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json([]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json([]);
  }),
];

// Export mock data for use in tests
export const mockData = {
  user: mockUser,
  company: mockCompany,
  project: mockProject,
  dailyReport: mockDailyReport,
  rfi: mockRFI,
  changeOrder: mockChangeOrder,
  task: mockTask,
  punchItem: mockPunchItem,
};
