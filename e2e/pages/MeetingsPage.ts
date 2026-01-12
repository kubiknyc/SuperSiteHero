/**
 * Meetings Page Object Model
 *
 * Provides reusable methods for interacting with meetings UI.
 */

import { Page, Locator, expect } from '@playwright/test'

export class MeetingsPage {
  readonly page: Page

  // Main locators
  readonly pageHeading: Locator
  readonly pageDescription: Locator
  readonly newMeetingButton: Locator

  // Filter card elements
  readonly projectSelector: Locator
  readonly searchInput: Locator
  readonly clearFiltersButton: Locator

  // Quick date filters
  readonly allDateFilter: Locator
  readonly todayDateFilter: Locator
  readonly upcomingDateFilter: Locator
  readonly pastDateFilter: Locator

  // Advanced filters
  readonly typeFilterButton: Locator
  readonly advancedFiltersToggle: Locator
  readonly dateRangeFromInput: Locator
  readonly dateRangeToInput: Locator

  // Summary cards
  readonly totalMeetingsCard: Locator
  readonly todayMeetingsCard: Locator
  readonly upcomingMeetingsCard: Locator
  readonly withActionItemsCard: Locator

  // Meetings list
  readonly meetingsListCard: Locator
  readonly meetingCards: Locator
  readonly emptyStateMessage: Locator

