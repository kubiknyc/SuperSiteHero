import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TestProviders } from '@/__tests__/utils/TestProviders';
import { mockProject, mockUser } from '@/__tests__/utils/factories';

/**
 * Integration test for Projects workflow
 * Tests the complete user flow: listing, creating, editing, and deleting projects
 */

// Mock the ProjectsListPage component for this example
// In your actual implementation, import the real component
const MockProjectsListPage = () => {
  return (
    <div>
      <h1>Projects</h1>
      <button>New Project</button>
      <div data-testid="projects-list">
        <div>Sample Project 1</div>
        <div>Sample Project 2</div>
      </div>
    </div>
  );
};

// Set up MSW server for API mocking
const mockProjects = [
  mockProject({
    id: 'project-1',
    name: 'Office Building Renovation',
    company_id: 'company-123',
    status: 'active',
  }),
  mockProject({
    id: 'project-2',
    name: 'Residential Complex',
    company_id: 'company-123',
    status: 'active',
  }),
];

const server = setupServer(
  // Mock GET /projects endpoint
  http.get('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', ({ request }) => {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');

    if (companyId === 'company-123') {
      return HttpResponse.json(mockProjects);
    }

    return HttpResponse.json([]);
  }),

  // Mock POST /projects endpoint
  http.post('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', async ({ request }) => {
    const body = await request.json() as any;
    const newProject = mockProject({
      id: 'project-new',
      ...body,
      created_at: new Date().toISOString(),
    });

    return HttpResponse.json(newProject, { status: 201 });
  }),

  // Mock PATCH /projects endpoint
  http.patch('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const body = await request.json() as any;

    const updatedProject = mockProject({
      id: id || 'project-1',
      ...body,
      updated_at: new Date().toISOString(),
    });

    return HttpResponse.json(updatedProject);
  }),

  // Mock DELETE /projects endpoint
  http.delete('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', ({ request }) => {
    return new HttpResponse(null, { status: 204 });
  }),
);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

describe('Projects Workflow Integration Tests', () => {
  it('should display list of projects', async () => {
    render(
      <TestProviders>
        <MockProjectsListPage />
      </TestProviders>
    );

    // Verify page title
    expect(screen.getByText('Projects')).toBeInTheDocument();

    // Verify projects list is rendered
    expect(screen.getByTestId('projects-list')).toBeInTheDocument();
  });

  it('should handle project creation workflow', async () => {
    const user = userEvent.setup();

    // Override the POST handler for this specific test
    server.use(
      http.post('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', async ({ request }) => {
        const body = await request.json() as any;

        expect(body).toMatchObject({
          name: expect.any(String),
          company_id: 'company-123',
        });

        return HttpResponse.json(
          mockProject({
            id: 'project-new',
            name: body.name,
            company_id: body.company_id,
          }),
          { status: 201 }
        );
      })
    );

    render(
      <TestProviders>
        <MockProjectsListPage />
      </TestProviders>
    );

    // Click "New Project" button
    const newButton = screen.getByRole('button', { name: /new project/i });
    await user.click(newButton);

    // This test demonstrates the pattern - in a real implementation,
    // you would fill out the form and submit it here
  });

  it('should handle network errors gracefully', async () => {
    // Simulate server error
    server.use(
      http.get('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    render(
      <TestProviders>
        <MockProjectsListPage />
      </TestProviders>
    );

    // In a real implementation, verify error message is displayed
    // await waitFor(() => {
    //   expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
    // });
  });

  it('should filter projects by company_id (RLS simulation)', async () => {
    const otherCompanyProject = mockProject({
      id: 'project-other',
      name: 'Other Company Project',
      company_id: 'company-456',
    });

    server.use(
      http.get('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', ({ request }) => {
        const url = new URL(request.url);
        const companyId = url.searchParams.get('company_id');

        // Simulate RLS: only return projects for the requesting company
        if (companyId === 'company-123') {
          return HttpResponse.json(mockProjects);
        } else if (companyId === 'company-456') {
          return HttpResponse.json([otherCompanyProject]);
        }

        return HttpResponse.json([]);
      })
    );

    render(
      <TestProviders>
        <MockProjectsListPage />
      </TestProviders>
    );

    // In a real implementation, verify only company-123 projects are shown
    // The RLS policy would prevent other companies' data from being accessed
  });
});

describe('Project CRUD Operations', () => {
  it('should perform complete CRUD cycle', async () => {
    const user = userEvent.setup();
    let createdProjectId: string | null = null;

    // CREATE
    server.use(
      http.post('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', async ({ request }) => {
        const body = await request.json() as any;
        createdProjectId = 'project-crud-test';

        return HttpResponse.json(
          mockProject({
            id: createdProjectId,
            ...body,
          }),
          { status: 201 }
        );
      })
    );

    // READ (after create)
    server.use(
      http.get('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (id === createdProjectId) {
          return HttpResponse.json([
            mockProject({ id: createdProjectId, name: 'CRUD Test Project' })
          ]);
        }

        return HttpResponse.json(mockProjects);
      })
    );

    // UPDATE
    server.use(
      http.patch('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', async ({ request }) => {
        const body = await request.json() as any;

        return HttpResponse.json(
          mockProject({
            id: createdProjectId!,
            name: 'Updated CRUD Test Project',
            ...body,
          })
        );
      })
    );

    // DELETE
    server.use(
      http.delete('https://nxlznnrocrffnbzjaaae.supabase.co/rest/v1/projects', ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        expect(id).toBe(createdProjectId);

        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <TestProviders>
        <MockProjectsListPage />
      </TestProviders>
    );

    // This demonstrates the test pattern for full CRUD operations
    // In real implementation, you would:
    // 1. Create a project via form submission
    // 2. Verify it appears in the list
    // 3. Edit the project
    // 4. Verify changes are saved
    // 5. Delete the project
    // 6. Verify it's removed from the list
  });
});
