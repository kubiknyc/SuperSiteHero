/**
 * TabletTable Component
 *
 * A table component optimized for tablet displays with:
 * - Horizontal scrolling optimization
 * - Sticky headers
 * - Touch-friendly row selection
 * - Responsive column visibility
 * - Better touch targets for actions
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTabletMode } from '@/hooks/useTabletMode';
import { Checkbox } from '@/components/ui/checkbox';

// =============================================================================
// TabletTable - Main table container
// =============================================================================

export interface TabletTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to enable horizontal scrolling */
  scrollable?: boolean;
  /** Whether to show sticky header */
  stickyHeader?: boolean;
  /** Max height before vertical scrolling */
  maxHeight?: string | number;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Selected row IDs */
  selectedRows?: string[];
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** All row IDs for select-all functionality */
  allRowIds?: string[];
}

const TabletTable = React.forwardRef<HTMLDivElement, TabletTableProps>(
  (
    {
      className,
      scrollable = true,
      stickyHeader: _stickyHeader = true,
      maxHeight,
      selectable = false,
      selectedRows = [],
      onSelectionChange,
      allRowIds = [],
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isTouchDevice: _isTouchDevice } = useTabletMode();

    // Handle select all
    const handleSelectAll = React.useCallback(
      (checked: boolean) => {
        if (onSelectionChange) {
          onSelectionChange(checked ? allRowIds : []);
        }
      },
      [allRowIds, onSelectionChange]
    );

    // Handle single row selection
    const handleRowSelect = React.useCallback(
      (rowId: string, checked: boolean) => {
        if (onSelectionChange) {
          const newSelection = checked
            ? [...selectedRows, rowId]
            : selectedRows.filter((id) => id !== rowId);
          onSelectionChange(newSelection);
        }
      },
      [selectedRows, onSelectionChange]
    );

    // Provide context for child components
    const tableContext = React.useMemo(
      () => ({
        selectable,
        selectedRows,
        onSelectAll: handleSelectAll,
        onRowSelect: handleRowSelect,
        allRowIds,
        isAllSelected: allRowIds.length > 0 && selectedRows.length === allRowIds.length,
        isSomeSelected: selectedRows.length > 0 && selectedRows.length < allRowIds.length,
      }),
      [selectable, selectedRows, handleSelectAll, handleRowSelect, allRowIds]
    );

    return (
      <TabletTableContext.Provider value={tableContext}>
        <div
          ref={ref}
          className={cn(
            'relative',
            scrollable && [
              'overflow-x-auto',
              '-webkit-overflow-scrolling-touch',
              'overscroll-x-contain',
            ],
            maxHeight && 'overflow-y-auto',
            // Better scrollbar styling on tablets
            isTablet && 'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
            className
          )}
          style={{ maxHeight: maxHeight }}
          {...props}
        >
          <table
            className={cn(
              'w-full border-collapse',
              'text-left',
              isTablet ? 'text-base' : 'text-sm'
            )}
          >
            {children}
          </table>
        </div>
      </TabletTableContext.Provider>
    );
  }
);

TabletTable.displayName = 'TabletTable';

// =============================================================================
// Context for table state
// =============================================================================

interface TabletTableContextValue {
  selectable: boolean;
  selectedRows: string[];
  onSelectAll: (checked: boolean) => void;
  onRowSelect: (rowId: string, checked: boolean) => void;
  allRowIds: string[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

const TabletTableContext = React.createContext<TabletTableContextValue>({
  selectable: false,
  selectedRows: [],
  onSelectAll: () => {},
  onRowSelect: () => {},
  allRowIds: [],
  isAllSelected: false,
  isSomeSelected: false,
});

const useTabletTableContext = () => React.useContext(TabletTableContext);

// =============================================================================
// TabletTableHeader - Table header wrapper
// =============================================================================

export interface TabletTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Whether header is sticky */
  sticky?: boolean;
}

const TabletTableHeader = React.forwardRef<HTMLTableSectionElement, TabletTableHeaderProps>(
  ({ className, sticky = true, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          'bg-surface dark:bg-surface',
          sticky && 'sticky top-0 z-10',
          className
        )}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TabletTableHeader.displayName = 'TabletTableHeader';

// =============================================================================
// TabletTableBody - Table body wrapper
// =============================================================================

const TabletTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)}
    {...props}
  />
));

