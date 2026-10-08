import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalJson, diffContracts, validateDesignLockTree, type ContractArtifact, type DesignSystemContract } from '@design-lock/core'
import { compilePolicy } from './compile.js'
import type { ExtractionPolicy } from './policy.js'
import { parsePolicy } from './policy.js'
import { resolveBaselineText } from './check.js'

const root = process.cwd()

function policy(components: ExtractionPolicy['components'], tokens?: ExtractionPolicy['tokens']): ExtractionPolicy {
  return { id: 'fixture', components, tokens }
}

function contract(artifact: ContractArtifact, modelName: string): DesignSystemContract {
  const schema = artifact.semantic.components.find((component) => component.modelName === modelName)?.schema
  if (!schema) throw new Error(`missing ${modelName}`)
  return { id: 'fixture', label: 'Fixture', registry: { [modelName]: schema as { $id: string } }, schemas: [schema] }
}

async function compile(value: ExtractionPolicy) {
  return compilePolicy(value, root)
}

describe('source extraction', () => {
  it('preserves correlated unions and rejects impossible combinations', async () => {
    const result = await compile(policy([{
      modelName: 'ModeView',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/correlated',
      exportName: 'ModeView',
      importKind: 'named',
      props: { mode: {}, value: {} },
    }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const adapter = contract(result.artifact, 'ModeView')
    expect(validateDesignLockTree({ component: 'ModeView', mode: 'text', value: 'hello' }, adapter).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'ModeView', mode: 'count', value: 7 }, adapter).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'ModeView', mode: 'text', value: 7 }, adapter).valid).toBe(false)
  })

  it('keeps the remaining branch constraints after a fixed binding', async () => {
    const bound = async (mode: 'text' | 'count') => {
      const result = await compile(policy([{
        modelName: 'ModeView',
        packageName: 'fixture',
        module: './packages/compiler/fixtures/correlated',
        exportName: 'ModeView',
        importKind: 'named',
        props: { value: {} },
        bindings: { mode: { value: mode } },
      }]))
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.diagnostics.join('\n'))
      return contract(result.artifact, 'ModeView')
    }
    const text = await bound('text')
    expect(validateDesignLockTree({ component: 'ModeView', value: 'hello' }, text).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'ModeView', value: 7 }, text).valid).toBe(false)
    const count = await bound('count')
    expect(validateDesignLockTree({ component: 'ModeView', value: 7 }, count).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'ModeView', value: 'hello' }, count).valid).toBe(false)
    const impossible = await compile(policy([{
      modelName: 'ModeView',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/correlated',
      exportName: 'ModeView',
      importKind: 'named',
      props: {},
      bindings: { mode: { value: 'text' }, value: { value: 7 } },
    }]))
    expect(impossible.ok).toBe(false)
  })

  it('rejects text widening, relaxed requiredness, alien branches, and invalid bindings', async () => {
    const widened = await compile(policy([{
      modelName: 'ModeView',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/correlated',
      exportName: 'ModeView',
      importKind: 'named',
      props: { mode: { representation: 'text' }, value: {} },
    }]))
    expect(widened.ok).toBe(false)
    const relaxed = await compile(policy([{
      modelName: 'NeedsId',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/required',
      exportName: 'NeedsId',
      importKind: 'named',
      props: { label: { representation: 'text', required: false }, id: { required: false } },
    }]))
    expect(relaxed.ok).toBe(false)
    if (!relaxed.ok) expect(relaxed.diagnostics.join('\n')).toContain('required source prop')
    const alien = await compile(policy([{
      modelName: 'ModeView',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/correlated',
      exportName: 'ModeView',
      importKind: 'named',
      branch: {
        module: './packages/compiler/fixtures/alien-branch',
        exportName: 'AlienBranch',
        importKind: 'named',
        root: 'div',
      },
      props: { mode: {}, value: {} },
    }]))
    expect(alien.ok).toBe(false)
    if (!alien.ok) expect(alien.diagnostics.join('\n')).toContain('not assignable')
    const bogus = await compile(policy([{
      modelName: 'ModeView',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/correlated',
      exportName: 'ModeView',
      importKind: 'named',
      props: { value: {} },
      bindings: { mode: { value: 'BOGUS' } },
    }]))
    expect(bogus.ok).toBe(false)
    if (!bogus.ok) expect(bogus.diagnostics.join('\n')).toContain('binding is not assignable')
  })

  it('fails unsupported requested types instead of widening them', async () => {
    const names = ['AnyProp', 'UnknownProp', 'OpenBag', 'UnresolvedGeneric', 'UnresolvedConditional'] as const
    const props = {
      AnyProp: { label: {} },
      UnknownProp: { label: {} },
      OpenBag: { meta: {} },
      UnresolvedGeneric: { value: {} },
      UnresolvedConditional: { value: {} },
    }
    const result = await compile(policy(names.map((name) => ({
      modelName: name,
      packageName: 'fixture',
      module: './packages/compiler/fixtures/unsupported',
      exportName: name,
      importKind: 'named' as const,
      props: props[name],
    }))))
    expect(result.ok).toBe(false)
    if (result.ok) return
    const text = result.diagnostics.join('\n')
    expect(text).toContain('any')
    expect(text).toContain('unknown')
    expect(text).toContain('open index signature')
    expect(text).toContain('unresolved generic')
    expect(text).toContain('unresolved conditional')
  })

  it('refuses text narrowing of any, unknown, and unresolved generics', async () => {
    const requested = [
      ['AnyProp', 'label', 'any'],
      ['UnknownProp', 'label', 'unknown'],
      ['UnresolvedGeneric', 'value', 'unresolved generic'],
      ['OpenBag', 'meta', 'open index signature'],
    ] as const
    for (const [name, field, reason] of requested) {
      const result = await compile(policy([{
        modelName: name,
        packageName: 'fixture',
        module: './packages/compiler/fixtures/unsupported',
        exportName: name,
        importKind: 'named',
        props: { [field]: { representation: 'text' } },
      }]))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.diagnostics.join('\n')).toContain(reason)
    }
    const allowed = await compile(policy([{
      modelName: 'TextChild',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/text-child',
      exportName: 'TextChild',
      importKind: 'named',
      props: { label: { representation: 'text', required: true, minLength: 1, maxLength: 40 } },
    }]))
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return
    expect(validateDesignLockTree({ component: 'TextChild', label: 'Ready' }, contract(allowed.artifact, 'TextChild')).valid).toBe(true)
  })

  it('documents optional exclusions and blocks required omissions until bound', async () => {
    const base = {
      modelName: 'NeedsId',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/required',
      exportName: 'NeedsId',
      importKind: 'named' as const,
      props: { label: { representation: 'text' as const } },
      exclude: ['onClick', 'id'],
    }
    const blocked = await compile(policy([base]))
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.diagnostics.join('\n')).toContain('required prop excluded')
    const bound = await compile(policy([{ ...base, bindings: { id: { value: 'fixed-id' } } }]))
    expect(bound.ok).toBe(true)
    if (!bound.ok) return
    const coverage = bound.artifact.provenance.components[0].coverage
    expect(coverage.find((entry) => entry.field === 'onClick')?.authority).toBe('excluded')
    expect(coverage.find((entry) => entry.field === 'id')?.authority).toBe('adapter')
  })

  it('follows re-exports and rejects a same-name component from another module', async () => {
    const renamed = await compile(policy([{
      modelName: 'Widget',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/widgets/reexport',
      exportName: 'Renamed',
      importKind: 'named',
      props: { label: {}, disabled: {}, href: {}, tone: {} },
    }]))
    const other = await compile(policy([{
      modelName: 'Widget',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/widgets/other',
      exportName: 'Widget',
      importKind: 'named',
      props: { href: {}, tone: {} },
    }]))
    expect(renamed.ok && other.ok).toBe(true)
    if (!renamed.ok || !other.ok) return
    expect(renamed.artifact.provenance.components[0].declarationPath).toContain('widgets/origin.ts')
    expect(renamed.artifact.provenance.components[0].symbolName).toBe('Widget')
    expect(renamed.artifact.provenance.components[0].exportName).toBe('Renamed')
    const accepted = { component: 'Widget', href: '/docs', tone: 'calm', label: 'Hi', disabled: true }
    expect(validateDesignLockTree(accepted, contract(renamed.artifact, 'Widget')).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'Widget', href: '/docs', tone: 'calm' }, contract(other.artifact, 'Widget')).valid).toBe(false)
  })

  it('keeps canonical output stable and free of machine paths', async () => {
    const value = parsePolicy(JSON.parse(readFileSync('contracts/policy/mui.json', 'utf8')))
    const first = await compile(value)
    const second = await compile(value)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(canonicalJson(first.artifact)).toBe(canonicalJson(second.artifact))
    expect(JSON.stringify(first.artifact)).not.toContain(root)
    expect(first.artifact.provenance.components[0].declarationPath.startsWith('@mui/')).toBe(true)
  })

  it('reports a source enum addition as expansion and does not treat generation as activation', async () => {
    const component = (moduleName: string) => ({
      modelName: 'Status',
      packageName: 'fixture',
      module: moduleName,
      exportName: 'Status',
      importKind: 'named' as const,
      props: { tone: {} },
    })
    const before = await compile(policy([component('./packages/compiler/fixtures/source-v1')]))
    const after = await compile(policy([component('./packages/compiler/fixtures/source-v2')]))
    expect(before.ok && after.ok).toBe(true)
    if (!before.ok || !after.ok) return
    const diff = diffContracts(before.artifact, after.artifact)
    expect(diff.classification).toBe('expanded')
    expect(diff.requiresReview).toBe(true)
    expect(after.artifact.semanticHash).not.toBe(before.artifact.semanticHash)
  })

  it('reads fixture tokens, blocks unresolved aliases, and reports value changes', async () => {
    const component = {
      modelName: 'Status',
      packageName: 'fixture',
      module: './packages/compiler/fixtures/source-v1',
      exportName: 'Status',
      importKind: 'named' as const,
      props: { tone: { tokenFamily: 'fixture.tokens', select: ['info'] } },
    }
    const missing = await compile(policy([component], [{ family: 'fixture.tokens', reader: 'fixture-file', source: 'packages/compiler/fixtures/tokens.json' }]))
    expect(missing.ok).toBe(false)
    const known = await compile(policy([{
      ...component,
      props: { tone: { select: ['info'] } },
    }], [{ family: 'fixture.tokens', reader: 'fixture-file', source: 'packages/compiler/fixtures/tokens.json' }]))
    const changed = await compile(policy([{
      ...component,
      props: { tone: { select: ['info'] } },
    }], [{ family: 'fixture.tokens', reader: 'fixture-file', source: 'packages/compiler/fixtures/tokens-changed.json' }]))
    expect(known.ok && changed.ok).toBe(true)
    if (!known.ok || !changed.ok) return
    expect(known.artifact.provenance.tokens[0].unresolvedAliases).toContain('alias')
    expect(diffContracts(known.artifact, changed.artifact).classification).toBe('token-value')
  })
})

