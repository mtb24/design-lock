import { canonicalJson } from './canonical.js'
import type { ContractArtifact, ContractChange, ContractDiff, ContractDiffClassification } from './contract-types.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function push(changes: ContractChange[], kind: ContractChange['kind'], path: string, detail: string) {
  changes.push({ kind, path, detail })
}

function compareEnum(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  const had = Array.isArray(before)
  const has = Array.isArray(after)
  if (had && !has) {
    push(changes, 'expanded', path, 'removed enum restriction')
    return
  }
  if (!had && has) {
    push(changes, 'restricted', path, 'added enum restriction')
    return
  }
  const previous = new Set(strings(before))
  const next = new Set(strings(after))
  if (previous.size === 0 && next.size === 0) return
  for (const value of next) {
    if (!previous.has(value)) push(changes, 'expanded', path, `added value ${value}`)
  }
  for (const value of previous) {
    if (!next.has(value)) push(changes, 'restricted', path, `removed value ${value}`)
  }
}

function compareStringSets(
  path: string,
  before: string[],
  after: string[],
  added: ContractChange['kind'],
  removed: ContractChange['kind'],
  changes: ContractChange[],
) {
  const previous = new Set(before)
  const next = new Set(after)
  for (const value of next) {
    if (!previous.has(value)) push(changes, added, path, `added ${value}`)
  }
  for (const value of previous) {
    if (!next.has(value)) push(changes, removed, path, `removed ${value}`)
  }
}

const LOOSER_WHEN_LARGER = new Set(['maxLength', 'maxItems', 'maximum'])
const TIGHTER_WHEN_LARGER = new Set(['minLength', 'minItems', 'minimum'])

function compareBound(path: string, key: string, before: unknown, after: unknown, changes: ContractChange[]) {
  if (before === after) return
  if (typeof before !== 'number' && typeof after !== 'number') return
  if (typeof before !== 'number') {
    push(changes, 'restricted', `${path}.${key}`, `added bound ${String(after)}`)
    return
  }
  if (typeof after !== 'number') {
    push(changes, 'expanded', `${path}.${key}`, `removed bound ${String(before)}`)
    return
  }
  const grew = after > before
  if (!grew && after === before) return
  const loosens = LOOSER_WHEN_LARGER.has(key) ? grew : TIGHTER_WHEN_LARGER.has(key) ? !grew : null
  if (loosens === null) {
    push(changes, 'unclassifiable', `${path}.${key}`, `${String(before)} -> ${String(after)}`)
    return
  }
  push(changes, loosens ? 'expanded' : 'restricted', `${path}.${key}`, `${String(before)} -> ${String(after)}`)
}

const SCHEMA_KEYS = new Set([
  'type', 'const', 'enum', 'required', 'additionalProperties', 'properties', 'items', 'oneOf',
  'maxLength', 'minLength', 'maxItems', 'minItems', 'maximum', 'minimum',
  '$id', 'x-design-lock-authority', 'x-design-lock-role',
])

function compareConst(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  if (canonicalJson(before) === canonicalJson(after)) return
  if (before === undefined) push(changes, 'restricted', path, 'added const')
  else if (after === undefined) push(changes, 'expanded', path, 'removed const')
  else push(changes, 'unclassifiable', path, 'const changed')
}

function compareType(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  if (before === after) return
  if (before === undefined || after === undefined) {
    push(changes, 'unclassifiable', path, 'type presence changed')
    return
  }
  push(changes, 'unclassifiable', path, `${String(before)} -> ${String(after)}`)
}

function compareAdditional(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  const previous = before === undefined ? true : before
  const next = after === undefined ? true : after
  if (previous === next) return
  if (previous === false && next === true) push(changes, 'expanded', path, 'additional properties allowed')
  else if (previous === true && next === false) push(changes, 'restricted', path, 'additional properties denied')
  else push(changes, 'unclassifiable', path, 'additionalProperties changed')
}

function compareSchema(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  if (canonicalJson(before) === canonicalJson(after)) return
  if (!isRecord(before) || !isRecord(after)) {
    push(changes, 'unclassifiable', path, 'schema replaced by a different shape')
    return
  }
  compareType(`${path}.type`, before.type, after.type, changes)
  compareConst(`${path}.const`, before.const, after.const, changes)
  compareEnum(`${path}.enum`, before.enum, after.enum, changes)
  compareAdditional(`${path}.additionalProperties`, before.additionalProperties, after.additionalProperties, changes)
  compareStringSets(`${path}.required`, strings(before.required), strings(after.required), 'restricted', 'expanded', changes)
  for (const key of ['maxLength', 'minLength', 'maxItems', 'minItems', 'maximum', 'minimum']) {
    compareBound(path, key, before[key], after[key], changes)
  }
  compareProperties(path, before.properties, after.properties, changes)
  if (before.items || after.items) compareSchema(`${path}.items`, before.items, after.items, changes)
  if (before.oneOf || after.oneOf) compareBranches(path, before.oneOf, after.oneOf, changes)
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (SCHEMA_KEYS.has(key)) continue
    if (canonicalJson(before[key]) !== canonicalJson(after[key])) {
      push(changes, 'unclassifiable', `${path}.${key}`, 'unhandled schema keyword changed')
    }
  }
}

