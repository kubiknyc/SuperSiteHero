/**
 * Agent Chat Page Object Model
 *
 * Page object for the AI Chat feature including:
 * - FAB (Floating Action Button) to open chat
 * - Chat panel with header, messages, and input
 * - Session history sidebar
 * - Settings dropdown
 * - Quick actions
 */

import { Page, Locator, expect } from '@playwright/test'

export class AgentChatPage {
  readonly page: Page

  // ============================================================================
  // FAB (Floating Action Button) Locators
  // ============================================================================
  readonly fabButton: Locator
  readonly minimizedButton: Locator

  // ============================================================================
  // Chat Panel Locators
  // ============================================================================
  readonly chatPanel: Locator
  readonly chatHeader: Locator
  readonly headerTitle: Locator
  readonly headerStatusText: Locator
  readonly messageCountBadge: Locator

  // ============================================================================
  // Header Action Buttons
  // ============================================================================
  readonly historyButton: Locator
  readonly newChatButton: Locator
  readonly settingsButton: Locator
  readonly minimizeButton: Locator
  readonly closeButton: Locator

  // ============================================================================
  // Settings Dropdown
  // ============================================================================
  readonly settingsDropdown: Locator
  readonly toggleTimestampsItem: Locator
  readonly toggleToolDetailsItem: Locator
  readonly toggleCompactModeItem: Locator

  // ============================================================================
  // Messages Area
  // ============================================================================
  readonly messagesContainer: Locator
  readonly welcomeMessage: Locator
  readonly messageList: Locator
  readonly userMessages: Locator
  readonly assistantMessages: Locator
  readonly typingIndicator: Locator
  readonly loadingSpinner: Locator
  readonly scrollToBottomButton: Locator

  // ============================================================================
  // Input Area
  // ============================================================================
  readonly chatInput: Locator
  readonly sendButton: Locator

  // ============================================================================
  // Quick Actions
  // ============================================================================
  readonly quickActionsContainer: Locator
  readonly summarizeTodayAction: Locator
  readonly weeklyStatusAction: Locator
  readonly helpAction: Locator

  // ============================================================================
  // Session History Sidebar
  // ============================================================================
  readonly historySheet: Locator
  readonly historyTitle: Locator
  readonly newChatInHistoryButton: Locator
  readonly sessionList: Locator
  readonly activeSessionIndicator: Locator

  // ============================================================================
  // Error States
  // ============================================================================
  readonly errorBanner: Locator
  readonly errorMessage: Locator
  readonly dismissErrorButton: Locator

  // ============================================================================
  // Tool Results
  // ============================================================================
  readonly toolResultCard: Locator

