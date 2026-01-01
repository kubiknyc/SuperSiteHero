/**
 * Server Health Check Utilities
 *
 * Pre-test verification of server responsiveness including:
 * - Development server availability
 * - Supabase API connectivity
 * - Authentication endpoint readiness
 */

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    name: string;
    passed: boolean;
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }[];
  totalTime: number;
}

export interface HealthCheckOptions {
  /** Base URL of the application */
  baseURL: string;
  /** Supabase project URL */
  supabaseUrl?: string;
  /** Maximum time to wait for each check (ms) */
  timeout?: number;
  /** Number of retry attempts for failed checks */
  retries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<HealthCheckOptions, 'baseURL' | 'supabaseUrl'>> = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  verbose: true,
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a single health check with retry logic
 */
async function executeCheck(
  name: string,
  checkFn: () => Promise<{ passed: boolean; details?: Record<string, unknown> }>,
  options: Required<Omit<HealthCheckOptions, 'baseURL' | 'supabaseUrl'>>
): Promise<HealthCheckResult['checks'][0]> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= options.retries; attempt++) {
    try {
      if (options.verbose && attempt > 1) {
        console.log(`   ↻ Retry ${attempt}/${options.retries} for ${name}...`);
      }

      const result = await Promise.race([
        checkFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), options.timeout)
        ),
      ]);

      return {
        name,
        passed: result.passed,
        responseTime: Date.now() - startTime,
        details: result.details,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.retries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = options.retryDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  return {
    name,
    passed: false,
    responseTime: Date.now() - startTime,
    error: lastError?.message || 'Unknown error',
  };
}

/**
 * Check if the development server is responding
 */
async function checkDevServer(
  baseURL: string
): Promise<{ passed: boolean; details?: Record<string, unknown> }> {
  const response = await fetch(baseURL, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });

  const contentType = response.headers.get('content-type') || '';
  const isHtml = contentType.includes('text/html');

  return {
    passed: response.ok && isHtml,
    details: {
      status: response.status,
      statusText: response.statusText,
      contentType,
    },
  };
}

/**
 * Check if the Supabase REST API is reachable
 */
async function checkSupabaseRest(
  supabaseUrl: string
): Promise<{ passed: boolean; details?: Record<string, unknown> }> {
  // The REST API health endpoint
  const restUrl = `${supabaseUrl}/rest/v1/`;

  const response = await fetch(restUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      // Anon key not required for basic connectivity check
    },
  });

  // Supabase returns 401 without auth, but that still means it's reachable
  const isReachable = response.status === 401 || response.ok;

  return {
    passed: isReachable,
    details: {
      status: response.status,
      statusText: response.statusText,
      endpoint: restUrl,
    },
  };
}

/**
 * Check if the Supabase Auth API is reachable
 */
async function checkSupabaseAuth(
  supabaseUrl: string
): Promise<{ passed: boolean; details?: Record<string, unknown> }> {
  // Auth health/settings endpoint
  const authUrl = `${supabaseUrl}/auth/v1/settings`;

  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  // Supabase Auth API returns 401 without API key, but that still means it's reachable
  // This is expected behavior - we're just checking connectivity, not authentication
  const isReachable = response.ok || response.status === 401;

  return {
    passed: isReachable,
    details: {
      status: response.status,
      statusText: response.statusText,
      endpoint: authUrl,
    },
  };
}

/**
 * Check if the login page is accessible and rendering correctly
 *
 * NOTE: For client-side rendered (CSR) React apps, the initial HTML response
 * won't contain form elements - they only appear after JavaScript executes.
 * This check verifies that:
 * 1. The login URL returns a 200 status
 * 2. The response is HTML
 * 3. The HTML contains the React root element for the app to mount
 *
 * The actual form element verification is done later in createAuthenticatedSession
 * using Playwright which executes JavaScript.
 */
async function checkLoginPage(
  baseURL: string
): Promise<{ passed: boolean; details?: Record<string, unknown> }> {
  const loginUrl = `${baseURL}/login`;

  const response = await fetch(loginUrl, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) {
    return {
      passed: false,
      details: { status: response.status, url: loginUrl },
    };
  }

  const html = await response.text();
  const contentType = response.headers.get('content-type') || '';

  // For CSR apps, check that:
  // 1. We got HTML content
  // 2. The HTML contains basic structure (root div for React to mount)
  // 3. The HTML has script tags (indicating JS will execute)
  const isHtml = contentType.includes('text/html');
  const hasRootElement = html.includes('id="root"') || html.includes('id="app"') || html.includes('id="__next"');
  const hasScripts = html.includes('<script');

  // For CSR apps, also check for server-rendered form elements (SSR/hybrid apps)
  // This is optional - won't fail if not present since CSR apps render dynamically
  const hasServerRenderedForm =
    (html.includes('type="email"') || html.includes('name="email"')) &&
    html.includes('type="password"');

  // Pass if we have valid HTML with mounting point, OR if we have server-rendered form
  const passed = isHtml && (hasRootElement || hasServerRenderedForm);

  return {
    passed,
    details: {
      isHtml,
      hasRootElement,
      hasScripts,
      hasServerRenderedForm,
      contentLength: html.length,
      note: hasServerRenderedForm
        ? 'Server-rendered form detected'
        : 'Client-side rendered app detected (form will render after JS execution)',
    },
  };
}

/**
 * Check network connectivity by pinging a reliable endpoint
 */
