/**
 * TabletForm Components
 *
 * Form components optimized for tablet displays with:
 * - Multi-column layouts for landscape orientation
 * - Larger input fields for touch interaction
 * - Better label positioning
 * - Responsive column spanning
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTabletMode } from '@/hooks/useTabletMode';
import { Label } from '@/components/ui/label';

// =============================================================================
// TabletForm - Main form container with responsive grid
// =============================================================================

export interface TabletFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Number of columns in landscape mode */
  landscapeCols?: 1 | 2 | 3;
  /** Number of columns in portrait mode */
  portraitCols?: 1 | 2;
  /** Gap between form elements */
  gap?: 'sm' | 'md' | 'lg';
}

const TabletForm = React.forwardRef<HTMLFormElement, TabletFormProps>(
  ({ className, landscapeCols = 2, portraitCols = 1, gap = 'md', children, ...props }, ref) => {
    const { isTablet, isLandscape, isPortrait } = useTabletMode();

    const gridCols = React.useMemo(() => {
      if (!isTablet) {
        // Desktop: use landscape cols
        return {
          1: 'grid-cols-1',
          2: 'grid-cols-2',
          3: 'grid-cols-3',
        }[landscapeCols];
      }

      if (isLandscape) {
        return {
          1: 'grid-cols-1',
          2: 'grid-cols-2',
          3: 'grid-cols-3',
        }[landscapeCols];
      }

      if (isPortrait) {
        return {
          1: 'grid-cols-1',
          2: 'grid-cols-2',
        }[portraitCols];
      }

      return 'grid-cols-1';
    }, [isTablet, isLandscape, isPortrait, landscapeCols, portraitCols]);

    const gapClass = {
      sm: isTablet ? 'gap-4' : 'gap-3',
      md: isTablet ? 'gap-5' : 'gap-4',
      lg: isTablet ? 'gap-6' : 'gap-5',
    }[gap];

    return (
      <form
        ref={ref}
        className={cn('grid', gridCols, gapClass, className)}
        {...props}
      >
        {children}
      </form>
    );
  }
);

TabletForm.displayName = 'TabletForm';

// =============================================================================
// TabletFormField - Individual form field with label
// =============================================================================

export interface TabletFormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label text */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Span full width (all columns) */
  fullWidth?: boolean;
  /** Span specific number of columns */
  colSpan?: 1 | 2 | 3;
  /** Label position */
  labelPosition?: 'top' | 'left';
  /** HTML for attribute for label */
  htmlFor?: string;
}

