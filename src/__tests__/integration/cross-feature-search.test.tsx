/**
 * Cross-Feature Search Integration Tests
 * Tests search functionality across multiple entity types and navigation flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent, createTestQueryClient } from '@/__tests__/helpers';
import { createMockUser, createMockSession } from '@/__tests__/factories';
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar';
import type { SemanticSearchResponse, SearchResult } from '@/lib/api/services/semantic-search';

// Mock semantic search service
const mockSemanticSearch = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/api/services/semantic-search', () => ({
  semanticSearch: (...args: any[]) => mockSemanticSearch(...args),
  simpleSearch: vi.fn(),
  checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
  sanitizeSearchQuery: (q: string) => q,
  sanitizeDateRange: (d: any) => d,
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AI service
vi.mock('@/lib/api/services/ai-provider', () => ({
  aiService: {
    complete: vi.fn(),
  },
  aiUsageApi: {
    trackUsage: vi.fn(),
  },
}));

describe('Cross-Feature Search Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockUser = createMockUser({ id: 'user-123' });
  const mockSession = createMockSession();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorage.clear();

    mockCheckRateLimit.mockReturnValue({
      remaining: 50,
      limit: 50,
      resetAt: new Date(Date.now() + 3600000),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Entity Search', () => {
    it('should search across all entity types and display mixed results', async () => {
      const mixedResults: SearchResult[] = [
        {
          id: '1',
          entityType: 'rfi',
          title: 'RFI #001 - Structural Steel Question',
          description: 'Question about beam specifications',
          number: 'RFI-001',
          status: 'Open',
          projectId: 'proj-1',
          projectName: 'Office Building',
          createdAt: '2024-01-15',
          matchedTerms: ['steel', 'structural'],
          relevanceScore: 95,
          url: '/rfis/1',
        },
        {
          id: '2',
          entityType: 'submittal',
          title: 'Submittal #002 - Steel Fabrication Drawings',
          description: 'Structural steel shop drawings',
          number: 'SUB-002',
          status: 'Approved',
          projectId: 'proj-1',
          projectName: 'Office Building',
          createdAt: '2024-01-16',
          matchedTerms: ['steel', 'structural'],
          relevanceScore: 92,
          url: '/submittals/2',
        },
        {
          id: '3',
          entityType: 'document',
          title: 'Structural Calculations - Steel Beams',
          description: 'Engineering calculations for structural steel',
          status: 'Approved',
          projectId: 'proj-1',
          projectName: 'Office Building',
          createdAt: '2024-01-10',
          matchedTerms: ['steel', 'structural', 'calculations'],
          relevanceScore: 88,
          url: '/documents/3',
        },
        {
          id: '4',
          entityType: 'daily_report',
          title: 'Daily Report - 2024-01-20',
          description: 'Steel erection began today',
          status: 'Submitted',
          projectId: 'proj-1',
          projectName: 'Office Building',
          createdAt: '2024-01-20',
          matchedTerms: ['steel', 'erection'],
          relevanceScore: 85,
          url: '/daily-reports/4',
        },
      ];

      const mockResponse: SemanticSearchResponse = {
        results: mixedResults,
        expandedTerms: ['steel', 'structural', 'metal', 'beam'],
        totalResults: 4,
        searchTimeMs: 145,
        queryExpansionTimeMs: 45,
      };

      mockSemanticSearch.mockResolvedValue(mockResponse);

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      // Open search dialog
      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Type search query
      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'structural steel');

      // Trigger search
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('RFI #001 - Structural Steel Question')).toBeInTheDocument();
      });

      // Verify all entity types are shown
      expect(screen.getByText('Submittal #002 - Steel Fabrication Drawings')).toBeInTheDocument();
      expect(screen.getByText('Structural Calculations - Steel Beams')).toBeInTheDocument();
      expect(screen.getByText(/Daily Report/)).toBeInTheDocument();

      // Verify result count
      expect(screen.getByText(/4 results/i)).toBeInTheDocument();

      // Verify expanded terms shown
      expect(screen.getByText(/steel, structural, metal/i)).toBeInTheDocument();
    });

    it('should filter results by specific entity types', async () => {
      const filteredResults: SearchResult[] = [
        {
          id: '1',
          entityType: 'rfi',
          title: 'RFI #001 - Question',
          description: 'Test description',
          projectId: 'proj-1',
          projectName: 'Test Project',
          createdAt: '2024-01-15',
          matchedTerms: ['test'],
          relevanceScore: 95,
          url: '/rfis/1',
        },
        {
          id: '2',
          entityType: 'submittal',
          title: 'Submittal #002 - Test',
          description: 'Test description',
          projectId: 'proj-1',
          projectName: 'Test Project',
          createdAt: '2024-01-16',
          matchedTerms: ['test'],
          relevanceScore: 90,
          url: '/submittals/2',
        },
      ];

      mockSemanticSearch.mockResolvedValue({
        results: filteredResults,
        expandedTerms: ['test'],
        totalResults: 2,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Open filters
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);

      // Select RFI and Submittal filters
      const rfiButton = screen.getByRole('button', { name: /rfis/i });
      await user.click(rfiButton);

      const submittalButton = screen.getByRole('button', { name: /submittals/i });
      await user.click(submittalButton);

      // Type query and search
      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify search was called with entity filters
      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalledWith(
          'test',
          mockUser.id,
          expect.objectContaining({
            entities: expect.arrayContaining(['rfi', 'submittal']),
          })
        );
      });
    });
  });

  describe('Search-to-Detail Navigation', () => {
    it('should navigate to RFI detail page when RFI result is clicked', async () => {
      const rfiResult: SearchResult = {
        id: 'rfi-123',
        entityType: 'rfi',
        title: 'RFI #123 - Test RFI',
        description: 'Test description',
        projectId: 'proj-1',
        projectName: 'Test Project',
        createdAt: '2024-01-15',
        matchedTerms: ['test'],
        relevanceScore: 95,
        url: '/rfis/rfi-123',
      };

      mockSemanticSearch.mockResolvedValue({
        results: [rfiResult],
        expandedTerms: ['test'],
        totalResults: 1,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('RFI #123 - Test RFI')).toBeInTheDocument();
      });

      // Click the result
      const resultButton = screen.getByRole('button', { name: /RFI #123 - Test RFI/i });
      await user.click(resultButton);

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('/rfis/rfi-123');
    });

    it('should navigate to document detail page when document result is clicked', async () => {
      const documentResult: SearchResult = {
        id: 'doc-456',
        entityType: 'document',
        title: 'Project Specifications',
        description: 'Complete project spec document',
        projectId: 'proj-1',
        projectName: 'Test Project',
        createdAt: '2024-01-15',
        matchedTerms: ['specifications'],
        relevanceScore: 90,
        url: '/documents/doc-456',
      };

      mockSemanticSearch.mockResolvedValue({
        results: [documentResult],
        expandedTerms: ['specifications'],
        totalResults: 1,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'specifications');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Project Specifications')).toBeInTheDocument();
      });

      const resultButton = screen.getByRole('button', { name: /Project Specifications/i });
      await user.click(resultButton);

      expect(mockNavigate).toHaveBeenCalledWith('/documents/doc-456');
    });

    it('should navigate using keyboard (ArrowDown + Enter)', async () => {
      const results: SearchResult[] = [
        {
          id: '1',
          entityType: 'rfi',
          title: 'First Result',
          description: 'Test',
          projectId: 'proj-1',
          projectName: 'Test Project',
          createdAt: '2024-01-15',
          matchedTerms: ['test'],
          relevanceScore: 95,
          url: '/rfis/1',
        },
        {
          id: '2',
          entityType: 'submittal',
          title: 'Second Result',
          description: 'Test',
          projectId: 'proj-1',
          projectName: 'Test Project',
          createdAt: '2024-01-16',
          matchedTerms: ['test'],
          relevanceScore: 90,
          url: '/submittals/2',
        },
      ];

      mockSemanticSearch.mockResolvedValue({
        results,
        expandedTerms: ['test'],
        totalResults: 2,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('First Result')).toBeInTheDocument();
      });

      // Navigate down to second result
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Press Enter
      await user.keyboard('{Enter}');

      // Should navigate to second result
      expect(mockNavigate).toHaveBeenCalledWith('/submittals/2');
    });
  });

  describe('Recent Searches Tracking', () => {
    it('should persist recent searches across sessions', async () => {
      mockSemanticSearch.mockResolvedValue({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      const { unmount } = render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'first search');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalled();
      });

      // Unmount and remount component
      unmount();

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      // Recent searches should still be there
      await waitFor(() => {
        expect(screen.getByText('first search')).toBeInTheDocument();
      });
    });

    it('should show recent searches before any search is performed', async () => {
      // Pre-populate localStorage
      localStorage.setItem(
        'jobsight_recent_searches',
        JSON.stringify(['roof leak', 'HVAC submittal', 'safety inspection'])
      );

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });

      expect(screen.getByText('roof leak')).toBeInTheDocument();
      expect(screen.getByText('HVAC submittal')).toBeInTheDocument();
      expect(screen.getByText('safety inspection')).toBeInTheDocument();
    });

    it('should trigger search when recent search is clicked', async () => {
      localStorage.setItem('jobsight_recent_searches', JSON.stringify(['previous search']));

      mockSemanticSearch.mockResolvedValue({
        results: [],
        expandedTerms: ['previous', 'search'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        expect(screen.getByText('previous search')).toBeInTheDocument();
      });

      const recentSearchButton = screen.getByRole('button', { name: /previous search/i });
      await user.click(recentSearchButton);

      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalledWith(
          'previous search',
          mockUser.id,
          expect.any(Object)
        );
      });
    });
  });

  describe('Filter Persistence', () => {
    it('should maintain entity filters across searches', async () => {
      mockSemanticSearch.mockResolvedValue({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      // Set filters
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);

      const rfiButton = screen.getByRole('button', { name: /rfis/i });
      await user.click(rfiButton);

      // First search
      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'first search');

      let searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalledWith(
          'first search',
          mockUser.id,
          expect.objectContaining({
            entities: expect.arrayContaining(['rfi']),
          })
        );
      });

      // Clear and do second search - filters should persist
      await user.clear(input);
      await user.type(input, 'second search');

      searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalledWith(
          'second search',
          mockUser.id,
          expect.objectContaining({
            entities: expect.arrayContaining(['rfi']),
          })
        );
      });
    });

    it('should maintain AI expansion toggle state', async () => {
      const { simpleSearch } = await import('@/lib/api/services/semantic-search');

      vi.mocked(simpleSearch).mockResolvedValue({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 0,
      });

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      // Disable AI expansion
      const aiButton = screen.getByRole('button', { name: /ai expand/i });
      await user.click(aiButton);

      // Do search
      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(simpleSearch).toHaveBeenCalled();
        expect(mockSemanticSearch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Project-Scoped Search', () => {
    it('should filter results by project when projectId is provided', async () => {
      const projectId = 'proj-456';

      mockSemanticSearch.mockResolvedValue({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      render(<GlobalSearchBar projectId={projectId} />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSemanticSearch).toHaveBeenCalledWith(
          'test',
          mockUser.id,
          expect.objectContaining({
            projectId: projectId,
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should display error and allow retry', async () => {
      // First search fails
      mockSemanticSearch.mockRejectedValueOnce(new Error('Network error'));

      render(<GlobalSearchBar />, {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
      });

      await user.keyboard('{Control>}k{/Control}');

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Retry should succeed
      mockSemanticSearch.mockResolvedValueOnce({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 30,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });
});
