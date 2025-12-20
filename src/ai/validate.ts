/**
 * AI Output Validation
 * Validates that AI-generated JSX conforms to the design system contract
 */

import { DS_CONTRACT } from '../design-system/contracts'
import { tokens } from '../design-system/tokens'

export interface ValidationResult {
  ok: boolean
  violations: string[]
  warnings: string[]
}

const ALLOWED_COMPONENTS = ['Button', 'Card', 'TextInput']
const ALLOWED_WRAPPER_TAGS = ['div', 'span', 'fragment', 'Fragment']

/**
 * Validates AI-generated JSX output against design system contract
 */
export function validateOutput(tsx: string): ValidationResult {
  const violations: string[] = []
  const warnings: string[] = []

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
    } else if (ALLOWED_WRAPPER_TAGS.includes(tag)) {
      warnings.push(`Wrapper element <${tag}> used - prefer design system components`)
    }
  }

  // Rule 2: Check for disallowed props on each component
  for (const componentName of ALLOWED_COMPONENTS) {
    const componentPattern = new RegExp(
      `<${componentName}[^>]*>`,
      'g'
    )
    
    let componentMatch
    while ((componentMatch = componentPattern.exec(tsx)) !== null) {
      const componentTag = componentMatch[0]
      
      // Extract props from the tag
      const propPattern = /(\w+)=/g
      let propMatch
      
      while ((propMatch = propPattern.exec(componentTag)) !== null) {
        const propName = propMatch[1]
        
        // Skip React built-ins
        if (propName === 'key' || propName === 'ref') continue
        
        const allowedProps = DS_CONTRACT.components[componentName as keyof typeof DS_CONTRACT.components]?.props
        
        if (!allowedProps || !(propName in allowedProps)) {
          violations.push(
            `Invalid prop: ${componentName}.${propName} is not defined in contract`
          )
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
    warnings,
  }
}

