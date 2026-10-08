import { DEFAULT_DESIGN_LOCK_LIMITS, designLockTreeLimitError, parseDesignLockResponse } from './parse.js'
import { evaluateDefaultSafetyPolicy } from './policies.js'
import type {
  DesignLockEvaluation,
  DesignLockLimits,
  DesignLockMode,
  DesignLockNode,
  DesignLockRepair,
  DesignLockValidation,
  DesignSystemAdapter,
} from './types.js'
import { validateDesignLockTree } from './validate.js'

function combine(
  schema: DesignLockValidation,
  policy: ReturnType<typeof evaluateDefaultSafetyPolicy>,
): DesignLockValidation {
  return {
    valid: schema.errors.length + policy.errors.length === 0,
    errors: [...schema.errors, ...policy.errors],
    warnings: [...schema.warnings, ...policy.warnings],
  }
}

function blocked<TRendered>(
  adapterId: string,
  parse: DesignLockEvaluation<TRendered>['parse'],
  validation: DesignLockValidation,
  renderNote?: string,
  repair?: DesignLockRepair,
): DesignLockEvaluation<TRendered> {
  return {
    adapterId,
    parse,
    validation,
    rendered: null,
    renderedTree: null,
    blocked: true,
    renderNote,
    repair,
  }
}

function recheckRepair<TRendered>(
  prepared: DesignLockNode | DesignLockNode[],
  adapter: DesignSystemAdapter<TRendered>,
  limits: DesignLockLimits,
): DesignLockRepair {
  const limitError = designLockTreeLimitError(prepared, limits)
  if (limitError) {
    return {
      accepted: false,
      limitError,
      validation: { valid: false, errors: [], warnings: [] },
    }
  }
  const validation = combine(
    validateDesignLockTree(prepared, adapter),
    evaluateDefaultSafetyPolicy(prepared),
  )
  return { accepted: validation.valid, validation }
}

function finishLenient<TRendered>(
  params: {
    adapter: DesignSystemAdapter<TRendered>
    parse: DesignLockEvaluation<TRendered>['parse']
    validation: DesignLockValidation
    limits: DesignLockLimits
  },
): DesignLockEvaluation<TRendered> {
  const { adapter, parse, validation, limits } = params
  const tree = parse.tree
  if (!tree || !adapter.prepareLenient) {
    return blocked(adapter.id, parse, validation)
  }
  const prepared = adapter.prepareLenient(tree)
  if (!prepared) {
    return blocked(
      adapter.id,
      parse,
      validation,
      'No policy-safe component subtree remained after repair.',
      { accepted: false, validation: { valid: false, errors: [], warnings: [] } },
    )
  }
  const repair = recheckRepair(prepared, adapter, limits)
  if (!repair.accepted) {
    const reason = repair.limitError ?? 'The repaired tree still failed its contract and was not rendered.'
    return blocked(adapter.id, parse, validation, reason, repair)
  }
  return {
    adapterId: adapter.id,
    parse,
    validation,
    rendered: adapter.render(prepared),
    renderedTree: prepared,
    blocked: false,
    repair,
    renderNote: `${validation.errors.length} issue(s) were removed or repaired before render.`,
  }
}

export function evaluateDesignLock<TRendered>(params: {
  rawResponse: string
  mode: DesignLockMode
  adapter: DesignSystemAdapter<TRendered>
  limits?: DesignLockLimits
}): DesignLockEvaluation<TRendered> {
  const { rawResponse, mode, adapter } = params
  const limits = params.limits ?? DEFAULT_DESIGN_LOCK_LIMITS
  const parse = parseDesignLockResponse(rawResponse, limits)
  if (!parse.tree) return blocked(adapter.id, parse, { valid: false, errors: [], warnings: [] })
  const validation = combine(
    validateDesignLockTree(parse.tree, adapter),
    evaluateDefaultSafetyPolicy(parse.tree),
  )
  if (validation.valid) {
    return {
      adapterId: adapter.id,
      parse,
      validation,
      rendered: adapter.render(parse.tree),
      renderedTree: parse.tree,
      blocked: false,
    }
  }
  if (mode !== 'lenient') return blocked(adapter.id, parse, validation)
  return finishLenient({ adapter, parse, validation, limits })
}
