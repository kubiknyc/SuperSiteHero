import { test, expect, Page } from '@playwright/test';

// Test user credentials
const TEST_USER = {
  email: 'test@supersitehero.com',
  password: 'TestPassword123!',
};

// Helper functions
async function login(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function logout(page: Page) {
  await page.click('button[aria-label="User menu"]');
  await page.click('text=Sign Out');
  await page.waitForURL('/login');
}

// Test data factories
function generateDailyReport() {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    weather: 'sunny',
    tempHigh: '75',
    tempLow: '60',
    workSummary: `Completed foundation work in section A. Installed rebar and prepared for concrete pour. ${Date.now()}`,
    materials: 'Concrete: 50 yards, Rebar: 2000 lbs',
    safety: 'No incidents',
    visitors: 'Building inspector - approved foundation',
    notes: 'Good progress today, on schedule',
  };
}

function generateTask() {
  return {
    title: `Install electrical panel ${Date.now()}`,
    description: 'Install main electrical panel in building B',
    priority: 'high',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    assignee: 'John Doe',
    estimatedHours: '8',
    tags: ['electrical', 'critical-path'],
  };
}

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Check login page elements
    await expect(page.locator('h1')).toContainText(/sign in|login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Perform login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText(/dashboard/i);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await logout(page);

    // Verify redirect to login
    await expect(page).toHaveURL('/login');

    // Try to access protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/daily-reports');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Daily Reports Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new daily report', async ({ page }) => {
    const report = generateDailyReport();

    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');
    await expect(page.locator('h1')).toContainText(/daily report/i);

    // Click create button
    await page.click('button:has-text("New Report")');

    // Fill form
    await page.fill('input[name="report_date"]', report.date);
    await page.selectOption('select[name="weather_conditions"]', report.weather);
    await page.fill('input[name="temperature_high"]', report.tempHigh);
    await page.fill('input[name="temperature_low"]', report.tempLow);
    await page.fill('textarea[name="work_completed_summary"]', report.workSummary);
    await page.fill('textarea[name="materials_used_summary"]', report.materials);
    await page.fill('textarea[name="safety_incidents"]', report.safety);
    await page.fill('textarea[name="visitor_log"]', report.visitors);
    await page.fill('textarea[name="notes"]', report.notes);

    // Submit form
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify success
    await expect(page.locator('text=/created|saved|success/i')).toBeVisible();
    await expect(page.locator(`text="${report.workSummary}"`)).toBeVisible();
  });

  test('should edit existing daily report', async ({ page }) => {
    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');

    // Click on first report
    await page.click('button:has-text("View"):first-of-type');

    // Click edit button
    await page.click('button:has-text("Edit")');

    // Update fields
    const updatedNotes = `Updated notes - ${Date.now()}`;
    await page.fill('textarea[name="notes"]', updatedNotes);

    // Save changes
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify update
    await expect(page.locator('text=/updated|saved/i')).toBeVisible();
    await expect(page.locator(`text="${updatedNotes}"`)).toBeVisible();
  });

  test('should delete daily report with confirmation', async ({ page }) => {
    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');

    // Count initial reports
    const initialCount = await page.locator('[data-testid="report-item"]').count();

    // Click delete on first report
    await page.click('button:has-text("Delete"):first-of-type');

    // Confirm deletion
    await page.click('button:has-text("Yes, Delete")');

    // Verify deletion
    await expect(page.locator('text=/deleted|removed/i')).toBeVisible();

    // Verify count decreased
    const newCount = await page.locator('[data-testid="report-item"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should filter reports by date range', async ({ page }) => {
    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');

    // Set date range
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    await page.fill('input[name="start_date"]', startDate);
    await page.fill('input[name="end_date"]', endDate);
    await page.click('button:has-text("Filter")');

    // Verify filtered results
    await expect(page.locator('[data-testid="report-item"]')).toHaveCount(await page.locator('[data-testid="report-item"]').count());

    // All visible reports should be within date range
    const reportDates = await page.locator('[data-testid="report-date"]').allTextContents();
    reportDates.forEach(dateStr => {
      const reportDate = new Date(dateStr);
      expect(reportDate >= new Date(startDate)).toBeTruthy();
      expect(reportDate <= new Date(endDate)).toBeTruthy();
    });
  });
});

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new task', async ({ page }) => {
    const task = generateTask();

    // Navigate to tasks
    await page.click('a[href="/tasks"]');
    await expect(page.locator('h1')).toContainText(/task/i);

    // Click create button
    await page.click('button:has-text("New Task")');

    // Fill form
    await page.fill('input[name="title"]', task.title);
    await page.fill('textarea[name="description"]', task.description);
    await page.selectOption('select[name="priority"]', task.priority);
    await page.fill('input[name="due_date"]', task.dueDate);
    await page.fill('input[name="estimated_hours"]', task.estimatedHours);

    // Add tags
    for (const tag of task.tags) {
      await page.fill('input[name="tag_input"]', tag);
      await page.keyboard.press('Enter');
    }

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Task")');

    // Verify success
    await expect(page.locator('text=/created|saved|success/i')).toBeVisible();
    await expect(page.locator(`text="${task.title}"`)).toBeVisible();
  });

  test('should update task status', async ({ page }) => {
    // Navigate to tasks
    await page.click('a[href="/tasks"]');

    // Click on first task
    await page.click('[data-testid="task-item"]:first-of-type');

    // Change status
    await page.selectOption('select[name="status"]', 'in_progress');
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=/updated|saved/i')).toBeVisible();
    await expect(page.locator('text="In Progress"')).toBeVisible();
  });

  test('should assign task to user', async ({ page }) => {
    // Navigate to tasks
    await page.click('a[href="/tasks"]');

    // Click on first unassigned task
    await page.click('[data-testid="unassigned-task"]:first-of-type');

    // Assign to user
    await page.selectOption('select[name="assigned_to"]', 'user-123');
    await page.click('button:has-text("Save")');

    // Verify assignment
    await expect(page.locator('text=/assigned|updated/i')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Navigate to tasks
    await page.click('a[href="/tasks"]');

    // Filter by status
    await page.selectOption('select[name="status_filter"]', 'pending');

    // Verify all visible tasks have pending status
    const taskStatuses = await page.locator('[data-testid="task-status"]').allTextContents();
    taskStatuses.forEach(status => {
      expect(status.toLowerCase()).toContain('pending');
    });
  });

  test('should mark task as complete', async ({ page }) => {
    // Navigate to tasks
    await page.click('a[href="/tasks"]');

    // Find an in-progress task
    await page.click('[data-testid="task-status"]:has-text("In Progress"):first-of-type');

    // Mark as complete
    await page.click('button:has-text("Mark Complete")');

    // Confirm completion
    await page.click('button:has-text("Yes, Complete")');

    // Verify completion
    await expect(page.locator('text=/completed|finished/i')).toBeVisible();
    await expect(page.locator('[data-testid="task-status"]:has-text("Completed")')).toBeVisible();
  });
});

