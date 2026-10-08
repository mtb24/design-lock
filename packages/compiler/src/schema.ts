import type { CoverageEntry } from '@design-lock/core'
import type { Fact, PropShape } from './facts.js'
import type { PropPolicy } from './policy.js'
import type { TokenRead } from './tokens.js'

export type PropertyResult = {
  schema?: Record<string, unknown>
  coverage: CoverageEntry
  diagnostic?: string
  tokenRefs: Array<{ family: string; key: string }>
  required: boolean
}

function bounds(policy: PropPolicy): Record<string, number> {
  const result: Record<string, number> = {}
  for (const key of ['minLength', 'maxLength', 'minimum', 'maximum'] as const) {
    if (typeof policy[key] === 'number') result[key] = policy[key]
  }
  return result
}

function pascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join('')
}

function tokenName(policy: PropPolicy, value: string): string {
  if (!policy.tokenKeyPattern) return value
  return policy.tokenKeyPattern.replace('{Pascal}', pascal(value))
}

function unsupported(prop: PropShape, reason: string): PropertyResult {
  return {
    required: false,
    tokenRefs: [],
    diagnostic: `${prop.name}: ${reason}`,
    coverage: { field: prop.name, authority: 'unsupported', detail: reason },
  }
}

function enumValues(fact: Extract<Fact, { kind: 'enum' }>, policy: PropPolicy, prop: PropShape): PropertyResult | Array<string | number | boolean> {
  const derived = new Set(fact.values.map(String))
  if (!policy.select) return fact.values
  const unknown = policy.select.filter((value) => !derived.has(String(value)))
  if (unknown.length > 0) return unsupported(prop, `selected values are not in the source union: ${unknown.join(', ')}`)
  return [...policy.select]
}

function tokenized(
  prop: PropShape,
  values: Array<string | number | boolean>,
  policy: PropPolicy,
  tokens: Map<string, TokenRead>,
): PropertyResult | { refs: Array<{ family: string; key: string }> } {
  if (!policy.tokenFamily) return { refs: [] }
  const family = tokens.get(policy.tokenFamily)
  if (!family) return unsupported(prop, `token family ${policy.tokenFamily} was not read`)
  const refs: Array<{ family: string; key: string }> = []
  for (const value of values) {
    const key = tokenName(policy, String(value))
    if (family.unresolvedAliases.includes(key)) return unsupported(prop, `token ${key} is an unresolved alias`)
    if (!(key in family.values)) return unsupported(prop, `token ${key} does not exist in ${policy.tokenFamily}`)
    refs.push({ family: policy.tokenFamily, key })
  }
  return { refs }
}

function finishEnum(
  prop: PropShape,
  policy: PropPolicy,
  values: Array<string | number | boolean>,
  keys: Array<{ family: string; key: string }>,
  narrowed: boolean,
  isRequired: boolean,
): PropertyResult {
  const typed = values.every((value) => typeof value === 'number') ? 'number' : 'string'
  return {
    required: isRequired,
    tokenRefs: keys,
    schema: {
      type: typed,
      enum: [...values].sort((left, right) => String(left).localeCompare(String(right))),
      ...(keys.length > 0 ? { 'x-design-lock-role': 'token' } : {}),
      'x-design-lock-authority': narrowed || keys.length > 0 ? 'policy' : 'derived',
    },
    coverage: {
      field: prop.name,
      authority: narrowed ? 'policy' : 'derived',
      detail: narrowed ? `narrowed from ${prop.fact.kind === 'enum' ? prop.fact.values.join('|') : prop.fact.kind}` : 'source literal union',
    },
  }
}

function exposure(prop: PropShape, policy: PropPolicy): PropertyResult | { required: boolean } {
  if (policy.required === false && !prop.optional) {
    return unsupported(prop, 'policy cannot relax a required source prop')
  }
  return { required: policy.required === true || !prop.optional }
}

function textSchema(prop: PropShape, policy: PropPolicy): PropertyResult {
  if (prop.fact.kind === 'enum') return unsupported(prop, 'text narrowing would discard a literal')
  if (prop.fact.kind === 'unsupported') return unsupported(prop, prop.fact.reason)
  if (prop.fact.kind !== 'string') return unsupported(prop, 'text narrowing is not assignable to the source type')
  const required = exposure(prop, policy)
  if ('diagnostic' in required) return required
  return {
    required: required.required,
    tokenRefs: [],
    schema: { type: 'string', ...bounds(policy), 'x-design-lock-authority': 'policy' },
    coverage: { field: prop.name, authority: 'policy', detail: 'text-only narrowing of a source type that accepts string' },
  }
}

export function propertySchema(prop: PropShape, policy: PropPolicy, tokens: Map<string, TokenRead>): PropertyResult {
  if (policy.representation === 'text') return textSchema(prop, policy)
  if (prop.fact.kind === 'unsupported') return unsupported(prop, prop.fact.reason)
  const required = exposure(prop, policy)
  if ('diagnostic' in required) return required
  if (prop.fact.kind === 'boolean') {
    return {
      required: required.required,
      tokenRefs: [],
      schema: { type: 'boolean', 'x-design-lock-authority': 'derived' },
      coverage: { field: prop.name, authority: 'derived', detail: 'boolean' },
    }
  }
  if (prop.fact.kind === 'string' || prop.fact.kind === 'number') {
    const limited = Object.keys(bounds(policy)).length > 0
    return {
      required: required.required,
      tokenRefs: [],
      schema: { type: prop.fact.kind, ...bounds(policy), 'x-design-lock-authority': limited ? 'policy' : 'derived' },
      coverage: { field: prop.name, authority: limited ? 'policy' : 'derived', detail: prop.fact.kind },
    }
  }
  const values = enumValues(prop.fact, policy, prop)
  if (!Array.isArray(values)) return values
  const tokensForValues = tokenized(prop, values, policy, tokens)
  if (!('refs' in tokensForValues)) return tokensForValues
  return finishEnum(
    prop,
    policy,
    values,
    tokensForValues.refs,
    Boolean(policy.select && policy.select.length !== prop.fact.values.length),
    required.required,
  )
}

export function objectSchema(modelName: string, id: string, properties: Record<string, unknown>, required: string[]) {
  return {
    $id: id,
    type: 'object',
    additionalProperties: false,
    required: [...required].sort(),
    properties: { component: { const: modelName }, ...properties },
    'x-design-lock-authority': 'closed-contract',
  }
}
