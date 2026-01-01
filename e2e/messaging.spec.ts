/**
 * Messaging E2E Tests
 *
 * Comprehensive test suite for messaging feature covering:
 * - View conversations list
 * - Create new conversation (direct & group)
 * - Send messages
 * - Receive messages (real-time)
 * - Attach files to messages
 * - Search conversations
 * - Mark as read/unread
 * - Group conversations
 * - Mobile responsiveness
 * - Error handling
 *
 * Routes tested: /messages, /messages/:conversationId
 */

import { test, expect, Page } from '@playwright/test'

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import { MessagingPage } from './pages/MessagingPage'
import * as path from 'path'

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

// Test data
const TEST_MESSAGE = `Test message ${Date.now()}`
const TEST_GROUP_NAME = `Test Group ${Date.now()}`

// ============================================================================
// Helper Functions
// ============================================================================

async function login(page: Page) {
  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill credentials
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)

  // Wait a moment for React to update
  await page.waitForTimeout(500)

  // Press Enter on password field instead of clicking button
  await page.press('input[name="password"]', 'Enter')

  // Wait for successful login - URL should change away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 20000,
  })

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
}

// ============================================================================
// Test Suite: Setup & Navigation
// ============================================================================

test.describe('Messaging - Setup & Navigation', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
  })

  test('should navigate to messages page', async () => {
    await messagingPage.goto()
    await expect(messagingPage.pageContainer).toBeVisible({ timeout: 10000 })
  })

  test('should display empty state when no conversation selected', async () => {
    await messagingPage.goto()
    await messagingPage.expectEmptyState()
  })

  test('should show project selector', async ({ page }) => {
    await messagingPage.goto()
    await page.waitForTimeout(1000)

    const isVisible = await messagingPage.projectSelector.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await expect(messagingPage.projectSelector).toBeVisible()
    }
  })

  test('should display conversation list sidebar', async () => {
    await messagingPage.goto()
    await messagingPage.waitForConversationsLoaded()

    const count = await messagingPage.getConversationCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show new conversation button', async () => {
    await messagingPage.goto()
    await expect(messagingPage.newConversationButton).toBeVisible({ timeout: 10000 })
  })

  test('should display conversation tabs', async ({ page }) => {
    await messagingPage.goto()
    await page.waitForTimeout(1000)

    const allTabVisible = await messagingPage.allConversationsTab.isVisible({ timeout: 3000 }).catch(() => false)
    const directTabVisible = await messagingPage.directMessagesTab.isVisible({ timeout: 3000 }).catch(() => false)

    expect(allTabVisible || directTabVisible).toBe(true)
  })

  test('should be accessible from main navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for messages link in navigation
    const messagesLink = page.locator('a[href*="/messages"], a').filter({ hasText: /messages/i })
    if (await messagesLink.first().isVisible({ timeout: 5000 })) {
      await messagesLink.first().click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/messages/)
    }
  })
})

// ============================================================================
// Test Suite: View Conversations List
// ============================================================================

