import { describe, expect, it } from 'vitest'
import { evaluateDesignLock } from './engine'
import type { DesignSystemAdapter } from './types'

const widget = {
  $id: 'test/Widget',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'label'],
  properties: {
    component: { const: 'Widget' },
    label: { type: 'string' },
    href: { type: 'string' },
  },
} as const

const adapter: DesignSystemAdapter<string> = {
  id: 'test',
  label: 'Test System',
  registry: { Widget: widget },
  schemas: [widget],
  render: (tree) => JSON.stringify(tree),
  prepareLenient: (tree) => {
    const node = Array.isArray(tree) ? tree[0] : tree
    return { component: 'Widget', label: String(node.label ?? '') }
  },
}

describe('evaluateDesignLock', () => {
  it('validates and renders through an injected adapter', () => {
    const result = evaluateDesignLock({
      rawResponse: '{"component":"Widget","label":"Safe"}',
      mode: 'strict',
      adapter,
    })
    expect(result.validation.valid).toBe(true)
    expect(result.rendered).toContain('Safe')
    expect(result.adapterId).toBe('test')
  })

  it('blocks model-controlled styles and actions even if a schema accepted them', () => {
    const permissiveSchema = {
      ...widget,
      $id: 'test/Permissive',
      additionalProperties: true,
    } as const
    const permissive: DesignSystemAdapter<string> = {
      ...adapter,
      registry: {
        Widget: permissiveSchema,
      },
      schemas: [permissiveSchema],
    }
    const result = evaluateDesignLock({
      rawResponse:
        '{"component":"Widget","label":"Unsafe","className":"fixed","onClick":"steal()"}',
      mode: 'strict',
      adapter: permissive,
    })
    expect(result.validation.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['UNSAFE_STYLE', 'UNBOUND_ACTION']),
    )
    expect(result.rendered).toBeNull()
  })

  it('rejects unsafe URL schemes and supports adapter-owned lenient repair', () => {
    const strict = evaluateDesignLock({
      rawResponse:
        '{"component":"Widget","label":"Docs","href":"javascript:alert(1)","extra":true}',
      mode: 'strict',
      adapter,
    })
    expect(strict.blocked).toBe(true)
    expect(strict.validation.errors.map((issue) => issue.code)).toContain('UNSAFE_URL')

    const lenient = evaluateDesignLock({
      rawResponse:
        '{"component":"Widget","label":"Docs","href":"javascript:alert(1)","extra":true}',
      mode: 'lenient',
      adapter,
    })
    expect(lenient.blocked).toBe(false)
    expect(lenient.rendered).toContain('Docs')
  })

  it('treats report mode as inspection-only for invalid output', () => {
    const result = evaluateDesignLock({
      rawResponse: '{"component":"Widget","label":"Unsafe","className":"fixed"}',
      mode: 'report',
      adapter,
    })
    expect(result.blocked).toBe(true)
    expect(result.rendered).toBeNull()
    expect(result.validation.errors.map((issue) => issue.code)).toContain('UNSAFE_STYLE')
  })

  it('marks failed or empty repair attempts as blocked', () => {
    const unsafe = '{"component":"Widget","label":"Unsafe","extra":true}'
    const emptyRepair = evaluateDesignLock({
      rawResponse: unsafe,
      mode: 'lenient',
      adapter: { ...adapter, prepareLenient: () => null },
    })
    const invalidRepair = evaluateDesignLock({
      rawResponse: unsafe,
      mode: 'lenient',
      adapter: {
        ...adapter,
        prepareLenient: () => ({ component: 'Widget' }),
      },
    })
    expect(emptyRepair.blocked).toBe(true)
    expect(invalidRepair.blocked).toBe(true)
    expect(emptyRepair.rendered).toBeNull()
    expect(invalidRepair.rendered).toBeNull()
  })

  it('blocks URL-key and scheme evasions before rendering', () => {
    const permissiveSchema = {
      ...widget,
      $id: 'test/UrlEvasion',
      additionalProperties: true,
    } as const
    const permissive = {
      ...adapter,
      registry: { Widget: permissiveSchema },
      schemas: [permissiveSchema],
    }
    for (const rawResponse of [
      '{"component":"Widget","label":"Unsafe","redirectURL":"java\\nscript:alert(1)"}',
      '{"component":"Widget","label":"Unsafe","href":"//attacker.example"}',
      '{"component":"Widget","label":"Unsafe","src":"file:///etc/passwd"}',
    ]) {
      const result = evaluateDesignLock({ rawResponse, mode: 'strict', adapter: permissive })
      expect(result.blocked).toBe(true)
      expect(result.validation.errors.map((issue) => issue.code)).toContain('UNSAFE_URL')
    }
  })

  it('bounds response size, roots, nodes, depth, and malformed children', () => {
    const cases = [
      evaluateDesignLock({
        rawResponse: '{"component":"Widget","label":"Too long"}',
        mode: 'strict',
        adapter,
        limits: { maxResponseChars: 10, maxRoots: 4, maxDepth: 4, maxNodes: 4 },
      }),
      evaluateDesignLock({
        rawResponse: JSON.stringify(Array.from({ length: 3 }, () => ({ component: 'Widget', label: 'root' }))),
        mode: 'strict',
        adapter,
        limits: { maxResponseChars: 1_000, maxRoots: 2, maxDepth: 4, maxNodes: 4 },
      }),
      evaluateDesignLock({
        rawResponse: JSON.stringify({ component: 'Widget', label: 'root', children: [{ component: 'Widget', label: 'one' }, { component: 'Widget', label: 'two' }] }),
        mode: 'strict',
        adapter,
        limits: { maxResponseChars: 1_000, maxRoots: 4, maxDepth: 4, maxNodes: 2 },
      }),
      evaluateDesignLock({
        rawResponse: JSON.stringify({ component: 'Widget', label: 'root', children: { component: 'Widget', label: 'one', children: { component: 'Widget', label: 'two' } } }),
        mode: 'strict',
        adapter,
        limits: { maxResponseChars: 1_000, maxRoots: 4, maxDepth: 2, maxNodes: 4 },
      }),
      evaluateDesignLock({
        rawResponse: '{"component":"Widget","label":"root","children":[null]}',
        mode: 'strict',
        adapter,
      }),
    ]
    cases.forEach((result) => {
      expect(result.blocked).toBe(true)
      expect(result.parse.tree).toBeNull()
      expect(result.parse.parseError).toBeTruthy()
    })
  })
})
