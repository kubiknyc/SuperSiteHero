/**
 * Project Factory
 * Creates mock project data for testing
 */

import { faker } from '@faker-js/faker';

// Project status types
export type ProjectStatus = 'pre_construction' | 'active' | 'on_hold' | 'completed' | 'cancelled';

// Project type
export type ProjectType = 'residential' | 'commercial' | 'industrial' | 'infrastructure' | 'renovation' | 'mixed_use';

// Project phase
export type ProjectPhase = 'planning' | 'design' | 'permitting' | 'foundation' | 'structural' | 'mechanical' | 'finishing' | 'closeout';

// Project interface (matches database schema)
export interface MockProject {
  id: string;
  name: string;
  project_number: string;
  description?: string;
  status: ProjectStatus;
  project_type: ProjectType;
  phase?: ProjectPhase;
  company_id: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;

  // Client information
  client_name?: string;
  client_contact_name?: string;
  client_contact_email?: string;
  client_contact_phone?: string;

  // Dates
  start_date?: string;
  estimated_end_date?: string;
  actual_end_date?: string;

  // Budget
  contract_value?: number;
  budget?: number;
  current_cost?: number;

  // Progress
  percent_complete?: number;

  // Settings
  timezone?: string;
  weather_location?: string;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Project assignment interface
export interface MockProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Factory options
export interface ProjectFactoryOptions {
  id?: string;
  name?: string;
  project_number?: string;
  status?: ProjectStatus;
  project_type?: ProjectType;
  phase?: ProjectPhase;
  company_id?: string;
  client_name?: string;
  contract_value?: number;
  budget?: number;
  percent_complete?: number;
  start_date?: string;
  estimated_end_date?: string;
  created_by?: string;
}

export interface ProjectAssignmentFactoryOptions {
  id?: string;
  project_id?: string;
  user_id?: string;
  role?: string;
  company_id?: string;
  is_active?: boolean;
}

/**
 * Create a mock project
 */
export function createMockProject(options: ProjectFactoryOptions = {}): MockProject {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const startDate = options.start_date ?? faker.date.past().toISOString().split('T')[0];

  const contractValue = options.contract_value ?? faker.number.int({ min: 100000, max: 50000000 });
  const budget = options.budget ?? contractValue * faker.number.float({ min: 0.9, max: 1.1 });

  return {
    id,
    name: options.name ?? `${faker.company.name()} ${faker.helpers.arrayElement(['Tower', 'Center', 'Building', 'Complex', 'Plaza'])}`,
    project_number: options.project_number ?? `PRJ-${faker.string.numeric(6)}`,
    description: faker.lorem.paragraph(),
    status: options.status ?? faker.helpers.arrayElement(['pre_construction', 'active', 'on_hold', 'completed', 'cancelled'] as ProjectStatus[]),
    project_type: options.project_type ?? faker.helpers.arrayElement(['residential', 'commercial', 'industrial', 'infrastructure', 'renovation', 'mixed_use'] as ProjectType[]),
    phase: options.phase ?? faker.helpers.arrayElement(['planning', 'design', 'permitting', 'foundation', 'structural', 'mechanical', 'finishing', 'closeout'] as ProjectPhase[]),
    company_id: options.company_id ?? faker.string.uuid(),

    // Location
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    country: 'USA',
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),

    // Client information
    client_name: options.client_name ?? faker.company.name(),
    client_contact_name: faker.person.fullName(),
    client_contact_email: faker.internet.email(),
    client_contact_phone: faker.phone.number(),

    // Dates
    start_date: startDate,
    estimated_end_date: options.estimated_end_date ?? faker.date.future({ years: 2 }).toISOString().split('T')[0],
    actual_end_date: undefined,

    // Budget
    contract_value: contractValue,
    budget,
    current_cost: budget * faker.number.float({ min: 0, max: 0.8 }),

    // Progress
    percent_complete: options.percent_complete ?? faker.number.int({ min: 0, max: 100 }),

    // Settings
    timezone: 'America/New_York',
    weather_location: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,

    // Metadata
    created_by: options.created_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock project assignment
 */
export function createMockProjectAssignment(options: ProjectAssignmentFactoryOptions = {}): MockProjectAssignment {
  const createdAt = faker.date.past().toISOString();

  return {
    id: options.id ?? faker.string.uuid(),
    project_id: options.project_id ?? faker.string.uuid(),
    user_id: options.user_id ?? faker.string.uuid(),
    role: options.role ?? faker.helpers.arrayElement(['superintendent', 'project_manager', 'foreman', 'viewer']),
    company_id: options.company_id ?? faker.string.uuid(),
    is_active: options.is_active ?? true,
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create an active project
 */
export function createMockActiveProject(options: Omit<ProjectFactoryOptions, 'status'> = {}): MockProject {
  return createMockProject({ ...options, status: 'active' });
}

/**
 * Create a completed project
 */
export function createMockCompletedProject(options: Omit<ProjectFactoryOptions, 'status' | 'percent_complete'> = {}): MockProject {
  const project = createMockProject({
    ...options,
    status: 'completed',
    percent_complete: 100,
  });

  return {
    ...project,
    actual_end_date: faker.date.recent().toISOString().split('T')[0],
  };
}

/**
 * Create a project on hold
 */
export function createMockOnHoldProject(options: Omit<ProjectFactoryOptions, 'status'> = {}): MockProject {
  return createMockProject({ ...options, status: 'on_hold' });
}

/**
 * Create a pre-construction project
 */
export function createMockPreConstructionProject(options: Omit<ProjectFactoryOptions, 'status' | 'percent_complete'> = {}): MockProject {
  return createMockProject({
    ...options,
    status: 'pre_construction',
    percent_complete: 0,
    phase: 'planning',
  });
}

/**
 * Create multiple mock projects
 */
export function createMockProjects(count: number, options: ProjectFactoryOptions = {}): MockProject[] {
  return Array.from({ length: count }, () => createMockProject(options));
}

/**
 * Create a project with assignments
 */
export function createMockProjectWithAssignments(
  projectOptions: ProjectFactoryOptions = {},
  userIds: string[] = []
): {
  project: MockProject;
  assignments: MockProjectAssignment[];
} {
  const project = createMockProject(projectOptions);
  const assignments = userIds.map((userId, index) =>
    createMockProjectAssignment({
      project_id: project.id,
      user_id: userId,
      company_id: project.company_id,
      role: index === 0 ? 'superintendent' : 'viewer',
    })
  );

  return { project, assignments };
}

// Default test projects for consistent testing
export const TEST_PROJECTS = {
  active: createMockProject({
    id: 'test-project-active',
    name: 'Active Test Project',
    project_number: 'PRJ-000001',
    status: 'active',
    company_id: 'test-company-id',
    percent_complete: 45,
  }),
  completed: createMockProject({
    id: 'test-project-completed',
    name: 'Completed Test Project',
    project_number: 'PRJ-000002',
    status: 'completed',
    company_id: 'test-company-id',
    percent_complete: 100,
  }),
  onHold: createMockProject({
    id: 'test-project-hold',
    name: 'On Hold Test Project',
    project_number: 'PRJ-000003',
    status: 'on_hold',
    company_id: 'test-company-id',
    percent_complete: 30,
  }),
  preCon: createMockProject({
    id: 'test-project-precon',
    name: 'Pre-Construction Test Project',
    project_number: 'PRJ-000004',
    status: 'pre_construction',
    company_id: 'test-company-id',
    percent_complete: 0,
  }),
};
