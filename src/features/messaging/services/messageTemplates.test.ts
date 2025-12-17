/**
 * Message Templates Service Tests
 * Comprehensive test suite for message template utilities and API functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractTemplateVariables,
  substituteTemplateVariables,
  validateTemplateSubstitutions,
  type TemplateSubstitution,
} from './messageTemplates'

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('extractTemplateVariables', () => {
  it('should extract single variable from template', () => {
    const content = 'Hello {name}!'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['name'])
  })

  it('should extract multiple variables from template', () => {
    const content = 'Today is {day} and the weather is {weather}.'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['day', 'weather'])
  })

  it('should extract variables with underscores and numbers', () => {
    const content = 'User {user_id} created project {project_123}.'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['project_123', 'user_id'])
  })

  it('should return unique variables only', () => {
    const content = 'Hello {name}, how are you {name}?'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['name'])
  })

  it('should return empty array when no variables found', () => {
    const content = 'This template has no variables.'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual([])
  })

  it('should ignore malformed variable syntax', () => {
    const content = 'This has {valid} but also { invalid } and {another_valid}.'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['another_valid', 'valid'])
  })

  it('should sort variables alphabetically', () => {
    const content = '{zebra} and {apple} and {middle}'
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['apple', 'middle', 'zebra'])
  })

  it('should handle empty string', () => {
    const variables = extractTemplateVariables('')
    expect(variables).toEqual([])
  })

  it('should handle complex template with many variables', () => {
    const content = `
      Project: {project_name}
      Status: {status}
      Owner: {owner}
      Due: {due_date}
      Budget: {budget}
    `
    const variables = extractTemplateVariables(content)
    expect(variables).toEqual(['budget', 'due_date', 'owner', 'project_name', 'status'])
  })
})

describe('substituteTemplateVariables', () => {
  it('should substitute single variable', () => {
    const content = 'Hello {name}!'
    const substitutions: TemplateSubstitution = { name: 'Alice' }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Hello Alice!')
  })

  it('should substitute multiple variables', () => {
    const content = 'Today is {day} and the weather is {weather}.'
    const substitutions: TemplateSubstitution = {
      day: 'Monday',
      weather: 'sunny',
    }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Today is Monday and the weather is sunny.')
  })

  it('should substitute same variable multiple times', () => {
    const content = 'Hello {name}, how are you {name}?'
    const substitutions: TemplateSubstitution = { name: 'Bob' }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Hello Bob, how are you Bob?')
  })

  it('should leave unmatched variables unchanged', () => {
    const content = 'Hello {name}, you are {age} years old.'
    const substitutions: TemplateSubstitution = { name: 'Charlie' }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Hello Charlie, you are {age} years old.')
  })

  it('should handle empty substitutions object', () => {
    const content = 'Hello {name}!'
    const substitutions: TemplateSubstitution = {}
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Hello {name}!')
  })

  it('should handle extra substitutions gracefully', () => {
    const content = 'Hello {name}!'
    const substitutions: TemplateSubstitution = {
      name: 'David',
      age: '30',
      city: 'NYC',
    }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Hello David!')
  })

  it('should handle substitutions with special characters', () => {
    const content = 'Alert: {message}'
    const substitutions: TemplateSubstitution = {
      message: 'Error occurred! Please check $variable.',
    }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('Alert: Error occurred! Please check $variable.')
  })

  it('should handle empty content', () => {
    const content = ''
    const substitutions: TemplateSubstitution = { name: 'Emma' }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('')
  })

  it('should substitute variables with underscores and numbers', () => {
    const content = 'User {user_id} created project {project_123}.'
    const substitutions: TemplateSubstitution = {
      user_id: 'U12345',
      project_123: 'Building A',
    }
    const result = substituteTemplateVariables(content, substitutions)
    expect(result).toBe('User U12345 created project Building A.')
  })
})

describe('validateTemplateSubstitutions', () => {
  it('should validate complete substitutions', () => {
    const content = 'Hello {name}, you are {age} years old.'
    const substitutions: TemplateSubstitution = {
      name: 'Frank',
      age: '25',
    }
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(true)
    expect(validation.missing).toEqual([])
  })

  it('should detect missing substitutions', () => {
    const content = 'Hello {name}, you are {age} years old and live in {city}.'
    const substitutions: TemplateSubstitution = {
      name: 'Grace',
    }
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(false)
    expect(validation.missing).toEqual(['age', 'city'])
  })

  it('should validate when no variables exist', () => {
    const content = 'This is a simple message.'
    const substitutions: TemplateSubstitution = {}
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(true)
    expect(validation.missing).toEqual([])
  })

  it('should ignore extra substitutions', () => {
    const content = 'Hello {name}!'
    const substitutions: TemplateSubstitution = {
      name: 'Henry',
      age: '40',
      city: 'LA',
    }
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(true)
    expect(validation.missing).toEqual([])
  })

  it('should detect all missing when no substitutions provided', () => {
    const content = 'Project {project_name} status is {status}.'
    const substitutions: TemplateSubstitution = {}
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(false)
    expect(validation.missing).toEqual(['project_name', 'status'])
  })

  it('should validate partial substitutions correctly', () => {
    const content = 'Alert: {severity} - {message} at {location}'
    const substitutions: TemplateSubstitution = {
      severity: 'HIGH',
      message: 'Equipment failure',
    }
    const validation = validateTemplateSubstitutions(content, substitutions)
    expect(validation.valid).toBe(false)
    expect(validation.missing).toEqual(['location'])
  })
})

// ============================================================================
// Integration Tests (would require mocking supabase)
// ============================================================================

describe('Message Templates Integration', () => {
  it('should extract and substitute in realistic scenario', () => {
    // Realistic template
    const template = `Daily Progress Update for {project_name}:

    Completed: {completed_work}
    Current Status: {status}
    Next Steps: {next_steps}

    Weather: {weather}
    Team: {team_size} workers on site`

    // Extract variables
    const variables = extractTemplateVariables(template)
    expect(variables).toHaveLength(6)
    expect(variables).toContain('project_name')
    expect(variables).toContain('completed_work')
    expect(variables).toContain('status')

    // Validate with incomplete substitutions
    const partialSubs: TemplateSubstitution = {
      project_name: 'Building A',
      status: 'On Track',
    }
    const validation = validateTemplateSubstitutions(template, partialSubs)
    expect(validation.valid).toBe(false)
    expect(validation.missing).toHaveLength(4)

    // Substitute with complete data
    const completeSubs: TemplateSubstitution = {
      project_name: 'Building A',
      completed_work: 'Foundation poured',
      status: 'On Track',
      next_steps: 'Start framing',
      weather: 'Sunny, 72°F',
      team_size: '12',
    }
    const result = substituteTemplateVariables(template, completeSubs)
    expect(result).toContain('Building A')
    expect(result).toContain('Foundation poured')
    expect(result).toContain('On Track')
    expect(result).not.toContain('{')
    expect(result).not.toContain('}')
  })

  it('should handle safety template scenario', () => {
    const template = 'Safety concern: {concern} at {location}. Action: {action}.'
    const variables = extractTemplateVariables(template)
    expect(variables).toEqual(['action', 'concern', 'location'])

    const substitutions: TemplateSubstitution = {
      concern: 'Wet floor',
      location: 'Building B entrance',
      action: 'Place warning signs',
    }
    const result = substituteTemplateVariables(template, substitutions)
    expect(result).toBe(
      'Safety concern: Wet floor at Building B entrance. Action: Place warning signs.'
    )
  })

  it('should handle template with no variables', () => {
    const template = 'Good morning team! Let\'s have a safe and productive day.'
    const variables = extractTemplateVariables(template)
    expect(variables).toEqual([])

    const validation = validateTemplateSubstitutions(template, {})
    expect(validation.valid).toBe(true)

    const result = substituteTemplateVariables(template, {})
    expect(result).toBe(template)
  })
})
