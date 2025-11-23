/**
 * EXAMPLE: Complete Integrated Form with Validation + API + Notifications
 *
 * This is a production-ready example showing how to integrate:
 * 1. Client-side validation (Zod)
 * 2. API abstraction layer
 * 3. Toast notifications
 *
 * Copy this pattern to your other forms!
 */

import { useState } from 'react'
import { useCreateProjectWithNotification } from '@/features/projects/hooks/useProjectsMutations'
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { useNotifications } from '@/lib/notifications/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { InputWithError, TextareaWithError, SelectWithError } from '@/components/form/ValidationError'
import type { ProjectStatus } from '@/types/database'

interface CreateProjectDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Complete example form with:
 * ✅ Validation - Client-side data validation
 * ✅ Error Display - User-friendly error messages
 * ✅ API Call - Type-safe API abstraction
 * ✅ Notifications - Toast feedback
 * ✅ Loading States - Proper UI feedback while submitting
 * ✅ Error Recovery - Form data preserved on error
 */
export function ExampleCreateProjectDialog({
  children,
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [formData, setFormData] = useState({
    name: '',
    project_number: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    start_date: '',
    estimated_end_date: '',
    status: 'planning' as ProjectStatus,
  })

  // ============================================================================
  // HOOKS - Three Key Hooks for Full Stack
  // ============================================================================

  // 1️⃣ MUTATION HOOK - Handles API call with automatic notifications
  // Shows success/error toasts automatically
  const createProject = useCreateProjectWithNotification()

  // 2️⃣ VALIDATION HOOK - Validates form data against schema
  // Provides error messages and field validation
  const { errors, validate, getFieldError, hasFieldError, clearErrors } =
    useFormValidation(projectCreateSchema)

  // 3️⃣ NOTIFICATION HOOK - For manual notifications if needed
  // useNotifications() is already used inside createProject, but we keep
  // reference for manual error handling
  const { showError } = useNotifications()

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle input changes - updates form state
   * Fields update in real-time without validation
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  /**
   * Handle form submission - THREE STEP PROCESS
   * 1. Validate client-side
   * 2. Call API with validated data
   * 3. Show success/error notification automatically
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // STEP 1: VALIDATE CLIENT-SIDE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const validation = validate(formData)

    if (!validation.success) {
      // Validation failed - errors automatically shown in InputWithError components
      // User will see red borders and error messages in the form fields
      console.log('Validation errors:', validation.error.errors)
      return // Stop here, don't call API
    }

    // STEP 2: CALL API WITH VALIDATED DATA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      // validation.data is fully typed and matches the database schema
      await createProject.mutateAsync({
        // Required field
        name: validation.data.name,

        // Optional fields - convert empty strings to null
        project_number: validation.data.project_number || null,
        description: validation.data.description || null,
        address: validation.data.address || null,
        city: validation.data.city || null,
        state: validation.data.state || null,
        zip_code: validation.data.zip_code || null,
        start_date: validation.data.start_date || null,
        estimated_end_date: validation.data.estimated_end_date || null,

        // Enum field
        status: validation.data.status,

        // Additional required fields for new project
        weather_units: 'imperial',
        features_enabled: {
          daily_reports: true,
          documents: true,
          workflows: true,
          tasks: true,
          checklists: true,
          punch_lists: true,
          safety: true,
          inspections: true,
          material_tracking: true,
          photos: true,
          takeoff: true,
        },
      })

      // STEP 3: SUCCESS - Toast shown automatically by mutation hook!
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // At this point:
      // ✅ Toast notification shown automatically (green, success icon)
      // ✅ Toast auto-dismisses after 3 seconds
      // ✅ We can now reset form and close dialog

      // Reset form
      setFormData({
        name: '',
        project_number: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        start_date: '',
        estimated_end_date: '',
        status: 'planning',
      })

      // Clear validation errors
      clearErrors()

      // Close dialog
      onOpenChange?.(false)
    } catch (error) {
      // ERROR HANDLING - Toast shown automatically by mutation hook!
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // At this point:
      // ✅ Toast notification shown automatically (red, error icon)
      // ✅ User-friendly error message displayed
      // ✅ Form data is PRESERVED (not cleared)
      // ✅ User can retry by clicking "Create" again

      // Log for debugging (you could send to Sentry here)
      console.error('Failed to create project:', error)

      // Form data preserved - user can make adjustments and retry
      // No need to show another error notification - mutation hook handles it
    }
  }

  /**
   * Handle dialog close - clear form
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Dialog is closing
      // Only reset if not submitting
      if (!createProject.isPending) {
        setFormData({
          name: '',
          project_number: '',
          description: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          start_date: '',
          estimated_end_date: '',
          status: 'planning',
        })
        clearErrors()
      }
    }
    onOpenChange?.(newOpen)
  }

  // ============================================================================
  // RENDER - JSX
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details below to create a new construction project. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* PROJECT NAME - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Project Name *
                </Label>
                <InputWithError
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Downtown Office Building"
                  error={getFieldError('name')} // Shows validation error if invalid
                  disabled={createProject.isPending}
                />
                {/* Error message automatically shown by InputWithError */}
              </div>

              {/* PROJECT NUMBER - OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="project_number" className="text-sm font-medium">
                  Project Number
                </Label>
                <InputWithError
                  id="project_number"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleChange}
                  placeholder="e.g., P-2024-001"
                  error={getFieldError('project_number')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>

            {/* DESCRIPTION - OPTIONAL */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <TextareaWithError
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Project description, scope, notes..."
                rows={3}
                error={getFieldError('description')}
                disabled={createProject.isPending}
              />
            </div>
          </div>

          {/* SECTION 2: LOCATION */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm text-gray-700">Location</h3>

            {/* ADDRESS - OPTIONAL */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Address
              </Label>
              <InputWithError
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
                error={getFieldError('address')}
                disabled={createProject.isPending}
              />
            </div>

            {/* CITY, STATE, ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City
                </Label>
                <InputWithError
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  error={getFieldError('city')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  State
                </Label>
                <InputWithError
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  maxLength={2}
                  error={getFieldError('state')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code" className="text-sm font-medium">
                  ZIP Code
                </Label>
                <InputWithError
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  error={getFieldError('zip_code')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: TIMELINE */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm text-gray-700">Timeline</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* START DATE - OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm font-medium">
                  Start Date
                </Label>
                <InputWithError
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  error={getFieldError('start_date')}
                  disabled={createProject.isPending}
                />
              </div>

              {/* END DATE - OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="estimated_end_date" className="text-sm font-medium">
                  Estimated End Date
                </Label>
                <InputWithError
                  id="estimated_end_date"
                  name="estimated_end_date"
                  type="date"
                  value={formData.estimated_end_date}
                  onChange={handleChange}
                  error={getFieldError('estimated_end_date')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: STATUS */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm text-gray-700">Status</h3>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Project Status
              </Label>
              <SelectWithError
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                error={getFieldError('status')}
                disabled={createProject.isPending}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </SelectWithError>
            </div>
          </div>

          {/* FORM ACTIONS */}
          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={createProject.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createProject.isPending ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Creating Project...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USAGE EXAMPLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * In your ProjectsPage.tsx:
 *
 * import { ExampleCreateProjectDialog } from '@/components/forms/ExampleCreateProjectDialog'
 *
 * export function ProjectsPage() {
 *   const [dialogOpen, setDialogOpen] = useState(false)
 *
 *   return (
 *     <div>
 *       <ExampleCreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen}>
 *         <Button>Create Project</Button>
 *       </ExampleCreateProjectDialog>
 *
 *       {/* Rest of page */}
 *     </div>
 *   )
 * }
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WHAT HAPPENS WHEN YOU USE THIS FORM:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * SCENARIO 1: User submits empty form
 * ─────────────────────────────────────
 * 1. handleSubmit called
 * 2. validate(formData) → Fails (name is required)
 * 3. getFieldError('name') shows validation error message
 * 4. Form fields show red border + error text
 * 5. No API call made ✓
 * 6. User sees exactly what's wrong ✓
 *
 *
 * SCENARIO 2: User submits valid form
 * ────────────────────────────────────
 * 1. handleSubmit called
 * 2. validate(formData) → Success
 * 3. createProject.mutateAsync(validatedData) called
 * 4. Loading spinner shown on button ✓
 * 5. Form fields disabled ✓
 * 6. API request sent to Supabase
 * 7. Success response received
 * 8. Mutation hook shows success toast automatically ✓
 *    - Green background
 *    - CheckCircle icon
 *    - "Project created successfully" message
 *    - Auto-dismisses in 3 seconds
 * 9. Form reset, dialog closes
 * 10. ProjectsPage reloads with new project ✓
 *
 *
 * SCENARIO 3: API call fails
 * ───────────────────────────
 * 1. handleSubmit called
 * 2. validate(formData) → Success
 * 3. createProject.mutateAsync(validatedData) called
 * 4. API request sent but fails (network error, 500, etc)
 * 5. Mutation hook catches error
 * 6. Mutation hook shows error toast automatically ✓
 *    - Red background
 *    - AlertCircle icon
 *    - User-friendly error message (converted from API error)
 *    - Auto-dismisses in 5 seconds
 * 7. Catch block handles error (logs to console)
 * 8. Form data is PRESERVED (not cleared)
 * 9. User can adjust data and retry ✓
 *
 *
 * KEY FEATURES:
 * ─────────────
 * ✅ Validation happens BEFORE API call
 * ✅ Errors shown inline in form fields
 * ✅ Success/error notifications automatic
 * ✅ Loading states prevent double-submission
 * ✅ Error recovery - form data preserved
 * ✅ Type-safe - validation.data is fully typed
 * ✅ User-friendly - all errors are clear
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATTERN TO COPY:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * For other forms (DailyReport, ChangeOrder, etc):
 *
 * 1. Replace hooks:
 *    - useCreateProjectWithNotification → useCreateDailyReportWithNotification
 *    - projectCreateSchema → dailyReportCreateSchema
 *
 * 2. Replace form fields with your schema fields
 *
 * 3. Keep the same structure:
 *    - Three hooks (mutation, validation, notifications)
 *    - Three-step handleSubmit (validate → call API → handle response)
 *    - InputWithError/TextareaWithError components
 *    - getFieldError() for error display
 *
 * That's it! The pattern is the same for all forms.
 */