TabletTableBody.displayName = 'TabletTableBody';

// =============================================================================
// TabletTableRow - Table row with touch-friendly selection
// =============================================================================

export interface TabletTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Row ID for selection */
  rowId?: string;
  /** Whether row is clickable */
  clickable?: boolean;
  /** Whether row is selected (override context) */
  selected?: boolean;
  /** Click handler */
  onRowClick?: () => void;
}

const TabletTableRow = React.forwardRef<HTMLTableRowElement, TabletTableRowProps>(
  ({ className, rowId, clickable, selected, onRowClick, children, ...props }, ref) => {
    const { isTablet, isTouchDevice } = useTabletMode();
    const { selectable, selectedRows, onRowSelect } = useTabletTableContext();

    const isSelected = selected ?? (rowId ? selectedRows.includes(rowId) : false);

    const handleClick = React.useCallback(() => {
      if (onRowClick) {
        onRowClick();
      }
    }, [onRowClick]);

    const handleCheckboxChange = React.useCallback(
      (checked: boolean) => {
        if (rowId) {
          onRowSelect(rowId, checked);
        }
      },
      [rowId, onRowSelect]
    );

    return (
      <tr
        ref={ref}
        className={cn(
          'bg-card dark:bg-background',
          'border-b border-border dark:border-gray-700',
          'last:border-b-0',
          // Hover states
          (clickable || selectable) && [
            'hover:bg-surface dark:hover:bg-surface',
            'transition-colors',
          ],
          // Selection state
          isSelected && 'bg-blue-50 dark:bg-blue-900/20 hover:bg-info-light dark:hover:bg-blue-900/30',
          // Touch states
          isTouchDevice && (clickable || selectable) && 'active:bg-muted dark:active:bg-gray-700',
          // Cursor
          (clickable || onRowClick) && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {/* Selection checkbox */}
        {selectable && rowId && (
          <td className={cn('w-12 px-3', isTablet ? 'py-4' : 'py-3')}>
            <div
              className={cn(
                'flex items-center justify-center',
                isTouchDevice && 'min-w-[44px] min-h-[44px]'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
                className={cn(isTablet && 'w-5 h-5')}
              />
            </div>
          </td>
        )}
        {children}
      </tr>
    );
  }
);

TabletTableRow.displayName = 'TabletTableRow';

// =============================================================================
// TabletTableHead - Table header cell
// =============================================================================

export interface TabletTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Whether column is sortable */
  sortable?: boolean;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc' | null;
  /** Sort click handler */
  onSort?: () => void;
  /** Whether to hide on tablet portrait */
  hideOnPortrait?: boolean;
  /** Whether to hide on mobile/small screens */
  hideOnMobile?: boolean;
  /** Minimum width for the column */
  minWidth?: string | number;
  /** Whether this is the checkbox column header */
  isSelectAll?: boolean;
}

const TabletTableHead = React.forwardRef<HTMLTableCellElement, TabletTableHeadProps>(
  (
    {
      className,
      sortable,
      sortDirection,
      onSort,
      hideOnPortrait,
      hideOnMobile,
      minWidth,
      isSelectAll,
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isPortrait, isTouchDevice } = useTabletMode();
    const { selectable, isAllSelected, isSomeSelected, onSelectAll } = useTabletTableContext();

    // Handle select all checkbox
    if (isSelectAll && selectable) {
      return (
        <th
          ref={ref}
          className={cn(
            'w-12 px-3',
            isTablet ? 'py-4' : 'py-3',
            'font-semibold text-secondary dark:text-gray-300',
            'text-left',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'flex items-center justify-center',
              isTouchDevice && 'min-w-[44px] min-h-[44px]'
            )}
          >
            <Checkbox
              checked={isAllSelected}
              // Use indeterminate prop if available
              className={cn(
                isTablet && 'w-5 h-5',
                isSomeSelected && 'data-[state=checked]:bg-blue-400'
              )}
              onCheckedChange={onSelectAll}
            />
          </div>
        </th>
      );
    }

    // Hide columns based on viewport
    if (hideOnPortrait && isTablet && isPortrait) {return null;}
    if (hideOnMobile && !isTablet) {return null;}

    return (
      <th
        ref={ref}
        className={cn(
          'px-4',
          isTablet ? 'py-4' : 'py-3',
          'font-semibold text-secondary dark:text-gray-300',
          'text-left',
          'whitespace-nowrap',
          sortable && [
            'cursor-pointer',
            'select-none',
            'hover:bg-muted dark:hover:bg-gray-700',
            'transition-colors',
          ],
          isTouchDevice && sortable && 'active:bg-muted dark:active:bg-gray-600',
          className
        )}
        style={{ minWidth }}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center gap-2">
          {children}
          {sortable && (
            <span className="text-disabled">
              {sortDirection === 'asc' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
              {sortDirection === 'desc' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {!sortDirection && (
                <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              )}
            </span>
          )}
        </div>
      </th>
    );
  }
);

TabletTableHead.displayName = 'TabletTableHead';

// =============================================================================
// TabletTableCell - Table body cell
// =============================================================================

export interface TabletTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Whether to hide on tablet portrait */
  hideOnPortrait?: boolean;
  /** Whether to hide on mobile/small screens */
  hideOnMobile?: boolean;
  /** Whether cell contains actions (larger touch target) */
  isActions?: boolean;
  /** Truncate content with ellipsis */
  truncate?: boolean;
  /** Max width before truncation */
  maxWidth?: string | number;
}

const TabletTableCell = React.forwardRef<HTMLTableCellElement, TabletTableCellProps>(
  (
    {
      className,
      hideOnPortrait,
      hideOnMobile,
      isActions,
      truncate,
      maxWidth,
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isPortrait, isTouchDevice } = useTabletMode();

    // Hide columns based on viewport
    if (hideOnPortrait && isTablet && isPortrait) {return null;}
    if (hideOnMobile && !isTablet) {return null;}

    return (
      <td
        ref={ref}
        className={cn(
          'px-4',
          isTablet ? 'py-4' : 'py-3',
          'text-foreground dark:text-gray-100',
          truncate && 'truncate',
          isActions && [
            'text-right',
            // Touch-friendly action buttons
            isTouchDevice && '[&>button]:min-h-[44px] [&>button]:min-w-[44px]',
          ],
          className
        )}
        style={{ maxWidth: truncate ? maxWidth : undefined }}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TabletTableCell.displayName = 'TabletTableCell';

// =============================================================================
// TabletTableEmpty - Empty state for table
// =============================================================================

export interface TabletTableEmptyProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Number of columns to span */
  colSpan: number;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Action button/element */
  action?: React.ReactNode;
}

const TabletTableEmpty = React.forwardRef<HTMLTableRowElement, TabletTableEmptyProps>(
  ({ className, colSpan, icon, title, description, action, ...props }, ref) => {
    const { isTablet } = useTabletMode();
    const { selectable } = useTabletTableContext();

    // Account for checkbox column
    const totalColSpan = selectable ? colSpan + 1 : colSpan;

    return (
      <tr ref={ref} className={className} {...props}>
        <td colSpan={totalColSpan} className="text-center py-12">
          <div className="flex flex-col items-center">
            {icon && (
              <div className={cn('text-disabled mb-4', isTablet ? 'w-16 h-16' : 'w-12 h-12')}>
                {icon}
              </div>
            )}
            {title && (
              <h3
                className={cn(
                  'font-medium text-foreground dark:text-gray-100',
                  isTablet ? 'text-lg' : 'text-base'
                )}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                className={cn(
                  'text-muted dark:text-disabled mt-1',
                  isTablet ? 'text-base' : 'text-sm'
                )}
              >
                {description}
              </p>
            )}
            {action && <div className="mt-4">{action}</div>}
          </div>
        </td>
      </tr>
    );
  }
);

TabletTableEmpty.displayName = 'TabletTableEmpty';

export {
  TabletTable,
  TabletTableHeader,
  TabletTableBody,
  TabletTableRow,
  TabletTableHead,
  TabletTableCell,
  TabletTableEmpty,
};
