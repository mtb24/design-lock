import { parseDesignLockResponse } from './parse.js'
import { evaluateDefaultSafetyPolicy } from './policies.js'
import type {
  DesignLockEvaluation,
  DesignLockLimits,
  DesignLockMode,
  DesignSystemAdapter,
} from './types.js'
import { validateDesignLockTree } from './validate.js'

export function evaluateDesignLock<TRendered>(params: {
  rawResponse: string
  mode: DesignLockMode
  adapter: DesignSystemAdapter<TRendered>
  limits?: DesignLockLimits
}): DesignLockEvaluation<TRendered> {
  const { rawResponse, mode, adapter, limits } = params
  const parse = parseDesignLockResponse(rawResponse, limits)
  if (!parse.tree) {
    return {
      adapterId: adapter.id,
      parse,
      validation: { valid: false, errors: [], warnings: [] },
      rendered: null,
      renderedTree: null,
      blocked: true,
    }
  }

  const schema = validateDesignLockTree(parse.tree, adapter)
  const policy = evaluateDefaultSafetyPolicy(parse.tree)
  const validation = {
    valid: schema.errors.length + policy.errors.length === 0,
    errors: [...schema.errors, ...policy.errors],
    warnings: [...schema.warnings, ...policy.warnings],
  }
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
  if (mode !== 'lenient' || !adapter.prepareLenient) {
    return {
      adapterId: adapter.id,
      parse,
      validation,
      rendered: null,
      renderedTree: null,
      blocked: true,
    }
  }
  const prepared = adapter.prepareLenient(parse.tree)
  if (!prepared) {
    return {
      adapterId: adapter.id,
      parse,
      validation,
      rendered: null,
      renderedTree: null,
      blocked: true,
      renderNote: 'No policy-safe component subtree remained after repair.',
    }
  }
  const preparedValidation = validateDesignLockTree(prepared, adapter)
  const preparedPolicy = evaluateDefaultSafetyPolicy(prepared)
  if (preparedValidation.errors.length + preparedPolicy.errors.length > 0) {
    return {
      adapterId: adapter.id,
      parse,
      validation,
      rendered: null,
      renderedTree: null,
      blocked: true,
      renderNote: 'The repaired tree still failed its contract and was not rendered.',
    }
  }
  return {
    adapterId: adapter.id,
    parse,
    validation,
    rendered: adapter.render(prepared),
    renderedTree: prepared,
    blocked: false,
    renderNote: `${validation.errors.length} issue(s) were removed or repaired before render.`,
  }
}
