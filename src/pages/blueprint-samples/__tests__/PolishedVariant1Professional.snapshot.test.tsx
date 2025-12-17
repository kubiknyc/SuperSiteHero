/**
 * Snapshot Tests for PolishedVariant1Professional
 *
 * Tests DOM structure stability across:
 * - Different viewport sizes
 * - Theme variations (light/dark)
 * - Component structure integrity
 * - ARIA attribute consistency
 *
 * Run: npm run test -- PolishedVariant1Professional.snapshot.test.tsx
 * Update snapshots: npm run test -- -u PolishedVariant1Professional.snapshot.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PolishedVariant1Professional from '../PolishedVariant1Professional';

describe('PolishedVariant1Professional - Snapshots', () => {
  // Store original matchMedia
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const renderComponent = (darkMode = false) => {
    // Mock matchMedia for theme detection
    window.matchMedia = ((query: string) => ({
      matches: darkMode ? query === '(prefers-color-scheme: dark)' : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    })) as typeof window.matchMedia;

    return render(
      <BrowserRouter>
        <PolishedVariant1Professional />
      </BrowserRouter>
    );
  };

  const mockViewport = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });

    window.matchMedia = ((query: string) => {
      // Parse width from media query
      const matches = query.match(/min-width:\s*(\d+)px/);
      const minWidth = matches ? parseInt(matches[1]) : 0;

      return {
        matches: width >= minWidth,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
    }) as typeof window.matchMedia;
  };

  describe('Light Mode Snapshots', () => {
    it('should match snapshot for light mode - mobile viewport (375px)', () => {
      mockViewport(375);
      const { container } = renderComponent(false);
      expect(container).toMatchSnapshot('light-mode-mobile-375px');
    });

    it('should match snapshot for light mode - tablet viewport (768px)', () => {
      mockViewport(768);
      const { container } = renderComponent(false);
      expect(container).toMatchSnapshot('light-mode-tablet-768px');
    });

    it('should match snapshot for light mode - desktop viewport (1024px)', () => {
      mockViewport(1024);
      const { container } = renderComponent(false);
      expect(container).toMatchSnapshot('light-mode-desktop-1024px');
    });

    it('should match snapshot for light mode - wide viewport (1536px)', () => {
      mockViewport(1536);
      const { container } = renderComponent(false);
      expect(container).toMatchSnapshot('light-mode-wide-1536px');
    });
  });

  describe('Dark Mode Snapshots', () => {
    it('should match snapshot for dark mode - mobile viewport (375px)', () => {
      mockViewport(375);
      const { container } = renderComponent(true);
      expect(container).toMatchSnapshot('dark-mode-mobile-375px');
    });

    it('should match snapshot for dark mode - tablet viewport (768px)', () => {
      mockViewport(768);
      const { container } = renderComponent(true);
      expect(container).toMatchSnapshot('dark-mode-tablet-768px');
    });

    it('should match snapshot for dark mode - desktop viewport (1024px)', () => {
      mockViewport(1024);
      const { container } = renderComponent(true);
      expect(container).toMatchSnapshot('dark-mode-desktop-1024px');
    });

    it('should match snapshot for dark mode - wide viewport (1536px)', () => {
      mockViewport(1536);
      const { container } = renderComponent(true);
      expect(container).toMatchSnapshot('dark-mode-wide-1536px');
    });
  });

  describe('Component Structure Snapshots', () => {
    it('should match snapshot for complete component tree', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toMatchSnapshot('complete-component-tree');
    });

    it('should match snapshot for header section only', () => {
      const { container } = renderComponent();
      const header = container.querySelector('header');
      expect(header).toMatchSnapshot('header-section');
    });

    it('should match snapshot for stat cards grid', () => {
      const { container } = renderComponent();
      const statsGrid = container.querySelector('.grid');
      expect(statsGrid).toMatchSnapshot('stat-cards-grid');
    });

    it('should match snapshot for projects section', () => {
      const { container } = renderComponent();
      const sections = container.querySelectorAll('section');
      const projectsSection = Array.from(sections).find(section =>
        section.querySelector('h2')?.textContent?.includes('Active Projects')
      );
      expect(projectsSection).toMatchSnapshot('projects-section');
    });

    it('should match snapshot for activities section', () => {
      const { container } = renderComponent();
      const sections = container.querySelectorAll('section');
      const activitiesSection = Array.from(sections).find(section =>
        section.querySelector('h2')?.textContent?.includes('Recent Activity')
      );
      expect(activitiesSection).toMatchSnapshot('activities-section');
    });
  });

  describe('ARIA Attributes Snapshots', () => {
    it('should match snapshot for all ARIA-labeled elements', () => {
      const { container } = renderComponent();
      const ariaElements = container.querySelectorAll('[aria-label], [aria-labelledby], [role]');
      const ariaStructure = Array.from(ariaElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
      }));
      expect(ariaStructure).toMatchSnapshot('aria-attributes-structure');
    });

    it('should match snapshot for semantic HTML structure', () => {
      const { container } = renderComponent();
      const semanticElements = container.querySelectorAll(
        'header, main, section, article, nav, aside, time'
      );
      const semanticStructure = Array.from(semanticElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        className: el.className,
      }));
      expect(semanticStructure).toMatchSnapshot('semantic-html-structure');
    });

    it('should match snapshot for all button elements', () => {
      const { container } = renderComponent();
      const buttons = container.querySelectorAll('button');
      const buttonStructure = Array.from(buttons).map(button => ({
        ariaLabel: button.getAttribute('aria-label'),
        type: button.getAttribute('type'),
        className: button.className,
        hasText: button.textContent ? button.textContent.trim().length > 0 : false,
      }));
      expect(buttonStructure).toMatchSnapshot('button-elements-structure');
    });

    it('should match snapshot for all link elements', () => {
      const { container } = renderComponent();
      const links = container.querySelectorAll('a');
      const linkStructure = Array.from(links).map(link => ({
        href: link.getAttribute('href'),
        ariaLabel: link.getAttribute('aria-label'),
        className: link.className,
        hasText: link.textContent ? link.textContent.trim().length > 0 : false,
      }));
      expect(linkStructure).toMatchSnapshot('link-elements-structure');
    });
  });

  describe('Data Display Snapshots', () => {
    it('should match snapshot for stat card data structure', () => {
      const { container } = renderComponent();
      const statCards = container.querySelectorAll('[role="button"]');
      const statData = Array.from(statCards).slice(0, 4).map(card => {
        const title = card.querySelector('h3')?.textContent || '';
        const value = card.querySelector('[class*="text-3xl"]')?.textContent || '';
        const subtitle = card.querySelector('[class*="text-sm"]')?.textContent || '';
        const change = card.querySelector('[class*="text-emerald"], [class*="text-green"]')?.textContent || '';

        return {
          title: title.trim(),
          value: value.trim(),
          subtitle: subtitle.trim(),
          change: change.trim(),
        };
      });
      expect(statData).toMatchSnapshot('stat-cards-data');
    });

    it('should match snapshot for project cards data structure', () => {
      const { container } = renderComponent();
      const projectCards = container.querySelectorAll('article');
      // First 3 articles should be projects
      const projectData = Array.from(projectCards).slice(0, 3).map(card => {
        const title = card.querySelector('h3')?.textContent || '';
        const status = card.querySelector('[class*="inline-flex items-center"]')?.textContent || '';
        const time = card.querySelector('time')?.textContent || '';

        return {
          title: title.trim(),
          status: status.trim(),
          time: time.trim(),
        };
      });
      expect(projectData).toMatchSnapshot('project-cards-data');
    });

    it('should match snapshot for activity items data structure', () => {
      const { container } = renderComponent();
      const activityCards = container.querySelectorAll('article');
      // Last 3 articles should be activities
      const activityData = Array.from(activityCards).slice(-3).map(card => {
        const user = card.querySelector('[class*="font-medium"]')?.textContent || '';
        const action = card.querySelector('p')?.textContent || '';
        const time = card.querySelector('time')?.textContent || '';

        return {
          user: user.trim(),
          action: action.trim(),
          time: time.trim(),
        };
      });
      expect(activityData).toMatchSnapshot('activity-items-data');
    });
  });

  describe('CSS Class Structure Snapshots', () => {
    it('should match snapshot for grid and layout classes', () => {
      const { container } = renderComponent();
      const layoutElements = container.querySelectorAll('[class*="grid"], [class*="flex"]');
      const layoutClasses = Array.from(layoutElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        gridClasses: Array.from(el.classList).filter(c => c.includes('grid')),
        flexClasses: Array.from(el.classList).filter(c => c.includes('flex')),
        gapClasses: Array.from(el.classList).filter(c => c.includes('gap')),
      }));
      expect(layoutClasses).toMatchSnapshot('layout-classes-structure');
    });

    it('should match snapshot for responsive classes', () => {
      const { container } = renderComponent();
      const responsiveElements = container.querySelectorAll(
        '[class*="sm:"], [class*="md:"], [class*="lg:"], [class*="xl:"]'
      );
      const responsiveClasses = Array.from(responsiveElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        smClasses: Array.from(el.classList).filter(c => c.startsWith('sm:')),
        mdClasses: Array.from(el.classList).filter(c => c.startsWith('md:')),
        lgClasses: Array.from(el.classList).filter(c => c.startsWith('lg:')),
        xlClasses: Array.from(el.classList).filter(c => c.startsWith('xl:')),
      }));
      expect(responsiveClasses).toMatchSnapshot('responsive-classes-structure');
    });

    it('should match snapshot for color scheme classes', () => {
      const { container } = renderComponent();
      const colorElements = container.querySelectorAll(
        '[class*="dark:"], [class*="text-"], [class*="bg-"], [class*="border-"]'
      );
      const colorClasses = Array.from(colorElements).slice(0, 20).map(el => ({
        tag: el.tagName.toLowerCase(),
        darkClasses: Array.from(el.classList).filter(c => c.startsWith('dark:')),
        textClasses: Array.from(el.classList).filter(c => c.startsWith('text-')),
        bgClasses: Array.from(el.classList).filter(c => c.startsWith('bg-')),
        borderClasses: Array.from(el.classList).filter(c => c.startsWith('border-')),
      }));
      expect(colorClasses).toMatchSnapshot('color-scheme-classes');
    });
  });

  describe('Interactive Elements Snapshots', () => {
    it('should match snapshot for all focusable elements', () => {
      const { container } = renderComponent();
      const focusable = container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const focusableStructure = Array.from(focusable).map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        tabIndex: el.getAttribute('tabindex'),
      }));
      expect(focusableStructure).toMatchSnapshot('focusable-elements');
    });

    it('should match snapshot for hover-enabled elements', () => {
      const { container } = renderComponent();
      const hoverElements = container.querySelectorAll('[class*="hover:"]');
      const hoverStructure = Array.from(hoverElements).slice(0, 15).map(el => ({
        tag: el.tagName.toLowerCase(),
        hoverClasses: Array.from(el.classList).filter(c => c.startsWith('hover:')),
        transitionClasses: Array.from(el.classList).filter(c => c.includes('transition')),
      }));
      expect(hoverStructure).toMatchSnapshot('hover-elements-structure');
    });

    it('should match snapshot for transition and animation classes', () => {
      const { container } = renderComponent();
      const animatedElements = container.querySelectorAll(
        '[class*="transition"], [class*="duration"], [class*="ease"]'
      );
      const animationStructure = Array.from(animatedElements).slice(0, 15).map(el => ({
        tag: el.tagName.toLowerCase(),
        transitionClasses: Array.from(el.classList).filter(c =>
          c.includes('transition') || c.includes('duration') || c.includes('ease')
        ),
      }));
      expect(animationStructure).toMatchSnapshot('animation-classes');
    });
  });

  describe('Edge Case Snapshots', () => {
    it('should match snapshot when viewport is very narrow (280px)', () => {
      mockViewport(280);
      const { container } = renderComponent();
      expect(container).toMatchSnapshot('edge-case-very-narrow-280px');
    });

    it('should match snapshot when viewport is very wide (2560px)', () => {
      mockViewport(2560);
      const { container } = renderComponent();
      expect(container).toMatchSnapshot('edge-case-very-wide-2560px');
    });

    it('should match snapshot for component with empty className', () => {
      const { container } = renderComponent();
      const elementsWithoutClass = container.querySelectorAll(':not([class])');
      const structure = Array.from(elementsWithoutClass).slice(0, 10).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        role: el.getAttribute('role'),
      }));
      expect(structure).toMatchSnapshot('elements-without-classes');
    });
  });

  describe('Typography Snapshots', () => {
    it('should match snapshot for heading hierarchy', () => {
      const { container } = renderComponent();
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const headingStructure = Array.from(headings).map(heading => ({
        level: heading.tagName.toLowerCase(),
        text: heading.textContent?.trim() || '',
        classes: Array.from(heading.classList).filter(c =>
          c.includes('text-') || c.includes('font-')
        ),
      }));
      expect(headingStructure).toMatchSnapshot('heading-hierarchy');
    });

    it('should match snapshot for text size classes', () => {
      const { container } = renderComponent();
      const textElements = container.querySelectorAll('[class*="text-"]');
      const textSizes = Array.from(textElements).slice(0, 20).map(el => ({
        tag: el.tagName.toLowerCase(),
        sizeClasses: Array.from(el.classList).filter(c =>
          c.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/)
        ),
      }));
      expect(textSizes).toMatchSnapshot('text-size-classes');
    });

    it('should match snapshot for font weight classes', () => {
      const { container } = renderComponent();
      const fontElements = container.querySelectorAll('[class*="font-"]');
      const fontWeights = Array.from(fontElements).slice(0, 20).map(el => ({
        tag: el.tagName.toLowerCase(),
        weightClasses: Array.from(el.classList).filter(c =>
          c.match(/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/)
        ),
      }));
      expect(fontWeights).toMatchSnapshot('font-weight-classes');
    });
  });

  describe('Spacing Snapshots', () => {
    it('should match snapshot for padding classes', () => {
      const { container } = renderComponent();
      const paddingElements = container.querySelectorAll('[class*="p-"], [class*="px-"], [class*="py-"]');
      const paddingStructure = Array.from(paddingElements).slice(0, 15).map(el => ({
        tag: el.tagName.toLowerCase(),
        paddingClasses: Array.from(el.classList).filter(c =>
          c.match(/^p(x|y|t|b|l|r)?-\d+$/)
        ),
      }));
      expect(paddingStructure).toMatchSnapshot('padding-classes');
    });

    it('should match snapshot for margin classes', () => {
      const { container } = renderComponent();
      const marginElements = container.querySelectorAll('[class*="m-"], [class*="mx-"], [class*="my-"]');
      const marginStructure = Array.from(marginElements).slice(0, 15).map(el => ({
        tag: el.tagName.toLowerCase(),
        marginClasses: Array.from(el.classList).filter(c =>
          c.match(/^m(x|y|t|b|l|r)?-\d+$/)
        ),
      }));
      expect(marginStructure).toMatchSnapshot('margin-classes');
    });

    it('should match snapshot for gap classes in grids', () => {
      const { container } = renderComponent();
      const gapElements = container.querySelectorAll('[class*="gap-"]');
      const gapStructure = Array.from(gapElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        gapClasses: Array.from(el.classList).filter(c => c.startsWith('gap-')),
        gridClasses: Array.from(el.classList).filter(c => c.includes('grid')),
      }));
      expect(gapStructure).toMatchSnapshot('gap-classes');
    });
  });
});
