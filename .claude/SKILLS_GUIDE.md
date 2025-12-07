# Claude Code Skills Guide

## Overview

Skills are reusable workflows that help you accomplish common tasks efficiently. Your project now has **5 custom skills** designed specifically for your construction management platform.

## What Are Skills?

Skills are different from agents:
- **Agents**: Autonomous assistants with specialized knowledge (e.g., debugger, fullstack-developer)
- **Skills**: Reusable workflows and checklists for common tasks (e.g., create-feature, fix-bug)

Think of skills as "playbooks" that guide you through standard processes.

## Installed Skills

### 1. 🗄️ database-query

**Purpose**: Query the Supabase database directly

**When to use**:
- Need to inspect database tables
- Want to check data without UI
- Debug data issues
- Test RLS policies
- Analyze database structure

**How to invoke**:
```
"Use database-query skill to show all active projects"
"Use database-query skill to count users by role"
"Use database-query skill to describe the daily_reports table"
```

**What it does**:
1. Understands your query needs
2. Constructs appropriate SQL or Supabase query
3. Executes using Supabase/PostgreSQL MCP
4. Formats results in readable tables
5. Provides insights if needed

**Example output**:
```
Projects (5 results):
┌────────────────────────┬─────────────────┬──────────┬────────────┐
│ id                     │ name            │ status   │ created_at │
├────────────────────────┼─────────────────┼──────────┼────────────┤
│ 123e4567-e89b-12d3...  │ Office Tower    │ active   │ 2025-01-15 │
│ 234e5678-f90c-23e4...  │ Parking Garage  │ planning │ 2025-02-01 │
└────────────────────────┴─────────────────┴──────────┴────────────┘
```

---

### 2. ⚡ create-feature

**Purpose**: Create a complete new feature following project patterns

**When to use**:
- Building a new module (e.g., equipment tracking)
- Adding CRUD functionality
- Implementing construction workflows
- Creating database schema + frontend + backend

**How to invoke**:
```
"Use create-feature skill to build equipment tracking"
"Use create-feature skill to implement meeting minutes"
"Use create-feature skill to add safety observations"
```

**What it does**:
1. **Planning**: Understands requirements, checks for similar features
2. **Database**: Creates migration, RLS policies, updates types
3. **API/Hooks**: Creates React Query hooks (use*, useCreate*, useUpdate*, useDelete*)
4. **UI**: Creates page components and feature-specific UI
5. **Routing**: Adds routes and navigation
6. **Testing**: Optionally creates E2E tests

**Output structure**:
```
migrations/016_equipment_tracking.sql
src/types/database.ts (updated)
src/features/equipment-tracking/
├── hooks/
│   ├── useEquipment.ts
│   ├── useEquipments.ts
│   ├── useCreateEquipment.ts
│   ├── useUpdateEquipment.ts
│   └── useDeleteEquipment.ts
├── components/
│   ├── EquipmentForm.tsx
│   ├── EquipmentList.tsx
│   └── EquipmentCard.tsx
src/pages/equipment/
├── EquipmentPage.tsx
└── EquipmentDetailPage.tsx
src/App.tsx (routes added)
src/components/layout/AppLayout.tsx (navigation added)
```

**Quality guarantees**:
- Multi-tenant security (company_id)
- RLS policies
- Type safety
- Error handling
- Loading/empty states
- Mobile responsive

---

### 3. 🐛 fix-bug

**Purpose**: Debug and fix issues systematically

**When to use**:
- Fixing reported bugs
- Debugging errors
- Resolving test failures
- Investigating unexpected behavior

**How to invoke**:
```
"Use fix-bug skill to resolve the 403 error on project creation"
"Use fix-bug skill to debug failing E2E tests"
"Use fix-bug skill to fix the daily reports page crash"
```

**What it does**:
1. **Reproduce**: Understand error and affected code
2. **Gather context**: Check recent changes, related code
3. **Form hypothesis**: Identify likely causes
4. **Investigate**: Use debugger agent if needed
5. **Implement fix**: Make minimal, targeted changes
6. **Verify**: Test fix, check for regressions
7. **Prevent**: Add tests or validation

**Common issue types** it handles:
- Multi-tenant security issues (missing company_id)
- React Query cache problems
- Type errors
- Database query issues
- UI rendering problems
- Offline/sync issues