  constructor(page: Page) {
    this.page = page

    // FAB - when chat is closed
    this.fabButton = page.locator('button').filter({ has: page.locator('.lucide-sparkles') }).first()
    this.minimizedButton = page.locator('button').filter({ hasText: /JobSight AI/i })

    // Chat Panel - the main container
    this.chatPanel = page.locator('[class*="fixed"][class*="z-50"]').filter({
      has: page.locator('text=/JobSight AI/i'),
    })

    // Header elements
    this.chatHeader = page.locator('div').filter({ hasText: /JobSight AI/i }).first()
    this.headerTitle = page.locator('h3, span').filter({ hasText: /JobSight AI/i }).first()
    this.headerStatusText = page.locator('p, span').filter({ hasText: /Ready to help|Thinking/i }).first()
    this.messageCountBadge = page.locator('[class*="badge"]').filter({ hasText: /^\d+$/ })

    // Header action buttons
    this.historyButton = page.locator('button').filter({ has: page.locator('.lucide-history') })
    this.newChatButton = page.locator('button').filter({ has: page.locator('.lucide-message-square, .lucide-plus') }).first()
    this.settingsButton = page.locator('button').filter({ has: page.locator('.lucide-settings, .lucide-more-vertical') }).first()
    this.minimizeButton = page.locator('button').filter({ has: page.locator('.lucide-minus') })
    this.closeButton = page.locator('button').filter({ has: page.locator('.lucide-x') })

    // Settings dropdown
    this.settingsDropdown = page.locator('[role="menu"]')
    this.toggleTimestampsItem = page.locator('[role="menuitem"]').filter({ hasText: /timestamp/i })
    this.toggleToolDetailsItem = page.locator('[role="menuitem"]').filter({ hasText: /tool.*detail/i })
    this.toggleCompactModeItem = page.locator('[role="menuitem"]').filter({ hasText: /compact/i })

    // Messages area
    this.messagesContainer = page.locator('[data-radix-scroll-area-viewport]').first()
    this.welcomeMessage = page.locator('text=/Welcome|How can I help/i').first()
    this.messageList = page.locator('[class*="space-y"]').filter({
      has: page.locator('[class*="message"], [class*="rounded"]'),
    })
    this.userMessages = page.locator('[class*="bg-primary"], [class*="ml-auto"]').filter({
      has: page.locator('p, span'),
    })
    this.assistantMessages = page.locator('[class*="bg-muted"], [class*="mr-auto"]').filter({
      has: page.locator('p, span'),
    })
    this.typingIndicator = page.locator('[class*="animate-pulse"], text=/Thinking/i')
    this.loadingSpinner = page.locator('.lucide-loader-2, [class*="animate-spin"]')
    this.scrollToBottomButton = page.locator('button').filter({ has: page.locator('.lucide-chevron-down') })

    // Input area
    this.chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
    this.sendButton = page.locator('button[type="submit"]').or(page.locator('button').filter({ has: page.locator('.lucide-send') }))

    // Quick actions
    this.quickActionsContainer = page.locator('[class*="grid"]').filter({
      has: page.locator('button').filter({ hasText: /summarize|status|help/i }),
    })
    this.summarizeTodayAction = page.locator('button').filter({ hasText: /summarize.*today/i })
    this.weeklyStatusAction = page.locator('button').filter({ hasText: /weekly.*status/i })
    this.helpAction = page.locator('button').filter({ hasText: /what.*can.*you.*do|help/i })

    // Session history sidebar
    this.historySheet = page.locator('[role="dialog"]').filter({ hasText: /Chat History/i })
    this.historyTitle = page.locator('text=/Chat History/i')
    this.newChatInHistoryButton = page.locator('[role="dialog"] button').filter({ hasText: /New Chat/i })
    this.sessionList = page.locator('[role="dialog"] button').filter({
      has: page.locator('text=/messages|ago/i'),
    })
    this.activeSessionIndicator = page.locator('[class*="badge"]').filter({ hasText: /active/i })

    // Error banner
    this.errorBanner = page.locator('[class*="destructive"]').filter({
      has: page.locator('.lucide-alert-circle'),
    })
    this.errorMessage = page.locator('[class*="destructive"] span')
    this.dismissErrorButton = page.locator('button').filter({ hasText: /Dismiss/i })

    // Tool results
    this.toolResultCard = page.locator('[class*="tool-result"], [class*="rounded"]').filter({
      has: page.locator('[class*="lucide-check"], [class*="lucide-alert"]'),
    })
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
  }

