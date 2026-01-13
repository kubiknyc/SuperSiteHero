# Directory Structure

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## Top-Level Structure

```
SuperSiteHero/
├── src/                    # Application source code
├── e2e/                    # Playwright E2E tests
├── tests/                  # Load tests (K6)
├── migrations/             # Database migrations
├── supabase/              # Supabase Edge Functions
├── ios/                   # Capacitor iOS project
├── android/               # Capacitor Android project
├── public/                # Static assets
├── .claude/               # Claude Code configuration
└── .planning/             # Project planning docs
```

## Source Directory (src/)

```
src/
├── App.tsx                          # Main router with device detection
├── main.tsx                         # Entry point (React Query, Sentry)
├── DesktopApp.tsx                   # Desktop routing (100+ routes)
├── MobileApp.tsx                    # Mobile routing (simplified)
│
├── components/                      # Shared UI components
│   ├── layout/                      # Layout wrappers
│   │   ├── AppLayout.tsx           # Desktop main layout
│   │   ├── AppLayoutV2.tsx         # Desktop V2 layout
│   │   ├── MobileLayout.tsx        # Mobile main layout
│   │   ├── Sidebar/                # Desktop sidebar
│   │   ├── Header/                 # Desktop header
│   │   └── MobileBottomNav.tsx     # Mobile navigation
│   ├── auth/                        # Auth components
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleBasedRedirect.tsx
│   ├── errors/                      # Error boundaries
│   ├── ui/                          # Reusable UI (shadcn/ui style)
│   ├── offline/                     # Offline status indicators
│   ├── sync/                        # Sync status components
│   ├── realtime/                    # Live updates, cursors
│   └── mobile/                      # Mobile-specific components
│
├── features/                        # Feature modules (74 features)
│   ├── daily-reports/              # Example feature
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   └── validation/
│   ├── tasks/
│   ├── rfis/
│   ├── punch-lists/
│   ├── workflows/
│   ├── change-orders/
│   ├── safety/
│   ├── inspections/
│   ├── documents/
│   ├── agent/                       # AI assistant
│   ├── analytics/
│   ├── automation/
│   ├── client-portal/
│   ├── subcontractor-portal/
│   └── ... (60+ more)
│
├── lib/                             # Core infrastructure
│   ├── supabase.ts                 # Supabase client + offline config
│   ├── queryKeys.ts                # React Query key factory
│   ├── stale-times.ts              # Stale time constants
│   │
│   ├── api/                        # API layer
│   │   ├── client.ts               # HTTP client
│   │   ├── base-service.ts         # Base service class
│   │   ├── offline-client.ts       # Offline wrapper
│   │   └── services/               # 100+ typed services
│   │
│   ├── offline/                    # Offline sync (16 files)
│   │   ├── sync-manager.ts         # Background sync
│   │   ├── conflict-resolver.ts    # Conflict handling
│   │   ├── indexeddb.ts            # IndexedDB wrapper
│   │   ├── priority-queue.ts       # Sync prioritization
│   │   ├── bandwidth-detector.ts   # Network detection
│   │   └── storage-manager.ts      # Storage quotas
│   │
│   ├── auth/                       # Authentication
│   │   ├── AuthContext.tsx         # Auth state
│   │   ├── session-manager.ts      # Persistence
│   │   ├── session-security.ts     # Hijack detection
│   │   └── permissions.ts          # Permission checks
│   │
│   ├── realtime/                   # Supabase Realtime
│   ├── theme/                      # Dark mode
│   ├── device/                     # Device detection
│   ├── security/                   # Encryption, CSP
│   ├── storage/                    # Browser storage
│   ├── audit/                      # Audit logging
│   ├── performance/                # Web vitals
│   └── utils/                      # General utilities
│
├── stores/                         # Zustand stores
│   └── offline-store.ts           # Offline/sync state
│
├── hooks/                          # Global custom hooks
│   └── useLayoutVersion.tsx
│
├── pages/                          # Route page components
│   ├── auth/                       # Login, signup, MFA
│   ├── mobile/                     # Mobile pages
│   ├── dashboard/                  # Role dashboards
│   ├── projects/
│   ├── daily-reports/
│   └── ... (100+ pages)
│
├── types/                          # TypeScript definitions
│   ├── database.generated.ts      # Supabase types (source of truth)
│   ├── database-extensions.ts     # Custom extensions
│   └── offline.ts                 # Offline types
│
├── styles/                         # Global styles
│   ├── index.css
│   └── industrial-theme.css
│
├── contexts/                       # React contexts
│   └── AuthContext.tsx
│
└── __tests__/                      # Test utilities
    ├── setup.tsx                   # Global test setup
    ├── factories/                  # Test data factories
    ├── helpers/                    # Render helpers
    ├── mocks/                      # MSW handlers
    ├── integration/                # Cross-feature tests
    └── security/                   # Security tests
```

## Feature Module Structure

Each of the 74 features follows this pattern:

```
features/<feature-name>/
├── index.ts                # Public exports
├── components/             # React components
│   ├── index.ts           # Component exports
│   ├── FeatureForm.tsx
│   ├── FeatureList.tsx
│   └── FeatureDetail.tsx
├── hooks/                  # Custom hooks
│   ├── index.ts
│   ├── useFeature.ts
│   └── useCreateFeature.ts
├── services/               # API services
│   └── feature-service.ts
├── store/                  # Zustand store (if needed)
│   └── feature-store.ts
├── types/                  # TypeScript types
│   └── index.ts
├── utils/                  # Utilities
│   └── helpers.ts
├── validation/             # Zod schemas
│   └── schemas.ts
└── __tests__/             # Tests
    └── feature.test.tsx
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.tsx` | App entry, React Query + Sentry setup |
| `src/App.tsx` | Main router, context nesting |
| `src/DesktopApp.tsx` | Desktop routing (100+ routes) |
| `src/MobileApp.tsx` | Mobile routing (simplified) |
| `src/lib/supabase.ts` | Supabase client + offline config |
| `src/lib/offline/sync-manager.ts` | Background sync |
| `src/lib/auth/AuthContext.tsx` | Auth state management |
| `src/stores/offline-store.ts` | Zustand offline state |
| `src/types/database.generated.ts` | Supabase types |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DailyReportForm.tsx` |
| Hooks | camelCase + use | `useDailyReports.ts` |
| Utilities | camelCase | `dateUtils.ts` |
| Types | PascalCase | `database.generated.ts` |
| Tests | .test.ts(x) | `Component.test.tsx` |
| Features | kebab-case | `daily-reports/` |
| Services | kebab-case | `daily-reports.ts` |

## Import Conventions

Path alias `@/` maps to `src/`:
```typescript
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useDailyReports } from '@/features/daily-reports/hooks'
```