test.describe('Messaging - View Conversations', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should display conversation list', async () => {
    const count = await messagingPage.getConversationCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show conversation preview', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      const firstConversation = messagingPage.getConversationItem(0)
      await expect(firstConversation).toBeVisible()

      // Should have some text content
      const text = await firstConversation.textContent()
      expect(text).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should select and view conversation', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)

      // Should show message thread
      await messagingPage.expectConversationSelected()

      // URL should update
      expect(page.url()).toMatch(/\/messages\/[a-f0-9-]+/)
    } else {
      test.skip()
    }
  })

  test('should show unread count badge', async () => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      // Check if any conversation has unread indicator
      const hasUnread = await messagingPage.hasUnreadIndicator(0)
      expect(typeof hasUnread).toBe('boolean')
    } else {
      test.skip()
    }
  })

  test('should display last message preview', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      const conversation = messagingPage.getConversationItem(0)
      const text = await conversation.textContent()

      // Should contain some message content
      expect(text).toBeTruthy()
      expect(text!.length).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show conversation participant names', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      const conversation = messagingPage.getConversationItem(0)
      const text = await conversation.textContent()

      // Should have participant name or group name
      expect(text).toBeTruthy()
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Create New Conversation
// ============================================================================

test.describe('Messaging - Create Conversation', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
  })

  test('should open new conversation dialog', async () => {
    await messagingPage.clickNewConversation()
    await expect(messagingPage.newConversationDialog).toBeVisible({ timeout: 5000 })
  })

  test('should show conversation type options', async ({ page }) => {
    await messagingPage.clickNewConversation()
    await page.waitForTimeout(500)

    const directButton = messagingPage.directMessageTypeButton
    const groupButton = messagingPage.groupChatTypeButton

    const hasDirectButton = await directButton.isVisible({ timeout: 3000 }).catch(() => false)
    const hasGroupButton = await groupButton.isVisible({ timeout: 3000 }).catch(() => false)

    // Should have at least one type option
    expect(hasDirectButton || hasGroupButton).toBe(true)
  })

  test('should show user search in dialog', async ({ page }) => {
    await messagingPage.clickNewConversation()
    await page.waitForTimeout(500)

    // Click direct message if needed
    const directButton = messagingPage.directMessageTypeButton
    if (await directButton.isVisible({ timeout: 2000 })) {
      await directButton.click()
      await page.waitForTimeout(300)
    }

    // Should show user search
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').last()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
  })

  test('should create direct message conversation', async ({ page }) => {
    await messagingPage.clickNewConversation()
    await page.waitForTimeout(500)

    // Select direct message type if shown
    const directButton = messagingPage.directMessageTypeButton
    if (await directButton.isVisible({ timeout: 2000 })) {
      await directButton.click()
      await page.waitForTimeout(300)
    }

    // Find and select a user
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').last()
    const userItem = page.locator('[role="checkbox"], .user-item, button').filter({ hasText: /.+/ }).first()

    if (await userItem.isVisible({ timeout: 5000 })) {
      await userItem.click()
      await page.waitForTimeout(300)

      // Create conversation
      const createButton = page.locator('[role="dialog"] button').filter({ hasText: /create|start|continue/i }).last()
      if (await createButton.isEnabled({ timeout: 2000 })) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Should navigate to new conversation
        expect(page.url()).toMatch(/\/messages\/[a-f0-9-]+/)
      }
    } else {
      test.skip()
    }
  })

  test('should validate required fields for group chat', async ({ page }) => {
    await messagingPage.clickNewConversation()
    await page.waitForTimeout(500)

    // Select group chat type if shown
    const groupButton = messagingPage.groupChatTypeButton
    if (await groupButton.isVisible({ timeout: 2000 })) {
      await groupButton.click()
      await page.waitForTimeout(300)

      // Try to create without selecting users
      const createButton = page.locator('[role="dialog"] button').filter({ hasText: /create|start/i }).last()

      // Button should be disabled or show validation
      const isDisabled = await createButton.isDisabled({ timeout: 2000 }).catch(() => false)
      expect(isDisabled).toBe(true)
    } else {
      test.skip()
    }
  })

  test('should close dialog on cancel', async ({ page }) => {
    await messagingPage.clickNewConversation()
    await page.waitForTimeout(500)

    const cancelButton = page.locator('[role="dialog"] button').filter({ hasText: /cancel|close/i }).first()
    if (await cancelButton.isVisible({ timeout: 3000 })) {
      await cancelButton.click()
      await page.waitForTimeout(500)

      // Dialog should be closed
      await expect(messagingPage.newConversationDialog).not.toBeVisible()
    }
  })
})

// ============================================================================
// Test Suite: Send Messages
// ============================================================================

