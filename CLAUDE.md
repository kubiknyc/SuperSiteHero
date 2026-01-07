# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobSight is an offline-first, multi-tenant construction field management platform for superintendents. It consolidates daily reports, RFIs, change orders, punch lists, safety tracking, and other construction workflows into one unified system optimized for field use.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- State: TanStack Query (react-query) + Zustand
- Backend: Supabase (PostgreSQL + Auth + Storage + Realtime)
- Offline: IndexedDB + Service Workers (Vite PWA plugin)
- Mobile: Capacitor (iOS/Android)
- Testing: Vitest (unit) + Playwright (E2E)

## Development Commands

```bash
# Development
npm run dev                # Start dev server (http://localhost:5173)
npm run build              # Production build
npm run preview            # Preview production build

# Type Checking & Linting
npm run type-check         # TypeScript type checking (tsc --noEmit)
npm run lint               # ESLint
npm run lint:fix           # ESLint with auto-fix

# Unit Tests (Vitest)
npm run test               # Watch mode
npm run test:unit          # Single run with verbose output
npm run test:coverage      # With coverage report
npm run test:ui            # Vitest UI

# E2E Tests (Playwright)
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # Headed mode (see browser)
npm run test:e2e:debug     # Debug mode
npm run test:e2e:chromium  # Chromium only

# Visual Regression
npm run test:visual        # Run visual regression tests
npm run test:visual:update # Update baseline screenshots

# Seed Test Data
npm run seed:test          # Seed test data
npm run seed:test-users    # Seed test users only

# Mobile (Capacitor)
npm run cap:sync           # Sync web assets to native projects
npm run cap:build:ios      # Build and sync iOS
npm run cap:open:ios       # Open Xcode
npm run cap:run:ios        # Run on iOS simulator
```

## Architecture

### Key Directories

```
src/
├── features/           # Feature modules (70+ features)
│   ├── daily-reports/  # Each feature has hooks/, components/, pages/
│   ├── workflows/      # RFIs, submittals, change orders
│   ├── punch-lists/
│   └── ...
├── lib/
│   ├── supabase.ts     # Supabase client (typed + untyped exports)
│   ├── api/            # API services and clients
│   │   ├── services/   # Typed service layer
│   │   └── offline-client.ts
│   └── offline/        # Offline sync infrastructure
│       ├── sync-manager.ts
│       ├── conflict-resolver.ts
│       ├── indexeddb.ts
│       └── priority-queue.ts
├── types/
│   ├── database.generated.ts  # Supabase-generated types (source of truth)
│   └── database-extensions.ts # Extended/custom types
├── stores/             # Zustand stores
├── hooks/              # Global custom hooks
└── components/         # Shared UI components
```

### Data Flow

1. **React Component** → TanStack Query hook → API service → Supabase client
2. **Offline**: IndexedDB cache ← sync-manager → Supabase (when online)
3. **Realtime**: Supabase Realtime channels → React Query cache invalidation

### Supabase Client Usage

```typescript
// Typed client for tables in database.generated.ts
import { supabase } from '@/lib/supabase'
const { data } = await supabase.from('projects').select('*')

// Untyped client for tables not yet in generated types
// (insurance_certificates, lien_waivers, etc.)
import { supabaseUntyped } from '@/lib/supabase'
const { data } = await supabaseUntyped.from('insurance_certificates').select('*')
```

### Path Alias

Use `@/` for imports from `src/`:
```typescript
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
```

## Adding Features

1. Create feature directory: `src/features/<feature>/`
2. Add hooks in `features/<feature>/hooks/`
3. Create components in `features/<feature>/components/`
4. Add pages in `src/pages/<feature>/`
5. Update routing in `src/App.tsx`
6. Add navigation in `src/components/layout/AppLayout.tsx`

## Database Changes

1. Create migration SQL in `migrations/` (numbered: `XXX_description.sql`)
2. Run migration in Supabase SQL Editor
3. Update `src/types/database.generated.ts` (or regenerate)
4. Update API service in `src/lib/api/services/`
5. Add tests

## Testing Patterns

### Unit Tests
Place test files next to the code: `Component.test.tsx` alongside `Component.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('renders', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Tests
Place in `e2e/` directory. Tests use seeded test users.

```typescript
import { test, expect } from '@playwright/test'

test('user flow', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('h1')).toContainText('Projects')
})
```

### Offline Tests
Use `fake-indexeddb` and MSW for mocking:
```typescript
import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
```

## Environment Variables

Required in `.env` (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For E2E tests (`.env.test`):
```
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword
```

## Offline Sync

Tables synced for offline use are defined in `src/lib/supabase.ts`:
- `projects`, `daily_reports`, `workflow_items`, `tasks`
- `documents`, `punch_items`, `checklists`, `safety_incidents`

Offline patterns are in `src/lib/offline/`:
- `sync-manager.ts` - Orchestrates sync operations
- `conflict-resolver.ts` - Handles concurrent edits
- `indexeddb.ts` - IndexedDB wrapper
- `priority-queue.ts` - Prioritized sync queue

## CI/CD

GitHub Actions runs on PRs and pushes to main/develop:
1. `npm run lint`
2. `npm run type-check`
3. `npm run test:coverage`
4. `npm run test:e2e` (Chromium only in CI)

## Key Files Reference

- **App entry**: `src/main.tsx`
- **Routing**: `src/App.tsx`
- **Supabase client**: `src/lib/supabase.ts`
- **Database types**: `src/types/database.generated.ts`
- **Vite config**: `vite.config.ts` (includes PWA, chunking)
- **Vitest config**: `vitest.config.ts`
- **Playwright config**: `playwright.config.ts`
- **Migrations**: `migrations/` directory
