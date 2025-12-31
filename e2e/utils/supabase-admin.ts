/**
 * Supabase Admin Client
 *
 * Admin client for test user management using the service role key.
 * Includes rate limit handling with exponential backoff.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get or create the Supabase admin client
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations'
    );
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

/**
 * Execute a function with exponential backoff retry on rate limit (429) errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Too many requests');

      if (isRateLimit && attempt < maxRetries) {
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Create a test user via the Admin API
 */
export async function createTestUser(options: {
  email: string;
  password: string;
  role?: string;
  emailConfirm?: boolean;
}): Promise<{ userId: string; email: string }> {
  const supabase = getSupabaseAdmin();
  const { email, password, role = 'user', emailConfirm = true } = options;

  return withRetry(async () => {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      return { userId: existingUser.id, email: existingUser.email! };
    }

    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm,
      user_metadata: { role },
    });

    if (error) {
      throw error;
    }

    return { userId: data.user.id, email: data.user.email! };
  });
}

/**
 * Generate a magic link for a user (deterministic login for tests)
 */
export async function generateMagicLink(
  email: string,
  redirectTo?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  return withRetry(async () => {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectTo || 'http://localhost:5173',
      },
    });

    if (error) {
      throw error;
    }

    if (!data.properties?.action_link) {
      throw new Error('Failed to generate magic link');
    }

    return data.properties.action_link;
  });
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  return withRetry(async () => {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error && !error.message.includes('not found')) {
      throw error;
    }
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const user = data?.users?.find(u => u.email === email);
  return user ? { id: user.id, email: user.email! } : null;
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  return withRetry(async () => {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      throw error;
    }
  });
}

/**
 * Create all test users for E2E tests
 */
export async function createAllTestUsers(): Promise<{
  admin: { userId: string; email: string };
  projectManager: { userId: string; email: string };
  superintendent: { userId: string; email: string };
  subcontractor: { userId: string; email: string };
}> {
  const testUsers = {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@e2e.test.local',
      password: process.env.TEST_ADMIN_PASSWORD || 'AdminTest123!',
      role: 'admin',
    },
    projectManager: {
      email: process.env.TEST_PM_EMAIL || 'pm@e2e.test.local',
      password: process.env.TEST_PM_PASSWORD || 'PMTest123!',
      role: 'project_manager',
    },
    superintendent: {
      email: process.env.TEST_SUPER_EMAIL || 'super@e2e.test.local',
      password: process.env.TEST_SUPER_PASSWORD || 'SuperTest123!',
      role: 'superintendent',
    },
    subcontractor: {
      email: process.env.TEST_SUB_EMAIL || 'sub@e2e.test.local',
      password: process.env.TEST_SUB_PASSWORD || 'SubTest123!',
      role: 'subcontractor',
    },
  };

  const results: Record<string, { userId: string; email: string }> = {};

  for (const [key, userData] of Object.entries(testUsers)) {
    results[key] = await createTestUser(userData);
    console.log(`Created/verified test user: ${userData.email} (${userData.role})`);
  }

  return results as any;
}