**Example flow**:
```
Problem: "403 error when creating projects"

Investigation:
- Reads error stack trace
- Checks project creation code
- Identifies missing company_id

Fix:
const { data } = await supabase.from('projects').insert({
  ...formData,
  company_id: userProfile.company_id // ← Added
});

Verification:
- Tests project creation works
- Verifies RLS policy is respected
- Adds test to prevent regression
```

---

### 4. 👀 review-code

**Purpose**: Comprehensive code review for quality, security, and best practices

**When to use**:
- Reviewing new code before commit
- Auditing existing features
- Checking security
- Ensuring code quality

**How to invoke**:
```
"Use review-code skill to review the new RFI feature"
"Use review-code skill to check security in the auth system"
"Use review-code skill to audit the daily reports module"
```

**What it reviews**:
1. **Architecture**: Project structure, patterns, consistency
2. **Security**: Multi-tenant isolation, RLS policies, input validation
3. **Type Safety**: Proper types, no `any`, null handling
4. **Error Handling**: Try-catch, user feedback, logging
5. **React Query**: Cache management, invalidation, optimistic updates
6. **Performance**: Query limits, memoization, code splitting
7. **Code Quality**: Naming, formatting, no dead code
8. **Testing**: Coverage, edge cases
9. **Mobile**: Responsive design, touch targets
10. **Offline**: Sync strategy if applicable

**Review output format**:
```markdown
## Code Review: RFI Feature

### ✅ Strengths
- Proper React Query hook structure
- Good error handling with toasts
- Mobile responsive design

### ❌ Critical Issues
1. Missing company_id in RFI creation
   - RLS will block inserts
   - Fix: Add company_id from userProfile

2. No RLS policy on rfis table
   - Security vulnerability
   - Fix: CREATE POLICY "Company isolation" ON rfis...

### ⚠️ Improvements Suggested
1. Add loading skeleton instead of spinner
2. Memoize filteredRFIs calculation
3. Consider offline support for field use

### 📋 Checklist
- [ ] Security: Missing RLS policy ❌
- [x] Architecture: Follows patterns ✅
- [x] Type Safety: Proper types ✅
- [ ] Multi-tenant: Missing company_id ❌

### 🎯 Recommendation
Changes requested (2 critical issues)
```

---

### 5. ⚡ optimize-performance

**Purpose**: Improve application performance

**When to use**:
- Slow page loads
- Large bundle size
- Slow database queries
- Poor mobile performance
- Low Lighthouse scores

**How to invoke**:
```
"Use optimize-performance skill to speed up the dashboard"
"Use optimize-performance skill to optimize slow daily reports query"
"Use optimize-performance skill to reduce bundle size"
```

**What it does**:
1. **Measure**: Baseline performance (Lighthouse, bundle size, query times)
2. **Identify**: Top bottlenecks using performance-optimizer agent
3. **Optimize**: Apply targeted improvements
4. **Verify**: Measure improvements, check for regressions

**Optimization areas**:

**Frontend**:
- Code splitting (lazy loading routes)
- Memoization (useMemo, React.memo, useCallback)
- Image optimization (lazy loading, compression)
- Virtual scrolling (for long lists)

**Database**:
- Add indexes on frequently queried columns
- Limit query results
- Prevent N+1 queries (use joins)
- Implement pagination

**React Query**:
- Prefetch likely next data
- Optimistic updates for instant feedback
- Selective cache invalidation

**Example improvements**:
```
## Performance Improvements

### Before
- Dashboard load: 4.2s
- Bundle size: 450KB
- Query time: 800ms
- Lighthouse: 65

### After
- Dashboard load: 1.8s (-57%) ⚡
- Bundle size: 180KB (-60%) 📦
- Query time: 120ms (-85%) 🚀
- Lighthouse: 94 (+45%) 💯

### Changes Made
1. Added code splitting for routes
2. Created index on daily_reports(project_id, report_date)
3. Memoized expensive filteredProjects calculation
4. Lazy loaded images with loading="lazy"
5. Limited dashboard queries to 50 results
```

---

### 6. 📝 generate-types

**Purpose**: Generate or update TypeScript types from database schema

**When to use**:
- After running database migrations
- Adding new tables
- Modifying table structures
- Fixing type mismatches

