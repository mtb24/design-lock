import type { DesignLockNode } from '@design-lock/core'

export type NodePreparer = (node: DesignLockNode) => DesignLockNode | null

export function schemaEnum(schema: object, prop: string): readonly string[] {
  const properties = (schema as { properties?: Record<string, { enum?: readonly string[] }> }).properties
  return properties?.[prop]?.enum ?? []
}

function enumValue(value: unknown, allowed: readonly string[]): string | undefined {
  return typeof value === 'string' && allowed.includes(value) ? value : undefined
}

export function schemaPicks(
  props: Record<string, unknown>,
  schema: object,
  keys: readonly string[],
): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const key of keys) {
    const value = enumValue(props[key], schemaEnum(schema, key))
    if (value) picked[key] = value
  }
  return picked
}

export function optionalFlag(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

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
