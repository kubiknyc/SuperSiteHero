import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from '../form-field'
import { Input } from '../input'

describe('FormField', () => {
  it('should render label and children', () => {
    render(
      <FormField label="Test Field" htmlFor="test-input">
        <Input id="test-input" />
      </FormField>
    )

    expect(screen.getByText('Test Field')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should display required indicator when required is true', () => {
    render(
      <FormField label="Required Field" htmlFor="test" required>
        <Input id="test" />
      </FormField>
    )

    const label = screen.getByText('Required Field')
    expect(label.querySelector('span.text-red-600')).toBeInTheDocument()
  })

  it('should not display required indicator when required is false', () => {
    render(
      <FormField label="Optional Field" htmlFor="test">
        <Input id="test" />
      </FormField>
    )

    const label = screen.getByText('Optional Field')
    expect(label.querySelector('span.text-red-600')).not.toBeInTheDocument()
  })

  it('should display error message when error is provided', () => {
    render(
      <FormField label="Field" htmlFor="test" error="This field is required">
        <Input id="test" />
      </FormField>
    )

    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should display description when provided', () => {
    render(
      <FormField label="Field" htmlFor="test" description="This is a helpful description">
        <Input id="test" />
      </FormField>
    )

    expect(screen.getByText('This is a helpful description')).toBeInTheDocument()
  })

  it('should display character counter when provided', () => {
    render(
      <FormField
        label="Field"
        htmlFor="test"
        characterCount={{ current: 50, max: 100, isNearLimit: false, isOverLimit: false }}
      >
        <Input id="test" />
      </FormField>
    )

    expect(screen.getByText('50 / 100')).toBeInTheDocument()
  })

  it('should show yellow warning when near limit', () => {
    render(
      <FormField
        label="Field"
        htmlFor="test"
        characterCount={{ current: 95, max: 100, isNearLimit: true, isOverLimit: false }}
      >
        <Input id="test" />
      </FormField>
    )

    const counter = screen.getByText('95 / 100')
    expect(counter).toHaveClass('text-yellow-600')
  })

  it('should show red error when over limit', () => {
    render(
      <FormField
        label="Field"
        htmlFor="test"
        characterCount={{ current: 105, max: 100, isNearLimit: false, isOverLimit: true }}
      >
        <Input id="test" />
      </FormField>
    )

    const counter = screen.getByText('105 / 100')
    expect(counter).toHaveClass('text-red-600')
    expect(counter).toHaveClass('font-semibold')
  })
})
