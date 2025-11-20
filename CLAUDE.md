# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **offline-first construction field management platform** built for superintendents. It's a multi-tenant SaaS application that consolidates daily reports, RFIs, change orders, punch lists, safety tracking, and more into one unified Progressive Web App (PWA).

**Key architectural principle**: This is NOT just a CRUD app. It's built for field use with spotty connectivity, requiring careful state management and offline-sync strategies.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:5173
npm run build            # Production build (TypeScript + Vite)
npm run preview          # Preview production build locally

# Code Quality
npm run type-check       # TypeScript type checking without emit
npm run lint             # ESLint with React/TypeScript rules
```

## Architecture & Code Organization

### Multi-Tenant Data Isolation

All database operations MUST respect multi-tenant isolation via Row-Level Security (RLS):
- Every table has `company_id` for company-level isolation
- User queries filter by `project_assignments` table to limit access to assigned projects only
- **Critical**: Never write queries that bypass RLS policies or expose cross-company data

### Feature-Based Module Structure

Code is organized by **features**, not technical layers. Each feature is self-contained:

```
src/features/<feature-name>/
├── hooks/           # React Query hooks (useX, useCreateX, useUpdateX, useDeleteX)
├── components/      # Feature-specific UI components
└── (optional) types, utils, etc.
```

**Pattern for hooks**:
- `useX(id)` - Fetch single entity
- `useXs(filters)` - Fetch collection
- `useCreateX()` - Returns mutation with `queryClient.invalidateQueries`
- `useUpdateX()` - Returns mutation with optimistic updates where appropriate
- `useDeleteX()` - Returns mutation with cache cleanup

### Type System (Critical!)

All database types are centralized in `src/types/database.ts` (~711 lines):
- **Do NOT manually write DB types** - they are the single source of truth
- Use helper types: `CreateInput<T>`, `UpdateInput<T>`, `WithRelations<T, R>`
- When adding new tables, update this file comprehensively with all fields
- Enum types (UserRole, ProjectStatus, etc.) must match database constraints

### State Management Layers

1. **Server State**: TanStack Query (`@tanstack/react-query`)
   - 5-minute stale time by default
   - Aggressive cache invalidation after mutations
   - Configured in `src/main.tsx`

2. **Auth State**: React Context (`src/lib/auth/AuthContext.tsx`)
   - Manages Supabase session
   - Provides `userProfile` with company_id and role
   - Auto-refreshes tokens

3. **Local State**: Zustand (when needed for global UI state)
   - Currently minimal usage
   - Use React Query for server state, NOT Zustand

4. **Form State**: Controlled components (useState)
   - Keep forms simple with controlled inputs
   - Validate on submit, not on every keystroke

### UI Component System

Built with **shadcn/ui** pattern (copy-paste, not npm package):
- Components in `src/components/ui/` are customizable primitives
- Use `cn()` helper from `src/lib/utils.ts` for className merging
- Styling: TailwindCSS with design tokens
- Icons: `lucide-react`

**Component import pattern**:
```typescript
import { Button, Card, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
```

### Authentication & Authorization

**Flow**:
1. User signs in via Supabase Auth (`src/lib/supabase.ts`)
2. Session stored, `AuthContext` provides `userProfile`
3. `ProtectedRoute` wrapper checks auth before rendering
4. All routes in `src/App.tsx` use either public or `<ProtectedRoute>` wrapper

**Role-based access**:
- Roles: superintendent, project_manager, office_admin, field_employee, subcontractor, architect
- Role stored in `users.role` column
- Frontend respects roles for UI, but **backend RLS enforces true security**

### Routing & Navigation

**Route organization** (`src/App.tsx`):
- Public: `/login`, `/signup`, `/forgot-password`
- Protected: All other routes wrapped in `<ProtectedRoute>`
- Sidebar navigation in `src/components/layout/AppLayout.tsx`

**Adding new feature routes**:
1. Add route to `src/App.tsx`
2. Update `navigation` array in `AppLayout.tsx` with icon
3. Create page component in `src/pages/<feature>/`
4. Create feature hooks in `src/features/<feature>/hooks/`

### Database Integration (Supabase)

**Client initialization**: `src/lib/supabase.ts`
- Typed with `Database` interface from `types/database.ts`
- Auth config: `persistSession: true`, `autoRefreshToken: true`

**Query patterns**:
```typescript
// Fetch with RLS - automatically filters by company/project
const { data, error } = await supabase
  .from('daily_reports')
  .select('*')
  .eq('project_id', projectId)
  .order('report_date', { ascending: false })

// Insert with company_id from auth context
const { data, error } = await supabase
  .from('projects')
  .insert({ ...project, company_id: userProfile.company_id })
  .select()
  .single()
```

**Storage buckets**:
- `documents`, `photos`, `drawings`, `reports`
- File upload requires signed URLs for security

### Offline Strategy (Future Implementation)

**Current state**: Infrastructure ready (Vite PWA plugin), not yet implemented
**When implementing**:
1. Service Worker caches app shell (configured in `vite.config.ts`)
2. IndexedDB stores project data for offline access
3. Sync queue for offline mutations
4. Conflict resolution strategy TBD
5. Online/offline indicator already in `AppLayout.tsx` sidebar

## Database Migration Workflow

1. Create migration file: `migrations/XXX_description.sql`
2. Run SQL in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`:
   - Add interface for new table
   - Add to `Database['public']['Tables']` type
   - Include Insert/Update types
4. Create React Query hooks in corresponding feature
5. Test with `npm run type-check` before committing

## Important Patterns & Conventions

### Path Aliases

Use `@/` prefix for all src imports:
```typescript
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/features/projects/hooks/useProjects'
```

### Error Handling

- React Query handles loading/error states
- Display errors via toast notifications (see `src/components/ui/toast.tsx`)
- Server errors: show user-friendly message, log technical details
- Form validation errors: inline near field

### Toast Notifications

Centralized notification system:
```typescript
import { useToast } from '@/components/ui/toast'

const { addToast } = useToast()

addToast({
  title: 'Success',
  description: 'Project created successfully',
  variant: 'success' // or 'destructive' or 'default'
})
```

### Date Handling

- Use `date-fns` for formatting: `format(new Date(date), 'MMM d, yyyy')`
- Store dates as ISO strings in database
- Display in user-friendly formats

### Loading & Empty States

Every list page needs:
1. Loading state: `isLoading &&  <Spinner />`
2. Error state: `error && <ErrorMessage />`
3. Empty state: `data.length === 0 && <EmptyState />`
4. Success state: `data.length > 0 && <DataTable />`

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit** `.env` file. Use `.env.example` for template.

## Key Files Reference

- `src/types/database.ts` - Complete database type definitions (711 lines)
- `src/lib/auth/AuthContext.tsx` - Authentication state & methods
- `src/lib/supabase.ts` - Supabase client configuration
- `src/components/layout/AppLayout.tsx` - Main layout with sidebar
- `src/App.tsx` - Route definitions
- `src/main.tsx` - App entry point with providers
- `migrations/` - Database migration SQL files (12 files, 42 tables)
- `masterplan.md` - Complete feature specifications
- `database-schema.md` - Detailed schema documentation

## Performance Considerations

- React Query caching reduces unnecessary fetches (5min stale time)
- Use `enabled` flag in queries to prevent premature fetches
- Implement pagination for large lists (not yet done)
- Optimize images before upload (not yet enforced)
- Lazy load heavy components (not yet implemented)
