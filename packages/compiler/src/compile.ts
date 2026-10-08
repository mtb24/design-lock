import { readFileSync } from 'node:fs'
import ts from 'typescript'
import type { ComponentProvenance, ContractArtifact, CoverageEntry } from '@design-lock/core'
import { correlatedMembers, propertyNames, readProp, textCannotRepresent, type Fact, type PropShape } from './facts.js'
import { hashJson, sha256 } from './hash.js'
import { portablePath } from './paths.js'
import type { ComponentPolicy, ExtractionPolicy } from './policy.js'
import { createExtractProgram, extractSource } from './program.js'
import { objectSchema, propertySchema } from './schema.js'
import { readPolicyTokens, type TokenRead } from './tokens.js'

export type CompileSuccess = { ok: true; artifact: ContractArtifact }
export type CompileFailure = { ok: false; diagnostics: string[] }
export type CompileResult = CompileSuccess | CompileFailure

type Session = {
  checker: ts.TypeChecker
  sourceFile: ts.SourceFile
  repoRoot: string
  tokens: Map<string, TokenRead>
  diagnostics: string[]
}

function alias(session: Session, name: string): ts.Type | null {
  const statement = session.sourceFile.statements.find(
    (item) => ts.isTypeAliasDeclaration(item) && item.name.text === name,
  )
  if (!statement || !ts.isTypeAliasDeclaration(statement)) return null
  return session.checker.getTypeFromTypeNode(statement.type)
}

function valueNode(session: Session, name: string): ts.Identifier | null {
  for (const statement of session.sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return declaration.name
    }
  }
  return null
}

function importedSymbol(session: Session, localName: string): ts.Symbol | undefined {
  for (const statement of session.sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue
    const names: ts.Identifier[] = []
    if (statement.importClause.name) names.push(statement.importClause.name)
    const bindings = statement.importClause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) names.push(...bindings.elements.map((element) => element.name))
    const match = names.find((name) => name.text === localName)
    if (!match) continue
    const symbol = session.checker.getSymbolAtLocation(match)
    if (!symbol) return undefined
    return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? session.checker.getAliasedSymbol(symbol) : symbol
  }
  return undefined
}

function typeArgumentsOf(checker: ts.TypeChecker, type: ts.Type): readonly ts.Type[] {
  if (type.aliasTypeArguments && type.aliasTypeArguments.length > 0) return type.aliasTypeArguments
  const reference = type as ts.TypeReference
  if (!reference.target) return []
  return checker.getTypeArguments(reference)
}

