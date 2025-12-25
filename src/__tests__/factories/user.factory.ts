/**
 * User Factory
 * Creates mock user data for testing
 */

import { faker } from '@faker-js/faker';

// User role types
export type UserRole = 'admin' | 'superintendent' | 'project_manager' | 'foreman' | 'viewer';

// User profile interface (matches database schema)
export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  is_active: boolean;
  last_login_at?: string;
  email_verified: boolean;
  notification_preferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  created_at: string;
  updated_at: string;
}

// Auth user interface (Supabase auth user)
export interface MockAuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  role: string;
  aud: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// Session interface
export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: MockAuthUser;
}

// Factory options
export interface UserFactoryOptions {
  id?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  company_id?: string;
  is_active?: boolean;
  email_verified?: boolean;
}

export interface AuthUserFactoryOptions {
  id?: string;
  email?: string;
  email_confirmed?: boolean;
}

export interface SessionFactoryOptions {
  user?: Partial<MockAuthUser>;
  expired?: boolean;
}

/**
 * Create a mock user profile
 */
export function createMockUser(options: UserFactoryOptions = {}): MockUser {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    email: options.email ?? faker.internet.email().toLowerCase(),
    full_name: options.full_name ?? faker.person.fullName(),
    role: options.role ?? faker.helpers.arrayElement(['admin', 'superintendent', 'project_manager', 'foreman', 'viewer'] as UserRole[]),
    company_id: options.company_id ?? faker.string.uuid(),
    phone: faker.phone.number(),
    avatar_url: faker.image.avatar(),
    job_title: faker.person.jobTitle(),
    department: faker.commerce.department(),
    is_active: options.is_active ?? true,
    last_login_at: faker.date.recent().toISOString(),
    email_verified: options.email_verified ?? true,
    notification_preferences: {
      email: faker.datatype.boolean(),
      push: faker.datatype.boolean(),
      sms: faker.datatype.boolean(),
    },
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock Supabase auth user
 */
export function createMockAuthUser(options: AuthUserFactoryOptions = {}): MockAuthUser {
  const id = options.id ?? faker.string.uuid();
  const email = options.email ?? faker.internet.email().toLowerCase();
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    email,
    email_confirmed_at: options.email_confirmed !== false ? faker.date.past().toISOString() : null,
    phone: faker.phone.number(),
    confirmed_at: options.email_confirmed !== false ? faker.date.past().toISOString() : null,
    last_sign_in_at: faker.date.recent().toISOString(),
    role: 'authenticated',
    aud: 'authenticated',
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      full_name: faker.person.fullName(),
    },
  };
}

/**
 * Create a mock session
 */
export function createMockSession(options: SessionFactoryOptions = {}): MockSession {
  const user = {
    ...createMockAuthUser(),
    ...options.user,
  };

  const expiresAt = options.expired
    ? Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    : Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  return {
    access_token: `mock-access-token-${faker.string.alphanumeric(32)}`,
    refresh_token: `mock-refresh-token-${faker.string.alphanumeric(32)}`,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user,
  };
}

/**
 * Create a superintendent user
 */
export function createMockSuperintendent(options: Omit<UserFactoryOptions, 'role'> = {}): MockUser {
  return createMockUser({ ...options, role: 'superintendent' });
}

/**
 * Create an admin user
 */
export function createMockAdmin(options: Omit<UserFactoryOptions, 'role'> = {}): MockUser {
  return createMockUser({ ...options, role: 'admin' });
}

/**
 * Create a project manager user
 */
export function createMockProjectManager(options: Omit<UserFactoryOptions, 'role'> = {}): MockUser {
  return createMockUser({ ...options, role: 'project_manager' });
}

/**
 * Create a foreman user
 */
export function createMockForeman(options: Omit<UserFactoryOptions, 'role'> = {}): MockUser {
  return createMockUser({ ...options, role: 'foreman' });
}

/**
 * Create a viewer user
 */
export function createMockViewer(options: Omit<UserFactoryOptions, 'role'> = {}): MockUser {
  return createMockUser({ ...options, role: 'viewer' });
}

/**
 * Create multiple mock users
 */
export function createMockUsers(count: number, options: UserFactoryOptions = {}): MockUser[] {
  return Array.from({ length: count }, () => createMockUser(options));
}

/**
 * Create a complete user with auth user and profile
 */
export function createMockUserWithAuth(options: UserFactoryOptions = {}): {
  authUser: MockAuthUser;
  profile: MockUser;
  session: MockSession;
} {
  const id = options.id ?? faker.string.uuid();
  const email = options.email ?? faker.internet.email().toLowerCase();

  const authUser = createMockAuthUser({ id, email });
  const profile = createMockUser({ ...options, id, email });
  const session = createMockSession({ user: authUser });

  return { authUser, profile, session };
}

// Default test users for consistent testing
export const TEST_USERS = {
  admin: createMockUser({
    id: 'test-admin-id',
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin',
    company_id: 'test-company-id',
  }),
  superintendent: createMockUser({
    id: 'test-super-id',
    email: 'super@test.com',
    full_name: 'Test Superintendent',
    role: 'superintendent',
    company_id: 'test-company-id',
  }),
  projectManager: createMockUser({
    id: 'test-pm-id',
    email: 'pm@test.com',
    full_name: 'Test Project Manager',
    role: 'project_manager',
    company_id: 'test-company-id',
  }),
  foreman: createMockUser({
    id: 'test-foreman-id',
    email: 'foreman@test.com',
    full_name: 'Test Foreman',
    role: 'foreman',
    company_id: 'test-company-id',
  }),
  viewer: createMockUser({
    id: 'test-viewer-id',
    email: 'viewer@test.com',
    full_name: 'Test Viewer',
    role: 'viewer',
    company_id: 'test-company-id',
  }),
};
