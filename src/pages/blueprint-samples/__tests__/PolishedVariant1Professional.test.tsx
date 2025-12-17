/**
 * Unit Tests for PolishedVariant1Professional
 *
 * Tests component behavior using Vitest and React Testing Library:
 * - Component rendering
 * - Data display (stats, projects, activities)
 * - Heading hierarchy
 * - ARIA labels and accessibility
 * - Semantic HTML structure
 * - Interactive elements
 *
 * Run: npm test PolishedVariant1Professional.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PolishedVariant1Professional from '../PolishedVariant1Professional';

// Helper to render component with router context
const renderComponent = () => {
  return render(
    <BrowserRouter>
      <PolishedVariant1Professional />
    </BrowserRouter>
  );
};

describe('PolishedVariant1Professional', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      renderComponent();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should display the variant badge', () => {
      renderComponent();
      expect(screen.getByText(/VARIANT 1: PROFESSIONAL/i)).toBeInTheDocument();
    });

    it('should display welcome message with user name', () => {
      renderComponent();
      expect(screen.getByText(/Welcome back, John/i)).toBeInTheDocument();
    });
  });

  describe('Stat Cards', () => {
    it('should display all 4 stat cards', () => {
      renderComponent();

      // Check for all stat card labels
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      expect(screen.getByText('Open RFIs')).toBeInTheDocument();
    });

    it('should display stat values correctly', () => {
      renderComponent();

      // Values are rendered as text content
      expect(screen.getByText('12')).toBeInTheDocument(); // Active Projects
      expect(screen.getByText('48')).toBeInTheDocument(); // Team Members
      expect(screen.getByText('8')).toBeInTheDocument();  // Pending Reports
      expect(screen.getByText('23')).toBeInTheDocument(); // Open RFIs
    });

    it('should display stat targets', () => {
      renderComponent();

      // Targets are shown with "/ {target}" format
      expect(screen.getByText('/ 15')).toBeInTheDocument(); // Active Projects target
      expect(screen.getByText('/ 50')).toBeInTheDocument(); // Team Members target
      expect(screen.getByText('/ 0')).toBeInTheDocument();  // Pending Reports target (goal is 0)
    });

    it('should display trend indicators', () => {
      renderComponent();

      // Check for trend changes
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.getByText('+5')).toBeInTheDocument();
      expect(screen.getByText('-3')).toBeInTheDocument();
      expect(screen.getByText('+4')).toBeInTheDocument();
    });

    it('should have stat cards as interactive buttons', () => {
      renderComponent();

      // All stat cards should be buttons (4 total, plus 2 other buttons = 6)
      const allButtons = screen.getAllByRole('button');
      const statCardButtons = allButtons.filter(btn =>
        btn.getAttribute('aria-label')?.includes('out of')
      );
      expect(statCardButtons.length).toBe(4);
    });
  });

  describe('Heading Hierarchy', () => {
    it('should have exactly one h1 heading', () => {
      renderComponent();

      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements).toHaveLength(1);
      expect(h1Elements[0]).toHaveTextContent('Dashboard');
    });

    it('should have h2 headings for sections', () => {
      renderComponent();

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);

      // Check for specific section headings
      expect(screen.getByRole('heading', { name: 'Active Projects' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Recent Activity' })).toBeInTheDocument();
    });

    it('should have h3 headings for project names', () => {
      renderComponent();

      // Project names are h3 elements
      expect(screen.getByRole('heading', { level: 3, name: 'Downtown Tower' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Harbor Bridge' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Medical Center' })).toBeInTheDocument();
    });
  });

  describe('ARIA Labels and Accessibility', () => {
    it('should have proper ARIA label on back button', () => {
      renderComponent();

      const backButton = screen.getByLabelText('Back to Blueprint Variants');
      expect(backButton).toBeInTheDocument();
      expect(backButton.tagName).toBe('A'); // Should be a link
    });

    it('should have ARIA labels on stat cards with full context', () => {
      renderComponent();

      // Each stat card should have descriptive aria-label
      expect(screen.getByLabelText(/Active Projects: 12 out of 15/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Team Members: 48 out of 50/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Pending Reports: 8 out of 0/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Open RFIs: 23 out of 15/i)).toBeInTheDocument();
    });

    it('should have progress bars with proper ARIA attributes', () => {
      renderComponent();

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);

      // Check first stat card progress bar
      const statProgress = progressBars[0];
      expect(statProgress).toHaveAttribute('aria-valuenow');
      expect(statProgress).toHaveAttribute('aria-valuemin');
      expect(statProgress).toHaveAttribute('aria-valuemax');
    });

    it('should have proper region labels for sections', () => {
      renderComponent();

      const activeProjectsSection = screen.getByRole('region', { name: 'Active Projects' });
      const recentActivitySection = screen.getByRole('region', { name: 'Recent Activity' });

      expect(activeProjectsSection).toBeInTheDocument();
      expect(recentActivitySection).toBeInTheDocument();
    });

    it('should have accessible "View All" button', () => {
      renderComponent();

      const viewAllButton = screen.getByLabelText('View all projects');
      expect(viewAllButton).toBeInTheDocument();
      expect(viewAllButton.tagName).toBe('BUTTON');
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should have header with banner role', () => {
      renderComponent();

      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();
      expect(banner.tagName).toBe('HEADER');
    });

    it('should use section elements for major areas', () => {
      renderComponent();

      const sections = screen.getAllByRole('region');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should use article elements for project cards', () => {
      renderComponent();

      const articles = screen.getAllByRole('article');
      // 3 projects + 3 activities = 6 articles
      expect(articles.length).toBeGreaterThanOrEqual(6);
    });

    it('should use time elements with datetime attributes', () => {
      renderComponent();

      // Check for time elements (in projects and activities)
      const timeElements = document.querySelectorAll('time');
      expect(timeElements.length).toBeGreaterThan(0);

      // Each time element should have datetime attribute
      timeElements.forEach(timeEl => {
        expect(timeEl.getAttribute('datetime')).toBeTruthy();
      });
    });

    it('should use proper list semantics', () => {
      renderComponent();

      // Projects list
      const projectsList = screen.getByRole('list');
      expect(projectsList).toBeInTheDocument();

      // Activity feed
      const activityFeed = screen.getByRole('feed');
      expect(activityFeed).toBeInTheDocument();
    });
  });

  describe('Projects Data Rendering', () => {
    it('should display all project names', () => {
      renderComponent();

      expect(screen.getByText('Downtown Tower')).toBeInTheDocument();
      expect(screen.getByText('Harbor Bridge')).toBeInTheDocument();
      expect(screen.getByText('Medical Center')).toBeInTheDocument();
    });

    it('should display project status badges', () => {
      renderComponent();

      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText('At Risk')).toBeInTheDocument();
      expect(screen.getByText('Ahead')).toBeInTheDocument();
    });

    it('should display project progress percentages', () => {
      renderComponent();

      expect(screen.getByText('68%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('should display project due dates', () => {
      renderComponent();

      expect(screen.getByText('Mar 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Apr 22, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 28, 2024')).toBeInTheDocument();
    });

    it('should display project budget percentages', () => {
      renderComponent();

      expect(screen.getByText(/Budget: 92%/i)).toBeInTheDocument();
      expect(screen.getByText(/Budget: 88%/i)).toBeInTheDocument();
      expect(screen.getByText(/Budget: 96%/i)).toBeInTheDocument();
    });
  });

  describe('Recent Activity Rendering', () => {
    it('should display all activity users', () => {
      renderComponent();

      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Mike Chen')).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    });

    it('should display activity actions', () => {
      renderComponent();

      expect(screen.getByText('completed daily report')).toBeInTheDocument();
      expect(screen.getByText('uploaded 12 photos')).toBeInTheDocument();
      expect(screen.getByText('submitted RFI #156')).toBeInTheDocument();
    });

    it('should display activity timestamps', () => {
      renderComponent();

      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('4h ago')).toBeInTheDocument();
      expect(screen.getByText('5h ago')).toBeInTheDocument();
    });

    it('should display activity project associations', () => {
      renderComponent();

      // These appear multiple times (in projects and activities), so use getAllByText
      const downtownTower = screen.getAllByText('Downtown Tower');
      const harborBridge = screen.getAllByText('Harbor Bridge');
      const medicalCenter = screen.getAllByText('Medical Center');

      expect(downtownTower.length).toBeGreaterThan(0);
      expect(harborBridge.length).toBeGreaterThan(0);
      expect(medicalCenter.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation and Links', () => {
    it('should have a working back link', () => {
      renderComponent();

      const backLink = screen.getByLabelText('Back to Blueprint Variants');
      expect(backLink).toHaveAttribute('href');
      expect(backLink.getAttribute('href')).toContain('/blueprint-samples/variants');
    });

    it('should have clickable project cards', () => {
      renderComponent();

      const projectLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('aria-label')?.includes('View project')
      );

      expect(projectLinks.length).toBe(3);
      projectLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Interactive Elements', () => {
    it('should have all interactive elements with accessible names', () => {
      renderComponent();

      // Get all buttons
      const buttons = screen.getAllByRole('button');

      // Each button should have either aria-label or text content
      buttons.forEach(button => {
        const ariaLabel = button.getAttribute('aria-label');
        const textContent = button.textContent;

        expect(ariaLabel || textContent).toBeTruthy();
      });
    });

    it('should have all links with accessible names', () => {
      renderComponent();

      const links = screen.getAllByRole('link');

      // Each link should have either aria-label or text content
      links.forEach(link => {
        const ariaLabel = link.getAttribute('aria-label');
        const textContent = link.textContent;

        expect(ariaLabel || textContent).toBeTruthy();
      });
    });
  });
});
