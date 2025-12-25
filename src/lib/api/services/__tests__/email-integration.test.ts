import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as emailIntegrationApi from '../email-integration'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Email Integration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // EMAIL ACCOUNTS
  // =====================================================

  describe('getEmailAccounts', () => {
    it('should fetch all active email accounts', async () => {
      const mockAccounts = [
        { id: '1', email_address: 'test@example.com', is_active: true },
        { id: '2', email_address: 'test2@example.com', is_active: true },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmailAccounts()

      expect(result.data).toEqual(mockAccounts)
      expect(result.error).toBeNull()
      expect(supabase.from).toHaveBeenCalledWith('email_accounts')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmailAccounts()

      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('getEmailAccount', () => {
    it('should fetch a single email account by ID', async () => {
      const mockAccount = { id: '123', email_address: 'test@example.com', is_active: true }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmailAccount('123')

      expect(result.data).toEqual(mockAccount)
      expect(result.error).toBeNull()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123')
    })
  })

  describe('getOAuthUrl', () => {
    it('should generate Gmail OAuth URL', () => {
      const redirectUri = 'http://localhost:3000/callback'
      const result = emailIntegrationApi.getOAuthUrl('gmail', redirectUri)

      expect(result).toContain('accounts.google.com')
      expect(result).toContain('redirect_uri=')
      expect(result).toContain('scope=')
      expect(result).toContain('state=')
    })

    it('should generate Outlook OAuth URL', () => {
      const redirectUri = 'http://localhost:3000/callback'
      const result = emailIntegrationApi.getOAuthUrl('outlook', redirectUri)

      expect(result).toContain('login.microsoftonline.com')
      expect(result).toContain('redirect_uri=')
      expect(result).toContain('scope=')
    })

    it('should throw error for unsupported provider', () => {
      expect(() =>
        emailIntegrationApi.getOAuthUrl('invalid' as any, 'http://localhost:3000')
      ).toThrow('Unsupported provider: invalid')
    })
  })

  describe('connectEmailAccount', () => {
    it('should connect IMAP account', async () => {
      const mockAccount = {
        id: '123',
        email_address: 'test@example.com',
        provider: 'imap',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.connectEmailAccount({
        provider: 'imap',
        email_address: 'test@example.com',
        imap_host: 'imap.example.com',
        smtp_host: 'smtp.example.com',
      })

      expect(result.data).toEqual(mockAccount)
      expect(result.error).toBeNull()
    })

    it('should complete OAuth connection for Gmail', async () => {
      const mockResponse = {
        account: {
          id: '123',
          email_address: 'test@gmail.com',
          provider: 'gmail',
        },
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const result = await emailIntegrationApi.connectEmailAccount({
        provider: 'gmail',
        code: 'oauth-code-123',
      })

      expect(result.data).toEqual(mockResponse.account)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('email-complete-oauth', {
        body: { provider: 'gmail', code: 'oauth-code-123' },
      })
    })
  })

  describe('disconnectEmailAccount', () => {
    it('should disconnect email account', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.disconnectEmailAccount('123')

      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
      expect(mockQuery.update).toHaveBeenCalledWith({ is_active: false })
    })
  })

  describe('toggleEmailSync', () => {
    it('should enable email sync', async () => {
      const mockAccount = { id: '123', sync_enabled: true }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.toggleEmailSync('123', true)

      expect(result.data).toEqual(mockAccount)
      expect(mockQuery.update).toHaveBeenCalledWith({ sync_enabled: true })
    })
  })

  describe('triggerEmailSync', () => {
    it('should trigger manual sync', async () => {
      const mockResponse = { success: true, message: 'Sync started' }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const result = await emailIntegrationApi.triggerEmailSync('123')

      expect(result.data).toEqual(mockResponse)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('sync-emails-cron', {
        body: { accountId: '123' },
      })
    })
  })

  // =====================================================
  // EMAIL THREADS
  // =====================================================

  describe('getEmailThreads', () => {
    it('should fetch email threads with no filters', async () => {
      const mockThreads = [
        { id: '1', subject: 'Test Email 1', account_id: 'acc1' },
        { id: '2', subject: 'Test Email 2', account_id: 'acc1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockThreads, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmailThreads()

      expect(result.data).toEqual(mockThreads)
      expect(result.error).toBeNull()
    })

    it('should apply account_id filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await emailIntegrationApi.getEmailThreads({ account_id: 'acc123' })

      expect(mockQuery.eq).toHaveBeenCalledWith('account_id', 'acc123')
    })

    it('should apply starred filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await emailIntegrationApi.getEmailThreads({ is_starred: true })

      expect(mockQuery.eq).toHaveBeenCalledWith('is_starred', true)
    })

    it('should apply search filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await emailIntegrationApi.getEmailThreads({ search: 'important' })

      expect(mockQuery.textSearch).toHaveBeenCalledWith('subject', 'important')
    })
  })

  describe('getEmailThread', () => {
    it('should fetch single thread with emails', async () => {
      const mockThread = {
        id: '123',
        subject: 'Test Thread',
        emails: [{ id: 'e1' }, { id: 'e2' }],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockThread, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmailThread('123')

      expect(result.data).toEqual(mockThread)
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining('emails:emails'))
    })
  })

  describe('updateEmailThread', () => {
    it('should update thread starred status', async () => {
      const mockThread = { id: '123', is_starred: true }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockThread, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.updateEmailThread('123', { is_starred: true })

      expect(result.data).toEqual(mockThread)
      expect(mockQuery.update).toHaveBeenCalledWith({ is_starred: true })
    })
  })

  describe('markThreadAsRead', () => {
    it('should mark all emails in thread as read', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.markThreadAsRead('123', true)

      expect(result.data).toBe(true)
      expect(mockQuery.update).toHaveBeenCalledWith({ is_read: true })
      expect(mockQuery.eq).toHaveBeenCalledWith('thread_id', '123')
    })
  })

  // =====================================================
  // EMAILS
  // =====================================================

  describe('getEmails', () => {
    it('should fetch emails with filters', async () => {
      const mockEmails = [
        { id: '1', subject: 'Email 1' },
        { id: '2', subject: 'Email 2' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockEmails, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.getEmails({ account_id: 'acc1' })

      expect(result.data).toEqual(mockEmails)
      expect(mockQuery.eq).toHaveBeenCalledWith('account_id', 'acc1')
    })
  })

  describe('sendEmail', () => {
    it('should send an email via edge function', async () => {
      const mockResponse = { success: true, email_id: 'email123' }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const emailData = {
        account_id: 'acc1',
        to: ['recipient@example.com'],
        subject: 'Test Email',
        body_html: '<p>Test content</p>',
      }

      const result = await emailIntegrationApi.sendEmail(emailData)

      expect(result.data).toEqual(mockResponse)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-composed-email', {
        body: emailData,
      })
    })
  })

  describe('saveDraft', () => {
    it('should save email as draft', async () => {
      const mockDraft = { id: 'draft1', is_draft: true }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDraft, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.saveDraft({
        account_id: 'acc1',
        to: ['test@example.com'],
        subject: 'Draft',
        body_html: '<p>Draft content</p>',
      })

      expect(result.data).toEqual(mockDraft)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_draft: true, folder: 'drafts' })
      )
    })
  })

  // =====================================================
  // ENTITY LINKING
  // =====================================================

  describe('createEntityLink', () => {
    it('should create entity link', async () => {
      const mockLink = {
        id: 'link1',
        email_id: 'email1',
        entity_type: 'meeting',
        entity_id: 'meeting1',
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLink, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.createEntityLink({
        email_id: 'email1',
        entity_type: 'meeting',
        entity_id: 'meeting1',
      })

      expect(result.data).toEqual(mockLink)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: 'email1',
          entity_type: 'meeting',
          entity_id: 'meeting1',
          created_by: 'user1',
        })
      )
    })
  })

  describe('removeEntityLink', () => {
    it('should remove entity link', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await emailIntegrationApi.removeEntityLink('link1')

      expect(result.data).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'link1')
    })
  })

  describe('searchEmails', () => {
    it('should search emails using RPC function', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      } as any)

      const mockResults = [
        { email_id: '1', subject: 'Important' },
        { email_id: '2', subject: 'Important Meeting' },
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResults,
        error: null,
      })

      const result = await emailIntegrationApi.searchEmails({
        query: 'important',
        limit: 10,
      })

      expect(result.data).toHaveLength(2)
      expect(supabase.rpc).toHaveBeenCalledWith('search_emails', {
        p_user_id: 'user1',
        p_query: 'important',
        p_folder: null,
        p_limit: 10,
      })
    })
  })

  describe('getUnreadEmailCount', () => {
    it('should get unread email count', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
      })

      const result = await emailIntegrationApi.getUnreadEmailCount()

      expect(result.data).toBe(5)
      expect(supabase.rpc).toHaveBeenCalledWith('get_unread_email_count', {
        p_user_id: 'user1',
      })
    })

    it('should return 0 when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      const result = await emailIntegrationApi.getUnreadEmailCount()

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('Not authenticated')
    })
  })
})
