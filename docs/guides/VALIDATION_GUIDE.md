# Validation Guide - Zod Input Validation

## Overview

Your app now has a **comprehensive validation system** using Zod that validates data before sending to the API.

### Key Features
- ✅ Type-safe validation schemas
- ✅ Custom validation hooks
- ✅ Field-level validation with error messages
- ✅ Real-time validation with debounce
- ✅ Integration with API error handling
- ✅ Styled error components
- ✅ Full TypeScript support

## Why Validation Matters

```
Client-side validation:
✓ Instant user feedback
✓ Better UX
✓ Reduced server load
✓ Prevents invalid data

Server-side validation (API):
✓ Security
✓ Data integrity
✓ Business rule enforcement
✓ Error recovery

Best practice: Both! (Defense in depth)
```

## Files Created

```
src/lib/validation/
├── schemas.ts              # Zod schemas for all entities
├── useFormValidation.ts    # Custom validation hooks
├── validateAndCall.ts      # API integration utilities
└── index.ts                # Central exports

src/components/form/
└── ValidationError.tsx     # Error display components

src/features/projects/components/
└── CreateProjectDialog.validated.tsx  # Complete example
```

## Quick Start

### 1. Import Validation Schema

```typescript
import { projectCreateSchema, type ProjectCreateInput } from '@/lib/validation'

// TypeScript knows the shape of ProjectCreateInput
const data: ProjectCreateInput = {
  name: 'My Project',
  address: '123 Main St',
  // ... other fields
}
```

### 2. Use Validation Hook in Component

```typescript
import { useFormValidation } from '@/lib/validation'
import { projectCreateSchema } from '@/lib/validation'
import { InputWithError } from '@/components/form/ValidationError'

export function CreateProjectForm() {
  const { errors, validate, getFieldError } = useFormValidation(projectCreateSchema)
  const [formData, setFormData] = useState({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validate(formData)
    if (!validation.success) {
      // Errors are in state, component re-renders to show them
      return
    }

    // Data is validated, proceed with API call
    await api.createProject(validation.data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <InputWithError
        name="name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        error={getFieldError('name')}
        placeholder="Project name"
      />
    </form>
  )
}
```

### 3. Display Errors

```typescript
import { ValidationError, InputWithError, TextareaWithError } from '@/components/form/ValidationError'

// Option A: Show single error
<ValidationError error={getFieldError('name')} />

// Option B: Show multiple errors
<ValidationError errors={errors['name']} />

// Option C: Use error-aware input components
<InputWithError
  error={getFieldError('name')}
  placeholder="Project name"
/>

<TextareaWithError
  error={getFieldError('description')}
  placeholder="Description"
/>
```

## Available Schemas

### Projects

```typescript
import {
  projectCreateSchema,
  projectUpdateSchema,
  type ProjectCreateInput,
  type ProjectUpdateInput
} from '@/lib/validation'

// For creating projects
const createData: ProjectCreateInput = {
  name: 'New Project',          // Required, 3-200 chars
  project_number: 'P-2024-001', // Optional
  description: '...',           // Optional, max 1000 chars
  address: '123 Main St',       // Optional
  city: 'New York',             // Optional
  state: 'NY',                  // Optional, 2 chars
  zip_code: '10001',            // Optional
  start_date: '2024-01-15',     // Optional, must be valid date
  estimated_end_date: '2024-12-31', // Optional
  status: 'active',             // Optional: planning|active|on_hold|completed|archived
}

// For updating (all fields optional)
const updateData: ProjectUpdateInput = {
  name: 'Updated Name', // Just change what you need
}
```

### Daily Reports

```typescript
import {
  dailyReportCreateSchema,
  dailyReportUpdateSchema,
  type DailyReportCreateInput,
  type DailyReportUpdateInput
} from '@/lib/validation'

const reportData: DailyReportCreateInput = {
  project_id: 'uuid-here',      // Required
  report_date: '2024-01-15',    // Required, cannot be future date
  weather_condition: 'Sunny',   // Optional, max 100 chars
  temperature_high: 75,         // Optional, -100 to 150°F
  temperature_low: 65,          // Optional, -100 to 150°F
  total_workers: 45,            // Optional, must be whole number, 0-10000
  weather_delays: false,        // Optional
  other_delays: '...',          // Optional, max 500 chars
  notes: '...',                 // Optional, max 2000 chars
  status: 'draft',              // Optional: draft|submitted|in_review|approved|rejected
}
```

### Change Orders

```typescript
import {
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  type ChangeOrderCreateInput,
  type ChangeOrderUpdateInput
} from '@/lib/validation'

const coData: ChangeOrderCreateInput = {
  project_id: 'uuid-here',        // Required
  workflow_type_id: 'uuid-here',  // Required
  title: 'Scope Change',          // Required, 5-255 chars
  description: '...',             // Optional, max 2000 chars
  priority: 'high',               // Optional: low|normal|high
  cost_impact: 5000,              // Optional, 0 to 10M
  schedule_impact: '2 weeks',     // Optional, max 500 chars
  assignees: ['user-id-1', 'user-id-2'], // Optional
}
```