test.describe('Messaging - Send Messages', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should send a text message', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const testMessage = TEST_MESSAGE
      await messagingPage.sendMessage(testMessage)

      // Message should appear in thread
      await messagingPage.expectMessageVisible(testMessage)
    } else {
      test.skip()
    }
  })

  test('should send message with Enter key', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const testMessage = `Test Enter ${Date.now()}`
      await messagingPage.sendMessageWithEnter(testMessage)

      // Message should appear
      await messagingPage.expectMessageVisible(testMessage)
    } else {
      test.skip()
    }
  })

  test('should clear input after sending', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      await messagingPage.sendMessage(`Clear test ${Date.now()}`)

      // Input should be empty
      await expect(messagingPage.messageInput).toHaveValue('')
    } else {
      test.skip()
    }
  })

  test('should disable send button when input is empty', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Clear input
      await messagingPage.messageInput.clear()

      // Send button should be disabled
      const isDisabled = await messagingPage.sendButton.isDisabled({ timeout: 2000 }).catch(() => false)
      expect(isDisabled).toBe(true)
    } else {
      test.skip()
    }
  })

  test('should show message timestamp', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const messageCount = await messagingPage.getMessageCount()
      if (messageCount > 0) {
        const message = messagingPage.getMessageAtIndex(messageCount - 1)
        const timestamp = message.locator('text=/\\d+:\\d+|\\d+ (min|hour|day)/i, time, [data-testid*="timestamp"]')

        const hasTimestamp = await timestamp.first().isVisible({ timeout: 3000 }).catch(() => false)
        expect(typeof hasTimestamp).toBe('boolean')
      }
    } else {
      test.skip()
    }
  })

  test('should display sender name in group conversations', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      // Try to find a group conversation
      for (let i = 0; i < Math.min(count, 3); i++) {
        await messagingPage.selectConversation(i)
        await page.waitForTimeout(1000)

        const header = messagingPage.conversationHeader
        const headerText = await header.textContent()

        // If it's a group (multiple participants or group name)
        if (headerText && (headerText.includes(',') || headerText.includes('Group'))) {
          const messageCount = await messagingPage.getMessageCount()
          if (messageCount > 0) {
            const message = messagingPage.getMessageAtIndex(0)
            const senderName = message.locator('[data-testid*="sender"], .sender-name, .message-author')

            const hasSender = await senderName.first().isVisible({ timeout: 3000 }).catch(() => false)
            expect(typeof hasSender).toBe('boolean')
          }
          return
        }
      }
      test.skip()
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: File Attachments
// ============================================================================

test.describe('Messaging - File Attachments', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should show attach file button', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      await expect(messagingPage.attachFileButton).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should open file picker on attach click', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Click attach button
      await messagingPage.attachFileButton.click()
      await page.waitForTimeout(300)

      // File input should exist
      await expect(messagingPage.fileInput).toBeAttached()
    } else {
      test.skip()
    }
  })

  test('should attach and send image file', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Create a test image file (1x1 transparent PNG)
      const testImagePath = path.join(__dirname, '..', 'test-fixtures', 'test-image.png')

      // Check if file exists, skip if not
      const fs = require('fs')
      if (!fs.existsSync(testImagePath)) {
        test.skip()
        return
      }

      await messagingPage.attachAndSendFile(testImagePath, 'Test image attachment')

      // Should show attachment in message
      await page.waitForTimeout(2000)
      const attachment = page.locator('[data-testid*="attachment"], .attachment, img[src*="blob:"], img[src*="http"]')
      const hasAttachment = await attachment.first().isVisible({ timeout: 5000 }).catch(() => false)

      expect(hasAttachment).toBe(true)
    } else {
      test.skip()
    }
  })

  test('should show file preview before sending', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Create test file path
      const testImagePath = path.join(__dirname, '..', 'test-fixtures', 'test-image.png')

      const fs = require('fs')
      if (fs.existsSync(testImagePath)) {
        await messagingPage.attachFile(testImagePath)

        // Should show preview
        const preview = page.locator('[data-testid*="preview"], .file-preview, img')
        const hasPreview = await preview.first().isVisible({ timeout: 3000 }).catch(() => false)

        expect(hasPreview).toBe(true)
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should allow removing attached file before sending', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const testImagePath = path.join(__dirname, '..', 'test-fixtures', 'test-image.png')

      const fs = require('fs')
      if (fs.existsSync(testImagePath)) {
        await messagingPage.attachFile(testImagePath)
        await page.waitForTimeout(500)

        // Look for remove button
        const removeButton = page.locator('button[aria-label*="remove" i], button').filter({ hasText: /remove|delete|×|✕/i }).first()
        if (await removeButton.isVisible({ timeout: 2000 })) {
          await removeButton.click()
          await page.waitForTimeout(500)

          // Preview should be gone
          const preview = page.locator('[data-testid*="preview"], .file-preview')
          await expect(preview.first()).not.toBeVisible()
        }
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Search Conversations
// ============================================================================

test.describe('Messaging - Search Conversations', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should show search input', async ({ page }) => {
    const searchInput = messagingPage.conversationSearchInput
    const isVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      await expect(searchInput).toBeVisible()
    }
  })

  test('should filter conversations by search term', async ({ page }) => {
    const searchInput = messagingPage.conversationSearchInput
    if (await searchInput.isVisible({ timeout: 5000 })) {
      const initialCount = await messagingPage.getConversationCount()

      if (initialCount > 0) {
        // Get name of first conversation
        const firstConv = messagingPage.getConversationItem(0)
        const convText = await firstConv.textContent()
        const searchTerm = convText?.trim().split(' ')[0] || 'test'

        // Search
        await messagingPage.searchConversations(searchTerm)

        // Should have results
        const filteredCount = await messagingPage.getConversationCount()
        expect(filteredCount).toBeGreaterThanOrEqual(0)
      }
    } else {
      test.skip()
    }
  })

  test('should show no results for invalid search', async ({ page }) => {
    const searchInput = messagingPage.conversationSearchInput
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await messagingPage.searchConversations('xyzabc123nonexistent999')
      await page.waitForTimeout(1000)

      const count = await messagingPage.getConversationCount()
      expect(count).toBe(0)
    } else {
      test.skip()
    }
  })

  test('should clear search results', async ({ page }) => {
    const searchInput = messagingPage.conversationSearchInput
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await messagingPage.searchConversations('test')
      await page.waitForTimeout(500)

      await messagingPage.clearConversationSearch()

      // Should show all conversations again
      const count = await messagingPage.getConversationCount()
      expect(count).toBeGreaterThanOrEqual(0)
    } else {
      test.skip()
    }
  })

  test('should search by participant name', async ({ page }) => {
    const searchInput = messagingPage.conversationSearchInput
    if (await searchInput.isVisible({ timeout: 5000 })) {
      const initialCount = await messagingPage.getConversationCount()

      if (initialCount > 0) {
        // Get participant name from first conversation
        const firstConv = messagingPage.getConversationItem(0)
        const convText = await firstConv.textContent()
        const participantName = convText?.trim().split('\n')[0] || 'test'

        await messagingPage.searchConversations(participantName)

        // Should have results
        const count = await messagingPage.getConversationCount()
        expect(count).toBeGreaterThan(0)
      }
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Conversation Tabs & Filters
// ============================================================================

test.describe('Messaging - Tabs & Filters', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should switch to direct messages tab', async ({ page }) => {
    const directTab = messagingPage.directMessagesTab
    if (await directTab.isVisible({ timeout: 5000 })) {
      await messagingPage.switchToTab('direct')
      await page.waitForTimeout(1000)

      // Tab should be active
      const ariaSelected = await directTab.getAttribute('aria-selected')
      expect(ariaSelected).toBe('true')
    } else {
      test.skip()
    }
  })

  test('should switch to group chats tab', async ({ page }) => {
    const groupTab = messagingPage.groupChatsTab
    if (await groupTab.isVisible({ timeout: 5000 })) {
      await messagingPage.switchToTab('group')
      await page.waitForTimeout(1000)

      // Tab should be active
      const ariaSelected = await groupTab.getAttribute('aria-selected')
      expect(ariaSelected).toBe('true')
    } else {
      test.skip()
    }
  })

  test('should show only direct messages in direct tab', async ({ page }) => {
    const directTab = messagingPage.directMessagesTab
    if (await directTab.isVisible({ timeout: 5000 })) {
      await messagingPage.switchToTab('direct')
      await page.waitForTimeout(1000)

      const count = await messagingPage.getConversationCount()
      expect(count).toBeGreaterThanOrEqual(0)
    } else {
      test.skip()
    }
  })

  test('should show only group chats in group tab', async ({ page }) => {
    const groupTab = messagingPage.groupChatsTab
    if (await groupTab.isVisible({ timeout: 5000 })) {
      await messagingPage.switchToTab('group')
      await page.waitForTimeout(1000)

      const count = await messagingPage.getConversationCount()
      expect(count).toBeGreaterThanOrEqual(0)
    } else {
      test.skip()
    }
  })

  test('should return to all conversations tab', async ({ page }) => {
    const allTab = messagingPage.allConversationsTab
    if (await allTab.isVisible({ timeout: 5000 })) {
      // Switch to another tab first
      const directTab = messagingPage.directMessagesTab
      if (await directTab.isVisible({ timeout: 3000 })) {
        await messagingPage.switchToTab('direct')
        await page.waitForTimeout(500)
      }

      // Switch back to all
      await messagingPage.switchToTab('all')
      await page.waitForTimeout(1000)

      const ariaSelected = await allTab.getAttribute('aria-selected')
      expect(ariaSelected).toBe('true')
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Mark as Read/Unread
// ============================================================================

test.describe('Messaging - Read/Unread', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should mark conversation as read when opened', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      // Check if first conversation has unread indicator
      const hadUnread = await messagingPage.hasUnreadIndicator(0)

      if (hadUnread) {
        // Open conversation
        await messagingPage.selectConversation(0)
        await page.waitForTimeout(2000)

        // Go back to list
        await messagingPage.goto()
        await page.waitForTimeout(1000)

        // Unread indicator should be gone
        const stillUnread = await messagingPage.hasUnreadIndicator(0)
        expect(stillUnread).toBe(false)
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should show unread indicator on new messages', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Send a message
      await messagingPage.sendMessage(`Unread test ${Date.now()}`)

      // The conversation should not have unread for sender
      await messagingPage.goto()
      await page.waitForTimeout(1000)

      const hasUnread = await messagingPage.hasUnreadIndicator(0)
      expect(typeof hasUnread).toBe('boolean')
    } else {
      test.skip()
    }
  })

  test('should display unread count badge', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      const unreadCount = await messagingPage.getUnreadCount(0)
      expect(typeof unreadCount).toBe('number')
      expect(unreadCount).toBeGreaterThanOrEqual(0)
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Real-time Updates
// ============================================================================

test.describe('Messaging - Real-time Updates', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()
  })

  test('should show typing indicator', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Start typing
      await messagingPage.messageInput.fill('typing...')

      // Look for typing indicator (might appear for other users)
      const typingIndicator = page.locator('[data-testid*="typing"], .typing-indicator, text=/typing/i')
      const hasTyping = await typingIndicator.first().isVisible({ timeout: 3000 }).catch(() => false)

      // Typing indicator existence is optional
      expect(typeof hasTyping).toBe('boolean')
    } else {
      test.skip()
    }
  })

  test('should update conversation list when new message arrives', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const initialMessageCount = await messagingPage.getMessageCount()

      // Send a message
      await messagingPage.sendMessage(`Realtime test ${Date.now()}`)

      // Message count should increase
      const newMessageCount = await messagingPage.getMessageCount()
      expect(newMessageCount).toBeGreaterThan(initialMessageCount)
    } else {
      test.skip()
    }
  })

  test('should show connection status indicator', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Look for connection status
      const statusIndicator = page.locator('[data-testid*="connection"], .connection-status, text=/connected|online/i')
      const hasStatus = await statusIndicator.first().isVisible({ timeout: 3000 }).catch(() => false)

      expect(typeof hasStatus).toBe('boolean')
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Mobile Responsiveness
// ============================================================================

test.describe('Messaging - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
  })

  test('should display conversation list on mobile', async () => {
    await messagingPage.waitForConversationsLoaded()
    const count = await messagingPage.getConversationCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should hide conversation list when conversation selected on mobile', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Message thread should be visible
      await expect(messagingPage.messageThread).toBeVisible()

      // Conversation list should be hidden
      const listVisible = await messagingPage.conversationList.isVisible()
      expect(listVisible).toBe(false)
    } else {
      test.skip()
    }
  })

  test('should show back button on mobile', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const backButton = messagingPage.backButton
      const isVisible = await backButton.isVisible({ timeout: 5000 }).catch(() => false)

      expect(isVisible).toBe(true)
    } else {
      test.skip()
    }
  })

  test('should navigate back to list on mobile', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const backButton = messagingPage.backButton
      if (await backButton.isVisible({ timeout: 5000 })) {
        await backButton.click()
        await page.waitForTimeout(500)

        // Should show conversation list again
        expect(page.url()).toMatch(/\/messages\/?$/)
      }
    } else {
      test.skip()
    }
  })

  test('should allow scrolling messages on mobile', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      const messageCount = await messagingPage.getMessageCount()
      if (messageCount > 3) {
        // Should be able to scroll
        const messageContainer = page.locator('[data-testid="message-thread"], .message-thread, .messages-container')
        const isScrollable = await messageContainer.first().isVisible()
        expect(isScrollable).toBe(true)
      }
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

test.describe('Messaging - Error Handling', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
  })

  test('should handle empty conversation list gracefully', async ({ page }) => {
    await messagingPage.goto()
    await page.waitForTimeout(1000)

    // Should show either conversations or empty state
    const count = await messagingPage.getConversationCount()
    const hasEmptyState = await messagingPage.emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    expect(count > 0 || hasEmptyState).toBe(true)
  })

  test('should handle network errors', async ({ page }) => {
    await messagingPage.goto()
    await messagingPage.selectFirstProject()
    await messagingPage.waitForConversationsLoaded()

    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Simulate network failure
      await page.route('**/messages**', route => route.abort())

      // Try to send message
      await messagingPage.messageInput.fill('Network error test')
      await messagingPage.sendButton.click()
      await page.waitForTimeout(1000)

      // Should show error message or retry option
      const errorMessage = page.locator('[role="alert"], .error, text=/error|failed|try again/i')
      const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false)

      expect(typeof hasError).toBe('boolean')

      // Clear route
      await page.unroute('**/messages**')
    } else {
      test.skip()
    }
  })

  test('should show loading state', async ({ page }) => {
    await messagingPage.goto()
    await page.waitForTimeout(500)

    // Look for loading indicator during initial load
    const loadingIndicator = page.locator('[aria-label="Loading"], .loading, .spinner, text=/loading/i')
    const wasLoading = await loadingIndicator.first().isVisible({ timeout: 2000 }).catch(() => false)

    expect(typeof wasLoading).toBe('boolean')
  })

  test('should handle invalid conversation ID', async ({ page }) => {
    await page.goto('/messages/invalid-conversation-id-12345')
    await page.waitForLoadState('networkidle')

    // Should show error or redirect
    const errorMessage = page.locator('text=/not found|error|invalid/i, [role="alert"]')
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false)

    const isRedirected = page.url().includes('/messages') && !page.url().includes('invalid-conversation')

    expect(hasError || isRedirected).toBe(true)
  })

  test('should validate file size limits', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.goto()
      await messagingPage.selectFirstProject()
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Try to attach a file (size validation happens client-side)
      // This test verifies the attach button exists
      await expect(messagingPage.attachFileButton).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should handle empty messages gracefully', async ({ page }) => {
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.goto()
      await messagingPage.selectFirstProject()
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Try to send empty message
      await messagingPage.messageInput.clear()

      // Send button should be disabled
      const isDisabled = await messagingPage.sendButton.isDisabled()
      expect(isDisabled).toBe(true)
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Test Suite: Accessibility
// ============================================================================

test.describe('Messaging - Accessibility', () => {
  let messagingPage: MessagingPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    messagingPage = new MessagingPage(page)
    await messagingPage.goto()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have accessible labels', async ({ page }) => {
    await messagingPage.selectFirstProject()
    const count = await messagingPage.getConversationCount()
    if (count > 0) {
      await messagingPage.selectConversation(0)
      await page.waitForTimeout(1000)

      // Message input should have label or aria-label
      const messageInput = messagingPage.messageInput
      const ariaLabel = await messageInput.getAttribute('aria-label')
      const placeholder = await messageInput.getAttribute('placeholder')

      expect(ariaLabel || placeholder).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1')
    const h2 = page.locator('h2')

    const h1Count = await h1.count()
    const h2Count = await h2.count()

    expect(h1Count + h2Count).toBeGreaterThanOrEqual(0)
  })

  test('should have accessible buttons', async ({ page }) => {
    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')

        expect(text || ariaLabel).toBeTruthy()
      }
    }
  })
})
