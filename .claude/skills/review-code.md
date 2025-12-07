# Review Code Skill

Perform comprehensive code review focusing on architecture, security, and best practices.

## Usage

Invoke this skill when you need to:
- Review new code before committing
- Audit existing features
- Identify potential issues
- Ensure code quality

## Examples

**Feature review**:
```
Use review-code skill to review the new RFI feature
```

**Security audit**:
```
Use review-code skill to check security in the auth system
```

**Architecture review**:
```
Use review-code skill to audit the daily reports module
```

## Review Checklist

### 1. Architecture & Patterns

**Check**:
- [ ] Follows project structure (features/<feature>/hooks, components)
- [ ] Uses React Query for server state
- [ ] Follows hook naming conventions (useEntity, useEntities, useCreateEntity)
- [ ] Components in appropriate locations
- [ ] Imports use @/ path alias
- [ ] No circular dependencies

**From CLAUDE.md**:
```
src/features/<feature>/
├── hooks/           # React Query hooks
├── components/      # Feature-specific UI
└── types.ts         # Local types if needed
```

### 2. Multi-Tenant Security

**Critical Checks**:
- [ ] Every INSERT includes company_id from userProfile
- [ ] RLS policies exist for all tables
- [ ] No queries bypass RLS
- [ ] User can only access their company data
- [ ] Project assignments checked for project-level access

**Red Flags**:
```typescript
// ❌ BAD - Missing company_id
await supabase.from('projects').insert(data);

// ✅ GOOD - Includes company_id
await supabase.from('projects').insert({
  ...data,
  company_id: userProfile.company_id
});
```

### 3. Type Safety

**Check**:
- [ ] All types imported from database.ts
- [ ] No `any` types (unless absolutely necessary)
- [ ] Optional fields handled with `?` or `??`
- [ ] Helper types used (CreateInput, UpdateInput)
- [ ] API responses properly typed

**Type Patterns**:
```typescript
import type { Database } from '@/types/database';
type Project = Database['public']['Tables']['projects']['Row'];
type CreateProject = CreateInput<Project>;
```

### 4. Error Handling

**Check**:
- [ ] All async operations have try-catch or error handling
- [ ] Errors shown to user with toast notifications
- [ ] Technical details logged, not exposed to user
- [ ] Loading states shown during operations
- [ ] Error states have retry options

**Pattern**:
```typescript
try {
  const { data, error } = await operation();
  if (error) throw error;
  toast.success('Operation successful');
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('Operation failed. Please try again.');
}
```

### 5. React Query Usage

**Check**:
- [ ] Query keys are consistent and unique
- [ ] Mutations invalidate correct queries
- [ ] Optimistic updates where appropriate
- [ ] `enabled` flag used to prevent premature fetches
- [ ] Proper stale time configured

**Query Invalidation**:
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries(['entities']); // List
  queryClient.invalidateQueries(['entity', data.id]); // Single
}
```

### 6. Performance

**Check**:
- [ ] Database queries use LIMIT
- [ ] Expensive computations memoized with useMemo
- [ ] Components memoized with React.memo if appropriate
- [ ] Images lazy loaded
- [ ] Routes code-split with lazy()
- [ ] Lists virtualized if large (>100 items)

**Database Performance**:
```typescript
// Add LIMIT to queries
.select('*')
.order('created_at', { ascending: false })
.limit(50) // ← Always limit
```

### 7. Security

**Check**:
- [ ] No secrets in frontend code
- [ ] No SQL injection vulnerabilities
- [ ] Input validation on all forms
- [ ] XSS prevention (React escapes by default)
- [ ] File uploads validated (type, size)
- [ ] Authentication checked on protected routes

**Use security-specialist agent for deep audit**

### 8. Mobile/Offline Considerations

**Check**:
- [ ] Responsive design (mobile-first)
- [ ] Touch targets ≥ 48px
- [ ] Works offline if applicable
- [ ] Forms have auto-save or draft support
- [ ] Photos compressed before upload
- [ ] Sync queue for offline mutations

### 9. Code Quality

**Check**:
- [ ] Functions are small and focused
- [ ] Variables have descriptive names
- [ ] No commented-out code
- [ ] No console.log() in production code
- [ ] Consistent formatting (Prettier)
- [ ] No ESLint errors

### 10. Testing

**Check**:
- [ ] E2E tests for critical flows
- [ ] Unit tests for complex logic
- [ ] Edge cases handled
- [ ] Error scenarios tested
- [ ] Mobile viewport tested

## Review Process

### Step 1: Understand the Change
- Read the code thoroughly
- Understand the intent
- Check related files
- Review git diff if applicable

### Step 2: Run Automated Checks
```bash
npm run type-check    # TypeScript errors
npm run lint          # ESLint issues
npm run build         # Build errors
npm run test          # Test failures
```

### Step 3: Security Review
Use security-specialist agent:
```
"Use security-specialist to audit this feature"
```

Key areas:
- RLS policies
- company_id inclusion
- Input validation
- Authentication checks

### Step 4: Architecture Review
- Does it follow project patterns?
- Is it in the right location?
- Are hooks structured correctly?
- Is it consistent with existing code?

### Step 5: Testing
- Test happy path
- Test error cases
- Test edge cases
- Test on mobile viewport
- Test offline if applicable

### Step 6: Provide Feedback

**Good Feedback Format**:
```
✅ Positive findings
❌ Issues to fix
⚠️ Suggestions for improvement
📝 Questions/clarifications
```

**Example**:
```
✅ Good use of React Query hooks
✅ Proper error handling with toasts
❌ Missing company_id in project creation
❌ No RLS policy on equipment_tracking table
⚠️ Consider adding loading skeleton
⚠️ Could memoize the filteredItems calculation
📝 Should this be accessible offline?
```

## Common Issues to Watch For

### Critical (Must Fix)
1. Missing company_id in INSERT
2. No RLS policies
3. SQL injection vulnerabilities
4. Secrets in code
5. Type errors

### Important (Should Fix)
1. Missing error handling
2. No loading states
3. Unhandled null/undefined
4. Performance issues (N+1 queries)
5. No cache invalidation

### Nice to Have (Suggestions)
1. Add optimistic updates
2. Improve error messages
3. Add loading skeletons
4. Memoize computations
5. Add comments for complex logic

## Review Report Template

```markdown
## Code Review: [Feature Name]

### Overview
Brief description of what was reviewed.

### ✅ Strengths
- What was done well
- Good patterns used
- Positive findings

### ❌ Critical Issues
1. Issue description
   - Why it's critical
   - How to fix

### ⚠️ Improvements Suggested
1. Suggestion
   - Why it matters
   - How to improve

### 📋 Checklist
- [ ] Architecture follows project patterns
- [ ] Multi-tenant security verified
- [ ] Type safety confirmed
- [ ] Error handling adequate
- [ ] Performance acceptable
- [ ] Tests present
- [ ] Mobile responsive
- [ ] Offline support (if needed)

### 🎯 Recommendation
- [ ] Approve (ready to merge)
- [ ] Approve with minor changes
- [ ] Changes requested (needs fixes)
```

## When to Use Specialized Agents

- **Security issues**: security-specialist
- **Performance concerns**: performance-optimizer
- **Complex architecture**: fullstack-developer
- **Offline features**: offline-sync-specialist
- **Construction workflows**: construction-domain-expert

## Final Checks

Before approving code:
- [ ] No security vulnerabilities
- [ ] No performance red flags
- [ ] Follows project patterns
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Multi-tenant security verified
- [ ] Mobile responsive
- [ ] Error handling present
- [ ] Code quality acceptable
