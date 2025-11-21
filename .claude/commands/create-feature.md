# Create New Feature

You are tasked with creating a complete new feature for the construction management platform following the established architecture patterns.

## Instructions

1. **Understand the Feature Requirements**
   - Ask the user what feature they want to create
   - Clarify the database tables involved
   - Understand the user roles that will interact with this feature

2. **Create Database Types** (if needed)
   - Add new interfaces to `src/types/database.ts`
   - Include in the `Database['public']['Tables']` type
   - Define Row, Insert, and Update types
   - Add any new enum types

3. **Create Feature Directory Structure**
   ```
   src/features/<feature-name>/
   ├── hooks/
   │   └── use<FeatureName>.ts
   ├── components/
   │   ├── <FeatureName>List.tsx
   │   ├── <FeatureName>Detail.tsx
   │   └── Create<FeatureName>Dialog.tsx
   └── types.ts (if needed)
   ```

4. **Implement React Query Hooks**
   - `use<Feature>(id)` - Fetch single entity
   - `use<Features>()` - Fetch collection (filtered by company_id)
   - `useCreate<Feature>()` - Create with company_id
   - `useUpdate<Feature>()` - Update with cache invalidation
   - `useDelete<Feature>()` - Delete with cleanup

5. **Create Page Components**
   - Create page in `src/pages/<feature>/`
   - Include proper loading, error, and empty states
   - Use shadcn/ui components consistently

6. **Update Routing**
   - Add route to `src/App.tsx` wrapped in `<ProtectedRoute>`
   - Add navigation item to `src/components/layout/AppLayout.tsx`
   - Choose appropriate Lucide icon

7. **Follow Security Requirements**
   - Always include `company_id` from `userProfile`
   - Filter queries by user's assigned projects if applicable
   - Respect role-based access control

8. **Test the Implementation**
   - Run `npm run type-check` to verify types
   - Test CRUD operations in the UI
   - Verify multi-tenant isolation

## Architecture Reminders

- Use `@/` path alias for imports
- Use `cn()` for className merging
- Use `useToast()` for notifications
- Use `date-fns` for date formatting
- Keep forms simple with controlled components
- Use `CreateInput<T>` and `UpdateInput<T>` helper types

## Example Feature Creation

If creating a "Materials" feature:
1. Add Material interface to database.ts
2. Create src/features/materials/hooks/useMaterials.ts
3. Create Material list and create dialog components
4. Add /materials route
5. Add Materials nav item with Package icon
