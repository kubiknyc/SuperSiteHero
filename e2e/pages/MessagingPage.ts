/**
 * Messaging Page Object Model
 *
 * Page object for messaging feature including:
 * - Conversation list
 * - Message threads
 * - New conversation creation
 * - File attachments
 * - Search and filters
 */

import { Page, Locator, expect } from '@playwright/test'

export class MessagingPage {
  readonly page: Page

  // Main page elements
  readonly pageContainer: Locator
  readonly conversationList: Locator
  readonly messageThread: Locator
  readonly emptyState: Locator

  // Conversation list elements
  readonly projectSelector: Locator
  readonly conversationSearchInput: Locator
  readonly newConversationButton: Locator
  readonly allConversationsTab: Locator
  readonly directMessagesTab: Locator
  readonly groupChatsTab: Locator

  // Message thread elements
  readonly conversationHeader: Locator
  readonly backButton: Locator
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly attachFileButton: Locator
  readonly fileInput: Locator

  // New conversation dialog elements
  readonly newConversationDialog: Locator
  readonly directMessageTypeButton: Locator
  readonly groupChatTypeButton: Locator
  readonly userSearchInput: Locator
  readonly groupNameInput: Locator
  readonly createConversationButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main containers
    this.pageContainer = page.locator('[role="main"], main, .messages-page')
    this.conversationList = page.locator('.conversation-list, [data-testid="conversation-list"]').first()
    this.messageThread = page.locator('[data-testid="message-thread"], .message-thread').first()
    this.emptyState = page.locator('text=/select a conversation|your messages/i').first()

    // Conversation list
    this.projectSelector = page.locator('button[role="combobox"]').first()
    this.conversationSearchInput = page.getByPlaceholder(/search conversations/i)
    this.newConversationButton = page.locator('button').filter({ hasText: /new|start conversation/i }).first()
    this.allConversationsTab = page.locator('[role="tab"]').filter({ hasText: /^all/i })
    this.directMessagesTab = page.locator('[role="tab"]').filter({ hasText: /direct/i })
    this.groupChatsTab = page.locator('[role="tab"]').filter({ hasText: /group/i })

    // Message thread
    this.conversationHeader = page.locator('[data-testid="conversation-header"], .conversation-header').first()
    this.backButton = page.locator('button[aria-label*="back" i], button').filter({ hasText: /back/i }).first()
    this.messageInput = page.locator('textarea[placeholder*="message" i], textarea[name="message"]')
    this.sendButton = page.locator('button[aria-label*="send" i], button[type="submit"]').filter({ hasText: /send/i })
    this.attachFileButton = page.locator('button[aria-label*="attach" i], button').filter({ hasText: /attach|paperclip/i }).first()
    this.fileInput = page.locator('input[type="file"]')

