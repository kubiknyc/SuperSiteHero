// File: /src/features/takeoffs/utils/assemblyCalculator.ts
// Assembly calculator for evaluating formulas and calculating quantities
// Supports variables, formulas, and item grouping

import { evaluate, parse } from 'mathjs'
import type { Database } from '@/types/database'

type Assembly = Database['public']['Tables']['assemblies']['Row']

/**
 * Assembly item with formula
 */
export interface AssemblyItem {
  id: string
  name: string
  description?: string
  formula?: string
  unit_of_measure: string
  quantity_formula?: string
  waste_factor?: number
  sort_order: number
}

/**
 * Assembly variable definition
 */
export interface AssemblyVariable {
  name: string
  label: string
  description?: string
  default_value?: number | string
  unit?: string
  type: 'number' | 'text' | 'select'
  options?: string[]
}

/**
 * Variable values provided by user
 */
export interface VariableValues {
  [variableName: string]: number | string
}

/**
 * Calculated assembly result
 */
export interface AssemblyCalculationResult {
  assemblyId: string
  assemblyName: string
  baseQuantity: number
  items: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    waste_factor?: number
    final_quantity: number
    formula?: string
    formula_result?: number
  }>
  totalCost?: number
  errors?: string[]
}

/**
 * Formula evaluation context
 */
interface EvaluationContext {
  [key: string]: number | string
}

/**
 * Parse and validate formula using mathjs
 *
 * Supported formulas:
 * - Simple operations: 'qty * 2', 'qty / 10', 'qty + 5'
 * - Multiple variables: 'length * width * height'
 * - Complex expressions: '((a + b) * (c - d)) / e'
 * - Parentheses: '(length * width * height) / 1728'
 * - Math functions: 'sqrt(area)', 'ceil(qty)', 'floor(qty)'
 */
export function parseFormula(formula: string): {
  valid: boolean
  error?: string
  variables: string[]
} {
  try {
    const node = parse(formula)

    // Extract variable names from the parsed expression
    const variables: string[] = []
    node.traverse((n) => {
      // Type guard for SymbolNode which has a 'name' property
      if (n.type === 'SymbolNode') {
        const symbolNode = n as unknown as { type: string; name: string }
        // Exclude built-in math functions
        const builtInFunctions = ['sqrt', 'abs', 'ceil', 'floor', 'round', 'pow', 'min', 'max', 'sin', 'cos', 'tan', 'log', 'exp']
        if (!builtInFunctions.includes(symbolNode.name) && !variables.includes(symbolNode.name)) {
          variables.push(symbolNode.name)
        }
      }
    })

    return {
      valid: true,
      variables,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid formula',
      variables: [],
    }
  }
}

/**
 * Evaluate formula with given variables using mathjs
 */
export function evaluateFormula(
  formula: string,
  variables: VariableValues
): { result: number; error?: string } {
  try {
    // Convert all values to numbers for calculation
    const scope: { [key: string]: number } = {}
    for (const [key, value] of Object.entries(variables)) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue)) {
        throw new Error(`Variable "${key}" has invalid numeric value: ${value}`)
      }
      scope[key] = numValue
    }

    const result = evaluate(formula, scope)

    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Formula did not evaluate to a valid number')
    }

    return { result }
  } catch (error) {
    return {
      result: 0,
      error: error instanceof Error ? error.message : 'Formula evaluation failed',
    }
  }
}

/**
 * Calculate assembly quantities
 */
