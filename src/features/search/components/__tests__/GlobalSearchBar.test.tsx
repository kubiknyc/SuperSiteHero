/**
 * GlobalSearchBar Component Tests
 * Tests for the global search bar with AI integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent, fireEvent } from '@/__tests__/helpers';
import { GlobalSearchBar } from '../GlobalSearchBar';
import * as useSemanticSearchModule from '@/features/ai/hooks/useSemanticSearch';

// Mock the useSemanticSearch hook
const mockSearch = vi.fn();
const mockSetQuery = vi.fn();
const mockClearResults = vi.fn();
const mockSetEntityFilters = vi.fn();
const mockSetExpansionEnabled = vi.fn();
const mockClearRecentSearches = vi.fn();
const mockSetProjectId = vi.fn();

const createMockHookReturn = (overrides = {}) => ({
  query: '',
  setQuery: mockSetQuery,
  results: [],
  expandedTerms: [],
  isLoading: false,
  hasSearched: false,
  error: null,
  search: mockSearch,
  clearResults: mockClearResults,
  totalResults: 0,
  searchTimeMs: 0,
  queryExpansionTimeMs: 0,
  entityFilters: [],
  setEntityFilters: mockSetEntityFilters,
  dateRange: undefined,
  setDateRange: vi.fn(),
  projectId: undefined,
  setProjectId: mockSetProjectId,
  rateLimit: { remaining: 50, limit: 50, resetAt: new Date() },
  expansionEnabled: true,
  setExpansionEnabled: mockSetExpansionEnabled,
  recentSearches: [],
  clearRecentSearches: mockClearRecentSearches,
  ...overrides,
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GlobalSearchBar', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Default mock implementation
    vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
      createMockHookReturn() as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the search trigger button in compact mode', () => {
      render(<GlobalSearchBar compact />);

      const button = screen.getByRole('button', { name: /search/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByText(/ctrl\+k/i)).toBeInTheDocument();
    });

    it('should render the full search bar by default', () => {
      render(<GlobalSearchBar />);

      const searchTrigger = screen.getByText('Search across all items...');
      expect(searchTrigger).toBeInTheDocument();
      expect(screen.getByText(/ctrl\+k/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<GlobalSearchBar placeholder="Find anything..." />);

      expect(screen.getByText('Find anything...')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open dialog on Ctrl+K', async () => {
      render(<GlobalSearchBar />);

      // Press Ctrl+K
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should open dialog on Cmd+K (Mac)', async () => {
      render(<GlobalSearchBar />);

      // Press Cmd+K
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should prevent default browser behavior for Ctrl+K', async () => {
      render(<GlobalSearchBar />);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should focus input when dialog opens', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Search across all items...');
        expect(input).toHaveFocus();
      });
    });
  });

  describe('Search Input', () => {
    it('should update query when user types', async () => {
      render(<GlobalSearchBar />);

      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');
      await user.type(input, 'roof leak');

      expect(mockSetQuery).toHaveBeenCalledWith('roof leak');
    });

    it('should show clear button when query is not empty', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({ query: 'test query' }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: '' });
        expect(clearButton).toBeInTheDocument();
      });
    });

    it('should clear query when clear button is clicked', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({ query: 'test query' }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the X button (clear button)
      const buttons = screen.getAllByRole('button');
      const clearButton = buttons.find(btn => btn.querySelector('svg'));

      if (clearButton) {
        await user.click(clearButton);
      }

      expect(mockSetQuery).toHaveBeenCalledWith('');
      expect(mockClearResults).toHaveBeenCalled();
    });

    it('should trigger search on Search button click', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({ query: 'test query' }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(mockSearch).toHaveBeenCalled();
    });

    it('should disable search button when query is empty', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });
  });

  describe('Keyboard Navigation', () => {
    const mockResults = [
      {
        id: '1',
        entityType: 'rfi' as const,
        title: 'RFI #1 - Test RFI',
        description: 'Test description',
        projectName: 'Test Project',
        createdAt: '2024-01-01',
        matchedTerms: ['test'],
        relevanceScore: 95,
        url: '/rfis/1',
      },
      {
        id: '2',
        entityType: 'submittal' as const,
        title: 'Submittal #2 - Test Submittal',
        description: 'Test submittal description',
        projectName: 'Test Project',
        createdAt: '2024-01-02',
        matchedTerms: ['test'],
        relevanceScore: 90,
        url: '/submittals/2',
      },
    ];

    it('should navigate down with ArrowDown key', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          results: mockResults,
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');

      // Press ArrowDown
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // First result should be selected (visually this would have bg-primary-50 class)
      const firstResult = screen.getByText('RFI #1 - Test RFI');
      expect(firstResult).toBeInTheDocument();
    });

    it('should navigate up with ArrowUp key', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          results: mockResults,
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');

      // Navigate down twice
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Navigate up once
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      // First result should be selected again
      const firstResult = screen.getByText('RFI #1 - Test RFI');
      expect(firstResult).toBeInTheDocument();
    });

    it('should select result on Enter key when result is selected', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          results: mockResults,
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');

      // Navigate to first result and press Enter
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith('/rfis/1');
    });

    it('should trigger search on Enter when no result is selected', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({ query: 'test query' }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSearch).toHaveBeenCalled();
    });

    it('should close dialog on Escape key', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should clear results on Escape when has searched', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          hasSearched: true,
          results: mockResults,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search across all items...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockClearResults).toHaveBeenCalled();
      expect(mockSetQuery).toHaveBeenCalledWith('');
    });
  });

  describe('Entity Filters', () => {
    it('should show filters panel when filter button is clicked', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Should show all 11 entity type filters
      expect(screen.getByText('RFIs')).toBeInTheDocument();
      expect(screen.getByText('Submittals')).toBeInTheDocument();
      expect(screen.getByText('Daily Reports')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Punch Items')).toBeInTheDocument();
      expect(screen.getByText('Change Orders')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Meetings')).toBeInTheDocument();
      expect(screen.getByText('Inspections')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('should toggle entity filter when clicked', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Click RFI filter
      const rfiFilter = screen.getByRole('button', { name: /rfis/i });
      await user.click(rfiFilter);

      expect(mockSetEntityFilters).toHaveBeenCalled();
    });

    it('should show filter count badge when filters are active', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          entityFilters: ['rfi', 'submittal', 'document'] as any,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('AI Expansion Toggle', () => {
    it('should show AI expansion toggle button', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /ai expand/i })).toBeInTheDocument();
    });

    it('should toggle AI expansion when clicked', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai expand/i });
      await user.click(aiButton);

      expect(mockSetExpansionEnabled).toHaveBeenCalled();
    });

    it('should show correct title based on expansion state', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({ expansionEnabled: true }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai expand/i });
      expect(aiButton).toHaveAttribute('title', expect.stringContaining('enabled'));
    });
  });

  describe('Recent Searches', () => {
    it('should show recent searches when no query and not searched', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          recentSearches: ['roof leak', 'HVAC submittal', 'safety report'],
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });

      expect(screen.getByText('roof leak')).toBeInTheDocument();
      expect(screen.getByText('HVAC submittal')).toBeInTheDocument();
      expect(screen.getByText('safety report')).toBeInTheDocument();
    });

    it('should select recent search when clicked', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          recentSearches: ['roof leak'],
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });

      const recentSearch = screen.getByRole('button', { name: /roof leak/i });
      await user.click(recentSearch);

      expect(mockSetQuery).toHaveBeenCalledWith('roof leak');
      expect(mockSearch).toHaveBeenCalled();
    });

    it('should clear recent searches when clear button is clicked', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          recentSearches: ['roof leak', 'HVAC submittal'],
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockClearRecentSearches).toHaveBeenCalled();
    });

    it('should limit recent searches to 5 items', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          recentSearches: ['search1', 'search2', 'search3', 'search4', 'search5', 'search6'],
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });

      // Should only show first 5
      expect(screen.getByText('search1')).toBeInTheDocument();
      expect(screen.getByText('search5')).toBeInTheDocument();
      expect(screen.queryByText('search6')).not.toBeInTheDocument();
    });
  });

  describe('Search Results', () => {
    const mockResults = [
      {
        id: '1',
        entityType: 'rfi' as const,
        title: 'RFI #1 - Roof Leak Investigation',
        description: 'Investigate water infiltration on roof section A',
        number: 'RFI-001',
        status: 'Open',
        projectName: 'Office Building',
        createdAt: '2024-01-15',
        matchedTerms: ['roof', 'leak'],
        relevanceScore: 95,
        url: '/rfis/1',
      },
      {
        id: '2',
        entityType: 'submittal' as const,
        title: 'Submittal #2 - HVAC Equipment',
        description: 'Air handling unit specifications',
        number: 'SUB-002',
        status: 'Approved',
        projectName: 'Office Building',
        createdAt: '2024-01-16',
        matchedTerms: ['hvac'],
        relevanceScore: 85,
        url: '/submittals/2',
      },
    ];

    it('should display search results', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof leak',
          results: mockResults,
          hasSearched: true,
          totalResults: 2,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('RFI #1 - Roof Leak Investigation')).toBeInTheDocument();
      });

      expect(screen.getByText('Submittal #2 - HVAC Equipment')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should highlight search terms in results', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof',
          results: mockResults,
          expandedTerms: ['roof', 'leak'],
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The highlighted terms would have <mark> elements, check for the text
      expect(screen.getByText(/Roof/)).toBeInTheDocument();
    });

    it('should navigate to result page when clicked', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof',
          results: mockResults,
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('RFI #1 - Roof Leak Investigation')).toBeInTheDocument();
      });

      const result = screen.getByRole('button', { name: /RFI #1 - Roof Leak Investigation/i });
      await user.click(result);

      expect(mockNavigate).toHaveBeenCalledWith('/rfis/1');
    });

    it('should call onResultSelect callback if provided', async () => {
      const onResultSelect = vi.fn();

      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof',
          results: mockResults,
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar onResultSelect={onResultSelect} />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('RFI #1 - Roof Leak Investigation')).toBeInTheDocument();
      });

      const result = screen.getByRole('button', { name: /RFI #1 - Roof Leak Investigation/i });
      await user.click(result);

      expect(onResultSelect).toHaveBeenCalledWith(mockResults[0]);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show result count and timing in footer', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof',
          results: mockResults,
          hasSearched: true,
          totalResults: 2,
          searchTimeMs: 125,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/2 results/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/125ms/i)).toBeInTheDocument();
    });

    it('should show expanded terms in footer', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'roof',
          results: mockResults,
          hasSearched: true,
          expandedTerms: ['roof', 'leak', 'waterproofing', 'membrane'],
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/Searched:/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/roof, leak, waterproofing/i)).toBeInTheDocument();
      expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when searching', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          isLoading: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Loading spinner should be visible (svg with data-testid="icon")
      const icons = screen.getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show skeleton loaders while loading', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          isLoading: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it('should disable search button while loading', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          isLoading: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        const searchButton = screen.getByRole('button', { name: /search/i });
        expect(searchButton).toBeDisabled();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when search fails', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'test',
          error: new Error('Search service unavailable'),
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText('Search service unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no results found', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          query: 'nonexistent query',
          results: [],
          hasSearched: true,
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/No results found for "nonexistent query"/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Try different keywords or remove filters/i)).toBeInTheDocument();
    });
  });

  describe('Rate Limiting', () => {
    it('should show rate limit information', async () => {
      vi.spyOn(useSemanticSearchModule, 'useSemanticSearch').mockReturnValue(
        createMockHookReturn({
          rateLimit: { remaining: 25, limit: 50, resetAt: new Date() },
        }) as any
      );

      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/25\/50 searches remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByRole('dialog')).toHaveAccessibleName();
    });

    it('should have keyboard hints visible', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/enter/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/up/i)).toBeInTheDocument();
      expect(screen.getByText(/down/i)).toBeInTheDocument();
      expect(screen.getByText(/esc/i)).toBeInTheDocument();
    });

    it('should maintain focus management', async () => {
      render(<GlobalSearchBar />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Search across all items...');
        expect(input).toHaveFocus();
      });
    });
  });

  describe('Project Filter', () => {
    it('should pass initial project ID to search hook', () => {
      const projectId = 'project-123';
      render(<GlobalSearchBar projectId={projectId} />);

      expect(useSemanticSearchModule.useSemanticSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultProjectId: projectId,
        })
      );
    });
  });
});
