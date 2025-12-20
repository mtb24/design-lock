/**
 * AI Output Validation (V0.1)
 * Validates that AI-generated JSX conforms to the design system contract
 */

import { DS_CONTRACT } from '../design-system/contracts'
import { tokens } from '../design-system/tokens'

export interface ValidationResult {
  ok: boolean
  violations: string[]
}

const ALLOWED_COMPONENTS = ['Button', 'Card', 'TextInput']
const ALLOWED_WRAPPER_TAGS = ['div', 'span', 'fragment', 'Fragment']

/**
 * Validates AI-generated JSX output against design system contract
 * V0.1: Basic string/regex validation for components, props, and enum values
 */
export function validateOutput(tsx: string): ValidationResult {
  const violations: string[] = []

  // Rule 1: Check for disallowed JSX tags
  const jsxTagPattern = /<(\w+)[\s>\/]/g
  const foundTags = new Set<string>()
  let match

  while ((match = jsxTagPattern.exec(tsx)) !== null) {
    const tagName = match[1]
    foundTags.add(tagName)
  }

  for (const tag of foundTags) {
    if (!ALLOWED_COMPONENTS.includes(tag) && !ALLOWED_WRAPPER_TAGS.includes(tag)) {
      violations.push(`Disallowed component: <${tag}> is not in the design system`)
    }
  }

  // Rule 2: Check for disallowed props and validate enum values
  for (const componentName of ALLOWED_COMPONENTS) {
    // Match component tags including their attributes (handles self-closing tags)
    const componentPattern = new RegExp(
      `<${componentName}([^>]*)\\\/?>`,
      'g'
    )
    
    let componentMatch
    while ((componentMatch = componentPattern.exec(tsx)) !== null) {
      const attributesStr = componentMatch[1]
      
      // Extract prop name-value pairs (handles quoted strings)
      const propPattern = /(\w+)=(?:"([^"]*)"|'([^']*)'|{([^}]*)})/g
      let propMatch
      
      while ((propMatch = propPattern.exec(attributesStr)) !== null) {
        const propName = propMatch[1]
        const propValue = propMatch[2] || propMatch[3] || propMatch[4] // "value", 'value', or {value}
        
        // Skip React built-ins
        if (propName === 'key' || propName === 'ref') continue
        
        const componentContract = DS_CONTRACT.components[componentName as keyof typeof DS_CONTRACT.components]
        const allowedProps = componentContract?.props
        
        // Check if prop exists in contract
        if (!allowedProps || !(propName in allowedProps)) {
          violations.push(
            `Invalid prop: ${componentName}.${propName} is not defined in contract`
          )
          continue
        }
        
        // Validate enum values - use type assertion to access properties
        const propDef = allowedProps[propName as keyof typeof allowedProps] as any
        if (propDef && propDef.type === 'enum' && Array.isArray(propDef.values)) {
          // Clean the value (remove quotes and trim)
          const cleanValue = propValue?.trim()
          
          if (cleanValue && !propDef.values.includes(cleanValue)) {
            violations.push(
              `Invalid value for ${componentName}.${propName}: "${cleanValue}" (allowed: ${propDef.values.join(', ')})`
            )
          }
        }
      }
    }
  }

  // Rule 3: Check for unknown token references
  // Look for patterns like tokens.colors.xxx or tokens.spacing.xxx
  const tokenPattern = /tokens\.(\w+)\.(\w+)/g
  let tokenMatch
  
  while ((tokenMatch = tokenPattern.exec(tsx)) !== null) {
    const category = tokenMatch[1]
    const tokenKey = tokenMatch[2]
    
    if (!(category in tokens)) {
      violations.push(`Unknown token category: tokens.${category}`)
    } else {
      const tokenCategory = tokens[category as keyof typeof tokens]
      if (!(tokenKey in tokenCategory)) {
        violations.push(`Unknown token: tokens.${category}.${tokenKey}`)
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  }
}