export function calculateAssembly(
  assembly: Assembly,
  baseQuantity: number,
  variableValues: VariableValues = {}
): AssemblyCalculationResult {
  const errors: string[] = []

  // Parse items from JSONB
  const items = (assembly.items as any) as AssemblyItem[]
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Assembly has no items')
    return {
      assemblyId: assembly.id,
      assemblyName: assembly.name,
      baseQuantity,
      items: [],
      errors,
    }
  }

  // Parse variables from JSONB
  const variables = ((assembly.variables as any) || []) as AssemblyVariable[]

  // Build evaluation context with base quantity and user variables
  const context: EvaluationContext = {
    qty: baseQuantity,
    quantity: baseQuantity,
    ...variableValues,
  }

  // Validate all required variables are provided
  for (const variable of variables) {
    if (!(variable.name in context)) {
      if (variable.default_value !== undefined) {
        context[variable.name] = variable.default_value
      } else {
        errors.push(`Missing required variable: ${variable.label || variable.name}`)
      }
    }
  }

  // Calculate each item
  const calculatedItems = items.map((item) => {
    let quantity = baseQuantity
    let formulaResult: number | undefined

    // Evaluate quantity formula if provided
    if (item.quantity_formula) {
      const evaluation = evaluateFormula(item.quantity_formula, context)
      if (evaluation.error) {
        errors.push(`Error in formula for "${item.name}": ${evaluation.error}`)
        quantity = 0
      } else {
        formulaResult = evaluation.result
        quantity = evaluation.result
      }
    }

    // Apply waste factor
    const wasteFactor = item.waste_factor || 0
    const finalQuantity = quantity * (1 + wasteFactor / 100)

    return {
      id: item.id,
      name: item.name,
      quantity,
      unit: item.unit_of_measure,
      waste_factor: wasteFactor > 0 ? wasteFactor : undefined,
      final_quantity: finalQuantity,
      formula: item.quantity_formula,
      formula_result: formulaResult,
    }
  })

  return {
    assemblyId: assembly.id,
    assemblyName: assembly.name,
    baseQuantity,
    items: calculatedItems,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validate assembly definition
 */
export function validateAssembly(assembly: Assembly): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check basic fields
  if (!assembly.name) {
    errors.push('Assembly name is required')
  }

  if (!assembly.unit_of_measure) {
    errors.push('Unit of measure is required')
  }

  // Parse and validate items
  const items = (assembly.items as any) as AssemblyItem[]
  if (!Array.isArray(items)) {
    errors.push('Items must be an array')
    return { valid: false, errors, warnings }
  }

  if (items.length === 0) {
    warnings.push('Assembly has no items')
  }

  // Validate each item
  items.forEach((item, index) => {
    if (!item.name) {
      errors.push(`Item ${index + 1} is missing a name`)
    }

    if (!item.unit_of_measure) {
      errors.push(`Item "${item.name || index + 1}" is missing unit of measure`)
    }

    // Validate formula if provided
    if (item.quantity_formula) {
      const formulaCheck = parseFormula(item.quantity_formula)
      if (!formulaCheck.valid) {
        errors.push(`Item "${item.name}": ${formulaCheck.error}`)
      }
    }

    // Validate waste factor
    if (item.waste_factor !== undefined) {
      if (item.waste_factor < 0 || item.waste_factor > 100) {
        warnings.push(`Item "${item.name}": Waste factor should be between 0-100%`)
      }
    }
  })

  // Parse and validate variables
  const variables = ((assembly.variables as any) || []) as AssemblyVariable[]
  if (Array.isArray(variables)) {
    variables.forEach((variable, index) => {
      if (!variable.name) {
        errors.push(`Variable ${index + 1} is missing a name`)
      }

      if (!variable.label) {
        warnings.push(`Variable "${variable.name}" is missing a label`)
      }

      if (variable.type === 'select' && (!variable.options || variable.options.length === 0)) {
        errors.push(`Select variable "${variable.name}" must have options`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get all variables used across assembly items
 */
export function getAssemblyVariables(assembly: Assembly): AssemblyVariable[] {
  const variables = ((assembly.variables as any) || []) as AssemblyVariable[]
  return Array.isArray(variables) ? variables : []
}

/**
 * Get all formulas used in assembly
 */
export function getAssemblyFormulas(assembly: Assembly): Array<{
  itemName: string
  formula: string
  variables: string[]
}> {
  const items = (assembly.items as any) as AssemblyItem[]
  if (!Array.isArray(items)) return []

  return items
    .filter((item) => item.quantity_formula)
    .map((item) => {
      const formulaCheck = parseFormula(item.quantity_formula!)
      return {
        itemName: item.name,
        formula: item.quantity_formula!,
        variables: formulaCheck.variables,
      }
    })
}

/**
 * Create a simple assembly with basic items
 */
export function createSimpleAssembly(
  name: string,
  unitOfMeasure: string,
  items: Array<{ name: string; quantityPerUnit: number; unit: string; wasteFactor?: number }>
): Omit<Assembly, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {
  const assemblyItems: AssemblyItem[] = items.map((item, index) => ({
    id: `item-${index}`,
    name: item.name,
    quantity_formula: `qty * ${item.quantityPerUnit}`,
    unit_of_measure: item.unit,
    waste_factor: item.wasteFactor,
    sort_order: index,
  }))

  return {
    name,
    unit_of_measure: unitOfMeasure,
    assembly_level: 'company',
    items: assemblyItems as any,
    variables: null,
    description: null,
    category: null,
    trade: null,
    assembly_number: null,
    company_id: null,
    created_by: null,
  }
}

/**
 * Format assembly calculation result for display
 */
export function formatCalculationResult(result: AssemblyCalculationResult): string {
  let output = `${result.assemblyName}\n`
  output += `Base Quantity: ${result.baseQuantity}\n\n`

  result.items.forEach((item) => {
    output += `${item.name}:\n`
    output += `  Quantity: ${item.quantity.toFixed(2)} ${item.unit}\n`

    if (item.waste_factor) {
      output += `  Waste Factor: ${item.waste_factor}%\n`
      output += `  Final Quantity: ${item.final_quantity.toFixed(2)} ${item.unit}\n`
    }

    if (item.formula) {
      output += `  Formula: ${item.formula}\n`
    }

    output += '\n'
  })

  if (result.errors && result.errors.length > 0) {
    output += 'Errors:\n'
    result.errors.forEach((error) => {
      output += `  - ${error}\n`
    })
  }

  return output
}