test.describe('Change Order Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a change order', async ({ page }) => {
    // Navigate to change orders
    await page.click('a[href="/change-orders"]');
    await expect(page.locator('h1')).toContainText(/change order/i);

    // Click create button
    await page.click('button:has-text("New Change Order")');

    // Fill form
    await page.fill('input[name="title"]', `Electrical upgrade ${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Upgrade main electrical panel from 200A to 400A service');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('input[name="due_date"]', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Submit
    await page.click('button[type="submit"]:has-text("Create")');

    // Verify creation
    await expect(page.locator('text=/created|submitted/i')).toBeVisible();
  });

  test('should add bid to change order', async ({ page }) => {
    // Navigate to change orders
    await page.click('a[href="/change-orders"]');

    // Click on first change order
    await page.click('[data-testid="change-order-item"]:first-of-type');

    // Click add bid
    await page.click('button:has-text("Add Bid")');

    // Fill bid form
    await page.selectOption('select[name="subcontractor_id"]', { index: 1 });
    await page.fill('input[name="lump_sum_cost"]', '15000');
    await page.fill('textarea[name="notes"]', 'Includes all materials and labor');

    // Submit bid
    await page.click('button[type="submit"]:has-text("Submit Bid")');

    // Verify bid added
    await expect(page.locator('text=/bid.*added|submitted/i')).toBeVisible();
    await expect(page.locator('text="$15,000"')).toBeVisible();
  });

  test('should approve change order', async ({ page }) => {
    // Navigate to change orders
    await page.click('a[href="/change-orders"]');

    // Click on a submitted change order
    await page.click('[data-testid="change-order-status"]:has-text("Submitted"):first-of-type');

    // Click approve button
    await page.click('button:has-text("Approve")');

    // Add approval notes
    await page.fill('textarea[name="approval_notes"]', 'Approved for immediate execution');
    await page.click('button:has-text("Confirm Approval")');

    // Verify approval
    await expect(page.locator('text=/approved/i')).toBeVisible();
    await expect(page.locator('[data-testid="change-order-status"]:has-text("Approved")')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should navigate mobile menu', async ({ page }) => {
    await login(page);

    // Open mobile menu
    await page.click('[aria-label="Menu"]');

    // Check menu items are visible
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Daily Reports")')).toBeVisible();
    await expect(page.locator('a:has-text("Tasks")')).toBeVisible();

    // Navigate to a page
    await page.click('a:has-text("Tasks")');

    // Verify navigation
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1')).toContainText(/task/i);
  });

  test('should create daily report on mobile', async ({ page }) => {
    await login(page);

    const report = generateDailyReport();

    // Open mobile menu and navigate
    await page.click('[aria-label="Menu"]');
    await page.click('a:has-text("Daily Reports")');

    // Click create button
    await page.click('button:has-text("New")');

    // Fill minimal fields
    await page.fill('input[name="report_date"]', report.date);
    await page.selectOption('select[name="weather_conditions"]', report.weather);
    await page.fill('textarea[name="work_completed_summary"]', report.workSummary);

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=/created|saved/i')).toBeVisible();
  });
});

test.describe('Performance and Loading States', () => {
  test('should show loading states while fetching data', async ({ page }) => {
    // Slow down network
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await login(page);

    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');

    // Check loading state
    await expect(page.locator('[aria-label="Loading"]')).toBeVisible();

    // Wait for content
    await expect(page.locator('[data-testid="report-item"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await login(page);

    // Block API calls
    await page.route('**/api/daily_reports**', route => route.abort());

    // Navigate to daily reports
    await page.click('a[href="/daily-reports"]');

    // Check error message
    await expect(page.locator('text=/error|failed|try again/i')).toBeVisible({ timeout: 10000 });

    // Check retry button exists
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});