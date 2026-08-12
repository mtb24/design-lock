import type { DesignLockIssue, DesignLockNode, DesignLockWarning } from './types.js'

export type PolicyResult = {
  errors: DesignLockIssue[]
  warnings: DesignLockWarning[]
}

function isUnsafeUrl(value: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u0020\u007f]+/g, '')
  if (/^(?:\/\/|\\\\)/.test(normalized)) return true
  const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase()
  return scheme !== undefined && !['https', 'http', 'mailto', 'tel'].includes(scheme)
}

function isUrlProperty(key: string): boolean {
  const normalized = key.toLowerCase()
  return normalized === 'href' || normalized === 'src' || normalized.endsWith('href') || normalized.endsWith('url')
}

export function evaluateDefaultSafetyPolicy(
  tree: DesignLockNode | DesignLockNode[],
): PolicyResult {
  const errors: DesignLockIssue[] = []
  const warnings: DesignLockWarning[] = []
  const roots = Array.isArray(tree) ? tree : [tree]

  const visit = (value: unknown, path: string, component: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`, component))
      return
    }
    if (typeof value !== 'object' || value === null) return
    const record = value as Record<string, unknown>
    const owner = typeof record.component === 'string' ? record.component : component
    Object.entries(record).forEach(([key, child]) => {
      const childPath = `${path}.${key}`
      if ((key === 'className' || key === 'style') && child != null) {
        errors.push({
          path: childPath,
          component: owner,
          code: 'UNSAFE_STYLE',
          message: `Model-controlled ${key} bypasses design-system tokens`,
          received: child,
        })
      }
      if (/^on[A-Z]/.test(key) && child != null) {
        errors.push({
          path: childPath,
          component: owner,
          code: 'UNBOUND_ACTION',
          message: 'Model output cannot bind executable event handlers',
          received: child,
        })
      }
      if (isUrlProperty(key) && typeof child === 'string') {
        if (isUnsafeUrl(child)) {
          errors.push({
            path: childPath,
            component: owner,
            code: 'UNSAFE_URL',
            message: `Unsafe URL scheme is not renderable`,
            received: child,
          })
        } else if (/^http:/i.test(child.trim().replace(/[\u0000-\u0020\u007f]+/g, ''))) {
          warnings.push({
            path: childPath,
            component: owner,
            code: 'INSECURE_URL',
            message: 'Prefer HTTPS for external URLs',
          })
        }
      }
      visit(child, childPath, owner)
    })
  }

  roots.forEach((root, index) =>
    visit(root, roots.length === 1 ? 'root' : `root[${index}]`, root.component),
  )
  return { errors, warnings }
}
