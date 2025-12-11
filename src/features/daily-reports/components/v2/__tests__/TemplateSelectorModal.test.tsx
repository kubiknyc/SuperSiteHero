import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelectorModal } from '../TemplateSelectorModal';
import type { DailyReportTemplate } from '@/types/daily-reports-v2';

describe('TemplateSelectorModal', () => {
  const mockOnSelect = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockTemplates: DailyReportTemplate[] = [
    {
      id: 'template-1',
      user_id: 'user-1',
      project_id: 'proj-1',
      name: 'Standard Crew Template',
      description: 'Template for typical day with standard crew',
      is_default: true,
      workforce_template: [
        { company_name: 'ABC Electric', trade: 'Electrician', worker_count: 4 },
        { company_name: 'XYZ Plumbing', trade: 'Plumber', worker_count: 2 },
      ],
      equipment_template: [
        { equipment_type: 'Excavator', hours_used: 8 },
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'template-2',
      user_id: 'user-1',
      project_id: 'proj-1',
      name: 'Weekend Crew',
      description: 'Minimal crew for weekend work',
      is_default: false,
      workforce_template: [
        { company_name: 'ABC Electric', trade: 'Electrician', worker_count: 2 },
      ],
      equipment_template: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    },
    {
      id: 'template-3',
      user_id: 'user-1',
      project_id: 'proj-1',
      name: 'Equipment Only',
      description: 'Template with only equipment',
      is_default: false,
      workforce_template: [],
      equipment_template: [
        { equipment_type: 'Crane', hours_used: 8 },
        { equipment_type: 'Forklift', hours_used: 6 },
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-05T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Template')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search templates/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TemplateSelectorModal
        open={false}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText('Select Template')).not.toBeInTheDocument();
  });

  it('should display all templates', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Standard Crew Template')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    expect(screen.getByText('Equipment Only')).toBeInTheDocument();
  });

  it('should show correct title for workforce filter', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="workforce"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Workforce Template')).toBeInTheDocument();
  });

  it('should show correct title for equipment filter', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="equipment"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Equipment Template')).toBeInTheDocument();
  });

  it('should filter templates by search query', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search templates/i);
    await user.type(searchInput, 'Weekend');

    await waitFor(() => {
      expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
      expect(screen.queryByText('Standard Crew Template')).not.toBeInTheDocument();
    });
  });

  it('should filter templates by workforce type', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="workforce"
        onSelect={mockOnSelect}
      />
    );

    // Templates with workforce should be visible
    expect(screen.getByText('Standard Crew Template')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();

    // Template with only equipment should not be visible
    expect(screen.queryByText('Equipment Only')).not.toBeInTheDocument();
  });

  it('should filter templates by equipment type', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="equipment"
        onSelect={mockOnSelect}
      />
    );

    // Templates with equipment should be visible
    expect(screen.getByText('Standard Crew Template')).toBeInTheDocument();
    expect(screen.getByText('Equipment Only')).toBeInTheDocument();

    // Template without equipment should not be visible
    expect(screen.queryByText('Weekend Crew')).not.toBeInTheDocument();
  });

  it('should select a template when clicked', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    // Click on a template
    const templateButton = screen.getByText('Standard Crew Template').closest('button');
    await user.click(templateButton!);

    // Should show selection indicator
    expect(templateButton).toHaveClass('border-blue-500');
  });

  it('should call onSelect when Apply Template is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    // Select a template
    const templateButton = screen.getByText('Standard Crew Template').closest('button');
    await user.click(templateButton!);

    // Click Apply Template button
    const applyButton = screen.getByText('Apply Template');
    await user.click(applyButton);

    expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('should disable Apply Template when no template selected', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    const applyButton = screen.getByText('Apply Template');
    expect(applyButton).toBeDisabled();
  });

  it('should close modal when Cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show default badge for default templates', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('should show empty state when no templates match', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search templates/i);
    await user.type(searchInput, 'nonexistent template name');

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
    });
  });

  it('should show template preview when selected', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    // Select a template
    const templateButton = screen.getByText('Standard Crew Template').closest('button');
    await user.click(templateButton!);

    // Should show preview section
    expect(screen.getByText(/Template Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Workforce Entries/i)).toBeInTheDocument();
    expect(screen.getByText(/Equipment Entries/i)).toBeInTheDocument();
  });

  it('should show crew count in template stats', () => {
    render(
      <TemplateSelectorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        templates={mockTemplates}
        filterType="both"
        onSelect={mockOnSelect}
      />
    );

    // Standard Crew Template has 2 crews
    expect(screen.getByText('2 crews')).toBeInTheDocument();
  });
});
