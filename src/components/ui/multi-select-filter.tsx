// File: /src/components/ui/multi-select-filter.tsx
// Multi-select filter dropdown component with keyboard navigation

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

interface Option {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  label: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
}

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  if (options.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {label}
        {value.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center px-1">
            {value.length}
          </Badge>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div
          className="absolute z-[70] mt-1 w-56 bg-card border rounded-md shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
          aria-label={`${label} filter options`}
        >
          <div className="py-1">
            {options.map(option => (
              <button
                key={option.value}
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => toggleOption(option.value)}
                role="option"
                aria-selected={value.includes(option.value)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-left">{option.label}</span>
                  {value.includes(option.value) && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
