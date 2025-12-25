/**
 * Component Tests for SubmittalStatusBadge
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/__tests__/helpers';
import { SubmittalStatusBadge } from '../SubmittalStatusBadge';

describe('SubmittalStatusBadge', () => {
  describe('Status Display', () => {
    it('should render draft status', () => {
      render(<SubmittalStatusBadge status="draft" />);

      const badge = screen.getByText('Draft');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-300');
    });

    it('should render submitted status', () => {
      render(<SubmittalStatusBadge status="submitted" />);

      const badge = screen.getByText('Submitted');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-300');
    });

    it('should render under_review status', () => {
      render(<SubmittalStatusBadge status="under_review" />);

      const badge = screen.getByText('Under Review');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
    });

    it('should render approved status', () => {
      render(<SubmittalStatusBadge status="approved" />);

      const badge = screen.getByText('Approved');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-600', 'text-white', 'border-green-700');
    });

    it('should render rejected status', () => {
      render(<SubmittalStatusBadge status="rejected" />);

      const badge = screen.getByText('Rejected');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300');
    });

    it('should render resubmit_required status', () => {
      render(<SubmittalStatusBadge status="resubmit_required" />);

      const badge = screen.getByText('Resubmit Required');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800', 'border-orange-300');
    });
  });

  describe('Unknown Status', () => {
    it('should fall back to draft styling for unknown status', () => {
      render(<SubmittalStatusBadge status="unknown_status" />);

      const badge = screen.getByText('unknown_status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-300');
    });

    it('should display unknown status text as-is', () => {
      render(<SubmittalStatusBadge status="custom_status" />);

      expect(screen.getByText('custom_status')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base badge styles', () => {
      render(<SubmittalStatusBadge status="draft" />);

      const badge = screen.getByText('Draft');
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-md',
        'border',
        'px-2.5',
        'py-0.5',
        'text-xs',
        'font-semibold'
      );
    });

    it('should accept custom className', () => {
      render(<SubmittalStatusBadge status="approved" className="custom-class" />);

      const badge = screen.getByText('Approved');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge custom className with default styles', () => {
      render(<SubmittalStatusBadge status="approved" className="ml-2" />);

      const badge = screen.getByText('Approved');
      expect(badge).toHaveClass('ml-2', 'bg-green-600', 'text-white');
    });
  });

  describe('Accessibility', () => {
    it('should render as a span element', () => {
      const { container } = render(<SubmittalStatusBadge status="approved" />);

      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('should have readable text', () => {
      render(<SubmittalStatusBadge status="approved" />);

      const badge = screen.getByText('Approved');
      expect(badge.textContent).toBe('Approved');
    });
  });

  describe('Status Color Mapping', () => {
    const statusTests = [
      { status: 'draft', color: 'gray', label: 'Draft' },
      { status: 'submitted', color: 'blue', label: 'Submitted' },
      { status: 'under_review', color: 'yellow', label: 'Under Review' },
      { status: 'approved', color: 'green', label: 'Approved' },
      { status: 'rejected', color: 'red', label: 'Rejected' },
      { status: 'resubmit_required', color: 'orange', label: 'Resubmit Required' },
    ];

    statusTests.forEach(({ status, color, label }) => {
      it(`should apply ${color} color scheme for ${status} status`, () => {
        render(<SubmittalStatusBadge status={status} />);

        const badge = screen.getByText(label);
        expect(badge).toBeInTheDocument();

        // Verify color is in the class name
        const classes = badge.className;
        expect(classes).toContain(color);
      });
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent size across all statuses', () => {
      const { rerender } = render(<SubmittalStatusBadge status="draft" />);
      const draftBadge = screen.getByText('Draft');
      const draftClasses = draftBadge.className;

      rerender(<SubmittalStatusBadge status="approved" />);
      const approvedBadge = screen.getByText('Approved');
      const approvedClasses = approvedBadge.className;

      // Both should have same size classes
      expect(draftClasses).toContain('text-xs');
      expect(approvedClasses).toContain('text-xs');
      expect(draftClasses).toContain('px-2.5');
      expect(approvedClasses).toContain('px-2.5');
    });

    it('should have border for all statuses', () => {
      const statuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'resubmit_required'];

      statuses.forEach(status => {
        const { rerender } = render(<SubmittalStatusBadge status={status} />);
        const badge = screen.getByText(/.*/);
        expect(badge).toHaveClass('border');
        rerender(<></>);
      });
    });
  });
});