async function checkNetworkConnectivity(): Promise<{
  passed: boolean;
  details?: Record<string, unknown>;
}> {
  try {
    // Use Google's DNS as a reliable external endpoint
    const response = await fetch('https://dns.google/resolve?name=example.com&type=A', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    return {
      passed: response.ok,
      details: { status: response.status },
    };
  } catch {
    // If we can't reach Google, try Cloudflare
    try {
      const response = await fetch('https://1.1.1.1/dns-query?name=example.com&type=A', {
        method: 'GET',
        headers: { Accept: 'application/dns-json' },
      });

      return {
        passed: response.ok,
        details: { status: response.status, fallback: 'cloudflare' },
      };
    } catch {
      return { passed: false };
    }
  }
}

/**
 * Run all health checks and return comprehensive results
 */
export async function runHealthChecks(options: HealthCheckOptions): Promise<HealthCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const checks: HealthCheckResult['checks'] = [];

  if (opts.verbose) {
    console.log('\n🏥 Running server health checks...\n');
  }

  // 1. Network connectivity (quick sanity check)
  if (opts.verbose) console.log('   → Checking network connectivity...');
  const networkCheck = await executeCheck('Network Connectivity', checkNetworkConnectivity, opts);
  checks.push(networkCheck);
  if (opts.verbose) {
    console.log(`   ${networkCheck.passed ? '✓' : '✗'} Network: ${networkCheck.passed ? 'OK' : networkCheck.error} (${networkCheck.responseTime}ms)`);
  }

  // 2. Development server
  if (opts.verbose) console.log('   → Checking development server...');
  const devServerCheck = await executeCheck(
    'Development Server',
    () => checkDevServer(opts.baseURL),
    opts
  );
  checks.push(devServerCheck);
  if (opts.verbose) {
    console.log(`   ${devServerCheck.passed ? '✓' : '✗'} Dev Server: ${devServerCheck.passed ? 'OK' : devServerCheck.error} (${devServerCheck.responseTime}ms)`);
  }

  // 3. Login page (only if dev server is healthy)
  if (devServerCheck.passed) {
    if (opts.verbose) console.log('   → Checking login page renders correctly...');
    const loginCheck = await executeCheck('Login Page', () => checkLoginPage(opts.baseURL), opts);
    checks.push(loginCheck);
    if (opts.verbose) {
      console.log(`   ${loginCheck.passed ? '✓' : '✗'} Login Page: ${loginCheck.passed ? 'OK' : loginCheck.error} (${loginCheck.responseTime}ms)`);
    }
  }

  // 4. Supabase REST API (if URL provided)
  if (opts.supabaseUrl) {
    if (opts.verbose) console.log('   → Checking Supabase REST API...');
    const restCheck = await executeCheck(
      'Supabase REST API',
      () => checkSupabaseRest(opts.supabaseUrl!),
      opts
    );
    checks.push(restCheck);
    if (opts.verbose) {
      console.log(`   ${restCheck.passed ? '✓' : '✗'} Supabase REST: ${restCheck.passed ? 'OK' : restCheck.error} (${restCheck.responseTime}ms)`);
    }

    // 5. Supabase Auth API
    if (opts.verbose) console.log('   → Checking Supabase Auth API...');
    const authCheck = await executeCheck(
      'Supabase Auth API',
      () => checkSupabaseAuth(opts.supabaseUrl!),
      opts
    );
    checks.push(authCheck);
    if (opts.verbose) {
      console.log(`   ${authCheck.passed ? '✓' : '✗'} Supabase Auth: ${authCheck.passed ? 'OK' : authCheck.error} (${authCheck.responseTime}ms)`);
    }
  }

  const totalTime = Date.now() - startTime;
  const allPassed = checks.every(c => c.passed);

  if (opts.verbose) {
    console.log('');
    if (allPassed) {
      console.log(`✅ All health checks passed (${totalTime}ms total)\n`);
    } else {
      const failedChecks = checks.filter(c => !c.passed);
      console.log(`❌ ${failedChecks.length} health check(s) failed (${totalTime}ms total)`);
      failedChecks.forEach(c => {
        console.log(`   - ${c.name}: ${c.error}`);
        if (c.details) {
          console.log(`     Details: ${JSON.stringify(c.details)}`);
        }
      });
      console.log('');
    }
  }

  return {
    healthy: allPassed,
    checks,
    totalTime,
  };
}

/**
 * Wait for server to become healthy with polling
 */
export async function waitForHealthyServer(
  options: HealthCheckOptions & { maxWaitTime?: number; pollInterval?: number }
): Promise<HealthCheckResult> {
  const maxWaitTime = options.maxWaitTime || 120000; // 2 minutes default
  const pollInterval = options.pollInterval || 5000; // 5 seconds between polls
  const startTime = Date.now();

  console.log(`\n⏳ Waiting for server to become healthy (max ${maxWaitTime / 1000}s)...\n`);

  let lastResult: HealthCheckResult | null = null;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    console.log(`   Attempt ${attempts}...`);

    lastResult = await runHealthChecks({ ...options, verbose: false });

    if (lastResult.healthy) {
      console.log(`\n✅ Server is healthy after ${attempts} attempt(s) (${Date.now() - startTime}ms)\n`);
      return lastResult;
    }

    // Log which checks are still failing
    const failedChecks = lastResult.checks.filter(c => !c.passed);
    console.log(`   Still waiting: ${failedChecks.map(c => c.name).join(', ')}`);

    await sleep(pollInterval);
  }

  console.log(`\n❌ Server did not become healthy within ${maxWaitTime / 1000}s\n`);

  // Return the last result with detailed failure info
  return (
    lastResult || {
      healthy: false,
      checks: [],
      totalTime: Date.now() - startTime,
    }
  );
}

/**
 * Quick health check - just verify server is responding
 */
export async function quickHealthCheck(baseURL: string): Promise<boolean> {
  try {
    const response = await fetch(baseURL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}