const TabletFormField = React.forwardRef<HTMLDivElement, TabletFormFieldProps>(
  (
    {
      className,
      label,
      required,
      error,
      helperText,
      fullWidth,
      colSpan,
      labelPosition = 'top',
      htmlFor,
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isLandscape } = useTabletMode();

    // Determine column span class
    const colSpanClass = React.useMemo(() => {
      if (fullWidth) return 'col-span-full';
      if (colSpan) {
        return {
          1: 'col-span-1',
          2: 'col-span-2',
          3: 'col-span-3',
        }[colSpan];
      }
      return '';
    }, [fullWidth, colSpan]);

    // Use left label position on tablet landscape for better space usage
    const effectiveLabelPosition =
      labelPosition === 'left' || (isTablet && isLandscape && labelPosition !== 'top')
        ? 'left'
        : 'top';

    return (
      <div
        ref={ref}
        className={cn(
          colSpanClass,
          effectiveLabelPosition === 'left' && 'flex items-start gap-4',
          className
        )}
        {...props}
      >
        {label && (
          <Label
            htmlFor={htmlFor}
            className={cn(
              'text-secondary dark:text-gray-300',
              isTablet ? 'text-base font-medium' : 'text-sm font-medium',
              effectiveLabelPosition === 'top' && 'block mb-2',
              effectiveLabelPosition === 'left' && [
                'flex-shrink-0',
                isTablet ? 'w-32 pt-3' : 'w-28 pt-2.5',
              ],
              required && "after:content-['*'] after:ml-0.5 after:text-error"
            )}
          >
            {label}
          </Label>
        )}

        <div className={cn(effectiveLabelPosition === 'left' && 'flex-1')}>
          {children}

          {(error || helperText) && (
            <p
              className={cn(
                'mt-1.5',
                isTablet ? 'text-sm' : 'text-xs',
                error ? 'text-error' : 'text-muted dark:text-disabled'
              )}
            >
              {error || helperText}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TabletFormField.displayName = 'TabletFormField';

// =============================================================================
// TabletFormSection - Group of related form fields
// =============================================================================

export interface TabletFormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Whether to span full width */
  fullWidth?: boolean;
}

const TabletFormSection = React.forwardRef<HTMLDivElement, TabletFormSectionProps>(
  ({ className, title, description, fullWidth = true, children, ...props }, ref) => {
    const { isTablet } = useTabletMode();

    return (
      <div
        ref={ref}
        className={cn(fullWidth && 'col-span-full', className)}
        {...props}
      >
        {(title || description) && (
          <div className={cn('mb-4', isTablet && 'mb-5')}>
            {title && (
              <h3
                className={cn(
                  'font-semibold text-foreground dark:text-gray-100',
                  isTablet ? 'text-lg' : 'text-base'
                )}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                className={cn(
                  'text-secondary dark:text-disabled mt-1',
                  isTablet ? 'text-base' : 'text-sm'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);

TabletFormSection.displayName = 'TabletFormSection';

// =============================================================================
// TabletFormRow - Horizontal row of form fields
// =============================================================================

export interface TabletFormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  cols?: 2 | 3 | 4;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
}

const TabletFormRow = React.forwardRef<HTMLDivElement, TabletFormRowProps>(
  ({ className, cols = 2, gap = 'md', children, ...props }, ref) => {
    const { isTablet, isPortrait } = useTabletMode();

    // In tablet portrait, limit to 2 columns max
    const effectiveCols = isTablet && isPortrait ? Math.min(cols, 2) : cols;

    const gridCols = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    }[effectiveCols];

    const gapClass = {
      sm: isTablet ? 'gap-4' : 'gap-3',
      md: isTablet ? 'gap-5' : 'gap-4',
      lg: isTablet ? 'gap-6' : 'gap-5',
    }[gap];

    return (
      <div
        ref={ref}
        className={cn('grid col-span-full', gridCols, gapClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabletFormRow.displayName = 'TabletFormRow';

// =============================================================================
// TabletFormActions - Form action buttons container
// =============================================================================

export interface TabletFormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment of action buttons */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Whether to stick to bottom on mobile/tablet */
  sticky?: boolean;
}

const TabletFormActions = React.forwardRef<HTMLDivElement, TabletFormActionsProps>(
  ({ className, align = 'right', sticky = false, children, ...props }, ref) => {
    const { isTablet, isTouchDevice } = useTabletMode();

    const alignClass = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    }[align];

    return (
      <div
        ref={ref}
        className={cn(
          'col-span-full flex items-center gap-3',
          isTablet && 'gap-4',
          alignClass,
          sticky && [
            'sticky bottom-0',
            'bg-card dark:bg-background',
            'border-t border-border dark:border-border',
            'py-4 -mx-4 px-4 mt-4',
            isTablet && 'py-5 -mx-5 px-5 mt-5',
          ],
          // Ensure touch-friendly button spacing
          isTouchDevice && '[&>button]:min-h-[44px] [&>button]:min-w-[88px]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabletFormActions.displayName = 'TabletFormActions';

// =============================================================================
// TabletInput - Enhanced input for tablets
// =============================================================================

export interface TabletInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Whether to show a clear button */
  clearable?: boolean;
  /** Icon to show at the start */
  startIcon?: React.ReactNode;
  /** Icon to show at the end */
  endIcon?: React.ReactNode;
  /** Input size */
  inputSize?: 'default' | 'lg';
}

const TabletInput = React.forwardRef<HTMLInputElement, TabletInputProps>(
  (
    {
      className,
      clearable,
      startIcon,
      endIcon,
      inputSize = 'default',
      type,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const { isTablet, isTouchDevice } = useTabletMode();
    const [internalValue, setInternalValue] = React.useState(value || '');

    // Use controlled or internal value
    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      setInternalValue('');
      // Create synthetic event for onChange
      const event = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(event);
    };

    const sizeClasses = React.useMemo(() => {
      const base = inputSize === 'lg' || (isTablet && inputSize === 'default');
      return {
        input: base ? 'h-12 text-base px-4' : 'h-10 text-sm px-3',
        icon: base ? 'w-5 h-5' : 'w-4 h-4',
        iconPadding: base ? 'pl-11' : 'pl-9',
        endIconPadding: base ? 'pr-11' : 'pr-9',
      };
    }, [inputSize, isTablet]);

    return (
      <div className="relative">
        {startIcon && (
          <div
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-disabled',
              sizeClasses.icon
            )}
          >
            {startIcon}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          value={currentValue}
          onChange={handleChange}
          className={cn(
            'w-full rounded-lg border border-input dark:border-gray-700',
            'bg-card dark:bg-background',
            'text-foreground dark:text-gray-100',
            'placeholder:text-disabled dark:placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses.input,
            startIcon && sizeClasses.iconPadding,
            (endIcon || (clearable && currentValue)) && sizeClasses.endIconPadding,
            // Touch-friendly sizing
            isTouchDevice && 'min-h-[44px]',
            className
          )}
          {...props}
        />

        {/* Clear button or end icon */}
        {(clearable && currentValue) || endIcon ? (
          <div
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              sizeClasses.icon
            )}
          >
            {clearable && currentValue ? (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'text-disabled hover:text-secondary dark:hover:text-gray-300',
                  'focus:outline-none',
                  isTouchDevice && 'min-w-[44px] min-h-[44px] flex items-center justify-center -mr-3'
                )}
                aria-label="Clear input"
              >
                <svg
                  className={sizeClasses.icon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : (
              <span className="text-disabled">{endIcon}</span>
            )}
          </div>
        ) : null}
      </div>
    );
  }
);

TabletInput.displayName = 'TabletInput';

export {
  TabletForm,
  TabletFormField,
  TabletFormSection,
  TabletFormRow,
  TabletFormActions,
  TabletInput,
};