    // New conversation dialog
    this.newConversationDialog = page.locator('[role="dialog"]').filter({ hasText: /new conversation|start conversation/i })
    this.directMessageTypeButton = page.locator('button').filter({ hasText: /direct message|1-on-1/i })
    this.groupChatTypeButton = page.locator('button').filter({ hasText: /group chat|team/i })
    this.userSearchInput = page.locator('input[placeholder*="search" i], input[placeholder*="find" i]')
    this.groupNameInput = page.locator('input[name="name"], input[placeholder*="group name" i]')
    this.createConversationButton = page.locator('[role="dialog"] button').filter({ hasText: /create|start|continue/i }).last()
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/messages')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoConversation(conversationId: string) {
    await this.page.goto(`/messages/${conversationId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Project selection
  async selectProject(projectName: string) {
    await this.projectSelector.click()
    await this.page.waitForTimeout(300)
    await this.page.locator('[role="option"]').filter({ hasText: projectName }).click()
    await this.page.waitForTimeout(500)
  }

  async selectFirstProject() {
    const isVisible = await this.projectSelector.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await this.projectSelector.click()
      await this.page.waitForTimeout(300)
      const firstOption = this.page.locator('[role="option"]').first()
      if (await firstOption.isVisible({ timeout: 3000 })) {
        await firstOption.click()
        await this.page.waitForTimeout(500)
      }
    }
  }

  // Conversation list methods
  getConversationItem(index: number = 0): Locator {
    return this.page.locator('[data-testid*="conversation-"], .conversation-item, [role="button"]').filter({ hasText: /.+/ }).nth(index)
  }

  getConversationByName(name: string): Locator {
    return this.page.locator('[data-testid*="conversation-"], .conversation-item').filter({ hasText: name })
  }

  async getConversationCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    const conversations = this.page.locator('[data-testid*="conversation-"], .conversation-item, [role="button"]').filter({ hasText: /.+/ })
    return await conversations.count()
  }

  async selectConversation(index: number = 0) {
    const conversation = this.getConversationItem(index)
    await conversation.click()
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(500)
  }

  async selectConversationByName(name: string) {
    const conversation = this.getConversationByName(name)
    await conversation.click()
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(500)
  }

  // Conversation search
  async searchConversations(query: string) {
    await this.conversationSearchInput.fill(query)
    await this.page.waitForTimeout(500)
  }

  async clearConversationSearch() {
    await this.conversationSearchInput.clear()
    await this.page.waitForTimeout(500)
  }

  // Tab switching
  async switchToTab(tab: 'all' | 'direct' | 'group') {
    switch (tab) {
      case 'all':
        await this.allConversationsTab.click()
        break
      case 'direct':
        await this.directMessagesTab.click()
        break
      case 'group':
        await this.groupChatsTab.click()
        break
    }
    await this.page.waitForTimeout(500)
  }

  // New conversation methods
  async clickNewConversation() {
    await this.newConversationButton.click()
    await this.page.waitForTimeout(500)
  }

  async createDirectMessage(userName: string) {
    await this.clickNewConversation()

    // Select direct message type if shown
    const directButton = this.directMessageTypeButton
    if (await directButton.isVisible({ timeout: 2000 })) {
      await directButton.click()
      await this.page.waitForTimeout(300)
    }

    // Search and select user
    const searchInput = this.page.locator('input[placeholder*="search" i], input[type="text"]').last()
    await searchInput.fill(userName)
    await this.page.waitForTimeout(500)

    // Click on user
    const userItem = this.page.locator('[role="checkbox"], .user-item, button').filter({ hasText: userName }).first()
    await userItem.click()
    await this.page.waitForTimeout(300)

    // Create conversation
    const createButton = this.page.locator('[role="dialog"] button').filter({ hasText: /create|start|next|continue/i }).last()
    if (await createButton.isEnabled({ timeout: 2000 })) {
      await createButton.click()
      await this.page.waitForLoadState('domcontentloaded')
      await this.page.waitForTimeout(500)
    }
  }

  async createGroupChat(groupName: string, userNames: string[]) {
    await this.clickNewConversation()

    // Select group chat type if shown
    const groupButton = this.groupChatTypeButton
    if (await groupButton.isVisible({ timeout: 2000 })) {
      await groupButton.click()
      await this.page.waitForTimeout(300)
    }

    // Select users
    const searchInput = this.page.locator('input[placeholder*="search" i], input[type="text"]').last()
    for (const userName of userNames) {
      await searchInput.fill(userName)
      await this.page.waitForTimeout(500)

      const userItem = this.page.locator('[role="checkbox"], .user-item').filter({ hasText: userName }).first()
      if (await userItem.isVisible({ timeout: 3000 })) {
        await userItem.click()
        await this.page.waitForTimeout(300)
      }
      await searchInput.clear()
    }

    // Continue to details
    const continueButton = this.page.locator('[role="dialog"] button').filter({ hasText: /continue|next/i }).last()
    if (await continueButton.isVisible({ timeout: 2000 })) {
      await continueButton.click()
      await this.page.waitForTimeout(300)
    }

    // Enter group name
    const nameInput = this.page.locator('input[name="name"], input[placeholder*="group name" i]')
    if (await nameInput.isVisible({ timeout: 3000 })) {
      await nameInput.fill(groupName)
    }

    // Create group
    const createButton = this.page.locator('[role="dialog"] button').filter({ hasText: /create|start/i }).last()
    if (await createButton.isEnabled({ timeout: 2000 })) {
      await createButton.click()
      await this.page.waitForLoadState('domcontentloaded')
      await this.page.waitForTimeout(500)
    }
  }

  // Messaging methods
  async sendMessage(content: string) {
    await this.messageInput.fill(content)
    await this.sendButton.click()
    await this.page.waitForTimeout(1000)
  }

  async sendMessageWithEnter(content: string) {
    await this.messageInput.fill(content)
    await this.messageInput.press('Enter')
    await this.page.waitForTimeout(1000)
  }

  async attachFile(filePath: string) {
    // Click attach button
    await this.attachFileButton.click()
    await this.page.waitForTimeout(300)

    // Upload file
    await this.fileInput.setInputFiles(filePath)
    await this.page.waitForTimeout(1000)
  }

  async attachAndSendFile(filePath: string, message?: string) {
    await this.attachFile(filePath)

    if (message) {
      await this.messageInput.fill(message)
    }

    await this.sendButton.click()
    await this.page.waitForTimeout(1500)
  }

  // Message viewing methods
  getMessageByContent(content: string): Locator {
    return this.page.locator('[data-testid*="message-"], .message-item, .message').filter({ hasText: content })
  }

  getMessageAtIndex(index: number): Locator {
    return this.page.locator('[data-testid*="message-"], .message-item, .message').nth(index)
  }

  async getMessageCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.page.locator('[data-testid*="message-"], .message-item, .message').count()
  }

  async waitForNewMessage(timeout: number = 10000) {
    const initialCount = await this.getMessageCount()
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const currentCount = await this.getMessageCount()
      if (currentCount > initialCount) {
        return true
      }
      await this.page.waitForTimeout(500)
    }
    return false
  }

  // Mark as read/unread
  async markConversationAsRead(conversationIndex: number = 0) {
    const conversation = this.getConversationItem(conversationIndex)
    await conversation.click({ button: 'right' })
    await this.page.waitForTimeout(300)

    const markReadOption = this.page.locator('[role="menuitem"]').filter({ hasText: /mark.*read/i })
    if (await markReadOption.isVisible({ timeout: 2000 })) {
      await markReadOption.click()
      await this.page.waitForTimeout(500)
    }
  }

  async markConversationAsUnread(conversationIndex: number = 0) {
    const conversation = this.getConversationItem(conversationIndex)
    await conversation.click({ button: 'right' })
    await this.page.waitForTimeout(300)

    const markUnreadOption = this.page.locator('[role="menuitem"]').filter({ hasText: /mark.*unread/i })
    if (await markUnreadOption.isVisible({ timeout: 2000 })) {
      await markUnreadOption.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Unread indicators
  async hasUnreadIndicator(conversationIndex: number = 0): Promise<boolean> {
    const conversation = this.getConversationItem(conversationIndex)
    const unreadBadge = conversation.locator('.badge, [data-testid="unread-badge"], .unread-indicator')
    return await unreadBadge.isVisible({ timeout: 2000 }).catch(() => false)
  }

  async getUnreadCount(conversationIndex: number = 0): Promise<number> {
    const conversation = this.getConversationItem(conversationIndex)
    const unreadBadge = conversation.locator('.badge, [data-testid="unread-badge"]')

    if (await unreadBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await unreadBadge.textContent()
      return parseInt(text || '0', 10)
    }
    return 0
  }

  // Assertions
  async expectConversationVisible(name: string) {
    await expect(this.getConversationByName(name)).toBeVisible({ timeout: 10000 })
  }

  async expectMessageVisible(content: string) {
    await expect(this.getMessageByContent(content)).toBeVisible({ timeout: 10000 })
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible({ timeout: 5000 })
  }

  async expectConversationSelected() {
    await expect(this.messageThread).toBeVisible({ timeout: 5000 })
  }

  async expectUnreadIndicator(conversationIndex: number = 0) {
    const hasUnread = await this.hasUnreadIndicator(conversationIndex)
    expect(hasUnread).toBe(true)
  }

  async expectNoUnreadIndicator(conversationIndex: number = 0) {
    const hasUnread = await this.hasUnreadIndicator(conversationIndex)
    expect(hasUnread).toBe(false)
  }

  async expectFileAttachment(fileName: string) {
    const attachment = this.page.locator('[data-testid*="attachment"], .attachment, .file-preview').filter({ hasText: fileName })
    await expect(attachment).toBeVisible({ timeout: 5000 })
  }

  // Helper to check if conversations are loaded
  async waitForConversationsLoaded() {
    await this.page.waitForTimeout(1000)
    // Wait for either conversations to appear or empty state
    await Promise.race([
      this.page.locator('[data-testid*="conversation-"], .conversation-item').first().waitFor({ timeout: 5000 }).catch(() => {}),
      this.page.locator('text=/no conversations|empty/i').first().waitFor({ timeout: 5000 }).catch(() => {})
    ])
  }
}
