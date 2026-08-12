import type { DesignLockLimits, DesignLockNode, DesignLockParseResult } from './types.js'

export const DEFAULT_DESIGN_LOCK_LIMITS: DesignLockLimits = {
  maxResponseChars: 100_000,
  maxRoots: 32,
  maxDepth: 24,
  maxNodes: 256,
}

function isNode(value: unknown): value is DesignLockNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { component?: unknown }).component === 'string'
  )
}

function isTree(value: unknown): value is DesignLockNode | DesignLockNode[] {
  return Array.isArray(value)
    ? value.length > 0 && value.every(isNode)
    : isNode(value)
}

type PendingNode = { node: DesignLockNode; depth: number }

function enqueueChildren(current: PendingNode, stack: PendingNode[]): string | null {
  const children = current.node.children
  if (children === undefined || typeof children === 'string') return null
  const childNodes = Array.isArray(children) ? children : [children]
  if (!childNodes.every(isNode)) {
    return 'Every component child must be a component object or text'
  }
  stack.push(...childNodes.map((node) => ({ node, depth: current.depth + 1 })))
  return null
}

function treeLimitError(
  nodeCount: number,
  depth: number,
  limits: DesignLockLimits,
): string | null {
  if (nodeCount > limits.maxNodes) {
    return `Component tree exceeds the ${limits.maxNodes}-node limit`
  }
  if (depth > limits.maxDepth) {
    return `Component tree exceeds the ${limits.maxDepth}-level depth limit`
  }
  return null
}

function inspectTree(
  tree: DesignLockNode | DesignLockNode[],
  limits: DesignLockLimits,
): string | null {
  const roots = Array.isArray(tree) ? tree : [tree]
  if (roots.length > limits.maxRoots) {
    return `Component tree exceeds the ${limits.maxRoots}-root limit`
  }
  const stack: PendingNode[] = roots.map((node) => ({ node, depth: 1 }))
  let nodeCount = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    nodeCount += 1
    const limitError = treeLimitError(nodeCount, current.depth, limits)
    if (limitError) return limitError
    const childError = enqueueChildren(current, stack)
    if (childError) return childError
  }
  return null
}

function stripCodeFence(value: string): string {
  const matches = [...value.trim().matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
  return matches.length > 0 ? matches.at(-1)![1].trim() : value.trim()
}

function extractBalancedJson(value: string): string | null {
  const starts = [value.indexOf('{'), value.indexOf('[')].filter(
    (index) => index >= 0,
  )
  if (starts.length === 0) return null
  const start = Math.min(...starts)
  const open = value[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < value.length; index += 1) {
    const char = value[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === open) depth += 1
    else if (char === close && --depth === 0) return value.slice(start, index + 1)
  }
  return null
}

export function parseDesignLockResponse(
  raw: string,
  limits: DesignLockLimits = DEFAULT_DESIGN_LOCK_LIMITS,
): DesignLockParseResult {
  if (raw.length > limits.maxResponseChars) {
    return {
      tree: null,
      parseError: `Response exceeds the ${limits.maxResponseChars}-character limit`,
    }
  }
  if (!raw.trim()) return { tree: null, parseError: 'Empty response' }
  const unfenced = stripCodeFence(raw)
  const candidate = extractBalancedJson(unfenced) ?? unfenced
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { tree: null, parseError: `Invalid JSON: ${message}` }
  }
  if (!isTree(parsed)) {
    return {
      tree: null,
      parseError:
        'JSON must be a component object with a "component" string or an array of component objects',
    }
  }
  const limitError = inspectTree(parsed, limits)
  if (limitError) return { tree: null, parseError: limitError }
  return { tree: parsed }
}
