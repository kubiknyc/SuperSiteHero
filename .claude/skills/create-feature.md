# Create Feature Skill

Create a complete new feature following the project's architecture patterns.

## Usage

Invoke this skill when you need to:
- Build a new feature from scratch
- Add CRUD functionality
- Implement a construction workflow (RFI, submittal, etc.)
- Create database schema + frontend + backend

## Examples

**New feature**:
```
Use create-feature skill to build equipment tracking
```

**Construction workflow**:
```
Use create-feature skill to implement meeting minutes
```

**CRUD module**:
```
Use create-feature skill to add safety observations
```

## Execution Steps

When this skill is invoked:

### 1. Planning
- Understand feature requirements
- Check if construction-domain-expert input needed
- Review similar existing features
- Plan database schema

### 2. Database Layer
- Create migration file in `migrations/`
- Define tables with proper columns
- Add RLS policies for multi-tenant security
- Create indexes for performance
- Update `src/types/database.ts`

### 3. API/Hooks Layer
- Create feature directory: `src/features/<feature-name>/`
- Implement React Query hooks:
  - `use<Entity>.ts` - Fetch single
  - `use<Entities>.ts` - Fetch collection
  - `useCreate<Entity>.ts` - Create mutation
  - `useUpdate<Entity>.ts` - Update mutation
  - `useDelete<Entity>.ts` - Delete mutation
- Include company_id in all creates

### 4. UI Layer
- Create page component: `src/pages/<feature>/<Feature>Page.tsx`
- Create detail page if needed: `src/pages/<feature>/<Feature>DetailPage.tsx`
- Build UI components in `src/features/<feature>/components/`
- Use shadcn/ui components
- Implement mobile-first responsive design

### 5. Routing & Navigation
- Add routes to `src/App.tsx`
- Add navigation item to `src/components/layout/AppLayout.tsx`
- Use appropriate icon from lucide-react

### 6. Testing (Optional but Recommended)
- Create E2E tests: `tests/e2e/<feature>.spec.ts`
- Test CRUD operations
- Test offline functionality if applicable

### 7. Documentation
- Add feature to README or docs
- Document any special patterns used

## Project Architecture

Follow these patterns from CLAUDE.md:

**Feature Structure**:
```
src/features/<feature>/
├── hooks/
│   ├── use<Entity>.ts
│   ├── use<Entities>.ts
│   ├── useCreate<Entity>.ts
│   ├── useUpdate<Entity>.ts
│   └── useDelete<Entity>.ts
├── components/
│   ├── <Entity>Form.tsx
│   ├── <Entity>List.tsx
│   └── <Entity>Card.tsx
└── types.ts (if needed)
```

**Hook Pattern**:
```typescript
// Always include company_id
export function useCreateEntity() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => supabase
      .from('entities')
      .insert({ ...data, company_id: userProfile.company_id })
      .select()
      .single(),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities']);
    }
  });
}
```

**RLS Policy Pattern**:
```sql
CREATE POLICY "Company isolation"
ON entities FOR ALL
USING (company_id = (
  SELECT company_id FROM users WHERE id = auth.uid()
));
```

## Important Considerations

- **Multi-tenant**: Always include company_id
- **Offline-first**: Consider offline support for field use
- **Mobile-first**: Design for tablets/phones
- **Security**: RLS policies are mandatory
- **Performance**: Add database indexes
- **Validation**: Validate all inputs
- **Error handling**: User-friendly messages
- **Loading states**: Show spinners/skeletons
- **Empty states**: Handle no data gracefully

## Construction App Specifics

If building construction workflows, ensure:
- Proper terminology (from construction-domain-expert)
- Photo attachment support
- PDF export capabilities
- Status workflows (draft, submitted, approved, etc.)
- Notification triggers
- Audit trail (who, when, what)
- Sequential numbering by project
- Mobile-optimized forms

## Quality Checklist

Before completing:
- [ ] Database migration created
- [ ] Types updated in database.ts
- [ ] RLS policies added
- [ ] React Query hooks implemented
- [ ] UI components created
- [ ] Routes added
- [ ] Navigation updated
- [ ] Mobile responsive
- [ ] Error handling included
- [ ] Loading states added
- [ ] Empty states handled
- [ ] Multi-tenant security verified
- [ ] Tested basic CRUD operations
