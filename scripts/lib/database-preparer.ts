/**
 * Database Preparer
 *
 * Handles database reset and seeding for both local (Supabase CLI) and
 * remote (dedicated test project) modes.
 */

import chalk from 'chalk';
import * as path from 'path';

export type DatabaseMode = 'local' | 'remote';

export interface DatabasePreparerOptions {
  mode: DatabaseMode;
  skipReset?: boolean;
  skipSeed?: boolean;
  verbose?: boolean;
}

export interface PrepareResult {
  success: boolean;
  resetPerformed: boolean;
  seedPerformed: boolean;
  errors: string[];
}

// Tables that are safe to truncate in test environments
const SAFE_TABLES = [
  'punch_items',
  'punch_lists',
  'workflow_items',
  'daily_report_photos',
  'daily_reports',
  'inspections',
  'tasks',
  'checklist_executions',
  'safety_incidents',
  'rfis',
  'rfi_responses',
  'submittals',
  'change_orders',
  'material_deliveries',
  'project_users',
  // Note: We don't truncate projects, companies, or users
  // Those are reset via specific test data
];

export class DatabasePreparer {
  private mode: DatabaseMode;
  private verbose: boolean;

  constructor(mode: DatabaseMode, verbose: boolean = false) {
    this.mode = mode;
    this.verbose = verbose;
  }

