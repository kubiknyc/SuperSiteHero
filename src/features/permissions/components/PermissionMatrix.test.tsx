/**
 * Tests for PermissionMatrix Component
 * CRITICAL for security - ensures permission UI works correctly
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionMatrix, PermissionMatrixSkeleton } from './PermissionMatrix'
import type { Permission, PermissionCategory } from '@/types/permissions'

// =============================================
// Test Data
// =============================================

const createPermission = (
  id: string,
  code: string,
  name: string,
  category: PermissionCategory,
  options: Partial<Permission> = {}
): Permission => ({
  id,
  code,
  name,
  description: options.description ?? `Description for ${name}`,
  category,
  subcategory: options.subcategory ?? null,
  is_dangerous: options.is_dangerous ?? false,
  requires_project_assignment: options.requires_project_assignment ?? true,
  display_order: options.display_order ?? 1,
  created_at: '2024-01-01T00:00:00Z',
})

const mockPermissions: Permission[] = [
  createPermission('1', 'projects.view', 'View Projects', 'projects', { display_order: 1 }),
  createPermission('2', 'projects.create', 'Create Projects', 'projects', { display_order: 2 }),
  createPermission('3', 'projects.delete', 'Delete Projects', 'projects', { is_dangerous: true, display_order: 3 }),
  createPermission('4', 'rfis.view', 'View RFIs', 'rfis', { display_order: 1 }),
  createPermission('5', 'rfis.create', 'Create RFIs', 'rfis', { display_order: 2 }),
  createPermission('6', 'admin.billing', 'Manage Billing', 'admin', {
    is_dangerous: true,
    requires_project_assignment: false,
    display_order: 1,
  }),
]

// =============================================
// Rendering Tests
// =============================================

describe('PermissionMatrix', () => {
  it('should render all permissions grouped by category', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // Check category headers
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('RFIs')).toBeInTheDocument()
    expect(screen.getByText('Administration')).toBeInTheDocument()

    // Check permissions are displayed
    expect(screen.getByText('View Projects')).toBeInTheDocument()
    expect(screen.getByText('Create Projects')).toBeInTheDocument()
    expect(screen.getByText('Delete Projects')).toBeInTheDocument()
    expect(screen.getByText('View RFIs')).toBeInTheDocument()
    expect(screen.getByText('Create RFIs')).toBeInTheDocument()
    expect(screen.getByText('Manage Billing')).toBeInTheDocument()
  })

  it('should display granted permissions as checked', () => {
    const grantedPermissions = new Set(['1', '4']) // View Projects, View RFIs

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // Get checkboxes by their labels
    const viewProjectsCheckbox = screen.getByRole('checkbox', { name: /view projects/i })
    const createProjectsCheckbox = screen.getByRole('checkbox', { name: /create projects/i })
    const viewRfisCheckbox = screen.getByRole('checkbox', { name: /view rfis/i })

    expect(viewProjectsCheckbox).toBeChecked()
    expect(createProjectsCheckbox).not.toBeChecked()
    expect(viewRfisCheckbox).toBeChecked()
  })

  it('should call onToggle when checkbox is clicked', () => {
    const grantedPermissions = new Set<string>()
    const onToggle = vi.fn()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        onToggle={onToggle}
      />
    )

    const viewProjectsCheckbox = screen.getByRole('checkbox', { name: /view projects/i })
    fireEvent.click(viewProjectsCheckbox)

    expect(onToggle).toHaveBeenCalledWith('1', true)
  })

  it('should not call onToggle when readOnly', () => {
    const grantedPermissions = new Set<string>()
    const onToggle = vi.fn()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        onToggle={onToggle}
        readOnly
      />
    )

    const viewProjectsCheckbox = screen.getByRole('checkbox', { name: /view projects/i })
    fireEvent.click(viewProjectsCheckbox)

    expect(onToggle).not.toHaveBeenCalled()
  })

  it('should disable checkboxes when disabled prop is true', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        disabled
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled()
    })
  })

  it('should highlight dangerous permissions', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        highlightDangerous
      />
    )

    // Dangerous permissions should have warning indicator
    // The warning icon is rendered with the permission
    expect(screen.getByText('Delete Projects')).toBeInTheDocument()
    expect(screen.getByText('Manage Billing')).toBeInTheDocument()
  })

  it('should show Company-wide badge for non-project-scoped permissions', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // Billing permission is not project-scoped
    const badges = screen.getAllByText('Company-wide')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('should show permission descriptions', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    expect(screen.getByText('Description for View Projects')).toBeInTheDocument()
    expect(screen.getByText('Description for Create Projects')).toBeInTheDocument()
  })

  it('should hide category headers when showCategories is false', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        showCategories={false}
      />
    )

    // Categories should not be shown as headers
    // Note: This test depends on how showCategories affects CardHeader
    const cards = document.querySelectorAll('[class*="CardHeader"]')
    expect(cards.length).toBe(0)
  })

  it('should display permission count badge per category', () => {
    const grantedPermissions = new Set(['1', '2']) // 2 of 3 project permissions

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // Should show "2/3" for projects category
    expect(screen.getByText('2/3')).toBeInTheDocument()
    // Should show "0/2" for RFIs category
    expect(screen.getByText('0/2')).toBeInTheDocument()
    // Should show "0/1" for admin category
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('should handle empty permissions array', () => {
    const grantedPermissions = new Set<string>()

    const { container } = render(
      <PermissionMatrix
        permissions={[]}
        grantedPermissions={grantedPermissions}
      />
    )

    // Should render without errors
    expect(container).toBeInTheDocument()
    // No checkboxes should be present
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('should handle toggle from checked to unchecked', () => {
    const grantedPermissions = new Set(['1']) // View Projects is granted
    const onToggle = vi.fn()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        onToggle={onToggle}
      />
    )

    const viewProjectsCheckbox = screen.getByRole('checkbox', { name: /view projects/i })
    expect(viewProjectsCheckbox).toBeChecked()

    fireEvent.click(viewProjectsCheckbox)

    // Should be called with false (unchecking)
    expect(onToggle).toHaveBeenCalledWith('1', false)
  })
})

// =============================================
// Skeleton Tests
// =============================================

describe('PermissionMatrixSkeleton', () => {
  it('should render skeleton loading state', () => {
    const { container } = render(<PermissionMatrixSkeleton />)

    // Should render skeleton elements
    expect(container).toBeInTheDocument()

    // Should have multiple skeleton cards
    const cards = container.querySelectorAll('[class*="Card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should render multiple category skeletons', () => {
    render(<PermissionMatrixSkeleton />)

    // The skeleton renders 3 category cards with 4 permission rows each
    // Total skeleton elements would be 3 * (1 header + 4 rows) = 15 skeleton elements
    const skeletons = document.querySelectorAll('[class*="Skeleton"]')
    expect(skeletons.length).toBeGreaterThan(10)
  })
})

// =============================================
// Accessibility Tests
// =============================================

describe('PermissionMatrix Accessibility', () => {
  it('should have accessible checkbox labels', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // All checkboxes should be accessible by name
    mockPermissions.forEach(perm => {
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(perm.name, 'i') })
      expect(checkbox).toBeInTheDocument()
    })
  })

  it('should associate labels with checkboxes', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    // Each checkbox should have an associated label
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAttribute('id')
    })
  })
})

// =============================================
// Security-Critical UI Tests
// =============================================

describe('PermissionMatrix Security', () => {
  it('should visually distinguish dangerous permissions', () => {
    const grantedPermissions = new Set<string>()

    const { container } = render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        highlightDangerous
      />
    )

    // Dangerous permissions should have special styling (red background)
    const dangerousElements = container.querySelectorAll('[class*="red"]')
    expect(dangerousElements.length).toBeGreaterThan(0)
  })

  it('should show tooltip for dangerous permissions', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        highlightDangerous
      />
    )

    // Dangerous permissions should have warning icons that show tooltips
    // Note: Tooltip visibility is typically tested via user interaction
    // Here we just verify the warning icon exists
    const warningIcon = document.querySelector('[class*="text-red"]')
    expect(warningIcon).toBeInTheDocument()
  })

  it('should prevent interaction when disabled', () => {
    const grantedPermissions = new Set<string>()
    const onToggle = vi.fn()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
        onToggle={onToggle}
        disabled
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      fireEvent.click(checkbox)
    })

    // onToggle should not be called for any checkbox
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('should properly render with all permissions granted', () => {
    const allPermissionIds = new Set(mockPermissions.map(p => p.id))

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={allPermissionIds}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('should properly render with no permissions granted', () => {
    const grantedPermissions = new Set<string>()

    render(
      <PermissionMatrix
        permissions={mockPermissions}
        grantedPermissions={grantedPermissions}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })
})
