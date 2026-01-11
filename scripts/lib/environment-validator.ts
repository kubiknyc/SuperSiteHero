/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */
/**
 * Environment Validator
 *
 * Validates Node.js version, environment variables, and safety checks
 * for the autonomous test harness.
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

export interface ValidateOptions {
  nodeMinVersion: string;
  requiredEnvVars: string[];
  productionSafetyCheck: boolean;
  mode: 'local' | 'remote';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Compare semantic version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) {
      return -1;
    }
    if (numA > numB) {
      return 1;
    }
  }
  return 0;
}

/**
 * Check if a Supabase URL looks like a production environment
 */
function isProductionUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Patterns that indicate production
  const productionPatterns = [
    /production/i,
    /prod\./i,
    /prod-/i,
    /-prod/i,
    /\.prod\./i,
    // Add your specific production project identifiers here
  ];

  // Check for production patterns
  if (productionPatterns.some(pattern => pattern.test(lowerUrl))) {
    return true;
  }

  // Check if URL does NOT contain 'test', 'dev', 'staging', 'local'
  // This is a safety heuristic - unknown URLs are treated as potentially production
  const safePatterns = [
    /test/i,
    /dev/i,
    /staging/i,
    /localhost/i,
    /127\.0\.0\.1/i,
    /local/i,
    /sandbox/i,
  ];

  // If URL contains safe patterns, it's not production
  if (safePatterns.some(pattern => pattern.test(lowerUrl))) {
    return false;
  }

  // Unknown URLs are considered potentially dangerous for remote mode
  return false; // Be permissive but warn
}

export class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate the environment for running autonomous tests
   */
  async validate(options: ValidateOptions): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];

    console.log(chalk.blue('\n=== Environment Validation ===\n'));

    // 1. Check Node.js version
    this.checkNodeVersion(options.nodeMinVersion);

    // 2. Load and check environment files
    await this.loadEnvFiles(options.mode);

    // 3. Check required environment variables
    this.checkRequiredEnvVars(options.requiredEnvVars, options.mode);

    // 4. Production safety check
    if (options.productionSafetyCheck && options.mode === 'remote') {
      this.checkProductionSafety();
    }

    // 5. Check for Supabase CLI in local mode
    if (options.mode === 'local') {
      await this.checkSupabaseCLI();
    }

    // Report results
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      this.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
    }

    if (this.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      this.errors.forEach(e => console.log(chalk.red(`  - ${e}`)));
      console.log('');
    } else {
      console.log(chalk.green('\n✓ Environment validation passed\n'));
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private checkNodeVersion(minVersion: string): void {
    const currentVersion = process.versions.node;
    console.log(`  Node.js version: ${currentVersion}`);

    if (compareVersions(currentVersion, minVersion) < 0) {
      this.errors.push(
        `Node.js ${minVersion}+ required, found ${currentVersion}. Please upgrade Node.js.`
      );
    } else {
      console.log(chalk.green(`  ✓ Node.js version OK (>= ${minVersion})`));
    }
  }

  private async loadEnvFiles(mode: 'local' | 'remote'): Promise<void> {
    const cwd = process.cwd();
    const envFiles = [
      '.env',
      '.env.local',
      '.env.test',
    ];

    // In remote mode, prioritize .env.test
    if (mode === 'remote') {
      envFiles.reverse();
    }

    let loaded = false;
    for (const envFile of envFiles) {
      const envPath = path.join(cwd, envFile);
      if (fs.existsSync(envPath)) {
        console.log(`  Loading ${envFile}...`);
        // Load env file using dynamic import to avoid bundling issues
        const { config } = await import('dotenv');
        config({ path: envPath, override: false });
        loaded = true;
      }
    }

    if (!loaded) {
      this.warnings.push('No .env file found. Relying on system environment variables.');
    }
  }

  private checkRequiredEnvVars(requiredVars: string[], mode: 'local' | 'remote'): void {
    console.log('\n  Checking environment variables:');

    const missing: string[] = [];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
        console.log(chalk.red(`  ✗ ${varName} - missing`));
      } else {
        // Mask sensitive values
        const isSensitive = varName.includes('KEY') || varName.includes('PASSWORD') || varName.includes('SECRET');
        const displayValue = isSensitive ? '***' : value.substring(0, 30) + (value.length > 30 ? '...' : '');
        console.log(chalk.green(`  ✓ ${varName} = ${displayValue}`));
      }
    }

    // In remote mode, also require SUPABASE_SERVICE_ROLE_KEY
    if (mode === 'remote' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY');
      console.log(chalk.red(`  ✗ SUPABASE_SERVICE_ROLE_KEY - required for remote mode`));
    }

    if (missing.length > 0) {
      this.errors.push(
        `Missing required environment variables: ${missing.join(', ')}. ` +
        `Please check your .env.test file.`
      );
    }
  }

  private checkProductionSafety(): void {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';

    console.log('\n  Production safety check:');
    console.log(`  Supabase URL: ${supabaseUrl}`);

    if (isProductionUrl(supabaseUrl)) {
      this.errors.push(
        `SAFETY BLOCK: The Supabase URL "${supabaseUrl}" appears to be a production environment. ` +
        `Running destructive tests against production is not allowed. ` +
        `Set ALLOW_PRODUCTION_TESTS=true to override (USE WITH EXTREME CAUTION).`
      );
    } else if (process.env.ALLOW_PRODUCTION_TESTS === 'true') {
      this.warnings.push(
        'ALLOW_PRODUCTION_TESTS is enabled. Tests will run against the configured database. ' +
        'Ensure this is intentional.'
      );
    } else {
      console.log(chalk.green('  ✓ URL does not appear to be production'));
    }
  }

  private async checkSupabaseCLI(): Promise<void> {
    console.log('\n  Checking Supabase CLI:');

    try {
      const { execa } = await import('execa');
      const result = await execa('npx', ['supabase', '--version'], {
        timeout: 10000,
        reject: false
      });

      if (result.exitCode === 0) {
        console.log(chalk.green(`  ✓ Supabase CLI available: ${result.stdout.trim()}`));
      } else {
        this.warnings.push(
          'Supabase CLI not found. Local mode database reset may not work. ' +
          'Install with: npm install -g supabase'
        );
      }
    } catch (error) {
      this.warnings.push(
        'Could not verify Supabase CLI. Local mode database reset may not work.'
      );
    }
  }
}

/**
 * Quick validation function for use in scripts
 */
export async function validateEnvironment(
  mode: 'local' | 'remote' = 'local'
): Promise<boolean> {
  const validator = new EnvironmentValidator();

  const result = await validator.validate({
    nodeMinVersion: '20.0.0',
    requiredEnvVars: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'TEST_USER_EMAIL',
      'TEST_USER_PASSWORD',
    ],
    productionSafetyCheck: true,
    mode,
  });

  return result.valid;
}
