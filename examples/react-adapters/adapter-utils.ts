import type { DesignLockNode } from '@design-lock/core'

export type NodePreparer = (node: DesignLockNode) => DesignLockNode | null

export function asRecord(node: DesignLockNode): Record<string, unknown> {
  return node as Record<string, unknown>
}

export function isDesignLockNode(value: unknown): value is DesignLockNode {
  return typeof value === 'object' && value !== null && typeof (value as { component?: unknown }).component === 'string'
}

export function safeAdapterHref(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^(?:\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(value.trim())
}

export function prepareAdapterTree(
  tree: DesignLockNode | DesignLockNode[],
  prepareNode: NodePreparer,
): DesignLockNode | DesignLockNode[] | null {
  if (!Array.isArray(tree)) return prepareNode(tree)
  const nodes = tree.map(prepareNode).filter((node): node is DesignLockNode => node !== null)
  return nodes.length > 0 ? nodes : null
}
