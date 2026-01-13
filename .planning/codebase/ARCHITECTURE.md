# Architecture Overview

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## System Design

**JobSight** is an **offline-first, multi-tenant construction field management platform** with a hybrid architecture:

| Layer | Technology | Description |
|-------|------------|-------------|
| Frontend | React 19 SPA | Single monolithic frontend with device-adaptive rendering |
| Backend | Supabase BaaS | PostgreSQL + Auth + Storage + Realtime |
| Offline | IndexedDB + SW | Service Workers for offline caching and background sync |
| Mobile | Capacitor | Native iOS/Android wrapper |

## Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       App.tsx                           │
│                   (Device Detection)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   MobileApp     │         │   DesktopApp    │
│ (Field-focused) │         │ (Full features) │
│   20+ routes    │         │   100+ routes   │
└─────────────────┘         └─────────────────┘
```

## Component Patterns

### Conditional App Shells
- **MobileApp**: Streamlined for field work (daily reports, photos, punch lists)
- **DesktopApp**: Full feature set (74 feature modules)
- Routes lazy-loaded with `React.lazy()` and `Suspense`

### Feature Module Pattern (74 Features)
```
features/<feature>/
├── components/        # UI components
├── hooks/            # Feature-specific hooks
├── services/         # API service layer
├── store/            # Feature-scoped Zustand stores
├── types/            # TypeScript types
├── utils/            # Utilities
└── validation/       # Zod schemas
```

## State Management

### Global State (Zustand)
Single global store: `src/stores/offline-store.ts`
```typescript
useOfflineStore {
  isOnline: boolean
  pendingSyncs: number
  isSyncing: boolean
  conflictCount: number
  conflicts: SyncConflict[]
  syncQueue: PendingSyncItem[]
  networkQuality: NetworkQuality | null
}
```

### Server State (TanStack Query)
```typescript
{
  queries: {
    staleTime: 5 minutes,
    gcTime: 10 minutes,
    networkMode: 'offlineFirst',
  },
  mutations: {
    networkMode: 'offlineFirst',
    retry: 3,
  }
}
```

### Context Providers (Composition)
```
AuthProvider (session, user, userProfile)
  └── ToastProvider (notifications)
      └── ThemeProvider (dark mode)
          └── DeviceProvider (mobile/desktop)
              └── KeyboardShortcutsProvider
                  └── AgentProvider (AI assistant)
```

## Data Flow

### Online Flow
```
Component → React Query Hook → API Service → Supabase Client → PostgreSQL
```

### Offline Flow
```
Component → React Query (reads IndexedDB) → IndexedDB Cache
                                              ↓
                                         Sync Manager
                                              ↓
                                         Priority Queue
                                              ↓
                                    [Waiting for connectivity]
                                              ↓
                                         Supabase
```

### Realtime Flow
```
Supabase Realtime Channel → React Query Cache Invalidation → UI Auto-updates
```

## Routing Architecture

### Desktop Routes (DesktopApp.tsx)
- 100+ lazy-loaded routes by feature
- Examples: `/projects`, `/daily-reports`, `/tasks`, `/rfis`, `/submittals`

### Mobile Routes (MobileApp.tsx)
- Simplified navigation for field work
- Examples: `/mobile/dashboard`, `/mobile/daily-reports`, `/mobile/photo-progress`

### Protected Routes
- `<ProtectedRoute>` enforces authentication
- `<RoleBasedRedirect>` enforces role-based access

## Offline-First Architecture

### Core Components (src/lib/offline/)
| File | Purpose |
|------|---------|
| sync-manager.ts | Background sync orchestration |
| conflict-resolver.ts | Concurrent edit handling |
| indexeddb.ts | IndexedDB wrapper |
| priority-queue.ts | Prioritized sync queue |
| bandwidth-detector.ts | Network quality estimation |
| storage-manager.ts | Storage quota management |

### Offline-Synced Tables (11 tables)
| Table | Priority |
|-------|----------|
| projects | 100 |
| safety_incidents | 95 |
| daily_reports | 90 |
| workflow_items | 85 |
| tasks | 80 |
| punch_items | 75 |
| checklist_executions | 70 |
| documents | 70 |
| checklists | 65 |
| meetings | 60 |
| contacts | 50 |

### Sync Strategy
- Exponential backoff retry: 5s → 15s → 30s → 1min → 5min
- Conflict resolution: last-write-wins (default), local, server, merge
- Batch size adapts to network speed

## API & Service Layer

### Three-Tier Architecture
1. **Base Service** (`lib/api/base-service.ts`) - HTTP client wrapper
2. **Typed Services** (`lib/api/services/`) - 100+ domain services
3. **Offline Client** (`lib/api/offline-client.ts`) - IndexedDB fallback

### Supabase Client Strategy
```typescript
// Typed client (generated tables)
import { supabase } from '@/lib/supabase'

// Untyped client (tables not in generated types)
import { supabaseUntyped } from '@/lib/supabase'
```

## Authentication & Security

### Auth Flow
```
AuthProvider
├── Session management (localStorage)
├── User profile fetching (with retry)
├── Session security (hijack detection)
└── Activity monitoring (auto-logout)
```

### Security Features
- Multi-factor authentication (TOTP)
- Session hijack detection (device fingerprinting)
- Row-Level Security (RLS) in PostgreSQL
- Role-based access control (RBAC)

## Bootstrap Sequence

### main.tsx
1. Sentry initialization (error tracking)
2. Theme initialization (dark mode)
3. React Query setup (offline-first)
4. Web Vitals (performance monitoring)
5. Service Worker registration (PWA)
6. Persistent storage request
7. React mount with providers

### App.tsx
1. IndexedDB initialization
2. Persistent storage request
3. Sync manager startup
4. Context provider nesting
5. Conditional mobile/desktop rendering

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Offline-First | Field workers need reliability without connectivity |
| Device Adaptive | Single codebase for mobile/desktop |
| Feature Modules | 74 decoupled features with clear boundaries |
| Supabase BaaS | Rapid development with built-in auth, realtime |
| IndexedDB | Large data storage for offline use |
| React Query | Automatic caching, offline sync integration |