function compareBranches(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  const previous = Array.isArray(before) ? before : []
  const next = Array.isArray(after) ? after : []
  if (previous.length !== next.length) {
    push(changes, 'unclassifiable', path, `correlated branch count ${previous.length} -> ${next.length}`)
  }
  const count = Math.min(previous.length, next.length)
  for (let index = 0; index < count; index += 1) {
    compareSchema(`${path}.oneOf[${index}]`, previous[index], next[index], changes)
  }
}

function compareProperties(path: string, before: unknown, after: unknown, changes: ContractChange[]) {
  const previous = isRecord(before) ? before : {}
  const next = isRecord(after) ? after : {}
  for (const key of Object.keys(next)) {
    if (!(key in previous)) push(changes, 'expanded', `${path}.${key}`, 'added property')
    else compareSchema(`${path}.${key}`, previous[key], next[key], changes)
  }
  for (const key of Object.keys(previous)) {
    if (!(key in next)) push(changes, 'restricted', `${path}.${key}`, 'removed property')
  }
}

function componentMap(artifact: ContractArtifact) {
  return new Map(artifact.semantic.components.map((component) => [component.modelName, component.schema]))
}

function compareComponents(before: ContractArtifact, after: ContractArtifact, changes: ContractChange[]) {
  const previous = componentMap(before)
  const next = componentMap(after)
  for (const [name, schema] of next) {
    if (!previous.has(name)) push(changes, 'expanded', name, 'added component')
    else compareSchema(name, previous.get(name), schema, changes)
  }
  for (const name of previous.keys()) {
    if (!next.has(name)) push(changes, 'restricted', name, 'removed component')
  }
}

function tokenMap(artifact: ContractArtifact) {
  return new Map(artifact.provenance.tokens.map((token) => [token.family, token.values]))
}

function exposedKeys(artifact: ContractArtifact, family: string) {
  return new Set(artifact.semantic.tokenKeys.find((token) => token.family === family)?.keys ?? [])
}

function tokenSnapshot(artifact: ContractArtifact) {
  return artifact.provenance.tokens.map((token) => ({ family: token.family, values: token.values }))
}

function compareTokenFamily(
  family: string,
  prior: Record<string, string>,
  values: Record<string, string>,
  exposed: Set<string>,
  changes: ContractChange[],
) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in prior)) {
      if (!exposed.has(key)) push(changes, 'provenance', `tokens.${family}.${key}`, 'added unexposed token')
      continue
    }
    if (prior[key] !== value) push(changes, 'token-value', `tokens.${family}.${key}`, `${prior[key]} -> ${value}`)
  }
  for (const key of Object.keys(prior)) {
    if (key in values) continue
    push(changes, exposed.has(key) ? 'restricted' : 'provenance', `tokens.${family}.${key}`, 'removed token')
  }
}

function compareExposedTokens(before: ContractArtifact, after: ContractArtifact, changes: ContractChange[]) {
  const families = new Set([
    ...before.semantic.tokenKeys.map((token) => token.family),
    ...after.semantic.tokenKeys.map((token) => token.family),
  ])
  for (const family of families) {
    const prior = exposedKeys(before, family)
    const next = exposedKeys(after, family)
    for (const key of next) {
      if (!prior.has(key)) push(changes, 'expanded', `tokens.${family}.${key}`, 'exposed token')
    }
    for (const key of prior) {
      if (!next.has(key)) push(changes, 'restricted', `tokens.${family}.${key}`, 'removed exposed token')
    }
  }
}

function compareTokens(before: ContractArtifact, after: ContractArtifact, changes: ContractChange[]) {
  const previous = tokenMap(before)
  const next = tokenMap(after)
  for (const [family, values] of next) {
    const prior = previous.get(family)
    if (!prior) {
      push(changes, 'expanded', `tokens.${family}`, 'added token family')
      continue
    }
    compareTokenFamily(family, prior, values, exposedKeys(after, family), changes)
  }
  for (const family of previous.keys()) {
    if (!next.has(family)) push(changes, 'restricted', `tokens.${family}`, 'removed token family')
  }
}

function classify(changes: ContractChange[]): ContractDiffClassification {
  if (changes.length === 0) return 'unchanged'
  if (changes.some((change) => change.kind === 'unclassifiable')) return 'unclassifiable'
  const expanded = changes.some((change) => change.kind === 'expanded')
  const restricted = changes.some((change) => change.kind === 'restricted')
  if (expanded && restricted) return 'mixed'
  if (expanded) return 'expanded'
  if (restricted) return 'restricted'
  if (changes.some((change) => change.kind === 'token-value')) return 'token-value'
  return 'provenance-only'
}

export function diffContracts(before: ContractArtifact, after: ContractArtifact): ContractDiff {
  const changes: ContractChange[] = []
  compareComponents(before, after, changes)
  compareExposedTokens(before, after, changes)
  compareTokens(before, after, changes)
  const semanticSame = canonicalJson(before.semantic) === canonicalJson(after.semantic)
  const tokensSame = canonicalJson(tokenSnapshot(before)) === canonicalJson(tokenSnapshot(after))
  if (semanticSame && tokensSame && before.provenanceHash !== after.provenanceHash) {
    push(changes, 'provenance', 'provenance', 'provenance identity changed without an effective permission change')
  }
  const classification = classify(changes)
  return { changes, classification, requiresReview: classification !== 'unchanged' }
}
