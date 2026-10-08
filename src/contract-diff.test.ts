import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assessActivation, reviewIdentity } from './activation'
import { diffContracts } from './contract-diff'
import type { ContractArtifact } from './contract-types'

function artifact(input: {
  semanticHash: string
  provenanceHash?: string
  schema: Record<string, unknown>
  tokens?: ContractArtifact['provenance']['tokens']
  approved?: boolean
}): ContractArtifact {
  const provenance: ContractArtifact['provenance'] = {
    policyId: 'policy',
    policyHash: 'policy-hash',
    compiler: { name: '@design-lock/compiler', version: '0.1.0', typescript: '5.9.3', optionsHash: 'opts' },
    components: [],
    tokens: input.tokens ?? [],
  }
  if (input.approved) (provenance as ContractArtifact['provenance'] & { approved?: boolean }).approved = true
  return {
    artifactVersion: 1,
    semantic: { id: 'fixture', components: [{ modelName: 'Widget', schema: input.schema }], tokenKeys: [] },
    provenance,
    semanticHash: input.semanticHash,
    provenanceHash: input.provenanceHash ?? 'prov',
  }
}

const baseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['component', 'label'],
  properties: {
    component: { const: 'Widget' },
    label: { type: 'string', maxLength: 20 },
    tone: { type: 'string', enum: ['info'] },
  },
}

