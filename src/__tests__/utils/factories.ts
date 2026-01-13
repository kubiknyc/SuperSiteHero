import { faker } from '@faker-js/faker';

/**
 * Test data factories for generating mock data
 * These factories create realistic test data for your domain models
 */

export interface MockUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  role: 'superintendent' | 'foreman' | 'worker' | 'admin';
  created_at: string;
  updated_at: string;
}

// Import the actual Project type from database extensions
import type { Project } from '@/types/database-extensions';

export interface MockDailyLog {
  id: string;
  project_id: string;
  user_id: string;
  date: string;
  weather: string;
  temperature: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a mock user
 */
export const mockUser = (overrides: Partial<MockUser> = {}): MockUser => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    company_id: faker.string.uuid(),
    role: 'superintendent',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
};

/**
 * Generate a mock project
 */
export const mockProject = (overrides: Partial<Project> = {}): Project => {
  const startDate = faker.date.past();
  const defaultValues: Project = {
    id: faker.string.uuid(),
    name: `${faker.company.name()} Construction Project`,
    description: faker.lorem.paragraph(),
    company_id: faker.string.uuid(),
    status: 'active',
    start_date: startDate.toISOString().split('T')[0],
    end_date: faker.date.future({ refDate: startDate }).toISOString().split('T')[0],
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    // Add all required nullable fields
    address: null,
    budget: null,
    city: null,
    contract_value: null,
    created_by: null,
    deleted_at: null,
    features_enabled: null,
    final_completion_date: null,
    latitude: null,
    longitude: null,
    project_number: null,
    state: null,
    substantial_completion_date: null,
    weather_units: null,
    zip: null,
  };

  // Merge overrides, ensuring null values are preserved
  const result = { ...defaultValues };
  for (const key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      (result as any)[key] = overrides[key as keyof Project];
    }
  }
  return result;
};

/**
 * Generate a mock daily log
 */
export const mockDailyLog = (overrides: Partial<MockDailyLog> = {}): MockDailyLog => {
  return {
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    date: faker.date.recent().toISOString().split('T')[0],
    weather: faker.helpers.arrayElement(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Windy']),
    temperature: faker.number.int({ min: 20, max: 95 }),
    notes: faker.lorem.paragraph(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
};

/**
 * Generate multiple instances of a factory
 */
export const mockMany = <T>(
  factory: (overrides?: any) => T,
  count: number,
  overrides?: Partial<T>
): T[] => {
  return Array.from({ length: count }, () => factory(overrides));
};

/**
 * Generate a mock Supabase response
 */
export const mockSupabaseResponse = <T>(data: T, error: Error | null = null) => {
  return {
    data: error ? null : data,
    error,
    count: null as number | null,
    status: error ? 500 : 200,
    statusText: error ? 'Internal Server Error' : 'OK',
  };
};

/**
 * Generate a mock Supabase error
 */
export const mockSupabaseError = (message: string = 'Database error') => {
  return new Error(message);
};
