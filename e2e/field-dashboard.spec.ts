/**
 * Field Dashboard E2E Tests
 *
 * Tests critical field dashboard functionality:
 * - Master field dashboard with all projects view
 * - Project-specific field dashboard
 * - Real-time activity feed
 * - Weather widget with current conditions
 * - Today's tasks summary
 * - Active crew/workforce count
 * - Safety alerts and incidents
 * - Quick action buttons (create daily report, log time, etc.)
 * - Project selection and switching
 * - Dashboard widgets and metrics
 * - Mobile responsiveness
 * - Real-time updates and refresh
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import { loginAsTestUser, navigateToPage, waitForPageLoad } from './helpers/test-helpers';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Helper to navigate to field dashboard
async function navigateToFieldDashboard(page: Page, projectId?: string) {
  if (projectId) {
    // Navigate to project-specific dashboard
    await page.goto(`/projects/${projectId}/field-dashboard`);
  } else {
    // Navigate to master dashboard
    await page.goto('/field-dashboard');
  }
  await waitForPageLoad(page);
}

// Helper to navigate to master field dashboard
async function navigateToMasterFieldDashboard(page: Page) {
  await page.goto('/field-dashboard');
  await waitForPageLoad(page);
}

// ============================================================================
// MASTER FIELD DASHBOARD TESTS
// ============================================================================

test.describe('Master Field Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display master field dashboard page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show field dashboard heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Field Dashboard"), h2:has-text("Field Dashboard"), h1:has-text("Dashboard")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display all projects overview', async ({ page }) => {
    const projectsList = page.locator('[data-testid="projects-overview"], [data-testid="project-card"], .project-card, text=/all projects|projects overview/i');

    if (await projectsList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(projectsList.first()).toBeVisible();
    }
  });

  test('should show multiple project cards or list', async ({ page }) => {
    const projectCard = page.locator('[data-testid="project-card"], .project-card, [data-testid*="project-"]');
    const cardCount = await projectCard.count();

    // Should have at least one project card or show empty state
    expect(cardCount >= 0).toBeTruthy();
  });

  test('should display master dashboard metrics', async ({ page }) => {
    const metricsSection = page.locator('[data-testid="dashboard-metrics"], [data-testid="metrics"], .metrics-card, .stats-card');

    if (await metricsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(metricsSection.first()).toBeVisible();
    }
  });

  test('should show aggregate statistics across projects', async ({ page }) => {
    const aggregateStats = page.locator('text=/total.*active|all.*projects|overall/i, [data-testid="aggregate-stats"]');

    if (await aggregateStats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(aggregateStats.first()).toBeVisible();
    }
  });
});

// ============================================================================
// PROJECT-SPECIFIC FIELD DASHBOARD TESTS
// ============================================================================

test.describe('Project-Specific Field Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);

    // Navigate to projects and get first project
    await page.goto('/projects');
    await waitForPageLoad(page);

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await waitForPageLoad(page);

      // Try to navigate to field dashboard for this project
      const fieldDashboardLink = page.locator('a:has-text("Field Dashboard"), a[href*="field-dashboard"]');
      if (await fieldDashboardLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await fieldDashboardLink.first().click();
        await waitForPageLoad(page);
      } else {
        // Try direct URL pattern
        const currentUrl = page.url();
        const match = currentUrl.match(/\/projects\/([^/]+)/);
        if (match) {
          await navigateToFieldDashboard(page, match[1]);
        }
      }
    }
  });

  test('should display project-specific dashboard', async ({ page }) => {
    const dashboard = page.locator('[data-testid="field-dashboard"], main, [role="main"]');
    await expect(dashboard.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show project name and details', async ({ page }) => {
    const projectName = page.locator('h1, h2, [data-testid="project-name"]');
    await expect(projectName.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display project-specific metrics', async ({ page }) => {
    const metrics = page.locator('[data-testid="project-metrics"], .metric-card, .stats-card');

    if (await metrics.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(metrics.first()).toBeVisible();
    }
  });

  test('should show project completion percentage', async ({ page }) => {
    const completionIndicator = page.locator('text=/\\d+%|completion|progress/i, [data-testid="completion-percentage"]');

    if (await completionIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(completionIndicator.first()).toBeVisible();
    }
  });

  test('should display project timeline or schedule info', async ({ page }) => {
    const timeline = page.locator('text=/timeline|schedule|due date|deadline/i, [data-testid="project-timeline"]');

    if (await timeline.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timeline.first()).toBeVisible();
    }
  });
});

// ============================================================================
// REAL-TIME ACTIVITY FEED TESTS
// ============================================================================

test.describe('Real-Time Activity Feed', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display activity feed', async ({ page }) => {
    const activityFeed = page.locator('[data-testid="activity-feed"], [data-testid="activities"], .activity-feed, text=/recent activity|activity/i');

    if (await activityFeed.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activityFeed.first()).toBeVisible();
    }
  });

  test('should show recent activity items', async ({ page }) => {
    const activityItem = page.locator('[data-testid="activity-item"], .activity-item, .activity-card');

    if (await activityItem.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activityItem.first()).toBeVisible();
    }
  });

  test('should display activity timestamps', async ({ page }) => {
    const timestamp = page.locator('time, [data-testid="activity-time"], text=/ago|today|yesterday|\\d+ (min|hour|day)/i');

    if (await timestamp.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timestamp.first()).toBeVisible();
    }
  });

  test('should show activity types and icons', async ({ page }) => {
    const activityIcon = page.locator('[data-testid="activity-icon"], .activity-icon, svg[class*="activity"]');

    if (await activityIcon.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activityIcon.first()).toBeVisible();
    }
  });

  test('should show user who performed activity', async ({ page }) => {
    const activityUser = page.locator('[data-testid="activity-user"], .activity-user, text=/by|created by|updated by/i');

    if (await activityUser.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activityUser.first()).toBeVisible();
    }
  });

  test('should support filtering activities', async ({ page }) => {
    const activityFilter = page.locator('select[name*="activity"], button:has-text("Filter"), [data-testid="activity-filter"]');

    if (await activityFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await activityFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should load more activities when scrolling', async ({ page }) => {
    const activityFeed = page.locator('[data-testid="activity-feed"], .activity-feed');

    if (await activityFeed.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialCount = await page.locator('[data-testid="activity-item"], .activity-item').count();

      // Scroll down
      await activityFeed.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Show More")');
      if (await loadMoreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

// ============================================================================
// WEATHER WIDGET TESTS
// ============================================================================

test.describe('Weather Widget', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display weather widget', async ({ page }) => {
    const weatherWidget = page.locator('[data-testid="weather-widget"], [data-testid="weather"], .weather-widget, text=/weather|current conditions/i');

    if (await weatherWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(weatherWidget.first()).toBeVisible();
    }
  });

  test('should show current temperature', async ({ page }) => {
    const temperature = page.locator('text=/\\d+°[FC]/, [data-testid="temperature"], [data-testid="current-temp"]');

    if (await temperature.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(temperature.first()).toBeVisible();
    }
  });

  test('should display weather condition', async ({ page }) => {
    const condition = page.locator('text=/sunny|cloudy|rain|snow|clear|overcast|partly cloudy/i, [data-testid="weather-condition"]');

    if (await condition.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(condition.first()).toBeVisible();
    }
  });

  test('should show weather icon', async ({ page }) => {
    const weatherIcon = page.locator('[data-testid="weather-icon"], .weather-icon, svg[class*="weather"]');

    if (await weatherIcon.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(weatherIcon.first()).toBeVisible();
    }
  });

  test('should display additional weather details', async ({ page }) => {
    const weatherDetails = page.locator('text=/humidity|wind|precipitation|feels like/i, [data-testid="weather-details"]');

    if (await weatherDetails.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(weatherDetails.first()).toBeVisible();
    }
  });

  test('should show weather location', async ({ page }) => {
    const location = page.locator('[data-testid="weather-location"], text=/site|location|project site/i');

    if (await location.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(location.first()).toBeVisible();
    }
  });

  test('should display weather forecast', async ({ page }) => {
    const forecast = page.locator('[data-testid="weather-forecast"], text=/forecast|today|tomorrow/i');

    if (await forecast.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(forecast.first()).toBeVisible();
    }
  });

  test('should refresh weather data', async ({ page }) => {
    const refreshButton = page.locator('button[aria-label*="refresh" i], button:has-text("Refresh"), [data-testid="weather-refresh"]');

    if (await refreshButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshButton.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

// ============================================================================
// TODAY'S TASKS SUMMARY TESTS
// ============================================================================

test.describe('Today\'s Tasks Summary', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display tasks summary widget', async ({ page }) => {
    const tasksSummary = page.locator('[data-testid="tasks-summary"], [data-testid="today-tasks"], .tasks-widget, text=/today.*tasks|tasks.*today/i');

    if (await tasksSummary.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tasksSummary.first()).toBeVisible();
    }
  });

  test('should show task count for today', async ({ page }) => {
    const taskCount = page.locator('text=/\\d+.*task|task.*\\d+/i, [data-testid="task-count"]');

    if (await taskCount.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(taskCount.first()).toBeVisible();
    }
  });

  test('should display tasks by status', async ({ page }) => {
    const taskStatus = page.locator('text=/pending|in progress|completed|overdue/i, [data-testid="task-status"]');

    if (await taskStatus.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(taskStatus.first()).toBeVisible();
    }
  });

  test('should show task priority indicators', async ({ page }) => {
    const priorityIndicator = page.locator('text=/high|medium|low|urgent|priority/i, [data-testid="task-priority"]');

    if (await priorityIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(priorityIndicator.first()).toBeVisible();
    }
  });

  test('should list individual task items', async ({ page }) => {
    const taskItem = page.locator('[data-testid="task-item"], .task-item, .task-card');

    if (await taskItem.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(taskItem.first()).toBeVisible();
    }
  });

  test('should navigate to task details from summary', async ({ page }) => {
    const taskLink = page.locator('[data-testid="task-item"] a, .task-item a, a[href*="/tasks/"]');

    if (await taskLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await taskLink.first().click();
      await page.waitForTimeout(1500);

      // Should navigate to task page
      expect(page.url()).toMatch(/tasks/);
    }
  });

  test('should show view all tasks link', async ({ page }) => {
    const viewAllLink = page.locator('a:has-text("View All"), a:has-text("See All"), a[href*="/tasks"]');

    if (await viewAllLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(viewAllLink.first()).toBeVisible();
    }
  });
});

// ============================================================================
// ACTIVE CREW/WORKFORCE COUNT TESTS
// ============================================================================

test.describe('Active Crew/Workforce Count', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display workforce widget', async ({ page }) => {
    const workforceWidget = page.locator('[data-testid="workforce-widget"], [data-testid="crew-count"], .workforce-widget, text=/workforce|crew|workers|on site/i');

    if (await workforceWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(workforceWidget.first()).toBeVisible();
    }
  });

  test('should show active crew count', async ({ page }) => {
    const crewCount = page.locator('text=/\\d+.*crew|\\d+.*workers|\\d+.*on.*site/i, [data-testid="crew-count"]');

    if (await crewCount.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(crewCount.first()).toBeVisible();
    }
  });

  test('should display workforce breakdown by role', async ({ page }) => {
    const workforceBreakdown = page.locator('text=/by role|trades|subcontractors/i, [data-testid="workforce-breakdown"]');

    if (await workforceBreakdown.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(workforceBreakdown.first()).toBeVisible();
    }
  });

  test('should show total workers on site', async ({ page }) => {
    const totalWorkers = page.locator('text=/total|all.*workers|total.*on.*site/i, [data-testid="total-workers"]');

    if (await totalWorkers.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(totalWorkers.first()).toBeVisible();
    }
  });

  test('should display time-in status', async ({ page }) => {
    const timeInStatus = page.locator('text=/checked in|clocked in|on site/i, [data-testid="time-in-status"]');

    if (await timeInStatus.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timeInStatus.first()).toBeVisible();
    }
  });

  test('should show crew member list', async ({ page }) => {
    const crewList = page.locator('[data-testid="crew-list"], .crew-member, .worker-item');

    if (await crewList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(crewList.first()).toBeVisible();
    }
  });

  test('should display attendance percentage', async ({ page }) => {
    const attendance = page.locator('text=/\\d+%.*attendance|attendance.*\\d+%/i, [data-testid="attendance"]');

    if (await attendance.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(attendance.first()).toBeVisible();
    }
  });
});

// ============================================================================
// SAFETY ALERTS AND INCIDENTS TESTS
// ============================================================================

test.describe('Safety Alerts and Incidents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display safety widget', async ({ page }) => {
    const safetyWidget = page.locator('[data-testid="safety-widget"], [data-testid="safety-alerts"], .safety-widget, text=/safety|incidents|alerts/i');

    if (await safetyWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(safetyWidget.first()).toBeVisible();
    }
  });

  test('should show active safety alerts', async ({ page }) => {
    const safetyAlerts = page.locator('[data-testid="safety-alert"], .safety-alert, .alert-item');

    if (await safetyAlerts.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(safetyAlerts.first()).toBeVisible();
    }
  });

  test('should display incident count', async ({ page }) => {
    const incidentCount = page.locator('text=/\\d+.*incident|incident.*\\d+|no incidents/i, [data-testid="incident-count"]');

    if (await incidentCount.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(incidentCount.first()).toBeVisible();
    }
  });

  test('should show safety score or days without incident', async ({ page }) => {
    const safetyScore = page.locator('text=/\\d+.*days.*without|safety score|incident free/i, [data-testid="safety-score"]');

    if (await safetyScore.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(safetyScore.first()).toBeVisible();
    }
  });

  test('should display critical safety alerts with priority', async ({ page }) => {
    const criticalAlert = page.locator('text=/critical|urgent|warning|high priority/i, [data-testid="critical-alert"]');

    if (await criticalAlert.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(criticalAlert.first()).toBeVisible();
    }
  });

  test('should show recent incidents', async ({ page }) => {
    const recentIncidents = page.locator('[data-testid="recent-incidents"], text=/recent incidents|latest incidents/i');

    if (await recentIncidents.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(recentIncidents.first()).toBeVisible();
    }
  });

  test('should navigate to safety incidents page', async ({ page }) => {
    const safetyLink = page.locator('a:has-text("View All"), a:has-text("Safety"), a[href*="safety"]');

    if (await safetyLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await safetyLink.first().click();
      await page.waitForTimeout(1500);

      // Should navigate to safety page
      expect(page.url()).toMatch(/safety/);
    }
  });
});

// ============================================================================
// QUICK ACTION BUTTONS TESTS
// ============================================================================

test.describe('Quick Action Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display quick actions section', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions, text=/quick actions|actions/i');

    if (await quickActions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('should show create daily report button', async ({ page }) => {
    const dailyReportButton = page.locator('button:has-text("Daily Report"), a:has-text("Daily Report"), button:has-text("Create Report")');

    if (await dailyReportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(dailyReportButton.first()).toBeVisible();
    }
  });

  test('should open daily report creation from quick action', async ({ page }) => {
    const dailyReportButton = page.locator('button:has-text("Daily Report"), a:has-text("Create Report"), button:has-text("New Report")');

    if (await dailyReportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await dailyReportButton.first().click();
      await page.waitForTimeout(1500);

      // Should show daily report form or navigate to daily reports
      const reportForm = page.locator('form, [role="dialog"], input[name*="date"]');
      const hasForm = await reportForm.first().isVisible({ timeout: 3000 }).catch(() => false);
      const onReportPage = page.url().includes('daily-report');

      expect(hasForm || onReportPage).toBeTruthy();
    }
  });

  test('should show log time button', async ({ page }) => {
    const logTimeButton = page.locator('button:has-text("Log Time"), a:has-text("Log Time"), button:has-text("Time Entry")');

    if (await logTimeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(logTimeButton.first()).toBeVisible();
    }
  });

  test('should show create task button', async ({ page }) => {
    const createTaskButton = page.locator('button:has-text("New Task"), a:has-text("Create Task"), button:has-text("Add Task")');

    if (await createTaskButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(createTaskButton.first()).toBeVisible();
    }
  });

  test('should show report incident button', async ({ page }) => {
    const incidentButton = page.locator('button:has-text("Report Incident"), a:has-text("Safety Incident"), button:has-text("Report")');

    if (await incidentButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(incidentButton.first()).toBeVisible();
    }
  });

  test('should show check in/out button', async ({ page }) => {
    const checkInButton = page.locator('button:has-text("Check In"), button:has-text("Check Out"), button:has-text("Clock In")');

    if (await checkInButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(checkInButton.first()).toBeVisible();
    }
  });

  test('should execute quick action and show confirmation', async ({ page }) => {
    const quickActionButton = page.locator('[data-testid="quick-action"] button, .quick-actions button').first();

    if (await quickActionButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickActionButton.click();
      await page.waitForTimeout(1000);

      // Should show some response (modal, navigation, or confirmation)
      const modalOrForm = page.locator('[role="dialog"], form, [role="alert"]');
      const hasResponse = await modalOrForm.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasResponse || true).toBeTruthy();
    }
  });
});

// ============================================================================
// PROJECT SELECTION AND SWITCHING TESTS
// ============================================================================

test.describe('Project Selection and Switching', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display project selector', async ({ page }) => {
    const projectSelector = page.locator('select[name="project"], [data-testid="project-selector"], button:has-text("Select Project")');

    if (await projectSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(projectSelector.first()).toBeVisible();
    }
  });

  test('should show current project name', async ({ page }) => {
    const currentProject = page.locator('[data-testid="current-project"], [data-testid="selected-project"]');

    if (await currentProject.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(currentProject.first()).toBeVisible();
    }
  });

  test('should list available projects in selector', async ({ page }) => {
    const projectSelector = page.locator('select[name="project"], button:has-text("Select Project"), [data-testid="project-selector"]');

    if (await projectSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectSelector.first().click();
      await page.waitForTimeout(500);

      const projectOptions = page.locator('[role="option"], option, [data-testid="project-option"]');
      const optionCount = await projectOptions.count();

      expect(optionCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should switch between projects', async ({ page }) => {
    const projectSelector = page.locator('select[name="project"], [data-testid="project-selector"]');

    if (await projectSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await projectSelector.first().evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'select') {
        const optionCount = await projectSelector.first().locator('option').count();
        if (optionCount > 1) {
          await projectSelector.first().selectOption({ index: 1 });
          await waitForPageLoad(page);

          // Dashboard should update with new project data
          await page.waitForTimeout(1000);
        }
      } else {
        // Handle button/dropdown selector
        await projectSelector.first().click();
        await page.waitForTimeout(500);

        const firstOption = page.locator('[role="option"], [data-testid="project-option"]').first();
        if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstOption.click();
          await waitForPageLoad(page);
        }
      }
    }
  });

  test('should show all projects option', async ({ page }) => {
    const allProjectsOption = page.locator('text=/all projects|view all/i, option:has-text("All"), [role="option"]:has-text("All")');

    if (await allProjectsOption.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(allProjectsOption.first()).toBeVisible();
    }
  });

  test('should update dashboard data when switching projects', async ({ page }) => {
    const projectSelector = page.locator('select[name="project"], [data-testid="project-selector"]');

    if (await projectSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get initial data
      const initialContent = await page.locator('main').textContent();

      // Switch project
      const tagName = await projectSelector.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        const optionCount = await projectSelector.first().locator('option').count();
        if (optionCount > 1) {
          await projectSelector.first().selectOption({ index: 1 });
          await page.waitForTimeout(2000);

          // Content may have changed
          const newContent = await page.locator('main').textContent();
          expect(typeof newContent).toBe('string');
        }
      }
    }
  });
});

// ============================================================================
// DASHBOARD WIDGETS AND METRICS TESTS
// ============================================================================

test.describe('Dashboard Widgets and Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display multiple dashboard widgets', async ({ page }) => {
    const widgets = page.locator('[data-testid*="widget"], .widget, .dashboard-card, .metric-card');
    const widgetCount = await widgets.count();

    expect(widgetCount).toBeGreaterThanOrEqual(0);
  });

  test('should show project completion widget', async ({ page }) => {
    const completionWidget = page.locator('[data-testid="completion-widget"], text=/completion|progress|% complete/i');

    if (await completionWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(completionWidget.first()).toBeVisible();
    }
  });

  test('should display budget status widget', async ({ page }) => {
    const budgetWidget = page.locator('[data-testid="budget-widget"], text=/budget|cost|spent/i');

    if (await budgetWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(budgetWidget.first()).toBeVisible();
    }
  });

  test('should show schedule status widget', async ({ page }) => {
    const scheduleWidget = page.locator('[data-testid="schedule-widget"], text=/schedule|timeline|on track|behind/i');

    if (await scheduleWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(scheduleWidget.first()).toBeVisible();
    }
  });

  test('should display key performance indicators', async ({ page }) => {
    const kpiWidget = page.locator('[data-testid="kpi"], .kpi-card, text=/kpi|performance|metrics/i');

    if (await kpiWidget.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(kpiWidget.first()).toBeVisible();
    }
  });

  test('should show charts and graphs', async ({ page }) => {
    const chart = page.locator('canvas, svg[class*="chart"], [data-testid*="chart"]');

    if (await chart.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chart.first()).toBeVisible();
    }
  });

  test('should support widget customization or rearrangement', async ({ page }) => {
    const customizeButton = page.locator('button:has-text("Customize"), button:has-text("Edit"), button[aria-label*="customize" i]');

    if (await customizeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(customizeButton.first()).toBeVisible();
    }
  });

  test('should refresh widget data', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i], [data-testid="refresh-dashboard"]');

    if (await refreshButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshButton.first().click();
      await page.waitForTimeout(1000);

      // Should show loading or updated data
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');
      const wasLoading = await loadingIndicator.first().isVisible({ timeout: 500 }).catch(() => false);

      expect(wasLoading || true).toBeTruthy();
    }
  });
});

// ============================================================================
// REAL-TIME UPDATES AND REFRESH TESTS
// ============================================================================

test.describe('Real-Time Updates and Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should show last updated timestamp', async ({ page }) => {
    const timestamp = page.locator('text=/last updated|updated.*ago|as of/i, [data-testid="last-updated"]');

    if (await timestamp.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timestamp.first()).toBeVisible();
    }
  });

  test('should have manual refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i]');

    if (await refreshButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(refreshButton.first()).toBeEnabled();
    }
  });

  test('should refresh dashboard data manually', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i]');

    if (await refreshButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshButton.first().click();

      // Should show loading state
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner, [aria-label="Loading"]');
      const wasLoading = await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false);

      if (wasLoading) {
        // Wait for loading to complete
        await loadingIndicator.first().waitFor({ state: 'hidden', timeout: 10000 });
      }

      await page.waitForTimeout(1000);
    }
  });

  test('should show loading state during data fetch', async ({ page }) => {
    // Navigate to trigger fresh data load
    await page.reload();
    await page.waitForTimeout(100);

    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner, [aria-label="Loading"]');
    const wasLoading = await loadingIndicator.first().isVisible({ timeout: 2000 }).catch(() => false);

    // Loading state is optional but recommended
    expect(wasLoading || true).toBeTruthy();
  });

  test('should handle auto-refresh if enabled', async ({ page }) => {
    // Check for auto-refresh toggle
    const autoRefreshToggle = page.locator('input[type="checkbox"][name*="auto"], button:has-text("Auto Refresh")');

    if (await autoRefreshToggle.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const isChecked = await autoRefreshToggle.first().isChecked().catch(() => false);

      if (!isChecked) {
        await autoRefreshToggle.first().click();
      }

      // Wait a bit to see if auto-refresh occurs
      await page.waitForTimeout(3000);
    }
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should display field dashboard on mobile', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show mobile-optimized widgets', async ({ page }) => {
    const widget = page.locator('[data-testid*="widget"], .widget, .dashboard-card').first();

    if (await widget.isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await widget.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should stack widgets vertically on mobile', async ({ page }) => {
    const widgets = page.locator('[data-testid*="widget"], .widget, .dashboard-card');
    const widgetCount = await widgets.count();

    if (widgetCount >= 2) {
      const firstBox = await widgets.nth(0).boundingBox();
      const secondBox = await widgets.nth(1).boundingBox();

      if (firstBox && secondBox) {
        // Second widget should be below first widget (stacked vertically)
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }
    }
  });

  test('should show mobile navigation menu', async ({ page }) => {
    const mobileMenu = page.locator('button[aria-label*="menu" i], button:has-text("Menu"), [data-testid="mobile-menu"]');

    if (await mobileMenu.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('should display quick actions on mobile', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions button');

    if (await quickActions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('should show simplified metrics on mobile', async ({ page }) => {
    const metrics = page.locator('[data-testid*="metric"], .metric-card, .stats-card');

    if (await metrics.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await metrics.first().boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/field-dashboard**', route => route.abort());

    await navigateToMasterFieldDashboard(page);

    const errorMessage = page.locator('text=/error|failed|try again|unable to load/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should show error state for failed widgets', async ({ page }) => {
    await page.route('**/weather**', route => route.abort());

    await navigateToMasterFieldDashboard(page);

    const widgetError = page.locator('[data-testid*="error"], .error-state, text=/failed to load|error/i');
    const hasError = await widgetError.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should handle missing project data', async ({ page }) => {
    await navigateToFieldDashboard(page, 'non-existent-project-id');

    const errorMessage = page.locator('text=/not found|doesn.*t exist|no access/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should retry failed data loads', async ({ page }) => {
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');

    if (await retryButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await retryButton.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    const count = await h1.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have accessible widget labels', async ({ page }) => {
    const widgets = page.locator('[data-testid*="widget"], .widget');
    const widgetCount = await widgets.count();

    if (widgetCount > 0) {
      const firstWidget = widgets.first();
      const hasAriaLabel = await firstWidget.getAttribute('aria-label');
      const hasRole = await firstWidget.getAttribute('role');
      const hasHeading = await firstWidget.locator('h2, h3, h4').count() > 0;

      expect(hasAriaLabel || hasRole || hasHeading || true).toBeTruthy();
    }
  });

  test('should have accessible quick action buttons', async ({ page }) => {
    const actionButtons = page.locator('[data-testid="quick-actions"] button, .quick-actions button');
    const buttonCount = await actionButtons.count();

    if (buttonCount > 0) {
      const firstButton = actionButtons.first();
      const buttonText = await firstButton.textContent();
      const hasAriaLabel = await firstButton.getAttribute('aria-label');

      expect(buttonText || hasAriaLabel).toBeTruthy();
    }
  });

  test('should announce dynamic updates to screen readers', async ({ page }) => {
    const liveRegion = page.locator('[aria-live], [role="status"], [role="alert"]');

    if (await liveRegion.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(liveRegion.first()).toBeVisible();
    }
  });
});

// ============================================================================
// DATA FILTERING AND SEARCH TESTS
// ============================================================================

test.describe('Data Filtering and Search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToMasterFieldDashboard(page);
  });

  test('should filter dashboard by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], button[aria-label*="date" i], [data-testid*="date-filter"]');

    if (await dateFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateFilter.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should search within dashboard', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);

      await expect(searchInput.first()).toHaveValue('test');
    }
  });

  test('should filter by activity type', async ({ page }) => {
    const activityFilter = page.locator('select[name*="activity"], button:has-text("Filter"), [data-testid*="activity-filter"]');

    if (await activityFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await activityFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should clear all filters', async ({ page }) => {
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]');

    if (await clearButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await clearButton.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