describe('contract diff and activation', () => {
  const baseline = artifact({ semanticHash: 'old', schema: baseSchema })

  it('reports permission expansion and does not activate it', () => {
    const candidate = artifact({
      semanticHash: 'new',
      schema: {
        ...baseSchema,
        required: ['component'],
        properties: {
          ...baseSchema.properties,
          tone: { type: 'string', enum: ['info', 'danger'] },
          extra: { type: 'boolean' },
          label: { type: 'string', maxLength: 80 },
        },
      },
    })
    const diff = diffContracts(baseline, candidate)
    expect(diff.classification).toBe('expanded')
    expect(diff.requiresReview).toBe(true)
    expect(diff.changes.map((change) => change.detail).join(' ')).toContain('danger')
    const decision = assessActivation({
      baseline,
      candidate,
      approval: null,
      verifierSourceHash: 'verifier',
      trustStatus: 'reviewed',
    })
    expect(decision.activated).toBe(false)
  })

  it('separates restriction, provenance-only changes, and unclassifiable branch edits', () => {
    const restricted = artifact({
      semanticHash: 'restricted',
      schema: {
        ...baseSchema,
        required: ['component', 'label', 'tone'],
        properties: { ...baseSchema.properties, label: { type: 'string', maxLength: 8 } },
      },
    })
    expect(diffContracts(baseline, restricted).classification).toBe('restricted')
    const provenance = artifact({ semanticHash: 'old', provenanceHash: 'other', schema: baseSchema })
    expect(diffContracts(baseline, provenance).classification).toBe('provenance-only')
    const branches = artifact({
      semanticHash: 'branches',
      schema: { oneOf: [{ type: 'object' }, { type: 'object' }] },
    })
    expect(diffContracts(baseline, branches).classification).toBe('unclassifiable')
    const typeChanged = artifact({
      semanticHash: 'type',
      schema: { ...baseSchema, properties: { ...baseSchema.properties, disabled: { type: 'string' } } },
    })
    const typeBase = artifact({
      semanticHash: 'type-base',
      schema: { ...baseSchema, properties: { ...baseSchema.properties, disabled: { type: 'boolean' } } },
    })
    expect(diffContracts(typeBase, typeChanged).classification).toBe('unclassifiable')
    const opened = artifact({
      semanticHash: 'open',
      schema: { ...baseSchema, additionalProperties: true },
    })
    expect(diffContracts(baseline, opened).changes.some((change) => change.kind === 'expanded')).toBe(true)
    const unrestricted = artifact({
      semanticHash: 'free',
      schema: {
        ...baseSchema,
        properties: { ...baseSchema.properties, tone: { type: 'string' } },
      },
    })
    const enumDiff = diffContracts(baseline, unrestricted)
    expect(enumDiff.changes.some((change) => change.detail === 'removed enum restriction')).toBe(true)
    expect(enumDiff.classification).toBe('expanded')
  })

  it('reports token value changes separately from schema permission', () => {
    const before = artifact({
      semanticHash: 'same',
      schema: baseSchema,
      tokens: [
        {
          family: 'palette',
          packageName: '@mui/material',
          packageVersion: '9.3.1',
          theme: 'default',
          sourcePath: '@mui/material/styles',
          values: { primary: '#1976d2' },
          unresolvedAliases: [],
          contentHash: 'a',
        },
      ],
    })
    const after = artifact({
      semanticHash: 'same',
      provenanceHash: 'token',
      schema: baseSchema,
      tokens: [{ ...before.provenance.tokens[0], values: { primary: '#000000' }, contentHash: 'b' }],
    })
    const diff = diffContracts(before, after)
    expect(diff.classification).toBe('token-value')
    expect(diff.changes.some((change) => change.kind === 'expanded')).toBe(false)
  })

  it('rejects bootstrap, stale, mismatched, and self approvals', () => {
    const candidate = artifact({
      semanticHash: 'new',
      schema: { ...baseSchema, properties: { ...baseSchema.properties, tone: { enum: ['info', 'success'] } } },
    })
    const approval = {
      oldReviewIdentity: reviewIdentity(baseline),
      newReviewIdentity: reviewIdentity(candidate),
      verifierSourceHash: 'verifier',
      reviewer: 'independent-reviewer',
      evidence: 'review-record',
    }
    expect(
      assessActivation({ baseline, candidate, approval, verifierSourceHash: 'verifier', trustStatus: 'bootstrap-review-pending' }).activated,
    ).toBe(false)
    expect(
      assessActivation({
        baseline,
        candidate,
        approval: { ...approval, newReviewIdentity: 'stale' },
        verifierSourceHash: 'verifier',
        trustStatus: 'reviewed',
      }).reason,
    ).toContain('Stale approval')
    expect(
      assessActivation({
        baseline,
        candidate,
        approval: { ...approval, verifierSourceHash: 'other-verifier' },
        verifierSourceHash: 'verifier',
        trustStatus: 'reviewed',
      }).activated,
    ).toBe(false)
    expect(
      assessActivation({
        baseline,
        candidate,
        approval: { ...approval, reviewer: 'compiler' },
        verifierSourceHash: 'verifier',
        trustStatus: 'reviewed',
      }).activated,
    ).toBe(false)
    const flagged = artifact({ semanticHash: 'new', schema: candidate.semantic.components[0].schema, approved: true })
    expect(
      assessActivation({ baseline, candidate: flagged, approval, verifierSourceHash: 'verifier', trustStatus: 'reviewed' }).activated,
    ).toBe(false)
    expect(
      assessActivation({ baseline, candidate, approval, verifierSourceHash: 'verifier', trustStatus: 'reviewed' }).activated,
    ).toBe(true)
    const recolored = artifact({
      semanticHash: 'same',
      schema: baseSchema,
      tokens: [
        {
          family: 'palette',
          packageName: '@mui/material',
          packageVersion: '9.3.1',
          theme: 'default',
          sourcePath: '@mui/material/styles',
          values: { primary: '#aabbcc' },
          unresolvedAliases: [],
          contentHash: 'changed',
        },
      ],
    })
    const painted = artifact({
      semanticHash: 'same',
      schema: baseSchema,
      tokens: [{ ...recolored.provenance.tokens[0], values: { primary: '#112233' }, contentHash: 'old' }],
    })
    const tokenApproval = {
      ...approval,
      oldReviewIdentity: reviewIdentity(painted),
      newReviewIdentity: reviewIdentity(painted),
    }
    expect(
      assessActivation({
        baseline: painted,
        candidate: recolored,
        approval: tokenApproval,
        verifierSourceHash: 'verifier',
        trustStatus: 'reviewed',
      }).activated,
    ).toBe(false)
  })
})

describe('core runtime boundary', () => {
  it('does not import the compiler, filesystem, or component libraries', () => {
    const sources = readdirSync(new URL('.', import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
      .map((entry) => readFileSync(new URL(entry.name, import.meta.url), 'utf8'))
    const combined = sources.join('\n')
    for (const banned of ['typescript', 'node:fs', 'node:crypto', '@mui/', '@carbon/', 'react']) {
      expect(combined.includes(`from '${banned}`)).toBe(false)
      expect(combined.includes(`from "${banned}`)).toBe(false)
    }
  })
})
