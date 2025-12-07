# Load Testing with k6

Comprehensive load testing infrastructure for SuperSiteHero using k6.

## Prerequisites

### Install k6

**Windows (with Chocolatey):**
```bash
choco install k6
```

**macOS (with Homebrew):**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Or download binary from:** https://k6.io/docs/getting-started/installation/

## Environment Setup

Create a `.env.k6` file in the project root:

```bash
# Application URLs
BASE_URL=http://localhost:5173
API_URL=https://your-project.supabase.co

# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Test user credentials (create these in your test database)
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=Test1234!
TEST_SUPER_EMAIL=super@test.com
TEST_SUPER_PASSWORD=Test1234!
TEST_FOREMAN_EMAIL=foreman@test.com
TEST_FOREMAN_PASSWORD=Test1234!
```

**Load environment variables before running tests:**
```bash
# Windows PowerShell
Get-Content .env.k6 | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}

# macOS/Linux
export $(cat .env.k6 | xargs)
```

## Running Load Tests

### Quick Start

```bash
# Run authentication load test (default: load scenario)
npm run perf:load

# Or run directly with k6
k6 run tests/load/scenarios/auth.js
```

### All Scenarios

```bash
# Authentication tests
k6 run tests/load/scenarios/auth.js

# Project CRUD operations
npm run perf:load:projects
k6 run tests/load/scenarios/projects.js

# Document upload/download
npm run perf:load:documents
k6 run tests/load/scenarios/documents.js

# API stress test (comprehensive)
npm run perf:load:stress
k6 run --env SCENARIO=stress tests/load/scenarios/api-stress.js

# API spike test
npm run perf:load:spike
k6 run --env SCENARIO=spike tests/load/scenarios/api-stress.js
```

### Custom Scenarios

You can specify different load patterns:

```bash
# Smoke test (1 user)
k6 run --stage 30s:1 tests/load/scenarios/auth.js

# Load test (10 users, 5 minutes)
k6 run --stage 2m:10 --stage 5m:10 --stage 2m:0 tests/load/scenarios/projects.js

# Stress test (50 users)
k6 run --env SCENARIO=stress tests/load/scenarios/api-stress.js

# Spike test (sudden 100 users)
k6 run --env SCENARIO=spike tests/load/scenarios/api-stress.js

# Soak test (20 users, 1 hour)
k6 run --env SCENARIO=soak tests/load/scenarios/api-stress.js
```

## Test Scenarios

### 1. Authentication (`auth.js`)
Tests user authentication flow:
- User login
- Session validation
- Profile fetch
- Logout

**Thresholds:**
- Login: 95% under 1s, 99% under 2s
- Session validation: 95% under 500ms
- Success rate: 99%+

### 2. Projects (`projects.js`)
Tests project CRUD operations:
- Create project
- List projects
- Read single project
- Update project
- Delete project

**Thresholds:**
- Create: 95% under 2s
- Read: 95% under 500ms
- Update: 95% under 1.5s
- Delete: 95% under 1s

### 3. Documents (`documents.js`)
Tests document operations:
- Upload document (100KB PDF)
- List documents
- Download document
- Get metadata

**Thresholds:**
- Upload: 95% under 5s
- Download: 95% under 2s
- List: 95% under 1s

### 4. API Stress (`api-stress.js`)
Comprehensive stress test of all endpoints:
- Projects
- Daily Reports
- RFIs
- Tasks
- Documents
- Change Orders
- Submittals
- Punch Items
- Complex queries with joins
- Aggregation queries

**Thresholds:**
- Overall response time: 95% under 2s
- Error rate: < 5% under stress
- Success rate: 95%+

## Load Patterns

### Smoke Test
Single user, 30 seconds. Validates basic functionality.
```javascript
stages: [{ duration: '30s', target: 1 }]
```

### Load Test
Gradual ramp-up to normal load, sustained, then ramp-down.
```javascript
stages: [
  { duration: '2m', target: 10 },  // Ramp-up
  { duration: '5m', target: 10 },  // Sustain
  { duration: '2m', target: 0 },   // Ramp-down
]
```

### Stress Test
Higher load to identify breaking points.
```javascript
stages: [
  { duration: '2m', target: 20 },
  { duration: '5m', target: 20 },
  { duration: '2m', target: 50 },  // Spike
  { duration: '5m', target: 50 },
  { duration: '2m', target: 0 },
]
```

