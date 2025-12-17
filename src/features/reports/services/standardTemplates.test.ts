/**
 * Standard Templates Service Tests
 * Tests for pre-built report template library
 */

import { describe, it, expect } from 'vitest'
import {
  STANDARD_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByDataSource,
  getTemplatesByTag,
  getAllCategories,
  getAllDataSources,
  getAllTags,
} from './standardTemplates'

describe('Standard Templates Service', () => {
  describe('STANDARD_TEMPLATES', () => {
    it('should have all required templates', () => {
      expect(STANDARD_TEMPLATES).toBeDefined()
      expect(STANDARD_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('should have valid template structure', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('data_source')
        expect(template).toHaveProperty('fields')
        expect(template).toHaveProperty('filters')
        expect(template).toHaveProperty('sorting')
        expect(template).toHaveProperty('grouping')
        expect(Array.isArray(template.fields)).toBe(true)
        expect(Array.isArray(template.filters)).toBe(true)
        expect(Array.isArray(template.tags)).toBe(true)
      })
    })

    it('should have unique template IDs', () => {
      const ids = STANDARD_TEMPLATES.map((t) => t.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })

    it('should have valid categories', () => {
      const validCategories = ['daily', 'weekly', 'monthly', 'custom']
      STANDARD_TEMPLATES.forEach((template) => {
        expect(validCategories).toContain(template.category)
      })
    })

    it('should have valid data sources', () => {
      const validSources = [
        'change_orders',
        'daily_reports',
        'documents',
        'equipment',
        'inspections',
        'insurance_certificates',
        'lien_waivers',
        'meetings',
        'meeting_minutes',
        'payment_applications',
        'punch_list',
        'punch_lists',
        'rfis',
        'safety_incidents',
        'submittals',
      ]
      STANDARD_TEMPLATES.forEach((template) => {
        expect(validSources).toContain(template.data_source)
      })
    })

    it('should have valid output formats', () => {
      const validFormats = ['pdf', 'excel', 'csv']
      STANDARD_TEMPLATES.forEach((template) => {
        expect(validFormats).toContain(template.default_format)
      })
    })

    it('should have valid page orientations', () => {
      const validOrientations = ['portrait', 'landscape']
      STANDARD_TEMPLATES.forEach((template) => {
        expect(validOrientations).toContain(template.page_orientation)
      })
    })
  })

  describe('getTemplateById', () => {
    it('should return template by ID', () => {
      const firstTemplate = STANDARD_TEMPLATES[0]
      const result = getTemplateById(firstTemplate.id)

      expect(result).toEqual(firstTemplate)
    })

    it('should return undefined for non-existent ID', () => {
      const result = getTemplateById('non-existent-id')

      expect(result).toBeUndefined()
    })

    it('should find daily field report summary', () => {
      const result = getTemplateById('daily-field-report-summary')

      expect(result).toBeDefined()
      expect(result?.name).toBe('Daily Field Report Summary')
      expect(result?.category).toBe('daily')
    })
  })

  describe('getTemplatesByCategory', () => {
    it('should return all daily templates', () => {
      const result = getTemplatesByCategory('daily')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.category === 'daily')).toBe(true)
    })

    it('should return all weekly templates', () => {
      const result = getTemplatesByCategory('weekly')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.category === 'weekly')).toBe(true)
    })

    it('should return all monthly templates', () => {
      const result = getTemplatesByCategory('monthly')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.category === 'monthly')).toBe(true)
    })

    it('should return empty array for non-existent category', () => {
      const result = getTemplatesByCategory('invalid' as any)

      expect(result).toEqual([])
    })
  })

  describe('getTemplatesByDataSource', () => {
    it('should return templates for daily reports', () => {
      const result = getTemplatesByDataSource('daily_reports')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.data_source === 'daily_reports')).toBe(true)
    })

    it('should return templates for RFIs', () => {
      const result = getTemplatesByDataSource('rfis')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.data_source === 'rfis')).toBe(true)
    })

    it('should return templates for safety incidents', () => {
      const result = getTemplatesByDataSource('safety_incidents')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.data_source === 'safety_incidents')).toBe(true)
    })

    it('should return templates for equipment', () => {
      const result = getTemplatesByDataSource('equipment')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.data_source === 'equipment')).toBe(true)
    })

    it('should return empty array for non-existent data source', () => {
      const result = getTemplatesByDataSource('invalid' as any)

      expect(result).toEqual([])
    })
  })

  describe('getTemplatesByTag', () => {
    it('should return templates tagged with "safety"', () => {
      const result = getTemplatesByTag('safety')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.tags.includes('safety'))).toBe(true)
    })

    it('should return templates tagged with "superintendent"', () => {
      const result = getTemplatesByTag('superintendent')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.tags.includes('superintendent'))).toBe(true)
    })

    it('should return templates tagged with "financial"', () => {
      const result = getTemplatesByTag('financial')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((t) => t.tags.includes('financial'))).toBe(true)
    })

    it('should return empty array for non-existent tag', () => {
      const result = getTemplatesByTag('non-existent-tag')

      expect(result).toEqual([])
    })
  })

  describe('getAllCategories', () => {
    it('should return all unique categories', () => {
      const result = getAllCategories()

      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('daily')
      expect(result).toContain('weekly')
      expect(result).toContain('monthly')
      // Check uniqueness
      const uniqueCategories = new Set(result)
      expect(result.length).toBe(uniqueCategories.size)
    })
  })

  describe('getAllDataSources', () => {
    it('should return all unique data sources', () => {
      const result = getAllDataSources()

      expect(result.length).toBeGreaterThan(0)
      // Check uniqueness
      const uniqueSources = new Set(result)
      expect(result.length).toBe(uniqueSources.size)
    })

    it('should include common data sources', () => {
      const result = getAllDataSources()

      expect(result).toContain('daily_reports')
      expect(result).toContain('safety_incidents')
    })
  })

  describe('getAllTags', () => {
    it('should return all unique tags', () => {
      const result = getAllTags()

      expect(result.length).toBeGreaterThan(0)
      // Check uniqueness
      const uniqueTags = new Set(result)
      expect(result.length).toBe(uniqueTags.size)
    })

    it('should include common tags', () => {
      const result = getAllTags()

      expect(result).toContain('safety')
      expect(result).toContain('superintendent')
      expect(result).toContain('daily')
    })
  })

  describe('Template Field Configuration', () => {
    it('should have properly ordered fields', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const orders = template.fields.map((f) => f.display_order)
        const sortedOrders = [...orders].sort((a, b) => a - b)
        expect(orders).toEqual(sortedOrders)
      })
    })

    it('should have unique field names within each template', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const fieldNames = template.fields.map((f) => f.field_name)
        const uniqueNames = new Set(fieldNames)
        expect(fieldNames.length).toBe(uniqueNames.size)
      })
    })

    it('should have valid field types', () => {
      const validTypes = ['text', 'number', 'date', 'datetime', 'boolean', 'status', 'user', 'currency', 'company']
      STANDARD_TEMPLATES.forEach((template) => {
        template.fields.forEach((field) => {
          expect(validTypes).toContain(field.field_type)
        })
      })
    })

    it('should have valid aggregation functions for numeric fields', () => {
      const validAggregations = ['sum', 'avg', 'average', 'min', 'max', 'count']
      STANDARD_TEMPLATES.forEach((template) => {
        template.fields.forEach((field) => {
          if (field.aggregation) {
            expect(validAggregations).toContain(field.aggregation)
          }
        })
      })
    })
  })

  describe('Template Filter Configuration', () => {
    it('should have valid filter operators', () => {
      const validOperators = [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'greater_than',
        'less_than',
        'greater_than_or_equal',
        'less_than_or_equal',
        'gt',
        'lt',
        'gte',
        'lte',
        'greater_or_equal',
        'less_or_equal',
        'in',
        'not_in',
        'is_null',
        'is_not_null',
        'between',
      ]
      STANDARD_TEMPLATES.forEach((template) => {
        template.filters.forEach((filter) => {
          expect(validOperators).toContain(filter.operator)
        })
      })
    })

    it('should have valid filter groups', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        template.filters.forEach((filter) => {
          expect(filter.filter_group).toBeGreaterThanOrEqual(1)
          expect(Number.isInteger(filter.filter_group)).toBe(true)
        })
      })
    })

    it('should have relative date filters configured properly', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        template.filters.forEach((filter) => {
          if (filter.is_relative_date) {
            expect(filter.relative_date_value).toBeDefined()
            expect(filter.relative_date_unit).toBeDefined()
            expect(['days', 'weeks', 'months', 'years']).toContain(filter.relative_date_unit)
          }
        })
      })
    })
  })

  describe('Template Sorting Configuration', () => {
    it('should have valid sort directions', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        template.sorting.forEach((sort) => {
          expect(['asc', 'desc']).toContain(sort.direction)
        })
      })
    })

    it('should have properly ordered sorting', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const orders = template.sorting.map((s) => s.sort_order)
        const sortedOrders = [...orders].sort((a, b) => a - b)
        expect(orders).toEqual(sortedOrders)
      })
    })
  })

  describe('Template Grouping Configuration', () => {
    it('should have properly ordered grouping', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        if (template.grouping.length > 0) {
          const orders = template.grouping.map((g) => g.group_order)
          const sortedOrders = [...orders].sort((a, b) => a - b)
          expect(orders).toEqual(sortedOrders)
        }
      })
    })

    it('should have include_subtotals flag defined', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        template.grouping.forEach((group) => {
          expect(typeof group.include_subtotals).toBe('boolean')
        })
      })
    })
  })

  describe('Template Schedule Configuration', () => {
    it('should have valid recommended frequencies', () => {
      const validFrequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly']
      STANDARD_TEMPLATES.forEach((template) => {
        if (template.recommended_frequency) {
          expect(validFrequencies).toContain(template.recommended_frequency)
        }
      })
    })

    it('should have day_of_week for weekly templates', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        if (template.recommended_frequency === 'weekly' || template.recommended_frequency === 'bi-weekly') {
          if (template.recommended_day_of_week !== null) {
            expect(template.recommended_day_of_week).toBeGreaterThanOrEqual(0)
            expect(template.recommended_day_of_week).toBeLessThanOrEqual(6)
          }
        }
      })
    })

    it('should have day_of_month for monthly templates', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        if (template.recommended_frequency === 'monthly') {
          if (template.recommended_day_of_month !== null) {
            expect(template.recommended_day_of_month).toBeGreaterThanOrEqual(1)
            expect(template.recommended_day_of_month).toBeLessThanOrEqual(31)
          }
        }
      })
    })
  })

  describe('Template Content Configuration', () => {
    it('should have descriptive names', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        expect(template.name.length).toBeGreaterThan(5)
        expect(template.name.trim()).toBe(template.name)
      })
    })

    it('should have informative descriptions', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        expect(template.description.length).toBeGreaterThan(20)
        expect(template.description.trim()).toBe(template.description)
      })
    })

    it('should have icons defined', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        expect(template.icon).toBeDefined()
        expect(template.icon.length).toBeGreaterThan(0)
      })
    })

    it('should have at least one tag', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        expect(template.tags.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent field references in filters', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const fieldNames = template.fields.map((f) => f.field_name)
        template.filters.forEach((filter) => {
          // Filter field should either be in fields list or be a known column
          const isKnownField = fieldNames.includes(filter.field_name) ||
            ['id', 'created_at', 'updated_at', 'project_id'].includes(filter.field_name)
          expect(isKnownField).toBe(true)
        })
      })
    })

    it('should have consistent field references in sorting', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const fieldNames = template.fields.map((f) => f.field_name)
        template.sorting.forEach((sort) => {
          const isKnownField = fieldNames.includes(sort.field_name)
          expect(isKnownField).toBe(true)
        })
      })
    })

    it('should have consistent field references in grouping', () => {
      STANDARD_TEMPLATES.forEach((template) => {
        const fieldNames = template.fields.map((f) => f.field_name)
        template.grouping.forEach((group) => {
          const isKnownField = fieldNames.includes(group.field_name)
          expect(isKnownField).toBe(true)
        })
      })
    })
  })

  describe('Template Coverage', () => {
    it('should have templates for all major data sources', () => {
      const sources = getAllDataSources()
      const majorSources = ['daily_reports', 'rfis', 'submittals', 'change_orders', 'safety_incidents']

      majorSources.forEach((source) => {
        expect(sources).toContain(source)
      })
    })

    it('should have both daily and weekly templates', () => {
      const categories = getAllCategories()

      expect(categories).toContain('daily')
      expect(categories).toContain('weekly')
    })

    it('should have templates for different user roles', () => {
      const tags = getAllTags()

      expect(tags).toContain('superintendent')
      expect(tags).toContain('PM')
    })

    it('should have both PDF and Excel templates', () => {
      const pdfTemplates = STANDARD_TEMPLATES.filter((t) => t.default_format === 'pdf')
      const excelTemplates = STANDARD_TEMPLATES.filter((t) => t.default_format === 'excel')

      expect(pdfTemplates.length).toBeGreaterThan(0)
      expect(excelTemplates.length).toBeGreaterThan(0)
    })
  })
})
