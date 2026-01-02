// File: /src/components/notifications/ToastContainer.tsx
// Toast notification container using Sonner
// Provides themed, accessible toast notifications

import { Toaster } from 'sonner'

/**
 * ToastContainer - Renders the Sonner Toaster with app-consistent styling
 *
 * Place this component once at the root of your app (usually in App.tsx).
 * Then use toast.success(), toast.error(), etc. from 'sonner' anywhere.
 *
 * @example
 * // In App.tsx
 * <ToastContainer />
 *
 * // Anywhere in your app
 * import { toast } from 'sonner'
 * toast.success('Saved successfully!')
 * toast.error('Something went wrong')
 * toast.warning('Please review before submitting')
 * toast.info('New updates available')
 */
export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        // Default duration for all toasts
        duration: 4000,
        // Style overrides to match app theme
        classNames: {
          toast: 'font-sans shadow-lg',
          title: 'font-semibold text-sm',
          description: 'text-sm opacity-90',
          actionButton: 'font-medium',
          cancelButton: 'font-medium',
          closeButton: 'opacity-50 hover:opacity-100',
        },
      }}
    />
  )
}