## Validation Hooks

### useFormValidation

For validating entire forms:

```typescript
const {
  errors,              // Object with all validation errors
  isValidating,        // Boolean, true during debounced validation
  validate,            // Function to validate entire form
  validateField,       // Function to validate single field (debounced)
  clearErrors,         // Clear all errors
  clearFieldError,     // Clear specific field error
  getFieldError,       // Get error message for field
  hasFieldError,       // Check if field has error
  hasErrors,           // Check if form has any errors
  getErrorSummary,     // Get all errors as formatted string
} = useFormValidation(schema, { showNotification: true })
```

Example:

```typescript
export function MyForm() {
  const { errors, validate, getFieldError, clearFieldError } =
    useFormValidation(projectCreateSchema)

  const [formData, setFormData] = useState({})

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({...prev, [field]: value}))

    // Real-time validation as user types
    clearFieldError(field)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const result = validate(formData)
    if (!result.success) {
      return // Errors displayed automatically
    }

    // Proceed with API call
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with error display */}
    </form>
  )
}
```

### useFieldValidation

For field-level validation during typing:

```typescript
const {
  fieldErrors,      // Object with errors per field
  validateField,    // Validate single field
  clearFieldError,  // Clear field error
  hasFieldError,    // Check if field has error
  getFieldError,    // Get error message
} = useFieldValidation(schema)
```

Example:

```typescript
export function LiveValidationForm() {
  const { fieldErrors, validateField, getFieldError } =
    useFieldValidation(projectCreateSchema)

  return (
    <input
      name="name"
      onChange={(e) => {
        // Validate as user types
        validateField('name', e.target.value)
      }}
      className={getFieldError('name') ? 'border-red-500' : 'border-gray-300'}
    />
  )
}
```

## Error Display Components

### ValidationError

Display one or more error messages:

```typescript
// Single error
<ValidationError error="Project name is required" />

// Multiple errors
<ValidationError errors={['Too short', 'Invalid format']} />

// With custom styling
<ValidationError error={error} className="text-sm font-medium" />
```

### InputWithError

Input component with built-in error display:

```typescript
<InputWithError
  name="name"
  value={formData.name}
  onChange={handleChange}
  placeholder="Project name"
  error={getFieldError('name')}
  required
/>
```

### TextareaWithError

Textarea with error display:

```typescript
<TextareaWithError
  name="description"
  value={formData.description}
  onChange={handleChange}
  placeholder="Description"
  rows={4}
  error={getFieldError('description')}
/>
```

### SelectWithError

Select dropdown with error display:

```typescript
<SelectWithError
  name="status"
  value={formData.status}
  onChange={handleChange}
  error={getFieldError('status')}
>
  <option value="planning">Planning</option>
  <option value="active">Active</option>
</SelectWithError>
```

## Validation Utilities

### validateAndCall

Validate then call API:

```typescript
import { validateAndCall, projectCreateSchema } from '@/lib/validation'
import { projectsApi } from '@/lib/api'

const result = await validateAndCall(
  formData,
  projectCreateSchema,
  (validatedData) => projectsApi.createProject(validatedData)
)

if (result.success) {
  console.log('Created:', result.data)
} else {
  console.log('Validation errors:', result.errors)
}
```

### createValidatedAPI

Create a validated API function:

```typescript
import { createValidatedAPI, projectCreateSchema } from '@/lib/validation'
import { projectsApi } from '@/lib/api'

// Create validated version of API function
const createProjectValidated = createValidatedAPI(
  projectCreateSchema,
  (data) => projectsApi.createProject(data)
)

// Use it
const result = await createProjectValidated(formData)
```

### mergeErrors

Merge validation and API errors:

```typescript
import { mergeErrors } from '@/lib/validation'

const validationErrors = validate(formData).errors
const apiError = error as ApiErrorClass

const allErrors = mergeErrors(validationErrors, apiError)
// Shows both validation and API errors
```

### hasErrors, getFirstError

Utility functions:

```typescript
import { hasErrors, getFirstError, formatValidationErrors } from '@/lib/validation'

const errors = { name: ['Required'], email: ['Invalid'] }

if (hasErrors(errors)) {
  const firstError = getFirstError(errors)
  const summary = formatValidationErrors(errors)
}
```

## Complete Form Example

