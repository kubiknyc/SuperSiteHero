import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncBadge, SyncBadgeList } from './SyncBadge';

describe('SyncBadge', () => {
  describe('Status Rendering', () => {
    it('should render synced status with check icon', () => {
      render(<SyncBadge status="synced" />);

      const badge = screen.getByTitle('Synced');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-green-600');
    });

    it('should render pending status', () => {
      render(<SyncBadge status="pending" />);

      const badge = screen.getByTitle('Pending sync');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-yellow-600');
    });

    it('should render syncing status with spinning icon', () => {
      render(<SyncBadge status="syncing" />);

      const badge = screen.getByTitle('Syncing...');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-blue-600');

      // Check for spinning animation
      const icon = badge.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });

    it('should render error status', () => {
      render(<SyncBadge status="error" />);

      const badge = screen.getByTitle('Sync failed');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-red-600');
    });

    it('should render conflict status', () => {
      render(<SyncBadge status="conflict" />);

      const badge = screen.getByTitle('Conflict');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-orange-600');
    });
  });

  describe('Label Display', () => {
    it('should show label when showLabel is true', () => {
      render(<SyncBadge status="synced" showLabel={true} />);

      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<SyncBadge status="synced" />);

      expect(screen.queryByText('Synced')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(<SyncBadge status="synced" size="sm" showLabel={true} />);

      const badge = screen.getByTitle('Synced');
      expect(badge).toHaveClass('px-1.5', 'py-0.5');
    });

    it('should apply medium size classes', () => {
      render(<SyncBadge status="synced" size="md" showLabel={true} />);

      const badge = screen.getByTitle('Synced');
      expect(badge).toHaveClass('px-2', 'py-1');
    });

    it('should apply large size classes', () => {
      render(<SyncBadge status="synced" size="lg" showLabel={true} />);

      const badge = screen.getByTitle('Synced');
      expect(badge).toHaveClass('px-3', 'py-1.5');
    });
  });

  describe('Error Messages', () => {
    it('should show error message in tooltip', () => {
      render(<SyncBadge status="error" errorMessage="Network timeout" />);

      const badge = screen.getByTitle('Network timeout');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      render(<SyncBadge status="synced" className="my-custom-class" />);

      const badge = screen.getByTitle('Synced');
      expect(badge).toHaveClass('my-custom-class');
    });
  });
});

describe('SyncBadgeList', () => {
  it('should show pending count', () => {
    const items = [
      { id: '1', syncStatus: 'pending' as const },
      { id: '2', syncStatus: 'pending' as const },
      { id: '3', syncStatus: 'synced' as const },
    ];

    render(<SyncBadgeList items={items} />);

    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('should show error count', () => {
    const items = [
      { id: '1', syncStatus: 'error' as const },
      { id: '2', syncStatus: 'error' as const },
      { id: '3', syncStatus: 'error' as const },
    ];

    render(<SyncBadgeList items={items} />);

    expect(screen.getByText('3 failed')).toBeInTheDocument();
  });

  it('should show conflict count', () => {
    const items = [
      { id: '1', syncStatus: 'conflict' as const },
      { id: '2', syncStatus: 'synced' as const },
    ];

    render(<SyncBadgeList items={items} />);

    expect(screen.getByText('1 conflicts')).toBeInTheDocument();
  });

  it('should show multiple status types', () => {
    const items = [
      { id: '1', syncStatus: 'pending' as const },
      { id: '2', syncStatus: 'error' as const },
      { id: '3', syncStatus: 'conflict' as const },
    ];

    render(<SyncBadgeList items={items} />);

    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('1 conflicts')).toBeInTheDocument();
  });

  it('should not render when no items', () => {
    const { container } = render(<SyncBadgeList items={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not show counts for zero items', () => {
    const items = [
      { id: '1', syncStatus: 'synced' as const },
      { id: '2', syncStatus: 'synced' as const },
    ];

    render(<SyncBadgeList items={items} />);

    expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/conflicts/)).not.toBeInTheDocument();
  });
});
