/**
 * Agent Store Tests
 * Comprehensive unit tests for the agent Zustand store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AgentSession, AgentResponse, PendingConfirmation } from '../../types/agent'

// ============================================================================
// Mocks Setup (hoisted)
// ============================================================================

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

const mockAgentOrchestrator = vi.hoisted(() => ({
  processMessage: vi.fn(),
  executeTask: vi.fn(),
}))

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

vi.mock('../../core/orchestrator', () => ({
  agentOrchestrator: mockAgentOrchestrator,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}))

// Import after mocks
import { useAgentStore, selectActiveSession, selectSortedSessions, selectIsReady, useAgentChat } from '../store'

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockSession = (overrides: Partial<AgentSession> = {}): AgentSession => ({
  id: 'session-1',
  company_id: 'company-1',
  user_id: 'user-1',
  project_id: null,
  status: 'active',
  title: 'Test Session',
  system_context: {},
  user_preferences: {},
  context_entity_type: null,
  context_entity_id: null,
  message_count: 0,
  total_tokens_used: 0,
  total_cost_cents: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ended_at: null,
  last_message_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const createMockUser = () => ({
  id: 'user-1',
  email: 'test@example.com',
})

const createMockUserRecord = () => ({
  id: 'user-1',
  company_id: 'company-1',
})

const createMockAgentResponse = (): AgentResponse => ({
  content: 'Test response',
  toolCalls: [],
  suggestedActions: [],
  tokens: { input: 10, output: 20, total: 30 },
  model: 'test-model',
  latencyMs: 100,
})

const createMockConfirmation = (overrides: Partial<PendingConfirmation> = {}): PendingConfirmation => ({
  id: 'confirmation-1',
  toolName: 'test_tool',
  toolInput: { param: 'value' },
  description: 'Test confirmation',
  createdAt: '2026-01-01T00:00:00Z',
  toolCall: {
    id: 'tool-call-1',
    name: 'test_tool',
    arguments: { param: 'value' },
  },
  severity: 'medium',
  estimatedImpact: 'Low impact',
  ...overrides,
})

// ============================================================================
// Helper Functions
// ============================================================================

const setupSupabaseMock = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  mockSupabase.from.mockReturnValue(mockQuery)
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  return mockQuery
}

const resetStore = () => {
  const { result } = renderHook(() => useAgentStore())
  act(() => {
    result.current.reset()
  })
}

// ============================================================================
// Test Suite
// ============================================================================

describe('useAgentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('should have correct initial state values', () => {
      const { result } = renderHook(() => useAgentStore())

      expect(result.current.activeSessionId).toBeNull()
      expect(result.current.sessions).toBeInstanceOf(Map)
      expect(result.current.sessions.size).toBe(0)
      expect(result.current.isLoadingSessions).toBe(false)
      expect(result.current.isChatOpen).toBe(false)
      expect(result.current.isChatMinimized).toBe(false)
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.streamingMessageId).toBeNull()
      expect(result.current.activeAbortController).toBeNull()
      expect(result.current.pendingConfirmations).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  // ==========================================================================
  // UI Action Tests
  // ==========================================================================

  describe('UI Actions', () => {
    describe('openChat', () => {
      it('should set isChatOpen to true and isChatMinimized to false', async () => {
        // Pre-add a session so openChat doesn't trigger createSession
        const mockQuery = setupSupabaseMock()
        const mockSession = createMockSession({ id: 'session-1' })
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: [mockSession],
          error: null,
        })
        // Mock for createSession's user lookup (in case it gets called)
        mockQuery.single.mockResolvedValue({
          data: createMockUserRecord(),
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          result.current.openChat()
          // Allow async operations triggered by openChat to settle
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        expect(result.current.isChatOpen).toBe(true)
        expect(result.current.isChatMinimized).toBe(false)
      })

      it('should trigger loadSessions when sessions map is empty', async () => {
        const mockQuery = setupSupabaseMock()
        const mockSession = createMockSession()
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: [mockSession],
          error: null,
        })
        // Mock for createSession's user lookup (in case it gets called)
        mockQuery.single.mockResolvedValue({
          data: createMockUserRecord(),
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          result.current.openChat()
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        await waitFor(() => {
          expect(mockSupabase.auth.getUser).toHaveBeenCalled()
        })
      })

      it('should create session when no active session exists', async () => {
        const mockQuery = setupSupabaseMock()
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        // loadSessions returns empty list
        mockQuery.limit.mockResolvedValue({
          data: [],
          error: null,
        })
        // createSession mocks - first for user lookup, second for insert
        mockQuery.single.mockResolvedValueOnce({
          data: createMockUserRecord(),
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: createMockSession(),
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          result.current.openChat()
          await new Promise(resolve => setTimeout(resolve, 150))
        })

        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalledWith('agent_sessions')
        })
      })
    })

    describe('closeChat', () => {
      it('should set isChatOpen to false', () => {
        const { result } = renderHook(() => useAgentStore())

        // Set chat open directly to avoid async side effects
        act(() => {
          useAgentStore.setState({ isChatOpen: true })
        })

        expect(result.current.isChatOpen).toBe(true)

        act(() => {
          result.current.closeChat()
        })

        expect(result.current.isChatOpen).toBe(false)
      })
    })

    describe('toggleChat', () => {
      it('should toggle isChatOpen state', async () => {
        // Pre-add a session so toggleChat (-> openChat) doesn't trigger createSession
        const mockQuery = setupSupabaseMock()
        const mockSession = createMockSession({ id: 'session-1' })
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: [mockSession],
          error: null,
        })
        // Mock for createSession's user lookup (in case it gets called)
        mockQuery.single.mockResolvedValue({
          data: createMockUserRecord(),
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        expect(result.current.isChatOpen).toBe(false)

        await act(async () => {
          result.current.toggleChat()
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        expect(result.current.isChatOpen).toBe(true)

        act(() => {
          result.current.closeChat()
        })

        expect(result.current.isChatOpen).toBe(false)
      })
    })

    describe('minimizeChat', () => {
      it('should set isChatMinimized to true', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.minimizeChat()
        })

        expect(result.current.isChatMinimized).toBe(true)
      })
    })

    describe('maximizeChat', () => {
      it('should set isChatMinimized to false', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.minimizeChat()
        })

        expect(result.current.isChatMinimized).toBe(true)

        act(() => {
          result.current.maximizeChat()
        })

        expect(result.current.isChatMinimized).toBe(false)
      })
    })
  })

  // ==========================================================================
  // Session Management Tests
  // ==========================================================================

  describe('Session Management', () => {
    describe('setActiveSession', () => {
      it('should update activeSessionId', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.setActiveSession('session-123')
        })

        expect(result.current.activeSessionId).toBe('session-123')
      })

      it('should allow setting activeSessionId to null', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.setActiveSession('session-123')
          result.current.setActiveSession(null)
        })

        expect(result.current.activeSessionId).toBeNull()
      })
    })

    describe('loadSessions', () => {
      it('should fetch sessions from Supabase and populate sessions map', async () => {
        const mockQuery = setupSupabaseMock()
        const mockSessions = [
          createMockSession({ id: 'session-1', last_message_at: '2026-01-01T12:00:00Z' }),
          createMockSession({ id: 'session-2', last_message_at: '2026-01-01T11:00:00Z' }),
        ]

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: mockSessions,
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.loadSessions()
        })

        expect(result.current.sessions.size).toBe(2)
        expect(result.current.sessions.get('session-1')).toEqual(mockSessions[0])
        expect(result.current.sessions.get('session-2')).toEqual(mockSessions[1])
        expect(result.current.isLoadingSessions).toBe(false)
      })

      it('should set activeSessionId to most recent session if none selected', async () => {
        const mockQuery = setupSupabaseMock()
        const mockSessions = [
          createMockSession({ id: 'session-1', last_message_at: '2026-01-01T12:00:00Z' }),
          createMockSession({ id: 'session-2', last_message_at: '2026-01-01T11:00:00Z' }),
        ]

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: mockSessions,
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.loadSessions()
        })

        expect(result.current.activeSessionId).toBe('session-1')
      })

      it('should handle Supabase errors gracefully', async () => {
        const mockQuery = setupSupabaseMock()
        const mockError = new Error('Database error')

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.limit.mockResolvedValue({
          data: null,
          error: mockError,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.loadSessions()
        })

        expect(result.current.error).toBe('Failed to load chat sessions')
        expect(result.current.isLoadingSessions).toBe(false)
        expect(mockLogger.error).toHaveBeenCalledWith(
          '[AgentStore] Error loading sessions:',
          expect.any(Error)
        )
      })

      it('should return early if user is not authenticated', async () => {
        const mockQuery = setupSupabaseMock()

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.loadSessions()
        })

        expect(result.current.isLoadingSessions).toBe(false)
        expect(mockQuery.select).not.toHaveBeenCalled()
      })

      it('should set isLoadingSessions during fetch', async () => {
        const mockQuery = setupSupabaseMock()
        let isLoadingDuringFetch = false

        mockSupabase.auth.getUser.mockImplementation(async () => {
          isLoadingDuringFetch = useAgentStore.getState().isLoadingSessions
          return { data: { user: createMockUser() }, error: null }
        })
        mockQuery.limit.mockResolvedValue({ data: [], error: null })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.loadSessions()
        })

        expect(isLoadingDuringFetch).toBe(true)
        expect(result.current.isLoadingSessions).toBe(false)
      })
    })

    describe('createSession', () => {
      it('should create new session in Supabase and add to sessions map', async () => {
        const mockQuery = setupSupabaseMock()
        const newSession = createMockSession({ id: 'new-session', title: 'New Conversation' })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: createMockUserRecord(),
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: newSession,
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        let createdSession: AgentSession | undefined
        await act(async () => {
          createdSession = await result.current.createSession()
        })

        expect(createdSession).toEqual(newSession)
        expect(result.current.sessions.get('new-session')).toEqual(newSession)
        expect(result.current.activeSessionId).toBe('new-session')
      })

      it('should create session with custom DTO values', async () => {
        const mockQuery = setupSupabaseMock()
        const dto = {
          project_id: 'project-1',
          title: 'Custom Title',
          context_entity_type: 'daily_report',
          context_entity_id: 'report-1',
          system_context: { key: 'value' },
        }
        const newSession = createMockSession({ ...dto })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: createMockUserRecord(),
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: newSession,
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.createSession(dto)
        })

        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: dto.project_id,
            title: dto.title,
            context_entity_type: dto.context_entity_type,
            context_entity_id: dto.context_entity_id,
            system_context: dto.system_context,
          })
        )
      })

      it('should throw error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await expect(async () => {
          await act(async () => {
            await result.current.createSession()
          })
        }).rejects.toThrow('User not authenticated')

        expect(result.current.error).toBe('Failed to create chat session')
      })

      it('should throw error if user has no company', async () => {
        const mockQuery = setupSupabaseMock()

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.single.mockResolvedValue({
          data: { id: 'user-1', company_id: null },
          error: null,
        })

        const { result } = renderHook(() => useAgentStore())

        await expect(async () => {
          await act(async () => {
            await result.current.createSession()
          })
        }).rejects.toThrow('User not associated with a company')
      })

      it('should handle Supabase errors', async () => {
        const mockQuery = setupSupabaseMock()
        const mockError = new Error('Database error')

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: createMockUserRecord(),
          error: null,
        })
        mockQuery.single.mockResolvedValueOnce({
          data: null,
          error: mockError,
        })

        const { result } = renderHook(() => useAgentStore())

        await expect(async () => {
          await act(async () => {
            await result.current.createSession()
          })
        }).rejects.toThrow('Database error')

        expect(result.current.error).toBe('Failed to create chat session')
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })

    describe('endSession', () => {
      it('should update session status in Supabase and remove from map', async () => {
        const mockQuery = setupSupabaseMock()
        const { result } = renderHook(() => useAgentStore())

        // Add session to store
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await act(async () => {
          await result.current.endSession('session-1')
        })

        expect(mockQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'ended',
            ended_at: expect.any(String),
          })
        )
        expect(mockQuery.eq).toHaveBeenCalledWith('id', 'session-1')
        expect(result.current.sessions.has('session-1')).toBe(false)
        expect(result.current.activeSessionId).toBeNull()
      })

      it('should clear activeSessionId only if it matches ended session', async () => {
        const mockQuery = setupSupabaseMock()
        const { result } = renderHook(() => useAgentStore())

        // Add sessions to store
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          sessions.set('session-2', createMockSession({ id: 'session-2' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-2' })
        })

        await act(async () => {
          await result.current.endSession('session-1')
        })

        expect(result.current.sessions.has('session-1')).toBe(false)
        expect(result.current.activeSessionId).toBe('session-2')
      })

      it('should handle errors when ending session', async () => {
        const mockQuery = setupSupabaseMock()
        mockQuery.eq.mockRejectedValue(new Error('Database error'))

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.endSession('session-1')
        })

        expect(result.current.error).toBe('Failed to end chat session')
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })

    describe('deleteSession', () => {
      it('should delete session from Supabase and remove from map', async () => {
        const mockQuery = setupSupabaseMock()
        const { result } = renderHook(() => useAgentStore())

        // Add session to store
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await act(async () => {
          await result.current.deleteSession('session-1')
        })

        expect(mockQuery.delete).toHaveBeenCalled()
        expect(mockQuery.eq).toHaveBeenCalledWith('id', 'session-1')
        expect(result.current.sessions.has('session-1')).toBe(false)
        expect(result.current.activeSessionId).toBeNull()
      })

      it('should handle errors when deleting session', async () => {
        const mockQuery = setupSupabaseMock()
        mockQuery.eq.mockRejectedValue(new Error('Database error'))

        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.deleteSession('session-1')
        })

        expect(result.current.error).toBe('Failed to delete chat session')
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // Message Processing Tests
  // ==========================================================================

  describe('Message Processing', () => {
    describe('sendMessage', () => {
      it('should call orchestrator and set isProcessing state', async () => {
        const mockResponse = createMockAgentResponse()
        mockAgentOrchestrator.processMessage.mockResolvedValue(mockResponse)

        const { result } = renderHook(() => useAgentStore())

        // Setup active session
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        let processingDuringCall = false
        mockAgentOrchestrator.processMessage.mockImplementationOnce(async () => {
          processingDuringCall = useAgentStore.getState().isProcessing
          return mockResponse
        })

        let response: AgentResponse | undefined
        await act(async () => {
          response = await result.current.sendMessage('Hello')
        })

        expect(processingDuringCall).toBe(true)
        expect(result.current.isProcessing).toBe(false)
        expect(response).toEqual(mockResponse)
        expect(mockAgentOrchestrator.processMessage).toHaveBeenCalledWith(
          expect.any(Object),
          'Hello',
          expect.objectContaining({
            abortSignal: expect.any(AbortSignal),
            onStreamChunk: expect.any(Function),
            onConfirmationRequired: expect.any(Function),
          })
        )
      })

      it('should throw error if no active session', async () => {
        const { result } = renderHook(() => useAgentStore())

        await expect(async () => {
          await act(async () => {
            await result.current.sendMessage('Hello')
          })
        }).rejects.toThrow('No active session')
      })

      it('should throw error if session not found', async () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({ activeSessionId: 'nonexistent' })
        })

        await expect(async () => {
          await act(async () => {
            await result.current.sendMessage('Hello')
          })
        }).rejects.toThrow('Session not found')
      })

      it('should handle orchestrator errors', async () => {
        const mockError = new Error('Orchestrator error')
        mockAgentOrchestrator.processMessage.mockRejectedValue(mockError)

        const { result } = renderHook(() => useAgentStore())

        // Setup active session
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await expect(async () => {
          await act(async () => {
            await result.current.sendMessage('Hello')
          })
        }).rejects.toThrow('Orchestrator error')

        expect(result.current.error).toBe('Orchestrator error')
        expect(result.current.isProcessing).toBe(false)
        expect(mockLogger.error).toHaveBeenCalledWith(
          '[AgentStore] Error sending message:',
          mockError
        )
      })

      it('should not log abort errors', async () => {
        const mockError = new Error('Request aborted')
        mockAgentOrchestrator.processMessage.mockRejectedValue(mockError)

        const { result } = renderHook(() => useAgentStore())

        // Setup active session
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await expect(async () => {
          await act(async () => {
            await result.current.sendMessage('Hello')
          })
        }).rejects.toThrow('Request aborted')

        expect(result.current.error).toBeNull()
        expect(mockLogger.error).not.toHaveBeenCalled()
      })

      it('should handle streaming chunks', async () => {
        const mockResponse = createMockAgentResponse()
        let onStreamChunk: ((chunk: any) => void) | undefined

        mockAgentOrchestrator.processMessage.mockImplementationOnce(async (session, content, options) => {
          onStreamChunk = options.onStreamChunk
          return mockResponse
        })

        const { result } = renderHook(() => useAgentStore())

        // Setup active session
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await act(async () => {
          await result.current.sendMessage('Hello')
        })

        // Simulate streaming chunk
        act(() => {
          onStreamChunk?.({ type: 'text_delta', messageId: 'msg-123' })
        })

        expect(result.current.streamingMessageId).toBe('msg-123')
      })

      it('should create and store AbortController', async () => {
        const mockResponse = createMockAgentResponse()
        let capturedAbortSignal: AbortSignal | undefined

        mockAgentOrchestrator.processMessage.mockImplementationOnce(async (session, content, options) => {
          capturedAbortSignal = options.abortSignal
          return mockResponse
        })

        const { result } = renderHook(() => useAgentStore())

        // Setup active session
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({ sessions, activeSessionId: 'session-1' })
        })

        await act(async () => {
          await result.current.sendMessage('Hello')
        })

        expect(capturedAbortSignal).toBeInstanceOf(AbortSignal)
      })
    })

    describe('cancelProcessing', () => {
      it('should abort active controller and reset processing state', () => {
        const { result } = renderHook(() => useAgentStore())
        const mockController = new AbortController()
        const abortSpy = vi.spyOn(mockController, 'abort')

        act(() => {
          useAgentStore.setState({
            isProcessing: true,
            activeAbortController: mockController,
            streamingMessageId: 'msg-123',
          })
        })

        act(() => {
          result.current.cancelProcessing()
        })

        expect(abortSpy).toHaveBeenCalled()
        expect(result.current.isProcessing).toBe(false)
        expect(result.current.activeAbortController).toBeNull()
        expect(result.current.streamingMessageId).toBeNull()
      })

      it('should handle case when no controller is active', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.cancelProcessing()
        })

        expect(result.current.isProcessing).toBe(false)
        expect(result.current.activeAbortController).toBeNull()
      })
    })
  })

  // ==========================================================================
  // Confirmation Tests
  // ==========================================================================

  describe('Confirmation Actions', () => {
    describe('addPendingConfirmation', () => {
      it('should add confirmation to pendingConfirmations array', () => {
        const { result } = renderHook(() => useAgentStore())
        const confirmation = createMockConfirmation()

        act(() => {
          result.current.addPendingConfirmation(confirmation)
        })

        expect(result.current.pendingConfirmations).toHaveLength(1)
        expect(result.current.pendingConfirmations[0]).toEqual(confirmation)
      })

      it('should maintain multiple confirmations', () => {
        const { result } = renderHook(() => useAgentStore())
        const confirmation1 = createMockConfirmation({ id: 'conf-1' })
        const confirmation2 = createMockConfirmation({ id: 'conf-2' })

        act(() => {
          result.current.addPendingConfirmation(confirmation1)
          result.current.addPendingConfirmation(confirmation2)
        })

        expect(result.current.pendingConfirmations).toHaveLength(2)
        expect(result.current.pendingConfirmations[0]).toEqual(confirmation1)
        expect(result.current.pendingConfirmations[1]).toEqual(confirmation2)
      })
    })

    describe('confirmAction', () => {
      it('should remove confirmation from pending and execute tool', async () => {
        const mockQuery = setupSupabaseMock()
        const mockResult = { data: { success: true }, error: null }
        mockAgentOrchestrator.executeTask.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useAgentStore())

        const confirmation = createMockConfirmation({
          id: 'conf-1',
          toolCall: {
            id: 'tool-call-1',
            name: 'test_tool',
            arguments: { param: 'value' },
          },
        })

        // Setup session and confirmation
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({
            sessions,
            activeSessionId: 'session-1',
            pendingConfirmations: [confirmation],
          })
        })

        await act(async () => {
          await result.current.confirmAction('conf-1')
        })

        expect(result.current.pendingConfirmations).toHaveLength(0)
        expect(mockAgentOrchestrator.executeTask).toHaveBeenCalledWith(
          'test_tool',
          { param: 'value' },
          expect.objectContaining({
            sessionId: 'session-1',
            autonomyLevel: 'autonomous',
          })
        )
        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            session_id: 'session-1',
            role: 'tool',
            tool_call_id: 'tool-call-1',
            tool_name: 'test_tool',
          })
        )
      })

      it('should call onConfirm callback if provided', async () => {
        const mockQuery = setupSupabaseMock()
        const onConfirm = vi.fn()
        const mockResult = { data: { success: true }, error: null }
        mockAgentOrchestrator.executeTask.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useAgentStore())

        const confirmation = createMockConfirmation({
          id: 'conf-1',
          onConfirm,
          toolCall: {
            id: 'tool-call-1',
            name: 'test_tool',
            arguments: {},
          },
        })

        // Setup session and confirmation
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({
            sessions,
            activeSessionId: 'session-1',
            pendingConfirmations: [confirmation],
          })
        })

        await act(async () => {
          await result.current.confirmAction('conf-1')
        })

        expect(onConfirm).toHaveBeenCalledWith(mockResult)
      })

      it('should handle errors during execution', async () => {
        const mockQuery = setupSupabaseMock()
        const mockError = new Error('Execution error')
        mockAgentOrchestrator.executeTask.mockRejectedValue(mockError)

        const { result } = renderHook(() => useAgentStore())

        const confirmation = createMockConfirmation({
          id: 'conf-1',
          toolCall: {
            id: 'tool-call-1',
            name: 'test_tool',
            arguments: {},
          },
        })

        // Setup session and confirmation
        act(() => {
          const sessions = new Map()
          sessions.set('session-1', createMockSession({ id: 'session-1' }))
          useAgentStore.setState({
            sessions,
            activeSessionId: 'session-1',
            pendingConfirmations: [confirmation],
          })
        })

        await act(async () => {
          await result.current.confirmAction('conf-1')
        })

        expect(result.current.error).toBe('Failed to execute action')
        expect(result.current.isProcessing).toBe(false)
        expect(mockLogger.error).toHaveBeenCalled()
      })

      it('should return early if confirmation not found', async () => {
        const { result } = renderHook(() => useAgentStore())

        await act(async () => {
          await result.current.confirmAction('nonexistent')
        })

        expect(mockAgentOrchestrator.executeTask).not.toHaveBeenCalled()
      })
    })

    describe('rejectAction', () => {
      it('should remove confirmation from pending and save rejection', async () => {
        const mockQuery = setupSupabaseMock()
        const { result } = renderHook(() => useAgentStore())

        const confirmation = createMockConfirmation({
          id: 'conf-1',
          toolCall: {
            id: 'tool-call-1',
            name: 'test_tool',
            arguments: {},
          },
        })

        // Setup confirmation
        act(() => {
          useAgentStore.setState({
            activeSessionId: 'session-1',
            pendingConfirmations: [confirmation],
          })
        })

        await act(async () => {
          await result.current.rejectAction('conf-1')
        })

        expect(result.current.pendingConfirmations).toHaveLength(0)
        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            session_id: 'session-1',
            role: 'tool',
            tool_call_id: 'tool-call-1',
            tool_name: 'test_tool',
            tool_error: 'Action rejected by user',
          })
        )
      })

      it('should call onReject callback if provided', async () => {
        const mockQuery = setupSupabaseMock()
        const onReject = vi.fn()
        const { result } = renderHook(() => useAgentStore())

        const confirmation = createMockConfirmation({
          id: 'conf-1',
          onReject,
          toolCall: {
            id: 'tool-call-1',
            name: 'test_tool',
            arguments: {},
          },
        })

        // Setup confirmation
        act(() => {
          useAgentStore.setState({
            activeSessionId: 'session-1',
            pendingConfirmations: [confirmation],
          })
        })

        await act(async () => {
          await result.current.rejectAction('conf-1')
        })

        expect(onReject).toHaveBeenCalled()
      })
    })

    describe('clearConfirmations', () => {
      it('should empty pendingConfirmations array', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({
            pendingConfirmations: [
              createMockConfirmation({ id: 'conf-1' }),
              createMockConfirmation({ id: 'conf-2' }),
            ],
          })
        })

        expect(result.current.pendingConfirmations).toHaveLength(2)

        act(() => {
          result.current.clearConfirmations()
        })

        expect(result.current.pendingConfirmations).toHaveLength(0)
      })
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    describe('setError', () => {
      it('should set error message', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.setError('Test error message')
        })

        expect(result.current.error).toBe('Test error message')
      })

      it('should allow setting error to null', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.setError('Test error')
          result.current.setError(null)
        })

        expect(result.current.error).toBeNull()
      })
    })

    describe('clearError', () => {
      it('should clear error state', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          result.current.setError('Test error')
        })

        expect(result.current.error).toBe('Test error')

        act(() => {
          result.current.clearError()
        })

        expect(result.current.error).toBeNull()
      })
    })
  })

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe('Reset', () => {
    it('should restore initial state', () => {
      const { result } = renderHook(() => useAgentStore())

      // Modify state
      act(() => {
        const sessions = new Map()
        sessions.set('session-1', createMockSession())
        useAgentStore.setState({
          activeSessionId: 'session-1',
          sessions,
          isChatOpen: true,
          isChatMinimized: true,
          isProcessing: true,
          streamingMessageId: 'msg-1',
          error: 'Test error',
          pendingConfirmations: [createMockConfirmation()],
        })
      })

      // Verify state was modified
      expect(result.current.activeSessionId).toBe('session-1')
      expect(result.current.sessions.size).toBe(1)

      // Reset
      act(() => {
        result.current.reset()
      })

      // Verify reset to initial state
      expect(result.current.activeSessionId).toBeNull()
      expect(result.current.sessions.size).toBe(0)
      expect(result.current.isLoadingSessions).toBe(false)
      expect(result.current.isChatOpen).toBe(false)
      expect(result.current.isChatMinimized).toBe(false)
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.streamingMessageId).toBeNull()
      expect(result.current.activeAbortController).toBeNull()
      expect(result.current.pendingConfirmations).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe('Selectors', () => {
    describe('selectActiveSession', () => {
      it('should return active session when activeSessionId is set', () => {
        const { result } = renderHook(() => useAgentStore())
        const mockSession = createMockSession({ id: 'session-1' })

        act(() => {
          const sessions = new Map()
          sessions.set('session-1', mockSession)
          useAgentStore.setState({
            sessions,
            activeSessionId: 'session-1',
          })
        })

        const activeSession = selectActiveSession(result.current)
        expect(activeSession).toEqual(mockSession)
      })

      it('should return null when activeSessionId is null', () => {
        const { result } = renderHook(() => useAgentStore())

        const activeSession = selectActiveSession(result.current)
        expect(activeSession).toBeNull()
      })

      it('should return undefined when session not found in map', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({ activeSessionId: 'nonexistent' })
        })

        const activeSession = selectActiveSession(result.current)
        expect(activeSession).toBeUndefined()
      })
    })

    describe('selectSortedSessions', () => {
      it('should return sessions sorted by last_message_at descending', () => {
        const { result } = renderHook(() => useAgentStore())

        const session1 = createMockSession({
          id: 'session-1',
          last_message_at: '2026-01-01T10:00:00Z',
        })
        const session2 = createMockSession({
          id: 'session-2',
          last_message_at: '2026-01-01T12:00:00Z',
        })
        const session3 = createMockSession({
          id: 'session-3',
          last_message_at: '2026-01-01T11:00:00Z',
        })

        act(() => {
          const sessions = new Map()
          sessions.set('session-1', session1)
          sessions.set('session-2', session2)
          sessions.set('session-3', session3)
          useAgentStore.setState({ sessions })
        })

        const sortedSessions = selectSortedSessions(result.current)
        expect(sortedSessions).toHaveLength(3)
        expect(sortedSessions[0].id).toBe('session-2') // 12:00
        expect(sortedSessions[1].id).toBe('session-3') // 11:00
        expect(sortedSessions[2].id).toBe('session-1') // 10:00
      })

      it('should return empty array when no sessions', () => {
        const { result } = renderHook(() => useAgentStore())

        const sortedSessions = selectSortedSessions(result.current)
        expect(sortedSessions).toEqual([])
      })
    })

    describe('selectIsReady', () => {
      it('should return true when not loading and has active session', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({
            isLoadingSessions: false,
            activeSessionId: 'session-1',
          })
        })

        const isReady = selectIsReady(result.current)
        expect(isReady).toBe(true)
      })

      it('should return false when loading sessions', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({
            isLoadingSessions: true,
            activeSessionId: 'session-1',
          })
        })

        const isReady = selectIsReady(result.current)
        expect(isReady).toBe(false)
      })

      it('should return false when no active session', () => {
        const { result } = renderHook(() => useAgentStore())

        act(() => {
          useAgentStore.setState({
            isLoadingSessions: false,
            activeSessionId: null,
          })
        })

        const isReady = selectIsReady(result.current)
        expect(isReady).toBe(false)
      })
    })
  })

  // ==========================================================================
  // Hook Tests
  // ==========================================================================

  describe('useAgentChat', () => {
    it('should return expected properties', () => {
      const { result } = renderHook(() => useAgentChat())

      expect(result.current).toHaveProperty('isOpen')
      expect(result.current).toHaveProperty('isMinimized')
      expect(result.current).toHaveProperty('isProcessing')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('activeSession')
      expect(result.current).toHaveProperty('sessions')
      expect(result.current).toHaveProperty('openChat')
      expect(result.current).toHaveProperty('closeChat')
      expect(result.current).toHaveProperty('toggleChat')
      expect(result.current).toHaveProperty('minimizeChat')
      expect(result.current).toHaveProperty('maximizeChat')
      expect(result.current).toHaveProperty('sendMessage')
      expect(result.current).toHaveProperty('cancelProcessing')
      expect(result.current).toHaveProperty('createSession')
      expect(result.current).toHaveProperty('setActiveSession')
      expect(result.current).toHaveProperty('endSession')
      expect(result.current).toHaveProperty('clearError')
    })

    it('should return current state values', () => {
      const mockSession = createMockSession({ id: 'session-1' })

      act(() => {
        const sessions = new Map()
        sessions.set('session-1', mockSession)
        useAgentStore.setState({
          sessions,
          activeSessionId: 'session-1',
          isChatOpen: true,
          isChatMinimized: false,
          isProcessing: true,
          error: 'Test error',
        })
      })

      const { result } = renderHook(() => useAgentChat())

      expect(result.current.isOpen).toBe(true)
      expect(result.current.isMinimized).toBe(false)
      expect(result.current.isProcessing).toBe(true)
      expect(result.current.error).toBe('Test error')
      expect(result.current.activeSession).toEqual(mockSession)
      expect(result.current.sessions).toHaveLength(1)
    })

    it('should provide working action functions', async () => {
      // Pre-add a session so openChat doesn't trigger createSession
      const mockQuery = setupSupabaseMock()
      const mockSession = createMockSession({ id: 'session-1' })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      })
      mockQuery.limit.mockResolvedValue({
        data: [mockSession],
        error: null,
      })
      // Mock for createSession's user lookup (in case it gets called)
      mockQuery.single.mockResolvedValue({
        data: createMockUserRecord(),
        error: null,
      })

      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        result.current.openChat()
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(useAgentStore.getState().isChatOpen).toBe(true)

      act(() => {
        result.current.closeChat()
      })

      expect(useAgentStore.getState().isChatOpen).toBe(false)

      act(() => {
        result.current.setActiveSession('session-123')
      })

      expect(useAgentStore.getState().activeSessionId).toBe('session-123')
    })
  })
})
