import Ajv, { type ErrorObject } from 'ajv'
import type {
  DesignLockIssue,
  DesignLockNode,
  DesignLockValidation,
  DesignSystemContract,
} from './types.js'

const validatorCache = new WeakMap<object, Ajv>()

function validatorFor(contract: DesignSystemContract): Ajv {
  const key = contract.schemas as object
  const cached = validatorCache.get(key)
  if (cached) return cached
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false })
  contract.schemas.forEach((schema) => ajv.addSchema(schema))
  validatorCache.set(key, ajv)
  return ajv
}

function pointerPath(instancePath: string, base: string): string {
  return instancePath
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .reduce(
      (path, segment) =>
        /^\d+$/.test(segment) ? `${path}[${segment}]` : `${path}.${segment}`,
      base,
    )
}

function issueFromAjv(
  error: ErrorObject,
  base: string,
  component: string,
): DesignLockIssue {
  const params = error.params as Record<string, unknown>
  const path = pointerPath(String(error.instancePath ?? ''), base)
  if (error.keyword === 'required') {
    const missing = String(params.missingProperty ?? 'property')
    return {
      path: `${path}.${missing}`,
      component,
      code: 'MISSING_REQUIRED',
      message: `Missing required property "${missing}"`,
      expected: missing,
    }
  }
  if (error.keyword === 'additionalProperties') {
    const additional = String(params.additionalProperty ?? 'property')
    return {
      path: `${path}.${additional}`,
      component,
      code: 'ADDITIONAL_PROP',
      message: `Additional property "${additional}" is not allowed`,
      received: additional,
    }
  }
  return {
    path,
    component,
    code: 'INVALID_PROP',
    message: error.message ?? 'Invalid property value',
    expected: params.allowedValues ?? params.enum ?? error.schema,
  }
}

function validateNode(
  node: DesignLockNode,
  base: string,
  contract: DesignSystemContract,
  errors: DesignLockIssue[],
): void {
  const schema = contract.registry[node.component]
  if (!schema) {
    errors.push({
      path: `${base}.component`,
      component: node.component,
      code: 'UNKNOWN_COMPONENT',
      message: `Unknown component "${node.component}" for ${contract.label}`,
      received: node.component,
      expected: Object.keys(contract.registry),
    })
    return
  }
  const validate = validatorFor(contract).getSchema(schema.$id)
  if (!validate) {
    errors.push({
      path: base,
      component: node.component,
      code: 'INVALID_PROP',
      message: `No compiled validator for schema ${schema.$id}`,
    })
    return
  }
  if (!validate(node)) {
    validate.errors?.forEach((error) =>
      errors.push(issueFromAjv(error, base, node.component)),
    )
  }
  const children = node.children
  if (children && typeof children !== 'string') {
    const list = Array.isArray(children) ? children : [children]
    list.forEach((child, index) =>
      validateNode(child, `${base}.children[${index}]`, contract, errors),
    )
  }
}

export function validateDesignLockTree(
  tree: DesignLockNode | DesignLockNode[],
  contract: DesignSystemContract,
): DesignLockValidation {
  const errors: DesignLockIssue[] = []
  const roots = Array.isArray(tree) ? tree : [tree]
  roots.forEach((node, index) =>
    validateNode(node, roots.length === 1 ? 'root' : `root[${index}]`, contract, errors),
  )
  const uniqueErrors = [
    ...new Map(
      errors.map((error) => [
        `${error.path}:${error.component}:${error.code}:${error.message}`,
        error,
      ]),
    ).values(),
  ]
  return { valid: uniqueErrors.length === 0, errors: uniqueErrors, warnings: [] }
}
