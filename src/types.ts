export type DesignLockNode = {
  component: string
  children?: string | DesignLockNode | DesignLockNode[]
  [key: string]: unknown
}

export type SchemaRegistry = Record<
  string,
  { $id: string } & Record<string, unknown>
>

export type DesignLockIssueCode =
  | 'UNKNOWN_COMPONENT'
  | 'MISSING_REQUIRED'
  | 'INVALID_PROP'
  | 'INVALID_TOKEN'
  | 'ADDITIONAL_PROP'
  | 'UNSAFE_STYLE'
  | 'UNBOUND_ACTION'
  | 'UNSAFE_URL'

export type DesignLockIssue = {
  path: string
  component: string
  code: DesignLockIssueCode
  message: string
  received?: unknown
  expected?: unknown
}

export type DesignLockWarning = {
  path: string
  component: string
  code: 'DEPRECATED_PROP' | 'UNUSED_PROP' | 'INSECURE_URL'
  message: string
}

export type DesignLockValidation = {
  valid: boolean
  errors: DesignLockIssue[]
  warnings: DesignLockWarning[]
}

export type DesignSystemContract = {
  id: string
  label: string
  registry: SchemaRegistry
  schemas: readonly Record<string, unknown>[]
}

export type DesignSystemAdapter<TRendered = unknown> = DesignSystemContract & {
  render: (tree: DesignLockNode | DesignLockNode[]) => TRendered
  prepareLenient?: (
    tree: DesignLockNode | DesignLockNode[],
  ) => DesignLockNode | DesignLockNode[] | null
}

export type DesignLockMode = 'strict' | 'lenient' | 'report'

export type DesignLockLimits = {
  maxResponseChars: number
  maxRoots: number
  maxDepth: number
  maxNodes: number
}

export type DesignLockParseResult = {
  tree: DesignLockNode | DesignLockNode[] | null
  parseError?: string
}

export type DesignLockEvaluation<TRendered = unknown> = {
  adapterId: string
  parse: DesignLockParseResult
  validation: DesignLockValidation
  rendered: TRendered | null
  renderedTree: DesignLockNode | DesignLockNode[] | null
  blocked: boolean
  renderNote?: string
}