describe('installed libraries', () => {
  it('extracts MUI Button and Chip from declarations and palette tokens', async () => {
    const result = await compile(parsePolicy(JSON.parse(readFileSync('contracts/policy/mui.json', 'utf8'))))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const button = contract(result.artifact, 'Button')
    const chip = contract(result.artifact, 'Chip')
    expect(validateDesignLockTree({ component: 'Button', children: 'Save', variant: 'contained', color: 'primary', disabled: true }, button).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'Button', children: 'Save', color: 'inherit' }, button).valid).toBe(false)
    expect(validateDesignLockTree({ component: 'Button', children: 'Save', color: 'neon' }, button).errors.map((issue) => issue.code)).toContain('INVALID_TOKEN')
    expect(validateDesignLockTree({ component: 'Chip', label: 'Ready', variant: 'outlined' }, chip).valid).toBe(true)
    expect(result.artifact.provenance.tokens[0].values.primary).toMatch(/^#/)
    expect(result.artifact.provenance.components.map((component) => component.rootBinding).sort()).toEqual(['button', 'div'])
    const widened = parsePolicy(JSON.parse(readFileSync('contracts/policy/mui.json', 'utf8')))
    widened.components[1].props.children = { representation: 'text' }
    const rejected = await compile(widened)
    expect(rejected.ok).toBe(false)
  })

  it('extracts Carbon Button and Tag without copying the MUI API', async () => {
    const result = await compile(parsePolicy(JSON.parse(readFileSync('contracts/policy/carbon.json', 'utf8'))))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const button = result.artifact.semantic.components.find((component) => component.modelName === 'Button')?.schema as {
      properties: Record<string, { enum?: string[] }>
    }
    const tag = contract(result.artifact, 'Tag')
    expect(button.properties.kind.enum).toContain('danger--ghost')
    expect(button.properties.variant).toBeUndefined()
    expect(validateDesignLockTree({ component: 'Tag', children: 'Beta', type: 'blue', size: 'md' }, tag).valid).toBe(true)
    expect(validateDesignLockTree({ component: 'Tag', children: 'Beta', type: 'outline' }, tag).valid).toBe(false)
    expect(result.artifact.provenance.tokens[0].values.tagBackgroundBlue).toBe('#d0e2ff')
    const ambiguous = parsePolicy(JSON.parse(readFileSync('contracts/policy/carbon.json', 'utf8')))
    delete ambiguous.components[1].branch
    const rejected = await compile(ambiguous)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.diagnostics.join('\n')).toContain('ambiguous prop union')
  })
})

