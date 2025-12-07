# Fix Bug Skill

Debug and fix issues in the codebase systematically.

## Usage

Invoke this skill when you need to:
- Fix a reported bug
- Debug an error
- Resolve test failures
- Investigate unexpected behavior

## Examples

**Error investigation**:
```
Use fix-bug skill to resolve the 403 error on project creation
```

**Test failure**:
```
Use fix-bug skill to debug failing E2E tests
```

**UI issue**:
```
Use fix-bug skill to fix the daily reports page crash
```

## Execution Steps

When this skill is invoked:

### 1. Reproduce & Understand
- Read error message and stack trace carefully
- Identify affected files and line numbers
- Understand what the code is trying to do
- Determine expected vs actual behavior

### 2. Gather Context
- Check recent commits (git log)
- Review related code files
- Check for similar issues in the codebase
- Look for error patterns

### 3. Form Hypothesis
- What is causing the issue?
- What changed recently?
- Is it a logic error, type error, or runtime error?
- Is it environment-specific?

### 4. Investigate
Use appropriate tools:
- **debugger agent** for complex issues
- **Grep** to find related code
- **Read** to examine files
- **Bash** to run tests
- **Database query skill** for data issues
- **Sequential Thinking MCP** for complex debugging

### 5. Implement Fix
- Make minimal changes to fix the issue
- Don't refactor unrelated code
- Preserve existing behavior
- Add comments if logic is complex

### 6. Verify Fix
- Test the specific issue is resolved
- Run related tests
- Check for regressions
- Test edge cases

### 7. Prevent Future Issues
- Add tests if missing
- Improve error messages
- Add validation if needed
- Document gotchas

## Common Issue Types

### Multi-Tenant Security Issues
**Symptom**: 403 errors, can't access data
**Check**:
- Is company_id included in INSERT?
- Are RLS policies correct?
- Is user profile loaded?
- Is auth token valid?

**Fix**:
```typescript
// Add company_id
const { data } = await supabase
  .from('table')
  .insert({
    ...formData,
    company_id: userProfile.company_id // ← Add this
  });
```

### React Query Issues
**Symptom**: Stale data, cache not updating
**Check**:
- Are query keys correct?
- Is invalidation happening?
- Are mutations triggering updates?

**Fix**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries(['entities']);
  queryClient.invalidateQueries(['entity', data.id]);
}
```

### Type Errors
**Symptom**: TypeScript compilation errors
**Check**:
- Are types in database.ts updated?
- Are imports correct?
- Are optional fields handled?

**Fix**:
```typescript
// Use proper types from database.ts
import type { Database } from '@/types/database';
type Project = Database['public']['Tables']['projects']['Row'];
```

### Database Issues
**Symptom**: Query errors, missing data
**Check**:
- Does table exist?
- Are columns correct?
- Are relationships correct?
- Are indexes present?

**Fix**:
- Run migration
- Update schema
- Add missing indexes

### UI Rendering Issues
**Symptom**: Page crashes, blank screen
**Check**:
- Are loading states handled?
- Are error states handled?
- Are null/undefined values checked?
- Are arrays mapped safely?

**Fix**:
```typescript
// Handle all states
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
if (!data?.length) return <EmptyState />;
return <DataList items={data} />;
```

### Offline/Sync Issues
**Symptom**: Data not syncing, offline errors
**Check**:
- Is IndexedDB working?
- Is service worker active?
- Is sync queue processing?
- Are conflict resolution rules correct?

**Fix**: Use offline-sync-specialist agent

## Debugging Tools

### For Frontend Issues
- React DevTools (check component state)
- Browser console (check errors)
- Network tab (check API calls)
- Playwright (test automation)

### For Backend/Database Issues
- Supabase Dashboard (check data)
- PostgreSQL MCP (run queries)
- Database logs (check errors)
- RLS policies (verify security)

### For Type Issues
- `npm run type-check` (find type errors)
- VS Code (hover for types)
- database.ts (source of truth)

## Fix Patterns

### Pattern 1: Missing Null Check
```typescript
// Before (crashes if null)
const name = user.profile.name;

// After (safe)
const name = user?.profile?.name ?? 'Unknown';
```

### Pattern 2: Missing company_id
```typescript
// Before (RLS blocks)
await supabase.from('projects').insert(data);

// After (works)
await supabase.from('projects').insert({
  ...data,
  company_id: userProfile.company_id
});
```

### Pattern 3: Stale Cache
```typescript
// Before (data doesn't update)
await updateProject(id, changes);

// After (cache updates)
await updateProject(id, changes);
queryClient.invalidateQueries(['projects']);
queryClient.invalidateQueries(['project', id]);
```

### Pattern 4: Missing Error Handling
```typescript
// Before (silent failure)
const { data } = await supabase.from('table').select();

// After (user notified)
const { data, error } = await supabase.from('table').select();
if (error) {
  console.error('Query failed:', error);
  toast.error('Failed to load data');
  return;
}
```

## When to Escalate

Use specialized agents for:
- **Complex bugs**: debugger agent
- **Security issues**: security-specialist agent
- **Performance problems**: performance-optimizer agent
- **Offline issues**: offline-sync-specialist agent
- **Architecture questions**: fullstack-developer agent

## Testing Checklist

After fixing:
- [ ] Original issue is resolved
- [ ] No new errors introduced
- [ ] Related tests pass
- [ ] Manual testing confirms fix
- [ ] Edge cases handled
- [ ] Error messages helpful
- [ ] Performance acceptable