### Spike Test
Sudden surge in traffic.
```javascript
stages: [
  { duration: '1m', target: 10 },
  { duration: '30s', target: 100 }, // Sudden spike
  { duration: '2m', target: 100 },
  { duration: '1m', target: 0 },
]
```

### Soak Test
Sustained load over extended period (finds memory leaks).
```javascript
stages: [
  { duration: '5m', target: 20 },
  { duration: '60m', target: 20 },  // 1 hour sustained
  { duration: '5m', target: 0 },
]
```

## Interpreting Results

### Key Metrics

**Response Time:**
- `http_req_duration`: Total request duration
- `http_req_waiting`: Time to first byte (TTFB)
- `http_req_receiving`: Time receiving response

**Throughput:**
- `http_reqs`: Total requests
- `iterations`: Test iterations completed
- `data_received/sent`: Network traffic

**Errors:**
- `http_req_failed`: Failed request rate
- `checks`: Check pass rate

### Success Criteria

**Good Performance:**
- P95 response time < 2s
- P99 response time < 5s
- Error rate < 1%
- Check pass rate > 95%

**Warning Signs:**
- P95 > 3s: Investigate slow queries
- Error rate > 1%: Check error logs
- Check failures: Review assertions

**Critical Issues:**
- P95 > 5s: Critical performance issue
- Error rate > 5%: System instability
- Check pass rate < 90%: Major failures

### Example Output

```
✓ login status is 200
✓ login returns access token
✓ login duration under 2s

checks.........................: 98.50% ✓ 2955  ✗ 45
data_received..................: 3.2 MB 10 kB/s
data_sent......................: 1.1 MB 3.5 kB/s
http_req_duration..............: avg=456ms min=98ms med=389ms max=2.1s p(95)=1.2s p(99)=1.8s
http_req_failed................: 0.50%  ✓ 15    ✗ 2985
http_reqs......................: 3000   10/s
iterations.....................: 600    2/s
login_duration.................: avg=789ms min=234ms med=698ms max=1.9s p(95)=1.4s p(99)=1.7s
login_success_rate.............: 98.33% ✓ 590   ✗ 10
vus............................: 10     min=0   max=10
vus_max........................: 10     min=10  max=10
```

## Results Storage

Results are automatically saved to `tests/load/results/`:
- `auth-summary.json`
- `projects-summary.json`
- `documents-summary.json`
- `api-stress-summary.json`
- `api-stress-summary.html`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Mondays at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_SUPER_EMAIL: ${{ secrets.TEST_SUPER_EMAIL }}
          TEST_SUPER_PASSWORD: ${{ secrets.TEST_SUPER_PASSWORD }}
        run: |
          k6 run tests/load/scenarios/auth.js
          k6 run tests/load/scenarios/projects.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/results/
```

## Best Practices

### Before Running Tests

1. **Use Test Environment:** Never run load tests against production
2. **Seed Test Data:** Ensure database has sufficient test data
3. **Warm Up:** Run a smoke test first to warm up caches
4. **Monitor:** Watch server metrics during tests

### During Tests

1. **Monitor Resources:** CPU, memory, database connections
2. **Check Logs:** Watch for errors in real-time
3. **Database Metrics:** Query performance, connection pool
4. **Network:** Bandwidth usage

### After Tests

1. **Analyze Results:** Review all metrics
2. **Compare Baselines:** Track performance over time
3. **Identify Bottlenecks:** Slow queries, memory leaks
4. **Document Findings:** Note any issues discovered
5. **Optimize:** Address performance issues
6. **Retest:** Verify improvements

## Troubleshooting

### Connection Refused
- Ensure application is running
- Check BASE_URL and API_URL

### Authentication Failures
- Verify test user credentials
- Check Supabase URL and anon key
- Ensure test users exist in database

### High Error Rates
- Check server logs for errors
- Verify database connectivity
- Check RLS policies
- Review rate limiting

### Slow Performance
- Check database indexes
- Review query complexity
- Check network latency
- Monitor database connections

## Resources

- k6 Documentation: https://k6.io/docs/
- k6 Examples: https://k6.io/docs/examples/
- k6 Cloud: https://k6.io/cloud/
- Best Practices: https://k6.io/docs/testing-guides/

## Support

For questions or issues:
1. Review k6 documentation
2. Check application logs
3. Run with `--verbose` flag for debugging
4. Use `--http-debug` for HTTP request/response details