  /**
   * Prepare the database for testing
   */
  async prepare(options: Partial<DatabasePreparerOptions> = {}): Promise<PrepareResult> {
    const { skipReset = false, skipSeed = false } = options;
    const errors: string[] = [];
    let resetPerformed = false;
    let seedPerformed = false;

    console.log(chalk.blue('\n=== Database Preparation ===\n'));
    console.log(`  Mode: ${this.mode}`);

    try {
      // Step 1: Reset database
      if (!skipReset) {
        if (this.mode === 'local') {
          resetPerformed = await this.resetLocal();
        } else {
          resetPerformed = await this.resetRemote();
        }
      } else {
        console.log(chalk.yellow('  Skipping database reset'));
      }

      // Step 2: Seed test data
      if (!skipSeed) {
        seedPerformed = await this.seedTestData();
      } else {
        console.log(chalk.yellow('  Skipping test data seeding'));
      }

      console.log(chalk.green('\n  ✓ Database preparation complete'));

      return {
        success: true,
        resetPerformed,
        seedPerformed,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      console.error(chalk.red(`\n  ✗ Database preparation failed: ${errorMessage}`));

      return {
        success: false,
        resetPerformed,
        seedPerformed,
        errors,
      };
    }
  }

  /**
   * Reset database using Supabase CLI (local mode)
   */
  private async resetLocal(): Promise<boolean> {
    console.log(chalk.blue('\n  Resetting local database...'));

    try {
      const { execa } = await import('execa');

      // Check if Supabase is running
      const statusResult = await execa('npx', ['supabase', 'status'], {
        reject: false,
        timeout: 30000,
      });

      if (statusResult.exitCode !== 0) {
        console.log(chalk.yellow('  Supabase is not running. Starting...'));
        await execa('npx', ['supabase', 'start'], {
          stdio: this.verbose ? 'inherit' : 'pipe',
          timeout: 120000,
        });
      }

      // Reset the database (drops all data and runs migrations)
      console.log(chalk.blue('  Running supabase db reset...'));
      await execa('npx', ['supabase', 'db', 'reset', '--linked'], {
        stdio: this.verbose ? 'inherit' : 'pipe',
        timeout: 300000, // 5 minutes
      });

      console.log(chalk.green('  ✓ Local database reset complete'));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`  ✗ Local database reset failed: ${errorMessage}`));

      // Try alternative: just reset without --linked
      try {
        const { execa } = await import('execa');
        console.log(chalk.yellow('  Trying reset without --linked flag...'));
        await execa('npx', ['supabase', 'db', 'reset'], {
          stdio: this.verbose ? 'inherit' : 'pipe',
          timeout: 300000,
        });
        console.log(chalk.green('  ✓ Local database reset complete (without linking)'));
        return true;
      } catch {
        throw error;
      }
    }
  }

  /**
   * Reset database using service role key (remote mode)
   */
  private async resetRemote(): Promise<boolean> {
    console.log(chalk.blue('\n  Resetting remote database...'));

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL are required for remote mode'
      );
    }

    try {
      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Truncate safe tables in reverse order of foreign key dependencies
      console.log(chalk.blue('  Truncating test data tables...'));

      for (const table of SAFE_TABLES) {
        try {
          // Use raw SQL for truncation via rpc if available
          const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error && !error.message.includes('does not exist')) {
            this.verbose && console.log(chalk.yellow(`    Warning: Could not clear ${table}: ${error.message}`));
          } else {
            this.verbose && console.log(chalk.gray(`    Cleared ${table}`));
          }
        } catch (tableError) {
          // Table might not exist, continue
          this.verbose && console.log(chalk.gray(`    Skipped ${table} (may not exist)`));
        }
      }

      console.log(chalk.green('  ✓ Remote database reset complete'));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`  ✗ Remote database reset failed: ${errorMessage}`));
      throw error;
    }
  }

  /**
   * Seed test data
   */
  private async seedTestData(): Promise<boolean> {
    console.log(chalk.blue('\n  Seeding test data...'));

    try {
      const { execa } = await import('execa');

      // Check if seed script exists
      const seedScriptPath = path.join(process.cwd(), 'scripts', 'seed-test-users.ts');

      try {
        await import('fs').then(fs =>
          fs.promises.access(seedScriptPath)
        );

        // Run the existing seed script
        await execa('npx', ['tsx', seedScriptPath], {
          stdio: this.verbose ? 'inherit' : 'pipe',
          timeout: 120000,
          env: {
            ...process.env,
            NODE_ENV: 'test',
          },
        });

        console.log(chalk.green('  ✓ Test data seeded'));
        return true;
      } catch {
        console.log(chalk.yellow('  No seed-test-users.ts found, skipping seeding'));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.yellow(`  Warning: Test data seeding failed: ${errorMessage}`));
      // Don't fail the entire process for seeding issues
      return false;
    }
  }

  /**
   * Create test users via Supabase Admin API
   */
  async createTestUsers(): Promise<void> {
    console.log(chalk.blue('\n  Creating test users...'));

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.log(chalk.yellow('  Skipping user creation (no service role key)'));
      return;
    }

    try {
      const { createClient } = await import('@supabase/supabase-js');

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Define test users
      const testUsers = [
        {
          email: process.env.TEST_ADMIN_EMAIL || 'admin@e2e.test.local',
          password: process.env.TEST_ADMIN_PASSWORD || 'AdminTest123!',
          role: 'admin',
        },
        {
          email: process.env.TEST_PM_EMAIL || 'pm@e2e.test.local',
          password: process.env.TEST_PM_PASSWORD || 'PMTest123!',
          role: 'project_manager',
        },
        {
          email: process.env.TEST_SUPER_EMAIL || 'super@e2e.test.local',
          password: process.env.TEST_SUPER_PASSWORD || 'SuperTest123!',
          role: 'superintendent',
        },
        {
          email: process.env.TEST_SUB_EMAIL || 'sub@e2e.test.local',
          password: process.env.TEST_SUB_PASSWORD || 'SubTest123!',
          role: 'subcontractor',
        },
      ];

      for (const user of testUsers) {
        try {
          // Check if user exists
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const exists = existingUsers?.users?.some((u: { email?: string }) => u.email === user.email);

          if (!exists) {
            // Create user
            const { error } = await supabase.auth.admin.createUser({
              email: user.email,
              password: user.password,
              email_confirm: true,
              user_metadata: { role: user.role },
            });

            if (error) {
              console.log(chalk.yellow(`    Warning: Could not create ${user.role}: ${error.message}`));
            } else {
              console.log(chalk.green(`    ✓ Created ${user.role}: ${user.email}`));
            }
          } else {
            console.log(chalk.gray(`    User exists: ${user.email}`));
          }
        } catch (userError) {
          const errorMessage = userError instanceof Error ? userError.message : String(userError);
          console.log(chalk.yellow(`    Warning: ${user.role} user error: ${errorMessage}`));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(chalk.yellow(`  Warning: User creation failed: ${errorMessage}`));
    }
  }
}
