import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('AI Provider API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateText', () => {
    it('should generate text completion', async () => {
      const mockResponse = {
        text: 'This is generated text',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-generate-text', {
        body: {
          prompt: 'Generate text about construction safety',
          max_tokens: 100,
        },
      })

      expect(data).toEqual(mockResponse)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('ai-generate-text', {
        body: expect.objectContaining({
          prompt: expect.any(String),
        }),
      })
    })

    it('should handle API errors', async () => {
      const mockError = new Error('API rate limit exceeded')

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { error } = await supabase.functions.invoke('ai-generate-text', {
        body: { prompt: 'test' },
      })

      expect(error).toEqual(mockError)
    })
  })

  describe('analyzeImage', () => {
    it('should analyze image content', async () => {
      const mockResponse = {
        description: 'Construction site with equipment',
        objects: ['excavator', 'workers', 'safety cones'],
        safety_issues: ['missing hard hat'],
        confidence: 0.95,
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-analyze-image', {
        body: {
          image_url: 'https://example.com/image.jpg',
          analysis_type: 'safety',
        },
      })

      expect(data).toMatchObject({
        description: expect.any(String),
        objects: expect.any(Array),
      })
    })

    it('should detect safety violations', async () => {
      const mockResponse = {
        violations: [
          { type: 'no_hard_hat', severity: 'high', location: { x: 100, y: 200 } },
        ],
        compliance_score: 0.75,
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-analyze-image', {
        body: {
          image_url: 'https://example.com/site.jpg',
          analysis_type: 'safety_compliance',
        },
      })

      expect(data?.violations).toBeDefined()
      expect(data?.compliance_score).toBeLessThanOrEqual(1)
    })
  })

  describe('generateSummary', () => {
    it('should summarize document', async () => {
      const mockResponse = {
        summary: 'Brief summary of the document',
        key_points: ['Point 1', 'Point 2', 'Point 3'],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-summarize', {
        body: {
          text: 'Long document text here...',
          max_length: 200,
        },
      })

      expect(data?.summary).toBeTruthy()
      expect(data?.key_points).toBeInstanceOf(Array)
    })
  })

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      const mockResponse = {
        entities: [
          { type: 'date', value: '2024-12-19', confidence: 0.99 },
          { type: 'person', value: 'John Smith', confidence: 0.95 },
          { type: 'location', value: 'Building A', confidence: 0.90 },
        ],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-extract-entities', {
        body: {
          text: 'John Smith visited Building A on 2024-12-19',
        },
      })

      expect(data?.entities).toHaveLength(3)
      expect(data?.entities[0].type).toBe('date')
    })
  })

  describe('classifyDocument', () => {
    it('should classify document type', async () => {
      const mockResponse = {
        category: 'safety_report',
        confidence: 0.92,
        subcategories: ['incident_report', 'inspection'],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-classify-document', {
        body: {
          text: 'Safety incident report text...',
        },
      })

      expect(data?.category).toBe('safety_report')
      expect(data?.confidence).toBeGreaterThan(0.9)
    })
  })

  describe('generateActionItems', () => {
    it('should generate action items from meeting notes', async () => {
      const mockResponse = {
        action_items: [
          {
            title: 'Review safety procedures',
            assigned_to: 'John Smith',
            due_date: '2024-12-25',
            priority: 'high',
          },
          {
            title: 'Update project timeline',
            assigned_to: 'Jane Doe',
            due_date: '2024-12-22',
            priority: 'medium',
          },
        ],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-extract-action-items', {
        body: {
          text: 'Meeting notes discussing various tasks...',
        },
      })

      expect(data?.action_items).toHaveLength(2)
      expect(data?.action_items[0]).toHaveProperty('title')
      expect(data?.action_items[0]).toHaveProperty('due_date')
    })
  })

  describe('semanticSearch', () => {
    it('should perform semantic search', async () => {
      const mockResponse = {
        results: [
          { id: '1', content: 'Relevant document 1', score: 0.95 },
          { id: '2', content: 'Relevant document 2', score: 0.88 },
        ],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { data } = await supabase.functions.invoke('ai-semantic-search', {
        body: {
          query: 'construction safety procedures',
          limit: 10,
        },
      })

      expect(data?.results).toBeInstanceOf(Array)
      expect(data?.results[0].score).toBeGreaterThan(0.8)
    })
  })

  describe('promptManagement', () => {
    it('should save prompt template', async () => {
      const mockTemplate = {
        id: 'tmpl1',
        name: 'Daily Report Summary',
        template: 'Summarize the following daily report:\n\n{report_content}',
        variables: ['report_content'],
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('ai_prompt_templates')
        .insert({
          name: 'Daily Report Summary',
          template: 'Summarize the following daily report:\n\n{report_content}',
        })
        .select()
        .single()

      expect(data).toMatchObject({ name: 'Daily Report Summary' })
    })

    it('should fetch prompt templates', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1' },
        { id: '2', name: 'Template 2' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('ai_prompt_templates')
        .select('*')
        .order('created_at')

      expect(data).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('should handle rate limiting', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', status: 429 },
      })

      const { error } = await supabase.functions.invoke('ai-generate-text', {
        body: { prompt: 'test' },
      })

      expect(error).toBeTruthy()
      expect(error?.status).toBe(429)
    })

    it('should handle invalid API key', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key', status: 401 },
      })

      const { error } = await supabase.functions.invoke('ai-generate-text', {
        body: { prompt: 'test' },
      })

      expect(error?.status).toBe(401)
    })

    it('should handle network errors', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(
        new Error('Network error')
      )

      await expect(
        supabase.functions.invoke('ai-generate-text', {
          body: { prompt: 'test' },
        })
      ).rejects.toThrow('Network error')
    })
  })
})
