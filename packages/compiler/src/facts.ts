import ts from 'typescript'

export type Fact =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'enum'; values: Array<string | number | boolean> }
  | { kind: 'unsupported'; reason: string }

export type PropShape = {
  name: string
  optional: boolean
  fact: Fact
}

const NULLISH = ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void

function partsOf(type: ts.Type): ts.Type[] {
  if (!type.isUnion()) return [type]
  return type.types.filter((part) => (part.flags & NULLISH) === 0)
}

function isBoolean(type: ts.Type): boolean {
  const parts = partsOf(type)
  if (parts.length === 1 && (parts[0].flags & ts.TypeFlags.Boolean) !== 0) return true
  if (parts.length !== 2) return false
  const names = parts.map((part) => ((part.flags & ts.TypeFlags.BooleanLiteral) !== 0 ? (part as { intrinsicName?: string }).intrinsicName : ''))
  return names.includes('true') && names.includes('false')
}

function literalsOf(type: ts.Type, depth = 0): Array<string | number | boolean> | null {
  if (depth > 6) return null
  if ((type.flags & NULLISH) !== 0) return []
  if (type.isUnion()) {
    const values: Array<string | number | boolean> = []
    for (const part of type.types) {
      const collected = literalsOf(part, depth + 1)
      if (!collected) return null
      values.push(...collected)
    }
    return values
  }
  if (type.isStringLiteral() || type.isNumberLiteral()) return [type.value]
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) return [(type as { intrinsicName?: string }).intrinsicName === 'true']
  return null
}

function unsupportedFlag(type: ts.Type): Fact | null {
  if ((type.flags & ts.TypeFlags.Any) !== 0) return { kind: 'unsupported', reason: 'any' }
  if ((type.flags & ts.TypeFlags.Unknown) !== 0) return { kind: 'unsupported', reason: 'unknown' }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) return { kind: 'unsupported', reason: 'unresolved generic' }
  if ((type.flags & ts.TypeFlags.Conditional) !== 0) return { kind: 'unsupported', reason: 'unresolved conditional' }
  return null
}

function primitiveFact(type: ts.Type): Fact | null {
  if (isBoolean(type)) return { kind: 'boolean' }
  const literals = literalsOf(type)
  if (literals && literals.length > 0) {
    const values = [...new Map(literals.map((value) => [String(value), value])).values()]
    values.sort((left, right) => String(left).localeCompare(String(right)))
    return { kind: 'enum', values }
  }
  const parts = partsOf(type)
  if (parts.length === 1 && (parts[0].flags & ts.TypeFlags.String) !== 0 && !parts[0].isStringLiteral()) {
    return { kind: 'string' }
  }
  if (parts.length === 1 && (parts[0].flags & ts.TypeFlags.Number) !== 0 && !parts[0].isNumberLiteral()) {
    return { kind: 'number' }
  }
  return null
}

function hasOpenIndex(checker: ts.TypeChecker, type: ts.Type): boolean {
  const primitive = ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.BigInt
    | ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral
  if ((type.flags & primitive) !== 0) return false
  return checker.getIndexInfosOfType(type).length > 0
}

function describeFact(checker: ts.TypeChecker, type: ts.Type): Fact {
  const blocked = unsupportedFlag(type) ?? partsOf(type).map(unsupportedFlag).find(Boolean)
  if (blocked) return blocked
  const primitive = primitiveFact(type)
  if (primitive) return primitive
  const parts = partsOf(type)
  if (parts.some((part) => hasOpenIndex(checker, part))) {
    return { kind: 'unsupported', reason: 'open index signature' }
  }
  if (parts.some((part) => part.getCallSignatures().length > 0)) {
    return { kind: 'unsupported', reason: 'function' }
  }
  return { kind: 'unsupported', reason: 'unsupported type' }
}

function includesUndefined(type: ts.Type): boolean {
  return type.isUnion() && type.types.some((part) => (part.flags & ts.TypeFlags.Undefined) !== 0)
}

export function textCannotRepresent(fact: Fact): boolean {
  if (fact.kind !== 'unsupported') return false
  return fact.reason === 'any'
    || fact.reason === 'unknown'
    || fact.reason === 'unresolved generic'
    || fact.reason === 'unresolved conditional'
    || fact.reason === 'open index signature'
}

export function readProp(checker: ts.TypeChecker, type: ts.Type, name: string, node: ts.Node): PropShape | null {
  const prop = type.getProperty(name)
  if (!prop) return null
  const declared = declaredUnsupported(checker, prop)
  const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration ?? node)
  const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0 || includesUndefined(propType)
  return { name, optional, fact: declared ?? describeFact(checker, propType) }
}

function declaredUnsupported(checker: ts.TypeChecker, prop: ts.Symbol): Fact | null {
  const declaration = prop.declarations?.find((item) => ts.isPropertySignature(item) || ts.isPropertyDeclaration(item))
  if (!declaration || !('type' in declaration) || !declaration.type) return null
  if (unresolvedConditional(checker, declaration.type)) return { kind: 'unsupported', reason: 'unresolved conditional' }
  if (isTypeParameterReference(checker, declaration.type)) return { kind: 'unsupported', reason: 'unresolved generic' }
  return null
}

function unresolvedConditional(checker: ts.TypeChecker, node: ts.Node): boolean {
  if (ts.isConditionalTypeNode(node)) return isTypeParameterReference(checker, node.checkType)
  let found = false
  ts.forEachChild(node, (child) => {
    if (unresolvedConditional(checker, child)) found = true
  })
  return found
}

function isTypeParameterReference(checker: ts.TypeChecker, node: ts.Node): boolean {
  if (!ts.isTypeReferenceNode(node) || !ts.isIdentifier(node.typeName)) return false
  const symbol = checker.getSymbolAtLocation(node.typeName)
  return Boolean(symbol && (symbol.flags & ts.SymbolFlags.TypeParameter) !== 0)
}

export function correlatedMembers(type: ts.Type): ts.Type[] | null {
  const parts = partsOf(type)
  if (parts.length < 2) return null
  const objects = parts.every((part) => part.getProperties().length > 0 && part.getCallSignatures().length === 0)
  return objects ? parts : null
}

export function propertyNames(type: ts.Type): string[] {
  return type.getProperties().map((prop) => prop.getName()).sort()
}