**How to invoke**:
```
"Use generate-types skill to regenerate all database types"
"Use generate-types skill to add types for equipment_tracking table"
"Use generate-types skill after running migration 015"
```

**What it does**:
1. **Generate**: Uses Supabase CLI to generate types
2. **Review**: Checks generated types are complete
3. **Merge**: Updates database.ts while preserving helper types
4. **Verify**: Runs type-check to ensure no errors
5. **Update**: Fixes any import or type issues

**Important**: Preserves helper types at bottom of database.ts:
```typescript
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<Omit<T, 'id'>>;
export type WithRelations<T, R> = T & R;
```

---

## How to Use Skills

### Invoking a Skill

**Direct invocation**:
```
"Use [skill-name] skill to [task]"
```

**Context-based invocation**:
Claude may suggest using a skill:
```
Claude: "I can use the create-feature skill to build this. Should I proceed?"
You: "Yes, go ahead"
```

### Skill vs Agent

| Use Skill | Use Agent |
|-----------|-----------|
| Standard workflow | Complex investigation |
| Follow checklist | Need specialized knowledge |
| Repeatable process | Multi-step autonomous work |
| Quick task | Deep analysis |

**Example**:
- Creating a feature → Use `create-feature` skill
- Debugging complex architecture issue → Use `debugger` agent

### Combining Skills

You can chain skills for complex workflows:

```
1. "Use create-feature skill to build equipment tracking"
   → Creates feature structure

2. "Use review-code skill to audit the equipment tracking feature"
   → Reviews for quality and security

3. "Use optimize-performance skill if dashboard is slow"
   → Optimizes after adding feature
```

## Skills for Common Tasks

### Building New Features
1. **create-feature** - Build complete feature
2. **generate-types** - Update types after migration
3. **review-code** - Audit before commit

### Debugging Issues
1. **fix-bug** - Systematic debugging
2. **database-query** - Check data
3. **review-code** - Find potential issues

### Improving Quality
1. **review-code** - Code quality audit
2. **optimize-performance** - Speed improvements
3. **fix-bug** - Fix identified issues

### Database Work
1. **database-query** - Query and inspect
2. **generate-types** - Update TypeScript types
3. **optimize-performance** - Add indexes, optimize queries

## Skill Configuration

Skills are stored in `.claude/skills/` directory:

```
.claude/skills/
├── database-query.md
├── create-feature.md
├── fix-bug.md
├── review-code.md
├── optimize-performance.md
└── generate-types.md
```

Each skill is a markdown file with:
- Purpose and usage
- Examples
- Execution steps
- Best practices
- Checklists

## Creating Custom Skills

You can create your own skills:

```markdown
# My Custom Skill

Brief description of what this skill does.

## Usage

When to use this skill and examples.

## Execution

Step-by-step process:
1. First step
2. Second step
3. Third step

## Checklist

- [ ] Item 1
- [ ] Item 2
```

Save to `.claude/skills/my-skill.md` and invoke with:
```
"Use my-skill skill to [task]"
```

## Best Practices

### 1. Use Skills for Standard Workflows
If you're doing the same type of task repeatedly, use a skill:
- Creating features → create-feature
- Fixing bugs → fix-bug
- Code reviews → review-code

### 2. Let Skills Guide You
Skills have checklists and best practices built in. Follow them for quality and consistency.

### 3. Combine with Agents
Use skills for the workflow, agents for specialized knowledge:
```
"Use create-feature skill to build the feature"
"Use security-specialist agent to audit it deeply"
```

### 4. Update Skills
If you develop better patterns, update the skill files to reflect them.

## Quick Reference

| Task | Skill | Agent (if needed) |
|------|-------|-------------------|
| Build feature | create-feature | fullstack-developer |
| Fix bug | fix-bug | debugger |
| Review code | review-code | security-specialist |
| Optimize speed | optimize-performance | performance-optimizer |
| Query database | database-query | - |
| Update types | generate-types | - |

## Tips

1. **Be specific**: "Use create-feature skill to build equipment tracking with photo uploads"
2. **Check output**: Review what the skill generates
3. **Iterate**: Skills create starting points you can refine
4. **Combine**: Chain skills for complex workflows
5. **Customize**: Edit skill files to match your needs

---

**Skills Installed**: 6
**Location**: `.claude/skills/`
**Status**: ✅ Ready to use
**Last Updated**: 2025-12-04