  async gotoWithProject(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}`)
    await this.page.waitForLoadState('networkidle')
  }

  // ============================================================================
  // Chat Panel State Methods
  // ============================================================================

  async openChat(): Promise<void> {
    const isOpen = await this.isChatOpen()
    if (!isOpen) {
      const isMinimized = await this.isChatMinimized()
      if (isMinimized) {
        await this.minimizedButton.click()
      } else {
        await this.fabButton.click()
      }
      await this.page.waitForTimeout(500) // Animation
    }
  }

  async closeChat(): Promise<void> {
    const isOpen = await this.isChatOpen()
    if (isOpen) {
      await this.closeButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async minimizeChat(): Promise<void> {
    const isOpen = await this.isChatOpen()
    if (isOpen) {
      await this.minimizeButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async maximizeChat(): Promise<void> {
    const isMinimized = await this.isChatMinimized()
    if (isMinimized) {
      await this.minimizedButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async isChatOpen(): Promise<boolean> {
    return await this.chatPanel.isVisible({ timeout: 1000 }).catch(() => false)
  }

  async isChatMinimized(): Promise<boolean> {
    const panelHidden = !(await this.isChatOpen())
    const minimizedVisible = await this.minimizedButton.isVisible({ timeout: 1000 }).catch(() => false)
    return panelHidden && minimizedVisible
  }

  async isChatClosed(): Promise<boolean> {
    const panelHidden = !(await this.isChatOpen())
    const fabVisible = await this.fabButton.isVisible({ timeout: 1000 }).catch(() => false)
    return panelHidden && fabVisible
  }

  // ============================================================================
  // Message Methods
  // ============================================================================

  async sendMessage(message: string): Promise<void> {
    await this.chatInput.fill(message)
    await this.sendButton.click()
  }

  async sendMessageAndWaitForResponse(message: string, timeout: number = 30000): Promise<void> {
    const initialCount = await this.getAssistantMessageCount()
    await this.sendMessage(message)

    // Wait for typing indicator to appear
    await this.typingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

    // Wait for typing indicator to disappear (response received)
    await this.typingIndicator.waitFor({ state: 'hidden', timeout }).catch(() => {})

    // Wait for new message to appear
    await this.page.waitForFunction(
      (initialCount) => {
        const messages = document.querySelectorAll('[class*="bg-muted"], [class*="mr-auto"]')
        return messages.length > initialCount
      },
      initialCount,
      { timeout }
    ).catch(() => {})
  }

  async getLastAssistantMessage(): Promise<string | null> {
    const messages = await this.assistantMessages.all()
    if (messages.length === 0) {return null}
    return await messages[messages.length - 1].textContent()
  }

  async getLastUserMessage(): Promise<string | null> {
    const messages = await this.userMessages.all()
    if (messages.length === 0) {return null}
    return await messages[messages.length - 1].textContent()
  }

  async getMessageCount(): Promise<number> {
    const userCount = await this.userMessages.count()
    const assistantCount = await this.assistantMessages.count()
    return userCount + assistantCount
  }

  async getAssistantMessageCount(): Promise<number> {
    return await this.assistantMessages.count()
  }

  async getUserMessageCount(): Promise<number> {
    return await this.userMessages.count()
  }

  // ============================================================================
  // Session Management Methods
  // ============================================================================

  async openSessionHistory(): Promise<void> {
    await this.historyButton.click()
    await this.historySheet.waitFor({ state: 'visible', timeout: 3000 })
  }

  async closeSessionHistory(): Promise<void> {
    await this.page.keyboard.press('Escape')
    await this.historySheet.waitFor({ state: 'hidden', timeout: 3000 })
  }

  async createNewSession(): Promise<void> {
    await this.newChatButton.click()
    await this.page.waitForTimeout(500)
  }

  async createNewSessionFromHistory(): Promise<void> {
    await this.openSessionHistory()
    await this.newChatInHistoryButton.click()
    await this.page.waitForTimeout(500)
  }

  async switchToSession(index: number): Promise<void> {
    await this.openSessionHistory()
    const sessions = await this.sessionList.all()
    if (sessions.length > index) {
      await sessions[index].click()
      await this.page.waitForTimeout(500)
    }
  }

  async getSessionCount(): Promise<number> {
    await this.openSessionHistory()
    const count = await this.sessionList.count()
    await this.closeSessionHistory()
    return count
  }

  // ============================================================================
  // Settings Methods
  // ============================================================================

  async openSettings(): Promise<void> {
    await this.settingsButton.click()
    await this.settingsDropdown.waitFor({ state: 'visible', timeout: 2000 })
  }

  async toggleTimestamps(): Promise<void> {
    await this.openSettings()
    await this.toggleTimestampsItem.click()
    await this.page.waitForTimeout(300)
  }

  async toggleToolDetails(): Promise<void> {
    await this.openSettings()
    await this.toggleToolDetailsItem.click()
    await this.page.waitForTimeout(300)
  }

  async toggleCompactMode(): Promise<void> {
    await this.openSettings()
    await this.toggleCompactModeItem.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Quick Actions Methods
  // ============================================================================

  async clickQuickAction(action: 'summarize' | 'weekly' | 'help'): Promise<void> {
    const actionMap = {
      summarize: this.summarizeTodayAction,
      weekly: this.weeklyStatusAction,
      help: this.helpAction,
    }
    await actionMap[action].click()
  }

  async areQuickActionsVisible(): Promise<boolean> {
    return await this.quickActionsContainer.isVisible({ timeout: 2000 }).catch(() => false)
  }

  // ============================================================================
  // Error Handling Methods
  // ============================================================================

  async dismissError(): Promise<void> {
    if (await this.errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.dismissErrorButton.click()
      await this.errorBanner.waitFor({ state: 'hidden', timeout: 2000 })
    }
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  async hasError(): Promise<boolean> {
    return await this.errorBanner.isVisible({ timeout: 1000 }).catch(() => false)
  }

  // ============================================================================
  // Scroll Methods
  // ============================================================================

  async scrollToBottom(): Promise<void> {
    if (await this.scrollToBottomButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.scrollToBottomButton.click()
    }
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  async expectChatOpen(): Promise<void> {
    await expect(this.chatPanel).toBeVisible({ timeout: 5000 })
  }

  async expectChatClosed(): Promise<void> {
    await expect(this.chatPanel).not.toBeVisible({ timeout: 5000 })
    await expect(this.fabButton).toBeVisible({ timeout: 5000 })
  }

  async expectChatMinimized(): Promise<void> {
    await expect(this.chatPanel).not.toBeVisible({ timeout: 5000 })
    await expect(this.minimizedButton).toBeVisible({ timeout: 5000 })
  }

  async expectWelcomeMessage(): Promise<void> {
    await expect(this.welcomeMessage).toBeVisible({ timeout: 5000 })
  }

  async expectProcessing(): Promise<void> {
    await expect(this.typingIndicator.or(this.loadingSpinner).first()).toBeVisible({ timeout: 5000 })
  }

  async expectNotProcessing(): Promise<void> {
    await expect(this.typingIndicator).not.toBeVisible({ timeout: 5000 })
  }

  async expectMessageContains(text: string): Promise<void> {
    const message = this.page.locator('p, span').filter({ hasText: text })
    await expect(message.first()).toBeVisible({ timeout: 10000 })
  }

  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.quickActionsContainer).toBeVisible({ timeout: 5000 })
  }

  async expectQuickActionsHidden(): Promise<void> {
    await expect(this.quickActionsContainer).not.toBeVisible({ timeout: 5000 })
  }

  async expectErrorVisible(errorText?: string): Promise<void> {
    await expect(this.errorBanner).toBeVisible({ timeout: 5000 })
    if (errorText) {
      await expect(this.errorMessage).toContainText(errorText)
    }
  }

  async expectNoError(): Promise<void> {
    await expect(this.errorBanner).not.toBeVisible({ timeout: 2000 })
  }

  async expectSessionHistoryOpen(): Promise<void> {
    await expect(this.historySheet).toBeVisible({ timeout: 5000 })
  }

  async expectSessionHistoryClosed(): Promise<void> {
    await expect(this.historySheet).not.toBeVisible({ timeout: 5000 })
  }

  async expectInputEnabled(): Promise<void> {
    await expect(this.chatInput).toBeEnabled()
  }

  async expectInputDisabled(): Promise<void> {
    await expect(this.chatInput).toBeDisabled()
  }

  async expectSendButtonEnabled(): Promise<void> {
    await expect(this.sendButton).toBeEnabled()
  }

  async expectSendButtonDisabled(): Promise<void> {
    await expect(this.sendButton).toBeDisabled()
  }
}
