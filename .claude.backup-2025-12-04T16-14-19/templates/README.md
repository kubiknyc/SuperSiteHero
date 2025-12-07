# Code Templates

This directory contains code generation templates for rapid, consistent feature development.

## Available Templates

### 1. Feature Hook Template
**File**: [feature-hook.md](feature-hook.md)

**Purpose**: Generate React Query hooks following project patterns.

**Contains**:
- `useX(id)` - Fetch single entity
- `useXs(filters)` - Fetch collection
- `useCreateX()` - Create mutation
- `useUpdateX()` - Update mutation
- `useDeleteX()` - Delete mutation

**When to use**:
```
Create React Query hooks for equipment tracking using the feature-hook template
```

---

### 2. Feature Component Template
**File**: [feature-component.md](feature-component.md)

**Purpose**: Generate list pages, data tables, and dialogs.

**Contains**:
- List page with search and filters
- Data table with sorting
- Create dialog with form
- Proper loading/error/empty states

**When to use**:
```
Create the equipment list page using the feature-component template
```

---

### 3. Migration Template
**File**: [migration-template.md](migration-template.md)

**Purpose**: Create database migrations with proper RLS and multi-tenant isolation.

**Contains**:
- Table creation with proper structure
- Indexes for performance
- RLS policies for security
- Triggers for updated_at
- Multi-tenant isolation patterns

**When to use**:
```
Create a migration for equipment tracking using the migration-template
```

## How to Use Templates

### Basic Usage

Simply mention the template in your prompt to Claude:

```
Create [feature name] using the [template-name] template
```

### Examples

**Example 1: Complete Feature**
```
I want to add time tracking for workers. Please:
1. Create a migration using the migration-template
2. Create hooks using the feature-hook template
3. Create the UI using the feature-component template
```

**Example 2: Just the Backend**
```
Create a migration for document templates using the migration-template.
Include fields for name, content, category, and is_active.
```

**Example 3: Just the Frontend**
```
Create a submittals list page using the feature-component template.
The table should show name, status, due date, and submitted date.
```

## Template Patterns

All templates follow these principles:

### 1. Type Safety
- Full TypeScript types
- Proper interfaces
- Type imports from `@/types/database`

### 2. Multi-Tenant Isolation
- All tables include `company_id`
- RLS policies enforce isolation
- Queries filter by company

### 3. Consistent Patterns
- React Query for server state
- Optimistic updates
- Cache invalidation
- Toast notifications

### 4. Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Error states

### 5. Responsive Design
- Mobile-first approach
- Adapts to screen sizes
- Touch-friendly

## Customizing Templates

Templates are starting points. Feel free to customize:

1. **Add fields**: Include domain-specific fields
2. **Change validation**: Add business rules
3. **Modify UI**: Adjust layouts and styling
4. **Add relationships**: Join with other tables
5. **Enhance features**: Add search, filters, sorting

## Template Variables

When using templates, replace these placeholders:

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `{feature-name}` | `daily-report` | kebab-case feature name |
| `{FeatureName}` | `DailyReport` | PascalCase feature name |
| `{table_name}` | `daily_reports` | Database table name |
| `{Migration Description}` | `Add time tracking` | Human-readable description |

## Construction-Specific Examples

### Daily Reports
```
Create a daily report feature:
- Use migration-template for weather_conditions, crew_count, hours_worked
- Use feature-hook template for CRUD operations
- Use feature-component template for list and create dialog
```

### RFIs
```
Create an RFI (Request for Information) feature:
- Migration: question, response, due_date, status, priority
- Hooks: with status filtering (pending, answered, closed)
- Components: table with status badges and priority indicators
```

### Change Orders
```
Create a change order feature:
- Migration: description, estimated_cost, approved_cost, status, attachments
- Hooks: with approval workflow
- Components: multi-step form for creation and approval
```

### Safety Incidents
```
Create a safety incident feature:
- Migration: incident_type, severity, description, corrective_action, date
- Hooks: with severity filtering
- Components: form with photo upload
```

## Best Practices

### 1. Start with Migration
Always create the database schema first:
```
1. Create migration using template
2. Run migration in Supabase
3. Generate TypeScript types: /supabase-type-generator --all-tables
4. Create hooks using template
5. Create UI using template
```

### 2. Follow Naming Conventions
- **Database**: snake_case (`daily_reports`, `project_id`)
- **TypeScript**: PascalCase types (`DailyReport`), camelCase variables (`dailyReport`)
- **Files**: kebab-case (`daily-report.tsx`, `use-daily-report.ts`)

### 3. Test After Generation
```
npm run type-check  # Verify types
npm run lint        # Check code style
npm run dev         # Test in browser
```

### 4. Use Type Helpers
From `src/types/database.ts`:
```typescript
import type { CreateInput, UpdateInput, WithRelations } from '@/types/database'

// For create operations
type CreateDailyReportInput = CreateInput<DailyReport>

// For update operations
type UpdateDailyReportInput = UpdateInput<DailyReport>

// For queries with joins
type DailyReportWithProject = WithRelations<DailyReport, {
  project: Project
}>
```

### 5. Add to Documentation
After creating a feature:
1. Update `database-schema.md` with new table
2. Update `masterplan.md` if needed
3. Document any custom patterns

## Template Workflow Diagram

```
User Request
    ↓
Choose Template(s)
    ↓
1. Migration Template → Create Database Schema
    ↓
2. Run in Supabase → Apply Schema
    ↓
3. Generate Types → /supabase-type-generator
    ↓
4. Feature Hook Template → Create API Layer
    ↓
5. Feature Component Template → Create UI
    ↓
6. Test & Refine → npm run type-check
    ↓
Feature Complete!
```

## Adding New Templates

To create a new template:

1. Create a markdown file in this directory
2. Include clear purpose and usage instructions
3. Provide complete, working code examples
4. Document all placeholder variables
5. Add to this README

Example structure:
```markdown
# Template Name

## Purpose
...

## Pattern
\`\`\`typescript
// Complete code example
\`\`\`

## Usage
...

## Replacements
...
```

## Related Resources

- [Feature Hook Template](feature-hook.md)
- [Feature Component Template](feature-component.md)
- [Migration Template](migration-template.md)
- [Project Setup Guide](../PROJECT_SETUP_COMPLETE.md)
- [Slash Commands](../commands/README.md)
- [Specialized Agents](../agents/)

## Examples from This Project

See these implemented features as examples:

- **Projects**: [src/features/projects/](../../src/features/projects/)
- **Daily Reports**: (to be implemented)
- **RFIs**: (to be implemented)
- **Change Orders**: [src/features/change-orders/](../../src/features/change-orders/)

## Quick Reference

| Task | Command |
|------|---------|
| Create hooks | "Create hooks for [feature] using feature-hook template" |
| Create UI | "Create list page for [feature] using feature-component template" |
| Create migration | "Create migration for [feature] using migration-template" |
| Generate types | `/supabase-type-generator --all-tables` |
| Check types | `npm run type-check` |

---

**Pro Tip**: Combine templates with slash commands for maximum efficiency:
```
1. Create migration using migration-template
2. Run /supabase-type-generator --all-tables
3. Create hooks using feature-hook template
4. Create UI using feature-component template
5. Run /supabase-security-audit to verify RLS
```
