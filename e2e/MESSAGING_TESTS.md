# Messaging E2E Tests

Comprehensive end-to-end test suite for the Messaging feature.

## Files Created

1. **e2e/messaging.spec.ts** (1,197 lines)
   - Main test specification file
   - 61 test cases across 12 test suites

2. **e2e/pages/MessagingPage.ts** (396 lines)
   - Page Object Model for messaging feature
   - Reusable methods and locators

3. **e2e/test-fixtures/test-image.png**
   - Test image for file attachment tests
   - Minimal 1x1 pixel PNG (68 bytes)

## Test Coverage

### Test Suites (12)

1. **Setup & Navigation** (7 tests)
   - Navigate to messages page
   - Display empty state
   - Show project selector
   - Display conversation list sidebar
   - Show new conversation button
   - Display conversation tabs
   - Access from main navigation

2. **View Conversations** (6 tests)
   - Display conversation list
   - Show conversation preview
   - Select and view conversation
   - Show unread count badge
   - Display last message preview
   - Show conversation participant names

3. **Create Conversation** (6 tests)
   - Open new conversation dialog
   - Show conversation type options
   - Show user search in dialog
   - Create direct message conversation
   - Validate required fields for group chat
   - Close dialog on cancel

4. **Send Messages** (6 tests)
   - Send a text message
   - Send message with Enter key
   - Clear input after sending
   - Disable send button when input is empty
   - Show message timestamp
   - Display sender name in group conversations

5. **File Attachments** (5 tests)
   - Show attach file button
   - Open file picker on attach click
   - Attach and send image file
   - Show file preview before sending
   - Allow removing attached file before sending

6. **Search Conversations** (4 tests)
   - Show search input
   - Filter conversations by search term
   - Show no results for invalid search
   - Clear search results
   - Search by participant name

7. **Tabs & Filters** (5 tests)
   - Switch to direct messages tab
   - Switch to group chats tab
   - Show only direct messages in direct tab
   - Show only group chats in group tab
   - Return to all conversations tab

8. **Read/Unread** (3 tests)
   - Mark conversation as read when opened
   - Show unread indicator on new messages
   - Display unread count badge

9. **Real-time Updates** (3 tests)
   - Show typing indicator
   - Update conversation list when new message arrives
   - Show connection status indicator

10. **Mobile Responsiveness** (5 tests)
    - Display conversation list on mobile
    - Hide conversation list when conversation selected on mobile
    - Show back button on mobile
    - Navigate back to list on mobile
    - Allow scrolling messages on mobile

11. **Error Handling** (6 tests)
    - Handle empty conversation list gracefully
    - Handle network errors
    - Show loading state
    - Handle invalid conversation ID
    - Validate file size limits
    - Handle empty messages gracefully

12. **Accessibility** (4 tests)
    - Support keyboard navigation
    - Have accessible labels
    - Have proper heading hierarchy
    - Have accessible buttons

## Features Tested

### Core Functionality
- ✅ View conversations list
- ✅ Create new conversation (direct message)
- ✅ Create new conversation (group chat)
- ✅ Send messages
- ✅ Receive messages (real-time updates)
- ✅ Attach files to messages
- ✅ Search conversations
- ✅ Mark as read/unread
- ✅ Group conversations

### User Experience
- ✅ Mobile responsiveness
- ✅ Empty states
- ✅ Loading states
- ✅ Error handling
- ✅ Typing indicators
- ✅ Connection status
- ✅ Unread badges

### Accessibility
- ✅ Keyboard navigation
- ✅ Screen reader labels
- ✅ Semantic HTML
- ✅ ARIA attributes

## Running the Tests

### Run all messaging tests
```bash
npm run test:e2e -- messaging.spec.ts
```

### Run specific test suite
```bash
npm run test:e2e -- messaging.spec.ts -g "Send Messages"
```

### Run in headed mode (see browser)
```bash
npm run test:e2e -- messaging.spec.ts --headed
```

### Run with debug mode
```bash
npm run test:e2e -- messaging.spec.ts --debug
```

### Run on specific browser
```bash
npm run test:e2e -- messaging.spec.ts --project=chromium
npm run test:e2e -- messaging.spec.ts --project=firefox
npm run test:e2e -- messaging.spec.ts --project=webkit
```

## Page Object Model

The `MessagingPage` class provides reusable methods for interacting with the messaging UI:

### Navigation
- `goto()` - Navigate to messages page
- `gotoConversation(id)` - Navigate to specific conversation
- `selectFirstProject()` - Select first available project

### Conversation List
- `getConversationCount()` - Get number of conversations
- `selectConversation(index)` - Select conversation by index
- `searchConversations(query)` - Search conversations

### Messaging
- `sendMessage(content)` - Send a text message
- `attachFile(filePath)` - Attach a file
- `getMessageCount()` - Get number of messages

### Assertions
- `expectConversationVisible(name)` - Assert conversation is visible
- `expectMessageVisible(content)` - Assert message is visible
- `expectUnreadIndicator(index)` - Assert unread indicator exists

## Test Data

Tests use dynamic test data to avoid conflicts:
- Messages include timestamps: `Test message ${Date.now()}`
- Group names include timestamps: `Test Group ${Date.now()}`

## Environment Variables

Tests support the following environment variables:

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## Test Patterns

### Login Helper
All tests use a shared `login()` helper function that:
1. Navigates to /login
2. Fills credentials
3. Submits with Enter key
4. Waits for successful navigation

### Conditional Tests
Tests use `test.skip()` for scenarios that require specific data:
```typescript
if (count === 0) {
  test.skip()
}
```

### Wait Strategies
Tests use appropriate wait strategies:
- `waitForLoadState('networkidle')` - Wait for network requests
- `waitForTimeout()` - Wait for animations/transitions
- `waitForSelector()` - Wait for specific elements

## Known Limitations

1. **File Upload Tests**: Require test fixture files to exist
2. **Real-time Tests**: Cannot fully test multi-user scenarios in isolation
3. **Network Tests**: Simulate errors but don't test actual network conditions
4. **Group Chat Creation**: Requires multiple users to exist in project

## Future Enhancements

- [ ] Test multi-user real-time messaging
- [ ] Test message editing
- [ ] Test message deletion
- [ ] Test reactions/emoji
- [ ] Test @mentions autocomplete
- [ ] Test message threading
- [ ] Test voice messages
- [ ] Test video attachments
- [ ] Test offline queue functionality
- [ ] Test notification preferences

## Maintenance Notes

- Update test data timestamps to avoid conflicts
- Keep Page Object Model in sync with UI changes
- Update selectors if component structure changes
- Add new test fixtures as needed
- Review and update accessibility tests with WCAG updates