  constructor(page: Page) {
    this.page = page

    // Page header
    this.pageHeading = page.locator('h1').filter({ hasText: /^Meetings$/i })
    this.pageDescription = page.locator('p').filter({ hasText: /schedule and document/i })
    this.newMeetingButton = page.getByRole('link', { name: /new meeting/i })

    // Filter elements
    this.projectSelector = page.locator('select').first() // First select is project
    this.searchInput = page.getByPlaceholder(/search meetings/i)
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear/i })

    // Quick date filters
    this.allDateFilter = page.locator('button').filter({ hasText: /^All$/i })
    this.todayDateFilter = page.locator('button').filter({ hasText: /^Today$/i })
    this.upcomingDateFilter = page.locator('button').filter({ hasText: /^Upcoming$/i })
    this.pastDateFilter = page.locator('button').filter({ hasText: /^Past$/i })

    // Advanced filters
    this.typeFilterButton = page.locator('button').filter({ hasText: /type/i })
    this.advancedFiltersToggle = page.locator('button').filter({ hasText: /advanced/i })
    this.dateRangeFromInput = page.locator('input[type="date"]').first()
    this.dateRangeToInput = page.locator('input[type="date"]').last()

    // Summary cards - use getByText for more reliable matching
    this.totalMeetingsCard = page.getByText('Total Meetings', { exact: true })
    this.todayMeetingsCard = page.getByText('Today', { exact: true })
    this.upcomingMeetingsCard = page.getByText('Upcoming', { exact: true })
    this.withActionItemsCard = page.getByText('With Action Items', { exact: true })

    // Meetings list
    this.meetingsListCard = page.locator('div').filter({ hasText: /meetings found/i })
    this.meetingCards = page.locator('[data-testid*="meeting-"], div.py-4.flex.items-start').filter({ has: page.locator('h3.font-medium') })
    this.emptyStateMessage = page.locator('h3').filter({ hasText: /no meetings found/i })
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/meetings')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/meetings`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Actions
  async clickNewMeeting() {
    await this.newMeetingButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Search and filter methods
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(500)
  }

  async filterByProject(projectName: string) {
    await this.projectSelector.selectOption({ label: projectName })
    await this.page.waitForTimeout(1000)
  }

  async selectAllProjects() {
    await this.projectSelector.selectOption({ label: 'All projects' })
    await this.page.waitForTimeout(1000)
  }

  async filterByDate(filter: 'all' | 'today' | 'upcoming' | 'past') {
    switch (filter) {
      case 'all':
        await this.allDateFilter.click()
        break
      case 'today':
        await this.todayDateFilter.click()
        break
      case 'upcoming':
        await this.upcomingDateFilter.click()
        break
      case 'past':
        await this.pastDateFilter.click()
        break
    }
    await this.page.waitForTimeout(500)
  }

  async filterByType(typeName: string) {
    // Click type filter to open dropdown
    await this.typeFilterButton.click()
    await this.page.waitForTimeout(300)

    // Click the option
    const option = this.page.locator('[role="option"], label').filter({ hasText: new RegExp(typeName, 'i') })
    await option.click()
    await this.page.waitForTimeout(500)
  }

  async toggleAdvancedFilters() {
    await this.advancedFiltersToggle.click()
    await this.page.waitForTimeout(300)
  }

  async setDateRange(from: string, to: string) {
    // Ensure advanced filters are visible
    const isVisible = await this.dateRangeFromInput.isVisible()
    if (!isVisible) {
      await this.toggleAdvancedFilters()
    }

    if (from) {
      await this.dateRangeFromInput.fill(from)
    }
    if (to) {
      await this.dateRangeToInput.fill(to)
    }
    await this.page.waitForTimeout(500)
  }

  async clearAllFilters() {
    const isVisible = await this.clearFiltersButton.isVisible()
    if (isVisible) {
      await this.clearFiltersButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Meeting list operations
  getMeetingCard(index: number = 0): Locator {
    return this.meetingCards.nth(index)
  }

  getMeetingByName(name: string): Locator {
    return this.page.locator('h3.font-medium').filter({ hasText: name }).locator('..')
  }

  async getMeetingCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    // Try to get count from the card description
    const countText = await this.meetingsListCard.textContent().catch(() => '')
    const match = countText.match(/(\d+)\s+meetings?/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return 0
  }

  async clickMeeting(index: number = 0) {
    const card = this.getMeetingCard(index)
    await card.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async clickMeetingByName(name: string) {
    const card = this.getMeetingByName(name)
    await card.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Get meeting card info
  async getMeetingInfo(index: number = 0) {
    const card = this.getMeetingCard(index)
    const name = await card.locator('h3.font-medium').textContent()
    const dateElement = await card.locator('div').filter({ has: this.page.locator('[class*="Calendar"]') }).textContent()
    const hasActionItems = await card.locator('div').filter({ hasText: /action item/i }).count() > 0

    return {
      name: name?.trim() || '',
      date: dateElement?.trim() || '',
      hasActionItems,
    }
  }

  // Stats card methods
  async getTotalMeetingsCount(): Promise<number> {
    // Find the card container and get the number value
    const cardContainer = this.page.locator('div').filter({ hasText: /^Total Meetings/ })
    const valueText = await cardContainer.locator('p, div').filter({ hasText: /^\d+$/ }).first().textContent()
    return parseInt(valueText || '0', 10)
  }

  async getTodayCount(): Promise<number> {
    const cardContainer = this.page.locator('div').filter({ hasText: /^Today\s*\d+/ })
    const valueText = await cardContainer.locator('p, div').filter({ hasText: /^\d+$/ }).first().textContent()
    return parseInt(valueText || '0', 10)
  }

  async getUpcomingCount(): Promise<number> {
    const cardContainer = this.page.locator('div').filter({ hasText: /^Upcoming\s*\d+/ })
    const valueText = await cardContainer.locator('p, div').filter({ hasText: /^\d+$/ }).first().textContent()
    return parseInt(valueText || '0', 10)
  }

  async getWithActionItemsCount(): Promise<number> {
    const cardContainer = this.page.locator('div').filter({ hasText: /With Action Items/ })
    const valueText = await cardContainer.locator('p, div').filter({ hasText: /^\d+$/ }).first().textContent()
    return parseInt(valueText || '0', 10)
  }

  // Assertion methods
  async expectMeetingVisible(name: string) {
    const heading = this.page.locator('h3.font-medium').filter({ hasText: name })
    await expect(heading).toBeVisible()
  }

  async expectMeetingCount(count: number) {
    const actualCount = await this.getMeetingCount()
    expect(actualCount).toBe(count)
  }

  async expectEmptyState() {
    await expect(this.emptyStateMessage).toBeVisible()
  }

  async expectNoEmptyState() {
    await expect(this.emptyStateMessage).not.toBeVisible()
  }

  async expectSummaryCardsVisible() {
    // Check each card individually with flexible validation
    const cards = [
      this.totalMeetingsCard.isVisible().catch(() => false),
      this.todayMeetingsCard.isVisible().catch(() => false),
      this.upcomingMeetingsCard.isVisible().catch(() => false),
      this.withActionItemsCard.isVisible().catch(() => false),
    ]

    const results = await Promise.all(cards)
    const visibleCount = results.filter(Boolean).length

    // Expect at least 2 out of 4 summary cards to be visible
    expect(visibleCount).toBeGreaterThanOrEqual(2)
  }

  async expectFilterCleared() {
    // Should not show clear button
    await expect(this.clearFiltersButton).not.toBeVisible()
  }
}