function stringLiteralArgument(checker: ts.TypeChecker, type: ts.Type, depth = 0): string | undefined {
  if (depth > 6 || type.isStringLiteral()) return type.isStringLiteral() ? type.value : undefined
  for (const argument of typeArgumentsOf(checker, type)) {
    const found = stringLiteralArgument(checker, argument, depth + 1)
    if (found) return found
  }
  if (type.isIntersection() || type.isUnion()) {
    for (const part of type.types) {
      const found = stringLiteralArgument(checker, part, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

function rootBinding(session: Session, index: number, explicit?: string): string {
  if (explicit) return explicit
  const symbol = importedSymbol(session, `__cmp${index}`)
  const declaration = symbol?.declarations?.[0]
  if (!symbol || !declaration) return 'unspecified'
  const type = session.checker.getTypeOfSymbolAtLocation(symbol, declaration)
  const signature = session.checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0]
  const parameter = signature?.getTypeParameters()?.[0]
  const fallback = parameter ? session.checker.getDefaultFromTypeParameter(parameter) : undefined
  if (fallback?.isStringLiteral()) return fallback.value
  if (fallback) return session.checker.typeToString(fallback)
  return stringLiteralArgument(session.checker, type) ?? 'unspecified'
}

function declarationOf(session: Session, index: number) {
  const symbol = importedSymbol(session, `__cmp${index}`)
  const declaration = symbol?.declarations?.[0]
  const fileName = declaration?.getSourceFile().fileName ?? ''
  const text = fileName ? readFileSync(fileName, 'utf8') : ''
  return {
    path: fileName ? portablePath(fileName, session.repoRoot) : 'unresolved',
    symbolName: symbol?.getName() === '_default' || symbol?.getName() === 'default' ? 'default' : symbol?.getName() ?? 'unresolved',
    hash: sha256(text),
  }
}

function schemaGroup(packageName: string): string {
  if (packageName.startsWith('@mui/')) return 'mui'
  if (packageName.startsWith('@carbon/')) return 'carbon'
  return 'fixture'
}

function packageVersion(session: Session, packageName: string): string {
  if (packageName === 'fixture') return '0'
  const manifest = readFileSync(`${session.repoRoot}/node_modules/${packageName}/package.json`, 'utf8')
  return (JSON.parse(manifest) as { version: string }).version
}

function memberShapes(session: Session, members: ts.Type[], names: string[], node: ts.Node): PropShape[][] | string {
  const shapes: PropShape[][] = []
  for (const member of members) {
    const props: PropShape[] = []
    for (const name of names) {
      const prop = readProp(session.checker, member, name, node)
      if (!prop) continue
      if (prop.fact.kind === 'unsupported') return `${name}: ${prop.fact.reason}`
      props.push(prop)
    }
    shapes.push(props)
  }
  if (names.some((name) => shapes.every((shape) => !shape.some((prop) => prop.name === name)))) {
    return `requested prop is missing from every correlated branch`
  }
  return shapes
}

function textIsAssignable(session: Session, type: ts.Type, name: string, node: ts.Node): boolean {
  const propSymbol = type.getProperty(name)
  const propType = propSymbol
    ? session.checker.getTypeOfSymbolAtLocation(propSymbol, propSymbol.valueDeclaration ?? node)
    : null
  return Boolean(propType && session.checker.isTypeAssignableTo(session.checker.getStringType(), propType))
}

function singleShapes(session: Session, type: ts.Type, component: ComponentPolicy, node: ts.Node): PropShape[] | string {
  const props: PropShape[] = []
  for (const name of Object.keys(component.props)) {
    const prop = readProp(session.checker, type, name, node)
    if (!prop) return `${component.modelName}.${name}: prop was not found on the selected type`
    if (prop.fact.kind === 'unsupported' && textCannotRepresent(prop.fact)) {
      return `${component.modelName}.${name}: ${prop.fact.reason}`
    }
    if (component.props[name].representation === 'text' && !textIsAssignable(session, type, name, node)) {
      return `${component.modelName}.${name}: text narrowing is not assignable to the source type`
    }
    if (prop.fact.kind === 'unsupported' && component.props[name].representation !== 'text') {
      return `${component.modelName}.${name}: ${prop.fact.reason}`
    }
    props.push(prop.fact.kind === 'unsupported' ? { ...prop, fact: { kind: 'string' } } : prop)
  }
  return props
}

function schemaFromProps(
  modelName: string,
  id: string,
  props: PropShape[],
  component: ComponentPolicy,
  tokens: Map<string, TokenRead>,
): { schema: Record<string, unknown>; coverage: CoverageEntry[]; tokenRefs: Array<{ family: string; key: string }>; diagnostic?: string } {
  const properties: Record<string, unknown> = {}
  const required = ['component']
  const coverage: CoverageEntry[] = []
  const tokenRefs: Array<{ family: string; key: string }> = []
  for (const prop of props) {
    const result = propertySchema(prop, component.props[prop.name] ?? {}, tokens)
    if (result.diagnostic || !result.schema) {
      return { schema: {}, coverage: [result.coverage], tokenRefs: [], diagnostic: `${modelName}.${result.diagnostic}` }
    }
    properties[prop.name] = result.schema
    if (result.required) required.push(prop.name)
    coverage.push(result.coverage)
    tokenRefs.push(...result.tokenRefs)
  }
  return { schema: objectSchema(modelName, id, properties, required), coverage, tokenRefs }
}

function unionSchema(
  modelName: string,
  id: string,
  members: PropShape[][],
  component: ComponentPolicy,
  tokens: Map<string, TokenRead>,
): { schema: Record<string, unknown>; coverage: CoverageEntry[]; tokenRefs: Array<{ family: string; key: string }>; diagnostic?: string } {
  const branches = []
  const coverage: CoverageEntry[] = []
  const tokenRefs: Array<{ family: string; key: string }> = []
  for (const props of members) {
    const built = schemaFromProps(modelName, id, props, component, tokens)
    if (built.diagnostic) return built
    const { $id: _ignored, ...branch } = built.schema
    branches.push(branch)
    tokenRefs.push(...built.tokenRefs)
    coverage.push(...built.coverage)
  }
  return {
    schema: { $id: id, oneOf: branches, 'x-design-lock-authority': 'correlated-union' },
    coverage: [{ field: '*shape', authority: 'derived', detail: `${members.length} correlated branches` }, ...coverage],
    tokenRefs,
  }
}

function exclusionEntries(session: Session, type: ts.Type, component: ComponentPolicy, node: ts.Node): CoverageEntry[] {
  const entries: CoverageEntry[] = []
  for (const name of component.exclude ?? []) {
    if (component.bindings?.[name]) continue
    const prop = readProp(session.checker, type, name, node)
    if (prop && !prop.optional) {
      session.diagnostics.push(`${component.modelName}.${name}: required prop excluded without a binding`)
      entries.push({ field: name, authority: 'unsupported', detail: 'required exclusion' })
      continue
    }
    entries.push({ field: name, authority: 'excluded', detail: prop ? prop.fact.kind : 'absent' })
  }
  return entries
}

function compatibleBranches(members: PropShape[][], component: ComponentPolicy): PropShape[][] | string {
  const bindings = Object.entries(component.bindings ?? {})
  if (bindings.length === 0) return members
  const kept = members.filter((member) =>
    bindings.every(([name, binding]) => {
      const prop = member.find((item) => item.name === name)
      return Boolean(prop && bindingAssignable(prop.fact, binding.value))
    }),
  )
  if (kept.length === 0) return 'binding is not assignable to a correlated branch'
  const bound = new Set(bindings.map(([name]) => name))
  return kept.map((member) => member.filter((prop) => !bound.has(prop.name)))
}

function bindingAssignable(fact: Fact, value: string | number | boolean): boolean {
  if (fact.kind === 'enum') return fact.values.some((allowed) => allowed === value)
  if (fact.kind === 'string') return typeof value === 'string'
  if (fact.kind === 'number') return typeof value === 'number'
  if (fact.kind === 'boolean') return typeof value === 'boolean'
  return false
}

function bindingEntries(session: Session, type: ts.Type, component: ComponentPolicy, node: ts.Node): CoverageEntry[] {
  const entries: CoverageEntry[] = []
  for (const [name, binding] of Object.entries(component.bindings ?? {})) {
    const prop = readProp(session.checker, type, name, node)
    if (!prop) {
      session.diagnostics.push(`${component.modelName}.${name}: binding target was not found`)
      continue
    }
    if (!bindingAssignable(prop.fact, binding.value)) {
      session.diagnostics.push(`${component.modelName}.${name}: binding is not assignable`)
    }
    entries.push({ field: name, authority: 'adapter', detail: `bound ${JSON.stringify(binding.value)}` })
  }
  return entries
}

function unselectedEntry(session: Session, type: ts.Type, component: ComponentPolicy, node: ts.Node): CoverageEntry {
  const selected = new Set([...Object.keys(component.props), ...(component.exclude ?? []), ...Object.keys(component.bindings ?? {})])
  const unselected = type.getProperties().map((prop) => prop.getName()).filter((name) => !selected.has(name)).sort()
  for (const name of unselected) {
    const prop = readProp(session.checker, type, name, node)
    if (prop && !prop.optional) session.diagnostics.push(`${component.modelName}.${name}: required source prop is not exposed or bound`)
  }
  return {
    field: '*unselected',
    authority: 'excluded',
    detail: `${unselected.length} unselected optional props ${sha256(unselected.join('|')).slice(0, 12)}`,
  }
}

function excludedCoverage(session: Session, type: ts.Type, component: ComponentPolicy, node: ts.Node): CoverageEntry[] {
  return [
    ...exclusionEntries(session, type, component, node),
    ...bindingEntries(session, type, component, node),
    unselectedEntry(session, type, component, node),
  ]
}

function selectedType(session: Session, component: ComponentPolicy, index: number): ts.Type | null {
  const params = alias(session, `Params${index}`)
  const props = alias(session, `Props${index}`)
  const node = valueNode(session, `cmp${index}`) ?? session.sourceFile
  if (component.branch) {
    const branch = alias(session, `Branch${index}`)
    if (!branch || !params) {
      session.diagnostics.push(`${component.modelName}: selected branch did not resolve`)
      return null
    }
    const accepted = session.checker.isTypeAssignableTo(branch, params)
    if (!accepted) session.diagnostics.push(`${component.modelName}: selected branch is not assignable to the source signature`)
    return branch
  }
  const members = params ? correlatedMembers(params) : null
  if (members && !storeCompatibleUnion(session, component, members, node)) return null
  return props
}

function storeCompatibleUnion(session: Session, component: ComponentPolicy, members: ts.Type[], node: ts.Node): boolean {
  const distinct = new Set(members.map((member) => propertyNames(member).join('|')))
  if (distinct.size > 1) {
    session.diagnostics.push(`${component.modelName}: ambiguous prop union requires an explicit branch`)
    return false
  }
  const names = [...Object.keys(component.props), ...Object.keys(component.bindings ?? {})]
  const built = memberShapes(session, members, names, node)
  const compatible = typeof built === 'string' ? built : compatibleBranches(built, component)
  if (typeof compatible === 'string') {
    session.diagnostics.push(`${component.modelName}: ${compatible}`)
    return false
  }
  ;(session as Session & { unions?: Map<string, PropShape[][]> }).unions ??= new Map()
  ;(session as Session & { unions: Map<string, PropShape[][]> }).unions.set(component.modelName, compatible)
  return true
}

function compileComponent(session: Session, component: ComponentPolicy, index: number): ComponentProvenance | null {
  const node = valueNode(session, `cmp${index}`) ?? session.sourceFile
  const type = selectedType(session, component, index)
  if (!type) return null
  const unions = (session as Session & { unions?: Map<string, PropShape[][]> }).unions?.get(component.modelName)
  const id = `https://design-lock.local/schemas/${schemaGroup(component.packageName)}/${component.modelName}`
  const built = unions
    ? unionSchema(component.modelName, id, unions, component, session.tokens)
    : (() => {
        const props = singleShapes(session, type, component, node)
        if (typeof props === 'string') {
          session.diagnostics.push(props)
          return null
        }
        return schemaFromProps(component.modelName, id, props, component, session.tokens)
      })()
  if (!built || built.diagnostic) {
    if (built?.diagnostic) session.diagnostics.push(built.diagnostic)
    return null
  }
  const declaration = declarationOf(session, index)
  const coverage = [...built.coverage, ...excludedCoverage(session, type, component, node)].sort((left, right) =>
    left.field.localeCompare(right.field),
  )
  return {
    modelName: component.modelName,
    packageName: component.packageName,
    packageVersion: packageVersion(session, component.packageName),
    exportName: component.exportName,
    moduleSpecifier: component.module,
    rootBinding: rootBinding(session, index, component.branch?.root),
    declarationPath: declaration.path,
    symbolName: declaration.symbolName,
    declarationHash: declaration.hash,
    coverage,
    schema: built.schema,
    tokenRefs: built.tokenRefs,
  } as ComponentProvenance & { schema: Record<string, unknown>; tokenRefs: Array<{ family: string; key: string }> }
}

function compilerIdentity() {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { name: string; version: string }
  const options = { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx' }
  return {
    name: manifest.name,
    version: manifest.version,
    typescript: ts.version,
    optionsHash: hashJson(options),
  }
}

export async function compilePolicy(policy: ExtractionPolicy, repoRoot: string): Promise<CompileResult> {
  const source = extractSource(policy)
  const { program, sourceFile } = createExtractProgram(repoRoot, source)
  if (!sourceFile) return { ok: false, diagnostics: ['Extraction program did not load'] }
  const syntax = program.getSyntacticDiagnostics(sourceFile).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  const semantic = program.getSemanticDiagnostics(sourceFile).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  if (syntax.length + semantic.length > 0) return { ok: false, diagnostics: [...syntax, ...semantic].sort() }
  const tokens = await readPolicyTokens(policy.tokens, repoRoot)
  const session: Session = {
    checker: program.getTypeChecker(),
    sourceFile,
    repoRoot,
    tokens: new Map(tokens.map((token) => [token.family, token])),
    diagnostics: [],
  }
  const compiled = policy.components.map((component, index) => compileComponent(session, component, index))
  if (session.diagnostics.length > 0 || compiled.some((component) => component === null)) {
    return { ok: false, diagnostics: [...new Set(session.diagnostics)].sort() }
  }
  const components = compiled as Array<ComponentProvenance & { schema: Record<string, unknown>; tokenRefs: Array<{ family: string; key: string }> }>
  const identity = compilerIdentity()
  const refs = components.flatMap((component) => component.tokenRefs)
  const semanticBody = {
    id: policy.id,
    components: components
      .map((component) => ({ modelName: component.modelName, schema: component.schema }))
      .sort((left, right) => left.modelName.localeCompare(right.modelName)),
    tokenKeys: tokens.map((token) => ({
      family: token.family,
      keys: [...new Set(refs.filter((ref) => ref.family === token.family).map((ref) => ref.key))].sort(),
    })),
  }
  const provenance = {
    policyId: policy.id,
    policyHash: hashJson(policy),
    compiler: { name: identity.name, version: identity.version, typescript: identity.typescript, optionsHash: identity.optionsHash },
    components: components
      .map(({ schema: _schema, tokenRefs: _tokenRefs, ...component }) => component)
      .sort((left, right) => left.modelName.localeCompare(right.modelName)),
    tokens: tokens.map((token) => ({ ...token, contentHash: hashJson({ values: token.values, unresolvedAliases: token.unresolvedAliases }) })),
  }
  const artifact: ContractArtifact = {
    artifactVersion: 1,
    semantic: semanticBody,
    provenance,
    semanticHash: hashJson(semanticBody),
    provenanceHash: hashJson(provenance),
  }
  return { ok: true, artifact }
}
