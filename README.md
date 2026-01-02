# JobSight - Construction Management Platform

A comprehensive, offline-first construction field management platform designed specifically for construction superintendents and their teams.

## Overview

JobSight consolidates fragmented construction workflows (daily reports, RFIs, change orders, punch lists, safety tracking, etc.) into one unified system optimized for field use with robust offline capabilities.

## Features

### Core Platform (100% Complete)

#### ✅ **Authentication & Multi-tenancy**
- Secure login with role-based access, signup, password reset, MFA
- Company-based user approval system with admin workflow
- Multi-tenant architecture with Row Level Security (RLS)

#### ✅ **Project Management**
- Create, view, edit projects with full detail pages
- Project templates for quick setup
- Budget tracking with contingency management
- Project health scoring and analytics
- Presence tracking (see who's viewing)

#### ✅ **Daily Reports**
- Comprehensive field documentation
- Weather integration (Open-Meteo API with GPS)
- Workforce, equipment, deliveries, visitors sections
- Photo gallery with EXIF metadata extraction
- OSHA-compliant manpower tracking

#### ✅ **Document Management**
- Upload, view, organize with version control
- PDF viewing with markup tools (7 annotation types)
- Drawing register (AIA G810-style) with revision tracking
- Transmittal management
- ASI (Architect's Supplemental Instructions) tracking

#### ✅ **RFIs (Requests for Information)**
- Ball-in-court tracking with role assignment
- Response types (Answered, Clarification Needed, Design Change)
- RFI register with filtering and export
- Full audit trail with timestamps

#### ✅ **Submittals**
- CSI spec section tracking (MasterFormat codes)
- Lead time calculator (fabrication + review cycles)
- Approval codes (Approved, Approved as Noted, Revise & Resubmit, Rejected)
- Submittal register with status filtering

#### ✅ **Change Orders**
- Full PCO→CO lifecycle workflow
- Multi-level approval (internal + owner)
- Cost breakdown by line item
- Contingency tracking with visual health indicators
- Backup documentation attachments

#### ✅ **Tasks & Scheduling**
- Task creation, assignment, and tracking
- Gantt chart visualization with dependencies
- Look-ahead planning (3-week rolling view)
- Predecessor/successor relationships

#### ✅ **Punch Lists**
- Deficiency tracking by area and trade
- Before/after photo documentation
- Status management with responsibility assignment
- Floor plan location marking

#### ✅ **Checklists**
- Template builder with sections
- Field execution with photo support
- Digital signature capture
- EXIF metadata extraction from photos

#### ✅ **Safety Management**
- OSHA-compliant incident tracking
- OSHA 300 Log (Annual Summary)
- OSHA 300A Form (Summary of Injuries)
- OSHA 301 Form (Injury and Illness Incident Report)
- Job Safety Analysis (JSA) forms
- Toolbox talk management

#### ✅ **Financial Management**
- Payment Applications (AIA G702/G703)
- Schedule of Values with progress tracking
- Lien Waivers (10 state templates)
- Cost codes (CSI MasterFormat)
- Budget vs. actual tracking
- Contingency management with auto-calculation

#### ✅ **Equipment & Materials**
- Equipment tracking with assignments
- Maintenance schedules
- Material receiving with storage location
- Bin tracking and photos

#### ✅ **Communication**
- Internal messaging system
- Correspondence log for formal notices
- Meeting scheduling with minutes
- Action item tracking

#### ✅ **Portals**
- Subcontractor Portal (bids, tasks, punch items)
- Client Portal (project visibility)

#### ✅ **Reports & Analytics**
- Financial summary reports
- Project health dashboards
- Punch list reports
- Safety incident reports
- Predictive analytics
- Dashboard with real-time stats and action items

#### ✅ **Inspections & Compliance**
- Inspection scheduling
- Permit tracking
- Compliance documentation

### Recent Enhancements (Phases 1-4 Complete)

| Phase | Feature | Status |
|-------|---------|--------|
| 1.1 | Dashboard real data integration | ✅ Complete |
| 1.2 | RFI ball-in-court tracking | ✅ Complete |
| 1.3 | Change order backup documents | ✅ Complete |
| 1.4 | Project budget tracking | ✅ Complete |
| 2.1 | Submittal lead time calculator | ✅ Complete |
| 2.2 | Tasks Gantt chart view | ✅ Complete |
| 2.3 | Document revision tracking | ✅ Complete |
| 2.4 | OSHA 301 incident form | ✅ Complete |
| 3.1 | Daily reports photo gallery | ✅ Complete |
| 3.2 | Punch list before/after photos | ✅ Complete |
| 3.3 | Checklist signature capture | ✅ Complete |
| 4.1 | Dashboard action required widget | ✅ Complete |
| 4.2 | Change order contingency tracking | ✅ Complete |

### Planned (Phase 5 - Enterprise)

- **SSO/SAML Authentication** - Enterprise single sign-on
- **Audit Trails** - Comprehensive change logging
- **Custom Fields** - User-defined data fields
- **API Keys** - Third-party integrations

*Legend: ✅ Implemented | 🚧 In Progress | ⬜ Planned*

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - File storage
  - Real-time subscriptions
  - Row-level security

### Offline & PWA
- **Vite PWA Plugin** - Progressive Web App capabilities
- **Service Workers** - Offline caching
- **IndexedDB** - Local data storage

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** - Create at https://supabase.com
- **Git** - Version control

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd daily-reports
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at https://supabase.com
2. Run the database migrations from `./migrations/` folder
   - Follow instructions in `./migrations/README.md`
3. Set up Storage buckets:
   - documents
   - photos
   - drawings
   - reports

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start Development Server

```bash
npm run dev
```

The app will open at http://localhost:5173

## Project Structure

```
daily-reports/
├── migrations/              # Database migration SQL files
│   ├── 001_initial_setup.sql
│   ├── 002_core_tables.sql
│   └── ...
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Layout components (AppLayout, etc.)
│   │   └── ...
│   ├── features/           # Feature-specific modules
│   │   ├── daily-reports/  # Daily reports feature
│   │   ├── workflows/      # RFIs, COs, Submittals
│   │   ├── tasks/          # Task management
│   │   ├── punch-lists/    # Punch list feature
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and libraries
│   │   ├── auth/          # Authentication context
│   │   └── supabase.ts    # Supabase client
│   ├── pages/              # Page components
│   │   ├── auth/          # Login, signup pages
│   │   ├── projects/      # Project pages
│   │   ├── daily-reports/ # Daily reports pages
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   └── database.ts    # Database types
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── tailwind.config.js      # Tailwind CSS config
└── README.md               # This file
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Type Checking & Linting
npm run type-check       # Check TypeScript types
npm run lint             # Run ESLint

# Testing
npm run test             # Run unit tests (watch mode)
npm run test:unit        # Run unit tests (single run)
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Run E2E tests with Playwright UI
npm run test:all         # Run all tests (unit + E2E)
```

## Development Workflow

### Adding a New Feature

1. **Create feature directory** in `src/features/`
2. **Add hooks** for data fetching in `features/<feature>/hooks/`
3. **Create components** in `features/<feature>/components/`
4. **Add pages** in `src/pages/<feature>/`
5. **Update routing** in `src/App.tsx`
6. **Add navigation** links in `src/components/layout/AppLayout.tsx`

### Database Changes

1. Create new migration file in `migrations/`
2. Run migration in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`
4. Create corresponding React Query hooks

## Testing

This project maintains comprehensive test coverage across unit, integration, E2E, visual regression, and accessibility tests.

### Test Stack

- **Unit Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright (Chromium, Firefox, WebKit)
- **Visual Regression**: Playwright screenshot comparison
- **Accessibility**: axe-core for WCAG 2.1 AA compliance
- **CI/CD**: GitHub Actions with automated test runs

### Running Tests

```bash
# Unit Tests
npm run test                 # Run in watch mode
npm run test:unit            # Single run with verbose output
npm run test:coverage        # Generate coverage report
npm run test:ui              # Run with Vitest UI

# E2E Tests
npm run test:e2e             # Run all E2E tests
npm run test:e2e:ui          # Run with Playwright UI
npm run test:e2e:headed      # Run in headed mode (see browser)
npm run test:e2e:debug       # Run in debug mode
npm run test:e2e:chromium    # Run only in Chromium
npm run test:e2e:firefox     # Run only in Firefox
npm run test:e2e:webkit      # Run only in WebKit
npm run test:e2e:mobile      # Run mobile tests

# Visual Regression
npm run test:visual          # Run visual regression tests
npm run test:visual:update   # Update baseline screenshots

# Accessibility
npx playwright test --grep "a11y"  # Run accessibility tests

# All Tests
npm run test:all             # Run unit + E2E tests
npm run ci:test              # Run full CI test suite
```

### Writing Tests

#### Unit Tests

Create test files next to the component:

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### E2E Tests

Create E2E tests in the `e2e/` directory:

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/my-feature');
  await expect(page.locator('h1')).toContainText('My Feature');
});
```

#### Visual Regression Tests

Create visual regression tests in `e2e/visual-regression/`:

```typescript
// e2e/visual-regression/my-component.spec.ts
import { test, expect } from '@playwright/test';

test('desktop - light mode', async ({ page }) => {
  await page.goto('/my-component');
  await expect(page).toHaveScreenshot('my-component-light.png');
});
```

#### Accessibility Tests

Create accessibility tests in component `__tests__` directories:

```typescript
// src/pages/my-page/__tests__/MyPage.a11y.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/my-page');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Test Coverage Goals

- **Unit Tests**: 70% overall, 80% for critical paths (auth, API)
- **E2E Tests**: All critical user workflows
- **Visual Regression**: All major UI components
- **Accessibility**: WCAG 2.1 AA compliance (zero violations)

### CI/CD Testing

All tests run automatically on:
- **Pull Requests**: Full test suite including visual regression
- **Push to main/develop**: Full test suite + build verification
- **Scheduled**: Daily security scans and dependency audits

View test results in GitHub Actions under the "Test Suite" workflow.

### Example: Blueprint Variant Testing

The PolishedVariant1Professional component demonstrates comprehensive testing:

**Unit Tests** ([src/pages/blueprint-samples/\_\_tests\_\_/PolishedVariant1Professional.test.tsx](src/pages/blueprint-samples/__tests__/PolishedVariant1Professional.test.tsx)):
- 36 tests covering rendering, data display, ARIA labels, semantic HTML
- Tests heading hierarchy, stat cards, projects, activities
- Validates accessibility attributes and interactive elements

**Accessibility Tests** ([src/pages/blueprint-samples/\_\_tests\_\_/PolishedVariant1Professional.a11y.test.ts](src/pages/blueprint-samples/__tests__/PolishedVariant1Professional.a11y.test.ts)):
- 13 tests for WCAG 2.1 AA compliance
- Color contrast verification (light + dark modes)
- Keyboard navigation and focus indicators
- Touch target sizing (44px minimum)
- Semantic HTML and ARIA validation

**Visual Regression Tests** ([e2e/visual-regression/blueprint-variants-visual.spec.ts](e2e/visual-regression/blueprint-variants-visual.spec.ts)):
- 10 tests across 4 breakpoints (mobile, tablet, desktop, wide)
- Light and dark mode screenshots
- Focus state and hover state verification
- Baseline screenshots for preventing visual regressions

**Cross-Browser Responsive Tests** ([e2e/blueprint-variants-responsive.spec.ts](e2e/blueprint-variants-responsive.spec.ts)):
- Tests across Chromium, Firefox, and WebKit browsers
- Mobile touch interaction testing
- Touch target size validation (44px minimum)
- Responsive layout verification at breakpoints
- Orientation change handling
- Browser-specific feature testing

**Performance Tests** ([e2e/performance/blueprint-variants-perf.spec.ts](e2e/performance/blueprint-variants-perf.spec.ts)):
- Core Web Vitals measurement (FCP, LCP, CLS, TBT)
- Time to Interactive (TTI) testing
- Resource loading efficiency
- JavaScript execution performance
- DOM size optimization
- Memory usage monitoring
- Performance budgets enforcement

**Screen Reader Testing** ([docs/screen-reader-testing-guide.md](docs/screen-reader-testing-guide.md)):
- Comprehensive manual testing guide for NVDA, JAWS, VoiceOver
- Navigation and announcement verification
- Interactive element testing procedures
- Common issues and solutions
- Documentation templates for test results

### Advanced Testing Features

#### Cross-Browser Compatibility

```bash
# Test all browsers
npx playwright test e2e/blueprint-variants-responsive.spec.ts

# Test specific browser
npx playwright test e2e/blueprint-variants-responsive.spec.ts --project=firefox
npx playwright test e2e/blueprint-variants-responsive.spec.ts --project=webkit
```

Tests verify:
- Consistent rendering across Chrome, Firefox, Safari
- Mobile browser compatibility (iOS Safari, Chrome Mobile)
- Touch interactions on mobile devices
- Responsive breakpoint behavior
- Browser-specific CSS handling

#### Performance Testing

```bash
# Run performance tests
npx playwright test e2e/performance/

# Run with detailed metrics
npx playwright test e2e/performance/ --reporter=list
```

Measures and enforces:
- **FCP** (First Contentful Paint) < 1.8s
- **LCP** (Largest Contentful Paint) < 2.5s
- **CLS** (Cumulative Layout Shift) < 0.1
- **TBT** (Total Blocking Time) < 300ms
- **TTI** (Time to Interactive) < 3.8s

#### Screen Reader Testing

Manual testing with actual screen readers is essential for true accessibility. See the [Screen Reader Testing Guide](docs/screen-reader-testing-guide.md) for:

- Setup instructions for NVDA (Windows), VoiceOver (macOS/iOS), JAWS (Windows)
- Keyboard shortcuts and commands for each screen reader
- Step-by-step testing procedures
- Expected announcements and behavior
- Issue documentation templates

**Quick Start for Screen Reader Testing:**

1. **Windows (NVDA - Free)**:
   - Download from https://www.nvaccess.org/
   - Press `Ctrl + Alt + N` to start
   - Press `H` to navigate headings, `B` for buttons

2. **macOS (VoiceOver - Built-in)**:
   - Press `Cmd + F5` to start
   - Press `VO + →` to navigate (VO = Ctrl + Option)
   - Press `VO + U` for rotor navigation

3. **Test the Component**:
   - Navigate to `/blueprint-samples/variants/1-professional`
   - Verify heading hierarchy (H1, H2, H3)
   - Check all interactive elements have labels
   - Ensure logical tab order

### Phase 3: Interaction, Edge Case & Snapshot Testing

Phase 3 testing adds comprehensive coverage for user interactions, edge cases, and component structure stability.

**Interaction Tests** ([e2e/blueprint-variants-interaction.spec.ts](e2e/blueprint-variants-interaction.spec.ts)):
- 40+ tests covering all interactive behaviors
- Stat card interactions (hover states, clicks, rapid interactions)
- Link navigation and keyboard navigation flows
- Focus management and tab order verification
- Animation completion testing
- State persistence across interactions
- Multi-element interaction patterns
- Error resilience and recovery

```bash
# Run interaction tests
npx playwright test e2e/blueprint-variants-interaction.spec.ts

# Run in headed mode to observe interactions
npx playwright test e2e/blueprint-variants-interaction.spec.ts --headed
```

**Edge Case Tests** ([e2e/blueprint-variants-edge-cases.spec.ts](e2e/blueprint-variants-edge-cases.spec.ts)):
- 40+ tests for boundary conditions and stress scenarios
- Long text handling (extremely long names, descriptions)
- Missing data scenarios (empty states, zero values)
- Extreme values (999+ numbers, very large datasets)
- Layout stability under rapid changes (theme switching, resizing)
- Error resilience (missing CSS, JavaScript errors)
- Overflow and truncation verification
- Accessibility under edge conditions

```bash
# Run edge case tests
npx playwright test e2e/blueprint-variants-edge-cases.spec.ts

# Run with detailed console output
npx playwright test e2e/blueprint-variants-edge-cases.spec.ts --reporter=list
```

**Snapshot Tests** ([src/pages/blueprint-samples/\_\_tests\_\_/PolishedVariant1Professional.snapshot.test.tsx](src/pages/blueprint-samples/__tests__/PolishedVariant1Professional.snapshot.test.tsx)):
- 40+ snapshots for DOM structure verification
- Light/dark mode snapshots at all breakpoints (375px, 768px, 1024px, 1536px)
- Component structure snapshots (header, stat cards, projects, activities)
- ARIA attributes structure verification
- CSS class structure snapshots (grid, responsive, colors)
- Interactive elements structure (focusable, hover, animations)
- Data display structure validation
- Typography and spacing snapshots

```bash
# Run snapshot tests
npm run test -- PolishedVariant1Professional.snapshot.test.tsx

# Update snapshots after intentional changes
npm run test -- -u PolishedVariant1Professional.snapshot.test.tsx
```

**Test Coverage Summary (Phase 3)**:

| Test Type | Count | Coverage |
|-----------|-------|----------|
| Interaction Tests | 40+ | All user flows, hover states, keyboard nav |
| Edge Case Tests | 40+ | Boundary conditions, stress scenarios |
| Snapshot Tests | 40+ | DOM structure, ARIA, CSS classes |
| **Total Phase 3** | **120+ tests** | **Comprehensive interaction & stability coverage** |

**Combined Test Suite (All Phases)**:

| Phase | Test Files | Test Count | Coverage |
|-------|-----------|------------|----------|
| Phase 1 (Critical) | 3 files | 60+ tests | Visual regression, Accessibility, Unit tests |
| Phase 2 (Important) | 3 files | 55+ tests | Cross-browser, Performance, Screen reader guide |
| Phase 3 (Nice-to-have) | 3 files | 120+ tests | Interactions, Edge cases, Snapshots |
| **Total Coverage** | **9 files** | **235+ tests** | **Comprehensive end-to-end coverage** |

**CI/CD Integration**:

All Phase 3 tests run automatically in the GitHub Actions pipeline:
- **Interaction Tests**: Run on every PR and push to main/develop
- **Edge Case Tests**: Run on every PR and push to main/develop
- **Snapshot Tests**: Run as part of unit test suite with coverage reporting

See [.github/workflows/test.yml](.github/workflows/test.yml) for complete CI/CD configuration.

## Database

The database schema includes 172+ migrations and 60+ tables covering:

- **Core**: companies, users, projects, contacts, subcontractors
- **Documents**: folders, documents, document_markups
- **Daily Reports**: daily_reports, workforce, equipment, deliveries, visitors
- **Workflows**: workflow_types, workflow_items, comments, history, change_order_bids
- **Tasks & Schedule**: tasks, schedule_items
- **Checklists**: checklist_templates, checklists
- **Punch Lists**: punch_items
- **Safety**: safety_incidents, toolbox_talks
- **Compliance**: inspections, permits, tests
- **And more...**

See `database-schema.md` for complete documentation.

## Authentication & Permissions

### User Roles

- **Superintendent** - Full access, assigned projects only
- **Project Manager** - Full access, assigned projects only
- **Office Admin** - Documentation and data entry
- **Field Employee** - Photo upload, notes, task updates
- **Subcontractor** - View only their scope and items
- **Architect** - Review and respond to submittals, RFIs

### Row-Level Security

All data is protected by Supabase Row-Level Security (RLS) policies that ensure:
- Users only see data from their company
- Users only access projects they're assigned to
- External users (subs, architects) see only relevant data

## Offline Functionality

### How It Works

1. **Service Workers** cache app shell and assets
2. **IndexedDB** stores project data for offline access
3. **User controls** what to download (selective sync)
4. **Auto-sync** when connection is restored
5. **Conflict resolution** for simultaneous edits

### Offline Indicator

The app displays online/offline status in the header.

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## Deployment

### Production Build

```bash
npm run build
```

Output will be in `dist/` folder.

### Deployment Options

- **Vercel** (Recommended) - Zero-config deployment for Vite apps
- **Netlify** - Alternative with similar ease
- **Self-hosted** - Deploy `dist/` folder to any static host

### Environment Variables

Set these in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV=production`

## Security

### Known Development Dependencies

This project uses Vitest 2.1.8 for testing, which has known moderate-severity vulnerabilities in development dependencies (esbuild <=0.24.2):

- **Vulnerability**: GHSA-67mh-4wv8-2f99 - esbuild dev server request vulnerability
- **Severity**: Moderate
- **Scope**: Development environment only (not production)
- **Impact**: Malicious websites could send requests to local dev server
- **Mitigation**: Avoid visiting untrusted websites while development server is running

**Rationale**: We use Vitest 2.1.8 instead of the latest 4.x version because Vitest 4.0.15 has a critical bug ("failed to find the runner") that prevents all tests from running. The development-only moderate vulnerabilities are an acceptable trade-off for a functional test suite.

**Production Impact**: None - these vulnerabilities only affect the development server and build tools, not the production application.

## Roadmap

### Completed Phases (1-4)
- ✅ Critical fixes and data integration
- ✅ Industry-standard construction features
- ✅ Field enhancement tools
- ✅ Analytics and reporting improvements

### Phase 5 (Enterprise - Planned)
- SSO/SAML authentication
- Comprehensive audit trails
- Custom field system
- API key management
- Advanced integrations

See `FEATURE_ROADMAP.md` for detailed feature roadmap.

## Documentation

- **Master Plan**: `masterplan.md` - Complete feature specifications
- **Database Schema**: `database-schema.md` - Detailed schema documentation
- **Migrations**: `migrations/README.md` - Database setup guide
- **Tech Planning**: Technical architecture and decisions

## Support

For issues, questions, or contributions:
- Review documentation files
- Check Supabase docs: https://supabase.com/docs
- Review React Query docs: https://tanstack.com/query

## License

[Your License Here]

---

**Version**: 2.0.0 (Phases 1-4 Complete - Production Ready)
**Last Updated**: 2026-01-01