```typescript
import { useState } from 'react'
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { InputWithError, TextareaWithError } from '@/components/form/ValidationError'
import { useCreateProjectWithNotification } from '@/features/projects/hooks/useProjectsMutations'

export function CreateProjectForm() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
  })

  // Validation
  const { errors, validate, getFieldError, clearFieldError } =
    useFormValidation(projectCreateSchema)

  // API mutation with notifications
  const createProject = useCreateProjectWithNotification()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({...prev, [name]: value}))
    clearFieldError(name) // Clear error when user corrects it
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate
    const validation = validate(formData)
    if (!validation.success) {
      return // Errors displayed in inputs
    }

    // Call API (notifications shown automatically)
    await createProject.mutateAsync(validation.data)

    // Reset form
    setFormData({ name: '', address: '', description: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputWithError
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={getFieldError('name')}
        placeholder="Project name"
        required
      />

      <InputWithError
        name="address"
        value={formData.address}
        onChange={handleChange}
        error={getFieldError('address')}
        placeholder="Address"
      />

      <TextareaWithError
        name="description"
        value={formData.description}
        onChange={handleChange}
        error={getFieldError('description')}
        placeholder="Description"
        rows={4}
      />

      <button type="submit" disabled={createProject.isPending}>
        {createProject.isPending ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}
```

## Custom Validation Rules

### Extend Existing Schema

```typescript
import { projectCreateSchema } from '@/lib/validation'
import { z } from 'zod'

const customProjectSchema = projectCreateSchema.extend({
  budget: z.number().min(0, 'Budget must be positive'),
  contractor_name: z.string().min(1, 'Contractor is required'),
})

type CustomProjectInput = z.infer<typeof customProjectSchema>
```

### Create Custom Schema

```typescript
import { z } from 'zod'

const contactSchema = z.object({
  email: z
    .string()
    .email('Invalid email')
    .refine(
      async (email) => {
        // Custom async validation
        const exists = await checkEmailExists(email)
        return !exists
      },
      'Email already in use'
    ),
  name: z.string().min(1),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits'),
})
```

## Best Practices

### 1. Always Validate Before API Calls
```typescript
const validation = validate(formData)
if (!validation.success) {
  return // Show errors
}
// Data is guaranteed to match schema
await api.call(validation.data)
```

### 2. Clear Field Errors When User Corrects
```typescript
const handleChange = (field: string, value: any) => {
  setFormData(prev => ({...prev, [field]: value}))
  clearFieldError(field) // Clear when user starts correcting
}
```

### 3. Use Type-Specific Inputs
```typescript
// ✓ Use typed inputs
<InputWithError type="email" error={getFieldError('email')} />
<InputWithError type="date" error={getFieldError('date')} />

// ✗ Don't use generic text inputs
<input type="text" />
```

### 4. Provide Clear Error Messages
```typescript
// ✓ Specific
const nameSchema = z.string().min(3, 'Name must be at least 3 characters')

// ✗ Generic
const nameSchema = z.string().min(3, 'Invalid')
```

### 5. Combine Client and Server Validation
```typescript
// Client validates structure
const validation = validate(formData)

// Server validates business rules
try {
  await api.call(validation.data)
} catch (error) {
  // Show server validation errors alongside client errors
  const allErrors = mergeErrors(validation.errors, error)
}
```

## Testing

### Testing Validation

```typescript
import { projectCreateSchema } from '@/lib/validation'

describe('projectCreateSchema', () => {
  it('accepts valid project data', () => {
    const validData = {
      name: 'My Project',
      address: '123 Main St',
    }

    const result = projectCreateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects invalid project data', () => {
    const invalidData = {
      name: '', // Too short
    }

    const result = projectCreateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    expect(result.error.errors[0].message).toContain('required')
  })
})
```

## Migration from Old Forms

### Before (No Validation)
```typescript
const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await api.createProject(formData)
  } catch (error) {
    // Show error
  }
}
```

### After (With Validation)
```typescript
const { validate } = useFormValidation(projectCreateSchema)

const handleSubmit = async (e) => {
  e.preventDefault()

  // Client validates first
  const validation = validate(formData)
  if (!validation.success) {
    return // Errors shown automatically
  }

  // Then API validates
  try {
    await createProject.mutateAsync(validation.data)
  } catch (error) {
    // Merge validation + API errors if needed
  }
}
```

## Troubleshooting

### Errors Not Showing
- Check that you're using error-aware components (InputWithError, etc)
- Or manually display using ValidationError component
- Verify getFieldError() is being called correctly

### Validation Not Working
- Make sure schema is imported correctly
- Check that field names match schema exactly
- Use validate(formData) before API call

### Type Errors
- Use type: `const data: ProjectCreateInput = {...}`
- Or get type from validation result: `if (validation.success) { // validation.data is typed }`

## See Also

- [NOTIFICATIONS_GUIDE.md](./NOTIFICATIONS_GUIDE.md) - Error notifications
- [API_ABSTRACTION_GUIDE.md](./API_ABSTRACTION_GUIDE.md) - API layer
- [CreateProjectDialog.validated.tsx](./src/features/projects/components/CreateProjectDialog.validated.tsx) - Complete example
