/**
 * GanttToolbar Component Tests
 * Tests for Gantt chart toolbar controls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttToolbar } from '../GanttToolbar';
import type { GanttZoomLevel } from '@/types/schedule';

// Default props factory
function createDefaultProps(overrides = {}) {
  return {
    zoomLevel: 'week' as GanttZoomLevel,
    onZoomChange: vi.fn(),
    onScrollToToday: vi.fn(),
    onRefresh: vi.fn(),
    onScrollLeft: vi.fn(),
    onScrollRight: vi.fn(),
    showCriticalPath: false,
    onToggleCriticalPath: vi.fn(),
    showDependencies: false,
    onToggleDependencies: vi.fn(),
    showMilestones: true,
    onToggleMilestones: vi.fn(),
    ...overrides,
  };
}

describe('GanttToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation Controls', () => {
    it('renders scroll left button', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const scrollLeftBtn = buttons.find((btn) => btn.title === 'Scroll left');
      expect(scrollLeftBtn).toBeDefined();
    });

    it('calls onScrollLeft when left button clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const scrollLeftBtn = buttons.find((btn) => btn.title === 'Scroll left');
      if (scrollLeftBtn) {fireEvent.click(scrollLeftBtn);}

      expect(props.onScrollLeft).toHaveBeenCalled();
    });

    it('calls onScrollRight when right button clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const scrollRightBtn = buttons.find((btn) => btn.title === 'Scroll right');
      if (scrollRightBtn) {fireEvent.click(scrollRightBtn);}

      expect(props.onScrollRight).toHaveBeenCalled();
    });

    it('renders Today button and calls onScrollToToday', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const todayBtn = screen.getByText('Today');
      fireEvent.click(todayBtn);

      expect(props.onScrollToToday).toHaveBeenCalled();
    });
  });

  describe('Zoom Controls', () => {
    it('displays current zoom level', () => {
      const props = createDefaultProps({ zoomLevel: 'week' });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('week')).toBeInTheDocument();
    });

    it('displays day zoom level', () => {
      const props = createDefaultProps({ zoomLevel: 'day' });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('day')).toBeInTheDocument();
    });

    it('displays month zoom level', () => {
      const props = createDefaultProps({ zoomLevel: 'month' });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('month')).toBeInTheDocument();
    });

    it('calls onZoomChange with day level when zooming in from week', () => {
      const props = createDefaultProps({ zoomLevel: 'week' });
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const zoomInBtn = buttons.find((btn) => btn.title === 'Zoom in');
      if (zoomInBtn) {fireEvent.click(zoomInBtn);}

      expect(props.onZoomChange).toHaveBeenCalledWith('day');
    });

    it('calls onZoomChange with month level when zooming out from week', () => {
      const props = createDefaultProps({ zoomLevel: 'week' });
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const zoomOutBtn = buttons.find((btn) => btn.title === 'Zoom out');
      if (zoomOutBtn) {fireEvent.click(zoomOutBtn);}

      expect(props.onZoomChange).toHaveBeenCalledWith('month');
    });

    it('disables zoom in at day level', () => {
      const props = createDefaultProps({ zoomLevel: 'day' });
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const zoomInBtn = buttons.find((btn) => btn.title === 'Zoom in');

      expect(zoomInBtn).toHaveProperty('disabled', true);
    });

    it('disables zoom out at quarter level', () => {
      const props = createDefaultProps({ zoomLevel: 'quarter' });
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const zoomOutBtn = buttons.find((btn) => btn.title === 'Zoom out');

      expect(zoomOutBtn).toHaveProperty('disabled', true);
    });
  });

  describe('Refresh Control', () => {
    it('renders refresh button', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const refreshBtn = buttons.find((btn) => btn.title === 'Refresh data');
      expect(refreshBtn).toBeDefined();
    });

    it('calls onRefresh when clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const refreshBtn = buttons.find((btn) => btn.title === 'Refresh data');
      if (refreshBtn) {fireEvent.click(refreshBtn);}

      expect(props.onRefresh).toHaveBeenCalled();
    });

    it('disables refresh when loading', () => {
      const props = createDefaultProps({ isLoading: true });
      render(<GanttToolbar {...props} />);

      const buttons = screen.getAllByRole('button');
      const refreshBtn = buttons.find((btn) => btn.title === 'Refresh data');

      expect(refreshBtn).toHaveProperty('disabled', true);
    });
  });

  describe('Toggle Buttons', () => {
    it('renders Critical Path toggle', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('Critical Path')).toBeInTheDocument();
    });

    it('calls onToggleCriticalPath when clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      fireEvent.click(screen.getByText('Critical Path'));
      expect(props.onToggleCriticalPath).toHaveBeenCalled();
    });

    it('renders Dependencies toggle', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('Dependencies')).toBeInTheDocument();
    });

    it('calls onToggleDependencies when clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      fireEvent.click(screen.getByText('Dependencies'));
      expect(props.onToggleDependencies).toHaveBeenCalled();
    });

    it('renders Milestones toggle', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('Milestones')).toBeInTheDocument();
    });

    it('calls onToggleMilestones when clicked', () => {
      const props = createDefaultProps();
      render(<GanttToolbar {...props} />);

      fireEvent.click(screen.getByText('Milestones'));
      expect(props.onToggleMilestones).toHaveBeenCalled();
    });

    it('shows critical path badge count when enabled', () => {
      const props = createDefaultProps({
        showCriticalPath: true,
        criticalPathInfo: { tasksCount: 5, projectDuration: 120 },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Baseline Controls', () => {
    it('renders Baseline toggle when onToggleBaseline is provided', () => {
      const props = createDefaultProps({
        onToggleBaseline: vi.fn(),
        hasBaseline: true,
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('Baseline')).toBeInTheDocument();
    });

    it('disables Baseline toggle when no baseline exists', () => {
      const props = createDefaultProps({
        onToggleBaseline: vi.fn(),
        hasBaseline: false,
      });
      render(<GanttToolbar {...props} />);

      const baselineBtn = screen.getByText('Baseline').closest('button');
      expect(baselineBtn).toHaveProperty('disabled', true);
    });

    it('enables Baseline toggle when baseline exists', () => {
      const props = createDefaultProps({
        onToggleBaseline: vi.fn(),
        hasBaseline: true,
      });
      render(<GanttToolbar {...props} />);

      const baselineBtn = screen.getByText('Baseline').closest('button');
      expect(baselineBtn).toHaveProperty('disabled', false);
    });

    it('calls onToggleBaseline when clicked', () => {
      const onToggleBaseline = vi.fn();
      const props = createDefaultProps({
        onToggleBaseline,
        hasBaseline: true,
      });
      render(<GanttToolbar {...props} />);

      fireEvent.click(screen.getByText('Baseline'));
      expect(onToggleBaseline).toHaveBeenCalled();
    });
  });

  describe('Stats Display', () => {
    it('displays progress percentage', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 50,
          overdue_tasks: 5,
          critical_tasks: 10,
          overall_progress: 50,
        },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('displays task counts', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 50,
          overdue_tasks: 5,
          critical_tasks: 10,
          overall_progress: 50,
        },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('50/100')).toBeInTheDocument();
    });

    it('displays overdue badge when there are overdue tasks', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 50,
          overdue_tasks: 5,
          critical_tasks: 10,
          overall_progress: 50,
        },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('5 overdue')).toBeInTheDocument();
    });

    it('hides overdue badge when no overdue tasks', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 50,
          overdue_tasks: 0,
          critical_tasks: 10,
          overall_progress: 50,
        },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
    });

    it('displays critical tasks badge', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 50,
          overdue_tasks: 0,
          critical_tasks: 10,
          overall_progress: 50,
        },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('10 critical')).toBeInTheDocument();
    });

    it('displays project duration from critical path', () => {
      const props = createDefaultProps({
        criticalPathInfo: { tasksCount: 5, projectDuration: 120 },
      });
      render(<GanttToolbar {...props} />);

      expect(screen.getByText('120 days')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('renders menu trigger button', () => {
      const props = createDefaultProps({
        onSaveBaseline: vi.fn(),
      });
      render(<GanttToolbar {...props} />);

      // Find the menu button (last one with MoreVertical icon)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows Save Baseline option when onSaveBaseline is provided', async () => {
      const props = createDefaultProps({
        onSaveBaseline: vi.fn(),
      });
      render(<GanttToolbar {...props} />);

      // Find and click the dropdown trigger
      const buttons = screen.getAllByRole('button');
      const menuTrigger = buttons[buttons.length - 1]; // Last button is usually the dropdown
      fireEvent.click(menuTrigger);

      // Wait for menu to appear
      expect(screen.getByText('Save Baseline')).toBeInTheDocument();
    });

    it('shows Import option when onImport is provided', async () => {
      const props = createDefaultProps({
        onImport: vi.fn(),
      });
      render(<GanttToolbar {...props} />);

      // Find and click the dropdown trigger
      const buttons = screen.getAllByRole('button');
      const menuTrigger = buttons[buttons.length - 1];
      fireEvent.click(menuTrigger);

      expect(screen.getByText('Import from MS Project')).toBeInTheDocument();
    });

    it('shows Clear Baseline when hasBaseline is true', async () => {
      const props = createDefaultProps({
        onClearBaseline: vi.fn(),
        hasBaseline: true,
      });
      render(<GanttToolbar {...props} />);

      // Find and click the dropdown trigger
      const buttons = screen.getAllByRole('button');
      const menuTrigger = buttons[buttons.length - 1];
      fireEvent.click(menuTrigger);

      expect(screen.getByText('Clear Baseline')).toBeInTheDocument();
    });

    it('hides Clear Baseline when hasBaseline is false', async () => {
      const props = createDefaultProps({
        onClearBaseline: vi.fn(),
        hasBaseline: false,
      });
      render(<GanttToolbar {...props} />);

      // Find and click the dropdown trigger
      const buttons = screen.getAllByRole('button');
      const menuTrigger = buttons[buttons.length - 1];
      fireEvent.click(menuTrigger);

      expect(screen.queryByText('Clear Baseline')).not.toBeInTheDocument();
    });
  });

  describe('Progress Color Coding', () => {
    it('applies green styling for high progress (>= 75%)', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 80,
          overdue_tasks: 0,
          critical_tasks: 0,
          overall_progress: 80,
        },
      });
      render(<GanttToolbar {...props} />);

      const badge = screen.getByText('80%');
      expect(badge.className).toContain('bg-green-50');
    });

    it('applies blue styling for medium progress (>= 50%)', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 60,
          overdue_tasks: 0,
          critical_tasks: 0,
          overall_progress: 60,
        },
      });
      render(<GanttToolbar {...props} />);

      const badge = screen.getByText('60%');
      expect(badge.className).toContain('bg-blue-50');
    });

    it('applies yellow styling for low progress (>= 25%)', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 30,
          overdue_tasks: 0,
          critical_tasks: 0,
          overall_progress: 30,
        },
      });
      render(<GanttToolbar {...props} />);

      const badge = screen.getByText('30%');
      expect(badge.className).toContain('bg-yellow-50');
    });

    it('applies gray styling for very low progress (< 25%)', () => {
      const props = createDefaultProps({
        stats: {
          total_tasks: 100,
          completed_tasks: 10,
          overdue_tasks: 0,
          critical_tasks: 0,
          overall_progress: 10,
        },
      });
      render(<GanttToolbar {...props} />);

      const badge = screen.getByText('10%');
      expect(badge.className).toContain('bg-gray-50');
    });
  });
});