describe('demo fixtures', () => {
  it('matches the committed source-change and unsupported fixtures', async () => {
    const component = (moduleName: string): ExtractionPolicy => ({
      id: 'fixture.source',
      components: [{
        modelName: 'Status',
        packageName: 'fixture',
        module: moduleName,
        exportName: 'Status',
        importKind: 'named',
        props: { tone: {} },
      }],
    })
    const before = await compile(component('./packages/compiler/fixtures/source-v1'))
    const after = await compile(component('./packages/compiler/fixtures/source-v2'))
    expect(before.ok && after.ok).toBe(true)
    if (!before.ok || !after.ok) return
    const storedBefore = JSON.parse(readFileSync('contracts/fixtures/source-v1.json', 'utf8'))
    const storedAfter = JSON.parse(readFileSync('contracts/fixtures/source-v2.json', 'utf8'))
    expect(canonicalJson(before.artifact)).toBe(canonicalJson(storedBefore))
    expect(canonicalJson(after.artifact)).toBe(canonicalJson(storedAfter))
    expect(diffContracts(storedBefore, storedAfter).changes.some((change) => change.detail.includes('warning'))).toBe(true)
    const names = ['AnyProp', 'UnknownProp', 'OpenBag', 'UnresolvedGeneric', 'UnresolvedConditional'] as const
    const props = {
      AnyProp: { label: {} },
      UnknownProp: { label: {} },
      OpenBag: { meta: {} },
      UnresolvedGeneric: { value: {} },
      UnresolvedConditional: { value: {} },
    }
    const unsupported = await compile({
      id: 'fixture.unsupported',
      components: names.map((name) => ({
        modelName: name,
        packageName: 'fixture',
        module: './packages/compiler/fixtures/unsupported',
        exportName: name,
        importKind: 'named' as const,
        props: props[name],
      })),
    })
    expect(unsupported.ok).toBe(false)
    if (unsupported.ok) return
    const stored = JSON.parse(readFileSync('contracts/fixtures/unsupported.json', 'utf8')) as { ok: boolean; diagnostics: string[] }
    expect(stored.ok).toBe(false)
    expect(stored.diagnostics).toEqual(unsupported.diagnostics)
  })
})

describe('baseline selection', () => {
  it('ignores an environment override and prefers the base revision text', () => {
    expect(resolveBaselineText({ workspaceText: 'workspace', baseText: 'base', envBaseline: 'env' })).toEqual({
      text: 'base',
      source: 'base-revision',
    })
    expect(resolveBaselineText({ workspaceText: 'workspace', baseText: null, envBaseline: 'env' })).toEqual({
      text: 'workspace',
      source: 'workspace-provisional',
    })
    expect(resolveBaselineText({ workspaceText: 'workspace', baseText: null, baseRequested: true }).source).toBe('missing-trusted-base')
  })
})
