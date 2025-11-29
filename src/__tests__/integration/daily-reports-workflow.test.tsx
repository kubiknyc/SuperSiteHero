import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { faker } from '@faker-js/faker';
import type { DailyReport } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock components (we'll create simple versions for testing)
const DailyReportsPage = () => {
  const [reports, setReports] = React.useState<DailyReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  React.useEffect(() => {
    // Simulate fetching reports
    const fetchReports = async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', 'project-123');

      if (data) {
        setReports(data as DailyReport[]);
      }
      setLoading(false);
    };

    fetchReports();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const newReport = {
      project_id: 'project-123',
      report_date: formData.get('report_date') as string,
      weather_condition: formData.get('weather_condition') as string,
      work_completed: formData.get('work_summary') as string,
      reporter_id: 'user-123',
    };

    const { data } = await supabase
      .from('daily_reports')
      .insert(newReport)
      .select()
      .single();

    if (data) {
      setReports([data as DailyReport, ...reports]);
      setShowCreateForm(false);
    }
  };

  if (loading) {return <div>Loading...</div>;}

  return (
    <div>
      <h1>Daily Reports</h1>
      <button onClick={() => setShowCreateForm(true)}>Create Report</button>

      {showCreateForm && (
        <form onSubmit={handleCreateReport}>
          <input
            name="report_date"
            type="date"
            required
            aria-label="Report Date"
          />
          <select name="weather_condition" required aria-label="Weather">
            <option value="">Select Weather</option>
            <option value="sunny">Sunny</option>
            <option value="cloudy">Cloudy</option>
            <option value="rainy">Rainy</option>
          </select>
          <textarea
            name="work_summary"
            placeholder="Work completed today..."
            required
            aria-label="Work Summary"
          />
          <button type="submit">Save Report</button>
          <button type="button" onClick={() => setShowCreateForm(false)}>
            Cancel
          </button>
        </form>
      )}

      <div>
        {reports.length === 0 ? (
          <p>No reports found</p>
        ) : (
          <ul>
            {reports.map((report) => (
              <li key={report.id}>
                <h3>{report.report_date}</h3>
                <p>Weather: {report.weather_condition}</p>
                <p>{report.work_completed}</p>
                <button aria-label={`Edit report ${report.report_date}`}>
                  Edit
                </button>
                <button aria-label={`Delete report ${report.report_date}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Factory for mock daily reports
const mockDailyReport = (overrides: Partial<DailyReport> = {}): DailyReport => ({
  id: faker.string.uuid(),
  project_id: 'project-123',
  report_date: faker.date.recent().toISOString().split('T')[0],
  weather_condition: faker.helpers.arrayElement(['sunny', 'cloudy', 'rainy']),
  temperature_high: faker.number.int({ min: 60, max: 95 }),
  temperature_low: faker.number.int({ min: 40, max: 70 }),
  work_completed: faker.lorem.paragraph(),
  comments: faker.lorem.paragraph(),
  reporter_id: 'user-123',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  // Add missing nullable fields
  approved_at: null,
  approved_by: null,
  created_by: null,
  deleted_at: null,
  issues: null,
  observations: null,
  pdf_generated_at: null,
  pdf_url: null,
  precipitation: null,
  production_data: null,
  report_number: null,
  reviewer_id: null,
  status: null,
  submitted_at: null,
  total_workers: null,
  weather_delay_notes: null,
  weather_delays: null,
  weather_source: null,
  wind_speed: null,
  ...overrides,
});

describe('Daily Reports Workflow Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup auth state
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        },
      },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    } as any);

    // Mock user profile fetch
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  first_name: 'John',
                  last_name: 'Doe',
                  company_id: 'company-123',
                  role: 'superintendent',
                },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });
  });

  describe('Viewing Daily Reports', () => {
    it('should display list of daily reports', async () => {
      const mockReports = [
        mockDailyReport({ report_date: '2024-01-15' }),
        mockDailyReport({ report_date: '2024-01-14' }),
        mockDailyReport({ report_date: '2024-01-13' }),
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockReports,
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    company_id: 'company-123',
                    role: 'superintendent',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <TestWrapper>
          <DailyReportsPage />
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Daily Reports')).toBeInTheDocument();
      });

      // Check all reports are displayed
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-01-14')).toBeInTheDocument();
      expect(screen.getByText('2024-01-13')).toBeInTheDocument();

      // Check action buttons are present
      const editButtons = screen.getAllByRole('button', { name: /edit report/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete report/i });

      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('should show empty state when no reports exist', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    company_id: 'company-123',
                    role: 'superintendent',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <TestWrapper>
          <DailyReportsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No reports found')).toBeInTheDocument();
      });
    });
  });

  describe('Creating Daily Reports', () => {
    it('should create a new daily report', async () => {
      const existingReports: DailyReport[] = [];
      const newReport = mockDailyReport({
        id: 'new-report-123',
        report_date: '2024-01-20',
        weather_condition: 'sunny',
        work_completed: 'Completed foundation work',
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: existingReports,
                error: null,
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newReport,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    company_id: 'company-123',
                    role: 'superintendent',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <TestWrapper>
          <DailyReportsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Reports')).toBeInTheDocument();
      });

      // Open create form
      const createButton = screen.getByRole('button', { name: /create report/i });
      await user.click(createButton);

      // Fill in the form
      const dateInput = screen.getByLabelText(/report date/i);
      const weatherSelect = screen.getByLabelText(/weather/i);
      const summaryTextarea = screen.getByLabelText(/work summary/i);

      await user.type(dateInput, '2024-01-20');
      await user.selectOptions(weatherSelect, 'sunny');
      await user.type(summaryTextarea, 'Completed foundation work');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save report/i });
      await user.click(saveButton);

      // Verify report was added to the list
      await waitFor(() => {
        expect(screen.getByText('2024-01-20')).toBeInTheDocument();
        expect(screen.getByText('Weather: sunny')).toBeInTheDocument();
        expect(screen.getByText('Completed foundation work')).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    company_id: 'company-123',
                    role: 'superintendent',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <TestWrapper>
          <DailyReportsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Reports')).toBeInTheDocument();
      });

      // Open create form
      const createButton = screen.getByRole('button', { name: /create report/i });
      await user.click(createButton);

      // Try to submit without filling required fields
      const saveButton = screen.getByRole('button', { name: /save report/i });
      await user.click(saveButton);

      // Form should not submit and fields should show validation
      const dateInput = screen.getByLabelText(/report date/i) as HTMLInputElement;
      const weatherSelect = screen.getByLabelText(/weather/i) as HTMLSelectElement;
      const summaryTextarea = screen.getByLabelText(/work summary/i) as HTMLTextAreaElement;

      expect(dateInput.validity.valid).toBe(false);
      expect(weatherSelect.validity.valid).toBe(false);
      expect(summaryTextarea.validity.valid).toBe(false);
    });

    it('should cancel report creation', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    company_id: 'company-123',
                    role: 'superintendent',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <TestWrapper>
          <DailyReportsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Reports')).toBeInTheDocument();
      });

      // Open create form
      const createButton = screen.getByRole('button', { name: /create report/i });
      await user.click(createButton);

      // Verify form is shown
      expect(screen.getByLabelText(/report date/i)).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify form is hidden
      expect(screen.queryByLabelText(/report date/i)).not.toBeInTheDocument();
    });
  });
});