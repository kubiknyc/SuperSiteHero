# Code Conventions

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## Code Style & Formatting

### ESLint Configuration
- **Config**: `eslint.config.js` (flat config, ESLint v9+)
- **TypeScript**: Strict mode enabled
- **Security**: 10 security rules via eslint-plugin-security
- **Max Warnings**: 3000 (needs reduction)

### Key Rules
```javascript
// Enforced
'prefer-const': 'warn'
'no-var': 'error'
'eqeqeq': 'always'
'no-console': 'warn'  // allows warn/error/info

// TypeScript
'@typescript-eslint/no-explicit-any': 'warn'
// Unused params: use _ prefix

// Relaxed in tests
'@typescript-eslint/no-explicit-any': 'off'
'no-console': 'off'
```

### Formatting
- No standalone Prettier config
- Formatting rules delegated to ESLint
- Indentation via editor settings

## Naming Patterns

### Files & Directories
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DailyReportForm.tsx` |
| Hooks | camelCase + use | `useDailyReports.ts` |
| Utilities | camelCase | `dateUtils.ts` |
| Tests | .test.ts(x) | `Component.test.tsx` |
| Features | kebab-case | `daily-reports/` |
| Constants | UPPER_SNAKE | `TEST_PROJECTS` |

### Component Names
```typescript
// Good
DailyReportForm.tsx
MobileBottomNav.tsx
SyncStatusBanner.tsx

// Pattern: [Context][Entity][Type]
// e.g., MobilePhotoCapture, DesktopProjectList
```

### Hook Names
```typescript
// Pattern: use[Feature][Action]
useDailyReports()
useCreateDailyReport()
useOfflineSync()
useTabletMode()
```

## Import Organization

### Path Alias
```typescript
// Always use @/ for src imports
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useDailyReports } from '@/features/daily-reports/hooks'
```

### Import Order (Recommended)
```typescript
// 1. React/external packages
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal utilities
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// 3. Components
import { Button } from '@/components/ui/button'

// 4. Types
import type { DailyReport } from '@/types/database.generated'
```

## TypeScript Patterns

### Type Definitions
```typescript
// Source of truth: Supabase generated types
import { Tables } from '@/types/database.generated'
type Project = Tables<'projects'>

// Extended types
interface DailyReportWithProject extends DailyReport {
  project?: { id: string; name: string } | null
}
```

### Supabase Clients
```typescript
// Typed (for generated tables)
import { supabase } from '@/lib/supabase'
const { data } = await supabase.from('projects').select('*')

// Untyped (for tables not in generated types)
import { supabaseUntyped } from '@/lib/supabase'
const { data } = await supabaseUntyped.from('insurance_certificates').select('*')
```

### Strict Settings
- `strictNullChecks: true`
- Unused params: prefix with `_`
- No `any` unless necessary

## Component Patterns

### Functional Components
```typescript
interface ComponentProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
}

export function Component({ children, className, ...props }: ComponentProps) {
  const [state, setState] = useState()
  const { data } = useCustomHook()

  return (
    <div className={cn('base-class', className)} {...props}>
      {children}
    </div>
  )
}
```

### Props Pattern
- Destructure with defaults
- Optional `children?: ReactNode`
- Spread `...props` for HTML attributes
- Use `cn()` for class merging

### Conditional Rendering
```typescript
{condition && <Component />}
{condition ? <A /> : <B />}
{items.map(item => <Item key={item.id} item={item} />)}
```

## Hook Patterns

### Data Fetching (React Query)
```typescript
export function useDailyReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}
```

### Mutations
```typescript
export function useCreateDailyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (report) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(report)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}
```

### Query Key Pattern
```typescript
// Hierarchical keys for partial invalidation
['resource']                    // All
['resource', projectId]         // By project
['resource', projectId, id]     // Single item
```

## Error Handling

### Query Errors
```typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  return data
} catch (err) {
  // React Query handles retries
  throw err
}
```

### User Feedback
- Toast notifications via react-hot-toast or sonner
- Error boundaries for component errors
- Offline error handling via sync-manager

## Comments & Documentation

### File Headers (Optional)
```typescript
// File: /src/features/daily-reports/hooks/useDailyReports.ts
// React Query hooks for daily reports data fetching
```

### JSDoc (For Complex Functions)
```typescript
/**
 * Creates a new QueryClient configured for testing
 * @example
 * const client = createTestQueryClient()
 */
export function createTestQueryClient(): QueryClient { ... }
```

### Comment Conventions
- `// TODO: description` - future work
- `// NOTE: description` - important context
- `// HACK: description` - temporary workaround
- Explain "why", not "what"

## Common Patterns

### cn() Utility
```typescript
import { cn } from '@/lib/utils'

// Merges Tailwind classes intelligently
<div className={cn('base-class', className, {
  'active-class': isActive,
  'disabled-class': disabled,
})} />
```

### Form Validation (Zod)
```typescript
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  date: z.coerce.date(),
})

type FormData = z.infer<typeof schema>
```

### Context Usage
```typescript
// Use custom hooks that wrap context
const { user, userProfile } = useAuth()
const { isSidebarOpen, toggle } = useTabletSidebar()
```
